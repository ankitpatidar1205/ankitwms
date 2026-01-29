import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Tabs, Spin, Descriptions, Tag } from 'antd';
import {
    ArrowLeftOutlined,
    EditOutlined,
    AppstoreOutlined,
    DollarOutlined,
    InboxOutlined,
    GlobalOutlined,
    BankOutlined,
    ColumnWidthOutlined,
    PictureOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatCurrency } from '../../utils';

export default function ViewProduct() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState(null);

    const fetchProduct = useCallback(async () => {
        if (!token || !id) return;
        try {
            setLoading(true);
            const res = await apiRequest(`/api/inventory/products/${id}`, { method: 'GET' }, token);
            const p = res?.data ?? res;
            if (!p) throw new Error('Product not found');
            setProduct(p);
        } catch (err) {
            setProduct(null);
            navigate('/products');
        } finally {
            setLoading(false);
        }
    }, [token, id, navigate]);

    useEffect(() => {
        fetchProduct();
    }, [fetchProduct]);

    if (loading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Spin size="large" />
                </div>
            </MainLayout>
        );
    }

    if (!product) return null;

    const ms = product.marketplaceSkus && typeof product.marketplaceSkus === 'object' ? product.marketplaceSkus : {};
    const images = Array.isArray(product.images) ? product.images : [];
    const categoryName = product.Category?.name || product.categoryId || '—';
    const supplierName = product.Supplier?.name || product.supplierId || '—';
    const cartons = product.cartons && typeof product.cartons === 'object' ? product.cartons : {};
    const priceLists = product.priceLists && typeof product.priceLists === 'object' ? product.priceLists : {};
    const costPrice = product.costPrice != null ? Number(product.costPrice) : null;
    const sellingPrice = product.price != null ? Number(product.price) : null;
    const margin =
        costPrice != null && costPrice > 0 && sellingPrice != null
            ? (((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100).toFixed(1) + '%'
            : '—';

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
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Product Name">{product.name}</Descriptions.Item>
                        <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
                        <Descriptions.Item label="Type">{product.productType || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={product.status === 'ACTIVE' ? 'green' : 'default'}>{product.status || '—'}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Category">{categoryName}</Descriptions.Item>
                        <Descriptions.Item label="Primary Supplier">{supplierName}</Descriptions.Item>
                        <Descriptions.Item label="Barcode">{product.barcode || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Unit of Measure">{product.unitOfMeasure || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Description" span={2}>{product.description || '—'}</Descriptions.Item>
                    </Descriptions>
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
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Cost Price">{costPrice != null ? formatCurrency(costPrice) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Selling Price">{sellingPrice != null ? formatCurrency(sellingPrice) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Margin">{margin}</Descriptions.Item>
                        <Descriptions.Item label="VAT Rate (%)">{product.vatRate != null ? Number(product.vatRate) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="VAT Code">{product.vatCode || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Customs Tariff">{product.customsTariff || '—'}</Descriptions.Item>
                    </Descriptions>
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
                    {!cartons.unitsPerCarton && !cartons.length && !cartons.width && !cartons.height && !cartons.weight && !cartons.barcode ? (
                        <p className="text-gray-500 text-sm">No carton configuration.</p>
                    ) : (
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                            <Descriptions.Item label="Units per Carton">{cartons.unitsPerCarton ?? '—'}</Descriptions.Item>
                            <Descriptions.Item label="Carton Barcode">{cartons.barcode || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Length (cm)">{cartons.length != null ? cartons.length : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Width (cm)">{cartons.width != null ? cartons.width : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Height (cm)">{cartons.height != null ? cartons.height : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Weight (kg)">{cartons.weight != null ? cartons.weight : '—'}</Descriptions.Item>
                        </Descriptions>
                    )}
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
                    {!priceLists.listPrice && !priceLists.wholesalePrice && !priceLists.retailPrice && Object.keys(priceLists).length === 0 ? (
                        <p className="text-gray-500 text-sm">No price list overrides.</p>
                    ) : (
                        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                            <Descriptions.Item label="List Price">{priceLists.listPrice != null ? formatCurrency(priceLists.listPrice) : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Wholesale Price">{priceLists.wholesalePrice != null ? formatCurrency(priceLists.wholesalePrice) : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Retail Price">{priceLists.retailPrice != null ? formatCurrency(priceLists.retailPrice) : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Minimum Order Price">{priceLists.minOrderPrice != null ? formatCurrency(priceLists.minOrderPrice) : '—'}</Descriptions.Item>
                        </Descriptions>
                    )}
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
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="HD SKU">{ms.hdSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="HD Sale SKU">{ms.hdSaleSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Warehouse ID">{ms.warehouseId || '—'}</Descriptions.Item>
                        <Descriptions.Item label="eBay ID">{ms.ebayId || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon SKU">{ms.amazonSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon SKU (Split Before)">{ms.amazonSkuSplitBefore || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon MPN SKU">{ms.amazonMpnSku || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Amazon ID SKU">{ms.amazonIdSku || '—'}</Descriptions.Item>
                    </Descriptions>
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
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Reorder Point">{product.reorderLevel ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Reorder Quantity">{product.reorderQty ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Max Stock Level">{product.maxStock ?? '—'}</Descriptions.Item>
                        <Descriptions.Item label="Heat Sensitive">{product.heatSensitive || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Perishable">{product.perishable || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Require Batch Tracking">{product.requireBatchTracking || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Shelf Life (Days)">{product.shelfLifeDays ?? '—'}</Descriptions.Item>
                    </Descriptions>
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
                    <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small" className="rounded-lg overflow-hidden">
                        <Descriptions.Item label="Length">{product.length != null ? Number(product.length) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Width">{product.width != null ? Number(product.width) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Height">{product.height != null ? Number(product.height) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Dimension Unit">{product.dimensionUnit || '—'}</Descriptions.Item>
                        <Descriptions.Item label="Weight">{product.weight != null ? Number(product.weight) : '—'}</Descriptions.Item>
                        <Descriptions.Item label="Weight Unit">{product.weightUnit || '—'}</Descriptions.Item>
                    </Descriptions>
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
                    {images.length === 0 ? (
                        <p className="text-gray-500 text-sm">No images.</p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {images.map((url, idx) => (
                                <div key={idx} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
                                    <img src={url} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
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
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/products" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium">
                            <ArrowLeftOutlined /> Back
                        </Link>
                    </div>
                    <Link to={`/products/${id}/edit`}>
                        <Button type="primary" size="large" icon={<EditOutlined />} className="rounded-xl px-6 h-11 font-bold bg-blue-600 border-blue-600">
                            Edit Product
                        </Button>
                    </Link>
                </div>

                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">View Product</h1>
                    <p className="text-gray-600 font-medium mt-1">SKU: {product.sku}</p>
                </div>

                <Tabs defaultActiveKey="basic" type="card" className="view-product-tabs" items={tabItems} />
            </div>
        </MainLayout>
    );
}
