// mmprWhiteSound.js — White Ranger + Ninja Megazord WebAudio SFX placeholders (no audio pack exists for either; no voice
// pack supplied → no synthesized dialogue). Spread into sound.js SOUNDS, so every cue plays through SoundManager.play →
// the SFX master gain; the VOICE bus is never touched. Noise is a seeded LCG buffer: deterministic, no Math.random.
// The simulation queues cues on f._mmprWhite.cues; mmprWhiteFx.playMmprWhiteCues plays them as `mmprwhite_<cue>`.
import { MMPR_BLACK_SOUND_RECIPES } from './mmprBlackSound.js'
const R = MMPR_BLACK_SOUND_RECIPES   // shared martial thud / crack recipes (same ranger family)

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
// discipline acknowledgements: three distinct quiet single notes (hand = low soft, foot = mid tick, blade = high glint)
const discHand = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 523, dur: 0.09, gain: 0.05 })
const discFoot = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 659, dur: 0.09, gain: 0.05 })
const discBlade = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 784, dur: 0.1, gain: 0.05 })
// Formation complete: three-note resolution (C-E-G → C')
const formation = (ctx, out) => { [523, 659, 784].forEach((fq, i) => tone(ctx, out, { type: 'triangle', freq: fq, dur: 0.12, gain: 0.07, at: i * 0.07 })); tone(ctx, out, { freq: 1046, dur: 0.25, gain: 0.06, at: 0.21 }) }
// Saba: short clean metallic movement
const saba = (ctx, out) => { fnoise(ctx, out, { dur: 0.09, type: 'highpass', freq: 3000, freqEnd: 7000, gain: 0.1, seed: 401 }); tone(ctx, out, { type: 'sine', freq: 2400, freqEnd: 3100, dur: 0.12, gain: 0.04 }) }
// Megazord punch: heavy mechanical impact (low thump + servo grind + clank)
const zordPunch = (ctx, out) => { tone(ctx, out, { freq: 70, freqEnd: 38, dur: 0.22, gain: 0.45 }); fnoise(ctx, out, { dur: 0.12, type: 'bandpass', freq: 900, q: 3, gain: 0.18, seed: 409 }); tone(ctx, out, { type: 'square', freq: 220, freqEnd: 140, dur: 0.06, gain: 0.05, at: 0.02 }) }
// Kick: brisk sweep and contact
const kickHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.07, freq: 700, freqEnd: 2600, q: 1.1, gain: 0.1, seed: 419 }); R.thud(ctx, out) }
// Sword: slower rising tension and a decisive strike
const edgeDraw = (ctx, out) => { fnoise(ctx, out, { dur: 0.45, type: 'bandpass', freq: 300, freqEnd: 2400, q: 4, gain: 0.07, seed: 421 }); tone(ctx, out, { type: 'sawtooth', freq: 110, freqEnd: 220, dur: 0.45, gain: 0.03 }) }
const edgeHit = (ctx, out) => { fnoise(ctx, out, { dur: 0.14, type: 'highpass', freq: 2500, freqEnd: 600, gain: 0.2, seed: 431 }); tone(ctx, out, { freq: 90, freqEnd: 45, dur: 0.25, gain: 0.35 }) }
// orders / readiness (radio-like acknowledgement, kept distinct from Black's two-note radio)
const order = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 660, dur: 0.05, gain: 0.05 }); tone(ctx, out, { type: 'square', freq: 990, dur: 0.05, gain: 0.05, at: 0.06 }); tone(ctx, out, { type: 'square', freq: 1320, dur: 0.06, gain: 0.05, at: 0.12 }) }
const step = (ctx, out) => tone(ctx, out, { freq: 55, freqEnd: 40, dur: 0.14, gain: 0.25 })
// Leader's Return: brief readable confirmation (two quick rising blips) / offer: one soft blip
const leaderOffer = (ctx, out) => tone(ctx, out, { type: 'sine', freq: 1200, dur: 0.05, gain: 0.05 })
const leaderGo = (ctx, out) => { tone(ctx, out, { type: 'sine', freq: 1200, dur: 0.05, gain: 0.07 }); tone(ctx, out, { type: 'sine', freq: 1800, dur: 0.07, gain: 0.07, at: 0.05 }) }
// Ultimate: hand / foot / blade rhythm resolving into the finishing slash
const ultConfirm = (ctx, out) => { order(ctx, out); step(ctx, out) }
const ultRhythm = (ctx, out) => { discHand(ctx, out); tone(ctx, out, { type: 'triangle', freq: 659, dur: 0.09, gain: 0.05, at: 0.12 }); tone(ctx, out, { type: 'triangle', freq: 784, dur: 0.1, gain: 0.05, at: 0.24 }) }
const ultFinal = (ctx, out) => { edgeHit(ctx, out); tone(ctx, out, { freq: 1046, dur: 0.3, gain: 0.06, at: 0.05 }); fnoise(ctx, out, { dur: 0.35, type: 'lowpass', freq: 1800, freqEnd: 250, gain: 0.3, seed: 443 }) }
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.07, freq: 900, freqEnd: 2600, q: 1.4, gain: 0.08, seed: 449 })
const soft = (ctx, out) => tone(ctx, out, { type: 'sine', freq: 330, freqEnd: 260, dur: 0.08, gain: 0.03 })

export const MMPR_WHITE_SOUNDS = {
  mmprwhite_swing: swing, mmprwhite_special: swing, mmprwhite_saba: saba, mmprwhite_feint: soft,
  mmprwhite_disc_hand: discHand, mmprwhite_disc_foot: discFoot, mmprwhite_disc_blade: discBlade, mmprwhite_formation: formation,
  mmprwhite_collBreak: soft, mmprwhite_collExpire: soft, mmprwhite_tokenExpire: soft,
  mmprwhite_call: order, mmprwhite_order: order, mmprwhite_ready: leaderOffer,
  mmprwhite_commit_ninjaTwinFist: step, mmprwhite_commit_ninjaCraneRise: step, mmprwhite_commit_ninjaEdge: edgeDraw,
  mmprwhite_zordPunch: zordPunch, mmprwhite_kickHit: kickHit, mmprwhite_edgeHit: edgeHit,
  mmprwhite_offer: leaderOffer, mmprwhite_accept: order, mmprwhite_leaderOffer: leaderOffer, mmprwhite_leaderGo: leaderGo,
  mmprwhite_ultStart: saba, mmprwhite_ultConfirm: ultConfirm, mmprwhite_ultRhythm: ultRhythm, mmprwhite_ultFinal: ultFinal, mmprwhite_ultMiss: swing,
}
export const MMPR_WHITE_SOUND_RECIPES = { discHand, discFoot, discBlade, formation, saba, zordPunch, kickHit, edgeDraw, edgeHit, order, leaderGo, ultRhythm, ultFinal }
