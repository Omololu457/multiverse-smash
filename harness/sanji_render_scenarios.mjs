// harness/sanji_render_scenarios.mjs — phase-gated scenario checks for harness/sanji_render_check.mjs.
// P1 = Sanji vs P2 = Zoro, already in a live match. Real keyboard input for P1 (a=left d=right s=down w=up,
// j=Light k=Heavy l=Special i=Up-Attack u=Ultimate). Every check drives the REAL game loop.
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE } = X
  const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
  async function motion(seq, button) {   // rolled like a stick: only the keys that change are pressed / released
    let held = []
    for (const k of seq) {
      const want = k == null ? [] : [].concat(k)
      for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
      for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
      held = want; await step(2)
    }
    for (const x of held) await page.keyboard.up(x)
    await tap([button])
  }
  X.tap = tap; X.motion = motion
  const fresh = async (dx = 200, heat = 100) => {
    await page.evaluate(() => __harness.sanjiTest.reset())
    await page.evaluate(([dx, heat]) => { __harness.sanjiTest.heat('p1', heat); const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + dx; z.facing = -1; a.facing = 1 }, [dx, heat])
    await step(3)
  }
  X.fresh = fresh
  const zs = () => page.evaluate(() => { const z = __harness.sanjiTest.raw('p2'); return { x: z.x, hp: z.health, blocking: !!z.isBlocking, hitstun: z.hitstun || 0, y: z.y, onGround: !!(z.onGround || z.grounded) } })
  X.zs = zs
  const settle = async (n = 80) => { for (let i = 0; i < n; i++) { await step(1); const s = await as(); if (!s.attacking && !(s.hitstun > 0)) break } }
  X.settle = settle
  const block = async on => { await page.evaluate(on => { __harness.sanjiTest.raw('p2')._forceGuard = on }, on); await step(on ? 12 : 2) }   // held guard (not a fresh / flawless one)
  X.block = block

  // ── PHASE 2: base stats, Heat, HUD, kick normals ──
  await fresh(260, 10)
  let s = await as()
  check('Heat meter (maxEnergy 100, energyName Heat)', s.maxEnergy === 100 && s.energyName === 'Heat', JSON.stringify({ m: s.maxEnergy, n: s.energyName }))
  check('base stats: HP 940, speed 83.6 (walk 5.9), dashSpeed 15.64 (run 8.6)', s.maxHealth === 940 && s.speed === 83.6 && Math.abs(s.dashSpeed - 15.64) < 1e-9,
    JSON.stringify({ hp: s.maxHealth, sp: s.speed, d: s.dashSpeed }))
  check('Sanji idle uses his own sheet', /assets\/sanji\/idle\.png$/.test(s.idleSheet || ''), s.idleSheet)
  await step(240); s = await as()
  check('passive Heat +0.5/s (+2 over 4 s)', s.energy >= 11.5 && s.energy <= 12.5, s.energy)
  await fresh(600, 10)
  await page.keyboard.down('d'); await step(20); const x1 = (await as()).x; await step(10); const x2 = (await as()).x; await page.keyboard.up('d'); await step(4)
  check('walks 5.9 px/f', Math.abs((x2 - x1) / 10 - 5.9) < 0.05, ((x2 - x1) / 10).toFixed(3))
  await shot('p2-01-idle-hud')

  // Every kick normal connects (real keyboard) and gains +4 Heat per kick landed.
  const NORMALS = [['sCollier', ['j']], ['sEpaule', ['d', 'j']], ['sCotelette', ['k']], ['sSelle', ['d', 'k']],
    ['sPoitrine', ['a', 'k']], ['sGigot', ['s', 'd', 'j']], ['sCrouchKick', ['s', 'j']], ['sHandstand', ['s', 'k']], ['up', ['i']]]
  for (const [mv, keys] of NORMALS) {
    await fresh(mv === 'sHandstand' ? 70 : 96, 10)
    const z0 = await zs(), b0 = await as(), h0 = b0.energy, c0 = b0.s?.course || 0
    await tap(keys)
    let started = null, landed = false
    for (let i = 0; i < 40; i++) { await step(1); const t = await as(); if (t.move && !started) started = t.move; const z = await zs(); if (z.hp < z0.hp) { landed = true; break } }
    const b1 = await as(), h1 = b1.energy, stepped = (b1.s?.course || 0) > c0 ? 8 : 0   // (Phase 4+) a Course step adds +8
    check(`${mv} (${keys.join('+')}) starts + connects + Heat +4`, started === mv && landed && Math.abs(h1 - h0 - 4 - stepped) < 0.6, JSON.stringify({ started, landed, dHeat: +(h1 - h0).toFixed(2), courseStep: stepped }))
    if (mv === 'sCotelette') await shot('p2-02-cotelette')
    await settle()
  }
  // Blocked kick: +2 Heat.
  await fresh(96, 10)
  await block(true)
  { const h0 = (await as()).energy; await tap(['j']); for (let i = 0; i < 20; i++) await step(1); const h1 = (await as()).energy
    check('blocked kick gives +2 Heat', Math.abs(h1 - h0 - 2) < 0.6, (h1 - h0).toFixed(2)) }
  await block(false); await settle()
  // Handstand spin goes THROUGH a close foe and ends facing the other way.
  await fresh(60, 10)
  { const a0 = await as(); await tap(['s', 'k']); await settle(); await step(4); const a1 = await as(), z = await zs()
    check('handstand spin crosses up (ends on the far side, facing back)', (a0.x < z.x) && (a1.x > z.x) && a1.facing === -1, JSON.stringify({ x0: a0.x, x1: a1.x, zx: z.x, f: a1.facing })) }

  if (PHASE >= 3) { const m = await import('./sanji_render_scenarios_p3.mjs'); await m.run(X) }
  if (PHASE >= 4) { const m = await import('./sanji_render_scenarios_p4.mjs'); await m.run(X) }
  if (PHASE >= 5) { const m = await import('./sanji_render_scenarios_p5.mjs'); await m.run(X) }
  if (PHASE >= 6) { const m = await import('./sanji_render_scenarios_p6.mjs'); await m.run(X) }
  if (PHASE >= 7) { const m = await import('./sanji_render_scenarios_p7.mjs'); await m.run(X) }
  if (PHASE >= 8) { const m = await import('./sanji_render_scenarios_p8.mjs'); await m.run(X) }
}
