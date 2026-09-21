// Stage 5: carryout zip search with Enter, capture store-search tRPC,
// list stores, select closest, save all tRPC responses.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out5');
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
    if (u.includes('/api/trpc/')) { trpc.push(r.method() + ' ' + decodeURIComponent(u).slice(0, 500)); console.log('[TRPC]', decodeURIComponent(u).slice(0, 200)); }
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try {
        const j = await r.json();
        const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', JSON.stringify(j).slice(0, 300000));
        console.log('[RESP saved]', proc, JSON.stringify(j).length);
      } catch (e) {}
    }
  });

  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const b = [...document.querySelectorAll('button')].find(x => /accept|agree/i.test(x.innerText));
    if (b) b.click();
    const c = [...document.querySelectorAll('a,button')].find(e => /start your order/i.test(e.innerText));
    if (c) { c.scrollIntoView(); c.click(); }
  });
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const t = [...document.querySelectorAll('a,button,[role="tab"]')].find(e => /^carryout$/i.test(e.innerText.trim()));
    if (t) t.click();
  });
  await page.waitForTimeout(3000);

  // fill zip and press Enter
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const inp = [...document.querySelectorAll('input')].find(i => /zip/i.test(i.placeholder + i.name + i.id));
    if (inp) { inp.focus(); inp.value = ''; }
  });
  await page.keyboard.type(CFG.ZIP, { delay: 80 });
  await page.waitForTimeout(1500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: OUT + '/stores.png' });
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
  console.log('STORES BODY:', body);

  // find store select buttons
  const stores = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => /select|choose|order from/i.test(e.innerText)).map(e => e.innerText.trim().slice(0, 80)));
  console.log('store buttons:', JSON.stringify(stores.slice(0, 10)));

  fs.writeFileSync(OUT + '/trpc.log', trpc.join('\n'));
  console.log('trpc count:', trpc.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
