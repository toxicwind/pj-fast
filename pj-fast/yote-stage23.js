// Stage 23: from deals page, click BOGO deal CTA, follow the real flow.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out23');
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
  await page.goto(CFG.SITE_URL + '/order/deals', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  // find BOGO card and its button
  const info = await page.evaluate(() => {
    const P = window.__PJCFG;
    const cards = [...document.querySelectorAll('*')].filter(e => /buy one, get one free large pizza/i.test((e.innerText || '').trim()) && e.children.length < 40);
    const out = [];
    for (const c of cards.slice(0, 3)) {
      let p = c;
      for (let i = 0; i < 10 && p; i++) { p = p.parentElement; if (p && p.querySelector('button')) break; }
      const btns = p ? [...p.querySelectorAll('button')].map(b => (b.innerText || '').trim().slice(0, 30)) : [];
      out.push({ tag: c.tagName, kids: c.children.length, btns });
    }
    return out;
  });
  console.log('BOGO cards:', JSON.stringify(info).slice(0, 1200));
  // click the first button in the BOGO card
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const all = [...document.querySelectorAll('*')].filter(e => /buy one, get one free large pizza/i.test((e.innerText || '').trim()));
    for (const c of all) {
      let p = c;
      for (let i = 0; i < 10 && p; i++) { p = p.parentElement; if (p && p.querySelector('button')) { const b = p.querySelector('button'); b.scrollIntoView({ block: 'center' }); b.click(); return 'clicked: ' + (b.innerText || '').trim().slice(0, 30); } }
    }
    return 'none';
  });
  console.log('click:', clicked);
  await sleep(9000);
  console.log('URL:', page.url());
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  fs.writeFileSync(OUT + '/after-bogo-click.txt', body);
  console.log('BODY:', body.slice(0, 1500));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
