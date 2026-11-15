// harness/violet_sound.test.mjs — Violet Parr PHASE 8: WebAudio placeholder SFX. A recording fake AudioContext replaces
// the shared SoundManager's context, then real inputs drive each move. Asserts every brief recipe (waveform, frequency
// sweep, duration, LFO), the ±3 % pitch derived from the cue hash, seeded (hash) noise, and that the player only READS
// the sim cues (never mutates f._violet). The same seed + inputs give the same hashes → the same sounds.
import { boot, ck, summary } from './violet_lib.mjs'
const B = await boot('violet', 'violet'), { page, step, st, reset, S } = B
const k = page.keyboard
async function press(keys, n = 1) { for (const x of keys) await k.down(x); await step(n); for (const x of keys) await k.up(x) }
async function motion(dirs, btn) { for (const ks of dirs) await press(ks, 2); await press([btn], 1) }
// install a recording fake AudioContext into the shared SoundManager (sound.js singleton), SFX enabled
await page.evaluate(async () => { const { sound } = await import('./sound.js')
  const log = window.__vAudio = []; let id = 1000
  const param = (o, name) => ({ value: 0, setValueAtTime(v, t) { log.push([o.id, name, 'set', +(+v).toFixed(3), +t.toFixed(3)]) }, exponentialRampToValueAtTime(v, t) { log.push([o.id, name, 'ramp', +(+v).toFixed(3), +t.toFixed(3)]) }, setTargetAtTime() {} })
  const node = kind => { const o = { id: ++id, kind, connect(t) { log.push([o.id, 'connect', t?.id ?? 'out']) }, start(t) { log.push([o.id, 'start', +t.toFixed(3)]) }, stop(t) { log.push([o.id, 'stop', +t.toFixed(3)]) } }; log.push([o.id, 'new', kind]); return o }
  sound._ctx = { currentTime: 0, sampleRate: 8000, state: 'running', resume() {},
    createOscillator() { const o = node('osc'); o.frequency = param(o, 'freq'); let ty = 'sine'; Object.defineProperty(o, 'type', { set(v) { ty = v; log.push([o.id, 'type', v]) }, get() { return ty } }); return o },
    createGain() { const o = node('gain'); o.gain = param(o, 'gain'); return o },
    createBiquadFilter() { const o = node('filter'); o.frequency = param(o, 'ffreq'); o.Q = param(o, 'Q'); let ty = ''; Object.defineProperty(o, 'type', { set(v) { ty = v }, get() { return ty } }); return o },
    createBufferSource() { const o = node('noise'); Object.defineProperty(o, 'buffer', { set(b) { log.push([o.id, 'buffer', b.sum]) } }); return o },
    createBuffer(ch, n) { const d = new Float32Array(n); return { getChannelData: () => d, get sum() { let s = 0; for (let i = 0; i < 64; i++) s += d[i]; return +s.toFixed(5) } } } }
  sound._master = { id: 'master' }; sound._ready = true; sound._sfxMuted = false })
// recorder helpers
const clear = () => page.evaluate(() => { window.__vAudio.length = 0 })
const oscs = () => page.evaluate(() => { const L = window.__vAudio, out = {}
  for (const e of L) { if (e[1] === 'new' && e[2] === 'osc') out[e[0]] = { type: 'sine', f: [], ramps: [], start: null, stop: null, lfo: false }
    const o = out[e[0]]; if (!o) continue
    if (e[1] === 'type') o.type = e[2]; if (e[1] === 'freq' && e[2] === 'set') o.f.push(e[3]); if (e[1] === 'freq' && e[2] === 'ramp') o.ramps.push(e[3])
    if (e[1] === 'start') o.start = e[2]; if (e[1] === 'stop') o.stop = e[2] }
  return Object.values(out) })
const noises = () => page.evaluate(() => window.__vAudio.filter(e => e[1] === 'buffer').map(e => e[2]))
const near = (a, b, tol) => Math.abs(a - b) <= tol
const PITCH = 0.0301
try {
  // pitch helper + determinism of the hash
  const pv = await page.evaluate(async () => { const { pitchOf } = await import('./violetSound.js'); const { vhash } = await import('./violetData.js')
    const ps = []; for (let i = 0; i < 2000; i++) ps.push(pitchOf(vhash(424242, i, 1 + (i & 1))))
    return { min: Math.min(...ps), max: Math.max(...ps), same: vhash(9, 77, 2) === vhash(9, 77, 2), diff: vhash(9, 77, 1) !== vhash(9, 77, 2) } })
  ck('pitch = ±3 % from the hash (2000 cues within 0.97–1.03)', pv.min >= 0.97 && pv.max <= 1.03 && pv.max - pv.min > 0.05, pv)
  ck('hash is a pure function of (seed, frame, player)', pv.same && pv.diff, pv)

  const cases = [
    { n: 'Force Push: sine 300→900 Hz, 0.25 s', go: async () => { await reset(900, false, { energy: 100 }); await clear(); await motion([['s'], ['s', 'd'], ['d']], 'l'); for (let i = 0; i < 12; i++) await step(1) },
      want: o => o.type === 'sine' && near(o.f[0], 300, 300 * PITCH) && near(o.ramps[0], 900, 900 * PITCH) && near(o.stop - o.start, 0.27, 0.011) },
    { n: 'Bubble Shield: triangle 660 Hz + 8 Hz LFO, 0.4 s', go: async () => { await reset(900, false, { energy: 100 }); await clear(); await motion([['a'], ['a', 's'], ['s']], 'l'); await step(2) },
      want: (o, all) => o.type === 'triangle' && near(o.f[0], 660, 660 * PITCH) && near(o.stop - o.start, 0.42, 0.011) && all.some(l => l.type === 'sine' && l.f[0] === 8) },
    { n: 'Force Ball: sine 180 Hz + 10 Hz LFO, 0.4 s', go: async () => { await reset(1200, false, { energy: 100 }); await clear(); await press(['d']); await step(1); await press(['d']); await press(['l']); await step(2) },
      want: (o, all) => o.type === 'sine' && near(o.f[0], 180, 180 * PITCH) && near(o.stop - o.start, 0.42, 0.011) && all.some(l => l.f[0] === 10) },
    { n: 'Field Trap: triangle 440→880 Hz, 0.3 s', go: async () => { await reset(900, false, { energy: 100 }); await clear(); await motion([['s'], ['s', 'a'], ['a']], 'l'); await step(2) },
      want: o => o.type === 'triangle' && near(o.f[0], 440, 440 * PITCH) && near(o.ramps[0], 880, 880 * PITCH) && near(o.stop - o.start, 0.32, 0.011) },
    { n: 'Vanish in: sine 1200→400 Hz, 0.2 s', go: async () => { await reset(900, false, { energy: 100 }); await clear(); await press(['s'], 2); await step(2); await press(['s'], 2); await press(['l']); await step(2) },
      want: o => o.type === 'sine' && near(o.f[0], 1200, 1200 * PITCH) && near(o.ramps[0], 400, 400 * PITCH) && near(o.stop - o.start, 0.22, 0.011) },
    { n: 'Vanish out: sine 400→1200 Hz, 0.2 s', go: async () => { await step(30); await clear(); await press(['s'], 2); await step(2); await press(['s'], 2); await press(['l']); await step(2) },
      want: o => o.type === 'sine' && near(o.f[0], 400, 400 * PITCH) && near(o.ramps[0], 1200, 1200 * PITCH) && near(o.stop - o.start, 0.22, 0.011) },
  ]
  for (const c of cases) { await c.go(); const os = await oscs(); ck(c.n, os.some(o => c.want(o, os)), os.slice(0, 4)) }
  // Reflect: square 1320 Hz, 60 ms
  await reset(300, false, { energy: 100 }); await motion([['a'], ['a', 's'], ['s']], 'l'); await step(4); await clear(); await S("H.spawnProj('p2', 60, 10, 40)")
  for (let i = 0; i < 30; i++) await step(1)
  { const os = await oscs(); ck('Reflect: square 1320 Hz, 60 ms', os.some(o => o.type === 'square' && near(o.f[0], 1320, 1320 * PITCH) && near(o.stop - o.start, 0.08, 0.011)), os.slice(0, 3)) }
  // FULL FORCE: sine 80 Hz swell 0.8 s → noise burst 0.6 s (burst on the detonation)
  await reset(240, false, { energy: 100 }); await clear(); await press(['u']); await step(2)   // cues queued by the command layer play on the next sim tick
  { const os = await oscs(); ck('FULL FORCE: sine 80 Hz swell 0.8 s timed to peak on the detonation', os.some(o => o.type === 'sine' && near(o.f[0], 80, 80 * PITCH) && near(o.stop - o.start, 0.82, 0.011)), os) }
  await clear(); for (let i = 0; i < 90; i++) await step(1)
  { const nz = await noises()
    ck('FULL FORCE: noise burst 0.6 s on the detonation (hash-seeded buffer)', nz.length >= 1 && nz[0] !== 0, { nz }) }
  // seeded noise: same hash → same buffer; the sim cues are only read
  const seeded = await page.evaluate(async () => { const { VIOLET_SFX } = await import('./violetSound.js'); const { sound } = await import('./sound.js'); const L = window.__vAudio
    L.length = 0; VIOLET_SFX.ultBlast(sound._ctx, sound._master, 1, 12345); VIOLET_SFX.ultBlast(sound._ctx, sound._master, 1, 12345); VIOLET_SFX.ultBlast(sound._ctx, sound._master, 1, 999)
    return L.filter(e => e[1] === 'buffer').map(e => e[2]) })
  ck('noise comes from the hash (same hash = same buffer, other hash differs)', seeded[0] === seeded[1] && seeded[0] !== seeded[2], seeded)
  const pure = await page.evaluate(async () => { const { playVioletCues } = await import('./violetSound.js'); const f = __harness.violetTest.raw(); const before = JSON.stringify(f._violet); playVioletCues(f); playVioletCues(f); return before === JSON.stringify(f._violet) })
  ck('playing cues never mutates f._violet (GAME_STATE)', pure)
  const nr = await page.evaluate(async () => { const src = await (await fetch('./violetSound.js')).text(); return /Math\.random/.test(src.replace(/\/\/.*$/gm, '')) })
  ck('no Math.random in violetSound.js', !nr)
  ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
} catch (e) { ck('exception', false, e.stack) } finally { await B.close() }
process.exit(summary('violet sound (phase 8)') ? 1 : 0)
