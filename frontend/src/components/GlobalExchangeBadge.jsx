import React, { useState, useEffect } from 'react';
import api from '../api';
import { DollarSign, RefreshCw, Check, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useParams } from 'react-router-dom';
import { toastSuccess, alertError } from '../utils/swal';

const GlobalExchangeBadge = () => {
    const { user, isAdmin, isAuthenticated, isLoading: authLoading } = useAuth();
    const { slug: urlSlug } = useParams();
    const [rate, setRate] = useState(1);
    const [isEditing, setIsEditing] = useState(false);
    const [tempRate, setTempRate] = useState('');
    const [loading, setLoading] = useState(false);

    // Prioritize slug from URL, fallback to user's store slug if applicable
    const slug = urlSlug || user?.store?.slug;

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchRate();
        }
    }, [isAuthenticated, authLoading, slug]);

    const fetchRate = async () => {
        try {
            const url = slug ? `/${slug}/settings` : '/settings';
            const res = await api.get(url);
            setRate(res.data.exchange_rate || 1);
        } catch (err) {
            console.error('Failed to fetch exchange rate', err);
        }
    };

    const handleSave = async () => {
        const newRate = parseFloat(tempRate);
        if (!newRate || newRate <= 0) return;

        setLoading(true);
        try {
            const url = slug ? `/${slug}/settings/update-exchange` : '/settings/update-exchange';
            await api.post(url, { rate: newRate });
            
            // Optimistic UI update
            setRate(newRate);
            setIsEditing(false);
            
            const storeName = user?.store?.name || 'المتجر';
            toastSuccess(`تم تحديث سعر صرف الدولار لمتجر [${storeName}] بنجاح 💹`);
            
            // Optional: trigger a global event or refresh to update prices elsewhere
            window.dispatchEvent(new CustomEvent('exchangeRateUpdated', { detail: newRate }));
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || 'فشل تحديث سعر الصرف';
            alertError('خطأ في النظام', msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin && !rate) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/50 border border-slate-700/50 group transition-all hover:bg-slate-800">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <DollarSign size={14} className="text-emerald-400" />
            </div>
            
            {isEditing ? (
                <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                    <input
                        autoFocus
                        type="number"
                        value={tempRate}
                        onChange={(e) => setTempRate(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        placeholder="سعر الصرف..."
                        className="w-20 bg-slate-700 border-none rounded-lg px-2 py-0.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button 
                        onClick={handleSave} 
                        disabled={loading}
                        className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
                    >
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : <Check size={14} />}
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 font-bold leading-none mb-0.5">سعر الصرف</span>
                        <span className="text-xs font-extrabold text-white leading-none">
                            {Number(rate).toLocaleString()} ل.س
                        </span>
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => { setTempRate(rate); setIsEditing(true); }}
                            className="p-1 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-all ml-1"
                        >
                            <Edit2 size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalExchangeBadge;
