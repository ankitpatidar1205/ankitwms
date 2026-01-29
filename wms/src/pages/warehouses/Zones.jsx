import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Modal, Form, Input, Select, Drawer, Badge, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Option } = Select;
const { Search } = Input;
const { Title } = Typography;

export default function Zones() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [zones, setZones] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const fetchZones = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/zones', { method: 'GET' }, token);
            setZones(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load zones');
            setZones([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setWarehouses([]);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchZones();
            fetchWarehouses();
        }
    }, [token, fetchZones, fetchWarehouses]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            if (selectedZone) {
                await apiRequest(`/api/zones/${selectedZone.id}`, { method: 'PUT', body: JSON.stringify(values) }, token);
                message.success('Zone updated');
            } else {
                await apiRequest('/api/zones', { method: 'POST', body: JSON.stringify(values) }, token);
                message.success('Zone created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedZone(null);
            fetchZones();
        } catch (err) {
            message.error(err.message || 'Failed to save zone');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { title: 'Zone Code', dataIndex: 'code', key: 'code', render: (v) => <Tag color="blue" className="font-black border-none uppercase text-[10px]">{v || '—'}</Tag> },
        { title: 'Zone Name', dataIndex: 'name', key: 'name', render: (v) => <span className="font-bold text-slate-700">{v}</span> },
        { title: 'Warehouse', dataIndex: ['Warehouse', 'name'], key: 'wh', render: (_, r) => r.Warehouse?.name || '—' },
        { title: 'Zone Type', dataIndex: 'zoneType', key: 'type', render: (t) => <Tag color={t === 'COLD' ? 'cyan' : t === 'FROZEN' ? 'blue' : 'default'} bordered={false}>{t || '—'}</Tag> },
        { title: 'Asset Capacity', key: 'locs', render: (_, r) => <Badge count={r.locations?.length || 0} showZero color="#6366f1" /> },
        {
            title: 'Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedZone(r); setDetailOpen(true); }} />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => { setSelectedZone(r); form.setFieldsValue({ code: r.code, name: r.name, warehouseId: r.warehouseId, zoneType: r.zoneType }); setModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { if (window.confirm('Delete this zone?')) apiRequest(`/api/zones/${r.id}`, { method: 'DELETE' }, token).then(() => { message.success('Zone deleted'); fetchZones(); }).catch(e => message.error(e.message)); }} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Zones</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Internal warehouse zoning and climate-controlled environment management</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-slate-100 font-bold" onClick={() => { setSelectedZone(null); form.resetFields(); setModalOpen(true); }}>
                        Establish Zone
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Clusters</div><div className="text-3xl font-black">{zones.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Standard Storage</div><div className="text-3xl font-black">{zones.filter(z => z.zoneType === 'STANDARD').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-cyan-500 uppercase mb-1">Cold Chain</div><div className="text-3xl font-black">{zones.filter(z => z.zoneType === 'COLD').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-red-500 uppercase mb-1">Hazmat Critical</div><div className="text-3xl font-black">{zones.filter(z => z.zoneType === 'HAZMAT').length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Identity Search (Code, Name, Warehouse)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                            <Button icon={<ReloadOutlined />} onClick={fetchZones} />
                        </div>
                        <Table columns={columns} dataSource={zones} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedZone ? 'Edit Zone' : 'Add Zone'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedZone(null); }} onOk={() => form.submit()} okButtonProps={{ loading: saving }} width={600} className="node-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Zone Code" name="code" rules={[{ required: true }]}><Input placeholder="e.g. ZN-A" className="h-11 rounded-xl" disabled={!!selectedZone} /></Form.Item>
                        <Form.Item label="Zone Name" name="name" rules={[{ required: true }]}><Input placeholder="Zone name" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select warehouse' }]}>
                            <Select placeholder="Select warehouse" className="h-11 rounded-xl" disabled={!!selectedZone}>
                                {(Array.isArray(warehouses) ? warehouses : []).map(wh => <Option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item label="Zone Type" name="zoneType">
                            <Select placeholder="Select zone type" className="h-11 rounded-xl" allowClear>
                                <Option value="STANDARD">Standard</Option>
                                <Option value="COLD">Cold</Option>
                                <Option value="FROZEN">Frozen</Option>
                                <Option value="HAZMAT">Hazmat</Option>
                                <Option value="QUARANTINE">Quarantine</Option>
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>

                <Drawer title={`Spatial Audit: ${selectedZone?.name}`} width={500} open={detailOpen} onClose={() => setDetailOpen(false)} className="rounded-l-3xl">
                    {selectedZone && (
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                <Title level={5} className="uppercase text-[10px] tracking-widest text-slate-400 mb-4">Functional Capacity</Title>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><div className="text-xs text-gray-400">Total Nodes</div><div className="text-xl font-black">{selectedZone.locations?.length || 0}</div></div>
                                    <div><div className="text-xs text-gray-400">Utilization</div><div className="text-xl font-black text-blue-600">84%</div></div>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
