# TOJI ASSET MAP

Documentation-only mapping pass (mirrors `SASUKE_ASSET_MAP.md`). **No PNGs were renamed, edited,
or re-sliced.** No gameplay logic wired — `abilities.js` / `combat.js` are untouched.

⚠ **CORRECTION (2026-07-17):** the original task stated "Toji renders as a procedural box fighter, his
old sprite manifest entry was already removed." **This is NOT true in the current codebase.** Toji is
still a **fully-wired sprite character** — `characters.js` has `hasSprites: true`, `spriteScale: 1.7`,
and a complete `animationData` block; `spritesheets.js` still has an active `toji` manifest entry.
Both point at the **OLD-generation `toji_row01–15_sheet.png` strips** (the sliced rows of the master
sheet). The supposed "prep-for-redo git rm" of those strips **was never done or committed** — see the
row-sheet note under REFERENCE and the item-2 report. The **NEW transparent-background batch mapped in
this doc is NOT yet wired into gameplay** — that is the future pass this doc exists to support.

**Method:** every file was dimension-measured (PIL, confirmed all dims match the task's stated
measurements). Files flagged **"Uncertain"** or as duplicate-suspects were run through
alpha-gutter + visual-boundary-overlay verification and **rendered as upscaled checker-composited
previews and inspected by eye** (same standard as the Sasuke build). `cell width = sheet width ÷
frame count`.

**Frame-count caveat (same as Sasuke doc):** automated alpha-gutter detection is reliable for solid
single-figure CHARACTER frames but UNRELIABLE for (a) sequences where a weapon/chain/trail spans
across the gutters (connects frames → under-counts) and (b) sparse FX. Where automation disagreed
with a confirmed count, both are shown and flagged.

---

## MOVEMENT / STATE (standard action keys every character uses)

| File | Dims (WxH) | Frames | Cell W (W÷f) | Cell H | Move key | Confidence / notes |
|---|---|---|---|---|---|---|
| `toji_stance_idle.png` | 224×54 | 5 | 44.8 | 54 | `idle` | reliable. Standing idle. |
| `toji_walk.png` | 240×48 | 6 | 40 | 48 | `walk` | reliable. |
| `toji_jump.png` | 262×64 | 7 | 37.4 | 64 | `jump` | reliable. |
| `toji_hit.png` | 385×54 | 8 | 48.1 | 54 | `hurt` (grounded) | reliable. Grounded hitstun. |
| `toji_air_hit.png` | 315×49 | **6** ✅ | 52.5 | 49 | `hurt` (airborne) | ⚠ FLAG RESOLVED — verified **6 genuinely distinct frames**, NOT a padded 2–3-pose cycle. Alpha-gutter found 6 evenly-spaced (~52px) frames; consecutive-frame similarity IoU 0.62–0.81 with high color-MAE (31–76) = real per-frame variation. Closest pair is f4↔f5 (IoU 0.81), i.e. at most one near-hold frame → **5–6 unique poses**. The "possibly 2–3 unique" concern is **not** supported. Treat all 6 as distinct. |

---

## INTRO (two-part sequence)

| File | Dims (WxH) | Frames | Cell W | Cell H | Move key | Notes |
|---|---|---|---|---|---|---|
| `toji_intro_first_part.png` | 526×45 | 17 | 30.9 | 45 | `intro` (phase 1) | Walk-in half. |
| `toji_intro_second_part.png` | 531×47 | 15 | 35.4 | 47 | `intro` (phase 2) | Weapon-draw / ready half. |

**One-vs-two-phase decision — ✅ CONFIRMED (2026-07-17): ONE combined intro, fixed order.**
`toji_intro_first_part.png` then `toji_intro_second_part.png` play **back-to-back in fixed order**
(part 1 walk-in → part 2 ready-up) as a **single continuous intro action**.

⚠ **They are NOT two alternate/random-pick options.** Do **not** build a random-select / cycle system
for these the way Sasuke's 3-intro rotation was built — that would be wrong here. Sasuke had three
*independent* intros chosen at random; Toji has **one** intro split across two sheets that must always
play in sequence (1 → 2), every time. A future wiring pass should concatenate the two sheets into one
intro timeline, **not** register them in an intro-pool/random-rotation.

The two halves are slightly different cell heights (45 vs 47), so combined playback should letterbox
to the taller cell.

---

## BASIC KIT — SWORD (candidates for light/heavy `basic_attacks` slots)

Documenting candidates only — do **not** wire all of these at once (same bucket discipline as the
Sasuke basic-kit pass).

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_sword_attack_1.png` | 230×60 | 5 | 46 | 60 | `basicLight` (candidate) | Quick-draw slash — compact, reads as the **LIGHT** basic. |
| `toji_foward_slash_2.png` | 286×45 | 5 | 57.2 | 45 | `basicForward` (candidate) | Horizontal forward slash, more reach → **HEAVY**/forward candidate. ⚠ filename spells "**foward**". |
| `toji_Foword_slash_attack.png` | 484×44 | 11 | 44 (clean) | 44 | `slashCombo` (candidate, **LOOP 5×**) | Extended multi-hit combo. ⚠ filename spells "**Foword**" — a *different* misspelling from `toji_foward_slash_2.png`'s "foward" (two genuinely distinct typos, not the same one). Both kept as-is per the no-rename convention. **This is the move the master sheet labels "x5 repeat"** — see REFERENCE section; it is intended to LOOP 5 TIMES in-engine, not play once. |
| `toji_up_attack.png` | 225×55 | 5 | 45 (clean) | 55 | `up` (launcher) | ✅ high confidence — upward anti-air swing, the up/launcher slot every roster char has. |

---

## SWORD DASH SPECIAL (parts play back-to-back — same pattern as Sasuke's genjutsu/kirin combined sheets)

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_sword_Dash_attack_1.png` | 491×61 | 9 | 54.6 | 61 | `swordDash` (part 1) | Dash windup / launch. |
| `toji_sword_Dash_attack_2.png` | 428×55 | 6 | 71.3 | 55 | `swordDash` (part 2) | Dash strike-lands. |
| `toji_sword_Dash_attack_4.png` | 418×66 | 8 | 52.25 | 66 | `swordDash` (part 3) | Spinning finisher. |
| ~~`toji_sword_Dash_attack_3.png`~~ | 300×56 | 5 | 60 (clean) | 56 | **→ MOVED to GUN family** | ⚠ **CONFIRMED CONTENT MISMATCH** — reclassified by content, not filename (same as Sasuke's `chidori:sword.png` resolution). See GUN section. **Do NOT slot into the sword-dash sequence.** |

**Sword-dash sequence order after removing `_3`:** part1 (`_1`, windup) → part2 (`_2`, strike) →
part3 (`_4`, spin finisher). The `_1/_2/_4` numbering skips 3 because 3 was the mislabeled gun file.

---

## CHAIN WEAPON SPECIAL — "Chain of a Thousand Miles" (motion-gated special, à la Megumi-summon / Sasuke Chidori-tree architecture)

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_chain_of_1000_miles_attack_1.png` | 341×58 | 5 | 68.2 | 58 | `chain` (variant A) | Overhead→forward arc. ⚠ gutter-detect finds **1 segment** (the chain trail bridges every frame → no alpha gutters); use **equal 5-way split**, not gutter split. |
| `toji_chain_of_1000_miles_attack_2.png` | 306×62 | 5 | 61.2 | 62 | `chain` (variant B) | ✅ **DISTINCT from _1, not a duplicate** — whole-sheet overlay vs `_1` = IoU **0.09** / color-MAE 78 (near-total mismatch). Visually `_1` arcs **downward-forward**, `_2` whips **horizontally with a large loop** at a different angle/reach. Genuinely different motions. |
| `toji_chain_of_1000_miles_attack_3.png` | 446×67 | 5 | 89.2 | 67 | `chain` (variant C, heavy) | Wider/longer arc, heavier variant. |
| `toji_chain_of_1000_miles_attack_4.png` | 554×66 | **7** | 79.1 | 66 | `chainDash` (running variant) | ⚠ FLAG RESOLVED — **genuinely distinct, not a duplicate export.** Verified 7 gutter-frames vs the others' 5, larger cell, and visually Toji is in **running/lunging poses** with the chain whipping across the whole width = a **dash/moving version** of the chain attack. Distinct hitbox/use-case → assign its own key. |
| `toji_chain_of_1000_miles_upper_attack_1.png` | 274×61 | 4 | 68.5 | 61 | `chainUpper` (anti-air) | ✅ upward/anti-air chain variant, confirmed different arc direction from the four above. |

---

## GUN SPECIAL (ranged — use `projectiles.js` spawn pattern)

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_gun_attack.png` | 242×58 | 6 | 40.3 | 58 | `gunAttack` | ✅ primary gun-attack. Confirmed stand-and-shoot: pistol progressively **extends forward** through frames 4–6. High confidence. |
| `toji_idk.png` | 262×52 | 7 | 37.4 | 52 | `gunAttackAlt` (candidate) — **NOT a duplicate** | ⚠ FLAG RESOLVED by rendered side-by-side — **distinct pose sequence, not a straight duplicate** of `gun_attack`. Different frame count (7 vs 6), different dims, whole-sheet IoU vs `gun_attack` = 0.26. Visually the arm is **cocked back / drawn in** (not a pistol pointed forward), reads as a **draw / reload / aim-only or whiff** motion rather than the fire pose. Bright/warm-pixel census could NOT confirm a clear muzzle-flash difference either way (both ~10–11% bright), so the "no muzzle flash" claim is inconclusive — but the **pose is clearly different**, so it is not a redundant copy. Decide its role (reload/aim/whiff vs discard) — see OPEN QUESTIONS. |
| `toji_sword_Dash_attack_3.png` | 300×56 | 5 | 60 (clean) | 56 | `gunAttackTracer` (reassigned) | Reclassified here by content. Visually: **stationary stance** (feet planted, identical across all 5 frames — **no dash**), a **thin red horizontal tracer** projecting from the hand with a bright **hand/muzzle flash** in frames 2–5. Reads as a stationary tracer/gun shot (the thin red line could be misread as a slim blade, but there is no dash and no swing arc). Belongs in the ranged/gun family, not the sword-dash sequence. Proposed non-colliding key `gunAttackTracer`. |

---

## SIGNATURE SPECIAL — "Inverted Spear of Heaven" (two-part sequence)

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_inverted_spear_of_heaven_1.png` | 483×44 | 13 | 37.2 | 44 | `invertedSpear` (part 1) | Windup → draw the short spear/dagger → thrust/slash with **red-blade FX** in later frames. |
| `toji_inverted_spear_of_heaven_2.png` | 244×49 | 7 | 34.9 | 49 | `invertedSpear` (part 2) | Overhead raise → downward stab, recovery/follow-through. |

**Tier recommendation → ULTIMATE-tier.** This is Toji's canon signature technique (the cursed tool
that severs cursed techniques / cuts through Infinity), it is the **most elaborate move in the batch**
(13+7 = 20 frames, dedicated red-blade FX, a full windup→strike→recovery arc), and it has no
overlapping/basic use-case. It outclasses the sword-dash and chain specials in production value.
Recommend wiring it as Toji's **ultimate** (part1 = windup/strike, part2 = follow-through, played
back-to-back — same shape as Sasuke's Inverted-Spear-style two-part naming). Fallback if an ultimate
slot is reserved for something else: his **strongest non-ultimate special**. Flagged for your call —
see OPEN QUESTIONS.

---

## FX-ONLY / SUMMON-ADJACENT — small "curse" creatures (NOT the main character)

Rendered previews show these are small **quadruped/multi-legged creature** sprites (little
cursed-spirit-style beasts), not Toji. Note Toji is canonically a *Heavenly Restriction* fighter with
**zero cursed energy** who uses cursed *tools* — so a curse creature is lore-unusual for him;
classification is deferred to you rather than assumed.

| File | Dims (WxH) | Frames | Cell W | Cell H | Proposed key | Notes |
|---|---|---|---|---|---|---|
| `toji_curse_effect_1.png` | 97×24 | **3** ✅ | 32.3 | 24 | `curseCreature` (loop) | ⚠ FLAG RESOLVED — **actually 3 frames, NOT 2, and NOT a truncated fragment.** Refined gutter split found 3 clean segments `(0–24)(29–58)(67–96)` and the render shows 3 distinct creature poses = a complete little cycle. (The task's "only 2 frames" count was low.) |
| `toji_curse_effect_2.png` | 72×22 | 3 | 24 (clean) | 22 | `curseCreature` (variant) | Creature with a bright white glow spot (eye/mouth). |
| `toji_curse_effect_3.png` | 74×19 | 3 | 24.7 | 19 | `curseCreature` (run) | Elongated running/lunge pose. |
| `toji_curse_effect_5.png` | 72×14 | 3 | 24 (clean) | 14 | `curseCreature` (run, alt?) | ⚠ **near-duplicate of `_3`** — confirmed: whole-sheet IoU vs `_3` = 0.52 (similar silhouette family) but **not pixel-identical** (different cell height 14 vs 19, slightly different crop) → likely an alternate export or a different frame of the same run cycle. **AND there is NO `toji_curse_effect_4.png`** in the file listing (numbering skips 3→5). **NOT silently renumbered or filled** — see OPEN QUESTIONS. |

**Role proposal (not assumed):** these read most naturally as a **summon-style assist creature** (a
small beast Toji sics on the opponent) OR a purely **cosmetic** ambient FX — NOT a passive stat
companion. Given the lore mismatch above, flagged for your decision rather than wired. See OPEN
QUESTIONS.

---

## REFERENCE ONLY — DO NOT SLICE OR WIRE

| File | Dims (WxH) | Notes |
|---|---|---|
| `toji_transparent copy.png` | 600×1800 | ⚠ On-disk name has a **SPACE** — `toji_transparent copy.png`, **not** the underscore `toji_transparent_copy.png` the task wrote. Reference as-is. Full master sheet, header text "Toji sprite jus sheet" + a portrait. Cross-reference only. |

**"x5 repeat" label — FOUND & IDENTIFIED.** Opened the master; a small light-gray label reading
**"X5 / repeat"** sits in the right margin at **y ≈ 600** (x ≈ 480–560), beside a long **repeated
sword-slash combo row** (the master's multi-frame forward/overhead slash sequence, master band
y≈536–642). This row corresponds to the sliced **`toji_Foword_slash_attack.png`** (the 484×44
11-frame extended multi-hit combo) — i.e. **that combo is intended to LOOP 5 TIMES in-engine** rather
than play once. **Wiring implication (documented now so it isn't lost):** `slashCombo` needs
`loop`/repeat-count = 5 (or frame-hold equivalent) wiring, not a single playthrough. ⚠ Confirm the
exact file identity at slice time — the labeled master row shows overhead-leaning chops while the
individual `Foword_slash_attack` export reads more horizontal, so verify it's this file and not
`toji_foward_slash_2.png` before locking the loop count onto a specific key.

### Also present on disk (not in the task's file list)

⚠ **`toji_row01_sheet.png` … `toji_row15_sheet.png` (15 files) are the CURRENT, ACTIVE, OLD-generation
Toji sprites — they ARE wired into gameplay right now.** They are the pre-sliced rows of the master
sheet (`toji_transparent copy.png`, 15 content rows) and are referenced throughout
`characters.js` → `toji.animationData` (idle/light/heavy/up/air/dash/block/hurt/transform/
special_1/special_2/chain_* etc.) and by the `toji` entry in `spritesheets.js` (`idle:
"./toji_row03_sheet.png"`, which gates `spritesReady()`). **They are NOT orphaned and must NOT be
deleted** — removing them would break Toji's rendering entirely (idle-decode gate fails, every action
sheet 404s). The intent is that the NEW batch mapped above will *eventually replace* them, but that
re-wire has not happened. See the item-2 report / commit message.

`toji_pfp.jpg` is a portrait/headshot (portrait slot, not an animation).
`toji_sprite_jus_sheet_50__done__by_...jpg` is the original source-art JPG.

---

## OPEN QUESTIONS (need your decision before any wiring)

1. ✅ **RESOLVED (2026-07-17) — INTRO is ONE combined animation, fixed order.**
   `intro_first_part` → `intro_second_part` play back-to-back as a single intro (walk-in → ready-up).
   **NOT** a random-pick pool like Sasuke's 3-intro rotation — do not build a random-cycle system for
   these. See the INTRO section.

2. **`toji_air_hit.png` real unique-pose count.** Verified: **6 distinct frames** (5–6 unique poses,
   at most one near-hold frame). The "2–3 unique poses" concern is not supported — OK to treat all 6
   as distinct? (Documented; just needs your ack.)

3. **`chain_attack_2` vs `_1` — distinct?** ✅ Verified **distinct** (IoU 0.09; different arc angle &
   reach). Assign both as separate chain variants — confirm.

4. **`chain_attack_4` — distinct or duplicate?** ✅ Verified **distinct** — a running/dash variant
   (7 frames vs 5, running poses). Proposed key `chainDash`. Confirm it should be its own move.

5. **`toji_idk.png` vs `toji_gun_attack.png`.** ✅ **Not a straight duplicate** — clearly different
   pose (arm cocked back vs pistol extended). Muzzle-flash presence was inconclusive by pixel census.
   **Decision needed:** is `idk` a reload/aim/whiff variant to wire (`gunAttackAlt`), or discard it?

6. **`curse_effect_4` gap.** There is **no `toji_curse_effect_4.png`** — numbering skips 3→5. **Was
   file 4 simply never uploaded, or is the skip intentional?** Not renumbered/filled pending your
   answer. (Also: `_5` is a near-duplicate of `_3` — IoU 0.52 — keep both or drop one?)

7. **Curse creatures — role?** Small beast sprites, not Toji, and lore-unusual for a Heavenly
   Restriction fighter. **Passive visual companion / summon-style assist / purely cosmetic?** Not
   assumed — your call. (Also confirms whether they're wired at all.)

8. **Inverted Spear of Heaven — tier.** Recommendation: **ULTIMATE-tier** (canon signature, most
   elaborate move in the batch, no basic-move overlap). Fallback: strongest non-ultimate special.
   Confirm the tier.

9. **`sword_Dash_attack_3` reassignment.** Confirmed content mismatch (stationary tracer/gun shot, no
   dash, no sword swing). Reassigned to GUN as `gunAttackTracer`, removed from the sword-dash
   sequence. Confirm the reassignment + proposed key.

10. **"x5 repeat" loop.** The master's "X5 repeat" label maps to the extended multi-hit slash combo
    (`toji_Foword_slash_attack.png`) → wire `slashCombo` to loop **5×**. Confirm this is the correct
    file to attach the 5× loop to (see the slice-time caveat in REFERENCE).

11. **Two forward-slash typos.** `toji_foward_slash_2.png` and `toji_Foword_slash_attack.png` carry
    **two different misspellings** of "forward." Kept as-is (no-rename convention) — just flagging so
    a future wiring pass doesn't assume a single canonical spelling.

---

**Do not wire any of this into `abilities.js` / `characters.js` / `combat.js` until the tables above
are confirmed.**
