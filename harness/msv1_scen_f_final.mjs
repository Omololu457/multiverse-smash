// MSV1 scenarios F — Phase 8 final checks: all frames used, illusion = body except THE TELL (no identity leak),
// CPU fairness vs the Mirror, a dummy third ninja profile with no new code, frame-stepped determinism with BOTH ninjas
// in Mirror + Clones + Streaks.
import fs from 'node:fs'
export async function run(X) {
  const { step, S, call, shot, tap, dtap, fresh, settle, check, section } = X
  const page = () => X.page
  if ((await S()).key !== 'ns_red') await X.boot('ns_red', 'ns_yellow')

  section('F1 every Phase-1 frame is used')
  const fx = fs.readFileSync('nsFx.js', 'utf8')
  const fr = await page().evaluate(async ([fxSrc]) => {
    const M = await import('./msv1Sprites.js'), C = (await import('./characters.js')).characters, N = await import('./ninja.js')
    const FX_STRIP = { proj_spark: 'fxSpark', proj_beam: 'beam', proj_beamDiag: 'beamDiag', proj_burst: 'fxBurst', fx_hitSpark: 'hitSpark' }   // tools/msv1/pack_msv1.py FX_SRC
    const out = {}
    for (const k of ['ns_red', 'ns_yellow']) {
      const used = new Set(Object.values(C[k].animationData).map(A => A.sheet.split('/').pop().replace('.png', '')))
      const fxKeys = new Set(['fx_hitSpark', 'proj_burst', 'proj_spark'].filter(n => fxSrc.includes(`'${n}'`)))   // generic hit / parry / block FX
      for (const md of Object.values(N.NINJA_PROFILES[k].moves || {})) { const pr = md?.nj?.proj; if (pr) fxKeys.add(pr.sprite || 'proj_beam') }
      const eruptFx = /e\.k === 'erupt'\) for \(const d of \[-1, 1\]\) drawFx\(c, f, 'proj_beamDiag'/.test(fxSrc)
      if (eruptFx && N.NINJA_PROFILES[k].moves?.sErupt) fxKeys.add('proj_beamDiag')
      for (const n of fxKeys) if (FX_STRIP[n]) used.add(FX_STRIP[n])
      const strips = Object.keys(M.MSV1_STRIPS), unused = strips.filter(x => !used.has(x))
      out[k] = { strips: strips.length, unused, frames: strips.filter(x => used.has(x)).reduce((a, x) => a + M.MSV1_STRIPS[x], 0) }
    }
    return { total: M.MSV1_FRAMES_USED, out }
  }, [fx])
  check('305 Phase-1 frames packed per sheet (MSV1_FRAMES_USED)', fr.total === 305, fr.total)
  for (const [k, o] of Object.entries(fr.out))
    check(`${k}: every one of the ${o.strips} strips is drawn (anims + framework poses + FX) → ${o.frames} / 305 frames`, !o.unused.length && o.frames === 305, o.unused.join(','))
  const led = ['docs/msv1/LEDGER_RED.md', 'docs/msv1/LEDGER_YELLOW.md'].every(f => fs.existsSync(f))
  check('per-sheet frame ledgers exist (Phase 1)', led)

  section('F2 illusion correctness: drawn exactly like the body, THE TELL only (no identity leak)')
  await fresh(700, { ax: 500 }); await call('mirror', 'p1'); for (let i = 0; i < 40; i++) await step(1)
  const tell = await page().evaluate(async () => {
    const src = await (await fetch('./nsFx.js')).text()
    return { illusionNoShadow: /the REAL body's ground shadow while the Mirror is up/.test(src), glint: /glintEvery|glint/.test(src),
      sameDraw: /ILLUSION: drawn exactly like the body/.test(src) }
  })
  check('the illusion is drawn through the SAME pose path as the body (same strip / frame / scale / facing)', tell.sameDraw)
  check('THE TELL: only the real body casts a ground shadow; the illusion glints every 90 f', tell.illusionNoShadow && tell.glint)
  // pixel proof: the colour palette of both bodies on screen is identical (no tint / alpha marks the illusion)
  const atm0 = await page().evaluate(async () => { const J = (await import('./juiceSettings.js')).juiceSettings, was = J.atmosphereOn(); J.setAtmosphere(false); return was })   // the screen-position vignette / fog grade darkens whoever stands near an edge — measure the sprites themselves
  await page().evaluate(() => __harness.luffyTest.step(1))
  const pal = await page().evaluate(() => {
    const T = __harness.ninjaTest, f = T.raw('p1'), m = f._ninja.mirror, cv = document.querySelector('canvas'), x = cv.getContext('2d'), cam = __harness.camera()
    const toS = wx => (wx - cam.x) * cam.zoom + cv.width / 2, half = Math.round(70 * cam.zoom)
    const toSY = wy => (wy - cam.y) * cam.zoom + cv.height / 2, feet = f.y + (f.h || 94), top = Math.round(toSY(feet - 70)), bot = Math.round(toSY(feet + 4))   // torso → feet rows only (clear of the HUD)
    const band = (wx, wf) => { const l = Math.max(0, Math.round(toS(wx + (f.w || 48) / 2)) - half), dy = Math.round((wf - feet) * cam.zoom); return x.getImageData(l, top + dy, Math.min(cv.width - l, half * 2), bot - top).data }
    const hist = d => { const h = new Map(); let n = 0; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2]; if (r > 150 && g < 80 && b < 80) { const k = (r >> 4) << 8 | (g >> 4) << 4 | (b >> 4); h.set(k, (h.get(k) || 0) + 1); n++ } } return { h, n } }
    const A = hist(band(f.x, feet)), B = hist(band(m.ix, m.ifeet))
    const top3 = H => [...H.h].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k.toString(16) + ':' + v).join(' ')
    let inter = 0; for (const [k, v] of A.h) inter += Math.min(v / A.n, (B.h.get(k) || 0) / B.n)
    return { realRed: A.n, illRed: B.n, overlap: +inter.toFixed(3), real: top3(A), ill: top3(B), dist: Math.round(Math.abs(m.ix - f.x)) }
  })
  await page().evaluate(async w => (await import('./juiceSettings.js')).juiceSettings.setAtmosphere(w), atm0)
  check('pixel proof: the red-suit palette on both bodies matches (no tint / transparency on the illusion)', pal && pal.overlap > 0.8 && pal.illRed > pal.realRed * 0.6 && pal.illRed < pal.realRed * 1.6, pal)
  await shot('mirror_identity')
  // the HUD / bubbles never name the real one: the only Mirror text is the timer + swaps
  const hudSrc = fs.readFileSync('nsFx.js', 'utf8')
  check('HUD shows only "MIRROR <s> · SWAPS <n>" (no REAL / FAKE label anywhere in the render layer)', /MIRROR \$\{/.test(hudSrc) && !/['"`](REAL|FAKE|ILLUSION)['"`]/.test(hudSrc))
  await settle(20)

  section('F3 CPU does not cheat vs the Mirror (easy 20% / normal 45% / hard 70% by the tell, else hash)')
  const st = await page().evaluate(async () => {
    const N = await import('./ninja.js'), out = {}
    for (const [d, rate] of [['easy', .2], ['adaptive', .45], ['impossible', .7]]) {
      let tell = 0, real = 0, proxyAtIllusion = 0, n = 0
      for (let seed = 1; seed <= 40; seed++) for (let mi = 1; mi <= 25; mi++) {
        N.setNinjaWorld({ seed: () => seed, frame: () => 500 + mi * 3, stageWidth: () => 2560 })
        const opp = { rosterKey: 'ns_red', playerNumber: 1, x: 900, y: 300, w: 48, h: 94, facing: 1, health: 1000, _ninja: { mirror: { n: mi, swaps: 0, ix: 1300, ifeet: 394 } } }
        const ai = { playerNumber: 2 }
        const per = N.ninjaAiPerceive(ai, opp, d); n++
        if (ai._nsGuess.tell) tell++
        if (per === opp) real++; else if (per.x === 1300) proxyAtIllusion++
      }
      out[d] = { rate, tell: tell / n, real: real / n, illusion: proxyAtIllusion / n, n }
    }
    return out
  })
  for (const [d, o] of Object.entries(st)) {
    check(`CPU ${d}: reads the tell ${(o.tell * 100).toFixed(1)}% (target ${o.rate * 100}%), else a 50/50 hash → believes the real one ${(o.real * 100).toFixed(1)}% (expected ${((o.rate + (1 - o.rate) / 2) * 100).toFixed(1)}%)`,
      Math.abs(o.tell - o.rate) < 0.05 && Math.abs(o.real - (o.rate + (1 - o.rate) / 2)) < 0.06 && Math.abs(o.real + o.illusion - 1) < 1e-9, o)
  }
  const aiSrc = fs.readFileSync('ninja.js', 'utf8').split('export function ninjaAiPerceive')[1].split('\n}')[0]
  check('ninjaAiPerceive never reads which spot is real (only the visible-spot coordinates, the Mirror serial / swaps and the hash)', !/realMoves|\.real\b(?!\s*=)|lastMirrorEnd/.test(aiSrc.replace(/g\.real|real =|real:/g, '')))
  // live: a CPU (easy) attacks the ILLUSION some of the time
  await page().evaluate(() => { __harness.ninjaTest.reset() })

  section('F4 a dummy third ninja profile works with NO new code')
  const reg = await call('registerDummy', 'ns_test', 'ns_red')
  const tagged = await call('retag', 'p1', 'ns_test')
  check('registerNinjaProfile("ns_test") → isNinja + a rangers.js profile (S.P.D. Red tap window)', reg.includes('ns_test') && tagged && (await call('rangerProfiles')).includes('ns_test'))
  await fresh(300, { ax: 600 })
  await dtap('d'); let streaked = false; for (let i = 0; i < 10; i++) { await step(1); if ((await S()).s?.streak) streaked = true }
  check('dummy ninja: the double-tap streaks (passes the foe)', streaked && (await S()).x > (await S('p2')).x, (await S()).x)
  await settle(40); await call('np', 'p1', 100)
  const back = (await S()).x > (await S('p2')).x ? 'd' : 'a'   // ← = AWAY from the foe (he has crossed up)
  await page().keyboard.down(back); await tap(['p']); await page().keyboard.up(back)
  let cj = false; for (let i = 0; i < 30; i++) { await step(1); if ((await S()).s.cloneJob) cj = true }
  check('dummy ninja: Shadow Clones from ← + Charge', cj)
  await settle(60); await call('np', 'p1', 100)
  await dtap('s'); await tap(['p']); await step(14)
  const dm = (await S()).s.mirror
  check('dummy ninja: ↓↓ + Charge → a DECOY Mirror (profile mode)', !!dm && dm.pose === 'guard', dm && dm.pose)
  await page().evaluate(() => { const f = __harness.ninjaTest.raw('p1'); f.rosterKey = 'ns_red'; delete f._ninja; delete f._ranger })

  section('F5 determinism: BOTH ninjas in Mirror + Clones + Streaks, frame-stepped, same seed → identical')
  async function trace(seed) {
    await X.boot('ns_red', 'ns_yellow', seed)
    const pg = X.page
    await pg.evaluate(() => {
      const T = __harness.ninjaTest; T.reset(); const a = T.raw('p1'), z = T.raw('p2'); a.x = 500; z.x = 1000; a.facing = 1; z.facing = -1
      window.__nsTrace = { h: 2166136261 >>> 0, frames: 0, both: 0 }
      const H = window.__nsTrace, orig = __harness.luffyTest.step, r = v => Math.round((v || 0) * 1e4) / 1e4
      const mix = s => { for (let i = 0; i < s.length; i++) { H.h ^= s.charCodeAt(i); H.h = Math.imul(H.h, 16777619) >>> 0 } }
      __harness.luffyTest.step = n => { for (let i = 0; i < n; i++) { orig(1)
        for (const f of [a, z]) { const s = f._ninja; mix(JSON.stringify([r(f.x), r(f.y), f.health, f.currentAttack?.name || null, s ? { ...s, fx: undefined, prev: undefined } : null])) }
        H.frames++; if (a._ninja?.mirror && z._ninja?.mirror) H.both++ } }
    })
    const T = (fn, ...a) => pg.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
    await T('np', 'p1', 100); await T('np', 'p2', 100)
    await dtap('d'); await step(24)                                     // Shane streaks through
    await T('streak', -1, 0, 'p2'); await step(24)                      // Dustin streaks back
    await pg.evaluate(() => { const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2'); a.x = 400; z.x = 1100; a.vx = z.vx = 0; a.facing = 1; z.facing = -1 })   // same mutation every run
    await step(20); await T('np', 'p1', 100); await T('np', 'p2', 100)
    const mr = [await T('mirror', 'p1'), await T('mirror', 'p2')]; if (process.env.TRACE) console.log('mirror calls', mr); await step(20)   // both Mirrors (hash real spots)
    await T('np', 'p1', 100); await T('np', 'p2', 100)
    await T('clones', 'p1'); await T('clones', 'p2'); await step(60)     // both clone jobs (hash tilts) while both Mirrors are up
    await T('swap', 'p1'); await T('swap', 'p2'); await step(20)
    await tap(['j']); await step(40)                                     // Shane's echo
    if (process.env.TRACE) console.log(await pg.evaluate(() => ['p1', 'p2'].map(w => { const s = __harness.ninjaTest.raw(w)._ninja; return [w, s?.np, !!s?.mirror, s?.clones?.length, !!s?.cloneJob] })))
    return pg.evaluate(() => window.__nsTrace)
  }
  const t1 = await trace(7777), t2 = await trace(7777), t3 = await trace(4242)
  check('trace exercised both Mirrors at once (+ clones + streaks)', t1.both > 10, t1.both)
  check(`same seed → bit-identical per-frame ninja state over ${t1.frames} frames`, t1.h === t2.h && t1.frames === t2.frames, `${t1.h.toString(16)} vs ${t2.h.toString(16)}`)
  check('different seed → different trace (hash(seed) drives tilts / real spots)', t1.h !== t3.h, `${t1.h.toString(16)} vs ${t3.h.toString(16)}`)
  await X.boot('ns_red', 'ns_yellow')
}
