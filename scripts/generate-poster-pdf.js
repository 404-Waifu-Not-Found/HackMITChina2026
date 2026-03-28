import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'YMCK Print.html');
const pdfPath  = path.join(root, 'YMCK PRINT A1.pdf');

const A1_W = 594; // mm
const A1_H = 841; // mm

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Set viewport to A1 at 96 DPI (1mm ≈ 3.7795px)
  const pxW = Math.round(A1_W * 3.7795);
  const pxH = Math.round(A1_H * 3.7795);
  await page.setViewport({ width: pxW, height: pxH });

  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 30000 });

  await page.pdf({
    path: pdfPath,
    width: A1_W + 'mm',
    height: A1_H + 'mm',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  await browser.close();
  console.log('PDF saved:', pdfPath);
})();
