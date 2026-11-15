// frozoneSound.js — Frozone WebAudio SFX placeholders. No audio was supplied with the sheet → no synthesized dialogue and
// no claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX master gain;
// the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim queues cue names
// on f._frozone.cues; frozoneFx.playFrozoneCues plays them as `frozone_<cue>`. Palette: glassy crackles, hiss, chimes.
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
// mechanical palette: servo whines, rotor buzz, gun ticks, missile hiss, metal impacts — all synthesized, no dialogue
const servo = (ctx, out, f0 = 420, f1 = 900, dur = 0.14, at = 0) => tone(ctx, out, { type: 'sawtooth', freq: f0, freqEnd: f1, dur, gain: 0.03, at })
const crackle = (ctx, out, seed, gain = 0.07, at = 0) => fnoise(ctx, out, { dur: 0.09, type: 'highpass', freq: 3200, gain, seed, at })
const hiss = (ctx, out, seed, dur = 0.25, gain = 0.06, at = 0) => fnoise(ctx, out, { dur, type: 'bandpass', freq: 5200, freqEnd: 2600, q: 0.9, gain, seed, at })
const chime = (ctx, out, f0, gain = 0.04, at = 0, dur = 0.18) => tone(ctx, out, { type: 'triangle', freq: f0, dur, gain, at })
const swing = (ctx, out) => { hiss(ctx, out, 3, 0.1, 0.05); crackle(ctx, out, 5, 0.03, 0.03) }
const cast = (ctx, out) => { hiss(ctx, out, 7, 0.16, 0.05); chime(ctx, out, 1568, 0.025) }
const lance = (ctx, out) => { fnoise(ctx, out, { dur: 0.18, freq: 3000, freqEnd: 1400, q: 2, gain: 0.08, seed: 9 }); chime(ctx, out, 2093, 0.03) }
const frost = (ctx, out) => { lance(ctx, out); [1319, 1760, 2349].forEach((f, i) => chime(ctx, out, f, 0.03, i * 0.04)) }
const patch = (ctx, out) => { hiss(ctx, out, 11, 0.3, 0.06); crackle(ctx, out, 13, 0.05, 0.12) }
const patchSnap = (ctx, out) => { crackle(ctx, out, 15, 0.1); tone(ctx, out, { freq: 140, freqEnd: 70, dur: 0.12, gain: 0.08 }) }
const skate = (ctx, out) => fnoise(ctx, out, { dur: 0.28, type: 'bandpass', freq: 2400, freqEnd: 4200, q: 3, gain: 0.05, seed: 17 })
const skateSwitch = (ctx, out) => { skate(ctx, out); [1760, 2637].forEach((f, i) => chime(ctx, out, f, 0.035, i * 0.05)) }
const brake = (ctx, out) => fnoise(ctx, out, { dur: 0.22, type: 'highpass', freq: 2600, freqEnd: 1200, gain: 0.08, seed: 19 })
const chill = (ctx, out) => chime(ctx, out, 2349, 0.035, 0, 0.12)
const freeze = (ctx, out) => { hiss(ctx, out, 21, 0.35, 0.07); [880, 1175, 1568, 2093].forEach((f, i) => chime(ctx, out, f, 0.03, i * 0.03)) }
const thaw = (ctx, out) => crackle(ctx, out, 23, 0.05)
const shatter = (ctx, out) => { crackle(ctx, out, 25, 0.14); crackle(ctx, out, 27, 0.1, 0.05); tone(ctx, out, { freq: 120, freqEnd: 55, dur: 0.2, gain: 0.1 }) }
const rise = (ctx, out) => fnoise(ctx, out, { dur: 0.25, type: 'bandpass', freq: 900, freqEnd: 3000, q: 1, gain: 0.08, seed: 29 })
const land = (ctx, out) => { fnoise(ctx, out, { dur: 0.08, type: 'lowpass', freq: 700, freqEnd: 160, gain: 0.1, seed: 31 }); crackle(ctx, out, 33, 0.05) }
const jump = (ctx, out) => hiss(ctx, out, 35, 0.12, 0.04)
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const ultStart = (ctx, out) => { cast(ctx, out); hiss(ctx, out, 37, 0.4, 0.05, 0.05) }
const ultConfirm = (ctx, out) => { freeze(ctx, out); fnoise(ctx, out, { dur: 0.6, type: 'lowpass', freq: 400, freqEnd: 1600, gain: 0.07, seed: 39 }) }
const ultMiss = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 41 })
const ultPass = (ctx, out) => { skate(ctx, out); crackle(ctx, out, 43, 0.08, 0.04) }
const ultShatter = (ctx, out) => { shatter(ctx, out); fnoise(ctx, out, { dur: 0.6, type: 'lowpass', freq: 1000, freqEnd: 120, q: 0.6, gain: 0.12, seed: 45 }); [2093, 2637, 3136].forEach((f, i) => chime(ctx, out, f, 0.03, 0.1 + i * 0.05)) }

export const FROZONE_SOUNDS = Object.fromEntries(Object.entries({ swing, cast, lance, frost, patch, patchSnap, skate, skateSwitch, brake, chill, freeze,
  thaw, shatter, rise, land, jump, reject, ultStart, ultConfirm, ultMiss, ultPass, ultShatter }).map(([k, v]) => ['frozone_' + k, v]))
