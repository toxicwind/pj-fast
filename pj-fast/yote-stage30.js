// Stage 30: find where cart state lives client-side; dump it.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out30');
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
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  const dump = await page.evaluate(() => {
    const P = window.__PJCFG;
    const out = { localKeys: [], sessionKeys: [] };
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); out.localKeys.push(k + ' len=' + (localStorage.getItem(k) || '').length); }
    for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); out.sessionKeys.push(k + ' len=' + (sessionStorage.getItem(k) || '').length); }
    return out;
  });
  console.log(JSON.stringify(dump, null, 1).slice(0, 2000));
  // look for shopcart in localStorage values
  const found = await page.evaluate(() => {
    const P = window.__PJCFG;
    const res = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); const v = localStorage.getItem(k) || '';
      if (/shopcart/i.test(v) && v.length > 100) res.push(k);
    }
    return res;
  });
  console.log('shopcart keys:', JSON.stringify(found));
  if (found.length) {
    const v = await page.evaluate(k => localStorage.getItem(k).slice(0, 3000), found[0]);
    fs.writeFileSync(OUT + '/cart-ls.txt', v);
    console.log(v.slice(0, 1500));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
