import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Tag, Space, Card, Tabs, message, Select, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;

export default function SalesOrders() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchText, setSearchText] = useState('');

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            setOrders(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load orders');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleDeleteOrder = useCallback(async (id) => {
        if (!token) return;
        try {
            await apiRequest(`/api/orders/sales/${id}`, { method: 'DELETE' }, token);
            message.success('Order deleted');
            fetchOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to delete order');
        }
    }, [token, fetchOrders]);

    const filteredOrders = orders.filter((order) => {
        const customerName = order.Customer?.name || order.customer?.name || '';
        const matchesSearch = !searchText ||
            order.orderNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
            customerName.toLowerCase().includes(searchText.toLowerCase());

        const matchesChannel = channelFilter === 'all' ||
            (order.salesChannel?.toUpperCase() || 'DIRECT') === channelFilter.toUpperCase();

        let matchesStatus = true;
        if (activeTab !== 'all') {
            const s = (order.status || '').toUpperCase();
            if (activeTab === 'pending') {
                matchesStatus = ['DRAFT', 'CONFIRMED', 'PICK_LIST_CREATED'].includes(s);
            } else if (activeTab === 'in_progress') {
                matchesStatus = ['PICKING_IN_PROGRESS', 'PICKED', 'PACKING_IN_PROGRESS', 'PACKED'].includes(s);
            } else if (activeTab === 'completed') {
                matchesStatus = ['SHIPPED', 'DELIVERED'].includes(s);
            } else if (activeTab === 'cancelled') {
                matchesStatus = s === 'CANCELLED';
            }
        }
        return matchesSearch && matchesChannel && matchesStatus;
    });

    const columns = [
        { title: 'Order #', dataIndex: 'orderNumber', key: 'orderNumber', render: (v, r) => <Link to={`/sales-orders/${r.id}`} className="font-bold text-blue-600 hover:underline">{v}</Link> },
        { title: 'Customer', key: 'customer', render: (_, r) => (r.Customer?.name || r.customer?.name) || '-' },
        { title: 'Channel', dataIndex: 'salesChannel', key: 'channel', render: (c) => <Tag color="blue" className="uppercase">{c || 'Direct'}</Tag> },
        { title: 'Date', dataIndex: 'orderDate', key: 'orderDate', render: (v, r) => formatDate(v || r.createdAt) },
        { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v) => <span className="font-medium text-slate-800">{formatCurrency(v)}</span> },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} className="uppercase font-bold">{s === 'PICK_LIST_CREATED' ? 'CONFIRMED' : s}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const canEditDelete = ['DRAFT', 'CONFIRMED'].includes((record.status || '').toUpperCase());
                return (
                    <Space onClick={(e) => e.stopPropagation()} role="group">
                        <Button type="text" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${record.id}`); }} title="View" />
                        {canEditDelete && (
                            <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={(e) => { e.stopPropagation(); navigate(`/sales-orders/${record.id}/edit`); }} title="Edit" />
                        )}
                        {canEditDelete && (
                            <Popconfirm title="Delete this order?" onConfirm={() => handleDeleteOrder(record.id)} okText="Yes" cancelText="No">
                                <Button type="text" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} title="Delete" />
                            </Popconfirm>
                        )}
                    </Space>
                );
            }
        }
    ];

    const statusUpper = (s) => (s || '').toUpperCase();
    const tabItems = [
        { key: 'all', label: `All (${orders.length})` },
        { key: 'pending', label: `Pending (${orders.filter(o => ['DRAFT', 'CONFIRMED', 'PICK_LIST_CREATED'].includes(statusUpper(o.status))).length})` },
        { key: 'in_progress', label: `In Progress (${orders.filter(o => ['PICKING_IN_PROGRESS', 'PICKED', 'PACKING_IN_PROGRESS', 'PACKED'].includes(statusUpper(o.status))).length})` },
        { key: 'completed', label: `Completed (${orders.filter(o => ['SHIPPED', 'DELIVERED'].includes(statusUpper(o.status))).length})` },
        { key: 'cancelled', label: `Cancelled (${orders.filter(o => statusUpper(o.status) === 'CANCELLED').length})` },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Sales Orders</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Track and fulfill omni-channel orders across all platforms</p>
                    </div>
                    <Space size="middle">
                        <Button icon={<ReloadOutlined />} onClick={fetchOrders} className="h-10 rounded-lg">Sync Orders</Button>
                        <Link to="/sales-orders/new">
                            <Button type="primary" icon={<PlusOutlined />} size="large" className="h-12 rounded-xl shadow-lg ring-4 ring-indigo-50 bg-indigo-600 border-indigo-600">New Order</Button>
                        </Link>
                    </Space>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white">
                        <div className="text-indigo-600 font-bold text-[10px] uppercase mb-1">Incoming Flow</div>
                        <div className="text-2xl font-black text-slate-800">{orders.length} <span className="text-xs text-indigo-400 font-normal">Active Orders</span></div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-orange-50 to-white">
                        <div className="text-orange-500 font-bold text-[10px] uppercase mb-1">Critical Priority</div>
                        <div className="text-2xl font-black text-slate-800">{orders.filter(o => o.priority === 'HIGH' || o.priority === 'URGENT').length} <span className="text-xs text-orange-400 font-normal">Urgent Items</span></div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-green-50 to-white">
                        <div className="text-green-600 font-bold text-[10px] uppercase mb-1">Delivered Hub</div>
                        <div className="text-2xl font-black text-slate-800">{orders.filter(o => ['SHIPPED', 'DELIVERED'].includes((o.status || '').toUpperCase())).length} <span className="text-xs text-green-400 font-normal">Dispatched</span></div>
                    </Card>
                    <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-blue-50 to-white">
                        <div className="text-blue-600 font-bold text-[10px] uppercase mb-1">Total GMC</div>
                        <div className="text-2xl font-black text-slate-800">{formatCurrency(orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0))}</div>
                    </Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="mb-6 p-4 bg-slate-50 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <Search placeholder="Order# / Customer..." className="max-w-xs h-10 shadow-sm" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                            <Select value={channelFilter} onChange={setChannelFilter} className="w-48 h-10 shadow-sm">
                                <Select.Option value="all">All Channels</Select.Option>
                                <Select.Option value="AMAZON_FBA">Amazon FBA</Select.Option>
                                <Select.Option value="SHOPIFY">Shopify Store</Select.Option>
                                <Select.Option value="EBAY">eBay Global</Select.Option>
                                <Select.Option value="DIRECT">Direct Sales</Select.Option>
                            </Select>
                        </div>
                        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} className="sales-tabs flex-1" />
                    </div>
                    <Table columns={columns} dataSource={filteredOrders} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
                </Card>
            </div>
        </MainLayout>
    );
}
