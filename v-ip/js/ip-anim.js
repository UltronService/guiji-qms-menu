/**
 * 龜記 IP 橫幅動畫控制器（v-ip 專用）
 * 效果 A 舉牌 / B 待機晃 / C 跳躍，可 URL 或除錯面板切換
 */
const QMSIpAnim = (() => {
    const STORAGE_PREFIX = 'guiji_ip_effect_';
    const SIGN_HOLD_MS = 2750;

    const config = {
        effectA: true,
        effectB: true,
        effectC: true
    };

    let signTimer = null;
    let signPhaseTimer = null;
    let busyClearTimer = null;
    let hooked = false;

    function parseBool(value, fallback) {
        if (value === null || value === undefined || value === '') return fallback;
        const v = String(value).toLowerCase();
        if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true;
        if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false;
        return fallback;
    }

    function loadConfig() {
        const params = new URLSearchParams(window.location.search);
        config.effectA = parseBool(
            params.get('ipA') ?? localStorage.getItem(STORAGE_PREFIX + 'a'),
            true
        );
        config.effectB = parseBool(
            params.get('ipB') ?? localStorage.getItem(STORAGE_PREFIX + 'b'),
            true
        );
        config.effectC = parseBool(
            params.get('ipC') ?? localStorage.getItem(STORAGE_PREFIX + 'c'),
            true
        );
        localStorage.setItem(STORAGE_PREFIX + 'a', config.effectA ? '1' : '0');
        localStorage.setItem(STORAGE_PREFIX + 'b', config.effectB ? '1' : '0');
        localStorage.setItem(STORAGE_PREFIX + 'c', config.effectC ? '1' : '0');
    }

    function getBanner() {
        return document.getElementById('qms-banner');
    }

    function applyBannerClasses() {
        const banner = getBanner();
        if (!banner) return;
        banner.classList.toggle('ip-sign-off', !config.effectA);
        banner.classList.toggle('ip-bob-off', !config.effectB);
        banner.classList.toggle('ip-jump-off', !config.effectC);
    }

    function syncDebugToggles() {
        const map = [
            ['ip-toggle-a', config.effectA],
            ['ip-toggle-b', config.effectB],
            ['ip-toggle-c', config.effectC]
        ];
        map.forEach(([id, on]) => {
            const el = document.getElementById(id);
            if (el) el.checked = on;
        });
    }

    function setEffect(which, enabled) {
        if (which === 'a') config.effectA = enabled;
        if (which === 'b') config.effectB = enabled;
        if (which === 'c') config.effectC = enabled;
        localStorage.setItem(STORAGE_PREFIX + which, enabled ? '1' : '0');
        applyBannerClasses();
    }

    function clearSignTimers() {
        if (signTimer) {
            clearTimeout(signTimer);
            signTimer = null;
        }
        if (signPhaseTimer) {
            clearTimeout(signPhaseTimer);
            signPhaseTimer = null;
        }
    }

    function setCallBusy(busy) {
        const banner = getBanner();
        if (!banner) return;
        banner.classList.toggle('ip-call-busy', busy);
        if (busyClearTimer) {
            clearTimeout(busyClearTimer);
            busyClearTimer = null;
        }
        if (busy) {
            busyClearTimer = setTimeout(() => {
                banner.classList.remove('ip-call-busy');
                busyClearTimer = null;
            }, 900);
        }
    }

    function runSignAct(number) {
        if (!config.effectA) return;
        const act = document.getElementById('ip-sign-act');
        const numEl = document.getElementById('ip-sign-number');
        if (!act || !numEl) return;

        clearSignTimers();
        numEl.textContent = number;
        act.classList.remove('is-out');
        act.classList.add('is-visible', 'is-in');

        signTimer = setTimeout(() => {
            act.classList.remove('is-in');
            act.classList.add('is-out');
            signPhaseTimer = setTimeout(() => {
                act.classList.remove('is-visible', 'is-out');
                signPhaseTimer = null;
            }, 440);
            signTimer = null;
        }, SIGN_HOLD_MS);
    }

    function runJumpAct() {
        if (!config.effectC) return;
        const jumper = document.getElementById('ip-jumper');
        if (!jumper) return;
        jumper.classList.remove('ip-jump-active');
        void jumper.offsetWidth;
        jumper.classList.add('ip-jump-active');
    }

    function onNewCall(number) {
        if (!number || number === '---') return;
        setCallBusy(true);
        runJumpAct();
        runSignAct(number);
    }

    function syncDisplayModeClass() {
        const banner = getBanner();
        if (!banner || !window.QMSApp) return;
        banner.classList.toggle('mode-stack-a', QMSApp.state.displayMode === 'stack-a');
    }

    function hookApp() {
        if (hooked || !window.QMSApp) return;
        hooked = true;

        const origProcess = QMSApp.processScan.bind(QMSApp);
        QMSApp.processScan = (raw) => {
            origProcess(raw);
            syncDisplayModeClass();
        };

        const origTrigger = QMSApp.triggerEffects.bind(QMSApp);
        QMSApp.triggerEffects = (number) => {
            origTrigger(number);
            onNewCall(number);
        };

        const origChangeMode = QMSApp.changeDisplayMode.bind(QMSApp);
        QMSApp.changeDisplayMode = (mode) => {
            origChangeMode(mode);
            requestAnimationFrame(syncDisplayModeClass);
        };

        window.processScan = QMSApp.processScan;
        window.triggerEffects = QMSApp.triggerEffects;
        window.changeDisplayMode = QMSApp.changeDisplayMode;
    }

    function hydrateCharacterImages() {
        document.querySelectorAll('img[data-ip-src]').forEach((img) => {
            const src = img.getAttribute('data-ip-src');
            if (src) img.setAttribute('src', src);
        });
    }

    function init() {
        loadConfig();
        const banner = getBanner();
        if (banner) banner.classList.add('ip-banner');
        hydrateCharacterImages();
        applyBannerClasses();
        syncDebugToggles();
        hookApp();
        syncDisplayModeClass();

        document.querySelectorAll('.ip-effect-toggle').forEach((input) => {
            input.addEventListener('change', () => {
                const key = input.getAttribute('data-ip-effect');
                if (!key) return;
                setEffect(key, input.checked);
            });
        });

    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return {
        config,
        setEffect,
        onNewCall
    };
})();

window.QMSIpAnim = QMSIpAnim;
