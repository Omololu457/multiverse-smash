# BEN 10 — ADDING AN ALIEN

The Omnitrix engine is **data-driven**. A new alien is a registry entry + a sheet + a ledger —
**no engine edits**. This doc is the schema + the 5-step procedure.

## Registry schema (`aliens.js` → `BEN10_ALIEN_REGISTRY`)

```js
{
  id:          "wildvine",                 // stable registry id
  displayName: "Wildvine",                 // HUD / select label
  slot:        1..5,                        // Omnitrix dial slot (↓↓ + Light/Heavy/Special/L+H/H+S)
  status:      "ready" | "placeholder",    // ready = defined form; placeholder = generic
  poolKey:     "wildvine" | null,           // fighters.js BEN10_ALIEN_POOL key the form runs on
  sheetPath:   "./ben10_wildvine_idle_uniform.png" | null,   // null → placeholder render (human + tint)
  ledgerPath:  "docs/ben10/aliens/wildvine.md" | null,
  mods:        { speed, damage, defense, weight },   // 1.0 = identity; placeholders are ×1.0 (average)
  moves:       { jab, heavy, low, launcher, air, special1, special2?, special3?, ultimate? },
  movement:    "grounded"                    // aliens are grounded by default
}
```

`makePlaceholder(slot)` mints `slot1`..`slot5` / "Alien 1".."Alien 5" — status `placeholder`, identity
mods, the basic move table + **Placeholder Blast** (a 12-Power projectile). Every slot is therefore
always playable (the engine can be tested before any art).

## The 5-step procedure (NO engine edits)

1. **Registry entry** — add one object to `BEN10_ALIEN_REGISTRY` in `aliens.js` (or change a
   placeholder's `status` to `"ready"` and set its `poolKey`). Set `mods` + `moves`.
2. **Move table** — if the form needs bespoke specials/ultimate, add them to `BEN10_ALIEN_POOL`
   (`fighters.js`, via `mkAlien({...})`) under `poolKey`, and route them in `abilities.js`
   `executeBen10Special` / `executeBen10Ultimate` (one `if (a === "<poolKey>")` branch). Art-less
   forms can skip this and fall back to the generic special/ultimate.
3. **Sheet** — drop the sprite sheets on disk and set `sheetPath`. Slice per-action `_uniform` strips
   (reuse `ben10_work/extract.py` + `pack.py`). Add the `poolKey` to `fighters.js` `_artOnDiskSet`
   (`benAlienHasArt`) so `applyAlien` switches from the placeholder (human + tint) render to the real
   sheets — this is a one-word data add, not engine logic.
4. **Ledger** — write `ledgerPath` (per-alien frame→move map, like `SPRITE_LEDGER.md`).
5. **Loadout** — to make it selectable, add its `poolKey` to `BEN10_ART_ALIENS` (`fighters.js`) /
   the player's saved loadout. The transform/swap/timeout/Vow engine, the HUD, the Power economy,
   and the placeholder fallback are untouched.

## Balancing rule

Real aliens are balanced by **`mods` + move tables ONLY**, never by engine edits. Placeholders ship
with deliberately average (×1.0) mods. See `docs/ben10/BALANCE_NOTES.md`.
