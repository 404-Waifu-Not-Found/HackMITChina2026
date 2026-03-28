const { chromium } = require('playwright-core');

(async () => {
  const exe = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  console.log('start');
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  console.log('launched');
  const page = await browser.newPage();
  await page.setContent('<html><body><div style="width:200px;height:100px;background:red"></div></body></html>');
  await page.screenshot({ path: 'pw-smoke.png' });
  await browser.close();
  console.log('done');
})();
