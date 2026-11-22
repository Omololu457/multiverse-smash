// MSV1 — Ninja Storm Shane (ns_red) / Dustin (ns_yellow) Move List (kits.js). RAW values from nsWindData.js; measured
// routes in docs/msv1/COMBOS.md. "Teleport" inputs live on the CHARGE button (docs/msv1/NINJA_FRAMEWORK.md).
const shared = [
  { name: 'Ninja Streak', input: 'Double-tap Left / Right (S.P.D. Red\'s detector)', desc: '40% screen; 2 f startup, 8 f travel, intangible frames 2–6 (passes through bodies and projectiles). 10 Ninja Power, the 3rd in a chain 20; chain of 3 then 14 f recovery (specials cancel from its 9th frame). Attack during it = Streak Strike (raw 45). Hold the direction on landing → S.P.D. Red\'s run.' },
  { name: 'Smoke Vanish', input: 'Charge + Light + Heavy (+Up = above)', desc: '30 NP: reappears behind the foe (or above with Up). In blockstun it is an escape: 40 NP, 6 invulnerable frames, 12 s cooldown.' },
  { name: 'Ninja Mirror', input: '↓↓ + Charge', desc: 'Splits into the real ninja and an ILLUSION (no ground shadow; visor glints every 1.5 s). Hit the illusion → it counters; hit the real one → the mode ends. Charge alone = Swap (3 per mirror).' },
  { name: 'Shadow Clones', input: 'Supers / Ultimates', desc: 'Up to 2 precise copies; their hits can never KO; any hit pops one.' },
]
export const NS_RED_KIT = { type: 'Air Ninja / Aerial Rushdown', energy: 'Ninja Energy + Ninja Power', difficulty: 'Hard',
  summary: 'Shane Clarke, Red Wind Ranger: S.P.D. Red\'s run and double-tap, plus 8-way air streaks, triple jump, a Wind Float, Wind Ward reflect and an echoing Wind Mirage.',
  passive: { name: 'Wind Float', input: 'Hold Jump while falling', effect: 'Fall speed capped for 72 f per airtime (never rises).' },
  basics: [
    { name: 'Jab → Wind String', input: 'Light, Light, Light', desc: 'raw 38 / 30 / 30 → 52 finisher (on contact).' },
    { name: 'Rising Kick', input: 'Up + Heavy / Up-Attack', desc: 'raw 70 launcher, anti-air.' },
    { name: 'Low Sweep', input: 'Down + Light', desc: 'raw 44, hits low.' },
    { name: 'Wind Sword', input: 'Heavy', desc: 'raw 64 slash.' },
    { name: 'Skate Slide', input: 'Down-Forward + Heavy', desc: 'raw 50 low; slides under projectiles.' },
    { name: 'Gale Crescent', input: 'Forward + Heavy', desc: 'The sword arc flies 35% screen, raw 55. 12 NP.' },
    { name: 'Air Kick / Air Sword', input: 'Air Light / Air Heavy', desc: 'raw 32 / 58.' },
    { name: 'Hawk Dive', input: 'Air Down + Heavy', desc: 'raw 72 dive kick; ground-bounces on hit.' },
    ...shared],
  specials: [
    { name: 'Air Ninja Tornado', input: '↓↘→ + Special', cost: 20, desc: 'Drill tornado travels 50% screen, 5 hits × raw 13; in the air hold Up/Down for ±30°.' },
    { name: 'Ninja Beam / Laser Blaster', input: '↓↘→ + Light', cost: 15, desc: 'Full-screen beam raw 50 (diagonal in the air).' },
    { name: 'Kunai', input: '↓↙← + Light', cost: 10, desc: 'raw 30; three-kunai fan in the air.' },
    { name: 'Wind Ward', input: 'Forward + Charge', cost: 25, desc: 'Dome; its first 8 f reflect projectiles at 1.2× and parry melee.' }],
  ultimate: { name: 'Storm Ascension (Super) / Hawk Mirage (Ultimate)', input: '↓↘→↓↘→ + Special or Ultimate', cost: 50, desc: 'Super 1 bar: 6 streak hits with 2 clones + rising tornado, raw 310. In Ninja Mirror the Ultimate (2 bars): real, illusion and both clones dive at once, raw 380.' },
  combos: [] }
export const NS_YELLOW_KIT = { type: 'Earth Ninja / Trap & Burrow', energy: 'Ninja Energy + Ninja Power', difficulty: 'Hard',
  summary: 'Dustin Brooks, Yellow Wind Ranger: S.P.D. Red\'s run and double-tap, REV pips from running, Earth Burrow, kunai traps, Rock Hold armor and a guarding Earth Double.',
  passive: { name: 'REV', input: 'Run', effect: 'Every 48 f of running = 1 pip (max 3); the next special spends all, +10% damage each. Lost when hit or blocking.' },
  basics: [
    { name: 'Jab → Earth String', input: 'Light, Light, Light', desc: 'raw 42 / 34 / 34 → 58 finisher.' },
    { name: 'Rising Kick', input: 'Up + Heavy / Up-Attack', desc: 'raw 76 launcher.' },
    { name: 'Low Sweep', input: 'Down + Light', desc: 'raw 50, hits low.' },
    { name: 'Earth Sword', input: 'Heavy', desc: 'raw 70 slash.' },
    { name: 'Sword Lunge', input: 'Forward + Heavy', desc: 'raw 70, travels 60 px.' },
    { name: 'Air Kick / Air Sword', input: 'Air Light / Air Heavy', desc: 'raw 34 / 60.' },
    { name: 'Ground Pound', input: 'Air Down + Heavy', desc: 'Drops; the landing shockwave raw 80 reaches 120 px and hits OTG.' },
    ...shared],
  specials: [
    { name: 'Earth Burrow', input: '↓↓ + Special (hold, release to erupt)', cost: 20, desc: '1.5 s underground at run speed (only lows hit him); release = eruption raw 90 launcher.' },
    { name: 'Ninja Beam', input: '↓↘→ + Light', cost: 15, desc: 'Ground only, raw 50.' },
    { name: 'Earth Kunai Trap', input: '↓↙← + Light', cost: 15, desc: 'Plants a kunai 120 px ahead (max 2, 6 s); a foe stepping on it takes raw 45.' },
    { name: 'Rock Hold', input: 'Forward + Charge', cost: 25, desc: 'Armor absorbs 2 hits in 60 f, then a shockwave counter raw 70.' }],
  ultimate: { name: 'Earthquake Ninja Art (Super) / Fault Line (Ultimate)', input: '↓↘→↓↘→ + Special or Ultimate', cost: 50, desc: 'Super 1 bar: stage shake, 3 eruptions, sword finisher, raw 320. In Ninja Mirror the Ultimate (2 bars): shockwave across the gap, all four erupt, raw 390.' },
  combos: [] }
