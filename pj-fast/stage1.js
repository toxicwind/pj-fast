const { chromium } = require('playwright');
const fs = require('fs');
const CFG = require('./config');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H },
    locale: CFG.LOCALE,
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');

  const seen = new Map();
  page.on('request', r => {
    const u = r.url();
    if (/\.(png|jpg|jpeg|gif|svg|css|woff2?|ico)(\?|$)/i.test(u)) return;
    if (u.includes('google') || u.includes('facebook') || u.includes('tiktok') || u.includes('analytics') || u.includes('hotjar')) return;
    const key = r.method() + ' ' + u.split('?')[0];
    if (!seen.has(key)) { seen.set(key, 1); console.log('[REQ]', key); }
  });
  page.on('response', async r => {
    const u = r.url();
    const ct = (await r.headerValue('content-type').catch(() => '')) || '';
    if (ct.includes('application/json') && !u.match(/\.(png|jpg)/)) {
      console.log('[JSON]', r.request().method(), u.split('?')[0], '->', r.status());
    }
  });

  console.log('== loading homepage ==');
  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  console.log('TITLE:', await page.title());
  console.log('URL:', page.url());
  await page.screenshot({ path: 'home.png' });

  // Try to set carryout location by ZIP via the store locator UI
  console.log('== attempting store set ==');
  try {
    // Look for a location / "find a store" entry point
    const locBtn = page.locator('a,button', { hasText: /find a store|locations|order now|start.*order/i }).first();
    if (await locBtn.count()) {
      console.log('clicking:', await locBtn.first().textContent().catch(()=>'?'));
      await locBtn.first().click({ timeout: 8000 }).catch(()=>{});
      await page.waitForTimeout(4000);
      console.log('after click URL:', page.url(), 'TITLE:', await page.title());
      await page.screenshot({ path: 'locator.png' });
      const body = await page.locator('body').innerText().catch(()=>'');
      console.log('BODY SNIPPET:', body.slice(0, 1500).replace(/\s+/g,' '));
    }
  } catch (e) { console.log('store-set attempt error:', e.message.slice(0,200)); }

  fs.writeFileSync('requests.log', [...seen.keys()].join('\n'));
  console.log('== done, requests logged to requests.log ==');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
