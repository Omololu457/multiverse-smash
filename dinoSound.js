// dinoSound.js — MSV1-DINO WebAudio SFX (no audio assets): the Ranger family set (nsSound.js nsr_* = the MSV1 Rangers'
// whoosh / pop / impact / zap, S.P.D. Red's hit sounds) re-keyed dt_*, plus the Dino Thunder cues: the swap chime, the
// Ptera Scream, the Tricera clang, the Camouflage shimmer and the Drago corruption growl. Seeded noise (no Math.random).
// Cues are queued by the sim (f._nsCues) and played by nsFx.playNinjaCues with the dt_ prefix — presentation only.
import { NS_SOUNDS } from './nsSound.js'

function noise(ctx, out, { dur, type = 'bandpass', freq, freqEnd = null, q = 1.2, gain = 0.25, at = 0, seed = 7 }) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0)
  let s = seed >>> 0 || 1
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1 }
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = buf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(freq, t0); if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.006, dur * 0.4)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f); f.connect(g); g.connect(out); src.start(t0); src.stop(t0 + dur + 0.02)
}
function tone(ctx, out, { type = 'sine', freq, freqEnd = null, dur, gain = 0.2, at = 0 }) {
  const t0 = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur)
  g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.01)
}
const base = Object.fromEntries(Object.entries(NS_SOUNDS).filter(([k]) => k.startsWith('nsr_')).map(([k, fn]) => ['dt_' + k.slice(4), fn]))
export const DINO_SOUNDS = {
  ...base,
  // Z-REX countdown tick (3 · 2 · 1): a hard square blip with a click; the BOOM: a sub drop + noise crack as the beam fires
  dt_tick: (c, o) => { tone(c, o, { type: 'square', freq: 880, dur: 0.09, gain: 0.08 }); tone(c, o, { type: 'sine', freq: 440, dur: 0.14, gain: 0.07 }); noise(c, o, { dur: 0.04, freq: 6000, q: 3, gain: 0.06, seed: 907 }) },
  dt_boom: (c, o) => { tone(c, o, { type: 'sine', freq: 120, freqEnd: 38, dur: 0.6, gain: 0.22 }); tone(c, o, { type: 'sawtooth', freq: 340, freqEnd: 90, dur: 0.35, gain: 0.08 }); noise(c, o, { dur: 0.5, freq: 2400, freqEnd: 300, q: 0.8, gain: 0.16, seed: 911 }) },
  // the morph chime: a rising three-note gem arpeggio
  dt_swapChime: (c, o) => { [660, 880, 1320].forEach((f, i) => tone(c, o, { type: 'triangle', freq: f, dur: 0.16, gain: 0.09, at: i * 0.045 })); noise(c, o, { dur: 0.12, freq: 5200, q: 2, gain: 0.08, seed: 811 }) },
  // PTERA SCREAM: a wavering high squeal over a sonic rush
  dt_scream: (c, o) => { tone(c, o, { type: 'sawtooth', freq: 1800, freqEnd: 2600, dur: 0.32, gain: 0.07 }); tone(c, o, { type: 'square', freq: 2400, freqEnd: 1700, dur: 0.3, gain: 0.04, at: 0.03 }); noise(c, o, { dur: 0.34, freq: 3000, freqEnd: 1200, q: 0.8, gain: 0.2, seed: 823 }) },
  // TRICERA SKIN / armor / the shield absorbing a shot: a metallic clang
  dt_clang: (c, o) => { tone(c, o, { type: 'square', freq: 980, freqEnd: 760, dur: 0.18, gain: 0.08 }); tone(c, o, { type: 'triangle', freq: 1470, dur: 0.22, gain: 0.06 }); noise(c, o, { dur: 0.05, freq: 4000, gain: 0.15, seed: 829 }) },
  // CAMOUFLAGE: a descending shimmer that fades out
  dt_camo: (c, o) => { tone(c, o, { type: 'triangle', freq: 1760, freqEnd: 440, dur: 0.35, gain: 0.07 }); noise(c, o, { dur: 0.3, freq: 6000, freqEnd: 1500, q: 3, gain: 0.06, seed: 839 }) },
  // EVIL WHITE RANGER: a low distorted growl
  dt_evil: (c, o) => { tone(c, o, { type: 'sawtooth', freq: 70, freqEnd: 45, dur: 0.7, gain: 0.14 }); noise(c, o, { dur: 0.6, type: 'lowpass', freq: 300, gain: 0.25, seed: 853 }) },
}
