# DEATHSTROKE — voice content log (NO clips wired)

Source: 6 clips (`deathstroke_*.mp3`, English). Transcribed with faster-whisper (base, VAD) — real ASR, not filename guessing.

**Result: 0 clips wired.** No `deathstrokeVoice.js` module was created. Reasons, per clip:

| file | dur | disposition | transcript |
|---|---|---|---|
| deathstroke_001.mp3 | 36.9s | unwired — non-speech (VAD-empty) | *(silence / SFX)* |
| deathstroke_002.mp3 | 13.9s | unwired — non-speech (VAD-empty) | *(silence / SFX)* |
| deathstroke_003.mp3 | 2.5s | unwired — garbled fragment | "NOOOOOO! Here's money's green." |
| deathstroke_004.mp3 | 1.4s | unwired — sentence fragment | "and as a bonus." |
| deathstroke_005.mp3 | 1.6s | **discarded — names roster fighter** | "I get to kill Batman." |
| deathstroke_006.mp3 | 64.7s | **discarded — 64s stitch + names roster fighter** | "You're no Batman… Bring it, Slade!…" |

Per the project's established rule (see supermanVoice.js / batmanVoice.js headers), lines that NAME another
roster fighter (Batman is playable, rosterKey `batman`) are discarded, as are non-speech and long
multi-line stitches. That removes everything usable here. Deathstroke is therefore left **voiceless** for
now — the honest outcome — rather than forcing a garbled fragment into a trigger. A future pass could
hand-trim the 64s gloat (deathstroke_006) into individual Slade one-liners.
