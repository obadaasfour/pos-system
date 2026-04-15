import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';
import SyncService from '../utils/SyncService';

const SyncIndicator = () => {
    const [stats, setStats] = useState({ pendingCount: 0, isOnline: navigator.onLine, isSyncing: false });

    useEffect(() => {
        // Initial load
        SyncService.getStats().then(setStats);
        
        // Listen for changes
        SyncService.addListener(setStats);
        
        const handleStatusChange = () => {
            SyncService.getStats().then(setStats);
        };

        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);

        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    const handleManualSync = () => {
        if (stats.isOnline && !stats.isSyncing) {
            SyncService.sync();
        }
    };

    return (
        <button 
            onClick={handleManualSync}
            disabled={stats.isSyncing || !stats.isOnline}
            className={`
                relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300
                ${stats.isSyncing 
                    ? 'bg-blue-50 border-blue-200 text-blue-600' 
                    : stats.isOnline 
                        ? (stats.pendingCount > 0 ? 'bg-amber-50 border-amber-200 text-amber-600 animate-pulse' : 'bg-green-50 border-green-200 text-green-600')
                        : 'bg-rose-50 border-rose-200 text-rose-600'
                }
            `}
            title={stats.isOnline ? (stats.pendingCount > 0 ? `بانتظار مزامنة ${stats.pendingCount} سجلات` : 'البيانات متزامنة ✅') : 'لا يوجد اتصال بالإنترنت ⚠️'}
        >
            {stats.isSyncing ? (
                <RefreshCw size={16} className="animate-spin" />
            ) : stats.isOnline ? (
                stats.pendingCount > 0 ? <UploadCloud size={16} /> : <Wifi size={16} />
            ) : (
                <WifiOff size={16} />
            )}
            
            <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider">
                    {stats.isSyncing ? 'جاري المزامنة...' : stats.isOnline ? 'متصل' : 'أوفلاين'}
                </span>
                {stats.pendingCount > 0 && (
                    <span className="text-[9px] font-bold opacity-80">
                        {stats.pendingCount} بانتظار الرفع
                    </span>
                )}
            </div>

            {stats.pendingCount > 0 && !stats.isSyncing && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
            )}
        </button>
    );
};

export default SyncIndicator;
