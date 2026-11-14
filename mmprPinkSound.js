// mmprPinkSound.js — Pink Ranger + Thunder Megazord WebAudio SFX (no voice pack is supplied: SFX only, no dialogue).
// Spread into sound.js SOUNDS so every cue plays through SoundManager.play → the SFX master gain; the VOICE bus is never
// touched. Noise is a seeded LCG buffer: deterministic, no Math.random. The simulation queues cues on f._mmprPink.cues;
// mmprPinkFx.playMmprPinkCues plays them as `mmprpink_<cue>`. No looping cue exists (the draw tone fires once).
function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function fnoise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 11 }) {
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
// ── the brief's cues ──
const snap = (ctx, out) => { fnoise(ctx, out, { dur: 0.04, type: 'highpass', freq: 3200, gain: 0.22, seed: 401 }); tone(ctx, out, { type: 'triangle', freq: 220, freqEnd: 140, dur: 0.07, gain: 0.18 }) }   // crisp bow snap: string twang + click
const snapBig = (ctx, out) => { snap(ctx, out); tone(ctx, out, { type: 'triangle', freq: 330, freqEnd: 110, dur: 0.14, gain: 0.14, at: 0.01 }); fnoise(ctx, out, { dur: 0.12, freq: 1500, freqEnd: 600, gain: 0.1, seed: 403, at: 0.02 }) }
const creak = (ctx, out) => fnoise(ctx, out, { dur: 0.09, type: 'bandpass', freq: 600, freqEnd: 900, q: 4, gain: 0.06, seed: 405 })   // the draw begins (soft)
const rise = (ctx, out) => tone(ctx, out, { type: 'sine', freq: 520, freqEnd: 1040, dur: 0.12, gain: 0.08 })   // draw threshold: short rising tone, once
const chirp = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1600, dur: 0.035, gain: 0.05 }); tone(ctx, out, { type: 'square', freq: 2400, dur: 0.05, gain: 0.05, at: 0.045 }) }   // Spotter target-confirm
const radio = (ctx, out) => { fnoise(ctx, out, { dur: 0.05, type: 'bandpass', freq: 1800, q: 2, gain: 0.08, seed: 409 }); tone(ctx, out, { type: 'square', freq: 740, dur: 0.06, gain: 0.05, at: 0.05 }); tone(ctx, out, { type: 'square', freq: 990, dur: 0.07, gain: 0.05, at: 0.12 }) }   // brief radio acknowledgement
const buzz = (ctx, out) => tone(ctx, out, { type: 'square', freq: 180, dur: 0.09, gain: 0.06 })   // rejected (no pip / Energy / arrow already out)
const windup = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 90, freqEnd: 180, dur: 0.32, gain: 0.07 }); fnoise(ctx, out, { dur: 0.3, type: 'bandpass', freq: 2500, freqEnd: 5200, q: 6, gain: 0.04, seed: 411 }) }   // deliberate metallic wind-up
const slash = (ctx, out) => { fnoise(ctx, out, { dur: 0.16, type: 'bandpass', freq: 5000, freqEnd: 1200, q: 1.6, gain: 0.2, seed: 413 }); tone(ctx, out, { freq: 95, freqEnd: 55, dur: 0.14, gain: 0.3 }) }   // clean slash + weight
const clank = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 1250, dur: 0.08, gain: 0.08 }); fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 3000, gain: 0.12, seed: 417 }) }
const thread = (ctx, out) => { snap(ctx, out); tone(ctx, out, { freq: 1760, dur: 0.12, gain: 0.07, at: 0.05 }); tone(ctx, out, { type: 'triangle', freq: 2637, dur: 0.14, gain: 0.05, at: 0.09 }) }   // paired arrow + metallic chime
const whoosh = (ctx, out) => fnoise(ctx, out, { dur: 0.14, freq: 700, freqEnd: 2400, q: 1.2, gain: 0.09, seed: 419 })
const thud = (ctx, out) => { tone(ctx, out, { freq: 120, freqEnd: 64, dur: 0.1, gain: 0.32 }); fnoise(ctx, out, { dur: 0.03, freq: 2200, q: 0.8, gain: 0.16, seed: 421 }) }
const tension = (ctx, out) => { creak(ctx, out); tone(ctx, out, { type: 'sine', freq: 300, freqEnd: 900, dur: 0.45, gain: 0.07 }) }   // ultimate bow tension
const ultConfirm = (ctx, out) => { radio(ctx, out); windup(ctx, out) }   // answered by the Megazord's sword rise
const ultImpact = (ctx, out) => { slash(ctx, out); tone(ctx, out, { freq: 70, freqEnd: 34, dur: 0.4, gain: 0.5 }); fnoise(ctx, out, { dur: 0.32, type: 'lowpass', freq: 1800, freqEnd: 260, gain: 0.3, seed: 431 }) }

export const MMPR_PINK_SOUNDS = {
  mmprpink_swing: whoosh, mmprpink_impact: thud, mmprpink_crane: whoosh,
  mmprpink_bowDraw: creak, mmprpink_armed: rise, mmprpink_shot: snap, mmprpink_shotDrawn: snapBig, mmprpink_bowBreak: buzz,
  mmprpink_spot: chirp, mmprpink_spotDrawn: chirp, mmprpink_arrowBlocked: clank,
  mmprpink_call: radio, mmprpink_ready: chirp, mmprpink_reject: buzz, mmprpink_callCancel: buzz,
  mmprpink_commit_thunderLine: windup, mmprpink_commit_skySplitter: windup, mmprpink_commit_returningEdge: windup,
  mmprpink_swordHit: slash, mmprpink_skyHit: slash, mmprpink_swordBlock: clank,
  mmprpink_thread: thread, mmprpink_threadGo: whoosh,
  mmprpink_ultStart: tension, mmprpink_ultArrow: snapBig, mmprpink_ultMiss: buzz, mmprpink_ultConfirm: ultConfirm,
  mmprpink_ultLift: slash, mmprpink_ultArrowHit: thread, mmprpink_ultImpact: ultImpact,
}
export const MMPR_PINK_SOUND_RECIPES = { snap, snapBig, creak, rise, chirp, radio, buzz, windup, slash, clank, thread, whoosh, thud, tension, ultConfirm, ultImpact }
