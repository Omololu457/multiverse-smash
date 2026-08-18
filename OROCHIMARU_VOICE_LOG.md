# Orochimaru — Voice Log

59 raw JA clips (`orochi_line_*.mp3`), **UNIDENTIFIED** (no transcript). Assignment is BY VIBE only
(duration / pitch / brightness / energy via `tools/analyze_orochimaru_voice.py`) — the Nezuko/Saitama/Jason
precedent. Audio-only; NO gameplay effect. `pickOrochimaruVoice(pool)` → random clip → `sound.playSfxFile`.

## The 7 flagged long clips (7–11.5s) — ALL SPLIT, none kept whole
Silence-gap detection found no internal gaps (background music masked the pauses, as flagged). A
music-floor VAD + spectral-flux onset pass (`tools/split_orochimaru_long.py`) revealed **2–7 distinct
utterances in EVERY one** → each split into `<NN><a…>` segments (fragments <0.45s dropped):

| clip | dur | finding | → split into | decision |
|---|---|---|---|---|
| line_01 | 9.18s | 7 masked peaks | 01a–01d (4) | **SPLIT** (music-masked multi-line) |
| line_02 | 8.81s | 6 utterances | 02a–02d (4) | **SPLIT** (music-masked multi-line) |
| line_16 | 7.35s | 4 utterances | 16a–16d (4) | **SPLIT** (music-masked multi-line) |
| line_20 | 7.92s | 2 long utterances | 20a (3.62s), 20b (2.84s) | **SPLIT** (music-masked multi-line) |
| line_24 | 10.44s | 5 utterances (incl. a 3.42s line) | 24a–24d (4) | **SPLIT** (music-masked multi-line) |
| line_27 | 11.36s | 5–6 utterances | 27a–27e (5) | **SPLIT** (music-masked multi-line) |
| line_43 | 11.52s | 4 utterances | 43a–43c (3) | **SPLIT** (music-masked multi-line) |

**Kept whole: NONE.** Every flagged clip genuinely contained ≥2 utterances.

## Full mapping (16 trigger slots + 2 bonus specials)

**1. Intro / pre-match** — `intro` (6):
- `orochi_line_25_0103.8s.mp3` (5.41s)
- `orochi_line_47_0193.7s.mp3` (5.21s)
- `orochi_line_14_0051.6s.mp3` (5.39s)
- `orochi_line_30_0130.4s.mp3` (4.94s)
- `orochi_line_52_0211.6s.mp3` (6.25s)
- `orochi_line_03_0019.5s.mp3` (3.42s)

**2. Grab-and-Slam (throw-weapon grab)** — `grab` (3):
- `orochi_line_19_0072.9s.mp3` (2.35s)
- `orochi_line_44_0183.0s.mp3` (2.31s)
- `orochi_line_21_0084.4s.mp3` (2.15s)

**3. Ranged Strike (Snake Spit, neutral)** — `snakeSpit` (3):
- `orochi_line_17_0067.7s.mp3` (2.24s)
- `orochi_line_57_0230.4s.mp3` (2.17s)
- `orochi_line_56_0227.1s.mp3` (2.0s)

**4. Kusanagi melee (Sword Lunge, Fwd)** — `swordLunge` (3):
- `orochi_line_09_0037.8s.mp3` (3.16s)
- `orochi_line_40_0159.3s.mp3` (2.53s)
- `orochi_line_05_0024.2s.mp3` (2.53s)

**5. Kusanagi ranged (Sword Throw, Back)** — `swordThrow` (3):
- `orochi_line_36_0150.8s.mp3` (2.11s)
- `orochi_line_13_0049.9s.mp3` (1.38s)
- `orochi_line_10_0041.8s.mp3` (1.39s)

**6. Extending Charge (Striking Shadow Snake, air neutral dive)** — `snakeLunge` (3):
- `orochi_line_55_0223.8s.mp3` (2.95s)
- `orochi_line_54_0220.1s.mp3` (2.57s)
- `orochi_line_27a_0113.3s.mp3` (2.1s)

**7. Escalating Strike (Snake-Tail Sweep, Up)** — `tailSweep` (3):
- `orochi_line_22_0086.8s.mp3` (1.8s)
- `orochi_line_15_0057.6s.mp3` (2.27s)
- `orochi_line_16b_0060.1s.mp3` (1.7s)

**8. Downward Stab (Slam, Down)** — `slam` (3):
- `orochi_line_49_0204.8s.mp3` (2.71s)
- `orochi_line_39_0155.8s.mp3` (2.74s)
- `orochi_line_29_0126.8s.mp3` (2.72s)

**9. Combo Finisher (Fwd+Heavy chain)** — `chainFinish` (3):
- `orochi_line_43b_0171.1s.mp3` (2.06s)
- `orochi_line_27e_0113.3s.mp3` (1.54s)
- `orochi_line_24b_0092.9s.mp3` (1.5s)

**(bonus) Hidden Shadow Snakes (air Fwd barrage)** — `snakeBarrage` (4):
- `orochi_line_31_0137.0s.mp3` (1.61s)
- `orochi_line_35_0148.8s.mp3` (1.5s)
- `orochi_line_24a_0092.9s.mp3` (1.26s)
- `orochi_line_50_0208.3s.mp3` (1.46s)

**(bonus) Snake-Form Coil (air Back)** — `coil` (3):
- `orochi_line_24d_0092.9s.mp3` (1.48s)
- `orochi_line_16d_0060.1s.mp3` (1.44s)
- `orochi_line_16c_0060.1s.mp3` (1.2s)

**10. Summon Ultimate** — `ultimate` (3):
- `orochi_line_20a_0075.7s.mp3` (3.62s)
- `orochi_line_24c_0092.9s.mp3` (3.42s)
- `orochi_line_42_0164.2s.mp3` (6.59s)

**11. Shed-skin transform (any form)** — `transform` (4):
- `orochi_line_33_0140.4s.mp3` (5.71s)
- `orochi_line_23_0089.1s.mp3` (3.53s)
- `orochi_line_48_0199.6s.mp3` (3.93s)
- `orochi_line_12_0044.8s.mp3` (4.24s)

**12. Hit reaction — light** — `hitLight` (10):
- `orochi_line_04_0023.3s.mp3` (0.42s)
- `orochi_line_32_0139.0s.mp3` (0.31s)
- `orochi_line_53_0218.9s.mp3` (0.69s)
- `orochi_line_08_0036.9s.mp3` (0.57s)
- `orochi_line_37_0153.6s.mp3` (0.39s)
- `orochi_line_02b_0009.8s.mp3` (0.68s)
- `orochi_line_02d_0009.8s.mp3` (0.68s)
- `orochi_line_02a_0009.8s.mp3` (0.7s)
- `orochi_line_38_0155.0s.mp3` (0.62s)
- `orochi_line_58_0232.9s.mp3` (0.93s)

**13. Hit reaction — heavy** — `hitHeavy` (7):
- `orochi_line_27c_0113.3s.mp3` (0.92s)
- `orochi_line_43a_0171.1s.mp3` (0.84s)
- `orochi_line_27d_0113.3s.mp3` (1.22s)
- `orochi_line_18_0070.7s.mp3` (1.02s)
- `orochi_line_01a_0000.0s.mp3` (0.98s)
- `orochi_line_11_0043.5s.mp3` (0.79s)
- `orochi_line_01b_0000.0s.mp3` (1.54s)

**14. Knockdown** — `knockdown` (5):
- `orochi_line_41_0162.3s.mp3` (1.38s)
- `orochi_line_46_0192.0s.mp3` (1.21s)
- `orochi_line_16a_0060.1s.mp3` (1.14s)
- `orochi_line_01c_0000.0s.mp3` (1.1s)
- `orochi_line_07_0034.6s.mp3` (2.08s)

**15. Win pose** — `win` (5):
- `orochi_line_26_0109.7s.mp3` (3.23s)
- `orochi_line_45_0186.7s.mp3` (4.56s)
- `orochi_line_59_0234.6s.mp3` (6.42s)
- `orochi_line_20b_0075.7s.mp3` (2.84s)
- `orochi_line_06_0028.1s.mp3` (6.01s)

**16. Namecall — UNMAPPED.** No clip is reliably just his name (content unidentifiable from acoustics);
the namecall beat skips cleanly (Hiruzen precedent).

## Coverage
71 clips assigned across 17 pools, 0 reused. 7 usable remainders unassigned (future alts): 01d, 02c, 27b, 28, 34, 43c, 51.

## Hooks (audio-only, no combat logic touched)
- **intro**: `game.js` VOICE_INTRO registry (`maybeFireIntroVoice`).
- **8 specials + chain + grab + ult + transform**: `abilities.js` `oroVoice()` at each cast (gated by shared `_atkVoiceCd`).
- **hit light/heavy**: `combat.js` `applyOrochimaruHitVoice` (cat/dmg split, `_hitVoiceCd`).
- **knockdown**: `combat.js` knockdown-edge block. **win**: `game.js` victory hook.
