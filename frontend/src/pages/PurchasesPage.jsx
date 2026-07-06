import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import SoundService from '../utils/SoundService';
import {
    Package, Plus, Trash2, Save, ChevronDown, AlertTriangle,
    RefreshCw, CheckCircle, Search, Truck, X, DollarSign, User,
    Layers, Tag, Info, List, Receipt
} from 'lucide-react';
import { toastSuccess, alertError } from '../utils/swal';
import { useAuth } from '../context/AuthContext';
import PricingModal from '../components/PricingModal';
import echo from '../utils/echo';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const formatUsd   = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

/* ─── Product Picker Modal ────────────────────────── */
const ProductPickerModal = ({ products, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.barcode && p.barcode.includes(q))
        );
    }, [products, search]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <List size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">اختر منتجاً</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">البحث اللحظي في قائمة المنتجات</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative group">
                        <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text"
                            autoFocus
                            placeholder="ابحث بالاسم، الباركود، أو الفئة..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pr-12 pl-4 text-sm font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all shadow-inner"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50">
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center text-slate-300">
                            <Package size={64} className="mx-auto mb-4 opacity-20" />
                            <p className="font-bold">لا توجد نتائج بحث</p>
                        </div>
                    ) : (
                        filtered.map(p => (
                            <button
                                key={p.id}
                                onClick={() => onSelect(p)}
                                className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between hover:border-blue-400 hover:shadow-lg hover:shadow-blue-900/5 group transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <Package size={24} />
                                    </div>
                                    <div className="text-right">
                                        <h4 className="font-black text-slate-800 group-hover:text-blue-700 transition-colors">{p.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            {p.barcode && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg font-mono">{p.barcode}</span>}
                                            <span className="text-[10px] text-blue-500 font-bold">#{p.category?.name || 'عام'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs font-black text-slate-800">المتوفر حالياً</span>
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black mt-1 ${p.stock_quantity > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                        {p.stock_quantity} قطعة
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── Invoice Details Modal ───────────────────────── */
const InvoiceDetailsModal = ({ invoice, onClose }) => {
    if (!invoice) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <Receipt size={22} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">تفاصيل الفاتورة #{invoice.id}</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{invoice.supplier?.name || 'مورد عام'} • {new Date(invoice.created_at).toLocaleDateString('ar-SY')}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">المنتج</th>
                                    <th className="px-6 py-4 text-center">الكمية</th>
                                    <th className="px-6 py-4 text-center">التكلفة (ل.س)</th>
                                    <th className="px-6 py-4 text-center">الإجمالي (ل.س)</th>
                                    <th className="px-6 py-4 text-center text-blue-600">سعر المبيع المحدد</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {(invoice?.items || []).map(item => {
                                    const batch = invoice.batches?.find(b => b.product_id === item.product_id && b.original_quantity === item.quantity) || {};
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{item.product?.name || 'منتج محذوف'}</td>
                                            <td className="px-6 py-4 text-center font-black">{item.quantity}</td>
                                            <td className="px-6 py-4 text-center font-mono text-slate-500">{formatUsd(item.unit_cost_price)}</td>
                                            <td className="px-6 py-4 text-center font-mono font-bold">{formatUsd(item.subtotal)}</td>
                                            <td className="px-6 py-4 text-center font-black text-blue-600">
                                                {batch.sale_price ? formatPrice(batch.sale_price) : '--'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">سعر الصرف:</span>
                        <span className="text-sm font-black text-emerald-600">{formatPrice(invoice.exchange_rate)}</span>
                    </div>
                    <div className="text-left">
                        <span className="text-xs font-bold text-slate-400 block mb-1">الإجمالي الكلي</span>
                        <span className="text-xl font-black text-indigo-700">{formatUsd(invoice.total_amount)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PurchasesPage = () => {
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    const [purchases,  setPurchases]  = useState([]);
    const [products,   setProducts]   = useState([]);
    const [suppliers,  setSuppliers]  = useState([]);
    const [showForm,   setShowForm]   = useState(false);
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [toast,      setToast]      = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [incomingPurchases, setIncomingPurchases] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'incoming'
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [pricingInvoice, setPricingInvoice] = useState(null);

    const [pickerState, setPickerState] = useState({ open: false, index: null });

    const [form, setForm] = useState({
        supplier_id: '',
        exchange_rate: '',
        notes: '',
        items: [{ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '', unit_sale_price: '', planned_price_usd: '' }],
    });

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchAll();

            // Real-time listener for B2B Shipments
            if (user?.store_id) {
                const channel = echo.private(`stores.${user.store_id}`);
                
                // 1. Listen for standard status updates (for UI refresh)
                channel.listen('.b2b.order_status_updated', (e) => {
                    console.log('[Live Status] Order updated:', e);
                    if (e.status === 'shipped') {
                        SoundService.playNotification();
                        toastSuccess(`🚚 تم الشحن: قام المورد بشحن الطلب رقم #${e.order_id}، الفاتورة جاهزة للمراجعة.`);
                        fetchAll(); // Inject the new purchase into the table
                    }
                });

                // 2. Listen for notifications (for the bell dot)
                channel.notification((notification) => {
                    console.log('[Live Notification] Purchases received:', notification);
                    if (notification.type === 'b2b_order_status' && notification.status === 'shipped') {
                        // Already handled by listen() above, but ensures bell reflects change
                    }
                });

                return () => {
                    echo.leave(`stores.${user.store_id}`);
                };
            }
        }
    }, [isAuthenticated, authLoading, user?.store_id]);

    const fetchAll = async () => {
        setLoading(true);
        console.log('[DEBUG] currentSlug in PurchasesPage:', window.location.pathname.split('/')[1]);
        try {
            const [purRes, invRes, supRes, setRes, incRes] = await Promise.all([
                api.get('/purchases'),
                api.get('/inventory'),
                api.get('/suppliers'),
                api.get('/settings'),
                api.get('/purchases/incoming')
            ]);

            const pData = Array.isArray(purRes.data.data) ? purRes.data.data : (Array.isArray(purRes.data) ? purRes.data : []);
            const invData = Array.isArray(invRes.data.data) ? invRes.data.data : (Array.isArray(invRes.data) ? invRes.data : []);
            const supData = Array.isArray(supRes.data.data) ? supRes.data.data : (Array.isArray(supRes.data) ? supRes.data : []);
            const iData = Array.isArray(incRes.data) ? incRes.data : [];

            setPurchases(pData);
            setProducts(invData);
            setSuppliers(supData);
            setIncomingPurchases(iData);
            
            console.log('Received Data:', setRes.data);
            if (setRes.data) {
                // Settings might be in setRes.data.data or setRes.data
                const settings = setRes.data.data || setRes.data;
                import('../db').then(db => db.cacheSettings(setRes.data));
                
                if (settings.exchange_rate) {
                    setForm(f => ({ ...f, exchange_rate: settings.exchange_rate }));
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setForm(f => ({ ...f, items: [...f.items, { product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '', unit_sale_price: '', planned_price_usd: '' }] }));
    };

    const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    
    const updateItem = (i, field, val) => setForm(f => {
        const newItems = [...f.items];
        newItems[i] = { ...newItems[i], [field]: val };
        
        const rate = parseFloat(f.exchange_rate) || 0;

        if (field === 'unit_cost_usd') {
            const usd = parseFloat(val) || 0;
            newItems[i].unit_cost_price = (usd * rate).toFixed(0);
        }

        if (field === 'planned_price_usd') {
            const usd = parseFloat(val) || 0;
            newItems[i].unit_sale_price = (usd * rate).toFixed(0);
        }
        
        return { ...f, items: newItems };
    });

    const handleProductSelect = (product) => {
        const idx = pickerState.index;
        if (!product || idx === null) return;
        
        SoundService.playSuccess();
        setForm(f => {
            const newItems = [...(f.items || [])];
            if (!newItems[idx]) return f;

            newItems[idx] = { 
                ...newItems[idx], 
                product_id: product.id, 
                name: product.name,
                unit_cost_price: product.cost_price || '',
                unit_cost_usd: product.current_cost_usd || '',
                unit_sale_price: product.price || '' // Use current price as suggestion
            };
            
            // Add a new empty row if this was the last row
            if (idx === newItems.length - 1) {
                newItems.push({ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '', unit_sale_price: '' });
            }
            
            return { ...f, items: newItems };
        });
        setPickerState({ open: false, index: null });
    };

    const finalizedPurchases = useMemo(() => {
        return (purchases || []).filter(p => ['received', 'completed', 'paid'].includes(p.status));
    }, [purchases]);

    const filteredIncoming = useMemo(() => {
        return (incomingPurchases || []).filter(p => ['pending_confirmation', 'pending_approval'].includes(p.status));
    }, [incomingPurchases]);

    const formTotal = useMemo(() => {
        return (form.items || []).reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unit_cost_price) || 0;
            return sum + (qty * price);
        }, 0);
    }, [form.items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validItems = form.items.filter(it => it.product_id);
        if (validItems.length === 0) return alertError('تنبيه', 'يرجى اختيار منتج واحد على الأقل');

        // Force sale price validation
        const missingSalePrice = validItems.some(it => !it.unit_sale_price || parseFloat(it.unit_sale_price) <= 0);
        if (missingSalePrice) {
            return alertError('بيانات ناقصة', 'يجب تحديد سعر بيع (L.S) لجميع الوجبات الجديدة قبل الحفظ.');
        }
        
        setSaving(true);
        const payload = { ...form, items: validItems };
        payload.supplier_id = payload.supplier_id ? parseInt(payload.supplier_id) : null;
        
        try {
            await api.post('/purchases', payload);
            toastSuccess('تم حفظ الفاتورة بنجاح والأسعار الجديدة 📦');
            setShowForm(false);
            setForm(f => ({ ...f, notes: '', items: [{ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '', unit_sale_price: '' }] }));
            fetchAll();
        } catch (err) {
            console.error(err);
            alertError('فشل الحفظ', 'خطأ أثناء الحفظ: تأكد من إدخال جميع البيانات المطلوبة.');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmReceipt = (invoice) => {
        setPricingInvoice(invoice);
        setIsPricingModalOpen(true);
    };

    const handleFinishPricing = async (pricingData) => {
        if (!pricingInvoice) return;

        try {
            setLoading(true);
            await api.post(`/purchases/${pricingInvoice.id}/confirm`, {
                prices: pricingData
            });
            toastSuccess('تم تأكيد الاستلام وتحديث المخزون والأسعار بنجاح ✅');
            setIsPricingModalOpen(false);
            setPricingInvoice(null);
            fetchAll();
        } catch (err) {
            alertError('فشل التأكيد', err.response?.data?.message || 'تعذر تأكيد استلام الفاتورة');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header for Purchases */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-slate-300/50">
                    <div className="flex items-center gap-6 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                            <Truck size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة المشتريات</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                تحديد تكاليف الوجبات وأسعار المبيع بدقة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100">
                        <button onClick={fetchAll} className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:shadow-md transition-all active:scale-95" title="تحديث البيانات">
                            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0">
                            <Plus size={20} /> فاتورة شراء جديدة
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-8 pt-4 space-y-8 overflow-y-auto">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        جميع الفواتير
                    </button>
                    <button 
                        onClick={() => setActiveTab('incoming')}
                        className={`px-8 py-3 rounded-2xl font-black text-sm transition-all relative ${activeTab === 'incoming' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                        المشتريات الواردة
                        {filteredIncoming.length > 0 && (
                            <span className="absolute -top-1 -left-1 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                                {filteredIncoming.length}
                            </span>
                        )}
                    </button>
                </div>

                {showForm && (
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[85vh] flex flex-col">
                        <div className="px-8 py-5 bg-slate-900 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <Truck size={18} className="text-white" />
                                </div>
                                <h2 className="font-black text-sm uppercase tracking-wider">إنشاء وجبات وتسعيرها</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-rose-400 transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="overflow-y-auto flex-1">
                            <form onSubmit={handleSubmit} className="p-8 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">المورد (اختياري)</label>
                                    <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all">
                                        <option value="">-- اضغط للاختيار --</option>
                                        {(suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">سعر الصرف (1$ = ل.س) <Info size={12}/></label>
                                    <input type="number" required value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))} className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl py-3.5 px-4 text-sm font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 transition-all text-center" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">ملاحظات الفاتورة</label>
                                    <input type="text" placeholder="..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-inner">
                                <table className="w-full text-sm text-right border-collapse">
                                    <thead className="bg-slate-200/50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4">المنتج</th>
                                            <th className="px-4 py-4 text-center w-24">الكمية</th>
                                            <th className="px-4 py-4 text-center w-32">التكلفة ($)</th>
                                            <th className="px-4 py-4 text-center w-36">التكلفة (ل.س)</th>
                                            <th className="px-4 py-4 text-center w-40 text-blue-600">المبيع المخطط ($)</th>
                                            <th className="px-4 py-4 text-center w-48 text-blue-600">سعر المبيع (L.S)</th>
                                            <th className="px-4 py-4 w-12 text-center text-rose-400"><X size={14}/></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {(form.items || []).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setPickerState({ open: true, index: idx })}
                                                        className={`w-full text-right px-4 py-3 rounded-2xl border transition-all flex items-center justify-between font-bold text-sm
                                                            ${item.name ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}
                                                        `}
                                                    >
                                                        {item.name || "اضغط لاختيار منتج..."}
                                                        <ChevronDown size={16} className="opacity-40" />
                                                    </button>
                                                </td>
                                                <td className="p-3">
                                                    <input type="number" min="1" required value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all" />
                                                </td>
                                                <td className="p-3">
                                                    <input type="number" step="0.01" min="0" required value={item.unit_cost_usd} onChange={e => updateItem(idx, 'unit_cost_usd', e.target.value)} className="w-full text-center bg-emerald-50 border border-emerald-100 rounded-xl py-3 px-2 text-sm font-black text-emerald-700 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all" />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <input type="number" min="0" required value={item.unit_cost_price} onChange={e => updateItem(idx, 'unit_cost_price', e.target.value)} className="w-full text-center bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-mono" />
                                                    <div className="text-[9px] text-slate-400 mt-1 font-bold">{formatPrice((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost_price) || 0))}</div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="relative">
                                                        <DollarSign size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400" />
                                                        <input 
                                                            type="number" 
                                                            step="0.01"
                                                            min="0"
                                                            placeholder="0.00"
                                                            value={item.planned_price_usd} 
                                                            onChange={e => updateItem(idx, 'planned_price_usd', e.target.value)} 
                                                            className="w-full text-center bg-emerald-50 border border-emerald-100 rounded-xl py-3 pr-8 pl-2 text-sm font-black text-emerald-800 outline-none focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all" 
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="relative">
                                                        <Tag size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400" />
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            required 
                                                            placeholder="سعر المبيع..."
                                                            value={item.unit_sale_price} 
                                                            onChange={e => updateItem(idx, 'unit_sale_price', e.target.value)} 
                                                            className="w-full text-center bg-blue-50 border border-blue-200 rounded-xl py-3 pr-8 pl-2 text-sm font-black text-blue-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-blue-300" 
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {form.items.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => removeItem(idx)} 
                                                            className="w-10 h-10 flex border border-rose-100 items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-900 text-white font-black">
                                        <tr>
                                            <td colSpan="3" className="px-8 py-5 text-left text-xs uppercase tracking-widest text-slate-400">إجمالي قيمة المشتريات</td>
                                            <td className="px-4 py-5 text-center font-black text-xl text-blue-400 border-x border-slate-800" colSpan={2}>{formatPrice(formTotal)}</td>
                                            <td className="bg-slate-800"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end gap-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-10 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all">إلغاء</button>
                                <button type="submit" disabled={saving} className="px-16 py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center gap-3">
                                    {saving ? <RefreshCw className="animate-spin text-white" /> : <Save size={20} />}
                                    حفظ الوجبات والأسعار
                                </button>
                            </div>
                        </form>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center text-slate-800">
                        <div className="flex items-center gap-3">
                            <List size={18} className="text-blue-600" />
                            <h2 className="font-black text-sm uppercase tracking-wider">
                                {activeTab === 'all' ? 'سجل فواتير الشراء الأخيرة' : 'بانتظار تأكيد الاستلام والمراجعة'}
                            </h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto text-right">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-right w-20">#</th>
                                    <th className="px-8 py-5 text-right">المورد</th>
                                    <th className="px-8 py-5 text-right">عدد الوجبات</th>
                                    <th className="px-8 py-5 text-right">إجمالي الفاتورة</th>
                                    <th className="px-8 py-5 text-right">الحالة</th>
                                    <th className="px-8 py-5 text-right">{activeTab === 'all' ? 'التاريخ' : 'الإجراء'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === 'all' ? (
                                    finalizedPurchases.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold">لا يوجد فواتير شراء حالياً</td></tr>
                                    ) : (
                                        finalizedPurchases.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 font-mono">
                                                    <button onClick={() => setSelectedInvoice(p)} className="text-blue-600 hover:text-blue-800 font-black hover:underline px-3 py-1 bg-blue-50 rounded-lg transition-all">
                                                        #{p.id}
                                                    </button>
                                                </td>
                                                <td className="px-8 py-5 font-black text-slate-700">{p.supplier?.name || '--'}</td>
                                                <td className="px-8 py-5">
                                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{p.items?.length || 0} صنف</span>
                                                </td>
                                                <td className="px-8 py-5 font-black text-emerald-600 text-base">{formatUsd(p.total_amount)}</td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black border tracking-wider ${p.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                        {p.status === 'received' ? 'تم الاستلام' : p.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-slate-500 font-bold text-xs italic">
                                                    {p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '--'}
                                                </td>
                                            </tr>
                                        ))
                                    )
                                ) : (
                                    filteredIncoming.length === 0 ? (
                                        <tr><td colSpan={6} className="py-20 text-center text-slate-300 font-bold">لا توجد مشتريات واردة بانتظار التأكيد حالياً</td></tr>
                                    ) : (
                                        filteredIncoming.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5 font-mono">
                                                    <button onClick={() => setSelectedInvoice(p)} className="text-blue-600 hover:text-blue-800 font-black hover:underline px-3 py-1 bg-blue-50 rounded-lg transition-all">#{p.id}</button>
                                                </td>
                                                <td className="px-8 py-5 font-black text-slate-700">{p.supplier?.name || '--'}</td>
                                                <td className="px-8 py-5 font-bold">{p.items?.length || 0} صنف وارد</td>
                                                <td className="px-8 py-5 font-black text-indigo-600">{formatUsd(p.total_amount)}</td>
                                                <td className="px-8 py-5">
                                                    <span className="px-2.5 py-1 rounded-xl text-[9px] font-black border tracking-wider bg-rose-50 text-rose-600 border-rose-100 animate-pulse">
                                                        {p.status === 'pending_approval' ? 'بانتظار الموافقة' : 'بانتظار التأكيد'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <button 
                                                        onClick={() => handleConfirmReceipt(p)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[11px] hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                                    >
                                                        <CheckCircle size={14} />
                                                        قبول الفاتورة
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Picker Modal */}
            {pickerState.open && (
                <ProductPickerModal 
                    products={products}
                    onSelect={handleProductSelect}
                    onClose={() => setPickerState({ open: false, index: null })}
                />
            )}

            <InvoiceDetailsModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />

            <PricingModal 
                isOpen={isPricingModalOpen}
                invoice={pricingInvoice}
                onClose={() => { setIsPricingModalOpen(false); setPricingInvoice(null); }}
                onConfirm={handleFinishPricing}
                loading={loading}
            />

            {toast && (
                <div className="fixed bottom-10 left-10 bg-slate-900 border border-slate-800 text-white px-8 py-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-50 animate-in slide-in-from-bottom-10 flex items-center gap-3 ring-1 ring-white/10 backdrop-blur-md bg-opacity-90">
                    <CheckCircle size={20} className="text-emerald-400" />
                    <span className="font-bold text-sm">{toast}</span>
                </div>
            )}
        </div>
    );
};

export default PurchasesPage;