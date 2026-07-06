import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    Users, Search, Wallet, Plus, CreditCard, 
    History, Phone, MapPin, Loader2, CheckCircle, X, Printer, Calendar
} from 'lucide-react';
import { generatePaymentReceipt } from '../utils/invoiceGenerator';
import { toastSuccess, alertError } from '../utils/swal';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

const DebtLedgerPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [settleAmount, setSettleAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
    
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchPaymentHistory = async (customer) => {
        setSelectedCustomer(customer);
        setShowHistoryModal(true);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/customers/${customer.id}/payments`);
            setPaymentHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.phone && c.phone.includes(searchTerm))
    );

    const handleSettle = async (e) => {
        e.preventDefault();
        if (!selectedCustomer) return;
        
        setIsProcessing(true);
        try {
            await api.post(`/customers/${selectedCustomer.id}/settle`, { 
                amount: settleAmount,
                description: 'تسديد من خلال دفتر الديون'
            });
            setShowModal(false);
            setSettleAmount('');
            setSelectedCustomer(null);
            fetchCustomers();
            toastSuccess('تم تسديد المبلغ بنجاح ✅');
        } catch (err) {
            console.error(err);
            alertError('فشل التسديد', err.response?.data?.message || 'تعذر إتمام عملية التسديد');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            await api.post('/customers', newCustomer);
            setShowAddCustomer(false);
            setNewCustomer({ name: '', phone: '', address: '' });
            fetchCustomers();
            toastSuccess('تمت إضافة العميل بنجاح 👤');
        } catch (err) {
            console.error(err);
            alertError('خطأ في الإضافة', 'فشل إضافة العميل، يرجى التحقق من البيانات');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="p-8 space-y-8 bg-slate-100 min-h-full font-sans" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">دفتر الديون 📔</h1>
                    <p className="text-slate-500 font-medium">متابعة حسابات العملاء والبيع الآجل</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => setShowAddCustomer(true)}
                        className="flex items-center gap-2 bg-white text-slate-700 border-2 border-slate-200 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        <span>إضافة عميل جديد</span>
                    </button>
                    <div className="relative w-64">
                        <input 
                            type="text"
                            placeholder="بحث عن عميل..."
                            className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 pr-10 outline-none focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Users size={24} /></div>
                        <span className="font-bold text-slate-500">إجمالي العملاء</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">{customers.length} عميل</h2>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-8 border-r-rose-500">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center"><CreditCard size={24} /></div>
                        <span className="font-bold text-slate-500">بانتظار التحصيل</span>
                    </div>
                    <h2 className="text-2xl font-black text-rose-600">
                        {formatPrice(customers.reduce((s, c) => s + Number(c.total_debt), 0))}
                    </h2>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm border-r-8 border-r-emerald-500">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center"><Wallet size={24} /></div>
                        <span className="font-bold text-slate-500">أكبر مدين</span>
                        {customers.length > 0 && (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                                {customers.reduce((a, b) => (Number(a.total_debt) > Number(b.total_debt) ? a : b)).name}
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-black text-emerald-700">تحصيل الديون</h2>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-5">العميل</th>
                            <th className="px-6 py-5">المعلومات</th>
                            <th className="px-6 py-5">إجمالي الدين</th>
                            <th className="px-6 py-5 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredCustomers.length === 0 && !loading ? (
                            <tr><td colSpan="4" className="py-20 text-center text-slate-400">لا يوجد عملاء مديونين</td></tr>
                        ) : filteredCustomers.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/80 transition-all">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 rounded-xl flex items-center justify-center font-bold text-lg">
                                            {c.name[0]}
                                        </div>
                                        <span className="font-black text-slate-700 text-lg">{c.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2"><Phone size={14} />{c.phone || 'بدون رقم'}</div>
                                        <div className="flex items-center gap-2"><MapPin size={14} />{c.address || 'بدون عنوان'}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-4 py-1.5 rounded-2xl font-black text-lg ${Number(c.total_debt) > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {formatPrice(c.total_debt)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                            disabled={Number(c.total_debt) <= 0}
                                            onClick={() => { setSelectedCustomer(c); setShowModal(true); }}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-30 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <Wallet size={16} />
                                            تسديد
                                        </button>
                                        <button 
                                            onClick={() => fetchPaymentHistory(c)}
                                            className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                                        >
                                            <History size={16} />
                                            السجل
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Settle Debt Modal */}
            {showModal && selectedCustomer && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800">تسديد مبلغ دَين</h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400" /></button>
                        </div>
                        
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
                            <p className="text-xs text-amber-600 font-bold mb-1 uppercase tracking-wider">العميل</p>
                            <p className="text-xl font-black text-amber-900">{selectedCustomer.name}</p>
                            <div className="flex justify-between mt-2 pt-2 border-t border-amber-200">
                                <span className="text-sm font-bold text-amber-800">الدين المتبقي:</span>
                                <span className="font-black text-amber-900">{formatPrice(selectedCustomer.total_debt)}</span>
                            </div>
                        </div>

                        <form onSubmit={handleSettle} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">المبلغ المراد تسديده</label>
                                <div className="relative">
                                    <input 
                                        type="number"
                                        required
                                        autoFocus
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 focus:border-blue-500 outline-none transition-all font-black text-xl"
                                        value={settleAmount}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        max={selectedCustomer.total_debt}
                                    />
                                    <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing || !settleAmount}
                                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg"
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle size={20} /> حفظ التسديد</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Customer Modal */}
            {showAddCustomer && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800">إضافة عميل جديد</h2>
                            <button onClick={() => setShowAddCustomer(false)}><X className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAddCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">اسم العميل</label>
                                <input 
                                    type="text" required 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 outline-none focus:border-blue-500 font-bold"
                                    value={newCustomer.name}
                                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">رقم الهاتف</label>
                                <input 
                                    type="text"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 outline-none focus:border-blue-500 font-bold"
                                    value={newCustomer.phone}
                                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1">العنوان</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3.5 outline-none focus:border-blue-500 font-medium"
                                    rows="2"
                                    value={newCustomer.address}
                                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                                ></textarea>
                            </div>
                            <button 
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all mt-4"
                            >
                                {isProcessing ? <Loader2 className="animate-spin mx-auto" /> : "إضافة وحفظ"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Payment History Modal */}
            {showHistoryModal && selectedCustomer && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
                    <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                <History className="text-blue-500" />
                                سجل دفعات: {selectedCustomer.name}
                            </h2>
                            <button onClick={() => setShowHistoryModal(false)}><X className="text-slate-400" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            {historyLoading ? (
                                <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>
                            ) : paymentHistory.length === 0 ? (
                                <div className="py-20 text-center text-slate-400">لا يوجد سجل دفعات لهذا العميل</div>
                            ) : (
                                <table className="w-full text-right border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-sm font-bold text-slate-500">التاريخ</th>
                                            <th className="px-4 py-3 text-sm font-bold text-slate-500">المبلغ</th>
                                            <th className="px-4 py-3 text-sm font-bold text-slate-500">البيان</th>
                                            <th className="px-4 py-3 text-sm font-bold text-slate-500 text-center">الوصل</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paymentHistory.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4 text-sm font-medium text-slate-600">
                                                    <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {new Date(log.created_at).toLocaleDateString('ar-SY')}</div>
                                                </td>
                                                <td className="px-4 py-4 font-black text-emerald-600">{Number(log.amount).toLocaleString()} ل.س</td>
                                                <td className="px-4 py-4 text-sm text-slate-500">{log.description || 'تسديد دفعة'}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <button 
                                                        onClick={async () => await generatePaymentReceipt(log, selectedCustomer)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        title="طباعة وصل"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtLedgerPage;
