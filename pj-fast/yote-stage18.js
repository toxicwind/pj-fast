// Stage 18: inspect onion card controls, remove onions, add jalapeno, add to cart, read cart.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out18');
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
  const trpc = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) { trpc.push(r.method() + ' ' + decodeURIComponent(u).slice(0, 220)); console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 150)); } });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try { const t = await r.text(); const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
        console.log('[RESP saved]', proc, t.length); } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/builder/pizza?section=handcrafted_specialties&productGroup=philly-cheesesteak&sku=' + CFG.SKU_PHILLY_LARGE + '&storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);

  // dump onion card: all buttons
  const onionCard = await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /^onions$/i.test((e.innerText || '').trim()));
    if (!leaf) return { err: 'no-leaf' };
    let p = leaf, card = null;
    for (let i = 0; i < 8 && p; i++) { p = p.parentElement; if (p && /onions/i.test(p.innerText || '') && p.querySelectorAll('button').length >= 2) { card = p; break; } }
    if (!card) return { err: 'no-card' };
    return { text: card.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
      btns: [...card.querySelectorAll('button')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30) + '|aria=' + (b.getAttribute('aria-label') || '') + '|pressed=' + b.getAttribute('aria-pressed')) };
  });
  console.log('ONION CARD:', JSON.stringify(onionCard, null, 1).slice(0, 2000));

  // add jalapeno: click its row, then Normal
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const leaf = [...document.querySelectorAll('p')].find(e => /jalape.o peppers/i.test((e.innerText || '').trim()));
    if (leaf) { let row = leaf.parentElement; for (let i = 0; i < 4 && row; i++) { const r = row.getBoundingClientRect(); if (r.height > 40) break; row = row.parentElement; } row.scrollIntoView({ block: 'center' }); row.click(); }
  });
  await sleep(3000);

  // try removing onions: click its Normal button again (toggle off?) - first record state
  const total1 = await page.evaluate(() => (document.body.innerText.match(/PHILLY CHEESESTEAK PIZZA\s*\$[\d.]+/) || ['nf'])[0].replace(/\s+/g, ' '));
  console.log('TOTAL after jal:', total1);

  // click Add to Order
  const addBtn = await page.evaluate(() => {
    const P = window.__PJCFG;
    const b = [...document.querySelectorAll('button')].find(x => /^add to order$/i.test(x.innerText.trim()));
    if (b) { b.scrollIntoView({ block: 'center' }); b.click(); return true; }
    return false;
  });
  console.log('add clicked:', addBtn);
  await sleep(8000);
  console.log('URL:', page.url());
  const cartState = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  fs.writeFileSync(OUT + '/cart-state.txt', cartState);
  console.log('CART:', cartState.slice(0, 1500));
  fs.writeFileSync(OUT + '/trpc.log', trpc.join('\n'));
  await ctx.storageState({ path: OUT + '/storage.json' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
