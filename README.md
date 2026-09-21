# pj-fast — Papa John's carryout optimization

Code-only recon + cart building against the Papa John's tRPC API
(`https://www.papajohns.com/api/trpc/`) via `playwright-core` + yote Chromium.
No browser UI automation, no checkout submission — cart state only.

## Setup

```bash
cp .env.example .env   # then fill in your ZIP / contact / paths
npm install
```

`.env` is gitignored. Machine-specific values (`PJ_BASE_DIR`, `PJ_CHROMIUM_PATH`)
differ per box — set them per machine.

## Config

All tunables live in `.env` and are exposed through `config.js`:

- Node side: `const CFG = require('./config');` → `CFG.STORE_ID`, `CFG.DEAL_BOGO`, …
- Inside `page.evaluate`: config is injected as `window.__PJCFG` via
  `page.addInitScript`, available as `P` — e.g. `dealId: P.DEAL_BOGO`,
  `sku: P.SKU_PHILLY_LARGE`, `promoCode: P.PROMO_BOGO4U`.

`CFG.outDir('out48')` / `CFG.storage('out48/storage.json')` resolve artifact
paths under `PJ_BASE_DIR`.

## Verified routes (store 1054, 2026-09-20)

| Route | What | Total |
|---|---|---|
| 1 — BOGO (`BOGO4U`, deal 66564) | Large Philly (no onion + jalapeño) + Large Pepperoni | **$27.11** |
| 2 — EDS8L (deal 47851) | Large Philly (no onion + jalapeño) | $18.43 |
| 3 — Papa Pairings (deal 65515) | 3× Medium Pepperoni @ $6.99 | **$22.75** |

Promo codes validated: `BOGO4U`, `SM25`, `TAKE25DEAL`, `PEPSI20`, `AMAC20`, `EDCYO22`.
Rejected: `LOC40`, `FREEDELIVERY`, `AE23`.

## Backup context

The recon above fed a real order attempt on 2026-09-20 that died at checkout
(wrong store staged, three identical site-side "Place order" failures, then
cancelled). Full timeline: [`docs/failure-log-2026-09-20.md`](docs/failure-log-2026-09-20.md).
