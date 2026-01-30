import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, message, Popconfirm } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    DeleteOutlined,
    EyeOutlined,
    BarcodeOutlined,
    InboxOutlined,
    ReloadOutlined,
    DollarOutlined,
    TagOutlined,
    BoxPlotOutlined,
    MinusCircleOutlined,
    ShoppingCartOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatCurrency, getStatusColor } from '../utils';

const { Search } = Input;
const { Option } = Select;

export default function Products() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchText, setSearchText] = useState('');

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(data.data) ? data.data : data.data || []);
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

    const columns = [
        { title: 'Master SKU', dataIndex: 'sku', key: 'sku', render: (v, r) => <Link to={`/products/${r.id}`} className="text-blue-600 hover:underline">{v}</Link> },
        { title: 'Product Identity', dataIndex: 'name', key: 'name', render: (v) => <span className="font-medium text-blue-600">{v}</span> },
        { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', render: (v) => <span className="text-gray-500 font-mono text-xs"><BarcodeOutlined /> {v || '—'}</span> },
        { title: 'Inv Stock', key: 'stock', align: 'right', render: (_, r) => <Tag color="blue" bordered={false}>{(r.ProductStocks || r.inventory || [])?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}</Tag> },
        { title: 'Unit Price', dataIndex: 'price', key: 'price', align: 'right', render: (v) => <span className="text-slate-800">{formatCurrency(v)}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} className="uppercase text-xs">{s || 'ACTIVE'}</Tag> },
        {
            title: 'Act',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined className="text-slate-600" />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}`); }} title="View" />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}/edit`); }} title="Edit" />
                    <Popconfirm title="Delete this product?" description="This cannot be undone." onConfirm={() => handleDelete(r.id)} okText="Delete" okButtonProps={{ danger: true }} cancelText="Cancel">
                        <Button type="text" danger icon={<DeleteOutlined />} title="Delete" />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Products</h1>
                        <p className="text-gray-500 text-sm">Master record of all sellable entities and digital twins</p>
                    </div>
                    <Space size="middle">
                        <Button icon={<UploadOutlined />} onClick={() => navigate('/products/import-export')} className="h-11 px-4 rounded-xl">
                            Import
                        </Button>
                        <Link to="/products/add">
                            <Button type="primary" icon={<PlusOutlined />} size="large" className="h-11 px-6 rounded-xl bg-blue-600 border-blue-600">
                                Add Product
                            </Button>
                        </Link>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl border-none shadow-sm"><div className="text-xs text-slate-500 mb-1">Total SKU Count</div><div className="text-xl text-slate-800">{products.length}</div></Card>
                    <Card className="rounded-xl border-none shadow-sm"><div className="text-xs text-green-600 mb-1">Active Listing</div><div className="text-xl text-slate-800">{products.filter(x => x.status === 'ACTIVE').length}</div></Card>
                    <Card className="rounded-xl border-none shadow-sm"><div className="text-xs text-blue-600 mb-1">Available Units</div><div className="text-xl text-slate-800">{products.reduce((s, p) => s + ((p.ProductStocks || p.inventory || [])?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0)}</div></Card>
                    <Card className="rounded-xl border-none shadow-sm"><div className="text-xs text-indigo-600 mb-1">Portfolio GTV</div><div className="text-xl text-slate-800">{formatCurrency(products.reduce((s, p) => s + ((Number(p.price) || 0) * ((p.ProductStocks || p.inventory || [])?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0)), 0))}</div></Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex gap-4">
                                <Search placeholder="Product ID / Identity Search..." className="w-80 h-12 shadow-sm" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                                <Select placeholder="Category" className="w-48 h-12 rounded-xl" allowClear>
                                    {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </div>
                            <Space>
                                <Button icon={<ReloadOutlined />} onClick={fetchProducts}>Refresh</Button>
                                <Button icon={<UploadOutlined />} onClick={() => navigate('/products/import-export')}>Import</Button>
                            </Space>
                        </div>
                        <Table className="[&_.ant-table-thead_th]:font-normal" columns={columns} dataSource={products.filter(p => !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) || p.sku.toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} />
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}
