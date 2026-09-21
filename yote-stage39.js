// Stage 39: capture real cart.addToCart POST body from menu page.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out39');
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: CFG.CHROMIUM_PATH, headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ storageState: CFG.storage('out38/storage.json'),
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  let captured = null;
  page.on('request', r => {
    if (r.url().includes('cart.addToCart') && r.method() === 'POST' && !r.url().includes('WithDeal')) {
      captured = r.postData();
    }
  });
  await page.goto(CFG.SITE_URL + '/order/menu?storeId=' + CFG.STORE_ID, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(12000);
  // find garlic knots card and its add button
  const card = page.locator('text=Garlic Knots').first();
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(2000);
  // click the add button near it
  const addBtn = page.getByRole('button', { name: /add/i }).first();
  console.log('add buttons:', await page.getByRole('button', { name: /add/i }).count());
  if (await addBtn.count() > 0) { await addBtn.click({ timeout: 10000 }).catch(e => console.log('click err', e.message)); }
  await sleep(8000);
  if (captured) {
    fs.writeFileSync(OUT + '/addtocart-body.json', captured);
    const j = JSON.parse(captured).json;
    console.log('BODY KEYS:', Object.keys(j).join(', '));
    const prod = j.product || j;
    console.log('PRODUCT KEYS:', Object.keys(prod).join(', '));
    console.log(captured.slice(0, 1200));
  } else console.log('NOT CAPTURED');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
