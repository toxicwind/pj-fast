// Stage 46: Papa Pairings deal via addToCartWithDeal.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out46');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out44/storage.json'),
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
    log.push('emptied p=' + cur.products.length + ' d=' + (cur.deals || []).length);
    // Try pairings: 3 medium 1-topping pizzas. Config IDs: 10399,13664,18899,27247
    // Guess: map config IDs to items. Try medium pepperoni.
    const mkPizza = (configId) => ({ sku: P.SKU_PEPP_MEDIUM, quantity: 1, title: 'Medium Pepperoni',
      sectionWhole: { toppings: P.TOPPINGS_PEPPERONI }, sectionOne: null, sectionTwo: null,
      sauceId: P.SAUCE_PHILLY, instructions: [], sides: [], productModificationCodes: [], papaSized: false,
      productConfigurationId: configId });
    const products = [mkPizza(P.CONFIG_PAIRING_A), mkPizza(P.CONFIG_PAIRING_B), mkPizza(P.CONFIG_PAIRING_C)];
    const r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCartWithDeal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { currentCartState: cur, dealId: P.DEAL_PAIRINGS, products, quantity: 1, promoCode: P.PROMO_NONE, vendorRewardId: null } })
    });
    const t = await r.text();
    log.push('pairings ' + r.status + ' ' + t.slice(0, 600));
    let price = null, items = null;
    try {
      const j = JSON.parse(t);
      if (j.result) { const st = j.result.data.json; sync(st); price = st.price;
        items = [...(st.state.products || []).map(p => p.title + ' $' + p.displayPrice),
                 ...((st.state.deals || []).map(d => 'DEAL:' + (d.title || d.dealId) + ' $' + d.displayPrice))];
        log.push('state p=' + st.state.products.length + ' d=' + (st.state.deals || []).length);
      }
    } catch (e) { log.push('parse fail'); }
    return { log, price, items };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  console.log('ITEMS:', JSON.stringify(out.items));
  fs.writeFileSync(OUT + '/pairings.json', JSON.stringify(out, null, 1));
  await ctx.storageState({ path: CFG.storage('out46/storage.json') });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
