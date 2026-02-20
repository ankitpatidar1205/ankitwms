import React, { useState, useEffect, useCallback } from 'react';
import { Table, Card, Tag, Button, Statistic, Row, Col, Progress, message, Tooltip, Avatar } from 'antd';
import { ReloadOutlined, ThunderboltOutlined, ShoppingCartOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatCurrency } from '../utils';

// Helper for status colors
const getStatusColor = (status) => {
    switch (status) {
        case 'CRITICAL': return 'red';
        case 'LOW': return 'gold';
        case 'HEALTHY': return 'green';
        default: return 'default';
    }
};

const getStatusLabel = (status) => {
    switch (status) {
        case 'CRITICAL': return 'Stockout Risk';
        case 'LOW': return 'Low Stock';
        case 'HEALTHY': return 'Healthy';
        default: return status;
    }
};

export default function Predictions() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [stats, setStats] = useState({ critical: 0, low: 0, healthy: 0, total: 0 });

    const fetchData = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/predictions', { method: 'GET' }, token);
            const list = Array.isArray(res?.data) ? res.data : [];
            setData(list);

            // Calculate stats
            const s = { critical: 0, low: 0, healthy: 0, total: list.length };
            list.forEach(item => {
                if (item.status === 'CRITICAL') s.critical++;
                else if (item.status === 'LOW') s.low++;
                else s.healthy++;
            });
            setStats(s);
        } catch (err) {
            message.error(err?.message || 'Failed to load predictions');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const columns = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
            width: 250,
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <Avatar shape="square" size={40} src={record.image} icon={<ShoppingCartOutlined />} className="bg-blue-50 text-blue-500" />
                    <div>
                        <div className="font-medium text-slate-800">{text}</div>
                        <div className="text-xs text-gray-500">{record.sku}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Current Stock',
            dataIndex: 'currentStock',
            key: 'currentStock',
            align: 'right',
            width: 120,
            render: (val) => <span className="font-semibold text-slate-700">{val}</span>
        },
        {
            title: 'Velocity (30d)',
            dataIndex: 'velocity',
            key: 'velocity',
            align: 'right',
            width: 140,
            render: (val) => (
                <Tooltip title={`${val} units per day (avg)`}>
                    <div className="flex items-center justify-end gap-1 text-slate-600">
                        <ThunderboltOutlined className="text-amber-500" />
                        <span>{val}/day</span>
                    </div>
                </Tooltip>
            )
        },
        {
            title: 'Est. Days Left',
            dataIndex: 'daysUntilStockout',
            key: 'daysUntilStockout',
            align: 'right',
            width: 140,
            render: (val, record) => {
                if (val >= 9999) return <span className="text-gray-400">Infinity</span>;
                let color = 'text-green-600';
                if (record.status === 'CRITICAL') color = 'text-red-600 font-bold';
                else if (record.status === 'LOW') color = 'text-amber-600 font-medium';
                
                return <span className={color}>{val} days</span>;
            }
        },
        {
            title: 'Suggested Reorder',
            dataIndex: 'suggestedReorder',
            key: 'suggestedReorder',
            align: 'right',
            width: 160,
            render: (val) => (
                val > 0 ? (
                    <Tag color="blue" className="px-2 py-0.5 rounded-md font-medium text-sm border-blue-200 bg-blue-50 text-blue-700 m-0">
                        + {val} units
                    </Tag>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                )
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status) => (
                <Tag color={getStatusColor(status)} className="font-medium">
                    {getStatusLabel(status)}
                </Tag>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Smart Reorder System</h1>
                        <p className="text-gray-500 text-sm mt-1">AI-driven predictions based on sales velocity and stock levels</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} className="h-10 rounded-lg">
                        Refresh Analysis
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <Statistic 
                            title="Critical Stockouts" 
                            value={stats.critical} 
                            valueStyle={{ color: '#ef4444', fontWeight: 'bold' }} 
                            prefix={<SafetyCertificateOutlined />} 
                        />
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <Statistic 
                            title="Low Stock Risk" 
                            value={stats.low} 
                            valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }} 
                            prefix={<SafetyCertificateOutlined />} 
                        />
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                        <Statistic 
                            title="Healthy Stock" 
                            value={stats.healthy} 
                            valueStyle={{ color: '#22c55e', fontWeight: 'bold' }} 
                            prefix={<SafetyCertificateOutlined />} 
                        />
                    </Card>
                    <Card className="rounded-xl border border-gray-100 shadow-sm">
                         <div className="flex flex-col h-full justify-between">
                            <div className="text-gray-500 mb-1">Stock Health Score</div>
                            <Progress 
                                percent={Math.round((stats.healthy / (stats.total || 1)) * 100)} 
                                strokeColor={{ '0%': '#ef4444', '100%': '#22c55e' }}
                                showInfo={true}
                                size="small"
                            />
                         </div>
                    </Card>
                </div>

                <Card className="rounded-xl border border-gray-100 shadow-sm overflow-hidden" title="Reorder Recommendations">
                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 20, showSizeChanger: true }}
                        className="[&_.ant-table-thead_th]:bg-gray-50 [&_.ant-table-thead_th]:font-medium [&_.ant-table-thead_th]:text-slate-600"
                        size="small"
                        scroll={{ x: 1000 }}
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
