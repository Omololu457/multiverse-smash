// Phase 9 scenarios — SOUND. (1) no Math.random / gameRng in any spdRed*.js / rangers.js; (2) the brief's ten recipes
// render real, non-silent audio (OfflineAudioContext) with the specified shapes; (3) gameplay driven by REAL inputs
// fires every recipe through SoundManager.play (the SFX path); (4) S.P.D. Red never touches the voice bus.
import fs from 'node:fs'
export async function run(X) {
  const { page, step, as, call, check, fresh, tap, motion, dtap, settle } = X
  const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const f of fs.readdirSync('.').filter(f => /^(spdRed.*|rangers)\.js$/.test(f))) check(`${f}: no Math.random / gameRng`, !/Math\.random|gameRng/.test(strip(fs.readFileSync(f, 'utf8'))))
  const R = await page.evaluate(async () => {
    const { SPD_RED_SOUNDS, SPD_RED_SOUND_RECIPES, spdRedRapidDetune } = await import('./spdRedSound.js'), out = { cues: {}, recipes: {} }
    const render = async fn => {
      const ctx = new OfflineAudioContext(1, 44100 * 1.2, 44100); fn(ctx, ctx.destination)
      const d = (await ctx.startRendering()).getChannelData(0)
      let peak = 0, last = 0, first = -1; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 1e-3) { last = i; if (first < 0) first = i } }
      const q = [0, 0, 0, 0], span = Math.max(1, last - first); for (let i = first; i <= last; i++) q[Math.min(3, Math.floor((i - first) / span * 4))] += d[i] * d[i]
      // zero-crossing rate over the first 30 ms of sound → a rough pitch read (Hz) for the pure tones
      let zc = 0; const n = Math.min(d.length, first + 1323); for (let i = first + 1; i < n; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++
      return { peak: +peak.toFixed(3), ms: Math.round((last - Math.max(0, first)) / 44.1), q: q.map(v => +v.toFixed(3)), hz: Math.round(zc / 2 / ((n - first) / 44100)), sum: d.reduce((a, v) => a + v * 13.7, 0).toFixed(6) }
    }
    for (const [id, fn] of Object.entries(SPD_RED_SOUNDS)) out.cues[id] = await render(fn)
    for (const [id, fn] of Object.entries(SPD_RED_SOUND_RECIPES)) out.recipes[id] = await render(fn)
    const a = await render(SPD_RED_SOUND_RECIPES.blink), b = await render(SPD_RED_SOUND_RECIPES.blink)
    out.det = JSON.stringify(a) === JSON.stringify(b)
    out.detunes = [0, 1, 2, 3, 4].map(spdRedRapidDetune)
    return out
  })
  for (const [id, r] of Object.entries(R.cues)) check(`${id} renders audible audio`, r.peak > 0.005 && r.ms > 8, `peak ${r.peak}, ${r.ms} ms`)
  const rec = R.recipes
  check("the brief's ten recipes all exist (+ the blink's arrival pop, Deltamax split into charge + blast)", ['blink', 'pop', 'dodge', 'impact', 'blaster', 'rapid', 'deltamaxCharge', 'deltamaxBlast', 'judgment', 'guilty', 'innocent', 'containment'].every(k => rec[k]), Object.keys(rec).join(', '))
  check('blink: 60 ms noise sweep', rec.blink.ms >= 45 && rec.blink.ms <= 70, `${rec.blink.ms} ms`)
  check('dodge chime: 2.2 kHz, 40 ms', rec.dodge.ms >= 30 && rec.dodge.ms <= 45 && Math.abs(rec.dodge.hz - 2200) < 150, `${rec.dodge.ms} ms ${rec.dodge.hz} Hz`)
  check('impact: 95 Hz thud body', rec.impact.ms >= 100 && rec.impact.q[0] > rec.impact.q[3], `${rec.impact.ms} ms q=${JSON.stringify(rec.impact.q)}`)
  check('blaster: 70 ms square chirp', rec.blaster.ms >= 55 && rec.blaster.ms <= 80, `${rec.blaster.ms} ms`)
  check('rapid fire: 5 hash-chosen detunes (distinct, within ±80 cents)', new Set(R.detunes).size === 5 && R.detunes.every(d => Math.abs(d) <= 80), JSON.stringify(R.detunes))
  check('Deltamax: saw charge over ~400 ms', rec.deltamaxCharge.ms >= 360 && rec.deltamaxCharge.ms <= 420, `${rec.deltamaxCharge.ms} ms`)
  check('Deltamax: noise + saw blast (front-loaded)', rec.deltamaxBlast.q[0] > rec.deltamaxBlast.q[3], JSON.stringify(rec.deltamaxBlast.q))
  check('Judgment: scanner sweep then the two-tone siren blip (~0.55 s)', rec.judgment.ms >= 480 && rec.judgment.ms <= 600, `${rec.judgment.ms} ms`)
  check('GUILTY: 160 Hz buzzer, 300 ms, hard stop', rec.guilty.ms >= 280 && rec.guilty.ms <= 310 && rec.guilty.q[3] > rec.guilty.q[0] * 0.5, `${rec.guilty.ms} ms q=${JSON.stringify(rec.guilty.q)}`)
  check('INNOCENT: two-note chime', rec.innocent.ms >= 300, `${rec.innocent.ms} ms`)
  check('containment: glassy rising sine with a HARD stop (loud to the last quarter)', rec.containment.q[3] > rec.containment.q[0] * 0.5 && rec.containment.ms >= 350, `${rec.containment.ms} ms q=${JSON.stringify(rec.containment.q)}`)
  check('recipes are deterministic (seeded noise)', R.det)

  // ── gameplay fires every recipe through SoundManager.play (SFX path), never the voice path ──
  await page.evaluate(() => {
    window.__as = []; window.__av = []
    const s = __harness.__sound, play = s.play.bind(s), sfx = s.playSfxFile?.bind(s)
    if (!s.__srWrapped) {
      s.__srWrapped = true
      s.play = id => { window.__as.push(id); return play(id) }
      if (sfx) s.playSfxFile = (...a) => { if (s._voiceOwner?.rosterKey === 'spd_red') window.__av.push(String(a[0])); return sfx(...a) }
    }
  })
  await fresh(600, 100); await dtap('d', 3); await settle()                                   // blink + pop
  await fresh(110, 100); await tap(['j']); await settle()                                     // impact
  await fresh(700, 100); await tap(['s', 'l']); await settle(40)                              // blaster
  await fresh(700, 100); await page.keyboard.down('s'); await page.keyboard.down('l'); await step(20); await page.keyboard.up('s'); await page.keyboard.up('l'); await settle(40)   // rapid
  await fresh(500, 100); await motion(['s', ['s', 'a'], 'a'], 'l'); await settle(60)           // deltamax charge + blast
  // dodge: blink through Zoro's live heavy
  await fresh(110, 30)
  await page.evaluate(async () => { const c = await import('./combat.js'); const z = __harness.spdRedTest.raw('p2'); c.startMove(z, 'heavy', z.basic_attacks.heavy) })
  for (let i = 0; i < 40; i++) { const a = await call('atk', 'p2'); if (a && a.activeStart - a.elapsed <= 5) { await call('blink', -1); break } await step(1) }
  await settle(30)
  // Judgment GUILTY (+ containment) and INNOCENT
  await fresh(110, 50); await page.evaluate(() => { const z = __harness.spdRedTest.raw('p2'); z.health = Math.floor(z.maxHealth * 0.25); __harness.spdRedTest.raw('p1')._ranger.judg.meter = 20 })
  await tap(['j', 'k', 'l']); await step(80)
  await fresh(110, 50); await page.evaluate(() => { __harness.spdRedTest.raw('p1')._ranger.judg.meter = 20 })
  await tap(['j', 'k', 'l']); await step(60); await settle()
  const heard = await page.evaluate(() => ({ s: [...new Set(window.__as.filter(x => x.startsWith('spdred_')))], v: window.__av }))
  const need = { blink: ['spdred_blink'], pop: ['spdred_blinkPop'], dodge: ['spdred_dodge'], impact: ['spdred_impact'], blaster: ['spdred_blaster'],
    rapid: ['spdred_rapid0', 'spdred_rapid4'], deltamaxCharge: ['spdred_deltamaxCharge'], deltamaxBlast: ['spdred_deltamax'], judgment: ['spdred_judge'],
    guilty: ['spdred_guilty'], innocent: ['spdred_innocent'], containment: ['spdred_contain'] }
  for (const [r, ids] of Object.entries(need)) check(`gameplay plays the ${r} recipe via SoundManager.play`, ids.every(i => heard.s.includes(i)), heard.s.join(' '))
  const unknown = heard.s.filter(id => !(id in R.cues))
  check('every cue the sim queues has a recipe (no silent no-op ids)', unknown.length === 0, unknown.join(', '))
  check('voice bus untouched by S.P.D. Red', heard.v.length === 0, heard.v.join(', '))
}
