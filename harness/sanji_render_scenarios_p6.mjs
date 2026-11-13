// harness/sanji_render_scenarios_p6.mjs — PHASE 6: the five brief COMBOS, driven with REAL keyboard inputs on the Zoro
// dummy. Each hit is recorded (damage, whether the foe was still in hitstun / airborne = a TRUE combo, the Course step
// it advanced). 85% per-hit scaling is verified against raw × 0.85^k × 0.6 (GLOBAL_DAMAGE_SCALE); the measured table
// is written to /tmp/ms-sanji-render/combos.json (docs/sanji/COMBOS.md quotes it).
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, tap, motion } = X
  const SCALE = 0.6
  const QCF = ['s', ['s', 'd'], 'd'], QCB = ['s', ['s', 'a'], 'a'], FF = ['d', null, 'd'], DD = ['s', null, 's']
  // burnTick: true on the frame a Diable Jambe burn tick (3, unscaled) landed — read from Sanji's own state.
  const foe = () => page.evaluate(() => { const z = __harness.sanjiTest.raw('p2'), s = __harness.sanjiTest.raw('p1')._sanji
    const burnTick = !!s && s.burn > 0 && s.burn < 120 && s.burnTick === 0 && (120 - s.burn) % 20 === 0
    return { hp: z.health, stun: (z.hitstun || 0) > 0 || !!z.knockdownState || !(z.onGround || z.grounded), y: z.y, burnTick } })
  const hold = async (keys, btn) => { for (const k of keys) await page.keyboard.down(k); await tap([btn]); for (const k of keys) await page.keyboard.up(k) }
  // Input actions (P1 faces right: d = forward, a = back).
  const A = {
    collier: () => tap(['j']), epaule: () => hold(['d'], 'j'), cotelette: () => tap(['k']), selle: () => hold(['d'], 'k'),
    poitrine: () => hold(['a'], 'k'), gigot: () => hold(['s', 'd'], 'j'), airkick: () => tap(['j']),
    jump: async () => { await page.keyboard.down('w'); await step(2); await page.keyboard.up('w') },
    fjump: async () => { await page.keyboard.down('d'); await page.keyboard.down('w'); await step(2); await page.keyboard.up('w'); await page.keyboard.up('d') },
    mouton: () => motion(QCF, 'l'), amkc: () => motion(FF, 'l'), hachis: () => motion(QCB, 'l'), concasse: () => motion(DD, 'l'),
    skywalk: () => motion(QCF, 'k'), super: () => motion(QCF, 'l'),   // in the completed-Course window the super is ↓↘→+A
    ignite: async () => { await tap(['l', 'k']); for (let i = 0; i < 44; i++) await step(1) },
    wait: async () => {}, step: async () => step(4),
  }
  const INPUT = { collier: 'L', epaule: '→+L', cotelette: 'H', selle: '→+H', poitrine: '←+H', gigot: '↘+L', airkick: 'air L', jump: '↑', fjump: '↗',
    mouton: '↓↘→+S', amkc: '→·→+S', hachis: '↓↙←+S', concasse: 'air ↓·↓+S', skywalk: 'air ↓↘→+H', super: '↓↘→+S (free window)', ignite: 'S+H', wait: '', step: '' }
  async function route(name, setup, steps) {
    await fresh(setup.dx ?? 96, setup.heat ?? 100)
    await page.evaluate(() => {   // clean dummy: no leftover wake-up invulnerability / knockdown
      const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2')
      a.comboCounter = 0; z.health = z.maxHealth; z.invulnTimer = 0; z.knockdownState = false; z.knockdownTimer = 0; z.hitstun = 0; z.blockstun = 0
    })
    if (setup.pre) await setup.pre()
    await step(2)
    const hits = []; let prev = await foe(), dropped = false
    for (const [act, raw, n0 = 1, maxWait = 40] of steps) {
      await A[act]()
      let got = 0; const n = raw ? n0 : 0
      for (let i = 0; i < maxWait && got < n; i++) {
        const pre = prev; await step(1); const cur = await foe()
        if (cur.hp < pre.hp) {
          let d = +(pre.hp - cur.hp).toFixed(2); const b = await as()
          if (cur.burnTick) { hits.push({ act: 'burn', burn: true, dmg: 3 }); d = +(d - 3).toFixed(2) }   // a Diable Jambe burn tick (3, unscaled)
          if (d < 0.01) { prev = cur; continue }
          hits.push({ act, raw, input: INPUT[act], move: b.move, dmg: d, combo: hits.filter(h => !h.burn).length === 0 || pre.stun, course: b.s?.course, free: b.s?.ptkcFree > 0 })
          if (hits.filter(h => !h.burn).length > 1 && !pre.stun) dropped = true
          got++
        }
        prev = cur
      }
    }
    for (let i = 0; i < 260; i++) { await step(1); const s = await as(); if (!s.attacking && !s.s?.inSuper) break }
    await shot(`p${PHASE}-6x-${name.replace(/\W+/g, '_')}`)
    const real = hits.filter(h => !h.burn)
    const total = +hits.reduce((t, h) => t + h.dmg, 0).toFixed(2)
    return { name, hits, real, total, dropped, want: steps.flatMap(([a, raw, n = 1]) => (raw ? Array(n).fill(raw) : [])) }
  }
  const R = []
  // Expected scaled hit k: raw × 0.85^k × 0.6; from `lockAt` on (the super) the scale is frozen at max(0.5, 0.85^lockAt).
  const expect = (want, lockAt = -1) => want.map((raw, k) => raw * SCALE * (lockAt >= 0 && k >= lockAt ? Math.max(0.5, Math.pow(0.85, lockAt)) : Math.pow(0.85, k)))
  const verify = (r, lockAt = -1, extra = '') => {
    const ex = expect(r.want, lockAt)
    const ok = r.real.length === r.want.length && r.real.every((h, k) => Math.abs(h.dmg - ex[k]) <= 1.6) && !r.dropped
    check(`combo "${r.name}": ${r.real.length}/${r.want.length} hits, true combo, 85% scaling (${r.total} dmg)${extra}`, ok,
      JSON.stringify({ got: r.real.map(h => h.move + ':' + h.dmg), want: ex.map(v => +v.toFixed(1)), dropped: r.dropped }))
    R.push({ ...r, expected: ex.map(v => +v.toFixed(2)) })
    return ok
  }

  // 1 · Collier → Épaule → Côtelette → Mouton Shot (3 Course steps, safe route)
  { const r = await route('1 Safe route', {}, [['collier', 45], ['epaule', 60], ['cotelette', 70], ['mouton', 110]])
    verify(r)
    check('combo 1 advances the Course 1 → 2 → 3', r.real.slice(0, 3).map(h => h.course).join() === '1,2,3', r.real.map(h => h.course).join()) }

  // 2 · Gigot (low) → Selle → Poitrine (launch) → air kick → Concasse
  verify(await route('2 Low launch', { dx: 90 }, [['gigot', 50], ['selle', 65], ['poitrine', 80], ['jump', 0], ['airkick', 65, 1, 30], ['concasse', 120, 1, 50]]))

  // 3 · THE FULL COURSE → PARTY TABLE KICK COURSE (the showcase; Heat 0, the super is the free one)
  { const r = await route('3 Full Course', { heat: 0 }, [['collier', 45], ['epaule', 60], ['cotelette', 70], ['selle', 65], ['poitrine', 80], ['gigot', 50],
      ['super', 55, 6, 200], ['wait', 90, 1, 80]])
    verify(r, 6)
    check('combo 3: the six kicks light pips 1..6 and open the free window, the super fires at 0 Heat',
      r.real.slice(0, 5).map(h => h.course).join() === '1,2,3,4,5' && r.real[5]?.free && r.real.slice(6).every(h => h.move === 'sPTKC'),
      JSON.stringify(r.real.map(h => [h.move, h.course, h.free]))) }

  // 4 · Diable Jambe ignite → Anti-Manner Kick Course (overhead) → Premier Hachis → Mouton Shot (lit ×1.25, burn ticks aside)
  { const lit = v => Math.round(v * 1.25)
    const r = await route('4 Diable route', { dx: 90, heat: 95, burn: true }, [['ignite', 0], ['amkc', lit(100), 1, 50], ['hachis', lit(15), 8, 70], ['mouton', lit(110), 1, 40]])
    verify(r, -1, ' (lit)')
    // Every lit kick refreshes the burn (never stacks), so the 3-damage ticks land once the kicks stop.
    const b0 = (await foe()).hp, lit0 = (await as()).s?.burn > 0; for (let i = 0; i < 60; i++) await step(1); const b1 = (await foe()).hp
    check('combo 4 leaves the foe burning: ticks of 3 after the last kick', lit0 && b0 - b1 >= 6 && Math.abs((b0 - b1) % 3) < 0.01,
      JSON.stringify({ lit0, after: b0 - b1 })) }

  // 5 · Air: Sky Walk → Sky Walk → Concasse (air mobility pressure from a full screen-third away)
  { const r = await route('5 Sky route', { dx: 330 }, [['fjump', 0], ['skywalk', 0], ['step', 0], ['skywalk', 0], ['step', 0], ['concasse', 120, 1, 70]])
    verify(r) }

  fs.writeFileSync('/tmp/ms-sanji-render/combos.json', JSON.stringify(R, null, 1))
}
