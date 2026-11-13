// Phase 4 scenarios — TOOTH REGROWTH. Called by arlong_scen_p3.mjs.
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, zs, tap, settle } = X
  const fwdH = async () => { await page.keyboard.down('d'); await tap(['k']); await page.keyboard.up('d') }
  await fresh(90, 10)
  let s = await as()
  check('teeth start at 3', s.a.teeth === 3 && s.hud.teeth === 3, s.a.teeth)
  let z0 = await zs()
  await fwdH(); await step(2); s = await as()
  check('→+H close = BITE, spends a tooth', s.move === 'aBite' && s.a.teeth === 2, `${s.move} teeth=${s.a.teeth}`)
  await step(9); await shot(`p${PHASE}-30-bite`); await settle()
  let z1 = await zs()
  const biteDmg = z0.hp - z1.hp
  check('Bite connects hard (100 raw)', biteDmg >= 55, `${z0.hp}→${z1.hp}`)
  await step(130); const z2 = await zs()
  check('Bite causes a 2 s bleed (4 per 20 f)', z1.hp - z2.hp >= 6 && z1.hp - z2.hp <= 18, `${z1.hp}→${z2.hp}`)
  // spend the rest → 0 teeth → headbutt (no dead button), never below 0
  await page.evaluate(() => __harness.arlongTest.set('p1', { teeth: 1, toothT: 0 }))
  await fresh(90, 10); await page.evaluate(() => __harness.arlongTest.set('p1', { teeth: 1, toothT: 0 }))
  await fwdH(); await step(2); s = await as()
  check('last tooth spent → 0', s.a.teeth === 0 && s.hud.teeth === 0, s.a.teeth)
  await settle(); await page.evaluate(() => { const z = __harness.arlongTest.raw('p2'); const a = __harness.arlongTest.raw('p1'); z.x = a.x + 90; z.health = z.maxHealth; a.comboCounter = 0; z.comboCounter = 0 }); await step(30)
  z0 = await zs()
  await fwdH(); await step(2); s = await as()
  check('0 teeth: →+H becomes the weaker HEADBUTT (no dead button)', s.move === 'aHeadbutt' && s.a.teeth === 0, `${s.move} teeth=${s.a.teeth}`)
  await step(9); await shot(`p${PHASE}-31-headbutt`); await settle()
  z1 = await zs()
  check('headbutt lands for less than a bite', z0.hp - z1.hp > 0 && z0.hp - z1.hp < biteDmg, `hb ${z0.hp - z1.hp} vs bite ${biteDmg}`)
  // regrowth: one tooth per 4 s
  s = await as(); const tt = s.a.toothT
  await step(240 - tt + 2); s = await as()
  check('a tooth regrows after 4 s', s.a.teeth === 1, `teeth=${s.a.teeth}`)
  await step(480); s = await as()
  check('regrows one at a time back to 3 (never above)', s.a.teeth === 3, s.a.teeth)
  await step(300); s = await as(); check('stays at 3', s.a.teeth === 3, s.a.teeth)
  if (PHASE >= 5) { const m = await import('./arlong_scen_p5.mjs'); await m.run(X) }
}
