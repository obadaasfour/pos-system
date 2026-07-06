import React, { useState, useEffect } from 'react';
import api from '../api';
import {
    Search, Calendar, User, ClipboardList, Trash2, Edit3,
    PlusCircle, LogIn, LogOut, Loader2, ChevronRight, ChevronLeft, AlertCircle
} from 'lucide-react';

const ActivityLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    // تم التعديل: القيمة الافتراضية أصبحت 'all'
    const [filterType, setFilterType] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [page, filterType]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const isCentralView = window.location.pathname.startsWith('/super-admin');
            const endpoint = isCentralView ? '/super-admin/activity-logs' : '/activity-logs';

            const res = await api.get(endpoint, {
                params: {
                    page,
                    type: filterType,
                    search: searchTerm
                }
            });
            // حماية إضافية في حال كان الـ API يرجع البيانات بشكل مختلف
            const data = res.data.data ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setLogs(data);
            setTotalPages(res.data.last_page || 1);
        } catch (err) {
            console.error("Error fetching logs:", err);
            setLogs([]); // تفريغ المصفوفة عند الخطأ لمنع الانهيار
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const getActionBadge = (type) => {
        switch (type) {
            case 'delete': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200"><Trash2 size={12} /> حذف</span>;
            case 'edit': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-200"><Edit3 size={12} /> تعديل</span>;
            case 'add': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200"><PlusCircle size={12} /> إضافة</span>;
            case 'login': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200"><LogIn size={12} /> دخول</span>;
            case 'logout': return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200"><LogOut size={12} /> خروج</span>;
            default: return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200">{type}</span>;
        }
    };

    const formatJSON = (json) => {
        if (!json) return null;
        try {
            const parsed = typeof json === 'string' ? JSON.parse(json) : json;
            return Object.entries(parsed).map(([key, val]) => (
                <div key={key} className="text-[10px] text-slate-500 font-medium">
                    <span className="text-slate-400">{key}:</span> {val !== null && val !== undefined ? String(val) : 'فارغ'}
                </div>
            ));
        } catch (e) { return null; }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 p-6 font-sans overflow-hidden" dir="rtl">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ClipboardList className="text-blue-600" size={28} />
                        سجل النشاطات والأمان
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">تتبع كافة العمليات والتحركات التي تتم في النظام</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" size={18} />
                        <span className="text-[11px] font-bold text-amber-700 leading-tight">هذا السجل مرجع أمني غير قابل للحذف أو التعديل</span>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 mb-6 flex flex-wrap items-center gap-4">
                <form onSubmit={handleSearch} className="flex-1 min-w-[300px] relative">
                    <input
                        type="text"
                        placeholder="البحث بالوصف أو اسم المستخدم..."
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 pr-11 pl-4 text-sm font-bold outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </form>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-2.5 px-4 text-xs font-bold outline-none transition-all cursor-pointer"
                >
                    {/* تم تعديل القيمة لتكون all وتطابق الباك إند */}
                    <option value="all">كافة العمليات</option>
                    <option value="edit">تعديلات</option>
                    <option value="delete">حذف</option>
                    <option value="add">إضافات</option>
                    <option value="login">تسجيل دخول</option>
                    <option value="logout">تسجيل خروج</option>
                </select>

                <button
                    onClick={fetchLogs}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                >
                    تحديث القائمة
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1 scrollbar-thin">
                    <table className="w-full text-right border-collapse">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">التاريخ والوقت</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">المستخدم</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">نوع العملية</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">الوصف</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">القيم السابقة</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">القيم الجديدة</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-wider">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <ClipboardList size={56} className="text-slate-200" />
                                            <p className="text-sm font-bold text-slate-400">لا توجد سجلات مطابقة للبحث</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-600 tabular-nums">
                                                {new Date(log.created_at).toLocaleString('ar-SY')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <span className="text-xs font-black text-slate-800">{log.user_name || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getActionBadge(log.action_type)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-slate-700 leading-relaxed min-w-[200px]">{log.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        {formatJSON(log.old_values)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {formatJSON(log.new_values)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[10px] font-mono text-slate-400">{log.ip_address}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-400 font-bold">عرض صفحة {page} من {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={18} />
                        </button>
                        <button
                            disabled={page >= totalPages}
                            onClick={() => setPage(page + 1)}
                            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;