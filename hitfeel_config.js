// hitfeel_config.js
// ─────────────────────────────────────────────────────────────────
// ONE tunable config for the "HIT FEEL" pass (presentation-only). Every starting
// number lives here so it can be tuned in one place. NOTHING here changes damage,
// hitboxes, frame data, knockback numbers or balance — it only drives visuals,
// sound and camera. The hit-feel effects READ sim events (hit sparks, KO) and
// never write sim state; all visual randomness is a deterministic hash of
// (frame, playerIndex, effectIndex) — never gameRng.
//
// Built ON TOP of the juice pass (Phases 1-3): it reuses their particle pool
// (juiceFx), impact-frame field (_impactFlash), tier table (juice_tiers), sound
// pack (sound.playJuiceSfx) and settings (juiceSettings). It EXTENDS those — it
// does not add a second hitstop / shake / flash system.
//
// SIM-SIDE HITSTOP IS NOT TOUCHED. combat.js HITSTOP = { light 4, air 4, grab 6,
// heavy 10, launcher 12, spike 12, special 16, ultimate 28 } is frame data and
// stays exactly as-is. If it wants retuning, that is reported, not changed here.
// ─────────────────────────────────────────────────────────────────

export const HIT_TIER = Object.freeze({ LIGHT: "light", MEDIUM: "medium", HEAVY: "heavy", FINISHER: "finisher" })

// ── HIT TIER RULES ───────────────────────────────────────────────────────────
// A hit is tiered from the combat-tagged spark it produces: its category
// (light/heavy/launcher/spike/special/ultimate — already computed by combat.js)
// and its damage, plus whether it ends the round / is an ultimate / is tagged
// ULTIMATE in the juice tier table.
//   FINISHER = round-ending hit OR ultimate connect OR juice-table ULTIMATE move.
//   HEAVY    = heavy/launcher/spike category OR damage >= heavyDamage.
//   MEDIUM   = special category OR damage >= mediumDamage.
//   LIGHT    = everything else.
export const HIT_TIERS = Object.freeze({
  heavyCategories:  ["heavy", "launcher", "spike"],
  mediumCategories: ["special"],
  heavyDamage:  90,     // damage ≥ this → HEAVY (fallback when category is ambiguous)
  mediumDamage: 45,     // damage ≥ this → MEDIUM
})

export const HITFEEL = {
  // ── PHASE A: PUNCHY HIT ──────────────────────────────────────────────────
  // 1 FLASH — target white-tint duration (frames) per tier (via _impactFlash phase:"white"). INTENSITY-UP×2.
  flashFrames: { light: 3, medium: 5, heavy: 7, finisher: 9 },
  // 2 SOUND — sampled pack clip + gain per tier, on the impact frame (±4% deterministic pitch). INTENSITY-UP.
  sound: {
    light:    { clip: "impact_crack_01",   gain: 0.52 },
    medium:   { clip: "hit_flurry_01",      gain: 0.70 },
    heavy:    { clip: "hit_heavy_boom_01",  gain: 0.95 },
    finisher: { clip: "hit_heavy_boom_01",  gain: 1.00 },
  },
  // 3 PARTICLES — directional arced spark burst (gravity, never straight). Counts per tier. INTENSITY-UP×2.
  sparkCount: { light: 10, medium: 18, heavy: 30, finisher: 42 },
  sparkSpeed: { light: 4.0, medium: 5.5, heavy: 7.2, finisher: 8.2 },
  // 4 KNOCKBACK FEEL — target sprite offset a few px past its sim position, eased back (visual only);
  //   attacker recoils a touch on HEAVY/FINISHER. NEVER moves hitboxes. INTENSITY-UP×2.
  kbOffset:        { light: 6, medium: 12, heavy: 20, finisher: 28 }, // px the TARGET sprite is nudged
  kbEase:          0.30,                                              // per-frame ease-back toward 0 (snappier recoil)
  attackerRecoil:  { heavy: 4, finisher: 7 },                         // px the ATTACKER sprite bounces back
  // 5 SHAKE — camera kick scaled by tier (respects the Screen Shake setting + the cap inside camera.shake,
  //   now raised to 18). INTENSITY-UP×2.
  shake: { light: 4, medium: 9, heavy: 15, finisher: 18 },
  // 6 DAMAGE NUMBERS — arc drift + 0.6s fade; HEAVY/FINISHER bigger + different colour; combo total. INTENSITY-UP (punchier size).
  dmg: {
    fadeFrames: 36,                                                  // ~0.6s @60fps (was 45)
    size:  { light: 23, medium: 30, heavy: 38, finisher: 46 },
    color: { light: "#ffffff", medium: "#ffe08a", heavy: "#ff8a3a", finisher: "#ff4d4d" },
    arcVX: 1.3,                                                      // horizontal drift seed (deterministic sign)
    riseVY: -1.7, gravity: 0.06,                                     // arc: rise then settle
    comboTotalColor: "#ffd24a",
  },
  // 7 KO POP — burst of coloured pieces on the final hit (ash dissolve handled by elements/FIRE).
  //   NOT applied to Brutality finishes (they keep their own system). INTENSITY-UP.
  koPiecePool: 90,                                                   // pooled pieces (reuses juiceFx budget)
  koPieces:    60,

  // ── PHASE C: ANIME FINISHER. FULL cinematic reserved for ULTIMATE/finisher connects; HEAVY/special get the
  //    shorter `pop`. Shared 2.5s cooldown (a full ULTIMATE bypasses it so it always gets its moment). ──
  finisher: {
    cooldownFrames: 150,   // once per 2.5s max (heavy pops respect this; ultimates bypass)
    freezeFrames:   7,     // FULL cinematic — a longer dramatic hold
    silhouetteFrames: 2,
    invertFrames:   2,
    burstLines:     24,
    zoomIn:         1.70,  // punch-in scale
    tail:           12,    // frames after the freeze (invert/burst/snap-back)
    maxFlashesPerSec: 3,   // photosensitivity clamp
    // QUICK POP for HEAVY / special: short freeze, light zoom, no full-screen invert, fewer burst spikes.
    pop: { freezeFrames: 3, silhouetteFrames: 1, invertFrames: 0, burstLines: 12, zoomIn: 1.22, tail: 6 },
  },

  // ── GLOBAL ──
  // "Hit Effects" setting scales everything: full = 1, low = fewer particles / no KO pop / no recoil,
  // off = NONE of the hit-feel additions run (the exact pre-pass look is restored).
  lowParticleScale: 0.4,
}

// Resolve a hit's tier from its spark (combat-tagged) + whether it ended the round / is an ult-table move.
//   opts.category  — spark.category (light/heavy/launcher/spike/special/ultimate)
//   opts.damage    — spark.damage
//   opts.roundEnd  — this hit dropped the target to 0 HP
//   opts.isUltMove — the move is tagged ULTIMATE in the juice tier table (or category === "ultimate")
export function hitTierFor(opts = {}) {
  const cat = opts.category || "light"
  const dmg = +opts.damage || 0
  if (opts.roundEnd || opts.isUltMove || cat === "ultimate") return HIT_TIER.FINISHER
  if (HIT_TIERS.heavyCategories.includes(cat) || dmg >= HIT_TIERS.heavyDamage) return HIT_TIER.HEAVY
  if (HIT_TIERS.mediumCategories.includes(cat) || dmg >= HIT_TIERS.mediumDamage) return HIT_TIER.MEDIUM
  return HIT_TIER.LIGHT
}

export default { HIT_TIER, HIT_TIERS, HITFEEL, hitTierFor }
