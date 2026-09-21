// Stage 16: climb higher from jalapeno leaf, list buttons + prices in topping card.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out16');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const ctx2 = ctx;
  const page = await ctx2.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  const info = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /jalape.o peppers/i.test(e.innerText || ''));
    if (!leaf) return { err: 'no-leaf' };
    let p = leaf, card = null;
    for (let i = 0; i < 10 && p; i++) {
      p = p.parentElement;
      if (p && p.querySelectorAll('button').length >= 2) { card = p; break; }
    }
    if (!card) return { err: 'no-card' };
    const btns = [...card.querySelectorAll('button')].map(b => ({ text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60), aria: b.getAttribute('aria-label') || '', cls: (b.className || '').toString().slice(0, 80) }));
    return { cardTag: card.tagName, cardText: (card.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300), buttons: btns };
  });
  fs.writeFileSync(OUT + '/jal-card.json', JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info, null, 1).slice(0, 3000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
