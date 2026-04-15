import React from 'react';
import { X, Layers, Clock, ShoppingCart, DollarSign } from 'lucide-react';

/**
 * Modal to let the cashier pick a specific inventory batch (manual batch selection).
 */
const BatchPickerModal = ({ isOpen, onClose, product, onSelect }) => {
    if (!isOpen || !product) return null;

    const batches = product.batches || [];

    const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
    const formatUsd   = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="bg-slate-900 px-6 py-5 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-lg leading-tight">اختيار الوجبة</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{product.name}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {batches.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <Clock size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="font-bold">لا توجد وجبات متوفرة حالياً لهذا المنتج.</p>
                            <p className="text-xs mt-1">يرجى تسجيل عملية شراء جديدة لتزويد المخزون.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-400 px-1 uppercase tracking-wider">الوجبات المتاحة (يرجى اختيار الوجبة التي يحملها الزبون):</p>
                            
                            {batches.map((batch) => (
                                <button
                                    key={batch.id}
                                    onClick={() => onSelect(batch)}
                                    className="w-full text-right p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group flex items-center justify-between"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                                وجبة رقم #{batch.id}
                                            </span>
                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                                {new Date(batch.created_at).toLocaleDateString('ar-SY')}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1">
                                                <DollarSign size={12} className="text-emerald-500" />
                                                التكلفة: <strong className="text-slate-700">{formatUsd(batch.cost_usd)}</strong>
                                            </span>
                                            <span className="text-slate-300">|</span>
                                            <span>
                                                سعر الصرف: <strong className="text-slate-700">{Number(batch.exchange_rate).toLocaleString()}</strong>
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-left">
                                        <div className="text-lg font-black text-indigo-600">
                                            {batch.remaining_qty} <span className="text-[10px] text-slate-400 font-bold uppercase">قطعة</span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">الكمية المتبقية</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                        يرجى التأكد من مطابقة الوجبة المختارة مع السلعة الفعلية لضمان دقة الأرباح.
                    </p>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-colors"
                    >
                        إلغاء
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BatchPickerModal;
