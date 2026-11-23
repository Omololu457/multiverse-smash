// omnimanViltrumKit.js — Omni-Man (Viltrumite) Move List (kits.js entry). Numbers are the authored values in
// omnimanViltrumData.js, checked live by harness/omniman_viltrum_moves.test.mjs / omniman_viltrum_flight.test.mjs.
// Combos: docs/msv1/omniman/COMBOS.md. Balance: docs/msv1/omniman/BALANCE_NOTES.md.
export const OMNIMAN_VILTRUM_KIT = { type: 'Viltrumite / Momentum Brawler', energy: 'Energy (200)', difficulty: '5',
  summary: 'Nolan Grayson, Viltrumite, the world\'s strongest hero, until he wasn\'t. The fastest flier in the game and the hardest to ' +
    'control: he coasts, he can\'t turn on a dime, and above 40% speed he can\'t block. Speed is damage: his punches hit up to 60% ' +
    'harder at top speed. Guard is his brake.',
  passive: { name: 'Speed is damage', effect: 'Normals deal +0% … +60% damage and knockback with his flight speed. Crossing 90% speed ' +
    'cracks a SONIC BOOM (20, pushes). Hitting a wall at ≥ 70% = a 28-frame crash and 25 self-damage; hitting the floor at ≥ 70% = ' +
    'a HARD LANDING (50 shockwave, 14 frames).' },
  basics: [
    { name: 'Take off / come down', input: 'Tap Charge', desc: 'Unlimited flight. Top speed 57.2 (1.3 × the fastest flier), 0.6 s to reverse, ±25° per 10 frames at top speed. Hold Charge on the ground = meter.' },
    { name: 'BRAKE', input: 'Guard while flying', desc: 'Kills 80% of his speed in 10 frames (cape-flip). Above 40% speed Guard never blocks.' },
    { name: 'Jab', input: 'Light', desc: '38 blunt. 5f. Chains into Straight / Haymaker on contact.' },
    { name: 'Straight', input: 'Light on Jab / Low contact', desc: '60 blunt. 8f. Chains into Haymaker.' },
    { name: 'Haymaker', input: 'Heavy', desc: '96 blunt. 14f. Wall bounce. Chained, he steps in.' },
    { name: 'Low punch', input: 'Down + Light / Heavy', desc: '46 blunt, hits low. 7f.' },
    { name: 'Kick', input: 'Up-Attack (or Up + Heavy)', desc: '70 blunt. 9f.' },
    { name: 'Flight punch', input: 'Any attack in the air / in flight', desc: '64 blunt. 6f. ×1.6 at top speed.' },
    { name: 'Grab', input: 'Grab', desc: 'Standard throw.' },
  ],
  specials: [
    { name: 'Viltrumite Blitz', input: '↓↘→ + Special', cost: 0, desc: 'Rush at top speed: tap = 50% of the screen, hold = 80%. 90 blunt. Whiff: skids and is open (24f). Into a wall at speed: crash.' },
    { name: 'Sky Hook', input: '→↓↘ + Special', cost: 0, desc: '80 blunt, launches; he goes straight into flight.' },
    { name: 'Meteor Drop', input: 'Air ↓ + Special (↓→ = 45°)', cost: 0, desc: 'Dives at top speed. Landing shockwave 70, hits OTG. Nothing hit: 30-frame recovery.' },
    { name: 'Face in the Dirt', input: '↓↙← + Special', cost: 0, desc: 'Grab, drag 40% of the screen along the floor, throw into the wall: 110, wall bounce.' },
    { name: 'Unimpressed', input: '↓↓ + Heavy', cost: 0, desc: '24-frame counter (melee and projectiles). The only tell is the glint in his eye. Backhand 80, wall bounce. 12 s cooldown.' },
    { name: 'Viltrum Decree', input: '↓↓ + Light', cost: 0, desc: '60-frame taunt. Not hit → +25% meter.' },
    { name: 'THINK!', input: '↓↓ + Special (or ↓↘→↓↘→ + Special)', cost: '1 bar (100)', desc: 'Blitz-grab (≤ 60% of the screen), drag the whole stage at top speed, slam into the far wall: 300. "THINK!" — "Think, Mark! THINK!" vs Invincible.' },
  ],
  ultimate: { name: 'Escape Velocity', input: 'Ultimate', cost: '100 (20 s cooldown)', desc: 'Grab (0.25 s; a miss overshoots, 40f open; Infinity makes it whiff) → straight up through the sky (10 × 8) → orbit ("Look what they need to mimic a fraction of our power.") → re-entry → IMPACT 340: 420 total, a crater, hard knockdown.' },
  combos: [
    { name: 'Bread and butter', sequence: 'Light → Light → Heavy', desc: 'Jab, Straight, Haymaker into a wall bounce (186)' },
    { name: 'Into the rush', sequence: 'Light → Light → ↓↘→ + Special', desc: 'Jab, Straight, Blitz (180)' },
    { name: 'THINK!', sequence: '↓ + Light → Light → ↓↓ + Special', desc: 'Low, Straight, THINK! — 1 bar (406)' },
    { name: 'Look what they need', sequence: 'Heavy (near a wall) → Ultimate', desc: 'Haymaker wall bounce into Escape Velocity (516)' },
    { name: 'Sky to dirt', sequence: '→↓↘ + Special → Light (in flight) → ↓ + Special', desc: 'Sky Hook, flight punch, Meteor Drop OTG (234)' },
  ] }
