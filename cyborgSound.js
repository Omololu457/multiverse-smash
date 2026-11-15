// cyborgSound.js — Cyborg WebAudio SFX (no audio pack was supplied, no voice pack → no synthesized dialogue, no "Booyah"
// line). Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX master gain; the VOICE bus is
// never touched. Noise is a seeded LCG buffer: deterministic, no Math.random. The simulation queues cue names on
// f._cyborg.cues; cyborgFx.playCyborgCues plays them as `cyborg_<cue>`.
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
// sonic: rising square chirp + air; pulse: short buzzy zap; cannon branch: servo whine up
const shot = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 520, freqEnd: 1500, dur: 0.12, gain: 0.05 }); fnoise(ctx, out, { dur: 0.1, freq: 2400, q: 2, gain: 0.08, seed: 11 }) }
const pulse = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 880, freqEnd: 420, dur: 0.07, gain: 0.05 }); fnoise(ctx, out, { dur: 0.06, freq: 3000, q: 3, gain: 0.06, seed: 13 }) }
const cannonBranch = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 300, freqEnd: 900, dur: 0.18, gain: 0.06 })
const sonicHit = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1200, freqEnd: 600, dur: 0.08, gain: 0.05 }); fnoise(ctx, out, { dur: 0.09, freq: 1800, gain: 0.12, seed: 17 }) }
// missiles: hiss launch, low boom on contact / expiry
const missile = (ctx, out) => fnoise(ctx, out, { dur: 0.22, type: 'highpass', freq: 1400, freqEnd: 4200, q: 0.8, gain: 0.12, seed: 19 })
const rack = (ctx, out) => fnoise(ctx, out, { dur: 0.12, type: 'highpass', freq: 2000, freqEnd: 4800, q: 0.8, gain: 0.08, seed: 23 })
const boom = (ctx, out) => { fnoise(ctx, out, { dur: 0.32, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.7, gain: 0.32, seed: 29 }); tone(ctx, out, { freq: 110, freqEnd: 45, dur: 0.25, gain: 0.14 }) }
// resonance mark: two-tone tag; conversion uses boom
const mark = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 988, dur: 0.06, gain: 0.04 }); tone(ctx, out, { type: 'triangle', freq: 1319, dur: 0.07, gain: 0.04, at: 0.06 }) }
const resonance = (ctx, out) => { boom(ctx, out); tone(ctx, out, { type: 'triangle', freq: 1319, freqEnd: 660, dur: 0.18, gain: 0.05 }) }
// mega punch: servo wind, heavy crunch + ground thump
const megaWind = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 140, freqEnd: 420, dur: 0.3, gain: 0.04 })
const megaImpact = (ctx, out) => { fnoise(ctx, out, { dur: 0.36, type: 'lowpass', freq: 1400, freqEnd: 90, q: 0.9, gain: 0.38, seed: 31 }); tone(ctx, out, { freq: 80, freqEnd: 38, dur: 0.32, gain: 0.2 }) }
const punch = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, type: 'lowpass', freq: 1100, freqEnd: 200, gain: 0.25, seed: 37 }); tone(ctx, out, { freq: 150, freqEnd: 70, dur: 0.1, gain: 0.1 }) }
const hotImpact = (ctx, out) => fnoise(ctx, out, { dur: 0.3, type: 'highpass', freq: 3000, freqEnd: 900, q: 0.6, gain: 0.1, seed: 41 })
const recoil = (ctx, out) => { sonicHit(ctx, out); fnoise(ctx, out, { dur: 0.14, type: 'lowpass', freq: 700, freqEnd: 200, gain: 0.18, seed: 43 }) }
// heat: vent hiss, overheat alarm, weapons-online chirp, reject buzz
const ventOpen = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 600, freqEnd: 360, dur: 0.08, gain: 0.04 })
const vent = (ctx, out) => fnoise(ctx, out, { dur: 0.35, type: 'highpass', freq: 3500, freqEnd: 1800, q: 0.5, gain: 0.07, seed: 47 })
const ventClose = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 360, freqEnd: 600, dur: 0.08, gain: 0.04 })
const overheat = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 740, dur: 0.1, gain: 0.05 }); tone(ctx, out, { type: 'square', freq: 554, dur: 0.12, gain: 0.05, at: 0.12 }); fnoise(ctx, out, { dur: 0.4, type: 'highpass', freq: 3000, gain: 0.06, seed: 53, at: 0.05 }) }
const weaponsOnline = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 660, dur: 0.06, gain: 0.04 }); tone(ctx, out, { type: 'triangle', freq: 880, dur: 0.08, gain: 0.04, at: 0.07 }) }
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
// movement / ultimate
const thruster = (ctx, out) => fnoise(ctx, out, { dur: 0.24, type: 'bandpass', freq: 500, freqEnd: 1600, q: 0.7, gain: 0.14, seed: 59 })
const transform = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 220, freqEnd: 660, dur: 0.12, gain: 0.03 })
const retract = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 660, freqEnd: 220, dur: 0.1, gain: 0.03 })
const ultStart = (ctx, out) => { cannonBranch(ctx, out); tone(ctx, out, { type: 'square', freq: 440, freqEnd: 1760, dur: 0.4, gain: 0.04, at: 0.05 }) }
const ultConfirm = (ctx, out) => { sonicHit(ctx, out); tone(ctx, out, { type: 'triangle', freq: 523, dur: 0.1, gain: 0.05, at: 0.08 }); tone(ctx, out, { type: 'triangle', freq: 784, dur: 0.14, gain: 0.05, at: 0.18 }) }
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.08, freq: 700, freqEnd: 2200, q: 1.4, gain: 0.08, seed: 61 })

export const CYBORG_SOUNDS = Object.fromEntries(Object.entries({ shot, pulse, cannonBranch, sonicHit, missile, rack, boom, mark, resonance,
  megaWind, megaImpact, punch, hotImpact, recoil, ventOpen, vent, ventClose, overheat, weaponsOnline, reject, thruster, transform, retract,
  ultStart, ultConfirm, ultMiss: swing, swing, locked: reject }).map(([k, v]) => ['cyborg_' + k, v]))
