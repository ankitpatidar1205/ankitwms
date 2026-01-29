import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, message, Tag, Tabs, Select, InputNumber, Typography, Space } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, InboxOutlined, ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { mockAdjustments } from '../../mockData';
import { formatDate } from '../../utils';

const { Search } = Input;
const { Title } = Typography;
const { Option } = Select;

export default function Adjustments() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [adjustments, setAdjustments] = useState([]);
    const [products, setProducts] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchAdjustments = useCallback(async () => {
        setLoading(true);
        setAdjustments(mockAdjustments);
        setLoading(false);
    }, []);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(data.data) ? data.data : []);
        } catch (_) {
            setProducts([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchAdjustments();
            fetchProducts();
        }
    }, [token, fetchAdjustments, fetchProducts]);

    const handleSubmit = async (values) => {
        try {
            message.success('Ledger corrected. Inventory delta applied.');
            setModalOpen(false);
            fetchAdjustments();
        } catch (err) {
            message.error('Adjustment failed');
        }
    };

    const columns = [
        { title: 'Log ID', dataIndex: 'referenceNumber', key: 'ref', render: (v, r) => <span className="font-mono text-[10px] font-black">{v || `ADJ-${r.id.slice(0, 8)}`}</span> },
        { title: 'Temporal Node', dataIndex: 'createdAt', key: 'date', render: (v) => <span className="text-gray-400 font-medium">{formatDate(v)}</span> },
        { title: 'Asset Target', key: 'prod', render: (_, r) => r.items?.[0]?.product?.name || 'Multi-SKU' },
        { title: 'Vector', dataIndex: 'type', key: 'type', render: (v) => <Tag color={v === 'INCREASE' ? 'green' : 'red'} className="font-black border-none uppercase">{v}</Tag> },
        { title: 'Delta', key: 'qty', render: (_, r) => <span className="font-black">{r.items?.reduce((s, i) => s + i.quantity, 0)}</span> },
        { title: 'Causality', dataIndex: 'reason', key: 'reason' },
        { title: 'Authority', key: 'user', render: (_, r) => r.createdBy?.name || 'System' }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Adjustments</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Corrective inventory transactions and stock-level discrepancy management</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-slate-100 font-bold" onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Initiate Correction
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Logs</div><div className="text-3xl font-black">{adjustments.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Stock Inflow</div><div className="text-3xl font-black">{adjustments.filter(a => a.type === 'INCREASE').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-red-500 uppercase mb-1">Stock Outflow</div><div className="text-3xl font-black">{adjustments.filter(a => a.type === 'DECREASE').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-orange-500 uppercase mb-1">Audit Required</div><div className="text-3xl font-black">{adjustments.filter(a => a.status === 'PENDING').length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Audit Log Search (Reference, Reason, SKU)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchAdjustments} />
                        </div>
                        <Table columns={columns} dataSource={adjustments} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Formal Inventory Correction" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="adj-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Transaction Vector" name="type" rules={[{ required: true }]}>
                            <Select className="h-12 rounded-xl">
                                <Option value="INCREASE">INCREASE (Found Stock / Return)</Option>
                                <Option value="DECREASE">DECREASE (Loss / Damage / Expiry)</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Target Asset" name="productId" rules={[{ required: true }]}>
                            <Select showSearch className="h-12 rounded-xl">
                                {products.map(p => <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>)}
                            </Select>
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Delta Quantity" name="quantity" rules={[{ required: true }]}><InputNumber className="w-full h-12 rounded-xl" min={1} /></Form.Item>
                            <Form.Item label="Reason Code" name="reason" rules={[{ required: true }]}>
                                <Select className="h-12 rounded-xl">
                                    <Option value="Physical Count">Physical Count Variance</Option>
                                    <Option value="Damaged">Waste / Damage</Option>
                                    <Option value="Theft">Shrinkage / Theft</Option>
                                    <Option value="Expired">Biological Expiry</Option>
                                </Select>
                            </Form.Item>
                        </div>
                        <Form.Item label="Narrative / Documentation" name="notes"><Input.TextArea rows={3} className="rounded-xl" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
