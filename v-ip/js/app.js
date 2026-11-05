/**
 * v-ip 叫號控制器：IP 角色 · 2×3 歷史 · LocalStorage 復原
 */

const QMSApp = (() => {
    const CHAR_POOL = ['char-1', 'char-2', 'char-3', 'char-4'];
    const LS_MAIN = 'guiji_vip_main_number';
    const LS_HISTORY = 'guiji_vip_history';
    const LS_CHAR = 'guiji_vip_current_char';

    const state = {
        currentMain: '',
        historyList: [],
        currentChar: null
    };

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

    function loadState() {
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
        QMSUI.updateUI(state, withEffects, triggerEffects, isFirstCall);
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

    function registerOfflineServiceWorker() {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    function init() {
        QMSUI.preloadCharacters();

        window.addEventListener('resize', QMSUI.resizeViewport);
        QMSUI.resizeViewport();

        QMSScanner.init({ onScan: processScan });

        window.addEventListener('click', () => {
            QMSAudio.ensureAudioContext();
        }, { once: true });
        window.addEventListener('keydown', () => {
            QMSAudio.ensureAudioContext();
        }, { once: true });

        loadState();
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
        state
    };
})();

window.QMSApp = QMSApp;
window.processScan = QMSApp.processScan;

document.addEventListener('DOMContentLoaded', QMSApp.init);
