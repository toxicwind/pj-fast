// Stage 15: inspect jalapeno row HTML, find real toggle control + price.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out15');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  const html = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('*')].find(e => e.children.length === 0 && /jalape.o peppers/i.test(e.innerText || ''));
    if (!leaf) return 'no-leaf';
    let p = leaf.parentElement;
    for (let i = 0; i < 6 && p; i++) {
      const t = (p.innerText || '').replace(/\s+/g, ' ').trim();
      if (t.length > 20 && t.length < 400) {
        return { tag: p.tagName, cls: (p.className || '').toString().slice(0, 120), html: p.outerHTML.slice(0, 2500), text: t.slice(0, 200) };
      }
      p = p.parentElement;
    }
    return 'no-row';
  });
  fs.writeFileSync(OUT + '/jal-row.json', JSON.stringify(html, null, 1));
  console.log(JSON.stringify(html, null, 1).slice(0, 2800));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
