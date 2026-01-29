import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Card, Modal, Form, message, Tag, Tabs, Select, Typography, Badge, Space } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, InboxOutlined, CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { mockCycleCounts } from '../../mockData';
import { formatDate } from '../../utils';

const { Search } = Input;
const { Title } = Typography;
const { Option } = Select;

export default function CycleCounts() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [cycleCounts, setCycleCounts] = useState([]);
    const [locations, setLocations] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();

    const fetchCycleCounts = useCallback(async () => {
        setLoading(true);
        setCycleCounts(mockCycleCounts);
        setLoading(false);
    }, []);

    const fetchLocations = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/locations', { method: 'GET' }, token);
            setLocations(Array.isArray(data.data) ? data.data : []);
        } catch (_) {
            setLocations([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchCycleCounts();
            fetchLocations();
        }
    }, [token, fetchCycleCounts, fetchLocations]);

    const handleSubmit = async (values) => {
        try {
            message.success('Inventory audit mission initialized.');
            setModalOpen(false);
            fetchCycleCounts();
        } catch (err) {
            message.error('Audit initiation failed');
        }
    };

    const columns = [
        { title: 'Audit ID', dataIndex: 'referenceNumber', key: 'ref', render: (v, r) => <span className="font-mono text-[10px] font-black">{v || `CC-${r.id.slice(0, 8)}`}</span> },
        { title: 'Schedule', dataIndex: 'scheduledDate', key: 'date', render: (v) => <span className="text-gray-400 font-medium">{formatDate(v)}</span> },
        { title: 'Target Node', key: 'loc', render: (_, r) => r.location ? `${r.location.aisle}-${r.location.rack}-${r.location.bin}` : 'Global' },
        { title: 'Asset Count', dataIndex: 'itemsCount', key: 'cnt', render: (v) => <Badge count={v || 0} showZero color="#6366f1" /> },
        { title: 'Discrepancy', dataIndex: 'discrepancies', key: 'disc', render: (v) => <Tag color={v > 0 ? 'red' : 'green'} className="font-black border-none">{v || 0} DELTA</Tag> },
        { title: 'State', dataIndex: 'status', key: 'status', render: (v) => <Tag color={v === 'COMPLETED' ? 'green' : 'blue'} className="font-heavy uppercase">{v}</Tag> },
        { title: 'Auditor', key: 'user', render: (_, r) => r.countedBy?.name || 'System' }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Cycle Counts</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Periodic inventory verification missions and coordinate-level stock audits</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-indigo-600 border-indigo-600 shadow-2xl shadow-indigo-100 font-bold" onClick={() => { form.resetFields(); setModalOpen(true); }}>
                        Initialize Audit
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Missions</div><div className="text-3xl font-black">{cycleCounts.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Verified Correct</div><div className="text-3xl font-black">{cycleCounts.filter(c => c.status === 'COMPLETED' && !c.discrepancies).length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-red-500 uppercase mb-1">Delta Detected</div><div className="text-3xl font-black">{cycleCounts.filter(c => (c.discrepancies || 0) > 0).length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Active Now</div><div className="text-3xl font-black">{cycleCounts.filter(c => c.status === 'IN_PROGRESS').length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Audit Mission Search (Reference, Node, Counter)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchCycleCounts} />
                        </div>
                        <Table columns={columns} dataSource={cycleCounts} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title="Initialize Asset Verification Mission" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="cc-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Mission Code-Name" name="name" rules={[{ required: true }]}><Input placeholder="Weekly Zone-B Reconciliation" className="h-11 rounded-xl" /></Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Audit Methodology" name="type" initialValue="FULL"><Select className="h-11 rounded-xl"><Option value="FULL">Total System Audit</Option><Option value="PARTIAL">Sample Verification</Option><Option value="SPOT">Spot Check</Option></Select></Form.Item>
                            <Form.Item label="Target Coordinate" name="locationId" rules={[{ required: true }]}>
                                <Select showSearch placeholder="Search Nodes" className="h-11 rounded-xl">
                                    {locations.map(l => <Option key={l.id} value={l.id}>{l.name} ({l.aisle}-{l.rack})</Option>)}
                                </Select>
                            </Form.Item>
                        </div>
                        <Form.Item label="Temporal Window (Schedule Date)" name="scheduledDate" rules={[{ required: true }]}><Input type="date" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Operational Directives" name="notes"><Input.TextArea rows={3} className="rounded-xl" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
