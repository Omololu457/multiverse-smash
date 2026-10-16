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
  shake:     "ms_juice_shake",          // "off" | "low" | "full"
  flash:     "ms_juice_reduce_flash",   // "1" (reduce) | "0"
  slowmo:    "ms_juice_slowmo",         // "1" (on) | "0"
  particles: "ms_juice_particles",      // "low" | "full"
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
}

export default juiceSettings
