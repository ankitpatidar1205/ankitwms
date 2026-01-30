import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Space, Card, Modal, Form, DatePicker, InputNumber, message, Tabs, Popconfirm, Drawer, List, Divider } from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    FilterOutlined,
    EyeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    ShoppingCartOutlined,
    MinusCircleOutlined,
    PrinterOutlined,
} from '@ant-design/icons';
import { formatCurrency, formatDate } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import dayjs from 'dayjs';

const { Search } = Input;

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
    const [searchText, setSearchText] = useState('');
    const [supplierFilter, setSupplierFilter] = useState(undefined);
    const [printPO, setPrintPO] = useState(null);
    const [form] = Form.useForm();
    const [editForm] = Form.useForm();

    useEffect(() => {
        if (!printPO) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.warning('Allow popups to print.');
            setPrintPO(null);
            return;
        }
        const items = (printPO.items || [])
            .map(
                (item) =>
                    `<tr>
                        <td style="border:1px solid #999;padding:8px 12px">${(item.productName ?? '—').replace(/</g, '&lt;')}</td>
                        <td style="border:1px solid #999;padding:8px 12px">${(item.productSku ?? '—').replace(/</g, '&lt;')}</td>
                        <td style="border:1px solid #999;padding:8px 12px;text-align:right">${item.quantity ?? 0}</td>
                        <td style="border:1px solid #999;padding:8px 12px;text-align:right">${formatCurrency(item.unitPrice ?? 0)}</td>
                        <td style="border:1px solid #999;padding:8px 12px;text-align:right">${formatCurrency(item.totalPrice ?? 0)}</td>
                    </tr>`
            )
            .join('');
        const notesHtml = printPO.notes
            ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #ccc"><div style="font-size:12px;color:#666">Notes</div><div style="font-size:14px">${String(printPO.notes).replace(/</g, '&lt;')}</div></div>`
            : '';
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>PO ${(printPO.poNumber || '').replace(/</g, '&lt;')}</title>
            <style>body{font-family:sans-serif;padding:20px;max-width:210mm;margin:0 auto;font-size:14px;}</style>
            </head>
            <body>
                <h1 style="font-size:20px;font-weight:bold;margin-bottom:8px;color:#111">Purchase Order</h1>
                <div style="border-bottom:1px solid #ccc;padding-bottom:12px;margin-bottom:12px;display:flex;justify-content:space-between">
                    <div>
                        <div style="font-size:12px;color:#666">PO Number</div>
                        <div style="font-weight:600;font-size:18px">${(printPO.poNumber || '').replace(/</g, '&lt;')}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:12px;color:#666">Order Date</div>
                        <div>${formatDate(printPO.orderDate)}</div>
                    </div>
                </div>
                <div style="margin-bottom:16px">
                    <div style="font-size:12px;color:#666">Supplier</div>
                    <div style="font-weight:500">${(printPO.supplier || '').replace(/</g, '&lt;')}</div>
                </div>
                <div style="margin-bottom:16px;font-size:14px;color:#666">Expected Delivery: ${formatDate(printPO.expectedDelivery) ?? '—'}</div>
                <table style="width:100%;border-collapse:collapse;border:1px solid #999;margin-top:16px">
                    <thead>
                        <tr style="background:#f0f0f0">
                            <th style="border:1px solid #999;padding:8px 12px;text-align:left">Product</th>
                            <th style="border:1px solid #999;padding:8px 12px;text-align:left">SKU</th>
                            <th style="border:1px solid #999;padding:8px 12px;text-align:right">Qty</th>
                            <th style="border:1px solid #999;padding:8px 12px;text-align:right">Unit Price</th>
                            <th style="border:1px solid #999;padding:8px 12px;text-align:right">Total</th>
                        </tr>
                    </thead>
                    <tbody>${items}</tbody>
                </table>
                <div style="margin-top:16px;display:flex;justify-content:flex-end"><span style="font-weight:bold">Total: ${formatCurrency(printPO.totalAmount ?? 0)}</span></div>
                ${notesHtml}
                <div style="margin-top:24px;font-size:12px;color:#888">Kiaan WMS — Printed on ${formatDate(new Date())}</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        const timer = setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
            setPrintPO(null);
        }, 350);
        return () => clearTimeout(timer);
    }, [printPO]);

    const poStatusColor = (s) => {
        const t = (s || '').toUpperCase();
        if (t === 'PENDING' || t === 'DRAFT') return 'orange';
        if (t === 'APPROVED') return 'green';
        if (t === 'RECEIVED' || t === 'COMPLETED') return 'green';
        return 'default';
    };

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
                status: (po.status || 'pending').toUpperCase(),
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

    const [productSelectValue, setProductSelectValue] = useState(undefined);

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
        setProductSelectValue(undefined);
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
                expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
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
                expectedDelivery: values.expectedDelivery ? dayjs(values.expectedDelivery).format('YYYY-MM-DD') : undefined,
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

    const filteredPOs = purchaseOrders.filter((po) => {
        if (activeTab !== 'all') {
            const t = (po.status || '').toUpperCase();
            if (activeTab === 'Pending' && t !== 'PENDING' && t !== 'DRAFT') return false;
            if (activeTab === 'Approved' && t !== 'APPROVED') return false;
            if (activeTab === 'Received' && t !== 'RECEIVED' && t !== 'COMPLETED') return false;
        }
        if (searchText) {
            const q = searchText.toLowerCase();
            if (!(po.poNumber || '').toLowerCase().includes(q) && !(po.supplier || '').toLowerCase().includes(q)) return false;
        }
        if (supplierFilter != null && po.supplierId !== supplierFilter) return false;
        return true;
    });

    const columns = [
        { title: 'PO Number', dataIndex: 'poNumber', key: 'poNumber', width: 120, render: (v) => <span className="font-medium text-blue-600">{v}</span> },
        { title: 'Supplier', dataIndex: 'supplier', key: 'supplier', width: 160 },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (s) => <Tag color={poStatusColor(s)}>{s}</Tag> },
        { title: 'Items', key: 'items', width: 80, align: 'center', render: (_, r) => (r.items || []).length },
        { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', width: 120, render: (v) => formatCurrency(v) },
        { title: 'Order Date', dataIndex: 'orderDate', key: 'orderDate', width: 120, render: (v) => formatDate(v) },
        { title: 'Expected Delivery', dataIndex: 'expectedDelivery', key: 'expectedDelivery', width: 130, render: (v) => formatDate(v) ?? '—' },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, record) => {
                const isPending = ['PENDING', 'DRAFT'].includes((record.status || '').toUpperCase());
                return (
                    <Space size="small" wrap>
                        <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0" onClick={() => { setSelectedPO(record); setDetailDrawerOpen(true); }}>View</Button>
                        <Button type="link" size="small" icon={<PrinterOutlined />} className="text-blue-600 p-0" onClick={() => setPrintPO(record)}>Print</Button>
                        {isPending && <Button type="link" size="small" icon={<EditOutlined />} className="text-blue-600 p-0" onClick={() => handleEdit(record)}>Edit</Button>}
                        {isPending && <Popconfirm title="Approve this PO?" onConfirm={() => handleAction(record.id, 'approve')} okText="Yes" cancelText="No"><Button type="link" size="small" className="text-green-600 p-0">Approve</Button></Popconfirm>}
                        <Popconfirm title="Delete this purchase order?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(record.id)}>
                            <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const pendingCount = purchaseOrders.filter((x) => ['PENDING', 'DRAFT'].includes((x.status || '').toUpperCase())).length;
    const approvedCount = purchaseOrders.filter((x) => (x.status || '').toUpperCase() === 'APPROVED').length;
    const receivedCount = purchaseOrders.filter((x) => ['RECEIVED', 'COMPLETED'].includes((x.status || '').toUpperCase())).length;

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-medium text-blue-600">Purchase Orders</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage supplier purchase orders and procurement.</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setModalOpen(true); form.resetFields(); setSelectedItems([]); setProductSelectValue(undefined); }}>
                        Create PO
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Total POs</div>
                        <div className="text-xl font-medium text-blue-600">{purchaseOrders.length}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Pending</div>
                        <div className="text-xl font-medium text-red-600">{pendingCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Approved</div>
                        <div className="text-xl font-medium text-green-600">{approvedCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm font-normal">Received</div>
                        <div className="text-xl font-medium text-red-600">{receivedCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="[&_.ant-tabs-nav]:mb-4"
                        items={[
                            { key: 'all', label: `All Orders (${purchaseOrders.length})` },
                            { key: 'Pending', label: `Pending (${pendingCount})` },
                            { key: 'Approved', label: `Approved (${approvedCount})` },
                            { key: 'Received', label: `Received (${receivedCount})` },
                        ]}
                    />
                    <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
                        <Search placeholder="Search POs..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="max-w-xs rounded-lg" prefix={<SearchOutlined />} allowClear />
                        <Select placeholder="Supplier" allowClear value={supplierFilter} onChange={setSupplierFilter} className="w-48 rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                        <Button icon={<FilterOutlined />} className="rounded-lg">More Filters</Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchPurchaseOrders} loading={loading} className="rounded-lg">Refresh</Button>
                    </div>
                    <Table columns={columns} dataSource={filteredPOs} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} orders`, pageSize: 20 }} className="[&_.ant-table-thead_th]:font-normal" scroll={{ x: 900 }} />
                </Card>

                {/* Create PO Modal */}
                <Modal title="Create Purchase Order" open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} width={720} className="rounded-xl">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Supplier" name="supplierId" rules={[{ required: true, message: 'Select supplier' }]}>
                                <Select placeholder="Select supplier" allowClear className="rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                            </Form.Item>
                            <Form.Item label="Expected Delivery Date" name="expectedDelivery">
                                <DatePicker placeholder="Select date" className="w-full rounded-lg" format="MM/DD/YYYY" />
                            </Form.Item>
                        </div>
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 mt-2">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                                <ShoppingCartOutlined /> Add Products/Bundles
                            </h4>
                            <Select showSearch placeholder="Search and select products..." allowClear value={productSelectValue} onChange={(val) => { if (val) { const p = products.find((x) => x.id === val); if (p) addItem(p); } }} onClear={() => setProductSelectValue(undefined)} className="w-full rounded-lg mb-4" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                            {selectedItems.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{item.productName}</div>
                                                <div className="text-xs text-gray-500">{item.productSku}</div>
                                            </div>
                                            <InputNumber min={1} value={item.quantity} onChange={(v) => updateItemQuantity(item.productId, v || 1)} className="w-20 rounded-lg" />
                                            <span className="text-gray-500 whitespace-nowrap">x {formatCurrency(item.unitPrice)}</span>
                                            <span className="font-medium w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeItem(item.productId)} />
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2 border-t border-gray-200">
                                        <span className="font-medium">Total: {formatCurrency(calculateTotal())}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-gray-400 text-sm">No products added yet. Search and select above.</div>
                            )}
                        </div>
                        <Form.Item label="Notes (Optional)" name="notes" className="mt-4">
                            <Input.TextArea rows={3} placeholder="Add any notes..." className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => setModalOpen(false)} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">Create</Button>
                        </div>
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
                        setProductSelectValue(undefined);
                    }}
                    footer={null}
                    width={720}
                    className="rounded-xl"
                >
                    <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} className="pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Supplier" name="supplierId" rules={[{ required: true, message: 'Select supplier' }]}>
                                <Select placeholder="Select supplier" allowClear className="rounded-lg" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                            </Form.Item>
                            <Form.Item label="Expected Delivery Date" name="expectedDelivery">
                                <DatePicker placeholder="Select date" className="w-full rounded-lg" format="MM/DD/YYYY" />
                            </Form.Item>
                        </div>
                        <div className="border border-dashed border-gray-200 rounded-xl p-4 bg-gray-50/50 mt-2">
                            <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-700">
                                <ShoppingCartOutlined /> Add Products/Bundles
                            </h4>
                            <Select showSearch placeholder="Search and select products..." allowClear value={productSelectValue} onChange={(val) => { if (val) { const p = products.find((x) => x.id === val); if (p) addItem(p); } }} onClear={() => setProductSelectValue(undefined)} className="w-full rounded-lg mb-4" optionFilterProp="label" filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                            {selectedItems.length > 0 ? (
                                <div className="space-y-2">
                                    {selectedItems.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-800">{item.productName}</div>
                                                <div className="text-xs text-gray-500">{item.productSku}</div>
                                            </div>
                                            <InputNumber min={1} value={item.quantity} onChange={(v) => updateItemQuantity(item.productId, v || 1)} className="w-20 rounded-lg" />
                                            <span className="text-gray-500 whitespace-nowrap">x {formatCurrency(item.unitPrice)}</span>
                                            <span className="font-medium w-20 text-right">{formatCurrency(item.totalPrice)}</span>
                                            <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeItem(item.productId)} />
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2 border-t border-gray-200">
                                        <span className="font-medium">Total: {formatCurrency(calculateTotal())}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-gray-400 text-sm">No products added yet. Search and select above.</div>
                            )}
                        </div>
                        <Form.Item label="Notes (Optional)" name="notes" className="mt-4">
                            <Input.TextArea rows={3} placeholder="Add any notes..." className="rounded-lg" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setEditModalOpen(false); editForm.resetFields(); setSelectedPO(null); setSelectedItems([]); setProductSelectValue(undefined); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">Update</Button>
                        </div>
                    </Form>
                </Modal>

                {/* Detail Drawer */}
                <Drawer title={`PO Details: ${selectedPO?.poNumber}`} width={600} open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} className="rounded-l-3xl">
                    {selectedPO && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center"><Tag color={poStatusColor(selectedPO.status)}>{selectedPO.status}</Tag><span className="font-mono text-gray-400">{formatDate(selectedPO.orderDate)}</span></div>
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
