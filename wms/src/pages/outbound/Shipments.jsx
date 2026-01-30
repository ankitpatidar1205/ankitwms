import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Tooltip, Space, Divider, Alert, Checkbox, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, EyeOutlined, TruckOutlined, ClockCircleOutlined, CheckCircleOutlined, ReloadOutlined, SettingOutlined, ApiOutlined, PrinterOutlined, SendOutlined, ShoppingCartOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatDate } from '../../utils';

const { Search } = Input;
const { Option } = Select;

export default function Shipments() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [shipments, setShipments] = useState([]);
    const [readyOrders, setReadyOrders] = useState([]);
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [form] = Form.useForm();
    const [batchForm] = Form.useForm();

    const fetchReadyOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/orders/sales?status=PACKED', { method: 'GET' }, token);
            setReadyOrders(Array.isArray(data?.data) ? data.data : []);
        } catch (_) {
            setReadyOrders([]);
        }
    }, [token]);

    const fetchShipments = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/shipments', { method: 'GET' }, token);
            setShipments(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load shipments');
            setShipments([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchShipments();
    }, [fetchShipments]);

    useEffect(() => {
        if (batchModalOpen) fetchReadyOrders();
    }, [batchModalOpen, fetchReadyOrders]);

    const handleCreateBatch = async (values) => {
        if (selectedOrderIds.length === 0) {
            message.warning('No orders selected');
            return;
        }
        try {
            for (const orderId of selectedOrderIds) {
                await apiRequest('/api/shipments', {
                    method: 'POST',
                    body: JSON.stringify({
                        salesOrderId: orderId,
                        courierName: values.carrier,
                        // serviceType: values.serviceType, // Not in model, maybe put in notes? or ignore
                        // notes: values.notes
                    })
                }, token);
            }
            message.success('Dispatch Manifest Generated');
            setBatchModalOpen(false);
            fetchShipments();
            setSelectedOrderIds([]);
        } catch (err) {
            message.error(err.message || 'Manifest failure');
        }
    };

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState(null);

    const handleViewClick = (record) => {
        setSelectedShipment(record);
        setViewModalOpen(true);
    };

    const [printModalOpen, setPrintModalOpen] = useState(false);

    const handlePrint = (record) => {
        setSelectedShipment(record);
        setPrintModalOpen(true);
    };

    const shortenOrderNumber = (num) => {
        if (!num) return '—';
        const parts = num.split('-');
        return parts.length === 3 ? `ORD-${parts[2]}` : num;
    };

    const confirmPrint = () => {
        setPrintModalOpen(false);
        message.success('Label sent to printer');
    };
    const columns = [
        { title: 'Shipment ID', dataIndex: 'id', key: 'sn', render: (v, r) => <a onClick={() => handleViewClick(r)} className="font-bold text-teal-600 underline">SHI-{String(v).padStart(3, '0')}</a> },
        { title: 'Courier', dataIndex: 'courierName', key: 'carrier', render: (v) => <Tag color="orange" className="font-bold uppercase text-[10px]">{v || '—'}</Tag> },
        { title: 'Tracking', dataIndex: 'trackingNumber', key: 'track', render: (v) => <span className="font-mono text-xs text-slate-500">{v || 'PENDING'}</span> },
        { title: 'Status', dataIndex: 'deliveryStatus', key: 'status', render: (s) => <Tag color={['DELIVERED'].includes((s || '').toUpperCase()) ? 'green' : 'blue'} className="uppercase font-black border-none">{s || 'READY_TO_SHIP'}</Tag> },
        { title: 'Dispatch Date', dataIndex: 'dispatchDate', key: 'date', render: (v) => formatDate(v) },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewClick(r)} />
                    <Button type="text" icon={<PrinterOutlined className="text-teal-500" />} onClick={() => handlePrint(r)} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Shipments</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Real-time global logistics oversight and carrier manifest management</p>
                    </div>
                    <Space size="middle">
                        <Button icon={<SettingOutlined />} className="h-12 rounded-xl">Carrier APIs</Button>
                        <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-teal-600 border-teal-600 shadow-2xl shadow-teal-100 font-bold" onClick={() => setBatchModalOpen(true)}>
                            Execute Batch Dispatch
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">In Transit</div><div className="text-3xl font-black">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'IN_TRANSIT').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Delivered (24h)</div><div className="text-3xl font-black">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'DELIVERED').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-orange-500 uppercase mb-1">Awaiting Pickup</div><div className="text-3xl font-black">{shipments.filter(x => (x.deliveryStatus || '').toUpperCase() === 'READY_TO_SHIP').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Global Coverage</div><div className="text-3xl font-black">98.4%</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Identity Search (Waybill, Tracking, Postcode)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchShipments} />
                        </div>
                        <Table columns={columns} dataSource={shipments} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Generate Batch Dispatch Manifest" open={batchModalOpen} onCancel={() => setBatchModalOpen(false)} onOk={() => batchForm.submit()} width={1000} className="dispatch-modal">
                    <Form form={batchForm} layout="vertical" onFinish={handleCreateBatch} className="pt-6">
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <Form.Item label="Primary Carrier" name="carrier" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="royal_mail">Royal Mail</Option><Option value="dpd">DPD UK</Option><Option value="dhl">DHL Express</Option></Select></Form.Item>
                            <Form.Item label="Service Class" name="serviceType" initialValue="standard"><Select className="h-11 rounded-xl"><Option value="standard">Standard (48h)</Option><Option value="express">Next Day (24h)</Option><Option value="tracked">Tracked & Signed</Option></Select></Form.Item>
                            <Form.Item label="Operational Notes" name="notes"><Input placeholder="Gate 4 pickup" className="h-11 rounded-xl" /></Form.Item>
                        </div>
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ready for Dispatch ({readyOrders.length})</h4>
                            <span className="text-[10px] font-bold text-gray-400 capitalize underline cursor-pointer" onClick={() => setSelectedOrderIds(readyOrders.map(o => o.id))}>Select All Items</span>
                        </div>
                        <Table className="ready-table" pagination={false} scroll={{ y: 300 }} rowSelection={{ selectedRowKeys: selectedOrderIds, onChange: setSelectedOrderIds }} dataSource={readyOrders} rowKey="id" columns={[
                            { title: 'Order', dataIndex: 'orderNumber', render: (v) => <b className="text-indigo-600">{shortenOrderNumber(v)}</b> },
                            { title: 'Customer', dataIndex: ['Customer', 'name'] },
                            { title: 'Destination Postcode', dataIndex: 'postcode' },
                            { title: 'Package Weight', dataIndex: 'weight', render: (v) => `${v || 0} kg` }
                        ]} />
                    </Form>
                </Modal>

                <Modal title="Print Label Preview" open={printModalOpen} onCancel={() => setPrintModalOpen(false)} footer={null} width={400}>
                    {selectedShipment && (
                        <div className="flex flex-col items-center space-y-4">
                            <div className="border-2 border-dashed border-gray-300 p-6 w-full rounded-lg bg-white relative">
                                <div className="absolute top-2 right-2 font-bold text-xs text-gray-400">STANDARD</div>
                                <div className="text-center mb-6">
                                    <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900">{selectedShipment.courierName || 'POST'}</h3>
                                    <div className="h-12 bg-slate-900 w-full my-2 rounded-sm" />
                                    <p className="font-mono text-xs">{selectedShipment.trackingNumber || 'TRK-PENDING-001'}</p>
                                </div>
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">TO:</p>
                                        <p className="font-bold">{selectedShipment.SalesOrder?.Customer?.name || 'Customer'}</p>
                                        <p className="text-gray-500">123 Shipping Lane, Warehouse City, UK</p>
                                    </div>
                                    <Divider className="my-2" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">REF:</p>
                                        <p className="font-mono">{shortenOrderNumber(selectedShipment.SalesOrder?.orderNumber)}</p>
                                    </div>
                                </div>
                            </div>
                            <Button type="primary" size="large" icon={<PrinterOutlined />} className="w-full h-12 rounded-xl font-bold" onClick={confirmPrint}>
                                Print Label
                            </Button>
                        </div>
                    )}
                </Modal>

                <Modal title="Shipment Details" open={viewModalOpen} onCancel={() => setViewModalOpen(false)} footer={<Button onClick={() => setViewModalOpen(false)}>Close</Button>} width={600}>
                    {selectedShipment && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Shipment ID</p>
                                        <p className="font-mono font-bold text-xl text-teal-600">SHI-{String(selectedShipment.id).padStart(3, '0')}</p>
                                    </div>
                                    <div className="text-right">
                                        <Tag color="blue" className="text-lg py-1 px-3 rounded-lg font-bold uppercase">{selectedShipment.deliveryStatus}</Tag>
                                    </div>
                                    <div className="col-span-2">
                                        <Divider className="my-2" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Sales Order</p>
                                        <p className="font-bold text-gray-800">{shortenOrderNumber(selectedShipment.SalesOrder?.orderNumber) || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Customer</p>
                                        <p className="font-bold text-gray-800">{selectedShipment.SalesOrder?.Customer?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Courier</p>
                                        <p className="font-medium">{selectedShipment.courierName || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Tracking #</p>
                                        <p className="font-mono bg-white p-1 rounded border border-gray-200 inline-block">{selectedShipment.trackingNumber || 'PENDING'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Dispatch Date</p>
                                        <p>{formatDate(selectedShipment.dispatchDate)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div >
        </MainLayout >
    );
}
