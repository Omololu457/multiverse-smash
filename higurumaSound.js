// higurumaSound.js — Higuruma WebAudio SFX placeholders. No audio or voice pack was supplied → no synthesized dialogue
// and no claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX
// master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim
// queues cue names on f._higuruma.cues; higurumaFx.playHigurumaCues plays them as `higuruma_<cue>`.
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
// a wooden gavel knock: short low thud + woody mid click
const knock = (ctx, out, at = 0, g = 1) => { tone(ctx, out, { type: 'triangle', freq: 220, freqEnd: 110, dur: 0.09, gain: 0.2 * g, at }); fnoise(ctx, out, { dur: 0.04, freq: 1400, q: 3, gain: 0.12 * g, at, seed: 3 }) }
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.07, freq: 900, freqEnd: 2400, q: 1.4, gain: 0.08, seed: 5 })
const extend = (ctx, out) => { fnoise(ctx, out, { dur: 0.18, freq: 400, freqEnd: 2600, q: 1.1, gain: 0.08, seed: 7 }); tone(ctx, out, { type: 'triangle', freq: 330, freqEnd: 660, dur: 0.16, gain: 0.03 }) }
const giantWind = (ctx, out) => { fnoise(ctx, out, { dur: 0.32, type: 'lowpass', freq: 300, freqEnd: 900, q: 0.8, gain: 0.12, seed: 9 }) }
const giantHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.3, type: 'lowpass', freq: 900, freqEnd: 70, q: 0.7, gain: 0.3, seed: 11 }); tone(ctx, out, { freq: 70, freqEnd: 35, dur: 0.3, gain: 0.22 }) }
const slam = (ctx, out) => { giantHit(ctx, out); knock(ctx, out, 0.02, 1.4) }
const cross = (ctx, out) => { for (let i = 0; i < 3; i++) fnoise(ctx, out, { dur: 0.06, freq: 900, freqEnd: 2600, q: 1.3, gain: 0.07, seed: 13 + i, at: 0.2 + i * 0.12 }) }
const rise = (ctx, out) => { fnoise(ctx, out, { dur: 0.22, freq: 400, freqEnd: 2600, q: 0.9, gain: 0.1, seed: 17 }); tone(ctx, out, { type: 'triangle', freq: 440, freqEnd: 880, dur: 0.2, gain: 0.03 }) }
const objection = (ctx, out) => { knock(ctx, out, 0, 0.8); tone(ctx, out, { type: 'square', freq: 520, dur: 0.05, gain: 0.02, at: 0.02 }) }
const counter = (ctx, out) => { knock(ctx, out, 0, 1.2); knock(ctx, out, 0.11, 1.2); tone(ctx, out, { type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.12, gain: 0.04 }) }
const objWhiff = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 260, freqEnd: 200, dur: 0.1, gain: 0.04 })
const mark = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 784, dur: 0.06, gain: 0.04 }) }
const token = (ctx, out) => { [523, 659, 784].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, dur: 0.09, gain: 0.04, at: i * 0.06 })) }
const precedent = (ctx, out) => { knock(ctx, out, 0, 0.9); fnoise(ctx, out, { dur: 0.12, freq: 700, freqEnd: 2200, q: 1, gain: 0.07, seed: 19 }) }
const doubleJump = (ctx, out) => fnoise(ctx, out, { dur: 0.12, freq: 700, freqEnd: 2000, q: 0.9, gain: 0.05, seed: 21 })
const land = (ctx, out) => fnoise(ctx, out, { dur: 0.07, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.1, seed: 23 })
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const ultStart = (ctx, out) => { extend(ctx, out); tone(ctx, out, { type: 'sine', freq: 196, freqEnd: 392, dur: 0.3, gain: 0.04, at: 0.05 }) }
const ultMiss = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 25 })
const ultConfirm = (ctx, out) => { knock(ctx, out, 0, 1.2) }
const domain = (ctx, out) => { tone(ctx, out, { freq: 55, freqEnd: 82, dur: 1.2, gain: 0.18 }); tone(ctx, out, { type: 'triangle', freq: 110, dur: 1.0, gain: 0.05, at: 0.1 }); knock(ctx, out, 0.5, 1.3) }
const confiscate = (ctx, out) => { fnoise(ctx, out, { dur: 0.4, type: 'highpass', freq: 3000, freqEnd: 800, q: 0.6, gain: 0.06, seed: 27 }); tone(ctx, out, { type: 'triangle', freq: 1320, freqEnd: 660, dur: 0.3, gain: 0.03 }) }
const verdict = (ctx, out) => { slam(ctx, out); knock(ctx, out, 0.16, 1.4); knock(ctx, out, 0.32, 1.4) }
const sword = (ctx, out) => { tone(ctx, out, { type: 'sine', freq: 1568, freqEnd: 2093, dur: 0.5, gain: 0.04 }); fnoise(ctx, out, { dur: 0.5, type: 'highpass', freq: 4000, freqEnd: 2000, q: 0.5, gain: 0.04, seed: 29 }) }
const swordHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.25, freq: 2400, freqEnd: 600, q: 1.2, gain: 0.25, seed: 31 }); tone(ctx, out, { type: 'triangle', freq: 1046, freqEnd: 523, dur: 0.3, gain: 0.06 }) }

export const HIGURUMA_SOUNDS = Object.fromEntries(Object.entries({ swing, extend, giantWind, giantHit, slam, cross, rise, objection, counter, objWhiff,
  mark, token, precedent, doubleJump, land, reject, ultStart, ultMiss, ultConfirm, domain, confiscate, verdict, sword, swordHit })
  .map(([k, v]) => ['higuruma_' + k, v]))
