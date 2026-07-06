import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    Store, Plus, Edit2, Trash2, CheckCircle, 
    XCircle, Users, Package, MapPin, Phone, 
    RefreshCw, X, Save, ExternalLink, ShieldCheck, PauseCircle, PlayCircle
} from 'lucide-react';
import swalRTL, { toastSuccess, toastError, confirmDialog } from '../utils/swal';

const StoreModal = ({ store, onClose, onSave }) => {
    const [formData, setFormData] = useState(store || { name: '', slug: '', address: '', phone: '', admin_email: '', admin_password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (store?.id) {
                await api.put(`/super-admin/stores/${store.id}`, formData);
                toastSuccess('تم تعديل بيانات المحل بنجاح');
                onSave();
            } else {
                const res = await api.post('/super-admin/stores', formData);
                onSave();
                
                const loginUrl = window.location.origin + res.data.login_url;
                
                const { value: action } = await swalRTL.fire({
                    title: 'تم إنشاء المتجر بنجاح! 🚀',
                    html: `
                        <div className="text-right space-y-4 py-4" dir="rtl">
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">اسم المتجر</p>
                                <p className="text-lg font-black text-white">${res.data.store.name}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                                <p className="text-xs text-slate-400 mb-1">بريد المدير</p>
                                <p className="text-sm font-bold text-blue-400">${res.data.admin_email}</p>
                            </div>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'إغلاق',
                    cancelButtonText: 'فتح صفحة الدخول',
                });

                if (!action) {
                    window.open(`/${res.data.store.slug}/dashboard`, '_blank');
                }
            }
        } catch (err) {
            console.error('Save Store Error:', err);
            if (err.response?.status === 422) {
                const firstError = Object.values(err.response.data.errors)[0][0];
                toastError(firstError || 'بيانات غير صالحة');
            } else {
                toastError(err.response?.data?.message || 'خطأ في حفظ البيانات');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-900 flex justify-between items-center text-white">
                    <h3 className="text-lg font-black tracking-tight">{store?.id ? 'تعديل بيانات المحل' : 'إضافة محل جديد'}</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-400 transition-colors"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">اسم المحل</label>
                            <input 
                                required
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        {!store?.id && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">الرابط المباشر (Slug)</label>
                                <input 
                                    required
                                    type="text" 
                                    placeholder="example-store"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                    value={formData.slug}
                                    onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                                />
                            </div>
                        )}
                    </div>

                    {!store?.id && (
                        <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 space-y-4">
                            <h4 className="flex items-center gap-2 text-indigo-700 font-black text-xs uppercase tracking-wider">
                                <ShieldCheck size={16} /> بيانات مدير النظام (Admin)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">البريد الإلكتروني</label>
                                    <input 
                                        required
                                        type="email" 
                                        placeholder="admin@example.com"
                                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                        value={formData.admin_email}
                                        onChange={e => setFormData({...formData, admin_email: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">كلمة السر</label>
                                    <input 
                                        required
                                        type="password" 
                                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                        value={formData.admin_password}
                                        onChange={e => setFormData({...formData, admin_password: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">العنوان</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pr-2">رقم الهاتف</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            {store?.id ? 'تحديث البيانات' : 'إنشاء المتجر والمدير'}
                        </button>
                        <button type="button" onClick={onClose} className="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const StoresPage = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editStore, setEditStore] = useState(null);

    useEffect(() => {
        fetchStores();
    }, []);

    const fetchStores = async () => {
        try {
            const res = await api.get('/super-admin/stores');
            setStores(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, name, currentStatus) => {
        const isSuspended = currentStatus === 'suspended';
        const result = await confirmDialog(
            isSuspended ? 'تفعيل المتجر' : 'إيقاف المتجر مؤقتاً',
            isSuspended ? `هل أنت متأكد من إعادة تفعيل المتجر "${name}"؟` : `هل أنت متأكد من إيقاف المتجر "${name}"؟ لن يتمكن مستخدموه من الدخول للنظام.`,
            isSuspended ? 'success' : 'warning'
        );
        if (!result.isConfirmed) return;

        try {
            await api.post(`/super-admin/stores/${id}/toggle`, { action: isSuspended ? 'activate' : 'suspend' });
            toastSuccess('تم تحديث حالة المتجر بنجاح');
            fetchStores();
        } catch (err) {
            toastError('فشل في تحديث الحالة');
        }
    };

    const handleDelete = async (id, name) => {
        const result = await confirmDialog(
            'حذف الفرع نهائياً؟ ⚠️',
            `سيتم حذف المحل "${name}" وكافة بياناته للأبد. لا يمكن التراجع عن هذا الإجراء.`,
            'error'
        );

        if (result.isConfirmed) {
            try {
                const res = await api.delete(`/super-admin/stores/${id}`);
                toastSuccess(res.data.message);
                fetchStores();
            } catch (err) {
                toastError('فشل في عملية الحذف');
            }
        }
    };

    const handleSwitch = async (id, slug) => {
        try {
            const res = await api.post('/super-admin/stores/switch', { store_id: id });
            toastSuccess(res.data.message);
            localStorage.setItem('pos_user', JSON.stringify(res.data.user));
            window.open(`/${slug}/dashboard`, '_blank');
        } catch (err) {
            toastError('فشل التبديل بين المحلات');
        }
    };

    if (loading) return null;

    return (
        <div className="p-8 bg-slate-50 min-h-screen space-y-8 font-sans" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Store className="text-indigo-600" size={32} />
                        إدارة المتاجر المركزية
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">تحكم كامل في المتاجر، الحذف النهائي، والتعليق المؤقت</p>
                </div>
                <button 
                    onClick={() => { setEditStore(null); setShowModal(true); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:scale-95"
                >
                    <Plus size={20} />
                    <span>إضافة متجر جديد</span>
                </button>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-6">المحل</th>
                            <th className="px-8 py-6">المعلومات</th>
                            <th className="px-8 py-6 text-center">الإحصائيات</th>
                            <th className="px-8 py-6 text-center">الحالة التشغيلية</th>
                            <th className="px-8 py-6 text-left">إجراءات التحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {stores.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 ${s.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'} rounded-2xl flex items-center justify-center font-black text-xl transition-transform group-hover:scale-105 shadow-sm`}>
                                            {s.name[0]}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-800 text-lg leading-none mb-1">{s.name}</h4>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-mono uppercase tracking-wider">#{s.slug}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                            <MapPin size={14} className="text-slate-300" /> {s.address || 'لا يوجد عنوان'}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold font-mono">
                                            <Phone size={14} className="text-slate-300" /> {s.phone || '--'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="flex items-center justify-center gap-8">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">موظفين</p>
                                            <div className="flex items-center gap-1.5 justify-center font-black text-slate-700">
                                                <Users size={14} className="text-indigo-400" /> {s.users_count || 0}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5">منتجات</p>
                                            <div className="flex items-center gap-1.5 justify-center font-black text-slate-700">
                                                <Package size={14} className="text-blue-400" /> {s.products_count || 0}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest
                                        ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}
                                    `}>
                                        <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                                        {s.status === 'active' ? 'نشط ومفعل' : 'موقف مؤقتاً'}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-left">
                                    <div className="flex items-center justify-end gap-3">
                                        <button 
                                            onClick={() => handleSwitch(s.id, s.slug)}
                                            title="زيارة المتجر"
                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 rounded-xl shadow-sm transition-all active:scale-90"
                                        >
                                            <ExternalLink size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(s.id, s.name, s.status)}
                                            title={s.status === 'active' ? 'تعليق المتجر' : 'تفعيل المتجر'}
                                            className={`p-3 border rounded-xl shadow-sm transition-all active:scale-95
                                                ${s.status === 'active' 
                                                    ? 'bg-white border-slate-200 text-amber-500 hover:bg-amber-50 hover:border-amber-200' 
                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}
                                            `}
                                        >
                                            {s.status === 'active' ? <PauseCircle size={18} /> : <PlayCircle size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => { setEditStore(s); setShowModal(true); }}
                                            className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 rounded-xl shadow-sm transition-all active:scale-95"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(s.id, s.name)}
                                            title="حذف نهائي"
                                            className="p-3 bg-rose-50 border border-rose-100 text-rose-500 hover:bg-rose-100 hover:border-rose-200 rounded-xl shadow-sm transition-all active:scale-95"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && <StoreModal store={editStore} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); fetchStores(); }} />}
        </div>
    );
};

export default StoresPage;
