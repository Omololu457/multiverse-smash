// megumiSound.js — Megumi WebAudio SFX placeholders. No audio pack was supplied with the sheet → no synthesized dialogue
// and no claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX
// master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim
// queues cue names on f._megumi.cues; megumiFx.playMegumiCues plays them as `megumi_<cue>`.
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
const blade = (ctx, out) => { fnoise(ctx, out, { dur: 0.14, freq: 1400, freqEnd: 4200, q: 1.6, gain: 0.09, seed: 5 }); tone(ctx, out, { type: 'triangle', freq: 1760, freqEnd: 1480, dur: 0.1, gain: 0.02 }) }
// the hand sign: a low shadow swell (ink pooling)
const sign = (ctx, out) => { tone(ctx, out, { freq: 70, freqEnd: 110, dur: 0.25, gain: 0.12 }); fnoise(ctx, out, { dur: 0.25, type: 'lowpass', freq: 500, freqEnd: 180, gain: 0.07, seed: 7 }) }
const emerge = (ctx, out, seed) => fnoise(ctx, out, { dur: 0.22, type: 'lowpass', freq: 300, freqEnd: 1200, q: 0.8, gain: 0.12, seed })
const summon_dog = (ctx, out) => { emerge(ctx, out, 9); [520, 440].forEach((f, i) => tone(ctx, out, { type: 'sawtooth', freq: f, freqEnd: f * 0.7, dur: 0.09, gain: 0.025, at: 0.08 + i * 0.1 })) }
const summon_toad = (ctx, out) => { emerge(ctx, out, 11); tone(ctx, out, { type: 'square', freq: 140, freqEnd: 90, dur: 0.12, gain: 0.04, at: 0.06 }) }
const summon_nue = (ctx, out) => { emerge(ctx, out, 13); fnoise(ctx, out, { dur: 0.3, freq: 600, freqEnd: 300, q: 0.7, gain: 0.07, seed: 15, at: 0.05 }) }
const summon_airNue = summon_nue
const summon_rabbit = (ctx, out) => { for (let i = 0; i < 6; i++) fnoise(ctx, out, { dur: 0.04, type: 'highpass', freq: 2400, gain: 0.03, seed: 17 + i, at: i * 0.04 }) }
const summon_serpent = (ctx, out) => fnoise(ctx, out, { dur: 0.4, type: 'lowpass', freq: 220, freqEnd: 90, q: 0.7, gain: 0.14, seed: 23 })
const summon_elephant = (ctx, out) => { emerge(ctx, out, 25); tone(ctx, out, { type: 'sawtooth', freq: 220, freqEnd: 330, dur: 0.35, gain: 0.04, at: 0.1 }) }
const summon_kon = (ctx, out) => { emerge(ctx, out, 27); tone(ctx, out, { type: 'sawtooth', freq: 160, freqEnd: 90, dur: 0.3, gain: 0.05 }) }
const zap = (ctx, out) => { fnoise(ctx, out, { dur: 0.18, type: 'highpass', freq: 3000, freqEnd: 1200, q: 0.6, gain: 0.14, seed: 29 }); tone(ctx, out, { type: 'square', freq: 1200, freqEnd: 200, dur: 0.12, gain: 0.03 }) }
const rise = (ctx, out) => fnoise(ctx, out, { dur: 0.25, freq: 200, freqEnd: 1600, q: 0.9, gain: 0.14, seed: 31 })
const water = (ctx, out) => fnoise(ctx, out, { dur: 0.3, type: 'lowpass', freq: 1400, freqEnd: 400, q: 0.5, gain: 0.16, seed: 33 })
const pull = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 300, freqEnd: 900, dur: 0.12, gain: 0.04 })
const claw = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, freq: 1800, freqEnd: 600, q: 1.2, gain: 0.16, seed: 35 }); tone(ctx, out, { type: 'sawtooth', freq: 300, freqEnd: 120, dur: 0.08, gain: 0.04 }) }
const step = (ctx, out) => fnoise(ctx, out, { dur: 0.16, type: 'lowpass', freq: 900, freqEnd: 200, q: 0.8, gain: 0.1, seed: 37 })
const hop = (ctx, out) => fnoise(ctx, out, { dur: 0.08, freq: 1500, freqEnd: 2500, q: 1, gain: 0.05, seed: 39 })
const route = (ctx, out) => { [392, 523, 659].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, dur: 0.07, gain: 0.04, at: i * 0.04 })) }
const stock = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 784, freqEnd: 1046, dur: 0.12, gain: 0.04 })
const doubleJump = (ctx, out) => fnoise(ctx, out, { dur: 0.12, freq: 700, freqEnd: 2000, q: 0.9, gain: 0.05, seed: 41 })
const land = (ctx, out) => fnoise(ctx, out, { dur: 0.07, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.1, seed: 43 })
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const ultStart = (ctx, out) => { sign(ctx, out); tone(ctx, out, { type: 'sawtooth', freq: 110, freqEnd: 55, dur: 0.5, gain: 0.04, at: 0.1 }) }
const ultConfirm = (ctx, out) => { claw(ctx, out); tone(ctx, out, { freq: 55, freqEnd: 40, dur: 0.8, gain: 0.2, at: 0.05 }) }
const ultMiss = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 45 })

export const MEGUMI_SOUNDS = Object.fromEntries(Object.entries({ swing, blade, sign, summon_dog, summon_toad, summon_nue, summon_airNue,
  summon_rabbit, summon_serpent, summon_elephant, summon_kon, zap, rise, water, pull, claw, step, hop, route, stock, doubleJump, land, reject,
  ultStart, ultConfirm, ultMiss }).map(([k, v]) => ['megumi_' + k, v]))
