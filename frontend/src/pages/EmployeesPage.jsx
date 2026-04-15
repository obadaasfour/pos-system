import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
    Users, Plus, Edit, Trash2, 
    FileText, User, Briefcase, DollarSign,
    Printer, X, ChevronRight, Calculator
} from 'lucide-react';
import { generatePayslip } from '../utils/invoiceGenerator';
import { toastSuccess, alertError, confirmDialog } from '../utils/swal';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';

const EmployeesPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [salaryModal, setSalaryModal] = useState(null); // { employee, details }
    
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/employees');
            setEmployees(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        try {
            if (currentEmployee) {
                await api.put(`/employees/${currentEmployee.id}`, data);
                toastSuccess('تم تحديث بيانات الموظف بنجاح ✨');
            } else {
                await api.post('/employees', data);
                toastSuccess('تمت إضافة الموظف بنجاح 👤');
            }
            setShowForm(false);
            setCurrentEmployee(null);
            fetchEmployees();
        } catch (err) {
            console.error(err);
            alertError('خطأ في النظام', 'حدث خطأ أثناء حفظ البيانات، يرجى المحاولة لاحقاً');
        }
    };

    const fetchSalaryDetails = async (employee) => {
        try {
            const res = await api.get(`/employees/${employee.id}/salary-details`);
            setSalaryModal(res.data);
        } catch (err) {
            console.error(err);
            alertError('خطأ تقني', 'تعذر جلب تفاصيل الراتب في الوقت الحالي');
        }
    };

    const handlePrintPayslip = (details) => {
        generatePayslip(details);
    };

    return (
        <div className="p-8 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">الموظفون والرواتب</h1>
                    <p className="text-slate-500 font-medium">إدارة طاقم العمل ومتابعة المستحقات</p>
                </div>
                <button 
                    onClick={() => { setShowForm(true); setCurrentEmployee(null); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
                >
                    <Plus size={20} /> إضافة موظف جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {employees.map(emp => (
                    <div key={emp.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                <User size={28} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-black text-slate-800 truncate">{emp.name}</h3>
                                <div className="flex items-center gap-1.5 text-slate-400 text-sm font-medium">
                                    <Briefcase size={14} /> <span>{emp.position || 'موظف'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center mb-6 border border-slate-100/50">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">الراتب الأساسي</p>
                                <p className="text-lg font-black text-blue-600">{formatPrice(emp.base_salary)}</p>
                            </div>
                            <button 
                                onClick={() => fetchSalaryDetails(emp)}
                                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all font-bold"
                                title="كشف الراتب"
                            >
                                <Calculator size={18} />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setCurrentEmployee(emp); setShowForm(true); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-colors"
                            >
                                <Edit size={16} /> تعديل
                            </button>
                            <button 
                                onClick={async () => {
                                    const confirmed = await confirmDialog(
                                        'حذف الموظف', 
                                        `هل أنت متأكد من حذف الموظف "${emp.name}"؟ ستبقى سجلاته السابقة في المصاريف.`,
                                        'warning'
                                    );
                                    if(confirmed.isConfirmed) {
                                        try {
                                            await api.delete(`/employees/${emp.id}`);
                                            fetchEmployees();
                                            toastSuccess('تم حذف الموظف بنجاح ✅');
                                        } catch (err) {
                                            alertError('فشل الحذف', 'تعذر حذف الموظف حالياً');
                                        }
                                    }
                                }}
                                className="w-11 h-11 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Salary Breakdown Modal */}
            {salaryModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                            <div>
                                <h2 className="text-xl font-black">كشف راتب شهري</h2>
                                <p className="text-blue-100 text-xs font-bold opacity-80">{salaryModal.month}</p>
                            </div>
                            <button onClick={() => setSalaryModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800">{salaryModal.employee.name}</h4>
                                    <p className="text-xs text-slate-400 font-bold">{salaryModal.employee.position || 'موظف لدينا'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-500 font-bold">الراتب الأساسي</span>
                                    <span className="font-black text-slate-700">{formatPrice(salaryModal.base_salary)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-rose-500 font-bold">الخصومات / العقوبات</span>
                                    <span className="font-black text-rose-500 cursor-help" title="تشمل العقوبات المسجلة">- {formatPrice(salaryModal.penalties)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-amber-500 font-bold">السلف المستردة</span>
                                    <span className="font-black text-amber-500">- {formatPrice(salaryModal.advances)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm pb-4 border-b border-slate-100">
                                    <span className="text-emerald-500 font-bold">المكافآت</span>
                                    <span className="font-black text-emerald-500">+ {formatPrice(salaryModal.bonuses)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-lg font-black text-slate-800">صافي المستحق</span>
                                    <span className="text-2xl font-black text-blue-600">{formatPrice(salaryModal.net_salary)}</span>
                                </div>
                            </div>

                            <button 
                                onClick={() => handlePrintPayslip(salaryModal)}
                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all mt-4"
                            >
                                <Printer size={20} /> طباعة كشف الراتب (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-slate-800">
                                {currentEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-600 block">الاسم الثلاثي</label>
                                <input 
                                    name="name"
                                    type="text" 
                                    defaultValue={currentEmployee?.name}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                    placeholder="أدخل اسم الموظف..."
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 block">الراتب الأساسي</label>
                                    <input 
                                        name="base_salary"
                                        type="number" 
                                        defaultValue={currentEmployee?.base_salary}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-black text-blue-600 text-xl"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-600 block">المسمى الوظيفي</label>
                                    <input 
                                        name="position"
                                        type="text" 
                                        defaultValue={currentEmployee?.position}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        placeholder="مثلاً: بائع / مدير مستودع"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
                                <button type="submit" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                                    {currentEmployee ? 'حفظ التعديلات' : 'إضافة الموظف الآن'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeesPage;
