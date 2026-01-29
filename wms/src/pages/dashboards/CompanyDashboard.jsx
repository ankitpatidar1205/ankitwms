import React, { useEffect, useState, useCallback } from 'react';
import { Card, Row, Col, Spin, message } from 'antd';
import {
    ShopOutlined,
    TeamOutlined,
    HomeOutlined,
    AppstoreOutlined,
    ArrowRightOutlined,
    ShoppingCartOutlined,
    BoxPlotOutlined,
    InboxOutlined,
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
import { formatCurrency } from '../../utils';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function CompanyDashboard() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [chartsLoading, setChartsLoading] = useState(true);
    const [companyStats, setCompanyStats] = useState({
        warehouses: 0,
        users: 0,
        products: 0,
        pendingOrders: 0,
        totalOrders: 0,
        customers: 0,
        lowStockCount: 0,
        pickingPendingCount: 0,
        packingPendingCount: 0,
    });
    const [chartData, setChartData] = useState({
        ordersByDay: [],
        ordersByStatus: [],
        stockByWarehouse: [],
        topProducts: [],
    });

    const fetchStats = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await apiRequest('/api/dashboard/stats', { method: 'GET' }, token);
            const d = res?.data || {};
            setCompanyStats({
                warehouses: d.warehouses ?? 0,
                users: d.users ?? 0,
                products: d.products ?? 0,
                pendingOrders: d.pendingOrders ?? 0,
                totalOrders: d.totalOrders ?? 0,
                customers: d.customers ?? 0,
                lowStockCount: d.lowStockCount ?? 0,
                pickingPendingCount: d.pickingPendingCount ?? 0,
                packingPendingCount: d.packingPendingCount ?? 0,
            });
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchCharts = useCallback(async () => {
        if (!token) return;
        setChartsLoading(true);
        try {
            const res = await apiRequest('/api/dashboard/charts', { method: 'GET' }, token);
            const d = res?.data || {};
            setChartData({
                ordersByDay: Array.isArray(d.ordersByDay) ? d.ordersByDay : [],
                ordersByStatus: Array.isArray(d.ordersByStatus) ? d.ordersByStatus : [],
                stockByWarehouse: Array.isArray(d.stockByWarehouse) ? d.stockByWarehouse : [],
                topProducts: Array.isArray(d.topProducts) ? d.topProducts : [],
            });
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load charts');
        } finally {
            setChartsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
        fetchCharts();
    }, [fetchStats, fetchCharts]);

    const quickLinks = [
        { to: '/users', icon: <TeamOutlined />, label: 'User Management', desc: 'Manage users & access' },
        { to: '/warehouses', icon: <HomeOutlined />, label: 'Warehouses', desc: 'Company warehouses' },
        { to: '/products', icon: <AppstoreOutlined />, label: 'Products', desc: 'Product catalog' },
        { to: '/sales-orders', icon: <ShoppingCartOutlined />, label: 'Sales Orders', desc: 'Orders overview' },
    ];

    const pieData = chartData.ordersByStatus.map((item, i) => ({
        name: (item.status || '').replace(/_/g, ' '),
        value: item.count,
        fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                        <ShopOutlined className="text-blue-500" /> Company Dashboard
                    </h1>
                    <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose mt-1">
                        Overview • Users • Warehouses • Orders
                    </p>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Warehouses" value={companyStats.warehouses} icon={<HomeOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Active Users" value={companyStats.users} icon={<TeamOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Products" value={companyStats.products} icon={<AppstoreOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Pending Orders" value={companyStats.pendingOrders} icon={<ShoppingCartOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Customers" value={companyStats.customers} icon={<TeamOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Picking Pending" value={companyStats.pickingPendingCount} icon={<BoxPlotOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Packing Pending" value={companyStats.packingPendingCount} icon={<InboxOutlined />} />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard title="Low Stock Alerts" value={companyStats.lowStockCount} icon={<AppstoreOutlined />} />
                    </Col>
                </Row>

                <Card title={<span className="font-black uppercase tracking-tight">Quick Links</span>} className="rounded-2xl shadow-sm border-slate-100">
                    <Row gutter={[16, 16]}>
                        {quickLinks.map((link, i) => (
                            <Col xs={24} sm={12} md={6} key={i}>
                                <Link to={link.to}>
                                    <Card size="small" className="rounded-xl border-slate-100 hover:border-blue-300 hover:shadow-md transition-all h-full">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                {link.icon}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{link.label}</div>
                                                <div className="text-xs text-gray-500">{link.desc}</div>
                                            </div>
                                            <ArrowRightOutlined className="text-gray-400 ml-auto" />
                                        </div>
                                    </Card>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* Charts Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <BarChartOutlined /> Charts & Analytics
                    </h2>

                    <Row gutter={[16, 16]}>
                        {/* Orders trend - Area chart */}
                        <Col xs={24} lg={16}>
                            <Card
                                title={<span className="font-bold flex items-center gap-2"><LineChartOutlined /> Orders trend (last 14 days)</span>}
                                className="rounded-2xl shadow-sm border-slate-100"
                                loading={chartsLoading}
                            >
                                {chartData.ordersByDay.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <AreaChart data={chartData.ordersByDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => formatCurrency(v)} />
                                            <Tooltip
                                                formatter={(value, name) => [name === 'totalAmount' ? formatCurrency(value) : value, name === 'totalAmount' ? 'Amount' : 'Orders']}
                                                labelFormatter={(label) => `Date: ${label}`}
                                            />
                                            <Area yAxisId="left" type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#colorOrders)" name="Orders" />
                                            <Area yAxisId="right" type="monotone" dataKey="totalAmount" stroke="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.2)" name="Amount" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[320px] flex items-center justify-center text-gray-400 font-medium">No order data for the last 14 days</div>
                                )}
                            </Card>
                        </Col>

                        {/* Orders by status - Pie */}
                        <Col xs={24} lg={8}>
                            <Card
                                title={<span className="font-bold flex items-center gap-2"><PieChartOutlined /> Orders by status</span>}
                                className="rounded-2xl shadow-sm border-slate-100"
                                loading={chartsLoading}
                            >
                                {pieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={320}>
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {pieData.map((_, index) => (
                                                    <Cell key={index} fill={pieData[index].fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [value, 'Orders']} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[320px] flex items-center justify-center text-gray-400 font-medium">No order status data</div>
                                )}
                            </Card>
                        </Col>

                        {/* Stock by warehouse - Bar */}
                        <Col xs={24} lg={12}>
                            <Card
                                title={<span className="font-bold flex items-center gap-2"><BarChartOutlined /> Stock by warehouse</span>}
                                className="rounded-2xl shadow-sm border-slate-100"
                                loading={chartsLoading}
                            >
                                {chartData.stockByWarehouse.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData.stockByWarehouse} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <YAxis type="category" dataKey="warehouseName" tick={{ fontSize: 12 }} stroke="#94a3b8" width={70} />
                                            <Tooltip formatter={(value) => [value, 'Quantity']} />
                                            <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Quantity" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-gray-400 font-medium">No warehouse stock data</div>
                                )}
                            </Card>
                        </Col>

                        {/* Top products by stock - Bar */}
                        <Col xs={24} lg={12}>
                            <Card
                                title={<span className="font-bold flex items-center gap-2"><AppstoreOutlined /> Top 10 products by stock</span>}
                                className="rounded-2xl shadow-sm border-slate-100"
                                loading={chartsLoading}
                            >
                                {chartData.topProducts.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData.topProducts} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                            <XAxis dataKey="productName" angle={-35} textAnchor="end" height={80} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                                            <Tooltip formatter={(value) => [value, 'Qty']} labelFormatter={(label, payload) => payload?.[0]?.payload?.sku ? `${label} (${payload[0].payload.sku})` : label} />
                                            <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} name="Quantity" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[300px] flex items-center justify-center text-gray-400 font-medium">No product stock data</div>
                                )}
                            </Card>
                        </Col>
                    </Row>
                </div>
            </div>
        </MainLayout>
    );
}
