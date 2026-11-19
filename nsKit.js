// nsKit.js — MSV1 Move List (kits.js entries) for Shane (ns_red) and Dustin (ns_yellow). Numbers = authored raw values from
// nsData.js (roster parity ×1.6, S.P.D. Red's tier, applies in play). Combos + measured damage: docs/msv1/COMBOS.md.
const SHARED = {
  mobility: { name: 'Ninja Streak', input: 'Double-tap ← / → (S.P.D. Red\'s teleport input)', cost: 10, desc: '40% of the screen in 8 frames, passes THROUGH the foe, projectile-intangible frames 2–6. Chain ×3 (third costs 20), 14f recovery (specials cancel frames 9–14). Press an attack during it = STREAK STRIKE 45 (blunt). Hold the direction after it to run (10.5 px/f).' },
  framework: [
    { name: 'Smoke Vanish', input: 'Charge + Light + Heavy', cost: 30, desc: 'Vanish in your own smoke, reappear behind (or above, hold ↑) the foe. In blockstun: escape (40 NP, 6 invulnerable frames, 12 s cooldown).' },
    { name: 'Shadow Clones', input: 'Back + Charge', cost: 35, desc: 'Hand sign → smoke pop → two clones fan out → unison strike (60% damage each, never the KO) → smoke exit. One hit pops a clone.' },
    { name: 'NINJA MIRROR', input: '↓↓ + Charge', cost: 50, desc: '8 s: one REAL body and one ILLUSION 30% screen apart. Tap Charge = SWAP (10 NP, max 3). The tell: the illusion casts no shadow and its visor glints every 1.5 s. Hit the illusion → it counters; hit the real one → mode ends.' },
    { name: 'Ninja Barrier', input: 'Forward + Charge', cost: 25, desc: '8-frame parry window, then the R19 electric dome.' },
  ],
}
export const NS_RED_KIT = { type: 'Air Ninja / Aerial Rushdown', energy: 'Ninja Power', difficulty: '5',
  summary: 'Shane Clarke, Red Wind Ranger: S.P.D. Red\'s ground speed, +10% air speed, a triple jump and a Wind Float. Streaks 8-way in the air (2 per airtime) and owns the sky.',
  passive: { name: 'Ninja Power + Wind Float', effect: 'Ninja Power 0–100 (starts 50, +6/s while not streaking, +4 per hit). Hold Jump while falling = Wind Float (1.2 s per airtime; slows the fall, never climbs).' },
  basics: [
    { name: 'Jab', input: 'Light', desc: '38, 5f (blunt).' }, { name: 'Kick string', input: 'Heavy, Heavy, Heavy', desc: '30 / 30 / 52 (blunt).' },
    { name: 'Rising flip kick', input: 'Up + Heavy', desc: '70, 8f anti-air, launches (blunt).' }, { name: 'Uppercut', input: 'Up-Attack', desc: '62, launches.' },
    { name: 'Low sweep', input: 'Down + Light', desc: '44, low (blunt).' }, { name: 'Sword slash', input: 'Forward + Light', desc: '64 (slash). Running: 60 running slash.' },
    { name: 'Rising slash / crouch slash / low swipe', input: 'Up + Light / Down + Heavy / Down-Back + Heavy', desc: '56 / 48 low / 54 low (slash).' },
    { name: 'Axe kick', input: 'Back + Heavy', desc: '56 overhead.' }, { name: 'Skate Slide', input: 'Down-Forward + Heavy', desc: '50 low, slides under projectiles.' },
    { name: 'Air sword / air kick', input: 'Air Light / Air Heavy', desc: '58 (slash) / 46.' }, { name: 'Hawk Dive', input: 'Air Down + Heavy', desc: '72 dive kick, ground bounce.' },
  ],
  specials: [
    { name: 'Air Ninja Tornado', input: '↓↘→ + Special', cost: 20, desc: 'Drill tornado over 50% of the screen, 5 × 13 (energy). In the air: on the held angle (0 / ±30°).' },
    { name: 'Gale Crescent', input: 'Forward + Heavy', cost: 12, desc: 'The sword crescent flies 35% of the screen, 55 (slash).' },
    { name: 'Ninja Beam', input: '↓↘→ + Light (or Special)', cost: 15, desc: 'Wind Morpher beam, full screen, 50. In the air: a diagonal beam downward.' },
    { name: 'Kunai', input: '↓↙← + Light', cost: 10, desc: '1 straight (ground), a 3-kunai fan (air), 30 each.' },
    { name: 'Wind Ward', input: 'Forward + Charge', cost: 25, desc: 'Ninja Barrier: a parry REFLECTS projectiles at 1.2× speed and damage.' },
    ...SHARED.framework,
    { name: 'Wind Mirage (illusion)', input: 'Ninja Mirror', cost: 50, desc: 'The illusion ECHOES your inputs 8 frames late. Struck: it bursts into a mini tornado (3 × 18, launches).' },
  ],
  mobility: SHARED.mobility,
  ultimate: { name: 'STORM ASCENSION (Super, 1 bar) · HAWK MIRAGE (Ultimate, 2 bars, Mirror only)', input: '↓↘→↓↘→ + Special / Ultimate', cost: 50, desc: 'Storm Ascension: 2 clones, 6 streak hits from 6 directions + rising tornado, 310. Hawk Mirage: real, illusion and 2 clones dive from 4 angles at once, 380.' },
  combos: [   // measured on the real loop by harness/msv1_combos.mjs (docs/msv1/COMBOS.md)
    { name: 'Kick string', sequence: 'Light → Heavy → Heavy → Heavy', desc: '4 hits, 109.' },
    { name: 'Launch', sequence: 'Light → Heavy → Heavy → Up-Attack', desc: '4 hits, 114; the uppercut launches.' },
    { name: 'Run-over', sequence: '→→ (Light during: Streak Strike) → ↓↘→ + Special', desc: 'Cross-up into the Tornado, 4 hits, 69.' },
    { name: 'Storm cash-out', sequence: 'Light → Heavy → Heavy → ↓↘→↓↘→ + Special', desc: '10 hits, 258 (1 bar).' },
    { name: 'Mirage', sequence: '↓↓ + Charge → Ultimate', desc: 'Hawk Mirage, 364 (2 bars).' },
  ] }
export const NS_YELLOW_KIT = { type: 'Earth Ninja / Trap & Burrow', energy: 'Ninja Power', difficulty: '5',
  summary: 'Dustin Brooks, Yellow Wind Ranger: S.P.D. Red\'s ground speed, heavier and sturdier (+8% health). Owns the ground: burrows, tremor streaks, kunai traps and REV.',
  passive: { name: 'Ninja Power + REV', effect: 'Ninja Power as Shane. REV: every 0.8 s of running builds a pip (max 3); the next streak or special spends them all, +10% damage each. Lost on block or hit.' },
  basics: [
    { name: 'Jab', input: 'Light', desc: '42.' }, { name: 'Kick string', input: 'Heavy, Heavy, Heavy', desc: '34 / 34 / 58.' },
    { name: 'Rising kick', input: 'Up + Heavy', desc: '76 anti-air.' }, { name: 'Low sweep', input: 'Down + Light', desc: '50 low.' },
    { name: 'Sword', input: 'Forward + Light', desc: '70 (slash).' }, { name: 'Rock Slash', input: 'Forward + Heavy', desc: '72 (slash).' },
    { name: 'Air sword / air kick', input: 'Air Light / Air Heavy', desc: '60 / 50.' }, { name: 'Ground Pound', input: 'Air Down + Heavy', desc: 'Landing shockwave 80 (blunt), hits OTG.' },
    { name: 'Dirt Slide', input: 'Down-Forward + Heavy', desc: '54 low (motocross).' },
  ],
  specials: [
    { name: 'Earth Burrow', input: '↓↓ + Special (hold)', cost: 20, desc: 'Under the ground for up to 1.5 s at run speed; only lows / ground hits reach him. Release = ERUPT, 90, launches.' },
    { name: 'Tremor Streak', input: 'Double-tap ← / → while burrowed', cost: 10, desc: 'The streak travels underground: a cross-up from below.' },
    { name: 'Earth Kunai', input: '↓↙← + Light', cost: 15, desc: 'A kunai in the floor (max 2, 6 s) erupts when the foe steps on it: 45, trips.' },
    { name: 'Ninja Beam', input: '↓↘→ + Light (or Special)', cost: 15, desc: 'Ground only, 50.' },
    { name: 'Rock Hold', input: 'Forward + Charge', cost: 25, desc: 'Ninja Barrier as ARMOR: absorbs 2 hits for 1 s, then a shockwave counter (70).' },
    ...SHARED.framework,
    { name: 'Earth Double (illusion)', input: 'Ninja Mirror', cost: 50, desc: 'A still, guarding decoy. Burrow to it and swap from underground. Struck: a heavy eruption under the attacker (80, wall-bounce).' },
  ],
  mobility: SHARED.mobility,
  ultimate: { name: 'EARTHQUAKE NINJA ART (Super, 1 bar) · FAULT LINE (Ultimate, 2 bars, Mirror only)', input: '↓↘→↓↘→ + Special / Ultimate', cost: 50, desc: 'Earthquake: stage shake, pop-up, 3 eruptions + sword finisher, 320. Fault Line: real + illusion slam, a shockwave between them, 4 bodies erupt, 390.' },
  combos: [   // measured on the real loop by harness/msv1_combos.mjs (docs/msv1/COMBOS.md)
    { name: 'Kick string', sequence: 'Light → Heavy → Heavy → Heavy', desc: '4 hits, 122.' },
    { name: 'Rock route', sequence: 'Light → → + Heavy (Rock Slash)', desc: '2 hits, 97.' },
    { name: 'Full REV', sequence: '3 REV pips → ↓↓ hold Special → →→ under them → release', desc: 'Tremor Streak surfaces under the foe, Erupt +30%: 112.' },
    { name: 'Trip & pound', sequence: 'Earth Kunai trips them → hop, ↓ + Heavy at once', desc: 'Ground Pound OTG, 108 total.' },
    { name: 'Quake cash-out', sequence: 'Light → Heavy → Heavy → ↓↘→↓↘→ + Special', desc: '8 hits, 276 (1 bar).' },
    { name: 'Fault Line', sequence: '↓↓ + Charge (Earth Double) → Ultimate', desc: '372 (2 bars).' },
  ] }

// ── MSV1-MERGE: "Shane & Dustin" (windrangers) — the ACTIVE form's list, with a toggle to the other form's (TAB on the
//    Move List screen; the pause menu opens on the form you are playing). The view is UI state only, never the sim's.
let DUO_VIEW = 'ns_red'
export const duoKitView = form => { if (form === 'ns_red' || form === 'ns_yellow') DUO_VIEW = form; return DUO_VIEW }
export const duoKitToggle = () => (DUO_VIEW = DUO_VIEW === 'ns_red' ? 'ns_yellow' : 'ns_red')
const DUO_CUR = () => DUO_VIEW === 'ns_yellow' ? NS_YELLOW_KIT : NS_RED_KIT
const DUO_SHARED = [
  { name: 'FORM SWAP (Omnitrix input)', input: '↓↓ then Grab (pad: ↓↓ then L1 / LB)', cost: 15, desc: 'Ben 10\'s swap gesture. The ranger vanishes in his smoke and his partner bursts out of it in the same spot: 14 frames, 6 invulnerable, 30-frame cooldown (Ben\'s). Grounded, airborne, at the end of a streak or in a normal\'s recovery; never in hitstun / blockstun / a super. Keeps health, NP, meter, combo, position, facing, momentum. Ends the Mirror, clones, REV, burrow, Wind Float; traps and Gale shots stay.' },
  { name: 'Swap-in strike', input: '(automatic)', cost: 0, desc: '30 blunt, small stagger. If it connects, the OTHER ranger\'s next special within 3 s deals +10% (tag bonus).' },
  { name: 'STORM AND STONE (tag ultimate)', input: '↓↘→↓↘→ + Special + Heavy', cost: 100, desc: 'The full meter, outside the Mirror: Shane streaks through from the air as the tornado while Dustin erupts underneath, then tornado and shockwave meet. 420 (energy / blunt).' },
]
export const NS_DUO_KIT = {
  type: 'Ninja Duo / Form Swapper', energy: 'Ninja Power (shared)', difficulty: '5', name: 'Ninja Storm MS_V1 Ranger Version',
  get summary() { const red = DUO_VIEW === 'ns_red'; return `Two elements. One storm. Health 1248 (one pool), NP and meter shared. Showing ${red ? 'SHANE (Red Wind)' : 'DUSTIN (Yellow Wind)'}'s list — press TAB for ${red ? 'Dustin' : 'Shane'}'s. ` + DUO_CUR().summary },
  get passive() { return DUO_CUR().passive },
  get basics() { return DUO_CUR().basics },
  get specials() { return [...DUO_SHARED, ...DUO_CUR().specials] },
  get mobility() { return DUO_CUR().mobility },
  get ultimate() { return DUO_CUR().ultimate },
  get combos() { return DUO_CUR().combos },
}
