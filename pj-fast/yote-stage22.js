// Stage 22: screenshot + full dump of dealbuilder step 1.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out22');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out18/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: 1366, height: 2400 }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  await page.screenshot({ path: OUT + '/step1.png', fullPage: true });
  const html = await page.evaluate(() => document.documentElement.outerHTML.slice(0, 20000));
  fs.writeFileSync(OUT + '/step1.html', html);
  const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].map(i => i.alt + ' | ' + (i.src || '').slice(0, 80)).join('\n'));
  fs.writeFileSync(OUT + '/imgs.txt', imgs);
  console.log('IMGS:\n' + imgs.slice(0, 2000));
  const btns = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50)).filter(t => t).join(' || '));
  console.log('BTNS:', btns.slice(0, 1500));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
