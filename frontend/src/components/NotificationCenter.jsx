import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Package, Truck, Info, Clock, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import echo from '../utils/echo';
import { useAuth } from '../context/AuthContext';

const NotificationCenter = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { slug } = useParams();

    const fetchNotifications = async () => {
        try {
            const res = await api.get(`/${slug}/notifications`);
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();

            // Listen for real-time notifications via Laravel Private Channel
            const channel = echo.private(`App.Models.User.${user.id}`);
            
            channel.notification((notification) => {
                console.log("New Notification received:", notification);
                // Prepend new notification to the list
                setNotifications(prev => [
                    {
                        id: notification.id,
                        data: notification,
                        created_at: new Date().toISOString(),
                        read_at: null
                    },
                    ...prev
                ]);
            });

            return () => {
                echo.leave(`App.Models.User.${user.id}`);
            };
        }
    }, [user]);

    const markAsRead = async (id, targetUrl) => {
        try {
            await api.post(`/${slug}/notifications/${id}/read`);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setIsOpen(false);
            if (targetUrl) {
                // If the app is in Store context, prepend slug
                const target = slug ? `/${slug}${targetUrl}` : targetUrl;
                navigate(target);
            }
        } catch (err) {
            console.error("Failed to mark as read", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.post(`/${slug}/notifications/read-all`);
            setNotifications([]);
            setIsOpen(false);
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const uniqueNotifications = notifications.filter(
        (n, index, self) => index === self.findIndex(t => t.id === n.id)
    );

    const unreadCount = uniqueNotifications.length;

    const getIcon = (type) => {
        switch (type) {
            case 'b2b_proposal': return <Lightbulb size={16} className="text-amber-400" />;
            case 'b2b_order_status': return <Truck size={16} className="text-blue-500" />;
            case 'new_b2b_order': return <Package size={16} className="text-amber-500" />;
            default: return <Info size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative size-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all flex items-center justify-center bg-white/5 border border-white/5"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border border-slate-900 animate-pulse">
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute left-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                            dir="rtl"
                        >
                            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                                    <Bell size={16} className="text-blue-600" /> الإشعارات
                                </h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={markAllAsRead}
                                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-lg"
                                    >
                                        تحديد الكل كمقروء
                                    </button>
                                )}
                            </div>

                            <div className="max-h-[400px] overflow-y-auto scrollbar-none">
                                {uniqueNotifications.length === 0 ? (
                                    <div className="p-10 text-center space-y-3">
                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 font-sans">لا توجد إشعارات جديدة</p>
                                    </div>
                                ) : (
                                    uniqueNotifications.map((n) => (
                                        <div 
                                            key={n.id}
                                            onClick={() => markAsRead(n.id, n.data.url)}
                                            className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors flex gap-4 group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all text-slate-500">
                                                {getIcon(n.data.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-xs font-bold text-slate-800 leading-relaxed">
                                                    {n.data.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                    <Clock size={10} />
                                                    <span>
                                                        {new Date(n.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {uniqueNotifications.length > 0 && (
                                <div className="p-3 bg-slate-50/50 text-center border-t border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">نظام التنبيهات الذكي</p>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationCenter;
