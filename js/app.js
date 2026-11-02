/**
 * ==========================================================================
 * 龜記叫號系統核心控制器與狀態管理 (js/app.js)
 * - 狀態持久化 (LocalStorage 斷電復原，完全相容既有鍵值)
 * - URL 參數預覽 (?mode=classic | a | stack-a | b | grid-b)
 * - 叫號佇列推進、重複叫號重播、待機模式甦醒轉場
 * - 自動輪播 Demo 模式與測試控制器
 * ==========================================================================
 */

const QMSApp = (() => {
    const DISPLAY_MODE_URL_MAP = {
        classic: 'classic',
        a: 'stack-a',
        'stack-a': 'stack-a',
        b: 'grid-b',
        'grid-b': 'grid-b'
    };

    const state = {
        currentMain: '---',
        historyList: [],
        /** @type {'classic' | 'stack-a' | 'grid-b'} */
        displayMode: 'classic',
        /** @type {'b1' | 'b2' | 'b3' | 'b4'} */
        gridBLayout: 'b1',
        /** @type {'horizontal' | 'vertical'} */
        currentLayout: 'horizontal'
    };

    const animConfig = {
        h1Dur: 0.5,
        h1Ease: 'ease-out',
        h1Bounce: 1.0,
        h1X: 0,
        h2Dur: 0.5,
        h2Ease: 'ease-out',
        h2Bounce: 1.0,
        h2Delay: 0,
        h2X: 0
    };

    let testCounter = 320;
    let isDemoMode = false;
    let demoTimer = null;
    let currentDemoNum = 1;

    function getMaxHistory() {
        return state.displayMode === 'classic' ? 2 : 6;
    }

    function trimHistoryToMax() {
        const max = getMaxHistory();
        while (state.historyList.length > max) {
            state.historyList.pop();
        }
    }

    /**
     * 1. 狀態讀取與保存 (LocalStorage)
     */
    function saveState() {
        localStorage.setItem('guiji_main_number', state.currentMain);
        localStorage.setItem('guiji_history', JSON.stringify(state.historyList));
        localStorage.setItem('guiji_history_layout', state.currentLayout);
        localStorage.setItem('guiji_history_display_mode', state.displayMode);
        localStorage.setItem('guiji_grid_b_layout', state.gridBLayout);
    }

    function initDisplayMode() {
        const params = new URLSearchParams(window.location.search);
        const urlMode = params.get('mode');
        if (urlMode) {
            const mapped = DISPLAY_MODE_URL_MAP[urlMode.toLowerCase()];
            if (mapped) {
                state.displayMode = mapped;
                localStorage.setItem('guiji_history_display_mode', state.displayMode);
            }
        } else {
            const saved = localStorage.getItem('guiji_history_display_mode');
            if (saved === 'classic' || saved === 'stack-a' || saved === 'grid-b') {
                state.displayMode = saved;
            }
        }

        const savedGridB = localStorage.getItem('guiji_grid_b_layout');
        if (savedGridB === 'b1' || savedGridB === 'b2' || savedGridB === 'b3' || savedGridB === 'b4') {
            state.gridBLayout = savedGridB;
        }

        const modeSelector = document.getElementById('display-mode-selector');
        if (modeSelector) modeSelector.value = state.displayMode;

        const gridBSelector = document.getElementById('grid-b-layout-selector');
        if (gridBSelector) gridBSelector.value = state.gridBLayout;

        QMSUI.applyHistoryChrome(state);
    }

    function loadState() {
        initDisplayMode();

        const savedMain = localStorage.getItem('guiji_main_number');
        const savedHistory = localStorage.getItem('guiji_history');
        const savedLayout = localStorage.getItem('guiji_history_layout');

        if (savedLayout === 'vertical' || savedLayout === 'horizontal') {
            state.currentLayout = savedLayout;
        }
        const layoutSelector = document.getElementById('layout-selector');
        if (layoutSelector) layoutSelector.value = state.currentLayout;

        QMSUI.applyHistoryChrome(state);

        if (savedMain) state.currentMain = savedMain;
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed)) {
                    state.historyList = parsed;
                    trimHistoryToMax();
                }
            } catch (e) {}
        }

        const banner = document.getElementById('qms-banner');
        if (banner) {
            if (state.currentMain === '---') {
                banner.classList.add('standby-mode');
            } else {
                banner.classList.remove('standby-mode');
            }
        }

        QMSUI.updateVideoPlayback();
        updateUI(false);
    }

    /**
     * 2. 聲光回饋與畫面渲染觸發
     */
    function triggerEffects(number) {
        QMSUI.animateMainNumber();
        QMSAudio.playCallAudio(number);
    }

    function updateUI(withEffects) {
        QMSUI.updateUI(state, animConfig, withEffects, triggerEffects);
    }

    /**
     * 3. 排版與顯示模式切換
     */
    function changeDisplayMode(mode) {
        if (mode !== 'classic' && mode !== 'stack-a' && mode !== 'grid-b') return;
        state.displayMode = mode;
        localStorage.setItem('guiji_history_display_mode', state.displayMode);

        const modeSelector = document.getElementById('display-mode-selector');
        if (modeSelector) modeSelector.value = state.displayMode;

        trimHistoryToMax();
        QMSUI.applyHistoryChrome(state);
        saveState();
        updateUI(false);
    }

    function changeLayout(layout) {
        if (layout !== 'horizontal' && layout !== 'vertical') return;
        state.currentLayout = layout;
        localStorage.setItem('guiji_history_layout', state.currentLayout);

        const layoutSelector = document.getElementById('layout-selector');
        if (layoutSelector) layoutSelector.value = state.currentLayout;

        QMSUI.applyLayoutClass(state);
        updateUI(false);
    }

    function changeGridBLayout(layout) {
        if (layout !== 'b1' && layout !== 'b2' && layout !== 'b3' && layout !== 'b4') return;
        state.gridBLayout = layout;
        localStorage.setItem('guiji_grid_b_layout', state.gridBLayout);

        const gridBSelector = document.getElementById('grid-b-layout-selector');
        if (gridBSelector) gridBSelector.value = state.gridBLayout;

        if (state.displayMode === 'grid-b') {
            updateUI(false);
        }
    }

    /**
     * 4. 掃碼叫號核心邏輯
     */
    function normalizeNumber(raw) {
        let code = String(raw).trim().toUpperCase();
        // 若為純數字，自動正規化為 3 位數 (例: 0321 -> 321, 5 -> 005, 88 -> 088)
        if (/^\d+$/.test(code)) {
            let num = parseInt(code, 10);
            if (num > 999) num = num % 1000;
            code = String(num).padStart(3, '0');
        }
        return code;
    }

    function processScan(scannedNumber) {
        if (!scannedNumber || String(scannedNumber).trim() === '') return;
        const normalized = normalizeNumber(scannedNumber);

        const banner = document.getElementById('qms-banner');
        if (state.currentMain === '---' && banner && banner.classList.contains('standby-mode')) {
            // 從待機模式甦醒：先移動 Logo，0.5s 後點亮號碼
            const mainEl = document.getElementById('main-number');
            if (mainEl) mainEl.textContent = '';
            banner.classList.remove('standby-mode');
            QMSUI.updateVideoPlayback();

            setTimeout(() => {
                state.currentMain = normalized;
                saveState();
                updateUI(true);
            }, 500);
            return;
        }

        if (state.currentMain === normalized) {
            // 重複掃描目前主號，重播動畫與語音
            triggerEffects(normalized);
            return;
        }

        // 若已在歷史紀錄中，先從歷史移除
        const historyIndex = state.historyList.indexOf(normalized);
        if (historyIndex !== -1) {
            state.historyList.splice(historyIndex, 1);
        }

        // 將原主號推入歷史首位
        if (state.currentMain !== '---') {
            state.historyList.unshift(state.currentMain);
            trimHistoryToMax();
        }

        state.currentMain = normalized;
        saveState();
        updateUI(true);
    }

    /**
     * 5. 調校面板輔助操作 (測試下一號、手動輸入、清空歷史、Demo 輪播、動畫預設)
     */
    function testNextNumber() {
        testCounter++;
        if (testCounter > 330) testCounter = 321;
        processScan(String(testCounter).padStart(3, '0'));
    }

    function submitManual() {
        const input = document.getElementById('manual-input');
        if (input && input.value.trim()) {
            processScan(input.value);
            input.value = '';
        }
    }

    function clearHistory() {
        state.currentMain = '---';
        state.historyList = [];
        saveState();

        const banner = document.getElementById('qms-banner');
        if (banner) banner.classList.add('standby-mode');

        QMSUI.updateVideoPlayback();
        updateUI(false);
    }

    function onParamChange() {
        QMSUI.syncAnimParamsFromDOM(animConfig);
    }

    function applyPreset(type) {
        if (QMSUI.applyPresetValues(type)) {
            onParamChange();
            testNextNumber();
        }
    }

    function toggleDemoMode() {
        isDemoMode = !isDemoMode;
        const btn = document.getElementById('demo-btn');
        if (isDemoMode) {
            if (btn) {
                btn.textContent = '⏱ Demo: 開';
                btn.classList.add('active');
            }
            processScan(String(currentDemoNum).padStart(3, '0'));
            demoTimer = setInterval(() => {
                if (Math.random() < 0.9) {
                    currentDemoNum++;
                } else {
                    currentDemoNum = Math.floor(Math.random() * 999) + 1;
                }
                if (currentDemoNum > 999) currentDemoNum = 1;
                processScan(String(currentDemoNum).padStart(3, '0'));
            }, 6000);
        } else {
            if (btn) {
                btn.textContent = '⏱ Demo: 關';
                btn.classList.remove('active');
            }
            if (demoTimer) {
                clearInterval(demoTimer);
                demoTimer = null;
            }
        }
    }

    /**
     * 6. 離線強化 Service Worker 註冊與啟動初始化
     */
    let swReady = false;

    function registerOfflineServiceWorker() {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp || !('serviceWorker' in navigator)) {
            QMSUI.updateOfflineBadge(false);
            return;
        }

        navigator.serviceWorker.register('./sw.js')
            .then(() => navigator.serviceWorker.ready)
            .then(() => {
                swReady = true;
                QMSUI.updateOfflineBadge(true);
            })
            .catch(() => {
                QMSUI.updateOfflineBadge(false);
            });
    }

    function init() {
        // 視窗縮放綁定
        window.addEventListener('resize', QMSUI.resizeViewport);
        QMSUI.resizeViewport();

        // 啟動掃碼槍與快捷鍵監聽
        QMSScanner.init({
            onScan: processScan,
            onToggleDebug: QMSUI.toggleDebugPanel
        });

        // 首次互動解鎖影片與音效
        window.addEventListener('click', () => {
            QMSUI.ensureVideoPlay();
            QMSAudio.ensureAudioContext();
        }, { once: true });
        window.addEventListener('keydown', QMSUI.ensureVideoPlay, { once: true });

        // 監聽外網連線與斷網事件
        window.addEventListener('online', () => QMSUI.updateOfflineBadge(swReady));
        window.addEventListener('offline', () => QMSUI.updateOfflineBadge(swReady));

        // DOM 載入完成後復原狀態並註冊離線快取
        window.addEventListener('DOMContentLoaded', () => {
            QMSUI.initVideoFallback();
            QMSUI.restoreAppearancePrefs();
            loadState();
            onParamChange();
            QMSUI.updateVideoPlayback();
            registerOfflineServiceWorker();
        });
    }

    return {
        init,
        state,
        animConfig,
        processScan,
        testNextNumber,
        submitManual,
        clearHistory,
        changeDisplayMode,
        changeLayout,
        changeGridBLayout,
        onParamChange,
        applyPreset,
        toggleDemoMode,
        triggerEffects,
        updateUI
    };
})();

// 掛載全域函式供 HTML 事件與主控台呼叫
window.QMSApp = QMSApp;
window.processScan = QMSApp.processScan;
window.testNextNumber = QMSApp.testNextNumber;
window.submitManual = QMSApp.submitManual;
window.clearHistory = QMSApp.clearHistory;
window.changeDisplayMode = QMSApp.changeDisplayMode;
window.changeLayout = QMSApp.changeLayout;
window.changeGridBLayout = QMSApp.changeGridBLayout;
window.onParamChange = QMSApp.onParamChange;
window.applyPreset = QMSApp.applyPreset;
window.toggleDemoMode = QMSApp.toggleDemoMode;
window.triggerEffects = QMSApp.triggerEffects;
window.updateUI = QMSApp.updateUI;

QMSApp.init();
