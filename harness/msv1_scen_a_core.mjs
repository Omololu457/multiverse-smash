// MSV1 scenarios A — S.P.D. Red parity (speed + input), Ninja Power, Ninja Streak (travel / pass-through / intangible / chain / strike / run).
export async function run(X) {
  const { step, S, call, shot, tap, dtap, fresh, settle, hp, check, section } = X
  let page = X.page
  section('A1 speed + input parity with S.P.D. Red')
  const par = await page.evaluate(async () => {
    const R = (await import('./rangers.js')).RANGER_PROFILES, C = (await import('./characters.js')).characters
    await import('./spdRedData.js')
    const out = {}
    for (const k of ['spd_red', 'ns_red', 'ns_yellow']) out[k] = { tap: R[k]?.blink.tapWindow, run: R[k]?.blink.run, speed: C[k]?.stats.speed, vertical: R[k]?.blink.vertical }
    return out
  })
  check('double-tap window identical to S.P.D. Red (12 ticks, same rangers.js detector)', par.ns_red.tap === par.spd_red.tap && par.ns_yellow.tap === par.spd_red.tap, par)
  check('stats.speed identical to S.P.D. Red (88)', par.ns_red.speed === par.spd_red.speed && par.ns_yellow.speed === par.spd_red.speed)
  check('run block identical to S.P.D. Red (8.4 / 5.6)', JSON.stringify(par.ns_red.run) === JSON.stringify(par.spd_red.run) && JSON.stringify(par.ns_yellow.run) === JSON.stringify(par.spd_red.run))
  // measured walk + run on the REAL loop: S.P.D. Red vs both ninjas, identical scenario (foe far to the right → forward walk)
  const meas = {}
  for (const k of ['spd_red', 'ns_yellow', 'ns_red']) {
    await X.boot(k, 'ns_yellow')
    const pg = X.page, st = () => pg.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { x: f.x, speed: f.speed, run: f._ranger?.running || 0 } })
    await fresh(1500, { ax: 100, np: 100 })
    await pg.keyboard.down('d'); await step(8); const a0 = await st(); await step(10); const a1 = await st(); await pg.keyboard.up('d')
    await fresh(1500, { ax: 100, np: 100 }); await step(4)
    await dtap('d'); await pg.keyboard.down('d'); for (let i = 0; i < 30; i++) await step(1)
    const r0 = await st(); await step(10); const r1 = await st(); await pg.keyboard.up('d')
    meas[k] = { speed: a0.speed, walk: +((a1.x - a0.x) / 10).toFixed(3), run: +((r1.x - r0.x) / 10).toFixed(3), running: r1.run }
  }
  for (const k of ['ns_red', 'ns_yellow']) {
    check(`${k} stats speed on the live fighter == S.P.D. Red's`, meas[k].speed === meas.spd_red.speed, `${meas[k].speed} vs ${meas.spd_red.speed}`)
    check(`${k} forward WALK px/f == S.P.D. Red's (measured)`, Math.abs(meas[k].walk - meas.spd_red.walk) < 0.01, `${meas[k].walk} vs ${meas.spd_red.walk}`)
    check(`${k} RUN after the double-tap px/f == S.P.D. Red's (measured)`, Math.abs(meas[k].run - meas.spd_red.run) < 0.01 && meas[k].run > meas[k].walk, `${meas[k].run} vs ${meas.spd_red.run}`)
  }
  X.meas = meas
  await X.boot('ns_red', 'ns_yellow'); page = X.page
  section('A2 Ninja Power')
  await fresh(400, { np: 50 })
  let s = await S(); const np0 = s.s.np; await step(60); s = await S()
  check('Ninja Power regenerates ~6/s', s.s.np - np0 >= 5 && s.s.np - np0 <= 7, s.s.np - np0)
  check('Ninja Power starts at 50 on a fresh state', (await page.evaluate(async () => { const m = await import('./ninja.js'); return m.NINJA_PROFILES.ns_red.np.start })) === 50)
  section('A3 Ninja Streak')
  await fresh(300, { ax: 700 })
  const z0 = await S('p2'); s = await S(); const x0 = s.x, npA = s.s.np
  await dtap('d')
  let started = null, inv = [], pass = false
  for (let i = 0; i < 10; i++) {
    await step(1); const q = await S()
    if (q.s?.streak && started == null) { started = i; await shot('streak_shane') }
    if (q.s?.streak) inv.push(q.s.streak.t)
    if (q.s?.streak?.crossed) pass = true
  }
  s = await S()
  check('double-tap → → starts a STREAK (not a blink: visible travel)', started != null && !s.r?.blink)
  check('streak costs 10 Ninja Power', Math.round(npA - s.s.np) >= 9 && Math.round(npA - s.s.np) <= 10, npA - s.s.np)
  check('streak passes THROUGH the opponent (cross-up)', s.x > z0.x + z0.w - 1 || pass, { x: s.x, foe: z0.x })
  check('streak travel ≈ 40% screen (512 px) in 8 frames', Math.abs((s.x - x0) - 512) < 70, s.x - x0)
  const intang = await page.evaluate(async () => { const m = await import('./ninja.js'); const f = { rosterKey: 'ns_red', _ninja: { streak: { t: 0 } } }; const r = []; for (let t = 0; t < 8; t++) { f._ninja.streak.t = t; r.push(m.ninjaEvades(f, { proj: {} })) } return r })
  check('projectile-intangible on streak frames 2–6 only', JSON.stringify(intang) === JSON.stringify([false, true, true, true, true, true, false, false]), intang)
  await settle()
  // chain ×3: 10 / 10 / 20
  await fresh(-2000, { ax: 200, np: 100 })
  const n0 = (await S()).s.np
  await dtap('d'); for (let i = 0; i < 11; i++) await step(1); await dtap('d'); for (let i = 0; i < 11; i++) await step(1); await dtap('d'); for (let i = 0; i < 11; i++) await step(1)
  s = await S()
  check('streak chains ×3 (third costs 20 → 40 total)', s.s.streaks === 3 && Math.abs((n0 - s.s.np) - 40) <= 3, { streaks: s.s.streaks, spent: n0 - s.s.np })
  await dtap('d'); for (let i = 0; i < 6; i++) await step(1); s = await S()
  check('no 4th chained streak', s.s.streaks === 3, s.s.streaks)
  await settle(40)
  // STREAK STRIKE
  await fresh(260, { ax: 700 })
  const h0 = await hp(); await dtap('d', 3); await step(1); await tap(['j']); for (let i = 0; i < 12; i++) await step(1)
  const h1 = await hp()
  const G = await page.evaluate(async () => (await import('./combat.js')).GLOBAL_DAMAGE_SCALE)
  const want = Math.floor(45 * 1.6 * G)
  check(`STREAK STRIKE: attack during the streak hits on the way through (45 raw × 1.6 parity × ${G} global = ${want})`, Math.abs((h0 - h1) - want) <= 1, h0 - h1)
  await shot('streak_strike_shane')
  await settle()
  section('A4 Smoke Vanish')
  await fresh(300, { ax: 700 })
  await tap(['p', 'j', 'k'], 2); let gone = false
  for (let i = 0; i < 24; i++) { await step(1); const q = await S(); if (q.s?.vanish?.t === 3) await shot('vanish_smoke'); if (q.s?.vanish && q.s.vanish.t > 6 && q.s.vanish.t <= 12) gone = true }
  s = await S(); const z = await S('p2')
  check('Smoke Vanish: reappears BEHIND the foe', s.x > z.x, { me: s.x, foe: z.x, gone })
  check('Smoke Vanish costs 30 Ninja Power', s.s.np <= 72 && s.s.np >= 68, s.s.np)
  await settle()
}
