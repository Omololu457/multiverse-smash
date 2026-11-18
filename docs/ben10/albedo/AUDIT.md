# Albedo ⇄ Ben 10 — sharing audit (Phase 1, 2026-11-18)

**Result: no gameplay fixes needed.** Every rosterKey check that gates Ben 10 gameplay already accepts `albedo`, either through
`isBenDevice` (ben10State.js:4), `isTransformDevice` (fighters.js:1865) or `benReadyForm`, or as an explicit
`ben10 || albedo` pair. The one real gap was in **rendering, not gameplay**: READY aliens skipped the `__albedo` retag, so
Albedo's forms drew Ben's green art. Phases 2–4 fix that.

## The grep (run on a clean `git archive HEAD` export, every `*.js` at the repo root)

```
grep -nE "(===|!==|==|!=)\s*[\"'\`]ben10[\"'\`]|[\"'\`]ben10[\"'\`]\s*(===|!==|==|!=)|[(=,!\s]/\^?ben10[/\$|(]|startsWith\([\"'\`]ben10|includes\([\"'\`]ben10[\"'\`]\)|case [\"'\`]ben10[\"'\`]|\[[\"'\`]ben10[\"'\`]" *.js
```

| hit | albedo handled? |
|---|---|
| ben10State.js:4 `isBenDevice` | `["ben10","albedo"]` |
| fighters.js:659/660 draw dispatch | `case "albedo"` on the next line |
| fighters.js:1867 `isTransformDevice` · :2060 `applyBen10VariantStats` | `ben10 \|\| albedo` |
| physics.js:75 · :128 | `ben10 \|\| albedo` / `["ben10","albedo"]` |
| combat.js:322 (Ben DR) · :3358 (parry) · :3614 | `ben10 \|\| albedo` |
| abilities.js:7814 · :35871 | `ben10 && albedo` / `["ben10","albedo"]` |
| abilities.js special / ultimate dispatch (`case "ben10"`) | `case "albedo"` on the next line → the same `executeBen10Special` / `executeBen10Ultimate` |
| abilities.js:37114 (EMP drone recall) | the regex `/ben10\|vilgax\|albedo\|…/` matches both |
| game.js:6449 (Omnitrix loadout screen) · :28205 (state snapshot) | `ben10 \|\| albedo` |
| waterAffinity.js:25 | `ben10 \|\| albedo` |
| ui.js:4770 (HUD device) | `ben10 \|\| albedo` |
| animeForms.js:19 · animeSignatures.js:29 | `ben10 \|\| albedo` |
| arlongSkins.js:15 · spdRedSkins.js:14 · omegaSkins.js:12 | skin-name tables (cosmetic labels; albedo listed beside ben10) |
| player.js:20 · :81 | **dead**: player.js is never imported, only mapped in index.html |

Hits outside gameplay, left unchanged and out of scope:
- `roster.js:156` is not imported.
- `kits.js:1152` is move-list text.
- `sound.js:1360` is music.
- `theme.js:140/162` are theme colours.
- `arcade.js:68` is the arcade rival pick.

The 24 READY alien modules never read `rosterKey` for gameplay. The only read is `rath.js:426`, which takes the **opponent's**
display name for a callout.

## Systems confirmed generic (keyed on the device, the form or GAME_STATE, never on "ben10")

- **Omnitrix Dial / one-button dial / PICK FIVE loadout:** game.js:6449 opens the same loadout screen for both keys. The
  dial reads `fighter.omnitrix`, which `setupBen10` builds for any `isTransformDevice` fighter.
- **Vow:** `omnitrix.vowActive` is read through `TRANSFORM_ENERGY.VOW_DMG_MULT` in `applyAlien`; it never checks the key.
- **Power math:** `omnitrix.power` / `fighter.energy` drain and on-hit gain sit behind `isBenDevice`.
- **STORM TIDE flood:** `benFlood.js` is field-gated on `fighter._benFlood` (abilities.js `tickBenAlienForm`), with no key.
- **waterAffinity:** `WATER_AFFINITY_FORMS[activeAlien]` for `ben10 || albedo` (waterAffinity.js:25). `isFireUltimate` and
  `keyOf` route through `elementFor`, and `juice_elements` carries both keys.
- **Ice status:** `_benIceImmuneUntil` / `_benSlow` are stamped on the **opponent** by the form modules, with no key check.
- **Variant stats:** `applyBen10VariantStats` keys on the skin id (`default` / `ben10Classic` / `ben10Prime`). Phase 4 gives
  Albedo skins with those same ids, so his three variants get Ben's numbers through the same table.

The audit lint is `harness/albedo_mirror.test.mjs`. It re-runs this grep and fails on any new unpaired literal.
