// Stage 3: drive the location/store-selection flow, capture the tRPC procedures
// it triggers (store search etc.). Recon only, no cart/checkout.
const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('./config');

const OUT = CFG.outDir('out3');
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
    if (u.includes('/api/trpc/')) { trpc.push(r.method() + ' ' + u.slice(0, 500)); console.log('[TRPC]', u.slice(0, 200)); }
  });

  await page.goto(CFG.SITE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(7000);

  // dump interactive elements
  const els = await page.evaluate(() => [...document.querySelectorAll('a,button')].map(e => ({
    t: (e.innerText || '').trim().slice(0, 50).replace(/\s+/g, ' '),
    href: e.getAttribute('href') || '',
    vis: e.offsetParent !== null,
  })).filter(e => e.t.length > 0).slice(0, 60));
  fs.writeFileSync(OUT + '/elements.json', JSON.stringify(els, null, 1));
  console.log('elements:', els.length);

  // cookie banner
  const banner = await page.evaluate(() => {
    const P = window.__PJCFG;
    const b = [...document.querySelectorAll('button')].find(x => /accept|agree|got it/i.test(x.innerText));
    if (b) { b.click(); return 'clicked: ' + b.innerText.trim().slice(0, 40); }
    return 'no banner btn';
  });
  console.log('banner:', banner);
  await page.waitForTimeout(2000);

  // click START YOUR ORDER / location entry via JS
  const clicked = await page.evaluate(() => {
    const P = window.__PJCFG;
    const cands = [...document.querySelectorAll('a,button')].filter(e => /start your order|select.*store|find.*store|start.*order/i.test(e.innerText));
    const el = cands.find(e => e.offsetParent !== null) || cands[0];
    if (el) { el.scrollIntoView(); el.click(); return 'clicked: ' + el.innerText.trim().slice(0, 60); }
    return 'not found, cands=' + cands.length;
  });
  console.log('order entry:', clicked);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: OUT + '/after-entry.png' });
  console.log('URL:', page.url());

  // dump modal/dialog state + inputs
  const state = await page.evaluate(() => ({
    dialogs: [...document.querySelectorAll('[role="dialog"], [class*="modal" i], [class*="Modal"]')].length,
    inputs: [...document.querySelectorAll('input')].map(i => ({ type: i.type, ph: i.placeholder || '', name: i.name || '', id: i.id || '' })),
    bodyStart: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500),
  }));
  fs.writeFileSync(OUT + '/state.json', JSON.stringify(state, null, 1));
  console.log(JSON.stringify(state, null, 1).slice(0, 2500));

  // try typing zip into the most plausible input
  const typed = await page.evaluate(() => {
    const P = window.__PJCFG;
    const inp = [...document.querySelectorAll('input')].find(i => /zip|postal|address|location|search/i.test(i.placeholder + i.name + i.id)) || document.querySelectorAll('input')[0];
    if (inp) { inp.focus(); document.execCommand('selectAll', false, null); return 'focused input ph=' + (inp.placeholder || inp.name || inp.id); }
    return 'no input';
  });
  console.log('typed target:', typed);
  if (!/no input/.test(typed)) {
    await page.keyboard.type(CFG.ZIP, { delay: 120 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: OUT + '/after-zip.png' });
    const after = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 2000));
    console.log('AFTER ZIP BODY:', after);
  }

  fs.writeFileSync(OUT + '/trpc.log', trpc.join('\n'));
  console.log('trpc calls:', trpc.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
