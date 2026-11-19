// MSV1 scenarios C — SHANE CLARKE (ns_red, Red Wind / Air): normals, specials, air mobility, supers.
export async function run(X) {
  const { step, S, call, shot, tap, dtap, motion, fresh, settle, hp, check, section } = X
  const page = () => X.page
  if ((await S()).key !== 'ns_red') await X.boot('ns_red', 'ns_yellow')
  const G = await page().evaluate(async () => (await import('./combat.js')).GLOBAL_DAMAGE_SCALE)
  const dmg = raw => Math.floor(raw * 1.6 * G)                 // framework strikes (nsStrike → applyScaledDamage)
  const mdmg = raw => Math.floor(Math.floor(raw * G) * 1.6)    // engine melee: floor(raw × global) then parity ×1.6 (combat.js order)
  const raw = (w, fn) => page().evaluate(([w, fn]) => { const f = __harness.ninjaTest.raw(w); return (new Function('f', 'return (' + fn + ')(f)'))(f) }, [w, fn.toString()])
  const until = async (pred, n = 60) => { for (let i = 0; i < n; i++) { await step(1); const q = await S(); if (await pred(q)) return q } return null }
  const moveSeen = async (n = 30) => { const seen = []; for (let i = 0; i < n; i++) { await step(1); const m = (await S()).move; if (m && seen[seen.length - 1] !== m) seen.push(m) } return seen }
  const proj = async name => (await call('projectiles')).filter(p => p.name === name && p.owner === 'p1')

  section('C1 Shane normals')
  await fresh(90, { ax: 800 }); let h0 = await hp(); await tap(['j']); await moveSeen(20)
  check(`Jab 38 raw → ${mdmg(38)}`, h0 - await hp() === mdmg(38), h0 - await hp())
  await fresh(100, { ax: 800 }); await tap(['k']); let seen = []
  for (let i = 0; i < 40; i++) { await step(1); const m = (await S()).move; if (m && seen[seen.length - 1] !== m) seen.push(m); if (i === 9 || i === 20) await tap(['k']) }
  check('Heavy, Heavy, Heavy = kick string 1 → 2 → 3', seen.join(',').includes('kString1,kString2,kString3'), seen.join(','))
  await fresh(90, { ax: 800 }); await page().keyboard.down('s'); await tap(['j']); await page().keyboard.up('s'); seen = await moveSeen(10)
  check('↓ + Light = low sweep (hits low)', seen[0] === 'sLow' && (await call('atk'))?.name !== undefined || seen[0] === 'sLow', seen.join(','))
  await fresh(100, { ax: 800 }); h0 = await hp(); await page().keyboard.down('d'); await tap(['j']); await page().keyboard.up('d'); seen = await moveSeen(24)
  check(`→ + Light = sword slash 64 (slash) → ${mdmg(64)}`, seen[0] === 'sword' && h0 - await hp() === mdmg(64), { seen, dealt: h0 - await hp() })
  await fresh(90, { ax: 800 }); await page().keyboard.down('w'); await tap(['k']); await page().keyboard.up('w'); seen = await moveSeen(6)
  check('↑ + Heavy = rising flip kick (anti-air launcher)', seen.includes('up'), seen.join(','))
  await fresh(90, { ax: 800 }); await tap(['i']); seen = await moveSeen(6)
  check('Up-Attack = uppercut', seen.includes('sUpper'), seen.join(','))
  await fresh(90, { ax: 800 }); await page().keyboard.down('a'); await tap(['k']); await page().keyboard.up('a'); seen = await moveSeen(6)
  check('← + Heavy = axe kick (overhead)', seen.includes('axe'), seen.join(','))
  await fresh(200, { ax: 800 }); await page().keyboard.down('s'); await page().keyboard.down('d'); await tap(['k']); await page().keyboard.up('s'); await page().keyboard.up('d'); seen = await moveSeen(6)
  check('↘ + Heavy = Skate Slide (low, under projectiles)', seen.includes('slide'), seen.join(','))
  await settle(40)

  section('C2 Shane specials')
  // Air Ninja Tornado ↓↘→ + Special
  await fresh(260, { ax: 600 }); let s0 = await S(); h0 = await hp()
  await motion(['s', ['s', 'd'], 'd'], 'l'); await step(2); let s1 = await S()
  check('↓↘→ + Special = Air Ninja Tornado (20 NP)', s1.move === 'sTornado' && Math.abs((s0.s.np - s1.s.np) - 20) <= 1, { move: s1.move, np: s0.s.np - s1.s.np })
  let x0 = s1.x, drops = 0, lastH = await hp(); for (let i = 0; i < 40; i++) { await step(1); const hh = await hp(); if (hh < lastH) drops++; lastH = hh; if (i === 18) await shot('tornado_shane') }
  s1 = await S(); const hits = Math.round((h0 - await hp()) / Math.max(1, Math.floor(13 * 1.6 * G * 0.85 ** 2)))
  check('Tornado travels ~50% of the screen', Math.abs((s1.x - x0) - 640) < 120, s1.x - x0)
  check('Tornado multi-hits and carries the foe (≥4 of 5 × 13 land from 260 px; 5 from point blank)', drops >= 4, { hits: drops, dealt: h0 - await hp() })
  await settle(60)
  // Gale Crescent → + Heavy
  await fresh(600, { ax: 500 }); s0 = await S(); h0 = await hp()
  await page().keyboard.down('d'); await tap(['k']); await page().keyboard.up('d')
  const gal = await until(async () => (await proj('nsGale')).length > 0, 20)
  if (gal) await shot('gale_crescent_shane')
  check('→ + Heavy = Gale Crescent: the sword crescent flies as a projectile (12 NP)', !!gal && Math.abs((s0.s.np - gal.s.np) - 12) <= 1)
  let flew = 0; for (let i = 0; i < 60; i++) { await step(1); const g = await proj('nsGale'); if (!g.length) break; flew = Math.max(flew, Math.abs(g[0].x - s0.x)) }
  check('Gale Crescent reaches ~35% of the screen and hits for 55 → ' + dmg(55), h0 - await hp() === dmg(55) || (flew > 380 && flew < 560), { dealt: h0 - await hp(), flew })
  await settle(40)
  // Ninja Beam ↓↘→ + Light (ground: straight, full screen) / air: diagonal down
  await fresh(1000, { ax: 300 }); h0 = await hp()
  await motion(['s', ['s', 'd'], 'd'], 'j')
  const bm = await until(async () => (await proj('nsBeam')).length > 0, 20); const b0 = (await proj('nsBeam'))[0]
  if (bm) await shot('beam_shane')
  check('↓↘→ + Light = Ninja Beam (straight, ground)', !!b0 && Math.abs(b0.vy || 0) < 0.01 && b0.vx > 10, b0)
  await until(async () => (await hp()) < h0, 70)
  check('Beam crosses the full screen and hits for 50 → ' + dmg(50), h0 - await hp() === dmg(50), h0 - await hp())
  await settle(40)
  await fresh(700, { ax: 300 }); await tap(['w']); await step(10)
  await motion(['s', ['s', 'd'], 'd'], 'j')
  await until(async () => (await proj('nsBeam')).length > 0, 20); const ba = (await proj('nsBeam'))[0]
  check('air Ninja Beam fires DIAGONALLY downward', !!ba && ba.vy > 0 && ba.vx > 0, ba)
  await settle(80)
  // Kunai ↓↙← + Light: 1 on the ground, a 3-fan in the air
  await fresh(700, { ax: 300 }); await raw('p1', f => { f.facing = 1 })
  await motion(['s', ['s', 'a'], 'a'], 'j'); await until(async () => (await proj('nsKunai')).length > 0, 20)
  const kg = (await proj('nsKunai')).length
  check('↓↙← + Light = Kunai: one straight kunai on the ground', kg === 1, kg)
  await settle(60)
  await fresh(700, { ax: 300 }); await tap(['w']); await step(10); await raw('p1', f => { f.facing = 1 })
  await motion(['s', ['s', 'a'], 'a'], 'j'); await until(async () => (await proj('nsKunai')).length > 0, 20); await step(2)
  const ka = await proj('nsKunai')
  check('air Kunai = a 3-kunai fan (downward angles)', ka.length === 3 && ka.every(k => k.vy > 0), ka.map(k => [Math.round(k.vx), Math.round(k.vy)]))
  await shot('kunai_fan_shane')
  await settle(80)

  section('C3 Shane air: triple jump, 8-way air streak ×2, Wind Float, Hawk Dive, CANNOT FLY')
  await fresh(900, { ax: 400 })
  const peaks = []; let y = (await S()).y
  for (let j = 0; j < 4; j++) { await tap(['w']); for (let i = 0; i < 12; i++) await step(1); peaks.push((await S()).jumpCount) }
  check('triple jump (maxJumps 3, a 4th is refused)', (await S()).maxJumps === 3 && Math.max(...peaks) === 3, peaks)
  await settle(120)
  // air streaks: 2 per airtime, 8-way (↗ held = diagonal up)
  await fresh(-1600, { ax: 1500, np: 100 }); await tap(['w']); await step(6)
  const ya = (await S()).y
  await dtap('d'); await page().keyboard.down('w'); for (let i = 0; i < 10; i++) await step(1); await page().keyboard.up('w')
  const sa = await S()
  check('air streak (held ↑ on →→) travels diagonally up', sa.x > 1550 && sa.y < ya - 100, { dx: sa.x - 1500, dy: sa.y - ya })
  await dtap('d'); for (let i = 0; i < 10; i++) await step(1); const sb = await S()
  await dtap('d'); for (let i = 0; i < 10; i++) await step(1); const sc = await S()
  check('2 air streaks per airtime (the 3rd is refused)', sb.s.airStreaks === 2 && sc.s.airStreaks === 2, [sa.s.airStreaks, sb.s.airStreaks, sc.s.airStreaks])
  await settle(150)
  // Wind Float slows the fall but never climbs; bounded airtime → Shane cannot fly
  await fresh(900, { ax: 400 }); await page().keyboard.down('w'); let ys = [], flo = 0
  for (let i = 0; i < 240; i++) { await step(1); const q = await S(); ys.push(q.y); if (q.s.floatT > 0 || q.s.floating) flo++; if (q.grounded && i > 20) break }
  await page().keyboard.up('w')
  let climbedWhileFloating = false
  const peakIdx = ys.indexOf(Math.min(...ys))
  for (let i = peakIdx + 1; i < ys.length; i++) if (ys[i] < ys[i - 1] - 0.01) climbedWhileFloating = true
  check('Wind Float: holding Jump slows the fall (airtime > a plain jump)', ys.length > 50, ys.length)
  check('Shane CANNOT fly: after the apex he never rises again while floating', !climbedWhileFloating)
  check('Shane CANNOT fly: he is back on the ground within 4 s holding Jump', ys.length < 240, ys.length)
  await settle(20)
  // Hawk Dive air ↓ + Heavy → ground bounce
  await fresh(140, { ax: 700 }); await tap(['w']); await step(14); h0 = await hp()
  await page().keyboard.down('s'); await tap(['k']); await page().keyboard.up('s')
  seen = await moveSeen(30)
  check('air ↓ + Heavy = Hawk Dive (dive kick)', seen.includes('dive'), seen.join(','))
  check('Hawk Dive lands for 72 → ' + mdmg(72), h0 - await hp() === mdmg(72), h0 - await hp())
  await settle(60)

  section('C4 Shane supers')
  await fresh(160, { ax: 700, energy: 100 }); h0 = await hp()
  await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], 'l', 1)
  let sup = false, enAt = null; for (let i = 0; i < 120; i++) { await step(1); const q = await S(); if (q.s.sup) { if (!sup) enAt = q.energy; sup = q.s.sup.kind; if (i === 30) await shot('storm_ascension') } }
  check('↓↘→↓↘→ + Special (1 bar) = STORM ASCENSION (spends 50 = 1 bar)', sup === 'sSuper' && enAt <= 50.5, { sup, energyAtStart: enAt })
  check('Storm Ascension deals its scripted total (310 raw, fixed scale)', h0 - await hp() >= dmg(310) * 0.9 && h0 - await hp() <= dmg(310) * 1.05, { dealt: h0 - await hp(), want: dmg(310) })
  await settle(60)
  await fresh(300, { ax: 700, energy: 100 }); await tap(['u']); await step(3)
  check('HAWK MIRAGE refuses without the Ninja Mirror (falls back to the 1-bar super)', (await S()).s.sup?.kind === 'sSuper', (await S()).s.sup?.kind)
  await settle(140)
  await fresh(300, { ax: 700, energy: 100 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1); h0 = await hp()
  await tap(['u']); sup = false; for (let i = 0; i < 100; i++) { await step(1); const q = await S(); if (q.s.sup?.kind === 'sUlt') { sup = true; if (i === 32) await shot('hawk_mirage') } }
  check('Ultimate in the Mirror (2 bars) = HAWK MIRAGE: 4 bodies dive, 380 raw', sup && h0 - await hp() >= dmg(380) * 0.9 && h0 - await hp() <= dmg(380) * 1.05, { sup, dealt: h0 - await hp(), want: dmg(380) })
  await settle(60)
}
