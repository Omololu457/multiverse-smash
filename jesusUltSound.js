// jesusUltSound.js — the score for Jesus's BLESSED ENERGY cinematic (jesusUlt.js): a WebAudio-synth choir ("aah" formant
// voices on a D-major chord), church bells, a shimmer of high partials and the Lion of Judah's growl / roar. There are no
// Jesus voice or choir clips in the project, so it is synthesised (same approach as sound.js's Ben 10 / Green Arrow synths).
// AUDIO ONLY — never touches the simulation. Routes into the shared sound manager's master bus (inherits SFX volume / mute).
// Deterministic noise (seeded LCG), no Math.random.

let _noise = null
function noiseBuf(ac) {
  if (_noise && _noise.sampleRate === ac.sampleRate) return _noise
  const n = Math.floor(ac.sampleRate * 2.5), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0)
  let s = 0x2545f491
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1 }
  return (_noise = b)
}
const env = (g, t0, a, peak, hold, rel) => {
  g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak, t0 + a)
  g.gain.setValueAtTime(peak, t0 + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + hold + rel)
  return t0 + a + hold + rel + 0.05
}
// one choir voice: two detuned saws → vowel formants (a: ~800 / 1150 Hz) → envelope, with a slow vibrato
function voice(ac, out, f, t0, a, peak, hold, rel, pan = 0) {
  const g = ac.createGain(), end = env(g, t0, a, peak, hold, rel)
  const f1 = ac.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 800; f1.Q.value = 5
  const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 6
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200
  const mix = ac.createGain(); mix.gain.value = 1
  const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg)
  for (const det of [-6, 7]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; vg.connect(o.frequency)
    o.connect(f1); o.connect(f2); o.connect(lp); o.start(t0); o.stop(end)
  }
  vib.start(t0); vib.stop(end)
  const lpg = ac.createGain(); lpg.gain.value = 0.12; lp.connect(lpg)
  f1.connect(mix); f2.connect(mix); lpg.connect(mix)
  let node = mix
  if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; mix.connect(p); node = p }
  node.connect(g); g.connect(out)
}
function choir(ac, out, notes, t0, a, peak, hold, rel) { notes.forEach((f, i) => voice(ac, out, f, t0 + i * 0.03, a, peak, hold, rel, ((i % 3) - 1) * 0.5)) }
// church bell: inharmonic partials with long decays
function bell(ac, out, f, t0, peak = 0.18, dur = 3.2) {
  for (const [r, a, dd] of [[0.5, 0.5, 1], [1, 1, 0.8], [1.19, 0.5, 0.6], [1.5, 0.35, 0.5], [2, 0.4, 0.45], [2.74, 0.22, 0.3], [3.76, 0.12, 0.22]]) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * r
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(peak * a, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * dd)
    o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur * dd + 0.05)
  }
}
function noise(ac, out, t0, dur, type, freq, q, peak, a = 0.01, sweepTo = null) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf(ac); s.loop = true
  const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(freq, t0); fl.Q.value = q
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur)
  const g = ac.createGain(); env(g, t0, a, peak, Math.max(0, dur * 0.3), dur * 0.7)
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t0); s.stop(t0 + dur + a + 0.1)
}
function tone(ac, out, type, f, t0, a, peak, hold, rel, fTo = null) {
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0)
  if (fTo) o.frequency.exponentialRampToValueAtTime(fTo, t0 + a + hold + rel)
  const end = env(g, t0, a, peak, hold, rel); o.connect(g); g.connect(out); o.start(t0); o.stop(end)
}

const D = { D3: 146.83, A3: 220, D4: 293.66, Fs4: 369.99, A4: 440, D5: 587.33, Fs5: 739.99, A5: 880, G3: 196, B3: 246.94, G4: 392, B4: 493.88, D2: 73.42, A2: 110 }

export function playJesusUltSound(sound, id) {
  const ac = sound?._ctx, out = sound?._master
  if (!ac || !out || sound._sfxMuted) return
  if (ac.state === 'suspended') { try { ac.resume() } catch (_) {} }
  const t = ac.currentTime + 0.01
  try {
    switch (id) {
      case 'dark':      // the sky darkens: a low organ drone + wind
        tone(ac, out, 'sine', D.D2, t, 0.8, 0.10, 1.2, 1.4); tone(ac, out, 'triangle', D.A2, t, 0.9, 0.05, 1.1, 1.4)
        noise(ac, out, t, 2.4, 'bandpass', 380, 0.7, 0.05, 0.6, 900); break
      case 'bell': bell(ac, out, D.D4, t, 0.14, 3.4); break
      case 'choir':     // the heavens open: a swelling D-major "aah"
        choir(ac, out, [D.D3, D.A3, D.D4, D.Fs4, D.A4, D.D5], t, 0.7, 0.05, 2.4, 1.6)
        noise(ac, out, t, 2.2, 'highpass', 6000, 0.5, 0.025, 0.8); break
      case 'shimmer':   // light gathering into the lion's shape
        [D.A5, D.D5 * 2, D.Fs5 * 2, D.A5 * 2].forEach((f, i) => tone(ac, out, 'sine', f, t + i * 0.07, 0.02, 0.05, 0.05, 0.9)); break
      case 'growl':     // low rumble building in the lion's chest
        noise(ac, out, t, 0.7, 'lowpass', 220, 4, 0.22, 0.25, 420); tone(ac, out, 'sawtooth', 58, t, 0.25, 0.05, 0.25, 0.3, 74); break
      case 'roar':      // THE ROAR: a filtered-noise bellow sweeping down + a sub thump, with the choir behind it
        noise(ac, out, t, 1.5, 'bandpass', 900, 1.2, 0.45, 0.04, 260); noise(ac, out, t, 1.2, 'lowpass', 400, 1, 0.35, 0.03, 120)
        tone(ac, out, 'sawtooth', 120, t, 0.03, 0.12, 0.35, 0.9, 62); tone(ac, out, 'sine', 48, t, 0.01, 0.4, 0.15, 0.6, 30)
        choir(ac, out, [D.D3, D.A3, D.D4, D.A4], t + 0.05, 0.08, 0.04, 0.7, 1.1); break
      case 'swellA':    // wave 2: choir stab up a step (G major) + bell
        choir(ac, out, [D.G3, D.B3, D.D4, D.G4, D.B4], t, 0.05, 0.055, 0.6, 1.2); bell(ac, out, D.G4, t, 0.10, 2.4); break
      case 'swellB':    // wave 3: higher, brighter (D major, octave up)
        choir(ac, out, [D.A3, D.D4, D.Fs4, D.A4, D.D5, D.Fs5], t, 0.04, 0.06, 0.7, 1.4); bell(ac, out, D.D5, t, 0.11, 2.6); break
      case 'radiance':  // THE RADIANCE: full choir + bells + a bright noise wash
        choir(ac, out, [D.D3, D.A3, D.D4, D.Fs4, D.A4, D.D5, D.Fs5, D.A5], t, 0.03, 0.07, 1.8, 2.6)
        bell(ac, out, D.D4, t, 0.16, 4.5); bell(ac, out, D.A4, t + 0.12, 0.10, 4); bell(ac, out, D.D5, t + 0.24, 0.08, 3.6)
        noise(ac, out, t, 2.6, 'highpass', 3000, 0.4, 0.12, 0.01, 9000); tone(ac, out, 'sine', 40, t, 0.01, 0.5, 0.25, 1.2, 28); break
      case 'peace':     // aftermath: a soft resolving chord + a far bell
        choir(ac, out, [D.D4, D.Fs4, D.A4, D.D5], t, 0.9, 0.03, 1.0, 1.8); bell(ac, out, D.A4, t + 0.3, 0.07, 3.5); break
    }
  } catch (_) {}
}
