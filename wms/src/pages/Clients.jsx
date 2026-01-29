import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Input, Select, Space, Avatar, Modal, Form, Row, Col, Popconfirm, message } from 'antd';
import { PlusOutlined, SearchOutlined, UsergroupAddOutlined, MailOutlined, PhoneOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Clients() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchClients = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/orders/customers', { method: 'GET' }, token);
            setClients(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load clients');
            setClients([]);
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
        if (token) {
            fetchClients();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchClients, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { name: values.name, email: values.email || null, phone: values.phone || null, address: values.address || null };
            if (isSuperAdmin && !selectedClient) payload.companyId = values.companyId;
            if (selectedClient) {
                await apiRequest(`/api/orders/customers/${selectedClient.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Client updated');
            } else {
                await apiRequest('/api/orders/customers', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Client added');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedClient(null);
            fetchClients();
        } catch (err) {
            message.error(err.message || 'Failed to save client');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/orders/customers/${id}`, { method: 'DELETE' }, token);
            message.success('Client deleted');
            fetchClients();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const columns = [
        {
            title: 'Name',
            key: 'partner',
            render: (_, r) => (
                <div className="flex items-center gap-4">
                    <Avatar className="bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg" icon={<UsergroupAddOutlined />} />
                    <div className="font-bold text-slate-800">{r.name}</div>
                </div>
            )
        },
        { title: 'Email', dataIndex: 'email', key: 'email', render: (v) => <span className="text-gray-600"><MailOutlined className="mr-1" />{v || '—'}</span> },
        { title: 'Phone', dataIndex: 'phone', key: 'phone', render: (v) => <span><PhoneOutlined className="mr-1" />{v || '—'}</span> },
        { title: 'Address', dataIndex: 'address', key: 'address', ellipsis: true, render: (v) => v || '—' },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => { setSelectedClient(r); form.setFieldsValue({ name: r.name, email: r.email, phone: r.phone, address: r.address, companyId: r.companyId }); setModalOpen(true); }} />
                    <Popconfirm title="Delete this client?" onConfirm={() => handleDelete(r.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Clients</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Management of third-party logistics partners, B2B enterprise clients, and fiscal account configurations</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-indigo-100 font-bold" onClick={() => { setSelectedClient(null); form.resetFields(); setModalOpen(true); }}>
                        Add Client
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Partnerships</div><div className="text-3xl font-black">{clients.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Enterprise (B2B)</div><div className="text-3xl font-black">{clients.filter(c => c.type === 'B2B').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-emerald-500 uppercase mb-1">Direct (B2C)</div><div className="text-3xl font-black">{clients.filter(c => c.type === 'B2C').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-amber-500 uppercase mb-1">Premium Accounts</div><div className="text-3xl font-black">{clients.filter(c => c.tier === 'Premium').length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Search by name or email..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} />
                            <Button icon={<ReloadOutlined />} onClick={fetchClients} />
                        </div>
                        <Table columns={columns} dataSource={clients.filter(c => !searchText || (c.name || '').toLowerCase().includes(searchText.toLowerCase()) || (c.email || '').toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedClient ? 'Edit Client' : 'Add Client'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedClient(null); }} onOk={() => form.submit()} okButtonProps={{ loading: saving }} width={600} className="client-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        {isSuperAdmin && !selectedClient && (
                            <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                <Select placeholder="Select company" className="h-11 rounded-xl">
                                    {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item label="Name" name="name" rules={[{ required: true }]}><Input placeholder="Client name" className="h-11 rounded-xl" /></Form.Item>
                        <Row gutter={16}>
                            <Col span={12}><Form.Item label="Email" name="email"><Input type="email" placeholder="email@example.com" className="h-11 rounded-xl" /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Phone" name="phone"><Input placeholder="Phone" className="h-11 rounded-xl" /></Form.Item></Col>
                        </Row>
                        <Form.Item label="Address" name="address"><Input.TextArea rows={2} className="rounded-xl" placeholder="Address" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
