# Omni-Man (Viltrumite) — inputs, frame data, combos

P1 keyboard: **J** Light · **K** Heavy · **I** Up-attack · **L** Special · **U** Ultimate · **O** Grab · **P** Charge · **;** Guard · **WASD**.
Motions are written for a fighter facing right (→ = toward the foe). Every press is buffered 8 frames on the sim clock
(hitstop holds the buffer), motions 14–20 frames, ↓↓ 24 frames.

## Flight
| Input | Effect |
|---|---|
| Charge **tap** | take off / come down (a hold charges meter on the ground) |
| direction | steer — heading turns ±25° per 10 f at top speed; 0.6 s to reverse |
| Guard in flight | **BRAKE**: 80 % of the speed gone in 10 frames; above 40 % speed guard never blocks |

## Normals (every move: `damageType: 'blunt'`; damage at standstill — **+0 … +60 %** with flight speed, the peak speed carried into the swing)
| Move | Input | Damage | Startup | Active | Recovery | Notes |
|---|---|---|---|---|---|---|
| Jab | J | 38 | 5 | 2 | 8 | chains → Straight / Haymaker |
| Straight | J on Jab / Low contact | 60 | 8 | 3 | 13 | chains → Haymaker |
| Haymaker | K | 96 | 14 | 4 | 20 | wall bounce; chained it steps in 36 px |
| Low | ↓+J / ↓+K | 46 | 7 | 3 | 11 | hits low; chains → Straight |
| Kick | I (or ↑+K) | 70 | 9 | 3 | 15 | |
| Flight punch | any attack in the air / in flight | 64 | 6 | 4 | 10 | ×1.60 at top speed (measured) |

## Specials / super / ultimate
| Move | Input | Damage | Notes |
|---|---|---|---|
| Viltrumite Blitz | ↓↘→+L | 90 | rush at top speed: tap 50 % / hold 80 % of the screen; whiff = 0.86 skid + 24 f; a wall at speed = crash |
| Sky Hook | →↓↘+L | 80 | launches; he goes straight into flight |
| Meteor Drop | (air) ↓+L, ↓→+L = 45° | 70 OTG shockwave (+35 body) | 30 f recovery if nothing is hit |
| Face in the Dirt | ↓↙←+L | 110 | grab (96 px), drag 40 % of the screen, throw into the wall ahead (wall bounce) |
| Unimpressed | ↓↓+K | 80 backhand | 24-frame counter (melee + projectiles); the eye glint is the only tell; 12 s cooldown; whiff ≈ 40 f |
| Viltrum Decree | ↓↓+J | — | 60-frame taunt; untouched = +25 % meter |
| **THINK!** (1 bar) | ↓↓+L (or ↓↘→↓↘→+L) | 300 (4 × 20 + 220) | blitz-grab ≤ 60 % screen, drag to the far wall, slam; "THINK!" — "Think, Mark! THINK!" vs Invincible |
| **ESCAPE VELOCITY** (ultimate) | U | 420 (10 × 8 + 340) | standard ultimate: 100 energy, the universal 20 s cooldown. GRAB 0.25 s (whiff = overshoot + 40 f; Gojo's Infinity makes it whiff) → ASCENT 1.6 s → ORBIT 1.4 s (the music drops to a hum; "Look what they need to mimic a fraction of our power.") → RETURN 1.2 s (re-entry) → IMPACT 0.6 s (crater, hard knockdown) |

## Five combos (each verified through real input in `harness/omniman_viltrum_moves.test.mjs`, vs Homelander)
| # | Route | Input | Measured |
|---|---|---|---|
| 1 | Jab → Straight → Haymaker (wall bounce) | J, J, K | **186** |
| 2 | Jab → Straight → Viltrumite Blitz | J, J, ↓↘→+L | **180** |
| 3 | Low → Straight → THINK! (1 bar) | ↓+J, J, ↓↓+L | **406** |
| 4 | Haymaker into the wall → wall bounce → Escape Velocity | K (near a wall), U | **516** |
| 5 | Sky Hook → auto-flight Flight punch → Meteor Drop OTG | →↓↘+L, J, ↓+L | **234** |
