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

    return {
        preloadCharacters,
        resizeViewport,
        renderCharacter,
        renderHistory,
        animateMainNumber,
        updateUI,
        showNoImage
    };
})();

window.QMSUI = QMSUI;
window.showNoImage = QMSUI.showNoImage;
