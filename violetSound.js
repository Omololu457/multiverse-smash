// Violet Parr (violet) — WebAudio SFX PLACEHOLDERS (no audio pack supplied). Plays on the shared SoundManager's context
// and SFX master (so the SFX mute / volume apply; the voice bus is never touched). sound.js is not modified.
// Every cue carries h = vhash(match seed, her round tick, player index) from the sim: pitch = ±3 % from h, and the noise
// buffer is a seeded LCG from h — no Math.random, so a replay sounds the same. This module only READS f._violet.cues
// (each cue has a serial n); it never mutates sim state. Recipes (the brief):
//   Force Push    sine 300→900 Hz, 0.25 s           Bubble Shield  triangle 660 Hz + 8 Hz LFO, 0.4 s
//   Reflect       square 1320 Hz, 60 ms             Force Ball     sine 180 Hz + 10 Hz LFO, 0.4 s
//   Field Trap    triangle 440→880 Hz, 0.3 s        Vanish in/out  sine 1200→400 / 400→1200 Hz, 0.2 s
//   FULL FORCE    sine 80 Hz swell 0.8 s → noise burst 0.6 s (the burst on the detonation)
import { sound } from './sound.js'

export const pitchOf = h => 1 + (((h >>> 0) % 601) - 300) / 10000            // 0.97 … 1.03
function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.12, at = 0, lfo = 0, lfoDepth = 0, swell = false }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (lfo) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.setValueAtTime(lfo, t0); lg.gain.setValueAtTime(lfoDepth || freq * 0.04, t0); l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.02) }
  if (swell) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  else { g.gain.setValueAtTime(gain, t0); g.gain.setValueAtTime(gain, t0 + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02)
}
function noise(ctx, out, { dur, seed, freq = 900, freqEnd = null, type = 'lowpass', gain = 0.25, at = 0 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
// recipes: (ctx, out, p = pitch multiplier, h = hash seed)
export const VIOLET_SFX = {
  pushFire: (c, o, p) => tone(c, o, { freq: 300 * p, freqEnd: 900 * p, dur: 0.25, gain: 0.14 }),
  vShield: (c, o, p) => tone(c, o, { type: 'triangle', freq: 660 * p, dur: 0.4, lfo: 8, lfoDepth: 30 * p, gain: 0.1 }),
  reflect: (c, o, p) => tone(c, o, { type: 'square', freq: 1320 * p, dur: 0.06, gain: 0.05 }),
  vBall: (c, o, p) => tone(c, o, { freq: 180 * p, dur: 0.4, lfo: 10, lfoDepth: 25 * p, gain: 0.16 }),
  vTrap: (c, o, p) => tone(c, o, { type: 'triangle', freq: 440 * p, freqEnd: 880 * p, dur: 0.3, gain: 0.1 }),
  vanishIn: (c, o, p) => tone(c, o, { freq: 1200 * p, freqEnd: 400 * p, dur: 0.2, gain: 0.08 }),
  vanishOut: (c, o, p) => tone(c, o, { freq: 400 * p, freqEnd: 1200 * p, dur: 0.2, gain: 0.08 }),
  // the swell starts with the cast and peaks on the detonation frame (startup 12 + 70 = 82f ≈ 1.37 s): 0.57 s delay + 0.8 s
  // FULL FORCE cinematic: cast 12f + script 170f + hit-stop 35f = the detonation 217f (≈ 3.62 s) after the cast
  vUlt: (c, o, p) => tone(c, o, { freq: 80 * p, dur: 0.8, gain: 0.22, swell: true, at: 217 / 60 - 0.8 }),
  ultSlam: (c, o, p, h) => { tone(c, o, { freq: 95 * p, freqEnd: 38 * p, dur: 0.32, gain: 0.26 }); noise(c, o, { dur: 0.28, seed: h, freq: 1400 * p, freqEnd: 160, gain: 0.22 }); tone(c, o, { type: 'triangle', freq: 880 * p, freqEnd: 440 * p, dur: 0.12, gain: 0.06 }) },
  ultCharge: (c, o, p) => { tone(c, o, { freq: 160 * p, freqEnd: 1300 * p, dur: 0.17, gain: 0.12, swell: true }); tone(c, o, { type: 'triangle', freq: 60 * p, dur: 0.17, gain: 0.15, lfo: 30, lfoDepth: 12 }) },
  ultBlast: (c, o, p, h) => { noise(c, o, { dur: 0.6, seed: h, freq: 1800 * p, freqEnd: 120, gain: 0.32 }); tone(c, o, { freq: 70 * p, freqEnd: 35 * p, dur: 0.5, gain: 0.2 }) },
  // secondary placeholders (short, quiet)
  swing: (c, o, p, h) => noise(c, o, { dur: 0.07, seed: h, type: 'bandpass', freq: 1100 * p, freqEnd: 2600 * p, gain: 0.07 }),
  heavySwing: (c, o, p, h) => noise(c, o, { dur: 0.11, seed: h, type: 'bandpass', freq: 700 * p, freqEnd: 2000 * p, gain: 0.09 }),
  hit: (c, o, p, h) => { tone(c, o, { type: 'triangle', freq: 170 * p, freqEnd: 80 * p, dur: 0.09, gain: 0.14 }); noise(c, o, { dur: 0.05, seed: h, gain: 0.12 }) },
  pushHit: (c, o, p, h) => VIOLET_SFX.hit(c, o, p * 1.2, h), ballHit: (c, o, p, h) => VIOLET_SFX.hit(c, o, p * 0.9, h),
  blocked: (c, o, p) => tone(c, o, { type: 'triangle', freq: 1100 * p, freqEnd: 850 * p, dur: 0.06, gain: 0.05 }),
  shieldBlock: (c, o, p) => tone(c, o, { type: 'triangle', freq: 990 * p, dur: 0.08, gain: 0.06 }),
  trapCatch: (c, o, p) => tone(c, o, { type: 'triangle', freq: 880 * p, dur: 0.12, lfo: 12, lfoDepth: 40, gain: 0.07 }),
  trapPop: (c, o, p, h) => noise(c, o, { dur: 0.08, seed: h, type: 'highpass', freq: 2200 * p, gain: 0.06 }),
  instinct: (c, o, p) => tone(c, o, { type: 'triangle', freq: 660 * p, freqEnd: 1320 * p, dur: 0.18, gain: 0.08 }),
  vPhase: (c, o, p) => tone(c, o, { freq: 900 * p, freqEnd: 500 * p, dur: 0.12, gain: 0.05 }),
  reject: (c, o) => tone(c, o, { type: 'square', freq: 180, dur: 0.05, gain: 0.03 }),
}
const ALIAS = { ultCine: null, ultCineTrap: 'trapCatch', ultTrap: null, ultSqueeze: 'trapCatch', ultWhiff: 'reject', trapFizzle: 'trapPop', jumpCancel: null, vPush: null }
// last serial played, keyed by the sim-state OBJECT (a round reset replaces f._violet, so a new round starts from 0)
const last = new WeakMap()
export function playVioletCues(f) {
  const st = f?._violet, q = st?.cues; if (!q?.length) return
  const top = q[q.length - 1].n || 0, seen = last.get(st) ?? 0
  last.set(st, top)
  const S = sound
  if (!S || S._sfxMuted || !S._ctx || !S._ready) return
  for (const c of q) {
    if (!(c.n > seen)) continue
    const k = c.k in ALIAS ? ALIAS[c.k] : c.k, fn = k && VIOLET_SFX[k]; if (!fn) continue
    try { if (S._ctx.state === 'suspended') S._ctx.resume(); fn(S._ctx, S._master, pitchOf(c.h), c.h >>> 0) } catch (_) {}
  }
}
