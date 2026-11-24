// megazordKit.js — MSV1-MEGAZORD Move List rows: the "THUNDER MEGAZORD (U + L)" section of the Mighty Morphin Rangers' kit
// (spdSquadKit.js mmprSquadKit). No imports (kits.js loads it). Numbers mirror megazord.js MZ / MZ_MOVES.
export const MEGAZORD_KIT_ROWS = [
  { name: 'THUNDER MEGAZORD (U + L)', input: 'U + L together (full meter) · once per round', cost: 100, section: 'THUNDER MEGAZORD (U + L)',
    desc: '"We need Thunder Megazord power, now!" The active Ranger calls the five Thunderzords — Red Dragon, Lion, Unicorn, Griffin, Firebird — and becomes the Thunder Megazord for 12 s: 600 ARMOR takes every hit (the Ranger\'s health is frozen), super armor (only supers / ultimates stagger it), cannot be grabbed, can block. Slow walk, short jump, no dash, no Ranger swaps. Not in hitstun / blockstun or during another super.' },
  { name: 'Megazord — Punch / Kick', input: 'Light · Heavy (↓ = crouching)', cost: 0, desc: 'Punch 60 · Kick 80 · crouch punch 55 · crouch kick = low flame sweep 85 (hits low). Air Light / Heavy 85.' },
  { name: 'Megazord — THUNDER SABER SLASH', input: 'Special', cost: 0, desc: 'Flaming saber arc, 110, 14-frame startup.' },
  { name: 'Megazord — AIR SABER', input: 'Special in the air', cost: 0, desc: 'Downward saber cut, 115.' },
  { name: 'Megazord — RISING SABER', input: '↑ + Special', cost: 0, desc: 'Anti-air launcher, 100.' },
  { name: 'Megazord — THUNDER FIREBALL', input: '↓↘→ + Special', cost: 0, desc: 'Chest fireball, 90, crosses the whole screen.' },
  { name: 'Megazord — SABER LUNGE', input: '→→ + Special', cost: 0, desc: 'Charging thrust, 100, covers half the screen.' },
  { name: 'Megazord — SABER CHARGE', input: '↓↓ + Special', cost: 0, desc: '40-frame charge: anyone who hits it is shocked for 60. Once charged, the next saber attack does +50 %.' },
  { name: 'Megazord — THUNDER SABER FINAL STRIKE', input: 'U + L again', cost: 0, desc: 'The finisher: a towering saber cut across the screen, 250, screen flash — then the Megazord separates.' },
  { name: 'Megazord — separation', input: '—', cost: 0, desc: 'After the finisher, when the 12 s run out, or when the ARMOR breaks (collapse, then the Ranger is open for 30 frames): lightning, and the calling Ranger drops back in with the health they had.' },
]
