# Ghostface — Asset Map

First **horror**-universe sprite char. rosterKey `ghostface`, universe `horror` (new — the universe select
grid builds dynamically via `buildUniverseMap()`, so "Horror" appears as its own card with no extra
registration). Source art: 16 CVS-style `cvs_ghost_face_*.png` strips (uploaded, **untracked**) + a
636×1057 master sheet `cvs_ghost_face_sprites_by_xxultra2006xx_dfh2eaa.png`.

> **NOTE — the brief assumed this asset map already existed; it did not. Created during the Stage-1
> build** (same as the Gold Samurai Ranger case).

## Slicing
The raw strips are NOT recoverable from git (they are new/untracked), so — unlike the usual reslice-in-place
flow — each raw sheet was **COPIED** to a `ghostface_<action>_uniform.png` sibling first, then the copy was
resliced (`tools/reslice_strip.mjs`, feet-aligned uniform cells). Three attack sheets had **touching
figures** (no alpha gutter → the auto-slicer merged frames): `slash` (fwd-attack, 3→2), `lowslash`
(crouch-stance-attack, 3→1), `downair` (down-air, 3→2). These were **density-split** by a bespoke repacker
(column-occupancy valleys → tight per-figure bbox → bottom-aligned uniform strip) into clean 3-frame cells.

## Fighting style (confirmed by visual inspection)
A masked **knife STALKER** (Scream). Every read is a quick knife slash, a stalking creep, or an ambush
lunge. This drove a fast, mixup-heavy **rushdown** archetype with **bleed attrition** rather than raw burst
(human-fragile, not armored). The signature Call-In companion special (skin-gated pools) is a LATER stage;
Stage 1 is the standard build.

## Base stats (Stage 1)
`HP 1040 · maxEnergy 100 (Dread) · atk 85 · def 80 · spd 95 · jumps 2 · jumpPower 32 ·
dashSpeed 20 / dur 9 / cd 30 · spriteScale 1.15`.

Fragile-fast stalker; no stat is an outlier:
- **HP 1040** — low, above Killua 1030 / Flash 1020, below Batman 1080. A human, not a powerhouse.
- **Def 80** — low-mid (above Killua 78, below the shinobi 82–84). Reads fragile.
- **Spd 95** — fast; ties Killua, under Toji 98 / Flash 99.
- **Atk 85** — moderate (base Atk is archetype flavor; per-move RAW values carry the identity).

## Energy label — "DREAD"
`traits.energyType: "dread"` → new `ui.js` `ENERGY_TYPE_LABELS.dread = "Dread"`. `hasEnergy: true`,
`maxEnergy 100` — a standard energy meter (specials + Ultimate), Batman-pattern.

## Registration gate (4 files + portrait + label)
- `characters.js` — the `ghostface` object + export map entry.
- `spritesheets.js` — `SPRITE_MANIFEST.ghostface` idle-strip gate (flips box → sprite path).
- `skins.js` — `ghostface` default skin (else `applySkin()` pulls the spriteScale:1 fallback).
- `ui.js` — the `dread` energy label.
- `ghostface_portrait.png` — DERIVED (idle frame 0, tight-crop + 2.4× nearest upscale = 172×273). Flagged:
  swap in bespoke portrait art if it arrives.

## Movement / State — STAGE 1 (wired) [measured]
| Action | Uniform sheet (`ghostface_*`) | Cell | Notes |
|---|---|---|---|
| idle | `idle_uniform` | 3f · 75×116 | hunched breathing loop |
| walk / run / dash | `walk_uniform` (from sneak) | 4f · 80×115 | stalking creep; run+dash = same sheet, faster |
| jump / fall | `jump_uniform` | 2f · 105×118 | fall = frame 1 (`sourceX 105`) |
| guard | `guard_uniform` (block_standing) | 1f · 82×108 | cloak-brace block |
| hurt | `hit_uniform` cell 0 | 1f · 122×114 | recoil flinch |
| knockdown | `hit_uniform` cells 1-3 (`sourceX 122`) | 3f · 122×114 | crumple → prone → getup |
| crouch | `crouch_uniform` | 2f · 79×102 | |
| charge / taunt | `taunt_uniform` | 2f · 100×114 | hold-to-charge = menacing knife beckon (reuses taunt) |

Intro: no dedicated art → `introPool: ["idle"]` (stands in idle).

## Normals — STAGE 1 (wired) [measured]
| Slot | Uniform sheet | Cell | RAW dmg | Read |
|---|---|---|---|---|
| light | `slash_uniform` (fwd-attack) | 3f · 103×110 | 34 | quick standing knife swipes |
| heavy | `charge_uniform` (charge-attack) | 1f · 125×115 | 66 | committed lunging power-stab (long reach) |
| up | `up_uniform` (up-attack) | 1f · 97×124 | 54 | overhead knife launcher |
| air | `up_uniform` (reuse) | 1f · 97×124 | 46 | aerial overhead slash |
| down_air | `downair_uniform` | 3f · 107×128 | 58 | aerial dive-stab |

## Command chain + specials + ultimate — STAGE 1 (wired) [measured]
**"Slasher Frenzy" chain (Down+Heavy rekka, cancel-on-hit; Batman/Shinobu Toji-Rekka pattern):**
`updateGhostfaceCommandCombat` (abilities.js), registered in game.js's per-frame input loop. The 3-frame
low-slash sheet split into 3 cancelable stages. A whiff/block ENDS the string (shared `rekkaContinue`,
requireHit:true). Pure normal chain, no energy cost.
| Stage | Sheet cell | RAW | rekkaNext |
|---|---|---|---|
| ghostfaceCombo1 | `lowslash` f0 (`sourceX 0`)   | 22 | ghostfaceCombo2 |
| ghostfaceCombo2 | `lowslash` f1 (`sourceX 97`)  | 28 | ghostfaceCombo3 |
| ghostfaceCombo3 | `lowslash` f2 (`sourceX 194`) | 42 | — (finisher) |

**Specials** (SPECIAL button, direction-branched via `_specialHeldDir`; DREAD-energy cost, Batman pattern):
- **Gutting Lunge** (Neutral/Fwd) — `gfLunge` = `charge_uniform`. Dashing knife stab (gap-closer): 50 direct
  + a **BLEED DoT** (`GHOSTFACE_BLEED = {ticks:6, interval:20, dmg:6}` = 36 over ~2s) stamped on a CLEAN hit
  via the existing game.js `_dot` subsystem (localized watcher in `updateGhostfaceCommandCombat`, no shared
  resolver edit). Cost 25. This attrition is the counterweight to his human-fragile burst.
- **Low Gut** (Down) — `gfLowCut` = `lowslash_uniform` (3f). Low sweeping gut-slash: 42 direct + **knockdown**
  (trip) on a clean hit (localized watcher). Cost 20.
- **Stalk Vanish** (Back) — FX-only (no cast pose): backstep with **18 i-frames** + backward hop + clone-puff.
  Spacing/reposition tool, no damage. Cost 15.

**Ultimate — "The Final Act"** (`gfUlt` = `slash_uniform` 3f held through the freeze): dedicated
`ghostfaceFinalActCinematic.js` (mirrors the batmanDarkKnightCinematic contract: camera push-in → stalk →
**procedural knife stab-flurry** over a bleeding-red horror vignette → pull-back). No projectile sheet — the
slashes are drawn strokes. Guaranteed payoff at the CONNECT beat via onImpact: **300 direct
(range-independent, blocked → 25%) + a lethal BLEED finisher (6×10=60) on a clean hit**. Full DREAD meter
(cost 100).

## Sprite accounting — STAGE 1 (16 files: 12 wired · 3 reserved · 1 reference)
**Wired (12 → 24 animationData actions):** idle, sneak (walk/run/dash), jump (jump/fall), block_standing
(guard), hit (hurt/knockdown), crouch, taunt (taunt/charge), foward_attack (slash → light), charge_attack
(charge → heavy + gfLunge), up_attack (up + air), down_air (down_air), crouch_stance_attack (lowslash →
gfLowCut + ghostfaceCombo1/2/3). [slash sheet also drives gfUlt.]
**Reserved (3, flagged — not invented into moves):** `cvs_ghost_face_block copy 2` (3f block/getup variant),
`cvs_ghost_face_block_crouch` (1f low block), `cvs_ghost_face_crouch_stance` (1f crouch idle pose). Candidates
for a crouch-guard state / getup polish later.
**Reference (1):** the 636×1057 master sheet.

## Killer-identity skins — STAGE 2 (wired) [verified]
Default + 5 identities via `tools/gen_ghostface_creative.py` (robe-recolor; `recolor_multi`). The cool-
saturated cloak (sat ≥ .22, val .05-.45) → a distinct themed dark tone; the **white mask + steel knife
preserved** (neutral, excluded by the sat gate) and **black linework preserved** (val gate = line-art guard).
The robe is ~85% of the silhouette, so each identity reads instantly. Registered in `skins.js` (hardcoded,
`recolorSkinAnim("ghostface", tag)` + explicit `__tag` portraits).
| Skin | Killer | Robe tone | Hue |
|---|---|---|---|
| Billy  | Billy Loomis (1996) | `#6E1520` crimson / blood red | 354 |
| Debbie | Mrs. Loomis (Scream 2) | `#3E2A66` indigo-violet | 255 |
| Roman  | Roman Bridger (Scream 3) | `#5A4622` bronze / sepia (warm) | 43 |
| Jill   | Jill Roberts (Scream 4) | `#701E50` magenta | 322 |
| Amber  | Amber Freeman (2022) | `#1C5A30` toxic green | 138 |

All 5 hues are well-separated from the default teal (~190) and from each other. Verified: `npm run
test:ghostface-s2` (13/13 — select screen lists all 6 with recolored portraits; each identity's idle
resolves to its `__tag` sheet in a live match; clean revert to default). Shots `harness/shots/ghostface_s2_*`.

> **Reminder — these skins are NOT cosmetic-only.** They ALSO carry per-identity GAMEPLAY property modifiers
> (Stages 3-4) — a deliberate, confirmed project-first exception. The Stage-2 sheets are the visual layer only.

## Per-skin gameplay modifiers — STAGE 3 (investigation findings)
**Finding: skins are 100% cosmetic today.** Every runtime `skinId` read is either `pickSkinVoice(...)`
(audio) or a `drawXOverlay` cosmetic gate (Rick Void / Superman Phantom / Rengoku Ember / Rick Portal).
`applySkin()` (game.js) only touches `_skinAnim` / `spriteScale` / `skinTint` / `recolorTag` / `skinId`.
**Zero** gameplay code (combat.js / abilities.js frame-data, cost, movement, damage, hitstun) reads `skinId`.
So the per-identity modifiers are genuinely NEW infrastructure.

**Proposed infra (minimal, no import cycles):** a `GHOSTFACE_SKIN_MODS` table keyed by skinId; stamp the
resolved object onto the fighter as `fighter._gfSkinMod` inside `applySkin()` (runs per skin change, per
fighter). combat.js / physics.js / abilities.js then just READ `fighter._gfSkinMod?.x` off the fighter —
no new imports, mirror-match safe (each fighter carries its own).

| Identity | Modifier | Hook (file : function) | Concrete lever |
|---|---|---|---|
| Billy  | faster startup on the dash/approach move | `abilities.js fireGhostfaceGuttingLunge` (md.startup) | scale Gutting Lunge startup ×~0.55 (its telegraph) |
| Debbie | hit-react anim mismatched from real dmg (VISUAL ONLY) | `combat.js resolveAttackHit` (colorFlash) + `sprite.js` hurt/knockdown pose selector (~297-312) | cosmetic `_fakeReactSeverity` that MISMATCHES real dmg → drives displayed pose + flinch; **health / hitstun / knockback UNCHANGED** |
| Roman  | cheaper / faster Call-In | **Stage-5 Call-In fire fn** (cost + cooldown) | scale callInCost ×0.5, callInCd ×0.5 — **DEPENDS on Stage 5** (Call-In not built yet); stamp the value now, apply in S5 |
| Jill   | bait idle + faster counter-window | `combat.js checkParry` (`timer > 5` threshold + `_parryInputBuffer`) | widen Jill's parry acceptance (startup-timer 5→~9) + passively arm a small buffer while idle |
| Amber  | +fwd move speed · reduced side-step vs her | `physics.js` speed (~51-52) + `combat.js checkParry` (Amber as attacker) | forward-move speed ×~1.12; when Amber attacks, shrink the opponent's parry window (−3) |

**Interpretation notes (flagged):**
- *Billy "dash/approach move"* = the **Gutting Lunge** (his signature gap-closer). Clear + testable; the
  universal dash is left as-is.
- *Amber "side-step-ability window"* = this is a 2-plane fighter with **no literal sidestep axis**. The
  closest defender-escape mechanic is the universal **parry** (`checkParry`). Realized as: opponents get a
  **narrower parry window when Amber is the attacker** (the symmetric opposite of Jill's bonus). Flagged as
  an interpretation of "juke resistance."
- *Debbie* is the subtlest: it must be **visual-only**. Same hit → identical real health delta + hitstun +
  knockback as default Ghostface; ONLY the displayed hurt pose / flinch is scrambled to misread the damage.
- *Roman* can't be verified until Stage 5 builds the Call-In; the mod value is defined now and consumed there.

Balance is a Stage-6 concern (all 5 flagged for a competitive-advantage pass since they're no longer cosmetic).

## Per-skin modifiers — STAGE 4 (wired) [verified before/after]
Infra: `GHOSTFACE_SKIN_MODS` table (game.js) stamped onto `fighter._gfSkinMod` in `applySkin()`; combat.js /
physics.js / abilities.js read it off the fighter (no imports). `test:ghostface-s4` = **10/10** (before/after
per identity); Batman 33/0 + Shinobu 35/0 + Ghostface base 16/16 regression clean.

| Identity | Wired lever | Before → After (measured) |
|---|---|---|
| Billy  | Gutting Lunge `startup` ×0.5 (abilities.js `fireGhostfaceGuttingLunge`) | reaches active **8f → 5f** |
| Debbie | `_fakeReactVisual` in `resolveAttackHit` → pose swap in sprite.js (VISUAL ONLY) | displayed pose **hurt → knockdown**; real dmg 20=20, hitstun 14=14 (unchanged) |
| Jill   | `shouldGhostfaceJillCounter` in `resolveAttackHit` (cooldown-gated bait-counter) | default takes 40 dmg / no stun → Jill **0 dmg, attacker stunned 28** |
| Amber  | `fwdSpeedScale` (physics.js walk) + `stickPressure` (resolveAttackHit pushback) | walk **171px → 205px**; her hit's pushback **7.0 → 3.1** |
| Roman  | `callInCostScale`/`callInCdScale` in the table | value present; **consumed in Stage 5** (Call-In) |

**KEY MID-STAGE FINDING:** the engine's universal `checkParry` (heavy-armed parry) is **effectively dead
code** — its `getAttackPhase(attacker) === "startup"` guard can never be satisfied from the only call site
(`resolveAttackHit`, which runs during the attacker's ACTIVE frames). Proven empirically (arming
`_parryInputBuffer` every frame → still 39 dmg, no parry). So Jill's bait-counter and Amber's "juke
resistance" were **re-implemented on the reliable reactive-counter path** (`shouldRengokuCounter` shape,
fires when a hit lands): Jill = a real negate+riposte counter; Amber = reduced knockback ("sticky pressure")
instead of a parry-window shrink. Documented interpretation, faithful to the design intent.

## Call-In companion special + pools — STAGE 5 (wired) [verified]
**Signature special = CALL-IN (Neutral+Special).** A companion is called in, rushes the opponent from
their far side for one strong strike (120), then vanishes — the Zenitsu Double Attack `spawnAssistSummon`
"rush" pattern; the summon renders as the COMPANION's own sprite (their heavy/idle pose from
`characters[key].animationData`). Ghostface plays a beckon cast pose (`gfCallIn`, reuses the taunt sheet).
Cost 40 Dread, cooldown ~220f (`callInCd`, ticked in `updateMiscTimers`).

**Special layout changed:** Gutting Lunge moved Neutral→**Forward** so Neutral is the signature Call-In.
Final: **Neutral = Call-In · Forward = Gutting Lunge · Down = Low Gut · Back = Stalk Vanish.**

**The 5 skin-gated pools** (`GHOSTFACE_CALLIN_POOLS` in abilities.js; `getGhostfaceCallInPool(fighter)`):
| Identity | Pool |
|---|---|
| Billy  | Sasuke · Itachi · Chrollo · Killua |
| Debbie | Beerus · Netero · Maki · Omni-Man |
| Roman  | Rick · Tobirama · Gojo · Hisoka |
| Jill   | Sukuna · Goku Black · Gold Samurai Ranger · Vegeta |
| Amber  | Shinobu · Gon · Naruto · Zenitsu |
| (default skin) | Sasuke · Beerus · Rick · Sukuna (sampler, so base Ghostface can still Call-In) |

Partner selection: `fighter._callInPartner` defaults to `pool[0]` on skin apply (game.js `applySkin`), and is
**strictly pool-gated** — `setCallInPartner` rejects any key outside the active identity's pool, and the fire
path falls back to `pool[0]` if the stored partner isn't in-pool. **ROMAN's modifier consumed here:**
`callInCostScale`/`callInCdScale` ×0.5 → cost 40→20, cooldown 215→105.

Verified: `test:ghostface-s5` = **18/18** — each pool exact + all 20 companions distinct; in-pool pick
accepted / out-of-pool rejected; firing summons the selected in-pool companion (dmg 120, cost 40, cd set);
Roman halves cost + cd. Regression: Zenitsu 53/0 (shared summon system), Ghostface base 13/0, skins 13/0.
Harness hooks: `callInPool` / `callInPartner` / `setCallInPartner` / `lastCallInPartner` / `callInCd` / `resetCallIn`.

**Deferred polish:** a full pre-match partner-SELECT screen (the pool is chosen via `_callInPartner`, default
pool[0] + settable; no dedicated UI screen built). In-match the summon uses the selected/default partner.

## Tests + regression + BALANCE PASS — STAGE 6
**Ghostface suite (all deterministic, green):** `test:ghostface` 18/18 (canonical: registration, sprite
integrity, 6 skins, 5 pools) · `test:ghostface-s1` 13/13 · `-s1-abilities` 16/16 · `-s2` 13/13 (skins) ·
`-s4` 10/10 (the 5 per-identity modifiers, before/after) · `-s5` 18/18 (Call-In + pools). Total **88 assertions**.

**Regression (deterministic single runs):** Zenitsu 53/0 (shared summon engine), Omega Ranger 34/0, Naruto
21/0, Rengoku 41/0, Toji 34/0, Shinobu 35/0. Batman/Rick show **environmental frame-timing flakiness** (±3
across back-to-back runs on identical code — the known-flaky rekka-sequence tests under machine load), NOT a
regression: every combat.js/physics.js/sprite.js edit is a strict **no-op for non-Ghostface** (gated on
`_gfSkinMod` / `_fakeReactVisual` / `_jillCounterCd` / `fwdSpeedScale`, all undefined for other fighters).
**Gold Samurai Ranger fails pre-existingly** (its test calls `window.__harness.samuraiUltCine`, a hook never
implemented on this WIP branch — fails 4/18 on the pristine tree with my changes stashed; nothing here touches
ranger/Mega code). The brief's "Call-In arch shared with Power Rangers" does **not** apply — that Morpher
Call-In isn't on disk; Ghostface's Call-In is independent (only shares the generic summon engine, regressed via Zenitsu).

**BALANCE — all 5 are within the design mandate (identical HP/damage/moveset; frame/property tweaks only), but
the VALUE of the tweaks is UNEVEN. Ranking: Roman > Billy ≈ Amber ≈ Jill > Debbie.**
- **Roman — TUNED (was overtuned at 0.5).** Call-In cost/cd scale **set to 0.65** (cost 40→26, cd 220→~143)
  after the 0.5 value (2× uptime on the strongest tool) read overtuned. Still a real economy perk, no longer
  oppressive. (NB: Ghostface's Roman lever is `callInCostScale`/`callInCdScale` — there is NO `CALLIN_DAMAGE_MULT`;
  that const belonged to the never-persisted Morpher Call-In.)
- **Billy — mild/moderate advantage.** Gutting Lunge startup 6→3 = the fastest approach/whiff-punish tool;
  strong but single-move, still 25 energy + full recovery. Acceptable, the top "footsies" identity.
- **Jill — moderate advantage (most "free": no cost, no input).** Idle bait-counter fully negates + 28-stun,
  but cooldown-gated 72f and only from true neutral → baitable (whiff into it, punish the cd gap). Monitor.
- **Amber — moderate, self-balancing.** +14% move speed + ×0.45 pushback = sticky pressure, but reduced
  knockback also weakens her corner-carry/space-creation (double-edged). Well-tuned.
- **Debbie — NEUTRAL / slight DISADVANTAGE (as designed).** Strictly visual (health/hitstun/knockback identical
  to base) → **zero mechanical edge** vs frame-aware players or AI; her advantage is purely psychological
  (misreading her health). Mechanically she is "base Ghostface." This is per the confirmed design (deception
  only), so left as-is — but noted she's the odd one out in a set where the other four carry real mechanical perks.

No modifier is game-breaking; none alters raw damage/HP/moveset. The single actionable balance flag is **Roman's
Call-In economy** (double uptime); Debbie's pure-visual nature is a deliberate design choice, flagged for awareness.

## Deferred / not-yet-built (explicit)
**All 6 stages COMPLETE.** Remaining polish (out of scope for this build):
- **Voice** — none wired (like Shinobu/Rengoku at their build; a `ghostfaceVoice.js` can drop in later).
- **Pre-match partner-SELECT screen** — the Call-In partner defaults to `pool[0]` and is settable
  (`_callInPartner`); a dedicated selection UI screen was not built (the mechanic fully works without it).
- **Balance** — one actionable flag: Roman's Call-In economy (2× uptime) — playtest, consider 0.5→0.65.

## Tests (all)
`test:ghostface` 18/18 (canonical) · `test:ghostface-s1` 13/13 · `test:ghostface-s1-abilities` 16/16 ·
`test:ghostface-s2` 13/13 · `test:ghostface-s4` 10/10 · `test:ghostface-s5` 18/18 = **88 assertions, 0 fail**.
Shots in `harness/shots/ghostface_*`. Regression: Zenitsu 53/0, Omega 34/0, Naruto 21/0, Rengoku 41/0, Toji
34/0, Shinobu 35/0 (Batman/Rick flaky-under-load only; Gold Samurai pre-existing `samuraiUltCine` gap).
