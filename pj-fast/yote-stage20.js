// Stage 20: explore BOGO dealbuilder flow, capture POST bodies.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out20');
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
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) {
      let post = '';
      try { post = r.postData() || ''; } catch (e) {}
      fs.appendFileSync(OUT + '/posts.log', r.method() + ' ' + u.split('/api/trpc/')[1].split('?')[0] + (post ? ' BODY=' + post.slice(0, 3000) : '') + '\n');
      console.log('[TRPC]', r.method(), u.split('/api/trpc/')[1].split('?')[0]);
    }
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try { const t = await r.text(); const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '.json', t);
        console.log('[RESP]', proc, t.length); } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/dealbuilder?dealId=' + CFG.DEAL_BOGO + '&offerCode=' + CFG.PROMO_BOGO4U, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(10000);
  console.log('URL:', page.url());
  const body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 3000));
  fs.writeFileSync(OUT + '/dealbuilder-body.txt', body);
  console.log('BODY:', body.slice(0, 2000));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
