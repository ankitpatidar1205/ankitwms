import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Input, Button, Space, theme } from 'antd';
import {
    DashboardOutlined,
    ShopOutlined,
    InboxOutlined,
    ShoppingCartOutlined,
    SettingOutlined,
    UserOutlined,
    BellOutlined,
    SearchOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    LogoutOutlined,
    HomeOutlined,
    AppstoreOutlined,
    BoxPlotOutlined,
    DatabaseOutlined,
    BarChartOutlined,
    TeamOutlined,
    CarOutlined,
    UndoOutlined,
    PrinterOutlined,
    ContactsOutlined,
    UsergroupAddOutlined,
    ApiOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { APP_NAME } from '../../constants';
import { hasRoutePermission, isPicker, isPacker, isViewer, isSuperAdmin, isCompanyAdmin, isInventoryManager, isWarehouseManager } from '../../permissions';

const { Header, Sider, Content, Footer } = Layout;

export const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const [openKeys, setOpenKeys] = useState([]);

    // Current path ka parent submenu open rakho; openKeys replace mat karo taaki dropdown apne aap band na ho
    useEffect(() => {
        const pathParts = location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 1) {
            const parentKey = `nav-${pathParts[0]}`;
            setOpenKeys((prev) => (prev.includes(parentKey) ? prev : [...prev, parentKey]));
        }
    }, [location.pathname]);

    const handleMenuClick = ({ key }) => {
        if (key.startsWith('/')) {
            navigate(key);
        }
    };

    const canAccessMenuItem = (route) => {
        if (!user?.role) return false;
        return hasRoutePermission(user.role, route);
    };

    const filterMenuChildren = (children) => {
        return children.filter(child => {
            if (typeof child.key === 'string' && child.key.startsWith('/')) {
                return canAccessMenuItem(child.key);
            }
            return true;
        });
    };

    const getPickerMenu = () => [
        { key: '/dashboards/picker', icon: <DashboardOutlined />, label: 'My Dashboard' },
        { key: '/picking', icon: <BoxPlotOutlined />, label: 'Pick Lists' },
    ];

    const getPackerMenu = () => [
        { key: '/dashboards/packer', icon: <DashboardOutlined />, label: 'My Dashboard' },
        { key: '/packing', icon: <BoxPlotOutlined />, label: 'Packing Tasks' },
    ];

    const getViewerMenu = () => [
        { key: '/dashboards/viewer', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/sales-orders', icon: <ShoppingCartOutlined />, label: 'Orders Overview' },
        { key: '/inventory', icon: <DatabaseOutlined />, label: 'Stock Overview' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        {
            key: 'nav-analytics',
            icon: <BarChartOutlined />,
            label: 'Analytics',
            children: [
                { key: '/analytics/pricing-calculator', label: 'Pricing Calculator' },
                { key: '/analytics/margins', label: 'Margin Analysis' },
            ],
        },
    ];

    const getSuperAdminMenu = () => [
        { key: '/dashboards/super-admin', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
            key: 'nav-companies',
            icon: <ShopOutlined />,
            label: 'Company Management',
            children: [
                { key: '/companies', label: 'Company List' },
            ],
        },
        { key: '/users', icon: <TeamOutlined />, label: 'User Management' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'System Settings' },
    ];

    const getCompanyAdminMenu = () => [
        { key: '/dashboards/company', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
            key: 'nav-companies',
            icon: <ShopOutlined />,
            label: 'Company Management',
            children: [
                { key: '/companies', label: 'Company List' },
                { key: '/users', label: 'Company Admin / Users' },
            ],
        },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses', label: 'All Warehouses' },
                { key: '/warehouses/zones', label: 'Zones' },
                { key: '/warehouses/locations', label: 'Locations' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    ];

    const getInventoryManagerMenu = () => [
        { key: '/dashboards/inventory-manager', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/inventory', icon: <DatabaseOutlined />, label: 'Low Stock Alerts' },
        { key: '/inventory/movements', icon: <DatabaseOutlined />, label: 'Today Movements' },
        {
            key: 'nav-products',
            icon: <AppstoreOutlined />,
            label: 'Products',
            children: [
                { key: '/products', label: 'Add/Edit Products' },
                { key: '/products/categories', label: 'SKU / Categories' },
                { key: '/products/import-export', label: 'Import/Export' },
            ],
        },
        {
            key: 'nav-stock',
            icon: <InboxOutlined />,
            label: 'Stock',
            children: [
                { key: '/purchase-orders', label: 'Stock In (PO)' },
                { key: '/goods-receiving', label: 'Stock Out' },
                { key: '/inventory/adjustments', label: 'Adjustments' },
            ],
        },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses/locations', label: 'Location Management' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Stock Report / Movement History' },
    ];

    const getWarehouseManagerMenu = () => [
        { key: '/dashboards/manager', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/picking', icon: <BoxPlotOutlined />, label: 'Pending Picks / Assign Pickers' },
        { key: '/packing', icon: <BoxPlotOutlined />, label: 'Pending Packs / Assign Packers' },
        { key: '/shipments', icon: <CarOutlined />, label: 'Shipments / Dispatch' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Productivity Report' },
    ];

    const allMenuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
            key: 'nav-companies',
            icon: <ShopOutlined />,
            label: 'Companies',
            children: [
                { key: '/companies', label: 'All Companies' },
            ],
        },
        {
            key: 'nav-warehouses',
            icon: <HomeOutlined />,
            label: 'Warehouses',
            children: [
                { key: '/warehouses', label: 'All Warehouses' },
                { key: '/warehouses/zones', label: 'Zones' },
                { key: '/warehouses/locations', label: 'Locations' },
            ],
        },
        {
            key: 'nav-products',
            icon: <AppstoreOutlined />,
            label: 'Products',
            children: [
                { key: '/products', label: 'All Products' },
                { key: '/products/categories', label: 'Categories' },
                { key: '/products/bundles', label: 'Bundles' },
                { key: '/products/import-export', label: 'Import/Export' },
            ],
        },
        {
            key: 'nav-inventory',
            icon: <DatabaseOutlined />,
            label: 'Inventory',
            children: [
                { key: '/inventory', label: 'Overview' },
                { key: '/inventory/by-best-before-date', label: 'By Best Before Date' },
                { key: '/inventory/by-location', label: 'By Location' },
                { key: '/inventory/adjustments', label: 'Adjustments' },
                { key: '/inventory/cycle-counts', label: 'Cycle Counts' },
                { key: '/inventory/batches', label: 'Batches' },
                { key: '/inventory/movements', label: 'Movements' },
            ],
        },
        {
            key: 'nav-inbound',
            icon: <InboxOutlined />,
            label: 'Inbound',
            children: [
                { key: '/purchase-orders', label: 'Purchase Orders' },
                { key: '/goods-receiving', label: 'Goods Receiving' },
            ],
        },
        { key: '/suppliers', icon: <ContactsOutlined />, label: 'Suppliers' },
        {
            key: 'nav-outbound',
            icon: <ShoppingCartOutlined />,
            label: 'Outbound',
            children: [
                { key: '/sales-orders', label: 'Sales Orders' },
                { key: '/customers', label: 'Customers' },
            ],
        },
        { key: '/clients', icon: <UsergroupAddOutlined />, label: 'Clients' },
        {
            key: 'nav-fulfillment',
            icon: <BoxPlotOutlined />,
            label: 'Fulfillment',
            children: [
                { key: '/picking', label: 'Picking' },
                { key: '/packing', label: 'Packing' },
            ],
        },
        { key: '/shipments', icon: <CarOutlined />, label: 'Shipments' },
        { key: '/returns', icon: <UndoOutlined />, label: 'Returns' },
        {
            key: 'nav-integrations',
            icon: <ApiOutlined />,
            label: 'Integrations',
            children: [
                { key: '/settings/marketplace-api', label: 'API Connections' },
            ],
        },
        {
            key: 'nav-analytics',
            icon: <BarChartOutlined />,
            label: 'Analytics',
            children: [
                { key: '/analytics/pricing-calculator', label: 'Pricing Calculator' },
                { key: '/analytics/margins', label: 'Margin Analysis' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/users', icon: <TeamOutlined />, label: 'Users & Access' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
    ];

    const getMenuItems = () => {
        const userRole = user?.role || '';
        if (isSuperAdmin(userRole)) return getSuperAdminMenu();
        // Company Admin: full menu but WITHOUT Company Management (company admin doesn't see company menu)
        if (isCompanyAdmin(userRole)) {
            return allMenuItems
                .filter(item => item.key !== 'nav-companies')
                .map(item => {
                    if (item.children) {
                        const filteredChildren = filterMenuChildren(item.children);
                        return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
                    }
                    if (typeof item.key === 'string' && item.key.startsWith('/')) {
                        return canAccessMenuItem(item.key) ? item : null;
                    }
                    return item;
                })
                .filter(Boolean);
        }
        if (isInventoryManager(userRole)) return getInventoryManagerMenu();
        if (isWarehouseManager(userRole)) return getWarehouseManagerMenu();
        if (isPicker(userRole)) return getPickerMenu();
        if (isPacker(userRole)) return getPackerMenu();
        if (isViewer(userRole)) return getViewerMenu();

        return allMenuItems.map(item => {
            if (item.children) {
                const filteredChildren = filterMenuChildren(item.children);
                return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
            }
            if (typeof item.key === 'string' && item.key.startsWith('/')) {
                return canAccessMenuItem(item.key) ? item : null;
            }
            return item;
        }).filter(Boolean);
    };

    const menuItems = getMenuItems();

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const userMenuItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
        { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => navigate('/settings') },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout },
    ];

    return (
        <Layout className="min-h-screen bg-gray-50">
            <Sider
                trigger={null}
                collapsible
                collapsed={sidebarCollapsed}
                width={260}
                collapsedWidth={80}
                className="shadow-xl bg-slate-900 border-r border-slate-800 hidden md:block"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 101,
                    background: '#0f172a',
                }}
            >
                <div className="h-20 flex items-center px-6 transition-all duration-300">
                    <Link to="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
                            <BoxPlotOutlined className="text-xl text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-white font-extrabold text-xl tracking-tight uppercase">{APP_NAME}</span>
                        )}
                    </Link>
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    openKeys={openKeys}
                    onOpenChange={(keys) => {
                        // Sub-route pe ho to dropdown apne aap band na ho
                        const pathParts = location.pathname.split('/').filter(Boolean);
                        if (keys.length === 0 && pathParts.length > 1) return;
                        setOpenKeys(keys);
                    }}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="bg-transparent border-none mt-4 px-2 custom-sidebar-menu"
                    style={{ background: 'transparent' }}
                />
            </Sider>

            <Layout className="transition-all duration-300" style={{ marginLeft: sidebarCollapsed ? 80 : 260 }}>
                <Header className="bg-white/80 backdrop-blur-md shadow-sm px-6 flex items-center justify-between h-16 sticky top-0 z-[100] border-b border-gray-100">
                    <div className="flex items-center gap-6">
                        <Button
                            type="text"
                            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={toggleSidebar}
                            className="text-lg hover:bg-gray-100 rounded-lg w-10 h-10 flex items-center justify-center translate-x-[-10px]"
                        />

                        <div className="hidden lg:flex items-center bg-gray-100 rounded-xl px-3 w-96 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all">
                            <SearchOutlined className="text-gray-400 text-lg" />
                            <Input
                                placeholder="Universal Search (Alt+/)"
                                variant="borderless"
                                className="py-2 px-2 text-sm"
                            />
                            <div className="bg-white border rounded px-1.5 text-[10px] font-bold text-gray-400">/</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Badge count={3} offset={[-2, 6]} size="small" className="cursor-pointer">
                            <Button type="text" icon={<BellOutlined className="text-xl text-gray-600" />} className="w-10 h-10 rounded-xl hover:bg-gray-100" />
                        </Badge>

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-1.5 pr-3 rounded-xl transition-all border border-transparent hover:border-gray-200">
                                <Avatar size={36} className="bg-blue-600 shadow-sm shadow-blue-100 font-bold uppercase">
                                    {user?.name?.charAt(0) || 'U'}
                                </Avatar>
                                <div className="hidden sm:block leading-tight">
                                    <div className="text-sm font-bold text-gray-800">{user?.name || 'Guest User'}</div>
                                    <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{user?.role?.replace('_', ' ') || 'No Role'}</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-8 min-h-[calc(100vh-64px)] overflow-x-hidden relative">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </Content>

                <Footer className="bg-white/50 py-6 px-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-gray-500 font-medium text-sm">
                        © {new Date().getFullYear()} <span className="text-blue-600 font-bold">{APP_NAME}</span>. Professional Warehouse Management.
                    </div>
                    <div className="flex gap-6 text-sm">
                        <Link to="/help" className="text-gray-400 hover:text-blue-600">Documentation</Link>
                        <Link to="/support" className="text-gray-400 hover:text-blue-600">Support</Link>
                        <span className="text-gray-200">|</span>
                        <span className="text-gray-400">v2.4.0 (Stable)</span>
                    </div>
                </Footer>
            </Layout>
        </Layout>
    );
};
