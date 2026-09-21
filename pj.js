#!/usr/bin/env node
// pj — Papa John's carryout toolkit CLI.
//
//   node pj.js bogo                 build the verified $27.11 BOGO cart
//   node pj.js eds8l                build the verified $18.43 EDS8L cart
//   node pj.js pairings             build the verified $22.75 Pairings cart
//   node pj.js promos [CODES...]    validate promo codes for this store
//   node pj.js cart                 show current cart state + totals
//   node pj.js clear                empty the cart
//   node pj.js menu                 dump store menu categories + products
//   node pj.js setup                (re)run store setup, save session
//
// Never orders, submits checkout, pays, or signs in. Cart building only.

const CFG = require('./config');
const { openSession, ensureStore } = require('./lib/session');
const { getCart, emptyCart, addDeal, validatePromos, getMenu } = require('./lib/cart');
const { ROUTES, DEFAULT_PROMOS } = require('./lib/deals');

function itemsOf(state) {
  const prods = (state.products || []).map(p => `${p.title || p.sku} $${p.displayPrice ?? '?'}`);
  const deals = (state.deals || []).map(d => `DEAL ${d.title || d.dealId} $${d.displayPrice ?? '?'}`);
  return [...prods, ...deals];
}

function printCart(state, price) {
  const items = itemsOf(state);
  console.log(items.length ? 'items:' : 'cart is empty');
  for (const i of items) console.log('  -', i);
  console.log('price:', JSON.stringify(price));
}

async function withSession(fn, { forceSetup = false } = {}) {
  const s = await openSession();
  try {
    const st = await ensureStore(s.page, { force: forceSetup });
    if (!st.ok) console.warn(`! store is ${st.storeId}, wanted ${st.wanted}`);
    else if (!st.reused) console.log(`store ${st.storeId} ready`);
    await fn(s);
  } finally {
    await s.close();
  }
}

async function buildRoute(name) {
  const r = ROUTES[name];
  if (!r) throw new Error('unknown route: ' + name);
  await withSession(async ({ page }) => {
    const em = await emptyCart(page);
    if (em.removed.length) console.log('cleared:', em.removed.join(', '));
    const out = await addDeal(page, { dealId: r.dealId, products: r.products(), promoCode: r.promoCode });
    console.log(`== ${r.label} ==`);
    printCart(out.state, out.price);
    if (r.expectTotal) console.log(`(verified 2026-09-20 at $${r.expectTotal})`);
  });
}

const cmds = {
  bogo: () => buildRoute('bogo'),
  eds8l: () => buildRoute('eds8l'),
  pairings: () => buildRoute('pairings'),

  async promos(...codes) {
    const list = codes.length ? codes : DEFAULT_PROMOS;
    await withSession(async ({ page }) => {
      const res = await validatePromos(page, list);
      for (const r of res) console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + r.code + '  ' + r.detail);
    });
  },

  async cart() {
    await withSession(async ({ page }) => {
      const { state, price } = await getCart(page);
      printCart(state, price);
    });
  },

  async clear() {
    await withSession(async ({ page }) => {
      const em = await emptyCart(page);
      console.log(em.removed.length ? 'removed: ' + em.removed.join(', ') : 'cart already empty');
    });
  },

  async menu() {
    await withSession(async ({ page }) => {
      const { categories, products } = await getMenu(page);
      const cats = categories.categories || categories;
      const prods = products.products || products;
      console.log(`categories: ${cats.length}, products: ${prods.length}`);
      for (const c of cats) console.log('  #', c.name || c.title || c.id);
      for (const p of prods.slice(0, 60)) console.log('  -', p.name || p.title, p.id ? `(${p.id})` : '');
      if (prods.length > 60) console.log(`  ... and ${prods.length - 60} more`);
    });
  },

  async setup() {
    await withSession(() => {}, { forceSetup: true });
    console.log('session saved');
  },
};

function help() {
  console.log(`pj-fast ${CFG.STORE_ID} — cart toolkit (no ordering, no checkout)

  node pj.js bogo              build verified $27.11 BOGO cart
  node pj.js eds8l             build verified $18.43 EDS8L cart
  node pj.js pairings          build verified $22.75 Pairings cart
  node pj.js promos [CODES...] validate promo codes for this store
  node pj.js cart              show current cart
  node pj.js clear             empty the cart
  node pj.js menu              dump store menu
  node pj.js setup             (re)run store setup`);
}

(async () => {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return help();
  const fn = cmds[cmd];
  if (!fn) { console.error('unknown command: ' + cmd); help(); process.exit(2); }
  await fn(...rest);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
