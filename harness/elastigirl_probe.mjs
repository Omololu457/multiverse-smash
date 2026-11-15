import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on('pageerror', e => console.log('ERR', e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(server.base + `/index.html?harness=1&p1=elastigirl&p2=batman&seed=7`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 }); await page.evaluate(() => __harness.setRoundTimer?.(99999))
const measure = (key, gap, block) => page.evaluate(([key, gap, block]) => {
  const H = __harness.elastigirlTest, L = __harness.luffyTest; H.reset(); __harness.setDummyBehavior(block ? 'block' : 'stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + a.w + gap; a.facing = 1; b.facing = -1
  for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.hitstun = f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.vx = f.vy = 0; f.comboCounter = 0; f._forceGuard = !!block && f === b; f.isBlocking = !!block && f === b }
  b._was = false; L.step(2); const hp0 = b.health; const ok = H.move(key); const log = []; let first = null, act = 0, hits = [], aFree = null, dFree = null, reach = null
  for (let i = 0; i < 260; i++) { const s = H.state(), box = s.box && s.box.w > 1 ? s.box : null
    if (box) { act++; if (first == null) first = i; reach = Math.max(reach ?? 0, box.x + box.w - (a.x + a.w)) }
    L.step(1)
    if (b.health < (hits.length ? hits[hits.length - 1].hp : hp0)) hits.push({ i, d: (hits.length ? hits[hits.length - 1].hp : hp0) - b.health, hp: b.health, stored: H.state().attack?.damage })
    const busy = a.attacking || a.attackCooldown > 0 || a._elastigirl?.para
    if (aFree == null && !busy && i > 2) aFree = i
    const stunned = b.blockstun > 0 || b.hitstun > 0 || b.hitstop > 0
    if (stunned) b._was = true
    if (dFree == null && b._was && !stunned) dFree = i
    if (aFree != null && dFree != null) break }
  return { key, ok, first, act, reach: reach && Math.round(reach), hits: hits.map(h => [h.i, h.d]), aFree, dFree, adv: aFree != null && dFree != null ? dFree - aFree : null, dmg: hp0 - b.health }
}, [key, gap, block])
for (const [k, gap] of [['light', 60], ['heavy', 120], ['eLow', 120], ['up', 40], ['eLongArm', 300], ['eWhirl', 20], ['eWhip', 220], ['eDome', 20], ['eUlt', 30]]) {
  console.log(JSON.stringify(await measure(k, gap, false)), ' | block:', JSON.stringify(await measure(k, gap, true)))
}
await browser.close(); server.close?.()
