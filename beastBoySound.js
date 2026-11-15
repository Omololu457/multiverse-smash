// beastBoySound.js — Beast Boy WebAudio SFX placeholders. No audio pack and no voice pack were supplied → no synthesized
// dialogue and no claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the
// SFX master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim
// queues cue names on f._beastBoy.cues; beastBoyFx.playBeastBoyCues plays them as `beastboy_<cue>`.
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
// human ↔ animal morph cue: a quick wobbling chirp + soft whoosh
const morph = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 330, freqEnd: 990, dur: 0.12, gain: 0.05 }); tone(ctx, out, { type: 'triangle', freq: 660, freqEnd: 440, dur: 0.1, gain: 0.04, at: 0.08 }); fnoise(ctx, out, { dur: 0.16, freq: 1200, freqEnd: 3000, q: 0.8, gain: 0.06, seed: 3 }) }
// gorilla: weighty kick (low swoosh then a heavy thud)
const gorillaWind = (ctx, out) => fnoise(ctx, out, { dur: 0.2, type: 'lowpass', freq: 400, freqEnd: 900, q: 0.7, gain: 0.08, seed: 5, at: 0.12 })
const gorillaHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.3, type: 'lowpass', freq: 1200, freqEnd: 80, q: 0.9, gain: 0.38, seed: 9 }); tone(ctx, out, { freq: 90, freqEnd: 40, dur: 0.28, gain: 0.22 }) }
// triceratops: hoof drum roll + horn impact
const hooves = (ctx, out) => { for (let i = 0; i < 5; i++) fnoise(ctx, out, { dur: 0.05, type: 'lowpass', freq: 500, freqEnd: 150, gain: 0.16, seed: 11 + i, at: i * 0.075 }) }
const triceraWind = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 110, freqEnd: 70, dur: 0.25, gain: 0.04, at: 0.15 })
const triceraHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.34, type: 'lowpass', freq: 1500, freqEnd: 100, q: 1, gain: 0.36, seed: 17 }); tone(ctx, out, { freq: 70, freqEnd: 35, dur: 0.34, gain: 0.22 }); tone(ctx, out, { type: 'square', freq: 220, freqEnd: 110, dur: 0.08, gain: 0.04 }) }
// bird: wing pass (airy bandpass flutter) + light peck
const wing = (ctx, out) => { fnoise(ctx, out, { dur: 0.09, freq: 1800, freqEnd: 900, q: 1.5, gain: 0.08, seed: 19 }); fnoise(ctx, out, { dur: 0.08, freq: 1500, freqEnd: 800, q: 1.5, gain: 0.06, seed: 23, at: 0.1 }) }
const birdWind = (ctx, out) => wing(ctx, out)
const birdHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, freq: 2600, freqEnd: 1200, q: 2, gain: 0.16, seed: 29 }); tone(ctx, out, { type: 'triangle', freq: 1760, freqEnd: 1100, dur: 0.06, gain: 0.04 }) }
// tiger: claw slash (bright highpass rip) + growl-ish low saw
const tigerWind = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 95, freqEnd: 140, dur: 0.22, gain: 0.04 })
const tigerHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.16, type: 'highpass', freq: 2500, freqEnd: 6000, q: 0.7, gain: 0.22, seed: 31 }); fnoise(ctx, out, { dur: 0.14, type: 'highpass', freq: 2200, freqEnd: 5200, q: 0.7, gain: 0.16, seed: 37, at: 0.05 }) }
// Wild Chain ready / queued / go; Instinct earned / armed / used
const chainReady = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 784, dur: 0.05, gain: 0.05 }); tone(ctx, out, { type: 'triangle', freq: 1175, dur: 0.07, gain: 0.05, at: 0.05 }) }
const chainQueued = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 1568, dur: 0.05, gain: 0.04 })
const chainGo = (ctx, out) => { morph(ctx, out); tone(ctx, out, { type: 'triangle', freq: 1175, freqEnd: 1568, dur: 0.08, gain: 0.04 }) }
const instinct = (ctx, out) => { [523, 659, 784, 1047].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, dur: 0.08, gain: 0.05, at: i * 0.06 })) }
const instinctArmed = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 1047, freqEnd: 1568, dur: 0.1, gain: 0.04 })
const instinctJump = (ctx, out) => fnoise(ctx, out, { dur: 0.12, freq: 900, freqEnd: 2600, q: 1, gain: 0.08, seed: 41 })
const instinctDash = instinctJump
// humanoid / misc
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.08, freq: 700, freqEnd: 2200, q: 1.4, gain: 0.08, seed: 43 })
const swingHeavy = (ctx, out) => fnoise(ctx, out, { dur: 0.12, freq: 500, freqEnd: 1800, q: 1.2, gain: 0.1, seed: 47 })
const feint = (ctx, out) => fnoise(ctx, out, { dur: 0.1, type: 'highpass', freq: 1800, freqEnd: 900, q: 0.8, gain: 0.05, seed: 53 })
const land = (ctx, out) => fnoise(ctx, out, { dur: 0.08, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.12, seed: 59 })
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const whiff = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 61 })
const ultStart = (ctx, out) => { morph(ctx, out); tone(ctx, out, { type: 'square', freq: 392, freqEnd: 1568, dur: 0.35, gain: 0.03, at: 0.05 }) }
const ultConfirm = (ctx, out) => { swingHeavy(ctx, out); instinct(ctx, out) }

export const BEAST_BOY_SOUNDS = Object.fromEntries(Object.entries({ morph, gorillaWind, gorillaHit, hooves, triceraWind, triceraHit, wing, birdWind,
  birdHit, tigerWind, tigerHit, chainReady, chainQueued, chainGo, instinct, instinctArmed, instinctJump, instinctDash, swing, swingHeavy, feint,
  land, reject, whiff, ultStart, ultConfirm, ultMiss: whiff }).map(([k, v]) => ['beastboy_' + k, v]))
