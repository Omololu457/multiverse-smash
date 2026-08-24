# Superman (Fighter) — Stage 0 Asset Map

A NEW, 5th Superman roster entry (owner-approved build) from the previously-UNBUILT
labeled fighting-game sheet. SEPARATE from `superman` (Arcade), `superman_dcuc`
(DCUC), `superman_new52`, `superman_classic`. Own-sheet-only.

- **Source sheet:** `dcna8ch-42870664-caf4-4f98-a06d-72a3680e98dc.png` (1800×3160, RGBA but **fully opaque**)
- **Background:** solid **GREY `#727272`** (114,114,114) — key it (tol ~28). NOT transparent.
- **★LABELED sheet:** each row has red label text at its far left (x<200). Some moves have real FX (heat-vision beam, frost-breath clouds, X+Up explosion, combo red beams) that bridge frames → detect by ROW-BAND + x-gap split, drop the label column. `tools/superman_fighter_stage0_boxes.py`.
- **Working rosterKey:** `superman_fighter`  ·  **display:** "Superman (Fighter)"  ·  *(names OPEN — adjustable)*
- **Universe:** dc. Blue suit + red cape/trunks/boots.
- **★CREDIT:** filename is a DeviantArt asset id (`dcna8ch-42870664-…`); artist **UNKNOWN from the id alone** → attribution OPEN, MANDATORY before ship (mirrors genos/dark_knight/frieza). credits.js placeholder at S6.

## Labeled rows (read directly off the sheet) — the definitive role list
| Row label | Role | Content / FX notes |
|-----------|------|--------------------|
| (top) GESTURE/INTRO | intro/taunt | a short gesture |
| **STANCE** | **idle** | ★3-frame cape-sway, feet static — a genuine neutral idle loop (matches the original note) |
| **RELAX** | idle-variant / taunt | relaxed stance |
| **RUN** | walk/run | upright alternating-leg sprint |
| **FLY** | flight | horizontal flight — ★a SEPARATE row/animation from RUN (confirmed distinct content) |
| **JUMP** | jump/fall | leap/rise |
| **GUARD** | guard | block pose |
| **ULTIMATE ACTION** | ult cast | ★3-frame arms-up cast/gesture (see disambiguation below) |
| **B** | light/normal | punch → rapid blue-fist flurry (a rushing combo — rekka source) |
| **FORWARD + B** | command normal | dashing strike / ball |
| **UP + B** | up-attack | rising strike |
| **DOWN + B** | crouch/low | low strike |
| **AERIAL + B** | air normal | aerial strike |
| **Y** | special | power strike |
| **FORWARD + Y** | special | ★HEAT VISION — white/energy beam |
| **UP + Y** | special | ★FROST BREATH — frost-cloud FX |
| **DOWN + Y** | special | downward power move |
| **AERIAL + Y** | air special | ★ICE/FROST aerial (re-verified: real airborne frost FX) |
| **X** | heavy special | red-streak heavy strike |
| **X + UP** | heavy special / ult | ★GIANT FIERY EXPLOSION (Superman flies up into a screen-filling blast, gold power-glow) |
| **COMBO ATTACKS** | combo/FX | red-projectile growing beams |
| **HURT, FALL AND GET UP** | hurt/knockdown/getup | ★REAL hit-react + lying-PRONE + rising (all three) |
| **WIN** | win | victory poses |
| **LOSE** | lose | defeat poses |

## Direct answers to the re-audit questions (from source content)
- **RUN vs FLY:** genuinely DISTINCT rows/animations (upright sprint vs horizontal flight). Not the same content twice.
- **★"ULTIMATE ACTION" vs "X+UP" — SEPARATE MOVES (not the same sequence under two labels):** "Ultimate Action" = a short 3-frame arms-up cast/gesture; "X+Up" = a completely different animation (Superman flying up into a giant fiery explosion). Different frames, different rows, different content.
- **AERIAL Y:** verified = a real airborne ICE/FROST-breath attack (consistent with the grounded UP+Y frost row), not a duplicate.

## Proposed project mapping (lock at S1+)
This sheet is the RICHEST Superman kit (real heat vision + real frost breath + real explosion + real hurt/fall/getup + win/lose). Map the B/Y/X source → the project's scheme:
- **Movement/state:** STANCE→idle (3f loop), RUN→walk/run, FLY→flight (canFly), JUMP→jump/fall, GUARD→guard, HURT/FALL/GETUP→hurt+knockdown(prone)+getup (all REAL — no gaps), WIN/LOSE→win/lose.
- **Normals:** B / Up+B / Aerial+B / Down+B → light/heavy/up-launcher/air/crouchLight.
- **Rekka (Fwd+Heavy):** the B punch-flurry.
- **Fixed-slot specials:** Forward+Y = Heat Vision (beam) / Up+Y = Frost Breath (freeze) / Down+Y / Aerial+Y = Ice aerial / X = heavy special.
- **ULT:** X+Up giant explosion (screen-clearing blast — a strong guaranteed cinematic). "Ultimate Action" cast = the ult's activation pose.

## GAPS / flags
- **Cleanest content of all 5 Supermen** — real idle loop, real Run≠Fly, real hurt+prone+getup, real heat vision + frost breath + explosion. Expect very FEW reuses/gaps.
- **S1 detector refinement needed:** the row-band projection merged some close rows and missed plain-sprite frames (FX/label bridging). S1 will refine (per-row x-gap split, exclude label column, handle FX rows).
- **Credit BLOCKER:** artist unknown from the DeviantArt id — pin before ship.
- Facing to confirm at S1 (set FLIP_H).
