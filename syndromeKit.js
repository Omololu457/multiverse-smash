// Syndrome (syndrome) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from syndromeData.js
// (stored damage = raw; the shared pipeline applies GLOBAL_DAMAGE_SCALE 0.6 and combo scaling to every character alike).
// Inputs use the shared logical button tokens so the help layer re-labels them for keyboard or pad.
// Measured values: docs/syndrome/DAMAGE_AUDIT.md + docs/syndrome/VERIFICATION.md. Controls: docs/syndrome/CONTROLS.md.
import { COST } from './syndromeData.js'
export const SYNDROME_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared, maxJumps 2)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again (fresh press)'],
    ['Dash', 'double-tap A / D', 'double-tap ← / →', 'double-tap left / right'],
    ['Command chain (Spinner → Drone → Spinner)', 'J, J, J', '1, 1, 1', '□, □, □'],
    ['Low Spinner skim', 'S + J', '↓ + 1', 'Down + □'],
    ['Claw Drive (heavy)', 'K', '2', '△ Triangle'],
    ['Rising Claw (launcher)', 'W + K or I', '↑ + 2 or 3', 'Up + △'],
    ['Drone strafe (air)', 'air J', 'air 1', 'air □'],
    ['Leg Drop (air down)', 'air K', 'air 2', 'air △'],
    ['Hunter Duet', 'L', '4', 'R1'],
    ['Spin Cycle', 'forward + L', 'forward + 4', 'Forward + R1'],
    ['Velocipod Intercept', 'W + L', '↑ + 4', 'Up + R1'],
    ['Deploy Turret (gun)', 'S + L', '↓ + 4', 'Down + R1'],
    ['Omnidroid: Hammerfall', 'back + L', 'back + 4', 'Back + R1'],
    ['Zero-Point Hold', 'P + L', '7 + 4', 'L2 + R1'],
    ['Mortar Turret', 'P + forward + L', '7 + forward + 4', 'L2 + Forward + R1'],
    ['Rising Interception', 'P + W + L', '7 + ↑ + 4', 'L2 + Up + R1'],
    ['Missile Turret', 'P + S + L', '7 + ↓ + 4', 'L2 + Down + R1'],
    ['Omnidroid Sweep', 'P + back + L', '7 + back + 4', 'L2 + Back + R1'],
    ['Ultimate — Operation Kronos', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Guard', ';', '/', '○ Circle'],
    ['Charge (L2 alone)', 'P hold', '7 hold', 'L2 hold'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key and the Move List re-labels from the logical tokens. Directions are FACING-RELATIVE. Syndrome adds no Syndrome-only pad reader, no new button and no motion parser. L2 held while R1 is pressed selects the modified table and never charges energy; L2 alone stays the shared Charge.',
}
export const SYNDROME_KIT = { type: 'Arsenal Conductor / Zoner-Pressure', energy: 'Power', difficulty: 'Hard',
  summary: 'Syndrome never punches. Every button is a command gesture and his machines perform the attack: Spinners snap and skim, Drones cross and strafe, the Omnidroid drives a claw, raises one from the floor or stamps a leg, Turrets hold space, and the Velocipod cuts across the arena. At most one mobile squad, one Spinner, one Turret and one Omnidroid action exist at a time; normals are never blocked by a deployed machine.',
  passive: { name: 'Convergence', input: 'Automatic', effect: 'If a Hunter Duet is still out when another machine lands a clean hit, the remaining Duet shots re-time to cross on the victim once (CONVERGENCE). Once per Duet; never through guard.' },
  basics: [
    { name: 'Spinner Snap → Drone Cross → Spinner Pass', input: 'Light, fresh Light, fresh Light', desc: '5 / 6 / 8 f; raw 45 / 45 / 65. Clean-hit retaps only, three stages maximum.' },
    { name: 'Claw Drive', input: 'Heavy', desc: '14 f; raw 95; an Omnidroid claw drives in from the edge. Also from a clean Light / Low.' },
    { name: 'Low Spinner Skim', input: 'Down + Light', desc: '7 f; raw 42; hits low.' },
    { name: 'Rising Claw (launcher)', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 75; a claw rises from the floor and launches.' },
    { name: 'Drone Strafe', input: 'Air Light', desc: '6 f; raw 65.' },
    { name: 'Leg Drop', input: 'Air Heavy', desc: '12 f; raw 85; an Omnidroid leg stamps below him.' },
    { name: 'Grab', input: 'Grab', desc: 'Shared grab / throw rules; raw 45.' },
    { name: 'Double jump', input: 'Jump in the air', desc: 'The shared double jump: exactly 2 jumps, never refunded, no hover.' },
  ],
  specials: [
    { name: 'Hunter Duet', input: 'Special', cost: COST.duet, desc: '10 f; two Drones take high / low stations and fire six committed shots (raw 25 each, 150 total) over 4 s.' },
    { name: 'Spin Cycle', input: 'Forward + Special', cost: COST.spin, desc: '9 f; a Spinner rolls out (raw 60) and returns (raw 50), ≤ 270 px.' },
    { name: 'Velocipod Intercept', input: 'Up + Special', cost: COST.velo, desc: '12 f; 26 f warning, then the Velocipod cuts a committed diagonal (raw 150). Anti-air.' },
    { name: 'Deploy Turret', input: 'Down + Special', cost: COST.turret, desc: '14 f; a gun turret emerges ahead and fires 9 shots (raw 20). 3 hits destroy it.' },
    { name: 'Omnidroid: Hammerfall', input: 'Back + Special', cost: COST.hammer, desc: '12 f; a 40 f shadow warning, then a giant leg slam (raw 170). Committed.' },
    { name: 'Zero-Point Hold', input: 'Charge (L2) + Special', cost: COST.zero, desc: '12 f; raw 20; a clean hit holds the target for 44 f. Once per combo.' },
    { name: 'Mortar Turret', input: 'Charge + Forward + Special', cost: COST.turret, desc: 'Lobs 4 rolling bombs (raw 45).' },
    { name: 'Rising Interception', input: 'Charge + Up + Special', cost: COST.rise, desc: 'A claw rises at a fixed point ahead after a warning (raw 130).' },
    { name: 'Missile Turret', input: 'Charge + Down + Special', cost: COST.turret, desc: '3 marked missile drops (raw 60).' },
    { name: 'Omnidroid Sweep', input: 'Charge + Back + Special', cost: COST.sweep, desc: 'A laser-arm sweep along the floor after an 18 f warning (raw 120).' },
  ],
  ultimate: { name: 'OPERATION KRONOS: FINAL DEMONSTRATION', input: 'Ultimate', cost: COST.ult, desc: '16 f Zero-Point opener (raw 30); also from Claw Drive / Spinner Pass. Clean capture: the Omnidroid rises, five machine contacts (90), two claws lift and pin (70), the slam (230) — 420 raw before shared scaling. Whiff / block: real recovery.' },
  controls: SYNDROME_CONTROLS,
  combos: [] }
