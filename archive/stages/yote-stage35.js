// Stage 35: clear cart via UI, then add BOGO deal fresh. Verify final total.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out35');
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
  page.on('response', async r => {
    const u = r.url();
    if (/cart\.(removeFromCart|addToCartWithDeal)/.test(u)) {
      console.log('MUT', u.split('/').pop(), r.status());
      try { fs.writeFileSync(OUT + '/resp-' + u.split('/').pop().split('?')[0] + '.json', await r.text()); } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  // click Remove all items
  const btns = page.getByText(/remove all items/i);
  console.log('remove-all count:', await btns.count());
  if (await btns.count() > 0) { await btns.first().click({ timeout: 10000 }); await sleep(8000); }
  let cart = await page.evaluate(() => {
    const P = window.__PJCFG;
    const raw = localStorage.getItem('cart-store');
    if (!raw) return 'none';
    const s = JSON.parse(raw).state.state;
    return JSON.stringify({ products: (s.products || []).length, deals: (s.deals || []).length });
  });
  console.log('cart after clear:', cart);
  // add BOGO deal fresh
  const result = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const raw = localStorage.getItem('cart-store');
    const cur = raw ? JSON.parse(raw).state.state : null;
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
    const body = { json: { currentCartState: cur, dealId: P.DEAL_BOGO, products, quantity: 1, promoCode: P.PROMO_BOGO4U, vendorRewardId: null } };
    const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.addToCartWithDeal', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    });
    return { status: r.status, text: (await r.text()).slice(0, 6000) };
  });
  console.log('addDeal status:', result.status);
  try {
    const j = JSON.parse(result.text).result.data.json;
    console.log('PRICE:', JSON.stringify(j.price));
    console.log('products:', j.state.products.length, 'deals:', j.state.deals.length);
    const dp = j.state.deals[0].products.map(p => p.title + ' $' + p.displayPrice + ' tops=' + JSON.stringify(p.sectionWhole.toppings));
    console.log('deal items:', JSON.stringify(dp));
    fs.writeFileSync(OUT + '/route1-final.json', result.text);
  } catch (e) { console.log('parse fail', result.text.slice(0, 500)); }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
