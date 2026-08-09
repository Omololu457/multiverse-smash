# OBITO UCHIHA — Asset Map & File Utilization

Naruto universe, 7th Naruto sprite char (29th sprite char overall), rosterKey `obito`.
Full 8-stage build. Every uploaded `obito_*` / `kamui_*` file is accounted for below.

**Pipeline:** raw strips are resliced into uniform, bottom-aligned cells via `tools/reslice_obito.py`
(→ `obito_*_uniform.png`). The engine renders the `_uniform` copies; the raw strips are their sources.

## WIRED — live in the kit

### Resliced uniform sheets (27) — all referenced from characters.js `obito.animationData` / obitoJuubiCinematic.js
| File | Source strip | Used as |
|---|---|---|
| obito_idle_uniform.png | obito_melee_idle.png | idle |
| obito_run_uniform.png | obito_melee_run.png | walk + run |
| obito_jump_uniform.png | obito_melee_jump.png | jump |
| obito_fall_uniform.png | obito_melee_fall_to_jump_up.png | fall |
| obito_dash_uniform.png | obito_melee_dash.png | dash |
| obito_back_dash_uniform.png | obito_melee_back_dash.png | backDash (dormant — engine gap) |
| obito_crouch_uniform.png | obito_melee_crouch.png | crouch (dormant — engine gap) |
| obito_block_uniform.png | obito_melee_block.png | guard |
| obito_block_air_uniform.png | obito_melee_block_air.png | blockAir (dormant — engine gap) |
| obito_hit1_uniform.png | obito_melee_taking_damage_1.png | hurt |
| obito_hit2_uniform.png | obito_melee_taking_damage_2.png | hurt_air |
| obito_hit3_uniform.png | obito_melee_taking_damage_3.png | knockdown |
| obito_hit4_uniform.png | obito_melee_taking_damage_4.png | getup |
| obito_light_uniform.png | obito_melee_hit_1.png | light + rekka obitoRod1 |
| obito_heavy_uniform.png | obito_melee_hit_2.png | heavy + rekka obitoRod2 |
| obito_up_uniform.png | obito_melee_up_attack.png | upAttack |
| obito_air_uniform.png | obito_melee_hit_3:up_attack.png | airAttack + rekka obitoRod3 |
| obito_downair_uniform.png | obito_melee_down_air_attack.png | downAir |
| obito_shurcast_uniform.png | obito_melee_shuriken_throw.png | shuriken/giant cast |
| obito_shurcast_air_uniform.png | obito_melee_shuriken_throw_air.png | air-shuriken cast |
| obito_rodcast_uniform.png | obito_rod_throw.png | rod cast |
| obito_teleport_uniform.png | obito_melee_teleport_transparent.png | Kamui blink — **self-portal + teleport-grab ONLY** (the speed-tier double-tap uses the DASH pose, not this) |
| obito_kamui_activate_uniform.png | obito_melee_intangibility_activation.png | Kamui intangibility INITIATION pose — the ONE visual tell (plays once at toggle-on) |
| obito_shur_proj_uniform.png | obito_melee_shuriken_projectile.png.png | shuriken projectile (4-frame spin) |
| obito_giantshur_proj_uniform.png | obito_melee_giant_shurikan.png | giant-shuriken projectile (4-frame spin) |
| obito_juubi_uniform.png | obito_10_tails.png (vertical 3→horizontal) | Juubi giant (rise/roar/howl) |
| obito_juubi_summon_uniform.png | obito_10_tails_summoning.png | Juubi summon FX |
| obito_mokuton_uniform.png | obito_MOKCITON.png | Mokuton wood-release FX |

### Direct-use art (3)
| File | Used as |
|---|---|
| obito_rod_throwprojectile.png.png | rod projectile (single-frame, original — over-cropped by reslice, so used raw) |
| obito_portalfx.png | Kamui portal-ring FX (cropped one clean spiral from kamui_portal_transparent.png) |
| obito_portrait.png | char-select mugshot (bust from idle frame 0, Stage 8) |

## SOURCE — raw strips (content is live via their `_uniform` copy above)
obito_melee_idle · run · jump · dash · back_dash · crouch · block · block_air · fall_to_jump_up ·
taking_damage_1-4 · hit_1 · hit_2 · hit_3:up_attack · up_attack · down_air_attack ·
shuriken_throw · shuriken_throw_air · rod_throw · teleport_transparent · giant_shurikan ·
shuriken_projectile.png.png · 10_tails · 10_tails_summoning · MOKCITON. (24)

## REFERENCE — master sheets (Stage-0 cross-match; slices came from these)
- obito_melee_transparent.png (929×2498) — melee master sheet.
- obito_juubi_transparent.png (925×2941) — Juubi/ultimate master sheet.

## HELD / not wired (5) — no gameplay hook, kept for future
- **obito_KAMUI+GEDO_MAZO.png** — Gedo Mazo (Demonic Statue). No summon built; held.
- **obito_melee_chakra_charge.png** — charge pose. Obito has no charge move (the charge button is the
  Kamui-intangibility toggle), so no charge animation is needed. Held.
  (obito_melee_intangibility_activation.png is now WIRED — see the resliced obito_kamui_activate_uniform
  above. CORRECTION: it is the intangibility's ONE visual tell, played once at the toggle-on moment. The
  old procedural sustained ghost/swirl (drawObitoKamuiAura) was REMOVED — while intangible he now looks
  completely normal, so rapid on/off is a genuine bait/stall tool. drawObitoKamuiAura is retained unused.)
- **obito_Kamui_portal.png** — the OPAQUE portal source (Stage 0). Superseded by
  kamui_portal_transparent.png (RGB-identical, alpha-cut), from which obito_portalfx.png was cropped.
- **obito_melee_teleport.png** — the OPAQUE teleport source. Superseded by
  obito_melee_teleport_transparent.png (the one that was resliced).

## Wiring touchpoints (code)
- `characters.js` — `obito` entry (stats + basic_attacks + specials + animationData) + export.
- `skins.js` — `obito` Default skin. `spritesheets.js` — idle gate.
- `abilities.js` — rekka (updateObitoCommandCombat + fireObitoCommand), ranged specials + Kamui portal
  (executeObitoSpecial), Kamui intangibility (updateObitoKamui/toggle/deactivate), teleport grab
  (fireObitoKamuiGrab), ultimate (executeObitoUltimate). Dispatched via triggerSpecial/triggerUltimate.
- `combat.js` — the `_grabTeleport` non-damage grab payload branch in updateGrab.
- `sprite.js` — MOVE_TO_ACTION identity maps (obitoRod1/2/3, cast poses, obitoTeleport).
- `game.js` — command-combat dispatch, generic-grab suppression, Kamui P-TAP toggle + per-frame driver +
  ghost render + drawObitoKamuiAura, speed-tier feat allowlist + blink pose, Juubi cinematic integration
  (freeze/draw/clear/innerCine), harness probes.
- `obitoJuubiCinematic.js` — the Ten-Tails Bijūdama freeze-cinematic.
- `tools/reslice_obito.py` — the reslice pipeline (stage1/2/3/5 jobs).
- Harnesses: `obito_stage{1,2,3,4,5,6,7}_shots.mjs` + consolidated `obito.test.mjs`.
