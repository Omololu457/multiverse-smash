// spdSquadKit.js — Move List (kits.js) for the S.P.D. Rangers squad (spd_rangers). Built from each Ranger's OWN kit, so
// it stays in step with them: the dial first, then every Ranger's specials (prefixed with who does it), the six ultimates.
const WHO = [['spd_red', 'Red', 'J'], ['spd_blue', 'Blue', 'K'], ['spd_green', 'Green', 'L'], ['spd_yellow', 'Yellow', 'O'], ['spd_pink', 'Pink', 'P'], ['omega_ranger', 'Omega', 'U']]
export function squadKit(KITS) {
  const red = KITS.spd_red || {}
  const dial = WHO.map(([k, n, b]) => ({ name: `CALL ${n.toUpperCase()}`, input: `↓ ↓ then ${b}`, cost: 0,
    desc: `${n} teleports in (S.P.D. flash). Health, meter and Energy carry over; ${b === 'U' ? 'Ultimate' : 'that'} button does not fire. Works mid-combo after a normal's hit frames; not in hitstun / blockstun / knockdown; 40-frame cooldown.` }))
  const specials = WHO.flatMap(([k, n]) => (KITS[k]?.specials || []).map(s => ({ ...s, name: `${n} — ${s.name}` })))
  const ults = WHO.map(([k, n]) => `${n}: ${KITS[k]?.ultimate?.name || 'Ultimate'}`).join(' · ')
  return {
    type: 'Squad / Ranger Switcher', energy: 'S.P.D. Energy (shared)', difficulty: '7', name: 'S.P.D. Rangers',
    summary: 'Jack, Sky, Bridge, Z, Syd and Sam (Omega) as ONE fighter: one 1320 health pool, meter and Energy shared. Every Ranger moves at Red\'s pace with their own moves; call any of them with Ben 10\'s dial — ↓ ↓ then J / K / L / O / P / U.',
    passive: { name: 'B-Squad Tag', effect: 'The called Ranger arrives with a short teleport flash and 6 frames of invulnerability. Each round starts as the "Start as" Ranger (skin).' },
    basics: red.basics, mobility: red.mobility,
    specials: [...dial, ...specials],
    ultimate: { name: 'Each Ranger\'s own', input: KITS.spd_red?.ultimate?.input || 'Ultimate (full meter)', cost: 100, desc: ults },
    combos: [
      { name: 'Tag string', sequence: 'Red: Light (hit) → ↓↓ K → Blue: Light → Heavy', desc: 'Swap in the jab\'s recovery and keep the combo counter going.' },
      { name: 'Range hand-off', sequence: 'far: ↓↓ O (Yellow) → Compact Pistol · close: ↓↓ P (Pink) → Iron Breaker', desc: 'Pick the Ranger for the distance.' },
      { name: 'Omega finish', sequence: 'any Ranger: Heavy (hit) → ↓↓ U → Omega: ↓ + Special', desc: 'Omega\'s Special Downward on the stagger.' },
    ],
  }
}
