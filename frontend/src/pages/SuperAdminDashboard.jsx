import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    LayoutDashboard, Store, DollarSign, TrendingUp, 
    CheckCircle, XCircle, ChevronRight, Activity
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/super-admin/stats');
            setStats(res.data.stats);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) return null;

    return (
        <div className="p-8 bg-slate-50 min-h-screen space-y-8 font-sans" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-indigo-600" size={32} />
                        لوحة التحكم المركزية
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">نظرة عامة على جميع المتاجر والنظام</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button onClick={fetchStats} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-all">تحديث البيانات</button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'إجمالي المتاجر', value: stats.total_stores, icon: Store, color: 'blue' },
                    { label: 'المتاجر النشطة', value: stats.active_stores, icon: CheckCircle, color: 'emerald' },
                    { label: 'إجمالي المبيعات', value: Number(stats.total_sales).toLocaleString() + ' ل.س', icon: DollarSign, color: 'indigo' },
                    { label: 'المتاجر المعطلة', value: stats.inactive_stores, icon: XCircle, color: 'rose' }
                ].map((item, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-2 h-full bg-${item.color}-500 opacity-20`}></div>
                        <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 bg-${item.color}-50 text-${item.color}-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                <item.icon size={28} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                <h3 className="text-2xl font-black text-slate-900">{item.value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Store Card */}
                <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200/20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-50"></div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <span className="bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/30">المحل الأعلى مبيعاً</span>
                            <h2 className="text-5xl font-black mt-6 tracking-tighter">{stats.top_store?.name || '---'}</h2>
                        </div>
                        
                        <div className="mt-12 flex items-end justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">إجمالي مبيعات الفرع</p>
                                <p className="text-4xl font-black text-emerald-400">{Number(stats.top_store?.sales || 0).toLocaleString()} <span className="text-lg">ل.س</span></p>
                            </div>
                            <NavLink to="/super-admin/stores" className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-slate-100 transition-all shadow-xl">
                                إدارة الفروع <ChevronRight size={18} />
                            </NavLink>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Activity className="text-indigo-600" size={20} />
                            إجراءات سريعة
                        </h3>
                        <div className="space-y-3">
                            <NavLink to="/super-admin/stores" className="flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                        <Store size={20} />
                                    </div>
                                    <span className="font-bold text-slate-700">قائمة جميع المتاجر</span>
                                </div>
                                <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-[-4px] transition-transform" />
                            </NavLink>
                            
                            <button className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 transition-all group pointer-events-none opacity-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400 transition-colors">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="font-bold text-slate-700">تقارير النظام الكلية</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
