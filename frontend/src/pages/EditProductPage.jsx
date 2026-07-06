import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { 
    Package, Barcode, Tag,
    Layers, Save, X, PlusCircle, AlertCircle, RefreshCw,
    Image as ImageIcon, Upload, Trash2, Camera
} from 'lucide-react';
import { toastSuccess, alertError } from '../utils/swal';
import BarcodeScanner from '../components/BarcodeScanner';

const EditProductPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(null);
    const [showScanner, setShowScanner] = useState(false);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [form, setForm] = useState({
        name: '',
        barcode: '',
        min_quantity: 5,
        category_id: '',
        supplier_id: '',
        description: '',
        image: null
    });

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                // Fetch product details
                const response = await api.get(`/products/${id}`);
                const product = response.data;
                
                if (product) {
                    setForm({
                        name: product.name,
                        barcode: product.barcode || '',
                        min_quantity: product.min_quantity || 0,
                        category_id: product.category_id || '',
                        supplier_id: product.supplier_id || '',
                        description: product.description || '',
                        image: null
                    });
                    if (product.image_url) {
                        setPreview(product.image_url);
                    }
                } else {
                    alertError('تنبيه', 'المنتج غير موجود في قاعدة البيانات');
                    navigate('../../');
                }
            } catch (err) {
                console.error(err);
                alertError('خطأ تقني', 'حدث خطأ أثناء جلب بيانات المنتج من السيرفر');
            } finally {
                setLoading(false);
            }
        };
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories');
                console.log('Received Data:', res.data);
                const actualData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setCategories(actualData);
                import('../db').then(db => db.cacheCategories(res.data));
            } catch (err) { console.error(err); }
        };
        const fetchSuppliers = async () => {
            try {
                const res = await api.get('/suppliers');
                setSuppliers(res.data.data || []);
            } catch (err) { console.error(err); }
        };
        fetchProduct();
        fetchCategories();
        fetchSuppliers();
    }, [id, navigate]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm(prev => ({ ...prev, image: file }));
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const removeImage = () => {
        setForm(prev => ({ ...prev, image: null }));
        setPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const formData = new FormData();
        formData.append('_method', 'PUT'); // For PHP multipart/form-data support with PUT
        formData.append('name', form.name);
        formData.append('barcode', form.barcode.trim());
        formData.append('min_quantity', form.min_quantity);
        formData.append('description', form.description);
        
        if (form.category_id) {
            formData.append('category_id', parseInt(form.category_id));
        }
        
        if (form.supplier_id) {
            formData.append('supplier_id', parseInt(form.supplier_id));
        }
        
        if (form.image) formData.append('image', form.image);

        try {
            await api.post(`/products/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toastSuccess('تم تحديث بيانات المنتج بنجاح! ✨');
            setTimeout(() => navigate('../../'), 500);
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'حدث خطأ غير متوقع';
            console.error(err);
            alertError('فشل التحديث', msg);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center bg-slate-50">
            <RefreshCw className="animate-spin text-blue-600" size={48} />
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden" dir="rtl">
            <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Package size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">تعديل المنتج</h1>
                        <p className="text-xs text-slate-400 mt-0.5">تحديث بيانات وصورة المنتج رقم #{id}</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('../../')}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                    <X size={24} />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 flex justify-center pb-20">
                <form onSubmit={handleSubmit} className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Right: Image Editor */}
                        <div className="lg:col-span-1 border-l border-slate-100 pl-8">
                            <label className="block text-sm font-bold text-slate-700 mb-4 text-center">تحديث الصورة</label>
                            
                            <div className="relative group">
                                <div className={`
                                    aspect-square rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center p-4
                                    ${preview ? 'border-indigo-500 bg-indigo-50/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'}
                                `}>
                                    {preview ? (
                                        <>
                                            <img src={preview} alt="Product" className="w-full h-full object-cover rounded-2xl" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button 
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="p-3 bg-rose-500 text-white rounded-2xl shadow-xl hover:bg-rose-600 transition-all scale-90 group-hover:scale-100"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                                <div className="p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:bg-slate-50 transition-all scale-90 group-hover:scale-100 relative">
                                                    <Upload size={20} />
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <ImageIcon size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">لا توجد صورة</p>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Left: Form Fields */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج <span className="text-rose-500">*</span></label>
                                    <input 
                                        type="text"
                                        name="name"
                                        required
                                        value={form.name}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الباركود</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            name="barcode"
                                            value={form.barcode}
                                            onChange={handleChange}
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-mono focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner(true)}
                                            className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                                            title="فتح قارئ الباركود"
                                        >
                                            <Camera size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">حد النواقص</label>
                                    <input 
                                        type="number"
                                        name="min_quantity"
                                        value={form.min_quantity}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">تصنيف المنتج</label>
                                    <select 
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">عام / غير مصنف</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">المورد المرتبط</label>
                                    <select 
                                        name="supplier_id"
                                        value={form.supplier_id}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">لا يوجد مورد</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الوصف</label>
                                    <textarea 
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        rows="4"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={() => navigate('../../')}
                            className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="submit"
                            disabled={saving}
                            className="px-12 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold shadow-xl shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {saving ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                            تحديث البيانات
                        </button>
                    </div>
                </form>
            </div>

            {showScanner && (
                <BarcodeScanner
                    onScan={(code) => {
                        setForm(prev => ({ ...prev, barcode: code }));
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </div>
    );
};

export default EditProductPage;
