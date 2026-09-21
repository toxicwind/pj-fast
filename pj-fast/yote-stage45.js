// Stage 45: click a side's Add button on menu, capture exact POST.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out45');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out44/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  let captured = null;
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.method() === 'POST') {
      const name = u.split('/api/trpc/')[1].split('?')[0];
      if (/cart|product/i.test(name)) { captured = { proc: name, body: r.postData() }; console.log('POST', name); }
    }
  });
  await page.goto(CFG.SITE_URL + '/order/menu?storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(15000);
  // scroll to find Garlic Knots text
  const t = page.getByText('Garlic Knots', { exact: false });
  console.log('knots text count:', await t.count());
  if (await t.count() > 0) {
    await t.first().scrollIntoViewIfNeeded();
    await sleep(2000);
    // find add button within the same card
    const card = t.first().locator('xpath=ancestor::*[self::div or self::article or self::li][.//button][1]');
    const btn = card.getByRole('button', { name: /add|customize/i }).first();
    console.log('btn count:', await btn.count());
    if (await btn.count() > 0) { await btn.click({ timeout: 8000 }).catch(e => console.log('click:', e.message)); }
    await sleep(8000);
  }
  if (captured) { fs.writeFileSync(OUT + '/side-add.json', JSON.stringify(captured, null, 1)); console.log('CAPTURED', captured.proc, (captured.body || '').slice(0, 800)); }
  else console.log('NOTHING CAPTURED');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
