// enochSound.js — Enoch's WebAudio SFX (synthesized; no dialogue, no recorded lines). Spread into sound.js SOUNDS so every cue
// plays through SoundManager.play → the SFX master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer
// (deterministic, no Math.random). The sim queues cue names on f._enoch.cues; enochFx.playEnochCues plays them as `enoch_<cue>`.
// The sustained LASER is not here: it is Homelander's real beam loop (homelander_sfx_map.startHomelanderLaser) pitched ×1.12.
// Palette (brief): crystalline crackle · glass shatter · quiet fire crackle · LOUD water-reaction hiss + bass thump ·
// filtered-noise steam · a glide whoosh whose pitch rises with speed (two variants) · a two-tone overload alarm.
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
const chime = (ctx, out, f0, gain = 0.035, at = 0, dur = 0.16) => tone(ctx, out, { type: 'triangle', freq: f0, dur, gain, at })
const crackle = (ctx, out, seed = 3, gain = 0.07, at = 0) => { fnoise(ctx, out, { dur: 0.07, type: 'highpass', freq: 3600, gain, seed, at }); chime(ctx, out, 2637, gain * 0.4, at + 0.01, 0.08) }
const shatter = (ctx, out) => { [5, 7, 9].forEach((sd, i) => fnoise(ctx, out, { dur: 0.12, type: 'highpass', freq: 3000 + i * 900, gain: 0.11, seed: sd, at: i * 0.035 })); [2093, 2794, 3520].forEach((f, i) => chime(ctx, out, f, 0.03, 0.02 + i * 0.03, 0.12)) }
const fireCrackle = (ctx, out) => { [11, 13, 15].forEach((sd, i) => fnoise(ctx, out, { dur: 0.04, type: 'bandpass', freq: 1800 + i * 500, q: 3, gain: 0.025, seed: sd, at: i * 0.05 })) }
const hissThump = (ctx, out) => { fnoise(ctx, out, { dur: 0.55, type: 'highpass', freq: 4200, freqEnd: 1500, gain: 0.22, seed: 17 }); tone(ctx, out, { freq: 82, freqEnd: 38, dur: 0.32, gain: 0.32 }) }
const steam = (ctx, out) => fnoise(ctx, out, { dur: 0.4, type: 'bandpass', freq: 2600, freqEnd: 900, q: 0.7, gain: 0.08, seed: 19 })
const whoosh = (f0, f1, seed) => (ctx, out) => fnoise(ctx, out, { dur: 0.32, type: 'bandpass', freq: f0, freqEnd: f1, q: 2.5, gain: 0.07, seed })
const overload = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 880, dur: 0.12, gain: 0.05 }); tone(ctx, out, { type: 'square', freq: 587, dur: 0.12, gain: 0.05, at: 0.13 }); tone(ctx, out, { type: 'square', freq: 880, dur: 0.12, gain: 0.05, at: 0.26 }) }
const laserShot = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 1450, freqEnd: 980, dur: 0.16, gain: 0.05 }); fnoise(ctx, out, { dur: 0.14, type: 'highpass', freq: 5000, gain: 0.04, seed: 23 }) }

const S = {
  swing: (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'bandpass', freq: 1300, freqEnd: 2600, q: 1.4, gain: 0.05, seed: 27 }),
  cast: (ctx, out) => chime(ctx, out, 1175, 0.03),
  iceCast: (ctx, out) => { crackle(ctx, out, 29, 0.06); chime(ctx, out, 1568, 0.03, 0.02) },
  fireCast: (ctx, out) => { fireCrackle(ctx, out); tone(ctx, out, { freq: 220, freqEnd: 330, dur: 0.12, gain: 0.04 }) },
  waterCast: (ctx, out) => fnoise(ctx, out, { dur: 0.22, type: 'lowpass', freq: 900, freqEnd: 300, gain: 0.08, seed: 31 }),
  iceBlast: (ctx, out) => { crackle(ctx, out, 33, 0.08); [1319, 1760].forEach((f, i) => chime(ctx, out, f, 0.03, i * 0.04)) },
  crackle: (ctx, out) => crackle(ctx, out, 35, 0.08),
  shatter, freeze: (ctx, out) => { steam(ctx, out); [880, 1175, 1568, 2093].forEach((f, i) => chime(ctx, out, f, 0.03, i * 0.03)) },
  burst: hissThump, hiss: (ctx, out) => { fnoise(ctx, out, { dur: 0.4, type: 'highpass', freq: 3800, freqEnd: 1700, gain: 0.16, seed: 37 }); tone(ctx, out, { freq: 70, freqEnd: 40, dur: 0.22, gain: 0.18 }) },
  steam, tide: (ctx, out) => { fnoise(ctx, out, { dur: 0.6, type: 'lowpass', freq: 1400, freqEnd: 260, gain: 0.14, seed: 39 }); tone(ctx, out, { freq: 96, freqEnd: 44, dur: 0.3, gain: 0.2 }) },
  orb: (ctx, out) => tone(ctx, out, { freq: 520, freqEnd: 780, dur: 0.2, gain: 0.04 }),
  laser: laserShot, laserOn: laserShot, laserOff: (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 900, freqEnd: 300, dur: 0.1, gain: 0.03 }),
  glide: whoosh(1400, 2800, 41), glideFast: whoosh(2000, 4200, 43), switch: (ctx, out) => { whoosh(1800, 3600, 45)(ctx, out); chime(ctx, out, 1760, 0.03) },
  brake: (ctx, out) => fnoise(ctx, out, { dur: 0.2, type: 'highpass', freq: 2600, freqEnd: 1200, gain: 0.07, seed: 47 }),
  ramp: whoosh(900, 3200, 49), land: (ctx, out) => { fnoise(ctx, out, { dur: 0.08, type: 'lowpass', freq: 700, freqEnd: 160, gain: 0.1, seed: 51 }); crackle(ctx, out, 53, 0.04) },
  overload, reject: (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 }),
  superStart: (ctx, out) => { chime(ctx, out, 1568, 0.04); chime(ctx, out, 1046, 0.04, 0.06) },
  superConfirm_absoluteZero: (ctx, out) => { steam(ctx, out); [1046, 1568, 2093, 3136].forEach((f, i) => chime(ctx, out, f, 0.04, i * 0.05, 0.3)) },
  superConfirm_flashPoint: (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 300, freqEnd: 1500, dur: 0.5, gain: 0.05 }); fireCrackle(ctx, out) },
  superConfirm_thermalShock: (ctx, out) => { chime(ctx, out, 1568, 0.04); tone(ctx, out, { type: 'sawtooth', freq: 400, freqEnd: 1200, dur: 0.4, gain: 0.04, at: 0.05 }) },
  superHit: (ctx, out) => crackle(ctx, out, 55, 0.1), superTick: fireCrackle, superFinal: (ctx, out) => { hissThump(ctx, out); shatter(ctx, out) },
  fireCrackle,
  superMiss: (ctx, out) => fnoise(ctx, out, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 57 }),
}
export const ENOCH_SOUNDS = Object.fromEntries(Object.entries(S).map(([k, v]) => ['enoch_' + k, v]))
