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
