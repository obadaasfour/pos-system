import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
    DollarSign, ShoppingBag, Package, AlertTriangle,
    TrendingUp, Calendar, ArrowUpRight, ArrowDownRight,
    ShoppingCart, ShieldCheck, RefreshCcw, Filter, Trophy, Coins,
    Sun, CalendarDays, CalendarRange, Settings2, Zap,
    Download, QrCode, X, Users, Truck, Banknote
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const formatPriceProfit = (n) => (
    <span className="flex items-baseline gap-1 justify-center">
        <span>{Number(n || 0).toLocaleString('ar-SY')}</span>
        <span className="text-[10px] opacity-60 font-normal">ل.س</span>
    </span>
);

const StatCard = ({ title, value, icon: Icon, color, subtext, trend }) => (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden">
        <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} shrink-0 shadow-lg shadow-current/10`}>
                <Icon size={28} className="text-white" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-400 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-slate-800">{value}</h3>
                    {trend !== undefined && (
                        <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(trend)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
        {subtext && (
            <div className="pt-3 border-t border-slate-50">
                <p className="text-[11px] text-slate-400 font-medium">{subtext}</p>
            </div>
        )}
    </div>
);

const DashboardPage = () => {
    const { slug } = useParams();
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePreset, setActivePreset] = useState('daily');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // New Features States
    const [exporting, setExporting] = useState({});
    const [showQrModal, setShowQrModal] = useState(false);

    const handleExport = async (endpoint, filename) => {
        try {
            const token = localStorage.getItem('pos_token');
            const baseUrl = api.defaults.baseURL;
            // Clean baseUrl if it ends with /
            const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const exportUrl = `${cleanBaseUrl}/${slug}/export/${endpoint}?token=${token}`;

            // Open in new tab for direct download
            window.open(exportUrl, '_blank');
        } catch (error) {
            console.error('Export error:', error);
        }
    };

    const getPresetDates = (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        switch (preset) {
            case 'daily': return { from: fmt(today), to: fmt(today) };
            case 'monthly': return { from: fmt(new Date(today - 29 * 864e5)), to: fmt(today) };
            case 'yearly': return { from: fmt(new Date(today - 364 * 864e5)), to: fmt(today) };
            case 'custom': return { from: customStart, to: customEnd };
            default: return { from: fmt(today), to: fmt(today) };
        }
    };

    const fetchWithPreset = async (preset, customFrom = customStart, customTo = customEnd) => {
        const { from, to } = preset === 'custom'
            ? { from: customFrom, to: customTo }
            : getPresetDates(preset);
        if (!from || !to) return;
        setLoading(true);
        try {
            const res = await api.get(`/${slug}/dashboard`, { params: { from, to } });
            setData(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchWithPreset('daily');
        }
    }, [isAuthenticated, authLoading]);

    const handlePreset = (preset) => {
        setActivePreset(preset);
        if (preset !== 'custom') fetchWithPreset(preset);
    };

    const PRESETS = [
        { key: 'daily', label: 'يومي', icon: Sun },
        { key: 'monthly', label: 'شهري', icon: CalendarDays },
        { key: 'yearly', label: 'سنوي', icon: CalendarRange },
        { key: 'custom', label: 'مخصص', icon: Settings2 },
    ];

    if (loading || !data || !data.stats) return null;

    const { stats, sales_history } = data;

    return (
        <div className="p-4 sm:p-8 bg-slate-100 min-h-full space-y-6 sm:space-y-10 pb-20" dir="rtl">
            {/* Standardized Page Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-1">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">لوحة الإحصائيات</h1>
                    <p className="text-slate-500 font-bold flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        إحصائيات من <span className="text-blue-600 underline decoration-2 underline-offset-4">{data.period?.from}</span> إلى <span className="text-blue-600 underline decoration-2 underline-offset-4">{data.period?.to}</span>
                    </p>
                </div>

                {/* Header Actions / Filters */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl w-full lg:w-auto">
                    <button
                        onClick={() => setShowQrModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                    >
                        <QrCode size={18} /> عرض منيو QR
                    </button>

                    <div className="h-8 w-[1px] bg-slate-100 mx-1" />

                    <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
                        {PRESETS.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => handlePreset(key)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${activePreset === key
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 transform'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                                    }`}
                            >
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>

                    {activePreset === 'custom' && (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    className="text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                />
                            </div>
                            <span className="text-slate-300 font-bold">»</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    className="text-xs font-black text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={() => fetchWithPreset('custom', customStart, customEnd)}
                                disabled={!customStart || !customEnd}
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-30"
                            >
                                <Filter size={16} /> تطبيق
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    title="المبيعات"
                    value={formatPrice(stats.today_sales)}
                    icon={ShoppingCart}
                    color="bg-blue-600"

                    trend={stats.growth?.sales}
                />
                <StatCard
                    title="أرباح المبيعات"
                    value={formatPrice(stats.today_gross_profit)}
                    icon={TrendingUp}
                    color="bg-violet-600"
                    subtext="الربح الإجمالي (قبل المصاريف)"
                    trend={stats.growth?.gross_profit}
                />
                <StatCard
                    title="صافي الربح"
                    value={formatPrice(stats.today_net_profit)}
                    icon={ShieldCheck}
                    color="bg-blue-700"
                    subtext={`إجمالي المصاريف: ${formatPrice(stats.today_expenses)}`}
                    trend={stats.growth?.net_profit}
                />
                <StatCard
                    title="سيولة الصندوق"
                    value={formatPrice(stats.cash_balance)}
                    icon={DollarSign}
                    color="bg-emerald-500"
                    subtext="الرصيد النقدي المتوفر حالياً"
                />
                <StatCard
                    title="رأس المال المحبوس"
                    value={formatPrice(stats.locked_capital)}
                    icon={Package}
                    color="bg-amber-500"
                    subtext="قيمة المخزون الحالي (تكلفة)"
                />
                <StatCard
                    title="نواقص المخزون"
                    value={stats.low_stock_count}
                    icon={AlertTriangle}
                    color={stats.low_stock_count > 0 ? "bg-rose-500" : "bg-slate-400"}
                    subtext="منتجات وصلت للحد الأدنى"
                />
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sales History Chart */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-800">حركة المبيعات</h2>
                                <p className="text-sm text-slate-400"></p>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                                <TrendingUp size={14} /> <span>نشاط جيد</span>
                            </div>
                        </div>

                        <div className="h-[400px] w-full">
                            {sales_history && sales_history.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400} minHeight={300}>
                                    <AreaChart data={sales_history}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="label"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: '#94a3b8' }}
                                            tickFormatter={(val) => val > 0 ? `${val / 1000}k` : 0}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px', textAlign: 'right' }}
                                            formatter={(value) => [formatPrice(value), 'المبيعات']}
                                            labelFormatter={(label, payload) => {
                                                const item = payload[0]?.payload;
                                                return `${item?.day} (${item?.label})`;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#2563eb"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">لا توجد بيانات متاحة حالياً</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column Summary */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200 flex flex-col justify-between h-[300px]">
                        <div className="space-y-6">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <ArrowUpRight size={24} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black mb-2">أداء متميز</h2>
                                <p className="text-blue-100 text-xs opacity-80 leading-relaxed">
                                    نلاحظ نمواً في مبيعات المحل. تأكد من توفر المنتجات الأكثر طلباً لزيادة الأرباح.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold opacity-80">الخطة الشهرية</span>
                                <span className="text-xs font-black">75%</span>
                            </div>
                            <div className="w-full bg-blue-900/30 h-2 rounded-full overflow-hidden">
                                <div className="bg-white h-full transition-all duration-1000" style={{ width: '75%' }} />
                            </div>
                        </div>
                    </div>

                    {/* Quick Insight / Alert */}
                    <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200">
                        <div className="flex items-center gap-3 mb-3 text-amber-700">
                            <AlertTriangle size={24} />
                            <h3 className="font-black">تنبيه المخزون</h3>
                        </div>
                        <p className="text-sm text-amber-800 leading-relaxed font-medium mb-4">
                            هناك <span className="font-black text-amber-600 font-sans">{stats.low_stock_count}</span> أصناف قاربت على النفاد (وصلت للحد الأدنى).
                        </p>

                        <div className="space-y-2">
                            {data.low_stock_products && data.low_stock_products.slice(0, 5).map((p, i) => (
                                <div key={i} className="flex justify-between items-center bg-white/50 p-3 rounded-xl border border-amber-100">
                                    <span className="text-xs font-bold text-slate-700">{p.name}</span>
                                    <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{p.stock_quantity} قطعة</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Export Section */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Download size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800">تصدير البيانات</h2>
                        <p className="text-xs text-slate-400 font-bold">استخرج سجلاتك إلى ملفات Excel متوافقة</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { id: 'products', label: 'المنتجات', icon: Package, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                        { id: 'employees', label: 'الموظفين', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                        { id: 'suppliers', label: 'الموردين', icon: Truck, color: 'bg-purple-50 text-purple-600 border-purple-100' },
                        { id: 'debts', label: 'سجل الديون', icon: Banknote, color: 'bg-rose-50 text-rose-600 border-rose-100' },
                    ].map(item => (
                        <button
                            key={item.id}
                            disabled={exporting[item.id]}
                            onClick={() => handleExport(item.id, item.id)}
                            className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all group relative overflow-hidden ${item.color} ${exporting[item.id] ? 'opacity-50 cursor-wait' : 'hover:scale-[1.02] active:scale-95'}`}
                        >
                            <div className="flex items-center gap-4">
                                <item.icon size={28} className="group-hover:rotate-12 transition-transform" />
                                <span className="font-black text-sm">{item.label}</span>
                            </div>
                            {exporting[item.id] ? (
                                <RefreshCcw size={18} className="animate-spin" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center">
                                    <Download size={14} className="opacity-60 group-hover:translate-y-0.5 transition-transform" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Grid: Three Strategic Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Top Selling Today */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-extrabold text-blue-600">الأصناف الأكثر مبيعاً اليوم 🏆</h2>
                            <p className="text-xs text-slate-400 mt-1">أكثر 5 أصناف تم تداولها اليوم</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 flex-1">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">اسم المنتج</th>
                                    <th className="px-6 py-4 text-center">الكمية</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.top_products && data.top_products.length > 0 ? data.top_products.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-white transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{p.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black">
                                                {p.total_quantity}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="2" className="px-6 py-8 text-center text-slate-400 font-medium">لا توجد مبيعات لليوم بعد</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. Top Volume All-time */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-30" />
                    <div className="relative mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <Trophy size={20} className="text-amber-500" />
                            <h2 className="text-xl font-extrabold text-amber-600">الأكثر مبيعاً (كميات)</h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">أعلى 10 منتجات تم بيعها تاريخياً</p>
                    </div>
                    <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 flex-1 relative">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4 text-center">الكمية</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.all_time_top_volume && data.all_time_top_volume.length > 0 ? data.all_time_top_volume.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-white transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{p.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-black">
                                                {p.total_quantity}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-400 font-medium">لا توجد بيانات</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Top Profit All-time */}
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-30" />
                    <div className="relative mb-6">
                        <div className="flex items-center gap-3 mb-1">
                            <Coins size={20} className="text-emerald-500" />
                            <h2 className="text-xl font-extrabold text-emerald-600">الأكثر ربحاً (صافي ربح)</h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">أعلى 10 منتجات مدرة للأرباح</p>
                    </div>
                    <div className="overflow-x-auto bg-slate-50 rounded-2xl border border-slate-100 flex-1 relative">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4 text-center text-emerald-700">صافي الربح</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.all_time_top_profit && data.all_time_top_profit.length > 0 ? data.all_time_top_profit.map((p, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-white transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{p.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-emerald-600 font-black">
                                                {formatPriceProfit(p.total_profit)}
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-400 font-medium">لا توجد بيانات</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* QR Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-6 left-6 w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all z-10"
                        >
                            <X size={20} />
                        </button>

                        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-12 flex flex-col items-center text-center text-white relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md">
                                <QrCode size={32} />
                            </div>
                            <h3 className="text-2xl font-black mb-2">QR منيو المتجر</h3>
                            <p className="text-indigo-100 text-xs font-bold leading-relaxed opacity-80">
                                شارك هذا الرمز مع زبائنك لتمكينهم من تصفح المنيو والأسعار مباشرة من جوالاتهم.
                            </p>
                        </div>

                        <div className="p-12 flex flex-col items-center gap-8">
                            <div className="p-6 bg-slate-50 rounded-[3rem] border-4 border-white shadow-inner">
                                <QRCodeCanvas
                                    value={`${window.location.origin}/${slug}/menu`}
                                    size={180}
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            <div className="w-full text-center space-y-2">
                                <p className="text-[10px] uppercase tracking-[4px] text-slate-300 font-black">Link</p>
                                <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-slate-500 text-xs font-mono font-bold break-all">
                                    {window.location.origin}/{slug}/menu
                                </div>
                            </div>

                            <button
                                onClick={() => window.print()}
                                className="w-full bg-slate-900 text-white py-4 rounded-full text-sm font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                            >
                                طباعة الرمز للزبائن
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
