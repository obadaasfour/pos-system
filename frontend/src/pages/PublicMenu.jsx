import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { 
    Package, MapPin, Phone, 
    Search, ShoppingBag, Info,
    Zap, X, Plus, Minus, 
    Loader2, ShoppingCart, Trash2, 
    User, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastSuccess, toastError } from '../utils/swal';

const PublicMenu = () => {
    const { slug } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('الكل');
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [customerInfo, setCustomerInfo] = useState({ name: '' });

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await api.get(`/${slug}/menu`);
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'المتجر غير متاح حالياً');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, [slug]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return newQty === 0 ? null : { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

    const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSubmitOrder = async () => {
        if (!customerInfo.name.trim()) return toastError('يرجى إدخال اسمك أو رقم الطاولة');
        try {
            setSubmitting(true);
            const orderData = {
                customer_name_or_table: customerInfo.name,
                items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
                total_amount: total
            };
            await api.post(`/${slug}/pending-orders`, orderData);
            toastSuccess('تم إرسال طلبك بنجاح! 🎉');
            setCart([]); setIsCartOpen(false); setCustomerInfo({ name: '' });
        } catch (err) {
            toastError('فشل إرسال الطلب');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;
    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center" dir="rtl">
            <Info size={40} className="text-rose-500 mb-4" />
            <h1 className="text-xl font-bold text-slate-800 mb-2">{error}</h1>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">تحديث الصفحة</button>
        </div>
    );

    const categories = ['الكل', ...new Set(data.products.map(p => p.category?.name || 'عام'))];
    const filteredProducts = data.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'الكل' || (p.category?.name || 'عام') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-24" dir="rtl">
            {/* Compact Sticky Header */}
            <header className="sticky top-0 z-50 bg-white shadow-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
                            <Zap size={18} className="text-white fill-white" />
                        </div>
                        <h1 className="text-base font-black text-slate-900 truncate">{data.store.name}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-400 leading-none">{data.store.address}</span>
                        </div>
                        <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black border border-blue-100">
                            {data.exchange_rate.toLocaleString()} ل.س
                        </div>
                    </div>
                </div>

                {/* Compact Search & Scrollable Categories */}
                <div className="max-w-7xl mx-auto px-4 pb-2 space-y-2">
                    <div className="relative">
                        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text"
                            placeholder="ابحث عن صنف..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-100 border-none rounded-lg py-2 pr-9 pl-3 text-xs outline-none focus:ring-1 focus:ring-blue-400 font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    whitespace-nowrap px-3 py-1 rounded-full text-[11px] font-bold transition-all
                                    ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Product Grid: 2 columns mobile, 5 columns desktop */}
            <main className="max-w-7xl mx-auto px-2 mt-3 sm:px-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredProducts.map((p, idx) => (
                            <motion.div
                                key={p.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ duration: 0.2, delay: idx * 0.01 }}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative group"
                            >
                                <div className="aspect-square bg-slate-50 relative overflow-hidden shrink-0">
                                    {p.image_url ? (
                                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={24} /></div>
                                    )}
                                    <button 
                                        onClick={() => addToCart(p)}
                                        className="absolute bottom-1 left-1 w-7 h-7 bg-blue-600 text-white rounded-lg shadow-md flex items-center justify-center active:scale-90 transition-transform z-10"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="p-2 flex-1 flex flex-col justify-between">
                                    <h3 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{p.name}</h3>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-blue-600">{(Number(p.price)).toLocaleString()} <small className="text-[8px] font-bold text-slate-400">ل.س</small></span>
                                        {Number(p.price_usd) > 0 && <span className="text-[9px] font-bold text-emerald-600">{Number(p.price_usd).toFixed(2)} $</span>}
                                    </div>
                                </div>
                                {cart.find(i => i.id === p.id) && (
                                    <div className="absolute top-1 right-1 bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                                        {cart.find(i => i.id === p.id).quantity}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </main>

            {/* Minimal Floating Cart */}
            <AnimatePresence>
                {itemCount > 0 && (
                    <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="fixed bottom-4 inset-x-4 z-40 flex justify-center">
                        <button onClick={() => setIsCartOpen(true)} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                            <div className="relative">
                                <ShoppingBag size={16} />
                                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">{itemCount}</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider">السلة</span>
                            <div className="w-px h-3 bg-white/20" />
                            <span className="text-xs font-black">{total.toLocaleString()} ل.س</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100]" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="fixed bottom-0 inset-x-0 bg-white rounded-t-2xl z-[110] max-h-[85vh] flex flex-col shadow-2xl" dir="rtl">
                            <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto my-2 shrink-0" />
                            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                                <h2 className="text-sm font-black text-slate-800">مراجعة الطلب</h2>
                                <button onClick={() => setIsCartOpen(false)} className="p-1 text-slate-400"><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-10 h-10 bg-white rounded-lg overflow-hidden shrink-0 border border-slate-100">
                                            {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Package size={16} className="m-auto" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-800 text-[10px] truncate">{item.name}</h4>
                                            <p className="text-[9px] text-blue-600 font-bold">{Number(item.price).toLocaleString()} ل.س</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-400"><Minus size={10} /></button>
                                            <span className="text-[10px] font-bold w-3 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-400"><Plus size={10} /></button>
                                        </div>
                                    </div>
                                ))}
                                <input type="text" placeholder="رقم الطاولة أو الاسم..." value={customerInfo.name} onChange={(e) => setCustomerInfo({ name: e.target.value })} className="w-full bg-slate-100 border-none rounded-lg py-2 px-3 text-[11px] font-bold outline-none" />
                            </div>
                            <div className="p-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-slate-400">الإجمالي</span>
                                    <span className="text-lg font-black text-slate-900">{total.toLocaleString()} <small className="text-[8px]">ل.س</small></span>
                                </div>
                                <button onClick={handleSubmitOrder} disabled={submitting || cart.length === 0} className="w-full bg-blue-600 text-white py-3 rounded-lg font-black text-[12px] shadow-lg shadow-blue-100 active:scale-95 disabled:bg-slate-200 flex items-center justify-center gap-2">
                                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <span>تأكيد الطلب الآن</span>}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicMenu;
