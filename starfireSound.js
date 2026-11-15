// starfireSound.js — Starfire WebAudio SFX placeholders. No audio or voice pack was supplied, so there are no voice
// lines. Spread into sound.js SOUNDS so every cue plays via SoundManager.play → the existing SFX master bus; the VOICE
// bus is never touched. Noise = seeded LCG buffer (deterministic, no Math.random). The sim queues cue names on
// f._starfire.cues; starfireFx.playStarfireCues plays `starfire_<cue>`.
function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.2, at = 0, seed = 7 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.006, dur * 0.4))
  g.gain.setValueAtTime(gain, t0 + dur * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.15, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.01, dur * 0.3))
  g.gain.setValueAtTime(gain, t0 + dur * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
// stellar palette: bright rising triangles, airy noise, warm low booms
const swing = (c, o) => fnoise(c, o, { dur: 0.08, freq: 900, freqEnd: 2200, q: 1.3, gain: 0.07, seed: 211 })
const heavy = (c, o) => { fnoise(c, o, { dur: 0.13, freq: 500, freqEnd: 1500, q: 1, gain: 0.1, seed: 213 }); tone(c, o, { freq: 220, freqEnd: 165, dur: 0.12, gain: 0.05 }) }
const charge = (c, o) => tone(c, o, { type: 'triangle', freq: 440, freqEnd: 880, dur: 0.14, gain: 0.05 })
const bolt = (c, o) => { tone(c, o, { type: 'triangle', freq: 660, freqEnd: 1320, dur: 0.12, gain: 0.06 }); fnoise(c, o, { dur: 0.14, freq: 2400, freqEnd: 900, q: 3, gain: 0.06, seed: 217 }) }
const boltHit = (c, o) => { fnoise(c, o, { dur: 0.24, type: 'lowpass', freq: 2200, freqEnd: 260, q: 0.8, gain: 0.2, seed: 219 }); tone(c, o, { freq: 196, freqEnd: 98, dur: 0.18, gain: 0.07 }) }
const orb = (c, o) => { tone(c, o, { freq: 330, freqEnd: 495, dur: 0.3, gain: 0.05 }); tone(c, o, { type: 'triangle', freq: 990, dur: 0.18, gain: 0.025, at: 0.05 }) }
const rush = (c, o) => fnoise(c, o, { dur: 0.26, freq: 500, freqEnd: 2000, q: 1.1, gain: 0.12, seed: 223 })
const sky = (c, o) => tone(c, o, { type: 'triangle', freq: 392, freqEnd: 784, dur: 0.16, gain: 0.05 })
const skyLaunch = (c, o) => fnoise(c, o, { dur: 0.22, freq: 700, freqEnd: 3000, q: 1.4, gain: 0.12, seed: 227 })
const laserCharge = (c, o) => { tone(c, o, { freq: 523, freqEnd: 1046, dur: 0.22, gain: 0.04 }); tone(c, o, { type: 'triangle', freq: 784, freqEnd: 1568, dur: 0.22, gain: 0.03 }) }
const laserFire = (c, o) => { tone(c, o, { type: 'sawtooth', freq: 1760, freqEnd: 1320, dur: 0.16, gain: 0.04 }); fnoise(c, o, { dur: 0.16, type: 'highpass', freq: 3000, gain: 0.05, seed: 229 }) }
const laserHit = (c, o) => { fnoise(c, o, { dur: 0.16, freq: 1800, freqEnd: 600, q: 2, gain: 0.14, seed: 233 }); tone(c, o, { freq: 330, freqEnd: 220, dur: 0.12, gain: 0.05 }) }
const laserBlock = (c, o) => tone(c, o, { type: 'triangle', freq: 880, freqEnd: 660, dur: 0.1, gain: 0.05 })
const prism = (c, o) => { tone(c, o, { type: 'triangle', freq: 784, freqEnd: 1568, dur: 0.12, gain: 0.07 }); tone(c, o, { type: 'triangle', freq: 1175, freqEnd: 2350, dur: 0.14, gain: 0.05, at: 0.04 }); boltHit(c, o) }
const prismHit = (c, o) => { fnoise(c, o, { dur: 0.36, type: 'lowpass', freq: 2600, freqEnd: 120, q: 0.8, gain: 0.26, seed: 239 }); tone(c, o, { freq: 147, freqEnd: 61, dur: 0.3, gain: 0.1 }) }
const levStart = (c, o) => tone(c, o, { freq: 262, freqEnd: 392, dur: 0.22, gain: 0.05 })
const levEnd = (c, o) => tone(c, o, { freq: 392, freqEnd: 262, dur: 0.18, gain: 0.04 })
const reject = (c, o) => tone(c, o, { type: 'square', freq: 196, dur: 0.07, gain: 0.03 })
const doubleJump = (c, o) => fnoise(c, o, { dur: 0.12, freq: 1000, freqEnd: 2400, q: 1.5, gain: 0.05, seed: 241 })
const ultStart = (c, o) => { charge(c, o); tone(c, o, { freq: 220, freqEnd: 660, dur: 0.45, gain: 0.05, at: 0.05 }) }
const ultConfirm = (c, o) => { boltHit(c, o); tone(c, o, { type: 'triangle', freq: 523, dur: 0.12, gain: 0.05, at: 0.08 }); tone(c, o, { type: 'triangle', freq: 784, dur: 0.2, gain: 0.05, at: 0.2 }) }
const ultExplode = (c, o) => { fnoise(c, o, { dur: 0.6, type: 'lowpass', freq: 2000, freqEnd: 70, q: 0.8, gain: 0.34, seed: 251 }); tone(c, o, { freq: 110, freqEnd: 41, dur: 0.5, gain: 0.16 }) }
const ultMiss = (c, o) => tone(c, o, { freq: 330, freqEnd: 165, dur: 0.2, gain: 0.04 })

export const STARFIRE_SOUNDS = Object.fromEntries(Object.entries({ swing, heavy, charge, bolt, boltHit, orb, rush, sky, skyLaunch,
  laserCharge, laserFire, laserHit, laserBlock, prism, prismHit, levStart, levEnd, reject, doubleJump,
  ultStart, ultConfirm, ultExplode, ultMiss }).map(([k, v]) => ['starfire_' + k, v]))
