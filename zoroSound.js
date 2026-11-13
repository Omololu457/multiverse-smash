// zoroSound.js — Roronoa Zoro WebAudio placeholder SFX (no audio assets). Spread into sound.js SOUNDS, so they
// play through SoundManager.play → the SFX master gain (SFX mute respected); the VOICE bus is never touched.
// Noise comes from a seeded LCG buffer (deterministic — no Math.random). Each recipe follows the brief.

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
// Filtered noise burst: type 'bandpass' | 'lowpass', freq (→ freqEnd sweep), gain envelope (attack/decay).
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.4, gain = 0.25, at = 0, seed = 7 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur)
}
// Tone with exponential decay (and optional pitch glide).
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
}

export const ZORO_SOUNDS = {
  // Sword swing: bandpass-noise whoosh, 80 ms; LIGHT hits are higher-pitched.
  zoro_swing(ctx, out)      { fnoise(ctx, out, { dur: 0.08, freq: 900, freqEnd: 1800, q: 1.6, gain: 0.28, seed: 11 }) },
  zoro_swingLight(ctx, out) { fnoise(ctx, out, { dur: 0.08, freq: 1700, freqEnd: 3200, q: 1.8, gain: 0.24, seed: 13 }) },
  // Sword clash / hit: metallic ping, 2.5 kHz sine, fast decay (+ a faint inharmonic partial).
  zoro_hit(ctx, out)        { tone(ctx, out, { freq: 2500, dur: 0.14, gain: 0.18 }); tone(ctx, out, { freq: 3720, dur: 0.07, gain: 0.05 }) },
  // Sheathing: low click + short scrape.
  zoro_sheathe(ctx, out)    { fnoise(ctx, out, { dur: 0.16, freq: 2600, freqEnd: 1400, q: 3, gain: 0.12, seed: 17 }); tone(ctx, out, { type: 'square', freq: 180, dur: 0.03, gain: 0.16, at: 0.16 }) },
  // Santoryu: the third blade drawn — a scrape into a ring.
  zoro_santoryu(ctx, out)   { fnoise(ctx, out, { dur: 0.22, freq: 1200, freqEnd: 3400, q: 2.5, gain: 0.16, seed: 19 }); tone(ctx, out, { freq: 2500, dur: 0.3, gain: 0.1, at: 0.18 }) },
  // Tatsu Maki: low-passed noise "loop" for the tornado's life (~1.3 s), 40 Hz rumble, rising pitch.
  zoro_tatsu(ctx, out)      { fnoise(ctx, out, { dur: 1.3, type: 'lowpass', freq: 300, freqEnd: 1400, q: 0.8, gain: 0.22, seed: 23 }); tone(ctx, out, { freq: 40, freqEnd: 58, dur: 1.3, gain: 0.25 }) },
  // Oni Giri: noise burst + 1.2 kHz ring.
  zoro_oni(ctx, out)        { fnoise(ctx, out, { dur: 0.18, freq: 1500, q: 0.9, gain: 0.3, seed: 29 }); tone(ctx, out, { freq: 1200, dur: 0.45, gain: 0.14, at: 0.04 }) },
  // Shishi Sonson counter: the iai draw — a sharp ring.
  zoro_counter(ctx, out)    { fnoise(ctx, out, { dur: 0.06, freq: 3000, q: 2, gain: 0.2, seed: 31 }); tone(ctx, out, { freq: 1800, freqEnd: 2500, dur: 0.3, gain: 0.14 }) },
  // Haki pulse: 50 Hz sub-bass + descending sweep.
  zoro_haki(ctx, out)       { tone(ctx, out, { freq: 50, dur: 0.9, gain: 0.4 }); tone(ctx, out, { type: 'sawtooth', freq: 900, freqEnd: 60, dur: 0.7, gain: 0.08 }) },
  // ASHURA: dark pulse (sub + descending sweep) under a swelling ring.
  zoro_ashura(ctx, out)     { tone(ctx, out, { freq: 55, dur: 0.6, gain: 0.32 }); tone(ctx, out, { type: 'sawtooth', freq: 700, freqEnd: 90, dur: 0.5, gain: 0.07 }); tone(ctx, out, { freq: 1200, freqEnd: 2500, dur: 0.6, gain: 0.08, at: 0.1 }) },
  // NAP: settling down (a soft falling tone); snore: soft low tone every 60 frames while asleep.
  zoro_nap(ctx, out)        { tone(ctx, out, { type: 'triangle', freq: 220, freqEnd: 110, dur: 0.4, gain: 0.08 }) },
  zoro_snore(ctx, out)      { tone(ctx, out, { type: 'triangle', freq: 95, freqEnd: 80, dur: 0.6, gain: 0.07 }); fnoise(ctx, out, { dur: 0.5, type: 'lowpass', freq: 400, q: 0.7, gain: 0.04, seed: 37 }) },
}
