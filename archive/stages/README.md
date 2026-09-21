# archive/stages

The original 50 recon scripts (`stage1.js`, `yote-stage1.js` … `yote-stage49.js`),
frozen as-is on 2026-09-20 when they were superseded by the maintained toolkit.

They are the chronological lab notebook: store recon, tRPC mapping, promo sweeps,
and the cart builds that produced the three verified routes. `docs/stages.md`
describes each one.

> ⚠️ Frozen history — do not run these directly. `require('./config')` paths
> are stale relative to this directory, and several scripts write to `outNN/`
> directories that no longer exist. The supported toolkit is `pj.js` + `lib/`
> at the repo root.
