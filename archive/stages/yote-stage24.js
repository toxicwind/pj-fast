// Stage 24: open cart, apply promo BOGO4U, capture mutation + result.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');
const OUT = CFG.outDir('out24');
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
      let post = ''; try { post = r.postData() || ''; } catch (e) {}
      fs.appendFileSync(OUT + '/posts.log', r.method() + ' ' + u.split('/api/trpc/')[1].split('?')[0] + (post ? ' BODY=' + post.slice(0, 2500) : '') + '\n');
      console.log('[TRPC]', r.method(), u.split('/api/trpc/')[1].split('?')[0]);
    }
  });
  page.on('response', async r => {
    const u = r.url();
    if (u.includes('/api/trpc/') && (u.includes('cart') || u.includes('promo') || u.includes('coupon') || u.includes('deal')) && r.status() < 500) {
      try { const t = await r.text(); const proc = u.split('/api/trpc/')[1].split('?')[0];
        fs.writeFileSync(OUT + '/resp-' + proc.replace(/\./g, '_') + '-' + r.status() + '.json', t.slice(0, 6000));
        console.log('[RESP]', proc, r.status(), t.length); } catch (e) {}
    }
  });
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(9000);
  let body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2000));
  console.log('CART BODY:', body.slice(0, 1200));
  // find promo input + apply
  const promo = await page.evaluate(() => {
    const P = window.__PJCFG;
    const inp = document.querySelector('input[placeholder*="romo" i], input[name*="romo" i]');
    if (!inp) return 'no-input';
    inp.focus(); inp.value = P.PROMO_BOGO4U;
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    const btns = [...document.querySelectorAll('button')].filter(b => /^apply$/i.test((b.innerText || '').trim()));
    return 'inputs found: ' + btns.length;
  });
  console.log('promo:', promo);
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const b = [...document.querySelectorAll('button')].find(x => /^apply$/i.test((x.innerText || '').trim()));
    if (b) { b.click(); return true; } return false;
  });
  console.log('apply clicked:', clicked);
  await sleep(9000);
  body = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2500));
  fs.writeFileSync(OUT + '/after-apply.txt', body);
  console.log('AFTER:', body.slice(0, 1600));
  await ctx.storageState({ path: OUT + '/storage.json' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
