// Stage 41: route 2 - Philly + wings + SM25, single session.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out41');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out38/storage.json'),
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
    const getCur = () => JSON.parse(localStorage.getItem('cart-store')).state.state;
    let cur = getCur();
    log.push('start p=' + cur.products.length + ' d=' + (cur.deals || []).length);
    // remove everything (products + deals)
    const items = [...(cur.products || []).map(p => ({ id: p.shopcartItemId, k: 'p' })), ...((cur.deals || []).map(d => ({ id: d.shopcartItemId, k: 'd' })))];
    for (const it of items) {
      const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.removeFromCart', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ json: { shopcartItemId: it.id, currentCartState: cur } })
      });
      const j = await r.json();
      if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); }
      log.push('rm ' + it.k + ' ' + r.status + ' p=' + cur.products.length + ' d=' + (cur.deals || []).length);
      await new Promise(rr => setTimeout(rr, 800));
    }
    const instr = P.INSTRUCTIONS;
    // add Philly (no onion + jalapeno)
    const philly = { sku: P.SKU_PHILLY_LARGE, quantity: 1, title: 'Large Original Crust Philly Cheesesteak',
      sectionWhole: { toppings: P.TOPPINGS_PHILLY }, sectionOne: null, sectionTwo: null,
      sauceId: P.SAUCE_PHILLY, instructions: instr, sides: [], productModificationCodes: [], papaSized: false, currentCartState: cur };
    let r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCart', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: philly })
    });
    let j = await r.json();
    let price1 = null;
    if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); price1 = j.result.data.json.price; }
    log.push('add philly ' + r.status + ' ' + (j.error ? JSON.stringify(j.error).slice(0, 150) : 'p=' + cur.products.length));
    await new Promise(rr => setTimeout(rr, 800));
    // add wings
    const wings = { sku: P.SKU_WINGS_6PC, quantity: 1, title: '6 Piece Garlic Parmesan Wings', currentCartState: cur };
    r = await fetch('https://www.papajohns.com/api/trpc/cart.addToCart', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ json: wings })
    });
    j = await r.json();
    if (j.result) { cur = j.result.data.json.state; sync(j.result.data.json); price1 = j.result.data.json.price; }
    log.push('add wings ' + r.status + ' ' + (j.error ? JSON.stringify(j.error).slice(0, 150) : 'p=' + cur.products.length));
    await new Promise(rr => setTimeout(rr, 800));
    // apply SM25
    const promoShapes = [
      ['submitPromoCode', { json: { promoCode: P.PROMO_SM25, currentCartState: cur } }],
      ['applyPromoCode', { json: { promoCode: P.PROMO_SM25, currentCartState: cur } }],
    ];
    let finalPrice = null;
    for (const [proc, body] of promoShapes) {
      r = await fetch('https://www.papajohns.com/api/trpc/cart.' + proc, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      const t = await r.text();
      log.push(proc + ' ' + r.status + ' ' + t.slice(0, 250));
      try { const jj = JSON.parse(t); if (jj.result) { finalPrice = jj.result.data.json.price || jj.result.data.json; cur = jj.result.data.json.state || cur; } } catch (e) {}
      await new Promise(rr => setTimeout(rr, 800));
      if (finalPrice && finalPrice.grandTotal) break;
    }
    return { log, price: finalPrice || price1,
      items: cur.products.map(p => p.title + ' $' + p.displayPrice) };
  });
  console.log(out.log.join('\n'));
  console.log('PRICE:', JSON.stringify(out.price));
  console.log('ITEMS:', JSON.stringify(out.items));
  fs.writeFileSync(OUT + '/route2.json', JSON.stringify(out, null, 1));
  await ctx.storageState({ path: CFG.storage('out41/storage.json') });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
