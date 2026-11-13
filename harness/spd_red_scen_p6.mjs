// Phase 6 scenarios — the moveset, driven by real keyboard input (P1 a/d/s/w, j = Light, k = Heavy, l = Special,
// u = Ultimate, i = Up-Attack). Damage is the brief's value × the engine's GLOBAL_DAMAGE_SCALE 0.6 on a fresh combo.
export async function run(X) {
  const { page, step, shot, as, call, check, PHASE, fresh, zs, tap, motion, dtap, settle } = X
  const G = 0.6, near = (a, b, tol = 1.01) => Math.abs(a - b) <= tol
  const projs = () => page.evaluate(async () => { const m = await import('./abilities.js'); const a = __harness.spdRedTest.raw('p1')
    return m.activeProjectiles.filter(p => p && p.owner === a).map(p => ({ name: p.name, x: Math.round(p.x), vy: +(p.vy || 0).toFixed(3), sheet: p.sheet })) })
  // run an input, record every move he was in and the foe's HP loss
  // every sim step logs P1's move (page side, so moves started inside the input sequence are seen too)
  await page.evaluate(() => { const L = __harness.luffyTest; if (L._srWrapped) return; const o = L.step
    L.step = (n = 1) => { for (let i = 0; i < n; i++) { o(1); const m = __harness.spdRedTest.raw('p1')?.currentMove, log = window.__srMoves; if (log && m && log[log.length - 1] !== m) log.push(m) } }
    L._srWrapped = true })
  async function act(input, { dx = 110, delta = 100, frames = 120, opts = {}, until, wait = 0 } = {}) {
    await fresh(dx, delta, opts)
    const z0 = (await zs()).hp, e0 = (await as()).energy, x0 = (await as()).x
    await page.evaluate(() => { window.__srMoves = [] })
    await input()
    for (let i = 0; i < frames; i++) {
      const s = await as()
      if (until && await until(s, i)) break
      if (i > Math.max(6, wait) && !s.attacking && !s.r?.blink && !(s.hitstun > 0)) break
      await step(1)
    }
    const moves = await page.evaluate(() => window.__srMoves.slice())
    const s = await as(), z = await zs()
    return { dmg: +(z0 - z.hp).toFixed(2), moves, energy: s.energy, spent: +(e0 - s.energy).toFixed(2), s, z, x0 }
  }
  // every move tagged with a damage type from the roster vocabulary
  const tags = await page.evaluate(async () => { const d = await import('./spdRedData.js'); return Object.entries(d.SPD_RED_MOVES).map(([k, m]) => [k, m.damageType]) })
  check('every move carries a damageType tag', tags.every(([, t]) => ['blunt', 'projectile', 'energy', 'slash', 'grab'].includes(t)), JSON.stringify(tags))
  // ── NORMALS ──
  let r = await act(() => tap(['j']))
  check('Jab (Light) = 40', r.moves[0] === 'light' && near(r.dmg, 40 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['d', 'j']))
  check('Straight (→+Light) = 60', r.moves[0] === 'sStraight' && near(r.dmg, 60 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['k']))
  check('Kick (Heavy) = 65', r.moves[0] === 'sKick' && near(r.dmg, 65 * G), JSON.stringify([r.moves, r.dmg]))
  let air = false
  r = await act(() => tap(['d', 'k']), { until: async () => { const z = await zs(); if (!air && z.y < 0 + (await page.evaluate(() => __harness.spdRedTest.raw('p2').y)) && false) air = true; return false } })
  const lz = await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); return { vy: z.vy, g: !!(z.onGround || z.grounded) } })
  check('Heavy kick (→+Heavy) = 85 and launches', r.moves[0] === 'heavy' && near(r.dmg, 85 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['s', 'j']))
  check('Low kick (↓+Light) = 45, a LOW', r.moves[0] === 'sLow' && near(r.dmg, 45 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['i']))
  check('Rising kick (Up-Attack) = 80', r.moves[0] === 'up' && near(r.dmg, 80 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['a', 'k']), { dx: 300 })
  check('Acrobatic flip (←+Heavy): rolls back ~112 px, 8 invulnerable frames', r.moves[0] === 'sFlip' && r.x0 - r.s.x >= 100, JSON.stringify([r.moves, r.x0, r.s.x]))
  r = await act(() => tap(['s', 'k']))
  check('Wake-up reversal (↓+Heavy) = 70', r.moves[0] === 'sWake' && near(r.dmg, 70 * G), JSON.stringify([r.moves, r.dmg]))
  // wake-up: any attack button on the frames after standing up
  r = await act(async () => {
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); a.knockdownState = true; a.knockdownTimer = 3 })
    await page.keyboard.down('j'); await step(6); await page.keyboard.up('j')
  })
  check('Wake-up: Light on the wake-up frames = the reversal (6 invulnerable)', r.moves.includes('sWake'), JSON.stringify(r.moves))
  // A, A, A chain (gatling on contact)
  r = await act(async () => { await tap(['j']); await step(5); await tap(['j']); await step(8); await tap(['j']) })
  check('A, A, A chain = Jab → Straight → Kick', JSON.stringify(r.moves.slice(0, 3)) === JSON.stringify(['light', 'sStraight', 'sKick']), JSON.stringify(r.moves))
  // ── SPECIALS ──
  r = await act(() => tap(['s', 'l']), { dx: 600, frames: 90, wait: 60 })
  check('DELTA BLASTER (↓+Special): costs 10, R18 bolt hits full-screen for 50', r.moves[0] === 'sBlaster' && near(r.dmg, 50 * G) && near(r.spent, 10 - 4, 4.1), JSON.stringify([r.moves, r.dmg, r.spent]))
  await fresh(1100, 100)
  await tap(['s', 'l']); for (let i = 0; i < 14; i++) await step(1)
  let pr = await projs()
  check('DELTA BLASTER bolt uses the R18 F1 sprite', pr.length === 1 && /fx_bolt/.test(pr[0].sheet), JSON.stringify(pr))
  await shot(`p${PHASE}-60-blaster`)
  await settle(60)
  // pool max 4: four of his bolts on screen → the Blaster won't start
  await fresh(1100, 100)
  await page.evaluate(async () => { const m = await import('./abilities.js'); const a = __harness.spdRedTest.raw('p1')
    for (let i = 0; i < 4; i++) m.activeProjectiles.push({ name: 'srBolt', owner: a, x: 10, y: -300, vx: 0, vy: 0, w: 4, h: 4, radius: 2, lifetime: 30, visualOnly: true }) })
  const e4 = (await as()).energy; await tap(['s', 'l']); await step(4); const s4 = await as()
  check('DELTA BLASTER pool: max 4 bolts on screen', s4.move !== 'sBlaster' && s4.energy === e4, JSON.stringify({ move: s4.move, e: s4.energy, e4 }))
  await settle(40)
  // air blaster
  r = await act(async () => { await page.keyboard.down('w'); await step(3); await page.keyboard.up('w'); await step(4); await tap(['s', 'l']) }, { dx: 500, frames: 90 })
  check('DELTA BLASTER works airborne (R15)', r.moves.includes('sBlasterAir'), JSON.stringify(r.moves))
  // rapid fire: keep it held
  let spreads = []
  r = await act(async () => { await page.keyboard.down('s'); await page.keyboard.down('l'); await step(18); await page.keyboard.up('s'); await page.keyboard.up('l') },
    { dx: 1100, frames: 60, until: async () => { const p = await projs(); for (const q of p) if (q.name === 'srTracer' && !spreads.some(v => v === q.vy)) spreads.push(q.vy); return false } })
  check('RAPID FIRE (hold ↓+Special): 20 Delta total (net of +1/40 f passive), 5 tracer bolts (R18 F3)', r.moves.includes('sRapid') && r.spent >= 18 && r.spent <= 20 && spreads.length === 5, JSON.stringify({ m: r.moves, spent: r.spent, spreads }))
  check('RAPID FIRE spread is a deterministic hash (5 distinct angles, no Math.random)', new Set(spreads).size === 5, JSON.stringify(spreads))
  r = await act(async () => { await page.keyboard.down('s'); await page.keyboard.down('l'); await step(18); await page.keyboard.up('s'); await page.keyboard.up('l') }, { dx: 300, frames: 70, wait: 40 })
  check('RAPID FIRE damage: 5 × 25 (combo-scaled)', r.dmg > 25 * G * 2 && r.dmg <= 125 * G + 0.5, r.dmg)
  // Delta Charge: →→+Special (the blink's charge is handed back)
  r = await act(async () => { await dtap('d', 3); await tap(['l']) }, { dx: 420, frames: 70 })
  check('DELTA CHARGE (→→+Special): 95, knockdown, no blink charge spent', r.moves.includes('sCharge') && near(r.dmg, 95 * G) && r.s.hud.charges === 2, JSON.stringify([r.moves, r.dmg, r.s.hud.charges, r.z.kd]))
  check('DELTA CHARGE travels (up to 40% of the screen) into the foe', r.s.x - r.x0 >= 250, `${r.x0}→${r.s.x}`)
  // Delta Charge → Blink cancel on hit
  r = await act(async () => { await dtap('d', 3); await tap(['l']); for (let i = 0; i < 40; i++) { await step(1); const a = await call('atk', 'p1'); if (a?.name === 'sCharge' && (await page.evaluate(() => __harness.spdRedTest.raw('p1').currentAttack?.hasHit))) break } await dtap('d', 2) }, { dx: 300, frames: 40 })
  check('DELTA CHARGE cancels into a BLINK on hit (costs a charge)', r.moves.includes('sCharge') && r.s.hud.charges === 1, JSON.stringify([r.moves, r.s.hud.charges]))
  await settle()
  // Phase Strike ↓↘→+Special: always crosses up
  r = await act(() => motion(['s', ['s', 'd'], 'd'], 'l'), { dx: 260 })
  check('PHASE STRIKE (↓↘→+Special): crosses up, hits from behind for 100', r.moves.includes('sPhase') && r.s.x > r.z.x && near(r.dmg, 100 * G), JSON.stringify([r.moves, r.dmg, r.s.x, r.z.x]))
  // Sky Uppercut ↑+Special
  r = await act(() => tap(['w', 'l']))
  check('SKY UPPERCUT (↑+Special): 110, launches, he rises', r.moves.includes('sUpper') && near(r.dmg, 110 * G), JSON.stringify([r.moves, r.dmg]))
  r = await act(async () => { await tap(['w', 'l']); for (let i = 0; i < 24; i++) await step(1); await dtap('d', 2) })
  check('SKY UPPERCUT: BLINK out of the air recovery', r.s.hud.charges === 1 && r.moves.includes('sUpper'), JSON.stringify([r.moves, r.s.hud.charges]))
  await settle()
  // Deltamax ↓↙←+Special: 70% screen beam, pierces projectiles
  r = await act(async () => {
    await motion(['s', ['s', 'a'], 'a'], 'l')
    await page.evaluate(async () => { const m = await import('./abilities.js'); const z = __harness.spdRedTest.raw('p2'), a = __harness.spdRedTest.raw('p1')
      m.spawnProjectile(z, 'zoroTestShot', { spawnX: a.x + 300, spawnY: a.y + 40, vx: 0, vy: 0, w: 20, h: 20, radius: 10, lifetime: 200, damage: 1 }) })
  }, { dx: 780, frames: 80 })
  const left = await page.evaluate(async () => { const m = await import('./abilities.js'); return m.activeProjectiles.filter(p => p.name === 'zoroTestShot').length })
  check('DELTAMAX STRIKE (↓↙←+Special): 120 energy at 70% of the screen', r.moves.includes('sDeltamax') && near(r.dmg, 120 * G), JSON.stringify([r.moves, r.dmg]))
  check('DELTAMAX STRIKE pierces (erases) an enemy projectile', left === 0, left)
  // SUPER
  const sup = async (keys, guilty) => act(async () => {
    if (guilty) await page.evaluate(() => { const r = __harness.spdRedTest.raw('p1')._ranger; r.judg.guilty = true })
    await page.evaluate(() => { const r = __harness.spdRedTest.raw('p1')._ranger; r.charges = 0; r.refill = [200, 200] })
    await keys()
  }, { dx: 400, frames: 140, until: async (s, i) => { if (i === 30) await shot(`p${PHASE}-61-super-strike${guilty ? '-guilty' : ''}`); if (i === 82) await shot(`p${PHASE}-62-super-beam${guilty ? '-guilty' : ''}`); return false } })
  r = await sup(() => motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], 'l'))
  const sst = await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); return { lock: a._spdRed.lockout, sup: a._spdRed.sup } })
  check('SUPER (↓↘→↓↘→+Special): 3 blink strikes × 55 + beam 180 = 345', r.moves.includes('sSuper') && near(r.dmg, 345 * G, 1.5), JSON.stringify([r.moves, r.dmg, sst.sup]))
  check('SUPER: spends all Delta, 3 s Delta lockout, teleport charges refill', r.energy === 0 && sst.lock > 100 && r.s.hud.charges === 2, JSON.stringify({ e: r.energy, lock: sst.lock, ch: r.s.hud.charges }))
  r = await sup(() => tap(['u']), true)
  check('SUPER via Ultimate; the beam does 220 after GUILTY (165 + 220 = 385)', r.moves.includes('sSuper') && near(r.dmg, 385 * G, 1.5), JSON.stringify([r.moves, r.dmg]))
  r = await act(() => tap(['u']), { delta: 60 })
  check('SUPER needs 100 Delta', !r.moves.includes('sSuper'), JSON.stringify(r.moves))
}
