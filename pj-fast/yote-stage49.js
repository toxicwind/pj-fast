// Stage 49: pairings with a side (garlic knots) to test side-via-deal.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out49');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out48/storage.json'),
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
    for (const d of [...(cur.deals || [])]) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: d.shopcartItemId, currentCartState: cur } })
      });
      const j = await r.json(); if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
      await new Promise(rr => setTimeout(rr, 600));
    }
    log.push('emptied d=' + (cur.deals || []).length);
    // pairings: 2 pizzas + 1 garlic knots. Try config 27247 for the side.
    const mkPizza = (configId) => ({ sku: P.SKU_PEPP_MEDIUM, quantity: 1, title: 'Medium Pepperoni',
      sectionWhole: { toppings: P.TOPPINGS_PEPPERONI }, sectionOne: null, sectionTwo: null,
      sauceId: P.SAUCE_PHILLY, instructions: [], sides: [], productModificationCodes: [], papaSized: false,
      productConfigurationId: configId });
    const knots = { sku: P.SKU_GARLIC_KNOTS, quantity: 1, title: 'Garlic Knots', productConfigurationId: P.CONFIG_KNOTS };
    const products = [mkPizza(P.CONFIG_PAIRING_A), mkPizza(P.CONFIG_PAIRING_B), knots];
    const r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCartWithDeal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { currentCartState: cur, dealId: P.DEAL_PAIRINGS, products, quantity: 1, promoCode: P.PROMO_NONE, vendorRewardId: null } })
    });
    const t = await r.text();
    log.push('pair+side ' + r.status + ' ' + t.slice(0, 700));
    let price = null;
    try { const j = JSON.parse(t); if (j.result) { const st = j.result.data.json; sync(st); price = st.price;
      log.push('deal products: ' + st.state.deals[0].products.map(p => p.title).join(' | ')); } } catch (e) {}
    return { log, price };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  fs.writeFileSync(OUT + '/pair-side.json', JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
