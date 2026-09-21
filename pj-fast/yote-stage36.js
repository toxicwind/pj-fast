// Stage 36: removeFromCart direct call, then verify.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out36');
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
  const result = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const raw = localStorage.getItem('cart-store');
    const cur = raw ? JSON.parse(raw).state.state : null;
    const standalone = (cur.products || []).filter(p => !p.shopcartItemId || true);
    const out = [];
    for (const p of (cur.products || [])) {
      const body = { json: { shopcartItemId: p.shopcartItemId, currentCartState: cur } };
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      const t = await r.text();
      out.push({ sku: p.sku, status: r.status, resp: t.slice(0, 400) });
      await new Promise(rr => setTimeout(rr, 1000));
    }
    return out;
  });
  for (const x of result) console.log(x.sku, x.status, x.resp.slice(0, 200));
  fs.writeFileSync(OUT + '/remove.json', JSON.stringify(result, null, 1).slice(0, 3000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
