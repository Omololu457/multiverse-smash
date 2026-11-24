// jasonUltSound.js — synth cues for Jason Voorhees's BLACKOUT cinematic (jasonUlt.js): the whispered "ki-ki-ki… ma-ma-ma"
// motif (filtered noise bursts — there is no such clip in the project), a slow heartbeat, a flickering-light buzz, and a
// high violin-like STAB for the reveal. AUDIO ONLY — never touches the simulation; routes into the shared sound manager's
// master bus (inherits SFX volume / mute). Deterministic noise (seeded LCG), no Math.random.
let _noise = null
function noiseBuf(ac) {
  if (_noise && _noise.sampleRate === ac.sampleRate) return _noise
  const n = Math.floor(ac.sampleRate * 2.5), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0)
  let s = 0x6a09e667
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1 }
  return (_noise = b)
}
function noise(ac, out, t0, dur, type, freq, q, peak, a = 0.01, sweepTo = null, pan = 0) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(ac); s.loop = true
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t0); fl.Q.value = q
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  let node = g
  if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p }
  s.connect(fl); fl.connect(g); node.connect(out); s.start(t0); s.stop(t0 + dur + 0.05)
}
function tone(ac, out, type, f, t0, a, peak, hold, rel, fTo = null) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0)
  if (fTo) o.frequency.exponentialRampToValueAtTime(fTo, t0 + a + hold + rel)
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel)
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + a + hold + rel + 0.05)
}
function thump(ac, out, t0, peak) { tone(ac, out, 'sine', 70, t0, 0.008, peak, 0.02, 0.2, 38) }
export function playJasonUltSound(sound, id) {
  const ac = sound?._ctx, out = sound?._master
  if (!ac || !out || sound._sfxMuted) return
  if (ac.state === 'suspended') { try { ac.resume() } catch (_) {} }
  const t = ac.currentTime + 0.01
  try {
    switch (id) {
      case 'whisper':   // "ki ki ki … ma ma ma": three sibilant bursts then three breathy vowels, echoing left / right
        for (let i = 0; i < 3; i++) noise(ac, out, t + i * 0.16, 0.12, 'bandpass', 5200, 3, 0.08, 0.005, null, -0.5 + i * 0.5)
        for (let i = 0; i < 3; i++) noise(ac, out, t + 0.62 + i * 0.22, 0.2, 'bandpass', 900, 4, 0.07, 0.02, 700, 0.5 - i * 0.5)
        break
      case 'heart': thump(ac, out, t, 0.42); thump(ac, out, t + 0.24, 0.3); break
      case 'buzz': tone(ac, out, 'sawtooth', 120, t, 0.005, 0.03, 0.06, 0.04); noise(ac, out, t, 0.1, 'highpass', 3000, 0.7, 0.03); break
      case 'stab':      // the reveal: a dissonant high string stab
        for (const f of [1244, 1318, 1760]) tone(ac, out, 'sawtooth', f, t, 0.01, 0.035, 0.25, 0.5)
        noise(ac, out, t, 0.5, 'highpass', 4000, 0.5, 0.04, 0.01); break
      case 'drone': tone(ac, out, 'sine', 55, t, 0.6, 0.12, 1.6, 1.2); tone(ac, out, 'triangle', 58, t, 0.8, 0.05, 1.4, 1.2); break
    }
  } catch (_) {}
}
