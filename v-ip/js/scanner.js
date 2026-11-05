/**
 * USB 掃碼槍 (HID) 與鍵盤緩衝監聽 — v-ip 版（無調校面板快捷鍵）
 */

const QMSScanner = (() => {
    const CHAR_TIMEOUT_MS = 100;
    let keyBuffer = '';
    let keyTimer = null;
    let scanCallback = null;

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
        window.addEventListener('keydown', handleKeyDown);
    }

    return {
        init,
        clearBuffer
    };
})();

window.QMSScanner = QMSScanner;
