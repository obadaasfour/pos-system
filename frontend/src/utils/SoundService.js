/**
 * SoundService handles professional audio feedback (beeps) for barcode scanning.
 * It uses the Web Audio API to generate sounds dynamically without needing external files.
 */
class SoundService {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    /**
     * Short high-pitched beep for success.
     */
    playSuccess() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    /**
     * Low-pitched double beep for error.
     */
    playError() {
        this.init();
        const playBeep = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + start);

            gain.gain.setValueAtTime(0.1, this.ctx.currentTime + start);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + start + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + start);
            osc.stop(this.ctx.currentTime + start + duration);
        };

        // Double low beep
        playBeep(220, 0, 0.15); // A3
        playBeep(220, 0.2, 0.2); // A3 again
    }

    /**
     * Distinctive multi-tone notification for new orders.
     */
    playNotification() {
        this.init();
        const playTone = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + start);

            gain.gain.setValueAtTime(0, this.ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + start + 0.05);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + start + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(this.ctx.currentTime + start);
            osc.stop(this.ctx.currentTime + start + duration);
        };

        // Rising sequence
        playTone(523.25, 0, 0.1);    // C5
        playTone(659.25, 0.1, 0.1);  // E5
        playTone(783.99, 0.2, 0.3);  // G5
    }
}

export default new SoundService();
