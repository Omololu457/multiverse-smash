// ninjaStormSound.js — NINJA STORM RANGERS (MSv2) WebAudio SFX placeholders (no audio assets). Spread into sound.js
// SOUNDS (the shared pool: SoundManager.play → the SFX master gain, SFX mute respected; the voice bus is untouched).
// msv2r_* = Red stance (Shane: higher, airy), msv2y_* = Yellow stance (Dustin: lower, grittier) — the cue's stance is
// the stance in force when it plays. Noise = seeded LCG (no Math.random). Cues are queued by the sim (f._nsrCues) and
// played by playNinjaStormCues (game.js, right after the tick) — presentation only, never read back by the sim.
// The POOF family (one recipe, two lengths): Shadow Clone summon = a single poof · stance swap = a double-pulse poof.
import { SPD_RED_SOUNDS } from './spdRedSound.js'

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
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.006, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
// k = pitch factor (Red 1.0, Yellow 0.62), grit = extra low noise (Yellow)
function set(prefix, k, grit, seed) {
  const R = SPD_RED_SOUNDS
  const poof = (ctx, out, at = 0) => { fnoise(ctx, out, { dur: 0.1, type: 'lowpass', freq: 1300 * k, freqEnd: 260, q: 0.7, gain: 0.32, seed: seed + 2, at }); tone(ctx, out, { freq: 280 * k, freqEnd: 120 * k, dur: 0.08, gain: 0.12, at }) }
  const whoosh = (ctx, out) => { fnoise(ctx, out, { dur: 0.15, freq: 3600 * k, freqEnd: 700 * k, q: 1.6, gain: 0.28, seed }); if (grit) fnoise(ctx, out, { dur: 0.13, type: 'lowpass', freq: 380, gain: 0.16, seed: seed + 1 }) }
  const shimmer = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 880 * k, freqEnd: 1760 * k, dur: 0.22, gain: 0.08 }); tone(ctx, out, { type: 'triangle', freq: 1320 * k, freqEnd: 2640 * k, dur: 0.22, gain: 0.05, at: 0.05 }) }
  const rumble = (ctx, out) => { fnoise(ctx, out, { dur: 0.4, type: 'lowpass', freq: 220, gain: 0.32, seed: seed + 3 }); tone(ctx, out, { freq: 48, dur: 0.35, gain: 0.25 }) }
  const crack = (ctx, out) => { fnoise(ctx, out, { dur: 0.2, type: 'lowpass', freq: 2600, freqEnd: 200, q: 0.6, gain: 0.4, seed: seed + 4 }); tone(ctx, out, { freq: 80, freqEnd: 40, dur: 0.25, gain: 0.35 }) }
  const zap = (ctx, out) => tone(ctx, out, { type: 'square', freq: 2400 * k, freqEnd: 600 * k, dur: 0.12, gain: 0.08 })
  const thunk = (ctx, out) => { tone(ctx, out, { freq: 340 * k, freqEnd: 180 * k, dur: 0.05, gain: 0.18 }); fnoise(ctx, out, { dur: 0.03, freq: 3000, gain: 0.1, seed: seed + 5 }) }
  const drone = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 110 * k, freqEnd: 160 * k, dur: 0.5, gain: 0.07 }); fnoise(ctx, out, { dur: 0.5, freq: 900 * k, q: 3, gain: 0.12, seed: seed + 6 }) }
  const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'lowpass', freq: 1700 * k, freqEnd: 500, q: 0.8, gain: 0.18, seed: seed + 7 })
  const crackle = (ctx, out) => { for (let i = 0; i < 4; i++) tone(ctx, out, { type: 'square', freq: (1800 + 300 * i) * k, freqEnd: 500 * k, dur: 0.05, gain: 0.05, at: i * 0.06 }) }
  const map = {
    // ── the POOF family ──
    clone: (c, o) => poof(c, o),                                        // Shadow Clone summon: one poof
    stance: (c, o) => { poof(c, o); poof(c, o, 0.075) },                // stance swap: the double-pulse poof
    cloneCast: (c, o) => tone(c, o, { freq: 1320 * k, dur: 0.05, gain: 0.08 }),   // the hand sign before the poof
    swap: (c, o) => { poof(c, o); whoosh(c, o) },                        // Kawarimi: poof + whoosh
    // ── Vanish ──
    vanish: whoosh, vanishPop: (c, o) => poof(c, o), vanishCancel: whoosh, dodge: R.spdred_dodge, buff: (c, o) => tone(c, o, { type: 'triangle', freq: 1760 * k, dur: 0.08, gain: 0.07 }),
    // ── specials (one placeholder tone each) ──
    special: swing, swing, slash: R.spdred_zap, impact: R.spdred_impact, blocked: R.spdred_blocked, zap: R.spdred_zap, echo: (c, o) => { shimmer(c, o); R.spdred_impact(c, o) },
    wave: (c, o) => { swing(c, o); tone(c, o, { type: 'triangle', freq: 990, freqEnd: 330, dur: 0.18, gain: 0.07 }) },            // Crescent Wave
    boulder: (c, o) => { swing(c, o); tone(c, o, { type: 'sawtooth', freq: 140, freqEnd: 70, dur: 0.22, gain: 0.08 }) },         // Boulder Wave
    shuriken: thunk, aim: (c, o) => tone(c, o, { type: 'square', freq: 660 * k, dur: 0.04, gain: 0.05 }),
    lock: (c, o) => { tone(c, o, { type: 'square', freq: 1500 * k, dur: 0.05, gain: 0.07 }); tone(c, o, { type: 'square', freq: 1500 * k, dur: 0.05, gain: 0.07, at: 0.09 }) },   // reticle double-beep
    lockDrop: (c, o) => tone(c, o, { freq: 400 * k, freqEnd: 200 * k, dur: 0.08, gain: 0.06 }),
    beam: zap, quakeSlam: crack,
    // ── Modes ──
    modeCharge: (c, o) => { drone(c, o); crackle(c, o) }, modeOn: (c, o) => { crackle(c, o); shimmer(c, o) }, quakeOn: (c, o) => { rumble(c, o); crack(c, o) },
    modeOff: (c, o) => tone(c, o, { type: 'triangle', freq: 660 * k, freqEnd: 220 * k, dur: 0.25, gain: 0.06 }),
    // ── Ultimate ──
    ultStart: (c, o) => { shimmer(c, o); drone(c, o) }, ult: (c, o) => { crackle(c, o); drone(c, o) }, ultY: (c, o) => { rumble(c, o); drone(c, o) },
    burst: crack, twin: (c, o) => { crack(c, o); poof(c, o, 0.05) }, ultTick: R.spdred_impact, ultFinal: (c, o) => { crack(c, o); rumble(c, o) },
  }
  return Object.fromEntries(Object.entries(map).map(([n, fn]) => [prefix + n, fn]))
}
export const NINJA_STORM_SOUNDS = { ...set('msv2r_', 1.0, false, 701), ...set('msv2y_', 0.62, true, 733) }
