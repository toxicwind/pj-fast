// config.js — Papa John's project configuration, loaded from .env.
//
// Every tunable / discovered constant lives here. Stage scripts read from
// this module (node side: CFG.X) and from window.__PJCFG inside
// page.evaluate (injected via page.addInitScript as `P`).
//
// Copy .env.example to .env and fill in your values. .env is gitignored.

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const E = process.env;
const num = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const csvNums = (v, d) =>
  v ? String(v).split(',').map(s => parseInt(s.trim(), 10)).filter(Number.isFinite) : d;
const jsonArr = (v, d) => {
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : d; } catch { return d; }
};

const SITE_URL = E.PJ_SITE_URL || 'https://www.papajohns.com';
const STORE_ID = num(E.PJ_STORE_ID, 1054);
const ZIP = E.PJ_ZIP || '80234';
const CONTACT_EMAIL = E.PJ_CONTACT_EMAIL || '';
const CONTACT_PHONE = E.PJ_CONTACT_PHONE || '';
const BASE_DIR = E.PJ_BASE_DIR || '/home/toxic/pj';

const CHROMIUM_PATH = E.PJ_CHROMIUM_PATH || '/usr/bin/chromium';
const USER_AGENT = E.PJ_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const VIEWPORT_W = num(E.PJ_VIEWPORT_W, 1366);
const VIEWPORT_H = num(E.PJ_VIEWPORT_H, 900);
const LOCALE = E.PJ_LOCALE || 'en-US';
const TIMEZONE = E.PJ_TIMEZONE || 'America/Denver';

// Menu SKUs (size-crust-product codes)
const SKU_PHILLY_LARGE = E.PJ_SKU_PHILLY_LARGE || '1-1-4-198';
const SKU_PEPP_LARGE = E.PJ_SKU_PEPP_LARGE || '1-1-4-115';
const SKU_PEPP_MEDIUM = E.PJ_SKU_PEPP_MEDIUM || '1-1-3-115';
const SKU_WINGS_6PC = E.PJ_SKU_WINGS_6PC || '9-390-8-223';
const SKU_GARLIC_KNOTS = E.PJ_SKU_GARLIC_KNOTS || '12-519-10-202';

// Toppings / sauces (discovered IDs)
const TOPPINGS_PHILLY = csvNums(E.PJ_TOPPINGS_PHILLY, [47, 54, 506, 29]); // onions removed, jalapenos added
const TOPPINGS_PEPPERONI = csvNums(E.PJ_TOPPINGS_PEPPERONI, [35]);
const TOPPING_ONION = num(E.PJ_TOPPING_ONION, 25);
const TOPPING_JALAPENO = num(E.PJ_TOPPING_JALAPENO, 29);
const SAUCE_PHILLY = num(E.PJ_SAUCE_PHILLY, 428);
const SAUCE_PEPPERONI = num(E.PJ_SAUCE_PEPPERONI, 429);
const INSTRUCTIONS = jsonArr(E.PJ_INSTRUCTIONS, [
  { detailId: 58, groupId: 3 }, { detailId: 10, groupId: 4 },
  { detailId: 1, groupId: 1 }, { detailId: 5, groupId: 2 },
]);

// Product configuration IDs (discovered)
const CONFIG_PHILLY_LARGE = num(E.PJ_CONFIG_PHILLY_LARGE, 16607);
const CONFIG_PEPP_LARGE = num(E.PJ_CONFIG_PEPP_LARGE, 29630);
const CONFIG_PAIRING_A = num(E.PJ_CONFIG_PAIRING_A, 10399);
const CONFIG_PAIRING_B = num(E.PJ_CONFIG_PAIRING_B, 13664);
const CONFIG_PAIRING_C = num(E.PJ_CONFIG_PAIRING_C, 18899);
const CONFIG_KNOTS = num(E.PJ_CONFIG_KNOTS, 27247);

// Deals + promo codes (validated for store 1054 on 2026-09-20)
const DEAL_BOGO = num(E.PJ_DEAL_BOGO, 66564);
const DEAL_PAIRINGS = num(E.PJ_DEAL_PAIRINGS, 65515);
const DEAL_EDS8L = num(E.PJ_DEAL_EDS8L, 47851);
const PROMO_BOGO4U = E.PJ_PROMO_BOGO4U || 'BOGO4U';
const PROMO_SM25 = E.PJ_PROMO_SM25 || 'SM25';
const PROMO_TAKE25DEAL = E.PJ_PROMO_TAKE25DEAL || 'TAKE25DEAL';
const PROMO_PEPSI20 = E.PJ_PROMO_PEPSI20 || 'PEPSI20';
const PROMO_AMAC20 = E.PJ_PROMO_AMAC20 || 'AMAC20';
const PROMO_EDCYO22 = E.PJ_PROMO_EDCYO22 || 'EDCYO22';
const PROMO_EDS8L = E.PJ_PROMO_EDS8L || 'EDS8L';
const PROMO_EDMWP7 = E.PJ_PROMO_EDMWP7 || 'EDMWP7';
const PROMO_NONE = '';

const CFG = {
  SITE_URL, STORE_ID, ZIP, CONTACT_EMAIL, CONTACT_PHONE, BASE_DIR,
  CHROMIUM_PATH, USER_AGENT, VIEWPORT_W, VIEWPORT_H, LOCALE, TIMEZONE,
  SKU_PHILLY_LARGE, SKU_PEPP_LARGE, SKU_PEPP_MEDIUM, SKU_WINGS_6PC, SKU_GARLIC_KNOTS,
  TOPPINGS_PHILLY, TOPPINGS_PEPPERONI, TOPPING_ONION, TOPPING_JALAPENO,
  SAUCE_PHILLY, SAUCE_PEPPERONI, INSTRUCTIONS,
  CONFIG_PHILLY_LARGE, CONFIG_PEPP_LARGE,
  CONFIG_PAIRING_A, CONFIG_PAIRING_B, CONFIG_PAIRING_C, CONFIG_KNOTS,
  DEAL_BOGO, DEAL_PAIRINGS, DEAL_EDS8L,
  PROMO_BOGO4U, PROMO_SM25, PROMO_TAKE25DEAL, PROMO_PEPSI20, PROMO_AMAC20,
  PROMO_EDCYO22, PROMO_EDS8L, PROMO_EDMWP7, PROMO_NONE,

  // Per-stage output dir under BASE_DIR, e.g. CFG.outDir('out48')
  outDir(name) { return path.join(BASE_DIR, name); },
  // Storage-state / artifact path under BASE_DIR, e.g. CFG.storage('out48/storage.json')
  storage(rel) { return path.join(BASE_DIR, rel); },

  // Serializable subset injected into the page as window.__PJCFG (see `P` in evaluate bodies)
  forPage() {
    return {
      SITE_URL, STORE_ID, ZIP, CONTACT_EMAIL, CONTACT_PHONE,
      SKU_PHILLY_LARGE, SKU_PEPP_LARGE, SKU_PEPP_MEDIUM, SKU_WINGS_6PC, SKU_GARLIC_KNOTS,
      TOPPINGS_PHILLY, TOPPINGS_PEPPERONI, TOPPING_ONION, TOPPING_JALAPENO,
      SAUCE_PHILLY, SAUCE_PEPPERONI, INSTRUCTIONS,
      CONFIG_PHILLY_LARGE, CONFIG_PEPP_LARGE,
      CONFIG_PAIRING_A, CONFIG_PAIRING_B, CONFIG_PAIRING_C, CONFIG_KNOTS,
      DEAL_BOGO, DEAL_PAIRINGS, DEAL_EDS8L,
      PROMO_BOGO4U, PROMO_SM25, PROMO_TAKE25DEAL, PROMO_PEPSI20, PROMO_AMAC20,
      PROMO_EDCYO22, PROMO_EDS8L, PROMO_EDMWP7, PROMO_NONE,
    };
  },
};

module.exports = CFG;
