// Phase 5 scenarios — Red's teleport profile: crossup + PHASE STEP (foe faces the wrong way 8 f, one charge), stage
// clamp, air blink (charge, momentum), no Delta cost, DODGE REWARD (+5 Delta, +15% next attack, white streak).
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE, fresh, zs, tap, dtap, settle } = X
  // CROSSUP: foe 150 px ahead → he blinks THROUGH and lands behind; the foe keeps facing the old way for 8 f
  await fresh(150, 30, { ax: 900 })
  let s = await as(), z = await zs()
  const d0 = s.energy
  await dtap('d', 3)
  let crossedAt = null, lock = []
  for (let i = 0; i < 24; i++) {
    await step(1); s = await as(); z = await zs()
    if (s.r?.faceLock > 0 && crossedAt == null) crossedAt = i
    if (crossedAt != null) lock.push(z.facing)
    if (i === 5) await shot(`p${PHASE}-40-crossup-travel`)
  }
  check('crossup: he lands BEHIND the foe', s.x > z.x + (z.w || 48) - 1, `red ${s.x} foe ${z.x}`)
  check('PHASE STEP: the foe faces the wrong way (away from him) right after', lock.length > 0 && lock[0] === -1, JSON.stringify(lock.slice(0, 10)))
  check('PHASE STEP lasts 8 frames then the foe turns', lock.slice(0, 7).every(v => v === -1) && lock.slice(9, 12).every(v => v === 1), JSON.stringify(lock.slice(0, 12)))
  check('crossup costs ONE charge (no extra)', s.hud.charges === 1, s.hud.charges)
  check('the blink costs no Delta', s.energy >= d0, `${d0}→${s.energy}`)
  // CLAMP: blink toward the wall stops at the stage edge
  await fresh(110, 10, { ax: 300 })
  const edge = await page.evaluate(() => __harness.luffyTest.edge('p1', 'left'))   // Red 30 px from the left wall, foe 110 px right
  await step(2); await dtap('a', 3); await settle(); s = await as()
  check('stage-edge clamp: a 282 px blink into the wall stops on the stage edge, never past it', s.x >= 0 && s.x <= edge.x, `x ${s.x} (start ${edge.x})`)
  check('stage-edge clamp: the clamped blink still spent its charge', s.hud.charges === 1, s.hud.charges)
  // AIR blink: costs a charge, keeps momentum
  await fresh(900, 10, { ax: 300 })
  await page.keyboard.down('w'); await step(2); await page.keyboard.up('w'); await page.keyboard.down('d'); await step(3); await page.keyboard.up('d')
  for (let i = 0; i < 4; i++) await step(1)
  const before = await as()
  await dtap('d', 2)
  let mid = null; for (let i = 0; i < 7; i++) { await step(1); const q = await as(); if (q.r?.blink?.air && !mid) mid = q }
  await step(1); s = await as()
  check('AIR blink allowed (airborne, costs a charge)', !!mid && s.hud.charges <= 1, JSON.stringify({ air: mid?.r?.blink?.air, ch: s.hud.charges, g: before.grounded }))
  check('AIR blink keeps momentum (still moving forward + falling after it)', mid && s.vx > 0 && !s.grounded, JSON.stringify({ vx: s.vx, vy: s.vy }))
  await settle(80)
  // DODGE REWARD: blink through Zoro's live heavy → +5 Delta, white streak, next attack +15%
  const jab = async buffed => {
    await fresh(buffed ? 112 : 110, 20, { ax: 900 })   // inside Zoro's heavy reach, so the blink truly dodges a live hitbox
    if (buffed) {
      // P2 is the training dummy (no keyboard) → start Zoro's real heavy through the engine's own startMove
      await page.evaluate(async () => { const c = await import('./combat.js'); const z = __harness.spdRedTest.raw('p2'); c.startMove(z, 'heavy', z.basic_attacks.heavy) })
      let ok = false
      for (let i = 0; i < 40; i++) {
        const a = await call('atk', 'p2')
        if (a && a.activeStart - a.elapsed <= 5) { await call('blink', -1); ok = true; break }   // invulnerable travel lands on his active frames
        await step(1)
      }
      if (!ok) return { err: 'zoro never attacked' }
      let dodged = false, dEn = 0, e0 = (await as()).energy
      for (let i = 0; i < 12; i++) { await step(1); const q = await as(); if (q.r?.blink?.dodge && !dodged) { dodged = true; await shot(`p${PHASE}-41-dodge-flash`) } if (!q.r?.blink) break }
      const q = await as(); dEn = q.energy - e0
      await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); z.x = a.x + (a.facing === 1 ? 110 : -110); z.hitstun = 0; z.attacking = false; z.currentAttack = null; z.health = z.maxHealth; z.comboCounter = 0; a.comboCounter = 0 })
      const z0 = (await zs()).hp; await tap(['j']); await step(2); const at = await call('atk', 'p1'); await settle(); const z1 = (await zs()).hp
      return { dodged, dEn, dmg: z0 - z1, buffFlag: at?.buff, hp: (await as()).health }
    }
    const z0 = (await zs()).hp; await tap(['j']); await settle(); return { dmg: z0 - (await zs()).hp }
  }
  const plain = await jab(false), buffed = await jab(true)
  check('DODGE: invulnerable travel through a live hitbox is detected (white streak)', buffed.dodged === true, JSON.stringify(buffed))
  check('DODGE: +5 Delta', Math.round(buffed.dEn) >= 5, buffed.dEn)
  check('DODGE: Red took no damage from the dodged heavy', buffed.hp === 950, buffed.hp)
  check('DODGE: next attack within 20 f does +15%', buffed.buffFlag === true && Math.abs(buffed.dmg / plain.dmg - 1.15) < 0.06, `plain ${plain.dmg} buffed ${buffed.dmg}`)
}
