import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = 9876;

const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon',
    '.webm': 'video/webm'
};

function startStaticServer() {
    return new Promise((resolve) => {
        const server = createServer(async (req, res) => {
            let path = req.url.split('?')[0];
            if (path === '/') path = '/index.html';
            const filePath = join(ROOT, path);
            try {
                const data = await readFile(filePath);
                const ext = extname(filePath);
                res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
                res.end(data);
            } catch {
                res.writeHead(404);
                res.end('Not found');
            }
        });
        server.listen(PORT, () => resolve(server));
    });
}

async function collectPageErrors(page) {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

async function runViewport(browser, width, label) {
    const context = await browser.newContext({
        viewport: { width, height: Math.round(width * (1920 / 1080)) }
    });
    const page = await context.newPage();
    const errors = await collectPageErrors(page);

    const clientUrl = `http://127.0.0.1:${PORT}/v-ip/client/index.html`;
    await page.goto(clientUrl, { waitUntil: 'networkidle' });

    const debugPanel = page.locator('#debug-panel');
    const panelVisible = await debugPanel.count() > 0 && await debugPanel.isVisible().catch(() => false);

    const clearBtn = page.locator('#client-clear-history');
    await clearBtn.waitFor({ state: 'visible' });

    const banner = page.locator('#qms-banner');
    await page.waitForTimeout(500);
    const hadStandby = await banner.evaluate((el) => el.classList.contains('standby-mode'));

    await page.waitForTimeout(2500);
    const mainAfterAuto = await page.locator('#main-number').textContent();
    const autoStarted = Boolean(mainAfterAuto && mainAfterAuto.trim());

    await clearBtn.click();
    await page.waitForTimeout(300);
    const standbyAfterClear = await banner.evaluate((el) => el.classList.contains('standby-mode'));

    await page.waitForTimeout(2800);
    const mainAfterReplay = await page.locator('#main-number').textContent();
    const replayStarted = Boolean(mainAfterReplay && mainAfterReplay.trim());

    const selectedFont = await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--selected-font').trim()
    );

    const charVisible = await page.locator('#character-img').evaluate((img) => {
        return Boolean(img.getAttribute('src'));
    });

    const historyCount = await page.locator('.history-area .history-item:not(.empty-slot)').count();

    await context.close();

    return {
        label,
        width,
        panelVisible,
        hadStandby,
        autoStarted,
        standbyAfterClear,
        replayStarted,
        selectedFont,
        charVisible,
        historyCount,
        errors
    };
}

async function verifyVipControl(browser) {
    const page = await browser.newPage();
    const errors = await collectPageErrors(page);
    await page.goto(`http://127.0.0.1:${PORT}/v-ip/index.html`, { waitUntil: 'domcontentloaded' });
    const panel = page.locator('#debug-panel');
  const visible = await panel.isVisible();
    await page.close();
    return { vipPanelOpen: visible, errors };
}

async function verifyRoot(browser) {
    const page = await browser.newPage();
    const errors = await collectPageErrors(page);
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
    const title = await page.title();
    const hasRootPanel = await page.locator('#debug-panel').count();
    await page.close();
    return { title, hasRootPanel, errors };
}

const server = await startStaticServer();
const browser = await chromium.launch({ headless: true });

try {
    const r720 = await runViewport(browser, 720, '720px');
    const r1920 = await runViewport(browser, 1920, '1920px');
    const vip = await verifyVipControl(browser);
    const root = await verifyRoot(browser);

    const allErrors = [
        ...r720.errors,
        ...r1920.errors,
        ...vip.errors,
        ...root.errors
    ];

    const report = {
        client720: r720,
        client1920: r1920,
        vipControl: vip,
        rootIndex: root,
        totalConsoleErrors: allErrors.length,
        passed:
            !r720.panelVisible &&
            !r1920.panelVisible &&
            r720.hadStandby &&
            r1920.hadStandby &&
            r720.autoStarted &&
            r1920.autoStarted &&
            r720.standbyAfterClear &&
            r1920.standbyAfterClear &&
            r720.replayStarted &&
            r1920.replayStarted &&
            r720.selectedFont.includes('Nunito') &&
            r1920.selectedFont.includes('Nunito') &&
            vip.vipPanelOpen &&
            root.hasRootPanel > 0 &&
            allErrors.length === 0
    };

    console.log(JSON.stringify(report, null, 2));
    process.exit(report.passed ? 0 : 1);
} finally {
    await browser.close();
    server.close();
}
