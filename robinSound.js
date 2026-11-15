// robinSound.js — Robin WebAudio SFX placeholders. No audio or voice pack was supplied → no synthesized dialogue and no
// claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX master
// gain; the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim queues cue
// names on f._robin.cues; robinFx.playRobinCues plays them as `robin_<cue>`.
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
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.006, dur * 0.4))
  g.gain.setValueAtTime(gain, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.setValueAtTime(gain, t0 + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.07, freq: 900, freqEnd: 2600, q: 1.4, gain: 0.08, seed: 3 })
// staff: a long airy whoosh with a light metallic ring
const staff = (ctx, out) => { fnoise(ctx, out, { dur: 0.16, freq: 500, freqEnd: 2400, q: 1.1, gain: 0.1, seed: 5 }); tone(ctx, out, { type: 'triangle', freq: 1320, freqEnd: 1180, dur: 0.12, gain: 0.025 }) }
const staffHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, type: 'lowpass', freq: 1800, freqEnd: 300, gain: 0.26, seed: 9 }); tone(ctx, out, { type: 'triangle', freq: 990, freqEnd: 660, dur: 0.08, gain: 0.04 }) }
const express = (ctx, out) => { for (let i = 0; i < 3; i++) fnoise(ctx, out, { dur: 0.08, freq: 800, freqEnd: 2800, q: 1.3, gain: 0.08, seed: 11 + i, at: i * 0.2 }) }
const roof = (ctx, out) => { fnoise(ctx, out, { dur: 0.22, freq: 400, freqEnd: 2600, q: 0.9, gain: 0.1, seed: 13 }); tone(ctx, out, { type: 'triangle', freq: 660, freqEnd: 1320, dur: 0.2, gain: 0.03 }) }
const throwWind = (ctx, out) => fnoise(ctx, out, { dur: 0.06, freq: 1200, freqEnd: 600, q: 1, gain: 0.04, seed: 15 })
const throwS = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, freq: 1400, freqEnd: 3200, q: 1.5, gain: 0.08, seed: 17 }); tone(ctx, out, { type: 'square', freq: 880, dur: 0.03, gain: 0.02 }) }
const blast = (ctx, out) => { fnoise(ctx, out, { dur: 0.5, type: 'lowpass', freq: 2200, freqEnd: 60, q: 0.8, gain: 0.42, seed: 19 }); tone(ctx, out, { freq: 80, freqEnd: 30, dur: 0.45, gain: 0.25 }) }
const smoke = (ctx, out) => fnoise(ctx, out, { dur: 0.45, type: 'highpass', freq: 3000, freqEnd: 900, q: 0.6, gain: 0.09, seed: 21 })
const step = (ctx, out) => { fnoise(ctx, out, { dur: 0.14, freq: 600, freqEnd: 3400, q: 1, gain: 0.1, seed: 23 }); tone(ctx, out, { type: 'triangle', freq: 523, freqEnd: 1046, dur: 0.1, gain: 0.03 }) }
const plant = (ctx, out) => { fnoise(ctx, out, { dur: 0.06, type: 'lowpass', freq: 700, freqEnd: 200, gain: 0.14, seed: 25 }); tone(ctx, out, { type: 'square', freq: 1760, dur: 0.03, gain: 0.02, at: 0.08 }) }
const armed = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1568, dur: 0.04, gain: 0.025 }); tone(ctx, out, { type: 'square', freq: 2093, dur: 0.05, gain: 0.025, at: 0.06 }) }
const hack = (ctx, out) => { [1760, 2349, 1976, 2637].forEach((f, i) => tone(ctx, out, { type: 'square', freq: f, dur: 0.03, gain: 0.018, at: i * 0.045 })) }
const detonateCmd = (ctx, out) => { [2093, 2093, 2637].forEach((f, i) => tone(ctx, out, { type: 'square', freq: f, dur: 0.05, gain: 0.03, at: i * 0.07 })) }
const convert = (ctx, out) => { hack(ctx, out); smoke(ctx, out) }
const fizzle = (ctx, out) => fnoise(ctx, out, { dur: 0.22, type: 'highpass', freq: 2400, freqEnd: 700, q: 0.7, gain: 0.07, seed: 27 })
const bat = (ctx, out) => { staffHit(ctx, out); tone(ctx, out, { type: 'triangle', freq: 1568, freqEnd: 2093, dur: 0.1, gain: 0.04 }) }
const outplay = (ctx, out) => { [784, 988, 1319].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, dur: 0.07, gain: 0.04, at: i * 0.05 })) }
const doubleJump = (ctx, out) => fnoise(ctx, out, { dur: 0.12, freq: 700, freqEnd: 2000, q: 0.9, gain: 0.05, seed: 29 })
const land = (ctx, out) => fnoise(ctx, out, { dur: 0.07, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.1, seed: 31 })
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const ultStart = (ctx, out) => { staff(ctx, out); tone(ctx, out, { type: 'square', freq: 392, freqEnd: 1568, dur: 0.3, gain: 0.025, at: 0.05 }) }
const ultConfirm = (ctx, out) => { staffHit(ctx, out); outplay(ctx, out) }
const ultMiss = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 33 })

export const ROBIN_SOUNDS = Object.fromEntries(Object.entries({ swing, staff, staffHit, express, roof, throwWind, throw: throwS, blast, smoke,
  step, plant, armed, hack, detonateCmd, convert, fizzle, bat, outplay, doubleJump, land, reject, ultStart, ultConfirm, ultMiss })
  .map(([k, v]) => ['robin_' + k, v]))
