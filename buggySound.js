// buggySound.js — Buggy the Clown WebAudio placeholder SFX (no audio assets). Spread into sound.js SOUNDS, so they
// play through SoundManager.play → the SFX master gain (SFX mute respected); the VOICE bus is never touched.
// Noise comes from a seeded LCG buffer (deterministic — no Math.random). Cues are queued by the simulation
// (fighter._buggyCues) and played by game.js as `buggy_<cue>` — presentation only, never read back by the sim.
//
// Brief set: knife throw · knife hit · pop · reverse pop · slide whistle (1200→400 Hz, 200 ms) · cannon ·
// explosion · festival jingle · cape whoosh. Every simulation cue name maps onto one of those recipes.

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.4, gain = 0.25, at = 0, seed = 7 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.012, dur * 0.2))
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0, attack = 0, hold = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack) } else g.gain.setValueAtTime(gain, t0)
  if (hold) g.gain.setValueAtTime(gain, t0 + hold)   // sustain, then a short release (keeps the full audible length)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
}

// ── the brief's nine recipes ──
const knifeThrow = (ctx, out) => fnoise(ctx, out, { dur: 0.09, freq: 2200, freqEnd: 4200, q: 2.2, gain: 0.22, seed: 31 })
const knifeHit = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 1900, dur: 0.07, gain: 0.14 }); fnoise(ctx, out, { dur: 0.05, freq: 3000, q: 3, gain: 0.12, seed: 37 }) }
const pop = (ctx, out) => tone(ctx, out, { freq: 420, freqEnd: 900, dur: 0.06, gain: 0.26 })                 // a part detaching
const reversePop = (ctx, out) => tone(ctx, out, { freq: 900, freqEnd: 380, dur: 0.07, gain: 0.24 })          // a part snapping home
const slideWhistle = (ctx, out) => tone(ctx, out, { type: 'sine', freq: 1200, freqEnd: 400, dur: 0.2, gain: 0.2, attack: 0.01, hold: 0.17 })   // 1200→400 Hz, 200 ms
const cannon = (ctx, out) => { tone(ctx, out, { freq: 70, freqEnd: 38, dur: 0.28, gain: 0.4 }); fnoise(ctx, out, { dur: 0.18, type: 'lowpass', freq: 900, freqEnd: 200, q: 0.7, gain: 0.3, seed: 41 }) }
const explosion = (ctx, out) => { fnoise(ctx, out, { dur: 0.55, type: 'lowpass', freq: 1400, freqEnd: 120, q: 0.6, gain: 0.42, seed: 43 }); tone(ctx, out, { freq: 55, freqEnd: 30, dur: 0.5, gain: 0.35 }) }
const festivalJingle = (ctx, out) => {   // a little circus run: C E G C' E' (square, staccato)
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(ctx, out, { type: 'square', freq: f, dur: 0.09, gain: 0.07, at: i * 0.07 }))
}
const capeWhoosh = (ctx, out) => fnoise(ctx, out, { dur: 0.22, type: 'bandpass', freq: 500, freqEnd: 1600, q: 0.9, gain: 0.24, seed: 47 })

export const BUGGY_SOUNDS = {
  buggy_knifeThrow: knifeThrow, buggy_swing: knifeThrow, buggy_swingLight: knifeThrow,
  buggy_knifeHit: knifeHit, buggy_stab: knifeHit, buggy_partHit: knifeHit, buggy_chomp: knifeHit, buggy_partBlock: knifeHit,
  buggy_pop: pop, buggy_kick: pop,
  buggy_reversePop: reversePop, buggy_reverseTwo: (ctx, out) => { reversePop(ctx, out); tone(ctx, out, { freq: 900, freqEnd: 380, dur: 0.07, gain: 0.2, at: 0.08 }) },
  buggy_snapBack: (ctx, out) => { slideWhistle(ctx, out); tone(ctx, out, { freq: 900, freqEnd: 380, dur: 0.07, gain: 0.22, at: 0.2 }) },   // broken part flies home
  buggy_nullify: (ctx, out) => { slideWhistle(ctx, out); pop(ctx, out) },   // the blade passes through — comedic whistle
  buggy_stagger: slideWhistle,
  buggy_cannon: cannon, buggy_cannonHit: cannon, buggy_cannonRoll: (ctx, out) => { fnoise(ctx, out, { dur: 0.4, type: 'lowpass', freq: 220, q: 0.7, gain: 0.25, seed: 53 }); cannon(ctx, out) },
  buggy_explosion: explosion, buggy_boom: explosion,
  buggy_festival: festivalJingle, buggy_superStart: festivalJingle,
  buggy_cape: capeWhoosh,
}
// The nine recipe names (tests / docs).
export const BUGGY_SOUND_RECIPES = { knifeThrow, knifeHit, pop, reversePop, slideWhistle, cannon, explosion, festivalJingle, capeWhoosh }
