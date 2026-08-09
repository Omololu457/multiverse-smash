# TOBI (masked Obito alias) — Asset Utilization Map

Tobi is a **FULLY SEPARATE roster character** (`rosterKey: "tobi"`, own select entry, own runtime
instance). He reuses Obito's Kamui-family mechanic **architecture** as a template but shares **zero
live runtime state** — every reused per-fighter field is renamed into a `_tobi*` namespace, every
function is Tobi's own, and the ultimate has its own cinematic module. Proven by the isolation section
of `harness/tobi.test.mjs` (both Obito and Tobi loaded simultaneously; neither reads the other's state).

Raw uploads keep their **exact** filenames (incl. `kunia`, `projectilez`, the `.pgn` double-ext, and
the literal colons in `hit:get_up` / `chain_grab:attack_1`). Derived `_uniform` sheets are produced by
`tools/reslice_tobi.py` and **drop the colons** so JS `sheet:` paths never hit the URL scheme problem.

## Raw uploads → usage (32 `masked_man_*` files)

| # | Raw upload | Stage | Wired as | Derived sheet |
|---|---|---|---|---|
| 1 | `masked_man_idle.png` | 1 | `idle` | `masked_man_idle_uniform.png` |
| 2 | `masked_man_run.png` | 1 | `walk` + `run` | `masked_man_run_uniform.png` |
| 3 | `masked_man_dash.png` | 1 | `dash` | `masked_man_dash_uniform.png` |
| 4 | `masked_man_dash_combo.png` | 1/2 | `dashCombo` + **`heavy`** normal | `masked_man_dash_combo_uniform.png` |
| 5 | `masked_man_jump.png` | 1 | `jump` + `fall` (reuse) | `masked_man_jump_uniform.png` |
| 6 | `masked_man_block.png` | 1 | `guard` | `masked_man_block_uniform.png` |
| 7 | `masked_man_hit:get_up.png` | 1 | `hurt` / `hurt_air` / `knockdown` / `getup` (1 sheet → 4, markers dropped) | `masked_man_{hurt,hurt_air,knockdown,getup}_uniform.png` |
| 8 | `masked_man_intro.png` | 1 | `intro` (`introPool`) | `masked_man_intro_uniform.png` |
| 9 | `masked_man_up_attack.png` | 2 | **`up`** launcher + **`light`** (first 2f) | `masked_man_up_attack_uniform.png` |
| 10 | `masked_man_down_air_attack.png` | 2 | **`down_air`** | `masked_man_down_air_uniform.png` |
| 11 | `masked_man_air_kunia_throw.png` | 2 | **`air`** (kunai throw) | `masked_man_air_kunia_uniform.png` |
| 12 | `masked_man_air_kunia_throw_projectile.png` | 2 | air-kunai projectile | `masked_man_kunia_proj_uniform.png` |
| 13 | `masked_man_chain_grab.png` | 3 | `tobiChainGrab` (whip; ENEMY-marker frame dropped) | `masked_man_chain_grab_uniform.png` |
| 14 | `masked_man_chain_grab:attack_1.png` | 3 | `tobiChainAttack1` (reach/snag) | `masked_man_chain_attack1_uniform.png` |
| 15 | `masked_man_chain_snatched_combo.png` | 3 | `tobiChainSnatched` (pull; ENEMY-marker + dash frames dropped) | `masked_man_chain_snatched_uniform.png` |
| 16 | `masked_man_hard_chain_smash_down.png` | 3 | `tobiChainSmash` (finisher) | `masked_man_chain_smash_uniform.png` |
| 17 | `masked_man_hard_chain_smash_down_effects.png` | 3 | chain-smash dust FX (`tobi_chain_smash_fx`) | `masked_man_chain_smash_fx_uniform.png` |
| 18 | `masked_man_Kamui_activation.png` | 4 | `tobiKamuiActivate` (intangibility + portal/grab cast) | `masked_man_kamui_activation_uniform.png` |
| 19 | `masked_man_Kamui_portal_effect.pgn.png` | 4 | self-portal FX (`tobiKamuiPortal`) | `masked_man_kamui_portalfx_uniform.png` |
| 20 | `masked_man_fire_ball_jutsu.png` | 5 | `tobiFireCast` (exhale) | `masked_man_fire_cast_uniform.png` |
| 21 | `masked_man_fire_ball_jutsu_projectilez_meant_to_be_giant.png` | 5 | **main giant fireball** (grow band) + **sub-fireballs** (disperse band) | `masked_man_fire_giant_uniform.png` + `masked_man_fire_sub_uniform.png` |
| 22 | `masked_man_explosion_effects.png` | 5 | Fire Phoenix burst FX (`tobiFireBurst`) | `masked_man_fire_explosion_uniform.png` |
| 23 | `masked_man_9_tails_summon.png` | 6 | **HELD** — Tobi's crouch-to-summon pose; the caster is hidden during the cinematic (`_tobiKuramaHide`), so it isn't drawn. Reserved. | — |
| 24 | `masked_man_9_tails_summon_effects_part_1.png` | 6 | **HELD** — wide chakra-wave FX; the cinematic's ACTIVATE uses the ground-eruption sheet. Reserved for polish. | — |
| 25 | `masked_man_9_tails_summon_effects_part_2.png` | 6 | fox **RISE** pose (all-fours) | `masked_man_fox_rise_uniform.png` |
| 26 | `masked_man_9_tails_summon_effects_part_3.png` | 6 | fox **CHARGE/FIRE** pose (rearing/roaring) | `masked_man_fox_roar_uniform.png` |
| 27 | `masked_man_9_tails_summon_effects_part_5.png` | 6 | **HELD** — a 3rd fox-pose variant (howl); RISE + ROAR already cover the beats. Reserved. (Note: source has no `part_4`.) | — |
| 28 | `masked_man_9_tails_summon_ground_effects.png` | 6 | ACTIVATE ground-eruption FX | `masked_man_summon_ground_uniform.png` |
| 29 | `masked_man_tailed_beastBomb_projectile.png` | 6 | Tailed Beast Bomb (Bijūdama, frame 4 = big sphere) | `masked_man_bijuu_uniform.png` |
| 30 | `masked_man_tailed_beastBomb_projectile_part_2.png` | 6 | **HELD** — a 2nd bomb-forming variant; the primary bomb sheet covers the charge→fire. Reserved. | — |
| 31 | `masked_man_transparent.png` | 7 | **portrait source** (bust extracted from the idle frame; this is the full source sheet) | `tobi_portrait.png` |
| 32 | `masked_man_jus_by_angi1997_d5t1wcf.png` | — | **REFERENCE** — the original DeviantArt source sheet (identical 1244×4903 to `transparent`). | — |

**Utilization: 27 wired · 4 held-with-reason · 1 reference sheet = 32/32 accounted.**
The 4 held files are redundant beast/bomb pose variants + one caster-hidden summon pose — all reserved
for later cinematic polish, none dropped silently (same pattern as MADARA/ICHIGO reserved content).

## Source files touched (all additive; Obito untouched)
- **NEW:** `tobiNineTailsCinematic.js`, `tools/reslice_tobi.py`, `TOBI_ASSET_MAP.md`,
  `harness/tobi.test.mjs`, `harness/tobi_stage{1..6}_shots.mjs`, `tobi_portrait.png` + all `*_uniform` sheets.
- **EDITED (additive):** `characters.js` (roster object + export), `skins.js` (default skin),
  `spritesheets.js` (idle gate), `abilities.js` (`updateTobiCombat` / chain-grab / Kamui-family /
  `fireTobiFirePhoenix` / `executeTobiUltimate` + 2 dispatch cases), `game.js` (imports, speed-tier set,
  per-frame drivers, body-ghost OR, `drawTobiKamuiAura`, cinematic freeze/draw/clear, harness hooks,
  snap fields), `package.json` (test scripts).

## `_tobi*` state namespace (isolation guarantee)
`_tobiKuniaThrown`, `_tobiChainPhase/_tobiChainTimer/_tobiChainVictim/_tobiChainSnag/_tobiChainHit/_tobiChainCd`,
`_tobiIntangible/_tobiPhased/_tobiClock`, `_tobiKuramaHide`. The only deliberately-shared name is the
engine grab contract `_grabTeleport` (read by `combat.updateGrab`) — a **per-instance** field, exactly
like `_spriteCastMove` / `teleportFlash` / `isGrabbed`, so it never couples Obito and Tobi.
