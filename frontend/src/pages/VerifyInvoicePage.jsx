import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
    CheckCircle, AlertTriangle, Receipt, 
    Calendar, User, CreditCard, ShoppingBag, 
    Printer, RefreshCw, ChevronLeft, ArrowRight
} from 'lucide-react';

const VerifyInvoicePage = () => {
    const { slug, uuid } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        fetchInvoice();
    }, [slug, uuid]);

    const fetchInvoice = async () => {
        setLoading(true);
        setError(null);
        try {
            const baseURL = import.meta.env.VITE_API_URL || `http://asus-lp.local:8000/api`;
            const res = await axios.get(`${baseURL}/${slug}/public-sales/${uuid}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': undefined  // Ensure no token is ever forwarded for this public endpoint
                }
            });
            setInvoice(res.data);
        } catch (err) {
            console.error("Error fetching invoice:", err);
            setError(err.response?.data?.message || "تعذر العثور على الفاتورة. يرجى التأكد من مسح الرمز الصحيح.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans" dir="rtl">
                <div className="text-center space-y-4">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-emerald-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-slate-400 font-extrabold text-sm tracking-wide">جاري جلب تفاصيل الفاتورة الرقمية...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans" dir="rtl">
                <div className="max-w-md w-full bg-slate-900/80 border border-slate-800/80 p-8 rounded-[2.5rem] text-center shadow-2xl space-y-6">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-slate-100">فشل التحقق من الفاتورة</h2>
                        <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
                    </div>
                    <div className="pt-2">
                        <button 
                            onClick={fetchInvoice} 
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            <RefreshCw size={16} /> إعادة المحاولة
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const date = new Date(invoice.created_at).toLocaleString('ar-SY', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const rate = parseFloat(invoice.exchange_rate || 1);
    const totalUsd = invoice.items?.reduce((sum, item) => {
        const itemPriceUsd = parseFloat(item.price_usd || 0);
        return sum + (itemPriceUsd > 0 ? itemPriceUsd : (parseFloat(item.unit_price) / rate)) * item.quantity;
    }, 0) || 0;

    return (
        <div className="min-h-screen bg-slate-100 py-12 px-4 font-sans text-slate-800 flex flex-col justify-between items-center" dir="rtl">
            
            {/* Main Content Area */}
            <div className="w-full max-w-md space-y-6">
                
                {/* Header Actions / Branding (Hidden in print) */}
                <div className="flex justify-between items-center px-4 no-print">
                    <Link 
                        to={`/${slug}/menu`}
                        className="text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                        <ArrowRight size={16} /> تصفح قائمة المتجر
                    </Link>
                    
                    <button 
                        onClick={handlePrint}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"
                    >
                        <Printer size={14} /> طباعة
                    </button>
                </div>

                {/* Floating Receipt Card */}
                <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-100/80 relative">
                    
                    {/* Security Verification Bar */}
                    <div className="bg-emerald-600 text-white px-6 py-4 text-center flex items-center justify-center gap-2 font-bold text-xs">
                        <CheckCircle size={16} className="text-emerald-200 animate-pulse" />
                        <span>مستند رسمي معتمد ومحمي بالـ UUID</span>
                    </div>

                    <div className="p-6 md:p-8 space-y-6">
                        
                        {/* Store Info Header */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{invoice.store_name}</h1>
                            <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black tracking-wider">
                                رقم الفاتورة: #{invoice.invoice_number}
                            </span>
                        </div>

                        {/* Top Decorative Tear-Line (Dashed Line) */}
                        <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-dashed border-slate-300"></div>
                            </div>
                        </div>

                        {/* Invoice Metadata Grid */}
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 block mb-1">تاريخ ووقت الشراء</span>
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <Calendar size={12} className="text-slate-400" />
                                    <span>{date}</span>
                                </div>
                            </div>
                            <div className="text-left">
                                <span className="text-[10px] font-extrabold text-slate-400 block mb-1">الكاشير المسئول</span>
                                <div className="flex items-center gap-1.5 justify-end font-bold text-slate-700">
                                    <User size={12} className="text-slate-400" />
                                    <span>{invoice.cashier_name}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-extrabold text-slate-400 block mb-1">طريقة الدفع</span>
                                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                    <CreditCard size={12} className="text-slate-400" />
                                    <span>{invoice.payment_method === 'credit' ? 'بيع آجل (ذمم)' : 'نقدي'}</span>
                                </div>
                            </div>
                            {invoice.customer_name && (
                                <div className="text-left">
                                    <span className="text-[10px] font-extrabold text-slate-400 block mb-1">اسم العميل</span>
                                    <div className="flex items-center gap-1.5 justify-end font-bold text-emerald-600">
                                        <User size={12} className="text-emerald-500" />
                                        <span>{invoice.customer_name}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">
                                <ShoppingBag size={12} />
                                <span>المنتجات والمشتريات</span>
                            </div>

                            <div className="divide-y divide-slate-100">
                                {invoice.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start py-3 first:pt-0 last:pb-0">
                                        <div className="space-y-1">
                                            <span className="font-extrabold text-slate-900 block text-xs leading-normal">{item.name}</span>
                                            <span className="text-[10px] text-slate-400 block font-bold">
                                                {item.quantity} وحدة × {Number(item.unit_price).toLocaleString()} ل.س
                                            </span>
                                        </div>
                                        <span className="font-black text-slate-900 text-xs">
                                            {Number(item.total_local).toLocaleString()} ل.س
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Separator */}
                        <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-dashed border-slate-300"></div>
                            </div>
                        </div>

                        {/* Invoice Totals Box */}
                        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 relative overflow-hidden shadow-lg">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                            
                            <div className="flex justify-between items-center text-xs text-slate-400 font-bold">
                                <span>عدد العناصر المباعة:</span>
                                <span>{invoice.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} وحدة</span>
                            </div>

                            <div className="flex justify-between items-end pt-2 border-t border-slate-800">
                                <span className="font-extrabold text-xs text-slate-300">المجموع النهائي المستحق:</span>
                                <div className="text-left space-y-1">
                                    <span className="block font-black text-emerald-400 text-2xl leading-none tracking-tight">
                                        {Number(invoice.total_amount).toLocaleString('ar-SY')} <small className="text-xs font-bold">ل.س</small>
                                    </span>
                                    {totalUsd > 0 && (
                                        <span className="block font-bold text-slate-400 text-[10px]">
                                            (${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} مخطط)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Seal and verification status */}
                        <div className="text-center pt-2 space-y-1">
                            <p className="text-[10px] font-extrabold text-slate-400">متجر {invoice.store_name} - فواتير البيع الإلكترونية</p>
                            <p className="text-[8px] text-slate-300 font-mono tracking-wider break-all">{invoice.uuid}</p>
                        </div>

                    </div>
                </div>

            </div>

            {/* Sticky/Bottom Footer */}
            <div className="text-center pt-6 pb-2 no-print">
                <p className="text-[9px] text-slate-400 font-bold">نظام POS المبيعات المتكامل © 2026</p>
            </div>
            
        </div>
    );
};

export default VerifyInvoicePage;
