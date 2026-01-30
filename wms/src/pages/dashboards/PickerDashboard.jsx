import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, Row, Col, Progress, Spin, Empty } from 'antd';
import {
    ShoppingCartOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { MainLayout } from '../../components/layout/MainLayout';
import { KPICard } from '../../components/ui/KPICard';
export default function PickerDashboard() {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        stats: {
            pending: { value: 0, change: 0, trend: 'neutral' },
            complete: { value: 0, change: 0, trend: 'up' },
            issue: { value: 0, change: 0, trend: 'flat' },
        },
        pickingQueue: [],
        dailyGoal: 50,
        goalProgress: 0,
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, pickingRes] = await Promise.all([
                apiRequest('/api/dashboard/stats', { method: 'GET' }, token),
                apiRequest('/api/picking', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);

            const list = Array.isArray(pickingRes.data) ? pickingRes.data : [];
            const queue = list.map((pl) => ({
                id: String(pl.id),
                orderNumber: pl.SalesOrder?.orderNumber ? (pl.SalesOrder.orderNumber.split('-').length === 3 ? `ORD-${pl.SalesOrder.orderNumber.split('-')[2]}` : pl.SalesOrder.orderNumber) : '—',
                customer: pl.SalesOrder?.Customer?.name || '-',
                priority: pl.status === 'in_progress' ? 'high' : 'medium',
                items: (pl.PickListItems && pl.PickListItems.length) || 0,
                status: (pl.status || 'pending').toUpperCase().replace('_', ' '),
            }));

            const pendingCount = list.filter((pl) => ['PENDING', 'IN_PROGRESS', 'ASSIGNED'].includes((pl.status || '').toUpperCase())).length;
            const completedCount = list.filter((pl) => ['PICKED', 'COMPLETED'].includes((pl.status || '').toUpperCase())).length;

            const d = statsRes.data || {};
            // Prefer stats if available, else derived
            const pickedToday = d.ordersPickedToday ?? completedCount;

            const totalOrders = pendingCount + pickedToday;
            const progressPercent = totalOrders > 0 ? Math.round((pickedToday / totalOrders) * 100) : 0;

            setData({
                stats: {
                    pending: { value: pendingCount, change: 0, trend: 'neutral' },
                    complete: { value: pickedToday, change: 0, trend: 'up' },
                    issue: { value: 0, change: 0, trend: 'flat' },
                },
                pickingQueue: queue, // Show ALL
                dailyGoal: totalOrders,
                goalProgress: progressPercent,
            });
        } catch (_) {
            setData((prev) => ({ ...prev, pickingQueue: [] }));
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
            render: (status) => {
                let color = 'default';
                let label = status;
                if (status === 'IN PROGRESS') { color = 'processing'; label = 'In Progress'; }
                if (['PICKED', 'COMPLETED'].includes(status)) { color = 'success'; label = 'Picked'; }

                return (
                    <Tag color={color} className="rounded-full px-3 font-bold">
                        {label}
                    </Tag>
                );
            },
        }
    ];

    if (loading) return <MainLayout><div className="flex justify-center items-center min-h-[200px]"><Spin size="large" /></div></MainLayout>;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Velocity Hub: Picker</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Mission-critical fulfillment orders and pick-velocity telemetry for {user?.name || 'Operator'}</p>
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
                    <Col xs={24} sm={8}>
                        <KPICard
                            title="Pending Picks"
                            value={data.stats.pending.value}
                            change={data.stats.pending.change}
                            trend={data.stats.pending.trend}
                            icon={<ClockCircleOutlined />}
                            color="orange"
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <KPICard
                            title="Picked Today"
                            value={data.stats.complete.value}
                            change={data.stats.complete.change}
                            trend={data.stats.complete.trend}
                            icon={<CheckCircleOutlined />}
                            color="green"
                        />
                    </Col>
                    <Col xs={24} sm={8}>
                        <KPICard
                            title="Issues"
                            value={data.stats.issue.value}
                            change={data.stats.issue.change}
                            trend={data.stats.issue.trend}
                            icon={<ReloadOutlined />}
                            color="red"
                        />
                    </Col>
                </Row>

                {/* Table & Progress */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={16}>
                        <Card
                            title={<span className="font-bold text-gray-700">Assignments Queue</span>}
                            className="shadow-sm rounded-xl border-gray-100 h-full"
                            extra={
                                <Tag color="purple" className="rounded-full px-3 font-bold">
                                    {data.pickingQueue.length} Orders
                                </Tag>
                            }
                        >
                            {data.pickingQueue.length > 0 ? (
                                <Table
                                    dataSource={data.pickingQueue}
                                    columns={columns}
                                    rowKey="id"
                                    pagination={{ pageSize: 8 }}
                                    size="middle"
                                />
                            ) : (
                                <Empty
                                    description="No pending pick lists. Great job!"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <div className="flex flex-col gap-6 h-full">
                            <Card title={<span className="font-bold text-gray-700">Daily Progress</span>} className="shadow-sm rounded-xl border-gray-100">
                                <div className="text-center py-4">
                                    <Progress
                                        type="dashboard"
                                        percent={data.goalProgress}
                                        strokeColor={data.goalProgress >= 100 ? '#52c41a' : '#1890ff'}
                                        gapDegree={60}
                                        strokeWidth={10}
                                        format={(percent) => (
                                            <div className="flex flex-col items-center">
                                                <span className="text-3xl font-black text-slate-800">{percent}%</span>
                                                <span className="text-[10px] uppercase font-bold text-gray-400">Velocity</span>
                                            </div>
                                        )}
                                    />
                                    <div className="mt-4 flex justify-between px-4 text-xs font-bold uppercase text-gray-500">
                                        <span>Done: {data.stats.complete.value}</span>
                                        <span>Total: {data.dailyGoal}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
