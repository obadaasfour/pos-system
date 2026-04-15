import React, { useState, useEffect } from 'react';
import { 
    Database, Download, Shield, AlertCircle, 
    CheckCircle, Loader2, Settings, Server, Users,
    QrCode, Globe, Copy, ExternalLink, RefreshCcw
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { toastSuccess } from '../utils/swal';

const SettingsPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); 
    const [storeSlug, setStoreSlug] = useState(user?.store?.slug || '');
    const [publicUrl, setPublicUrl] = useState('');

    useEffect(() => {
        const fetchIp = async () => {
            try {
                const res = await api.get('/settings/server-ip');
                const port = window.location.port && window.location.port !== '80' ? `:${window.location.port}` : '';
                setPublicUrl(`http://${res.data.ip}${port}/menu/${user?.store?.slug || storeSlug}`);
            } catch (err) {
                const host = window.location.origin;
                setPublicUrl(`${host}/menu/${user?.store?.slug || storeSlug}`);
            }
        };
        fetchIp();
    }, [user, storeSlug]);

    const handleBackup = async () => {
        setLoading(true);
        setStatus(null);
        try {
            const response = await api.get('/backup', { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/sql' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            link.setAttribute('download', `pos_backup_${timestamp}.sql`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            setStatus({ type: 'success', text: 'تم تحميل النسخة الاحتياطية بنجاح!' });
        } catch (err) {
            setStatus({ type: 'error', text: 'فشل في تحميل النسخة الاحتياطية.' });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(publicUrl);
        toastSuccess('تم نسخ الرابط بنجاح! 📋');
    };

    const downloadQR = () => {
        const canvas = document.getElementById('store-qr');
        const url = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.download = `qr-menu-${storeSlug}.png`;
        link.href = url;
        link.click();
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-blue-100">
                    <Settings size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 leading-tight">إعدادات المنصة</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1 opacity-60">SaaS Platform Configuration</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* QR Menu Section */}
                <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden flex flex-col h-full hover:shadow-2xl transition-all duration-300">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                                <QrCode size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">نظام الـ QR Menu</h2>
                        </div>
                        <Globe className="text-slate-300" size={24} />
                    </div>
                    
                    <div className="p-8 flex-1 space-y-8 flex flex-col items-center">
                        <div className="relative group p-4 bg-white rounded-[32px] shadow-inner border-2 border-slate-50">
                            <QRCodeCanvas 
                                id="store-qr"
                                value={publicUrl} 
                                size={200}
                                level={"H"}
                                includeMargin={true}
                                className="rounded-2xl"
                            />
                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all rounded-[32px] pointer-events-none" />
                        </div>

                        <div className="w-full space-y-4">
                            <div className="text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[4px] mb-2">رابط المنيو العام</p>
                                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 pr-4 shadow-sm">
                                    <span className="flex-1 text-[10px] font-mono font-bold text-slate-600 truncate text-left" dir="ltr">
                                        {publicUrl}
                                    </span>
                                    <button 
                                        onClick={copyToClipboard}
                                        className="p-2.5 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm group"
                                        title="نسخ الرابط"
                                    >
                                        <Copy size={16} />
                                    </button>
                                    <a 
                                        href={publicUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-xs flex items-center gap-2"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                </div>
                            </div>

                            <button 
                                onClick={downloadQR}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                            >
                                <Download size={18} />
                                تحميل رمز QR للطباعة
                            </button>
                        </div>

                        <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex gap-4 items-start w-full">
                            <Shield className="text-blue-600 shrink-0 mt-1" size={20} />
                            <p className="text-xs text-blue-800 font-bold leading-relaxed">
                                هذا الكود يوجه الزبائن تلقائياً إلى قائمة المنتجات المتوفرة لمتجرك فقط. يمكنك طباعته ووضعه على الطاولات.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Backup Section */}
                <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden h-full flex flex-col hover:shadow-2xl transition-all duration-300">
                    <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                                <Database size={24} />
                            </div>
                            <h2 className="text-xl font-black text-slate-800">النسخ الاحتياطي</h2>
                        </div>
                        <Server className="text-slate-300" size={24} />
                    </div>
                    
                    <div className="p-8 flex-1 space-y-8 flex flex-col">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-50 rounded-[28px] shadow-inner flex items-center justify-center text-blue-600">
                                <Download size={40} className="animate-pulse" />
                            </div>
                            <h3 className="text-base font-black text-slate-800">تأمين قاعدة البيانات</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-bold max-w-xs">
                                سيتم تحميل ملف SQL يحتوي على جميع الحركات المالية والمخزون. ينصح بالقيام بهذه الخطوة نهاية كل يوم عمل.
                            </p>
                        </div>

                        <div className="flex-1" />

                        <button 
                            onClick={handleBackup}
                            disabled={loading}
                            className={`
                                w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95
                                ${loading 
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-100 hover:shadow-amber-200'
                                }
                            `}
                        >
                            {loading ? (
                                <RefreshCcw size={20} className="animate-spin" />
                            ) : (
                                <Download size={20} />
                            )}
                            حفظ نسخة احتياطية الآن
                        </button>

                        {status && (
                            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
                                status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                            }`}>
                                {status.type === 'success' ? <CheckCircle size={18}/> : <AlertCircle size={18}/>}
                                <span className="font-bold text-xs">{status.text}</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Inactive Settings Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50 select-none">
                {['إعدادات الفاتورة', 'إدارة الضرائب', 'توصيل الطابعة', 'الأذونات'].map(label => (
                    <div key={label} className="bg-white p-5 rounded-[28px] border border-slate-200 flex flex-col items-center justify-center gap-3 text-center border-dashed">
                        <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
                            <PlusCircle size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-tight">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PlusCircle = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="M8 12h8" />
    </svg>
);

export default SettingsPage;
