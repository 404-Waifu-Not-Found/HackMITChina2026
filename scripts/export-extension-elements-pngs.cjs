const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const rootDir = process.cwd();
const outRoot = path.resolve(rootDir, 'extension-window-png-exports');

const browserCandidates = [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

const pageConfigs = [
  {
    key: 'popup',
    htmlPath: path.resolve(rootDir, 'extension/popup.html'),
    selectors: [
      '.brand', '.brand-logo', '.hero-title', '.hero-subtitle', '.header-actions', '#quizButton',
      '.field', '.field-inline', '.switch-row', '.button-row', 'button', 'select', 'input', 'label',
      'details', 'summary', '.health-panel', '.status', '.vocabulary-badges', '.vocabulary-badge',
      '.vocabulary-toolbar', '#vocabularyFilterInput', '.vocabulary-filter-grid', '#logPanel'
    ]
  },
  {
    key: 'quiz',
    htmlPath: path.resolve(rootDir, 'extension/quiz.html'),
    selectors: [
      'header.topbar', '.brand', '.brand-logo', '.topbar-stats', '.stat-chip', '.topbar-actions',
      '#nextRoundButton', 'button'
    ]
  }
];

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function safeName(v) {
  return String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function findBrowser() {
  for (const p of browserCandidates) if (fs.existsSync(p)) return p;
  throw new Error('No Chrome/Edge found. Set CHROME_PATH or EDGE_PATH.');
}

async function collectNodes(page, selectors) {
  return page.evaluate((selectorList) => {
    const seen = new Set();
    const rows = [];
    let idx = 1;
    const add = (el, selector) => {
      if (!(el instanceof HTMLElement)) return;
      if (seen.has(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;
      const exportId = `ae-export-${idx++}`;
      el.setAttribute('data-ae-export-id', exportId);
      seen.add(el);
      rows.push({
        exportId,
        selector,
        id: el.id || null,
        className: el.className || null,
        tagName: el.tagName.toLowerCase(),
        x: Math.round(rect.x * 1000) / 1000,
        y: Math.round(rect.y * 1000) / 1000,
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    for (const selector of selectorList) {
      document.querySelectorAll(selector).forEach((el) => add(el, selector));
    }

    return rows;
  }, selectors);
}

async function exportPage(browser, config) {
  const dir = path.join(outRoot, config.key);
  ensureDir(dir);

  const context = await browser.newContext({
    viewport: { width: 1600, height: 2800 },
    deviceScaleFactor: 3,
    javaScriptEnabled: false
  });

  const page = await context.newPage();
  await page.goto(`file:///${config.htmlPath.replace(/\\/g, '/')}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });

  await page.evaluate(() => {
    document.querySelectorAll('link[href*="fonts.googleapis.com"], link[href*="fonts.gstatic.com"]').forEach((n) => n.remove());
  });

  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;font-family:Arial,sans-serif!important;}'
  });

  await page.screenshot({ path: path.join(dir, '00-full-window.png'), fullPage: false, omitBackground: false });

  const nodes = await collectNodes(page, config.selectors);
  const manifest = [];

  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    const fileName = `${String(i + 1).padStart(3, '0')}-${safeName(`${n.tagName}-${n.id || n.className || n.selector}`)}.png`;
    const clip = {
      x: Math.max(0, n.x),
      y: Math.max(0, n.y),
      width: Math.max(1, n.width),
      height: Math.max(1, n.height)
    };
    try {
      await page.screenshot({ path: path.join(dir, fileName), clip, omitBackground: true });
      manifest.push({ ...n, fileName, status: 'ok' });
    } catch (err) {
      manifest.push({ ...n, fileName, status: 'skipped', reason: String(err && err.message ? err.message : err) });
    }
  }

  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await context.close();
  return { page: config.key, total: manifest.length, ok: manifest.filter((x) => x.status === 'ok').length };
}

(async () => {
  ensureDir(outRoot);
  const browser = await chromium.launch({ headless: true, executablePath: findBrowser() });
  const summary = [];
  for (const cfg of pageConfigs) {
    const result = await exportPage(browser, cfg);
    summary.push(result);
  }
  await browser.close();

  fs.writeFileSync(path.join(outRoot, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
})();
