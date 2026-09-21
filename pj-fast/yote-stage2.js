// Stage 2: harvest tRPC procedure names from the site's JS bundles + trigger
// menu/deals page loads to capture live tRPC calls. Recon only.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');

const OUT = CFG.outDir('out2');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H }, locale: CFG.LOCALE, timezoneId: CFG.TIMEZONE,
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  const trpcCalls = new Set();
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/api/trpc/')) { trpcCalls.add(r.method() + ' ' + u.split('?')[0] + ' :: ' + u.slice(0, 400)); console.log('[TRPC]', u.slice(0, 220)); }
  });

  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // collect script urls
  const scripts = await page.evaluate(() => [...document.querySelectorAll('script[src]')].map(s => s.src));
  const own = scripts.filter(s => s.includes('papajohns.com'));
  console.log('script count:', scripts.length, 'own:', own.length);
  fs.writeFileSync(OUT + '/scripts.txt', own.join('\n'));

  // download own bundles via in-page request (passes bot checks)
  let corpus = '';
  for (const src of own.slice(0, 60)) {
    try {
      const resp = await page.request.get(src, { timeout: 30000 });
      if (resp.ok()) {
        const txt = await resp.text();
        corpus += '\n' + txt;
        console.log('got', src.split('/').pop(), txt.length);
      }
    } catch (e) { console.log('dl err', src.split('/').pop(), e.message.slice(0, 80)); }
  }
  fs.writeFileSync(OUT + '/corpus.js', corpus);
  console.log('corpus bytes:', corpus.length);

  // mine for procedure names
  const procs = new Set();
  const re1 = /["'`]([a-z][a-zA-Z0-9]*\.(?:get|set|create|update|delete|search|list|find|validate|apply|check|fetch)[a-zA-Z0-9]*)["'`]/g;
  let m;
  while ((m = re1.exec(corpus))) procs.add(m[1]);
  const re2 = /trpc\/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g;
  while ((m = re2.exec(corpus))) procs.add(m[1] + '.' + m[2]);
  // look for router-ish keys near keywords
  const kw = ['coupon', 'promo', 'deal', 'store', 'menu', 'cart', 'order', 'offer', 'discount', 'location'];
  const nearHits = [];
  for (const k of kw) {
    const re = new RegExp(`["'\`][a-zA-Z0-9_]*${k}[a-zA-Z0-9_]*\\.["'\`]?[a-zA-Z0-9_]+`, 'gi');
    let mm; let c = 0;
    while ((mm = re.exec(corpus)) && c++ < 40) nearHits.push(mm[0]);
  }
  fs.writeFileSync(OUT + '/procs.txt', [...procs].sort().join('\n'));
  fs.writeFileSync(OUT + '/nearhits.txt', [...new Set(nearHits)].sort().join('\n'));
  console.log('procs found:', procs.size);

  // Now navigate to menu + deals pages to trigger live tRPC calls
  for (const path of ['/order/menu/pizza', '/order/specials']) {
    try {
      console.log('== goto', path);
      await page.goto(CFG.SITE_URL + '' + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(7000);
      console.log('title:', await page.title());
    } catch (e) { console.log('nav err', path, e.message.slice(0, 100)); }
  }
  fs.writeFileSync(OUT + '/trpc-calls.log', [...trpcCalls].join('\n'));
  console.log('live trpc calls:', trpcCalls.size);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
