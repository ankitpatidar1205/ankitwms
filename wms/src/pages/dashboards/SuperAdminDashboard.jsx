import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Tag, message } from 'antd';
import {
    ShopOutlined,
    TeamOutlined,
    ShoppingCartOutlined,
    DollarOutlined,
    SafetyCertificateOutlined,
    BarChartOutlined,
    SettingOutlined,
    CrownOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const recentActivity = [
    { key: '1', action: 'New company registered: Acme Corp', time: '2 mins ago', type: 'info' },
    { key: '2', action: 'User login failed (3 attempts) - user_xyz', time: '15 mins ago', type: 'warning' },
    { key: '3', action: 'System backup completed', time: '1 hour ago', type: 'success' },
];

export default function SuperAdminDashboard() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCompanies: 0,
        activeUsers: 0,
        totalOrders: 0,
        totalWarehouses: 0,
        systemHealth: 'Healthy',
    });

    const fetchStats = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/superadmin/stats', { method: 'GET' }, token);
            setStats(data.data || { totalCompanies: 0, activeUsers: 0, totalOrders: 0, totalWarehouses: 0, systemHealth: 'Healthy' });
        } catch (err) {
            message.error(err.message || 'Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);
    const quickLinks = [
        { to: '/companies', icon: <ShopOutlined />, label: 'Company Management', desc: 'List, Add, Edit, Activate companies' },
        { to: '/users', icon: <TeamOutlined />, label: 'User Management', desc: 'Company Admins, Reset Password, Lock/Unlock' },
        { to: '/reports', icon: <BarChartOutlined />, label: 'Reports', desc: 'Company-wise usage, orders, storage' },
        { to: '/settings', icon: <SettingOutlined />, label: 'System Settings', desc: 'Global config, Email/SMS templates' },
        { to: '/settings', icon: <SafetyCertificateOutlined />, label: 'Security & Logs', desc: 'Login history, Activity logs' },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
                            <CrownOutlined className="text-amber-500" /> Super Admin
                        </h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose mt-1">
                            System-wide overview • All companies • Global controls
                        </p>
                    </div>
                </div>

                {/* KPI Row */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Companies"
                            value={loading ? '—' : stats.totalCompanies}
                            icon={<ShopOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Active Users"
                            value={loading ? '—' : stats.activeUsers}
                            icon={<TeamOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Total Orders (All)"
                            value={loading ? '—' : stats.totalOrders}
                            icon={<ShoppingCartOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Warehouses"
                            value={loading ? '—' : stats.totalWarehouses}
                            icon={<DollarOutlined />}
                        />
                    </Col>
                </Row>

                {/* System Health */}
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <SafetyCertificateOutlined className="text-2xl text-green-600" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-gray-500 uppercase">System Health</div>
                                <div className="text-xl font-black text-green-600">{stats.systemHealth}</div>
                            </div>
                        </div>
                        <Tag color="green" className="text-sm font-bold">All systems operational</Tag>
                    </div>
                </Card>

                {/* Quick Links - Core Modules */}
                <Card title={<span className="font-black uppercase tracking-tight">Quick Access</span>} className="rounded-2xl shadow-sm border-slate-100">
                    <Row gutter={[16, 16]}>
                        {quickLinks.map((link, i) => (
                            <Col xs={24} sm={12} md={8} key={i}>
                                <Link to={link.to}>
                                    <Card size="small" className="rounded-xl border-slate-100 hover:border-blue-300 hover:shadow-md transition-all h-full">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                    {link.icon}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800">{link.label}</div>
                                                    <div className="text-xs text-gray-500">{link.desc}</div>
                                                </div>
                                            </div>
                                            <ArrowRightOutlined className="text-gray-400" />
                                        </div>
                                    </Card>
                                </Link>
                            </Col>
                        ))}
                    </Row>
                </Card>

                {/* Activity / Logs */}
                <Card title={<span className="font-black uppercase tracking-tight">Recent Activity / Logs</span>} className="rounded-2xl shadow-sm border-slate-100">
                    <Table
                        dataSource={recentActivity}
                        columns={[
                            { title: 'Action', dataIndex: 'action', key: 'action', render: (t, r) => <span className="font-medium">{t}</span> },
                            { title: 'Time', dataIndex: 'time', key: 'time', width: 120 },
                            {
                                title: '',
                                key: 'type',
                                render: (_, r) => (
                                    <Tag color={r.type === 'success' ? 'green' : r.type === 'warning' ? 'orange' : 'blue'}>
                                        {r.type}
                                    </Tag>
                                ),
                            },
                        ]}
                        pagination={false}
                        size="small"
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
