import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api';
import SoundService from '../utils/SoundService';
import { Camera, Zap, Smartphone, CheckCircle, Loader2, XCircle, ArrowRight } from 'lucide-react';

const RemoteScannerPage = () => {
    const { slug, sessionId } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('initializing'); // initializing, ready, scanning, success, error
    const [lastProduct, setLastProduct] = useState(null);
    const [error, setError] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    
    const scannerRef = useRef(null);
    const html5QrCode = useRef(null);

    useEffect(() => {
        // Initialize Scanner on Mount
        html5QrCode.current = new Html5Qrcode("reader");
        startScanner();

        return () => {
            if (html5QrCode.current && html5QrCode.current.isScanning) {
                html5QrCode.current.stop();
            }
        };
    }, []);

    const startScanner = async () => {
        try {
            setStatus('initializing');
            const devices = await Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                const config = { 
                    fps: 10, 
                    qrbox: { width: 280, height: 160 },
                    videoConstraints: {
                        facingMode: "environment",
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 10 }
                    }
                };
                await html5QrCode.current.start(
                    { facingMode: "environment" }, 
                    config, 
                    onScanSuccess
                );
                setIsScanning(true);
                setStatus('ready');
            } else {
                throw new Error("لم يتم العثور على كاميرا متاحة.");
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
            setStatus('error');
        }
    };

    const onScanSuccess = async (decodedText) => {
        // Pause and process
        if (status === 'scanning') return;
        
        setStatus('scanning');
        SoundService.playSuccess();

        try {
            const res = await api.post(`/${slug}/remote-scan`, {
                barcode: decodedText,
                sessionId: sessionId
            });

            setLastProduct(res.data.product_name || 'منتج غير معروف');
            setStatus('success');
            
            // Auto Reset after success message
            setTimeout(() => {
                setStatus('ready');
                setLastProduct(null);
            }, 2000);

        } catch (err) {
            console.error(err);
            SoundService.playError();
            setError("فشل إرسال الباركود للسيرفر");
            setTimeout(() => setStatus('ready'), 3000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans rtl" dir="rtl">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Smartphone size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-wider">Remote Scanner</h1>
                        <p className="text-[10px] text-slate-400 font-bold">Session: {sessionId?.substring(0, 8)}...</p>
                    </div>
                </div>
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                    <ArrowRight size={20} />
                </button>
            </div>

            {/* Scanner Viewport */}
            <div className="flex-1 relative overflow-hidden flex flex-col items-center justify-center p-6">
                <div 
                    id="reader" 
                    className="w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 bg-black relative"
                >
                    {/* Camera Overlay UI */}
                    <div className="absolute inset-0 z-10 pointer-events-none border-[40px] border-black/40">
                         <div className="w-full h-full border-2 border-blue-500/50 rounded-xl relative">
                            {/* Corner Markers */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                            
                            {/* Scanning Line */}
                            {isScanning && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                            )}
                         </div>
                    </div>
                </div>

                {/* Feedback Panel */}
                <div className="mt-8 w-full max-w-sm">
                    {status === 'initializing' && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 animate-pulse">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p className="text-sm font-bold text-slate-300">جاري تشغيل الكاميرا...</p>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col items-center gap-3">
                            <Zap className="text-blue-500 animate-pulse" size={32} />
                            <p className="text-sm font-bold text-blue-400">وجه الكاميرا نحو الباركود</p>
                        </div>
                    )}

                    {status === 'scanning' && (
                        <div className="bg-amber-600/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col items-center gap-3">
                            <Loader2 className="animate-spin text-amber-500" size={32} />
                            <p className="text-sm font-bold text-amber-400">جاري المعالجة...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="bg-emerald-600/20 border border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200">
                            <CheckCircle className="text-emerald-500" size={40} />
                            <div className="text-center">
                                <p className="text-xs font-bold text-emerald-400/70 uppercase">تم المسح بنجاح ✅</p>
                                <h2 className="text-xl font-black text-white mt-1">{lastProduct}</h2>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-rose-600/20 border border-rose-500/30 rounded-2xl p-6 flex flex-col items-center gap-3">
                            <XCircle className="text-rose-500" size={40} />
                            <p className="text-sm font-bold text-rose-400 text-center">{error}</p>
                            <button onClick={startScanner} className="mt-2 text-xs font-bold bg-white/10 px-4 py-2 rounded-lg">إعادة المحاولة</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-8 text-center text-[11px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                POS System Remote Hub &bull; Powered by Reverb
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes scan-line {
                    0% { top: 0% }
                    100% { top: 100% }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
            `}} />
        </div>
    );
};

export default RemoteScannerPage;
