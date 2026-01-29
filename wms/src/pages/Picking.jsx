import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Statistic, Row, Col, Modal, Form, Input, Select, InputNumber, Drawer, Tabs, Progress, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, InboxOutlined, MinusCircleOutlined, SearchOutlined, ReloadOutlined, FireOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
const { Search } = Input;
const { Option } = Select;

export default function Picking() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [pickLists, setPickLists] = useState([]);
    const [salesOrders, setSalesOrders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [form] = Form.useForm();

    const fetchSalesOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            const list = Array.isArray(data?.data) ? data.data : [];
            setSalesOrders(list.filter(o => ['pending', 'pick_list_created'].includes((o.status || '').toLowerCase())));
        } catch (_) {
            setSalesOrders([]);
        }
    }, [token]);

    const fetchPickLists = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/picking', { method: 'GET' }, token);
            setPickLists(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load pick lists');
            setPickLists([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPickLists();
    }, [fetchPickLists]);

    useEffect(() => {
        if (modalOpen && token) fetchSalesOrders();
    }, [modalOpen, token, fetchSalesOrders]);

    const handleSubmit = async (values) => {
        const orderId = values.orderId;
        if (!orderId) return;
        const pickList = pickLists.find(pl => (pl.salesOrderId || pl.SalesOrder?.id) === orderId);
        if (pickList) {
            setModalOpen(false);
            form.resetFields();
            navigate(`/picking/${pickList.id}`);
            message.success('Opening pick task');
        } else {
            message.warning('Pick list for this order not found. Refresh the list and try again.');
        }
    };

    const columns = [
        { title: 'Pick List', key: 'pn', render: (_, r) => <Link to={`/picking/${r.id}`} className="font-black text-indigo-600 italic tracking-tighter">PL-{String(r.id).slice(0, 8)}</Link> },
        { title: 'Order', key: 'order', render: (_, r) => r.SalesOrder?.orderNumber || r.salesOrderId || '—' },
        { title: 'Strategy', dataIndex: 'type', key: 'type', render: (t) => <Tag color="blue" className="font-bold">{t || 'SINGLE'}</Tag> },
        {
            title: 'Fulfillment', key: 'fulfill', render: (_, r) => {
                const items = r.PickListItems || r.pickItems || [];
                const req = items.reduce((s, i) => s + (i.quantityRequired || 0), 0) || 1;
                const picked = items.reduce((s, i) => s + (i.quantityPicked || 0), 0) || 0;
                return <div className="w-24"><Progress percent={Math.round((picked / req) * 100)} size="small" strokeColor="#6366f1" /></div>;
            }
        },
        { title: 'Urgency', dataIndex: 'priority', key: 'prio', render: (p) => <Tag color={p === 'HIGH' ? 'red' : 'orange'} className="font-heavy uppercase">{p}</Tag> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'COMPLETED' ? 'green' : 'blue'} className="uppercase font-extrabold">{s}</Tag> },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} />
                    <Button type="text" icon={<EditOutlined className="text-indigo-500" />} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Picking</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Coordinate pick-and-pack missions across the floor</p>
                    </div>
                    <Button type="primary" icon={<FireOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100" onClick={() => setModalOpen(true)}>
                        Spawn Pick Task
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm bg-slate-900 text-white"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Queue</div><div className="text-3xl font-black">{pickLists.filter(x => (x.status || '').toLowerCase() !== 'completed').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Hot Zone</div><div className="text-3xl font-black">{pickLists.filter(x => x.priority === 'HIGH').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Dispatched</div><div className="text-3xl font-black">{pickLists.filter(x => (x.status || '').toLowerCase() === 'completed').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Units Picked</div><div className="text-3xl font-black">{pickLists.reduce((s, p) => s + ((p.PickListItems || p.pickItems || []).reduce((ss, i) => ss + (i.quantityPicked || 0), 0) || 0), 0)}</div></Card>
                </div>

                <Card className="rounded-3xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="mb-6 p-2 bg-slate-50 rounded-2xl flex items-center gap-4">
                        <Search placeholder="ID, Ticket or Order Ref..." className="max-w-xs h-12 shadow-sm" prefix={<SearchOutlined />} />
                        <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'all', label: 'Unified View' }, { key: 'PENDING', label: 'Pending Queue' }, { key: 'IN_PROGRESS', label: 'Active Floor' }]} className="pick-tabs flex-1" />
                        <Button icon={<ReloadOutlined />} onClick={fetchPickLists} />
                    </div>
                    <Table columns={columns} dataSource={pickLists} rowKey="id" loading={loading} />
                </Card>

                <Modal title="Generate Fulfillment Directive" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} className="generation-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ type: 'SINGLE', priority: 'MEDIUM' }} className="pt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <Form.Item label="Pick Methodology" name="type" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="SINGLE">Single Order Pick</Option><Option value="BATCH">Batch (Multi-Order)</Option><Option value="WAVE">Wave Release</Option></Select></Form.Item>
                            <Form.Item label="Service Level" name="priority" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="HIGH">Expedited/High</Option><Option value="MEDIUM">Standard/Normal</Option><Option value="LOW">Economy/Low</Option></Select></Form.Item>
                        </div>
                        <Form.Item label="Target Sales Order" name="orderId" rules={[{ required: true, message: 'Select a sales order' }]}>
                            <Select
                                showSearch
                                placeholder="Search confirmed orders..."
                                className="h-11 rounded-xl"
                                optionFilterProp="label"
                                options={salesOrders.map(o => ({ value: o.id, label: `${o.orderNumber || 'ORD-' + o.id} ${(o.Customer?.name || o.customer?.name) ? ' – ' + (o.Customer?.name || o.customer?.name) : ''}` }))}
                            />
                        </Form.Item>
                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                            <h4 className="text-indigo-800 font-bold mb-1">Heuristic Engine</h4>
                            <p className="text-[10px] text-indigo-600 uppercase font-bold tracking-tight">AI will auto-allocate inventory from nearest bin locations upon generation.</p>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
