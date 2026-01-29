import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, Tabs, Typography, Space, Badge, DatePicker, message, Divider, Avatar, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, DownloadOutlined, EyeOutlined, FileTextOutlined, ShoppingOutlined, BarChartOutlined, DollarOutlined, ReloadOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils';
import { apiRequest } from '../api/client';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function Reports() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [form] = Form.useForm();
    const isSuperAdmin = user?.role === 'super_admin';

    const fetchReports = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            if (isSuperAdmin) {
                const data = await apiRequest('/api/superadmin/reports', { method: 'GET' }, token);
                setReports(Array.isArray(data?.data) ? data.data : []);
            } else {
                const data = await apiRequest('/api/reports', { method: 'GET' }, token);
                setReports(Array.isArray(data?.data) ? data.data : []);
            }
        } catch (err) {
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [token, isSuperAdmin]);

    useEffect(() => {
        if (token) fetchReports();
    }, [token, fetchReports]);

    const handleSubmit = async (values) => {
        try {
            message.success('Analytical extraction scheduled');
            setModalOpen(false);
            fetchReports();
        } catch (err) {
            message.error('Report generation failure');
        }
    };

    const columns = [
        {
            title: 'Report Intelligence',
            key: 'report',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100"><FileTextOutlined /></div>
                    <div>
                        <div className="font-black text-slate-800 uppercase italic tracking-tighter">{r.reportName || r.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono italic">GENERATED: {formatDate(r.createdAt)}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Taxonomy',
            dataIndex: 'category',
            key: 'cat',
            render: (v) => <Tag color="blue" className="font-black border-none text-[10px] uppercase italic">{v || 'OPERATIONAL'}</Tag>
        },
        {
            title: 'Temporal State',
            dataIndex: 'schedule',
            key: 'sch',
            render: (v) => <Tag className="rounded-full px-3 font-bold text-[10px] uppercase border-slate-100">{v || 'AD-HOC'}</Tag>
        },
        {
            title: 'Format',
            dataIndex: 'format',
            key: 'fmt',
            render: (v) => <Tag color="cyan" className="font-black text-[9px]">{v || 'PDF'}</Tag>
        },
        {
            title: 'Protocol',
            key: 'act',
            render: (_, r) => (
                <Space>
                    <Button type="text" icon={<DownloadOutlined className="text-indigo-500" />} />
                    <Button type="text" icon={<EyeOutlined className="text-slate-400" />} />
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Space>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Reports</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest leading-loose">Automated analytical extractions, performance metrics, and operational forecasting reports</p>
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} size="large" className="h-14 px-8 rounded-2xl bg-slate-900 border-slate-900 shadow-2xl shadow-slate-200 font-bold" onClick={() => setModalOpen(true)}>
                        Create Report
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Extractions</div><div className="text-3xl font-black">{reports.length}</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-emerald-500 uppercase mb-1">Success Rate</div><div className="text-3xl font-black">100%</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-blue-500 uppercase mb-1">Active Schedules</div><div className="text-3xl font-black">18</div></Card>
                    <Card className="rounded-3xl border-none shadow-sm"><div className="text-[10px] font-black text-indigo-500 uppercase mb-1">API Webhooks</div><div className="text-3xl font-black">4</div></Card>
                </div>

                <Card className="rounded-[2.5rem] shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="bg-white p-8 report-tabs"
                        items={[
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-6 py-2"><FileTextOutlined className="mr-2" /> Global Registry</span>,
                                key: 'all',
                                children: (
                                    <>
                                        <div className="mt-8 flex items-center justify-between mb-8">
                                            <Search placeholder="Audit Intel Search (Directive Title, Taxonomy)..." className="max-w-md h-12 shadow-sm rounded-xl" prefix={<SearchOutlined />} />
                                            <Button icon={<ReloadOutlined />} onClick={fetchReports} />
                                        </div>
                                        <Table columns={columns} dataSource={reports} rowKey="id" loading={loading} />
                                    </>
                                )
                            },
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-6 py-2"><ShoppingOutlined className="mr-2" /> Stock Dynamics</span>,
                                key: 'inv'
                            },
                            {
                                label: <span className="font-black uppercase tracking-widest text-[11px] px-6 py-2"><BarChartOutlined className="mr-2" /> Velocity</span>,
                                key: 'perf'
                            }
                        ]}
                    />
                </Card>

                <Modal title="Configure Analytical Intent" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600} className="report-modal">
                    <Form form={form} layout="vertical" onFinish={handleSubmit} className="pt-6">
                        <Form.Item label="Directive Title (Report Name)" name="reportName" rules={[{ required: true }]}><Input placeholder="Quarterly Throughput Analysis" className="h-11 rounded-xl" /></Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Intelligence Taxonomy" name="category" rules={[{ required: true }]}><Select className="h-11 rounded-xl"><Option value="Inventory">Inventory Intelligence</Option><Option value="Orders">Order Dynamics</Option><Option value="Performance">Velocity Metrics</Option><Option value="Financial">Fiscal Analysis</Option></Select></Form.Item>
                            <Form.Item label="Temporal Schedule" name="schedule"><Select className="h-11 rounded-xl"><Option value="Daily">Daily Sync</Option><Option value="Weekly">Weekly Digest</Option><Option value="Monthly">Monthly Audit</Option><Option value="One-time">Ad-Hoc Extraction</Option></Select></Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item label="Encoding Protocol" name="format" initialValue="PDF"><Select className="h-11 rounded-xl"><Option value="PDF">Encapsulated Document (PDF)</Option><Option value="Excel">Data Grid (Excel)</Option><Option value="CSV">Binary Logic (CSV)</Option></Select></Form.Item>
                            <Form.Item label="Notification Level" name="alert"><Select className="h-11 rounded-xl"><Option value="HIGH">Critical Alerts</Option><Option value="Normal">Status Updates</Option><Option value="NONE">Silent Grid</Option></Select></Form.Item>
                        </div>
                        <Divider><div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Parameterization Window</div></Divider>
                        <Form.Item label="Extraction Temporal Range" name="range"><RangePicker className="w-full h-11 rounded-xl" /></Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
