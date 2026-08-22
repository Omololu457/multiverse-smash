# PICCOLO — STAGE 0 Asset Map & Investigation Report

**Scope:** standard green-skinned, purple-gi Piccolo (the only character depicted on
this sheet). Transformation tiers (Potential Unleashed / Orange Piccolo / Great Namekian)
are **researched design only — NO art exists on this sheet** (see §7).

**Source sheet:** `3DS - Dragon Ball Z_ Extreme Butoden - Fighters - Piccolo.png`
**(1938 × 9231 px, RGBA)** — 3DS *Dragon Ball Z: Extreme Butoden* rip, **same source family
as Frieza** (`FRIEZA_ASSET_MAP.md`). Cell/key structure is identical to Frieza; the
segmentation approach is reused, with **one Piccolo-specific fix** (green skin — §2).

**Segmenter tool:** `tools/piccolo_stage0_boxes.py` (adapted from `frieza_stage0_boxes.py`).
**Audit renderer:** `tools/piccolo_montage.py` (`all` | index ranges → labelled grey contact sheets).

> **This report was produced by actually rendering + looking at every one of the 154
> detected gameplay boxes + the top reference band** (vision this session was NOT
> image-capped). Every classification below cites the frame(s) it is based on.

---

## 1. Confirmed technical facts (verified directly)

- **Background** = teal `#008080` (0,128,128), 61.2% of the sheet; all four corners exact.
- **Cell fill** = solid green `#00FF50` (0,255,80), 27.9% — **green-FILLED cells** (each sprite
  drawn on its own solid green rectangle; teal is only the outer gutter). Same as Frieza,
  **not** Genos-style outline dividers.
- **Palette:** green skin mid `~(0,128,0)` + highlight `~(0,224,8)`; purple gi
  `~(73,3,87)`, `~(162,43,183)`, `~(125,25,146)`; blue sash `~(38,60,110)`; pink/white
  shoulder-pads + forearm wraps (red cuffs); brown boots.
- **Top reference band (y≈0–780), NOT gameplay — exclude from atlas:**
  - a full-body **caped/turbaned reference figure** (top-left),
  - **5 anime facial close-up portraits** on black backgrounds: calm → smug → angry → two
    shouting (HUD/select material — item 7 confirmed),
  - **3 small full-body alt-palette swatches**: default **purple**, a **dark-teal** recolor,
    a **grey/monochrome** recolor (item 8 confirmed — built-in palettes, like Genos/Heatblast
    swatches; **future SKIN candidates, not transformations**).

---

## 2. Segmentation method + the PICCOLO-specific hazard

Reused Frieza's approach: `label(~green)`; the one huge component = teal background, every
other moated component = one sprite; size-filter ≥800 px, ≥20×20 bbox → **154 gameplay
frames**. No dilation (would merge tightly-packed neighbours). All 154 boxes came out with
`contentPx == interiorArea` (zero teal bleed) — the key is clean.

**★HAZARD (fixed): Piccolo has GREEN SKIN.** Frieza's *loose* green key
`(g>200 & r<90 & b<130)` also grabs Piccolo's bright skin-highlight `(0,224,8)` (**84k px**)
→ it would **punch holes in his body**. Fix: key a **TIGHT** cell-fill green
`|rgb − (0,255,80)| < 40` (grabs exactly the 4.9M cell-fill px, **0 skin**). Mid skin
`(0,128,0)` is already safe (g<200). **Stage 1's reslicer MUST use the tight key** and key
BOTH tight-green + teal to transparent (sprite = neither).

---

## 3. Content overview — cluster inventory (all visually verified)

Box indices are the top→bottom, left→right order printed by `piccolo_stage0_boxes.py`.

| Boxes | Content — visually confirmed |
|---|---|
| 0,1 / 23,24 / 47 / 119,120 | **Guard/block** clusters — arms crossed high over face, braced wide stance (several near-identical "arms-up guard" groups — exactly the look-alike ambiguity the prompt warned about) |
| 2,3 / 125,126 | Hunched/doubled-over — **hurt / gut-hit** reactions |
| 4,5 | Arms **overhead, airborne, leg tucked** — **jump** |
| 6–11 | Fists-up **fighting stances** (combat-ready idle variants) |
| 13–16 | Standing sequence, subtle arm motion, planted feet — **idle / stance-transition candidate (secondary)** |
| **19–22** | Upright, **arms crossed over chest**, feet planted symmetric, subtle arm variation — **PRIMARY IDLE candidate** (see §4) |
| 12 / 18 / 93,94 / 144 | Horizontal/prone — ground state (knockdown, or a low slide — resolve S1) |
| 17 / 36–39 / 48,49 | Forward lunge (17) and **aerial dash/dive attacks** with orange motion streaks (48,49 = flying-kick candidate, §5) |
| 25–28 | Lean-back, arms drawing in — attack windup / recoil |
| 29,30,31 | Low crouch pokes / crouch punch (31 has motion streaks) |
| 32–34 | **Overhead axe/hammer chop** |
| 41,42 / 107,108 | Hunched, arms crossed low — windup / possible charge |
| 43–46 | Both hands open forward, fingers spread — **energy/cast** windup candidate |
| 50–53 / 64–66 / 62,63 | **Rising / high kicks**, knees |
| 56,57 / 73 | **Long lunging kick** (leg fully extended) / side kick |
| 59–61 / 77,78 / 89 | **Straight-punch** jab extension |
| 68 | **Roundhouse / spin kick** (orange arc trail) |
| 81,82 | **Rising uppercut** (arm fully vertical) |
| 85,86 / 115,116 | Wide braced / hands-open-at-sides — **ki-gather / charge** stance |
| 95–98 | Arms-in planted stance (idle-variant / block) |
| 99,100 / 101,102 | Low sweep-across / **upward reach** (anti-air) |
| 103–106 / 109,110 | Arm sweeping up-and-out, fingers spread — **energy/throw cast** poses |
| **111,112,113** | **STRETCH-ARM STRIKE** — long green (red-outlined) elongated-arm crescent whips around; 112/113 recovery (item 4 CONFIRMED) |
| 114 / 151 | Chest-out, arms flexed, proud — **win / power-up** pose |
| 121–124 / 152,153 | Upright neutral / ready stances (turn / getup / intro-end) |
| 127,128 / 129–132 | **Hurt stagger → knockdown descent** |
| 133–143 / 145(no)… | **Prone-on-ground + getup** frames (133–142) |
| **145–150** | **CAPE / TURBAN REMOVAL INTRO** — billow (145) → draped (146,147) → swirl-off (148) → bundled in hand (149) → tossed aside (150) (item 6 CONFIRMED) |

---

## 4. ★HEADLINE — Idle / Guard / Walk classification (prompt items 1 & 2)

**IDLE — PRIMARY candidate: `[19,20,21,22]`.** Upright, **arms crossed over the chest**
(Piccolo's canonical resting stance), **feet planted symmetric and identical across all
four frames**, only the arms/shoulders vary subtly (a breathing/settle loop). They sit
alone in their own y-band (y1923–2090) and do **not** lead into any attack's active frames.
This is the same shape as the corrected Frieza idle (arms-crossed neutral loop), and it is
the strongest true loop on the sheet.
- **Secondary idle/stance candidates:** `[13–16]` (sleeveless-look standing, subtle arm
  motion) and `[6–11]`/`[95–98]` (fists-up combat stances). These read as **stance variants**,
  not the neutral resting loop — reserve as idle-variety, not the base idle.
- **Loop-point still to be confirmed on camera in Stage 1** (per project mandate: a green
  render + actual loop clip, not just "it looks like a loop").

**GUARD — `[119,120]`** (cleanest dedicated block: arms crossed high over the face, braced
wide, near-identical pair). `[0,1]`/`[23,24]`/`[47]` are the other look-alike guard-ish
clusters the prompt flagged — they are **guard/block windups, NOT idle** (no clean self-loop;
they precede defensive/recoil frames).

**WALK — GENUINE GAP: no walk cycle exists on this sheet.** Across all 154 boxes + the top
band there is **no alternating-leg forward-locomotion cycle**. Every locomotion-ish frame
is a planted stance, a **jump** (4,5), or a **dash/lunge/flying attack** (17, 48,49, 56,57).
This is **identical to Frieza** and consistent with *Extreme Butoden* being a hover/dash
fighter with no ground walk. → **Recommendation (matches Frieza): walk + run BORROW the
idle** (or a dash frame); do **not** fabricate locomotion from stance frames (that was the
Frieza mistake). **Flagged as an honest gap for owner sign-off, not silently filled.**

---

## 5. Specials — candidates (prompt items 3–5), confirm before building in Stage 4

| Special (working) | Source frames | Status |
|---|---|---|
| **Stretch-arm strike** | `[111,112,113]` | **CONFIRMED** — real elongated-arm crescent (canon Namekian ability). Long disjoint reach. |
| **Flying / dash kick** | `[48,49]` (horizontal dive) + `[36–39]` (rising dive) | Real distinct aerial attack. ★The prompt's "fire trail" reads on-sheet as an **orange MOTION STREAK**, not literal thruster fire — build as a dash/flying kick; procedural fire FX optional. |
| **Energy charge → beam** | cast poses `[43–46]`/`[103–106]`/`[109,110]`/`[115,116]`; charge `[85,86]`/`[107,108]` | ★**NO beam/projectile sprite exists anywhere on the sheet**, and **no crouched arms-crossed "X" charge cleanly connects to a release frame** (the arms-crossed frames are idle `[19–22]` / guard `[119,120]` / caped-intro `[146,147]`). → A beam (Special Beam Cannon / Masenko) must be **PROCEDURAL**, using the open-hand cast poses as arming frames — **exactly the Frieza resolution**. Owner to confirm which cast pose + whether beam is a special or the ult flavour. |
| Roundhouse spin-kick | `[68]` (orange arc) | Candidate command-normal / special. |
| Rising uppercut | `[81,82]` | Candidate launcher normal / special. |

**Prompt item 5 correction (honest):** the "distinct crouched arms-crossed X charging pose
that leads to a beam" was **not isolated** — hunched arms-in poses exist (`107,108` / `41,42`)
but none was confirmed to connect to a beam-release frame, and no beam art exists. Do **not**
assume the connection; treat the beam as procedural.

---

## 6. Portrait / intro / win / lose

- **Portrait:** one of the 5 top-band anime face close-ups (calm or angry variant).
- **Intro:** cape/turban-removal `[145–150]` (item 6 confirmed).
- **Win:** `[151]` (proud chest-out fists-clenched) — **found**, contradicts the prompt's
  "no win confidently identified"; `[114]` is a flex alternate.
- **Lose:** reuse a prone knockdown frame (`[144]`/`[133]`) — no dedicated lose art (flag).

---

## 7. Transformation system (STAGE 5) — researched, NO art on this sheet

Per the prompt: reuse the project's existing DB hold-to-charge / tap-cancel /
escalating-multiplier timed-mode architecture (Frieza Golden, Vegeta-SSJ, Genos-Overdrive),
**not** a new system. Researched tier structure: **T1 Potential Unleashed** (moderate mult,
low drain, yellow-green tint) · **T2 Orange Piccolo** (signature form — orange skin/red
eyes/black markings + **real body-shape change**, high drain) · **T3 Great Namekian + Orange
giant-form = Ultimate set-piece** (its own cinematic, à la Byakuya Bankai / Batman mech,
not a meter rung). **Namekian Fusion = real canon but structurally excluded** (needs an
external Namekian target; doesn't fit the self-transform meter).

**★HONEST ART GAP — the blocker:** every one of the 154 frames is standard green Piccolo.
There is **ZERO transformed-state art** (no yellow-green tint frames, no orange/bulked body,
no giant form). T2 specifically needs a **body-shape change**, not a recolor. **Do NOT fake
these tiers with palette tricks on the base sprite.** T1 can *possibly* ship as a tint
(Frieza-Golden precedent), but **T2 and T3 need real new art** before they are anything more
than a design doc. This is the single biggest open item in the whole build.

---

## 8. Open items / owner decisions needed before Stage 1

1. **Idle lock:** confirm `[19–22]` arms-crossed as the base idle (Stage 1 shows the loop clip).
2. **Walk gap:** approve **walk/run borrow idle** (no fabricated locomotion) — same as Frieza.
3. **Beam:** confirm **procedural** beam + which cast pose arms it (no beam art exists).
4. **Flying kick:** confirm `[48,49]` as the dash/flying-kick special; motion-streak (not fire).
5. **Kit shape:** with a large normals + stretch-arm + flying-kick + procedural-beam +
   spin-kick + uppercut vocabulary, decide fixed-slot large kit vs trimmed (recommend fixed-slot,
   cf. Green Lantern / Brainiac — Piccolo has broad, distinct content).
6. **Transformations:** decide scope now — (a) design-doc only until art is made, (b) ship
   **T1 as a tint** only, or (c) commission T2/T3 art. **T2/T3 cannot ship faithfully from this
   sheet.**
7. **Alt-palettes** (purple/teal/grey swatches) → future **skins**, not transforms.
8. **Credits:** sprite-rip author unknown — attribution required before ship (cf. Frieza flag).

---

## 9. Stage status

**STAGE 0 — DONE.**
- [x] Sheet dims / teal key / green-FILLED cell structure verified.
- [x] ★Green-skin hazard found + fixed (tight cell-fill key); segmenter written
      (`tools/piccolo_stage0_boxes.py` → **154 boxes**, zero teal bleed).
- [x] **Every box rendered + visually classified** (`tools/piccolo_montage.py`); top
      reference band (portraits + 3 alt-palette swatches) identified & excluded.
- [x] Idle (`19–22`), guard (`119,120`), and the **walk gap** classified with evidence
      (items 1 & 2). Stretch-arm (`111`) confirmed; flying-kick + beam candidates + honest
      beam/X-charge gap reported (items 3–5). Cape intro (`145–150`) + win (`151`) found.
- [x] Transformation tiers = design-only; **art gap flagged as the primary blocker**.

**STOP — per prompt Stage-0 mandate. No gameplay code written.** Awaiting owner sign-off on
§8 (esp. idle lock, walk-borrow-idle, procedural beam, transformation scope) before Stage 1.
