// Stage 48: EDS8L Philly $16.99 via addToCartWithDeal.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out48');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out46/storage.json'),
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
    // empty cart
    for (const p of [...(cur.products || [])]) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: p.shopcartItemId, currentCartState: cur } })
      });
      const j = await r.json(); if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
      await new Promise(rr => setTimeout(rr, 600));
    }
    for (const d of [...(cur.deals || [])]) {
      const r = await fetch('https://www.papajohns.com/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: d.shopcartItemId, currentCartState: cur } })
      });
      const j = await r.json(); if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
      await new Promise(rr => setTimeout(rr, 600));
    }
    log.push('emptied');
    // EDS8L: Large Any Specialty $16.99, deal ID 47851
    const instr = P.INSTRUCTIONS;
    const products = [{ sku: P.SKU_PHILLY_LARGE, quantity: 1, title: 'Large Original Crust Philly Cheesesteak',
      sectionWhole: { toppings: P.TOPPINGS_PHILLY }, sectionOne: null, sectionTwo: null,
      sauceId: P.SAUCE_PHILLY, instructions: instr, sides: [], productModificationCodes: [], papaSized: false }];
    const r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCartWithDeal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { currentCartState: cur, dealId: P.DEAL_EDS8L, products, quantity: 1, promoCode: P.PROMO_NONE, vendorRewardId: null } })
    });
    const t = await r.text();
    log.push('EDS8L ' + r.status + ' ' + t.slice(0, 500));
    let price = null, items = null;
    try {
      const j = JSON.parse(t);
      if (j.result) { const st = j.result.data.json; sync(st); price = st.price;
        items = [...(st.state.products || []).map(p => p.title + ' $' + p.displayPrice),
                 ...((st.state.deals || []).map(d => 'DEAL:' + (d.title || '') + ' $' + d.displayPrice))];
      }
    } catch (e) {}
    return { log, price, items };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  console.log('ITEMS:', JSON.stringify(out.items));
  fs.writeFileSync(OUT + '/eds8l.json', JSON.stringify(out, null, 1));
  await ctx.storageState({ path: CFG.storage('out48/storage.json') });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
