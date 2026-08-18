# Yamamoto Genryūsai — Voice Line Mapping (review)

158 UNIDENTIFIED Japanese clips (`yamamoto_line_NNN_SS.Ns.mp3`), silence-gap segmented, **no transcript/translation** — assigned by **acoustic signal only** (duration, RMS+peak loudness, a sustained-loudness *intensity* score, F0) via `tools/analyze_yamamoto_voice.py` → `yamamoto_voice_analysis.tsv`. Content is inferred from signal, never from filenames.

**Archetype steer (per the confirmed design — ancient, deliberately unhurried):** movement-adjacent triggers (intro, all casts, Shunpo) draw the **calmest** clips (intensity ~0.49–0.63); genuinely **intense** clips (0.75–0.92) are reserved for the **Ultimate** and **heavy hits taken**. Routine voice never reads frantic.

**line_147 (flagged, 11.8s):** no ≥0.3s internal gaps (music-masked). Split at its **two strongest interior gaps** (~3.83s, ~8.20s) into 3 natural dramatic phrases — `147a` (3.2s), `147b` (4.1s, primary ult), `147c` (3.0s, most intense/rising). Split at only the 2 strongest gaps (not all 9 sub-0.3s breath-pauses) to avoid mid-word cuts on the bed. The raw whole clip is **not pooled**.

**Coverage:** 126 of 161 usable clips pooled (158 raw − whole 147 + 3 splits); 35 remainders unused (expected — more clips than slots). Each clip is in exactly **one** pool. Wired via the shared `playSfxFile` pattern; **no combat logic touched**.

| # | Trigger | Pool | # clips | Vibe | Clips (line numbers) |
|---|---|---|---|---|---|
| 1 | Intro / pre-match | `intro` | 7 | calm | 016, 040, 073, 150, 098, 038, 012 |
| 2 | Command-chain + normals effort | `effort` | 18 | measured | 138, 037, 044, 022, 155, 057, 097, 137, 070, 077, 111, 129, 033, 125, 078, 104, 158, 107 |
| 3 | Ground-Sweep Beam cast | `beamCast` | 6 | calm | 055, 007, 140, 071, 008, 051 |
| 4 | Ground Eruption Stab cast | `eruptionCast` | 6 | measured | 066, 050, 017, 010, 030, 001 |
| 5 | Horizontal Thrust cast | `thrustCast` | 6 | measured | 109, 052, 029, 087, 021, 142 |
| 6 | **Large Ground-Stab cast (FLAGSHIP)** | `stabCast` | 6 | **weighty/distinct** | 105, 115, 091, 095, 085, 039 |
| 7 | Overhead Slam cast | `overheadCast` | 6 | forceful | 090, 113, 061, 134, 058, 082 |
| 8 | Shunpo (Flash Step) | `shunpo` | 6 | calm/quick | 036, 128, 074, 100, 096, 130 |
| 9 | **Ultimate** (Overhead Slam) | `ultimate` | 7 | **longest/dramatic** | **147b, 147c, 147a**, 072, 006, 018, 026 |
| 10 | Hit reaction (light) | `hitLight` | 24 | short grunts | 135, 123, 099, 151, 124, 054, 047, 139, 106, 122, 034, 024, 094, 020, 042, 041, 116, 117, 004, 028, 084, 146, 120, 053 |
| 11 | Hit reaction (heavy) | `hitHeavy` | 16 | **intense** | 143, 068, 108, 014, 112, 132, 048, 133, 127, 118, 088, 089, 011, 019, 031, 015 |
| 12 | Knockdown | `knockdown` | 6 | pained | 065, 141, 093, 009, 056, 148 |
| 13 | Win pose | `win` | 7 | calm/satisfied | 046, 121, 092, 002, 049, 103, 045 |
| 14 | Namecall | `namecall` | 5 | **UNCONFIRMED (flagged)** | 032, 157, 110, 076, 156 |

**Namecall note:** content unverifiable by ear — these are the calmest very-short (~0.5–0.6s) clips, banked as a `namecall` pool but **not wired to a dedicated trigger** (no namecall event exists in the engine). If a real name is confirmed, promote/repurpose the pool.

**Hooks (all `sound.playSfxFile(clip, null)`, audio-only):**
- `game.js` — `INTRO_VOICE.yamamoto` (intro), win-pose block, `_yamamotoAtkVoiceCd` decrement.
- `abilities.js` — per-cast in `fireYamamotoBeam` (beamCast), `fireYamamotoMelee` (key→stab/eruption/thrust/overhead cast), `fireYamamotoShunpo` (shunpo), `executeYamamotoUltimate` (ultimate).
- `combat.js` — `applyYamamotoAttackVoice` (effort on normals+command, gated `_yamamotoAtkVoiceCd`), `applyYamamotoHitVoice` (hitLight/hitHeavy by cat/dmg), knockdown watcher.

**Test:** `test:yamamoto-voice` → 18/0 (all 14 triggers fire from the expected pool + static coverage/dedupe). Regression: `test:mayuri-voice` 17/0, `test:kiba-voice` 10/0 (shared dispatcher), `test:yamamoto` 17/0.
