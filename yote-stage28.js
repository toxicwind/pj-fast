// Stage 28: fetch dealbuilder JS chunks, grep for deal/cart mutation names.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out28');
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
  const chunks = new Set();
  page.on('response', async r => {
    const u = r.url();
    if (/\.js($|\?)/.test(u) && u.includes('_next')) {
      chunks.add(u);
      try {
        const t = await r.text();
        const hits = [];
        for (const pat of ['addDeal', 'dealToCart', 'cart.add', 'applyDeal', 'promoCode', 'addToCart']) {
          if (t.includes(pat)) hits.push(pat);
        }
        if (hits.length) console.log('CHUNK', u.split('/').pop().slice(0, 60), '->', hits.join(','));
        // deep grep for deal mutations
        const m = t.match(/[a-zA-Z]*[Dd]eal[A-Za-z]{0,20}/g);
        if (m) { const uniq = [...new Set(m)].slice(0, 40); fs.appendFileSync(OUT + '/deal-strings.txt', u.split('/').pop() + '\n' + uniq.join('\n') + '\n\n'); }
      } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(15000);
  console.log('chunks seen:', chunks.size);
  // also grep page's webpack runtime for trpc router procedure list
  const procs = await page.evaluate(async () => {
    const P = window.__PJCFG;
    const out = [];
    for (const s of document.querySelectorAll('script[src*="_next"]')) {
      try {
        const t = await (await fetch(s.src)).text();
        const m = t.match(/"(cart|deals|offers|promo)[.][a-zA-Z]+"/g);
        if (m) out.push(...m);
      } catch (e) {}
    }
    return [...new Set(out)].sort().slice(0, 60);
  });
  fs.writeFileSync(OUT + '/procedures.json', JSON.stringify(procs, null, 1));
  console.log('PROCS:', JSON.stringify(procs).slice(0, 2000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
