// Stage 12: real mouse click on Philly card center; dump post-click DOM + XHR.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out12');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out7/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  const trpc = [];
  page.on('request', r => { const u = r.url(); if (u.includes('/api/trpc/')) { trpc.push(r.method() + ' ' + decodeURIComponent(u).slice(0, 200)); console.log('[TRPC]', decodeURIComponent(u).slice(0, 160)); } });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try { const t = await r.text(); const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
        console.log('[RESP saved]', proc, t.length); } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/menu/pizza', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  const box = await page.evaluate(() => {
    const P = window.__PJCFG;
    const h4 = [...document.querySelectorAll('h4')].find(h => /philly cheesesteak pizza/i.test(h.innerText));
    if (!h4) return null;
    h4.scrollIntoView({ block: 'center' });
    const r = h4.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  console.log('click at:', JSON.stringify(box));
  if (box) { await page.mouse.click(box.x, box.y); }
  await page.waitForTimeout(9000);
  console.log('URL now:', page.url());
  const state = await page.evaluate(() => ({
    url: location.href,
    modals: document.querySelectorAll('[role="dialog"]').length,
    bodyStart: document.body.innerText.replace(/\s+/g, ' ').slice(0, 2000),
  }));
  fs.writeFileSync(OUT + '/state.json', JSON.stringify(state, null, 1));
  console.log('MODALS:', state.modals);
  console.log('BODY:', state.bodyStart.slice(0, 1400));
  fs.writeFileSync(OUT + '/trpc.log', trpc.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
