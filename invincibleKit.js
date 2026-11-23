// invincibleKit.js — Invincible (Mark Grayson) Move List (kits.js entry). Numbers are the authored values in
// invincibleData.js (HP a clean hit takes off), checked live by harness/invincible.test.mjs. Combos: docs/msv1/invincible/COMBOS.md.
// Balance: docs/msv1/invincible/BALANCE_NOTES.md.
export const INVINCIBLE_KIT = { type: 'Glass Cannon / Rushdown Flier', energy: 'Viltrumite (200 — two bars)', difficulty: '5',
  summary: 'Mark Grayson: the fastest hands, the fastest legs and the most agile flight on the roster — and the lowest health (748). ' +
    'He takes off on a Charge tap, turns on a dime in the air, zips 45% of the screen in 5 frames and hits hardest at full speed. ' +
    'Every mistake costs him; once a round, a knockout does not stick.',
  passive: { name: "Can't Stay Down", effect: 'Once per round, a hit that would KO him leaves him at 1 HP. He goes down, gets back up, ' +
    'and fights on in RESOLVE for 6 s: +20% damage, +10% speed, but he takes +25% damage. "Not yet."' },
  basics: [
    { name: 'Jab', input: 'Light', desc: '42 blunt. 4f.' },
    { name: 'Barrage', input: 'Light again once the Jab has hit (or its active frames are over), keep mashing', desc: 'Up to 6 × 16, one every 4 frames, the flurry walks in with the hits. The last hit launches and knocks down on landing.' },
    { name: 'Straight', input: 'Heavy', desc: '72 blunt. 7f.' },
    { name: 'Uppercut (anti-air launcher)', input: 'Up-Attack (or ↑ + Heavy)', desc: '88 blunt. 8f. Launches.' },
    { name: 'Sweep', input: '↓ + Light', desc: '52, LOW, knocks down. 6f.' },
    { name: 'Spin kick', input: '→ + Heavy', desc: '78 blunt. 9f.' },
    { name: 'Rising kick (anti-air)', input: '↓ + Heavy', desc: '70 blunt. Tall upward box.' },
    { name: 'Flight punch', input: 'Any attack in the air / in flight', desc: '66, +0% standing … +40% at top flight speed. Above 70% top speed he flies THROUGH a foe — but a flight punch aimed at them stops his body just short, lands at full speed, then his momentum carries him past.' },
    { name: 'Grab', input: 'Grab', desc: 'Standard throw, 40.' },
    { name: 'Flight', input: 'Tap Charge', desc: 'Take off / come down. Top speed 51.5 (0.9 × Omni-Man), reached in 0.35 s; stops in 8 frames on release; snaps around in 5. Guard only works below 60% top speed. Taking off from the ground pushes an adjacent foe (15); crossing 90% top speed = SONIC BOOM (20, push).' },
    { name: 'Zip', input: 'Double-tap ← / →', desc: '45% of the screen in 5 frames, projectiles pass through frames 1-4, passes through the foe. Cancelled from a normal on hit it stops right behind them (the cross-up). 2 charges per airtime, 1 on the ground.' },
  ],
  specials: [
    { name: 'Invincible Punch', input: '↓↘→ + Special (or Special)', cost: 0, desc: 'Rushes 60% of the screen in 10 frames into the burst: 110 (× flight speed, up to +40%), WALL BOUNCE. Climbs or dives toward a foe in front, so it catches a launched foe. −16 on whiff.' },
    { name: 'Skyward', input: '→↓↘ + Special', cost: 0, desc: '95, launches; he carries the foe up on his fist and is in flight when it ends.' },
    { name: 'Crash Down', input: 'In the air: ↓ + Special', cost: 0, desc: 'Dives and lands in the takeoff shockwave: 70, hits OTG.' },
    { name: 'No Holding Back', input: '↓↓ + Special', cost: '1 bar (100)', desc: 'The first strike must connect: he zips around the foe striking from six directions, 300 total.' },
  ],
  ultimate: { name: 'Terminal Velocity', input: 'Ultimate', cost: '100 + the 20 s ultimate cooldown',
    desc: 'Leaves through the top of the screen (0.5 s); a star glints and a marker on the floor — visible to both players — follows ← / → for 1 s; ' +
      'then he comes down: 380 direct (±10% of the screen), 120 shockwave (40% of the stage). A whiff leaves him stuck in the crater for 50 frames.' },
  combos: [   // the brief's four, each verified live (harness/invincible.test.mjs --only=combos; docs/msv1/invincible/COMBOS.md)
    { name: 'Rush', sequence: 'Light → Light (mash) → →↓↘ + Special → (flight) → any attack → ↓ + Special', desc: 'Jab, Barrage launch, Skyward, flight punch, Crash Down OTG' },
    { name: 'Through and back', sequence: 'Heavy → (hit) double-tap → → Up-Attack → ↓↘→ + Special → ↓↓ + Special', desc: 'Straight, Zip cross-up, Uppercut, Invincible Punch into the wall bounce, No Holding Back' },
    { name: 'Blow past', sequence: 'Charge → hold → (top speed) any attack → hold ← → any attack → double-tap ← → ↓↘→ + Special', desc: 'Top-speed flight punch, snap turn, flight punch, Zip, Invincible Punch' },
    { name: 'Still standing', sequence: '(Can\'t Stay Down → Resolve) Light → Light (mash) → (knockdown) → Ultimate', desc: 'Resolve Barrage, Terminal Velocity on the downed foe' },
  ] }
