const { chromium } = require('playwright-core');
const path = require('node:path');

(async () => {
  const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1600, height: 2800 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const selectors = [
    'header.top-card','.brand','.brand-logo','.hero-title','.hero-subtitle','.header-actions','#quizButton','section.panel','.field','.field-inline','.switch-row','.button-row','button','select','input','label','details','summary','.health-panel','.status','.vocabulary-badges','.vocabulary-badge','.vocabulary-toolbar','#vocabularyFilterInput','.vocabulary-filter-grid','.vocabulary-list','#vocabularyTable','#logPanel'
  ];
  await page.goto(`file:///${path.resolve('extension/popup.html').replace(/\\/g,'/')}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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
