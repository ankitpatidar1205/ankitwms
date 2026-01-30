import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Space, Tooltip, Progress } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, InboxOutlined, SyncOutlined, CheckCircleOutlined, RocketOutlined, ReloadOutlined, UserOutlined, ShoppingCartOutlined, EnvironmentOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;

export default function Packing() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [packingTasks, setPackingTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('NOT_STARTED');
    const [searchText, setSearchText] = useState('');

    const [form] = Form.useForm();
    const [assignForm] = Form.useForm();
    const [packers, setPackers] = useState([]);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchPacking = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/packing', { method: 'GET' }, token);
            setPackingTasks(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load packing tasks');
            setPackingTasks([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPacking();
    }, [fetchPacking]);

    const fetchPackers = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/users?role=packer', { method: 'GET' }, token);
            setPackers(Array.isArray(data?.data) ? data.data : []);
        } catch (_) {
            setPackers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchPackers();
    }, [fetchPackers]);

    const filteredTasks = packingTasks.filter(task => {
        const matchesSearch = !searchText ||
            (task.SalesOrder?.orderNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (task.SalesOrder?.Customer?.name || '').toLowerCase().includes(searchText.toLowerCase());

        if (!matchesSearch) return false;

        const s = (task.status || 'NOT_STARTED').toUpperCase();
        if (activeTab === 'NOT_STARTED') {
            const { user } = useAuthStore.getState();
            if (user?.role === 'packer') {
                // For packers, Pending tab shows tasks assigned to them (status: ASSIGNED)
                return ['ASSIGNED'].includes(s);
            }
            return ['NOT_STARTED', 'PENDING'].includes(s);
        }
        if (activeTab === 'ASSIGNED') return s === 'ASSIGNED';
        if (activeTab === 'PACKING') return ['PACKING', 'IN_PROGRESS'].includes(s);

        return s === activeTab;
    });

    const handleAssign = async (values) => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/assign`, {
                method: 'POST',
                body: JSON.stringify({ userId: values.userId })
            }, token);
            message.success('Packer Assigned Successfully');
            setAssignModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Assignment failed');
        }
    };

    const [acceptRejectModalOpen, setAcceptRejectModalOpen] = useState(false);

    const handleAccept = async () => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/start`, { method: 'POST' }, token);
            message.success('Task Accepted - Moved to In Progress');
            setAcceptRejectModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Failed to accept');
        }
    };

    const handleReject = async () => {
        if (!selectedTask) return;
        try {
            await apiRequest(`/api/packing/${selectedTask.id}/reject`, { method: 'POST' }, token);
            message.success('Task Rejected - Returned to Pending');
            setAcceptRejectModalOpen(false);
            fetchPacking();
        } catch (err) {
            message.error(err.message || 'Failed to reject');
        }
    };

    const handleEditClick = (task) => {
        setSelectedTask(task);
        const { user } = useAuthStore.getState();
        if (user?.role === 'packer') {
            setAcceptRejectModalOpen(true);
        } else {
            if (task.assignedTo) {
                assignForm.setFieldsValue({ userId: task.assignedTo });
            } else {
                assignForm.resetFields();
            }
            setAssignModalOpen(true);
        }
    };

    const [viewModalOpen, setViewModalOpen] = useState(false);

    const handleViewClick = (task) => {
        setSelectedTask(task);
        setViewModalOpen(true);
    };

    const columns = [
        { title: 'Task ID', dataIndex: 'id', key: 'ps', render: (v, r) => <Link to={`/packing/${r.id}`} className="font-bold text-cyan-600 underline">{String(v).slice(0, 8)}...</Link> },
        { title: 'Sales Order', key: 'order', render: (_, r) => <span className="font-medium text-slate-700">{r.SalesOrder?.orderNumber || '—'}</span> },
        { title: 'Customer', key: 'customer', render: (_, r) => r.SalesOrder?.Customer?.name || '—' },
        {
            title: 'Status', dataIndex: 'status', key: 'status', render: (s) => (
                <Tag color={(s || '').toUpperCase() === 'PACKED' ? 'green' : (s || '').toUpperCase() === 'PACKING' ? 'blue' : 'orange'} className="uppercase font-black text-[10px]">
                    {s || 'NOT_STARTED'}
                </Tag>
            )
        },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewClick(r)} />
                    <Button type="text" icon={<EditOutlined className="text-indigo-500" />} onClick={() => handleEditClick(r)} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    const { user } = useAuthStore.getState();
    const isPacker = user?.role === 'packer';

    const renderCards = () => {
        if (isPacker) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm overflow-hidden group">
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dispatched</span>
                            <span className="text-4xl font-black text-orange-500 group-hover:scale-110 transition-transform">
                                {packingTasks.filter(t => ['NOT_STARTED', 'PENDING', 'ASSIGNED'].includes((t.status || '').toUpperCase())).length}
                            </span>
                        </div>
                        <div className="absolute top-0 right-0 w-16 h-16 opacity-5 transform rotate-12 text-orange-500 fill-current"><InboxOutlined style={{ fontSize: 64 }} /></div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm overflow-hidden group">
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">In Progress</span>
                            <span className="text-4xl font-black text-blue-500 group-hover:scale-110 transition-transform">
                                {packingTasks.filter(t => ['PACKING', 'IN_PROGRESS'].includes((t.status || '').toUpperCase())).length}
                            </span>
                        </div>
                        <div className="absolute top-0 right-0 w-16 h-16 opacity-5 transform rotate-12 text-blue-500 fill-current"><SyncOutlined style={{ fontSize: 64 }} /></div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm overflow-hidden group">
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completed</span>
                            <span className="text-4xl font-black text-cyan-500 group-hover:scale-110 transition-transform">
                                {packingTasks.filter(t => (t.status || '').toUpperCase() === 'PACKED').length}
                            </span>
                        </div>
                        <div className="absolute top-0 right-0 w-16 h-16 opacity-5 transform rotate-12 text-cyan-500 fill-current"><CheckCircleOutlined style={{ fontSize: 64 }} /></div>
                    </Card>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Pending', count: packingTasks.filter(t => ['NOT_STARTED', 'PENDING'].includes((t.status || '').toUpperCase())).length, color: 'text-orange-500' },
                    { label: 'Assigned', count: packingTasks.filter(t => (t.status || '').toUpperCase() === 'ASSIGNED').length, color: 'text-purple-500' },
                    { label: 'In Progress', count: packingTasks.filter(t => (t.status || '').toUpperCase() === 'PACKING').length, color: 'text-blue-500' },
                    { label: 'Completed', count: packingTasks.filter(t => (t.status || '').toUpperCase() === 'PACKED').length, color: 'text-cyan-500' }
                ].map((stat, i) => (
                    <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden group">
                        <div className="flex flex-col relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</span>
                            <span className={`text-4xl font-black ${stat.color} group-hover:scale-110 transition-transform`}>{stat.count}</span>
                        </div>
                        <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 transform rotate-12 ${stat.color} fill-current`}><InboxOutlined style={{ fontSize: 64 }} /></div>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Packing</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em]">Final stage verification and containerization</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchPacking} className="h-12 rounded-xl border-slate-200">Refresh</Button>
                </div>

                {renderCards()}

                <Card className="rounded-[2rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8 gap-6">
                            <Search placeholder="Identity Search (Slip, Order, Customer)..." className="max-w-md h-12 shadow-inner rounded-xl" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                            <Tabs
                                activeKey={activeTab}
                                onChange={setActiveTab}
                                items={[
                                    { key: 'NOT_STARTED', label: 'Pending' },
                                    ...(useAuthStore.getState().user?.role !== 'packer' ? [{ key: 'ASSIGNED', label: 'Assigned' }] : []),
                                    { key: 'PACKING', label: 'In Progress' }
                                ]}
                                className="packing-tabs"
                            />
                        </div>
                        <Table columns={columns} dataSource={filteredTasks} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Accept or Reject Assignment" open={acceptRejectModalOpen} onCancel={() => setAcceptRejectModalOpen(false)} footer={null}>
                    {selectedTask && (
                        <div className="text-center space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">{selectedTask.SalesOrder?.orderNumber}</h3>
                                <p className="text-gray-500">Task ID: {String(selectedTask.id).slice(0, 8)}</p>
                                <p className="text-gray-500">Customer: {selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Button size="large" danger className="w-32 h-12 rounded-xl font-bold" onClick={handleReject}>Reject</Button>
                                <Button size="large" type="primary" className="w-32 h-12 rounded-xl font-bold bg-green-500 hover:bg-green-600 border-none" onClick={handleAccept}>Accept</Button>
                            </div>
                        </div>
                    )}
                </Modal>

                <Modal title="Assign Picker" open={assignModalOpen} onCancel={() => setAssignModalOpen(false)} onOk={() => assignForm.submit()} className="assign-modal">
                    {selectedTask && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <p><strong>Order #:</strong> {selectedTask.SalesOrder?.orderNumber}</p>
                            <p><strong>Customer:</strong> {selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                            <p><strong>Items:</strong> {selectedTask.PickList?.PickListItems?.length || 0}</p>
                        </div>
                    )}
                    <Form form={assignForm} layout="vertical" onFinish={handleAssign}>
                        <Form.Item label="Select Packer" name="userId" rules={[{ required: true, message: 'Please select a packer' }]}>
                            <Select placeholder="Select a packer" className="w-full">
                                {packers.filter(p => p.role === 'packer').map(p => (
                                    <Select.Option key={p.id} value={p.id}>{p.name} ({p.role})</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

                <Modal title="Packing Task Details" open={viewModalOpen} onCancel={() => setViewModalOpen(false)} footer={<Button onClick={() => setViewModalOpen(false)}>Close</Button>}>
                    {selectedTask && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Task ID</p>
                                    <p className="font-mono font-bold text-lg">{String(selectedTask.id).slice(0, 8)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Status</p>
                                    <Tag color={selectedTask.status === 'PACKED' ? 'green' : 'blue'}>{selectedTask.status}</Tag>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Sales Order</p>
                                    <p className="font-bold">{selectedTask.SalesOrder?.orderNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Customer</p>
                                    <p>{selectedTask.SalesOrder?.Customer?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Assigned Packer</p>
                                    <p>{selectedTask.User?.name || 'Unassigned'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Total Items</p>
                                    <p>{selectedTask.PickList?.PickListItems?.length || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div >
        </MainLayout >
    );
}

