// Stage 42: debug side addToCart with full responses.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out42');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out41/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  const out = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const cur = JSON.parse(localStorage.getItem('cart-store')).state.state;
    const wings = { sku: P.SKU_WINGS_6PC, quantity: 1, currentCartState: cur };
    const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.addToCart', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: wings })
    });
    const j = await r.json();
    const st = j.result ? j.result.data.json : null;
    return { status: r.status,
      error: j.error ? JSON.stringify(j.error).slice(0, 500) : null,
      nProducts: st ? st.state.products.length : null,
      products: st ? st.state.products.map(p => ({ sku: p.sku, title: p.title, dp: p.displayPrice, status: p.status, msg: p.statusMessage })) : null,
      statusMessages: st ? st.state.statusMessages : null,
      price: st ? st.price : null };
  });
  console.log(JSON.stringify(out, null, 1).slice(0, 3000));
  fs.writeFileSync(OUT + '/wings-debug.json', JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
