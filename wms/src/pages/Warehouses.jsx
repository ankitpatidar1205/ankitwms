import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, InputNumber, message } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HomeOutlined, EnvironmentOutlined, PhoneOutlined, InboxOutlined, ReloadOutlined, DatabaseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Warehouses() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [warehouses, setWarehouses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
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

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', render: (v) => <span className="font-mono bg-slate-800 text-white px-3 py-1 rounded-md text-[10px] uppercase font-bold">{v}</span> },
        { title: 'Warehouse Name', dataIndex: 'name', key: 'name', render: (v) => <span className="font-semibold text-slate-800">{v}</span> },
        { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'ACTIVE' ? 'green' : 'red'}>{s}</Tag> },
        {
            title: 'Actions', key: 'act', render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedWarehouse(r); form.setFieldsValue({ code: r.code, name: r.name, warehouseType: r.warehouseType, status: r.status, phone: r.phone, address: r.address, capacity: r.capacity }); setEditMode(true); setModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Warehouse Management</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Global logistics node distribution and capacity overview</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-100 flex items-center gap-3" onClick={() => { setEditMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Warehouse
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><DatabaseOutlined style={{ fontSize: 28 }} /></div>
                        <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Nodes</div><div className="text-4xl font-black">{warehouses.length}</div></div>
                    </div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircleOutlined style={{ fontSize: 28 }} /></div>
                        <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operational</div><div className="text-4xl font-black">{warehouses.filter(x => x.status === 'ACTIVE').length}</div></div>
                    </div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600"><EnvironmentOutlined style={{ fontSize: 28 }} /></div>
                        <div><div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sku Vol</div><div className="text-4xl font-black">{warehouses.length}</div></div>
                    </div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center gap-4">
                            <Search placeholder="Search by name or code..." className="max-w-md h-12 shadow-sm" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} />
                            <Button icon={<ReloadOutlined />} onClick={fetchWarehouses} />
                        </div>
                        <Table columns={columns} dataSource={warehouses.filter(w => !searchText || (w.name || '').toLowerCase().includes(searchText.toLowerCase()) || (w.code || '').toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={editMode ? 'Edit Warehouse' : 'Add Warehouse'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saving} width={600}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        {isSuperAdmin && !editMode && (
                            <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                <Select placeholder="Select company" className="h-11 rounded-xl">
                                    {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item label="Warehouse Code" name="code" rules={[{ required: true }]}><Input placeholder="e.g. WH-001" className="h-11 rounded-xl" disabled={editMode} /></Form.Item>
                        <Form.Item label="Warehouse Name" name="name" rules={[{ required: true }]}><Input placeholder="Warehouse name" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Warehouse Type" name="warehouseType">
                            <Select placeholder="Select warehouse type" className="h-11 rounded-xl" allowClear>
                                <Option value="STANDARD">Standard</Option>
                                <Option value="COLD">Cold Storage</Option>
                                <Option value="FROZEN">Frozen</Option>
                                <Option value="HAZMAT">Hazmat</Option>
                                <Option value="BONDED">Bonded</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Status" name="status" initialValue="ACTIVE">
                            <Select placeholder="Select status" className="h-11 rounded-xl"><Option value="ACTIVE">Active</Option><Option value="INACTIVE">Inactive</Option></Select>
                        </Form.Item>
                        <Form.Item label="Phone" name="phone"><Input placeholder="Contact number" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Address" name="address"><Input.TextArea rows={2} placeholder="Full address" className="rounded-xl" /></Form.Item>
                        <Form.Item label="Capacity (units)" name="capacity"><InputNumber placeholder="Max units" className="w-full h-11 rounded-xl" min={0} /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
