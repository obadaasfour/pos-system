import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { 
    Zap, ShoppingCart, Package, BarChart3, ShieldCheck, 
    Smartphone, Globe, ArrowRight, Layers, CheckCircle2,
    Users, LayoutGrid, Database, Star, Trophy, Sparkles
} from 'lucide-react';
import './Landing.css';
import { landingConfig } from './landingConfig';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import toast from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';

// ─── Navbar Component ─────────────────────────────────────
const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ${scrolled ? 'py-4 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5' : 'py-5 bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center glow-blue group-hover:rotate-12 transition-transform duration-500 shadow-xl shadow-blue-500/20">
                        <Zap size={24} className="text-white fill-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-2xl font-black tracking-tighter text-white leading-none uppercase">CASHPOS</span>
                        <span className="text-[9px] font-black text-blue-500 tracking-[0.3em] mt-1 uppercase">Management Pro</span>
                    </div>
                </div>
                
                {/* Desktop Menu */}
                <div className="hidden lg:flex items-center gap-10 text-[13px] font-black text-slate-400 uppercase tracking-widest">
                    <a href="#features" className="hover:text-white transition-all relative group">
                        المميزات
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
                    </a>
                    <a href="#about" className="hover:text-white transition-all relative group">
                        عن النظام
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
                    </a>
                    <a href="#contact" className="hover:text-white transition-all relative group">
                        اتصل بنا
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
                    </a>
                </div>

                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/login')}
                        className="hidden sm:flex group relative px-8 py-3 bg-white text-slate-950 font-black rounded-2xl overflow-hidden shadow-2xl shadow-white/5 hover:shadow-white/20 transition-all active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        <div className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors duration-500">
                            <span>دخول النظام</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {/* Mobile Menu Toggle */}
                    <button 
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-3 bg-white/5 rounded-xl border border-white/10 text-white active:scale-95 transition-all"
                    >
                        <LayoutGrid size={24} />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-3xl border-b border-white/10 overflow-hidden lg:hidden shadow-2xl"
                    >
                        <div className="p-8 flex flex-col gap-6 text-right rtl">
                            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black text-white hover:text-blue-500 transition-colors">المميزات</a>
                            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black text-white hover:text-blue-500 transition-colors">عن النظام</a>
                            <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="text-xl font-black text-white hover:text-blue-500 transition-colors">اتصل بنا</a>
                            <div className="h-px bg-white/10 my-2"></div>
                            <button 
                                onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                            >
                                <span>دخول النظام</span>
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

// ─── Hero Section ─────────────────────────────────────────
const Hero = ({ onOpenDemo }) => {
    const navigate = useNavigate();
    const { scrollYProgress } = useScroll();
    const y = useTransform(scrollYProgress, [0, 0.5], [0, -150]);
    const rotate = useTransform(scrollYProgress, [0, 0.5], [0, 5]);
    const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        <section className="relative pt-52 pb-32 overflow-hidden hero-gradient min-h-screen flex items-center">
            {/* Animated Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
                <motion.div 
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 1, cubicBezier: [0.16, 1, 0.3, 1] }}
                    className="space-y-10 text-right rtl relative z-20"
                >
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.2] lg:leading-[1.1] tracking-tighter">
                        أدر تجارتك <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600 text-glow-blue">بسرعة الضوء.</span>
                    </h1>
                    
                    <p className="text-xl text-slate-400 leading-relaxed max-w-xl font-medium">
                        المنصة الأكثر تطوراً في الشرق الأوسط لإدارة المتاجر والمخازن سحابياً. تقارير ذكية، واجهات POS خارقة، ومزامنة لا تتوقف.
                    </p>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-5">
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-[2rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:shadow-[0_20px_50px_rgba(37,99,235,0.5)] hover:-translate-y-1 transition-all flex items-center justify-center gap-4 group"
                        >
                            ابدأ رحلة النجاح الآن
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-45 transition-transform">
                                <ArrowRight size={18} />
                            </div>
                        </button>
                        <button 
                            onClick={onOpenDemo}
                            className="w-full sm:w-auto px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-[2rem] border border-white/10 backdrop-blur-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            <Smartphone size={20} className="text-blue-500" />
                            مشاهدة الديمو
                        </button>
                    </div>

                    <div className="flex items-center gap-10 pt-12">
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white">500+</span>
                            <span className="text-[10px] uppercase font-black text-blue-500 tracking-widest mt-1">متجر نشط</span>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white">99.9%</span>
                            <span className="text-[10px] uppercase font-black text-emerald-500 tracking-widest mt-1">وقت التشغيل</span>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="flex flex-col">
                            <span className="text-3xl font-black text-white">24/7</span>
                            <span className="text-[10px] uppercase font-black text-amber-500 tracking-widest mt-1">دعم فني</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    style={{ y, rotate }}
                    className="relative parallax-wrap perspective-1000 hidden lg:block"
                >
                    <div className="relative z-10 floating-slow">
                        {/* Tablet Mockup Premium */}
                        <div className="bg-slate-900/80 backdrop-blur-3xl p-3 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5">
                            <div className="bg-slate-950 rounded-[3rem] overflow-hidden aspect-[16/11] relative border border-white/5">
                                <img 
                                    src="/hero-mockup.png" 
                                    alt="POS Dashboard" 
                                    className="w-full h-full object-cover scale-105"
                                />
                                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] pointer-events-none"></div>
                            </div>
                        </div>
                    </div>
                    {/* Decorative Glows */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] -z-10 rounded-full"></div>
                </motion.div>
            </div>
            
            {/* Scroll Indicator */}
            <motion.div 
                style={{ opacity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
            >
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">اكتشف المزيد</span>
                <div className="w-px h-20 bg-gradient-to-b from-blue-600 to-transparent"></div>
            </motion.div>
        </section>
    );
};

// ─── Features Section ─────────────────────────────────────
const Features = () => {
    const features = [
        {
            title: 'نقطة بيع سحابية',
            desc: 'واجهة POS خارقة السرعة تعمل من أي مكان، تدعم الباركود والطباعة الفورية.',
            icon: ShoppingCart,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            delay: 0.1
        },
        {
            title: 'مخزون ذكي جداً',
            desc: 'تتبع كل قطعة بدقة متناهية مع نظام تنبيهات ذكي للكميات الحرجة.',
            icon: Package,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            delay: 0.2
        },
        {
            title: 'تحليلات عميقة',
            desc: 'لوحة بيانات احترافية توضح لك أرباحك، مبيعاتك، وأكثر الأصناف طلباً.',
            icon: BarChart3,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            delay: 0.3
        },
        {
            title: 'إدارة الفريق',
            desc: 'تحكم كامل في صلاحيات الموظفين وتتبع أدائهم دقيقة بدقيقة.',
            icon: Users,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            delay: 0.4
        },
        {
            title: 'الموردين والديون',
            desc: 'سجل كامل لحسابات الموردين والديون لضمان دقة حساباتك المالية.',
            icon: Database,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            delay: 0.5
        },
        {
            title: 'أمان لا يخترق',
            desc: 'بياناتك مشفرة ومؤمنة في أفضل الخوادم مع نسخ احتياطي تلقائي.',
            icon: ShieldCheck,
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            delay: 0.6
        }
    ];

    return (
        <section id="features" className="py-40 relative">
            <div className="max-w-7xl mx-auto px-6 text-center space-y-6 mb-28">
                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-600/5 border border-blue-500/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">
                    القوة بين يديك
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">كل ما تحتاجه للسيادة.</h2>
            </div>

            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {features.map((f, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: f.delay }}
                        className="glass-card group p-12 rounded-[3.5rem] space-y-8 text-right rtl hover:bg-white/[0.05] transition-all"
                    >
                        <div className={`w-16 h-16 ${f.bg} ${f.color} rounded-[1.5rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                            <f.icon size={32} />
                        </div>
                        <div className="space-y-4">
                            <h4 className="text-2xl font-black text-white group-hover:text-blue-500 transition-colors">{f.title}</h4>
                            <p className="text-slate-400 font-medium leading-relaxed text-lg">{f.desc}</p>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <div className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-blue-500 group-hover:border-blue-500/30 transition-all">
                                <ArrowRight size={20} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};


// ─── About Section ────────────────────────────────────────
const About = () => {
    return (
        <section id="about" className="py-40 relative overflow-hidden bg-slate-950/20">
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-32 items-center">
                <div className="order-2 lg:order-1 relative">
                    <div className="absolute -inset-10 bg-blue-600/10 blur-[100px] rounded-full animate-pulse"></div>
                    <div className="relative grid grid-cols-2 gap-6">
                        <div className="space-y-6 pt-12">
                            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all text-center group">
                                <Layers className="mx-auto mb-5 text-blue-500 group-hover:scale-110 transition-transform" size={40} />
                                <h4 className="text-white font-black text-xl">Cloud Native</h4>
                                <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">بنية تحتية سحابية</p>
                            </div>
                            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all text-center group">
                                <Smartphone className="mx-auto mb-5 text-emerald-500 group-hover:scale-110 transition-transform" size={40} />
                                <h4 className="text-white font-black text-xl">Full Sync</h4>
                                <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">مزامنة كاملة 1:1</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all text-center group">
                                <Database className="mx-auto mb-5 text-amber-500 group-hover:scale-110 transition-transform" size={40} />
                                <h4 className="text-white font-black text-xl">Scalable DB</h4>
                                <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">قواعد بيانات مرنة</p>
                            </div>
                            <div className="p-8 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all text-center group">
                                <ShieldCheck className="mx-auto mb-5 text-rose-500 group-hover:scale-110 transition-transform" size={40} />
                                <h4 className="text-white font-black text-xl">Hardened SEC</h4>
                                <p className="text-slate-500 text-xs mt-3 font-bold uppercase tracking-widest">حماية عسكرية</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="order-1 lg:order-2 text-right rtl space-y-10">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-600/5 border border-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        تكنولوجيا المستقبل
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight">
                        كفاءة خارقة في <br />
                        <span className="text-blue-600">قلب أعمالك.</span>
                    </h3>
                    <div className="space-y-6">
                        <p className="text-slate-400 text-xl leading-relaxed font-medium">
                            تم بناء CashPOS على هندسة برمجية متطورة تضمن لك استجابة فورية حتى في أقصى ظروف ضغط العمل. نحن لا نقدم مجرد نظام، بل محرك لنمو تجارتك.
                        </p>
                        <p className="text-slate-400 text-xl leading-relaxed font-medium">
                            واجهاتنا صممت لتكون بديهية جداً، بحيث لا يحتاج موظفك لأكثر من 5 دقائق للبدء في البيع كالمحترفين.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 pt-6">
                        <div className="flex items-center justify-end gap-3 group">
                            <span className="text-white font-black">أداء مستقر 99.9%</span>
                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-all">
                                <Zap size={16} />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 group">
                            <span className="text-white font-black">دعم فني بشري 24/7</span>
                            <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-all">
                                <Users size={16} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Contact Section ──────────────────────────────────────
const Contact = () => {
    return (
        <section id="contact" className="py-24 relative">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
                <div className="glass-card rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-16 relative overflow-hidden border border-white/5 group shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 -z-10 group-hover:scale-110 transition-transform duration-1000"></div>
                    
                    <div className="space-y-12">
                        <div className="space-y-3">
                            <h2 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">انضم إلينا اليوم</h2>
                            <h3 className="text-3xl sm:text-5xl font-black text-white tracking-tight">نحن هنا لمساندتك.</h3>
                            <p className="text-slate-400 text-base sm:text-lg font-medium">فريقنا جاهز للإجابة على استفساراتك وتجهيز متجرك في دقائق</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-4">
                            <a 
                                href={landingConfig.contact.whatsappUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-4 group/item"
                            >
                                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-blue-500 group-hover/item:bg-blue-600 group-hover/item:text-white transition-all shadow-2xl duration-500">
                                    <Smartphone size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">واتساب مباشر</p>
                                    <p className="text-white font-black text-xl tracking-tighter">{landingConfig.contact.phone}</p>
                                </div>
                            </a>

                            <div className="flex flex-col items-center gap-4 group/item">
                                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-emerald-500 group-hover/item:bg-emerald-600 group-hover/item:text-white transition-all shadow-2xl duration-500">
                                    <Globe size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">البريد الرسمي</p>
                                    <p className="text-white font-black text-xl tracking-tighter">{landingConfig.contact.email}</p>
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-4 group/item">
                                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-amber-500 group-hover/item:bg-amber-600 group-hover/item:text-white transition-all shadow-2xl duration-500">
                                    <LayoutGrid size={32} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">موقعنا الرئيسي</p>
                                    <p className="text-white font-black text-xl tracking-tighter">{landingConfig.contact.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ─── Main Component ───────────────────────────────────────
const LandingPage = () => {
    const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const { onLogin } = useAuth();

    useEffect(() => {
        document.body.classList.add('landing-page-active');
        return () => {
            document.body.classList.remove('landing-page-active');
        };
    }, []);

    const handleInstantDemo = async (type) => {
        setDemoLoading(true);
        try {
            const res = await api.post('/demo-login', { type });
            const userData = { ...res.data.user, is_demo: true };
            onLogin(res.data.token, userData, res.data.slug);
            toast.success(`مرحباً بك في ديمو الـ ${type === 'restaurant' ? 'مطاعم' : type === 'supermarket' ? 'سوبر ماركت' : 'صيدليات'}`);
        } catch (err) {
            toast.error('حدث خطأ أثناء تشغيل الديمو. يرجى المحاولة لاحقاً.');
        } finally {
            setDemoLoading(false);
        }
    };

    return (
        <div className="landing-root min-h-screen overflow-x-hidden bg-slate-950">
            <Navbar />
            <main>
                <Hero onOpenDemo={() => setIsDemoModalOpen(true)} />
                <Features />
                
                <div className="max-w-7xl mx-auto px-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                </div>

                <About />
                <Contact />

                <section className="py-60 text-center relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 blur-[150px] -z-10 rounded-full"></div>
                    <div className="max-w-5xl mx-auto px-6 space-y-12 relative z-10">
                        <h2 className="text-6xl md:text-7xl font-black text-white leading-none tracking-[ -0.05em]">
                            ابدأ <span className="text-blue-600">الآن.</span>
                        </h2>
                        <p className="text-slate-400 text-2xl font-medium max-w-2xl mx-auto">
                            كن من الرواد في إدارة تجارتك بنظام ذكي، سريع، وآمن. انضم إلى عائلة CashPOS اليوم.
                        </p>
                        <div className="pt-6">
                            <button 
                                onClick={() => setIsDemoModalOpen(true)}
                                className="px-16 py-6 bg-white text-slate-950 font-black rounded-[2.5rem] text-xl hover:scale-105 hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-[0_30px_60px_rgba(255,255,255,0.1)] active:scale-95"
                            >
                                اطلب تجربتك المجانية
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-24 border-t border-white/5 bg-slate-950/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 items-center gap-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                            <Zap size={22} className="text-white fill-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white uppercase">CASHPOS</span>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2 leading-loose">
                            &copy; 2026 CashPOS Management System <br />
                            Advanced Enterprise Solutions
                        </p>
                    </div>

                    <div className="flex justify-end gap-8 text-slate-500">
                        <a href="#" className="hover:text-blue-500 transition-colors"><LayoutGrid size={22} /></a>
                        <a href="#" className="hover:text-blue-500 transition-colors"><Database size={22} /></a>
                        <a href="#" className="hover:text-blue-500 transition-colors"><ShieldCheck size={22} /></a>
                    </div>
                </div>
            </footer>

            {/* Instant Demo Modal */}
            <AnimatePresence>
                {isDemoModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !demoLoading && setIsDemoModalOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg glass-card p-8 rounded-[2rem] border border-white/10 shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <h3 className="text-3xl font-black text-white mb-2">اختر نوع النشاط</h3>
                                <p className="text-slate-400">استكشف النظام ببيانات تجريبية مخصصة لعملك</p>
                            </div>

                            <div className="grid gap-4">
                                {[
                                    { id: 'restaurant', label: 'مطعم / كافيه', icon: '🍔', desc: 'إدارة طاولات، منيو، ومطبخ' },
                                    { id: 'supermarket', label: 'سوبر ماركت', icon: '🛒', desc: 'باركود، جرد سريع، وموردين' },
                                    { id: 'pharmacy', label: 'صيدلية', icon: '💊', desc: 'تواريخ انتهاء، وبحث طبي' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        disabled={demoLoading}
                                        onClick={() => handleInstantDemo(item.id)}
                                        className="group flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-right disabled:opacity-50"
                                    >
                                        <span className="text-4xl">{item.icon}</span>
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{item.label}</h4>
                                            <p className="text-sm text-slate-500">{item.desc}</p>
                                        </div>
                                        <ChevronLeft size={20} className="text-slate-600 group-hover:text-blue-400 transition-all transform group-hover:-translate-x-1" />
                                    </button>
                                ))}
                            </div>

                            {demoLoading && (
                                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                                    <p className="text-white font-bold animate-pulse">جاري تحضير بيئة التجربة...</p>
                                </div>
                            )}

                            <button 
                                onClick={() => setIsDemoModalOpen(false)}
                                className="w-full mt-6 py-3 text-slate-500 hover:text-white transition-colors text-sm font-semibold"
                            >
                                إغلاق
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LandingPage;
