import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, EnvironmentOutlined, HomeOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Option } = Select;
const { Search } = Input;

const ZONE_TYPE_LABELS = { STANDARD: 'Standard', COLD: 'Cold', FROZEN: 'Frozen', HAZMAT: 'Hazmat', QUARANTINE: 'Quarantine' };

export default function Zones() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [zones, setZones] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedZone, setSelectedZone] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
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

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/zones/${id}`, { method: 'DELETE' }, token);
            message.success('Zone deleted');
            fetchZones();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const filteredZones = zones.filter(z => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        const name = (z.name || '').toLowerCase();
        const code = (z.code || '').toLowerCase();
        const whName = (z.Warehouse?.name || '').toLowerCase();
        const whCode = (z.Warehouse?.code || '').toLowerCase();
        return name.includes(s) || code.includes(s) || whName.includes(s) || whCode.includes(s);
    });

    const columns = [
        { title: 'Zone Code', dataIndex: 'code', key: 'code', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Zone Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><EnvironmentOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Warehouse', key: 'wh', render: (_, r) => r.Warehouse ? <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{r.Warehouse.name} ({r.Warehouse.code})</span> : '—' },
        { title: 'Zone Type', dataIndex: 'zoneType', key: 'zoneType', width: 120, render: (t) => t ? <Tag color={t === 'COLD' ? 'cyan' : t === 'FROZEN' ? 'blue' : t === 'HAZMAT' || t === 'QUARANTINE' ? 'red' : 'default'}>{t}</Tag> : '—' },
        { title: 'Locations', key: 'locs', width: 100, render: (_, r) => <span className="text-purple-600 font-medium">{(r.locations?.length ?? 0)}</span> },
        { title: 'Created', dataIndex: 'createdAt', key: 'created', width: 100, render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedZone(r); setViewMode(true); setModalOpen(true); form.setFieldsValue({ code: r.code, name: r.name, warehouseId: r.warehouseId, zoneType: r.zoneType }); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedZone(r); setViewMode(false); form.setFieldsValue({ code: r.code, name: r.name, warehouseId: r.warehouseId, zoneType: r.zoneType }); setModalOpen(true); }} />
                    <Popconfirm title="Delete this zone?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
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
                        <h1 className="text-2xl font-medium text-blue-600">Warehouse Zones</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage warehouse zones and specialized storage areas</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setSelectedZone(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Zone
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Total Zones</div>
                            <div className="text-2xl font-medium text-blue-600">{zones.length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Standard</div>
                            <div className="text-2xl font-medium text-blue-600">{zones.filter(z => z.zoneType === 'STANDARD').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Cold</div>
                            <div className="text-2xl font-medium text-blue-600">{zones.filter(z => z.zoneType === 'COLD').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Frozen</div>
                            <div className="text-2xl font-medium text-purple-600">{zones.filter(z => z.zoneType === 'FROZEN').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Hazmat</div>
                            <div className="text-2xl font-medium text-red-600">{zones.filter(z => z.zoneType === 'HAZMAT').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Quarantine</div>
                            <div className="text-2xl font-medium text-red-600">{zones.filter(z => z.zoneType === 'QUARANTINE').length}</div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by zone name, code, or warehouse..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchZones}>Refresh</Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredZones}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} zones`, pageSize: 10 }}
                            scroll={{ x: 900 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Zone' : selectedZone ? 'Edit Zone' : 'Add Zone'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedZone(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedZone(null); }}>Close</Button>] : undefined}
                    width={560}
                >
                    {viewMode && selectedZone ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Code</div><div className="text-gray-900">{selectedZone.code ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Name</div><div className="text-gray-900">{selectedZone.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse</div><div className="text-gray-900">{selectedZone.Warehouse ? `${selectedZone.Warehouse.name} (${selectedZone.Warehouse.code})` : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Zone Type</div><div className="text-gray-900">{selectedZone.zoneType ? (ZONE_TYPE_LABELS[selectedZone.zoneType] || selectedZone.zoneType) : '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            <Form.Item label="Zone Code" name="code" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. ZN-A" className="rounded-lg" disabled={!!selectedZone} />
                            </Form.Item>
                            <Form.Item label="Zone Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Zone name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select warehouse' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" disabled={!!selectedZone}>
                                    {(Array.isArray(warehouses) ? warehouses : []).map(wh => <Option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Zone Type" name="zoneType">
                                <Select placeholder="Select zone type" className="rounded-lg" allowClear>
                                    <Option value="STANDARD">Standard</Option>
                                    <Option value="COLD">Cold</Option>
                                    <Option value="FROZEN">Frozen</Option>
                                    <Option value="HAZMAT">Hazmat</Option>
                                    <Option value="QUARANTINE">Quarantine</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
