// Stage 27: capture console errors on dealbuilder page.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out27');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out24/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[CONSOLE-' + m.type() + ']', m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('[PAGEERROR]', (e.message || '').slice(0, 400)));
  page.on('requestfailed', r => console.log('[REQFAIL]', r.url().slice(0, 120), r.failure() ? r.failure().errorText : ''));
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(15000);
  // check __NEXT_DATA__ for deal state
  const nd = await page.evaluate(() => {
    const P = window.__PJCFG;
    const el = document.getElementById('__NEXT_DATA__');
    if (!el) return 'no-next-data';
    try { const j = JSON.parse(el.textContent); return JSON.stringify(j).slice(0, 500); } catch (e) { return 'parse-err'; }
  });
  console.log('NEXTDATA:', nd.slice(0, 500));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
