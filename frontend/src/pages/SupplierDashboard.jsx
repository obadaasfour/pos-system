import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api';
import { 
    ShoppingCart, Layers, Activity, Truck, DollarSign, X, Receipt, Printer,
    Plus, Edit, Trash2, Tag, Search, Package, LogOut, Box, Bell, Clock, RefreshCcw, CheckCircle, Store, Zap, Globe, BarChart3
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toastSuccess, toastError } from '../utils/swal';
import echo from '../utils/echo';
import SoundService from '../utils/SoundService';

const SupplierDashboard = () => {
    const { user, onLogout } = useAuth();
    const [view, setView] = useState('stores'); // 'stores', 'products', 'shortages'
    const [selectedStore, setSelectedStore] = useState(null);
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);
    const [shortages, setShortages] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newOrdersBadge, setNewOrdersBadge] = useState(0);


    const fetchStores = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/supplier/stores`);
            setStores(res.data);
        } catch (err) {
            toastError('فشل جلب قائمة المتاجر');
        } finally {
            setLoading(false);
        }
    }, []);


    const fetchOrders = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/supplier/orders`);
            setOrders(res.data);
            
            // Calculate initial badge (orders with status ordered or pending)
            const activeCount = res.data.filter(o => ['ordered', 'pending'].includes(o.status)).length;
            setNewOrdersBadge(activeCount);
            
            setView('orders');
        } catch (err) {
            toastError('فشل جلب الطلبات الواردة');
        } finally {
            setLoading(false);
        }
    }, []);


    const handleUpdateOrderStatus = async (orderId, newStatus) => {
        try {
            await api.patch(`/supplier/orders/${orderId}/status`, { status: newStatus });
            toastSuccess('تم تحديث حالة الطلب بنجاح');
            
            // Update orders local state and badge
            setOrders(prev => {
                const updated = prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
                const activeCount = updated.filter(o => ['ordered', 'pending'].includes(o.status)).length;
                setNewOrdersBadge(activeCount);
                return updated;
            });
        } catch (err) {
            toastError('فشل تحديث حالة الطلب');
        }
    };


    const fetchStoreProducts = async (store) => {
        if (!store?.id) return;
        setLoading(true);
        setSelectedStore(store);
        try {
            const res = await api.get(`/supplier/stores/${store.id}/products`);
            setProducts(res.data);
            setView('products');
        } catch (err) {
            toastError('فشل جلب منتجات المتجر');
        } finally {
            setLoading(false);
        }
    };


    const fetchShortages = React.useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/supplier/shortages`);
            setShortages(res.data);
            setView('shortages');
        } catch (err) {
            toastError('فشل جلب النواقص');
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        if (user) {
            fetchStores();
            // Initial fetch to set the badge count
            api.get(`/supplier/orders`).then(res => {
                const activeCount = res.data.filter(o => ['ordered', 'pending'].includes(o.status)).length;
                setNewOrdersBadge(activeCount);
            }).catch(err => console.error("Failed to fetch initial orders count", err));
        }
    }, [user, fetchStores]);

    useEffect(() => {
        if (!user?.supplier?.id) return;

        const channelName = `supplier.${user.supplier.id}`;
        console.log(`[SupplierDashboard] Listening on private channel: ${channelName}`);

        const channel = echo.private(channelName)
            .listen('.b2b.order_created', (e) => {
                console.log('[SupplierDashboard] New Order Received:', e);
                setOrders(prev => [e.order, ...prev]);
                
                // Increment badge only if it's ordered or pending
                if (['ordered', 'pending'].includes(e.order.status)) {
                    setNewOrdersBadge(prev => prev + 1);
                }
                
                SoundService.playSuccess();
                Swal.fire({
                    title: 'طلب جديد! 📦',
                    text: `وصلك طلب جديد من متجر ${e.order.store?.name || ''}`,
                    icon: 'info',
                    toast: true,
                    position: 'top-left',
                    timer: 5000,
                    showConfirmButton: false
                });
            });

        return () => {
            echo.leave(channelName);
        };
    }, [user]);


    const handleSuggestProduct = async () => {
        // Build the store list as checkboxes
        const storeCheckboxes = stores.map(s => `
            <label class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 group">
                <input type="checkbox" name="target_store" value="${s.id}" class="store-checkbox w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500">
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-slate-700 group-hover:text-blue-700 transition-colors">${s.name}</span>
                    <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">${s.slug}</span>
                </div>
            </label>
        `).join('');

        const { value: formValues } = await Swal.fire({
            title: 'اقتراح منتج جديد للمنظومة',
            html: `
                <div class="space-y-5 py-6 px-4 text-right" dir="rtl">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 mb-2 mr-2 uppercase tracking-widest">اسم المنتج</label>
                            <input id="swal-sug-name" type="text" class="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="مثلاً: صنف جديد">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 mb-2 mr-2 uppercase tracking-widest">التكلفة للمتجر (USD)</label>
                            <input id="swal-sug-price" type="number" step="0.01" class="w-full px-5 py-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="0.00">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 mb-3 mr-2 uppercase tracking-widest">تحديد المتاجر المستهدفة</label>
                        
                        <div class="bg-slate-50 border border-slate-200 rounded-[2rem] p-5 shadow-inner">
                            <div class="flex items-center gap-3 p-3 border-b border-slate-200 mb-3 group">
                                <input type="checkbox" id="select-all-stores" class="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600" onchange="document.querySelectorAll('.store-checkbox').forEach(cb =\> cb.checked = this.checked)">
                                <label for="select-all-stores" class="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer select-none flex-1">تحديد جميع المتاجر</label>
                            </div>
                            
                            <div class="max-h-56 overflow-y-auto elegant-scrollbar space-y-1.5 px-1 pr-2">
                                ${storeCheckboxes}
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-400 mt-3 mr-4 font-bold italic">* سيتم عرض هذا الاقتراح فقط للمتاجر المختارة أعلاه.</p>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 mb-2 mr-2 uppercase tracking-widest">الوصف التفصيلي</label>
                        <textarea id="swal-sug-desc" class="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all h-24" placeholder="اكتب تفاصيل المنتج..."></textarea>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                        <label class="block text-[10px] font-black text-slate-400 mb-2 mr-2 uppercase tracking-widest">صورة المنتج</label>
                        <input id="swal-sug-image" type="file" accept="image/*" class="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-900 file:text-white hover:file:bg-blue-600 transition-all">
                    </div>
                </div>
            `,
            background: '#ffffff',
            showCancelButton: true,
            confirmButtonText: 'إرسال الاقتراح 🚀',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#0f172a',
            customClass: {
                popup: 'rounded-[3rem] shadow-2xl',
                confirmButton: 'rounded-2xl px-10 py-4 font-black text-sm',
                cancelButton: 'rounded-2xl px-10 py-4 font-black text-sm'
            },
            preConfirm: () => {
                const name = document.getElementById('swal-sug-name').value;
                const price = document.getElementById('swal-sug-price').value;
                const desc = document.getElementById('swal-sug-desc').value;
                const isTargetAll = document.getElementById('select-all-stores').checked;
                const selectedStores = Array.from(document.querySelectorAll('.store-checkbox:checked')).map(cb => cb.value);
                const image = document.getElementById('swal-sug-image').files[0];

                if (!name || !price) {
                    Swal.showValidationMessage('يرجى إدخال الاسم والسعر');
                    return false;
                }
                if (!isTargetAll && selectedStores.length === 0) {
                    Swal.showValidationMessage('يرجى اختيار متجر واحد على الأقل أو تحديد الكل');
                    return false;
                }

                return { 
                    name, 
                    price_usd: price, 
                    description: desc, 
                    image, 
                    target_all: isTargetAll,
                    target_store_ids: !isTargetAll ? selectedStores : []
                };
            }
        });

        if (!formValues) return;

        const formData = new FormData();
        formData.append('name', formValues.name);
        formData.append('price_usd', formValues.price_usd);
        formData.append('description', formValues.description);
        formData.append('target_all', formValues.target_all ? 1 : 0);
        formValues.target_store_ids.forEach(id => formData.append('target_store_ids[]', id));
        if (formValues.image) formData.append('image', formValues.image);

        setSubmitting(true);
        try {
            await api.post(`/supplier/suggest`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toastSuccess('تم إرسال الاقتراح للمتاجر المستهدفة بنجاح! ✨');
        } catch (err) {
            toastError('فشل إرسال الاقتراح');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !stores.length) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <RefreshCcw size={40} className="animate-spin text-blue-500" />
        </div>;
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans selection:bg-blue-100" dir="rtl">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 px-8 py-5 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div 
                        className="w-11 h-11 bg-gradient-to-tr from-blue-700 to-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => { setView('stores'); setSelectedStore(null); }}
                    >
                        <Truck size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight leading-tight">بوابة المورد</h1>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] leading-none mt-1">Supplier Portal Hub</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSuggestProduct} 
                        className="hidden md:flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98]"
                    >
                        <Zap size={18} fill="currentColor" /> 
                        <span>اقتراح منتج</span>
                    </button>
                    <div className="w-[1px] h-8 bg-slate-100 mx-2" />
                    <button onClick={onLogout} className="w-11 h-11 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all flex items-center justify-center border border-slate-100">
                        <LogOut size={22} />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-10">
                
                {/* View Switcher Tabs (Pills Style) */}
                <div className="flex gap-3 mb-12 bg-white/50 backdrop-blur-sm p-2 rounded-[2.5rem] w-fit border border-white shadow-sm">
                    <button 
                        onClick={() => setView('stores')} 
                        className={`px-10 py-3.5 rounded-[2rem] font-bold text-sm transition-all duration-300 ${view === 'stores' ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                    >
                        المتاجر
                    </button>
                    <button 
                        onClick={fetchOrders} 
                        className={`px-10 py-3.5 rounded-[2rem] font-bold text-sm transition-all duration-300 relative ${view === 'orders' ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                    >
                        الطلبات الواردة
                        {newOrdersBadge > 0 && (
                            <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-lg font-black">
                                {newOrdersBadge}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={fetchShortages} 
                        className={`px-10 py-3.5 rounded-[2rem] font-bold text-sm transition-all duration-300 ${view === 'shortages' ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                    >
                        النواقص العاجلة
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                        <RefreshCcw size={48} className="animate-spin mb-4 text-blue-400" />
                        <p className="font-bold text-slate-400">جاري تحديث البيانات...</p>
                    </div>
                ) : (
                    <>
                        {/* VIEW 1: STORES GRID */}
                        {view === 'stores' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                {stores.map(store => (
                                    <div 
                                        key={store.id} 
                                        onClick={() => fetchStoreProducts(store)}
                                        className="group bg-white p-8 rounded-2xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                        
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:from-blue-600 group-hover:to-blue-400 group-hover:text-white transition-all duration-500 shadow-inner">
                                            <Store size={32} />
                                        </div>
                                        
                                        <h3 className="text-xl font-bold text-slate-800 mb-2">{store.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{store.slug}</p>
                                        
                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">استعراض المنتجات</span>
                                            <div className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                                <RefreshCcw size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* VIEW 2: STORE PRODUCTS (SECURE) */}
                        {view === 'products' && (
                            <div className="animate-in fade-in slide-in-from-left-8 duration-700">
                                <div className="flex items-center gap-6 mb-12">
                                    <button onClick={() => setView('stores')} className="p-4 bg-white border border-white rounded-2xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all shadow-sm">
                                        <RefreshCcw size={22} />
                                    </button>
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-800">منتجات {selectedStore?.name}</h2>
                                        <div className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            تشفير الأسعار نشط 🔒
                                        </div>
                                    </div>

                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                                    {products.length === 0 ? (
                                        <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
                                            <Box size={60} className="mx-auto mb-6 text-slate-200" />
                                            <p className="font-black text-slate-400 text-lg">لا توجد منتجات مسجلة في هذا المتجر</p>
                                        </div>
                                    ) : products.map(product => (
                                        <div key={product.id} className="bg-white p-6 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/40 flex flex-col items-center text-center group hover:-translate-y-1 transition-all duration-300">
                                            <div className="w-full aspect-square bg-slate-50 rounded-[2rem] mb-6 overflow-hidden border border-slate-50 flex items-center justify-center relative group-hover:shadow-inner">
                                                {product.image_url ? (
                                                    <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                ) : (
                                                    <Package size={48} className="text-slate-200 group-hover:text-blue-100 transition-colors" />
                                                )}
                                                <div className="absolute top-4 right-4">
                                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg ${product.stock_quantity > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {product.stock_quantity > 0 ? `مخزون: ${product.stock_quantity}` : 'غير متوفر'}
                                                    </div>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-base leading-tight mb-2 h-10 line-clamp-2">{product.name}</h4>
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">{product.category?.name || 'عام'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* VIEW 4: INCOMING ORDERS */}
                        {view === 'orders' && (
                            <div className="animate-in fade-in slide-in-from-right-8 duration-700 space-y-6">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-3xl font-black text-slate-800">الطلبات الواردة من المتاجر</h2>
                                    <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100">
                                        إجمالي الطلبات: {orders.length}
                                    </span>
                                </div>

                                {orders.length === 0 ? (
                                    <div className="bg-white p-20 rounded-[4rem] border border-dashed border-slate-200 text-center shadow-xl shadow-slate-100">
                                        <ShoppingCart size={80} className="mx-auto mb-8 text-slate-200" />
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">لا توجد طلبات جديدة</h3>
                                        <p className="font-bold text-slate-400">ستظهر الطلبات هنا بمجرد قيام المتاجر بطلب منتجاتك المقترحة.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6">
                                        {orders.map(order => (
                                            <div key={order.id} className="bg-white p-8 rounded-[3rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row justify-between items-center gap-8 group hover:shadow-2xl transition-all duration-500">
                                                <div className="flex items-center gap-8 flex-1">
                                                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 relative shadow-inner overflow-hidden">
                                                        {(order.product?.image_url || order.suggestion?.image_url) ? (
                                                            <img 
                                                                src={order.product?.image_url || order.suggestion?.image_url} 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        ) : (
                                                            <Package size={36} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black text-slate-800 leading-tight mb-2">
                                                            {order.product?.name || order.suggestion?.name}
                                                        </h4>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">
                                                                {order.store?.name}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                الكمية: {order.quantity}
                                                            </span>
                                                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                                                                order.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-600' :
                                                                'bg-emerald-100 text-emerald-600'
                                                            }`}>
                                                                الحالة: {order.status === 'pending' ? 'بانتظار الشحن' : order.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-left">
                                                        <p className="text-2xl font-black text-slate-800 leading-none tracking-tighter">
                                                            $${Number(order.price_at_order_usd || order.suggestion?.price_usd || 0).toFixed(2)}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-[0.2em]">سعر الوحدة</p>
                                                    </div>
                                                    {order.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                                                            className="px-10 py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm hover:bg-slate-900 transition-all shadow-2xl shadow-blue-100 active:scale-95 flex items-center gap-3"
                                                        >
                                                            <Truck size={18} />
                                                            <span>شحن الطلب الآن</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* VIEW 3: SHORTAGES */}
                        {view === 'shortages' && (
                            <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-700">
                                <div className="text-center mb-12">
                                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6 shadow-inner animate-bounce">
                                        <Bell size={40} />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-800">النواقص العاجلة للمنظومة</h2>
                                    <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-sm">تتبع النواقص اللحظي عبر المتاجر</p>
                                </div>

                                {shortages.length === 0 ? (
                                    <div className="bg-white p-20 rounded-[4rem] border border-dashed border-slate-200 text-center shadow-xl shadow-slate-100">
                                        <CheckCircle size={80} className="mx-auto mb-8 text-emerald-400" />
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">النظام مكتمل بالكامل!</h3>
                                        <p className="font-bold text-slate-400">لا توجد نواقص حرجة حالياً في أي متجر.</p>
                                    </div>
                                ) : shortages.map(req => (
                                    <div key={req.id} className="bg-white p-8 rounded-[3rem] border border-white shadow-xl shadow-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-8 group hover:shadow-2xl transition-all duration-500">
                                        <div className="flex items-center gap-8 flex-1">
                                            <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300 relative shadow-inner">
                                                <Package size={36} />
                                                <span className="absolute -top-1 -right-1 w-7 h-7 bg-rose-600 text-white text-[11px] font-black flex items-center justify-center rounded-full border-4 border-white shadow-xl">!</span>
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-slate-800 leading-tight mb-2">{req.product?.name}</h4>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">{req.store?.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">المخزون الحالي: {req.current_stock}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-12 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-50">
                                            <div className="text-center">
                                                <p className="text-4xl font-black text-rose-600 leading-none tracking-tighter">{req.min_quantity - req.current_stock}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-[0.2em]">الكمية العاجلة</p>
                                            </div>
                                            <button className="px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-bold text-sm hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-95">تجهيز الطلب</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Mobile Bottom Navigation (Pulse Effect Button) */}
            <div className="md:hidden fixed bottom-8 inset-x-8 z-50">
                <button
                    onClick={handleSuggestProduct}
                    className="w-full bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-[2rem] p-6 flex items-center justify-between shadow-2xl shadow-blue-200 ring-8 ring-white active:scale-95 transition-all overflow-hidden relative group"
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 animate-pulse group-active:opacity-100" />
                    <span className="font-black text-sm relative z-10">اقتراح منتج جديد</span>
                    <Zap size={24} className="relative z-10" fill="currentColor" />
                </button>
            </div>
        </div>
    );
};

export default SupplierDashboard;
