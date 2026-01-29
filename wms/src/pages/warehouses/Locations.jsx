import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, InputNumber, Select, Tag, Space, Card, Form, Drawer, Modal, message, Badge, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

export default function WarehouseLocations() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState([]);
    const [zones, setZones] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    const fetchLocations = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/locations', { method: 'GET' }, token);
            setLocations(Array.isArray(data?.data) ? data.data : []);
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

    useEffect(() => {
        if (token) {
            fetchLocations();
            fetchZones();
        }
    }, [token, fetchLocations, fetchZones]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = { code: values.code, name: values.name, zoneId: values.zoneId, aisle: values.aisle, rack: values.rack, shelf: values.shelf, bin: values.bin, locationType: values.locationType, pickSequence: values.pickSequence, maxWeight: values.maxWeight };
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

    const columns = [
        { title: 'Location Code', dataIndex: 'code', key: 'code', render: (v) => <Tag color="blue" className="font-black border-none text-[10px] uppercase font-mono">{v || '—'}</Tag> },
        { title: 'Location Name', dataIndex: 'name', key: 'name', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
        { title: 'Warehouse', key: 'wh', render: (_, r) => r.Zone?.Warehouse?.name || '—' },
        { title: 'Aisle', dataIndex: 'aisle', key: 'aisle', render: (v) => v || '—' },
        { title: 'Rack', dataIndex: 'rack', key: 'rack', render: (v) => v || '—' },
        { title: 'Shelf', dataIndex: 'shelf', key: 'shelf', render: (v) => v || '—' },
        { title: 'Bin', dataIndex: 'bin', key: 'bin', render: (v) => v || '—' },
        { title: 'Type', dataIndex: 'locationType', key: 'type', render: (t) => <Tag color={t === 'PICK' ? 'green' : 'orange'} bordered={false}>{t || '—'}</Tag> },
        { title: 'Pick Seq', dataIndex: 'pickSequence', key: 'seq', render: (v) => v != null ? v : '—' },
        { title: 'Max Weight', dataIndex: 'maxWeight', key: 'maxWeight', render: (v) => v != null ? v : '—' },
        {
            title: 'Actions',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedLocation(r); setDrawerOpen(true); }} />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => { setSelectedLocation(r); form.setFieldsValue({ code: r.code, name: r.name, zoneId: r.zoneId, aisle: r.aisle, rack: r.rack, shelf: r.shelf, bin: r.bin, locationType: r.locationType, pickSequence: r.pickSequence, maxWeight: r.maxWeight }); setModalOpen(true); }} />
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => { if (window.confirm('Delete this location?')) apiRequest(`/api/locations/${r.id}`, { method: 'DELETE' }, token).then(() => { message.success('Location deleted'); fetchLocations(); }).catch(e => message.error(e.message)); }} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Warehouse Locations</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Manage storage locations across warehouses</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-emerald-600 border-emerald-600 shadow-2xl shadow-emerald-100 font-bold" onClick={() => { setSelectedLocation(null); form.resetFields(); setModalOpen(true); }}>
                        Add Location
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Coordinates</div><div className="text-3xl font-black">{locations.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">Picking Nodes</div><div className="text-3xl font-black">{locations.filter(l => l.locationType === 'PICK').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Bulk Reserves</div><div className="text-3xl font-black">{locations.filter(l => l.locationType === 'BULK').length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">Mapped Facilities</div><div className="text-3xl font-black">{new Set(locations.map(l => l.Zone?.Warehouse?.id).filter(Boolean)).size}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Search by location, code, or warehouse..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} />
                            <Button icon={<ReloadOutlined />} onClick={fetchLocations} />
                        </div>
                        <Table columns={columns} dataSource={locations.filter(l => !searchText || (l.name || '').toLowerCase().includes(searchText.toLowerCase()) || (l.code || '').toLowerCase().includes(searchText.toLowerCase()) || (l.Zone?.Warehouse?.name || '').toLowerCase().includes(searchText.toLowerCase()))} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedLocation ? 'Edit Location' : 'Add Location'} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedLocation(null); }} onOk={() => form.submit()} okButtonProps={{ loading: saving }} width={640} className="node-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Location Code" name="code"><Input placeholder="e.g. LOC-A1-01" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Location Name" name="name" rules={[{ required: true }]}><Input placeholder="Location name" className="h-11 rounded-xl" /></Form.Item>
                        <Form.Item label="Zone" name="zoneId" rules={[{ required: true, message: 'Select zone' }]}>
                            <Select placeholder="Select zone" className="h-11 rounded-xl" disabled={!!selectedLocation}>
                                {(Array.isArray(zones) ? zones : []).map(z => <Option key={z.id} value={z.id}>{z.name} {z.Warehouse ? `(${z.Warehouse.name})` : ''}</Option>)}
                            </Select>
                        </Form.Item>
                        <div className="grid grid-cols-4 gap-3">
                            <Form.Item label="Aisle" name="aisle"><Input className="rounded-lg h-11" placeholder="Aisle" /></Form.Item>
                            <Form.Item label="Rack" name="rack"><Input className="rounded-lg h-11" placeholder="Rack" /></Form.Item>
                            <Form.Item label="Shelf" name="shelf"><Input className="rounded-lg h-11" placeholder="Shelf" /></Form.Item>
                            <Form.Item label="Bin" name="bin"><Input className="rounded-lg h-11" placeholder="Bin" /></Form.Item>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Form.Item label="Type" name="locationType" initialValue="PICK">
                                <Select placeholder="Type" className="h-11 rounded-xl">
                                    <Option value="PICK">PICK</Option>
                                    <Option value="BULK">BULK</Option>
                                    <Option value="QUARANTINE">QUARANTINE</Option>
                                    <Option value="STAGING">STAGING</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="Pick Seq" name="pickSequence"><InputNumber className="w-full h-11 rounded-xl" placeholder="Sequence" min={0} /></Form.Item>
                            <Form.Item label="Max Weight (kg)" name="maxWeight"><InputNumber className="w-full h-11 rounded-xl" placeholder="Max weight" min={0} step={0.01} /></Form.Item>
                        </div>
                    </Form>
                </Modal>

                <Drawer title={`Spatial Audit: ${selectedLocation?.name}`} width={500} open={drawerOpen} onClose={() => setDrawerOpen(false)} className="rounded-l-3xl">
                    {selectedLocation && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <Title level={5} className="uppercase text-[10px] tracking-widest text-slate-400 mb-4">Coordinate Metadata</Title>
                                <div className="space-y-4">
                                    <div className="flex justify-between"><span>Physical State</span><Tag color="green">OPERATIONAL</Tag></div>
                                    <div className="flex justify-between"><span>Thermal Context</span><span>NORMAL</span></div>
                                    <div className="flex justify-between"><span>Occupancy</span><span>32% (Current)</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
