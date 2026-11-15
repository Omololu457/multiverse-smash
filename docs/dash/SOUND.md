# Dash Parr — Sound (Phase 8)

`dashParrSound.js`: pure WebAudio synthesis through the shared `SoundManager` context/master (respects the
SFX mute). Presentation-only: the sim pushes cue names onto `f._dashParr.cues`, and `playDashParrCues` drains
them at render time. Pitch varies ±3 % from an integer hash of (cue counter, sample/cue index, player index), and noise buffers are filled
from a hash too, so there is no Math.random.

| Cue | When | Synthesis |
|---|---|---|
| step | running at Sprint/Blur, every 9 sim ticks | square 220 Hz, 20 ms |
| whoosh | Blur Dash | high-passed noise whoosh, 0.18 s |
| flurry | Flurry | square 600 Hz, 8 × 25 ms |
| laps | Laps | sine 300 → 1200 Hz Doppler sweep, 0.6 s |
| blur | Momentum reaches 100 | triangle 1760 Hz ping |
| rush | Incredi-Rush | rising noise sweep 2.5 s + sine 80 Hz thump |
| hit / rushHit / pop | contact | short noise/square ticks |
