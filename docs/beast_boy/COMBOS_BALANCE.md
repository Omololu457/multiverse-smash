# Beast Boy — measured combos and balance

Every number below is MEASURED by `node harness/beast_boy.test.mjs` through real keyboard input against a standing training dummy and copied from `mechanics_results.json` by `tools/beast_boy/write_docs.py`.
"true combo" means the defender was in hitstun or knockdown on the frame before every later hit. "RESET" names the first hit the defender could have acted before, and gives how many frames they were free. HP drops are after the shared combo scaling.

Summary: 148 passed / 0 failed.

## Routes

| Route | Verdict | Hits (HP) | Total | Free frames before each hit | Energy spent* |
|---|---|---|---|---|---|
| gorilla: single strike | single hit | 59 | 59 | 0 | 11.16 |
| tricera: single strike | single hit | 65 | 65 | 0 | 15.74 |
| tiger: single strike | single hit | 52 | 52 | 0 | 14.1 |
| bird: single strike | single hit | 28 | 28 | 0 | 9.54 |
| Gorilla → (Up+SP) Bird → (Down+SP) Tiger [Wild Chain ×2] | true combo | 59 / 28 / 48 | 135 | 0 / 0 / 0 | 35.4 |
| Tiger → (Fwd+SP) Triceratops → (SP) Gorilla [Wild Chain ×2] | RESET at hit 2 | 52 / 65 / 54 | 171 | 0 / 19 / 0 | 42.62 |
| Wild Chain link: gorilla → bird | true combo | 59 / 28 | 87 | 0 / 0 | 20.88 |
| Wild Chain link: bird → tiger | true combo | 28 / 52 | 80 | 0 / 0 | 24.06 |
| Wild Chain link: tiger → tricera | RESET at hit 2 | 52 / 65 | 117 | 0 / 19 | 30.8 |
| Wild Chain link: tricera → gorilla | true combo | 65 / 59 | 124 | 0 / 0 | 27.56 |
| Instinct-armed Gorilla (no damage change) | single hit | 59 | 59 | 0 | 11.16 |
| Gorilla → Gorilla after full recovery (should NOT combo) | RESET at hit 2 | 59 / 59 | 118 | 0 / 7 | 22.26 |
| J1 → J2 → J3 | true combo | 17 / 21 / 26 | 64 | 0 / 0 / 0 | 0 |
| J1 → J2 → Gorilla Break | true combo | 17 / 21 / 54 | 92 | 0 / 0 / 0 | 11.16 |
| J1 → J2 → J3 (mirrored) | true combo | 17 / 21 / 26 | 64 | 0 / 0 / 0 | 0 |
| J1 → J2 → Gorilla Break (mirrored) | true combo | 17 / 21 / 54 | 92 | 0 / 0 / 0 | 11.16 |
| Low → Heavy → Tiger Cross | true combo | 24 / 52 / 48 | 124 | 0 / 0 / 0 | 14.1 |
| Forward+Heavy → Heavy → Heavy (advance → straight → knock-away) | true combo | 24 / 28 / 34 | 86 | 0 / 0 / 0 | 0 |
| Launcher → manual Jump → Aerial Kick | true combo | 40 / 25 | 65 | 0 / 0 | 0 |
| Heavy → Triceratops Drive | true combo | 52 / 60 | 112 | 0 / 0 | 16.34 |
| Heavy → ANIMAL INSTINCT (recovery cancel) | true combo | 52 / 23 / 38 / 25 / 51 / 85 | 274 | 0 / 0 / 0 / 0 / 0 / 0 | 96.64 |
| J1 → J2 → Gorilla → (Up+SP) Bird → (Down+SP) Tiger | true combo | 17 / 21 / 54 / 24 / 40 | 156 | 0 / 0 / 0 / 0 / 0 | 35.4 |
| Air Tiger Cross (jump-in) → Gorilla | single hit | 59 | 59 | 0 | 25.62 |

*Energy spent is net of the passive Morph Energy regen during the route.

## Wild Chain links (each pair measured on its own)

| Link | Verdict | Defender free before the linked hit |
|---|---|---|
| gorilla → bird | true combo | 0 f |
| bird → tiger | true combo | 0 f |
| tiger → tricera | RESET at hit 2 | 19 f |
| tricera → gorilla | true combo | 0 f |

**Honest reading.**
- Gorilla → Bird, Bird → Tiger and Triceratops → Gorilla are true links.
- **Tiger → Triceratops is a RESET.** The defender is free for about 19 f because the Triceratops startup plus the charge travel outlasts Tiger's hitstun. It is pressure, not a combo.
- Closing that gap would need about +19 f of Tiger hitstun. That would make Tiger → Tiger a loop, so it was deliberately not done.
- The one tuning change from measurement: Gorilla hitstun 34 → 37, which closed a 2 f Gorilla → Bird gap. Gorilla stays non-looping (see the advantage table and the "Gorilla → Gorilla" route).

Wild Chain window: {'lastFrame': 1, 'oneLate': 0} (1 = queued). It lasts 10 SIMULATION frames from the clean contact; hitstop frames do not advance it. Link cost paid on the execution frame: 11.94 (Bird = 12).

## Frame advantage (measured: defender-free frame − Beast-Boy-free frame)

| Move | On hit | On block |
|---|---|---|
| light | 6 | -3 |
| heavy | 6 | -12 |
| gorilla | 8 | -21 |
| tricera | 8 | -11 |
| tiger | -6 | -25 |
| bird | 8 | -6 |
| ultOpen(block) | — | -48 |

Every animal is ≤ 0 on block, so all are punishable. Tiger Cross is the most unsafe at −25. No animal's on-hit advantage reaches its own startup, so there are no self-loops.

## Other measurements

- Triceratops travel (open stage): 186 px (cap 180). Wall test: {'from': 2730, 'to': 2748, 'stageW': 3200}.
- Bird arc: apex 66 px, horizontal 132 px.
- False Start: 56 px back, 21 f total.
- Ultimate contacts (HP): 25 / 46 / 30 / 61 / 102 = 264 (authored raw 25 + 45 + 30 + 60 + 100 = 260). Whiffed opener: 91 f.
- Instinct: jump escape {'timerLeft': 8, 'atk': None, 'vy': -24.15, 'grounded': False}, dash escape {'atk': None, 'dash': 9}.
- Walk 60 f: 360 px; jump apex 355 px; one jump only.
- Interruption probes: 36 real hits landed across entry / active / return frames of all four animals. All 36 returned to humanoid hurt with the default hurtbox, no invulnerability and nothing queued.

## Balance notes

- HP 950 on a 100-energy bar. Animals cost 12–20, so an opener plus a 2-link Wild Chain is about 45 energy. The Ultimate is one 100 transaction.
- Stored damage is round(raw × 1.7), the roster lever used by the Rangers and Cyborg. The applied HP drop on a fresh hit ≈ raw.
- Not applied: a rosterParity.js ×1.3 opt-in and a Beast-Boy-specific CPU AI (the generic CPU drives him).
