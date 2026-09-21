// Stage 33: visit dealbuilder for EDS8L + EDMWP7, capture deals.getDeal responses.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out33');
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
    if (u.includes('deals.getDeal') && r.status() === 200) {
      try {
        const t = await r.text();
        const j = JSON.parse(t).result.data.json;
        fs.writeFileSync(OUT + '/deal-' + j.dealId + '.json', t);
        console.log('SAVED deal', j.dealId, j.title, '| promo:', j.promotionCode);
        console.log(' steps:', JSON.stringify((j.steps || []).map(s => ({ t: s.title, q: s.quantity, g: (s.productGroupIds || []).slice(0, 10), c: s.productConfigurationIds })) ).slice(0, 1500));
        console.log(' minQty:', j.minQty, 'maxQty:', j.maxQty, 'pricing:', j.pricingMethodCode);
      } catch (e) { console.log('parse err', e.message); }
    }
  });
  for (const id of [CFG.DEAL_EDS8L, CFG.DEAL_PAIRINGS]) {
    await page.goto(CFG.SITE_URL + '/order/specials/' + id + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(10000);
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
