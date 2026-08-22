# WILDMUTT — ASSET MAP (Stage 0)

Grounded audit for building Wildmutt (Ben 10 transform FORM) art. Wildmutt currently has a pool
STAT entry (`fighters.js:892` — rush, HP1000, spd9, dmg0.9, Pounce / Feral Frenzy) but **no art**
— not in `BEN10_ART_ALIENS`, renders procedurally. This is a **fresh art build**.

> Written from a direct visual pass of the #13 Dragonrod sheet + a programmatic white-key band scan.
> Frame counts marked `≈` are approximate (band scan) — **confirmed at Stage-1 slice time**. This map
> was authored under an image-viewing cap that blocked visually auditing the #12 sheet and blocked
> re-viewing slice output; precise frame→slot picks are therefore deferred to a Stage-1 VISUAL pass.

---

## Decision LOCKED (owner, 2026-08-22)

**Authoritative source → #13 Dragonrod** (`wildmutt_by_dragonrod342_davs1vq.png`, 608×720, white bg,
fully opaque). Chosen for a single-source build (roster-consistent with Heatblast / Four Arms /
Diamondhead / Wildvine, all dragonrod342) and because it is the sheet that could be fully visually
audited this session. **#12 ipmugen is NOT used** (`djimf88`, 1280×1018, cyan-keyed; structure
measured — 13 bands / ~10 rows / 3 label-like thin bands — but frame content unaudited).

---

## Source

- **AUTHORITATIVE — #13 Dragonrod:** `wildmutt_by_dragonrod342_davs1vq.png` — 608×720 PNG, opaque,
  WHITE background (88% white → key white to transparent). Orange Vulpimancer (eyeless, quilled back,
  gorilla-dog build). **Unlabeled** (no text section headers). Credit: Dragonrod (dragonrod342).
- **NOT USED — #12 ipmugen:** `wildmutt___sprites_sheet_by_ipmugenofficial_djimf88-fullview.jpeg`.

---

## Visual audit (what was actually seen) + measured rows

White-keyed band scan found 9 super-rows (some merge multiple sprite rows). Pairing the scan with the
visual pass:

| Row (y-band) | ≈Frames | Seen content → candidate role |
|---|---|---|
| row0 `y16-56`   | 2  | Hunched four-legged **idle** stand |
| row1 `y98-133`  | 2  | Body stretched/extended — start of a **lunge / walk** stride |
| row2 `y146-281` | (merged, MULTIPLE rows) | Lunge continuations + **roar/bite** poses with RED open mouth + small crouch poses. NEEDS sub-splitting at slice time. |
| row3 `y304-347` | ≈6 | Airborne arc — the **Pounce / leap** sequence (matches pool `Pounce` special) |
| row4 `y368-412` | ≈3 | **Landing / crouch** recovery |
| row5 `y430-466` | ≈4 | Prone / low **roll** transition + red-mouth bite |
| row6 `y487-539` | ≈10 | ★ **Spinning-ball ROLL attack** (orange spiral frames) — the signature move |
| row7 `y554-589` | ≈4 | Crouch + **bite** |
| row8 `y610-690` | ≈3 | Bottom: crouch + more spinning-ball frames. NOTE the directional **→ ← arrows** here are annotations (roll direction), NOT animation — EXCLUDE. |

---

## Proposed kit (art dictates; pool already names Pounce + Feral Frenzy)

- **Movement:** idle=row0; walk/run/dash ← the lunge/stride frames (row1 + row2 top). No dedicated
  jump/fall art seen → reuse the Pounce-arc apex or a crouch (flag). No guard/hurt/knockdown art seen
  (typical Dragonrod gap) → procedural/idle fallback (flag).
- **Normals:** claw-swipe / bite from the roar+bite poses (row2 / row7) → light/heavy; up = a rising
  bite/lunge; air = reuse a pounce/bite frame.
- **Pounce (special):** row3 leap arc — already the pool special; a lunging gap-closer with a hitbox.
- **Spinning-ball ROLL (row6):** the standout. Two ways to use it — see decision below.
- **Feral Frenzy (ult):** pool-named. Candidate A = escalated spinning-ball roll rampage; Candidate B
  = a flurry of bites/claws. The roll row is the richer, more distinct visual.

### Stage-0 decision LOCKED (owner, 2026-08-22)
**Spinning-ball roll (row6) = Feral Frenzy ULT** — a rolling rampage. **Pounce (row3) stays the special.**
So the ult uses the richest/most-distinct art as the payoff; no separate bite-flurry ult needed.

---

## Gaps / flags
- **No jump/fall, guard, hurt, knockdown, win, intro art** seen (Dragonrod sheets typically omit these)
  — will lean on reuse/procedural fallback, flagged per slot at wire time.
- **row2 is a merged multi-row block** — the roar/bite/crouch poses need careful sub-band splitting;
  do this in the Stage-1 visual pass.
- **★ IMAGE-CAP CAVEAT:** frame→slot picks above are provisional. Stage 1 (reslice tool + slot mapping)
  needs a session with image viewing to visually confirm each slice — an unlabeled sheet must not be
  sliced blind. Programmatic QA (frame counts, cell dims, per-frame alpha coverage) + the node harness
  can run without image budget, but PIXEL SIGN-OFF of the slices is PENDING a fresh session.

## STAGE 1 — DONE, PROGRAMMATIC-ONLY (2026-08-22, test:wildmutt-stage1 13/0) — ★PIXEL SIGN-OFF DEFERRED

Owner approved a programmatic-only Stage 1 (no visual QA this session). NEW `tools/reslice_wildmutt.py`
(white chroma-key) emitted feet-aligned uniform cells; every frame passed programmatic QA (per-frame
alpha coverage 0.33–0.71 → no blank/garbage cells).

**Wired into `BEN10_FORM_ANIM.wildmutt` (movement/state):**
- `idle` (2f) ← r0 — HIGH confidence
- `jump` (5f) ← pounce leap-arc r5 (dropped merged f0) · `fall` (3f) ← landing r6 — MED
- `walk`/`run`/`dash`/`hurt`/`intro`/`taunt` = **idle STOPGAP** — the stride row (r3) is 74px vs idle
  43px, a programmatic red flag that it's rearing/lunge, NOT a low quadruped walk; real locomotion
  (likely the short/messy r1–r2) awaits the visual pass.

**NOT wired to `BEN10_ART_ALIENS`** — kit is incomplete, so wildmutt stays hidden from the loadout
picker (`test:ben10-loadout` 7/0 confirms no leak). `_skinAnim` renders only when the form is
force-applied (harness/tests). Add to `BEN10_ART_ALIENS` once Stages 2–5 land.

**Emitted for later stages (confident content, unwired):** `ben10_wildmutt_pounce_uniform.png` (Pounce
special, Stage 4 — ★f0 is a 127px merged double-pose to split at slice-signoff), `ben10_wildmutt_roll_uniform.png`
(★Feral Frenzy ULT, 10f, cleanest strip), `ben10_wildmutt_bite_uniform.png` (normals, Stage 2),
`ben10_wildmutt_stride_uniform.png` (reference), `ben10_wildmutt_portrait.png` (idle bust —
generated-but-unwired, ben10 forms have no per-form portrait slot).

Regression: canonical `test:ben10` 62/0, loadout 7/0. **★ALL slice→slot picks remain PROVISIONAL pending
a fresh-session VISUAL sign-off** (unlabeled sheet; row2 sub-split + walk locomotion + pounce-f0 split are
the specific items to confirm).

### Stage 2+ — HELD for the visual pass (owner decision, 2026-08-22)
Stage 2 is **on hold until a fresh session with image viewing** — do NOT continue programmatically. The
visual pass must first sign off the Stage-1 provisionals, THEN build Stage 2+.

**Resume checklist (do these with images available):**
1. VISUAL SIGN-OFF of Stage-1 slices: `idle`, `jump`, `fall` render correctly; fix if any frame is off.
2. Resolve the **walk locomotion** row (stride r3 is rearing, not walk — inspect the short r1/r2) and
   wire real walk/run/dash (replacing the idle stopgaps).
3. Sub-split **row2** (roar/bite/crouch) for normals; slice `bite` (r9) cleanly.
4. Split the **pounce f0** 127px merged double-pose (r5) for the Pounce special.
5. Confirm the **roll** (r8) reads clean for the Feral Frenzy ULT.
6. Build Stage 2 (normals) → 3 (command chain if any) → 4 (Pounce special) → 5 (Feral Frenzy roll ULT).
7. When the kit is complete, **add `wildmutt` to `BEN10_ART_ALIENS`** (unhides it in the loadout picker)
   and add a canonical `wildmutt` entry to `harness/ben10.test.mjs` FORMS.
