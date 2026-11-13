# Green Arrow — Balance Notes

**Archetype:** Tech Zoner / Summoner. **HP 920** (low), **walk ≈4.8** (speed 79), **weight 0.95**,
**Tech 100** (+3/s passive, +4/arrow-hit, +2/drone-hit, hit-income capped +12/s). Difficulty 4.

## Matchup reads
- **vs Superman (6-4 Superman):** freeze breath and heat vision delete drones fast — a planted
  Bulwark or hovering Overwatch evaporates to a beam. GA must protect them with **Aegis** (absorbs
  the beam) and zone with charged plain shots + fire arrows. Superman's flight closes the gap GA
  needs; favoured but not unwinnable if GA keeps the shield up and the Skyhook escape charged.
- **vs Homelander (even):** laser sweeps clip drones, but **Aegis absorbs the laser** outright and
  Overwatch-tagging + homing arrows punish his flight paths. Roughly even — a shield-vs-laser race.
- **vs Spider-Man (even):** Spidey's mobility dodges a stationary **Bulwark**, but **Overwatch**
  tagging + slightly-homing arrows track his swing arcs, and Kestrel strafes cover the air he lives
  in. Even — GA wins the ground, Spidey wins the scramble.
- **vs Ghostface / Vilgax / any summoner (GA favoured):** the **EMP arrow** disables their
  summons/drones/turrets/clones for 3 s (and drains 20 energy from Ben 10 / Vilgax / tech-tagged
  foes). GA's answer to mirror-summoners — shut off their board, then out-zone.

## Why he isn't broken
- **2-drone cap** (3 only during the Super) — he can't flood the screen.
- **Every drone is killable** — they have HP/hurtboxes and die to any attack or projectile.
- **A destroyed drone means a cooldown** (5–6 s) before that type can redeploy — dead drones cost
  tempo, shown greyed on the HUD pips.
- **Tech hit-income is capped at +12/s** — drones can't self-fund an infinite economy.
- **Fragile at 920 HP when rushed** — below **15 Tech** he can't afford a single drone and is a pure
  920-HP archer. Rushdown that gets inside the quiver and ignores the drones beats him. The Skyhook
  **Emergency Extraction** (↑+Special on wake-up, 12 s cd) and the **somersault** (double-tap Back,
  10 invuln) are his only panic buttons, and both are committal.

## Tuning numbers changed from the brief
- **Stats mapped to the engine schema:** `speed 79` yields walk ≈4.8 (physics maps 78→4.5 … 98→9.5);
  `jumpPower 27` (the brief's "jumpForce 11.5" is a different unit); attack 82 / defense 74 (brief
  left these open — tuned fragile-zoner).
- **Charge path:** plain shot charges by **holding Light** (release ≥40 f → 70 + pierce); the dedicated
  Charge button is free for other uses.
- **Inputs:** drones on **Special + held direction** (↑Skyhook/→Kestrel/←Aegis/↓Bulwark/neutral
  Overwatch), arrows on **motion + attack button** (qcf/qcb/↓↓ + L/H/Up), Super on ↓↘→↓↘→+Special
  (also available on the Ultimate button). Kestrel **FIRE2** triggers when the Charge button is held
  as it is summoned (the brief's "hold Special" mapped to the hold modifier the engine exposes).
- **Drone render scales** ≈ uniform 1.9–2.2 (matching GA's pixel density); Skyhook/Payload larger
  per their 60–70%-of-GA-height target.

---

## PASS 2 balance notes (modes + new arrows)

- **Kamikazes are consumable and counterable.** A Kamikaze costs a drone slot + 35 Tech, goes on a
  5.5s cooldown after it blows, and is **hittable in flight** — shoot it down before impact and it
  deals **zero** damage (plays DEATH only). The 2-drone cap still holds, so you can't spam them.
- **Net arrow hard-counters flight, but it's committal.** Net (20 Tech) force-grounds Superman /
  Homelander for 1.2s, but it has a **6s cooldown** and a slow arrow with a long startup — a flyer who
  respects it can bait it and punish the recovery. It is a read, not a free anti-air.
- **Guardian blocks only ONE melee hit per summon.** After the single intercept (Oliver negated +
  pushed, drone −40 HP) the Aegis is spent as a melee shield — the next hit lands. Rushdown that
  commits two hits beats it.
- **Strike variants cost +5 Tech**, so the aggressive drone options tax the meter that also funds
  Oliver's arrows — he can't both bomb and zone freely.
- **Swarm** (40 Tech) is a one-slot panic/shield tool: 4 scouts at 20 HP each, popped by any poke.
- Net-into-Skyhook and Kamikaze-on-netted (+25%) reward landing the Net first — but Net's cooldown
  keeps that loop from repeating every exchange.

---

## PASS 3 balance notes (munitions, super rework, orders, sound)

- **Bombs are a shared, counterable resource.** All of Oliver's explosives now run through the generic
  `munitions.js` module: a hard cap of **16 live munitions** + **2 napalm fire-patches** on screen, so
  neither he nor his drones can bury the field. Every bomb has **HP and can be shot down**, and the
  **chain reaction is depth-capped at 3 at 70% damage** — big clusters are flashy but can't cascade into
  an infinite AoE.
- **Blast damage is halved on block** and the owner is never hurt by their own blast (blast-hop pushes
  Oliver instead), so bombing is pressure, not a coin-flip trade.
- **ARROWSTORM PROTOCOL super ≈ 386 damage** vs a stationary dummy (hard cap **≤ 420**). It is a
  3-wave zoning finale — Carpet line (14 dumb bombs) → Hunters (4 guided) → Scatter (3 clusters) →
  "LAST LIGHT" (one big bomb on the tagged foe) — so a mobile opponent who keeps moving eats far less
  than the full value; the 386 is the *worst case*, not the average.
- **Drone orders are a commitment, not a buff.** FOCUS/GUARD/SWEEP (↓↓+Light to cycle): GUARD holds the
  drones home and gives up offence; SWEEP speeds up counter-summon intercepts but spends the drones'
  attention. There's no order that is strictly best — each trades something.
- **Counter-summon only stops SMALL projectiles** within 25% of Oliver and **never beams/supers**, on a
  45f cooldown (30f under SWEEP). It shaves chip, it does not wall out a zoner.
- **Bomb audio is deterministic** (seed from match state + position, no RNG) — whistle/boom/reticle/
  napalm/plane — so replays and LAN stay in sync and the sound never drives the sim.
