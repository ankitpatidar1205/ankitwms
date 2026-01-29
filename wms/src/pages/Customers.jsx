import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Form, Drawer, Modal, Tabs, message } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    UserOutlined,
    MailOutlined,
    PhoneOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Customers() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchCustomers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/orders/customers', { method: 'GET' }, token);
            setCustomers(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load customers');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const filteredCustomers = customers.filter((c) => {
        const matchesSearch = !searchText ||
            c.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchText.toLowerCase()) ||
            c.code?.toLowerCase().includes(searchText.toLowerCase());
        return matchesSearch;
    });

    const b2cCustomers = filteredCustomers.filter(c => c.customerType === 'B2C');
    const b2bCustomers = filteredCustomers.filter(c => c.customerType === 'B2B');

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            if (editMode && selectedCustomer) {
                await apiRequest(`/api/orders/customers/${selectedCustomer.id}`, { method: 'PUT', body: JSON.stringify(values) }, token);
                message.success('Customer updated!');
            } else {
                await apiRequest('/api/orders/customers', { method: 'POST', body: JSON.stringify(values) }, token);
                message.success('Customer created!');
            }
            setModalOpen(false);
            form.resetFields();
            fetchCustomers();
        } catch (error) {
            message.error(error.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/orders/customers/${id}`, { method: 'DELETE' }, token);
            message.success('Customer deleted');
            fetchCustomers();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const handleEdit = (record) => {
        setSelectedCustomer(record);
        form.setFieldsValue(record);
        setEditMode(true);
        setModalOpen(true);
    };

    const columns = [
        {
            title: 'Customer Code',
            dataIndex: 'code',
            key: 'code',
            render: (text) => <Tag className="font-mono bg-slate-50">{text}</Tag>,
        },
        {
            title: 'Customer Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="font-bold text-blue-600 cursor-pointer hover:underline" onClick={() => { setSelectedCustomer(record); setDrawerOpen(true); }}>
                    {text}
                </div>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (email) => <span className="text-gray-500"><MailOutlined className="mr-1" /> {email || '-'}</span>,
        },
        {
            title: 'Type',
            dataIndex: 'customerType',
            key: 'customerType',
            render: (type) => <Tag color={type === 'B2B' ? 'blue' : 'green'}>{type}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => handleEdit(record)} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { }} />
                </Space>
            ),
        },
    ];

    const renderTable = (dataSource) => (
        <div className="mt-4">
            <div className="mb-4 flex gap-4">
                <Search placeholder="Search customers..." className="max-w-md" onChange={e => setSearchText(e.target.value)} allowClear />
                <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>Sync</Button>
            </div>
            <Table columns={columns} dataSource={dataSource} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
        </div>
    );

    const tabItems = [
        { key: 'all', label: `All (${filteredCustomers.length})`, children: renderTable(filteredCustomers) },
        { key: 'b2c', label: `B2C (${b2cCustomers.length})`, children: renderTable(b2cCustomers) },
        { key: 'b2b', label: `B2B (${b2bCustomers.length})`, children: renderTable(b2bCustomers) },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Customers</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Monitor and manage B2B and B2C client relationships</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-12 rounded-xl shadow-lg" onClick={() => { setEditMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Customer
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm bg-blue-50/50">
                        <div className="text-blue-600 font-bold text-xs uppercase mb-1">Total Base</div>
                        <div className="text-3xl font-black text-slate-800">{customers.length}</div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-green-50/50">
                        <div className="text-green-600 font-bold text-xs uppercase mb-1">B2C Retail</div>
                        <div className="text-3xl font-black text-slate-800">{b2cCustomers.length}</div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-purple-50/50">
                        <div className="text-purple-600 font-bold text-xs uppercase mb-1">B2B Wholesale</div>
                        <div className="text-3xl font-black text-slate-800">{b2bCustomers.length}</div>
                    </Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="custom-tabs" />
                </Card>

                <Drawer title="Customer Insight" placement="right" width={500} open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    {selectedCustomer && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-6 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedCustomer.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{selectedCustomer.name}</h2>
                                        <Tag color="blue">{selectedCustomer.customerType}</Tag>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Contact Email</span><span className="font-medium">{selectedCustomer.email || '-'}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Phone Number</span><span className="font-medium">{selectedCustomer.phone || '-'}</span></div>
                                <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Unique Code</span><span className="font-mono">{selectedCustomer.code}</span></div>
                                <div className="pt-2"><span className="text-gray-500 block mb-1">Billing Address</span><p className="font-medium text-slate-700">{selectedCustomer.address || 'No address provided'}</p></div>
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal title={editMode ? 'Edit Client Profile' : 'New Customer Onboarding'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={saving} className="rounded-2xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        <Form.Item label="Customer Code" name="code" rules={[{ required: true }]}>
                            <Input placeholder="CUST-001" disabled={editMode} className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Customer Name" name="name" rules={[{ required: true }]}>
                            <Input className="h-10 rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Account Type" name="customerType" rules={[{ required: true }]}>
                            <Select className="h-10 rounded-lg">
                                <Option value="B2C">B2C Retail</Option>
                                <Option value="B2B">B2B Wholesale</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Email" name="email"><Input className="h-10 rounded-lg" /></Form.Item>
                        <Form.Item label="Phone" name="phone"><Input className="h-10 rounded-lg" /></Form.Item>
                        <Form.Item label="Address" name="address"><Input.TextArea rows={3} className="rounded-lg" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
