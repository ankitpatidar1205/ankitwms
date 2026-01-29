import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, Row, Col, Space, Avatar, message } from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { apiRequest } from '../api/client';

const { Search } = Input;
const { Option } = Select;

const STAFF_ROLES = [
    { value: 'warehouse_manager', label: 'Warehouse Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'picker', label: 'Picker' },
    { value: 'packer', label: 'Packer' },
    { value: 'viewer', label: 'Viewer' },
];

const SUPER_ADMIN_ROLES = [
    { value: 'company_admin', label: 'Company Admin' },
    ...STAFF_ROLES,
];

export default function Users() {
    const { token, user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [companiesLoading, setCompaniesLoading] = useState(false);
    const [form] = Form.useForm();

    const isSuperAdmin = currentUser?.role === 'super_admin';

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/users', { method: 'GET' }, token);
            setUsers(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load users');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDependencies = useCallback(async () => {
        if (!token) return;
        try {
            if (isSuperAdmin) {
                setCompaniesLoading(true);
                const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
                const list = Array.isArray(data?.data) ? data.data : (data?.data ? [].concat(data.data) : []);
                setCompanies(list);
            } else {
                const data = await apiRequest('/api/warehouses', { method: 'GET' }, token);
                setWarehouses(Array.isArray(data.data) ? data.data : data.data || []);
            }
        } catch (err) {
            if (isSuperAdmin) {
                setCompanies([]);
                message.error(err.message || 'Companies list load nahi hui. Company Management se pehle company add karo.');
            } else {
                setWarehouses([]);
            }
        } finally {
            setCompaniesLoading(false);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        if (token) {
            fetchUsers();
            fetchDependencies();
        }
    }, [token, fetchUsers, fetchDependencies]);

    const handleSubmit = async (values) => {
        try {
            const payload = { name: values.name, email: (values.email || '').trim().toLowerCase(), status: values.status || 'ACTIVE' };
            if (values.password) payload.password = values.password;
            if (isSuperAdmin) {
                payload.role = values.role || 'company_admin';
                payload.companyId = values.companyId;
                if (!payload.companyId) {
                    message.error('Pehle company select karo.');
                    return;
                }
            } else {
                payload.role = values.role;
                payload.warehouseId = values.warehouseId || undefined;
            }
            setSubmitLoading(true);
            if (selectedUser) {
                await apiRequest(`/api/users/${selectedUser.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('User updated successfully');
            } else {
                if (!payload.password || payload.password.length < 6) {
                    message.error('Password kam se kam 6 characters hona chahiye.');
                    setSubmitLoading(false);
                    return;
                }
                await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('User add ho gaya!');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            message.error(err.message || 'User save nahi hua. Check: company select kiya? Email unique hai?');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/users/${id}`, { method: 'DELETE' }, token);
            message.success('User deleted');
            fetchUsers();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const openAdd = () => {
        setSelectedUser(null);
        form.resetFields();
        form.setFieldsValue({ status: 'ACTIVE', ...(isSuperAdmin ? { role: 'company_admin' } : {}) });
        if (isSuperAdmin) fetchDependencies();
        setModalOpen(true);
        if (isSuperAdmin && companies.length === 0 && !companiesLoading) {
            message.info('Pehle Company Management se ek company add karo, phir yahan company select karke user add karo.');
        }
    };

    const openEdit = (r) => {
        setSelectedUser(r);
        form.setFieldsValue({
            name: r.name,
            email: r.email,
            role: r.role,
            companyId: r.companyId || r.Company?.id,
            warehouseId: r.warehouseId || r.Warehouse?.id,
            status: r.status || 'ACTIVE',
        });
        setModalOpen(true);
    };

    const columns = [
        {
            title: 'User',
            key: 'user',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <Avatar icon={<UserOutlined />} className="bg-slate-100 text-slate-400" />
                    <div>
                        <div className="font-semibold text-slate-800">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.email}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={role?.toLowerCase?.().includes('admin') ? 'red' : 'blue'} className="uppercase text-[10px]">{role?.replace(/_/g, ' ')}</Tag>,
        },
        {
            title: 'Company',
            key: 'company',
            render: (_, r) => <span className="text-sm text-slate-600">{r.Company?.name || '—'}</span>,
        },
        {
            title: 'Warehouse',
            key: 'wh',
            render: (_, r) => <span className="text-sm text-slate-600">{r.Warehouse?.name || '—'}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'orange'} className="uppercase text-[9px]">{v || 'ACTIVE'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => openEdit(r)} />
                    <Button type="text" icon={<SafetyOutlined className="text-amber-500" />} title="Security" />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
                </Space>
            ),
        },
    ];

    const filtered = users
        .filter(u => (u.role || '').toLowerCase() !== 'super_admin')
        .filter(u =>
            (u.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(searchText.toLowerCase())
        );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">User Management</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">
                            {isSuperAdmin ? 'Add Company Admin under a company' : 'Add staff (Warehouse Manager, Inventory Manager, Picker, Packer, Viewer)'}
                        </p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-12 px-6 rounded-xl bg-indigo-600 border-indigo-600 shadow-md font-bold" onClick={openAdd}>
                        Add User
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Users</div><div className="text-3xl font-black">{users.filter(u => (u.role || '').toLowerCase() !== 'super_admin').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Online Now</div><div className="text-3xl font-black">12</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Admin Users</div><div className="text-3xl font-black">{users.filter(u => (u.role || '').toLowerCase() !== 'super_admin' && u.role?.toLowerCase?.().includes('admin')).length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm text-red-500"><div className="text-[10px] font-black uppercase mb-1">Security Flags</div><div className="text-3xl font-black">0</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Search by name, email..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} />
                            <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
                        </div>
                        <Table columns={columns} dataSource={filtered} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedUser ? 'Edit User' : (isSuperAdmin ? 'Add Company Admin' : 'Add User')} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedUser(null); }} onOk={() => form.submit()} okButtonProps={{ loading: submitLoading }} width={700} className="user-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Row gutter={16}>
                            <Col span={12}><Form.Item label="Name" name="name" rules={[{ required: true }]}><Input placeholder="Full name" className="h-11 rounded-xl" /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}><Input placeholder="user@company.com" className="h-11 rounded-xl" /></Form.Item></Col>
                        </Row>
                        {!selectedUser && (
                            <Form.Item label="Password" name="password" rules={[{ required: true, min: 6, message: 'Min 6 characters' }]}><Input.Password placeholder="Min 6 characters" className="h-11 rounded-xl" /></Form.Item>
                        )}
                        {isSuperAdmin ? (
                            <>
                                <Form.Item label="Role" name="role" rules={[{ required: true, message: 'Role select karo' }]} initialValue="company_admin">
                                    <Select placeholder="Select role" className="h-11 rounded-xl" optionFilterProp="label">
                                        {SUPER_ADMIN_ROLES.map(r => <Option key={r.value} value={r.value} label={r.label}>{r.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Company" name="companyId" rules={[{ required: !selectedUser, message: 'Company select karo' }]} extra={!selectedUser && companies.length === 0 ? 'Pehle Company Management se company add karo.' : null}>
                                    <Select placeholder={companiesLoading ? 'Loading...' : ((Array.isArray(companies) ? companies : []).length === 0 ? 'Pehle company add karo' : 'Company select karo')} loading={companiesLoading} className="h-11 rounded-xl" allowClear disabled={!!selectedUser} optionFilterProp="label">
                                        {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id} label={c.name}>{c.name} ({c.code})</Option>)}
                                    </Select>
                                </Form.Item>
                            </>
                        ) : (
                            <>
                                <Form.Item label="Role" name="role" rules={[{ required: true }]}>
                                    <Select placeholder="Select role" className="h-11 rounded-xl">
                                        {STAFF_ROLES.map(r => <Option key={r.value} value={r.value}>{r.label}</Option>)}
                                    </Select>
                                </Form.Item>
                                <Form.Item label="Warehouse" name="warehouseId">
                                    <Select className="h-11 rounded-xl" allowClear placeholder="Optional">
                                        {(Array.isArray(warehouses) ? warehouses : []).map(w => <Option key={w.id} value={w.id}>{w.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </>
                        )}
                        <Form.Item label="Status" name="status" initialValue="ACTIVE"><Select className="h-11 rounded-xl"><Option value="ACTIVE">Active</Option><Option value="SUSPENDED">Suspended</Option></Select></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
