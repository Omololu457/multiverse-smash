// Phase 7 scenarios — INTRO / WIN 1 / WIN 2 / LOSE / IDLE FLEX. Presentation is render-only: the checks read the
// presentation clocks + the strip the renderer is showing, and screenshot every pose. Called by arlong_scen_p6.mjs.
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh } = X
  const raw = () => page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); return { introT: a._alIntroT, endT: a._alEndT || 0, winVar: a._alWinVar || 0,
    sheet: (a._skinAnim || a.animationData)?.[a._forceAction === 'win' ? 'win' : 'idle']?.sheet || null, skin: !!a._skinAnim } })
  await fresh(320, 10)
  // INTRO: the engine's _introPlaying flag on the intro strip → drag sparks, gill water, shoulder splash
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); a._introPlaying = true; a._introVariant = 'intro'; a._alIntroOn = false; a._alIntro0 = null; if (a.spriteHandler) { a.spriteHandler.frameIndex = 0; a.spriteHandler.frameTimer = 0 } })
  await step(1); await step(16); await shot(`p${PHASE}-60-intro-drag`)
  await step(30); await shot(`p${PHASE}-61-intro-gills`)
  let r = await raw()
  check('intro: drag + gill-water clock runs on the intro flag', r.introT >= 40 && r.introT < 96, `introT=${r.introT}`)
  await step(30); await shot(`p${PHASE}-62-intro-shoulder`)
  await page.evaluate(() => { __harness.arlongTest.raw('p1')._introPlaying = false }); await step(40)
  check('intro FX ends on its own (96 frames)', (await raw()).introT === 96, (await raw()).introT)
  // WINS
  for (const v of [1, 2]) {
    await page.evaluate(v => { const a = __harness.arlongTest.raw('p1'); a._forceAction = 'win'; a._alWinVar = v; a._alEndT = 0; a._alEndFa = null }, v)
    await step(1); await step(30); r = await raw()
    check(`win ${v}: ${v === 1 ? 'portrait panel + planted Kiribachi' : 'wide stance → blade overhead + water spouts'} on the ${v === 2 ? 'win2' : 'win'} strip`,
      r.endT > 25 && (r.sheet || '').endsWith(v === 2 ? '/win2.png' : '/win.png'), `${r.sheet} endT=${r.endT}`)
    await shot(`p${PHASE}-${63 + v}-win${v}`)
  }
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); a._forceAction = 'lose'; a._alEndT = 0; a._alEndFa = null }); await step(1); await step(40)
  r = await raw()
  check('lose: lying flat + Kiribachi laid flat beside him', r.endT > 30 && !r.skin, `endT=${r.endT}`)
  await shot(`p${PHASE}-66-lose`)
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); a._forceAction = null; a._alWinVar = 0 }); await step(3); r = await raw()
  check('round-end pose cleared → presentation clock resets', r.endT === 0, JSON.stringify(r))
  // the win variant is a pure hash of sim values (LAN-safe)
  const vh = await page.evaluate(async () => { const m = await import('./arlongState.js'); const seen = new Set(); let stable = true
    for (let hp = 1; hp <= 40; hp++) { const a = { health: hp * 23, energy: hp % 100, _arlong: { tick: hp * 997 } }, b = { ...a }; const x = m.arlongWinVariant(a), y = m.arlongWinVariant(b); if (x !== y) stable = false; seen.add(x) }
    return { stable, both: seen.size === 2 } })
  check('win variant: deterministic hash, both poses reachable', vh.stable && vh.both, JSON.stringify(vh))
  // IDLE > 10 s → blade-on-shoulder flex
  await fresh(500, 10); await step(590)
  let s = await as(); check('idle < 10 s: normal idle strip', /\/idle\.png$/.test(s.idleSheet || ''), s.idleSheet)
  await step(20); s = await as()
  check('idle ≥ 10 s: blade-on-shoulder FLEX strip', /idleFlex\.png$/.test(s.idleSheet || ''), s.idleSheet)
  await shot(`p${PHASE}-67-idle-flex`)
  await page.keyboard.down('d'); await step(3); await page.keyboard.up('d'); s = await as()
  check('any input ends the flex', /\/idle\.png$/.test(s.idleSheet || ''), s.idleSheet)
  if (PHASE >= 8) { const m = await import('./arlong_scen_p8.mjs'); await m.run(X) }
}
