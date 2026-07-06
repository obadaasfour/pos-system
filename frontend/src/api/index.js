import axios from 'axios';
import toast from 'react-hot-toast';

axios.defaults.withCredentials = true;

const host = window.location.hostname;
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || `http://asus-lp.local:8000/api`,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Add a request interceptor to include the token and Store-ID
api.interceptors.request.use((config) => {
    // Debug: Monitor token presence as requested
    const posToken = localStorage.getItem('pos_token');
    const legacyToken = localStorage.getItem('token');
    let slug = localStorage.getItem('pos_slug');
    
    // Robust Global Routing Detection
    const globalPaths = [
        'super-admin',
        'validate-slug',
        'supplier/', // Matches /supplier/dashboard, /supplier/orders but NOT /suppliers
        'suppliers',
        'settings',
        'broadcasting/auth',
        'login',
        'demo-login'
    ];
    
    const isGlobal = globalPaths.some(path => config.url.includes(path)) || 
                     config.url === '/login' || config.url === 'login'; 

    if (!slug && !isGlobal) {
        // Fallback: try to extract slug from window location if we are in a tenant route
        const match = window.location.pathname.match(/^\/([^/]+)/);
        if (match && match[1]) {
            const potentialSlug = match[1];
            if (!globalPaths.some(path => potentialSlug.includes(path.replace('/', ''))) && potentialSlug !== 'login') {
                slug = potentialSlug;
            }
        }
    }

    if (legacyToken) {
        console.warn(`[API] Found legacy 'token' in localStorage: ${legacyToken.substring(0, 10)}...`);
    }

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | Token Found: ${!!posToken} | Slug: ${slug || 'None'}`);

    // Always attach token if available
    if (posToken) {
        config.headers.Authorization = `Bearer ${posToken}`;
    }

    if (!isGlobal && slug) {
        const cleanUrl = config.url.startsWith('/') ? config.url.substring(1) : config.url;
        // Don't prepend if it's already there
        if (!cleanUrl.startsWith(`${slug}/`)) {
            config.url = `/${slug}/${cleanUrl}`;
        }
        config.headers['X-Store-Slug'] = slug;
    }

    console.log(`[API Final URL] ${config.url}`);

    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Diagnosis logging
        console.error('API Error Response:', {
            status: error.response?.status,
            url: error.config?.url,
            hasAuthHeader: !!error.config?.headers?.Authorization
        });

        if (error.response && error.response.status === 401) {
            // 1. Skip logout for non-critical or login routes
            if (error.config?.url?.includes('settings') || error.config?.url?.includes('login')) {
                return Promise.reject(error);
            }

            // 2. THE "EAGER REQUEST" GUARD
            if (!error.config?.headers?.Authorization) {
                console.warn("[AUTH] Intercepted 401 on request without Token. Skipping autologout.");
                return Promise.reject(error);
            }

            // 3. Retry Counter Logic (to prevent loop on fluke glitches)
            let authFailCount = parseInt(sessionStorage.getItem('auth_fail_streak') || '0');
            authFailCount++;
            sessionStorage.setItem('auth_fail_streak', authFailCount);

            if (authFailCount < 3) {
                console.warn(`[AUTH] 401 detected (Attempt ${authFailCount}/3). Showing notification instead of logout.`);
                toast.error('انتهت صلاحية الجلسة أو حدث خطأ في الاتصال. ستتم محاولة التحديث تلقائياً.');
                return Promise.reject(error);
            }

            // Only logout IF we actually had a token that was rejected multiple times
            sessionStorage.removeItem('auth_fail_streak');
            const userStr = localStorage.getItem('pos_user');
            let isSuper = false;
            try {
                if (userStr) {
                    const user = JSON.parse(userStr);
                    isSuper = user.role === 'SUPER_ADMIN';
                }
            } catch (e) {}

            localStorage.removeItem('pos_token');
            localStorage.removeItem('pos_user');
            
            toast.error('تم تسجيل الخروج لانتهاء الصلاحية.');
            window.location.href = isSuper ? '/super-admin/login' : '/login';
        } else if (error.response && error.response.status === 403) {
            const msg = error.response.data?.message || 'عذراً، ليس لديك صلاحية';
            toast.error(msg);
        } else {
            // Reset streak on any other response type (if applicable)
            sessionStorage.setItem('auth_fail_streak', '0');
        }
        return Promise.reject(error);
    }
);

export default api;
