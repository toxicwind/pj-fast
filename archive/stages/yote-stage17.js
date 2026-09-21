// Stage 17: click jalapeno row, then dump expanded topping card for price buttons.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out17');
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
  // scroll jalapeno into view and click the row container
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /jalape.o peppers/i.test((e.innerText || '').trim()));
    if (!leaf) return 'no-p';
    // row container: closest div that has sibling buttons or is clickable
    let row = leaf.closest('div');
    for (let i = 0; i < 4 && row; i++) {
      const r = row.getBoundingClientRect();
      if (r.height > 40) break;
      row = row.parentElement;
    }
    row.scrollIntoView({ block: 'center' });
    const r = row.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: Math.round(r.height) };
  });
  console.log('row:', JSON.stringify(clicked));
  if (clicked && clicked.x) await page.mouse.click(clicked.x, clicked.y);
  await sleep(4000);
  const after = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /jalape.o peppers/i.test((e.innerText || '').trim()));
    if (!leaf) return { err: 'no-p' };
    let p = leaf, card = null;
    for (let i = 0; i < 8 && p; i++) { p = p.parentElement; if (p && p.innerText && /jalape.o/i.test(p.innerText) && p.querySelectorAll('button').length >= 1) { card = p; break; } }
    if (!card) return { err: 'no-card-btn' };
    return { text: card.innerText.replace(/\s+/g, ' ').trim().slice(0, 400),
             btns: [...card.querySelectorAll('button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' | aria=' + (b.getAttribute('aria-label') || '') + ' | pressed=' + b.getAttribute('aria-pressed')) };
  });
  fs.writeFileSync(OUT + '/jal-after.json', JSON.stringify(after, null, 1));
  console.log(JSON.stringify(after, null, 1).slice(0, 2500));
  const total = await page.evaluate(() => (document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/) || ['nf'])[0].replace(/\s+/g, ' '));
  console.log('TOTAL:', total);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
