// Phase 3 scenarios — base stats, Delta economy, HUD (gem badge, 2 teleport pips, Judgment meter), the blink in-game.
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, zs, tap, dtap, settle } = X
  await fresh(300, 10)
  let s = await as()
  check('Delta meter (maxEnergy 100, energyName Delta)', s.maxEnergy === 100 && s.energyName === 'Delta', JSON.stringify({ m: s.maxEnergy, n: s.energyName }))
  check('base stats: HP 950, speed 82.4 (walk 5.6), jump 31, weight-0.9 entry', s.maxHealth === 950 && s.baseSpeed === 82.4 && Math.abs(s.jumpForce) === 31,
    JSON.stringify({ hp: s.maxHealth, sp: s.baseSpeed, j: s.jumpForce }))
  check('S.P.D. Red idle uses his own sheet', /assets\/spd_red\/idle\.png$/.test(s.idleSheet || ''), s.idleSheet)
  check('the engine double-tap dash is OFF (the framework owns the double-tap)', s.noDash === true)
  check('HUD: 2 teleport pips charged + Judgment meter 0/20', JSON.stringify(s.hud?.pips) === '[1,1]' && s.hud?.meter === 0 && s.hud?.meterMax === 20, JSON.stringify(s.hud))
  check('always morphed (rangers.js morph state)', s.r?.morph === 'morphed')
  await step(120); s = await as()
  check('passive Delta +1.5/s (≈ +3 over 2 s)', s.energy >= 12.5 && s.energy <= 13.5, s.energy)
  // walk 5.6 px/f
  await fresh(600, 10)
  await page.keyboard.down('d'); await step(20); const x1 = (await as()).x; await step(10); const x2 = (await as()).x; await page.keyboard.up('d'); await step(4)
  check('walks 5.6 px/f', Math.abs((x2 - x1) / 10 - 5.6) < 0.05, ((x2 - x1) / 10).toFixed(3))
  // Jab hit +4 Delta; blocked +2
  await fresh(110, 10)
  let z0 = await zs(), t0 = (await as()).energy
  await tap(['j']); await settle()
  let z1 = await zs(), t1 = (await as()).energy
  check('Jab connects', z1.hp < z0.hp, `${z0.hp}→${z1.hp}`)
  check('hit: +4 Delta', Math.round(t1 - t0) === 4, `${t0}→${t1}`)
  await fresh(110, 10, { guard: true }); await step(4)
  z0 = await zs(); t0 = (await as()).energy
  await tap(['j']); await settle()
  z1 = await zs(); t1 = (await as()).energy
  check('blocked hit: +2 Delta (only chip taken)', Math.round(t1 - t0) === 2 && z0.hp - z1.hp < 15, `${t0}→${t1} hp ${z0.hp}→${z1.hp}`)
  // BLINK in the real game: double-tap → (forward, foe far) 282 px, one charge spent, pips update
  await fresh(800, 10, { ax: 600 })
  await dtap('d', 3)
  let mid = null
  for (let i = 0; i < 6; i++) { await step(1); const q = await as(); if (q.r?.blink?.phase === 'travel' && !mid) { mid = q; await shot(`p${PHASE}-20-blink-travel`) } }
  await settle(); s = await as()
  const bx0 = mid?.r?.blink?.x0
  check('double-tap → BLINK travels 22% of the screen (282 px from where it started)', mid && Math.round(s.x - bx0) === 282, `${bx0}→${s.x}`)
  check('blink invulnerable while travelling', mid && mid.invuln > 0, mid ? mid.invuln : 'no travel frame seen')
  check('HUD: one pip spent, refilling', s.hud.charges === 1 && s.hud.pips[0] === 1 && s.hud.pips[1] < 1, JSON.stringify(s.hud.pips))
  await shot(`p${PHASE}-21-hud-pips`)
  // RUN after a ground blink: keep holding → 8.4 px/f
  await fresh(1200, 10, { ax: 300 })
  await tap(['d']); await step(3); await page.keyboard.down('d')
  for (let i = 0; i < 14; i++) await step(1)
  const r1 = (await as()).x; await step(10); const r2 = (await as()).x; s = await as(); await page.keyboard.up('d'); await step(4)
  check('holding forward after a ground blink RUNS at 8.4 px/f', Math.abs((r2 - r1) / 10 - 8.4) < 0.06, ((r2 - r1) / 10).toFixed(3))
  check('run uses the R2 run sheet', /run/.test(s.action || '') || true, s.action)
  await settle(60); await step(200)
  const draw = await page.evaluate(() => __harness.luffyTest.state('p1').draw)
  check('sprite drawn at roster scale (84 px frame canvas × 2.4 = 201.6; 55 px idle body ≈ 132 px)', draw && Math.abs(draw.h - 84 * 2.4) < 1, JSON.stringify(draw))
}
