import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm, Spin, Alert, Typography, Tabs, Row, Col, Badge, Divider, InputNumber } from 'antd';
import { PlusOutlined, ReloadOutlined, ApiOutlined, CheckCircleOutlined, WarningOutlined, ShopOutlined, SyncOutlined, LinkOutlined, PoweroffOutlined, KeyOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { mockMarketplaceConnections } from '../../mockData';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;



const MARKETPLACE_TYPES = [
    { id: 'AMAZON_FBA', name: 'Amazon FBA', color: '#FF9900' },
    { id: 'AMAZON_MFN', name: 'Amazon MFN', color: '#FF9900' },
    { id: 'SHOPIFY', name: 'Shopify', color: '#96BF48' },
    { id: 'EBAY', name: 'eBay', color: '#E53238' },
    { id: 'TIKTOK', name: 'TikTok Shop', color: '#000000' }
];

export default function MarketplaceApi() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [marketplaces, setMarketplaces] = useState([]);
    const [couriers, setCouriers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [form] = Form.useForm();

    const fetchConnections = useCallback(async () => {
        setLoading(true);
        setMarketplaces(mockMarketplaceConnections);
        setCouriers([]);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (token) fetchConnections();
    }, [token, fetchConnections]);

    const handleSubmit = async (values) => {
        try {
            message.success('API Bridge Online. Channel synchronization initialized.');
            setModalOpen(false);
            fetchConnections();
        } catch (err) {
            message.error('Handshake failure');
        }
    };

    const columns = [
        {
            title: 'Neural Bridge',
            key: 'channel',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl shadow-sm"><ShopOutlined /></div>
                    <div>
                        <div className="font-black text-slate-800 uppercase italic tracking-tighter">{r.accountName}</div>
                        <Tag color="blue" bordered={false} className="text-[9px] font-bold uppercase">{r.marketplace}</Tag>
                    </div>
                </div>
            )
        },
        {
            title: 'Telemetry',
            key: 'sync',
            render: (_, r) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${r.autoSyncOrders ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} /><span className="text-[10px] font-bold text-slate-400">ORDERS: {r.autoSyncOrders ? 'AUTO' : 'MANUAL'}</span></div>
                    <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${r.autoSyncStock ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} /><span className="text-[10px] font-bold text-slate-400">STOCK: {r.autoSyncStock ? 'AUTO' : 'MANUAL'}</span></div>
                </div>
            )
        },
        { title: 'Last Pulse', dataIndex: 'lastSyncAt', key: 'pulse', render: (v) => v ? <span className="text-[10px] font-black text-slate-400">{new Date(v).toLocaleTimeString()}</span> : <Tag className="text-[10px] font-bold text-gray-300 border-none">OFFLINE</Tag> },
        { title: 'Status', dataIndex: 'isActive', key: 'status', render: (v) => <Badge status={v ? 'processing' : 'default'} text={<span className="font-black text-[10px] uppercase text-slate-600">{v ? 'LINK_ACTIVE' : 'LINK_VOID'}</span>} /> },
        {
            title: 'Action Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<SyncOutlined className="text-blue-500" />} />
                    <Button type="text" icon={<KeyOutlined className="text-amber-500" />} />
                    <Button type="text" danger icon={<PoweroffOutlined />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">API Connections</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">External marketplace integrations, order ingestion protocols, and multi-channel inventory synchronization</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-indigo-100 font-bold" onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Initialize Connector
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Bridges</div><div className="text-3xl font-black">{marketplaces.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm text-green-600"><div className="text-[10px] font-black uppercase mb-1">Sync Success Rate</div><div className="text-3xl font-black">99.8%</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm text-indigo-600"><div className="text-[10px] font-black uppercase mb-1">API Throughput</div><div className="text-3xl font-black">12.4k/hr</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-amber-500 uppercase mb-1">OAuth Renewals</div><div className="text-3xl font-black">2</div></Card>
                </div>

                <Tabs defaultActiveKey="mkt" className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50">
                    <TabPane tab={<span className="font-black uppercase tracking-widest text-[11px] px-6 py-2"><ShopOutlined className="mr-2" /> Marketplace Nodes</span>} key="mkt">
                        <div className="mt-8">
                            <Table columns={columns} dataSource={marketplaces} rowKey="id" loading={loading} pagination={false} />
                        </div>
                    </TabPane>
                    <TabPane tab={<span className="font-black uppercase tracking-widest text-[11px] px-6 py-2"><SafetyCertificateOutlined className="mr-2" /> Courier Protocols</span>} key="courier">
                        <div className="mt-8">
                            <Table columns={columns} dataSource={couriers} rowKey="id" loading={loading} pagination={false} />
                        </div>
                    </TabPane>
                </Tabs>

                <Modal title="Establish Neural API Bridge" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={700} className="api-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Row gutter={16}>
                            <Col span={12}><Form.Item label="Target Platform" name="marketplace" rules={[{ required: true }]}><Select onChange={setSelectedType} className="h-11 rounded-xl">{MARKETPLACE_TYPES.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}</Select></Form.Item></Col>
                            <Col span={12}><Form.Item label="Identity (Account Name)" name="accountName" rules={[{ required: true }]}><Input placeholder="Prime UK Store #1" className="h-11 rounded-xl" /></Form.Item></Col>
                        </Row>


                        <Divider><div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronization Directives</div></Divider>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Order Ingestion</div>
                                <Form.Item name="autoSyncOrders" valuePropName="checked" noStyle><Button block className="h-11 rounded-xl font-bold uppercase text-[10px]" type="dashed">Auto-Sync Toggle</Button></Form.Item>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Stock Broadcast</div>
                                <Form.Item name="autoSyncStock" valuePropName="checked" noStyle><Button block className="h-11 rounded-xl font-bold uppercase text-[10px]" type="dashed">Auto-Sync Toggle</Button></Form.Item>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Polling Frequency</div>
                                <Form.Item name="syncFrequency" initialValue={15} noStyle><InputNumber min={5} addonAfter="MIN" className="w-full h-11 rounded-xl font-bold" /></Form.Item>
                            </div>
                        </div>

                        <Divider><div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Authentication Handshake</div></Divider>
                        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 mb-6 flex flex-col items-center justify-center space-y-4">
                            <LinkOutlined className="text-3xl text-amber-500" />
                            <div className="text-center">
                                <div className="font-black text-slate-800 uppercase italic">Interactive OAuth Required</div>
                                <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">After initial handshake, you will be redirected to {selectedType || 'Platform'} Secure Login</div>
                            </div>
                            <Button type="primary" className="bg-amber-500 border-amber-500 font-black uppercase text-[10px] h-10 px-8 rounded-xl shadow-lg">Begin Authorization Flow</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
