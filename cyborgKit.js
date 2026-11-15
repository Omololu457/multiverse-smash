// Cyborg (cyborg) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from cyborgData.js
// (stored damage = round(raw × 1.7), the same roster-parity lever as the Rangers). Inputs are written in the shared
// logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared help layer
// (academy.inputLabelForDevice) re-labels them for keyboard or pad. Measured routes: docs/cyborg/COMBOS_BALANCE.md.
export const CYBORG_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump', 'W', '↑', '✕ Cross (or stick Up)'],
    ['Thruster reboost (airborne)', 'W again', '↑ again', '✕ Cross again'],
    ['Light', 'J', '1', '□ Square'],
    ['Heavy', 'K', '2', '△ Triangle'],
    ['Up-attack (launcher)', 'I  (or W + K)', '3', 'Up + □ / △'],
    ['Special family', 'L (+ direction)', '4 (+ direction)', 'R1 (+ direction)'],
    ['Ultimate', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Vent (hold, grounded neutral)', 'P', '7', 'L2'],
    ['Guard', ';', '/', '○ Circle'],
    ['Combo Breaker (in hitstun)', '; + L', '/ + 4', '○ Circle + R1'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Cyborg adds no Cyborg-only pad reader, no new button and no motion parser. L2 / Charge never recharges Power for Cyborg.',
}
export const CYBORG_KIT = { type: 'Thermal Bruiser / Artillery', energy: 'Power', difficulty: 'Medium',
  summary: 'Victor Stone: heavy cybernetic striker with a sonic cannon, missiles and the Mega Punch. Every weapon emission costs Power AND builds Heat (0-100). Heat cools slowly in neutral or quickly with a held grounded Vent; at exactly 100 the weapons overheat for at least 60 f and come back only once Heat is 60 or lower. Melee never builds Heat. HP 1100, weight 1.15 (takes ~13 % less knockback).',
  passive: { name: 'Heat · Sonic Resonance · Hot Impact', input: 'Automatic', effect: 'HEAT: Shot 12, Cannon 10 per pulse, Missile 18, Rack 8 per missile; an activation is refused if its first emission would pass 100 (later pulses / missiles are re-checked). Passive cooling 0.25 / f in neutral. SONIC RESONANCE: an unblocked sonic hit marks the foe for 90 f (refreshes, never stacks); the next missile contact consumes it and, once per combo, turns its knockback into a short close-range pop. HOT IMPACT: a clean Mega Punch at Heat ≥ 60 vents 20 Heat (once).' },
  basics: [
    { name: 'Jab → Cross → Hammer (J1-J3)', input: 'Light, fresh Light, fresh Light', desc: '6 / 8 / 11 f startup; raw 22 / 28 / 36. Clean-hit retaps only, three stages maximum.' },
    { name: 'Power Straight', input: 'Heavy', desc: '16 f; raw 66.' },
    { name: 'Low Strike', input: 'Down + Light / Down + Heavy', desc: '9 f; raw 28; hits low.' },
    { name: 'Rising Uppercut', input: 'Up + Heavy / Up-Attack', desc: '13 f; raw 46 launcher. Jump (then thruster) to follow.' },
    { name: 'Air Hammer', input: 'Air Light / Air Heavy', desc: '9 f; raw 36.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing punch 30 (stops in front of the foe) → piston strike 34 → knock-away 44. Confirmed Up + Heavy on the last step = Rising Uppercut.' },
    { name: 'Thruster reboost', input: 'Jump while airborne', desc: '8 Power, one per airtime, bounded upward impulse, no hitbox. Without the Power it fails and the airtime allowance is kept; a real landing resets it.' },
    { name: 'Vent', input: 'Hold Charge (grounded, neutral)', desc: '8 f startup, then −0.75 Heat / f while held; release → 12 f recovery. Never recharges Power.' }],
  specials: [
    { name: 'Sonic Shot', input: 'Neutral Special (tap)', cost: 12, desc: '12 Heat. 12 f; raw 32 sonic projectile. An unblocked hit applies Sonic Resonance.' },
    { name: 'Sonic Cannon', input: 'Neutral Special (hold ≥ 18 f)', cost: 5, desc: '5 Power + 10 Heat PER PULSE. First pulse at 22 f, then every 6 f: four raw 14 pulses. Release, missing Power or Heat stops the remaining pulses (never a shot first).' },
    { name: 'Straight Missile', input: 'Forward + Special', cost: 15, desc: '18 Heat. 18 f; raw 46 missile with explosion; one active per Cyborg. Consumes a Resonance mark.' },
    { name: 'Missile Rack', input: 'Up + Special', cost: 6, desc: '6 Power + 8 Heat PER MISSILE. 24 f startup; five raw 14 missiles on a fixed spread, 8 f apart; each launch re-checked; no second rack while one is out. Up + Special never jumps.' },
    { name: 'Mega Punch', input: 'Down + Special', cost: 20, desc: '22 f; raw 78 plus one bounded grounded shockwave (no Heat). Hot Impact at Heat ≥ 60.' },
    { name: 'Mega Slam', input: 'Air Down + Special', cost: 20, desc: 'Once per airtime: short hang, capped descent, then the Mega impact on landing (raw 64) and landing recovery.' },
    { name: 'Sonic Recoil', input: 'Back + Special', cost: 18, desc: '16 Heat. 10 f; raw 28 close sonic burst that pushes Cyborg ~33 px back (grounded).' }],
  ultimate: { name: 'BOOYAH PROTOCOL — FULL SYSTEMS IMPACT', input: 'Ultimate', cost: 100, desc: '30 f sonic opener (raw 30), grounded, also from Heavy / J3 / piston / knock-away recovery. Clean hit: cut-in → cannon 40 → three missiles 20 each → reboost aerial punch 40 → full Mega Punch 110 (280 raw before shared scaling). Heat is 60 afterwards. Miss / block: 60 f recovery.' },
  controls: CYBORG_CONTROLS,
  combos: [
    { name: 'Light string', sequence: 'Light → Light → Light', desc: 'True combo (measured 83 dmg vs Superman). No resources, no Heat.' },
    { name: 'Low into Mega', sequence: 'Down + Light → Heavy → Down + Special', desc: 'True combo (measured 168). ~16 Power net, no Heat.' },
    { name: 'Command chain', sequence: 'Forward + Heavy → Heavy → Heavy', desc: 'True combo (measured 99). No resources.' },
    { name: 'Resonance conversion', sequence: 'Light → Light → Special (Sonic Shot) → Forward + Special (missile)', desc: 'NOT a true combo: the missile lands after the shot hitstun ends (measured reset at hit 4, 118 total). The shot marks, the missile consumes the mark and pops the foe close instead of sending it away. ~23 Power net, ~30 Heat.' },
    { name: 'Launcher pursuit', sequence: 'Up + Heavy → Jump (in the cancel window) → Air Light', desc: 'True combo (measured 76); press Air Light 2-4 f after the jump. The thruster is mobility, not part of this route (it overshoots).' },
    { name: 'Hot Mega', sequence: 'at Heat ≥ 60: Heavy → Down + Special', desc: 'True combo (measured 140; Heat 70 → 49.75); the Mega Punch vents 20 Heat.' },
    { name: 'Heavy into BOOYAH', sequence: 'Heavy → Ultimate (recovery cancel)', desc: 'True combo into the ultimate (measured 8 hits, 308 total). 100 Power; Heat 60 afterwards.' }] }
