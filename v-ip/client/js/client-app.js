/**
 * v-ip/client 客戶預覽：唯讀設定、自動 Demo、不復原叫號狀態
 */

const QMSClientApp = (() => {
    const CHAR_POOL = ['char-1', 'char-2', 'char-3', 'char-4'];
    const SETTINGS_URL = 'settings.json';
    const SETTINGS_POLL_MS = 15000;
    const DEMO_INTERVAL_MS = 6000;
    const LOGO_STANDBY_MS = 1800;

    const state = {
        currentMain: '',
        historyList: [],
        currentChar: null,
        displayMode: 'grid-b',
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

    let demoTimer = null;
    let demoKickoffTimer = null;
    let currentDemoNum = 1;
    let settingsPollTimer = null;
    let lastSettingsJson = '';

    function getMaxHistory() {
        return 6;
    }

    function trimHistoryToMax() {
        while (state.historyList.length > getMaxHistory()) {
            state.historyList.pop();
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
        updateUI(true, false);
    }

    function stopDemoTimers() {
        if (demoTimer) {
            clearInterval(demoTimer);
            demoTimer = null;
        }
        if (demoKickoffTimer) {
            clearTimeout(demoKickoffTimer);
            demoKickoffTimer = null;
        }
    }

    function scheduleNextDemoTick() {
        demoTimer = setInterval(() => {
            if (Math.random() < 0.9) {
                currentDemoNum++;
            } else {
                currentDemoNum = Math.floor(Math.random() * 999) + 1;
            }
            if (currentDemoNum > 999) currentDemoNum = 1;
            processScan(String(currentDemoNum).padStart(3, '0'));
        }, DEMO_INTERVAL_MS);
    }

    function startAutoDemo() {
        stopDemoTimers();
        demoKickoffTimer = setTimeout(() => {
            demoKickoffTimer = null;
            processScan(String(currentDemoNum).padStart(3, '0'));
            scheduleNextDemoTick();
        }, LOGO_STANDBY_MS);
    }

    function clearHistoryAndReplay() {
        stopDemoTimers();
        state.currentMain = '';
        state.historyList = [];
        state.currentChar = null;
        currentDemoNum = 1;

        const banner = document.getElementById('qms-banner');
        if (banner) banner.classList.add('standby-mode');

        updateUI(false, false);
        startAutoDemo();
    }

    function applySettingsObject(settings) {
        if (!settings || typeof settings !== 'object') return;

        if (typeof settings.font === 'string' && settings.font) {
            document.documentElement.style.setProperty('--selected-font', settings.font);
        }
        if (settings.bannerOpacity !== undefined && settings.bannerOpacity !== null) {
            const val = parseFloat(settings.bannerOpacity);
            if (!Number.isNaN(val)) {
                document.documentElement.style.setProperty('--banner-opacity', val.toFixed(2));
            }
        }

        if (settings.displayMode === 'classic' || settings.displayMode === 'stack-a' || settings.displayMode === 'grid-b') {
            state.displayMode = settings.displayMode;
        }
        if (settings.currentLayout === 'horizontal' || settings.currentLayout === 'vertical') {
            state.currentLayout = settings.currentLayout;
        }
        if (settings.gridBLayout === 'b1' || settings.gridBLayout === 'b2' ||
            settings.gridBLayout === 'b3' || settings.gridBLayout === 'b4') {
            state.gridBLayout = settings.gridBLayout;
        }

        if (typeof settings.h1Dur === 'number') animConfig.h1Dur = settings.h1Dur;
        if (typeof settings.h1Bounce === 'number') animConfig.h1Bounce = settings.h1Bounce;
        if (typeof settings.h1X === 'number') animConfig.h1X = settings.h1X;
        if (typeof settings.h2Delay === 'number') animConfig.h2Delay = settings.h2Delay;
        if (typeof settings.h2X === 'number') animConfig.h2X = settings.h2X;
        if (typeof settings.h2Bounce === 'number') animConfig.h2Bounce = settings.h2Bounce;

        QMSUI.applyAnimConfig(animConfig);

        const historyArea = document.getElementById('history-area');
        if (historyArea) {
            historyArea.classList.remove('mode-classic', 'mode-stack-a', 'mode-grid-b', 'layout-vertical');
            historyArea.classList.add('mode-grid-b');
        }

        updateUI(false, false);
    }

    async function fetchSettings() {
        const url = `${SETTINGS_URL}?t=${Date.now()}`;
        try {
            const response = await fetch(url, { cache: 'no-store' });
            if (!response.ok) return;
            const text = await response.text();
            if (text === lastSettingsJson) return;
            const parsed = JSON.parse(text);
            lastSettingsJson = text;
            applySettingsObject(parsed);
        } catch (err) {
            /* 離線或暫時失敗時維持目前設定 */
        }
    }

    function registerOfflineServiceWorker() {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp || !('serviceWorker' in navigator)) return;

        navigator.serviceWorker.register('../sw.js').catch(() => {});
    }

    function bindClearButton() {
        const btn = document.getElementById('client-clear-history');
        if (!btn) return;
        btn.addEventListener('click', () => {
            QMSAudio.ensureAudioContext();
            clearHistoryAndReplay();
        });
    }

    function init() {
        QMSUI.preloadCharacters();

        window.addEventListener('resize', QMSUI.resizeViewport);
        QMSUI.resizeViewport();

        bindClearButton();
        registerOfflineServiceWorker();

        fetchSettings().then(() => {
            updateUI(false, false);
            startAutoDemo();
        });

        settingsPollTimer = setInterval(fetchSettings, SETTINGS_POLL_MS);
    }

    return {
        init,
        clearHistoryAndReplay,
        state,
        animConfig
    };
})();

window.QMSClientApp = QMSClientApp;

document.addEventListener('DOMContentLoaded', QMSClientApp.init);
