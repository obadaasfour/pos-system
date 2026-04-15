const ArabicReshaper = require('arabic-reshaper');

const fixArabic = (text) => {
    if (!text) return "";
    const str = String(text);
    
    // 1. Reshape
    const reshaped = ArabicReshaper.convertArabic(str);
    
    // 2. Split into segments: Arabic blocks and everything else
    const segments = reshaped.split(/([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g).filter(Boolean);
    
    const processed = segments.map(seg => {
        if (/[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(seg)) {
            return seg.split('').reverse().join('');
        }
        return seg;
    });
    
    return processed.reverse().join('');
};

const input = "سوبر ماركت الوفاء";
const output = fixArabic(input);

console.log("Input:", input);
console.log("Output:", output);
console.log("Output Chars (hex):", output.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
