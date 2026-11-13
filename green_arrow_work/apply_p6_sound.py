# PASS3 P6: Green Arrow munition SFX — WebAudio synth on the sound singleton, mirroring
# playSoldierBoy. Bomb whistle / boom / reticle beep / napalm crackle / plane drone+hum.
# Deterministic (pitch + seed supplied by the munitions sfx hook; no Math.random). Render-only.
import sys
ANCHOR = "\n\n  // ── COMBO HELPER"
BLOCK = r'''
  // ── GREEN ARROW MUNITION SFX (PASS3 P6, WebAudio synth) ─────
  // Bomb whistle / boom / reticle beep / napalm crackle / plane drone. `id` + a deterministic
  // pitch (hash-derived upstream, +/-) + a noise seed come from the munitions sfx hook — no
  // Math.random. Render-only: guarded off when muted / no AudioContext (headless + node tests).
  playGreenArrow(id, pitch = 1, seed = 1) {
    if (this._sfxMuted || !this._ctx || !this._ready) return
    if (this._ctx.state === "suspended") { this._ctx.resume().then(() => this._gaSynth(id, pitch, seed)); return }
    this._gaSynth(id, pitch, seed)
  }
  _gaSynth(id, pitch, seed) {
    const ctx = this._ctx, out = this._master, p = pitch || 1
    try {
      switch (id) {
        case "ga_whistle": osc(ctx, out, "sine", 1500 * p, 0.5, 0.1, 300 * p); break                                              // falling whistle 1500->300
        case "ga_boom":    osc(ctx, out, "sine", 55 * p, 0.45, 0.32, 38 * p); sbSeededNoise(ctx, out, 0.38, 0.22, 900 * p, seed); break   // 55Hz thump + noise body
        case "ga_reticle": osc(ctx, out, "square", 2000 * p, 0.1, 0.07); break                                                    // 2kHz beep ~6 frames
        case "ga_napalm":  this._gaCrackle(seed, p); break                                                                          // filtered-noise crackle
        case "ga_plane":   this._gaPlane(p); break                                                                                  // plane drone + 90Hz hum
      }
    } catch (_) {}
  }
  _gaCrackle(seed, p) {
    const ctx = this._ctx, out = this._master
    for (let i = 0; i < 5; i++) sbSeededNoise(ctx, out, 0.06, 0.05, (1200 + ((seed + i * 97) % 900)) * p, seed + i)   // staggered crackle bursts
  }
  _gaPlane(p) {
    const ctx = this._ctx, out = this._master
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    o.type = "sawtooth"; o.frequency.value = 90 * p                           // 90Hz engine hum
    lfo.type = "sine"; lfo.frequency.value = 7; lg.gain.value = 18 * p        // 7Hz prop throb
    lfo.connect(lg); lg.connect(o.frequency)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.1)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.3)
    o.connect(g); g.connect(out)
    o.start(); lfo.start(); o.stop(ctx.currentTime + 1.3); lfo.stop(ctx.currentTime + 1.3)
  }
'''
def patch(p):
    s = open(p, encoding="utf-8").read()
    if "playGreenArrow" in s:
        print("already", p); return
    assert s.count(ANCHOR) == 1, f"anchor x{s.count(ANCHOR)} in {p}"
    open(p, "w", encoding="utf-8").write(s.replace(ANCHOR, BLOCK + ANCHOR, 1))
    print("patched", p)
for p in sys.argv[1:]:
    patch(p)
