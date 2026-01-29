import React from 'react';
import { Card, Descriptions, Button, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { UserOutlined, MailOutlined, IdcardOutlined, LogoutOutlined } from '@ant-design/icons';
import { formatRole, getRoleColor } from '../permissions';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                    <Button
                        icon={<LogoutOutlined />}
                        onClick={handleLogout}
                        size="large"
                    >
                        Logout
                    </Button>
                </div>

                {/* Profile Card */}
                <Card className="shadow-lg">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                            <p className="text-gray-600">{user?.email}</p>
                            <Tag color={getRoleColor(user?.role || '')} className="mt-2">
                                {formatRole(user?.role || '')}
                            </Tag>
                        </div>
                    </div>

                    <Descriptions bordered column={1}>
                        <Descriptions.Item label={<><UserOutlined className="mr-2" />Name</>}>
                            {user?.name}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><MailOutlined className="mr-2" />Email</>}>
                            {user?.email}
                        </Descriptions.Item>
                        <Descriptions.Item label={<><IdcardOutlined className="mr-2" />Role</>}>
                            <Tag color={getRoleColor(user?.role || '')}>
                                {formatRole(user?.role || '')}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color="green">Active</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="User ID">
                            {user?.id}
                        </Descriptions.Item>
                        <Descriptions.Item label="Company ID">
                            {user?.companyId || 'N/A'}
                        </Descriptions.Item>
                    </Descriptions>

                    <div className="mt-8 flex gap-4">
                        <Button type="primary" size="large">
                            Edit Profile
                        </Button>
                        <Button size="large">Change Password</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
