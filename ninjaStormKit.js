// ninjaStormKit.js — NINJA STORM RANGERS Move List (kits.js entry). ONE fighter, two stances; the numbers are the authored
// raw values from ninjaStormData.js (roster parity ×1.6 = S.P.D. Red's tier, applied in play). Names: Red / Yellow.
// Combos + measured damage: docs/ninja_storm_rangers/COMBOS.md.
export const NINJA_STORM_KIT = { type: 'Teleport Rushdown / Mixup Ninja, dual-stance', energy: 'Focus', difficulty: '5',
  summary: 'Shane Clarke (Red, Air) and Dustin Brooks (Yellow, Earth) as ONE fighter: one health bar, one Focus bar, two Vanish charges. ' +
    'The match opens in Red stance; ↓↓ then Light tags Shane in, ↓↓ then Heavy tags Dustin in — instant, free, 30-frame lockout. ' +
    'Same speed both ways; the stance changes the moveset names / art, the timed Mode and the weight (0.8 Red, 0.85 Yellow).',
  passive: { name: 'Focus + Ninja Vanish + Stance Dial', effect: 'FOCUS 0–100, shared by both stances: +4 per hit, +2 per blocked hit, +1 every 40 frames, +5 per Vanish dodge. ' +
    'NINJA VANISH (S.P.D. Red\'s Blink): double-tap ← / → (air too), 22% of the screen, 2 charges (90 f refill each), 3 / 5 invulnerable / 3 frames, passes through the foe (they face the wrong way 8 f); ' +
    'dodging through a live attack = +5 Focus and +15% on your next attack within 20 f. STANCE SWAP: ↓↓ then Light (Red) / Heavy (Yellow) — refused in hitstun, mid-special and during the lockout; it pops your Shadow Clone and ends the active Mode.' },
  basics: [
    { name: 'Jab / Tackle', input: 'Light', desc: '35, 5f, +1 on block (blunt).' },
    { name: 'Straight / Shoulder Check', input: 'Light → Light (or Forward + Light)', desc: '55, 8f, −3 on block.' },
    { name: 'Kick / Stomp Kick', input: 'Heavy (or Light, Light, Light)', desc: '60, 9f, −3 on block; knocks down as a string ender. Quake Mode: ×1.6 knockback + knockdown.' },
    { name: 'Rising Kick / Rising Slam', input: 'Up + Heavy / Up-Attack', desc: '75, 9f anti-air, launches.' },
    { name: 'Low Kick / Low Sweep', input: 'Down + Light (or Down + Heavy)', desc: '40, 7f, hits LOW.' },
    { name: 'Air Kick / Air Stomp', input: 'Air Light', desc: '60, 4f.' },
    { name: 'Dive Kick / Rock Drop', input: 'Air Heavy', desc: '60, 4f, downward.' },
    { name: 'Backstep', input: 'Back + Heavy', desc: 'Acrobatic hop back, 6 invulnerable frames, 300 f cooldown (shared by both stances).' },
    { name: 'Grab / Throw', input: 'Grab', desc: 'Shared grab and throw.' },
  ],
  specials: [
    { name: 'Crescent Blade / Earth Blade', input: '↓↘→ + Special', cost: 12, desc: '3 sword hits × 20, the third knocks down.' },
    { name: 'Crescent Wave / Boulder Wave', input: '↓↙← + Special (air too)', cost: 14, desc: 'The crescent thrown full screen, 45; max 2 on screen.' },
    { name: 'Shuriken Throw / Sand Spin Throw', input: 'Special (air too)', cost: 8, desc: '25, fast; max 3 on screen.' },
    { name: 'Hawk Blaster / Lion Hammer Lock-On', input: 'Down + Special, HOLD 10 f', cost: 18, desc: 'Reticle on the foe, the shot lands there 12 f later: 65. Red = beam, Yellow = ground-slam shockwave (launches). Release early = no lock, no cost.' },
    { name: 'Shadow Clone', input: 'Back + Special (ground or air; Up + Special in the air)', cost: 20, desc: 'A ghost of the active stance (0.6 alpha, cool tint), 4 s. Every clean hit you land is echoed from the clone 12 f later at 50% (max 3 per combo).' },
    { name: 'Kawarimi', input: 'Block + Special (needs a live clone)', cost: 10, desc: 'Swap places with the clone instantly, 6 invulnerable frames, works out of hit / block stun; 90 f cooldown.' },
    { name: 'LIGHTNING MODE (Red) / QUAKE MODE (Yellow)', input: 'Light + Heavy + Special', cost: 30, desc: '4 s. Lightning: +15% damage, +1 Focus per passive tick, Vanish startup −1 f. Quake: −10% damage taken, heavy ×1.6 knockback + knockdown. One shared 10 s cooldown.' },
  ],
  mobility: { name: 'Ninja Vanish', input: 'Double-tap ← / →', cost: 0, desc: '22% of the screen, 2 charges; cancels any connected normal / special.' },
  ultimate: { name: 'THUNDER FIST FINISH (Red) · LION ZORD SLAM (Yellow)', input: 'Ultimate (or ↓↘→↓↘→ + Special)', cost: 100,
    desc: 'All of the Focus: rush in → giant-fist burst, 260 raw. With a live Shadow Clone it becomes a TWIN TECHNIQUE: two impacts of 130 from both sides (cannot be blocked). 3 s Focus lockout after.' },
  combos: [   // measured on the real loop by harness/msv2_combos.mjs (docs/ninja_storm_rangers/COMBOS.md)
    { name: 'Red string', sequence: 'Light → Light → Heavy', desc: 'Jab, Straight, Kick (knockdown).' },
    { name: 'Red launcher', sequence: 'Light → Up + Heavy', desc: 'Into the Rising Kick launch.' },
    { name: 'Yellow string', sequence: 'Light → Down + Light → Heavy', desc: 'Tackle, Low Sweep, Stomp Kick.' },
    { name: 'Stance tag', sequence: 'Red Up + Heavy (launch) → ↓↓ + Heavy → jump → Air Light', desc: 'Shane launches, Dustin finishes in the air.' },
  ] }
