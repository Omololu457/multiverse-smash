# Superman 2 (DC Universe Customs) — Stage 0 Asset Map

Prompt label **"Superman 2"** — the 2nd of 4 Superman roster entries, SEPARATE
from the built `superman` (Arcade). Own-sheet-only, no asset sharing with the
other Supermen (same rule as their movesets).

- **Source sheet:** `Custom _ Edited - DC Universe Customs - Superman - Superman.png` (1438×2404, RGBA)
- **Background key:** MS-Paint green `#22B14C` (34,177,76), TOL 60. Free-floating
  sprites (NO moated cells) → each non-green connected component = one sprite.
- **Working rosterKey:** `superman_dcuc`  ·  **working display name:** "Superman (Custom)"  ·  *(names OPEN — trivially renamed before ship)*
- **Universe:** dc (exists). Blue suit (0,0,255 / 0,72,248), red cape/trunks/boots (182,14,22 / 237,28,36 / 255,0,0), black outline.
- **CREDIT (from header box 0):** sprites by **Spellfire**; thanks Nightmare, Sam & Mike Penner; **ported by ProtoStar**. → credits.js attribution at S6.
- Box detector: `tools/superman_dcuc_stage0_boxes.py` (202 boxes ≥250px, `/tmp/dcuc_band0..5.png`).

Frame counts are ESTIMATES; verified by reslice/harness per stage.

## Header / portrait
| Box | Region | Role |
|-----|--------|------|
| 0 | y20-174 x27-529 | Credit banner + **Superman bust portrait** (right side, "Ported by ProtoStar") → portrait crop candidate |

## Core state / movement
| Boxes | Role | Notes |
|-------|------|-------|
| 1–7 | **Walk cycle** (~7f striding right) | grounded walk |
| 11–18 | **Run cycle** (~8f forward-lean, arms back) | run/dash |
| 38–40 (+45 land) | **Jump / rise** (tall ~88px poses) | jump/fall; 45 = land/crouch |
| 54–64, 157–162 | **Flight** (horizontal, cape trailing) | flight-mode locomotion (canFly, like `superman`) |
| 8–10, 19–26 | small red/blue **motion/afterimage bits** | FX shards / cape pieces — not standalone anims |
| 41,48,49–53,72–74,107,132–134,147–150 | **red cape-only flutter frames** | cape overlays/flutter; likely engine-ignored or FX |
| 79–81 | **arms-raised** power-up / victory pose | WIN candidate |

## Damage (row label "Damage" / "Blow")
| Boxes | Role |
|-------|------|
| 87–93 | **hurt / stagger** (hit reactions) |
| 94–96 | **Blow** = heavy knockback / blown-away |
| 97 | crouched/downed small | 

## Attacks — melee (row label "Attack's")  ← Stage 2 normals source
| Boxes | Role candidate |
|-------|----------------|
| 99 | ready stance |
| 100 / 109 | **jab** → light |
| 101 / 110 | **lunging straight punch** (cape streams) → heavy |
| 102,103,104 | punch follow-ups / cross |
| 105,106,116,117 | **kicks** → air / down_air candidates |
| 111 | **low punch / sweep** → crouchLight candidate |
| 112 / 115 | **uppercut** (rising arm) → up-attack LAUNCHER |
| 108,114 | stance/idle beats |

## Crouch Attacks (row label "Crouch Attack's")
| Boxes | Role |
|-------|------|
| 169–176 | **crouch punches / low kicks** → crouch normals |

## Flying attacks / aerials
| Boxes | Role |
|-------|------|
| 135–140 | **flying punch / dive** (horizontal, cape back) → air normals / air special |
| 163–168 | **flying kick / dash w/ swoosh arc** (165/166 = crescent-slash FX) → air special |
| 141–146 | spin / aerial cape-swirl |
| 126–131 | **dash / super-charge with cape stream** → forward special (flying charge) |
| 151–156 | low slide / special (153 = white motion streak) |

## FX strips
| Box | Role |
|-----|------|
| 179 | y2127-2236 x378-1386 — **dust/cloud puff strip** (white puffs on black) → landing dust / speed clouds FX |

## SUPER — "Super 1 - Big Rock"  ← ULT / signature source (REAL ART)
| Boxes | Role |
|-------|------|
| 185–190 | Superman **lifts giant boulder overhead → heaves/throws** (190 = throw arc) |
| 191–195 | throw follow-through |
| 196, 197 | **intact boulder** sprites (~147×85) → projectile art |
| 200 | boulder **cracking / rubble** |
| 198,199,201 | **debris chunks** (shatter FX) |

## Role assignment (working — confirm at each stage)
- **Class:** melee **bruiser / flying brawler** (rich Attacks + Crouch-Attacks + Flight; contrasts `superman`'s beam/zoner kit). canFly.
- **Normals (S2):** light=jab 100/109, heavy=lunge 101/110, up=uppercut 112/115 (launcher), air=flying punch 135–140, down_air reuse air, crouchLight=low punch 111 / crouch row 169–176.
- **Command combat (S3):** Fwd+Heavy rekka from punch chain 100→101→112 or dash 126–131. TBD S3.
- **Specials (S4 — BUILT, test 23/0):** fixed-slot flying-brawler kit (mirrors executePiccoloSpecial via triggerSpecial): N=Heat Vision (procedural red piercing beam, cast=idle) / F=Flying Charge (i-frame dash tackle, flycharge 128-130 art) / U=Soaring Uppercut (anti-air launcher, reuses ascent 38-39) / D=Super Breath (procedural wide push gust, cast=idle) / B=Flying Retreat (i-frame back reposition, reuses fly) / air=Flying Dive Kick (dive 138-139 art). Heat Vision + Super Breath PROCEDURAL (no art). "Big Rock" reserved for S5 ULT.
- **ULT (S5):** **"Big Rock" boulder throw/slam** (185–201) — inline cinematic promoting the boulder + shatter art. Strong signature, real art.
- **WIN:** arms-raised 79–81. **LOSE:** reuse knockdown (94–97). **Intro:** none obvious → defer/procedural.

## GAPS / flags
- **No heat-vision / beam art** → heat vision procedural if included.
- **No dedicated intro** sequence → defer or procedural liftoff.
- Cape-only flutter frames (41,48,49-53,…) are overlays, not animations — exclude from role mapping.
- Frame boundaries within multi-pose rows to be pinned at S1 reslice.
