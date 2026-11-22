// gojoShinjukuKit.js — Satoru Gojo (Shinjuku Arc) Move List (kits.js entry). Numbers are the authored values in
// gojoShinjukuData.js, checked live by harness/gojo_shinjuku.test.mjs (moves / combos). Combos + measured damage:
// docs/msv1/gojo/COMBOS.md. Balance: docs/msv1/gojo/BALANCE_NOTES.md.
export const GOJO_SHINJUKU_KIT = { type: 'Space-Control Zoner / Rushdown, CE economy', energy: 'Cursed Energy (CE) + 3 super bars', difficulty: '5',
  summary: 'The Shinjuku-showdown Gojo. Every technique spends CURSED ENERGY (0–100, regenerates 6/s while Infinity is off, +4 per ' +
    'clean hit); Hollow Purple and Unlimited Void also need super bars. Infinity is invisible — the only tell is his CE bar draining.',
  passive: { name: 'Infinity + Six Eyes', effect: 'INFINITY (P tap, steps L1 → L2 → L3 → off): L1 stops every attack that is not a super ' +
    '(5 CE/s, a stopped hit costs 6% of its damage); L2 adds a repel ring, sends projectiles back at half speed, supers deal 50% and cannot ' +
    'launch him (9 CE/s, 4%); L3 stops supers too, radius ×1.6 (22 CE/s, 3%). Forced off when CE runs out, in burnout, inside an ' +
    'opponent\'s domain. Blue / Red / Purple of another Gojo and Mahoraga (after 3 wheel turns) get through. SIX EYES: a technique ' +
    'cancelled on the first legal frame refunds 30% of its CE (Perfect Output). Grabs fail on Infinity.' },
  basics: [
    { name: 'Jab string', input: 'Light → Light → Light', desc: '30 / 30 / 45. 5f.' },
    { name: 'Palm strike', input: 'Heavy', desc: '68. 9f. Black Flash starter.' },
    { name: 'High kick (launcher)', input: 'Up-Attack (or Up + Heavy)', desc: '84. 12f. Launches; jump-cancel on hit.' },
    { name: 'Sweep', input: 'Down + Light / Down + Heavy', desc: '7f, hits low.' },
    { name: 'Jump attack', input: 'Air Light / Heavy', desc: 'Air normal.' },
    { name: 'Point-blank Red (throw)', input: 'Light + Heavy (or Grab)', desc: '90. A tiny Red at contact range.' },
    { name: 'Teleport', input: 'Double-tap toward the foe', desc: 'The old Gojo\'s blink: lands right beside the foe, facing them. 48f cooldown.' },
    { name: 'Long Blink', input: 'Double-tap away from the foe', desc: '40% of the screen away, invulnerable while travelling. 30f cooldown.' },
    { name: 'Charge', input: 'Hold P', desc: 'Fills the super bars and +12 CE/s. Infinity keeps the level it had.' },
  ],
  specials: [
    { name: 'Lapse: Blue', input: 'Special (or ↓↘→ + Special); hold = farther point', cost: '15 CE', desc: 'A point of attraction ahead: pulls the foe in, 4 × 12 in the core. Crushes projectiles, drones and clones in its core.' },
    { name: 'Maximum Output: Blue', input: '↓↘→ + Special + Heavy', cost: '35 CE', desc: 'A drifting orb that drags the foe to the wall, 8 × 10.' },
    { name: 'Blue Step', input: 'Up (+ direction) + Special', cost: '10 CE', desc: 'Instant 45%-screen step (6 frames). Twice per airtime.' },
    { name: 'Blue Fist', input: 'Heavy + Special', cost: '8 CE', desc: '136. Pulls the foe into the punch.' },
    { name: 'Reversal: Red', input: '→ + Special', cost: '15 CE', desc: '70, wall bounce. Reflects projectiles.' },
    { name: 'Delayed Red', input: 'Hold → + Special, release', cost: '18 CE', desc: 'Plant a point; it bursts on release, 60.' },
    { name: 'Red Rush', input: '→ + Special + Heavy', cost: '20 CE', desc: '90. Lunge → crumple → launch.' },
    { name: 'Falling Blossom Emotion', input: '↓↙← + P', cost: '15 CE', desc: '12-frame auto-counter, 50. 8 s cooldown.' },
    { name: 'Reverse Cursed Technique', input: '↓↓ + hold P', cost: '1 CE → 1.5 HP', desc: 'Heal up to 120. 15 s cooldown. In burnout: hold 1.5 s = Brain Reset (40 CE).' },
    { name: 'Black Flash', input: 'Special ≤ 2 frames after a Heavy / Up-Attack / Blue Fist hit', cost: '—', desc: '×2.5 damage, +10 CE, THE ZONE for 6 s (3-frame window).' },
  ],
  supers: [
    { name: 'Hollow Purple', input: '↓ ← + Special (or ↓↘→↓↘→ + Special)', cost: '1 bar + 40 CE', desc: '300. Erases everything in its path (projectiles, clones, drones, patches); 40% chip, guard break.' },
    { name: '200% Hollow Purple', input: '↓ ← + Special + Heavy, then Special on each chant line', cost: '2 bars + 70 CE', desc: 'Three chant lines, each timed press +⅓: 230 → 460. A hit cancels the chant (CE lost, bars kept).' },
  ],
  mobility: { name: 'Teleport / Long Blink', input: 'Double-tap toward / away', cost: 0, desc: 'Toward = beside the foe; away = 40% of the screen, invulnerable travel.' },
  ultimate: { name: 'DOMAIN EXPANSION: UNLIMITED VOID', input: 'Ultimate', cost: '1 bar + 50 CE',
    desc: 'The foe freezes, 15 s. Then 5 s burnout (no techniques, no Infinity, nosebleed) and a 30 s cooldown. Domain clash: mash Special for 1.5 s ' +
      '(score = presses + 0.1 × CE); the winner\'s domain lands for 1 s, then both burn out.' },
  combos: [   // measured by harness/gojo_shinjuku.test.mjs --only=combos (docs/msv1/gojo/COMBOS.md)
    { name: 'Jab string > Red', sequence: 'Light, Light, Light → → + Special', desc: '159, true combo, wall bounce.' },
    { name: 'Palm > Blue Fist', sequence: 'Heavy → Heavy + Special', desc: '192, true combo.' },
    { name: 'Blue Fist > Red Rush', sequence: 'Heavy + Special → → + Special + Heavy', desc: '226, true combo.' },
    { name: 'Jab string > Hollow Purple', sequence: 'Light, Light, Light → ↓ ← + Special', desc: '353, true combo (1 bar).' },
    { name: 'Max Blue > Hollow Purple', sequence: '↓↘→ + Special + Heavy → ↓ ← + Special', desc: '258, corner carry into Purple.' },
  ] }
