// Stage 1: load papajohns.com in real chromium, log all XHR/fetch JSON traffic,
// set carryout location via UI, dump network log. Recon only.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');

const OUT = process.env.PJ_OUT || CFG.outDir('out1');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H },
    locale: CFG.LOCALE,
    timezoneId: CFG.TIMEZONE,
  });
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');

  const xhrUrls = new Map();
  const jsonResp = [];
  page.on('request', r => {
    const rt = r.resourceType();
    if (rt === 'xhr' || rt === 'fetch') {
      const k = r.method() + ' ' + r.url().split('?')[0];
      if (!xhrUrls.has(k)) { xhrUrls.set(k, 1); console.log('[XHR]', k); }
    }
  });
  page.on('response', async r => {
    const rt = r.request().resourceType();
    if ((rt === 'xhr' || rt === 'fetch') && r.status() === 200) {
      const u = r.url().split('?')[0];
      let kind = 'unknown';
      try {
        const t = await r.text();
        kind = t.trim().startsWith('{') || t.trim().startsWith('[') ? `json(${t.length})` : `text(${t.length})`;
      } catch (e) { kind = 'read-error'; }
      jsonResp.push(`${r.request().method()} ${u} -> ${kind}`);
    }
  });

  console.log('== homepage ==');
  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  const title = await page.title();
  console.log('TITLE:', title);
  await page.screenshot({ path: OUT + '/home.png' });
  if (/technical difficulties/i.test(title)) {
    console.log('FAILOVER PAGE - bot walled even in browser');
    fs.writeFileSync(OUT + '/xhr.log', [...xhrUrls.keys()].join('\n'));
    await browser.close();
    process.exit(2);
  }

  // Find order/carryout entry
  console.log('== find order entry ==');
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2000);
  console.log('BODY:', bodyText.replace(/\s+/g, ' ').slice(0, 800));
  const entry = page.locator('a,button', { hasText: /carryout|order now|find a store|start.*order/i }).first();
  if (await entry.count()) {
    console.log('clicking entry:', (await entry.textContent().catch(() => '?') || '').trim().slice(0, 60));
    await entry.click({ timeout: 10000 }).catch(e => console.log('click err', e.message.slice(0, 120)));
    await page.waitForTimeout(6000);
    console.log('URL now:', page.url());
    console.log('TITLE now:', await page.title());
    await page.screenshot({ path: OUT + '/locator.png' });
    const t2 = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1200);
    console.log('LOCATOR BODY:', t2);

    // Try zip input
    const zip = page.locator('input[type="text"], input:not([type])').first();
    if (await zip.count()) {
      await zip.fill(CFG.ZIP);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: OUT + '/zip.png' });
      const t3 = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 2000);
      console.log('AFTER ZIP:', t3);
    }
  }

  fs.writeFileSync(OUT + '/xhr.log', [...xhrUrls.keys()].join('\n'));
  fs.writeFileSync(OUT + '/json-resp.log', jsonResp.join('\n'));
  console.log('== done ==');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
