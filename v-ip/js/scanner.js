/**
 * USB 掃碼槍 (HID 鍵盤連發模式) 與全域快捷鍵監聽 — v-ip 版
 */

const QMSScanner = (() => {
    const CHAR_TIMEOUT_MS = 100;
    let keyBuffer = '';
    let keyTimer = null;
    let scanCallback = null;
    let debugToggleCallback = null;

    function clearBuffer() {
        keyBuffer = '';
        if (keyTimer) {
            clearTimeout(keyTimer);
            keyTimer = null;
        }
    }

    function handleKeyDown(e) {
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';

        if (tag === 'input' || tag === 'select' || tag === 'textarea') {
            if (e.target.id === 'manual-input' && e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.submitManual === 'function') {
                    window.submitManual();
                }
            }
            return;
        }

        if (e.key.toLowerCase() === 't') {
            clearBuffer();
            if (typeof debugToggleCallback === 'function') {
                debugToggleCallback();
            }
            return;
        }

        if (e.key === 'Enter') {
            if (keyBuffer.length > 0 && typeof scanCallback === 'function') {
                const code = keyBuffer;
                clearBuffer();
                scanCallback(code);
            } else {
                clearBuffer();
            }
            return;
        }

        if (e.key && e.key.length === 1) {
            keyBuffer += e.key;
            if (keyTimer) clearTimeout(keyTimer);
            keyTimer = setTimeout(() => {
                keyBuffer = '';
                keyTimer = null;
            }, CHAR_TIMEOUT_MS);
        }
    }

    function init(options = {}) {
        scanCallback = options.onScan || null;
        debugToggleCallback = options.onToggleDebug || null;
        window.addEventListener('keydown', handleKeyDown);
    }

    return {
        init,
        clearBuffer
    };
})();

window.QMSScanner = QMSScanner;
