// harness/zoro_sound.test.mjs — Roronoa Zoro phase 7: WebAudio placeholder SFX.
// (1) every recipe renders real, non-silent audio in an OfflineAudioContext; (2) gameplay fires the right cue ids
// through SoundManager.play (the SFX path); (3) the voice bus / voice files are never touched by Zoro;
// (4) no Math.random in any zoro*.js.     node harness/zoro_sound.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve, ROOT } from './ben10_test_utils.mjs'

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }

console.log('\n── source: deterministic (no Math.random / gameRng in the Zoro kit) ──')
const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
for (const f of fs.readdirSync(ROOT).filter(f => /^zoro.*\.js$/.test(f))) {
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
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)

  console.log('\n── recipes render (OfflineAudioContext) ──')
  const rendered = await ev(async () => {
    const { ZORO_SOUNDS } = await import('./zoroSound.js'), out = {}
    for (const [id, fn] of Object.entries(ZORO_SOUNDS)) {
      const ctx = new OfflineAudioContext(1, 44100 * 1.6, 44100); fn(ctx, ctx.destination)
      const buf = await ctx.startRendering(), d = buf.getChannelData(0)
      let peak = 0, last = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; if (a > 1e-3) last = i }
      out[id] = { peak: +peak.toFixed(3), ms: Math.round(last / 44.1) }
    }
    return out
  })
  // Audible tail = last sample above −60 dB; exponential decays cross it before their scheduled end
  // (the swing is scheduled for 80 ms, the tornado for 1.3 s).
  const want = { zoro_swing: [40, 90], zoro_swingLight: [40, 90], zoro_hit: [80, 200], zoro_sheathe: [150, 260], zoro_tatsu: [800, 1400], zoro_oni: [300, 560], zoro_haki: [600, 950], zoro_snore: [300, 700] }
  for (const [id, r] of Object.entries(rendered)) {
    const w = want[id]
    check(`${id} audible${w ? ` (${w[0]}–${w[1]} ms)` : ''}`, r.peak > 0.01 && (!w || (r.ms >= w[0] && r.ms <= w[1])), `peak ${r.peak}, ${r.ms} ms`)
  }
  check('swing whoosh is 80 ms bandpass noise', rendered.zoro_swing && rendered.zoro_swing.ms <= 90)

  console.log('\n── gameplay fires the cues through SoundManager.play (SFX path) ──')
  await ev(() => {
    __harness.start(); __harness.skipToBattle()
    window.__zs = []; window.__zv = []
    const s = __harness.__sound, play = s.play.bind(s), sfx = s.playSfxFile?.bind(s)
    s.play = id => { window.__zs.push(id); return play(id) }
    if (sfx) s.playSfxFile = (...a) => { if (s._voiceOwner?.rosterKey === 'zoro') window.__zv.push(String(a[0])); return sfx(...a) }
  })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 150)) }
  const reset = async (gap = 30) => { await ev(g => { __harness.zoroTest.reset(); __harness.setDummyBehavior('stand'); const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'); o.x = f.x + f.w + g; f.facing = 1; __harness.zoroTest.spirit('p1', 100) }, gap); await step(3) }
  const tap = async (k, dir) => { if (dir) await page.keyboard.down(dir); await page.keyboard.down(k); await step(1); await page.keyboard.up(k); if (dir) await page.keyboard.up(dir) }
  await reset(); await tap('j'); await step(20)
  await reset(); await tap('k'); await step(30)
  await reset(200); await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k'); await step(30)
  await ev(() => __harness.zoroTest.set('p1', { santoryuTimer: 2 })); await step(4)
  await reset(260); for (const k of ['s', '', 's']) { if (k) await page.keyboard.down(k); await step(2); if (k) await page.keyboard.up(k) } await tap('l'); await step(20)
  await reset(60); for (const k of ['d', '', 'd']) { if (k) await page.keyboard.down(k); await step(2); if (k) await page.keyboard.up(k) } await tap('l'); await step(40)
  await reset(300); await page.keyboard.down('s'); await page.keyboard.down('k'); await step(42); await page.keyboard.up('k'); await page.keyboard.up('s'); await step(70)
  await reset(80); await ev(() => { __harness.zoroTest.raw('p1').health = 200 }); await step(3)
  const fired = await ev(() => window.__zs.filter(id => id.startsWith('zoro_')))
  const set = new Set(fired)
  for (const id of ['zoro_swingLight', 'zoro_swing', 'zoro_hit', 'zoro_santoryu', 'zoro_sheathe', 'zoro_tatsu', 'zoro_oni', 'zoro_nap', 'zoro_snore', 'zoro_haki'])
    check(`${id} fired by gameplay`, set.has(id))
  check('Zoro never touches the voice bus / voice files', (await ev(() => window.__zv.length)) === 0, await ev(() => window.__zv.join(',')))
} catch (e) {
  check('sound test ran to completion', false, e.message.split('\n')[0])
} finally {
  if (errors.length) console.log('  page errors:', errors.slice(0, 3).join(' | '))
  check('no page errors', errors.length === 0)
  await browser.close(); server.close()
}
console.log(`\nZORO SOUND: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
