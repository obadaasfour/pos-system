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
    Receipt, Zap, Save, Printer, User, Wallet, Loader2,
    Wifi, WifiOff, CloudOff, Camera, Barcode, Smartphone, Link, MonitorSmartphone,
    Radio
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

    const fetchCustomers = async (q) => {
        if (!q) return;
        try {
            const res = await api.get('/customers');
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

/* ── Product Card ─────────────────────────────── */
const ProductCard = ({ product, onAdd }) => {
    const outOfStock = product.stock_quantity === 0;
    const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

    return (
        <div
            onClick={() => !outOfStock && onAdd(product)}
            className={`
                group relative bg-white rounded-2xl border flex flex-col overflow-hidden transition-all duration-200
                ${outOfStock
                    ? 'opacity-55 cursor-not-allowed border-slate-200'
                    : 'cursor-pointer border-slate-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-50 active:scale-95'
                }
            `}
        >
            <div className="relative bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center h-28 overflow-hidden">
                {product.image_path ? (
                    <img src={`${api.defaults.baseURL.replace('/api', '')}/storage/${product.image_path}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                ) : (
                    <Package size={46} className="text-blue-200 group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300" />
                )}
                {outOfStock && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full shadow-sm">نفدت الكمية</span>
                    </div>
                )}
                {lowStock && !outOfStock && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 shadow-sm z-10">
                        <AlertTriangle size={10} /> يوشك النفاد
                    </span>
                )}
                {!outOfStock && (
                    <button className="absolute bottom-2 left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md active:scale-90 z-10">
                        <Plus size={16} />
                    </button>
                )}
            </div>

            <div className="p-3 flex flex-col gap-1.5 flex-1 relative z-10">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-800 text-sm leading-tight truncate pl-2">{product.name}</h3>
                </div>
                {product.is_batch && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 w-fit px-1.5 py-0.5 rounded uppercase">
                        وجبة: {product.batch_date}
                    </div>
                )}
                <div className="flex justify-between items-end mt-auto pt-1">
                    <div className="flex flex-col">
                        <span className="text-blue-600 font-extrabold text-base leading-none">
                            {formatPrice(product.price || 0)}
                        </span>
                        {(product.price_usd > 0) && (
                            <span className="text-[10px] text-emerald-600 mt-1 font-bold">
                                ({formatUsd(product.price_usd)})
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] font-semibold ${lowStock ? 'text-amber-500' : 'text-slate-400'}`}>الكمية: {product.stock_quantity}</span>
                </div>
                {product.barcode && !product.is_batch && (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                        <BarChart2 size={9} /><span>{product.barcode}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Cart Item ─────────────────────────────────── */
const CartItem = ({ item, onUpdate, onRemove }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors group">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Package size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm truncate leading-tight">{item.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{formatPrice(item.unit_price)} / وحدة</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => onUpdate(item.id, -1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><Minus size={12} /></button>
            <span className="text-sm font-bold text-slate-800 w-6 text-center select-none">{item.quantity}</span>
            <button onClick={() => onUpdate(item.id, 1)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"><Plus size={12} /></button>
        </div>
        <div className="text-left min-w-[80px]">
            <span className="block text-sm font-extrabold text-slate-800">{formatPrice(item.unit_price * item.quantity)}</span>
            {(item.price_usd > 0) && <span className="block text-[10px] text-emerald-600 font-bold">({formatUsd(item.price_usd * item.quantity)})</span>}
        </div>
        <button onClick={() => onRemove(item.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
            <X size={15} />
        </button>
    </div>
);

/* ── Main POS Page ─────────────────────────────── */
const PosPage = () => {
    const { slug } = useParams();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [products, setProducts] = useState([]);
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

    // --- Utilities & Handlers (Moved up to fix ReferenceError) ---

    const flattenProducts = (list) => {
        return (list || []).flatMap(p => {
            if (!p.batches || p.batches.length === 0) {
                return [{ ...p, batch_id: null, is_batch: false }];
            }
            return p.batches.map(b => ({
                ...p,
                is_batch: true,
                batch_id: b.id,
                stock_quantity: b.remaining_qty,
                price: parseFloat(b.sale_price) > 0 ? parseFloat(b.sale_price) : parseFloat(p.price || 0),
                price_usd: parseFloat(b.cost_usd || 0),
                batch_date: new Date(b.created_at).toLocaleDateString('ar-SY', { month: 'short', day: 'numeric', year: 'numeric' }),
                batch_exchange_rate: b.exchange_rate,
                batch_info: b
            }));
        });
    };

    const flattenedInventory = React.useMemo(() => flattenProducts(products), [products]);

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
        SyncService.startAutoSync();
        fetchProducts();
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
        console.log('[Remote Scanner] Effect Triggered. Checking dependencies...');
        
        if (!remoteSessionId || !currentStoreId) {
            console.log('[Remote Scanner] Subscription blocked: Missing IDs', { remoteSessionId, currentStoreId });
            return;
        }

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
                const res = await api.get('/pending-orders');
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
                const res = await api.get('/inventory');
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

    const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
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
        let finalItems = [];
        const incomingItems = (order.items || []).map(item => {
            // Find the original product from flattenedInventory to get all metadata
            const originalProduct = flattenedInventory.find(p => p.id === item.id);
            if (!originalProduct) return null;
            return {
                ...originalProduct,
                quantity: item.quantity,
                unit_price: Number(item.price)
            };
        }).filter(Boolean);

        if (cart.length > 0) {
            const result = await confirmDialog(
                'دمج أم استبدال؟',
                'سلة الكاشير تحتوي على أصناف حالياً. هل تريد الدمج أم الاستبدال؟',
                'question',
                'دمج الأصناف',
                'استبدال بالكامل'
            );

            if (result.isConfirmed) {
                // Merge Logic (Simple version: append)
                setCart(prev => [...prev, ...incomingItems]);
            } else if (result.dismiss === 'cancel') {
                // Replace Logic
                setCart(incomingItems);
            } else {
                return; // User closed modal
            }
        } else {
            setCart(incomingItems);
        }

        setSelectedCustomer({ name: order.customer_name_or_table });
        setActivePendingOrderId(order.id);
        setIsPendingOrdersModalOpen(false);
        toastSuccess(`تم شحن طلب "${order.customer_name_or_table}" إلى السلة ✅`);
    };

    const handleRejectPendingOrder = async (id) => {
        try {
            await api.patch(`/pending-orders/${id}/status`, { status: 'rejected' });
            setPendingOrders(prev => prev.filter(o => o.id !== id));
            toastSuccess('تم رفض الطلب');
        } catch (err) {
            toastError('فشل تحديث حالة الطلب');
        }
    };

    const handleReprintLast = async () => {
        setLoading(true);
        try {
            const order = res.data.order;
            generateInvoice(order, order.items.map(i => ({
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
                unit_price: i.unit_price
            })),
            payment_method: paymentMethod,
            customer_id: customerId, // Frontend should pass numeric or UUID
            total_amount: total,
            received_amount: receivedAmount,
            change_amount: changeAmount,
            store_id: Number(user?.store_id || user?.store?.id),
            created_at: new Date().toISOString()
        };

        setLoading(true);
        try {
            // 0. Update Pending Order Status if linked
            if (activePendingOrderId) {
                await api.patch(`/pending-orders/${activePendingOrderId}/status`, { status: 'accepted' });
                setPendingOrders(prev => prev.filter(o => o.id !== activePendingOrderId));
                setActivePendingOrderId(null);
            }

            // 1. Always Save Locally First (Offline-First)
            await savePendingOrder(orderData);

            // 2. Optimistic success feedback
            if (printInvoice) {
                // For printing, we use the local cart data
                generateInvoice({ ...orderData, invoice_number: 'PENDING' }, cart, user?.store);
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

    // Feature 1: Filter products for grid display (with safety checks)


    const filteredItems = flattenedInventory.filter(item => {
        if (!item) return false;
        if (!gridSearch.trim()) return true;
        const q = gridSearch.toLowerCase();
        return item.name?.toLowerCase().includes(q) || (item.barcode && item.barcode.includes(gridSearch));
    });

    return (
        <div className="flex flex-col h-full bg-slate-100" dir="rtl">

            {/* Header - Hidden on Mobile/Tablet (<1024px) */}
            <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm z-10 px-6 py-3 hidden lg:flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                        <Zap size={22} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-black text-slate-800 leading-tight">نقطة البيع</h1>
                        <p className="text-[11px] font-bold text-slate-400">مرحباً، {user?.name}</p>
                    </div>
                </div>

                <div className="flex-1 max-w-3xl mx-auto flex items-center gap-3">
                    {/* زر إضافة منتج سريع - يظهر أولاً قبل البحث */}
                    <button
                        onClick={() => window.location.href = '/inventory/products/create'}
                        className="w-11 h-11 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
                        title="إضافة منتج جديد"
                    >
                        <Plus size={22} />
                    </button>

                    {/* حقل البحث المدمج */}
                    <div className="flex-1 relative group">
                        {/* أيقونات الباركود والكاميرا في بداية الحقل (اليمين في RTL) */}
                        <div className="absolute inset-y-0 right-3 flex items-center gap-2">
                            <Barcode size={18} className="text-slate-300" />
                            <button
                                onClick={() => setShowScanner(true)}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title="فتح الكاميرا للمسح"
                            >
                                <Camera size={18} />
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="ابحث بالاسم أو امسح الباركود..."
                            value={gridSearch}
                            onChange={(e) => setGridSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && gridSearch.trim()) {
                                    handleBarcodeScan(gridSearch);
                                }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pr-20 pl-12 text-sm focus:ring-4 focus:ring-blue-100 focus:bg-white focus:border-blue-400 outline-none transition-all shadow-sm font-bold placeholder:text-slate-400"
                        />
                        
                        {/* أيقونة البحث في نهاية الحقل (اليسار في RTL) */}
                        <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={19} />
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Sync Indicator */}
                    <SyncIndicator />

                    {/* كتلة الأيقونات مدمجة: الإشعارات أولاً ثم الجوال لعدم عكس الترتيب البصري */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 gap-1 shadow-sm">
                        <NotificationCenter />
                        {window.innerWidth >= 1024 && (
                            <>
                                <div className="w-[1px] h-6 bg-slate-100 mx-1" />
                                <button
                                    onClick={() => {
                                        if (!remoteSessionId) setRemoteSessionId(Math.random().toString(36).substring(2, 12));
                                        setIsRemoteModalOpen(true);
                                    }}
                                    className="p-2.5 text-slate-400 hover:text-blue-600 transition-all active:scale-95"
                                    title="ربط الجوال"
                                >
                                    <Smartphone size={20} />
                                </button>
                            </>
                        )}
                    </div>

                    <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shrink-0 font-bold shadow-sm">
                        <Tag size={14} className="text-blue-400" /> <span>نظام المسح السريع</span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* --- Mobile/Tablet View (Vertical - Standalone) --- */}
                <div className="flex lg:hidden flex-col h-full overflow-hidden">
                    {/* Upper Section: Barcode Scanner (Inline) */}
                    <div className="shrink-0">
                        <BarcodeScanner 
                            isInline={true}
                            onScan={handleBarcodeScan}
                            onClose={() => {}} // No close in inline mode
                        />
                    </div>

                    {/* Lower Section: Cart Items */}
                    <div className="flex-1 overflow-y-auto bg-white p-4 space-y-3 pb-24">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                <ShoppingCart size={20} className="text-blue-600" />
                                سلة المشتريات
                            </h2>
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                                {itemCount} صنف
                            </span>
                        </div>
                        
                        {cart.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                                <Barcode size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-bold">ابدأ بمسح الباركود الآن</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <CartItem
                                    key={`${item.id}-${item.batch_id}-${idx}`}
                                    item={item}
                                    onUpdate={() => updateQuantity(idx, 1)}
                                    onRemove={() => removeFromCart(idx)}
                                />
                            ))
                        )}
                    </div>

                    {/* Mobile Sticky Footer */}
                    <div className="shrink-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-slate-500 font-bold">الإجمالي النهائي:</span>
                            <span className="text-xl font-black text-blue-600">{formatPrice(total)}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loading}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-lg bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <><Receipt size={22} /> إتمام البيع</>}
                        </button>
                    </div>
                </div>

                {/* --- Desktop View (Side-by-Side - Reception) --- */}
                <main className="hidden lg:flex flex-1 overflow-hidden">

                {/* Cart — Left */}
                <aside className="w-[380px] shrink-0 flex flex-col bg-white border-l border-slate-200 shadow-lg">
                    <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShoppingCart size={20} className="text-blue-600" />
                            <h2 className="font-extrabold text-slate-800 text-base">سلة المبيعات</h2>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleReprintLast}
                                title="إعادة طباعة آخر فاتورة"
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            >
                                <Printer size={18} />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowHeldOrders(!showHeldOrders)}
                                    title="الفواتير المعلقة"
                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                >
                                    <Save size={18} />
                                </button>
                                {heldOrders.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                        {heldOrders.length}
                                    </span>
                                )}

                                {showHeldOrders && (
                                    <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-in slide-in-from-top-2">
                                        <h3 className="text-xs font-bold text-slate-400 px-3 py-2 border-b border-slate-50 mb-2">الفواتير المعلقة</h3>
                                        {heldOrders.length === 0 ? (
                                            <p className="text-[11px] text-slate-400 text-center py-4">لا توجد فواتير معلقة</p>
                                        ) : (
                                            <div className="max-h-64 overflow-y-auto space-y-1">
                                                {heldOrders.map(o => (
                                                    <div key={o.id} className="group flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                                                        <div className="flex-1 min-w-0" onClick={() => resumeOrder(o)}>
                                                            <p className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                                                                <User size={11} className="text-blue-400 shrink-0" />
                                                                {o.customer?.name || 'زبون نقدي'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">{o.time} • {o.cart.length} أصناف • {formatPrice(o.total)}</p>
                                                        </div>
                                                        <button onClick={() => deleteHeldOrder(o.id)} className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><X size={14} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {cart.length > 0 && (
                                <button onClick={() => setCart([])} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50">
                                    <Trash2 size={13} />
                                </button>
                            )}
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full min-w-[32px] text-center">{itemCount}</span>
                        </div>
                    </div>

                    {/* Quick Customer Search & Hold */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex gap-2">
                        <div className="flex-1 relative">
                            <CustomerQuickSearch
                                onSelect={setSelectedCustomer}
                                selectedCustomer={selectedCustomer}
                            />
                        </div>
                        <button
                            onClick={handleHoldOrder}
                            disabled={cart.length === 0}
                            className="bg-white border border-slate-200 text-slate-500 p-2.5 rounded-xl hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
                            title="تعليق الفاتورة (Hold)"
                        >
                            <Save size={20} className="group-active:scale-90 transition-transform" />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsPendingOrdersModalOpen(true)}
                                className={`p-2.5 rounded-xl transition-all relative ${pendingOrders.length > 0 ? 'bg-rose-50 border border-rose-100 text-rose-600 animate-pulse hover:bg-rose-100' : 'bg-white border border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                title="طلبات المنيو (QR)"
                            >
                                <Radio size={20} className={pendingOrders.length > 0 ? "animate-spin-slow" : ""} />
                                {pendingOrders.length > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                                        {pendingOrders.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 select-none">
                                <ShoppingCart size={64} className="mb-4 opacity-30" />
                                <p className="text-sm font-medium text-slate-400">لا توجد منتجات في السلة</p>
                                <p className="text-xs text-slate-300 mt-1">امسح الباركود أو اختر منتجاً</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <CartItem
                                    key={`${item.id}-${item.batch_id}-${idx}`}
                                    item={item}
                                    onUpdate={() => updateQuantity(idx, 1)}
                                    onRemove={() => removeFromCart(idx)}
                                />
                            ))
                        )}
                    </div>

                    <div className="shrink-0 border-t border-slate-100 p-5 bg-slate-50 space-y-3">
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-500"><span>المجموع الفرعي</span><span>{formatPrice(total)}</span></div>
                            <div className="flex justify-between text-slate-500"><span>الضريبة (0%)</span><span>0 ل.س</span></div>
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-slate-200">
                            <span className="font-extrabold text-slate-800 text-base">الإجمالي</span>
                            <div className="text-left">
                                <span className="block font-extrabold text-blue-700 text-2xl leading-none">{formatPrice(total)}</span>
                                <span className="block font-bold text-emerald-600 text-sm mt-1">({formatUsd(cart.reduce((sum, i) => sum + (i.price_usd > 0 ? i.price_usd : (i.unit_price / (Number(localStorage.getItem('exchange_rate')) || 1))) * i.quantity, 0))})</span>
                            </div>
                        </div>
                        <button
                            id="checkout-btn"
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loading}
                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-extrabold text-base bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed shadow-lg shadow-blue-200 active:scale-95 transition-all"
                        >
                            {loading
                                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                : <><Receipt size={20} /><span>إتمام عملية البيع</span><CheckCircle size={20} /></>
                            }
                        </button>
                    </div>
                </aside>

                {/* Products — Right */}
                <section className="flex-1 flex flex-col overflow-hidden">
                    {/* Feature 1: Grid search bar */}
                    <div className="shrink-0 flex justify-between items-center px-6 py-4 gap-4">
                        <div>
                            <h2 className="font-extrabold text-slate-800 text-lg leading-tight">المنتجات</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {filteredItems.length !== flattenedInventory.length
                                    ? `${filteredItems.length} نتيجة من ${flattenedInventory.length}`
                                    : `${flattenedInventory.length} منتج/عنصر متوفر`}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-thin px-6 pb-6 pt-2">
                        {filteredItems.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-300">
                                <Package size={56} className="mb-4 opacity-30" />
                                <p className="text-sm font-medium text-slate-400">
                                    {gridSearch ? `لا توجد منتجات تطابق "${gridSearch}"` : 'لا توجد منتجات من فئة الوجبات الحالية'}
                                </p>
                                {gridSearch && (
                                    <button onClick={() => setGridSearch('')} className="mt-2 text-xs text-blue-500 hover:underline">
                                        مسح البحث
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredItems.map((product, idx) => (
                                    <ProductCard key={`${product.id}-${product.batch_id || idx}`} product={product} onAdd={addToCart} />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>

            {/* Checkout Modal */}
            <CheckoutModal
                isOpen={isCheckoutModalOpen}
                onClose={() => setIsCheckoutModalOpen(false)}
                onConfirm={handleConfirmCheckout}
                total={total}
                loading={loading}
                initialCustomer={selectedCustomer}
            />

            <BatchPickerModal
                isOpen={isBatchModalOpen}
                onClose={() => setIsBatchModalOpen(false)}
                product={pendingProduct}
                onSelect={(batch) => addToCart(pendingProduct, batch)}
            />

            {showScanner && (
                <BarcodeScanner
                    onScan={handleBarcodeScan}
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
                            <p className="text-sm text-slate-500 mt-1 font-medium italic">استخدم هاتفك لمسح الأصناف بسرعة!</p>
                        </div>

                        <div className="p-8 flex flex-col items-center gap-6">
                            <div className="p-4 bg-white border-4 border-slate-100 rounded-3xl shadow-inner">
                                <QRCodeCanvas
                                    // الرابط يتولد ديناميكياً بناءً على العنوان الذي تفتح منه النظام حالياً
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
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                                    <Zap size={14} className="shrink-0" />
                                    <span>يجب أن يكون الجوال مسجلاً دخوله على نفس المتجر.</span>
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

            <PendingOrdersModal
                isOpen={isPendingOrdersModalOpen}
                onClose={() => setIsPendingOrdersModalOpen(false)}
                orders={pendingOrders}
                onAccept={handleAcceptPendingOrder}
                onReject={handleRejectPendingOrder}
                loading={loading}
            />
        </div>
    );
};

export default PosPage;
