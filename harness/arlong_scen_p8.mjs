// Phase 8 scenarios — SOUND. (1) no Math.random / gameRng in any arlong*.js; (2) all ten brief recipes render real,
// non-silent audio (OfflineAudioContext) with the specified shapes; (3) gameplay driven by REAL inputs fires every
// recipe through SoundManager.play (the SFX path); (4) Arlong never touches the voice bus. Called by arlong_scen_p7.mjs.
import fs from 'node:fs'
import path from 'node:path'
export async function run(X) {
  const { page, step, as, check, fresh, tap, motion, settle } = X
  const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const f of fs.readdirSync('.').filter(f => /^arlong.*\.js$/.test(f))) check(`${f}: no Math.random / gameRng`, !/Math\.random|gameRng/.test(strip(fs.readFileSync(path.join('.', f), 'utf8'))))
  const R = await page.evaluate(async () => {
    const { ARLONG_SOUNDS, ARLONG_SOUND_RECIPES } = await import('./arlongSound.js'), out = { cues: {}, recipes: {} }
    const render = async fn => {
      const ctx = new OfflineAudioContext(1, 44100 * 2.6, 44100); fn(ctx, ctx.destination)
      const d = (await ctx.startRendering()).getChannelData(0)
      let peak = 0, last = 0, first = -1; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 1e-3) { last = i; if (first < 0) first = i } }
      // energy over 4 equal quarters of the sounding span (shape of the envelope)
      const q = [0, 0, 0, 0], span = Math.max(1, last - first); for (let i = first; i <= last; i++) q[Math.min(3, Math.floor((i - first) / span * 4))] += d[i] * d[i]
      return { peak: +peak.toFixed(3), ms: Math.round(last / 44.1), q: q.map(v => +v.toFixed(2)) }
    }
    for (const [id, fn] of Object.entries(ARLONG_SOUNDS)) out.cues[id] = await render(fn)
    for (const [id, fn] of Object.entries(ARLONG_SOUND_RECIPES)) out.recipes[id] = await render(fn)
    const a = await render(ARLONG_SOUND_RECIPES.bladeHit), b = await render(ARLONG_SOUND_RECIPES.bladeHit)
    out.det = JSON.stringify(a) === JSON.stringify(b)
    return out
  })
  for (const [id, r] of Object.entries(R.cues)) check(`${id} renders audible audio`, r.peak > 0.005 && r.ms > 20, `peak ${r.peak}, ${r.ms} ms`)
  const rec = R.recipes
  check("the brief's ten recipes all exist", Object.keys(rec).length === 10, Object.keys(rec).join(', '))
  check('blade swing ≈ 120 ms heavy whoosh', rec.bladeSwing.ms >= 90 && rec.bladeSwing.ms <= 140, `${rec.bladeSwing.ms} ms`)
  check('standing-in-water lap is VERY quiet', rec.lap.peak < 0.08 && rec.lap.peak > 0.002, `peak ${rec.lap.peak}`)
  check('water-zone splash: fast-decay envelope (front-loaded)', rec.splash.q[0] > rec.splash.q[3] * 4, JSON.stringify(rec.splash.q))
  check('Super flood: long rumble that BUILDS, then the crash', rec.flood.ms > 1800 && rec.flood.q[1] > rec.flood.q[0], `${rec.flood.ms} ms q=${JSON.stringify(rec.flood.q)}`)
  check('recipes are deterministic (seeded noise)', R.det)

  // ── gameplay fires every recipe through SoundManager.play (SFX path), never the voice path ──
  await page.evaluate(() => {
    window.__as = []; window.__av = []
    const s = __harness.__sound, play = s.play.bind(s), sfx = s.playSfxFile?.bind(s)
    if (!s.__alWrapped) {
      s.__alWrapped = true
      s.play = id => { window.__as.push(id); return play(id) }
      if (sfx) s.playSfxFile = (...a) => { if (s._voiceOwner?.rosterKey === 'arlong') window.__av.push(String(a[0])); return sfx(...a) }
    }
  })
  const F = ['d'], B = ['a'], D = ['s'], DF = ['s', 'd'], DB = ['s', 'a']
  const clean = () => page.evaluate(() => { const z = __harness.arlongTest.raw('p2'); z.invulnTimer = 0; z.knockdownState = false; z.health = z.maxHealth })
  await fresh(110, 100); await clean(); await tap(['k']); await settle()                       // swing + bladeHit
  await fresh(110, 100); await clean(); await tap(['j']); await settle()                       // punch
  await fresh(90, 100); await clean(); await page.keyboard.down('d'); await tap(['k']); await page.keyboard.up('d'); await settle()   // bite
  await fresh(300, 100); await clean(); await motion([F, null, F], 'l'); await settle(90)      // darts + zone splash
  await page.evaluate(() => { const a = __harness.arlongTest.raw('p1'); __harness.arlongTest.zone(a.x + 24, 230) }); await step(100)   // standing in water → lap
  await fresh(380, 100); await clean(); await motion([D, DB, B], 'l'); await step(60); await settle()   // seiken
  await fresh(500, 100); await clean(); await motion([D, DB, B], 'k'); await step(40); await settle()   // water shot
  await fresh(200, 100); await clean(); await motion([D, DF, F, D, DF, F], 'l'); await step(30); await settle(220)   // super flood
  const heard = await page.evaluate(() => ({ s: [...new Set(window.__as.filter(x => x.startsWith('arlong_')))], v: window.__av }))
  const need = { bladeSwing: ['arlong_swing'], bladeHit: ['arlong_bladeHit'], punch: ['arlong_punch'], bite: ['arlong_bite', 'arlong_biteHit'], splash: ['arlong_splash'],
    lap: ['arlong_lap'], darts: ['arlong_darts'], seiken: ['arlong_seiken'], shot: ['arlong_shot'], flood: ['arlong_flood'] }
  for (const [r, ids] of Object.entries(need)) check(`gameplay plays the ${r} recipe via SoundManager.play`, ids.some(i => heard.s.includes(i)), heard.s.join(' '))
  const unknown = heard.s.filter(id => !(id in R.cues))
  check('every cue the sim queues has a recipe (no silent no-op ids)', unknown.length === 0, unknown.join(', '))
  check('voice bus untouched by Arlong', heard.v.length === 0, heard.v.join(', '))
  if (X.PHASE >= 9) { const m = await import('./arlong_scen_p9.mjs'); await m.run(X) }
}
