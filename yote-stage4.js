// Stage 4: switch to CARRYOUT, search stores by ZIP 80234, select closest,
// capture store-search tRPC + storeId. Then pull menu JSON via tRPC.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out4');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE,
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  const trpc = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) { trpc.push(r.method() + ' ' + u.slice(0, 600)); console.log('[TRPC]', decodeURIComponent(u).slice(0, 220)); }
  });
  // capture JSON responses for trpc
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try {
        const j = await r.json();
        const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', JSON.stringify(j).slice(0, 200000));
        console.log('[RESP saved]', proc);
      } catch (e) {}
    }
  });

  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const b = [...document.querySelectorAll('button')].find(x => /accept|agree/i.test(x.innerText));
    if (b) b.click();
  });
  await page.waitForTimeout(1500);

  // open location modal
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const c = [...document.querySelectorAll('a,button')].find(e => /start your order/i.test(e.innerText));
    if (c) { c.scrollIntoView(); c.click(); }
  });
  await page.waitForTimeout(5000);

  // click CARRYOUT tab
  const tab = await page.evaluate(() => {
    const P = window.__PJCFG;
    const t = [...document.querySelectorAll('a,button,[role="tab"]')].find(e => /^carryout$/i.test(e.innerText.trim()));
    if (t) { t.click(); return 'clicked carryout'; }
    return 'carryout tab not found';
  });
  console.log('tab:', tab);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: OUT + '/carryout.png' });
  const body1 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200));
  console.log('CARRYOUT BODY:', body1);

  // type zip
  const inpInfo = await page.evaluate(() => {
    const P = window.__PJCFG;
    const inp = [...document.querySelectorAll('input')].find(i => /zip|postal|location|search/i.test(i.placeholder + i.name + i.id + i.getAttribute('aria-label'))) || [...document.querySelectorAll('input')].find(i => i.type === 'text');
    if (inp) { inp.focus(); inp.select && inp.select(); return 'ok:' + (inp.placeholder || inp.name || inp.id); }
    return 'none';
  });
  console.log('input:', inpInfo);
  await page.keyboard.type(CFG.ZIP, { delay: 100 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: OUT + '/zip-results.png' });
  const body2 = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  console.log('AFTER ZIP:', body2);

  fs.writeFileSync(OUT + '/trpc.log', trpc.join('\n'));
  console.log('trpc count:', trpc.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
