import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Package, Truck, Users, LayoutDashboard,
    LogOut, Zap, ChevronLeft, ChevronRight, ShieldCheck, User,
    FileText, BarChart4, BookOpen, Settings,
    Banknote, Users as UsersIcon, ClipboardList, ChevronDown,
    ShieldAlert, Store as StoreIcon
} from 'lucide-react';
import GlobalExchangeBadge from './GlobalExchangeBadge';
import Topbar from './Topbar';
import NotificationCenter from './NotificationCenter';
import toast, { Toaster } from 'react-hot-toast';
import NotFoundPage from '../pages/NotFoundPage';
import B2BProposalsManager from './B2BProposalsManager';

// Simple cache for valid slugs to improve performance
const validSlugsCache = new Set();

const STORE_NAV_GROUPS = [
    {
        label: 'لوحة الإحصائيات',
        icon: LayoutDashboard,
        isDirectLink: true,
        to: '/dashboard',
        roles: ['admin', 'SUPER_ADMIN'],
    },
    {
        label: 'المبيعات',
        icon: ShoppingCart,
        roles: ['cashier', 'admin', 'SUPER_ADMIN'],
        items: [
            { to: '/pos', label: 'نقطة البيع', icon: ShoppingCart },
            { to: '/invoices', label: 'سجل الفواتير', icon: FileText },
            { to: '/debts', label: 'دفتر الديون', icon: BookOpen },
        ]
    },
    {
        label: 'المخزون',
        icon: Package,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/products', label: 'قائمة المنتجات', icon: Package },
            { to: '/purchases', label: 'المشتريات', icon: Package },
            { to: '/suppliers', label: 'الموردون', icon: Truck },
        ]
    },
    {
        label: 'المالية والموظفين',
        icon: Banknote,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/reports', label: 'التقارير الشهرية', icon: BarChart4 },
            { to: '/employees', label: 'الموظفون والرواتب', icon: UsersIcon },
            { to: '/expenses', label: 'المصاريف العامة', icon: Banknote },
        ]
    },
    {
        label: 'النظام',
        icon: Settings,
        roles: ['admin', 'SUPER_ADMIN'],
        items: [
            { to: '/users',    label: 'إدارة المستخدمين', icon: Users },
            { to: '/activity-logs', label: 'سجل النشاطات', icon: ClipboardList },
            { to: '/settings', label: 'الإعدادات', icon: Settings },
        ]
    }
];

const StoreLayout = () => {
    const { user, isAdmin, onLogout, isSuperAdmin, isLoading: authLoading } = useAuth();
    const { slug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [collapsed, setCollapsed] = useState(true);
    const [openGroups, setOpenGroups] = useState({});
    const [isValidSlug, setIsValidSlug] = useState(null); // null = checking, true = valid, false = invalid
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // ─── 1. Slug Verification & Access Guards ───────────────────
    useEffect(() => {
        const verifySlug = async () => {
            if (!slug) {
                setIsValidSlug(false);
                return;
            }

            // Reserved Keywords: Ignore these and don't treat them as store slugs
            const reserved = ['supplier-portal', 'super-admin', 'login', 'register', 'main', 'api'];
            if (reserved.includes(slug.toLowerCase())) {
                setIsValidSlug(false);
                return;
            }

            // Check Cache First
            if (validSlugsCache.has(slug)) {
                setIsValidSlug(true);
                return;
            }

            try {
                // Verify slug via backend
                const res = await api.get(`/validate-slug/${slug}`);
                if (res.data.valid) {
                    validSlugsCache.add(slug);
                    setIsValidSlug(true);
                } else {
                    setIsValidSlug(false);
                }
            } catch (err) {
                console.error("Slug validation error:", err);
                setIsValidSlug(false);
            }
        };

        setIsValidSlug(null);
        verifySlug();
    }, [slug]);

    // Cleanup redirects
    if (authLoading) return <Loader />;
    if (isValidSlug === false) return <NotFoundPage />;
    if (isValidSlug === null) return <Loader />;

    // tenant Isolation Guard: Standard users can only access their own store
    if (!isSuperAdmin) {
        if (!user?.store?.slug) return <Navigate to="/" replace />;
        if (user.store.slug !== slug) {
            return <Navigate to={`/${user.store.slug}/dashboard`} replace />;
        }
    }

    // ─── Utility ────────────────────────────────────────────────
    const resolveRoute = (path) => `/${slug}${path.startsWith('/') ? path : `/${path}`}`;

    const handleLogout = async () => {
        try { await api.post('/logout'); } catch (_) { }
        onLogout();
        navigate('/login', { replace: true });
    };

    const toggleGroup = (index) => {
        if (collapsed) setCollapsed(false);
        setOpenGroups(prev => ({ ...prev, [index]: !prev[index] }));
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans overflow-hidden mt-0 relative" dir="rtl">
            <Toaster />

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isMobileSidebarOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileSidebarOpen(false)}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            <aside className={`
                fixed inset-y-0 right-0 z-50 md:relative md:flex flex-col h-full bg-slate-900 text-white transition-all duration-300 shrink-0 shadow-2xl border-l border-white/5 
                ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
                ${collapsed ? 'md:w-16' : 'md:w-64 w-72'}
            `}>
                {/* Brand */}
                <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <Zap size={18} className="text-white" />
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-white text-sm leading-tight uppercase tracking-wider truncate">{user?.store?.name || 'Store'}</p>
                            <p className="text-[10px] text-slate-400 leading-tight uppercase">Tenant Terminal</p>
                        </div>
                    )}
                </div>

                {isSuperAdmin && (
                    <div className="px-3 py-2 border-b border-white/5">
                        <button 
                            onClick={() => navigate('/super-admin', { replace: true })}
                            className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors text-[10px] font-bold uppercase"
                        >
                            <ShieldAlert size={14} />
                            {!collapsed && <span>العودة للإدارة العامة</span>}
                        </button>
                    </div>
                )}

                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto elegant-scrollbar">
                    {STORE_NAV_GROUPS.map((group, gIdx) => {
                        const GroupIcon = group.icon;
                        if (group.roles && !group.roles.includes(user?.role)) return null;
                        
                        if (group.isDirectLink) {
                            const actualTo = resolveRoute(group.to);
                            const isActive = location.pathname === actualTo || (group.to === '/dashboard' && location.pathname === `/${slug}`);
                            return (
                                <div key={gIdx} className="mb-1">
                                    <NavLink to={actualTo} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                        <GroupIcon size={19} className="shrink-0" />
                                        {!collapsed && <span className="text-xs font-black uppercase tracking-widest flex-1 text-right">{group.label}</span>}
                                    </NavLink>
                                </div>
                            );
                        }

                        const isOpen = openGroups[gIdx];
                        const hasActiveChild = group.items?.some(it => location.pathname.includes(resolveRoute(it.to)));
                        return (
                            <div key={gIdx} className="mb-1">
                                <button onClick={() => toggleGroup(gIdx)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${collapsed ? 'justify-center' : ''} ${hasActiveChild && !isOpen ? 'bg-slate-800/50 text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                                    <GroupIcon size={19} className={hasActiveChild ? 'text-blue-500' : ''} />
                                    {!collapsed && <><span className="text-xs font-black uppercase tracking-widest flex-1 text-right">{group.label}</span><motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="opacity-40"><ChevronDown size={14} /></motion.div></>}
                                </button>
                                <AnimatePresence>{!collapsed && isOpen && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-800/20 rounded-xl mt-1">
                                        <div className="py-1 pr-4">
                                            {group.items.map((item, iIdx) => (
                                                <NavLink key={iIdx} to={resolveRoute(item.to)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150 mb-0.5 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 font-bold' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                                                    <item.icon size={17} className="shrink-0" />
                                                    <span className="text-xs font-semibold">{item.label}</span>
                                                </NavLink>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}</AnimatePresence>
                            </div>
                        );
                    })}
                </nav>

                <div className="border-t border-slate-700/50 p-3 space-y-3 bg-slate-900/50">
                    <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0 border border-slate-600"><User size={16} className="text-slate-300" /></div>
                        {!collapsed && <div className="flex-1 min-w-0"><p className="text-xs font-black text-white truncate">{user?.name}</p><p className={`text-[10px] font-bold ${isAdmin ? 'text-blue-400' : 'text-slate-400'}`}>{isAdmin ? 'المسؤول' : 'كاشير'}</p></div>}
                    </div>
                    {!collapsed && <GlobalExchangeBadge />}
                    <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors text-[10px] font-bold uppercase">{collapsed ? <ChevronLeft size={16} /> : <><ChevronRight size={14} /><span>تصغير القائمة</span></>}</button>
                    <button onClick={handleLogout} className={`w-full flex items-center gap-2 py-2 px-3 rounded-xl text-rose-400 hover:bg-rose-900/30 transition-colors text-xs ${collapsed ? 'justify-center' : ''}`}><LogOut size={16} />{!collapsed && <span className="font-bold">خروج</span>}</button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col bg-slate-50 relative transition-colors duration-300">
                {user?.is_demo && (
                    <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                                <Zap size={14} className="fill-white" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-wider">وضع التجربة الفورية نشط</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="hidden sm:block text-[11px] font-medium opacity-90">أنت تتصفح النظام الآن ببيانات تجريبية. هل أعجبك ما تراه؟</p>
                            <button 
                                onClick={() => navigate('/register')}
                                className="bg-white text-blue-600 px-4 py-1 rounded-full text-[11px] font-black hover:bg-blue-50 transition-colors shadow-sm"
                            >
                                اشترك الآن
                            </button>
                        </div>
                    </div>
                )}
                <B2BProposalsManager />
                <div className="flex-1 relative">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

// Reusable Loader Component
const Loader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default StoreLayout;
