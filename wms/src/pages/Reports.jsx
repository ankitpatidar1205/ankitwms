import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Button,
    Input,
    Select,
    Tag,
    Card,
    Modal,
    Form,
    Tabs,
    Space,
    DatePicker,
    message,
    Popconfirm,
    Drawer,
} from 'antd';
import {
    PlusOutlined,
    SearchOutlined,
    DownloadOutlined,
    EyeOutlined,
    EditOutlined,
    FileTextOutlined,
    ShoppingOutlined,
    BarChartOutlined,
    DollarOutlined,
    ReloadOutlined,
    DeleteOutlined,
    CalendarOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuthStore } from '../store/authStore';
import { formatDate } from '../utils';
import { apiRequest } from '../api/client';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const REPORT_TYPES = [
    { value: 'INVENTORY', label: 'Inventory Report' },
    { value: 'ORDERS', label: 'Orders Report' },
    { value: 'FINANCIAL', label: 'Financial Report' },
    { value: 'PERFORMANCE', label: 'Performance Report' },
];

const FORMAT_OPTIONS = [
    { value: 'PDF', label: 'PDF Document' },
    { value: 'CSV', label: 'CSV' },
    { value: 'EXCEL', label: 'Excel' },
];

const SCHEDULE_OPTIONS = [
    { value: 'ONCE', label: 'Once' },
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
];

const CATEGORY_TABS = [
    { key: 'all', label: 'All Reports', icon: <FileTextOutlined /> },
    { key: 'INVENTORY', label: 'Inventory', icon: <ShoppingOutlined /> },
    { key: 'ORDERS', label: 'Orders', icon: <FileTextOutlined /> },
    { key: 'PERFORMANCE', label: 'Performance', icon: <BarChartOutlined /> },
    { key: 'FINANCIAL', label: 'Financial', icon: <DollarOutlined /> },
];

export default function Reports() {
    const { token, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [templateModalOpen, setTemplateModalOpen] = useState(false);
    const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [editForm] = Form.useForm();
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [scheduleFilter, setScheduleFilter] = useState(undefined);
    const [formatFilter, setFormatFilter] = useState(undefined);
    const [form] = Form.useForm();

    const fetchReports = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (activeTab && activeTab !== 'all') params.set('category', activeTab);
            if (searchText) params.set('search', searchText);
            if (dateRange && dateRange[0]) params.set('startDate', dateRange[0].format('YYYY-MM-DD'));
            if (dateRange && dateRange[1]) params.set('endDate', dateRange[1].format('YYYY-MM-DD'));
            if (scheduleFilter) params.set('schedule', scheduleFilter);
            if (formatFilter) params.set('format', formatFilter);
            const url = `/api/reports${params.toString() ? `?${params.toString()}` : ''}`;
            const res = await apiRequest(url, { method: 'GET' }, token);
            setReports(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            message.error(err?.message || 'Failed to load reports');
            setReports([]);
        } finally {
            setLoading(false);
        }
    }, [token, activeTab, searchText, dateRange, scheduleFilter, formatFilter]);

    useEffect(() => {
        if (token) fetchReports();
    }, [token, fetchReports]);

    const handleGenerateSubmit = async (values) => {
        if (!token) return;
        try {
            const [startDate, endDate] = values.dateRange || [];
            await apiRequest('/api/reports', {
                method: 'POST',
                body: JSON.stringify({
                    reportType: values.reportType,
                    reportName: values.reportName,
                    startDate: startDate ? startDate.format('YYYY-MM-DD') : undefined,
                    endDate: endDate ? endDate.format('YYYY-MM-DD') : undefined,
                    format: values.format || 'PDF',
                }),
            }, token);
            message.success('Report generated successfully');
            setGenerateModalOpen(false);
            form.resetFields();
            fetchReports();
        } catch (err) {
            message.error(err?.message || 'Failed to generate report');
        }
    };

    const handleDelete = async (id) => {
        if (!token) return;
        if (id == null || typeof id === 'string') {
            message.warning('This report cannot be deleted.');
            return;
        }
        try {
            await apiRequest(`/api/reports/${id}`, { method: 'DELETE' }, token);
            message.success('Report deleted');
            setViewDrawerOpen(false);
            setSelectedReport(null);
            fetchReports();
        } catch (err) {
            message.error(err?.message || 'Failed to delete');
        }
    };

    const openView = (record) => {
        if (record.id == null || typeof record.id === 'string') {
            message.info('View is available for generated reports only.');
            return;
        }
        setSelectedReport(record);
        setViewDrawerOpen(true);
    };

    const openEdit = (record) => {
        if (record.id == null || typeof record.id === 'string') {
            message.info('Edit is available for generated reports only.');
            return;
        }
        setSelectedReport(record);
        editForm.setFieldsValue({
            reportName: record.reportName,
            reportType: record.reportType,
            schedule: record.schedule || 'ONCE',
            format: record.format || 'PDF',
        });
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (values) => {
        if (!token || !selectedReport?.id) return;
        try {
            await apiRequest(`/api/reports/${selectedReport.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    reportName: values.reportName,
                    reportType: values.reportType,
                    schedule: values.schedule || 'ONCE',
                    format: values.format || 'PDF',
                }),
            }, token);
            message.success('Report updated');
            setEditModalOpen(false);
            setSelectedReport(null);
            editForm.resetFields();
            fetchReports();
        } catch (err) {
            message.error(err?.message || 'Failed to update report');
        }
    };

    const handleDownload = (record) => {
        if (record.id == null || typeof record.id === 'string') {
            message.info('Download is available for generated reports only.');
            return;
        }
        message.info('Report export (PDF/CSV) will be available in a future update. Report details can be viewed or edited.');
    };

    const filteredReports = reports;
    const totalCount = reports.length;
    const inventoryCount = reports.filter((r) => (r.category || r.reportType) === 'INVENTORY').length;
    const orderCount = reports.filter((r) => (r.category || r.reportType) === 'ORDERS').length;
    const financialCount = reports.filter((r) => (r.category || r.reportType) === 'FINANCIAL').length;

    const columns = [
        { title: 'Report Name', dataIndex: 'reportName', key: 'reportName', width: 220, render: (v) => <span className="font-medium text-gray-900">{v || '—'}</span> },
        { title: 'Category', dataIndex: 'category', key: 'category', width: 120, render: (v) => <Tag color="blue">{v || '—'}</Tag> },
        { title: 'Schedule', dataIndex: 'schedule', key: 'schedule', width: 100, render: (v) => v || 'Once' },
        { title: 'Last Run', dataIndex: 'lastRunAt', key: 'lastRunAt', width: 140, render: (v) => (v ? formatDate(v) : '—') },
        { title: 'Format', dataIndex: 'format', key: 'format', width: 90, render: (v) => <Tag color="cyan">{v || 'PDF'}</Tag> },
        { title: 'Status', dataIndex: 'status', key: 'status', width: 100, render: (v) => <Tag color={v === 'COMPLETED' ? 'green' : v === 'FAILED' ? 'red' : 'default'}>{v || '—'}</Tag> },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            fixed: 'right',
            render: (_, record) => {
                const canModify = record.id != null && typeof record.id === 'number';
                return (
                    <Space size="small" wrap>
                        <Button type="link" size="small" icon={<EyeOutlined />} className="p-0 text-blue-600" onClick={() => openView(record)}>View</Button>
                        <Button type="link" size="small" icon={<EditOutlined />} className="p-0 text-blue-600" onClick={() => openEdit(record)}>Edit</Button>
                        <Button type="link" size="small" icon={<DownloadOutlined />} className="p-0 text-blue-600" onClick={() => handleDownload(record)}>Download</Button>
                        {canModify ? (
                            <Popconfirm title="Delete this report?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(record.id)}>
                                <Button type="link" size="small" danger icon={<DeleteOutlined />} className="p-0">Delete</Button>
                            </Popconfirm>
                        ) : (
                            <Button type="link" size="small" disabled className="p-0 text-gray-400">Delete</Button>
                        )}
                    </Space>
                );
            },
        },
    ];

    const tabContent = (
        <>
            <div className="flex flex-wrap items-center gap-3 px-0 py-4 border-b border-gray-100">
                <Input placeholder="Search reports..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} className="w-56 rounded-lg" allowClear />
                <RangePicker placeholder={['Start Date', 'End Date']} value={dateRange} onChange={setDateRange} className="rounded-lg" />
                <Select placeholder="Schedule" allowClear value={scheduleFilter} onChange={setScheduleFilter} className="w-32 rounded-lg" options={SCHEDULE_OPTIONS} />
                <Select placeholder="Format" allowClear value={formatFilter} onChange={setFormatFilter} className="w-36 rounded-lg" options={FORMAT_OPTIONS} />
                <Button icon={<ReloadOutlined />} onClick={fetchReports} loading={loading} className="rounded-lg">Refresh</Button>
            </div>
            <Table columns={columns} dataSource={filteredReports} rowKey="id" loading={loading} pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} reports`, pageSize: 10 }} scroll={{ x: 900 }} locale={{ emptyText: 'No data' }} className="[&_.ant-table-thead_th]:font-normal" />
        </>
    );

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Reports & Analytics</h1>
                        <p className="text-gray-500 text-sm mt-0.5">Generate warehouse performance and analytics reports</p>
                    </div>
                    <Space>
                        <Button type="primary" icon={<CalendarOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => setGenerateModalOpen(true)}>
                            Generate Report
                        </Button>
                        <Button icon={<PlusOutlined />} className="rounded-lg" onClick={() => setTemplateModalOpen(true)}>
                            Create Template
                        </Button>
                    </Space>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Total Reports</div>
                        <div className="text-xl font-medium text-blue-600">{totalCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Inventory Reports</div>
                        <div className="text-xl font-medium text-green-600">{inventoryCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Order Reports</div>
                        <div className="text-xl font-medium text-purple-600">{orderCount}</div>
                    </Card>
                    <Card className="rounded-xl shadow-sm border-gray-100">
                        <div className="text-gray-500 text-sm">Financial Reports</div>
                        <div className="text-xl font-medium text-red-600">{financialCount}</div>
                    </Card>
                </div>

                <Card className="rounded-xl shadow-sm border-gray-100 overflow-hidden">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="px-4 pt-2 [&_.ant-tabs-nav]:mb-0"
                        items={CATEGORY_TABS.map((tab) => ({
                            key: tab.key,
                            label: (
                                <span className="flex items-center gap-2">
                                    {tab.icon}
                                    {tab.label} ({tab.key === 'all' ? reports.length : reports.filter((r) => (r.category || r.reportType) === tab.key).length})
                                </span>
                            ),
                            children: tabContent,
                        }))}
                    />
                </Card>

                <Modal title="Generate Report" open={generateModalOpen} onCancel={() => { setGenerateModalOpen(false); form.resetFields(); }} footer={null} width={520} className="rounded-xl" destroyOnClose>
                    <Form form={form} layout="vertical" onFinish={handleGenerateSubmit} className="pt-2">
                        <Form.Item label="Report Type" name="reportType" rules={[{ required: true, message: 'Select report type' }]}>
                            <Select placeholder="Select report type" className="rounded-lg" options={REPORT_TYPES} />
                        </Form.Item>
                        <Form.Item label="Report Name" name="reportName" rules={[{ required: true, message: 'Enter report name' }]}>
                            <Input placeholder="Enter report name (e.g., Weekly Inventory Report)" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Date Range" name="dateRange">
                            <RangePicker className="w-full rounded-lg" placeholder={['Start Date', 'End Date']} />
                        </Form.Item>
                        <Form.Item label="Output Format" name="format" rules={[{ required: true }]} initialValue="PDF">
                            <Select placeholder="Output format" className="rounded-lg" options={FORMAT_OPTIONS} />
                        </Form.Item>
                        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                            <span className="text-sm text-blue-800">Report will be generated based on selected date range and category</span>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setGenerateModalOpen(false); form.resetFields(); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">OK</Button>
                        </div>
                    </Form>
                </Modal>

                <Modal title="Create Template" open={templateModalOpen} onCancel={() => setTemplateModalOpen(false)} footer={null} width={400} className="rounded-xl">
                    <p className="text-gray-500 text-sm py-4">Save a report configuration as a template for quick generation later. This feature can be extended to store templates in the database.</p>
                    <div className="flex justify-end">
                        <Button onClick={() => setTemplateModalOpen(false)} className="rounded-lg">Close</Button>
                    </div>
                </Modal>

                <Drawer title="Report details" width={420} open={viewDrawerOpen} onClose={() => { setViewDrawerOpen(false); setSelectedReport(null); }} className="rounded-l-xl" destroyOnClose>
                    {selectedReport && (
                        <div className="space-y-4">
                            <div><span className="text-gray-500 text-sm block">Report Name</span><div className="font-medium">{selectedReport.reportName || '—'}</div></div>
                            <div><span className="text-gray-500 text-sm block">Category</span><div><Tag color="blue">{selectedReport.category || selectedReport.reportType || '—'}</Tag></div></div>
                            <div><span className="text-gray-500 text-sm block">Schedule</span><div>{selectedReport.schedule || 'Once'}</div></div>
                            <div><span className="text-gray-500 text-sm block">Last Run</span><div>{selectedReport.lastRunAt ? formatDate(selectedReport.lastRunAt) : '—'}</div></div>
                            <div><span className="text-gray-500 text-sm block">Format</span><div><Tag color="cyan">{selectedReport.format || 'PDF'}</Tag></div></div>
                            <div><span className="text-gray-500 text-sm block">Status</span><div><Tag color={selectedReport.status === 'COMPLETED' ? 'green' : selectedReport.status === 'FAILED' ? 'red' : 'default'}>{selectedReport.status || '—'}</Tag></div></div>
                            {(selectedReport.startDate || selectedReport.endDate) && (
                                <div><span className="text-gray-500 text-sm block">Date range</span><div>{[selectedReport.startDate, selectedReport.endDate].filter(Boolean).join(' to ') || '—'}</div></div>
                            )}
                            <div className="flex gap-2 pt-4 border-t">
                                <Button type="primary" icon={<EditOutlined />} className="bg-blue-600 border-blue-600 rounded-lg" onClick={() => { setViewDrawerOpen(false); openEdit(selectedReport); }}>Edit</Button>
                                {selectedReport.id != null && typeof selectedReport.id === 'number' && (
                                    <Popconfirm title="Delete this report?" okText="Yes" cancelText="No" onConfirm={() => handleDelete(selectedReport.id)}>
                                        <Button danger icon={<DeleteOutlined />} className="rounded-lg">Delete</Button>
                                    </Popconfirm>
                                )}
                            </div>
                        </div>
                    )}
                </Drawer>

                <Modal title="Edit Report" open={editModalOpen} onCancel={() => { setEditModalOpen(false); setSelectedReport(null); editForm.resetFields(); }} footer={null} width={500} className="rounded-xl" destroyOnClose>
                    <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} className="pt-2">
                        <Form.Item label="Report Name" name="reportName" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="Report name" className="rounded-lg" />
                        </Form.Item>
                        <Form.Item label="Report Type" name="reportType">
                            <Select placeholder="Type" className="rounded-lg" options={REPORT_TYPES} />
                        </Form.Item>
                        <Form.Item label="Schedule" name="schedule">
                            <Select placeholder="Schedule" className="rounded-lg" options={SCHEDULE_OPTIONS} />
                        </Form.Item>
                        <Form.Item label="Format" name="format">
                            <Select placeholder="Format" className="rounded-lg" options={FORMAT_OPTIONS} />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button onClick={() => { setEditModalOpen(false); setSelectedReport(null); editForm.resetFields(); }} className="rounded-lg">Cancel</Button>
                            <Button type="primary" htmlType="submit" className="bg-blue-600 border-blue-600 rounded-lg">Save</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    );
}
