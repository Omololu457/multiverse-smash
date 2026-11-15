// Combo driver for Elastigirl harnesses: REAL keyboard input (P1 faces right), sim stepped by hand, every HP drop of
// P2 logged with whether P2 was still in hitstun / knockdown / airborne-launched from the previous hit (true combo).
export function comboDriver(page) {
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const st = () => page.evaluate(() => { const H = __harness.elastigirlTest, a = H.state(), b = H.raw('p2')
    return { a, b: { hp: b.health, x: b.x, y: b.y, vy: b.vy, stun: b.hitstun || 0, bs: b.blockstun || 0, kd: !!b.knockdownState, g: !!(b.onGround || b.grounded), combo: b.comboCounter || 0 }, aCombo: H.raw().comboCounter || 0 } })
  const DIR = { 1: ['s', 'a'], 2: ['s'], 3: ['s', 'd'], 4: ['a'], 5: [], 6: ['d'], 7: ['w', 'a'], 8: ['w'], 9: ['w', 'd'] }, ALL = ['w', 'a', 's', 'd']
  let log = [], hp = 0, stunned = false, frame = 0, inCombo = true
  async function tick(n = 1) {
    for (let i = 0; i < n; i++) {
      await step(1); frame++
      const q = await st()
      if (q.b.hp < hp) { log.push({ f: frame, d: hp - q.b.hp, stored: q.a.attack?.damage ?? null, move: q.a.attack?.name || q.a.cast || null, combo: stunned }); hp = q.b.hp }
      stunned = q.b.stun > 0 || q.b.kd || !q.b.g
    }
  }
  async function dir(c, n = 2) { for (const k of ALL) if (!DIR[c].includes(k)) await page.keyboard.up(k); for (const k of DIR[c]) await page.keyboard.down(k); await tick(n) }
  async function release() { for (const k of ALL) await page.keyboard.up(k) }
  async function press(keys, n = 2) { for (const k of keys) await page.keyboard.down(k); await tick(n); for (const k of keys) await page.keyboard.up(k) }
  async function motion(seq, btn = 'l') { for (const c of seq) await dir(c, 2); await press([btn], 2); await release() }
  async function until(pred, max = 120) { for (let i = 0; i < max; i++) { const q = await st(); if (pred(q)) return q; await tick(1) } return st() }
  const cancelOpen = () => until(q => q.a.attack?.eg?.clean && q.a.cancel?.open, 90)
  async function begin(gap, o = {}) {
    await page.evaluate(([gap, o]) => { const H = __harness.elastigirlTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2')
      a.x = 1300; b.x = 1300 + a.w + gap; a.facing = 1; b.facing = -1
      for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
        f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, o])
    await release(); await step(2); log = []; frame = 0; stunned = false; hp = (await st()).b.hp
  }
  return { step, st, tick, dir, release, press, motion, until, cancelOpen, begin, get log() { return log } }
}
