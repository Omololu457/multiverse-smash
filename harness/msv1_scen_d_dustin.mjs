// MSV1 scenarios D — DUSTIN BROOKS (ns_yellow, Yellow Wind / Earth): burrow (lows only), tremor streak, Earth Kunai traps,
// REV, Rock Hold armor, Earth Double decoy, Ground Pound OTG, Earthquake / Fault Line, stats.
export async function run(X) {
  const { step, S, call, shot, tap, dtap, motion, fresh, settle, hp, check, section } = X
  await X.boot('ns_yellow', 'ns_red')
  const page = () => X.page
  const G = await page().evaluate(async () => (await import('./combat.js')).GLOBAL_DAMAGE_SCALE)
  const dmg = raw => Math.floor(raw * 1.6 * G), mdmg = raw => Math.floor(Math.floor(raw * G) * 1.6)
  const raw = (w, fn) => page().evaluate(([w, fn]) => { const f = __harness.ninjaTest.raw(w); return (new Function('f', 'return (' + fn + ')(f)'))(f) }, [w, fn.toString()])
  const foeAt = (x, face) => page().evaluate(([x, face]) => { const f = __harness.ninjaTest.raw('p2'); f.x = x; f.vx = 0; if (face) f.facing = face }, [x, face])
  const moveSeen = async (n = 30) => { const seen = []; for (let i = 0; i < n; i++) { await step(1); const m = (await S()).move; if (m && seen[seen.length - 1] !== m) seen.push(m) } return seen }

  section('D0 Dustin stats (S.P.D. Red speed tier, heavier, 2 jumps)')
  const st = await S()
  check('Dustin: speed 88 (S.P.D. Red tier), max health 1296 (+8%), maxJumps 2', st.speed === 88 && st.maxHealth === 1296 && st.maxJumps === 2, { speed: st.speed, hp: st.maxHealth, jumps: st.maxJumps })
  await fresh(100, { ax: 800 }); let h0 = await hp(); await page().keyboard.down('d'); await tap(['k']); await page().keyboard.up('d'); let seen = await moveSeen(30)
  check(`→ + Heavy = Rock Slash 72 → ${mdmg(72)}`, seen[0] === 'sRock' && h0 - await hp() === mdmg(72), { seen, dealt: h0 - await hp() })
  await settle(40)

  section('D1 Earth Burrow (↓↓ + hold Special): only lows reach him, release = Erupt')
  await fresh(140, { ax: 800 })
  await dtap('s'); await page().keyboard.down('l'); for (let i = 0; i < 12; i++) await step(1)
  let s1 = await S()
  check('↓↓ + Special = burrowed (20 NP)', !!s1.s.burrow, s1.s.burrow)
  await shot('burrow_dustin')
  await foeAt(s1.x + 48 + 30, -1); const bh = s1.health
  await call('move', 'light', 'p2'); for (let i = 0; i < 12; i++) await step(1)
  s1 = await S()
  check('burrowed: a MID jab passes over him (no damage, still under)', s1.health === bh && !!s1.s.burrow, { dealt: bh - s1.health, under: !!s1.s.burrow })
  await call('move', 'sLow', 'p2'); for (let i = 0; i < 14; i++) await step(1)
  s1 = await S()
  check('burrowed: a LOW sweep reaches him (hit, dug out)', s1.health < bh && !s1.s.burrow, { dealt: bh - s1.health, under: !!s1.s.burrow })
  await page().keyboard.up('l'); await settle(80)
  // travel underground + release → Erupt
  await fresh(230, { ax: 600 }); h0 = await hp()   // 20 frames under at 10.5 px/f ends right under the foe
  await dtap('s'); await page().keyboard.down('l'); await step(8); await page().keyboard.down('d')
  const bx0 = (await S()).x; for (let i = 0; i < 20; i++) await step(1); const bx1 = (await S()).x
  check('burrowed movement = run speed 10.5 px/f', Math.abs((bx1 - bx0) / 20 - 10.5) < 0.6, (bx1 - bx0) / 20)
  await page().keyboard.up('d'); await page().keyboard.up('l'); seen = await moveSeen(30)
  check(`release Special = ERUPT (90, launches) → ${dmg(90)}`, seen.includes('sErupt') && h0 - await hp() === dmg(90), { seen, dealt: h0 - await hp() })
  await shot('erupt_dustin')
  await settle(80)
  // Tremor streak: the double-tap while burrowed travels underground and crosses up
  await fresh(300, { ax: 600 }); const zx = (await S('p2')).x
  await dtap('s'); await page().keyboard.down('l'); await step(10)
  await dtap('d'); let trem = false; for (let i = 0; i < 12; i++) { await step(1); const q = await S(); if (q.move === 'nsTremor') trem = true }
  s1 = await S()
  check('Tremor Streak: →→ while burrowed streaks UNDERGROUND (still burrowed after, crossed the foe)', trem && !!s1.s.burrow && s1.x > zx, { trem, under: !!s1.s.burrow, x: s1.x, foe: zx })
  await page().keyboard.up('l'); await settle(80)

  section('D2 Earth Kunai traps (↓↙← + Light): max 2, 6 s, 45 + trip')
  await fresh(700, { ax: 300 }); await raw('p1', f => { f.facing = 1 })
  for (let k = 0; k < 3; k++) { await motion(['s', ['s', 'a'], 'a'], 'j'); for (let i = 0; i < 30; i++) await step(1) }
  s1 = await S()
  check('Earth Kunai sets floor traps, max 2 (the oldest goes)', s1.s.traps.length === 2, s1.s.traps.length)
  await shot('traps_dustin')
  const tx = s1.s.traps[0].x; h0 = await hp()
  await foeAt(tx - 24); let tripped = false
  for (let i = 0; i < 10; i++) { await step(1); if ((await S('p2')).knockdown) tripped = true }
  check(`a foe stepping on a trap: 45 → ${dmg(45)} + trip (knockdown)`, h0 - await hp() === dmg(45) && tripped, { dealt: h0 - await hp(), tripped })
  await settle(60)
  await fresh(1200, { ax: 300 }); await raw('p1', f => { f.facing = 1 }); await motion(['s', ['s', 'a'], 'a'], 'j')
  let life = 0; for (let i = 0; i < 400; i++) { await step(1); if ((await S()).s.traps.length) life = i; else if (i > 30) break }
  check('traps expire after 6 s (360 f)', Math.abs(life - 360) <= 14, life)

  section('D3 REV (run pips) + Rock Hold armor')
  await fresh(-2400, { ax: 2300 }); await raw('p1', f => { f.facing = -1 })
  await dtap('a'); await page().keyboard.down('a'); for (let i = 0; i < 170; i++) await step(1)
  s1 = await S(); await page().keyboard.up('a')
  check('REV: 0.8 s of running per pip, max 3', s1.s.rev.pips === 3, s1.s.rev)
  await settle(30)
  await fresh(110, { ax: 800 }); await page().keyboard.down('d'); await tap(['p'], 1); await page().keyboard.up('d')
  for (let i = 0; i < 12; i++) await step(1)   // past the parry window → armor
  s1 = await S(); const ah = s1.health; const fh = await hp()
  await foeAt(s1.x + 48 + 30, -1)
  for (let k = 0; k < 2; k++) { await call('move', 'light', 'p2'); for (let i = 0; i < 16; i++) await step(1) }
  s1 = await S()
  check('Rock Hold armor absorbs 2 hits (no damage)', s1.health === ah && (s1.s.stats?.absorbed || 0) >= 1, { dealt: ah - s1.health, absorbed: s1.s.stats?.absorbed })
  for (let i = 0; i < 20; i++) await step(1)
  check(`… then a shockwave counter (70 → ${dmg(70)})`, fh - await hp() === dmg(70), fh - await hp())
  await shot('rock_hold_dustin')
  await settle(60)

  section('D4 Earth Double (decoy Mirror) + Ground Pound OTG')
  await fresh(500, { ax: 700 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1)
  let a = await S(); const ix0 = a.s.mirror.ix
  for (let i = 0; i < 30; i++) await step(1); a = await S()
  check('Earth Double: a still, guarding decoy (does not echo)', a.s.mirror.ix === ix0 && a.s.mirror.pose === 'guard', { ix: a.s.mirror.ix, was: ix0, pose: a.s.mirror.pose })
  await shot('earth_double')
  // burrow → swap from underground
  await dtap('s'); await page().keyboard.down('l'); await step(10); const bx = (await S()).x
  await tap(['p'], 1); for (let i = 0; i < 10; i++) await step(1)
  a = await S(); await page().keyboard.up('l')
  check('Burrow swap: Charge while burrowed trades places with the decoy', Math.abs(a.x - ix0) < 30 && a.s.mirror && Math.abs(a.s.mirror.ix - bx) < 30, { x: a.x, ix: a.s.mirror?.ix, decoyWas: ix0, burrowX: bx })
  await settle(80)
  // decoy struck → eruption counter (80, wall bounce)
  await fresh(500, { ax: 700 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1)
  a = await S(); { const sd = Math.sign(a.s.mirror.ix - a.x) || 1; await foeAt(a.s.mirror.ix + sd * 68); await raw('p2', f => { f.facing = f.x > __harness.ninjaTest.raw('p1').x ? -1 : 1 }) }
  h0 = await hp(); await call('move', 'light', 'p2'); for (let i = 0; i < 30; i++) await step(1)
  a = await S()
  check(`decoy struck → eruption under the attacker (80 → ${dmg(80)}), the Double ends`, !a.s.mirror && a.s.lastMirrorEnd === 'illusion' && h0 - await hp() === dmg(80), { why: a.s.lastMirrorEnd, dealt: h0 - await hp() })
  await settle(60)
  // Ground Pound shockwave hits OTG
  await fresh(120, { ax: 700 }); await raw('p2', f => { f.knockdownState = true; f.knockdownTimer = 80 }); await tap(['w']); await step(12); h0 = await hp()
  await page().keyboard.down('s'); await tap(['k']); await page().keyboard.up('s'); seen = await moveSeen(40)
  check(`Ground Pound shockwave (80 → ${dmg(80)}) hits a knocked-down foe (OTG)`, seen.includes('dive') && h0 - await hp() === dmg(80), { seen, dealt: h0 - await hp() })
  await shot('ground_pound')
  await settle(80)

  section('D5 Dustin supers')
  await fresh(160, { ax: 700, energy: 100 }); h0 = await hp()
  await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], 'l', 1)
  let sup = null, enAt = null; for (let i = 0; i < 130; i++) { await step(1); const q = await S(); if (q.s.sup) { if (!sup) enAt = q.energy; sup = q.s.sup.kind; if (i === 40) await shot('earthquake') } }
  check('↓↘→↓↘→ + Special (1 bar) = EARTHQUAKE NINJA ART', sup === 'sSuper' && enAt <= 50.5, { sup, enAt })
  check(`Earthquake deals its scripted total (320 raw → ~${dmg(320)})`, h0 - await hp() >= dmg(320) * 0.9 && h0 - await hp() <= dmg(320) * 1.05, h0 - await hp())
  await settle(60)
  await fresh(300, { ax: 700, energy: 100 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1); h0 = await hp()
  await tap(['u']); sup = null; for (let i = 0; i < 110; i++) { await step(1); const q = await S(); if (q.s.sup?.kind === 'sUlt') { sup = 'sUlt'; if (i === 30) await shot('fault_line') } }
  check(`Ultimate in the Double = FAULT LINE (390 raw → ~${dmg(390)})`, sup === 'sUlt' && h0 - await hp() >= dmg(390) * 0.9 && h0 - await hp() <= dmg(390) * 1.05, { sup, dealt: h0 - await hp() })
  await settle(60)
}
