import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, message } from 'antd';
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
            message.error(err.message || 'Failed to load products');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

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
        { title: 'MASTER SKU', dataIndex: 'sku', key: 'sku', render: (v, r) => <Link to={`/products/${r.id}`} className="font-black text-indigo-600 tracking-tighter hover:underline">{v}</Link> },
        { title: 'PRODUCT IDENTITY', dataIndex: 'name', key: 'name', render: (v) => <span className="font-heavy text-slate-800 tracking-tight">{v}</span> },
        { title: 'BARCODE', dataIndex: 'barcode', key: 'barcode', render: (v) => <span className="text-gray-400 font-mono text-[10px]"><BarcodeOutlined /> {v || '---'}</span> },
        { title: 'INV STOCK', key: 'stock', align: 'right', render: (_, r) => <Tag color="blue" bordered={false} className="font-bold">{(r.ProductStocks || r.inventory || [])?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}</Tag> },
        { title: 'UNIT PRICE', dataIndex: 'price', key: 'price', align: 'right', render: (v) => <span className="font-bold text-slate-900">{formatCurrency(v)}</span> },
        { title: 'STATUS', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} className="uppercase font-extrabold text-[10px]">{s || 'ACTIVE'}</Tag> },
        {
            title: 'ACT',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined className="text-slate-600" />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}`); }} title="View" />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={(e) => { e.stopPropagation(); navigate(`/products/${r.id}/edit`); }} title="Edit" />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Products</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Master record of all sellable entities and digital twins</p>
                    </div>
                    <Link to="/products/add">
                        <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-slate-200">
                            Add Product
                        </Button>
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total SKU Count</div><div className="text-3xl font-black">{products.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Active Listing</div><div className="text-3xl font-black">{products.filter(x => x.status === 'ACTIVE').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Available Units</div><div className="text-3xl font-black">{products.reduce((s, p) => s + ((p.ProductStocks || p.inventory || [])?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0)}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Portfolio GTV</div><div className="text-3xl font-black">{formatCurrency(products.reduce((s, p) => s + ((Number(p.price) || 0) * ((p.ProductStocks || p.inventory || [])?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0)), 0))}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <div className="flex gap-4">
                                <Search placeholder="Product ID / Identity Search..." className="w-80 h-12 shadow-sm" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                                <Select placeholder="Category" className="w-48 h-12 rounded-xl" allowClear>
                                    {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                                </Select>
                            </div>
                            <Button icon={<ReloadOutlined />} onClick={fetchProducts} />
                        </div>
                        <Table columns={columns} dataSource={products.filter(p => !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) || p.sku.toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} />
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}
