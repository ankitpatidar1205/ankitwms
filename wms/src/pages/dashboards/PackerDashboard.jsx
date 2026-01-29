import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Progress, Spin, Empty } from 'antd';
import {
    CarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    InboxOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
export default function PackerDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            ordersPackedToday: { value: 0, change: 0, trend: 'up' },
            shipmentsReady: { value: 0, change: 0, trend: 'up' },
            accuracy: { value: 99, change: 0, trend: 'up' },
            avgPackTime: { value: 0, change: 0, trend: 'down' },
        },
        packingQueue: [],
        dailyGoal: 80,
        goalProgress: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, packingRes] = await Promise.all([
                apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                apiRequest('/api/packing', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const list = Array.isArray(packingRes.data) ? packingRes.data : [];
            const queue = list.map((t) => ({
                id: String(t.id),
                orderNumber: t.SalesOrder?.orderNumber || `ORD-${t.salesOrderId}`,
                customer: t.SalesOrder?.Customer?.name || '-',
                priority: t.status === 'packing' ? 'high' : 'medium',
                items: (t.PickList?.PickListItems && t.PickList.PickListItems.length) || 0,
                status: (t.status || 'pending').toUpperCase() === 'PACKING' ? 'PACKING' : 'PENDING',
            }));
            const pendingCount = list.filter((t) => t.status === 'pending' || t.status === 'packing').length;
            const d = statsRes.data || {};
            setData({
                stats: {
                    ordersPackedToday: { value: pendingCount, change: 0, trend: 'up' },
                    shipmentsReady: { value: d.packingPendingCount ?? 0, change: 0, trend: 'up' },
                    accuracy: { value: 99, change: 0, trend: 'up' },
                    avgPackTime: { value: 0, change: 0, trend: 'down' },
                },
                packingQueue: queue,
                dailyGoal: 80,
                goalProgress: Math.min(100, (pendingCount / 80) * 100),
            });
        } catch (_) {
            setData((prev) => ({ ...prev, packingQueue: [] }));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    const columns = [
        {
            title: 'Order #',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            render: (text) => <span className="font-bold text-blue-600">{text}</span>
        },
        { title: 'Customer', dataIndex: 'customer', key: 'customer' },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority) => {
                let color = 'blue';
                if (priority === 'urgent') color = 'red';
                if (priority === 'high') color = 'orange';
                return <Tag color={color} className="uppercase text-[10px] font-bold rounded-full px-3">{priority}</Tag>;
            },
        },
        { title: 'Items', dataIndex: 'items', key: 'items', render: (val) => <span className="font-bold">{val}</span> },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'PACKING' ? 'processing' : 'default'} className="rounded-full px-3">
                    {status === 'PACKING' ? 'Packing' : 'Pending'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Link to={`/packing/${record.id}`}>
                    <Button type="primary" size="small" className="rounded-lg">
                        {record.status === 'PACKING' ? 'Continue' : 'Start'}
                    </Button>
                </Link>
            ),
        },
    ];

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Packaging Terminal</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Final verification, package synthesis, and shipping logistcs for {user?.name || 'Operator'}</p>
                    </div>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => fetchData()}
                        loading={loading}
                        className="rounded-lg"
                    >
                        Refresh Queue
                    </Button>
                </div>

                {/* KPI Cards */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Orders Packed"
                            value={data.stats.ordersPackedToday.value}
                            change={data.stats.ordersPackedToday.change}
                            trend={data.stats.ordersPackedToday.trend}
                            icon={<InboxOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Shipments Ready"
                            value={data.stats.shipmentsReady.value}
                            change={data.stats.shipmentsReady.change}
                            trend={data.stats.shipmentsReady.trend}
                            icon={<CarOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Packing Accuracy"
                            value={data.stats.accuracy.value}
                            change={data.stats.accuracy.change}
                            trend={data.stats.accuracy.trend}
                            icon={<CheckCircleOutlined />}
                            suffix="%"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Avg Pack Time"
                            value={data.stats.avgPackTime.value}
                            change={data.stats.avgPackTime.change}
                            trend={data.stats.avgPackTime.trend}
                            icon={<ClockCircleOutlined />}
                            suffix="min"
                        />
                    </Col>
                </Row>

                {/* Packing Queue */}
                <Card
                    title={<span className="font-bold text-gray-700">Packing Assignments</span>}
                    className="shadow-sm rounded-xl border-gray-100"
                    extra={<Tag color="purple" className="rounded-full px-3 font-bold">{data.packingQueue.length} Orders</Tag>}
                >
                    {data.packingQueue.length > 0 ? (
                        <Table
                            dataSource={data.packingQueue}
                            columns={columns}
                            rowKey="id"
                            pagination={false}
                            size="middle"
                        />
                    ) : (
                        <Empty
                            description="No orders waiting to be packed."
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Card>

                {/* Action Panel */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-gray-700">Daily Progress</span>} className="shadow-sm rounded-xl border-gray-100 h-full">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-gray-500 font-medium text-sm">Target: {data.dailyGoal} Orders</span>
                                    <span className="font-bold text-purple-600">{data.stats.ordersPackedToday.value} Packed</span>
                                </div>
                                <Progress
                                    percent={data.goalProgress}
                                    status={data.goalProgress >= 100 ? 'success' : 'active'}
                                    strokeColor={{ '0%': '#722ed1', '100%': '#52c41a' }}
                                    strokeWidth={12}
                                />
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-gray-700">Quick Actions</span>} className="shadow-sm rounded-xl border-gray-100 h-full">
                            <div className="grid grid-cols-2 gap-4">
                                <Link to="/packing" className="col-span-1">
                                    <Button block size="large" type="primary" className="rounded-lg h-12 bg-purple-600 font-bold border-none hover:bg-purple-700">
                                        Packing List
                                    </Button>
                                </Link>
                                <Link to="/shipments" className="col-span-1">
                                    <Button block size="large" className="rounded-lg h-12 font-bold border-purple-200 text-purple-600">
                                        Shipments
                                    </Button>
                                </Link>
                                <Button block size="large" className="rounded-lg h-12 text-gray-400" disabled>Reprint Docs</Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
