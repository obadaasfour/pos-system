import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Home, ArrowRight, ShieldAlert, Store } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
    const navigate = useNavigate();
    const { slug } = useParams();
    
    // Check if we are in a store context or global context
    const isStoreContext = !!slug;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white overflow-hidden relative">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] ${isStoreContext ? 'bg-blue-600' : 'bg-amber-600'} rounded-full blur-[120px]`}></div>
                <div className={`absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] ${isStoreContext ? 'bg-indigo-600' : 'bg-orange-600'} rounded-full blur-[120px]`}></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full text-center relative z-10"
            >
                <div className="mb-8 inline-flex items-center justify-center w-24 h-24 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl relative">
                    {isStoreContext ? <Store size={48} className="text-blue-500" /> : <ShieldAlert size={48} className="text-amber-500" />}
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute -top-1 -right-1 w-6 h-6 ${isStoreContext ? 'bg-rose-500' : 'bg-rose-600'} rounded-full border-4 border-slate-900`}
                    ></motion.div>
                </div>

                <h1 className="text-8xl font-black mb-2 bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">404</h1>
                <h2 className="text-2xl font-bold mb-4">
                    {isStoreContext ? 'المتجر غير موجود' : 'الصفحة غير موجودة'}
                </h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    {isStoreContext 
                        ? `عذراً، لا يوجد متجر بهذا الاسم (${slug}). تأكد من صحة الرابط أو عد للوحة التحكم العامة.`
                        : 'يبدو أن الرابط الذي تحاول الوصول إليه غير صحيح أو تم نقله. تأكد من صحة الرابط أو عد للرئيسية.'}
                </p>

                <div className="flex flex-col gap-3">
                    <Link 
                        to={isStoreContext ? "/super-admin" : "/"} 
                        className={`flex items-center justify-center gap-2 w-full ${isStoreContext ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'} text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]`}
                    >
                        <Home size={18} />
                        <span>{isStoreContext ? 'الذهاب للإدارة العامة' : 'العودة للرئيسية'}</span>
                    </Link>
                    
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-750 text-white font-bold py-4 rounded-2xl border border-slate-700 transition-all active:scale-[0.98]"
                    >
                        <ArrowRight size={18} />
                        <span>الرجوع للخلف</span>
                    </button>
                </div>
            </motion.div>

            {/* Bottom Credit */}
            <p className="absolute bottom-8 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                Cash POS &bull; Integrated Financial System
            </p>
        </div>
    );
};

export default NotFoundPage;
