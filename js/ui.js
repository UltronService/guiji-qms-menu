/**
 * ==========================================================================
 * 視覺渲染與動態調校介面模組 (js/ui.js)
 * - 1080x1920 等比自適應縮放
 * - 支援 3 種歷史顯示模式：經典 (1+2 橫/直)、方案 A (六筆直列)、方案 B (六格 3x2 網格)
 * - GPU 硬體加速進場/推移/退場動畫與物理彈簧參數控制
 * ==========================================================================
 */

const QMSUI = (() => {
    /**
     * 1. 自適應縮放邏輯 (鎖定 1080x1920 比例)
     */
    function resizeViewport() {
        const container = document.getElementById('viewport-container');
        if (!container) return;
        const scaleX = window.innerWidth / 1080;
        const scaleY = window.innerHeight / 1920;
        const scale = Math.min(scaleX, scaleY);
        container.style.transform = `scale(${scale})`;
    }

    /**
     * 2. 字體與橫幅綠底透明度控制
     */
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
        if (savedOpacity) {
            const opacitySlider = document.getElementById('banner-opacity-slider');
            if (opacitySlider) {
                opacitySlider.value = savedOpacity;
                changeBannerOpacity();
            }
        }
    }

    /**
     * 3. 方案 B 六格網格座標配置 (B1 ~ B4)
     */
    function getGridBPlacement(index, layout) {
        if (layout === 'b2') {
            // B2：下排最新三筆左→右，上排較舊三筆
            return index < 3
                ? { row: 2, col: index + 1 }
                : { row: 1, col: index - 2 };
        }
        if (layout === 'b4') {
            return index < 3
                ? { row: 1, col: 3 - index }
                : { row: 2, col: 3 - (index - 3) };
        }
        // b1（預設）及 b3：上排最新三筆（左→右），下排較舊三筆（左→右）
        return index < 3
            ? { row: 1, col: index + 1 }
            : { row: 2, col: index - 2 };
    }

    function applyHistoryItemMeta(el, index, useGrid, gridBLayout) {
        el.setAttribute('data-hist-index', String(index));
        if (useGrid) {
            const place = getGridBPlacement(index, gridBLayout);
            el.style.gridRow = String(place.row);
            el.style.gridColumn = String(place.col);
        } else {
            el.style.gridRow = '';
            el.style.gridColumn = '';
        }
    }

    /**
     * 4. 面板控制項與橫幅狀態同步
     */
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

    function syncGridBBannerState(state) {
        const banner = document.getElementById('qms-banner');
        if (!banner) return;

        banner.classList.remove('banner-grid-b', 'grid-b-solo', 'grid-b-active');

        if (state.displayMode !== 'grid-b' || banner.classList.contains('standby-mode')) {
            return;
        }

        banner.classList.add('banner-grid-b');
        if (state.historyList.length === 0) {
            banner.classList.add('grid-b-solo');
        } else {
            banner.classList.add('grid-b-active');
        }
    }

    function applyLayoutClass(state) {
        const historyArea = document.getElementById('history-area');
        if (!historyArea || state.displayMode !== 'classic') return;
        if (state.currentLayout === 'vertical') {
            historyArea.classList.add('layout-vertical');
        } else {
            historyArea.classList.remove('layout-vertical');
        }
    }

    function applyHistoryChrome(state) {
        const historyArea = document.getElementById('history-area');
        if (!historyArea) return;

        historyArea.classList.remove('mode-classic', 'mode-stack-a', 'mode-grid-b', 'layout-vertical');

        if (state.displayMode === 'classic') {
            historyArea.classList.add('mode-classic');
            applyLayoutClass(state);
        } else if (state.displayMode === 'stack-a') {
            historyArea.classList.add('mode-stack-a', 'layout-vertical');
        } else {
            historyArea.classList.add('mode-grid-b');
        }

        syncLayoutSelectorUI(state);
        syncGridBBannerState(state);
    }

    /**
     * 5. 統一歷史號碼渲染與 GPU 動畫引擎
     */
    function renderHistory(state, animConfig, withEffects) {
        const historyArea = document.getElementById('history-area');
        if (!historyArea) return;

        const useGrid = state.displayMode === 'grid-b';
        const isVerticalStack =
            (state.displayMode === 'classic' && state.currentLayout === 'vertical') ||
            state.displayMode === 'stack-a';
        const useShiftAnimation = state.displayMode !== 'stack-a';

        if (!withEffects) {
            historyArea.innerHTML = '';
            state.historyList.forEach((num, index) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.textContent = num;
                applyHistoryItemMeta(div, index, useGrid, state.gridBLayout);
                historyArea.appendChild(div);
            });
            return;
        }

        const currentNodes = Array.from(historyArea.querySelectorAll('.history-item:not(.item-exit)'));

        // 1. 退場動畫：移除不在最新歷史清單中的舊節點
        currentNodes.forEach(node => {
            if (!state.historyList.includes(node.textContent)) {
                node.classList.add('item-exit');
                if (isVerticalStack) {
                    node.style.top = node.offsetTop + 'px';
                    node.style.right = '0px';
                }
                void node.offsetWidth;
                node.classList.add('item-exit-active');
                setTimeout(() => {
                    if (node.parentNode) node.parentNode.removeChild(node);
                }, animConfig.h1Dur * 1000 + 50);
            }
        });

        // 2. 進場與推移：依最新順序插入或推移節點
        state.historyList.forEach((num, index) => {
            const activeNodes = Array.from(historyArea.querySelectorAll('.history-item:not(.item-exit)'));
            let el = activeNodes.find(n => n.textContent === num);
            const refNode = activeNodes[index] || null;

            if (!el) {
                el = document.createElement('div');
                el.className = 'history-item item-enter';
                el.textContent = num;
                applyHistoryItemMeta(el, index, useGrid, state.gridBLayout);
                historyArea.insertBefore(el, refNode);
                void el.offsetWidth;
                el.classList.add('item-enter-active');

                setTimeout(() => {
                    el.classList.remove('item-enter', 'item-enter-active');
                }, animConfig.h1Dur * 1000 + 50);
            } else {
                applyHistoryItemMeta(el, index, useGrid, state.gridBLayout);
                historyArea.insertBefore(el, refNode);

                if (useShiftAnimation) {
                    el.classList.remove('item-shift', 'item-shift-active');
                    el.classList.add('item-shift');
                    void el.offsetWidth;
                    if (animConfig.h2Delay > 0) {
                        el.style.transitionDelay = animConfig.h2Delay + 's';
                    }
                    el.classList.add('item-shift-active');

                    setTimeout(() => {
                        el.classList.remove('item-shift', 'item-shift-active');
                        el.style.transitionDelay = '';
                    }, (animConfig.h2Dur + animConfig.h2Delay) * 1000 + 50);
                }
            }
        });
    }

    /**
     * 6. 主畫面更新 (主叫號 + 歷史號碼 + 狀態同步)
     */
    function updateUI(state, animConfig, withEffects, onTriggerEffects) {
        const mainEl = document.getElementById('main-number');
        if (mainEl) {
            mainEl.textContent = state.currentMain;

            if (state.displayMode === 'grid-b' && state.historyList.length > 0) {
                if (state.currentMain.length > 4) {
                    mainEl.style.fontSize = Math.max(72, 112 - (state.currentMain.length - 4) * 12) + 'px';
                } else {
                    mainEl.style.fontSize = '';
                }
            } else if (state.currentMain.length > 4) {
                mainEl.style.fontSize = Math.max(80, 148 - (state.currentMain.length - 4) * 15) + 'px';
            } else {
                mainEl.style.fontSize = '148px';
            }
        }

        renderHistory(state, animConfig, withEffects);
        syncGridBBannerState(state);

        if (withEffects && state.currentMain !== '---' && typeof onTriggerEffects === 'function') {
            onTriggerEffects(state.currentMain);
        }
    }

    /**
     * 7. 主號碼進場彈跳動畫
     */
    function animateMainNumber() {
        const mainEl = document.getElementById('main-number');
        if (!mainEl) return;
        mainEl.classList.remove('animate-call');
        void mainEl.offsetWidth; // Trigger reflow
        mainEl.classList.add('animate-call');
    }

    /**
     * 8. 背景影片與靜態菜單輔助
     */
    function updateVideoPlayback() {
        const bgVideo = document.getElementById('qms-video-bg');
        if (bgVideo) {
            bgVideo.play().catch(() => {});
        }
    }

    function ensureVideoPlay() {
        const bgVideo = document.getElementById('qms-video-bg');
        if (bgVideo && bgVideo.paused) {
            bgVideo.play().catch(() => {});
        }
    }

    function showNoImage(imgElement) {
        if (!imgElement) return;
        imgElement.style.display = 'none';
        const div = document.createElement('div');
        div.className = 'no-image-text';
        div.innerHTML = '請於 assets/ 目錄下放置 menu.jpg';
        if (imgElement.parentNode) {
            imgElement.parentNode.appendChild(div);
        }
    }

    /**
     * 9. 除錯面板開關與物理參數同步
     */
    function toggleDebugPanel() {
        const panel = document.getElementById('debug-panel');
        if (!panel) return;
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
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
        resizeViewport,
        changeFont,
        changeBannerOpacity,
        restoreAppearancePrefs,
        applyLayoutClass,
        applyHistoryChrome,
        syncLayoutSelectorUI,
        syncGridBBannerState,
        updateUI,
        animateMainNumber,
        updateVideoPlayback,
        ensureVideoPlay,
        showNoImage,
        toggleDebugPanel,
        syncAnimParamsFromDOM,
        applyPresetValues
    };
})();

window.QMSUI = QMSUI;
window.changeFont = QMSUI.changeFont;
window.changeBannerOpacity = QMSUI.changeBannerOpacity;
window.showNoImage = QMSUI.showNoImage;
window.toggleDebugPanel = QMSUI.toggleDebugPanel;
