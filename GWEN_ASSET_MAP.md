# GWEN TENNYSON — STAGE 0 Asset Map & Investigation Report

**Scope:** single character, single form (Gwen Tennyson, teen — orange hair, blue dress
over grey skirt + dark tights). One depicted character; no alt-palette swatches on sheet.

**Source sheet:** `jus_gwen_tennyson_spritesheet_by_magnesiumselzune__by_renatoooferreiraaa_dmnjxu8.png`
**(2373 × 623 px, RGBA)** — fan-made JUS-style chibi sheet. **Credit: magnesiumselzune**
(spritework), additional **"justin kaiser"** (credited inline next to the 3-character
reference art, boxes 13–15), compiled/reposted by **renatoooferreiraaa**. NOT an official
game rip.

**★UNIQUE IN PROJECT:** this is the **first LANDSCAPE sheet** (2373 wide × 623 tall). Every
other catalogued sheet is portrait/tall. It is also **effects-and-combat focused only** —
it carries a large FX library but has **no Win / Lose / Intro poses** (§7, a real gap).

**Segmenter tool:** `tools/gwen_stage0_boxes.py` — background is a **flat dark-navy field
`(41,49,74)`, fully opaque** (NOT transparent, NOT a per-cell grid). Non-bg connected
components → 170 boxes, sorted top→bottom / left→right, rendered as 4 labelled 2× montage
slices (`/tmp/gwen_box_0..3.png`).

> **This report was produced by actually rendering + looking at all 170 detected boxes**
> (vision this session was NOT image-capped — all 4 montage slices + targeted 4× crops of
> walk/run, crouch/dash, the silhouette, and the crescent/starburst were reviewed). Every
> classification below cites the box index(es) it is based on. **No on-sheet text labels
> exist anywhere** (unlike Kakashi) — every move name here is a **descriptive working
> title** assigned from visual content + Gwen's known mana powerset, NOT the artist's name.

---

## 1. Confirmed technical facts (verified directly)

- **Background** = flat navy `(41,49,74)`, 88.2% of sheet, all four corners exact. Very
  high contrast vs sprites → a tolerance-insensitive key (`|Δrgb|<40`) is clean.
- **Alpha:** fully opaque everywhere (min=max=255). Keying is by **background COLOR**, not
  alpha — the reslice tool must replace navy → transparent.
- **No grid / no cell fill:** sprites float freely on the navy field with irregular
  spacing. Segmentation is pure connected-component (like Piccolo's per-sprite moats, but
  the moat is the whole background, not per-cell).
- **Palette:** orange hair `~(210,120,40)`; navy-blue dress top `~(30,55,110)` with white
  collar/belt; grey skirt; dark maroon tights; skin `~(245,205,175)`. Magenta mana FX
  `~(252,116,245)` + white cores `~(250,254,254)`; blue/cyan FX for the blade + vortex;
  the silhouette adds violet `~(164,12,233)` / deep-purple `~(23,1,49)`.

---

## 2. Segmentation caveats

- Connected-component **merges** frames that visually touch (e.g. a construct that overlaps
  its spawn pose) and **splits** a single figure whose limb is bg-colored. Counts below are
  "clusters of frames," refined per-stage.
- The **3-character reference art (boxes 13,14,15)** + the inline **"credit to justin
  kaiser"** text sit mid-sheet (x≈2100, y≈40). These are **select-screen/credit material —
  EXCLUDE from moveset** (same treatment as Piccolo's portrait band, Handler's credit row).

---

## 3. Body / movement inventory (Gwen sprites)

| Role | Boxes | Notes |
|---|---|---|
| **Walk** | 0,1,2,3 | ✔ Confirmed real 4-frame alternating-leg cycle, arms swing. |
| **Jump / leap** | 4,5,6,7 | Arm thrown up, airborne, legs tucked — reads as pure ascent. **No mana FX attached to these four** (the "jump paired with mana" the audit flagged is not in this group; watch for it at Stage 1). |
| **Idle / guard** | 9, 24 | Ready stance, hands near chest. |
| **Crouch** | 20 | Low hunched stance. **2nd low-reach/slide pose to confirm at Stage 1** (candidates: low-kick poses 84,85 or reach 66) — do NOT assume it's a 2nd crouch vs a move-windup yet. |
| **Dash / run** | 21 (lean-in), 22,23 (stride), 71,72 (stride) | Leaning-forward run; 21 is the dash-start lean. |
| **Casting stance** | 8 (holds a red/pink **grimoire/spellbook**), 25 (pink orb forming at palm) | Book pose is a distinct casting idle; the spellbook is Gwen's canon Charms-of-Bezel tome. |
| **Hit → knockdown → rise** | 149,150 (fall), 151 (rise/recover) | ✔ Chained on sheet right after the blade block (147/148). Build the hurt→KD→getup connection intentionally. **No held KO/Lose pose** — 150 is a mid-fall frame, not a settled defeat pose (§7). |

**Normals candidates (jab/kick):** 16,18,19 + 43,44,45 + 106,107,108 (arm-extended punches);
63,64,65 (high **kick**, leg extended + motion streak). → Stage 2.

---

## 4. Effect / special inventory (grouped by system)

### A. Magenta mana-bolt / blast system
- **Casting bolt:** 25 (charge at palm) → 26,27,28 (pink oval projectile forming / flight /
  dissipate); 42 (bolt fired as a **horizontal pink beam** from hand).
- **Starburst charge-and-fire:** 112,113,114,115 (bright white core, magenta radiating
  spikes, **grows** then) → 116 (collapses into a horizontal capsule **bolt**). This is the
  strongest "mana bolt" projectile candidate.
- **Oval / portal capsule beam:** 97,98,99,100,101,117,118,119,120,121,122,123 — white-core
  magenta-rim shape morphing sphere↔capsule; plus **growing oval RINGS** 102,103,104,105.
  → the audit's "larger oval/portal beam, segmented capsule." **Reads as a genuinely
  separate projectile from the bolt** (different silhouette + its own ring-open frames).

### B. Crescent mana slash (high visual priority)
- 48,49,50 (large curved pink energy **arc** sweeping around her) + 52 (gather at fists) +
  69,70 (follow-through swirl). Signature-looking melee-range arc.

### C. Mana-construct geometry LIBRARY (item 6)
Multiple **distinct** solid-pink shapes, NOT one construct:
- **Cubes/blocks** (size ramp): 35,36,37,11,38 / 73,74,77,78,86
- **Angled ramps/wedges:** 80,81,82,56,87,88
- **Spheres:** 91 (segmented), 92 (plain), 10 (large)
- **Spike-crowns:** 12 (big), 110, 75, 76
- **Pillars:** 89, 90
- **Multi-spike ground clusters:** 93,94,95,96,111,55,79
- **Shards / petals (projectiles):** 53, 54

### D. Blue / cyan energy set (item 1 — **DECISION REQUIRED**)
- **Radial burst:** 127–138 (~12 frames of a CYAN radial burst, same *structure* as the
  magenta starburst 112–115 but **more elaborate**) + **horizontal cyan beam/trails**
  139,140,141,142.

### E. Frost / white root-or-vine (item 2 — **unassigned**)
- 57,58,59,60,61,62 (six **white wavy vertical columns** rising from a debris base) + 83
  (thin variant). **Does NOT map to Gwen's mana powerset** — left unassigned (§8).

### F. Sonic / scream waveform (item 6 FX)
- 39,40 + 2 more (purple **jagged horizontal waveform**, ~4 frames).

### G. Shield / dome (item 6 FX)
- 10 (full magenta **sphere/dome**), 34 (**half-dome**).

### H. Ripple / shrinking-ring impact (item 6 FX)
- Present among the ring frames 102–105 (a shrinking ring/ripple variant).

### I. Fire / explosion (item 4 — **generic, NOT Gwen's**)
- 153–160 (directional **fireball** frames), 161,162,163 (brown **debris**), 164–169 (ground
  **fire** rows). Orange/red flames — **her canon powers are magic/mana, not fire.** See §8.

### J. Dark energy-tendril silhouette (item 3 — **UNRESOLVED**)
- 109: a **dark-violet humanoid figure** with white/pink energy tendrils streaming from the
  head + a wispy dissolving lower body. Colors: violet `(164,12,233)`, deep-purple
  `(23,1,49)`, white + pink tendrils. **Function left genuinely unresolved** per the brief —
  transformation vs summon vs corruption cannot be determined from the static frame.
  **Note on "appears twice":** pixel-signature scan for the violet body found only **one**
  unambiguous full instance (x175–198). A second full figure could NOT be confirmed by
  pixel analysis; if it exists it is faint/partial. Flagged honestly, not force-fit.

### K. Giant energy blade — **ULTIMATE candidate** (Stage 5)
- 143 (idle) → 144 (small **blue charge orb** at hand) → 145 (blade begins to extend) →
  126,124,125 (blade extends through **progressive length stages**, diagonal cyan beam-blade)
  → 146 (held full-length) → 147 (**swing**) / 148 (recover). ~11 frames, highest production
  detail on the sheet. **The blade is CYAN/blue** (same palette family as set D). Clear
  Ultimate — build as such.

---

## 5. Stage-by-stage forward map (previews only — no code yet)

- **S1 (movement):** walk 0-3 / jump 4-7 / idle 9,24 / crouch 20 (+confirm 2nd low pose) /
  dash 21-23,71-72 / hurt→KD→rise 149-151. Registration: navy-key reslice, transparent-out.
- **S2 (normals):** jab (16/18/19 or 106-108) + kick (63-65), ×0.60.
- **S3 (chains):** **NONE catalogued** — no multi-hit string beyond jab/kick. Do not invent.
- **S4 (specials):** Casting→mana bolt (A) / Crescent slash (B) / Construct summon(s) (C) /
  Oval-portal beam (A) / **Blue set (D) — pending item-1 decision**.
- **S5 (ULT):** Giant energy blade (K).
- **S6 (FX attach):** shield/dome (G), spike/pillar/shard clusters (C), sonic waveform (F),
  ripple (H) — attach to the S4/S5 moves; never standalone.
- **S7 (portrait/win/lose/intro/harness/balance):** **win/lose/intro MISSING → source
  separately** (§7). Portrait = crop an idle/casting bust. Harness + BALANCE_AUDIT last.

---

## 6. Precedent found for the construct question (item 6)

`abilities.js` **Green Lantern** (`GL_CONSTRUCTS`, `executeGreenLanternSpecial`) is the exact
in-project pattern for a multi-shape construct kit: **fixed directional slots** (neutral=Fist
/ Fwd=Lion-Ram / Back=Blade / Down=Tentacle / Up=Spike-Crown / air=Sphere), each a **sprite
cut from source, spawned as a projectile** with per-construct cost/speed/rise/drop. Gwen's
geometry library (cube / ramp / sphere / spike-crown / pillar / spike-cluster) maps **1:1**
onto this. **Confirms the multi-construct reading over single-construct.** There is **no
scrolling "construct-select" menu** in-project and **no shared sprite-FX library** — fixed
directional slots is the convention, and generic impacts are drawn procedurally in code.

---

## 7. Missing content (real gaps, not inferred)

- **No Win pose. No held Lose/KO pose. No Intro sequence.** The only "defeat" art is the
  mid-fall knockdown 149,150. This sheet is a different asset category than the Extreme
  Butoden fighters (FX-and-combat focused) — **do NOT borrow an EB fallback convention.**
  Flag as an **open art dependency**; source separately (or accept stopgaps only with owner
  sign-off at S7).
- The **3-char reference art (13,14,15)** = credit illustration, excluded.

---

## 8. Open decision items (STOP — owner input needed before Stage 4)

1. **Blue/cyan set D (127–142):** distinct **second special** (its own cyan radial-burst +
   beam-trail attack) **vs.** a **charged/empowered tier** of the magenta bolt. My evidence:
   the blue set is a *large, self-contained* animation (~16 frames incl. its own horizontal
   beam trails 139-142) — richer than the 4-frame magenta starburst — which **leans toward a
   distinct special**, but a charged-tier reading is viable and cheaper. **Not both by
   default.** *(Blocks part of Stage 4.)*
2. **Frost/white root-or-vine (E, 57-62):** no clean home in Gwen's mana kit. Keep as an
   unassigned effect **or declare out of scope** for this build. *(No fabricated ice/plant
   canon.)*
3. **Dark energy-tendril silhouette (J, 109):** function **left genuinely unresolved** —
   keep parked, do not assign a role just to close it. (Also: "appears twice" not confirmed
   by pixel scan — see §4J.)
4. **Fire/explosion set (I, 153-169):** classified here as **generic impact FX, NOT Gwen's
   move.** Project has no shared sprite-FX file to re-home it into (impacts are procedural),
   so default is **exclude**. Confirm.
5. **Win/Lose/Intro (§7):** genuinely missing — decide **source-separately vs. stopgap**.
6. **Construct design (item 6):** §6 recommends **fixed-slot multi-construct** (Green Lantern
   pattern). Confirm slot assignment before Stage 4.

**STOP per prompt — Stage 0 is report-only. Awaiting decisions on items 1–6 before any
Stage 1 registration / gameplay code.**

---

## 9. OWNER DECISIONS — LOCKED (2026-08-23)

1. **Blue/cyan set D (127–142) = DISTINCT SECOND SPECIAL** (its own cyan radial-burst +
   beam-trail attack). NOT a charged tier of the magenta bolt.
2. **Frost/vine (E, 57-62) + Fire/explosion (I, 153-169) = BOTH EXCLUDED** — off-kit; not
   built, not parked.
3. **Dark silhouette (J, 109) = STAYS PARKED / unresolved** (unchanged).
4. **Win/Lose/Intro (§7) = FLAG AS OPEN ART DEP + use S7 stopgaps** (portrait from idle/cast
   bust, win = repurposed pose, lose = knockdown). Real art is a follow-up.
5. **Constructs (§6) = FIXED-SLOT MULTI-CONSTRUCT** (Green Lantern pattern). Slot mapping
   finalized at Stage 4.

---

## 10. STAGE 1 — DONE (2026-08-23, `test:gwen-stage1` 27/0)

`tools/reslice_gwen.py` (navy key-by-COLOR, FLIP_H=False — whole sheet faces right) +
5-file registration (characters/spritesheets/skins/credits/package). **HP1120 / EN200 /
Atk82 Def80 Spd92 / scale 2.25 → idle 108px on-screen (roster mid-band) / energyType
"mana" / universe "ben10".** Movement picks (box indices):
- idle [24,33] (clean standing; FX frames excluded) · guard [9] (spellbook brace) ·
  walk [0-3] ✔ real cycle · run [22,23,71,72] ≠ walk · dash [66] (own low-lunge+streak) ·
  jump [4-7] (fall = apex reuse) · crouch [20] · hurt [149] · knockdown [149,150,151]
  (tumble→flat→rise; flat frame = LOSE-pose stopgap).
- **Stage-0 "2nd low pose" RESOLVED:** not a crouch — box 85 = crouch-conjure construct
  (Stage 4), box 66 = dash-slide. Crouch is 1 state.
- Regress kakashi-stage1 25/0 + bardock-stage1 23/0 clean.
- **Minor polish (banked):** run frames carry a few detached motion-streak specks; idle
  f1 (box 24) has a faint pink hand-spark. Both minor, on-theme.

---

## 11. STAGE 2 — Normals DONE (2026-08-23, `test:gwen-stage2` 17/0)

4 REAL distinct melee poses on the sheet (×0.60 via GLOBAL_DAMAGE_SCALE):
- **light** [43,44,45] standing straight punch (44 = white streak) · **heavy** [46,47] lunge
  punch (coil-step → forward thrust) · **up/launcher** [63,64,65] forward/high kick (red
  streak, knockbackY launches) · **crouchLight** [16,18,19] genuine LOW crouch-punch (hand
  braced on ground) · **air + down_air** REUSE the light punch sheet (no aerial art).
- ★CORRECTION vs first pass: boxes 16-19 / 106-108 are LOW crouch-punches (hand on ground),
  NOT standing jabs → routed to crouchLight, not light.
- Damage verified ×0.60: light 42→25, heavy 80→48, up 64→38, air 52→31, downAir 70→42.
- **S3 command chains = NONE** (no chain content on the sheet, per prompt).
- Regress kakashi-stage2 16/0 + gwen-stage1 27/0 clean.

---

## 12. STAGE 4 — Specials DONE (2026-08-23, `test:gwen-stage4` 27/0)

Fixed-slot mana zoner — `executeGwenSpecial` + `GWEN_SPECIALS` (abilities.js), mirrors
executePiccoloSpecial/executeVegitoSpecial + the Green Lantern construct pattern. All 5
owner-locked concepts fit the 6 directional slots:
- **N = Mana Bolt** — procedural magenta bolt (color #f574f5), cost 30, 92 raw.
- **F = Crescent Slash** — wide disjoint MELEE arc (createAttackFromMove, rangeX 104), 96 raw.
- **U = Spike-Crown construct** — real sliced sprite `gwen_spike`, rises (vy −12) = anti-air.
- **D = Mana Sphere construct** — real sliced sprite `gwen_sphere`, ground advance.
- **B = Blue Vortex** — DISTINCT 2nd special: big slow procedural cyan burst (#4ad9ff, w84).
- **air = Oval-Portal Beam** — fast procedural magenta capsule (#ff9cf0), aerial.
- Cast poses: `gwenCast` [25,26] (hand-extended, shared) + `gwenCrescent` [48,49] (arc swing),
  both real reslice frames. Construct shapes spawn via spawnProjectile (not animationData).
- Damage folds offense mult (like Piccolo/Vegito); ×0.60 EFF at hit (bolt 92→55, crescent
  96→57, spike →48, sphere →54, vortex →62, oval →52).
- ★TWO harness lessons: (1) `piercing` is a COSMETIC flag — NOT stored on projectiles (only
  IM2's `piercesMulti` actually pierces); (2) point-blank big-radius constructs hit + despawn
  SAME-frame → invisible to a post-spawn poll, so spawn-checks need a wide gap + connect-checks
  use liftP2/close range.
- **Construct expansion banked:** only 2 of the sheet's construct shapes are wired (spike-crown,
  sphere). Ramp/block/pillar/segmented-shapes remain available for future slots or skins.
- Regress green-lantern-s4 10/0 + piccolo-s4 23/0 + vegito-s4 26/0 + gwen-s1/s2 clean.

---

## 13. STAGE 5 — Ultimate "Mana Blade" DONE (2026-08-23, `test:gwen-stage5` 9/0)

The sheet's standout sequence, built as the ULT. `executeGwenUltimate` + `GWEN_ULT`
(abilities.js) — INLINE freeze-cinematic on the LIVE fighter (Green Lantern/Deathstroke
pattern, NO duplicate instance), mirrors the roster's ult convention.
- Cast pose `gwenBlade` = a **play-ONCE 6-frame sequence** [143,144,145,146,147,148]
  (book-raise → charge orb → blade extends → hold → swing), speed 8 → spans ~48f then
  lockLastFrame holds the swing through the 66f cinematic.
- Giant cyan blade **beam** `gwen_blade_beam` [125] manifested at the frozen foe as a
  visualOnly sprite at **growing scale** per beat (0.8 → 1.9).
- 5 beats: charge telegraph (0) → extend×2 (60+60) → full hold (70) → SWING payoff (140,
  knockdown). **330 raw → EXACTLY 198 EFF** (×0.60, top-ult band). Foe frozen via hitstop;
  guaranteed range-independent `applyScaledDamage`.
- Dispatch: `case "gwen"` in triggerUltimate (~abilities.js:21744). ultimate name "Mana
  Blade" cost 100.
- Blade art confirmed cyan (figure 4.4% / beam 24.8% cyan px) — not knockdown pollution.
- Regress green-lantern-s6 9/0 (mirrored ult path) + gwen-s1/s2/s4 clean.

---

## 14. STAGE 6 — Supporting FX attached (2026-08-23, `test:gwen-stage6` 8/0)

FX library attached to the S4/S5 specials as on-connect `impact` blooms (idiomatic
`spawnProjectile` hook — Vegeta/Beerus/Yuji pattern), NOT standalone moves:
- **RIPPLE** (growing magenta ring, frames 102-105, `gwen_ripple_uniform`) → on-connect
  bloom for the ranged **Mana Bolt / Blue Vortex / Oval-Portal Beam**; also blooms on the
  **ULT swing payoff** (visualOnly, scale 2.2).
- **SHARDS** (mana spike-cluster burst, frames 93-95, `gwen_shards_uniform`) → on-connect
  bloom for the **Spike-Crown / Mana Sphere constructs**.
- Wiring: `GWEN_FX_RIPPLE` / `GWEN_FX_SHARDS` on each `GWEN_SPECIALS` entry; passed through
  `fireGwenProjectile` (`impact: t.impact`). combat.resolveProjectileHitsMulti spawns the
  `<proj>_impact` sprite on clean (non-blocked) connect.
- ★Stage-4 probe fix: `seeProj` now excludes `_impact` names so sheet-checks read the MAIN
  projectile, not its bloom (impact projectiles carry their own FX sheet).

**DEFERRED FX (documented, not force-attached):**
- **Shield/dome (G, boxes 10/34)** — has NO attack pose; attaching it would require a NEW
  defensive move/mechanic, which the prompt forbids ("no standalone without a clear attack
  pose"). Parked for a future defensive-special design decision.
- **Sonic/scream waveform (F, 39,40+2)** — no clean mechanical home distinct from the
  ripple/shards; parked (candidate: a future counter/burst move).
- **Crystal pillars (89,90) / extra spike rows (55,79)** — available for future construct
  variants; not needed by the current 2-construct kit.
- Crescent Slash (melee) keeps its baked-in arc art as its own FX (no projectile → no
  `impact` hook).
- Regress gwen-s4 27/0 (post probe-fix) + gwen-s5 9/0 + vegito-s4 26/0 clean.

---

## 15. STAGE 7 — Portrait / win / lose / intro / canonical / balance — CHAR COMPLETE (2026-08-23, `test:gwen` 37/0)

- **Portrait:** `gwen_portrait.png` — head/torso bust from the spellbook stance (box 9).
- **Win (STOPGAP):** `gwen_win_uniform` = arm-raised spellbook pose (box 143) as a
  victory-raise. **Lose:** reuses `gwen_knockdown_uniform` ending on the flat downed frame
  (frames:2 + lockLastFrame). Wired as `animationData.win`/`lose` (`_forceAction` on match end).
- **Intro:** DEFERRED — no intro art on the sheet.
- **★OPEN ART DEP (§7):** win/lose/intro have NO dedicated art on this sheet — the above are
  stopgaps; source bespoke art separately before final ship. Credit illustration (boxes
  13-15, "justin kaiser") stays excluded.
- **Canonical harness:** NEW `harness/gwen.test.mjs` (`test:gwen` **37/0**) — S1 gate/stats +
  movement, S2 normals connect, S4 all 6 specials, S5 ULT ~198 EFF, S6 ripple impact, S7
  win/lose wiring, full fallback-box sweep, no JS errors.
- **BALANCE_AUDIT.md:** full entry added — fair mana zoner (below-avg Def 80 glass, no
  outlier; ult pinned to the ~198 top-ult band).
- Regression: full gwen suite green (s1 27 / s2 17 / s4 27 / s5 9 / s6 8 / canonical 37);
  green-lantern-s4 10 / s6 9, vegito-s4 26, kakashi-s1 25 clean. **piccolo-stage4 = 22/1**
  (Flying Dash Kick positional air-connect — timing-sensitive pre-existing flaky, NOT touched
  by this build; Gwen adds only an isolated GWEN_* block + additive dispatch cases).

**★CHAR FULLY COMPLETE S0-S7.** Follow-ups (banked): bespoke win/lose/intro art (open dep),
skins, voice (blocked), more construct shapes (ramp/block/pillar), shield/dome defensive move,
sonic-waveform home, silhouette (box 109) role. UNCOMMITTED.
