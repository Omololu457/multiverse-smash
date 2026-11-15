// Elastigirl (elastigirl) — Move List / kit metadata (kits.js entry). Numbers are the authored stored values from
// elastigirlData.js (the shared ×0.60 global scale and the combo curve apply on top, like every fighter).
// Inputs use the shared logical button tokens so the help layer re-labels them for keyboard or pad.
// Motion notation is numpad, relative to facing (6 = forward, 2 = down, 3 = down-forward …).
export const ELASTIGIRL_CONTROLS = {
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump', 'W', '↑', '✕ Cross'],
    ['Stretch Jab (Jab, Jab on a clean hit)', 'J', '1', '□ Square'],
    ['Stretch Sweep (low)', 'S + J', '↓ + 1', 'Down + □'],
    ['Elastic Haymaker', 'K', '2', '△ Triangle'],
    ['Rising Reach (launcher)', 'I', '3', 'Up + △'],
    ['Diving Stretch (air)', 'J / K in the air', '1 / 2 in the air', '□ / △ in the air'],
    ['Long Arm', '↓↘→ + L (or forward + L)', '↓↘→ + 4', '↓↘→ + R1'],
    ['Whirl Kick', '→↓↘ + L (or L)', '→↓↘ + 4', '→↓↘ + R1'],
    ['Parachute Drop', '↓↓ + L (or S + L)', '↓↓ + 4', '↓↓ + R1'],
    ['Overhead Whip', '←↙↓ + L (or back + L)', '←↙↓ + 4', '←↙↓ + R1'],
    ['Slingshot (air; hold, release to fling)', 'W + L in the air', '↑ + 4 in the air', 'Up + R1 in the air'],
    ['Family Raft', '↓↘→↓↘→ + L, or U', '↓↘→↓↘→ + 4, or 5', '↓↘→↓↘→ + R1, or R2'],
    ['Stretch Guard (parry)', '; + K', '/ + 2', '○ + △'],
    ['Bounce Back', 'A, A, J (back, back, Light)', '←, ←, 1', 'Back, Back + □'],
    ['Grab', 'O', '6', 'L1'],
    ['Guard', ';', '/', '○ Circle'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every key and the Move List re-labels from the logical tokens. Directions are relative to facing. Motions are read from the same per-frame direction history for keyboard, pad, replay and LAN; each special also has a held-direction shortcut.',
}
export const ELASTIGIRL_KIT = { type: 'Footsies / Grappler', energy: 'Elasticity', difficulty: 'Medium (3 / 5)', tagline: "Leave the saving the world to the men? I don't think so.",
  summary: 'Elastigirl — long, stretchy normals that out-reach most of the cast, but every stretched limb is part of her hurtbox while it is out. Elasticity (100) recharges 5/s, +4 on a hit landed and +3 on a hit taken.',
  passive: { name: 'Rubber Body', input: 'Automatic', effect: 'Takes 15 % less damage from melee NORMALS only. Specials, ultimates, projectiles, elemental hits and guard chip are untouched.' },
  basics: [
    { name: 'Stretch Jab', input: 'Light', desc: '6 f startup, 120 px reach, 20 dmg, 0 on block. A second Jab chains on a clean hit.' },
    { name: 'Elastic Haymaker', input: 'Heavy', desc: '14 f, 200 px reach, 54 dmg, −5 on block.' },
    { name: 'Stretch Sweep', input: 'Down + Light', desc: '8 f, hits low, 210 px reach, 28 dmg, −4 on block.' },
    { name: 'Rising Reach', input: 'Up-Attack', desc: '12 f launcher, 48 dmg, −9 on block. Jump-cancel on hit.' },
    { name: 'Diving Stretch', input: 'Light / Heavy in the air', desc: '7 f, 30 dmg, +2 on block.' },
    { name: 'Throw', input: 'Grab', desc: '30 dmg.' },
  ],
  specials: [
    { name: 'Long Arm', input: '↓↘→ + Special', cost: 12, desc: '14 f; 380 px stretch. A hit grabs and pulls the foe in (40 dmg) and leaves her +18. Whiff or block: the arm stays out (hittable) through a long recovery.' },
    { name: 'Whirl Kick', input: '→↓↘ + Special (ground or air)', cost: 15, desc: '8 f; 3 hits 22 / 22 / 28. Upper body intangible on frames 3–9 (beats high strikes and projectiles).' },
    { name: 'Parachute Drop', input: '↓↓ + Special', cost: 18, desc: 'Ground: a hopping dome, 70 overhead on frame 24. Air: float at 35 % fall speed for up to 60 f (press again to slam early), then slam (70 overhead).' },
    { name: 'Overhead Whip', input: '←↙↓ + Special', cost: 15, desc: '18 f; 300 px overhead, 60 dmg; a hit ground-bounces the foe.' },
    { name: 'Slingshot', input: 'Air ↑ + Special (hold)', cost: 12, desc: 'Anchors 220 px up-forward and swings on the pendulum; release Special to fling with the swing momentum. Once per airtime, 2 s cooldown.' },
  ],
  defense: [
    { name: 'Stretch Guard', input: 'Block + Heavy', desc: 'Frames 1–6 parry one frontal strike (not grabs / ultimates / unblockables): no damage, +10 Elasticity, and a FREE Long Arm — press Special to cancel the guard into it (free for 30 f after). 6 s cooldown; a mistimed guard has 15 f of recovery.' },
    { name: 'Bounce Back', input: '← ← + Light', desc: 'A rubber hop backwards, invulnerable on frames 4–12. 5 s cooldown.' },
    { name: 'Rubber Body', input: 'Passive', desc: '−15 % damage from melee normals only.' },
  ],
  ultimate: { name: 'Family Raft', input: '↓↘→↓↘→ + Special (or Ultimate)', cost: 100, desc: 'R14 windup (24 f), then Helen becomes a raft carrying Dash and Violet and surges across the stage: 4 hits 40 / 40 / 50 / 90 (220). Ends in a 100 f lockout.' },
  controls: ELASTIGIRL_CONTROLS,
  combos: [
    { name: 'Footsies confirm', sequence: 'Jab → Jab → Heavy → Long Arm (↓↘→ + Special)', desc: 'Clean-hit chain into the Long Arm pull. ≈106 (harness: 73 dealt = 122 stored-scale on the engine curve). 12 Elasticity.' },
    { name: 'Low launcher', sequence: 'Down + Light → Up-Attack → jump → Air → Whirl Kick (Special)', desc: 'Low starter into the launcher, an air stretch re-lofts, the air Whirl Kick spins through the juggle. ≈125 (harness: 81 dealt = 135). 15 Elasticity.' },
    { name: 'Reel and whip', sequence: 'Long Arm → Heavy → Overhead Whip (←↙↓ + Special)', desc: 'The pull leaves her +18, Heavy links, the Whip cancels and ground-bounces. ≈133 (harness: 89 dealt = 148). 27 Elasticity.' },
    { name: 'Sky route', sequence: 'Up-Attack → jump → Slingshot (hold ~16 f, release) → Air → Parachute (↓ + Special) → Special (slam)', desc: 'One Slingshot per airtime. Harness: 74 dealt = 123 stored-scale. 30 Elasticity.' },
  ] }
