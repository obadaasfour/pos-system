import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Package, Truck, Users, LayoutDashboard,
    LogOut, Zap, ChevronLeft, ChevronRight, ShieldCheck, User,
    FileText, Wallet, BarChart4, BookOpen, Settings,
    Banknote, Users as UsersIcon, ClipboardList, ChevronDown,
    ShieldAlert, Store as StoreIcon
} from 'lucide-react';
import GlobalExchangeBadge from './GlobalExchangeBadge';
import toast, { Toaster } from 'react-hot-toast';
import echo from '../echo';
import { AlertCircle, Wifi, WifiOff, Cloud } from 'lucide-react';
import { getPendingOrders, deletePendingOrder } from '../db';

const NAV_GROUPS = [
    {
        label: 'لوحة الإحصائيات',
        icon: LayoutDashboard,
        isDirectLink: true,
        to: '/dashboard',
        roles: ['admin', 'SUPER_ADMIN'],
        items: []
    },
    {
        label: 'المبيعات',
        icon: ShoppingCart,
        roles: ['cashier', 'admin', 'SUPER_ADMIN'],
        items: [
            { to: '/pos', label: 'نقطة البيع', icon: ShoppingCart, roles: ['cashier', 'admin', 'SUPER_ADMIN'] },
            { to: '/invoices', label: 'سجل الفواتير', icon: FileText, roles: ['cashier', 'admin', 'SUPER_ADMIN'] },
            { to: '/debts', label: 'دفتر الديون', icon: BookOpen, roles: ['cashier', 'admin', 'SUPER_ADMIN'] },
        ]
    },
    {
        label: 'المخزون',
        icon: Package,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/products', label: 'قائمة المنتجات', icon: Package, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/purchases', label: 'المشتريات', icon: Package, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/suppliers', label: 'الموردون', icon: Truck, roles: ['admin', 'SUPER_ADMIN'] },
        ]
    },
    {
        label: 'المالية والموظفين',
        icon: Banknote,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/reports', label: 'التقارير الشهرية', icon: BarChart4, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/employees', label: 'الموظفون والرواتب', icon: UsersIcon, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/expenses', label: 'المصاريف العامة', icon: Banknote, roles: ['admin', 'SUPER_ADMIN'] },
        ]
    },
    {
        label: 'النظام',
        icon: Settings,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/users',    label: 'إدارة المستخدمين', icon: Users, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/activity-logs', label: 'سجل النشاطات', icon: ClipboardList, roles: ['admin', 'SUPER_ADMIN'] },
            { to: '/settings', label: 'الإعدادات', icon: Settings, roles: ['admin', 'SUPER_ADMIN'] },
        ]
    },
    {
        label: 'الإدارة العامة',
        icon: ShieldAlert,
        roles: ['SUPER_ADMIN'],
        items: [
            { to: '/super-admin', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['SUPER_ADMIN'] },
            { to: '/super-admin/stores', label: 'إدارة المتاجر', icon: StoreIcon, roles: ['SUPER_ADMIN'] },
        ]
    }
];

const LayoutLegacy = () => {
    const { user, isAdmin, onLogout, isSuperAdmin, onUpdateUser, currentSlug } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState({});

    const activeSlug = currentSlug || localStorage.getItem('pos_slug');

    const resolveRoute = (path, superAdminOnly) => {
        if (superAdminOnly) return path;
        if (activeSlug) return `/${activeSlug}${path.startsWith('/') ? path : `/${path}`}`;
        return '#'; 
    };

    const handleLogout = async () => {
        try { 
            const logoutEndpoint = activeSlug ? `/${activeSlug}/logout` : '/logout'; 
            await api.post(logoutEndpoint); 
        } catch (_) { }
        onLogout();
        navigate(isSuperAdmin ? '/super-admin/login' : '/login');
    };

    const toggleGroup = (index) => {
        if (collapsed) setCollapsed(false);
        setOpenGroups(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const [stores, setStores] = useState([]);
    useEffect(() => {
        if (isSuperAdmin) fetchStores();
    }, [isSuperAdmin]);

    const fetchStores = async () => {
        try {
            const res = await api.get('super-admin/stores');
            setStores(res.data);
        } catch (err) { console.error(err); }
    };

    const handleStoreSwitch = async (storeId) => {
        if (Number(storeId) === user?.store_id) return;
        try {
            const res = await api.post('super-admin/stores/switch', { store_id: storeId });
            onUpdateUser(res.data.user, res.data.slug);
            toast.success(res.data.message);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans overflow-hidden" dir="rtl">
            <Toaster />
            <aside className={`flex flex-col bg-slate-900 text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
                {/* Simplified Sidebar for backup */}
                <div className="p-4 border-b border-white/5 font-bold">LEGACY LAYOUT</div>
                <nav className="flex-1 overflow-y-auto p-2">
                    {/* ... truncated for backup purpose ... */}
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
};

export default LayoutLegacy;
