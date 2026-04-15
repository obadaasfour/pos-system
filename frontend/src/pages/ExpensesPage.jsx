import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    Banknote, Plus, Search, Calendar, 
    Trash2, AlertCircle, FileText, User 
} from 'lucide-react';
import { toastSuccess, alertError, confirmDialog } from '../utils/swal';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const categories = [
    { id: 'salary', label: 'راتب شهري', color: 'bg-blue-100 text-blue-700' },
    { id: 'advance', label: 'سلفة راتب', color: 'bg-amber-100 text-amber-700' },
    { id: 'penalty', label: 'خصم / عقوبة', color: 'bg-rose-100 text-rose-700' },
    { id: 'bonus', label: 'مكافأة', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'rent', label: 'إيجار المحل', color: 'bg-indigo-100 text-indigo-700' },
    { id: 'electricity', label: 'كهرباء / مياه', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'other', label: 'مصاريف أخرى', color: 'bg-slate-100 text-slate-700' },
];

const ExpensesPage = () => {
    const [expenses, setExpenses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    
    const [formData, setFormData] = useState({
        category: 'other',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        employee_id: ''
    });

    const isEmployeeCategory = ['salary', 'advance', 'penalty', 'bonus'].includes(formData.category);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [expRes, empRes] = await Promise.all([
                api.get('/expenses'),
                api.get('/employees')
            ]);
            setExpenses(expRes.data.data || []);
            setEmployees(empRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/expenses', {
                ...formData,
                employee_id: isEmployeeCategory ? formData.employee_id : null
            });
            setShowForm(false);
            setFormData({
                category: 'other',
                amount: '',
                date: new Date().toISOString().split('T')[0],
                notes: '',
                employee_id: ''
            });
            fetchData();
            toastSuccess('تم تسجيل المصروف بنجاح 💸');
        } catch (err) {
            console.error(err);
            alertError('خطأ تقني', 'حدث خطأ أثناء حفظ المصروف، يرجى المحاولة لاحقاً');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirmDialog(
            'حذف المصروف', 
            'هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ للصندوق.',
            'warning'
        );
        
        if (!confirmed.isConfirmed) return;

        try {
            await api.delete(`/expenses/${id}`);
            fetchData();
            toastSuccess('تم حذف المصروف بنجاح ✅');
        } catch (err) {
            console.error(err);
            alertError('خطأ في الحذف', 'تعذر حذف المصروف في الوقت الحالي');
        }
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">إدارة المصاريف</h1>
                    <p className="text-slate-500 font-medium">سجل المصاريف العامة والرواتب</p>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
                >
                    {showForm ? 'إلغاء' : <><Plus size={20} /> تسجيل مصروف جديد</>}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Banknote className="text-blue-600" /> تفاصيل المصروف
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">نوع المصروف</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {isEmployeeCategory && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600">الموظف المعني</label>
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                    value={formData.employee_id}
                                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                                    required
                                >
                                    <option value="">اختر موظفاً...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">المبلغ</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none font-black text-blue-700"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    required
                                />
                                <span className="absolute left-4 top-3.5 text-slate-400 font-bold text-xs">ل.س</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-600">التاريخ</label>
                            <input 
                                type="date" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                required
                            />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-600">ملاحظات / بيان</label>
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                placeholder="مثلاً: دفعة عن شهر آذار..."
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            />
                        </div>

                        <div className="lg:col-span-3 flex justify-end">
                            <button className="bg-blue-600 text-white px-10 py-3 rounded-xl font-black shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                حفظ وعرض الربح المحدث
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-right">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400" /> آخر المصاريف المسجلة
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-sm">
                            <tr>
                                <th className="px-6 py-4">التاريخ</th>
                                <th className="px-6 py-4">النوع</th>
                                <th className="px-6 py-4 text-center">المستفيد</th>
                                <th className="px-6 py-4">البيان</th>
                                <th className="px-6 py-4 text-center">المبلغ</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {expenses.length > 0 ? expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-600">{exp.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${categories.find(c => c.id === exp.category)?.color || 'bg-slate-100'}`}>
                                            {categories.find(c => c.id === exp.category)?.label || exp.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {exp.employee ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <User size={14} className="text-blue-400" />
                                                <span className="font-bold text-slate-700">{exp.employee.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300">---</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-sm max-w-xs truncate">{exp.notes || '-'}</td>
                                    <td className="px-6 py-4 text-center font-black text-slate-800">{formatPrice(exp.amount)}</td>
                                    <td className="px-6 py-4 text-left">
                                        <button 
                                            onClick={() => handleDelete(exp.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <AlertCircle className="mx-auto mb-2 opacity-20" size={48} />
                                        <p>لا توجد مصاريف مسجلة حتى الآن</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpensesPage;
