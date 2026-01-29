import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Modal, Form, DatePicker, InputNumber, message, Tabs, Popconfirm, Drawer, List, Empty, Divider, Typography } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FilterOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    CheckOutlined,
    InboxOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    MinusCircleOutlined,
    PrinterOutlined,
} from '@ant-design/icons';
import { formatCurrency, formatDate, getStatusColor } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Text } = Typography;

export default function PurchaseOrders() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    const fetchPurchaseOrders = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [poRes, supRes, prodRes] = await Promise.all([
                apiRequest('/api/purchase-orders', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/suppliers', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/inventory/products', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const list = Array.isArray(poRes.data) ? poRes.data : [];
            setPurchaseOrders(list.map((po) => ({
                id: po.id,
                poNumber: po.poNumber,
                supplier: po.Supplier?.name || po.supplierName || '-',
                supplierId: po.supplierId,
                status: (po.status || 'pending').toLowerCase(),
                totalAmount: Number(po.totalAmount) || 0,
                orderDate: po.createdAt || po.expectedDelivery,
                expectedDelivery: po.expectedDelivery,
                notes: po.notes,
                items: (po.PurchaseOrderItems || []).map((i) => ({
                    productId: i.productId,
                    productName: i.productName || i.Product?.name,
                    productSku: i.productSku || i.Product?.sku,
                    quantity: i.quantity,
                    unitPrice: Number(i.unitPrice) || 0,
                    totalPrice: Number(i.totalPrice) || 0,
                })),
            })));
            setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
        } catch (_) {
            setPurchaseOrders([]);
            setSuppliers([]);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    const addItem = (product) => {
        const existingItem = selectedItems.find(item => item.productId === product.id);
        if (existingItem) {
            setSelectedItems(selectedItems.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
                    : item
            ));
        } else {
            const unitPrice = Number(product.costPrice ?? product.price ?? 0);
            setSelectedItems([...selectedItems, {
                productId: product.id,
                productName: product.name,
                productSku: product.sku,
                quantity: 1,
                unitPrice,
                totalPrice: unitPrice,
                isBundle: product.type === 'BUNDLE',
            }]);
        }
    };

    const removeItem = (productId) => {
        setSelectedItems(selectedItems.filter(item => item.productId !== productId));
    };

    const updateItemQuantity = (productId, quantity) => {
        setSelectedItems(selectedItems.map(item =>
            item.productId === productId
                ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
                : item
        ));
    };

    const calculateTotal = () => {
        return selectedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    };

    const handleSubmit = async (values) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (!selectedItems.length) {
            message.error('Add at least one product');
            return;
        }
        try {
            const payload = {
                supplierId: Number(values.supplierId),
                expectedDelivery: values.expectedDelivery ? (values.expectedDelivery.toISOString?.() || values.expectedDelivery) : undefined,
                notes: values.notes || undefined,
                items: selectedItems.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productSku: item.productSku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };
            await apiRequest('/api/purchase-orders', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Purchase order created successfully!');
            setModalOpen(false);
            form.resetFields();
            setSelectedItems([]);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create purchase order');
        }
    };

    const handleEdit = async (record) => {
        try {
            setSelectedPO(record);
            setSelectedItems((record.items || []).map((i) => ({
                productId: i.productId,
                productName: i.productName,
                productSku: i.productSku,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                totalPrice: (i.quantity || 0) * (i.unitPrice || 0),
            })));
            editForm.setFieldsValue({
                supplierId: record.supplierId,
                expectedDelivery: record.expectedDelivery ? dayjs(record.expectedDelivery) : null,
                notes: record.notes,
            });
            setEditModalOpen(true);
        } catch (err) {
            message.error('Failed to load details');
        }
    };

    const handleEditSubmit = async (values) => {
        if (!selectedPO?.id || !token) return;
        if (!selectedItems.length) {
            message.error('Add at least one product');
            return;
        }
        try {
            const payload = {
                supplierId: Number(values.supplierId),
                expectedDelivery: values.expectedDelivery ? (values.expectedDelivery.toISOString?.() || values.expectedDelivery) : undefined,
                notes: values.notes || undefined,
                items: selectedItems.map((item) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productSku: item.productSku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
            };
            await apiRequest(`/api/purchase-orders/${selectedPO.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
            message.success('Purchase order updated!');
            setEditModalOpen(false);
            editForm.resetFields();
            setSelectedPO(null);
            setSelectedItems([]);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Update failed');
        }
    };

    const handleAction = async (id, action) => {
        if (!token) return;
        try {
            if (action === 'approve') {
                await apiRequest(`/api/purchase-orders/${id}/approve`, { method: 'POST' }, token);
            }
            message.success(`PO ${action} successful!`);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Action failed');
        }
    };

    const handleDelete = async (id) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (id == null || id === undefined) {
            message.error('Invalid purchase order');
            return;
        }
        try {
            await apiRequest(`/api/purchase-orders/${id}`, { method: 'DELETE' }, token);
            message.success('Purchase order deleted');
            setDetailDrawerOpen(false);
            setSelectedPO(null);
            fetchPurchaseOrders();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Delete failed');
        }
    };

    const columns = [
        { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', render: (v) => <span className="font-bold text-blue-600">{v}</span> },
        { title: 'Supplier', dataIndex: 'supplier', key: 'supplier' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} className="uppercase font-bold">{s}</Tag> },
        { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v) => <span className="font-medium">{formatCurrency(v)}</span> },
        { title: 'Date', dataIndex: 'orderDate', key: 'orderDate', render: (v) => formatDate(v) },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedPO(record); setDetailDrawerOpen(true); }} />
                    {(record.status === 'pending' || record.status === 'draft') && (
                        <>
                            <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => handleEdit(record)} />
                            <Popconfirm title="Approve PO?" onConfirm={() => handleAction(record.id, 'approve')}><Button type="text" icon={<CheckCircleOutlined className="text-green-500" />} /></Popconfirm>
                            <Popconfirm
                                title="Delete this purchase order?"
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDelete(record.id)}
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </>
                    )}
                    {record.status === 'approved' && (
                        <span className="text-gray-400 text-xs">(Edit/Delete not available for approved PO)</span>
                    )}
                </Space>
            )
        }
    ];

    const ItemSelector = () => (
        <div className="border border-dashed border-gray-300 rounded-2xl p-6 bg-slate-50/50">
            <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                <ShoppingCartOutlined /> Select Procurement Items
            </h4>
            <Select
                showSearch
                placeholder="Type product name or SKU..."
                className="w-full mb-6 h-10"
                onChange={(val) => { const p = products.find(x => x.id === val); if (p) addItem(p); }}
                options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
            />

            {selectedItems.length > 0 ? (
                <List
                    dataSource={selectedItems}
                    renderItem={(item) => (
                        <List.Item className="border-b-0 px-0">
                            <div className="flex items-center gap-4 w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">{item.productName}</div>
                                    <div className="text-xs text-gray-400 font-mono">{item.productSku}</div>
                                </div>
                                <InputNumber min={1} value={item.quantity} onChange={(v) => updateItemQuantity(item.productId, v || 1)} className="rounded-lg" />
                                <div className="w-24 text-right font-bold text-blue-600">{formatCurrency(item.totalPrice)}</div>
                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => removeItem(item.productId)} />
                            </div>
                        </List.Item>
                    )}
                />
            ) : <Empty description="Add items to create order" className="py-4" />}

            {selectedItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center px-2">
                    <span className="text-gray-500 font-medium">Grand Total Cost</span>
                    <span className="text-2xl font-black text-slate-800">{formatCurrency(calculateTotal())}</span>
                </div>
            )}
        </div>
    );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Purchase Orders
                        </h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Create and manage purchase orders</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-12 rounded-xl shadow-lg ring-4 ring-blue-50" onClick={() => { setModalOpen(true); form.resetFields(); setSelectedItems([]); }}>
                        Add Purchase Order
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-gray-400 font-bold text-[10px] uppercase">Total Logs</div><div className="text-2xl font-black">{purchaseOrders.length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-orange-500 font-bold text-[10px] uppercase">Awaiting Auth</div><div className="text-2xl font-black">{purchaseOrders.filter(x => x.status === 'pending').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-green-500 font-bold text-[10px] uppercase">Finalized</div><div className="text-2xl font-black">{purchaseOrders.filter(x => x.status === 'approved').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-blue-500 font-bold text-[10px] uppercase">Total Value</div><div className="text-2xl font-black">{formatCurrency(purchaseOrders.reduce((s, x) => s + x.totalAmount, 0))}</div></Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="mb-6 flex gap-4">
                        <Search placeholder="PO# or Supplier..." className="max-w-md" onChange={e => { }} prefix={<SearchOutlined />} />
                        <Button icon={<ReloadOutlined />} onClick={fetchPurchaseOrders}>Live Update</Button>
                    </div>
                    <Table columns={columns} dataSource={purchaseOrders} rowKey="id" loading={loading} />
                </Card>

                {/* Create PO Modal */}
                <Modal title="Procurement Order Request" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={800} className="rounded-2xl overflow-hidden">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Target Supplier" name="supplierId" rules={[{ required: true }]}><Select placeholder="Select vendor" className="h-10 rounded-lg shadow-sm">{suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item>
                            <Form.Item label="Expected Arrival" name="expectedDelivery"><DatePicker className="w-full h-10 rounded-lg shadow-sm" /></Form.Item>
                        </div>
                        <ItemSelector />
                        <Form.Item label="Order Memo" name="notes" className="mt-4"><Input.TextArea rows={2} className="rounded-xl" /></Form.Item>
                    </Form>
                </Modal>

                {/* Edit PO Modal */}
                <Modal
                    title="Edit Purchase Order"
                    open={editModalOpen}
                    onCancel={() => {
                        setEditModalOpen(false);
                        editForm.resetFields();
                        setSelectedPO(null);
                        setSelectedItems([]);
                    }}
                    onOk={() => editForm.submit()}
                    width={800}
                    className="rounded-2xl overflow-hidden"
                >
                    <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Target Supplier" name="supplierId" rules={[{ required: true }]}><Select placeholder="Select vendor" className="h-10 rounded-lg shadow-sm">{suppliers.map((s) => <Option key={s.id} value={s.id}>{s.name}</Option>)}</Select></Form.Item>
                            <Form.Item label="Expected Arrival" name="expectedDelivery"><DatePicker className="w-full h-10 rounded-lg shadow-sm" /></Form.Item>
                        </div>
                        <ItemSelector />
                        <Form.Item label="Order Memo" name="notes" className="mt-4"><Input.TextArea rows={2} className="rounded-xl" /></Form.Item>
                    </Form>
                </Modal>

                {/* Detail Drawer */}
                <Drawer title={`PO Details: ${selectedPO?.poNumber}`} width={600} open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} className="rounded-l-3xl">
                    {selectedPO && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center"><Tag color={getStatusColor(selectedPO.status)} className="px-4 py-1 rounded-full font-bold uppercase">{selectedPO.status}</Tag><span className="font-mono text-gray-400">{formatDate(selectedPO.orderDate)}</span></div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <div className="text-gray-400 text-xs font-bold uppercase mb-2">Supplier Info</div>
                                <div className="text-xl font-bold text-slate-800">{selectedPO.supplier}</div>
                            </div>
                            <List dataSource={selectedPO.items || []} renderItem={item => (
                                <List.Item className="px-0 flex justify-between">
                                    <div><div className="font-bold">{item.productName}</div><div className="text-xs text-gray-400">Qty: {item.quantity} x {formatCurrency(item.unitPrice)}</div></div>
                                    <div className="font-black text-blue-600">{formatCurrency(item.totalPrice)}</div>
                                </List.Item>
                            )} />
                            <Divider />
                            <div className="flex justify-between items-center"><span className="text-lg font-bold text-slate-600">Total Purchase Value</span><span className="text-2xl font-black text-slate-900">{formatCurrency(selectedPO.totalAmount)}</span></div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
