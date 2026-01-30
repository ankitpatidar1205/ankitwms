import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Card, Space, Form, Input, Select, InputNumber, Modal, Divider, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, MinusCircleOutlined, ReloadOutlined, ShoppingCartOutlined, DollarOutlined, SearchOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

export default function Bundles() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [bundles, setBundles] = useState([]);
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';
    const bundleItems = Form.useWatch('bundleItems', form) || [];

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

    // Auto-calculate cost from bundle components (product costPrice * quantity)
    useEffect(() => {
        if (!modalOpen || viewMode) return;
        const items = bundleItems.filter(i => i?.productId && i?.quantity > 0);
        if (items.length === 0) return;
        let total = 0;
        for (const it of items) {
            const p = products.find(pr => pr.id === it.productId);
            if (p && p.costPrice != null) total += Number(p.costPrice) * Number(it.quantity);
        }
        if (total > 0) form.setFieldValue('costPrice', Math.round(total * 100) / 100);
    }, [bundleItems, products, modalOpen, viewMode, form]);

    const handleSubmit = async (values) => {
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku,
                description: values.description || null,
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
            message.error(err?.message || 'Delete failed');
        }
    };

    const filteredBundles = bundles.filter(b => {
        if (!searchText) return true;
        const s = searchText.toLowerCase();
        return (b.sku || '').toLowerCase().includes(s) || (b.name || '').toLowerCase().includes(s);
    });

    const activeCount = bundles.filter(b => b.status === 'ACTIVE').length;
    const margins = bundles.filter(b => b.sellingPrice > 0 && b.costPrice != null).map(b => ((b.sellingPrice - b.costPrice) / b.sellingPrice) * 100);
    const avgMargin = margins.length ? (margins.reduce((a, b) => a + b, 0) / margins.length).toFixed(1) : null;

    const columns = [
        { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (v) => <span className="font-medium text-blue-600">{v || '—'}</span> },
        { title: 'Bundle Name', dataIndex: 'name', key: 'name', render: (v) => <span className="flex items-center gap-2"><BoxPlotOutlined className="text-gray-400" />{v || '—'}</span> },
        { title: 'Items', key: 'items', width: 80, render: (_, r) => <Tag color="blue" className="font-normal">{(r.bundleItems?.length || 0)}</Tag> },
        { title: 'Cost Price', dataIndex: 'costPrice', key: 'cost', width: 120, render: (v) => <span className="text-gray-600">{v != null ? formatCurrency(v) : '—'}</span> },
        { title: 'Selling Price', dataIndex: 'sellingPrice', key: 'price', width: 120, render: (v) => <span className="font-medium text-gray-900">{v != null ? formatCurrency(v) : '—'}</span> },
        {
            title: 'Margin',
            key: 'margin',
            width: 100,
            render: (_, r) => {
                if (r.sellingPrice == null || r.sellingPrice <= 0 || r.costPrice == null) return '—';
                const margin = ((r.sellingPrice - r.costPrice) / r.sellingPrice) * 100;
                return <Tag color={margin >= 20 ? 'green' : margin >= 0 ? 'orange' : 'red'} className="font-normal">{margin.toFixed(1)}%</Tag>;
            }
        },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'ACTIVE' ? 'green' : 'default'}>{v || '—'}</Tag> },
        {
            title: 'Actions',
            key: 'act',
            width: 140,
            fixed: 'right',
            render: (_, r) => (
                <Space>
                    <Button type="link" size="small" icon={<EyeOutlined />} className="text-blue-600 p-0 font-normal" onClick={() => { setSelectedBundle(r); setViewMode(true); setModalOpen(true); }}>View</Button>
                    <Button type="text" size="small" icon={<EditOutlined className="text-blue-600" />} onClick={() => {
                        setSelectedBundle(r);
                        setViewMode(false);
                        form.setFieldsValue({
                            name: r.name,
                            sku: r.sku,
                            description: r.description,
                            costPrice: r.costPrice,
                            sellingPrice: r.sellingPrice,
                            status: r.status || 'ACTIVE',
                            bundleItems: (r.bundleItems || []).map(i => ({ productId: i.productId ?? i.child?.id, quantity: i.quantity })).length ? (r.bundleItems || []).map(i => ({ productId: i.productId ?? i.child?.id, quantity: i.quantity })) : [{}],
                        });
                        setModalOpen(true);
                    }} />
                    <Popconfirm title="Delete this bundle?" onConfirm={() => handleDelete(r.id)} okText="Yes" cancelText="No">
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
                        <h1 className="text-2xl font-medium text-blue-600">Product Bundles</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Multi-pack and bundle products (e.g., 12-packs, cases)</p>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchBundles}>Refresh</Button>
                        <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setSelectedBundle(null); setViewMode(false); form.resetFields(); form.setFieldsValue({ bundleItems: [{}], status: 'ACTIVE' }); setModalOpen(true); }}>
                            + Create Bundle
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Total Bundles</div>
                            <div className="text-2xl font-medium text-blue-600">{bundles.length}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Active Bundles</div>
                            <div className="text-2xl font-medium text-green-600">{activeCount}</div>
                        </div>
                    </Card>
                    <Card className="rounded-xl border-gray-100 shadow-sm">
                        <div className="flex flex-col gap-1">
                            <div className="text-xs text-gray-500 font-normal">Average Margin</div>
                            <div className={`text-2xl font-medium ${avgMargin != null && Number(avgMargin) < 0 ? 'text-red-600' : 'text-gray-800'}`}>{avgMargin != null ? `${avgMargin}%` : '—'}</div>
                        </div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-6">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <Search placeholder="Search by SKU or bundle name..." className="max-w-md" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
                            <Button icon={<SearchOutlined />} className="bg-blue-600 border-blue-600 text-white">Search</Button>
                        </div>
                        <Table
                            columns={columns}
                            dataSource={filteredBundles}
                            rowKey="id"
                            loading={loading}
                            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} bundles`, pageSize: 20 }}
                            scroll={{ x: 1000 }}
                            className="[&_.ant-table-thead_th]:font-normal"
                        />
                    </div>
                </Card>

                <Modal
                    title={viewMode ? 'View Bundle' : selectedBundle ? 'Edit Bundle' : 'Create Bundle'}
                    open={modalOpen}
                    onCancel={() => { setModalOpen(false); setSelectedBundle(null); setViewMode(false); }}
                    onOk={viewMode ? undefined : () => form.submit()}
                    okButtonProps={{ className: 'bg-blue-600 border-blue-600', loading: saving }}
                    footer={viewMode ? [<Button key="close" onClick={() => { setModalOpen(false); setViewMode(false); setSelectedBundle(null); }}>Close</Button>] : undefined}
                    width={640}
                >
                    {viewMode && selectedBundle ? (
                        <div className="pt-2 space-y-4">
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Bundle Name</div><div className="text-gray-900">{selectedBundle.name ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">SKU</div><div className="text-gray-900">{selectedBundle.sku ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Description</div><div className="text-gray-900 whitespace-pre-wrap">{selectedBundle.description ?? '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Cost Price (Auto-Calculated)</div><div className="text-gray-900">{selectedBundle.costPrice != null ? formatCurrency(selectedBundle.costPrice) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Selling Price</div><div className="text-gray-900">{selectedBundle.sellingPrice != null ? formatCurrency(selectedBundle.sellingPrice) : '—'}</div></div>
                            <div><div className="text-gray-500 text-sm font-normal mb-1">Status</div><div className="text-gray-900">{selectedBundle.status ?? '—'}</div></div>
                            <div>
                                <div className="text-gray-500 text-sm font-normal mb-2">Bundle Components</div>
                                <div className="space-y-2">
                                    {(selectedBundle.bundleItems || []).length ? selectedBundle.bundleItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="text-gray-900">{(item.child && item.child.name) || `Product #${item.productId}`} {(item.child && item.child.sku) && <span className="text-gray-500 text-xs">({item.child.sku})</span>}</span>
                                            <span className="font-medium">×{item.quantity}</span>
                                        </div>
                                    )) : <span className="text-gray-500">—</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-4">
                            {isSuperAdmin && !selectedBundle && (
                                <Form.Item label="Company" name="companyId" rules={[{ required: true, message: 'Select company' }]}>
                                    <Select placeholder="Select company" className="rounded-lg" options={companies.map(c => ({ value: c.id, label: c.name }))} />
                                </Form.Item>
                            )}
                            <Form.Item label="Bundle Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. 12-Pack Case" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item label="SKU" name="sku" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. BNDL-001" className="rounded-lg" disabled={!!selectedBundle} />
                            </Form.Item>
                            <Form.Item label="Description" name="description">
                                <TextArea rows={2} placeholder="Bundle description" className="rounded-lg" />
                            </Form.Item>
                            <div className="grid grid-cols-2 gap-4">
                                <Form.Item label="Cost Price (Auto-Calculated)" name="costPrice">
                                    <InputNumber prefix="£" className="w-full rounded-lg" min={0} step={0.01} placeholder="From components" />
                                </Form.Item>
                                <Form.Item label="Selling Price" name="sellingPrice" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber prefix="£" className="w-full rounded-lg" min={0} step={0.01} />
                                </Form.Item>
                            </div>
                            <Form.Item label="Status" name="status" initialValue="ACTIVE">
                                <Select placeholder="Select status" className="rounded-lg">
                                    <Option value="ACTIVE">Active</Option>
                                    <Option value="INACTIVE">Inactive</Option>
                                </Select>
                            </Form.Item>

                            <Divider className="text-gray-500 font-normal">Bundle Components</Divider>

                            <Form.List name="bundleItems">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-3">
                                        {fields.map(({ key, name, ...restField }) => (
                                            <div key={key} className="flex gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <Form.Item {...restField} name={[name, 'productId']} label="Product" className="mb-0 flex-1">
                                                    <Select showSearch placeholder="Select product" className="rounded-lg" optionFilterProp="label" options={products.map(p => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                                                </Form.Item>
                                                <Form.Item {...restField} name={[name, 'quantity']} label="Qty" className="mb-0 w-20">
                                                    <InputNumber min={1} className="w-full rounded-lg" />
                                                </Form.Item>
                                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} className="mb-1" />
                                            </div>
                                        ))}
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} className="rounded-lg border-gray-300">Add Component</Button>
                                    </div>
                                )}
                            </Form.List>
                        </Form>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
