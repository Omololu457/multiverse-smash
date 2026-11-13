// arlongSound.js — Arlong WebAudio placeholder SFX (no audio assets). Spread into sound.js SOUNDS, so they play
// through SoundManager.play → the SFX master gain (SFX mute respected); the VOICE bus is never touched.
// Noise comes from a seeded LCG buffer (deterministic — no Math.random). Cues are queued by the simulation
// (fighter._arlongCues) and played by game.js as `arlong_<cue>` — presentation only, never read back by the sim.
//
// The brief's ten recipes: blade swing · blade hit · Fishman punch · bite · water-zone splash · standing-in-water
// lap · Shark On Darts · Gosenmaigawara Seiken · water shot · Super flood. Every simulation cue maps onto one.

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
// Filtered noise burst. `comb` (seconds) routes it through a feedback comb filter (a short delay looped back) —
// the serrated, ringing "saw-teeth" scrape.
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 7, attack = 0.008, comb = 0, fb = 0.6, lin = false }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.5))
  if (lin) g.gain.linearRampToValueAtTime(0, t0 + dur); else g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)   // lin = holds its body for the full length
  src.connect(f)
  if (comb) {
    const dl = ctx.createDelay(0.05), fbg = ctx.createGain()
    dl.delayTime.value = comb; fbg.gain.value = fb
    f.connect(dl); dl.connect(fbg); fbg.connect(dl); dl.connect(g); f.connect(g)
  } else f.connect(g)
  g.connect(out); src.start(t0); src.stop(t0 + dur + 0.05)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0, attack = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (attack) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + attack) } else g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur)
}

// ── the brief's ten recipes ──
const bladeSwing = (ctx, out) => fnoise(ctx, out, { dur: 0.12, type: 'lowpass', freq: 900, freqEnd: 300, q: 0.8, gain: 0.3, seed: 61, attack: 0.03, lin: true })   // heavy low whoosh, 120 ms
const bladeHit = (ctx, out) => fnoise(ctx, out, { dur: 0.16, type: 'bandpass', freq: 2600, freqEnd: 1500, q: 1.6, gain: 0.26, seed: 67, comb: 0.0045, fb: 0.72 })   // serrated metal scrape (comb)
const punch = (ctx, out) => { tone(ctx, out, { freq: 70, freqEnd: 52, dur: 0.16, gain: 0.42 }); fnoise(ctx, out, { dur: 0.04, freq: 2400, q: 0.9, gain: 0.22, seed: 71 }) }   // 70 Hz thud + crack
const bite = (ctx, out) => { fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 1800, q: 0.7, gain: 0.3, seed: 73, attack: 0.002 }); tone(ctx, out, { freq: 200, freqEnd: 120, dur: 0.09, gain: 0.32, at: 0.01 }) }   // wet snap + 200 Hz thump
const splash = (ctx, out) => fnoise(ctx, out, { dur: 0.28, type: 'bandpass', freq: 1200, freqEnd: 500, q: 0.6, gain: 0.3, seed: 79, attack: 0.003 })   // noise burst, fast decay
const lap = (ctx, out) => {   // standing in water: a very quiet low lap / ripple (re-queued every ~0.8 s while wet = a soft loop)
  fnoise(ctx, out, { dur: 0.7, type: 'lowpass', freq: 380, freqEnd: 260, q: 0.9, gain: 0.035, seed: 83, attack: 0.25 })
  tone(ctx, out, { freq: 330, freqEnd: 280, dur: 0.12, gain: 0.015, at: 0.3, attack: 0.03 })
}
const darts = (ctx, out) => {   // rising whoosh 300 → 900 Hz + bubbles
  fnoise(ctx, out, { dur: 0.42, type: 'bandpass', freq: 300, freqEnd: 900, q: 1.1, gain: 0.3, seed: 89, attack: 0.08 })
  for (let i = 0; i < 6; i++) tone(ctx, out, { freq: 600 + ((i * 337) % 500), freqEnd: 1100 + ((i * 211) % 600), dur: 0.04, gain: 0.06, at: 0.05 + i * 0.055 })
}
const seiken = (ctx, out) => {   // compressed 50 Hz boom + a water crack
  tone(ctx, out, { freq: 50, freqEnd: 34, dur: 0.45, gain: 0.5 }); tone(ctx, out, { type: 'triangle', freq: 100, freqEnd: 60, dur: 0.2, gain: 0.18 })
  fnoise(ctx, out, { dur: 0.09, type: 'highpass', freq: 2200, q: 0.8, gain: 0.3, seed: 97, at: 0.02, attack: 0.002 })
}
const shot = (ctx, out) => fnoise(ctx, out, { dur: 0.14, type: 'highpass', freq: 4200, freqEnd: 6000, q: 0.7, gain: 0.2, seed: 101, attack: 0.004 })   // high-pressure hiss
const flood = (ctx, out) => {   // the Super flood: a long low rumble building, then a wave crash
  fnoise(ctx, out, { dur: 1.6, type: 'lowpass', freq: 140, freqEnd: 420, q: 0.8, gain: 0.4, seed: 103, attack: 1.2 })
  tone(ctx, out, { freq: 38, freqEnd: 55, dur: 1.5, gain: 0.3, attack: 1.1 })
  fnoise(ctx, out, { dur: 0.9, type: 'bandpass', freq: 1500, freqEnd: 300, q: 0.5, gain: 0.42, seed: 107, at: 1.35, attack: 0.01 })
}

export const ARLONG_SOUNDS = {
  arlong_swing: bladeSwing, arlong_swingLight: (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'lowpass', freq: 1300, freqEnd: 500, q: 0.8, gain: 0.2, seed: 63, attack: 0.02 }),
  arlong_throw: bladeSwing, arlong_recall: bladeSwing, arlong_wave: (ctx, out) => { bladeSwing(ctx, out); splash(ctx, out) },
  arlong_bladeHit: bladeHit, arlong_plant: bladeHit, arlong_catch: bladeHit,
  arlong_punch: punch, arlong_dartsHit: punch, arlong_blocked: (ctx, out) => fnoise(ctx, out, { dur: 0.06, freq: 1600, q: 1.5, gain: 0.18, seed: 109 }),
  arlong_bite: bite, arlong_biteHit: bite, arlong_regrow: (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.08, gain: 0.05 }),
  arlong_splash: splash, arlong_waterIn: splash, arlong_swim: splash, arlong_surface: splash, arlong_pickup: splash,
  arlong_lap: lap,
  arlong_darts: darts,
  arlong_seiken: seiken, arlong_seikenHit: punch,
  arlong_shot: shot, arlong_shotHit: splash,
  arlong_flood: flood, arlong_superStart: splash, arlong_superSlam: (ctx, out) => { bladeHit(ctx, out); seiken(ctx, out) },
}
// The ten recipe names (tests / docs).
export const ARLONG_SOUND_RECIPES = { bladeSwing, bladeHit, punch, bite, splash, lap, darts, seiken, shot, flood }
