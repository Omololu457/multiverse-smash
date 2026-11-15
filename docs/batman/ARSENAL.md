# Batman (rebuilt) — Arsenal

**Archetype:** Tactical Brawler / Fleet Commander · **HP 1150** · speed 94 · double jump · physical dash ·
Gadget Energy (100). The player controls **Batman only**; every machine is an automatic assist with scheduled,
data-driven behaviour (`FLEET` in `batmanData.js`). Machine names are custom game adaptations of supplied
generic art, not official Batman vehicle designs.

## Martial arts (raw = authored units; live = × combo scale × 0.60 — see DAMAGE_AUDIT.md)

| move | input | startup / active / recovery | raw | notes |
|---|---|---|---|---|
| Jab → Cross → Rising Knee | Light ×3 (fresh presses, clean hits) | 5/3/10 · 6/3/12 · 7/4/18 | 48 / 48 / 64 | ender knocks back, cancels into Heavy family, specials, orders and KNIGHTFALL |
| Low Strike | Down + Light | 5/3/11 | 42 | hits low |
| Heavy Kick | Heavy | 11/4/20 | 95 | |
| Spinning Advance | Forward + Heavy | 16/4/22 | 95 | travels, never through the foe |
| Rising Uppercut (launcher) | Up + Heavy / Up-Attack | 6/4/8 | 75 | shared Balanced launcher: foe vy −32, Batman stays grounded |
| Sweep | Down + Heavy | 10/4/22 | 80 | low, knocks down |
| Cape Counter | Back + Heavy | catch frames 3–20 | 100 | one frontal strike (not grabs / projectiles / ultimates / unblockables) |
| Air Strike / Air Kick | Light / Heavy in the air | 6/4/12 · 8/4/14 | 65 / 65 | |
| Cape Dive | Down + Heavy in the air | 10 / until landing | 90 | 16 f landing recovery |
| Throw | Grab | shared | 45 | |

## Gadgets (Special = R1)

| gadget | input | cost | raw | behaviour |
|---|---|---|---|---|
| Batarang | Special (ground / air) | 8 | 40 out + 30 back = 70 | one batarang at a time; one hit per target per leg |
| Grapnel Breaker | Forward + Special | 14 | hook 25 + rope kick 60 = 85 | blockable hook, reach ≈ 312 px; clean hit pulls in over 10 f |
| Rooftop Extraction | Up + Special (ground / air) | 12 | 55 | zip upward with a rising knee; once per airtime, never restores the double jump |
| Smoke and Shadow | Down + Special | 16 | — | smoke field 150 f, r 120; a fresh double-tap inside it once per field = Shadow Dash (29 px/f × 14 f). No teleport, no invulnerability |
| Gotham Airspace | Back + Special | 35 | 200 budget | major operation (below) |

## Support fleet — one MAJOR operation at a time

Orders: **hold Charge (L2 / P), then Special (R1 / L) + direction**, grounded. While Charge is held on the ground,
Up is an order direction, never a jump (command stance). A new order is accepted only when no operation is live or
the live one has reached its exit phase; each type then has its own cooldown. Energy is paid on the gesture's
commit frame (reject before spend). Machines can be destroyed (melee: 60 % of stored damage, min 12; projectiles:
30 per contact) — their death strip plays and remaining payloads are cancelled. Caps: 8 machines, 16 payloads.

| operation | input | cost | cooldown | budget (raw) | machines and schedule |
|---|---|---|---|---|---|
| Gotham Airspace | Back + Special | 35 | 480 f | 200 | disc scanner acquires and brackets the target; two bombardiers orbit and release 10 committed bombs (20 each) |
| Cross-fire Interceptor | Charge + Special | 25 | 360 f | 150 | gunship bursts 4 × 16 from one side, banks over, 4 × 14 from the other; box platform adds 2 bolts × 15 |
| Arsenal Carrier → Ground Barrage | Charge + Forward + Special | 30 | 480 f | 180 | carrier lowers a Lurker tracked cannon (3 shells × 30) and a Defender launcher (2 arcing rounds + 1 gun round × 30) |
| Skyhook | Charge + Up + Special | 25 | 420 f | 140 | rotorcraft hook check (blockable, 50) → lift → drop → landing slam 90 |
| Capsule Cover + Escort Pass | Charge + Down + Special | 18 | 300 f | 80 | cover smoke at Batman; Hunter walker (4 × 10, two fired behind it) + Steel Wing strafe (4 × 10) |
| Wayne Automaton | Charge + Back + Special | 25 | 420 f | 150 | ground robot: arm-blaster beams 40 / 40, shoulder cannon 70; ATTACK4 = brace stride |

Assist hits use special-tier chip (12 %), 5 f hitstop, and never hit a target already juggled 6 times.

## Ultimate — KNIGHTFALL: ORBITAL IMPACT (Ultimate / R2 / U, grounded, 100 energy)

Committed grapnel opener (14/5/44, blockable). Clean hit → the fixed-wing aircraft strafes in, tethers the captive,
climbs through the sky into space (reusing Superman's World-of-Cardboard moon backdrop — Superman unchanged),
turns, re-enters at full speed and drives the captive into the stage → Krybot explosion strip ×3.2 → recovery.
420 raw (opener 40 + ascent 40 + reentry 90 + slam 200 + blast 50). Whiff / block: no cinematic, 44 f recovery,
energy spent. The live fleet exits and pending payloads clear on confirm. Full timeline: ULTIMATE_TIMELINE.md.

## Cancel routes (clean hits only)

- Light → Light → Light (CHAIN); Light / Cross / Low → Heavy family or launcher.
- Any normal, launcher, air normal or counter hit → gadget; Rising Knee / heavies / launcher / sweep / counter / rope
  kick → support order; Rising Knee / heavy / spin / sweep / rope kick → KNIGHTFALL (needs a full bar).
- Launcher → (jump after the hit freeze) → double jump → Air Strike.
