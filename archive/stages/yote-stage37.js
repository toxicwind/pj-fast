// Stage 37: read final cart state after removal.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out37');
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
  await sleep(12000);
  const dump = await page.evaluate(() => {
    const P = window.__PJCFG;
    const raw = localStorage.getItem('cart-store');
    if (!raw) return 'none';
    const full = JSON.parse(raw).state;
    return JSON.stringify({ price: full.price, products: (full.state.products || []).map(p => p.title + ' $' + p.displayPrice),
      deals: (full.state.deals || []).map(d => ({ title: d.title, code: d.promoCode, dp: d.displayPrice, items: d.products.map(p => p.title + ' $' + p.displayPrice + ' tops=' + JSON.stringify(p.sectionWhole.toppings)) })) });
  });
  fs.writeFileSync(OUT + '/route1-final.json', dump);
  console.log(dump.slice(0, 2000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
