// Phase 8 scenarios — presentation: intro (R17 → R3 → R1), WIN 1 (R9 + spinning gem), WIN 2 (R16 braced), LOSE (R6
// settling into the lying frame), idle > 10 s (R1 + blue gem glint). Reads the render-only presentation clocks + the
// strip the renderer shows, and screenshots every pose.
export async function run(X) {
  const { page, step, shot, check, PHASE, fresh } = X
  const raw = () => page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); const set = a._skinAnim || a.animationData
    return { introT: a._srIntroT, endT: a._srEndT || 0, winVar: a._srWinVar || 0, win: set?.win?.sheet || null, idle: set?.idle?.sheet || null,
      lose: set?.lose?.sheet || null, intro: a.animationData?.intro?.sheet || null, idleT: a._spdRed?.idleT || 0, act: a.spriteHandler?.currentAction || null } })
  await fresh(300, 50)
  // INTRO
  await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); a._introPlaying = true; a._introVariant = 'intro'; a._srIntroOn = false; a._srIntro0 = null; if (a.spriteHandler) { a.spriteHandler.frameIndex = 0; a.spriteHandler.frameTimer = 0 } })
  await step(1); await step(5); await shot(`p${PHASE}-80-intro-blink-in`)
  await step(12); await shot(`p${PHASE}-81-intro-landing`)
  let r = await raw()
  check('intro: blink-in streak → crouch landing clock runs on the intro flag (R17 → R3 → R1 strip)', r.introT >= 14 && r.introT < 60 && /\/intro\.png$/.test(r.intro || ''), JSON.stringify(r))
  await page.evaluate(() => { __harness.spdRedTest.raw('p1')._introPlaying = false }); await step(50)
  check('intro FX ends on its own (60 frames)', (await raw()).introT === 60, (await raw()).introT)
  // WIN 1 / WIN 2
  for (const v of [1, 2]) {
    await page.evaluate(v => { const a = __harness.spdRedTest.raw('p1'); a._forceAction = 'win'; a._srWinVar = v; a._srEndT = 0; a._srEndFa = null }, v)
    await step(1); await step(30); r = await raw()
    check(`WIN ${v}: ${v === 1 ? 'R9 pose + spinning gem' : 'R16 braced pose + Deltamax glow'} on the ${v === 2 ? 'win2' : 'win'} strip`,
      r.endT > 25 && (r.win || '').endsWith(v === 2 ? '/win2.png' : '/win.png'), JSON.stringify(r))
    await shot(`p${PHASE}-${81 + v}-win${v}`)
  }
  // LOSE
  await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); a._forceAction = 'lose'; a._srEndT = 0; a._srEndFa = null }); await step(1); await step(40)
  r = await raw()
  check('LOSE: R6 settles into the lying frame (lose strip, base set)', r.endT > 30 && (r.lose || '').endsWith('/lose.png') && !(await page.evaluate(() => !!__harness.spdRedTest.raw('p1')._skinAnim)), JSON.stringify(r))
  await shot(`p${PHASE}-84-lose`)
  await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); a._forceAction = null }); await step(2)
  // the win variant is a pure hash of sim values (LAN-safe): stable for the same values, both poses reachable
  const vh = await page.evaluate(async () => { const m = await import('./spdRedFx.js'); const seen = new Set(); let stable = true
    for (let i = 0; i < 40; i++) { const f = { health: 100 + i * 37, energy: i * 3, _spdRed: { clock: i * 101 } }, g = { ...f, _spdRed: { clock: i * 101 } }
      const a = m.spdRedWinVariant(f), b = m.spdRedWinVariant(g); if (a !== b) stable = false; seen.add(a) }
    return { stable, both: seen.size === 2 } })
  check('win variant: deterministic hash, both poses reachable', vh.stable && vh.both, JSON.stringify(vh))
  // IDLE > 10 s: R1 + blue gem glint
  await fresh(400, 50)
  for (let i = 0; i < 6; i++) await step(110)
  await step(30)
  r = await raw()
  check('idle > 10 s: swaps to the R1 glint strip', r.idleT >= 600 && (r.idle || '').endsWith('/idleGlint.png'), JSON.stringify(r))
  for (let i = 0; i < 90; i++) { await step(1); const g = await page.evaluate(() => (globalThis.__harness.luffyTest && true)); if (i === 8) await shot(`p${PHASE}-85-idle-glint`) }
  await page.keyboard.down('d'); await step(3); await page.keyboard.up('d'); await step(2)
  r = await raw()
  check('idle glint ends on any input', r.idleT < 600 && !(r.idle || '').endsWith('/idleGlint.png'), JSON.stringify(r))
}
