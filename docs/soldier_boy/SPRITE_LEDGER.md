# Soldier Boy — Sprite Ledger

Source sheet: `soldierboy_sprite_sheet_by_crow_animaraz_by_metalsonictypeone_dlwzetj.png`
(RGBA, 2994×8736, transparent gutters — **cut on alpha**, all four corners are `(0,0,0,0)`).

Slicer: `tools/reslice_soldier_boy.py` — horizontal-gutter **row bands** → per-band vertical-gutter
**frame runs** (left→right) → tight content bbox → repacked into one uniform feet-aligned cell
(centered on the **body** center, i.e. the widest opaque horizontal slab, so an extended cape/gold-item
streak never shoves the body off-center). **NEAREST only, never interpolated.**

Facing: Soldier Boy is drawn **facing RIGHT** on the sheet; the engine draws P1 un-flipped expecting
RIGHT, so **NO horizontal flip** is applied (unlike the Goku EB rip).

Detection result: **58 row bands, 265 frames** — a near-exact match to the best-effort inventory
(every row count aligns 1:1; detection found **row 28 = 3f** and **row 34 = 17f** where the inventory
estimated 4 / 18 — the real frames win, this ledger is authoritative). No frame is unused: every row
has a home strip below (`soldier_boy_<key>_uniform.png`), and purely-cosmetic FX rows are documented
as projectile / overlay art drawn in `abilities.js` (not `animationData`).

Notation: `row R fN` = 1-based row band R, 0-based frame N within the band.

## Movement / state
| Row(s) | Reads as | Strip (`soldier_boy_*_uniform.png`) | animationData key | Triggering state |
|---|---|---|---|---|
| 1 (5f) | upright, gold shield on back, small bob | `idle` | `idle`, `intro` | neutral idle loop; also the one-shot intro (no dedicated entrance on the sheet) |
| 2 (2f) | gold shield braced across front | `block` | `guard` | standing block / **Gold Brace** (Phase 6) |
| 3 (3f) + 9 (1f) | compact crouched guard / single crouch | `crouch` | `crouch` | holding Down (crouchIdle) |
| 4 f0–5 (6f) | upright movement cycle | `walk` | `walk` | ground walk (reversed for backpedal) |
| 4 f6–11 (6f) | faster movement cycle | `run` | `run` | forward run / dash momentum |
| 5 f0–2 (3f) | upright + 2 stretched-tall | `jump` | `jump` | jump start + rise |
| 5 f3–4 (2f) | 2 compact low | `fall` | `fall` | descent / land |
| 6 (8f) | airborne flips / tumbles | `airflip` | — (reserved air-recovery art; documented) | sliced; rendered via nearest air pose |
| 8 (8f) | rolling / crouching low movement | `roll` | `dash` | ground dash / **Back Roll** (Phase 6) |
| 10 (9f) | low crouched transition poses | `crouchmove` | — (reserved crouch-transition art) | sliced; nearest crouch pose |
| 23 (5f) | crouch→stand | `crouchstand` | — (reserved) | sliced; nearest crouch pose |

## Normals
| Row(s) | Reads as | Strip | animationData key | Move (frame data) |
|---|---|---|---|---|
| 7 f0–2 + 16 (5f) | forward-leaning strike chain + arm-extend | `light` | `light` | **Jab** 5f / 22 / −1 |
| 7 f3–5 + 15 (6f) | strike windup + gold-shield swing | `heavy` | `heavy` | **Heavy** 14f / 62 / −6 |
| 12 (3f) | tall figure, arm raised high | `up` | `up` | **Launcher** 11f / 55 / −9 (launches) |
| 22 (3f) | low poses (hits low) | `low` | `low` | **Low** 7f / 30 / −4 |
| 24 (3f) | low sweep | `lowsweep` | — (reserved low-sweep art) | sliced; nearest low pose |
| 19 (8f) | high kicking poses | `kick` | — (reserved heavy-kick / win flourish art) | sliced; documented |
| 20 f0–2 (3f) | diagonal kicks | `air` | `air` | **Air attack** 8f / 38 / +2 on landing |
| 45 (5f) | airborne with gold item | `airkit` | — (reserved air-attack variant art) | sliced; nearest air pose |

## Specials / Ultimate
| Row(s) | Reads as | Strip | animationData key | Move |
|---|---|---|---|---|
| 28 (3f) | gold pieces flying out front | `shieldthrow` | `sbShieldThrow` | **Shield Toss** release (↓↘→+P, 15) |
| 34 (17f) | throw → disc → gold whip → recovery | `shieldspin` | — (full-anim reserve) | Shield Toss follow-through / recovery |
| 35 (6f) | thin gold streak slivers + fragments | `shieldproj` | — (projectile/debris art; spawnProjectile sheet) | Shield Toss boomerang projectile + hit debris |
| 39 (4f) | SMG firing | `smg` | `sbSMG` | **SMG Barrage** (↓↓+P, 20) — 6 bullets / 30f, hashed ±6px spread |
| 40 (4f) | rifle firing | `rifle` | `sbRifle` | **Rifle Shot** (↓↙←+P, 25) — piercing, 90, strong KB |
| 33 f0–2 + 17 (7f) + 18 (3f) | startup figures + low lunge + recovery | `goldrush` | `sbGoldRush` | **Gold Rush** (→→+P, 20) — armored lunge, 85 |
| 33 f3–8 (6f) | gold streak FX | `goldrushfx` | — (streak overlay art) | Gold Rush motion streaks |
| 41 (5f) | gold discs swirling around fighter | `cyclone` | `sbCyclone` | **Cape Cyclone** (→↓↘+P, 25) — 3×30 anti-air, upper-body invuln f3–8 |
| 37 f0–1 + 20 f3–5 + 31 (8f) | leap/dive + extended leg | `downair` | `sbDive` | **Diving Kick** (air ↓+P, 15) — angled overhead, 60 |
| 36 (4f) | figure raising weapon arm | `armeddraw` | `sbArmedDraw` | **Armed Mode** draw/holster (↓↓+Heavy) |
| 43 (4f) | SMG (armed) | `armedjab` | `sbArmedJab` | Armed Jab (SMG burst while armed) |
| 44 (4f) | rifle (armed) | `armedheavy` | `sbArmedHeavy` | Armed Heavy (rifle shot while armed) |
| 42 (4f) | weapon-arm aiming | `armedaa` | `sbArmedAA` | Armed anti-air normal |
| 38 (1f, wide) | figure on large gold object + swoosh | `ultpose` | `sbUltPose` | **NUCLEAR BURST** pose hold (↓↘→↓↘→+P, 100) |
| 29 (6f) | gold shard burst around figure | `ultblast` | `sbUltBlast` | Nuclear Burst detonation (radial blast) |
| 30 (2f) | low pair | `ultrecover` | `sbUltRecover` | Nuclear Burst recovery (90f lockout) |

## Hurt / knockdown / get-up
| Row(s) | Reads as | Strip | animationData key | State |
|---|---|---|---|---|
| 11 (3f) + 46 (3f) + 47 (3f) | striped-chest flinch (high/low/mid) | `hurt` | `hurt` | light hitstun |
| 13 (5f) | upright striped-chest stagger | `stun` | — (routed to `hurt` by sprite.js) | heavy hitstun / stun |
| 48 (4f) | dizzy pose | `dizzy` | — (reserved dizzy art) | documented; nearest hurt pose |
| 14 (2f) + 49/50/51 (3f each) | compact block-recoil pairs | `blockhit` | — (reserved block-hit art) | documented; block reaction |
| 21 (3f) + 25 (3f) | crouch hit poses | `crouchhit` | — (reserved crouch-hit art) | documented; nearest hurt pose |
| 26 (8f) | flat sprawled / crawling | `knockdown` | `knockdown` | knocked down (fall portion) |
| 27 (2f) + 32 (1f) | low pair + prone flat | `knockdownland` | — (reserved; routed to `knockdown`) | knockdown land / ground |
| 52 (7f) | falling back | `knockdownfall` | — (reserved knockdown-fall art) | documented |
| 53 (6f) | falling back (2nd seq) | `launchedfall` | — (reserved launched-fall art) | documented |
| 54 (5f) | ground tumble | `tumble` | — (reserved tumble art) | documented |
| 55 (4f) + 56 (3f) | lying → rising | `getup` | `getup` | getting up after knockdown |
| 55 (4f) | lying/rising (last frame = downed) | `lose` | `lose` | round-loss pose |
| 57 (4f) + 58 (3f) | standing recovery / upright with shield | `win` | `win`, `taunt` | victory pose + in-match taunt |

## Canon powers with no dedicated sprite
- **Nuclear blast (Ultimate):** no explosion art on the sheet → the wide `ultpose` (row 38) + shard-burst
  `ultblast` (row 29) frames carry the figure, and the radial nuclear flash / ring / particles / screen
  shake are **render-only** (white/orange palette overlay + hashed particles, OUT of `GAME_STATE`).
- **Muzzle flashes / bullets / boomerang shield / gold streaks:** drawn from the FX rows (`shieldproj`
  row 35, `goldrushfx` row 33 f3–8) as `spawnProjectile` / overlay art, not `animationData`.

Every one of the 58 rows is accounted for above. Strips referenced by `animationData` (`characters.js`
→ `soldierBoy.animationData`) ship as `soldier_boy_<key>_uniform.png` at the repo root; the reserved
(documented) strips are sliced and committed too so no pose is lost, and are wired as kit/FX art in the
later phases.
