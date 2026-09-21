// lib/session.js — Chromium session with Papa John's tRPC helpers injected.
//
// Every command runs through openSession(): real Chromium via playwright-core,
// CFG injected as window.__PJCFG, and window.__PJ with tRPC call helpers.
// Storage state persists to CFG.storage('session.json') so the store scoping
// survives between runs.

const { chromium } = require('playwright-core');
const fs = require('fs');
const CFG = require('../config');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Injected into every page. P = window.__PJCFG (serializable CFG subset).
const INPAGE_HELPERS = `
window.__PJ = {
  async call(proc, input) {
    const P = window.__PJCFG;
    const r = await fetch(P.SITE_URL + '/api/trpc/' + proc, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ json: input }),
    });
    const t = await r.text();
    let j;
    try { j = JSON.parse(t); }
    catch (e) { throw new Error(proc + ' non-JSON response: ' + t.slice(0, 200)); }
    if (j.error) throw new Error(proc + ' error: ' + JSON.stringify(j.error).slice(0, 300));
    return j.result.data.json;
  },
  ls() { return JSON.parse(localStorage.getItem('cart-store')); },
  state() { const v = this.ls(); return v && v.state && v.state.state; },
  price() { const v = this.ls(); return v && v.state && v.state.price; },
  storeId() {
    try { const s = this.state(); return (s && (s.storeId || (s.store && s.store.id))) || null; }
    catch (e) { return null; }
  },
  sync(st) {
    const ls = this.ls();
    ls.state.state = st.state;
    ls.state.price = st.price;
    localStorage.setItem('cart-store', JSON.stringify(ls));
  },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
};
`;

async function openSession(opts = {}) {
  const browser = await chromium.launch({
    executablePath: CFG.CHROMIUM_PATH,
    headless: opts.headless !== false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });
  const sessionPath = CFG.storage('session.json');
  const ctxOpts = {
    userAgent: CFG.USER_AGENT,
    viewport: { width: CFG.VIEWPORT_W, height: CFG.VIEWPORT_H },
    locale: CFG.LOCALE,
    timezoneId: CFG.TIMEZONE,
  };
  if (fs.existsSync(sessionPath)) ctxOpts.storageState = sessionPath;
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.addInitScript('window.__PJCFG = ' + JSON.stringify(CFG.forPage()) + ';');
  await page.addInitScript(INPAGE_HELPERS);
  const close = async () => {
    try { await ctx.storageState({ path: sessionPath }); } catch (e) { /* best effort */ }
    await browser.close();
  };
  return { browser, ctx, page, close, sessionPath };
}

// Make sure the session is scoped to CFG.STORE_ID for carryout. Reuses the
// saved session when it already matches; otherwise runs the site's own
// store-selection UI once (carryout ZIP search -> SELECT STORE).
async function ensureStore(page, { force = false } = {}) {
  await page.goto(CFG.SITE_URL + '/order/cart', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(8000);
  if (!force) {
    const cur = await page.evaluate(() => window.__PJ.storeId());
    if (cur === CFG.STORE_ID) return { ok: true, reused: true, storeId: cur };
  }
  await page.goto(CFG.SITE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(5000);
  await page.evaluate(() => {
    const inp = [...document.querySelectorAll('input')]
      .find(i => /zip/i.test((i.placeholder || '') + (i.name || '') + (i.id || '')));
    if (inp) { inp.focus(); inp.click(); }
  });
  await page.keyboard.type(CFG.ZIP, { delay: 80 });
  await page.waitForResponse(u => u.url().includes('/api/trpc/stores.searchStores'), { timeout: 20000 });
  await sleep(2000);
  const clicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('a,button')]
      .find(e => /select store/i.test(e.innerText || ''));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (!clicked) throw new Error('store setup: no SELECT STORE button found');
  await sleep(8000);
  const storeId = await page.evaluate(() => window.__PJ.storeId());
  return { ok: storeId === CFG.STORE_ID, reused: false, storeId, wanted: CFG.STORE_ID };
}

module.exports = { openSession, ensureStore, sleep };
