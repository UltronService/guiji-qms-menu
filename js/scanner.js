/**
 * ==========================================================================
 * USB 掃碼槍 (HID 鍵盤連發模式) 與全域快捷鍵監聽模組 (js/scanner.js)
 * - 100ms 高速字元緩衝區過濾手動誤觸與掃碼槍輸入
 * - 支援 Enter 鍵送出條碼
 * - 支援 T 鍵切換動態調校面板
 * ==========================================================================
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

        // 若焦點在手動輸入框且按下 Enter，直接送出手動輸入
        if (tag === 'input' || tag === 'select' || tag === 'textarea') {
            if (e.target.id === 'manual-input' && e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.submitManual === 'function') {
                    window.submitManual();
                }
            }
            return;
        }

        // 偵測 T 鍵切換動態調校面板
        if (e.key.toLowerCase() === 't') {
            clearBuffer();
            if (typeof debugToggleCallback === 'function') {
                debugToggleCallback();
            }
            return;
        }

        // Enter 鍵送出掃碼緩衝區 (Keycode 13)
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

        // 過濾可見字元 (英文、數字、符號)
        if (e.key && e.key.length === 1) {
            keyBuffer += e.key;

            // 掃碼槍字元間隔極短 (<50ms)，超過 100ms 視為中斷並清空 buffer
            if (keyTimer) clearTimeout(keyTimer);
            keyTimer = setTimeout(() => {
                keyBuffer = '';
                keyTimer = null;
            }, CHAR_TIMEOUT_MS);
        }
    }

    /**
     * 初始化全域鍵盤與掃碼槍監聽
     * @param {{ onScan: (code: string) => void, onToggleDebug: () => void }} options
     */
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
