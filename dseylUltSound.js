// DSEYL (dseyl) — ZERO HOUR synth score (presentation only). WebAudio through the shared SoundManager's own context and
// SFX master (ctx.sound._ctx / _master, so the SFX mute and volume apply); nothing here is read by the sim. Clock ticks,
// the finger snap, the time-stop "vwomp" (everything pitches DOWN into silence), blinks, Zero-Point beams, the resume
// (everything pitches back UP), drone blasts, the zero-hour chime and the crash. Noise = a seeded LCG (no Math.random).
function noiseBuf(ac, dur, seed) {
  const n = Math.max(1, Math.floor(ac.sampleRate * dur)), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function noise(ac, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1, gain = 0.2, at = 0, seed = 11 }) {
  const t0 = ac.currentTime + at, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain()
  src.buffer = noiseBuf(ac, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.008, dur * 0.3))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ac, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.15, at = 0, attack = 0.004 }) {
  const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02)
}
const S = {
  tick: (ac, o, i) => { const hi = i === 99 ? 1 : (i >> 3) & 1; tone(ac, o, { type: 'square', freq: hi ? 2400 : 1800, dur: 0.035, gain: 0.05 }); noise(ac, o, { dur: 0.03, freq: 5000, q: 4, gain: 0.06, seed: 3 + i }) },
  snap: (ac, o, i) => { noise(ac, o, { dur: 0.07, type: 'highpass', freq: 2200, gain: 0.35, seed: 41 + i }); tone(ac, o, { freq: 900, freqEnd: 300, dur: 0.06, gain: 0.08 }) },
  stop: (ac, o) => { tone(ac, o, { type: 'sawtooth', freq: 520, freqEnd: 40, dur: 1.1, gain: 0.12 }); tone(ac, o, { freq: 260, freqEnd: 30, dur: 1.2, gain: 0.18 });
    noise(ac, o, { dur: 0.9, type: 'lowpass', freq: 3000, freqEnd: 120, q: 0.8, gain: 0.25, seed: 77 }); tone(ac, o, { type: 'triangle', freq: 1320, dur: 1.6, gain: 0.05, at: 0.5, attack: 0.3 }) },
  blink: (ac, o, i) => { const b = 700 + 90 * (i % 8); tone(ac, o, { type: 'sine', freq: b, freqEnd: b * 3.2, dur: 0.09, gain: 0.1 }); noise(ac, o, { dur: 0.1, type: 'bandpass', freq: 2500, freqEnd: 7000, q: 2, gain: 0.12, seed: 90 + i }) },
  plant: (ac, o, i) => { tone(ac, o, { type: 'square', freq: 1046 * (1 + i * 0.06), dur: 0.05, gain: 0.04 }); tone(ac, o, { type: 'square', freq: 1568 * (1 + i * 0.06), dur: 0.06, gain: 0.035, at: 0.05 }) },
  resume: (ac, o) => { tone(ac, o, { type: 'sawtooth', freq: 40, freqEnd: 600, dur: 0.45, gain: 0.13 }); tone(ac, o, { freq: 30, freqEnd: 240, dur: 0.5, gain: 0.2 });
    noise(ac, o, { dur: 0.5, type: 'lowpass', freq: 120, freqEnd: 4000, q: 0.8, gain: 0.3, seed: 55 }) },
  beam: (ac, o, i) => { tone(ac, o, { type: 'sawtooth', freq: 1800 - i * 90, freqEnd: 300, dur: 0.16, gain: 0.07 }); tone(ac, o, { type: 'sine', freq: 2600, freqEnd: 900, dur: 0.12, gain: 0.06 });
    noise(ac, o, { dur: 0.14, type: 'highpass', freq: 3000, gain: 0.12, seed: 120 + i }) },
  drone: (ac, o, i) => { noise(ac, o, { dur: 0.6, type: 'lowpass', freq: 1400, freqEnd: 60, q: 0.7, gain: 0.4, seed: 150 + i }); tone(ac, o, { freq: 90 - i * 10, freqEnd: 32, dur: 0.5, gain: 0.25 }) },
  sphere: (ac, o) => { tone(ac, o, { type: 'sine', freq: 180, freqEnd: 720, dur: 1.0, gain: 0.08, attack: 0.2 }); tone(ac, o, { type: 'sine', freq: 184, freqEnd: 730, dur: 1.0, gain: 0.08, attack: 0.2 }) },
  clock: (ac, o) => { for (let i = 0; i < 6; i++) tone(ac, o, { type: 'square', freq: i % 2 ? 2400 : 1800, dur: 0.035, gain: 0.05, at: i * 0.12 * (1 - i * 0.1) }) },
  zero: (ac, o) => { tone(ac, o, { type: 'triangle', freq: 523, dur: 2.2, gain: 0.12 }); tone(ac, o, { type: 'triangle', freq: 784, dur: 2.0, gain: 0.08 }); tone(ac, o, { type: 'sine', freq: 1046, dur: 1.8, gain: 0.06 });
    tone(ac, o, { freq: 60, freqEnd: 25, dur: 1.0, gain: 0.35 }); noise(ac, o, { dur: 0.9, type: 'lowpass', freq: 2500, freqEnd: 50, q: 0.7, gain: 0.45, seed: 200 }) },
  crash: (ac, o) => { noise(ac, o, { dur: 1.2, type: 'lowpass', freq: 900, freqEnd: 40, q: 0.6, gain: 0.5, seed: 210 }); tone(ac, o, { freq: 55, freqEnd: 22, dur: 1.1, gain: 0.35 }) },
  shatter: (ac, o) => { for (let i = 0; i < 7; i++) tone(ac, o, { type: 'triangle', freq: 2200 + ((i * 733) % 1900), dur: 0.25, gain: 0.03, at: i * 0.04 }); noise(ac, o, { dur: 0.5, type: 'highpass', freq: 4000, gain: 0.1, seed: 230 }) },
}
export function zhSound(ctx, id, i = 0) {
  const sm = ctx?.sound, ac = sm?._ctx, out = sm?._master
  if (!ac || !out || sm._sfxMuted || sm._ready === false || ac.state !== 'running') return
  try { S[id]?.(ac, out, i) } catch (_) {}
}
