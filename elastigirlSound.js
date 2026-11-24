// elastigirlSound.js — Elastigirl WebAudio SFX (synthesized; no audio pack supplied). Spread into sound.js SOUNDS so every
// cue plays through SoundManager.play → the SFX master gain (voice bus untouched). The sim queues cue names on
// f._elastigirl.cues; elastigirlFx.playElastigirlCues plays them as `elastigirl_<cue>` after setting the variation seed
// = hash(match seed, frame, player index, cue index). Pitch varies ±3 % from that hash and every noise buffer is an LCG
// seeded from it — no Math.random, and nothing here is game state (render / audio only).
let SEED = 1
export function setElastigirlSfxSeed(h) { SEED = (h >>> 0) || 1 }
const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0 }
export const elastigirlSfxHash = (seed, frame, player, i = 0) => hash(hash(seed, frame), player * 977 + i)
export const pitchOf = s => 1 + ((s % 6001) / 6000 * 0.06 - 0.03)          // ±3 %
const P = () => pitchOf(SEED)
function noiseBuf(ctx, dur, seed) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  return buf
}
function env(g, t0, dur, gain, attack = 0.006, hold = 0.5) {
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur * 0.4))
  g.gain.setValueAtTime(gain, t0 + dur * hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.15, at = 0, vib = 0, vibDepth = 0, trem = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain(), p = P()
  o.type = type; o.frequency.setValueAtTime(freq * p, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd * p, t0 + dur)
  env(g, t0, dur, gain)
  let lfo = null
  if (vib || trem) {                               // vibrato (frequency LFO) / tremolo (gain LFO)
    lfo = ctx.createOscillator(); const lg = ctx.createGain(); lfo.frequency.value = vib || trem
    lg.gain.value = vib ? vibDepth : gain * 0.5; lfo.connect(lg)
    if (vib) lg.connect(o.frequency); else { const tg = ctx.createGain(); tg.gain.value = 1; lg.connect(tg.gain); o.connect(tg); tg.connect(g) }
    lfo.start(t0); lfo.stop(t0 + dur + 0.02)
  }
  if (!trem) o.connect(g)
  g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
function noise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.2, at = 0, k = 0, swell = false, hold = 0.5 }) {
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = P()
  src.buffer = noiseBuf(ctx, dur, hash(SEED, k + 1)); f.type = type; f.Q.value = q
  f.frequency.setValueAtTime(freq * p, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd * p, t0 + dur)
  if (swell) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur) }
  else env(g, t0, dur, gain, 0.006, hold)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
// the brief's six signature sounds (exact synthesis recipes) + small utility cues
export const RECIPES = {
  stretch: { osc: 'sawtooth', from: 200, to: 500, vibratoHz: 14, dur: 0.25 },
  snap: { osc: 'triangle', from: 900, to: 300, dur: 0.12 },
  whirl: { noise: 'bandpass', sweep: [700, 1400], centre: 1000, dur: 0.35 },
  parachute: { osc: 'sine', from: 400, to: 250, flutter: true, dur: 0.6 },
  whip: { osc: 'square', click: 2000, noise: true, dur: 0.06 },
  raft: { noise: 'lowpass', dur: 1.0, swell: { osc: 'sine', freq: 110 } },
}
const S = {
  stretch: (c, o) => tone(c, o, { type: 'sawtooth', freq: 200, freqEnd: 500, dur: 0.25, gain: 0.06, vib: 14, vibDepth: 18 }),
  snap: (c, o) => tone(c, o, { type: 'triangle', freq: 900, freqEnd: 300, dur: 0.12, gain: 0.12 }),
  whirl: (c, o) => noise(c, o, { dur: 0.35, type: 'bandpass', freq: 700, freqEnd: 1400, q: 2.2, gain: 0.24, k: 3, hold: 0.8 }),
  parachute: (c, o) => tone(c, o, { type: 'sine', freq: 400, freqEnd: 250, dur: 0.6, gain: 0.1, trem: 11 }),
  whip: (c, o) => { tone(c, o, { type: 'square', freq: 2000, dur: 0.02, gain: 0.07 }); noise(c, o, { dur: 0.06, type: 'highpass', freq: 2500, gain: 0.14, k: 5 }) },
  raft: (c, o) => { noise(c, o, { dur: 1.0, type: 'lowpass', freq: 500, freqEnd: 1400, q: 0.7, gain: 0.2, k: 7, swell: true }); tone(c, o, { type: 'sine', freq: 110, freqEnd: 130, dur: 1.0, gain: 0.14 }) },
  // utility cues (same synthesis family)
  swing: (c, o) => noise(c, o, { dur: 0.07, freq: 900, freqEnd: 2200, q: 1.4, gain: 0.07, k: 11 }),
  whipWind: (c, o) => S.stretch(c, o), special: (c, o) => S.stretch(c, o), ult: (c, o) => S.stretch(c, o),
  splash: (c, o) => noise(c, o, { dur: 0.25, type: 'lowpass', freq: 1800, freqEnd: 400, q: 0.8, gain: 0.14, k: 13 }),
  raftEnd: (c, o) => S.splash(c, o),
  slam: (c, o) => noise(c, o, { dur: 0.18, type: 'lowpass', freq: 900, freqEnd: 120, q: 0.8, gain: 0.16, k: 17 }),
  thud: (c, o) => { tone(c, o, { type: 'triangle', freq: 160, freqEnd: 70, dur: 0.1, gain: 0.16 }); noise(c, o, { dur: 0.05, type: 'lowpass', freq: 900, gain: 0.1, k: 19 }) },
  bounce: (c, o) => tone(c, o, { type: 'sine', freq: 300, freqEnd: 700, dur: 0.16, gain: 0.08, vib: 14, vibDepth: 30 }),
  parry: (c, o) => { S.snap(c, o); tone(c, o, { type: 'triangle', freq: 1320, dur: 0.08, gain: 0.05, at: 0.05 }) },
  land: (c, o) => noise(c, o, { dur: 0.06, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.07, k: 23 }),
  reject: (c, o) => tone(c, o, { type: 'square', freq: 180, dur: 0.08, gain: 0.03 }),
  // FAMILY RAFT cinematic (elastigirlUlt.js plays these directly — the cue queue is frozen with the sim)
  ultStretch: (c, o) => { tone(c, o, { type: 'sawtooth', freq: 140, freqEnd: 620, dur: 0.55, gain: 0.07, vib: 16, vibDepth: 26 }); tone(c, o, { type: 'sine', freq: 70, freqEnd: 150, dur: 0.55, gain: 0.08 }) },
  ultSnap: (c, o) => { tone(c, o, { type: 'triangle', freq: 1200, freqEnd: 180, dur: 0.22, gain: 0.16 }); tone(c, o, { type: 'sine', freq: 95, freqEnd: 45, dur: 0.3, gain: 0.16, vib: 30, vibDepth: 20 }); noise(c, o, { dur: 0.12, type: 'highpass', freq: 2200, gain: 0.12, k: 29 }) },
  ultInflate: (c, o) => { tone(c, o, { type: 'sine', freq: 60, freqEnd: 180, dur: 0.6, gain: 0.14, trem: 9 }); noise(c, o, { dur: 0.6, type: 'lowpass', freq: 300, freqEnd: 900, q: 0.7, gain: 0.12, k: 31, swell: true }) },
  ultSlam: (c, o) => { tone(c, o, { type: 'sine', freq: 90, freqEnd: 28, dur: 0.9, gain: 0.3 }); tone(c, o, { type: 'triangle', freq: 180, freqEnd: 50, dur: 0.35, gain: 0.18 }); noise(c, o, { dur: 0.7, type: 'lowpass', freq: 1600, freqEnd: 90, q: 0.6, gain: 0.25, k: 37 }) },
}
export const ELASTIGIRL_SOUNDS = Object.fromEntries(Object.entries(S).map(([k, v]) => ['elastigirl_' + k, v]))
