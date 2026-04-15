import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

/**
 * AuthContext — Centralized Authentication Management
 * Resolves circular dependencies between App.jsx and sub-pages.
 */
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Initial state with safe persistence checks
    const [user, setUser] = useState(() => {
        try {
            const saved = localStorage.getItem('pos_user');
            return saved ? JSON.parse(saved) : null;
        } catch (e) {
            console.error("AuthContext: Error parsing user from localStorage:", e);
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('pos_token'));
    const [isLoading, setIsLoading] = useState(() => !!localStorage.getItem('pos_token'));

    // Re-hydration: Verify token on mount
    useEffect(() => {
        const verifyToken = async () => {
            if (token) {
                try {
                    const res = await api.get('/user');
                    const userData = res.data;
                    setUser(userData);
                } catch (err) {
                    console.error("AuthContext: Token verification failed", err);
                    
                    // ONLY clear session if it's an Authentication error (401)
                    // 403 (Unauthorized store) should NOT logout the user
                    if (err.response?.status === 401) {
                        localStorage.removeItem('pos_token');
                        localStorage.removeItem('pos_user');
                        localStorage.removeItem('pos_slug');
                        setToken(null);
                        setUser(null);
                    }
                }
            }
            setIsLoading(false);
        };

        verifyToken();
    }, []);

    // Derived flags for cleaner component logic
    const isAuthenticated = !!token;
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isSupplier = user?.role === 'SUPPLIER';
    const isAdmin = isSuperAdmin || user?.role === 'admin';

    /**
     * handleLogin — Persist session data and update state
     */
    const handleLogin = (token, userData, slug) => {
        localStorage.setItem('pos_token', token);
        localStorage.setItem('pos_user', JSON.stringify(userData));
        if (slug) localStorage.setItem('pos_slug', slug);

        setToken(token);
        setUser(userData);

        // Smart Redirect
        if (userData.role === 'SUPER_ADMIN') {
            window.location.href = '/super-admin';
        } else if (userData.role === 'SUPPLIER') {
            window.location.href = '/supplier/dashboard';
        } else if (slug) {
            // Store Admin and Cashiers go directly to POS for faster workflow
            window.location.href = `/${slug}/pos`;
        } else {
            window.location.href = '/';
        }
    };

    /**
     * handleUpdateUser — Update user data
     */
    const handleUpdateUser = (userData) => {
        localStorage.setItem('pos_user', JSON.stringify(userData));
        setUser(userData);
    };

    /**
     * handleLogout — Clear session and state
     */
    const handleLogout = () => {
        const isSuper = user?.role === 'SUPER_ADMIN';
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_slug');
        setToken(null);
        setUser(null);
        
        window.location.href = isSuper ? '/super-admin/login' : '/';
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated,
            isLoading,
            isAdmin,
            isSuperAdmin,
            isSupplier,
            onLogin: handleLogin,
            onLogout: handleLogout,
            onUpdateUser: handleUpdateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * useAuth — Custom hook for easy access to AuthContext
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
