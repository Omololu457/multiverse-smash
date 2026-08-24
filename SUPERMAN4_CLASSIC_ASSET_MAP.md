# Superman 4 (Classic / SNES Justice League Task Force) — Stage 0 Asset Map

Prompt label **"Superman 4"** — the 4th of 4 Superman roster entries, SEPARATE
from `superman` (Arcade), `superman_dcuc` (DCUC), `superman_new52` (New 52).
Own-sheet-only. The "classic bronze/silver-age" look (Section 0: blue suit + red
trunks/boots/cape confirmed) — the most classic of the four.

- **Source sheet:** `SNES - Justice League Task Force - Fighters - Superman.png` (701×1694, **RGBA — real alpha, transparent bg**)
- **Key:** trivial — `alpha > 128` = content (EASIEST of the 4 sheets; no chroma-key needed).
- **Working rosterKey:** `superman_classic`  ·  **display name:** "Superman (Classic)".
- **Universe:** dc. Classic 16-bit costume: blue suit, **red trunks + boots + cape**, red "S", yellow belt.
- **CREDIT (baked bottom-right):** "Superman (Justice League Task Force) — **Ripped by HjpdeKrypton**". Original game = Justice League Task Force (SNES). → credits SOURCED_ART at S6.
- Box detector: `tools/superman_classic_stage0_boxes.py` (**111 boxes**, alpha key, `/tmp/classic_band0..3.png`). Moderate size, clean.

Frame counts are ESTIMATES; verified by reslice/harness per stage. Per-role picks
use zoomed renders each stage (as with DCUC/New52).

## Non-sprite (EXCLUDE)
| Boxes | What |
|-------|------|
| 3, 4, 107, 108, 109 | title-card art + "SUPERMAN" logo letters |
| 64, 67, 73 | stray FX bits / text | 
| (bottom-right block) | credit + story blurb text |

## Core state / movement
| Boxes | Role | Notes |
|-------|------|-------|
| 0, 1, 2 | **Idle** (breathing stance) | ★REAL multi-frame idle (better than DCUC/New52 single-frame) |
| 7–14 | **Walk cycle** (~8f stride) | grounded walk |
| 9, 48, 49 | **Jump / leap** (tall poses) | jump/fall |
| 5, 6, 45–47 | **Crouch / duck** | crouch + crouchLight |
| 50, 51 | **Hurt / stagger** | REAL hit-react |
| 52–55 | **Knockdown / prone** (wide low) | ★REAL prone KO art |
| 56–63, 88–99, 106 | **Flight** (horizontal, cape) | flight-mode (canFly) |

## Attacks — melee (RICH)
| Boxes | Role candidate |
|-------|----------------|
| 15–17, 31–34 | punches (jab / cross / lunge) → light / heavy |
| 18, 35–39, 41, 44 | kicks → air / down_air |
| 19, 40 | uppercut (arm up) → up LAUNCHER |
| 20, 42, 93, 94 | lunges / dashing strikes → rekka |
| 21, 45–47 | crouch attacks → crouchLight |
| 75, 76–78 | more punches / flying strikes |

## ★REAL FX ART (no procedural needed — unlike DCUC/New52)
| Boxes | Role |
|-------|------|
| 79, 80, 81 (+66) | **HEAT VISION** — red horizontal eye-beams → real beam special |
| 70, 71, 72, 74 (+73 swirl) | **ICE / FROST BREATH** — blue-white frost clouds → real freeze/slow special |

## Win / celebration
| Boxes | Role |
|-------|------|
| 100–105, 110 | standing heroic poses → WIN candidate (confirm at S6) |

## Role assignment (working — confirm each stage with zoomed renders)
- **Class:** the **balanced iconic ALL-ROUNDER** (real beam + real breath + rich melee + flight). Distinct from `superman` (1450 beam-apex), `superman_dcuc` (1300 bruiser), `superman_new52` (1250 rushdown). Working stats: **HP ~1350, atk ~96, def ~88, spd ~90, canFly** — the rounded classic. 
- **Normals (S2):** light/heavy from punches (15–17 / 31–34), up-launcher from uppercut (19/40 — REAL uppercut art), air from a kick/flying strike, crouchLight from 45–47.
- **Command combat (S3):** Fwd+Heavy rekka from a punch/lunge chain (rich rows → real 3-hit string).
- **Specials (S4):** fixed-slot kit — N=**Heat Vision (REAL beam art 79–81)** / F=Flying Charge / U=anti-air / D=**Ice Breath (REAL frost art 70–74, freeze/slow)** / B=escape / air=Dive. ★First of the 4 with REAL beam+breath art.
- **ULT (S5):** candidates — a **Heat Vision Barrage** (promote the beam art) or a flying finisher, guaranteed inline cinematic (~198 EFF like the others). Decide at S5.
- **WIN:** heroic stance 100–105/110. **LOSE:** reuse prone knockdown 52–55 (REAL). **Intro:** none obvious → defer.

## GAPS / flags
- Cleanest source of the 4 (real alpha, real idle, real prone, real beam + real breath) → fewest reuses/procedural.
- Facing direction to confirm at S1 (SNES rips vary → verify, set FLIP_H).
- Title/logo/credit boxes excluded (above).
- No red-trunks concern (this variant HAS trunks — skins keep the trunks region, unlike New 52).
