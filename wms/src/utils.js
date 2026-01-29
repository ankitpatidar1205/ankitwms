import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}

export function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export function getStatusColor(status) {
    if (!status) return 'default';
    const s = status.toLowerCase();
    if (s.includes('pending') || s.includes('draft')) return 'orange';
    if (s.includes('approved') || s.includes('active') || s.includes('shipped')) return 'blue';
    if (s.includes('received') || s.includes('delivered') || s.includes('completed')) return 'green';
    if (s.includes('reject') || s.includes('cancel') || s.includes('error')) return 'red';
    if (s.includes('process') || s.includes('picking') || s.includes('packing')) return 'purple';
    return 'default';
}
