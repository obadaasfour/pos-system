import Swal from 'sweetalert2';

/**
 * Pre-configured SweetAlert2 with RTL Arabic Dark Theme.
 * High-performance, premium UI for POS environment.
 */
const swalRTL = Swal.mixin({
    background: '#1e293b', // Deep Slate Dark
    color: '#f8fafc',      // Light Slate text
    customClass: {
        container: 'swal-rtl-container',
        popup: 'rounded-[32px] border border-slate-700 shadow-2xl',
        title: 'font-black text-xl',
        content: 'font-bold text-sm text-slate-300',
        confirmButton: 'rounded-2xl px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black transition-all',
        cancelButton: 'rounded-2xl px-8 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-black transition-all',
    },
    didOpen: (popup) => {
        popup.setAttribute('dir', 'rtl');
    },
    buttonsStyling: false,
    reverseButtons: true,
});

/** 
 * Success Toast (Self-dismissing)
 * Use for non-critical confirmations: 'تم الحفظ', 'تم التحديث'
 */
export const toastSuccess = (title) =>
    swalRTL.fire({
        toast: false,
        position: 'center', // Center screen for better visibility
        icon: 'success',
        iconColor: '#10b981',
        title: `<span class="pr-2">${title}</span>`,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        background: '#0f172a',
        backdrop: `rgba(15, 23, 42, 0.8)`,
    });

/** 
 * Warning Toast
 */
export const toastWarning = (title) =>
    swalRTL.fire({
        toast: false,
        position: 'center',
        icon: 'warning',
        iconColor: '#f59e0b',
        title: `<span class="pr-2">${title}</span>`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#0f172a',
        backdrop: `rgba(15, 23, 42, 0.8)`,
    });

/** 
 * Error Toast (Brief)
 * Use for non-critical errors like 'الباركود غير موجود'
 */
export const toastError = (title) =>
    swalRTL.fire({
        toast: false,
        position: 'center',
        icon: 'error',
        iconColor: '#ef4444',
        title: `<span class="pr-2">${title}</span>`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: '#1a1111', // Slight reddish dark background
        backdrop: `rgba(15, 23, 42, 0.8)`,
    });

/** 
 * Critical Error Modal (Requires User Interaction)
 * Use for API failures, validation errors, system crashes.
 */
export const alertError = (title, text = '') =>
    swalRTL.fire({
        icon: 'error',
        iconColor: '#ef4444',
        title,
        text,
        confirmButtonText: 'حسناً، جاري المتابعة',
        allowOutsideClick: false, // Essential for critical errors
        backdrop: `rgba(15, 23, 42, 0.8)`, // Dark semi-transparent blur
    });

/** 
 * Confirmation Dialog
 */
export const confirmDialog = (title, text = '', icon = 'question') =>
    swalRTL.fire({
        title,
        text,
        icon,
        iconColor: '#3b82f6',
        showCancelButton: true,
        confirmButtonText: 'نعم، متأكد',
        cancelButtonText: 'تراجع',
    });

/** 
 * Input Dialog for Quick Data Entry
 */
export const inputDialog = (title, inputPlaceholder = '', inputLabel = '') =>
    swalRTL.fire({
        title,
        input: 'text',
        inputLabel,
        inputPlaceholder,
        showCancelButton: true,
        confirmButtonText: 'متابعة',
        cancelButtonText: 'إلغاء',
        didOpen: () => {
            const input = Swal.getInput();
            if (input) {
                input.dir = 'rtl';
                input.focus();
            }
        },
        inputValidator: (value) => {
            if (!value || !value.trim()) return 'هذا الحقل مطلوب';
        },
    });

export default swalRTL;
