const { chromium } = require('playwright-core');
const path = require('node:path');

(async () => {
  const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1600, height: 2800 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const selectors = ['header.topbar','.brand','.brand-logo','.topbar-stats','.stat-chip','.topbar-actions','#nextRoundButton','.quiz-shell','.quiz-panel','.panel-head','.progress-wrap','.progress-track','.board','.choices','.empty-state','.intro-modal','.intro-card','button'];
  await page.goto(`file:///${path.resolve('extension/quiz.html').replace(/\\/g,'/')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const result = await page.evaluate((selectorList) => {
    const seen = new Set();
    const counts = {};
    let total = 0;
    for (const selector of selectorList) {
      counts[selector] = 0;
      for (const el of document.querySelectorAll(selector)) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width < 8 || rect.height < 8) continue;
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity)===0) continue;
        if (!seen.has(el)) {
          seen.add(el);
          total++;
        }
        counts[selector]++;
      }
    }
    return { total, counts };
  }, selectors);
  console.log(JSON.stringify(result, null, 2));
  await context.close();
  await browser.close();
})();
