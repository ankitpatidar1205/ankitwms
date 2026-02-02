import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, InputNumber, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined, InboxOutlined, ReloadOutlined, DatabaseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

const WAREHOUSE_TYPE_LABELS = { MAIN: 'Main', PREP: 'Prep', STANDARD: 'Standard', COLD: 'Cold Storage', FROZEN: 'Frozen', HAZMAT: 'Hazmat', BONDED: 'Bonded' };

export default function Warehouses() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load warehouses');
            setWarehouses([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchCompanies = useCallback(async () => {
        if (!token || !isSuperAdmin) return;
        try {
            const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
            setCompanies(Array.isArray(data?.data) ? data.data : []);
        } catch { setCompanies([]); }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        fetchWarehouses();
        if (isSuperAdmin) fetchCompanies();
    }, [fetchWarehouses, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { code: values.code, name: values.name, warehouseType: values.warehouseType, status: values.status, phone: values.phone, address: values.address, capacity: values.capacity };
            if (isSuperAdmin && !editMode) payload.companyId = values.companyId;
            if (editMode && selectedWarehouse) {
                await apiRequest(`/api/warehouses/${selectedWarehouse.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Warehouse updated');
            } else {
                await apiRequest('/api/warehouses', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Warehouse created');
            }
            setModalOpen(false);
            form.resetFields();
            fetchWarehouses();
        } catch (err) {
            message.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/warehouses/${id}`, { method: 'DELETE' }, token);
            message.success('Warehouse deleted');
            fetchWarehouses();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const mainCount = warehouses.filter(w => (w.warehouseType || '').toUpperCase() === 'MAIN').length;
    const prepCount = warehouses.filter(w => (w.warehouseType || '').toUpperCase() === 'PREP').length;

    const columns = [
        { title: 'Warehouse Code', dataIndex: 'code', key: 'code', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Warehouse Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Type', dataIndex: 'warehouseType', key: 'warehouseType', width: 100, render: (v) => v ? <Tag color={(v || '').toUpperCase() === 'MAIN' ? 'blue' : (v || '').toUpperCase() === 'PREP' ? 'orange' : 'default'}>{v}</Tag> : '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s || '—'}</Tag> },
        { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true, render: (v) => v ? <span className="flex items-center gap-1.5"><EnvironmentOutlined className="text-gray-400 shrink-0" />{v}</span> : '—' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone', width: 140, render: (v) => v ? <span className="flex items-center gap-1.5"><PhoneOutlined className="text-gray-400 shrink-0" />{v}</span> : '—' },
        { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100, render: (v) => v != null ? <span className="flex items-center gap-1.5"><InboxOutlined className="text-gray-400 shrink-0" />{Number(v).toLocaleString()}</span> : '—' },
        {
            title: 'Actions', key: 'act', width: 140, fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedWarehouse(r); form.setFieldsValue({ code: r.code, name: r.name, warehouseType: r.warehouseType, status: r.status, phone: r.phone, address: r.address, capacity: r.capacity }); setViewMode(true); setEditMode(false); setModalOpen(true); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedWarehouse(r); form.setFieldsValue({ code: r.code, name: r.name, warehouseType: r.warehouseType, status: r.status, phone: r.phone, address: r.address, capacity: r.capacity }); setEditMode(true); setViewMode(false); setModalOpen(true); }} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Warehouse Management</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage your warehouse locations and facilities</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setEditMode(false); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Warehouse
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><DatabaseOutlined style={{ fontSize: 22 }} /></div>
                            <div><div className="text-xs text-gray-500 font-normal">Total Warehouses</div><div className="text-2xl font-medium text-blue-600">{warehouses.length}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircleOutlined style={{ fontSize: 22 }} /></div>
                            <div><div className="text-xs text-gray-500 font-normal">Active</div><div className="text-2xl font-medium text-green-600">{warehouses.filter(x => x.status === 'ACTIVE').length}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600"><HomeOutlined style={{ fontSize: 22 }} /></div>
                            <div><div className="text-xs text-gray-500 font-normal">Main Warehouses</div><div className="text-2xl font-medium text-purple-600">{mainCount}</div></div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600"><InboxOutlined style={{ fontSize: 22 }} /></div>
                            <div><div className="text-xs text-gray-500 font-normal">Prep Centers</div><div className="text-2xl font-medium text-orange-600">{prepCount}</div></div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by name, code, or address..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchWarehouses}>Refresh</Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={warehouses.filter(w => !searchText || (w.name || '').toLowerCase().includes(searchText.toLowerCase()) || (w.code || '').toLowerCase().includes(searchText.toLowerCase()) || (w.address || '').toLowerCase().includes(searchText.toLowerCase()))}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} warehouses`, pageSize: 10 }}
                            scroll={{ x: 1000 }}
                            className="custom-warehouse-table [&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Warehouse' : editMode ? 'Edit Warehouse' : 'Add Warehouse'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600' }}
                    cancelText={viewMode ? 'Close' : 'Cancel'}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {viewMode && selectedWarehouse ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse Code</div><div className="text-gray-900">{selectedWarehouse.code ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse Name</div><div className="text-gray-900">{selectedWarehouse.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse Type</div><div className="text-gray-900">{selectedWarehouse.warehouseType ? (WAREHOUSE_TYPE_LABELS[String(selectedWarehouse.warehouseType).toUpperCase()] || selectedWarehouse.warehouseType) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedWarehouse.status === 'ACTIVE' ? 'Active' : selectedWarehouse.status === 'INACTIVE' ? 'Inactive' : (selectedWarehouse.status ?? '—')}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Phone</div><div className="text-gray-900">{selectedWarehouse.phone ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Address</div><div className="text-gray-900 whitespace-pre-wrap">{selectedWarehouse.address ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Capacity (units)</div><div className="text-gray-900">{selectedWarehouse.capacity != null ? selectedWarehouse.capacity : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            {isSuperAdmin && !editMode && (
                                <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                    <Select placeholder="Select company" className="rounded-lg">
                                        {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            )}
                            <Form.Item label="Warehouse Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. WH-001" className="rounded-lg" disabled={editMode} />
                            </Form.Item>
                            <Form.Item label="Warehouse Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Warehouse name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Warehouse Type" name="warehouseType">
                                <Select placeholder="Select warehouse type" className="rounded-lg" allowClear>
                                    <Option value="MAIN">Main</Option>
                                    <Option value="PREP">Prep</Option>
                                    <Option value="STANDARD">Standard</Option>
                                    <Option value="COLD">Cold Storage</Option>
                                    <Option value="FROZEN">Frozen</Option>
                                    <Option value="HAZMAT">Hazmat</Option>
                                    <Option value="BONDED">Bonded</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                <Select placeholder="Select status" className="rounded-lg">
                                    <Option value="ACTIVE">Active</Option>
                                    <Option value="INACTIVE">Inactive</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Phone" name="phone">
                                <Input placeholder="Contact number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Address" name="address">
                                <Input.TextArea rows={2} placeholder="Full address" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Capacity (units)" name="capacity">
                                <InputNumber placeholder="Max units" className="w-full rounded-lg" min={0} />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
