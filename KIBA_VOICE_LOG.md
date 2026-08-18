# Kiba Inuzuka (+ Akamaru) — Voice Line Mapping

20 raw Japanese clips, **ALL UNIDENTIFIED** (silence-gap segmentation only — no transcript/translation).
Mapped by **trigger + acoustic feature** (measured duration + RMS-energy envelope + silencedetect), NOT
content — same approach as `jasonVoice.js` / `orochimaruVoice.js`. `kibaVoice.js` holds the pools;
`pickKibaVoice(pool)` → one clip; callers use `sound.playSfxFile(clip, null)`. **No combat logic touched.**

## Long-clip review (the 4 flagged 08/09/14/20 + two the flag missed: 13/16)
Measured (durations are actual clip length; the `NNNN.Ns` filename suffix is the START-OFFSET in the source):

| clip | dur | envelope | verdict |
|---|---|---|---|
| 08 | 8.2s | energetic ~-14dB, only a trailing gap | **one line** → twoHeaded |
| 09 | 7.0s | quieter ~-17dB, one soft dip @3.6s | kept whole (hard cut risks mid-word) → knockdown |
| 13 | 12.6s | continuous, NO gaps | one long line → **BANKED** (too long for a repeating trigger) |
| 14 | 8.0s | energetic ~-13dB, continuous | **one line** → fourLegs |
| 16 | 17.0s | **HARD silence gap @8.08s** (silencedetect-confirmed) | genuinely **TWO lines** → SPLIT |
| 20 | 13.6s | only SOFT background-masked dips (as flagged) | NOT split (cuts land mid-word) → **BANKED** |

- **16 SPLIT** into `kiba_line_16a.mp3` (0–8.05s) + `kiba_line_16b.mp3` (8.42s+). Both ~8s and the LOUDEST
  material (~-12dB) = most dramatic. **16a → ULTIMATE** (the split is at a real silence, so 16a is a
  complete line). 16b banked.
- **BANKED / unused** (available dramatic extras): `13`, `16b`, `20`.

## Final mapping (Frog Mode has NO slot — it was dropped from the build)

| # | Trigger | Pool | Clips | Hook |
|---|---|---|---|---|
| 1 | Intro / pre-match reveal | `intro` | 04 (5.8s), 01 (2.5s), **11 (0.9s = folded-in namecall)** | game.js `INTRO_VOICE.kiba` |
| 2 | Light combo cast/effort | `effort` | 10 (2.0s), 06 (1.3s) | combat.js `applyKibaAttackVoice` (light move only, cd 40f) |
| 3 | Weak Gatsuga cast | `gatsugaWeak` | 05 (3.3s), 12 (2.2s) | abilities.js `fireKibaGatsuga` |
| 4 | Strong Gatsuga cast | `gatsugaStrong` | 07 (4.1s) | abilities.js `fireKibaGatsuga` |
| ~~5~~ | ~~Frog Mode~~ | — | **DROPPED** (non-Kiba toad-summon art) | — |
| 6 | Four Legs transform | `fourLegs` | **14 (8.0s, energetic)** — distinct energetic per brief | abilities.js `fireKibaFourLegs` |
| 7 | Two-Headed Wolf cast | `twoHeaded` | 08 (8.2s, energetic) | abilities.js `fireKibaGatsuga` |
| 8 | Three-Headed Wolf ULT | `ultimate` | **16a (8.05s, loudest/most dramatic)** | abilities.js `executeKibaUltimate` |
| 9 | Hit reaction (light) | `hitLight` | 02 (1.9s), 17 (2.6s) | combat.js `applyKibaHitVoice` |
| 10 | Hit reaction (heavy) | `hitHeavy` | 18 (3.5s), 03 (3.0s) | combat.js `applyKibaHitVoice` (strong cat OR dmg≥55) |
| 11 | Knockdown | `knockdown` | 09 (7.0s), 15 (4.9s) | combat.js knockdown watcher |
| 12 | Win pose | `win` | 19 (2.8s) | game.js win dispatch |
| 13 | Namecall | *(folded into `intro`)* | 11 (0.9s, shortest/most name-like) | via intro reveal |

**Coverage:** 17 of 20 source clips used (+ the 16a split); banked: 13, 16b, 20.

## Open items / flags
- **Content is unverified** (all clips unidentified JA) — assignments are acoustic-vibe fits, not
  transcript-matched. If any clip's content clashes with its slot, re-home it.
- **Namecall**: no clip is confirmed to be purely his name. The shortest clip (line_11, 0.9s — the most
  name-like) is folded into the `intro` pool (the reveal is the natural namecall beat) rather than forcing
  a dedicated hook. Re-home if it turns out to be a grunt.
- **Gating**: casts share `_atkVoiceCd` (150f; ult 220f, fourLegs 200f); the light-flurry effort uses its
  own `_kibaAtkVoiceCd` (40f); hit/knockdown use the shared `_hitVoiceCd` (150f) — so a fast kit never
  machine-guns lines.

Verified: `test:kiba-voice` 10/0; regressions `test:kiba` 14/0, stage3/4/5 green, `test:orochimaru-voice`
19/0 (shared combat.js dispatch unaffected).
