// syndromeSound.js — Syndrome WebAudio SFX placeholders. No audio was supplied with the sheets → no synthesized dialogue
// and no claimed recorded lines. Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX
// master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer (deterministic, no Math.random). The sim
// queues cue names on f._syndrome.cues; syndromeFx.playSyndromeCues plays them as `syndrome_<cue>`.
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
const thud = (ctx, out, seed, gain = 0.18, at = 0) => { fnoise(ctx, out, { dur: 0.22, type: 'lowpass', freq: 380, freqEnd: 70, q: 0.7, gain, seed, at }); tone(ctx, out, { freq: 70, freqEnd: 38, dur: 0.25, gain: gain * 0.9, at }) }
const command = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1320, dur: 0.03, gain: 0.025 }); tone(ctx, out, { type: 'square', freq: 1760, dur: 0.03, gain: 0.02, at: 0.035 }) }
const gesture = (ctx, out) => { servo(ctx, out, 600, 1400, 0.07); fnoise(ctx, out, { dur: 0.06, freq: 1600, freqEnd: 3000, q: 1.2, gain: 0.05, seed: 3 }) }
const zeroCharge = (ctx, out) => tone(ctx, out, { type: 'sine', freq: 300, freqEnd: 1200, dur: 0.2, gain: 0.06 })
const zero = (ctx, out) => { tone(ctx, out, { type: 'sine', freq: 1500, freqEnd: 1300, dur: 0.35, gain: 0.05 }); tone(ctx, out, { type: 'triangle', freq: 2250, dur: 0.3, gain: 0.02 }) }
const converge = (ctx, out) => { [880, 1175, 1568].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, dur: 0.07, gain: 0.04, at: i * 0.05 })) }
const droneLaunch = (ctx, out) => { fnoise(ctx, out, { dur: 0.3, freq: 900, freqEnd: 1600, q: 3, gain: 0.05, seed: 5 }); servo(ctx, out, 300, 700, 0.25) }
const droneShot = (ctx, out) => fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 2600, gain: 0.07, seed: 7 })
const spinnerOpen = (ctx, out) => { servo(ctx, out, 200, 600, 0.12); fnoise(ctx, out, { dur: 0.25, freq: 1200, freqEnd: 2600, q: 4, gain: 0.05, seed: 9, at: 0.08 }) }
const spinnerReturn = (ctx, out) => fnoise(ctx, out, { dur: 0.2, freq: 2400, freqEnd: 1100, q: 4, gain: 0.05, seed: 11 })
const veloWarn = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 990, dur: 0.05, gain: 0.03 }); tone(ctx, out, { type: 'square', freq: 990, dur: 0.05, gain: 0.03, at: 0.12 }) }
const veloPass = (ctx, out) => fnoise(ctx, out, { dur: 0.45, freq: 500, freqEnd: 1800, q: 1.2, gain: 0.12, seed: 13 })
const turretDeploy = (ctx, out) => { thud(ctx, out, 15, 0.08); servo(ctx, out, 180, 520, 0.3, 0.1) }
const turretHit = (ctx, out) => fnoise(ctx, out, { dur: 0.06, freq: 3000, q: 2, gain: 0.07, seed: 17 })
const gunShot = (ctx, out) => { fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 1800, gain: 0.08, seed: 19 }); tone(ctx, out, { type: 'square', freq: 220, freqEnd: 110, dur: 0.04, gain: 0.03 }) }
const missileLaunch = (ctx, out) => fnoise(ctx, out, { dur: 0.5, type: 'bandpass', freq: 700, freqEnd: 2200, q: 0.8, gain: 0.08, seed: 21 })
const mortarShot = (ctx, out) => thud(ctx, out, 23, 0.12)
const mortarLand = (ctx, out) => thud(ctx, out, 25, 0.08)
const boom = (ctx, out) => { thud(ctx, out, 27, 0.2); fnoise(ctx, out, { dur: 0.5, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.6, gain: 0.1, seed: 29 }) }
const omniLoom = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 55, freqEnd: 82, dur: 0.6, gain: 0.05 }); servo(ctx, out, 140, 260, 0.5, 0.1) }
const omniRise = (ctx, out) => { omniLoom(ctx, out); fnoise(ctx, out, { dur: 0.3, type: 'lowpass', freq: 300, freqEnd: 900, gain: 0.08, seed: 31, at: 0.2 }) }
const slam = (ctx, out) => { thud(ctx, out, 33, 0.24); fnoise(ctx, out, { dur: 0.3, freq: 1600, freqEnd: 400, q: 0.7, gain: 0.06, seed: 35 }) }
const clawRise = (ctx, out) => { servo(ctx, out, 160, 700, 0.18); fnoise(ctx, out, { dur: 0.12, freq: 2000, freqEnd: 800, q: 1.2, gain: 0.08, seed: 37, at: 0.1 }) }
const sweep = (ctx, out) => fnoise(ctx, out, { dur: 0.35, type: 'lowpass', freq: 600, freqEnd: 1500, q: 0.8, gain: 0.12, seed: 39 })
const claw = (ctx, out) => { fnoise(ctx, out, { dur: 0.1, freq: 1800, freqEnd: 600, q: 1.2, gain: 0.14, seed: 41 }); servo(ctx, out, 500, 200, 0.1) }
const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 })
const doubleJump = (ctx, out) => fnoise(ctx, out, { dur: 0.14, type: 'bandpass', freq: 800, freqEnd: 1800, q: 1, gain: 0.06, seed: 43 })
const land = (ctx, out) => fnoise(ctx, out, { dur: 0.07, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.1, seed: 45 })
const ultStart = (ctx, out) => { command(ctx, out); zeroCharge(ctx, out) }
const ultConfirm = (ctx, out) => { zero(ctx, out); omniLoom(ctx, out) }
const ultMiss = (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 47 })
const ultSlam = (ctx, out) => { slam(ctx, out); boom(ctx, out) }

export const SYNDROME_SOUNDS = Object.fromEntries(Object.entries({ command, gesture, zeroCharge, zero, converge, droneLaunch, droneShot, spinnerOpen,
  spinnerReturn, veloWarn, veloPass, turretDeploy, turretHit, gunShot, missileLaunch, mortarShot, mortarLand, boom, omniLoom, omniRise, slam, clawRise,
  sweep, claw, reject, doubleJump, land, ultStart, ultConfirm, ultMiss, ultSlam }).map(([k, v]) => ['syndrome_' + k, v]))
