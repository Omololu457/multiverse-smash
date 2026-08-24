# MILES MORALES — Asset Map & Stage 0 Report

**Source:** `miles_morales___jus_sprite_sheet___credits_desc_by_xxalexsmashxx_dfsvf9b-fullview.jpg`
**Dimensions:** 1280 × 1974, RGB **JPG (lossy)** — background ≈ RGB(60,90,240) royal blue.
**Attribution:** xxalexsmashxx (JUS-style edit). On-file credit present in filename ("credits_desc").
**Status:** ★★ FULLY COMPLETE S0–S6 (canonical `test:miles` **28/0**). Per-stage: S1 21/0 · S2 17/0 · S3 NONE · S4 19/0 · S5 7/0 (EXACTLY 198 EFF). Regress spiderman 38/0, deathstroke 30/0, piccolo 38/0, vegito 46/0, gwen 27/0, iron-man 35/0, rengoku 41/0. UNCOMMITTED.

> **STAGE 6 (done):** WIN = REAL single-frame UNMASKED (Afro) confident stance (miles_win, on-sheet — sparse
> but real per item 3, not padded). LOSE = REAL single-frame prone/KO (miles_lose, its OWN art, not a
> knockdown reuse). Portrait = idle bust (miles_portrait; the big top-right hero render remains an optional
> upgrade). NEW canonical harness/miles.test.mjs (static sheet+portrait+stats+reuses+meta sweep / runtime
> gate+label / 18-action fallback-box sweep / normals connect / 6-slot venom dispatch+connect incl. the
> Camouflage control-vs-stealth evasion proof / Charge dash-kick / 198-EFF ult). BALANCE_AUDIT.md entry added
> (FAIR glass-lean rushdown/zoner; Camouflage = the flagged playtest lever; credits xxalexsmashxx RESOLVED —
> NOT a blocker; miles passes test:credits). ★BANKED (deferred, not S6): the red/blue "Classic Spider-Man"
> alt-skin build; bespoke web/beam FX art; voice. Stealth window + damage numbers = PLACEHOLDER → live playtest.

> **STAGE 5 (done):** ULT "Venom Overload" (abilities.js executeMilesUltimate, mirrors Gwen) — INLINE
> freeze-cinematic on the live fighter. ★OWNER-LOCKED palette = **BLACK/RED** (Miles' own colours); the
> red/blue "Classic Spider-Man" X+Up duplicate is earmarked as a **future alt-skin**, NOT the gameplay ult.
> Cast = play-ONCE 6-frame venom combo (miles_ult, sliced from X+Up combo row 2: stance→red crescent→dash→
> yellow venom crescent→venom fist→burst). 5 beats: telegraph → crescent → venom crescent → venom fist →
> BURST payoff; giant venom ring-bursts (miles_venomring) manifest at the frozen foe at growing scale. 330
> raw → **EXACTLY 198 EFF** (×0.60). The 2-frame "Ultimate Action" tell = the meter-full ready pose (item 2).
> Ult dispatch case added to abilities.js triggerUltimate switch. Regress gwen 27/0, iron-man 35/0, miles-s4 19/0.

> **STAGE 4 (done):** fixed-slot venom rushdown/zoner (abilities.js executeMilesSpecial, mirrors Gwen).
> OWNER-LOCKED (items 5 & 8): **X venom-beam = Back special; Down+B dash-kick = Charge(O) button; Down+B =
> offensive dash-in.** Special(L): **N**=Web-shot (procedural white projectile) / **F**=Venom Strike (melee
> disjoint + sliced yellow ring-burst FX `miles_venomring`) / **U**=Rising Venom-Arc (anti-air launcher) /
> **D**=Camouflage (self-buff: `_milesStealthTimer` evasion window that phases melee+projectiles, mirrors
> Vegito's evade hook in combat.js shouldMilesStealthEvade + brief vanish i-frames) / **B**=X Venom-Beam (big
> procedural blast + ring impact) / **air**=Aerial Dive (down-forward kick). **Charge(O)** tap = Down+B dash-kick
> (cooldown-gated gap-closer, fireMilesDashKick in game.js handleChargeRelease). Cast poses = real sliced frames;
> web/beam + rings procedural/sliced. Files touched: reslice_miles.py (+load_keyed_fx for the white-highlight
> rings), characters.js (specials meta + 7 cast anims), abilities.js (MILES_SPECIALS + dispatch), combat.js
> (evade hook ×2 sites), game.js (charge dispatch + timer ticks + harness hooks). Regress vegito 46/0, rengoku
> 41/0, gwen 27/0, miles s1 21/0 s2 17/0. Stealth window/damage numbers PLACEHOLDER → Stage-6 balance.

> **STAGE 2 (done):** the 4 button-mapped normals map 1:1 → light=**B** straight punch, heavy=**Forward+B**
> committed forward punch (red impact), up=**Up+B** rising anti-air LAUNCHER (red crescent arc), air=**Aerial
> B** slash (big RED CRESCENT arc). down_air REUSES the air slash (no dedicated down-aerial art — flagged).
> No crouch normal on the sheet → no crouchLight. All strikes reach RIGHT (verified in-engine). Damage ×0.60
> GLOBAL_DAMAGE_SCALE (light 24/hit, heavy 47, up 37). No command chain on the sheet (Stage 3 = none, per prompt).

> **STAGE 3 (deliberate no-op — NONE):** re-scanned the full left label column top-to-bottom — every label
> is a single standalone button-mapped move (no brackets, arrows, "repeat here", or combo-tree notation
> anywhere). Per the prompt, NO chain is invented without real on-sheet evidence. No code, no art, no harness
> for this stage. (Contrast the chars that DO have chains: Piccolo/Iron Man/Bardock rekka strings.)

> **STAGE 1 (done):** `tools/reslice_miles.py` (band+xrect JUS slicer, blue-bg + white-margin + mauve-label
> + blue-halo key, **no flip** — Miles faces right) → 9 movement strips + portrait. Registered in
> characters.js (`const miles` + roster export), spritesheets.js (idle gate), skins.js (default entry),
> credits.js (xxalexsmashxx), ui.js (`venom` → "Venom" label). Stats HP1120/EN200/Atk86/Def78/Spd96,
> spriteScale **2.9** (idle ≈101px on-screen). idle 3f / run 6f (walk+dash BORROW run) / jump 4f ascent /
> fall 3f (REAL descent) / guard 1f / hurt 2f / knockdown 6f / getup 4f / intro 5f. Harness +
> in-engine shots (harness/shots/miles_stage1_*.png) verified. Regress gwen 27/0, iron-man 26/0 clean.
> Normals = Stage 2. UNCOMMITTED.

> ⚠️ **Keying note for Stage 1:** lossy JPG → the blue background has compression fringing.
> Removal needs *tolerance-based* keying against ~(60,90,240) + morphology cleanup (close +
> despeckle), same approach that fixed Vegito. Do NOT expect clean chroma edges.

---

## Layout — left label column (top → bottom), all labels are real on-sheet text

| Label | Frames | Content (verified by pixel inspection, not label alone) |
|---|---|---|
| INTRO | 5 | Landing/crouch-into-stance sequence |
| STANCE (idle) | 3 | Standing idle |
| RUN | 6 | Genuine alternating-leg run cycle |
| JUMP | 6 | Crouch → leap → apex → descend |
| GUARD | **1** | Single held block/brace pose (normal for guard) |
| ULTIMATE ACTION | **2** | Low coiled/braced stance, eyes lit white — a **ready/charge tell**, NOT an attack |
| B | 4 | Basic punch |
| FORWARD + B | 4 | Forward-stepping punch variant |
| UP + B | 3 | Rising anti-air |
| DOWN + B | ~5 | Crouch → **black wing/feather streak** forward burst → flying kick → run recovery |
| AERIAL B | 3 | Air attack with **red crescent-arc** FX |
| Y | 3 body + proj | **Web-shot** — thin white travelling projectile |
| FORWARD + Y | 5 body + FX | Windup → glowing yellow **venom fist** punch → expanding yellow **ring-burst** (close) |
| UP + Y | 4 body + FX | Rising **venom-arc** (yellow crescent) + small particles |
| DOWN + Y | ~6 | **Camouflage/stealth** — clean fade-to-transparent progression (solid→outline→invisible) |
| AERIAL Y | 4 | Diving pose with speed trail |
| X | 7 body + FX | Two-handed venom charge → thrust → **large** ring-burst **+ travelling horizontal beam** |
| X + UP | ~20+ | **ULTIMATE** — extended combo: crescent → punches/kicks → black-wing sweep → spins → venom fist → yellow crescent → burst |
| HURT, FALL AND GET UP | 6 | Hit react → stumble → fall prone → get-up (full, distinct) |
| WIN | **1** | Single frame — Miles **unmasked** (Afro visible), confident stance |
| LOSE | **1** | Single frame — prone/KO |

## Right-side / non-row content

| Element | Location (real px) | Role |
|---|---|---|
| Large jump-pose render | ~(800,20)–(1160,260) | **Portrait / select art** (non-gameplay) |
| Movie still (city bg) | ~(760,280)–(940,380) | Decorative reference (exclude from atlas) |
| 5 small figure icons | right cluster top | Small poses / select icons |
| **Bordered "dots" box** | ~(1090,530)–(1280,620) | **Head/mask swatch** (masked white-eye heads + unmasked Afro heads) — reference chart, **EXCLUDE from runtime atlas** |
| Small body poses (masked + 2 unmasked) | below dots box | Reference/pose samples |
| **Pose-pairs in BOTH colorways** | right cluster ~y690–840 & lower-right ~y1560–1720 | Key evidence for item 1 (see below) |
| **RED/BLUE block** | left-lower, immediately after X+UP (~y1500+) | **Alt-palette (classic Spider-Man) duplicate of the X+UP ultimate** — see item 1 |

---

## Stage 0 open-item resolutions

1. **Red/blue "classic Spider-Man" block — RESOLVED: alt-palette duplicate of Miles' OWN ultimate.**
   NOT a second character, cameo, or assist. Proof: the small pose-pair clusters show the
   *same* signature ultimate poses (black-wing sweep, venom-fist glow, yellow crescent) rendered
   side-by-side in BOTH black/red and red/blue. The block's frame content mirrors the X+UP combo
   sequence. Treat as a **built-in alt-palette resource** ("Classic Spider-Man" colorway), not
   gameplay-distinct content. Pick ONE palette as the runtime ultimate; the other is skin fodder.

2. **"Ultimate Action" (2 frames) vs X+Up — RESOLVED: activation tell, not the attack.**
   The 2 frames are a low, coiled, eyes-lit **ready/charge stance** — a held tell, not a strike.
   Recommended wiring: meter-full **ready/windup pose that leads INTO the X+Up sequence** on
   activation. Conceptually related to the ultimate; mechanically distinct art from X+Up itself.

3. **Guard / Win / Lose single frames — RESOLVED: genuinely all the sheet provides.**
   Guard = 1 held pose (normal). Win = 1 (unmasked Miles). Lose = 1 (prone). Sparse but real —
   nothing missing, do not fabricate padding. (HURT/FALL/GETUP *is* a full 6-frame sequence.)

4. **Down+Y camouflage — RESOLVED: build with confidence.** Clean fade-to-transparent
   progression = Miles' canon invisibility/camouflage. Stealth ability, ~6 frames.

5. **Down+B black wing/cloak — RESOLVED: offensive forward dash/swing-zip, NOT a defensive cape.**
   Sequence = crouch → black wing/streak *extends outward as he bursts forward* → flying kick →
   run recovery. The wing is a **motion streak of a forward lunge**, and he ends in an attacking
   kick + run, i.e. an approach/mobility strike. Not a self-wrapping defensive motion.

6. **Reference "dots" box — RESOLVED: EXCLUDE.** It is a **head/mask swatch** (masked white-eye
   heads + unmasked Afro heads), not gameplay content. Exclude from runtime atlas (portrait art
   can be sourced from the large render instead).

7. **Green/red alt-costume row — RESOLVED: DOES NOT EXIST on this sheet.** A full-sheet color
   scan found only ~6 stray green pixels (JPG noise inside the dots box) and scattered green-yellow
   pixels that all coincide with the **yellow venom-FX rings** — no contiguous green costume block.
   The sheet has exactly **two palettes: black/red (Miles) and red/blue (classic Spider-Man)**.
   The "green/red variant" in the prompt appears to be a low-res misread. No third alt-costume.

8. **Forward+Y vs X — RESOLVED: genuinely two distinct specials.** They share the venom-glow →
   yellow-ring-burst visual language but differ in scale/range/property:
   - **Forward+Y** = 5-frame single punch, small ring-burst, **close-range shockwave**.
   - **X** = 7-frame two-handed extended charge-thrust, **large** ring-burst **+ a travelling
     horizontal beam/line** → a bigger, **ranged** venom blast. Different buttons, different reach.

---

## Proposed stat/scale seed (for Stage 1 discussion — NOT yet applied)

Miles is a nimble rushdown/mobility fighter with strong stealth + venom mix-ups. Suggest a
frailer, faster profile (glass-cannon lean) pending BALANCE_AUDIT comparison. Idle height and
exact scale TBD from resliced frame pixels in Stage 1.

## Deferred / decisions needed from owner before later stages

- **Stage 5 (item 1):** which palette is gameplay-facing for the ultimate (black/red default vs
  red/blue), and whether the *other* palette ships as a "Classic Spider-Man" alt-skin.
- **Stage 5 (item 2):** confirm Ultimate Action wires as the activation tell → X+Up.
- **Stage 4 (item 5):** confirm Down+B as an offensive dash-approach (recommended) vs pure mobility.
- Credits: xxalexsmashxx (present) — confirm this is sufficient attribution before ship.
