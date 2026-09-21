// Stage 6: select closest carryout store (2683 E 120TH AVE, store 1054),
// capture store-specific menu/deals tRPC, preserve session storage state.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out6');
fs.mkdirSync(OUT, { recursive: true });
const STORE_ID = CFG.STORE_ID;

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
  const reqLog = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) {
      let post = '';
      try { post = r.postData() || ''; } catch (e) {}
      const line = r.method() + ' ' + decodeURIComponent(u).slice(0, 400) + (post ? ' POSTDATA=' + post.slice(0, 800) : '');
      reqLog.push(line);
      console.log('[TRPC]', decodeURIComponent(u).slice(0, 160));
    }
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && r.status() === 200) {
      try {
        const j = await r.json();
        const proc = u.split('/api/trpc/')[1].split('?')[0];
        const q = u.includes('?') ? u.split('?')[1].slice(0, 60).replace(/[^a-zA-Z0-9]+/g, '_') : 'noparam';
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '-' + q.slice(0, 40) + '.json', JSON.stringify(j).slice(0, 500000));
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
  await page.evaluate(() => {
    const P = window.__PJCFG;
    const inp = [...document.querySelectorAll('input')].find(i => /zip/i.test(i.placeholder + i.name + i.id));
    if (inp) { inp.focus(); inp.value = ''; }
  });
  await page.keyboard.type(CFG.ZIP, { delay: 80 });
  await page.waitForTimeout(1200);
  await page.keyboard.press('Enter');
  // wait for store search response
  try {
    await page.waitForResponse(u => u.includes('/api/trpc/stores.searchStores') && u, { timeout: 20000 });
  } catch (e) { console.log('no searchStores response seen'); }
  await page.waitForTimeout(4000);

  // click the first store's SELECT STORE (closest = 2683 E 120TH AVE)
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const cards = [...document.querySelectorAll('a,button')].filter(e => /select store/i.test(e.innerText));
    const target = cards.find(e => /2683 E 120TH/i.test(e.closest('div,li,section') ? e.closest('div,li,section').innerText : '')) || cards[0];
    if (target) { target.scrollIntoView(); target.click(); return target.innerText.trim().slice(0, 40); }
    return null;
  });
  console.log('clicked store button:', clicked);
  await page.waitForTimeout(8000);
  console.log('URL after select:', page.url());
  await page.screenshot({ path: OUT + '/menu.png' });

  // Direct tRPC calls with store context via page fetch (shares cookies)
  const calls = [
    ['menuCategory.getByStore', { storeId: STORE_ID }],
    ['product.getByStore', { storeId: STORE_ID }],
    ['productModification.getCrusts', { storeId: STORE_ID }],
    ['createYourOwn.getCreateYourOwn', { storeId: STORE_ID }],
    ['home.getByStoreCold', null],
    ['home.getMenuCategoryListCold', null],
  ];
  for (const [proc, input] of calls) {
    try {
      const url = CFG.SITE_URL + '/api/trpc/' + proc + '?input=' + encodeURIComponent(JSON.stringify({ json: input, meta: { values: [input === null ? 'undefined' : 'undefined'] } }));
      const res = await page.evaluate(async (u) => {
    const P = window.__PJCFG;
        const r = await fetch(u, { credentials: 'include' });
        return { status: r.status, text: (await r.text()).slice(0, 500000) };
      }, url);
      fs.writeFileSync(OUT + '/direct-' + proc.replace(/\./g, '_') + '.json', JSON.stringify({ status: res.status, len: res.text.length, body: res.text.slice(0, 200000) }));
      console.log('[DIRECT]', proc, res.status, res.text.length);
    } catch (e) { console.log('[DIRECT FAIL]', proc, e.message); }
  }

  await ctx.storageState({ path: OUT + '/storage.json' });
  fs.writeFileSync(OUT + '/trpc-requests.log', reqLog.join('\n'));
  console.log('requests logged:', reqLog.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
