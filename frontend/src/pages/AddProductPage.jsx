import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { 
    Package, Barcode, Tag,
    Layers, Save, X, PlusCircle, AlertCircle, TrendingDown,
    RefreshCw, Image as ImageIcon, Upload, Trash2,
    Smartphone, Link, MonitorSmartphone, Zap
} from 'lucide-react';
import { toastSuccess, alertError } from '../utils/swal';
import { db, compressImage, cacheCategories } from '../db';
import { v4 as uuidv4 } from 'uuid';
import SyncService from '../utils/SyncService';
import BarcodeScanner from '../components/BarcodeScanner';
import { useAuth } from '../context/AuthContext';
import echo from '../utils/echo';
import { QRCodeCanvas } from 'qrcode.react';

const AddProductPage = () => {
    const navigate = useNavigate();
    const { slug } = useParams();
    const { user } = useAuth();
    const nameInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        name: '',
        barcode: '',
        price: '',
        stock_quantity: 0,
        min_quantity: 5,
        category_id: '',
        description: '',
        image: null
    });
    const [showScanner, setShowScanner] = useState(false);
    const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
    const [remoteSessionId, setRemoteSessionId] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleScannedCode = (code) => {
        if (!code) return;
        setForm(f => ({ ...f, barcode: code }));
        toastSuccess('تم قراءة الباركود بنجاح! ✅');
        
        // Auto-focus logic: Move to name field
        if (nameInputRef.current) {
            setTimeout(() => {
                nameInputRef.current.focus();
            }, 100);
        }
    };

    // Remote Scanner Listener
    useEffect(() => {
        const storeId = user?.store_id || user?.store?.id;
        
        if (!remoteSessionId || !storeId) return;

        const channelName = `scanner.${storeId}.${remoteSessionId}`;
        console.log(`[AddProduct Remote Scanner] Subscribing to: ${channelName}`);

        try {
            const channel = echo.private(channelName);
            
            channel.listen('.BarcodeScanned', (e) => {
                console.log('[AddProduct Remote Scanner] RECEIVED:', e.barcode);
                handleScannedCode(e.barcode);
                setIsRemoteModalOpen(false);
            });
        } catch (err) {
            console.error('[AddProduct Remote Scanner] Setup Error:', err);
        }

        return () => {
            console.log(`[AddProduct Remote Scanner] Leaving channel: ${channelName}`);
            echo.leave(channelName);
        };
    }, [remoteSessionId, user]);

    const fetchCategories = async () => {
        try {
            // Priority: Local Dexie categories
            const localCats = await db.categories.toArray().catch(() => []);
            if (localCats.length > 0) setCategories(localCats);

            if (navigator.onLine) {
                const res = await api.get('/categories');
                console.log('Received Data:', res.data);
                // Extract actual array from Laravel wrapper if present
                const actualData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                setCategories(actualData);
                // Safe cache (helper handles extraction)
                await cacheCategories(res.data).catch(e => console.warn('[Dexie] Failed to cache categories:', e));
            }
        } catch (err) { console.error('[API] Error fetching categories:', err); }
    };

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
        setLoading(true);

        const productUuid = uuidv4();
        
        try {
            let compressedBlob = null;
            if (form.image) {
                compressedBlob = await compressImage(form.image);
            }

            const productData = {
                uuid: productUuid,
                name: form.name,
                barcode: form.barcode.trim(),
                price_syr: parseFloat(form.price) || 0,
                stock_quantity: parseInt(form.stock_quantity) || 0,
                min_quantity: parseInt(form.min_quantity) || 5,
                description: form.description,
                category_id: form.category_id ? parseInt(form.category_id) : null,
                image_blob: compressedBlob // Store locally
            };

            // 1. Save Locally to Dexie (Graceful failure)
            try {
                await db.products.add(productData);
            } catch (localErr) {
                console.error('[Dexie] Local save failed:', localErr);
            }
            
            // 2. Add to Sync Queue (Graceful failure)
            try {
                await db.sync_queue.add({
                    table: 'products',
                    action: 'create',
                    data: productData,
                    timestamp: Date.now()
                });
            } catch (syncErr) {
                console.error('[Dexie] Sync queue failed:', syncErr);
            }

            toastSuccess('تم تسجيل المنتج! جاري المزامنة... 📦');
            
            // 3. Attempt Background Sync
            try {
                SyncService.sync();
            } catch (serviceErr) {
                console.error('[SyncService] Error:', serviceErr);
            }

            setTimeout(() => navigate('../'), 500);
        } catch (err) {
            console.error(err);
            alertError('فشل حفظ المنتج محلياً', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 font-sans pb-10 overflow-y-auto" dir="rtl">
            <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                        <PlusCircle size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">إضافة منتج جديد</h1>
                        <p className="text-xs text-slate-400 mt-0.5">أدخل تفاصيل المنتج وارفوع صورته</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('../')}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                    <X size={24} />
                </button>
            </header>

            <div className="flex-1 p-6 flex justify-center pb-20">
                <form onSubmit={handleSubmit} className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8">
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Right: Image Upload */}
                        <div className="lg:col-span-1 border-l border-slate-100 pl-8">
                            <label className="block text-sm font-bold text-slate-700 mb-4 text-center">صورة المنتج</label>
                            
                            <div className="relative group">
                                <div className={`
                                    aspect-square rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center p-4
                                    ${preview ? 'border-blue-500 bg-blue-50/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'}
                                `}>
                                    {preview ? (
                                        <>
                                            <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                                            <button 
                                                type="button"
                                                onClick={removeImage}
                                                className="absolute top-4 left-4 p-2 bg-rose-500 text-white rounded-xl shadow-lg hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400">
                                                <ImageIcon size={32} />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">اسحب الصورة هنا</p>
                                            <p className="text-[10px] text-slate-400 mt-1">PNG, JPG حتى 2MB</p>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                </div>
                                {!preview && (
                                    <button 
                                        type="button"
                                        className="mt-4 w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Upload size={14} />
                                        اختر ملفاً
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Center & Left: Form Fields */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">اسم المنتج <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <Package size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            ref={nameInputRef}
                                            type="text"
                                            name="name"
                                            required
                                            value={form.name}
                                            onChange={handleChange}
                                            placeholder="مثال: مشروب غازي 250 مل"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">الباركود (اختياري)</label>
                                    <div className="relative flex gap-2">
                                        <div className="relative flex-1">
                                            <Barcode size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="text"
                                                name="barcode"
                                                value={form.barcode}
                                                onChange={handleChange}
                                                placeholder="امسح الباركود"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-mono focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setShowScanner(true)}
                                            className="px-4 bg-white border border-slate-200 rounded-2xl text-blue-600 hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center shrink-0"
                                            title="فتح الكاميرا للمسح"
                                        >
                                            <PlusCircle size={20} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                if (!remoteSessionId) setRemoteSessionId(Math.random().toString(36).substring(2, 12));
                                                setIsRemoteModalOpen(true);
                                            }}
                                            className="px-4 bg-white border border-slate-200 rounded-2xl text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm flex items-center justify-center shrink-0"
                                            title="ربط الجوال"
                                        >
                                            <Smartphone size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">السعر الافتراضي (اختياري)</label>
                                    <div className="relative">
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">L.S</div>
                                        <input 
                                            type="number"
                                            name="price"
                                            value={form.price}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">تصنيف المنتج</label>
                                    <select 
                                        name="category_id"
                                        value={form.category_id}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    >
                                        <option value="">عام / غير مصنف</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">حد النواقص</label>
                                    <input 
                                        type="number"
                                        name="min_quantity"
                                        value={form.min_quantity}
                                        onChange={handleChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">وصف المنتج</label>
                                <textarea 
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="ملاحظات إضافية..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                        <button 
                            type="button" 
                            onClick={() => navigate('../')}
                            className="px-8 py-3.5 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                        >
                            إلغاء
                        </button>
                        <button 
                            type="submit"
                            disabled={loading}
                            className="px-12 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xl shadow-blue-200 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {loading ? <RefreshCw className="animate-spin" /> : <Save size={20} />}
                            حفظ المنتج الجديد
                        </button>
                    </div>
                </form>
            </div>

            {showScanner && (
                <BarcodeScanner 
                    onScan={handleScannedCode}
                    onClose={() => setShowScanner(false)}
                />
            )}

            {/* Remote Scanner QR Modal */}
            {isRemoteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b border-slate-50 relative">
                            <button onClick={() => setIsRemoteModalOpen(false)} className="absolute left-4 top-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <MonitorSmartphone className="text-emerald-600" size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800">ربط جوال كـ ماسح ضوئي</h3>
                            <p className="text-sm text-slate-500 mt-1 font-medium italic">صفحة إضافة منتج جديد</p>
                        </div>

                        <div className="p-8 flex flex-col items-center gap-6">
                            <div className="p-4 bg-white border-4 border-slate-100 rounded-3xl shadow-inner">
                                <QRCodeCanvas
                                    value={`${window.location.origin}/${slug}/scan/${remoteSessionId}`}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>

                            <div className="w-full space-y-3">
                                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    <Link size={16} className="text-slate-400 shrink-0" />
                                    <p className="text-[10px] font-mono text-slate-500 truncate text-left flex-1" dir="ltr">
                                        {`${window.location.origin}/${slug}/scan/${remoteSessionId}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                    <Zap size={14} className="shrink-0" />
                                    <span>الجوال سيعمل كـ ماسح خارجي لهذه الصفحة تلقائياً.</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 flex justify-center">
                            <button
                                onClick={() => setIsRemoteModalOpen(false)}
                                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg active:scale-95"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddProductPage;
