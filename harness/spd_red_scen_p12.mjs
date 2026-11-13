// Phase 12 scenarios — FINAL RENDER CHECK. The p3..p11 scenarios have just run in this same match (render check
// phase 12 runs them all). This adds a mid-TELEPORT frame (body gone, streak drawn, game still rendering) and then
// confirms that THIS run produced non-blank screenshots of both verdicts (GUILTY poster + containment, INNOCENT) and
// the Super (blink strike + beam, both the 180 and the GUILTY 220 version).
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh, dtap } = X
  const OUT = '/tmp/ms-spd-red-render'
  await fresh(600, 50)
  await dtap('d', 3)
  let mid = null
  for (let i = 0; i < 10 && !mid; i++) {
    await step(1)
    const s = await page.evaluate(async () => { const fx = await import('./spdRedFx.js'); const a = __harness.spdRedTest.raw('p1'); return { phase: a._ranger?.blink?.phase || null, alpha: fx.spdRedBodyAlpha(a), inv: a.invulnTimer || 0 } })
    if (s.phase === 'travel') mid = s
  }
  await shot(`p${PHASE}-90-final-teleport`)
  const px = await page.evaluate(() => {
    const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, c.height * 0.3, c.width, c.height * 0.6).data, s = new Set()
    for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size
  })
  check('FINAL render: mid-teleport frame (body vanished, invulnerable) renders a full scene', mid && mid.alpha === 0 && mid.inv > 0 && px > 40, JSON.stringify({ mid, px }))
  const need = [['GUILTY verdict poster', `p${PHASE}-31-guilty-poster`], ['GUILTY containment card', `p${PHASE}-32-containment`], ['INNOCENT verdict', `p${PHASE}-33-innocent`],
    ['Super blink strike', `p${PHASE}-61-super-strike`], ['Super beam (180)', `p${PHASE}-62-super-beam`], ['Super beam after GUILTY (220)', `p${PHASE}-62-super-beam-guilty`]]
  for (const [label, f] of need) {
    const p = `${OUT}/${f}.png`, ok = fs.existsSync(p) && fs.statSync(p).mtimeMs > Date.now() - 30 * 60 * 1000 && fs.statSync(p).size > 20000
    check(`FINAL render: ${label} screenshot produced by this run`, ok, ok ? `${Math.round(fs.statSync(p).size / 1024)} KB` : p)
  }
}
