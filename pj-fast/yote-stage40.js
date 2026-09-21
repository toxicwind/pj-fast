// Stage 40: probe cart.addToCart input shapes.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out40');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out38/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  const res = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const cur = JSON.parse(localStorage.getItem('cart-store')).state.state;
    const prod = { sku: P.SKU_WINGS_6PC, quantity: 1, title: '6 Piece Garlic Parmesan Wings' };
    const shapes = [
      { json: { currentCartState: cur, product: prod } },
      { json: { product: prod, quantity: 1, currentCartState: cur } },
      { json: Object.assign({ currentCartState: cur }, prod) },
    ];
    const out = [];
    for (let i = 0; i < shapes.length; i++) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.addToCart', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(shapes[i])
      });
      const t = await r.text();
      out.push({ shape: i, status: r.status, resp: t.slice(0, 350) });
      await new Promise(rr => setTimeout(rr, 800));
    }
    return out;
  });
  for (const x of res) console.log('shape', x.shape, x.status, x.resp.slice(0, 300));
  fs.writeFileSync(OUT + '/probe.json', JSON.stringify(res, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
