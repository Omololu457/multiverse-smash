// MSV1 — Ninja Storm Shane / Dustin WebAudio SFX placeholders (no audio pack supplied → synth only, SFX bus; the voice bus
// is never touched). Spread into sound.js SOUNDS; the sim queues cues on f._ninja.cues and nsWindFx.playNsWindCues plays
// them as nswind_hi_<cue> (Shane: higher, airier) or nswind_lo_<cue> (Dustin: lower, grittier). Noise = seeded LCG
// buffer (deterministic, no Math.random). The beam zap / impact / pop reuse S.P.D. Red's ranger recipes.
import { SPD_RED_SOUND_RECIPES as RR } from './spdRedSound.js'

function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.2, at = 0, seed = 7, reverse = false }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = noiseBuf(ctx, dur, seed); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (reverse) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  else { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.008, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.15, at = 0, reverse = false }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  if (reverse) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  else { g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
// voice: hi = Shane (air), lo = Dustin (earth: lower, grittier)
function bank(v) {
  const hi = v === 'hi', k = hi ? 1 : 0.55, grit = hi ? 1.2 : 3.5
  const whoosh = (ctx, out) => {   // the Streak: a sharp airy whoosh with a doppler drop
    fnoise(ctx, out, { dur: 0.22, type: 'bandpass', freq: 3800 * k, freqEnd: 700 * k, q: grit, gain: 0.22, seed: hi ? 101 : 202 })
    tone(ctx, out, { type: hi ? 'sine' : 'sawtooth', freq: 900 * k, freqEnd: 260 * k, dur: 0.2, gain: hi ? 0.05 : 0.04 })
  }
  const smoke = (ctx, out) => { fnoise(ctx, out, { dur: 0.28, type: 'lowpass', freq: 1800 * k, freqEnd: 300, q: 0.8, gain: 0.22, seed: 303 }); RR.pop?.(ctx, out) }
  const dpop = (ctx, out) => { smoke(ctx, out); fnoise(ctx, out, { dur: 0.16, type: 'lowpass', freq: 1500 * k, freqEnd: 300, gain: 0.18, at: 0.08, seed: 304 }) }
  const shimmer = (ctx, out, rev = false) => { tone(ctx, out, { type: 'triangle', freq: 880 * k, dur: 0.3, gain: 0.07, reverse: rev }); tone(ctx, out, { type: 'triangle', freq: 1320 * k, dur: 0.3, gain: 0.06, at: rev ? 0 : 0.06, reverse: rev }) }
  const hit = (ctx, out) => { RR.impact?.(ctx, out) || fnoise(ctx, out, { dur: 0.1, type: 'lowpass', freq: 900, gain: 0.3, seed: 9 }) }
  const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'bandpass', freq: 2400 * k, freqEnd: 900 * k, q: 1.4, gain: 0.12, seed: 55 })
  const blade = (ctx, out) => { swing(ctx, out); tone(ctx, out, { type: 'sine', freq: 2600, freqEnd: 1800, dur: 0.12, gain: 0.04 }) }
  const zap = (ctx, out) => RR.blaster ? RR.blaster(ctx, out) : tone(ctx, out, { type: 'square', freq: 1500, freqEnd: 400, dur: 0.12, gain: 0.07 })
  const thunk = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 300, freqEnd: 120, dur: 0.07, gain: 0.12 }); fnoise(ctx, out, { dur: 0.04, type: 'highpass', freq: 3000, gain: 0.08, seed: 66 }) }
  const drone = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 110 * (hi ? 1.6 : 1), freqEnd: 180 * (hi ? 1.6 : 1), dur: 0.55, gain: 0.05 }); fnoise(ctx, out, { dur: 0.55, type: 'bandpass', freq: 1200, freqEnd: 2400, q: 2, gain: 0.12, seed: 77 }) }
  const rumble = (ctx, out) => { fnoise(ctx, out, { dur: 0.45, type: 'lowpass', freq: 240, freqEnd: 120, q: 0.7, gain: 0.3, seed: 88 }); tone(ctx, out, { freq: 55, freqEnd: 40, dur: 0.4, gain: 0.18 }) }
  const crack = (ctx, out) => { fnoise(ctx, out, { dur: 0.14, type: 'highpass', freq: 1400, gain: 0.25, seed: 99 }); tone(ctx, out, { freq: 70, freqEnd: 35, dur: 0.3, gain: 0.25 }) }
  const click = (ctx, out) => tone(ctx, out, { type: 'square', freq: 2200, dur: 0.025, gain: 0.05 })
  const dome = (ctx, out) => { tone(ctx, out, { type: 'sine', freq: 600 * k, freqEnd: 1400 * k, dur: 0.18, gain: 0.08 }); fnoise(ctx, out, { dur: 0.25, type: 'highpass', freq: 4000, gain: 0.06, seed: 111 }) }
  const reject = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.06, gain: 0.05 })
  const rise = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 200 * k, freqEnd: 1200 * k, dur: 0.4, gain: 0.06 }); smoke(ctx, out) }
  return {
    reject, streak: whoosh, tremor: (c, o) => { rumble(c, o); whoosh(c, o) }, streakEnd: (c, o) => fnoise(c, o, { dur: 0.12, type: 'lowpass', freq: 900, gain: 0.08, seed: 12 }),
    strikeHit: hit, strikeBlocked: thunk, smokePop: smoke, smokeOut: smoke, clonePop: smoke, clonePopHit: dpop, cloneOut: smoke, cloneHit: hit,
    mirrorSplit: (c, o) => { smoke(c, o); shimmer(c, o) }, mirrorEnd: smoke, illusionPop: smoke, swap: dpop, echoHit: hit,
    illusionCounter: (c, o) => shimmer(c, o, true), counterHit: hit,
    dome, parry: (c, o) => tone(c, o, { type: 'sine', freq: 2200, dur: 0.08, gain: 0.1 }), reflect: (c, o) => { dome(c, o); zap(c, o) }, domeBlock: thunk, absorb: thunk,
    shockwave: crack, burrow: rumble, burrowHit: thunk, erupt: crack, trapSet: thunk, trapFire: (c, o) => { click(c, o); crack(c, o) },
    revPip: click, revSpend: (c, o) => tone(c, o, { type: 'sawtooth', freq: 140, freqEnd: 420, dur: 0.18, gain: 0.06 }),
    blade, cast: swing, swing, beam: zap, kunai: thunk, gale: (c, o) => { blade(c, o); fnoise(c, o, { dur: 0.3, type: 'bandpass', freq: 2000, freqEnd: 600, gain: 0.1, seed: 13 }) },
    tornado: drone, tornadoHit: hit, pound: crack,
    superStart: rise, ultStart: (c, o) => { rise(c, o); shimmer(c, o) }, seqConfirm: hit, seqHit: (c, o) => { whoosh(c, o); hit(c, o) }, seqMiss: reject, seqEnd: smoke,
    finisher: (c, o) => { hit(c, o); crack(c, o) }, cloneMissing: reject,
  }
}
export const NS_WIND_SOUNDS = Object.fromEntries(['hi', 'lo'].flatMap(v => Object.entries(bank(v)).map(([k, fn]) => [`nswind_${v}_${k}`, fn])))
