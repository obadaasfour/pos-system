import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { 
    X, Printer, Save, CheckCircle, 
    AlertCircle, Receipt, User, Wallet, Loader2, Search, Plus, UserPlus, Phone, MapPin
} from 'lucide-react';
import { toastSuccess, alertError, toastWarning } from '../utils/swal';

const CheckoutModal = ({ isOpen, onClose, onConfirm, total, totalUsd, loading, initialCustomer }) => {
    const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, credit
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(initialCustomer || null);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [isAddingNew, setIsAddingNew] = useState(false);
    
    // حالة المبالغ المستلمة والباقي
    const [receivedAmount, setReceivedAmount] = useState('');
    const [change, setChange] = useState(0);
    
    // حالة العميل الجديد
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
    const [addingLoader, setAddingLoader] = useState(false);

    const dropdownRef = useRef(null);
    const receivedAmountRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            setPaymentMethod('cash');
            setSelectedCustomer(initialCustomer || null);
            setCustomerSearchTerm('');
            setIsAddingNew(false);
            setNewCustomer({ name: '', phone: '', address: '' });
            setReceivedAmount('');
            setChange(0);
            
            // Auto focus received amount
            setTimeout(() => {
                receivedAmountRef.current?.focus();
            }, 300);
        }
    }, [isOpen, initialCustomer]);

    useEffect(() => {
        if (paymentMethod === 'cash') {
            receivedAmountRef.current?.focus();
        }
    }, [paymentMethod]);

    useEffect(() => {
        const received = parseFloat(receivedAmount) || 0;
        setChange(Math.max(0, received - total));
    }, [receivedAmount, total]);

    // إغلاق القائمة عند الضغط خارجها
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (err) {
            console.error("Error fetching customers:", err);
        }
    };

    const handleAddNewCustomer = async (e) => {
        e.preventDefault();
        if (!newCustomer.name) return;
        
        setAddingLoader(true);
        try {
            const res = await api.post('/customers', newCustomer);
            const created = res.data;
            setCustomers(prev => [created, ...prev]);
            setSelectedCustomer(created);
            setIsAddingNew(false);
            setNewCustomer({ name: '', phone: '', address: '' });
            toastSuccess('تمت إضافة العميل وضمه للفاتورة 👤');
        } catch (err) {
            console.error(err);
            alertError("خطأ في الإضافة", err.response?.data?.message || "تأكد من بيانات العميل");
        } finally {
            setAddingLoader(false);
        }
    };

    if (!isOpen) return null;

    const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
        (c.phone && c.phone.includes(customerSearchTerm))
    );

    const handleConfirm = (print) => {
        if (paymentMethod === 'credit' && !selectedCustomer) {
            toastWarning('يجب اختيار عميل للبيع الآجل ⚠️');
            return;
        }
        onConfirm(
            print, 
            paymentMethod, 
            selectedCustomer?.id, 
            Number(Math.max(parseFloat(receivedAmount) || 0, total)), 
            Number(change)
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" dir="rtl">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-6 text-white text-center relative shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                        <X size={18} />
                    </button>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                        <Receipt size={28} />
                    </div>
                    <h2 className="text-xl font-black">إتمام عملية البيع</h2>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex justify-between items-center shrink-0">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">المبلغ الإجمالي</p>
                            <div className="flex flex-col">
                                <p className="text-2xl font-black text-slate-800 mt-0.5">{formatPrice(total)}</p>
                                {totalUsd > 0 && (
                                    <p className="text-xs font-bold text-emerald-600 mt-1">
                                        (${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} مخطط)
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                            <CheckCircle size={22} />
                        </div>
                    </div>

                    {/* Payment Method Switcher */}
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                        >
                            <Wallet size={20} />
                            <span className="font-bold text-sm">دفع نقدي</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('credit')}
                            className={`flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'credit' ? 'border-amber-600 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                        >
                            <User size={20} />
                            <span className="font-bold text-sm">بيع آجل (ذمم)</span>
                        </button>
                    </div>

                    {/* Received Amount & Change (Only for Cash) */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">المبلغ المستلم</label>
                                    <input 
                                        ref={receivedAmountRef}
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 font-black text-xl text-blue-700 focus:border-blue-500 outline-none transition-all shadow-sm"
                                        value={receivedAmount}
                                        onChange={(e) => setReceivedAmount(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">الباقي (الفراطة)</label>
                                    <div className="w-full bg-slate-100 border-2 border-transparent rounded-2xl p-4 font-black text-xl text-emerald-600 flex items-center">
                                        {formatPrice(change)}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="grid grid-cols-4 gap-2">
                                {[5000, 10000, 25000, 50000].map(val => (
                                    <button 
                                        key={val}
                                        onClick={() => setReceivedAmount(val.toString())}
                                        className="py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-95 shadow-sm"
                                    >
                                        {val.toLocaleString('ar-SY')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Customer Selection */}
                    {paymentMethod === 'credit' && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-500 uppercase">معلومات العميل</label>
                                {!isAddingNew && !selectedCustomer && (
                                    <button onClick={() => setIsAddingNew(true)} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline">
                                        <Plus size={14} /> إضافة عميل جديد
                                    </button>
                                )}
                            </div>

                            {isAddingNew ? (
                                <div className="bg-blue-50/50 border-2 border-blue-100 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-blue-800">إضافة عميل جديد</span>
                                        <button onClick={() => setIsAddingNew(false)} className="text-slate-400 hover:text-rose-500"><X size={16}/></button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input type="text" placeholder="اسم العميل *" className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                                        <input type="text" placeholder="رقم الهاتف" className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                                        <input type="text" placeholder="العنوان" className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm focus:border-blue-500 outline-none" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                                    </div>
                                    <button onClick={handleAddNewCustomer} disabled={addingLoader || !newCustomer.name} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                        {addingLoader ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16}/> حفظ واختيار</>}
                                    </button>
                                </div>
                            ) : selectedCustomer ? (
                                <div className="flex items-center justify-between p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl animate-in zoom-in-95">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-amber-600 text-white rounded-xl flex items-center justify-center font-black">{selectedCustomer.name[0]}</div>
                                        <div>
                                            <p className="font-extrabold text-amber-900 text-sm">{selectedCustomer.name}</p>
                                            <p className="text-[10px] text-amber-700 font-bold tracking-tight">الدين الحالي: {formatPrice(selectedCustomer.total_debt)}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedCustomer(null)} className="text-amber-800 hover:bg-amber-100 p-2 rounded-xl transition-colors"><X size={18} /></button>
                                </div>
                            ) : (
                                <div className="relative" ref={dropdownRef}>
                                    <div className="relative">
                                        <input 
                                            type="text"
                                            placeholder="ابحث بالاسم أو الرقم (مثل: عبادة)..."
                                            className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 pr-12 focus:border-blue-500 outline-none transition-all font-bold text-sm shadow-sm"
                                            value={customerSearchTerm}
                                            onChange={(e) => { setCustomerSearchTerm(e.target.value); setShowDropdown(true); }}
                                            onFocus={() => setShowDropdown(true)}
                                        />
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                    </div>
                                    
                                    {showDropdown && customerSearchTerm && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[110] max-h-52 overflow-y-auto p-2 animate-in slide-in-from-top-2">
                                            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                                                <div key={c.id} onClick={() => { setSelectedCustomer(c); setShowDropdown(false); setCustomerSearchTerm(''); }} className="p-3 hover:bg-blue-50 rounded-xl cursor-pointer flex justify-between items-center group transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            <User size={14} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                                            {c.phone && <p className="text-[10px] text-slate-400">{c.phone}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-600">دين: {formatPrice(c.total_debt)}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="p-4 text-center">
                                                    <p className="text-xs text-slate-400 mb-2">لا يوجد نتائج...</p>
                                                    <button onClick={() => { setNewCustomer({...newCustomer, name: customerSearchTerm}); setIsAddingNew(true); setShowDropdown(false); }} className="text-blue-600 text-xs font-bold underline">إضافة "{customerSearchTerm}" كعميل جديد؟</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button 
                            onClick={() => handleConfirm(false)} 
                            disabled={loading || (paymentMethod === 'credit' && !selectedCustomer)} 
                            className="group flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {loading && paymentMethod === 'cash' ? <Loader2 size={18} className="animate-spin text-slate-400" /> : <Save size={18} className="text-slate-400 group-hover:text-slate-600" />}
                            <span className="font-bold text-slate-700 text-sm">حفظ فقط</span>
                        </button>
                        <button 
                            onClick={() => handleConfirm(true)} 
                            disabled={loading || (paymentMethod === 'credit' && !selectedCustomer)} 
                            className="group flex items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                            <span className="font-bold text-sm">حفظ وطباعة</span>
                        </button>
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                    <p className="text-[9px] text-slate-400 flex items-center justify-center gap-1.5 font-bold">
                        <AlertCircle size={10} /> 
                        {paymentMethod === 'cash' ? "سيتم إضافة المبلغ لسيولة الصندوق" : "الفاتورة ستحمل على حساب العميل (ذمم)"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
