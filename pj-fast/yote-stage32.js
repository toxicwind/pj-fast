// Stage 32: fetch deals.getDeal for EDS8L (47851) and EDMWP7 (65515).
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out32');
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
  for (const id of [CFG.DEAL_EDS8L, CFG.DEAL_PAIRINGS]) {
    const r = await page.evaluate(async (dealId) => {
    const P = window.__PJCFG;
      const inp = encodeURIComponent(JSON.stringify({ json: { dealId, storeId: P.STORE_ID } }));
      const res = await fetch('' + P.SITE_URL + '/api/trpc/deals.getDeal?input=' + inp);
      return { status: res.status, text: (await res.text()).slice(0, 12000) };
    }, id);
    fs.writeFileSync(OUT + '/deal-' + id + '.json', r.text);
    console.log('deal', id, 'status', r.status, 'len', r.text.length);
    // print steps summary
    try {
      const j = JSON.parse(r.text).result.data.json;
      console.log(' title:', j.title, '| price:', j.price || j.displayPrice, '| promoCode:', j.promotionCode);
      console.log(' steps:', JSON.stringify((j.steps || []).map(s => ({ title: s.title, qty: s.quantity, groups: (s.productGroupIds || []).slice(0, 8), configIds: s.productConfigurationIds })), null, 0).slice(0, 1200));
      if (j.dealPriceInfo) console.log(' priceInfo:', JSON.stringify(j.dealPriceInfo).slice(0, 400));
    } catch (e) { console.log(' parse err', e.message); }
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
