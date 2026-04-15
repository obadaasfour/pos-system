import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const BarcodeScanner = ({ onScan, onClose, isInline = false }) => {
    const [error, setError] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const html5QrCode = useRef(null);

    useEffect(() => {
        // 1. تهيئة الكائن بمجرد تحميل المكون
        const scanner = new Html5Qrcode("reader");
        html5QrCode.current = scanner;

        const startScanner = async () => {
            if (scanner.isScanning) return;

            try {
                setIsInitializing(true);
                setError(null);

                if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                    throw new Error("SECURE_CONTEXT_REQUIRED");
                }

                const config = {
                    fps: 10, // تقليل معدل الفريمات لتقليل الحمل على الموبايل
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const boxSize = Math.floor(minEdge * 0.7);
                        return { width: boxSize, height: boxSize * 0.5 }; // جعل المربع أعرض ليناسب الباركود الطويل
                    },
                    aspectRatio: 1.0,
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E
                    ],
                    videoConstraints: {
                        facingMode: "environment",
                        focusMode: "continuous",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 10 }
                    }
                };

                // البدء التلقائي بالكاميرا الخلفية
                let scanned = false;
                await scanner.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        // عند النجاح: إيقاف الكاميرا ثم إرسال الكود (مع منع التكرار وتطهير النص)
                        if (scanned) return;
                        scanned = true;

                        const cleanCode = decodedText.trim().toLowerCase();
                        
                        // الاهتزاز عند نجاح المسح (إذا كان مدعوماً)
                        if (navigator.vibrate) {
                            navigator.vibrate(100);
                        }

                        if (isInline) {
                            // في الوضع المدمج، قد نفضل استمرار المسح أو انتظار معالجة الكود
                            onScan(cleanCode);
                        } else {
                            scanner.stop().finally(() => {
                                onScan(cleanCode);
                            });
                        }
                    }
                );

                setIsInitializing(false);
            } catch (err) {
                console.error("Camera error:", err);
                setIsInitializing(false);

                if (err.message === "SECURE_CONTEXT_REQUIRED") {
                    setError(`يجب تفعيل 'Insecure origins treated as secure' في فلاق كروم للرابط الحالي: ${window.location.origin}`);
                } else if (err.name === "NotAllowedError" || err?.toString().includes("NotAllowedError") || err?.toString().includes("Permission denied")) {
                    setError("عذراً، يجب السماح للمتصفح بالوصول للكاميرا لتمكن من المسح.");
                } else {
                    setError("حدث خطأ أثناء تشغيل الكاميرا. تأكد من أن الكاميرا غير مستخدمة في تطبيق آخر.");
                }
            }
        };

        // تأخير بسيط لضمان وجود العنصر في الـ DOM
        const timeout = setTimeout(startScanner, 300);

        // التنظيف الاحترافي عند إغلاق المودال
        return () => {
            clearTimeout(timeout);
            if (scanner && scanner.isScanning) {
                scanner.stop()
                    .then(() => scanner.clear())
                    .catch(e => console.warn("Cleanup warning:", e));
            }
        };
    }, [onScan, onClose]);

    const containerClasses = isInline 
        ? "w-full bg-white overflow-hidden shadow-sm relative border-b border-slate-200"
        : "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300";

    const contentClasses = isInline
        ? "w-full"
        : "bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl relative border border-white/20";

    return (
        <div className={containerClasses}>
            <div className={contentClasses}>

                {/* Header */}
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Camera size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight uppercase leading-none">ماسح الباركود</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">وضع الكاميرا المباشر</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Scanner Viewport */}
                <div className={isInline ? "p-4" : "p-8"}>
                    <div className={`relative aspect-[4/3] w-full mx-auto ${isInline ? 'rounded-2xl' : 'max-w-[320px] rounded-3xl'} overflow-hidden shadow-2xl border-4 border-slate-100 bg-slate-900`}>
                        <div id="reader" className="w-full h-full"></div>

                        {/* Loading Overlay */}
                        {isInitializing && (
                            <div className="absolute inset-0 z-20 bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Loader2 className="animate-spin text-blue-500" size={32} />
                                <p className="text-xs font-bold">جاري الاتصال بالعدسة...</p>
                            </div>
                        )}

                        {/* Error Overlay */}
                        {error && (
                            <div className="absolute inset-0 z-30 bg-rose-50 p-6 flex flex-col items-center justify-center gap-4 text-center">
                                <AlertCircle className="text-rose-500" size={48} />
                                <div>
                                    <p className="text-sm font-black text-rose-900 mb-1">صلاحية الكاميرا مطلوبة</p>
                                    <p className="text-xs font-bold text-rose-600 leading-relaxed">{error}</p>
                                </div>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-rose-600 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/30"
                                >
                                    إعادة المحاولة
                                </button>
                            </div>
                        )}

                        {/* Scanner Guide UI (Only shows when active) */}
                        {!isInitializing && !error && (
                            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                                <div className="w-56 h-56 border-2 border-dashed border-white/20 rounded-3xl relative">
                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                                </div>
                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-scan-line"></div>
                            </div>
                        )}
                    </div>

                    {!isInline && (
                        <div className="mt-8 text-center space-y-2">
                            <p className="text-sm font-black text-slate-800 tracking-tight">ضع الباركود في منتصف المربع</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                                الوضع الذكي • تركيز تلقائي • دقة عالية
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scan-line {
                    0% { top: 10%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2.5s ease-in-out infinite;
                }
                #reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                }
                #reader img {
                    display: none !important; /* إخفاء أيقونة المكتبة الافتراضية */
                }
            `}} />
        </div>
    );
};

export default BarcodeScanner;