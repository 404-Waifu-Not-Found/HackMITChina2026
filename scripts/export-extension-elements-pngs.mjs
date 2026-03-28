import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const rootDir = process.cwd();
const outputRoot = path.resolve(rootDir, 'extension-window-png-exports');

const browserCandidates = [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

function findBrowserExecutable() {
  for (const candidate of browserCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    'No Chrome/Edge executable found. Set CHROME_PATH or EDGE_PATH and rerun this script.'
  );
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

const pageConfigs = [
  {
    key: 'popup',
    htmlPath: path.resolve(rootDir, 'extension/popup.html'),
    selectors: [
      'header.top-card',
      '.brand',
      '.brand-logo',
      '.hero-title',
      '.hero-subtitle',
      '.header-actions',
      '#quizButton',
      'section.panel',
      '.field',
      '.field-inline',
      '.switch-row',
      '.button-row',
      'button',
      'select',
      'input',
      'label',
      'details',
      'summary',
      '.health-panel',
      '.status',
      '.vocabulary-badges',
      '.vocabulary-badge',
      '.vocabulary-toolbar',
      '#vocabularyFilterInput',
      '.vocabulary-filter-grid',
      '.vocabulary-list',
      '#vocabularyTable',
      '#logPanel'
    ]
  },
  {
    key: 'quiz',
    htmlPath: path.resolve(rootDir, 'extension/quiz.html'),
    selectors: [
      'header.topbar',
      '.brand',
      '.brand-logo',
      '.topbar-stats',
      '.stat-chip',
      '.topbar-actions',
      '#nextRoundButton',
      '.quiz-shell',
      '.quiz-panel',
      '.panel-head',
      '.progress-wrap',
      '.progress-track',
      '.board',
      '.choices',
      '.empty-state',
      '.intro-modal',
      '.intro-card',
      'button'
    ]
  }
];

async function collectExportNodes(page, selectors) {
  return page.evaluate((selectorList) => {
    const seen = new Set();
    const items = [];

    const register = (el, originSelector) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }
      if (seen.has(el)) {
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) {
        return;
      }
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return;
      }
      const exportId = `export-${items.length + 1}`;
      el.setAttribute('data-export-id', exportId);
      seen.add(el);
      items.push({
        exportId,
        selector: originSelector,
        id: el.id || null,
        className: el.className || null,
        tagName: el.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    for (const selector of selectorList) {
      for (const el of document.querySelectorAll(selector)) {
        register(el, selector);
      }
    }

    return items;
  }, selectors);
}

async function exportPageElements(browser, config) {
  const outputDir = path.join(outputRoot, config.key);
  ensureDir(outputDir);

  const context = await browser.newContext({
    viewport: { width: 1600, height: 2800 },
    deviceScaleFactor: 3,
    javaScriptEnabled: false
  });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(30000);

  await page.goto(`file:///${config.htmlPath.replace(/\\/g, '/')}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  await page.waitForTimeout(300);

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `
  });

  await page.screenshot({
    path: path.join(outputDir, '00-full-window.png'),
    fullPage: true,
    omitBackground: false
  });

  const nodes = await collectExportNodes(page, config.selectors);
  console.log(`[${config.key}] nodes discovered: ${nodes.length}`);

  const manifest = [];
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (index % 25 === 0) {
      console.log(`[${config.key}] exporting ${index + 1}/${nodes.length}`);
    }
    const locator = page.locator(`[data-export-id="${node.exportId}"]`).first();
    const baseName = `${String(index + 1).padStart(3, '0')}-${safeName(
      `${node.tagName}-${node.id || node.className || node.selector}`
    )}`;
    const fileName = `${baseName}.png`;
    try {
      await locator.screenshot({
        path: path.join(outputDir, fileName),
        omitBackground: true,
        timeout: 3000
      });
      manifest.push({ ...node, fileName, status: 'ok' });
    } catch (error) {
      manifest.push({ ...node, fileName, status: 'skipped', reason: String(error?.message || error) });
    }
  }

  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  await context.close();
  return { page: config.key, count: manifest.length, outputDir };
}

async function main() {
  ensureDir(outputRoot);
  const executablePath = findBrowserExecutable();

  const browser = await chromium.launch({
    headless: true,
    executablePath
  });

  const summary = [];
  for (const config of pageConfigs) {
    const result = await exportPageElements(browser, config);
    summary.push(result);
  }

  await browser.close();

  const summaryPath = path.join(outputRoot, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log('Export complete:');
  for (const item of summary) {
    console.log(`- ${item.page}: ${item.count} PNGs -> ${item.outputDir}`);
  }
  console.log(`- summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
