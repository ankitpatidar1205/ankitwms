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
            ordersPickedToday: { value: 0, change: 0, trend: 'up' },
            itemsPicked: { value: 0, change: 0, trend: 'up' },
            accuracy: { value: 99, change: 0, trend: 'up' },
            avgPickTime: { value: 0, change: 0, trend: 'down' },
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
                orderNumber: pl.SalesOrder?.orderNumber || `ORD-${pl.salesOrderId}`,
                pickListNumber: `PL-${pl.id}`,
                priority: pl.status === 'in_progress' ? 'high' : 'medium',
                items: (pl.PickListItems && pl.PickListItems.length) || 0,
                zone: pl.Warehouse?.name || '-',
                estimatedTime: '-',
                status: (pl.status || 'pending').toUpperCase().replace('_', '_'),
            }));
            const pendingCount = list.filter((pl) => pl.status === 'pending' || pl.status === 'in_progress').length;
            setData({
                stats: {
                    ordersPickedToday: { value: pendingCount, change: 0, trend: 'up' },
                    itemsPicked: { value: list.reduce((acc, pl) => acc + ((pl.PickListItems && pl.PickListItems.length) || 0), 0), change: 0, trend: 'up' },
                    accuracy: { value: 99, change: 0, trend: 'up' },
                    avgPickTime: { value: 0, change: 0, trend: 'down' },
                },
                pickingQueue: queue,
                dailyGoal: 50,
                goalProgress: Math.min(100, (pendingCount / 50) * 100),
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
            render: (text, record) => (
                <div>
                    <div className="font-medium text-blue-600">{text}</div>
                    <div className="text-xs text-gray-500">{record.pickListNumber}</div>
                </div>
            )
        },
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
            title: 'Zone',
            dataIndex: 'zone',
            key: 'zone',
            render: (zone) => <Tag color="cyan" className="font-medium">{zone}</Tag>
        },
        { title: 'Est. Time', dataIndex: 'estimatedTime', key: 'estimatedTime', render: (val) => <span className="text-gray-500">{val}</span> },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'IN_PROGRESS' ? 'processing' : 'default'} className="rounded-full px-3">
                    {status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
                </Tag>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Link to={`/picking/${record.id}`}>
                    <Button type="primary" size="small" className="rounded-lg">
                        {record.status === 'IN_PROGRESS' ? 'Continue' : 'Start'}
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
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Orders Picked Today"
                            value={data.stats.ordersPickedToday.value}
                            change={data.stats.ordersPickedToday.change}
                            trend={data.stats.ordersPickedToday.trend}
                            icon={<ShoppingCartOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Items Picked"
                            value={data.stats.itemsPicked.value}
                            change={data.stats.itemsPicked.change}
                            trend={data.stats.itemsPicked.trend}
                            icon={<CheckCircleOutlined />}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Accuracy Rate"
                            value={data.stats.accuracy.value}
                            change={data.stats.accuracy.change}
                            trend={data.stats.accuracy.trend}
                            icon={<TrophyOutlined />}
                            suffix="%"
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <KPICard
                            title="Avg Pick Time"
                            value={data.stats.avgPickTime.value}
                            change={data.stats.avgPickTime.change}
                            trend={data.stats.avgPickTime.trend}
                            icon={<ClockCircleOutlined />}
                            suffix="min"
                        />
                    </Col>
                </Row>

                {/* Picking Queue */}
                <Card
                    title={<span className="font-bold text-gray-700">Assignments Queue</span>}
                    className="shadow-sm rounded-xl border-gray-100"
                    extra={
                        <Tag color={data.pickingQueue.length > 0 ? 'blue' : 'green'} className="rounded-full px-3 font-bold">
                            {data.pickingQueue.length} Pending
                        </Tag>
                    }
                >
                    {data.pickingQueue.length > 0 ? (
                        <Table
                            dataSource={data.pickingQueue}
                            columns={columns}
                            rowKey="id"
                            pagination={false}
                            size="middle"
                        />
                    ) : (
                        <Empty
                            description="No pending pick lists. Great job!"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    )}
                </Card>

                {/* Performance Summary */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-gray-700">Goals & Targets</span>} className="shadow-sm rounded-xl border-gray-100 h-full">
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-500 font-medium text-sm">Daily Goal Progress</span>
                                        <span className="font-bold text-blue-600">{data.stats.ordersPickedToday.value} / {data.dailyGoal} orders</span>
                                    </div>
                                    <Progress
                                        percent={data.goalProgress}
                                        status={data.goalProgress >= 100 ? 'success' : 'active'}
                                        strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
                                        strokeWidth={10}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-500 font-medium text-sm">Accuracy Target</span>
                                        <span className="font-bold text-green-600">{data.stats.accuracy.value}% / 98%</span>
                                    </div>
                                    <Progress
                                        percent={Math.min(100, (data.stats.accuracy.value / 98) * 100)}
                                        status={data.stats.accuracy.value >= 98 ? 'success' : 'normal'}
                                        strokeWidth={10}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-bold text-gray-700">Actions</span>} className="shadow-sm rounded-xl border-gray-100 h-full">
                            <div className="grid grid-cols-2 gap-4">
                                <Link to="/picking" className="col-span-2">
                                    <Button block size="large" type="primary" className="rounded-lg h-12 font-bold shadow-md">
                                        View All Pick Lists
                                    </Button>
                                </Link>
                                <Button block size="large" className="rounded-lg h-12 text-gray-400" disabled>Report Issue</Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </MainLayout>
    );
}
