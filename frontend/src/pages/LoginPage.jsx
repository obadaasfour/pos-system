import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Zap, ShieldCheck, Eye, EyeOff, ArrowRight } from 'lucide-react';


const LoginPage = () => {
    const { onLogin } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Load saved email on mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return { text: 'صباح الخير! ☕', sub: 'ابدأ يومك بكل نشاط' };
        if (hour >= 12 && hour < 18) return { text: 'طاب يومك، بالتوفيق في العمل! ✨', sub: 'نحن هنا لمساعدتك على النجاح' };
        return { text: 'مساء الخير، عساك على القوة! 🌙', sub: 'تأكد من مراجعة تقارير اليوم ختاماً' };
    };

    const greeting = getGreeting();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberedEmail');
        }

        try {
            // Unified global login endpoint
            const response = await api.post('/login', { email, password, device_name: 'browser' });
            
            // onLogin in AuthContext will handle smart redirection
            onLogin(response.data.token, response.data.user, response.data.slug);
        } catch (err) {
            console.error("Login attempt failed:", err.response?.data);
            setError(err.response?.data?.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans transition-colors duration-500 selection:bg-blue-100 bg-white" dir="rtl">

            {/* Decorative left panel (Reverted to Blue style) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
                <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/5 rounded-full" />
                <div className="relative z-10 text-center text-white space-y-8">
                    <div className="w-20 h-20 bg-white/15 backdrop-blur rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                        <Zap size={40} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Cash POS</h1>
                        <p className="text-blue-200 text-lg font-medium">نظام نقاط البيع الذكي</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 text-right max-w-xs mx-auto">
                        {[
                            { icon: '⚡', title: 'سريع وموثوق', desc: 'معالجة المبيعات في ثوانٍ' },
                            { icon: '📦', title: 'إدارة المخزون', desc: 'تتبع احترافي للبضاعة' },
                            { icon: '📊', title: 'تقارير فورية', desc: 'إحصائيات لحظية دقيقة' },
                        ].map((f, index) => (
                            <div
                                key={f.title}
                                className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:shadow-2xl animate-fade-in"
                                style={{ animationDelay: `${(index + 1) * 150}ms` }}
                            >
                                <span className="text-2xl transition-transform duration-500 group-hover:rotate-12">{f.icon}</span>
                                <div><p className="font-bold text-white text-sm">{f.title}</p><p className="text-blue-200 text-xs">{f.desc}</p></div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8">
                        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mx-auto text-sm font-bold">
                            <ArrowRight size={16} /> العودة للرئيسية
                        </button>
                    </div>
                </div>
            </div>

            {/* Form Side (White Mode) */}
            <div className="flex-1 flex flex-col bg-white transition-colors duration-500 relative">
                {/* Theme Toggle Removed */}

                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-sm">
                        <div className="lg:hidden flex items-center gap-3 mb-8">

                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center animate-pulse"><Zap size={20} className="text-white" /></div>
                        <span className="font-extrabold text-slate-950 text-xl transition-colors">Cash POS</span>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-3xl font-black text-slate-950 transition-colors">{greeting.text}</h2>
                        <p className="text-slate-500 mt-2 text-sm font-bold">{greeting.sub}</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 mb-6 animate-fade-in">
                            <AlertCircle size={18} className="shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-black text-slate-900 mb-1.5 transition-colors">البريد الإلكتروني</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 pointer-events-none transition-colors"><Mail size={17} /></span>
                                <input id="email-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all font-bold"
                                    placeholder="email@example.com" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-black text-slate-900 mb-1.5 transition-colors">كلمة المرور</label>
                            <div className="relative group/input">
                                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 pointer-events-none transition-colors"><Lock size={17} /></span>
                                <input id="password-input" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pr-10 pl-12 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all font-bold"
                                    placeholder="••••••••" required />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer" />
                                <span className="text-xs font-medium text-slate-500 group-hover:text-slate-700 transition-colors">تذكرني</span>
                            </label>
                        </div>
                        <button id="login-btn" type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-100 active:scale-95 transition-all">
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <><LogIn size={18} /><span>تسجيل الدخول</span></>
                            }
                        </button>
                    </form>

                    <div className="flex items-center gap-2 justify-center mt-8 text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-80">
                        <ShieldCheck size={14} />
                        <span>بيانات محمية بتشفير SSL</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default LoginPage;
