import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { 
    Package, MapPin, Phone, 
    Search, ShoppingBag, Info,
    Tag, Star, ChevronRight, Zap,
    X, Plus, Minus, Check, Loader2,
    ShoppingCart, Trash2, User, Table
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toastSuccess, toastError, confirmDialog } from '../utils/swal';

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
        // Success haptic/sound could go here
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

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const total = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const handleSubmitOrder = async () => {
        if (!customerInfo.name.trim()) {
            return toastError('يرجى إدخال اسمك أو رقم الطاولة');
        }

        try {
            setSubmitting(true);
            const orderData = {
                customer_name_or_table: customerInfo.name,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                total_amount: total
            };

            await api.post(`/${slug}/pending-orders`, orderData);
            
            toastSuccess('تم إرسال طلبك بنجاح! سيقوم الكاشير بمعالجته قريباً.');
            setCart([]);
            setIsCartOpen(false);
            setCustomerInfo({ name: '' });
        } catch (err) {
            console.error(err);
            toastError(err.response?.data?.message || 'فشل إرسال الطلب، يرجى المحاولة لاحقاً');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
            />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center" dir="rtl">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-6">
                <Info size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">عذراً، حدث خطأ</h1>
            <p className="text-slate-500 mb-8">{error}</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
            >
                إعادة المحاولة
            </button>
        </div>
    );

    const categories = ['الكل', ...new Set(data.products.map(p => p.category?.name || 'عام'))];
    
    const filteredProducts = data.products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = selectedCategory === 'الكل' || (p.category?.name || 'عام') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32" dir="rtl">
            {/* Header / Brand */}
            <header className="relative bg-white pt-12 pb-10 px-6 rounded-b-[50px] shadow-sm border-b border-slate-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
                    <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] shadow-2xl flex items-center justify-center transform -rotate-6 transition-transform hover:rotate-0 duration-500">
                        <Zap size={56} className="text-white" />
                    </div>
                    <div className="text-center md:text-right flex-1">
                        <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">{data.store.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-slate-400 font-bold">
                            {data.store.address && (
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                    <MapPin size={16} className="text-blue-500" />
                                    <span>{data.store.address}</span>
                                </div>
                            )}
                            {data.store.phone && (
                                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                                    <Phone size={16} className="text-emerald-500" />
                                    <span>{data.store.phone}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl border border-blue-100">
                                <Tag size={16} />
                                <span>{data.exchange_rate.toLocaleString()} ل.س / $</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Search & Categories */}
            <section className="max-w-5xl mx-auto px-6 -mt-8">
                <div className="bg-white rounded-[2.5rem] shadow-2xl p-5 md:p-8 border border-white">
                    <div className="relative mb-8">
                        <Search size={22} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                            type="text"
                            placeholder="ابحث عن وجبتك المفضلة..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-3xl py-5 pr-14 pl-6 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-400 focus:bg-white outline-none transition-all font-bold text-slate-700 shadow-inner"
                        />
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`
                                    whitespace-nowrap px-8 py-3 rounded-2xl text-sm font-black transition-all border-2
                                    ${selectedCategory === cat 
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300 hover:text-slate-600'}
                                `}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* Product Grid */}
            <main className="max-w-5xl mx-auto px-6 mt-16">
                <div className="space-y-16">
                    {categories.filter(c => c !== 'الكل').map(category => {
                        const categoryProducts = filteredProducts.filter(p => (p.category?.name || 'عام') === category);
                        if (categoryProducts.length === 0) return null;

                        return (
                            <div key={category} className="space-y-8">
                                <div className="flex items-center gap-6">
                                    <h2 className="text-3xl font-black text-slate-800 whitespace-nowrap">{category}</h2>
                                    <div className="h-[3px] bg-slate-200 flex-1 rounded-full opacity-50" />
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-8">
                                    <AnimatePresence mode="popLayout">
                                        {categoryProducts.map((p, idx) => {
                                            const priceSyr = Number(p.price);
                                            const priceUsd = Number(p.price_usd);
                                            const inCart = cart.find(item => item.id === p.id);

                                            return (
                                                <motion.div
                                                    key={p.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                    className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col"
                                                >
                                                    <div className="aspect-square bg-slate-50 relative overflow-hidden shrink-0">
                                                        {p.image_url ? (
                                                            <img 
                                                                src={p.image_url} 
                                                                alt={p.name} 
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-200 group-hover:scale-110 transition-transform duration-700">
                                                                <Package size={64} className="opacity-10" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        
                                                        {p.is_new_price && (
                                                            <div className="absolute top-4 left-4 bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg transform -rotate-12">
                                                                سعر جديد
                                                            </div>
                                                        )}

                                                        <button 
                                                            onClick={() => addToCart(p)}
                                                            className="absolute bottom-4 left-4 w-12 h-12 bg-white text-blue-600 rounded-2xl shadow-xl flex items-center justify-center transform translate-y-20 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-600 hover:text-white active:scale-90"
                                                        >
                                                            <Plus size={24} />
                                                        </button>
                                                    </div>

                                                    <div className="p-6 flex-1 flex flex-col">
                                                        <h3 className="text-sm font-black text-slate-800 mb-4 line-clamp-2 min-h-[40px] leading-relaxed group-hover:text-blue-600 transition-colors">
                                                            {p.name}
                                                        </h3>
                                                        <div className="mt-auto flex justify-between items-end">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-xl font-black text-slate-900 tracking-tight">
                                                                        {priceSyr.toLocaleString()}
                                                                    </span>
                                                                    <small className="text-[10px] font-bold text-slate-400">ل.س</small>
                                                                </div>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-sm font-bold text-emerald-500/80 tracking-tight">
                                                                        {priceUsd.toFixed(2)}
                                                                    </span>
                                                                    <small className="text-[9px] font-bold text-emerald-500/50 mr-0.5">$</small>
                                                                </div>
                                                            </div>
                                                            {inCart && (
                                                                <div className="bg-blue-50 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black animate-in zoom-in">
                                                                    {inCart.quantity}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>
						);
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100 border-dashed">
                        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} />
                        </div>
                        <p className="text-slate-400 font-bold">لم يتم العثور على منتجات تطابق البحث</p>
                    </div>
                )}
            </main>

            {/* Floating Cart Button */}
            <AnimatePresence>
                {itemCount > 0 && (
                    <motion.button
                        initial={{ scale: 0, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, y: 100 }}
                        onClick={() => setIsCartOpen(true)}
                        className="fixed bottom-10 left-10 right-10 md:left-auto md:right-10 md:w-auto bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl z-40 flex items-center justify-between gap-6 hover:bg-black transition-all active:scale-95 group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <ShoppingBag size={24} />
                                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900 transform group-hover:scale-125 transition-transform">
                                    {itemCount}
                                </span>
                            </div>
                            <span className="font-black text-sm whitespace-nowrap">عرض سلة الطلبات</span>
                        </div>
                        <div className="h-6 w-[1px] bg-white/20" />
                        <div className="flex items-center gap-1.5">
                            <span className="text-lg font-black">{total.toLocaleString()}</span>
                            <span className="text-[10px] font-bold opacity-50">ل.س</span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Cart Drawer Overlay */}
            <AnimatePresence>
                {isCartOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCartOpen(false)}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[50]"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[40px] z-[60] max-h-[90vh] flex flex-col overflow-hidden"
                            dir="rtl"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-800">سلة طلباتك</h2>
                                        <p className="text-xs text-slate-400 font-bold">{itemCount} أصناف مختارة</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsCartOpen(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 group">
                                        <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-200">
                                                    <Package size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-black text-slate-800 text-sm mb-1">{item.name}</h4>
                                            <p className="text-xs text-blue-600 font-bold">{Number(item.price).toLocaleString()} ل.س</p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
                                            <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                                                <Minus size={14} />
                                            </button>
                                            <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors">
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                ))}

                                <div className="pt-6 space-y-4">
                                    <div className="space-y-4 bg-blue-50/50 p-6 rounded-[2.5rem] border border-blue-50">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                                                <User size={16} />
                                            </div>
                                            <h3 className="font-black text-slate-800 text-sm">معلومات الطلب</h3>
                                        </div>
                                        <div className="relative">
                                            <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="أدخل اسمك أو رقم الطاولة..."
                                                value={customerInfo.name}
                                                onChange={(e) => setCustomerInfo({ name: e.target.value })}
                                                className="w-full bg-white border-2 border-white rounded-2xl py-4 pr-12 pl-6 text-sm font-bold focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-white shrink-0">
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-lg font-black text-slate-400">الإجمالي النهائي</span>
                                    <div className="text-left">
                                        <span className="text-3xl font-black text-slate-900">{total.toLocaleString()}</span>
                                        <span className="text-xs font-bold text-slate-400 mr-2">ل.س</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSubmitOrder}
                                    disabled={submitting || cart.length === 0}
                                    className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none flex items-center justify-center gap-3"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={24} className="animate-spin" />
                                            <span>جاري إرسال الطلب...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={24} />
                                            <span>تأكيد وإرسال الطلب الآن</span>
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-slate-300 font-bold mt-4 uppercase tracking-[2px]">الدفع يتم عند المحاسب بعد استلام الطلب</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="text-center mt-20 text-slate-300 px-6">
                <p className="text-[10px] font-black uppercase tracking-[4px]">Powered by Cash POS</p>
                <p className="text-[10px] font-bold mt-2 opacity-50">جميع الأسعار تشمل الضريبة المضافة إن وُجدت</p>
            </footer>
        </div>
    );
};

export default PublicMenu;
