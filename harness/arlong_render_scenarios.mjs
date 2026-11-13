// harness/arlong_render_scenarios.mjs — phase-gated scenario checks for harness/arlong_render_check.mjs.
// P1 = Arlong vs P2 = Zoro, already in a live match. Real keyboard input for P1 (a=left d=right s=down w=up,
// j=Light k=Heavy l=Special). Every check drives the REAL game loop.
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
  const fresh = async (dx = 200, tide = 100) => {
    await page.evaluate(() => __harness.arlongTest.reset())
    await page.evaluate(([dx, tide]) => { __harness.arlongTest.tide('p1', tide); const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); z.x = a.x + dx; z.facing = -1; a.facing = 1 }, [dx, tide])
    await step(3)
  }
  X.fresh = fresh
  const zs = () => page.evaluate(() => { const z = __harness.arlongTest.raw('p2'); return { x: z.x, hp: z.health, blocking: !!z.isBlocking, hitstun: z.hitstun || 0, y: z.y } })
  X.zs = zs
  const settle = async (n = 60) => { for (let i = 0; i < n; i++) { await step(1); const s = await as(); if (!s.attacking && !(s.hitstun > 0)) break } }
  X.settle = settle

  // ── PHASE 2: base stats, Tide, HUD, normals ──
  await fresh(260, 10)
  let s = await as()
  check('Tide meter (maxEnergy 100, energyName Tide)', s.maxEnergy === 100 && s.energyName === 'Tide', JSON.stringify({ m: s.maxEnergy, n: s.energyName }))
  check('base stats: HP 1120, speed 78, dashSpeed 13, jumpPower 25', s.maxHealth === 1120 && s.baseSpeed === 78 && s.dashSpeed === 13 && s.jumpForce === -25,
    JSON.stringify({ hp: s.maxHealth, sp: s.baseSpeed, d: s.dashSpeed, j: s.jumpForce }))
  check('Arlong idle uses his own sheet', /assets\/arlong\/idle\.png$/.test(s.idleSheet || ''), s.idleSheet)
  check('HUD: 3 teeth + Kiribachi in hand', s.hud?.teeth === 3 && s.hud?.blade === true, JSON.stringify(s.hud))
  check('big hurtbox (+20 wide / +16 tall vs the roster hurtbox w−12 × h−6)', s.hurtbox && s.hurtbox.w === s.w + 8 && s.hurtbox.h === s.h + 10, JSON.stringify({ hb: s.hurtbox, w: s.w, h: s.h }))
  await step(120); s = await as()
  check('passive Tide +1/s (≈ +2 over 2 s)', s.energy >= 11.5 && s.energy <= 12.5, s.energy)
  // walk speed 4.4 px/f (out of water)
  await fresh(600, 10)
  const x0 = (await as()).x
  await page.keyboard.down('d'); await step(20); const x1 = (await as()).x; await step(10); const x2 = (await as()).x; await page.keyboard.up('d'); await step(4)
  check('walks 4.4 px/f out of water', Math.abs((x2 - x1) / 10 - 4.4) < 0.05, ((x2 - x1) / 10).toFixed(3))
  // normals: Jab (blunt, +5 Tide) and Kiribachi swing (slash, +3 Tide) connect on Zoro
  await fresh(120, 10)
  let z0 = await zs(), t0 = (await as()).energy
  await tap(['j']); await settle()
  let z1 = await zs(), t1 = (await as()).energy
  check('Jab connects', z1.hp < z0.hp, `${z0.hp}→${z1.hp}`)
  check('Jab (blunt) +5 Tide', Math.round(t1 - t0) === 5, `${t0}→${t1}`)
  await shot(`p${PHASE}-10-jab`)
  await fresh(150, 10)
  z0 = await zs(); t0 = (await as()).energy
  await tap(['k']); for (let i = 0; i < 16; i++) await step(1); await shot(`p${PHASE}-11-swing`); await settle()
  z1 = await zs(); t1 = (await as()).energy
  check('Kiribachi swing connects', z1.hp < z0.hp, `${z0.hp}→${z1.hp}`)
  check('Kiribachi swing (slash) +3 Tide', Math.round(t1 - t0) === 3, `${t0}→${t1}`)
  // ↓+H heavy saw arc launches
  await fresh(150, 10)
  await page.keyboard.down('s'); await tap(['k']); await page.keyboard.up('s')
  let launched = false
  for (let i = 0; i < 40; i++) { await step(1); const z = await zs(); if (z.y < (await zs()).y + 1 && (await page.evaluate(() => !__harness.arlongTest.raw('p2').onGround))) { launched = true } if (i === 20) await shot(`p${PHASE}-12-heavy-arc`) }
  check('Heavy saw arc (↓+H) launches', launched)
  await settle(90)

  if (PHASE >= 3) { const m = await import('./arlong_scen_p3.mjs'); await m.run(X) }
}
