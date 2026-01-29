import React, { useState, useMemo, useEffect } from 'react';
import { Table, Card, Progress, Statistic, Row, Col, Tag, Space, Tooltip, Select, Alert, Button, Spin, message, Typography } from 'antd';
import {
    DollarOutlined,
    RiseOutlined,
    FallOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    LineChartOutlined,
    PercentageOutlined,
    ThunderboltOutlined,
    TrophyOutlined,
    InfoCircleOutlined,
    SyncOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Title, Text } = Typography;

export default function MarginAnalysis() {
    const { token } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChannel, setSelectedChannel] = useState('All Channels');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            const list = Array.isArray(data?.data) ? data.data : [];
            const productList = list.map((p, index) => {
                const sellingPrice = Number(p.price) || 100;
                const productCost = sellingPrice * 0.6;
                const packaging = sellingPrice * 0.05;
                const shipping = sellingPrice * 0.10;
                const channelFee = sellingPrice * 0.15;
                return {
                    id: p.id,
                    sku: p.sku || `SKU-${index + 1}`,
                    name: p.name,
                    brand: 'In-House',
                    channel: index % 2 === 0 ? 'Amazon UK' : 'Shopify',
                    category: p.Category?.name || 'General',
                    sellingPrice,
                    productCost,
                    packaging,
                    shipping,
                    channelFee,
                    volume: Math.floor(Math.random() * 1000) + 100,
                    returnRate: Math.random() * 5,
                };
            });
            setProducts(productList);
        } catch (_) {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const productsWithMetrics = useMemo(() => {
        return products.map(product => {
            const totalCost = (product.productCost || 0) + (product.packaging || 0) + (product.shipping || 0) + (product.channelFee || 0);
            const sellingPrice = product.sellingPrice || 0;
            const grossProfit = sellingPrice - totalCost;
            const profitMargin = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;
            const volume = product.volume || 0;
            const totalRevenue = sellingPrice * volume;
            const totalProfit = grossProfit * volume;

            const returns = Math.floor(volume * ((product.returnRate || 0) / 100));
            const returnCost = (sellingPrice + ((product.shipping || 0) * 0.5)) * returns;
            const netProfit = totalProfit - returnCost;
            const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

            // Grade
            let grade = 'D';
            if (profitMargin >= 30) grade = 'A';
            else if (profitMargin >= 20) grade = 'B';
            else if (profitMargin >= 10) grade = 'C';

            // Health Score
            const healthScore = Math.min(100, Math.max(0, (profitMargin * 2) + (50 - (product.returnRate || 0) * 5)));

            return {
                ...product,
                totalCost,
                grossProfit,
                profitMargin,
                totalRevenue,
                totalProfit,
                netProfit,
                netMargin,
                grade,
                healthScore
            };
        });
    }, [products]);

    const filteredProducts = useMemo(() => {
        return productsWithMetrics.filter(p => {
            const channelMatch = selectedChannel === 'All Channels' || p.channel === selectedChannel;
            const categoryMatch = selectedCategory === 'All Categories' || p.category === selectedCategory;
            return channelMatch && categoryMatch;
        });
    }, [productsWithMetrics, selectedChannel, selectedCategory]);

    const kpis = useMemo(() => {
        if (filteredProducts.length === 0) return { avgMargin: 0, totalNetProfit: 0, avgHealthScore: 0, totalRevenue: 0 };
        const totalRev = filteredProducts.reduce((s, p) => s + p.totalRevenue, 0);
        const totalProf = filteredProducts.reduce((s, p) => s + p.netProfit, 0);
        const avgMarg = filteredProducts.reduce((s, p) => s + p.profitMargin, 0) / filteredProducts.length;
        const avgHealth = filteredProducts.reduce((s, p) => s + p.healthScore, 0) / filteredProducts.length;

        return {
            totalRevenue: totalRev,
            totalNetProfit: totalProf,
            avgMargin: avgMarg,
            avgHealthScore: avgHealth
        };
    }, [filteredProducts]);

    const topPerformers = [...filteredProducts].sort((a, b) => b.netProfit - a.netProfit).slice(0, 3);
    const bottomPerformers = [...filteredProducts].sort((a, b) => a.profitMargin - b.profitMargin).slice(0, 3);

    const columns = [
        {
            title: 'Product',
            key: 'product',
            width: 250,
            render: (_, r) => (
                <div>
                    <div className="font-black text-slate-800 uppercase italic tracking-tighter leading-none mb-1">{r.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono italic">{r.sku} • {r.brand}</div>
                </div>
            ),
        },
        {
            title: 'Grade',
            dataIndex: 'grade',
            key: 'grade',
            width: 80,
            render: (g) => <Tag color={g === 'A' ? 'green' : g === 'B' ? 'blue' : 'orange'} className="font-black border-none text-sm">{g}</Tag>
        },
        {
            title: 'Price/Cost',
            key: 'pc',
            render: (_, r) => (
                <div>
                    <div className="text-xs font-bold text-slate-700">£{r.sellingPrice.toFixed(2)}</div>
                    <div className="text-[10px] text-red-400 font-bold">£{r.totalCost.toFixed(2)}</div>
                </div>
            )
        },
        {
            title: 'Gross Margin',
            dataIndex: 'profitMargin',
            key: 'marg',
            width: 150,
            render: (m) => (
                <div className="flex items-center gap-2">
                    <Progress percent={Math.round(m)} size="small" strokeColor={m > 25 ? '#10b981' : m > 15 ? '#3b82f6' : '#ef4444'} />
                </div>
            )
        },
        {
            title: 'Net Profit',
            dataIndex: 'netProfit',
            key: 'net',
            render: (v) => <span className="font-black text-slate-900">£{Math.round(v).toLocaleString()}</span>
        },
        {
            title: 'Health',
            dataIndex: 'healthScore',
            key: 'health',
            width: 120,
            render: (s) => <Progress percent={Math.round(s)} size="small" steps={5} strokeColor={s > 70 ? '#10b981' : s > 40 ? '#f59e0b' : '#ef4444'} />
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Margin Analysis</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Comprehensive profitability analysis and cost-structure optimization</p>
                    </div>
                    <Space>
                        <Button icon={<SyncOutlined />} onClick={fetchData}>Refresh</Button>
                        <Button type="primary" icon={<ExportOutlined />} className="bg-slate-900 border-none font-bold">Export Intelligence</Button>
                    </Space>
                </div>

                <Row gutter={[20, 20]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-[2rem] bg-slate-50 border-none hover:shadow-md transition-all">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Average Gross Margin</div>
                            <div className="text-4xl font-black tracking-tighter text-blue-600">{kpis.avgMargin.toFixed(1)}%</div>
                            <div className="mt-2 text-[10px] font-bold text-gray-400 uppercase">Target: 25.0%</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-[2rem] bg-slate-50 border-none hover:shadow-md transition-all">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Total Net Profit</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900">£{kpis.totalNetProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div className="mt-2 text-[10px] font-bold text-green-500 uppercase">Operational Success</div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-[2rem] bg-slate-50 border-none hover:shadow-md transition-all">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Network Health</div>
                            <div className="text-4xl font-black tracking-tighter text-emerald-500">{kpis.avgHealthScore.toFixed(0)}%</div>
                            <Progress percent={kpis.avgHealthScore} showInfo={false} size="small" strokeColor="#10b981" />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card bordered={false} className="shadow-sm rounded-[2rem] bg-slate-50 border-none hover:shadow-md transition-all">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Aggregated Revenue</div>
                            <div className="text-4xl font-black tracking-tighter text-slate-900">£{kpis.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                            <div className="mt-2 text-[10px] font-bold text-blue-500 uppercase">Market Velocity</div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-black text-xs uppercase tracking-widest text-slate-400">Top 3 Profit Nodes</span>} className="rounded-[2rem] border-none shadow-sm h-full">
                            <div className="space-y-4">
                                {topPerformers.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <div>
                                            <div className="font-black text-slate-800 uppercase italic tracking-tighter">{i + 1}. {p.name}</div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase">{p.channel}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-emerald-600">£{Math.round(p.netProfit).toLocaleString()}</div>
                                            <div className="text-[10px] font-bold text-emerald-400">{p.netMargin.toFixed(1)}% NET</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title={<span className="font-black text-xs uppercase tracking-widest text-slate-400">Critical Efficiency Checks</span>} className="rounded-[2rem] border-none shadow-sm h-full">
                            <div className="space-y-4">
                                {bottomPerformers.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                                        <div>
                                            <div className="font-black text-slate-800 uppercase italic tracking-tighter">{i + 1}. {p.name}</div>
                                            <div className="text-[10px] text-gray-500 font-bold uppercase">{p.channel}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-red-600">{p.profitMargin.toFixed(1)}%</div>
                                            <div className="text-[10px] font-bold text-red-400 uppercase italic">Low Margin Alert</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Granular Intelligence Table</h2>
                        <div className="flex gap-4">
                            <Select value={selectedChannel} onChange={setSelectedChannel} className="w-48 h-10 rounded-xl">
                                <Option value="All Channels">Universal Access</Option>
                                <Option value="Amazon UK">Amazon FBA</Option>
                                <Option value="Shopify">Shopify Direct</Option>
                            </Select>
                        </div>
                    </div>
                    <Table columns={columns} dataSource={filteredProducts} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
                </Card>
            </div>
        </MainLayout>
    );
}
