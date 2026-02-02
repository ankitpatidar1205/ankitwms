import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    UploadOutlined,
    ShoppingOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatCurrency, getStatusColor } from '../utils';

export default function Products() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [categoryFilter, setCategoryFilter] = useState(undefined);
    const [statusFilter, setStatusFilter] = useState(undefined);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            setProducts(list);
        } catch (err) {
            message.error(err?.message || err?.data?.message || 'Failed to load products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const handleDelete = async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/inventory/products/${id}`, { method: 'DELETE' }, token);
            message.success('Product deleted');
            fetchProducts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to delete product');
        }
    };

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (_) {
            setCategories([]);
        }
    }, [token]);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, [fetchProducts, fetchCategories]);

    const filteredProducts = products.filter((p) => {
        const matchSearch = !searchText || (p.name && p.name.toLowerCase().includes(searchText.toLowerCase())) || (p.sku && String(p.sku).toLowerCase().includes(searchText.toLowerCase())) || (p.barcode && String(p.barcode).toLowerCase().includes(searchText.toLowerCase()));
        const matchCategory = categoryFilter == null || p.categoryId === categoryFilter;
        const matchStatus = statusFilter == null || (p.status || 'ACTIVE') === statusFilter;
        return matchSearch && matchCategory && matchStatus;
    });

    const getCategoryName = (categoryId) => {
        if (categoryId == null) return '—';
        const c = categories.find((x) => x.id === categoryId);
        return c ? c.name : '—';
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: setSelectedRowKeys,
    };

    const columns = [
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 110, fixed: 'left', render: (v, r) => <Link to={`/products/${r.id}`} className="text-blue-600 hover:underline font-medium">{v || '—'}</Link> },
        { title: 'Product Name', dataIndex: 'name', key: 'name', width: 180, ellipsis: true, render: (v, r) => <Link to={`/products/${r.id}`} className="text-blue-600 hover:underline">{v || '—'}</Link> },
        { title: 'Category', key: 'category', width: 120, render: (_, r) => getCategoryName(r.categoryId) },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', width: 130, render: (v) => <span className="font-mono text-xs text-gray-600">{v || '—'}</span> },
        { title: 'Price', dataIndex: 'price', key: 'price', width: 95, align: 'right', render: (v) => <span className="font-medium">{formatCurrency(v)}</span> },
        { title: 'Cost', dataIndex: 'costPrice', key: 'costPrice', width: 95, align: 'right', render: (v) => <span className="text-gray-600">{formatCurrency(v)}</span> },
        { title: 'Stock', key: 'stock', width: 90, align: 'right', render: (_, r) => <span className="inline-flex items-center gap-1"><ShoppingOutlined className="text-slate-400 text-xs" />{(r.ProductStocks || r.inventory || [])?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 95, render: (s) => <Tag color={getStatusColor(s)}>{s || 'ACTIVE'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
                <Space size="small">
                    <Button type="link" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}`); }} className="p-0 h-auto">View</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}/edit`); }} className="p-0 h-auto">Edit</Button>
                    <Popconfirm title="Delete this product?" description="This cannot be undone." onConfirm={() => handleDelete(r.id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0 h-auto">Delete</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const activeCount = products.filter((x) => (x.status || 'ACTIVE') === 'ACTIVE').length;
    const inactiveCount = products.length - activeCount;

    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Products</h1>
                        <p className="text-gray-500 text-sm mt-1">Manage your product catalog ({filteredProducts.length} total)</p>
                    </div>
                    <Space size="middle" className="flex-shrink-0 flex-wrap">
                        <Button icon={<ReloadOutlined />} onClick={fetchProducts} className="h-10 rounded-lg">Refresh</Button>
                        <Button icon={<UploadOutlined />} onClick={() => navigate('/products/import-export')} className="h-10 rounded-lg">Import</Button>
                        <Link to="/products/add">
                            <Button type="primary" icon={<PlusOutlined />} size="large" className="h-10 px-5 rounded-lg font-semibold bg-blue-600 border-blue-600 hover:bg-blue-700">
                                Add Product
                            </Button>
                        </Link>
                    </Space>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm font-medium text-slate-500">Total Products</div>
                        <div className="text-2xl font-bold text-blue-600 mt-1">{products.length}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm font-medium text-slate-500">Active</div>
                        <div className="text-2xl font-bold text-green-600 mt-1">{activeCount}</div>
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <div className="text-sm font-medium text-slate-500">Inactive</div>
                        <div className="text-2xl font-bold text-red-600 mt-1">{inactiveCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-6">
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <div className="flex gap-2 flex-1 max-w-md">
                                <Input
                                    placeholder="Search by name, SKU, or barcode"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onPressEnter={() => {}}
                                    allowClear
                                    className="rounded-lg h-10 flex-1"
                                />
                                <Button type="primary" icon={<SearchOutlined />} className="h-10 rounded-lg bg-blue-600 border-blue-600">Search</Button>
                            </div>
                            <Select
                                placeholder="Filter by category"
                                allowClear
                                value={categoryFilter}
                                onChange={setCategoryFilter}
                                className="min-w-[180px] rounded-lg h-10"
                                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                            />
                            <Select
                                placeholder="Filter by status"
                                allowClear
                                value={statusFilter}
                                onChange={setStatusFilter}
                                className="min-w-[160px] rounded-lg h-10"
                                options={[
                                    { value: 'ACTIVE', label: 'Active' },
                                    { value: 'INACTIVE', label: 'Inactive' },
                                ]}
                            />
                        </div>

                        <Table
                            size="small"
                            rowSelection={rowSelection}
                            columns={columns}
                            dataSource={filteredProducts}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} products`, pageSizeOptions: ['10', '20', '50'] }}
                            className="[&_.ant-table-thead_th]:bg-gray-50 [&_.ant-table-thead_th]:font-medium [&_.ant-table-thead_th]:text-slate-600"
                            scroll={{ x: 1000, y: 420 }}
                        />
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}
