import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BoxPlotOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getDefaultRouteForRole } from '../../permissions';
import { APP_NAME } from '../../constants';

const QUICK_LOGIN_USERS = [
    { email: 'admin@kiaan-wms.com', password: 'Admin@123', label: 'Super Admin' },
    { email: 'companyadmin@kiaan-wms.com', password: '123456', label: 'Company Admin' },
    { email: 'inventorymanager@kiaan-wms.com', password: '123456', label: 'Inventory Manager' },
    { email: 'warehousemanager@kiaan-wms.com', password: '123456', label: 'Warehouse Manager' },
    { email: 'picker@kiaan-wms.com', password: '123456', label: 'Picker' },
    { email: 'packer@kiaan-wms.com', password: '123456', label: 'Packer' },
    { email: 'viewer@kiaan-wms.com', password: '123456', label: 'Viewer' },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [quickLoginLoading, setQuickLoginLoading] = useState(null);

    // Agar already logged in ho to apne dashboard pe bhejo
    React.useEffect(() => {
        if (!_hasHydrated) return;
        if (isAuthenticated && user) {
            const defaultRoute = getDefaultRouteForRole(user.role);
            navigate(defaultRoute, { replace: true });
        }
    }, [_hasHydrated, isAuthenticated, user, navigate]);

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await login(values.email, values.password);
            message.success('Login successful!');
            const { user: u } = useAuthStore.getState();
            const defaultRoute = getDefaultRouteForRole(u?.role);
            navigate(defaultRoute, { replace: true });
        } catch (err) {
            message.error(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (demoUser) => {
        setQuickLoginLoading(demoUser.email);
        try {
            await login(demoUser.email, demoUser.password);
            message.success(`Logged in as ${demoUser.label}`);
            const { user: u } = useAuthStore.getState();
            const defaultRoute = getDefaultRouteForRole(u?.role);
            navigate(defaultRoute, { replace: true });
        } catch (err) {
            message.error('Quick login failed.');
        } finally {
            setQuickLoginLoading(null);
        }
    };

    if (!_hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
        );
    }

    if (isAuthenticated && user) {
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <BoxPlotOutlined className="text-3xl text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{APP_NAME}</h1>
                    <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, message: 'Please enter your email!' }]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="admin@kiaan-wms.com"
                            type="email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: 'Please enter your password!' }]}
                    >
                        <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="••••••••"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            size="large"
                            className="h-12 font-semibold rounded-xl"
                        >
                            Sign In
                        </Button>
                    </Form.Item>
                </Form>

                <Divider className="my-6">Quick Login (Demo)</Divider>
                <div className="grid grid-cols-2 gap-2">
                    {QUICK_LOGIN_USERS.map((demoUser) => (
                        <Button
                            key={demoUser.email}
                            size="small"
                            onClick={() => handleQuickLogin(demoUser)}
                            loading={quickLoginLoading === demoUser.email}
                            className="rounded-lg"
                        >
                            {demoUser.label}
                        </Button>
                    ))}
                </div>

                <div className="mt-6 text-center text-sm">
                    <Link to="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                        Create account
                    </Link>
                    <span className="mx-2 text-gray-300">|</span>
                    <Link to="/auth/forgot-password" className="text-gray-500 hover:text-gray-700">
                        Forgot password?
                    </Link>
                </div>
            </Card>
        </div>
    );
}
