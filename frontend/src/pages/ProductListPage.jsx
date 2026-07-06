import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import api from '../api';
import { 
    Package, Search, Plus, Edit2, Trash2, 
    BarChart2, Tag, RefreshCw, AlertCircle, ShoppingCart, Upload, FileCheck, X, Loader2
} from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import { confirmDialog, toastSuccess, toastError } from '../utils/swal';
import echo from '../utils/echo';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const formatUsd   = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

/* ─── Import Modal ────────────────────────── */
const ImportModal = ({ onClose, onImported }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/import/products', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onImported();
        } catch (e) {
            setError(e.response?.data?.message || 'فشل الاستيراد. تأكد من تنسيق الملف.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800">استيراد المنتجات (CSV)</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                </div>
                {error && <div className="p-3 mb-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100">{error}</div>}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-400 transition-all cursor-pointer relative bg-slate-50">
                    <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">{file ? file.name : "اسحب ملف CSV هنا أو انقر للاختيار"}</p>
                    <p className="text-[10px] text-slate-400 mt-1">التنسيق: الاسم، الباركود، السعر، الكمية، التصنيف، الوصف</p>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={handleImport} disabled={!file || loading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />} استيراد الآن
                    </button>
                    <button onClick={onClose} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">إلغاء</button>
                </div>
            </div>
        </div>
    );
};

const ProductListPage = () => {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const [products, setProducts]     = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading]       = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showImport, setShowImport] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchProducts(1, debouncedSearch);
        }
    }, [debouncedSearch, isAuthenticated, authLoading]);

    // Real-time Echo Integration
    useEffect(() => {
        if (!user?.store_id) return;

        const channel = echo.channel(`store.${user.store_id}`)
            .listen('.inventory.updated', () => {
                console.log('[Echo] Inventory updated, re-fetching products...');
                fetchProducts(pagination?.current_page || 1, debouncedSearch);
            });

        return () => {
            echo.leaveChannel(`store.${user.store_id}`);
        };
    }, [user, pagination?.current_page, debouncedSearch]);

    const fetchProducts = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/products?page=${page}&search=${search}`);
            setProducts(res.data.data);
            setPagination(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await confirmDialog('حذف المنتج', 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.', 'warning');
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/products/${id}`);
            toastSuccess('تم حذف المنتج بنجاح');
            fetchProducts(pagination?.current_page || 1, debouncedSearch);
        } catch (err) {
            toastError('خطأ أثناء الحذف');
        }
    };

    // Footer totals for current page
    const footerTotals = products.reduce((acc, p) => ({
        qty:       acc.qty       + (p.stock_quantity || 0),
    }), { qty: 0 });

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header for Inventory */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-6 flex flex-col xl:flex-row justify-between items-center gap-6 transition-all hover:shadow-slate-300/50">
                    <div className="flex items-center gap-6 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                            <Package size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">قائمة المنتجات</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <Tag size={14} className="text-indigo-500" />
                                إدارة المخزون، الأسعار والباركود في مكان واحد
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-96">
                            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="ابحث بالاسم، الباركود، أو التصنيف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border-2 border-transparent focus:border-indigo-400 rounded-2xl py-3 pr-12 pl-4 text-sm font-extrabold shadow-sm outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setShowImport(true)}
                                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-black text-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95"
                            >
                                <Upload size={18} className="text-indigo-500" /> استيراد (CSV)
                            </button>
                            <NavLink 
                                to="add" 
                                className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-sm shadow-xl shadow-blue-200 hover:from-indigo-700 hover:to-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Plus size={20} /> إضافة منتج
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-8 pt-4">
                {/* Table wrapper with sticky header/footer and internal scroll */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>

                    {products.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 flex-1">
                            <Package size={64} className="mb-4 opacity-20" />
                            <p className="font-medium text-slate-400">لا توجد منتجات مطابقة</p>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="overflow-x-auto flex-1 overflow-y-auto">
                                <table className="w-full text-sm text-right min-w-[1000px]">
                                    {/* Sticky Header */}
                                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 w-16 text-center">الصورة</th>
                                            <th className="px-6 py-4">المنتج</th>
                                            <th className="px-6 py-4">الباركود</th>
                                            <th className="px-6 py-4 text-center">التصنيف</th>
                                            <th className="px-6 py-4 text-center">السعر</th>
                                            <th className="px-6 py-4 text-center">المخزون</th>
                                            <th className="px-6 py-4 text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {products.map(p => (
                                            <tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${p.stock_quantity <= 5 ? 'bg-rose-50/50' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm mx-auto bg-slate-50 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package size={20} className="text-slate-300" />
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors relative">
                                                            <Package size={20} />
                                                            {p.stock_quantity <= 5 && (
                                                                <div className="absolute -top-1 -right-1 bg-rose-500 text-white p-0.5 rounded-full ring-2 ring-white">
                                                                    <AlertCircle size={10} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-slate-700">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                    {p.barcode || <span className="text-slate-300 italic">بدون</span>}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                                                        {p.category?.name || 'عام'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                        {formatPrice(p.price)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        p.stock_quantity <= 0 ? 'bg-rose-100 text-rose-600' :
                                                        p.stock_quantity <= 5 ? 'bg-amber-100 text-amber-600' :
                                                        'bg-emerald-100 text-emerald-600'
                                                    }`}>
                                                        {p.stock_quantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <NavLink 
                                                            to={`edit/${p.id}`}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </NavLink>
                                                        <button 
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                    {/* Feature 6: Sticky Footer with totals */}
                                    <tfoot className="sticky bottom-0 z-10 bg-blue-50 border-t-2 border-blue-200">
                                        <tr>
                                            <td colSpan={4} className="px-6 py-3">
                                                <span className="text-xs font-bold text-blue-700">
                                                    إجمالي الصفحة الحالية ({products.length} صنف)
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className="text-sm font-black text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">{footerTotals.qty}</span>
                                                <p className="text-[10px] text-slate-400 mt-0.5">إجمالي الكميات</p>
                                            </td>
                                            <td className="px-6 py-3"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {!loading && pagination && (
                                <div className="shrink-0 border-t border-slate-200">
                                    <Pagination 
                                        pagination={pagination} 
                                        onPageChange={(page) => fetchProducts(page, debouncedSearch)} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showImport && <ImportModal onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); toastSuccess('تم استيراد البيانات بنجاح'); fetchProducts(1, debouncedSearch); }} />}
        </div>
    );
};

export default ProductListPage;
