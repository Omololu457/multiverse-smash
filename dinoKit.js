// dinoKit.js — Move List (kits.js) for the Dino Thunder Rangers (dinothunder). RAW authored values from dinoData.js /
// dinothunder.js / dinoSupers.js (the roster parity ×1.6 and the combo scaling apply on top in a match).
import { NS_RED_KIT } from './nsKit.js'

export const DINO_KIT = {
  type: 'Team / Form Swapper', energy: 'Gem energy (shared)', difficulty: '5', name: 'Dino Thunder Rangers',
  summary: 'Conner (Red, Tyranno Gem), Ethan (Blue, Tricera Gem), Kira (Yellow, Ptera Gem) and Trent (White, Drago Gem) as ONE fighter: one health pool (1248), gem energy and meter shared. HOLD P and press J / K / L / O to call in Red / Blue / Yellow / White, or DOUBLE-TAP P for the next Ranger. While P is held J / K / L / O never attack.',
  passive: { name: 'Gem energy · High Score (Ethan) · Ptera Glide (Kira) · Corruption (Trent)', effect: 'Gem energy 0–100 (starts 50, +6/s, +4 per hit). Ethan: +2% damage per consecutive hit (max +20%). Kira: double jump + hold Jump to glide (1.2 s per airtime). Trent: Corruption fills +20 per Camouflage / Drago Clone and +1 per 10 damage taken; at 100 he becomes the EVIL WHITE RANGER for 6 s (+25% damage, +10% speed, cannot swap out, −2% max HP per second), then it resets. It drains 5/s while Trent is out.' },
  basics: NS_RED_KIT.basics,
  specials: [
    { name: 'CALL A RANGER', input: 'hold P + J / K / L / O  (P2: hold 7 + 1 / 2 / 4 / 6 · pad: hold L2 + □ / △ / R1 / L1)', cost: 15, desc: 'Red / Blue / Yellow / White directly. 14 frames (invulnerable frames 4–9), 90-frame cooldown. Momentum carries. Not in hitstun / blockstun / a special; normals only in recovery.' },
    { name: 'NEXT RANGER', input: 'double-tap P  (P2: 7 7 · pad: L2 L2)', cost: 15, desc: 'Red → Blue → Yellow → White → Red.' },
    { name: 'Swap-in strike', input: '(automatic)', cost: 0, desc: '30 blunt. If it connects, the next special within 3 s deals +10%. A swap ends Super Speed, Tricera Skin and Camouflage and shatters the Drago Clone.' },
    { name: 'SUPER DINO MODE', input: '↓↓ + Special + Heavy (Red / Blue / Yellow)', cost: '1 bar', desc: '8 s: +20% damage, heavy attacks get 1-hit armor, gem regen ×2. Carries between Red / Blue / Yellow; ends when Trent comes in.' },
    { name: 'Dino Dash', input: '→→ / ←←', cost: 10, desc: 'Red 45% of the screen, projectile-intangible frames 2–5 (chains ×3 only in Super Speed). Blue 35%, 1-hit armor frames 1–4. Yellow works in the air, 2 per airtime. Trent: Afterimage Dash through the foe — attack during it = DRAGO CUT 50.' },
    { name: 'Red — SUPER SPEED', input: '↓↓ + Special', cost: 30, desc: '3 s: speed ×1.6, recoveries −25%, Dino Dash chains up to 3.' },
    { name: 'Red — TYRANNO SLAM', input: '↓↘→ + Heavy', cost: 0, desc: 'Staff overhead into the ground: 88, OTG, ground bounce.' },
    { name: 'Red — PENALTY STRIKE', input: '→ + Special', cost: 0, desc: 'A travelling bicycle kick, 40% of the screen, 70. In Super Speed it goes through (cross-up).' },
    { name: 'Blue — TRICERA SKIN', input: '↓↓ + Special', cost: 30, desc: '2 s: no hitstun, takes 40% damage. Throws still work.' },
    { name: 'Blue — SHIELD RAM', input: '→ + Heavy  (or Special)', cost: 0, desc: '80, wall bounce; the shield absorbs one projectile on frames 1–10.' },
    { name: 'Blue — SHIELD QUAKE', input: '↓↘→ + Heavy', cost: 0, desc: '76, OTG.' },
    { name: 'Yellow — PTERA SCREAM', input: '↓↘→ + Special  (or Special; air: angled down)', cost: 20, desc: '50, 30-frame stun, pushback, destroys non-super projectiles. ENCORE: a second scream within 3 s stuns 50 frames (once per combo).' },
    { name: 'Yellow — DIVE GRIPS', input: 'air ↓ + Special', cost: 0, desc: 'Diving Ptera Grips strike, 70.' },
    { name: 'White — CAMOUFLAGE', input: '↓↓ + Special', cost: 30, desc: '2.5 s nearly invisible (shimmer + footstep dust). The first attack deals +25% and ends it; being hit ends it. +20 Corruption.' },
    { name: 'White — DRAGO CLONE', input: '↓↓ + P', cost: 50, desc: 'The evil White Ranger clone appears 30% of the screen away and echoes Trent\'s attacks 12 frames late for 6 s (50% damage, cannot KO). Struck, it hits back once (50) and shatters. +20 Corruption.' },
  ],
  mobility: NS_RED_KIT.mobility,
  ultimate: { name: 'RAPTOR RIDER STAMPEDE · TRICERA ZORD RAM · PTERA ZORD STRIKE · DRAGO SWORD STORM (1 bar) · Z-REX BLASTER (full meter)', input: '↓↘→↓↘→ + Special (or Ultimate with 1 bar) · Ultimate on a full meter', cost: 50,
    desc: 'Red: the Raptor Rider charges through, 4 hits, 260. Blue: the Tricera Zord head rams the foe into the wall, 280. Yellow: the Ptera Zord head swoops the top half then dives, 270. White: six afterimage slashes, 280. TEAM — Z-REX BLASTER (cinematic): the camera closes in on the Ranger who called it, the other three leap in one by one, 3 · 2 · 1, BOOM — the braided red / blue / yellow beam crosses the stage, 6 × 40, and detonates on the foe for 160: 400. The foe is frozen until the beam (guarding → 30% chip; out of the beam\'s row → it misses).' },
  combos: [
    { name: 'Speed cash-out', sequence: 'Red: ↓↓ + Special (Super Speed) → Light → Light → Heavy → → + Special', desc: 'Penalty Strike crosses up at the end.' },
    { name: 'Tag to the wall', sequence: 'Red: Light → Heavy → hold P + K → Blue: → + Heavy', desc: 'Swap-in strike buffs the Shield Ram (+10%), wall bounce.' },
    { name: 'Scream encore', sequence: 'Yellow: ↓↘→ + Special → dash → ↓↘→ + Special', desc: 'The second scream stuns 50 frames.' },
    { name: 'Z-Rex', sequence: 'Light → Heavy → Ultimate (full meter)', desc: '400 off a confirmed string.' },
  ],
}
