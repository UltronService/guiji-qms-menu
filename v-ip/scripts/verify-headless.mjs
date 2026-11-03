import puppeteer from 'puppeteer-core';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = join(fileURLToPath(import.meta.url), '../../..');
const outDir = '/opt/cursor/artifacts/screenshots';
mkdirSync(outDir, { recursive: true });

const mime = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.webm': 'video/webm',
    '.woff2': 'font/woff2',
    '.otf': 'font/otf',
    '.ico': 'image/x-icon',
    '.png': 'image/png'
};

function startServer() {
    return new Promise((resolve) => {
        const server = createServer((req, res) => {
            let rel = decodeURIComponent(req.url.split('?')[0]);
            if (rel === '/') rel = '/index.html';
            let filePath = join(repoRoot, rel);
            if (existsSync(filePath) && statSync(filePath).isDirectory()) {
                filePath = join(filePath, 'index.html');
            }
            if (!existsSync(filePath)) {
                res.writeHead(404);
                res.end('not found');
                return;
            }
            if (statSync(filePath).isDirectory()) {
                res.writeHead(404);
                res.end('is dir');
                return;
            }
            const data = readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
            res.end(data);
        });
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, base: `http://127.0.0.1:${port}` });
        });
    });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function softGoto(page, url, ms = 8000) {
    await Promise.race([
        page.goto(url, { waitUntil: 'load', timeout: ms }).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, ms))
    ]);
}

async function main() {
    const { server, base } = await startServer();
    const errors = [];
    const external = [];

    const browser = await puppeteer.launch({
        executablePath: '/usr/local/bin/google-chrome',
        headless: 'new',
        args: ['--no-sandbox', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1920 });
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const u = req.url();
            if (u.includes('.webm')) {
                req.abort();
                return;
            }
            req.continue();
        });
        page.on('console', (msg) => {
            if (msg.type() !== 'error') return;
            const text = msg.text();
            if (text.includes('net::ERR_FAILED')) return;
            errors.push(text);
        });
        page.on('requestfinished', (req) => {
            const u = req.url();
            if (u.startsWith('http') && !u.includes('127.0.0.1')) external.push(u);
        });

        await softGoto(page, `${base}/v-ip/index.html`);
        await delay(400);
        await page.screenshot({ path: join(outDir, 'v-ip-standby.png') });

        await page.evaluate(() => window.testNextNumber());
        await delay(350);
        await page.screenshot({ path: join(outDir, 'v-ip-mid-call-jump.png') });

        await delay(1300);
        await page.screenshot({ path: join(outDir, 'v-ip-mid-sign-a.png') });

        await page.evaluate(() => {
            const sel = document.getElementById('display-mode-selector');
            if (sel) {
                sel.value = 'classic';
                sel.dispatchEvent(new Event('change'));
            }
        });
        await delay(350);
        await page.screenshot({ path: join(outDir, 'v-ip-classic.png') });

        await page.evaluate(() => {
            const sel = document.getElementById('display-mode-selector');
            if (sel) {
                sel.value = 'grid-b';
                sel.dispatchEvent(new Event('change'));
            }
        });
        await page.evaluate(() => {
            window.processScan('401');
            window.processScan('402');
            window.processScan('403');
            window.processScan('404');
        });
        await delay(700);
        await page.screenshot({ path: join(outDir, 'v-ip-grid-b.png') });

        await softGoto(page, `${base}/index.html`);
        const rootHasIp = await page.evaluate(() => !!document.getElementById('ip-characters'));
        if (rootHasIp) errors.push('root index must not include ip-characters');

        await softGoto(page, `${base}/v-ip/index.html`);
        const swOk = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            try {
                const reg = await Promise.race([
                    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('sw timeout')), 12000))
                ]);
                return !!reg;
            } catch (e) {
                return false;
            }
        });
        if (!swOk) errors.push('service worker register/ready failed or timed out');
        await Promise.race([
            page.reload({ waitUntil: 'load', timeout: 8000 }).catch(() => {}),
            delay(8000)
        ]);
        const hasMain = await page.evaluate(() => !!document.getElementById('main-number'));
        if (!hasMain) errors.push('v-ip reload missing main-number');

        console.log(JSON.stringify({
            errors,
            external: [...new Set(external)],
            screenshots: outDir
        }, null, 2));
        if (errors.length) process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
