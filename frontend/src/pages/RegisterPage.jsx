import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { UserPlus, Mail, Lock, User, Shield, AlertCircle, Zap, CheckCircle } from 'lucide-react';

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
            // After registration, login automatically using the returned token
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4 font-sans" dir="rtl">
            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-lg bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
                {/* Logo */}
                <div className="flex justify-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/50">
                        <Zap size={28} className="text-white" />
                    </div>
                </div>

                <h2 className="text-2xl font-extrabold text-white text-center mb-1">إنشاء حساب جديد</h2>
                <p className="text-slate-400 text-sm text-center mb-6">أنشئ حساباً للوصول إلى نظام نقاط البيع</p>

                {error && (
                    <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl p-4 mb-5 animate-fade-in">
                        <AlertCircle size={18} className="shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">الاسم الكامل</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 pointer-events-none"><User size={17} /></span>
                            <input type="text" value={form.name} onChange={update('name')} required
                                className="w-full bg-white/10 border border-white/15 text-white rounded-xl py-3 pr-10 pl-4 text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="محمد عبد الله" />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 pointer-events-none"><Mail size={17} /></span>
                            <input type="email" value={form.email} onChange={update('email')} required
                                className="w-full bg-white/10 border border-white/15 text-white rounded-xl py-3 pr-10 pl-4 text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="email@example.com" />
                        </div>
                    </div>

                    {/* Password row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 pointer-events-none"><Lock size={17} /></span>
                                <input type="password" value={form.password} onChange={update('password')} required minLength={8}
                                    className="w-full bg-white/10 border border-white/15 text-white rounded-xl py-3 pr-10 pl-4 text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-1.5">تأكيد المرور</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-slate-500 pointer-events-none"><Lock size={17} /></span>
                                <input type="password" value={form.password_confirmation} onChange={update('password_confirmation')} required
                                    className="w-full bg-white/10 border border-white/15 text-white rounded-xl py-3 pr-10 pl-4 text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" />
                            </div>
                        </div>
                    </div>

                    {/* Role selector */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-2">
                            <Shield size={14} className="inline ml-1" /> نوع الحساب (الصلاحية)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {roles.map(r => (
                                <button key={r.value} type="button" onClick={() => setForm(prev => ({ ...prev, role: r.value }))}
                                    className={`flex items-start gap-3 p-3 rounded-xl border text-right transition-all ${
                                        form.role === r.value
                                            ? 'border-blue-500 bg-blue-500/20 text-white'
                                            : 'border-white/15 bg-white/5 text-slate-400 hover:border-white/30'
                                    }`}>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${form.role === r.value ? 'border-blue-400' : 'border-slate-500'}`}>
                                        {form.role === r.value && <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{r.label}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50 active:scale-95 transition-all mt-2">
                        {loading
                            ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <><UserPlus size={18} /><span>إنشاء الحساب والدخول</span></>
                        }
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500 mt-5">
                    لديك حساب بالفعل؟{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">تسجيل الدخول</Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
