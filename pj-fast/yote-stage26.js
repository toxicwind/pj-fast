// Stage 26: click step-1 header accordion, see if options expand.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out26');
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
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), u.split('/api/trpc/')[1].split('?')[0]); });
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  const res = await page.evaluate(() => {
    const P = window.__PJCFG;
    // find element containing "1 Select your pizza" and click its closest interactive ancestor
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length <= 3 && /1\s*select your pizza/i.test((e.innerText || '').trim()));
    const out = [];
    for (const e of els.slice(0, 4)) {
      let p = e;
      for (let i = 0; i < 8 && p && p.tagName !== 'BODY'; i++) {
        const cs = getComputedStyle(p);
        if (p.tagName === 'BUTTON' || p.getAttribute('role') === 'button' || cs.cursor === 'pointer') { p.click(); out.push('clicked ' + p.tagName + ' cursor=' + cs.cursor); break; }
        p = p.parentElement;
      }
      if (out.length === 0) out.push('no-clickable-ancestor for ' + e.tagName);
    }
    return out;
  });
  console.log('clicks:', JSON.stringify(res));
  await sleep(8000);
  const main = await page.evaluate(() => {
    const P = window.__PJCFG; const m = document.querySelector('main'); return m ? m.innerText.replace(/\s+/g, ' ').slice(0, 2500) : 'no-main'; });
  fs.writeFileSync(OUT + '/after-expand.txt', main);
  console.log('MAIN:', main.slice(0, 1800));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
