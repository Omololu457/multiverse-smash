# BATMAN (NEW VARIANT) — Stage 0 Asset Map & Investigation Report

**Status:** STAGE 0 COMPLETE — investigation only, no gameplay code written. STOP for owner
sign-off before Stage 1.

**Separate from the existing `batman` roster entry.** The old Batman (rosterKey `"batman"`,
DC, source `batman_transparent.png` + `batman_*.png` per-action files) was NOT consulted for
kit/design/naming and MUST NOT be modified. This is a fully independent second entry.
Proposed rosterKey: **`dark_knight`** (owner to confirm — see Decisions).

---

## Source file

- **File:** `df2ek1u-37586e42-9a55-49e4-8390-5496e4e247c4.png`
- **Canvas:** 5120 × 2880, **RGBA with true per-pixel alpha** (confirmed — no chroma key to
  strip, unlike every other character sheet in this project). Resliceing will key on ALPHA,
  not a background color. New reslicer needed (`reslice_dark_knight.py`).
- **Content bbox:** x7–5015, y133–2733. Top-right quadrant (x3840–5120, y0–960) is empty.
- **Attribution:** filename is a DeviantArt-style asset ID; artist NOT determinable from the
  file alone. **OPEN — mandatory before ship** (per project standing rule).

---

## Confirmed three-mode structure (Stage 0 item 1 — CONFIRMED)

The sheet holds **three distinct character modes**, plus FX and reference assets:

1. **Standard form** — full movement + combat + two chain weapons + pistol poses.
2. **Rage / bulked form** — real idle → purple energy-crackle transition → visibly more
   muscular grey form, with its own heavier combat frames.
3. **Mech / powered-armor suit** — a full Optimus-style mecha (bat-eared head, red eyes),
   with a purple wireframe "materialize" sequence + solid armored combat forms.

---

## ⚠ NEW FINDING (not in the original prompt): standard form exists at TWO pixel scales

- **Upper set** (y133–~960, x7–~2900): smaller-scale dark Batman — idle ~**128px** tall.
- **Lower set** (y1920–~2600, x0–~3840): larger, cleaner, more detailed grey-suit Batman —
  idle ~**229px** tall (~1.8× the upper set). This lower set is where the **weapons** and
  **pistol** frames live, and reads as the "hero"/primary art.

These are either (a) the same standard moveset ripped at two resolutions, or (b) two distinct
source sets. **Recommendation:** build the standard form from the **larger lower set** (higher
fidelity, carries the weapons) and treat the upper set as duplicate/secondary. Needs the
coding agent's full frame pass to confirm before locking frame assignments.

---

## Region map (approximate — representative sampling, NOT an exhaustive frame catalog)

| Region (x, y) | Contents |
|---|---|
| x7–2900, y133–960 | **Standard form, SMALL scale**: idle, walk/run, crouch, dodge/roll, multi-angle glide/cape-spread, punch/kick/reach strikes, cape-spin, prone/knockdown |
| x2560–2720, y740–900 | **FX** — concentric white **target-reticle / lock-on ring** |
| x2620–2870, y130–720 | **FX** — two **explosion/fire bursts** (large + smaller variant) |
| x2600–2720, y1000–1150 | **Civilian/detective figure** — single Batman in a **blue overcoat**, brown boots, cowl on. One-off (item 5) |
| x0–256, y1150–1290 | **Portrait fragment** — cowl **lower-face close-up** (jaw/chin/mouth). HUD/select bust (item 6) |
| x0–3840, y1280–1920 | **Rage form**: bat cape-spread → **bulked muscular grey** stance frames → **purple energy-crackle** overlay frames + heavier combat poses |
| ~x820–1150, y980–1120 & x1500–1700, y2050 | **FX** — orange **rubble/dust clouds** |
| x0–3840, y1920–2600 | **Standard form, LARGE scale**: idle, walk/run, combat, glides + **chain weapons + pistol** (see below) |
| x4200–5015, y1031–2733 | **Mech suit**: purple **wireframe materialize** column + **solid armored** combat forms |

---

## Weapons (Stage 0 item 4 — CONFIRMED, but it is TWO chain weapons + a pistol, not chain+boomerang)

Direct inspection of the large lower set shows **two distinct chain weapons plus a firearm**:

1. **Weighted-ball flail chain** — Batman swings a chain with a round **weight/ball** on the
   end (windup + release frames, ball flies off-frame).
2. **Crescent / hook-scythe chain** — a chain ending in a **crescent sickle/hook blade**
   (kusarigama-style). This is the "crescent/boomerang-shaped" weapon from the prompt — it is
   **crescent-on-a-chain**, not a free-flying boomerang.
3. **Pistol / grapple gun** — multiple clear **arm-extended gun-point poses** (muzzle
   visible), aiming left and right.

**Flag:** the prompt assumed "chain grapple" + "thrown crescent boomerang" = 2 tools. Reality
is closer to 3 weapon expressions (flail-chain, crescent-chain, pistol). Owner decision needed
on how many become specials and how to name them.

---

## Mech wireframe repeats (Stage 0 item 3 — PARTIALLY RESOLVED)

The purple wireframe mech appears as a **vertical column of ~5–6 near-identical frames** in the
upper mech block (x~4400–4700, y960–1920) and **again** at the top of the lower mech block
(y1920+). They look like a short **materialize loop** with minor per-frame variation rather than
6 wholly different sequential stages — but a couple read as possible revision duplicates.
**Needs frame-by-frame confirmation** before building the Stage 6 materialize cinematic; treat
as "short loop, dedupe on close pass."

---

## FX & reference assets (Stage 0 item 7 — CONFIRMED, exclude from runtime atlas)

- 2× explosion/fire bursts (large + small) — usable as impact/ult VFX.
- 1× pulsing target-reticle ring — lock-on / charge indicator.
- Rubble/dust clouds (orange) — impact debris VFX.
- Jaw/mouth cowl close-up — **portrait/HUD only** (item 6).
- Blue-overcoat "civilian" figure — one-off, **not a combat set** (item 5).

---

## Content NOT found in sampling (open items)

- **Win-pose / lose-pose / intro** — not identified. May exist in an unsampled corner; the
  full pass should look. Likely fall back to project-standard reuse (knockdown = lose, etc.).
- **Rage revert animation** — not confirmed; likely cut-to-standard-idle fallback (same as
  other timed-mode characters).
- **Dedicated hurt/knockdown for rage & mech modes** — standard-form prone/knockdown exists;
  mode-specific KO art unconfirmed.

---

## Proposed staging (pending owner sign-off)

- **S1** movement (standard, LARGE set) → **S2** normals → **S3** command chains →
  **S4** specials (flail-chain / crescent-chain / pistol / cape-spin) → **S5** Rage Mode
  (timed transform, Vegeta-SSJ/Baki pattern) → **S6** Ultimate = Mech Suit (freeze-cinematic
  materialize → timed heavy form) → **S7** portrait/harness/balance.
- Each stage STOPs with real clips per project rule. Green harness ≠ sign-off.
- **Balance:** three-mode kit is a large-kit outlier by project standards — flag explicitly
  in `BALANCE_AUDIT.md` once real numbers exist (same treatment as other large-kit chars).

---

## Decisions needing owner input before Stage 1

1. **rosterKey / display name** for the new entry (proposed `dark_knight`, name "Batman").
2. **Standard-form scale**: build from the larger lower set (recommended)? Discard/second-tier
   the smaller upper set?
3. **Weapons → specials**: how many of {flail-chain, crescent-chain, pistol, cape-spin} become
   specials, and naming.
4. **Civilian/overcoat figure role**: exclude / intro flavor / idle-variety / select art?
5. **Attribution**: source artist is unknown — blocks ship; owner to supply or accept a
   "source unknown" credit placeholder.

---

## ★ VISUAL AUDIT (2026-08-22, vision-subagent — rendered + looked at every assigned `dark_knight_*` strip + source regions)
**Verdict: mostly-correct with TARGETED spot-fixes — NOT an extensive re-pass.** All movement/state (idle,
walk, crouch, dodge, glide/jump/fall/air, knockdown) + all normals (light, heavy, air, crouchLight) + two
weapon specials (flail, pistol) are content-accurate. Three problem areas, plus a Stage-0 taxonomy drift:

- **`dkRageIdle` / `dkRageTransform` — CONTENT/LABEL DRIFT.** They do NOT show the "bulked muscular grey flesh
  Batman + purple energy-crackle" this map's §"Rage / bulked form" and the characters.js comments describe.
  They actually show a **plated, bat-eared, red-eyed ARMORED batsuit** (`dkRageIdle`) and its **purple
  WIREFRAME materialize sequence** (`dkRageTransform`, solid→wireframe→line-art) — an armor *materialize*, not
  a flesh-bulk rage. There is **no separate flesh-bulk-+-crackle form on the sheet** = GAP for that concept.
  → Relabel the state to "armored batsuit + wireframe materialize" (or declare flesh-rage a GAP). Owner call
  on whether the gameplay feature keeps the name "Rage." Needs a vision sign-off if re-sliced.
- **`dkCrescent` (neutral cast) — WRONG POSE.** Batman stands NEUTRAL, arms at sides — not throwing/casting;
  the crescent hook + a reaching hand sit as a separate right-edge bleed-in. Re-slice a real throw/cast pose
  (dynamic weapon poses exist ~x2900–3700, y1935–2300) or rename to a static "ready." Needs vision sign-off.
- **`dkCape` (Down cast) — ARTIFACT.** Cape-spread wing reads OK for an AoE, but a flail chain-and-ball
  bleeds into the top-left; re-tighten the slice box. Minor.
- **Stage-0 taxonomy drift:** the map's "Mode 2 rage bulk (grey flesh + crackle)" vs "Mode 3 mech" split does
  NOT cleanly match the sheet — the y~1396 band is a SINGLE armored+wireframe sequence; the **true giant
  Optimus-style MECH with its own purple wireframe materialize is a SEPARATE column at x4100–5120** (currently
  unsliced) and is the real candidate for a mech ultimate. Whoever builds that must pull from x4100+, NOT reuse
  the `dkRage*` sheets.
- **GAPS (honest):** true flesh-bulk rage form (doesn't exist); hurt/getup/guard (reuse idle, flagged);
  dedicated up/down-air (reuse heavy/air, flagged); win/lose/intro (fall back to idle).
