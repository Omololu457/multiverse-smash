// harness/buggy_sound.test.mjs — Buggy the Clown phase 8: WebAudio placeholder SFX (no audio assets).
// (1) no Math.random / gameRng in any buggy*.js; (2) every cue renders real, non-silent audio in an
// OfflineAudioContext, and the slide whistle really sweeps 1200 → 400 Hz in 200 ms; (3) gameplay driven through the
// real keyboard fires all nine brief recipes through SoundManager.play (the SFX path); (4) the voice bus / voice
// files are never touched by Buggy.        node harness/buggy_sound.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve, ROOT } from './ben10_test_utils.mjs'

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }

console.log('\n── source: deterministic (no Math.random / gameRng in the Buggy kit) ──')
const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
for (const f of fs.readdirSync(ROOT).filter(f => /^buggy.*\.js$/.test(f))) {
  const src = strip(fs.readFileSync(path.join(ROOT, f), 'utf8'))
  check(`${f}: no Math.random / gameRng`, !/Math\.random|gameRng/.test(src))
}

const server = await serve(), browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const ev = (fn, a) => page.evaluate(fn, a)
const step = n => ev(n => __harness.luffyTest.step(n), n)
try {
  await page.goto(server.base + '/index.html?harness=1&p1=buggy&p2=zoro', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.buggyTest)

  console.log('\n── recipes render (OfflineAudioContext) ──')
  const rendered = await ev(async () => {
    const { BUGGY_SOUNDS, BUGGY_SOUND_RECIPES } = await import('./buggySound.js'), out = { cues: {}, recipes: {} }
    const render = async fn => {
      const ctx = new OfflineAudioContext(1, 44100 * 1.2, 44100); fn(ctx, ctx.destination)
      const d = (await ctx.startRendering()).getChannelData(0)
      let peak = 0, last = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 1e-3) last = i }
      return { peak: +peak.toFixed(3), ms: Math.round(last / 44.1), d }
    }
    for (const [id, fn] of Object.entries(BUGGY_SOUNDS)) { const r = await render(fn); out.cues[id] = { peak: r.peak, ms: r.ms } }
    for (const [id, fn] of Object.entries(BUGGY_SOUND_RECIPES)) {
      const r = await render(fn); out.recipes[id] = { peak: r.peak, ms: r.ms }
      if (id === 'slideWhistle') {   // pitch from rising zero crossings in the first / last 30 ms of the sweep
        const hz = (a, b) => { let n = 0; for (let i = a + 1; i < b; i++) if (r.d[i - 1] <= 0 && r.d[i] > 0) n++; return n / ((b - a) / 44100) }
        out.whistle = { start: Math.round(hz(441, 441 + 1323)), end: Math.round(hz(8820 - 1323 - 441, 8820 - 441)) }
      }
    }
    return out
  })
  for (const [id, r] of Object.entries(rendered.cues)) check(`${id} renders audible audio`, r.peak > 0.01 && r.ms > 20, `peak ${r.peak}, ${r.ms} ms`)
  check('the brief\'s nine recipes all exist', Object.keys(rendered.recipes).length === 9, Object.keys(rendered.recipes).join(', '))
  const w = rendered.whistle
  check('slide whistle sweeps 1200 → 400 Hz', w.start > 1000 && w.start < 1250 && w.end > 380 && w.end < 520, `${w.start} Hz → ${w.end} Hz`)
  check('slide whistle lasts 200 ms', rendered.recipes.slideWhistle.ms >= 170 && rendered.recipes.slideWhistle.ms <= 210, `${rendered.recipes.slideWhistle.ms} ms`)

  console.log('\n── gameplay fires the cues through SoundManager.play (SFX path) ──')
  await ev(() => {
    __harness.start(); __harness.skipToBattle()
    window.__bs = []; window.__bv = []
    const s = __harness.__sound, play = s.play.bind(s), sfx = s.playSfxFile?.bind(s)
    s.play = id => { window.__bs.push(id); return play(id) }
    if (sfx) s.playSfxFile = (...a) => { if (s._voiceOwner?.rosterKey === 'buggy') window.__bv.push(String(a[0])); return sfx(...a) }
  })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  await step(30)
  const reset = async (gap = 60) => { await ev(g => { __harness.buggyTest.reset(); __harness.buggyTest.chop('p1', 100); const b = __harness.buggyTest.raw('p1'), z = __harness.buggyTest.raw('p2'); z.x = b.x + g; z.health = z.maxHealth; b.facing = 1 }, gap); await step(20) }
  const tap = async (k, dir) => { if (dir) await page.keyboard.down(dir); await page.keyboard.down(k); await step(1); await page.keyboard.up(k); if (dir) await page.keyboard.up(dir) }
  async function motion(seq, button) {   // rolled like a stick: only the keys that change are pressed / released
    let held = []
    for (const k of seq) { const want = k == null ? [] : [].concat(k)
      for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
      for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
      held = want; await step(2) }
    await page.keyboard.down(button); await step(1); await page.keyboard.up(button)
    for (const x of held) await page.keyboard.up(x)
  }
  const QCF = ['s', ['s', 'd'], 'd'], QCB = ['s', ['s', 'a'], 'a']
  await reset(56); await tap('j'); await step(24)                                   // jab → swing + knife hit
  await reset(56); await tap('k'); await step(30)                                   // carve
  await reset(200); await motion(QCF, 'l'); await step(40)                          // Chop-Chop Cannon → pop + cannon hit
  await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); await step(2)
  await page.keyboard.down('l'); await step(1); await page.keyboard.up('l'); await step(30)   // double-tap A → RECALL (reverse pop)
  await reset(60); await motion(['s', null, 's'], 'l'); await step(40)             // Festival
  await reset(250); await motion(QCB, 'l'); await step(70)                          // Buggy Ball → explosion
  await reset(300); await motion(['d', null, 'd'], 'l'); await step(40)            // Knife Fan → knife throw
  await reset(300); await motion(QCB, 'k'); await step(30)                          // Cape Flourish → whoosh
  await reset(56)                                                                   // Zoro's slash passes through → nullify whistle
  await ev(async () => { const cb = await import('./combat.js'), zd = await import('./zoroData.js'); const z = __harness.buggyTest.raw('p2'); z.facing = -1; z.attacking = false; z.attackCooldown = 0; cb.startMove(z, 'light', zd.ZORO_MOVES.light) })
  await step(30)
  await reset(120); await motion([...QCF, ...QCF], 'l'); await step(120)            // SUPER → festival jingle + cannons + booms
  const fired = new Set(await ev(() => window.__bs.filter(id => id.startsWith('buggy_'))))
  const { BUGGY_SOUNDS } = await import(path.join(ROOT, 'buggySound.js'))
  const recipeOf = id => { const fn = BUGGY_SOUNDS[id]; return fn }
  const RECIPE_CUES = {   // each brief recipe ← any cue that plays it
    knifeThrow: ['buggy_knifeThrow', 'buggy_swing', 'buggy_swingLight'], knifeHit: ['buggy_knifeHit', 'buggy_stab', 'buggy_partHit', 'buggy_chomp'],
    pop: ['buggy_pop', 'buggy_kick'], reversePop: ['buggy_reversePop', 'buggy_reverseTwo', 'buggy_snapBack'],
    slideWhistle: ['buggy_nullify', 'buggy_stagger', 'buggy_snapBack'], cannon: ['buggy_cannon', 'buggy_cannonHit', 'buggy_cannonRoll'],
    explosion: ['buggy_explosion', 'buggy_boom'], festivalJingle: ['buggy_festival', 'buggy_superStart'], capeWhoosh: ['buggy_cape'],
  }
  for (const [rec, ids] of Object.entries(RECIPE_CUES)) check(`${rec} heard in gameplay`, ids.some(id => fired.has(id) && recipeOf(id)), ids.filter(id => fired.has(id)).join(', ') || 'none')
  check('every played buggy_ cue has a recipe (no silent ids)', [...fired].every(id => BUGGY_SOUNDS[id]), [...fired].filter(id => !BUGGY_SOUNDS[id]).join(', '))
  check('Buggy never touches the voice bus / voice files', (await ev(() => window.__bv.length)) === 0, await ev(() => window.__bv.join(',')))
} catch (e) {
  check('sound test ran to completion', false, e.message.split('\n')[0])
} finally {
  if (errors.length) console.log('  page errors:', errors.slice(0, 3).join(' | '))
  check('no page errors', errors.length === 0)
  await browser.close(); server.close()
}
console.log(`\nBUGGY SOUND: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
