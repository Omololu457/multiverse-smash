# Superman — Balance & Design Notes

Rebuild on branch `feat/superman`. rosterKey `superman`, universe DC. This doc covers
the matchup philosophy (brief Phase 9) plus the concrete translations and deviations
the engine forced vs the generic brief.

## Stats (brief Phase 2 → engine schema)

The brief's stats are written for a generic engine; this engine uses a different stat
record. Translation:

| Brief | Engine | Value | Note |
|-------|--------|-------|------|
| health 1150 | `stats.maxHealth` | 1150 | tougher than Homelander (1050), far below the old 1450 apex |
| maxEnergy 100 | `stats.maxEnergy` | 100 | "Solar Energy" (`traits.energyType:"solar_energy"` → ui.js label) |
| walkSpeed 5.2 / runSpeed 8.0 | `stats.speed` | 94 | engine uses a single 0–100 `speed` stat (no separate walk/run px); 94 = among the fastest, just under Homelander's 99 |
| jumpForce 12 | `stats.jumpPower` | 30 | engine jump units (~30 scale), not the brief's raw 12 |
| weight 1.25 | — | — | no engine weight field; omitted |
| — | attack / defense | 95 / 92 | strong bruiser |

**Energy / regen deviation (intentional):** the brief asks for 0.8 Solar/sec passive.
At 60fps that is 0.013/frame → the 100-cost ultimate would take ~125 s to build, longer
than a match. Superman therefore keeps the engine's default passive regen (~0.06/frame,
3.6/sec) so the ult is reachable and the game stays fun. The brief's "energy management
matters" intent is preserved by per-special costs + the post-ult energy lock. Flight is
a **separate** resource inside flight.js (`energyMax 300` = 5 s), not the Solar pool.

## Flight (flight.js `FLIGHT_PROFILES.superman`)

Per brief Phase 3: `accel 0.60`, `maxH 7.0`, `maxV 6.0`, `drag 0.84`, `maxAirDash 3`,
`energyMax 300`/`drainPerFrame 1` (= 5.0 s), `groundedLock 72` (= 1.2 s after a hard
hit). Double-tap / charge-tap to take off, directional steer, air-dash on dash input.

> The brief says "slightly more agile + longer-lasting than Homelander", but Homelander
> was retuned to GODSPEED numbers (maxH 22) *after* the Superman template was written, so
> Superman's explicit cruise values are actually lower than Homelander's. Superman is the
> more *precise/floatier* flyer with more dashes + a longer budget; Homelander is faster.

## Input scheme (held-direction Special + the brief's motions)

This engine routes Superman's specials by held direction on the Special button
(`_specialHeldDir`), not by QCF-style motions. The brief's motion inputs are mapped to
the nearest reliable slot:

| Brief move | Brief input | Engine input | Status |
|------------|-------------|--------------|--------|
| Heat Vision | ↓↘→ + Attack | Neutral + Special | **existing** eye-beam projectile (Solar-Flare-enhanced) |
| Super Speed Rush | →→ + Attack | Fwd + Heavy (rekka) | **existing** 3-stage flying-punch flurry → launcher (combo-standard conformer) |
| Freeze Breath | ↓↓ + Attack | **Back/Up + Special** | **NEW** — ↓↓ collides with the Down mode-toggle / jump, so Back is the clean slot |
| Solar Flare | ↓↘→↗ + Special | Down + Special (grounded) | **existing** gold mode toggle (+25% dmg, enhances Heat Vision) — not yet the 360° one-shot burst |
| Ground Pound | ↓↓ + Special (air) | **Down + Special (airborne)** | **shipped (4b)** — dive-slam, direct 110 / shockwave 40+trip |
| Kryptonian Grab | → + Grab (close) | **Grab (close, flight-ready)** | **shipped (4b)** — fly-up-slam 130, untechable; falls back to normal grab w/o energy |
| World of Cardboard | full meter | Ultimate button | **shipped** — scripted multi-hit: dash first strike → barrage → uppercut → fly up → heat vision → orbital slam. ~380 guaranteed, 4s energy lock after |

Super Flying Punch (Forward + Special) is an extra committed dash-strike kept from the
existing kit. The old Kryptonian Overload mode (Back + Special) was **dropped** per the
rebuild brief; Back now fires Freeze Breath.

## Freeze Breath + FROZEN (shipped, Phase 4a)

Medium-range hitscan cone (reach ~520 px, short active window so a transient i-frame
can't nullify it). On a clean hit: 30 chip + **FROZEN 1.2 s** — action-locked (hitstun
top-up), takes **+15 %** from follow-ups (combat.js dmg-taken amp, gated on `_supFrozen`),
icy frost overlay. **8-second cooldown** so it cannot be looped. All freeze state lives
in GAME_STATE (`_supFrozen`, `_supFrozenMax`, `_supFreezeCd`); the overlay is render-only
and driven purely by the sim countdown (no render field stashed on the fighter).

> Not yet implemented from the brief: the 0.3 s mash-break-out (the lock is currently a
> fixed 1.2 s; the hitstun system already prevents acting).

## Matchups (brief Phase 9)

- **vs Homelander** (~5.5–4.5 Superman): near-mirror of flying bruisers. Superman is
  faster on the ground and brings **Freeze Breath** utility (a guaranteed 1.2 s + 15 %
  combo window); Homelander owns the air (GODSPEED flight) and sonic screen-control.
  Superman wins the neutral freeze-into-punish; Homelander wins the air-to-air race.
- **vs Spider-Man**: Superman's slow Heavy / Flying Punch get dodged by web mobility,
  and Spider-Man zones with webs at range — but **one Freeze or one grab-punish = huge**.
  Superman wins up close and off a freeze read; Spider-Man wins the spacing war.
- **vs Goku**: both have power systems. UI/transformed Goku can match Superman's speed on
  a **timer**; Superman's Solar/flight resources also deplete. Volatile and swingy —
  whoever lands the first big resource-backed punish (freeze combo vs transformed rush)
  snowballs. Exciting by design.
- **General**: Superman is strong but not broken because resources gate him — specials
  cost Solar Energy, Freeze Breath has an 8 s cooldown, flight is a 5 s budget with a
  1.2 s grounded-lock after a hard hit, and the ult empties the bar. Spam a resource and
  you are locked out of it for a window.

## Deviations from the brief (summary)

1. Supplied sheet had **26 frames / 10 rows**, not 29/11 — the "beam wind-up" row is
   absent; beam/cape-spread moments are substituted + code-drawn FX (see SPRITE_LEDGER).
2. Passive Solar regen kept at the engine default (not 0.8/sec) so the ult is buildable.
3. Specials use **held-direction** inputs, not QCF motions (engine design).
4. **Shipped new:** Freeze Breath + FROZEN (4a); Ground Pound + Kryptonian Grab (4b);
   defensive tools — Super Armor on Heavy, Flight Escape, X-Ray Vision (Phase 6);
   **World of Cardboard** scripted ultimate. **Reused (functional) existing kit:** Heat
   Vision, Super Speed Rush (rekka), Solar Flare (mode). **Not yet wired:** synthesized
   SFX, Freeze mash-break. **Sprites:** all animations re-posed to match their move
   (body-anchored).

## Defensive tools (shipped, Phase 6)

- **Super Armor on Heavy** — while committing his Heavy, Superman shrugs ONE hit (melee
  or projectile) without flinching; he still takes the damage. 8s cooldown.
  Launchers/spikes/ultimates pierce it.
- **Flight Escape** — while being combo'd (in hitstun), a fresh Special press + 25 Solar
  Energy bursts him into flight with a 12-frame i-frame window. 10s cooldown.
- **X-Ray Vision (passive)** — +8% damage (melee + projectiles) while the opponent is
  below 25% health; a subtle blue scan-tint marks the opponent (render-only).
