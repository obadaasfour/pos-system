import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PosPage from './pages/PosPage';
import PurchasesPage from './pages/PurchasesPage';
import SuppliersPage from './pages/SuppliersPage';
import ProductListPage from './pages/ProductListPage';
import AddProductPage from './pages/AddProductPage';
import EditProductPage from './pages/EditProductPage';
import InvoicesPage from './pages/InvoicesPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import DebtLedgerPage from './pages/DebtLedgerPage';
import SettingsPage from './pages/SettingsPage';
import EmployeesPage from './pages/EmployeesPage';
import ExpensesPage from './pages/ExpensesPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import UsersPage from './pages/UsersPage';
import SuperAdminLayout from './components/SuperAdminLayout';
import StoreLayout from './components/StoreLayout';
import PublicMenu from './pages/PublicMenu';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import StoresPage from './pages/StoresPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import SupplierDashboard from './pages/SupplierDashboard';
import RemoteScannerPage from './pages/RemoteScannerPage';
import { useAuth } from './context/AuthContext';
import echo from './utils/echo';
import Swal from 'sweetalert2';
import api from './api';

// ─── Production-Level Route Guards ──────────────────────────

/**
 * StoreLoginGuard:
 * - Prevents authenticated users from reaching login.
 * - Redirects SUPER_ADMIN to dashboard with replace: true.
 * - Redirects standard users to THEIR store.
 */
const StoreLoginGuard = ({ onLogin }) => {
    const { isAuthenticated, isSuperAdmin, user, isLoading } = useAuth();
    const { slug } = useParams();

    if (isLoading) return <Loader />;

    if (isAuthenticated) {
        if (isSuperAdmin) {
            return <Navigate to={`/${slug}/dashboard`} replace />;
        }
        // Redirect standard user to their own slug if they try to log in elsewhere
        return <Navigate to={`/${user?.store?.slug || ''}/dashboard`} replace />;
    }

    return <LoginPage onLogin={onLogin} />;
};

/**
 * GlobalRedirectHandler:
 * - Handles the root "/" based on auth state and role.
 */
const GlobalRedirectHandler = () => {
    const { isAuthenticated, isSuperAdmin, isSupplier, user, isLoading } = useAuth();

    if (isLoading) return <Loader />;

    if (isAuthenticated) {
        if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
        if (isSupplier) return <Navigate to="/supplier/dashboard" replace />;
        return <Navigate to={`/${user?.store?.slug || ''}/dashboard`} replace />;
    }

    return <LandingPage />;
};

function App() {
    const { isAdmin, isSuperAdmin, isSupplier, isAuthenticated, isLoading, onLogin, user } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated || !user) return;

        // 1. Listen for Store-specific Inventory & B2B Updates
        if (user.store_id) {
            echo.private(`store.${user.store_id}`)
                .listen('.inventory.updated', (e) => {
                    console.log('Real-time Inventory Update received:', e);
                    // Clear Dexie/IDB cache to force refetch on components
                    import('./db').then(db => db.cacheProducts(1, [])); 
                    // Note: In a production app, we'd more precisely update the specific product
                    Swal.fire({
                        title: 'تحديث مخزني',
                        text: 'تم تحديث كميات بعض المنتجات في المتجر.',
                        icon: 'info',
                        toast: true,
                        position: 'top-left',
                        timer: 4000,
                        showConfirmButton: false
                    });
                });
        }

        // 2. Listen for Global Announcements (Standard API-based)
        echo.channel('announcements')
            .listen('.announcement.created', (e) => {
                console.log('Global Announcement received:', e);
                Swal.fire({
                    title: 'تنبيه جديد',
                    text: e.message,
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#4f46e5',
                });
            });

        // 3. Listen for Global New Product (Public Socket-based) - ONLY for Stores
        console.log('[Echo Debug] Checking subscription conditions:', { isSuperAdmin, isSupplier, hasEcho: !!echo });
        if (!isSuperAdmin && !isSupplier && echo) {
            console.log('[Echo Debug] Subscribing to global-announcements...');
            echo.channel('global-announcements')
                .listen('.product.global_created', (e) => {
                    console.log('Global New Product Broadcast:', e);
                    Swal.fire({
                        title: '<span class="text-blue-600 font-black text-xl">🚀 منتج جديد من المورد!</span>',
                        html: `
                            <div class="flex flex-col items-center gap-4 py-4">
                                ${e.image_path ? `<img src="${e.image_path}" class="w-32 h-32 object-cover rounded-2xl shadow-md border border-slate-200" />` : `
                                    <div class="w-32 h-32 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                                        <i class="fas fa-box text-4xl"></i>
                                    </div>
                                `}
                                <div class="flex flex-col items-center text-center">
                                    <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">${e.supplier_name}</p>
                                    <h4 class="text-2xl font-black text-slate-800 leading-tight">${e.product_name}</h4>
                                    <div class="flex items-center gap-3 mt-4">
                                        <span class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-black border border-blue-200">$${e.price_usd}</span>
                                        <span class="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-black border border-emerald-200">${Number(e.price_syr).toLocaleString()} ل.س</span>
                                    </div>
                                    <div class="mt-4 flex items-center gap-2 text-slate-500 font-bold bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                        <i class="fas fa-phone-alt text-blue-500"></i>
                                        <span>${e.supplier_phone || 'رقم الهاتف غير متوفر'}</span>
                                    </div>
                                </div>
                            </div>
                        `,
                        showConfirmButton: true,
                        confirmButtonText: '<i class="fas fa-shopping-cart"></i> اطلب الآن',
                        showDenyButton: false,
                        showCancelButton: true,
                        cancelButtonText: 'إغلاق',
                        confirmButtonColor: '#2563eb',
                        width: '28em'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            // B2B Order Flow
                            Swal.fire({
                                title: 'طلب كمية جديدة',
                                text: `أدخل الكمية المطلوبة من ${e.product_name}:`,
                                input: 'number',
                                inputAttributes: { min: 1, step: 1 },
                                inputValue: 1,
                                showCancelButton: true,
                                confirmButtonText: 'إرسال الطلب',
                                cancelButtonText: 'إلغاء',
                                showLoaderOnConfirm: true,
                                preConfirm: (quantity) => {
                                    return api.post('/supplier-orders', {
                                        product_id: e.product_id,
                                        quantity: quantity,
                                        supplier_id: e.supplier_id
                                    }).then(response => {
                                        return response.data;
                                    }).catch(error => {
                                        Swal.showValidationMessage(`فشل الطلب: ${error.response?.data?.message || error.message}`);
                                    });
                                },
                                allowOutsideClick: () => !Swal.isLoading()
                            }).then((orderResult) => {
                                if (orderResult.isConfirmed) {
                                    Swal.fire({
                                        title: 'تم الطلب!',
                                        text: 'لقد تم إرسال طلبك للمورد بنجاح.',
                                        icon: 'success',
                                        timer: 3000,
                                        showConfirmButton: false
                                    });
                                }
                            });
                        } else if (result.isDenied) {
                            // Call Flow
                            if (e.supplier_phone) {
                                window.location.href = `tel:${e.supplier_phone}`;
                            } else {
                                Swal.fire({
                                    title: 'عذراً',
                                    text: 'رقم المورد غير متوفر.',
                                    icon: 'warning',
                                    toast: true,
                                    position: 'top-end',
                                    timer: 3000,
                                    showConfirmButton: false
                                });
                            }
                        }
                    });
                });
        }

        // 4. User Login Logic for existing announcements (DISABLED: Relying on Echo Listeners)
        /*
        if (!isSuperAdmin && !isSupplier) {
            api.get('/announcements/latest')
                ...
        }
        */

        // 5. Cleanup Function: Essential to prevent memory leaks and duplicate pop-ups
        return () => {
            if (echo) {
                // Leave private channels first
                if (user?.store_id) {
                    echo.leave(`store.${user.store_id}`);
                }
                // Leave global channels
                echo.leave('announcements');
                echo.leave('global-announcements');
            }
        };
    }, [isAuthenticated, user, isSuperAdmin, isSupplier]);

    if (isLoading) return <Loader />;

    return (
        <Router>
            <Routes>
                {/* 1. Global / Root */}
                <Route path="/" element={<GlobalRedirectHandler />} />

                {/* 2. Unified Login */}
                <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={onLogin} /> : <GlobalRedirectHandler />} />
                <Route path="/super-admin/login" element={<Navigate to="/login" replace />} />

                {/* 3. Supplier Routes */}
                <Route path="/supplier" element={isAuthenticated && isSupplier ? <div className="min-h-screen bg-slate-50"><SupplierDashboard /></div> : <Navigate to="/login" replace />}>
                    <Route path="dashboard" element={<SupplierDashboard />} />
                </Route>

                {/* 4. Global / Super Admin Routes */}
                <Route path="/super-admin" element={isAuthenticated && isSuperAdmin ? <SuperAdminLayout /> : <Navigate to="/login" replace />}>
                    <Route index element={<SuperAdminDashboard />} />
                    <Route path="stores" element={<StoresPage />} />
                    <Route path="activity-logs" element={<ActivityLogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Route>

                {/* 4. Store Specific Routes (/:slug) */}
                <Route path="/:slug">
                    {/* Store Public */}
                    <Route path="login" element={<StoreLoginGuard onLogin={onLogin} />} />
                    <Route path="register" element={!isAuthenticated ? <RegisterPage onLogin={onLogin} /> : <Navigate to="/" replace />} />
                    <Route path="menu" element={<PublicMenu />} />

                    {/* Store Protected */}
                    <Route element={isAuthenticated ? <StoreLayout /> : <Navigate to="login" replace />}>
                        <Route index element={isAdmin || isSuperAdmin ? <DashboardPage /> : <Navigate to="pos" replace />} />
                        <Route path="scan/:sessionId" element={<RemoteScannerPage />} />
                        <Route path="dashboard" element={isAdmin || isSuperAdmin ? <DashboardPage /> : <Navigate to="pos" replace />} />
                        <Route path="pos" element={<PosPage />} />
                        <Route path="invoices" element={<InvoicesPage />} />
                        <Route path="reports" element={isAdmin || isSuperAdmin ? <ReportsPage /> : <Navigate to="../pos" replace />} />
                        <Route path="debts" element={<DebtLedgerPage />} />
                        <Route path="products" element={isAdmin || isSuperAdmin ? <ProductListPage /> : <Navigate to="../pos" replace />} />
                        <Route path="products/add" element={isAdmin || isSuperAdmin ? <AddProductPage /> : <Navigate to="../products" replace />} />
                        <Route path="products/edit/:id" element={isAdmin || isSuperAdmin ? <EditProductPage /> : <Navigate to="../products" replace />} />
                        <Route path="purchases" element={isAdmin || isSuperAdmin ? <PurchasesPage /> : <Navigate to="../pos" replace />} />
                        <Route path="suppliers" element={isAdmin || isSuperAdmin ? <SuppliersPage /> : <Navigate to="../pos" replace />} />
                        <Route path="employees" element={isAdmin || isSuperAdmin ? <EmployeesPage /> : <Navigate to="../pos" replace />} />
                        <Route path="expenses" element={isAdmin || isSuperAdmin ? <ExpensesPage /> : <Navigate to="../pos" replace />} />
                        <Route path="users" element={isAdmin || isSuperAdmin ? <UsersPage /> : <Navigate to="../pos" replace />} />
                        <Route path="settings" element={isAdmin || isSuperAdmin ? <SettingsPage /> : <Navigate to="../pos" replace />} />
                        <Route path="activity-logs" element={isAdmin || isSuperAdmin ? <ActivityLogsPage /> : <Navigate to="../pos" replace />} />
                    </Route>
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </Router>
    );
}

const Loader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

export default App;
