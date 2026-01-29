import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, App, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ContactsOutlined,
    MailOutlined,
    PhoneOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Suppliers() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchSuppliers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/suppliers', { method: 'GET' }, token);
            setSuppliers(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load suppliers');
            setSuppliers([]);
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
            fetchSuppliers();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchSuppliers, isSuperAdmin, fetchCompanies]);

    const filteredSuppliers = suppliers.filter((s) => {
        const matchesSearch = !searchText ||
            s.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(searchText.toLowerCase())) ||
            (s.code && s.code.toLowerCase().includes(searchText.toLowerCase()));
        return matchesSearch;
    });

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { code: values.code, name: values.name, email: values.email || null, phone: values.phone || null, address: values.address || null };
            if (isSuperAdmin && !editMode) payload.companyId = values.companyId;
            if (editMode && selectedSupplier) {
                await apiRequest(`/api/suppliers/${selectedSupplier.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Supplier updated!');
            } else {
                await apiRequest('/api/suppliers', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Supplier created!');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedSupplier(null);
            setEditMode(false);
            fetchSuppliers();
        } catch (error) {
            message.error(error.message || 'Failed to save supplier');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/suppliers/${id}`, { method: 'DELETE' }, token);
            message.success('Supplier deleted');
            fetchSuppliers();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const handleEdit = (record) => {
        setSelectedSupplier(record);
        form.setFieldsValue({ ...record, companyId: record.companyId });
        setEditMode(true);
        setModalOpen(true);
    };

    const columns = [
        {
            title: 'Code',
            dataIndex: 'code',
            key: 'code',
            width: 120,
            render: (text) => <Tag className="font-mono bg-blue-50 text-blue-700 border-blue-100">{text}</Tag>,
        },
        {
            title: 'Supplier Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 hover:text-blue-600">
                    <ContactsOutlined className="text-blue-500" /> {text}
                </div>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email) => <span className="text-gray-500 italic"><MailOutlined className="mr-1" /> {email || '-'}</span>,
        },
        {
            title: 'Phone',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => <span><PhoneOutlined className="mr-1" /> {phone || '-'}</span>,
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Delete this supplier?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Suppliers</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Manage active vendor partnerships and logistics contacts</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-12 rounded-xl shadow-lg shadow-blue-200" onClick={() => { setEditMode(false); form.resetFields(); setModalOpen(true); }}>
                        Register Supplier
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm bg-blue-50/50">
                        <div className="text-blue-600 font-bold text-xs uppercase tracking-widest mb-1">Total Vendors</div>
                        <div className="text-3xl font-black text-slate-800">{suppliers.length}</div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-green-50/50">
                        <div className="text-green-600 font-bold text-xs uppercase tracking-widest mb-1">Active Deals</div>
                        <div className="text-3xl font-black text-slate-800">{suppliers.length}</div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-purple-50/50">
                        <div className="text-purple-600 font-bold text-xs uppercase tracking-widest mb-1">Integrations</div>
                        <div className="text-3xl font-black text-slate-800">4</div>
                    </Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="mb-6 flex gap-4">
                        <Search placeholder="Search suppliers..." className="max-w-md h-10" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                        <Button icon={<ReloadOutlined />} onClick={fetchSuppliers} className="h-10 rounded-lg">Live Sync</Button>
                    </div>
                    <Table columns={columns} dataSource={filteredSuppliers} rowKey="id" loading={loading} />
                </Card>

                <Modal
                    title={editMode ? 'Update Partner' : 'New Vendor Registration'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedSupplier(null); setEditMode(false); }}
                    onOk={() => form.submit()}
                    confirmLoading={saving}
                    className="rounded-2xl"
                >
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        {isSuperAdmin && !editMode && (
                            <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                <Select placeholder="Select company" className="h-10 rounded-lg" showSearch optionFilterProp="label" options={companies.map(c => ({ value: c.id, label: c.name }))} />
                            </Form.Item>
                        )}
                        <Form.Item label="Supplier Code" name="code" rules={[{ required: true }]}>
                            <Input placeholder="e.g. SUP-GLOBAL" disabled={editMode} className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Partner Name" name="name" rules={[{ required: true }]}>
                            <Input placeholder="Company name" className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Contact Email" name="email">
                            <Input type="email" className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Support Phone" name="phone">
                            <Input className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Address" name="address">
                            <Input.TextArea rows={2} className="rounded-lg" />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
