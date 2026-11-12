/**
 * v-ip 官方 AA 直式菜單：飲品區固定 + 底部兩段 footer 垂直滑動輪播
 */

const QMSMenuBoard = (() => {
    /** 每段停留（含 0.5s 滑動，其餘約 4.5s 靜止可讀） */
    const FOOTER_ROTATE_MS = 5000;
    const FOOTER_TRANSITION_MS = 500;

    const FOOTER_VIEWPORT_H = 250;
    const BAND1_H = 193;
    const BAND2_H = 208;
    /** 官方稿兩段間距（2160 寬下 62px → 1080 為 31px） */
    const OFFICIAL_BAND_GAP = 31;

    const SLIDE1_H = OFFICIAL_BAND_GAP + BAND1_H;
    const SLIDE2_H = OFFICIAL_BAND_GAP + BAND2_H;

    function initFooterRotate() {
        const footer = document.getElementById('menu-footer');
        const track = document.getElementById('menu-footer-track');
        if (!footer || !track) return;

        const yBand1 = 0;
        const yBand2 = -SLIDE1_H;

        let showBand2 = false;

        const applyOffset = (showSecond) => {
            const y = showSecond ? yBand2 : yBand1;
            track.style.transform = `translate3d(0, ${y}px, 0)`;
            footer.setAttribute('data-footer-band', showSecond ? '2' : '1');
        };

        track.style.transitionDuration = `${FOOTER_TRANSITION_MS / 1000}s`;
        applyOffset(false);

        window.setInterval(() => {
            showBand2 = !showBand2;
            applyOffset(showBand2);
        }, FOOTER_ROTATE_MS);
    }

    function init() {
        initFooterRotate();
    }

    return {
        init,
        FOOTER_ROTATE_MS,
        FOOTER_TRANSITION_MS,
        FOOTER_VIEWPORT_H,
        SLIDE1_H,
        SLIDE2_H
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => QMSMenuBoard.init());
} else {
    QMSMenuBoard.init();
}
