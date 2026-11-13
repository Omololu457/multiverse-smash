// Phase 11 scenarios — FINAL CHECKS: zone caps under stress (never > 3 zones, never > 30% of the screen), teeth at 0
// handled, a final frame with a water zone + Shark On Darts + the thrown Kiribachi, then the Super flood.
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, tap, motion, settle } = X
  await fresh(600, 100)
  const caps = await page.evaluate(() => { const t = __harness.arlongTest, a = t.raw('p1'), out = []
    for (const [dx, w] of [[-300, 230], [-200, 230], [-90, 230], [0, 230], [120, 230], [500, 230], [900, 230], [1300, 230]]) { t.zone(a.x + dx, w); const s = t.state('p1').a; out.push({ n: s.zones.length, maxW: Math.max(...s.zones.map(z => z.width)) }) }
    return out })
  check('zone stress: never more than 3 zones', caps.every(c => c.n <= 3), JSON.stringify(caps.map(c => c.n)))
  check('zone stress: a merged pool never exceeds 30% of the screen (384 px)', caps.every(c => c.maxW <= 384), JSON.stringify(caps.map(c => c.maxW)))
  const st = (await as()).a
  check('zones carry {x, width, bornFrame, owner}', st.zones.every(z => ['x', 'width', 'bornFrame', 'owner'].every(k => k in z)), JSON.stringify(st.zones[0]))
  await step(500); check('zones expire after 8 s', (await as()).a.zones.length === 0, (await as()).a.zones.length)
  // ledger: every sheet frame used except the credit text
  const ledger = fs.readFileSync('docs/arlong/SPRITE_LEDGER.md', 'utf8')
  check('sprite ledger: every frame used, only the credit text excluded', /unused[^\n]*:\s*(none|0)/i.test(ledger) || !/\|\s*UNUSED\s*\|/i.test(ledger), ledger.match(/unused[^\n]*/i)?.[0] || 'no UNUSED rows')
  check('docs/arlong/START_COMMIT.txt exists', /^[0-9a-f]{40}\s*$/.test(fs.readFileSync('docs/arlong/START_COMMIT.txt', 'utf8')))
  // FINAL FRAME: a water zone, the thrown Kiribachi in flight, then Shark On Darts through the foe
  await fresh(420, 100)
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); __harness.arlongTest.zone(a.x + 24, 230) })
  await motion([['s'], ['s', 'd'], ['d']], 'k'); await step(18)
  let s = await as(); check('final frame: blade in flight over a water zone', s.a.blade.st === 'flying' && s.a.zones.length >= 1, `${s.a.blade.st} zones=${s.a.zones.length}`)
  await shot(`p${PHASE}-90-zone-throw`); await settle(120)
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); z.x = a.x + 300; z.invulnTimer = 0; a.facing = 1; __harness.arlongTest.tide('p1', 100) }); await step(2)
  await motion([['d'], null, ['d']], 'l'); await step(20); s = await as()
  check('final frame: Shark On Darts with the Kiribachi planted', s.move === 'aDarts' && s.a.blade.st === 'planted', `${s.move} ${s.a.blade.st}`)
  await shot(`p${PHASE}-91-darts-planted`); await settle(90)
  await page.evaluate(() => { const t = __harness.arlongTest, a = t.raw('p1'), z = t.raw('p2'); z.x = a.x + 220; z.invulnTimer = 0; z.knockdownState = false; a.facing = 1; t.tide('p1', 100); t.set('p1', { lockout: 0 }) }); await step(2)
  await tap(['u']); await step(40); s = await as()
  check('final frame: ARLONG PARK flood', s.move === 'aSuper' && s.a.flood > 0, `${s.move} flood=${s.a.flood}`)
  await shot(`p${PHASE}-92-super-flood`); await settle(240)
}
