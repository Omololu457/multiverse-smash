// swampfireSound.js — Swampfire's per-alien WebAudio placeholder SFX (no audio assets, no voice claimed).
// sound.js playBen10("sf_*", pitch, seed) routes here. `pitch` is the ±3% factor and `seed` the 32-bit
// hash of (match seed, frame, player index) computed by game.js ben10Sfx — noise buffers come from a
// seeded LCG of that hash, so there is NO Math.random and no gameRng anywhere in this file.
//
// VOICE PACK HOOK: SWAMPFIRE_SOUND_ENTRY.voice is null today. A future Swampfire voice pack sets
// voice = { sf_flame: [...urls], sf_inferno: [...] } (or a function); the synth recipes stay as the fallback.

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.4, gain = 0.2, at = 0, seed = 1, attack = 0.012 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.9))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0, attack = 0.005 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.5))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
}

export const SWAMPFIRE_SOUNDS = {
  // Flame Jet: hashed noise through a bandpass rising 600 → 1400 Hz, 0.4 s.
  sf_flame(ctx, out, p, seed)   { fnoise(ctx, out, { dur: 0.4, freq: 600 * p, freqEnd: 1400 * p, q: 1.3, gain: 0.22, seed, attack: 0.03 }) },
  // Vine Eruption: sawtooth 70 → 140 Hz creak 0.35 s + a noise burst.
  sf_vine(ctx, out, p, seed)    { tone(ctx, out, { type: 'sawtooth', freq: 70 * p, freqEnd: 140 * p, dur: 0.35, gain: 0.16, attack: 0.02 })
                                  fnoise(ctx, out, { dur: 0.12, type: 'lowpass', freq: 900 * p, q: 0.8, gain: 0.18, seed: (seed ^ 0x5bd1e995) >>> 0 }) },
  // Blaze Dash: sawtooth 250 → 700 Hz, 0.25 s.
  sf_dash(ctx, out, p)          { tone(ctx, out, { type: 'sawtooth', freq: 250 * p, freqEnd: 700 * p, dur: 0.25, gain: 0.14 }) },
  // Regrowth tick: triangle 520 → 780 Hz, 0.15 s (soft — it repeats every 10 frames while healing).
  sf_regrow(ctx, out, p)        { tone(ctx, out, { type: 'triangle', freq: 520 * p, freqEnd: 780 * p, dur: 0.15, gain: 0.06 }) },
  // Methane Inferno: sine 45 Hz + lowpass noise build 0.5 s, then a square 90 Hz boom with 0.9 s decay.
  sf_inferno(ctx, out, p, seed) {
    tone(ctx, out, { type: 'sine', freq: 45 * p, dur: 0.5, gain: 0.22, attack: 0.45 })
    fnoise(ctx, out, { dur: 0.5, type: 'lowpass', freq: 200 * p, freqEnd: 1800 * p, q: 0.7, gain: 0.16, seed, attack: 0.45 })
    tone(ctx, out, { type: 'square', freq: 90 * p, freqEnd: 60 * p, dur: 0.9, gain: 0.2, at: 0.5 })
    fnoise(ctx, out, { dur: 0.9, type: 'lowpass', freq: 700 * p, freqEnd: 120 * p, q: 0.7, gain: 0.2, at: 0.5, seed: (seed ^ 0x9e3779b9) >>> 0 })
  },
}
export const SWAMPFIRE_SOUND_ENTRY = { alien: 'swampfire', synth: SWAMPFIRE_SOUNDS, voice: null }
export function playSwampfireSound(ctx, out, id, p = 1, seed = 1) {
  const fn = SWAMPFIRE_SOUNDS[id]; if (!fn) return false
  fn(ctx, out, p, seed); return true
}
