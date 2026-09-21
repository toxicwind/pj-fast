// Stage 29: fetch chunk with addDealToCart, print surrounding context.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out29');
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
  let target = null;
  page.on('response', async r => {
    const u = r.url();
    if (/7773\.v.*\.js/.test(u)) target = u;
  });
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  console.log('target:', target ? target.slice(0, 100) : 'none');
  if (target) {
    const t = await page.evaluate(async (url) => {
    const P = window.__PJCFG; const r = await fetch(url); return await r.text(); }, target);
    fs.writeFileSync(OUT + '/chunk7773.js', t);
    console.log('saved', t.length);
    // context around addDealToCart
    let idx = 0, n = 0;
    while ((idx = t.indexOf('addDealToCart', idx)) !== -1 && n < 8) {
      console.log('--- hit', n, '---');
      console.log(t.slice(Math.max(0, idx - 400), idx + 400).replace(/\n/g, ' ').slice(0, 800));
      idx += 13; n++;
    }
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
