import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Space, Checkbox, InputNumber, Divider, Row, Col, Descriptions, List, Avatar, Badge } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, FileTextOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ReloadOutlined, ShoppingCartOutlined, SwapOutlined, DollarOutlined, DeleteOutlined, EditOutlined, PrinterOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { mockReturns } from '../../mockData';
import { formatDate, formatCurrency } from '../../utils';

const { Search } = Input;
const { Option } = Select;

export default function Returns() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [returns, setReturns] = useState([]);
    const [orders, setOrders] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [form] = Form.useForm();

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        setReturns(mockReturns);
        setLoading(false);
    }, []);

    const fetchOrders = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            setOrders(Array.isArray(data.data) ? data.data : []);
        } catch (_) {
            setOrders([]);
        }
    }, [token]);

    useEffect(() => {
        fetchReturns();
        fetchOrders();
    }, [fetchReturns, fetchOrders]);

    const handleSubmit = async (values) => {
        if (!selectedOrder || selectedItems.length === 0) {
            message.error('Selection required');
            return;
        }
        try {
            message.success('RMA Authorized');
            setModalOpen(false);
            fetchReturns();
        } catch (err) {
            message.error('Processing error');
        }
    };

    const columns = [
        { title: 'RMA #', dataIndex: 'rmaNumber', key: 'rma', render: (v) => <span className="font-bold text-red-600 underline">{v}</span> },
        { title: 'Order Ref', dataIndex: 'orderNumber', key: 'order' },
        { title: 'Recipient', dataIndex: 'customer', key: 'cust' },
        { title: 'Return Type', dataIndex: 'type', key: 'type', render: (v) => <Tag color="purple" bordered={false} className="font-bold uppercase text-[10px]">{v}</Tag> },
        { title: 'RMA State', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'completed' ? 'green' : 'orange'} className="uppercase font-black">{s}</Tag> },
        { title: 'Logged On', dataIndex: 'requestedDate', key: 'date', render: (v) => formatDate(v) },
        { title: 'Refund Val', dataIndex: 'value', key: 'val', render: (v) => <span className="font-bold">{formatCurrency(v)}</span> },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} />
                    <Button type="text" icon={<PrinterOutlined className="text-red-500" />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Returns</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Asset recovery and return merchandise authorization protocols</p>
                    </div>
                    <Button type="primary" icon={<UndoOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-red-600 border-red-600 shadow-2xl shadow-red-100 font-bold" onClick={() => setModalOpen(true)}>
                        Initiate Recovery
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Open RMAs</div><div className="text-3xl font-black">{returns.filter(x => x.status !== 'completed').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">In Processing</div><div className="text-3xl font-black">{returns.filter(x => x.status === 'processing').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Recovered Assets</div><div className="text-3xl font-black">{returns.filter(x => x.status === 'completed').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-red-500 uppercase mb-1">Financial Liability</div><div className="text-3xl font-black">{formatCurrency(returns.reduce((s, r) => s + (r.value || 0), 0))}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Identity Search (RMA # / Customer / Order #)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchReturns} />
                        </div>
                        <Table columns={columns} dataSource={returns} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Issue Merchandise Return Authorization" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={900} className="return-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <Form.Item label="Select Source Transaction" name="orderId" rules={[{ required: true }]}>
                                <Select showSearch className="h-12" placeholder="Scan or Select Order Number" onChange={(v) => setSelectedOrder(orders.find(o => o.id === v))}>
                                    {orders.map(o => <Option key={o.id} value={o.id}>{o.orderNumber} - {o.customer?.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </div>

                        {selectedOrder && (
                            <div className="animate-in slide-in-from-bottom-4 duration-500">
                                <Divider orientation="left"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transaction Items</span></Divider>
                                <Table className="item-select-table" pagination={false} rowSelection={{ onChange: (keys, rows) => setSelectedItems(rows) }} dataSource={selectedOrder.items} rowKey="id" columns={[
                                    { title: 'Sku / Item', dataIndex: ['product', 'name'], render: (v, r) => <div><div className="font-bold">{v}</div><div className="text-xs text-slate-400">{r.product.sku}</div></div> },
                                    { title: 'Ordered', dataIndex: 'quantity', align: 'right' },
                                    { title: 'Return Qty', align: 'right', render: () => <InputNumber min={1} defaultValue={1} /> }
                                ]} />

                                <div className="mt-8 grid grid-cols-2 gap-6">
                                    <Form.Item label="Recovery Logic" name="type" initialValue="Return"><Select className="h-11 rounded-xl"><Option value="Return">Full Return</Option><Option value="Exchange">Product Exchange</Option><Option value="Refund">Direct Credit</Option></Select></Form.Item>
                                    <Form.Item label="System Reason" name="reason" initialValue="Damaged"><Select className="h-11 rounded-xl"><Option value="Damaged">Damaged / Defective</Option><Option value="Wrong Item">Incorrect Dispatch</Option><Option value="Quality">Substandard Quality</Option></Select></Form.Item>
                                </div>
                                <Form.Item label="Adjuster Notes" name="notes"><Input.TextArea placeholder="Internal recovery notes..." rows={3} className="rounded-2xl" /></Form.Item>
                            </div>
                        )}
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
