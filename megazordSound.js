// megazordSound.js — MSV1-MEGAZORD: the Thunder Megazord's WebAudio SFX (SFX bus only; no voice). Spread into sound.js SOUNDS
// as `mz_<cue>`; megazordFx.js plays the cues megazord.js queues on f._squad.mz.cues. Noise = seeded LCG (no Math.random).
function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 11 }) {
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
const servoStep = (c, o) => { tone(c, o, { type: 'sawtooth', freq: 140, freqEnd: 260, dur: 0.12, gain: 0.05 }); tone(c, o, { freq: 70, freqEnd: 38, dur: 0.18, gain: 0.4, at: 0.1 }); fnoise(c, o, { dur: 0.08, type: 'lowpass', freq: 900, gain: 0.18, at: 0.1, seed: 701 }) }
const metal = (c, o) => { tone(c, o, { type: 'triangle', freq: 880, freqEnd: 620, dur: 0.18, gain: 0.1 }); tone(c, o, { type: 'square', freq: 1320, dur: 0.06, gain: 0.04 }); tone(c, o, { freq: 110, freqEnd: 60, dur: 0.12, gain: 0.32 }); fnoise(c, o, { dur: 0.06, type: 'highpass', freq: 2600, gain: 0.14, seed: 703 }) }
const swing = (c, o) => fnoise(c, o, { dur: 0.16, freq: 500, freqEnd: 1800, q: 1, gain: 0.12, seed: 705 })
const flameRoar = (c, o) => { fnoise(c, o, { dur: 0.42, type: 'lowpass', freq: 2400, freqEnd: 500, q: 0.7, gain: 0.26, seed: 707 }); fnoise(c, o, { dur: 0.2, freq: 5200, freqEnd: 1400, q: 1.4, gain: 0.16, seed: 709 }); tone(c, o, { type: 'sawtooth', freq: 90, freqEnd: 55, dur: 0.3, gain: 0.07 }) }
const hum = (c, o) => { tone(c, o, { type: 'sawtooth', freq: 60, freqEnd: 120, dur: 0.66, gain: 0.08 }); tone(c, o, { type: 'square', freq: 120, freqEnd: 240, dur: 0.66, gain: 0.03 }); fnoise(c, o, { dur: 0.66, freq: 3400, q: 8, gain: 0.05, seed: 711 }) }
const charged = (c, o) => { tone(c, o, { freq: 660, freqEnd: 1320, dur: 0.18, gain: 0.08 }); fnoise(c, o, { dur: 0.1, type: 'highpass', freq: 4000, gain: 0.1, seed: 713 }) }
const zap = (c, o) => { for (let i = 0; i < 4; i++) fnoise(c, o, { dur: 0.05, type: 'highpass', freq: 3000 + i * 600, gain: 0.16, at: i * 0.045, seed: 715 + i }); tone(c, o, { type: 'square', freq: 90, dur: 0.2, gain: 0.06 }) }
const whooshBoom = (c, o) => { fnoise(c, o, { dur: 0.22, freq: 400, freqEnd: 2600, q: 1, gain: 0.14, seed: 721 }); fnoise(c, o, { dur: 0.3, type: 'lowpass', freq: 1600, freqEnd: 300, gain: 0.22, at: 0.06, seed: 723 }) }
const boom = (c, o) => { tone(c, o, { freq: 80, freqEnd: 36, dur: 0.4, gain: 0.5 }); fnoise(c, o, { dur: 0.36, type: 'lowpass', freq: 2000, freqEnd: 200, gain: 0.3, seed: 725 }) }
const thunder = (c, o) => { fnoise(c, o, { dur: 0.08, type: 'highpass', freq: 3500, gain: 0.3, seed: 731 }); fnoise(c, o, { dur: 1.1, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.6, gain: 0.4, at: 0.04, seed: 733 }); tone(c, o, { freq: 55, freqEnd: 30, dur: 0.9, gain: 0.35, at: 0.04 }) }
const landing = (c, o) => { boom(c, o); metal(c, o) }
const powerUp = (c, o) => { tone(c, o, { type: 'sawtooth', freq: 110, freqEnd: 440, dur: 0.6, gain: 0.08 }); tone(c, o, { freq: 220, freqEnd: 880, dur: 0.6, gain: 0.06 }); flameRoar(c, o) }
const call = (c, o) => { fnoise(c, o, { dur: 0.05, freq: 1800, q: 2, gain: 0.08, seed: 741 }); tone(c, o, { type: 'square', freq: 740, dur: 0.06, gain: 0.05, at: 0.05 }) }
const zords = (c, o) => { for (let i = 0; i < 5; i++) tone(c, o, { type: 'triangle', freq: 392 * Math.pow(1.122, i), dur: 0.14, gain: 0.06, at: i * 0.3 }) }
const finalCharge = (c, o) => { hum(c, o); tone(c, o, { freq: 200, freqEnd: 1200, dur: 0.36, gain: 0.07 }) }
const finalSlash = (c, o) => { flameRoar(c, o); swing(c, o) }
const breakSnd = (c, o) => { metal(c, o); boom(c, o); fnoise(c, o, { dur: 0.6, type: 'bandpass', freq: 800, freqEnd: 200, q: 2, gain: 0.12, at: 0.15, seed: 751 }) }
export const MEGAZORD_SOUNDS = {
  mz_step: servoStep, mz_swing: (c, o) => { swing(c, o); servoStep(c, o) }, mz_metal: metal, mz_saber: flameRoar, mz_saberHit: (c, o) => { flameRoar(c, o); metal(c, o) },
  mz_charge: hum, mz_charged: charged, mz_shock: zap, mz_fireStart: hum, mz_fire: whooshBoom, mz_fireHit: boom,
  mz_thunder: thunder, mz_land: landing, mz_powerUp: powerUp, mz_call: call, mz_zords: zords,
  mz_finalCharge: finalCharge, mz_finalSlash: finalSlash, mz_break: breakSnd,
}
