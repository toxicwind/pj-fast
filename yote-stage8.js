// Stage 8: enumerate topping-catalog procedures + open Philly customize to capture topping XHR.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out8');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE,
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 170));
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try {
        const t = await r.text();
        const proc = u.split('/api/trpc/')[1].split('?')[0];
        if (/topping|modification/i.test(proc)) {
          fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
          console.log('[RESP saved]', proc, t.length);
        }
      } catch (e) {}
    }
  });

  await page.goto(CFG.SITE_URL + '/order/menu/pizza', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // enumerate candidate topping procedures
  const cands = [
    'productModification.getToppings', 'productModification.getToppingGroups',
    'productModification.getModifications', 'menuCategory.getToppings',
    'topping.getByStore', 'toppings.getByStore',
  ];
  for (const proc of cands) {
    try {
      const res = await page.evaluate(async (p) => {
    const P = window.__PJCFG;
        const u = '' + P.SITE_URL + '/api/trpc/' + p + '?input=' + encodeURIComponent(JSON.stringify({ json: { storeId: P.STORE_ID } }));
        const r = await fetch(u, { credentials: 'include' });
        return { status: r.status, text: (await r.text()).slice(0, 300) };
      }, proc);
      console.log('[ENUM]', proc, res.status, res.text.slice(0, 120));
      if (res.status === 200) {
        const full = await page.evaluate(async (p) => {
    const P = window.__PJCFG;
          const u = '' + P.SITE_URL + '/api/trpc/' + p + '?input=' + encodeURIComponent(JSON.stringify({ json: { storeId: P.STORE_ID } }));
          return await (await fetch(u, { credentials: 'include' })).text();
        }, proc);
        fs.writeFileSync(OUT + '/enum-' + proc.replace(/\./g, '_') + '.json', full);
      }
    } catch (e) { console.log('[ENUM FAIL]', proc, e.message); }
  }

  // open Philly customize to capture topping XHR
  const found = await page.evaluate(() => {
    const P = window.__PJCFG;
    const els = [...document.querySelectorAll('a,button')];
    const t = els.find(e => /philly cheesesteak/i.test(e.innerText) && /custom/i.test(e.innerText));
    if (t) { t.scrollIntoView(); t.click(); return 'customize-clicked'; }
    const p = els.find(e => /^philly cheesesteak pizza$/i.test(e.innerText.trim()));
    if (p) { p.scrollIntoView(); p.click(); return 'product-clicked'; }
    return document.body.innerText.slice(0, 200);
  });
  console.log('philly ui:', found);
  await page.waitForTimeout(8000);
  await page.screenshot({ path: OUT + '/customize.png' });
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  fs.writeFileSync(OUT + '/customize-body.txt', body);
  console.log('BODY:', body.slice(0, 1200));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
