# Spider-Man — Voice Log (Marvel Rivals "Voice Lines & Efforts" pack)

479 clips (`spiderman_mr_001..479.mp3`), silence-split from one 16:43 source. **Every clip was TRANSCRIBED** with faster_whisper (`tools/transcribe_spiderman_voice.py`, base.en) and classified by ACTUAL content (`tools/classify_spiderman_voice.py`), not filename/duration. Module: `spidermanVoice.js` (`tools/gen_spiderman_voice_js.py`).

## Content split
- ~456 spoken LINES (clips 1-456) + ~23 wordless EFFORT/grunt cluster (clips 457-479) — matches the source name.
- **442 clips WIRED** into 9 pools; **37 banked/excluded** (flagged, see below).

## Pools → triggers
- **intro** (12) → pre-match (game.js INTRO_VOICE)
- **quip** (384) → STRONG/long-string connect + taunt (combat.applySpidermanOffenseVoice + taunt-commit)
- **effort** (12) → light-normal grunt (combat.applySpidermanAttackVoice)
- **hitLight** (8) → takes light hit
- **hitHeavy** (4) → takes strong hit (combat.applySpidermanHitVoice)
- **knockdown** (4) → knocked down (combat knockdown watcher)
- **webCast** (7) → Web Impact/Throw casts (abilities)
- **ultimate** (3) → Maximum Web (abilities.executeSpidermanUltimate)
- **victory** (9) → win (game.js)

## FLAGGED (banked, NOT wired — need manual re-listen/re-split)
- **23 possible CUT-MID-LINE** (silence-split severed a continuous sentence; most start with a conjunction): [6, 39, 100, 116, 179, 197, 207, 212, 218, 225, 249, 251, 271, 275, 290, 291, 357, 360, 362, 366, 377, 381, 401]
- **6 whisper HALLUCINATION/run-on** (esp. clip 12 = 6 sentences in 0.64s): [12, 94, 292, 303, 346, 347]
- Plus a few UI-number/one-word fragments (100 'wait', 275/459 'You', 58 '100%', 231 'Five', 319 'Cup!', 18 'Home', 130 'I...').

## Notes
- Many `quip` clips are Marvel-Rivals TEAM-SHOOTER context (healing/objectives/teammates) — kept as generic Spidey banter in 1v1 (a quip is a quip), flagged for awareness.
- Coverage: all 479 transcribed; small trigger pools spot-checked line-by-line against transcripts; the 384-clip quip pool was bucketed by rule + sampled, not every line individually auditioned.
