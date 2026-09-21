# Stage index

Every script is numbered in the order it was built during the 2026-09-20
recon session. Descriptions are taken from each file's own header comment.
`stage1.js` is the original pre-yote stage 1; everything else runs against
yote's Chromium via `playwright-core`.

## Phase 1 — Traffic recon (XHR / tRPC discovery)

| Stage | What it does |
|---|---|
| `stage1.js` | Original stage 1 (pre-yote; see `yote-stage1.js` for the yote/Chromium port). |
| `yote-stage1.js` | Load papajohns.com in real Chromium, log all XHR/fetch JSON traffic, set carryout location via UI, dump network log. Recon only. |
| `yote-stage2.js` | Harvest tRPC procedure names from the site's JS bundles + trigger menu/deals page loads to capture live tRPC calls. Recon only. |
| `yote-stage3.js` | Drive the location/store-selection flow, capture the tRPC procedures it triggers (store search etc.). Recon only, no cart/checkout. |

## Phase 2 — Store, menu & topping catalog

| Stage | What it does |
|---|---|
| `yote-stage4.js` | Switch to CARRYOUT, search stores by ZIP 80234, select closest, capture store-search tRPC + storeId. Then pull menu JSON via tRPC. |
| `yote-stage5.js` | Carryout ZIP search with Enter, capture store-search tRPC, list stores, select closest, save all tRPC responses. |
| `yote-stage6.js` | Select closest carryout store (2683 E 120TH AVE, store 1054), capture store-specific menu/deals tRPC, preserve session storage state. |
| `yote-stage7.js` | Deals page XHR capture + full getAvailableOptionBySku, reuse store session. |
| `yote-stage8.js` | Enumerate topping-catalog procedures + open Philly customize to capture topping XHR. |
| `yote-stage9.js` | Scroll menu, open Philly Cheesesteak product, capture builder XHR. |
| `yote-stage10.js` | Dump all product card names on menu page to find Philly. |

## Phase 3 — Builder deep-dive (Philly customization)

| Stage | What it does |
|---|---|
| `yote-stage11.js` | Click Philly card via H4 ancestor, capture builder/topping XHR. |
| `yote-stage12.js` | Real mouse click on Philly card center; dump post-click DOM + XHR. |
| `yote-stage13.js` | Reopen Philly builder, dump topping rows with prices from DOM. |
| `yote-stage14.js` | Toggle jalapeño add + onions remove in builder, read live price. |
| `yote-stage15.js` | Inspect jalapeño row HTML, find real toggle control + price. |
| `yote-stage16.js` | Climb higher from jalapeño leaf, list buttons + prices in topping card. |
| `yote-stage17.js` | Click jalapeño row, then dump expanded topping card for price buttons. |
| `yote-stage18.js` | Inspect onion card controls, remove onions, add jalapeño, add to cart, read cart. |
| `yote-stage19.js` | Try toggling onions off via its Normal button; check WHAT'S ON IT + price. |

## Phase 4 — Dealbuilder flow capture

| Stage | What it does |
|---|---|
| `yote-stage20.js` | Explore BOGO dealbuilder flow, capture POST bodies. |
| `yote-stage21.js` | Drive BOGO dealbuilder step 1 — select Philly, capture what happens. |
| `yote-stage22.js` | Screenshot + full dump of dealbuilder step 1. |
| `yote-stage23.js` | From deals page, click BOGO deal CTA, follow the real flow. |
| `yote-stage24.js` | Open cart, apply promo BOGO4U, capture mutation + result. |
| `yote-stage25.js` | Deep DOM dump of dealbuilder step 1 — headings, links, cards. |
| `yote-stage26.js` | Click step-1 header accordion, see if options expand. |
| `yote-stage27.js` | Capture console errors on dealbuilder page. |
| `yote-stage28.js` | Fetch dealbuilder JS chunks, grep for deal/cart mutation names. |
| `yote-stage29.js` | Fetch chunk with addDealToCart, print surrounding context. |

## Phase 5 — Direct tRPC cart API

| Stage | What it does |
|---|---|
| `yote-stage30.js` | Find where cart state lives client-side; dump it. |
| `yote-stage31.js` | Call `cart.addToCartWithDeal` directly for BOGO4U. |
| `yote-stage32.js` | Fetch `deals.getDeal` for EDS8L (47851) and EDMWP7 (65515). |
| `yote-stage33.js` | Visit dealbuilder for EDS8L + EDMWP7, capture `deals.getDeal` responses. |
| `yote-stage34.js` | Validate external promo candidates + find cart-clear mutation. |
| `yote-stage35.js` | Clear cart via UI, then add BOGO deal fresh. Verify final total. |
| `yote-stage36.js` | `removeFromCart` direct call, then verify. |
| `yote-stage37.js` | Read final cart state after removal. |
| `yote-stage38.js` | Single session — remove Philly, add BOGO deal, save storage, verify from responses. ✅ Verified **$27.11** route. |
| `yote-stage39.js` | Capture real `cart.addToCart` POST body from menu page. |
| `yote-stage40.js` | Probe `cart.addToCart` input shapes. |

## Phase 6 — Sides, promos & final routes

| Stage | What it does |
|---|---|
| `yote-stage41.js` | Route 2 attempt — Philly + wings + SM25, single session. |
| `yote-stage42.js` | Debug side `addToCart` with full responses. |
| `yote-stage43.js` | Try knots in empty cart; isolate side-add issue. |
| `yote-stage44.js` | Verify SM25 applies to Philly-only cart via `applyPromoCode`. |
| `yote-stage45.js` | Click a side's Add button on menu, capture exact POST. |
| `yote-stage46.js` | Papa Pairings deal via `addToCartWithDeal`. ✅ Verified **$22.75** route. |
| `yote-stage47.js` | Papa Pairings deal via `addToCartWithDeal` (repeat/variant). |
| `yote-stage48.js` | EDS8L Philly $16.99 via `addToCartWithDeal`. ✅ Verified **$18.43** route. |
| `yote-stage49.js` | Pairings with a side (garlic knots) to test side-via-deal. |
