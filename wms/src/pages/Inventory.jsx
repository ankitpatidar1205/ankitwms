import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Tabs, Card, Input, InputNumber, Spin, Alert, Space, Modal, Form, Select, DatePicker, Drawer } from 'antd';
import {
    PlusOutlined, InboxOutlined, CheckCircleOutlined, WarningOutlined, StopOutlined,
    SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatNumber } from '../utils';

const { Search } = Input;

function normalizeStock(item) {
    return {
        ...item,
        product: item.Product || item.product,
        warehouse: item.Warehouse || item.warehouse,
        location: item.Location || item.location,
    };
}

export default function Inventory() {
    const { token } = useAuthStore();
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [selectedInventory, setSelectedInventory] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchInventory = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiRequest('/api/inventory/stock', { method: 'GET' }, token);
            const list = Array.isArray(data.data) ? data.data : [];
            setInventory(list.map(normalizeStock));
        } catch (err) {
            setError(err.message || 'Failed to load stock');
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDependencies = useCallback(async () => {
        if (!token) return;
        try {
            const [prodRes, whRes, locRes] = await Promise.all([
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/warehouses', { method: 'GET' }, token),
                apiRequest('/api/locations', { method: 'GET' }, token),
            ]);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setWarehouses(Array.isArray(whRes.data) ? whRes.data : []);
            setLocations(Array.isArray(locRes.data) ? locRes.data : []);
        } catch (_) {
            setProducts([]);
            setWarehouses([]);
            setLocations([]);
        }
    }, [token]);

    useEffect(() => {
        fetchInventory();
        fetchDependencies();
    }, [fetchInventory, fetchDependencies]);

    const filteredInventory = inventory.filter((item) => {
        const matchesSearch = !searchText ||
            item.product?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.product?.sku?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.lotNumber?.toLowerCase().includes(searchText.toLowerCase());

        if (!matchesSearch) return false;

        if (activeTab === 'in_stock') return (item.quantity || 0) > 50;
        if (activeTab === 'low_stock') return (item.quantity || 0) > 0 && (item.quantity || 0) <= 50;
        if (activeTab === 'out_of_stock') return (item.quantity || 0) === 0;
        return true;
    });

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            setError(null);
            if (selectedInventory) {
                await apiRequest(`/api/inventory/stock/${selectedInventory.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        quantity: values.quantity,
                        reserved: values.reserved ?? 0,
                        locationId: values.locationId || null,
                    }),
                }, token);
                setModalOpen(false);
                setSelectedInventory(null);
                fetchInventory();
            } else {
                await apiRequest('/api/inventory/stock', {
                    method: 'POST',
                    body: JSON.stringify({
                        productId: values.productId,
                        warehouseId: values.warehouseId,
                        locationId: values.locationId || null,
                        quantity: values.quantity ?? 0,
                        reserved: values.reserved ?? 0,
                    }),
                }, token);
                setModalOpen(false);
                form.resetFields();
                fetchInventory();
            }
        } catch (err) {
            setError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const inventoryColumns = [
        { title: 'SKU', dataIndex: ['product', 'sku'], key: 'sku', width: 120 },
        { title: 'Product', dataIndex: ['product', 'name'], key: 'name', width: 250 },
        { title: 'Warehouse', dataIndex: ['warehouse', 'name'], key: 'warehouse', width: 150 },
        { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'right', render: (q) => <b>{formatNumber(q)}</b> },
        {
            title: 'Location',
            key: 'location',
            render: (_, r) => (r.location?.name || r.location?.code || '-'),
        },
        {
            title: 'Status',
            key: 'status',
            render: () => <Tag color="green">AVAILABLE</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedInventory(record); setDrawerOpen(true); }} />
                    <Button type="text" icon={<EditOutlined />} onClick={() => {
                        setSelectedInventory(record);
                        form.setFieldsValue({
                            productId: record.productId ?? record.Product?.id,
                            warehouseId: record.warehouseId ?? record.Warehouse?.id,
                            locationId: record.locationId ?? record.Location?.id,
                            quantity: record.quantity,
                            reserved: record.reserved ?? 0,
                        });
                        setModalOpen(true);
                    }} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Inventory</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Real-time stock levels, asset distribution, and warehouse node telemetry</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchInventory}>Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedInventory(null); form.resetFields(); setModalOpen(true); }}>
                            Direct Adjustment
                        </Button>
                    </Space>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        { key: 'all', label: 'All Stock' },
                        { key: 'in_stock', label: 'Healthy Levels' },
                        { key: 'low_stock', label: 'Reorder Needed' },
                        { key: 'out_of_stock', label: 'Stockouts' },
                    ]}
                />

                <Card className="rounded-xl shadow-sm border-gray-100">
                    <Search placeholder="Search SKU or Product Name..." className="mb-4 max-w-md" onChange={e => setSearchText(e.target.value)} />
                    <Table dataSource={filteredInventory} columns={inventoryColumns} rowKey="id" loading={loading} />
                </Card>

                {/* Drawer for details */}
                <Drawer title="Inventory Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={500}>
                    {selectedInventory && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold">{selectedInventory.product?.name}</h2>
                            <Tag color="blue">{selectedInventory.product?.sku}</Tag>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                    <div className="text-gray-400 text-xs uppercase font-bold">Total Qty</div>
                                    <div className="text-xl font-bold">{selectedInventory.quantity}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg text-center">
                                    <div className="text-gray-400 text-xs uppercase font-bold">Location</div>
                                    <div className="text-xl font-bold">{selectedInventory.location?.code || '-'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>

                {/* Edit Modal */}
                <Modal title={selectedInventory ? 'Edit record' : 'Add record'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedInventory(null); }} onOk={() => form.submit()} confirmLoading={saving}>
                    {error && <Alert type="error" message={error} className="mb-4" />}
                    <Form form={form} layout="vertical" onFinish={handleSubmit}>
                        <Form.Item label="Product" name="productId" rules={[{ required: true }]}>
                            <Select placeholder="Select product" options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))} disabled={!!selectedInventory} />
                        </Form.Item>
                        <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true }]}>
                            <Select placeholder="Select warehouse" options={warehouses.map(w => ({ label: w.name, value: w.id }))} disabled={!!selectedInventory} />
                        </Form.Item>
                        <Form.Item label="Location" name="locationId">
                            <Select placeholder="Optional" allowClear options={locations.map(l => ({ label: l.name || l.code || l.id, value: l.id }))} />
                        </Form.Item>
                        <Form.Item label="Quantity" name="quantity" rules={[{ required: true }]}>
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                        <Form.Item label="Reserved" name="reserved">
                            <InputNumber className="w-full" min={0} />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
