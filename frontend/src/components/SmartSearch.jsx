import React, { useState, useEffect, useRef } from 'react';
import { Search, Barcode, X } from 'lucide-react';

/**
 * SmartSearch component that handles both name search and rapid barcode scanning.
 */
const SmartSearch = ({ 
    products, 
    onSelect, 
    onScan, 
    placeholder = "ابحث بالاسم أو الباركود...", 
    autoFocus = true,
    permanentFocus = false,
    className = ""
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef(null);
    const lastInputTime = useRef(0);

    // Keep focus logic
    useEffect(() => {
        const focusInput = () => {
            if (inputRef.current) inputRef.current.focus();
        };

        if (autoFocus || permanentFocus) focusInput();

        if (permanentFocus) {
            window.addEventListener('focus', focusInput);
            return () => window.removeEventListener('focus', focusInput);
        }
    }, [autoFocus, permanentFocus]);

    const handleBlur = () => {
        if (permanentFocus) {
            // Immediate re-focus attempt if someone tries to blur it,
            // but wrapped in a check to ensure we're not fighting a legitimate window blur
            setTimeout(() => {
                if (permanentFocus && inputRef.current) {
                    inputRef.current.focus();
                }
            }, 50);
        }
        setTimeout(() => setIsOpen(false), 200);
    };


    const handleInputChange = (e) => {
        const value = e.target.value;
        const now = Date.now();
        const diff = now - lastInputTime.current;
        lastInputTime.current = now;

        setQuery(value);
        setIsOpen(true);

        // Barcode reader logic: if typing is extremely fast (usually < 50ms per char)
        // or the value looks like a specific barcode format while typing.
        // But for most POS scanners, they append a carriage return (Enter).
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (query.trim()) {
                // Try to find exact barcode match first
                const exactMatch = products.find(p => p.barcode === query.trim());
                if (exactMatch) {
                    onScan ? onScan(exactMatch) : onSelect(exactMatch);
                    setQuery('');
                    setIsOpen(false);
                } else if (filtered.length === 1) {
                    onSelect(filtered[0]);
                    setQuery('');
                    setIsOpen(false);
                }
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const filtered = query.trim() === '' 
        ? [] 
        : products.filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) || 
            (p.barcode && p.barcode.includes(query))
        ).slice(0, 8);

    return (
        <div className={`relative ${className}`}>
            <div className="relative group">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Search size={18} />
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-4 text-sm focus:ring-2 focus:ring-blue-400 focus:bg-white focus:border-transparent outline-none transition-all shadow-sm font-medium"
                />
                <div className="absolute inset-y-0 left-3 flex items-center gap-2">
                    {query && (
                        <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={14} />
                        </button>
                    )}
                    <Barcode size={16} className="text-slate-300" />
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="py-2">
                        {filtered.map(p => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    onSelect(p);
                                    setQuery('');
                                    setIsOpen(false);
                                }}
                                className="w-full text-right px-4 py-3 hover:bg-blue-50 flex items-center justify-between group transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm group-hover:text-blue-700">{p.name}</span>
                                    {p.barcode && <span className="text-[10px] text-slate-400 font-mono">{p.barcode}</span>}
                                </div>
                                <div className="text-left">
                                    <span className="text-xs font-extrabold text-blue-600">{Number(p.price).toLocaleString()} ل.س</span>
                                    <p className="text-[10px] text-slate-400">{p.stock_quantity} متوفر</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartSearch;
