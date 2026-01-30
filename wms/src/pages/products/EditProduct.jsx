import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, message, Upload, Row, Col, Tabs, Spin, Modal, Table } from 'antd';
import {
    ArrowLeftOutlined,
    SaveOutlined,
    AppstoreOutlined,
    DollarOutlined,
    InboxOutlined,
    GlobalOutlined,
    BankOutlined,
    ColumnWidthOutlined,
    PictureOutlined,
    PlusOutlined,
    DeleteOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';

const { Option } = Select;
const { TextArea } = Input;

const MAX_IMAGES = 20;
const MAX_FILE_SIZE_MB = 5;
const ACCEPT_IMAGES = '.jpg,.jpeg,.png,.gif,.webp';

const YES_NO_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const UOM_OPTIONS = [{ value: 'EACH', label: 'Each' }, { value: 'BOX', label: 'Box' }, { value: 'KG', label: 'Kg' }, { value: 'L', label: 'L' }];
const DIMENSION_UNITS = [{ value: 'cm', label: 'Centimeters' }, { value: 'm', label: 'Meters' }, { value: 'in', label: 'Inches' }];
const WEIGHT_UNITS = [{ value: 'kg', label: 'Kilograms' }, { value: 'g', label: 'Grams' }, { value: 'lb', label: 'Pounds' }];

export default function EditProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [imageList, setImageList] = useState([]);
    const [productSku, setProductSku] = useState('');
    const [cartonList, setCartonList] = useState([]);
    const [supplierProductList, setSupplierProductList] = useState([]);
    const [cartonModalOpen, setCartonModalOpen] = useState(false);
    const [priceListModalOpen, setPriceListModalOpen] = useState(false);
    const [cartonForm] = Form.useForm();
    const [priceListForm] = Form.useForm();

    const fetchProduct = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await apiRequest(`/api/inventory/products/${id}`, { method: 'GET' }, token);
            const p = res?.data ?? res;
            if (!p) throw new Error('Product not found');
            setProductSku(p.sku || '');
            const ms = p.marketplaceSkus && typeof p.marketplaceSkus === 'object' ? p.marketplaceSkus : {};
            form.setFieldsValue({
                name: p.name,
                sku: p.sku,
                barcode: p.barcode ?? undefined,
                description: p.description ?? undefined,
                productType: p.productType ?? 'SIMPLE',
                unitOfMeasure: p.unitOfMeasure ?? 'EACH',
                categoryId: p.categoryId ?? undefined,
                supplierId: p.supplierId ?? undefined,
                status: p.status ?? 'ACTIVE',
                price: p.price != null ? Number(p.price) : 0,
                costPrice: p.costPrice != null ? Number(p.costPrice) : undefined,
                vatRate: p.vatRate != null ? Number(p.vatRate) : undefined,
                vatCode: p.vatCode ?? undefined,
                customsTariff: p.customsTariff ?? undefined,
                hdSku: ms.hdSku ?? undefined,
                hdSaleSku: ms.hdSaleSku ?? undefined,
                warehouseId: ms.warehouseId ?? undefined,
                ebayId: ms.ebayId ?? undefined,
                amazonSku: ms.amazonSku ?? undefined,
                amazonSkuSplitBefore: ms.amazonSkuSplitBefore ?? undefined,
                amazonMpnSku: ms.amazonMpnSku ?? undefined,
                amazonIdSku: ms.amazonIdSku ?? undefined,
                heatSensitive: p.heatSensitive ?? undefined,
                perishable: p.perishable ?? undefined,
                requireBatchTracking: p.requireBatchTracking ?? undefined,
                shelfLifeDays: p.shelfLifeDays ?? undefined,
                length: p.length != null ? Number(p.length) : undefined,
                width: p.width != null ? Number(p.width) : undefined,
                height: p.height != null ? Number(p.height) : undefined,
                dimensionUnit: p.dimensionUnit ?? 'cm',
                weight: p.weight != null ? Number(p.weight) : undefined,
                weightUnit: p.weightUnit ?? 'kg',
                reorderLevel: p.reorderLevel ?? 0,
                reorderQty: p.reorderQty ?? undefined,
                maxStock: p.maxStock ?? undefined,
            });
            const imgs = Array.isArray(p.images) ? p.images : [];
            setImageList(imgs.map((url, idx) => ({ uid: `existing-${idx}`, url, name: `image-${idx}` })));
            const cartonsRaw = p.cartons;
            const cartonsArr = Array.isArray(cartonsRaw)
                ? cartonsRaw.map((c, i) => ({ id: c.id || `c-${i}`, barcode: c.barcode ?? '', caseSize: c.caseSize ?? '', description: c.description ?? '' }))
                : cartonsRaw && typeof cartonsRaw === 'object' && (cartonsRaw.barcode || cartonsRaw.unitsPerCarton)
                    ? [{ id: 'c-0', barcode: cartonsRaw.barcode ?? '', caseSize: cartonsRaw.unitsPerCarton ?? '', description: cartonsRaw.description ?? '' }]
                    : [];
            setCartonList(cartonsArr);
            const spList = Array.isArray(p.supplierProducts) ? p.supplierProducts : [];
            setSupplierProductList(spList.map((s, i) => ({ ...s, id: s.id || `sp-${i}` })));
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to load product');
            navigate('/products');
        } finally {
            setLoading(false);
        }
    }, [token, id, form, navigate]);

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/inventory/categories', { method: 'GET' }, token);
            setCategories(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setCategories([]);
        }
    }, [token]);

    const fetchSuppliers = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/suppliers', { method: 'GET' }, token);
            setSuppliers(Array.isArray(res?.data) ? res.data : []);
        } catch (_) {
            setSuppliers([]);
        }
    }, [token]);

    useEffect(() => {
        fetchProduct();
        fetchCategories();
        fetchSuppliers();
    }, [fetchProduct, fetchCategories, fetchSuppliers]);

    const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
        });

    const handleUpload = async (options) => {
        const { file } = options;
        if (imageList.length >= MAX_IMAGES) {
            message.warning(`Maximum ${MAX_IMAGES} images allowed`);
            return;
        }
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            message.warning(`File size must be under ${MAX_FILE_SIZE_MB}MB`);
            return;
        }
        try {
            const base64 = await fileToBase64(file);
            setImageList((prev) => [...prev, { uid: file.uid, url: base64, name: file.name }]);
        } catch (_) {
            message.error('Failed to read file');
        }
    };

    const removeImage = (uid) => {
        setImageList((prev) => prev.filter((i) => i.uid !== uid));
    };

    const handleSubmit = async (values) => {
        if (!token || !id) return;
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku?.trim(),
                barcode: values.barcode || null,
                description: values.description || null,
                productType: values.productType || null,
                unitOfMeasure: values.unitOfMeasure || null,
                categoryId: values.categoryId || null,
                supplierId: values.supplierId || null,
                price: values.price ?? 0,
                costPrice: values.costPrice != null ? values.costPrice : null,
                vatRate: values.vatRate != null ? values.vatRate : null,
                vatCode: values.vatCode || null,
                customsTariff: values.customsTariff != null ? String(values.customsTariff) : null,
                marketplaceSkus: {
                    hdSku: values.hdSku || null,
                    hdSaleSku: values.hdSaleSku || null,
                    warehouseId: values.warehouseId || null,
                    ebayId: values.ebayId || null,
                    amazonSku: values.amazonSku || null,
                    amazonSkuSplitBefore: values.amazonSkuSplitBefore || null,
                    amazonMpnSku: values.amazonMpnSku || null,
                    amazonIdSku: values.amazonIdSku || null,
                },
                heatSensitive: values.heatSensitive || null,
                perishable: values.perishable || null,
                requireBatchTracking: values.requireBatchTracking || null,
                shelfLifeDays: values.shelfLifeDays != null ? values.shelfLifeDays : null,
                length: values.length != null ? values.length : null,
                width: values.width != null ? values.width : null,
                height: values.height != null ? values.height : null,
                dimensionUnit: values.dimensionUnit || null,
                weight: values.weight != null ? values.weight : null,
                weightUnit: values.weightUnit || null,
                reorderLevel: values.reorderLevel ?? 0,
                reorderQty: values.reorderQty != null ? values.reorderQty : null,
                maxStock: values.maxStock != null ? values.maxStock : null,
                status: values.status || 'ACTIVE',
                images: imageList.map((i) => i.url),
                cartons: cartonList.map((c) => ({ id: c.id, barcode: c.barcode || null, caseSize: c.caseSize != null ? c.caseSize : null, description: c.description || null })),
                supplierProducts: supplierProductList.map((s) => ({
                    id: s.id,
                    supplierId: s.supplierId,
                    supplierSku: s.supplierSku ?? null,
                    caseSize: s.caseSize != null ? s.caseSize : null,
                    caseCost: s.caseCost != null ? s.caseCost : null,
                    unitCost: s.unitCost != null ? s.unitCost : null,
                })),
            };
            await apiRequest(`/api/inventory/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token);
            message.success('Product updated successfully!');
            navigate('/products');
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to update product');
        } finally {
            setSaving(false);
        }
    };

    const costPrice = Form.useWatch('costPrice', form);
    const sellingPrice = Form.useWatch('price', form);
    const margin =
        costPrice != null && costPrice > 0 && sellingPrice != null
            ? (((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100).toFixed(1)
            : '0.0';

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    const tabItems = [
        {
            key: 'basic',
            label: (
                <span>
                    <AppstoreOutlined /> Basic Info
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="Product Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. Organic Granola Bar" className="rounded-lg" size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="SKU" name="sku" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="e.g. PRD-001" className="rounded-lg" size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Barcode" name="barcode">
                                <Input placeholder="Enter barcode (EAN/UPC)" className="rounded-lg" size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Category" name="categoryId">
                                <Select allowClear placeholder="Select category" className="rounded-lg w-full" size="large">
                                    {categories.map((c) => (
                                        <Option key={c.id} value={c.id}>{c.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Type" name="productType">
                                <Select className="rounded-lg w-full" size="large" options={[{ value: 'SIMPLE', label: 'Simple' }, { value: 'BUNDLE', label: 'Bundle' }]} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Status" name="status">
                                <Select className="rounded-lg w-full" size="large" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Primary Supplier" name="supplierId">
                                <Select allowClear placeholder="Select primary supplier" className="rounded-lg w-full" size="large">
                                    {suppliers.map((s) => (
                                        <Option key={s.id} value={s.id}>{s.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Unit of Measure" name="unitOfMeasure">
                                <Select className="rounded-lg w-full" size="large" options={UOM_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24}>
                            <Form.Item label="Description" name="description">
                                <TextArea rows={3} placeholder="Enter product description..." className="rounded-lg" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            ),
        },
        {
            key: 'pricing',
            label: (
                <span>
                    <DollarOutlined /> Pricing & VAT
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Cost Price" name="costPrice">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} addonBefore="€" placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Selling Price" name="price">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} addonBefore="€" placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <div className="pt-8">
                                <div className="text-gray-500 text-sm">Margin</div>
                                <div className={`text-xl font-bold ${Number(margin) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</div>
                            </div>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="VAT Rate (%)" name="vatRate">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} max={100} step={0.1} placeholder="20.0" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="VAT Code" name="vatCode">
                                <Input placeholder="e.g. A_FOOD_PLANRISCUIT" className="rounded-lg" size="large" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Customs Tariff" name="customsTariff">
                                <Input placeholder="e.g. 12" className="rounded-lg" size="large" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            ),
        },
        {
            key: 'cartons',
            label: (
                <span>
                    <InboxOutlined /> Cartons
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Outer Carton Configurations</h3>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { cartonForm.resetFields(); setCartonModalOpen(true); }} className="bg-blue-600 border-blue-600">+ Add Carton Barcode</Button>
                    </div>
                    <Table
                        size="small"
                        dataSource={cartonList}
                        rowKey="id"
                        pagination={false}
                        columns={[
                            { title: 'Barcode', dataIndex: 'barcode', key: 'barcode', render: (v) => v || '—' },
                            { title: 'Case Size (Units Inside)', dataIndex: 'caseSize', key: 'caseSize', render: (v) => (v != null && v !== '' ? String(v) : '—') },
                            { title: 'Description', dataIndex: 'description', key: 'description', render: (v) => v || '—' },
                            {
                                title: 'Actions',
                                key: 'actions',
                                render: (_, r) => (
                                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setCartonList((prev) => prev.filter((c) => c.id !== r.id))}>Delete</Button>
                                ),
                            },
                        ]}
                    />
                    <Modal title="Add Carton Barcode" open={cartonModalOpen} onCancel={() => setCartonModalOpen(false)} footer={null} destroyOnClose>
                        <Form form={cartonForm} layout="vertical" onFinish={(values) => {
                            const id = `c-${Date.now()}`;
                            setCartonList((prev) => [...prev, { id, barcode: values.outerBarcode?.trim() || '', caseSize: values.caseSize != null ? Number(values.caseSize) : null, description: values.description?.trim() || '' }]);
                            cartonForm.resetFields();
                            setCartonModalOpen(false);
                        }}>
                            <Form.Item name="outerBarcode" label="Outer Barcode" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Scan or enter case barcode" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item name="caseSize" label="Case Size (Units Inside)" rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber className="w-full rounded-lg" min={1} placeholder="e.g. 48" />
                            </Form.Item>
                            <Form.Item name="description" label="Description">
                                <Input placeholder="e.g. Case of 48" className="rounded-lg" />
                            </Form.Item>
                            <div className="flex justify-end gap-2">
                                <Button onClick={() => setCartonModalOpen(false)}>Cancel</Button>
                                <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600">OK</Button>
                            </div>
                        </Form>
                    </Modal>
                </Card>
            ),
        },
        {
            key: 'pricelists',
            label: (
                <span>
                    <DollarOutlined /> Price Lists
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800">Supplier Price Lists</h3>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { priceListForm.resetFields(); setPriceListModalOpen(true); }} className="bg-blue-600 border-blue-600">+ Add Price List</Button>
                    </div>
                    {(() => {
                        const getSupplierName = (sid) => { const s = suppliers.find((x) => x.id === sid); return s ? s.name : (sid != null ? `ID ${sid}` : '—'); };
                        return (
                            <Table
                                size="small"
                                dataSource={supplierProductList}
                                rowKey="id"
                                pagination={false}
                                columns={[
                                    { title: 'Supplier', key: 'supplier', render: (_, r) => getSupplierName(r.supplierId) },
                                    { title: 'Supplier SKU', dataIndex: 'supplierSku', key: 'supplierSku', render: (v) => v || '—' },
                                    { title: 'Case Size', dataIndex: 'caseSize', key: 'caseSize', render: (v) => (v != null ? String(v) : '—') },
                                    { title: 'Case Cost', dataIndex: 'caseCost', key: 'caseCost', render: (v) => (v != null ? formatCurrency(v) : '—') },
                                    { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', render: (v) => (v != null ? formatCurrency(v) : '—') },
                                    {
                                        title: 'Actions',
                                        key: 'actions',
                                        render: (_, r) => (
                                            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setSupplierProductList((prev) => prev.filter((s) => s.id !== r.id))}>Delete</Button>
                                        ),
                                    },
                                ]}
                            />
                        );
                    })()}
                    <Modal title="Add Supplier Price List" open={priceListModalOpen} onCancel={() => setPriceListModalOpen(false)} footer={null} destroyOnClose>
                        <Form form={priceListForm} layout="vertical" onFinish={(values) => {
                            const caseCost = values.caseCostPrice != null ? Number(values.caseCostPrice) : null;
                            const caseSize = values.caseSize != null ? Number(values.caseSize) : 1;
                            const unitCost = caseCost != null && caseSize > 0 ? (caseCost / caseSize).toFixed(4) : null;
                            const id = `sp-${Date.now()}`;
                            setSupplierProductList((prev) => [...prev, {
                                id,
                                supplierId: values.supplierId,
                                supplierSku: values.supplierSku?.trim() || '',
                                caseSize,
                                caseCost,
                                unitCost,
                            }]);
                            priceListForm.resetFields();
                            setPriceListModalOpen(false);
                        }}>
                            <Form.Item name="supplierId" label="Supplier" rules={[{ required: true, message: 'Required' }]}>
                                <Select placeholder="Select supplier" className="rounded-lg w-full" allowClear>
                                    {suppliers.map((s) => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                                </Select>
                            </Form.Item>
                            <Form.Item name="supplierSku" label="Supplier SKU (Case SKU)" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="Supplier SKU" className="rounded-lg" />
                            </Form.Item>
                            <Form.Item name="caseSize" label="Case Size" rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber className="w-full rounded-lg" min={1} placeholder="e.g. 48" />
                            </Form.Item>
                            <Form.Item name="caseCostPrice" label="Case Cost Price" rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber className="w-full rounded-lg" min={0} step={0.01} addonBefore="£" placeholder="0.00" />
                            </Form.Item>
                            <div className="flex justify-end gap-2">
                                <Button onClick={() => setPriceListModalOpen(false)}>Cancel</Button>
                                <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600">OK</Button>
                            </div>
                        </Form>
                    </Modal>
                </Card>
            ),
        },
        {
            key: 'marketplace',
            label: (
                <span>
                    <GlobalOutlined /> Marketplace SKUs
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm mb-4">Map this product to different sales channels with their specific SKUs.</p>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item label="HD SKU" name="hdSku">
                                <Input placeholder="e.g. HD_PRD_R_1_CH" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="HD Sale SKU" name="hdSaleSku">
                                <Input placeholder="e.g. HD_PRD_R_1_CH_SALE" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Warehouse ID" name="warehouseId">
                                <Input placeholder="e.g. WS_PRD_R_1_CH" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="eBay ID" name="ebayId">
                                <Input placeholder="e.g. CMAY_PRD_R_1_CH" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Amazon SKU" name="amazonSku">
                                <Input placeholder="e.g. CI_SKU_TO_PB" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Amazon SKU (Split Before)" name="amazonSkuSplitBefore">
                                <Input placeholder="e.g. CI_SKU_TO_PB_B1" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Amazon MPN SKU" name="amazonMpnSku">
                                <Input placeholder="e.g. CI_SKU_TO_PR_M" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Amazon ID SKU" name="amazonIdSku">
                                <Input placeholder="e.g. CI_SKU_TO_PR_BU" className="rounded-lg" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            ),
        },
        {
            key: 'inventory',
            label: (
                <span>
                    <BankOutlined /> Inventory Settings
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item label="Reorder Point" name="reorderLevel">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Reorder Quantity" name="reorderQty">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item label="Max Stock Level" name="maxStock">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Heat Sensitive" name="heatSensitive">
                                <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Perishable" name="perishable">
                                <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Require Batch Tracking" name="requireBatchTracking">
                                <Select allowClear placeholder="Select" className="rounded-lg w-full" options={YES_NO_OPTIONS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Shelf Life (Days)" name="shelfLifeDays">
                                <InputNumber className="w-full rounded-lg" min={0} placeholder="e.g. 365" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            ),
        },
        {
            key: 'dimensions',
            label: (
                <span>
                    <ColumnWidthOutlined /> Dimensions
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <Row gutter={16}>
                        <Col xs={24} md={6}>
                            <Form.Item label="Length" name="length">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Width" name="width">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Height" name="height">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={6}>
                            <Form.Item label="Unit" name="dimensionUnit">
                                <Select className="rounded-lg w-full" size="large" options={DIMENSION_UNITS} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Weight" name="weight">
                                <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.001} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item label="Weight Unit" name="weightUnit">
                                <Select className="rounded-lg w-full" size="large" options={WEIGHT_UNITS} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>
            ),
        },
        {
            key: 'images',
            label: (
                <span>
                    <PictureOutlined /> Images
                </span>
            ),
            children: (
                <Card className="rounded-2xl shadow-sm border-gray-100">
                    <p className="text-gray-500 text-sm mb-4">Upload images. Max {MAX_IMAGES} images, {MAX_FILE_SIZE_MB}MB each. Supports JPG, PNG, GIF, WebP.</p>
                    <Upload accept={ACCEPT_IMAGES} multiple showUploadList={false} customRequest={handleUpload} listType="picture-card">
                        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 transition-colors">
                            <PlusOutlined className="text-3xl text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">Upload</span>
                            <span className="text-xs text-gray-400 mt-1">{imageList.length} / {MAX_IMAGES} images</span>
                        </div>
                    </Upload>
                    {imageList.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-4">
                            {imageList.map((img) => (
                                <div key={img.uid} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 group">
                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                                    <button type="button" onClick={() => removeImage(img.uid)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">Remove</button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            ),
        },
    ];

    return (
        <MainLayout>
            <div className="w-full space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                            <ArrowLeftOutlined /> Back
                        </Link>
                    </div>
                    <div className="flex gap-2">
                        <Button size="large" className="rounded-xl h-11" onClick={() => navigate('/products')}>Cancel</Button>
                        <Button type="primary" size="large" icon={<SaveOutlined />} loading={saving} onClick={() => form.submit()} className="rounded-xl px-6 h-11 font-bold bg-blue-600 border-blue-600">Save Changes</Button>
                    </div>
                </div>

                <div>
                    <h1 className="text-3xl font-black text-red-600 tracking-tight">Edit Product</h1>
                    <p className="text-gray-600 font-medium mt-1">SKU: {productSku}</p>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Tabs defaultActiveKey="basic" type="card" className="edit-product-tabs" items={tabItems} />
                </Form>
            </div>
        </MainLayout>
    );
}
