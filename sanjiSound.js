// sanjiSound.js — Sanji WebAudio placeholder SFX (no audio assets). Spread into sound.js SOUNDS, so they play through
// SoundManager.play → the SFX master gain (SFX mute respected); the VOICE bus is never touched. Noise comes from a
// seeded LCG buffer and the fire-crackle burst pattern from an integer hash (deterministic — no Math.random). Cues are
// queued by the simulation (fighter._sanjiCues) and played by game.js as `sanji_<cue>` — presentation only, never read
// back by the sim.
//
// Brief set: kick whoosh (90 ms bandpass, pitch rises with kick strength) · kick impact (90 Hz thud + noise crack) ·
// Diable Jambe ignite (friction hiss 400→2500 Hz over 600 ms → low whoomph) · burning impact (thud + hashed crackle) ·
// Sky Walk air-pop (50 ms, a little higher each use) · Plate Kick clink (two sine pings) · Course step chime (one
// semitone higher per step, quiet) · Course complete fanfare (3 notes) · Premier Hachis thuds (8 per second).

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.4, gain = 0.25, at = 0, seed = 7, attack = 0, hold = 0 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + (attack || Math.min(0.012, dur * 0.2)))
  if (hold) g.gain.setValueAtTime(gain, t0 + hold)   // sustain, then a short release (keeps the full audible length)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0, attack = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack) } else g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
}
// Integer hash → [0,1) (crackle burst timing / pitch; deterministic).
const hh = (i, k) => { let h = Math.imul(i + 1, 374761393) ^ Math.imul(k + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// ── the brief's recipes ──
const WHOOSH = { 1: [900, 1600], 2: [1250, 2300], 3: [1650, 3100] }   // pitch rises with kick strength
const whoosh = tier => (ctx, out) => fnoise(ctx, out, { dur: 0.09, freq: WHOOSH[tier][0], freqEnd: WHOOSH[tier][1], q: 1.8, gain: 0.2 + tier * 0.03, seed: 11 + tier, hold: 0.07 })
const impact = (ctx, out) => {   // 90 Hz thud + a noise crack
  tone(ctx, out, { freq: 90, freqEnd: 55, dur: 0.14, gain: 0.42 })
  fnoise(ctx, out, { dur: 0.045, type: 'highpass', freq: 2600, q: 0.8, gain: 0.22, seed: 17 })
}
const ignite = (ctx, out) => {   // rising friction hiss 400 → 2500 Hz over 600 ms, ending in a low whoomph
  fnoise(ctx, out, { dur: 0.6, freq: 400, freqEnd: 2500, q: 2.2, gain: 0.22, seed: 19, attack: 0.5 })
  fnoise(ctx, out, { dur: 0.32, type: 'lowpass', freq: 600, freqEnd: 120, q: 0.7, gain: 0.34, at: 0.58, seed: 23 })
  tone(ctx, out, { freq: 80, freqEnd: 42, dur: 0.3, gain: 0.32, at: 0.58 })
}
const crackle = (ctx, out, n = 6, at = 0.02) => {   // short filtered noise bursts at hash-chosen offsets / pitches
  for (let i = 0; i < n; i++) fnoise(ctx, out, { dur: 0.018 + 0.02 * hh(i, 2), freq: 2200 + 3200 * hh(i, 3), q: 4, gain: 0.08 + 0.06 * hh(i, 4), at: at + 0.28 * hh(i, 1), seed: 29 + i })
}
const burnImpact = (ctx, out) => { impact(ctx, out); crackle(ctx, out) }
const skyPop = n => (ctx, out) => {   // 50 ms air-pop, a little higher per use
  const f = 520 * Math.pow(1.12, n - 1)
  tone(ctx, out, { freq: f, freqEnd: f * 1.7, dur: 0.05, gain: 0.26 })
  fnoise(ctx, out, { dur: 0.04, freq: 1400, q: 1, gain: 0.08, seed: 31 })
}
const plateClink = (ctx, out) => {   // a light ceramic clink: two short sine pings
  tone(ctx, out, { freq: 2350, dur: 0.07, gain: 0.12 })
  tone(ctx, out, { freq: 3120, dur: 0.08, gain: 0.1, at: 0.055 })
}
const courseChime = k => (ctx, out) => {   // rising chime, one semitone per step — audible but quiet
  const f = 880 * Math.pow(2, (k - 1) / 12)
  tone(ctx, out, { freq: f, dur: 0.28, gain: 0.075, attack: 0.006 })
  tone(ctx, out, { type: 'triangle', freq: f * 2, dur: 0.18, gain: 0.025, attack: 0.006 })
}
const fanfare = (ctx, out) => {   // Course complete: three notes, up a major triad
  [[1047, 0, 0.12], [1319, 0.11, 0.12], [1568, 0.22, 0.3]].forEach(([f, at, d]) => {
    tone(ctx, out, { type: 'triangle', freq: f, dur: d, gain: 0.11, at, attack: 0.008 })
    tone(ctx, out, { freq: f / 2, dur: d, gain: 0.05, at })
  })
}
const hachis = (ctx, out) => {   // rapid thud sequence at 8 per second across the kicks (one cue starts the run)
  for (let i = 0; i < 6; i++) {
    tone(ctx, out, { freq: 120 - i * 4, freqEnd: 70, dur: 0.07, gain: 0.3, at: i * 0.125 })
    fnoise(ctx, out, { dur: 0.03, type: 'highpass', freq: 2000, q: 0.8, gain: 0.08, at: i * 0.125, seed: 37 + i })
  }
}
// supporting cues (built from the same parts)
const douse = (ctx, out) => fnoise(ctx, out, { dur: 0.32, type: 'lowpass', freq: 1400, freqEnd: 180, q: 0.8, gain: 0.18, seed: 41 })
const stomp = (ctx, out) => { tone(ctx, out, { freq: 70, freqEnd: 38, dur: 0.22, gain: 0.45 }); fnoise(ctx, out, { dur: 0.16, type: 'lowpass', freq: 700, freqEnd: 150, q: 0.7, gain: 0.26, seed: 43 }) }
const drop = (ctx, out) => { tone(ctx, out, { freq: 660, dur: 0.1, gain: 0.06 }); tone(ctx, out, { freq: 523, dur: 0.16, gain: 0.06, at: 0.09 }) }
const lost = (ctx, out) => tone(ctx, out, { freq: 330, freqEnd: 247, dur: 0.22, gain: 0.05 })
const superStart = (ctx, out) => { whoosh(3)(ctx, out); fnoise(ctx, out, { dur: 0.45, freq: 500, freqEnd: 2600, q: 1.6, gain: 0.18, seed: 47, attack: 0.3 }) }
const superFinish = (ctx, out) => { impact(ctx, out); stomp(ctx, out); crackle(ctx, out, 8, 0.05); fanfare(ctx, out) }

export const SANJI_SOUNDS = {
  sanji_whoosh1: whoosh(1), sanji_whoosh2: whoosh(2), sanji_whoosh3: whoosh(3),
  sanji_impact: impact, sanji_burnImpact: burnImpact,
  sanji_spin: ignite, sanji_ignite: (ctx, out) => crackle(ctx, out, 4, 0), sanji_douse: douse,
  sanji_skywalk1: skyPop(1), sanji_skywalk2: skyPop(2),
  sanji_plate: plateClink, sanji_plateHit: (ctx, out) => { plateClink(ctx, out); impact(ctx, out) },
  sanji_course1: courseChime(1), sanji_course2: courseChime(2), sanji_course3: courseChime(3),
  sanji_course4: courseChime(4), sanji_course5: courseChime(5), sanji_course6: courseChime(6),
  sanji_courseDone: fanfare, sanji_courseDrop: drop, sanji_courseLost: lost,
  sanji_hachis: hachis, sanji_stomp: stomp, sanji_super: superStart, sanji_superFinish: superFinish,
}
// The brief's nine recipes (tests / docs).
export const SANJI_SOUND_RECIPES = { whoosh1: whoosh(1), whoosh3: whoosh(3), impact, ignite, burnImpact, skyPop1: skyPop(1), skyPop2: skyPop(2),
  plateClink, course1: courseChime(1), course6: courseChime(6), fanfare, hachis }
