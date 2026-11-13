# Green Arrow — Drone Modes (PASS 2 Phase 2)

Every drone has **two modes**. **Input:** `Special + direction` = **Protector** (default);
**Heavy held** + `Special + direction` = **Strike** (**+5 Tech**). Extra deploys: `↑↑ + Special` =
Payload **Carpet Run**; `↓↓ + Special` = **Swarm**. Mode is sim state (`d.mode` in GAME_STATE). The
2-drone cap (3 during the Super), per-type cooldown-on-death, Tech income cap (+12/s) and HUD pips all
still apply. Strike drones are **hittable before impact** — shoot one down in flight and it plays
**DEATH only, no damage**.

| Drone (dir) | Mode | Tech | HP | Damage | Cooldown-on-death | Counterplay |
|---|---|---|---|---|---|---|
| **Overwatch** (neutral) | Protector **Sentinel** | 20 | 70 | 0 (tag only) | 5s | Kill it to lose the tag + auto-guard; auto-guard is once / 6s |
| | Strike **Stun Drone** | 25 | 70 | 30 + 0.5s shock-stun, then explodes | 5s | Shoot it down before it rams |
| **Bulwark** (↓) | Protector **Bodyguard** | 25 | 130 | 18 / shot (point-blank, within 20%) | 6s | Out-range it; it's a slow wall |
| | Strike **Mine** | 30 | 130 | 70 launcher (proximity ≤12%) | 6s | Visible; walk around / detonate from range |
| **Aegis** (←) | Protector **Guardian** | 20 | 150 | 0 (absorbs projectiles; intercepts **one** melee, −40 HP) | 5s | One melee intercept per summon — the 2nd hit lands |
| | Strike **Shield Bash** | 25 | 150→½ | 40 + knockback (survives, reverts to Guardian) | 5s | Block/space the bash |
| **Kestrel** (→) | Protector **Escort** | 30 | 90 | 5×8 FIRE1 burst when Oliver is in trouble (90f cd) | 5.5s | Pressure Oliver between bursts |
| | Strike **Kamikaze** | 35 | 90 | 90 (12% radius; **+25% on a netted foe**); ground-impact on a miss | 5.5s | **Shoot it down in flight → no damage, DEATH only** |
| **Skyhook** (↑) | Protector **Rescue** | 25 | 110 | 0 (catches a launched/comboed Oliver, 20 invuln, free air recovery) | 5.5s | Bait it out; one catch then consumed |
| | Strike **Tow** | 30 | 110 | 90 hook-grab (lift → carry → drop) | 5.5s | Hit Oliver during the setup; dodge the seek |
| **Payload** (↑↑) | **Carpet Run** | 30 | — | 3 bombs × 35 (one pass, 85% height) | — | Dodge the telegraphed line; counts as a slot |
| **Swarm** (↓↓) | Protector (bubble) | 40 | 80 (4×20) | 0 (orbit shield, each scout absorbs one hit, 5s) | 6s | Pop the scouts with pokes/projectiles |
| | Strike (rammers) | 45 | 80 (4×20) | 20 × 4 (each rams + explodes) | 6s | Shoot the scouts down mid-rush |

**Notes / judgment calls**
- **Strike modifier = Heavy held** at the Special press (the brief's "Heavy-button version"), since drones own the Special+direction space.
- **Swarm** is one logical slot rendered as up-to-4 mini-Overwatch saucers on a deterministic orbit (derived-copy sprites at 0.5×); each 20 HP lost = one scout.
- **Mine** lobs ~11% of screen-width in front of Oliver (toward the foe) so it lands somewhere useful, then arms.
- **Shield Bash** halves the drone's HP and reverts it to **Guardian** (so it survives and keeps protecting).
- Explosions / rings / shield-flashes are **render-only** (a `visualOnly` explosion projectile reusing the GA explosion frames, plus canvas rings) — see SPRITE_LEDGER.md.
- CPU opponents already attack drones ~25% of the time (hash-decided, prioritising Bulwark/Kestrel) from pass 1.
