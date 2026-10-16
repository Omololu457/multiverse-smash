// sfx_map.js
// ─────────────────────────────────────────────────────────────────
// THE mapping table for the SPARKING ZERO hit-sound pack. Data only — no sim
// state, no RNG. It maps the existing HIT FEEL tiers (hitfeel_config.js:
// LIGHT / MEDIUM / HEAVY / FINISHER) and the multi-hit / barrage move shapes
// onto clips from sparking_zero_sfx/ (registered in sound.js as SPARKING_SFX,
// decoded through the same audio loader as the "Classic" multiverse_sfx pack).
//
// AUDIO + PRESENTATION ONLY. Nothing here changes damage, hitboxes, frame data,
// knockback numbers or balance. Loudness lives ENTIRELY in the per-event `gain`
// below (every clip is normalized to -16 LUFS on disk — never re-encoded), and
// clip variation is a deterministic hash of (frame, playerIndex) at the call
// site — never gameRng, never Math.random — so audio can never desync a match.
//
// This table is consumed by game.js `_playHitFeelSound()` for LIGHT/MEDIUM/HEAVY
// (Phase 1) and the FINISHER + flurry + barrage handling (Phase 2). The "Classic"
// pack path stays exactly as it was (hitfeel_config HITFEEL.sound) so the Hit
// Sounds = Classic setting restores the precise previous sounds.
// ─────────────────────────────────────────────────────────────────

// ── RAW POOLS (ids match sound.js SPARKING_SFX) ──────────────────────────────
export const SZ_CLICK     = Object.freeze(["sz_click_01", "sz_click_02", "sz_click_03", "sz_click_04", "sz_click_05", "sz_click_06"])
export const SZ_HIT_SHORT = Object.freeze(["sz_hit_short_01", "sz_hit_short_02", "sz_hit_short_03", "sz_hit_short_04", "sz_hit_short_05", "sz_hit_short_06", "sz_hit_short_07"])
export const SZ_HIT_LONG  = Object.freeze(Array.from({ length: 14 }, (_, i) => `sz_hit_long_tail_${String(i + 1).padStart(2, "0")}`))
export const SZ_FLURRY    = Object.freeze(["sz_flurry_01", "sz_flurry_02", "sz_flurry_03", "sz_flurry_04", "sz_flurry_05", "sz_flurry_06", "sz_flurry_07"])
export const SZ_BARRAGE   = Object.freeze(["sz_barrage_01", "sz_barrage_02", "sz_barrage_03"])

// HEAVY uses the first eight long-tail clips; FINISHER/ULTIMATE uses the last six
// (09..14), per the mapping brief — so a heavy hit and a finisher never collide.
export const SZ_HIT_LONG_HEAVY    = Object.freeze(SZ_HIT_LONG.slice(0, 8))   // sz_hit_long_tail_01..08
export const SZ_HIT_LONG_FINISHER = Object.freeze(SZ_HIT_LONG.slice(8))      // sz_hit_long_tail_09..14

// ── PER-TIER HIT MAP ─────────────────────────────────────────────────────────
// For each tier: a `pool` the primary clip is picked from (1-of-N by hash), the
// primary `gain`, and (LIGHT only) a quiet `layer` played under it.
//   LIGHT    — sz_click_* (0.40) + a quiet sz_hit_short_* (0.35) layered under it.
//   MEDIUM   — sz_hit_short_* (0.55).
//   HEAVY    — sz_hit_long_tail_01..08 (0.75).
//   FINISHER — sz_hit_long_tail_09..14 (0.90) layered with the existing pack's
//              boom layers at 1.0 on the impact frame (Phase 2 — `boomLayers`).
// LIGHT's click gain (0.40) matches the existing Classic LIGHT gain so the switch
// is a swap of character, not of loudness (conservative). The brief only fixed the
// quiet layer at 0.35.
export const SPARKING_HIT_MAP = Object.freeze({
  light:    { pool: SZ_CLICK,            gain: 0.40, layer: { pool: SZ_HIT_SHORT, gain: 0.35 } },
  medium:   { pool: SZ_HIT_SHORT,        gain: 0.55 },
  heavy:    { pool: SZ_HIT_LONG_HEAVY,   gain: 0.75 },
  // FINISHER is wired in Phase 2 (layered with the Classic boom). Declared here for
  // the report; Phase 1 leaves a Sparking player's finisher on the Classic boom.
  finisher: { pool: SZ_HIT_LONG_FINISHER, gain: 0.90, boomLayers: true, phase2: true },
})

// Tiers that Phase 1 actually serves from the Sparking pack. The finisher tier is
// wired in Phase 2 (see below + game.js _szPlayFinisher); LIGHT/MEDIUM/HEAVY here.
export const SPARKING_PHASE1_TIERS = Object.freeze(["light", "medium", "heavy"])

// ── PHASE 2: FINISHER / ULTIMATE connect ─────────────────────────────────────
// long-tail 09..14 (gain 1.0) LAYERED with the earlier pack's existing boom layers
// (boom_huge_* @1.0 on the duck-bypassing ult-boom bus, + rumble_tail_01 @0.6),
// played on the impact frame. Three layers max (long-tail + boom + rumble).
export const SZ_FINISHER_BOOM   = Object.freeze(["boom_huge_01", "boom_huge_02_roar"])   // earlier pack; pick 1 by hash
export const SZ_FINISHER_RUMBLE = "rumble_tail_01"                                        // earlier pack

// ── PHASE 2: MULTI-HIT / BARRAGE streak detection (deterministic, audio-only) ──
// A sustained run of same-move hits is treated as ONE streamed clip over the move:
//   ≥ minHits same-move hits within gapFrames of each other → multi-hit (FLURRY clip).
//   very dense (≥ barrageMinHits with avg inter-hit gap ≤ barrageMaxGap) OR a
//   barrage-keyword move name → BARRAGE clip (single, loop-free; chained w/ crossfade
//   if the move outlasts the clip).
// Distinct move names reset the streak, so ordinary pokes never trip it — only a move
// that actually emits 3+ same-name hits in quick succession does.
export const SZ_STREAK = Object.freeze({
  minHits: 3,         // 3+ same-move hits → multi-hit
  gapFrames: 20,      // hits within ~0.33s continue the streak
  barrageMinHits: 6,  // very dense streak → barrage
  barrageMaxGap: 8,   // avg inter-hit gap ≤ ~0.13s → barrage
})
// Move-name hint that biases a streak toward BARRAGE (energy / machine-gun strings).
export const SZ_BARRAGE_HINT = /barrage|gatling|machine|rapid|vulcan|volley|bijuu|beam|cannon|galick|kamehameha|hail|storm|rush of/i

export default {
  SZ_CLICK, SZ_HIT_SHORT, SZ_HIT_LONG, SZ_FLURRY, SZ_BARRAGE,
  SZ_HIT_LONG_HEAVY, SZ_HIT_LONG_FINISHER,
  SZ_FINISHER_BOOM, SZ_FINISHER_RUMBLE, SZ_STREAK, SZ_BARRAGE_HINT,
  SPARKING_HIT_MAP, SPARKING_PHASE1_TIERS,
}
