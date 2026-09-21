// Stage 44: verify SM25 applies to Philly-only cart via applyPromoCode.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out44');
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
    log.push('start p=' + cur.products.length);
    const instr = P.INSTRUCTIONS;
    const philly = { sku: P.SKU_PHILLY_LARGE, quantity: 1, title: 'Large Original Crust Philly Cheesesteak',
      sectionWhole: { toppings: P.TOPPINGS_PHILLY }, sectionOne: null, sectionTwo: null,
      sauceId: P.SAUCE_PHILLY, instructions: instr, sides: [], productModificationCodes: [], papaSized: false, currentCartState: cur };
    let r = await fetch('' + P.SITE_URL + '/api/trpc/cart.addToCart', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: philly })
    });
    let j = await r.json();
    if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
    log.push('philly added, dp=' + (j.result ? j.result.data.json.state.products[0].displayPrice : '?'));
    await new Promise(rr => setTimeout(rr, 800));
    // refresh to get true cart pricing
    r = await fetch('https://www.papajohns.com/api/trpc/cart.refreshItemsInCart', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { currentCartState: cur } })
    });
    j = await r.json();
    if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
    log.push('after refresh dp=' + (j.result ? j.result.data.json.state.products.map(p => p.displayPrice).join(',') : '?') + ' total=' + (j.result ? j.result.data.json.price.grandTotal : '?'));
    await new Promise(rr => setTimeout(rr, 800));
    // apply SM25
    r = await fetch('https://www.papajohns.com/api/trpc/cart.applyPromoCode', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: { promoCode: P.PROMO_SM25, currentCartState: cur } })
    });
    const t = await r.text();
    log.push('applyPromoCode ' + r.status);
    let price = null;
    try {
      const jj = JSON.parse(t);
      if (jj.result) { price = jj.result.data.json.price || jj.result.data.json; const st = jj.result.data.json.state || jj.result.data.json; if (st.products) cur = st; }
      else log.push('err: ' + JSON.stringify(jj.error).slice(0, 300));
    } catch (e) { log.push('parse err ' + t.slice(0, 200)); }
    return { log, price };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  fs.writeFileSync(OUT + '/sm25.json', JSON.stringify(out, null, 1));
  await ctx.storageState({ path: CFG.storage('out44/storage.json') });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
