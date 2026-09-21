// Stage 7: deals page XHR capture + full getAvailableOptionBySku, reuse store session.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out7');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    storageState: CFG.storage('out6/storage.json'),
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
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
        console.log('[RESP saved]', proc, t.length);
      } catch (e) {}
    }
  });

  await page.goto(CFG.SITE_URL + '/order/menu/pizza', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // full available options (customizations: onion removal, jalapeno upcharge)
  try {
    const t = await page.evaluate(async () => {
    const P = window.__PJCFG;
      const r = await fetch('' + P.SITE_URL + '/api/trpc/menuCategory.getAvailableOptionBySku?input=' + encodeURIComponent(JSON.stringify({ json: { storeId: P.STORE_ID } })), { credentials: 'include' });
      return await r.text();
    });
    fs.writeFileSync(OUT + '/options-full.json', t);
    console.log('[OPTIONS FULL]', t.length);
  } catch (e) { console.log('[OPTIONS FAIL]', e.message); }

  // deals page
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const d = [...document.querySelectorAll('a,button')].find(e => /^deals$/i.test(e.innerText.trim()));
    if (d) { d.click(); return true; }
    return false;
  });
  console.log('deals clicked:', clicked);
  if (!clicked) await page.goto(CFG.SITE_URL + '/deals', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(8000);
  console.log('URL:', page.url());
  await page.screenshot({ path: OUT + '/deals.png' });
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 4000));
  fs.writeFileSync(OUT + '/deals-body.txt', body);
  console.log('DEALS BODY:', body.slice(0, 1500));

  await ctx.storageState({ path: OUT + '/storage.json' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
