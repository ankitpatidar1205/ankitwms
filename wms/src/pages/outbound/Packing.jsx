import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Tag, Card, Modal, Form, message, Tabs, Space, Tooltip, Progress } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, InboxOutlined, SyncOutlined, CheckCircleOutlined, RocketOutlined, ReloadOutlined, UserOutlined, ShoppingCartOutlined, EnvironmentOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { MainLayout } from '../../components/layout/MainLayout';
import { apiRequest } from '../../api/client';

const { Search } = Input;

export default function Packing() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [packingTasks, setPackingTasks] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchText, setSearchText] = useState('');

    const fetchPacking = useCallback(async () => {
        if (!token) return;
        try {
            setLoading(true);
            const data = await apiRequest('/api/packing', { method: 'GET' }, token);
            setPackingTasks(Array.isArray(data.data) ? data.data : data.data || []);
        } catch (err) {
            message.error(err.message || 'Failed to load packing tasks');
            setPackingTasks([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPacking();
    }, [fetchPacking]);

    const filteredTasks = packingTasks.filter(task =>
        !searchText ||
        (task.SalesOrder?.orderNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (task.SalesOrder?.Customer?.name || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        { title: 'Task ID', dataIndex: 'id', key: 'ps', render: (v, r) => <Link to={`/packing/${r.id}`} className="font-bold text-cyan-600 underline">{String(v).slice(0, 8)}...</Link> },
        { title: 'Sales Order', key: 'order', render: (_, r) => <span className="font-medium text-slate-700">{r.SalesOrder?.orderNumber || '—'}</span> },
        { title: 'Customer', key: 'customer', render: (_, r) => r.SalesOrder?.Customer?.name || '—' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => (
                <Tag color={(s || '').toLowerCase() === 'completed' ? 'green' : (s || '').toLowerCase() === 'packing' ? 'blue' : 'orange'} className="uppercase font-black text-[10px]">
                    {s || 'pending'}
                </Tag>
            )
        },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) => (
                <Button ghost type="primary" size="small" icon={<GiftOutlined />} className="border-cyan-500 text-cyan-500 hover:bg-cyan-50" onClick={() => navigate(`/packing/${r.id}`)}>
                    Execute
                </Button>
            )
        }
    ];

    return (
        <MainLayout>
            <div className="space-y-6 animate-in fade-in duration-500 pb-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Packing</h1>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em]">Final stage verification and containerization</p>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchPacking} className="h-12 rounded-xl border-slate-200">Refresh</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending', count: packingTasks.filter(t => (t.status || '').toLowerCase() === 'pending').length, color: 'text-orange-500' },
                        { label: 'Packing', count: packingTasks.filter(t => (t.status || '').toLowerCase() === 'packing').length, color: 'text-blue-500' },
                        { label: 'Completed', count: packingTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length, color: 'text-cyan-500' },
                        { label: 'Total', count: packingTasks.length, color: 'text-green-500' }
                    ].map((stat, i) => (
                        <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden group">
                            <div className="flex flex-col relative z-10">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</span>
                                <span className={`text-4xl font-black ${stat.color} group-hover:scale-110 transition-transform`}>{stat.count}</span>
                            </div>
                            <div className={`absolute top-0 right-0 w-16 h-16 opacity-5 transform rotate-12 ${stat.color} fill-current`}><InboxOutlined style={{ fontSize: 64 }} /></div>
                        </Card>
                    ))}
                </div>

                <Card className="rounded-[2rem] shadow-sm border-gray-100 overflow-hidden">
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8 gap-6">
                            <Search placeholder="Identity Search (Slip, Order, Customer)..." className="max-w-md h-12 shadow-inner rounded-xl" onChange={e => setSearchText(e.target.value)} prefix={<SearchOutlined />} />
                            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[{ key: 'all', label: 'Unified Queue' }, { key: 'ready', label: 'Pending Items' }, { key: 'packing', label: 'Station Active' }]} className="packing-tabs" />
                        </div>
                        <Table columns={columns} dataSource={filteredTasks} rowKey="id" loading={loading} />
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
}
