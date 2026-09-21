// Stage 19: try toggling onions off via its Normal button; check WHAT'S ON IT + price.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out19');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out18/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 150)); });
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  const whatsOn = () => page.evaluate(() => {
    const P = window.__PJCFG;
    const m = document.body.innerText.match(/WHAT'S ON IT([\s\S]{0,400})/);
    return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 300) : 'nf';
  });
  console.log('BEFORE:', await whatsOn());
  // click the pressed Normal button for onions (toggle off attempt)
  const res = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /^onions$/i.test((e.innerText || '').trim()));
    if (!leaf) return 'no-leaf';
    let p = leaf, card = null;
    for (let i = 0; i < 8 && p; i++) { p = p.parentElement; if (p && /onions/i.test(p.innerText || '') && p.querySelectorAll('button').length >= 2) { card = p; break; } }
    if (!card) return 'no-card';
    const normal = [...card.querySelectorAll('button')].find(b => /^normal$/i.test((b.innerText || '').trim()));
    if (!normal) return 'no-normal-btn';
    normal.scrollIntoView({ block: 'center' });
    normal.click();
    return 'clicked-normal pressed-before=' + normal.getAttribute('aria-pressed');
  });
  console.log('toggle:', res);
  await sleep(3500);
  console.log('AFTER:', await whatsOn());
  const total = await page.evaluate(() => (document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/) || ['nf'])[0].replace(/\s+/g, ' '));
  console.log('TOTAL:', total);
  // check onion card state now
  const state2 = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /^onions$/i.test((e.innerText || '').trim()));
    let p = leaf, card = null;
    for (let i = 0; i < 8 && p; i++) { p = p.parentElement; if (p && /onions/i.test(p.innerText || '') && p.querySelectorAll('button').length >= 2) { card = p; break; } }
    return card ? card.innerText.replace(/\s+/g, ' ').trim().slice(0, 120) : 'no-card';
  });
  console.log('ONION STATE:', state2);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
