// harness/sanji_render_scenarios_p11.mjs — PHASE 11: FINAL CHECKS that are not already a phase scenario.
//   (2) the R5 / R8 objects are identified in the ledger and BOTH used in game · (4) the HUD pips mirror the Course
//   state (incl. all six during the free window) · (10) START_COMMIT.txt · a final render with Diable Jambe lit, a
//   completed Course and the super mid-cut. (1) ledger, (3) hands rule, (5) Diable Jambe, (6) the full-Course combo
//   are the P7 / P3 / P6 scenarios; (7) determinism is harness/sanji_determinism.test.mjs (a P11 gate).
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, fresh, tap } = X
  const led = fs.readFileSync('docs/sanji/SPRITE_LEDGER.md', 'utf8')
  check('ledger identifies R5 = a PLATE (→ Plate Kick projectile) and R8 = a COCKTAIL GLASS (→ win prop + Heat badge)',
    /R5 yellow object = a PLATE/.test(led) && /PLATE KICK projectile/.test(led) && /R8 red\/white object = a COCKTAIL GLASS/.test(led) && /Heat-bar badge/.test(led))
  const used = await page.evaluate(async () => {
    const fx = (await import('./sanjiSprites.js')).SANJI_FX, ok = s => new Promise(r => { const i = new Image(); i.onload = () => r(i.width > 0); i.onerror = () => r(false); i.src = s })
    return { plate: fx.plate.sheet, glass: fx.glass.sheet, plateOk: await ok(fx.plate.sheet), glassOk: await ok(fx.glass.sheet) }
  })
  check('both objects are real in-game art (fx_plate.png = the projectile, fx_glass.png = the HUD badge) and load', used.plateOk && used.glassOk && /fx_plate\.png$/.test(used.plate) && /fx_glass\.png$/.test(used.glass), JSON.stringify(used))
  // HUD pips mirror the Course (and show all six while the free window is open)
  const pips = await page.evaluate(async () => { const m = await import('./sanjiState.js'), f = __harness.sanjiTest.raw('p1'), out = []
    for (const [course, free] of [[0, 0], [2, 0], [5, 0], [0, 120]]) { __harness.sanjiTest.set('p1', { course, ptkcFree: free }); out.push(m.coursePips(f)) }
    __harness.sanjiTest.set('p1', { course: 0, ptkcFree: 0 }); return out })
  check('HUD Course pips mirror the track: 0 / 2 / 5, and all 6 during the free window', pips.join() === '0,2,5,6', pips.join())
  check('docs/sanji/START_COMMIT.txt holds the start commit', /^[0-9a-f]{40}\s*$/.test(fs.readFileSync('docs/sanji/START_COMMIT.txt', 'utf8')), fs.readFileSync('docs/sanji/START_COMMIT.txt', 'utf8').trim())
  // Final render: leg lit, the Course completed in-game, the free super mid-cut.
  await fresh(96, 100)
  await tap(['l', 'k']); for (let i = 0; i < 44; i++) await step(1)
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 96; z.hitstun = 0 })
  const KEYS = [['j'], ['d', 'j'], ['k'], ['d', 'k'], ['a', 'k'], ['s', 'd', 'j']]
  for (const keys of KEYS) {
    await page.evaluate(() => { const a = __harness.sanjiTest.raw('p2'), z = __harness.sanjiTest.raw('p1'); a.x = z.x + 96; a.y = z.y; a.vx = 0; a.vy = 0; a.hitstun = 0; a.invulnTimer = 0; a.health = a.maxHealth })
    await step(1); const h0 = (await page.evaluate(() => __harness.sanjiTest.raw('p2').health))
    for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k)
    for (let i = 0; i < 30; i++) { await step(1); if ((await page.evaluate(() => __harness.sanjiTest.raw('p2').health)) < h0) break }
    for (let i = 0; i < 40; i++) { await step(1); if (!(await as()).attacking) break }
  }
  let s = await as()
  check('final render: Course completed with the leg lit (free window open, Diable Jambe on)', s.s.ptkcFree > 0 && s.s.dj > 0, JSON.stringify({ free: s.s.ptkcFree, dj: s.s.dj }))
  await shot('p11-90-course-complete-lit')
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p2'), z = __harness.sanjiTest.raw('p1'); a.x = z.x + 90; a.y = z.y; a.hitstun = 0; a.invulnTimer = 0 }); await step(1)
  await X.motion(['s', ['s', 'd'], 'd'], 'l')
  for (let i = 0; i < 60; i++) { await step(1); if ((await as()).s?.superCut >= 3) break }
  s = await as()
  check('final render: the free super is mid-cut (callout up, leg still lit)', s.move === 'sPTKC' && s.s.superCut >= 3 && s.s.dj > 0, JSON.stringify({ move: s.move, cut: s.s.superCut, dj: s.s.dj }))
  await shot('p11-91-super-mid-cut')
  for (let i = 0; i < 260; i++) { await step(1); const t = await as(); if (!t.attacking && !t.s?.inSuper) break }
  s = await as()
  check('after the lit super: Heat spent + locked, Diable Jambe out', s.energy === 0 && s.s.lockout > 0 && !(s.s.dj > 0), JSON.stringify({ e: s.energy, lock: s.s.lockout, dj: s.s.dj }))
  await shot('p11-92-after-super')
}
