// ravenSound.js — Raven WebAudio SFX placeholders. No audio pack and no voice pack were supplied, so there are no
// voice lines and no synthesized "Azarath Metrion Zinthos" speech. Spread into sound.js SOUNDS so every cue plays via
// SoundManager.play → the existing SFX master bus; the VOICE bus is never touched. Noise = seeded LCG buffer
// (deterministic, no Math.random). The sim queues cue names on f._raven.cues; ravenFx.playRavenCues plays `raven_<cue>`.
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
// dark magic palette: low hollow sine + soft breathy noise; bricks = dry low thuds and grit
const swing = (c, o) => fnoise(c, o, { dur: 0.08, freq: 600, freqEnd: 1600, q: 1.3, gain: 0.07, seed: 61 })
const palm = (c, o) => { fnoise(c, o, { dur: 0.12, freq: 420, freqEnd: 1200, q: 1, gain: 0.09, seed: 67 }); tone(c, o, { freq: 196, freqEnd: 147, dur: 0.12, gain: 0.05 }) }
const cast = (c, o) => { tone(c, o, { type: 'triangle', freq: 220, freqEnd: 330, dur: 0.16, gain: 0.05 }); fnoise(c, o, { dur: 0.16, freq: 900, freqEnd: 500, q: 4, gain: 0.05, seed: 71 }) }
const pulse = (c, o) => { tone(c, o, { freq: 330, freqEnd: 165, dur: 0.18, gain: 0.07 }); fnoise(c, o, { dur: 0.14, freq: 1200, freqEnd: 400, q: 3, gain: 0.06, seed: 73 }) }
const orbHit = (c, o) => { fnoise(c, o, { dur: 0.22, type: 'lowpass', freq: 1400, freqEnd: 200, q: 0.8, gain: 0.18, seed: 79 }); tone(c, o, { freq: 147, freqEnd: 73, dur: 0.18, gain: 0.07 }) }
const liftCast = (c, o) => tone(c, o, { type: 'triangle', freq: 110, freqEnd: 220, dur: 0.3, gain: 0.05 })
const lift = (c, o) => { fnoise(c, o, { dur: 0.25, type: 'lowpass', freq: 500, freqEnd: 1200, q: 0.8, gain: 0.14, seed: 83 }); fnoise(c, o, { dur: 0.08, type: 'highpass', freq: 2400, gain: 0.05, seed: 89, at: 0.05 }) }
const levStart = (c, o) => tone(c, o, { freq: 196, freqEnd: 294, dur: 0.22, gain: 0.05 })
const levEnd = (c, o) => tone(c, o, { freq: 294, freqEnd: 196, dur: 0.18, gain: 0.04 })
const send = (c, o) => fnoise(c, o, { dur: 0.18, freq: 300, freqEnd: 900, q: 1.1, gain: 0.12, seed: 97 })
const brickBreak = (c, o) => { fnoise(c, o, { dur: 0.2, type: 'lowpass', freq: 1800, freqEnd: 300, q: 0.7, gain: 0.22, seed: 101 }); fnoise(c, o, { dur: 0.12, type: 'highpass', freq: 2600, gain: 0.06, seed: 103, at: 0.03 }) }
const infuse = (c, o) => { tone(c, o, { type: 'triangle', freq: 392, freqEnd: 784, dur: 0.14, gain: 0.06 }); orbHit(c, o) }
const verdictWarn = (c, o) => { tone(c, o, { type: 'triangle', freq: 523, dur: 0.07, gain: 0.04 }); tone(c, o, { type: 'triangle', freq: 392, dur: 0.09, gain: 0.04, at: 0.09 }) }
const verdictDrop = (c, o) => fnoise(c, o, { dur: 0.3, freq: 1600, freqEnd: 300, q: 1, gain: 0.1, seed: 107 })
const shellUp = (c, o) => { tone(c, o, { freq: 147, freqEnd: 220, dur: 0.24, gain: 0.06 }); fnoise(c, o, { dur: 0.22, freq: 700, q: 5, gain: 0.04, seed: 109 }) }
const shellHit = (c, o) => { tone(c, o, { type: 'triangle', freq: 660, freqEnd: 440, dur: 0.1, gain: 0.06 }); fnoise(c, o, { dur: 0.08, freq: 1500, q: 2, gain: 0.08, seed: 113 }) }
const shellBreak = (c, o) => { shellHit(c, o); fnoise(c, o, { dur: 0.26, type: 'lowpass', freq: 1200, freqEnd: 150, gain: 0.16, seed: 127, at: 0.04 }) }
const shellEnd = (c, o) => tone(c, o, { freq: 220, freqEnd: 147, dur: 0.16, gain: 0.04 })
const shellCue = (c, o) => tone(c, o, { type: 'triangle', freq: 880, dur: 0.06, gain: 0.03 })
const reject = (c, o) => tone(c, o, { type: 'square', freq: 165, dur: 0.07, gain: 0.03 })
const doubleJump = (c, o) => fnoise(c, o, { dur: 0.12, freq: 800, freqEnd: 1800, q: 1.5, gain: 0.05, seed: 131 })
const ultStart = (c, o) => { cast(c, o); tone(c, o, { freq: 110, freqEnd: 330, dur: 0.45, gain: 0.05, at: 0.05 }) }
const ultConfirm = (c, o) => { orbHit(c, o); tone(c, o, { type: 'triangle', freq: 294, dur: 0.12, gain: 0.05, at: 0.08 }); tone(c, o, { type: 'triangle', freq: 440, dur: 0.18, gain: 0.05, at: 0.2 }) }
const ultRelease = (c, o) => { fnoise(c, o, { dur: 0.5, type: 'lowpass', freq: 1600, freqEnd: 80, q: 0.8, gain: 0.32, seed: 137 }); tone(c, o, { freq: 98, freqEnd: 41, dur: 0.45, gain: 0.16 }) }
const ultMiss = (c, o) => tone(c, o, { freq: 220, freqEnd: 110, dur: 0.2, gain: 0.04 })

export const RAVEN_SOUNDS = Object.fromEntries(Object.entries({ swing, palm, cast, liftCast, lift, pulse, orbHit, levStart, levEnd, send,
  brickBreak, infuse, verdictWarn, verdictDrop, shellUp, shellHit, shellBreak, shellEnd, shellCue, reject, doubleJump,
  ultStart, ultConfirm, ultRelease, ultMiss }).map(([k, v]) => ['raven_' + k, v]))
