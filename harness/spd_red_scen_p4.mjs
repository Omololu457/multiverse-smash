// Phase 4 scenarios — JUDGMENT: meter (1/hit, 20), A+B+Special chord, 30-frame time freeze + poster, GUILTY (≤30% HP:
// sealed 3 s, cannot act, card absorbs 50%, far-side release), INNOCENT (+40 Delta, meter held 5 s), once per round.
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE, fresh, zs, tap, settle } = X
  const chord = async () => { await page.keyboard.down('j'); await page.keyboard.down('k'); await page.keyboard.down('l'); await step(1); for (const k of ['j', 'k', 'l']) await page.keyboard.up(k) }
  // meter: one point per landed hit
  await fresh(110, 10)
  for (let i = 0; i < 3; i++) { await tap(['j']); await settle(); await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); z.x = __harness.spdRedTest.raw('p1').x + 110; z.hitstun = 0 }); await step(30) }
  let s = await as()
  check('JUDGMENT meter: +1 per landed hit (3 jabs → 3/20)', s.hud.meter === 3, s.hud.meter)
  // chord with the meter NOT full → no Judgment
  await chord(); await step(3); s = await as()
  check('A+B+Special does nothing until the meter is full', s.move !== 'sJudge')
  await settle()
  // GUILTY: foe at 30% → sealed
  await fresh(140, 10)
  await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); z.health = Math.floor(z.maxHealth * 0.30) })
  await call('judg', 'p1', { meter: 20 })
  s = await as(); check('meter full → HUD "ready"', s.hud.judgReady === true)
  await chord(); await step(1)
  s = await as(); let z = await zs()
  check('chord at full meter → Judgment (point the morpher)', s.move === 'sJudge', s.move)
  check('TIME FREEZE: the foe is held (hitstop ≈ 30)', z.hitstop >= 26, z.hitstop)
  await step(8); await shot(`p${PHASE}-30-judgment-scan`)
  for (let i = 0; i < 30; i++) { await step(1); s = await as(); if (s.r.judg.verdict) break }
  check('verdict GUILTY at ≤30% HP', s.r.judg.verdict === 'guilty' && s.r.judg.contain > 0, JSON.stringify({ v: s.r.judg.verdict, c: s.r.judg.contain }))
  await shot(`p${PHASE}-31-guilty-poster`)
  z = await zs(); const sealX = z.x
  check('sealed foe cannot act (held in the card)', z.hitstun > 0)
  await step(20); await shot(`p${PHASE}-32-containment`)
  // 50% absorb: same Jab vs the sealed foe deals half
  const raw = await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); return { ax: a.x, zx: z.x } })
  await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = z.x - 110; a.facing = 1; a.comboCounter = 0 })
  let h0 = (await zs()).hp; await tap(['j']); await settle(40); let h1 = (await zs()).hp
  const sealedDmg = h0 - h1
  z = await zs()
  check('sealed foe pinned where it was sealed', Math.abs(z.x - sealX) < 1, `${sealX} → ${z.x}`)
  for (let i = 0; i < 200; i++) { await step(1); s = await as(); if (!(s.r.judg.contain > 0)) break }
  z = await zs(); s = await as()
  check('released after 3 s at the FAR side of the screen', s.r.judg.contain === 0 && Math.abs(z.x - s.x) > 450, `red ${s.x} foe ${z.x}`)
  check('once per round: meter spent, not ready again', s.hud.judgReady === false && s.r.judg.used === true)
  // unsealed jab for the 50% comparison
  await fresh(110, 10); h0 = (await zs()).hp; await tap(['j']); await settle(); h1 = (await zs()).hp
  check('containment card absorbs 50% of damage', sealedDmg > 0 && Math.abs(sealedDmg / (h0 - h1) - 0.5) < 0.06, `sealed ${sealedDmg} vs open ${h0 - h1}`)
  // INNOCENT: foe above 30% → +40 Delta, meter stays full 5 s for a re-attempt
  await fresh(140, 10)
  await call('judg', 'p1', { meter: 20 })
  const d0 = (await as()).energy
  await chord(); for (let i = 0; i < 34; i++) await step(1)
  s = await as()
  check('verdict INNOCENT above 30% HP', s.r.judg.verdict === 'innocent', s.r.judg.verdict)
  check('INNOCENT pays +40 Delta', Math.round(s.energy - d0) >= 40, `${d0}→${s.energy}`)
  check('INNOCENT keeps the meter full (re-attempt window)', s.hud.judgReady === true && s.hud.judgHold > 0, JSON.stringify({ r: s.hud.judgReady, h: s.hud.judgHold }))
  await shot(`p${PHASE}-33-innocent`)
  await step(320); s = await as()
  check('re-attempt window closes after 5 s', s.hud.judgReady === false && s.hud.meter === 0, JSON.stringify(s.hud))
  // a Ranger opponent is ALWAYS innocent (in-game: Omega Ranger counts as a Ranger)
  const rv = await page.evaluate(async () => { const m = await import('./rangers.js'); const red = __harness.spdRedTest.raw('p1'); return { omega: m.judgmentVerdict(red, { rosterKey: 'omega_ranger', universe: 'power_rangers', health: 1, maxHealth: 1000 }), zoro: m.judgmentVerdict(red, { rosterKey: 'zoro', health: 1, maxHealth: 1000 }) } })
  check('Ranger opponent → always INNOCENT (Omega at 0.1% HP), non-Ranger → GUILTY', rv.omega === 'innocent' && rv.zoro === 'guilty', JSON.stringify(rv))
}
