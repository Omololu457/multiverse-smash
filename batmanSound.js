// batmanSound.js — Batman WebAudio SFX (synthesized placeholders; no audio pack supplied for the rebuild). Spread into
// sound.js SOUNDS so every cue plays through SoundManager.play → the SFX master gain; the VOICE bus is never touched
// (the existing batmanVoice.js lines keep their own hooks). Noise is a seeded LCG buffer (deterministic, no
// Math.random). The sim queues cue names on f._batman.cues; batmanFx.playBatmanCues plays them as `batman_<cue>`.
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
const thud = (ctx, out, at = 0, g = 1) => { tone(ctx, out, { type: 'triangle', freq: 160, freqEnd: 70, dur: 0.1, gain: 0.2 * g, at }); fnoise(ctx, out, { dur: 0.05, type: 'lowpass', freq: 900, gain: 0.12 * g, at, seed: 3 }) }
const boomFx = (ctx, out, g = 1, at = 0) => { fnoise(ctx, out, { dur: 0.45 * g, type: 'lowpass', freq: 800, freqEnd: 60, q: 0.7, gain: 0.3, seed: 11, at }); tone(ctx, out, { freq: 60, freqEnd: 30, dur: 0.4 * g, gain: 0.22, at }) }
const S = {
  swing: (c, o) => fnoise(c, o, { dur: 0.07, freq: 900, freqEnd: 2400, q: 1.4, gain: 0.08, seed: 5 }),
  kick: (c, o) => { fnoise(c, o, { dur: 0.1, freq: 600, freqEnd: 1800, q: 1.1, gain: 0.1, seed: 6 }) },
  gadget: (c, o) => tone(c, o, { type: 'square', freq: 880, dur: 0.03, gain: 0.03 }),
  command: (c, o) => { tone(c, o, { type: 'square', freq: 660, dur: 0.05, gain: 0.03 }); tone(c, o, { type: 'square', freq: 990, dur: 0.05, gain: 0.03, at: 0.07 }) },
  hit: (c, o) => thud(c, o), bigHit: (c, o) => { thud(c, o, 0, 1.5); fnoise(c, o, { dur: 0.12, freq: 1600, q: 2, gain: 0.08, seed: 9 }) },
  blocked: (c, o) => tone(c, o, { type: 'triangle', freq: 1200, freqEnd: 900, dur: 0.06, gain: 0.05 }),
  batarang: (c, o) => fnoise(c, o, { dur: 0.25, freq: 2400, freqEnd: 3600, q: 4, gain: 0.05, seed: 13 }),
  batarangTurn: (c, o) => fnoise(c, o, { dur: 0.2, freq: 3200, freqEnd: 2200, q: 4, gain: 0.04, seed: 14 }),
  catch: (c, o) => tone(c, o, { type: 'triangle', freq: 700, dur: 0.04, gain: 0.04 }),
  grapnel: (c, o) => { fnoise(c, o, { dur: 0.06, type: 'highpass', freq: 2000, gain: 0.12, seed: 15 }); fnoise(c, o, { dur: 0.25, freq: 1500, freqEnd: 500, q: 3, gain: 0.05, seed: 16, at: 0.04 }) },
  hooked: (c, o) => { thud(c, o, 0, 0.8); tone(c, o, { type: 'sawtooth', freq: 220, freqEnd: 440, dur: 0.18, gain: 0.03 }) },
  ropeKick: (c, o) => fnoise(c, o, { dur: 0.16, freq: 500, freqEnd: 2600, q: 1, gain: 0.1, seed: 17 }),
  zip: (c, o) => tone(c, o, { type: 'sawtooth', freq: 300, freqEnd: 1200, dur: 0.22, gain: 0.03 }),
  smoke: (c, o) => fnoise(c, o, { dur: 0.6, type: 'lowpass', freq: 1800, freqEnd: 300, q: 0.6, gain: 0.12, seed: 18 }),
  shadow: (c, o) => fnoise(c, o, { dur: 0.15, type: 'highpass', freq: 3000, freqEnd: 1200, gain: 0.05, seed: 19 }),
  counter: (c, o) => { thud(c, o, 0, 1.1); tone(c, o, { type: 'triangle', freq: 880, freqEnd: 1320, dur: 0.12, gain: 0.04 }) },
  doubleJump: (c, o) => fnoise(c, o, { dur: 0.12, freq: 700, freqEnd: 2000, q: 0.9, gain: 0.05, seed: 21 }),
  land: (c, o) => fnoise(c, o, { dur: 0.07, type: 'lowpass', freq: 600, freqEnd: 150, gain: 0.1, seed: 23 }),
  reject: (c, o) => tone(c, o, { type: 'square', freq: 180, dur: 0.08, gain: 0.04 }),
  op: (c, o) => { [523, 784, 1046].forEach((f, i) => tone(c, o, { type: 'square', freq: f, dur: 0.05, gain: 0.025, at: i * 0.05 })) },
  bracket: (c, o) => { tone(c, o, { type: 'sine', freq: 1760, dur: 0.05, gain: 0.04 }); tone(c, o, { type: 'sine', freq: 1760, dur: 0.05, gain: 0.04, at: 0.09 }) },
  bombDrop: (c, o) => tone(c, o, { type: 'sine', freq: 1400, freqEnd: 500, dur: 0.35, gain: 0.03 }),
  boom: (c, o) => boomFx(c, o, 0.6),
  shot: (c, o) => fnoise(c, o, { dur: 0.04, type: 'highpass', freq: 2500, gain: 0.07, seed: 25 }),
  bolt: (c, o) => tone(c, o, { type: 'sawtooth', freq: 900, freqEnd: 300, dur: 0.1, gain: 0.03 }),
  cannon: (c, o) => { boomFx(c, o, 0.35); fnoise(c, o, { dur: 0.05, type: 'highpass', freq: 1800, gain: 0.08, seed: 26 }) },
  launch: (c, o) => fnoise(c, o, { dur: 0.3, freq: 600, freqEnd: 1800, q: 1, gain: 0.08, seed: 27 }),
  beam: (c, o) => tone(c, o, { type: 'sawtooth', freq: 1200, freqEnd: 600, dur: 0.18, gain: 0.04 }),
  deploy: (c, o) => tone(c, o, { type: 'triangle', freq: 330, freqEnd: 220, dur: 0.15, gain: 0.05 }),
  release: (c, o) => tone(c, o, { type: 'triangle', freq: 500, freqEnd: 250, dur: 0.15, gain: 0.05 }),
  slam: (c, o) => boomFx(c, o, 0.8),
  machineHit: (c, o) => tone(c, o, { type: 'square', freq: 300, dur: 0.04, gain: 0.03 }),
  machineDown: (c, o) => { boomFx(c, o, 0.4); fnoise(c, o, { dur: 0.2, type: 'highpass', freq: 3000, freqEnd: 800, gain: 0.05, seed: 28 }) },
  ultStart: (c, o) => S.grapnel(c, o), ultMiss: (c, o) => fnoise(c, o, { dur: 0.1, freq: 900, freqEnd: 400, q: 1, gain: 0.04, seed: 29 }),
  ultConfirm: (c, o) => { thud(c, o, 0, 1.4); tone(c, o, { type: 'sawtooth', freq: 110, freqEnd: 220, dur: 0.5, gain: 0.04 }) },
  planeIn: (c, o) => fnoise(c, o, { dur: 0.9, freq: 300, freqEnd: 1400, q: 0.8, gain: 0.1, seed: 31 }),
  capture: (c, o) => S.hooked(c, o),
  ultHit: (c, o) => thud(c, o, 0, 1.3),
  impact: (c, o) => { boomFx(c, o, 1.6); boomFx(c, o, 1.2, 0.12) },
}
export const BATMAN_SOUNDS = Object.fromEntries(Object.entries(S).map(([k, v]) => ['batman_' + k, v]))
