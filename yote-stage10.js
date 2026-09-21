// Stage 10: dump all product card names on menu page to find Philly.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out10');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.goto(CFG.SITE_URL + '/order/menu/pizza', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  // scroll to bottom to lazy-load everything
  for (let i = 0; i < 15; i++) { await page.evaluate(() => window.scrollBy(0, 1200)); await page.waitForTimeout(900); }
  const names = await page.evaluate(() => {
    const P = window.__PJCFG;
    const out = [];
    // headings that look like product names (h2/h3/h4 with price nearby)
    document.querySelectorAll('h1,h2,h3,h4').forEach(h => {
      const t = h.innerText.trim().replace(/\s+/g, ' ');
      if (t && t.length < 80) out.push(t);
    });
    return [...new Set(out)];
  });
  fs.writeFileSync(OUT + '/headings.txt', names.join('\n'));
  console.log('HEADINGS:\n' + names.join('\n'));
  const philly = await page.evaluate(() => {
    const P = window.__PJCFG;
    const all = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && /philly/i.test(e.innerText || ''));
    return all.slice(0, 8).map(e => e.tagName + '|' + (e.innerText || '').trim().slice(0, 80));
  });
  console.log('PHILLY NODES:', JSON.stringify(philly, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
