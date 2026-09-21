# Deal & promo catalog

All values validated live for **store 1054** (2683 E 120th Ave, Denver) on
**2026-09-20** via `cart.validatePromoCode` and direct cart builds.
Deals are store- and time-sensitive — re-validate before trusting these.

## Verified routes

| Route | Deal | Code | Build | Total |
|---|---|---|---|---|
| 1 — BOGO ✅ | `66564` | `BOGO4U` | Large Philly (no onion + jalapeño) + Large Pepperoni | **$27.11** |
| 2 — EDS8L ✅ | `47851` | `EDS8L` | Large Philly (no onion + jalapeño) | **$18.43** |
| 3 — Pairings ✅ | `65515` | `EDMWP7` | 3× Medium Pepperoni @ $6.99 | **$22.75** |

Route detail (subtotal / tax / regular value / savings):

| Route | Subtotal | Tax | Regular | You save |
|---|---|---|---|---|
| 1 — BOGO | $24.99 | $2.12 | $44.48 | **$19.49** |
| 2 — EDS8L | $16.99 | $1.44 | $24.99 | $8.00 |
| 3 — Pairings | $20.97 | $1.78 | $52.47 | **$31.50** |

$\text{savings} = \text{regular} - \text{subtotal}$ — route 3 banks the most
absolute savings; route 1 is the best pizza-per-dollar with the Philly.

## Promo validation (`cart.validatePromoCode`)

### Accepted

| Code | Effect | Note |
|---|---|---|
| `BOGO4U` | BOGO large pizza | Deal `66564` — route 1 |
| `SM25` | 25% off regular menu | "Not valid on Deals" — $0.00 off a deal cart |
| `TAKE25DEAL` | 25% off regular menu | Same "not valid on deals" behavior |
| `PEPSI20` | 20% off | |
| `AMAC20` | 20% off | |
| `EDCYO22` | 22% off | |

### Rejected

| Code | Result |
|---|---|
| `LOC40` | invalid |
| `FREEDELIVERY` | invalid |
| `AE23` | invalid |
| `PSI20` / `PAPATRACK` / `PEPSI25` / `HONOR25` / `CHOOSEBETTER` | invalid (page-level check) |

> [!WARNING]
> Promo acceptance ≠ discount. `SM25`/`TAKE25DEAL` validate fine but apply
> $0.00 on deal carts — the 25% is regular-menu only.
