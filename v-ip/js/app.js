/**
 * v-ip 叫號控制器：IP 角色 · 2×3 歷史 · LocalStorage 復原 · 調校面板
 */

const QMSApp = (() => {
    const CHAR_POOL = ['char-1', 'char-2', 'char-3', 'char-4'];
    const LS_MAIN = 'guiji_vip_main_number';
    const LS_HISTORY = 'guiji_vip_history';
    const LS_CHAR = 'guiji_vip_current_char';

    const state = {
        currentMain: '',
        historyList: [],
        currentChar: null,
        displayMode: 'classic',
        gridBLayout: 'b1',
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
    let swReady = false;

    function getMaxHistory() {
        return 6;
    }

    function trimHistoryToMax() {
        while (state.historyList.length > getMaxHistory()) {
            state.historyList.pop();
        }
    }

    function saveState() {
        localStorage.setItem(LS_MAIN, state.currentMain);
        localStorage.setItem(LS_HISTORY, JSON.stringify(state.historyList));
        if (state.currentChar) {
            localStorage.setItem(LS_CHAR, state.currentChar);
        } else {
            localStorage.removeItem(LS_CHAR);
        }
    }

    function initDisplayPrefs() {
        const savedLayout = localStorage.getItem('guiji_history_layout');
        if (savedLayout === 'vertical' || savedLayout === 'horizontal') {
            state.currentLayout = savedLayout;
        }
        const savedMode = localStorage.getItem('guiji_history_display_mode');
        if (savedMode === 'classic' || savedMode === 'stack-a' || savedMode === 'grid-b') {
            state.displayMode = savedMode;
        }
        const savedGridB = localStorage.getItem('guiji_grid_b_layout');
        if (savedGridB === 'b1' || savedGridB === 'b2' || savedGridB === 'b3' || savedGridB === 'b4') {
            state.gridBLayout = savedGridB;
        }

        const modeSelector = document.getElementById('display-mode-selector');
        if (modeSelector) modeSelector.value = state.displayMode;
        const layoutSelector = document.getElementById('layout-selector');
        if (layoutSelector) layoutSelector.value = state.currentLayout;
        const gridBSelector = document.getElementById('grid-b-layout-selector');
        if (gridBSelector) gridBSelector.value = state.gridBLayout;

        QMSUI.syncLayoutSelectorUI(state);
    }

    function loadState() {
        initDisplayPrefs();

        const savedMain = localStorage.getItem(LS_MAIN);
        const savedHistory = localStorage.getItem(LS_HISTORY);
        const savedChar = localStorage.getItem(LS_CHAR);

        if (savedMain && savedMain !== '---') {
            state.currentMain = savedMain;
        }
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                if (Array.isArray(parsed)) {
                    state.historyList = parsed;
                    trimHistoryToMax();
                }
            } catch (e) {
                state.historyList = [];
            }
        }
        if (savedChar && CHAR_POOL.includes(savedChar)) {
            state.currentChar = savedChar;
        }
    }

    function pickNextCharacter() {
        const available = CHAR_POOL.filter((c) => c !== state.currentChar);
        const chosen = available[Math.floor(Math.random() * available.length)];
        state.currentChar = chosen;
        return chosen;
    }

    function triggerEffects(number) {
        QMSUI.animateMainNumber();
        QMSAudio.playCallAudio(number);
    }

    function updateUI(withEffects, isFirstCall = false) {
        QMSUI.updateUI(state, animConfig, withEffects, triggerEffects, isFirstCall);
    }

    function normalizeNumber(raw) {
        let code = String(raw).trim().toUpperCase();
        if (/^\d+$/.test(code)) {
            let num = parseInt(code, 10);
            if (num > 999) num = num % 1000;
            code = String(num).padStart(3, '0');
        }
        return code;
    }

    function processScan(rawNumber) {
        if (!rawNumber || String(rawNumber).trim() === '') return;
        const normalized = normalizeNumber(rawNumber);
        const isFirstCall = state.currentMain === '' || state.currentMain === null;

        if (isFirstCall) {
            pickNextCharacter();
            state.currentMain = normalized;
            saveState();
            updateUI(true, true);
            return;
        }

        if (state.currentMain === normalized) {
            triggerEffects(normalized);
            return;
        }

        pickNextCharacter();

        const historyIndex = state.historyList.indexOf(normalized);
        if (historyIndex !== -1) {
            state.historyList.splice(historyIndex, 1);
        }

        if (state.currentMain) {
            state.historyList.unshift(state.currentMain);
            trimHistoryToMax();
        }

        state.currentMain = normalized;
        saveState();
        updateUI(true, false);
    }

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
        state.currentMain = '';
        state.historyList = [];
        state.currentChar = null;
        saveState();

        const banner = document.getElementById('qms-banner');
        if (banner) banner.classList.add('standby-mode');

        updateUI(false, false);
    }

    function changeDisplayMode(mode) {
        if (mode !== 'classic' && mode !== 'stack-a' && mode !== 'grid-b') return;
        state.displayMode = mode;
        localStorage.setItem('guiji_history_display_mode', state.displayMode);
        const modeSelector = document.getElementById('display-mode-selector');
        if (modeSelector) modeSelector.value = state.displayMode;
        QMSUI.syncLayoutSelectorUI(state);
    }

    function changeLayout(layout) {
        if (layout !== 'horizontal' && layout !== 'vertical') return;
        state.currentLayout = layout;
        localStorage.setItem('guiji_history_layout', state.currentLayout);
        const layoutSelector = document.getElementById('layout-selector');
        if (layoutSelector) layoutSelector.value = state.currentLayout;
        QMSUI.syncLayoutSelectorUI(state);
    }

    function changeGridBLayout(layout) {
        if (layout !== 'b1' && layout !== 'b2' && layout !== 'b3' && layout !== 'b4') return;
        state.gridBLayout = layout;
        localStorage.setItem('guiji_grid_b_layout', state.gridBLayout);
        const gridBSelector = document.getElementById('grid-b-layout-selector');
        if (gridBSelector) gridBSelector.value = state.gridBLayout;
        QMSUI.syncLayoutSelectorUI(state);
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
        QMSUI.preloadCharacters();

        window.addEventListener('resize', QMSUI.resizeViewport);
        QMSUI.resizeViewport();

        QMSScanner.init({
            onScan: processScan,
            onToggleDebug: QMSUI.toggleDebugPanel
        });

        window.addEventListener('click', () => {
            QMSAudio.ensureAudioContext();
        }, { once: true });
        window.addEventListener('keydown', () => {
            QMSAudio.ensureAudioContext();
        }, { once: true });

        window.addEventListener('online', () => QMSUI.updateOfflineBadge(swReady));
        window.addEventListener('offline', () => QMSUI.updateOfflineBadge(swReady));

        QMSUI.restoreAppearancePrefs();
        QMSUI.showDebugPanelOnLoad();
        loadState();
        onParamChange();

        const isStandby = state.currentMain === '' || state.currentMain === null;
        if (isStandby) {
            state.currentChar = null;
        } else if (!state.currentChar) {
            pickNextCharacter();
        }
        updateUI(false, false);

        registerOfflineServiceWorker();

        const params = new URLSearchParams(window.location.search);
        const callParam = params.get('call');
        if (callParam) {
            const historyParam = params.get('history');
            if (historyParam) {
                state.historyList = historyParam.split(',').map((s) => s.trim());
                trimHistoryToMax();
            }
            state.currentMain = '';
            state.currentChar = null;
            processScan(callParam);
        }
    }

    return {
        init,
        processScan,
        state,
        animConfig,
        testNextNumber,
        submitManual,
        clearHistory,
        changeDisplayMode,
        changeLayout,
        changeGridBLayout,
        onParamChange,
        applyPreset,
        toggleDemoMode
    };
})();

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

document.addEventListener('DOMContentLoaded', QMSApp.init);
