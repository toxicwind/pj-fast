// Stage 31: call cart.addToCartWithDeal directly for BOGO4U.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out31');
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
    if (!raw) return { err: 'no-cart-store' };
    const cur = JSON.parse(raw).state.state;
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
    const t = await r.text();
    return { status: r.status, len: t.length, body: t.slice(0, 4000) };
  });
  fs.writeFileSync(OUT + '/deal-result.json', JSON.stringify(result, null, 1));
  console.log('STATUS:', result.status);
  console.log((result.body || result.err || '').slice(0, 2500));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
