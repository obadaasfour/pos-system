import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import echo from '../utils/echo';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import SoundService from '../utils/SoundService';
import SmartSearch from '../components/SmartSearch';
import CheckoutModal from '../components/CheckoutModal';
import BatchPickerModal from '../components/BatchPickerModal';
import NotificationCenter from '../components/NotificationCenter';
import PendingOrdersModal from '../components/PendingOrdersModal';
import { generateInvoice } from '../utils/invoiceGenerator';
import { confirmDialog, toastSuccess, toastError, inputDialog, alertError } from '../utils/swal';
import { 
    ShoppingCart, Search, Package, Plus, Minus,
    X, CheckCircle, Trash2, Tag, BarChart2, AlertTriangle,
    Receipt, Zap, Save, Printer, User, Wallet,
    Wifi, WifiOff, CloudOff, Camera, Barcode, Smartphone, Link, MonitorSmartphone,
    Radio, DollarSign
} from 'lucide-react';
import { db, savePendingOrder, cacheProducts, getCachedProducts } from '../db';
import { v4 as uuidv4 } from 'uuid';
import BarcodeScanner from '../components/BarcodeScanner';
import SyncIndicator from '../components/SyncIndicator';
import SyncService from '../utils/SyncService';

/* ── Customer Quick Search Component ───────────────── */
const CustomerQuickSearch = ({ onSelect, selectedCustomer }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { slug } = useParams();
    const fetchCustomers = async (q) => {
        if (!q) return;
        try {
            const res = await api.get(`/${slug}/customers`);
            const filtered = res.data.filter(c =>
                c.name.toLowerCase().includes(q.toLowerCase()) ||
                (c.phone && c.phone.includes(q))
            );
            setCustomers(filtered);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const delay = setTimeout(() => {
            if (searchTerm && !selectedCustomer) fetchCustomers(searchTerm);
        }, 300);
        return () => clearTimeout(delay);
    }, [searchTerm, selectedCustomer]);

    if (selectedCustomer) {
        return (
            <div className="flex items-center justify-between bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold animate-in zoom-in-95">
                <div className="flex items-center gap-2 truncate">
                    <User size={14} />
                    <span className="truncate">{selectedCustomer.name}</span>
                </div>
                <button onClick={() => onSelect(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={14} /></button>
            </div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <input
                    type="text"
                    placeholder="بحث عن زبون..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-9 text-xs focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                />
                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            </div>
            {showDropdown && searchTerm && customers.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto p-1 animate-in slide-in-from-top-1">
                    {customers.map(c => (
                        <div key={c.id} onClick={() => { onSelect(c); setShowDropdown(false); setSearchTerm(''); }} className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center group transition-colors">
                            <span className="text-xs font-bold text-slate-700">{c.name}</span>
                            <span className="text-[9px] text-slate-400">{c.phone}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const formatPrice = (n) => Number(n || 0).toLocaleString('ar-SY') + ' ل.س';
const formatUsd = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';

/* ── Cart Content Component (Internal) ──────────────── */
const CartContent = ({ 
    cart, total, onUpdateQuantity, onRemove, onCheckout, itemCount, 
    onClear, loading, customer, onCustomerSelect, heldOrders, 
    showHeld, setShowHeld, onDeleteHeld, onResumeHeld, onOpenPending, 
    pendingCount, onReprint, exchangeRate 
}) => {
    const totalUsd = cart.reduce((sum, i) => sum + (i.price_usd > 0 ? i.price_usd : (i.unit_price / (exchangeRate || 1))) * i.quantity, 0);

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <ShoppingCart size={20} className="text-blue-600" />
                    <h2 className="font-extrabold text-slate-800 text-base">سلة المبيعات</h2>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onReprint} className="p-2 text-slate-400 hover:text-blue-600 rounded-xl transition-all"><Printer size={18} /></button>
                    <div className="relative">
                        <button onClick={() => setShowHeld(prev => !prev)} className="p-2 text-slate-400 hover:text-amber-600 rounded-xl transition-all relative">
                            <Save size={18} />
                            {heldOrders.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">{heldOrders.length}</span>}
                        </button>
                        {showHeld && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-in slide-in-from-top-2">
                                <h3 className="text-[10px] font-black text-slate-400 px-3 py-2 border-b border-slate-50 mb-2 uppercase">الفواتير المعلقة</h3>
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {heldOrders.length === 0 ? <p className="text-[11px] text-slate-400 text-center py-4">لا توجد معلقات</p> : heldOrders.map(o => (
                                        <div key={o.id} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                                            <div className="flex-1 min-w-0" onClick={() => onResumeHeld(o)}>
                                                <p className="text-xs font-bold text-slate-800 truncate">{o.customer?.name || 'زبون نقدي'}</p>
                                                <p className="text-[9px] text-slate-400">{o.time} • {o.cart.length} أصناف • {(o.total || 0).toLocaleString('ar-SY')}</p>
                                            </div>
                                            <button onClick={() => onDeleteHeld(o.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {cart.length > 0 && <button onClick={onClear} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>}
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-full min-w-[32px] text-center">{itemCount}</span>
                </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0">
                <div className="flex-1"><CustomerQuickSearch onSelect={onCustomerSelect} selectedCustomer={customer} /></div>
                <div className="relative">
                    <button onClick={onOpenPending} className={`p-2.5 rounded-xl transition-all relative ${pendingCount > 0 ? 'bg-rose-50 border border-rose-100 text-rose-600 animate-pulse' : 'bg-white border border-slate-200 text-slate-400'}`}>
                        <Radio size={20} />
                        {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">{pendingCount}</span>}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                        <ShoppingCart size={48} className="mb-4 opacity-20" />
                        <p className="text-xs font-bold text-slate-400">السلة فارغة حالياً</p>
                    </div>
                ) : cart.map((item, idx) => (
                    <CartItem key={`${item.id}-${item.batch_id}-${idx}`} item={item} onUpdate={(delta) => onUpdateQuantity(idx, delta)} onRemove={() => onRemove(idx)} exchangeRate={exchangeRate} />
                ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 p-5 bg-slate-50 space-y-3">
                <div className="flex justify-between items-end">
                    <span className="font-extrabold text-slate-400 text-xs uppercase tracking-widest">المجموع النهائي</span>
                    <div className="text-left">
                        <span className="block font-black text-blue-700 text-2xl leading-none">{(total || 0).toLocaleString('ar-SY')} <small className="text-xs">ل.س</small></span>
                        <span className="block font-bold text-emerald-600 text-[11px] mt-1 tracking-tight">({totalUsd.toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</span>
                    </div>
                </div>
                <button
                    onClick={onCheckout}
                    disabled={cart.length === 0 || loading}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm md:text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-200 active:scale-95 transition-all"
                >
                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Receipt size={20} /><span>إتمام عملية البيع</span></>}
                </button>
            </div>
        </div>
    );
};

/* ── Product Card ─────────────────────────────── */
const ProductCard = ({ product, onAdd, exchangeRate }) => {
    const outOfStock = product.stock_quantity === 0;
    const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
    const calculatedPrice = product.price_usd > 0 ? (product.price_usd * exchangeRate) : product.price;

    return (
        <div
            onClick={() => !outOfStock && onAdd(product)}
            className={`
                group relative bg-white rounded-[1.5rem] border-2 flex flex-col overflow-hidden transition-all duration-300 min-h-[14rem] md:min-h-[16rem]
                ${outOfStock
                    ? 'border-slate-200 opacity-60 grayscale-[0.5]'
                    : 'cursor-pointer border-slate-100 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-100/30 active:scale-[0.98]'
                }
            `}
        >
            {/* Image Section */}
            <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center h-32 md:h-36 shrink-0 overflow-hidden border-b border-slate-50">
                {product.image_path ? (
                    <img src={`${api.defaults.baseURL.replace('/api', '')}/storage/${product.image_path}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                ) : (
                    <Package size={32} className="text-blue-100 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-500" />
                )}
                
                {/* Batch Tag (Corner - Horizontal) */}
                {product.is_batch && (
                    <div className="absolute top-2 left-2 z-10">
                        <span className="inline-block bg-slate-800/90 backdrop-blur-md text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md whitespace-nowrap shadow-md">
                            وجبة: {product.batch_date}
                        </span>
                    </div>
                )}
                
                {outOfStock && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1.5 rounded-lg shadow-xl uppercase">نفدت</span>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="p-3.5 flex flex-col gap-2 flex-1 relative z-10">
                {/* Name */}
                <h3 className="font-black text-slate-800 text-[13px] md:text-sm leading-tight line-clamp-2 min-h-[2.2rem]">{product.name}</h3>
                
                <div className="flex-1 flex flex-col justify-end gap-2 mt-auto">
                    {/* Prices Container */}
                    <div className="space-y-1">
                        {/* SYP Price */}
                        <div className="flex items-baseline justify-between gap-1.5">
                            <span className="text-blue-700 font-black text-lg tracking-tight">
                                {Number(calculatedPrice || 0).toLocaleString('ar-SY')}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">ل.س</span>
                        </div>

                        {/* USD Planned Price (Premium Badge) - Always Visible */}
                        <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-100/50 w-fit">
                            <DollarSign size={10} className="text-emerald-500" />
                            <span className="text-[10px] font-black tracking-tight leading-none">
                                {Number(product.price_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-bold opacity-60">مخطط</span>
                        </div>
                    </div>

                    {/* Stock & Barcode Row */}
                    <div className="flex flex-row items-center justify-between pt-2 border-t border-slate-50 w-full">
                        <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${lowStock ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className={`text-[10px] font-extrabold ${lowStock ? 'text-amber-600' : 'text-slate-500'}`}>
                                المخزون: {product.stock_quantity}
                            </span>
                        </div>
                        <span className="text-[9px] text-slate-300 font-mono bg-slate-50 px-1 py-0.5 rounded-md">
                            {product.barcode?.slice(-4) || '---'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Add Overlay - Mobile Optimized */}
            {!outOfStock && (
                <div className="absolute inset-0 bg-blue-600/0 lg:group-hover:bg-blue-600/5 transition-all pointer-events-none flex items-center justify-center">
                     <div className="w-12 h-12 md:w-10 md:h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center opacity-0 lg:group-hover:opacity-100 translate-y-4 lg:group-hover:translate-y-0 transition-all duration-300 shadow-xl shadow-blue-500/30 lg:pointer-events-auto">
                        <Plus size={24} className="md:size-5" />
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Cart Item ─────────────────────────────────── */
const CartItem = ({ item, onUpdate, onRemove, exchangeRate }) => {
    const calculatedPrice = item.price_usd > 0 ? (item.price_usd * exchangeRate) : item.unit_price;
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Package size={20} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate leading-tight">{item.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatPrice(calculatedPrice)} / وحدة</p>
            </div>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => onUpdate(-1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><Minus size={12} /></button>
                <span className="text-sm font-bold text-slate-800 w-6 text-center select-none">{item.quantity}</span>
                <button onClick={() => onUpdate(1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><Plus size={12} /></button>
            </div>
            <div className="text-left min-w-[80px]">
                <span className="block text-sm font-extrabold text-slate-800">{formatPrice(calculatedPrice * item.quantity)}</span>
                {(item.price_usd > 0) && <span className="block text-[10px] text-emerald-600 font-bold">({formatUsd(item.price_usd * item.quantity)})</span>}
            </div>
            <button onClick={() => onRemove()} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
                <X size={15} />
            </button>
        </div>
    );
};

/* ── Main POS Page ─────────────────────────────── */
const PosPage = () => {
    const { slug } = useParams();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [products, setProducts] = useState([]);
    const [exchangeRate, setExchangeRate] = useState(0);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [gridSearch, setGridSearch] = useState('');  // ← Feature 1: Grid filter
    const [heldOrders, setHeldOrders] = useState(() => {
        const saved = localStorage.getItem('heldOrders');
        return saved ? JSON.parse(saved) : [];
    });
    const [showHeldOrders, setShowHeldOrders] = useState(false);
    const [isSwalOpen, setIsSwalOpen] = useState(false);

    // Manual Batch Selection State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [pendingProduct, setPendingProduct] = useState(null);
    const [showScanner, setShowScanner] = useState(false);

    // Remote Scanner State
    const [remoteSessionId, setRemoteSessionId] = useState(null);
    const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);

    // Pending Orders from QR State
    const [pendingOrders, setPendingOrders] = useState([]);
    const [isPendingOrdersModalOpen, setIsPendingOrdersModalOpen] = useState(false);
    const [activePendingOrderId, setActivePendingOrderId] = useState(null);

    const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

    if (authLoading) return null;

    // --- Utilities & Handlers (Moved up to fix ReferenceError) ---

    const flattenProducts = useCallback((list, rate) => {
        return (list || []).flatMap(p => {
            if (!p.batches || p.batches.length === 0) {
                return [{ 
                    ...p, 
                    batch_id: null, 
                    is_batch: false,
                    price: parseFloat(p.price || p.price_syr || 0),
                    price_usd: parseFloat(p.sale_price_usd || p.planned_price_usd || p.price_usd || 0),
                    original_price: p.price 
                }];
            }
            return p.batches.map(b => {
                return {
                    ...p,
                    is_batch: true,
                    batch_id: b.id,
                    stock_quantity: b.remaining_qty,
                    price: parseFloat(b.sale_price || 0),
                    price_usd: parseFloat(b.sale_price_usd || b.planned_price_usd || p.sale_price_usd || p.planned_price_usd || 0),
                    batch_date: new Date(b.created_at).toLocaleDateString('ar-SY', { month: 'short', day: 'numeric', year: 'numeric' }),
                    batch_exchange_rate: b.exchange_rate,
                    batch_info: b
                };
            });
        });
    }, []);

    const flattenedInventory = React.useMemo(() => flattenProducts(products, exchangeRate), [products, exchangeRate, flattenProducts]);

    const filteredItems = React.useMemo(() => {
        const q = gridSearch?.toLowerCase() || '';
        return flattenedInventory.filter(item => 
            item.name?.toLowerCase().includes(q) || 
            (item.barcode && item.barcode.includes(gridSearch))
        );
    }, [flattenedInventory, gridSearch]);

    const addToCart = (product) => {
        const batchId = product.is_batch ? product.batch_id : null;
        const batchInfo = product.is_batch ? product.batch_info : null;

        setCart(prev => {
            const existingIndex = prev.findIndex(i => i.id === product.id && i.batch_id === batchId);
            if (existingIndex !== -1) {
                const existing = prev[existingIndex];
                const maxQty = product.stock_quantity;
                if (existing.quantity >= maxQty) {
                    SoundService.playError();
                    toastError(`الكمية غير متوفرة في هذه الوجبة (المتاح: ${maxQty})`);
                    return prev;
                }
                SoundService.playSuccess();
                const newCart = [...prev];
                newCart[existingIndex] = { ...existing, quantity: existing.quantity + 1 };
                return newCart;
            }
            SoundService.playSuccess();
            return [...prev, {
                ...product,
                batch_id: batchId,
                batch_info: batchInfo,
                quantity: 1,
                unit_price: product.price
            }];
        });
    };

    const handleBarcodeScan = useCallback(async (code) => {
        if (!code) return;
        const cleanCode = code.trim().toLowerCase();
        console.log('[Barcode Handler] Searching for:', cleanCode);
        console.log('[Barcode Handler] Inventory Size:', flattenedInventory.length);

        const isMobile = window.innerWidth < 1024;
        
        setGridSearch(''); 
        setShowScanner(false);

        // Haptic & Visual Feedback
        SoundService.playSuccess();
        if (navigator.vibrate) navigator.vibrate(100);

        const product = flattenedInventory.find(
            p => String(p.barcode).trim().toLowerCase() === cleanCode
        );

        if (product) {
            toastSuccess(`تم العثور على المنتج: ${product.name} ✅`);
            addToCart(product);
        } else {
            console.warn('[Barcode Handler] Product NOT Found for barcode:', cleanCode);
            alertError('غير موجود', `لم يتم العثور على منتج بالباركود: ${cleanCode}`);
        }
    }, [flattenedInventory, addToCart]);

    useEffect(() => {
        if (authLoading) return; // Wait for initial auth check

        if (!isAuthenticated || !user) {
            // Only alert if we ARE NOT loading and still don't have a user
            alertError('جلسة العمل انتهت', 'المتجر غير محدد أو انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.');
            setTimeout(() => {
                localStorage.removeItem('pos_token');
                localStorage.removeItem('pos_user');
                const pathParts = window.location.pathname.split('/');
                const currentSlug = pathParts[1] || '';
                window.location.href = currentSlug ? `/${currentSlug}/login` : '/login';
            }, 3000);
            return;
        }

        // Fetch Initial Exchange Rate
        const loadExchangeRate = async () => {
            try {
                const settings = await db.app_cache.get('app_settings');
                if (settings?.value?.exchange_rate) {
                    setExchangeRate(parseFloat(settings.value.exchange_rate));
                }
            } catch (err) { console.error('Failed to load rate from cache', err); }
        };
        loadExchangeRate();

        // Listen for live updates
        const handleRateChange = (e) => {
            if (e.detail) {
                console.log('[POS] Global Exchange Rate Updated:', e.detail);
                setExchangeRate(parseFloat(e.detail));
            }
        };
        window.addEventListener('exchangeRateUpdated', handleRateChange);

        SyncService.startAutoSync();
        fetchProducts();

        return () => {
            window.removeEventListener('exchangeRateUpdated', handleRateChange);
        };
    }, [user, isAuthenticated, authLoading]);

    // Remote Scanner Session Hook
    const scanHandlerRef = useRef(handleBarcodeScan);
    useEffect(() => {
        scanHandlerRef.current = handleBarcodeScan;
    }, [handleBarcodeScan]);

    // Debugging diagnostic log
    useEffect(() => {
        console.log('[POS Diagnostic] User:', user?.name, '| StoreID:', user?.store_id || user?.store?.id, '| SessionID:', remoteSessionId);
    }, [user, remoteSessionId]);

    const currentStoreId = user?.store_id || user?.store?.id;
    const subscriptionKey = `${currentStoreId}-${remoteSessionId}`;
    
    useEffect(() => {
        if (!remoteSessionId || !currentStoreId) {
            // Silently wait until both IDs are available before subscribing
            return;
        }

        console.log('[Remote Scanner] Effect Triggered. Dependencies ready.');

        const channelName = `scanner.${currentStoreId}.${remoteSessionId}`;
        console.log(`[Remote Scanner] Attempting Subscription to: ${channelName}`);

        try {
            const channel = echo.private(channelName);
            
            channel.subscribed(() => {
                console.log(`[Remote Scanner] SUCCESSFULLY Subscribed to: ${channelName} ✅`);
            });

            channel.error((err) => {
                console.error(`[Remote Scanner] Subscription ERROR on ${channelName}:`, err);
            });

            channel.listen('.BarcodeScanned', (e) => {
                console.log('[Remote Scanner] Event RECEIVED! Payload:', e);
                setIsRemoteModalOpen(false);
                setShowScanner(false);
                if (scanHandlerRef.current) {
                    scanHandlerRef.current(e.barcode);
                }
                toastSuccess('جاري الإضافة من الجوال... 📱');
            });
        } catch (err) {
            console.error('[Remote Scanner] Fatal Setup Error:', err);
        }

    }, [subscriptionKey, remoteSessionId, echo, currentStoreId]);

    // Pending Orders WebSocket & Fetch
    useEffect(() => {
        if (!currentStoreId) return;

        const fetchPendingOrders = async () => {
            try {
                const res = await api.get(`/${slug}/pending-orders`);
                setPendingOrders(res.data);
            } catch (err) { console.error('Failed to fetch pending orders', err); }
        };

        fetchPendingOrders();

        const channel = echo.private(`store.${currentStoreId}`);
        channel.listen('.NewCustomerOrder', (e) => {
            console.log('[Real-time] New Order Received:', e.order);
            setPendingOrders(prev => [e.order, ...prev]);
            SoundService.playNotification();
            toastSuccess('طلب جديد قادم من المنيو! 🔔');
        });

        return () => {
            echo.leave(`store.${currentStoreId}`);
        };
    }, [currentStoreId, echo]);

    // B2B Live Notifications (Proposals & Status Updates)
    useEffect(() => {
        if (!currentStoreId) return;

        const channel = echo.private(`stores.${currentStoreId}`);
        
        channel.notification((notification) => {
            console.log('[Live Notification] POS received:', notification);
            
            // Show Toast based on notification type
            if (notification.type === 'b2b_proposal') {
                SoundService.playNotification();
                toastSuccess(`💡 اقتراح جديد: قام المورد باقتراح منتج جديد [${notification.supplier_name || 'مورد'}]`);
            }
        });

        return () => {
            echo.leave(`stores.${currentStoreId}`);
        };
    }, [currentStoreId, echo]);

    // التعديل الأول — Global Barcode Listener
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();
        let timeout;

        const handleGlobalKeyDown = (e) => {
            const now = Date.now();

            // إذا كان الفارق الزمني أكبر من 50ms، نعتبره إدخالاً بشرياً ونصفر المخزن المؤقت
            if (now - lastKeyTime > 50) {
                buffer = '';
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                if (buffer.length > 3) {
                    e.preventDefault();
                    handleBarcodeScan(buffer);
                    buffer = '';
                }
                return;
            }

            if (e.key.length === 1) { // جمع الأحرف القادمة بسرعة
                buffer += e.key;

                if (timeout) clearTimeout(timeout);
                timeout = setTimeout(() => {
                    if (buffer.length > 3) {
                        handleBarcodeScan(buffer);
                    }
                    buffer = '';
                }, 50); // تنفيذ تلقائي عند توقف الإدخال
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
            if (timeout) clearTimeout(timeout);
        };
    }, [handleBarcodeScan]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            
            // 1. Initial Load from Dexie (Instant)
            const cached = await getCachedProducts();
            if (cached && cached.length > 0) {
                setProducts(cached);
            }

            // 2. Fetch Updates from API if Online
            if (navigator.onLine) {
                const res = await api.get(`/${slug}/inventory`);
                const data = Array.isArray(res.data) ? res.data : [];
                setProducts(data);
                await cacheProducts(data);
            } else if (!cached || cached.length === 0) {
                alertError('عذراً، تعذر تحميل المنتجات', 'أنت أوفلاين ولا يوجد بيانات مخزنة مسبقاً.');
            }
        } catch (err) {
            console.error(err);
            toastError('فشل تحديث البيانات من السيرفر، جاري استخدام النسخة المحلية.');
        } finally {
            setLoading(false);
        }
    };





    const removeFromCart = (uniqueId) => setCart(prev => prev.filter((_, idx) => idx !== uniqueId));
    const handleClearCart = () => {
        setCart([]);
        setActivePendingOrderId(null);
    };

    const updateQuantity = (uniqueId, delta) => {
        setCart(prev => {
            const newCart = prev.map((item, idx) => {
                if (idx !== uniqueId) return item;

                const nq = item.quantity + delta;
                if (nq <= 0) return null;

                const maxQty = item.batch_info ? item.batch_info.remaining_qty : item.stock_quantity;
                if (nq > maxQty) {
                    SoundService.playError();
                    toastError(`الكمية غير متوفرة (المتاح: ${maxQty})`);
                    return item;
                }
                return { ...item, quantity: nq };
            }).filter(Boolean);
            return newCart;
        });
    };

    const total = cart.reduce((sum, i) => {
        const currentPrice = i.price_usd > 0 ? (i.price_usd * exchangeRate) : i.unit_price;
        return sum + currentPrice * i.quantity;
    }, 0);
    const totalUsd = cart.reduce((sum, i) => sum + (i.price_usd > 0 ? i.price_usd : (i.unit_price / (exchangeRate || 1))) * i.quantity, 0);
    const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setIsCheckoutModalOpen(true);
    };

    // Feature 2: Hold Order with SweetAlert2 customer name prompt
    const handleHoldOrder = async () => {
        if (cart.length === 0) return;

        let customer = selectedCustomer;

        if (!customer) {
            setIsSwalOpen(true);
            const { value: customerName, isConfirmed } = await inputDialog(
                'تعليق الفاتورة ⏸️',
                'مثال: أبو أحمد، طاولة 3...',
                'اسم الزبون أو التعريف'
            );
            setIsSwalOpen(false);
            if (!isConfirmed || !customerName) return;
            customer = { name: customerName.trim() };
        }

        const newHold = {
            id: Date.now(),
            cart: [...cart],
            customer,
            total,
            time: new Date().toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })
        };
        const updated = [newHold, ...heldOrders];
        setHeldOrders(updated);
        localStorage.setItem('heldOrders', JSON.stringify(updated));
        setCart([]);
        setSelectedCustomer(null);
        toastSuccess(`تم تعليق فاتورة "${customer.name}" بنجاح ⏸️`);
    };

    const resumeOrder = async (held) => {
        if (cart.length > 0) {
            setIsSwalOpen(true);
            const result = await confirmDialog(
                'استئناف فاتورة معلقة',
                'سوف يتم استبدال السلة الحالية بالفاتورة المعلقة. هل أنت متأكد؟',
                'question'
            );
            setIsSwalOpen(false);
            if (!result.isConfirmed) return;
        }
        setCart(held.cart);
        setSelectedCustomer(held.customer);
        const updated = heldOrders.filter(o => o.id !== held.id);
        setHeldOrders(updated);
        localStorage.setItem('heldOrders', JSON.stringify(updated));
        setShowHeldOrders(false);
    };

    const deleteHeldOrder = (id) => {
        const updated = heldOrders.filter(o => o.id !== id);
        setHeldOrders(updated);
        localStorage.setItem('heldOrders', JSON.stringify(updated));
    };

    const handleAcceptPendingOrder = async (order) => {
        try {
            setLoading(true);
            const res = await api.patch(`/${slug}/pending-orders/${order.id}/status`, { status: 'accepted' });
            
            // 1. Show Success Message with Invoice Number
            toastSuccess(res.data.message || `تم قبول طلب "${order.customer_name_or_table}" وإصدار فاتورة رقم #${res.data.invoice_number}`);
            
            // 2. Remove from pending list
            setPendingOrders(prev => prev.filter(o => o.id !== order.id));
            
            // 3. Update Local Inventory (Real-time update)
            await fetchProducts();
            
            // 4. Close Modal
            setIsPendingOrdersModalOpen(false);
            
            // 5. Sound Feedback
            SoundService.playSuccess();
        } catch (err) {
            console.error(err);
            toastError(err.response?.data?.message || 'فشل قبول الطلب وتوليد الفاتورة');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectPendingOrder = async (id) => {
        try {
            await api.patch(`/${slug}/pending-orders/${id}/status`, { status: 'rejected' });
            setPendingOrders(prev => prev.filter(o => o.id !== id));
            toastSuccess('تم رفض الطلب');
        } catch (err) {
            toastError('فشل تحديث حالة الطلب');
        }
    };

    const handleReprintLast = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/${slug}/last-order`);
            const order = res.data.order;
            await generateInvoice(order, order.items.map(i => ({
                ...i.product,
                quantity: i.quantity,
                price: i.unit_price
            })), user?.store);
        } catch (err) {
            toastError(err.response?.data?.message || 'فشل جلب آخر فاتورة');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmCheckout = async (printInvoice, paymentMethod = 'cash', customerId = null, receivedAmount = 0, changeAmount = 0) => {
        const orderUuid = uuidv4();
        const orderData = {
            uuid: orderUuid,
            items: cart.map(i => ({
                product_id: i.uuid || i.id, // Use UUID if available
                quantity: i.quantity,
                batch_id: i.batch_uuid || i.batch_id,
                name: i.name,
                unit_price: i.price_usd > 0 ? (i.price_usd * exchangeRate) : i.unit_price
            })),
            payment_method: paymentMethod,
            customer_id: customerId, // Frontend should pass numeric or UUID
            total_amount: total,
            received_amount: receivedAmount,
            change_amount: changeAmount,
            store_id: Number(user?.store_id || user?.store?.id),
            exchange_rate: exchangeRate,
            created_at: new Date().toISOString()
        };

        setLoading(true);
        try {
            // 0. Update Pending Order Status if linked
            if (activePendingOrderId) {
                await api.patch(`/${slug}/pending-orders/${activePendingOrderId}/status`, { status: 'accepted' });
                setPendingOrders(prev => prev.filter(o => o.id !== activePendingOrderId));
                setActivePendingOrderId(null);
            }

            // 1. Always Save Locally First (Offline-First)
            await savePendingOrder(orderData);

            // 2. Optimistic success feedback
            if (printInvoice) {
                // For printing, we use the local cart data
                await generateInvoice({ ...orderData, invoice_number: 'PENDING' }, cart, user?.store);
            }

            toastSuccess(paymentMethod === 'credit' ? 'تم حفظ الفاتورة محلياً وتحويلها للمزامنة! 📝' : 'تمت عملية البيع محلياً! 🎉');
            setCart([]);
            setIsCheckoutModalOpen(false);

            // 3. Attempt to Sync in background
            SyncService.sync();
            
            // 4. Update local state products list (stock was already updated in Dexie by savePendingOrder)
            fetchProducts();
        } catch (err) {
            console.error("Local Save Error:", err);
            toastError("فشل حفظ الفاتورة محلياً!");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-slate-100" dir="rtl">

            {/* Header: Compact and Responsive */}
            <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2 md:px-8 md:py-4 flex items-center justify-between gap-4 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 shrink-0">
                        <ShoppingCart size={22} />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="text-sm md:text-xl font-black text-slate-800 tracking-tight leading-tight">نقطة البيع</h1>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{slug || 'المتجر'}</p>
                    </div>
                </div>

                <div className="flex-1 max-w-2xl">
                    <div className="relative group">
                        {/* Camera Button (Mobile First) */}
                        <div className="absolute right-2 inset-y-0 flex items-center gap-1">
                            <button
                                onClick={() => setShowScanner(true)}
                                className="text-slate-400 hover:text-blue-600 transition-colors p-2.5 rounded-xl hover:bg-slate-100"
                                title="فتح الكاميرا للمسح"
                            >
                                <Camera size={22} className="md:size-5" />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="بحث أو باركود..."
                            value={gridSearch}
                            onChange={(e) => setGridSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && gridSearch.trim()) {
                                    handleBarcodeScan(gridSearch);
                                }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 md:py-2.5 pr-12 md:pr-14 pl-10 text-xs md:text-sm focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all shadow-sm font-bold placeholder:text-slate-400"
                        />
                        
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <Search size={18} />
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <SyncIndicator />
                    
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-sm shrink-0">
                        <NotificationCenter />
                        <button
                            onClick={() => {
                                if (!remoteSessionId) setRemoteSessionId(uuidv4());
                                setIsRemoteModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-all"
                            title="ربط الجوال"
                        >
                            <Smartphone size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content: Unified Grid + Sidebar/Drawer */}
            <main className="flex-1 flex overflow-hidden relative" dir="rtl">
                
                {/* Cart Sidebar (Desktop) - Right Side in RTL */}
                <aside className="hidden lg:flex w-[380px] shrink-0 flex-col bg-white border-l border-slate-200 shadow-xl z-10 h-full">
                    <CartContent 
                        cart={cart} 
                        total={total} 
                        onUpdateQuantity={updateQuantity} 
                        onRemove={removeFromCart} 
                        onCheckout={handleCheckout}
                        itemCount={itemCount}
                        onClear={handleClearCart}
                        loading={loading}
                        customer={selectedCustomer}
                        onCustomerSelect={setSelectedCustomer}
                        heldOrders={heldOrders}
                        showHeld={showHeldOrders}
                        setShowHeld={setShowHeldOrders}
                        onDeleteHeld={deleteHeldOrder}
                        onResumeHeld={resumeOrder}
                        onOpenPending={() => setIsPendingOrdersModalOpen(true)}
                        pendingCount={pendingOrders.length}
                        onReprint={handleReprintLast}
                        exchangeRate={exchangeRate}
                    />
                </aside>

                {/* Products Grid: Left Side in RTL */}
                <section className="flex-1 flex flex-col overflow-hidden">
                    <div className="shrink-0 flex justify-between items-center px-4 py-3 md:px-6 md:py-4 gap-4">
                        <h2 className="font-extrabold text-slate-800 text-xs md:text-lg leading-tight">المنتجات والوجبات</h2>
                        <span className="text-[9px] md:text-xs text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-100">
                            {filteredItems.length} عنصر
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-28 md:px-6 md:pb-6 pt-2">
                        {filteredItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                                <Package size={48} className="mb-4 opacity-20" />
                                <p className="text-xs font-bold text-slate-400">لا توجد نتائج</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                                {filteredItems.map((product, idx) => (
                                    <ProductCard key={`${product.id}-${product.batch_id || idx}`} product={product} onAdd={addToCart} exchangeRate={exchangeRate} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Cart Drawer (Mobile) */}
                {isCartDrawerOpen && (
                    <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCartDrawerOpen(false)} />
                        <div className="relative bg-white rounded-t-[2.5rem] shadow-2xl h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <CartContent 
                                    cart={cart} 
                                    total={total} 
                                    onUpdateQuantity={updateQuantity} 
                                    onRemove={removeFromCart} 
                                    onCheckout={handleCheckout}
                                    itemCount={itemCount}
                                    onClear={handleClearCart}
                                    loading={loading}
                                    customer={selectedCustomer}
                                    onCustomerSelect={setSelectedCustomer}
                                    heldOrders={heldOrders}
                                    showHeld={showHeldOrders}
                                    setShowHeld={setShowHeldOrders}
                                    onDeleteHeld={deleteHeldOrder}
                                    onResumeHeld={resumeOrder}
                                    onOpenPending={() => setIsPendingOrdersModalOpen(true)}
                                    pendingCount={pendingOrders.length}
                                    onReprint={handleReprintLast}
                                    exchangeRate={exchangeRate}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Bottom Navigation / Checkout FAB */}
                <div className="lg:hidden fixed bottom-6 inset-x-6 z-50">
                    <button
                        onClick={() => setIsCartDrawerOpen(true)}
                        className="w-full bg-slate-900 text-white rounded-[2rem] p-4 flex items-center justify-between shadow-2xl shadow-slate-900/40 ring-4 ring-white active:scale-95 transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center relative">
                                <ShoppingCart size={20} />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 animate-bounce">
                                        {itemCount}
                                    </span>
                                )}
                            </div>
                            <span className="font-black text-xs uppercase tracking-wider">عرض السلة</span>
                        </div>
                        <div className="text-left">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">الإجمالي</span>
                            <span className="text-base font-black text-blue-400 leading-none">{(total || 0).toLocaleString('ar-SY')} ل.س</span>
                        </div>
                    </button>
                </div>
            </main>

            {/* Modals & Overlays */}
            <CheckoutModal isOpen={isCheckoutModalOpen} onClose={() => setIsCheckoutModalOpen(false)} onConfirm={handleConfirmCheckout} total={total} totalUsd={totalUsd} loading={loading} initialCustomer={selectedCustomer} />
            <BatchPickerModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} product={pendingProduct} onSelect={(batch) => addToCart(pendingProduct, batch)} />
            {showScanner && <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />}
            
            {isRemoteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b border-slate-50 relative">
                            <button onClick={() => setIsRemoteModalOpen(false)} className="absolute left-4 top-4 p-2 text-slate-400"><X size={20} /></button>
                            <MonitorSmartphone className="text-emerald-600 mx-auto mb-2" size={32} />
                            <h3 className="text-lg font-black text-slate-800">ربط ماسح جوال</h3>
                        </div>
                        <div className="p-8 flex flex-col items-center gap-4">
                            <div className="p-2 bg-white border-4 border-slate-50 rounded-2xl">
                                <QRCodeCanvas value={`${window.location.origin}/${slug}/scan/${remoteSessionId}`} size={160} />
                            </div>
                            <p className="text-[10px] text-slate-400 text-center font-bold">امسح الكود لفتح ماسح الباركود على هاتفك</p>
                        </div>
                        <div className="p-4 bg-slate-50"><button onClick={() => setIsRemoteModalOpen(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">إغلاق</button></div>
                    </div>
                </div>
            )}

            <PendingOrdersModal isOpen={isPendingOrdersModalOpen} onClose={() => setIsPendingOrdersModalOpen(false)} orders={pendingOrders} onAccept={handleAcceptPendingOrder} onReject={handleRejectPendingOrder} loading={loading} />
        </div>
    );
};

export default PosPage;
