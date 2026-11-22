// woodsboroAudio.js — the Woodsboro soundscape, synthesised in WebAudio (no sample files): a night-wind + low drone
// bed with far-off screams, and one-shots the stage art fires (screams, stabs, Chucky's laugh, Jason's whisper,
// thunder, a ringing phone, a police siren). Presentation only: driven by the stage renderer's wall clock, routed
// through the game's SFX master (volume / mute apply), never touches the sim. The bed fades out by itself as soon as
// the stage stops being drawn (menus, another stage).
import { sound } from "./sound.js"

const A = { bed: null, last: 0, nextFar: 0, noise: null, echo: null, watch: 0, played: { scream: 0, stab: 0, laugh: 0, whisper: 0, thunder: 0, phone: 0, siren: 0 } }
let _seed = 0x6a09e667
const rnd = () => { _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5; return (_seed >>> 0) / 4294967296 }
export const woodsboroAudioState = () => ({ bed: !!A.bed, ...A.played })

function ac() { const c = sound._ctx; return c && sound._master && c.state !== "closed" ? c : null }
function noiseBuf(c) { if (A.noise) return A.noise; const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; return (A.noise = b) }
function out(c) {   // the street: a short slap-back echo + the SFX master
  if (A.echo && A.echo.ctx === c) return A.echo.in
  const inp = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter()
  dl.delayTime.value = 0.23; fb.gain.value = 0.32; lp.type = "lowpass"; lp.frequency.value = 2200
  inp.connect(sound._master); inp.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(sound._master)
  A.echo = { ctx: c, in: inp }; return inp
}
function chain(c, pan, vol) { const g = c.createGain(), p = c.createStereoPanner ? c.createStereoPanner() : null; g.gain.value = vol; if (p) { p.pan.value = Math.max(-1, Math.min(1, pan || 0)); g.connect(p); p.connect(out(c)) } else g.connect(out(c)); return g }
function noise(c, t0, dur) { const s = c.createBufferSource(); s.buffer = noiseBuf(c); s.loop = true; s.start(t0, rnd() * 1.5); s.stop(t0 + dur + 0.05); return s }

// a human scream: a buzzy voice through "AAH" formants, pitch up-swoop, ragged vibrato, breath noise
export function wbScream(pan = 0, vol = 0.5, far = false) {
  const c = ac(); if (!c) return; A.played.scream++
  const t0 = c.currentTime + 0.01, male = rnd() < 0.35, f0 = male ? 300 + 160 * rnd() : 620 + 420 * rnd(), dur = 0.7 + 1.0 * rnd()
  const dst = chain(c, pan, vol * (far ? 0.35 : 1)), env = c.createGain(), shaper = c.createWaveShaper(), curve = new Float32Array(256)
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3) } shaper.curve = curve
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = far ? 1800 : 5200; env.connect(lp); lp.connect(dst)
  env.gain.setValueAtTime(0.0001, t0); env.gain.exponentialRampToValueAtTime(1, t0 + 0.05); env.gain.setValueAtTime(1, t0 + dur * 0.75); env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  const o = c.createOscillator(); o.type = "sawtooth"
  o.frequency.setValueAtTime(f0 * 0.75, t0); o.frequency.exponentialRampToValueAtTime(f0 * 1.18, t0 + 0.12); o.frequency.exponentialRampToValueAtTime(f0 * 1.05, t0 + dur * 0.6); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, t0 + dur)
  const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 6 + 4 * rnd(); vg.gain.value = f0 * 0.045; vib.connect(vg); vg.connect(o.frequency)
  const pre = c.createGain(); pre.gain.value = 0.9; o.connect(pre); pre.connect(shaper)
  for (const [f, q, g] of [[male ? 750 : 950, 5, 1], [male ? 1150 : 1450, 7, 0.65], [2900, 9, 0.3]]) { const bp = c.createBiquadFilter(), gg = c.createGain(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; gg.gain.value = g * 0.55; shaper.connect(bp); bp.connect(gg); gg.connect(env) }
  const n = noise(c, t0, dur), nb = c.createBiquadFilter(), ng = c.createGain(); nb.type = "bandpass"; nb.frequency.value = 2600; nb.Q.value = 1.2; ng.gain.value = 0.18; n.connect(nb); nb.connect(ng); ng.connect(env)
  o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.05); vib.stop(t0 + dur + 0.05)
}
// a knife going in: a wet slash of noise + a dull thud
export function wbStab(pan = 0, vol = 0.45) {
  const c = ac(); if (!c) return; A.played.stab++
  const t0 = c.currentTime + 0.01, dst = chain(c, pan, vol), n = noise(c, t0, 0.14), bp = c.createBiquadFilter(), g = c.createGain()
  bp.type = "bandpass"; bp.frequency.setValueAtTime(3800, t0); bp.frequency.exponentialRampToValueAtTime(700, t0 + 0.12); bp.Q.value = 1.4
  g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14); n.connect(bp); bp.connect(g); g.connect(dst)
  const o = c.createOscillator(), og = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 0.15)
  og.gain.setValueAtTime(0.45, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18); o.connect(og); og.connect(dst); o.start(t0); o.stop(t0 + 0.2)
}
// Chucky's cackle: "HA HA HA HA" — gravelly little voice, pitch climbing each syllable
export function wbLaugh(pan = 0, vol = 0.45) {
  const c = ac(); if (!c) return; A.played.laugh++
  const dst = chain(c, pan, vol), sh = c.createWaveShaper(), cv = new Float32Array(256); for (let i = 0; i < 256; i++) cv[i] = Math.tanh((i / 128 - 1) * 5); sh.curve = cv
  const f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); f1.type = f2.type = "bandpass"; f1.frequency.value = 820; f2.frequency.value = 1250; f1.Q.value = 4; f2.Q.value = 6
  sh.connect(f1); sh.connect(f2); f1.connect(dst); f2.connect(dst)
  for (let k = 0; k < 5; k++) { const t0 = c.currentTime + 0.02 + k * 0.17, o = c.createOscillator(), g = c.createGain(); o.type = "sawtooth"
    o.frequency.setValueAtTime(330 + k * 22, t0); o.frequency.exponentialRampToValueAtTime(260 + k * 18, t0 + 0.12)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1.4, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13); o.connect(g); g.connect(sh); o.start(t0); o.stop(t0 + 0.15) }
}
// Jason's whisper: "ki ki ki … ma ma ma", breathy, drowned in echo
export function wbWhisper(pan = 0, vol = 0.5) {
  const c = ac(); if (!c) return; A.played.whisper++
  const dst = chain(c, pan, vol), dl = c.createDelay(1), fb = c.createGain(); dl.delayTime.value = 0.31; fb.gain.value = 0.5; dl.connect(fb); fb.connect(dl); dl.connect(dst)
  const syl = [["k", 0], ["k", 0.2], ["k", 0.4], ["m", 0.85], ["m", 1.05], ["m", 1.25]]
  for (const [s, at] of syl) { const t0 = c.currentTime + 0.02 + at, n = noise(c, t0, 0.2), g = c.createGain(), sum = c.createGain()
    for (const [f, q] of s === "k" ? [[350, 6], [2400, 10]] : [[800, 5], [1200, 7]]) { const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = f; bp.Q.value = q; n.connect(bp); bp.connect(sum) }
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(s === "k" ? 4.5 : 3.6, t0 + (s === "k" ? 0.01 : 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (s === "k" ? 0.12 : 0.18))
    sum.connect(g); g.connect(dst); g.connect(dl) }
}
export function wbThunder(vol = 0.6) {
  const c = ac(); if (!c) return; A.played.thunder++
  const t0 = c.currentTime + 0.05, dst = chain(c, 0, vol), n = noise(c, t0, 3.2), lp = c.createBiquadFilter(), g = c.createGain()
  lp.type = "lowpass"; lp.frequency.setValueAtTime(900, t0); lp.frequency.exponentialRampToValueAtTime(110, t0 + 2.6)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1.4, t0 + 0.04); g.gain.setTargetAtTime(0.5, t0 + 0.2, 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.1)
  n.connect(lp); lp.connect(g); g.connect(dst)
}
export function wbPhone(pan = 0, vol = 0.22) {   // an old landline: 440+480 Hz, two rings
  const c = ac(); if (!c) return; A.played.phone++
  const dst = chain(c, pan, vol)
  for (const st of [0, 0.5, 2.5, 3.0]) { const t0 = c.currentTime + 0.02 + st, g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.02); g.gain.setValueAtTime(0.7, t0 + 0.38); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42); g.connect(dst)
    for (const f of [440, 480]) { const o = c.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t0); o.stop(t0 + 0.45) } }
}
export function wbSiren(vol = 0.2) {   // police, getting closer
  const c = ac(); if (!c) return; A.played.siren++
  const t0 = c.currentTime + 0.02, dst = chain(c, 0.3, vol), o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(); o.type = "triangle"
  for (let k = 0; k < 6; k++) { o.frequency.setValueAtTime(620, t0 + k * 0.9); o.frequency.linearRampToValueAtTime(980, t0 + k * 0.9 + 0.45); o.frequency.linearRampToValueAtTime(620, t0 + k * 0.9 + 0.9) }
  lp.type = "lowpass"; lp.frequency.setValueAtTime(700, t0); lp.frequency.linearRampToValueAtTime(3000, t0 + 5)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.8, t0 + 2.5); g.gain.setValueAtTime(0.8, t0 + 4.8); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5.4)
  o.connect(lp); lp.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + 5.5)
}
function startBed(c) {   // wind through bare trees + a low dread drone + a slow heartbeat thump
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(1, c.currentTime + 2); g.connect(sound._master)
  const n = c.createBufferSource(); n.buffer = noiseBuf(c); n.loop = true
  const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 0.8
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.13; lg.gain.value = 260; lfo.connect(lg); lg.connect(bp.frequency)
  const wg = c.createGain(); wg.gain.value = 0.11; n.connect(bp); bp.connect(wg); wg.connect(g)
  const dl = c.createBiquadFilter(); dl.type = "lowpass"; dl.frequency.value = 170; const dg = c.createGain(); dg.gain.value = 0.07; dl.connect(dg); dg.connect(g)
  const os = [55, 55.6, 82.7].map(f => { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(dl); return o })
  n.start(); lfo.start(); os.forEach(o => o.start())
  A.bed = { g, nodes: [n, lfo, ...os], ctx: c, beat: 0 }
}
function stopBed() { const b = A.bed; if (!b) return; A.bed = null; const c = b.ctx, t = c.currentTime
  try { b.g.gain.cancelScheduledValues(t); b.g.gain.setValueAtTime(b.g.gain.value, t); b.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); b.nodes.forEach(n => n.stop(t + 0.7)) } catch (_) {} }
function heartbeat(c, vol) { const dst = chain(c, 0, vol); for (const at of [0, 0.22]) { const t0 = c.currentTime + 0.02 + at, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.12)
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + 0.2) } }
// called every frame the stage is drawn; t = the renderer's wall clock (s); dread 0..1 (the blackout)
export function woodsboroAudioTick(t, dread = 0) {
  const c = ac(); if (!c) return
  A.last = performance.now()
  if (!A.bed) startBed(c)
  if (!A.watch) A.watch = setInterval(() => { if (performance.now() - A.last > 400) { stopBed(); clearInterval(A.watch); A.watch = 0 } }, 250)
  if (t > A.nextFar) { A.nextFar = t + 3 + 5 * rnd(); wbScream(rnd() * 1.6 - 0.8, 0.5, true) }   // somewhere down the street…
  if (dread > 0.3 && t > (A.bed.beat || 0)) { A.bed.beat = t + 0.95 - 0.35 * dread; heartbeat(c, 0.35 * dread) }
}
