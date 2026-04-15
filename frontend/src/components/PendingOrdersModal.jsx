import React from 'react';
import { 
    X, ShoppingBag, User, Clock, 
    Check, Trash2, ArrowLeft, RefreshCw,
    CircleDot
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PendingOrdersModal = ({ 
    isOpen, 
    onClose, 
    orders, 
    onAccept, 
    onReject, 
    loading 
}) => {
    if (!isOpen) return null;

    const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/30">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                            <RefreshCw size={28} className={loading ? "animate-spin" : ""} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">طلبات الزبائن المنتظرة</h3>
                            <p className="text-sm text-slate-500 font-bold">لديك {orders.length} طلبات جديدة عبر الباركود</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <ShoppingBag size={40} className="opacity-20" />
                            </div>
                            <p className="font-black text-slate-400">لا يوجد طلبات معلقة حالياً</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <motion.div 
                                key={order.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-500">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-base">{order.customer_name_or_table}</h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mt-0.5">
                                                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span className="flex items-center gap-1"><RefreshCw size={12} /> طلب QR</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => onReject(order.id)}
                                            className="p-3 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                            title="رفض الطلب"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                        <button 
                                            onClick={() => onAccept(order)}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
                                        >
                                            <Check size={18} />
                                            <span>قبول الطلب</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-blue-600">{item.quantity}</span>
                                                <span className="font-bold text-slate-700">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-400">{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    ))}
                                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-xs font-black text-slate-400">إجمالي الطلب</span>
                                        <span className="text-base font-black text-blue-600">{formatPrice(order.total_amount)}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-slate-50 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[3px]">نظام الطلب الذاتي المتصل</p>
                </div>
            </motion.div>
        </div>
    );
};

export default PendingOrdersModal;
