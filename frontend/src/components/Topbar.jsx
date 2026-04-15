import React from 'react';
import { User, Search, Settings, HelpCircle } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../context/AuthContext';

const Topbar = () => {
    const { user } = useAuth();

    return (
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm shadow-slate-200/20">
            {/* Left side: Empty */}
            <div className="flex-1" />

            {/* Right side: Actions (Empty for now) */}
            <div className="flex items-center gap-2 md:gap-4" />
        </header>
    );
};

export default Topbar;
