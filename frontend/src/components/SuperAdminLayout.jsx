import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, LogOut, Zap, ChevronLeft, ChevronRight, User,
    Settings, Store as StoreIcon, ShieldAlert, ChevronDown, Truck,
    Wifi, WifiOff, Cloud, ClipboardList
} from 'lucide-react';
import GlobalExchangeBadge from './GlobalExchangeBadge';
import toast, { Toaster } from 'react-hot-toast';

const SUPER_ADMIN_NAV = [
    {
        label: 'لوحة التحكم العامة',
        icon: LayoutDashboard,
        to: '/super-admin',
    },
    {
        label: 'إدارة المتاجر',
        icon: StoreIcon,
        to: '/super-admin/stores',
    },
    {
        label: 'سجل النشاطات نظام مالي',
        icon: ClipboardList,
        to: '/super-admin/activity-logs',
    },
    {
        label: 'إدارة الموردين',
        icon: Truck,
        to: '/super-admin/suppliers',
    },
    {
        label: 'إعدادات النظام',
        icon: Settings,
        to: '/super-admin/settings',
    }
];

const SuperAdminLayout = () => {
    const { user, onLogout, onUpdateUser, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [stores, setStores] = useState([]);

    useEffect(() => {
        fetchStores();
    }, [location.pathname]);

    const fetchStores = async () => {
        try {
            const res = await api.get('super-admin/stores');
            setStores(res.data);
        } catch (err) { console.error(err); }
    };

    const handleLogout = async () => {
        try { await api.post('/logout'); } catch (_) { }
        onLogout();
        // Redirect to unified login page
        navigate('/login', { replace: true });
    };

    const handleStoreSwitch = async (storeId) => {
        // Find selecting store to get slug
        const selectedStore = stores.find(s => Number(s.id) === Number(storeId));
        if (!selectedStore) return;

        if (Number(storeId) === user?.store_id) {
            navigate(`/${selectedStore.slug}/dashboard`, { replace: true });
            return;
        }

        try {
            const res = await api.post('super-admin/stores/switch', { store_id: storeId });
            onUpdateUser(res.data.user);
            toast.success(res.data.message);
            // After switching, redirect to the store's dashboard with replace: true for clean history
            navigate(`/${res.data.slug}/dashboard`, { replace: true });
        } catch (err) { 
            console.error(err); 
            toast.error("فشل تبديل المتجر");
        }
    };

    // Protection for auth loading state
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-900">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100 font-sans overflow-hidden mt-0" dir="rtl">
            <Toaster />

            {/* ── SIDEBAR ─────────────────────────── */}
            <aside className={`flex flex-col h-full bg-slate-900 text-white transition-all duration-300 shrink-0 shadow-2xl z-20 ${collapsed ? 'w-16' : 'w-64'}`}>
                {/* Brand */}
                <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <ShieldAlert size={18} className="text-white" />
                    </div>
                    {!collapsed && (
                        <div>
                            <p className="font-extrabold text-white text-sm leading-tight uppercase tracking-wider">Super Admin</p>
                            <p className="text-[10px] text-amber-500/70 font-bold leading-tight uppercase">Central Control</p>
                        </div>
                    )}
                </div>

                {/* Store Switcher */}
                <div className={`px-3 py-4 border-b border-white/5 ${collapsed ? 'flex justify-center' : ''}`}>
                    {collapsed ? (
                        <Truck size={18} className="text-blue-400" />
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الدخول لمتجر</p>
                            <div className="relative group">
                                <Truck size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 z-10" />
                                <select 
                                    value={user?.store_id || ''}
                                    onChange={(e) => handleStoreSwitch(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700/50 rounded-xl py-2.5 pr-9 pl-3 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-750 transition-all cursor-pointer appearance-none relative"
                                >
                                    <option value="" disabled>اختر متجراً...</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <ChevronDown size={12} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nav items */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto elegant-scrollbar">
                    {SUPER_ADMIN_NAV.map((item, idx) => (
                        <NavLink
                            key={idx}
                            to={item.to}
                            end={item.to === '/super-admin'}
                            className={({ isActive }) => `
                                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                                ${collapsed ? 'justify-center' : ''}
                                ${isActive 
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 font-bold' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }
                            `}
                        >
                            <item.icon size={19} className="shrink-0" />
                            {!collapsed && <span className="text-xs font-black uppercase tracking-widest flex-1 text-right">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="border-t border-slate-700/50 p-3 space-y-3 bg-slate-900/50">
                    <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
                        <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center shrink-0 border border-amber-500/30">
                            <User size={16} className="text-amber-500" />
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-white truncate">{user?.name}</p>
                                <p className="text-[10px] font-bold text-amber-500 truncate">S-ADMIN</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-tighter"
                    >
                        {collapsed ? <ChevronLeft size={16} /> : <><ChevronRight size={14} /><span>تصغير القائمة</span></>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 py-2 px-3 rounded-xl text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 transition-colors text-xs ${collapsed ? 'justify-center' : ''}`}
                    >
                        <LogOut size={16} />
                        {!collapsed && <span className="font-bold">خروج من النظام</span>}
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto flex flex-col bg-slate-50">
                <Outlet />
            </main>
        </div>
    );
};

export default SuperAdminLayout;
