// harness/sanji_render_scenarios_p5.mjs — PHASE 5: specials, Sky Walk, Plate Kick, Concasse, the super.
// Real keyboard motions (s = ↓, d = → (facing right), a = ←; l = Special (A), k = Heavy (B), u = Ultimate).
export async function run(X) {
  const { page, step, shot, as, check, tap, motion, fresh, zs, settle } = X
  const QCF = ['s', ['s', 'd'], 'd'], QCB = ['s', ['s', 'a'], 'a'], FF = ['d', null, 'd'], DD = ['s', null, 's']
  const st = async () => (await as()).s
  // Run until the move starts / the foe's HP drops; returns what was seen.
  async function watch(n = 60, stop = null) {
    const z0 = await zs(); let started = new Set(), hits = 0, last = z0.hp, minVx = 99, maxDrop = 0
    for (let i = 0; i < n; i++) {
      await step(1); const a = await as(), z = await zs()
      if (a.move) started.add(a.move)
      if (z.hp < last) { hits++; maxDrop = Math.max(maxDrop, last - z.hp) }
      last = z.hp
      if (stop && stop(a, z)) break
    }
    return { started: [...started], hits, dmg: z0.hp - last, maxDrop }
  }

  // ── MOUTON SHOT ↓↘→+A ──
  await fresh(140, 50)
  { const e0 = (await as()).energy; await motion(QCF, 'l'); const w = await watch(40)
    const e1 = (await as()).energy
    check('Mouton Shot (↓↘→+A) starts, connects, costs 15 Heat (+4 on hit)', w.started.includes('sMouton') && w.hits >= 1 && Math.abs(e1 - (e0 - 15 + 4)) < 1.2,
      JSON.stringify({ ...w, dE: +(e1 - e0).toFixed(1) })) }
  await shot('p5-01-mouton'); await settle(120)
  // Whiff: travels the full distance and recovers long.
  await fresh(1100, 50)
  { await motion(QCF, 'l'); let n = 0; for (let i = 0; i < 120; i++) { await step(1); const a = await as(); if (a.move === 'sMouton') n++; else if (n) break }
    check('whiffed Mouton has extra recovery (> 54 frames)', n > 54 + 6, n) }
  await settle()

  // ── ANTI-MANNER KICK COURSE →·→+A ──
  await fresh(90, 50)
  { await motion(FF, 'l'); const w = await watch(40, (a, z) => false); const z = await zs()
    check('Anti-Manner Kick (→·→+A) starts + connects (overhead, crumples in place)', w.started.includes('sAntiManner') && w.hits >= 1 && z.hitstun >= 0, JSON.stringify(w)) }
  await settle(120)

  // ── PREMIER HACHIS ↓↙←+A ──
  await fresh(80, 50)
  { await motion(QCB, 'l'); const w = await watch(70)
    check('Premier Hachis (↓↙←+A) hits several times (≥6 low kicks)', w.started.includes('sHachis') && w.hits >= 6, JSON.stringify(w)) }
  await settle(120)

  // ── the Mouton route: Anti-Manner → Hachis → Mouton (special cancels on contact) ──
  await fresh(90, 100)
  { const seen = new Set(), hpA = (await zs()).hp
    await motion(FF, 'l')
    for (let i = 0; i < 40; i++) { await step(1); const a = await as(); if (a.move) seen.add(a.move); if ((await zs()).hp < hpA && a.move === 'sAntiManner') break }
    await motion(QCB, 'l')
    for (let i = 0; i < 30; i++) { await step(1); const a = await as(); if (a.move) seen.add(a.move); if (a.move === 'sHachis' && a.attacking) { const z = await zs(); if (z.hitstun > 0) break } }
    await motion(QCF, 'l')
    for (let i = 0; i < 30; i++) { await step(1); const a = await as(); if (a.move) seen.add(a.move) }
    check('cancel route Anti-Manner → Hachis → Mouton', ['sAntiManner', 'sHachis', 'sMouton'].every(k => seen.has(k)), [...seen].join()) }
  await settle(150)

  // ── PLATE KICK ↓↙←+B ──
  await fresh(380, 50)
  { const e0 = (await as()).energy, hp0 = (await zs()).hp
    await motion(QCB, 'k')
    let plate = null, vys = []
    for (let i = 0; i < 60; i++) { await step(1); const p = (await as()).projectiles.find(q => q.kind === 'plate'); if (p) { plate = plate || p; vys.push(p.vy) } if ((await zs()).hp < hp0) break }
    const e1 = (await as()).energy, hp1 = (await zs()).hp
    check('Plate Kick (↓↙←+B) launches a plate in a low ARC (vy rises)', !!plate && vys.length > 2 && vys[vys.length - 1] > vys[0], JSON.stringify({ n: vys.length, vy0: vys[0], vyN: vys[vys.length - 1] }))
    check('plate hits for 45 raw and gives +4 Heat (net −10 +4)', hp1 < hp0 && Math.abs(e1 - (e0 - 10 + 4)) < 1.2, JSON.stringify({ dmg: hp0 - hp1, dE: +(e1 - e0).toFixed(1) })) }
  await shot('p5-02-plate'); await settle(120)

  // ── SKY WALK air ↓↘→+B: two extra jumps, never a third ──
  await fresh(700, 60)
  { await tap(['w']); await step(6)
    const vys = []
    for (let k = 0; k < 3; k++) {
      await motion(QCF, 'k'); await step(2)
      const a = await as(); vys.push([a.vy, (await st()).skyWalks, a.onGround]); await step(10)
    }
    const [a1, a2, a3] = vys
    check('Sky Walk: air ↓↘→+B kicks off the air (vy up), max 2 per airborne sequence', a1[1] === 1 && a1[0] < -10 && a2[1] === 2 && a3[1] === 2, JSON.stringify(vys))
    await shot('p5-03-skywalk')
    for (let i = 0; i < 160; i++) { await step(1); if ((await as()).onGround) break }
    await step(3)
    check('Sky Walk count resets on landing', (await st()).skyWalks === 0, (await st()).skyWalks) }
  await settle()

  // ── CONCASSE air ↓·↓+A (lit: ground bounce + burning patch) ──
  await fresh(120, 100)
  await tap(['l', 'k']); for (let i = 0; i < 50; i++) await step(1)   // ignite Diable Jambe
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 90; z.hitstun = 0 }); await step(1)
  { await tap(['w']); await step(10)
    await motion(DD, 'l')
    let started = false, patch = null, bounced = false, hp0 = (await zs()).hp
    for (let i = 0; i < 70; i++) { await step(1); const a = await as(), z = await zs(); if (a.move === 'sConcasse') started = true; if (!patch && a.s?.patch) patch = a.s.patch; if (z.hp < hp0 && !z.onGround) bounced = true }
    const hp1 = (await zs()).hp
    check('Concasse (air ↓↓+A) dives, connects and ground-bounces the foe', started && hp1 < hp0 && bounced, JSON.stringify({ started, dmg: hp0 - hp1, bounced }))
    check('lit Concasse leaves a burning patch on the floor', !!patch, JSON.stringify(patch))
    await shot('p5-04-concasse') }
  await settle(150)

  // ── PARTY TABLE KICK COURSE ↓↘→↓↘→+A at 100 Heat ──
  await fresh(90, 100)
  { const hp0 = (await zs()).hp
    await motion([...QCF, ...QCF], 'l')
    const w = await watch(300, (a) => !a.attacking && !a.s?.inSuper)
    const s = await st(), e = (await as()).energy
    check('PARTY TABLE KICK COURSE (↓↘→↓↘→+A) starts and lands all 7 cuts', w.started.includes('sPTKC') && w.hits >= 7, JSON.stringify(w))
    check('super spends all Heat + 3 s Heat lockout afterwards', e === 0 && s.lockout > 100 && !s.inSuper, JSON.stringify({ e, lock: s.lockout, inSuper: s.inSuper }))
    check('super damage is combo-scaled but substantial (190..420 dealt)', w.dmg >= 190 && w.dmg <= 420, w.dmg) }
  await shot('p5-05-super-end'); await settle(150)
  // Ultimate button also fires it; lit finisher hits harder and the leg goes out.
  await fresh(90, 100)
  await tap(['l', 'k']); for (let i = 0; i < 45; i++) await step(1)
  await page.evaluate(() => { __harness.sanjiTest.heat('p1', 100); const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 90; z.hitstun = 0; z.y = a.y }); await step(1)
  { const lit0 = (await st()).dj > 0; await tap(['u']); const w = await watch(300, (a) => !a.attacking && !a.s?.inSuper)
    const s = await st()
    check('Ultimate button fires the super; lit heel-drop is the biggest cut; Diable Jambe ends', lit0 && w.started.includes('sPTKC') && w.hits >= 7 && !(s.dj > 0), JSON.stringify({ lit0, ...w, dj: s.dj })) }
  await settle(150)
  // Whiff: the first cut must connect.
  await fresh(800, 100)
  { await motion([...QCF, ...QCF], 'l'); const w = await watch(90, (a) => !a.attacking && a.move == null)
    check('a whiffed first cut → PTKC miss recovery, Heat still spent', w.started.includes('sPTKC') && w.started.includes('sPTKCMiss') && w.hits === 0 && (await as()).energy === 0, JSON.stringify(w)) }
  await settle(150)
  // Free after a completed Course: ↓↘→+A at 0 Heat.
  await fresh(90, 0)
  await page.evaluate(() => __harness.sanjiTest.set('p1', { ptkcFree: 200 })); await step(1)
  { await motion(QCF, 'l'); const w = await watch(20)
    check('completed-Course window: ↓↘→+A fires the super for FREE at 0 Heat', w.started.includes('sPTKC') && !w.started.includes('sMouton'), JSON.stringify(w)) }
  await settle(150)
}
