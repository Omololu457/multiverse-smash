// spdRedSound.js — S.P.D. Red Ranger WebAudio SFX (no audio assets). Spread into sound.js SOUNDS, so every cue plays
// through SoundManager.play → the SFX master gain (SFX mute respected); the VOICE bus is never touched.
// Noise comes from a seeded LCG buffer (deterministic — no Math.random). Cues are queued by the simulation
// (fighter._spdRedCues) and played by game.js as `spdred_<cue>` — presentation only, never read back by the sim.
//
// The brief's ten recipes: blink (bandpass noise sweep 600→3000 Hz in 60 ms + an arrival pop) · dodge chime (2.2 kHz,
// 40 ms) · impact (95 Hz thud + noise crack) · blaster (square 1800→700 Hz, 70 ms) · rapid fire (the blaster at 10/s
// with a hash-chosen detune per bolt) · Deltamax (saw 200→900 Hz over 400 ms, then a noise + saw blast) · Judgment
// (scanner sweep + two-tone siren blip) · GUILTY (square 160 Hz buzzer, 300 ms) · INNOCENT (two-note chime) ·
// containment (glassy rising sine with a hard stop). Every simulation cue maps onto one of them.

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
// Envelopes HOLD their level for `hold` of the duration, then release — so a sound lasts the length the brief names.
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 7, attack = 0.004, hold = 0.6 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.5))
  g.gain.setValueAtTime(gain, t0 + Math.max(Math.min(attack, dur * 0.5), dur * hold)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
// `hard` = a hard stop (gain held, then cut to silence in 4 ms) instead of an exponential tail.
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0, attack = 0, detune = 0, hard = false, lin = false, hold = 0.6 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.detune.value = detune
  o.frequency.setValueAtTime(freq, t0)
  if (freqEnd) { if (lin) o.frequency.linearRampToValueAtTime(freqEnd, t0 + dur); else o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur) }
  if (attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack) } else g.gain.setValueAtTime(gain, t0)
  if (hard) { g.gain.setValueAtTime(gain, t0 + dur - 0.004); g.gain.linearRampToValueAtTime(0, t0 + dur) }
  else { g.gain.setValueAtTime(gain, t0 + Math.max(attack, dur * hold)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}

// ── the brief's ten recipes ──
const blink = (ctx, out) => fnoise(ctx, out, { dur: 0.06, freq: 600, freqEnd: 3000, q: 2.2, gain: 0.3, seed: 211, attack: 0.006 })   // 600 → 3000 Hz in 60 ms
const pop = (ctx, out) => { tone(ctx, out, { freq: 980, freqEnd: 320, dur: 0.035, gain: 0.22 }); fnoise(ctx, out, { dur: 0.012, type: 'highpass', freq: 3000, gain: 0.12, seed: 223 }) }   // arrival pop
const dodge = (ctx, out) => tone(ctx, out, { freq: 2200, dur: 0.04, gain: 0.16 })   // 2.2 kHz, 40 ms
const impact = (ctx, out) => { tone(ctx, out, { freq: 95, freqEnd: 62, dur: 0.15, gain: 0.42, hold: 0.2 }); fnoise(ctx, out, { dur: 0.045, freq: 2600, q: 0.9, gain: 0.22, seed: 227, hold: 0.1 }) }   // 95 Hz thud + crack
const blaster = (ctx, out, detune = 0) => tone(ctx, out, { type: 'square', freq: 1800, freqEnd: 700, dur: 0.07, gain: 0.09, detune })   // 1800 → 700 Hz, 70 ms
// RAPID FIRE: one cue per bolt (rapid0 … rapid4), each the blaster with a hash-chosen detune in ±80 cents — the hash is
// of the bolt index alone, so the 5-shot burst is the same "melody" every time (deterministic, no Math.random).
const detuneOf = i => { let h = Math.imul((i | 0) + 0x9e37, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return Math.round(((h >>> 0) / 4294967296 - 0.5) * 160) }
const rapid = i => (ctx, out) => blaster(ctx, out, detuneOf(i))
const deltamaxCharge = (ctx, out) => tone(ctx, out, { type: 'sawtooth', freq: 200, freqEnd: 900, dur: 0.4, gain: 0.08, attack: 0.05, lin: true, hold: 0.88 })   // saw 200 → 900 Hz over 400 ms
const deltamaxBlast = (ctx, out) => {   // the beam: a noise + saw blast
  fnoise(ctx, out, { dur: 0.45, type: 'lowpass', freq: 3200, freqEnd: 600, q: 0.7, gain: 0.34, seed: 229, attack: 0.004, hold: 0.15 })
  tone(ctx, out, { type: 'sawtooth', freq: 180, freqEnd: 90, dur: 0.4, gain: 0.14, hold: 0.15 })
  tone(ctx, out, { freq: 60, freqEnd: 40, dur: 0.3, gain: 0.3, hold: 0.15 })
}
const judgment = (ctx, out) => {   // scanner sweep + a two-tone siren blip
  fnoise(ctx, out, { dur: 0.32, freq: 500, freqEnd: 4200, q: 6, gain: 0.16, seed: 233, attack: 0.02 })
  tone(ctx, out, { type: 'square', freq: 740, dur: 0.09, gain: 0.07, at: 0.34 })
  tone(ctx, out, { type: 'square', freq: 988, dur: 0.09, gain: 0.07, at: 0.44 })
}
const guilty = (ctx, out) => tone(ctx, out, { type: 'square', freq: 160, dur: 0.3, gain: 0.13, hard: true })   // 160 Hz buzzer, 300 ms
const innocent = (ctx, out) => { tone(ctx, out, { freq: 1046.5, dur: 0.16, gain: 0.14 }); tone(ctx, out, { freq: 1568, dur: 0.26, gain: 0.14, at: 0.12 }) }   // C6 → G6
const containment = (ctx, out) => {   // glassy rising sine, hard stop (+ a faint octave shimmer)
  tone(ctx, out, { freq: 620, freqEnd: 1860, dur: 0.38, gain: 0.13, attack: 0.03, hard: true })
  tone(ctx, out, { type: 'triangle', freq: 1240, freqEnd: 3720, dur: 0.38, gain: 0.04, attack: 0.03, hard: true })
}
// small supporting sounds built from the same recipes
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'lowpass', freq: 1500, freqEnd: 500, q: 0.8, gain: 0.18, seed: 239, attack: 0.02 })
const blocked = (ctx, out) => fnoise(ctx, out, { dur: 0.05, freq: 1700, q: 1.6, gain: 0.18, seed: 241 })

export const SPD_RED_SOUNDS = {
  spdred_blink: blink, spdred_blinkCancel: blink, spdred_phase: blink, spdred_blinkPop: pop,
  spdred_dodge: dodge, spdred_buff: (ctx, out) => tone(ctx, out, { freq: 2200, freqEnd: 2900, dur: 0.06, gain: 0.1 }),
  spdred_impact: impact, spdred_zap: (ctx, out) => { impact(ctx, out); fnoise(ctx, out, { dur: 0.06, type: 'highpass', freq: 4000, gain: 0.1, seed: 251 }) },
  spdred_blocked: blocked, spdred_swing: swing, spdred_swingLight: swing, spdred_flip: swing, spdred_jumpCancel: swing, spdred_special: swing,
  spdred_blaster: blaster, spdred_rapid: rapid(0), spdred_rapid0: rapid(0), spdred_rapid1: rapid(1), spdred_rapid2: rapid(2), spdred_rapid3: rapid(3), spdred_rapid4: rapid(4),
  spdred_rapidStart: (ctx, out) => tone(ctx, out, { type: 'square', freq: 1400, dur: 0.03, gain: 0.05 }),
  spdred_deltamaxCharge: deltamaxCharge, spdred_deltamax: deltamaxBlast,
  spdred_judge: judgment, spdred_guilty: guilty, spdred_innocent: innocent, spdred_contain: containment,
  spdred_release: (ctx, out) => fnoise(ctx, out, { dur: 0.18, type: 'highpass', freq: 3600, q: 0.6, gain: 0.14, seed: 257 }),   // the card cracks open
  spdred_superStart: judgment, spdred_super: (ctx, out) => { guilty(ctx, out); deltamaxCharge(ctx, out) },
}
// The ten recipe names (tests / docs).
export const SPD_RED_SOUND_RECIPES = { blink, pop, dodge, impact, blaster, rapid: rapid(0), deltamaxCharge, deltamaxBlast, judgment, guilty, innocent, containment }
export const spdRedRapidDetune = detuneOf
