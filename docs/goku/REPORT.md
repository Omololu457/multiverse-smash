# GOKU — FINAL REPORT (feat/goku)

A clean-slate rebuild of **Goku (Dragon Ball)** as a 7-level transformation-ladder
fighter, built from the attached teal sheet. No old-Goku code or art was reused; the
deleted stub was un-wiped and rebuilt in place. Branch `feat/goku` — merge with
`git checkout main && git merge --ff-only feat/goku`.

---

## 1. Per-form sprite counts
All form art is **recolour** (pose-preserving hair-region recolour of the base frames) —
there are **0 transplanted** heads and **0 direct** donor-frame bodies (the sheet has no
distinct form bodies except the gold SSJ cluster, which the recolour leaves as-is).

| form | recoloured (confident) | fallback | eyes px | notes |
|------|-----|-----|-----|-----|
| SSJ  | 358 | 37 | 739 | gold |
| SSJ2 | 358 | 37 | 660 | brighter/whiter gold ramp (identity = code lightning, deferred) |
| SSJ3 | 358 | 37 | 739 | **no SSJ3 donor exists** → SSJ-gold + eyebrow removal (transplanted = 0) |
| God  | 358 | 37 | 758 | red-orange |
| Blue | 358 | 37 | 741 | exact `#0b3887→#c9f6ff` ramp |
| UI   | 358 | 37 | 660 | silver |

(395 total frames; 37 fallback = knockdown / face-down / extreme-tilt frames.) The frames
the engine actually samples are sliced into per-action uniform strips
(`goku_<form>_<action>_uniform.png`); one frame map (`characters.goku.animationData`)
serves every form, the sheet swapped per form via `_skinAnim = GOKU_FORM_ANIM[form]`.

---

## 2. Inputs chosen (and why)
All ladder controls sit on Goku's dedicated **Charge** button (`P` for P1), the universal
DBZ idiom — so there is **no collision** with normals/specials/ultimate/jump, and it's
immediately discoverable:

| action | input | why |
|--------|-------|-----|
| **KI CHARGE** | hold **Charge** | fills Ki (vulnerable, powering-up pose) — the familiar build-up |
| **TRANSFORM (climb +1)** | hold **Charge** → **release** | exactly how Piccolo/Frieza/Vegeta transform here — players already know it |
| **POWER DOWN → Base** | hold Charge + **Back**, release | deterministic (direction, not wall-clock tap timing) |
| **KAIOKEN toggle** (Base/Blue) | hold Charge + **Down**, release | same modal button; frame-deterministic |

**Up is deliberately avoided** — `up` and `jump` are both bound to `w`, so Charge+Up just
jumps (this was the original "can't transform" bug). Normals = Light/Heavy/UpAttack;
specials = Special + direction; ultimate = the Ultimate button.

> Economy note: climbs are **threshold-gated and free** (Ki is *not* spent on a climb; each
> form drains Ki/s and drops a level at 0). The brief's per-climb "cost" column became a Ki
> **threshold** — a flat cost + hold-release would cap Ki far below the 50-cost ultimates.
> Ki is therefore preserved for supers, keeping the "transform vs super" tension.

---

## 3. Level table (as built)
| Lvl | Form | Ki threshold | Dmg (outgoing) | Speed | Ki drain/s | Transform frames |
|-----|------|------|------|------|------|------|
| 0 | Base | – | **1.00** | 1.00 | 0 | – |
| 1 | SSJ | 25 | 1.10 | 1.05 | 0.5 | 30 |
| 2 | SSJ2 | 40 | 1.18 | 1.10 | 1.0 | 30 |
| 3 | SSJ3 | 55 | 1.28 | 0.92 | 3.0 | 90 |
| 4 | God | 65 | 1.32 | 1.12 | 1.0 | 40 |
| 5 | Blue | 80 | 1.38 | 1.15 | 0 idle | 30 |
| 6 | Ultra Instinct | 100 (from Blue) | 1.45 | 1.20 | timer 15 s | 60 |

Base is **exactly 1.00** (combo-standard in Base unchanged). Speed scales walk/run/dash
(via `fighter.baseSpeed`), never startup frames. At Ki 0 Goku drops one level (20-frame
gasp). UI ends (timer/Ki/grab) → Base + 6 s exhaustion (no transform/Kaioken). Zenkai: if
Goku lost the previous round he starts +25 Ki with a gold flash.

---

## 4. Move list + frame data
**Normals** (shared by every form, recoloured per form; damage × form mult):
| move | input | frames (s/a/r) | dmg | notes |
|------|-------|------|------|------|
| Light (jab) | Light | 4/3/10 | 45 | quick |
| Heavy (side kick) | Heavy | 8/4/18 | 85 | kick |
| Up-Attack (uppercut) | UpAttack | 6/4/8 | 70 | launcher (anti-air) |
| Air | air Light | 5/3/10 | 60 | aerial strike |
| Down-Air (dive) | air Down+Light | 9/4/14 | 80 | spike |
| Crouch Light (sweep) | crouch Light | 4/3/10 | 40 | low, dark-blue sweep arc |
| Crescent Kick (launcher) | **Fwd+Heavy** | 8/5/18 | 70 | spinning-kick launcher (variety) |
| Throw | Grab | 6/3/14 | 30 | — |

**Specials** (Special + direction; scale by form):
| special | input | effect |
|---------|-------|--------|
| **Kamehameha** | neutral / Down / air Special | code-drawn **energy beam** (white core + form-colour + muzzle orb), real cupped-hands cast; air angles down; cost 25 Ki |
| **Rapid Fist Barrage** | Fwd+Special | 6 staggered guaranteed hits + knockback finisher; cost 20 |
| **Afterimage (zanzoken)** | Back+Special | i-frame back-slip + ghost + flash; cost 8, cooldown |
| **Instant Transmission** | Up+Special | reappear behind the opponent (i-frames); from SSJ+ chains a point-blank Instant Kamehameha; cost 15 |

**Ultimates** (Ultimate button — contextual per form):
Base **Spirit Bomb** (arms-raised gather → huge sphere hurled down) · SSJ **Super
Kamehameha** · SSJ2 **Meteor Smash** (barrage→up-kick→aerial→double-fist hammer) · SSJ3
**Dragon Fist** · God **God Kamehameha** · Blue **Kaioken×10 Kamehameha** (forces Kaioken
on) · UI **Autonomous Assault** (4 afterimage strikes → palm blast). All cast + connect
(216/198/204/192/269/281/216 dmg in test).

**Form powers:** Base = Kaioken + Spirit Bomb · Blue = Kaioken returns · God = divine-ki HP
regen (~0.3%/s up to entry HP) · **UI auto-dodge** = in Ultra Instinct + neutral, an
incoming strike/projectile is slipped for 8 Ki (silver shimmer + ghost), opening a 20-frame
counter-hit window (×1.2 dmg); grabs/unblockables/ultimates and attacking/recovery are NOT
dodged (baitable). Kaioken = Base ×2 / Blue ×10-feel, drains HP, floors at 10%.

**Intro** = excited hop · **Win** = arms-raised cheer · **Lose** + low-HP(<25%) idle =
battle-damage shirtless frames.

---

## 5. Sound mapping
Per-form transform cue layered over the shared DB sting (`sound.playJuiceSfx`): SSJ
`charge_swell_riser` · SSJ2 `crack_sizzle_bright` · SSJ3 `boom_huge_02_roar` (biggest) ·
God `energy_hum_low` · Blue `sting_pitch_rise_hold` · UI `energy_tone_hold` (quiet high
tone). Specials: Kamehameha `charge_hum_rise`→`boom_medium_01` · Instant Transmission
`warp_wobble_01` · Afterimage `swish_fast_01` · Barrage `hit_flurry_01` · Crescent
`swish_fast_02`. No new audio files.

---

## 6. HUD / AI / sync
- **HUD:** 7 level pips (lit up to the current form, per-form colours, active glows) + a
  thin UI-timer / post-UI-exhaustion bar under the health bar (`_drawGokuLadderHud`, both
  Classic + Themed panels). Ki gauge = the energy panel. Mugshot swaps per form.
- **CPU AI:** transforms when it has Ki + space, never sits in SSJ3 at low Ki, waits in UI,
  drops toward Base late in a losing round (Spirit Bomb). Deterministic, non-cheating.
- **LAN / replay / companion:** netcode is lockstep → every `_goku*` field (form, timers,
  Ki, Kaioken) is RNG-free sim state computed identically on both peers. `test:determinism`
  14/0 and `test:net-lockstep` 6/6 confirm sync.
- **Training:** Goku honours the engine's `infiniteEnergy` flag (meter-free / training
  option) → Ki pinned to max, transforms/supers free, no form drops.

---

## 7. Test results
Guards: `determinism` **14/0** · `combo-standard` **225/9** (the 9 are pre-existing
gogeta/goku_rose; Goku unregressed — classified + core normals) · `roster-integrity`
**green** · `net-lockstep` **6/6**. Every other character's frame data is unchanged (all
edits are Goku-gated). Goku harnesses: `transform_input` 7/0 · `ladder` 27/0 · `specials`
6/0 · `ultimates` 15/0 · `autododge` 7/0 · plus the normals/variety checks.

**RENDER CHECK — PASS:** booted (goku vs naruto), both fighters + HUD render on the new
sheets, and Goku transforms via the real keyboard (hold-Charge→release) through all 7
forms — screenshot-verified (base → SSJ gold with aura, SSJ3, the Kamehameha energy beam
streaking into the opponent, the ladder pips lit to the current form).

---

## 8. Ledger summary (unused pieces)
Zero orphan source frames — every row maps to an animation or effect (see
`docs/goku/LEDGER.md`). The only "unused" items are the **SSJ3 donor frames, which do not
exist** on the sheet (SSJ3 is a full fallback). SSJ2 and Blue need no new source frames
(recolour/code FX). The dark-blue sweep arc and pale crescent arc are baked into the
crouch-sweep / crescent frames.

---

## 9. Play-test first
1. **Transform:** hold **P** and release → Super Saiyan; keep going through SSJ2/3/God/
   Blue; at full Ki in Blue, release → **Ultra Instinct** (watch the pips fill + the 15 s
   timer bar). Tap Charge+Back to power down; Charge+Down for Kaioken.
2. **Kamehameha** (neutral Special) — confirm it reads as a proper energy beam, and that
   the colour changes per form.
3. **UI auto-dodge** — in Ultra Instinct, stand in neutral and let the CPU attack; Goku
   should slip hits (silver shimmer) until Ki runs low.
4. **Ultimates** per form (Ultimate button) — Spirit Bomb in Base, the per-form
   Kamehamehas, Dragon Fist in SSJ3.
5. **Zenkai** — lose a round, confirm the next starts with extra Ki + a gold flash.
6. Balance pass: the free-climb threshold economy + 15 s UI timer are the main tuning
   knobs; SSJ3's 3 Ki/s drain vs its 1.28× power is the key risk/reward to feel out.
