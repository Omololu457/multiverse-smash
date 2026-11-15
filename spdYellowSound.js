// spdYellowSound.js — S.P.D. Yellow WebAudio SFX placeholders (no audio pack and no voice pack supplied → no dialogue).
// Spread into sound.js SOUNDS, so every cue plays through SoundManager.play → the SFX master gain; the VOICE bus is never
// touched. Noise is a seeded LCG buffer: deterministic, no Math.random. The simulation queues cues on f._spdYellow.cues;
// spdYellowFx.playSpdYellowCues plays them as `spdyellow_<cue>`. Ninja Megazord sounds reuse White's recipes (same Zord).
import { MMPR_WHITE_SOUND_RECIPES as WR } from './mmprWhiteSound.js'
import { MMPR_BLACK_SOUND_RECIPES as BR } from './mmprBlackSound.js'

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
// firearms: compact pistol = short bright zap; long gun = charge rise at the draw threshold + a heavy low discharge
const pistol = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1600, freqEnd: 500, dur: 0.07, gain: 0.07 }); fnoise(ctx, out, { dur: 0.05, type: 'highpass', freq: 2500, gain: 0.08, seed: 501 }) }
const draw = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 420, dur: 0.04, gain: 0.04 })
const longDraw = (ctx, out) => { tone(ctx, out, { type: 'sawtooth', freq: 140, freqEnd: 420, dur: 0.28, gain: 0.05 }); fnoise(ctx, out, { dur: 0.25, freq: 400, freqEnd: 2000, q: 3, gain: 0.05, seed: 503 }) }
const longFire = (ctx, out) => { tone(ctx, out, { freq: 90, freqEnd: 40, dur: 0.3, gain: 0.4 }); tone(ctx, out, { type: 'square', freq: 900, freqEnd: 180, dur: 0.18, gain: 0.08 }); fnoise(ctx, out, { dur: 0.25, type: 'lowpass', freq: 3000, freqEnd: 300, gain: 0.25, seed: 509 }) }
const shotHit = (ctx, out) => fnoise(ctx, out, { dur: 0.06, freq: 1800, q: 2, gain: 0.12, seed: 511 })
const longHit = (ctx, out) => { BR.crack(ctx, out); tone(ctx, out, { freq: 70, freqEnd: 40, dur: 0.18, gain: 0.3 }) }
const blocked = (ctx, out) => tone(ctx, out, { type: 'square', freq: 260, freqEnd: 200, dur: 0.05, gain: 0.05 })
const fail = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 300, freqEnd: 200, dur: 0.12, gain: 0.04 })
// duplicate: a doubled shimmer (two detuned rising tones) in / a falling pair out / a dry pop when struck
const split = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 660, freqEnd: 990, dur: 0.16, gain: 0.05 }); tone(ctx, out, { type: 'triangle', freq: 668, freqEnd: 1002, dur: 0.16, gain: 0.04, at: 0.03 }) }
const out_ = (ctx, out) => { tone(ctx, out, { type: 'triangle', freq: 990, freqEnd: 600, dur: 0.14, gain: 0.04 }); tone(ctx, out, { type: 'triangle', freq: 1002, freqEnd: 610, dur: 0.14, gain: 0.03, at: 0.03 }) }
const pop = (ctx, out) => { fnoise(ctx, out, { dur: 0.08, freq: 1200, q: 0.8, gain: 0.12, seed: 521 }); tone(ctx, out, { freq: 300, freqEnd: 120, dur: 0.1, gain: 0.08 }) }
const echo = (ctx, out) => { tone(ctx, out, { type: 'sine', freq: 880, dur: 0.05, gain: 0.05 }); tone(ctx, out, { type: 'sine', freq: 880, dur: 0.05, gain: 0.03, at: 0.08 }) }
const swap = (ctx, out) => { fnoise(ctx, out, { dur: 0.12, freq: 3000, freqEnd: 600, q: 2, gain: 0.08, seed: 523 }); fnoise(ctx, out, { dur: 0.12, freq: 600, freqEnd: 3000, q: 2, gain: 0.08, seed: 527, at: 0.05 }) }
const swing = (ctx, out) => fnoise(ctx, out, { dur: 0.07, freq: 900, freqEnd: 2600, q: 1.4, gain: 0.08, seed: 531 })
const blade = (ctx, out) => { fnoise(ctx, out, { dur: 0.08, type: 'highpass', freq: 3200, freqEnd: 7000, gain: 0.08, seed: 533 }); tone(ctx, out, { freq: 2600, freqEnd: 3200, dur: 0.09, gain: 0.03 }) }
// Tactical Coins: one bright clink per coin; spend = two quick clinks downward; cycle reset = a soft rising chime
const coin = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 1976, dur: 0.05, gain: 0.04 }); tone(ctx, out, { type: 'square', freq: 2637, dur: 0.12, gain: 0.04, at: 0.05 }) }
const coinSpend = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 2637, dur: 0.05, gain: 0.04 }); tone(ctx, out, { type: 'square', freq: 1760, dur: 0.08, gain: 0.04, at: 0.05 }) }
const cap = (ctx, out) => tone(ctx, out, { type: 'triangle', freq: 1320, dur: 0.05, gain: 0.025 })
const cycle = (ctx, out) => { [880, 1108, 1318].forEach((fq, i) => tone(ctx, out, { type: 'triangle', freq: fq, dur: 0.07, gain: 0.03, at: i * 0.05 })) }
// command stance: soft radio open / tick / close
const stanceOpen = (ctx, out) => { tone(ctx, out, { type: 'square', freq: 520, dur: 0.04, gain: 0.04 }); tone(ctx, out, { type: 'square', freq: 780, dur: 0.05, gain: 0.04, at: 0.05 }) }
const tick = (ctx, out) => tone(ctx, out, { type: 'square', freq: 1100, dur: 0.025, gain: 0.03 })
const stanceClose = (ctx, out) => tone(ctx, out, { type: 'square', freq: 520, freqEnd: 400, dur: 0.06, gain: 0.03 })
const confirm = (ctx, out) => { WR.order(ctx, out) }
const relay = (ctx, out) => { swap(ctx, out); tone(ctx, out, { type: 'sine', freq: 1400, dur: 0.06, gain: 0.05, at: 0.08 }) }

export const SPD_YELLOW_SOUNDS = {
  spdyellow_swing: swing, spdyellow_blade: blade, spdyellow_reject: fail,
  spdyellow_draw: draw, spdyellow_pistolFire: pistol, spdyellow_longDraw: longDraw, spdyellow_longFire: longFire, spdyellow_longFail: fail,
  spdyellow_shotHit: shotHit, spdyellow_longHit: longHit, spdyellow_shotBlocked: blocked, spdyellow_gunBreak: fail,
  spdyellow_split: split, spdyellow_cloneIn: split, spdyellow_cloneOut: out_, spdyellow_clonePop: pop,
  spdyellow_echo: echo, spdyellow_echoHit: (ctx, out) => { echo(ctx, out); BR.thud(ctx, out) }, spdyellow_echoBlocked: blocked,
  spdyellow_swapGo: swing, spdyellow_swap: swap, spdyellow_swapFail: fail, spdyellow_relay: relay, spdyellow_break: blade,
  spdyellow_coinEarn: coin, spdyellow_coinSpend: coinSpend, spdyellow_coinCap: cap, spdyellow_cycleReset: cycle,
  spdyellow_stanceOpen: stanceOpen, spdyellow_select: tick, spdyellow_stanceClose: stanceClose,
  spdyellow_order_cover: confirm, spdyellow_order_crosswire: confirm, spdyellow_order_breach: confirm, spdyellow_order_rising: confirm, spdyellow_order_showcase: tick,
  spdyellow_breachArmed: longDraw, spdyellow_breachOpen: (ctx, out) => tone(ctx, out, { type: 'sine', freq: 1500, dur: 0.06, gain: 0.06 }), spdyellow_breachExpire: stanceClose,
  spdyellow_call: WR.order, spdyellow_ready: (ctx, out) => tone(ctx, out, { type: 'sine', freq: 1200, dur: 0.05, gain: 0.05 }),
  spdyellow_commit_yIntercept: (ctx, out) => tone(ctx, out, { freq: 55, freqEnd: 40, dur: 0.14, gain: 0.25 }),
  spdyellow_commit_yRising: (ctx, out) => tone(ctx, out, { freq: 55, freqEnd: 40, dur: 0.14, gain: 0.25 }),
  spdyellow_commit_ySword: WR.edgeDraw, spdyellow_zordPunch: WR.zordPunch, spdyellow_kickHit: WR.kickHit, spdyellow_swordHit: WR.edgeHit, spdyellow_zordBlock: blocked,
  spdyellow_ultStart: draw, spdyellow_ultConfirm: (ctx, out) => { WR.order(ctx, out); split(ctx, out) }, spdyellow_ultShowcase: (ctx, out) => { WR.order(ctx, out); split(ctx, out); coin(ctx, out) },
  spdyellow_ultMiss: fail,
}
