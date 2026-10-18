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
  hitstop:    "ms_hitstop_style",        // "scaled" | "classic"  (FEEL PASS Phase 1; default "scaled")
  battleDamage: "ms_battle_damage",      // "off" | "marks" | "full"  (FEEL PASS Phase 2; default "marks")
  weather:    "ms_weather",              // "1" (on) | "0"  (FEEL PASS Phase 3; default OFF)
  weatherIntensity: "ms_weather_intensity",   // "low" | "full"  (FEEL PASS Phase 3; default "full")
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

  // ── Hitstop Style (Scaled / Classic) — FEEL PASS Phase 1. "Scaled" (default) = power-scaled impact
  // freeze + block tick + multi-hit discipline; "Classic" restores the exact pre-pass hitstop values
  // and behaviour. This is the ONE juice setting that affects a SIM-visible value (the shared impact
  // freeze), so — exactly like Slow-Mo — the EFFECTIVE style is host-authoritative in LAN (game.js
  // replicates it via MATCH_SETUP) and combat.js is told the agreed style, keeping peers in lockstep.
  // Frame advantage is identical in both styles (both fighters freeze equally; stun never ticks during
  // hitstop), so this only changes impact WEIGHT, never match outcome.
  hitstopStyle: (() => { const v = _get(LS_KEYS.hitstop, "scaled"); return (v === "classic" || v === "scaled") ? v : "scaled" })(),
  setHitstopStyle(v) { if (v !== "classic" && v !== "scaled") return; this.hitstopStyle = v; _set(LS_KEYS.hitstop, v) },
  cycleHitstopStyle() { this.setHitstopStyle(this.hitstopStyle === "scaled" ? "classic" : "scaled") },

  // ── Battle Damage (Off / Marks Only / Full) — FEEL PASS Phase 2. RENDER-LAYER ONLY (persistent scuffs/
  // scorch/frost marks on fighters + floor decals; never part of GAME_STATE / replays / determinism).
  // "Marks Only" (default) = non-blood marks + decals. "Full" additionally shows BLOOD, but ONLY where the
  // EXISTING Brutality eligibility rule allows AND the blood setting (bloodFx) is ON. "Off" restores the
  // exact old look. Reduce Particles (this.particles) scales the mark/decal/drip budget.
  battleDamage: (() => { const v = _get(LS_KEYS.battleDamage, "marks"); return (v === "off" || v === "marks" || v === "full") ? v : "marks" })(),
  setBattleDamage(v) { if (v !== "off" && v !== "marks" && v !== "full") return; this.battleDamage = v; _set(LS_KEYS.battleDamage, v) },
  cycleBattleDamage() { const o = ["off", "marks", "full"]; this.setBattleDamage(o[(o.indexOf(this.battleDamage) + 1) % o.length]) },
  battleDamageOn() { return this.battleDamage !== "off" },
  battleDamageBlood() { return this.battleDamage === "full" },   // blood STILL additionally gated on bloodFx + eligibility at the call site

  // ── Weather (Off / On) + Intensity (Low / Full) — FEEL PASS Phase 3. COSMETIC ONLY (rain/snow/fog/…
  // overlay; no gameplay effect). Default OFF. Weather TYPE/source is decided in Phase 4 (real-world /
  // random / manual, host-authoritative in LAN); this is the master enable + the particle budget. Lightning
  // flash respects Reduce Flashing; Reduce Particles (this.particles) also scales the budget.
  weather: _get(LS_KEYS.weather, "0") === "1",
  setWeather(on) { this.weather = !!on; _set(LS_KEYS.weather, this.weather ? "1" : "0") },
  toggleWeather() { this.setWeather(!this.weather) },
  weatherOn() { return !!this.weather },
  weatherIntensity: (() => { const v = _get(LS_KEYS.weatherIntensity, "full"); return (v === "low" || v === "full") ? v : "full" })(),
  setWeatherIntensity(v) { if (v !== "low" && v !== "full") return; this.weatherIntensity = v; _set(LS_KEYS.weatherIntensity, v) },
  cycleWeatherIntensity() { this.setWeatherIntensity(this.weatherIntensity === "full" ? "low" : "full") },
}

export default juiceSettings
