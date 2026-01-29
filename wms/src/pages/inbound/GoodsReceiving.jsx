import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Drawer, Descriptions, Space, InputNumber, DatePicker, Progress, Popconfirm, Badge, Tabs, Divider, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, InboxOutlined, ReloadOutlined, EyeOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { formatDate, getStatusColor } from '../../utils';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

export default function GoodsReceiving() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [receipts, setReceipts] = useState([]);
    const [approvedPOs, setApprovedPOs] = useState([]);
    const [selectedPO, setSelectedPO] = useState(null);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [form] = Form.useForm();
    const [receiveForm] = Form.useForm();

    const fetchReceipts = useCallback(async () => {
        if (!token) { setLoading(false); return; }
        setLoading(true);
        try {
            const [poRes, grRes] = await Promise.all([
                apiRequest('/api/purchase-orders', { method: 'GET' }, token).catch(() => ({ data: [] })),
                apiRequest('/api/goods-receiving', { method: 'GET' }, token).catch(() => ({ data: [] })),
            ]);
            const poList = Array.isArray(poRes.data) ? poRes.data : [];
            setApprovedPOs(poList.filter((po) => (po.status || '').toLowerCase() === 'approved').map((po) => ({
                ...po,
                supplier: po.Supplier ? { name: po.Supplier.name } : { name: '-' },
            })));
            const grList = Array.isArray(grRes?.data) ? grRes.data : [];
            setReceipts(grList.map((gr) => ({
                id: gr.id,
                grNumber: gr.grNumber,
                poNumber: gr.PurchaseOrder?.poNumber || gr.poNumber || '-',
                supplier: gr.PurchaseOrder?.Supplier?.name || gr.PurchaseOrder?.supplierName || '-',
                status: (gr.status || 'pending').toLowerCase(),
                totalExpected: Number(gr.totalExpected) || 0,
                totalReceived: Number(gr.totalReceived) || 0,
                notes: gr.notes,
                items: (gr.GoodsReceiptItems || []).map((i) => ({
                    id: i.id,
                    productId: i.productId,
                    productName: i.productName || i.Product?.name,
                    productSku: i.productSku || i.Product?.sku,
                    expectedQty: i.expectedQty,
                    receivedQty: i.receivedQty,
                    qualityStatus: i.qualityStatus,
                })),
            })));
        } catch (_) {
            setApprovedPOs([]);
            setReceipts([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleCreate = async (values) => {
        if (!token) return;
        try {
            await apiRequest('/api/goods-receiving', {
                method: 'POST',
                body: JSON.stringify({ purchaseOrderId: Number(values.purchaseOrderId), notes: values.notes }),
            }, token);
            message.success('GRN created!');
            setCreateModalOpen(false);
            form.resetFields();
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create receipt');
        }
    };

    const handleOpenReceive = (record) => {
        setSelectedReceipt(record);
        setReceiveModalOpen(true);
        // Form will get initialValues via key+remount when modal opens
        setTimeout(() => {
            receiveForm.setFieldsValue({ items: (record.items || []).map((i) => ({
                productName: i.productName,
                productSku: i.productSku,
                expectedQty: i.expectedQty,
                receivedQty: i.receivedQty ?? i.expectedQty,
                qualityStatus: i.qualityStatus || 'GOOD',
            })) });
        }, 0);
    };

    const handleReceiveItems = async (values) => {
        if (!selectedReceipt?.id || !token) return;
        try {
            const items = (values.items || []).map((item, idx) => {
                const line = selectedReceipt.items?.[idx];
                return {
                    id: line?.id,
                    productId: line?.productId,
                    receivedQty: item?.receivedQty ?? line?.expectedQty,
                    qualityStatus: item?.qualityStatus || 'GOOD',
                };
            });
            await apiRequest(`/api/goods-receiving/${selectedReceipt.id}/receive`, {
                method: 'PUT',
                body: JSON.stringify({ items }),
            }, token);
            message.success('Stock received and updated!');
            setReceiveModalOpen(false);
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Receipt failed');
        }
    };

    const handleDelete = async (id) => {
        if (!token) {
            message.error('Login required');
            return;
        }
        if (id == null || id === undefined) return;
        try {
            await apiRequest(`/api/goods-receiving/${id}`, { method: 'DELETE' }, token);
            message.success('Goods receipt deleted');
            setViewDrawerOpen(false);
            setSelectedReceipt(null);
            fetchReceipts();
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Delete failed');
        }
    };

    const columns = [
        { title: 'GRN#', dataIndex: 'grNumber', key: 'grNumber', render: (v) => <span className="font-bold text-blue-600">{v}</span> },
        { title: 'Reference PO', dataIndex: 'poNumber', key: 'poNumber' },
        { title: 'Vendor', dataIndex: 'supplier', key: 'supplier' },
        {
            title: 'Completion', dataIndex: 'totalReceived', key: 'progress', render: (v, r) => (
                <div className="w-32">
                    <Progress percent={r.totalExpected ? Math.round((Number(v) / r.totalExpected) * 100) : 0} size="small" status={Number(v) >= (r.totalExpected || 0) ? 'success' : 'active'} />
                </div>
            )
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} className="font-bold uppercase">{s}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space onClick={(e) => e.stopPropagation()}>
                    <Button type="text" icon={<EyeOutlined />} title="View" onClick={(e) => { e.stopPropagation(); setSelectedReceipt(record); setViewDrawerOpen(true); }} />
                    {record.status !== 'completed' && (
                        <Button type="text" icon={<EditOutlined className="text-blue-500" />} title="Receive / Edit" onClick={(e) => { e.stopPropagation(); handleOpenReceive(record); }} />
                    )}
                    <Popconfirm
                        title="Delete this goods receipt?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} title="Delete" onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Goods Receiving</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Verify and commit incoming shipments to warehouse inventory</p>
                    </div>
                    <Button type="primary" icon={<InboxOutlined />} size="large" className="h-12 rounded-xl bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-100" onClick={() => { fetchReceipts(); setCreateModalOpen(true); }}>
                        Receive Load
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Queue</div><div className="text-2xl font-black">{receipts.filter(x => x.status === 'pending').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-blue-500 uppercase mb-1">Processing</div><div className="text-2xl font-black">{receipts.filter(x => x.status === 'in_progress').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-green-500 uppercase mb-1">Stocked</div><div className="text-2xl font-black">{receipts.filter(x => x.status === 'completed').length}</div></Card>
                    <Card className="rounded-2xl border-none shadow-sm"><div className="text-[10px] font-bold text-purple-500 uppercase mb-1">Total Items</div><div className="text-2xl font-black">{receipts.reduce((s, r) => s + r.totalReceived, 0)}</div></Card>
                </div>

                <Card className="rounded-2xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="mb-6 flex gap-4">
                        <Search placeholder="GRN or PO Search..." className="max-w-md" onChange={() => { }} prefix={<SearchOutlined />} />
                        <Button icon={<ReloadOutlined />} onClick={fetchReceipts}>Dock Refresh</Button>
                    </div>
                    <Table columns={columns} dataSource={receipts} rowKey="id" loading={loading} />
                </Card>

                {/* Create GRN Modal */}
                <Modal title="Unload Assignment" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onOk={() => form.submit()} width={600} className="dock-modal">
                    <Form form={form} layout="vertical" onFinish={handleCreate} className="pt-4">
                        <Form.Item label="Authorized Purchase Order" name="purchaseOrderId" rules={[{ required: true }]}>
                            <Select placeholder="Select approved PO to unload" className="h-11 rounded-xl shadow-sm">
                                {approvedPOs.map(po => <Option key={po.id} value={po.id}>{po.poNumber} - {po.supplier?.name || '-'}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item label="Dock Notes" name="notes"><Input.TextArea rows={3} className="rounded-xl" /></Form.Item>
                    </Form>
                </Modal>

                {/* Receive Items Modal */}
                <Modal key={selectedReceipt?.id || 'receive'} title={`Verifying Stock: ${selectedReceipt?.grNumber}`} open={receiveModalOpen} onCancel={() => { setReceiveModalOpen(false); receiveForm.resetFields(); }} onOk={() => receiveForm.submit()} width={900} className="dock-modal overflow-hidden">
                    <Form form={receiveForm} layout="vertical" onFinish={handleReceiveItems} initialValues={{ items: (selectedReceipt?.items || []).map((i) => ({ productName: i.productName, productSku: i.productSku, expectedQty: i.expectedQty, receivedQty: i.receivedQty ?? i.expectedQty, qualityStatus: i.qualityStatus || 'GOOD' })) }} className="pt-4">
                        <Form.List name="items">
                            {(fields) => (
                                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div key={key} className="bg-slate-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-800">{receiveForm.getFieldValue(['items', name, 'productName'])}</div>
                                                <div className="text-xs text-gray-400 font-mono italic">{receiveForm.getFieldValue(['items', name, 'productSku'])}</div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-center"><div className="text-[10px] text-gray-400 font-bold">EXPECTED</div><div className="text-slate-500 font-heavy">{receiveForm.getFieldValue(['items', name, 'expectedQty'])}</div></div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-blue-500 font-bold uppercase">Actual Count</div>
                                                    <Form.Item {...restField} name={[name, 'receivedQty']} className="mb-0"><InputNumber min={0} className="w-24 rounded-lg shadow-sm border-blue-200" /></Form.Item>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-indigo-500 font-bold uppercase">Condition</div>
                                                    <Form.Item {...restField} name={[name, 'qualityStatus']} className="mb-0"><Select className="w-32 rounded-lg shadow-sm"><Option value="GOOD">Pristine</Option><Option value="DAMAGED">Damaged</Option></Select></Form.Item>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Form.List>
                    </Form>
                </Modal>

                {/* Info Drawer */}
                <Drawer key={selectedReceipt?.id || 'view'} title={`Transaction History: ${selectedReceipt?.grNumber}`} width={600} open={viewDrawerOpen} onClose={() => setViewDrawerOpen(false)} className="rounded-l-3xl" destroyOnClose>
                    {selectedReceipt && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl"><div className="text-[10px] font-bold text-gray-400">REFERENCE PO</div><div className="font-bold text-slate-800">{selectedReceipt.poNumber}</div></div>
                                <div className="bg-slate-50 p-4 rounded-2xl"><div className="text-[10px] font-bold text-gray-400">UNLOAD STATUS</div><Tag color={getStatusColor(selectedReceipt.status)}>{selectedReceipt.status}</Tag></div>
                            </div>
                            <Divider className="my-0" />
                            <Title level={5}>Inventory Commit Detail</Title>
                            <Table dataSource={selectedReceipt.items} size="small" pagination={false} columns={[
                                { title: 'Item', dataIndex: 'productName' },
                                { title: 'Exp', dataIndex: 'expectedQty' },
                                { title: 'Rcv', dataIndex: 'receivedQty', render: (v, r) => <span className={v < r.expectedQty ? 'text-red-500 font-bold' : 'text-green-600 font-bold'}>{v}</span> }
                            ]} />
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
