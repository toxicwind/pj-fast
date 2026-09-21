// Stage 25: deep DOM dump of dealbuilder step1 - headings, links, cards.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out25');
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
  await page.goto(CFG.SITE_URL + '/order/specials/' + CFG.DEAL_BOGO + '/build-my-deal?storeId=' + CFG.STORE_ID + '&step=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  const dump = await page.evaluate(() => {
    const P = window.__PJCFG;
    const heads = [...document.querySelectorAll('h1,h2,h3,h4')].map(h => h.innerText.replace(/\s+/g, ' ').trim().slice(0, 80));
    const links = [...document.querySelectorAll('a[href]')].map(a => (a.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) + ' -> ' + a.href.slice(0, 100)).filter(s => !s.startsWith(' ->'));
    const clickable = [...document.querySelectorAll('[role="button"], [data-testid]')].map(e => e.tagName + '.' + (e.getAttribute('data-testid') || '') + ' "' + (e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40) + '"');
    // main content area text (exclude header/footer)
    const main = document.querySelector('main');
    return { heads, links: links.slice(0, 40), clickable: clickable.slice(0, 40),
             mainText: main ? main.innerText.replace(/\s+/g, ' ').slice(0, 3000) : 'no-main' };
  });
  fs.writeFileSync(OUT + '/step1-dom.json', JSON.stringify(dump, null, 1));
  console.log(JSON.stringify(dump, null, 1).slice(0, 4000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
