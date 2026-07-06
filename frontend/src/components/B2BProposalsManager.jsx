import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import Swal from 'sweetalert2';
import { Package, Lightbulb } from 'lucide-react';

const B2BProposalsManager = () => {
    const { slug } = useParams();
    const [isShowing, setIsShowing] = useState(false);
    const fetchedSlugRef = useRef(null);

    useEffect(() => {
        if (!slug || fetchedSlugRef.current === slug) return;
        
        // Mark as fetched for this slug to prevent infinite loops
        fetchedSlugRef.current = slug;
        fetchProposals();
        
        // Cleanup ref if slug changes (though it shouldn't for the same mount)
        return () => {
            // Optional: reset if needed on unmount
        };
    }, [slug]);

    const fetchProposals = async () => {
        try {
            const res = await api.get(`/${slug}/b2b/proposals`);
            if (res.data && res.data.length > 0) {
                processQueue(res.data);
            }
        } catch (err) {
            console.error("Failed to fetch B2B proposals", err);
        }
    };

    const processQueue = async (queue) => {
        if (!queue || queue.length === 0 || isShowing) return;
        
        setIsShowing(true);
        const currentProposal = queue[0];
        const remainingQueue = queue.slice(1);

        try {
            const shouldContinue = await showProposalDetails(currentProposal);
            if (!shouldContinue) {
                setIsShowing(false);
                return; // Stop the queue on error
            }
        } catch (err) {
            console.error("Error showing proposal details", err);
            setIsShowing(false);
            return;
        } finally {
            setIsShowing(false);
            // Process next item in queue after a small delay for smooth transition
            if (remainingQueue.length > 0) {
                setTimeout(() => processQueue(remainingQueue), 500);
            }
        }
    };

    const showProposalDetails = (proposal) => {
        return new Promise((resolve) => {
            let timerInterval;
            const price = proposal.price_usd || proposal.price || 0;

            Swal.fire({
                title: `<span class="text-blue-600 font-black text-xl">💡 اقتراح منتج جديد!</span>`,
                html: `
                    <div class="flex flex-col items-center gap-4 py-4" dir="rtl">
                        ${proposal.image_url 
                            ? `<img src="${proposal.image_url}" class="w-32 h-32 object-cover rounded-2xl shadow-md border border-slate-200" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="w-32 h-32 bg-slate-100 rounded-2xl items-center justify-center text-slate-400 shadow-sm text-5xl hidden">📦</div>`
                            : `<div class="w-32 h-32 bg-gradient-to-br from-blue-50 to-slate-100 rounded-2xl flex items-center justify-center text-5xl shadow-sm border border-slate-100">📦</div>`
                        }
                        <div class="flex flex-col items-center text-center">
                            <h4 class="text-lg font-black text-slate-800">${proposal.name || 'منتج جديد'}</h4>
                            <p class="text-xs font-bold text-slate-500 mt-1">${proposal.supplier?.name || 'مورد غير معروف'}</p>
                            <div class="mt-4 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100 shadow-sm">
                                <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">السعر المقترح</span>
                                <span class="text-2xl font-black text-blue-600">$${Number(price).toFixed(2)}</span>
                            </div>
                            ${proposal.description ? `<p class="mt-3 text-xs text-slate-500 leading-relaxed max-w-xs font-medium px-2">${proposal.description}</p>` : ''}
                        </div>
                        <div class="mt-2 text-[10px] text-slate-400 font-bold bg-slate-50 px-4 py-1 rounded-full border border-slate-100">
                            سيغلق هذا التنبيه تلقائياً خلال <b></b> ثانية.
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'طلب المنتج الآن 📦',
                cancelButtonText: 'تخطي ⏭️',
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#94a3b8',
                timer: 30000,
                timerProgressBar: true,
                allowOutsideClick: false,
                didOpen: () => {
                    const b = Swal.getHtmlContainer().querySelector('b');
                    timerInterval = setInterval(() => {
                        const timeLeft = Swal.getTimerLeft();
                        if (b && timeLeft) {
                            b.textContent = Math.ceil(timeLeft / 1000);
                        }
                    }, 100);
                },
                willClose: () => {
                    clearInterval(timerInterval);
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    const { value: quantity } = await Swal.fire({
                        title: 'تحديد الكمية',
                        input: 'number',
                        inputLabel: 'كم قطعة تريد طلبها من هذا المنتج؟',
                        inputValue: 1,
                        showCancelButton: true,
                        confirmButtonColor: '#2563eb',
                        inputValidator: (value) => {
                            if (!value || value < 1) return 'يرجى إدخال كمية صالحة';
                        }
                    });

                    if (quantity) {
                        try {
                            await api.post(`/${slug}/b2b/order-proposal/${proposal.id}`, { quantity });
                            await Swal.fire({
                                title: 'تم الطلب!',
                                text: 'تم إرسال طلبك للمورد بنجاح.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            return resolve(true);
                        } catch (err) {
                            const errMsg = err?.response?.data?.message || err?.response?.data?.debug || 'فشل إرسال الطلب.';
                            Swal.fire('خطأ!', errMsg, 'error');
                            return resolve(false); // Stop processing on server error
                        }
                    }
                }
                // Resolve true to move to the next item if skipped or completed
                resolve(true);
            });
        });
    };

    return null;
};

export default B2BProposalsManager;
