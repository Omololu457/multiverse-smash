# Falconzord — SPRITE LEDGER + SORTIE ART

Source: `Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Zords - Falconzord.gif`
- sha256 `f7bf588277c2f4ddffaa483e127d2791b55e83d69e7c08abdb6b01b3d8d1d24b` · 410×532 · GIF transparency index 76 only.
- Credit (transcribed from the sheet): **"Sprites ripped by Belial the Hedgehog."**
- Shared asset: cells live in `assets/power_rangers/falconzord/cells/` and are decoded ONCE (mmprBlackFx image cache) for every owner. **Never recoloured** by any Black skin (asserted by harness/mmpr_black_skins.test.mjs).
- Each cell has its own anchor (torso / wing root) and a native facing (`face` −1 = drawn facing left; bank/thrust/dive cells) so flips are exact.
- Gameplay never reads these pixels: contact boxes come from the sortie profiles in mmprBlackData.js (body + talons only, never the wing span).

| Cell | Source rect | Pose group | Status |
|---|---|---|---|
| fly0 | 4,3,69,68 | approach | used — every sortie entry/exit + intro/victory flypast |
| fly1 | 80,6,74,58 | approach | used — every sortie entry/exit + intro/victory flypast |
| bank0 | 160,4,90,61 | turn | used — sortie exit bank |
| bank1 | 262,7,81,50 | turn | used — sortie exit bank |
| front0 | 7,88,55,59 | front | cut, not drawn — head-on pose — no sortie path flies straight at the camera |
| zap0 | 67,83,98,64 | zap | used — Covering Volley hover/fire |
| zap1 | 166,81,96,64 | zap | used — Covering Volley hover/fire |
| talon0 | 7,158,58,71 | talon | used — Talon Lift strike + ultimate beat 3 |
| energy0 | 73,156,64,78 | energy | used — ultimate bright dive (energy form) |
| thrust0 | 144,171,76,54 | thrust | cut, not drawn — thrust/boost sequence — not needed by the three short paths |
| thrust1 | 230,168,66,58 | thrust | cut, not drawn — thrust/boost sequence — not needed by the three short paths |
| thrust2 | 312,166,68,58 | thrust | cut, not drawn — thrust/boost sequence — not needed by the three short paths |
| shot0 | 395,198,8,6 | shot | used — Covering Volley projectile art |
| shot1 | 391,202,8,6 | shot | used — Covering Volley projectile art |
| jet0 | 10,242,76,89 | rise | used — Talon Lift exit climb |
| dive0 | 100,254,71,58 | dive | cut, not drawn — steep dive — the ultimate uses the energy form instead |
| impact0 | 185,276,45,23 | impact | used — ultimate final impact burst |
| sweep0 | 9,347,65,31 | sweep | used — Falcon Sweep pass + ultimate beat 1 |
| sweep1 | 81,341,65,37 | sweep | used — Falcon Sweep pass + ultimate beat 1 |
| sweep2 | 156,342,64,35 | sweep | used — Falcon Sweep pass + ultimate beat 1 |
| sweep3 | 228,346,65,32 | sweep | used — Falcon Sweep pass + ultimate beat 1 |
| sweep4 | 312,346,66,37 | sweep | used — Falcon Sweep pass + ultimate beat 1 |
| glide0 | 5,390,65,58 | glide | cut, not drawn — glide — redundant with fly0/fly1 at the assist's short durations |
| streak0 | 81,399,123,50 | streak | cut, not drawn — speed streak — reserved; paths are short enough without it |
| goldFly0 | 215,402,72,42 | goldFly | cut, not drawn — gold-tinted flight frame — would read as a recolour, the Falconzord is never recoloured |
| front1 | 9,460,63,64 | front | cut, not drawn — head-on pose — no sortie path flies straight at the camera |
| tuck0 | 86,482,63,22 | tuck | cut, not drawn — wings-folded tuck — no path uses a tuck |
| tuck1 | 157,476,64,25 | tuck | cut, not drawn — wings-folded tuck — no path uses a tuck |
| tuck2 | 233,469,65,36 | tuck | cut, not drawn — wings-folded tuck — no path uses a tuck |
