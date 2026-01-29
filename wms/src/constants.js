// Application constants

export const APP_NAME = 'Kiaan WMS';
export const APP_VERSION = '1.0.0';

// Order statuses
export const ORDER_STATUSES = [
    { value: 'PENDING', label: 'Pending', color: 'orange' },
    { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
    { value: 'ALLOCATED', label: 'Allocated', color: 'cyan' },
    { value: 'PICKING', label: 'Picking', color: 'purple' },
    { value: 'PACKING', label: 'Packing', color: 'purple' },
    { value: 'SHIPPED', label: 'Shipped', color: 'green' },
    { value: 'DELIVERED', label: 'Delivered', color: 'green' },
    { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
];

// Inventory statuses
export const INVENTORY_STATUSES = [
    { value: 'available', label: 'Available', color: 'green' },
    { value: 'reserved', label: 'Reserved', color: 'blue' },
    { value: 'quarantine', label: 'Quarantine', color: 'orange' },
    { value: 'damaged', label: 'Damaged', color: 'red' },
    { value: 'expired', label: 'Expired', color: 'red' },
];

// Priority levels
export const PRIORITY_LEVELS = [
    { value: 'LOW', label: 'Low', color: 'gray' },
    { value: 'MEDIUM', label: 'Medium', color: 'blue' },
    { value: 'HIGH', label: 'High', color: 'orange' },
    { value: 'URGENT', label: 'Urgent', color: 'red' },
];

// User roles
export const USER_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'warehouse_manager', label: 'Warehouse Manager' },
    { value: 'inventory_manager', label: 'Inventory Manager' },
    { value: 'warehouse_staff', label: 'Warehouse Staff' },
    { value: 'picker', label: 'Picker' },
    { value: 'packer', label: 'Packer' },
    { value: 'viewer', label: 'Viewer' },
];

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Chart colors
export const CHART_COLORS = {
    primary: '#1890ff',
    success: '#52c41a',
    warning: '#faad14',
    error: '#f5222d',
    purple: '#722ed1',
    cyan: '#13c2c2',
    orange: '#fa8c16',
    green: '#52c41a',
    blue: '#1890ff',
    red: '#f5222d',
};

export const CHART_COLOR_PALETTE = [
    '#1890ff',
    '#52c41a',
    '#faad14',
    '#f5222d',
    '#722ed1',
    '#13c2c2',
    '#fa8c16',
    '#2f54eb',
    '#eb2f96',
    '#a0d911',
];

// Date formats
export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const TIME_FORMAT = 'HH:mm:ss';

// Local storage keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'wms_auth_token',
    USER: 'wms_user',
    THEME: 'wms_theme',
    SIDEBAR_COLLAPSED: 'wms_sidebar_collapsed',
    SELECTED_WAREHOUSE: 'wms_selected_warehouse',
    SELECTED_COMPANY: 'wms_selected_company',
    TABLE_PREFERENCES: 'wms_table_preferences',
};
