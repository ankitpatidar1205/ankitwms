import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Tabs, Card, Input, InputNumber, Space, Modal, Form, Select, DatePicker, Drawer, Alert, Popconfirm, message } from 'antd';
import {
    PlusOutlined, InboxOutlined, CheckCircleOutlined, WarningOutlined, StopOutlined,
    SearchOutlined, ExportOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, HomeOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { apiRequest } from '../api/client';
import { formatNumber } from '../utils';

const { Search } = Input;
const { Option } = Select;

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
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const selectedWarehouseId = Form.useWatch('warehouseId', form);

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

    const locationsByWarehouse = selectedWarehouseId
        ? locations.filter(l => (l.Zone && l.Zone.warehouseId === selectedWarehouseId) || l.warehouseId === selectedWarehouseId)
        : locations;

    const matchesSearch = (item) => !searchText ||
        item.product?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.lotNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (item.batchNumber || '').toLowerCase().includes(searchText.toLowerCase());

    const filteredInventory = inventory.filter((item) => {
        if (!matchesSearch(item)) return false;
        const qty = item.quantity || 0;
        const available = qty - (item.reserved || 0);
        if (activeTab === 'in_stock') return available > 0;
        if (activeTab === 'low_stock') return available > 0 && available <= 50;
        if (activeTab === 'out_of_stock') return available <= 0;
        if (activeTab === 'expiring') return item.bestBeforeDate && new Date(item.bestBeforeDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return true;
    });

    const totalUnits = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalAvailable = inventory.reduce((s, i) => s + Math.max(0, (i.quantity || 0) - (i.reserved || 0)), 0);
    const totalReserved = inventory.reduce((s, i) => s + (i.reserved || 0), 0);
    const allItemsCount = inventory.filter(matchesSearch).length;

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            setError(null);
            const payload = {
                productId: values.productId,
                warehouseId: values.warehouseId,
                locationId: values.locationId || null,
                quantity: values.quantity ?? 0,
                reserved: values.reserved ?? 0,
                status: values.status || 'ACTIVE',
                lotNumber: values.lotNumber || null,
                batchNumber: values.batchNumber || null,
                serialNumber: values.serialNumber || null,
                bestBeforeDate: values.bestBeforeDate ? dayjs(values.bestBeforeDate).format('YYYY-MM-DD') : null,
            };
            if (selectedInventory) {
                await apiRequest(`/api/inventory/stock/${selectedInventory.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                setModalOpen(false);
                setSelectedInventory(null);
                fetchInventory();
            } else {
                await apiRequest('/api/inventory/stock', { method: 'POST', body: JSON.stringify(payload) }, token);
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

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/inventory/stock/${id}`, { method: 'DELETE' }, token);
            message.success('Record deleted');
            fetchInventory();
        } catch (err) {
            message.error(err?.message || 'Delete failed');
        }
    };

    const setFormValues = (record) => {
        form.setFieldsValue({
            productId: record.productId ?? record.Product?.id ?? record.product?.id,
            warehouseId: record.warehouseId ?? record.Warehouse?.id ?? record.warehouse?.id,
            locationId: record.locationId ?? record.Location?.id ?? record.location?.id,
            quantity: record.quantity,
            reserved: record.reserved ?? 0,
            status: record.status || 'ACTIVE',
            lotNumber: record.lotNumber,
            batchNumber: record.batchNumber,
            serialNumber: record.serialNumber,
            bestBeforeDate: record.bestBeforeDate ? dayjs(record.bestBeforeDate) : undefined,
        });
    };

    const inventoryColumns = [
        { title: 'Product SKU', dataIndex: ['product', 'sku'], key: 'sku', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Product Name', dataIndex: ['product', 'name'], key: 'name', width: 200, render: (v) => <span className="flex items-center gap-2"><InboxOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Warehouse', dataIndex: ['warehouse', 'name'], key: 'warehouse', width: 150, render: (v, r) => r.warehouse ? <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{r.warehouse.name}</span> : '—' },
        { title: 'Location', key: 'location', width: 120, render: (_, r) => r.location ? <span className="flex items-center gap-2"><EnvironmentOutlined className="text-gray-400" />{r.location.name || r.location.code || '—'}</span> : '—' },
        { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 90, align: 'right', render: (q) => formatNumber(q ?? 0) },
        { title: 'Available', key: 'available', width: 90, align: 'right', render: (_, r) => formatNumber(Math.max(0, (r.quantity || 0) - (r.reserved || 0))) },
        { title: 'Reserved', dataIndex: 'reserved', key: 'reserved', width: 90, align: 'right', render: (v) => formatNumber(v ?? 0) },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v || 'ACTIVE'}</Tag> },
        { title: 'Lot Number', dataIndex: 'lotNumber', key: 'lotNumber', width: 100, ellipsis: true, render: (v) => v || '—' },
        {
            title: 'Actions',
            key: 'actions',
            width: 140,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedInventory(record); setViewMode(true); setModalOpen(true); setFormValues(record); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedInventory(record); setViewMode(false); setFormValues(record); setModalOpen(true); }} />
                    <Popconfirm title="Delete this record?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Inventory Management</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Total: {formatNumber(totalUnits)} units | Available: {formatNumber(totalAvailable)} | Reserved: {formatNumber(totalReserved)}</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchInventory}>Refresh</Button>
                        <Button icon={<ExportOutlined />}>Export</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setSelectedInventory(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                            + Add Inventory
                        </Button>
                    </Space>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="[&_.ant-tabs-tab]:font-normal"
                    items={[
                        { key: 'all', label: <>All Items ({allItemsCount})</>, icon: <InboxOutlined /> },
                        { key: 'in_stock', label: <>In Stock ({inventory.filter(i => ((i.quantity || 0) - (i.reserved || 0)) > 0).length})</>, icon: <CheckCircleOutlined /> },
                        { key: 'low_stock', label: <>Low Stock ({inventory.filter(i => { const a = (i.quantity || 0) - (i.reserved || 0); return a > 0 && a <= 50; }).length})</>, icon: <WarningOutlined /> },
                        { key: 'out_of_stock', label: <>Out of Stock ({inventory.filter(i => ((i.quantity || 0) - (i.reserved || 0)) <= 0).length})</>, icon: <StopOutlined /> },
                        { key: 'expiring', label: <>Expiring Soon ({inventory.filter(i => i.bestBeforeDate && new Date(i.bestBeforeDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length})</>, icon: <WarningOutlined /> },
                    ]}
                />

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by product name, SKU, or lot number..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                        </div>
                        <Table
                            dataSource={filteredInventory}
                            columns={inventoryColumns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} items`, pageSize: 50 }}
                            scroll={{ x: 1100 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Drawer title="Inventory Details" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={480}>
                    {selectedInventory && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-medium text-gray-900">{selectedInventory.product?.name}</h2>
                            <Tag color="blue">{selectedInventory.product?.sku}</Tag>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Quantity</div>
                                    <div className="text-xl font-medium">{selectedInventory.quantity}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Available</div>
                                    <div className="text-xl font-medium">{Math.max(0, (selectedInventory.quantity || 0) - (selectedInventory.reserved || 0))}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Location</div>
                                    <div className="text-xl font-medium">{selectedInventory.location?.name || selectedInventory.location?.code || '—'}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs text-gray-500 font-normal">Lot Number</div>
                                    <div className="text-xl font-medium">{selectedInventory.lotNumber || '—'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal
                    title={viewMode ? 'View Inventory' : selectedInventory ? 'Edit record' : 'Add Inventory'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedInventory(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedInventory(null); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {error && <Alert type="error" message={error} className="mb-4" />}
                    {viewMode && selectedInventory ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Product</div><div className="text-gray-900">{selectedInventory.product?.name} ({selectedInventory.product?.sku})</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse</div><div className="text-gray-900">{selectedInventory.warehouse?.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Location</div><div className="text-gray-900">{(selectedInventory.location?.name || selectedInventory.location?.code) ?? '—'}</div></div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Quantity</div><div className="text-gray-900">{selectedInventory.quantity ?? '—'}</div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Available</div><div className="text-gray-900">{Math.max(0, (selectedInventory.quantity || 0) - (selectedInventory.reserved || 0))}</div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Reserved</div><div className="text-gray-900">{selectedInventory.reserved ?? '—'}</div></div>
                            </div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedInventory.status ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Lot Number</div><div className="text-gray-900">{selectedInventory.lotNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Batch Number</div><div className="text-gray-900">{selectedInventory.batchNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Serial Number</div><div className="text-gray-900">{selectedInventory.serialNumber ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Best Before Date</div><div className="text-gray-900">{selectedInventory.bestBeforeDate ? dayjs(selectedInventory.bestBeforeDate).format('DD/MM/YYYY') : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            <Form.Item label="Product" name="productId" rules={[{ required: true, message: 'Select product' }]}>
                                <Select placeholder="Select product" className="rounded-lg" disabled={!!selectedInventory} showSearch optionFilterProp="label" options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))} />
                            </Form.Item>
                            <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select warehouse' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" disabled={!!selectedInventory} onChange={() => form.setFieldValue('locationId', undefined)} options={warehouses.map(w => ({ label: w.name, value: w.id }))} />
                            </Form.Item>
                            <Form.Item label="Location" name="locationId">
                                <Select placeholder="Select location (optional)" className="rounded-lg" allowClear disabled={!!selectedInventory} options={locationsByWarehouse.map(l => ({ label: l.name || l.code || l.id, value: l.id }))} />
                            </Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Quantity" name="quantity" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber className="w-full rounded-lg" min={0} />
                                </Form.Item>
                                <Form.Item label="Reserved" name="reserved">
                                    <InputNumber className="w-full rounded-lg" min={0} />
                                </Form.Item>
                            </div>
                            <p className="text-xs text-gray-500 -mt-2">Available = Quantity − Reserved (computed)</p>
                            <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                <Select placeholder="Select status" className="rounded-lg">
                                    <Option value="ACTIVE">Active</Option>
                                    <Option value="INACTIVE">Inactive</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Lot Number" name="lotNumber">
                                <Input placeholder="Lot number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Batch Number" name="batchNumber">
                                <Input placeholder="Batch number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Serial Number" name="serialNumber">
                                <Input placeholder="Serial number" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Best Before Date" name="bestBeforeDate">
                                <DatePicker className="w-full rounded-lg" format="DD/MM/YYYY" />
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
