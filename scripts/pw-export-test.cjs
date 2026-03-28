const { chromium } = require('playwright-core');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
  const outDir = path.resolve('extension-window-png-exports-test');
  fs.mkdirSync(outDir, { recursive: true });
  const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1600, height: 2800 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.goto(`file:///${path.resolve('extension/popup.html').replace(/\\/g,'/')}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.screenshot({ path: path.join(outDir, 'popup-window.png'), fullPage: false });
  const rect = await page.evaluate(() => {
    const el = document.querySelector('.brand');
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  await page.screenshot({ path: path.join(outDir, 'brand.png'), clip: rect, omitBackground: true });
  await context.close();
  await browser.close();
  console.log('ok');
})();
