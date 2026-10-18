// juiceSettings.js
// ─────────────────────────────────────────────────────────────────
// Presentation-only "JUICE" settings (Options menu). Self-contained
// localStorage persistence — the SAME pattern as bloodFx / brutalityFx /
// colorblindHud / uiScale in game.js (no account SAVE_VERSION coupling; a
// cosmetic/display preference round-trips independently of the save file).
//
// These gate PRESENTATION ONLY. None of them touch the simulation, damage,
// hitboxes, frame data, or balance. The one sim-visible value — Slow-Mo — is
// read by the deterministic slow-mo schedule, which is skipped IDENTICALLY on
// all peers when OFF (so in LAN the host's setting decides; see game.js).
//
// A singleton object so every layer can read it directly:
//   camera.js  → shake scale            (screenShake)
//   game.js    → impact frame / slow-mo (reduceFlashing / slowMo)
//   effects.js → particle budget        (particles)
// ─────────────────────────────────────────────────────────────────

const LS_KEYS = {
  shake:      "ms_juice_shake",          // "off" | "low" | "full"
  flash:      "ms_juice_reduce_flash",   // "1" (reduce) | "0"
  slowmo:     "ms_juice_slowmo",         // "1" (on) | "0"
  particles:  "ms_juice_particles",      // "low" | "full"
  // HIT FEEL pass
  hitEffects: "ms_hitfeel",              // "off" | "low" | "full"
  dmgNumbers: "ms_hitfeel_dmgnum",       // "1" (on) | "0"  — default OFF in versus; forced ON in Training (game.js)
  animFinish: "ms_hitfeel_finisher",     // "1" (on) | "0"
  // SPARKING ZERO hit-sound pack — PER-PLAYER, audio-only, NOT part of LAN-synced state.
  hitSoundP1: "ms_hitsound_p1",          // "sparking" | "classic"  (default "sparking")
  hitSoundP2: "ms_hitsound_p2",          // "sparking" | "classic"  (default "sparking")
  atmosphere: "ms_atmosphere",           // "1" (moody grade + fog + vignette) | "0"
  perfOverlay: "ms_perf_overlay",        // "1" (show FPS / frame-time / counts overlay) | "0" — default OFF
}

// Tolerant load: missing/blocked storage → the conservative default. Shake &
// particles default to FULL (the juiced experience); Reduce Flashing defaults
// OFF (full flash); Slow-Mo defaults ON.
function _get(key, def) {
  try { const v = localStorage.getItem(key); return v == null ? def : v } catch (_) { return def }
}
function _set(key, val) { try { localStorage.setItem(key, val) } catch (_) {} }

const _SHAKE = ["off", "low", "full"]

export const juiceSettings = {
  screenShake:    (() => { const v = _get(LS_KEYS.shake, "full"); return _SHAKE.includes(v) ? v : "full" })(),
  reduceFlashing: _get(LS_KEYS.flash, "0") === "1",
  slowMo:         _get(LS_KEYS.slowmo, "1") === "1",
  particles:      (() => { const v = _get(LS_KEYS.particles, "full"); return (v === "low" || v === "full") ? v : "full" })(),

  // ── Screen Shake (Off / Low / Full) ──
  setScreenShake(v) { if (!_SHAKE.includes(v)) return; this.screenShake = v; _set(LS_KEYS.shake, v) },
  cycleScreenShake() { this.setScreenShake(_SHAKE[(_SHAKE.indexOf(this.screenShake) + 1) % _SHAKE.length]) },
  // Multiplier consumers apply to any camera-kick magnitude. Off = no shake at all.
  shakeScale() { return this.screenShake === "off" ? 0 : this.screenShake === "low" ? 0.5 : 1 },

  // ── Reduce Flashing (accessibility: replaces the black/white impact frame with a soft dim) ──
  setReduceFlashing(on) { this.reduceFlashing = !!on; _set(LS_KEYS.flash, this.reduceFlashing ? "1" : "0") },
  toggleReduceFlashing() { this.setReduceFlashing(!this.reduceFlashing) },

  // ── Slow-Mo (On / Off) ──
  setSlowMo(on) { this.slowMo = !!on; _set(LS_KEYS.slowmo, this.slowMo ? "1" : "0") },
  toggleSlowMo() { this.setSlowMo(!this.slowMo) },

  // ── Particles (Low / Full) — scales the pooled debris/smoke budget ──
  setParticles(v) { if (v !== "low" && v !== "full") return; this.particles = v; _set(LS_KEYS.particles, v) },
  cycleParticles() { this.setParticles(this.particles === "full" ? "low" : "full") },
  // Multiplier consumers apply to a tier's debris/smoke counts.
  particleScale() { return this.particles === "low" ? 0.4 : 1 },

  // ── HIT FEEL (Off / Low / Full) — Off restores the exact pre-pass look (no hit-feel additions run) ──
  hitEffects: (() => { const v = _get(LS_KEYS.hitEffects, "full"); return _SHAKE.includes(v) ? v : "full" })(),  // reuses off/low/full
  setHitEffects(v) { if (!_SHAKE.includes(v)) return; this.hitEffects = v; _set(LS_KEYS.hitEffects, v) },
  cycleHitEffects() { this.setHitEffects(_SHAKE[(_SHAKE.indexOf(this.hitEffects) + 1) % _SHAKE.length]) },
  hitEffectsOn() { return this.hitEffects !== "off" },
  hitEffectScale() { return this.hitEffects === "low" ? 0.4 : 1 },

  // ── Damage Numbers (Off / On) — user pref (default OFF). Training Mode forces ON (resolved in game.js). ──
  dmgNumbers: _get(LS_KEYS.dmgNumbers, "0") === "1",
  setDmgNumbers(on) { this.dmgNumbers = !!on; _set(LS_KEYS.dmgNumbers, this.dmgNumbers ? "1" : "0") },
  toggleDmgNumbers() { this.setDmgNumbers(!this.dmgNumbers) },

  // ── Anime Finisher (On / Off) — default ON (Phase C) ──
  animFinisher: _get(LS_KEYS.animFinish, "1") === "1",
  setAnimFinisher(on) { this.animFinisher = !!on; _set(LS_KEYS.animFinish, this.animFinisher ? "1" : "0") },
  toggleAnimFinisher() { this.setAnimFinisher(!this.animFinisher) },

  // ── Hit Sounds (Classic / Sparking pack) — PER-PLAYER, saved, audio-only ──
  // Default "sparking". "classic" restores the exact previous hit sounds (hitfeel_config
  // HITFEEL.sound). The attacker's pack plays on their hits (chosen by player index at
  // the call site). NEVER serialized into net state — a purely local audio preference.
  hitSounds: [
    (() => { const v = _get(LS_KEYS.hitSoundP1, "sparking"); return (v === "classic" || v === "sparking") ? v : "sparking" })(),
    (() => { const v = _get(LS_KEYS.hitSoundP2, "sparking"); return (v === "classic" || v === "sparking") ? v : "sparking" })(),
  ],
  hitSoundPack(player) { return this.hitSounds[player === 1 ? 1 : 0] },
  setHitSoundPack(player, v) {
    if (v !== "classic" && v !== "sparking") return
    const i = player === 1 ? 1 : 0
    this.hitSounds[i] = v
    _set(i === 1 ? LS_KEYS.hitSoundP2 : LS_KEYS.hitSoundP1, v)
  },
  cycleHitSoundPack(player) {
    const i = player === 1 ? 1 : 0
    this.setHitSoundPack(i, this.hitSounds[i] === "sparking" ? "classic" : "sparking")
  },

  // ── Atmosphere (On / Off) — moody stage grade + drifting parallax fog + vignette (default ON) ──
  // Presentation-only; Off restores the plain stage look exactly.
  atmosphere: _get(LS_KEYS.atmosphere, "1") === "1",
  setAtmosphere(on) { this.atmosphere = !!on; _set(LS_KEYS.atmosphere, this.atmosphere ? "1" : "0") },
  toggleAtmosphere() { this.setAtmosphere(!this.atmosphere) },
  atmosphereOn() { return !!this.atmosphere },

  // ── GRAPHICS PRESETS (Phase 1: Low / Standard / Full) ───────────────────────────────────────
  // One control that sets all the effect options at once. LOW = cheapest; STANDARD = full effects
  // minus the heavy atmosphere fog (the biggest per-frame cost); FULL = everything on. Applying a
  // preset just calls the existing per-setting setters (each still round-trips individually), and
  // the ACTIVE preset is DERIVED from the current values — so tweaking any one setting reads back as
  // "custom", there's no stored-label desync, and the OLD per-setting behaviour is fully restorable.
  // Covers only settings present on this build: particles, shake, atmosphere(=weather), hit effects,
  // anime finisher, slow-mo. (Reduce Flashing / Damage Numbers / Hit Sounds are owned elsewhere —
  // accessibility / preference — and are intentionally NOT swept by a graphics preset.) Battle Damage
  // and decals are a separate concurrent feature not on this base; wire them in here when they land.
  // Presentation-only; no sim/balance/determinism effect.
  GRAPHICS_PRESETS: {
    low:      { particles: "low",  screenShake: "low",  atmosphere: false, hitEffects: "low",  animFinisher: false, slowMo: false },
    standard: { particles: "full", screenShake: "full", atmosphere: false, hitEffects: "full", animFinisher: true,  slowMo: true  },
    full:     { particles: "full", screenShake: "full", atmosphere: true,  hitEffects: "full", animFinisher: true,  slowMo: true  },
  },
  applyGraphicsPreset(name) {
    const p = this.GRAPHICS_PRESETS[name]; if (!p) return false
    this.setParticles(p.particles)
    this.setScreenShake(p.screenShake)
    this.setAtmosphere(p.atmosphere)
    this.setHitEffects(p.hitEffects)
    this.setAnimFinisher(p.animFinisher)
    this.setSlowMo(p.slowMo)
    return true
  },
  // Which preset the CURRENT settings exactly match, or "custom" once any one is tweaked.
  detectGraphicsPreset() {
    for (const name of ["low", "standard", "full"]) {
      const p = this.GRAPHICS_PRESETS[name]
      if (this.particles === p.particles && this.screenShake === p.screenShake &&
          this.atmosphere === p.atmosphere && this.hitEffects === p.hitEffects &&
          this.animFinisher === p.animFinisher && this.slowMo === p.slowMo) return name
    }
    return "custom"
  },
  // Cycle Low → Standard → Full → Low (a "custom" state jumps to Low). Returns the new active preset.
  cycleGraphicsPreset() {
    const order = ["low", "standard", "full"]
    const i = order.indexOf(this.detectGraphicsPreset())
    this.applyGraphicsPreset(order[(i + 1) % order.length])
    return this.detectGraphicsPreset()
  },

  // ── Performance Overlay (Off / On) — a tiny FPS / frame-time / counts readout. Default OFF; toggle with F8. ──
  perfOverlay: _get(LS_KEYS.perfOverlay, "0") === "1",
  setPerfOverlay(on) { this.perfOverlay = !!on; _set(LS_KEYS.perfOverlay, this.perfOverlay ? "1" : "0") },
  togglePerfOverlay() { this.setPerfOverlay(!this.perfOverlay) },
}

export default juiceSettings
