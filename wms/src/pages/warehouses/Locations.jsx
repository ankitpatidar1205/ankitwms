import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, InputNumber, Select, Tag, Space, Card, Form, Modal, message, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, EnvironmentOutlined, HomeOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Search } = Input;
const { Option } = Select;

const LOCATION_TYPE_LABELS = { PICK: 'Pick', BULK: 'Bulk', QUARANTINE: 'Quarantine', STAGING: 'Staging' };

export default function WarehouseLocations() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState([]);
    const [zones, setZones] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const selectedWarehouseId = Form.useWatch('warehouseId', form);

    const fetchLocations = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/locations', { method: 'GET' }, token);
            const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            setLocations(list);
        } catch (err) {
            message.error(err.message || 'Failed to load locations');
            setLocations([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchZones = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/zones', { method: 'GET' }, token);
            setZones(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setZones([]);
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
            fetchLocations();
            fetchZones();
            fetchWarehouses();
        }
    }, [token, fetchLocations, fetchZones, fetchWarehouses]);

    const zonesByWarehouse = selectedWarehouseId ? zones.filter(z => z.warehouseId === selectedWarehouseId) : zones;

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                zoneId: values.zoneId,
                code: values.code,
                aisle: values.aisle,
                rack: values.rack,
                shelf: values.shelf,
                bin: values.bin,
                locationType: values.locationType,
                pickSequence: values.pickSequence,
                maxWeight: values.maxWeight,
                heatSensitive: values.heatSensitive,
            };
            if (selectedLocation) {
                await apiRequest(`/api/locations/${selectedLocation.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Location updated');
            } else {
                await apiRequest('/api/locations', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Location created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedLocation(null);
            fetchLocations();
        } catch (err) {
            message.error(err.message || 'Failed to save location');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/locations/${id}`, { method: 'DELETE' }, token);
            message.success('Location deleted');
            fetchLocations();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const setFormValues = (r) => {
        const whId = r.Zone?.warehouseId ?? (r.zoneId && zones.find(z => z.id === r.zoneId)?.warehouseId);
        form.setFieldsValue({
            name: r.name,
            code: r.code,
            warehouseId: whId,
            zoneId: r.zoneId,
            aisle: r.aisle,
            rack: r.rack,
            shelf: r.shelf,
            bin: r.bin,
            locationType: r.locationType,
            pickSequence: r.pickSequence,
            maxWeight: r.maxWeight,
            heatSensitive: r.heatSensitive,
        });
    };

    const filteredLocations = locations.filter(l => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        const name = (l.name || '').toLowerCase();
        const code = (l.code || '').toLowerCase();
        const whName = (l.Zone?.Warehouse?.name || '').toLowerCase();
        const whCode = (l.Zone?.Warehouse?.code || '').toLowerCase();
        return name.includes(s) || code.includes(s) || whName.includes(s) || whCode.includes(s);
    });

    const columns = [
        { title: 'Location Name', dataIndex: 'name', key: 'name', width: 160, render: (v) => <span className="flex items-center gap-2 font-medium text-blue-600"><EnvironmentOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Warehouse', key: 'wh', width: 180, render: (_, r) => r.Zone?.Warehouse ? <span className="flex items-center gap-2"><HomeOutlined className="text-gray-400" />{r.Zone.Warehouse.name} ({r.Zone.Warehouse.code})</span> : '—' },
        { title: 'Aisle', dataIndex: 'aisle', key: 'aisle', width: 80, render: (v) => v ?? '—' },
        { title: 'Rack', dataIndex: 'rack', key: 'rack', width: 80, render: (v) => v ?? '—' },
        { title: 'Shelf', dataIndex: 'shelf', key: 'shelf', width: 80, render: (v) => v ?? '—' },
        { title: 'Bin', dataIndex: 'bin', key: 'bin', width: 80, render: (v) => v ?? '—' },
        { title: 'Location Type', dataIndex: 'locationType', key: 'type', width: 110, render: (t) => t ? <Tag color={t === 'PICK' ? 'green' : t === 'BULK' ? 'blue' : 'orange'}>{t}</Tag> : '—' },
        { title: 'Pick Sequence', dataIndex: 'pickSequence', key: 'seq', width: 100, render: (v) => v != null ? v : '—' },
        { title: 'Max Weight (kg)', dataIndex: 'maxWeight', key: 'maxWeight', width: 110, render: (v) => v != null ? v : '—' },
        { title: 'Heat Sensitive', dataIndex: 'heatSensitive', key: 'heat', width: 100, render: (v) => v ? <Tag color="orange">{String(v)}</Tag> : '—' },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedLocation(r); setViewMode(true); setModalOpen(true); setFormValues(r); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => { setSelectedLocation(r); setViewMode(false); setFormValues(r); setModalOpen(true); }} />
                    <Popconfirm title="Delete this location?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
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
                        <h1 className="text-2xl font-medium text-blue-600">Warehouse Locations</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Manage storage locations across warehouses</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setSelectedLocation(null); setViewMode(false); form.resetFields(); setModalOpen(true); }}>
                        Add Location
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Total Locations</div>
                            <div className="text-2xl font-medium text-blue-600">{locations.length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Pick</div>
                            <div className="text-2xl font-medium text-green-600">{locations.filter(l => l.locationType === 'PICK').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Bulk</div>
                            <div className="text-2xl font-medium text-blue-600">{locations.filter(l => l.locationType === 'BULK').length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Warehouses</div>
                            <div className="text-2xl font-medium text-purple-600">{new Set(locations.map(l => l.Zone?.Warehouse?.id).filter(Boolean)).size}</div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by location name, code, or warehouse..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                            <Button icon={<ReloadOutlined />} onClick={fetchLocations}>Refresh</Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredLocations}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} locations`, pageSize: 10 }}
                            scroll={{ x: 1200 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Location' : selectedLocation ? 'Edit Location' : 'Add Location'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedLocation(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedLocation(null); }}>Close</Button>] : undefined}
                    width={620}
                >
                    {viewMode && selectedLocation ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Location Name</div><div className="text-gray-900">{selectedLocation.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Warehouse</div><div className="text-gray-900">{selectedLocation.Zone?.Warehouse ? `${selectedLocation.Zone.Warehouse.name} (${selectedLocation.Zone.Warehouse.code})` : '—'}</div></div>
                            <div className="grid grid-cols-4 gap-3">
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Aisle</div><div className="text-gray-900">{selectedLocation.aisle ?? '—'}</div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Rack</div><div className="text-gray-900">{selectedLocation.rack ?? '—'}</div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Shelf</div><div className="text-gray-900">{selectedLocation.shelf ?? '—'}</div></div>
                                <div><div className="text-gray-500 text-sm font-normal mb-1">Bin</div><div className="text-gray-900">{selectedLocation.bin ?? '—'}</div></div>
                            </div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Location Type</div><div className="text-gray-900">{selectedLocation.locationType ? (LOCATION_TYPE_LABELS[selectedLocation.locationType] || selectedLocation.locationType) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Pick Sequence</div><div className="text-gray-900">{selectedLocation.pickSequence != null ? selectedLocation.pickSequence : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Max Weight (kg)</div><div className="text-gray-900">{selectedLocation.maxWeight != null ? selectedLocation.maxWeight : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Heat Sensitive Location</div><div className="text-gray-900">{selectedLocation.heatSensitive ?? '—'}</div></div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            <Form.Item label="Location Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Location name" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="Warehouse" name="warehouseId" rules={[{ required: true, message: 'Select warehouse' }]}>
                                <Select placeholder="Select warehouse" className="rounded-lg" allowClear onChange={() => form.setFieldValue('zoneId', undefined)}>
                                    {(Array.isArray(warehouses) ? warehouses : []).map(wh => <Option key={wh.id} value={wh.id}>{wh.name} ({wh.code})</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Zone" name="zoneId" rules={[{ required: true, message: 'Select zone' }]}>
                                <Select placeholder="Select zone (choose warehouse first)" className="rounded-lg" disabled={!selectedWarehouseId} allowClear>
                                    {zonesByWarehouse.map(z => <Option key={z.id} value={z.id}>{z.name} ({z.code})</Option>)}
                                </Select>
                            </Form.Item>
                            <div className="grid grid-cols-4 gap-3">
                                <Form.Item label="Aisle" name="aisle"><Input placeholder="Aisle" className="rounded-lg" /></Form.Item>
                                <Form.Item label="Rack" name="rack"><Input placeholder="Rack" className="rounded-lg" /></Form.Item>
                                <Form.Item label="Shelf" name="shelf"><Input placeholder="Shelf" className="rounded-lg" /></Form.Item>
                                <Form.Item label="Bin" name="bin"><Input placeholder="Bin" className="rounded-lg" /></Form.Item>
                            </div>
                            <Form.Item label="Location Type" name="locationType">
                                <Select placeholder="Select location type" className="rounded-lg" allowClear>
                                    <Option value="PICK">Pick</Option>
                                    <Option value="BULK">Bulk</Option>
                                    <Option value="QUARANTINE">Quarantine</Option>
                                    <Option value="STAGING">Staging</Option>
                                </Select>
                            </Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Pick Sequence" name="pickSequence">
                                    <InputNumber placeholder="Sequence" className="w-full rounded-lg" min={0} />
                                </Form.Item>
                                <Form.Item label="Max Weight (kg)" name="maxWeight">
                                    <InputNumber placeholder="Max weight" className="w-full rounded-lg" min={0} step={0.01} />
                                </Form.Item>
                            </div>
                            <Form.Item label="Heat Sensitive Location" name="heatSensitive">
                                <Select placeholder="Select" className="rounded-lg" allowClear>
                                    <Option value="yes">Yes</Option>
                                    <Option value="no">No</Option>
                                </Select>
                            </Form.Item>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
