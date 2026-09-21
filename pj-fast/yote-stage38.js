// Stage 38: single session - remove Philly, add BOGO deal, save storage, verify from responses.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out38');
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
  const out = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const log = [];
    const getCur = () => JSON.parse(localStorage.getItem('cart-store')).state.state;
    let cur = getCur();
    log.push('start products=' + cur.products.length + ' deals=' + (cur.deals || []).length);
    // remove all standalone products
    for (const p of [...(cur.products || [])]) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: p.shopcartItemId, currentCartState: cur } })
      });
      const j = await r.json();
      cur = j.result.data.json.state;
      // sync localStorage to server truth
      const ls = JSON.parse(localStorage.getItem('cart-store'));
      ls.state.state = j.result.data.json.state; ls.state.price = j.result.data.json.price;
      localStorage.setItem('cart-store', JSON.stringify(ls));
      log.push('removed ' + p.sku + ' -> products=' + cur.products.length + ' deals=' + (cur.deals || []).length);
      await new Promise(rr => setTimeout(rr, 800));
    }
    // add BOGO deal
    const instr = P.INSTRUCTIONS;
    const products = [
      { sku: P.SKU_PHILLY_LARGE, quantity: 1, title: 'Large Original Crust Philly Cheesesteak',
        sectionWhole: { toppings: P.TOPPINGS_PHILLY }, sectionOne: null, sectionTwo: null,
        sauceId: P.SAUCE_PHILLY, instructions: instr, sides: [], productModificationCodes: [],
        papaSized: false, productConfigurationId: P.CONFIG_PHILLY_LARGE },
      { sku: P.SKU_PEPP_LARGE, quantity: 1, title: 'Large Original Crust Pepperoni',
        sectionWhole: { toppings: P.TOPPINGS_PEPPERONI }, sectionOne: null, sectionTwo: null,
        sauceId: P.SAUCE_PEPPERONI, instructions: instr, sides: [], productModificationCodes: [],
        papaSized: false, productConfigurationId: P.CONFIG_PEPP_LARGE }
    ];
    const r2 = await fetch('https://www.papajohns.com/api/trpc/cart.addToCartWithDeal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { currentCartState: cur, dealId: P.DEAL_BOGO, products, quantity: 1, promoCode: P.PROMO_BOGO4U, vendorRewardId: null } })
    });
    const j2 = await r2.json();
    const st = j2.result.data.json;
    const ls2 = JSON.parse(localStorage.getItem('cart-store'));
    ls2.state.state = st.state; ls2.state.price = st.price;
    localStorage.setItem('cart-store', JSON.stringify(ls2));
    return { log, price: st.price, nProducts: st.state.products.length, nDeals: st.state.deals.length,
      dealItems: st.state.deals[0].products.map(p => p.title + ' $' + p.displayPrice + ' tops=' + JSON.stringify(p.sectionWhole.toppings)) };
  });
  console.log(out.log.join('\n'));
  console.log('FINAL PRICE:', JSON.stringify(out.price));
  console.log('products:', out.nProducts, 'deals:', out.nDeals);
  console.log('deal items:', JSON.stringify(out.dealItems));
  fs.writeFileSync(OUT + '/route1-final.json', JSON.stringify(out, null, 1));
  await ctx.storageState({ path: CFG.storage('out38/storage.json') });
  console.log('storage saved');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
