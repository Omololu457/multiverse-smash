# FRIEZA (Base / Final Form) — STAGE 0 Asset Map & Investigation Report

**Scope:** base/final-form Frieza only (white body, purple accent markings, long
animated tail). Golden / Black Frieza are **out of scope for this SHEET** (their art comes from a separate
uploaded sheet), but they are **NOT skins** — they were built as real in-match TRANSFORMATIONS: Golden Frieza
= a charge-triggered timed high-risk/high-reward MODE, Black Frieza = the Ultimate (a triggered cinematic
payoff). See §"Golden & Black Frieza transformations" below and abilities.js `FRIEZA_GOLDEN` / `FRIEZA_BLACK`.

**Source sheet:** `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Frieza.png`
(2132 × 7556 px, RGBA). 3DS *Dragon Ball Z: Extreme Butoden* sprite rip.

**Segmenter tool:** `tools/frieza_stage0_boxes.py` (run against the real file; do NOT
reuse Genos's row-band script — see §2).

---

## 1. Confirmed technical facts (verified directly, not assumed)

- **Background** keys out cleanly as exact-match teal `#008080` = `(0,128,128)` — all four
  corners exact, no antialias residue. Sampled histogram: 209k teal px on a 7×7 grid.
- **Sectioning** is green `#00FF50` = `(0,255,80)` (93k px). It is **NOT row dividers**.
  Each frame sits in its own **green-FILLED cell**: a solid green rectangle with one
  sprite drawn on it. Verified: sampled cell regions are ~60–72 % green, **0 % teal
  inside** — teal only appears in the outer gutter *between* cells. (This differs from
  Genos, whose cells were teal-interior with green outline dividers.)
- **Palette:** white body `~(243,248,242)`; purple crown / shoulders / chest-plate /
  forearms / shins `~(34,1,56)` & `~(71,29,103)`; cyan-grey tail & skin shading
  `~(97,144,149)`, `(152,200,206)`.
- **Portrait row** (top, y≈0–500): one full-body reference figure + **5 high-fidelity
  anime facial close-ups on black backgrounds** (calm / smug / angry / two screaming).
  Confirmed HUD / select-screen material — **exclude from the runtime atlas**, reuse as
  portrait/expression assets.

---

## 2. Segmentation method (the real technical difference flagged in Stage 0)

Row-band detection (which worked on Genos) **does not segment this sheet** — frames are
staggered/cascading, packed wherever they fit, with variable heights per band.

**Working approach (verified in `frieza_stage0_boxes.py`):**
1. Build `nongreen = ~green_mask`.
2. `scipy.ndimage.label(nongreen)` (4-conn). The single huge component = outer background;
   every other component = **one sprite** (the sprite is fully moated by its green cell fill).
3. Size-filter ≥ ~800 px, min 20×20 bbox → **159 gameplay frames** detected.

**Integrity checks (do not deviate from these in Stage 1):**
- Only **5 stray fragments** (60–800 px) across the whole sheet → tail-splitting is rare.
  Reattach any such fragment to the nearest parent bbox rather than dropping it.
- **Do NOT dilate to reconnect tails**: 3 px dilation collapses 159 → 24 components because
  adjacent frames are separated by <6 px of green. Raw per-component labelling is correct.
- The green fill must be keyed to transparent **along with** teal in the final reslice
  (sprite = non-green, non-teal pixels).

---

## 3. Content overview — cluster inventory (visually verified)

Frame count: **159 gameplay frames** + 1 reference figure + 5 portrait faces + a small
cluster of **cyan crystalline shards** (see §4). Box indices below refer to the
top→bottom, left→right ordering printed by `frieza_stage0_boxes.py`.

| Region (y-band) | Boxes (approx) | Content — visually confirmed |
|---|---|---|
| Portrait (0–500) | — | Full-body ref figure + 5 anime face close-ups (HUD; exclude) |
| A (950–1470) | 0–13 | **Idle / stand + idle-transition**: upright poses, tail-curl variants; lean poses with tail whipped horizontal; arms-raised-overhead frames (jump/guard candidate); start of **crouch** |
| B (1470–1900) | 14–23 | Low **crouch / turn** poses; **6-frame arms-crossed confident idle/taunt loop** begins (boxes 18–23) |
| C (1900–2360) | 24–34 | Arms-crossed idle continues; **motion-streak KICK** (box 29, 154×101, white trail); **cyan crystal shards** on the right (see §4); face-touch / arms-spread taunt/gesture frames |
| C-low (2440–2530) | 35–42 | **Low all-fours crawling lunge / dash attack** (tail arcs overhead, motion streaks) |
| D (2360–2900) | 43–63 | **Attack normals**: crouch-lunge, sliding/dashing **kicks with big white streaks**, airborne poses |
| E (2900–3470) | 64–86 | Dense **punch / kick / aerial-flip / tail-strike** combat frames |
| F (3470–4130) | 87–113 | More strike normals: white-streak kicks & **tail-whip** slashes, aerial attacks |
| G (4130–4780) | 87–113 | Kicks, aerials, **arms-thrust-forward palms-out firing stance** (ki-blast candidate), tail whips |
| H (4780–5170) | 110–120 | All-white **dash/teleport blur** frame + **large hunched power-up / ki-charge stance** (boxes 118–120, 153×137; super/ultimate windup candidate) |
| I (5170–5700) | 121–135 | **Tail-whip** attacks (very long horizontal tail) + **hurt / stagger** reactions |
| J (5700–6450) | 136–149 | Hit reactions → **knockdown / prone** (on-ground) frames begin |
| K (6450–7000) | 150–155 | **Knockdown / tumble / get-up** sequence; some crouched recovery |
| L (7000–7556) | 156–158+ | **Win / victory stance**: standing tall, arms-crossed, confident |

> Exact frame→move assignment is intentionally NOT finalized here (Stage 0 mandate). The
> coding agent must run `frieza_stage0_boxes.py` against the file and confirm per-cluster
> counts before Stage 1 locks assignments.

---

## 4. Open items to resolve before Stage 1

1. **Cyan crystalline shards** (§3 region C, right side, e.g. box 30 = 36×34 at
   x1498,y2151, plus 3–4 sprite-sized cells nearby). Read as broken **ice/crystal debris**,
   distinct from the character. **Role unconfirmed** — likely projectile/impact-debris FX
   or a thrown ki-crystal; possibly pure stage debris to exclude. Confirm before assigning.
2. **Ki-blast / beam FX:** no dedicated beam/energy-ball sprite was found. Frieza's ranged
   game likely = firing-stance poses (§3 G) + Death-Beam finger-point poses + **procedural
   beam**, optionally reusing the crystal shards as impact FX. Confirm during Stage 1.
3. **Ultimate-tier content:** no explicit ult sequence identified. The **hunched power-up
   stance** (§3 H, boxes 118–120) is the strongest candidate for a super/ult windup; may
   pair with an inline cinematic (project standard, cf. Mayuri/Brainiac pattern).
4. **Arms-raised-overhead frames** (§3 A, boxes 8–11): resolve jump vs guard vs
   charge-windup role.
5. Confirm which A/B frames are true **walk** vs idle-transition (walk art presence
   determines whether walk borrows run, as on several other chars).

---

## 5. Owner decisions (locked)

1. **Crystal shards → projectile FX** (impact/energy-shot debris for the ki-blast game).
2. **Ki-blast / beam = procedural** (firing-stance poses + Death-Beam point + procedural beam;
   crystals as impact FX). No dedicated beam sprite exists.
3. **Ultimate = the hunched power-up stance** (boxes 118–120).

---

## 6. Stage status

**STAGE 0 — DONE**
- [x] Sheet dims, teal key, green-fill cell structure verified; segmenter implemented
      (`tools/frieza_stage0_boxes.py`); row-band ruled out with evidence.
- [x] Full visual pass over all 13 bands; cluster inventory (§3); portrait row flagged.

**STAGE 1 — DONE** (`npm run test:frieza-stage1` → 19/0; regression genos-stage1 18/0)
- Reslicer `tools/reslice_frieza.py` (component-index picks matching Stage-0 ordering).
- Upgraded the **pre-existing non-playable placeholder** (characters.js DBZ family group)
  into the real sprite build: `isPlayable` true, `hasSprites`, `spriteScale 0.88`
  (idle ~120px w/ tail — canon-short), 11 movement/state anims, ki energy, anime-face portrait.
  ★Removed the old **goldenFrieza transformation** (Golden = future skin, not a transform).
- Registered: characters.js / spritesheets.js / skins.js (Default only) / credits.js.
  `ki` label + `dragon_ball` universe already existed (no ui.js change).
- ★**Image-capped session** — CONFIRMED: idle loop. Confirmed-by-height: crouch.
  **FLAGGED best-effort (pixel sign-off pending):** walk/run(reuse walk)/dash/jump +
  hurt/knockdown/getup pose IDs. Frames picked from the correct regions; identities to verify.

**STAGE 2 — DONE** (`npm run test:frieza-stage2` → 16/0; regression frieza-stage1 19/0, genos-stage2 16/0)
- 5 normals + guard wired to reslice'd sheets (all via GLOBAL_DAMAGE_SCALE ×0.60):
  - **heavy** = box 29 (CONFIRMED motion-streak kick). 80×0.6 = 48 dmg exact.
  - **up** = HONEST REUSE of heavy (launcher-typed). 62×0.6 = 37 dmg exact.
  - **down_air** = HONEST REUSE of air. **light/air/guard** = FLAGGED best-effort region picks.
- ★light per-hit = 25 (42×0.6); it's fast enough to auto-fire twice under a held button
  (harness reads 50 = 2 activations) — correctly below heavy 48, NO balance inversion. The
  engine enforces single-hit-per-activation via `currentAttack.hasHit` (combat.js:2554).

**STAGE 3 — DONE** (`npm run test:frieza-stage3` → 10/0; regression frieza-s1 19/0, s2 16/0, genos-s3 11/0, saitama 33/0)
- Fwd+Heavy 3-stage RUSH rekka (`FRIEZA_CMD` + `updateFriezaCommandCombat` in abilities.js, mirrors
  updateGenosCommandCombat via shared `rekkaContinue`; hooked in game.js; `friezaCmd` harness accessor):
  friezaRush1 (strike opener) → cancel-on-hit → friezaRush2 (follow strikes) → friezaRush3 (LAUNCHER).
  Cumulative ~97 eff dmg; rush3 launches P2 (vy −21.5). Neutral Heavy stays the normal kick.
- Art = FLAGGED best-effort combat-region rows (rush1 [70-73] / rush2 [87-90] / rush3 [91-93]).
- ★Fixed a screenshot-timing bug in BOTH frieza & genos stage-3 harnesses: a mid-chain `await shot()`
  burned the short (~11f) recovery/cancel window → cancel tap arrived late. Removed mid-chain shots.
  (genos-stage3 was pre-existing-flaky on this machine; the fix makes it deterministic 11/0.)

**STAGE 4 — DONE** (`npm run test:frieza-stage4` → 20/0; regression genos-stage4 29/0, frieza-s1/2/3 clean)
- Directional/air SPECIALS (`FRIEZA_SPECIALS` + `executeFriezaSpecial` in abilities.js; `triggerSpecial`
  case + game.js import; projectile dmg folds offense mult like Genos so the S5 power-up amps them):
  - **neutral** = Death Beam — fast thin PIERCING procedural beam (78×0.6 = 46 dmg exact).
  - **Fwd/Up/air** = Ki Blast — rapid 3-shot **crystal-sprite** volley (box 30 crystal; owner: crystals = FX).
  - **Down** = Death Ball — big slow procedural sphere (w90, 120×0.6 = 72 exact).
  - **Back** = Psycho Teleport — i-frame (invuln 10) blitz dash-strike (74×0.6 = 44 exact).
- Cast poses FLAGGED best-effort (deathbeam [96,97] / kiblast [108,109] / deathball [110,111]); teleport
  reuses dash. ★Ki Blast harness needs a wide gap (240) so the 3 staggered shots are in-flight together
  (at close range they hit + despawn serially → read as 1).

**STAGE 5 — DONE** (`npm run test:frieza-stage5` → 19/0; regression genos-stage5 18/0, frieza-s1..4 clean)
- **Emperor's Overload** = the owner-locked hunched power-up stance (boxes 118–120, CONFIRMED art) as a
  TIMED power-up MODE (Genos-Overdrive / Emperor-Time architecture): `FRIEZA_OVERLOAD` + enter/revert/update/
  executeFriezaUltimate in abilities.js; `triggerUltimate` case; game.js per-frame tick + 3 KO/round-reset
  reverts + `drawFriezaOverloadOverlay` (violet ki aura + OVERLOAD countdown HUD) + harness state/expire hooks.
  - 100 Ki → ~7s ×1.35 dmg / ×1.18 speed → auto-revert. Buff folds into projectiles (Death Beam 46 → 63).
  - CANON-FITTING DRAWBACK on EXPIRY only: **exhaustion** — ~2s ×0.85 speed-down + recovery beat (Frieza
    tiring from 100% power). NO self-damage (he's already glass-frail). KO/round-reset pays no drawback.

**STAGE 6 — DONE = FULL 6-STAGE BUILD COMPLETE** (`npm run test:frieza` → 29/0; per-stage 19/16/10/20/19; neighbors genos-s3/4/5 + spiderman clean)
- **win** = band-L standing victory stance (boxes 156–158). **lose** = REUSE knockdown (no dedicated lose art — flagged).
- NEW canonical `harness/frieza.test.mjs` (gate/stats · 10 movement sheets · normals · rush chain · all 4 specials
  incl. Death Beam projectile · Overload enter + exhaustion expiry · win/lose wiring · 27-action fallback sweep).
- `BALANCE_AUDIT.md` entry added (FAIR — frail fast beam-heavy zoner, no net stat record, Overload gated by
  exhaustion). ★credits reconciled: `frieza` MOVED from PROJECT_ART_KEYS → SOURCED_ART (real ripped sheet);
  `test:credits` disjoint check now PASSES (the 2 remaining fails are pre-existing unattributed keys, not Frieza).

**CHAR BUILD COMPLETE.**

**★ VISUAL AUDIT (2026-08-22, vision-subagent — fresh uncapped context actually rendered + looked at every role):**
- **idle — CORRECTED.** Old `[18,19,20,21,22,23]` was contaminated: #18/#19 = hand-to-face REACTION poses, #23 =
  arms-crossed taunt. Only #20/#21/#22 are the neutral tail-sway breathing loop → **idle now `[20,21,22]`**
  (3-frame neutral loop). This confirms the concern that the old "idle" was a one-off glance/reaction, not a loop.
- **walk / run — GAP (honest).** Old walk `[0,1,6]` was WRONG (hunched anticipation poses, no locomotion).
  **There is NO walk/run cycle anywhere on the sheet** (Extreme Butoden = hover/dash fighter). walk + run now
  **BORROW the neutral idle** in characters.js — no fabricated locomotion. Real gap, honestly flagged.
- **All 20 other roles CONFIRMED CORRECT by direct rendering:** dash[5], jump[3,4], crouch[7,8,9], taunt[31-34],
  guard[24], hurt[131,132], knockdown[154,155], getup[152,153], light[65,66], heavy[29] (spin-sweep), air[46],
  crystal[30], rush1/2/3, deathbeam[96,97], kiblast[108,109], deathball[110,111], overload[118-120], win[156-158].
- **Verdict: mostly-correct + two spot-fixes (idle, walk-gap) — NOT a re-pass.** Fixes applied + re-verified
  (test:frieza 29/0, test:frieza-stage1 19/0). Renderer used by the audit: `tools/frieza_audit_contact.py`.

**Open follow-ups (post-build)**
- Pixel sign-off on the FLAGGED movement/reaction/normal/rush/special-cast/win picks — next uncapped session
  (CONFIRMED art: idle loop, crouch, heavy kick, power-up stance, crystal).
- **credits**: confirm the sprite-rip author before ship (currently a flagged placeholder).
- **moveset.js**: dormant-but-stale `frieza` entry (old light 45 / heavy 85 / `goldenFrieza` ultimate) — clean up
  to match the shipped kit (characters.js drives actual damage, so it's cosmetic drift, not a bug).
- Golden / Black Frieza — DONE as TRANSFORMATIONS (not skins); see §below. Their dedicated gold/black ART is a
  canvas TINT over the base sheets for now — a separate uploaded gold/black sheet could replace the tint later.
- voice, intro art.
- frieza-stage4 Ki Blast "3 concurrent" check is mildly timing-flaky (occasionally reads 2 then passes on
  re-run) — harmless; could count cumulative spawns instead if it ever annoys.
- **moveset.js** still has the old `frieza` entry (light 45 / heavy 85 / upAttack 70 + specials +
  a `goldenFrieza` ultimate). characters.js drives actual damage (heavy 48 = 80×0.6 proves it),
  so moveset.js is dormant for basics — but reconcile it when wiring specials (S4) / ultimate (S5).

**Stages 2→6** (normals → command chain → specials incl. procedural beam/Death-Beam →
power-up ultimate → win/lose + harness/balance) follow the project's standard structure.

---

## ★ Golden & Black Frieza — TRANSFORMATIONS (reclassified out of skins, 2026-08-22)
Owner decision: Golden/Black are **real in-match transformations**, not palette skins. Built on the existing
timed-mode transform architecture (Zaraki Shikai / Sasuke Susanoo-Lv2 / Batman Rage / Genos Overdrive), NOT a
new system. This REPLACED the interim "Emperor's Overload" ultimate (that timed-mode became Golden; the
Ultimate slot became Black). `test:frieza-stage5` = 23/0, canonical `test:frieza` = 32/0.

**GOLDEN FRIEZA — timed high-risk/high-reward MODE** (`abilities.js` `FRIEZA_GOLDEN` + enter/revert/update +
`revertGoldenFriezaManual`; charge-handler trigger in game.js; gold tint in sprite.js; `drawGoldenFriezaOverlay`).
- **Trigger:** CHARGE button — hold→RELEASE to transform (gated ≥70 Ki); a TAP while transformed reverts EARLY
  (Vegeta-SSJ idiom). Separate from the Ultimate.
- **Cost:** 70 Ki. **PEAK 0–5s (0–300f):** dmg ×1.40 / spd ×1.20. **DROP-OFF 5–8s (300→480f):** multipliers
  decay LINEARLY & sharply to dmg ×1.05 / spd ×1.00 (recomputed live each frame). **Stamina ki-drain:** 0.10/f
  in peak → 0.30/f in the drop-off. **HARD CAP 8s (480f) OR ki-empty → AUTO-revert = EXHAUSTION crash** (spd
  ×0.80 for 150f ≈ 2.5s + recovery beat). **TAP-revert in PEAK = clean, no crash** (burst-and-out); tap in
  drop-off still crashes. HUD bar goes RED in the drop-off.
- Canon match: massive boost + stamina drain that drops power off sharply if oversustained.

**BLACK FRIEZA — the ULTIMATE** (`FRIEZA_BLACK` + `executeFriezaUltimate`; dark tint; `drawBlackFriezaOverlay`).
- Ceiling-tier form, canon has NO drawback → a triggered PAYOFF (not a sustained mode). Ultimate button @ 100 Ki
  → inline freeze cinematic (live fighter, no dup; Deathstroke pattern), dark-tinted, guaranteed barrage
  **340 raw → ×0.60 = 204 EFF** sure-hit. Entering Black cleanly ends an active Golden (no stacking, no crash).
- **ART:** both forms render the base sheets under a canvas TINT (`FRIEZA_GOLDEN_TINT` / `FRIEZA_BLACK_TINT` in
  sprite.js) — canon-appropriate (same body, recolored) and safe with no new sheets. A dedicated gold/black
  uploaded sheet could later replace the tint via `_skinAnim`. ★Tint look is UNVERIFIED (build session
  image-capped) → pixel sign-off pending.
