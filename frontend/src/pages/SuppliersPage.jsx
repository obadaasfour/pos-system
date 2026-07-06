import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
    Truck, Plus, Edit2, Trash2, Save, X, RefreshCw, 
    CheckCircle, Phone, Mail, MapPin, Search, Link as LinkIcon, 
    Package, Filter, Loader2, Check
} from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import { confirmDialog, toastSuccess, toastError } from '../utils/swal';

const EMPTY_FORM = { name: '', phone: '', email: '', address: '', enableLogin: false, password: '' };

const SuppliersPage = () => {
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [suppliers, setSuppliers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading,   setLoading]   = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [form,      setForm]      = useState({ ...EMPTY_FORM });
    const [editing,   setEditing]   = useState(null);
    const [showForm,  setShowForm]  = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [linkingSupplier, setLinkingSupplier] = useState(null); // The supplier being linked to
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => { 
        if (isAuthenticated && !authLoading) {
            fetchSuppliers(1, debouncedSearch); 
        }
    }, [debouncedSearch, isAuthenticated, authLoading]);

    const fetchSuppliers = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/suppliers?page=${page}&search=${search}`);
            setSuppliers(res.data.data);
            setPagination(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
    const openEdit = (s) => { 
        setEditing(s.id); 
        setForm({ 
            name: s.name, 
            phone: s.phone || '', 
            email: s.email || '', 
            address: s.address || '',
            enableLogin: !!s.user_id, // If supplier has a user_id, login is technically enabled
            password: '' 
        }); 
        setShowForm(true); 
    };
    const cancelForm = () => { setShowForm(false); setEditing(null); setForm({ ...EMPTY_FORM }); };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/suppliers/${editing}`, form);
                toastSuccess('تم تحديث بيانات المورد بنجاح.');
            } else {
                await api.post('/suppliers', form);
                toastSuccess('تم إضافة المورد بنجاح.');
            }
            cancelForm();
            fetchSuppliers(pagination?.current_page || 1, debouncedSearch);
        } catch (err) {
            toastError(err.response?.data?.message || 'حدث خطأ.');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id, name) => {
        const result = await confirmDialog(`حذف المورد`, `هل أنت متأكد من حذف المورد "${name}"؟`, 'warning');
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/suppliers/${id}`);
            toastSuccess('تم حذف المورد بنجاح.');
            fetchSuppliers(pagination?.current_page || 1, debouncedSearch);
        } catch (err) {
            toastError(err.response?.data?.message || 'حدث خطأ أثناء الحذف.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-slate-300/50">
                    <div className="flex items-center gap-5 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                            <Truck size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة الموردين</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                {suppliers.length} مورد مسجل حالياً
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="ابحث عن مورد بالاسم أو الهاتف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border-2 border-transparent focus:border-blue-400 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold shadow-sm outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <button 
                            onClick={() => fetchSuppliers(pagination?.current_page || 1, debouncedSearch)} 
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:shadow-md transition-all active:scale-95"
                            title="تحديث البيانات"
                        >
                            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {isSuperAdmin && (
                            <button onClick={openAdd}
                                className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                <Plus size={20} /> إضافة مورد
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-8 pt-4 space-y-8">

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center">
                            <h2 className="font-extrabold text-white flex items-center gap-2">
                                <Truck size={18} /> {editing ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                            </h2>
                            <button onClick={cancelForm} className="text-white/70 hover:text-white"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المورد *</label>
                                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                                        placeholder="شركة الأمين للتوريدات"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none" />
                                </div>
                                {[
                                    { field: 'phone',   label: 'رقم الهاتف',      icon: Phone,  type: 'tel',   placeholder: '09xxxxxxxx' },
                                    { field: 'email',   label: 'البريد الإلكتروني', icon: Mail,   type: 'email', placeholder: 'supplier@email.com' },
                                ].map(({ field, label, icon: Icon, type, placeholder }) => (
                                    <div key={field}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                                        <div className="relative">
                                            <Icon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                                                placeholder={placeholder}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none" />
                                        </div>
                                    </div>
                                ))}
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">العنوان</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                                        <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                            placeholder="دمشق، شارع الحمرا..."
                                            rows={2}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-none" />
                                    </div>
                                </div>

                                {/* Login Account Configuration */}
                                <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                                <Mail className="text-white" size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-emerald-900 leading-none">تفعيل حساب دخول للمورد</p>
                                                <p className="text-[10px] text-emerald-600 mt-1">سيتمكن المورد من متابعة النواقص عبر بوابته الخاصة.</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={form.enableLogin} onChange={e => setForm(f => ({ ...f, enableLogin: e.target.checked }))} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                        </label>
                                    </div>
                                    
                                    {form.enableLogin && (
                                        <div className="mt-4 animate-fade-in">
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                {editing ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور *'}
                                            </label>
                                            <input 
                                                type="password" 
                                                value={form.password} 
                                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                                placeholder="••••••••"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none transition-all"
                                                required={!editing}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-5">
                                <button type="button" onClick={cancelForm} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-sm transition-colors">إلغاء</button>
                                <button type="submit" disabled={saving}
                                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all disabled:opacity-60">
                                    {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Save size={16} /> {editing ? 'حفظ التعديلات' : 'إضافة المورد'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Suppliers list */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h2 className="font-extrabold text-slate-800">قائمة الموردين</h2>
                    </div>
                    {suppliers.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                            <Truck size={56} className="mb-4 opacity-30" />
                            <p className="text-sm font-medium text-slate-400">لا يوجد موردون مسجلون</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                            {suppliers.map(s => (
                                <div key={s.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <Truck size={20} className="text-blue-500" />
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setLinkingSupplier(s)} title="ربط منتجات" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><LinkIcon size={15} /></button>
                                            {isSuperAdmin && (
                                                <>
                                                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 size={15} /></button>
                                                    <button onClick={() => handleDelete(s.id, s.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 size={15} /></button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="font-extrabold text-slate-800 mb-2">{s.name}</h3>
                                    <div className="space-y-1.5 text-xs text-slate-500">
                                        {s.phone   && <div className="flex items-center gap-2"><Phone   size={11} />{s.phone}</div>}
                                        {s.email   && <div className="flex items-center gap-2"><Mail    size={11} />{s.email}</div>}
                                        {s.address && <div className="flex items-center gap-2"><MapPin  size={11} />{s.address}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!loading && pagination && (
                        <Pagination 
                            pagination={pagination} 
                            onPageChange={(page) => fetchSuppliers(page, debouncedSearch)} 
                        />
                    )}
                </div>
            </div>


            {/* Bulk Product Link Modal */}
            <BulkProductLinkModal 
                supplier={linkingSupplier} 
                onClose={() => setLinkingSupplier(null)} 
            />
        </div>
    );
};

/* ── Bulk Product Link Modal ───────────────────────── */
const BulkProductLinkModal = ({ supplier, onClose }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (supplier) fetchAllProducts();
    }, [supplier]);

    const fetchAllProducts = async () => {
        setLoading(true);
        try {
            // Get all products. Using the inventory endpoint which typically returns all products
            const res = await api.get('/inventory');
            setProducts(res.data || []);
            
            // Auto-select products already linked to this supplier
            const preSelected = (res.data || [])
                .filter(p => p.supplier_id === supplier.id)
                .map(p => p.id);
            setSelectedIds(preSelected);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const toggleProduct = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            await api.post('/products/bulk-link-supplier', {
                product_ids: selectedIds,
                supplier_id: supplier.id
            });
            toastSuccess(`تم ربط ${selectedIds.length} منتج بنجاح!`);
            onClose();
        } catch (err) {
            toastError("فشل في ربط المنتجات");
            console.error(err);
        } finally { setSubmitting(false); }
    };

    if (!supplier) return null;

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" dir="rtl">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <LinkIcon size={20} /> ربط المنتجات بالمورد
                        </h2>
                        <p className="text-xs text-white/80 mt-1">المورد: {supplier.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X/></button>
                </div>

                <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="ابحث عن منتج لربطه..." 
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 pr-9 pl-4 text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="text-xs flex items-center font-bold text-slate-500 whitespace-nowrap">
                         مختارة: <span className="bg-emerald-100 text-emerald-700 px-2 rounded-full mr-1">{selectedIds.length}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center text-slate-400">
                            <Loader2 className="animate-spin mb-2" />
                            <p className="text-xs font-bold">جاري تحميل قائمة المنتجات...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-20 text-center text-slate-300 italic">لا توجد منتجات مطابقة</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filtered.map(p => {
                                const isSelected = selectedIds.includes(p.id);
                                return (
                                    <div 
                                        key={p.id} 
                                        onClick={() => toggleProduct(p.id)}
                                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                <Package size={16} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-bold truncate">{p.name}</p>
                                                <p className="text-[10px] opacity-70">المخزون: {p.stock_quantity}</p>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={18} className="text-emerald-600" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white">إلغاء</button>
                    <button 
                        onClick={handleSave} 
                        disabled={submitting || selectedIds.length === 0}
                        className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {api && submitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        حفظ الارتباط
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuppliersPage;
