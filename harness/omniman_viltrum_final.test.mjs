// harness/omniman_viltrum_final.test.mjs — MSV1-OMNIMAN phase 6 final checks that no other suite covers:
//   1. every frame used: every sheet piece (slice_report) landed in a strip; every strip on disk is frames × cell wide
//      and every frame cell has pixels; the pink afterimage is intact after keying (pixel count, hue, distance to the key)
//   3. speed scaling: the flight punch (64 raw) measured LIVE at 0 / 50 / 100 % speed vs the design curve
//      raw × (1 + 0.60 × speed fraction) → 64 / 83 / 102
//   node harness/omniman_viltrum_final.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}, errs = []
const SR = JSON.parse(fs.readFileSync('docs/msv1/omniman/slice_report.json', 'utf8'))
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
await page.goto(server.base + '/index.html?harness=1&p1=omniman_viltrum&p2=homelander&seed=31')
await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const st = (w = 'p1') => page.evaluate(w => __harness.omnimanViltrumTest.state(w), w)
try {
  // ── 1. every frame used ──
  R.rows = SR.rows.map(r => ({ row: r.row, pieces: r.pieces, kinds: [...new Set(r.kinds)] }))
  ck('every sheet piece was used (slice report: nothing unused, nothing excluded)', Array.isArray(SR.unused) && SR.unused.length === 0, JSON.stringify(SR.unused).slice(0, 200))
  const disk = await page.evaluate(async () => {
    const { omniman_viltrum } = await import('./omnimanViltrumData.js')
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src })
    const out = {}
    for (const [k, d] of Object.entries(omniman_viltrum.animationData)) {
      if (!d?.sheet) continue; const im = await load(d.sheet); if (!im) { out[k] = { missing: d.sheet }; continue }
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0)
      const D = x.getImageData(0, 0, c.width, c.height).data, empty = []
      for (let f = 0; f < d.frames; f++) { let n = 0; for (let y = 0; y < d.height; y++) for (let xx = f * d.width; xx < (f + 1) * d.width; xx++) if (D[(y * c.width + xx) * 4 + 3] > 0) n++; if (!n) empty.push(f) }
      out[k] = { frames: d.frames, w: im.naturalWidth, cellW: d.width, h: im.naturalHeight, cellH: d.height, empty }
    }
    const ai = await load('./assets/omniman_viltrum/fx/afterimage.png'), c = document.createElement('canvas'); c.width = ai.naturalWidth; c.height = ai.naturalHeight
    const x = c.getContext('2d'); x.drawImage(ai, 0, 0); const D = x.getImageData(0, 0, c.width, c.height).data
    let n = 0, pink = 0, minBg = 1e9
    for (let i = 0; i < D.length; i += 4) { if (!D[i + 3]) continue; n++; const r = D[i], g = D[i + 1], b = D[i + 2]
      if (r > g + 20 && b > g) pink++; minBg = Math.min(minBg, Math.hypot(r - 140, g - 70, b - 130)) }
    return { strips: out, after: { n, pink, minBg: Math.round(minBg), w: ai.naturalWidth, h: ai.naturalHeight } }
  })
  const strips = Object.entries(disk.strips), bad = strips.filter(([, v]) => v.missing || v.empty?.length || v.w !== v.frames * v.cellW || v.h !== v.cellH)
  R.strips = Object.fromEntries(strips.map(([k, v]) => [k, v.frames]))
  R.totalFrames = strips.reduce((a, [, v]) => a + (v.frames || 0), 0)
  ck(`every strip on disk = frames × cell and every frame has pixels (${strips.length} strips, ${R.totalFrames} frames)`, strips.length > 0 && !bad.length, JSON.stringify(bad.slice(0, 3)))
  const srAnims = Object.entries(SR.anims).filter(([k, a]) => disk.strips[k] && disk.strips[k].frames !== a.frames)
  ck('… frame counts match the slice report', !srAnims.length, JSON.stringify(srAnims.map(([k]) => k)))
  R.afterimage = disk.after
  ck('afterimage frame (beside the pink key) intact after keying: all 569 sliced pixels kept, none within 40 of the key colour', disk.after.n === SR.keyCheck.afterimageSourcePixels && disk.after.minBg >= 40, JSON.stringify(disk.after))

  // ── 3. speed scaling: flight punch measured live at 0 / 50 / 100 % ──
  const D = await page.evaluate(() => __harness.omnimanViltrumTest.data())
  const raw = D.moves.kAir.raw, max = D.speedDmg.max
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) })
  const table = []
  for (const target of [0, 0.5, 1]) {
    await page.evaluate(() => { const H = __harness.omnimanViltrumTest; H.reset(); __harness.setDummyBehavior('stand')
      for (const f of [H.raw(), H.raw('p2')]) { f.health = f.maxHealth; f.energy = f.maxEnergy; f.hitstun = 0; f.invulnTimer = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } })
    await step(2)
    await page.evaluate(() => __harness.omnimanViltrumTest.place(600, 300))
    await page.evaluate(() => __harness.omnimanViltrumTest.fly())
    await step(14)   // airborne, takeoff done
    const foe0 = await page.evaluate(() => { const H = __harness.omnimanViltrumTest, a = H.raw(), b = H.raw('p2'); return { hp: b.health, bx: b.x, ay: a.y, by: b.y } })
    // the punch is thrown so it connects on its first active frame: he starts just out of reach moving at the target speed
    // (100 %: holding → at top speed; 50 %: a set speed, coasting; 0 %: hovering beside him)
    const TOPV = D.top
    await page.evaluate(([t, TOPV]) => { const H = __harness.omnimanViltrumTest, a = H.raw(), b = H.raw('p2')
      a.y = b.y + (b.h - a.h) * 0.5; a.facing = 1
      if (t === 0) { a.x = b.x - a.w - 30; a.vx = 0; a.vy = 0 }
      else { const lead = t === 1 ? 6 : 6; a.vx = TOPV * (t === 1 ? 1 : 0.5 / Math.pow(0.9292, 3)); a.vy = 0; a.x = b.x - a.w - 30 - a.vx * lead }
    }, [target, TOPV])
    if (target === 1) await page.keyboard.down('d')
    await page.keyboard.down('j'); await step(2); await page.keyboard.up('j')
    let hit = null; for (let i = 0; i < 30; i++) { await step(1); const q = await st(); if (q.s?.stats.hits > 0) { hit = q; break } }
    if (target === 1) await page.keyboard.up('d')
    await step(6)
    const lost = foe0.hp - (await st('p2')).hp
    const frac = hit?.s.stats.lastFrac ?? null, mult = hit?.s.stats.lastMult ?? null
    table.push({ target, frac: frac != null ? +frac.toFixed(3) : null, mult: mult != null ? +mult.toFixed(3) : null, lost, design: Math.round(raw * (1 + max * target)), atFrac: frac != null ? Math.round(raw * (1 + max * frac)) : null })
  }
  R.damageTable = table
  for (const r of table) {
    ck(`flight punch at ${r.target * 100} % speed: lands at ${r.frac == null ? '?' : Math.round(r.frac * 100)} % → multiplier = 1 + 0.6 × fraction, damage ${r.lost} (design ${r.design})`,
      r.frac != null && Math.abs(r.frac - r.target) <= 0.15 && Math.abs(r.mult - (1 + max * r.frac)) < 0.01 && Math.abs(r.lost - r.atFrac) <= 2, JSON.stringify(r))
  }
  ck('… damage rises with speed (0 % < 50 % < 100 %)', table[0].lost < table[1].lost && table[1].lost < table[2].lost, JSON.stringify(table.map(r => r.lost)))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/omniman/final_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  OMNIMAN_VILTRUM FINAL CHECKS: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
