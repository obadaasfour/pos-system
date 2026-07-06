import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api';
import echo from './utils/echo';
import Swal from 'sweetalert2';
import { Box, RefreshCcw } from 'lucide-react';
import SoundService from './utils/SoundService';

// ─── Micro-frontend Lazy Loading ──────────────────────────
const LandingPage = lazy(() => import('./landing/NewLandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const PosPage = lazy(() => import('./pages/PosPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const AddProductPage = lazy(() => import('./pages/AddProductPage'));
const EditProductPage = lazy(() => import('./pages/EditProductPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const DebtLedgerPage = lazy(() => import('./pages/DebtLedgerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const SuperAdminLayout = lazy(() => import('./components/SuperAdminLayout'));
const StoreLayout = lazy(() => import('./components/StoreLayout'));
const PublicMenu = lazy(() => import('./pages/PublicMenu'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const StoresPage = lazy(() => import('./pages/StoresPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const SupplierDashboard = lazy(() => import('./pages/SupplierDashboard'));
const RemoteScannerPage = lazy(() => import('./pages/RemoteScannerPage'));
const VerifyInvoicePage = lazy(() => import('./pages/VerifyInvoicePage'));

// ─── Global Redirect Handler ──────────────────────────────
const GlobalRedirectHandler = () => {
    const { isAuthenticated, isSuperAdmin, isSupplier, user, isLoading, slug } = useAuth();

    if (isLoading) return <Loader />;

    if (isAuthenticated) {
        if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
        if (isSupplier) return <Navigate to="/supplier-portal" replace />;
        
        // Retrieve slug from context or user object
        const targetSlug = slug || user?.store?.slug;

        if (targetSlug) {
            // Redirect Managers and Cashiers to POS, others to Dashboard
            if (user?.role === 'admin' || user?.role === 'cashier') {
                return <Navigate to={`/${targetSlug}/pos`} replace />;
            }
            return <Navigate to={`/${targetSlug}/dashboard`} replace />;
        }
        
        // Fallback if no slug is found but authenticated
        return <Navigate to="/" replace />;
    }

    return <LandingPage />;
};

function App() {
    const { isAdmin, isSuperAdmin, isSupplier, isAuthenticated, isLoading, onLogin, user } = useAuth();

    React.useEffect(() => {
        // ─── Programmatic Theme Cleanup ──────────────────────────────
        if (localStorage.getItem('theme-cleanup-v1') !== 'done') {
            localStorage.removeItem('theme');
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme-cleanup-v1', 'done');
        }

        if (!isAuthenticated || !user) return;

        if (user.store_id) {
            echo.private(`store.${user.store_id}`)
                .listen('.inventory.updated', (e) => {
                    import('./db').then(db => db.clearProducts());
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

        echo.channel('announcements')
            .listen('.announcement.created', (e) => {
                Swal.fire({
                    title: 'تنبيه جديد',
                    text: e.message,
                    icon: 'success',
                    confirmButtonText: 'حسناً',
                    confirmButtonColor: '#4f46e5',
                });
            });

        // ─── Private Notifications Listener ──────────────────────────
        echo.private(`App.Models.User.${user.id}`)
            .notification((notification) => {
                console.log('[Notification] Real-time notification received:', notification);
                
                if (notification.type === 'b2b_order_status') {
                    SoundService.playSuccess();
                    Swal.fire({
                        title: 'تحديث طلب B2B 🚀',
                        text: notification.message,
                        icon: 'success',
                        confirmButtonText: 'عرض الفاتورة 📄',
                        showCancelButton: true,
                        cancelButtonText: 'إغلاق',
                        confirmButtonColor: '#2563eb',
                    }).then((result) => {
                        if (result.isConfirmed && notification.url) {
                            window.location.href = notification.url;
                        }
                    });
                } else {
                    // Generic fallback for other notifications
                    Swal.fire({
                        title: 'إشعار جديد',
                        text: notification.message || 'وصلك إشعار جديد في النظام.',
                        icon: 'info',
                        toast: true,
                        position: 'top-left',
                        timer: 5000,
                        showConfirmButton: false
                    });
                }
            });

        return () => {
            if (echo) {
                if (user?.store_id) echo.leave(`store.${user.store_id}`);
                echo.leave('announcements');
                echo.leave('global-announcements');
            }
        };
    }, [isAuthenticated, user]);

    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<Loader />}>
                <Routes>
                    <Route path="/" element={<GlobalRedirectHandler />} />
                    <Route path="/login" element={!isAuthenticated ? <LoginPage onLogin={onLogin} /> : <GlobalRedirectHandler />} />

                    <Route path="/super-admin" element={isAuthenticated && isSuperAdmin ? <SuperAdminLayout /> : <Navigate to="/login" replace />}>
                        <Route index element={<SuperAdminDashboard />} />
                        <Route path="stores" element={<StoresPage />} />
                        <Route path="activity-logs" element={<ActivityLogsPage />} />
                        <Route path="suppliers" element={<SuppliersPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    <Route path="/supplier-portal" element={isAuthenticated && isSupplier ? <SupplierLayout /> : <Navigate to="/login" replace />}>
                        <Route index element={<SupplierDashboard />} />
                    </Route>

                    <Route path="/:slug">
                        <Route path="register" element={!isAuthenticated ? <RegisterPage onLogin={onLogin} /> : <Navigate to="/" replace />} />
                        <Route path="menu" element={<PublicMenu />} />
                        <Route path="verify-invoice/:uuid" element={<VerifyInvoicePage />} />
                        <Route element={isAuthenticated ? <StoreLayout /> : <Navigate to="/login" replace />}>
                            <Route index element={<DashboardPage />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="pos" element={<PosPage />} />
                            <Route path="scan/:sessionId" element={<RemoteScannerPage />} />
                            <Route path="invoices" element={<InvoicesPage />} />
                            <Route path="reports" element={<ReportsPage />} />
                            <Route path="debts" element={<DebtLedgerPage />} />
                            <Route path="products" element={<ProductListPage />} />
                            <Route path="products/add" element={<AddProductPage />} />
                            <Route path="products/edit/:id" element={<EditProductPage />} />
                            <Route path="purchases" element={<PurchasesPage />} />
                            <Route path="suppliers" element={<SuppliersPage />} />
                            <Route path="employees" element={<EmployeesPage />} />
                            <Route path="expenses" element={<ExpensesPage />} />
                            <Route path="users" element={<UsersPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="activity-logs" element={<ActivityLogsPage />} />
                        </Route>
                    </Route>

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

const SupplierLayout = () => (
    <ErrorBoundary>
        <div className="min-h-screen bg-slate-50">
            <SupplierDashboard />
        </div>
    </ErrorBoundary>
);

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center" dir="rtl">
                    <div className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-rose-100">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                            <Box size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-4">عذراً، حدث خطأ غير متوقع</h2>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">فشل النظام في تحميل بوابة المورد. يرجى المحاولة مرة أخرى أو الاتصال بالدعم الفني.</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-600 transition-all"
                        >
                            إعادة تحميل الصفحة
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const Loader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 blur-lg bg-blue-500/20 rounded-full animate-pulse"></div>
        </div>
    </div>
);

export default App;
