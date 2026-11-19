// MSV1 scenarios B — Shadow Clones, Ninja Mirror (illusion, swap, echo, identity, counters), Ninja Barrier (parry / reflect / armor).
export async function run(X) {
  const { step, S, call, shot, tap, dtap, fresh, settle, hp, check, section } = X
  const page = () => X.page
  const G = await page().evaluate(async () => (await import('./combat.js')).GLOBAL_DAMAGE_SCALE)
  const raw = (w, fn) => page().evaluate(([w, fn]) => { const f = __harness.ninjaTest.raw(w); return (new Function('f', 'return (' + fn + ')(f)'))(f) }, [w, fn.toString()])
  const foeAt = (x, w = 'p2') => page().evaluate(([x, w]) => { const f = __harness.ninjaTest.raw(w); f.x = x; f.vx = 0 }, [x, w])
  const p2Jab = () => call('move', 'light', 'p2')

  section('B1 Shadow Clones (← + Charge)')
  await fresh(170, { ax: 800 })
  let s0 = await S(); const h0 = await hp()
  await page().keyboard.down('a'); await tap(['p'], 1); await page().keyboard.up('a'); await step(4)
  const sC = await S()
  let shotDone = false, maxClones = 0, popped = false
  for (let i = 0; i < 80; i++) { await step(1); const q = await S(); maxClones = Math.max(maxClones, q.s.clones.length); if (!shotDone && q.s.clones.some(c => c.phase === 'fan' || c.phase === 'strike')) { await shot('clones_shane'); shotDone = true } if (!q.s.cloneJob && i > 10) break }
  let s1 = await S(); const h1 = await hp()
  check('← + Charge: hand sign → TWO clones fan out', maxClones === 2, maxClones)
  check('Shadow Clones cost 35 Ninja Power', Math.abs((s0.s.np - sC.s.np) - 35) <= 1, s0.s.np - sC.s.np)
  const cloneHit = Math.floor(Math.floor(45 * 0.6 * 1.6 * 1) * 1)
  check('unison strike lands (two clones at 60% each)', h0 - h1 > 0, h0 - h1)
  // a clone cannot land the KO
  await fresh(170, { ax: 800 }); await raw('p2', f => { f.health = 5 })
  await page().keyboard.down('a'); await tap(['p'], 1); await page().keyboard.up('a')
  for (let i = 0; i < 80; i++) { await step(1); if (!(await S()).s.cloneJob && i > 10) break }
  check('clones never land the KO (foe at 5 HP survives on 1+)', (await hp()) >= 1, await hp())
  // one hit pops a clone
  await fresh(170, { ax: 800 }); await call('clones', 'p1')
  let pops = 0
  for (let i = 0; i < 70; i++) {
    await step(1); const q = await S()
    const ready = q.s.clones.filter(c => c.phase === 'ready')
    if (ready.length === 2 && !pops) { const c = ready.sort((u, v) => v.x - u.x)[0]; await foeAt(c.x + 24 + 50); await raw('p2', f => { f.facing = -1 }); await p2Jab(); pops = -1 }
    if (q.s.stats?.clonePops) { pops = q.s.stats.clonePops; break }
  }
  check('one hit pops a clone (smoke, the strike is spent on the copy)', pops >= 1, pops)
  await settle(60)

  section('B2 Ninja Mirror (↓↓ + Charge)')
  await fresh(500, { ax: 700 })
  s0 = await S()
  await dtap('s'); await tap(['p'], 1); for (let i = 0; i < 8; i++) await step(1)
  s1 = await S(); const m = s1.s.mirror
  check('↓↓ + Charge raises the Ninja Mirror', !!m, m ? 'on' : 'off')
  check('Mirror costs 50 Ninja Power', m && Math.abs((s0.s.np - s1.s.np) - 50) <= 2, s0.s.np - s1.s.np)
  const gap = m ? Math.abs((m.ix) - s1.x) : 0
  check('real + illusion stand ~30% of the screen apart', m && Math.abs(gap - 0.30 * (await page().evaluate(async () => (await import('./rangers.js')).RANGER_SCREEN))) < 12, gap)
  await shot('mirror_shane')
  // which spot is real is a seeded hash: deterministic for the same seed + frame, never the same side every time
  const sides = await page().evaluate(async () => {
    const N = await import('./ninja.js'), out = []
    for (let seed = 1; seed <= 24; seed++) {
      N.setNinjaWorld({ seed: () => seed, frame: () => 1000, stageWidth: () => 2560 })
      const f = { rosterKey: 'ns_red', playerNumber: 1, x: 800, y: 300, w: 48, h: 94, facing: 1, health: 1000, onGround: true, grounded: true }
      N.ninjaState(f).np = 100; N.startMirror(f, null); out.push(f.x === 800 ? 'stay' : 'move')
      const g = { ...f, x: 800, _ninja: undefined }; N.ninjaState(g).np = 100; N.startMirror(g, null); out.push((g.x === 800 ? 'stay' : 'move') === out[out.length - 1])
    }
    return out
  })
  const pairs = []; for (let i = 0; i < sides.length; i += 2) pairs.push(sides[i])
  check('real spot = hash(seed, frame, player, slot): both outcomes occur across seeds', pairs.includes('stay') && pairs.includes('move'), pairs.join(','))
  check('same seed + frame → same real spot (deterministic)', sides.filter((v, i) => i % 2 === 1).every(Boolean))
  // SWAP
  let a = await S(); const ixBefore = a.s.mirror.ix, xBefore = a.x
  await tap(['p'], 1); for (let i = 0; i < 16; i++) await step(1)
  let b = await S()
  check('Charge alone in the Mirror = SWAP: the two trade places', Math.abs(b.x - ixBefore) < 30 && Math.abs(b.s.mirror.ix - xBefore) < 2, { x: b.x, ix: b.s.mirror.ix, was: [xBefore, ixBefore] })
  check('swap costs 10 (minus regen while it plays)', Math.abs((a.s.np - b.s.np) - 10) <= 2, a.s.np - b.s.np)
  await call('np', 'p1', 100)
  for (let k = 0; k < 3; k++) { await tap(['p'], 1); for (let i = 0; i < 10; i++) await step(1) }
  b = await S()
  check('max 3 swaps per Mirror', b.s.mirror.swaps === 3, b.s.mirror.swaps)
  // ECHO: the illusion repeats Shane's attack 8 frames later at 50%, no KO
  await fresh(500, { ax: 700 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1)
  a = await S(); const ix = a.s.mirror.ix, side = Math.sign(ix - a.x) || 1
  await foeAt(ix + side * (48 + 10)); await raw('p2', f => { f.facing = f.x > __harness.ninjaTest.raw('p1').x ? -1 : 1 })
  const eh0 = await hp(); await tap(['j'], 1)
  let echoAt = null, realHit = null
  for (let i = 1; i <= 24; i++) { await step(1); const q = await S(); if (q.s.stats?.strikes && echoAt == null && (await hp()) < eh0) echoAt = i }
  const eh1 = await hp()
  const want = Math.floor(38 * 1.6 * G * 0.5)
  check('ECHO: the illusion repeats the jab ~8 frames later, at 50% damage', echoAt != null && echoAt >= 8 && echoAt <= 16 && Math.abs((eh0 - eh1) - want) <= 1, { echoAt, dealt: eh0 - eh1, want })
  // HIT THE ILLUSION → counter, the Mirror ends, Shane takes nothing
  await fresh(500, { ax: 700 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1)
  a = await S(); { const sd = Math.sign(a.s.mirror.ix - a.x) || 1; await foeAt(a.s.mirror.ix + sd * (48 + 20)); await raw('p2', f => { f.facing = f.x > __harness.ninjaTest.raw('p1').x ? -1 : 1 }) }
  const me0 = a.health, foe0 = await hp()
  await p2Jab(); let endedWhy = null
  for (let i = 0; i < 40; i++) { await step(1); const q = await S(); if (!q.s.mirror && endedWhy == null) { endedWhy = q.s.lastMirrorEnd; await shot('illusion_counter_shane') } }
  b = await S()
  check('hitting the ILLUSION ends the Mirror (illusion pops)', endedWhy === 'illusion', endedWhy)
  check('… the real Shane takes no damage from it', b.health === me0, me0 - b.health)
  check('… and the Wind Mirage counters the attacker (tornado, 3 × 18)', (await hp()) < foe0, foe0 - (await hp()))
  // HIT THE REAL ONE → the Mirror ends
  await fresh(500, { ax: 700 }); await call('mirror', 'p1'); for (let i = 0; i < 14; i++) await step(1)
  a = await S(); { const sd = -(Math.sign(a.s.mirror.ix - a.x) || 1); await foeAt(a.x + sd * (48 + 20)); await raw('p2', f => { f.facing = f.x > __harness.ninjaTest.raw('p1').x ? -1 : 1 }) }
  await p2Jab(); endedWhy = null
  for (let i = 0; i < 30; i++) { await step(1); const q = await S(); if (!q.s.mirror && endedWhy == null) endedWhy = q.s.lastMirrorEnd }
  check('hitting the REAL one ends the Mirror', endedWhy === 'real', endedWhy)
  // times out
  await fresh(900, { ax: 700 }); await call('mirror', 'p1')
  let tEnd = null; for (let i = 0; i < 500; i++) { await step(1); const q = await S(); if (!q.s.mirror) { tEnd = i; break } }
  check('Mirror lasts 8 s (480 frames)', tEnd != null && Math.abs(tEnd - 480) <= 3, tEnd)

  section('B3 Ninja Barrier (→ + Charge)')
  await fresh(110, { ax: 800 })
  await page().keyboard.down('d'); await tap(['p'], 1); await page().keyboard.up('d')
  for (let i = 0; i < 3; i++) { await step(1); a = await S(); if (a.s.barrier) break }
  check('→ + Charge raises the Barrier (parry window first)', a.s.barrier?.phase === 'parry', a.s.barrier)
  await raw('p2', f => { f.facing = -1 }); const bh0 = a.health
  await p2Jab(); for (let i = 0; i < 12; i++) await step(1)
  b = await S(); const z = await S('p2')
  check('PARRY: a melee hit inside the 8-frame window does no damage', b.health === bh0, bh0 - b.health)
  check('… and staggers the attacker', z.hitstun > 0 || b.s.barrier?.parried >= 1, { hitstun: z.hitstun, parried: b.s.barrier?.parried })
  await shot('barrier_shane')
  await settle(120)
  // Shane's PARRY REFLECTS a projectile (1.2× speed + damage)
  await fresh(600, { ax: 600 })
  await page().evaluate(async () => { const A = await import('./abilities.js'); const z = __harness.ninjaTest.raw('p2'), a = __harness.ninjaTest.raw('p1'); A.activeProjectiles.push({ name: 'testBolt', owner: z, x: a.x + 120, y: a.y + 40, vx: -8, vy: 0, w: 20, h: 20, radius: 10, damage: 40, lifetime: 120, hitTargets: [] }) })
  await call('barrier', 'p1')
  let refl = null
  for (let i = 0; i < 10; i++) { await step(1); const pr = (await call('projectiles')).find(p => p.name === 'testBolt'); if (pr && pr.owner === 'p1') { refl = pr; break } }
  check('Wind Ward: a projectile met by the parry is REFLECTED (now Shane\'s, flies back 1.2×)', refl && refl.vx > 0 && Math.abs(refl.vx - 9.6) < 0.01 && Math.abs(refl.damage - 48) < 0.01, refl)
  await page().evaluate(async () => { const A = await import('./abilities.js'); for (let i = A.activeProjectiles.length - 1; i >= 0; i--) if (A.activeProjectiles[i].name === 'testBolt') A.activeProjectiles.splice(i, 1) })
  await settle(120)
}
