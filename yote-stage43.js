// Stage 43: try knots in empty cart; isolate side-add issue.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out43');
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
    const log = [];
    const sync = (st) => { const ls = JSON.parse(localStorage.getItem('cart-store')); ls.state.state = st.state; ls.state.price = st.price; localStorage.setItem('cart-store', JSON.stringify(ls)); };
    let cur = JSON.parse(localStorage.getItem('cart-store')).state.state;
    // empty the cart first
    for (const p of [...(cur.products || [])]) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: p.shopcartItemId, currentCartState: cur } })
      });
      const j = await r.json(); if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
      await new Promise(rr => setTimeout(rr, 600));
    }
    log.push('emptied p=' + cur.products.length);
    // try knots
    const knots = { sku: P.SKU_GARLIC_KNOTS, quantity: 1, title: 'Garlic Knots', currentCartState: cur };
    let r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCart', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: knots })
    });
    let j = await r.json();
    let st = j.result ? j.result.data.json : null;
    log.push('knots ' + r.status + ' n=' + (st ? st.state.products.length : '?') + ' conflict=' + JSON.stringify(st ? st.state.statusMessages : j.error).slice(0, 120));
    if (st) { cur = st.state; sync(st); }
    return { log, price: st ? st.price : null, items: st ? st.state.products.map(p => p.title + ' $' + p.displayPrice) : null };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  console.log('ITEMS:', JSON.stringify(out.items));
  fs.writeFileSync(OUT + '/knots.json', JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
