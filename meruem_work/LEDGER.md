# MERUEM — "The King Who Learned" — BUILD LEDGER

Additive fighter `meruem` (universe `hunter_x_hunter`), the Chimera Ant King. Sliced from the santiag02
JUS sheet (`meruem_jus_sprite_complete_by_santiag02_de045ih.png`, 1176×2240, opaque navy 0,64,128,
border-flood-fill keyed) via `meruem_work/slice.py`. **combat.js UNTOUCHED (byte-identical) in every phase.**

## Commits
- **P1** `c2cb04c7` — body, tail-kit normals, win/lose/intro, portrait, cut-ins, plumbing, credits.
- **P2** `53825a56` — Aura Bullet(+charged), King's Lunge, Tail Aura Rush, Gungi Mind Stance, Photon Field, Ant King's Onslaught.
- **P3** `189d229c` — Gungi Mind adaptation, Never Pushed, Final Hours, lines (also repaired a concurrent-session corruption of main).
- **P4** (this) — Aura Synthesis payoff: Royal Feast → Winged Ascension → Rage Blast + ledger.

## Stats / energy / scale
HP **1340** · Aura **200** · attack **98** · defense **92** · speed **92** (growth systems push higher).
Energy label **"Aura"** (`energyConfig.label`). `spriteScale 1.9` → idle body ≈108px on-screen (roster-matched).
No voice (silent by design). Skins: Default only. Unlocked by default. Not brutality-eligible.

## Input table
| Move | Input | Canon | Aura | Damage/notes |
|---|---|---|---|---|
| Claw String | Light | — | — | B-family claw string (44) |
| Tail Swipe | Heavy | — | — | Y-family tail swipe (82) |
| Tail Upper | Up-Attack | — | — | Y+Up launcher (66) |
| Aerial Claw | Air | — | — | Jump+B (58) |
| Spinning Tail | Down-Air | — | — | Jump+Y (64) |
| Aura Bullet | Special (tap) | ORIGINAL | 18 | purple round (70) |
| Aura Bullet (charged) | Special (HOLD ≥20f) | ORIGINAL | 30 | 2× round (118) |
| King's Lunge | Fwd+Special | CANON-ADJ | 26 | 6-Koma dash-strike (96) |
| Tail Aura Rush | Down+Special | ORIGINAL | 24 | low tail rush (84) |
| Gungi Mind Stance | Back+Special | CANON | 16 | 22f read: counter (92) / projectile absorb |
| Photon Field | Up+Special | CANON-ADJ | 34 | ~4s photons + reads foe's next special name |
| Ant King's Onslaught | Ultimate (neutral) | CANON-ADJ | 100 | menace cut-in → lunge → aura-flash → tail (234) |
| **Royal Feast** | **Ultimate (Down, full Synthesis)** | **CANON** | 100 | heal 15% → Winged Ascension (~10s) |
| Winged Dive | Fwd+Special (winged) | CANON | — | diving flight strike (108) |
| **Rage Blast** | **Ultimate (neutral, winged)** | **CANON** | — | charge → bursts → stage beam (242); ENDS the form |

## Systems (numbers)
- **Aura Synthesis gauge** (CANON): max 100; +8 per aura-round hit, +14 per Gungi absorb, +6 per Gungi counter. Full → Royal Feast.
- **Gungi Mind** (CANON): per-opponent-move hit count; 3rd hit → auto-parry once (full refund + i-frames + tail-lance 92 + "READ") + LEARNED → −30% ongoing.
- **Never Pushed** (CANON): combo ≥25% max HP (335) → +1 Evolution stack (+5% speed & +5% damage each, max 3/match, kept across rounds).
- **Final Hours** (ORIGINAL): HP first <20% → +15% damage + 0.06/frame poison (never below 1 HP) + sickly tint + cut-in.
- **Royal Feast / Winged Ascension**: Down+Ult at full gauge → heal 15% + ~10s (600f) winged flight form (winged frames only, glide). Fwd+Special = dive; Neutral Ult = Rage Blast. Reverts on timeout/KO/Rage-fired.

## Section ledger — every region of sheet S
**USED:** Stand→idle · Defense→guard · Walk→walk/run · Dash→dash · Jump→jump/fall · B→light · Y→heavy ·
Y+Up→up-attack · Jump+B→air · Jump+Y→down_air · Damage→hurt/knockdown/getup · Ultimate-Action body→intro ·
Win(Meruem+board+Komugi)→win tableau · Lose→lose · portrait→portrait · menace panels(purple/green)→ult +
Royal-Feast cut-ins · anime screencap→Royal-Feast cut-in overlay · others-attacks row1→Aura-Bullet cast+proj ·
others row3→Tail-Rush · others row4→aura-flash (ult) · 6-Koma X→King's-Lunge + ult rush · Alt aura-charge→
Photon-Field · Ultimate-Action spikes→ult-spikes (reserved) · Y+Forward→Gungi tail-lance · Y+Down→ult tail-
finisher · 6-Koma X+Up (10 winged)→Winged Ascension idle/dive · Rage-Blast band→charge dots/bursts/beam
(head-mid-tail set A).
**UNUSED (reported):** Alt. prone glide (`meruem_glide_uniform.png` — reserved for a dodge/hover) · unused-box
winged-prone + loose wing-FX + expression-icon heads (the 10 winged frames sufficed) · Rage-Blast beam set B ·
`meruem_ult_spikes_uniform.png` (sliced, reserved). **EXCLUDED (not frames):** "S" logo + credits text · the
Gon-striking example · the NETERO/6-Koma + Ultimate-Action + "unused"-box example boxes · the ¿Lose? logo gag ·
the Gon sprite in the unused box.

## Canon labels
CANON: Gungi Mind, Never Pushed, Aura Synthesis, Royal Feast, Winged Ascension, Rage Blast, Photon Field (aura
scan). CANON-ADJACENT: King's Lunge, Ant King's Onslaught. ORIGINAL (sheet's own "others attacks (no canon)"
block): Aura Bullet, Tail Aura Rush, Final Hours (Poor Man's Rose nod).

## Lines (original text; text-only, no audio)
Intros (3 generic + matchup vs netero/gon/killua/hisoka/chrollo/kurapika), Evolution pops (3), Final Hours (2),
Royal Feast (2), Win (4). Shown via a code-drawn banner above the head.

## Optional copy — SKIPPED (reported)
The "Royal Feast also copies the opponent's most-used projectile special" option was **skipped**: the reusable
copy patterns (Rick Prime Energy Siphon / Chrollo Skill Hunter / omololu Transform) copy the opponent's **full
kit**, not a single projectile; a narrow projectile-only copy would need new scaffolding and Royal Feast's
Winged Ascension is already a complete payoff. Reported per the brief's allowance.

## Credits (in-game, credits.js SOURCED_ART)
Santiag02, gameinvader, james1971 (in-sheet credit block). The embedded anime screencap is used solely as a
cut-in overlay (noted).

## GAPS (honest, flagged — not invented)
crouch/crouchLight: none on sheet (omitted) · grab: engine default · taunt: none · run reuses Walk · fall reuses
Jump · charge reuses Idle · arcadeRivalLines deferred (matchup delivered via the in-match intro banner).
Code-drawn FX only (reported): aura photons, charge glow, Gungi aura ring, READ/EVOLVED pops, banner text,
Final-Hours tint/flare, winged aura, Synthesis/Winged timer bars, menace-panel vignettes.
