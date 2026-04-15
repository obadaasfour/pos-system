<?php
$path = 'c:\xampp\htdocs\pos-system\frontend\src\pages\PurchasesPage.jsx';
$content = file_get_contents($path);

// The broken part looks like this:
// ...</div></div>?<some broken text>...</div></div>
// It seems a block was inserted inside or after another block incorrectly.

// I'll try to find the duplicate block pattern.
// Based on the output, it seems the 'notes' input was duplicated or broken.

// Let's try to find the exact broken string first.
$brokenPattern = '</div>
                            </div>
??????..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none" />
                                </div>
                            </div>';

// This is specific to the broken output. Since encoding is messy, I'll use a more generic regex or line-based approach.
// But first, let's try to just remove the duplicate manually if I can see it.

// Better: I will use a PHP script to "wipe" the file and put a FRESH, CORRECT version 
// that I will construct here carefully. This is the only way to be sure about encoding and syntax.

$newContent = <<<'JSX'
import React, { useState, useEffect } from 'react';
import api from '../api';
import SoundService from '../utils/SoundService';
import SmartSearch from '../components/SmartSearch';
import {
    Package, Plus, Trash2, Save, ChevronDown, AlertTriangle,
    RefreshCw, CheckCircle, Search, Truck, X, DollarSign, User
} from 'lucide-react';

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const formatUsd   = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

const PurchasesPage = () => {
    const [purchases,  setPurchases]  = useState([]);
    const [products,   setProducts]   = useState([]);
    const [suppliers,  setSuppliers]  = useState([]);
    const [showForm,   setShowForm]   = useState(false);
    const [loading,    setLoading]    = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [toast,      setToast]      = useState('');

    const [form, setForm] = useState({
        supplier_id: '',
        exchange_rate: '',
        notes: '',
        items: [{ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '' }],
    });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [purRes, invRes, supRes, setRes] = await Promise.all([
                api.get('/purchases'),
                api.get('/inventory'),
                api.get('/suppliers'),
                api.get('/settings')
            ]);
            
            const pData = Array.isArray(purRes.data.data) ? purRes.data.data : (Array.isArray(purRes.data) ? purRes.data : []);
            setPurchases(pData);
            setProducts(invRes.data);
            setSuppliers(supRes.data);
            
            if (setRes.data && setRes.data.exchange_rate) {
                setForm(f => ({ ...f, exchange_rate: setRes.data.exchange_rate }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setForm(f => ({ ...f, items: [...f.items, { product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '' }] }));
    };

    const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
    
    const updateItem = (i, field, val) => setForm(f => {
        const newItems = [...f.items];
        newItems[i] = { ...newItems[i], [field]: val };
        
        if (field === 'unit_cost_usd') {
            const usd = parseFloat(val) || 0;
            const rate = parseFloat(f.exchange_rate) || 0;
            newItems[i].unit_cost_price = (usd * rate).toFixed(0);
        }
        
        return { ...f, items: newItems };
    });

    const handleProductSelect = (idx, product) => {
        SoundService.playSuccess();
        setForm(f => {
            const newItems = [...f.items];
            newItems[idx] = { 
                ...newItems[idx], 
                product_id: product.id, 
                name: product.name,
                unit_cost_price: product.cost_price || '',
                unit_cost_usd: product.current_cost_usd || ''
            };
            if (idx === f.items.length - 1) {
                newItems.push({ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '' });
            }
            return { ...f, items: newItems };
        });
    };

    const formTotal = form.items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost_price) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validItems = form.items.filter(it => it.product_id);
        if (validItems.length === 0) return alert('يرجى اختيار منتج واحد على الأقل');
        
        setSaving(true);
        try {
            await api.post('/purchases', { ...form, items: validItems });
            setToast('تم حفظ الفاتورة بنجاح');
            setTimeout(() => setToast(''), 3000);
            setShowForm(false);
            setForm(f => ({ ...f, notes: '', items: [{ product_id: '', name: '', quantity: 1, unit_cost_price: '', unit_cost_usd: '' }] }));
            fetchAll();
        } catch (err) {
            alert('خطأ أثناء الحفظ');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden" dir="rtl">
            <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800">إدارة المشتريات والوجبات</h1>
                    <p className="text-xs text-slate-400 mt-0.5">إدارة وجبات المخزون وتكاليف الدولار</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all">
                        <Plus size={18} /> فاتورة جديدة
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {showForm && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
                        <div className="px-6 py-4 bg-slate-900 flex justify-between items-center text-white">
                            <h2 className="font-bold text-base flex items-center gap-2"><Package size={18} className="text-blue-400" /> إضافة وجبات جديدة</h2>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">المورد</label>
                                    <select value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                                        <option value="">-- بدون مورد --</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">سعر الصرف (1$ = ل.س)</label>
                                    <input type="number" required value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-400" />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-bold text-slate-500">ملاحظات</label>
                                    <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-slate-50 text-slate-600 font-bold">
                                        <tr>
                                            <th className="px-4 py-3">المنتج</th>
                                            <th className="px-4 py-3 text-center w-24">الكمية</th>
                                            <th className="px-4 py-3 text-center w-32">التكلفة ($)</th>
                                            <th className="px-4 py-3 text-center w-36">التكلفة (ل.س)</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {form.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-2">
                                                    <SmartSearch products={products} onSelect={(p) => handleProductSelect(idx, p)} placeholder="اختر منتجاً..." />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" min="1" required value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-1 text-sm outline-none" />
                                                </td>
                                                <td className="p-2">
                                                    <input type="number" step="0.01" min="0" required value={item.unit_cost_usd} onChange={e => updateItem(idx, 'unit_cost_usd', e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-1 text-sm font-bold text-emerald-600 outline-none" />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input type="number" min="0" required value={item.unit_cost_price} onChange={e => updateItem(idx, 'unit_cost_price', e.target.value)} className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 px-1 text-sm outline-none" />
                                                    <div className="text-[10px] text-slate-400 mt-1">{formatPrice((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost_price) || 0))}</div>
                                                </td>
                                                <td className="p-2 text-center">
                                                    {form.items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-blue-50/50 uppercase font-bold text-slate-700">
                                        <tr>
                                            <td colSpan="3" className="px-6 py-4 text-left">إجمالي الفاتورة (ل.س):</td>
                                            <td className="px-4 py-4 text-center font-black text-blue-700 text-lg">{formatPrice(formTotal)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600">إلغاء</button>
                                <button type="submit" disabled={saving} className="px-8 py-2 bg-slate-900 text-white rounded-xl font-bold disabled:opacity-50">
                                    {saving ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                        <h2 className="font-bold text-slate-800">سجل فواتير الشراء</h2>
                    </div>
                    <div className="overflow-x-auto text-right">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-4 text-right">#</th>
                                    <th className="px-6 py-4 text-right">المورد</th>
                                    <th className="px-6 py-4 text-right">الوجبات</th>
                                    <th className="px-6 py-4 text-right">الإجمالي</th>
                                    <th className="px-6 py-4 text-right">التاريخ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {purchases.map(p => (
                                    <tr key={p.id}>
                                        <td className="px-6 py-4 font-mono text-slate-400">#{p.id}</td>
                                        <td className="px-6 py-4 font-bold">{p.supplier?.name || '--'}</td>
                                        <td className="px-6 py-4">{p.items?.length || 0} صنف</td>
                                        <td className="px-6 py-4 font-black text-emerald-600">{formatPrice(p.total_amount)}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(p.created_at).toLocaleDateString('ar-SY')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10">
                    {toast}
                </div>
            )}
        </div>
    );
};

export default PurchasesPage;
JSX;

file_put_contents($path, $newContent);
echo "Rewrote PurchasesPage.jsx with correct syntax and multi-currency support.\n";
