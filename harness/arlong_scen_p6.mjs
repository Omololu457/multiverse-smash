// Phase 6 scenarios — COMBOS in Training: every documented route is driven with REAL inputs on the Zoro dummy.
// Each hit is recorded (damage, whether the foe was still in hitstun / airborne / knocked down = a TRUE combo),
// 85% per-hit scaling is verified, and the measured table is written to /tmp/ms-arlong-render/combos.json
// (docs/arlong/COMBOS.md quotes it). Called by arlong_scen_p5.mjs.
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, tap, motion } = X
  const F = ['d'], B = ['a'], D = ['s'], DF = ['s', 'd'], DB = ['s', 'a']
  const foe = () => page.evaluate(() => { const z = __harness.arlongTest.raw('p2'); return { hp: z.health, stun: (z.hitstun || 0) > 0 || !!z.knockdownState || !z.onGround } })
  const SCALE = 0.6
  // A step: an input action + the raw damage it should deal. Waits (≤ maxWait) for the hit(s), recording each one.
  const A = {
    L: () => tap(['j']), H: () => tap(['k']), fL: async () => { await page.keyboard.down('d'); await tap(['j']); await page.keyboard.up('d') },
    dL: async () => { await page.keyboard.down('s'); await tap(['j']); await page.keyboard.up('s') },
    dH: async () => { await page.keyboard.down('s'); await tap(['k']); await page.keyboard.up('s') },
    fH: async () => { await page.keyboard.down('d'); await tap(['k']); await page.keyboard.up('d') },
    uH: async () => { await page.keyboard.down('w'); await tap(['k']); await page.keyboard.up('w') },
    tooth: () => motion([D, DF, F], 'l'), darts: () => motion([F, null, F], 'l'), seiken: () => motion([D, DB, B], 'l'),
    noop: async () => {}, tidal: () => motion([D, null, D], 'l'), shot: () => motion([D, DB, B], 'k'), super: () => motion([D, DF, F, D, DF, F], 'l'),
  }
  async function route(name, dx, steps, tide = 100) {
    await fresh(dx, tide)
    await page.evaluate(() => {   // a clean dummy: no leftover wake-up invulnerability / knockdown from earlier scenarios
      const a = __harness.arlongTest.raw('p1'), z = __harness.arlongTest.raw('p2')
      a.comboCounter = 0; z.health = z.maxHealth; z.invulnTimer = 0; z.knockdownState = false; z.knockdownTimer = 0; z.hitstun = 0; z.blockstun = 0
    })
    await step(2)
    const hits = []; let prev = await foe(), dropped = false
    for (const [act, raw, n = 1, maxWait = 40] of steps) {
      await A[act]()
      let got = 0
      for (let i = 0; i < maxWait && got < n; i++) {
        const pre = prev; await step(1); const cur = await foe()
        if (cur.hp < pre.hp) { hits.push({ act, raw, move: (await as()).move, dmg: +(pre.hp - cur.hp).toFixed(2), combo: hits.length === 0 || pre.stun }); if (hits.length > 1 && !pre.stun) dropped = true; got++ }
        prev = cur
      }
    }
    for (let i = 0; i < 60; i++) { await step(1); const s = await as(); if (!s.attacking) break }
    await shot(`p${PHASE}-6x-${name.replace(/\W+/g, '_')}`)
    const total = +hits.reduce((t, h) => t + h.dmg, 0).toFixed(2)
    const want = steps.flatMap(([a, raw, n = 1]) => Array(n).fill(raw))
    return { name, hits, total, dropped, want }
  }
  const R = []
  // Each scaled hit k (0-based) = raw × 0.85^k × 0.6 (combo ×0.85 per hit; the ARLONG PARK scale is locked at its start).
  const expect = (want, lockAt = -1) => want.map((raw, k) => raw * Math.pow(0.85, lockAt >= 0 && k >= lockAt ? lockAt : k) * SCALE)
  const verify = (r, lockAt = -1) => {
    const ex = expect(r.want, lockAt)
    const ok = r.hits.length === r.want.length && r.hits.every((h, k) => Math.abs(h.dmg - ex[k]) <= 1.6) && !r.dropped
    check(`combo "${r.name}": ${r.hits.length}/${r.want.length} hits, true combo, 85% scaling (${r.total} dmg)`, ok,
      JSON.stringify({ got: r.hits.map(h => h.move + ':' + h.dmg), want: ex.map(v => +v.toFixed(1)), dropped: r.dropped }))
    R.push({ ...r, expected: ex.map(v => +v.toFixed(2)) })
  }
  verify(await route('Saw string', 110, [['L', 45], ['L', 70], ['H', 90], ['dH', 110]]))
  verify(await route('Low tide', 110, [['dL', 55], ['fL', 70], ['tidal', 80]]))
  verify(await route('Torpedo refill', 110, [['L', 45], ['fL', 70], ['darts', 135]]))
  verify(await route('Bite route', 90, [['L', 45], ['fH', 100], ['tooth', 120]]))
  verify(await route('Seiken ender', 110, [['L', 45], ['fL', 70], ['seiken', 115, 1, 60]]))
  verify(await route('Park', 110, [['L', 45], ['fL', 70], ['super', 60, 4, 140], ['super', 120, 1, 60]].map((s, i) => i === 3 ? ['noop', 120, 1, 60] : s)), 2)
  const t = await as()
  check('combo route leaves teeth bookkeeping consistent (0-3)', t.a.teeth >= 0 && t.a.teeth <= 3, t.a.teeth)
  fs.writeFileSync('/tmp/ms-arlong-render/combos.json', JSON.stringify(R, null, 1))
  if (PHASE >= 7) { const m = await import('./arlong_scen_p7.mjs'); await m.run(X) }
}
