import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { UserPlus, Mail, Lock, User, Shield, AlertCircle, Zap } from 'lucide-react';

const RegisterPage = ({ onLogin }) => {
    const navigate = useNavigate();
    const [form,    setForm]    = useState({ name: '', email: '', password: '', password_confirmation: '', role: 'cashier' });
    const [error,   setError]   = useState('');
    const [loading, setLoading] = useState(false);

    const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.password_confirmation) {
            setError('كلمتا المرور غير متطابقتان.');
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/register', form);
            const { token, user } = res.data;
            if (onLogin) {
                onLogin(token, user);
            }
            navigate('/pos');
        } catch (err) {
            const errors = err.response?.data?.errors;
            if (errors) {
                setError(Object.values(errors).flat().join(' '));
            } else {
                setError(err.response?.data?.message || 'حدث خطأ، يرجى المحاولة مرة أخرى.');
            }
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { value: 'cashier', label: 'كاشير',  desc: 'يمكنه إجراء عمليات البيع فقط' },
        { value: 'admin',   label: 'مدير',   desc: 'صلاحيات كاملة على النظام' },
    ];

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans" dir="rtl">
            <div className="w-full max-w-lg bg-white border border-slate-200 rounded-[2.5rem] shadow-xl p-10">
                
                <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Zap size={28} className="text-white fill-current" />
                    </div>
                </div>

                <h2 className="text-3xl font-black text-slate-900 text-center mb-2">إنشاء حساب جديد</h2>
                <p className="text-slate-500 font-medium text-center mb-8">ابدأ رحلتك مع نظام Cash POS اليوم</p>

                {error && (
                    <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 mb-6 animate-fade-in">
                        <AlertCircle size={18} className="shrink-0" />
                        <p className="text-sm font-bold">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">الاسم الكامل</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 right-4 flex items-center text-slate-400 pointer-events-none"><User size={18} /></span>
                            <input type="text" value={form.name} onChange={update('name')} required
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3.5 pr-11 pl-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="محمد عبد الله" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 right-4 flex items-center text-slate-400 pointer-events-none"><Mail size={18} /></span>
                            <input type="email" value={form.email} onChange={update('email')} required
                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3.5 pr-11 pl-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                placeholder="email@example.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">كلمة المرور</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-4 flex items-center text-slate-400 pointer-events-none"><Lock size={18} /></span>
                                <input type="password" value={form.password} onChange={update('password')} required minLength={8}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3.5 pr-11 pl-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">تأكيد المرور</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-4 flex items-center text-slate-400 pointer-events-none"><Lock size={18} /></span>
                                <input type="password" value={form.password_confirmation} onChange={update('password_confirmation')} required
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-3.5 pr-11 pl-4 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            <Shield size={14} className="inline ml-1 text-indigo-600" /> نوع الصلاحية
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            {roles.map(r => (
                                <button key={r.value} type="button" onClick={() => setForm(prev => ({ ...prev, role: r.value }))}
                                    className={`flex flex-col gap-1 p-4 rounded-2xl border text-right transition-all ${
                                        form.role === r.value
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <p className="font-black text-sm">{r.label}</p>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.role === r.value ? 'border-indigo-600' : 'border-slate-300'}`}>
                                            {form.role === r.value && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold opacity-70 leading-relaxed mt-1">{r.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4">
                        {loading
                            ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><UserPlus size={20} /><span>إنشاء الحساب والدخول</span></>
                        }
                    </button>
                </form>

                <p className="text-center text-sm font-bold text-slate-400 mt-8 uppercase tracking-widest">
                    لديك حساب بالفعل؟{' '}
                    <Link to="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors">تسجيل الدخول</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
