import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../api';
import { 
    ShoppingCart, Layers, Activity, Truck, DollarSign, X, Receipt, Printer,
    Plus, Edit, Trash2, Tag, Search, Package, LogOut, Box, Bell, Clock, RefreshCcw, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { confirmDialog, toastSuccess, toastError } from '../utils/swal';
import { generateSupplierInvoice } from '../utils/invoiceGenerator';
import NotificationCenter from '../components/NotificationCenter';
import echo from '../utils/echo';
import SoundService from '../utils/SoundService';

const SupplierDashboard = () => {
    const { user, onLogout } = useAuth();
    const [shortages, setShortages] = useState([]);
    const [products, setProducts] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [b2bOrders, setB2bOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const fetchData = async () => {
        try {
            const [shortageRes, productsRes, purchasesRes, b2bRes] = await Promise.all([
                api.get('/supplier/shortages'),
                api.get('/supplier/products'),
                api.get('/supplier/purchases'),
                api.get('/supplier/orders')
            ]);
            setShortages(shortageRes.data);
            setProducts(productsRes.data);
            setPurchases(purchasesRes.data);
            setB2bOrders(b2bRes.data);
        } catch (err) {
            console.error("Dashboard fetching failed:", err);
            if (err.response?.status === 401) {
                console.warn("[Supplier] Unauthorized detected.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    // Real-time listener for new B2B Orders
    useEffect(() => {
        if (user && user.role === 'SUPPLIER' && user.supplier?.id) {
            const channelName = `supplier.${user.supplier.id}`;
            console.log(`[Real-time] Joining channel: ${channelName}`);
            
            const channel = echo.private(channelName)
                .listen('.b2b.order_created', (data) => {
                    console.log("[Real-time] New Order Received:", data);
                    SoundService.playSuccess();
                    toastSuccess(`طلب جديد وصل! من متجر: ${data.order.store?.name || 'غير معروف'}`);
                    
                    // Add to state
                    setB2bOrders(prev => [data.order, ...prev]);
                });

            return () => {
                echo.leave(channelName);
            };
        }
    }, [user]);

    // --- ACTIONS ---

    const handleMarkAsProcessing = async (id) => {
        setActionLoading(id);
        try {
            await api.patch(`/supplier/shortages/${id}/processing`);
            toastSuccess('تم تحديث الحالة: جاري التجهيز 🚚');
            setShortages(prev => prev.map(s => s.id === id ? { ...s, status: 'processing' } : s));
        } catch (err) {
            toastError('فشل في تحديث حالة الطلب');
        } finally {
            setActionLoading(null);
        }
    };

    const handleMarkAsSupplied = async (id, productName, suggestedQty) => {
        const { value: formValues } = await Swal.fire({
            title: 'تأكيد عملية التوريد',
            html: `
                <div class="space-y-4 py-4 px-2 text-right" dir="rtl">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">الكمية الموردة</label>
                        <input id="swal-input-qty" type="number" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" value="${suggestedQty}">
                    </div>
                </div>
            `,
            background: '#1e293b',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonText: 'تأكيد التوريد ✨',
            cancelButtonText: 'تراجع',
            preConfirm: () => {
                const qty = document.getElementById('swal-input-qty').value;
                if (!qty || qty <= 0) {
                    Swal.showValidationMessage('يرجى إدخال كمية صحيحة');
                    return false;
                }
                return { supplied_quantity: qty };
            }
        });

        if (!formValues) return;

        setActionLoading(id);
        try {
            await api.patch(`/supplier/shortages/${id}/supplied`, formValues);
            toastSuccess('تم التوريد بنجاح! ✨');
            setShortages(prev => prev.filter(s => s.id !== id));
            fetchData();
        } catch (err) {
            toastError('فشل في التوريد');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddProduct = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة منتج عالمي جديد',
            html: `
                <div class="space-y-4 py-4 px-2 text-right" dir="rtl">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">السعر ($)</label>
                            <input id="swal-prod-usd" type="number" step="0.01" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" placeholder="0.00">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">السعر (ل.س)</label>
                            <input id="swal-prod-syr" type="number" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" placeholder="0">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">اسم المنتج</label>
                        <input id="swal-prod-name" type="text" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" placeholder="مثلاً: زيت زيتون أصلي">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">صورة المنتج</label>
                        <input id="swal-prod-image" type="file" accept="image/*" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-slate-400 font-bold focus:border-indigo-500 transition-all">
                    </div>
                </div>
            `,
            background: '#1e293b',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonText: 'إضافة ونشر الآن 🚀',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-prod-name').value;
                const usd = document.getElementById('swal-prod-usd').value;
                const syr = document.getElementById('swal-prod-syr').value;
                const image = document.getElementById('swal-prod-image').files[0];
                if (!name) return false;
                return { name, price_usd: usd, price_syr: syr, image };
            }
        });

        if (!formValues) return;

        const formData = new FormData();
        formData.append('name', formValues.name);
        formData.append('price_usd', formValues.price_usd);
        formData.append('price_syr', formValues.price_syr);
        if (formValues.image) formData.append('image', formValues.image);

        setLoading(true);
        try {
            const res = await api.post('/supplier/products', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toastSuccess('تمت الإضافة بنجاح! 🎊');
            setProducts(prev => [res.data.product, ...prev]);
        } catch (err) {
            toastError('فشل في الإضافة');
        } finally {
            setLoading(false);
        }
    };

    const handleEditProduct = async (product) => {
        const { value: formValues } = await Swal.fire({
            title: 'تعديل السعر',
            html: `
                <div class="space-y-4 py-4 px-2 text-right" dir="rtl">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">السعر ($)</label>
                            <input id="swal-edit-usd" type="number" step="0.01" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" value="${product.price_usd || ''}">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">السعر (ل.س)</label>
                            <input id="swal-edit-syr" type="number" class="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white font-black focus:border-indigo-500 transition-all" value="${product.price_syr || ''}">
                        </div>
                    </div>
                </div>
            `,
            background: '#1e293b',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonText: 'تحديث السعر ✨',
            cancelButtonText: 'تراجع',
            preConfirm: () => {
                const usd = document.getElementById('swal-edit-usd').value;
                const syr = document.getElementById('swal-edit-syr').value;
                return { price_usd: usd, price_syr: syr, name: product.name };
            }
        });

        if (!formValues) return;

        try {
            await api.put(`/supplier/products/${product.id}`, formValues);
            toastSuccess('تم التحديث');
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...formValues } : p));
        } catch (err) {
            toastError('فشل التحديث');
        }
    };

    const handleDeleteProduct = async (id) => {
        const result = await confirmDialog('حذف منتج', 'هل أنت متأكد من نقل هذا المنتج للأرشيف؟ لن يظهر للمتاجر بعد الآن ولكن سيبقى في سجلاتك.', 'warning');
        if (!result.isConfirmed) return;

        try {
            await api.delete(`/supplier/products/${id}`);
            toastSuccess('تم نقل المنتج للأرشيف بنجاح 📦');
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            toastError('فشل في حذف المنتج');
        }
    };

    const handleUpdateOrderStatus = async (id, newStatus) => {
        setActionLoading(id);
        try {
            const res = await api.patch(`/supplier/orders/${id}/status`, { status: newStatus });
            toastSuccess('تم تحديث حالة الطلب بنجاح ✨');
            setB2bOrders(prev => prev.map(o => o.id === id ? res.data.order : o));
        } catch (err) {
            toastError('فشل في تحديث حالة الطلب');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">جاري التحميل...</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20" dir="rtl">
            <header className="bg-white border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">لوحة تحكم المورد</h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Direct B2B Hub</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationCenter />
                    <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs font-black text-slate-800">{user?.name}</p>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase px-2 py-0.5 bg-emerald-50 rounded-lg">المورد المعتمد</p>
                        </div>
                        <button onClick={onLogout} className="w-10 h-10 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center justify-center">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <ShoppingCart size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">طلبات النواقص</p>
                            <h3 className="text-2xl font-black text-slate-800">{shortages.length} طلب</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Box size={28} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي منتجاتي</p>
                            <h3 className="text-2xl font-black text-slate-800">{products.length} صنف</h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Bell size={24} className="text-rose-500" /> النواقص العاجلة
                        </h2>
                        <div className="grid gap-5">
                            {shortages.map(req => (
                                <div key={req.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                                            <ShoppingCart size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800">{req.product?.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{req.store?.name}</p>
                                                <span className="text-[10px] text-slate-300 font-black">|</span>
                                                <p className="text-[10px] text-slate-400 font-black">المورد: {req.supplier?.name || user?.name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <span className="text-2xl font-black text-rose-600">{req.min_quantity - req.current_stock}</span>
                                            <p className="text-[9px] text-slate-400 font-black">مطلوب</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {req.status !== 'processing' && (
                                                <button onClick={() => handleMarkAsProcessing(req.id)} className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={18} /></button>
                                            )}
                                            <button onClick={() => handleMarkAsSupplied(req.id, req.product?.name, req.min_quantity - req.current_stock)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-sm">تم التوريد</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* --- NEW: B2B DIRECT ORDERS SECTION --- */}
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mt-12">
                            <Truck size={24} className="text-blue-500" /> طلبات الشراء المباشرة (B2B)
                        </h2>
                        <div className="grid gap-5">
                            {b2bOrders.length === 0 ? (
                                <div className="bg-white p-10 rounded-[32px] border border-dashed border-slate-200 text-center text-slate-400 font-bold">
                                    لا توجد طلبات شراء مباشرة حالياً
                                </div>
                            ) : b2bOrders.map(order => (
                                <div key={order.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 overflow-hidden border border-blue-100">
                                            {order.product?.image_url ? <img src={order.product.image_url} className="w-full h-full object-cover" /> : <Package size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800">{order.product?.name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 italic">{order.store?.name}</p>
                                                <span className="text-[10px] text-slate-300 font-black">|</span>
                                                <p className="text-[10px] text-slate-400 font-black italic">الحالة: 
                                                    <span className={`mr-1 ${order.status === 'pending' ? 'text-amber-500' : order.status === 'processing' ? 'text-blue-500' : 'text-emerald-500'}`}>
                                                        {order.status === 'pending' ? 'انتظار' : order.status === 'processing' ? 'تجهيز' : order.status === 'shipped' ? 'مشحون' : 'مكتمل'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <span className="text-2xl font-black text-blue-600">{order.quantity}</span>
                                            <p className="text-[9px] text-slate-400 font-black">الكمية</p>
                                        </div>
                                        <div className="flex gap-2">
                                            {order.status === 'pending' && (
                                                <button onClick={() => handleUpdateOrderStatus(order.id, 'processing')} className="px-5 py-3 bg-amber-500 text-white rounded-xl font-black text-xs hover:bg-amber-600 transition-colors">بدء التجهيز</button>
                                            )}
                                            {(order.status === 'processing' || order.status === 'pending') && (
                                                <button onClick={() => handleUpdateOrderStatus(order.id, 'shipped')} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-colors flex items-center gap-2">
                                                    <Truck size={14} /> تم الشحن
                                                </button>
                                            )}
                                            {order.status === 'shipped' && (
                                                <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-colors">تسليم النهائي</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-800">إدارة منتجاتي</h2>
                            <button onClick={handleAddProduct} className="p-2 bg-indigo-600 text-white rounded-xl"><Plus size={20} /></button>
                        </div>
                        <div className="grid gap-4">
                            {products.map(p => (
                                <div key={p.id} className="bg-white p-4 rounded-3xl border border-slate-50 shadow-sm flex items-center gap-4 group">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border">
                                        {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Package className="text-slate-300" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{p.name}</h4>
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{p.store?.name || 'مخزن مركزي'}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">${p.price_usd}</span>
                                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">{Number(p.price_syr).toLocaleString()} ل.س</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={() => handleEditProduct(p)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SupplierDashboard;
