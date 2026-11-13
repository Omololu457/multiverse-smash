// harness/sanji_render_scenarios_p3.mjs — PHASE 3: DIABLE JAMBE (ignite / lit kicks / burn / drain / lockout / overheat).
export async function run(X) {
  const { page, step, shot, as, check, tap, fresh, zs, settle } = X
  const AB = () => tap(['l', 'k'])
  const lit = async () => (await as()).s?.dj || 0
  const igniteNow = async heat => { await fresh(400, heat); await AB(); for (let i = 0; i < 45; i++) await step(1) }

  await igniteNow(40)
  check('A+B under 50 Heat does NOT ignite', (await lit()) === 0 && (await as()).move !== 'sIgnite', (await as()).move)
  await fresh(400, 60); await AB(); await step(2)
  let s = await as()
  check('A+B at 60 Heat starts the spin-up (sIgnite)', s.move === 'sIgnite', s.move)
  await step(20); await shot('p3-01-spinup')
  for (let i = 0; i < 25; i++) await step(1)
  s = await as()
  check('leg lit: 720-frame timer, lock set, no overheat (ignited < 100)', s.s.dj > 690 && s.s.dj <= 720 && s.s.djLock === true && s.s.djOver === 0, JSON.stringify({ dj: s.s.dj, lock: s.s.djLock, over: s.s.djOver }))
  check('+10% run speed while lit (dashSpeed 15.64 → 17.204)', Math.abs(s.dashSpeed - 17.204) < 1e-6, s.dashSpeed)
  const sheets = await page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); return { c: f._skinAnim?.sCotelette?.sheet, i: f._skinAnim?.idle?.sheet } })
  check('kick trails swap to the orange-tinted *_dj strips', /sCotelette_dj\.png$/.test(sheets.c || '') && /idle\.png$/.test(sheets.i || ''), JSON.stringify(sheets))
  // drain 4/s (passive trickle suspended)
  { const e0 = (await as()).energy; for (let i = 0; i < 60; i++) await step(1); const e1 = (await as()).energy
    check('Heat drains 4/s while lit', Math.abs((e0 - e1) - 4) < 0.6, (e0 - e1).toFixed(2)) }
  await shot('p3-02-lit-idle')

  // +25% damage + BURN: compare Collier damage unlit vs lit, then watch the burn ticks.
  const collierDamage = async lit => {
    await fresh(96, lit ? 60 : 10)
    if (lit) { await tap(['l', 'k']); for (let i = 0; i < 45; i++) await step(1); await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 96; z.health = z.maxHealth }); await step(2) }
    const z0 = await zs(); await tap(['j'])
    for (let i = 0; i < 20; i++) { await step(1); if ((await zs()).hp < z0.hp) break }
    return z0.hp - (await zs()).hp
  }
  const d0 = await collierDamage(false), d1 = await collierDamage(true)
  check('lit kicks deal +25% (Collier)', Math.abs(d1 / d0 - 1.25) < 0.06, `${d0} → ${d1} (×${(d1 / d0).toFixed(3)})`)
  await shot('p3-03-lit-kick')
  { let hp = (await zs()).hp, ticks = 0
    for (let i = 0; i < 130; i++) { await step(1); const h = (await zs()).hp; if (h < hp) { ticks++; check(`burn tick ${ticks} = 3 dmg`, hp - h === 3, hp - h); hp = h } }
    check('burn = 6 ticks over 2 s (3 dmg / 20 f)', ticks === 6, ticks) }
  // refresh, never stack: two quick burning kicks → still one burn (≤ 6 ticks after the 2nd)
  await settle()
  { await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 96 }); await step(2)
    await tap(['j']); for (let i = 0; i < 18; i++) await step(1); await tap(['j']); for (let i = 0; i < 18; i++) await step(1)
    const b = (await as()).s.burn
    check('burn refreshes instead of stacking (one 120-f burn timer)', b > 90 && b <= 120, b) }

  // Lockout: when the leg goes out with Heat left, A+B does nothing until Heat empties and refills to 50.
  await page.evaluate(() => { const s = __harness.sanjiTest.raw('p1')._sanji; s.dj = 2 }); await step(4)
  s = await as()
  check('leg goes out after its timer; anim + run speed restored', s.s.dj === 0 && Math.abs(s.dashSpeed - 15.64) < 1e-6 && (await page.evaluate(() => __harness.sanjiTest.raw('p1')._skinAnim)) == null, JSON.stringify({ dj: s.s.dj, d: s.dashSpeed }))
  await page.evaluate(() => { __harness.sanjiTest.heat('p1', 80) }); await settle(); await AB(); for (let i = 0; i < 45; i++) await step(1)
  check('cannot re-ignite while Heat has not emptied (lock)', (await lit()) === 0, JSON.stringify((await as()).s.djLock))
  await page.evaluate(() => { __harness.sanjiTest.heat('p1', 0) }); await step(2)
  check('Heat empty → lock clears', (await as()).s.djLock === false)
  await page.evaluate(() => { __harness.sanjiTest.heat('p1', 55) }); await AB(); for (let i = 0; i < 45; i++) await step(1)
  check('refilled to 50+ → ignites again', (await lit()) > 0, await lit())

  // OVERHEAT: ignite at 100 → 180 f of "Hell Memories" at +40%.
  await fresh(96, 100); await AB(); for (let i = 0; i < 45; i++) await step(1)
  s = await as()
  check('ignite at 100 Heat → Hell Memories window (180 f)', s.s.djOver > 160 && s.s.djOver <= 180, s.s.djOver)
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 96; z.health = z.maxHealth }); await step(2)
  { const z0 = await zs(); await tap(['j']); for (let i = 0; i < 20; i++) { await step(1); if ((await zs()).hp < z0.hp) break }
    const d2 = z0.hp - (await zs()).hp
    check('Hell Memories kicks deal +40%', Math.abs(d2 / d0 - 1.40) < 0.06, `${d0} → ${d2} (×${(d2 / d0).toFixed(3)})`) }
  await shot('p3-04-hell-memories')
  for (let i = 0; i < 200; i++) await step(1)
  check('Hell Memories ends after 3 s (leg still lit at +25%)', (await as()).s.djOver === 0 && (await lit()) > 0)
  await settle()
}
