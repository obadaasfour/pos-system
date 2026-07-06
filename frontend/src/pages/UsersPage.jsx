import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
    Users, Pencil, Trash2, RotateCcw, X, Save, Plus,
    ShieldCheck, User as UserIcon, AlertCircle, CheckCircle,
    Loader2, Search, RefreshCw
} from 'lucide-react';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import { confirmDialog, toastSuccess, toastError } from '../utils/swal';

/* ─── helpers ─────────────────────────────── */
const RoleBadge = ({ role }) =>
    role === 'admin'
        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100"><ShieldCheck size={11}/>مدير</span>
        : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200"><UserIcon size={11}/>كاشير</span>;

const StatusBadge = ({ deletedAt }) =>
    deletedAt
        ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-100">معطّل</span>
        : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">نشط</span>;

/* ─── Edit Modal ─────────────────────────── */
const EditModal = ({ userToEdit, onClose, onSaved }) => {
    const [role, setRole]         = useState(userToEdit.role);
    const [shiftStart, setShiftStart]   = useState(userToEdit.shift_start || '08:00');
    const [shiftEnd, setShiftEnd]       = useState(userToEdit.shift_end || '16:00');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');

    const handleSave = async () => {
        setError('');
        if (password && password.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
            return;
        }
        const payload = { role, shift_start: shiftStart, shift_end: shiftEnd };
        if (password) payload.password = password;
        setLoading(true);
        try {
            const res = await api.put(`/users/${userToEdit.id}`, payload);
            onSaved(res.data.user);
        } catch (e) {
            setError(e.response?.data?.message || 'حدث خطأ أثناء الحفظ.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Pencil size={18} className="text-blue-500"/>
                        تعديل: {userToEdit.name}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 mb-4 text-sm">
                        <AlertCircle size={16}/> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">الرتبة</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ v: 'admin', l: 'مدير' }, { v: 'cashier', l: 'كاشير' }].map(r => (
                                <button key={r.v} type="button" onClick={() => setRole(r.v)}
                                    className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${role === r.v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                    {r.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">بداية الوردية</label>
                            <input type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">نهاية الوردية</label>
                            <input type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة مرور جديدة <span className="text-slate-400 font-normal">(اتركها فارغة للإبقاء على القديمة)</span></label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={handleSave} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm disabled:opacity-60 transition-all">
                        {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                        حفظ التعديلات
                    </button>
                    <button onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Add User Modal ─────────────────────── */
const AddUserModal = ({ onClose, onAdded }) => {
    const [form, setForm]       = useState({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'cashier',
        shift_start: '08:00:00',
        shift_end: '16:00:00'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');

    const handleSave = async () => {
        setError('');
        if (!form.name.trim() || !form.email.trim() || !form.password) {
            setError('يرجى تعبئة جميع الحقول المطلوبة.');
            return;
        }
        if (form.password.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
            return;
        }
        setLoading(true);
        try {
            await api.post('/users', form);
            toastSuccess('تم إضافة المستخدم بنجاح');
            onAdded();
        } catch (e) {
            setError(e.response?.data?.message || 'حدث خطأ أثناء إنشاء المستخدم.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users size={18} className="text-emerald-500"/>
                        إضافة مستخدم جديد
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 mb-4 text-sm">
                        <AlertCircle size={16}/> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">اسم المستخدم</label>
                        <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                            placeholder="محمد أحمد"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                            placeholder="user@example.com"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">كلمة المرور</label>
                        <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                            placeholder="••••••••"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2.5 px-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">الرتبة</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ v: 'admin', l: 'مدير' }, { v: 'cashier', l: 'كاشير' }].map(r => (
                                <button key={r.v} type="button" onClick={() => setForm(f => ({...f, role: r.v}))}
                                    className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${form.role === r.v ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                    {r.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">بداية الوردية</label>
                            <input type="time" value={form.shift_start} onChange={e => setForm(f => ({...f, shift_start: e.target.value}))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">نهاية الوردية</label>
                            <input type="time" value={form.shift_end} onChange={e => setForm(f => ({...f, shift_end: e.target.value}))}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={handleSave} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-60 transition-all">
                        {loading ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
                        إضافة المستخدم
                    </button>
                    <button onClick={onClose} className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all">
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Page ──────────────────────────── */
const UsersPage = () => {
    const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchUsers = useCallback(async (page = 1, search = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/users?page=${page}&search=${search}`);
            setUsers(res.data.data);
            setPagination(res.data);
        } catch {
            showToast('error', 'فشل تحميل المستخدمين.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchUsers(1, debouncedSearch);
        }
    }, [debouncedSearch, fetchUsers, isAuthenticated, authLoading]);

    const adminCount = users.filter(u => u.role === 'admin' && !u.deleted_at).length;

    const handleDelete = async (u) => {
        const result = await confirmDialog(`حذف المستخدم`, `هل أنت متأكد من حذف "${u.name}"؟`, 'warning');
        if (!result.isConfirmed) return;
        setDeletingId(u.id);
        try {
            await api.delete(`/users/${u.id}`);
            showToast('success', `تم حذف "${u.name}" بنجاح.`);
            fetchUsers(pagination.current_page, debouncedSearch);
        } catch (e) {
            showToast('error', e.response?.data?.message || 'حدث خطأ أثناء الحذف.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleRestore = async (u) => {
        try {
            await api.post(`/users/${u.id}/restore`);
            showToast('success', `تمت استعادة "${u.name}" بنجاح.`);
            fetchUsers(pagination.current_page, debouncedSearch);
        } catch {
            showToast('error', 'فشل في استعادة المستخدم.');
        }
    };

    const handleSaved = (updatedUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        setEditUser(null);
        showToast('success', 'تم حفظ التعديلات بنجاح.');
    };

    const canDelete = (u) => {
        if (u.deleted_at) return false;
        if (u.id === currentUser?.id) return false;
        if (u.role === 'admin' && adminCount <= 1) return false;
        return true;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header for Users */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white shadow-xl shadow-slate-200/50 rounded-[2.5rem] border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all">
                    <div className="flex items-center gap-6 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-200 ring-4 ring-blue-50">
                            <Users size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">إدارة المستخدمين</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                {pagination?.total || 0} موظف وكاشير مسجل في النظام
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-200 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="ابحث عن موظف بالاسم أو الإيميل..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 pr-12 pl-4 text-sm font-extrabold text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <button 
                            onClick={() => fetchUsers(pagination?.current_page || 1, debouncedSearch)}
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-95"
                            title="تحديث البيانات"
                        >
                            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-xl shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus size={20} /> إضافة مستخدم
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-8 pt-4">
                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg">
                    {false ? null : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        {['الاسم', 'البريد الإلكتروني', 'الرتبة', 'الوردية الآلية', 'حالة الحساب', 'تاريخ الإنشاء', 'العمليات'].map(h => (
                                            <th key={h} className="text-right px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className={`transition-colors hover:bg-slate-50/80 ${u.deleted_at ? 'opacity-50' : ''}`}>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0 text-slate-600 font-bold text-sm border border-slate-200">
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{u.name}</p>
                                                        {u.id === currentUser?.id && <p className="text-[10px] text-blue-600 font-bold">أنت</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-slate-500 font-medium">{u.email}</td>
                                            <td className="px-5 py-4"><RoleBadge role={u.role}/></td>
                                            <td className="px-5 py-4 text-xs font-bold text-blue-600">
                                                {u.shift_start ? `${u.shift_start} - ${u.shift_end}` : '--:--'}
                                            </td>
                                            <td className="px-5 py-4"><StatusBadge deletedAt={u.deleted_at}/></td>
                                            <td className="px-5 py-4 text-slate-400 whitespace-nowrap font-medium">
                                                {new Date(u.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    {!u.deleted_at && (
                                                        <button onClick={() => setEditUser(u)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all text-xs font-bold"
                                                            title="تعديل">
                                                            <Pencil size={13}/> تعديل
                                                        </button>
                                                    )}
                                                    {canDelete(u) && (
                                                        <button onClick={() => handleDelete(u)}
                                                            disabled={deletingId === u.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all text-xs font-bold disabled:opacity-50"
                                                            title="حذف">
                                                            {deletingId === u.id ? <Loader2 size={13} className="animate-spin"/> : <Trash2 size={13}/>} حذف
                                                        </button>
                                                    )}
                                                    {u.deleted_at && (
                                                        <button onClick={() => handleRestore(u)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-all text-xs font-bold"
                                                            title="استعادة">
                                                            <RotateCcw size={13}/> استعادة
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {users.length === 0 && (
                                <div className="text-center py-20 text-slate-400">
                                    <Users size={40} className="mx-auto mb-3 opacity-20"/>
                                    <p className="font-bold">لا يوجد مستخدمون</p>
                                </div>
                            )}
                        </div>
                    )}
                    {!loading && pagination && (
                        <Pagination 
                            pagination={pagination} 
                            onPageChange={(page) => fetchUsers(page, debouncedSearch)} 
                        />
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editUser && <EditModal userToEdit={editUser} onClose={() => setEditUser(null)} onSaved={handleSaved}/>}

            {/* Add User Modal */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onAdded={() => {
                        setShowAddModal(false);
                        showToast('success', 'تم إضافة المستخدم بنجاح.');
                        fetchUsers(1, debouncedSearch);
                    }}
                />
            )}
        </div>
    );
};

export default UsersPage;
