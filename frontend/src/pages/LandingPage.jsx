import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Zap, ArrowLeft, ArrowRight } from 'lucide-react';

const LandingPage = () => {
    const [storeSlug, setStoreSlug] = useState('');
    const navigate = useNavigate();

    const handleStoreLogin = (e) => {
        if (e.key === 'Enter' && storeSlug) {
            navigate(`/${storeSlug}/login`);
        }
    };

    return (
        // تم إضافة h-screen و overflow-hidden لمنع السكرول
        <div className="h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900 flex flex-col overflow-hidden" dir="rtl">

            {/* Navbar - مضغوط أكثر */}
            <nav className="flex items-center justify-between px-8 py-4 border-b border-slate-50 max-w-7xl mx-auto w-full shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Zap size={18} className="text-white fill-current" />
                    </div>
                    <span className="text-lg font-black text-slate-900 tracking-tight">CASH POS</span>
                </div>
                <Link to="/login" className="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 px-4 py-2 rounded-lg">دخول المسؤول</Link>
            </nav>

            {/* Main Content - يشغل المساحة المتبقية بمرونة */}
            <main className="flex-1 max-w-7xl mx-auto px-8 grid lg:grid-cols-2 gap-8 items-center w-full">

                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                        <ShieldCheck size={12} /> الإصدار الجديد 2026
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-tight tracking-tighter">
                        أذكى نظام <span className="text-indigo-600">POS</span> <br /> لإدارة تجارتك
                    </h1>

                    <p className="text-lg text-slate-500 leading-relaxed max-w-md font-medium">
                        منصة سحابية متكاملة لإدارة المبيعات والمخزون بذكاء فائق.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        {/* كرت دخول المتجر - مصغر وأنيق */}
                        <div className="flex-1 p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all shadow-sm">
                            <h3 className="font-black text-lg text-slate-800 mb-2">هل لديك متجر؟</h3>
                            <p className="text-sm text-slate-500 mb-6 font-medium">ادخل باسم المتجر الخاص بك للوصول إلى لوحة التحكم الخاصة بك.</p>
                            <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 focus-within:border-indigo-500 transition-all">
                                <span className="text-slate-300 text-[10px] font-bold">url.com/</span>
                                <input
                                    placeholder="اسم-المتجر"
                                    className="bg-transparent border-none outline-none text-xs font-black w-full"
                                    value={storeSlug}
                                    onChange={(e) => setStoreSlug(e.target.value)}
                                    onKeyDown={handleStoreLogin}
                                />
                                <button onClick={() => storeSlug && navigate(`/${storeSlug}/login`)}>
                                    <ArrowLeft size={16} className="text-indigo-600" />
                                </button>
                            </div>
                        </div>

                        {/* كرت الموردين - مضغوط */}
                        <div className="flex-1 p-5 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col justify-between shadow-sm">
                            <div>
                                <h3 className="font-black text-lg text-emerald-800 mb-2">بوابة الموردين</h3>
                                <p className="text-sm text-emerald-700/70 mb-6 font-medium">هل أنت مورد؟ تابع نواقص البضاعة واحتياجات المتاجر من منصة واحدة ذكية.</p>
                            </div>
                            <Link to="/login" className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all">
                                دخول السريع <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>


                <div className="relative hidden lg:block scale-90">
                    <div className="absolute inset-0 bg-indigo-200 blur-[100px] opacity-10 rounded-full"></div>
                    <div className="relative bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-50 overflow-hidden max-w-sm mx-auto">
                        <div className="bg-slate-900 rounded-[2rem] aspect-square flex flex-col items-center justify-center p-8 text-center text-white relative overflow-hidden">
                            {/* زخرفة خلفية */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/20 blur-2xl rounded-full" />
                            <ShoppingCart size={80} className="mb-6 text-indigo-400 animate-bounce duration-[4000ms]" />
                            <h2 className="text-xl font-black mb-2 italic">في انتظارك</h2>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">نظام محاسبي سحابي فائق السرعة</p>
                        </div>
                    </div>
                </div>
            </main>


            <footer className="py-6 px-8 border-t border-slate-50 shrink-0">
                <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] font-black text-slate-400 tracking-widest uppercase">
                    <p>© 2026 CASH POS SYSTEM</p>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-indigo-600 transition-colors">الدعم</a>
                        <a href="#" className="hover:text-indigo-600 transition-colors">الخصوصية</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
