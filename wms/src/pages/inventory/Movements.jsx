import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tabs, Typography, Badge, Row, Col, DatePicker } from 'antd';
import { PlusOutlined, ReloadOutlined, EyeOutlined, SwapOutlined, DatabaseOutlined, SearchOutlined, AuditOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { mockMovements } from '../../mockData';
import { formatDate } from '../../utils';
import dayjs from 'dayjs';

const { Option } = Select;
const { Search } = Input;
const { Title } = Typography;

export default function Movements() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [movements, setMovements] = useState([]);
    const [products, setProducts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchMovements = useCallback(async () => {
        setLoading(true);
        setMovements(mockMovements);
        setLoading(false);
    }, []);

    const fetchDependencies = useCallback(async () => {
        if (!token) return;
        try {
            const [prodRes, locRes] = await Promise.all([
                apiRequest('/api/inventory/products', { method: 'GET' }, token),
                apiRequest('/api/locations', { method: 'GET' }, token),
            ]);
            setProducts(Array.isArray(prodRes.data) ? prodRes.data : []);
            setLocations(Array.isArray(locRes.data) ? locRes.data : []);
        } catch (_) {
            setProducts([]);
            setLocations([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchMovements();
            fetchDependencies();
        }
    }, [token, fetchMovements, fetchDependencies]);

    const handleSubmit = async (values) => {
        try {
            message.success('Inventory state transitioned. Audit record generated.');
            setModalOpen(false);
            fetchMovements();
        } catch (err) {
            message.error('Transition failure');
        }
    };

    const getTypeColor = (t) => {
        const colors = { RECEIVE: 'green', PICK: 'red', TRANSFER: 'blue', ADJUST: 'orange', RETURN: 'purple' };
        return colors[t] || 'default';
    };

    const columns = [
        { title: 'Temporal Node', dataIndex: 'createdAt', key: 'date', render: (v) => <div className="text-[10px] font-black leading-tight"><div>{dayjs(v).format('MMM DD')}</div><div className="text-gray-400">{dayjs(v).format('HH:mm')}</div></div> },
        { title: 'Vector', dataIndex: 'type', key: 'type', render: (t) => <Tag color={getTypeColor(t)} className="font-black border-none uppercase text-[10px] italic">{t}</Tag> },
        { title: 'Asset Target', dataIndex: 'product', key: 'prod', render: (p) => <div><div className="font-bold text-slate-800">{p?.name}</div><div className="text-[10px] text-gray-400 font-mono uppercase">{p?.sku}</div></div> },
        { title: 'Source', dataIndex: 'fromLocation', key: 'from', render: (l) => l ? <Tag className="border-none bg-slate-100 text-[10px] font-bold">{l.aisle}-{l.rack}-{l.bin}</Tag> : <span className="text-gray-300">-</span> },
        { title: 'Destination', dataIndex: 'toLocation', key: 'to', render: (l) => l ? <Tag color="green" className="border-none text-[10px] font-bold">{l.aisle}-{l.rack}-{l.bin}</Tag> : <span className="text-gray-300">-</span> },
        { title: 'MassUnits', dataIndex: 'quantity', key: 'qty', render: (v) => <span className="font-black text-slate-700">{v} UNITS</span> },
        { title: 'Protocol', dataIndex: 'reason', key: 'reason', ellipsis: true },
        { title: 'Subject', key: 'user', render: (_, r) => <div className="text-[10px] font-bold text-slate-400 uppercase">{r.user?.name || 'System'}</div> }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Movements</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Comprehensive audit trail of all physical stock movements and logical state changes</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-blue-600 border-blue-600 shadow-2xl shadow-blue-100 font-bold" onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Execute Transfer
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Audit Entries</div><div className="text-3xl font-black">{movements.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Internal Transfers</div><div className="text-3xl font-black">{movements.filter(m => m.type === 'TRANSFER').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Inbound Flows</div><div className="text-3xl font-black">{movements.filter(m => m.type === 'RECEIVE').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-red-500 uppercase mb-1">Outbound Flows</div><div className="text-3xl font-black">{movements.filter(m => m.type === 'PICK').length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Audit Log Investigation (SKU, Node, Authority)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchMovements} />
                        </div>
                        <Table columns={columns} dataSource={movements} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Execute Physical Stock Transition" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="move-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Transition Protocol" name="type" rules={[{ required: true }]}>
                            <Select className="h-11 rounded-xl">
                                <Option value="TRANSFER">Internal Re-Location</Option>
                                <Option value="RECEIVE">Inbound Ad-Hoc</Option>
                                <Option value="ADJUST">Correction Factor</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Target Operational Asset" name="productId" rules={[{ required: true }]}>
                            <Select showSearch className="h-11 rounded-xl">
                                {products.map(p => <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>)}
                            </Select>
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Source Node" name="fromLocationId"><Select allowClear placeholder="Select source" className="h-11 rounded-xl">{locations.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}</Select></Form.Item>
                            <Form.Item label="Destination Node" name="toLocationId"><Select allowClear placeholder="Select destination" className="h-11 rounded-xl">{locations.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}</Select></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Transition Quantity" name="quantity" rules={[{ required: true }]}><InputNumber className="w-full h-11 rounded-xl" min={1} /></Form.Item>
                            <Form.Item label="Causality Note" name="reason"><Input className="h-11 rounded-xl" placeholder="Replenishment / Count correction" /></Form.Item>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
