import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, Tag, Popconfirm, Tabs, DatePicker } from 'antd';
import { PlusOutlined, ReloadOutlined, ShopOutlined, SyncOutlined, PoweroffOutlined, SearchOutlined, EyeOutlined, EditOutlined, SafetyCertificateOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { mockMarketplaceConnections } from '../../mockData';
import { formatDate } from '../../utils';

const { RangePicker } = DatePicker;

const MARKETPLACE_TYPES = [
    { id: 'AMAZON_FBA', name: 'Amazon FBA', color: '#FF9900' },
    { id: 'AMAZON_MFN', name: 'Amazon MFN', color: '#FF9900' },
    { id: 'SHOPIFY', name: 'Shopify', color: '#96BF48' },
    { id: 'EBAY', name: 'eBay', color: '#E53238' },
];

const SYNC_OPTIONS = [
    { value: 'AUTO', label: 'Auto' },
    { value: 'MANUAL', label: 'Manual' },
];

export default function MarketplaceApi() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [marketplaces, setMarketplaces] = useState([]);
    const [couriers, setCouriers] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [activeTab, setActiveTab] = useState('mkt');
    const [searchText, setSearchText] = useState('');
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
            message.success('Connector initialized. Channel synchronization set up.');
            setModalOpen(false);
            form.resetFields();
            fetchConnections();
        } catch (err) {
            message.error(err?.message || 'Failed to initialize connector');
        }
    };

    const dataSource = activeTab === 'mkt' ? marketplaces : couriers;
    const filteredData = searchText
        ? dataSource.filter((r) => (r.accountName || '').toLowerCase().includes(searchText.toLowerCase()) || (r.marketplace || '').toLowerCase().includes(searchText.toLowerCase()))
        : dataSource;

    const columns = [
        { title: 'Bridge Name', key: 'channel', width: 220, render: (_, r) => <span className="font-medium text-gray-900">{r.accountName || '—'}</span> },
        { title: 'Category', key: 'category', width: 120, render: (_, r) => <Tag color="blue">{r.marketplace || '—'}</Tag> },
        { title: 'Schedule', key: 'schedule', width: 100, render: (_, r) => (r.autoSyncOrders || r.autoSyncStock ? 'Auto' : 'Manual') },
        { title: 'Last Run', dataIndex: 'lastSyncAt', key: 'lastRun', width: 120, render: (v) => (v ? formatDate(v) : '—') },
        { title: 'Format', key: 'format', width: 90, render: () => <Tag color="cyan">API</Tag> },
        { title: 'Status', dataIndex: 'isActive', key: 'status', width: 110, render: (v) => <Tag color={v ? 'green' : 'default'}>{v ? 'LINK_ACTIVE' : 'LINK_VOID'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            width: 200,
            fixed: 'right',
            render: (_, r) => (
                <Space size="small" wrap>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="p-0 text-blue-600">View</Button>
                    <Button type="link" size="small" icon={<EditOutlined />} className="p-0 text-blue-600">Edit</Button>
                    <Button type="link" size="small" icon={<SyncOutlined />} className="p-0 text-blue-600">Sync</Button>
                    <Popconfirm title="Disconnect this connector?" okText="Yes" cancelText="No" onConfirm={() => message.info('Disconnect can be implemented.')}>
                        <Button type="link" size="small" danger icon={<PoweroffOutlined />} className="p-0">Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const tabContent = (
        <>
            <div className="flex flex-wrap items-center gap-3 px-0 py-4 border-b border-gray-100">
                <Input placeholder="Search connectors..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-56 rounded-lg" allowClear />
                <RangePicker placeholder={['Start Date', 'End Date']} className="rounded-lg" />
                <Select placeholder="Schedule" className="w-32 rounded-lg" options={SYNC_OPTIONS} allowClear />
                <Select placeholder="Format" className="w-36 rounded-lg" options={[{ value: 'API', label: 'API' }]} allowClear />
                <Button icon={<ReloadOutlined />} onClick={fetchConnections} loading={loading} className="rounded-lg">Refresh</Button>
            </div>
            <Table columns={columns} dataSource={filteredData} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} connectors`, pageSize: 10 }} scroll={{ x: 900 }} locale={{ emptyText: 'No data' }} className="[&_.ant-table-thead_th]:font-normal" />
        </>
    );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Integrations</h1>
                        <p className="text-gray-500 text-sm mt-0.5">External marketplace integrations, order ingestion, and multi-channel inventory sync</p>
                    </div>
                    <Space>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { form.resetFields(); setModalOpen(true); }}>
                            Initialize Connector
                        </Button>
                        <Button icon={<ReloadOutlined />} className="rounded-lg" onClick={fetchConnections} loading={loading}>
                            Refresh
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Active Bridges</div>
                        <div className="text-xl font-medium text-blue-600">{marketplaces.length + couriers.length}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Sync Success Rate</div>
                        <div className="text-xl font-medium text-green-600">99.8%</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">API Throughput</div>
                        <div className="text-xl font-medium text-blue-600">12.4k/hr</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">OAuth Renewals</div>
                        <div className="text-xl font-medium text-orange-600">2</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="px-4 pt-2 [&_.ant-tabs-nav]:mb-0"
                        items={[
                            {
                                key: 'mkt',
                                label: (
                                    <span className="flex items-center gap-2">
                                        <ShopOutlined />
                                        Marketplace Nodes ({marketplaces.length})
                                    </span>
                                ),
                                children: tabContent,
                            },
                            {
                                key: 'courier',
                                label: (
                                    <span className="flex items-center gap-2">
                                        <SafetyCertificateOutlined />
                                        Courier Protocols ({couriers.length})
                                    </span>
                                ),
                                children: tabContent,
                            },
                        ]}
                    />
                </Card>

                <Modal title="Initialize Connector" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} footer={null} width={520} className="rounded-xl" destroyOnClose>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        <Form.Item label="Connector Type" name="marketplace" rules={[{ required: true, message: 'Select connector type' }]}>
                            <Select placeholder="Select connector type" className="rounded-lg" onChange={setSelectedType} options={MARKETPLACE_TYPES.map((m) => ({ value: m.id, label: m.name }))} />
                        </Form.Item>
                        <Form.Item label="Account Name" name="accountName" rules={[{ required: true, message: 'Enter account name' }]}>
                            <Input placeholder="Enter account name (e.g., Prime UK Store #1)" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Sync Options" name="autoSync">
                            <Select placeholder="Orders & stock sync" className="rounded-lg" options={[{ value: 'AUTO', label: 'Auto sync orders & stock' }, { value: 'MANUAL', label: 'Manual sync' }]} allowClear />
                        </Form.Item>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                            <span className="text-sm text-blue-800">Connector will be set up. You may be redirected for OAuth authorization.</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setModalOpen(false); form.resetFields(); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">OK</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
