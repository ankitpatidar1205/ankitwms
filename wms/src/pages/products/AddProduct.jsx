import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Input, Select, InputNumber, Button, message, Upload, Row, Col } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Option } = Select;
const { TextArea } = Input;

const MAX_IMAGES = 20;
const MAX_FILE_SIZE_MB = 5;
const ACCEPT_IMAGES = '.jpg,.jpeg,.png,.gif,.webp';

const YES_NO_OPTIONS = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const UOM_OPTIONS = [{ value: 'EACH', label: 'Each' }, { value: 'BOX', label: 'Box' }, { value: 'KG', label: 'Kg' }, { value: 'L', label: 'L' }];
const DIMENSION_UNITS = [{ value: 'cm', label: 'Centimeters' }, { value: 'm', label: 'Meters' }, { value: 'in', label: 'Inches' }];
const WEIGHT_UNITS = [{ value: 'kg', label: 'Kilograms' }, { value: 'g', label: 'Grams' }, { value: 'lb', label: 'Pounds' }];

export default function AddProduct() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [imageList, setImageList] = useState([]);

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
        fetchCategories();
        fetchSuppliers();
    }, [fetchCategories, fetchSuppliers]);

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
        if (!token) return;
        try {
            setSaving(true);
            const payload = {
                name: values.name,
                sku: values.sku?.trim() || values.name?.replace(/\s/g, '_').toUpperCase().slice(0, 30),
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
                cartons: null,
                priceLists: null,
            };
            const res = await apiRequest('/api/inventory/products', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('Product created successfully!');
            form.resetFields();
            setImageList([]);
            navigate('/products');
        } catch (err) {
            message.error(err?.data?.message || err?.message || 'Failed to create product');
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

    const initialValues = {
        status: 'ACTIVE',
        productType: 'SIMPLE',
        unitOfMeasure: 'EACH',
        reorderLevel: 0,
        price: 0,
        costPrice: 0,
        vatRate: 20,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        dimensionUnit: 'cm',
        weightUnit: 'kg',
        reorderQty: 0,
        maxStock: 0,
    };

    return (
        <MainLayout>
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center gap-4">
                    <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                        <ArrowLeftOutlined /> Back
                    </Link>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-blue-600 tracking-tight">Add New Product</h1>
                    <p className="text-gray-500 text-sm mt-1">Create a new product in your inventory. Fill all sections and upload images.</p>
                </div>

                <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={initialValues}>
                    {/* Basic Information */}
                    <Card title="Basic Information" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                            <Col xs={24} md={12}>
                                <Form.Item label="Product Name" name="name" rules={[{ required: true, message: 'Required' }]}>
                                    <Input placeholder="e.g. Organic Granola Bar" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item label="SKU" name="sku">
                                    <Input placeholder="e.g. PRD-001" className="rounded-lg" size="large" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Product Type" name="productType">
                                    <Select className="rounded-lg w-full" size="large" options={[{ value: 'SIMPLE', label: 'Simple Product' }, { value: 'BUNDLE', label: 'Bundle' }]} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Status" name="status">
                                    <Select className="rounded-lg w-full" size="large" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Inactive' }]} />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Category" name="categoryId">
                                    <Select allowClear placeholder="Select category" className="rounded-lg w-full" size="large">
                                        {categories.map((c) => (
                                            <Option key={c.id} value={c.id}>{c.name}</Option>
                                        ))}
                                    </Select>
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
                                <Form.Item label="Barcode" name="barcode">
                                    <Input placeholder="Enter barcode (EAN/UPC)" className="rounded-lg" size="large" />
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

                    {/* Pricing */}
                    <Card title="Pricing" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
                            <Col xs={24} md={8}>
                                <Form.Item label="Cost Price" name="costPrice" rules={[{ required: true, message: 'Required' }]}>
                                    <InputNumber className="w-full rounded-lg" size="large" min={0} step={0.01} addonBefore="€" placeholder="0.00" />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item label="Selling Price" name="price" rules={[{ required: true, message: 'Required' }]}>
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

                    {/* Marketplace SKUs */}
                    <Card title="Marketplace SKUs" className="rounded-2xl shadow-sm border-gray-100 mb-6">
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

                    {/* Product Attributes */}
                    <Card title="Product Attributes" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <Row gutter={16}>
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

                    {/* Dimensions & Weight */}
                    <Card title="Dimensions & Weight" className="rounded-2xl shadow-sm border-gray-100 mb-6">
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

                    {/* Inventory Settings */}
                    <Card title="Inventory Settings" className="rounded-2xl shadow-sm border-gray-100 mb-6">
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
                        </Row>
                    </Card>

                    {/* Product Images */}
                    <Card title="Product Images" className="rounded-2xl shadow-sm border-gray-100 mb-6">
                        <p className="text-gray-500 text-sm mb-4">Upload Images. Supports JPG, PNG, GIF, WebP. Max {MAX_IMAGES} images, {MAX_FILE_SIZE_MB}MB each.</p>
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

                    <div className="flex gap-4">
                        <Button type="primary" htmlType="submit" size="large" loading={saving} className="rounded-xl px-8 h-12 font-bold">Create Product</Button>
                        <Button size="large" className="rounded-xl h-12" onClick={() => navigate('/products')}>Cancel</Button>
                    </div>
                </Form>
            </div>
        </MainLayout>
    );
}
