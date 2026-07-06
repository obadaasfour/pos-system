import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    FileText, Download, TrendingUp, DollarSign, 
    ArrowDownCircle, Package, Calendar, BarChart4
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { CAIRO_FONT } from "../utils/CairoFont";
import { fixArabic } from "../utils/invoiceGenerator";
import { SHOP_LOGO } from "../utils/Logo";

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

const ReportsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/monthly');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const exportPDF = () => {
        if (!data) return;

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // Register Cairo Font
        try {
            if (CAIRO_FONT) {
                doc.addFileToVFS('Cairo-Regular.ttf', CAIRO_FONT);
                doc.addFont('Cairo-Regular.ttf', 'Cairo', 'normal');
                doc.addFont('Cairo-Regular.ttf', 'Cairo', 'bold');
                doc.setFont('Cairo', 'normal');
            }
        } catch (e) {}

        const BLACK = [0, 0, 0];
        doc.setTextColor(0, 0, 0);

        // Logo
        if (SHOP_LOGO) {
            try {
                doc.addImage(SHOP_LOGO, 'PNG', 10, 8, 20, 20);
            } catch (e) {}
        }

        // Header
        doc.setFont('Cairo', 'bold');
        doc.setFontSize(22);
        doc.text(fixArabic('سوبر ماركت الوفاء'), 200, 20, { align: 'right' });
        doc.setFontSize(16);
        doc.text(fixArabic(`التقرير الشهري - ${data.month}`), 200, 30, { align: 'right' });

        doc.setDrawColor(0, 0, 0);
        doc.line(10, 35, 200, 35);

        // Summaries
        doc.setFont('Cairo', 'normal');
        doc.setFontSize(12);
        doc.text(fixArabic(`إجمالي المبيعات: ${Number(data.total_sales).toLocaleString()} ل.س`), 200, 45, { align: 'right' });
        doc.text(fixArabic(`صافي الأرباح: ${Number(data.total_profit).toLocaleString()} ل.س`), 200, 52, { align: 'right' });
        doc.text(fixArabic(`إجمالي المصاريف: ${Number(data.total_expenses).toLocaleString()} ل.س`), 200, 59, { align: 'right' });

        // Most Profitable Products Table
        doc.setFont('Cairo', 'bold');
        doc.text(fixArabic('الأصناف الأكثر ربحية:'), 200, 75, { align: 'right' });
        
        const productHead = [['صافي الربح', 'الكمية', 'اسم الصنف']].map(row => row.map(fixArabic));
        const productBody = data.top_profitable.map(p => [
            Number(p.total_profit).toLocaleString(),
            p.total_quantity,
            p.name
        ].map(fixArabic));

        autoTable(doc, {
            startY: 80,
            head: productHead,
            body: productBody,
            styles: { font: 'Cairo', halign: 'right', textColor: [0,0,0] },
            headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0] }
        });

        // Expenses Table
        const nextY = doc.lastAutoTable.finalY + 15;
        doc.text(fixArabic('سجل المصاريف:'), 200, nextY, { align: 'right' });
        
        const expenseHead = [['المبلغ', 'الوصف', 'التاريخ']].map(row => row.map(fixArabic));
        const expenseBody = data.expenses.map(e => [
            Number(e.amount).toLocaleString(),
            e.description || 'مصاريف',
            new Date(e.created_at).toLocaleDateString('ar-SY')
        ].map(fixArabic));

        autoTable(doc, {
            startY: nextY + 5,
            head: expenseHead,
            body: expenseBody,
            styles: { font: 'Cairo', halign: 'right', textColor: [0,0,0] },
            headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0] }
        });

        doc.save(`Report_${data.month}.pdf`);
    };

    if (loading || !data) return null;

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header for Reports */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-slate-300/50">
                    <div className="flex items-center gap-6 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-black rounded-3xl flex items-center justify-center text-white shadow-xl shadow-slate-200 ring-4 ring-slate-50">
                            <BarChart4 size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">التقارير الشهرية</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                تحليل الأداء، الأرباح والمصاريف لشهر {data.month}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={exportPDF}
                            className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-slate-900 text-white font-black text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Download size={20} className="text-blue-400" />
                            <span>تصدير تقرير PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-8 pt-4 space-y-10 overflow-y-auto">

            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                            <DollarSign size={24} />
                        </div>
                        <span className="font-bold text-slate-500">إجمالي المبيعات</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">{formatPrice(data.total_sales)}</h2>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <span className="font-bold text-slate-500">صافي الأرباح</span>
                    </div>
                    <h2 className="text-2xl font-black text-emerald-600">{formatPrice(data.total_profit)}</h2>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                            <ArrowDownCircle size={24} />
                        </div>
                        <span className="font-bold text-slate-500">إجمالي المصاريف</span>
                    </div>
                    <h2 className="text-2xl font-black text-rose-600">{formatPrice(data.total_expenses)}</h2>
                </div>
            </div>

            {/* Profit & Sales Chart */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                    <h2 className="text-xl font-black text-slate-800">تحليل المبيعات والأرباح اليومي</h2>
                    <p className="text-sm text-slate-400">مقارنة بين إجمالي البيع وصافي الربح يوماً بيوم</p>
                </div>
                <div className="h-[400px]" style={{ minHeight: '350px' }}>
                    <ResponsiveContainer width="100%" height={400} minHeight={300}>
                        <LineChart data={data.daily_data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} />
                            <Tooltip 
                                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                formatter={(val) => formatPrice(val)}
                            />
                            <Legend verticalAlign="top" height={36}/>
                            <Line type="monotone" name="المبيعات" dataKey="sales" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line type="monotone" name="الأرباح" dataKey="profit" stroke="#10b981" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Most Profitable Products */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Package className="text-blue-600" size={24} />
                        <h2 className="text-xl font-black text-slate-800">الأصناف الأكثر ربحية 🏆</h2>
                    </div>
                    <div className="space-y-4">
                        {data.top_profitable.map((p, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">{p.name}</p>
                                    <p className="text-xs text-slate-400">الكمية المباعة: {p.total_quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-emerald-600">{formatPrice(p.total_profit)}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">صافي ربح</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Expenses Details */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <ArrowDownCircle className="text-rose-600" size={24} />
                        <h2 className="text-xl font-black text-slate-800">تفاصيل المصاريف الأخيرة</h2>
                    </div>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {data.expenses.map((e, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                                <div>
                                    <p className="font-bold text-slate-800">{e.description || 'مصروف عام'}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Calendar size={12} />
                                        {new Date(e.created_at).toLocaleDateString('ar-EG')}
                                    </div>
                                </div>
                                <p className="font-black text-rose-600">{formatPrice(e.amount)}</p>
                            </div>
                        ))}
                        {data.expenses.length === 0 && (
                            <div className="text-center py-10 text-slate-400 font-medium">لا توجد مصاريف مسجلة لهذا الشهر</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);
};

export default ReportsPage;
