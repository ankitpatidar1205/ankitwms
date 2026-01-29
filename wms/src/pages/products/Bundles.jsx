import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Form, Input, Select, InputNumber, Drawer, Modal, Divider, message, Typography, Badge, Popconfirm } from 'antd';
import { BoxPlotOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MinusCircleOutlined, ReloadOutlined, ShoppingCartOutlined, DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

export default function Bundles() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchBundles = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/bundles', { method: 'GET' }, token);
            setBundles(Array.isArray(data?.data) ? data.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load bundles');
            setBundles([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const data = await apiRequest('/api/inventory/products', { method: 'GET' }, token);
            setProducts(Array.isArray(data?.data) ? data.data : []);
        } catch {
            setProducts([]);
        }
    }, [token]);

    const fetchCompanies = useCallback(async () => {
        if (!token || !isSuperAdmin) return;
        try {
            const data = await apiRequest('/api/superadmin/companies', { method: 'GET' }, token);
            setCompanies(Array.isArray(data?.data) ? data.data : []);
        } catch { setCompanies([]); }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        if (token) {
            fetchBundles();
            fetchProducts();
            if (isSuperAdmin) fetchCompanies();
        }
    }, [token, fetchBundles, fetchProducts, isSuperAdmin, fetchCompanies]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku,
                sellingPrice: values.sellingPrice,
                costPrice: values.costPrice ?? 0,
                status: values.status || 'ACTIVE',
                bundleItems: (values.bundleItems || []).filter(i => i?.productId && i?.quantity > 0).map(i => ({ productId: i.productId, quantity: i.quantity })),
            };
            if (isSuperAdmin && !selectedBundle) payload.companyId = values.companyId;
            if (selectedBundle) {
                await apiRequest(`/api/bundles/${selectedBundle.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
                message.success('Bundle updated');
            } else {
                await apiRequest('/api/bundles', { method: 'POST', body: JSON.stringify(payload) }, token);
                message.success('Bundle created');
            }
            setModalOpen(false);
            form.resetFields();
            setSelectedBundle(null);
            fetchBundles();
        } catch (err) {
            message.error(err.message || 'Bundle save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await apiRequest(`/api/bundles/${id}`, { method: 'DELETE' }, token);
            message.success('Bundle deleted');
            fetchBundles();
        } catch (err) {
            message.error(err.message || 'Delete failed');
        }
    };

    const columns = [
        { title: 'Identity', dataIndex: 'sku', key: 'sku', render: (v) => <Tag color="orange" className="font-black border-none text-[10px] uppercase">{v}</Tag> },
        { title: 'Bundle Nomenclature', dataIndex: 'name', key: 'name', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
        { title: 'Composition', key: 'items', render: (_, r) => <Badge count={r.bundleItems?.length || 0} color="#f59e0b" suffix="SKUs" /> },
        { title: 'Cost Analysis', dataIndex: 'costPrice', key: 'cost', render: (v) => <span className="text-gray-400 font-medium">{formatCurrency(v)}</span> },
        { title: 'Market Value', dataIndex: 'sellingPrice', key: 'price', render: (v) => <span className="font-black text-slate-700">{formatCurrency(v)}</span> },
        {
            title: 'Margin',
            key: 'margin',
            render: (_, r) => {
                if (!r.costPrice || !r.sellingPrice) return '-';
                const margin = ((r.sellingPrice - r.costPrice) / r.sellingPrice) * 100;
                return <Tag color={margin >= 20 ? 'green' : 'orange'} className="rounded-full font-bold">{margin.toFixed(1)}%</Tag>;
            }
        },
        {
            title: 'Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedBundle(r); setDrawerOpen(true); }} />
                    <Button type="text" icon={<EditOutlined className="text-blue-500" />} onClick={() => {
                        setSelectedBundle(r);
                        form.setFieldsValue({
                            ...r,
                            bundleItems: r.bundleItems?.map(i => ({ productId: i.child.id, quantity: i.quantity }))
                        });
                        setModalOpen(true);
                    }} />
                    <Popconfirm title="Delete this bundle?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
                        <Button type="text" danger icon={<DeleteOutlined />} />
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
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Bundles</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Management of multi-SKU kits, bundles, and composite inventory units</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-orange-600 border-orange-600 shadow-2xl shadow-orange-100 font-bold" onClick={() => { setSelectedBundle(null); form.resetFields(); form.setFieldsValue({ bundleItems: [{}] }); setModalOpen(true); }}>
                        Engineer Bundle
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Active Bundles</div><div className="text-3xl font-black">{bundles.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-green-500 uppercase mb-1">High Margin</div><div className="text-3xl font-black">{bundles.filter(b => ((b.sellingPrice - b.costPrice) / b.sellingPrice) > 0.2).length}</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="mb-8 flex items-center justify-between">
                            <Search placeholder="Identity Search (SKU, Bundle Title)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} />
                            <Button icon={<ReloadOutlined />} onClick={fetchBundles} />
                        </div>
                        <Table columns={columns} dataSource={bundles.filter(b => !searchText || (b.sku && b.sku.toLowerCase().includes(searchText.toLowerCase())) || (b.name && b.name.toLowerCase().includes(searchText.toLowerCase())))} rowKey="id" loading={loading} />
                    </div>
                </Card>

                <Modal title={selectedBundle ? "Re-Engineer Bundle" : "New Composite Asset Definition"} open={modalOpen} onCancel={() => { setModalOpen(false); setSelectedBundle(null); }} onOk={() => form.submit()} confirmLoading={saving} width={700} className="bundle-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        {isSuperAdmin && !selectedBundle && (
                            <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                <Select placeholder="Select company" className="h-12 rounded-xl" showSearch optionFilterProp="label" options={companies.map(c => ({ value: c.id, label: c.name }))} />
                            </Form.Item>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Bundle Nomenclature" name="name" rules={[{ required: true }]}><Input placeholder="Starter Kit Alpha" className="h-12 rounded-xl" /></Form.Item>
                            <Form.Item label="System SKU" name="sku" rules={[{ required: true }]}><Input placeholder="BNDL-001" className="h-12 rounded-xl" disabled={!!selectedBundle} /></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Cost Price" name="costPrice"><InputNumber prefix={<DollarOutlined />} className="w-full h-12 rounded-xl" min={0} /></Form.Item>
                            <Form.Item label="Market Valuation" name="sellingPrice" rules={[{ required: true }]}><InputNumber prefix={<DollarOutlined />} className="w-full h-12 rounded-xl" min={0} /></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Lifecycle State" name="status" initialValue="ACTIVE"><Select className="h-12 rounded-xl"><Option value="ACTIVE">Market Active</Option><Option value="DEPRECATED">Deprecated</Option></Select></Form.Item>
                        </div>

                        <Divider><div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Bill of Materials</div></Divider>

                        <Form.List name="bundleItems">
                            {(fields, { add, remove }) => (
                                <div className="space-y-3">
                                    {fields.map(({ key, name, ...restField }) => (
                                        <div key={key} className="flex gap-4 items-end bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                            <Form.Item {...restField} name={[name, 'productId']} label="Component SKU" className="mb-0 flex-1">
                                                <Select showSearch placeholder="Select child asset" className="h-11 rounded-xl">
                                                    {products.map(p => <Option key={p.id} value={p.id}>{p.name} ({p.sku})</Option>)}
                                                </Select>
                                            </Form.Item>
                                            <Form.Item {...restField} name={[name, 'quantity']} label="Factor" className="mb-0 w-24">
                                                <InputNumber min={1} className="w-full h-11 rounded-xl" />
                                            </Form.Item>
                                            <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} className="mb-1" />
                                        </div>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="h-12 rounded-xl border-slate-300">Append Component</Button>
                                </div>
                            )}
                        </Form.List>
                    </Form>
                </Modal>

                <Drawer title={`Composition Audit: ${selectedBundle?.name}`} width={500} open={drawerOpen} onClose={() => setDrawerOpen(false)} className="rounded-l-3xl">
                    {selectedBundle && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <Title level={5} className="uppercase text-[10px] tracking-widest text-slate-400 mb-4">Supply Dynamics</Title>
                                <div className="space-y-3">
                                    {selectedBundle.bundleItems?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                            <div>
                                                <div className="font-bold text-slate-800">{item.child.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{item.child.sku}</div>
                                            </div>
                                            <Tag color="blue" className="font-black border-none">x{item.quantity}</Tag>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Drawer>
            </div>
        </MainLayout>
    );
}
