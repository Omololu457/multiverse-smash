# Homelander — Voice & SFX Map

Pack: **103 source clips** (MK1 Homelander compilation, −16 LUFS, 4 length-sorted folders) copied
untouched to `assets/audio/homelander/source/`. After splitting the long clips → **252 clips total**
(103 originals + 149 single-line pieces). Full per-clip feature table: `AUDIO_ANALYSIS.csv`.

**I cannot hear audio and there is no speech-to-text tool in this environment**, so I could not read
what any line *says*. Classification (voice / SFX / music) is acoustic; pool placement for voice lines
is a **length + energy heuristic**. Every voice-line placement is therefore marked **unverified** —
audition with the pack's `index.html` (copied alongside the clips) or the Training-Mode sound test and
re-sort. No STT transcripts are reported (none available).

## Classification (acoustic)
- **Voice: 197 · SFX: 55 · Music: 0.** No clip passed the music test (sustained low-variance harmonic
  bed) — the "long_over_8s_maybe_music" clips are all multi-line *speech* (high envelope variance +
  inter-line gaps), so none were tagged music / left out for that reason.
- Features per clip: duration, peak, RMS, attack time, spectral centroid & rolloff, voiced-band
  (85–255 Hz) ratio, zero-crossing rate, silence ratio, RMS-CV, harmonic ratio, music score.

## Step 1 — long-clip splitting
All **27 clips over 8 s** were split on sentence-length silences (ffmpeg `silencedetect`, −30 dB / 0.30 s)
into **149 single-line pieces** (`<name>_pNN.ogg`), saved beside the copies (originals never overwritten).
The 27 long originals are **excluded from the mapping** (replaced by their pieces).

## Step 2 — pools (≥3 each; all 16 well over)
Mapped **225 clips** (16 short + 60 line clips + 149 pieces). **Every pool has 8–18 clips — none under 3.**

| Pool | #clips | kind | status |
|---|---|---|---|
| INTRO | 15 | voice | unverified (length heuristic — audition) |
| WIN | 14 | voice | unverified |
| LOSE | 14 | voice | unverified |
| ROUND_START | 14 | voice | unverified |
| KO | 8 | voice | unverified |
| HIT_REACT | 18 | voice (short grunts) | unverified |
| ATTACK_EFFORT | 17 | voice (short efforts) | unverified |
| SPECIAL_CALLOUT | 14 | voice | unverified |
| FLEX_TAUNT | 14 | voice | unverified |
| GRAB | 14 | voice | unverified |
| ULTIMATE | 14 | voice | unverified |
| BRUTALITY | 14 | voice | unverified |
| LASER_CHARGE | 13 | SFX (bright charge) | unverified |
| LASER_BEAM | 12 | SFX (held tone) | unverified |
| SUPERSONIC | 15 | SFX (boom/whoosh) | unverified |
| FLIGHT_TAKEOFF | 15 | SFX (whoosh) | unverified |

**How the heuristic assigned them:** SFX pools got the 55 SFX-classified clips by acoustic fingerprint
(held-tone→LASER_BEAM, bright→LASER_CHARGE, low-centroid fast-attack→SUPERSONIC, mid whoosh→
FLIGHT_TAKEOFF, remainder round-robin). Short voice (<1.15 s, non-verbal grunts) → HIT_REACT /
ATTACK_EFFORT / KO. The remaining **170 spoken lines** were distributed round-robin (by length tier)
across the 9 voice-line pools — this is why **every voice-line pool is unverified**: the pool is a guess
from length/energy, not the words. A clip sits in exactly one pool.

## Unused / excluded clips & why
- **27 long originals** (`long_over_8s_maybe_music/hl_*.ogg` with no `_pNN`): excluded as multi-line
  *sources* — their 149 split pieces carry the individual lines (so the content is used, just not the
  long file). Listed with `assigned=no` in `AUDIO_ANALYSIS.csv`.
- **0 music** / 0 "too quiet" / 0 dropped as duplicates — the pack is clean and voice-dominant; all
  225 non-source clips were placed. (If audition reveals dupes or mis-class, remove via the CSV.)

## Pools with fewer than 3 clips
**None.** All 16 pools have ≥8.

## Step 3 — wiring (`homelander_sfx_map.js` + engine hooks)
- **Deterministic pick:** `juicePickVariant(hash(matchSeed, frame), player)` — a pure hash of
  (match seed, sim frame, player index); **never Math.random** → LAN/replay-safe.
- **Pitch:** ±3 % on voice, ±5 % on SFX (`juicePitch`, same hash seed).
- **Voice exclusivity + 40 ms fade:** voice pools play via `sound.playSfxFile(clip, null, {owner, fadeMs:40})`
  → the engine's single-voice enforcer stops the prior owned line, now with a 40 ms volume fade
  (`sound._killSfxEntry` gained an additive `fadeMs`; default unchanged for every other character).
- **Ducking:** reuses the engine's ref-counted music-duck that `playSfxFile` already fires per voice cue.
- **Buses:** voice/SFX route through the existing SFX master (there is no separate voice gain node; voice
  honors the same SFX/voice volume the whole pack uses). SFX pools layer freely (no `owner`).
- **Cooldowns:** SPECIAL_CALLOUT 24 f, FLIGHT_TAKEOFF 20 f, FLEX_TAUNT 40 f (frame-gated in the map).
  HIT_REACT 30 f / ATTACK_EFFORT 45 f are gated at the combat.js call site (per-fighter timers
  `_hlHitCd`/`_hlAtkCd`, decremented generically). **Specials, laser, ultimate, intro, win/lose always play.**
- **Laser:** `LASER_CHARGE` one-shot on the flex startup; `LASER_BEAM` is a **held loop**
  (`startHomelanderLaser`/`stopHomelanderLaser`) started while the beam fires and **faded out on release**
  (no pack had a dedicated seamless tone, so a held-tone pack clip is looped — audition for loop quality).
- **Events wired:** LASER_CHARGE/LASER_BEAM, SUPERSONIC, SPECIAL_CALLOUT (all 3 specials), ULTIMATE
  (abilities.js); HIT_REACT, ATTACK_EFFORT (combat.js); FLIGHT_TAKEOFF, INTRO, WIN, LOSE (game.js).
  GRAB / FLEX_TAUNT / BRUTALITY / ROUND_START / KO pools exist for the sound-test and fire once those
  moves/hooks are added (Take A Ride / Flex / brutalities are not yet built as Homelander moves).
- **Debug:** a Training-Mode sound test steps through each pool in turn.

## ⚠ Commit status
The per-clip verified render-check passes (26/0, 0 JS exceptions; determinism 14/0, combo 225/9, roster
green). The work is **complete and verified on disk but NOT yet committed** because a concurrent
`feat/spiderman` session's uncommitted edits are intermixed in `abilities.js` and `game.js` in the shared
working tree — a clean single commit of only the audio changes isn't possible without capturing their work
or a disallowed git operation. See the final message for how to land it cleanly.
