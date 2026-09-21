// Stage 13: reopen Philly builder, dump topping rows with prices from DOM.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out13');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 150)); });
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(9000);
  console.log('URL:', page.url());
  // scroll veggies into view
  const rows = await page.evaluate(() => {
    const P = window.__PJCFG;
    const out = [];
    // find VEGGIES heading then collect following topping rows
    const els = [...document.querySelectorAll('*')];
    const vh = els.find(e => e.children.length <= 1 && /^veggies$/i.test((e.innerText || '').trim()));
    if (!vh) return ['no-veggies-heading'];
    vh.scrollIntoView({ block: 'start' });
    let el = vh;
    for (let i = 0; i < 40 && el; i++) {
      el = el.nextElementSibling;
      if (!el) break;
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (t && t.length < 300) out.push(el.tagName + ': ' + t.slice(0, 160));
      if (/^(cheeses|sauces|meats)$/i.test(t)) break;
    }
    return out;
  });
  fs.writeFileSync(OUT + '/veggie-rows.txt', rows.join('\n'));
  console.log('ROWS:\n' + rows.join('\n'));
  // also grab any element containing jalapeno with its full row text
  const jal = await page.evaluate(() => {
    const P = window.__PJCFG;
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /jalape/i.test(e.innerText || ''));
    return els.slice(0, 4).map(e => {
      let p = e.parentElement, txt = '';
      for (let i = 0; i < 4 && p; i++) { txt = (p.innerText || '').replace(/\s+/g, ' ').trim(); if (/\$/.test(txt)) break; p = p.parentElement; }
      return txt.slice(0, 200);
    });
  });
  console.log('JAL ROWS:', JSON.stringify(jal, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
