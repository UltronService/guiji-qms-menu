/**
 * ==========================================================================
 * 音效合成與語音廣播模組 (js/audio.js)
 * - Web Audio API 雙正弦波合成「Ding-Dong」鈴聲 (100% 離線運作)
 * - Web Speech API 原生中文語音合成 (TTS)：「請，X X X，取餐」
 * ==========================================================================
 */

const QMSAudio = (() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let isMuted = false;

    function ensureAudioContext() {
        if (!AudioContextClass) return null;
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    }

    /**
     * 雙正弦波合成 Ding-Dong 提示音
     */
    function playDingDong() {
        if (isMuted) return;
        const ctx = ensureAudioContext();
        if (!ctx) return;

        const playTone = (freq, startTime, duration) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.8, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const now = ctx.currentTime;
        playTone(659.25, now, 0.5);       // Ding (E5)
        playTone(523.25, now + 0.4, 0.8); // Dong (C5)
    }

    /**
     * 語音合成朗讀號碼
     * @param {string} number
     */
    function speakNumber(number) {
        if (isMuted || !('speechSynthesis' in window) || !number) return;
        window.speechSynthesis.cancel();

        // 分詞處理 (將英文與數字分開，讓念法更自然，例如 A01 -> A 0 1)
        const spokenText = String(number)
            .replace(/([a-zA-Z])/g, '$1 ')
            .replace(/([0-9])/g, '$1 ')
            .trim();

        const utterance = new SpeechSynthesisUtterance(`請，${spokenText}，取餐`);
        utterance.lang = 'zh-TW';
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    }

    /**
     * 觸發叫號音效與語音
     * @param {string} number
     */
    function playCallAudio(number) {
        if (isMuted) return;
        playDingDong();
        speakNumber(number);
    }

    /**
     * 切換靜音狀態並更新按鈕 UI
     */
    function toggleMute() {
        isMuted = !isMuted;
        const btn = document.getElementById('mute-btn');
        if (btn) {
            if (isMuted) {
                btn.textContent = '🔇 靜音: 開';
                btn.classList.add('muted');
            } else {
                btn.textContent = '🔊 聲音: 開';
                btn.classList.remove('muted');
            }
        }
        if (isMuted && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        return isMuted;
    }

    return {
        ensureAudioContext,
        playDingDong,
        speakNumber,
        playCallAudio,
        toggleMute,
        get isMuted() { return isMuted; }
    };
})();

window.QMSAudio = QMSAudio;
window.playDingDong = QMSAudio.playDingDong;
window.speakNumber = QMSAudio.speakNumber;
window.toggleMute = QMSAudio.toggleMute;
