// Stage 14: toggle Jalapeño add + Onions remove in builder, read live price.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out14');
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
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 150)); });
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  const price0 = await page.evaluate(() => {
    const P = window.__PJCFG;
    const m = document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/);
    return m ? m[0] : 'not-found';
  });
  console.log('BASE PRICE:', price0);

  // click Jalapeño Peppers row (add topping)
  const jalClicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /jalape.o peppers/i.test(e.innerText || ''));
    if (!els.length) return 'not-found';
    let p = els[0];
    for (let i = 0; i < 5 && p; i++) { if (/^(BUTTON|A)$/.test(p.tagName)) break; p = p.parentElement; }
    if (p) { p.scrollIntoView({ block: 'center' }); p.click(); return 'clicked:' + p.tagName; }
    return 'no-clickable';
  });
  console.log('jal:', jalClicked);
  await sleep(4000);
  const price1 = await page.evaluate(() => {
    const P = window.__PJCFG;
    const m = document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/);
    // also look for any topping price hint near jalapeno
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /jalape.o/i.test(e.innerText || ''));
    const ctx = els.slice(0, 2).map(e => { let p = e.parentElement, t = ''; for (let i = 0; i < 4 && p; i++) { t = (p.innerText || '').replace(/\s+/g, ' ').trim(); if (/\$/.test(t)) break; p = p.parentElement; } return t.slice(0, 160); });
    return { total: m ? m[0] : 'nf', ctx };
  });
  console.log('AFTER JAL:', JSON.stringify(price1));

  // remove onions: click Onions row then choose None/Remove
  const onionRes = await page.evaluate(() => {
    const P = window.__PJCFG;
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /^onions?$/i.test((e.innerText || '').trim()));
    if (!els.length) return 'not-found';
    let p = els[0];
    for (let i = 0; i < 5 && p; i++) { if (/^(BUTTON|A)$/.test(p.tagName)) break; p = p.parentElement; }
    if (p) { p.scrollIntoView({ block: 'center' }); p.click(); return 'clicked:' + p.tagName; }
    return 'no-clickable';
  });
  console.log('onion:', onionRes);
  await sleep(4000);
  const afterOnionClick = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3500));
  fs.writeFileSync(OUT + '/after-onion.txt', afterOnionClick);
  // look for portion selector (No/Light/Normal/Extra)
  const portion = await page.evaluate(() => {
    const P = window.__PJCFG;
    const opts = [...document.querySelectorAll('button')].filter(b => /^(no|none|light|normal|extra)$/i.test(b.innerText.trim())).map(b => b.innerText.trim());
    return opts.slice(0, 10);
  });
  console.log('portion opts:', JSON.stringify(portion));
  if (portion.length) {
    await page.evaluate(() => {
    const P = window.__PJCFG;
      const b = [...document.querySelectorAll('button')].find(b => /^(no|none)$/i.test(b.innerText.trim()));
      if (b) b.click();
    });
    await sleep(3000);
  }
  const priceFinal = await page.evaluate(() => {
    const P = window.__PJCFG;
    const m = document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/);
    return m ? m[0] : 'nf';
  });
  console.log('FINAL PRICE:', priceFinal);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
