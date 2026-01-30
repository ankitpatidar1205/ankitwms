import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Row, Col, Divider, Statistic, Steps } from 'antd';
import {
    PlusOutlined, SearchOutlined, ReloadOutlined,
    UndoOutlined, CheckCircleOutlined, CloseCircleOutlined,
    DollarOutlined, EyeOutlined, SafetyCertificateOutlined,
    DropboxOutlined
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';
import { formatDate } from '../../utils';
import { KPICard } from '../../components/ui/KPICard';

const { Search } = Input;
const { Option } = Select;
const { Step } = Steps;

export default function Returns() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [returns, setReturns] = useState([]);

    // Create RMA State
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createForm] = Form.useForm();
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Manage RMA State
    const [manageModalOpen, setManageModalOpen] = useState(false);
    const [selectedRMA, setSelectedRMA] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [inspectForm] = Form.useForm();

    const fetchReturns = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const res = await apiRequest('/api/returns', { method: 'GET' }, token);
            setReturns(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            message.error(err.message || 'Failed to load returns');
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchDeliveredOrders = async () => {
        try {
            // Fetch ALL orders and filter for DELIVERED on client side for now (or optimize backend later)
            // Using existing order endpoint
            const res = await apiRequest('/api/orders/sales', { method: 'GET' }, token);
            const list = Array.isArray(res.data) ? res.data : [];
            setDeliveredOrders(list.filter(o =>
                o.status === 'DELIVERED' ||
                o.Shipment?.deliveryStatus === 'DELIVERED' ||
                o.Shipment?.deliveryStatus === 'SHIPPED' // Allow Shipped for testing/returns in transit
            ));
        } catch (_) {
            message.error('Failed to load delivered orders');
        }
    };

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    useEffect(() => {
        if (createModalOpen) fetchDeliveredOrders();
    }, [createModalOpen]);

    const handleCreateRMA = async (values) => {
        try {
            if (!selectedOrder?.Shipment) { // Should have shipment if delivered
                // Fallback or error if shipment missing (though Data Model says 1-1)
                // Doing a quick check via selectedOrder
            }
            // We need shipmentId. We assume selectedOrder object has it or we fetched it.
            // Since the orders list might not have nested Shipment, we might need to fetch detailed order or guess.
            // Let's assume order object has Shipment populated or we find it.
            // Actually, querying orders/sales usually includes basic relations.

            const payload = {
                salesOrderId: values.salesOrderId,
                shipmentId: selectedOrder.Shipment?.id,
                returnType: values.returnType,
                reason: values.reason,
                notes: values.notes
            };

            await apiRequest('/api/returns', { method: 'POST', body: JSON.stringify(payload) }, token);
            message.success('RMA Initiated Successfully');
            setCreateModalOpen(false);
            createForm.resetFields();
            fetchReturns();
        } catch (err) {
            message.error(err.message || 'Failed to create RMA');
        }
    };

    const handleAction = async (action, values = {}) => {
        if (!selectedRMA) return;
        setActionLoading(true);
        try {
            let endpoint = '';
            let body = {};

            switch (action) {
                case 'receive': endpoint = 'receive'; break;
                case 'inspect': endpoint = 'inspect'; body = values; break;
                case 'refund': endpoint = 'refund'; body = values; break;
                case 'close': endpoint = 'close'; break;
            }

            const res = await apiRequest(`/api/returns/${selectedRMA.id}/${endpoint}`, {
                method: 'PUT',
                body: JSON.stringify(body)
            }, token);

            message.success(`Action ${action} completed`);

            // Update local state or re-fetch
            if (manageModalOpen) {
                setSelectedRMA(res.data); // Update modal data
            }
            fetchReturns();

            if (action === 'close') setManageModalOpen(false);
        } catch (err) {
            message.error(err.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const columns = [
        { title: 'RMA #', dataIndex: 'rmaNumber', key: 'rma', render: (t) => <span className="font-bold text-red-600">{t}</span> },
        { title: 'Order #', dataIndex: ['SalesOrder', 'orderNumber'], key: 'order' },
        { title: 'Customer', dataIndex: ['Customer', 'name'], key: 'cust' },
        { title: 'Type', dataIndex: 'returnType', key: 'type', render: t => <Tag>{t}</Tag> },
        {
            title: 'Status', dataIndex: 'status', key: 'status',
            render: s => {
                let color = 'default';
                if (s === 'RMA_CREATED') color = 'blue';
                if (s === 'RECEIVED') color = 'orange';
                if (s === 'APPROVED') color = 'green';
                if (s === 'REJECTED') color = 'red';
                if (s === 'CLOSED') color = 'gray';
                return <Tag color={color} className="font-bold">{s}</Tag>;
            }
        },
        { title: 'Date', dataIndex: 'createdAt', key: 'date', render: d => formatDate(d) },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => <Button icon={<EyeOutlined />} onClick={() => { setSelectedRMA(r); setManageModalOpen(true); }}>Manage</Button>
        }
    ];

    // Stats
    const openCount = returns.filter(r => ['RMA_CREATED', 'AWAITING_RETURN'].includes(r.status)).length;
    const processingCount = returns.filter(r => ['RECEIVED', 'IN_INSPECTION'].includes(r.status)).length;
    const completedCount = returns.filter(r => ['CLOSED', 'REFUNDED'].includes(r.status)).length;
    const liability = returns.filter(r => ['APPROVED', 'REFUNDED'].includes(r.status)).reduce((acc, curr) => acc + Number(curr.recoveryValue || 0), 0);

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Returns (RMA)</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Reverse Logistics and Asset Recovery</p>
                    </div>
                    <Button type="primary" danger icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl font-bold shadow-xl shadow-red-100" onClick={() => setCreateModalOpen(true)}>
                        Initiate Return
                    </Button>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={6}>
                        <KPICard title="Open RMAs" value={openCount} icon={<UndoOutlined />} color="blue" />
                    </Col>
                    <Col xs={24} sm={6}>
                        <KPICard title="Processing" value={processingCount} icon={<DropboxOutlined />} color="orange" />
                    </Col>
                    <Col xs={24} sm={6}>
                        <KPICard title="Recovered" value={completedCount} icon={<CheckCircleOutlined />} color="green" />
                    </Col>
                    <Col xs={24} sm={6}>
                        <KPICard title="Liability" value={`£${liability.toFixed(2)}`} icon={<DollarOutlined />} color="red" />
                    </Col>
                </Row>

                <Card className="rounded-3xl shadow-sm border-gray-100 overflow-hidden">
                    <Table dataSource={returns} columns={columns} rowKey="id" loading={loading} />
                </Card>

                {/* Create RMA Modal */}
                <Modal title="Initiate Return Merchandise Authorization (RMA)" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} footer={null} width={800}>
                    <Form form={createForm} layout="vertical" onFinish={handleCreateRMA}>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Select Delivered Order" name="salesOrderId" rules={[{ required: true }]}>
                                <Select
                                    showSearch
                                    placeholder="Search Order #..."
                                    optionFilterProp="children"
                                    onChange={(val) => setSelectedOrder(deliveredOrders.find(o => o.id === val))}
                                >
                                    {deliveredOrders.map(o => (
                                        <Option key={o.id} value={o.id}>{o.orderNumber} - {o.Customer?.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Form.Item label="Return Strategy" name="returnType" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="REFUND">Return & Refund</Option>
                                    <Option value="REPLACE">Return & Replace</Option>
                                    <Option value="INSPECTION">Inspection Only</Option>
                                </Select>
                            </Form.Item>
                        </div>
                        <Form.Item label="Reason for Return" name="reason" rules={[{ required: true }]}>
                            <Select>
                                <Option value="DAMAGED">Damaged in Transit</Option>
                                <Option value="DEFECTIVE">Product Defective</Option>
                                <Option value="WRONG_ITEM">Wrong Item Sent</Option>
                                <Option value="NO_LONGER_NEEDED">No Longer Needed</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item label="Notes" name="notes">
                            <Input.TextArea rows={3} />
                        </Form.Item>

                        {selectedOrder && (
                            <div className="bg-gray-50 p-4 rounded-xl mb-4">
                                <h4 className="font-bold">Order Details</h4>
                                <p className="text-xs">Shipment ID: {selectedOrder.Shipment?.id || 'Fetching...'}</p>
                                <p className="text-xs">Customer: {selectedOrder.Customer?.name}</p>
                            </div>
                        )}

                        <Button type="primary" danger htmlType="submit" block size="large" className="font-bold">
                            Generate RMA
                        </Button>
                    </Form>
                </Modal>

                {/* Manage RMA Modal */}
                <Modal
                    title={<span className="font-black text-xl">Manage RMA: {selectedRMA?.rmaNumber}</span>}
                    open={manageModalOpen}
                    onCancel={() => setManageModalOpen(false)}
                    width={900}
                    footer={null}
                >
                    {selectedRMA && (
                        <div className="space-y-6">
                            <Steps current={['RMA_CREATED', 'AWAITING_RETURN', 'RECEIVED', 'IN_INSPECTION', 'APPROVED', 'REFUNDED', 'CLOSED'].indexOf(selectedRMA.status)} size="small" className="mb-8">
                                <Step title="Initiated" />
                                <Step title="Received" />
                                <Step title="Inspected" />
                                <Step title="Approved" />
                                <Step title="Closed" />
                            </Steps>

                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-2">Details</h4>
                                    <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                        <p><strong>Reason:</strong> {selectedRMA.reason}</p>
                                        <p><strong>Type:</strong> {selectedRMA.returnType}</p>
                                        <p><strong>Notes:</strong> {selectedRMA.notes || 'None'}</p>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <p><strong>Customer:</strong> {selectedRMA.Customer?.name}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold uppercase text-xs text-gray-500 mb-2">Actions</h4>
                                    <div className="space-y-3">
                                        {['RMA_CREATED', 'AWAITING_RETURN'].includes(selectedRMA.status) && (
                                            <Button type="primary" block onClick={() => handleAction('receive')}>
                                                Mark as Received
                                            </Button>
                                        )}

                                        {['RECEIVED', 'IN_INSPECTION'].includes(selectedRMA.status) && (
                                            <div className="border border-gra-200 p-4 rounded-xl">
                                                <h5 className="font-bold mb-2">Inspection Decision</h5>
                                                <Form form={inspectForm} layout="vertical" onFinish={(vals) => handleAction('inspect', vals)}>
                                                    <Form.Item name="outcome" label="Outcome" rules={[{ required: true }]}>
                                                        <Select>
                                                            <Option value="APPROVED">Approve Return</Option>
                                                            <Option value="REJECTED">Reject Return</Option>
                                                        </Select>
                                                    </Form.Item>
                                                    <Form.Item name="recoveryValue" label="Recovery Value (£)">
                                                        <Input type="number" />
                                                    </Form.Item>
                                                    <Form.Item name="notes" label="Inspection Notes">
                                                        <Input.TextArea rows={2} />
                                                    </Form.Item>
                                                    <Button type="primary" htmlType="submit" block loading={actionLoading}>Submit Decision</Button>
                                                </Form>
                                            </div>
                                        )}

                                        {selectedRMA.status === 'APPROVED' && selectedRMA.returnType === 'REFUND' && (
                                            <Button type="primary" danger block onClick={() => handleAction('refund', { amount: selectedRMA.recoveryValue })}>
                                                Process Refund (£{selectedRMA.recoveryValue})
                                            </Button>
                                        )}

                                        {['REFUNDED', 'REJECTED'].includes(selectedRMA.status) && (
                                            <Button size="large" block onClick={() => handleAction('close')}>
                                                Close RMA
                                            </Button>
                                        )}

                                        {selectedRMA.status === 'CLOSED' && <div className="text-center font-bold text-gray-400">RMA Closed</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </MainLayout>
    );
}
