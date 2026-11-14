// mmprBlackSound.js — Black Ranger + Falconzord WebAudio SFX placeholders (no audio pack exists for either).
// Spread into sound.js SOUNDS, so every cue plays through SoundManager.play → the SFX master gain; the VOICE bus is
// never touched (no supplied voice clips). Noise is a seeded LCG buffer: deterministic, no Math.random.
// The simulation queues cues on f._mmprBlack.cues; mmprBlackFx.playMmprBlackCues plays them as `mmprblack_<cue>`.
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
// ── the brief's seven placeholders ──
const thud = (ctx, out) => { tone(ctx, out, { freq: 110, freqEnd: 60, dur: 0.11, gain: 0.4 }); fnoise(ctx, out, { dur: 0.03, freq: 2400, q: 0.8, gain: 0.2, seed: 301 }) }   // martial impact: tight thud + short crack
const crack = (ctx, out) => fnoise(ctx, out, { dur: 0.035, type: 'highpass', freq: 2800, gain: 0.22, seed: 307 })
const ready = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 880, dur: 0.06, gain: 0.06 }); tone(ctx, out, { type: 'square', freq: 1320, dur: 0.07, gain: 0.06, at: 0.08 }) }   // two-note radio acknowledgement
const wing = (ctx, out) => fnoise(ctx, out, { dur: 0.28, type: 'bandpass', freq: 400, freqEnd: 1600, q: 0.7, gain: 0.22, seed: 311 })   // brief wing pass
const talon = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 2200, freqEnd: 900, dur: 0.08, gain: 0.07 }); fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 5000, gain: 0.12, seed: 313 }); thud(ctx, out) }   // electric chirp + strike
const pulses = (ctx, out) => { for (let i = 0; i < 3; i++) tone(ctx, out, { type: 'square', freq: 1500 - i * 150, freqEnd: 700, dur: 0.04, gain: 0.05, at: i * 0.05 }) }   // short repeated energy pulses
const chime = (ctx, out) => { tone(ctx, out, { freq: 1760, dur: 0.12, gain: 0.08 }); tone(ctx, out, { freq: 2640, dur: 0.1, gain: 0.05, at: 0.03 }) }   // small clean chime
const ultRhythm = (ctx, out) => { ready(ctx, out); for (let i = 0; i < 4; i++) fnoise(ctx, out, { dur: 0.12, freq: 500 + i * 300, freqEnd: 1800 + i * 300, q: 0.8, gain: 0.08 + i * 0.03, seed: 317 + i, at: 0.15 + i * 0.12 }) }   // escalating radio / wing rhythm
const ultImpact = (ctx, out) => { tone(ctx, out, { freq: 80, freqEnd: 40, dur: 0.35, gain: 0.5 }); fnoise(ctx, out, { dur: 0.3, type: 'lowpass', freq: 1800, freqEnd: 300, gain: 0.3, seed: 331 }) }
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.07, freq: 900, freqEnd: 2600, q: 1.4, gain: 0.08, seed: 337 })

export const MMPR_BLACK_SOUNDS = {
  mmprblack_swing: swing, mmprblack_special: swing, mmprblack_impact: thud, mmprblack_crack: crack, mmprblack_tag: crack,
  mmprblack_call: ready, mmprblack_ready: ready,
  mmprblack_commit_sweep: wing, mmprblack_commit_talon: wing, mmprblack_commit_volley: wing,
  mmprblack_sweepHit: (ctx, out) => { wing(ctx, out); thud(ctx, out) }, mmprblack_talon: talon,
  mmprblack_volley: pulses, mmprblack_shotHit: crack,
  mmprblack_pincer: chime, mmprblack_pincerGo: chime,
  mmprblack_ultStart: ready, mmprblack_ultConfirm: ultRhythm, mmprblack_ultPass: (ctx, out) => { wing(ctx, out); thud(ctx, out) },
  mmprblack_ultImpact: ultImpact, mmprblack_ultMiss: swing,
}
export const MMPR_BLACK_SOUND_RECIPES = { thud, crack, ready, wing, talon, pulses, chime, ultRhythm, ultImpact }
