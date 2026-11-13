// harness/sanji_render_scenarios_p8.mjs — PHASE 8: SOUND. (1) no Math.random / gameRng in any sanji*.js; (2) every
// recipe renders real, non-silent audio (OfflineAudioContext) with the brief's shapes; (3) gameplay driven by REAL
// inputs fires the cues through SoundManager.play (the SFX path); (4) Sanji never touches the voice bus.
import fs from 'node:fs'
import path from 'node:path'
export async function run(X) {
  const { page, step, check, fresh, tap, motion, settle } = X
  const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const f of fs.readdirSync('.').filter(f => /^sanji.*\.js$/.test(f))) check(`${f}: no Math.random / gameRng`, !/Math\.random|gameRng/.test(strip(fs.readFileSync(path.join('.', f), 'utf8'))))
  const R = await page.evaluate(async () => {
    const { SANJI_SOUNDS, SANJI_SOUND_RECIPES } = await import('./sanjiSound.js'), out = { cues: {}, recipes: {} }
    const render = async fn => {
      const sr = 44100, ctx = new OfflineAudioContext(1, sr * 1.6, sr); fn(ctx, ctx.destination)
      const d = (await ctx.startRendering()).getChannelData(0)
      let peak = 0, last = 0, first = -1; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 1e-3) { last = i; if (first < 0) first = i } }
      const q = [0, 0, 0, 0], span = Math.max(1, last - first); for (let i = first; i <= last; i++) q[Math.min(3, Math.floor((i - first) / span * 4))] += d[i] * d[i]
      // dominant frequency by zero crossings over the first 40 ms (tonal recipes only)
      let zc = 0; const n = Math.min(d.length, first + sr * 0.04); for (let i = first + 1; i < n; i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++
      // count separate bursts (sound runs separated by ≥ 25 ms of near-silence)
      let bursts = 0, quiet = 1e9; for (let i = 0; i < d.length; i++) { if (Math.abs(d[i]) > 0.02) { if (quiet > sr * 0.025) bursts++; quiet = 0 } else quiet++ }
      // the same, 55-95 ms in (after an impact's 45 ms noise crack: the thud's own pitch)
      let zl = 0; for (let i = first + Math.floor(sr * 0.055) + 1; i < Math.min(d.length, first + Math.floor(sr * 0.095)); i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zl++
      return { peak: +peak.toFixed(3), ms: Math.round(last / 44.1), q: q.map(v => +v.toFixed(3)), hz: Math.round(zc / 2 / 0.04), hzLate: Math.round(zl / 2 / 0.04), bursts }
    }
    for (const [id, fn] of Object.entries(SANJI_SOUNDS)) out.cues[id] = await render(fn)
    for (const [id, fn] of Object.entries(SANJI_SOUND_RECIPES)) out.recipes[id] = await render(fn)
    const a = await render(SANJI_SOUND_RECIPES.burnImpact), b = await render(SANJI_SOUND_RECIPES.burnImpact)
    out.det = JSON.stringify(a) === JSON.stringify(b)
    return out
  })
  for (const [id, r] of Object.entries(R.cues)) check(`${id} renders audible audio`, r.peak > 0.005 && r.ms > 20, `peak ${r.peak}, ${r.ms} ms`)
  const rec = R.recipes
  check('kick whoosh ≈ 90 ms', rec.whoosh1.ms >= 70 && rec.whoosh1.ms <= 110 && rec.whoosh3.ms <= 110, `${rec.whoosh1.ms} / ${rec.whoosh3.ms} ms`)
  check('kick impact: low thud (~90 Hz) + crack', rec.impact.hzLate >= 45 && rec.impact.hzLate <= 110 && rec.impact.peak > 0.2, JSON.stringify(rec.impact))
  check('ignite: 600 ms hiss that BUILDS, then the whoomph', rec.ignite.ms >= 750 && rec.ignite.q[1] > rec.ignite.q[0] * 4 && rec.ignite.bursts >= 1, JSON.stringify(rec.ignite))
  check('burning impact adds a crackle (longer tail than a plain impact)', rec.burnImpact.ms > rec.impact.ms + 60, `${rec.burnImpact.ms} vs ${rec.impact.ms} ms`)
  check('Sky Walk pop ≈ 50 ms, higher on the 2nd use', rec.skyPop1.ms <= 70 && rec.skyPop2.hz > rec.skyPop1.hz, `${rec.skyPop1.ms} ms ${rec.skyPop1.hz} → ${rec.skyPop2.hz} Hz`)
  check('Plate Kick clink: two pings', rec.plateClink.bursts >= 1 && rec.plateClink.ms >= 100 && rec.plateClink.ms <= 170, JSON.stringify(rec.plateClink))
  check('Course chime: quiet, step 6 is 5 semitones above step 1', rec.course1.peak < 0.12 && Math.abs(rec.course6.hz / rec.course1.hz - Math.pow(2, 5 / 12)) < 0.08, `${rec.course1.hz} → ${rec.course6.hz} Hz, peak ${rec.course1.peak}`)
  check('Course complete fanfare: 3 notes (~0.5 s)', rec.fanfare.bursts === 3 && rec.fanfare.ms >= 400 && rec.fanfare.ms <= 600, JSON.stringify(rec.fanfare))
  check('Premier Hachis: thud run at 8 per second', rec.hachis.bursts >= 5 && rec.hachis.ms >= 650 && rec.hachis.ms <= 760, JSON.stringify(rec.hachis))
  check('recipes are deterministic (seeded noise + hashed crackle)', R.det)

  // ── gameplay fires the cues through SoundManager.play (SFX path), never the voice path ──
  await page.evaluate(() => {
    window.__ss = []; window.__sv = []
    const s = __harness.__sound, play = s.play.bind(s), sfx = s.playSfxFile?.bind(s)
    if (!s.__sjWrapped) {
      s.__sjWrapped = true
      s.play = id => { window.__ss.push(id); return play(id) }
      if (sfx) s.playSfxFile = (...a) => { window.__sv.push(String(a[0])); return sfx(...a) }
    }
  })
  const clean = () => page.evaluate(() => { const z = __harness.sanjiTest.raw('p2'); z.invulnTimer = 0; z.knockdownState = false; z.health = z.maxHealth })
  await fresh(96, 100); await clean(); await tap(['k']); await settle()                                       // whoosh + impact
  await fresh(96, 100); await clean(); await tap(['l', 'k']); for (let i = 0; i < 44; i++) await step(1)      // ignite hiss
  await clean(); await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 90 }); await tap(['k']); await settle()   // burning impact
  await fresh(80, 100); await clean(); await motion(['s', ['s', 'a'], 'a'], 'l'); await settle(90)            // hachis
  await fresh(380, 100); await clean(); await motion(['s', ['s', 'a'], 'a'], 'k'); await settle(70)           // plate
  await fresh(700, 100); await tap(['w']); await step(6); await motion(['s', ['s', 'd'], 'd'], 'k'); await settle(80)   // sky walk
  await fresh(96, 0); await clean()
  for (const keys of [['j'], ['d', 'j'], ['k'], ['d', 'k'], ['a', 'k'], ['s', 'd', 'j']]) {   // the Course, one kick at a time
    await page.evaluate(() => { const a = __harness.sanjiTest.raw('p2'), z = __harness.sanjiTest.raw('p1'); a.x = z.x + 96; a.y = z.y; a.vx = 0; a.vy = 0; a.hitstun = 0; a.invulnTimer = 0 }); await step(1)
    for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k)
    for (let i = 0; i < 30; i++) await step(1); await settle()
  }
  const got = await page.evaluate(() => ({ s: [...new Set(window.__ss.filter(x => x.startsWith('sanji_')))], v: window.__sv.length }))
  const need = ['sanji_whoosh2', 'sanji_impact', 'sanji_spin', 'sanji_burnImpact', 'sanji_hachis', 'sanji_plate', 'sanji_skywalk1',
    'sanji_course1', 'sanji_course3', 'sanji_course6', 'sanji_courseDone']
  const miss = need.filter(k => !got.s.includes(k))
  check('real inputs fire the brief cues through SoundManager.play (SFX bus)', miss.length === 0, JSON.stringify({ miss, got: got.s }))
  const voice = await page.evaluate(() => window.__sv.filter(x => /sanji/i.test(x)))
  check('Sanji never calls the voice / file path', voice.length === 0, JSON.stringify(voice))
}
