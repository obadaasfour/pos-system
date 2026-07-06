import React, { useState, useEffect } from 'react';
import { X, Tag, DollarSign, CheckCircle, Package, Info, AlertCircle } from 'lucide-react';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

const PricingModal = ({ isOpen, invoice, onConfirm, onClose, loading }) => {
    const [prices, setPrices] = useState({});

    useEffect(() => {
        if (invoice && invoice.items) {
            const initialPrices = {};
            invoice.items.forEach(item => {
                initialPrices[item.id] = {
                    syp: item.product?.price || '',
                    usd: item.product?.planned_price_usd || ''
                };
            });
            setPrices(initialPrices);
        }
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    const handlePriceChange = (itemId, field, val) => {
        setPrices(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: val }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(prices);
    };

    const totalCostUsd = (invoice.items || []).reduce((sum, item) => {
        const cost = Number(item.unit_cost_usd || item.unit_cost_price || 0);
        return sum + (item.quantity * cost);
    }, 0);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
            <div className="w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <Tag size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800">تحديد أسعار البيع النهائية</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">فاتورة رقم #{invoice.id} • بانتظار تسعير الوجبات</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 space-y-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-4 text-amber-800">
                        <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                        <div className="text-sm font-bold leading-relaxed">
                            <span className="block mb-1 text-amber-900 text-base">⚠️ مراجعة إلزامية للأسعار</span>
                            يجب تحديد سعر البيع النهائي (ل.س) وسعر البيع المخطط (USD) لكل وجبة واردة لتتمكن من إضافتها للمخزن.
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-5">المنتج الوارد</th>
                                    <th className="px-4 py-5 text-center">الكمية</th>
                                    <th className="px-4 py-5 text-center">تكلفة الشراء (USD)</th>
                                    <th className="px-4 py-5 text-center text-blue-600">سعر البيع (ل.س)</th>
                                    <th className="px-6 py-5 text-center text-emerald-600">سعر المبيع المخطط ($)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(invoice.items || []).map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                    <Package size={16} />
                                                </div>
                                                <div className="font-black text-slate-800 text-base">
                                                    {item.temp_product_name || item.product?.name || item.item_name || item.name || 'منتج غير محدد'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-center font-black text-slate-600 text-lg">{item.quantity}</td>
                                        <td className="px-4 py-5 text-center">
                                            <span className="font-mono font-black text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                                ${Number(item.unit_cost_usd || item.unit_cost_price || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5">
                                            <div className="relative group max-w-[160px] mx-auto">
                                                <input 
                                                    type="number"
                                                    required
                                                    value={prices[item.id]?.syp || ''}
                                                    placeholder="0 ل.س"
                                                    onChange={(e) => handlePriceChange(item.id, 'syp', e.target.value)}
                                                    className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl py-3.5 px-4 text-center text-base font-black text-blue-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="relative group max-w-[160px] mx-auto">
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={prices[item.id]?.usd || ''}
                                                    placeholder="0.00 $"
                                                    onChange={(e) => handlePriceChange(item.id, 'usd', e.target.value)}
                                                    className="w-full bg-emerald-50 border-2 border-emerald-100 rounded-2xl py-3.5 px-4 text-center text-base font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">إجمالي تكلفة الفاتورة</span>
                        <span className="text-2xl font-black text-slate-800">${totalCostUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={loading}
                            className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-12 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <><CheckCircle size={20} /> تأكيد التسعير والاستلام</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingModal;
