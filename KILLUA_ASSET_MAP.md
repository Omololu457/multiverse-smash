# KILLUA_ASSET_MAP.md

Asset inventory + build plan for **Killua Zoldyck** (rosterKey `killua`, universe
`hunter_x_hunter` — 2nd HxH char after Netero, 13th sprite char overall).

All frame counts below are **measured** via `harness/slice_scan.mjs` (alpha-gutter
scan), not assumed from sheet-width/count division. Filename typos are preserved
exactly as uploaded (`killua_downward_yoyo_attack.pgn.png`, `.com.png`, `trow`).

The source art is ~40 **separate per-action JUS PNGs** (not one atlas). Non-uniform
strips get RE-SLICED to uniform cells (`harness/reslice.mjs → *_uniform.png`) so the
engine slices by a single pitch without horizontal jitter (Itachi/Netero precedent).

---

## STEP 1 — Raw inventory (measured dimensions + frame-island counts)

### Movement / state (Stage 1 — WIRED)
| file | dims | islands | role |
|---|---|---|---|
| `killua_idle.png` | 73×53 | 2 | idle ✅ resliced → `killua_idle_uniform.png` (2f, 27×53) |
| `killua_run.png` | 412×48 | 8 | run/walk/dash ✅ → `killua_run_uniform.png` (8f, 52×48) |
| `killua_block.png` | 84×58 | 2 | guard ✅ → `killua_block_uniform.png` (2f, 37×58) |
| `killua_hit.png` | 237×44 | 4 | hurt ✅ → `killua_hit_uniform.png` (4f, 58×44) — a REAL hit strip (unlike Itachi) |
| `killua_dodge_1.png` | 131×63 | 3 | jump stopgap ✅ → `killua_jump_uniform.png` (3f, 41×63) |
| `killua_dodge_2.png` | 87×49 | 2 | spare dodge poses (unused; candidate for a real dash/backdash later) |
| `killua_intro.png` | 106×58 | — | reserved as select **portrait** (Stage 6: maybe promote to intro anim) |
| `killua_intro_2.png` | 454×60 | — | longer intro sequence (unused; Stage 6 candidate) |

### Melee candidates (Stage 2 — normals + command-normal chain)
| file | dims | islands | likely slot |
|---|---|---|---|
| `killua_foward_punch.png` | 350×51 | 9 | **light** (fast jab string) |
| `killua_foward_kick.png` | 419×48 | 7 | **heavy** (committed kick) |
| `killua_side_kick.png` | 206×52 | 5 | chain / poke |
| `killua_lower_kick.png` | 190×53 | 4 | low / chain |
| `killua_up_kick.png` | 207×60 | 5 | **up** launcher candidate |
| `killua_upward_kick.png` | 268×52 | 6 | up / chain |
| `killua_up_360_kick.png` | 226×61 | 6 | chain finisher (spin) |
| `killua_up_attack.png` | 154×56 | 4 | **up** candidate (anti-air) |
| `killua_down_air_attack.png` | 207×66 | 5 | **down_air** (dive) |
| `killua_barrage_punch_part_1..4.png` | ~335×58 | 4 each | **air** / rekka barrage (4 sequential parts → Toji-Rekka-style chain) |
| `killua_grab.png` | 311×57 | 8 | grab startup |
| `killua_grab_attack.png` | 118×54 | 3 | grab followup |

> 12+ melee islands ≫ 5 normal slots → overflow routes into a cancelable
> command-normal chain (Toji-Rekka architecture), exactly as every prior char.
> The 4-part `barrage_punch` is the natural rekka spine.

### Yo-yo special (Stage 3 — throw/travel/retract projectile)
| file | dims | islands | role |
|---|---|---|---|
| `electric_yoyo_trow_part_1.png` | 163×58 | 4 | throw wind-up (character anim) |
| `electric_yoyo_trow_part_2.png` | 274×46 | 3 | throw extend |
| `electric_yoyo_trow_part_3.png` | 106×51 | 3 | throw release |
| `electric_yoyo_trow_part_1..5_projectile.png` | 28–46px | 1 each | **the yo-yo itself in flight** (5 spin frames) — independent projectile |
| `killua_upper_yoyo_attack.png` | 649×110 | 12 | upward yo-yo swing (melee-range special) |
| `killua_upper_yoyo_attack_1/_2_specail.png` | — | — | variants |
| `killua_downward_yoyo_attack.pgn.png` | 579×72 | 11 | downward yo-yo (air special) |
| `killua_super_yoyo_attack_combo_part_1/2.com.png` | 623×65 | 14 | super yo-yo combo |
| `killua_yoyo_taunt.png` | 216×108 | 5 | taunt (defer — no taunt action yet, Naruto/Saiki precedent) |

### Electric / assassin specials (Stage 4)
| file | dims | islands | role |
|---|---|---|---|
| `killua_electric_ball_attack.png` | 705×75 | 11 | electric ball projectile cast |
| `killua_electric_push.png` | 443×62 | 11 | Lightning Palm / electric shove |
| `killua_teleport_attack_part_1.png` | 156×72 | 3 | blink strike (afterimage) |
| `killua_teleport_attack_part_2.png` | 244×73 | 5 | blink strike follow |
| `killua_charge_animation_part_1.png` | 640×91 | 12 | Nen-electric charge aura buildup |
| `killua_charge_animation_part_2.png` | 475×102 | 6 | charge aura full/loop |

### JUS master sheet
| file | dims | notes |
|---|---|---|
| `killua_jus_custom_sprites_recolours_..._dbrlgcc.png` (+ ` copy`) | 724×3000 | full unsliced master; contains blue-electric-aura poses. Source for any gap-fills; not directly sliceable cleanly. |

---

## STEP 2/3 — Cross-connection analysis (yo-yo three-phase read)

The three-phase "boomerang" shape flagged in the confirmed-design doc is **supported
by the frame content**: a character throw sequence (`electric_yoyo_trow_part_1/2/3`,
4/3/3 frames) + **5 dedicated small projectile sprites** (`*_projectile.png`,
28–46px) that read as the yo-yo spinning in flight, separate from Killua's body.

Retraction: the 5 projectile spin frames can serve BOTH the outbound and return trip
(reuse). Whether the return trip carries a hitbox vs. is purely visual is NOT decided
here — **Stage 3 must confirm against travel/retract behavior before wiring**, per the
brief. Current lean: outbound-hit + return-visual (simpler, avoids double-hit), but
the spin art would support a return-hit if wanted.

---

## GODSPEED (Ultimate) — PATH DETERMINATION ★ (Stage 1 mandate)

**DECISION: OVERLAY PATH** (global speed/damage buff + electric afterimage overlay on
base Killua animations), NOT a Netero/Susanoo-style dedicated alternate-form swap.

**Reasoning (from the actual inventory above):**
1. There is **NO dedicated Godspeed alternate-form move-set** in the batch — no
   separate godspeed idle / run / attack strips. Nothing is labeled or visually a
   distinct Godspeed pose-set the way Netero's Guanyin frames were.
2. What DOES exist that reads "Godspeed/lightning" is **effect/activation art, not a
   move-set**: `killua_charge_animation_*` (Nen-electric aura buildup → full aura) and
   `killua_teleport_attack_*` (blink afterimage frames). These are perfect for an
   activation cinematic + overlay, but they are not idle/walk/attack states.
3. The JUS master sheet has blue-aura poses, but they're **unsliced** and would need
   hand-extraction; even then they're recolors of base poses, not a separate kit —
   which is the definition of the overlay case.
4. Precedent: this is the **Itachi-Mangekyou tier** the confirmed-design doc names as
   the fallback — buff + screen-space overlay on existing animations, reusing the
   cinematic-overlay architecture. NOT the `_canvasHeightFrac` giant/alt-form path.

**Stage 5 plan (overlay):** near-max meter cost; on activation play the
`charge_animation` electric-aura cinematic, then apply a global speed + damage buff
and layer an afterimage/electric speed-line overlay (enriched with the real
`teleport_attack` afterimage + `charge` aura frames rather than a purely procedural
effect) over base Killua's normal animations for the duration.

---

## Deferred / missing (known-gaps list)
- **jump**: no dedicated jump art → using `dodge_1` 3-pose strip as a leap stopgap.
- **walk/dash**: no dedicated strips → reuse the run strip (slower/faster).
- **taunt**: `killua_yoyo_taunt.png` exists but DEFERRED (no taunt action yet, like
  Naruto/Saiki) — would enroll in the universal hold-Down heal taunt system when wired.
- **intro**: `killua_intro.png`/`_intro_2.png` exist; intro currently points at `idle`
  (Netero precedent). Stage 6 decides whether to promote to a real intro animation.
- **portrait**: no dedicated mugshot in the batch → `killua_intro.png` crop as a
  stand-in. Stage 6 re-checks.
- **win/lose/getup/knockdown**: no dedicated strips → shared end screens + `hurt`
  fallback (legacy path), like most of the roster.
