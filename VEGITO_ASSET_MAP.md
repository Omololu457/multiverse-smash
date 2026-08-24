# VEGITO ULTRA INSTINCT -SIGN- — STAGE 0 Asset Map & Investigation Report

**Scope:** single, fully independent roster character — Vegito in the *Ultra Instinct
-Sign-* state (silver hair, blue gi). One-character-per-prompt standard.

**Source sheet:** `vegito_ultra_instinct__sign__v2_sprite_sheet_jus_by_xenohiro016_die4gov-fullview.jpg`
**(1280 × 1832 px, RGB — JPEG, NO alpha).**

**On-sheet credits (preserve if used beyond personal reference):**
- Compilation credited to **XenoHiro016**
- Original sprites by **Aagus** and **James1971**
- Palettes by **El-Loco-Jr** and **Jefrey174**
- Extra mention **Storm424**

> This report was produced by **actually cropping + visually inspecting** the STANCE
> groups, ULTIMATE ACTION row, all seven special rows, the WIN/LOSE band, and the
> chibi/silhouette cluster at full resolution this session (image API was NOT capped).
> Crops live under `_vg_crops/` (untracked scratch).

---

## 1. Confirmed technical facts

- **Background** = solid dark navy `~#182536`. **JPEG, so no alpha** — compression has
  introduced color bleed / fringing at frame edges. **A tolerance keyer alone will leave
  faint halos**; the reslice tool (Stage 1) must key with tolerance AND a manual
  sample-frame visual check, exactly as the prompt's technical note warns. This is a
  higher-fringe-risk source than our clean-PNG rips (Frieza/Piccolo).
- **Palette:** silver/grey UI hair, blue gi + trousers, orange undershirt/sash accents,
  yellow/gold boots. Portrait bust (top-right) is a hi-res anime render, not pixel art.
- **Portrait:** dedicated **character bust render top-right** — strong select-screen/HUD
  candidate (Stage 6). Present and confirmed.

---

## 2. STANCE row — three "/"-divided groups (item 1) — RESOLVED

The row splits into three groups separated by literal `/` marks on the sheet. They are
**three distinct body POSES, NOT the same pose at escalating aura intensity:**

| Group | ~Frames | Content |
|---|---|---|
| 1 | ~5 | **Relaxed neutral idle** — upright, arms at sides, subtle breathing bob. |
| 2 | ~4 | **Arms-spread tensed stance** — fists clenched, arms drawn slightly out, braced. |
| 3 | ~4 | **Wide-legged braced fighting stance** — feet planted wide, fists ready. |

**Finding vs. the Stage-0 hypothesis:** the prompt speculated these might be
aura-intensity states tied to the UI resource meter. **Visual inspection does not support
that** — all three share the same silver hair with no visible escalating aura FX; the
difference is *posture*, not aura. They read as **idle-pose variants** (neutral →
tensed → braced).

**Recommendation:** Group 1 = primary idle (Stage 1). Groups 2/3 are available for idle
variety **or** could be *repurposed procedurally* as a Stage-5 meter-level tell
(relaxed=full / braced=low), but that would be **our design choice grafted on**, not an
authored aura-tier system. → **Owner decision needed** before wiring them to the resource
meter (see Open Items).

---

## 3. "Repeat here" annotation (item 2) — ⚠️ PROMPT CORRECTION

**The prompt states the "Repeat here" annotation is on a Banshee Blast effect frame. It is
NOT.** Full-width inspection of the Banshee Blast band shows only a `SPECIAL EFFECTS`
label — no "Repeat here" text.

The **only** "Repeat here" annotation on the entire sheet sits in the **ATTACK / combo
section**, beside a **dashing crescent-slash attack frame** (Vegito lunging low with gold
slash arcs). It marks a **combo/dash loop point**, not a beam loop.

- **Banshee Blast** *does* still loop — its effect strip ends in a **vertical column of ~5
  identical gold muzzle-bursts**, i.e. a self-evident sustained/rapid-fire loop segment —
  but this is inferred from the art, **not** from a text annotation.
- The real "Repeat here" belongs to **Stage 3 (command chains)**, marking where a
  ground/dash combo string repeats.

This is a genuine source discrepancy surfaced by Stage 0 (per the project's standing
content-audit rule: green harness ≠ content-correct, and prompt claims must be verified
against what the sheet actually depicts).

---

## 4. Chibi / silhouette cluster near WIN/LOSE (item 3) — RESOLVED

**Confirmed: a Potara DEFUSION reference, NOT combat frames.** The cluster runs:
colored Vegito (standing → lunging → sitting/defeated) → a run of **white silhouette
frames** (two spiky-haired figures separating) → final **colored Goku (black hair, ORANGE
gi, sitting on ground) + Vegeta (blue suit, upright flame hair, standing)**.

This is Vegito's fusion wearing off and **splitting back into Goku and Vegeta**. The white
silhouettes are the intermediate split/dissolve frames.

**Recommendation:** **EXCLUDE from the combat kit.** Optionally usable as a
lose/defusion flourish (defusion-on-defeat) — but that's an owner call, not required.

---

## 5. Seven specials (item 4) — ALL CONFIRMED

Every named special is present with distinct pose frames + dedicated `SPECIAL EFFECTS` art:

| Special | Effect art confirmed |
|---|---|
| **Banshee Blast** | Gold muzzle-burst → repeating column of bursts (rapid-fire/sustained) |
| **Air Ki Blast** | Charge burst → thin fast dart projectile |
| **Big Bang Attack** | White/blue **growing energy sphere** (small → huge orb) |
| **Galick Gun** | **Purple** beam (violet orbs → purple beam) |
| **Spread Finger Beam** | **Fan of yellow bolts** spreading multi-directionally (multi-hit) |
| **Perfect Shot** | Quick precise **cyan darts** |
| **Kamehameha** | Cyan charge-sphere → **massive cyan beam** (largest dedicated FX) |

Large-kit schema exception is justified (matches Byakuya / Zaraki / Sukuna precedent).

---

## 6. "Ultimate Action" vs. Kamehameha (item 5) — RESOLVED

**They are distinct sequences.**

- **ULTIMATE ACTION** = a **self-contained charge / power-up windup** — ~5 frames of Vegito
  tensing, arms drawn back, gathering energy. **No beam is fired.** Reads as an
  activation/charge trigger pose.
- **KAMEHAMEHA** = the full iconic **charge → thrust → fire** sequence with the **biggest
  dedicated effect frames** on the sheet (cyan sphere blooming into a huge beam).

**Recommendation:**
- **Kamehameha = the true ULTIMATE** (iconic, largest FX, dedicated finisher beam).
- **Ultimate Action = the Stage-5 charge/trigger pose** — a natural fit for the UI
  "hold-to-recharge" window visual (and/or a super windup). It is a *trigger*, not the
  ultimate itself.

→ Final Ultimate designation is an **owner confirmation** (see Open Items), but the visual
evidence points clearly to Kamehameha = Ultimate.

---

## 7. Movement / state rows (Stage 1 preview — labels confirmed present)

STANCE (§2), **MOVE** (walk), **DASH** (distinct from move), **JUMP**, **GUARD**,
**TAKING DAMAGE**, **KNOCKED OUT**, **ATTACK** (multi-row ground combos — Stage 2/3),
**JUMP ATTACK**, **WIN**, **LOSE** — all labeled and present. Real-motion classification
(genuine idle loop / alternating-leg walk) is deferred to the Stage 1 STOP per prompt.

---

## 8. OWNER DECISIONS — LOCKED (2026-08-23)

1. **STANCE Groups 2 & 3** → **REPURPOSE as Stage-5 resource-meter visual tell**
   (procedural idle-pose swap by UI level: relaxed=full → arms-spread=mid → wide-braced=low).
   Group 1 remains the base neutral idle. (Design graft — not authored aura tiers, §2.)
2. **Ultimate** → **Ultimate Action → Kamehameha CHAINED** as one combined Ultimate
   sequence: Ultimate Action = the windup that leads directly into the Kamehameha beam
   finisher. (§6)
3. **Potara defusion cluster** → **EXCLUDE entirely** from the build. (§4)
4. **Noted, not blocking:** "Repeat here" belongs to Stage 3 combos, not Banshee Blast
   (§3) — Banshee's loop is read from its burst-column art.
5. **Stage-5 tuning numbers** (drain rate, dodge reliability, health-conversion rate) are
   explicitly a playtest question, per prompt — not guessed here.

---

## STAGE 0 STATUS: COMPLETE. Decisions locked → proceeding to Stage 1.
