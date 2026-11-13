// harness/sanji_render_scenarios_p4.mjs — PHASE 4: THE COURSE (in order, out of order, 3 s reset, pips, window).
export async function run(X) {
  const { page, step, shot, as, check, tap, fresh, zs, settle } = X
  const KEYS = { 1: ['j'], 2: ['d', 'j'], 3: ['k'], 4: ['d', 'k'], 5: ['a', 'k'], 6: ['s', 'd', 'j'] }
  const st = async () => (await as()).s
  const land = async (k) => {   // walk back into range, kick, wait for the connect, recover
    await page.evaluate(() => { const a = __harness.sanjiTest.raw('p2'), z = __harness.sanjiTest.raw('p1'); a.x = z.x + 96; a.y = z.y; a.vx = 0; a.vy = 0; a.hitstun = 0 }); await step(1)
    const z0 = await zs(); await tap(KEYS[k])
    for (let i = 0; i < 30; i++) { await step(1); if ((await zs()).hp < z0.hp) break }
    await settle()
  }
  await fresh(96, 0)
  const pipsSeen = []
  let h0 = (await as()).energy
  for (let k = 1; k <= 5; k++) {
    await land(k); const s = await st(); pipsSeen.push(s.course)
    if (k === 3) await shot('p4-01-course-3')
  }
  check('in order: COLLIER → EPAULE → COTELETTE → SELLE → POITRINE advance 1..5', pipsSeen.join() === '1,2,3,4,5', pipsSeen.join())
  const h5 = (await as()).energy
  check('each step +8 Heat on top of +4 per kick (5 steps = +60)', Math.abs((h5 - h0) - 60) < 1.5, (h5 - h0).toFixed(1))
  await land(6)
  let s = await st()
  check('GIGOT completes the Course → 300-frame PARTY TABLE window, track resets', s.ptkcFree > 270 && s.ptkcFree <= 300 && s.course === 0, JSON.stringify({ w: s.ptkcFree, c: s.course }))
  await shot('p4-02-course-complete')
  // out of order: drop ONE step (not to zero)
  await fresh(96, 0)
  for (const k of [1, 2, 3]) await land(k)
  await land(1)
  s = await st()
  check('out of order (COLLIER at step 3) drops ONE step → 2', s.course === 2, s.course)
  await land(5)
  check('out of order again (POITRINE at step 2) → 1', (await st()).course === 1, (await st()).course)
  // non-Course hit keeps it alive but does not advance
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p2'), z = __harness.sanjiTest.raw('p1'); a.x = z.x + 70; a.hitstun = 0 }); await step(1)
  await tap(['s', 'j']); for (let i = 0; i < 20; i++) await step(1); await settle()
  check('crouch kick (not a Course kick) neither advances nor drops', (await st()).course === 1, (await st()).course)
  // 3 s without a hit → reset
  for (let i = 0; i < 185; i++) await step(1)
  check('3 s with no hit → the Course resets to 0', (await st()).course === 0, (await st()).course)
  await settle()
}
