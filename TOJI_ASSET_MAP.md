# TOJI FUSHIGURO — ASSET MAP (rebuild)

Universe: `jujutsu_kaisen` · rosterKey: `toji` · REBUILT 2026-08-10 on a fresh 25-file
upload set (the earlier build was fully removed; this is a clean rebuild).

**Filenames preserved exactly as uploaded.** Source strips are NON-uniform (real per-frame
alpha-gutter pitch — no fixed grid). Each wired sheet is re-sliced to a feet-aligned
`toji_*_uniform.png` cell (`tools/reslice_strip.mjs`; the 2-row intro via `tools/reslice_rows.py`).
Raw originals are kept untouched in `_toji_raw_backup/`.

Archetype: peerless physical combatant — ZERO cursed energy (maxEnergy 0, `hideResourceMeter`),
top-tier speed (98, teleport-blur gate) + hard-hitting normals (attack 98), deliberately fragile
base HP (1050). Survivability is the two-stage COMEBACK (Stage 6), not raw bulk.

## Raw upload inventory (25 files) & wiring

| Raw file | Dims | Wired as | Stage | Status |
|---|---|---|---|---|
| toji_idle.png | 347×85 | `idle` (6f 46×67) | 1 | ✅ wired |
| toji_walk.png | 370×75 | `walk`/`run`/`dash` (7f 38×66) | 1 | ✅ wired |
| toji_jump.png | 411×86 | `jump`/`fall` (7f 46×78) | 1 | ✅ wired |
| toji_hit.png | 132×79 | `hurt`/`knockdown` (2f 36×64) | 1 | ✅ wired |
| toji_intro.png | 852×170 | `intro` (36f 67×66, 2-row→1 strip, ends drawing katana) | 1 | ✅ wired |
| toji_punch.png | 422×76 | light/heavy/air + A-B-C-A+B rekka (tojiG1-4, 8f 56×66) | 2 | ✅ wired |
| toji_up_attack.png | 398×82 | up-attack launcher (`up`, 5f 66×74) | 2 | ✅ wired |
| toji_down_air_attack.png | 696×105 | down_air (8f 80×88) | 2 | ✅ wired |
| toji_gun.png | 388×97 | Back+Heavy Handgun bullet poke (`tojiGun`, 6f 53×66) | 2 | ✅ wired |
| toji_sword_down_attack_1.png | 725×78 | Split Soul Katana part 1 (`tojiSword1`, 9f 94×70) | 3 | ✅ wired |
| toji_sword_down_attack_2.png | 451×71 | Split Soul Katana part 2 (`tojiSword2`, 6f 74×62) | 3 | ✅ wired |
| toji_rapid_sword_slashes.png | 800×163 | Rapid Sword Slashes (`tojiRapidSlash`, 2-row→21f 53×73) | 3 | ✅ wired |
| toji_chain_attack_1.png | 555×89 | Chain part 1 (`tojiChain1`, 5f 98×72) | 4 | ✅ wired |
| toji_chain_attack_2.png | 504×99 | Chain part 2 (`tojiChain2`, 4f 140×72) | 4 | ✅ wired |
| toji_chain_attack_3.png | 653×90 | Chain part 3 (`tojiChain3`, 5f 118×90) | 4 | ✅ wired |
| toji_chain_attack_4.png | 894×104 | Chain part 4 (`tojiChain4`, 7f 122×91) | 4 | ✅ wired |
| toji_chain_attack_5.png | 475×104 | Chain part 5 / Inverted Spear finisher (`tojiChain5`, 4f 110×82) | 4 | ✅ wired |
| toji_playful_cloud_dash_attack.png | 699×102 | **Playful Cloud** special (`tojiPlayfulCloud`, 6f 99×56) — chosen (most dynamic self-contained clip) | 5 | ✅ wired |
| toji_playful_cloud_attack_1.png | 543×80 | Playful Cloud candidate (staff thrust) — not chosen | 5 | ⬜ held |
| toji_playful_cloud_attack_2.png | 365×84 | Playful Cloud candidate (staff spin) — not chosen | 5 | ⬜ held |
| toji_playful_cloud_idle.png | 185×68 | Playful Cloud form idle — not needed (single special, no form) | 5 | ⬜ held |
| toji_playful_cloud_intro.png | 246×78 | Playful Cloud form intro — not needed | 5 | ⬜ held |
| toji_playful_cloud_run.png | 503×103 | Playful Cloud form run — not needed | 5 | ⬜ held |
| toji_fly_head.png | 114×26 | **Fly Heads** swarm projectile (`tojiFlyHead`, 3f 32×25, 5 simultaneous) | 5 | ✅ wired |
| toji_transparent.png | 953×2859 | master sheet / portrait source | 7 | ⏳ ref-only |

## Gaps (no art in the upload set)
- **guard/block** — no dedicated block sheet → idle frame 0 stand-in (Stage 1).
- **Steam Machine Car** (old movelist `D,B,b`) — **CONFIRMED CONTENT GAP**: no matching file in
  either the deleted old generation or this new upload set. Not invented.
- **Reincarnated Form** — no distinct "reincarnated form" sheet; the form's VISUAL is planned as a
  tint/recolor (`_skinAnim` / transformation buff), investigated in Stage 6.

## Stage 1 — DONE (registration + movement/state + intro + speed-tier)
- Registered in `characters.js` (const `toji` + export), `spritesheets.js` (spritesReady gate),
  `skins.js` (default skin → spriteScale 1.71). Roster 52→53.
- Stats: HP 1050 / EN 0 / ATK 98 / DEF 82 / SPD 98. spriteScale 1.71 (drawn idle ~111px, canon 184cm).
- Speed-tier teleport-blur qualifies by STAT (speed 98 ≥ SPEED_TIER_THRESHOLD), uses HIS OWN dash
  pose (walk frame). Speed-tier audit confirms the existing qualifier list is UNCHANGED.
- Evidence: `harness/toji_stage1_shots.mjs` (12/0) + `harness/shots/toji_s1_*.png`;
  `harness/speed_tier_teleport.mjs` (9/0, incl. new toji case).

## Stage 2 — DONE (basic normals + A-B-C-A+B rekka + Handgun poke)
- Base normals: `light` (jab), `heavy` (big straight), `air` (cross) reuse the punch sheet via sourceX;
  `up` = up_attack launcher (real launch, vy −26); `down_air` = descending weapon swing (S+J airborne).
- **A-B-C-A+B combo string** realized as this engine's rekka idiom (twin of Maki/Miwa): Fwd+Heavy opener
  `tojiG1` (jab) → re-tap Heavy on a CLEAN hit → `tojiG2` (cross) → `tojiG3` (hook) → `tojiG4` (A+B
  big-straight finisher). Cancel-on-hit; a whiff/block ENDS the string (shared `rekkaContinue`).
- **Handgun** command normal: Back+Heavy → `tojiGun` draw→fire (projectile-only cast, no melee hitbox)
  spawns a fast bullet (`tojiBullet`, 40 dmg, speed 22). ~1s cooldown, no energy.
- Code: `abilities.js` (TOJI_GROUND + fireTojiCommand + fireTojiGun + updateTojiCommandCombat, exported);
  `game.js` (import + dispatch after Maki + `tojiCmd` harness hook); `characters.js` (10 anim keys).
- Evidence: `harness/toji_stage2_shots.mjs` (11/0) + `harness/shots/toji_s2_*.png`. Regression clean
  (maki 30/0, miwa 25/0, basickit 17/0).

## Stage 3 — DONE (sword specials)
- **Split Soul Katana** (Neutral Special): ONE continuous 2-part sword combo. Part 1 `tojiSword1`
  (draw-slash) auto-chains into part 2 `tojiSword2` (follow-up cut) via a scheduled `setAttackState`
  as part 1 recovers → both sheets play in sequence under a single press. 2 hits (~74 dmg). CD 78f.
- **Rapid Sword Slashes** (Down Special): stationary multi-hit katana flurry `tojiRapidSlash` (26-frame
  active window, 5 scheduled `hasHit` re-arms — the shared Flash-Spin multi-hit pattern). Pins; ~5 hits. CD 96f.
- No energy (Toji has none) — both cooldown-gated. Direction-branch reserves F/B/U for Stage 4-5.
- Code: `abilities.js` (fireTojiSplitSoul + fireTojiRapidSlash + executeTojiSpecial + triggerSpecial case);
  `game.js` (cooldown ticks for `_gunCd`/`_splitSoulCd`/`_rapidSlashCd` — also fixed a latent S2 bug where
  `_gunCd` never decremented); `characters.js` (3 anim keys).
- Evidence: `harness/toji_stage3_shots.mjs` (5/0) + `harness/shots/toji_s3_*.png`. Regression clean
  (toji S2 11/0, maki 30/0, miwa 25/0).

## Stage 4 — DONE (Chain of a Thousand Miles / Inverted Spear of Heaven)
- **Forward Special** = ONE continuous 5-part sequence `tojiChain1→2→3→4→5` (per the asset map's explicit
  grouping). Each part auto-chains into the next via a scheduled `setAttackState` as it recovers (same
  continuous idiom as Split Soul, extended to 5). LONG reach (whip/spear FX → rangeX up to 195). Part 5
  (Inverted Spear) LAUNCHES. A hitstun/knockdown interrupt STOPS the remaining chain. Committal (~1.5s),
  CD 150f, no energy.
- Code: `abilities.js` (TOJI_CHAIN_PARTS + fireTojiChainPart recursion + fireTojiChain + dispatcher F branch);
  `game.js` (`_chainCd` tick); `characters.js` (5 anim keys).
- Evidence: `harness/toji_stage4_shots.mjs` (5/0) + `harness/shots/toji_s4_*.png` (reach + finisher).
  Regression clean (toji S3 5/0, maki 30/0, miwa 25/0, basickit 17/0).

## Stage 5 — DONE (Playful Cloud + Fly Heads swarm)
- **Playful Cloud** (Up Special): ONE self-contained special using the best-representative frames — the
  `dash_attack` strip (Toji rushes in swinging the three-section staff). A committed forward-lunging staff
  strike / gap-closer (Δx ~66px, 80 dmg), mechanically distinct from the sword/whip specials. CD 96f.
  (attack_1/attack_2/idle/intro/run held — the single special reads cleanest from dash_attack alone.)
- **Fly Heads** (Back Special): releases a SWARM of `tojiFlyHead` shikigami projectiles — 5 SIMULTANEOUS
  instances (not one prop) at staggered heights + vertical spread, each a small `noHitstop` harasser
  (14 dmg). Projectile-only cast (`tojiFlyHeads` hand-forward gesture, reuses punch arm-out frame). CD 132f.
- Code: `abilities.js` (fireTojiPlayfulCloud + fireTojiFlyHeads + dispatcher U/B branches); `game.js`
  (`_playfulCloudCd`/`_flyHeadCd` ticks); `characters.js` (2 anim keys).
- Evidence: `harness/toji_stage5_shots.mjs` (6/0) + `harness/shots/toji_s5_*.png` (swarm shows 5 fly-heads).
  Regression clean (toji S3/S4 5/0, maki 30/0, miwa 25/0, basickit 17/0).

## Special layout (complete)
Neutral = Split Soul Katana · Fwd = Chain of a Thousand Miles · Up = Playful Cloud · Back = Fly Heads ·
Down = Rapid Sword Slashes. Ultimate/Super (X) = Reincarnated Form (Stage 6).

## Stage 6 — DONE (two-stage comeback + Reincarnated Form)
- **Interception:** `applyTojiComeback(p1/p2)` runs in `game.updateBattle` just BEFORE `checkRoundEnd`,
  ungated by training → catches EVERY damage source and pre-empts the KO. State: `_comebackSavesUsed` 0→1→2
  (auto-resets each round via the fresh `resetRound` fighter).
  - **Save 1** (1st zero-HP): HP → 25%, NO transform, i-frames + flash. Match continues.
  - **Save 2** (2nd zero-HP): Reincarnated Form (`applyTransformation` → dmg×1.25/spd×1.1/def×1.08, crimson
    `_reincarnated` sprite tint) **+ HP → 40%**. Match continues.
  - **3rd zero-HP**: both saves spent → nothing → `checkRoundEnd` resolves a NORMAL KO.
- **Super/X = manual Reincarnated Form** (`executeTojiUltimate`, dispatched in `triggerUltimate`): enters the
  SAME buff-form early, ONCE per round, does NOT consume a comeback save (the 2nd save later still restores HP
  but won't re-transform — guarded). Gives X real agency; no double-buff.
- GOTCHA fixed: `updateTransformationState` re-applies multipliers from `currentFormData` every frame, so
  `enterTojiReincarnatedForm` must point `currentFormData` at the reincarnated form (else dmg buff wipes to 1).
- Code: `abilities.js` (applyTojiComeback + enterTojiReincarnatedForm + executeTojiUltimate + ult dispatch);
  `game.js` (import + call before checkRoundEnd + `tojiComeback`/`setP1HealthRaw` harness hooks); `sprite.js`
  (TOJI_REINCARNATED_TINT crimson wash); `characters.js` (reincarnated transform tier, Stage 1).
- **Numbers (flagged proposals):** Save-1 25% (confirmed), Save-2 **40%** (proposal), **per-round reset**
  (brief said "per match" — per-round keeps it alive every round; open for your call in Stage 7 balance).
- Evidence: `harness/toji_stage6_shots.mjs` (15/0, real vs-match: both saves + 3rd normal KO + manual X) +
  `harness/shots/toji_s6_*.png` (crimson form visible). Regression clean (toji S2-5, maki 30/0, miwa 25/0, basickit 17/0).

## Stage 7 — DONE (portrait + canonical test + balance pass)
- **Portrait:** `toji_portrait.png` regenerated as a clean bust (129×126, head+torso from the idle sheet).
- **Canonical test:** NEW `harness/toji.test.mjs` (`npm run test:toji`) — **44/0, stable across 8/8 runs**.
  Covers registration/portrait/HP-only HUD, speed-tier teleport-blur, all 5 normals, the A-B-C-A+B rekka +
  whiff interrupt, the Handgun poke, all 5 specials, the FULL two-stage comeback state machine (all 3
  zero-HP scenarios) + manual Super/X, and stat/balance sanity.
- **Balance:** BALANCE_AUDIT.md Toji row corrected to the rebuild stats (was stale old-build data) + a
  dedicated comeback-scrutiny block (verdict: deliberate mechanic-outlier, not a stat-power outlier; tuning
  knobs = Save-2 % → per-round-vs-per-match → Atk, in that order).
- Regression: maki 30/0, miwa 25/0, basickit 17/0, up-attack-facing 10/0 clean. (zaraki 81/1 = PRE-EXISTING
  `/api/health` save-server 404 in account.js, unrelated to Toji — not my regression.)

## File-utilization summary (25 raw uploads)
- **17 WIRED** (movement/state/intro ×5, normals ×4, sword specials ×3, chain ×5) — every gameplay sheet.
- **6 HELD** (Playful Cloud attack_1/attack_2/idle/intro/run + `transparent` master sheet) — Playful Cloud is
  ONE special from `dash_attack`; the form idle/intro/run aren't needed (no separate form). `transparent` is
  a reference master sheet (portrait sourced from the idle cell instead).
- **2 SWARM/PROP**: `fly_head` (swarm projectile) + `dash_attack` (Playful Cloud) counted in WIRED above.
- **0 DROPPED.** Derived: 24 `toji_*_uniform.png` re-slices + `toji_portrait.png`; raws preserved in `_toji_raw_backup/`.

## Creative skins — 12 (cosmetic only, 2026-08-11)
NEW `tools/gen_toji_creative.py` — per-region recolor (HAIR + TANK TOP + PANTS coordinated). Hair & tank are
both near-black → SPATIAL split (head-zone hair / torso tank), boundary strokes = OUTLINE never recoloured
(line-art rule), pants = the neutral leg ramp, face/skin excluded, multi-tone preserved. 12 × 19 sheets =
228 `__tag.png` files. Registered directly in `skins.js` (like Gojo/Sukuna/Tobi); stale old-build
`ALT_SKINS.toji` (pink/gold/blue/red) removed.
- G1: Prime Variant (Rick-Prime homage: silver-blue/navy/gray) · Royal Valkyrie (Beyblade blue/gold, palette
  matched to Pain/Tobi `royalvalkyrie`) · Mirage Wyrm (Beyblade navy/teal, matched to Pain/Tobi `miragewyrm`) ·
  Crimson Fang (red/black/dark-red).
- G2: Cobalt Killer · Emerald Ronin · Amethyst Blade · Ashen Veteran (desaturated).
- G3: Ivory Reaper · Golden Mercenary · Teal Phantom · **Void Killer** (full near-black + NEW `game.js`
  `drawTojiVoidOverlay` — drifting deep-red particles, bbox-tracked across sword/chain specials, gated on skinId).
- Verified: `harness/toji_skins_shot.mjs` 13/0 (each renders `__tag` across idle/punch/sword/chain);
  palette audit — 0 same-character collisions, cross-char flags all by-spec/distinct-silhouette; base build 44/0
  (zero gameplay change). Combined board: `harness/shots/toji_skins_all12.png`.

## Content gaps (confirmed, not invented)
- **Steam Machine Car** (old movelist `D,B,b`): no matching file in either the deleted old generation or this
  upload set → genuine content gap, not built.
- **Reincarnated Form art**: no distinct form sheet → the form's visual is a crimson sprite tint (Stage 6).
- **guard/block**: no dedicated block sheet → idle-frame stand-in.
