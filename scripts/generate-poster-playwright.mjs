import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'YMCK Print.html');
const pdfPath  = path.join(root, 'YMCK PRINT A1.pdf');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 4535, height: 7559 }, // 1200mm × 2000mm at 96dpi
    deviceScaleFactor: 2,                    // 2× for sharp output
  });
  const page = await context.newPage();

  // Load the file, wait for all network requests (images, fonts) to settle
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), {
    waitUntil: 'networkidle',
    timeout: 60000,
  });

  // Extra wait to ensure web fonts and remote images finish rendering
  await page.waitForTimeout(3000);

  await page.pdf({
    path: pdfPath,
    width:  '1200mm',
    height: '2000mm',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
    scale: 1,
  });

  await browser.close();
  const size = (fs.statSync(pdfPath).size / 1024).toFixed(0);
  console.log(`PDF saved: ${pdfPath} (${size} KB)`);
})();
