// harness/spd_red_render_scenarios.mjs — phase-gated scenario checks for harness/spd_red_render_check.mjs.
// P1 = S.P.D. Red vs P2 = Zoro, already in a live match. Real keyboard input for P1 (a=left d=right s=down w=up,
// j=Light k=Heavy l=Special). Every check drives the REAL game loop. Phase files: spd_red_scen_p<N>.mjs.
export async function run(X) {
  const { page, step, as, PHASE } = X
  const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
  async function motion(seq, button, gap = 2) {   // rolled like a stick: only the keys that change are pressed / released
    let held = []
    for (const k of seq) {
      const want = k == null ? [] : [].concat(k)
      for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
      for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
      held = want; await step(gap)
    }
    if (button) { for (const b of [].concat(button)) await page.keyboard.down(b); await step(1); for (const b of [].concat(button)) await page.keyboard.up(b) }
    for (const x of held) await page.keyboard.up(x)
  }
  const dtap = async (k, gap = 3) => { await tap([k]); await step(gap); await tap([k]) }   // double-tap on sim frames
  const fresh = async (dx = 200, delta = 100, opts = {}) => {
    await page.evaluate(() => __harness.spdRedTest.reset())
    await page.evaluate(([dx, delta, o]) => {
      __harness.spdRedTest.delta('p1', delta); const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2')
      a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = dx > 0 ? -1 : 1; a.facing = dx > 0 ? 1 : -1; z._forceGuard = !!o.guard
      for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.comboCounter = 0 }
    }, [dx, delta, opts])
    await step(3)
  }
  const zs = () => page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); return { x: z.x, y: z.y, hp: z.health, max: z.maxHealth, blocking: !!z.isBlocking, hitstun: z.hitstun || 0, facing: z.facing, hitstop: z.hitstop || 0, kd: !!z.knockdownState } })
  const settle = async (n = 80) => { for (let i = 0; i < n; i++) { await step(1); const s = await as(); if (!s.attacking && !(s.hitstun > 0) && !s.r?.blink) break } }
  Object.assign(X, { tap, motion, dtap, fresh, zs, settle })
  for (let p = 3; p <= Math.min(PHASE, 12); p++) {
    let mod = null
    try { mod = await import(`./spd_red_scen_p${p}.mjs`) } catch (e) { if (!/Cannot find module|ERR_MODULE_NOT_FOUND/.test(String(e))) throw e }
    if (mod) await mod.run(X)
  }
}
