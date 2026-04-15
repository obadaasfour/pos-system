const { ArabicShaper } = require('./frontend/node_modules/arabic-persian-reshaper/index.js');

const text = "سوبر";
try {
    const reshaped = ArabicShaper.convertArabic(text);
    console.log("Original:", text);
    console.log("Reshaped (hex):", reshaped.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));

    const reversed = reshaped.split('').reverse().join('');
    console.log("Reversed (hex):", reversed.split('').map(c => c.charCodeAt(0).toString(16)).join(' '));
} catch (e) {
    console.error("Error during execution:", e);
}
