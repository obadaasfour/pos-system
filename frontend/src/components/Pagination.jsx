import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable Pagination component for Laravel paginated responses.
 * 
 * @param {Object} pagination - Laravel pagination object
 * @param {Function} onPageChange - Callback when a page is clicked
 */
const Pagination = ({ pagination, onPageChange }) => {
    if (!pagination || pagination.last_page <= 1) return null;

    const { current_page, last_page, from, to, total } = pagination;

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, current_page - Math.floor(maxVisible / 2));
        let end = Math.min(last_page, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-slate-50 border-t border-slate-200" dir="rtl">
            {/* Pagination Info */}
            <div className="text-sm text-slate-500 font-medium">
                عرض <span className="font-bold text-slate-700">{from || 0}</span> إلى <span className="font-bold text-slate-700">{to || 0}</span> من أصل <span className="font-bold text-slate-700">{total}</span> عنصر
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        current_page === 1 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600'
                    }`}
                >
                    <ChevronRight size={18} /> التالي
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1 mx-2">
                    {getPageNumbers().map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                                current_page === page
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600'
                            }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                        current_page === last_page 
                        ? 'text-slate-300 cursor-not-allowed' 
                        : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-blue-600'
                    }`}
                >
                    السابق <ChevronLeft size={18} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
