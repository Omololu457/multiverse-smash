# Aoi Todo — Asset Map (STAGE 0 audit)

Character: **Aoi Todo** (Jujutsu Kaisen). Proposed `rosterKey`: `aoi_todo`.
Source sheets (2): `aoitodo_row_01.png` (3176×1113), `aoitodo_row_02.png` (3176×657).
**Sheet credit (carry forward): "By akuma animation (with edits / palette improvements by MichelST)."** — visible in-sheet on row_01.

Frame counts below are read from the sheets and are approximate pending exact reslice in Stage 1.

---

## SHEET 1 (`aoitodo_row_01.png`) — movement, normals, kicks, reference art

### Movement / state (top → down)
| Content | Approx frames | Notes |
|---|---|---|
| **Idle** | ~6 (audit said ~8) | Breathing/shift loop, shirtless standing |
| **Crouch-guard** (standing→low guard, arm out) | ~4 | Distinct from arms-crossed guard below |
| **Guard** (arms-crossed block) | ~5 | Defensive loop |
| **Walk** | ~7–9 | Forward loop |
| **Run** | ~7–8 | Sprint loop |
| **Jump** | ~8 (audit said 5) | Crouch-prep → rise → peak → fall → land |
| **Hit reaction** | ~4 | Stagger |
| **Knockdown / getup** | ~5–6 | Fall back → lie → rise |

### Normals & kicks (mid → bottom bands)
- Jab/cross punch string (~10f).
- Hook/uppercut heavier punch combo (~9f).
- Elbow strike (close-range) — **frame count still unconfirmed** (Stage 0 open item).
- Roundhouse / spinning kick string with motion trails (~8f).
- Aerial kick / flying knee (~4f).
- Additional kick material: spinning kicks w/ swirl trail, flying kick (long-range, motion trail), ground-slam / dive-kick (crouch-into-kick + impact trail). → **Stage 4 special candidates** (these ARE canon-plausible: pure physical striking).

### Reference / EXCLUDE regions (right side of sheet)
- **"edits and Unused sprites"** box — construction leftovers. EXCLUDE.
- Loose hand/arm/head fragments box. EXCLUDE.
- **Anime screenshot** (photo of Todo) — documentation only. EXCLUDE.
- **Full-body turnaround render** (clothed, blue pants) — documentation only. EXCLUDE.
- **"demostration" [sic]** preview frame (green box, running figure) — preview, not gameplay. EXCLUDE.
- **"edits"** box (bottom) — rejected/reworked pose variants + loose fragments. EXCLUDE.

### Portrait carve-out
- Two head/bust reference icons (top-left of sheet) → **HUD/select portrait** source. KEEP.

---

## SHEET 2 (`aoitodo_row_02.png`) — flagged moves, Black Flash art, win/lose

### Flagged NON-CANONICAL content (Stage 0 item 1 — needs confirmation)
| Move | Approx frames | Canon status |
|---|---|---|
| **Draw & fire gun** | ~7 | Todo has no firearm in canon. FLAGGED. |
| **Armored transformation / charge-up** | ~several + burst FX | No armor form in canon. FLAGGED. Held for Stage 6 (ult candidate). |
| **Whip-slash combo** (red ribbon/whip weapon) | ~10 | Todo has no whip weapon in canon. FLAGGED. |
| **Flying kick into fire attack** | ~9 | Kick is canon-plausible; the *fire* is the embellishment. FLAGGED (softest). |

### Black Flash reference art (Stage 0 item 5 — no dedicated animation)
- Manga panel with **"BLACK / FLASH"** text.
- Black claw / shadow-tendril concept illustration (B&W).
- **Not usable as frames** — proposed home: timing-window bonus VFX on existing strikes.

### Win / Lose (confirmed present — Stage 7)
- **Win**: ~4 victory-stance frames **+ chibi reaction icon** (speech-bubble chibi).
- **Lose**: ~6 defeated/slumped frames.

---

## STAGE 0 DECISIONS — LOCKED (owner sign-off obtained 2026-08-18)
1. **row_02 non-canonical moves → INCLUDE ALL THREE as specials.** Gun (draw-&-fire), whip (red-ribbon combo), armored-charge all become kit specials. Armor is a mid-tier special, NOT the ult.
2. **Boogie Woogie enemy-swap → YES, build it.** Clap can swap the opponent's position with a marked point.
3. **Cameo architecture → TAG-PARTNERS ON FIELD.** Todo + Yuji and/or Gojo coexist as persistent assist entities. Can bring in one, the other, or BOTH simultaneously. Clap swaps POSITIONS (Todo/cameo/opponent), not kit-borrow. Enables real co-op combos. NEW system for project (nearest infra: Pain Six-Paths persistent assists + summons.js persistent-summon pattern).
4. **Cameo roster → Yuji + Gojo, fixed pair** (not player-selected).
5. **Black Flash home → timing-window bonus on strikes** (landed off a Clap-swap or in a strict punish window → bonus dmg + black claw/shadow VFX from the reference art). Proposed & unopposed = LOCKED.
6. **Ultimate → MAXIMIZED BLACK FLASH THREE-WAY.** Signature payoff = guaranteed Black Flash during a three-way combo with both cameos cycled in. Reuses Black Flash VFX; no unique ult art (flagged honest gap).
7. **Swap system design intent → HIGH SKILL CEILING / "dominate once mastered".** Fork Ghostface's multi-path motion-driven swap engine (`_bwSwap*` namespace) and go DEEPER: motion-selected swap targets, multiple trigger paths, fakeable/bluff inputs, marker placement, two-cameo juggling. Red Ranger has NO swap mechanic → depth drawn from Ghostface only, no Red Ranger involvement.
8. Elbow strike exact frame count — resolve at Stage 1 reslice.

## PROPOSED BUILD ROADMAP (post-Stage-0)
- **S1** Registration + movement (idle/guard/crouch-guard/walk/run/jump/hit/knockdown) + reslice script. energyType TBD (proposal: "cursed_energy" to match JJK siblings, or bespoke "boogie"/"black_flash" meter gating Black Flash & cameos).
- **S2** Normals (jab/cross, hook/uppercut, elbow, roundhouse, aerial kick).
- **S3** Command chains (cancelable punch/kick strings via existing rekka architecture).
- **S4** Specials: spinning backfist, long flying kick, ground-slam/dive kick, + gun / whip / armored-charge (all three row_02 moves).
- **S5** Boogie Woogie swap system (the centerpiece): Clap input, self-swap, cameo swap-in (1/2/both), cameo swap-out, enemy-swap, fake-clap; cameo co-op combo strings; Black Flash timing-window bonus. Cameos = persistent tag-partner entities (Yuji, Gojo).
- **S6** Ultimate: maximized three-way Black Flash cinematic (freeze/camera-focus pattern).
- **S7** Portrait (2 busts) + win (4f + chibi) + lose (6f) + harness + BALANCE_AUDIT (special scrutiny on cameo co-op = Megumi-outlier risk class).

## CROSS-PROJECT PRECEDENTS (for the cameo/assist system)
- Ghostface companion-swap; Pain 5-way assist-select; Megumi unscaled-summon **balance cautionary tale** (BALANCE_AUDIT.md).
- Cameo combo-attacks calling two full-strength allies = exactly the outlier shape to keep on a real resource cost/cooldown. Flagged for Stage 7 balance pass.
