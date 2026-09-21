// lib/cart.js — cart operations through the in-page window.__PJ helpers.

async function getCart(page) {
  return page.evaluate(() => ({ state: window.__PJ.state(), price: window.__PJ.price() }));
}

async function emptyCart(page) {
  return page.evaluate(async () => {
    const PJ = window.__PJ;
    const removed = [];
    for (let i = 0; i < 10; i++) {
      const cur = PJ.state();
      const items = [...(cur.products || []), ...(cur.deals || [])];
      if (!items.length) break;
      const it = items[0];
      const st = await PJ.call('cart.removeFromCart', {
        shopcartItemId: it.shopcartItemId, currentCartState: cur,
      });
      PJ.sync(st);
      removed.push(it.title || it.sku || 'item');
      await PJ.sleep(600);
    }
    return { removed, state: PJ.state(), price: PJ.price() };
  });
}

async function addDeal(page, { dealId, products, promoCode }) {
  return page.evaluate(async ({ dealId, products, promoCode }) => {
    const PJ = window.__PJ;
    const cur = PJ.state();
    const st = await PJ.call('cart.addToCartWithDeal', {
      currentCartState: cur,
      dealId,
      products,
      quantity: 1,
      promoCode: promoCode === undefined ? null : promoCode,
      vendorRewardId: null,
    });
    PJ.sync(st);
    return { state: st.state, price: st.price };
  }, { dealId, products, promoCode });
}

async function applyPromo(page, promoCode) {
  return page.evaluate(async (promoCode) => {
    const PJ = window.__PJ;
    const cur = PJ.state();
    const st = await PJ.call('cart.applyPromoCode', { promoCode, currentCartState: cur });
    PJ.sync(st);
    return { state: st.state, price: st.price };
  }, promoCode);
}

async function validatePromos(page, codes) {
  return page.evaluate(async (codes) => {
    const PJ = window.__PJ, P = window.__PJCFG;
    const cur = PJ.state();
    const out = [];
    for (const code of codes) {
      try {
        const r = await PJ.call('cart.validatePromoCode', {
          promoCode: code, storeId: P.STORE_ID, orderType: 'CARRYOUT', currentCartState: cur,
        });
        out.push({ code, ok: true, detail: JSON.stringify(r).slice(0, 160) });
      } catch (e) {
        out.push({ code, ok: false, detail: e.message.slice(0, 160) });
      }
      await PJ.sleep(400);
    }
    return out;
  }, codes);
}

async function getMenu(page) {
  return page.evaluate(async () => {
    const PJ = window.__PJ, P = window.__PJCFG;
    const [categories, products] = await Promise.all([
      PJ.call('menuCategory.getByStore', { storeId: P.STORE_ID }),
      PJ.call('product.getByStore', { storeId: P.STORE_ID }),
    ]);
    return { categories, products };
  });
}

module.exports = { getCart, emptyCart, addDeal, applyPromo, validatePromos, getMenu };
