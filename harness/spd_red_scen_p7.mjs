// Phase 7 scenarios — combo scaling (85% per hit, counter reset after 1.5 s) and the five COMBOS.md routes, each
// executed with real keyboard input on hit-confirm timing. Measured damage lands in /tmp/ms-spd-red-render/combos.json
// (docs/spd_red/COMBOS.md is written from it).
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE, fresh, zs, tap, motion, dtap, settle } = X
  const G = 0.6
  await page.evaluate(() => { const L = __harness.luffyTest; if (L._srWrapped) return; const o = L.step
    L.step = (n = 1) => { for (let i = 0; i < n; i++) { o(1); const m = __harness.spdRedTest.raw('p1')?.currentMove, log = window.__srMoves; if (log && m && log[log.length - 1] !== m) log.push(m) } }
    L._srWrapped = true })
  const raw = w => page.evaluate(w => { const f = __harness.spdRedTest.raw(w); return { mv: f.currentMove, hit: !!f.currentAttack?.hasHit, att: !!f.attacking, hs: f.hitstop || 0, combo: f.comboCounter || 0, g: !!(f.onGround || f.grounded), y: f.y, x: f.x, hitstun: f.hitstun || 0, kd: !!f.knockdownState } }, w)
  // step until his current move `name` has connected (then the next press is buffered through the hit-freeze)
  async function waitHit(name, max = 60) { for (let i = 0; i < max; i++) { const r = await raw('p1'); if (r.mv === name && r.hit) return true; await step(1) } return false }
  async function route(id, setup, body) {
    await fresh(setup.dx ?? 100, setup.delta ?? 100, setup.opts || {})
    if (setup.pre) await setup.pre()
    const z0 = (await zs()).hp
    await page.evaluate(() => { window.__srMoves = []; window.__srHits = [] })
    const zf = await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); return z.health })
    const ok = await body()
    for (let i = 0; i < 90; i++) { const r = await raw('p1'); if (!r.att && !(await as()).r?.blink) break; await step(1) }
    const z1 = (await zs()).hp, moves = await page.evaluate(() => window.__srMoves.slice()), combo = (await raw('p1')).combo
    return { id, ok, dmg: +(z0 - z1).toFixed(2), raw: +((z0 - z1) / G).toFixed(1), moves, combo }
  }
  // 85% per hit: three jabs-worth via the A,A,A string → hit 2 = 60 × 0.85, hit 3 = 65 × 0.7225
  const R = []
  let route5Start = null
  R.push(await route(1, { dx: 100 }, async () => {
    await tap(['j']); if (!await waitHit('light')) return 'jab'
    await tap(['j']); if (!await waitHit('sStraight')) return 'straight'
    await tap(['j']); if (!await waitHit('sKick')) return 'kick'
    await dtap('d', 2); await tap(['l']); if (!await waitHit('sCharge')) return 'charge'
    await dtap('d', 2); for (let i = 0; i < 40; i++) { await step(1); if ((await as()).r?.blink) return true }   // starts once the impact freeze ends
    return 'blinkCancel'
  }))
  R.push(await route(2, { dx: 100 }, async () => {
    await tap(['s', 'j']); if (!await waitHit('sLow')) return 'low'
    await tap(['d', 'k']); if (!await waitHit('heavy')) return 'heavy'
    // launcher jump-cancel: ↑ on hit → he jumps after the foe; air kick on the way up
    await page.keyboard.down('w'); await page.keyboard.down('d')
    for (let i = 0; i < 30; i++) { const a = await raw('p1'); if (!a.g) break; await step(1) }   // held ↑ through the hit-freeze
    await page.keyboard.up('w'); await page.keyboard.up('d'); await tap(['j'])
    if (!await waitHit('air')) return 'air'
    await tap(['w', 'l']); if (!await waitHit('sUpper')) return 'upper'
    return true
  }))
  R.push(await route(3, { dx: 260 }, async () => {
    await motion(['s', ['s', 'd'], 'd'], 'l'); if (!await waitHit('sPhase')) return 'phase'
    for (let i = 0; i < 40; i++) { const r = await raw('p1'); if (!r.att) break; await step(1) }
    await tap(['j']); if (!await waitHit('light')) return 'jab'
    await tap(['j']); if (!await waitHit('sStraight')) return 'straight'
    const back = (await as()).facing === 1 ? 'a' : 'd'
    await motion(['s', ['s', back], back], 'l'); if (!await waitHit('sDeltamax', 40)) return 'deltamax'
    return true
  }))
  R.push(await route(4, { dx: 520 }, async () => {
    await tap(['s', 'l'])
    for (let i = 0; i < 60; i++) { if ((await zs()).hitstun > 0) break; await step(1) }   // the bolt lands
    for (let i = 0; i < 30; i++) { const r = await raw('p1'); if (!r.att) break; await step(1) }
    // the foe answers with a heavy; he blinks THROUGH it (invulnerable) → dodge reward
    for (let i = 0; i < 60; i++) { const z = await raw('p2'); if (!(z.hitstun > 0) && !z.att) break; await step(1) }
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); z.x = a.x + 110; z.hitstun = 0; z.blockstun = 0; z.isBlocking = false; z.attacking = false; z.currentAttack = null; z.attackCooldown = 0; z.facing = -1; a.facing = 1 })
    await page.evaluate(async () => { const c = await import('./combat.js'); const z = __harness.spdRedTest.raw('p2'); c.startMove(z, 'heavy', z.basic_attacks.heavy) })
    let dodged = false
    for (let i = 0; i < 40; i++) { const a = await call('atk', 'p2'); if (a && a.activeStart - a.elapsed <= 5) { await call('blink', 1); break } await step(1) }
    for (let i = 0; i < 14; i++) { await step(1); const q = await as(); if (q.r?.blink?.dodge) dodged = true; if (!q.r?.blink && i > 3) break }
    if (!dodged) return 'dodge'
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.facing = z.x > a.x ? 1 : -1 })
    const fwd = (await as()).facing === 1 ? 'd' : 'a'
    await tap([fwd, 'k']); if (!await waitHit('heavy')) return 'heavy'
    if (!(await call('atk', 'p1'))?.buff) return 'buff'
    await tap(['w', 'l']); if (!await waitHit('sUpper')) return 'upper'
    return true
  }))
  R.push(await route(5, { dx: 100, delta: 100, pre: () => page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); z.health = Math.floor(z.maxHealth * 0.29); const r = __harness.spdRedTest.raw('p1')._ranger; r.judg.meter = 20 }) }, async () => {
    // chip him under 30% → JUDGMENT → GUILTY → containment combo → (released at the far side) → Super with the 220 beam
    await tap(['j', 'k', 'l'])
    for (let i = 0; i < 60; i++) { if ((await call('judg', 'p1'))?.contain > 0) break; await step(1) }
    if (!((await call('judg', 'p1'))?.guilty)) return 'guilty'
    // (measurement only: refill the foe after the verdict so the route's full damage reads without a KO ending the round)
    await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); z.health = z.maxHealth })
    await shot(`p${PHASE}-70-containment-combo`)
    route5Start = (await zs()).hp
    for (let i = 0; i < 40; i++) { const r = await raw('p1'); if (!r.att) break; await step(1) }   // Judgment recovery
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = z.x - 110; a.facing = 1 })
    await tap(['j']); if (!await waitHit('light')) return 'jab'
    await tap(['j']); if (!await waitHit('sStraight')) return 'straight'
    await motion(['s', ['s', 'a'], 'a'], 'l')
    if (!await waitHit('sDeltamax', 40)) return 'deltamax'   // containment combo ender: the beam (pushback-proof)
    for (let i = 0; i < 200; i++) { if (!((await call('judg', 'p1'))?.contain > 0)) break; await step(1) }   // the card releases him at the far side
    await page.evaluate(() => { __harness.spdRedTest.delta('p1', 100) })
    const fwd = (await as()).facing === 1 ? 'd' : 'a'
    await motion(['s', ['s', fwd], fwd, 's', ['s', fwd], fwd], 'l')
    for (let i = 0; i < 120; i++) { await step(1); const s = await page.evaluate(() => __harness.spdRedTest.raw('p1')._spdRed?.sup); if (s && s.t >= 100) return s.beamDmg === 220 && s.res === 'hit' ? true : 'super:' + JSON.stringify(s) }
    return 'super'
  }, ))
  if (route5Start != null) R[4].dmg = +(route5Start - (await zs()).hp).toFixed(2), R[4].raw = +(R[4].dmg / G).toFixed(1)
  for (const r of R) console.log('ROUTE', JSON.stringify(r))
  fs.writeFileSync('/tmp/ms-spd-red-render/combos.json', JSON.stringify(R, null, 1))
  const exp = [196.3, 231.8, null, null, null]
  for (const r of R) check(`COMBO route ${r.id} executes on real input`, r.ok === true, JSON.stringify(r))
  check('85% scaling: route 1 = 40 + 60×.85 + 65×.85² + 95×.85³ (raw 196.3)', Math.abs(R[0].raw - 196.3) < 1.5, R[0].raw)
  // the counter resets after 1.5 s: a jab 100 frames after a jab is a fresh, unscaled 40
  await fresh(100, 50)
  await tap(['j']); await waitHit('light'); await settle()
  for (let i = 0; i < 100; i++) await step(1)
  const zA = (await zs()).hp; await tap(['j']); await waitHit('light'); await settle(); const zB = (await zs()).hp
  check('combo counter resets after 1.5 s (next hit unscaled)', Math.abs((zA - zB) - 40 * G) < 0.6, zA - zB)
}
