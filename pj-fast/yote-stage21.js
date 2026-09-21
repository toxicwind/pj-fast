// Stage 21: drive BOGO dealbuilder step 1 - select Philly, capture what happens.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out21');
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
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), u.split('/api/trpc/')[1].split('?')[0]); });
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  let body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000));
  console.log('STEP1 BODY:', body.slice(0, 2500));
  // click Philly Cheesesteak option
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /philly cheesesteak/i.test((e.innerText || '').trim()));
    for (const e of els) {
      let p = e;
      for (let i = 0; i < 6 && p; i++) { p = p.parentElement; if (p && (p.tagName === 'BUTTON' || p.getAttribute('role') === 'button' || /cursor-pointer/.test(p.className))) { p.click(); return 'clicked ' + p.tagName + ' via ' + e.tagName; } }
    }
    return 'not-found count=' + els.length;
  });
  console.log('click:', clicked);
  await sleep(8000);
  console.log('URL now:', page.url());
  body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
  fs.writeFileSync(OUT + '/after-philly.txt', body);
  console.log('AFTER:', body.slice(0, 1800));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
