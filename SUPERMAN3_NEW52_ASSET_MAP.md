# Superman 3 (New 52) — Stage 0 Asset Map

Prompt label **"Superman 3"** — the 3rd of 4 Superman roster entries, SEPARATE
from `superman` (Arcade) and `superman_dcuc` (DC Universe Customs). Own-sheet-only.

- **Source sheet:** `new_52_superman_sprite_by_immajadenyuki_d6mzx0p-fullview.jpeg` (1024×2655, **RGB JPEG — no alpha**)
- **Background key:** WHITE (255,255,255), keyed as `rgb.min(2) > 232` (JPEG-fringe tolerant). ★S1 reslice must FLOOD-FILL from edges so INTERIOR white (eyes/"S"/highlights) is preserved — a plain white key would punch holes.
- **Working rosterKey:** `superman_new52`  ·  **display name:** "Superman (New 52)".
- **Universe:** dc. New 52 armored costume: **high collar, NO red trunks** (all-blue legs — confirmed), red cape/boots, red "S", blue suit, black outline.
- **Artist:** immajadenyuki (DeviantArt, from filename `..._by_immajadenyuki_d6mzx0p`) → credits SOURCED_ART at S6.
- Box detector: `tools/superman_new52_stage0_boxes.py` (**249 boxes**, white key, `/tmp/new52_band0..6.png`). Dense grid; small sprites (~56–113px). Facing RIGHT (cape trails left) → FLIP_H=False.

Frame counts are ESTIMATES; verified by reslice/harness per stage. Precise
per-role frame picks use zoomed renders each stage (as with DCUC).

## Core state / movement
| Boxes | Role | Notes |
|-------|------|-------|
| 0–13 | **Walk / run cycle** (~14f upright stride) | grounded locomotion |
| 14–17 | **Idle / stand** (16 = neutral arms-at-side) | idle candidate (multi-frame possible → less stiff than DCUC) |
| 18–24 | **Crouch / duck / low** | crouch + crouch-attack candidates |
| 247–248 | **Prone / knockdown** (sheet bottom sliver) | REAL KO art (better than DCUC's knockback reuse) |

## Flight (HEAVY presence — New 52 is flight-forward)
| Boxes | Role |
|-------|------|
| 46–90, 96–98, 136–145, 176–179, 220–224 (+many) | **Flight** (horizontal, cape trailing) + flying dashes w/ motion-trail streaks (96–98 = speed trails, NOT beams) |

## Attacks — melee (RICH; far more than DCUC)
| Boxes | Role candidate |
|-------|----------------|
| 25–45 | flying punches / lunges / kicks |
| 99–135 | standing punches / uppercuts / kicks |
| 146–216 | punches, kicks, spins, flying attacks, low attacks |
| 227–246 | more punches / kicks / flying |
| 171–172 | **red SPINNING / tornado attack** (unique circular-blur FX art) → special/ult candidate |

## Win / celebration
| Boxes | Role |
|-------|------|
| among 217–226 | arms-up / triumphant flight poses → WIN candidate (confirm at S6; may reuse a flight/stance) |

## FX / specials source
- **Heat Vision:** NO eye-beam art (96–98 are flight trails) → **PROCEDURAL** beam (same as DCUC).
- **Spinning tornado:** 171–172 real art → a Spin special or the ULT.

## Role assignment (working — confirm each stage with zoomed renders)
- **Class:** agile **flying all-rounder / aerial rushdown** (flight-heavy; distinct from `superman` beam-zoner and `superman_dcuc` ground bruiser). canFly.
- **Normals (S2):** light/heavy from punch frames (25–28 / 108–112), up-launcher from a rising punch/kick or ascent, air from a flying punch, crouchLight from 18–24.
- **Command combat (S3):** Fwd+Heavy rekka from a punch chain (the rich attack rows give a real 3-hit string — better than DCUC).
- **Specials (S4):** fixed-slot kit — N=Heat Vision (procedural) / F=Flying Charge / U=Soaring/anti-air / D=Super Breath (procedural) or Ground Pound / B=escape / air=Dive. **Spinning Tornado (171–172)** slots as one directional special (real art).
- **ULT (S5):** candidates — **"Infinite Mass Punch"** flying-tackle guaranteed cinematic, OR **"Super Tornado"** promoting 171–172. Decide at S5 (no unique ult art either way → guaranteed inline cinematic like DCUC's Big Rock).
- **WIN:** arms-up 217–226 (confirm). **LOSE:** reuse knockdown 247–248 (REAL prone art). **Intro:** none obvious → defer.

## GAPS / flags
- **JPEG source** (no alpha, compression fringe) → white-key + edge flood-fill at S1; expect slightly softer edges than PNG rips.
- **No red trunks** (New 52) → skins later SKIP the trunks region for this variant (per prompt).
- **No heat-vision / beam art** → procedural.
- Dense small sprites → per-stage zoomed frame confirmation required.
- Real prone knockdown (247–248) — an improvement over DCUC.
