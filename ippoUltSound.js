// ippoUltSound.js — synth cues for Ippo's DEMPSEY ROLL cinematic (ippoUlt.js): the ring BELL (a brass boxing-bell strike —
// there is no bell clip in the project), a crowd ROAR swell (filtered noise) and a heart-beat thump for the slow-motion
// finish. AUDIO ONLY — never touches the simulation. Routes into the shared sound manager's master bus (inherits SFX
// volume / mute). Deterministic noise (seeded LCG), no Math.random.
let _noise = null
function noiseBuf(ac) {
  if (_noise && _noise.sampleRate === ac.sampleRate) return _noise
  const n = Math.floor(ac.sampleRate * 2.5), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0)
  let s = 0x1bd5a7c3
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1 }
  return (_noise = b)
}
function bell(ac, out, f, t0, peak = 0.16, dur = 1.6) {   // a small brass ring bell: bright inharmonic partials, fast decay
  for (const [r, a, dd] of [[1, 1, 1], [2.32, 0.6, 0.7], [3.1, 0.4, 0.5], [4.4, 0.3, 0.35], [5.9, 0.18, 0.25]]) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * r
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak * a, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * dd)
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur * dd + 0.05)
  }
}
function noise(ac, out, t0, dur, type, freq, q, peak, a = 0.01, sweepTo = null) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(ac); s.loop = true
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t0); fl.Q.value = q
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); s.stop(t0 + dur + 0.05)
}
function thump(ac, out, t0, peak = 0.35) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.16)
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + 0.26)
}
export function playIppoUltSound(sound, id) {
  const ac = sound?._ctx, out = sound?._master
  if (!ac || !out || sound._sfxMuted) return
  if (ac.state === 'suspended') { try { ac.resume() } catch (_) {} }
  const t = ac.currentTime + 0.01
  try {
    switch (id) {
      case 'bell': bell(ac, out, 1320, t); break
      case 'bells': for (let i = 0; i < 3; i++) bell(ac, out, 1320, t + i * 0.16, 0.15, 1.2); break
      case 'crowd': noise(ac, out, t, 2.6, 'bandpass', 700, 0.6, 0.09, 0.5, 1100); noise(ac, out, t + 0.1, 2.4, 'bandpass', 1500, 0.8, 0.05, 0.6); break
      case 'heart': thump(ac, out, t); thump(ac, out, t + 0.22, 0.25); break
    }
  } catch (_) {}
}
