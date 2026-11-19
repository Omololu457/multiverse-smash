// nsSound.js — MSV1 Ninja Storm WebAudio SFX placeholders (no audio assets). Spread into sound.js SOUNDS → the SFX bus.
// nsr_* = Shane (higher, airy), nsy_* = Dustin (lower, grittier). Noise = seeded LCG (no Math.random). Cues are queued by
// the sim (f._nsCues) and played by nsFx.playNinjaCues — presentation only. Reuses S.P.D. Red's impact / blocked / zap.
import { SPD_RED_SOUNDS } from './spdRedSound.js'

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 7 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.006, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
// k = pitch factor (Shane 1.0, Dustin 0.6), grit = extra low noise (Dustin)
function set(prefix, k, grit, seed) {
  const R = SPD_RED_SOUNDS
  const whoosh = (ctx, out) => { fnoise(ctx, out, { dur: 0.16, freq: 3800 * k, freqEnd: 700 * k, q: 1.6, gain: 0.3, seed }); if (grit) fnoise(ctx, out, { dur: 0.14, type: 'lowpass', freq: 400, gain: 0.18, seed: seed + 1 }) }   // airy whoosh + doppler drop
  const pop = (ctx, out) => { fnoise(ctx, out, { dur: 0.09, type: 'lowpass', freq: 1200 * k, freqEnd: 300, q: 0.7, gain: 0.32, seed: seed + 2 }); tone(ctx, out, { freq: 260 * k, freqEnd: 120 * k, dur: 0.07, gain: 0.12 }) }
  const shimmer = (ctx, out, rev = false) => { const a = rev ? 1760 : 880, b = rev ? 880 : 1760; tone(ctx, out, { type: 'triangle', freq: a * k, freqEnd: b * k, dur: 0.22, gain: 0.08 }); tone(ctx, out, { type: 'triangle', freq: a * 1.5 * k, freqEnd: b * 1.5 * k, dur: 0.22, gain: 0.05, at: 0.05 }) }
  const rumble = (ctx, out) => { fnoise(ctx, out, { dur: 0.4, type: 'lowpass', freq: 220, gain: 0.32, seed: seed + 3 }); tone(ctx, out, { freq: 48, dur: 0.35, gain: 0.25 }) }
  const crack = (ctx, out) => { fnoise(ctx, out, { dur: 0.2, type: 'lowpass', freq: 2600, freqEnd: 200, q: 0.6, gain: 0.4, seed: seed + 4 }); tone(ctx, out, { freq: 80, freqEnd: 40, dur: 0.25, gain: 0.35 }) }
  const zap = (ctx, out) => tone(ctx, out, { type: 'square', freq: 2400 * k, freqEnd: 600 * k, dur: 0.12, gain: 0.08 })
  const thunk = (ctx, out) => { tone(ctx, out, { freq: 340 * k, freqEnd: 180 * k, dur: 0.05, gain: 0.18 }); fnoise(ctx, out, { dur: 0.03, freq: 3000, gain: 0.1, seed: seed + 5 }) }
  const drone = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 110 * k, freqEnd: 160 * k, dur: 0.5, gain: 0.07 }); fnoise(ctx, out, { dur: 0.5, freq: 900 * k, q: 3, gain: 0.12, seed: seed + 6 }) }
  const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'lowpass', freq: 1700 * k, freqEnd: 500, q: 0.8, gain: 0.18, seed: seed + 7 })
  const map = {
    streak: whoosh, tremor: rumble, streakHit: R.spdred_impact, smokePop: pop, mirror: (c, o) => { shimmer(c, o); tone(c, o, { type: 'triangle', freq: 660 * k, dur: 0.25, gain: 0.06, at: 0.1 }) },   // two-tone shimmer
    swap: (c, o) => { pop(c, o); fnoise(c, o, { dur: 0.06, type: 'lowpass', freq: 1400 * k, gain: 0.26, seed: seed + 8, at: 0.06 }) },   // quick double pop
    counter: (c, o) => { shimmer(c, o, true); R.spdred_impact(c, o) },   // reversed shimmer + hit
    barrier: (c, o) => tone(c, o, { type: 'triangle', freq: 520 * k, freqEnd: 1040 * k, dur: 0.2, gain: 0.1 }), reflect: R.spdred_dodge, parry: R.spdred_dodge, absorb: R.spdred_blocked,
    eruption: crack, rumble, trapSet: thunk, trapClick: (c, o) => { tone(c, o, { type: 'square', freq: 1900, dur: 0.02, gain: 0.08 }); crack(c, o) }, rev: (c, o) => tone(c, o, { type: 'sawtooth', freq: 90, freqEnd: 180, dur: 0.18, gain: 0.08 }),
    shot: zap, beam: zap, kunai: thunk, gale: whoosh, tornado: drone, tornadoHit: R.spdred_impact, impact: R.spdred_impact, slashHit: R.spdred_zap, blocked: R.spdred_blocked, zap: R.spdred_zap,
    special: swing, swing, swingSword: swing, superStart: (c, o) => { pop(c, o); drone(c, o) }, ultStart: (c, o) => { shimmer(c, o); drone(c, o) }, quake: rumble, cloneStrike: R.spdred_impact,
    handSign: (c, o) => tone(c, o, { freq: 1320 * k, dur: 0.05, gain: 0.08 }), land: (c, o) => fnoise(c, o, { dur: 0.12, type: 'lowpass', freq: 600, gain: 0.25, seed: seed + 9 }),
  }
  return Object.fromEntries(Object.entries(map).map(([n, fn]) => [prefix + n, fn]))
}
export const NS_SOUNDS = { ...set('nsr_', 1.0, false, 401), ...set('nsy_', 0.6, true, 433) }
