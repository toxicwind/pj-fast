// lib/deals.js — verified product/deal payload builders (node side).
//
// Shapes below are byte-faithful to the carts verified live on 2026-09-20.
// Do not "clean up" the quirks: Papa Pairings requires a STRING dealId and a
// null promoCode; BOGO/EDS8L take numeric dealIds.

const CFG = require('../config');
const P = CFG.forPage();

function pizza({ sku, title, toppings, sauceId, configId, instructions = P.INSTRUCTIONS }) {
  return {
    sku, quantity: 1, title,
    sectionWhole: { toppings },
    sectionOne: null, sectionTwo: null,
    sauceId, instructions, sides: [],
    productModificationCodes: [],
    papaSized: false,
    productConfigurationId: configId,
  };
}

const phillyLarge = () => pizza({
  sku: P.SKU_PHILLY_LARGE, title: 'Large Original Crust Philly Cheesesteak',
  toppings: P.TOPPINGS_PHILLY, // onion (25) removed, jalapeno (29) added
  sauceId: P.SAUCE_PHILLY, configId: P.CONFIG_PHILLY_LARGE,
});

const pepperoniLarge = () => pizza({
  sku: P.SKU_PEPP_LARGE, title: 'Large Original Crust Pepperoni',
  toppings: P.TOPPINGS_PEPPERONI, sauceId: P.SAUCE_PEPPERONI,
  configId: P.CONFIG_PEPP_LARGE,
});

const pairingMedium = (configId) => pizza({
  sku: P.SKU_PEPP_MEDIUM, title: 'Medium Pepperoni',
  toppings: P.TOPPINGS_PEPPERONI, sauceId: P.SAUCE_PHILLY,
  configId, instructions: [],
});

const ROUTES = {
  bogo: {
    label: 'BOGO Philly + Pepperoni', expectTotal: 27.11,
    dealId: P.DEAL_BOGO, promoCode: P.PROMO_BOGO4U,
    products: () => [phillyLarge(), pepperoniLarge()],
  },
  eds8l: {
    label: 'EDS8L Philly', expectTotal: 18.43,
    dealId: P.DEAL_EDS8L, promoCode: P.PROMO_NONE,
    products: () => [phillyLarge()],
  },
  pairings: {
    label: 'Papa Pairings 3x medium', expectTotal: 22.75,
    dealId: String(P.DEAL_PAIRINGS), promoCode: null,
    products: () => [
      pairingMedium(P.CONFIG_PAIRING_A),
      pairingMedium(P.CONFIG_PAIRING_B),
      pairingMedium(P.CONFIG_PAIRING_C),
    ],
  },
};

const DEFAULT_PROMOS = [
  P.PROMO_BOGO4U, P.PROMO_SM25, P.PROMO_TAKE25DEAL,
  P.PROMO_PEPSI20, P.PROMO_AMAC20, P.PROMO_EDCYO22,
  P.PROMO_EDS8L, P.PROMO_EDMWP7,
];

module.exports = { pizza, phillyLarge, pepperoniLarge, pairingMedium, ROUTES, DEFAULT_PROMOS };
