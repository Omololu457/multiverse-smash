# BAKI HANMA — Kit Design (build spec)

Design pass following `BAKI_ASSET_MAP.md` (audit) — this maps every sliced animation to a gameplay
slot and specifies stats, archetype, moves, damage, cooldowns, ultimate and balance. **No engine code
is written yet**; this is the implementable blueprint for the staged build.

Baki Hanma — *Baki the Grappler / Baki* (Itagaki). A **pure hand-to-hand martial artist — no ki,
no chakra, no supernatural techniques** (per the audit's thematic gate). He fights with grounded
striking, combination punching at inhuman *speed* (not energy), reads/counters, and body-blow
pressure. His one iconic "power-up," the **Demon Back (Oni no Se)**, is a *muscle formation*, not an
energy aura — canon-legal to use as the ultimate.

---

## DESIGN FORKS (my pick ✓ — flag now if you'd rather the alternative)
1. **Currency model:** ✓ **Meterless, COOLDOWN-gated** (Zenitsu/Rengoku model — real recast-window
   currency), `hideResourceMeter: true`. *Not* Toji's flagged "pays-nothing" free kit. — Alt: a
   visible "Fighting Spirit" build-and-spend gauge.
2. **Ultimate = Demon Back:** ✓ a **cinematic self-transformation into a timed empowered form**
   (+dmg/+spd, super-armor on specials, enhanced barrage) — his signature. — Alt: a single guaranteed
   burst finisher (escalated shockwave punch).
3. **Mobility:** ✓ **`high`, spd 92 — grounded run-based approach** (he has a real run cycle; no
   teleport-blur). Differentiates him from Toji's `very_high` blink-dash. — Alt: `very_high`/96.
4. **Back-special = Counter** (defensive read) rather than a command throw — because the only throw
   art bakes in an opponent (`row_16b`) and can't be a solo player animation. See Open Gaps.

---

## 1. REGISTRATION
```
rosterKey:  "baki"
name:       "Baki Hanma"
universe:   "baki"            // NEW series "Baki the Grappler" — needs a universe-routing entry
                              //   (else falls back to the 'other' stage/select group, like pre-stage chars)
color:      "#8a1c1c"         // blood-crimson (shorts / UI accent)
portrait:   "./baki_portrait.png"   // from baki_portrait_headshot.png (MUGSHOT bust)
archetypes: ["melee","rushdown"],  primary:"melee",  secondary:["rushdown","grappler"]
introPool:  ["intro"]
hasSprites: true
spriteScale: ~1.65            // idle cell ~64px tall → ~106px on-screen target (tune at S1)
```

## 2. STATS — all IN-BAND, no roster records (peer group: Toji / Maki / Rengoku)
```
traits: { hasEnergy:false, energyType:"none", hideResourceMeter:true,
          mobility:"high", scaling:"aggressive", animeMovement:true }
stats:  { maxHealth:1160, maxEnergy:0, attack:94, defense:88, speed:92,
          maxJumps:2, jumpPower:32, dashSpeed:20, dashDuration:10, dashCooldownMax:26 }
```
| Stat | Value | In-band justification |
|---|---:|---|
| HP | **1160** | Between Tobirama 1120 / Maki 1180 — durable grappler, no record |
| Energy | **0** | Meterless, cooldown-gated (Zenitsu/Rengoku currency, not Toji's free kit) |
| Atk | **94** | Below the 98 ceiling (Netero/Omni-Man) and below Toji 96 / Sukuna 95 — strong, no record |
| Def | **88** | Defensive-genius read game; below Superman 92 / Toji 89 — upper, no record |
| Spd | **92** | Upper-mid, ties the Minato/Rengoku tier; **under the 96 teleport-blur gate** (grounded) |

**Currency = real-time recast windows** (per-special cooldowns below), not a meter. All specials
`cost:0`; each gated by its own `*Cd` counter. This is the constrained model, not the free one.

---

## 3. ASSET → SLOT MAP (every usable sliced file)
| Slice | Frames | Gameplay slot |
|---|---|---|
| `baki_row_02` STANCE | 8 | **idle** |
| `baki_row_03` WALK | 7 | **walk** |
| `baki_row_03b_dash` | 2 | **dash** |
| `baki_row_04` RUN | 8 | **run** |
| `baki_row_05` JUMP | 5 | **jump** (+ `fall` = last frame) |
| `baki_row_05b_guard` | 3 | **guard/block** |
| `baki_row_06` TAKING DAMAGE | 3 | **hurt** |
| `baki_row_06b_knockdown` | 6 | **knockdown → getup** |
| `baki_row_19` WIN | 4 | **win pose** |
| `baki_row_19b_lose` | 3 | **lose pose** |
| `baki_row_08` B ATTACK | 7 | **light** (jab-cross-hook string) |
| `baki_row_09` B+DOWN | 6 | **heavy** (liver / body blow) |
| `baki_row_10` B+UP | 4 | **up** (uppercut, launcher) |
| `baki_row_11` B+JUMP | 6 | **air** |
| `baki_row_14` Y+JUMP | 6 | **down_air** (diving kick) |
| `baki_row_12` Y+DOWN | 6 | **cmd rekka stage 1** (Fwd+Heavy body jabs) |
| `baki_row_13` Y+UP | 7 | **cmd rekka stage 2** (rising kick, launcher) |
| `baki_row_17` KOMA flurry | 7 | **N special** — Mach-Punch Barrage (tap) |
| `baki_row_15b` KOMA barrage | ~5 | **N special HOLD / Demon-Back-enhanced barrage** |
| `baki_row_16a` KOMA rush | ~11 | **F special** — Rushing Combination (advance → spin-kick) |
| `baki_row_15a` KOMA combo | 6 | **U special** — Rising Rush (anti-air launcher) |
| `baki_row_18a` shockwave | 4 | **D special** — Impact Shockwave (air-pressure AOE) |
| `baki_row_18b` run | 7 | approach frames for F-special dash-in (or alt run) |
| `baki_row_07` ULTIMATE ACTION flex | 3 | **ULTIMATE** — Demon Back transform pose |
| `baki_row_05b_guard`/idle | — | **B special** — Defensive Read (counter stance) |
| **Excluded** | | `row_16b` (opponent baked in), `row_01` (HUD lifebar), bonus box (Goku/energy-sword — non-canon), ref-photos/splash/header |

---

## 4. NORMALS (5) — `basic_attacks`
Frame data in the Toji/Maki/Saitama band; `damage` is RAW (engine applies ×0.60 → EFF in parens).
| Move | Anim | dmg RAW→EFF | startup/active/recovery | notes |
|---|---|---|---|---|
| `light` | row_08 | 52 → 31 | 3/3/8 | fast jab string, chains into itself / cmd rekka |
| `heavy` | row_09 | 92 → 55 | 7/4/15 | body blow; `rangeX:88 rangeY:44` |
| `up` (launcher) | row_10 | 76 → 46 | 5/3/7 | `launcher:true, launchVy:-32, selfVy:-7, airOK:false` |
| `air` | row_11 | 64 → 38 | 4/3/9 | neutral aerial |
| `down_air` (spike) | row_14 | 84 → 50 | 7/4/12 | diving kick, `knockbackY:+10` spike |

**Command normal — "Combination" (Fwd + Heavy, 2-stage rekka; Toji/Maki `updateBakiCommandCombat`)**
| Stage | Anim | dmg RAW→EFF | notes |
|---|---|---|---|
| `bakiG1` | row_12 | 34 → 20 | double body jab, `rekkaNext:"bakiG2"`, cancel-on-hit |
| `bakiG2` | row_13 | 58 → 35 | rising hook/kick, `launcher:true` (`launchVy:-30`) |
Gate on `_cmdHitLanded` via `rekkaContinue(requireHit:true)`; whiffed G1 recovers punishable.

---

## 5. SPECIALS (5 directional, meterless, cooldown-gated)
Dispatch `executeBakiSpecial` on `fighter._specialHeldDir` (N/F/B/U/D). All `cost:0`; each self-cd.

| Dir | Name | Anim | dmg RAW→EFF | Cooldown | Behavior |
|---|---|---|---|---|---|
| **N** | **Mach-Punch Barrage** | row_17 (+15b hold) | 8×6 = 48 → ~29 | 120f (2s) | Multi-hit rapid punches. **Tap = 6 hits (row_17); Hold = ~10 hits (row_15b), longer recovery** (Saitama tap/hold pattern). Re-arm `hasHit` every 2–3 active frames; combo-decay caps it. Warm-red fist FX (already on-sheet). |
| **F** | **Rushing Combination** | row_16a | 40 + 56 → 24+34 | 96f (1.6s) | Advancing dash-in (uses row_18b run frames) → spin back-kick finisher. Closes ~120px, `superArmor` on the dash frames only; finisher knocks back. Core rushdown approach. |
| **U** | **Rising Rush** | row_15a | 72 → 43 | 100f (1.66s) | Anti-air rising lunge-kick, `launcher:true launchVy:-30`; **i-frames on frames 1–4** (startup invuln, like a DP). High recovery on whiff. |
| **D** | **Impact Shockwave** | row_18a | 60 → 36 | 120f (2s) | Full-power straight emitting a **short-range (~150px) air-pressure shockwave** — a real, brief, non-projectile AOE hitbox in front (the "invisible punch pressure"). Grounded FX = the cream shockwave streaks (on-sheet), rendered as a pressure wave, **not** an energy beam. |
| **B** | **Defensive Read** (Counter) | guard/idle pose | returns 90 → 54 | 132f (2.2s) | Baki's defensive-genius parry. ~16f active counter window; if struck by a melee hit during it, negates it and auto-returns a fixed counter blow. Whiff = full recovery. No projectile reflect. |

**Barrage watch-item note:** multi-hit ×tap/hold must run every hit through `applyScaledDamage`
(no raw multi-subtract) and respect combo hitstun decay so the total stays in-band (~29–40 EFF),
not a true-blockstring infinite. This is the one damage-shape to verify in the build.

---

## 6. ULTIMATE — "Demon Back / 鬼の背 (Oni no Se)"
Row_07 flex is a **power-up stance**, so the honest read is a **transformation buff**, not a strike.

- **Trigger:** meterless; **once per round** (long lockout `~600f`/10s if you prefer recastable).
  Inline **freeze-cinematic** on the LIVE fighter (Rengoku/Isshiki pattern — no dup instance):
  camera-focus + hitstop, Baki flexes (row_07), an **authored demon-face overlay forms on his back**
  (`drawBakiDemonBackOverlay` — muscle-shadow demon face, dark crimson; NOT an energy aura).
- **Effect — empowered FORM for ~720f (12s)** (Maki power-charge / Boruto-Karma form architecture):
  `currentFormData` → `damageMultiplier ×1.30`, `speedMultiplier ×1.12`, super-armor granted on
  special startups, **Barrage upgrades to the row_15b extended version** while active. Revert via
  `updateMiscTimers` countdown → back to base (row_02 idle).
- **No direct damage on cast** (it's a buff); the payoff is the empowered offense window.
- **Balance:** ×1.30 sits in the modest transform band (Maki Shibuya / Toji Reincarnated ×1.25).
  The lever is **duration + once-per-round**, not the multiplier. In-band, no bypass of ×0.60.

*(Alt if you want a burst ult instead: escalate `row_18a` into a guaranteed ~330 RAW → ~198 EFF
cinematic shockwave, Saitama Death-Punch pattern. Say the word and I'll swap the spec.)*

---

## 7. STATE / PRESENTATION
- **intro:** no dedicated intro art → **borrow the row_07 flex** as a short "crack-knuckles / flex"
  entrance that settles into idle (flag as borrowed, like Jason's procedural intro). Or stitch from
  idle if the flex reads too much like the ult.
- **win:** row_19 (4f). **lose:** row_19b (3f). **guard:** row_05b (3f). **hurt/knockdown:** row_06 / row_06b.
- **grab/throw:** use the **engine-generic grab** (no bespoke throw art — the only throw art is the
  `row_16b` opponent demo, unusable as a solo animation). Documented gap, not a silent omission.

## 8. `animationData` KEYS (sheets to author from `baki_sliced/` at build S1)
`idle, walk, run, dash, jump, fall, guard, hurt, knockdown` · `light, heavy, up, air, down_air` ·
`bakiG1, bakiG2` · `bakiBarrage (row_17), bakiBarrageEx (row_15b), bakiRush (row_16a),
bakiRising (row_15a), bakiShockwave (row_18a)` · `bakiDemonBack (row_07)` · `intro`.
Reslice each to feet-aligned uniform cells (`anchorY:0`) — extend `tools/reslice_baki.py` with a
repack stage (Onoki/Yamamoto `_reslice_im` pattern) for the build; the audit crops stay as-is.

---

## 9. BALANCE SUMMARY (honest, pre-build)
- **Class:** FAIR grounded rushdown grappler, peer to **Toji / Maki / Rengoku**. Normal-sized kit
  (5 specials + rekka + transform ult) — **not** a versatility schema-exception (Madara/Saitama class).
- **All damage through the scaled pipeline** (`createAttackFromMove` / `applyScaledDamage`, ×0.60).
  No summons, no manual-subtract, no DOT → **on the honest side of the §damage-scale finding**.
- **Currency:** cooldown-gated (constrained, like Zenitsu/Rengoku — explicitly NOT Toji's free kit).
- **Stats:** every value in-band, **no roster records set.**
- **Watch-items (tune, don't pre-nerf):** (1) N-barrage multi-hit total (verify EFF ≈29–40, decay
  respected); (2) Demon Back ×1.30 window (knob = duration / once-per-round); (3) F-rush super-armor
  frames (limit to the dash, not the finisher).
- **Thematic:** all FX kept as warm impact/motion-blur (canon-legal). **Excluded** the bonus-box
  Goku-homage + green energy-sword (non-canonical crossover) and the `row_16b` opponent.

## 10. BUILD STAGING (proposed, when you greenlight)
- **S1** registration + movement/state (3-file gate, idle/walk/run/dash/jump/guard/hurt/knockdown, portrait, spriteScale) + reslice repack stage.
- **S2** 5 normals + Fwd+Heavy 2-stage rekka.
- **S3** specials N/F/U/D (barrage tap/hold, rush, rising DP, shockwave AOE).
- **S4** B-special Defensive Read counter.
- **S5** Demon Back ultimate (cinematic + timed form + back overlay + revert).
- **S6** portrait/select, BALANCE_AUDIT entry, canonical harness, regression. *(Skins/voice = later, art/clip-gated.)*
```
```

**Next step:** greenlight this (or redirect the forks in §0) and I'll run the staged code build.

---

## ✅ BUILD STATUS — COMPLETE (2026-08-17)
Built to function like Toji/Maki (meterless, cooldown-gated). **Deviation from §0 forks (intentional,
per the "function like Toji/Maki" mandate):** traits use `mobility:"very_high"` + `spd 96` (Toji/Maki
movement feel) — but 96 is still UNDER the 98 teleport-blur gate, so he stays GROUNDED as designed;
Demon Back ships as the timed buff-form (no bespoke cinematic module — generic ult flash + flex pose). `test:baki` **32/0**; regression `test:toji`
61/0 · `test:maki` 30/0 · `test:rengoku` 41/0 (nezuko 20/2 pre-existing, not counter). Files: NEW
`tools/repack_baki.py` (22 `baki_*_uniform.png`), `characters.js` (baki obj + roster), `abilities.js`
(rekka + 5 specials + Demon Back ult + 2 dispatch cases), `combat.js` (`shouldBakiCounter` + call site),
`game.js` (imports + command dispatch + cooldown/revert ticks), `spritesheets.js` (SPRITE_MANIFEST entry —
**required to flip box→sprite**), NEW `baki_portrait.png`, NEW `harness/baki.test.mjs`. Deferred: skins,
voice, Demon-Back back-overlay art; barrage/shockwave uniform cells are FX-wide (cosmetic).
