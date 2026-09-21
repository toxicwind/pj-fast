// Stage 9: scroll menu, open Philly Cheesesteak product, capture builder XHR.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out9');
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
  const seen = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) { seen.push(r.method() + ' ' + decodeURIComponent(u).slice(0, 200)); console.log('[TRPC]', decodeURIComponent(u).slice(0, 160)); }
  });
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

  // scroll through the page looking for Philly card
  let clicked = null;
  for (let i = 0; i < 12 && !clicked; i++) {
    clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
      const els = [...document.querySelectorAll('a,button,[role="button"]')];
      // find card containing Philly Cheesesteak Pizza text
      const cards = els.filter(e => /philly cheesesteak/i.test(e.innerText) && /pizza/i.test(e.innerText));
      if (cards.length) {
        // prefer one that looks like a product card (has image or price nearby)
        const c = cards.find(e => /\$/.test(e.innerText)) || cards[0];
        c.scrollIntoView({ block: 'center' });
        return c.tagName + '|' + c.innerText.trim().slice(0, 120).replace(/\s+/g, ' ');
      }
      window.scrollBy(0, 900);
      return null;
    });
    if (!clicked) await page.waitForTimeout(1200);
  }
  console.log('found card:', clicked);
  if (clicked) {
    await page.evaluate(() => {
    const P = window.__PJCFG;
      const els = [...document.querySelectorAll('a,button,[role="button"]')];
      const cards = els.filter(e => /philly cheesesteak/i.test(e.innerText) && /pizza/i.test(e.innerText));
      const c = cards.find(e => /\$/.test(e.innerText)) || cards[0];
      if (c) c.click();
    });
    await page.waitForTimeout(8000);
    console.log('URL now:', page.url());
    await page.screenshot({ path: OUT + '/philly.png' });
    const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
    fs.writeFileSync(OUT + '/philly-body.txt', body);
    console.log('BODY:', body.slice(0, 1500));
    // dump links with builder in href
    const links = await page.evaluate(() => [...document.querySelectorAll('a')].map(a => a.href).filter(h => /builder|custom/i.test(h)).slice(0, 10));
    console.log('builder links:', JSON.stringify(links));
  }
  fs.writeFileSync(OUT + '/trpc.log', seen.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
