import React from 'react';
import { Menu } from 'lucide-react';

const Topbar = ({ onMenuClick }) => {
    return (
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm transition-colors duration-300">
            <button 
                onClick={onMenuClick}
                className="p-2 mr-2 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
            >
                <Menu size={24} />
            </button>
            
            {/* Left side: Empty */}
            <div className="flex-1" />
        </header>
    );
};

export default Topbar;
