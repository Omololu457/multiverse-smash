# JASON VOORHEES — Asset Map

rosterKey **`jason`** · universe **`horror`** (2nd horror char after Ghostface) · slow/hard-hitting slasher.
Source sheet: `jason_voorhees_sprites_by_xxultra2006xx_dfgsawi.png` (xxultra2006xx, DeviantArt). Attribution
is MANDATORY → `credits.js` SOURCED_ART.jason (verified by credits.test.mjs). Filename typos from the
source are PRESERVED (`jason_idl`, `foward_*`).

## Reslicing
All wired sheets are `jason_<action>_uniform.png`, produced by **`tools/reslice_jason.py`** from COPIES of
the untracked source PNGs (alpha-gutter frame detect → per-frame content bbox → repack into one uniform,
centered-X, BOTTOM-aligned cell). The tool FORCE-SPLITS the 4 touching-frame sheets the audit flagged
(a pure alpha scan merges them): walk, slash_1, slash_2, slash_1_crouch. Split point = lowest-content
interior column. Re-run: `python3 tools/reslice_jason.py`.

## Source → uniform sheet → animationData (measured frames · cell W×H)

| slot | source PNG | uniform sheet | frames | cell | notes |
|------|-----------|---------------|--------|------|-------|
| idle | jason_idl | jason_idle_uniform | 6 | 71×116 | breathing loop |
| walk / run / dash | jason_voorhees_walk | jason_walk_uniform | 10 | 84×113 | force-split @ merged run 602-749; dash=fallback (no blur art) |
| jump / fall | jason_voorhees_jump | jason_jump_uniform | 3 | 72×125 | fall = frame 2 via sourceX 144 |
| hurt | jason_voorhees_hit | jason_hit_uniform | 4 (of 6) | 123×121 | hit-react frames 0-3, sourceX 0 |
| knockdown (KO) | jason_voorhees_hit | jason_hit_uniform | 2 (of 6) | 123×121 | grounded/lying frames 4-5, sourceX 492 |
| light | jason_voorhees_foward_punch | jason_light_uniform | 2 | 112×133 | standing jab; also grab pose |
| heavy | jason_voorhees_slash_1 | jason_heavy_uniform | 4 | 166×140 | overhead machete; force-split @ 190-457 |
| up (launcher) | jason_voorhees_slash_2 | jason_up_uniform | 3 | 88×113 | force-split @ 78-248 · **READ-FLAG: reads horizontal, not upward** |
| air | jason_voorhees_foward_punch_air | jason_air_uniform | 2 | 108×113 | |
| down_air (spike) | jason_voorhees_down_air_attack | jason_down_air_uniform | 2 | 147×121 | frame 2 = wide blade-extend (kept as 1 frame) |
| crouchLight | jason_voorhees_foward_punch_crouch | jason_crouch_light_uniform | 2 | 112×113 | crouch-context swap |
| crouchHeavy | jason_voorhees_slash_1_crouch | jason_crouch_heavy_uniform | 4 | 163×122 | force-split @ 191-457 |

crouching-up has no dedicated art → falls back to standing `up` (slash_2).

## Fallback states (engine defaults, verified in harness/jason_stage1.mjs)
- **block/guard** → no guard art → sprite.js:502 renders **idle** (real sheet).
- **dash** → `jason_walk_uniform` (lumber; no dash-blur art — FLAG for later dash sprite).
- **grab/throw** → `jason_light_uniform` jab windup (real pose, not idle).
- **win/taunt** → no art → holds idle. **death/KO** → knockdown (frames 4-5). No "death" action exists in the engine.
- **back-walk** → engine facing-flip of walk. **turnaround** → instant flip (roster default).

## Special (Stage 3) — "Relentless Slash" (neutral Special, Bloodlust)
ONE lean special. Reuses the heavy/slash_1 art via the `jRelentless` cast pose; distinguished from the
normal heavy by FEEL, not new animation: a committed forward LUNGE (heavy is planted), rangeX 140 (vs
116), 140 raw dmg (vs 98), heavy diagonal blow-back, super armor, 35 Bloodlust cost, camera shake + red
cast flash. Wiring: `characters.js specials.relentlessSlash` + `animationData.jRelentless`; `abilities.js`
`executeJasonSpecial` + dispatch `case "jason"`. USER DECISION: KEPT (it plays distinctly; a normals-only
kit would leave the Special button empty). Honest note: because it shares the heavy animation, the POSE
looks like the heavy — it reads as an "EX heavy" signature move, not a wholly new special (accepted art-reuse).

## Open gaps / flags
- **No ULTIMATE** — no ult art in the source sheet. Intentionally NOT built (open gap, not a placeholder).
- **up-attack (slash_2) launcher read** — reads as a horizontal/lunging gut-slash, not clearly upward.
  Launch MECHANIC works (pops dummy, vy −28). USER DECISION (Stage 2): KEEP as-is.
- Dedicated dash / win / taunt / guard art would replace the current procedural/idle fallbacks later.

## Portrait (Stage 4)
`jason_portrait.png` — hockey-masked bust cropped from idle frame 0 (jason_idl.png crop 6,0→82,72) upscaled
4× nearest → 304×288. Wired via `characters.js jason.portrait`. Real mugshot, not the procedural box.

## Stats (slow hard-hitting slasher) — BALANCE_AUDIT PASS (Stage 4)
HP 1250 · Bloodlust 80 · atk 96 · def 90 · **spd 72 = roster-LOW among real fighters** (next-slowest Megumi
83; Ben10's spd 5 is the immobile Omnitrix shell). NO offensive/defensive stat is a roster record — the only
record is the low-speed FLOOR (a liability). Verdict = FAIR slow-heavy PROFILE outlier, honest ×0.60 pipeline
(zero bypass), NOT strictly worse, NOT a power outlier. Watch-item = HP1250×Def90 bulk (knob = HP→~1200).
See BALANCE_AUDIT.md Jason entry.

## Crouch-context swap (NEW engine hook — generic, no-op without crouch strips)
A grounded light/heavy STARTED while Down is held renders the crouch strip (visual only; numbers/hitbox
unchanged). Wiring: `game.js buildNormalControlState` adds `crouch: g && vKeys[c.down]`; `combat.js`
`_setCrouchVariant` stamps `fighter._crouchAttackVariant` on each light/heavy start (set OR cleared, so it
never lingers); `sprite.js` attack branch returns the crouch action when the strip exists. crouching-up has
no variant → falls back to standing `up` (slash_2).

## Voice / SFX (non-verbal — effort/pain/roar by trigger, NOT dialogue)
`jasonVoice.js` — 13 `jason_sample_*.mp3` clips (filenames PRESERVED), pooled by measured acoustic features
(duration/RMS/crest/zcr — a "can't-hear proxy" like nezukoVoice). `pickJasonVoice(pool)`. Hooks are all
no-op for non-Jason. Verified firing in real play via `test:jason-voice` (17/0, playSfxFile spy).

| slot | pool | clips | trigger (hook) |
|------|------|-------|----------------|
| 1 attack effort (light) | effortLight | 03 | light + crouch-light active-frame · combat.applyJasonAttackVoice |
| 1 attack effort (heavy) | effortHeavy | 04, 01 | heavy/up/down_air + crouch-heavy active-frame (★NOT air — excluded per brief) |
| 2 special cast | specialCast | 02, 05, 12 | Relentless Slash cast · abilities.executeJasonSpecial |
| 5 signature roar | specialRoar | 07, 10 | ~25% of casts, instead of the grunt (no ult → roar lands here) |
| 3 hit reaction | hitReact | 13 | Jason takes a STRONG (heavy/special-tier, or ≥55 dmg) hit · combat.applyJasonHitVoice (light pokes stay silent) |
| 4 knockdown | knockdown | 09 | enters downed state (any source) · combat.updateCombat watcher (fires once) |
| 6 win | win | 11, 08 | victory · game.js win dispatch |

**Left silent (flagged, not forced):** KO/death — no clip reads as a fitting death vocalization for an
"unkillable" slasher, and the downed moment is already covered by slot 4's knockdown grunt. **Unused/reserve:**
`jason_sample_06_0110.mp3` (no slot needed it). Cooldowns: effort `_jAtkVoiceCd` (24f), hit `_hitVoiceCd` (150f).
Test-only helper added: `__harness.p2Heavy()` (a heavy-category strong hit, to exercise defender hit-react).

## Skins (Default + 13 — his first batch; desaturated/grounded register)
`tools/gen_jason_creative.py` — 3-region recolor via `recolor_palette.recolor_multi` (all `--to-tone`,
shading preserved). Regions gated from the measured histogram: **JACKET** cool+dark (max_val 0.40 +
max_warm, keeps pure-black outline), **MASK** neutral grey (sat<0.16, val 0.40-0.98), **SKIN** warm hue
5-45. Generates `jason_*__<tag>.png` (11 sheets + portrait × 13 = 156 files). Regen: `python3
tools/gen_jason_creative.py ALL`. Wired as hand-written `skins.js` entries (`recolorSkinAnim`). Note: the
machete is grey → it rides the MASK recolor (coherent: bloodied blade on Bloodbath/Crimson, aged on
Weathered/Bone). Skin IDs: `jason_<tag>` except Void = **`jasonNightmareVoid`**.

Tags: weathered · bloodbath (mask blood + lower-body blood-trail accent) · burlap · midnight · toxic ·
counselor · ashen (charred near-black + faint warm ember) · frozen · steel · crimson (boldest, both
regions saturated red) · shadow · bone · void.

**Nightmare Void** = full-black recolor + `game.js drawJasonVoidAuraOverlay` (crimson-red drifting motes +
glowing red eyes; gated `skinId==="jasonNightmareVoid"`, registered in the Void-overlay dispatch ~line 7588).
Verified in-game: `test:jason-skins` (all 14 apply, 0 procedural boxes, 0 errors); select-depth 14/0.
Preview: `harness/shots/jason_skins_preview.png`.

## Tests
- `node harness/jason_stage1.mjs` — Stage 1 evidence (15/0): sprite gate, movement/state, fallback sweep.
- `node harness/jason_stage2.mjs` — Stage 2 evidence (18/0): 5 normals connect + correct sheets, both
  crouch swaps connect + swap, crouch-up fallback, no lingering crouch. Air normals given rangeX/Y reach.
- `node harness/jason_stage3.mjs` — Stage 3 evidence (8/0): Relentless Slash fires/connects (84 vs heavy
  58)/spends Bloodlust/lunges/energy-gated.
- `harness/jason.test.mjs` — canonical suite (Stage 4).
