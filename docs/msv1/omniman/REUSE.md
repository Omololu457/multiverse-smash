# MSV1-OMNIMAN — Phase 0: audit and reuse

## An Omni-Man already exists — left untouched

`characters.js` already has **`omniman`** ("Omni-Man", universe `invincible`, the older canFly flight, Smart Atoms meter,
"Viltrumite Onslaught" body-slam cinematic in `omnimanBodySlamCinematic.js`, voice in `omnimanVoice.js`, art
`omni_man_*.png`, `OMNI_MAN_ASSET_MAP.md`). Per the brief he is **not edited**: his definition, kit, skins and the canFly
flight code stay byte-identical (frame-data diff ZERO every phase, `harness/omniman_framedata.mjs`) and he stays selectable.

The new fighter is **`omniman_viltrum`** — displayName "Omni-Man", select tag "Viltrumite", universe `invincible` (so both
sit in the Invincible group). No Invincible (Mark Grayson) fighter exists, so THINK! always says "THINK!".

## Standard ultimate input and cost
Ultimate button (keyboard U / 5, pad R2) at **100 energy** — 138 of 165 roster ultimates cost exactly 100 — followed by the
universal 20 s ultimate cooldown (`abilities.js ULTIMATE_COOLDOWN_FRAMES = 1200`). Escape Velocity uses exactly that.
His meter is `maxEnergy 200` (two bars, the most common size after 100), so THINK! (1 bar = 100) and Escape Velocity
(100) can both be banked.

## Systems reused (not rebuilt)

| System | Where | Used for |
|---|---|---|
| flight.js (Homelander's module) | `FLIGHT_PROFILES`, `stepFlight`, `tickFlightDriver`, `flightToggleInput`, `resetFlight`, physics.js flight branch, gravity skip | his flight: one new profile `omniman_viltrum` (+ an optional `momentum` block read only when present) |
| Dseyl's sim-clock Charge tap | `dseylFlight.js` | takeoff / come-down on Charge TAP, deterministic |
| Gojo/Sukuna Shinjuku architecture | command layer + sim state on `f._omv` + combat hooks + idempotent `tools/omnimanviltrum/apply_hooks.py` | everything |
| combat.js `startMove` frameExact path, `getComboScale` | | every move |
| `applyScaledDamage` (W.damage) | | every hit, so damage-level defences (Infinity included) apply |
| engine grab / command grab | Sukuna's 'grab' hand-back for the generic throw; Face in the Dirt / THINK! / Escape Velocity are sim-owned command grabs | |
| Gojo's Infinity | `gojoShinjukuState.gsGrabGate` (grab), `gsMeleeGate` (melee, engine), `gsDamageMods` (scripted strikes); old Gojo `infinityActive` | Infinity at any level stops Face in the Dirt / THINK! / Escape Velocity (they whiff) and his momentum punches |
| wall splat / bounce | combat.js WALL_SPLAT (34 hitstun, 24 f pinned, 0.35 bounce, `_wallBounceShake`) | Haymaker, Face in the Dirt, Unimpressed backhand, THINK! use the same fields and numbers |
| camera shake | `camera.shake` (respects the Screen Shake setting, capped) | crash, booms, crater |
| hitstop | `f.hitstop` | every strike |
| text bubbles | Gojo/Sukuna Shinjuku render bubble pattern | THINK!, orbit line, win line |
| cinematic camera | `camera.focus` style lock used by the Shinjuku ultimates (render reads sim phase) | Escape Velocity |
| blood system + `tools/bloodmap` | `data/bloodmaps/` | he bleeds red |
| Edo Tensei generator | `tools/edoskin` | Edo eligibility |
| skin system | skins.js cosmetic `animationData` swap (Sukuna/Gojo Shinjuku skin tables) | 20 premade skins, `tools/omnimanskins/` |
| Homelander flight SFX | `homelander_sfx_map.js` pools `FLIGHT_TAKEOFF`, `SUPERSONIC` (played via `sound.playSfxFile(clip, null, { rate })`) | takeoff + boom, pitched down (rate 0.78) for a heavier Viltrumite |
| WebAudio synth pattern | Sukuna Shinjuku Fx `synth()` | whoosh whose pitch rises with speed, crash crunch, orbit hum, crater |

## Space art
No space / orbit / planet art exists (the only Viltrum art is `stages/adon_viltrum` — a red sky and ruins). The ascent sky,
stars, planet horizon, atmosphere glow, re-entry trail and crater are **procedural and render-only**; stars come from
`hashRandom(matchSeed, i)` so every machine draws the same sky.
