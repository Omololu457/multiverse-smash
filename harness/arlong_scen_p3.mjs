// Phase 3 scenarios — FISHMAN IN HIS ELEMENT (water zones). Called by arlong_render_scenarios.mjs.
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE, fresh, zs, tap, settle } = X
  const ZW = 230, ZMAX = 384
  await fresh(600, 10)
  let s = await as()
  const cx = s.x + 24
  const z = await call('zone', cx)
  await step(10); s = await as()
  check('zone created in GAME_STATE {x,width,bornFrame,owner}', s.a.zones.length === 1 && ['x', 'width', 'bornFrame', 'owner'].every(k => k in s.a.zones[0]), JSON.stringify(s.a.zones))
  check('zone ≈ 18% of the 1280 reference screen (230 px)', s.a.zones[0].width === ZW, s.a.zones[0].width)
  check('Arlong standing in his zone → wet', s.a.wet === true)
  await shot(`p${PHASE}-20-water-zone`)
  // speed in water: 4.4 × 1.25 = 5.5 px/f
  await page.keyboard.down('d'); await step(4); const xa = (await as()).x; await step(6); const xb = (await as()).x; await page.keyboard.up('d'); await step(3)
  check('walks 5.5 px/f in his water (+25%)', Math.abs((xb - xa) / 6 - 5.5) < 0.05, ((xb - xa) / 6).toFixed(3))
  await shot(`p${PHASE}-21-wet-walk`)
  // Tide: +1/s passive + 2/s water = +3/s
  await page.evaluate(() => { __harness.arlongTest.tide('p1', 10); const a = __harness.arlongTest.raw('p1'); a.x = __harness.arlongTest.state().a.zones[0].x + 100 })
  await step(2); const t0 = (await as()).energy; await step(120); const t1 = (await as()).energy
  check('Tide +3/s in water (+1 passive +2 water)', t1 - t0 >= 5.5 && t1 - t0 <= 6.5, `${t0}→${t1}`)
  // +15% damage: same Jab dry vs wet
  const jab = async wet => {
    await fresh(120, 10)
    if (wet) { const q = await as(); await call('zone', q.x + 24) }
    await step(3); const z0 = await zs(); await tap(['j']); await settle(); const z1 = await zs(); return z0.hp - z1.hp
  }
  const dry = await jab(false), wetD = await jab(true)
  check('in-water hits deal +15% (Jab dry vs wet)', wetD > dry && Math.abs(wetD / dry - 1.15) < 0.06, `dry ${dry} wet ${wetD}`)
  // swim-dash: 8 invulnerable frames + ×1.25 dash
  await fresh(600, 10); s = await as(); await call('zone', s.x + 24, 384); await step(2)
  await page.keyboard.down('d'); await step(1); await page.keyboard.up('d'); await step(2); await page.keyboard.down('d'); await step(1); await page.keyboard.up('d')
  let inv = 0, dashed = false
  for (let i = 0; i < 4; i++) { await step(1); const q = await as(); if (q.dashTimer > 0) dashed = true; inv = Math.max(inv, q.invuln) }
  check('swim-dash in water → 8 invulnerable frames', dashed && inv >= 6 && inv <= 8, `dashed=${dashed} invuln=${inv}`)
  await settle(30)
  // merge: overlapping zones merge into one, capped at 30% (384)
  await fresh(800, 10); s = await as()
  await call('zone', s.x); await call('zone', s.x + 150); s = await as()
  check('overlapping zones MERGE (no stacking)', s.a.zones.length === 1 && s.a.zones[0].width > ZW, JSON.stringify(s.a.zones))
  await call('zone', s.a.zones[0].x + s.a.zones[0].width + 40); s = await as()
  check('merged zone capped at 30% (384 px)', s.a.zones.every(q => q.width <= ZMAX) && s.a.zones.length === 1, JSON.stringify(s.a.zones))
  // max 3: four separate zones → the oldest dries up
  await fresh(900, 10); s = await as()
  for (let k = 0; k < 4; k++) { await call('zone', 300 + k * 600); await step(2) }
  s = await as()
  check('never more than 3 zones (oldest removed)', s.a.zones.length === 3 && !s.a.zones.some(q => q.x + 115 === 300 || Math.abs(q.x + q.width / 2 - 300) < 2), JSON.stringify(s.a.zones.map(q => q.x)))
  await shot(`p${PHASE}-22-three-zones`)
  // expiry after 8 s
  await step(480); s = await as()
  check('zones dry up after 8 s (480 frames)', s.a.zones.length === 0, s.a.zones.length)
  // the opponent in his water: no buff, walks AWAY 10% further
  await fresh(300, 10)
  const walkZoro = async dir => { await page.evaluate(d => { const zr = __harness.arlongTest.raw('p2'); zr._forceWalk = d }, dir) }
  const zx = (await zs()).x; await call('zone', zx + 24, 384); await step(3)
  check('foe standing in his water flagged slick (away = +1)', (await call('slick')) === 1, await call('slick'))
  const sp = await page.evaluate(async () => { const ph = await import('./arlongState.js'); const zr = __harness.arlongTest.raw('p2'); return [ph.arlongWalkMul(zr, 1), ph.arlongWalkMul(zr, -1), ph.arlongDashMul({ ...zr, facing: 1 })] })
  check('foe walk-back / dash away ×1.10, toward ×1.00 (no buff)', sp[0] === 1.1 && sp[1] === 1 && sp[2] === 1.1, JSON.stringify(sp))
  if (PHASE >= 4) { const m = await import('./arlong_scen_p4.mjs'); await m.run(X) }
}
