import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Card, Form, Select, Empty, Tag, message } from 'antd';
import { EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../api/client';
import { formatNumber } from '../../utils';

export default function InventoryByLocation() {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [form] = Form.useForm();

    const fetchWarehouses = useCallback(async () => {
        if (!token) return;
        try {
            const res = await apiRequest('/api/warehouses', { method: 'GET' }, token);
            setWarehouses(Array.isArray(res?.data) ? res.data : []);
        } catch {
            setWarehouses([]);
        }
    }, [token]);

    const fetchData = useCallback(async () => {
        if (!token) return;
        const values = form.getFieldsValue();
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (values.warehouseId) params.set('warehouseId', values.warehouseId);
            if (values.locationType) params.set('locationType', values.locationType);
            const res = await apiRequest(`/api/inventory/stock/by-location?${params.toString()}`, { method: 'GET' }, token);
            setData(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            setData([]);
            message.error(err?.message || 'Failed to load inventory by location.');
        } finally {
            setLoading(false);
        }
    }, [token, form]);

    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const columns = [
        {
            title: 'Location',
            key: 'location',
            width: 260,
            render: (_, r) => (
                <div>
                    <div className="font-medium text-blue-600">{r.locationCode || r.locationName || '—'}</div>
                    {r.pickSequence != null && <Tag color="purple" className="mt-1">Seq: {r.pickSequence}</Tag>}
                    {r.locationName && r.locationCode !== r.locationName && <div className="text-gray-500 text-sm mt-0.5">{r.locationName}</div>}
                </div>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'locationType',
            key: 'type',
            width: 100,
            render: (v) => v && v !== '—' ? <Tag color="green">{v}</Tag> : '—',
        },
        { title: 'Zone', dataIndex: 'zoneName', key: 'zone', width: 120, render: (v) => v || '—' },
        {
            title: 'Properties',
            dataIndex: 'properties',
            key: 'properties',
            width: 140,
            render: (v) => v && v !== '—' ? <Tag color="red">{v}</Tag> : '—',
        },
        {
            title: 'Total Items',
            dataIndex: 'totalItems',
            key: 'totalItems',
            width: 120,
            align: 'right',
            render: (v) => (v != null && v >= 99 ? <Tag color="green">99+</Tag> : formatNumber(v ?? 0)),
        },
        { title: 'Product Count', dataIndex: 'productCount', key: 'productCount', width: 120, align: 'right', render: (v) => formatNumber(v ?? 0) },
        { title: 'Warnings', dataIndex: 'warnings', key: 'warnings', width: 140, ellipsis: true, render: (v) => v && v !== '—' ? <Tag color="orange">{v}</Tag> : '—' },
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <EnvironmentOutlined className="text-2xl text-blue-600" />
                        <div>
                            <h1 className="text-2xl font-medium text-blue-600">Inventory by Location</h1>
                            <p className="text-gray-500 text-sm mt-0.5">View stock grouped by location name</p>
                        </div>
                    </div>
                    <Button icon={<ReloadOutlined />} className="rounded-lg" onClick={fetchData} loading={loading}>
                        Refresh
                    </Button>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100">
                    <Form form={form} layout="inline" className="flex flex-wrap gap-4 mb-4">
                        <Form.Item name="warehouseId" label="Select Warehouse" className="mb-0">
                            <Select placeholder="Select Warehouse" allowClear className="w-48 rounded-lg" options={warehouses.map(w => ({ value: w.id, label: w.name }))} />
                        </Form.Item>
                        <Form.Item name="locationType" label="Location Type" className="mb-0">
                            <Select placeholder="Location Type" allowClear className="w-40 rounded-lg" options={[{ value: 'PICK', label: 'Pick' }, { value: 'BULK', label: 'Bulk' }, { value: 'QUARANTINE', label: 'Quarantine' }, { value: 'STAGING', label: 'Staging' }]} />
                        </Form.Item>
                    </Form>

                    <Table
                        columns={columns}
                        dataSource={data}
                        rowKey={(r) => r.locationId ?? `loc-${r.locationCode}-${r.locationName}`}
                        loading={loading}
                        pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} locations`, pageSize: 20 }}
                        className="[&_.ant-table-thead_th]:font-normal"
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <span>
                                            No inventory by location found.
                                            <br />
                                            <span className="text-gray-400 text-sm">Add stock in Inventory to see data here, or try clearing filters.</span>
                                        </span>
                                    }
                                    className="py-12"
                                />
                            ),
                        }}
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
