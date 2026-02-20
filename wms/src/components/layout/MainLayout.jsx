import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Input, Button, Drawer, Space, theme } from 'antd';
import {
    DashboardOutlined,
    ShopOutlined,
    InboxOutlined,
    ShoppingCartOutlined,
    SettingOutlined,
    UserOutlined,
    BellOutlined,
    SearchOutlined,
    MenuOutlined,
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
    DollarOutlined,
    ThunderboltOutlined,
    ScanOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { APP_NAME } from '../../constants';
import { hasRoutePermission, isPicker, isPacker, isViewer, isSuperAdmin, isCompanyAdmin, isInventoryManager, isWarehouseManager } from '../../permissions';
import { apiRequest } from '../../api/client';

const { Header, Sider, Content, Footer } = Layout;

export const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, token } = useAuthStore();
    const { sidebarCollapsed, toggleSidebar } = useUIStore();
    const [openKeys, setOpenKeys] = useState([]);
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ orders: [], products: [], customers: [] });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchDropdownVisible, setSearchDropdownVisible] = useState(false);
    const searchContainerRef = useRef(null);

    // Current path ka parent submenu open rakho – ek hi submenu open (accordion)
    useEffect(() => {
        const path = location.pathname;
        if (path === '/integrations' || path.startsWith('/integrations/')) {
            setOpenKeys(['nav-integrations']);
            return;
        }
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length >= 1) {
            const parentKey = pathParts.length > 1 ? `nav-${pathParts[0]}` : null;
            setOpenKeys(parentKey ? [parentKey] : []);
        }
    }, [location.pathname]);

    const handleMenuClick = ({ key }) => {
        if (key.startsWith('/')) {
            navigate(key);
            setMobileDrawerOpen(false);
        }
    };

    const runSearch = async () => {
        const term = searchQuery.trim();
        if (!term) {
            setSearchDropdownVisible(false);
            return;
        }
        setSearchLoading(true);
        setSearchDropdownVisible(true);
        try {
            const res = await apiRequest(`/api/search?q=${encodeURIComponent(term)}`, { method: 'GET' }, token);
            setSearchResults(res.data || { orders: [], products: [], customers: [] });
        } catch {
            setSearchResults({ orders: [], products: [], customers: [] });
        } finally {
            setSearchLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setSearchDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = () => setIsMobile(mq.matches);
        mq.addEventListener('change', handler);
        handler();
        return () => mq.removeEventListener('change', handler);
    }, []);

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
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#22c55e' }} />, label: <span className="font-bold text-green-600">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#ef4444' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
        { key: '/picking', icon: <BoxPlotOutlined />, label: 'Pick Lists' },
    ];

    const getPackerMenu = () => [
        { key: '/dashboards/packer', icon: <DashboardOutlined />, label: 'My Dashboard' },
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#22c55e' }} />, label: <span className="font-bold text-green-600">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#ef4444' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
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
            label: 'Analytics & Revenue',
            children: [
                { key: '/analytics/pricing-calculator', label: 'Pricing Calculator' },
                { key: '/analytics/margins', label: 'Margin Analysis' },
            ],
        },
    ];

    const getSuperAdminMenu = () => [
        { key: '/dashboards/super-admin', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/companies', icon: <ShopOutlined />, label: 'Company Management' },
        { key: '/users', icon: <TeamOutlined />, label: 'User Management' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'System Settings' },
    ];

    const getCompanyAdminMenu = () => [
        { key: '/dashboards/company', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/users', icon: <TeamOutlined />, label: 'User Management' },
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
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#22c55e' }} />, label: <span className="font-bold text-green-600">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#ef4444' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
        { key: '/inventory', icon: <DatabaseOutlined />, label: 'Low Stock Alerts' },
        { key: '/predictions', icon: <ThunderboltOutlined />, label: 'Smart Reorder (AI)' },
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
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#22c55e' }} />, label: <span className="font-bold text-green-600">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#ef4444' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
        { key: '/picking', icon: <BoxPlotOutlined />, label: 'Pending Picks / Assign Pickers' },
        { key: '/packing', icon: <BoxPlotOutlined />, label: 'Pending Packs / Assign Packers' },
        { key: '/shipments', icon: <CarOutlined />, label: 'Shipments / Dispatch' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Productivity Report' },
    ];

    const allMenuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: '/stock-in', icon: <ArrowUpOutlined style={{ color: '#22c55e' }} />, label: <span className="font-bold text-green-600">Stock In</span> },
        { key: '/stock-out', icon: <ArrowDownOutlined style={{ color: '#ef4444' }} />, label: <span className="font-bold text-red-500">Stock Out</span> },
        { key: '/companies', icon: <ShopOutlined />, label: 'Company Management' },
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
                { key: '/predictions', label: 'Smart Reorder (AI)', icon: <ThunderboltOutlined className="text-amber-400" /> },
            ],
        },
        {
            key: 'nav-integrations',
            icon: <ApiOutlined />,
            label: 'Integrations',
            children: [
                { key: '/integrations', label: 'Amazon & Shopify' },
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
            key: 'nav-replenishment',
            icon: <InboxOutlined />,
            label: 'Replenishment',
            children: [
                { key: '/replenishment/tasks', label: 'Tasks' },
                { key: '/replenishment/settings', label: 'Settings' },
            ],
        },
        {
            key: 'nav-analytics',
            icon: <BarChartOutlined />,
            label: 'Analytics & Revenue',
            children: [
                { key: '/analytics/pricing-calculator', label: 'Pricing Calculator' },
                { key: '/analytics/margins', label: 'Margin Analysis' },
            ],
        },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
        { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
        { key: '/users', icon: <TeamOutlined />, label: 'Users & Access' },
    ];

    const getMenuItems = () => {
        const userRole = user?.role || '';
        if (isSuperAdmin(userRole)) return getSuperAdminMenu();
        // Company Admin: full menu jitna pehle dikh raha tha, sirf Company Management hatao
        if (isCompanyAdmin(userRole)) {
            return allMenuItems
                .filter(item => item.key !== '/companies')
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
                className="shadow-xl bg-slate-900 border-r border-slate-700/80 hidden md:block"
                style={{
                    overflow: 'auto',
                    height: '100vh',
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 101,
                    background: 'linear-gradient(180deg, #0f172a 0%, #0c1222 100%)',
                }}
            >
                <div className="h-[72px] flex items-center px-5 transition-all duration-300 border-b border-slate-700/50 shrink-0">
                    <Link to="/dashboard" className="flex items-center gap-3 w-full min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 border border-blue-400/20">
                            <BoxPlotOutlined className="text-lg text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <span className="text-white font-normal text-lg tracking-tight truncate">{APP_NAME}</span>
                        )}
                    </Link>
                </div>
                <div className="py-3 px-2">
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[location.pathname]}
                        openKeys={openKeys}
                        onOpenChange={(keys) => {
                            const next = keys.length ? [keys[keys.length - 1]] : [];
                            setOpenKeys(next);
                        }}
                        items={menuItems}
                        onClick={handleMenuClick}
                        className="bg-transparent border-none custom-sidebar-menu"
                        style={{ background: 'transparent' }}
                    />
                </div>
            </Sider>
            <Drawer
                title={<span className="text-white font-normal text-lg">{APP_NAME}</span>}
                placement="left"
                onClose={() => setMobileDrawerOpen(false)}
                open={mobileDrawerOpen}
                width={280}
                className="mobile-sidebar-drawer"
                styles={{ body: { padding: 0, background: 'linear-gradient(180deg, #0f172a 0%, #0c1222 100%)', height: '100%' }, header: { background: '#0f172a', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' } }}
                closeIcon={<span className="text-white text-xl leading-none">×</span>}
            >
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    openKeys={openKeys}
                    onOpenChange={(keys) => setOpenKeys(keys.length ? [keys[keys.length - 1]] : [])}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="bg-transparent border-none custom-sidebar-menu mt-2"
                    style={{ background: 'transparent' }}
                />
            </Drawer>

            <Layout className="transition-all duration-300" style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 260) }}>
                <Header className="bg-white border-b border-gray-200 px-4 sm:px-5 py-2 flex items-center justify-between h-14 sticky top-0 z-[100]">
                    <Button
                        type="text"
                        icon={isMobile ? <MenuOutlined /> : (sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
                        onClick={() => (isMobile ? setMobileDrawerOpen(true) : toggleSidebar())}
                        className="text-gray-600 hover:bg-gray-100 rounded-lg w-10 h-10 flex items-center justify-center -ml-1 shrink-0 md:w-9 md:h-9"
                        aria-label={isMobile ? 'Open menu' : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
                    />

                    <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-2xl mx-4 relative items-center">
                        <div className="w-full flex items-stretch rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm h-9">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onPressEnter={runSearch}
                                placeholder="Search orders, products, customers..."
                                variant="borderless"
                                className="flex-1 py-2 px-3 text-sm placeholder:text-gray-400 h-full"
                                prefix={<SearchOutlined className="text-gray-500 text-base mr-1.5" />}
                            />
                            <Button type="primary" onClick={runSearch} className="rounded-r-lg h-full min-h-0 px-4 bg-blue-600 hover:bg-blue-700 border-0 flex items-center justify-center shrink-0">
                                <SearchOutlined className="text-white text-base" />
                            </Button>
                        </div>
                        {searchDropdownVisible && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[200] max-h-80 overflow-y-auto">
                                {searchLoading ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                                ) : (
                                    <>
                                        {searchResults.orders?.length > 0 && (
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">Orders</div>
                                                {searchResults.orders.map((o) => (
                                                    <div key={o.id} className="px-2 py-2 hover:bg-gray-50 rounded cursor-pointer text-sm" onClick={() => { navigate(`/sales-orders?highlight=${o.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium">{o.orderNumber}</span> {o.referenceNumber && <span className="text-gray-500">· {o.referenceNumber}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.products?.length > 0 && (
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">Products</div>
                                                {searchResults.products.map((p) => (
                                                    <div key={p.id} className="px-2 py-2 hover:bg-gray-50 rounded cursor-pointer text-sm" onClick={() => { navigate(`/products?highlight=${p.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium">{p.name}</span> <span className="text-gray-500">{p.sku}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.customers?.length > 0 && (
                                            <div className="p-2">
                                                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">Customers</div>
                                                {searchResults.customers.map((c) => (
                                                    <div key={c.id} className="px-2 py-2 hover:bg-gray-50 rounded cursor-pointer text-sm" onClick={() => { navigate(`/customers?highlight=${c.id}`); setSearchDropdownVisible(false); }}>
                                                        <span className="font-medium">{c.name}</span> {c.email && <span className="text-gray-500">· {c.email}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {!searchLoading && searchResults.orders?.length === 0 && searchResults.products?.length === 0 && searchResults.customers?.length === 0 && searchQuery.trim() && (
                                            <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-3">
                        <Badge count={5} offset={[-2, 2]} size="small" className="cursor-pointer" style={{ backgroundColor: '#ef4444' }}>
                            <Button type="text" icon={<BellOutlined className="text-base text-gray-600" />} className="w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-600 min-w-9" />
                        </Badge>

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
                            <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1.5 pl-1 pr-2 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                <Avatar size={36} className="bg-gray-200 text-gray-500 border border-gray-200 shrink-0" icon={<UserOutlined />} />
                                <div className="hidden sm:block leading-tight text-left">
                                    <div className="text-xs font-semibold text-gray-800">{user?.name || (user?.role === 'super_admin' ? 'Super Administrator' : 'User')}</div>
                                    <div className="text-[11px] text-gray-500">{user?.role || 'No Role'}</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-8 min-h-[calc(100vh-56px)] overflow-x-hidden relative">
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
