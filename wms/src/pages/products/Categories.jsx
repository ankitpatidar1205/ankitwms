import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, Space, Tag, message, Typography, Select, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Search } = Input;
const { Option } = Select;

export default function Categories() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load categories');
            setCategories([]);
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
            fetchCategories();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchCategories, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { name: values.name, code: values.code?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 50) };
            if (isSuperAdmin && !selectedCategory) payload.companyId = values.companyId;
            if (selectedCategory) {
                await apiRequest(`/api/inventory/categories/${selectedCategory.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Category updated');
            } else {
                await apiRequest('/api/inventory/categories', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Category created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedCategory(null);
            fetchCategories();
        } catch (err) {
            message.error(err.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/inventory/categories/${id}`, { method: 'DELETE' }, token);
            message.success('Category deleted');
            fetchCategories();
        } catch (err) {
            message.error(err.message || 'Failed to delete');
        }
    };

    const columns = [
        { title: 'Code', dataIndex: 'code', key: 'code', render: (v) => <Tag color="purple" className="font-black border-none text-[10px] uppercase">{v || '—'}</Tag> },
        { title: 'Name', dataIndex: 'name', key: 'name', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
        { title: 'Products', dataIndex: 'productCount', key: 'count', render: (v) => <Tag color={(v || 0) > 0 ? 'green' : 'default'} className="rounded-full">{(v || 0)} items</Tag> },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EditOutlined className="text-purple-500" />} onClick={() => { setSelectedCategory(r); form.setFieldsValue({ name: r.name, code: r.code, companyId: r.companyId }); setModalOpen(true); }} />
                    <Popconfirm title="Delete this category?" onConfirm={() => handleDelete(r.id)}>
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
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Categories</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Hierarchical classification and categorization of warehouse inventory</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-purple-600 border-purple-600 shadow-2xl shadow-purple-100 font-bold" onClick={() => { setSelectedCategory(null); form.resetFields(); setModalOpen(true); }}>
                        Add Category
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Taxon Groups</div><div className="text-3xl font-black">{categories.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-purple-500 uppercase mb-1">Total Products</div><div className="text-3xl font-black">{categories.reduce((s, c) => s + (c.productCount || 0), 0)}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Identity Search (Code, Namespace)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchCategories} />
                        </div>
                        <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedCategory ? 'Edit Category' : 'Add Category'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedCategory(null); }} onOk={() => form.submit()} okButtonProps={{ loading: saving }} width={500} className="cat-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        {isSuperAdmin && !selectedCategory && (
                            <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                <Select placeholder="Select company" className="h-11 rounded-xl">
                                    {(Array.isArray(companies) ? companies : []).map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item label="Category Name" name="name" rules={[{ required: true }]}><Input placeholder="e.g. Electronics" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Code" name="code"><Input placeholder="Optional - auto from name if empty" className="h-11 rounded-xl" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
