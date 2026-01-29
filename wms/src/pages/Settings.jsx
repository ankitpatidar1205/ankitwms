import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, Tabs, Spin, Alert, Switch, Radio, Divider, InputNumber, Space, Typography, Row, Col, Badge, Tooltip, List, message } from 'antd';
import { PlusOutlined, SearchOutlined, SaveOutlined, EyeOutlined, SettingOutlined, AppstoreOutlined, DatabaseOutlined, BellOutlined, DeleteOutlined, EditOutlined, ReloadOutlined, ScanOutlined, CameraOutlined, MobileOutlined, CheckCircleOutlined, WifiOutlined, UsbOutlined, ApiOutlined, SyncOutlined, InfoCircleOutlined, ThunderboltOutlined, DesktopOutlined, TabletOutlined, AudioOutlined, RocketOutlined, ShopOutlined, ControlOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { mockSettings } from '../mockData';

const { Title, Text } = Typography;
const { Option } = Select;

export default function Settings() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState([]);
    const [activeTab, setActiveTab] = useState('general');
    const [carriers, setCarriers] = useState([]);
    const [marketplaces, setMarketplaces] = useState([]);
    const [scannerConfig, setScannerConfig] = useState({
        activeScannerType: 'handheld',
        handheld: { enabled: true, deviceType: 'zebra_tc21', connectionType: 'wedge' },
        camera: { enabled: false, resolution: 'high' }
    });

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setSettings(mockSettings);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const saveScanner = () => {
        message.success('Scanner protocol updated');
    };

    const renderGeneral = () => (
        <div className="space-y-6">
            <Card title="System Identity" className="rounded-2xl shadow-sm border-none">
                <Form layout="vertical">
                    <Row gutter={24}>
                        <Col span={12}><Form.Item label="Organization Alias"><Input defaultValue="Yash Logistics Global" /></Form.Item></Col>
                        <Col span={12}><Form.Item label="Primary Datacenter Region"><Select defaultValue="eu-west-1"><Option value="eu-west-1">Ireland (EU)</Option><Option value="us-east-1">N. Virginia (US)</Option></Select></Form.Item></Col>
                    </Row>
                </Form>
            </Card>
            <Card title="Localization" className="rounded-2xl shadow-sm border-none">
                <Form layout="vertical">
                    <Row gutter={24}>
                        <Col span={12}><Form.Item label="Currency Standard"><Select defaultValue="GBP"><Option value="GBP">British Pound (£)</Option><Option value="USD">US Dollar ($)</Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item label="Timestamp Format"><Select defaultValue="ISO"><Option value="ISO">ISO 8601</Option><Option value="HUMAN">Readable Date</Option></Select></Form.Item></Col>
                    </Row>
                </Form>
            </Card>
        </div>
    );

    const renderScanner = () => (
        <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm border-none bg-slate-900 text-white overflow-hidden">
                <div className="flex justify-between items-center">
                    <div>
                        <Title level={4} style={{ color: 'white', margin: 0 }}>Peripheral Interface</Title>
                        <Text style={{ color: '#94a3b8' }}>Calibrate hardware scanners and edge devices</Text>
                    </div>
                    <ScanOutlined style={{ fontSize: 40, opacity: 0.2 }} />
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card hoverable className={`rounded-2xl border-2 transition-all ${scannerConfig.activeScannerType === 'handheld' ? 'border-indigo-500' : 'border-transparent'}`} onClick={() => setScannerConfig({ ...scannerConfig, activeScannerType: 'handheld' })}>
                    <div className="text-center py-6">
                        <MobileOutlined style={{ fontSize: 48, color: scannerConfig.activeScannerType === 'handheld' ? '#6366f1' : '#cbd5e1' }} />
                        <div className="mt-4 font-black">Industrial Handheld</div>
                        <div className="text-xs text-gray-400">Zebra / Honeywell / Datalogic</div>
                    </div>
                </Card>
                <Card hoverable className={`rounded-2xl border-2 transition-all ${scannerConfig.activeScannerType === 'camera' ? 'border-indigo-500' : 'border-transparent'}`} onClick={() => setScannerConfig({ ...scannerConfig, activeScannerType: 'camera' })}>
                    <div className="text-center py-6">
                        <CameraOutlined style={{ fontSize: 48, color: scannerConfig.activeScannerType === 'camera' ? '#6366f1' : '#cbd5e1' }} />
                        <div className="mt-4 font-black">Optic Camera</div>
                        <div className="text-xs text-gray-400">Mobile / Tablet Lens</div>
                    </div>
                </Card>
                <Card hoverable className={`rounded-2xl border-2 transition-all ${scannerConfig.activeScannerType === 'keyboard' ? 'border-indigo-500' : 'border-transparent'}`} onClick={() => setScannerConfig({ ...scannerConfig, activeScannerType: 'keyboard' })}>
                    <div className="text-center py-6">
                        <DesktopOutlined style={{ fontSize: 48, color: scannerConfig.activeScannerType === 'keyboard' ? '#6366f1' : '#cbd5e1' }} />
                        <div className="mt-4 font-black">HID Keyboard</div>
                        <div className="text-xs text-gray-400">Manual Wedge Entry</div>
                    </div>
                </Card>
            </div>

            <Card title="Hardware Configuration" className="rounded-2xl shadow-sm border-none">
                <Form layout="vertical">
                    <Row gutter={24}>
                        <Col span={12}><Form.Item label="Device Profile"><Select defaultValue="zebra_tc21"><Option value="zebra_tc21">Zebra TC21 (Standard)</Option><Option value="honeywell_ct40">Honeywell CT40</Option></Select></Form.Item></Col>
                        <Col span={12}><Form.Item label="Link Protocol"><Select defaultValue="wedge"><Option value="wedge">Keyboard Wedge (USB/Bluetooth)</Option><Option value="rest">Software API Call</Option></Select></Form.Item></Col>
                        <Col span={24}>
                            <div className="bg-slate-50 p-6 rounded-2xl flex items-center justify-between">
                                <div><Text strong>Audio Confirmation</Text><br /><Text type="secondary" size="small">Beep when barcode is successfully registered</Text></div>
                                <Switch defaultChecked />
                            </div>
                        </Col>
                    </Row>
                    <div className="mt-6 flex justify-end"><Button type="primary" size="large" icon={<SaveOutlined />} onClick={saveScanner}>Update Protocol</Button></div>
                </Form>
            </Card>
        </div>
    );

    const renderCarriers = () => (
        <Card className="rounded-2xl shadow-sm border-none">
            <div className="flex justify-between items-center mb-8">
                <Title level={4}>Logicstics Integrations</Title>
                <Button type="primary" icon={<PlusOutlined />}>Link Carrier</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { name: 'Royal Mail', status: 'ACTIVE', logo: '📮', color: 'red' },
                    { name: 'DPD Group', status: 'ACTIVE', logo: '🔴', color: 'red' },
                    { name: 'DHL Express', status: 'STANDBY', logo: '🟡', color: 'yellow' },
                    { name: 'FedEx Global', status: 'DISABLED', logo: '🟣', color: 'purple' }
                ].map((c, i) => (
                    <div key={i} className="p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="text-3xl">{c.logo}</div>
                            <div>
                                <div className="font-bold text-slate-800">{c.name}</div>
                                <Tag color={c.status === 'ACTIVE' ? 'green' : 'gray'} className="text-[10px] font-black">{c.status}</Tag>
                            </div>
                        </div>
                        <Button icon={<SettingOutlined />} type="text" />
                    </div>
                ))}
            </div>
        </Card>
    );

    const renderMarketplaces = () => (
        <Card className="rounded-2xl shadow-sm border-none">
            <div className="flex justify-between items-center mb-8">
                <Title level={4}>Channel Connectors</Title>
                <Button type="primary" icon={<PlusOutlined />}>Add Channel</Button>
            </div>
            <Table pagination={false} columns={[
                { title: 'Marketplace', dataIndex: 'name', render: (v, r) => <div className="flex items-center gap-3"><b>{r.logo} {v}</b></div> },
                { title: 'Last Sync', dataIndex: 'sync', render: (v) => <span className="text-gray-400 italic text-xs">{v}</span> },
                { title: 'Auto-Commit', dataIndex: 'auto', render: (v) => <Switch size="small" defaultChecked={v} /> },
                { title: 'Status', render: () => <Badge status="processing" text="Online" /> },
                { title: 'Action', render: () => <Button type="link" size="small">Sync Now</Button> }
            ]} dataSource={[
                { name: 'Shopify Store (UK)', logo: '🛍️', sync: '2 mins ago', auto: true },
                { name: 'Amazon FBM', logo: '🅰️', sync: '15 mins ago', auto: true },
                { name: 'eBay Enterprise', logo: '🛒', sync: '1 hour ago', auto: false }
            ]} />
        </Card>
    );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Settings</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Global system parameters and integration protocols</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchSettings} className="h-12 rounded-xl">Refresh Settings</Button>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="settings-tabs"
                    items={[
                        { key: 'general', label: <span><SettingOutlined /> General</span>, children: renderGeneral() },
                        { key: 'scanner', label: <span><ScanOutlined /> Scanner Protocol</span>, children: renderScanner() },
                        { key: 'carriers', label: <span><RocketOutlined /> Carrier Logic</span>, children: renderCarriers() },
                        { key: 'marketplaces', label: <span><ShopOutlined /> Marketplace Sync</span>, children: renderMarketplaces() },
                        { key: 'notifications', label: <span><BellOutlined /> Alert System</span>, children: <Card className="rounded-2xl border-none shadow-sm h-64 flex items-center justify-center text-gray-400">Notification subsystem configuration available in next patch</Card> }
                    ]}
                />
            </div>
        </MainLayout>
    );
}
