import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { 
    FileText, Search, Trash2, Edit2, 
    RefreshCw, Calendar, User, DollarSign,
    CheckCircle, XCircle, Clock, Download
} from 'lucide-react';
import { generateInvoice } from '../utils/invoiceGenerator';
import useDebounce from '../hooks/useDebounce';
import Pagination from '../components/Pagination';
import { confirmDialog, toastError } from '../utils/swal';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

const InvoicesPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const currentStore = user?.store;
    const [invoices, setInvoices] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        fetchInvoices(1, debouncedSearch);
    }, [debouncedSearch]);

    const fetchInvoices = async (page = 1, search = '') => {
        setLoading(true);
        try {
            const res = await api.get(`/sales?page=${page}&search=${search}`);
            setInvoices(res.data.data);
            setPagination(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await confirmDialog(
            'حذف الفاتورة',
            'سيتم إرجاع الكميات للمخزون وخصم المبلغ من الخزينة. هل أنت متأكد؟',
            'warning'
        );
        if (!result.isConfirmed) return;
        try {
            await api.delete(`/sales/${id}`);
            fetchInvoices(pagination?.current_page || 1, debouncedSearch);
        } catch (err) {
            toastError('خطأ أثناء حذف الفاتورة');
        }
    };

    const handlePrint = async (invoice) => {
        const itemsForPrint = (invoice?.items || []).map(item => ({
            ...item.product,
            quantity: item.quantity,
            price: item.unit_price
        }));
        await generateInvoice(invoice, itemsForPrint, currentStore);
    };

    // Footer totals for current page
    const pageTotal = invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden" dir="rtl">
            {/* Mega Header for Invoices */}
            <div className="p-8 pb-4 shrink-0">
                <div className="bg-white/70 backdrop-blur-md rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/60 p-6 flex flex-col md:flex-row justify-between items-center gap-6 transition-all hover:shadow-slate-300/50">
                    <div className="flex items-center gap-6 mr-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-slate-200 ring-4 ring-slate-50">
                            <FileText size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tight">سجل الفواتير</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                                متابعة المبيعات، المدفوعات والعمليات السابقة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50/50 p-2 rounded-[2rem] border border-slate-100 w-full md:w-auto">
                        <div className="relative flex-1 md:w-96">
                            <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="ابحث برقم الفاتورة، العميل، أو الموظف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border-2 border-transparent focus:border-indigo-400 rounded-2xl py-3 pr-12 pl-4 text-sm font-extrabold shadow-sm outline-none transition-all placeholder:text-slate-300"
                            />
                        </div>
                        <button 
                            onClick={() => fetchInvoices(pagination?.current_page || 1, debouncedSearch)} 
                            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
                            title="تحديث البيانات"
                        >
                            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-8 pt-4">
                <div 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                    style={{ height: 'calc(100vh - 200px)' }}
                >
                    {invoices.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 flex-1">
                            <FileText size={64} className="mb-4 opacity-20" />
                            <p className="font-medium text-slate-400">لا توجد فواتير مطابقة</p>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div className="overflow-x-auto flex-1 overflow-y-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4">رقم الفاتورة</th>
                                            <th className="px-6 py-4">تاريخ الإنشاء</th>
                                            <th className="px-6 py-4">بواسطة</th>
                                            <th className="px-6 py-4">الإجمالي</th>
                                            <th className="px-6 py-4">الحالة</th>
                                            <th className="px-6 py-4 text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-slate-800">#INV-{inv.id}</span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar size={14} className="text-slate-300" />
                                                        {new Date(inv.created_at).toLocaleString('ar-SY', { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                                                            <User size={14} />
                                                        </div>
                                                        <span className="font-medium">{inv.user?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-extrabold text-blue-600">{formatPrice(inv.total_amount)}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 w-fit">
                                                        <CheckCircle size={10} /> مكتملة
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handlePrint(inv)}
                                                            title="طباعة"
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        {isAdmin && (
                                                            <button 
                                                                title="تعديل"
                                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleDelete(inv.id)}
                                                            title="حذف"
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                    {/* Feature 6: Footer with page total */}
                                    <tfoot className="sticky bottom-0 z-10 bg-blue-50 border-t-2 border-blue-200">
                                        <tr>
                                            <td colSpan={3} className="px-6 py-3">
                                                <span className="text-xs font-bold text-blue-700">
                                                    إجمالي الصفحة الحالية ({invoices.length} فاتورة)
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="text-sm font-black text-blue-700">{formatPrice(pageTotal)}</span>
                                                <p className="text-[10px] text-slate-400">مجموع المبيعات</p>
                                            </td>
                                            <td colSpan={2} className="px-6 py-3"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {!loading && pagination && (
                                <div className="shrink-0 border-t border-slate-200">
                                    <Pagination 
                                        pagination={pagination} 
                                        onPageChange={(page) => fetchInvoices(page, debouncedSearch)} 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoicesPage;
