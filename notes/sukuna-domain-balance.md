---
name: sukuna-domain-balance
description: Sukuna Malevolent Shrine domain nerf — slash interval 30→130 + projectiles respect domainUntouchable (Fuga anti-stack)
metadata: 
  node_type: memory
  type: project
  originSessionId: f71ea5e3-3cdd-4ebe-8a1a-5e449de19e75
---

Sukuna's Malevolent Shrine (Domain Expansion) was an effective **round-ender** and got nerfed. COMMITTED + PUSHED as `c4f5717d` (2026-08-29).

**Why it was broken (the non-obvious part):** the domain runs **15s / 900 frames**, NOT the 8s `DOMAIN_DEFAULTS.duration` — it's hardcoded `activateDomain(fighter, { cost:0, duration:15, range:1e5 }, ...)` at **abilities.js:2984** (Gojo's freeze-only domain is the twin at :2788). At the old `SUKUNA_SLASH_INTERVAL = 30` cadence that's ~30 auto-slashes × `SUKUNA_SLASH_DAMAGE = 14` = **400 RAW / 240 EFFECTIVE** (×`GLOBAL_DAMAGE_SCALE` 0.60) guaranteed, unblockable, no-counterplay damage (~20% of a bar). The earlier audit's "~200 raw" estimate was wrong because it assumed 8s/16 slashes.

**Fix 1 (domains.js):** `SUKUNA_SLASH_INTERVAL` **30 → 130** → measured **7 slashes = 93.3 RAW / 56 EFFECTIVE**. The `domainUntouchable` "sure-hit" identity is KEPT (owner asked to preserve it — a domain guaranteeing a hit is canon; it just no longer guarantees the match).

**Fix 2 (combat.js, `resolveProjectileHitsMulti` ~3676):** added `if (fighter.domainUntouchable) continue` before the projectile damage write, so Fuga (Sukuna's Fire Arrow) can no longer STACK free damage on top of the guaranteed slashes. Mirrors the melee whiff at combat.js:~2743, uses the `continue` pass-through pattern (like Vegito-UI / Miles-stealth). ★Scoped to `domainUntouchable` ONLY — the melee guard also lists `_cubeTrapUntouchable`/`_banished` but those were deliberately NOT touched (out of scope). Verified: 5 bolts at the sealed foe dealt 0.

★**If a denser slash rhythm is wanted, trim the 15s duration at abilities.js:2984 rather than shrinking the interval back** — the duration is the real damage driver.

Regression clean: test:sukuna-cursed-slash 11/0, test:six-paths 36/0. Measurement method: playwright harness + `__harness.p1Ultimate()` / `fillEnergy()` / `domainState()`, HP-delta before/after. See [[combo-standard-coverage]] (shipped in the SAME commit) and [[architecture-and-contracts]].
