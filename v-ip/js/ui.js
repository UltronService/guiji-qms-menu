/**
 * v-ip 視覺渲染：左主號 · 中 IP 角色 · 右 2×3 歷史
 */

const QMSUI = (() => {
    const CHAR_PATHS = {
        'char-1': 'assets/chars/char-1.png',
        'char-2': 'assets/chars/char-2.png',
        'char-3': 'assets/chars/char-3.png',
        'char-4': 'assets/chars/char-4.png'
    };

    const MOTION_CLASS = 'char-motion-6';
    let charSwitchTimer = null;

    function preloadCharacters() {
        Object.keys(CHAR_PATHS).forEach((key) => {
            const img = new Image();
            img.src = CHAR_PATHS[key];
        });
    }

    function resizeViewport() {
        const container = document.getElementById('viewport-container');
        if (!container) return;
        const scaleX = window.innerWidth / 1080;
        const scaleY = window.innerHeight / 1920;
        const scale = Math.min(scaleX, scaleY);
        container.style.transform = `scale(${scale})`;
    }

    function renderCharacter(charName, isFirstCall) {
        const charArea = document.getElementById('character-area');
        const charImg = document.getElementById('character-img');
        if (!charArea || !charImg) return;

        if (!charName) {
            charImg.className = 'character-img';
            charImg.removeAttribute('src');
            return;
        }

        const targetSrc = CHAR_PATHS[charName] || CHAR_PATHS['char-1'];

        if (charSwitchTimer) {
            clearTimeout(charSwitchTimer);
            charSwitchTimer = null;
        }

        if (isFirstCall || !charImg.getAttribute('src')) {
            charImg.src = targetSrc;
            charImg.className = `character-img ${MOTION_CLASS}`;
            return;
        }

        charImg.className = 'character-img char-animate-out';
        charSwitchTimer = setTimeout(() => {
            charImg.src = targetSrc;
            charImg.className = `character-img ${MOTION_CLASS}`;
        }, 180);
    }

    function renderHistory(state, withEffects) {
        const historyArea = document.getElementById('history-area');
        if (!historyArea) return;

        historyArea.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';
            const val = state.historyList[i] || '';
            itemDiv.textContent = val;

            if (!val) {
                itemDiv.classList.add('empty-slot');
            } else if (withEffects && i === 0) {
                itemDiv.classList.add('item-enter');
            }
            historyArea.appendChild(itemDiv);
        }
    }

    function animateMainNumber() {
        const mainEl = document.getElementById('main-number');
        if (!mainEl) return;
        mainEl.classList.remove('animate-call');
        void mainEl.offsetWidth;
        mainEl.classList.add('animate-call');
    }

    function updateUI(state, withEffects, onTriggerEffects, isFirstCall = false) {
        const banner = document.getElementById('qms-banner');
        const mainEl = document.getElementById('main-number');
        const isStandby = state.currentMain === '' || state.currentMain === null;

        if (isStandby) {
            if (banner) banner.classList.add('standby-mode');
            if (mainEl) mainEl.textContent = '';
            renderCharacter(null, false);
            renderHistory(state, false);
            return;
        }

        if (banner) banner.classList.remove('standby-mode');

        if (mainEl) {
            mainEl.textContent = state.currentMain;
            if (state.currentMain.length >= 4) {
                mainEl.style.fontSize = `${Math.max(88, 136 - (state.currentMain.length - 3) * 16)}px`;
            } else {
                mainEl.style.fontSize = '136px';
            }
        }

        if (state.currentChar) {
            renderCharacter(state.currentChar, isFirstCall);
        }

        renderHistory(state, withEffects);

        if (withEffects && typeof onTriggerEffects === 'function') {
            onTriggerEffects(state.currentMain);
        }
    }

    function showNoImage(imgElement) {
        if (!imgElement) return;
        imgElement.style.display = 'none';
        const parent = imgElement.parentNode;
        if (!parent || parent.querySelector('.no-image-text')) return;
        const div = document.createElement('div');
        div.className = 'no-image-text';
        div.textContent = '請確認 assets/menu.jpg 檔案';
        parent.appendChild(div);
    }

    function showNoImage(imgElement) {
        if (!imgElement) return;
        imgElement.style.display = 'none';
        const parent = imgElement.parentNode;
        if (!parent || parent.querySelector('.no-image-text')) return;
        const div = document.createElement('div');
        div.className = 'no-image-text';
        div.textContent = '請確認 assets/menu.jpg 檔案';
        parent.appendChild(div);
    }

    function changeFont() {
        const fontSelector = document.getElementById('font-selector');
        if (!fontSelector) return;
        const selectedFont = fontSelector.value;
        document.documentElement.style.setProperty('--selected-font', selectedFont);
        localStorage.setItem('guiji_font_pref', selectedFont);
    }

    function changeBannerOpacity() {
        const slider = document.getElementById('banner-opacity-slider');
        if (!slider) return;
        const val = parseFloat(slider.value).toFixed(2);
        const label = document.getElementById('opacity-val');
        if (label) label.textContent = val;
        document.documentElement.style.setProperty('--banner-opacity', val);
        localStorage.setItem('guiji_banner_opacity', val);
    }

    function restoreAppearancePrefs() {
        const savedFont = localStorage.getItem('guiji_font_pref');
        if (savedFont) {
            const fontSelector = document.getElementById('font-selector');
            if (fontSelector) {
                fontSelector.value = savedFont;
                changeFont();
            }
        }

        const savedOpacity = localStorage.getItem('guiji_banner_opacity');
        const opacitySlider = document.getElementById('banner-opacity-slider');
        if (savedOpacity && opacitySlider) {
            opacitySlider.value = savedOpacity;
            changeBannerOpacity();
        } else if (opacitySlider) {
            changeBannerOpacity();
        }
    }

    function syncLayoutSelectorUI(state) {
        const layoutSelector = document.getElementById('layout-selector');
        const layoutRow = document.getElementById('layout-selector-row');
        const gridBSelector = document.getElementById('grid-b-layout-selector');
        const gridBRow = document.getElementById('grid-b-layout-row');
        const isClassic = state.displayMode === 'classic';
        const isGridB = state.displayMode === 'grid-b';

        if (layoutSelector) layoutSelector.disabled = !isClassic;
        if (layoutRow) layoutRow.style.opacity = isClassic ? '1' : '0.45';

        if (gridBSelector) {
            gridBSelector.disabled = !isGridB;
            gridBSelector.value = state.gridBLayout;
        }
        if (gridBRow) gridBRow.style.opacity = isGridB ? '1' : '0.45';
    }

    function updateOfflineBadge(swReady = false) {
        const badge = document.getElementById('offline-status-badge');
        if (!badge) return;
        const isOnline = navigator.onLine !== false;
        const isFileProtocol = window.location.protocol === 'file:';

        if (isFileProtocol) {
            badge.textContent = '🛡️ 本機檔案離線運作中 · 按 T 關閉';
            badge.style.color = '#8bc34a';
        } else if (isOnline) {
            badge.textContent = swReady
                ? '🟢 連線正常 (離線快取已就緒) · 按 T 關閉'
                : '🟢 連線正常 · 按 T 關閉';
            badge.style.color = '#8bc34a';
        } else {
            badge.textContent = '🟠 外網斷線 (100% 離線保護運作中) · 按 T 關閉';
            badge.style.color = '#ffb74d';
        }
    }

    function isDebugPanelVisible(panel) {
        return window.getComputedStyle(panel).display !== 'none';
    }

    function showDebugPanelOnLoad() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;
        panel.style.display = 'block';
    }

    function toggleDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;
        panel.style.display = isDebugPanelVisible(panel) ? 'none' : 'block';
    }

    function syncAnimParamsFromDOM(animConfig) {
        const h1DurEl = document.getElementById('h1-dur');
        if (!h1DurEl) return;

        const h1Dur = parseFloat(h1DurEl.value) || 0.5;
        const h1Bounce = parseFloat(document.getElementById('h1-bounce').value) || 1.0;
        const h1X = parseFloat(document.getElementById('h1-x').value) || 0;
        const h2Delay = parseFloat(document.getElementById('h2-delay').value) || 0;
        const h2X = parseFloat(document.getElementById('h2-x').value) || 0;
        const h2Bounce = parseFloat(document.getElementById('h2-bounce').value) || 1.0;

        document.getElementById('h1-dur-val').textContent = h1Dur.toFixed(2) + 's';
        document.getElementById('h1-bounce-val').textContent = h1Bounce === 1.0 ? '1.0x (無回彈)' : h1Bounce.toFixed(2) + 'x (彈性)';
        document.getElementById('h1-x-val').textContent = h1X + 'px';
        document.getElementById('h2-delay-val').textContent = h2Delay.toFixed(2) + 's';
        document.getElementById('h2-x-val').textContent = h2X + 'px';
        document.getElementById('h2-bounce-val').textContent = h2Bounce === 1.0 ? '1.0x (無回彈)' : h2Bounce.toFixed(2) + 'x (彈性)';

        const ease1 = (h1Bounce > 1.01 || h1Bounce < 0.99)
            ? `cubic-bezier(0.34, ${h1Bounce}, 0.64, 1)`
            : 'ease-out';
        const ease2 = (h2Bounce > 1.01 || h2Bounce < 0.99)
            ? `cubic-bezier(0.34, ${h2Bounce}, 0.64, 1)`
            : 'ease-out';

        animConfig.h1Dur = h1Dur;
        animConfig.h1Ease = ease1;
        animConfig.h1Bounce = h1Bounce;
        animConfig.h1X = h1X;
        animConfig.h2Dur = h1Dur;
        animConfig.h2Ease = ease2;
        animConfig.h2Bounce = h2Bounce;
        animConfig.h2Delay = h2Delay;
        animConfig.h2X = h2X;

        const root = document.documentElement;
        root.style.setProperty('--hist1-dur', animConfig.h1Dur + 's');
        root.style.setProperty('--hist1-ease', animConfig.h1Ease);
        root.style.setProperty('--hist1-x', animConfig.h1X + 'px');
        root.style.setProperty('--hist2-dur', animConfig.h2Dur + 's');
        root.style.setProperty('--hist2-delay', animConfig.h2Delay + 's');
        root.style.setProperty('--hist2-ease', animConfig.h2Ease);
        root.style.setProperty('--hist2-x', animConfig.h2X + 'px');
    }

    const PRESET_CONFIGS = {
        clean:   { h1Dur: 0.4,  h1Bounce: 1.0,  h1X: 0,   h2Delay: 0,    h2X: 0,   h2Bounce: 1.0  },
        smooth:  { h1Dur: 0.65, h1Bounce: 1.0,  h1X: -30, h2Delay: 0,    h2X: 0,   h2Bounce: 1.0  },
        bounce:  { h1Dur: 0.55, h1Bounce: 1.35, h1X: 0,   h2Delay: 0,    h2X: 0,   h2Bounce: 1.1  },
        stagger: { h1Dur: 0.55, h1Bounce: 1.25, h1X: -40, h2Delay: 0.08, h2X: -45, h2Bounce: 1.45 }
    };

    function applyPresetValues(type) {
        const preset = PRESET_CONFIGS[type];
        if (!preset) return false;
        document.getElementById('h1-dur').value = preset.h1Dur;
        document.getElementById('h1-bounce').value = preset.h1Bounce;
        document.getElementById('h1-x').value = preset.h1X;
        document.getElementById('h2-delay').value = preset.h2Delay;
        document.getElementById('h2-x').value = preset.h2X;
        document.getElementById('h2-bounce').value = preset.h2Bounce;
        return true;
    }

    return {
        preloadCharacters,
        resizeViewport,
        renderCharacter,
        renderHistory,
        animateMainNumber,
        updateUI,
        showNoImage,
        changeFont,
        changeBannerOpacity,
        restoreAppearancePrefs,
        syncLayoutSelectorUI,
        updateOfflineBadge,
        showDebugPanelOnLoad,
        toggleDebugPanel,
        syncAnimParamsFromDOM,
        applyPresetValues
    };
})();

window.QMSUI = QMSUI;
window.showNoImage = QMSUI.showNoImage;
window.changeFont = QMSUI.changeFont;
window.changeBannerOpacity = QMSUI.changeBannerOpacity;
window.toggleDebugPanel = QMSUI.toggleDebugPanel;
