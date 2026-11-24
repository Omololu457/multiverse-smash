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
    specials: [{ name: 'TEAM ULTIMATE — S.P.D. JUDGMENT VOLLEY', input: 'W + U together (full meter)', cost: 100,
      desc: 'S.P.D. EMERGENCY! The whole B-Squad and Omega teleport into a firing line with long rifles, lock on, and fire three ripple volleys — every Ranger on their own beat — then all at once. GUILTY: a containment card shatters over the foe. 400 raw; 30 % if they were blocking.' }, ...dial, ...specials],
    ultimate: { name: 'Each Ranger\'s own', input: KITS.spd_red?.ultimate?.input || 'Ultimate (full meter)', cost: 100, desc: ults },
    combos: [
      { name: 'Tag string', sequence: 'Red: Light (hit) → ↓↓ K → Blue: Light → Heavy', desc: 'Swap in the jab\'s recovery and keep the combo counter going.' },
      { name: 'Range hand-off', sequence: 'far: ↓↓ O (Yellow) → Compact Pistol · close: ↓↓ P (Pink) → Iron Breaker', desc: 'Pick the Ranger for the distance.' },
      { name: 'Omega finish', sequence: 'any Ranger: Heavy (hit) → ↓↓ U → Omega: ↓ + Special', desc: 'Omega\'s Special Downward on the stagger.' },
    ],
  }
}

// ── Mighty Morphin Rangers (mmpr_rangers) — the same builder over the MMPR kits. Red (Jason) has no kits.js entry (his
// grab + Power Sword live in abilities.js), so his rows are written here.
const MMPR_WHO = [['red_ranger_mmpr', 'Red', 'J'], ['mmpr_black', 'Black', 'K'], ['mmpr_pink', 'Pink', 'L'], ['green_ranger', 'Green', 'O'], ['mmpr_white', 'White', 'P']]
const RED_MMPR_ROWS = { specials: [{ name: 'Power Sword Throw', input: 'Special', cost: 0, desc: 'Command grab: Jason seizes the foe and throws them (direction-agnostic).' }],
  ultimate: { name: 'Power Sword: Overhead Strike' } }
export function mmprSquadKit(KITS) {
  const K = k => KITS[k] || (k === 'red_ranger_mmpr' ? RED_MMPR_ROWS : {})
  const base = KITS.mmpr_black || {}
  const dial = MMPR_WHO.map(([k, n, b]) => ({ name: `CALL ${n.toUpperCase()}`, input: `↓ ↓ then ${b}`, cost: 0,
    desc: `${n} teleports in. Health, meter and Energy carry over; that button does not fire. Works mid-combo after a normal's hit frames; not in hitstun / blockstun / knockdown / a Zord call; 40-frame cooldown.` }))
  return {
    type: 'Squad / Ranger Switcher', energy: 'Morphin Grid (shared)', difficulty: '7', name: 'Mighty Morphin Rangers',
    summary: 'Jason (Red), Adam (Black), Kimberly (Pink) and Tommy — as the Green and the White Ranger — as ONE fighter: one 1320 health pool, meter and Energy shared. Every Ranger moves at Red\'s real pace (walk, dash, double jump) with their own moves; call any of them with Ben 10\'s dial — ↓ ↓ then J / K / L / O / P.',
    passive: { name: "It's Morphin Time", effect: 'The called Ranger teleports in with a flash and 6 frames of invulnerability. Each round starts as the "Start as" Ranger (skin).' },
    basics: base.basics, mobility: base.mobility,
    specials: [{ name: 'TEAM ULTIMATE — MORPHIN GRID: FIVE-POINT STAR', input: 'W + U together (full meter)', cost: 100,
      desc: "It's Morphin Time! Five Power Coins pin the foe in the air, the Rangers drop onto the points of a star and cut it through them in a five-dash relay, then the Morphin Grid's lightning slams them down — team pose, explosions. 400 raw; 30 % if they were blocking." }, ...dial, ...MMPR_WHO.flatMap(([k, n]) => (K(k).specials || []).map(s => ({ ...s, name: `${n} — ${s.name}` })))],
    ultimate: { name: 'Each Ranger\'s own', input: base.ultimate?.input || 'Ultimate (full meter)', cost: 100, desc: MMPR_WHO.map(([k, n]) => `${n}: ${K(k).ultimate?.name || 'Ultimate'}`).join(' · ') },
    combos: [
      { name: 'Tag string', sequence: 'Red: Light (hit) → ↓↓ K → Black: Light → Heavy', desc: 'Swap in the jab\'s recovery and keep the combo counter going.' },
      { name: 'Range hand-off', sequence: 'far: ↓↓ L (Pink) → Power Bow · close: ↓↓ K (Black) → Power Axe', desc: 'Pick the Ranger for the distance.' },
      { name: 'Tommy twice', sequence: 'Green: Dragon Dagger string → ↓↓ P → White: Saba follow-up', desc: 'Both of Tommy\'s Rangers in one string.' },
    ],
  }
}

// ── Ninja Storm Squad (ns_squad) — Shane / Dustin (nsKit.js) + Tori / Blake / Cam (nsTrioKit.js) on the same dial. The ninja
// kits' ↓↓ techniques move off the dial: Mirror = ↓↓ + the active ninja's own button, Burrow / Super Samurai = ↓↓ + U.
const NS_WHO = [['ns_red', 'Shane', 'J', 'Red'], ['ns_yellow', 'Dustin', 'K', 'Yellow'], ['ns_blue', 'Tori', 'L', 'Blue'], ['ns_navy', 'Blake', 'O', 'Navy'], ['ns_green', 'Cam', 'P', 'Green']]
const NS_REMAP = s => s.input === '↓↓ + Charge' ? { ...s, input: '↓↓ then the active ninja\'s own button (J/K/L/O/P)' }
  : /↓↓ \+ Special/.test(s.input) ? { ...s, input: s.input.replace('↓↓ + Special', '↓↓ then U') } : s
export function nsSquadKit(red, yellow, trio) {
  const dial = NS_WHO.map(([k, n, b, c]) => ({ name: `CALL ${n.toUpperCase()} (${c})`, input: `↓ ↓ then ${b}`, cost: 0,
    desc: `${n} arrives in a flash of smoke. Health, meter and Ninja Power carry over; ${b} does not fire. Works mid-combo after a normal's hit frames; not in hitstun / blockstun / knockdown / a vanish, streak or super; 40-frame cooldown.` }))
  const own = (K, n) => (K?.specials || []).filter(s => !/\(illusion\)$/.test(s.name)).map(s => NS_REMAP({ ...s, name: `${n} — ${s.name}` }))
  const trioRows = (trio?.specials || []).filter(s => /^(Tori|Blake|Cam) — /.test(s.name)).map(NS_REMAP)
  return {
    type: 'Ninja Squad / Form Switcher', energy: 'Ninja Power (shared)', difficulty: '7', name: 'Ninja Storm Squad',
    summary: 'Shane (Red Wind, air), Dustin (Yellow Wind, earth), Tori (Blue Wind, water), Blake (Navy Thunder) and Cam (Green Samurai) as ONE fighter: one 1320 health pool; meter and Ninja Power shared. Each ninja keeps their own stats, moves, specials and supers; call any of them with Ben 10\'s dial — ↓ ↓ then J / K / L / O / P.',
    passive: { name: 'Ninja Storm Tag', effect: 'The called ninja arrives in smoke with 6 frames of invulnerability. A swap ends the Mirror, clones, the burrow, the barrier and Super Samurai Mode. Each round starts as the "Start as" ninja (skin).' },
    basics: red?.basics, mobility: red?.mobility,
    specials: [...dial,
      { name: 'NINJA MIRROR', input: '↓ ↓ then the active ninja\'s own button', cost: 0, desc: 'Re-calling the ninja who is already out splits them into the Ninja Mirror (their ↓↓ + Charge). Each ninja\'s Ultimate is done inside the Mirror.' },
      { name: '↓↓ TECHNIQUE', input: '↓ ↓ then U', cost: 0, desc: 'Dustin: Earth Burrow (hold U to stay under). Cam: Super Samurai Mode. Shane / Tori / Blake: Ninja Mirror.' },
      ...own(red, 'Shane'), ...own(yellow, 'Dustin'), ...trioRows],
    ultimate: { name: 'Each ninja\'s own', input: '↓↘→↓↘→ + Special (or Ultimate)', cost: 50,
      desc: `Shane: ${red?.ultimate?.name || 'Storm Ascension'} · Dustin: ${yellow?.ultimate?.name || 'Earthquake Ninja Art'} · Tori: Tsunami · Blake: Thunder Storm · Cam: Super Samurai` },
    combos: [
      { name: 'Wind to water', sequence: 'Shane: Light (hit) → ↓↓ L → Tori: Light → Heavy → ↓↙← + J (Geyser)', desc: 'Swap in the jab\'s recovery and keep the combo counter going.' },
      { name: 'Range hand-off', sequence: 'far: ↓↓ O (Blake) → Thunder Staff · close: ↓↓ K (Dustin) → Rock Hold', desc: 'Pick the ninja for the distance.' },
      { name: 'Samurai cash-out', sequence: '↓↓ P (Cam) → ↓↓ U (Super Samurai) → Light → Heavy → ↓↘→ + Special', desc: 'Samurai Star at +15%.' },
    ],
  }
}
