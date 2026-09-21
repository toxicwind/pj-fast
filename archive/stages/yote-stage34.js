// Stage 34: validate external promo candidates + find cart-clear mutation.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out34');
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
  const mutations = new Set();
  page.on('response', async r => {
    const u = r.url();
    if (/\.js($|\?)/.test(u) && u.includes('_next')) {
      try {
        const t = await r.text();
        for (const m of t.match(/cart\.[a-zA-Z]+/g) || []) mutations.add(m);
      } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  console.log('CART MUTATIONS:', [...mutations].sort().join(', '));
  // validate promo codes
  const codes = ['LOC40', 'SM25', 'TAKE25DEAL', 'PEPSI20', 'AMAC20', 'FREEDELIVERY', 'AE23', 'EDCYO22'];
  const results = await page.evaluate(async (codes) => {
    const P = window.__PJCFG;
    const raw = localStorage.getItem('cart-store');
    const cur = raw ? JSON.parse(raw).state.state : null;
    const out = [];
    for (const code of codes) {
      try {
        const r = await fetch('' + P.SITE_URL + '/api/trpc/cart.validatePromoCode', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ json: { promoCode: code, storeId: P.STORE_ID, orderType: 'CARRYOUT', currentCartState: cur } })
        });
        const t = await r.text();
        let verdict = t.slice(0, 300);
        try { const j = JSON.parse(t); verdict = j.error ? 'ERROR: ' + JSON.stringify(j.error).slice(0, 200) : 'OK: ' + JSON.stringify(j.result.data.json).slice(0, 300); } catch (e) {}
        out.push({ code, status: r.status, verdict });
      } catch (e) { out.push({ code, err: e.message }); }
      await new Promise(rr => setTimeout(rr, 800));
    }
    return out;
  }, codes);
  fs.writeFileSync(OUT + '/promo-validation.json', JSON.stringify(results, null, 1));
  for (const x of results) console.log(x.code, x.status, (x.verdict || x.err || '').slice(0, 160));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
