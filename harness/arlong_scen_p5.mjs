// Phase 5 scenarios — THE MOVESET: every special through REAL motion inputs, the Kiribachi state machine + Fishman
// Karate swap, ARLONG PARK (360 raw), Fishman durability, damageType tags. Called by arlong_scen_p4.mjs.
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, zs, tap, motion, settle } = X
  const F = ['d'], B = ['a'], D = ['s'], DF = ['s', 'd'], DB = ['s', 'a']
  const SCALE = 0.6   // GLOBAL_DAMAGE_SCALE applied to ability damage
  const near = (v, want, tol = 1.5) => Math.abs(v - want) <= tol
  const zones = async () => (await as()).a.zones.length
  const longSettle = async (n = 160) => { for (let i = 0; i < n; i++) { await step(1); const s = await as(); if (!s.attacking && !(s.hitstun > 0) && !s.a.shots.length && !s.a.waves.length && s.a.blade.st !== 'flying' && s.a.blade.st !== 'recall') break } }

  // ── damageType tags: every Arlong move carries one from the engine's existing vocabulary ──
  const tags = await page.evaluate(async () => { const m = await import('./arlongData.js'); return Object.fromEntries(Object.entries(m.ARLONG_MOVES).map(([k, v]) => [k, v.damageType])) })
  const bad = Object.entries(tags).filter(([, t]) => !['slash', 'blunt', 'projectile', 'beam', 'grab', 'energy'].includes(t))
  check('every Arlong move is tagged with an existing damageType', bad.length === 0, JSON.stringify(bad))

  // ── SHARK ON TOOTH ↓↘→+A ──
  await fresh(150, 100); let z0 = await zs(), n0 = await zones()
  await motion([D, DF, F], 'l'); await step(2); let s = await as()
  check('↓↘→+A = Shark On Tooth (15 Tide, spends a tooth)', s.move === 'aTooth' && near(s.energy, 85, 1) && s.a.teeth === 2, `${s.move} tide=${s.energy} teeth=${s.a.teeth}`)
  await step(12); await shot(`p${PHASE}-40-tooth`); await settle()
  let z1 = await zs(); s = await as()
  check('Shark On Tooth lunges + connects (120 slash)', z0.hp - z1.hp >= 60, `${z0.hp}→${z1.hp}`)
  check('Shark On Tooth leaves a water zone under the foe', s.a.zones.length === n0 + 1 && s.a.zones.some(z => z.x <= z1.x + 24 && z.x + z.width >= z1.x + 24), JSON.stringify(s.a.zones))

  // ── SHARK ON DARTS →→+A ──
  await fresh(300, 100); await page.evaluate(() => __harness.arlongTest.set('p1', { teeth: 1, toothT: 0 }))
  z0 = await zs(); const ax0 = (await as()).x
  await motion([F, null, F], 'l'); await step(2); s = await as()
  check('→→+A = Shark On Darts (20 Tide)', s.move === 'aDarts' && near(s.energy, 80, 1), `${s.move} tide=${s.energy}`)
  await step(16); await shot(`p${PHASE}-41-darts`); await settle(90)
  z1 = await zs(); s = await as()
  check('Darts connects (135 blunt)', near(z0.hp - z1.hp, 135 * SCALE, 3), `${z0.hp}→${z1.hp}`)
  check('Darts travels ~65% of the screen and ENDS BEHIND the foe', s.x - ax0 > 780 && s.x > z1.x, `Δx=${s.x - ax0} arlong=${s.x} foe=${z1.x}`)
  check('landing Darts REFILLS the teeth', s.a.teeth === 3, s.a.teeth)
  check('Darts leaves a zone where he stops', s.a.zones.some(z => z.x <= s.x + 24 && z.x + z.width >= s.x + 24), JSON.stringify(s.a.zones))

  // ── GOSENMAIGAWARA SEIKEN ↓↙←+A ──
  await fresh(380, 100); z0 = await zs()
  await motion([D, DB, B], 'l'); await step(2); s = await as()
  check('↓↙←+A = Gosenmaigawara Seiken (25 Tide)', s.move === 'aSeiken' && near(s.energy, 75, 1), `${s.move} tide=${s.energy}`)
  await step(22); s = await as()
  check('Seiken launches a water shockwave + a zone in front', s.a.waves.length === 1 && s.a.zones.some(z => z.x > s.x), JSON.stringify({ w: s.a.waves, z: s.a.zones }))
  await shot(`p${PHASE}-42-seiken`); await longSettle()
  z1 = await zs()
  check('Seiken shockwave reaches 380 px away (115 blunt)', near(z0.hp - z1.hp, 115 * SCALE, 3), `${z0.hp}→${z1.hp}`)
  // on block: unblockable chip 15
  await fresh(300, 100); z0 = await zs()
  await motion([D, DB, B], 'l')
  await page.evaluate(() => { __harness.arlongTest.raw('p2')._forceGuard = true })   // the engine's persistent dummy guard
  await step(50); z1 = await zs()
  await page.evaluate(() => { const z = __harness.arlongTest.raw('p2'); z._forceGuard = false; z.isBlocking = false })
  check('Seiken on block still chips 15 (unblockable chip)', near(z0.hp - z1.hp, 15 * SCALE, 1.5) && (await page.evaluate(() => __harness.arlongTest.raw('p2').blockstun || 0)) >= 0, `${z0.hp}→${z1.hp}`)
  await settle()

  // ── KIRIBACHI THROW ↓↘→+B → planted → Fishman Karate swap → recall / pick up ──
  await fresh(260, 100); z0 = await zs()
  await motion([D, DF, F], 'k'); await step(2); s = await as()
  check('↓↘→+B = Kiribachi Throw (18 Tide)', s.move === 'aThrow' && near(s.energy, 82, 1), `${s.move} tide=${s.energy}`)
  await step(16); s = await as(); check('the Kiribachi spins across the screen', s.a.blade.st === 'flying', s.a.blade.st)
  await shot(`p${PHASE}-43-throw`); await longSettle()
  z1 = await zs(); s = await as()
  check('thrown Kiribachi hits (85 slash) and PLANTS', near(z0.hp - z1.hp, 85 * SCALE, 2) && s.a.blade.st === 'planted', `${z0.hp}→${z1.hp} ${s.a.blade.st}`)
  check('HUD blade icon greys out while thrown', s.hud.blade === false, JSON.stringify(s.hud))
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); a.comboCounter = 0 }); await step(100)
  await tap(['k']); await step(2); s = await as()
  check('blade gone: neutral H swaps to FISHMAN KARATE (aKSwing, blunt)', s.move === 'aKSwing', s.move)
  await settle(); await page.keyboard.down('s'); await tap(['j']); await page.keyboard.up('s'); await step(2); s = await as()
  check('blade gone: ↓+L swaps to karate low (aKLow)', s.move === 'aKLow', s.move)
  await settle(); await shot(`p${PHASE}-44-planted`)
  // RECALL: foe between Arlong and the blade gets hit by the returning saw
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2'); const b = __harness.arlongTest.state('p1').a.blade; z.x = Math.round((a.x + b.x) / 2); z.health = z.maxHealth; z.comboCounter = 0; a.comboCounter = 0; a.facing = 1; z.hitstun = 0 })
  await step(4); z0 = await zs()
  await motion([D, DF, F], 'k'); await step(2); s = await as()
  check('↓↘→+B with the blade planted = RECALL', s.move === 'aRecall', s.move)
  await step(6); await shot(`p${PHASE}-45-recall`); await longSettle()
  z1 = await zs(); s = await as()
  check('recalled Kiribachi hits along its path (70 slash) and returns to hand', near(z0.hp - z1.hp, 70 * SCALE, 2) && s.a.blade.st === 'hand' && s.hud.blade === true, `${z0.hp}→${z1.hp} ${s.a.blade.st}`)
  // PICK UP: B next to the planted blade
  await fresh(400, 100)
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); __harness.arlongTest.set('p1', { blade: { st: 'planted', x: a.x + 24 + 40 } }) })
  await tap(['k']); await step(2); s = await as()
  check('B beside the planted blade = PICK UP', s.move === 'aPickup', s.move)
  await settle(); s = await as(); check('picked up → blade in hand', s.a.blade.st === 'hand', s.a.blade.st)

  // ── TIDAL SWEEP ↓↓+A ──
  await fresh(150, 100); z0 = await zs(); n0 = await zones()
  await motion([D, null, D], 'l'); await step(2); s = await as()
  check('↓↓+A = Tidal Sweep (20 Tide)', s.move === 'aTidal' && near(s.energy, 80, 1), `${s.move} tide=${s.energy}`)
  let kd = false; for (let i = 0; i < 24; i++) { await step(1); if (await page.evaluate(() => !!__harness.arlongTest.raw('p2').knockdownState)) kd = true; if (i === 14) await shot(`p${PHASE}-46-tidal`) }
  z1 = await zs(); s = await as()
  check('Tidal Sweep connects low + KNOCKDOWN', z1.hp < z0.hp && kd, `${z0.hp}→${z1.hp} kd=${kd}`)
  check('Tidal Sweep leaves a zone where it hits', s.a.zones.length === n0 + 1, s.a.zones.length)
  await settle(120)

  // ── WATER SHOT ↓↙←+B ──
  await fresh(560, 100); z0 = await zs()
  await motion([D, DB, B], 'k'); await step(2); s = await as()
  check('↓↙←+B = Water Shot (12 Tide)', s.move === 'aShot' && near(s.energy, 88, 1), `${s.move} tide=${s.energy}`)
  await step(14); await shot(`p${PHASE}-47-shot`); await longSettle()
  z1 = await zs()
  check('Water Shot projectile hits at half-screen range (50)', near(z0.hp - z1.hp, 50 * SCALE, 2), `${z0.hp}→${z1.hp}`)
  await fresh(900, 100); z0 = await zs(); await motion([D, DB, B], 'k'); await longSettle(); z1 = await zs()
  check('Water Shot dies past half a screen (640 px)', z1.hp === z0.hp, `${z0.hp}→${z1.hp}`)

  // ── simple-input fallbacks + affordability ──
  await fresh(300, 100); await page.keyboard.down('w'); await tap(['l']); await page.keyboard.up('w'); await step(2); s = await as()
  check('fallback ↑+A = Water Shot', s.move === 'aShot', s.move)
  await settle(); await fresh(300, 10); await tap(['l']); await step(2); s = await as()
  check('not enough Tide → no special (Tide kept)', !s.attacking && near(s.energy, 10, 1), `${s.move} ${s.energy}`)

  // ── SUPER: ARLONG PARK ──
  await fresh(220, 100); z0 = await zs()
  await motion([D, DF, F, D, DF, F], 'l'); await step(2); s = await as()
  check('↓↘→↓↘→+A = ARLONG PARK (100 Tide, invulnerable)', s.move === 'aSuper' && s.energy < 1 && s.invuln > 150, `${s.move} tide=${s.energy} inv=${s.invuln}`)
  await step(20); s = await as(); check('the stage FLOODS', s.a.flood > 0, s.a.flood)
  await shot(`p${PHASE}-48-flood`)
  await step(30); await shot(`p${PHASE}-49-torpedo`)
  await step(100); await shot(`p${PHASE}-50-finisher`)
  await settle(120); await step(2); z1 = await zs(); s = await as()
  check('ARLONG PARK lands 4 torpedo strikes + the Kiribachi finisher = 360 raw', near(z0.hp - z1.hp, 360 * SCALE, 3), `${z0.hp}→${z1.hp} (Δ${z0.hp - z1.hp} want ${360 * SCALE})`)
  check('after the Super: flood recedes into ONE normal zone + Tide lockout', s.a.flood === 0 && s.a.zones.length === 1 && s.a.lockout > 0, JSON.stringify({ f: s.a.flood, z: s.a.zones.length, l: s.a.lockout }))
  const tl = s.energy; await step(60); s = await as()
  check('3 s Tide lockout: no Tide gain', s.energy === tl, `${tl}→${s.energy}`)
  await page.evaluate(() => __harness.arlongTest.tide('p1', 100)); await step(2)
  await page.keyboard.down('u'); await step(1); await page.keyboard.up('u'); await step(2); s = await as()
  check('Super refused during the lockout', s.move !== 'aSuper', s.move)
  await step(200); await tap(['u']); await step(2); s = await as()
  check('Ultimate button = ARLONG PARK once the lockout ends', s.move === 'aSuper', s.move)
  await settle(260)

  // ── FISHMAN DURABILITY ──
  const dur = await page.evaluate(async () => {
    const m = await import('./arlongState.js'); const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2')
    return { melee150: m.arlongDamageMods(a, 150, { attacker: z, scale: 1 }), abil150: m.arlongDamageMods(a, 150, { attacker: z, source: 'ability' }), abil90: m.arlongDamageMods(a, 90, { attacker: z }), melee50: m.arlongDamageMods(a, 50, { attacker: z, scale: 1 }) }
  })
  check('Fishman durability: a >100 hit loses 20% of its first 60 (−12 nominal)', near(dur.abil150, 138, 0.01) && near(dur.melee150, 150 - 7.2, 0.01), JSON.stringify(dur))
  check('Fishman durability: ≤100 hits untouched', dur.abil90 === 90 && dur.melee50 === 50, JSON.stringify(dur))
}
