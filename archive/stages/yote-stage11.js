// Stage 11: click Philly card via H4 ancestor, capture builder/topping XHR.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out11');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) console.log('[TRPC]', r.method(), decodeURIComponent(u).slice(0, 180)); });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try {
        const t = await r.text();
        const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
        console.log('[RESP saved]', proc, t.length);
      } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/menu/pizza', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const P = window.__PJCFG;
    const h4 = [...document.querySelectorAll('h4')].find(h => /philly cheesesteak pizza/i.test(h.innerText));
    if (!h4) return 'no-h4';
    h4.scrollIntoView({ block: 'center' });
    // climb to clickable card
    let el = h4;
    for (let i = 0; i < 6; i++) {
      el = el.parentElement;
      if (!el) break;
      if (/^(A|BUTTON)$/.test(el.tagName) || el.getAttribute('role') === 'button' || el.onclick) {
        return { tag: el.tagName, href: el.href || null, text: el.innerText.slice(0, 100).replace(/\s+/g, ' ') };
      }
    }
    // fallback: click h4 itself
    h4.click();
    return 'clicked-h4-directly';
  });
  console.log('card info:', JSON.stringify(info));
  await page.waitForTimeout(3000);
  if (info && info.tag) {
    await page.evaluate(() => {
    const P = window.__PJCFG;
      const h4 = [...document.querySelectorAll('h4')].find(h => /philly cheesesteak pizza/i.test(h.innerText));
      let el = h4;
      for (let i = 0; i < 6; i++) { el = el.parentElement; if (/^(A|BUTTON)$/.test(el.tagName) || el.getAttribute('role') === 'button') break; }
      el.click();
    });
    await page.waitForTimeout(8000);
  }
  console.log('URL now:', page.url());
  await page.screenshot({ path: OUT + '/builder.png' });
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
  fs.writeFileSync(OUT + '/builder-body.txt', body);
  console.log('BODY:', body.slice(0, 1600));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
