// characters.js
// SINGLE SOURCE OF TRUTH — replaces roster.js entirely.
// Merge of both character sources into one central roster.

const DEFAULT_ANIM = {
  idle:     { frames: 6, width: 128, height: 128, speed: 8 },
  walk:     { frames: 8, width: 128, height: 128, speed: 5 },
  hurt:     { frames: 2, width: 128, height: 128, speed: 10 },
  light:    { frames: 5, width: 128, height: 128 },
  heavy:    { frames: 7, width: 128, height: 128 },
  up:       { frames: 6, width: 128, height: 128 },
  air:      { frames: 5, width: 128, height: 128 },
  down_air: { frames: 6, width: 128, height: 128 },
  grab:     { frames: 6, width: 128, height: 128 }
}

// ─────────────────────────────────────────────────────────────────
// DRAGON BALL
// ─────────────────────────────────────────────────────────────────
const goku = {
  rosterKey: "goku", name: "Goku", universe: "dragon_ball",
  archetypes: ["melee", "transformations"],
  primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1200, maxEnergy: 200, attack: 92, defense: 86, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launchVy: -32, selfVy: -9 },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    dragonFist: { cost: 40, damage: 150, startup: 10, active: 6, recovery: 22, hitstun: 28, knockbackX: 12, knockbackY: -6, effect: "punch attack with dragon aura" },
    kamehameha: { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2 }
  },
  // ── TRANSFORMATION LADDER (base → SSJ → SSJ2 → SSJ3 → SSJ Blue → Ultra Instinct). SAME mechanic as
  // Vegeta / Goku Black / Frieza (2026-08-22 alignment): CHARGE button — hold-release STEPS UP the ladder,
  // a tap reverts to base. Threshold-gated (NO up-front cost), a continuous per-frame Ki DRAIN pays for the
  // form, auto-revert the instant Ki hits 0. Logic: abilities.js enterGokuNextForm / applyGokuFormSystem.
  // ★NUMBERS ARE GOKU-SPECIFIC, not copied from Vegeta/Frieza — Goku's ladder is LONGER (5 forms) and much
  //   STRONGER at the top (UI ×2.5 dmg / ×2.0 spd) than Vegeta's 2-form cap (×1.45) or Frieza's (×1.50), so:
  //   entry SSJ is the cheap workhorse (thr 40 / drain 0.14/f), each tier gates higher + drains faster, and
  //   UI gates near-full (185) + drains 0.48/f to BOUND its huge multipliers to a brief window (~8s from full).
  //   ★★REGEN-AWARE: Goku regens 0.08 Ki/frame (0.06 base + 0.02 Goku bonus), so drains MUST exceed 0.08 to be
  //   a real net cost — NET drain = declared − 0.08 (ssj1 ≈ 3.6/s → ~55s uptime … UI ≈ 24/s → ~8s). (An
  //   earlier 0.08 SSJ1 drain exactly cancelled regen → a free never-reverting form; the harness caught it.)
  //   Multipliers PRESERVED from the original ladder. ★These
  //   drain/threshold values are a DESIGN CALL — flagged for playtest tuning, deliberately distinct from the
  //   other three DB fighters. (No `duration` — the DRAIN is the stamina model now, like Vegeta.)
  transformationOrder: ["base","ssj1","ssj2","ssj3","ssblue","ultraInstinct"],
  transformations: {
    base:          { damageMultiplier: 1,   speedMultiplier: 1,   defenseMultiplier: 1 },
    ssj1:          { damageMultiplier: 1.2, speedMultiplier: 1.1,  defenseMultiplier: 1.05, energyThreshold: 40,  energyDrainPerFrame: 0.14, kiDrainPerSecond: 8,  revertOnEmpty: true },
    ssj2:          { damageMultiplier: 1.3, speedMultiplier: 1.15, defenseMultiplier: 1.1,  energyThreshold: 70,  energyDrainPerFrame: 0.20, kiDrainPerSecond: 12, revertOnEmpty: true, requiresForm: "ssj1" },
    ssj3:          { damageMultiplier: 1.5, speedMultiplier: 1.2,  defenseMultiplier: 1.05, energyThreshold: 110, energyDrainPerFrame: 0.30, kiDrainPerSecond: 18, revertOnEmpty: true, requiresForm: "ssj2" },
    ssblue:        { damageMultiplier: 2,   speedMultiplier: 1.4,  defenseMultiplier: 1.2,  energyThreshold: 150, energyDrainPerFrame: 0.36, kiDrainPerSecond: 22, revertOnEmpty: true, requiresForm: "ssj3", isSpecial: true },
    ultraInstinct: { damageMultiplier: 2.5, speedMultiplier: 2,    defenseMultiplier: 1.5,  energyThreshold: 185, energyDrainPerFrame: 0.48, kiDrainPerSecond: 29, revertOnEmpty: true, requiresForm: "ssblue", isSpecial: true, autoDodge: true, autoDodgeKiCost: 10 }
  },
  // No separate ultimate — the base→...→Ultra Instinct ladder on the CHARGE button IS the power ceiling
  // (same as Vegeta / Frieza). The old ultimate-button "Super Saiyan Blue" trigger was REMOVED in the
  // 2026-08-22 DB-transform alignment; the Ultimate input is now unbound for Goku.
  ultimate: { name: "Super Saiyan (transformation ladder)", cost: 0, description: "No separate ultimate — hold the Charge button and RELEASE to step UP the transformation ladder (base → SSJ → SSJ2 → SSJ3 → SSJ Blue → Ultra Instinct); tap Charge to revert. Each form boosts damage, speed & defense but continuously DRAINS Ki and reverts when empty (same as Vegeta / Goku Black / Frieza)." },
  hasSprites: false,   // MK-feel Stage 5: sprite-flag REMOVAL (not a delete) → procedural box renderer. animationData KEPT below (expensive slice geometry). Reverse by restoring `true` + the spritesheets.js manifest entry.
  // Base (black-hair) Goku sprites sliced from goku_base_FULLSHEET_transparent.png.
  // Idle source cell 34×37 → ×3.2 ≈ Sukuna/Gojo on-screen height (their 64px cells
  // ×1.8 ≈ 115px; 37×3.2 ≈ 118). His idle is a WIDE stance, so at equal height he
  // reads wider/stockier than the lean JJK sprites — expected, not a bug.
  // ⚠ Goku MUST keep his skins.js SKINS entry: applySkin() pulls spriteScale from the
  // default skin; without it getSkins() forces spriteScale:1 and he shrinks to 37px.
  // BASE only (NOT goku_ssj_god_*); universe "dragon_ball" keeps him out of GojoV1 beta.
  spriteScale: 3.2,
  animationData: {
    ...DEFAULT_ANIM,   // unmapped actions (walk/attacks/…) fall back to the box until their rows are sliced+wired
    // ── ATLAS coords into goku_base_FULLSHEET_transparent.png: sourceX/sourceY = row's
    // top-left; `width` = frame pitch (frames step right by it); `height` = cell height.
    // idle: 6 touching frames, uniform 34px pitch (confirmed even-split). anchorY plants
    // feet on the floor (screen px, scale-independent; more negative = lower).
    idle: { frames: 6, width: 34, height: 37, speed: 6, anchorY: -3, sourceX: 0, sourceY: 10, sheet: "./goku_base_FULLSHEET_transparent.png" },
    // walk/run: 10-frame stride row (full-sheet band y229-272) RE-SLICED to a clean
    // uniform strip via harness (touching frames → explicit valley cut-points, each
    // frame centered). Closes the "walk = placeholder box" cosmetic gap. run reuses
    // the same strip at a faster cadence (Naruto/Sasuke pattern); only shows on dash
    // momentum since ground-hold resolves to `walk` (|vx|>10 gate).
    walk: { frames: 10, width: 32, height: 44, speed: 5, anchorY: -3, sheet: "./goku_base_walk_uniform.png" },
    run:  { frames: 10, width: 32, height: 44, speed: 4, anchorY: -3, sheet: "./goku_base_walk_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// VEGETA (Base Form) — DRAGON BALL. STAGE 1 build: box → sprite. Core identity
// (idle/movement/states/intro/base-charge) + the 5 basic normals, all sliced from
// the ./vegeta_base_<action>.png crops. Mirrors the Goku Black sprite pattern.
// DEFERRED (see plan): Toji-Rekka command chain (foward_kick→side_kick→up_into→
// up_attack_2), the 3 energy specials + Overcharged Final Flash ultimate, and the
// 5 free/cooldown pokes (Ki Blast tap/hold, EX Ki Punch, Koma Rush, Koma Repeatable,
// Launch Ki Blast). Those sheets exist on disk but are not wired this pass.
// ─────────────────────────────────────────────────────────────────
const vegeta = {
  rosterKey: "vegeta", name: "Vegeta", universe: "dragon_ball",
  portrait: "./vegeta_mugshot.png",   // EXACT on-disk filename (character-select mugshot / HUD nameplate) — same role as goku_black's portrait; skins.js + ui.js both read characters.vegeta.portrait
  archetypes: ["melee", "transformations"],
  primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 91, defense: 85, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },                                  // foward_attack punch combo
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },                                  // foward_crouch_atttack low strike
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 12, launchVy: -32, selfVy: -9 },   // Up-Attack launcher (uppercut) — BALANCED archetype (Gojo ref)
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },                                 // air_attack aerial combo
    downAir:   { type: "spike", damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },                  // down_air_attack diving spike
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // KIT/HUD METADATA ONLY at Stage 1 — no executeVegetaSpecial handler exists yet,
  // so triggerSpecial/triggerUltimate no-op for vegeta (abilities.js has no case).
  // Declared so the character-select kit panel has data. Wired in Stage 3.
  // STAGE 4 wired in abilities.js executeVegetaSpecial. QCF=Galick Gun (cheapest/fastest),
  // QCB=Final Flash (most committed, hardest-hitting), neutral=Big Bang Attack (mid).
  specials: {
    galickGun:     { cost: 25, damage: 120, startup: 9,  active: 5, recovery: 14, hitstun: 24, knockbackX: 10, knockbackY: -2, motion: "QCF",     effect: "fast purple ki beam" },
    bigBangAttack: { cost: 35, damage: 140, startup: 13, active: 5, recovery: 20, hitstun: 26, knockbackX: 11, knockbackY: -1, motion: "neutral", effect: "spherical ki blast → beam" },
    finalFlash:    { cost: 50, damage: 200, startup: 24, active: 6, recovery: 30, hitstun: 30, knockbackX: 14, knockbackY: -3, motion: "QCB",     effect: "concentrated two-handed beam (his heaviest special)" }
  },
  ultimate: { name: "Super Saiyan Blue Evolution", cost: 100, duration: 8, effect: "Triggers next transformation" },
  transformationOrder: ["base","ssj1","ssj2","ssblue","ssbEvolution","ultraEgo"],
  transformations: {
    base:         { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    // SUPER SAIYAN (regular) — declarative twin of the imperative form system in abilities.js
    // (enterVegetaSSJ / VEGETA_SSJ_* / applyVegetaFormSystem via tickSustainedFormDrain). Continuous
    // energy-drain sustained form: threshold-gated charge-RELEASE entry, per-frame drain, auto-revert
    // at 0 (revertOnEmpty). Buffs sit below the SSJ Rose ceiling (+25/+15/+5) → headroom for SSJ Blue.
    // The mandatory-waypoint chain (Blue must pass through SSJ) lives in ensureVegetaSSJWaypoint.
    ssj:          { damageMultiplier: 1.20, speedMultiplier: 1.12, defenseMultiplier: 1.05, energyThreshold: 120, energyDrainPerFrame: 0.18, kiDrainPerSecond: 11, revertOnEmpty: true, isSpecial: true, skinAnim: "vegetaSSJ" },
    // SUPER SAIYAN BLUE — Vegeta's THIRD form (top tier). Declarative twin of the imperative Blue system
    // (enterVegetaBlue / VEGETA_BLUE_*). Chains OFF the SSJ state (requiresForm: ssj) — NOT reachable from
    // base directly. Buffs clearly above SSJ; higher threshold + drain. Full 3-tier fallback skin.
    ssjBlue:      { damageMultiplier: 1.45, speedMultiplier: 1.25, defenseMultiplier: 1.12, energyThreshold: 160, energyDrainPerFrame: 0.28, kiDrainPerSecond: 17, revertOnEmpty: true, isSpecial: true, requiresForm: "ssj", skinAnim: "vegetaBlue" },
    ssj1:         { damageMultiplier: 1.2, speedMultiplier: 1.1, defenseMultiplier: 1.05, duration: 1800 },
    ssj2:         { damageMultiplier: 1.3, speedMultiplier: 1.15, defenseMultiplier: 1.1, duration: 1500 },
    ssblue:       { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, energyDrainPerFrame: 8 / 60, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ssbEvolution: { damageMultiplier: 2.3, speedMultiplier: 1.5, defenseMultiplier: 1.25, energyDrainPerFrame: 10 / 60, kiDrainPerSecond: 10, isSpecial: true, duration: 600 },
    ultraEgo:     { damageMultiplier: 2.5, speedMultiplier: 1.8, defenseMultiplier: 0.9, rageHealOnHit: 15, healCostPerHitKi: 6, energyDrainPerFrame: 12 / 60, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
  },
  // Two-part intro: intro.png (arms-crossed) → intro_2.png (power-up flare). Sequential
  // P1-then-P2 machine (game.js initIntroVariant/advanceIntroSequence → _introVariant).
  // The intro_2_effects.png aura overlay is a separate composited FX layer — DEFERRED.
  introSequence: ["intro", "intro2"],
  hasSprites: true,
  // idle content ≈55px cell × 2.1 ≈ 116px on-screen — squarely in roster range
  // (Sasuke 116 / Naruto 118 / Goku Black 116). anchorY starts at 0, screenshot-tuned.
  spriteScale: 2.1,
  // FRAME DATA sliced with harness/slice_scan.mjs (alpha-gutter column scan — NOT even
  // sheet-width/count division). Non-uniform strips (jump 9f varying pitch, hit_animation's
  // two wildly-different flinch/knockdown groups, intro pair, charge) were repacked into
  // uniform-cell strips via harness/reslice.mjs → the ./vegeta_base_*_uniform.png files
  // (same "RE-SLICED uniform" tool the Goku Black sheets used).
  animationData: {
    idle:      { frames: 4, width: 51, height: 55, speed: 6, anchorY: 0, sheet: "./vegeta_base_idle.png" },       // scan: 4 islands, pitch ~51
    walk:      { frames: 4, width: 63, height: 50, speed: 6, anchorY: 0, sheet: "./vegeta_base_run.png" },        // reuse run, slower (scan pitch ~63)
    run:       { frames: 4, width: 63, height: 50, speed: 4, anchorY: 0, sheet: "./vegeta_base_run.png" },
    dash:      { frames: 2, width: 70, height: 53, speed: 5, anchorY: 0, sheet: "./vegeta_base_dash.png" },       // scan: 2 islands, pitch 71
    back_dash: { frames: 1, width: 72, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_back_dash.png" }, // SINGLE static held pose (scan: 1 island)
    jump:      { frames: 5, width: 41, height: 82, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_jump_uniform.png" }, // RISE poses (uniform frames 0-4)
    fall:      { frames: 4, width: 41, height: 82, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sourceX: 205, sheet: "./vegeta_base_jump_uniform.png" }, // DESCENT poses (uniform frames 5-8, sourceX 5×41)
    hurt:      { frames: 5, width: 45, height: 64, speed: 6, anchorY: 0, sheet: "./vegeta_base_hurt_uniform.png" },       // standing flinch (hit_animation islands 0-4, repacked)
    knockdown: { frames: 7, width: 71, height: 64, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_knockdown_uniform.png" }, // sprawl→rise (hit_animation islands 5-11, repacked)
    getup:     { frames: 7, width: 71, height: 64, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_knockdown_uniform.png" }, // reuse knockdown; sprite.js splits via knockdownTimer/GETUP_WINDOW
    guard:     { frames: 3, width: 50, height: 69, speed: 6, anchorY: 0, sheet: "./vegeta_base_gaurd.png" },      // scan: 3 islands, pitch ~50
    // STAGE 2 NORMALS — alpha-gutter sliced (slice_scan) then repacked uniform (reslice) from the
    // typo'd source crops. Frame counts confirmed vs design: light 9 / heavy 7 / up 7 / air 6 / down_air 7.
    light:     { frames: 9, width: 68, height: 61, speed: 3, anchorY: 0, sheet: "./vegeta_base_light_uniform.png" },          // foward_attack punch combo (9 islands)
    heavy:     { frames: 7, width: 67, height: 57, speed: 3, anchorY: 0, sheet: "./vegeta_base_heavy_uniform.png" },          // foward_crouch_atttack low strike (7 islands)
    up:        { frames: 7, width: 47, height: 63, speed: 3, anchorY: 0, sheet: "./vegeta_base_up_uniform.png" },             // up_attack uppercut LAUNCHER (7 islands)
    air:       { frames: 6, width: 51, height: 71, speed: 4, anchorY: 0, sheet: "./vegeta_base_air_uniform.png" },            // air_attack aerial combo (6 islands)
    down_air:  { frames: 7, width: 45, height: 66, speed: 4, anchorY: 0, sheet: "./vegeta_base_down_air_uniform.png" },       // down_air_attack.pn diving SPIKE (7 islands)
    // STAGE 3 — command-normal cancel chain ("Y-track"). Fwd+Heavy opener → re-tap Heavy to
    // continue (abilities.js VEGETA_COMMAND / updateVegetaCommandCombat). Keys match the move
    // names so sprite.js renders them directly. Alpha-gutter sliced → uniform.
    vgFkick1:   { frames: 8,  width: 58, height: 68, speed: 2, anchorY: 0, sheet: "./vegeta_base_cmd_fkick_uniform.png" },     // foward_kick opener (8 islands)
    vgSidekick: { frames: 8,  width: 69, height: 73, speed: 2, anchorY: 0, sheet: "./vegeta_base_cmd_sidekick_uniform.png" }, // side_kick (8 islands)
    vgUpInto:   { frames: 14, width: 64, height: 76, speed: 2, anchorY: 0, sheet: "./vegeta_base_cmd_upinto_uniform.png" },   // up_into_foward_attack LAUNCHER (14 islands)
    vgUpFinish: { frames: 8,  width: 60, height: 59, speed: 3, anchorY: 0, sheet: "./vegeta_base_cmd_upfinish_uniform.png" }, // up_attack_2 finisher (8 islands)
    // STAGE 4 — energy-special CHARGE/RELEASE caster poses (abilities.js executeVegetaSpecial sets
    // _spriteCastMove to these). Keys match the cast-move names → sprite.js renders them directly.
    // Final Flash has no dedicated caster crop → it reuses the `charge` power-up pose above.
    galickCast:  { frames: 14, width: 74, height: 84, speed: 2, anchorY: 0, sheet: "./vegeta_base_galick_cast_uniform.png" },  // galick_gun charge→fire (14 islands)
    bigBangCast: { frames: 13, width: 65, height: 72, speed: 2, anchorY: 0, sheet: "./vegeta_base_bigbang_cast_uniform.png" }, // ki_blast_ultimate charge→fire (13 islands)
    // STAGE 6 — FREE (no-energy) cooldown pokes. kiBlast/launchKi are caster poses (_spriteCastMove →
    // projectile via schedulePendingSpawn); exKi/komaRush1/komaFinish/komaRep are melee attack poses
    // (currentMove renders them directly). Alpha-gutter sliced → uniform. NOTE: koma_attack.png (the
    // designed Koma-Rush opener) alpha-slices to blended cyan-spark FX, not clean body poses ("re-crop
    // by hand" per the asset brief) → Koma Rush uses koma_attack_2 (opener) → large_combo (finisher).
    kiBlast:    { frames: 10, width: 51, height: 86, speed: 2, anchorY: 0, sheet: "./vegeta_base_kiblast_tap_uniform.png" }, // ki_blast_basic throw pose (10 islands)
    launchKi:   { frames: 20, width: 51, height: 76, speed: 2, anchorY: 0, sheet: "./vegeta_base_launchki_uniform.png" },   // launch_ki_blast anti-air barrage (20 islands)
    exKi:       { frames: 5,  width: 76, height: 92, speed: 3, anchorY: 0, sheet: "./vegeta_base_exki_uniform.png" },        // basic_ki_attack_2 EX energy punch (5 islands)
    komaRush1:  { frames: 17, width: 57, height: 74, speed: 2, anchorY: 0, sheet: "./vegeta_base_koma2_uniform.png" },       // koma_attack_2 rush opener (17 islands)
    komaFinish: { frames: 42, width: 60, height: 83, speed: 2, anchorY: 0, sheet: "./vegeta_base_komafinish_uniform.png" },  // large_combo_attack finisher (42 islands)
    komaRep:    { frames: 13, width: 58, height: 72, speed: 2, anchorY: 0, sheet: "./vegeta_base_komarep_uniform.png" },     // koma_attack_repeatabl pressure string (13 islands)
    // CHARGE (hold P) — generic power-up aura feeding the Stage-3 energy specials. Wired now
    // so the universal isCharging lockout has art. Two-part: bracing frames 0-3 play ONCE,
    // aura-flare tail frames 4-9 LOOP while held (loopStart=4). Repacked uniform (10 islands).
    charge:    { frames: 10, width: 110, height: 97, speed: 6, anchorY: 0, loop: true, loopStart: 4, sheet: "./vegeta_base_charge_uniform.png" },
    // Two-part intro poses (see introSequence). Play once, hold last frame. intro2 gets the
    // vegeta_base_intro_2_effects aura composited on top via _drawIntroAura (game.js).
    intro:     { frames: 5,  width: 46, height: 73, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_intro_uniform.png" },
    intro2:    { frames: 10, width: 51, height: 75, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_base_intro_2_uniform.png" }
  }
}

// PICCOLO  (rosterKey "piccolo", universe "dragon_ball") — the Namekian warrior-mage. UPGRADED from the old
// dev-only procedural placeholder into a real sprite build. A tall, long-reach VERSATILE mid-ranger: patient
// defense, stretch-arm strikes (real canon Namekian elongation), rising kicks, and a PROCEDURAL ki-beam game
// (Special Beam Cannon / Masenko — the sheet has NO beam art, owner-approved procedural). Source: "3DS - Dragon
// Ball Z_ Extreme Butoden - Fighters - Piccolo.png" (1938×9231). ★GREEN-FILLED cells (like Frieza, not
// row-dividers) → re-sliced feet-aligned to piccolo_*_uniform.png by tools/reslice_piccolo.py using a TIGHT
// cell-fill green key so his GREEN SKIN isn't keyed away. See PICCOLO_ASSET_MAP.md. Owner decisions LOCKED
// (Stage 0): idle = arms-crossed loop / walk BORROWS idle (no walk cycle on the sheet — hover/dash fighter,
// like Frieza) / beam = PROCEDURAL. STAGE 1 = registration + movement/state + anime-face portrait. Normals
// (S2), command chain (S3), specials incl. procedural beam + stretch-arm + flying-kick (S4), win/lose +
// harness/balance (S6) follow. ★TRANSFORMATIONS (Potential Unleashed / Orange Piccolo / Great Namekian) are
// DEFERRED — ZERO transformed-state art exists on this sheet (the primary build blocker); the dormant
// transformation stub below is design-only and must NOT be faked with palette tricks (see PICCOLO_ASSET_MAP §7).
// ★VISION-VERIFIED build session (NOT image-capped): idle/guard/walk-gap classified by direct render; all
//   Stage-1 movement/state picks confirmed on camera. crouch [143] flagged as best-available low pose.
const piccolo = {
  rosterKey: "piccolo", name: "Piccolo", universe: "dragon_ball", color: "#9b59d0",
  portrait: "./piccolo_portrait.png",   // Stage 1 — real anime-face close-up cropped from the sheet's portrait band.
  archetypes: ["melee", "ranged"],
  primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "control", animeMovement: true },
  movement: { dashTeleport: false },
  energyConfig: { label: "Ki", color: "#9b59d0", glowColor: "#c9a2ff", emptyColor: "rgba(255,255,255,0.08)" },
  passive: { name: "Demon King's Discipline", effect: "A tall Namekian warrior-mage — long reach, stretch-arm strikes and procedural ki beams backed by a patient, defensive mid-range game." },
  // Versatile long-reach mid-ranger: sturdy HP, average-plus defense, medium mobility; reach + control carry.
  // Canonically very tall → renders a touch taller than the roster's human fighters (spriteScale below).
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 84, defense: 88, speed: 82, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  // ── Normal-attack DATA (placeholder ~roster-average; real per-move art + tuning lands in Stage 2). All damage
  // runs through GLOBAL_DAMAGE_SCALE (×0.60). Un-mapped attack anims fall back to idle until Stage 2 assigns sheets.
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { type: "launcher", damage: 60, startup: 6, active: 4, recovery: 8, hitstun: 18, knockbackX: 2, knockbackY: -7, launchVy: -32, selfVy: -9 },
    airAttack: { damage: 55, startup: 6, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 9, active: 4, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 28, startup: 7, active: 3, recovery: 14, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  // ── Special DATA (Stage 4) — real behaviour lands in abilities.js; listed here for the move-list UI. Beam
  // is PROCEDURAL (no beam art on the sheet). Stretch-arm + flying-kick specials come from confirmed art.
  specials: {
    specialBeamCannon: { cost: 35, damage: 150, startup: 16, active: 4, recovery: 24, hitstun: 26, knockbackX: 11, knockbackY: -3, effect: "piercing PROCEDURAL ki beam" },
    hellzoneGrenade:   { cost: 30, damage: 100, startup: 14, active: 8, recovery: 24, hitstun: 20, knockbackX: 7, knockbackY: -1, effect: "multi-ki ball attack" }
  },
  hasSprites: true,
  // Tall Namekian (canon ~2.26m, taller than every human on the roster). Live idle frame content ~148px at ×1.0
  // → ×0.90 renders the idle body ~133px on-screen: distinctly taller than the roster's ~111px humans without
  // dwarfing them. anchorY 0 plants feet. Verified via measureSprite in Stage 1 (contentH ≈ 133, un-clipped).
  spriteScale: 0.90,
  animationData: {
    // ── STAGE 1 — MOVEMENT / STATE (reslice'd feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    idle:      { frames: 4, width: 100, height: 168, speed: 8, anchorY: 0, sheet: "./piccolo_idle_uniform.png" },   // CONFIRMED arms-crossed neutral loop
    walk:      { frames: 4, width: 100, height: 168, speed: 8, anchorY: 0, sheet: "./piccolo_idle_uniform.png" },   // ★NO walk cycle on the sheet (hover/dash fighter) → BORROW idle (owner-approved; no fabricated locomotion)
    run:       { frames: 4, width: 100, height: 168, speed: 8, anchorY: 0, sheet: "./piccolo_idle_uniform.png" },   // ★no run art either → BORROW idle (same gap)
    dash:      { frames: 1, width: 114, height: 122, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_dash_uniform.png" },   // forward lean-lunge
    jump:      { frames: 2, width: 82,  height: 198, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_jump_uniform.png" },   // arms-overhead ascent
    fall:      { frames: 1, width: 82,  height: 198, speed: 6, anchorY: 0, sourceX: 82, loop: false, lockLastFrame: true, sheet: "./piccolo_jump_uniform.png" },   // last jump cell held as fall
    crouch:    { frames: 1, width: 90,  height: 92,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_crouch_uniform.png" },  // low ducking crouch (best low pose — flagged)
    guard:     { frames: 2, width: 115, height: 100, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_guard_uniform.png" },   // arms-crossed braced block
    hurt:      { frames: 2, width: 101, height: 121, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_hurt_uniform.png" },    // gut-hit stagger flinch
    knockdown: { frames: 2, width: 170, height: 71,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_knockdown_uniform.png" }, // flat/prone lying
    getup:     { frames: 2, width: 117, height: 109, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_getup_uniform.png" },   // low → rise
    taunt:     { frames: 1, width: 138, height: 154, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./piccolo_taunt_uniform.png" }    // chest-out flex / roar
    // Stages 2–6 append normals / command chain / specials (incl. procedural beam + stretch-arm) / win-lose here.
  },
  // ── TRANSFORMATIONS — DEFERRED (design-only). ZERO transformed-state art exists on this sheet; T2 Orange
  // Piccolo needs a real body-shape change and T3 Great Namekian is a giant-form set-piece — neither can ship
  // faithfully from the base sprite (see PICCOLO_ASSET_MAP §7). Kept as a dormant stub, NOT wired to a working
  // in-match form. Reuse the Frieza-Golden timed-mode architecture ONLY once real tier art exists.
  ultimate: { name: "Transformation (deferred)", cost: 100, duration: 6, effect: "DESIGN-ONLY — Potential Unleashed / Orange Piccolo / Great Namekian tiers need real art before they can ship. Not active." },
  transformationOrder: ["base"],
  transformations: {
    base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 }
  },
  introPool: ["idle"]   // cape/turban-removal intro art exists on the sheet ([145–150]) but is a Stage-6 task; settles to idle for now
}

// FRIEZA  (rosterKey "frieza", universe "dragon_ball") — the Emperor of Universe 7, BASE/FINAL FORM only
// (white body, purple accent markings, long animated tail). UPGRADED from the old dev-only procedural
// placeholder into a real sprite build. An agile TECHNICAL ZONER/RUSHDOWN: fast, hits sharp, but a
// comparatively frail frame (Def below roster-average). Signature ranged game = ki blasts / a pointing
// Death-Beam + a hunched power-up ULTIMATE. ★Golden & Black Frieza are OUT OF SCOPE — they build LATER as
// palette-tier SKINS over this same kit's regions from a separate sheet (NOT transformations; the old
// goldenFrieza transformation was intentionally REMOVED). Source: "3DS - Dragon Ball Z_ Extreme Butoden -
// Fighters - Frieza.png" (2132×7556). ★GREEN-FILLED cells (not row-dividers) → re-sliced feet-aligned to
// frieza_*_uniform.png by tools/reslice_frieza.py. See FRIEZA_ASSET_MAP.md. Owner decisions LOCKED:
// crystals = projectile FX / procedural beam / power-up = ult. STAGE 1 = registration + movement/state +
// anime-face portrait. Normals (S2), command chain (S3), specials incl. beam/Death-Beam (S4), power-up
// ultimate (S5), win/lose + harness/balance (S6) follow.
// ★IMAGE-CAPPED build session: idle loop CONFIRMED; crouch confirmed by height data; walk/run/dash/jump +
//   hurt/knockdown/getup pose-IDs are best-effort region picks — FLAGGED for pixel sign-off next session.
const frieza = {
  rosterKey: "frieza", name: "Frieza", universe: "dragon_ball", color: "#b06fe0",
  portrait: "./frieza_portrait.png",   // Stage 1 — real anime-face close-up cropped from the sheet's portrait row.
  archetypes: ["zoner", "rushdown"],
  primary: "melee", secondary: ["zoner"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  movement: { dashTeleport: false },
  energyConfig: { label: "Ki", color: "#b06fe0", glowColor: "#d9a8ff", emptyColor: "rgba(255,255,255,0.08)" },
  passive: { name: "Emperor's Might", effect: "The Emperor of Universe 7 — sharp, fast, beam-heavy offense from a lithe frame that trades durability for reach and speed." },
  // Glass technical zoner/rushdown: HP + Def below roster-average, offense + mobility carry. Canonically short
  // final form → renders a touch shorter than the tall anime humans (spriteScale below).
  stats: { maxHealth: 1100, maxEnergy: 200, attack: 90, defense: 80, speed: 98, maxJumps: 2, jumpPower: 32, dashSpeed: 21, dashDuration: 10, dashCooldownMax: 26 },
  // ── Normal-attack DATA (placeholder ~roster-average; real per-move art + tuning lands in Stage 2). All
  // damage runs through GLOBAL_DAMAGE_SCALE (×0.60) like every character. Un-mapped attack anims fall back
  // to idle until Stage 2 assigns light/heavy/air sheets.
  basic_attacks: {
    light:    { damage: 42, startup: 4, active: 2, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },  // per-hit 25 (×0.60); fast enough to double-tap under a held button
    heavy:    { damage: 80, startup: 8, active: 3, recovery: 17, hitstun: 19, knockbackX: 6, knockbackY: 1, rangeX: 88, rangeY: 44 },
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 3, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, airOK: false },
    airAttack:{ damage: 52, startup: 4, active: 2, recovery: 9,  hitstun: 12, knockbackX: 4, knockbackY: -2 },
    downAir:  { damage: 60, startup: 5, active: 3, recovery: 11, hitstun: 16, knockbackX: 2, knockbackY: 6 },
    grab:     { damage: 28, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // ── Special DATA (Stage 4) — behaviour + real numbers live in abilities.js FRIEZA_SPECIALS; listed here for
  // the move-list UI. Directional branch: neutral=Death Beam / Fwd,U,air=Ki Blast / Down=Death Ball / Back=Teleport.
  specials: {
    deathBeam:    { cost: 22, isSpecial: true, effect: "Death Beam (neutral) — fast thin PIERCING procedural ki-beam" },
    kiBlast:      { cost: 24, isSpecial: true, effect: "Ki Blast (Fwd/Up/air) — rapid 3-shot crystal-sprite volley" },
    deathBall:    { cost: 45, isSpecial: true, effect: "Death Ball (Down) — big slow heavy energy sphere" },
    psychoTeleport:{ cost: 28, isSpecial: true, effect: "Psycho Teleport (Back) — i-frame blitz dash-strike" }
  },
  hasSprites: true,
  // idle silhouette ~130px tall at ×1.0 (the long up-curled tail inflates the bbox above the head) → ×0.88
  // renders ~120px including tail / ~95px body-only: canon-appropriately a touch shorter than the roster's
  // full-size humans. anchorY 0 plants feet. Verified via measureSprite in Stage 1 (contentH lands in-band).
  spriteScale: 0.88,
  animationData: {
    // ── STAGE 1 — MOVEMENT / STATE (reslice'd feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    idle:      { frames: 3, width: 96,  height: 147, speed: 8, anchorY: 0, sheet: "./frieza_idle_uniform.png" },          // ★AUDIT-CORRECTED: clean 3-frame neutral tail-sway loop (old [18..23] had hand-to-face reactions + a taunt)
    walk:      { frames: 3, width: 96,  height: 147, speed: 8, anchorY: 0, sheet: "./frieza_idle_uniform.png" },          // ★AUDIT: NO walk cycle exists on the sheet (hover/dash fighter) → BORROW idle (honest gap, no fabricated locomotion)
    run:       { frames: 3, width: 96,  height: 147, speed: 8, anchorY: 0, sheet: "./frieza_idle_uniform.png" },          // ★AUDIT: no run art either → BORROW idle (same gap)
    dash:      { frames: 1, width: 132, height: 125, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_dash_uniform.png" }, // FLAGGED forward lean-lunge
    jump:      { frames: 2, width: 84,  height: 170, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_jump_uniform.png" }, // FLAGGED tall vertical reach
    fall:      { frames: 1, width: 84,  height: 170, speed: 6, anchorY: 0, sourceX: 84, loop: false, lockLastFrame: true, sheet: "./frieza_jump_uniform.png" }, // last jump cell held as fall
    crouch:    { frames: 3, width: 122, height: 91,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_crouch_uniform.png" }, // confirmed-by-height low frames
    hurt:      { frames: 2, width: 127, height: 108, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_hurt_uniform.png" },      // FLAGGED stagger flinch
    knockdown: { frames: 2, width: 146, height: 54,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_knockdown_uniform.png" }, // FLAGGED flat/prone
    getup:     { frames: 2, width: 110, height: 61,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_getup_uniform.png" },     // FLAGGED low → rise
    taunt:     { frames: 4, width: 125, height: 117, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_taunt_uniform.png" },     // FLAGGED arms-crossed confident gesture
    // ── STAGE 2 — normals + guard (render by move name; basic_attacks data above; all dmg ×0.60 GLOBAL_DAMAGE_SCALE). ──
    light:    { frames: 2, width: 146, height: 102, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_light_uniform.png" },  // FLAGGED quick forward punch/jab
    heavy:    { frames: 1, width: 156, height: 103, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_heavy_uniform.png" },  // CONFIRMED motion-streak kick (white trail)
    up:       { frames: 1, width: 156, height: 103, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_heavy_uniform.png" },  // HONEST REUSE of heavy (no upward art) — launcher-typed
    air:      { frames: 1, width: 100, height: 148, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_air_uniform.png" },    // FLAGGED airborne attack
    down_air: { frames: 1, width: 100, height: 148, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_air_uniform.png" },    // HONEST REUSE of air
    guard:    { frames: 1, width: 122, height: 108, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_guard_uniform.png" },  // FLAGGED arms-crossed brace
    // ── STAGE 3 — command chain: Fwd+Heavy 3-stage rush rekka (rendered by move name; FRIEZA_CMD data in abilities.js). ──
    friezaRush1: { frames: 4, width: 143, height: 105, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_rush1_uniform.png" }, // opener (forward strike string)
    friezaRush2: { frames: 4, width: 126, height: 111, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_rush2_uniform.png" }, // rapid follow strikes
    friezaRush3: { frames: 3, width: 167, height: 106, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_rush3_uniform.png" }, // launcher finisher
    // ── STAGE 4 — special cast poses (rendered by _spriteCastMove; real DATA in abilities.js FRIEZA_SPECIALS). ──
    friezaDeathbeam: { frames: 2, width: 106, height: 118, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_deathbeam_uniform.png" }, // Death Beam pointing cast
    friezaKiblast:   { frames: 2, width: 92,  height: 97,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_kiblast_uniform.png" },   // Ki Blast firing cast (air reuses)
    friezaDeathball: { frames: 2, width: 105, height: 132, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_deathball_uniform.png" }, // Death Ball charge cast
    friezaTeleport:  { frames: 1, width: 132, height: 125, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_dash_uniform.png" },       // Psycho Teleport (HONEST REUSE of dash lunge)
    // ── TRANSFORM POSE (hunched power-up stance, boxes 118–120) — the shared cast pose for BOTH the Golden
    //    Frieza ignite AND the Black Frieza ultimate cinematic (via _spriteCastMove = "friezaOverload"). ──
    friezaOverload:  { frames: 3, width: 155, height: 140, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_overload_uniform.png" },   // power-up ignite / transform cast
    // ── STAGE 6 — win / lose poses. WIN = band-L standing victory stance; LOSE = REUSE knockdown (no dedicated lose art — flagged). ──
    win:  { frames: 3, width: 97,  height: 117, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_win_uniform.png" },       // victory: confident standing stance
    lose: { frames: 2, width: 146, height: 54,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./frieza_knockdown_uniform.png" }  // REUSE knockdown (flagged)
  },
  // ── TRANSFORMATIONS (real in-match forms; NOT skins). base → GOLDEN → BLACK ladder, SAME mechanic as
  // Vegeta / Goku Black: threshold-gated on the CHARGE button (hold-release steps up, tap reverts), a
  // continuous per-frame Ki DRAIN pays for the form, and it auto-reverts the instant Ki hits 0. A Dragon Ball
  // transform is an all-around DMG+SPD+DEF boost bought with energy drain. Logic in abilities.js
  // (enterGoldenFrieza / enterBlackFrieza / applyFriezaFormSystem); art = a canvas tint (sprite.js). NO
  // separate ultimate — reaching Black IS the payoff (Vegeta has no ultimate either).
  transformationOrder: ["base", "golden", "black"],
  transformations: {
    base:   { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    golden: { damageMultiplier: 1.25, speedMultiplier: 1.18, defenseMultiplier: 1.08, energyThreshold: 100, energyDrainPerFrame: 0.18, kiDrainPerSecond: 11, revertOnEmpty: true, isSpecial: true },                        // Golden Frieza — Vegeta-SSJ tier
    black:  { damageMultiplier: 1.50, speedMultiplier: 1.32, defenseMultiplier: 1.15, energyThreshold: 150, energyDrainPerFrame: 0.30, kiDrainPerSecond: 18, revertOnEmpty: true, requiresForm: "golden", isSpecial: true },  // Black Frieza — ceiling tier (chains off Golden)
  },
  ultimate: { name: "Golden / Black Frieza", cost: 0, description: "No separate ultimate — Frieza's power ceiling is the base → GOLDEN → BLACK transformation ladder on the Charge button (hold-release to step up, tap to revert). Each form boosts damage, speed & defense but continuously DRAINS Ki and reverts when empty (same as Vegeta / Goku Black)." },
  introPool: ["idle"]   // no dedicated intro art identified yet (Stage 6 gap) — settles to idle
}

const cell = {
  rosterKey: "cell", name: "Cell", universe: "dragon_ball", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "absorb"],
  primary: "melee", secondary: ["absorb"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1300, maxEnergy: 170, attack: 94, defense: 90, speed: 82, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 9, active: 4, recovery: 19, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { type: "launcher", damage: 75, startup: 5, active: 4, recovery: 9, hitstun: 21, knockbackX: 2, knockbackY: -8, launchVy: -33, selfVy: -9 },   // Up-Attack launcher — HEAVY archetype (Toji ref); tanky absorber
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 85, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 35, startup: 6, active: 4, recovery: 16, hitstun: 22, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    kamehameha:      { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "ki blast" },
    solarKamehameha: { cost: 40, damage: 160, startup: 18, active: 6, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "stronger ki blast" }
  },
  ultimate: { name: "Perfect Cell", cost: 100, duration: 8, effect: "Max attack, speed, and ki regen" },
  transformationOrder: ["base","perfectCell"],
  transformations: {
    base:        { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    perfectCell: { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.3, energyDrainPerFrame: 5 / 60, kiDrainPerSecond: 5, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// JUJUTSU KAISEN
// ─────────────────────────────────────────────────────────────────
const gojo = {
  rosterKey: "gojo", name: "Gojo Satoru", universe: "jujutsu_kaisen",
  homeStage: "Shibuya Incident",   // Stage 23: explicit home-stage override (else derived by universe→series)
  // Arcade BOSS profile (Stage 20). Applied ONLY when Gojo is the arcade final-boss opponent
  // (createFighter strips it in normal play, so vs-Gojo is a fair, normal fighter). Gojo has no
  // giant form, so his boss-ness is stat-based: 2× HP, visibly larger, super-armor vs light hits,
  // free specials, impossible AI, single round. See _applyBossProfile in game.js.
  bossProfile: { healthMult: 2.0, scale: 1.4, superArmorThreshold: 55, meterFree: true, aiDifficulty: "impossible", noRoundLimit: true },
  portrait: "./gojo_portrait.png",   // EXACT on-disk filename (case + extension)
  archetypes: ["ranged", "melee"],
  primary: "ranged", secondary: ["melee"],
  movement: { dashTeleport: true },   // double-tap toward = teleport-dash (blink behind)
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1160, maxEnergy: 220, attack: 91, defense: 88, speed: 87, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 8, dashCooldownMax: 35 },
  hasSprites: true,
  // Source frames are small pixel art (idle 28×64); scale the DRAWN size up ×1.8
  // (64 → ~115px ≈ hitbox height) so Gojo reads as a full-size fighter over the
  // ~60×110 hitbox. Applied in SpriteHandler.draw() to the DESTINATION size only
  // — native slicing is unchanged. (Drop to 1.6 if too tall, raise to 2.0 if short.)
  spriteScale: 1.8,
  // Strip-based sprites load via spritesheets.js SPRITE_MANIFEST (./gojo_<action>_sheet.png).
  // (spriteSheet below is a legacy atlas hint, unused by the strip loader.)
  spriteSheet: "assets/gojo_atlas.png",
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    // Up-Attack launcher "Rising Palm" (BALANCED reference archetype): startup 6 / active 4 /
    // recovery 8; launches enemy at vy -32 (Balanced tier — the roster's mid launch height). launchVy is
    // honored EXACTLY now that it's more negative than the LAUNCH_FLOOR (-30); selfVy is unused post-1b
    // (attacker stays grounded, jump-cancels to convert). Fast tier -30 (lowest) → Heavy-tank -34 (highest).
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launchVy: -32, selfVy: -9 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -5 }
  },
  specials: {
    blue:         { cost: 30, damage: 110, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -2, effect: "attraction singularity" },
    red:          { cost: 40, damage: 130, startup: 14, active: 5, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "repulsion singularity" },
    hollowPurple: { cost: 70, damage: 200, startup: 20, active: 6, recovery: 30, hitstun: 32, knockbackX: 14, knockbackY: -4, effect: "convergence of blue and red" }
  },
  ultimate: { name: "Unlimited Void", cost: 100, duration: 10, effect: "Domain expansion; Infinity auto-dodge" },
  domain: { name: "Unlimited Void", priority: 3, background: "void" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // ── GOJO SPRITES ──────────────────────────────────────────────────
  // Keyed to the engine's REAL action names (sprite.js _resolveAction /
  // MOVE_TO_ACTION) so the strips actually play. Each entry: native SOURCE cell
  // size (width×height, measured = stripWidth/frames), frame count, speed, and
  // the exact `sheet` file. animationProfile.js forwards `sheet` → SpriteHandler
  // _loadSheet(), so the non-convention filenames load directly (e.g. light uses
  // the A-jab strip, "up" uses the B-attack strip gojo_light). Display size is
  // scaled by gojo.spriteScale; the box fallback covers any unmapped/404 action.
  animationData: {
    // movement / state
    idle:     { frames: 4, width: 28, height: 64, speed: 6, sheet: "./gojo_idle_sheet.png"  },
    walk:     { frames: 8, width: 34, height: 63, speed: 5, sheet: "./gojo_walk_sheet.png"  },
    run:      { frames: 8, width: 34, height: 63, speed: 4, sheet: "./gojo_walk_sheet.png"  },
    jump:     { frames: 2, width: 45, height: 63, speed: 6, sheet: "./gojo_jump_sheet.png"  },
    fall:     { frames: 2, width: 45, height: 63, speed: 6, sheet: "./gojo_jump_sheet.png"  },
    dash:     { frames: 1, width: 65, height: 42, speed: 6, sheet: "./gojo_dash_sheet.png"  },
    hurt:     { frames: 6, width: 72, height: 62, speed: 6, sheet: "./gojo_hurt_sheet.png"  },
    // basic attacks
    light:    { frames: 6, width: 49, height: 63, speed: 4, sheet: "./gojo_ajab_sheet.png"  },  // A jab
    heavy:    { frames: 5, width: 55, height: 59, speed: 5, sheet: "./gojo_heavy_sheet.png" },  // C
    up:       { frames: 5, width: 56, height: 62, speed: 5, sheet: "./gojo_light_sheet.png" },  // B (launcher)
    air:      { frames: 6, width: 49, height: 63, speed: 4, sheet: "./gojo_ajab_sheet.png"  },  // reuse jab (air)
    down_air: { frames: 5, width: 55, height: 59, speed: 5, sheet: "./gojo_heavy_sheet.png" },  // reuse C (down)
    grab:     { frames: 6, width: 49, height: 63, speed: 5, sheet: "./gojo_ajab_sheet.png"  },  // reuse jab
    // cinematic / specials
    transform:          { frames: 5, width: 42, height: 64, speed: 6, sheet: "./gojo_intro_sheet.png", loop: false, lockLastFrame: true },  // intro: play once, hold (FIX_3)
    // TAUNT: enrolls Gojo in the EXISTING universal taunt system (game.js updateTauntState) — the
    // SAME hold-Down-10s → heal-50%-current-HP-if-untouched reward Rick/Goku Black use. Defining this
    // action is the entire gate (updateTauntState is a no-op without animationData.taunt). Placeholder
    // pose reuses the intro coat-throw flex (no dedicated taunt sheet yet); 5×22 ≈ 110-frame committed
    // window matches Rick's 27×4 / Goku Black's 4×27. Under the "Limitless" skin the commit also fires
    // the 59-line young-Gojo taunt voice pool (skin-gated via gojoVoice.js pickSkinVoice); base skin
    // taunts silently but still heals. Flows to the gojo2 skin automatically (skins.js buildComplete).
    taunt:              { frames: 5, width: 42, height: 64, speed: 22, sheet: "./gojo_intro_sheet.png", loop: false, lockLastFrame: true },
    ultimate:           { frames: 3, width: 39, height: 64, speed: 6, sheet: "./gojo_ultimate_sheet.png" },
    domain:             { frames: 4, width: 37, height: 64, speed: 6, sheet: "./gojo_domain_sheet.png" },  // Unlimited Void HAND-SIGN (NOT the gojo_intro coat-throw)
    blue_cast:          { frames: 5, width: 50, height: 64, speed: 5, sheet: "./gojo_max_output_blue_sheet.png" },
    red_cast:           { frames: 5, width: 56, height: 62, speed: 5, sheet: "./gojo_ctr_attack_sheet.png" },
    hollow_purple_cast: { frames: 1, width: 37, height: 99, speed: 5, sheet: "./gojo_hollowpurple_cast_sheet.png" },  // repointed 2026-07-30: the old _release_ sheet did NOT exist on disk (rendered a fallback box); this on-disk cast pose (single 37x99 frame, transparency-repaired) is the real art
    // CHARGE strips (Task 1b) — played briefly before the cast strip. Dims MEASURED
    // from the PNGs (frames via alpha-gutter detection, cell = stripWidth/frames).
    blue_charge:          { frames: 4, width: 45, height: 64, speed: 4, sheet: "./gojo_lapse_blue_sheet.png" },          // 180x64
    red_charge:           { frames: 5, width: 50, height: 63, speed: 4, sheet: "./gojo_ctr_charge_sheet.png" },          // 250x63
    hollow_purple_charge: { frames: 7, width: 36, height: 71, speed: 4, sheet: "./gojo_hollowpurple_charge_sheet.png" }  // 252x71
  }
}

const sukuna = {
  rosterKey: "sukuna", name: "Sukuna", universe: "jujutsu_kaisen",
  portrait: "./sukuna_portrait.jpg",   // EXACT on-disk filename (case + extension)
  archetypes: ["melee", "curse"],
  primary: "melee", secondary: ["curse"],
  movement: { dashTeleport: true },   // double-tap toward = teleport-dash (blink behind)
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "damage", animeMovement: true },
  stats: { maxHealth: 1240, maxEnergy: 210, attack: 95, defense: 87, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 100, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 40, startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 6, throwForceY: -4 }
  },
  specials: {
    cleave:    { cost: 40, damage: 160, startup: 10, active: 6, recovery: 20, hitstun: 28, knockbackX: 11, knockbackY: -3, effect: "slashing cursed technique" },
    dismantle: { cost: 35, damage: 140, startup: 10, active: 5, recovery: 20, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "ranged slashing attack" }
  },
  ultimate: { name: "Malevolent Shrine", cost: 100, duration: 10, effect: "Domain expansion" },
  domain: { name: "Malevolent Shrine", priority: 4, background: "shrine" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  // Source frames are small pixel art (idle 27×64); scale the DRAWN size up ×1.8
  // (64 → ~115px ≈ hitbox height). Applied in SpriteHandler.draw() to the
  // DESTINATION size only — native slicing is unchanged.
  spriteScale: 1.8,
  // ── SUKUNA SPRITES ────────────────────────────────────────────────
  // Keyed to the engine's REAL action names (sprite.js _resolveAction /
  // MOVE_TO_ACTION). Each entry: native SOURCE cell size (width×height =
  // stripWidth/frames), frame count, speed, and the exact `sheet` file
  // (forwarded to SpriteHandler via animationProfile.js → _loadSheet). Only one
  // attack strip exists, so light/heavy/up/air/down_air/grab + cleave/dismantle
  // all reuse it for now. Display size is scaled by spriteScale; unmapped actions
  // fall back to the procedural box.
  animationData: {
    // movement / state
    idle:     { frames: 4,  width: 27, height: 64, speed: 6, sheet: "./sukuna_idle_sheet.png" },
    walk:     { frames: 10, width: 31, height: 63, speed: 5, sheet: "./sukuna_walk_sheet.png" },
    run:      { frames: 10, width: 31, height: 63, speed: 4, sheet: "./sukuna_walk_sheet.png" },
    jump:     { frames: 2,  width: 28, height: 61, speed: 6, sheet: "./sukuna_jump_sheet.png" },
    fall:     { frames: 2,  width: 28, height: 61, speed: 6, sheet: "./sukuna_jump_sheet.png" },
    dash:     { frames: 3,  width: 52, height: 59, speed: 6, sheet: "./sukuna_dash_sheet.png" },
    hurt:     { frames: 2,  width: 42, height: 57, speed: 6, sheet: "./sukuna_hurt_sheet.png" },
    // attacks (single attack strip reused until distinct strips exist)
    light:    { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    heavy:    { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    up:       { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    air:      { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    down_air: { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    grab:     { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    cleave:   { frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    dismantle:{ frames: 3, width: 51, height: 51, speed: 4, sheet: "./sukuna_attack_sheet.png" },
    // cinematic
    ultimate: { frames: 4, width: 37, height: 62, speed: 6, sheet: "./sukuna_ultimate_sheet.png" },
    domain:   { frames: 7, width: 36, height: 62, speed: 5, sheet: "./sukuna_domain_sheet.png" },
    // Flame Arrow CHARGE → FIRE strips (Task 1b). Dims MEASURED from the PNGs.
    flame_arrow_charge: { frames: 7, width: 36, height: 62, speed: 4, sheet: "./sukuna_firearrow_charge_sheet.png" }, // 252x62
    flame_arrow_fire:   { frames: 4, width: 59, height: 62, speed: 5, sheet: "./sukuna_firearrow_fire_sheet.png" }    // 236x62
  }
}

// ── ALTERNATE SUKUNA (rosterKey alt_sukuna) ─────────────────────────────────
// A SEPARATE character from `sukuna` above: an alternate-universe Ryomen Sukuna built from a
// DIFFERENT source rip (Cinontk sprites / Bitsverse644 sheet, sukuna_row_01..10.png). Full pixel
// audit + Stage-0 reconciliation: SUKUNA_ASSET_MAP.md. Owner-locked design: honest modest kit
// (Domain Expansion = ultimate, energy beam = special, borrow existing-sukuna FX for gaps).
// STAGE 1 = registration + movement/state ONLY. basic_attacks/specials/ultimate stat blocks are
// PROVISIONAL scaffolding (finalized Stages 2/4/5); no attack sprite sheets yet → normals fall back
// to the procedural box until Stage 2. Movement sheets = tools/reslice_alt_sukuna.py (_uniform).
const altSukuna = {
  rosterKey: "alt_sukuna", name: "Alternate Sukuna", universe: "jujutsu_kaisen",
  portrait: "./alt_sukuna_portrait.png",   // EXACT on-disk filename — bust from row_03 reference render
  archetypes: ["melee", "curse"],
  primary: "melee", secondary: ["curse"],
  movement: { dashTeleport: true },   // dash art is a cursed-energy blur → double-tap toward = teleport-dash
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "damage", animeMovement: true },
  // PROVISIONAL stats — audited in Stage 6 against BALANCE_AUDIT.md.
  stats: { maxHealth: 1200, maxEnergy: 200, attack: 93, defense: 86, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  // PROVISIONAL basic_attacks (finalized Stage 2 from the real attack-string art).
  basic_attacks: {
    light:     { damage: 48, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 96, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 72, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 66, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 86, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 38, startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 6, throwForceY: -4 }
  },
  // PROVISIONAL specials (finalized Stage 4: energy beam + spin-kick + short grab; Cleave string Stage 3).
  specials: {
    cleave: { cost: 40, damage: 150, startup: 10, active: 6, recovery: 20, hitstun: 28, knockbackX: 11, knockbackY: -3, effect: "wide cursed slash" }
  },
  ultimate: { name: "Malevolent Shrine", cost: 100, duration: 10, effect: "Domain expansion" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  spriteScale: 1.8,   // idle source cell 25×62 ≈ existing Sukuna → ×1.8 ⇒ ~112px on-screen
  // ── ALTERNATE SUKUNA SPRITES (STAGE 1: movement / state only) ──────────────
  // Keyed to the engine's real action names (sprite.js _resolveAction / MOVE_TO_ACTION). Feet-aligned
  // uniform cells (anchorY:0). Attack/special/cinematic keys deliberately omitted until Stages 2-5.
  animationData: {
    idle:  { frames: 3, width: 25, height: 62, speed: 6, anchorY: 0, sheet: "./alt_sukuna_idle_uniform.png" },   // "Stand:" band (row_02)
    walk:  { frames: 6, width: 52, height: 61, speed: 5, anchorY: 0, sheet: "./alt_sukuna_walk_uniform.png" },
    run:   { frames: 6, width: 52, height: 61, speed: 4, anchorY: 0, sheet: "./alt_sukuna_walk_uniform.png" },    // no distinct run art → reuse walk (faster)
    dash:  { frames: 2, width: 38, height: 49, speed: 5, anchorY: 0, sheet: "./alt_sukuna_dash_uniform.png" },
    crouch:{ frames: 3, width: 29, height: 38, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_crouch_uniform.png" },
    jump:  { frames: 3, width: 61, height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_jump_uniform.png" },   // prep+rise
    fall:  { frames: 3, width: 29, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_fall_uniform.png" },   // apex+descend+land
    guard: { frames: 1, width: 37, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_guard_uniform.png" },
    hurt:      { frames: 3, width: 36, height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_hurt_uniform.png" },
    knockdown: { frames: 2, width: 57, height: 31, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_knockdown_uniform.png" },
    getup:     { frames: 1, width: 36, height: 39, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_getup_uniform.png" },
    // ── STAGE 2 normals (row_02 attack bands; Cleave-string crescents + beam/spin/grab RESERVED for S3-4) ──
    light:    { frames: 3, width: 27, height: 58, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_light_uniform.png" },   // b15-R quick jabs (no FX)
    heavy:    { frames: 3, width: 37, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_heavy_uniform.png" },   // b14-L overhead smash
    up:       { frames: 4, width: 40, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_up_uniform.png" },      // b17 rising cleave-arc launcher
    air:      { frames: 2, width: 67, height: 57, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_air_uniform.png" },     // b18-L airborne punch
    down_air: { frames: 2, width: 67, height: 57, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_air_uniform.png" },     // REUSE air (no distinct down-aerial art) — FLAG
    grab:     { frames: 3, width: 44, height: 53, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_grab_uniform.png" },     // row_03 grab-hold (real art; also the Down cursed-grab special pose)
    // ── STAGE 3 Dismantle/Cleave command-string (Fwd+Heavy rekka; b15-L red-crescent frames) ──
    altSukunaCleave1: { frames: 3, width: 54, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_cleave1_uniform.png" },   // crescent #1 opener
    altSukunaCleave2: { frames: 3, width: 55, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_cleave2_uniform.png" },   // crescent #2 finisher
    // ── STAGE 4 specials cast poses (beam / spin-kick; grab reuses the `grab` pose above) ──
    altSukunaBeam:     { frames: 4, width: 68, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_beam_uniform.png" },      // Fūga Fire Arrow charge→thrust
    altSukunaSpinkick: { frames: 4, width: 64, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_spinkick_uniform.png" },  // Spinning Lunge Kick
    // ── STAGE 5 ULTIMATE — Domain Expansion hand-sign charge (held through the Malevolent Shrine cinematic) ──
    altSukunaUltCharge: { frames: 5, width: 29, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_ultcharge_uniform.png" },
    // ── STAGE 6 — intro (row_01 flourish) + win (row_03 mocking-laugh taunt; ghost-afterimage FX deferred) ──
    intro: { frames: 13, width: 41, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_intro_uniform.png" },
    win:   { frames: 3,  width: 64, height: 56, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./alt_sukuna_win_uniform.png" }
  }
}

// ── AOI TODO (rosterKey aoi_todo) ───────────────────────────────────────────
// Jujutsu Kaisen. Built from 2 sheets (aoitodo_row_01.png / row_02.png, GREEN chroma-key) by
// "akuma animation (with edits/palette improvements by MichelST)". Full audit + Stage-0 owner
// decisions: AOI_TODO_ASSET_MAP.md. Centerpiece (Stage 5) = Boogie Woogie TAG-PARTNER swap — Todo
// coexists on-field with cameos Yuji &/or Gojo; the Clap swaps POSITIONS (self / cameo / opponent),
// call in one/both, co-op combos; Black Flash timing-window bonus; row_02 gun/whip/armor as specials;
// ULT = maximized three-way Black Flash. energyType "boogie" = a bespoke meter that gates the whole
// Clap/cameo economy (self-contained + tunable), NOT JJK cursed_energy.
// STAGE 1 = registration + movement/state ONLY. basic_attacks/specials/ultimate are PROVISIONAL
// scaffolding (finalized Stages 2/4/5); no attack sheets yet → normals fall back to the procedural
// box until Stage 2. Movement sheets = tools/reslice_aoi_todo.py (_uniform).
const aoiTodo = {
  rosterKey: "aoi_todo", name: "Aoi Todo", universe: "jujutsu_kaisen",
  portrait: "./aoi_todo_portrait.png",   // EXACT on-disk filename — bust from idle frame 0 (Stage-7 may swap to the sheet's ref busts)
  archetypes: ["melee", "assist"],
  primary: "melee", secondary: ["assist"],
  traits: { hasEnergy: true, energyType: "boogie", mobility: "medium", scaling: "damage", animeMovement: true },
  // PROVISIONAL stats — audited in Stage 7 against BALANCE_AUDIT.md (★cameo co-op = Megumi-outlier risk class).
  stats: { maxHealth: 1240, maxEnergy: 200, attack: 95, defense: 86, speed: 90, maxJumps: 2, jumpPower: 31, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  // PROVISIONAL basic_attacks (finalized Stage 2 from the real punch/kick-string art).
  basic_attacks: {
    light:     { damage: 46, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 94, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 62, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 84, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 36, startup: 5, active: 3, recovery: 13, hitstun: 22, throwForceX: 6, throwForceY: -4 }
  },
  // PROVISIONAL special (finalized Stage 4: spin-backfist/flying-kick/dive-kick + gun/whip/armor-charge).
  specials: {
    boogiePlaceholder: { cost: 30, damage: 120, startup: 10, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -1, effect: "provisional — replaced Stage 4" }
  },
  ultimate: { name: "Maximum: Black Flash", cost: 100, duration: 10, effect: "guaranteed Black Flash during a three-way cameo combo" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  spriteScale: 1.9,   // idle source cell 36×74 (content ~72px) ⇒ ~137px on-screen (big physical bruiser)
  // ── AOI TODO SPRITES (STAGE 1: movement / state only) ──────────────────────
  // Keyed to the engine's real action names (sprite.js _resolveAction / MOVE_TO_ACTION). Feet-aligned
  // uniform cells (anchorY:0). Attack/special/cinematic keys deliberately omitted until Stages 2-5.
  animationData: {
    idle:  { frames: 6, width: 36, height: 74, speed: 6, anchorY: 0, sheet: "./aoi_todo_idle_uniform.png" },
    walk:  { frames: 8, width: 56, height: 66, speed: 5, anchorY: 0, sheet: "./aoi_todo_run_uniform.png" },   // no distinct walk art → reuse run/dash sheet (slower playback)
    run:   { frames: 8, width: 56, height: 66, speed: 4, anchorY: 0, sheet: "./aoi_todo_run_uniform.png" },
    dash:  { frames: 8, width: 56, height: 66, speed: 3, anchorY: 0, sheet: "./aoi_todo_run_uniform.png" },   // no distinct dash art → reuse run (faster)
    crouch:{ frames: 4, width: 53, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_crouch_uniform.png" },   // squat crouch-guard
    jump:  { frames: 4, width: 48, height: 77, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_jump_uniform.png" },     // prep+rise+apex
    fall:  { frames: 4, width: 44, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_fall_uniform.png" },     // descend+land
    guard: { frames: 5, width: 43, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_guard_uniform.png" },    // arms-crossed standing block
    hurt:      { frames: 4, width: 51, height: 69, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_hurt_uniform.png" },
    knockdown: { frames: 4, width: 84, height: 65, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_knockdown_uniform.png" },   // tumble→lie→flat
    getup:     { frames: 2, width: 48, height: 61, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_getup_uniform.png" },
    // ── STAGE 2 NORMALS (discrete single moves; combo STRINGS + spin/kick FX art reserved for S3/S4) ──
    light:    { frames: 3, width: 46, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_light_uniform.png" },        // quick jab/cross (band3)
    heavy:    { frames: 3, width: 53, height: 67, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_heavy_uniform.png" },        // committed cross (band4)
    up:       { frames: 2, width: 62, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_up_uniform.png" },           // vertical axe-kick launcher (band6)
    air:      { frames: 2, width: 48, height: 77, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_air_uniform.png" },          // flying knee (band7)
    down_air: { frames: 2, width: 48, height: 77, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_air_uniform.png" },          // REUSE air (dive art reserved for S4 dive special) — FLAG
    crouchLight: { frames: 2, width: 57, height: 45, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_crouchlight_uniform.png" }, // crouched low punch (band5); auto-swapped by _setCrouchVariant
    // ── STAGE 3 COMMAND CHAIN (Fwd+Heavy 3-stage rekka: elbow → hook/uppercut → roundhouse launcher) ──
    todoCombo1: { frames: 2, width: 46, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_combo1_uniform.png" },   // ELBOW opener (band4)
    todoCombo2: { frames: 3, width: 57, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_combo2_uniform.png" },   // hook/uppercut mid (band3-B)
    todoCombo3: { frames: 2, width: 81, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_combo3_uniform.png" },   // spinning ROUNDHOUSE launcher finisher (band6-R)
    // ── STAGE 4 SPECIALS (N=Gun cast pose / F=Fire Kick / B=Whip / D=Spin Backfist / U=Armor buff / air=Dive) ──
    todoGun:      { frames: 2, width: 44, height: 66, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_gun_uniform.png" },       // Todo straight-arm pose (bullet is procedural)
    todoFireKick: { frames: 3, width: 68, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_firekick_uniform.png" },  // flying fire kick (row_02 band3)
    todoWhip:     { frames: 4, width: 112, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_whip_uniform.png" },      // red-ribbon whip swing (row_02 band2)
    todoSpin:     { frames: 3, width: 69, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_spin_uniform.png" },       // spinning backfist (sheet1 band5)
    todoArmor:    { frames: 4, width: 34, height: 78, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_armor_uniform.png" },      // cross→charge→transform→armored (row_02 band1)
    todoDive:     { frames: 2, width: 66, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_dive_uniform.png" },       // diving spike kick (sheet1 band7)
    // ── STAGE 5 Boogie Woogie CLAP pose — REUSES the guard (arms-crossed) frame (no dedicated clap art) — FLAG ──
    todoClap:     { frames: 5, width: 43, height: 72, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_guard_uniform.png" },
    // ── STAGE 7 WIN / LOSE (row_02 band4, REAL art). win = arms-cross victory + chibi thought-bubble (the Boogie
    //    Woogie "ideal woman" gag). lose = arms-crossed + building blue eye-glow (defiant, NOT slumped — audit was wrong, flagged). ──
    win:  { frames: 4, width: 100, height: 105, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_win_uniform.png" },
    lose: { frames: 4, width: 32,  height: 72,  speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./aoi_todo_lose_uniform.png" }
  }
}

const omololu = {
  rosterKey: "omololu", name: "Omololu", universe: "original", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "analysis"],
  primary: "melee", secondary: ["analysis"],
  traits: { hasEnergy: true, energyType: "stamina", mobility: "medium", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1210, maxEnergy: 180, attack: 88, defense: 90, speed: 80, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 44, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 84, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 68, startup: 8, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 58, startup: 6, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 74, startup: 9, active: 4, recovery: 14, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 7, active: 3, recovery: 15, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  specials: {
    analysisStrike: { cost: 30, damage: 130, startup: 12, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -1, effect: "reads opponent pattern and strikes weak point" }
  },
  ultimate: { name: "Full Analysis", cost: 100, duration: 8, effect: "Damage multiplier stacks each hit for 8s" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// NARUTO
// ─────────────────────────────────────────────────────────────────
const naruto = {
  rosterKey: "naruto", name: "Naruto", universe: "naruto",
  portrait: "./naruto_kcm_portrait.png",   // KCM mugshot bust sliced from naruto_kcm_mugshot_lifebars.png (lifebar strips excluded)
  // Arcade rival (Stage 19C). characters.js override wins over arcade.js's ARCADE_RIVALS map; the
  // pre-fight two-line exchange + post-win line are optional (arcade.js supplies a generic fallback).
  arcadeRival: "sasuke",
  arcadeRivalLines: {
    pre: ["Naruto: Sasuke… I'm not letting you walk a lonely road anymore.", "Sasuke: Then prove it. Come at me like you mean it, Naruto."],
    win: "I told you — I never go back on my word. That's my nindō!"
  },
  archetypes: ["melee", "summons", "ranged"],
  primary: "melee", secondary: ["summons", "ranged"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1180, maxEnergy: 190, attack: 89, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 82, startup: 8, active: 4, recovery: 18, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 19, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 56, startup: 5, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 72, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    // ── RASENGAN FAMILY — Naruto's solo specials, meter-cost only (spendEnergy), NO
    //    shadow-clone involvement. Input map (abilities.executeNarutoSpecial):
    //    neutral L = base; hold P + L = Big Ball (partial) / Rasenshuriken (full charge);
    //    Down + L = Dark Rasengan. (D→F / D→B remain the clone spawn/dispel motions.)
    rasengan:         { cost: 30, damage: 120, startup: 8,  active: 4, recovery: 16, hitstun: 22, knockbackX: 8,  knockbackY: -2, subtype: "projectile", effect: "base Rasengan — fast close-range dashing spiral orb (neutral special)" },
    bigBallRasengan:  { cost: 55, damage: 210, startup: 14, active: 6, recovery: 22, hitstun: 30, knockbackX: 13, knockbackY: -4, subtype: "projectile", effect: "Big Ball Rasengan — hold-charge to grow the sphere; size & damage scale with charge, capped" },
    rasenshuriken:    { cost: 80, damage: 260, startup: 20, active: 8, recovery: 30, hitstun: 34, knockbackX: 15, knockbackY: -3, subtype: "projectile", effect: "Rasenshuriken — FULL-charge wind blade; strongest non-clone special + lingering chip DOT on hit" },
    darkRasengan:     { cost: 45, damage: 180, startup: 12, active: 8, recovery: 22, hitstun: 28, knockbackX: 10, knockbackY: -6, subtype: "aoe",        effect: "Dark Rasengan / Compressed TBB — Down+Special close-range ring-burst that detonates in place (no travel)" },
    kawarimi:         { cost: 25, damage: 0,   startup: 6,  active: 0, recovery: 20, hitstun: 0,  knockbackX: 0,  knockbackY: 0,  subtype: "defensive", effect: "Kawarimi Substitution — Block+Special during a whiff-punish window; smoke-poof teleport behind the opponent, incoming hit whiffs (meter-cost, not a clone share)" },
    // Phase 3: rebuilt as a real clone entity on summons.js (not wired this phase).
    shadowCloneBlast: { cost: 25, damage: 80,  startup: 8,  active: 6, recovery: 16, hitstun: 16, knockbackX: 6,  knockbackY: -1, subtype: "summon",     effect: "shadow clone rush attack" }
  },
  // Kurama Avatar — CINEMATIC ultimate (kurama.js), NOT a transformation. Full-meter
  // gate; the Tailed Beast Bomb sequence is a guaranteed sure-hit. The old
  // sageMode/kcmMode/baryonMode forms below are now UNUSED by the ultimate (kept as
  // dead data; executeNarutoUltimate no longer reads them).
  ultimate: { name: "Kurama Avatar", cost: 100, duration: 3, effect: "Tailed Beast Bomb cinematic — guaranteed sure-hit blast" },
  transformationOrder: ["base","sageMode","kcmMode","baryonMode"],
  transformations: {
    base:       { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    sageMode:   { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.2, energyDrainPerFrame: 4 / 60, kiDrainPerSecond: 4, duration: 1080 },
    kcmMode:    { damageMultiplier: 1.8, speedMultiplier: 1.5, defenseMultiplier: 1.1, energyDrainPerFrame: 7 / 60, kiDrainPerSecond: 7, isSpecial: true, duration: 840 },
    baryonMode: { damageMultiplier: 2.8, speedMultiplier: 2, defenseMultiplier: 0.8, energyDrainPerFrame: 20 / 60, kiDrainPerSecond: 20, isSpecial: true, duration: 360 }
  },
  hasSprites: true,
  // ── KCM NARUTO SPRITES (Phase 1: core, playable) ───────────────────
  // JUS rip sliced into one PNG per action. Source cells ~36–79px wide × 55–92px
  // tall; ×1.8 ≈ JJK on-screen height (their 63px cells ×1.8 ≈ 113px). Frame counts
  // MEASURED via alpha-gutter detection (stripWidth / frames = cell pitch). Non-
  // convention filenames load directly via each entry's `sheet` (animationProfile.js
  // → SpriteHandler._loadSheet). anchorY -4 plants feet on the floor (each strip has
  // a ~2px transparent bottom gap ×1.8 ≈ 4px). Display size scaled by spriteScale.
  // NOTE: `guard`/`knockdown` render via the guarded hooks added in sprite.js
  // _resolveAction (they only fire because these entries exist).
  // spriteScale 2.0 → idle content (59px) ×2.0 ≈ 118px ≈ Sukuna/Gojo on-screen
  // height (their 62px content ×1.8 ≈ 112px). REQUIRES the skins.js `naruto` entry
  // — otherwise applySkin() overrides this with the spriteScale:1 fallback (he was
  // rendering at native size = "too small"). anchorY -4 = -(2px source bottom-gap
  // ×2.0) plants the feet exactly on the floor at this scale.
  spriteScale: 2.0,
  animationData: {
    // ── movement / state ──
    idle:      { frames: 4,  width: 36, height: 63, speed: 6, anchorY: -4, sheet: "./naruto_kcm_stance.png" },
    // move.png has a stray sliver at rows 55–63 (leftover under frame 0); real sprite
    // is rows 2–51. height 54 crops to feet(51)+2px, excluding the bleed. (was 66)
    walk:      { frames: 6,  width: 48, height: 54, speed: 5, anchorY: -4, sheet: "./naruto_kcm_move.png" },
    run:       { frames: 6,  width: 48, height: 54, speed: 4, anchorY: -4, sheet: "./naruto_kcm_move.png" },   // no dash/run strip → reuse move (faster)
    dash:      { frames: 6,  width: 48, height: 54, speed: 4, anchorY: -4, sheet: "./naruto_kcm_move.png" },   // no dash strip → reuse move
    jump:      { frames: 4,  width: 49, height: 69, speed: 6, anchorY: -4, sourceX: 0,   sheet: "./naruto_kcm_jump.png" },  // first half = rise (ASSUMED split of the 8-frame arc)
    fall:      { frames: 4,  width: 49, height: 69, speed: 6, anchorY: -4, sourceX: 196, sheet: "./naruto_kcm_jump.png" },  // second half = descend
    guard:     { frames: 4,  width: 41, height: 59, speed: 6, anchorY: -4, sheet: "./naruto_kcm_guard.png" },  // shown via sprite.js isBlocking→"guard" hook
    hurt:      { frames: 4,  width: 46, height: 55, speed: 6, anchorY: -4, sheet: "./naruto_kcm_taking_damage.png" },       // flinch (hitstun)
    knockdown: { frames: 6,  width: 63, height: 49, speed: 6, anchorY: -4, sheet: "./naruto_kcm_knocked_out_a.png" },       // shown via sprite.js knockdown→"knockdown" hook
    // INTRO/entrance — sprite.js returns "transform" while fighter._introPlaying
    // (game.js sets it for the ~90-frame INTRO state, cleared at fight start).
    // Round-start victory flourish from the win strip (replaced the old
    // ultimate_action chakra-flare intro, which read poorly — ultimate_action.png
    // is now unused). naruto_kcm_win.png is 133×80 with "REPEAT" text label bands at
    // rows 2–21; the 3 figure frames occupy rows 25–78 (~44px pitch) → sourceY 24
    // skips the labels, height 56 = feet+2px gap, loop:true cycles it through intro.
    transform: { frames: 3, width: 44, height: 56, speed: 6, anchorY: -4, sourceY: 24, loop: true, sheet: "./naruto_kcm_win.png" },
    // ── basic attacks — B-attack set sliced from naruto_kcm_sheet.png (Phase 2).
    // These new strips are content-tight crops (feet at the very bottom row → no
    // bottom gap), so anchorY 0 plants them; heavy keeps the Phase-1 y_attack strip
    // (which has a ~2px gap → anchorY -4). Frame counts = gutter-detected blob counts.
    light:     { frames: 4,  width: 52, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_attack.png" },        // B ATTACK (jab)
    // y_attack.png real sprite is rows 14–89; stray sliver at rows 2–10 (TOP). sourceY
    // 12 skips it, height 80 keeps the bottom crop at row 91 so feet stay planted. (was sourceY 0, height 92)
    heavy:     { frames: 7,  width: 51, height: 80, speed: 4, anchorY: -4, sourceY: 12, sheet: "./naruto_kcm_y_attack.png" },        // Y ATTACK (heavy)
    up:        { frames: 7,  width: 51, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_up_attack.png" },     // B+UP (launcher)
    air:       { frames: 7,  width: 79, height: 74, speed: 3, anchorY: -4, sheet: "./naruto_kcm_y_up_attack.png" },   // JUGGLE — Y+UP aerial strike (Rendan middle hit); 553÷7 = 79px cells. (was b_jump_attack; bone-arm FX not applied — engine has no attack-FX overlay slot)
    down_air:  { frames: 3,  width: 39, height: 52, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_down_attack.png" },   // B+DOWN
    grab:      { frames: 4,  width: 52, height: 53, speed: 4, anchorY: 0,  sheet: "./naruto_kcm_b_attack.png" },        // reuse B ATTACK
    // naruto_kcm_b_forward_attack.png (5f, 58x47) + naruto_kcm_fx_b_down_fist.png sliced
    // & saved, but the engine has no forward-normal slot → reserved for later use.
    // ── SPECIAL CAST bodies — play on the CASTER while the projectile flies
    //    (abilities.executeNarutoSpecial sets _spriteCastMove; sprite.js _resolveAction
    //    plays the matching action; MOVE_TO_ACTION passes these keys through unchanged).
    rasengan_cast:      { frames: 11, width: 52, height: 55, speed: 3, anchorY: 0, sheet: "./naruto_kcm_4_koma_body.png" }, // 4 KOMA A
    rasenshuriken_cast: { frames: 12, width: 51, height: 56, speed: 3, anchorY: 0, sheet: "./naruto_kcm_6_koma_body.png" }, // 6 KOMA A
    // CLONE-ASSISTED Rasengan pose (naruto_kcm_3koma_clone_row): a row of clones each forming/thrusting a
    // Rasengan — played when a shadow clone JOINS the Uzumaki Barrage, so the clone-assist reads visibly.
    komaRasengan:       { frames: 7,  width: 41, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naruto_kcm_3koma_clone_row.png" }
  }
  // ── Phase 2 (specials, NOT wired yet — awaiting floor-check): rasengan / shadow-
  //    CloneBlast → body strip + fx_* effect; ultimate → naruto_kcm_ultimate_action.
  //    Reserved for Avatar/Tailed-Beast form (leave unwired): none of the fx_fox /
  //    fx_tbb / fx_kurama files exist on disk yet.
}

// ─────────────────────────────────────────────────────────────────
// SASUKE — PHASE 1: idle + selectability ONLY (no attacks/specials/ultimate yet).
// Sprite gate: hasSprites needs a working idle before anything else renders.
// ─────────────────────────────────────────────────────────────────
const sasuke = {
  rosterKey: "sasuke", name: "Sasuke", universe: "naruto",
  portrait: "./sasuke_pfp.png",
  archetypes: ["melee"],
  primary: "melee", secondary: [],
  // Placeholder base stats — templated off Naruto (fellow chakra/taijutsu ninja); tune later.
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1180, maxEnergy: 190, attack: 89, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
  // dashTeleport: double-tap TOWARD the opponent = blink BEHIND them (Sharingan speed) — the
  // SAME mechanic + timing window (DOUBLE_TAP_TIME) as Gojo/Toji/Sukuna via detectDoubleTapDashTeleport.
  movement: { dashTeleport: true },
  // PHASE 2 = basic movement + attacks. Placeholder taijutsu values between Naruto & Toji
  // (combat.js _getMD reads THIS `basic_attacks` — moveset.js has no naruto/sasuke entry).
  // Specials/ultimate still deliberately ABSENT (Phase 3). light=forward-kick combo,
  // heavy=dash sword-slash (has a baked slash trail → reads as the stronger hit), downAir=down/spike.
  basic_attacks: {
    light:  { damage: 46, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    // heavy = committed SWORD thrust (foword_sword_attack_2) — rangeX bumped for the blade's reach.
    heavy:  { damage: 92, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 82, rangeY: 46 },
    // upAttack = LAUNCHER (combat.js `case "up"` reads b.upAttack; startMove "up" → animationData.up).
    // Mid-weight numbers modeled on the moveset.js launcher pattern (Naruto upAttack 70/-8); 68 sits in
    // the ~65-75 launcher range with real upward knockback (knockbackY -8, launch 11).
    upAttack:{ type: "launcher", damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    downAir:{ damage: 78, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    // NEUTRAL AIR (J while airborne) — the missing basic (was undefined → J in the air whiffed).
    // Mid-weight aerial between light (46) and heavy (92); airborne spin-slash (animationData.air).
    airAttack:{ damage: 54, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // ── PHASE 3: two-stage Susanoo ULTIMATE (logic lives in abilities.js executeSasukeUltimate).
  // This field is HUD-only (game.js reads c?.ultimate?.name for the move hint); the real cost is
  // enforced in abilities.js — Stage 1 spends 50% of maxEnergy, Stage 2 drains all remaining to 0.
  // Attacks (Susanoo grab / Lv2 arrow) fire on the SPECIAL button while in Susanoo.
  ultimate: { name: "Susanoo", cost: 95, description: "Stage 1: buffed Susanoo Lv1 + ribcage grab. Press again to escalate to Lv2 (drains all energy): heavier grab + ranged arrow." },
  hasSprites: true,
  // saske_stance_2.png (existing filename typo — referenced AS-IS, not "fixed"): MEASURED 112×57,
  // 4 frames → 28×57 cells; vertical content rows 0–55 → ~2px transparent bottom gap. spriteScale
  // 2.1 lands the ~55px content at ~115px on-screen ≈ Naruto/Sukuna height. anchorY -4 = -(2px gap
  // ×~2.1) plants the feet on the floor. REQUIRES the skins.js `sasuke` entry (else applySkin()
  // pulls the spriteScale:1 fallback → native size) + the spritesheets.js SPRITE_MANIFEST idle gate.
  spriteScale: 1.9,   // HEIGHT-REF: canon 168cm (teen) → target ~105px (was 2.1). See HEIGHT_REFERENCE.md; anchorY below rescaled ×(1.9/2.1).
  // ── PHASE 2 sprites. Frame counts + cell widths MEASURED via alpha-gutter detection
  // (stripWidth / frames = pitch); height = full sheet height (frames slice horizontally
  // only). anchorY = -(bottom transparent gap × spriteScale 2.1), plants feet on the floor
  // (verified per sheet against the content-bottom row). Attack sprite `speed` ≈ move
  // duration / frames so the swing reads across the move. Missing actions (walk/run/up/air)
  // fall back to idle gracefully. hurt/dash/light/heavy/down_air are Phase 2; specials later.
  animationData: {
    idle:     { frames: 4, width: 28, height: 57, speed: 6, anchorY: -4,  sheet: "./saske_stance_2.png" },
    // walk/run — sasuke_running.png. MEASURED 449×53 → 8 frames (transparent-gutter verified,
    // content-tight/non-uniform so NOT a round divisor) @ 56px cell pitch (449/8 = 56.1). Without
    // these keys sprite.js used the 128×128 _FALLBACK and sliced garbage from the idle sheet
    // ("random sprite"). speed 5 = roster walk baseline (Naruto/Gojo/Sukuna); run reuses the same
    // strip a touch faster (Naruto's move.png pattern). anchorY -10 = -(5px bottom gap × 2.1).
    walk:     { frames: 8, width: 56, height: 53, speed: 5, anchorY: -9, sheet: "./sasuke_running.png" },
    run:      { frames: 8, width: 56, height: 53, speed: 4, anchorY: -9, sheet: "./sasuke_running.png" },
    // jump/fall — sasuke_jump.png. MEASURED 406×78 → 8 frames (transparent-gutter verified) @ 51px
    // pitch (406/8=50.8). The arc is crouch→rise→peak→descend→land, so split like Naruto's jump:
    // jump = rise half (cells 0–3, sourceX 0), fall = descend half (cells 4–7, sourceX 4×51=204).
    // Without these keys sprite.js used the 128×128 _FALLBACK and sliced garbage. speed 6 = roster
    // jump baseline (Gojo/Sukuna/Naruto). anchorY -15 = -(7px bottom gap × 2.1).
    jump:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -14, sourceX: 0,   sheet: "./sasuke_jump.png" },
    fall:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -14, sourceX: 204, sheet: "./sasuke_jump.png" },
    dash:     { frames: 2, width: 66, height: 49, speed: 5, anchorY: -12, sheet: "./sasuke_dash.png" },            // 131×49 → 2×(66×49), 6px bottom gap
    hurt:     { frames: 4, width: 53, height: 57, speed: 6, anchorY: -5,  sheet: "./sasuke_damage.png" },          // 211×57 → 4×(53×57), 3px bottom gap
    light:    { frames: 9, width: 68, height: 71, speed: 2, anchorY: -33, sheet: "./sasuke_foward_attack.png" },   // 611×71 → 9×(68×71), 17px bottom gap (feet high in cell)
    heavy:    { frames: 8, width: 61, height: 63, speed: 4, anchorY: -19, sheet: "./sasuke_foword_sword_attack_2.png" }, // 490×63 → 8×(61×63) clean sword-thrust combo (re-slice verified; replaced dash_attack whose thrust blade tore across cells)
    up:       { frames: 9, width: 58, height: 60, speed: 3, anchorY: -9, sheet: "./sasuke_up_attack.png" },       // 527×60 → 9×(58×60) gap-scanned; launcher swing. anchorY -10 = -(5px botGap ×2.1)
    down_air: { frames: 6, width: 50, height: 62, speed: 4, anchorY: -5,  sheet: "./sasuke_down_attack.png" },     // 298×62 → 6×(50×62)
    air:      { frames: 6, width: 68, height: 83, speed: 3, anchorY: -11, sheet: "./sasuke_jump_attack.png" },     // 409×83 → 6×(68×83) aerial spin-slash (neutral J in air)
    // Shuriken THROW pose — plays via _spriteCastMove while the shuriken projectile flies (air+heavy poke).
    shurikenThrow: { frames: 2, width: 57, height: 56, speed: 4, anchorY: -7, loop: false, lockLastFrame: true, sheet: "./sasuke_throwing_shuriken.png" }, // 114×56 → 2×(57×56)
    // Chidori Koiten windup→discharge pose (qcb+Special). REPACKED to uniform 54px cells (raw sheet
    // was non-uniformly packed + a detached "CHIDORI KOITEN" label band). speed 4 → windup frames
    // fill the 16f startup, discharge frames land on the active burst. anchorY -6 = -(3px botGap ×2.1).
    chidoriKoiten: { frames: 7, width: 54, height: 73, speed: 4, anchorY: -5, loop: false, lockLastFrame: true, sheet: "./sasuke_CHIDORI_KOITEN_attack.png" },
    // ── PHASE 3a: pre-match INTRO POOL. game.js picks one of `introPool` at random each match
    // (see pickIntroVariant); sprite.js plays it while _introPlaying is set. loop:false +
    // lockLastFrame → each plays ONCE then holds its final pose, snapping cleanly to idle when
    // the fight starts.
    // RE-SLICED 2026-07-29: sasuke_intro.png was a NON-UNIFORM 511×63 strip (poses at a ~30px
    // pitch, plus a WIDE ~57px cloak-swirl) wired as a uniform 6×57 slice that TORE/drifted
    // through the poses (audit coverage was 67%). Repacked via tools/reslice_strip.mjs into 12
    // clean uniform 59×57 feet-registered cells: 0-2 cloaked · 3 cloak-flare · 4 cloak-swirl ·
    // 5 reveal · 6-8 standing arrival · 9 point · 10 sword+wire (COMBAT) · 11 settled rest.
    // `intro` plays cells 0-8 (frames:9) — the cloak-reveal ending on a clean standing arrival
    // pose, deliberately stopping BEFORE the sword+wire combat action (cell 10), which is a move,
    // not an intro. Cells 10-11 stay in the file for a future "wire kunai" move. anchorY 0 because
    // the reslice bottom-aligns feet (matches the sibling re-sliced intros below). Still EXCLUDED
    // from introPool (thematically redundant with introCloakAlt's black-cloak unfurl) but now
    // renders cleanly if ever re-pooled.
    intro:         { frames: 9, width: 59, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sasuke_intro.png"   },
    // RE-SLICED 2026-07-17: the raw sheets are NON-UNIFORM (6 hand-drawn poses each with a WIDE
    // cloak-throw pose that a uniform slice tore straight through — verified via boundary overlays).
    // REPACKED into uniform 90px cells (each pose cropped + FEET-registered so the character stays
    // planted while the cloak billows), mirroring the Susanoo _anim fix. sheets: sasuke_intro_{2,3}_anim.png.
    introAkatsuki: { frames: 6, width: 90, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sasuke_intro_2_anim.png" }, // Akatsuki (red-cloud) cloak unfurl → holds clean Taka stance
    introCloakAlt: { frames: 6, width: 90, height: 70, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sasuke_intro_3_anim.png" }  // black cloak unfurl → holds clean Taka stance
  },
  // Generic pre-match intro pool — game.pickIntroVariant() picks one at random each match; add a
  // 4th entry here later and it drops into the rotation with no other wiring. (Any character can
  // define this; those without it fall back to the shared "transform" intro slot.)
  // `intro` intentionally NOT pooled — see the note above (holds on a mid-combat arm-point, wire
  // can't be skipped). Only the two that settle into a clean stance stay in rotation.
  introPool: ["introAkatsuki", "introCloakAlt"]
}

// ─────────────────────────────────────────────────────────────────
// ITACHI UCHIHA  (Naruto universe) — 10th sprite character.
// STAGE 1: idle + core movement + selectability. Sprites sliced from the
// itachi_melle_*.png strips; the non-uniform source frames were RE-SLICED into
// clean uniform cells (harness/reslice.mjs → *_uniform.png) so the engine can
// slice by a single pitch without horizontal jitter (omega_ranger precedent).
// Portrait cropped from the labeled "mugshot:" panel inside itachi_melle_transparent.png.
// Templated off fellow-Uchiha Sasuke (chakra, dashTeleport, staged build). Normals
// (Stage 2), Mangekyou mode (Stage 3), Amaterasu/Genjutsu (Stage 4) and the Susanoo
// ultimate (Stage 5) land in later passes; missing actions fall back to idle safely.
// ─────────────────────────────────────────────────────────────────
const itachi = {
  rosterKey: "itachi", name: "Itachi Uchiha", universe: "naruto",
  portrait: "./Itatchi_mugshot.png",   // EXACT on-disk filename — typo "Itatchi" is intentional (as uploaded, do NOT rename); character-select mugshot / HUD nameplate; skins.js + ui.js read characters.itachi.portrait
  archetypes: ["melee", "tactics"],
  primary: "melee", secondary: ["tactics"],
  // Sharingan blink — double-tap TOWARD the opponent = teleport dash (same detectDoubleTapDashTeleport
  // mechanic + timing as Sasuke/Gojo/Toji/Sukuna).
  movement: { dashTeleport: true },
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // maxEnergy 200 leaves headroom for Mangekyou's charge threshold (Stage 3) + Susanoo's 50% cost (Stage 5).
  stats: { maxHealth: 1170, maxEnergy: 200, attack: 90, defense: 85, speed: 91, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 45 },
  // Placeholder taijutsu values templated off Sasuke (fellow chakra/blade Uchiha); real move
  // wiring + flavor normals land in Stage 2. combat.js _getMD reads THIS basic_attacks.
  basic_attacks: {
    light:    { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 90, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 80, rangeY: 46 },
    upAttack: { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    downAir:  { damage: 76, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    airAttack:{ damage: 54, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // HUD-only until Stage 5 (real logic + cost live in abilities.js executeItachiUltimate).
  ultimate: { name: "Susanoo", cost: 100, description: "Summon the Susanoo avatar — a sustained giant form. Sword slash / guard on the SPECIAL button while active." },
  hasSprites: true,
  // idle content 72px × 1.55 ≈ 112px on-screen ≈ roster height (Naruto/Sasuke ~115). REQUIRES the
  // skins.js `itachi` entry (else applySkin() pulls the spriteScale:1 fallback → native size) + the
  // spritesheets.js SPRITE_MANIFEST idle gate. anchorY = -(bottom transparent gap × 1.55) plants feet.
  spriteScale: 1.55,
  animationData: {
    idle: { frames: 4, width: 42, height: 73, speed: 6, anchorY: -2, sheet: "./itachi_melle_idle_uniform.png" },   // content 72, botGap 1
    walk: { frames: 6, width: 41, height: 78, speed: 6, anchorY: -9, sheet: "./itachi_melle_walk_uniform.png" },   // content 67, botGap 6
    run:  { frames: 6, width: 62, height: 54, speed: 4, anchorY: 0,  sheet: "./itachi_melle_run_uniform.png" },    // content 49 (forward lean)
    dash: { frames: 6, width: 62, height: 54, speed: 3, anchorY: 0,  sheet: "./itachi_melle_run_uniform.png" },    // reuse run strip a touch faster
    // jump.png arc = crouch→crouch→rise→apex; play once + hold. fall = the apex/descent pose (last cell).
    jump: { frames: 4, width: 62, height: 65, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./itachi_melle_jump_uniform.png" },
    fall: { frames: 1, width: 62, height: 65, speed: 6, anchorY: 0, sourceX: 186, loop: false, lockLastFrame: true, sheet: "./itachi_melle_jump_uniform.png" },
    // ── STAGE 2 NORMALS. All re-sliced to uniform cells (reslice.mjs); frame counts visually
    // confirmed. speed ≈ move duration / frames so the swing reads across the active window.
    // anchorY = -(bottom transparent gap × 1.55) plants feet (crouch poses have a large gap).
    light:    { frames: 5, width: 54, height: 81, speed: 3, anchorY: -16, loop: false, lockLastFrame: true, sheet: "./itachi_melle_low_attack_uniform.png" },        // quick low sweep/poke
    heavy:    { frames: 4, width: 85, height: 65, speed: 7, anchorY: -8,  loop: false, lockLastFrame: true, sheet: "./itachi_melle_foward_attack_uniform.png" },      // committed wide blade swing
    up:       { frames: 4, width: 63, height: 72, speed: 6, anchorY: -3,  loop: false, lockLastFrame: true, sheet: "./itachi_melle_up_attack_uniform.png" },           // launcher: rising slash
    air:      { frames: 4, width: 58, height: 78, speed: 4, anchorY: -16, loop: false, lockLastFrame: true, sheet: "./itachi_melle_foward_knife_attack_uniform.png" }, // neutral aerial knife stab
    down_air: { frames: 5, width: 62, height: 70, speed: 5, anchorY: 0,   loop: false, lockLastFrame: true, sheet: "./itachi_melle_down_air_attack_uniform.png" },     // downward dive kick
    grab:     { frames: 5, width: 54, height: 81, speed: 4, anchorY: -16, loop: false, lockLastFrame: true, sheet: "./itachi_melle_low_attack_uniform.png" },
    // HURT / hit-reaction — no dedicated hit-reaction sprite was ever exported for Itachi (the asset
    // map's "DAMAGE" row stayed on the unexported master sheet). Rather than let the missing action
    // resolve to the bare 128²×4 fallback (the "four sprites going up" glitch — now ALSO guarded in
    // sprite.js), wire a clean single-frame BRACE pose (cropped from itachi_melle_block.png) as the
    // flinch — a defensible stand-in until real hit art is sourced (the combat.js colorFlash tints the
    // hit on top). Every hitstun/stun/knockdown state routes here (no knockdown/getup/hurt_air strips).
    hurt:     { frames: 1, width: 38, height: 72, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./itachi_melle_block_uniform.png" },
    // Pre-match INTRO — the crow-swarm ARRIVAL. The source sheet stores Itachi→crows left-to-right;
    // itachi_intro_uniform.png is that sheet re-sliced (12 natural-island frames) and REVERSED in
    // frame order, so it now plays crows-FIRST → Itachi resolving OUT of the swarm, holding the
    // settled cloak stance when the fight starts (the iconic crow-dispersal read backwards = an entrance).
    intro:    { frames: 12, width: 85, height: 83, speed: 5, anchorY: -14, loop: false, lockLastFrame: true, sheet: "./itachi_intro_uniform.png" },
    // Fire Style: Great Fireball Jutsu CAST pose (hand-seals → blow). Played via _spriteCastMove
    // (identity sprite-resolve) while the flame projectile flies; the fireball itself is a separate
    // projectile sheet (itachi_fireball_proj_uniform.png). See abilities.js executeItachiSpecial.
    fireballCast: { frames: 7, width: 56, height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./itachi_melle_fireball_cast_uniform.png" },
    // ── STAGE 4: Mangekyou-gated special CAST poses (only reachable while _mangekyouActive).
    // Amaterasu — channel pose (played via _spriteCastMove while the black-flame projectile flies).
    amaterasuCast: { frames: 12, width: 34, height: 78, speed: 2, anchorY: -3, loop: false, lockLastFrame: true, sheet: "./itachi_amaterasu_cast_uniform.png" },
    // Genjutsu — the hit-confirm illusion-weave (rendered via currentMove; carries the finisher hitbox).
    genjutsuCast:  { frames: 13, width: 87, height: 90, speed: 3, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./itachi_genjutsu_cast_uniform.png" }
  },
  // Single-entry pre-match intro pool (game.pickIntroVariant picks from here; one entry = always plays).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// TOBIRAMA SENJU  (Naruto universe) — 15th sprite character.
// STAGE 1: idle + core movement + selectability. Sprites sliced from the
// tobirama_*.png strips; the non-uniform source frames were RE-SLICED into
// clean uniform, feet-aligned cells (tools/reslice_strip.mjs → *_uniform.png)
// so the engine slices by a single pitch without horizontal jitter (Itachi
// precedent). Templated off fellow-Naruto shinobi Itachi/Sasuke (chakra,
// dashTeleport = his water body-flicker, staged build). Normals (Stage 2),
// water jutsu (Stage 3), Darkness Jutsu (Stage 4) and the Edo Tensei summon
// ultimate (Stage 5) land in later passes; missing actions fall back to idle.
// The signature Edo Tensei ultimate lets the player pre-pick a SECOND roster
// character and take direct control of its full kit for a fixed window while
// Tobirama is sidelined — see abilities.js executeTobiramaUltimate (Stage 5).
// ─────────────────────────────────────────────────────────────────
const tobirama = {
  rosterKey: "tobirama", name: "Tobirama Senju", universe: "naruto",
  portrait: "./tobirama_portrait.png",   // cropped from the intro sheet in Stage 6; falls back gracefully until then
  archetypes: ["melee", "tactics"],
  primary: "melee", secondary: ["tactics", "zoner"],
  // Water body-flicker — double-tap TOWARD the opponent = teleport dash (same
  // detectDoubleTapDashTeleport mechanic + timing as Sasuke/Itachi/Gojo/Toji).
  movement: { dashTeleport: true, runWhenAdvancing: true },   // advancing toward the foe plays the run cycle (walk sheet still used for retreat)
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // maxEnergy 200: the Edo Tensei ultimate spends ALL current chakra on cast (Stage 5),
  // and the water specials (Stage 3) want a full bar to work from.
  stats: { maxHealth: 1120, maxEnergy: 200, attack: 90, defense: 82, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 12, dashCooldownMax: 42 },
  // Placeholder taijutsu values templated off Itachi (fellow chakra shinobi); real move
  // wiring + flavor normals land in Stage 2. combat.js _getMD reads THIS basic_attacks.
  basic_attacks: {
    light:    { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 88, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 80, rangeY: 46 },
    // launchVy -26 is EXPLICIT and floor-exempt (opts.exact) on purpose: Tobirama's signature route is
    // up-launcher → air → down_air SPIKE, and the spike hitbox sits BELOW him, so it only connects when his
    // jump out-climbs the pop and he lands ABOVE the juggled foe. His jumpPower 32 clears a -26 pop (spike
    // connects from above) but NOT the -30 archetype floor (foe floats above him → spike whiffs). He was a
    // floor-rider (no launchVy) whose combo was implicitly tuned to the old -26 floor; making it explicit
    // keeps it working regardless of where the shared floor moves. Slightly-below-baseline is his identity.
    upAttack: { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -26, airOK: false },
    downAir:  { damage: 74, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    airAttack:{ damage: 54, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // HUD-only until Stage 5 (real logic + cost live in abilities.js executeTobiramaUltimate).
  // Edo Tensei: reanimate a pre-chosen ally — take full control of their kit for a fixed window.
  ultimate: { name: "Edo Tensei", cost: 100, description: "Reanimation Jutsu — sacrifice all chakra and a portion of health to summon your pre-chosen ally, then command their full moveset for a short window before control reverts to Tobirama." },
  hasSprites: true,
  // idle content ~88px × 1.3 ≈ 114px on-screen ≈ roster height (Naruto/Sasuke/Itachi ~112-115).
  // REQUIRES the skins.js `tobirama` entry (else applySkin() pulls the spriteScale:1 fallback →
  // native size) + the spritesheets.js SPRITE_MANIFEST idle gate. Resliced cells are bottom-aligned
  // (feet at cell bottom, 1px pad) so a single anchorY:0 plants feet across every standing action —
  // sprite.js: drawn-bottom = fighter.y + fighterH - anchorY, independent of per-action cell height.
  spriteScale: 1.3,
  animationData: {
    idle: { frames: 4, width: 39, height: 90, speed: 6, anchorY: 0, sheet: "./tobirama_idle_uniform.png" },
    walk: { frames: 6, width: 47, height: 91, speed: 6, anchorY: 0, sheet: "./tobirama_walk_uniform.png" },
    run:  { frames: 6, width: 68, height: 70, speed: 4, anchorY: 0, sheet: "./tobirama_run_uniform.png" },
    dash: { frames: 3, width: 74, height: 89, speed: 3, anchorY: 0, sheet: "./tobirama_dash_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell, sourceX 6×57).
    jump: { frames: 7, width: 57, height: 90, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_jump_uniform.png" },
    fall: { frames: 1, width: 57, height: 90, speed: 6, anchorY: 0, sourceX: 342, loop: false, lockLastFrame: true, sheet: "./tobirama_jump_uniform.png" },
    // Guard — 2-frame settle into a braced cross-arm block; hold the last frame while blocking.
    guard: { frames: 2, width: 41, height: 90, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_block_uniform.png" },
    // HURT — frame 0 of the knockdown strip (the initial backward recoil) as a single-frame flinch;
    // combat.js colorFlash tints the hit on top. Every plain hitstun/stun routes here.
    hurt: { frames: 1, width: 84, height: 84, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_hit_uniform.png" },
    // KNOCKDOWN — the full 5-frame fall→tumble→sprawl→rise sequence (the hit sheet is literally a
    // knockdown). Played during knockdownState; lockLastFrame holds the standing recovery pose.
    knockdown: { frames: 5, width: 84, height: 84, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_hit_uniform.png" },
    // Pre-match INTRO — 4-frame entrance settling into stance.
    intro: { frames: 4, width: 70, height: 88, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_intro_uniform.png" },
    // ── STAGE 2 NORMALS ── each resliced feet-aligned (tools/reslice_strip.mjs → *_uniform.png);
    // anchorY:0 plants feet (bottom-aligned cells). loop:false + lockLastFrame holds the strike
    // pose through recovery. basic_attacks above carries the hit/frame data these render over.
    light:    { frames: 6, width: 72,  height: 90, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_low_kick_uniform.png" },              // quick low sweeping kick
    heavy:    { frames: 2, width: 145, height: 79, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_strongz_foward_attack_uniform.png" },   // committed forward lunge-straight (long reach)
    up:       { frames: 6, width: 69,  height: 83, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_up_kick_uniform.png" },                 // launcher: rising kick
    air:      { frames: 3, width: 60,  height: 87, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_super_up_kick_uniform.png" },           // neutral aerial somersault kick
    down_air: { frames: 4, width: 67,  height: 87, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_down_air_kick_uniform.png" },             // descending diagonal kick
    // ── STAGE 3 COMMAND CHAIN + POKES ── currentMove-keyed poses (sprite.js identity map). Chain =
    // Fwd+Heavy tobiCombo1→2→Fin (cancel-on-hit); pokes = Fwd+Light Strong Forward / Back+Heavy Rising Knee.
    tobiCombo1:     { frames: 7, width: 65, height: 90,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_attack_combo_1_uniform.png" },        // chain opener — punch string
    tobiCombo2:     { frames: 8, width: 88, height: 89,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_attack_combo_2_uniform.png" },        // chain 2 — water-infused strike (built-in blue burst)
    tobiComboFin:   { frames: 7, width: 71, height: 90,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_super_down_attack_uniform.png" },     // finisher — downward slam
    tobiStrongFwd:  { frames: 6, width: 60, height: 102, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_strong_upper_attack_kick_uniform.png" }, // Fwd+Light poke — tumbling forward launcher
    tobiRisingKnee: { frames: 6, width: 57, height: 89,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_upper_knee_attack_uniform.png" },        // Back+Heavy poke — rising-knee anti-air
    // ── STAGE 4 SPECIALS ── direction-branched off the Special button (currentMove/_spriteCastMove
    // identity poses). 3 have built-in water FX in the art (slash/rising/flicker); 3 are cast-only
    // and pair with a procedural drawKind projectile FX (dragon/wall/darkness).
    tobiWaterDragon:  { frames: 10, width: 55, height: 90,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_water_dragon_justu_uniform.png" },                  // N — seal→thrust cast
    tobiWaterSlash:   { frames: 6,  width: 82, height: 85,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_foward_water_slash_uniform.png" },                  // F — advancing water blade (built-in FX)
    tobiRisingWater:  { frames: 7,  width: 65, height: 104, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_water_up_attack_uniform.png" },                     // U — geyser launcher (built-in FX)
    tobiWaterWall:    { frames: 5,  width: 47, height: 90,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_water_wall_justu_uniform.png" },                    // D — seal→brace cast
    tobiDarkness:     { frames: 6,  width: 47, height: 90,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_darkness_justu_uniform.png" },                      // B — seal→cup cast
    tobiWaterFlicker: { frames: 6,  width: 92, height: 67,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_water_teleport_after_hit_to_get_away_uniform.png" }, // escape — puddle→reform (built-in FX)
    // Edo Tensei ultimate — the summoning ritual pose (hand-seals → summon slam) played during the
    // activation windup, before control swaps to the reanimated vessel (Stage 6).
    tobiEdoCast:      { frames: 11, width: 52, height: 90,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./tobirama_performing_edo_tense_uniform.png" }
  },
  // Single-entry pre-match intro pool (game.pickIntroVariant picks from here; one entry = always plays).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// HASHIRAMA SENJU — the First Hokage, "God of Shinobi" (6th Naruto-
// universe char, after Naruto/Sasuke/Itachi/Tobirama/Minato/Madara/
// Obito/Tobi/Pain). LARGE versatile Mokuton kit (Wood Release punch
// tap/hold, a 4-tier tree-summon ladder, Wood Golem, Gracious Deity
// Gates + a cameo Sealing-Jutsu ultimate) — BALANCE_AUDIT schema
// exception like Madara: versatility outlier, not raw power. Source
// strips were RE-SLICED into clean uniform, feet-aligned cells
// (tools/reslice_strip.mjs → the *_uniform.png copies; the exact-
// as-uploaded originals — incl. the "treee"/"rellese"/"gaint"/
// "chang_land_scape" misspellings — are kept untouched per the build
// mandate). Templated off fellow Senju Tobirama. Stage 1 = registration
// + movement/state + intro pool only; normals/specials/ultimate = later
// stages (see HASHIRAMA_ASSET_MAP.md).
const hashirama = {
  rosterKey: "hashirama", name: "Hashirama Senju", universe: "naruto",
  portrait: "./hashirama_portrait.png",   // extracted from the master sheet in Stage 8; falls back gracefully until then
  archetypes: ["melee", "tactics", "summoner"],
  primary: "melee", secondary: ["zoner", "tactics"],
  // No dashTeleport — base speed 88 is below the 98 speed-tier threshold (flash/toji/maki/minato).
  // runWhenAdvancing: advancing toward the foe plays the run cycle (walk reuses the run sheet for retreat).
  movement: { runWhenAdvancing: true },
  traits: { hasEnergy: true, energyType: "chakra", mobility: "medium", scaling: "versatile", animeMovement: true },
  // maxEnergy 220: the largest Naruto kit (tree ladder + Wood Golem + Sealing ult) all draws chakra.
  // Durability is the point — the God of Shinobi is the roster's premier wall (HP/def above Madara).
  stats: { maxHealth: 1220, maxEnergy: 220, attack: 94, defense: 92, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  // Placeholder taijutsu values templated off Madara (fellow VotE powerhouse); real move wiring +
  // flavor normals land in Stage 2. combat.js _getMD reads THIS basic_attacks.
  basic_attacks: {
    light:    { damage: 46, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 90, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 84, rangeY: 48 },
    upAttack: { type: "launcher", damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    downAir:  { damage: 76, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    airAttack:{ damage: 56, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // HUD-only until Stage 7 (real logic + cost live in abilities.js executeHashiramaUltimate).
  // Sealing Jutsu: combo-ender → Gracious Deity Gates drop & immobilize → Naruto/Minato/Tobirama
  // cameo assists → red sealing-barrier overlay (bespoke freeze cinematic).
  ultimate: { name: "Sealing Jutsu", cost: 100, description: "Gracious Deity Gates slam down to pin the opponent, then Naruto, Minato and Tobirama arrive to help lock them inside a red sealing barrier." },
  hasSprites: true,
  // HEIGHT-REFERENCE audit (2026-08-12, added to harness/height_reference.mjs CHARS — he was built after
  // the last pass and had never been measured). His idle is an atypical WIDE FORWARD-LUNGE crouch (not the
  // roster's upright breathing stance), so its bbox under-measures his standing height: at the old 1.7 his
  // idle measured 115px (on canon for ~185cm) but his UPRIGHT combat poses (hurt/handSigns/attacks ≈ 73px
  // content) rendered ~126px — over canon. Calibrated to the upright standing frame instead: 115 / 73 ≈ 1.55,
  // so standing ≈ 113px (on canon) and the idle-crouch reads ~105px. This also trims the lunge's width bulk
  // (92px→~84px vs the ~50px roster) — the "much too large" report was WIDTH from the lunge pose, not height;
  // spriteScale can't slim width further without making him too short (source-art caveat, like Naruto-aura §3).
  // anchorY:0 everywhere → no anchor rescale on the scale change (feet stay planted).
  // REQUIRES the skins.js `hashirama` default entry (else applySkin() → spriteScale:1 native shrink) +
  // the spritesheets.js SPRITE_MANIFEST idle gate (else procedural box).
  spriteScale: 1.55,
  animationData: {
    // idle: sheet is 6×56 cells but CELL 0 is a blank gutter slice (9 stray px → he vanished for one frame
    // every loop). Real breathing loop = cells 1..5, so start at sourceX 56 and play 5 frames.
    idle: { frames: 5, width: 56, height: 70, speed: 6, anchorY: 0, sourceX: 56, sheet: "./hashirama_idle_uniform.png" },
    // No dedicated walk sheet — reuse the run cycle for the retreat/advance walk (runWhenAdvancing swaps to run when closing distance).
    walk: { frames: 6, width: 74, height: 66, speed: 6, anchorY: 0, sheet: "./hashirama_run_uniform.png" },
    run:  { frames: 6, width: 74, height: 66, speed: 4, anchorY: 0, sheet: "./hashirama_run_uniform.png" },
    dash: { frames: 3, width: 50, height: 77, speed: 3, anchorY: 0, sheet: "./hashirama_dash_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex pose (last cell, sourceX 2×62).
    jump: { frames: 3, width: 62, height: 97, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_jump_uniform.png" },
    fall: { frames: 1, width: 62, height: 97, speed: 6, anchorY: 0, sourceX: 124, loop: false, lockLastFrame: true, sheet: "./hashirama_jump_uniform.png" },
    // HURT — the 2-frame recoil from hit.png as a flinch; combat.js colorFlash tints the hit on top.
    // Every plain hitstun/stun routes here. (No dedicated block art in this batch → guard falls back to idle.)
    hurt:      { frames: 2, width: 59, height: 74, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_hit_uniform.png" },
    // KNOCKDOWN — reuses the same 2-frame hit strip (no dedicated knockdown sequence in this batch — GAP);
    // lockLastFrame holds the recovery pose during knockdownState.
    knockdown: { frames: 2, width: 59, height: 74, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_hit_uniform.png" },
    // hand_signs — the jutsu-cast STARTUP seal sequence (used as cast windup by later-stage Mokuton specials).
    handSigns: { frames: 7, width: 55, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_hand_signs_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, all RE-SLICED feet-aligned). combat.js basic_attacks (above) carries
    // the hit/frame data; these drive the SPRITE. loop:false + lockLastFrame holds the strike through
    // recovery. light=wood-fist jab, heavy=roundhouse kick, up=rising launcher (basic_attacks.upAttack),
    // air=neutral aerial (flying-kick combo), down_air=diving wood-spike attack. ──
    light:    { frames: 5, width: 76,  height: 79, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_foward_punch_uniform.png" },      // wood-fist forward jab
    heavy:    { frames: 6, width: 79,  height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_kick_uniform.png" },               // committed roundhouse kick
    up:       { frames: 5, width: 71,  height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_up_attack_uniform.png" },          // launcher: rising uppercut (white slash arc)
    air:      { frames: 10, width: 74, height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_air_combo_1_uniform.png" },        // neutral aerial — leaping flying kick
    down_air: { frames: 5, width: 126, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_down_air_attack_uniform.png" },    // diving wood-spike descent
    // ── STAGE 2 COMMAND CHAIN + POKE ── currentMove-keyed poses (sprite.js identity map). Chain = Fwd+Heavy
    // hashiComboA→B→Fin (cancel-on-HIT, shared rekkaContinue): ground punch-string → leaping kick → spinning
    // wood-beam LAUNCHER finisher. Poke = Fwd+Light hashiWoodStraight (long-reach wood-beam straight, punch_2). ──
    hashiComboA:       { frames: 9,  width: 73,  height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_punch_combo_1_uniform.png" },   // chain 1 — wood-fist punch string
    hashiComboB:       { frames: 10, width: 74,  height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_air_combo_1_uniform.png" },      // chain 2 — leaping kick (reuses the air sheet)
    hashiComboFin:     { frames: 10, width: 154, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_air_combo_2_uniform.png" },      // chain 3 — spinning wood-beam LAUNCHER finisher
    hashiWoodStraight: { frames: 3,  width: 76,  height: 75, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_punch_2_uniform.png" },          // Fwd+Light poke — long-reach wood-beam straight
    // ── STAGE 3 KUNAI SPECIALS ── _spriteCastMove cast poses (sprite.js cast override). Neutral Special =
    // ground throw; airborne Special = air throw. Both spawn the shared spinning-shuriken projectile
    // (hashirama_kunai_throw_projectile_uniform, 8f spin) via spawnProjectile.
    kunaiThrow:    { frames: 3, width: 68, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_kunai_throw_uniform.png" },       // ground throw wind-up→release
    kunaiThrowAir: { frames: 3, width: 55, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_kunai_throw_air_uniform.png" },   // airborne throw
    // ── STAGE 4 — WOOD RELEASE PUNCH (CHARGE key tap/hold, Rengoku architecture) + MOKUTON ARM (Fwd+Special) ──
    // charge = the hold pose while winding up on the CHARGE key (reuses the hand-seals sheet — channeling
    // Mokuton). woodPunch (tap) = base wood-spear punch; woodPunchSuper (hold) = the larger branching
    // eruption. mokutonArm = the arm-eruption cast pose. All currentMove/_spriteCast identity keys.
    charge:         { frames: 7,  width: 55,  height: 76,  speed: 4, anchorY: 0, loop: true, sheet: "./hashirama_hand_signs_uniform.png" },                    // CHARGE-hold wind-up pose (hand seals)
    woodPunch:      { frames: 7,  width: 210, height: 79,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_wood_rellese_punch_uniform.png" },        // TAP — wood-spear punch (mid reach). frames 9→7: cells 7-8 were trailing near-blank (debris only) → hold cell 6.
    woodPunchSuper: { frames: 8,  width: 185, height: 112, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_wood_rellese_punch_super_uniform.png" },  // HOLD — larger branching wood eruption (long reach). frames 10→8: sheet REPACKED to drop the two blank mid-cells (old 6-7) so the eruption cells stay contiguous.
    mokutonArm:     { frames: 8,  width: 57,  height: 76,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_mokuton_lul_4_uniform.png" },             // Fwd+Special — Mokuton arm eruption
    // ── STAGE 5 — TREE SUMMON 4-TIER LADDER (Down+Special, successive-cast escalation) ── the CASTER
    // summoning poses; the growing TREE is a stationary summon-hazard (spawnProjectile, spriteOnce growth).
    treeSummon1:    { frames: 3, width: 47, height: 66, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_treee_summon_1_uniform.png" },        // tier 1 caster (sprout)
    treeSummon2:    { frames: 4, width: 67, height: 79, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_treee_summon_2_uniform.png" },        // tier 2 caster (root-burst)
    treeSummon3:    { frames: 8, width: 69, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_tree_summon_level_2_uniform.png" },   // tier 3 caster (iconic tree)
    treeSummon4:    { frames: 6, width: 55, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_tree_level_3_uniform.png" },          // tier 4 caster (forest grove)
    // ── STAGE 6 — WOOD GOLEM (Up+Special) + GRACIOUS DEITY GATES (Back+Special) ── caster summon/seal poses;
    // the giant golem + torii gates are spawned entities (spawnProjectile) drawn over the fighters.
    woodGolemSummon: { frames: 3, width: 55, height: 76, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_gaint_wood_statue_summon_uniform.png" },   // Up+Special — summon the Wood Golem
    gatesCaster:     { frames: 3, width: 55, height: 76, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_gracious_deity_gates_uniform.png" },        // Back+Special — Gracious Deity Gates seal
    // ── STAGE 7 — SEALING JUTSU ULTIMATE ── the combo-ender→seal pose Hashirama holds through the freeze
    // cinematic (played via _spriteCastMove); gates/cameos/red-barrier are drawn as the cinematic overlay.
    sealingCombo:    { frames: 11, width: 76, height: 79, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_combo_into_sealing_justu_uniform.png" },   // Ultimate — combo-into-seal
    // ── PRE-MATCH INTRO POOL (introSequencePool, Red Ranger precedent) ── each match picks ONE sequence:
    //   • pillar rise → open: the signature wood-pillar erupts (part_1) then splits open and Hashirama
    //     steps out (part_2), played back-to-back as one continuous entrance.
    //   • shunshin: alt stance settling into a body-flicker exit (intro_2).
    introPillarRise: { frames: 24, width: 50, height: 100, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_intro_part_1_uniform.png" },
    introPillarOpen: { frames: 12, width: 56, height: 98,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_intro_part_2_uniform.png" },
    introShunshin:   { frames: 7,  width: 56, height: 79,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_intro_2_uniform.png" },   // frames 8→7: sheet REPACKED to drop the blank mid-cell (old 5) between the stance and the body-flicker exit.
    // WOOD CLONE cast pose (NOT an intro — was mis-categorized as intro-pool content, corrected 2026-08-12).
    // This is the CASTER gesture for the real Wood Clone special (double-QCF): Hashirama hand-signs and a
    // wood clone forms alongside him. currentMove = "woodCloneCast" → sprite.js identity-maps to this pose.
    woodCloneCast:   { frames: 12, width: 102, height: 81, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hashirama_wood_clone_intro_uniform.png" }
  },
  // introSequencePool = pool of SEQUENCES (game.js picks one at random per match). The pillar entrance
  // is a genuine two-step sequence (rise → open); shunshin is a single-step standalone intro.
  introSequencePool: [
    ["introPillarRise", "introPillarOpen"],
    ["introShunshin"]
  ]
}

// ─────────────────────────────────────────────────────────────────
// MINATO NAMIKAZE — the Fourth Hokage, "Konoha's Yellow Flash" (4th
// Naruto-universe char, after Naruto/Sasuke/Itachi/Tobirama). Staged
// build (see MINATO_ASSET_MAP.md). Source strips were RE-SLICED into
// clean uniform, feet-aligned cells (tools/reslice_strip.mjs → the
// *_uniform.png copies; the exact-as-uploaded originals are kept
// untouched per the build mandate). Templated off fellow shinobi
// Tobirama/Itachi. Stage 1 = registration + movement/state only;
// normals (S2), Naruto-ported shadow clones (S3), Flying Raijin mark/
// teleport (S4), Reaper Death Seal + Rasengan (S5) and the Kurama
// half-form ultimate (S6) land in later passes. Missing actions fall
// back to idle until then.
// ─────────────────────────────────────────────────────────────────
const minato = {
  rosterKey: "minato", name: "Minato Namikaze", universe: "naruto",
  portrait: "./minato_portrait.png",   // cropped from the master sheet in Stage 7; HUD falls back gracefully until then
  archetypes: ["melee", "tactics"],
  primary: "melee", secondary: ["tactics", "zoner"],
  // Yellow-Flash body-flicker — double-tap TOWARD the opponent = teleport dash
  // (same detectDoubleTapDashTeleport mechanic as Sasuke/Itachi/Tobirama/Toji).
  // The dash sheet is literally a Flying-Raijin flash-ring blink, so dashTeleport fits the art.
  movement: { dashTeleport: true },
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // maxEnergy 200: the Kurama ultimate (S6) spends the bar, Flying Raijin (S4) and
  // Reaper Death Seal (S5) both want a healthy chakra pool to work from.
  // FASTEST shinobi on the roster (speed 98 > Tobirama 96) — the "Yellow Flash" identity —
  // but kept off the glass-cannon extreme (HP 1150, near Naruto/Sasuke's 1180 tier).
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 92, defense: 82, speed: 98, maxJumps: 2, jumpPower: 33, dashSpeed: 17, dashDuration: 12, dashCooldownMax: 40 },
  // Placeholder taijutsu values templated off Itachi/Tobirama (fellow chakra shinobi);
  // real move wiring + flavor normals land in Stage 2. combat.js _getMD reads THIS basic_attacks.
  basic_attacks: {
    light:    { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 88, startup: 8, active: 4, recovery: 17, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 80, rangeY: 46 },
    upAttack: { type: "launcher", damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    downAir:  { damage: 74, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    airAttack:{ damage: 56, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 }
  },
  // HUD-only until Stage 6 (real logic + cost live in abilities.js in the Kurama pass).
  ultimate: { name: "Nine-Tails Chakra Mode", cost: 100, description: "Cloak in Kurama's chakra and manifest the half-tailed-fox avatar, then fire a Tailed Beast Bomb." },
  hasSprites: true,
  // idle content ~64px × 1.7 ≈ 109px on-screen ≈ roster height (Naruto/Sasuke/Itachi ~112-115).
  // REQUIRES the skins.js `minato` entry (else applySkin() pulls the spriteScale:1 fallback →
  // native size) + the spritesheets.js SPRITE_MANIFEST idle gate. Resliced cells are bottom-aligned
  // (feet at cell bottom, 1px pad) so a single anchorY: 0 plants feet across every standing action.
  spriteScale: 1.9,   // HEIGHT-REF: canon 179cm → target ~112px (was 1.7). See HEIGHT_REFERENCE.md; all anchorY are 0 (cell-bottom feet) so unchanged.
  animationData: {
    idle: { frames: 4, width: 37, height: 64, speed: 6, anchorY: 0, sheet: "./minato_idle_uniform.png" },
    // Only one locomotion strip was uploaded (a run cycle) — both walk and run read it (he's the fast ninja).
    walk: { frames: 6, width: 59, height: 45, speed: 5, anchorY: 0, sheet: "./minato_run_uniform.png" },
    run:  { frames: 6, width: 59, height: 45, speed: 4, anchorY: 0, sheet: "./minato_run_uniform.png" },
    // Flying-Raijin flash-ring blink — plays during the double-tap teleport dash.
    dash: { frames: 3, width: 83, height: 87, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_dash_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell).
    jump: { frames: 4, width: 48, height: 67, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_jump_uniform.png" },
    fall: { frames: 1, width: 48, height: 67, speed: 6, anchorY: 0, sourceX: 144, loop: false, lockLastFrame: true, sheet: "./minato_jump_uniform.png" },
    // Guard — single braced block pose; hold while blocking.
    guard: { frames: 1, width: 31, height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_block_uniform.png" },
    // HURT — frame 0 of the hit strip (the backward recoil) as a single-frame flinch; combat.js
    // colorFlash tints on top. Every plain hitstun/stun routes here.
    hurt: { frames: 1, width: 63, height: 42, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./minato_hit_uniform.png" },
    // KNOCKDOWN — the full 3-frame recoil→sprawl sequence. lockLastFrame holds the recovery pose.
    knockdown: { frames: 3, width: 63, height: 42, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_hit_uniform.png" },
    // Pre-match INTRO — no dedicated entrance strip was uploaded, so the idle stance doubles as the
    // intro (documented in MINATO_ASSET_MAP.md). Can be upgraded to a Flying-Raijin flash-in later.
    intro: { frames: 4, width: 37, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_idle_uniform.png" },
    // ── STAGE 2 NORMALS ── each resliced feet-aligned (tools/reslice_strip.mjs → *_uniform.png);
    // anchorY: 0 plants feet (bottom-aligned cells). loop:false + lockLastFrame holds the strike pose
    // through recovery. basic_attacks above carries the hit/frame data these render over. Keys are
    // light/heavy/up/air/down_air (the SPRITE keys — basic_attacks uses upAttack/downAir/airAttack for DATA).
    light:    { frames: 4,  width: 59, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_foward_kick_uniform.png" },        // quick forward kick
    heavy:    { frames: 8,  width: 69, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_twornado_kick_uniform.png" },       // committed spinning tornado kick
    up:       { frames: 6,  width: 59, height: 68, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_up_attack_uniform.png" },           // launcher: rising kunai slash
    air:      { frames: 6,  width: 50, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_super_up_attack_1_uniform.png" },   // neutral aerial rising strike
    down_air: { frames: 4,  width: 59, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_down_air_attack_uniform.png" },     // descending diagonal kick
    // ── STAGE 2 COMMAND CHAIN + POKES ── currentMove-keyed poses (sprite.js identity map). Chain =
    // Fwd+Heavy minatoRush1→Rush2→RushFin (cancel-on-hit). Pokes = Fwd+Light Floor Combo / Back+Heavy Melee Rush.
    minatoRush1:     { frames: 10, width: 59, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_melee_combo_1_uniform.png" },          // chain opener — taijutsu string
    minatoRush2:     { frames: 12, width: 64, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_yellow_falsh_combo_2_uniform.png" },   // chain 2 — Yellow-Flash flurry (kunai)
    minatoRushFin:   { frames: 10, width: 57, height: 68, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_super_down_attack_uniform.png" },      // finisher — flipping downward slam (launches)
    minatoFloorCombo:{ frames: 22, width: 73, height: 79, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_yellow_fash_floor_combo_uniform.png" },// Fwd+Light poke — advancing floor combo
    minatoMeleeRush: { frames: 20, width: 69, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_melee_combo_2_uniform.png" },          // Back+Heavy poke — dashing kunai rush (stitched combo)
    // ── STAGE 5 SPECIAL CAST POSES ── currentMove/_spriteCastMove identity poses. The Rasengan
    // orb / Big Ball sphere / Shinigami / reaching-arm all spawn as separate FX projectiles (abilities.js).
    minatoRasengan:  { frames: 11, width: 65, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_basic_rasengan_version_1_uniform.png" },  // Down+Special — dash-in Rasengan ram
    minatoBigBall:   { frames: 11, width: 65, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_basic_rasengan_version_1_uniform.png" },  // charge+Down+Special — Big Ball (reuses the ram body pose; the big sphere is a separate FX)
    minatoReaperCast:{ frames: 13, width: 44, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_reaper_death_seal_uniform.png" },          // charge+Special — Reaper Death Seal ritual (hand-seals)
    // Shadow-Clone SUMMON hand-sign — the CASTER's gesture, played on Minato (via _spriteCastMove) at
    // D→F spawn. This IS the shadow_clone_justu art (Minato forming the seal); the spawned clones now
    // stand in their OWN idle body (summons.js CLONE_BODY_SETS.minato → minato_idle) instead of wrongly
    // performing this gesture themselves. Mirrors how Naruto's clones use a standing stance, not a cast.
    minatoCloneCast: { frames: 3, width: 37, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./minato_shadow_clone_justu_uniform.png" }
  },
  // Single-entry pre-match intro pool (game.pickIntroVariant picks from here; one entry = always plays).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// MADARA UCHIHA — the Ghost of the Uchiha (6th Naruto-universe char,
// after Naruto/Sasuke/Itachi/Tobirama/Minato). The LARGEST single-char
// kit in the project (deliberate scope exception: 7 specials + a
// tap/hold TIERED ultimate vs. the standard 2-4 budget). Staged build
// (see MADARA_ASSET_MAP.md). Source strips RE-SLICED into clean
// uniform, feet-aligned cells (tools/reslice_strip.mjs → *_uniform.png
// copies; exact-as-uploaded originals kept untouched per the build
// mandate). Templated off fellow shinobi Tobirama/Minato. Stage 1 =
// registration + movement/state + coffin-emergence intro only. Normals
// (S2), the 7 specials one-at-a-time (S3), tiered-ultimate gating
// investigation (S4) + build (S5), portrait + harness + balance (S6)
// land in later passes. Missing actions fall back to idle until then.
// ─────────────────────────────────────────────────────────────────
const madara = {
  rosterKey: "madara", name: "Madara Uchiha", universe: "naruto",
  portrait: "./madara_portrait.png",   // extracted in Stage 6; falls back gracefully (procedural box) until then
  archetypes: ["melee", "zoner"],
  primary: "melee", secondary: ["zoner", "tactics"],
  // Physical dash (2-frame body-shift), not a teleport — his space-time
  // tools are Susanoo/Rinnegan content for later stages, not the base kit.
  movement: { runWhenAdvancing: true },   // advancing toward the foe plays the run cycle
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // maxEnergy 220: the tiered Susanoo ultimate (Stage 5) gates its HOLD
  // tier (Complete Susanoo) behind MORE than the standard Ultimate-ready
  // threshold, so the pool is deliberately the largest chakra bar on the
  // roster (ties Gojo's 220 cursed ceiling) to leave headroom above the
  // normal ult cost for that higher gate. Provisional — finalized in S4/S5.
  stats: { maxHealth: 1180, maxEnergy: 220, attack: 94, defense: 86, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 12, dashCooldownMax: 42 },
  // Stage 2 normals (real move data). combat.js _getMD reads THIS basic_attacks. In-band vs the
  // shinobi (Tobirama/Minato); NOTE base `attack` stat does NOT scale damage in this engine
  // (offenseMult derives from mode buffs, not base Atk — see BALANCE_AUDIT.md), so Atk 94 is flavor.
  //   light    = slap (quick gunbai swipe)          heavy   = combo_1 (committed swipe→palm string, reach)
  //   upAttack = up_attack (rising gunbai launcher)  airAttack = air_combo_1 (aerial flurry)
  //   airHeavy = susanoo_grab_air (AERIAL HARD — Susanoo-hand grab; air+Heavy, see combat.js hook)
  // GAP: down_air (genuinely absent) — intentionally NO downAir entry, so the button no-ops
  // (startMove returns false on null moveData) rather than faking a hit on the idle pose.
  basic_attacks: {
    light:    { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 92, startup: 9, active: 4, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 88, rangeY: 48 },
    upAttack: { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack:{ damage: 56, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    airHeavy: { damage: 84, startup: 9, active: 4, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: 4, rangeX: 100, rangeY: 70 }
  },
  // HUD-only until Stage 5 (real logic + tap/hold tier gate live in abilities.js). Tiered Susanoo:
  // TAP = Perfect Susanoo / Tengai Shinsei (standard Ultimate cost); HOLD = Complete Susanoo (gated
  // behind a HIGHER banked-energy threshold — investigated in Stage 4, built in Stage 5).
  ultimate: { name: "Susanoo", cost: 100, description: "Tiered Susanoo — TAP for Perfect Susanoo / Tengai Shinsei (meteor call-down); HOLD (requires more banked chakra) for the Complete Susanoo four-armed avatar." },
  hasSprites: true,
  // idle content 62px × 1.8 ≈ 112px on-screen ≈ roster height (Naruto/Sasuke/Itachi/Tobirama ~112-115).
  // REQUIRES the skins.js `madara` entry (else applySkin() pulls the spriteScale:1 fallback → native
  // ~62px half-size) + the spritesheets.js SPRITE_MANIFEST idle gate. Resliced cells are bottom-aligned
  // (feet at cell bottom, 1px pad) so a single anchorY:0 plants feet across every standing action.
  // HEIGHT-REF: canon 179cm (Naruto databook) → target ~112px (0.623×179). Was 1.8 (idle 106px, −5%); →1.89 lands on target. anchorY:0 → no re-anchor. Complete-Susanoo giant uses _canvasHeightFrac (excluded). See HEIGHT_REFERENCE.md.
  spriteScale: 1.89,
  animationData: {
    idle: { frames: 4, width: 26, height: 62, speed: 6, anchorY: 0, sheet: "./madara2_idle_1_uniform.png" },
    // No dedicated walk strip in the batch → reuse the run cycle for retreat at a slower cadence.
    walk: { frames: 6, width: 55, height: 54, speed: 6, anchorY: 0, sheet: "./madara2_run_uniform.png" },
    run:  { frames: 6, width: 55, height: 54, speed: 4, anchorY: 0, sheet: "./madara2_run_uniform.png" },
    dash: { frames: 2, width: 45, height: 52, speed: 4, anchorY: 0, sheet: "./madara2_dash_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell, sourceX 6×41).
    jump: { frames: 7, width: 41, height: 57, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_jump_uniform.png" },
    fall: { frames: 1, width: 41, height: 57, speed: 6, anchorY: 0, sourceX: 246, loop: false, lockLastFrame: true, sheet: "./madara2_jump_uniform.png" },
    // Guard — 4-frame settle into a braced block; hold the last frame while blocking.
    guard: { frames: 4, width: 30, height: 62, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_block_uniform.png" },
    // HURT — frame 0 of the HIT/DEAD/GET-UP strip (initial backward recoil) as a single-frame flinch;
    // combat.js colorFlash tints the hit on top. Every plain hitstun/stun routes here.
    hurt: { frames: 1, width: 64, height: 60, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./madara2_hit_uniform.png" },
    // KNOCKDOWN — the full 7-frame recoil→stagger→hunch→fall→sprawl(DEAD)→rise→stand sequence (the hit
    // sheet is literally a knockdown-getup chain, per the master "HIT / DEAD / GET UP" row). The source
    // strip merged the hunch+fall poses (no transparent gutter) so it was re-sliced with an explicit
    // split at x=151 → 7 clean single-figure cells (see MADARA_ASSET_MAP.md). lockLastFrame holds the
    // final standing-recovery pose.
    knockdown: { frames: 7, width: 64, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_hit_uniform.png" },
    // Pre-match INTRO — 12-frame coffin-emergence cinematic: a wooden coffin rises → tilts open →
    // Madara revealed inside the dark doorway → steps out in a light-burst → settles into stance.
    intro: { frames: 12, width: 113, height: 74, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_intro_uniform.png" },
    // ── STAGE 2 NORMALS ── each resliced feet-aligned (tools/reslice_strip.mjs → *_uniform.png);
    // anchorY:0 plants feet. loop:false + lockLastFrame holds the strike pose through recovery.
    light:     { frames: 4,  width: 36,  height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_slap_uniform.png" },              // quick gunbai swipe
    heavy:     { frames: 9,  width: 50,  height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_combo_1_uniform.png" },           // committed swipe→palm string (long reach)
    up:        { frames: 5,  width: 45,  height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_up_attack_uniform.png" },          // launcher: rising gunbai slash
    air:       { frames: 11, width: 69,  height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_air_combo_1_uniform.png" },        // neutral aerial flurry
    // AERIAL HARD / command-grab — Susanoo-hand grab-thrust; triggered by air+Heavy (combat.js hook).
    // Only the 2 CONFIRMED frames are used; the master shows 3 recovery frames that were never exported
    // → GAP, not fabricated (see MADARA_ASSET_MAP.md).
    air_heavy: { frames: 2,  width: 112, height: 82, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_susanoo_grab_air_uniform.png" },
    // GAPS (no animationData, intentional): down_air, aerial-light (master "AERIAL LIGHT" row = 1 orphan
    // frame + a motion-smear, not a usable animation — recrop attempted in Stage 2, remains a gap).
    // ── STAGE 3 SPECIAL cast poses ── shown via _spriteCastMove/_spriteCastTimer (sprite.js), NOT the
    // attacking path. Identity-mapped in sprite.js MOVE_TO_ACTION.
    madaraFireballCast: { frames: 15, width: 44, height: 62, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_fire_ball_justu_uniform.png" },   // Katon: Great Fireball — hand-seal→exhale
    madaraGunbaiSummon: { frames: 4,  width: 44, height: 62, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_gunbai_summon_uniform.png" },      // Gunbai Summon (Up) — war-fan reflect stance; holds the fan-up frame through the window
    madaraGunbaiSwing:  { frames: 10, width: 93, height: 66, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_gunbai_swing_uniform.png" },        // Gunbai Fan-Swing (Fwd) — committed overhead war-fan swing (melee; slash-line FX overlaid)
    madaraWoodSpikeCast:{ frames: 8,  width: 45, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_wood_spike_cast_uniform.png" },       // Mokuton Wood Spike (Down) — hand-seal→plant cast
    madaraWoodDragonCast:{ frames: 16, width: 37, height: 62, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara_wood_dragon_cast_uniform.png" },      // Mokuton Wood Dragon (Back) — long hand-seal cast
    // Fwd+Heavy command-normal (Stage 3 #6) — giant Susanoo fist, highest reach. currentMove-keyed melee (attacking path).
    madaraSusanooPunch: { frames: 5,  width: 130, height: 85, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara2_susanoo_punch_uniform.png" },        // Susanoo Base Punch (Fwd+Heavy)
    // TAP ULTIMATE cast pose (Stage 5) — Perfect Susanoo summon; plays through the Tengai Shinsei freeze-cinematic via _spriteCastMove.
    madaraTengaiCast:   { frames: 15, width: 37,  height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./madara_tengai_cast_uniform.png" }             // Perfect Susanoo / Tengai Shinsei summon
  },
  // Single-entry pre-match intro pool (game.pickIntroVariant picks from here; one entry = always plays).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// PAIN — NAGATO'S DEVA PATH  (Naruto universe — 9th Naruto sprite char)
// Top-tier technique-heavy Akatsuki archetype: gravity zoner + 6-option assist
// system + Chibaku Tensei ultimate. CONFIRMED schema-exception (same precedent
// as Madara): the kit is large enough that every real special-tier file earns
// its own slot rather than being trimmed to a standard 2-4 budget. Staged build
// — Stage 1 wires registration + movement/state only; specials/assists/ult land
// in Stages 3-7. Cutting reference is pain_transparent.png (per project note);
// pain_sprite_sheet_..._d48lwjr.png is labels/credits only, pain_exampls.png is
// reference mockups (never sliced). Uniform strips via tools/reslice_pain.py.
// ─────────────────────────────────────────────────────────────────
const pain = {
  rosterKey: "pain", name: "Pain", universe: "naruto",
  portrait: "./pain_portrait.png",   // Stage-1 placeholder (idle-frame crop); re-extracted from master sheet in Stage 8
  archetypes: ["zoner", "tactics"],
  primary: "zoner", secondary: ["tactics", "melee"],
  // Physical body-shift dash (2-frame). Deva Path's gravity tools (Shinra
  // Tensei / Bansho Ten'in) are Stage-3 specials, not the base traversal kit.
  movement: { runWhenAdvancing: true },   // advancing toward the foe plays the run cycle
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // maxEnergy 210: sits just under Madara/Gojo's 220 ceiling — the deep pool
  // feeds a genuinely large kit (4 specials + a 6-option assist system + the
  // Chibaku Tensei ult). Provisional Stage-1 value; finalized in the Stage-8
  // balance pass once every cost is wired.
  stats: { maxHealth: 1150, maxEnergy: 210, attack: 90, defense: 84, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 12, dashCooldownMax: 42 },
  // Stage-2 normals (real move data). combat.js _getMD reads THIS basic_attacks. In-band with the shinobi
  // (Madara/Tobirama/Minato); base `attack` stat does NOT scale damage in this engine (BALANCE_AUDIT.md).
  //   light    = light_attack (spinning kick)          heavy    = black_neddle_attack (9f rod-thrust, long reach)
  //   upAttack = up_attack (rising red-slash launcher)  airAttack = air_light (aerial kick)
  //   airHeavy = air_hard_attack (aerial rod-sword)     downAir  = down_air_attack (diving spike; combat.js spikes on down_air)
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 88, startup: 9, active: 4, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 92, rangeY: 46 },
    upAttack: { type: "launcher", damage: 64, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack:{ damage: 54, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    airHeavy: { damage: 80, startup: 9, active: 4, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: 4, rangeX: 96, rangeY: 66 },
    downAir:  { damage: 52, startup: 6, active: 5, recovery: 16, hitstun: 16, knockbackX: 3, knockbackY: 6, rangeX: 56, rangeY: 70 }
  },
  // HUD-only until Stage 7 (real cinematic logic lands there). Chibaku Tensei:
  // cast (arms raised) → projectile (sphere growth + debris) → ground effects
  // (flat → dome → flame pillar), reusing the freeze-cinematic architecture.
  ultimate: { name: "Chibaku Tensei", cost: 100, description: "Chibaku Tensei — raises a black sphere that draws in debris and slams down as a planetary devastation, blooming into a flame pillar." },
  hasSprites: true,
  // idle content ~56px × 2.0 ≈ 112px on-screen ≈ roster height (Naruto/Sasuke/
  // Itachi/Madara ~112-117). REQUIRES the skins.js `pain` entry (else applySkin()
  // pulls spriteScale:1 → native half-size) + the spritesheets.js idle gate.
  // Resliced cells are bottom-aligned (feet at cell bottom) so one anchorY:0
  // plants feet across every standing action. Tuned in the Stage-1 shot pass.
  spriteScale: 2.0,
  animationData: {
    idle: { frames: 4, width: 29, height: 59, speed: 6, anchorY: 0, sheet: "./pain_idle_uniform.png" },
    // No dedicated walk strip → reuse the run cycle for retreat at a slower cadence.
    walk: { frames: 8, width: 60, height: 49, speed: 6, anchorY: 0, sheet: "./pain_run_uniform.png" },
    run:  { frames: 8, width: 60, height: 49, speed: 4, anchorY: 0, sheet: "./pain_run_uniform.png" },
    dash: { frames: 2, width: 43, height: 60, speed: 4, anchorY: 0, sheet: "./pain_dash_uniform.png" },
    // jump.png = crouch→launch→air→descend arc; play once + hold. fall = the last (descent) cell.
    jump: { frames: 4, width: 51, height: 54, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_jump_uniform.png" },
    fall: { frames: 1, width: 51, height: 54, speed: 6, anchorY: 0, sourceX: 153, loop: false, lockLastFrame: true, sheet: "./pain_jump_uniform.png" },
    // Guard — single braced-block pose; hold it while blocking.
    guard: { frames: 1, width: 35, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_block_uniform.png" },
    // HURT — frame 0 of the 2-frame recoil strip as a single-frame flinch; combat.js colorFlash tints on top.
    hurt: { frames: 1, width: 41, height: 62, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./pain_hit_uniform.png" },
    // KNOCKDOWN / GET-UP — the dedicated stand_up strip (prone-sprawl → push-up → rise → stand). The initial
    // fall-to-ground is covered by the hurt flinch; this strip plays the recovery. lockLastFrame holds standing.
    knockdown: { frames: 4, width: 67, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_stand_up_uniform.png" },
    // ── STAGE 2 NORMALS ── each resliced feet-aligned via tools/reslice_pain.py; anchorY:0 plants feet,
    // loop:false + lockLastFrame holds the strike pose through recovery. Identity-mapped (light/heavy/up/
    // air/air_heavy/down_air already exist generically in sprite.js MOVE_TO_ACTION).
    light:     { frames: 5, width: 53, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_light_uniform.png" },      // spinning kick
    heavy:     { frames: 9, width: 75, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_heavy_uniform.png" },      // black-rod thrust string (long reach)
    up:        { frames: 4, width: 63, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_up_uniform.png" },         // launcher: rising red-slash kick
    air:       { frames: 4, width: 73, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_air_uniform.png" },        // neutral aerial kick
    air_heavy: { frames: 5, width: 68, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_airheavy_uniform.png" },   // aerial rod-sword thrust (air+Heavy)
    down_air:  { frames: 4, width: 57, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_downair_uniform.png" },    // diving spike (air+Down)
    // ── STAGE 2 COMMAND NORMALS ── driven by updatePainCommandCombat (abilities.js). currentMove-keyed
    // melee (attacking path), so each needs an explicit MOVE_TO_ACTION entry in sprite.js.
    // Fwd+Light single command normal — punch-jab string + slash FX (from the standalone light_attack_2 sheet).
    painJab:   { frames: 5, width: 63, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_jab_uniform.png" },
    // Fwd+Heavy 3-stage rekka — the ground_combo COMPILATION grid sliced by row (spin → launcher → finisher).
    // Re-tap Heavy during a clean-hit recovery advances the chain (shared rekkaContinue gate).
    painCombo1:{ frames: 5, width: 53, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_combo1_uniform.png" },     // opener (spin)
    painCombo2:{ frames: 4, width: 63, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_combo2_uniform.png" },     // mid (launcher)
    painCombo3:{ frames: 5, width: 59, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_combo3_uniform.png" },     // finisher
    // ── STAGE 3 GRAVITY-SPECIAL cast poses ── shown via _spriteCastMove/_spriteCastTimer (sprite.js), NOT
    // the attacking path. Identity-mapped in sprite.js MOVE_TO_ACTION. The force/shockwave is applied on
    // the release frame by executePainSpecial (abilities.js); these strips are the wind-up poses.
    painAlmightyPushCast: { frames: 8, width: 56, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_almighty_push_uniform.png" },   // Shinra Tensei — palm thrust
    painAlmightyPullCast: { frames: 7, width: 52, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_almighty_pull_uniform.png" },   // Bansho Ten'in — reeling gesture
    painSuperPushCast:    { frames: 6, width: 58, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_super_push_uniform.png" },       // Hard Shinra Tensei — both arms
    // ── STAGE 4 DEDERA DOUBLE ATTACK cast poses ── Fwd+Special sequence (executePainSpecial). The cast is the
    // Deidara-cameo clay-forming pose (confirmed homage), the rise is Pain's rising follow-up; the clay-bird
    // + explosion are projectile/impact art (not animationData). Identity-mapped in sprite.js MOVE_TO_ACTION.
    painDederaCast: { frames: 3, width: 64, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_dedera_cast_uniform.png" },   // Deidara cameo — clay forming
    painDederaRise: { frames: 5, width: 68, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_dedera_rise_uniform.png" },     // Pain's rising follow-up into the throw
    // ── STAGE 7 ULTIMATE cast pose ── Chibaku Tensei: Pain raises his arms, forming the sphere. Plays through
    // the freeze via _spriteCastMove (painChibakuTenseiCinematic.js). Identity-mapped in sprite.js MOVE_TO_ACTION.
    painChibakuCast: { frames: 6, width: 59, height: 66, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./pain_chibaku_cast_uniform.png" }
  }
  // No introPool yet — no dedicated intro art in the movement batch; match starts on the idle stance
  // (game.pickIntroVariant tolerates an absent pool). Revisited if an intro sheet surfaces later.
}

// ─────────────────────────────────────────────────────────────────
// OBITO UCHIHA  (Naruto universe — 7th Naruto sprite char)
// Space-time Kamui specialist: evasive intangibility zoner. Kit is built in
// stages — this Stage-1 block registers movement/state only. Normals (S2),
// ranged specials (S3), Kamui intangibility (S4), teleport/portal mobility
// (S5), the opponent-teleport command grab (S6) and the Juubi ultimate (S7)
// are layered on top. Art = raw obito_melee_* strips resliced to uniform
// bottom-aligned cells (tools/reslice_obito.py) → obito_*_uniform.png.
// ─────────────────────────────────────────────────────────────────
const obito = {
  rosterKey: "obito", name: "Obito Uchiha", universe: "naruto",
  // Arcade BOSS profile (Stage 20) — the arcade final boss (#1). Applied only as the arcade boss
  // opponent; stripped in normal play. Stat-based boss-ness (2× HP, larger, light-hit super-armor,
  // free specials, impossible AI, single round). Ten-Tails startInForm left out for v1 (its Juubi is
  // a cinematic ult, not a clean persistent giant mode). See _applyBossProfile in game.js.
  bossProfile: { healthMult: 2.0, scale: 1.4, superArmorThreshold: 55, meterFree: true, aiDifficulty: "impossible", noRoundLimit: true },
  portrait: "./obito_portrait.png",   // extracted in Stage 8; falls back gracefully (procedural box) until then
  archetypes: ["melee", "zoner"],
  primary: "melee", secondary: ["zoner", "tactics"],
  // Advancing toward the foe plays the run cycle (shared shinobi movement feel).
  movement: { runWhenAdvancing: true },
  // Chakra fuels the Stage-4 Kamui intangibility CONTINUOUS drain + the space-time
  // specials. Sits just under Madara's 220 ceiling — big enough to sustain a real
  // intangibility window but not trivially all-match.
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // In-band with the roster's Uchiha/Sharingan tier (Madara 1180/94/86/92, Sasuke,
  // Itachi). speed 96 is deliberately just under Toji's 98 teleport-tier gate — Obito
  // is added to the double-tap teleport list EXPLICITLY in Stage 5 (Kamui feat), not by
  // raw base speed. Provisional; revisited as later stages land.
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 90, defense: 84, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 12, dashCooldownMax: 42 },
  // Stage 2 normals (real move data; combat.js _getMD reads this). Rod-fighter — the
  // heavy is a long-reach staff thrust (hit_2), the up-attack a rising launcher (up_attack).
  // In-band with the Uchiha tier (Madara 42/92/66/56; Obito ATK 90 is flavor — base Atk
  // does NOT scale damage in this engine, see BALANCE_AUDIT.md).
  //   light = hit_1 (quick rod spin)     heavy = hit_2 (committed staff thrust, long reach)
  //   upAttack = up_attack (launcher)    airAttack = hit_3 (aerial rod strike)
  //   downAir = down_air_attack (aerial down strike, spike-ish)
  // The hit_1/2/3 combo files ALSO drive the Fwd+Heavy "Kamui Rod Combo" 3-hit command
  // rekka (obitoRod1→2→3) — the "overflow into a command-normal chain" (abilities.js).
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 78, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 98, rangeY: 46 },   // staff thrust — long reach
    upAttack: { type: "launcher", damage: 60, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack:{ damage: 52, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 58, startup: 6, active: 4, recovery: 14, hitstun: 16, knockbackX: 3, knockbackY: 4, rangeY: 60 }               // aerial down strike (spike-ish)
  },
  // Stage 3 ranged specials — SPECIAL button, direction-branched via _specialHeldDir
  // (Killua/Chrollo/Ichigo architecture): neutral = Shuriken Throw (airborne → air-throw),
  // Forward = Chakra Rod Throw, Up = Giant Shuriken. Down/Back reserved for later stages
  // (Kamui intangibility toggle S4, opponent-teleport grab S6). Real logic in abilities.js.
  specials: {
    shurikenThrow: { cost: 18, description: "Shuriken Throw — a spinning shuriken hurled straight (neutral); airborne = a diagonal down-forward air-throw." },
    rodThrow:      { cost: 22, description: "Chakra Rod Throw — a thrown black receiver rod, fast + long reach (Forward)." },
    giantShuriken: { cost: 34, description: "Giant Shuriken — a massive fūma-style spinning shuriken, slow but heavy (Up)." },
    kamuiPortal:   { cost: 20, description: "Kamui Warp — Down+Special: opens a Kamui portal and jumps himself a long distance across the map (self-mobility, no damage)." }
  },
  ultimate: { name: "Juubi", cost: 100, description: "Ten-Tails Jinchūriki — giant-form cinematic: camera push-in → Juubi manifestation → one massive attack → pull back (Stage 7)." },
  hasSprites: true,
  // idle content 84px × 1.30 ≈ 109px on-screen = target for canon 175cm (0.623×175,
  // see HEIGHT_REFERENCE.md). REQUIRES the skins.js `obito` default entry (else applySkin()
  // pulls the spriteScale:1 fallback → native ~84px half-size) + the spritesheets.js idle gate.
  // Resliced cells are bottom-aligned (feet at cell bottom) so a single anchorY:0 plants feet
  // across every standing action.
  spriteScale: 1.30,
  animationData: {
    idle:      { frames: 5, width: 40, height: 85, speed: 6, anchorY: 0, sheet: "./obito_idle_uniform.png" },
    walk:      { frames: 6, width: 74, height: 65, speed: 6, anchorY: 0, sheet: "./obito_run_uniform.png" },
    run:       { frames: 6, width: 74, height: 65, speed: 4, anchorY: 0, sheet: "./obito_run_uniform.png" },
    dash:      { frames: 3, width: 65, height: 87, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_dash_uniform.png" },
    jump:      { frames: 3, width: 61, height: 79, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_jump_uniform.png" },
    fall:      { frames: 8, width: 93, height: 98, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_fall_uniform.png" },   // obito_melee_fall_to_jump_up
    guard:     { frames: 1, width: 49, height: 80, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_block_uniform.png" },
    // Stage 2 normals (5 slots). Engine action keys light/heavy/up/air/down_air (MOVE_TO_ACTION identity).
    light:     { frames: 6, width: 90, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_light_uniform.png" },      // hit_1 rod spin
    heavy:     { frames: 5, width: 87, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_heavy_uniform.png" },      // hit_2 staff thrust (long reach)
    up:        { frames: 6, width: 91, height: 83, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_up_uniform.png" },         // up_attack rising launcher
    air:       { frames: 5, width: 76, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_air_uniform.png" },        // hit_3 aerial rod strike
    down_air:  { frames: 4, width: 72, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_downair_uniform.png" },    // aerial down strike
    // Fwd+Heavy "Kamui Rod Combo" 3-hit command rekka (obitoRod1→2→3). Reuses the hit_1/2/3
    // combo art as the chain stages — explicit identity maps in MOVE_TO_ACTION so no recovery
    // tail can resolve to the fallback 128² box (see sprite.js Sasuke-dashStrike gotcha note).
    obitoRod1: { frames: 6, width: 90, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_light_uniform.png" },      // chain opener (hit_1)
    obitoRod2: { frames: 5, width: 87, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_heavy_uniform.png" },      // chain mid (hit_2 thrust)
    obitoRod3: { frames: 5, width: 76, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_air_uniform.png" },        // chain finisher / launcher (hit_3)
    // Stage 3 ranged-special CAST poses (played via _spriteCastMove; projectiles release mid-cast).
    obitoShurCast:    { frames: 3, width: 49, height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_shurcast_uniform.png" },      // shuriken GROUND throw (also giant-shuriken cast)
    obitoShurCastAir: { frames: 4, width: 59, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_shurcast_air_uniform.png" },  // shuriken AIR throw
    obitoRodCast:     { frames: 4, width: 67, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_rodcast_uniform.png" },        // chakra rod throw
    obitoTeleport:    { frames: 6, width: 92, height: 131, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_teleport_uniform.png" },      // Stage 5 Kamui blink pose (self-portal / teleport-grab ONLY — NOT the speed-tier dash)
    obitoKamuiActivate:{ frames: 2, width: 59, height: 84,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_kamui_activate_uniform.png" },  // Kamui intangibility INITIATION pose — the ONE visual tell, plays once at the toggle-on moment
    // Hurt state machine — all four taking_damage variants wired to real engine hooks
    // (sprite.js _resolveAction requests hurt / hurt_air / knockdown / getup by state):
    hurt:      { frames: 2, width: 55, height: 84, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_hit1_uniform.png" },   // grounded flinch
    hurt_air:  { frames: 3, width: 53, height: 86, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_hit2_uniform.png" },   // airborne flinch
    knockdown: { frames: 2, width: 87, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_hit3_uniform.png" },   // floored sprawl (wide/low cell)
    getup:     { frames: 2, width: 54, height: 80, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_hit4_uniform.png" },   // tech-roll recovery
    // DORMANT (engine gap — sprite.js has no crouch / directional back-dash / air-block
    // action; see Madara/Nezuko). Art is resliced + wired so it's ready if the engine gains
    // these states; the buttons currently reuse dash / guard respectively.
    crouch:    { frames: 3, width: 58, height: 62, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_crouch_uniform.png" },
    backDash:  { frames: 1, width: 55, height: 73, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_back_dash_uniform.png" },
    blockAir:  { frames: 1, width: 48, height: 80, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./obito_block_air_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// TOBI  (masked Obito alias) — FULLY SEPARATE roster character.
// rosterKey "tobi", own character-select entry, own runtime instance. Reuses
// Obito's Kamui-family MECHANIC ARCHITECTURE as a template (later stages) but
// shares ZERO live state — every reused field is renamed into a `_tobi*`
// namespace and every function/module is Tobi's own (see Stage 0 isolation plan).
// Art = raw masked_man_* strips resliced to uniform bottom-aligned cells
// (tools/reslice_tobi.py) → masked_man_*_uniform.png. Raw uploads keep their exact
// names (incl. "kunia"/"projectilez"/colon'd hit:get_up); derived _uniform sheets
// drop colons so JS `sheet:` paths never hit the URL scheme-separator problem.
// ─────────────────────────────────────────────────────────────────
const tobi = {
  rosterKey: "tobi", name: "Tobi", universe: "naruto",
  portrait: "./tobi_portrait.png",   // extracted in Stage 7 (no masked_man_portrait exists); procedural-box fallback until then
  archetypes: ["melee", "tricky"],
  primary: "melee", secondary: ["zoner", "tactics"],
  movement: { runWhenAdvancing: true },
  // Chakra fuels the Stage-4 Kamui intangibility CONTINUOUS drain + space-time specials —
  // its own `_tobi*` state, never Obito's. In-band with the Uchiha/Sharingan tier.
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  // Uchiha tier band (Madara 1180/94/86/92, Obito 1150/90/84/96). speed 96 sits just under
  // Toji's 98 teleport-tier gate — Tobi is added to the double-tap teleport list EXPLICITLY
  // in Stage 2 (Kamui feat), not by raw base speed. Provisional; revisited at Stage 7 balance.
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 90, defense: 84, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 12, dashCooldownMax: 42 },
  // Stage 2 normals (real move data; combat.js _getMD reads this). Art reuses the available
  // masked_man attack strips (only 4 exist → light reuses the up_attack sheet's first frames,
  // exactly like Obito reused his hit_1/2/3 sheets across multiple roles):
  //   light = up_attack[0:2] (quick chain-whip flick, reach)   heavy = dash_combo (committed advancing rush + burst)
  //   upAttack = up_attack (overhead chain-whip launcher)       airAttack = air_kunia (aerial kunai throw → projectile)
  //   downAir = down_air_attack (head-down diving stomp, spike-ish)
  // The air normal ALSO spawns a thrown kunai (masked_man_air_kunia_throw_projectile) via the
  // updateTobiCombat active-frame hook in abilities.js. Base Atk is flavor (does not scale damage — see BALANCE_AUDIT.md).
  basic_attacks: {
    light:    { damage: 38, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 92, rangeY: 40 },   // chain-whip flick — reach
    heavy:    { damage: 76, startup: 8, active: 5, recovery: 20, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 100, rangeY: 48 },  // committed dashing rush
    upAttack: { type: "launcher", damage: 58, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack:{ damage: 44, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: -2 },   // aerial kunai throw (melee + projectile)
    downAir:  { damage: 56, startup: 6, active: 4, recovery: 14, hitstun: 16, knockbackX: 3, knockbackY: 4, rangeY: 60 }                // diving stomp (spike-ish)
  },
  // Stage 3 signature — Chain Grab (neutral Special, grounded). A NEW multi-stage grab-combo route
  // (not in Obito's kit): whip startup → long-reach chain snag → snatched pull → hard smash-down
  // finisher (+ dust FX). Scripted state machine in abilities.js (updateTobiChainGrab), all `_tobiChain*`
  // state. Later stages add Kamui specials on the other Special directions.
  specials: {
    chainGrab:  { cost: 30, description: "Chain Grab — Special (neutral): whip out a long chain to SNATCH the foe, reel them in, then smash them into the ground (multi-stage command grab)." },
    kamuiPortal:{ cost: 20, description: "Kamui Warp — Down+Special: open a Kamui portal and phase a long distance across the map (self-mobility, no damage)." },
    kamuiGrab:  { cost: 20, description: "Kamui Grab — Back+Special: a close-range grab that warps the foe to a random far point (space-time displacement, no damage)." },
    firePhoenix:{ cost: 42, description: "Fire Phoenix Jutsu — Forward+Special: exhale a GIANT screen-filling fireball that bursts mid-flight into several smaller sub-fireballs (real multi-projectile split) + explosion." }
  },
  ultimate: { name: "Nine-Tails", cost: 100, description: "Nine-Tails Bijūdama — giant-form cinematic: summon the Nine-Tails (Kurama) → it rears and charges a Tailed Beast Bomb → fires it at the foe → pull back. (Distinct from Obito's Ten-Tails.)" },
  hasSprites: true,
  // idle content 57px × 1.90 ≈ 108px on-screen = target for canon ~175cm (0.623×175,
  // see HEIGHT_REFERENCE.md), matching the Uchiha tier. REQUIRES the skins.js `tobi` default
  // entry (else applySkin() pulls the spriteScale:1 fallback → native ~57px half-size) + the
  // spritesheets.js idle gate. Resliced cells are bottom-aligned (feet at cell bottom) so a
  // single anchorY:0 plants feet across every standing action.
  spriteScale: 1.90,
  introPool: ["intro"],
  animationData: {
    idle:      { frames: 4, width: 32, height: 60, speed: 6, anchorY: 0, sheet: "./masked_man_idle_uniform.png" },
    walk:      { frames: 4, width: 53, height: 55, speed: 6, anchorY: 0, sheet: "./masked_man_run_uniform.png" },
    run:       { frames: 4, width: 53, height: 55, speed: 4, anchorY: 0, sheet: "./masked_man_run_uniform.png" },
    dash:      { frames: 2, width: 33, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_dash_uniform.png" },
    jump:      { frames: 4, width: 44, height: 64, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_jump_uniform.png" },
    fall:      { frames: 4, width: 44, height: 64, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_jump_uniform.png" },   // reuse jump (no separate fall art) — hold last frame
    guard:     { frames: 1, width: 35, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_block_uniform.png" },
    // Stage-1 wired: dashing lunge (8f). Doubles as the Stage-2 `heavy` normal art (below).
    dashCombo: { frames: 8, width: 72, height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_dash_combo_uniform.png" },
    // Stage 2 normals (5 slots). Engine action keys light/heavy/up/air/down_air (MOVE_TO_ACTION identity).
    light:     { frames: 2, width: 67, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_up_attack_uniform.png" },   // quick chain-whip flick (first 2 frames of the up-attack strip)
    heavy:     { frames: 8, width: 72, height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_dash_combo_uniform.png" },  // committed dashing rush + star-burst
    up:        { frames: 4, width: 67, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_up_attack_uniform.png" },   // overhead chain-whip launcher
    air:       { frames: 3, width: 49, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_air_kunia_uniform.png" },   // aerial kunai throw (spawns projectile)
    down_air:  { frames: 4, width: 57, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_down_air_uniform.png" },    // head-down diving stomp
    // Stage 3 Chain Grab cast poses (played via _spriteCastMove by the updateTobiChainGrab state
    // machine). The raw strips' "ENEMY" annotation frames were dropped in reslice_tobi.py.
    tobiChainGrab:     { frames: 5, width: 58,  height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_chain_grab_uniform.png" },     // whip wind-up
    tobiChainAttack1:  { frames: 5, width: 129, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_chain_attack1_uniform.png" },  // long-reach chain snag
    tobiChainSnatched: { frames: 6, width: 115, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_chain_snatched_uniform.png" }, // reel-in pull
    tobiChainSmash:    { frames: 4, width: 117, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_chain_smash_uniform.png" },     // hard smash-down finisher
    // Stage 4 Kamui cast pose — intangibility activation + the space-time portal/grab casts (3f).
    tobiKamuiActivate: { frames: 3, width: 41,  height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_kamui_activation_uniform.png" },
    // Stage 5 Fire Phoenix Jutsu cast pose (6f exhale; the giant fireball releases at the exhale beat).
    tobiFireCast:      { frames: 6, width: 51,  height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_fire_cast_uniform.png" },
    // Pre-match intro — 14f beckoning taunt ("come here" wave). introPool picks it each match.
    intro:     { frames: 14, width: 40, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_intro_uniform.png" },
    // Hurt state machine — the single raw masked_man_hit:get_up strip (7 islands) split by
    // reslice_tobi.py into separate bottom-aligned sheets (0-1 flinch / 2-3 airborne tumble /
    // 2-4 knocked-back→floored / 5-6 rising). sprite.js _resolveAction requests these by state.
    hurt:      { frames: 2, width: 38, height: 55, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_hurt_uniform.png" },        // grounded flinch
    hurt_air:  { frames: 2, width: 57, height: 47, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_hurt_air_uniform.png" },    // airborne tumble
    knockdown: { frames: 3, width: 66, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_knockdown_uniform.png" },   // knocked-back → floored (wide/low cell)
    getup:     { frames: 2, width: 42, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./masked_man_getup_uniform.png" }        // rising recovery
  }
}

// ─────────────────────────────────────────────────────────────────
// ISSHIKI OTSUTSUKI  (rosterKey "isshiki", universe "naruto") — Boruto's apex Otsutsuki antagonist.
// Source = AltairFrameMaker DeviantArt sheet (attribution MANDATORY, see credits.js). SCHEMA-EXCEPTION
// character (Madara/Pain tier): 6 genuinely distinct real named techniques + combo-chain normals, wired
// in full rather than trimmed to a standard special budget. Non-uniform / FX-baked / MIXED source strips
// RE-SLICED to feet-aligned isshiki_*_uniform.png cells (tools/reslice_isshiki.py) — which also SPLITS
// hit_sheet's 5 baked-in actions (see the mixed-file warning in the build doc). Filename typos ("specail_N")
// preserved on the SOURCE files only; code/UI use the corrected technique names. See ISSHIKI_ASSET_MAP.md.
//
// ARCHETYPE: elite dimensional-warfare zoner/bruiser — teleports (Sukunahikona shrink), warps mass
// (Daikokuten rods/cubes), rains fire (Gokashin Ensen). Top-tier across the board but sets NO new roster
// stat record (that stays Superman's slot): HP 1300 (below Omni-Man 1400), atk 96 (ties Jason/Toji, below
// Netero/Superman 98/100), def 90 (ties Jason, below Superman 92), spd 92 (agile, below Netero 94). The
// breadth of the 6-technique kit is the outlier surface, held in check by the honest ×0.60 damage scale.
//
// STAGE 1 = registration + movement/state over the reslice'd *_uniform.png strips. hit_sheet split into its
// FIVE real actions mapped to the engine's real hit-state slots (tobi precedent): hurt (standing flinch) /
// hurt_air (airborne tumble, ONE escalating sequence) / knockdown (grounded lying) / getup (regrow rise) +
// the Sukunahikona evasive shrink-to-dot sub-action (reused by the Stage-3 special). Normals/specials/ult
// DATA below are Stage-2/3/4 wiring targets; Stage 1 ships movement only.
// ─────────────────────────────────────────────────────────────────
const isshiki = {
  rosterKey: "isshiki", name: "Isshiki Otsutsuki", universe: "naruto", color: "#b02a2a",
  portrait: "./isshiki_portrait.png",   // Stage 5 — cropped from idle; falls back cleanly (procedural box) until then.
  archetypes: ["zoner", "bruiser"],
  primary: "melee", secondary: ["zoner"],
  traits: { hasEnergy: true, energyType: "karma", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Karma", effect: "Otsutsuki dimensional power — fuels Sukunahikona shrink-warps, Daikokuten mass-manipulation, and the Gokashin Ensen finishers." },
  // Elite top-tier, NO new roster records (see header). maxEnergy 200 = Karma pool (ties Superman, below Madara 220).
  stats: { maxHealth: 1300, maxEnergy: 200, attack: 96, defense: 90, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 11, dashCooldownMax: 40 },
  // ── Normal-attack DATA (sprites wired Stage 2 over the attacks_base / air_attacks combo chains). ──
  // Top-tier melee: fast, hard-hitting, good reach. Refined in Stage 2 against the real chain frames.
  basic_attacks: {
    light:    { damage: 46, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 90, startup: 8, active: 3, recovery: 17, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 92, rangeY: 50 },
    upAttack: { type: "launcher", damage: 68, startup: 6, active: 3, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, airOK: false },
    airAttack:{ damage: 58, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 74, startup: 6, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  // ── Special DATA stubs — behaviour lands in abilities.js at Stage 3/4. Corrected technique names. ──
  specials: {
    sukunahikona:  { cost: 25, damage: 60,  startup: 8, active: 3, recovery: 14, hitstun: 16, knockbackX: 5, knockbackY: -1, isSpecial: true, effect: "shrink-warp strike (Sukunahikona)" },
    daikokutenRods:{ cost: 30, damage: 80,  startup: 9, active: 4, recovery: 16, hitstun: 18, knockbackX: 6, knockbackY: -1, isSpecial: true, effect: "materialized black rods (Daikokuten)" },
    daikokutenCubes:{ cost: 40, damage: 95, startup: 11, active: 5, recovery: 20, hitstun: 20, knockbackX: 7, knockbackY: -2, isSpecial: true, effect: "enlarged crushing cubes (Daikokuten)" },
    gokashinEnsen: { cost: 45, damage: 100, startup: 12, active: 6, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2, isSpecial: true, effect: "Sage Art: Gokashin Ensen — hell-fire wave" }
  },
  // ULTIMATE (Finisher 3) + 2 bonus finishers land at Stage 4 (freeze-cinematic; effects.png payoff).
  ultimate: { name: "Daikokuten Barrage", cost: 100, description: "Finisher 3 freeze-cinematic — Daikokuten black-rod barrage (Stage 4)." },
  hasSprites: true,
  // Tall lanky Otsutsuki. idle content ~87px. Target ~122px on-screen (imposing top-tier, above the human
  // band, below Jason's 133). 87 × 1.40 ≈ 122px. Verified via measureSprite in Stage 1. anchorY 0 plants feet.
  spriteScale: 1.40,
  animationData: {
    // ── MOVEMENT / STATE — reslice'd feet-aligned (*_uniform.png); anchorY 0 plants feet. ──
    idle:  { frames: 1, width: 44, height: 89, speed: 10, anchorY: 0, sheet: "./isshiki_idle_uniform.png" },   // single idle pose (only 1 idle cell in source)
    // No dedicated walk/run art — Isshiki glides on the dash pose (3f), slower for walk.
    walk:  { frames: 3, width: 72, height: 56, speed: 6, anchorY: 0, sheet: "./isshiki_dash_uniform.png" },
    run:   { frames: 3, width: 72, height: 56, speed: 4, anchorY: 0, sheet: "./isshiki_dash_uniform.png" },
    dash:  { frames: 3, width: 72, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_dash_uniform.png" },
    // jump.png = crouch→rise arc; play once + hold. fall = the descent pose (last cell 2 → sourceX 53×2 = 106).
    jump:  { frames: 3, width: 53, height: 80, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_jump_uniform.png" },
    fall:  { frames: 1, width: 53, height: 80, speed: 6, anchorY: 0, sourceX: 106, loop: false, lockLastFrame: true, sheet: "./isshiki_jump_uniform.png" },
    guard: { frames: 1, width: 44, height: 83, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_block_uniform.png" },
    win:   { frames: 1, width: 50, height: 89, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_win_uniform.png" },
    // ── hit_sheet's 5 split actions (tools/reslice_isshiki.py). Mapped to engine hit-states. ──
    hurt:      { frames: 2, width: 54, height: 74, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_hurt_uniform.png" },        // standing flinch
    hurt_air:  { frames: 5, width: 76, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_hurt_air_uniform.png" },    // airborne tumble (escalating heavy-hit)
    knockdown: { frames: 2, width: 81, height: 41, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_knockdown_uniform.png" },   // grounded lying (wide/low cell)
    getup:     { frames: 4, width: 70, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_getup_uniform.png" },        // regrow → standing recovery
    // Sukunahikona shrink-to-dot / vanish — the evasive shrink sub-sequence (sub-10px cells KEPT). Reused
    // by the Stage-3 Sukunahikona special. Held via lockLastFrame (the vanished dot) while the warp resolves.
    sukunahikonaShrink: { frames: 4, width: 41, height: 16, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_sukunahikona_uniform.png" },
    // ── STAGE 2 COMBO STRINGS (reslice_isshiki.py). GROUND = Light auto-combo rekka (attacks_base 3/2/5);
    // AIR = airborne Light auto-combo rekka (air_attacks 3/3/2, detached-FX cell excluded). abilities.js
    // updateIsshikiCommandCombat drives the cancel-on-hit continue; sprite.js identity-maps these keys. ──
    isshikiGround1: { frames: 3, width: 66, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground1_uniform.png" },   // 3-punch opener
    isshikiGround2: { frames: 2, width: 78, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground2_uniform.png" },   // kick (mid)
    isshikiGround3: { frames: 5, width: 74, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground3_uniform.png" },   // low-string + slash-arc finisher (launcher)
    isshikiAir1:    { frames: 3, width: 65, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_air1_uniform.png" },       // air opener
    isshikiAir2:    { frames: 3, width: 82, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_air2_uniform.png" },       // air mid
    isshikiAir3:    { frames: 2, width: 159, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_air3_uniform.png" },      // dive-slash finisher (downward spike)
    // ── Neutral normal slots (the LIGHT/air-Light buttons are intercepted into the combo strings above; these
    // give the OTHER buttons real poses reused from the combo frames + a safety fallback for light/air). ──
    light:    { frames: 3, width: 66, height: 76,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground1_uniform.png" },   // fallback (driver normally intercepts → ground string)
    heavy:    { frames: 2, width: 78, height: 72,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground2_uniform.png" },   // standalone kick
    up:       { frames: 5, width: 74, height: 77,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ground3_uniform.png" },   // rising slash launcher
    air:      { frames: 3, width: 65, height: 77,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_air1_uniform.png" },       // fallback (driver normally intercepts → air string)
    down_air: { frames: 2, width: 159, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_air3_uniform.png" },       // dive-slash spike
    // ── STAGE 3 SPECIAL CAST POSES (char-layer only; FX/projectiles spawn separately in abilities.js). ──
    // _spriteCastMove maps these keys via sprite.js MOVE_TO_ACTION. Cube special reuses the generic suku cast.
    isshikiSukuCast: { frames: 2, width: 50, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_suku_cast_uniform.png" },   // Sukunahikona / Daikokuten-cubes cast
    isshikiRodCast:  { frames: 3, width: 82, height: 72, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_rod_cast_uniform.png" },     // Daikokuten rods cast (strike poses)
    isshikiFireCast: { frames: 2, width: 74, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_fire_cast_uniform.png" },    // Gokashin Ensen fire cast
    // ── STAGE 4 — 2 bonus finishers (specail_attacks rows 1-2) + Ultimate windup (row 3). ──
    isshikiFin1Cast: { frames: 2, width: 74, height: 75, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_fin1_cast_uniform.png" },     // Finisher 1 (Back+Special) — rod-barrage cast
    isshikiFin2:     { frames: 2, width: 159, height: 67, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_fin2_uniform.png" },          // Finisher 2 (airborne Special) — dash-slash
    isshikiUltCast:  { frames: 2, width: 50, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_ult_cast_uniform.png" }         // Ultimate (Finisher 3) windup cast
  },
  introPool: ["intro"]   // intro grow-in sequence (wired just below)
}
// STAGE 1 intro grow-sequence (5→11→21→42, final frame == idle) — the intro-to-idle handoff. Added as its
// own action so introPool can play it; final frame hands off cleanly to the 1-frame idle.
isshiki.animationData.intro = { frames: 4, width: 44, height: 89, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./isshiki_intro_uniform.png" }

// ─────────────────────────────────────────────────────────────────
// DEMON SLAYER
// ─────────────────────────────────────────────────────────────────
const zenitsu = {
  rosterKey: "zenitsu", name: "Zenitsu Agatsuma", universe: "demon_slayer",
  portrait: "./zenitsu_portrait.png",   // bust cropped from idle frame 0 (no dedicated mugshot in the batch)
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1000, maxEnergy: 0, attack: 88, defense: 74, speed: 96, maxJumps: 2, jumpPower: 30, dashSpeed: 20, dashDuration: 8, dashCooldownMax: 35 },
  basic_attacks: {
    light:     { damage: 50, startup: 3, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 7, active: 3, recovery: 16, hitstun: 19, knockbackX: 6, knockbackY: 1, rangeX: 78, rangeY: 50 },
    upAttack:  { type: "launcher", damage: 70, startup: 4, active: 3, recovery: 6, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); Thunderclap speedster
    airAttack: { damage: 60, startup: 4, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 7, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    thunderClapStrike: { cost: 0, damage: 150, startup: 8, active: 4, recovery: 18, hitstun: 25, knockbackX: 10, knockbackY: -2, effect: "instant high-speed lightning attack" },
    sixfold:           { cost: 0, damage: 95,  startup: 6, active: 6, recovery: 16, hitstun: 16, knockbackX: 5,  knockbackY: -1, effect: "stationary multi-strike thunderclap volley" },
    godspeed:          { cost: 0, damage: 80,  startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 5,  knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "flash-step that crosses the screen" }
  },
  // Ultimate = Thunderclap dash-through slice (Stage 5). COOLDOWN-gated, NOT energy-gated
  // (Zenitsu has maxEnergy 0). HUD-only placeholder until the Stage 5 wiring lands in abilities.js.
  ultimate: { name: "Thunder Breathing: Godspeed", cost: 0, description: "Unblockable flash-step dash that passes through the opponent when both are at the same level. Cooldown-gated." },
  hasSprites: true,
  // FIRST Demon Slayer sprite character. Canon height ~164.5cm → target ~102px (0.623×164.5).
  // idle content 45px at scale 1.0 → spriteScale 2.25 → ~101px on-screen (roster band). See
  // HEIGHT_REFERENCE.md. Resliced cells are bottom-aligned (feet at cell bottom, 1px pad) so a
  // single anchorY: 0 plants feet across every standing action. REQUIRES the skins.js `zenitsu`
  // default skin + the spritesheets.js SPRITE_MANIFEST idle gate.
  spriteScale: 2.25,
  animationData: {
    // idle strip = 7 cells; cells 5-6 are a sword-raise flourish that would pop in a loop, so the
    // breathing idle loops just the first 5 (the entrance sword-draw lives in the intro strip).
    idle: { frames: 5, width: 38, height: 60, speed: 7, anchorY: 0, sheet: "./zenitsu_idle_uniform.png" },
    // Only one locomotion strip was uploaded (a 4-frame run cycle) — walk plays it slower.
    walk: { frames: 4, width: 47, height: 51, speed: 6, anchorY: 0, sheet: "./zenitsu_run_uniform.png" },
    run:  { frames: 4, width: 47, height: 51, speed: 4, anchorY: 0, sheet: "./zenitsu_run_uniform.png" },
    dash: { frames: 3, width: 51, height: 48, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_dash_uniform.png" },   // ground dash blur (speed lines)
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell).
    jump: { frames: 6, width: 39, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_jump_uniform.png" },
    fall: { frames: 1, width: 39, height: 58, speed: 6, anchorY: 0, sourceX: 195, loop: false, lockLastFrame: true, sheet: "./zenitsu_jump_uniform.png" },
    // Guard — no dedicated block art; the charge/braced low stance (unused: maxEnergy 0) doubles as
    // the block pose. Single braced frame, held while blocking.
    guard: { frames: 1, width: 41, height: 47, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_guard_uniform.png" },
    // HURT — frame 0 of the 8-cell hit strip (the backward recoil) as a single-frame flinch;
    // combat.js colorFlash tints on top. Every plain hitstun/stun routes here.
    hurt: { frames: 1, width: 57, height: 52, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_hit_uniform.png" },
    // KNOCKDOWN — the full recoil→sprawl→lie sequence (cells 0-7). lockLastFrame holds the downed pose.
    knockdown: { frames: 8, width: 57, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_hit_uniform.png" },
    // Pre-match INTRO — DEDICATED entrance strip (12 cells: sword-draw → ready stance). Unlike
    // Gon/Minato (idle-hold stopgaps), Zenitsu shipped a real intro animation.
    intro: { frames: 12, width: 44, height: 61, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_intro_uniform.png" },
    // ── STAGE 2 NORMALS ── resliced feet-aligned (*_uniform.png); anchorY 0 plants feet.
    // loop:false + lockLastFrame holds the strike pose through recovery. basic_attacks above carries
    // the hit/frame DATA these render over. Keys are light/heavy/up/air/down_air (SPRITE keys).
    light:    { frames: 3, width: 56, height: 48, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_foward_slash_uniform.png" },   // quick forward katana slash
    heavy:    { frames: 3, width: 71, height: 53, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_foward_hit_uniform.png" },      // committed forward two-slash
    up:       { frames: 3, width: 61, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_up_attack_uniform.png" },        // rising upward slash (launcher)
    air:      { frames: 2, width: 67, height: 59, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_down_air_2_uniform.png" },       // neutral aerial horizontal thrust
    down_air: { frames: 5, width: 56, height: 58, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_down_air_1_uniform.png" },       // descending diagonal slash
    // ── STAGE 2 COMMAND CHAIN ── Down+Heavy → zenCombo1→2→3 (cancel-on-hit; whiff/block ends it).
    // currentMove-keyed poses (sprite.js identity map). Overflow melee: low sweep → dash lunge →
    // rising super-slash launcher finisher. (super_up_attack = the S2 launcher, NOT a S3 special.)
    zenCombo1: { frames: 4, width: 71, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_down_attack_uniform.png" },     // opener — low sweeping slash
    zenCombo2: { frames: 5, width: 53, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_dash_attack_uniform.png" },      // mid — dashing lunge
    zenCombo3: { frames: 6, width: 42, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_super_up_uniform.png" },         // finisher — rising super vertical slash (launches)
    // ── STAGE 3 SPECIAL ── Thunder Breathing First Form: Thunderclap and Flash (dash-strike).
    // currentMove identity pose (charge stance → lightning-trail dash → strike). Cooldown-gated.
    zenThunderclap: { frames: 8, width: 56, height: 48, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_thunderclap_uniform.png" },
    // ── STAGE 5 ULTIMATE ── Thunderclap & Flash: Godspeed — the dash-through slice (crouch-charge →
    // flash-dash across → recover). currentMove identity pose. Unblockable, same-level, cooldown-gated.
    zenUltimate: { frames: 6, width: 51, height: 48, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zenitsu_ultimate_uniform.png" }
  },
  // Single-entry pre-match intro pool (game.pickIntroVariant picks from here; one entry = always plays).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// DEMON SLAYER — Kyojuro Rengoku (SECOND Demon Slayer sprite char, after Zenitsu).
// Flame Hashira: a powerful, aggressive fire-swordsman rushdown. Same universe pattern as
// Zenitsu — COOLDOWN-gated (Demon Slayer has no chakra/ki meter → maxEnergy 0). Where Zenitsu
// is a fragile speed-burst assassin (def 74), Rengoku is the durable Hashira bruiser: harder
// hits + more HP/defense, slightly less top speed. Staged build; see RENGOKU_ASSET_MAP.md.
// REQUIRES the skins.js `rengoku` default skin + the spritesheets.js SPRITE_MANIFEST idle gate.
// ─────────────────────────────────────────────────────────────────
const rengoku = {
  rosterKey: "rengoku", name: "Kyojuro Rengoku", universe: "demon_slayer",
  portrait: "./rengoku_portrait.png",   // Stage 6 — cropped from an intro/idle frame (no dedicated mugshot in the batch)
  archetypes: ["melee", "power"],
  primary: "melee", secondary: ["power"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "burst", animeMovement: true },
  // Tier: aggressive fire Hashira. HP 1140 (durable — well above Zenitsu 1000, near Tobirama 1120);
  // attack 92 ties the roster top (Minato) by design ("powerful"); def 80 solid; speed 92 aggressive
  // but below the fastest (Zenitsu 96 / Minato 98). Cooldown-gated like every Demon Slayer char.
  stats: { maxHealth: 1140, maxEnergy: 0, attack: 92, defense: 80, speed: 92, maxJumps: 2, jumpPower: 31, dashSpeed: 19, dashDuration: 9, dashCooldownMax: 36 },
  basic_attacks: {
    // Stage 2 wires the sprites over this data. Rengoku hits harder than Zenitsu across the board.
    light:     { damage: 52, startup: 3, active: 2, recovery: 8,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 8, active: 3, recovery: 17, hitstun: 20, knockbackX: 6, knockbackY: 1, rangeX: 80, rangeY: 52 },
    upAttack:  { type: "launcher", damage: 74, startup: 6, active: 4, recovery: 8, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 12, launchVy: -32, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 62, startup: 4, active: 2, recovery: 8,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 84, startup: 7, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    // HUD-reference placeholders; behaviour lands in abilities.js at Stages 4-5. Cooldown-gated (cost 0).
    chargedFlameStrike: { cost: 0, damage: 120, startup: 8, active: 4, recovery: 18, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "chargeable flame lunge (tap/hold power tiers)" },
    flameCounter:       { cost: 0, damage: 130, startup: 2, active: 10, recovery: 20, hitstun: 26, knockbackX: 9, knockbackY: -3, effect: "reactive parry → flaming riposte" }
  },
  ultimate: { name: "Flame Breathing: Rengoku (Flame Explosion)", cost: 0, description: "Freeze-cinematic flame eruption. Cooldown-gated." },
  hasSprites: true,
  // Canon height 177cm → target 110px (0.623×177, HEIGHT_REFERENCE.md). 2026-08-01 height re-audit:
  // 2.25 was inherited from Zenitsu but rendered 128px (idle content is ~57px, not the ~48px the original
  // note assumed) = +16% too tall for canon → corrected to 1.94 (128 × 110/128). Resliced cells are
  // bottom-aligned (feet at cell bottom, 1px pad) so a single anchorY: 0 plants feet across every action.
  spriteScale: 1.94,
  animationData: {
    // ── STAGE 1 MOVEMENT/STATE ── resliced feet-aligned (*_uniform.png); anchorY 0 plants feet.
    idle: { frames: 4, width: 69, height: 59, speed: 7, anchorY: 0, sheet: "./rengoku_idle_uniform.png" },   // 4-frame breathing loop
    // Only one locomotion strip uploaded (8-frame run) — walk plays it slower.
    walk: { frames: 8, width: 55, height: 52, speed: 6, anchorY: 0, sheet: "./rengoku_run_uniform.png" },
    run:  { frames: 8, width: 55, height: 52, speed: 4, anchorY: 0, sheet: "./rengoku_run_uniform.png" },
    dash: { frames: 2, width: 49, height: 38, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_dash_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell, index 5 → sourceX 240).
    jump: { frames: 6, width: 48, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_jump_uniform.png" },
    fall: { frames: 1, width: 48, height: 62, speed: 6, anchorY: 0, sourceX: 240, loop: false, lockLastFrame: true, sheet: "./rengoku_jump_uniform.png" },
    // GUARD — block.png cell 0 (the clean braced guard stance); later cells are a spin flourish that
    // would pop in a hold, so guard holds just the first braced frame.
    guard: { frames: 1, width: 59, height: 61, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_block_uniform.png" },
    // HURT — cell 0 of the RE-SPLIT 4-cell hit strip (the upright stagger) as a single-frame flinch;
    // combat.js colorFlash tints on top. Every plain hitstun/stun routes here. (The strip's source art
    // baked TWO figures into the original first island — a stagger + a knockback bridged by the blade —
    // which the alpha-gutter reslice merged into ONE cell, so `hurt` rendered BOTH figures at once. Fixed
    // by re-cropping the two figures into separate cells: cell 0 = single clean stagger.)
    hurt: { frames: 1, width: 55, height: 56, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_hit_uniform.png" },
    // KNOCKDOWN — the 4 re-split cells (stagger→knockback→fall→grounded); lockLastFrame holds the downed
    // pose. KNOWN GAP: the master sheet's full get-hit run has more frames + a dust-FX frame that were
    // never individually cropped — this degrades to the last-frame grounded hold, not invented art.
    knockdown: { frames: 4, width: 55, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_hit_uniform.png" },
    // ── STAGE 1 INTRO ── TWO independent STATIONARY intros, random-cycled per match (introPool). He does
    // NOT travel across the arena (redesign: the earlier tracked dash-in was removed). intro2 = sword-draw
    // flourish (primary). introRunIn = the run-cycle art played IN PLACE as a psyched-up ready flourish
    // (art normalized to face-right so the engine's facing-flip renders it correctly for P1/P2).
    introRunIn: { frames: 5, width: 46, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_intro_run_in_reverse_right_to_left_uniform.png" },
    intro2:     { frames: 4, width: 65, height: 66, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_intro_2_uniform.png" },
    // ── STAGE 2 NORMALS ── resliced feet-aligned (*_uniform.png); anchorY 0 plants feet.
    // loop:false + lockLastFrame holds the strike pose through recovery. basic_attacks (above) carries
    // the hit/frame DATA these render over. Keys are light/heavy/up/air/down_air (sprite.js identity map).
    light:    { frames: 2, width: 82, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_foward_slash_uniform.png" },      // quick forward katana slash
    // HEAVY = down_attack.png (a real, coherent downward flame-chop). BEST-JUDGMENT content: unlike
    // light/up/air/down_air this file is NOT cleanly matched to the master sheet, but it is genuine
    // character art and the best real content for the heavy slot. Flagged, not invented. See RENGOKU_ASSET_MAP.md.
    heavy:    { frames: 4, width: 82, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_down_attack_uniform.png" },
    up:       { frames: 6, width: 50, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_up_attack_uniform.png" },           // rising upward slash (launcher)
    // AIR = the OPENING segment (Air hit 1, cells 0-2) of the 13-cell combo_air_1 strip, used standalone.
    // The remainder (cells 3+) feeds the Stage 3 air combo chain. sourceX 0 + frames 3 → cells 0-2.
    air:      { frames: 3, width: 101, height: 56, speed: 4, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_combo_air_1_uniform.png" },
    down_air: { frames: 7, width: 73, height: 85, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_down_air_attack_uniform.png" },       // descending flame spike
    // ── STAGE 3 COMMAND CHAIN ── Fwd+Heavy opens the chain; re-tap Heavy on a clean hit to continue,
    // or press Special on a clean hit to branch into the escalated super finisher. currentMove-keyed
    // poses (sprite.js identity map). "base hit" segments carved from the JUS combo strips via
    // sourceX (= cellWidth × startCell) + frames; sprite.js sx = sourceX + frameIndex×width.
    // GROUND chain: combo_1 → combo_2 → combo_3, with super_foward / super_down as finisher branches.
    rengokuG1:        { frames: 5, width: 82, height: 64, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./rengoku_combo_1_uniform.png" },        // Hit1 opener (cells 0-4)
    rengokuG2:        { frames: 5, width: 97, height: 61, speed: 3, anchorY: 0, sourceX: 97,  loop: false, lockLastFrame: true, sheet: "./rengoku_combo_2_uniform.png" },        // Hit4 base — wide flame arc (cells 1-5)
    rengokuG3:        { frames: 5, width: 85, height: 60, speed: 3, anchorY: 0, sourceX: 170, loop: false, lockLastFrame: true, sheet: "./rengoku_combo_3_uniform.png" },        // Hit5 base (cells 2-6)
    rengokuSuperFwd:  { frames: 6, width: 86, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_super_foward_attack_uniform.png" },          // Hit6 — forward flame-lunge finisher (off G2)
    rengokuSuperDown: { frames: 6, width: 85, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_super_down_attack_uniform.png" },            // Hit7 — downward flame-wave slam finisher (off G3, launches)
    // AIR chain: combo_air_1 remainder → combo_into_air bridge → combo_air_2, with super_down_air finisher.
    rengokuA1:        { frames: 6, width: 101, height: 56, speed: 3, anchorY: 0, sourceX: 303, loop: false, lockLastFrame: true, sheet: "./rengoku_combo_air_1_uniform.png" },     // Air hit2 — remainder of the air-normal strip (cells 3-8)
    rengokuABridge:   { frames: 8, width: 56,  height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_combo_into_air_uniform.png" },               // ground→air launcher bridge
    rengokuA2:        { frames: 6, width: 83,  height: 66, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./rengoku_combo_air_2_uniform.png" },     // Air hit3 base (cells 0-5)
    rengokuSuperAir:  { frames: 4, width: 83,  height: 66, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_super_down_air_attack_uniform.png" },        // Air hit4 — downward flame-spike finisher (off A2, spikes)
    // ── STAGE 4 SPECIALS ── currentMove / _spriteCastMove identity keys (sprite.js fallback).
    // CHARGED FLAME STRIKE: hold P → charge windup (sprite.js isCharging → "charge") → release: tap tier
    // = rengokuCharge1 (charge_hit_1), hold tier = rengokuCharge2 (charge_hit_2, wide flame arc) →
    // rengokuFlameTail (puches dash-recovery) plays over the recovery via _spriteCastMove.
    charge:           { frames: 4, width: 49,  height: 54, speed: 6, anchorY: 0, loop: true,  sheet: "./rengoku_charge_uniform.png" },                        // hold-to-charge windup (no hitbox)
    rengokuCharge1:   { frames: 7, width: 66,  height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_charge_hit_1_uniform.png" },   // TAP tier — forward flame slash
    rengokuCharge2:   { frames: 6, width: 117, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_charge_hit_2_uniform.png" },   // HOLD tier — wide flame-trail release
    rengokuFlameTail: { frames: 2, width: 58,  height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_puches_uniform.png" },         // dash-recovery tail
    // COUNTER: a reactive parry stance (foward_attack_charge pose). Sets _parryInputBuffer → checkParry
    // stuns an incoming startup attack; a rengoku riposte adds flaming damage (combat.checkParry hook).
    rengokuCounter:   { frames: 4, width: 65,  height: 66, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_foward_attack_charge_uniform.png" },
    // ── STAGE 5 ULTIMATE ── Flame Explosion. Plays through the freeze cinematic via _spriteCastMove:"ultimate"
    // (rengokuFlameExplosionCinematic.js): blade-raise (cells 0-4) → flame eruption engulfs him (cells 5-7).
    ultimate: { frames: 8, width: 55, height: 67, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./rengoku_ultimate_explosion_uniform.png" }
  },
  // Random-cycle intro pool: each match start picks ONE at random (game.pickIntroVariant). Both play
  // STATIONARY at his normal starting position — no camera tracking, no positional movement.
  introPool: ["introRunIn", "intro2"]
}

// Shinobu Kocho (universe: demon_slayer) — THIRD Demon Slayer sprite char (after Zenitsu, Rengoku).
// The Insect Hashira: fast, precise, LOW raw power (canonically the physically weakest Hashira), offset
// by speed + wisteria POISON (Stage 3, via the generic `dot` subsystem). Thin thrust/piercing blade —
// every melee is a narrow-reach thrust/lunge, NOT a broad slash. Zero-energy, COOLDOWN-gated like
// Zenitsu/Rengoku → HUD flavor "TOTAL CONCENTRATION" (Insect Breathing is a Total-Concentration style).
// Intro = camera-tracked GLIDE-IN from off-screen (updateShinobuIntro, Superman-path). See SHINOBU_ASSET_MAP.md.
const shinobu = {
  rosterKey: "shinobu", name: "Shinobu Kocho", universe: "demon_slayer",
  portrait: "./shinobu_portrait.png",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "technical", animeMovement: true },
  stats: { maxHealth: 960, maxEnergy: 0, attack: 82, defense: 76, speed: 97, maxJumps: 2, jumpPower: 31, dashSpeed: 21, dashDuration: 8, dashCooldownMax: 34 },
  basic_attacks: {
    light:     { damage: 44, startup: 3, active: 2, recovery: 7,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 78, startup: 6, active: 3, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: 1, rangeX: 86, rangeY: 44 },
    upAttack:  { type: "launcher", damage: 62, startup: 4, active: 3, recovery: 6, hitstun: 19, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); lowest HP, fragile speedster
    airAttack: { damage: 52, startup: 4, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 70, startup: 6, active: 3, recovery: 12, hitstun: 17, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    poisonThrust:  { cost: 0, damage: 40, startup: 6, active: 3, recovery: 16, hitstun: 16, knockbackX: 4, knockbackY: -1, effect: "Insect Breathing lunging stinger — low direct dmg + wisteria POISON DoT (49 over ~2.3s)" },
    butterflyFlit: { cost: 0, damage: 0,  startup: 2, active: 0, recovery: 20, effect: "acrobatic backflip evade (brief i-frames + backward reposition)" }
  },
  ultimate: { name: "Insect Breathing: Butterfly Dance", cost: 0, description: "Freeze-cinematic spinning-dash finisher — dashes in, thrust-lunge → spinning slash. Guaranteed direct hit + a lethal wisteria POISON finisher on clean connect. Cooldown-gated (no energy)." },
  hasSprites: true,
  // Canon height 151cm (Shinobu is the shortest Hashira) → target 94px (0.623×151, HEIGHT_REFERENCE.md).
  // 2026-08-01 height re-audit: 2.25 was inherited from Zenitsu but rendered 122px = +30% too tall for her
  // petite canon → corrected to 1.73 (122 × 94/122). All anchorY: 0 (feet at cell bottom) → no anchor rescale.
  spriteScale: 1.73,
  animationData: {
    idle: { frames: 4, width: 38, height: 57, speed: 7, anchorY: 0, sheet: "./shinobu_idle_uniform.png" },
    walk: { frames: 6, width: 45, height: 53, speed: 6, anchorY: 0, sheet: "./shinobu_walk_uniform.png" },
    run:  { frames: 6, width: 45, height: 53, speed: 4, anchorY: 0, sheet: "./shinobu_walk_uniform.png" },
    dash: { frames: 2, width: 48, height: 38, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_dash_uniform.png" },
    jump: { frames: 5, width: 48, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_jump_uniform.png" },
    fall: { frames: 1, width: 48, height: 58, speed: 6, anchorY: 0, sourceX: 192, loop: false, lockLastFrame: true, sheet: "./shinobu_jump_uniform.png" },
    guard: { frames: 1, width: 54, height: 61, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_guard_uniform.png" },
    hurt: { frames: 1, width: 46, height: 57, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_hit_uniform.png" },
    knockdown: { frames: 3, width: 46, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_hit_uniform.png" },
    introGlide: { frames: 4, width: 67, height: 54, speed: 6, anchorY: 0, loop: true, sheet: "./shinobu_intro_glide_uniform.png" },
    // ── STAGE 2 normals (thrust/piercing — fast narrow-reach strikes, NOT broad slashes) ──
    light:    { frames: 5, width: 80, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_light_uniform.png" },     // quick low forward thrust/lunge
    heavy:    { frames: 5, width: 87, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_heavy_uniform.png" },     // deep committed lunging thrust (signature pierce)
    up:       { frames: 5, width: 55, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_up_uniform.png" },        // crouch → rising spin launcher
    air:      { frames: 3, width: 45, height: 66, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_air_uniform.png" },        // aerial blade thrust
    down_air: { frames: 5, width: 63, height: 63, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_down_air_uniform.png" },   // spinning descending dive-spike
    // ── STAGE 3: "Insect Breathing" command chain (Fwd+Heavy → re-tap Heavy) + specials ──
    shinobuG1:    { frames: 4, width: 59, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_g1_uniform.png" },      // horizontal slash opener
    shinobuG2:    { frames: 4, width: 80, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_g2_uniform.png" },      // overhead cut mid
    shinobuG3:    { frames: 4, width: 57, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_g3_uniform.png" },      // lunging body-check finisher
    shinobuPoison:{ frames: 5, width: 75, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_poison_uniform.png" },  // Poison Thrust — stinger dive
    shinobuFlit:  { frames: 8, width: 53, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_flit_uniform.png" },    // Butterfly Flit — backflip evade
    // ── STAGE 4: Ultimate — "Butterfly Dance" spinning-dash finisher (thrust-lunge → spinning slash) ──
    shinobuUltimate: { frames: 9, width: 87, height: 59, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./shinobu_ultimate_uniform.png" }
  },
  introPool: ["introGlide"]
}

// ─────────────────────────────────────────────────────────────────
// INOSUKE HASHIBIRA (universe: demon_slayer) — FOURTH Demon Slayer sprite char.
// Dual-nichirin "Beast Breathing" rushdown. No energy meter (Total Concentration,
// cooldown-gated) like Shinobu. Signature: Beast Breathing Assist (Stage 4) — a
// mid-combo partner call that links another Demon Slayer's real move then RESUMES
// Inosuke's own combo. See INOSUKE_ASSET_MAP.md.
// Raw uploads were variable-width strips → resliced to uniform equal-cell sheets
// via tools/reslice_inosuke.py (all anchorY: 0, feet at cell bottom).
// Canon height 164cm → 0.623×164 ≈ 102px target (HEIGHT_REFERENCE.md); idle
// content ~50px → spriteScale 2.0 (trial; Stage-6 audit confirms).
// ─────────────────────────────────────────────────────────────────
const inosuke = {
  rosterKey: "inosuke", name: "Inosuke Hashibira", universe: "demon_slayer",
  // Stage 21 unlock: a characters.js `unlockedBy` OVERRIDES unlocks.js's UNLOCK_CONDITIONS map
  // (this one matches it — level 3 — and demonstrates the override path). null here = start unlocked.
  unlockedBy: { type: "level", value: 3 },
  portrait: "./inosuke_portrait.png",
  archetypes: ["melee", "rushdown"],
  primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "aggressive", animeMovement: true },
  stats: { maxHealth: 1040, maxEnergy: 0, attack: 88, defense: 74, speed: 93, maxJumps: 2, jumpPower: 31, dashSpeed: 21, dashDuration: 8, dashCooldownMax: 32 },
  basic_attacks: {
    light:     { damage: 42, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 6, active: 3, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: 1, rangeX: 88, rangeY: 46 },
    upAttack:  { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 7, hitstun: 18, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -30, selfVy: -6, airOK: false },
    airAttack: { damage: 50, startup: 4, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 72, startup: 6, active: 3, recovery: 12, hitstun: 17, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    // Stage 5 — three "Beast Breathing" CINEMATIC specials (camera push-in → strike → pull-back). COOLDOWN-
    // gated (maxEnergy 0). Damage is RANGE-GATED at the strike beat (whiffable), not a guaranteed nuke.
    beastSpin:  { cost: 0, damage: 108, effect: "Neutral — in-place spinning dual-blade slash (cinematic)" },
    beastDash:  { cost: 0, damage: 100, effect: "Forward — dashing thrust that closes the gap (cinematic)" },
    beastLunge: { cost: 0, damage: 122, effect: "Down — slashing lunge fan (cinematic)" },
  },
  ultimate: { name: "Beast Breathing: Assist", cost: 0, description: "Signature is the mid-combo Beast Breathing Assist (Stage 4). No separate ultimate." },
  hasSprites: true,
  spriteScale: 2.0,
  animationData: {
    // ── STAGE 1: movement + state (resliced uniform sheets) ──
    idle:  { frames: 5, width: 36, height: 52, speed: 7, anchorY: 0, sheet: "./inosuke_idle_uniform.png" },
    // No dedicated walk/run art → reuse idle (bob) for walk, dash strip for run (beast lope).
    walk:  { frames: 5, width: 36, height: 52, speed: 6, anchorY: 0, sheet: "./inosuke_idle_uniform.png" },
    run:   { frames: 5, width: 73, height: 54, speed: 4, anchorY: 0, sheet: "./inosuke_dash_uniform.png" },
    dash:  { frames: 5, width: 73, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_dash_uniform.png" },
    jump:  { frames: 4, width: 86, height: 79, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_jump_uniform.png" },
    fall:  { frames: 1, width: 86, height: 79, speed: 6, anchorY: 0, sourceX: 172, loop: false, lockLastFrame: true, sheet: "./inosuke_jump_uniform.png" },
    // No guard art → reuse idle frame 0 (holds ground; block FX drawn by engine).
    guard: { frames: 1, width: 36, height: 52, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_idle_uniform.png" },
    hurt:  { frames: 1, width: 62, height: 54, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_hit_uniform.png" },
    knockdown: { frames: 3, width: 62, height: 54, speed: 6, anchorY: 0, sourceX: 186, loop: false, lockLastFrame: true, sheet: "./inosuke_hit_uniform.png" },   // frames 3-5 = airborne→downed
    dodge: { frames: 3, width: 57, height: 50, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_dodge_uniform.png" },
    taunt: { frames: 3, width: 75, height: 60, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_taunt_uniform.png" },
    // ── STAGE 2 normals (dual-nichirin Beast Breathing) ──
    light:    { frames: 3, width: 67, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_light_uniform.png" },        // fast standing double-slash jab
    heavy:    { frames: 4, width: 85, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_heavy_uniform.png" },        // wide committed forward slash
    up:       { frames: 3, width: 71, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_up_uniform.png" },           // rising diagonal launcher
    air:      { frames: 3, width: 69, height: 86, speed: 4, anchorY: 0, sourceX: 69, loop: false, lockLastFrame: true, sheet: "./inosuke_airdown_uniform.png" },  // neutral aerial arc (subset of airdown, frames 1-3)
    down_air: { frames: 5, width: 69, height: 86, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_airdown_uniform.png" },      // spinning descending dive-slash
    // ── STAGE 2 command normal: Down+Heavy "Beast Fang" (low crashing pommel strike) ──
    inosukeDownHeavy: { frames: 4, width: 64, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_downheavy_uniform.png" },
    // ── STAGE 2 "Beast Breathing" flurry chain (Fwd+Heavy → re-tap Heavy, cancel-on-hit) ──
    inosukeB1: { frames: 4, width: 69, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_b1_uniform.png" },          // lunging entry
    inosukeB2: { frames: 3, width: 77, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_b2_uniform.png" },          // piercing thrust
    inosukeB3: { frames: 3, width: 75, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_b3_uniform.png" },          // close flurry
    inosukeB4: { frames: 4, width: 53, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_b4_uniform.png" },          // dashing double cut
    inosukeB5: { frames: 4, width: 101, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_b5_uniform.png" },         // running-slash finisher (knockback)
    // ── STAGE 5 cinematic specials (played through the freeze via _spriteCastMove) ──
    inosukeCine1: { frames: 6, width: 94,  height: 76,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_cine1_uniform.png" },   // spinning dual-blade slash (neutral)
    inosukeCine2: { frames: 5, width: 112, height: 57,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_cine2_uniform.png" },   // dashing thrust (forward)
    inosukeCine4: { frames: 4, width: 72,  height: 107, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./inosuke_cine4_uniform.png" }    // slashing lunge fan (down)
  },
  introPool: ["taunt"]   // Stage 6 may extract a dedicated intro; taunt is a fitting boar-roar for now
}

// ─────────────────────────────────────────────────────────────────
// NEZUKO KAMADO (universe: demon_slayer) — FIFTH Demon Slayer sprite char.
// Petite agile demon rushdown. No energy meter (cooldown-gated) like her Demon Slayer
// siblings. Signature (later stages): distinct dash burst (nezuko_run_tiny — hunched
// scramble, visually separate from the upright run), Blood Demon Slumber heal, Demon
// Transformation mode-change ult, Tanjiro/Zenitsu Ally Call. See NEZUKO_ASSET_MAP.md.
// STAGE 1 SCOPE: movement + states only (idle/walk/run/dash/jump/fall/guard/hurt/knockdown
// + dormant crouch). Normals(S2)/Y-family(S3)/specials(S4-6)/ults(S7)/intro-win-lose(S8)
// are NOT wired yet — stat blocks below are placeholders (BALANCE pass deferred per spec).
// ─────────────────────────────────────────────────────────────────
const nezuko = {
  rosterKey: "nezuko", name: "Nezuko Kamado", universe: "demon_slayer",
  portrait: "./nezuko_portrait.png",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "technical", animeMovement: true },
  // STAGE 1 PLACEHOLDER stats (balance pass deferred — see spec BALANCE NOTE). Fast agile
  // rushdown with a touch more durability than Shinobu (demon resilience) but lower speed.
  stats: { maxHealth: 1020, maxEnergy: 0, attack: 84, defense: 80, speed: 95, maxJumps: 2, jumpPower: 30, dashSpeed: 21, dashDuration: 8, dashCooldownMax: 34 },
  // PLACEHOLDER combat numbers so the engine has valid data; sprites for these wire in later stages.
  basic_attacks: {
    light:     { damage: 42, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 74, startup: 6, active: 3, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: 1, rangeX: 84, rangeY: 44 },
    upAttack:  { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 6, hitstun: 19, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },
    airAttack: { damage: 50, startup: 4, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 68, startup: 6, active: 3, recovery: 12, hitstun: 17, knockbackX: 1, knockbackY: 10 },
    airHeavy:  { damage: 64, startup: 5, active: 3, recovery: 12, hitstun: 15, knockbackX: 5, knockbackY: -2 }   // Jump+Y aerial spin kick (air_heavy slot)
  },
  specials: {},   // wired in Stages 4-6
  ultimate: { name: "Kekijutsu Baketsu", cost: 0, description: "STAGE 7 placeholder — two-phase punch barrage finisher." },
  hasSprites: true,
  // Canon height 153cm (petite) → target ≈95px (0.623×153, HEIGHT_REFERENCE.md). Idle content
  // native height ≈47px → trial scale ≈2.0. VERIFY + calibrate against measureSprite in Stage-1
  // confirmation before locking.
  spriteScale: 2.0,
  animationData: {
    // ── STAGE 1: movement + states (uniform grids derived from alpha-gutter analysis) ──
    idle:      { frames: 3, width: 44, height: 53, speed: 8, anchorY: 0, sourceX: 0, sheet: "./nezuko_idle.png" },   // REPACKED strip (132x53, poses re-centered) — fixes the idle horizontal-wobble (source poses were spaced ~55px vs the 44px cell → drift)
    walk:      { frames: 4, width: 50, height: 47, speed: 6, anchorY: 0, sheet: "./nezuko_run_tall.png" },   // upright run cycle (held-forward)
    run:       { frames: 4, width: 50, height: 47, speed: 4, anchorY: 0, sheet: "./nezuko_run_tall.png" },   // same sheet, faster playback
    dash:      { frames: 4, width: 50, height: 51, speed: 4, anchorY: 0, sourceX: 9, loop: false, lockLastFrame: true, sheet: "./nezuko_run_tiny.png" },   // hunched scramble burst — DISTINCT from run
    jump:      { frames: 1, width: 49, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_jump.png" },
    fall:      { frames: 1, width: 49, height: 58, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_jump.png" },
    // DORMANT: engine has no crouch-state producer (down-hold = guard). Declared + ready
    // like kasumi/ghostface precedent so the file is wired; will not display until a crouch
    // state is hooked. FLAGGED in Stage-1 report — do not treat as a live state.
    crouch:    { frames: 1, width: 32, height: 46, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_crouch.png" },
    guard:     { frames: 1, width: 47, height: 53, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_block.png" },
    hurt:      { frames: 2, width: 56, height: 68, speed: 5, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_hit.png" },       // flinch recoil (front of sheet; tumble/getup poses belong to knockdown → hit_2)
    knockdown: { frames: 5, width: 52, height: 62, speed: 6, anchorY: 0, sourceX: 5, loop: false, lockLastFrame: true, sheet: "./nezuko_hit_2.png" },     // sprawl → downed → rise (played via sprite.js knockdown hook)
    // ── STAGE 2: B-family (Light) normals ──
    // Neutral B / Up+B / Jump+B are the engine's standard light/up/air slots (basic_attacks light/upAttack/
    // airAttack). Forward+B (nezukoBallKick, projectile) and Down+B (nezukoDodge, i-frame evade) are COMMAND
    // normals fired by updateNezukoCommandCombat (abilities.js) — their sprites play via _spriteCastMove.
    light:         { frames: 4, width: 55, height: 60, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_punch.png" },        // B — jab flurry
    up:            { frames: 2, width: 62, height: 74, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_up_attack.png" },      // Up+B — rising kick (launcher)
    air:           { frames: 1, width: 47, height: 56, speed: 4, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_air_attack_1.png" },   // Jump+B — aerial kick
    nezukoBallKick:{ frames: 2, width: 53, height: 62, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_ball_kick.png" },      // Fwd+B — kick that launches a ball projectile
    nezukoDodge:   { frames: 3, width: 52, height: 61, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_dodge.png" },          // Down+B — low i-frame evade (NO strike)
    // ── STAGE 3: Y-family (Heavy) normals ──
    // Neutral Y / Jump+Y / air-down are the engine's standard heavy/air_heavy/down_air slots. Forward+Y
    // (nezukoAngryPunch) and Down+Y (nezukoSideKick) are COMMAND normals fired by updateNezukoCommandCombat
    // (real strikes — currentMove drives the sprite). air-down = down_air (S+J in air), distinct from Jump+Y.
    heavy:           { frames: 3, width: 50, height: 49, speed: 4, anchorY: 0, sourceX: 2, loop: false, lockLastFrame: true, sheet: "./nezuko_foward_punch.png" },   // Y — straight heavy punch
    air_heavy:       { frames: 4, width: 55, height: 66, speed: 4, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_air_attack_2.png" },    // Jump+Y — aerial spin kick
    down_air:        { frames: 3, width: 51, height: 56, speed: 4, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_air_down_attack.png" }, // Jump+Down (S+J) — downward dive
    nezukoAngryPunch:{ frames: 2, width: 51, height: 64, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_angry_punch.png" },     // Fwd+Y — lunging hook
    nezukoSideKick:  { frames: 4, width: 53, height: 59, speed: 3, anchorY: 0, sourceX: 6, loop: false, lockLastFrame: true, sheet: "./nezuko_side_kick.png" },       // Down+Y — spinning side kick
    // ── STAGE 4: Core extended specials (SPECIAL button L, direction/air-gated; Run&Scratch on CHARGE P) ──
    nezukoAirSpecial:{ frames: 5, width: 55, height: 76, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./nezuko_specail_air_to_kick_attack.png" },  // Special in air — diving kick
    nezukoSuperKick: { frames: 3, width: 58, height: 58, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./nezuko_super_kick.png" },                   // Fwd+Special — lunging super kick
    nezukoCombo1:    { frames: 3, width: 56, height: 52, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./nezuko_combo_1.png" },                      // neutral Special — rekka opener (punch flurry, frames 0-2)
    nezukoCombo2:    { frames: 4, width: 55, height: 52, speed: 3, anchorY: 0, sourceX: 168, loop: false, lockLastFrame: true, sheet: "./nezuko_combo_1.png" },                      // rekka finisher (kick spin, frames 3-6) — same sheet, sourceX split
    nezukoRunScratch:{ frames: 8, width: 55, height: 57, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./nezuko_run_and_scratch.png" },            // CHARGE hold-release — run-in claw rush
    // ── STAGE 5: Defensive/utility specials (SPECIAL button, direction-branched) ──
    nezukoBite:    { frames: 4, width: 50, height: 73, speed: 3, anchorY: 0, sourceX: 5, loop: false, lockLastFrame: true, sheet: "./nezuko_bite.png" },          // Back+Special — command grab (bite)
    nezukoCounter: { frames: 2, width: 40, height: 47, speed: 4, anchorY: 0, sourceX: 9, loop: false, lockLastFrame: true, sheet: "./nezuko_counter_attack.png" }, // Down+Special (Block+Special) — counter stance
    nezukoSlumber: { frames: 2, width: 56, height: 76, speed: 8, anchorY: 0, sourceX: 0, loop: true,                     sheet: "./nezuko_health_reset.png" },     // Up+Special — Blood Demon Slumber (heal; loops the sleep pose)
    // ── STAGE 6: Taunt (Ally Call assists render as SUMMONS, not fighter animationData) ──
    nezukoNutKick: { frames: 3, width: 46, height: 69, speed: 4, anchorY: 0, sourceX: 3, loop: false, lockLastFrame: true, sheet: "./nezuko_nut_kick.png" },       // neutral Grab — taunt kick WITH a real active-window hitbox (punishable)
    // ── STAGE 7: Ultimates (Ultimate button — TAP=Kekijutsu Baketsu / HOLD=Demon Transformation) ──
    nezukoUlt1a:       { frames: 6,  width: 54, height: 54, speed: 3, anchorY: 0, sourceX: 3, loop: false, lockLastFrame: true, sheet: "./nezuko_ultimate_punches.png" },   // Ult1 phase 1 — punch barrage
    nezukoUlt1b:       { frames: 2,  width: 52, height: 55, speed: 3, anchorY: 0, sourceX: 3, loop: false, lockLastFrame: true, sheet: "./nezuko_ultimate_up_attack.png" },  // Ult1 phase 2 — rising finisher
    nezukoTransform:   { frames: 10, width: 54, height: 55, speed: 3, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./nezuko_transformation.png" },      // Ult2 transform-in (demon markings)
    nezukoTransformIdle:{ frames: 2, width: 47, height: 75, speed: 8, anchorY: 0, sourceX: 0, loop: true,                      sheet: "./nezuko_transformation_idle.png" },  // Ult2 sustained transformed idle (buffed state)
    // ── STAGE 8: Intro / Win / Lose ──
    // intro (main) = box-emergence; intro2 (alt/short) = rematch/mirror slot. win/lose are SPLIT from the
    // ONE nezuko_intro_3 sheet (3 frames): win = frames 0-1 (alert in box), lose = frame 2 (asleep, Zzz).
    intro:  { frames: 10, width: 56, height: 70, speed: 5, anchorY: 0, sourceX: 0,  loop: false, lockLastFrame: true, sheet: "./nezuko_intro.png" },      // box → emerge
    intro2: { frames: 3,  width: 49, height: 63, speed: 5, anchorY: 0, sourceX: 0,  loop: false, lockLastFrame: true, sheet: "./nezuko_intro_2.png" },    // short/alt intro
    win:    { frames: 2,  width: 56, height: 44, speed: 6, anchorY: 0, sourceX: 10, loop: true,                       sheet: "./nezuko_intro_3.png" },     // WIN clip — frames 0-1 (split)
    lose:   { frames: 1,  width: 56, height: 44, speed: 6, anchorY: 0, sourceX: 122, loop: false, lockLastFrame: true, sheet: "./nezuko_intro_3.png" }     // LOSE clip — frame 2 (split; distinct sourceX)
  },
  introPool: ["intro", "intro2"]   // random-cycle: main box-emergence + short alt
}

// ─────────────────────────────────────────────────────────────────
// RICK & MORTY
// ─────────────────────────────────────────────────────────────────
const rick = {
  rosterKey: "rick", name: "Rick Sanchez", universe: "rick_and_morty",
  portrait: "./rick_pfp.png",   // EXACT on-disk filename (case + extension)
  archetypes: ["ranged", "zoner", "gadgets"],
  primary: "ranged", secondary: ["zoner", "gadgets"],
  traits: { hasEnergy: true, energyType: "bullshit_science", mobility: "medium", scaling: "versatile", animeMovement: false },
  // Player-facing meter label — intentional in-character humor, KEEP AS-IS. Surfaces on
  // the in-match HUD via energyConfig; the character-select kit panel derives its own from
  // energyType above ("bullshit science").
  energyConfig: { label: "Bullshit Science Energy", color: "#8be04e", glowColor: "#c6ff6e", emptyColor: "rgba(255,255,255,0.08)" },
  // MK-feel Stage 3d neutral buff: Rick was the simultaneous roster floor on HP/atk/def/spd/normals/DPE,
  // and 1a scaling knocked his compensating gimmicks (summons/portal/ult) down further — so his under-tuned
  // NEUTRAL is lifted off the floor. speed 80→84 (still below the ~90 mid, keeps the zoner-not-rushdown feel);
  // his weak-backup-melee identity is kept, just no longer rock-bottom (see basic_attacks light/heavy below).
  stats: { maxHealth: 1050, maxEnergy: 160, attack: 82, defense: 78, speed: 84, maxJumps: 2, jumpPower: 28, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  movement: { dashTeleport: true },   // Portal-Behind: double-tap toward opponent (shared teleport system, like Gojo/Sasuke)
  // ZONER identity: keep opponents out with Meeseeks / Rocket / Self-Destruct. Melee (light/heavy)
  // is deliberately BACKUP — lower damage and range than a brawler.
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 62, rangeY: 46 },   // jab — Stage 3d: 34→40 (off the normals floor; still backup melee, EFF 24)
    heavy:     { damage: 72, startup: 9, active: 4, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, rangeX: 74, rangeY: 50 },   // side kick — Stage 3d: 60→72 (off the normals floor; EFF 43, still below brawlers)
    upAttack:  { type: "launcher", damage: 56, startup: 8, active: 4, recovery: 17, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10 },
    airAttack: { damage: 44, startup: 6, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    // downAir: intentionally ABSENT — no art exists (genuinely missing, not substituted). downTilt (poop) DEFERRED. See RICK_ASSET_MAP.md.
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // Actual behaviour lives in executeRickSpecial / executeRickUltimate (abilities.js).
  // This data block is for the kit/HUD panels. Special button: neutral = Meeseeks Box,
  // Up + Special = Rocket. Portal-Behind is on the double-tap movement, not this button.
  specials: {
    meeseeksBox: { cost: 30, subtype: "summon", summonId: "meeseeks", effect: "throws a Meeseeks that rushes the opponent (no cap — multiple can be active at once)" },
    rocket:      { cost: 40, effect: "Up + Special: rockets Rick upward AND damages anyone caught in the launch path" }
  },
  ultimate: { name: "Self-Destruct", cost: 140, description: "Instant proximity AOE blast — only connects if the opponent is close enough. Costs Rick 15% of his max HP to detonate (non-lethal) on top of the near-max meter cost." },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // Rick has NO dedicated intro sprite (never cataloged). Without this, the intro state
  // falls back to the shared "transform" slot — which Rick lacks — and sprite.js draws its
  // 128px NULL/fallback box (the "floating + garbled frames" intro bug). introPool:["idle"]
  // makes his intro simply play the grounded, correctly-scaled IDLE animation instead.
  introPool: ["idle"],
  hasSprites: true,
  // 1.85: idle content 68px × 1.85 ≈ 126px on-screen. DIAGNOSED (not a blind bump):
  // at the old 1.7 Rick already rendered ~116px = TOP of the roster range (Sasuke 116,
  // Gojo/Sukuna 112, Toji 101, Naruto 118) with a standard 60×100 hitbox — no scale
  // override/canvas-flag/hitbox mismatch. He read "small" from his THIN silhouette
  // (low visual mass), not height. This is a deliberate +8.8% PRESENCE bump: it also
  // lifts his content width 51→57px (≈ Sasuke's 59) which closes the real mass gap.
  // Every anchorY below is re-scaled ×(1.85/1.7) so feet stay planted at the new size.
  spriteScale: 1.85,
  animationData: {
    idle:          { frames: 17, width: 30, height: 78,  speed: 6, anchorY: -15, sheet: "./rick_stand.png" },
    walk:          { frames: 9,  width: 32, height: 81,  speed: 5, anchorY: -15, sheet: "./rick_walk.png" },
    run:           { frames: 9,  width: 49, height: 79,  speed: 4, anchorY: -13, sheet: "./Rick_run.png" },
    jump:          { frames: 5,  width: 43, height: 78,  speed: 6, anchorY: -8,  sheet: "./rick_jump.png" },
    fall:          { frames: 5,  width: 43, height: 78,  speed: 6, anchorY: -8,  sheet: "./rick_jump.png" },   // reuse single-jump art for both jumps (rick_double_jump.png left unwired)
    dash:          { frames: 6,  width: 90, height: 78,  speed: 4, anchorY: -16, sheet: "./rick_air_dodge.png" },   // air-dash VISUAL only (air-dodge art); no i-frame/mechanic change
    hurt:          { frames: 6,  width: 70, height: 88,  speed: 6, anchorY: -21, sheet: "./rick_land_dodge.png" },  // TEMP hurt stand-in — reads as an upright dodge w/ afterimages, NOT a true hurt. Pending real art.
    light:         { frames: 10, width: 112, height: 90,  speed: 2, anchorY: -6, sheet: "./rick_jab_foward_attack_clean.png" },   // REPACKED to uniform 112px cells (was non-uniform 63px → split/garbage frames + residual JAB text); body leg-aligned to cell centre, feet planted. speed 2×10f = 20f = move's startup5+active3+recovery12.
    heavy:         { frames: 5,  width: 61, height: 89,  speed: 3, anchorY: -34, sheet: "./rick_kick.png" },
    up:            { frames: 12, width: 70, height: 106, speed: 3, anchorY: 0,   sheet: "./rick_up_attack_clean.png" },   // launcher; label/thumbnail/clipped-frame stripped → clean 12f
    air:           { frames: 9,  width: 44, height: 86,  speed: 3, anchorY: -28, sheet: "./rick_up_attack_2_com.png" },
    meeseeksThrow: { frames: 1,  width: 72, height: 68,  speed: 4, anchorY: -5,  loop: false, lockLastFrame: true, sheet: "./rick_meeseeks_throw.png" },
    rocket:        { frames: 4,  width: 51, height: 82,  speed: 3, anchorY: -2,  loop: false, lockLastFrame: true, sheet: "./rick_rocket_air_rocket_attack.png" },
    portalTravel:  { frames: 13, width: 66, height: 80,  speed: 2, anchorY: -16, loop: false, lockLastFrame: true, sheet: "./rick_portal_attack_travel.png" },
    selfDestruct:  { frames: 6,  width: 92, height: 92,  speed: 4, anchorY: 0,   loop: false, lockLastFrame: true, sheet: "./rick_speacial.png" },
    // doubleJump: jumpCount-aware air pose (sprite.js plays it on the 2nd jump). REPACKED uniform.
    doubleJump:    { frames: 3,  width: 50, height: 84,  speed: 4, anchorY: -6,  sheet: "./rick_double_jump.png" },
    // gunShot: brief cast pose for the free portal-gun laser poke. REPACKED uniform (4f aim/fire).
    gunShot:       { frames: 4,  width: 68, height: 90,  speed: 3, anchorY: -6,  loop: false, lockLastFrame: true, sheet: "./rick_gun.png" },
    // taunt: 10s-charge reward flourish (27f dance). REPACKED uniform 56px; 27×speed4 = 108f lock.
    taunt:         { frames: 27, width: 56, height: 80,  speed: 4, anchorY: -6,  loop: false, lockLastFrame: true, sheet: "./rick_taunt.png" }
  }
}

const morty = {
  rosterKey: "morty", name: "Morty Smith", universe: "rick_and_morty", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "panic"],
  primary: "melee", secondary: ["panic"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "low", scaling: "burst", animeMovement: false },
  stats: { maxHealth: 980, maxEnergy: 120, attack: 74, defense: 72, speed: 72, maxJumps: 2, jumpPower: 26, dashSpeed: 12, dashDuration: 10, dashCooldownMax: 50 },
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 70, startup: 9, active: 4, recovery: 18, hitstun: 16, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 60, startup: 8, active: 4, recovery: 16, hitstun: 18, knockbackX: 2, knockbackY: -7 },
    airAttack: { damage: 50, startup: 6, active: 3, recovery: 10, hitstun: 11, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 65, startup: 9, active: 4, recovery: 14, hitstun: 15, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    nerveStrike:   { cost: 25, damage: 100, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "quick panic-fueled strike" },
    franticFlurry: { cost: 20, damage: 80,  startup: 7, active: 6, recovery: 16, hitstun: 14, knockbackX: 4, knockbackY: 0,  effect: "wild flailing barrage" },
    scramble:      { cost: 10, damage: 50,  startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 4, knockbackY: -1, subtype: "mobility", dashSpeed: 20, effect: "desperate scrambling dash" }
  },
  ultimate: { name: "Morty's Courage", cost: 100, duration: 6, effect: "Dramatically boosts attack and speed temporarily" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const evilMorty = {
  rosterKey: "evilMorty", name: "Evil Morty", universe: "rick_and_morty", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "control"],
  primary: "melee", secondary: ["control"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "medium", scaling: "control", animeMovement: false },
  stats: { maxHealth: 1100, maxEnergy: 150, attack: 86, defense: 82, speed: 82, maxJumps: 2, jumpPower: 28, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 44 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    manipulativeBlast: { cost: 30, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 23, knockbackX: 9, knockbackY: -2, effect: "psychic energy attack" },
    override:          { cost: 25, damage: 90,  startup: 10, active: 5, recovery: 19, hitstun: 18, knockbackX: 5, knockbackY: -1, effect: "controlling pulse that saps enemy speed" },
    coldStep:          { cost: 15, damage: 60,  startup: 6,  active: 3, recovery: 13, hitstun: 12, knockbackX: 4, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "calculated portal-step reposition" }
  },
  ultimate: { name: "Evil Morty's Takeover", cost: 100, duration: 8, effect: "Increased speed, damage, and enemy debuffs" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const rickPrime = {
  rosterKey: "rickPrime", name: "Rick Prime", universe: "rick_and_morty", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["ranged", "gadgets"],
  primary: "ranged", secondary: ["gadgets"],
  traits: { hasEnergy: true, energyType: "portal_tech", mobility: "high", scaling: "burst", animeMovement: false },
  stats: { maxHealth: 1120, maxEnergy: 180, attack: 92, defense: 82, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 55, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 7, active: 4, recovery: 16, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    primePortalBlast: { cost: 35, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "extremely powerful multiverse energy attack" },
    annihilationMine: { cost: 30, damage: 110, startup: 13, active: 8, recovery: 22, hitstun: 20, knockbackX: 7,  knockbackY: -2, effect: "portal-tech charge that detonates" },
    primePortal:      { cost: 15, damage: 60,  startup: 6,  active: 3, recovery: 12, hitstun: 12, knockbackX: 4,  knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "instant high-speed portal warp" }
  },
  ultimate: { name: "Rick Prime's Supremacy", cost: 100, duration: 10, effect: "Massive speed, attack boost, and random gadget chaos" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// BEN 10
// His real movesets/stats live in the Omnitrix pool (fighters.js) and are
// applied LIVE by setupBen10()/applyAlien() — physics.js auto-runs this on the
// first frame a "ben10" fighter moves. This entry just makes him SELECTABLE on
// the universe/character screens (which read from this file). The values below
// are a sensible first-frame placeholder that the Omnitrix overrides instantly;
// they're matched to the default starting alien (Four Arms) so the HUD is right.
// ─────────────────────────────────────────────────────────────────
const ben10 = {
  rosterKey: "ben10", name: "Ben 10", universe: "ben_10",
  portrait: "./ben10_portrait.png",   // Ben Tennyson headshot (cropped from the idle strip) — one select-screen mugshot for the single "Ben 10" fighter; skins.js + ui.js read characters.ben10.portrait

  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "omnitrix", mobility: "high", scaling: "burst" },
  passive: { name: "Omnitrix", effect: "Press the transform/charge button to cycle through 5 aliens, each with its own moveset" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  // NOTE: these MIRROR fighters.js HUMAN_FORM.basic_attacks (the LIVE values revertToHuman applies) so
  // the select screen advertises what's actually delivered. The old entry (light 53 / heavy 106) was
  // never used in play — revertToHuman overwrites basic_attacks with HUMAN_FORM — so it was misleading
  // dead data. Keep the two in sync; HUMAN_FORM is the source of truth.
  basic_attacks: {
    light:     { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 16, knockbackX: 5, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 62, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 50, startup: 6, active: 3, recovery: 11, hitstun: 12, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 66, startup: 9, active: 4, recovery: 15, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 26, startup: 6, active: 3, recovery: 14, hitstun: 16, throwForceX: 4, throwForceY: -3 }
  },
  specials: {},
  ultimate: { name: "Omnitrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  // STAGE-1 sizing: 2.0 gives Ben-human (52px idle) ≈104px on-screen (roster median ≈111).
  // XLR8 (43px→86) reads short and Diamondhead (72px→144) reads tall under this single
  // per-character scale — per-form normalization is a Stage-5 height-pass concern (flagged).
  spriteScale: 2.0,
  // BEN-HUMAN (untransformed) sprite set — renders whenever fighter.transformed===false
  // (match start pre-transform, or forced revert at 0 energy). Alien forms swap the whole
  // set via fighter._skinAnim (see fighters.js BEN10_FORM_ANIM). Uniform strips re-sliced
  // from the raw on-disk sheets (harness alpha-gutter repack → *_uniform.png). guard omitted
  // → falls to idle; hurt/intro reuse idle (no dedicated hit/entrance art yet — flagged).
  animationData: {
    idle:  { frames: 8, width: 36, height: 52, speed: 6, anchorY: 0, sheet: "./ben10_idle_uniform.png" },
    walk:  { frames: 6, width: 45, height: 51, speed: 7, anchorY: 0, sheet: "./ben10_run_uniform.png" },
    run:   { frames: 6, width: 45, height: 51, speed: 4, anchorY: 0, sheet: "./ben10_run_uniform.png" },
    dash:  { frames: 6, width: 45, height: 51, speed: 3, anchorY: 0, sheet: "./ben10_run_uniform.png" },
    jump:  { frames: 1, width: 46, height: 54, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jump_uniform.png" },
    fall:  { frames: 1, width: 46, height: 54, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jump_uniform.png" },
    hurt:  { frames: 1, width: 36, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_idle_uniform.png" },   // STOPGAP: no hit art
    intro: { frames: 8, width: 36, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_idle_uniform.png" },   // STOPGAP: no intro art
    // STAGE-2 NORMALS (Ben-human). light/air/grab share the jab strip; heavy reuses it slower (no
    // dedicated heavy art — flagged). up = up_attack strip, down_air = the dive-kick strip.
    light:    { frames: 3, width: 44, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },
    heavy:    { frames: 3, width: 44, height: 53, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },       // STOPGAP: reuse jab
    up:       { frames: 3, width: 47, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_up_uniform.png" },
    air:      { frames: 3, width: 44, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },       // STOPGAP: reuse jab
    down_air: { frames: 3, width: 46, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_down_air_uniform.png" },
    grab:     { frames: 3, width: 44, height: 53, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },
    // STAGE-2 command chain (Fwd+Heavy → re-tap Heavy): 2-hit jab string sliced from the jab strip.
    benJab1:  { frames: 2, width: 44, height: 53, speed: 3, sourceX: 0,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },
    benJab2:  { frames: 2, width: 44, height: 53, speed: 3, sourceX: 44, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_jab_uniform.png" },
    // STAGE-3 special: Hoverboard Dash (neutral mobility+strike) / Hoverboard Bash (Down launcher) — both
    // ride the hoverboard strip (the only mobility art Ben-human has; the two specials share the pose).
    benHover: { frames: 4, width: 57, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_hoverboard_uniform.png" },
    // STAGE-4 ultimate: Omnitrix Transformation cast pose (Ben raises the dial → green flash → alien
    // silhouette). Played on Ben's body during the freeze cinematic (ben10OmnitrixCinematic.js).
    transform: { frames: 16, width: 63, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_transform_uniform.png" },
    // TAUNT (re-audit 2026-07-28): enrolls Ben in the EXISTING universal taunt-heal (game.js
    // updateTauntState — hold Down 10s un-hit → heal 50%). Uses the previously-UNUSED ben10_taunt.png
    // (frames 0-1, the clean single poses re-sliced to _uniform; frames 2-4 were an unusable
    // alien-select cluster). speed 26 → 2×26 = 52-frame flourish. Thematic for the weak human "catch
    // your breath while energy regens" window. Alien forms taunt in-form via their _skinAnim.taunt→idle.
    taunt: { frames: 2, width: 28, height: 58, speed: 26, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ben10_taunt_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// POWER RANGERS
// Space Patrol Delta. Resource = SPD Energy (Morpher). All rangers keep the
// standard rules: no-cost basic melee + SPD Energy specials (incl. a mobility
// move) + a "Judgment / Battlizer" ultimate.
// ─────────────────────────────────────────────────────────────────
const RANGER_BASICS = {
  light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
  heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
  upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
  airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
  downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
  grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
}

// The Omega Ranger (White Ranger, S.P.D.) — the ONE Power Rangers character with real
// sprite art on disk (omega_ranger_*.png). Single-form blade/blaster striker. The five
// core S.P.D. rangers + Shadow Ranger that used to sit here were unbuilt data stubs
// (procedural-box DEFAULT_ANIM, no hasSprites) and were pruned; this is the real one.
// PHASE 1: idle + core movement/normals sliced from the on-disk sheets (frame counts via
// alpha-gutter detection). Specials/ultimate are HUD/kit data for now — the sword-slash /
// gun / ultimate-barrage art (omega_ranger_sword_slash_*, _gun, _sword_shash_ultimate*)
// gets wired in a later behaviour pass (Beerus precedent: specials:{} + kit stands valid).
const omegaRanger = {
  rosterKey: "omega_ranger", name: "Omega Ranger (White Ranger, S.P.D.)", universe: "power_rangers",
  portrait: "./SPD_Omega_Ranger_mugshot.png",   // EXACT on-disk filename (character-select mugshot / HUD nameplate) — same role as vegeta_mugshot.png / beerus_mugshot.png; skins.js + ui.js both read characters.omega_ranger.portrait
  archetypes: ["melee", "sword", "ranged"], primary: "melee", secondary: ["sword", "ranged"],
  traits: { hasEnergy: true, energyType: "spd_energy", mobility: "high", scaling: "damage", animeMovement: false },
  passive: { name: "Omega Morpher", effect: "S.P.D.'s fastest ranger — quicker Dash recovery and steady SPD Energy regen" },
  stats: { maxHealth: 1180, maxEnergy: 175, attack: 93, defense: 86, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 19, dashDuration: 10, dashCooldownMax: 34 },
  basic_attacks: {
    ...RANGER_BASICS,
    light: { damage: 48, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy: { damage: 92, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 }
  },
  // Specials/ultimate are HUD + kit data (mirrors Beerus's staged approach); the real
  // behaviour + sword/gun/ultimate sprite wiring lands in a later pass.
  specials: {
    gun:          { cost: 30, damage: 120, startup: 6,  active: 5, recovery: 12, hitstun: 18, knockbackX: 7,  knockbackY: -2, effect: "Delta Enforcer energy bolt (ranged)" },
    superUpper:   { cost: 45, damage: 150, startup: 8,  active: 5, recovery: 20, hitstun: 24, knockbackX: 6,  knockbackY: -14, effect: "energized rising uppercut — launcher (Fwd+Special)" },
    downSpecial:  { cost: 40, damage: 165, startup: 10, active: 6, recovery: 24, hitstun: 26, knockbackX: 9,  knockbackY: -4, effect: "spinning-blade ground-spray slam (Down+Special)" }
  },
  ultimate: { name: "Omega Saber: Final Strike", cost: 100, duration: 9, effect: "Multi-hit saber barrage" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // TWO-PART INTRO (smoke-cloud summon): intro (cloud erupts/engulfs) → intro2 (cloud
  // disperses, ranger revealed in ready stance) play back-to-back via the fixed-order
  // introSequence stepper (Vegeta/Toji precedent), NOT introPool (random pick).
  introSequence: ["intro", "intro2"],
  hasSprites: true,
  // SIZE-NORMALIZED (2026-07-24): was 2.0. By CONTENT height (not cell height) his idle measured
  // 48px × 2.0 ≈ 96px on-screen — the roster's SMALLEST (median ≈ 111). The old comment cited the
  // 52px CELL × 2.0 ≈ 104 "mid range", but the cell carries headroom the content doesn't → he read
  // undersized. Bumped to 2.35 → 48px × 2.35 ≈ 113px, squarely mid-band. anchorY=0 everywhere so
  // feet stay planted (the plant is cell-bottom→hitbox-bottom; content botGap ≈2px is scale-invariant).
  spriteScale: 2.35,
  // STAGE-1 sprites (movement/state/intro). Fragmented source sheets were RE-SLICED into
  // clean uniform strips (harness/reslice.mjs / crop_uniform.mjs) — the *_uniform.png files;
  // frame counts VISUALLY confirmed. width = uniform cell pitch, height = full cell height.
  // Missing actions (kick/sword/gun/etc.) come in later stages; they fall back to idle safely.
  animationData: {
    idle:      { frames: 4,  width: 47,  height: 52,  speed: 6, anchorY: 0, sheet: "./omega_ranger_idle.png" },          // 4 clean frames, even pitch 47
    // run.png reslice → 8 uniform poses. walk = same strip, slower cadence. dash FX sheet
    // (omega_ranger_dash.png) is bodyless motion-blur → reuse the run pose during dash for now
    // (a blur-overlay pass can layer the FX sheet later).
    walk:      { frames: 8,  width: 54,  height: 54,  speed: 8, anchorY: 0, sheet: "./omega_ranger_run_uniform.png" },
    run:       { frames: 8,  width: 54,  height: 54,  speed: 4, anchorY: 0, sheet: "./omega_ranger_run_uniform.png" },
    dash:      { frames: 8,  width: 54,  height: 54,  speed: 3, anchorY: 0, sheet: "./omega_ranger_run_uniform.png" },
    jump:      { frames: 9,  width: 46,  height: 54,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_double_jump_uniform.png" },
    fall:      { frames: 9,  width: 46,  height: 54,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_double_jump_uniform.png" },
    // hit_1 = the hit reaction (standing recoil → tumble → prone). Serves both the in-combat
    // flinch (hurt: short hitstun only shows the opening recoil frames) AND the sprawled
    // knockdown pose. hit_2 = the get-up (prone → rise → ready), driving the engine's
    // knockdown→getup chain (sprite.js: needs BOTH knockdown & getup strips).
    hurt:      { frames: 11, width: 79,  height: 66,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_hit_1_uniform.png" },
    knockdown: { frames: 11, width: 79,  height: 66,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_hit_1_uniform.png" },
    getup:     { frames: 9,  width: 68,  height: 55,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_hit_2_uniform.png" },
    // Two-part summon intro (re-sliced; debris puffs kept inside their owning frame cells).
    intro:     { frames: 7,  width: 137, height: 116, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_intro_2_part_1_uniform.png" },
    intro2:    { frames: 5,  width: 122, height: 132, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_intro_2_part_2_uniform.png" },
    // STAGE-2 NORMALS (all re-sliced to uniform strips; counts visually confirmed).
    light:    { frames: 4,  width: 58, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_foward_punch_uniform.png" },      // quick gun-point jab
    // heavy: downward_smash.png is a 20-frame run-up→overhead-smash→dust-recovery arc (dust
    // debris fragmented the raw sheet — hand-cropped via crop_uniform.mjs). A heavy NORMAL's
    // ~32-frame window can't show all 20, and the run-up/recovery tail aren't the payoff — so we
    // start at the windup (sourceX = frame 5 × 89) and play 10 frames = leap→overhead smash→
    // dust impact. lockLastFrame holds the impact during recovery.
    heavy:    { frames: 10, width: 89, height: 75, speed: 3, sourceX: 445, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_downward_smash_uniform.png" },
    up:       { frames: 8,  width: 60, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_upper_attack_uniform.png" },        // launcher: rising sword uppercut
    air:      { frames: 6,  width: 61, height: 61, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_air_punch_uniform.png" },
    down_air: { frames: 4,  width: 74, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_air_down_attack_uniform.png" },      // dive spike
    grab:     { frames: 4,  width: 58, height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_foward_punch_uniform.png" },
    // STAGE-3 command-normal cancel chain (Fwd+Heavy → re-tap Heavy) + free pokes. Move keys
    // match the abilities.js OMEGA_RANGER_CMD/POKE tables so sprite.js resolves each via identity.
    omKick:        { frames: 6,  width: 65, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_kick_uniform.png" },
    omSpinKick:    { frames: 12, width: 50, height: 70, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_spin_kick_uniform.png" },
    omLowAttack:   { frames: 7,  width: 54, height: 37, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_low_attack_uniform.png" },
    omForwardPush: { frames: 5,  width: 60, height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_foward_push_uniform.png" },
    omDownAir2:    { frames: 10, width: 53, height: 57, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_downward_air_attack_2_uniform.png" },
    // STAGE-4 sword slash string (Back+Light → re-tap Light). 7 distinct slashes; keys match the
    // abilities.js OMEGA_RANGER_SWORD table (identity sprite-resolve).
    omSword1: { frames: 7, width: 69, height: 80, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_1_uniform.png" },
    omSword2: { frames: 5, width: 72, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_2_uniform.png" },
    omSword3: { frames: 5, width: 73, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_3_uniform.png" },
    omSword4: { frames: 5, width: 51, height: 92, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_4_uniform.png" },
    omSword5: { frames: 6, width: 56, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_5_uniform.png" },
    omSword6: { frames: 5, width: 65, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_6_uniform.png" },
    omSword7: { frames: 6, width: 56, height: 77, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_slash_7_uniform.png" },
    // STAGE-5 specials. omGun = the blaster CAST pose (played via _spriteCastMove; the bolt is a
    // separate projectile sheet). omSuperUpper / omDownSpecial = melee-special currentMove sprites.
    omGun:         { frames: 6,  width: 59, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_gun_uniform.png" },
    omSuperUpper:  { frames: 10, width: 54, height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_super_upper_attack_uniform.png" },
    omDownSpecial: { frames: 14, width: 87, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_specail_downward_attack_uniform.png" },
    // STAGE-6 Ultimate ("ultimate" action key, driven by currentMove) + Battlizer bonus ring special.
    ultimate:      { frames: 10, width: 78,  height: 66,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_shash_ultimate_uniform.png" },
    omSwordRing:   { frames: 8,  width: 124, height: 109, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_shash_ultimate_2_uniform.png" }   // 8 real poses (sheet+13 skins repacked to drop a mid-animation blank phantom cell)
  }
}

// ─────────────────────────────────────────────────────────────────
// SAMURAI RED RANGER (Fire) — the SECOND Power Rangers sprite character (after Omega
// Ranger). Fire-samurai swordsman built in STAGES with real screenshot evidence at each
// step (Killua/Gon/Tobirama/Rengoku rigor). The headline mechanic (Stage 3) is MEGA MODE:
// a full VEGETA-STYLE TIER-SWAP — every base move has a higher-damage Mega Mode counterpart
// that swaps in for the transformation's duration (NOT an overlay). Stages 4-5 add the
// Mega-Mode-EXCLUSIVE Flame Slash and the tier-scaling Ultimate.
//
// STAGE 1 (this pass): 3-file sprite gate + base-tier movement/state (idle/walk/jump/hurt/
// guard). Raw source sheets were RE-SLICED into clean uniform strips (tools/reslice_strip.mjs)
// on COPIES — the *_uniform.png files — because the originals are untracked/unrecoverable.
// Frame counts measured via alpha-gutter scan (see SAMURAI_RED_RANGER_ASSET_MAP.md). Specials/
// ultimate/Mega-Mode are HUD+kit data for now (Omega/Beerus staged precedent); they fall back
// to idle safely until wired in Stages 3-5. The base-tier WALK is samurai_run.png (a DISTINCT
// asset supplied separately — NOT the Mega walk samurai_ranger_mega_fit_walk.png).
// ─────────────────────────────────────────────────────────────────
const samuraiRedRanger = {
  rosterKey: "samurai_red_ranger", name: "Samurai Red Ranger (Fire)", universe: "power_rangers",
  // No dedicated mugshot in the batch → portrait cropped (head+torso) from the idle + upscaled 5×
  // (Killua/Omni-Man precedent). tools: crop in Stage 6; file samurai_ranger_portrait.png.
  portrait: "./samurai_ranger_portrait.png",
  archetypes: ["melee", "sword"], primary: "sword", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "symbol_power", mobility: "medium", scaling: "damage", animeMovement: false },
  passive: { name: "Mojikara", effect: "Symbol Power fuels the Fire Smasher — steady meter feeds the Mega Mode transformation and its flame specials" },
  // Sword-based striker, comparable tier to Omega Ranger (HP 1180 / EN 175 / atk 93 / def 86 /
  // spd 92). Samurai reads as a HEAVIER, sturdier swordsman: a touch more HP + defense, a touch
  // slower ground speed, smaller base meter (Mega Mode is the payoff you build toward). All values
  // sit inside the roster band — no outliers (see Stage-1 balance note in the harness).
  stats: { maxHealth: 1220, maxEnergy: 160, attack: 95, defense: 88, speed: 88, maxJumps: 2, jumpPower: 31, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 34 },
  basic_attacks: {
    ...RANGER_BASICS,
    heavy: { damage: 90, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 }
  },
  // HUD/kit data only for now — real behaviour + Mega-Mode gating land in Stages 3-5. Flame Slash
  // is flagged Mega-Mode-EXCLUSIVE (no base-tier art exists for it).
  specials: {
    flameSlash: { cost: 35, damage: 150, startup: 8, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -2, megaOnly: true, effect: "rising flame slash into a double-burst (MEGA MODE ONLY)" }
  },
  ultimate: { name: "Fire Smasher: Blazing Strike", cost: 100, duration: 9, effect: "Multi-hit flaming saber barrage (damage scales with Mega Mode)" },
  // MEGA MODE — a full Vegeta-style TIER-SWAP (Stage 3). transformationOrder stays ["base"] because
  // Mega is driven by the DEDICATED enter/revert path (abilities.js enterSamuraiMega), NOT the generic
  // transformationOrder stepper. The `megaMode` entry exists so updateTransformationState re-applies
  // the tier's multipliers each frame from currentFormData (the Vegeta gotcha) — NO `duration` here, so
  // updateTransformations never auto-reverts it; applySamuraiFormSystem owns the sustained drain+revert.
  transformationOrder: ["base"],
  transformations: {
    base:     { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    megaMode: { damageMultiplier: 1.35, speedMultiplier: 1.05, defenseMultiplier: 1.08 }
  },
  // No dedicated intro art in the batch (the transformation_part_* sheets belong to Mega Mode, not
  // a summon intro) — use the idle as the intro pose (Killua introPool-idle precedent).
  introPool: ["idle"],
  hasSprites: true,
  // SIZE-NORMALIZED: idle content measured 60px tall → 60 × 1.85 ≈ 111px on-screen, the roster
  // median. anchorY=0 everywhere so feet stay planted on the cell bottom.
  spriteScale: 1.85,
  // STAGE-1 base-tier sprites. All RE-SLICED to clean uniform strips (tools/reslice_strip.mjs) from
  // COPIES of the untracked originals. width = uniform cell pitch, height = full cell height. Mega
  // Mode / normals / specials / ultimate come in later stages; missing actions fall back to idle.
  animationData: {
    idle:  { frames: 4, width: 27, height: 62, speed: 6, anchorY: 0, sheet: "./samurai_ranger_idle_uniform.png" },
    walk:  { frames: 8, width: 46, height: 61, speed: 6, anchorY: 0, sheet: "./samurai_run_uniform.png" },
    run:   { frames: 8, width: 46, height: 61, speed: 4, anchorY: 0, sheet: "./samurai_run_uniform.png" },
    dash:  { frames: 8, width: 46, height: 61, speed: 3, anchorY: 0, sheet: "./samurai_run_uniform.png" },
    jump:  { frames: 6, width: 35, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_jump_uniform.png" },
    fall:  { frames: 6, width: 35, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_jump_uniform.png" },
    hurt:  { frames: 2, width: 39, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_hit_uniform.png" },
    guard: { frames: 3, width: 30, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_guard_uniform.png" },
    // STAGE-2 base-tier NORMALS (all RE-SLICED to uniform strips from COPIES). light/heavy are SHORT
    // windows of the combo strings (quick opening slash vs. the heavier crouch-crescent); the FULL
    // strings drive the command chain below. air = spinning aerial slash; down_air = the CLEAN 6-frame
    // overhead dive (downattack) — chosen over the 17-frame flame string (downattack_2), which anchors
    // the chain finisher instead.
    light:    { frames: 4,  width: 77,  height: 69,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_combo_uniform.png" },      // quick opening slash (combo, first 4)
    heavy:    { frames: 6,  width: 70,  height: 80,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_combo_2_uniform.png" },    // heavier crouch-crescent (combo_2, first 6)
    up:       { frames: 8,  width: 69,  height: 118, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_upattack_1_uniform.png" }, // fallback (grounded up is suppressed → merged tap/hold below)
    air:      { frames: 9,  width: 109, height: 56,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_air_uniform.png" },
    down_air: { frames: 6,  width: 63,  height: 71,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_downattack_uniform.png" },
    grab:     { frames: 4,  width: 77,  height: 69,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_combo_uniform.png" },      // reuse the opening-slash pose (Omega precedent)
    // MERGED UP-ATTACK (one input, two power tiers): tap I → samUpTap (quick rising launcher,
    // upattack_1); hold I past the threshold → samUpHold (stronger, upattack_2). Driven by
    // updateSamuraiRangerCommandCombat (the built-in grounded up-attack is suppressed for samurai).
    samUpTap:  { frames: 8,  width: 69, height: 118, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_upattack_1_uniform.png" },
    samUpHold: { frames: 14, width: 93, height: 84,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_upattack_2_uniform.png" },
    // TOJI-REKKA COMMAND CHAIN (Fwd+Heavy opener → re-tap Heavy on hit → cancel into the next stage).
    // Stage keys match the abilities.js SAMURAI_RANGER_CMD table (identity sprite-resolve). Sourced
    // from the FULL combo/combo_2 strings + the unused downattack_2 flame string as the launcher
    // finisher. cancel-on-HIT (a block/whiff ends the string).
    samRekka1:   { frames: 13, width: 77, height: 69, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_combo_uniform.png" },
    samRekka2:   { frames: 15, width: 70, height: 80, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_combo_2_uniform.png" },
    samRekkaFin: { frames: 17, width: 82, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_downattack_2_uniform.png" },
    // STAGE-5 ULTIMATE (base tier) — "Fire Smasher: Blazing Strike". The 6 specialattack parts stitched
    // into one strip (raise blade → flaming saber barrage → flame explosion). Played through the freeze
    // cinematic via _spriteCastMove="ultimate". The MEGA tier overrides this key (SAMURAI_MEGA_ANIM) so
    // a transformed cast renders the higher-power Mega ultimate art instead.
    ultimate: { frames: 54, width: 164, height: 100, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_ultimate_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// GOLD SAMURAI RANGER (Light) — THIRD Power Rangers sprite char (after Omega, Red).
// Mirrors Samurai Red Ranger's CONFIRMED structure (base/Mega-Mode tier-swap, a Transformation
// special, a tier-scaling Ultimate) but with Gold's OWN art: a LIGHT-symbol (光) Symbol Power
// transformation (NOT fire), and a katana swordsman (Barracuda Blade). NO bow/arrow content exists
// on disk — the alpha-gutter scan found only sword melee + energy slash-arc FX (see
// GOLD_SAMURAI_RANGER_ASSET_MAP.md), so the brief's "bow/arrow" identity is not present; Stage 4
// uses the strongest real candidate (a light energy slash-wave projectile) instead.
// ─────────────────────────────────────────────────────────────────
const goldSamuraiRanger = {
  rosterKey: "gold_samurai_ranger", name: "Gold Samurai Ranger (Light)", universe: "power_rangers",
  // Portrait cropped from idle in Stage 6 (no dedicated mugshot in the batch).
  portrait: "./samurai_ranger_gold_portrait.png",
  archetypes: ["melee", "sword"], primary: "sword", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "symbol_power", mobility: "high", scaling: "damage", animeMovement: false },
  passive: { name: "Mojikara (Light)", effect: "Light Symbol Power fuels the Barracuda Blade — steady meter feeds the Mega Mode transformation and its light specials" },
  // Nimble sword striker — reads FASTER/LIGHTER than Red (Jayden): a touch less HP + defense, a touch
  // more ground speed + agility (Gold/Antonio is the mobile duelist). All values sit inside the roster
  // band, no outliers (see Stage-1 balance note in the harness). Same Mega-Mode-is-the-payoff meter shape.
  stats: { maxHealth: 1160, maxEnergy: 165, attack: 92, defense: 84, speed: 94, maxJumps: 2, jumpPower: 32, dashSpeed: 19, dashDuration: 10, dashCooldownMax: 32 },
  basic_attacks: {
    ...RANGER_BASICS,
    heavy: { damage: 86, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1 }
  },
  // HUD/kit data only for now — real behaviour lands in later stages. lightSlash is the Stage-4 special
  // candidate (no bow/arrow art → a light energy slash-wave projectile from the blue slash-arc FX).
  specials: {
    lightSlash: { cost: 35, damage: 140, startup: 8, active: 5, recovery: 20, hitstun: 20, knockbackX: 7, knockbackY: -1, megaOnly: false, effect: "light energy slash-wave projectile (Barracuda Blade)" }
  },
  ultimate: { name: "Barracuda Blade: Light Finale", cost: 100, duration: 9, effect: "Multi-hit light-saber barrage (damage scales with Mega Mode)" },
  // MEGA MODE — same Vegeta-style TIER-SWAP as Red (Stage 3), driven by the DEDICATED enter/revert path
  // (reused samurai form system), NOT the generic transformationOrder stepper. megaMode multipliers are
  // re-applied each frame from currentFormData; no `duration` so it never auto-reverts (the sustained
  // drain owns revert). Values mirror Red's tier so the tier-swap payoff reads consistently.
  transformationOrder: ["base"],
  transformations: {
    base:     { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    megaMode: { damageMultiplier: 1.35, speedMultiplier: 1.05, defenseMultiplier: 1.08 }
  },
  // INTRO (Stage-6 wiring, resliced from samurai_ranger_gold_intro.png — the ONLY genuine intro-quality
  // sequence): Antonio's pre-morph "Samuraizer" flourish (27f, 3 source rows → one uniform strip). SINGLE
  // fixed intro, not a random pool — the sheet's only other candidate (intro_2.png) is a 超 "Super" kanji
  // CALLIGRAPHY FX, not a character pose, so there is exactly one real intro animation. The armored-ranger
  // idle takes over when the round starts (a morph-reveal read). Plays stationary (game.js intro phase).
  introPool: ["intro"],
  hasSprites: true,
  // SIZE-NORMALIZED: idle content ~53px tall → 53 × 2.0 ≈ 106px on-screen (roster median). anchorY=0
  // everywhere so feet stay planted on the cell bottom.
  spriteScale: 2.0,
  // STAGE-1 base-tier movement/state sprites. RE-SLICED to clean uniform strips (tools/reslice_strip.mjs)
  // from COPIES of the untracked originals. Normals / Mega Mode / specials / ultimate come in later
  // stages; any missing action falls back to idle.
  animationData: {
    idle:  { frames: 4, width: 32, height: 58, speed: 6, anchorY: 0, sheet: "./samurai_ranger_gold_idle_uniform.png" },
    // INTRO — Antonio's pre-morph Samuraizer flourish (27f). Resliced from the 3-row samurai_ranger_gold_intro.png
    // into one uniform strip (tools/build_gold_intro_strip.py: per-frame tight-x, bottom-aligned, 44×69 cells).
    // loop:false + lockLastFrame so it settles on the final pose during the pre-match hold. Cosmetic; intro-only.
    intro: { frames: 27, width: 44, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_intro_uniform.png" },
    walk:  { frames: 8, width: 45, height: 54, speed: 6, anchorY: 0, sheet: "./samurai_ranger_gold_run_uniform.png" },
    run:   { frames: 8, width: 45, height: 54, speed: 4, anchorY: 0, sheet: "./samurai_ranger_gold_run_uniform.png" },
    dash:  { frames: 8, width: 45, height: 54, speed: 3, anchorY: 0, sheet: "./samurai_ranger_gold_run_uniform.png" },
    jump:  { frames: 6, width: 29, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_jump_uniform.png" },
    fall:  { frames: 6, width: 29, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_jump_uniform.png" },
    hurt:  { frames: 3, width: 54, height: 69, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_hurt_uniform.png" },   // first 3 stagger frames of the hurt→knockdown→getup strip
    guard: { frames: 3, width: 37, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_guard_uniform.png" },
    // STAGE-2 base-tier NORMALS — all KATANA melee sliced per-row from the attacks master (COPIES).
    // light/heavy are SHORT windows of the slash/lunge rows; the FULL rows drive the command chain below.
    // Gold does a SINGLE grounded up-attack (the rising launcher, row2) — NOT Red's merged tap/hold: Gold's
    // art gives one clean rising sheet + one flashy launcher, and the launcher reads best as the rekka
    // FINISHER (below), so a single up + a 3-stage chain showcases the command mechanic better than 2 up tiers.
    light:    { frames: 4,  width: 94, height: 60,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_slash_uniform.png" },     // quick opening slash (row0, first 4)
    heavy:    { frames: 6,  width: 98, height: 60,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_lunge_uniform.png" },     // committed forward lunge-crescent (row1, first 6)
    up:       { frames: 8,  width: 81, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_rising_uniform.png" },    // spinning rising launcher (row2)
    air:      { frames: 7,  width: 78, height: 77,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_aerial_uniform.png" },    // forward aerial slash (row4, first 7)
    down_air: { frames: 5,  width: 78, height: 77,  speed: 4, anchorY: 0, sourceX: 312, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_aerial_uniform.png" }, // downward dive slash (row4, frames 4-8)
    grab:     { frames: 4,  width: 94, height: 60,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_slash_uniform.png" },     // reuse the opening slash (Omega/Red precedent)
    // TOJI-REKKA COMMAND CHAIN (Fwd+Heavy opener → re-tap Heavy on HIT → cancel into the next stage).
    // Stage keys match the SHARED abilities.js SAMURAI_RANGER_CMD table (Gold reuses Red's proven rekka
    // logic; sprites resolve against THESE Gold keys). Sourced from the FULL slash/lunge rows + the big
    // V-arc launcher row as the flashy finisher. cancel-on-HIT (a block/whiff ends the string).
    samRekka1:   { frames: 11, width: 94, height: 60, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_slash_uniform.png" },
    samRekka2:   { frames: 12, width: 98, height: 60, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_lunge_uniform.png" },
    samRekkaFin: { frames: 12, width: 99, height: 79, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_launcher_uniform.png" },
    // STAGE-4 SPECIAL cast pose — the forward launcher slash that HURLS the light slash-wave (a katana
    // sword-beam; NO bow/arrow art exists, so this is the strongest real projectile candidate). Usable in
    // BOTH tiers; the Mega form overrides this key (GOLD_MEGA_ANIM) with the gold-armored slash art.
    lightSlash: { frames: 8, width: 99, height: 79, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_launcher_uniform.png" },
    // STAGE-5 ULTIMATE (base tier) — "Barracuda Blade: Light Finale". No dedicated ult sheet in the batch →
    // reuses the big V-arc launcher slash as a light-saber barrage, played through the freeze cinematic via
    // _spriteCastMove="ultimate". The MEGA tier overrides this key (GOLD_MEGA_ANIM) → higher-power Mega art.
    ultimate: { frames: 12, width: 99, height: 79, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_launcher_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// GREEN SAMURAI RANGER (Forest) — "MIKE" — FOURTH Power Rangers sprite char
// (after Omega, Red, Gold). Mirrors Red/Gold's CONFIRMED structure (base/Mega-Mode
// tier-swap, a Transformation special, a tier-scaling Ultimate) but with Green's OWN art.
// KEY DIFFERENTIATOR confirmed by the alpha-gutter scan (GREEN_SAMURAI_RANGER_ASSET_MAP.md):
// Green wields a SPEAR / naginata (Forest Spear) with green leaf-swirl FX — a genuine
// EXTENDED-REACH weapon neither Red nor Gold has (both katana). Transformation = FOREST
// Symbol Power (森, green leaf/wind morph — random.png), distinct from Red's fire and Gold's
// light. Stage 1 = registration + base-tier movement/state ONLY; normals/Mega/spear-special/
// ultimate land in later stages, missing actions fall back to idle.
// ─────────────────────────────────────────────────────────────────
const greenSamuraiRanger = {
  rosterKey: "green_samurai_ranger", name: "Green Samurai Ranger (Forest)", universe: "power_rangers",
  // REAL mugshot cropped from the master-sheet header (helmeted bust, gutter-split from the
  // "Green Ranger" logo text) — not a placeholder idle-crop (Red/Gold Stage-6 fix applied up front).
  portrait: "./samurai_ranger_forest_portrait.png",
  archetypes: ["melee", "spear"], primary: "spear", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "symbol_power", mobility: "medium", scaling: "damage", animeMovement: false },
  passive: { name: "Mojikara (Forest)", effect: "Forest Symbol Power fuels the Forest Spear — steady meter feeds the Mega Mode transformation and its long-reach leaf specials" },
  // REACH archetype (the spear identity). Sits BETWEEN Red (heavy/slow HP1220 spd88) and Gold
  // (nimble HP1160 spd94): sturdy mid HP, mid meter, ground speed a touch under Gold because the
  // spear's reach — not footspeed — is the win condition. All values inside the roster band, no
  // outliers (see Stage-1 balance note in the harness).
  stats: { maxHealth: 1190, maxEnergy: 165, attack: 91, defense: 85, speed: 91, maxJumps: 2, jumpPower: 31, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 33 },
  basic_attacks: {
    ...RANGER_BASICS,
    heavy: { damage: 88, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: 1 }
  },
  // HUD/kit data only for now — real behaviour + Mega gating land in Stages 3-5. forestSpear is the
  // Stage-4 EXTENDED-REACH special (the real spear-blast art: samurai_ranger_forest_specail_projectile.png).
  specials: {
    forestSpear: { cost: 35, damage: 145, startup: 9, active: 5, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: -1, megaOnly: false, effect: "long-reach Forest Spear thrust into a leaf-energy blast wave" }
  },
  ultimate: { name: "Forest Spear: Verdant Storm", cost: 100, duration: 9, effect: "Multi-hit leaf-storm spear barrage (damage scales with Mega Mode)" },
  // MEGA MODE — same Vegeta-style TIER-SWAP as Red/Gold (Stage 3), driven by the DEDICATED
  // enter/revert path (reused samurai form system), NOT the generic transformationOrder stepper.
  // megaMode multipliers re-applied each frame from currentFormData; no `duration` (sustained drain
  // owns revert). Values mirror Red/Gold's tier so the tier-swap payoff reads consistently.
  transformationOrder: ["base"],
  transformations: {
    base:     { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    megaMode: { damageMultiplier: 1.35, speedMultiplier: 1.05, defenseMultiplier: 1.08 }
  },
  // No dedicated base-tier summon intro (the mega_mode_intro sheet belongs to Mega Mode, Stage 3) —
  // use the idle as the intro pose (Red/Killua introPool-idle precedent).
  introPool: ["idle"],
  hasSprites: true,
  // SIZE-NORMALIZED: idle content measured 61px tall → 61 × 1.85 ≈ 113px on-screen (roster median).
  // anchorY=0 everywhere so feet stay planted on the cell bottom.
  spriteScale: 1.85,
  // STAGE-1 base-tier movement/state sprites. RE-SLICED to clean uniform strips (tools/reslice_strip.mjs)
  // from COPIES of the untracked originals (forest = green). Normals / Mega Mode / spear-special /
  // ultimate come in later stages; any missing action falls back to idle.
  animationData: {
    idle:  { frames: 4, width: 30, height: 61, speed: 6, anchorY: 0, sheet: "./samurai_ranger_forest_idle_uniform.png" },
    walk:  { frames: 8, width: 58, height: 52, speed: 6, anchorY: 0, sheet: "./samurai_ranger_forest_run_uniform.png" },
    run:   { frames: 8, width: 58, height: 52, speed: 4, anchorY: 0, sheet: "./samurai_ranger_forest_run_uniform.png" },
    dash:  { frames: 8, width: 58, height: 52, speed: 3, anchorY: 0, sheet: "./samurai_ranger_forest_run_uniform.png" },
    jump:  { frames: 6, width: 35, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_jump_uniform.png" },
    fall:  { frames: 6, width: 35, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_jump_uniform.png" },
    // hurt = the master-sheet "Stun" reel (stagger-with-stars); first 3 frames = the stagger window.
    hurt:  { frames: 3, width: 43, height: 71, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_hurt_uniform.png" },
    // guard = the CLEAN crouch stance (frames 5-8 of the block sheet; frames 1-4 are the cyan shield
    // FX build). sourceX skips past the shield frames to the settled defensive pose.
    guard: { frames: 4, width: 41, height: 85, speed: 6, anchorY: 0, sourceX: 164, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_guard_uniform.png" },
    // ── STAGE-2 base-tier NORMALS (all SPIN-SWORD melee, resliced from COPIES) ──
    // The alpha-gutter scan confirmed EVERY base normal (attacks/up/air/down) uses the Spin Sword with
    // GREEN leaf/energy slash FX — the SPEAR appears ONLY on the _specail* sheets, so it is reserved for
    // the Stage-4 extended-reach special, NOT a normal slot. Green does a SINGLE grounded up-attack (like
    // Gold, not Red's merged tap/hold). light/heavy are SHORT windows of the attacks-master rows; the
    // FULL rows drive the command chain below.
    light:    { frames: 4,  width: 68,  height: 73,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_slash_uniform.png" },   // quick opening slash (attacks row0, first 4)
    heavy:    { frames: 6,  width: 77,  height: 69,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_lunge_uniform.png" },   // heavier crescent (attacks row1, first 6)
    up:       { frames: 8,  width: 69,  height: 118, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_rising_uniform.png" },  // rising green slash-wave launcher (up_attack)
    air:      { frames: 6,  width: 109, height: 56,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_aerial_uniform.png" },  // spinning aerial slash (air_attack, first 6)
    down_air: { frames: 4,  width: 109, height: 56,  speed: 4, anchorY: 0, sourceX: 545, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_aerial_uniform.png" }, // downward-angled dive slash (aerial, frames 6-9)
    grab:     { frames: 4,  width: 68,  height: 73,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_slash_uniform.png" },   // reuse the opening slash (Red/Gold/Omega precedent)
    // TOJI-REKKA COMMAND CHAIN (Fwd+Heavy opener → re-tap Heavy on HIT → cancel into the next stage).
    // Stage keys match the SHARED abilities.js SAMURAI_RANGER_CMD table (Green reuses Red/Gold's proven
    // rekka logic; sprites resolve against THESE Green keys). Sourced from the FULL attacks rows + the
    // green leaf-spike down-string as the flashy launcher FINISHER. cancel-on-HIT (block/whiff ends it).
    samRekka1:   { frames: 12, width: 68, height: 73, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_slash_uniform.png" },
    samRekka2:   { frames: 13, width: 77, height: 69, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_lunge_uniform.png" },
    samRekkaFin: { frames: 15, width: 81, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_launcher_uniform.png" },
    // STAGE-4 SPECIAL cast pose — the FOREST SPEAR thrust (the real naginata art) that hurls the leaf-blast
    // wave. Usable in BOTH tiers; the Mega form overrides this key (GREEN_MEGA_ANIM) with the mega spear art.
    forestSpear: { frames: 13, width: 83, height: 68, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_spear_cast_uniform.png" },
    // STAGE-5 ULTIMATE (base tier) — "Forest Spear: Verdant Storm". No dedicated ult sheet in the batch →
    // reuses the leaf-spike launcher string as a Verdant-Storm barrage, played through the freeze cinematic
    // via _spriteCastMove="ultimate". The MEGA tier overrides this key (GREEN_MEGA_ANIM) → higher-power art.
    ultimate: { frames: 15, width: 81, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_launcher_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// RED RANGER — Jason (Mighty Morphin) — FOURTH Power Rangers sprite char, but the FIRST
// from the CLASSIC MMPR team (the other three — Omega/S.P.D. + Samurai Red/Gold/Green — are
// different teams/seasons). Grouped by `universe: "power_rangers"` like the rest; the MMPR
// team is distinguished by rosterKey + name only (the data model has no sub-team field —
// same as how Omega/S.P.D. is distinguished from the Samurai trio). A hand-to-hand + Power
// Sword striker (Jason's karate + the signature blade → Stage-4 Ultimate).
// ART CREDIT: "Omega (tolgayavuz85)" — REQUIRED attribution, tracked in credits.js SOURCED_ART.
// STAGE 1: registration + movement/state + the 5-intro random pool (4 unmorphed sequences,
// each appending the shared morph-flash → morphed stance, via the new introSequencePool; + 1
// already-morphed STANDALONE intro that does NOT get the flash). Normals / rekka / grab / Power
// Sword ultimate land in Stages 2-4; any missing action falls back to idle.
// ─────────────────────────────────────────────────────────────────
const redRangerMmpr = {
  rosterKey: "red_ranger_mmpr", name: "Red Ranger (Mighty Morphin)", universe: "power_rangers",
  // REAL helmeted-bust portrait cropped from the master sheet's dedicated mugshot (the iconic MMPR
  // Red Ranger helmet, near the credit block) + upscaled 4× (Stage 5). tools: PIL crop 790,1325→935,1500.
  portrait: "./red_ranger_mmpr_portrait.png",
  archetypes: ["melee", "sword"], primary: "melee", secondary: ["sword"],
  traits: { hasEnergy: true, energyType: "morphin_grid", mobility: "medium", scaling: "damage", animeMovement: false },
  passive: { name: "Morphin Grid", effect: "Draws on the Power Coin — energy builds steadily to fuel the Power Sword Ultimate" },
  // Balanced karate striker, squarely inside the Power Rangers band (cf. Samurai Red HP1220/spd88,
  // Gold HP1160/spd94, Green HP1190/spd91). Jason reads as an all-rounder brawler: mid HP, mid meter,
  // solid speed. No outliers (verified against BALANCE_AUDIT.md in Stage 5).
  stats: { maxHealth: 1200, maxEnergy: 180, attack: 93, defense: 86, speed: 92, maxJumps: 2, jumpPower: 31, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 33 },
  basic_attacks: {
    ...RANGER_BASICS,
    heavy: { damage: 88, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 6, knockbackY: 1 }
  },
  // HUD/kit descriptor only for now — the Power Sword freeze-cinematic behaviour lands in Stage 4
  // (sword_up_attack, the tallest/signature asset). Grab/throw special (trhow_1→trhow_2) is Stage 3.
  ultimate: { name: "Power Sword: Overhead Strike", cost: 100, duration: 9, effect: "Leaping overhead Power Sword slash — heavy single-target burst" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // FIVE-INTRO RANDOM POOL. introSequencePool = a pool of SEQUENCES (new game.js support): each match
  // picks ONE entry at random. The 4 UNMORPHED sequences each append `morphFlash` (the shared
  // intro_final_part → civilian morphs into the red suit); the 5th (`introMorphed`) is the STANDALONE
  // already-suited intro and is a single-step sequence, so it plays WITHOUT the flash.
  introSequencePool: [
    ["introRunIn",    "morphFlash"],   // unmorphed run-in  → morph
    ["introTeleport", "morphFlash"],   // unmorphed idle/teleport-in → morph
    ["introMorpher",  "morphFlash"],   // "It's Morphin Time" morpher raise → morph
    ["introKnuckles", "morphFlash"],   // cracking knuckles → morph
    ["introMorphed"]                    // already-morphed STANDALONE (no flash appended)
  ],
  hasSprites: true,
  // SIZE-NORMALIZED: idle content measured 72px tall → 72 × 1.54 ≈ 111px on-screen (roster median).
  // anchorY=0 everywhere so feet stay planted on the cell bottom (bottom-aligned reslice → no bob).
  spriteScale: 1.54,
  // STAGE-1 sprites. All RE-SLICED to clean uniform, bottom-aligned strips (tools/reslice_strip.mjs)
  // from COPIES of the untracked originals. width = uniform cell pitch, height = full cell height.
  // No guard art exists in this batch (falls back to idle). Normals / specials / ultimate = later stages.
  animationData: {
    idle:      { frames: 3, width: 42, height: 74, speed: 6, anchorY: 0, sheet: "./red_ranger_mmpr_idle_uniform.png" },
    walk:      { frames: 6, width: 43, height: 74, speed: 6, anchorY: 0, sheet: "./red_ranger_mmpr_walk_uniform.png" },
    run:       { frames: 6, width: 58, height: 70, speed: 4, anchorY: 0, sheet: "./red_ranger_mmpr_run_uniform.png" },
    dash:      { frames: 6, width: 58, height: 70, speed: 3, anchorY: 0, sheet: "./red_ranger_mmpr_run_uniform.png" },
    jump:      { frames: 7, width: 50, height: 81, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_jump_uniform.png" },
    fall:      { frames: 7, width: 50, height: 81, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_jump_uniform.png" },
    hurt:      { frames: 3, width: 42, height: 73, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_hurt_uniform.png" },
    knockdown: { frames: 3, width: 42, height: 73, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_hurt_uniform.png" },
    // ── STAGE-2 NORMALS (5 slots, all RE-SLICED from COPIES). Karate striker: light=jab, heavy=big
    // cross, up=rising kick (launcher via RANGER_BASICS.upAttack), air=flying kick, down_air=the
    // 180° aerial somersault (fires airborne Down+Light). ──
    light:     { frames: 2, width: 64, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_foward_punch_uniform.png" },
    heavy:     { frames: 3, width: 70, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_punch_2_uniform.png" },
    up:        { frames: 6, width: 58, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_up_attack_uniform.png" },
    air:       { frames: 2, width: 72, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_jump_kick_uniform.png" },
    down_air:  { frames: 4, width: 85, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_180_kick_uniform.png" },
    // ── STAGE-2 COMMAND CHAIN (Fwd+Heavy → re-tap Heavy on HIT, cancel-on-hit): rrRekka1 (jab) →
    // rrRekka2 (cross) → rrRekka3 (super 360° spin-kick LAUNCHER, string ends). Stages 1-2 reuse the
    // light/heavy sheets (Omega/samurai precedent); the finisher is its own super_360 art. Plus the
    // airborne-Heavy DIVE-KICK poke (down_air_attack art, distinct from the down_air somersault). Keys
    // match the abilities.js RED_RANGER_MMPR_CMD/POKE tables (identity sprite-resolve). ──
    rrRekka1:  { frames: 2, width: 64, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_foward_punch_uniform.png" },
    rrRekka2:  { frames: 3, width: 70, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_punch_2_uniform.png" },
    rrRekka3:  { frames: 5, width: 63, height: 82, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_super_360_kick_uniform.png" },
    rrDiveKick:{ frames: 3, width: 73, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_down_air_attack_uniform.png" },
    // ── STAGE-3 GRAB/THROW SPECIAL (neutral Special): rrGrab = trhow_1 (reach → grab → lift windup),
    // then rrThrow = trhow_2 (release follow-through), swapped by the throw-resolve watcher. `grab` (the
    // universal O-grab) reuses the trhow_1 windup so it renders a real pose instead of idle-fallback. ──
    grab:      { frames: 4, width: 61, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_trhow_1_uniform.png" },
    rrGrab:    { frames: 4, width: 61, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_trhow_1_uniform.png" },
    rrThrow:   { frames: 2, width: 69, height: 80, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_trhow_2_uniform.png" },
    // ── STAGE-4 ULTIMATE — "Power Sword: Overhead Strike" (sword_up_attack, the tallest/signature
    // asset). Played through the freeze cinematic via _spriteCastMove="ultimate": draw back → raise
    // Power Sword overhead (blade arc) → overhead slash-down. Held on the final slash pose. ──
    ultimate:  { frames: 4, width: 87, height: 113, speed: 14, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_ultimate_uniform.png" },
    // ── 5-INTRO POOL variants (keys referenced by introSequencePool above) ──
    introRunIn:    { frames: 12, width: 50, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_intro_runin_uniform.png" },
    introTeleport: { frames: 3,  width: 36, height: 69, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_intro_teleport_uniform.png" },
    introMorpher:  { frames: 8,  width: 66, height: 91, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_intro_morpher_uniform.png" },
    introKnuckles: { frames: 5,  width: 29, height: 69, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_intro_knuckles_uniform.png" },
    morphFlash:    { frames: 2,  width: 33, height: 69, speed: 9, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_morph_flash_uniform.png" },
    introMorphed:  { frames: 6,  width: 73, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./red_ranger_mmpr_intro_morphed_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// ALBEDO  (Ben's clone — Ultimatrix)
// Mechanically identical to Ben 10: same alien roster + same energy/transform
// system (see fighters.js setupBen10 / updateTransformDevice). This entry just
// makes Albedo SELECTABLE and flags him as the clone so the device/draw code
// gives him his own red "Negative" identity. physics.js auto-runs setupBen10()
// for rosterKey "albedo" the same way it does for "ben10".
// ─────────────────────────────────────────────────────────────────
const albedo = {
  rosterKey: "albedo", name: "Albedo", universe: "ben_10", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  isAlbedo: true, deviceType: "ultimatrix",
  spriteSheet: "sprites/albedo/albedo_atlas.png",   // deferred art — SpriteHandler falls back to procedural
  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ultimatrix", mobility: "high", scaling: "burst" },
  passive: { name: "Ultimatrix", effect: "Same as the Omnitrix — cycle aliens; the form drains energy and force-reverts to human at zero" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  // NOTE: these MIRROR fighters.js HUMAN_FORM.basic_attacks (the LIVE values revertToHuman applies) so
  // the select screen advertises what's actually delivered. The old entry (light 53 / heavy 106) was
  // never used in play — revertToHuman overwrites basic_attacks with HUMAN_FORM — so it was misleading
  // dead data. Keep the two in sync; HUMAN_FORM is the source of truth.
  basic_attacks: {
    light:     { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 16, knockbackX: 5, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 62, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 50, startup: 6, active: 3, recovery: 11, hitstun: 12, knockbackX: 2, knockbackY: -2 },
    downAir:   { damage: 66, startup: 9, active: 4, recovery: 15, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 26, startup: 6, active: 3, recovery: 14, hitstun: 16, throwForceX: 4, throwForceY: -3 }
  },
  specials: {},
  ultimate: { name: "Ultimatrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// INVINCIBLE — Viltrumites. This universe was previously two procedural-box DATA STUBS
// (omniMan + thragg, ...DEFAULT_ANIM, no hasSprites → filtered out of the select grid).
// OMNI-MAN is now the real, fully-sprited character (omni_man_*.png — see OMNI_MAN_ASSET_MAP.md),
// built in stages (Killua/Gon/Tobirama rigor). thragg was PRUNED (see the note below where his
// entry used to be) — Omni-Man is the sole Invincible character.
//
// STAGE 0: universe grouping (auto via `universe: "invincible"`) + the "Smart Atoms" energy label
// + real idle sprite so he appears on the select screen. The old stub was energyless raw-power;
// the real design gives him a SHARED "Smart Atoms" pool (energyType smart_atoms → ui.js label)
// that fuels BOTH the toggleable Flight movement mode AND his specials from one meter.
// Full movement/normals/flight/specials/ultimate land in Stages 1-5; stats are refined in Stage 1.
// ─────────────────────────────────────────────────────────────────
const omniMan = {
  rosterKey: "omniman", name: "Omni-Man", universe: "invincible",
  portrait: "./omniman_portrait.png",   // character-select mugshot — cropped head+torso from the idle (no dedicated mugshot in the batch, Killua precedent); skins.js + ui.js read characters.omniman.portrait
  archetypes: ["melee", "flight"],
  primary: "melee", secondary: ["flight"],
  traits: { hasEnergy: true, energyType: "smart_atoms", mobility: "high", scaling: "damage", animeMovement: false, canFly: true },
  passive: { name: "Viltrumite Physiology", effect: "Superhuman strength — overwhelming power on the ground, unmatched mobility once airborne on Smart Atoms" },
  // Overwhelming-raw-power bruiser: top-tier HP + attack. Ground speed bumped to the roster median
  // (Fix #5 — was 84, a slow-end outlier; now 90, tied Naruto/Sasuke) so he's no longer a clear
  // laggard, while real burst mobility still comes from Flight (much faster, Stage 3 / Fix #5) and the
  // teleport-dash below. maxEnergy is the shared Smart Atoms pool (flight drain + special cost).
  stats: { maxHealth: 1400, maxEnergy: 200, attack: 98, defense: 88, speed: 90, maxJumps: 2, jumpPower: 34, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 38 },
  // Double-tap TOWARD the opponent → teleport-dash (blink to the far side, facing them), reusing the
  // shared dashTeleport system (game.js detectDoubleTapDashTeleport → teleportBehindTarget). Reposition-
  // only like Gojo/Sasuke/Rick — no Smart Atoms cost — Fix #4. (Viltrumite speed-blitz.)
  movement: { dashTeleport: true },
  basic_attacks: {
    // Damage reads heavier than the roster average by design (raw-power archetype — see Stage-2 report).
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 4, knockbackY: 0, rangeX: 76 },
    heavy:     { damage: 120, startup: 13, active: 5, recovery: 26, hitstun: 22, knockbackX: 11, knockbackY: 2, superArmor: true, rangeX: 92, rangeY: 48 },   // committed super-armored haymaker (top-of-roster damage — FLAGGED, intentional)
    upAttack:  { type: "launcher", damage: 92, startup: 10, active: 4, recovery: 20, hitstun: 22, blockstun: 10, knockbackX: 3, knockbackY: -12, launch: 12, airOK: false },   // rising overhead launcher → juggle
    airAttack: { damage: 78, startup: 6, active: 3, recovery: 12, hitstun: 15, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 105, startup: 11, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: 13 },
    grab:      { damage: 36, startup: 6, active: 3, recovery: 15, hitstun: 22, throwForceX: 7, throwForceY: -5 }
  },
  // SPECIALS (Stage 4) — direction-branched off the Special button (via _specialHeldDir), all drawing
  // from the SHARED Smart Atoms pool (casting competes with flight time). Real behaviour lives in
  // abilities.js executeOmniManSpecial. Neutral = Viltrumite Smash; Forward = Skewering Rush (flying
  // tackle, ground or air); Down = Meteor Drop (diving slam). NOTE: the asset batch has NO thrown-
  // object / eye-beam (Heat Vision) art, so a ranged special is intentionally omitted (flagged).
  specials: {
    viltrumiteSmash: { cost: 35, damage: 130, startup: 8, active: 5, recovery: 22, hitstun: 26, knockbackX: 12, knockbackY: -3, superArmor: true, effect: "committed super-armored power punch (neutral)" },
    skeweringRush:   { cost: 30, damage: 120, startup: 7, active: 6, recovery: 20, hitstun: 24, knockbackX: 14, knockbackY: -4, subtype: "mobility", effect: "flying tackle that carries him across the screen (Fwd) — usable on the ground or mid-flight" },
    meteorDrop:      { cost: 40, damage: 140, startup: 9, active: 5, recovery: 24, hitstun: 26, knockbackX: 8, knockbackY: 12, effect: "diving meteor slam (Down) — spikes the opponent down" }
  },
  ultimate: { name: "Viltrumite Onslaught", cost: 100, duration: 8, effect: "Relentless flying assault: heavy damage and knockback surge" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  // idle content 127px × 0.95 ≈ 121px on-screen — a touch above the roster median (~111), fitting a
  // physically imposing powerhouse. REQUIRES the skins.js `omniman` entry (spriteScale gate) + the
  // spritesheets.js SPRITE_MANIFEST idle gate. anchorY:0 plants feet at cell bottom.
  spriteScale: 0.95,
  // STAGE 1: movement + state. Multi-frame strips RE-SLICED to clean uniform cells (harness/reslice.mjs,
  // alpha-gutter frame detection) — the *_uniform.png files. Ground walk/run and guard have NO standalone
  // source strip, so run is sliced from the master sheet's only ground-locomotion row (a forward-charging
  // lunge); guard falls back to idle (flagged, Flash precedent). knockdown routes to hurt automatically.
  // Three intro sequences, one picked at random each match (Fix #6 — Sasuke multi-intro precedent):
  //   intro      = standing hero flex (intro_version_3)
  //   intro2     = alternate hero pose (intro:version_2, resliced)
  //   introCrash = the signature "descends from the sky and 3-point lands" crash (intro_part_1_falling
  //                → intro_part_2:revese, concatenated) — the deferred Stage-1 crash-from-sky, now live.
  introPool: ["intro", "intro2", "introCrash"],
  animationData: {
    idle: { frames: 3, width: 88,  height: 139, speed: 7, anchorY: 0, sheet: "./omni_man_idle.png" },
    // NO ground-walk animation (Fix #3): Omni-Man is perpetually hovering — he never plants his feet to
    // stroll. walk/run/dash all REUSE the idle-float sheet so he glides across the ground in his hover
    // pose (the old forward-charging lunge, omni_man_run_uniform.png, is retired — it read as a janky
    // pose-pop when starting/stopping, Fix #2). Movement speed is stat-driven in physics.moveFighter
    // (rawSpeed/dashSpeed), NOT tied to this animation's frame timing, so gliding at the idle cadence
    // does not slow him — the run/dash STATES still apply their faster velocities.
    walk: { frames: 3, width: 88, height: 139, speed: 7, anchorY: 0, sheet: "./omni_man_idle.png" },
    run:  { frames: 3, width: 88, height: 139, speed: 7, anchorY: 0, sheet: "./omni_man_idle.png" },
    dash: { frames: 3, width: 88, height: 139, speed: 7, anchorY: 0, sheet: "./omni_man_idle.png" },
    // non_flying_jump (flight OFF): crouch → leap → airborne rise. Play once, hold apex. fall = last
    // airborne frame (sourceX = 5 × 131). The STANDARD-jump art; Flight (Stage 3) REPLACES this state.
    jump: { frames: 6, width: 131, height: 143, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_jump_uniform.png" },
    fall: { frames: 1, width: 131, height: 143, speed: 5, sourceX: 655, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_jump_uniform.png" },
    // hurt = the ground/air hit reaction (ground:air_hit resliced). knockdown auto-routes here (no
    // dedicated knockdown/getup strip); guard → idle (no guard strip). Both flagged for a later art pass.
    hurt: { frames: 3, width: 126, height: 127, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_hit_uniform.png" },
    // hurt_air = dedicated AIRBORNE tumble/recoil (air_hit resliced) — sprite.js plays this when he's hit
    // while airborne (Toji hurt_air precedent), instead of the grounded flinch. Wired in the anim audit
    // (was resliced during the build but never hooked up).
    hurt_air: { frames: 2, width: 140, height: 171, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_air_hit_uniform.png" },
    // intro = the standing hero flex (intro_version_3 resliced). introPool picks it each match. The
    // cinematic crash-from-sky sequence (intro_part_1_falling → intro_part_2:revese) is DEFERRED — it
    // pairs naturally with the Stage-3 forced-descent art as a later polish pass.
    intro: { frames: 6, width: 146, height: 161, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_intro_uniform.png" },
    // Fix #6 — two more intros for the random introPool. intro2 = alt hero pose (intro:version_2);
    // introCrash = descends-from-sky 3-point-landing (intro_part_1_falling + intro_part_2:revese concat).
    intro2:     { frames: 8, width: 115, height: 133, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_intro2_uniform.png" },
    introCrash: { frames: 4, width: 112, height: 156, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_intro_crash_uniform.png" },
    // ── STAGE 2 NORMALS — re-sliced to uniform cells (harness/reslice.mjs, frame counts confirmed).
    // combat.js reads DAMAGE/frames from basic_attacks; these are the SPRITES (identity MOVE_TO_ACTION).
    // Numbers read heavier than the roster average by design (raw-power archetype — flagged in the
    // Stage-2 report). The `air` slot uses the STANDARD upright aerial punch (per the Stage-1 air-file
    // finding), NOT flight content.
    light:    { frames: 5,  width: 160, height: 130, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_punch_uniform.png" },       // jab → straight cross
    heavy:    { frames: 4,  width: 165, height: 128, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_punch_1_uniform.png" },     // committed haymaker straight (super-armored)
    up:       { frames: 4,  width: 134, height: 166, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_up_attack_uniform.png" },    // rising overhead — launcher
    air:      { frames: 3,  width: 156, height: 144, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_air_forward_punch_uniform.png" },   // STANDARD aerial forward punch (upright)
    down_air: { frames: 3,  width: 115, height: 138, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_air_down_attack_2_uniform.png" },   // diving spike
    grab:     { frames: 4,  width: 107, height: 126, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_grab_uniform.png" },
    // ── STAGE 2 COMMAND CHAIN — "Viltrumite Beatdown" Toji-Rekka string (Fwd+Heavy opener → re-tap
    // Heavy during recovery, cancel-on-HIT) + a free Fwd+Light shove poke. Identity-mapped in sprite.js;
    // the real damage/chain logic lives in abilities.js OMNIMAN_CMD/POKE + updateOmniManCommandCombat.
    omCombo1:   { frames: 4,  width: 150, height: 154, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_air_kick_uniform.png" },     // flying-knee opener
    omCombo2:   { frames: 5,  width: 134, height: 133, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_down_attack_uniform.png" },   // downward hook — 5 real poses (6th cell was a blank 1px-speck phantom; lockLastFrame held it invisible)
    omComboFin: { frames: 11, width: 134, height: 173, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_combo_launch_uniform.png" },        // multi-hit launcher finisher
    omPush:     { frames: 4,  width: 136, height: 153, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_push_uniform.png" },                 // Fwd+Light spacing shove
    // ── STAGE 3 FLIGHT (the core new system). fly = horizontal hover (loops); flyMove = streaking
    // directional flight; forcedDescent = the "ran out of Smart Atoms" tumble from the sky (concat of
    // falls_from_flying part_1+2, plays once + holds head-down); descentLand = the crash-landing
    // recovery (vulnerability window). These are FLIGHT-specific sprites (NOT the standard `air` slot —
    // see the Stage-1 air-file finding). Resolved in sprite.js by _flightActive / _forcedDescent state.
    fly:           { frames: 4, width: 124, height: 148, speed: 8, anchorY: 0, sheet: "./omni_man_fly_uniform.png" },
    flyMove:       { frames: 2, width: 162, height: 124, speed: 6, anchorY: 0, sheet: "./omni_man_fly_move_uniform.png" },
    forcedDescent: { frames: 7, width: 165, height: 144, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_descent_uniform.png" },
    descentLand:   { frames: 7, width: 164, height: 158, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_land_uniform.png" },
    // ── STAGE 4 SPECIALS (direction-branched). omSkewer = the flying-tackle dive (air_to_ground combo,
    // upright→horizontal streak); omMeteor = the diving meteor slam. Neutral "Viltrumite Smash" reuses
    // the heavy haymaker pose (no new art). Identity-mapped in sprite.js; behaviour in abilities.js.
    omSkewer: { frames: 12, width: 180, height: 127, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_skewer_uniform.png" },
    omMeteor: { frames: 5,  width: 144, height: 154, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_meteor_uniform.png" },
    // ── STAGE 5 ULTIMATE — "Viltrumite Onslaught": the flying body-slam (combo_where_he_lands_on_his_
    // oppenets, the LARGEST sheet in the batch). Plays via _spriteCastMove:"ultimate" through the freeze
    // cinematic (omnimanBodySlamCinematic.js). 15f × speed 6 ≈ 90 ticks spans the leap→slam.
    ultimate: { frames: 15, width: 171, height: 191, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ultimate_uniform.png" }
  }
}

// Thragg (Invincible) was PRUNED (2026-07-27) — he was a data-only procedural-box stub
// (no hasSprites, animationData: {...DEFAULT_ANIM}) with no art on disk, same as the unbuilt
// Power Rangers / early HxH stubs that were removed. Deleting the entry drops him from every
// roster-iterating system (buildUniverseMap select grid, AI-fill pools, characterList) so he no
// longer shows as a selectable box. His procedural drawThragg() was removed from fighters.js too.
// Omni-Man is unaffected. Re-add a full entry here (+ hasSprites + the 3-file gate) if he's built.

// ─────────────────────────────────────────────────────────────────
// HUNTER × HUNTER
// Phase-1 roster: shared basic-attack template (HXH_BASICS) with per-fighter
// stat profiles + a thematic special/ultimate, so each plays distinctly even
// before bespoke movesets. `color` drives the procedural fallback silhouette;
// `spriteSheets` lists the art each fighter still needs (hasSprites:false → the
// procedural fallback renders until those sheets exist). Energy = "nen".
// ─────────────────────────────────────────────────────────────────
const HXH_BASICS = {
  light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
  heavy:     { damage: 84, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
  upAttack:  { damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
  airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
  downAir:   { damage: 76, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
  grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
}
// Sprite-sheet filename set per fighter (naming convention: <key>_<action>_sheet.png).
const hxhSheets = (n) => ({
  idle: `${n}_idle_sheet.png`, walk: `${n}_walk_sheet.png`, attack: `${n}_attack_sheet.png`,
  jump: `${n}_jump_sheet.png`, hurt: `${n}_hurt_sheet.png`
})

// ─────────────────────────────────────────────────────────────────
// ISAAC NETERO  (Hunter x Hunter universe) — first HxH sprite character.
// STAGE 1: idle + core movement/state + selectability. Base strips
// (netero_*.png) RE-SLICED into clean uniform, feet-aligned cells
// (tools/reslice_strip.mjs → *_uniform.png) so the engine slices by a
// single pitch without horizontal jitter (Itachi/omega precedent). Frame
// counts confirmed by the reslicer's alpha-gutter detection (idle 4, run 8,
// jump 6, block 4, hit 7 — all match the asset map).
// Structurally closest to Itachi: a base taijutsu kit + a giant full-
// alternate-form Ultimate (100-Type Guanyin Bodhisattva, Stage 4) reusing
// the SAME _canvasHeightFrac giant-sprite system as Itachi's/Sasuke's
// Susanoo. Normals (Stage 2), down_attck command chain + Barrage Punches
// (Stage 3), and the Guanyin form (Stages 4-5) land in later passes.
// NO intro/win/lose/getup art was shipped (confirmed absent) — those states
// fall back cleanly to idle (the missing-action → idle-sheet guard in
// sprite.js prevents the "four sprites" box glitch). Portrait wired:
// issac_netero_mugshot.png (479² JPEG-in-.png; "issac" typo as uploaded).
// ─────────────────────────────────────────────────────────────────
const netero = {
  rosterKey: "netero", name: "Isaac Netero", universe: "hunter_x_hunter", color: "#f59e0b",
  portrait: "./issac_netero_mugshot.png",   // EXACT on-disk filename — typo "issac" is intentional (as uploaded, do NOT rename); JPEG-in-.png (browser decodes by content); skins.js + ui.js read characters.netero.portrait
  archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Hundred-Type Guanyin", effect: "Veteran speed and power — overwhelming offense balanced by frailty" },
  // Extreme-speed elderly martial-artist archetype: highest attack + high speed on the roster,
  // paid for with the frailest HP among the melee bruisers (glass-cannon; see Beerus 1000).
  stats: { maxHealth: 980, maxEnergy: 150, attack: 98, defense: 82, speed: 94, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 34 },
  // STAGE 2 normals — Netero's frantic taijutsu. Highest-attack roster values but the frailest
  // bruiser HP (glass cannon). light = a lightning jab; heavy = the committed "super forward punch";
  // up = rising uppercut launcher (feeds the juggle system); air = neutral aerial; down_air = the same
  // aerial sheet reused as a diving spike (no dedicated 2nd air file). combat.js _getMD reads THIS block.
  basic_attacks: {
    light:     { damage: 48, startup: 3, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 80, rangeY: 46 },
    upAttack:  { type: "launcher", damage: 72, startup: 4, active: 3, recovery: 6, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); high-atk/low-HP glass cannon
    airAttack: { damage: 62, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 84, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // SPECIAL (Stage 3) — Barrage Punches: one committed melee flurry (Netero's only special; the real
  // logic + hitbox live in abilities.js executeNeteroSpecial). The concatenated 8-frame sprite (3 punch
  // frames → 5 fist-blur frames) plays as ONE continuous sequence via currentMove. There is ALSO a
  // Down+Heavy command-normal cancel chain (down_attck_1 → cancel-on-hit → down_attck_2) driven by
  // abilities.js updateNeteroCommandCombat — a command normal, not listed here (not a metered special).
  specials: {
    barragePunches: { cost: 30, damage: 110, startup: 6, active: 14, recovery: 12, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "committed melee fist barrage — one continuous 8-frame flurry" }
  },
  ultimate: { name: "100-Type Guanyin Bodhisattva", cost: 100, duration: 7, effect: "Summon the Guanyin avatar — a sustained giant alternate form (Stage 4)." },
  // NO transformations block (Itachi parity): the ONLY form is the Guanyin ULTIMATE, handled directly in
  // abilities.js (enter/revert/updateNeteroGuanyin). A vestigial base-form transform here would make
  // updateTransformations() re-apply a 1.0 multiplier every frame and stomp the giant's 1.6× buff.
  hasSprites: true,
  // idle content ~60px × 1.85 ≈ 111px on-screen ≈ roster height (Itachi 112, Beerus ~105).
  // REQUIRES the skins.js `netero` entry (else applySkin() pulls the spriteScale:1 fallback →
  // native ~60px, half size) + the spritesheets.js SPRITE_MANIFEST idle gate. anchorY plants feet;
  // the reslicer bottom-aligns every frame so feet stay consistent across sheets (anchorY ≈ 0).
  spriteScale: 1.85,
  animationData: {
    idle: { frames: 4, width: 38, height: 62, speed: 6, anchorY: 0, sheet: "./netero_idle_uniform.png" },
    // No dedicated walk art — reuse the run strip a touch slower (Beerus precedent: walk & run share one sheet).
    walk: { frames: 8, width: 50, height: 59, speed: 6, anchorY: 0, sheet: "./netero_run_uniform.png" },
    run:  { frames: 8, width: 50, height: 59, speed: 4, anchorY: 0, sheet: "./netero_run_uniform.png" },
    dash: { frames: 8, width: 50, height: 59, speed: 3, anchorY: 0, sheet: "./netero_run_uniform.png" },
    // jump.png = crouch→rise→apex arc; play once + hold. fall = the apex/descent pose (last cell, sourceX = 5×38).
    jump: { frames: 6, width: 38, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_jump_uniform.png" },
    fall: { frames: 1, width: 38, height: 63, speed: 6, anchorY: 0, sourceX: 190, loop: false, lockLastFrame: true, sheet: "./netero_jump_uniform.png" },
    // Block → the `guard` action key (sprite.js resolves isBlocking → "guard" only if the strip exists). Hold final frame.
    guard: { frames: 4, width: 40, height: 62, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_block_uniform.png" },
    // HURT — the 7-frame hit strip covers stagger-INTO-knockdown as one sequence (per asset map). Every
    // hitstun/stun/knockdown state routes here (no dedicated knockdown/getup/hurt_air strips). Hold last frame.
    hurt: { frames: 7, width: 70, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_hit_uniform.png" },
    // ── STAGE 2 NORMALS — re-sliced to uniform cells (reslice_strip.mjs); frame counts confirmed
    // by alpha-gutter detection. speed ≈ move duration / frames so the swing reads across the active
    // window. All identity-mapped in sprite.js MOVE_TO_ACTION; combat starts them via the action key.
    light:    { frames: 4, width: 54, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_foward_punch_uniform.png" },        // quick forward jab
    heavy:    { frames: 7, width: 43, height: 62, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_super_foward_punch_uniform.png" },   // committed super punch
    up:       { frames: 7, width: 65, height: 65, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_upper_attack_uniform.png" },         // launcher: rising uppercut
    // Aerial sheet is taller (diving pose w/ extended legs). Reused for BOTH air (neutral aerial) and
    // down_air (dive spike) — no dedicated 2nd air file (project reuse precedent).
    air:      { frames: 7, width: 48, height: 94, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_air_down_attack_uniform.png" },
    down_air: { frames: 7, width: 48, height: 94, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_air_down_attack_uniform.png" },
    // ── STAGE 3: command-normal cancel chain (Down+Heavy → cancel-on-hit → re-tap Heavy). Both sheets
    // RE-SLICED with the debris filter (--minw=10) so the stray mid-strip / trailing specks the asset
    // map warned about are dropped → clean 9 / 7 frame counts (not the raw 10 / 8). currentMove drives
    // the sheet; the swap from _1 → _2 resets the frame counter (sprite.js sheet-change guard).
    down_attck_1: { frames: 9, width: 47, height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_down_attck_1_uniform.png" },   // crouch lunge opener
    down_attck_2: { frames: 7, width: 50, height: 92, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_down_attck_2_uniform.png" },   // rising follow-up
    // ── STAGE 3: Barrage Punches SPECIAL — the two source files (3 punch frames + 5 fist-blur frames)
    // CONCATENATED into ONE uniform 8-frame strip (harness/concat_uniform.mjs) so it plays as a single
    // continuous sequence, per the asset map's "contiguous, zero gutter" finding. Not two synced layers.
    barragePunches: { frames: 8, width: 98, height: 73, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_barrage_full_uniform.png" },
    // ── STAGE 4: 100-Type Guanyin Bodhisattva ULTIMATE transformation CHARGE cast (base form). Plays via
    // _spriteCastMove while abilities.js executeNeteroUltimate charges, then the GIANT avatar materialises
    // (the giant body lives on fighter._skinAnim = GUANYIN_ANIM in abilities.js, NOT here). 13f × speed 2 =
    // 26 ticks = GUANYIN_CAST_FRAMES (the delayed-enter window).
    guanyinCast: { frames: 13, width: 51, height: 65, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_charge_guanyin_uniform.png" },
    // HOLD-TO-CHARGE — Nen/energy-charging state (hold P). Uses the Guanyin Bodhisattva charge sheet
    // (netero_charrge:Guanyin_Bodhisattva.png, resliced → netero_charge_guanyin_uniform.png — the SAME
    // source art as guanyinCast, per the original build) instead of the generic procedural aura. Plays
    // the full buildup 0→12 ONCE then HOLDS the final gathered Bodhisattva pose (lockLastFrame, no loop);
    // once it's holding that last frame, game.js _drawChargeAura layers the generic cyan energy vortex
    // AROUND him on top (Netero-only exception to the "dedicated charge strip skips the generic FX" gate).
    // Rendered by sprite.js when isCharging (the universal hold-to-charge sets it for any maxEnergy>0 char).
    charge: { frames: 13, width: 51, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_charge_guanyin_uniform.png" }
  },
  // No dedicated intro art shipped (confirmed absent). Point the intro pool at `idle` so the pre-match
  // beat holds a clean idle pose — deterministic and box-free — instead of falling through to the generic
  // "transform" variant (which has no strip and would only render idle via sprite.js's fallback guard
  // anyway, but with a null _actionDef.sheet). A real entrance is deferred pending art. Win/lose reuse
  // the engine's shared end-match screens (no per-character art). Getup: no strip → knockdown routes to
  // `hurt` via the legacy 12-frame path (sprite.js), no getup chain.
  introPool: ["idle"]
}

// ─────────────────────────────────────────────────────────────────
// CHROLLO LUCILFER (Hunter x Hunter — 5th HxH char). rosterKey "chrollo".
// See CHROLLO_ASSET_MAP.md. Deliberately PLAIN technical-melee base kit (the
// person's own description) — his entire identity lives in the SKILL HUNTER
// ultimate (Stage 5): a LIVE dynamic transformation into the current opponent's
// full character (moveset + specials + their own ultimate), unlocked by the
// opponent landing 3 DISTINCT moves on him. That is architecturally novel and
// is investigated in Stage 4 before any ultimate code is written.
//
// STAGE 1 scope = registration + movement/state + a random-cycle intro pool of
// ALL FOUR intro candidates. Normals (Stage 2), the book special (Stage 3), and
// Skill Hunter (Stages 4-5) land later. basic_attacks / specials / ultimate are
// declared as METADATA now (gokuBlack precedent) so the character-select kit
// panel has data and nothing assumes `.specials`/`.ultimate` is undefined; the
// attack SPRITES are wired into animationData in Stage 2 (until then attacks fall
// back cleanly to idle via sprite.js's missing-action guard — no fallback box).
// All movement/state/intro strips were COPIED to *_uniform.png and the COPY
// resliced (untracked originals preserved).
// ─────────────────────────────────────────────────────────────────
const chrollo = {
  rosterKey: "chrollo", name: "Chrollo Lucilfer", universe: "hunter_x_hunter", color: "#7c3aed",
  portrait: "./chrollo_portrait.png",   // cropped 4× from intro2 frame 0 (refine in Stage 6)
  archetypes: ["melee", "technical"], primary: "melee", secondary: ["technical"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "adaptive", animeMovement: true },
  passive: { name: "Skill Hunter", effect: "Bandit's Secret — after the opponent lands 3 distinct moves, Chrollo can steal their entire fighting style (Ultimate)." },
  // Deliberately plain, mid-of-the-roster technical melee (per the person's own description —
  // his power lives entirely in the Skill Hunter ultimate). Nothing spikes: balanced HP, modest
  // energy (enough to bank the ultimate), average attack/defense/speed. No 0.60-bypass frailty.
  stats: { maxHealth: 1080, maxEnergy: 130, attack: 84, defense: 84, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  // STAGE 2 normals — deliberately plain knife/melee kit, mid-of-roster numbers (nothing spikes).
  // light = straight jab; heavy = committed side kick (longer reach); up = rising knife-slash launcher
  // (feeds the juggle system); air = crescent aerial slash; down_air = the same aerial sheet reused as
  // a diving spike. combat.js _getMD reads THIS block; the SPRITES live in animationData.
  basic_attacks: {
    light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 80, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1, rangeX: 80, rangeY: 50 },
    upAttack:  { type: "launcher", damage: 66, startup: 6, active: 4, recovery: 8, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -32, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 58, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { type: "spike", damage: 76, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // SPECIALS (Stage 3) — SPECIAL button, direction-branched (executeChrolloSpecial). Both use REAL
  // unextracted master-sheet art surfaced in the Stage-3 close pass (the neck-stab manipulation move
  // does NOT exist in the art — confirmed absent, not fabricated). Base kit is otherwise plain.
  specials: {
    nenBolt:    { cost: 25, damage: 60, effect: "Neutral/Fwd — a blue nen construct thrown as a traveling projectile." },
    bladeLunge: { cost: 25, damage: 78, effect: "Down — a committed forward knife-thrust lunge." }
  },
  ultimate: { name: "Skill Hunter", cost: 100, duration: 30, effect: "Once the opponent lands 3 DISTINCT moves on Chrollo, steal their ENTIRE fighting style (moveset + specials + their own ultimate + transformations) for 30s. Re-press Ultimate to end early. Unlock is consumed per use (must re-earn 3 distinct moves)." },
  hasSprites: true,
  // idle content ~58px × 1.9 ≈ 110px on-screen — squarely in roster range (Netero 111 / Gojo 112).
  // REQUIRES the skins.js `chrollo` default entry (else applySkin() pulls the spriteScale:1 fallback
  // → native ~58px, half size) + the spritesheets.js SPRITE_MANIFEST idle gate.
  spriteScale: 1.9,
  animationData: {
    idle:  { frames: 4, width: 28, height: 58, speed: 6, anchorY: 0, sheet: "./chrollo_idle_uniform.png" },
    // No dedicated walk/dash art — reuse the run strip (Netero precedent). walk slower than run.
    walk:  { frames: 6, width: 49, height: 50, speed: 6, anchorY: 0, sheet: "./chrollo_run_uniform.png" },
    run:   { frames: 6, width: 49, height: 50, speed: 4, anchorY: 0, sheet: "./chrollo_run_uniform.png" },
    dash:  { frames: 6, width: 49, height: 50, speed: 3, anchorY: 0, sheet: "./chrollo_run_uniform.png" },
    // jump = run-jump → tucked cape apex → fists-up airborne. Play once + hold. fall = the tucked
    // apex cell (frame 4, sourceX = 4×44 = 176) held during descent.
    jump:  { frames: 8, width: 44, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_jump_uniform.png" },
    fall:  { frames: 1, width: 44, height: 61, speed: 6, anchorY: 0, sourceX: 176, loop: false, lockLastFrame: true, sheet: "./chrollo_jump_uniform.png" },
    // Block → the `guard` action key (sprite.js resolves isBlocking → "guard" only if the strip exists). Hold final frame.
    guard: { frames: 2, width: 36, height: 55, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_block_uniform.png" },
    // HURT — the 4-frame strip covers stagger-INTO-knockdown as one sequence. Every hitstun/stun/
    // knockdown state routes here (no dedicated knockdown/getup strips). Hold last frame.
    hurt:  { frames: 4, width: 56, height: 32, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_hit_uniform.png" },
    // ── STAGE 1 INTRO POOL — all FOUR intro candidates, random-cycled per match (pickIntroVariant).
    intro:  { frames: 7,  width: 44, height: 58, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_intro_uniform.png" },   // arms-spread summon flare
    intro2: { frames: 4,  width: 49, height: 59, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_intro2_uniform.png" },  // confident front stance
    intro3: { frames: 12, width: 38, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_intro3_uniform.png" },  // reading the Skill Hunter book (grid flattened row-major)
    intro4: { frames: 9,  width: 33, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_intro4_uniform.png" },  // walks in holding the book
    // ── STAGE 2 NORMALS — resliced uniform (reslice_strip.mjs, alpha-gutter frame counts). Deliberately
    // plain knife/melee kit. combat.js reads DAMAGE/frames from basic_attacks; these are the SPRITES
    // (standard MOVE_TO_ACTION light/heavy/up/air/down_air). All play once + hold last frame.
    light:    { frames: 3, width: 57, height: 50, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_punch_uniform.png" },       // straight jab
    heavy:    { frames: 5, width: 59, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_kick_uniform.png" },        // committed side kick
    up:       { frames: 4, width: 43, height: 61, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_upattack_uniform.png" },    // launcher: rising knife slash
    // Aerial slash sheet (crescent-arc FX). Reused for BOTH air (neutral aerial) and down_air (dive
    // spike) — no dedicated 2nd air file (Netero/Goku-Black reuse precedent).
    air:      { frames: 7, width: 62, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_downattack_uniform.png" },
    down_air: { frames: 7, width: 62, height: 74, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_downattack_uniform.png" },
    // ── STAGE 2 COMMAND CHAIN — Toji-Rekka "Blade Rush": Fwd+Heavy opens chCombo1 (rushing punch
    // string) → re-tap Heavy during recovery, cancel-on-HIT → chComboFin (extended side-kick launcher,
    // string ends). Real chain logic lives in abilities.js CHROLLO_CMD + updateChrolloCommandCombat.
    // Identity-mapped in sprite.js. The two overflow combo sheets (punch_combo / sidekick_combo).
    chCombo1:   { frames: 9, width: 58, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_punchcombo_uniform.png" },     // rushing punch string opener
    chComboFin: { frames: 9, width: 78, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_sidekickcombo_uniform.png" },  // extended side-kick launcher finisher
    // ── STAGE 3 SPECIALS (real UNEXTRACTED master-sheet art surfaced in the Stage-3 close pass). Cast
    // poses/attack sprites; the logic lives in abilities.js executeChrolloSpecial. Identity-mapped.
    // NEN BOLT cast = the forward blue-orb thrust (specialmove_part2 resliced). The traveling projectile
    // FX is the blue nen construct (chrollo_nenbeast_uniform.png) rendered by ui.drawProjectiles, NOT here.
    chNenCast:   { frames: 4, width: 50, height: 57, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_nencast_uniform.png" },
    // BLADE LUNGE = the forward knife-thrust lunge (5f, band-3 master-sheet art). A committed stab.
    chBladeLunge: { frames: 5, width: 70, height: 88, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_knifethrust_uniform.png" },
    // ── STAGE 5 SKILL HUNTER transformation CAST (freeze-cinematic pose). Concatenation of ultimate_1
    // (book windup) → ultimate_2 (purple robe rises/wraps) → ultimate_3 (robe envelops → emerge) = the
    // "robe thing". Held via _spriteCastMove while chrolloSkillHunterCinematic plays; at the swap beat
    // applySkillHunter turns Chrollo into a full copy of the opponent (rosterKey/animationData/etc swap).
    chSkillHunterCast: { frames: 17, width: 84, height: 58, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./chrollo_skillhunter_cast_uniform.png" }
  },
  introPool: ["intro", "intro2", "intro3", "intro4"]
}

// ─────────────────────────────────────────────────────────────────
// DRAGON BALL — GOKU BLACK / SSJ ROSE  (SEPARATE roster character, own kit)
// STAGE 1 build: core identity (idle/walk/run/dash/jump/fall/hurt/get-up/block)
// + 4 basic normals (light/up/air/down_air). Verified via harness/goku_black.test.mjs.
// DEFERRED to later stages (see GOKU_BLACK_ASSET_MAP.md): Ki Slash (the energy-costing
// HEAVY), the SSJ Rose continuous-drain transformation, and all 4 specials
// (Kamehameha / Spirit Bomb / Explosion / Sword Slash).
// ─────────────────────────────────────────────────────────────────
const gokuBlack = {
  rosterKey: "goku_black", name: "Goku Black", universe: "dragon_ball",
  portrait: "./goku_black_mug_shot.png",   // EXACT on-disk filename (SSJ Rose character-select mugshot)
  archetypes: ["melee", "transformations"],
  primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  // Balanced all-rounder (mirrors Goku's clean, no-gimmick profile) — but his OWN separate kit.
  stats: { maxHealth: 1200, maxEnergy: 200, attack: 90, defense: 86, speed: 90, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 42 },
  // STAGE 2 normals. HEAVY = "Ki Slash" — his ONE energy-costing normal (10 EN, deducted in
  // combat.js updatePlayerCombat for goku_black only; if broke, K whiffs). Uses the ki_slash sheet.
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0,  rangeX: 66, rangeY: 50 },        // front_attack straight
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1,  rangeX: 78, rangeY: 52 },        // KI SLASH (ki_slash sheet) — costs 10 EN
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -32, selfVy: -9 },   // Up-Attack launcher (rising spin) — BALANCED archetype (Gojo ref)
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },                                 // air_attack downward slash
    downAir:   { type: "spike", damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },                  // air_attack reused (base down-air GAP, asset map §3.5)
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // KIT/HUD METADATA ONLY — behaviour is wired in later stages (see GOKU_BLACK_ASSET_MAP.md).
  // No executeGokuBlackSpecial/Ultimate handler exists yet, so triggerSpecial/triggerUltimate
  // no-op for this character (abilities.js switch has no "goku_black" case). Declared so the
  // character-select kit panel has data and nothing assumes `.specials` is undefined.
  specials: {
    kamehameha: { cost: 30,  effect: "STAGE 3+: charge/release beam (own move). Not wired yet." },
    spiritBomb: { cost: 40,  effect: "STAGE 3+: charge/release lob (own move). Not wired yet." },
    explosion:  { cost: 120, effect: "STAGE 3+: proximity AOE (Rick mirror), art pending. Not wired yet." }
  },
  ultimate: { name: "Sword Slash", cost: 40, effect: "STAGE 3+: sure-hit with real windup risk. Not wired yet." },
  // TRANSFORMATION — base → Super Saiyan Rose. A SELF-CONTAINED sustained transform managed in
  // abilities.js (enterSSJRose / revertSSJRose / applyGokuBlackFormSystem) — NOT the generic
  // transformations.js flow — because it is threshold-gated (no entry cost) with a continuous per-frame
  // drain + instant auto-revert, and enters via a grand frozen cinematic (ssjRoseCinematic). So
  // transformationOrder stays ["base"]; currentForm is set to "ssjRose" for the HUD. (The base→SSG→
  // Rose→Blue recolor pilot was removed 2026-08-01 — shelved.)
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // Intro plays the grounded IDLE (Rick precedent), avoiding the 128² NULL-box intro fallback.
  introPool: ["idle"],
  hasSprites: true,
  // 1.7: idle content ~69px cell × 1.7 ≈ 117px on-screen — squarely in roster range
  // (Sasuke 116 / Naruto 118 / Gojo 112). anchorY values start at 0 and are screenshot-tuned.
  spriteScale: 1.7,
  animationData: {
    idle:      { frames: 4, width: 31, height: 68, speed: 6, anchorY: 0, sheet: "./black_goku_idle.png" },        // RE-SLICED: variant A (arms-down sway), content-centered + feet-aligned (was a drifting/jittery uniform slice of the 2-variant sheet; variant B fists-up frames dropped)
    walk:      { frames: 4, width: 66, height: 55, speed: 5, anchorY: 0, sheet: "./black_goku_run.png" },
    run:       { frames: 4, width: 66, height: 55, speed: 4, anchorY: 0, sheet: "./black_goku_run.png" },
    dash:      { frames: 2, width: 88, height: 47, speed: 5, anchorY: 0, sheet: "./black_goku_dash.png" },
    jump:      { frames: 6, width: 69, height: 73, speed: 6, anchorY: 0, sheet: "./black_goku_jump.png" },
    fall:      { frames: 5, width: 50, height: 71, speed: 6, anchorY: 0, sheet: "./black_goku_jump_2.png" },       // descent-only poses (asset map §3.2)
    hurt:      { frames: 7, width: 69, height: 71, speed: 6, anchorY: 0, sheet: "./black_goku_hit.png" },        // flinch on hitstun (RE-SLICED uniform)
    knockdown: { frames: 7, width: 69, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./black_goku_hit.png" },     // FALL→sprawled on a strong-hit knockdown (same sheet, plays through)
    getup:     { frames: 6, width: 69, height: 59, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./black_goku_get_up.png" },  // RISE — chains after the knockdown fall (RE-SLICED)
    guard:     { frames: 3, width: 52, height: 61, speed: 6, anchorY: 0, sheet: "./black_goku_block.png" },
    light:     { frames: 6, width: 65, height: 54, speed: 3, anchorY: 0, sheet: "./black_goku_front_attack.png" },  // RE-SLICED uniform (wide punch frames no longer left-clipped)
    heavy:     { frames: 8, width: 112, height: 69, speed: 2, anchorY: 0, sheet: "./black_goku_ki_slash.png" },     // KI SLASH (energy-costing heavy), RE-SLICED uniform
    up:        { frames: 9, width: 65, height: 56, speed: 3, anchorY: 0, sheet: "./black_goku_kick_attack.png" },   // RE-SLICED uniform (spin-kick arc frames no longer clipped)
    air:       { frames: 5, width: 56, height: 66, speed: 4, anchorY: 0, sheet: "./black_goku_air_attack.png" },    // RE-SLICED uniform (slash-arc frames no longer clipped)
    down_air:  { frames: 5, width: 56, height: 66, speed: 4, anchorY: 0, sheet: "./black_goku_air_attack.png" },    // reuses air_attack (base down-air GAP)
    // TAUNT (10s Down-hold reward flourish, universal mechanic — game.js updateTauntState). Repurposes
    // the otherwise-unused black_goku_base_attack sheet (a confident battle-ready stance) so Goku Black
    // gets the taunt-heal like Rick. 4×53 uniform (alpha-gutter-verified). speed 27 → 4×27 = 108-frame
    // committed window, matching Rick's risk/reward. Rose form has its OWN taunt in SSJ_ROSE_ANIM (must
    // exist there too — getAction(skinAnim) has no base fallback → a missing key = 128² FALLBACK box).
    taunt:     { frames: 4, width: 53, height: 65, speed: 27, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./black_goku_base_attack.png" },
    // SSJ ROSE transform-morph sequence (played as a brief cast pose via _spriteCastMove="transform").
    transform: { frames: 8, width: 36, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./black_goku_transformation_to_ssj_rose.png" },
    // CHARGE (hold P) — BASE aura. Two-part: buildup frames 0-1 (bracing, no aura) play ONCE, then
    // frames 2-5 (spiky aura pulsing) LOOP while P is held (loopStart=2). Rose variant lives in
    // SSJ_ROSE_ANIM (form-aware via _skinAnim). RE-SLICED uniform from black_goku_power_up.png (6 frames).
    charge:    { frames: 6, width: 112, height: 104, speed: 8, anchorY: 0, loop: true, loopStart: 2, sheet: "./black_goku_power_up_uniform.png" },
    // Special CHARGE→RELEASE cast poses (Stage 3a) — BASE variants (Rose variants live in abilities.js
    // SSJ_ROSE_ANIM; _skinAnim makes the pose form-aware automatically). RE-SLICED uniform.
    gbKamehameha: { frames: 10, width: 95, height: 53, speed: 4, anchorY: 0, sheet: "./black_goku_kamehameha.png" },
    gbSpiritBomb: { frames: 6,  width: 53, height: 66, speed: 5, anchorY: 0, sheet: "./black_goku_spirit_bomb.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// BEERUS — God of Destruction (Dragon Ball). Brand-new single-form sprite
// character (no transformations). Glass-cannon striker: top-tier attack/speed,
// bottom-tier HP/defense. All sheets RE-SLICED to uniform content-cropped cells
// (feet bottom-aligned) via tools; raw rips were non-uniform (see beerus_*_u.png).
// 5-part fixed-order intro (star flash → energy pillar → mane-whip settle →
// robed turn → walk-in) via introSequence, handing off to idle.
// ─────────────────────────────────────────────────────────────────
const beerus = {
  rosterKey: "beerus", name: "Beerus", universe: "dragon_ball",
  portrait: "./beerus_mugshot.png",   // EXACT on-disk filename (character-select mugshot / HUD nameplate) — same role as vegeta_mugshot.png; skins.js + ui.js both read characters.beerus.portrait
  archetypes: ["rushdown", "striker", "zoner"],
  primary: "rushdown", secondary: ["striker", "zoner"],
  traits: { hasEnergy: true, energyType: "god_ki", mobility: "high", scaling: "glass_cannon", animeMovement: true },
  energyConfig: { label: "God Ki", color: "#b24cf0", glowColor: "#e0a0ff", emptyColor: "rgba(255,255,255,0.08)" },
  // GLASS CANNON: highest-tier attack (97, ties top strikers) + speed (95, near top),
  // bottom-tier HP (1000, ties Evil Morty floor) + defense (78). A precise, fast striker
  // that hits hard but folds under pressure — the God of Destruction archetype.
  stats: { maxHealth: 1000, maxEnergy: 170, attack: 97, defense: 78, speed: 95, maxJumps: 2, jumpPower: 32, dashSpeed: 19, dashDuration: 9, dashCooldownMax: 34 },
  // Glass-cannon normals: lean to the faster/lighter end of the roster spread, high damage.
  basic_attacks: {
    light:     { damage: 46, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0,  rangeX: 60, rangeY: 46 },   // foward_attack jab
    heavy:     { damage: 88, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1,  rangeX: 72, rangeY: 50 },   // foward_attack_2, pink aura ribbon
    upAttack:  { type: "launcher", damage: 68, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -30, selfVy: -8 }, // Up-Attack launcher (yellow crescent) — FAST/GLASS-CANNON archetype (Maki ref); low HP+DEF, high atk/spd
    airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },   // kick
    downAir:   { damage: 78, startup: 8, active: 4, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 9 },    // side_kick spike, purple energy slash
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // Specials/ultimate data + behaviour wired in Stages 3-4 (abilities.js). Placeholder
  // meter tier here keeps the kit/HUD panel valid; real numbers land with the moves.
  specials: {},
  ultimate: { name: "Ki Ball", cost: 150, description: "3-stage charge/release/impact cinematic — the largest move in the kit (Stage 4)." },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  // FIXED-ORDER 5-part intro (plays in file order, then holds → idle). Each key below
  // is a real animationData action; game.js initIntroVariant/advanceIntroSequence walk them.
  introSequence: ["intro1", "intro2", "intro3", "intro4", "intro5"],
  // CINEMATIC DELAYED REVEAL: hold the fighter draw INVISIBLE for `hide` frames (empty stage — also
  // suppresses the 1-frame pre-sprite placeholder box), then fade it in over `fade` frames, so Beerus
  // MATERIALISES out of the intro star/pillar effects instead of already standing there. Generic +
  // opt-in (renderHybridFighter reads this field) → zero effect on any character without it. ~0.17s
  // empty beat + ~0.2s fade adds no real match-start delay.
  introReveal: { hide: 10, fade: 12 },
  hasSprites: true,
  // SIZE-NORMALIZED (2026-07-24): was 1.7 (idle content ~59px × 1.7 ≈ 100px — bottom of the
  // roster, −9% vs median ≈111). Bumped to 1.85 → ≈109px, into the main band. anchorY is 0 on
  // every action → feet stay planted (plant is cell-bottom→hitbox-bottom, scale-invariant).
  spriteScale: 2.12,   // HEIGHT-REF: canon ~200cm (God of Destruction — reads as NOTABLY larger-than-human, not average height; the brief 175cm figure was corrected back up 2026-08-03) → target ~125px (0.623×200). Reverts the earlier 1.849@175cm change. See HEIGHT_REFERENCE.md §6; all anchorY are 0 so unchanged.
  animationData: {
    // ── movement / state ──────────────────────────────────────────────
    idle:   { frames: 4,  width: 31,  height: 62,  speed: 7, anchorY: 0, sheet: "./beerus_idle_u.png" },
    // run is a horizontal FLYING dash (frames 1-5 of raw sheet); frames 6-7 (big purple
    // energy-wing burst) split off into `dash`. walk reuses the run cycle, slower.
    walk:   { frames: 5,  width: 73,  height: 64,  speed: 8, anchorY: 0, sheet: "./beerus_run_u.png" },
    run:    { frames: 5,  width: 73,  height: 64,  speed: 5, anchorY: 0, sheet: "./beerus_run_u.png" },
    dash:   { frames: 2,  width: 95,  height: 86,  speed: 5, anchorY: 0, sheet: "./beerus_dash_u.png" },
    jump:   { frames: 6,  width: 50,  height: 64,  speed: 6, anchorY: 0, sheet: "./beerus_jump_u.png" },
    fall:   { frames: 6,  width: 50,  height: 64,  speed: 6, anchorY: 0, sheet: "./beerus_jump_u.png" },   // reuse jump arc
    // guard builds a purple spiral ring (frames 3-6) that closes into a full ring by frame 6;
    // play once and HOLD frame 6 while blocking — the closed ring is the guard effect.
    guard:  { frames: 6,  width: 72,  height: 62,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_block_u.png" },
    hurt:   { frames: 12, width: 65,  height: 57,  speed: 5, anchorY: 0, sheet: "./beerus_hit_u.png" },
    // generic hold-to-charge power-up: buildup once (0-3) then flicker/loop the aura tail (4-7).
    charge: { frames: 8,  width: 79,  height: 76,  speed: 6, anchorY: 0, loop: true, loopStart: 4, sheet: "./beerus_charge_u.png" },
    // ── 5-part intro (fixed order) ────────────────────────────────────
    intro1: { frames: 5,  width: 119, height: 101, speed: 4,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_intro_1_u.png" },  // star-sparkle flash
    intro2: { frames: 7,  width: 143, height: 313, speed: 5,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_intro_2_u.png" },  // energy pillar erupting up
    intro3: { frames: 2,  width: 213, height: 308, speed: 11, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_intro_3_u.png" },  // mane-whip + settle (centerpiece)
    intro4: { frames: 9,  width: 59,  height: 72,  speed: 5,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_intro_4_u.png" },  // robed turn/shine
    intro5: { frames: 4,  width: 31,  height: 62,  speed: 6,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_intro_5_u.png" },  // walk-in → idle handoff
    // ── normals (art ready; damage/frames wired via basic_attacks) ────
    light:    { frames: 4, width: 61,  height: 62, speed: 4, anchorY: 0, sheet: "./beerus_foward_attack_u.png" },
    heavy:    { frames: 5, width: 55,  height: 56, speed: 6, anchorY: 0, sheet: "./beerus_foward_attack_2_u.png" },   // pink aura ribbon baked in
    up:       { frames: 5, width: 72,  height: 62, speed: 5, anchorY: 0, sheet: "./beerus_up_attack_u.png" },         // yellow crescent launcher
    air:      { frames: 5, width: 45,  height: 59, speed: 4, anchorY: 0, sheet: "./beerus_kick_u.png" },
    down_air: { frames: 5, width: 131, height: 53, speed: 5, anchorY: 0, sheet: "./beerus_side_kick_u.png" },         // purple energy-slash spike
    // ── special CAST poses (Stage 3) — resolved via _spriteCastMove (raw key === action key).
    //    Projectile/effect art (rings, geysers, orbs, hakai field) lives in abilities.js spawnProjectile,
    //    NOT here — the two mixed sheets were sliced into SEPARATE char-cast vs projectile assets.
    kiBlastCast: { frames: 7, width: 71,  height: 63,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_ki_blast_u.png" },          // Ki Blast wind-up + throw
    downKiBlast: { frames: 8, width: 123, height: 120, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_downward_ki_blast_u.png" },  // Downward Ki Blast dive
    outward:     { frames: 5, width: 254, height: 142, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_outward_u.png" },            // Outward Ki Blast self-nova (body+rays)
    pushCast:    { frames: 2, width: 47,  height: 58,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_push_cast_u.png" },          // Forward Push shove pose
    hakai:       { frames: 1, width: 47,  height: 62,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_hakai_u.png" },              // Hakai held static point pose
    // Ki Ball ULTIMATE cast pose (Stage 4) — held through the freeze cinematic; the orb itself is
    // drawn by beerusKiBallCinematic.js, not in this sheet. speed 7 → 11f spans the ~84f CHARGE phase.
    kiBall:      { frames: 11, width: 85, height: 61,  speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./beerus_ki_ball_u.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// SAIKI KUSUO  (The Disastrous Life of Saiki K.) — psychic ZONER.
// New universe "saiki_k", rosterKey `saiki` (lowercase — getAction() lowercases
// the key; a camelCase key silently renders the 128² box). All sheets RE-SLICED
// to clean uniform, feet-aligned cells (tools/reslice_strip.mjs) — the raw rips
// were non-uniform with dithered "dissolve" debris (the intro/teleport pixel
// transition), which the reslicer's alpha-gutter framing + --minw debris filter
// cleaned. No transformations block (Itachi/Netero parity — a vestigial base-form
// transform would let updateTransformations() stomp any future form multiplier).
// Kit is projectile-heavy: 5 normals, a 4-hit rekka projectile string (Fwd+Heavy),
// a free Basic Burst poke (Fwd+Light), the Lightning special, and the Giant Bomb
// ultimate — behaviour wired in abilities.js across later stages; the cast-pose
// animationData for those lives here so currentMove/_spriteCastMove never falls to
// the box. Portrait wired: saiki_k_mug_shot.png (character-select mugshot / HUD
// nameplate; skins.js + ui.js read characters.saiki.portrait).
// ─────────────────────────────────────────────────────────────────
const saiki = {
  rosterKey: "saiki", name: "Saiki Kusuo", universe: "saiki_k", color: "#ff6ba3",
  portrait: "./saiki_k_mug_shot.png",   // EXACT on-disk filename — character-select mugshot / HUD nameplate; same role as vegeta_mugshot.png / issac_netero_mugshot.png; skins.js + ui.js both read characters.saiki.portrait
  archetypes: ["zoner", "speed"], primary: "zoner", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "psi", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Psychokinesis", effect: "Overwhelming psychic zoning — controls space with layered projectiles" },
  // Zoner profile (Rick-adjacent): healthy meter for a projectile-spam kit, moderate
  // attack/defence, high speed. Not a glass cannon — his damage lives on the projectiles.
  stats: { maxHealth: 1050, maxEnergy: 180, attack: 84, defense: 84, speed: 90, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  // STAGE 1 normals. light = front_attack rush + palm strike; heavy = the diagonal upward
  // blade-swipe (frames 3-4 of the down_air/up two-move sheet, re-sliced standalone); up =
  // rising charged-fist launcher (feeds the juggle system); air = front_attack reused (no
  // dedicated air file — project reuse precedent); down_air = the ~360° spinning kick (frames
  // 1-2 of the same split sheet). combat.js _getMD reads THIS block.
  basic_attacks: {
    light:     { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0,  rangeX: 64, rangeY: 50 },
    heavy:     { damage: 82, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1,  rangeX: 76, rangeY: 52 },
    upAttack:  { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { type: "spike", damage: 76, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  // SPECIALS/ULTIMATE — HUD/kit metadata. Behaviour is wired in abilities.js:
  //   Lightning  → executeSaikiSpecial (Special button; layered top/bottom bolt projectile)
  //   Giant Bomb → executeSaikiUltimate (Ultimate button; delayed screen-filling explosion)
  // The 4-hit rekka projectile string (Fwd+Heavy) + Basic Burst poke (Fwd+Light) are command
  // normals driven by updateSaikiCommandCombat — not metered specials, so not listed here.
  specials: {
    lightning: { cost: 30, effect: "Lightning — two layered bolts (top/bottom for thickness) fired as one projectile." }
  },
  ultimate: { name: "Giant Bomb Throw", cost: 150, effect: "Hurl a psychic bomb — a delayed, screen-filling shockwave explosion." },
  hasSprites: true,
  // idle content 52px × 2.2 ≈ 114px on-screen ≈ roster height (Sasuke 116 / Gojo 112). REQUIRES the
  // skins.js `saiki` default skin (else applySkin() pulls spriteScale:1 → half size) + the
  // spritesheets.js SPRITE_MANIFEST idle gate. The reslicer bottom-aligns every frame so feet line up
  // across sheets → anchorY ≈ 0 everywhere.
  spriteScale: 2.2,
  animationData: {
    idle: { frames: 4, width: 25, height: 52, speed: 6, anchorY: 0, sheet: "./saiki_idle_u.png" },
    // No dedicated walk art — reuse the run strip (Beerus/Netero precedent: walk & run share one sheet).
    walk: { frames: 6, width: 44, height: 51, speed: 5, anchorY: 0, sheet: "./saiki_run_u.png" },
    run:  { frames: 6, width: 44, height: 51, speed: 4, anchorY: 0, sheet: "./saiki_run_u.png" },
    dash: { frames: 6, width: 44, height: 51, speed: 3, anchorY: 0, sheet: "./saiki_run_u.png" },
    // jump.png = crouch→rise→apex→descend→land arc. Split Naruto/Sasuke-style: jump = rise (cells 0-3,
    // sourceX 0), fall = descent (cells 4-7, sourceX 4×37=148). Play once + hold last frame.
    jump: { frames: 4, width: 37, height: 57, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_jump_u.png" },
    fall: { frames: 4, width: 37, height: 57, speed: 6, anchorY: 0, sourceX: 148, loop: false, lockLastFrame: true, sheet: "./saiki_jump_u.png" },
    // HURT — the 7-frame hit strip covers stagger-INTO-knockdown as one sequence (per the design). Every
    // hitstun/stun/knockdown state routes here (no dedicated knockdown/getup strips) → legacy path. Hold last.
    hurt: { frames: 7, width: 52, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_hit_u.png" },
    // ── STAGE 1 NORMALS (speed ≈ move duration / frames so the swing reads across the active window).
    light:    { frames: 5, width: 53, height: 52, speed: 4,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_light_u.png" },   // front_attack rush + palm
    heavy:    { frames: 2, width: 46, height: 49, speed: 10, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_heavy_u.png" },   // diagonal blade-swipe (split half)
    up:       { frames: 7, width: 45, height: 56, speed: 4,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_up_u.png" },      // launcher: rising charged fist
    air:      { frames: 5, width: 53, height: 52, speed: 4,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_light_u.png" },   // reuses front_attack (no air file)
    down_air: { frames: 2, width: 29, height: 51, speed: 10, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_downair_u.png" }, // ~360° spinning kick (split half)
    // ── ENTRANCE (introSequence ["teleport","intro"]): teleport dissolve-in → walk-in, one continuous
    // sequence per the confirmed teleport→intro adjacency. Debris-filtered to clean frames (--minw=5;
    // the raw 1px dithered columns were the pixel-dissolve, kept baked in the teleport frames themselves).
    teleport: { frames: 4, width: 21, height: 52, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_teleport_u.png" },
    intro:    { frames: 7, width: 26, height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_intro_u.png" },
    // ── STAGE 2 rekka cast poses (projectile_attack_1/2/3 → special_projetile finisher). Each drives its
    // step's sprite via currentMove; the traveling bolt is a separate projectile (abilities.js).
    saikiChain1:   { frames: 4, width: 26, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_chain1_u.png" },
    saikiChain2:   { frames: 4, width: 30, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_chain2_u.png" },
    saikiChain3:   { frames: 4, width: 30, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_chain3_u.png" },
    saikiChainFin: { frames: 6, width: 44, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_chainfin_u.png" },
    // ── STAGE 3 Basic Burst cast (1f) + STAGE 4 Lightning channel (3f) + STAGE 5 Giant Bomb throw (8f).
    saikiBurst:     { frames: 1, width: 32, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_burst_cast_u.png" },
    saikiLightning: { frames: 3, width: 42, height: 50, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_lightning_cast_u.png" },
    saikiBomb:      { frames: 8, width: 41, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saiki_bomb_cast_u.png" }
  },
  // Two-part fixed-order entrance (teleport dissolve → walk-in), played back-to-back by game.js
  // initIntroVariant/advanceIntroSequence, then holds the walk-in's last frame → idle. Win/lose reuse
  // the shared end-match screens; no getup strip → knockdown routes to `hurt` (legacy path).
  introSequence: ["teleport", "intro"]
}

// ─────────────────────────────────────────────────────────────────
// HUNTER x HUNTER — Killua Zoldyck (13th sprite char, 2nd HxH after Netero)
// STAGE 1: registration + movement/state only. Fast technical-assassin archetype:
// top-tier speed, moderate-low raw damage, built for combo pressure (Stage 2 chain).
// Source art = ~40 separate per-action JUS PNGs (killua_*.png), NOT one atlas sheet —
// same per-action `.sheet` pattern as Itachi/Netero/Saiki. The non-uniform source
// strips were RE-SLICED into clean uniform cells (harness/reslice.mjs → *_uniform.png)
// so the engine slices by a single pitch without horizontal jitter.
// GODSPEED (ultimate) = OVERLAY path, decided in Stage 1 (see KILLUA_ASSET_MAP.md):
// NO dedicated Godspeed alternate-form move-set exists in the batch — only base poses
// plus electric-aura FX frames (killua_charge_animation_*, killua_teleport_attack_*).
// So Godspeed (Stage 5) = global speed/damage buff + afterimage/electric overlay on
// base animations (Itachi-Mangekyou tier), NOT a Netero/Susanoo alternate-form swap.
// Yo-yo throw/retract special (Stage 3) + electric specials (Stage 4) land later.
// Missing actions (walk/dash reuse existing strips) fall back to idle safely.
// ─────────────────────────────────────────────────────────────────
const killua = {
  rosterKey: "killua", name: "Killua Zoldyck", universe: "hunter_x_hunter", color: "#7dd3fc",
  portrait: "./killua_portrait.png",   // no dedicated mugshot in the batch → a single clean idle pose CROPPED from killua_intro.png (island #0) into a proper portrait (harness/cropone one-off). Flagged as a stand-in until real mugshot art is sourced.
  archetypes: ["speed", "assassin"],
  primary: "speed", secondary: ["assassin"],
  // Base Killua uses a normal dash. The blink/teleport identity is reserved for the
  // Godspeed ultimate (Stage 5) so the form actually changes how he moves.
  traits: { hasEnergy: true, energyType: "nen", mobility: "very_high", scaling: "burst", animeMovement: true },
  // Fast technical assassin: speed 95 (top of roster, tied w/ Beerus-tier), attack 84 and
  // defense 78 sit BELOW the melee bruisers (Itachi 90/85, Beerus 97/78) — low per-hit,
  // high combo count. maxHealth 1030 slightly under the 1050 fragile-rushdown band.
  // maxEnergy 180 = Nen pool (shared "Nen" HUD label with Netero; no new label needed).
  stats: { maxHealth: 1030, maxEnergy: 180, attack: 84, defense: 78, speed: 95, maxJumps: 2, jumpPower: 33, dashSpeed: 19, dashDuration: 10, dashCooldownMax: 34 },
  // Placeholder assassin taijutsu — fast, low-damage, low-knockback (combo-friendly). Real
  // normals + the command-normal chain land in Stage 2. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 38, startup: 3, active: 3, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 78, startup: 7, active: 4, recovery: 16, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); Godspeed assassin
    airAttack:{ damage: 50, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 70, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // HUD-only until Stage 5 (real logic + cost live in abilities.js). Overlay-tier ultimate.
  ultimate: { name: "Godspeed", cost: 100, description: "Kanmuru — Godspeed. Nen-lightning reflex mode: massive speed + damage boost with an electric afterimage overlay while active." },
  hasSprites: true,
  // idle content 48px × 2.1 ≈ 101px on-screen (lean teen, a touch under the ~112 adults).
  // REQUIRES the skins.js `killua` entry (else applySkin() pulls the spriteScale:1 fallback
  // → native ~half size) + the spritesheets.js SPRITE_MANIFEST idle gate.
  // SIZE-NORMALIZED (2026-07-24): was 2.1 (idle content ~48px × 2.1 ≈ 101px — bottom of the roster,
  // −9% vs median ≈111). Bumped to 2.3 → 48px × 2.3 ≈ 110px, into the main band. anchorY =
  // -(bottom transparent gap × 2.3) plants feet — every anchorY below re-scaled ×(2.3/2.1); 15 shifted.
  spriteScale: 2.06,   // HEIGHT-REF: canon 158cm (age-12 kid) → target ~98px (was 2.3). See HEIGHT_REFERENCE.md; anchorY below rescaled ×(2.06/2.3).
  animationData: {
    // ── MOVEMENT / STATE (Stage 1). All re-sliced to uniform cells (reslice.mjs). ──
    idle:  { frames: 2, width: 27, height: 53, speed: 8, anchorY: -6, sourceY: 0,  sheet: "./killua_atlas.png" },   // content 48, botGap 3
    // No dedicated walk strip — reuse the run strip a touch slower (dash reuses it faster).
    walk:  { frames: 8, width: 52, height: 48, speed: 6, anchorY: -2, sourceY: 53,  sheet: "./killua_atlas.png" },
    run:   { frames: 8, width: 52, height: 48, speed: 4, anchorY: -2, sourceY: 53,  sheet: "./killua_atlas.png" },    // content 44 (forward lean)
    dash:  { frames: 8, width: 52, height: 48, speed: 3, anchorY: -2, sourceY: 53,  sheet: "./killua_atlas.png" },
    // No dedicated jump art in the batch → the 3-pose dodge strip (crouch→extend→recover)
    // reads as a leap arc: play once, hold the last frame. fall = that last cell.
    jump:  { frames: 3, width: 41, height: 63, speed: 6, anchorY: -10, loop: false, lockLastFrame: true, sourceY: 101, sheet: "./killua_atlas.png" },
    fall:  { frames: 1, width: 41, height: 63, speed: 6, anchorY: -10, sourceX: 82, loop: false, lockLastFrame: true, sourceY: 101, sheet: "./killua_atlas.png" },
    // GUARD — dedicated 2-frame block pose (killua_block.png). Resolved by sprite.js when
    // isBlocking && !attacking (else idle). Plays once, holds.
    guard: { frames: 2, width: 37, height: 58, speed: 8, anchorY: -10, loop: false, lockLastFrame: true, sourceY: 164, sheet: "./killua_atlas.png" },
    // HURT — Killua HAS a real 4-frame hit-reaction strip (electric knockback tumble),
    // unlike Itachi (who borrowed a brace pose). Every hitstun/stun state routes here.
    hurt:  { frames: 4, width: 58, height: 44, speed: 6, anchorY: -10, loop: false, lockLastFrame: true, sourceY: 222, sheet: "./killua_atlas.png" },
    // ── STAGE 2 NORMALS (5 slots). All re-sliced to uniform cells (reslice.mjs); frame counts
    // measured. speed ≈ move-duration / frames so the swing reads across the active window.
    // anchorY = -(bottom transparent gap × 2.1) plants feet. Assassin pacing: fast, low commit.
    light:    { frames: 9, width: 43, height: 51, speed: 2, anchorY: -4,  loop: false, lockLastFrame: true, sourceY: 266, sheet: "./killua_atlas.png" },     // rapid punch flurry (foward_punch)
    heavy:    { frames: 7, width: 57, height: 48, speed: 3, anchorY: -2,  loop: false, lockLastFrame: true, sourceY: 317, sheet: "./killua_atlas.png" },     // committed roundhouse (foward_kick)
    up:       { frames: 5, width: 47, height: 60, speed: 3, anchorY: -14, loop: false, lockLastFrame: true, sourceY: 365, sheet: "./killua_atlas.png" },        // launcher: rising kick (up_kick)
    air:      { frames: 5, width: 47, height: 52, speed: 3, anchorY: -6,  loop: false, lockLastFrame: true, sourceY: 425, sheet: "./killua_atlas.png" },        // neutral aerial side kick (side_kick)
    down_air: { frames: 5, width: 49, height: 66, speed: 3, anchorY: -21, loop: false, lockLastFrame: true, sourceY: 477, sheet: "./killua_atlas.png" },    // downward dive (down_air_attack)
    // ── STAGE 2 COMMAND-NORMAL CHAIN — the Barrage (Down+Heavy rekka, cancel-on-hit). Killua's
    // signature rapid-punch flurry: 4 sequential parts → 4-hit cancelable string (Netero rekka
    // architecture). Fired from abilities.js updateKilluaCommandCombat; currentMove = barrageN
    // resolves the sheet via sprite.js identity fallback. Each part plays fast (speed 2).
    barrage1: { frames: 4, width: 79, height: 57, speed: 2, anchorY: -11, loop: false, lockLastFrame: true, sourceY: 543, sheet: "./killua_atlas.png" },
    barrage2: { frames: 4, width: 75, height: 69, speed: 2, anchorY: -13, loop: false, lockLastFrame: true, sourceY: 600, sheet: "./killua_atlas.png" },
    barrage3: { frames: 4, width: 79, height: 55, speed: 2, anchorY: -11, loop: false, lockLastFrame: true, sourceY: 669, sheet: "./killua_atlas.png" },
    barrage4: { frames: 4, width: 75, height: 58, speed: 2, anchorY: -6,  loop: false, lockLastFrame: true, sourceY: 724, sheet: "./killua_atlas.png" },   // finisher (launches)
    // ── STAGE 3: Yo-Yo throw CAST pose (electric_yoyo_trow_part_1 resliced). Played via
    // _spriteCastMove (identity sprite-resolve) while the yo-yo boomerang projectile flies;
    // the yo-yo itself is a separate spinning projectile sheet (killua_yoyo_fx.png). See
    // abilities.js executeKilluaSpecial. botGap 0 → anchorY 0.
    yoyoThrow: { frames: 4, width: 54, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sourceY: 782, sheet: "./killua_atlas.png" },
    // ── STAGE 4: electric special CAST poses (played via _spriteCastMove). ──
    // Lightning Palm (Fwd+Special) — point-blank electric burst (electric_push). The hitbox is a
    // melee-range createAttackFromMove; the pose sells the palm-thrust + electric arc.
    lightningPalm: { frames: 11, width: 55, height: 62, speed: 2, anchorY: -6,  loop: false, lockLastFrame: true, sourceY: 840, sheet: "./killua_atlas.png" },
    // Electric Ball (Down+Special) — charge → form → hurl a traveling electric orb (electric_ball).
    // The orb itself is a procedural glowing projectile (no dedicated clean orb frame); this is the cast.
    electricBall:  { frames: 11, width: 82, height: 75, speed: 2, anchorY: -21, loop: false, lockLastFrame: true, sourceY: 902, sheet: "./killua_atlas.png" },
    // ── STAGE 5: Godspeed ULTIMATE activation pose — the Nen-electric charge-aura buildup
    // (killua_charge_animation_part_1). Played via _spriteCastMove for the brief activation flash
    // before the sustained buff+overlay takes over. Aura extends up (tall cell); body stays normal.
    godspeedActivate: { frames: 12, width: 117, height: 91, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sourceY: 977, sheet: "./killua_atlas.png" },
    // HOLD-TO-CHARGE — Nen/energy-charging state (hold P). ONE continuous sequence = the two source
    // sheets concatenated in order (killua_charge_animation_part_1 → part_2, via concat_uniform.mjs;
    // alpha-gutter island detection, NOT even division): 12 buildup frames + 6 peak/crackle frames = 18.
    // buildup+burst (0-13) plays ONCE, then the sustained-crackle tail (14-17) loops while held
    // (loopStart, the Goku-Black two-part-charge pattern). Rendered by sprite.js when isCharging (the
    // universal hold-to-charge sets it for any maxEnergy>0 char). botGap 0 → anchorY 0.
    charge: { frames: 18, width: 149, height: 102, speed: 3, anchorY: 0, loop: true, loopStart: 14, sourceY: 1068, sheet: "./killua_atlas.png" },
    // Pre-match INTRO — Killua's iconic skateboard entrance (killua_intro_2.png resliced): rolls in on
    // the board → hops off as it flips away → lands in his stance. Plays once and HOLDS the settled
    // standing pose (frame 9) until the fight starts. botGap 4 → anchorY -8.
    intro: { frames: 10, width: 35, height: 60, speed: 4, anchorY: -8, loop: false, lockLastFrame: true, sourceY: 1170, sheet: "./killua_atlas.png" }
  },
  // Real intro art IS present (the skateboard-entrance strip), so point the intro pool at it instead
  // of the idle-hold stopgap. game.pickIntroVariant sets _introVariant="intro" → sprite.js renders it.
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// THE FLASH  (rosterKey "flash", universe "dc" — 14th sprite char, 1st DC)
// Source art = ~23 separate per-action PNGs (flash_*.png) + a master reference
// atlas (flash_transparent.png). Frame counts MEASURED via slice_scan.mjs;
// non-uniform strips RE-SLICED (reslice.mjs → *_uniform.png); the two single-pose
// run sheets COMPOSITED body-centered into flash_run_uniform.png. See FLASH_ASSET_MAP.md.
// Archetype: EXTREME-SPEED pure-melee rushdown glass-cannon — top mobility (dash),
// low per-hit / low defense, wins on combo pressure. Flash Time ultimate (Stage 4)
// reuses Killua's Godspeed cinematic + opponent-time-slow directly.
// ─────────────────────────────────────────────────────────────────
const flash = {
  rosterKey: "flash", name: "The Flash", universe: "dc", color: "#e8352a",
  portrait: "./flash_portrait.png",   // dedicated head-profile CROPPED from the atlas bottom-left (real art).
  archetypes: ["speed", "rushdown"],
  primary: "speed", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "speed_force", mobility: "very_high", scaling: "combo", animeMovement: true },
  // GLASS-CANNON SPEEDSTER. speed 99 = TOP of roster (above Toji 98) — but note ground
  // velocity is clamped at 9 in physics (speed≥100 saturates), so the speed identity is
  // carried by the highest dashSpeed in the game (26) + frequent dashes + Flash Time (Stage 4).
  // attack 80 / defense 74 are the LOWEST on the roster (deliberate: low per-hit, fragile),
  // maxHealth 1020 near the fragile-rushdown floor. maxEnergy 100 = Speed Force meter (Flash Time).
  // ALL flagged as intentional archetype outliers in the Stage-1 balance note.
  stats: { maxHealth: 1020, maxEnergy: 100, attack: 80, defense: 74, speed: 99, maxJumps: 2, jumpPower: 34, dashSpeed: 26, dashDuration: 12, dashCooldownMax: 24 },
  // Placeholder rushdown normals — very fast, low-damage, low-knockback (combo-friendly).
  // Real normals + the command-normal chain land in Stage 2. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 30, startup: 2, active: 3, recovery: 7,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 62, startup: 6, active: 4, recovery: 15, hitstun: 17, knockbackX: 6, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 50, startup: 4, active: 3, recovery: 5, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); fastest in game (SPD 99) → recovery −1
    airAttack:{ damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 60, startup: 7, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 24, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // HUD-only until Stage 4 (real logic + cost live in abilities.js). Reuses Killua's overlay-tier
  // Godspeed treatment: cinematic activation + opponent time-slow.
  ultimate: { name: "Flash Time", cost: 100, description: "Flash Time — accelerate beyond perception: Flash moves at 3× while the opponent crawls at ⅓×. He cannot block while active; his own momentum overshoots on stops." },
  hasSprites: true,
  // SIZE-NORMALIZED (2026-07-24): was 1.25 (idle content 89px × 1.25 ≈ 111px = roster median). By
  // pixel-height Flash was already average, but his idle is a forward HUNCHED running-crouch while the
  // rest of the roster stands UPRIGHT — so feet-aligned his silhouette reads noticeably SHORTER than
  // an upright fighter of equal bbox height (confirmed in-game vs Naruto). Bumped 1.25→1.35 so the
  // crouched stance reads at the upright cluster's mass: 89px × 1.35 ≈ 120px. spriteScale is purely
  // cosmetic (hurtboxes read fixed f.w/f.h, not scale) so this can't affect balance. NOTE: the clean
  // fix would be an upright idle re-pose (art work, deferred) — this scale bump is the low-risk stand-in.
  // REQUIRES the skins.js `flash` default skin (else applySkin() pulls the spriteScale:1 fallback →
  // native ~half size) + the spritesheets.js manifest idle gate. anchorY = -(botGap × 1.35) plants
  // feet — every anchorY below re-scaled ×(1.35/1.25); only 3 shift by 1px after integer rounding.
  spriteScale: 1.35,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1). Re-sliced to uniform cells (reslice.mjs); run composited. ──
    idle:  { frames: 7, width: 80,  height: 93,  speed: 8, anchorY: -1, sourceY: 0, sheet: "./flash_atlas.png" },   // botGap 1
    // No dedicated walk strip — reuse the 2-pose run cycle a touch slower (dash reuses it faster).
    walk:  { frames: 2, width: 194, height: 99, speed: 8, anchorY: -5, sourceY: 93, sheet: "./flash_atlas.png" },      // botGap 4
    run:   { frames: 2, width: 194, height: 99, speed: 5, anchorY: -5, sourceY: 93, sheet: "./flash_atlas.png" },      // sprint poses + speed-line tails (body-centered)
    dash:  { frames: 2, width: 194, height: 99, speed: 3, anchorY: -5, sourceY: 93, sheet: "./flash_atlas.png" },
    // Jump: 3-pose crouch→extend→apex. Play once, hold last frame; fall = that last cell.
    jump:  { frames: 3, width: 66, height: 104, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sourceY: 192, sheet: "./flash_atlas.png" },   // botGap 0
    fall:  { frames: 1, width: 66, height: 104, speed: 6, anchorY: 0, sourceX: 132, loop: false, lockLastFrame: true, sourceY: 192, sheet: "./flash_atlas.png" },
    // GUARD — NO dedicated block art in the batch/atlas → FALLBACK to idle frame 0 held (single
    // clean standing brace). Resolved by sprite.js when isBlocking && !attacking. FLAGGED stand-in.
    guard: { frames: 1, width: 80, height: 93, speed: 8, anchorY: -1, loop: false, lockLastFrame: true, sourceY: 0, sheet: "./flash_atlas.png" },
    // HURT — real 5-frame recoil→knockdown strip (unlike Itachi's borrowed brace). All hitstun routes here.
    hurt:  { frames: 5, width: 115, height: 104, speed: 6, anchorY: -5, loop: false, lockLastFrame: true, sourceY: 296, sheet: "./flash_atlas.png" },   // botGap 4
    // Pre-match INTRO — dedicated 8-frame entrance strip. Plays once, holds the settled stance.
    intro: { frames: 8, width: 80, height: 104, speed: 6, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 400, sheet: "./flash_atlas.png" },   // botGap 2
    // ── STAGE 2 NORMALS (5 slots). Re-sliced to uniform cells; frame counts measured. Rushdown
    // pacing: fast, low commit. anchorY = -(botGap × 1.25) plants feet (measured per strip). ──
    light:    { frames: 4, width: 114, height: 95,  speed: 3, anchorY: -4,  loop: false, lockLastFrame: true, sourceY: 504, sheet: "./flash_atlas.png" },   // fast straight-punch string (foward_punch)
    heavy:    { frames: 3, width: 116, height: 117, speed: 6, anchorY: -2,  loop: false, lockLastFrame: true, sourceY: 599, sheet: "./flash_atlas.png" },   // committed roundhouse (foward_kick_2)
    up:       { frames: 3, width: 103, height: 121, speed: 6, anchorY: -1,  loop: false, lockLastFrame: true, sourceY: 716, sheet: "./flash_atlas.png" },      // launcher: rising uppercut (upper_attack)
    air:      { frames: 4, width: 115, height: 94,  speed: 4, anchorY: -1,  loop: false, lockLastFrame: true, sourceY: 837, sheet: "./flash_atlas.png" },     // neutral aerial kick (air_kick)
    down_air: { frames: 3, width: 92,  height: 105, speed: 5, anchorY: -15, loop: false, lockLastFrame: true, sourceY: 931, sheet: "./flash_atlas.png" }, // downward dive kick (down_air_attack) — anchorY -(11.2 botGap × 1.35)
    // ── STAGE 2 COMMAND-NORMAL CHAIN — "Speed Rush" (Down+Heavy rekka, cancel-on-hit). The 2 overflow
    // melee sheets (foward_punch_2 → fowars_kick) form a 2-hit rushdown string (Toji/Killua rekka
    // architecture). Fired from abilities.js updateFlashCommandCombat; currentMove = rushN resolves the
    // sheet via sprite.js identity fallback. 2 stages = the honest count of overflow art (extend if more arrives).
    rush1: { frames: 3, width: 130, height: 105, speed: 3, anchorY: -5, loop: false, lockLastFrame: true, sourceY: 1036, sheet: "./flash_atlas.png" },   // opener (pinning straight)
    rush2: { frames: 2, width: 113, height: 107, speed: 3, anchorY: -9, loop: false, lockLastFrame: true, sourceY: 1141, sheet: "./flash_atlas.png" },   // finisher (side kick, launches) — anchorY ×(1.35/1.25)
    // ── STAGE 3 SPECIALS (melee-range multi-hit whirls; both loop while active). currentMove drives
    // these via sprite.js identity fallback. NO ranged content in the batch → both are pure melee. ──
    spinAttack: { frames: 3, width: 120, height: 119, speed: 3, anchorY: -12, loop: true, sourceY: 1248, sheet: "./flash_atlas.png" },     // neutral Special: rapid spinning whirl (spin_attack) — anchorY ×(1.35/1.25)
    tornado:    { frames: 4, width: 113, height: 112, speed: 3, anchorY: -2,  loop: true, sourceY: 1367, sheet: "./flash_atlas.png" }    // forward Special: advancing electric vortex (towrnado_attack)
    // ── Stage 4 (Flash Time cast poses) added later. ──
  },
  // Dedicated intro art IS present → point the intro pool at it (game.pickIntroVariant → _introVariant).
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// GON FREECSS  (rosterKey "gon", universe "hunter_x_hunter" — 3rd HxH char after
// Netero & Killua). Source art = ~33 per-action PNGs (gon_*.png) + two master
// reference sheets (gon_freecss_transparent.png = FX, gon_freecss_transparent_2.png =
// LABELED body-pose rows). No standalone idle → the STANCE row was extracted from the
// master sheet (gon_idle.png) and, with every movement strip, RE-SLICED to uniform
// feet-aligned cells (tools/reslice_strip.mjs → *_uniform.png). See GON_ASSET_MAP.md.
// Archetype: BALANCED ALL-ROUNDER (Netero-shape but less spiky — solid HP/def, mid
// speed; identity = Jajanken + the Adult-Form ultimate, not a movement gimmick).
// Stage 1 = registration + movement/state only; normals/Jajanken/Adult-Form land later.
// ─────────────────────────────────────────────────────────────────
const gon = {
  rosterKey: "gon", name: "Gon Freecss", universe: "hunter_x_hunter", color: "#4caf50",
  portrait: "./gon_portrait.png",   // celebrate/arm-raised pose CROPPED from the master sheet (gon_freecss_transparent_2.png top-left).
  archetypes: ["balanced"],
  primary: "balanced", secondary: [],
  // BALANCED ALL-ROUNDER. vs Netero (HP980/atk98/def82/spd94 = glass-cannon burst): Gon is
  // deliberately more DURABLE and less spiky — higher HP/def, lower attack/speed — so he reads
  // as an even brawler, not a min-maxed spike. Sits mid-roster (roster HP ~1030–1300).
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "balanced", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 160, attack: 89, defense: 86, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  // STAGE 2 normals — balanced all-rounder (solid per-hit, not spiky like Flash's rushdown, not
  // heavy-committed like a grappler). data keys map to sprite keys: upAttack→up, airAttack→air, downAir→down_air.
  basic_attacks: {
    light:    { damage: 34, startup: 3, active: 3, recovery: 8,  hitstun: 13, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: 1 },   // dash-headbutt lunge
    upAttack: { type: "launcher", damage: 54, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -32, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref); BASE form. ⚑ Adult-Gon (giant) launch verified separately, see harness/up_attack_giant.mjs
    airAttack:{ damage: 46, startup: 4, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 58, startup: 6, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  hasSprites: true,
  // spriteScale 2.5 → idle content 45px × 2.5 ≈ 112px on-screen (roster band ~110–116; see
  // [[sprite-size-normalization]]). REQUIRES the skins.js `gon` default skin (else applySkin()
  // pulls the getSkins() spriteScale:1 fallback → native ~half size) + the spritesheets.js gate.
  spriteScale: 2.12,   // HEIGHT-REF: canon 154cm (age-12 base form) → target ~96px (was 2.5). See HEIGHT_REFERENCE.md; anchorY below rescaled ×(2.12/2.5).
  // anchorY = -(bottom transparent gap × 2.5); every resliced cell has botGap 1 → -2, feet planted.
  animationData: {
    idle:  { frames: 4, width: 36, height: 47, speed: 8, anchorY: -2, sourceY: 0, sheet: "./gon_atlas.png" },
    walk:  { frames: 8, width: 49, height: 46, speed: 6, anchorY: -2, sourceY: 47, sheet: "./gon_atlas.png" },   // MOVE row (run cycle), played slower for walk
    run:   { frames: 8, width: 49, height: 46, speed: 4, anchorY: -2, sourceY: 47, sheet: "./gon_atlas.png" },
    dash:  { frames: 2, width: 43, height: 43, speed: 3, anchorY: -2, sourceY: 93, sheet: "./gon_atlas.png" },
    jump:  { frames: 7, width: 40, height: 47, speed: 5, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 136, sheet: "./gon_atlas.png" },
    fall:  { frames: 1, width: 40, height: 47, speed: 5, anchorY: -2, sourceX: 240, loop: false, lockLastFrame: true, sourceY: 136, sheet: "./gon_atlas.png" },   // hold jump's last (apex/descend) cell
    guard: { frames: 3, width: 37, height: 45, speed: 8, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 183, sheet: "./gon_atlas.png" },
    hurt:  { frames: 4, width: 42, height: 45, speed: 6, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 228, sheet: "./gon_atlas.png" },
    // ── STAGE 2 NORMALS (5 slots). Resliced uniform cells; play once, hold last frame. ──
    light:    { frames: 3,  width: 50, height: 47, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 273, sheet: "./gon_atlas.png" },   // quick forward punch
    heavy:    { frames: 7,  width: 50, height: 42, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 320, sheet: "./gon_atlas.png" },  // committed forward lunge/tackle
    up:       { frames: 7,  width: 58, height: 58, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 362, sheet: "./gon_atlas.png" },   // rising kick launcher
    air:      { frames: 8,  width: 35, height: 51, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 420, sheet: "./gon_atlas.png" },      // neutral aerial punch
    down_air: { frames: 3,  width: 36, height: 46, speed: 4, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 471, sheet: "./gon_atlas.png" },        // downward dive
    // ── STAGE 2 COMMAND-NORMAL CHAIN — "Rush" (Down+Heavy rekka, cancel-on-hit; Flash architecture).
    // rush1 = rapid second-hit flurry → rush2 = big launching finisher. currentMove drives the sprite.
    rush1: { frames: 4,  width: 55, height: 24, speed: 2, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 517, sheet: "./gon_atlas.png" },
    rush2: { frames: 10, width: 82, height: 82, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 541, sheet: "./gon_atlas.png" },
    // ── STAGE 3 JAJANKEN (3 separate specials on separate inputs). currentMove drives the sprite. ──
    rock:     { frames: 10, width: 63, height: 47, speed: 4, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 623, sheet: "./gon_atlas.png" },      // charge-windup → devastating punch (built-in telegraph frames)
    paper:    { frames: 5,  width: 43, height: 50, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 670, sheet: "./gon_atlas.png" },     // open-palm push
    scissors: { frames: 12, width: 59, height: 48, speed: 2, anchorY: -2, loop: false, lockLastFrame: true, sourceY: 720, sheet: "./gon_atlas.png" },  // rapid multi-hit jab string
    // ── HOLD-TO-CHARGE — Nen-charging pose (hold P). Dedicated 2-frame Nen-aura buildup strip
    // (gon_charge_default_charge_animation.png, 126×78 → 2 · 63×78; the two aura poses alternate
    // while held). Rendered by sprite.js when isCharging (the universal hold-to-charge sets it for
    // any maxEnergy>0 char). Without this key the charge state fell through to the idle pose — the
    // art existed on disk but was never wired into animationData. botGap 3 → anchorY -(3×2.5)≈-7.
    charge: { frames: 2, width: 63, height: 78, speed: 6, anchorY: -6, loop: true, sourceY: 768, sheet: "./gon_atlas.png" },
    // ── STAGE 4 — ADULT FORM (Ultimate). The adult body is much larger → actionScale shrinks the tall
    // cells (220px) back toward a ~1.6× on-screen read vs child Gon (an intimidating grown silhouette).
    // `transform` holds through the activation cinematic; `finalblow` is the all-or-nothing sudden-death.
    // Atlas bands repacked in-place to DROP blank speck-phantom cells (transform had 1 at cell 5;
    // finalblow had 3 at cells 3,5,6) that made Gon flicker invisible mid-cinematic. Real poses only:
    // transform 14→13f, finalblow 16→13f. Standalone gon_*_uniform.png also repacked (atlas source).
    transform: { frames: 13, width: 80,  height: 220, speed: 4, anchorY: -2, actionScale: 0.42, loop: false, lockLastFrame: true, sourceY: 846, sheet: "./gon_atlas.png" },   // child→adult growth (cinematic pose)
    finalblow: { frames: 13, width: 105, height: 219, speed: 3, anchorY: -2, actionScale: 0.42, loop: false, lockLastFrame: true, sourceY: 1066, sheet: "./gon_atlas.png" }     // the sudden-death decisive strike
    // (no adult idle/walk/attack art in the batch → Adult Form is a BUFF-MODE overlay on the child body,
    //  like Godspeed/Flash Time; a full adult body-swap is a deferred visual-polish item.)
  },
  // No dedicated intro strip in the batch → idle-hold intro (the fighter settles in his STANCE
  // during the intro phase). Flagged in GON_ASSET_MAP.md; a bespoke intro can be added later.
  introPool: ["idle"]
}

// ─────────────────────────────────────────────────────────────────
// BATMAN  (rosterKey "batman", universe "dc" — 2nd DC char after The Flash,
// 17th sprite char overall). Source art = ~27 per-action PNGs (batman_*.png)
// + a master reference atlas (batman_transparent.png, 3861×2171 = full row-sheet;
// the per-action files are the extracted rows). Filenames preserved EXACTLY as
// uploaded (note typos: batman_baterang_*, batman_melle_combo_1, batman_foward_*,
// batman_down_air_specail). Frame counts MEASURED via slice_scan.mjs (alpha-gutter);
// non-uniform strips RE-SLICED (reslice.mjs → *_uniform.png). See BATMAN_ASSET_MAP.md.
// Archetype: TECHNICAL martial-arts brawler with a gadget special kit (Killua/Netero
// tier, precision over brute force) — balanced-to-slightly-fast, moderate per-hit,
// DISCIPLINED (high defense). Gadget meter (energyType "gadget"). Batarang projectile,
// Cape Dash (grapple-as-mobility — no hook-pull art), Smoke Pellet teleport-behind;
// Ultimate = Batarang-barrage cinematic (largest sequence = batman_baterang_combo_throws).
// ─────────────────────────────────────────────────────────────────
const batman = {
  rosterKey: "batman", name: "Batman", universe: "dc", color: "#3a3f4b",
  portrait: "./batman_portrait.png",   // cowl head CROPPED from idle frame 0 (Stage 5; falls back cleanly if absent pre-crop).
  archetypes: ["technical", "rushdown"],
  primary: "technical", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "gadget", mobility: "high", scaling: "combo", animeMovement: false },
  // TECHNICAL PRECISION BRAWLER — Killua/Netero tier (fast, tool-assisted, efficient), NOT a
  // heavy power-brawler. vs roster: Killua HP1030/atk84/def78/spd95 (glass assassin),
  // Netero HP980/atk98/def82/spd94 (glass burst), Gon HP1150/atk89/def86/spd86 (durable
  // all-rounder), Flash HP1020/atk80/def74/spd99 (glass speedster). Batman sits as a
  // DISCIPLINED mid: HP1080 (mid), atk86 (moderate), def88 (2nd-highest — disciplined guard),
  // spd92 (balanced-to-slightly-fast, below Toji98/Flash99/Killua95, above Gon86). No stat is
  // an outlier; def88 is the only slightly-high value and is intentional (Batman's identity is
  // defense + counters, not damage). maxEnergy 100 = Gadget meter (specials + Ultimate).
  stats: { maxHealth: 1080, maxEnergy: 100, attack: 86, defense: 88, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 11, dashCooldownMax: 30 },
  // Placeholder normals (moderate, combo-friendly) — real normals + command chain land in Stage 2.
  // data keys map to sprite keys: upAttack→up, airAttack→air, downAir→down_air. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 32, startup: 3, active: 3, recovery: 8,  hitstun: 13, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 64, startup: 7, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 52, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -32, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack:{ damage: 45, startup: 4, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 58, startup: 6, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // HUD-only until Stage 4 (real logic + cost live in abilities.js). Cinematic Batarang barrage.
  ultimate: { name: "The Dark Knight", cost: 100, description: "The Dark Knight — a cinematic barrage of batarangs raining down on a staggered foe (freeze-focus finisher)." },
  hasSprites: true,
  // spriteScale 0.92 → idle content 128px × 0.92 ≈ 118px on-screen (roster band ~110–120). Batman's
  // source art is LARGE (unlike Gon/Killua's tiny cells) so scale is <1. REQUIRES the skins.js `batman`
  // default skin (else applySkin() pulls the spriteScale:1 fallback) + the spritesheets.js idle gate.
  spriteScale: 0.92,
  // anchorY = -(bottom transparent gap × 0.92) plants feet (botGap measured per resliced sheet).
  animationData: {
    // ── MOVEMENT / STATE (Stage 1). Re-sliced to uniform feet-preserving cells (reslice.mjs). ──
    idle:  { frames: 6,  width: 125, height: 132, speed: 8, anchorY: -2, sheet: "./batman_idle_uniform.png" },   // botGap 2 — cape-settle idle
    walk:  { frames: 12, width: 160, height: 150, speed: 5, anchorY: -3, sheet: "./batman_walk_uniform.png" },   // full 12f walk cycle (distinct from run)
    run:   { frames: 8,  width: 191, height: 120, speed: 4, anchorY: -2, sheet: "./batman_run_uniform.png" },    // 8f cape-sweep sprint
    dash:  { frames: 8,  width: 191, height: 120, speed: 3, anchorY: -2, sheet: "./batman_run_uniform.png" },    // reuse run faster
    // Jump: 4-pose crouch→spring→apex→float from the side-leap strip; hold last cell for fall.
    jump:  { frames: 4,  width: 176, height: 145, speed: 6, anchorY: -11, loop: false, lockLastFrame: true, sheet: "./batman_jump_uniform.png" },   // botGap 12
    fall:  { frames: 1,  width: 176, height: 145, speed: 6, anchorY: -11, sourceX: 528, loop: false, lockLastFrame: true, sheet: "./batman_jump_uniform.png" },   // frame 3 (float/descend)
    // GUARD — REAL 6-frame block strip (cape-wrap brace). Unlike Flash/Killua (idle fallback) Batman
    // has dedicated block art. Play once, hold the settled cape-wrap (last frame). sprite.js guard branch.
    guard: { frames: 6,  width: 121, height: 146, speed: 8, anchorY: -6, loop: false, lockLastFrame: true, sheet: "./batman_guard_uniform.png" },   // botGap 7
    // HURT — real 4-frame recoil strip (batman_hit). All hitstun routes here.
    hurt:  { frames: 4,  width: 130, height: 161, speed: 6, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_hit_uniform.png" },   // botGap 0
    // Pre-match INTRO — the LANDING strip (batman_land): glide-descend (cape spread) → touchdown →
    // cape settles into stance. Dramatic Batman entrance. Plays once, holds the settled last frame.
    intro: { frames: 7,  width: 337, height: 219, speed: 5, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_intro_uniform.png" },   // botGap 0
    // HOLD-TO-CHARGE — gadget-charge flex pose (batman_charge). Rendered by sprite.js when isCharging
    // (universal hold-P for any maxEnergy>0 char). loop while held. botGap 4 → anchorY -(4×0.92)≈-4.
    charge: { frames: 3,  width: 140, height: 162, speed: 6, anchorY: -4, loop: true, sheet: "./batman_charge_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots). Resliced uniform cells; play once, hold last frame. anchorY =
    // -(botGap × 0.92) plants feet (measured per strip). Moderate technical-brawler pacing. ──
    light:    { frames: 3, width: 165, height: 144, speed: 3, anchorY: -7, loop: false, lockLastFrame: true, sheet: "./batman_light_uniform.png" },     // quick jab→cross (foward_punch)
    heavy:    { frames: 6, width: 178, height: 129, speed: 4, anchorY: -3, loop: false, lockLastFrame: true, sheet: "./batman_heavy_uniform.png" },      // committed wind-up kick (foward_kick)
    up:       { frames: 3, width: 146, height: 140, speed: 4, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_up_uniform.png" },         // launcher: overhead uppercut (down_combo_2 frames 0-2)
    air:      { frames: 6, width: 89,  height: 150, speed: 4, anchorY: -4, loop: false, lockLastFrame: true, sheet: "./batman_air_uniform.png" },        // neutral aerial cape-swirl (super_air)
    down_air: { frames: 6, width: 186, height: 116, speed: 4, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_downair_uniform.png" },    // aerial dive-punch (down_air_2)
    // ── STAGE 2 COMMAND-NORMAL CHAIN — "Combo" (Down+Heavy rekka, cancel-on-hit; Flash/Gon/Tobirama
    // architecture). The 12-frame standing hand-to-hand string (batman_melle_combo_1) split into 3
    // cancelable stages: batCombo1 (jab opener) → batCombo2 (weave→uppercut) → batCombo3 (extended
    // straight finisher, launches). currentMove = batComboN resolves the sheet via sprite.js identity. ──
    // 3 real poses (jab opener) — the 508px sheet has a 4th cell that is blank (only a
    // 1px stray speck from the raw art); wiring it as 4f made lockLastFrame HOLD that blank
    // cell → Batman flickered invisible at the end of the jab. 3f holds the last real pose.
    batCombo1: { frames: 3, width: 127, height: 163, speed: 3, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_combo1_uniform.png" },
    batCombo2: { frames: 4, width: 148, height: 163, speed: 3, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_combo2_uniform.png" },
    batCombo3: { frames: 4, width: 189, height: 163, speed: 3, anchorY: -5, loop: false, lockLastFrame: true, sheet: "./batman_combo3_uniform.png" },
    // ── STAGE 3 SPECIAL cast poses (SPECIAL button, direction-branched via _specialHeldDir).
    // currentMove/_spriteCastMove drives these via sprite.js identity → the sheet. ──
    batarangThrow: { frames: 6, width: 184, height: 157, speed: 3, anchorY: -6, loop: false, lockLastFrame: true, sheet: "./batman_batarang_throw_uniform.png" },   // neutral Special: wind-up → release (baterang_throw)
    capeDash:      { frames: 8, width: 235, height: 130, speed: 3, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_capedash_uniform.png" },           // forward Special: leaping cape-swoop lunge (side_kick_combos). Smoke Pellet (down) is FX-only (poof+flash, no cast sheet).
    // ── STAGE 4 ULTIMATE cast pose — "The Dark Knight" batarang barrage. Batman holds this 14-frame
    // rapid multi-throw (batman_baterang_combo_throws = the LARGEST sequence in the batch) through the
    // frozen cinematic while a rain of batarangs streaks down onto the staggered foe. _spriteCastMove. ──
    darkKnight:    { frames: 14, width: 212, height: 141, speed: 3, anchorY: -5, loop: false, lockLastFrame: true, sheet: "./batman_ult_uniform.png" }
  },
  // Dedicated dramatic landing intro IS present → point the intro pool at it.
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// HISOKA MORROW  (rosterKey "hisoka", universe "hunter_x_hunter" — 4th HxH
// char after Netero/Killua/Gon, 21st sprite char). Source art = 28 per-action
// PNGs (hisoka_*.png) + two 2344² master atlases (hisoka_jus / hisoka_transparent).
// Frame counts MEASURED via tools/slice_probe.mjs, non-uniform strips RE-SLICED
// (tools/reslice_strip.mjs → *_uniform.png, feet-aligned). Intro = the signature
// pink-heart "bloodlust bloom" CROPPED out of hisoka_intro.png (WIN/LOSE label
// column excluded). Jump = hisoka_jump_part_1 + _part_2 STITCHED. See HISOKA_ASSET_MAP.md.
// Archetype: unpredictable FLEXIBLE TECHNICIAN — extended-reach Bungee Gum whip
// (melee) + Texture Surprise cards (ranged) + a Bungee-Gum/card-mastery transform
// ultimate (giant-form architecture, Stage 5). Balanced-to-fast, moderate damage.
// ─────────────────────────────────────────────────────────────────
const hisoka = {
  rosterKey: "hisoka", name: "Hisoka Morrow", universe: "hunter_x_hunter", color: "#e94b9c",
  portrait: "./hisoka_portrait.png",   // dedicated mugshot CROPPED from the master atlas in Stage 6.
  archetypes: ["technical", "trickster"],
  primary: "technical", secondary: ["ranged"],
  // Nen pool (shared "Nen" HUD label with Killua/Netero — no new label needed).
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  // FLEXIBLE TECHNICIAN, mid-fast: speed 91 sits below the top speedsters (Killua 95,
  // Netero 94, Minato 90≈) but above Gon 86 — fast, not fastest. attack 88 and defense 82
  // are moderate (below Gon 89/86 durability, above Killua 84/78 fragility). maxHealth 1080
  // is between Killua 1030 (fragile) and Gon 1150 (durable): a survivable trickster, no
  // outliers vs the roster bands. maxEnergy 170 = Nen pool, between Netero 150 and Killua 180.
  stats: { maxHealth: 1080, maxEnergy: 170, attack: 88, defense: 82, speed: 91, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 36 },
  // Placeholder technician normals — moderate damage, combo-friendly. Real normals + the
  // command-normal chain land in Stage 2. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 40, startup: 3, active: 3, recovery: 9,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 80, startup: 7, active: 4, recovery: 16, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -32, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref); trickster
    airAttack:{ damage: 52, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 68, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // HUD-only until Stage 5 (real logic + cost live in abilities.js). Giant/alt-form ultimate.
  ultimate: { name: "Bloodlust Overdrive", cost: 100, description: "Bungee Gum & card mastery unleashed — an escalated Nen aura form with dramatically extended whip reach and empowered attacks." },
  hasSprites: true,
  // idle content ~58px × 2.0 ≈ 116px on-screen (top of the adult roster band ~110–116;
  // Hisoka is canonically tall). REQUIRES the skins.js `hisoka` entry (else applySkin()
  // pulls the spriteScale:1 fallback → native ~half size) + the spritesheets.js gate.
  spriteScale: 2.0,
  animationData: {
    idle:  { frames: 4, width: 29, height: 60, speed: 8, anchorY: -2, sheet: "./hisoka_idle_uniform.png" },
    walk:  { frames: 6, width: 31, height: 60, speed: 6, anchorY: -2, sheet: "./hisoka_run_uniform.png" },   // MOVE row played slower for walk
    run:   { frames: 6, width: 31, height: 60, speed: 4, anchorY: -2, sheet: "./hisoka_run_uniform.png" },
    dash:  { frames: 3, width: 22, height: 63, speed: 3, anchorY: -2, sheet: "./hisoka_dash_uniform.png" },
    jump:  { frames: 9, width: 36, height: 63, speed: 4, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_jump_uniform.png" },   // launch→apex (cells 0..8 of the 12-cell stitch)
    fall:  { frames: 1, width: 36, height: 63, speed: 4, anchorY: -2, sourceX: 360, loop: false, lockLastFrame: true, sheet: "./hisoka_jump_uniform.png" },   // hold a descending cell (index 10)
    guard: { frames: 2, width: 32, height: 60, speed: 8, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_guard_uniform.png" },
    hurt:  { frames: 4, width: 34, height: 54, speed: 6, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_hit_uniform.png" },
    // STAGE 2 — 5 normals (combat.js sets currentMove light/heavy/up/air/down_air → sprite.js
    // MOVE_TO_ACTION identity-maps them to these keys). light=forward punch, heavy=kick,
    // up=launcher, air=aerial slash, down_air=dive smash (ground burst).
    light:    { frames: 4, width: 62, height: 60, speed: 2, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_light_uniform.png" },
    heavy:    { frames: 4, width: 56, height: 60, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_heavy_uniform.png" },
    up:       { frames: 5, width: 36, height: 57, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_up_uniform.png" },
    air:      { frames: 5, width: 36, height: 66, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_air_uniform.png" },
    down_air: { frames: 4, width: 90, height: 61, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_downair_uniform.png" },
    // STAGE 2 — Toji-Rekka command-normal chain (Down+Heavy). rekka1 = crouch strike opener,
    // rekka2 = extended-reach card-slash launcher finisher. Cancel-on-hit (abilities.js updateHisokaCommandCombat).
    hisokaRekka1: { frames: 5, width: 46,  height: 63, speed: 2, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_rekka1_uniform.png" },
    hisokaRekka2: { frames: 4, width: 106, height: 57, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_rekka2_uniform.png" },
    // STAGE 3 — Bungee Gum: extended-reach elastic-whip special (NEUTRAL Special). The pink whip
    // lashes far forward (~206px on-screen at scale 2.0) — a much longer hitbox than any normal.
    bungeeGum: { frames: 4, width: 103, height: 72, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_bungee_uniform.png" },
    // STAGE 4 — Texture Surprise (cards). Cast poses; the cards fly as independent `hisoka_card`
    // projectiles. Down+Special = single precise throw; Forward+Special = rapid multi-card spread.
    cardThrowSingle: { frames: 4, width: 56, height: 60, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_card_single_uniform.png" },
    cardThrowRapid:  { frames: 6, width: 59, height: 60, speed: 2, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_card_rapid_uniform.png" },
    // STAGE 5 — Bloodlust Overdrive transformation sequence (card-cape aura swirl → golden power-up).
    // Held as the cast pose through the freeze-cinematic (abilities.enterHisokaOverdrive), then combat
    // resumes with the _skinAnim body-swap to the golden-aura power-up form.
    transform: { frames: 11, width: 58, height: 68, speed: 4, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_transform_uniform.png" },
    // DEDICATED hold-to-charge aura (universal P-hold energy charge; sprite.js returns "charge" only when
    // this key EXISTS — without it the generic procedural aura draws over idle). Buildup plays once
    // (frames 0-1) then loops the full yellow-aura tail (loopStart 2) while held.
    charge: { frames: 6, width: 75, height: 84, speed: 4, anchorY: -2, loop: true, loopStart: 2, sheet: "./hisoka_charge_uniform.png" },
    // Signature pink-heart "bloodlust bloom" intro (hearts swell around him → fade → he stands revealed).
    intro: { frames: 8, width: 128, height: 114, speed: 5, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_intro_uniform.png" }
  },
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// SUPERMAN  (rosterKey "superman", universe "dc" — 3rd DC char after The Flash
// + Batman, 20th sprite char overall). Source art = 25 curated superman_*.png
// crops (see SUPERMAN_ASSET_MAP.md). Archetype: super-strength/flight powerhouse.
// Energy = "Solar Energy" (traits.energyType "solar_energy" → ui.js label). FLIGHT
// reuses Omni-Man's toggleable flight system verbatim (traits.canFly gate) — shared
// Solar Energy pool for flight + specials + modes + ultimate. Idle is the FLOATING
// hover (not grounded). Intro = off-screen Clark-Kent run-in → shirt-rip reveal →
// liftoff → floating idle, camera-tracked (updateSupermanIntro in game.js).
// ─────────────────────────────────────────────────────────────────
const superman = {
  rosterKey: "superman", name: "Superman", universe: "dc", color: "#1c4fd8",
  portrait: "./superman_portrait.png",
  archetypes: ["melee", "flight"],
  primary: "melee", secondary: ["flight"],
  traits: { hasEnergy: true, energyType: "solar_energy", mobility: "high", scaling: "damage", animeMovement: false, canFly: true },
  passive: { name: "Kryptonian Physiology", effect: "Yellow-sun-charged strength and durability — the roster's toughest bruiser, with free flight on Solar Energy" },
  // POWERHOUSE stats — the durability/strength apex (edges Omni-Man 1400/98 by design; flagged for Stage 6 balance).
  stats: { maxHealth: 1450, maxEnergy: 200, attack: 100, defense: 92, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 36 },
  movement: { dashTeleport: true },
  // STAGE 2 normals — heavy-hitting super-strength blows with large knockback (attack stat 100).
  basic_attacks: {
    light:    { damage: 36, startup: 4, active: 3, recovery: 9,  hitstun: 14, knockbackX: 5,  knockbackY: 0 },
    heavy:    { damage: 72, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 12, knockbackY: 2 },
    upAttack: { type: "launcher", damage: 56, startup: 5, active: 4, recovery: 10, hitstun: 20, knockbackX: 2, knockbackY: -11, launch: 14, launchVy: -33, selfVy: -9, airOK: false },   // Up-Attack launcher — HEAVY-TANK archetype (Toji ref +1 rec, heavier pop); HP 1450 powerhouse
    airAttack:{ damage: 48, startup: 4, active: 3, recovery: 11, hitstun: 14, knockbackX: 5,  knockbackY: -2 },
    downAir:  { damage: 62, startup: 6, active: 4, recovery: 13, hitstun: 16, knockbackX: 2,  knockbackY: 11 },
    grab:     { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 8, throwForceY: -3 }
  },
  ultimate: { name: "Solar Overload", cost: 100, description: "Superman channels every ounce of stored yellow-sun energy — surging green, dissolving to pure particles — then DETONATES it in a screen-clearing blast (freeze-cinematic, guaranteed ~380, chipped by block)." },
  hasSprites: true,
  spriteScale: 1.6,
  // Off-screen Clark run-in → liftoff → floating hover. Steps play in FIXED ORDER.
  introSequence: ["introRunIn", "introLiftoff", "introHover"],
  animationData: {
    // ── MOVEMENT / STATE
    idle:  { frames: 6, width: 56, height: 85, speed: 8, anchorY: 0, sheet: "./superman_idle_uniform.png" },
    walk:  { frames: 6, width: 62, height: 82, speed: 6, anchorY: 0, sheet: "./superman_walk_uniform.png" },
    run:   { frames: 6, width: 62, height: 82, speed: 4, anchorY: 0, sheet: "./superman_walk_uniform.png" },
    dash:  { frames: 6, width: 62, height: 82, speed: 4, anchorY: 0, sheet: "./superman_walk_uniform.png" },
    // He floats — jump/fall reuse the hover idle (rises as a hover, no crouch-spring art needed).
    jump:  { frames: 6, width: 56, height: 85, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_idle_uniform.png" },
    fall:  { frames: 6, width: 56, height: 85, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_idle_uniform.png" },
    hurt:  { frames: 1, width: 55, height: 77, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_hit_uniform.png" },
    charge:{ frames: 1, width: 50, height: 82, speed: 6, anchorY: 0, loop: true, sheet: "./superman_charge_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots) — heavy-hitting super-strength blows.
    light:    { frames: 5, width: 88,  height: 80, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_light_uniform.png" },
    heavy:    { frames: 5, width: 88,  height: 78, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_heavy_uniform.png" },
    up:       { frames: 4, width: 65,  height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_up_uniform.png" },
    air:      { frames: 7, width: 104, height: 41, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_air_uniform.png" },
    down_air: { frames: 5, width: 88,  height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_downair_uniform.png" },
    // ── STAGE 2 REKKA "Kryptonian Rush" — Fwd+Heavy flying punch flurry, cancel-on-hit (Toji-Rekka).
    // Keys = chain order; sheets = fast flying cross → flying charged jab → big charged haymaker launcher.
    supRush1:   { frames: 9,  width: 104, height: 41, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_suprush1_uniform.png" },
    supRush2:   { frames: 8,  width: 93,  height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_suprush2_uniform.png" },
    supRushFin: { frames: 16, width: 88,  height: 82, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_suprushfin_uniform.png" },
    // ── STAGE 3 SPECIAL cast pose — Super Flying Punch (charge glow → forward lunge). Heat Vision reuses charge.
    superPunch: { frames: 16, width: 88, height: 85, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_superpunch_uniform.png" },
    // ── STAGE 4 MODE entry-cast poses (dedicated transform art). Solar Flare = gold radiant burst;
    // Kryptonian Overload = blue electric crackle. Play once on activation, then aura overlay carries the mode.
    solarFlareCast: { frames: 6,  width: 60, height: 85, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_solarflare_uniform.png" },
    overloadCast:   { frames: 15, width: 55, height: 85, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_overload_uniform.png" },
    // ── STAGE 5 ULTIMATE "Solar Overload" cinematic pose (green energy surge → particle dissolve).
    ultimate: { frames: 13, width: 55, height: 81, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_ultimate_uniform.png" },
    // ── STAGE 6 TAUNT — enrolls Superman in the universal hold-Down-10s → heal-50% system (game.js
    // updateTauntState; the `taunt` action IS the entire gate). Grounded confident flourish. The airborne
    // taunt variant (taunt_air) is drawn when a taunt somehow resolves while airborne (rare — the trigger
    // is grounded-only by design), reusing the hurt/hurt_air variant-resolution idiom.
    taunt:     { frames: 4, width: 81, height: 82, speed: 14, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_taunt_uniform.png" },
    taunt_air: { frames: 4, width: 81, height: 85, speed: 14, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_airtaunt_uniform.png" },
    // ── FLIGHT (Omni-Man system): fly = neutral hover streak, flyMove = directional streak (same sheet).
    fly:           { frames: 6, width: 93, height: 43, speed: 6, anchorY: 0, sheet: "./superman_fly_uniform.png" },
    flyMove:       { frames: 6, width: 93, height: 43, speed: 5, anchorY: 0, sheet: "./superman_fly_uniform.png" },
    forcedDescent: { frames: 6, width: 93, height: 43, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_fly_uniform.png" },
    descentLand:   { frames: 8, width: 81, height: 81, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_descentland_uniform.png" },
    // ── INTRO (off-screen run-in → liftoff → hover). introHover == idle art.
    introRunIn:   { frames: 21, width: 60,  height: 82, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_intro1_uniform.png" },
    introLiftoff: { frames: 17, width: 198, height: 82, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./superman_intro2_uniform.png" },
    introHover:   { frames: 6,  width: 56,  height: 85, speed: 8, anchorY: 0, loop: true, sheet: "./superman_intro3_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// JUJUTSU KAISEN — MAKI ZENIN
// Pure-physical naginata bruiser. UNIQUE in the roster: NO resource
// meter of any kind (traits.hideResourceMeter suppresses the whole
// energy panel — she is not even a "no-meter flavor" character; she
// shows HP only). Her Ultimate is HP-THRESHOLD gated (unlocks at ≤25%
// HP → player-triggered Shibuya-Arc transformation), NOT meter gated.
// Stage 1 = registration + base-form movement/state only. Attacks
// (Stage 2), specials (Stage 3) and the transformation ult (Stage 4)
// land in later stages. Sprites are reslice_strip'd _uniform copies
// (originals untracked) → anchorY:0 (feet at cell bottom).
// spriteScale 1.63: idle body content 65px × 1.63 ≈ 106px ≈ 0.623×170cm
// (canon 170cm, JJK official) per HEIGHT_REFERENCE.md.
// ─────────────────────────────────────────────────────────────────
const maki = {
  rosterKey: "maki", name: "Maki Zenin", universe: "jujutsu_kaisen",
  portrait: "./maki_portrait.png",   // real bust crop from the master-sheet header (green hair/glasses/naginata), Power-Rangers pattern
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // energyType:"none" keeps her out of all energy logic; hideResourceMeter
  // additionally suppresses the HUD energy panel entirely (no bar, no
  // flavor label) → truly HP-only, distinct from every other character.
  traits: { hasEnergy: false, energyType: "none", hideResourceMeter: true, mobility: "very_high", scaling: "physical_comeback", animeMovement: true },
  // "HEAVENLY VOW" REBALANCE — a physically superhuman fighter: faster + harder-hitting than the roster
  // average (a body built entirely around physical output, no cursed energy), DELIBERATELY traded against a
  // tightened combo-execution window (see MAKI_CANCEL_FRAMES in abilities.js). speed 98 ties the roster top
  // (Toji/Minato); dashSpeed 22 is a superhuman burst; attack 96 ties Toji (top-of-band, below Sukuna 100).
  stats: { maxHealth: 1180, maxEnergy: 0, attack: 96, defense: 84, speed: 98, maxJumps: 2, jumpPower: 32, dashSpeed: 22, dashDuration: 10, dashCooldownMax: 26 },
  basic_attacks: {
    // Frame data present so the character object is complete/valid; the
    // attack ANIMATIONS are wired in Stage 2. Damage raised ~+17-19% over the original values
    // (Heavenly Vow rebalance) → top-of-band normals, offsetting the tighter cancel window.
    light:     { damage: 54, startup: 3, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 98, startup: 7, active: 4, recovery: 16, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 92, rangeY: 46 },
    // Up-Attack launcher "Rising Kick" (fast/glass-cannon archetype): the FASTEST launcher on the roster —
    // startup 4 / active 3 / recovery 6 — fitting her speed kit. enemy vy -11 / Maki vy -8. This is
    // CONSISTENT with the Heavenly Vow rebalance: HV's tradeoff is her TIGHT cancel window
    // (MAKI_CANCEL_FRAMES in abilities.js), not slow normals — a superhuman-fast launcher is on-identity.
    upAttack:  { type: "launcher", damage: 78, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, launchVy: -30, selfVy: -8, airOK: false },
    airAttack: { damage: 66, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 88, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    // SPECIAL button, direction-branched via _specialHeldDir. All COOLDOWN-gated (cost 0 — no energy).
    kunaiThrow:     { cost: 0, effect: "Neutral/Fwd: throws a kunai — an independent-collision projectile (weapon-flavor)" },
    nunchakuFlurry: { cost: 0, effect: "Down: pulls nunchaku for a spinning overhead multi-hit flurry (weapon-flavor melee)" },
    // CHARGE button. Self-buff, not a strike.
    powerCharge:    { cost: 0, effect: "CHARGE: 'Power Charge' — a brief physical power-up (1.3× damage ~5s). No energy; cooldown-gated." }
  },
  ultimate: { name: "Cursed Tool Awakening (Shibuya Arc)", cost: 0, description: "HP-THRESHOLD ultimate — becomes available only when Maki's HP drops to ≤25%. Player-triggered black-costume transformation (freeze-cinematic) → full Shibuya-Arc moveset for the rest of the match. No energy cost (she has none). Wired in Stage 4." },
  // base = Jujutsu-High uniform (start). shibuya = the ≤25%-HP awakened black-costume form (Stage 4);
  // the transform is player-triggered (HP-threshold unlock, NOT meter) and one-way for the round.
  transformationOrder: ["base"],
  transformations: {
    base:    { damageMultiplier: 1,    speedMultiplier: 1,   defenseMultiplier: 1 },
    shibuya: { damageMultiplier: 1.25, speedMultiplier: 1.1, defenseMultiplier: 1.05, isSpecial: true }
  },
  hasSprites: true,
  // HEIGHT-REF: canon 167cm → target ~104px (0.623×167). Was 1.63 (idle 112px, +8%); →1.51 lands on target. anchorY:0 → no re-anchor. Shibuya giant uses _canvasHeightFrac (excluded). See HEIGHT_REFERENCE.md.
  spriteScale: 1.51,
  // Random-cycle intro pool (pickIntroVariant picks one per match start). The 3 intros are each a
  // COMPLETE, SELF-CONTAINED sequence — NOT chained parts (the master-sheet label order doesn't confirm
  // 1→2→3), so this is introPool (random pick), not introSequence (fixed-order chain). Each plays through
  // once then holds its final ready-pose (lockLastFrame). intro1=salute/ready-up · intro2=naginata
  // point-forward · intro3=twirl → cursed-energy burst → planted stance.
  introPool: ["intro1", "intro2", "intro3"],
  animationData: {
    idle:  { frames: 4, width: 50, height: 71, speed: 8, anchorY: 0, loop: true, sheet: "./maki_new_idle_uniform.png" },   // NEW clean 4-frame idle — replaces the old maki_idle.png whose frame 3 was a 96px double-frame (two touching, no alpha gap → "two of her" glitch)
    walk:  { frames: 8, width: 71, height: 60, speed: 6, anchorY: 0, loop: true, sheet: "./maki_run_uniform.png" },
    run:   { frames: 8, width: 71, height: 60, speed: 4, anchorY: 0, loop: true, sheet: "./maki_run_uniform.png" },
    dash:  { frames: 1, width: 65, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_dash_uniform.png" },
    jump:  { frames: 5, width: 81, height: 73, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_jump_uniform.png" },
    fall:  { frames: 1, width: 81, height: 73, speed: 6, anchorY: 0, sourceX: 324, loop: false, lockLastFrame: true, sheet: "./maki_jump_uniform.png" },
    guard: { frames: 4, width: 53, height: 89, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_block_uniform.png" },
    hurt:  { frames: 1, width: 83, height: 56, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./maki_hit_uniform.png" },
    knockdown: { frames: 2, width: 83, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_hit_uniform.png" },
    // ── Random-cycle intros (self-contained; introPool picks one per match start) ──
    intro1: { frames: 5, width: 48, height: 70, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_intro1_uniform.png" },   // salute / ready-up
    intro2: { frames: 5, width: 86, height: 67, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_intro2_uniform.png" },   // naginata point-forward
    intro3: { frames: 6, width: 74, height: 92, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_intro3_uniform.png" },   // twirl → cursed-energy burst → planted stance
    // ── STAGE 2: naginata normals (broad slashes / thrusts) ──
    light:    { frames: 4, width: 76, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_light_uniform.png" },     // quick horizontal naginata slash
    heavy:    { frames: 5, width: 76, height: 65, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_heavy_uniform.png" },     // committed power swing (red trail)
    up:       { frames: 5, width: 77, height: 98, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_up_uniform.png" },        // crouch → rising overhead launcher
    air:      { frames: 4, width: 76, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_air_uniform.png" },        // aerial horizontal slash
    down_air: { frames: 5, width: 87, height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_downair_uniform.png" },   // descending crescent dive-spike
    // ── STAGE 2: "Cursed Tool Flurry" command chain (Fwd+Heavy → re-tap Heavy on clean hit) — brutal kick rekka ──
    makiG1:   { frames: 4, width: 91, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_g1_uniform.png" },         // low running sweep-kick opener
    makiG2:   { frames: 4, width: 62, height: 83, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_g2_uniform.png" },         // high roundhouse kick mid
    makiG3:   { frames: 4, width: 58, height: 101, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_g3_uniform.png" },         // spinning axe-kick finisher
    // ── STAGE 3: specials ──
    makiKunai:   { frames: 6, width: 86, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_kunai_uniform.png" },      // Kunai Throw — windup → release
    makiNunchaku:{ frames: 10, width: 57, height: 96, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_nunchaku_uniform.png" },   // Nunchaku Flurry — spinning overhead combo (weapon-flavor)
    makiCharge:  { frames: 2, width: 65, height: 83, speed: 6, anchorY: 0, loop: true, sheet: "./maki_charge_uniform.png" }                             // Power Charge — weapon-raised power-up stance
  }
}

// ─────────────────────────────────────────────────────────────────
// TOJI FUSHIGURO  (rosterKey "toji", universe "jujutsu_kaisen"). REBUILT on a fresh
// upload set (25 raw toji_*.png, filenames preserved as uploaded; the earlier build
// was fully removed — this is a clean rebuild). Source strips are NON-uniform (real
// per-frame alpha-gutter pitch, no fixed grid) → each is re-sliced to a feet-aligned
// `toji_*_uniform.png` cell (tools/reslice_strip.mjs; the 2-row intro via
// tools/reslice_rows.py). Raw originals are kept untouched in _toji_raw_backup/.
// ARCHETYPE: the "peerless physical combatant" — ZERO cursed energy (maxEnergy 0,
// hideResourceMeter, like Maki) traded for TOP-tier speed (98 — ties Maki/Minato,
// the teleport-blur gate) + hard-hitting normals (attack 98, top physical bracket,
// below Superman 100). DELIBERATELY LOW base bulk (HP 1050 — glass-cannon band with
// Netero 980 / Beerus 1000, below Maki 1180): his survivability is his two-stage
// COMEBACK mechanic (Stage 6, `scaling:"physical_comeback"`), NOT raw HP — so base
// durability is a clean balance lever. Qualifies for the double-tap teleport-blur by
// STAT (speed 98 >= SPEED_TIER_THRESHOLD), using his OWN dash pose (a walk-cycle
// frame — "dash sprite, not a special effect"). Stage 1 = registration + movement/
// state + intro; normals (S2), sword specials (S3), Chain (S4), Playful Cloud + Fly
// Heads (S5), two-stage comeback + Reincarnated Form (S6) land later. See TOJI_ASSET_MAP.md.
// ─────────────────────────────────────────────────────────────────
const toji = {
  rosterKey: "toji", name: "Toji Fushiguro", universe: "jujutsu_kaisen", color: "#5c6b63",
  portrait: "./toji_portrait.png",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // energyType:"none" keeps him out of all energy logic; hideResourceMeter suppresses the
  // HUD energy panel entirely (HP-only) — canon: Toji has ZERO cursed energy.
  traits: { hasEnergy: false, energyType: "none", hideResourceMeter: true, mobility: "very_high", scaling: "physical_comeback", animeMovement: true },
  // Peak-human physical archetype: fastest tier (98) + top-of-band damage (98), deliberately
  // fragile base HP (1050, glass-cannon band) — the two-stage comeback (S6) is his durability,
  // not raw bulk. See BALANCE_AUDIT.md (comeback outlier scrutiny in S7).
  stats: { maxHealth: 1050, maxEnergy: 0, attack: 98, defense: 82, speed: 98, maxJumps: 2, jumpPower: 33, dashSpeed: 22, dashDuration: 10, dashCooldownMax: 26 },
  // Frame data present so the object is valid; the attack ANIMATIONS are wired in Stage 2+.
  // Top-of-band normals (attack 98) — hits hard, offset by low base HP.
  basic_attacks: {
    light:     { damage: 52, startup: 3, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 96, startup: 7, active: 4, recovery: 15, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 92, rangeY: 46 },
    upAttack:  { type: "launcher", damage: 74, startup: 5, active: 3, recovery: 7,  hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, launchVy: -32, selfVy: -8, airOK: false },
    airAttack: { damage: 62, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 86, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  // Specials/ultimate are DESCRIBED here (object completeness); wired in later stages.
  specials: {
    splitSoulKatana:   { cost: 0, effect: "S3 — Split Soul Katana: a committed two-hit descending sword combo (sword_down_attack_1→2 as one continuous special)" },
    rapidSwordSlashes: { cost: 0, effect: "S3 — a flurry of rapid katana slashes (multi-hit)" },
    chainOfMiles:      { cost: 0, effect: "S4 — Chain of a Thousand Miles / Inverted Spear of Heaven: one continuous 5-part chain sequence (chain_attack_1→5)" },
    playfulCloud:      { cost: 0, effect: "S5 — Playful Cloud: a single self-contained cursed-tool (three-section-staff) strike" },
    flyHeads:          { cost: 0, effect: "Fly Heads: releases a dense, screen-filling SWARM of shikigami fly-heads that CLUTTER the shared view for ~3s — pure vision-denial/disruption, ZERO damage (see tojiFlyHeadsSwarm.js). Closest achievable to 'opponent can't see' on a single shared-screen renderer." }
  },
  ultimate: { name: "Reincarnated Form", cost: 0, description: "Meterless (no energy). MANUAL, player-chosen ultimate (Super/X) — a freeze-cinematic transformation into the Reincarnated Form (crimson aura, dmg ×1.25 / spd ×1.1 / def ×1.08). Castable from any HP; 20s cooldown, once per round. Independent of the automatic two-stage comeback, which also grants the same form on the 2nd near-death (no double buff either ordering)." },
  // Reincarnated Form buff tier (auto-granted on the 2nd comeback save; ALSO the manual Super/X ultimate — same form, freeze-cinematic entry).
  transformationOrder: ["base"],
  transformations: {
    base:         { damageMultiplier: 1,    speedMultiplier: 1,   defenseMultiplier: 1 },
    reincarnated: { damageMultiplier: 1.25, speedMultiplier: 1.1, defenseMultiplier: 1.08, isSpecial: true }
  },
  hasSprites: true,
  // HEIGHT-REF: canon ~184cm → target ~115px (0.623×184). idle content cell 67px → scale ≈1.71.
  // Verified/tuned against harness/height_reference.mjs in Stage 1. anchorY all 0.
  spriteScale: 1.71,
  introPool: ["intro"],   // single self-contained intro (stand → draw katana), holds final sword pose
  animationData: {
    // ── LOCOMOTION ── (re-sliced feet-aligned uniform cells)
    idle:  { frames: 6, width: 46, height: 67, speed: 8, anchorY: 0, loop: true,  sheet: "./toji_idle_uniform.png" },
    walk:  { frames: 7, width: 38, height: 66, speed: 6, anchorY: 0, loop: true,  sheet: "./toji_walk_uniform.png" },
    run:   { frames: 7, width: 38, height: 66, speed: 4, anchorY: 0, loop: true,  sheet: "./toji_walk_uniform.png" },
    // dash pose = a forward-leaning walk frame → the teleport-blur whirls HIS OWN sprite (not an FX overlay).
    dash:  { frames: 1, width: 38, height: 66, speed: 4, anchorY: 0, sourceX: 152, loop: false, lockLastFrame: true, sheet: "./toji_walk_uniform.png" },
    jump:  { frames: 7, width: 46, height: 78, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_jump_uniform.png" },
    fall:  { frames: 1, width: 46, height: 78, speed: 6, anchorY: 0, sourceX: 230, loop: false, lockLastFrame: true, sheet: "./toji_jump_uniform.png" },   // jump frame 5 (descending)
    // guard: no dedicated block art in the upload set → idle frame 0 stand-in (GAP, see asset map).
    guard: { frames: 1, width: 46, height: 67, speed: 4, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./toji_idle_uniform.png" },
    hurt:  { frames: 1, width: 36, height: 64, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./toji_hit_uniform.png" },
    knockdown: { frames: 2, width: 36, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_hit_uniform.png" },
    // ── INTRO (2-row source flattened to one strip; ends drawing the katana) ──
    intro: { frames: 36, width: 67, height: 66, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_intro_uniform.png" },
    // ── STAGE 2: base normals. The punch sheet (8f 56×66) is a full hand-combo — its frames double as the
    //   neutral light/heavy poses AND the 4 rekka stages (sourceX offsets into the same sheet). ──
    light:    { frames: 2, width: 56, height: 66, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // jab (punch f0-1)
    heavy:    { frames: 2, width: 56, height: 66, speed: 4, anchorY: 0, sourceX: 336, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // big straight (punch f6-7)
    air:      { frames: 2, width: 56, height: 66, speed: 3, anchorY: 0, sourceX: 112, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // aerial cross (punch f2-3)
    up:       { frames: 5, width: 66, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_up_attack_uniform.png" },              // rising launcher (red slash)
    down_air: { frames: 8, width: 80, height: 88, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_down_air_attack_uniform.png" },        // descending weapon swing (crescent arc)
    // ── STAGE 2: A-B-C-A+B Fwd+Heavy rekka stages (punch sheet, 2 frames each via sourceX) ──
    tojiG1:   { frames: 2, width: 56, height: 66, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // jab
    tojiG2:   { frames: 2, width: 56, height: 66, speed: 3, anchorY: 0, sourceX: 112, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // cross
    tojiG3:   { frames: 2, width: 56, height: 66, speed: 3, anchorY: 0, sourceX: 224, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // hook
    tojiG4:   { frames: 2, width: 56, height: 66, speed: 4, anchorY: 0, sourceX: 336, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" },   // A+B big straight finisher
    // ── STAGE 2: Back+Heavy "Handgun" command-normal (draw → fire; projectile-only cast) ──
    tojiGun:  { frames: 6, width: 53, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_gun_uniform.png" },
    // ── STAGE 3: sword specials ──
    // Split Soul Katana = ONE continuous 2-part combo (tojiSword1 auto-chains into tojiSword2).
    tojiSword1:     { frames: 9,  width: 94,  height: 70,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_sword_down_attack_1_uniform.png" },   // draw-slash (part 1)
    tojiSword2:     { frames: 6,  width: 74,  height: 62,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_sword_down_attack_2_uniform.png" },   // follow-up cut (part 2)
    tojiRapidSlash: { frames: 21, width: 53,  height: 73,  speed: 2, anchorY: 0, loop: true,  sheet: "./toji_rapid_sword_slashes_uniform.png" },                       // rapid multi-hit flurry (loops through the active window)
    // ── STAGE 4: Chain of a Thousand Miles / Inverted Spear of Heaven — ONE continuous 5-part sequence ──
    tojiChain1: { frames: 5, width: 98,  height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_chain_attack_1_uniform.png" },   // whip-out windup
    tojiChain2: { frames: 4, width: 140, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_chain_attack_2_uniform.png" },   // spear extends far
    tojiChain3: { frames: 5, width: 118, height: 90, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_chain_attack_3_uniform.png" },   // overhead swing arc
    tojiChain4: { frames: 7, width: 122, height: 91, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_chain_attack_4_uniform.png" },   // chain spin
    tojiChain5: { frames: 4, width: 110, height: 82, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_chain_attack_5_uniform.png" },   // Inverted Spear finisher (launches)
    // ── STAGE 5: Playful Cloud (Up Special) + Fly Heads (Back Special) ──
    tojiPlayfulCloud: { frames: 6, width: 99, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./toji_playful_cloud_dash_attack_uniform.png" },   // three-section-staff dash-strike
    tojiFlyHeads:     { frames: 2, width: 56, height: 66, speed: 4, anchorY: 0, sourceX: 336, loop: false, lockLastFrame: true, sheet: "./toji_punch_uniform.png" }           // hand-forward release gesture (reuses the punch arm-out frame)
    // Reincarnated Form (Stage 6) added later.
  }
}

// ─────────────────────────────────────────────────────────────────
// BAKI HANMA  (rosterKey "baki", universe "baki" — new "Baki the Grappler" series). Built from ONE JUS
// master sheet (baki/…dfelcrv.png), audited + row-sliced in baki_sliced/ (see BAKI_ASSET_MAP.md), then
// repacked to feet-aligned uniform cells by tools/repack_baki.py. ARCHETYPE: a PURE hand-to-hand martial
// artist — ZERO ki/chakra (maxEnergy 0, hideResourceMeter, like Toji/Maki) — a grounded rushdown grappler
// whose currency is COOLDOWN-gated recast windows, NOT a meter (Zenitsu/Rengoku model, not Toji's free
// kit). mobility very_high for the fast dash/air-dash, but speed 96 is UNDER the 98 teleport-blur gate →
// he approaches on a real run cycle (grounded), unlike Toji's blink-dash. His one "power-up," the Demon
// Back (Oni no Se), is a MUSCLE formation (not an energy aura) → the Ultimate = a timed empowered form
// (Maki Power-Charge architecture, ult-tier). All in-band, no roster records. See BAKI_BUILD_PROMPT.md.
// ─────────────────────────────────────────────────────────────────
const baki = {
  rosterKey: "baki", name: "Baki Hanma", universe: "baki", color: "#8a1c1c",
  portrait: "./baki_portrait.png",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // energyType:"none" keeps him out of all energy logic; hideResourceMeter suppresses the HUD energy
  // panel entirely (HP-only) — canon: Baki has no chakra/ki. Specials are cooldown-gated (game.updateMiscTimers).
  traits: { hasEnergy: false, energyType: "none", hideResourceMeter: true, mobility: "very_high", scaling: "aggressive", animeMovement: true },
  // In-band, NO records: HP 1160 (Tobirama 1120 < x < Maki 1180), atk 94 (below Toji 96 / Sukuna 95),
  // def 88 (upper — defensive-read game), spd 96 (ties Tobirama/Zenitsu; UNDER the 98 teleport gate → grounded).
  stats: { maxHealth: 1160, maxEnergy: 0, attack: 94, defense: 88, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 21, dashDuration: 10, dashCooldownMax: 26 },
  basic_attacks: {
    light:     { damage: 52, startup: 3, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 92, startup: 7, active: 4, recovery: 15, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 90, rangeY: 46 },
    upAttack:  { type: "launcher", damage: 76, startup: 5, active: 3, recovery: 7,  hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, launchVy: -32, selfVy: -8, airOK: false },
    airAttack: { damage: 64, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 84, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  // Specials/ultimate DESCRIBED here (object completeness); wired in abilities.js (executeBakiSpecial + Demon Back).
  specials: {
    machPunchBarrage: { cost: 0, effect: "Neutral: rapid multi-hit straight-punch barrage (one long active window, hasHit re-arms — pins). Cooldown-gated, no energy." },
    rushingCombo:     { cost: 0, effect: "Fwd: advancing rush → committed strike (gap-closer, superArmor through the dash). Cooldown-gated." },
    risingRush:       { cost: 0, effect: "Up: anti-air rising launcher with startup i-frames (DP). Cooldown-gated." },
    impactShockwave:  { cost: 0, effect: "Down: full-power straight with a short-range air-pressure AOE (wide rangeX). Cooldown-gated." },
    defensiveRead:    { cost: 0, effect: "Back: Defensive Read counter stance — negates an incoming melee hit in the window and ripostes (combat.shouldBakiCounter). Cooldown-gated." }
  },
  ultimate: { name: "Demon Back (Oni no Se)", cost: 0, description: "Meterless. A timed empowered FORM (not a strike): Baki flexes and the demon-face muscle formation surfaces on his back → dmg ×1.30 / spd ×1.12 for ~12s, then auto-reverts. Maki Power-Charge architecture at ultimate tier; universal ultimateCooldown gates recast." },
  transformationOrder: ["base"],
  transformations: {
    base:      { damageMultiplier: 1,    speedMultiplier: 1,    defenseMultiplier: 1 },
    demonBack: { damageMultiplier: 1.30, speedMultiplier: 1.12, defenseMultiplier: 1.08, isSpecial: true }
  },
  hasSprites: true,
  // HEIGHT-REF (see HEIGHT_REFERENCE.md): canon 170cm → target 0.623×170 ≈ 106px. Measured via
  // __harness.measureSprite: idle contentH 54px raw → scale 1.97 lands ~106px (was mis-rendering at
  // native 54px because SKINS[baki] was missing → getSkins() spriteScale:1 fallback clobbered it;
  // fixed by the baki default-skin entry in skins.js, same Yuji/Goku/Naruto fix). anchorY all 0.
  spriteScale: 1.97,
  introPool: ["intro"],   // single self-contained intro (confident ready-up — reuses the WIN pose art; no dedicated intro strip)
  animationData: {
    // ── movement / state (repacked feet-aligned uniform cells, anchorY 0) ──
    idle:  { frames: 8, width: 40, height: 56, speed: 8, anchorY: 0, loop: true,  sheet: "./baki_idle_uniform.png" },
    walk:  { frames: 7, width: 35, height: 63, speed: 6, anchorY: 0, loop: true,  sheet: "./baki_walk_uniform.png" },
    run:   { frames: 8, width: 47, height: 48, speed: 4, anchorY: 0, loop: true,  sheet: "./baki_run_uniform.png" },
    dash:  { frames: 2, width: 60, height: 39, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_dash_uniform.png" },
    jump:  { frames: 5, width: 45, height: 56, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_jump_uniform.png" },
    fall:  { frames: 1, width: 45, height: 56, speed: 6, anchorY: 0, sourceX: 180, loop: false, lockLastFrame: true, sheet: "./baki_jump_uniform.png" },   // jump frame 5 (descending)
    guard: { frames: 3, width: 40, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_guard_uniform.png" },
    hurt:  { frames: 3, width: 51, height: 54, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_hit_uniform.png" },
    knockdown: { frames: 6, width: 61, height: 54, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_knockdown_uniform.png" },
    win:   { frames: 4, width: 39, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_win_uniform.png" },
    lose:  { frames: 3, width: 23, height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_lose_uniform.png" },
    intro: { frames: 4, width: 39, height: 63, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_win_uniform.png" },   // reuses the confident WIN pose (no dedicated intro art)
    // ── 5 normals ──
    light:    { frames: 7, width: 61, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_light_uniform.png" },     // jab-cross-hook string (red impact FX)
    heavy:    { frames: 6, width: 46, height: 47, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_heavy_uniform.png" },     // committed body blow
    up:       { frames: 4, width: 47, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_up_uniform.png" },        // uppercut launcher
    air:      { frames: 6, width: 63, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_air_uniform.png" },        // neutral aerial
    down_air: { frames: 6, width: 68, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_downair_uniform.png" },    // diving kick spike
    // ── Fwd+Heavy "Combination" rekka (2 stages) ──
    bakiG1: { frames: 6, width: 47, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_g1_uniform.png" },           // double body jab (opener)
    bakiG2: { frames: 7, width: 53, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_g2_uniform.png" },           // rising hook/kick (launcher finisher)
    // ── specials ──
    bakiBarrage:   { frames: 7,  width: 63,  height: 61, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_barrage_uniform.png" },    // Mach-Punch Barrage (neutral, multi-hit) — 7 real frames (row_17 had 2 TOUCHING pairs auto-merged into "two-Baki" double-cells; re-split at measured valleys)
    bakiRush:      { frames: 13, width: 88,  height: 73, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_rush_uniform.png" },        // Rushing Combination (Fwd, gap-closer → spin-kick)
    bakiRising:    { frames: 6,  width: 53,  height: 47, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_rising_uniform.png" },      // Rising Rush (Up, DP launcher)
    bakiShockwave: { frames: 4,  width: 148, height: 79, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./baki_shockwave_uniform.png" },   // Impact Shockwave (Down, air-pressure AOE)
    // ── ultimate: Demon Back flex pose (held through activation) ──
    bakiDemonBack: { frames: 3, width: 58, height: 57, speed: 5, anchorY: 0, loop: true, sheet: "./baki_demonback_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// KASUMI MIWA  (rosterKey "miwa", universe "jujutsu_kaisen"). Source art = the
// `kasumi_*` upload set (filenames preserved verbatim, incl. the "charg" truncation)
// + a labelled master sheet (kasumi_transparent.png) whose Air/Stand-Guard and
// Drinking sections have no individual export → cropped straight from the master
// (real alpha, so no background-distance keying needed). Non-uniform strips are
// RE-SLICED to feet-aligned `kasumi_*_uniform.png` cells (tools/reslice_strip.mjs);
// originals kept untouched. See MIWA_ASSET_MAP.md. Archetype: KATANA battojutsu
// swordfighter — a grounded, technical sword user (mid-tier JJK; below the big-three
// damage). Stage 1 = registration + movement/state; normals/chain (S2), specials (S3),
// Ultimate (S4) land in later stages.
// ─────────────────────────────────────────────────────────────────
const miwa = {
  rosterKey: "miwa", name: "Kasumi Miwa", universe: "jujutsu_kaisen", color: "#3aa0d8",
  portrait: "./kasumi_portrait.png",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // Cursed-energy sorcerer, but a modest one — a smaller pool than the big-three JJK casters
  // (Gojo/Sukuna 210-220, Megumi 210); her power is skill/battojutsu, not raw cursed output.
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "technical", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 160, attack: 86, defense: 84, speed: 93, maxJumps: 2, jumpPower: 32, dashSpeed: 19, dashDuration: 10, dashCooldownMax: 28 },
  // Base normals (sword slashes) — gameplay numbers now; the dedicated attack sprites + the
  // command-normal chain are wired in Stage 2. Sword tuning: fast light, committal heavy.
  basic_attacks: {
    light:     { damage: 44, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 78, startup: 7, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 96, rangeY: 46 },
    upAttack:  { type: "launcher", damage: 62, startup: 6, active: 4, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    airAttack: { damage: 54, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  ultimate: { name: "Blade of the Neophyte", cost: 100, description: "Battojutsu quick-draw freeze-cinematic — a single guaranteed cursed-energy slash (windup → explosive draw). Costs 100 cursed energy." },
  hasSprites: true,
  spriteScale: 2.144,   // HEIGHT-REF: canon ~178cm (est — not well-documented) → target ~111px (was 1.7, measured only 88px = −21% too short). See HEIGHT_REFERENCE.md §6; all anchorY are 0 so unchanged.
  introPool: ["intro1", "intro2", "intro3", "intro4"],   // random-cycle pool (§8)
  animationData: {
    // ── LOCOMOTION ──
    idle:  { frames: 4, width: 54, height: 55, speed: 8, anchorY: 0, loop: true, sheet: "./kasumi_idle_uniform.png" },
    walk:  { frames: 8, width: 48, height: 54, speed: 6, anchorY: 0, loop: true, sheet: "./kasumi_run_uniform.png" },
    run:   { frames: 8, width: 48, height: 54, speed: 4, anchorY: 0, loop: true, sheet: "./kasumi_run_uniform.png" },
    dash:  { frames: 2, width: 55, height: 57, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_dash_uniform.png" },
    jump:  { frames: 6, width: 48, height: 69, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_jump_uniform.png" },
    fall:  { frames: 1, width: 48, height: 69, speed: 6, anchorY: 0, sourceX: 192, loop: false, lockLastFrame: true, sheet: "./kasumi_jump_uniform.png" },  // jump frame 4 (descending)
    // ── STATE ── (engine maps DOWN→block→guard; there is no separate crouch state, but the crouch
    //   pose is extracted + kept as `crouch` for completeness/future use.)
    guard: { frames: 1, width: 31, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_guard_uniform.png" },
    crouch:{ frames: 2, width: 50, height: 49, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_crouch_uniform.png" },
    hurt:  { frames: 3, width: 59, height: 53, speed: 5, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./kasumi_hit_uniform.png" },   // frames 0-2 (stagger)
    knockdown: { frames: 3, width: 59, height: 53, speed: 6, anchorY: 0, sourceX: 236, loop: false, lockLastFrame: true, sheet: "./kasumi_hit_uniform.png" }, // frames 4-6 (down → getup)
    // ── RANDOM-CYCLE INTRO POOL (§8) — one picked per match start ──
    intro1: { frames: 9, width: 50, height: 62, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_intro_1_uniform.png" },
    intro2: { frames: 6, width: 41, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_intro_2_uniform.png" },
    intro3: { frames: 7, width: 41, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_intro_3_uniform.png" },
    intro4: { frames: 7, width: 41, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_intro_4_uniform.png" },
    // ── STAGE 2: base normals (katana slashes) — 5 cleanest slots ──
    light:    { frames: 5, width: 105, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_attack_2_uniform.png" },        // fast horizontal slash
    heavy:    { frames: 6, width: 83,  height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_attack_1_uniform.png" },        // committal overhead vertical slash
    up:       { frames: 7, width: 79,  height: 94, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_up_attack_uniform.png" },       // rising launcher (5 swing + 2 sheathe/recovery, §7)
    air:      { frames: 4, width: 67,  height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_air_attack_1_uniform.png" },    // aerial slash (FX debris dropped via --minw)
    down_air: { frames: 4, width: 78,  height: 78, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_down_air_attack_uniform.png" }, // downward aerial slash
    // ── STAGE 2: "Battojutsu Rush" command chain (Fwd+Heavy opener → re-tap Heavy on a clean hit) ──
    //   The remaining ground attack strips (attack_3 low lunge → attack_4 dash-thrust → up_air rising slash).
    miwaG1:   { frames: 5, width: 68,  height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_attack_3_uniform.png" },        // low lunge opener
    miwaG2:   { frames: 5, width: 103, height: 61, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_attack_4_uniform.png" },        // dash-thrust mid
    miwaG3:   { frames: 4, width: 105, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_up_air_attack_uniform.png" },   // rising slash finisher
    // ── STAGE 3: specials ──
    charge:   { frames: 5, width: 57, height: 72, speed: 6, anchorY: 0, loop: true, sheet: "./kasumi_charg_uniform.png" },                                  // cursed-energy charge stance (raised glowing sword — battojutsu ready)
    iaiDash:  { frames: 3, width: 55, height: 48, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_ultimate_dash_attack_uniform.png" }, // Iai Dash gap-closer (first 3 frames only, §6)
    airVortex:{ frames: 2, width: 66, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_super_rapid_air_attack_uniform.png" }, // Rapid Slash Vortex — CHARACTER slash frames (the vortex FX is a SEPARATE overlay layer, §10)
    // ── STAGE 4: Ultimate — "Blade of the Neophyte" battojutsu quick-draw. ONE continuous clip (§5):
    //   part_1 (windup, sword drawn back) → part_2 (explosive forward slash) stitched into 8 frames.
    ultimate: { frames: 8, width: 69, height: 48, speed: 10, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kasumi_super_ultimate_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// GHOSTFACE  (rosterKey "ghostface", universe "horror" — first horror-universe
// sprite char). Source art = 16 CVS-style `cvs_ghost_face_*.png` strips (idle,
// sneak/walk, jump, blocks, hit, foward_attack, up_attack, charge_attack,
// down_air, crouch_stance_attack, taunt, crouch) + a 636×1057 master sheet.
// Non-uniform strips RE-SLICED to feet-aligned `ghostface_*_uniform.png` cells
// (tools/reslice_strip.mjs); three touching-figure attack sheets (slash, lowslash,
// downair) were density-split by a bespoke repacker. See GHOSTFACE_ASSET_MAP.md.
// Archetype: knife STALKER — fast, fragile-ish rushdown with a low-slash command
// chain, a gap-closing gutting lunge that leaves a BLEED DoT, and a freeze-cinematic
// stab-flurry Ultimate. The signature Call-In companion special (skin-gated pools)
// lands in a later stage; the Stage-1 build is the standard normals/chain/specials/Ultimate.
// ─────────────────────────────────────────────────────────────────
const ghostface = {
  rosterKey: "ghostface", name: "Ghostface", universe: "horror", color: "#1c2030",
  portrait: "./ghostface_portrait.png",   // cropped from idle frame 0 (Stage 1; falls back cleanly if absent pre-crop).
  archetypes: ["rushdown", "technical"],
  primary: "rushdown", secondary: ["technical"],
  traits: { hasEnergy: true, energyType: "dread", mobility: "high", scaling: "combo", animeMovement: false },
  // STALKER SLASHER — fast, mixup-heavy knife rushdown; human-fragile but mobile, with bleed
  // attrition rather than raw burst. vs roster: Killua HP1030/atk84/def78/spd95 (glass assassin),
  // Batman HP1080/atk86/def88/spd92 (disciplined mid), Flash HP1020/spd99 (glass speedster).
  // Ghostface sits fragile-fast: HP1040 (low, above Killua/Flash), atk85 (moderate), def80
  // (low-mid — a masked human, not armored), spd95 (fast, ties Killua; below Toji98/Flash99).
  // No stat is an outlier. maxEnergy 100 = Dread meter (specials + Ultimate).
  stats: { maxHealth: 1040, maxEnergy: 100, attack: 85, defense: 80, speed: 95, maxJumps: 2, jumpPower: 32, dashSpeed: 20, dashDuration: 9, dashCooldownMax: 30 },
  // data keys map to sprite keys: upAttack→up, airAttack→air, downAir→down_air. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 34, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 66, startup: 7, active: 3, recovery: 17, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 104, rangeY: 48 },
    upAttack: { type: "launcher", damage: 54, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); fragile fast rushdown stalker
    airAttack:{ damage: 46, startup: 4, active: 2, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 58, startup: 6, active: 3, recovery: 12, hitstun: 16, knockbackX: 1, knockbackY: 10 }
  },
  // HUD-only until wired in abilities.js (real logic + cost there). Direction-branched Special.
  specials: {
    guttingLunge: { cost: 25, damage: 50, startup: 6, active: 4, recovery: 16, hitstun: 20, knockbackX: 6, knockbackY: -4, effect: "dashing knife lunge (gap-closer) — leaves a BLEED DoT on a clean hit" },
    lowGut:       { cost: 20, damage: 42, startup: 6, active: 3, recovery: 18, hitstun: 22, knockbackX: 4, knockbackY: -1, effect: "low sweeping gut-slash — trips (knockdown) on hit" },
    stalkVanish:  { cost: 15, damage: 0,  startup: 2, active: 0, recovery: 18, effect: "backstep with brief i-frames — stalk/reposition, no damage" }
  },
  ultimate: { name: "The Final Act", cost: 100, description: "Freeze-cinematic — Ghostface stalks in and unleashes a guaranteed flurry of stabs (range-independent; blocked → 25%)." },
  hasSprites: true,
  // idle content ~116px tall × 1.15 ≈ 133px on-screen (upper roster band — an imposing stalker).
  // Ghostface has NO default skin — each of the 5 killer-identity skins sets spriteScale explicitly, and
  // applySkin resolves any non-identity id to one of them (getSkin's list[0] fallback is a killer, not a
  // spriteScale:1 default). Plus the spritesheets.js idle gate.
  spriteScale: 0.982,   // HEIGHT-REF: canon ~178cm (EST — no single canon height; the mask is worn by different actors across the films, so an average adult male default) → target ~111px (was 1.15, measured 130px = +17% too tall — rendered TALLER than Sasuke/Naruto; now correctly only mildly taller). See HEIGHT_REFERENCE.md §6; all anchorY are 0.
  animationData: {
    // ── MOVEMENT / STATE. Re-sliced to uniform feet-aligned cells (reslice_strip.mjs). ──
    idle:  { frames: 3, width: 75,  height: 116, speed: 8, anchorY: 0, sheet: "./ghostface_idle_uniform.png" },   // hunched breathing loop
    walk:  { frames: 4, width: 80,  height: 115, speed: 6, anchorY: 0, sheet: "./ghostface_walk_uniform.png" },   // stalking creep (from sneak)
    run:   { frames: 4, width: 80,  height: 115, speed: 4, anchorY: 0, sheet: "./ghostface_walk_uniform.png" },   // same sheet, faster
    dash:  { frames: 4, width: 80,  height: 115, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_walk_uniform.png" },
    jump:  { frames: 2, width: 105, height: 118, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_jump_uniform.png" },
    fall:  { frames: 1, width: 105, height: 118, speed: 6, anchorY: 0, sourceX: 105, loop: false, lockLastFrame: true, sheet: "./ghostface_jump_uniform.png" },   // apex/descent = jump frame 1
    guard: { frames: 1, width: 82,  height: 108, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_guard_uniform.png" },   // cloak-brace block
    hurt:  { frames: 1, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./ghostface_hit_uniform.png" },   // recoil flinch = hit frame 0
    knockdown: { frames: 3, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 122, loop: false, lockLastFrame: true, sheet: "./ghostface_hit_uniform.png" },   // crumple→prone→getup = hit frames 1-3
    crouch: { frames: 2, width: 79, height: 102, speed: 8, anchorY: 0, loop: true, sheet: "./ghostface_crouch_uniform.png" },
    charge: { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: true, sheet: "./ghostface_taunt_uniform.png" },   // hold-to-charge = menacing knife beckon (reuses taunt)
    taunt:  { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_taunt_uniform.png" },
    // ── NORMALS (5 slots). Play once, hold last frame. ──
    light:    { frames: 3, width: 103, height: 110, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_slash_uniform.png" },    // quick standing knife swipes
    heavy:    { frames: 1, width: 125, height: 115, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_charge_uniform.png" },   // committed lunging power-stab (long reach)
    up:       { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_up_uniform.png" },       // overhead knife launcher
    air:      { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_up_uniform.png" },       // aerial overhead slash (reuse up)
    down_air: { frames: 3, width: 107, height: 128, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_downair_uniform.png" },  // aerial dive-stab
    // ── COMMAND-NORMAL CHAIN — "Slasher Frenzy" (Down+Heavy rekka, cancel-on-hit; Batman architecture).
    // The 3-frame low-slash sheet split into 3 cancelable stages. currentMove = ghostfaceComboN → sheet. ──
    ghostfaceCombo1: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./ghostface_lowslash_uniform.png" },
    ghostfaceCombo2: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 97,  loop: false, lockLastFrame: true, sheet: "./ghostface_lowslash_uniform.png" },
    ghostfaceCombo3: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 194, loop: false, lockLastFrame: true, sheet: "./ghostface_lowslash_uniform.png" },
    // ── SPECIAL cast poses (SPECIAL button, direction-branched via _specialHeldDir). ──
    gfLunge:  { frames: 1, width: 125, height: 115, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_charge_uniform.png" },   // Gutting Lunge (neutral/F): dashing stab
    gfLowCut: { frames: 3, width: 97,  height: 88,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_lowslash_uniform.png" },  // Low Gut (D): sweeping low slash
    // Stalk Vanish (B) is FX-only (poof + i-frames), no cast pose.
    // Call-In (Neutral Special) beckon pose — the "come here" knife gesture (reuses taunt sheet).
    gfCallIn: { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_taunt_uniform.png" },
    // ── ULTIMATE cast pose — "The Final Act" stab-flurry, held through the frozen cinematic. ──
    gfUlt:    { frames: 3, width: 103, height: 110, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_slash_uniform.png" }
  },
  introPool: ["idle"]   // no dedicated intro art in the batch → stand in idle
}

// ─────────────────────────────────────────────────────────────────
// BILLY GHOSTFACE  (rosterKey "ghostface_billy", universe "horror") — the FIRST of the 12
// "[Killer] Ghostface" variants to go LIVE (registered here; the other 11 remain NEEDS_DESIGN
// and UNREGISTERED in ghostfaceVariantKit.js). Billy Loomis behind the mask — the calculated
// mastermind. He renders on the REAL Billy-identity art (ghostface_*_uniform__billy.png, the
// pre-baked crimson "Founder's Mask" slice), NOT the neutral placeholder. Kit = the shared
// Ghostface base (stats/normals mirror the original) + working knife Special + The Final Act
// ultimate (reuses the un-gated shared helpers in abilities.js — executeBillyGhostfaceSpecial/
// Ultimate). His UNIQUE reactive Delayed Counter-Stab / The Last Reveal are designed in
// ghostfaceVariantKit.js and need reactive-combat wiring — a flagged follow-up, not stubbed here.
// ─────────────────────────────────────────────────────────────────
const ghostface_billy = {
  rosterKey: "ghostface_billy", name: "Billy Ghostface", universe: "horror", color: "#6E1520",
  portrait: "./ghostface_portrait__billy.png",   // real Billy-identity bust (crimson slice)
  archetypes: ["rushdown", "technical"],
  primary: "rushdown", secondary: ["technical"],
  traits: { hasEnergy: true, energyType: "dread", mobility: "high", scaling: "combo", animeMovement: false },
  // Mirrors the original Ghostface base stats (BASE_STATS in ghostfaceVariantKit.js) — fragile-fast stalker.
  stats: { maxHealth: 1040, maxEnergy: 100, attack: 85, defense: 80, speed: 95, maxJumps: 2, jumpPower: 32, dashSpeed: 20, dashDuration: 9, dashCooldownMax: 30 },
  basic_attacks: {
    light:    { damage: 34, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 66, startup: 7, active: 3, recovery: 17, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 104, rangeY: 48 },
    upAttack: { type: "launcher", damage: 54, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: -8, airOK: false },
    airAttack:{ damage: 46, startup: 4, active: 2, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 58, startup: 6, active: 3, recovery: 12, hitstun: 16, knockbackX: 1, knockbackY: 10 }
  },
  // Real logic in abilities.js (executeBillyGhostfaceSpecial): Fwd/neutral = Gutting Lunge (bleed), Down = Low Gut (knockdown).
  specials: {
    guttingLunge: { cost: 25, damage: 50, startup: 6, active: 4, recovery: 16, hitstun: 20, knockbackX: 6, knockbackY: -4, effect: "dashing knife lunge (gap-closer) — leaves a BLEED DoT on a clean hit" },
    lowGut:       { cost: 20, damage: 42, startup: 6, active: 3, recovery: 18, hitstun: 22, knockbackX: 4, knockbackY: -1, effect: "low sweeping gut-slash — trips (knockdown) on hit" }
  },
  ultimate: { name: "The Final Act", cost: 100, description: "Freeze-cinematic — Billy stalks in and unleashes a guaranteed flurry of stabs (range-independent; blocked → 25%)." },
  hasSprites: true,
  spriteScale: 0.982,
  animationData: {
    idle:  { frames: 3, width: 75,  height: 116, speed: 8, anchorY: 0, sheet: "./ghostface_idle_uniform__billy.png" },
    walk:  { frames: 4, width: 80,  height: 115, speed: 6, anchorY: 0, sheet: "./ghostface_walk_uniform__billy.png" },
    run:   { frames: 4, width: 80,  height: 115, speed: 4, anchorY: 0, sheet: "./ghostface_walk_uniform__billy.png" },
    dash:  { frames: 4, width: 80,  height: 115, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_walk_uniform__billy.png" },
    jump:  { frames: 2, width: 105, height: 118, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_jump_uniform__billy.png" },
    fall:  { frames: 1, width: 105, height: 118, speed: 6, anchorY: 0, sourceX: 105, loop: false, lockLastFrame: true, sheet: "./ghostface_jump_uniform__billy.png" },
    guard: { frames: 1, width: 82,  height: 108, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_guard_uniform__billy.png" },
    hurt:  { frames: 1, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./ghostface_hit_uniform__billy.png" },
    knockdown: { frames: 3, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 122, loop: false, lockLastFrame: true, sheet: "./ghostface_hit_uniform__billy.png" },
    crouch: { frames: 2, width: 79, height: 102, speed: 8, anchorY: 0, loop: true, sheet: "./ghostface_crouch_uniform__billy.png" },
    charge: { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: true, sheet: "./ghostface_taunt_uniform__billy.png" },
    taunt:  { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_taunt_uniform__billy.png" },
    light:    { frames: 3, width: 103, height: 110, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_slash_uniform__billy.png" },
    heavy:    { frames: 1, width: 125, height: 115, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_charge_uniform__billy.png" },
    up:       { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_up_uniform__billy.png" },
    air:      { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_up_uniform__billy.png" },
    down_air: { frames: 3, width: 107, height: 128, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_downair_uniform__billy.png" },
    // SPECIAL cast poses (direction-branched in executeBillyGhostfaceSpecial).
    gfLunge:  { frames: 1, width: 125, height: 115, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_charge_uniform__billy.png" },
    gfLowCut: { frames: 3, width: 97,  height: 88,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_lowslash_uniform__billy.png" },
    // ULTIMATE cast pose — held through The Final Act cinematic.
    gfUlt:    { frames: 3, width: 103, height: 110, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ghostface_slash_uniform__billy.png" }
  },
  introPool: ["idle"]
}

// ─────────────────────────────────────────────────────────────────
// JASON VOORHEES  (rosterKey "jason", universe "horror" — 2nd horror char after Ghostface).
// Source = xxultra2006xx DeviantArt sheet (attribution MANDATORY, see credits.js). A genuinely
// LEAN kit given sparse source art: 5 normals + 2 crouch swaps, ONE lean special (Stage 3), and
// NO ultimate (no art exists — flagged open gap, NOT a placeholder). Non-uniform source strips
// RE-SLICED to feet-aligned jason_*_uniform.png cells (tools/reslice_jason.py, which force-splits
// the 4 touching-frame sheets the audit flagged: walk/slash_1/slash_2/slash_1_crouch). Filename
// typos preserved from source (jason_idl, foward_*). See JASON_ASSET_MAP.md.
//
// ARCHETYPE: slow, hard-hitting STALKER — the horror-movie killer who lumbers but hits like a
// truck and refuses to die. High HP/defense, top-tier damage, LOWEST speed on the roster. The
// deliberate inverse of Ghostface (fast/fragile stalker) — same universe, opposite tempo.
//
// FALLBACK STATES (per spec — reuse the engine's existing generic systems, no new fallback logic):
//   guard/block → missing-action fallback renders the idle brace (SpriteHandler safe-fallback);
//   dash → walk sheet (lumbering, no dedicated dash-blur art — FLAG for later dash art);
//   throw/grab → grab reuses the light-jab windup pose so it renders a real pose not idle;
//   win/taunt → idle fallback (no dedicated pose art); death/KO → knockdown (grounded, frames 5-6).
//   back-walk → engine facing-flip of walk (same as the rest of the roster). turnaround → instant flip.
// ─────────────────────────────────────────────────────────────────
const jason = {
  rosterKey: "jason", name: "Jason Voorhees", universe: "horror", color: "#20241c",
  portrait: "./jason_portrait.png",   // Stage 4 — cropped from idle frame 0; falls back cleanly (procedural box) until then.
  archetypes: ["grappler", "heavy"],
  primary: "heavy", secondary: ["grappler"],
  traits: { hasEnergy: true, energyType: "bloodlust", mobility: "low", scaling: "damage", animeMovement: false },
  passive: { name: "Unstoppable", effect: "Bloodlust builds steadily through combat — the machete never tires; fuels his lone Relentless Slash." },
  // SLOW/HARD-HITTING SLASHER. vs roster: Zaraki HP1240/spd88 (brute), Sukuna 1240/atk95, Red Ranger
  // 1200/atk93/def86/spd92, Ghostface (same universe) 1040/atk85/def80/spd95 (the fast fragile inverse).
  // Jason: HP1250 (ties the tank-top — an unkillable slasher), atk96 (top damage, edges Sukuna 95 — the
  // low speed is the tradeoff), def90 (very durable), spd72 (the ROSTER-LOW — the defining stalker trait,
  // 16 below the next-slowest). Deliberate slow-heavy outlier PROFILE that trades mobility for damage/bulk
  // (fair, not strictly-better — verified vs BALANCE_AUDIT.md in Stage 4). maxEnergy 80 = Bloodlust meter.
  stats: { maxHealth: 1250, maxEnergy: 80, attack: 96, defense: 90, speed: 72, maxJumps: 2, jumpPower: 28, dashSpeed: 13, dashDuration: 8, dashCooldownMax: 42 },
  // data keys map to sprite keys: upAttack→up, airAttack→air, downAir→down_air. combat.js _getMD reads THIS.
  // Slow startup / long recovery / heavy knockback — every swing is a committed machete blow. Refined Stage 2.
  basic_attacks: {
    light:    { damage: 44, startup: 6, active: 2, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: 0 },                                   // standing machete jab (foward_punch)
    heavy:    { damage: 98, startup: 11, active: 4, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: 1, rangeX: 116, rangeY: 52, superArmor: true },   // overhead machete swing (slash_1) — armored commit
    upAttack: { type: "launcher", damage: 68, startup: 9, active: 3, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -28, selfVy: 0, airOK: false },   // slash_2 repurposed as launcher (see Stage-2 read-flag)
    airAttack:{ damage: 56, startup: 6, active: 2, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2, rangeX: 92, rangeY: 66 },           // air machete swipe (foward_punch_air) — long blade reach
    downAir:  { damage: 74, startup: 8, active: 3, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11, rangeX: 86, rangeY: 88 }            // aerial blade-extend spike (down_air_attack) — tall downward hitbox
  },
  // Crouch-context normal swaps (same input, triggered by crouch state) — wired Stage 2 via the
  // engine's crouch-variant resolve. Data mirrors the standing values (a crouching hit isn't a
  // different move numerically, just a different pose). crouching-up falls back to standing slash_2.
  // ONE lean special (Stage 3). "Relentless Slash" = a heavier, higher-commit version of the overhead
  // machete heavy (reuses slash_1 art via the jRelentless cast pose). Distinguished from the normal heavy
  // NOT by new animation but by feel: a committed forward LUNGE (the heavy is planted), a much bigger
  // machete arc, far higher damage, a heavy diagonal blow-back, super armor, a Bloodlust cost, and a
  // heavier cast (camera shake + red flash). Neutral Special (no direction branch). Real logic in abilities.js.
  specials: {
    relentlessSlash: { cost: 35, damage: 140, startup: 13, active: 5, recovery: 26, hitstun: 26, knockbackX: 12, knockbackY: -8, rangeX: 140, rangeY: 92, isSpecial: true, effect: "committed lunging machete power-slash — huge reach, super armor, heavy blow-back (Bloodlust)" }
  },
  // ULTIMATE: none. No ultimate art exists in this sparse sheet — flagged OPEN GAP, not a placeholder.
  hasSprites: true,
  // idle content ~116px tall. Jason is canonically a hulking ~1.93m+ slasher → render slightly TALLER
  // than the human roster. 116 × 1.15 ≈ 133px on-screen (imposing, ties Ghostface's rendered height band).
  spriteScale: 1.15,
  animationData: {
    // ── MOVEMENT / STATE. Re-sliced to uniform feet-aligned cells (tools/reslice_jason.py). anchorY 0. ──
    idle:  { frames: 6,  width: 71,  height: 116, speed: 8, anchorY: 0, sheet: "./jason_idle_uniform.png" },
    walk:  { frames: 10, width: 84,  height: 113, speed: 6, anchorY: 0, sheet: "./jason_walk_uniform.png" },
    run:   { frames: 10, width: 84,  height: 113, speed: 5, anchorY: 0, sheet: "./jason_walk_uniform.png" },   // same sheet, faster (Jason has no run art — lumbers)
    dash:  { frames: 10, width: 84,  height: 113, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_walk_uniform.png" },   // FALLBACK: walk pose (no dash-blur art — flag for later)
    jump:  { frames: 3,  width: 72,  height: 125, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_jump_uniform.png" },
    fall:  { frames: 1,  width: 72,  height: 125, speed: 6, anchorY: 0, sourceX: 144, loop: false, lockLastFrame: true, sheet: "./jason_jump_uniform.png" },   // descent = jump frame 2
    // hit sheet = 6 uniform frames: [0-3] hit-react stagger, [4-5] grounded/lying knockdown (sourceX split).
    hurt:      { frames: 4, width: 123, height: 121, speed: 5, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./jason_hit_uniform.png" },
    knockdown: { frames: 2, width: 123, height: 121, speed: 6, anchorY: 0, sourceX: 492, loop: false, lockLastFrame: true, sheet: "./jason_hit_uniform.png" },   // frames 4-5 → sourceX 4×123
    // ── STAGE-2 NORMALS (5 slots) + crouch swaps (crouchLight/crouchHeavy resolved by crouch state). ──
    light:    { frames: 2, width: 112, height: 133, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_light_uniform.png" },
    heavy:    { frames: 4, width: 166, height: 140, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_heavy_uniform.png" },
    up:       { frames: 3, width: 88,  height: 113, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_up_uniform.png" },
    air:      { frames: 2, width: 108, height: 113, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_air_uniform.png" },
    down_air: { frames: 2, width: 147, height: 121, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_down_air_uniform.png" },
    crouchLight: { frames: 2, width: 112, height: 113, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_crouch_light_uniform.png" },
    crouchHeavy: { frames: 4, width: 163, height: 122, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_crouch_heavy_uniform.png" },
    // grab reuses the light-jab windup so the universal O-grab renders a real reaching pose, not idle.
    grab:     { frames: 2, width: 112, height: 133, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_light_uniform.png" },
    // STAGE-3 SPECIAL cast pose — "Relentless Slash" reuses the overhead-swing heavy art (slash_1), held
    // through the committed lunge. Slightly slower speed than the normal heavy so it reads heavier/weightier.
    jRelentless: { frames: 4, width: 166, height: 140, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./jason_heavy_uniform.png" }
  },
  introPool: ["idle"]   // no dedicated intro art → stand in idle
}

// ─────────────────────────────────────────────────────────────────
// HIRUZEN SARUTOBI  (rosterKey "hiruzen", universe "naruto" — the Third Hokage, "The Professor").
// A VETERAN/TECHNIQUE-MASTER archetype: aged-but-legendary shinobi, NOT a young rushdown brawler.
// Balanced/defensive with real punish tools — high defense is his identity, mid attack (he wins on
// technique + reads, not raw power), low-mid speed (aged). Sparse native sheet (idle/run/dash/jump/
// back_jump/block/hit/intro + one combo string + a SPIN) deliberately supplemented with bespoke,
// self-contained BORROWED-JUTSU specials (reflavors of Madara's Katon/Mokuton architectures + an Enma
// transformation-buff), plus a Reaper Death Seal cinematic ULT — the same architecture-reuse discipline
// used for Pain's assists / Zaraki's Yachiru (does NOT share live code/state with the source char).
// ART: watermark-cleaned dash/jump/back_jump (DeviantArt polygon+username removed; originals in
// _hiruzen_raw_backup/), RE-SLICED to feet-aligned hiruzen_*_uniform.png via tools/reslice_hiruzen.py
// (folds the shunshin-ghost dash frame, the rope-crossing back_jump split, and the 2-row intro sheet).
// See HIRUZEN_ASSET_MAP.md. Stage 1 = movement/state + 2-part intro; normals/SPIN Stage 2; specials
// Stage 3; ult Stage 4. Filename typos in the raw art (color_palletts, back_jump) are preserved in
// references only — the corrected master label "SPIN" (never "roll") is used everywhere in code/UI.
const hiruzen = {
  rosterKey: "hiruzen", name: "Hiruzen Sarutobi", universe: "naruto", color: "#6b4a2f",
  portrait: "./hiruzen_portrait.png",   // Stage 5 — cropped from an intro/idle frame; falls back cleanly (procedural box) until then.
  archetypes: ["technician", "balanced"],
  primary: "melee", secondary: ["zoner"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "medium", scaling: "technique", animeMovement: true },
  passive: { name: "The Professor", effect: "Master of every jutsu — a deep, versatile toolkit (borrowed Fire/Earth releases, the Monkey King staff) backed by veteran defense and hard punishes rather than raw speed." },
  // VETERAN/TECHNIQUE-MASTER PROFILE (vs BALANCE_AUDIT.md roster): HP1180 (Naruto/Sasuke tier — durable
  // veteran, well below the tanks Jason1250/Isshiki1300/Madara1220), atk88 (Naruto/Sasuke tier — mid, wins
  // on technique NOT power; top band is 95-100), def90 (HIGH — his defining stat, ties Jason/Isshiki, just
  // under Madara/Hashirama 92: the hard-to-crack professor), spd84 (LOW-MID — aged: below the young
  // brawlers 88-98, above the lumberers Jason72/Netero... — deliberately NOT rushdown per the design).
  // maxEnergy 140 = a measured chakra pool (efficient technique, aged reserves) — enough to run his
  // borrowed-jutsu kit + ult without spamming. NO stat is a roster outlier; no strictly-better profile.
  stats: { maxHealth: 1180, maxEnergy: 140, attack: 88, defense: 90, speed: 84, maxJumps: 2, jumpPower: 27, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 40 },
  // Stage-1 placeholder combat data (movement/state focus). Stage 2 wires the real punches.png combo
  // string to light/heavy; up/air/down_air are CONFIRMED ART GAPS → generic-fallback poses (flagged).
  basic_attacks: {
    light:    { damage: 30, startup: 6,  active: 2, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 62, startup: 12, active: 3, recovery: 20, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 100, rangeY: 48 },
    upAttack: { type: "launcher", damage: 48, startup: 9, active: 3, recovery: 17, hitstun: 18, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: 0, airOK: false },
    airAttack:{ damage: 42, startup: 7,  active: 2, recovery: 12, hitstun: 13, knockbackX: 3, knockbackY: -2, rangeX: 84, rangeY: 60 },
    downAir:  { damage: 52, startup: 8,  active: 3, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 10, rangeX: 80, rangeY: 78 }
  },
  // SPECIALS — SPECIAL button, direction-branched (abilities.js executeHiruzenSpecial, Isshiki pattern):
  //   neutral = SPIN (evasive dodge, Stage 2) · Fwd = Fire Release: Great Fireball · Down = Earth Release:
  //   Wall · Up = Enma (Monkey King Staff buff) · Back = Adamantine Staff Bind. The three borrowed jutsu are
  //   BESPOKE, self-contained reflavors of existing moves' ARCHITECTURE (Madara Katon / Madara Mokuton
  //   stationary-hazard / declarative transformation-buff) with Hiruzen's OWN numbers — they do NOT share
  //   live code/state with the source characters (Pain-assist / Zaraki-Yachiru discipline).
  specials: {
    spin:      { cost: 15, iframes: 22, duration: 26, hopBack: 7, isSpecial: true, effect: "evasive SPIN — spinning dodge/counter-step with brief invulnerability + a short back-hop (substitution-adjacent)" },
    fireball:  { cost: 28, damage: 84, isSpecial: true, effect: "Fire Release: Great Fireball — a rolling flame projectile (weaker than Madara's Katon; he is no fire specialist)" },
    earthWall: { cost: 26, damage: 70, isSpecial: true, effect: "Earth Release: Wall — a stationary stone eruption in front (defensive anti-rush hazard; re-themed Mokuton-spike shape)" },
    enma:      { cost: 45, duration: 480, dmgMult: 1.25, reachMult: 1.35, isSpecial: true, effect: "Enma (Monkey King Staff) — transformation-buff: +25% damage & +35% reach for ~8s (identity anchor)" },
    staffBind: { cost: 18, damage: 60, reach: 96, isSpecial: true, effect: "Adamantine Staff Bind — the staff extends to pin the opponent (command grab)" }
  },
  // ULTIMATE — Reaper Death Seal (his canon soul-extraction finisher, at GREAT PERSONAL COST). Freeze/
  // camera-focus cinematic on the LIVE fighter (no dup instance): a dark spectral screen treatment + a
  // Shinigami dragging the opponent's soul out, then a guaranteed soul-rip. Pays 15% of his OWN max HP
  // (the canon life-cost) → self-limiting. Logic in abilities.js executeHiruzenUltimate; FX in game.js.
  ultimate: { name: "Reaper Death Seal", cost: 100, description: "Summons the Shinigami to rip out the opponent's soul — a guaranteed nuke paid for with a chunk of Hiruzen's own life." },
  hasSprites: true,
  // idle content ~40px tall → 40 × 2.8 ≈ 112px on-screen (squarely in the human roster band). Screenshot-tuned.
  spriteScale: 2.8,
  animationData: {
    // ── MOVEMENT / STATE. Re-sliced to uniform feet-aligned cells (tools/reslice_hiruzen.py). anchorY 0. ──
    idle:  { frames: 4, width: 63, height: 42, speed: 8, anchorY: 0, sheet: "./hiruzen_idle_uniform.png" },
    walk:  { frames: 6, width: 67, height: 42, speed: 6, anchorY: 0, sheet: "./hiruzen_run_uniform.png" },   // no walk art → run sheet, slower
    run:   { frames: 6, width: 67, height: 42, speed: 4, anchorY: 0, sheet: "./hiruzen_run_uniform.png" },
    dash:  { frames: 3, width: 64, height: 57, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_dash_uniform.png" },  // frame 2 = shunshin-ghost FX (kept)
    jump:  { frames: 4, width: 59, height: 82, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_jump_uniform.png" },
    fall:  { frames: 1, width: 59, height: 82, speed: 5, anchorY: 0, sourceX: 118, loop: false, lockLastFrame: true, sheet: "./hiruzen_jump_uniform.png" },   // descent = jump frame 3 (sourceX 2×59)
    // back_jump art has no dedicated backward-jump resolver → wired as the generic doubleJump strip
    // (2nd-jump backflip ascent). Re-split from the rope-crossing merge; deduped (this file only).
    doubleJump: { frames: 3, width: 67, height: 61, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_back_jump_uniform.png" },
    hurt:  { frames: 2, width: 55, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_hit_uniform.png" },
    guard: { frames: 1, width: 54, height: 44, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_block_uniform.png" },   // static held low crouch-guard (1 real frame)
    // ── STAGE 2 NORMALS — one 7-frame punch COMBO sheet (hiruzen_punches_uniform, cell 60×43). light =
    // the full flurry (frames 0-6, fast → reads as a continuous punch string); heavy = the wide power
    // FINISHER (frames 5-6) off the SAME sheet via sourceX (5×60). No new art. ──
    light:    { frames: 7, width: 60, height: 43, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },
    heavy:    { frames: 2, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 300, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // frames 5-6 (5×60) — wide finisher
    // up / air / down_air = CONFIRMED ART GAPS (no dedicated up/aerial attack art). Rather than invent or
    // force (roll/SPIN has no launcher-reading frame), they reuse single punch frames as a generic attacking
    // pose off the combo sheet — flagged fallbacks, not dedicated animations.
    up:       { frames: 1, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 360, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // FALLBACK: punch frame 6 (widest strike)
    air:      { frames: 1, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 180, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // FALLBACK: punch frame 3 (forward punch)
    down_air: { frames: 1, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 300, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // FALLBACK: punch frame 5 (wide swing)
    // ── STAGE 2 SPIN — the master-labelled "SPIN" (NEVER "roll"): an evasive spinning dodge special
    // (substitution-jutsu-adjacent). 4-frame spin loop; abilities.js executeHiruzenSpecial grants i-frames. ──
    hiruzenSpin: { frames: 4, width: 46, height: 47, speed: 3, anchorY: 0, loop: true, sheet: "./hiruzen_spin_uniform.png" },
    // ── STAGE 3 BORROWED-JUTSU cast poses. No dedicated jutsu-cast art → each reuses a punch frame from his
    // OWN combo sheet (sourceX) as a generic caster pose (design: "held-pose from his own sprite"). ──
    hiruzenFireCast:  { frames: 1, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 360, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // fireball exhale (punch frame 6)
    hiruzenEarthCast: { frames: 2, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // earth wall plant (frames 0-1)
    hiruzenEnmaCast:  { frames: 2, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 240, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // Enma staff summon flourish (frames 4-5)
    hiruzenBind:      { frames: 1, width: 60, height: 43, speed: 4, anchorY: 0, sourceX: 180, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },   // staff pin thrust (punch frame 3)
    // ── STAGE 4 ULTIMATE — Reaper Death Seal sealing-sign held pose (punch frames 0-1, the fists-together
    // windup reads as a hand-seal). Held through the freeze cinematic (the Shinigami/soul FX is screen-space). ──
    hiruzenReaperCast: { frames: 2, width: 60, height: 43, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_punches_uniform.png" },
    // ── TWO-PART INTRO. intro (row 1, 5f) = Hokage robe+hat → robe shed → combat stance; hands off to
    // idle. The discarded hat/robe (row 2) tumbles to the ground as a composited FX prop via game.js
    // _drawHiruzenIntroRobe (Vegeta intro-aura precedent) — the "otherwise unused" wardrobe beat. ──
    intro:     { frames: 5, width: 63, height: 56, speed: 9, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_intro_uniform.png" },
    introRobe: { frames: 4, width: 46, height: 36, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./hiruzen_introrobe_uniform.png" }
  },
  introPool: ["intro"]   // single-sequence wardrobe-change intro (the robe-fall prop composites on top)
}

// ─────────────────────────────────────────────────────────────────
// Yuji Itadori (universe: jujutsu_kaisen) — physical-brawler vessel. Unlike Gojo/Sukuna
// he manipulates little cursed energy (canon): fights with raw physical strength + the
// Divergent Fist. Small energy pool (150) reflects that; the cyan cursed-energy specials
// land at Stage 4. STAGE 1 = movement/state + 5 normals over reslice'd feet-aligned
// *_uniform.png strips (originals preserved; copies resliced via tools/reslice_strip.mjs).
// See YUJI_ASSET_MAP.md. Normal→sheet map mirrors the moveset spec:
//   light=foward_attack · heavy=super_foward_attack (Divergent Fist) · up=up_kick
//   air=air_attack · down_air=down_attack (low sweep).
const yuji = {
  rosterKey: "yuji", name: "Yuji Itadori", universe: "jujutsu_kaisen",
  portrait: "./yuji_portrait.png",   // Stage 6 — placeholder path until a mugshot is cropped from the master sheet
  archetypes: ["melee", "rushdown"],
  primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "burst", animeMovement: true },
  // Tier: aggressive physical brawler. HP 1120 (durable vessel — below Sukuna 1240, near Tobirama 1120);
  // attack 90 hits hard (Divergent-Fist heavy) but under Sukuna 95; speed 90 agile; def 82 solid.
  // Small maxEnergy 150 (limited cursed-energy control) vs Sukuna's 210 — character-appropriate.
  stats: { maxHealth: 1120, maxEnergy: 150, attack: 90, defense: 82, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: {
    // Stage 2 wires sprites over this data. Yuji is a hard-hitting physical rushdown brawler.
    light:     { damage: 48, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 92, startup: 8, active: 3, recovery: 17, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 88, rangeY: 48 },  // Divergent Fist — delayed follow-through punch
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 3, recovery: 14, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 12, airOK: false },
    airAttack: { damage: 60, startup: 4, active: 2, recovery: 8,  hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 78, startup: 6, active: 3, recovery: 12, hitstun: 18, knockbackX: 3, knockbackY: 4 }   // Down+B → airborne down-spike (engine downAir slot = !grounded S+J; uses down_attack art)
  },
  specials: {
    // HUD-reference placeholders; behaviour lands in abilities.js at Stage 4 (cyan cursed-energy family).
    divergentFist:   { cost: 0,  damage: 105, startup: 8, active: 4, recovery: 16, hitstun: 20, knockbackX: 8, knockbackY: -2, effect: "delayed second-impact cursed punch" },
    cursedEnergyBall:{ cost: 30, damage: 70,  startup: 8, active: 4, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, effect: "cyan cursed-energy projectile" }
  },
  ultimate: { name: "Black Flash", cost: 100, description: "Freeze-cinematic cursed-energy burst (Stage 5)." },
  hasSprites: true,
  // HEIGHT-REF: canon 173cm (Itadori) → target ~108px (0.623×173, HEIGHT_REFERENCE.md). Trial 2.10 measured idle 105px (−2.6%); →2.16 lands on target. Resliced cells bottom-aligned so anchorY:0 plants feet (no re-anchor).
  spriteScale: 2.16,
  animationData: {
    // ── STAGE 1 MOVEMENT/STATE ── reslice'd feet-aligned (*_uniform.png); anchorY 0 plants feet.
    idle: { frames: 4, width: 37, height: 53, speed: 7, anchorY: 0, sheet: "./yuji_idle_uniform.png" },
    // Only one locomotion strip (8-frame run) — walk plays it slower.
    walk: { frames: 8, width: 43, height: 51, speed: 6, anchorY: 0, sheet: "./yuji_run_uniform.png" },
    run:  { frames: 8, width: 43, height: 51, speed: 4, anchorY: 0, sheet: "./yuji_run_uniform.png" },
    dash: { frames: 2, width: 50, height: 43, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_dash_uniform.png" },
    // jump.png = crouch→rise arc; play once + hold. fall = the apex/descent pose (last cell 5 → sourceX 41×5 = 205).
    jump: { frames: 6, width: 41, height: 56, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_jump_uniform.png" },
    fall: { frames: 1, width: 41, height: 56, speed: 6, anchorY: 0, sourceX: 205, loop: false, lockLastFrame: true, sheet: "./yuji_jump_uniform.png" },
    // GUARD — block.png cell 0 (braced guard stance) held; cell 1 is a follow-through that would pop in a hold.
    guard: { frames: 1, width: 36, height: 53, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./yuji_block_uniform.png" },
    // HURT (standing flinch) — cell 0 of the 4-cell hit strip; combat.js colorFlash tints on top.
    hurt: { frames: 1, width: 41, height: 56, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./yuji_hit_uniform.png" },
    // KNOCKDOWN/GETUP — the 8-cell hurt strip (downed → rise); lockLastFrame holds the recovered pose.
    knockdown: { frames: 8, width: 61, height: 50, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_hurt_uniform.png" },
    // HOLD-TO-CHARGE — cursed-energy power-up windup (no hitbox). Source yuji_charge.png was MONOCHROME;
    // recolored to the kit's cyan palette (tools/recolor_yuji_charge.py, luminance→cyan ramp) then resliced.
    // Yuji already enters isCharging (maxEnergy 150) on the C button; this gives that state its own pose
    // (sprite.js:385 gates on animationData.charge). Loops while held (like Vegeta/Rengoku charge).
    charge: { frames: 2, width: 89, height: 97, speed: 6, anchorY: 0, loop: true, sheet: "./yuji_charge_uniform.png" },
    // ── STAGE 1 INTRO ── two same-costume variants, random-cycled (introPool below).
    // intro1 = cinematic (a white-haired manifestation appears beside Yuji, then he sets his stance).
    intro1: { frames: 8, width: 46, height: 78, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_intro_1_uniform.png" },
    // intro2 = the master-sheet "ALT" row: Yuji solo, cursed-energy flourish → fighting stance. NOT a
    // different costume (palette matches the base uniform — verified Stage 1), so it random-cycles rather
    // than skin-gating. NOTE: yuji_intro_3.png was a mislabeled duplicate of the WIN pose, NOT an intro tail.
    intro2: { frames: 8, width: 38, height: 61, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_intro_2_uniform.png" },
    // ── STAGE 2 NORMALS ── loop:false + lockLastFrame holds the strike pose through recovery.
    // basic_attacks (above) carries the hit/frame DATA. Keys light/heavy/up/air/down_air (sprite.js identity map).
    light:    { frames: 4, width: 46, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_foward_attack_uniform.png" },        // quick forward jab
    heavy:    { frames: 7, width: 58, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_super_foward_attack_uniform.png" },   // Divergent Fist — heavy punch
    up:       { frames: 7, width: 39, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_up_kick_uniform.png" },                // rising kick (launcher)
    air:      { frames: 5, width: 52, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_air_attack_uniform.png" },             // aerial strike
    down_air: { frames: 6, width: 48, height: 57, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_down_attack_uniform.png" },            // Down+B air down-spike (down_attack art)
    // ── STAGE 3 CURSED-ENERGY (Y / SPECIAL) CAST STRIPS ── char-only; projectiles/FX spawn separately in abilities.js
    // (MOVE_TO_ACTION maps _spriteCastMove/currentMove → these action keys). Wide FX frames were split out at build.
    yujiBall:     { frames: 7,  width: 59, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_ball_cast_uniform.png" },     // neutral Y — cursed-energy ball throw
    yujiBeam:     { frames: 7,  width: 59, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_beam_cast_uniform.png" },     // Fwd+Y — cursed-energy beam
    yujiPillar:   { frames: 6,  width: 53, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_pillar_cast_uniform.png" },   // Up+Y — energy pillar (anti-air)
    yujiCrescent: { frames: 7,  width: 61, height: 58, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_crescent_uniform.png" },      // Down+Y — crescent slash
    yujiAirCombo: { frames: 12, width: 61, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_aircombo_uniform.png" },      // Jump+Y — aerial cursed combo
    // ── STAGE 4 KOMA "REPEAT" ── the Ultimate's Phase-2 payload (Stage 5). Koma1 = the mash-extend flurry
    // (LOOPS while the player mashes); Koma2 = the finisher combo (plays once). Engine: abilities.js updateYujiKomaCombat.
    yujiKoma1: { frames: 21, width: 62, height: 56, speed: 2, anchorY: 0, loop: true,  sheet: "./yuji_koma1_uniform.png" },                                  // flurry (looped while mashing)
    yujiKoma2: { frames: 21, width: 38, height: 57, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_koma2_uniform.png" },             // finisher combo (25→21: trimmed 4 incidental standing/walk-in frames #11-14 that hitched the finisher's hit beat)
    // ── STAGE 5 ULTIMATE "Black Flash" ── Phase 1 buildup pose (cursed-energy charge), played through the freeze-cinematic.
    ultimateAction: { frames: 14, width: 58, height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_ultimate_action_uniform.png" },
    // ── STAGE 6 "SUKUNA SLASH" (flavor) ── the momentary cursed hand-sign pose held through the auto-targeting slash (NO transform). Single frame.
    yujiSukunaSign: { frames: 1, width: 69, height: 78, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuji_sukuna_slash.png" }
  },
  introPool: ["intro1", "intro2"]
}

// ─────────────────────────────────────────────────────────────────
// BLEACH
// ─────────────────────────────────────────────────────────────────
// Ichigo Kurosaki — FIRST Bleach sprite character (new universe: "bleach").
// The universe string auto-derives the "Bleach" display name (game.js
// formatUniverseName) and auto-adds to the universe-select grid via hasSprites;
// energyType "reiatsu" resolves to the "Reiatsu" HUD label (ui.js ENERGY_TYPE_LABELS).
// Versatile sword archetype with a HIGH-mobility twist: two distinct dash options —
// the standard ground dash (ichigo_dash) AND an 8-way aerial dash (the
// dash_But_in_different_directions strip), gated by traits.directionalDash (see
// physics.js air-dash block + sprite.js dashDir frame-lock). Large kit (expanded
// combo system + 4-5 specials + 2-part ult) built out in later stages.
// HEIGHT-REF: canon TYBW Ichigo ~181cm → target 0.623×181 ≈ 113px. Idle content
// ~58px → spriteScale 1.9 trial (verified in-battle, Stage 1). Resliced cells are
// feet-aligned (tools/reslice_strip.mjs → *_uniform.png) so anchorY:0 plants feet.
const ichigo = {
  rosterKey: "ichigo", name: "Ichigo Kurosaki", universe: "bleach",
  portrait: "./ichigo_portrait.png",   // extracted from the master sheet in Stage 5; falls back to procedural box until then
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed", "zoner"],   // sword bruiser; Getsuga crescent (specail_2) gives a zoning tool
  movement: { runWhenAdvancing: true },   // advancing toward the foe plays the run cycle (Tobirama/Madara pattern)
  // reiatsu = spiritual pressure. hasEnergy true; directionalDash flags the 8-way
  // aerial dash (physics.js). 200 pool: large kit (several specials + 2-part ult) but
  // NOT an outlier (below Madara/Gojo 220).
  traits: { hasEnergy: true, energyType: "reiatsu", mobility: "high", scaling: "versatile", animeMovement: true, directionalDash: true },
  stats: { maxHealth: 1160, maxEnergy: 200, attack: 92, defense: 84, speed: 94, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 11, dashCooldownMax: 34 },
  hasSprites: true,
  spriteScale: 1.9,
  // ── STAGE 2 NORMALS (real move data; combat.js _getMD reads this basic_attacks) ──
  //   light = foward_sword-slash (quick slash, blue arc)   heavy = sword_combo_1 (committed string)
  //   upAttack = up_attack (vertical rising launcher)       airAttack = launch_attack_2 (aerial slash)
  //   downAir = down_air_attack (aerial dive slash / spike). The EXPANDED command system (Fwd+Heavy
  //   rekka, Down/Back+Heavy, Fwd+Light, Dash+Heavy) lives in abilities.js updateIchigoCommandCombat.
  basic_attacks: {
    light:    { damage: 44, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 86, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 96, rangeY: 48 },
    upAttack: { type: "launcher", damage: 68, startup: 6, active: 4, recovery: 15, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
    airAttack:{ damage: 58, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:  { damage: 78, startup: 7, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }   // downward aerial slash (spike)
  },
  animationData: {
    // ── MOVEMENT / STATE (Stage 1) ── each resliced feet-aligned; anchorY 0 plants feet.
    idle: { frames: 3, width: 56, height: 60, speed: 7, anchorY: 0, sheet: "./ichigo_idle_uniform.png" },
    // Single locomotion strip (5-frame run cycle) → walk plays it slower (Zenitsu/Madara pattern).
    walk: { frames: 5, width: 50, height: 46, speed: 6, anchorY: 0, sheet: "./ichigo_run_uniform.png" },
    run:  { frames: 5, width: 50, height: 46, speed: 4, anchorY: 0, sheet: "./ichigo_run_uniform.png" },
    // Ground dash — horizontal burst (3-frame body-shift + motion blur). Distinct from dashDir below.
    dash: { frames: 3, width: 72, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_dash_uniform.png" },
    // MULTI-DIRECTIONAL AERIAL DASH — the ichigo_dash_But_in_different_directions strip (6 poses:
    // 0 up · 1 down · 2 down-fwd · 3 up-fwd · 4 level-fwd · 5 back). physics.js stamps _dashDirIdx
    // for the held air-dash direction; sprite.js pins the matching frame (dashDir frame-lock). NOT
    // an auto-playing animation — one frame is held for the 8-way dash's duration.
    dashDir: { frames: 6, width: 97, height: 94, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_dash_But_in_different_directions_uniform.png" },
    // jump.png = crouch→rise→apex→descent arc; play once + hold. fall = the apex/descent pose (last cell).
    jump: { frames: 8, width: 62, height: 54, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_jump_uniform.png" },
    fall: { frames: 1, width: 62, height: 54, speed: 6, anchorY: 0, sourceX: 434, loop: false, lockLastFrame: true, sheet: "./ichigo_jump_uniform.png" },
    // Guard — 2-frame settle into a braced sword-block; hold the last frame while blocking.
    guard: { frames: 2, width: 46, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_block_uniform.png" },
    // HURT — frame 0 of the hit_1 recoil strip as a single-frame flinch; combat.js colorFlash tints
    // on top. Every plain hitstun/stun routes here.
    hurt: { frames: 1, width: 54, height: 48, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_hit_1_uniform.png" },
    // KNOCKDOWN — the full hit_1 recoil→stagger sequence (3 cells). lockLastFrame holds the downed pose.
    // (hit_2 is a separate heavier stagger reaction, wired as knockdownHeavy for launcher/heavy hits.)
    knockdown: { frames: 3, width: 54, height: 48, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_hit_1_uniform.png" },
    knockdownHeavy: { frames: 3, width: 66, height: 43, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_hit_2_uniform.png" },
    // CHARGE — 5-frame reiatsu build (spiritual-pressure flare); enrolls Ichigo in the universal
    // energy-charge system. lockLastFrame holds the flare pose while the button is held.
    charge: { frames: 5, width: 58, height: 48, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_charge_uniform.png" },
    // TAUNT — enrolls Ichigo in the universal taunt-heal (game.js updateTauntState; hold Down 10s
    // un-hit → heal). 6-frame Zangetsu flourish; speed 18 → 6×18 = 108-frame committed window (Rick ref).
    taunt: { frames: 6, width: 56, height: 57, speed: 18, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_taunt_uniform.png" },
    // ── PRE-MATCH INTROS (Stage 1) ── two independent variants, random-cycled per match (introPool).
    // Both play once + hold their final pose, snapping cleanly to idle when the fight starts. intro2's
    // form-change flourish is COSMETIC ONLY (confirmed design — no transformation mechanic).
    intro1: { frames: 10, width: 58, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_intro_1_uniform.png" },
    intro2: { frames: 15, width: 83, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_intro_2_uniform.png" },
    // ── STAGE 2 NORMALS ── resliced feet-aligned (*_uniform.png); anchorY 0 plants feet.
    // loop:false + lockLastFrame holds the strike pose through recovery. basic_attacks above carries the DATA.
    light:    { frames: 3, width: 74, height: 48, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_foward_sword-slash_uniform.png" },   // quick forward slash (blue arc)
    heavy:    { frames: 7, width: 71, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_sword_combo_1_uniform.png" },          // committed sword string
    up:       { frames: 6, width: 64, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_up_attack_uniform.png" },              // vertical rising launcher
    air:      { frames: 2, width: 79, height: 68, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_launch_attack_2_uniform.png" },        // aerial neutral slash
    down_air: { frames: 6, width: 77, height: 67, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_down_air_attack_uniform.png" },        // aerial dive slash (spike)
    // ── STAGE 2 EXPANDED COMMAND SYSTEM cast/attack poses (abilities.js updateIchigoCommandCombat).
    // currentMove-keyed melee → sprite.js MOVE_TO_ACTION identity maps. Nothing dropped (Stage-0 mandate).
    ichigoRekka1:    { frames: 7, width: 71, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_basic_sword_slash_uniform.png" },        // Fwd+Heavy rekka opener
    ichigoRekka2:    { frames: 6, width: 69, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_double_sword_attack_uniform.png" },       // rekka mid (double-slash)
    ichigoRekka3:    { frames: 7, width: 76, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_super_combo_to_up_attack_uniform.png" },   // rekka finisher (combo→launcher)
    ichigoDownHeavy: { frames: 4, width: 81, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_down_attack_uniform.png" },               // Down+Heavy low sweep
    ichigoBackHeavy: { frames: 5, width: 85, height: 45, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_launch_attack_1_uniform.png" },           // Back+Heavy advancing launcher (red FX)
    ichigoFwdLight:  { frames: 4, width: 52, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_front_attack_punch_uniform.png" },        // Fwd+Light hilt-jab poke
    ichigoDashAtk:   { frames: 8, width: 69, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_double_dash_combo_uniform.png" },         // Dash+Heavy rushing combo
    // return-to-stance settle (2-row source recombined into one 7-frame strip) — plays after the rekka finisher.
    ichigoReturn:    { frames: 7, width: 65, height: 54, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_ruturn_stance_uniform.png" },
    // ── STAGE 3 SPECIALS ── Getsuga cast = _spriteCastMove pose (projectile fires separately); the rest are
    // currentMove-keyed melee specials (attacking path). sprite.js MOVE_TO_ACTION identity-maps all of these.
    ichigoGetsugaCast:   { frames: 6, width: 81, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_specail_2_uniform.png" },              // Getsuga Tenshō swing (projectile launch)
    ichigoChargedSlash:  { frames: 5, width: 63, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_specail_1_uniform.png" },              // Charged Getsuga Slash (Fwd)
    ichigoAirGetsuga:    { frames: 5, width: 79, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_air_attack_specail_uniform.png" },      // Aerial Getsuga Dive (air)
    ichigoHollowGetsuga: { frames: 5, width: 53, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_super_sword_attack_uniform.png" },      // Hollow Getsuga (Down super, dark form)
    ichigoHollowRising:  { frames: 3, width: 76, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_super_up_attack_uniform.png" },         // Hollow Rising (Up super, dark form)
    // ── STAGE 4 ULTIMATE cast poses (played through the freeze-cinematic via _spriteCastMove; the cinematic
    // SWITCHES from ichigoUlt1 → ichigoUlt2 at the finisher for one continuous dash-slash → uppercut clip).
    ichigoUlt1: { frames: 9, width: 79, height: 43, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_ultimate_part_1_uniform.png" },   // Getsuga dash-slash (windup/rush)
    ichigoUlt2: { frames: 5, width: 78, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./ichigo_ultimate_part_2_uniform.png" }    // rising crescent uppercut (finisher)
  },
  // ── STAGE 3 SPECIALS (real logic in abilities.js executeIchigoSpecial; costs read here + HUD) ──
  specials: {
    getsuga:       { cost: 30, description: "Getsuga Tenshō — a blue crescent energy wave fired from Zangetsu (independent-collision projectile)." },
    chargedSlash:  { cost: 30, description: "Charged Getsuga Slash — a committed advancing blue-energy power slash (Forward)." },
    airGetsuga:    { cost: 32, description: "Aerial Getsuga Dive — a diving aerial slash with a forward glide (airborne)." },
    hollowGetsuga: { cost: 48, description: "Hollow Getsuga — a Hollowfied horizontal super slash (Down; dark-form burst)." },
    hollowRising:  { cost: 46, description: "Hollow Rising — a Hollowfied rising super launcher (Up; dark-form burst)." }
  },
  // HUD-only placeholders until later stages (real move data lands in Stage 2/3/4).
  ultimate: { name: "Getsuga Tenshō", cost: 100, description: "Two-part Zangetsu finisher — a dash-slash rush into a rising crescent uppercut (ultimate_part_1 → part_2), played as one continuous freeze-cinematic; a single guaranteed, range-independent Getsuga that launches the opponent skyward." },
  // Random-cycle intro pool: each match start picks ONE at random (game.pickIntroVariant).
  introPool: ["intro1", "intro2"]
}

// ─────────────────────────────────────────────────────────────────
// Zaraki Kenpachi — SECOND Bleach sprite character (universe: "bleach", shared with
// Ichigo). Kenpachi of Squad 11: a raw-power berserker bruiser — high HP + attack,
// deliberately slower than Ichigo (speed 88 vs 94, no 8-way dash). energyType "reiatsu"
// reuses the same "Reiatsu" HUD label (ui.js). Built stage-by-stage against
// ZARAKI_FULL_BUILD_SPEC; this is STAGE 1 (movement + states only — normals/specials/
// Shikai/Bankai/assist land in Stages 2-5).
// HEIGHT-REF (HEIGHT_REFERENCE.md methodology): canon Zaraki ~202cm → target 0.623×202 = 125.8px.
// Measured idle content height = 64px → spriteScale = 125.8/64 = 1.97 (renders ~126px; taller than
// Ichigo's ~110px, matching the canon ratio). Resliced feet-aligned via tools/reslice_strip.mjs
// (*_uniform.png), so anchorY:0 plants feet.
// FILENAME NOTE: the spec's inconsistent spellings are preserved verbatim in the source art
// (tuant_2, shinkai/shikai, specail, atttack); three disk names carrying spaces/double-dots
// were normalised to the spec's underscore names (low_health_idle_, transparent_copy).
const zaraki = {
  rosterKey: "zaraki", name: "Zaraki Kenpachi", universe: "bleach",
  portrait: "./zaraki_transparent_copy.png",   // cropped character-select thumbnail (from the master art)
  archetypes: ["melee", "bruiser"],
  primary: "melee", secondary: ["bruiser"],   // raw-power sword berserker; trades Ichigo's mobility for durability
  movement: { runWhenAdvancing: true },   // advancing toward the foe plays the run/charge cycle (Ichigo/Tobirama pattern)
  // reiatsu = spiritual pressure (shared Bleach label). Modest pool (Stage 1 baseline) — larger
  // kit meters (Shikai timer / Bankai / Yachiru assist) are gated in their own later stages.
  traits: { hasEnergy: true, energyType: "reiatsu", mobility: "medium", scaling: "power", animeMovement: true },
  // STATS — brute profile: highest-tier HP/attack, below-average speed. PROPOSED (spec: numbers
  // are placeholders; dedicated balance pass in Stage 6).
  stats: { maxHealth: 1240, maxEnergy: 120, attack: 98, defense: 88, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 11, dashCooldownMax: 36 },
  hasSprites: true,
  spriteScale: 1.97,
  // ── STAGE 2 NORMALS (combat.js _getMD reads basic_attacks) ──
  //   light = combo_1 (B, 9f sword string)   heavy = combo_2 (Y, 11f 2nd family)   upAttack = up_attack (Up+B rising slash).
  //   The AERIAL route (Up+B airborne → up-swing, repeat → down slam) + Fwd+Light/Fwd+Heavy command slashes
  //   live in abilities.js updateZarakiCommandCombat. No plain airborne-J / down-air basic (aerial is Up+B only),
  //   so airAttack/downAir are intentionally absent here.
  basic_attacks: {
    light:    { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 90, startup: 9, active: 4, recovery: 18, hitstun: 18, knockbackX: 8, knockbackY: 1, rangeX: 104, rangeY: 52 },
    upAttack: { type: "launcher", damage: 72, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 12, airOK: false }
  },
  // ── STAGE 2 SPECIALS (real logic in abilities.js; costs read here + HUD) ──
  specials: {
    // Charged Dash Attack is on the CHARGE button (hold→release, tap/hold power tiers) — COOLDOWN-gated, no reiatsu
    // (holding CHARGE builds reiatsu; releasing unleashes the dash). Hollow Mask Strike is on the SPECIAL button.
    chargedDash:  { cost: 0,  description: "Charged Dash Attack — hold CHARGE to wind up, release to unleash a forward dashing sword rush (quick tap = short lunge, full hold = long committed rush). Cooldown-gated." },
    hollowStrike: { cost: 40, description: "Hollow Mask Strike — a brief Hollow-mask-empowered overhead downward slash (neutral SPECIAL). Heavy committed spike." },
    yachiruAssist: { cost: 25, description: "Yachiru Assist (Down+SPECIAL) — Yachiru dashes in and Zaraki hurls her forward as a projectile; VFX on connect. Meter + cooldown gated; usable from Base or Shikai." }
  },
  // ── STAGE 4 ULTIMATE (real logic in abilities.js executeZarakiUltimate) ──
  // Bankai = a single-use burst attack, usable from EITHER Base or Shikai once meter is full; it plays once
  // and returns to whichever form was active (NOT a transformation / mode change).
  ultimate: { name: "Bankai", cost: 100, description: "Bankai — a committed red-demon burst: a screen-shaking overhead cleaver onslaught. A one-shot ultimate callable from Base or Shikai; returns to whichever form was active (no mode change)." },
  animationData: {
    // ── MOVEMENT / STATE (Stage 1) ── each resliced feet-aligned; anchorY 0 plants feet.
    idle: { frames: 4, width: 69, height: 66, speed: 7, anchorY: 0, sheet: "./zaraki_idle_uniform.png" },
    // LOW-HEALTH IDLE (cosmetic only): a hunched, worn idle that swaps in below a HP threshold.
    // game.js sets fighter._lowHealthIdle on the threshold (no stat/hitbox change); sprite.js
    // _resolveAction renders this over the neutral idle. Purely visual tell — zero gameplay effect.
    idleLow: { frames: 4, width: 69, height: 65, speed: 7, anchorY: 0, sheet: "./zaraki_low_health_idle_uniform.png" },
    // Single locomotion strip (7-frame run/charge cycle) → walk plays it slower (Ichigo/Zenitsu pattern);
    // runWhenAdvancing makes forward movement use the run cycle.
    walk: { frames: 7, width: 64, height: 52, speed: 6, anchorY: 0, sheet: "./zaraki_move_uniform.png" },
    run:  { frames: 7, width: 64, height: 52, speed: 4, anchorY: 0, sheet: "./zaraki_move_uniform.png" },
    // Ground dash — a single lunging blur pose; held for the dash duration (lockLastFrame).
    dash: { frames: 1, width: 60, height: 56, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_dash_uniform.png" },
    // jump.png = crouch→rise→apex→descent arc (8 cells); play once + hold. fall = the descending
    // pose (last cell, sourceX = 7×68 = 476) held while dropping.
    jump: { frames: 8, width: 68, height: 70, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_jump_uniform.png" },
    fall: { frames: 1, width: 68, height: 70, speed: 6, anchorY: 0, sourceX: 476, loop: false, lockLastFrame: true, sheet: "./zaraki_jump_uniform.png" },
    // Guard — 3-frame settle into a braced sword-block; hold the last frame while blocking.
    guard: { frames: 3, width: 54, height: 66, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_block_uniform.png" },
    // ── HIT REACTIONS (3 source strips, engine-selected by hit type) ──
    //   hurt          = hit_1 frame 0 (light/normal flinch; colorFlash tints on top)
    //   knockdown     = hit_1 full 4-frame recoil→stagger (standard knockdown)
    //   knockdownHeavy= hit_2 full 6-frame sprawl→getup (heavy / launcher hits)
    //   hurt_air      = hit  4-frame launched slash-through reaction (airborne hits)
    // All three source files (hit / hit_1 / hit_2) are wired to distinct real roles.
    hurt: { frames: 1, width: 66, height: 64, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_hit_1_uniform.png" },
    hurt_air: { frames: 4, width: 85, height: 70, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_hit_uniform.png" },
    knockdown: { frames: 4, width: 66, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_hit_1_uniform.png" },
    knockdownHeavy: { frames: 6, width: 81, height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_hit_2_uniform.png" },
    // ── TAUNTS ── enrolls Zaraki in the universal taunt-heal (game.js updateTauntState; hold Down 10s
    // un-hit → heal). TWO variants: `taunt` (primary, zaraki_taunt) + `tauntAlt` (zaraki_tuant_2),
    // random-picked per commit (game.js) and resolved in sprite.js. Both wired to real roles.
    taunt:    { frames: 5, width: 71, height: 78, speed: 16, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_taunt_uniform.png" },
    tauntAlt: { frames: 5, width: 65, height: 66, speed: 16, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_tuant_2_uniform.png" },
    // ── STAGE 2 NORMALS ── resliced feet-aligned; loop:false + lockLastFrame holds the strike through recovery.
    light: { frames: 9,  width: 197, height: 80, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_combo_1_uniform.png" },   // B — sword combo string (wide slash arcs)
    heavy: { frames: 11, width: 101, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_combo_2_uniform.png" },   // Y — 2nd sword family
    up:    { frames: 3,  width: 65,  height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_up_attack_uniform.png" },  // Up+B — rising slash launcher
    // ── STAGE 2 AERIAL ROUTE (up_attack_to_down_air_combo, 8f) ── ONE sheet split by sourceX:
    //   zarakiAirUp = the up-swing (frames 0-4);  zarakiAirDown = the spinning descent slam (frames 5-7, sourceX 5×70=350).
    //   Driven by abilities.js updateZarakiCommandCombat (Up+B airborne → up-swing; repeat Up+B → down slam). MOVE_TO_ACTION identity.
    zarakiAirUp:   { frames: 5, width: 70, height: 93, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./zaraki_up_attack_to_down_air_combo_uniform.png" },
    zarakiAirDown: { frames: 3, width: 70, height: 93, speed: 3, anchorY: 0, sourceX: 350, loop: false, lockLastFrame: true, sheet: "./zaraki_up_attack_to_down_air_combo_uniform.png" },
    // ── STAGE 2 COMMAND NORMALS (updateZarakiCommandCombat; MOVE_TO_ACTION identity) ──
    zarakiFwdSlash1: { frames: 6, width: 69, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_foward_slash_1_uniform.png" },   // Fwd+Light (foward_slash_1)
    zarakiFwdSlash2: { frames: 6, width: 66, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_foward_slash_2_uniform.png" },   // Fwd+Heavy (foward_slash_2)
    // ── STAGE 2 SPECIALS ──
    // Charged Dash (super_foward_attack, 7f) split by sourceX: charge = the hold-windup (frames 0-2), fired via the
    // universal hold-to-charge pose (isCharging); zarakiChargedDash = the dashing strike (frames 3-6, sourceX 3×111=333).
    charge:            { frames: 3, width: 111, height: 65, speed: 6, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./zaraki_super_foward_attack_uniform.png" },
    zarakiChargedDash: { frames: 4, width: 111, height: 65, speed: 3, anchorY: 0, sourceX: 333, loop: false, lockLastFrame: true, sheet: "./zaraki_super_foward_attack_uniform.png" },
    // Hollow Mask Strike (hollow_down_attack_assist, 5f) — big overhead blade; tall cell (blade FX extends up).
    zarakiHollowStrike:{ frames: 5, width: 212, height: 180, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_hollow_down_attack_assist_uniform.png" },
    // ── STAGE 4 ULTIMATE — BANKAI (single burst attack) ── the 17f red-demon burst plays ONCE as the
    // attack pose then returns to idle. The demonic transform is baked into these frames ONLY (purely
    // visual) — mechanically it's a one-shot attack that does NOT change form. In base animationData so it
    // resolves in Base AND (via ZARAKI_SHIKAI_ANIM's spread) in Shikai → identical art from either form.
    zarakiBankai: { frames: 17, width: 127, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_bankai_ultimate_uniform.png" },
    // ── STAGE 5 YACHIRU ASSIST — Zaraki's throw pose (he hurls Yachiru forward). Played briefly via
    // _spriteCastMove; the dash-in telegraph + thrown projectile + impact VFX are spawned separately.
    // In base animationData → resolves in Base and (via the Shikai spread) in Shikai.
    zarakiYachiruThrow: { frames: 7, width: 89, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_Yachiru_Kusajishi_throw_uniform.png" }
  }
  // NOTE: no introPool yet — Zaraki ships no dedicated intro art (uses the shared/idle intro).
  // Shikai + Bankai + Yachiru assist arrive in Stages 3-5.
}

// Zaraki Kenpachi — SHIKAI (separate, independently selectable Bleach entry). Same fighter, but STARTS in
// (and stays in) the feral Shikai form: its animationData IS the Shikai art natively, and createFighter
// stamps _shikaiActive=true (startsInShikai) so the existing Shikai command/special kit drives it — no mode
// timer, no mid-match toggle. Base "zaraki" KEEPS its Up+Special toggle (additive). This animationData is
// ALSO the single source of truth reused by abilities.js ZARAKI_SHIKAI_ANIM (the base-form toggle).
const zarakiShikai = {
  ...zaraki,
  rosterKey: "zaraki_shikai", name: "Zaraki Kenpachi (Shikai)",
  portrait: "./zaraki_shikai_portrait.png",
  startsInShikai: true,
  // Shikai art set = base animationData + Shikai overrides (mirrors the old ZARAKI_SHIKAI_ANIM exactly).
  animationData: {
    ...zaraki.animationData,
    idle:  { frames: 4, width: 100, height: 65, speed: 7, anchorY: 0, sheet: "./zaraki_shikai_idle_uniform.png" },
    walk:  { frames: 7, width: 96,  height: 48, speed: 6, anchorY: 0, sheet: "./zaraki_shikai_run_uniform.png" },
    run:   { frames: 7, width: 96,  height: 48, speed: 4, anchorY: 0, sheet: "./zaraki_shikai_run_uniform.png" },
    dash:  { frames: 1, width: 77,  height: 88, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shikai_dash_uniform.png" },
    jump:  { frames: 6, width: 97,  height: 94, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_jump_uniform.png" },
    fall:  { frames: 1, width: 97,  height: 94, speed: 6, anchorY: 0, sourceX: 485, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_jump_uniform.png" },
    guard: { frames: 3, width: 64,  height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_block_uniform.png" },
    hurt:           { frames: 1, width: 115, height: 64, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_hit_2_uniform.png" },
    hurt_air:       { frames: 6, width: 115, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_hit_2_uniform.png" },
    knockdown:      { frames: 6, width: 115, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_hit_2_uniform.png" },
    knockdownHeavy: { frames: 6, width: 115, height: 64, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_hit_2_uniform.png" },
    charge:        { frames: 5, width: 92, height: 65, speed: 6, anchorY: 0, sourceX: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shikai_release_uniform.png" },
    shikaiRelease: { frames: 10, width: 92, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shikai_release_uniform.png" },
    zarakiShikaiC1:      { frames: 11, width: 191, height: 124, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_combo_1_uniform.png" },
    zarakiShikaiC2:      { frames: 11, width: 140, height: 91,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_combo_2_uniform.png" },
    zarakiShikaiC3:      { frames: 7,  width: 101, height: 104, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_combo_3_uniform.png" },
    zarakiShikaiC4:      { frames: 8,  width: 98,  height: 92,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shikai_combo_4_uniform.png" },
    zarakiShikaiUp:      { frames: 3,  width: 94,  height: 104, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_up_atttack_uniform.png" },
    zarakiShikaiDownAir: { frames: 4,  width: 95,  height: 92,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shinkai_down_air_attack_png_uniform.png" },
    zarakiShikaiSpecial: { frames: 6,  width: 93,  height: 120, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./zaraki_shikai_specail_attack_uniform.png" },
  }
}

// ─────────────────────────────────────────────────────────────────
// ONE PUNCH MAN
// ─────────────────────────────────────────────────────────────────
// SAITAMA  (rosterKey "saitama", universe "one_punch_man") — the Caped Baldy. FIRST One Punch Man char.
// SCHEMA-EXCEPTION kit (Madara / Isshiki tier): a genuinely huge, canon-faithful move list — 5 normals +
// grab + a command-normal chain + a tiered tap/hold punch-combo + 7 specials + the Death Punch ultimate.
// His canon gimmick: he is ALREADY at max power at baseline (no transformation) — so the power fantasy is
// NOT inflated base normals (kept ~roster-average) but the Serious Punch / Death Punch PAYOFF numbers.
// Source art: JUS-style fan sheet by arzeer (saitama_jus__by_arzeer_de00xcg.png). Attribution in credits.js.
// Filename typos (pucnh/puch/haded/meateor/bargin/specail/backround/wards) preserved on SOURCE files only;
// code + UI use corrected move names. RE-SLICED to feet-aligned saitama_*_uniform.png (tools/reslice_saitama.py).
const saitama = {
  rosterKey: "saitama", name: "Saitama", universe: "one_punch_man", color: "#f2b705",
  portrait: "./saitama_portrait.png",   // Stage 6 — cropped from idle; falls back cleanly (procedural box) until then.
  archetypes: ["bruiser", "grappler"],
  primary: "melee", secondary: ["bruiser"],
  traits: { hasEnergy: true, energyType: "serious", mobility: "very_high", scaling: "burst", animeMovement: true },   // very_high = DOUBLE air-dash (physics.js maxAirDash), matching Toji's speed tier
  // Double-tap TOWARD the opponent = blink teleport-dash (blink BEHIND), using SAITAMA'S OWN dash sprite
  // (saitama_dash_uniform.png) via the shared speed-tier dash-pose default in game.js — NOT a generic swirl.
  // Redundant with the speed-98 isSpeedTierTeleport gate, but set explicitly per the speed-tier standard.
  movement: { dashTeleport: true },
  // "Serious" meter (Saitama's limiter-break) gates his huge special list — the resource IS the balance lever
  // for such a large kit (more options can't be spammed). Explicit HUD label + gold accent via energyConfig.
  energyConfig: { label: "Serious", color: "#f2b705", glowColor: "#ffd94a", emptyColor: "rgba(255,255,255,0.08)" },
  passive: { name: "Limiter Broken", effect: "Trained past the human limit — durable, and his Serious/Death Punch payoffs hit far harder than any base normal." },
  // Durable powerhouse. HP high (top-third, below Isshiki 1300) + high Def = his identity is TAKING hits and
  // ending fights with the payoff moves. Base normals ~roster-average; specials/ult carry the power fantasy.
  // Speed profile MATCHED to Toji's confirmed values (speed-tier parity). NOTE: dashCooldownMax is
  // superseded at runtime by archetypeDashCooldown(speed) → speed 98 yields ~14f for BOTH Saitama and Toji
  // (that's what actually makes their dash frequency equal); the 26 here is kept only for source parity.
  stats: { maxHealth: 1280, maxEnergy: 150, attack: 90, defense: 92, speed: 98, maxJumps: 2, jumpPower: 30, dashSpeed: 22, dashDuration: 10, dashCooldownMax: 26 },
  // ── Normal-attack DATA — deliberately ~roster-average (see header). Refined vs real frames in Stage 2. ──
  basic_attacks: {
    light:    { damage: 46, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },              // basic_kick
    heavy:    { damage: 84, startup: 8, active: 3, recovery: 17, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 84, rangeY: 48 }, // punches
    upAttack: { type: "launcher", damage: 66, startup: 6, active: 3, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, airOK: false }, // up_attack
    airAttack:{ damage: 56, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: -2 },              // air_punch_part_1
    downAir:  { damage: 74, startup: 6, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }              // air_punch_part_2 (spike)
  },
  // ── Special DATA stubs — behaviour lands in abilities.js at Stages 3/4. Corrected technique names. ──
  specials: {
    // Stage 3 — tiered tap/hold punch-combo (Vegeta up-attack tiers precedent).
    consecutivePunches: { cost: 20, damage: 70,  startup: 6, active: 8,  recovery: 14, hitstun: 14, knockbackX: 4, knockbackY: 0,  isSpecial: true, effect: "Consecutive Normal Punches (10×) — tap tier" },
    superPunches:       { cost: 35, damage: 110, startup: 7, active: 12, recovery: 18, hitstun: 16, knockbackX: 6, knockbackY: -1, isSpecial: true, effect: "Consecutive Normal Punches (20×) — hold tier" },
    // Stage 4 — remaining specials.
    headbutt:      { cost: 20, damage: 72,  startup: 8,  active: 3, recovery: 16, hitstun: 18, knockbackX: 6, knockbackY: -1, isSpecial: true, effect: "Headbutt" },
    twoHandedPunch:{ cost: 30, damage: 96,  startup: 9,  active: 5, recovery: 20, hitstun: 20, knockbackX: 7, knockbackY: -1, isSpecial: true, effect: "Two-Handed Punches" },
    seriousPunch:  { cost: 45, damage: 130, startup: 12, active: 6, recovery: 24, hitstun: 24, knockbackX: 9, knockbackY: -2, isSpecial: true, effect: "Serious Punch — melee + traveling shockwave" },
    upDownCombo:   { cost: 35, damage: 100, startup: 8,  active: 5, recovery: 18, hitstun: 20, knockbackX: 3, knockbackY: -6, isSpecial: true, effect: "Up→Down launcher-spike combo" },
    bargainSale:   { cost: 30, damage: 92,  startup: 9,  active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, isSpecial: true, effect: "Today Is Bargain Sale" },
    tableFlip:     { cost: 25, damage: 78,  startup: 10, active: 4, recovery: 20, hitstun: 16, knockbackX: 8, knockbackY: -1, isSpecial: true, effect: "Serious Table Flip" },
    sideHop:       { cost: 15, damage: 0,   startup: 4,  active: 2, recovery: 10, hitstun: 0,  knockbackX: 0, knockbackY: 0,  isSpecial: true, subtype: "mobility", effect: "Side Hop — evasive" }
  },
  // ULTIMATE (Death Punch) — Stage 5 freeze-cinematic (Kurama/Goku Black/Beerus/Isshiki architecture).
  ultimate: { name: "Serious Series: Serious Punch (Death Punch)", cost: 100, description: "His single most iconic technique — a freeze-cinematic Death Punch: charge → impact, with a full-screen backdrop treatment on the payoff beat (Stage 5)." },
  hasSprites: true,
  // Normal-height bald man (canon ~175cm). idle content ~53px at scale 1.0 → target ~106px on-screen
  // (roster human band). 53 × 2.0 ≈ 106px. Verified via measureSprite in Stage 1. anchorY 0 plants feet.
  spriteScale: 2.0,
  animationData: {
    // ── STAGE 1 — MOVEMENT / STATE (reslice'd feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    idle:  { frames: 5, width: 28, height: 55, speed: 8, anchorY: 0, sheet: "./saitama_idle_uniform.png" },
    walk:  { frames: 6, width: 46, height: 54, speed: 6, anchorY: 0, sheet: "./saitama_walk_uniform.png" },
    run:   { frames: 6, width: 46, height: 54, speed: 4, anchorY: 0, sheet: "./saitama_walk_uniform.png" },
    dash:  { frames: 2, width: 32, height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_dash_uniform.png" },
    jump:  { frames: 8, width: 35, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_jump_uniform.png" },
    fall:  { frames: 1, width: 35, height: 63, speed: 6, anchorY: 0, sourceX: 245, loop: false, lockLastFrame: true, sheet: "./saitama_jump_uniform.png" }, // last jump cell held as fall
    guard: { frames: 3, width: 33, height: 55, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_block_uniform.png" },
    hurt:  { frames: 5, width: 24, height: 56, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_hit_uniform.png" },
    // ── STAGE 2 — 5 normals + grab (render by move name; basic_attacks data above). ──
    light:    { frames: 7, width: 41, height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_light_uniform.png" },   // basic_kick
    heavy:    { frames: 8, width: 70, height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_heavy_uniform.png" },   // punches
    up:       { frames: 6, width: 44, height: 62, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_up_uniform.png" },      // up_attack (launcher)
    air:      { frames: 6, width: 34, height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_air_uniform.png" },     // air_punch_part_1
    down_air: { frames: 3, width: 35, height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_downair_uniform.png" }, // air_punch_part_2 (spike)
    grab:     { frames: 7, width: 52, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_grab_uniform.png" },    // grab/throw
    // ── STAGE 2 — command-normal chain: "Spin-Punch" (Fwd+Heavy) cancelable 3-stage rekka (turn_puch). ──
    saitamaTurn1: { frames: 5, width: 42, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_turn1_uniform.png" },   // opener (spin windup)
    saitamaTurn2: { frames: 5, width: 54, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_turn2_uniform.png" },   // mid (forward punches)
    saitamaTurn3: { frames: 4, width: 52, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_turn3_uniform.png" },   // finisher (cape-throw)
    // ── STAGE 3 — tiered tap/hold punch-combo special (neutral Special). tap → 10× / hold → 20×. ──
    saitamaCombo10: { frames: 11, width: 96, height: 71, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_combo10_uniform.png" },   // Consecutive Normal Punches (10×) — tap
    saitamaCombo20: { frames: 12, width: 133, height: 86, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_combo20_uniform.png" },   // Consecutive Normal Punches (20×) — hold
    // ── STAGE 4 — the 6 specials (+ Side Hop). Rendered by move name (executeSaitamaSpecial). ──
    saitamaSerious:   { frames: 24, width: 56,  height: 67, speed: 1, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_serious_uniform.png" },    // Serious Punch (Fwd) — full windup→impact
    saitamaTwohand:   { frames: 11, width: 119, height: 94, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_twohand_uniform.png" },    // Two-Handed Punches (Back)
    saitamaBargain:   { frames: 12, width: 44,  height: 62, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_bargain_uniform.png" },    // Today Is Bargain Sale (Up)
    saitamaTableflip: { frames: 10, width: 45,  height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_tableflip_uniform.png" },  // Serious Table Flip (Down)
    saitamaHeadbutt:  { frames: 6,  width: 41,  height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_headbutt_uniform.png" },   // Headbutt (air neutral)
    saitamaUpdown:    { frames: 7,  width: 52,  height: 79, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_updown_uniform.png" },     // Up→Down Combo (air Fwd) — launcher→spike
    saitamaSidehop:   { frames: 7,  width: 39,  height: 55, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_sidehop_uniform.png" },    // Side Hop evasive (air Back/Down)
    // ── STAGE 5 — DEATH PUNCH ultimate poses (charge → impact; live fighter holds these through the cinematic). ──
    saitamaDeathCharge: { frames: 7, width: 32, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_death1_uniform.png" },   // wind-up
    saitamaDeathImpact: { frames: 8, width: 52, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_death2_uniform.png" }     // punch → impact
  },
  introPool: ["intro"]   // 3-part intro sequence stitched below (getup → run-backwards → settle-to-idle)
}
// STAGE 1 intro = 3 source parts stitched into ONE ordered strip (getup-from-lying → run backwards →
// settle-to-idle; final frame hands off to idle). Built by tools/stitch_saitama_intro.py at Stage 1.
saitama.animationData.intro = { frames: 17, width: 53, height: 65, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./saitama_intro_full_uniform.png" }

// ─────────────────────────────────────────────────────────────────
// GENOS  (rosterKey "genos", universe "one_punch_man") — the Demon Cyborg, Saitama's disciple. 2nd OPM char.
// A jet-boosted RANGE/RUSHDOWN hybrid: fast, offense-heavy, but comparatively frail (canon: hits hard,
// takes hits worse — Def below roster-average). Signature = the Incineration Cannon (a 3-tier hold-charge
// blast) + Machine Gun Blows flurry + jet/afterimage dashes, capped by an Overdrive ultimate (band-13
// overheat power-up with a real drawback). Source: single teal-keyed master sheet
// ddk5eh3-5cfadb89-4c66-4fc4-b56f-bcb3d538c4f8.png (DeviantArt; ★artist UNKNOWN → credits.js pending).
// RE-SLICED feet-aligned to genos_*_uniform.png by tools/reslice_genos.py. See GENOS_ASSET_MAP.md.
// STAGE 1 = registration + movement/state (idle/taunt/walk/dash/run/jump/hurt/knockdown/getup). Normals
// (S2), command chains (S3), specials incl. Incineration Cannon charge-tiers (S4), Overdrive ult (S5),
// portrait/win/lose + harness/balance (S6) follow.
const genos = {
  rosterKey: "genos", name: "Genos", universe: "one_punch_man", color: "#f2c14e",
  portrait: "./genos_portrait.png",   // Stage 1 — bust cropped from idle; falls back cleanly until upgraded.
  archetypes: ["rushdown", "zoner"],
  primary: "melee", secondary: ["zoner"],
  traits: { hasEnergy: true, energyType: "core", mobility: "high", scaling: "burst", animeMovement: true },
  // Jet-boosted mobility — double-tap toward = dash (uses Genos's own dash sprite via the speed-tier default).
  movement: { dashTeleport: false },
  // "Core" reserve (the cyborg's power core) gates the Incineration charge-tiers + Overdrive — the resource
  // IS the balance lever. Explicit HUD label + amber accent.
  energyConfig: { label: "Core", color: "#f2c14e", glowColor: "#ffd97a", emptyColor: "rgba(255,255,255,0.08)" },
  passive: { name: "Demon Cyborg", effect: "Dr. Kuseno's combat chassis — powerful jet-boosted offense, but a frail frame that takes hits harder than most." },
  // Glass rushdown/zoner: HP + Def below roster-average (frail cyborg frame), offense carries. Fast.
  stats: { maxHealth: 1080, maxEnergy: 200, attack: 92, defense: 78, speed: 96, maxJumps: 2, jumpPower: 30, dashSpeed: 22, dashDuration: 10, dashCooldownMax: 26 },
  // ── Normal-attack DATA (Stage 2) — ~roster-average; the Incineration/Overdrive payoffs carry the power
  // fantasy, not the base normals. All damage runs through GLOBAL_DAMAGE_SCALE (×0.60) like every character.
  // Sheet is punch/blast-only — no upward/kick/aerial art exists, so up REUSES heavy, down_air REUSES air.
  basic_attacks: {
    light:    { damage: 44, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 3, knockbackY: 0 },                                    // band4 jab (un-ignited)
    heavy:    { damage: 82, startup: 8, active: 3, recovery: 17, hitstun: 20, knockbackX: 6, knockbackY: 1, rangeX: 92, rangeY: 46 },             // band4 palm-cannon (short disjoint fire)
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 3, recovery: 15, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, airOK: false }, // reuse heavy sheet (no upward art)
    airAttack:{ damage: 54, startup: 4, active: 2, recovery: 9,  hitstun: 13, knockbackX: 4, knockbackY: -2 },                                    // band8 jet-dash punch
    downAir:  { damage: 60, startup: 5, active: 3, recovery: 11, hitstun: 16, knockbackX: 2, knockbackY: 6 }                                      // reuse air sheet (downward jet-punch)
  },
  hasSprites: true,
  // Normal-height cyborg. idle body ~69px content at scale 1.0 → target ~112px on-screen (ties naruto/gojo/
  // handler, the roster's "full-size human" mark — the initial 1.5→104px read a touch small). 69 × 1.62 ≈
  // 112px. anchorY 0 plants feet. Verified via measureSprite in Stage 1.
  spriteScale: 1.62,
  animationData: {
    // ── STAGE 1 — MOVEMENT / STATE (reslice'd feet-aligned *_uniform.png; anchorY 0 plants feet). ──
    idle:      { frames: 4,  width: 27, height: 71, speed: 8, anchorY: 0, sheet: "./genos_idle_uniform.png" },
    walk:      { frames: 8,  width: 31, height: 71, speed: 6, anchorY: 0, sheet: "./genos_walk_uniform.png" },
    run:       { frames: 10, width: 45, height: 76, speed: 4, anchorY: 0, sheet: "./genos_run_uniform.png" },
    dash:      { frames: 2,  width: 60, height: 47, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_dash_uniform.png" },
    jump:      { frames: 3,  width: 32, height: 91, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_jump_uniform.png" },
    fall:      { frames: 1,  width: 32, height: 91, speed: 6, anchorY: 0, sourceX: 64, loop: false, lockLastFrame: true, sheet: "./genos_jump_uniform.png" }, // last jump cell held as fall
    hurt:      { frames: 3,  width: 40, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_hurt_uniform.png" },
    knockdown: { frames: 4,  width: 65, height: 39, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_knockdown_uniform.png" }, // fall→prone→bowed leak
    getup:     { frames: 5,  width: 48, height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_getup_uniform.png" },    // rise w/ core-spark → stand
    // Taunt (band 1 gesture) — non-combat; wired via taunt input.
    taunt:     { frames: 6,  width: 45, height: 71, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_taunt_uniform.png" },
    // ── STAGE 2 — normals + guard (render by move name; basic_attacks data above). ──
    light:    { frames: 3, width: 45, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_light_uniform.png" }, // band4 jab
    heavy:    { frames: 6, width: 58, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_heavy_uniform.png" }, // band4 palm-cannon (disjoint fire)
    up:       { frames: 6, width: 58, height: 71, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_heavy_uniform.png" }, // HONEST REUSE of heavy (no upward art) — launcher-typed
    air:      { frames: 4, width: 76, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_air_uniform.png" },   // band8 jet-dash punch
    down_air: { frames: 4, width: 76, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_air_uniform.png" },   // HONEST REUSE of air
    guard:    { frames: 2, width: 38, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_guard_uniform.png" }, // crossed-arms (fills Stage-1 gap)
    // ── STAGE 3 — command chain: Fwd+Heavy 3-stage rush rekka (rendered by move name; GENOS_CMD data in abilities.js). ──
    genosRush1: { frames: 5, width: 57, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_rush1_uniform.png" }, // opener (forward punches)
    genosRush2: { frames: 7, width: 70, height: 66, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_rush2_uniform.png" }, // rapid streak-burst (multi-hit)
    genosRush3: { frames: 8, width: 73, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_rush3_uniform.png" }, // spinning charge launcher finisher
    // ── STAGE 4 — specials (rendered by move name / cast pose; real DATA lives in abilities.js GENOS_INCINERATION / GENOS_SPECIALS). ──
    genosIncinerate1: { frames: 7, width: 117, height: 62,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_incinerate1_uniform.png" }, // Incineration Cannon tier 1 (small)
    genosIncinerate2: { frames: 6, width: 152, height: 65,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_incinerate2_uniform.png" }, // tier 2 (big burst)
    genosIncinerate3: { frames: 5, width: 128, height: 191, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_incinerate3_uniform.png" }, // tier 3 (GIANT flame column)
    genosMachinegun:  { frames: 7, width: 123, height: 82,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_machinegun_uniform.png" },  // Machine Gun Blows (ground + air)
    genosJetdash:     { frames: 7, width: 70,  height: 64,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_jetdash_uniform.png" },     // Jet Dash (gap-closer)
    genosAfterimage:  { frames: 9, width: 73,  height: 67,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_afterimage_uniform.png" }, // Afterimage Dash (blitz → strike)
    // ── STAGE 5 — Overdrive ultimate ignite pose (band 13 flame-column). ──
    genosOverdrive:   { frames: 6, width: 49,  height: 127, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_overdrive_uniform.png" }, // Overdrive ignite (rise → flame column)
    // ── STAGE 6 — win / lose poses. WIN = real band-20 fist-raised tail; LOSE = REUSE knockdown (no dedicated lose art — flagged). ──
    win:  { frames: 5, width: 45, height: 71, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_win_uniform.png" },      // victory: stand → fist-raised
    lose: { frames: 4, width: 65, height: 39, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./genos_knockdown_uniform.png" } // REUSE knockdown (flagged)
  },
  // ── ULTIMATE (Stage 5) — Overdrive: timed power-up MODE (Option B). ~7s ×1.35 dmg / ×1.15 speed, then
  // auto-reverts with an OVERHEAT drawback (8% self-damage + ~2s bonus-damage-taken vulnerability). Data in
  // abilities.js GENOS_OVERDRIVE; band-13 flame-aura ignite. NOT a freeze cinematic — a self-buff state.
  ultimate: { name: "Overdrive", cost: 100, description: "Overclocks his core into a ~7s overdrive — bigger blasts and faster flurries — then the core OVERHEATS: self-damage + a brief window of extra damage taken." },
  // ── Special DATA stubs (Stage 4) — behaviour + real numbers live in abilities.js (GENOS_INCINERATION /
  // GENOS_SPECIALS). Listed here for the move-list UI. Incineration Cannon = neutral tap/hold 3-tier charge.
  specials: {
    incinerationCannon: { cost: 25, isSpecial: true, effect: "Incineration Cannon — neutral tap/hold 3-tier charge blast (tap small / hold big / full-charge GIANT column)" },
    machineGunBlows:    { cost: 35, isSpecial: true, effect: "Machine Gun Blows (Fwd/Air) — rapid yellow jet-punch spread (multi-hit)" },
    jetDash:            { cost: 25, isSpecial: true, effect: "Jet Dash (Down) — lunging gap-closer strike" },
    afterimageDash:     { cost: 30, isSpecial: true, effect: "Afterimage Dash (Back) — i-frame blitz → strike" }
  },
  introPool: ["idle"]   // no dedicated intro art identified (Stage 6 gap) — settles to idle
}

// ─────────────────────────────────────────────────────────────────
// OROCHIMARU  (rosterKey "orochimaru", universe "naruto" — the Sannin, the immortal snake).
// A MANIPULATIVE / TECHNIQUE-MASTER archetype: a schemer with the LARGEST-class toolkit on the roster
// (8 specials + a Summon ultimate + 3 alternate forms) — a deliberate VERSATILITY scope-exception in
// the confirmed Madara / Ichigo / Tobi / Pain lineage (breadth = an answer to every situation, NOT raw
// power; throttled by a deep-but-shared chakra pool). He wins on tools and mind-games, not on stat
// records. STAGE 1 lands registration + all base-form movement/state + the 3-part "reborn from the white
// snake" intro sequence. Normals/grab (S2), command-chain + 8 specials (S3), 3 forms (S4), Summon ult (S5),
// portrait + balance (S6) follow. Source art re-sliced by tools/reslice_orochimaru.py. See below for stats.
// ─────────────────────────────────────────────────────────────────
const orochimaru = {
  rosterKey: "orochimaru", name: "Orochimaru", universe: "naruto", color: "#7b6a9c",
  portrait: "./orochimaru_portrait.png",
  archetypes: ["technician", "zoner"],
  primary: "melee", secondary: ["zoner", "grappler"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "medium", scaling: "technique", animeMovement: true },
  passive: { name: "Living Corpse", effect: "The immortal Sannin — a bottomless bag of forbidden jutsu (snakes, the Kusanagi blade, body-shedding forms) backed by slippery technique rather than raw might." },
  // MANIPULATIVE / VERSATILITY PROFILE (vs BALANCE_AUDIT.md, the Madara/Tobi/Pain lineage): HP1180 (shinobi
  // durable band = Sasuke/Madara — the regenerator, NOT a tank record; below Jason1250/Isshiki1300), atk90
  // (mid = Obito/Tobi/Pain — wins on TOOLS not power; base atk does NOT scale damage — flavor), def86
  // (slippery technician, a touch above the shinobi 84, below Toji89/Superman92), spd92 (upper-mid =
  // Madara/Rengoku — agile snake, deliberately NOT the teleport-tier 96-98; he is a schemer, not a
  // speedster), maxEnergy210 (deep chakra pool between Pain210/Madara220 — headroom to FEED the 8-special
  // + Summon-ult kit, and the SELF-LIMITING THROTTLE that keeps the breadth fair). NO stat is a roster
  // outlier; the large kit is versatility, not a power spike. spriteScale 2.6 → idle ~41px × 2.6 ≈ 107px
  // (human roster band). Full BALANCE_AUDIT entry at Stage 6.
  stats: { maxHealth: 1180, maxEnergy: 210, attack: 90, defense: 86, speed: 92, maxJumps: 2, jumpPower: 27, dashSpeed: 13, dashDuration: 8, dashCooldownMax: 38 },
  // Normals wired in STAGE 2 (5 normals + throw-weapon grab + Fwd/Aerial strongs). Stat block present now
  // so the fighter is valid; the attack ANIMATIONS land with their sheets in Stage 2.
  basic_attacks: {
    light:    { damage: 30, startup: 6,  active: 2, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 60, startup: 12, active: 3, recovery: 20, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 122, rangeY: 48 },   // Kusanagi thrust — long blade reach
    upAttack: { type: "launcher", damage: 46, startup: 9, active: 3, recovery: 17, hitstun: 18, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: 0, airOK: false },
    airAttack:{ damage: 42, startup: 7,  active: 2, recovery: 12, hitstun: 13, knockbackX: 3, knockbackY: -2, rangeX: 84, rangeY: 60 },
    downAir:  { damage: 50, startup: 8,  active: 3, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 10, rangeX: 80, rangeY: 78 },
    // AERIAL STRONG (air+Heavy) — extended-reach aerial Kusanagi swing (engine controls.airHeavy → air_heavy).
    airHeavy: { damage: 64, startup: 9,  active: 4, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -2, rangeX: 120, rangeY: 66 }
  },
  // Grab (throw-weapon): the generic grab pipeline (resolveGrab + updateGrab throw) seizes & hurls; this
  // field makes the combat.js grab hook show his weapon-throw pose (default ~90 raw throw = ~54 EFF).
  grabCastPose: "orochimaruThrow",
  // ULTIMATE — Summoning: Twin Serpents. Inline freeze/camera-focus cinematic on the LIVE fighter (no dup
  // instance — Isshiki/Hiruzen discipline): a giant Manda-class serpent strike. Guaranteed range-independent
  // payoff routed through applyScaledDamage (~210 EFF, cinematic band). Logic: abilities.executeOrochimaruUltimate; FX: game.drawOrochimaruSummonCinematic.
  ultimate: { name: "Summoning: Twin Serpents", cost: 100, description: "Summons a colossal serpent that strikes the opponent — a guaranteed, screen-filling nuke." },
  hasSprites: true,
  spriteScale: 2.6,
  animationData: {
    // ── MOVEMENT / STATE (tools/reslice_orochimaru.py; feet-aligned uniform cells, anchorY 0). ──
    idle:  { frames: 4, width: 26, height: 41, speed: 8, anchorY: 0, sheet: "./orochimaru_idle_uniform.png" },
    walk:  { frames: 6, width: 45, height: 39, speed: 6, anchorY: 0, sheet: "./orochimaru_run_uniform.png" },   // no walk art → run sheet, slower
    run:   { frames: 6, width: 45, height: 39, speed: 4, anchorY: 0, sheet: "./orochimaru_run_uniform.png" },
    dash:  { frames: 3, width: 45, height: 39, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_run_uniform.png" },   // no dash art → first 3 run frames as a lunge
    jump:  { frames: 5, width: 35, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_jump_uniform.png" },
    fall:  { frames: 1, width: 35, height: 46, speed: 5, anchorY: 0, sourceX: 140, loop: false, lockLastFrame: true, sheet: "./orochimaru_jump_uniform.png" },   // descent = jump frame 4 (4×35)
    doubleJump: { frames: 5, width: 35, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_jump_uniform.png" },
    guard:    { frames: 2, width: 24, height: 49, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_guard_uniform.png" },       // standing block
    guardAir: { frames: 1, width: 34, height: 30, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_guardair_uniform.png" },    // crouched low/air guard
    // ── STAGE 2 NORMALS (5) + bonus directional strongs. Character-frame melee (feet-aligned); the strong
    // sheets' extending Kusanagi-blade/snake TAIL frames are reserved for the Stage-3 ranged work — here the
    // reach (rangeX) represents the extension. Engine auto-routes Up/Down/Air heavies; Fwd+Heavy is the
    // command normal (updateOrochimaruCommandCombat). ──
    light:    { frames: 11, width: 45, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_light_uniform.png" },   // snake-whip auto-combo flurry
    heavy:    { frames: 6,  width: 33, height: 46, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_heavy_uniform.png" },    // neutral Kusanagi thrust
    up:       { frames: 6,  width: 41, height: 51, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_up_uniform.png" },       // Up strong (launcher)
    air:      { frames: 4,  width: 67, height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_air_uniform.png" },      // air normal (kick/snake)
    down_air: { frames: 6,  width: 32, height: 40, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_downair_uniform.png" },  // Down strong
    air_heavy:{ frames: 6,  width: 41, height: 73, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_airstrong_uniform.png" }, // AERIAL STRONG (air+Heavy)
    // Forward Strong (Fwd+Heavy command normal) — sourced from p1_strong_attack_forward ONLY
    // (p2_special_move_01 is its confirmed duplicate; NOT imported).
    orochimaruFwdStrong: { frames: 4, width: 46, height: 45, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_fwdstrong_uniform.png" },
    // Grab (throw-weapon) cast pose — the weapon-throw motion (grabCastPose hook sets it on grab).
    orochimaruThrow: { frames: 4, width: 35, height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_throw_uniform.png" },
    // ── STAGE 3 — command-normal CHAIN stages 2-3 (special_move_05) + the 8 specials' cast poses. Rendered
    // by move name (createAttackFromMove / _spriteCastMove); MOVE_TO_ACTION identity-maps each. ──
    orochimaruChain2:       { frames: 4, width: 28,  height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_chain2_uniform.png" },       // chain stage 2 (punch string)
    orochimaruChain3:       { frames: 4, width: 39,  height: 47, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_chain3_uniform.png" },       // chain stage 3 (kick + flash launcher)
    orochimaruSnakeSpit:    { frames: 3, width: 42,  height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_snakespit_uniform.png" },    // GROUND neutral cast (thin snake)
    orochimaruSwordLunge:   { frames: 4, width: 82,  height: 49, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_swordlunge_uniform.png" },   // GROUND Fwd (sword lunge)
    orochimaruSwordThrow:   { frames: 4, width: 53,  height: 54, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_swordthrow_uniform.png" },   // GROUND Back cast (sword throw)
    orochimaruTailSweep:    { frames: 4, width: 65,  height: 65, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_tailsweep_uniform.png" },    // GROUND Up (snake-tail arc)
    orochimaruSlam:         { frames: 4, width: 49,  height: 45, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_slam_uniform.png" },         // GROUND Down (low slam)
    orochimaruSnakeLunge:   { frames: 4, width: 108, height: 51, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_snakelunge_uniform.png" },   // AIR neutral (snake dive)
    orochimaruSnakeBarrage: { frames: 3, width: 35,  height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_snakebarrage_uniform.png" }, // AIR Fwd cast (barrage)
    orochimaruCoil:         { frames: 5, width: 30,  height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_coil_uniform.png" },         // AIR Back (snake-form coil)
    // ── STAGE 4 — shared shed-skin transition (played on every form transform; the morph off special_move_10). ──
    orochimaruShed:         { frames: 6, width: 31,  height: 52, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_shed_uniform.png" },
    // ── STAGE 5 — Summon Ultimate caster pose (held through the freeze cinematic; the giant serpent is a
    // screen-space overlay via game.js drawOrochimaruSummonCinematic). ──
    orochimaruSummonCast:   { frames: 3, width: 34,  height: 46, speed: 8, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_ult_cast_uniform.png" },
    // ── HIT REACTIONS — 4 tiers. Engine auto-uses `hurt` (flinch) + `knockdown` (heavy); the other tiers
    // are forceable bonus poses for damage-scaled recoil / harness coverage. ──
    hurt:        { frames: 2, width: 33, height: 47, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_hurt_uniform.png" },        // light (chakra-crunch recoil)
    hurtSpecial: { frames: 3, width: 29, height: 51, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_hurt_special_uniform.png" },  // special-hit stagger
    hurtHeavy1:  { frames: 2, width: 41, height: 41, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_hurt_heavy1_uniform.png" },   // heavy1 tumble
    hurtHeavy2:  { frames: 1, width: 35, height: 32, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_hurt_heavy2_uniform.png" },   // heavy2 crumple
    // ── KNOCKDOWNS — both variants. `knockdown` = normal down→getup (engine-driven); `knockdownAgainst`
    // = the wall/regen variant (green reanimation getup), a forceable bonus. ──
    knockdown:        { frames: 8,  width: 51, height: 41, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_knockdown_uniform.png" },
    knockdownAgainst: { frames: 11, width: 56, height: 47, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_knockdown_against_uniform.png" },
    // ── 3-PART INTRO SEQUENCE — "reborn from the white snake" (introSequence 1→2→3, last frame holds → idle):
    //    intro1 = appear/gesture · intro2 = coil into serpent form (ends on the snake) · intro3 = giant
    //    snake-head roars → body expelled → rises to combat stance. ──
    intro1: { frames: 2, width: 23, height: 48, speed: 12, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_intro1_uniform.png" },
    intro2: { frames: 9, width: 38, height: 41, speed: 7,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_intro2_uniform.png" },
    intro3: { frames: 8, width: 90, height: 64, speed: 9,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./orochimaru_intro3_uniform.png" }
  },
  introSequence: ["intro1", "intro2", "intro3"]   // 3-part rebirth cinematic, plays in order; last frame hands to idle
}

// ─────────────────────────────────────────────────────────────────
// ONOKI — the Third Tsuchikage of Iwagakure, "Onoki of Both Scales"
// (Naruto). Schema-exception versatility kit built off the CONFIRMED
// ONOKI DESIGN (see ONOKI_ASSET_MAP.md). Source art arrived as 62
// numbered ROW strips (onoki_row_NN.png), RE-SLICED into clean uniform,
// feet-aligned cells (tools/reslice_onoki.py → the *_uniform.png copies;
// the exact-as-uploaded row originals are kept untouched per the build
// mandate). STRUCTURAL SIGNATURE: Onoki is the roster's first character
// with DEDICATED ground↔flight MODE art (canon Dust Release levitation).
// He wires into the existing traits.canFly flight-toggle system (shared
// with Omni-Man/Superman) but, uniquely, ships distinct fly/flyMove
// sheets (row_03 hover-idle, row_20 flight-glide) instead of reusing idle.
// Stage 1 = registration + movement/state (ground + flight) only;
// normals/command-chain/specials/golem-summon ult = later stages.
const onoki = {
  rosterKey: "onoki", name: "Onoki", universe: "naruto",
  portrait: "./onoki_portrait.png",   // bust cropped from the ground-idle frame 0 (no dedicated mugshot art)
  archetypes: ["zoner", "tactics", "flight"],
  primary: "melee", secondary: ["zoner", "flight"],
  // canFly: reuses the shared flight-toggle movement mode (abilities.js toggleOmniManFlight, physics.js
  // _flightActive gravity gate). Onoki uniquely ships dedicated fly/flyMove art (see animationData).
  // energyType "particle" = his Kekkei Tota Dust Release (Particle Style) — HUD label + shared drain pool
  // (flight time competes with jutsu casts, like Omni-Man's Smart Atoms).
  traits: { hasEnergy: true, energyType: "particle", mobility: "medium", scaling: "versatile", animeMovement: true, canFly: true },
  passive: { name: "Both Scales", effect: "The Two Great Sages' pupil — levitates freely on Dust Release and disassembles matter at the atomic scale" },
  // A frail, ancient Kage: LOWER HP/defense than the bruisers, its edge is versatility + flight mobility +
  // ranged Dust Release, not durability. maxEnergy 200 = the shared Particle pool (flight drain + big kit).
  stats: { maxHealth: 1120, maxEnergy: 200, attack: 88, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  // STAGE 2 taijutsu normals (combat.js _getMD reads THIS basic_attacks). Onoki's signature is the
  // Dust-Release ROCK-ARM: the heavy is a long-reach enlarged-rock straight punch, the up is a rock-fist
  // uppercut launcher, and down_air is the inverted rock-leg spike. light = quick jab.
  basic_attacks: {
    light:    { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 84, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 96, rangeY: 46 },   // enlarged rock-arm straight — long reach
    upAttack: { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 17, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },   // rock-fist uppercut launcher
    downAir:  { damage: 74, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },   // inverted rock-leg dive spike
    airAttack:{ damage: 54, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }    // aerial dive kick
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). Dust Release: Detachment
  // of the Primitive World — a summoned stone GOLEM that persists on-field with its own moveset (canon).
  ultimate: { name: "Detachment of the Primitive World", cost: 100, description: "Onoki channels Dust Release to raise a massive stone Golem from the rubble — a persistent summon that fights alongside him with its own moveset." },
  hasSprites: true,
  // Onoki is famously SHORT (canon ~140cm). idle content ≈63px; scale 1.55 → ~98px on-screen, reading a
  // touch under the roster median (~111) as intended. anchorY:0 everywhere → feet planted, no anchor rescale.
  // REQUIRES the skins.js `onoki` default entry (else applySkin() → spriteScale:1 native shrink) + the
  // spritesheets.js SPRITE_MANIFEST idle gate (else procedural box).
  spriteScale: 1.55,
  animationData: {
    // ── GROUND MODE ──
    idle: { frames: 10, width: 62, height: 65, speed: 6, anchorY: 0, sheet: "./onoki_idle_uniform.png" },
    // No dedicated ground-run strip — reuse the walk cycle at a faster cadence for run (Superman precedent).
    walk: { frames: 8, width: 60, height: 65, speed: 6, anchorY: 0, sheet: "./onoki_walk_uniform.png" },
    run:  { frames: 8, width: 60, height: 65, speed: 4, anchorY: 0, sheet: "./onoki_walk_uniform.png" },
    dash: { frames: 5, width: 59, height: 61, speed: 3, anchorY: 0, sheet: "./onoki_dash_uniform.png" },
    guard:{ frames: 7, width: 66, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_guard_uniform.png" },
    // jump = startup+rise (row_08), play once + hold; fall = the flip descent (row_09), play once + hold.
    jump: { frames: 4, width: 56, height: 61, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_jump_uniform.png" },
    fall: { frames: 6, width: 70, height: 67, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_jump_flip_uniform.png" },
    // ── FLIGHT MODE (canon Dust Release levitation) — the shared canFly system resolves these two keys
    // (sprite.js: flyMove when moving horizontally, else fly). Onoki is the FIRST canFly char to ship
    // dedicated flight art rather than reusing idle. ──
    fly:     { frames: 8, width: 49, height: 66, speed: 6, anchorY: 0, sheet: "./onoki_hover_idle_uniform.png" },     // neutral hover (row_03)
    flyMove: { frames: 9, width: 73, height: 64, speed: 4, anchorY: 0, sheet: "./onoki_flight_glide_uniform.png" },   // streaking horizontal flight (row_20)
    // ── SHARED STATE ──
    hurt:      { frames: 9, width: 76, height: 66, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_hit_uniform.png" },
    // KNOCKDOWN chain: getup strip present → sprite.js plays knockdown FALL while down, then getup RISE.
    knockdown: { frames: 5, width: 55, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_knockdown_uniform.png" },
    getup:     { frames: 7, width: 69, height: 57, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_getup_uniform.png" },
    // taunt/victory — arms-raised celebratory pose (row_18).
    taunt:     { frames: 8, width: 74, height: 68, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_taunt_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, RE-SLICED feet-aligned). basic_attacks (above) carries the hit/frame
    // data; these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery.
    // light = quick jab, heavy = enlarged ROCK-ARM straight, up = rock-fist uppercut launcher,
    // air = aerial dive kick, down_air = inverted rock-leg dive spike. ──
    light:    { frames: 4, width: 68, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_light_uniform.png" },
    heavy:    { frames: 7, width: 82, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_heavy_uniform.png" },
    up:       { frames: 8, width: 81, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_up_uniform.png" },
    air:      { frames: 8, width: 76, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_air_uniform.png" },
    down_air: { frames: 9, width: 72, height: 92, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_downair_uniform.png" },
    // ── STAGE 2 COMMAND NORMAL (Fwd+Heavy) — onokiCombo: an 11-frame taijutsu combo string (single
    // committed command-normal, Madara Susanoo-Punch pattern; currentMove="onokiCombo" → sprite.js identity map). ──
    onokiCombo: { frames: 11, width: 70, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_cmdchain_uniform.png" },
    // ── STAGE 3 SPECIALS (Dust Release) — currentMove/_spriteCast identity keys → sprite.js identity map.
    // Neutral=Rock Fist Transform / Fwd=Rock Fist Lunge / Back=Rock Arm Swing / Up=Taunting Combo Finisher
    // (launcher) / Down=Spinning Cape (+ 2 rock projectiles). Jutsu Charge/Launch = CHARGE(P) hold→release:
    // `charge` = the row_45 wind-up loop (isCharging pose), onokiJutsu = the row_16 launch pose. ──
    onokiRockFist: { frames: 8,  width: 80, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_rockfist_uniform.png" },
    onokiLunge:    { frames: 7,  width: 90, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_lunge_uniform.png" },
    onokiArmSwing: { frames: 8,  width: 61, height: 75, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_armswing_uniform.png" },
    onokiTauntFin: { frames: 13, width: 56, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_tauntfin_uniform.png" },
    onokiCapeSpin: { frames: 9,  width: 61, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_capespin_uniform.png" },
    onokiJutsu:    { frames: 8,  width: 68, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_jutsu_launch_uniform.png" },
    charge:        { frames: 10, width: 68, height: 64, speed: 4, anchorY: 0, loop: true, sheet: "./onoki_jutsu_charge_uniform.png" },
    // ── STAGE 4 — flight-mode / air specials + Rock Platform Ride (currentMove/_spriteCast identity keys).
    // Air (airborne or flying): Up=onokiPlatformRide (positioning rise) / Down|Fwd=onokiFastDive (diving
    // spike) / neutral|Back=onokiAerialSpin (cape-trail spin). ──
    onokiFastDive:     { frames: 5,  width: 63, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_fast_dive_uniform.png" },
    onokiAerialSpin:   { frames: 10, width: 71, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_aerial_spin_uniform.png" },
    onokiPlatformRide: { frames: 9,  width: 60, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_platform_ride_uniform.png" },
    // ── STAGE 5 — ULTIMATE cast pose (Dust Release: Detachment of the Primitive World). Onoki holds this
    // hand-sign pose (row_46 cast frames) while the camera focuses; the persistent stone golem (summons.js
    // onokiGolem) then rises and fights alongside him. ──
    onokiUltCast: { frames: 3, width: 74, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./onoki_ult_cast_uniform.png" },
    // HELD IN RESERVE (sliced, not yet wired — need dedicated hooks in later stages): dodge_roll (row_50),
    // backflip (row_44), downed_slide (row_17), heavy_stun reaction (row_32), crouch (row_14),
    // flight_dash (row_05). See ONOKI_ASSET_MAP.md.
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// MAYURI KUROTSUCHI (Bleach — 12th-Division captain, mad scientist). Schema-exception build (like
// Onoki/Madara/Ichigo): an eccentric TECHNICIAN — low raw physical stats offset by ranged/DoT tools
// (poison), utility, and a construct-summon Bankai spike + a bespoke assist (Nemu). Frail: below-median
// HP/def, deliberate. energyType "reiatsu" = the shared Bleach Spirit-Pressure pool (Ichigo/Zaraki
// precedent) — throttles the large kit. REQUIRES the skins.js `mayuri` default entry (else applySkin()
// → spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate (else procedural box).
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const mayuri = {
  rosterKey: "mayuri", name: "Mayuri Kurotsuchi", universe: "bleach",
  portrait: "./mayuri_portrait.png",   // bust cropped from the standing-idle frame 0 (no dedicated mugshot art)
  archetypes: ["zoner", "tactics"],
  primary: "ranged", secondary: ["zoner", "tactics"],
  traits: { hasEnergy: true, energyType: "reiatsu", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Perpetual Research", effect: "The Research & Development captain — turns every clash into data, favouring poison, ranged bursts and summoned constructs over brute force" },
  // A frail mad scientist: LOWER HP/defense/attack than the bruisers — his edge is versatile ranged/DoT
  // tooling + the Bankai construct, not durability or raw power. maxEnergy 200 = the shared Reiatsu pool.
  stats: { maxHealth: 1080, maxEnergy: 200, attack: 82, defense: 78, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip (row_06)
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks). Deliberately mid-low tier (Shinobu/Miwa
  // band) — the scientist wins with tools, not fists. All run createAttackFromMove → scaled ×0.60.
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 78, startup: 9, active: 4, recovery: 19, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 88, rangeY: 44 },
    upAttack: { type: "launcher", damage: 60, startup: 7, active: 4, recovery: 17, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 10, airOK: false },
    downAir:  { damage: 70, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). Bankai: Konjiki Ashisogi
  // Jizō — a massive summoned construct that assembles on-field alongside him.
  ultimate: { name: "Bankai: Konjiki Ashisogi Jizō", cost: 100, description: "Mayuri releases his Bankai — a towering golden construct assembles from his blade and looms over the battlefield, crushing his foe." },
  hasSprites: true,
  // idle content ≈98px; scale 1.15 → ~113px on-screen (roster median), reading as a tall captain.
  // anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.15,
  animationData: {
    // ── STAGE 1 MOVEMENT / STATE ──
    idle:       { frames: 4, width: 50, height: 100, speed: 6, anchorY: 0, sheet: "./mayuri_idle_uniform.png" },
    // Iconic SEATED idle variant (cross-legged) — resolves via _forceAction "idleSeated" (harness/taunt use).
    idleSeated: { frames: 2, width: 86, height: 67, speed: 10, anchorY: 0, sheet: "./mayuri_idle_seated_uniform.png" },
    walk:       { frames: 8, width: 48, height: 100, speed: 6, anchorY: 0, sheet: "./mayuri_walk_uniform.png" },
    run:        { frames: 6, width: 101, height: 80, speed: 4, anchorY: 0, sheet: "./mayuri_run_uniform.png" },
    dash:       { frames: 2, width: 79, height: 80, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_dash_uniform.png" },
    // No dedicated airborne art in the Stage-1 brief → reuse the dash lunge for jump/fall (box-free, reads
    // as a coat-trailing leap). guard reuses the standing idle (no dedicated block art). Both avoid the
    // procedural 128² box; dedicated art can be slotted in a later movement pass.
    jump:       { frames: 2, width: 79, height: 80, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_dash_uniform.png" },
    fall:       { frames: 2, width: 79, height: 80, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_dash_uniform.png" },
    guard:      { frames: 4, width: 50, height: 100, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_idle_uniform.png" },
    crouch:     { frames: 4, width: 82, height: 77, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_crouch_uniform.png" },
    hurt:       { frames: 2, width: 101, height: 111, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_hurt_uniform.png" },
    // KNOCKDOWN chain: getup strip present → sprite.js plays knockdown FALL while down, then getup RISE.
    knockdown:  { frames: 8, width: 119, height: 111, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_knockdown_uniform.png" },
    getup:      { frames: 6, width: 75, height: 102, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_getup_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots). basic_attacks (above) carries hit/frame data; these drive the SPRITE
    // (loop:false + lockLastFrame holds the strike through recovery). light = sword-draw jab, heavy =
    // forward palm/finger thrust, up = vertical sword-thrust launcher (green-slash FX row_26 overlay),
    // air = airborne forward slash (green-slash FX row_32 overlay), down_air = aerial diving slash.
    light:    { frames: 6,  width: 81,  height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_light_uniform.png" },
    heavy:    { frames: 6,  width: 88,  height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_heavy_uniform.png" },
    up:       { frames: 10, width: 110, height: 148, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_up_uniform.png" },
    air:      { frames: 8,  width: 142, height: 91,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_air_uniform.png" },
    down_air: { frames: 6,  width: 94,  height: 80,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_downair_uniform.png" },
    // ── STAGE 2 COMMAND NORMAL (Fwd+Heavy) — a 2-stage cancel-on-hit rekka split from ONE 17f source
    // (row_13): mayuriCmd1 = standing finger-poke string (opener), re-tap Heavy on a clean hit →
    // mayuriCmd2 = drop-to-low flurry finisher (launcher). currentMove = key → sprite.js identity map.
    mayuriCmd1: { frames: 9, width: 70, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_cmd1_uniform.png" },
    mayuriCmd2: { frames: 8, width: 85, height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_cmd2_uniform.png" },
    // ── STAGE 3 SPECIALS (executeMayuriSpecial branches by held dir). currentMove/_spriteCast identity
    // keys → sprite.js identity map. N=Finger-Gun Blast (row_41, muzzle-flash projectile) / F=Energy Slash
    // (row_18 + green-crescent projectile) / U=Rising Cut launcher (row_19) / D=Poison Cloud (row_37 cast +
    // spore-cloud projectile w/ DoT) / B=Lab Coat Open buff (row_42 coat-flung-open, damage multiplier).
    mayuriBlast:    { frames: 12, width: 127, height: 106, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_blast_uniform.png" },
    mayuriSlash:    { frames: 8,  width: 129, height: 102, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_slash_uniform.png" },
    mayuriRising:   { frames: 4,  width: 106, height: 85,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_rising_uniform.png" },
    mayuriPoison:   { frames: 6,  width: 80,  height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_poison_uniform.png" },
    mayuriCoatOpen: { frames: 9,  width: 96,  height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_coatopen_uniform.png" },
    // ── STAGE 4 — BANKAI release cast pose (row_43): held on the LIVE fighter while the golden Konjiki
    // Ashisogi Jizō construct assembles in the freeze-cinematic overlay (drawMayuriBankaiCinematic).
    mayuriBankaiCast: { frames: 9, width: 75, height: 101, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./mayuri_bankai_cast_uniform.png" },
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// KIBA INUZUKA (+ AKAMARU, merged) — Naruto. Schema-exception close-range RUSHDOWN. His whole kit is a
// beast-fusion escalation ladder (Gatsuga → Four Legs → Two-Headed Wolf → Three-Headed Wolf ULT) with
// Akamaru present ONLY inside Kiba's merged technique art (never a separate playable/summon entity —
// Akamaru's standalone art is unfinished grayscale line-art and is banned from gameplay). Aggressive:
// above-median speed + strong normals, average durability. energyType "chakra" = the shared Naruto pool.
// REQUIRES the skins.js `kiba` default entry (else applySkin() → spriteScale:1 native shrink) + the
// spritesheets.js SPRITE_MANIFEST idle gate (else procedural box). See KIBA_ASSET_MAP.md.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const kiba = {
  rosterKey: "kiba", name: "Kiba Inuzuka", universe: "naruto",
  portrait: "./kiba_portrait.png",   // bust cropped from the standing-idle frame 0 (no dedicated mugshot art)
  archetypes: ["melee", "rushdown"],
  primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "aggressive", animeMovement: true },
  passive: { name: "Man-Beast Bond", effect: "Fights fused with Akamaru — a close-range Inuzuka rushdown that escalates through beast-transformations (Four Legs → Two-Headed Wolf → Three-Headed Wolf)" },
  // Aggressive rushdown: above-median SPEED + hard-hitting taijutsu normals, AVERAGE durability (he
  // pays for the speed/offense with no ranged safety — every tool is close-range). HP 1180 = Naruto-tier;
  // maxEnergy 180 = the shared chakra pool that gates Gatsuga tiers + the transformation ladder.
  stats: { maxHealth: 1180, maxEnergy: 180, attack: 90, defense: 82, speed: 92, maxJumps: 2, jumpPower: 31, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 36 },
  // STAGE 2 taijutsu normals (combat.js _getMD reads THIS basic_attacks). Wired with real art in Stage 2;
  // values proposed here so the fighter is functional from Stage 1. Fang-strike close-range kit.
  basic_attacks: {
    light:    { damage: 44, startup: 4, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 82, startup: 6, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 66, startup: 6, active: 4, recovery: 15, hitstun: 18, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 72, startup: 6, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 54, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). Three-Headed Wolf =
  // his biggest beast-fusion, built on the freeze/camera-focus cinematic architecture (Stage 5).
  ultimate: { name: "Three-Headed Wolf", cost: 100, description: "Kiba and Akamaru fuse into a monstrous three-headed wolf and maul the opponent in a spinning vortex of fangs." },
  hasSprites: true,
  // Kiba's source art is small (idle content ≈42px). scale 2.5 → ~105px on-screen, reading at roster
  // median. anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 2.5,
  animationData: {
    // ── STAGE 1 — movement / state ──
    idle:  { frames: 1, width: 27, height: 42, speed: 8, anchorY: 0, sheet: "./kiba_idle_uniform.png" },   // single clean pose, held static (no loop frames exist)
    walk:  { frames: 5, width: 44, height: 31, speed: 6, anchorY: 0, sheet: "./kiba_run_uniform.png" },
    run:   { frames: 5, width: 44, height: 31, speed: 4, anchorY: 0, sheet: "./kiba_run_uniform.png" },
    dash:  { frames: 2, width: 38, height: 33, speed: 4, anchorY: 0, sheet: "./kiba_dash_uniform.png" },
    jump:  { frames: 3, width: 31, height: 43, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_jump_uniform.png" },
    fall:  { frames: 3, width: 31, height: 43, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_jump_uniform.png" },
    guard:     { frames: 1, width: 28, height: 42, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_guard_uniform.png" },
    guard_air: { frames: 1, width: 29, height: 34, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_guard_air_uniform.png" },
    charge:    { frames: 1, width: 27, height: 40, speed: 6, anchorY: 0, loop: true, sheet: "./kiba_charge_uniform.png" },   // chakra-charge held pose feeding specials
    hurt:      { frames: 2, width: 29, height: 42, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_hurt_uniform.png" },
    knockdown: { frames: 6, width: 44, height: 35, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_knockdown_uniform.png" },
    win:       { frames: 1, width: 32, height: 40, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_win_uniform.png" },   // colored row_71 pose (akamaru_winning_pose is unusable line-art)
    // ── STAGE 2 — taijutsu normals (combat.js routes basic_attacks slot → these sprite keys: light/heavy/
    // up/air/down_air). light + air are the STITCHED 2-part continuous claw chains. ──
    light:    { frames: 23, width: 47, height: 46, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_light_uniform.png" },   // attack_combo_1+2 fang-claw flurry
    heavy:    { frames: 5,  width: 59, height: 39, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_heavy_uniform.png" },   // lunging fang strike
    up:       { frames: 10, width: 40, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_upstrong_uniform.png" }, // rising anti-air launcher
    air:      { frames: 15, width: 52, height: 44, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_air_uniform.png" },      // air claw chain (combo_air_1+2)
    down_air: { frames: 3,  width: 34, height: 43, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_downair_uniform.png" },  // down-air spike
    // ── STAGE 2 BONUS directional command-normals (Fwd+Heavy). currentMove = key → sprite.js identity map
    // (abilities.js updateKibaCommandCombat). kibaAerialStrong art is OFF-PALETTE GREEN (flagged). ──
    kibaFwdStrong:    { frames: 3, width: 34, height: 43, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_fwdstrong_uniform.png" },   // Fwd+Heavy grounded lunge
    kibaAerialStrong: { frames: 9, width: 47, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_aerialstrong_uniform.png" }, // air Fwd+Heavy spin
    // ── STAGE 3 — Gatsuga (Fang Passing Fang) 2 tiers (abilities.js executeKibaSpecial; currentMove = key
    // → sprite.js identity map). Weak = neutral Special (quick drill-rush); Strong = Fwd Special (bigger,
    // armored, travels far, orange-FX drill). ──
    kibaGatsugaWeak:   { frames: 5, width: 51, height: 34, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_gatsuga_weak_uniform.png" },   // stance→crouch→all-fours→lunge→drill
    kibaGatsugaStrong: { frames: 4, width: 70, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_gatsuga_strong_uniform.png" }, // all-fours→orange twin-drill×3
    // ── STAGE 4 — Beast-Fusion (abilities.js executeKibaSpecial: Down=Four Legs / Up=Two-Headed Wolf).
    // Four Legs = the CLEAN feral-transform frames (Stage-0 vetted _1+_2; _3-_6 blue-block dropped). Two-
    // Headed Wolf = the colored twin-drill FX (mode_4+mode_5; _1/_2 genuinely absent). ──
    kibaFourLegs:  { frames: 30, width: 46, height: 52,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_fourlegs_uniform.png" },   // Shikyaku no Jutsu transform cast
    kibaTwoHeaded: { frames: 4,  width: 167, height: 83, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kiba_twoheaded_uniform.png" },   // horizontal twin-drill rush
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BORUTO UZUMAKI — Naruto/Boruto. VERSATILE technician (medium kit): hard-hitting taijutsu normals + a
// broad ninjutsu toolbox (Rasengan ground/air/Vanishing, Lightning Shiden, wind/water breath cast, kunai
// throw, Shadow Clone) capped by the Kote (Scientific Ninja Tool) cinematic super. Agile teenage prodigy:
// above-median SPEED + 2 jumps, average durability. energyType "chakra" = the shared Naruto pool.
// SOURCE ART GAPS (confirmed absent, NOT invented): no walk cycle (walk borrows the run strip), no
// backdash, no throw/grab, no Karma-mark or Jougan alternate form/palette. Signature-move FX (Rasengan
// orb, lightning arcs, projectiles, clone smoke, Kote muzzle-flash) are AUTHORED in Stage 3/4, not in art.
// REQUIRES the skins.js `boruto` default entry (else applySkin() → spriteScale:1 native shrink) + the
// spritesheets.js SPRITE_MANIFEST idle gate (else procedural box). See tools/reslice_boruto.py.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const boruto = {
  rosterKey: "boruto", name: "Boruto Uzumaki", universe: "naruto",
  portrait: "./boruto_portrait.png",   // bust cropped from the standing-idle frame 0 (no dedicated mugshot art)
  archetypes: ["melee", "ranged", "technical"],
  primary: "melee", secondary: ["ranged", "technical"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "New Era Shinobi", effect: "A versatile prodigy who mixes crisp taijutsu with a deep ninjutsu toolbox (Rasengan, Lightning Release, Shadow Clones) and the Kote scientific ninja tool" },
  // Versatile technician: above-median SPEED + agility, AVERAGE durability. He trades a tank's HP for reach
  // and options (every element of his kit answers a different range). HP 1120 = below Naruto-tier (nimble
  // teen); maxEnergy 180 = the shared chakra pool that fuels his ninjutsu + gates the Kote ultimate.
  stats: { maxHealth: 1120, maxEnergy: 180, attack: 88, defense: 80, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 34 },
  // STAGE 2 taijutsu normals (combat.js _getMD reads THIS basic_attacks). Real art wired in Stage 2; values
  // proposed here so the fighter is functional from Stage 1. Heavy = the long-recovery punishable strong.
  basic_attacks: {
    light:    { damage: 40, startup: 3, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 78, startup: 6, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 64, startup: 5, active: 2, recovery: 15, hitstun: 18, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 70, startup: 5, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). Kote = his 5-part cinematic
  // super, built on the freeze/camera-focus cinematic architecture (Stage 4).
  ultimate: { name: "Kote Barrage", cost: 100, description: "Boruto unleashes the Kote (Scientific Ninja Tool), firing a rapid barrage of stored jutsu that culminates in a devastating point-blank blast." },
  introPool: ["intro"],   // 4f relaxed entrance (introduction.png) — the only genuinely relaxed posture in the set; plays once → hands off to idle
  hasSprites: true,
  // Boruto's idle source content ≈70px. scale 1.5 → ~105px on-screen, reading at roster median. anchorY:0
  // everywhere → feet planted, no anchor rescale.
  spriteScale: 1.5,
  animationData: {
    // ── STAGE 1 — movement / state ──
    idle:  { frames: 12, width: 52, height: 72, speed: 6, anchorY: 0, sheet: "./boruto_idle_uniform.png" },   // 7f stance baked into a 1→7→1 ping-pong (no engine yoyo)
    walk:  { frames: 6, width: 62, height: 67, speed: 6, anchorY: 0, sheet: "./boruto_run_uniform.png" },      // NO walk art exists → borrows the run strip (flagged gap, not invented)
    run:   { frames: 6, width: 62, height: 67, speed: 4, anchorY: 0, sheet: "./boruto_run_uniform.png" },
    dash:  { frames: 3, width: 54, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_dash_uniform.png" },   // push-off → afterimage smear → arrival
    jump:  { frames: 4, width: 53, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_jump_uniform.png" },
    fall:  { frames: 4, width: 53, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_jump_uniform.png" },
    guard:     { frames: 1, width: 37, height: 84, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_guard_uniform.png" },  // standing block (cell 0; crouch-block cells 1-2 reserved)
    charge:    { frames: 5, width: 46, height: 78, speed: 6, anchorY: 0, loop: true, sheet: "./boruto_charge_uniform.png" },   // chakra-charge cycling pose feeding specials
    hurt:      { frames: 3, width: 52, height: 78, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_hurt_uniform.png" },   // grounded light recoil (progressive narrowing)
    hurt_air:  { frames: 5, width: 71, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_hurt_heavy_uniform.png" },  // airborne heavy knockback (taking_heavy_damage)
    knockdown: { frames: 5, width: 86, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_knockdown_uniform.png" },  // impact→prone→sit-up→knee→rise (getup folded in)
    win:       { frames: 3, width: 51, height: 81, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_win_uniform.png" },   // front-facing victory pose (WIN ONLY — silhouette differs from gameplay art)
    intro:     { frames: 4, width: 42, height: 82, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_intro_uniform.png" },   // 4f relaxed entrance (introPool), plays once → idle
    // ── STAGE 2 — taijutsu normals (combat.js routes basic_attacks slot → these sprite keys: light/heavy/
    // up/air/down_air). light = the 2-hit punch→kick auto-combo (row_09). ──
    light:    { frames: 8, width: 73, height: 82, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_light_uniform.png" },   // Punch set A (4f) → Kick set B (4f)
    heavy:    { frames: 4, width: 71, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_heavy_uniform.png" },   // strong forward punch (long punishable recovery)
    up:       { frames: 3, width: 76, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_up_uniform.png" },      // uppercut launcher (active frame 2 only)
    air:      { frames: 6, width: 73, height: 78, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_air_uniform.png" },     // air punch (3f) + air kick (3f), descending
    down_air: { frames: 3, width: 69, height: 81, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_downair_uniform.png" }, // divekick (hold frame 2 descending)
    // ── STAGE 2 BONUS command-normals (abilities.js updateBorutoCommandCombat; currentMove = key →
    // sprite.js identity map). Low Sweep = Ground Down+Heavy; the two aerial combos = an Air-Heavy cancel
    // string (AirCombo1 → re-tap Heavy on hit → AirCombo2 spinning-dive finisher). ──
    borutoLowSweep:   { frames: 6, width: 61, height: 64, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_lowsweep_uniform.png" },    // Down+Heavy forced-knockdown low sweep
    borutoAirCombo1:  { frames: 8, width: 71, height: 87, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_aircombo1_uniform.png" },   // Air-Heavy opener
    borutoAirCombo2:  { frames: 9, width: 73, height: 85, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_aircombo2_uniform.png" },   // ~180° spinning-dive finisher (spike)
    // ── STAGE 3 — directional special CAST poses (abilities.js executeBorutoSpecial; currentMove/
    // _spriteCastMove = key → sprite.js identity map). Signature-move FX authored in abilities/game.js:
    // Rasengan orb reuses the shared Naruto sphere, kunai reuses the shared shuriken, the Shiden electric
    // arc is a procedural overlay (game.drawBorutoShidenFX), wind/palm gusts are energy projectiles. ──
    borutoRasengan:    { frames: 8,  width: 67,  height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_rasengan_ground_uniform.png" },  // N ground — Rasengan thrust
    borutoRasenganAir: { frames: 4,  width: 136, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_rasengan_air_uniform.png" },     // N air — Rasengan dive (dark impact)
    borutoVanishing:   { frames: 10, width: 74,  height: 85, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_vanishing_uniform.png" },        // air Back — Vanishing Rasengan (faint FX)
    borutoShiden:      { frames: 5,  width: 146, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_shiden_uniform.png" },            // F — Lightning Shiden thrust (arc FX overlay)
    borutoWindWater:   { frames: 6,  width: 107, height: 80, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_windwater_uniform.png" },         // B — Wind/Water breath cast → projectile
    borutoPalmBlast:   { frames: 9,  width: 157, height: 98, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_sutorimu_all_uniform.png" },      // U — Palm Blast wind-streak cast → projectile
    borutoClone:       { frames: 4,  width: 51,  height: 82, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_clone_uniform.png" },             // D — Shadow Clone seal (clone assist + smoke)
    borutoThrowAir:    { frames: 6,  width: 73,  height: 90, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_throw_air_uniform.png" },         // air Fwd — Throw Weapon (kunai projectile)
    // ── STAGE 4 — Kote (Scientific Ninja Tool) ULTIMATE cast pose. The LIVE fighter plays the 19f stitched
    // 5-part firing sequence over the cinematic; game.drawBorutoKoteFX/Cinematic layer the authored FX. ──
    borutoKote:        { frames: 19, width: 107, height: 77, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./boruto_kote_uniform.png" },   // U — Kote Barrage cinematic (5-part fire → recoil payoff → advancing fire)
  }
}

// ─────────────────────────────────────────────────────────────────
// BYAKUYA KUCHIKI  (rosterKey "byakuya", universe "bleach"). Squad-6 captain, precise Shunpo swordsman.
// LARGE schema-exception kit (~a dozen special-tier attacks + 2-phase Bankai) built from 56 numbered ROW
// strips (Byakuya_Kuchiki_row_NN.png), RE-SLICED feet-aligned by tools/reslice_byakuya.py. Stage 0 audit
// + 4 design decisions locked (see memory byakuya-build). STAGE 2 = movement/state only; normals (Stage 3)
// and specials/Bankai (Stage 4/5) append their animationData rows later.
//
// TECHNICIAN GLASS-CANNON profile (user "you pick"): lower HP/defense than the bruisers — its edge is Shunpo
// mobility + a broad precision kit, NOT durability. Baked-in fragility is the balance-correct downside for a
// versatility outlier (Zaraki/Pain/Saitama/Hashirama class). energyType "reiatsu" (ui.js ENERGY_TYPE_LABELS
// already carries "Reiatsu"). REQUIRES the skins.js `byakuya` default (else spriteScale:1 native-shrink) +
// the spritesheets.js idle gate (else procedural box).
// ─────────────────────────────────────────────────────────────────
const byakuya = {
  rosterKey: "byakuya", name: "Byakuya Kuchiki", universe: "bleach", color: "#c9b8cf",
  portrait: "./byakuya_portrait.png",   // placeholder bust from idle frame 0 (final portrait row chosen at Stage 6)
  archetypes: ["rushdown", "technician", "zoner"],
  primary: "melee", secondary: ["rushdown", "zoner"],
  traits: { hasEnergy: true, energyType: "reiatsu", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Flash Master", effect: "Kuchiki nobility honed to a razor — flickers between Shunpo steps and scatters Senbonzakura's petals to control space, trading durability for precision and reach" },
  // Glass-cannon technician: HP/def below the bruisers; fast (speed 92) with strong Shunpo dash mobility.
  // maxEnergy 200 = the shared Reiatsu pool (big kit + Bankai ult).
  stats: { maxHealth: 1080, maxEnergy: 200, attack: 92, defense: 86, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 12, dashCooldownMax: 40 },
  // STAGE 3 normals (combat.js _getMD reads this; animationData.{light,heavy,up,air,down_air} drives the
  // sprite). Technician katana kit: quick light draw-cut, committed low-sweep heavy with katana reach, a
  // raised-slash up-launcher, forward air thrust, and a diagonal down_air. Low-ish damage — the glass-cannon
  // pressure comes from speed + the specials (Stage 4), not raw normal damage.
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 76, startup: 8, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 92, rangeY: 44 },
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 70, startup: 7, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 5, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js at Stage 5).
  ultimate: { name: "Bankai: Senbonzakura Kageyoshi", cost: 100, description: "Byakuya releases his Bankai — a thousand blades scatter into a storm of Senbonzakura petals that converge on his foe." },
  hasSprites: true,
  // Byakuya content ≈117px tall; scale 1.1 → a tall, dignified captain reading near the roster's upper-mid.
  // anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.1,
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip (mega-row 08 f6)
  animationData: {
    // ── STAGE 2 MOVEMENT / STATE (row_11 idle, mega-row 08 walk/crouch, row_02 dash, mega-row 09 hurt/
    // knockdown, row_10 getup, row_25 guard, row_32 taunt, row_33 intro). No dedicated jump/fall art in the
    // audit → jump & fall reuse the row_02 airborne pose (honest fallback, flagged).
    idle:  { frames: 5, width: 57,  height: 101, speed: 6, anchorY: 0, sheet: "./byakuya_idle_uniform.png" },
    walk:  { frames: 5, width: 90,  height: 101, speed: 6, anchorY: 0, sheet: "./byakuya_walk_uniform.png" },
    run:   { frames: 5, width: 90,  height: 101, speed: 4, anchorY: 0, sheet: "./byakuya_walk_uniform.png" },   // reuse walk faster (no dedicated run strip)
    dash:  { frames: 4, width: 64,  height: 90,  speed: 3, anchorY: 0, sheet: "./byakuya_dash_uniform.png" },
    jump:  { frames: 4, width: 64,  height: 90,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_dash_uniform.png" },   // reuse airborne pose
    fall:  { frames: 4, width: 64,  height: 90,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_dash_uniform.png" },   // reuse airborne pose
    crouch:{ frames: 1, width: 72,  height: 73,  speed: 6, anchorY: 0, sheet: "./byakuya_crouch_uniform.png" },
    hurt:      { frames: 3, width: 97,  height: 92,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_hurt_uniform.png" },       // [row_09 sub-clip boundary UNCONFIRMED]
    knockdown: { frames: 2, width: 95,  height: 98,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_knockdown_uniform.png" },  // [row_09 sub-clip boundary UNCONFIRMED]
    getup:     { frames: 9, width: 106, height: 101, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_getup_uniform.png" },
    guard:     { frames: 4, width: 120, height: 91,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_guard_uniform.png" },
    taunt:     { frames: 4, width: 93,  height: 101, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_taunt_uniform.png" },
    intro:     { frames: 14, width: 108, height: 98, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_intro_uniform.png" },
    // ── STAGE 3 NORMALS (5 slots, FX-LESS content). basic_attacks (above) carries the hit/frame data; these
    // drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. light = iai draw-cut
    // (row_08 f7-12), heavy = low blade sweep (row_09 f0-3), up = raised slash launcher (row_50), air =
    // forward thrust (row_48), down_air = diagonal down slash (row_45). crouchLight = crouching teal swipe
    // (row_20) — swapped in by the generic crouch-variant hook when light is thrown while holding Down.
    light:    { frames: 6, width: 72,  height: 99,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_light_uniform.png" },
    heavy:    { frames: 4, width: 76,  height: 97,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_heavy_uniform.png" },
    up:       { frames: 1, width: 86,  height: 100, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_up_uniform.png" },
    air:      { frames: 1, width: 52,  height: 100, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_air_uniform.png" },
    down_air: { frames: 1, width: 81,  height: 98,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_downair_uniform.png" },
    crouchLight: { frames: 4, width: 112, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_crouchlight_uniform.png" },
    // ── STAGE 4 SPECIAL CAST POSES (currentMove / _spriteCastMove identity keys → sprite.js MOVE_TO_ACTION).
    // GROUND: N=Petal Cast (byakuyaPetalCast) / F=Re-form Thrust / U=Re-form Overhead (both = Utsusemi vanish
    // → teleport-in → strike) / B=Shunpo blink (out+in) / D=Straight Thrust. AIR: N=Jump Slash / F=Airborne
    // Vault. loop:false + lockLastFrame holds the pose through recovery.
    byakuyaThrust:        { frames: 8, width: 111, height: 101, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_thrust_uniform.png" },       // D — straight lunge thrust
    byakuyaPetalCast:     { frames: 5, width: 86,  height: 101, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_petalcast_b_uniform.png" },   // N — Senbonzakura petal cast
    byakuyaShunpoOut:     { frames: 3, width: 64,  height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_shunpo_out_uniform.png" },    // B — Shunpo dissolve-out
    byakuyaShunpoIn:      { frames: 3, width: 64,  height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_shunpo_in_uniform.png" },     // B — Shunpo dissolve-in
    byakuyaReformVanish:  { frames: 7, width: 72,  height: 101, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_reform_vanish_uniform.png" }, // F/U — Utsusemi vanish
    byakuyaReformOverhead:{ frames: 8, width: 95,  height: 114, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_reform_overhead_uniform.png" },// U — re-form overhead cut
    byakuyaReformThrust:  { frames: 7, width: 125, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_reform_thrust_uniform.png" }, // F — re-form horizontal thrust
    byakuyaJumpSlash:     { frames: 7, width: 129, height: 102, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_jumpslash_uniform.png" },     // air N — jump slash
    byakuyaAirVault:      { frames: 7, width: 95,  height: 115, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_airvault_uniform.png" },       // air F — airborne vault
    // ── STAGE 5 BANKAI: "Senbonzakura Kageyoshi" — 2-phase inline freeze cinematic. The CHARACTER poses
    // (charge → transform → thrust) drive the LIVE sprite via _spriteCastMove; the blue reiatsu wings + blast
    // are cinematic OVERLAYS (game.js drawByakuyaSpecialFx, driven by _byakuyaBankaiTimer). Feet bottom-align
    // normally (the tall-canvas FX space is handled in the overlay, not here).
    byakuyaBankaiCharge:    { frames: 5, width: 81,  height: 101, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_bankai_charge_uniform.png" },
    byakuyaBankaiTransform: { frames: 2, width: 81,  height: 101, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_bankai_transform_uniform.png" },
    byakuyaBankaiThrust:    { frames: 4, width: 144, height: 93,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./byakuya_bankai_thrust_uniform.png" }
  }
}

// ─────────────────────────────────────────────────────────────────
// LIGHT YAGAMI  (rosterKey "light", universe "deathnote"). Death Note's Kira — a special-heavy zoner/
// technician built from the prodijiu JUS sprite set (20 per-action light_yagami_*.png files, RE-SLICED
// feet-aligned by tools/reslice_light.py). Stage 0 audit + user decisions locked (see memory
// light-yagami-build): NO deck/support-panel system exists → koma sheets repurposed (notebook→scythe = a
// 2nd ultimate-tier move); call-ins credited by real name (Ryuk / L / placeholder gunman).
//
// SPECIAL-HEAVY profile (flagged vs BALANCE_AUDIT like Toji, resolved at Stage 7): a LIGHT 3-move normal set
// (B / B-fwd / B-down) against 7 special-tier moves + 2 ultimates. He is not a brawler — his power is the
// summoned Shinigami/detective call-ins and Death Note. Average durability, deep Kira pool. energyType "kira"
// (ui.js ENERGY_TYPE_LABELS carries "Kira"). REQUIRES the skins.js `light` default (else applySkin →
// spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate (else procedural box).
// STAGE 1 = movement/state only; normals (Stage 2) and specials/ultimates (Stage 4-6) append later.
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// L "RYUUZAKI" (universe: deathnote) — L Lawliet, the world's greatest detective.
// SCHEMA-EXCEPTION build (same universe + idiom as Light Yagami). Slim capoeira-kicker /
// special-heavy zoner-technician: messy black hair, white long-sleeve shirt, blue jeans.
// STAGE 1 = registration + movement/state ONLY (no normals/specials/ult yet).
// Source art = 29 keyed strips in l_ryuuzaki_sprite_rows_sliced/, RE-SLICED feet-aligned by
// tools/reslice_l_ryuuzaki.py → l_ryuuzaki_*_uniform.png. anchorY:0 everywhere plants feet.
// NO ultimate (real art gap — Jason precedent). `ultimate` below is a HUD PLACEHOLDER only.
// ─────────────────────────────────────────────────────────────────
const lRyuuzaki = {
  rosterKey: "l_ryuuzaki", name: "L", universe: "deathnote", color: "#3a3a44",
  portrait: "./l_ryuuzaki_portrait.png",   // L face-bust from idle_face frame 0 (Ryuk frames reserved for Stage 5)
  archetypes: ["zoner", "technical", "ranged"],
  primary: "melee", secondary: ["ranged", "technical"],
  // NEW energyType "deduction" → ui.js ENERGY_TYPE_LABELS adds { deduction: "Deduction" }.
  traits: { hasEnergy: true, energyType: "deduction", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "The Greatest Detective", effect: "L reads his opponent — a deep toolbox of capoeira strikes, call-ins, and analysis over raw brawling, trading a heavy hitter's stats for reach and options" },
  // Frail special-heavy zoner/technician (locked stats). Below-median durability; a deep Deduction pool
  // (200) to fuel the later special kit; average mobility. His edge is reach + options, not raw stats.
  stats: { maxHealth: 1040, maxEnergy: 200, attack: 84, defense: 80, speed: 90, maxJumps: 2, jumpPower: 32, dashSpeed: 19, dashDuration: 10, dashCooldownMax: 36 },
  // ── STAGE 2 — 5 normals (combat.js _getMD reads THIS basic_attacks; data keys map to sprite keys:
  // light→light, heavy→heavy, upAttack→up, airAttack→air, downAir→down_air). Frail technician profile
  // (Light-family): fast light poke, committed heavy palm + gold swipe, rising uppercut LAUNCHER (moveKey
  // "up" auto-sets launcher; launchVy/selfVy give the EXACT pop, sixPathsPain precedent), airborne spin
  // kick, downward dive spike (moveKey "down_air" auto-sets spike). All RAW (engine scales ×0.60), inside
  // existing roster bands. The golden arc is BAKED into the source frames (row_10/11/12/13) — NO separate
  // FX overlay (the swing art carries it; Light's separate gold/blue overlay is his idiom, not required here).
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 58, rangeY: 46 },                                                      // quick straight jab (row_09)
    heavy:    { damage: 72, startup: 7, active: 4, recovery: 18, hitstun: 19, knockbackX: 8, knockbackY: 1, rangeX: 74, rangeY: 48 },                                                      // committed palm + golden swipe (row_10)
    upAttack: { type: "launcher", damage: 66, startup: 6, active: 4, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: -6, airOK: false },      // rising uppercut LAUNCHER + upward golden arc (row_11)
    airAttack:{ damage: 58, startup: 5, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 },                                                                            // airborne spin kick + golden crescent (row_12)
    downAir:  { damage: 62, startup: 6, active: 3, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 11, rangeX: 62, rangeY: 66 }                                                     // downward dive spike + flame-trail (row_13, SHARED w/ Stage-3 chain)
  },
  // HUD PLACEHOLDER ONLY — L has NO ultimate (confirmed art gap; row_19 ships as a special at Stage 4,
  // NOT promoted to a cinematic ult). No real ult logic exists in abilities.js. This field only labels
  // the HUD meter; it is NOT wired to a triggerUltimate path.
  ultimate: { name: "—", cost: 100, description: "(Stage 1 placeholder — L has no ultimate; his marquee golden-nova ships as a special.)", placeholder: true },
  hasSprites: true,
  // L's idle content ≈50px tall (slim chibi). scale 2.0 → ~100px on-screen, reading at roster median.
  // anchorY:0 everywhere → feet on the shared foot baseline, no anchor rescale.
  spriteScale: 2.0,
  animationData: {
    // ── STAGE 1 — movement / state (tools/reslice_l_ryuuzaki.py). ──
    // idle (standing) = row_20 with the trailing 2 debris islands dropped, baked to a ping-pong loop.
    idle:       { frames: 24, width: 26, height: 52, speed: 7, anchorY: 0, sheet: "./l_ryuuzaki_idle_uniform.png" },
    // SEATED idle (row_22) — contextual variant + WIN POSE (L's signature perch). Resolves via
    // _forceAction "idleSeated" (Mayuri precedent) + as the win pose (win: below). NOT an auto driven
    // movement state — no core-loop hook added (least-invasive; see build report).
    idleSeated: { frames: 14, width: 27, height: 51, speed: 9, anchorY: 0, sheet: "./l_ryuuzaki_idle_seated_uniform.png" },
    walk:       { frames: 4,  width: 24, height: 52, speed: 6, anchorY: 0, sheet: "./l_ryuuzaki_walk_uniform.png" },
    run:        { frames: 10, width: 46, height: 44, speed: 4, anchorY: 0, sheet: "./l_ryuuzaki_run_uniform.png" },
    dash:       { frames: 10, width: 46, height: 44, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_dash_uniform.png" },   // run tail = faster lunge cells
    // jump / fall — the capoeira acro (row_07) doubles as air-state (audit-approved double-duty).
    jump:       { frames: 8,  width: 46, height: 51, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_jump_uniform.png" },
    fall:       { frames: 8,  width: 46, height: 51, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_jump_uniform.png" },
    // guard = PROCEDURAL FALLBACK (confirmed art gap — no dedicated block art). Reuse the standing idle
    // so the guard action never renders the 128² box (Mayuri guard-reuses-idle precedent); no fabricated art.
    guard:      { frames: 24, width: 26, height: 52, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_idle_uniform.png" },
    // hurt / knockdown / getup — knockdown strip (trailing 3px debris sliver dropped). getup = f10 in-engine.
    hurt:       { frames: 10, width: 52, height: 51, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_knockdown_uniform.png" },
    knockdown:  { frames: 10, width: 52, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_knockdown_uniform.png" },
    // taunt — accusing point (point strip, 5f).
    taunt:      { frames: 5,  width: 41, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_taunt_uniform.png" },
    // WIN POSE = the seated idle (L's signature crouched perch). game.js poses the winner via _forceAction
    // "win" when animationData.win exists → reuses the seated sheet (no new art).
    win:        { frames: 14, width: 27, height: 51, speed: 9, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_idle_seated_uniform.png" },

    // ── STAGE 2 — 5 normals (tools/reslice_l_ryuuzaki.py). combat.js routes each basic_attacks slot →
    // the SPRITE key here (light/heavy/up/air/down_air). The golden arc is BAKED into these strips
    // (row_10/11/12/13) — no separate FX overlay. anchorY:0 → feet planted on the shared baseline. ──
    light:    { frames: 4, width: 50, height: 49, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_light_uniform.png" },    // straight jab (row_09)
    heavy:    { frames: 4, width: 52, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_heavy_uniform.png" },    // heavy palm + golden swipe (row_10)
    up:       { frames: 5, width: 50, height: 53, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_up_uniform.png" },       // rising uppercut LAUNCHER + gold arc (row_11)
    air:      { frames: 5, width: 50, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_air_uniform.png" },      // air spin kick + golden crescent (row_12)
    down_air: { frames: 3, width: 46, height: 47, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_downair_uniform.png" },  // downward dive spike (row_13, SHARED w/ Stage-3 chain)

    // ── STAGE 3 — merged capoeira COMMAND-NORMAL CHAIN (Fwd+Heavy → 3-stage cancel-on-hit rekka).
    // ONE continuous acrobatic motion, UNIONED from row_07 (spine) + row_16 + row_17 + row_13 and
    // de-duplicated on the confirmed exact-pixel identical frames (row_07 f2==row_16 f1; row_07
    // f3/f7==row_17 f4; row_07 f4/f8==row_17 f5; row_07 f6==row_13 f3 — the SHARED dive/plunge tail
    // that ALSO serves Stage-2 down_air, kept intact). 16 unique frames split into 3 escalating beats
    // (5+4+7). currentMove = key → sprite.js identity map. Assembled by tools/reslice_l_ryuuzaki.py.
    lRyuuzakiCmd1: { frames: 5, width: 56, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_cmd1_uniform.png" },  // LOW SWEEP entry (opener)
    lRyuuzakiCmd2: { frames: 4, width: 57, height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_cmd2_uniform.png" },  // RISING CRESCENT kick (strong hit)
    lRyuuzakiCmd3: { frames: 7, width: 56, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_cmd3_uniform.png" },  // AERIAL DIVE plunge (launcher finisher)

    // ── STAGE 4 — special CAST/HOLD poses + the EX attack pose (tools/reslice_l_ryuuzaki.py). Each dir-
    // special plays a cast pose (_spriteCastMove → sprite.js MOVE_TO_ACTION identity) then spawns a one-shot
    // phantom-hitbox projectile (the FX/summon sheet rides as the projectile sprite; Light LIGHT_SUMMONS
    // idiom). The EX flurry (kick_trail) plays as currentMove = "lRyuuzakiKickTrail". anchorY:0 plants feet. ──
    lRyuuzakiNovaCast:    { frames: 4,  width: 60, height: 62, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_nova_uniform.png" },          // neutral — Golden Nova (cast + proj share this strip)
    lRyuuzakiBazookaCast: { frames: 4,  width: 99, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_bazooka_cast_uniform.png" },  // Fwd — Bazooka shoulder-and-fire pose
    lRyuuzakiRisingCast:  { frames: 5,  width: 54, height: 43, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_rising_cast_uniform.png" },   // Back — Golden Rising Burst wind-up
    lRyuuzakiAnalysis:    { frames: 12, width: 34, height: 52, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_analysis_uniform.png" },      // Down — Investigation notebook manifest+hold (non-lethal buff)
    lRyuuzakiKickTrail:   { frames: 8,  width: 85, height: 80, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_kicktrail_uniform.png" },     // EX — multi-hit capoeira flurry (cancel-only)

    // ── STAGE 5 — RYUK cameo-attack (Up special). L plays a summon GESTURE (reuses the accusing-point
    // taunt art — "sic Ryuk on him") then a one-shot phantom-hitbox Ryuk projectile SWOOPS IN (L's OWN
    // Ryuk art l_ryuuzaki_ryuk_uniform, hover → laugh-lunge). Light LIGHT_SUMMONS.ryuk idiom, non-persistent.
    lRyuuzakiRyukCast:    { frames: 5,  width: 41, height: 52, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./l_ryuuzaki_taunt_uniform.png" }           // Up — Ryuk summon gesture (L points, Ryuk swoops in)
  }
}

const light = {
  rosterKey: "light", name: "Light Yagami", universe: "deathnote", color: "#b53a3a",
  portrait: "./light_portrait.png",   // placeholder bust from idle frame 0 (final row_01 face portrait chosen at Stage 7)
  archetypes: ["zoner", "technical", "ranged"],
  primary: "melee", secondary: ["ranged", "technical"],
  traits: { hasEnergy: true, energyType: "kira", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Shinigami's Notebook", effect: "Kira fights at range through call-ins — Ryuk's reach, L's strikes, and the Death Note itself — trading a brawler's normals for a deep toolbox of summons and notebook power" },
  // Special-heavy zoner/technician: average HP + durability, a deep Kira pool (200) that fuels 7 special-tier
  // moves plus two ultimates. Speed is average — his edge is reach and options, not mobility or raw stats.
  stats: { maxHealth: 1080, maxEnergy: 200, attack: 86, defense: 82, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  // STAGE 2 normals — the B family (combat.js _getMD reads this; animationData.{light,heavy} + the crouchLight
  // variant drive the sprite). HONEST 3-move set per the Stage-0 audit: Light has NO up/air/down_air NORMALS —
  // his anti-air and aerial game are ALL specials (B+Up Ryuk, jump+B/jump+Y — Stage 4). Omitting those slots
  // makes _getMD return null → those buttons no-op (no fabricated whiff-normal) rather than inventing art.
  //   light   = B (neutral)     — quick jab-string body, gold spark FX
  //   heavy   = B+Forward       — committed forward swing (same body, dedupe), blue crescent-arc FX, more reach
  //   (Down+light swaps in the crouchLight sprite = B+Down close-range low swipe — the "most honest" poke.)
  basic_attacks: {
    light: { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0, rangeX: 58, rangeY: 44 },
    heavy: { damage: 76, startup: 7, active: 4, recovery: 18, hitstun: 19, knockbackX: 8, knockbackY: 1, rangeX: 74, rangeY: 46 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js at Stage 5/6). Two ultimate-tier
  // payoffs: ultimate_action (the giant cut-in) + the koma notebook→scythe transform (2nd ult, Stage 6).
  ultimate: { name: "As Planned", cost: 100, description: "Light writes the final name in the Death Note, sealing his foe's fate (Ultimate). Hold Down+Ultimate for \"I Am Kira\" — the notebook morphs into the Shinigami scythe." },
  hasSprites: true,
  // Light's idle content ≈54px tall (small JUS chibi). scale 1.9 → ~103px on-screen, reading at roster median.
  // anchorY:0 everywhere → feet planted on the shared foot baseline, no anchor rescale.
  spriteScale: 1.9,
  animationData: {
    // ── STAGE 1 — movement / state (tools/reslice_light.py). stand_defense → idle (STAND, ping-ponged) +
    // guard (DEFENSE, hold f1). run_dash → run + dash. jump → jump/fall (first 3 cells = the shared aerial
    // base reused by the Stage-4 aerials). damage → hurt + knockdown (notebook drops on the last frame). No
    // dedicated walk art → walk borrows the run strip (flagged gap). No neutral crouch pose in the set
    // (Stage-0 item 2) → no crouch key.
    idle:  { frames: 4, width: 24, height: 56, speed: 8, anchorY: 0, sheet: "./light_idle_uniform.png" },   // 3f stance baked to a 1→3→1 ping-pong
    walk:  { frames: 7, width: 30, height: 56, speed: 6, anchorY: 0, sheet: "./light_run_uniform.png" },     // NO walk art → borrows run strip (flagged gap, not invented)
    run:   { frames: 7, width: 30, height: 56, speed: 4, anchorY: 0, sheet: "./light_run_uniform.png" },
    dash:  { frames: 8, width: 52, height: 41, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_dash_uniform.png" },   // wide dash cells (deliberate hurtbox variance per audit)
    jump:  { frames: 6, width: 38, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_jump_uniform.png" },
    fall:  { frames: 6, width: 38, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_jump_uniform.png" },
    guard:     { frames: 3, width: 27, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_guard_uniform.png" },   // raise / held-guard (f1) / recoil pop
    hurt:      { frames: 4, width: 38, height: 49, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_hurt_uniform.png" },     // progressive recoil (notebook dropped on f4)
    knockdown: { frames: 4, width: 38, height: 49, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_hurt_uniform.png" },     // reuses the damage strip (no dedicated knockdown art)
    // ── STAGE 2 — B-family normals (combat.js routes basic_attacks slot → sprite key). light + heavy SHARE the
    // one 10-frame B body strip (DEDUP — the source b.png and b_forward.png carry byte-identical bodies); the
    // gold/blue crescent FX is a separate overlay (game.drawLightNormalFx), so the body sheet is reused, not
    // duplicated. crouchLight = the B+Down low swipe, swapped in by _setCrouchVariant on Down+light. ──
    light:       { frames: 10, width: 31, height: 56, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_b_body_uniform.png" },   // B (neutral) — 10f body + gold FX overlay
    heavy:       { frames: 10, width: 31, height: 56, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_b_body_uniform.png" },   // B+Forward — SAME body (dedupe) + blue crescent FX overlay
    crouchLight: { frames: 6,  width: 29, height: 56, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_bdown_uniform.png" },     // B+Down — close-range low swipe (no FX)
    // ── STAGE 4 — special CAST poses (abilities.js executeLightSpecial sets _spriteCastMove → sprite key). The
    // summoned call-ins (Ryuk / L / gunman / vortex / violet burst) are NOT sprite keys here — they ride
    // spawnProjectile as the projectile's own sheet (Ghostface phantom-hitbox idiom). DEDUP: every ground
    // special shares lightCast (gesture + laugh); both air specials share lightAirCast (the jump base). ──
    lightCast:    { frames: 3, width: 24, height: 82, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_cast_uniform.png" },       // shared ground cast — gesture + laugh
    lightAirCast: { frames: 3, width: 38, height: 58, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_aircast_uniform.png" },    // shared air cast — jump base
    // ── STAGE 5 + 6 — ULTIMATE cast poses (the LIVE fighter plays these through the inline freeze-cinematic;
    // abilities.js executeLightUltimate sets _spriteCastMove). lightUltWrite = Death Note writing (startup →
    // 4-pose writing loop → recovery). lightScythe = notebook→Shinigami-scythe transform + swing. ──
    lightUltWrite: { frames: 10, width: 33, height: 72, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_ultwrite_uniform.png" },  // "As Planned" — writing (neutral U)
    lightScythe:   { frames: 9,  width: 78, height: 76, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_scythe_uniform.png" },     // "I Am Kira" — scythe (Down+U)
    // ── STAGE 7 — win / lose poses (game.js poses the winner/loser via _forceAction if these exist). win =
    // the deduped 10-frame B body chain (out of combat it reads as "recording another name", per the audit) →
    // REUSES light_b_body_uniform (no new art). lose = 2 body + laugh (Ryuk laughing at Light's defeat). ──
    win:  { frames: 10, width: 31, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_b_body_uniform.png" },   // victory — reuses B body ("recording another name")
    lose: { frames: 3,  width: 24, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./light_lose_uniform.png" }       // defeat — 2 body + laugh
  }
}

// ─────────────────────────────────────────────────────────────────
// YAMAMOTO GENRYŪSAI SHIGEKUNI (universe: bleach) — Captain-Commander of the Gotei 13.
// Source art = 97 numbered ROW strips (Bleach_Dark_Souls_..._row_NN.png), CONFIRMED JPEG-DAMAGED,
// STAGE-0 cleaned (tools/prep_yamamoto.py → yamamoto_clean/) then RE-SLICED into clean uniform,
// feet-aligned cells (tools/reslice_yamamoto.py → the *_uniform.png copies). ★ The character composites
// from up to 3 SEPARATE layers (BODY + PROP cane + FIRE) that share the source coordinate grid, so the
// reslicer flattens the paired rows at NATIVE coords BEFORE repacking — the cane/fire land correctly with
// no per-frame offset math (Stage-1 proof: idle 05+06, walk 08+09, dash 10+11+12).
// ─────────────────────────────────────────────────────────────────
const yamamoto = {
  rosterKey: "yamamoto", name: "Yamamoto", universe: "bleach",
  portrait: "./yamamoto_portrait.png",   // bust cropped from idle frame 0 (palette-header portrait wired in Stage 7)
  archetypes: ["powerhouse", "technician", "zoner"],
  primary: "melee", secondary: ["zoner"],
  // energyType "reiatsu" = Bleach spiritual pressure (HUD label via ENERGY_TYPE_LABELS) — the shared pool
  // that fuels his large Ryūjin Jakka special kit + the Ultimate.
  traits: { hasEnergy: true, energyType: "reiatsu", mobility: "low", scaling: "versatile", animeMovement: true },
  passive: { name: "Ryūjin Jakka", effect: "Wielder of the oldest and most powerful fire-type Zanpakutō — the Captain-Commander's flames reduce all to ash" },
  // ANCIENT, nearly-unkillable technique-master: his identity is DURABILITY (top-tier HP + Def), and the
  // honest counterweight is SPEED — the 2nd-slowest real fighter (74, just above Jason's 72 floor), the
  // "unhurried old man" read confirmed by his walk cycle. Slow dash + low jump reinforce it. maxEnergy 200
  // = the shared Reiatsu pool so his big kit competes for one meter (cannot be spammed at once).
  stats: { maxHealth: 1300, maxEnergy: 200, attack: 94, defense: 92, speed: 74, maxJumps: 2, jumpPower: 27, dashSpeed: 12, dashDuration: 11, dashCooldownMax: 48 },
  // STAGE 3 normals (combat.js _getMD reads THIS basic_attacks). Committed, slow-startup swordwork befitting
  // the ancient Captain-Commander: light = a quick sword poke; heavy = the committed low crouch attack (big,
  // long recovery); up = the rising anti-air slash launcher; air = the diagonal overhead slash; down_air =
  // the crouching low sweep/spike. All RAW (engine scales ×0.60) and inside existing roster bands.
  basic_attacks: {
    light:    { damage: 44, startup: 5, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 88, startup: 10, active: 4, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 92, rangeY: 52 },   // committed low crouch swing — long reach, slow
    upAttack: { type: "launcher", damage: 70, startup: 8, active: 4, recovery: 18, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },   // rising anti-air slash launcher
    downAir:  { damage: 78, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },   // crouching low sweep / dive spike
    airAttack:{ damage: 56, startup: 7, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: -2 }    // diagonal overhead air slash
  },
  // ULTIMATE (real logic + cost live in abilities.executeYamamotoUltimate). Ryūjin Jakka's ultimate slam —
  // an inline freeze-cinematic on the live fighter (bigger Overhead Slam), guaranteed ~204 EFF.
  ultimate: { name: "Ryūjin Jakka: End-All Slam", cost: 100, description: "The Captain-Commander channels the full blaze of Ryūjin Jakka into one overhead strike — a screen-scorching slam that reduces the foe to ash." },
  hasSprites: true,
  // Tall, imposing Captain-Commander. idle content ≈65px; scale 1.85 → ~120px on-screen (reads a touch
  // above the roster median, as intended for his stature). anchorY:0 everywhere → feet planted.
  // REQUIRES the skins.js `yamamoto` default entry (else applySkin() → spriteScale:1 native shrink) + the
  // spritesheets.js idle gate (else procedural box).
  spriteScale: 1.85,
  animationData: {
    // ── STAGE 1 — movement / state (BODY+PROP composites; cane rides in-hand) ──
    idle: { frames: 6, width: 62, height: 67, speed: 7, anchorY: 0, sheet: "./yamamoto_idle_uniform.png" },
    // No dedicated ground-run strip — reuse the walk cycle at a faster cadence for run (Onoki/Superman precedent).
    walk: { frames: 8, width: 45, height: 66, speed: 6, anchorY: 0, sheet: "./yamamoto_walk_uniform.png" },
    run:  { frames: 8, width: 45, height: 66, speed: 4, anchorY: 0, sheet: "./yamamoto_walk_uniform.png" },
    dash: { frames: 4, width: 66, height: 44, speed: 3, anchorY: 0, sheet: "./yamamoto_dash_uniform.png" },
    // turnaround (back-facing, row 07) — BANKED art. The engine has no dedicated turn state (facing is a
    // sprite-flip), so this is not auto-driven; it renders via forceAction("turn") and is available for
    // future use (e.g. a scripted intro/cinematic beat).
    turn: { frames: 4, width: 60, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_turn_uniform.png" },

    // ── STAGE 2 — guard / hit reactions / knockdown / intro ──
    // guard = the braced defensive STANCE (rows 33+34 body+cane composite). ★ PARTITION CORRECTION: the
    // audit's lowest-confidence read tagged row 19 as block, but row 19 is a dynamic hit-recoil arc; rows
    // 33-34 are the true clean stance. (row 19 + row 21 heavy-recoil left banked; engine drives one hurt.)
    guard: { frames: 6, width: 61, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_guard_uniform.png" },
    // hurt = LIGHT hit flinch (row 22; shallower/lower-coverage than the row-21 heavy recoil, per the audit).
    hurt: { frames: 4, width: 78, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_hurt_uniform.png" },
    // hurt_air = airborne tumble (row 23; engine picks this over `hurt` when airborne + in hitstun).
    hurt_air: { frames: 6, width: 81, height: 68, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_hurt_air_uniform.png" },
    // knockdown/getup = row 24 split. The engine's get-up chain plays knockdown (DOWN) while sprawled, then
    // getup (RISE) while recovering, then idle.
    knockdown: { frames: 2, width: 85, height: 38, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_knockdown_uniform.png" },
    getup:     { frames: 3, width: 72, height: 67, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_getup_uniform.png" },
    // intro = 13-frame entrance (rows 25+26 body+cane composite): back-to-camera → haori-wing flare → turn →
    // blade drawn → settle; hands off to idle. Armed by introPool below.
    intro: { frames: 13, width: 59, height: 67, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_intro_uniform.png" },

    // ── STAGE 3 — 5 normals + command-normal chain (BODY, +FIRE-crescent composite on up/air/chain) ──
    light:    { frames: 4,  width: 65, height: 63, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_light_uniform.png" },
    heavy:    { frames: 8,  width: 60, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_heavy_uniform.png" },
    up:       { frames: 10, width: 82, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_up_uniform.png" },     // rising slash + fire (59+61)
    air:      { frames: 11, width: 78, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_air_uniform.png" },    // diagonal slash + fire (45+47)
    down_air: { frames: 7,  width: 60, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_downair_uniform.png" },
    // COMMAND NORMAL (Fwd+Heavy) — yamamotoCombo: an 11-frame MULTI-HIT slash string + fire crescents
    // (rows 36+38). Free (cooldown-gated). currentMove = "yamamotoCombo" → sprite.js identity-maps here.
    yamamotoCombo: { frames: 11, width: 63, height: 76, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_chain_uniform.png" },

    // ── STAGE 4 — 5 specials (cast/strike poses; _spriteCastMove for the beam, currentMove for melee) ──
    yamamotoBeam:     { frames: 10, width: 84, height: 93, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_beam_cast_uniform.png" },  // Ground-Sweep Beam cast (projectile spawned separately)
    yamamotoEruption: { frames: 11, width: 80, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_eruption_uniform.png" },   // Ground Eruption Stab (upward flame AOE)
    yamamotoThrust:   { frames: 10, width: 82, height: 58, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_thrust_uniform.png" },      // Horizontal Thrust (long active window)
    yamamotoStab:     { frames: 9,  width: 92, height: 89, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_stab_uniform.png" },        // Large Ground-Stab — FLAGSHIP (90px flame crescent)
    yamamotoOverhead: { frames: 11, width: 72, height: 93, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_overhead_uniform.png" },     // Overhead Slam (double-wing haori flare)

    // ── STAGE 5 — Shunpo (Flash Step) vanish / reappear poses (_spriteCastMove; shared teleport-behind) ──
    yamamotoShunpoOut: { frames: 6, width: 74, height: 65, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_shunpo_out_uniform.png" },   // vanish (scanline dissolve + contracting ring)
    yamamotoShunpoIn:  { frames: 5, width: 75, height: 65, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_shunpo_in_uniform.png" },       // reappear (scattered→solid arrival + expanding ring)

    // ── STAGE 6 — ULTIMATE: Overhead Slam (heavy variant) — the LIVE fighter plays the denser row 87+89
    // art through the freeze/camera cinematic (currentMove/_spriteCastMove = "yamamotoUltimate"). ──
    yamamotoUltimate: { frames: 11, width: 71, height: 94, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yamamoto_ult_uniform.png" }
  },
  // Shunpo (Flash Step) = the shared teleport-behind movement mechanic (double-tap TOWARD the foe → blink
  // BEHIND them). Yamamoto's version is a two-beat vanish→reappear with dedicated art + i-frames + a small
  // Reiatsu cost (abilities.fireYamamotoShunpo), so his burst mobility still competes with his kit for the
  // meter — preserving the slow-speed (74) counterweight rather than a free escape.
  movement: { dashTeleport: true },
  introPool: ["intro"]
}

// ═════════════════════════════════════════════════════════════════════════════════════════
// SIX PATHS OF PAIN  (rosterKey "six_paths_pain", universe "naruto") — a BRAND-NEW, FULLY
// SEPARATE character from the solo `pain` build. Shares ZERO files/code/state with it: its art
// comes ONLY from the sixpaths_* sheets (tools/reslice_six_paths_pain.py, sourced from
// six_paths_of_pain_sliced/), its runtime lives in a `_sp*`/`_path` namespace, and its logic is
// its own executeSixPaths* functions. The two can be loaded/played simultaneously (even vs each
// other) with no coupling — same discipline as Obito↔Tobi.
//
// MULTI-IDENTITY SWAP (Ghostface-derived architecture): Nagato's real body cycles the SIX PATHS
// mid-match (free swap, energy cost + cooldown — see SIXPATHS_* in abilities.js). Each Path is its
// own full kit (5 normals + movement/state + that Path's confirmed specials); swapping art-swaps
// the whole animationData via fighter._skinAnim (the Vegeta form-swap primitive). This char def
// carries the DEVA/TENDO Path as the BASE set (Path 0); Stages 2-5 add the other five Paths' anim
// sets in abilities.js (SIXPATHS_*_ANIM) and swap them in. Stage-1 = Deva only; the other five
// slots are live in the swap selector but render Deva art as a scaffold until their stage lands.
//
// BALANCE (multi-Path flexibility): the balance question is BREADTH, not per-Path power — six kits
// on one body is more tools than any single-kit char, even though no single Path is overtuned. The
// throttle is the swap COST + COOLDOWN (you can't fluidly have all six at once), plus modest,
// no-outlier base stats (frail-leaning) and honest ×0.60 scaling. Schema-exception versatility char
// (Madara/Onoki/Mayuri/Saitama class); no roster stat record. Full assessment lands in Stage 6.
// See BALANCE_AUDIT.md and [[six-paths-pain-build]].
// ═════════════════════════════════════════════════════════════════════════════════════════
const sixPathsPain = {
  rosterKey: "six_paths_pain", name: "Six Paths of Pain", universe: "naruto", color: "#3a2030",
  portrait: "./sixpaths_deva_portrait.png",   // Stage 1 placeholder (Deva bust); per-Path portraits land Stage 6. Falls back to procedural if absent.
  archetypes: ["technical", "zoner"],
  primary: "technical", secondary: ["zoner"],
  traits: { hasEnergy: true, energyType: "chakra", mobility: "medium", scaling: "technical", animeMovement: false },
  // VERSATILE TECHNIQUE BODY. vs roster: Madara HP1200/atk96, Onoki HP1120/atk? (versatility peers),
  // Ghostface HP1040 (fragile swap-char). Six Paths sits mid/frail-leaning: HP1120 (mid), atk88
  // (moderate — no single Path bursts), def84 (low-mid — a channeled body, not armored), spd86
  // (moderate). No stat is an outlier; the six-kit BREADTH is the power, throttled by the swap
  // cost+cooldown. maxEnergy 100 = the shared chakra meter (specials + swaps + Ultimate all draw it).
  stats: { maxHealth: 1120, maxEnergy: 100, attack: 88, defense: 84, speed: 86, maxJumps: 2, jumpPower: 30, dashSpeed: 18, dashDuration: 9, dashCooldownMax: 30 },
  // data keys map to sprite keys: upAttack→up, airAttack→air, downAir→down_air. combat.js _getMD reads THIS.
  basic_attacks: {
    light:    { damage: 34, startup: 4, active: 2, recovery: 9,  hitstun: 12, knockbackX: 2, knockbackY: 0 },                                   // quick jab (combo art)
    heavy:    { damage: 62, startup: 8, active: 3, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1, rangeX: 108, rangeY: 46 },           // black-rod thrust string (long reach)
    upAttack: { type: "launcher", damage: 52, startup: 6, active: 3, recovery: 12, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: -6, airOK: false },   // rising rod lunge (runatk art repurposed)
    airAttack:{ damage: 46, startup: 5, active: 2, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: -2 },                                   // aerial rod swing
    downAir:  { damage: 56, startup: 7, active: 3, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 10, rangeX: 90, rangeY: 70 }            // low rod-sweep dive
  },
  // HUD-only mirror; real logic + cost in abilities.js (executeSixPathsSpecial, Deva branch).
  specials: {
    almightyPush:    { cost: 28, damage: 0,   effect: "Shinra Tensei — global repulsion shove (force-only, blows the foe downrange from any range)" },
    almightyPull:    { cost: 30, damage: 0,   effect: "Bansho Ten'in — reels the foe in toward Pain (global gravity pull, no damage)" },
    rinneganDefense: { cost: 24, damage: 0,   effect: "Rinnegan Defense — expanding barrier dome: brief i-frames + nullifies incoming projectiles" }
  },
  ultimate: { name: "Six Paths of Pain", cost: 100, description: "Summons the Six Paths — the bodies rush the opponent in a swarm strike (guaranteed multi-hit; blocked → reduced)." },
  hasSprites: true,
  // Deva idle content ≈68px tall × 1.55 ≈ 105px on-screen (roster median). anchorY:0 → feet planted.
  spriteScale: 1.55,
  animationData: {
    // ── DEVA / TENDO PATH (Path 0 = BASE). Sliced by tools/reslice_six_paths_pain.py deva. ──
    // MOVEMENT / STATE. stance sheet = [idle 0-3][teleport FX 4-5][block 6]; jfct = [jump 0-2][fall 3][crouch 4][throw/air 5-8].
    idle:  { frames: 4, width: 36, height: 68, speed: 8, anchorY: 0, sheet: "./sixpaths_deva_stance_uniform.png" },
    walk:  { frames: 6, width: 64, height: 52, speed: 6, anchorY: 0, sheet: "./sixpaths_deva_run_uniform.png" },
    run:   { frames: 6, width: 64, height: 52, speed: 4, anchorY: 0, sheet: "./sixpaths_deva_run_uniform.png" },
    dash:  { frames: 6, width: 64, height: 52, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_run_uniform.png" },
    jump:  { frames: 3, width: 58, height: 65, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_jfct_uniform.png" },
    fall:  { frames: 1, width: 58, height: 65, speed: 6, anchorY: 0, sourceX: 174, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_jfct_uniform.png" },   // jfct frame 3 (3×58)
    crouch:{ frames: 1, width: 58, height: 65, speed: 8, anchorY: 0, sourceX: 232, loop: true, sheet: "./sixpaths_deva_jfct_uniform.png" },                        // jfct frame 4 (4×58)
    guard: { frames: 1, width: 36, height: 68, speed: 6, anchorY: 0, sourceX: 216, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_stance_uniform.png" }, // stance frame 6 (6×36)
    hurt:      { frames: 3, width: 75, height: 59, speed: 6, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_hurt_uniform.png" },
    knockdown: { frames: 3, width: 75, height: 59, speed: 6, anchorY: 0, sourceX: 225, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_hurt_uniform.png" }, // frames 3-5 (3×75)
    // NORMALS (5 slots). light/heavy split the ground combo sheet (jab 0-2 / rod-thrust 6-11) via sourceX.
    light:    { frames: 3, width: 85, height: 65, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_combo_uniform.png" },
    heavy:    { frames: 6, width: 85, height: 65, speed: 3, anchorY: 0, sourceX: 510, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_combo_uniform.png" },  // frames 6-11 (6×85)
    up:       { frames: 6, width: 60, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_runatk_uniform.png" },              // rising rod lunge (launcher — Deva's own runatk art)
    air:      { frames: 4, width: 58, height: 65, speed: 3, anchorY: 0, sourceX: 290, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_jfct_uniform.png" },   // jfct frames 5-8 (5×58)
    down_air: { frames: 9, width: 87, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_downatk_uniform.png" },             // low rod-sweep dive
    // SPECIAL / SWAP / ULT cast poses (currentMove / _spriteCastMove identity keys → these actions).
    spPush:     { frames: 2, width: 112, height: 60, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_push_uniform.png" },   // Shinra Tensei arms-spread (frames 0-1)
    spPull:     { frames: 2, width: 59,  height: 65, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_pull_uniform.png" },    // Bansho Ten'in reel gesture
    spRinnegan: { frames: 2, width: 112, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_push_uniform.png" },   // barrier raise (reuses arms-spread; rings spawn as FX)
    spUlt:      { frames: 2, width: 112, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_push_uniform.png" },    // Six Paths summon caster pose
    spTeleport: { frames: 2, width: 36,  height: 68, speed: 3, anchorY: 0, sourceX: 144, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_stance_uniform.png" }, // swap exit/emerge (stance teleport FX 4-5)
    intro:      { frames: 1, width: 139, height: 69, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./sixpaths_deva_intro_uniform.png" }
  },
  introPool: ["intro"]
}

// ─────────────────────────────────────────────────────────────────
// KURAPIKA  (rosterKey "kurapika", universe "hunter_x_hunter"). Kurta-clan Conjurer — a chain
// technician/zoner built from 49 numbered ROW strips (kurapika_row_NN.png), RE-SLICED feet-aligned +
// DESPECKLED by tools/reslice_kurapika_build.py (JUS source leaves stray dark specks the bg-key missed;
// dropped per-frame by connected-component area). Design confirmed (see the KURAPIKA design brief): 3 real
// named Nen specials (Judgment Chain / Chain Jail / Steal Chain), a status-disable special + charge feeding
// the ULTIMATE Emperor Time — a scarlet-eyed whole-moveset RECOLOR transform (Set B rows 26-49) built on the
// project SSJ skinAnim pattern, with a canon-accurate post-revert vulnerability window (memory-gap).
//
// SHEET STRUCTURE: Set A = rows 01-25 (base), Set B = rows 26-49 (frame-for-frame scarlet-eyed recolor for
// Emperor Time). CONJURER TECHNICIAN profile: agile, average durability; his edge is chain reach + options,
// not raw HP. energyType "nen" (ui.js ENERGY_TYPE_LABELS already carries "Nen"). REQUIRES the skins.js
// `kurapika` default (else applySkin → spriteScale:1 native-shrink) + the spritesheets.js idle gate (else
// procedural box). STAGE 1 = movement/state only; normals (S2), specials (S3), status/charge (S4) and Emperor
// Time (S5) append their animationData later. NO dedicated idle/jump art → idle = walk's upright bob frames,
// jump/fall reuse the leap strip (flagged honest gaps, not invented).
// ─────────────────────────────────────────────────────────────────
const kurapika = {
  rosterKey: "kurapika", name: "Kurapika", universe: "hunter_x_hunter", color: "#b91c1c",
  portrait: "./kurapika_portrait.png",   // placeholder bust from idle frame 0 (final portrait row chosen at S6)
  archetypes: ["zoner", "technician", "rushdown"],
  primary: "melee", secondary: ["zoner", "technician"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Chain Conjurer", effect: "A Kurta-clan Nen Conjurer who fights with five chains — extending Judgment/Chain Jail binds and a Steal counter — and can awaken Emperor Time (scarlet eyes) to sharpen his entire arsenal at a steep cost." },
  // Conjurer technician: agile (speed 92), average durability (HP 1080 / def 84) — his power is chain REACH +
  // options, not HP. maxEnergy 200 = the shared Nen pool that fuels the chains, the charge, and gates Emperor
  // Time. Baked-in average-durability is the balance-correct downside for a versatility/zoner kit.
  stats: { maxHealth: 1080, maxEnergy: 200, attack: 88, defense: 84, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 11, dashCooldownMax: 36 },
  // STAGE 2 normals (combat.js _getMD reads this; animationData.{light,heavy,up,air,down_air} drives the
  // sprite). Proposed here so the fighter is functional from Stage 1; real art + tuning wired in Stage 2.
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 76, startup: 8, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: 1, rangeX: 88, rangeY: 40 },
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 70, startup: 7, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 5, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real Emperor Time logic + cost live in abilities.js at Stage 5).
  ultimate: { name: "Emperor Time", cost: 100, description: "Kurapika awakens his scarlet eyes — Emperor Time — gaining full-power access to all his abilities for a limited time. When it ends, the memory-gap leaves him briefly vulnerable." },
  hasSprites: true,
  // Kurapika idle content ≈48px tall. scale 2.1 → ~100px on-screen, reading at roster median. anchorY:0
  // everywhere → feet planted, no anchor rescale.
  spriteScale: 2.1,
  animationData: {
    // ── STAGE 1 — movement / state (row_01 walk/idle, row_15 dash, row_04 hurt/knockdown, row_23 leap,
    // row_08 f0 guard). NO dedicated idle → idle = walk's upright bob (frames 0-3, ping-pong). NO dedicated
    // jump/fall art → both reuse the leap strip (honest fallback, flagged). win = idle placeholder (S6). ──
    idle:  { frames: 6, width: 31, height: 51, speed: 6, anchorY: 0, sheet: "./kurapika_idle_uniform.png" },   // 4f upright bob baked 1->4->1 ping-pong
    walk:  { frames: 8, width: 42, height: 51, speed: 6, anchorY: 0, sheet: "./kurapika_walk_uniform.png" },
    run:   { frames: 4, width: 42, height: 49, speed: 4, anchorY: 0, sheet: "./kurapika_run_uniform.png" },
    dash:  { frames: 4, width: 93, height: 48, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_dash_uniform.png" },
    jump:  { frames: 4, width: 76, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_leap_uniform.png" },   // reuse leap (no dedicated jump art)
    fall:  { frames: 4, width: 76, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_leap_uniform.png" },   // reuse leap
    guard:     { frames: 1, width: 28, height: 49, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_guard_uniform.png" },
    hurt:      { frames: 3, width: 58, height: 46, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_hurt_uniform.png" },        // recoil / stagger (row_04 f0-2)
    knockdown: { frames: 10, width: 60, height: 50, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_knockdown_uniform.png" },  // recoil→fall→prone→getup (folded)
    win:       { frames: 6, width: 31, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_idle_uniform.png" },          // placeholder = idle (final win pose chosen at S6)
    // ── STAGE 2 — normals (combat.js routes basic_attacks slot → these sprite keys) + windmill command-normal.
    // light = strike→overhead-slash auto-combo (row_02 f0-7; the body-less flame-finish f8-9 is dropped — the
    // flame is a deferred authored FX, not sprite content). heavy = windup→overhead→downslash→extended chain-
    // thrust (row_03 f1-7, real reach). up = white-aura rising yellow-X cross-slash launcher (row_05 f2-6).
    // air = leap-slash (row_23 f1-2); down_air REUSES it (only airborne art — flagged honest gap, no down_air
    // content exists). kurapikaWindmill = Fwd+Heavy multi-hit spin (row_08 f1-8; identity-mapped from currentMove).
    light:    { frames: 8, width: 72, height: 59, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_light_uniform.png" },
    heavy:    { frames: 7, width: 69, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_heavy_uniform.png" },
    up:       { frames: 5, width: 42, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_up_uniform.png" },
    air:      { frames: 2, width: 76, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_air_uniform.png" },
    down_air: { frames: 2, width: 76, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_air_uniform.png" },   // reuse leap-slash (no dedicated down_air art)
    kurapikaWindmill: { frames: 8, width: 31, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_windmill_uniform.png" },   // Fwd+Heavy multi-hit spin
    // ── STAGE 3 — Nen special CAST poses (_spriteCastMove/currentAttack.name identity keys). Judgment = the
    // long red-aura chain-throw (row_20, holds the extended chain through the multi-hit); ChainJail = spin→
    // summon (row_17); Steal = low counter-stance→catch-orb→counter-slash (row_06). The Chain Jail bind FX on
    // the TARGET is a separate visual-only projectile (kurapika_jailfx_uniform.png, spawned in abilities.js).
    kurapikaJudgment: { frames: 5, width: 139, height: 90,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_judgment_uniform.png" },
    kurapikaChainJail:{ frames: 6, width: 104, height: 116, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_chainjail_uniform.png" },
    kurapikaSteal:    { frames: 10, width: 71, height: 66,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_steal_uniform.png" },
    // ── STAGE 4 — status-effect special (Shock Strike, Fwd+Special) + Nen charge LOOP. charge = the white-aura
    // Nen-gather (row_12 f2-4), played on hold-P (universal energy charge) — it literally builds toward the
    // Emperor Time ultimate (100 Nen); the SAME gather is reused as the ET trigger in S5. Shock = row_07 lunge.
    charge:        { frames: 3, width: 42, height: 55, speed: 5, anchorY: 0, loop: true, sheet: "./kurapika_charge_uniform.png" },
    kurapikaShock: { frames: 8, width: 47, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_shock_uniform.png" }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SPIDER-MAN (Marvel Super Heroes, Capcom CPS2 arcade). FIRST Marvel-universe character. Source is a
// GENUINE fighting-game arcade rip (Alvin-Earthworm) — higher native quality/completeness than the
// fan-art sheets, so most actions slice cleanly from numbered ROW strips (spiderman_row_NN.png) via
// tools/reslice_spiderman.py → the *_uniform.png copies (row originals kept untouched per mandate).
//
// ARCHETYPE: an acrobatic, EVASIVE, technical web-technician — high mobility + real utility depth
// (web tools), MODERATE raw power, frail-ish durability. Not a bruiser; his edge is speed, mobility
// and reach, not HP. energyType "web_fluid" = his web-shooter reserve (HUD label in ui.js) that will
// throttle the Stage-3 web specials + the Stage-4 cinematic Ultimate.
//
// CONFIRMED CONTENT GAP: the source has NO hit-reaction / knockdown frames. Per the same precedent as
// every other documented gap, Spider-Man ships NO hurt/knockdown/getup strips — the engine's safe
// missing-action fallback renders his own idle pose (sprite.js:729) with the procedural hit flash/shake,
// exactly the intended "generic procedural fallback". Do NOT invent hit-reaction art.
//
// STAGE 1 = registration + movement/state ONLY (idle / crouch-to-stand intro / walk+run / jump arc /
// dash / both ground rolls / win+taunt). Normals+command-chain+Ground-Crawl = S2, specials = S3,
// cinematic Web-Throw Ultimate = S4. REQUIRES the skins.js `spiderman` default entry (else applySkin()
// → spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate (else procedural box).
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const spiderman = {
  rosterKey: "spiderman", name: "Spider-Man", universe: "marvel", color: "#e62429",
  portrait: "./spiderman_portrait.png",   // hands-on-hips heroic bust cropped from the row_24 victory pose (no dedicated mugshot art)
  archetypes: ["rushdown", "acrobat", "zoner"],
  primary: "melee", secondary: ["rushdown", "mobility"],
  // web_fluid = his web-shooter reserve (ui.js ENERGY_TYPE_LABELS). Shared pool that will fuel the
  // Stage-3 web specials (Web Impact / Web Throw) + the Stage-4 Ultimate. mobility "high" = agile tier.
  traits: { hasEnergy: true, energyType: "web_fluid", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Spider-Sense", effect: "The wall-crawler — preternatural agility and reach, trading raw power for mobility, evasion and web utility" },
  // Frail-ish glass acrobat: below-median HP/def, edge is speed (96) + mobility + reach, NOT durability.
  // maxEnergy 180 = the web-fluid pool that throttles his web kit. Honest FAST profile (compare BALANCE_AUDIT).
  stats: { maxHealth: 1080, maxEnergy: 180, attack: 88, defense: 80, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 12, dashCooldownMax: 40 },
  // STAGE 2 will refine these + wire the normal SHEETS. Included now so combat._getMD has valid frame
  // data from Stage 1 (until the S2 sheets land, an attack renders the safe idle fallback pose).
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 72, startup: 8, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 62, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 66, startup: 8, active: 4, recovery: 13, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 6, active: 3, recovery: 11, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost land in S4). Stage 0 confirmed a real path:
  // escalate the Web Throw (rows 17-19) into a cinematic giant web-trap reusing his own web assets.
  ultimate: { name: "Maximum Web", cost: 100, description: "Spider-Man unloads every web-shooter he has — a full-screen barrage of webbing that engulfs and pins the opponent in a giant web trap." },
  hasSprites: true,
  // idle content ≈98px; scale 1.1 → ~108px on-screen (mid roster band). anchorY:0 everywhere → feet
  // planted, no anchor rescale. He crouches in his idle/prowl (canon low spider-stance) and stands
  // ~131px tall in the victory pose — a nimble, mid-height silhouette.
  spriteScale: 1.1,
  // Crouch-to-stand entrance (row_02) plays once at match start via the shared introPool system, then
  // hands off to idle (sprite.js honors _introVariant; game.js initIntroVariant reads introPool).
  introPool: ["intro"],
  animationData: {
    // ── MOVEMENT / STATE (Stage 1) ──
    idle: { frames: 10, width: 115, height: 100, speed: 6, anchorY: 0, sheet: "./spiderman_idle_uniform.png" },   // row_01 crouched-stance breathing loop
    // crouch-to-stand entrance — plays ONCE (introPool), hands off to idle.
    intro: { frames: 12, width: 77, height: 94, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_intro_uniform.png" },   // row_02
    // No dedicated ground-run strip — reuse the walk cycle at a faster cadence for run (Onoki/Superman precedent).
    walk: { frames: 8, width: 114, height: 76, speed: 5, anchorY: 0, sheet: "./spiderman_walk_uniform.png" },   // row_07 bracketed loop
    run:  { frames: 8, width: 114, height: 76, speed: 3, anchorY: 0, sheet: "./spiderman_walk_uniform.png" },
    dash: { frames: 1, width: 161, height: 115, speed: 4, anchorY: 0, sheet: "./spiderman_dash_uniform.png" },   // row_20 motion-blur lean (character-only; spin-punch = S3 special)
    // jump = the TOP-band airborne rise (row_03); fall = the BOTTOM-band air-tumble→righting dive (row_03).
    jump: { frames: 10, width: 110, height: 131, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_jump_uniform.png" },
    fall: { frames: 11, width: 140, height: 132, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_fall_uniform.png" },
    // WIN/TAUNT — row_24 glow-FX victory pose. `win` auto-plays on the victory screen (game.js _forceAction);
    // `taunt` reuses it for the in-match taunt (row_26/27 secondary taunt variants BANKED for later).
    win:   { frames: 11, width: 92, height: 133, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_win_uniform.png" },
    taunt: { frames: 11, width: 92, height: 133, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_win_uniform.png" },
    // GROUND ROLLS — reserved movement art (display-only in S1; a dodge-roll system is a future concern).
    // Forward roll = row_08's roll portion; backward roll = row_22. Rendered via _forceAction.
    rollForward: { frames: 7, width: 143, height: 88, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_rollf_uniform.png" },
    rollBack:    { frames: 6, width: 151, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_rollb_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, RE-SLICED feet-aligned). basic_attacks (above) carries the hit/frame data;
    // these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. light = row_04
    // punch-combo string, heavy = row_04 rising SPIN-KICK launcher, up = row_05 rising reach→spin launcher
    // (distinct from heavy), air = row_05 curled aerial spin-kick, down_air = row_12 diving spin spike. ──
    light:    { frames: 5, width: 128, height: 79,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_light_uniform.png" },
    heavy:    { frames: 6, width: 163, height: 139, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_heavy_uniform.png" },
    up:       { frames: 5, width: 125, height: 113, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_up_uniform.png" },
    air:      { frames: 5, width: 125, height: 113, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_air_uniform.png" },
    down_air: { frames: 5, width: 135, height: 98,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_downair_uniform.png" },
    // ── STAGE 2 COMMAND NORMAL (Fwd+Heavy) — spiderCombo: row_11 "Jump Attack Combo", a continuous multi-hit
    // running-leap→spinning-strike string (single committed command normal; currentMove="spiderCombo" →
    // sprite.js identity map). Stage 3 adds the Web-Throw combo-cancel bridge OUT of this string. ──
    spiderCombo: { frames: 9, width: 119, height: 136, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_cmdchain_uniform.png" },
    // ── STAGE 2 GROUND CRAWL (Down+Special evasive) — spiderCrawl: row_09 low all-fours crawl LOOP (sustained
    // low-profile i-frame reposition; _spriteCastMove identity key). spiderKickup: row_10 handstand kick-up =
    // the crawl's EXIT PAYOFF attack (currentMove identity key). ──
    spiderCrawl:  { frames: 7, width: 130, height: 57, speed: 4, anchorY: 0, loop: true, sheet: "./spiderman_crawl_uniform.png" },
    spiderKickup: { frames: 5, width: 143, height: 96, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_kickup_uniform.png" },
    // WEB-SWING (air mobility): extended reaching pose (row_25), rendered while pendulum-swinging from a
    // web anchored to the sky. The web LINE is drawn procedurally (game.js drawSpidermanWebSwing).
    spiderSwing:  { frames: 1, width: 105, height: 76, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_swing_uniform.png" },
    // ── STAGE 3 SPECIAL POSES (_spriteCastMove/currentMove identity keys → sprite.js). Web Impact (neutral)
    // = quick short web puff / Web Throw (Fwd) = signature full-range web-ball / Web Bridge = the row_15
    // fanning web-net CANCEL pose from spiderCombo into Web Throw / Dash Attack (Back) = row_20 spin-punch
    // gap-closer / Handstand Flip Kick (Up) = row_23 anti-air launcher. Web PROJECTILE FX (webpuff/webball)
    // are spawnProjectile sheets in abilities.js, NOT animationData. ──
    spiderWebImpact:  { frames: 6,  width: 119, height: 77,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_webimpact_uniform.png" },
    spiderWebThrow:   { frames: 1,  width: 208, height: 84,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_webthrow_uniform.png" },
    spiderWebBridge:  { frames: 5,  width: 104, height: 104, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_webbridge_uniform.png" },
    spiderDashAttack: { frames: 6,  width: 121, height: 109, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_dashatk_uniform.png" },
    spiderHandstand:  { frames: 10, width: 122, height: 123, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./spiderman_handstand_uniform.png" }
    // NO hurt/knockdown/getup — CONFIRMED source gap; engine renders the idle-pose fallback + procedural flash.
    // Stage 4 appends: cinematic Web-Throw Ultimate.
  }
}

// ── EMPEROR TIME form art (Stage 5) — the SCARLET-EYED Set B (rows 26-49), cut frame-for-frame with the SAME
// keep ranges as the base kit (tools/reslice_kurapika_build.py) into __emperor sheets. On Emperor Time this
// WHOLE map is swapped onto fighter._skinAnim (abilities.enterKurapikaEmperor), recoloring the entire moveset
// at once — the project's declarative transformation pattern (SSJ / Boruto-Karma). Set B has its OWN cut dims
// (slightly different content bbox than Set A), so this is an EXPLICIT map, not a filename retag.
const kurapikaEmperorAnim = {
  idle:  { frames: 6, width: 30, height: 53, speed: 6, anchorY: 0, sheet: "./kurapika_idle_uniform__emperor.png" },
  walk:  { frames: 8, width: 44, height: 53, speed: 6, anchorY: 0, sheet: "./kurapika_walk_uniform__emperor.png" },
  run:   { frames: 4, width: 44, height: 49, speed: 4, anchorY: 0, sheet: "./kurapika_run_uniform__emperor.png" },
  dash:  { frames: 4, width: 93, height: 47, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_dash_uniform__emperor.png" },
  jump:  { frames: 4, width: 76, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_leap_uniform__emperor.png" },
  fall:  { frames: 4, width: 76, height: 63, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_leap_uniform__emperor.png" },
  guard: { frames: 1, width: 26, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_guard_uniform__emperor.png" },
  hurt:  { frames: 3, width: 59, height: 47, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_hurt_uniform__emperor.png" },
  knockdown: { frames: 10, width: 59, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_knockdown_uniform__emperor.png" },
  win:   { frames: 6, width: 30, height: 53, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_idle_uniform__emperor.png" },
  light:    { frames: 8, width: 72, height: 59, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_light_uniform__emperor.png" },
  heavy:    { frames: 7, width: 70, height: 68, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_heavy_uniform__emperor.png" },
  up:       { frames: 5, width: 42, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_up_uniform__emperor.png" },
  air:      { frames: 2, width: 76, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_air_uniform__emperor.png" },
  down_air: { frames: 2, width: 76, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_air_uniform__emperor.png" },
  kurapikaWindmill:  { frames: 8, width: 31, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_windmill_uniform__emperor.png" },
  kurapikaJudgment:  { frames: 5, width: 139, height: 90, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_judgment_uniform__emperor.png" },
  kurapikaChainJail: { frames: 6, width: 104, height: 119, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_chainjail_uniform__emperor.png" },
  kurapikaSteal:     { frames: 10, width: 71, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_steal_uniform__emperor.png" },
  kurapikaShock:     { frames: 8, width: 48, height: 77, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./kurapika_shock_uniform__emperor.png" },
  charge:            { frames: 3, width: 46, height: 60, speed: 5, anchorY: 0, loop: true, sheet: "./kurapika_charge_uniform__emperor.png" }
}
kurapika.emperorAnim = kurapikaEmperorAnim   // referenced by abilities.enterKurapikaEmperor (fighter._skinAnim swap)

// ─────────────────────────────────────────────────────────────────
// NAOYA ZENIN (universe: jujutsu_kaisen) — Projection-Sorcery frame-trap technician. Built from 13
// numbered ROW strips (naoya_row_NN.png) via tools/reslice_naoya.py → the *_uniform.png feet-aligned
// copies (row originals kept untouched per mandate). STAGE 1 = registration + movement/state only.
// Stage-0 pixel-audit + owner decisions (memory naoya-build): row_07 = white-wing STRIKE (Frame-Trap
// payoff w/ freeze), row_09 pitch reuses row_11 orange darts, row_12 = lose/downed pose, ULT = promoted
// Frame-Trap. Portrait art (from naoya_reference_figure) + win/intro remain OPEN gaps for S6. Unlike most
// gaps, Naoya SHIPS real hit art: row_13 → hurt (recoil) + knockdown (recoil→fall→land→prone). basic_attacks
// + ultimate carry placeholder frame-data now (real logic lands S2–S5) so combat._getMD stays valid.
// REQUIRES the skins.js `naoya` default entry (else applySkin() throws) + the spritesheets.js gate.
const naoya = {
  rosterKey: "naoya", name: "Naoya Zenin", universe: "jujutsu_kaisen", color: "#c9c24a",
  portrait: "./naoya_portrait.png",   // OPEN GAP (S6): bust to be cropped from naoya_reference_figure.png
  archetypes: ["rushdown", "technical", "zoner"],
  primary: "melee", secondary: ["rushdown", "mobility"],
  // cursed_energy = his JJK meter (ui.js ENERGY_TYPE_LABELS "Cursed Energy"). Fuels the Stage-4 specials
  // (Frame-Skip blink / Frame-Trap sequence / orange energy-dart projectile) + the promoted Frame-Trap ult.
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Projection Sorcery", effect: "Twenty-four frames a second — a blinding-fast frame-trap technician who punishes any dropped defence, trading durability for speed, reach and execution reward" },
  // Glass technician: below-median HP/def, edge is speed (96) + reach + the frame-trap execution payoff,
  // NOT durability. maxEnergy 180 = the cursed-energy pool that throttles his kit. Honest FAST profile.
  stats: { maxHealth: 1050, maxEnergy: 180, attack: 90, defense: 80, speed: 96, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 12, dashCooldownMax: 40 },
  // STAGE 2 will refine these + wire the normal SHEETS. Present now so combat._getMD has valid frame data
  // from Stage 1 (until the S2 sheets land, an attack renders the safe idle fallback pose).
  basic_attacks: {
    light:    { damage: 38, startup: 4, active: 3, recovery: 9,  hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 70, startup: 8, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack: { type: "launcher", damage: 60, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    downAir:  { damage: 62, startup: 8, active: 4, recovery: 13, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 50, startup: 6, active: 3, recovery: 11, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost land in S5). Owner decision: PROMOTE a clean
  // Frame-Trap execution as the signature/ULT for now — flagged NOT true-ult-tier (no charge/meter/oversized
  // payoff art exists). Escalates the row_08→row_10→row_07 sequence into the freeze-status finisher.
  ultimate: { name: "Projection Sorcery: Frame-Trap", cost: 100, description: "Naoya spends his full cursed-energy meter to GUARANTEE the clean Frame-Trap: a scripted high-speed strike sequence that lands automatically and ends in a full frame-freeze lock on the opponent." },
  hasSprites: true,
  // idle content ≈64px tall; scale 1.6 → ~102px on-screen (mid human-roster band). anchorY:0 everywhere →
  // feet planted, no anchor rescale. Slim, mid-height silhouette in traditional haori + hakama.
  spriteScale: 1.6,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1) ──
    idle:  { frames: 4,  width: 37, height: 66, speed: 8, anchorY: 0, sheet: "./naoya_idle_uniform.png" },   // row_01 4-frame sway loop
    walk:  { frames: 10, width: 55, height: 67, speed: 5, anchorY: 0, sheet: "./naoya_walk_uniform.png" },   // row_04 guard-up stride cycle (first 10 clean frames)
    // No dedicated ground-run strip — reuse the row_02 low-sprint at a faster cadence for run (Onoki/Spider-Man precedent).
    run:   { frames: 5,  width: 66, height: 51, speed: 3, anchorY: 0, sheet: "./naoya_dash_uniform.png" },   // row_02 low sprint
    dash:  { frames: 5,  width: 66, height: 51, speed: 4, anchorY: 0, sheet: "./naoya_dash_uniform.png" },   // row_02 (shared) — also the Frame-Skip blink art in S4
    // crouch entry — row_03 stand-to-crouch; lockLastFrame holds the crouched pose (block/duck).
    crouch: { frames: 3, width: 41, height: 74, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_crouch_uniform.png" },
    // hit / knockdown — row_13. Naoya SHIPS real hit art (no fallback gap): hurt = the recoil frame,
    // knockdown = the full recoil→fall→landing→prone chain (lockLastFrame holds prone).
    hurt:      { frames: 1, width: 50, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_hurt_uniform.png" },
    knockdown: { frames: 4, width: 72, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_knockdown_uniform.png" },
    // LOSE / defeat pose — row_12 seated-on-ground (Stage-0 item 4: this is a downed pose, NOT a kick). game.js
    // _forceAction="lose" plays it on the defeat screen. Win + intro art remain genuinely absent (OPEN GAPS).
    lose: { frames: 1, width: 57, height: 63, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_lose_uniform.png" },
    // ── STAGE 2 NORMALS. basic_attacks (above) carries the hit/frame data; these drive the SPRITE.
    // loop:false + lockLastFrame holds the strike through recovery. Naoya has 3 pieces of normal art →
    // light = row_06 lunging jab, heavy = row_10 standing high kick, air = row_05 airborne spin-kick.
    // up + down_air have no dedicated art → HONEST REUSE (documented): up reuses the high-kick as the
    // anti-air launcher, down_air reuses the aerial spin as the downward spike. Sanctioned project pattern. ──
    light:    { frames: 3, width: 60, height: 60, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_light_uniform.png" },   // row_06 jab
    heavy:    { frames: 3, width: 73, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_heavy_uniform.png" },   // row_10 standing kick
    up:       { frames: 3, width: 73, height: 62, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_heavy_uniform.png" },   // reuse row_10 kick as launcher
    air:      { frames: 4, width: 73, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_air_uniform.png" },     // row_05 aerial spin-kick
    down_air: { frames: 4, width: 73, height: 65, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_air_uniform.png" },     // reuse row_05 aerial as spike
    // ── STAGE 3 COMMAND NORMAL (Fwd+Heavy) — naoyaCombo: row_08 "low combo string" (6f crouched jab series →
    // sweeping spin kick w/ orange FX). A single committed MULTI-HIT command normal (updateNaoyaCommandCombat;
    // currentMove="naoyaCombo" → sprite.js identity map). Reused as Frame-Trap step 1 in S4 (separate move key). ──
    naoyaCombo: { frames: 6, width: 66, height: 70, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_combo_uniform.png" },
    // ── STAGE 4 SPECIAL CAST POSES (_spriteCastMove identity keys → sprite.js). Energy Dart (row_11 orange
    // launch) + Pitch Throw (row_09 windup) + Frame-Skip blink (reuse row_02 dash) + Frame-Trap telegraph
    // (reuse row_03 crouch) + the 3 scripted Frame-Trap steps: step1 (reuse row_08 combo), step2 (reuse row_10
    // kick), finish (row_07 white-wing STRIKE). The dart PROJECTILE itself is procedural (spawnProjectile color,
    // no sheet). Reused sheets carry INDEPENDENT frame-data from their normal-move context (Stage-0 item 7). ──
    naoyaEnergyDart: { frames: 2, width: 140, height: 67, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_energy_uniform.png" },
    naoyaPitch:      { frames: 2, width: 75,  height: 52, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_pitch_uniform.png" },
    naoyaFrameSkip:  { frames: 5, width: 66,  height: 51, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_dash_uniform.png" },
    naoyaFrameTrap:  { frames: 3, width: 41,  height: 74, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_crouch_uniform.png" },
    naoyaFtStep1:    { frames: 6, width: 66,  height: 70, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_combo_uniform.png" },
    naoyaFtStep2:    { frames: 3, width: 73,  height: 62, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_heavy_uniform.png" },
    naoyaFtFinish:   { frames: 2, width: 51,  height: 71, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./naoya_ftfinish_uniform.png" }
    // S5 promotes a clean Frame-Trap to the signature/ULT, S6 portrait + win/lose (row_12) + balance. No win/intro art — OPEN GAPS.
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DEATHSTROKE (DC — Slade Wilson, "the Terminator"). Schema-exception multi-weapon kit: an enhanced
// mercenary who fights with martial arts, a katana AND a sidearm pistol. Owner-locked design
// (2026-08-17, DEATHSTROKE_ASSET_MAP.md): ONE self-contained moveset (NOT a Toji stance toggle) —
// each sword slash draws/cuts/sheathes on its own; the pistol is one ranged special; the promoted
// row_09 overhead-spin-finish is the ULT (no unique ult art — FLAGGED). Source = 11 ROW strips
// (deathstroke_row_NN.png) RE-SLICED into clean uniform, feet-aligned cells (tools/reslice_deathstroke.py;
// the row originals kept untouched). Stage 1 = registration + movement/state only; normals /
// command chain / specials / promoted ult = later stages. REQUIRES the skins.js `deathstroke` default
// entry (else applySkin() → spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const deathstroke = {
  rosterKey: "deathstroke", name: "Deathstroke", universe: "dc",
  portrait: "./deathstroke_portrait.png",   // the iconic two-tone MASK icon carved from row_01 (a real select asset, not a body bust)
  archetypes: ["rushdown", "zoner", "tactics"],
  primary: "melee", secondary: ["zoner", "tactics"],
  // energyType "adrenaline" = his enhanced-soldier combat reserve (accelerated reflexes / regeneration);
  // will throttle the multi-weapon special kit + the promoted ultimate in later stages.
  traits: { hasEnergy: true, energyType: "adrenaline", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "The Terminator", effect: "A super-soldier mercenary — master swordsman, marksman and tactician with accelerated reflexes and regeneration" },
  // A well-rounded, agile enhanced human: sturdier than the frail technicians (Onoki/Mayuri), below the
  // bruisers. His edge is versatility (three weapon modes) + mobility, not raw HP. maxEnergy 120 = the
  // shared Adrenaline pool (multi-weapon specials + ult). Multi-weapon breadth = flagged in Stage 6 balance.
  stats: { maxHealth: 1150, maxEnergy: 120, attack: 92, defense: 86, speed: 92, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip (row_01 low frames)
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below).
  // light = row_02 jab, heavy = row_02 lunge-punch, upAttack = row_04-bottom roundhouse high-kick launcher,
  // airAttack = row_03 overhead jump-slash, downAir = reused air sword. Deliberately balanced peak-human
  // tier (master combatant). All run createAttackFromMove → scaled ×0.60.
  basic_attacks: {
    light:    { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 82, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 90, rangeY: 44 },   // lunge-punch — long reach
    upAttack: { type: "launcher", damage: 64, startup: 7, active: 4, recovery: 17, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false, rangeX: 92, rangeY: 62 },   // roundhouse high-kick — tall/wide hitbox
    downAir:  { damage: 72, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 54, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). PROMOTED row_09 overhead
  // spin-finish (no unique ult art — FLAGGED per owner decision). Signature guaranteed-payoff finisher.
  ultimate: { name: "Killing Stroke", cost: 100, description: "Deathstroke commits to a full overhead spinning katana finish — a guaranteed, scaled signature strike that ends the exchange." },
  hasSprites: true,
  // Deathstroke is tall/imposing (~6'4\"). idle content ≈91px (incl. the katana hilt above the head);
  // scale 1.3 → ~118px on-screen, reading above the roster median as intended for a big merc.
  // anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.3,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, RE-SLICED feet-aligned) ──
    idle:  { frames: 3, width: 60, height: 93, speed: 7, anchorY: 0, sheet: "./deathstroke_idle_uniform.png" },   // row_01: 3-frame weight-shift, sword sheathed
    walk:  { frames: 6, width: 53, height: 96, speed: 6, anchorY: 0, sheet: "./deathstroke_walk_uniform.png" },   // row_01: 6-frame stride
    // No dedicated ground-run strip? Deathstroke HAS one — row_10 sprint. dash reuses run (Boruto/Superman precedent).
    run:   { frames: 6, width: 63, height: 77, speed: 4, anchorY: 0, sheet: "./deathstroke_run_uniform.png" },    // row_10 sprint
    dash:  { frames: 6, width: 63, height: 77, speed: 3, anchorY: 0, sheet: "./deathstroke_run_uniform.png" },    // REUSE run (no dedicated dash art) — FLAG
    crouch:{ frames: 2, width: 56, height: 93, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_crouch_uniform.png" },  // row_01 low frames
    // jump = rising launch (row_03, play once + hold). fall REUSES the jump sheet (no dedicated descent art) — FLAG.
    jump:  { frames: 4, width: 75, height: 87, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_jump_uniform.png" },
    fall:  { frames: 4, width: 75, height: 87, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_jump_uniform.png" },
    // guard = REUSE idle (no dedicated block art) — FLAG. Held to a braced idle pose.
    guard: { frames: 1, width: 60, height: 93, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_idle_uniform.png" },
    // hurt = standing stagger/recoil (row_05). KNOCKDOWN chain: getup strip present → sprite.js plays the
    // knockdown tumble while down, then the getup rise (real death/KO art, row_06).
    hurt:      { frames: 3, width: 80,  height: 70, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_hurt_uniform.png" },
    knockdown: { frames: 3, width: 158, height: 59, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_knockdown_uniform.png" },
    getup:     { frames: 4, width: 57,  height: 71, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_getup_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, RE-SLICED feet-aligned). basic_attacks (above) carries the hit/frame
    // data; these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. From the
    // 3 melee art pieces the audit named: light/heavy = row_02 punch combo (front jab / back lunge),
    // up (launcher) = row_04-bottom roundhouse high-kick, air = row_03 overhead jump-slash. ──
    light:    { frames: 4, width: 75,  height: 92, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_light_uniform.png" },   // quick straight jab
    heavy:    { frames: 3, width: 89,  height: 94, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_heavy_uniform.png" },   // committed lunge-punch
    up:       { frames: 5, width: 137, height: 95, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_up_uniform.png" },      // roundhouse high-kick launcher
    air:      { frames: 2, width: 107, height: 108, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_air_uniform.png" },     // overhead aerial sword-slash
    down_air: { frames: 2, width: 107, height: 108, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_air_uniform.png" },     // REUSE air sheet (no dedicated down-aerial art) — FLAG
    // crouchLight — the low forward sword STAB (row_03 crouch-stab). Auto-swapped by combat.js
    // _setCrouchVariant when a light is thrown while crouching (opt-in via THIS key; movement.crouchIdle set).
    crouchLight: { frames: 5, width: 75, height: 72, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_crouchstab_uniform.png" },
    // ── STAGE 4 SPECIALS (abilities.js executeDeathstrokeSpecial; currentMove / _spriteCastMove === key →
    // sprite.js resolves the sheet directly). GROUND: neutral=Sword Slash / Fwd=Draw&Cut / Back=Gun Shot
    // (projectile) / Down=Running Slash. AIR: Aerial Spin (hitbox). row_09 spin-finish = the promoted ULT. ──
    dsSwordSlash: { frames: 5, width: 164, height: 119, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_swordslash_uniform.png" },   // row_07 upward→horizontal arc (motion-trail baked)
    dsDrawCut:    { frames: 7, width: 124, height: 95,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_drawcut_uniform.png" },      // row_08 committed lunge cut (self-drawing)
    dsRunSlash:   { frames: 2, width: 139, height: 108, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_runslash_uniform.png" },     // row_10 diving dash-slash
    dsAerialSpin: { frames: 7, width: 124, height: 104, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_aerialspin_uniform.png" },   // row_04-top spinning sword (air)
    dsGun:        { frames: 5, width: 172, height: 94,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_gun_uniform.png" },          // row_05 standing pistol aim & fire (+ procedural bullet)
    // ── STAGE 5 ULTIMATE cast pose "Killing Stroke" (_spriteCastMove="dsUlt"). PROMOTED row_09 overhead
    // spin-finish (owner decision #2 — NO unique ult art; this is a finisher pose, not an oversized frame). ──
    dsUlt:        { frames: 6, width: 126, height: 86,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_ult_uniform.png" },          // row_09 spin-finish → re-sheathe
    // WIN pose (Stage 6). No bespoke victory art exists (FLAGGED gap); repurposed the row_11 sword-DRAW-to-
    // READY stance — reads as a confident post-fight settle. game.js poses the winner via _forceAction="win".
    win:          { frames: 5, width: 73,  height: 106, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./deathstroke_win_uniform.png" },          // row_11 draw→ready (repurposed — no unique win art)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// YUTA OKKOTSU (Jujutsu Kaisen) — sword-and-cursed-energy technician built from 16 source ROW strips
// (yuta_row_NN.png) RE-SLICED into clean uniform, feet-aligned cells (tools/reslice_yuta.py; row
// originals kept). Full pixel audit + Stage-0 owner decisions: YUTA_ASSET_MAP.md. Sheet credit
// "Made by Soulfire — Petamynx, Dano, Santoryu"; Rika art "…V2 remodel thanks to shaulmorales".
// OWNER-LOCKED design (Stage 0): (1) Rika = AI ASSIST-ALLY ult (Pain/Nemu/Yachiru engine, ×0.60),
// (2) Kick 4 = promoted special, (3) Cursed Tool: Katana = plain draw-and-cut attack, (4) TRIMMED
// 5-slot directional special set. STAGE 1 = registration + movement/state only.
const yuta = {
  rosterKey: "yuta", name: "Yuta Okkotsu", universe: "jujutsu_kaisen",
  portrait: "./yuta_portrait.png",   // clean upper-body bust carved from row_01 header (a real select asset)
  archetypes: ["rushdown", "technician", "zoner"],
  primary: "melee", secondary: ["zoner", "technician"],
  // energyType "cursed_energy" (shared JJK pool, already labeled in ui.js) — will fuel the sword/
  // cursed-technique special kit + the Rika's Invocation ultimate in later stages.
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Cursed Energy Overflow", effect: "A special-grade sorcerer with a monstrous cursed-energy pool and the vengeful curse Rika — a versatile swordsman able to copy and manifest cursed techniques" },
  // A slim, agile teen special-grade sorcerer (~170cm, comparable to Naoya/Boruto). Balanced tier —
  // his edge is versatility (sword pressure + cursed-technique specials + self-heal) and mobility,
  // not raw HP. maxEnergy 200 = the deep Cursed Energy pool his kit + Rika ult draw from.
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 90, defense: 84, speed: 94, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip (row_02 low frame)
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js executeYutaUltimate). "Rika's
  // Invocation" (owner decision #8 = AI assist-ally): the invocation hands off to a PERSISTENT AI Rika assist
  // (summons.js rikaAssist) that advances and strikes for ~6s, per-hit ×0.60-scaled.
  ultimate: { name: "Rika's Invocation", cost: 100, description: "Yuta invokes his vengeful curse Rika — she manifests as a persistent ally, advancing on the foe and striking repeatedly for a time." },
  hasSprites: true,
  // Yuta idle content ≈53px; scale 1.9 → ~100px on-screen (a slim teen, between Naoya ~102 and
  // Boruto ~105). anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.9,
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below).
  // Standalone normals only — the sword combo / kick chain / aerial chain are Stage 3 command strings.
  // light = row_07 Kick 1 (fast poke), heavy = row_06 Attack 1 (committed sword swing), upAttack =
  // row_11 Up Attack anti-air launcher, airAttack = row_11 Air Kick, downAir = reused air. All run
  // createAttackFromMove → scaled ×0.60. Special-grade sorcerer tier (slightly above peak-human).
  basic_attacks: {
    light:    { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 80, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 88, rangeY: 42 },   // sword swing — long reach
    upAttack: { type: "launcher", damage: 62, startup: 7, active: 4, recovery: 17, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false, rangeX: 90, rangeY: 70 },   // anti-air sword — tall hitbox
    downAir:  { damage: 70, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 52, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, RE-SLICED feet-aligned; tools/reslice_yuta.py) ──
    idle:  { frames: 10, width: 53, height: 54, speed: 7, anchorY: 0, sheet: "./yuta_idle_uniform.png" },     // row_02 "Stand" weight-shift loop (sword held low)
    walk:  { frames: 5,  width: 103, height: 54, speed: 6, anchorY: 0, sheet: "./yuta_walk_uniform.png" },     // row_03 side-profile advance (frames 2-6): LEG-ALIGNED (no jitter) + anchored to idle's foot-offset (no idle↔walk jump) + scaled to idle height (no size pop)
    // No dedicated run/dash/jump/fall art (confirmed gap). run/dash REUSE walk; jump/fall REUSE idle — FLAG.
    run:   { frames: 5,  width: 103, height: 54, speed: 4, anchorY: 0, sheet: "./yuta_walk_uniform.png" },     // REUSE walk (no dedicated run art) — FLAG
    dash:  { frames: 5,  width: 103, height: 54, speed: 3, anchorY: 0, sheet: "./yuta_walk_uniform.png" },     // REUSE walk — FLAG
    crouch:{ frames: 1,  width: 57, height: 45, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_crouch_uniform.png" },   // row_02 "Crouch" hold
    jump:  { frames: 10, width: 53, height: 54, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_idle_uniform.png" },     // REUSE idle (no dedicated jump art) — FLAG
    fall:  { frames: 10, width: 53, height: 54, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_idle_uniform.png" },     // REUSE idle — FLAG
    guard: { frames: 4,  width: 35, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_guard_uniform.png" },    // row_05 "Guard" braced stance
    // hurt = standing recoil (row_04); KNOCKDOWN chain: knockdown tumble → getup rise (real KO art, row_04).
    hurt:      { frames: 2, width: 43, height: 57, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_hurt_uniform.png" },
    knockdown: { frames: 2, width: 74, height: 31, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_knockdown_uniform.png" },
    getup:     { frames: 2, width: 66, height: 43, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_getup_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, RE-SLICED feet-aligned). basic_attacks (above) carries the hit/frame
    // data; these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. ──
    light:    { frames: 4, width: 49,  height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_light_uniform.png" },   // row_07 Kick 1 — fast kick
    heavy:    { frames: 5, width: 57,  height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_heavy_uniform.png" },   // row_06 Attack 1 — sword swing→lunge
    up:       { frames: 6, width: 129, height: 79, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_up_uniform.png" },      // row_11 Up Attack — anti-air launcher
    air:      { frames: 4, width: 58,  height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_air_uniform.png" },     // row_11 Air Kick
    down_air: { frames: 4, width: 58,  height: 56, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_air_uniform.png" },     // REUSE air sheet (no dedicated down-aerial art) — FLAG
    // ── STAGE 3 SWORD COMBO rekka stages (Fwd+Heavy: Attack 1 → Attack 2 → Attack 3). currentMove === key
    // resolves the sheet (sprite.js identity map). combo1 REUSES the heavy=Attack 1 art. ──
    yutaCombo1: { frames: 5, width: 57, height: 55, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_heavy_uniform.png" },   // Attack 1 (reuse heavy)
    yutaCombo2: { frames: 5, width: 82, height: 54, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_combo2_uniform.png" },  // Attack 2
    yutaCombo3: { frames: 6, width: 81, height: 52, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_combo3_uniform.png" },  // Attack 3 lunging thrust
    // ── STAGE 4 SPECIAL cast/strike poses (abilities.js executeYutaSpecial; currentMove / _spriteCastMove ===
    // key → sprite.js MOVE_TO_ACTION identity map). N=CEM beam / F=Strong Attack / D=Kick 4 / U=Cursed Speech /
    // B=Reverse Cursed Technique (self-heal). Beam/shout spawn PROCEDURAL projectiles (no sprite sheet). ──
    yutaStrong: { frames: 8, width: 78,  height: 101, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_strong_uniform.png" },  // F — advancing power sword swing (green arc)
    yutaKick4:  { frames: 7, width: 118, height: 61,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_kick4_uniform.png" },   // D — dark cursed-energy wing sweep (launcher)
    yutaCem:    { frames: 7, width: 63,  height: 57,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_cem_uniform.png" },     // N — Cursed Energy Manipulation thrust (spawns beam)
    yutaSpeech: { frames: 8, width: 65,  height: 58,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_speech_uniform.png" },  // U — Cursed Speech incantation (spawns shout)
    yutaRct:    { frames: 5, width: 53,  height: 47,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_rct_uniform.png" },      // B — Reverse Cursed Technique self-heal channel
    // ── STAGE 5 ULTIMATE cast pose "Rika's Invocation" (_spriteCastMove="yutaUltCast"). row_16 draw-sword→
    // kneel/channel (Yuta only; the Rika-manifest frame is excluded). Held through the summon hand-off. ──
    yutaUltCast: { frames: 8, width: 69, height: 55, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_ultcast_uniform.png" },
    // ── STAGE 6 WIN / LOSE (game.js poses winner/loser via _forceAction). No bespoke victory/defeat art
    // exists (FLAGGED gap): win = repurposed row_16 empowered STANDING stance (sword-ready, confident);
    // lose = REUSE the knockdown lying pose (defeated on the ground). ──
    win:  { frames: 4, width: 35, height: 56, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_win_uniform.png" },       // repurposed row_16 standing stance
    lose: { frames: 2, width: 74, height: 31, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./yuta_knockdown_uniform.png" },  // REUSE knockdown (no bespoke lose art) — FLAG
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BRAINIAC (DC) — large all-special ZONER built from 13 source ROW strips (brainiac_row_NN.png)
// RE-SLICED into clean uniform, feet-aligned cells (tools/reslice_brainiac.py; row originals kept).
// Full pixel audit + Stage-0 reconciliation: BRAINIAC_ASSET_MAP.md. Stage 1 = registration +
// movement/state only. OWNER-LOCKED design: (1) normals repurpose tentacle strikes (row_09/10),
// (2) ULT = Energy Pillar barrage (row_13), (3) both candidate specials built distinct (Energy Blade
// row_03 + Tentacle Sweep row_04). REQUIRES the skins.js `brainiac` default entry (else applySkin()
// → spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const brainiac = {
  rosterKey: "brainiac", name: "Brainiac", universe: "dc",
  portrait: "./brainiac_portrait.png",   // idle-frame-0 bust (no dedicated portrait art; row_01 skull glyph is HUD-only)
  archetypes: ["zoner", "tactics"],
  primary: "zoner", secondary: ["tactics"],
  // energyType "intellect" = the Coluan's 12th-level computational reserve; throttles the large
  // beam / tentacle / shield special kit + the promoted Energy-Pillar ultimate in later stages.
  traits: { hasEnergy: true, energyType: "intellect", mobility: "low", scaling: "versatile", animeMovement: true },
  passive: { name: "12th-Level Intellect", effect: "A Coluan super-intelligence — commands metallic tentacles, energy beams and force-field shielding; a methodical keep-away android" },
  // Deliberately FRAIL, methodical zoner frame (schema-exception large kit, honest ×0.60, no stat
  // record — same treatment as Onoki/Mayuri/Saitama). His edge is breadth of ranged/space-control
  // tools, not HP or speed. maxEnergy 200 = the shared Intellect pool feeding the whole special kit.
  stats: { maxHealth: 1100, maxEnergy: 200, attack: 88, defense: 82, speed: 80, maxJumps: 2, jumpPower: 28, dashSpeed: 13, dashDuration: 12, dashCooldownMax: 48 },
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip (row_12 low frames)
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below).
  // OWNER-LOCKED: Brainiac has NO basic-strike art → the tentacle-strike frames are repurposed as normals
  // (honest reuse, flagged). row_09 = forward tentacle thrust, row_10 = multi-directional fan. His identity
  // is LONG disjointed reach (the tentacle spear extends far) traded against a frail, slow frame. All run
  // createAttackFromMove → scaled ×0.60. Damage kept modest despite the reach (see Stage-6 balance).
  basic_attacks: {
    light:    { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 98, rangeY: 40 },   // quick tentacle jab — long poke
    heavy:    { damage: 78, startup: 11, active: 4, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 124, rangeY: 52 },  // wide tentacle fan swipe — very long reach
    upAttack: { type: "launcher", damage: 62, startup: 8, active: 4, recovery: 18, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false, rangeX: 108, rangeY: 66 },   // upward tentacle spread swat — tall/wide launcher
    downAir:  { damage: 68, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11, rangeX: 100, rangeY: 48 },  // downward tentacle spike (reuses air art)
    airAttack:{ damage: 52, startup: 7, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: -2, rangeX: 108, rangeY: 46 }   // aerial tentacle lash
  },
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js). ULT = Energy Pillar
  // barrage promoting the row_13 pillar VFX (no unique ult body art — FLAGGED per owner decision).
  ultimate: { name: "Sphere of Annihilation", cost: 100, description: "Brainiac erupts a field of colossal energy pillars across the arena — a guaranteed, scaled space-denial finisher." },
  hasSprites: true,
  // Imposing alien android. idle content ≈90px; scale 1.5 → ~135px on-screen, reading above the
  // roster median. anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.5,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, RE-SLICED feet-aligned) ──
    idle:  { frames: 3, width: 42, height: 90, speed: 8, anchorY: 0, sheet: "./brainiac_idle_uniform.png" },   // row_01: 3-frame weight-shift
    walk:  { frames: 6, width: 42, height: 87, speed: 6, anchorY: 0, sheet: "./brainiac_walk_uniform.png" },   // row_01: 6-frame stride
    // No dedicated run/dash art (row content is all idle/special/reaction). run + dash REUSE walk — FLAG.
    run:   { frames: 6, width: 42, height: 87, speed: 4, anchorY: 0, sheet: "./brainiac_walk_uniform.png" },
    dash:  { frames: 6, width: 42, height: 87, speed: 3, anchorY: 0, sheet: "./brainiac_walk_uniform.png" },
    crouch:{ frames: 2, width: 52, height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_crouch_uniform.png" },  // row_12 low frames
    // No dedicated jump/fall art (Brainiac's disc-levitation is a Stage-4 special, not general movement).
    // jump + fall + guard REUSE idle held to a braced pose — FLAG (procedural fallback).
    jump:  { frames: 1, width: 42, height: 90, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_idle_uniform.png" },
    fall:  { frames: 1, width: 42, height: 90, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_idle_uniform.png" },
    guard: { frames: 1, width: 42, height: 90, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_idle_uniform.png" },
    // hurt/KNOCKDOWN chain — row_08 full KO sequence split into stagger / fall+lie / kneel+rise (real art).
    hurt:      { frames: 2, width: 47,  height: 77, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_hurt_uniform.png" },
    knockdown: { frames: 2, width: 85,  height: 51, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_knockdown_uniform.png" },
    getup:     { frames: 3, width: 119, height: 95, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_getup_uniform.png" },
    // ── STAGE 2 NORMALS (RE-SLICED feet-aligned). basic_attacks (above) carries the hit/frame data;
    // these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. Repurposed
    // tentacle art: light = row_09 thrust, heavy = row_10 fan, up = row_10 upper-fan, air = row_09 spear. ──
    light:    { frames: 3, width: 124, height: 132, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_light_uniform.png" },   // quick tentacle jab
    heavy:    { frames: 2, width: 142, height: 122, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_heavy_uniform.png" },   // wide tentacle fan swipe
    up:       { frames: 2, width: 137, height: 116, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_up_uniform.png" },      // upward tentacle spread launcher
    air:      { frames: 2, width: 135, height: 132, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_air_uniform.png" },     // aerial tentacle lash
    down_air: { frames: 2, width: 135, height: 132, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_air_uniform.png" },     // REUSE air sheet (no dedicated down-aerial art) — FLAG
    // crouchLight — the crouching tentacle strike (row_12 runs 5-6). Auto-swapped by combat.js
    // _setCrouchVariant when a light is thrown while crouching (opt-in via THIS key; movement.crouchIdle set).
    crouchLight: { frames: 2, width: 96, height: 63, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_crouchtentacle_uniform.png" },
    // ── STAGE 4 SPECIAL cast/strike POSES (RE-SLICED feet-aligned). Driven by _spriteCastMove / currentMove
    // (abilities.executeBrainiacSpecial) → sprite.js MOVE_TO_ACTION identity map. The beam PROJECTILE spawns
    // separately (brainiac_beam_proj_uniform.png). ──
    brainiacBeam:     { frames: 3, width: 98,  height: 84,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_beam_uniform.png" },      // N — charge→fire beam pose (row_02)
    brainiacBlade:    { frames: 4, width: 143, height: 88,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_blade_uniform.png" },     // F — energy-blade slash (row_03; blade = the hitbox)
    brainiacSweep:    { frames: 3, width: 142, height: 108, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_sweep_uniform.png" },     // D — long low tentacle sweep (row_04)
    brainiacShield:   { frames: 3, width: 110, height: 113, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_shield_uniform.png" },    // B — electric-shield crackle buff (row_07)
    brainiacLevitate: { frames: 3, width: 98,  height: 92,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./brainiac_levitate_uniform.png" },  // U — rise on energy disc + air beam (row_05)
    // Later stage: Energy Pillar ULT (row_13).
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// GREEN LANTERN (HAL JORDAN, DC) — large construct-based mixup/zoner built from 624 pre-sliced
// individual frames (hal_sprite_###.png) ASSEMBLED into clean uniform, feet-aligned cells
// (tools/reslice_green_lantern.py; the source frames kept untouched). Full pixel audit + owner
// decisions: GREEN_LANTERN_ASSET_MAP.md. Stage 1 = registration + movement/state only; normals /
// specials (fixed construct slots N=Fist/F=Lion/B=Blade/D=Tentacle/U=Spike/air=Sphere) / multi-
// construct ULT = later stages. REQUIRES the skins.js `green_lantern` default entry (else applySkin()
// → spriteScale:1 native shrink) + the spritesheets.js SPRITE_MANIFEST idle gate.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const greenLantern = {
  rosterKey: "green_lantern", name: "Green Lantern", universe: "dc",
  portrait: "./gl_portrait.png",   // frame 624 — a dedicated suited-GL bust baked into the sheet (a real select asset)
  archetypes: ["zoner", "rushdown", "tactics"],
  primary: "zoner", secondary: ["rushdown", "tactics"],
  // energyType "willpower" = the green light of will powering the ring; will throttle the large
  // fixed-slot construct kit + the multi-construct ultimate in later stages.
  traits: { hasEnergy: true, energyType: "willpower", mobility: "high", scaling: "versatile", animeMovement: true, canFly: true },
  passive: { name: "The Emerald Knight", effect: "A test pilot chosen by a power ring — hard-light constructs limited only by willpower; a versatile flying zoner with a shape for every situation" },
  // A well-rounded flying construct-user: sturdier than the frail technicians (Onoki/Mayuri/Brainiac),
  // below the heavy bruisers. His edge is breadth (seven construct shapes) + flight mobility, not raw
  // HP. maxEnergy 200 = the shared Willpower pool feeding the whole special kit. Large-kit breadth =
  // flagged in Stage 6 balance (schema-exception, honest ×0.60, no stat record).
  stats: { maxHealth: 1150, maxEnergy: 200, attack: 90, defense: 84, speed: 94, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 44 },
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below).
  // Sliced from the "General Combat Pose Library": light = quick straight jab (262), heavy = committed
  // lunging power punch (285–287), upAttack = rising launcher kick (313), airAttack = aerial superman
  // flying-kick (121–123), downAir = reuses the air sheet (no clean downward aerial). Balanced versatile-
  // hero tier. All run createAttackFromMove → scaled ×0.60. GL has NO crouch art → no crouchLight variant.
  basic_attacks: {
    light:    { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 80, rangeY: 40 },   // quick straight punch
    heavy:    { damage: 80, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 98, rangeY: 46 },   // lunging power punch — long reach
    upAttack: { type: "launcher", damage: 62, startup: 7, active: 4, recovery: 17, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false, rangeX: 82, rangeY: 66 },   // rising kick — tall launcher
    downAir:  { damage: 70, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11, rangeX: 96, rangeY: 46 },  // downward aerial kick (reuses air art)
    airAttack:{ damage: 54, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2, rangeX: 96, rangeY: 44 }   // aerial flying-kick — wide reach
  },
  // ultimate = HUD-only until the ultimate stage (real logic + cost live in abilities.js). Owner
  // decision: lore-accurate MULTI-CONSTRUCT FINISHER (muscle-transformation art 603–619 DROPPED).
  ultimate: { name: "Will Made Manifest", cost: 100, description: "Hal pours his full will into the ring, manifesting several massive constructs at once for a devastating combined strike." },
  hasSprites: true,
  // Hal reads ~119px tall in the idle bust (arms spread). scale 1.4 → ~176px on-screen, a large,
  // imposing hero frame above the roster median. anchorY:0 everywhere → feet planted, no anchor rescale.
  spriteScale: 1.4,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, ASSEMBLED from individual frames, feet-aligned) ──
    idle:  { frames: 4, width: 117, height: 126, speed: 7, anchorY: 0, sheet: "./gl_idle_uniform.png" },   // frames 005–008: 4-frame confident ready stance
    // No dedicated WALK cycle exists in the sheet → walk + dash REUSE the run strip (Boruto/Superman
    // precedent). run = the clean forward-stride cycle carved from the pose library (289/290/292/293).
    walk:  { frames: 4, width: 77, height: 83, speed: 6, anchorY: 0, sheet: "./gl_run_uniform.png" },      // REUSE run (no dedicated walk art) — FLAG
    run:   { frames: 4, width: 77, height: 83, speed: 4, anchorY: 0, sheet: "./gl_run_uniform.png" },      // forward strides (289–293)
    dash:  { frames: 4, width: 77, height: 83, speed: 3, anchorY: 0, sheet: "./gl_run_uniform.png" },      // REUSE run (no dedicated dash art) — FLAG
    // jump = rising leap (frame 070, held). fall = descending head-over-heels tumble (frame 108, held) —
    // REAL distinct descent art, not a jump reuse.
    jump:  { frames: 1, width: 84, height: 125, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_jump_uniform.png" },
    fall:  { frames: 1, width: 56, height: 139, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_fall_uniform.png" },
    // flight = airborne glide+tumble loop (073–075 glide, 105–107 acrobatic). canFly:true; the flight
    // movement mode (owner decision: the horse construct becomes a movement/dash mode; flight art backs it).
    fly:     { frames: 6, width: 115, height: 109, speed: 4, anchorY: 0, sheet: "./gl_flight_uniform.png" },
    flyMove: { frames: 6, width: 115, height: 109, speed: 4, anchorY: 0, sheet: "./gl_flight_uniform.png" },
    // guard = REUSE idle (no dedicated block art) — FLAG. Held to a braced idle pose.
    guard: { frames: 1, width: 117, height: 126, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_idle_uniform.png" },
    // hurt = standing stagger/recoil (419 upright + 421 forward stagger). KNOCKDOWN chain: the airborne
    // head-over-heels tumble (549–555) plays while down; getup REUSES idle (no clean rise-to-stance art
    // exists — 561–567 are all prone/tumble poses) → pop back to ready. FLAG.
    hurt:      { frames: 2, width: 107, height: 138, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_hurt_uniform.png" },
    knockdown: { frames: 4, width: 156, height: 122, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_knockdown_uniform.png" },
    getup:     { frames: 4, width: 117, height: 126, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_idle_uniform.png" },   // REUSE idle (no dedicated getup art) — FLAG
    // ── STAGE 2 NORMALS (5 slots, ASSEMBLED feet-aligned). basic_attacks (above) carries the hit/frame
    // data; these drive the SPRITE. loop:false + lockLastFrame holds the strike through recovery. From the
    // pose library: light = quick jab (262), heavy = lunging power punch (285–287), up (launcher) = rising
    // kick (313–314), air = superman flying-kick (121–123). down_air REUSES the air sheet. ──
    light:    { frames: 2, width: 124, height: 121, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_light_uniform.png" },   // quick straight jab
    heavy:    { frames: 3, width: 116, height: 122, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_heavy_uniform.png" },   // lunging power punch
    up:       { frames: 2, width: 97,  height: 140, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_up_uniform.png" },      // rising launcher kick
    air:      { frames: 3, width: 170, height: 134, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_air_uniform.png" },     // aerial flying-kick
    down_air: { frames: 3, width: 170, height: 134, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_air_uniform.png" },     // REUSE air sheet (no dedicated down-aerial art) — FLAG
    // ── STAGE 3 command normal (abilities.js updateGreenLanternCommandCombat; currentMove === "glSpinKick"
    // → sprite.js identity-maps to this strip). Fwd+Heavy → an advancing sweeping SPIN KICK (frame 263,
    // bracketed by ready poses). Single command-normal (Onoki/Madara pattern, NOT a rekka). ──
    glSpinKick: { frames: 3, width: 129, height: 128, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_spinkick_uniform.png" },
    // ── STAGE 4 ranged layer. glBeam = Energy Beam cast pose (_spriteCastMove="glBeam" → sprite.js
    // identity-maps here). Arms-forward ring-projecting pose (frames 317–318). Fired via P-HOLD release
    // (abilities.js fireGreenLanternBeam); P-TAP toggles flight (generic canFly path). ──
    glBeam: { frames: 2, width: 113, height: 126, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_beam_uniform.png" },
    // WIN pose (Stage 7). No bespoke victory/intro art exists (FLAGGED gap); repurposed the confident
    // fists-up ready stance (frames 264/265) — reads as a triumphant settle. game.js poses the winner via _forceAction="win".
    win: { frames: 2, width: 88, height: 121, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./gl_win_uniform.png" },
  }
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// THE HANDLER (working title, rosterKey `handler`, universe jujutsu_kaisen) — a NEW standalone
// character built from the REMOVED Megumi Fushiguro's Ten-Shadows shikigami kit + Mahoraga (NOT a
// Megumi restoration; owner-framed as new). Built from 3 source sheets RE-SLICED feet-aligned
// (tools/reslice_handler.py). Full Stage-0 pixel audit + owner decisions: HANDLER_ASSET_MAP.md.
// Stage 1 = registration + movement/state ONLY. LATER: Stage 2 basic combo (blade-draw normals),
// Stage 4 cameo-shikigami system + Ryōki Tenkai Domain (owner: 2nd signature special), Stage 5
// Mahoraga adaptation ultimate (NEW engine scope). REQUIRES the skins.js `handler` default entry
// (else applySkin() → spriteScale:1 native shrink) + the spritesheets.js idle gate.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const handler = {
  rosterKey: "handler", name: "Megumi", universe: "jujutsu_kaisen",   // display name Megumi (owner-named); internal rosterKey stays `handler`
  portrait: "./handler_portrait.png",   // bust carved from the sword-drawn win stance (Stage 6)
  archetypes: ["summoner", "technician", "zoner"],
  primary: "melee", secondary: ["summoner", "zoner"],
  // energyType "cursed_energy" (shared JJK pool, already labeled in ui.js) — will fuel the cameo
  // shikigami summons + the Ryōki Tenkai Domain special + the Mahoraga adaptation ultimate (later stages).
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Ten Shadows Technique", effect: "A shikigami sorcerer who calls the Ten Shadows — Divine Dogs, Nue, Toad, Max Elephant and more — as cameo allies, and can invoke the adapting Mahoraga at his limit" },
  // PROVISIONAL stats — audited in Stage 6 against BALANCE_AUDIT.md. A summoner/technician: mid HP,
  // deep cursed-energy pool (maxEnergy 200) for the shikigami kit + Domain + Mahoraga ult. Not a raw
  // bruiser; edge is versatility + zoning via summons. speed 90 = grounded technician (below Yuta 94).
  stats: { maxHealth: 1120, maxEnergy: 200, attack: 84, defense: 82, speed: 90, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 12, dashCooldownMax: 44 },
  movement: { crouchIdle: true },   // opt-in: holding Down shows the dedicated crouch strip
  // HUD-only until the ultimate stage (real logic + cost live in abilities.js, later). ULT = Mahoraga:
  // swaps in weak, then ADAPTS to repeated moves (per-move damage falloff vs him) and grows stronger —
  // NEW engine scope (nothing tracks per-move repeat-hit history yet). See HANDLER_ASSET_MAP.md Stage 5.
  ultimate: { name: "Mahoraga", cost: 100, description: "Invokes the Eight-Handled Sword Divergent Sila Divine General Mahoraga — a shikigami that adapts to any attack used against it, growing stronger the longer it fights." },
  hasSprites: true,
  // Idle content ≈58px; scale 2.0 → ~114px on-screen — right in the regular teen cluster (just above
  // Naruto/Gojo ~112, canon-appropriate for tall-ish Megumi; the earlier 1.75/~100px read noticeably
  // short). anchorY:0 everywhere → feet planted.
  spriteScale: 2.0,
  // STAGE 2 normals (combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below).
  // Carved from the ONE ground combo string (megumi_attack_punches_kicks.png). The Handler joins the
  // shared STANDARD_STRING grammar (abilities.js STANDARD_STRING_CHARS) → Light→Light→Heavy(launcher)
  // auto-string = "punch → punch → blade-drawn strike", exactly the prompt's basic combo (the removed
  // Megumi was a standard-string char too). light = fast punch, heavy = long-reach sword thrust,
  // upAttack = rising sword-draw launcher. All run createAttackFromMove → scaled ×0.60. Special-grade tier.
  basic_attacks: {
    light:    { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: 78, startup: 10, active: 4, recovery: 20, hitstun: 20, knockbackX: 8, knockbackY: 1, rangeX: 92, rangeY: 40 },   // sword thrust — long reach
    upAttack: { type: "launcher", damage: 60, startup: 8, active: 4, recovery: 18, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false, rangeX: 66, rangeY: 66 },   // rising sword-draw anti-air
    downAir:  { damage: 66, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    airAttack:{ damage: 50, startup: 6, active: 3, recovery: 12, hitstun: 14, knockbackX: 4, knockbackY: -2 }
  },
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, RE-SLICED feet-aligned; tools/reslice_handler.py) ──
    idle:  { frames: 4,  width: 26, height: 62, speed: 6, anchorY: 0, sheet: "./handler_idle_uniform.png" },    // "Stance" — calm standing loop (left cluster)
    walk:  { frames: 10, width: 26, height: 60, speed: 5, anchorY: 0, sheet: "./handler_walk_uniform.png" },    // "Walk" 10-frame side cycle (scaled to idle height — no size pop)
    // No dedicated run/dash/guard/jump-run art (confirmed gap). run/dash REUSE walk; guard/getup REUSE
    // existing states; fall REUSES jump's apex pose — all FLAGGED.
    run:   { frames: 10, width: 26, height: 60, speed: 3, anchorY: 0, sheet: "./handler_walk_uniform.png" },    // REUSE walk (no run art) — FLAG
    dash:  { frames: 10, width: 26, height: 60, speed: 2, anchorY: 0, sheet: "./handler_walk_uniform.png" },    // REUSE walk — FLAG
    crouch:{ frames: 1,  width: 35, height: 58, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_crouch_uniform.png" },   // "Crouch" moderate duck (frame 1)
    jump:  { frames: 2,  width: 41, height: 62, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_jump_uniform.png" },     // "Jump" rise-tuck → arms-up apex (2 real air frames)
    fall:  { frames: 2,  width: 41, height: 62, speed: 7, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_jump_uniform.png" },     // REUSE jump sheet (lockLastFrame holds the apex/spread) — FLAG
    guard: { frames: 4,  width: 26, height: 62, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_idle_uniform.png" },     // REUSE idle as a braced block (no guard art) — FLAG
    // hurt = standing recoil→stagger (megumi "Hit"); knockdown = the falling-on-back frame that ENDS the
    // hit sequence (per prompt "ending in a fall"). No getup art → getup REUSES hurt (rising ≈ recoil).
    hurt:      { frames: 2, width: 44, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_hurt_uniform.png" },
    knockdown: { frames: 1, width: 58, height: 37, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_knockdown_uniform.png" },
    getup:     { frames: 2, width: 44, height: 62, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_hurt_uniform.png" },  // REUSE hurt (no getup art) — FLAG
    // ── STAGE 2 NORMALS (RE-SLICED feet-aligned from the single combo string). basic_attacks (above)
    // carries hit/frame data; these drive the SPRITE. loop:false + lockLastFrame holds the strike. ──
    light:    { frames: 3, width: 43, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_light_uniform.png" },   // jab→punch→punch (fast poke)
    heavy:    { frames: 3, width: 81, height: 50, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_heavy_uniform.png" },   // forward sword thrust (long reach)
    up:       { frames: 2, width: 59, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_up_uniform.png" },      // rising sword-draw launcher
    air:      { frames: 3, width: 43, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_light_uniform.png" },   // REUSE light punch (no aerial art) — FLAG
    down_air: { frames: 3, width: 43, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_light_uniform.png" },   // REUSE light punch (no down-aerial art) — FLAG
    // ── STAGE 4 SHIKIGAMI cast pose (_spriteCastMove="handlerSummon"; sprite.js MOVE_TO_ACTION identity).
    // ONE shared summon hand-sign gesture for ALL six shikigami calls; the shikigami themselves are
    // summons.js entities (handler_shik_*.png). Carved from the Ten-Shadows cast poses (Gama sheet). ──
    handlerSummon: { frames: 2, width: 47, height: 61, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_summon_uniform.png" },
    // ── STAGE 6 WIN / LOSE (game.js poses winner/loser via _forceAction). No bespoke win/lose/intro art
    // exists anywhere across the 3 sheets (FLAGGED gap). win = the sword-draw INSET pair repurposed
    // (megumi_attack_punches_kicks.png reference stances, brown bg chroma-keyed → a real confident pose);
    // lose = REUSE the knockdown lying pose; intro is DEFERRED (falls back to idle — flagged art gap). ──
    win:  { frames: 2, width: 72, height: 52, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_win_uniform.png" },
    lose: { frames: 1, width: 58, height: 37, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./handler_knockdown_uniform.png" },  // REUSE knockdown (no bespoke lose art) — FLAG
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// BATMAN — NEW VARIANT (rosterKey "dark_knight", universe "dc"). A FULLY SEPARATE roster entry from
// the existing `batman` (which is UNTOUCHED — its kit/design/naming were not consulted). Source art =
// a single 5120x2880 RGBA sheet with TRUE per-pixel alpha (no chroma key), df2ek1u-...-e247c4.png,
// RE-SLICED by tools/reslice_dark_knight.py into feet-aligned uniform cells. Full Stage-0 investigation
// + region map: BATMAN_VARIANT_ASSET_MAP.md. Source artist UNKNOWN (attribution OPEN — blocks ship).
//
// THREE-MODE character (confirmed Stage 0): standard form (this stage) + a bulked RAGE transformation
// (Stage 5, timed-mode pattern) + a giant MECH-SUIT ultimate (Stage 6, materialize cinematic). Standard
// form built from the LARGER lower-set art (owner decision) — idle ~129px content.
//
// STAGE 1 = registration + movement/state only. Placeholder normals; real normals/chains/specials/rage/
// mech land in later stages. energyType "fury" = the rage meter fuelling Rage Mode + the Mech ultimate.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const darkKnight = {
  rosterKey: "dark_knight", name: "Batman", universe: "dc",
  portrait: "./dark_knight_portrait.png",   // cowl lower-face close-up fragment (Stage 0 item 6) — a real select/HUD bust
  archetypes: ["rushdown", "bruiser", "tactics"],
  primary: "melee", secondary: ["bruiser", "tactics"],
  // energyType "fury" = escalating rage reserve; will fuel the Rage Mode transform + Mech-Suit ultimate
  // in later stages. maxEnergy 100.
  traits: { hasEnergy: true, energyType: "fury", mobility: "medium", scaling: "versatile", animeMovement: false },
  passive: { name: "The Dark Knight", effect: "A relentless brawler who escalates — a bulked rage state and a powered mech suit are held in reserve" },
  // Durable, well-rounded brawler (big three-mode kit → balance is a Stage-7 item, FLAGGED as a large-kit
  // outlier once real numbers exist). Placeholder stats; no stat is an intentional outlier yet.
  stats: { maxHealth: 1150, maxEnergy: 100, attack: 90, defense: 88, speed: 88, maxJumps: 2, jumpPower: 31, dashSpeed: 15, dashDuration: 12, dashCooldownMax: 40 },
  movement: { crouchIdle: true },   // holding Down shows the dedicated crouch pose
  // Placeholder normals (moderate, combo-friendly) — real normals + command chain land in Stage 2.
  // STAGE 2 normals — combat.js _getMD reads THIS basic_attacks; sprite sheets in animationData below.
  // Classified by commitment: light = fast low-commit jab; heavy = slow, committed LUNGE with long reach
  // (rangeX); upAttack = launcher (reuses the heavy lunge pose — no dedicated uppercut art, FLAG); air =
  // leaping dropkick; downAir = dive-kick (reuses air pose). All run createAttackFromMove → scaled ×0.60.
  basic_attacks: {
    light:    { damage: 34, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 2, knockbackY: 0 },
    heavy:    { damage: 66, startup: 9, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1, rangeX: 96, rangeY: 44 },   // committed lunge — long reach
    upAttack: { type: "launcher", damage: 54, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, airOK: false },
    airAttack:{ damage: 46, startup: 5, active: 3, recovery: 12, hitstun: 13, knockbackX: 3, knockbackY: -2, rangeX: 78 },   // leaping dropkick — extended reach
    downAir:  { damage: 58, startup: 7, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 10 },
    grab:     { damage: 26, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 5, throwForceY: -3 }
  },
  // STAGE 6 ULTIMATE — "Mech Suit" (2-phase timed heavy-FORM; abilities.js executeDarkKnightUltimate).
  // Phase 1 = wireframe MATERIALIZE cinematic (dkMechWire, freeze/camera-focus). Phase 2 = a timed giant
  // mech FORM (_skinAnim swap to mech body: dmg ×1.5 / def ×1.25 armor / spd ×0.85, ~8s → auto-revert).
  ultimate: { name: "Mech Suit", cost: 100, description: "Batman materializes a giant powered-armor suit — a timed heavy form that hits like a truck and shrugs off blows, before powering down." },
  hasSprites: true,
  // Source frames are LARGE (idle content ~129px). scale 0.9 → ~116px on-screen, sitting in the roster
  // band alongside the other big-sprite DC fighters. Reslice is bottom-aligned → anchorY 0 everywhere.
  spriteScale: 0.9,
  animationData: {
    // ── MOVEMENT / STATE (Stage 1, RE-SLICED feet-aligned from the larger lower-set) ──
    // ★SMOOTHNESS REBUILD — idle+walk moved from the frame-SPARSE lower set (2f/4f, robotic) to the frame-RICH
    // UPPER set (same grey-suit style + size): a 10-frame breathing idle + a 10-frame stalking-prowl walk.
    idle:  { frames: 10, width: 119, height: 129, speed: 6, anchorY: 0, sheet: "./dark_knight_idle_uniform.png" },   // 10-frame breathing/weight-shift idle
    walk:  { frames: 10, width: 207, height: 117, speed: 6, anchorY: 0, sheet: "./dark_knight_walk_uniform.png" },   // 10-frame crouched prowl (upper set, ×1.5 upscaled to idle-comparable height)
    // No distinct sprint art in the standard set → run/dash REUSE walk faster (Deathstroke/Superman precedent) — FLAG.
    run:   { frames: 10, width: 207, height: 117, speed: 4, anchorY: 0, sheet: "./dark_knight_walk_uniform.png" },   // REUSE walk (10-frame prowl) faster — FLAG
    dash:  { frames: 10, width: 207, height: 117, speed: 3, anchorY: 0, sheet: "./dark_knight_walk_uniform.png" },   // REUSE walk (10-frame prowl) fastest — FLAG
    crouch:{ frames: 1, width: 119, height: 124, speed: 8,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_crouch_uniform.png" },  // kneeling duck
    // jump/fall use the glide/dive set (cape spread into bat-wing). No dedicated jump/fall art → glide serves air — FLAG.
    jump:  { frames: 6, width: 218, height: 147, speed: 5,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_glide_uniform.png" },
    fall:  { frames: 6, width: 218, height: 147, speed: 5,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_glide_uniform.png" },   // REUSE glide (air) — FLAG
    glide: { frames: 6, width: 218, height: 147, speed: 5,  anchorY: 0, loop: true, sheet: "./dark_knight_glide_uniform.png" },                          // explicit cape-glide (air-drift / clip)
    // DODGE — cape-wrap evade (arm raised, cape swept across to conceal, then emerge). No gameplay dodge
    // state is bound yet (engine dodges via dash i-frames/tech-roll); registered for the clip + future use.
    dodge: { frames: 5, width: 142, height: 132, speed: 4,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_dodge_uniform.png" },
    // guard/hurt/getup REUSE idle (no dedicated art in the lower set) — FLAG. Real hurt/getup deferred.
    guard: { frames: 1, width: 118, height: 129, speed: 8,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_idle_uniform.png" },   // REUSE idle — FLAG
    hurt:  { frames: 1, width: 118, height: 129, speed: 6,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_idle_uniform.png" },   // REUSE idle (no hurt art) — FLAG
    getup: { frames: 1, width: 118, height: 129, speed: 6,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_idle_uniform.png" },   // REUSE idle (no getup art) — FLAG
    // knockdown = REAL prone/lying KO art from the lower set.
    knockdown: { frames: 1, width: 152, height: 111, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_knockdown_uniform.png" },
    // ── STAGE 2 NORMALS (5 slots, RE-SLICED feet-aligned side-view melee poses; basic_attacks above
    // carries hit/frame data, these drive the SPRITE). loop:false + lockLastFrame holds the strike through
    // recovery. light = quick jab, heavy = cocked→committed LUNGE punch (long reach), air = leaping
    // DROPKICK, crouchLight = low sweep. up (launcher) REUSES heavy; down_air REUSES air (no dedicated
    // uppercut / down-aerial art in the standard set — FLAGGED). ──
    light:    { frames: 2, width: 132, height: 117, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_light_uniform.png" },       // quick forward jab
    // ★SMOOTHNESS REBUILD — heavy+air moved to the frame-RICH UPPER set (5-frame committed lunge / 3-frame
    // jump-punch→cape-dive). up reuses heavy (now 5f); down_air reuses air (now 3f) — both inherit the flow.
    heavy:    { frames: 5, width: 142, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_heavy_uniform.png" },       // 5-frame committed lunge punch (upper set)
    up:       { frames: 5, width: 142, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_heavy_uniform.png" },       // REUSE heavy 5-frame lunge as the launcher (no dedicated uppercut art) — FLAG
    air:      { frames: 3, width: 209, height: 119, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_air_uniform.png" },         // 3-frame jump-punch → cape-spread dive (upper set)
    down_air: { frames: 3, width: 209, height: 119, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_air_uniform.png" },         // REUSE air (no dedicated down-aerial art) — FLAG
    // crouchLight — the low forward SWEEP. Auto-swapped by combat.js _setCrouchVariant when a light is
    // thrown while crouching (opt-in via THIS key; movement.crouchIdle is set above).
    crouchLight: { frames: 1, width: 193, height: 128, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_crouchlight_uniform.png" },
    // ── STAGE 4 SPECIAL cast poses (abilities.js executeDarkKnightSpecial; currentMove / _spriteCastMove ===
    // key → sprite.js resolves the sheet directly). neutral=Crescent Chain / Fwd=Chain Flail / Back=Pistol
    // Shot (projectile) / Down=Cape Spin / AIR=Dive Bomb. All from the lower-set weapon art. ──
    dkCrescent: { frames: 1, width: 215, height: 153, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_crescent_uniform.png" },   // long disjoint kusarigama reach (dims match the 215×153 re-sliced file — was 180 → clipped the hook)
    dkFlail:    { frames: 1, width: 212, height: 138, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_flail_uniform.png" },       // weighted-ball flail swing
    dkPistol:   { frames: 1, width: 185, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_pistol_uniform.png" },      // lunging pistol shot (+ procedural bullet)
    dkCape:     { frames: 1, width: 228, height: 180, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_cape_uniform.png" },        // cape-spin AoE spread (dims match the 228×180 re-sliced file)
    dkDive:     { frames: 1, width: 240, height: 128, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_dive_uniform.png" },        // head-down cape dive-bomb (air)
    // ── STAGE 5 RAGE MODE (abilities.js enter/updateDarkKnightRage; Up+Special). ★VISUAL AUDIT: this is an
    // ARMORED red-eyed, bat-eared BATSUIT + its purple WIREFRAME materialize (NOT a flesh-muscle bulk — the
    // sheet has no flesh-rage form; the plating read as "muscle" at low zoom). Gameplay keeps the "Rage"
    // berserker identity; the visual is an armor-up. dkRageTransform = wireframe materialize (_spriteCastMove on
    // enter). dkRageIdle = the solid armored batsuit; spread into fighter._skinAnim as idle+guard (Vegeta-SSJ). ──
    dkRageTransform: { frames: 4, width: 132, height: 129, speed: 5,  anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_ragetransform_uniform.png" },   // purple WIREFRAME materialize
    dkRageIdle:      { frames: 3, width: 132, height: 129, speed: 10, anchorY: 0, loop: true, sheet: "./dark_knight_rageidle_uniform.png" },                              // solid armored batsuit (idle/guard while raging)
    // ── STAGE 6 MECH SUIT ultimate (abilities.js executeDarkKnightUltimate). GIANT Optimus-style mech from the
    // far-right column (x4100+, distinct from the Stage-5 armored batsuit). dkMechWire = purple WIREFRAME
    // materialize cinematic (Phase 1, _spriteCastMove on cast). dkMechIdle/dkMechAttack = the solid giant mech,
    // spread into fighter._skinAnim (Phase 2 form: idle/movement + all strikes render on the mech body). Big
    // ~205px cells → renders as a towering suit vs the 129px base. ──
    dkMechWire:   { frames: 4, width: 213, height: 205, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_mechwire_uniform.png" },   // wireframe materialize (Phase 1)
    dkMechIdle:   { frames: 2, width: 198, height: 205, speed: 8, anchorY: 0, loop: true, sheet: "./dark_knight_mechidle_uniform.png" },                          // solid mech idle (Phase 2)
    dkMechAttack: { frames: 1, width: 238, height: 178, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_mechattack_uniform.png" }, // mech lunge/strike (Phase 2 normals)
    // ── STAGE 7 WIN / LOSE (game.js poses winner/loser via _forceAction). No bespoke victory/lose/intro art on
    // the sheet (FLAGGED gap). win = repurposed front-facing confident stance (arms out, cape spread). lose =
    // REUSE the knockdown lying pose. intro DEFERRED → falls back to idle (introPool). ──
    win:  { frames: 1, width: 140, height: 132, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_win_uniform.png" },        // confident victory stance (repurposed — no unique win art)
    lose: { frames: 1, width: 152, height: 111, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./dark_knight_knockdown_uniform.png" },  // REUSE knockdown (no bespoke lose art) — FLAG
  },
  introPool: ["idle"]
}

export const characters = {
  goku, goku_black: gokuBlack, vegeta, piccolo, frieza, cell,
  gojo, sukuna, alt_sukuna: altSukuna, aoi_todo: aoiTodo, omololu, maki, toji, yuji, baki, naoya,
  naruto, sasuke, itachi, tobirama, hashirama, minato, madara, obito, tobi, pain,
  zenitsu, rengoku, shinobu, inosuke, nezuko,
  rick, morty, evilMorty, rickPrime,
  beerus,
  ben10, albedo,
  omniman: omniMan,
  omega_ranger: omegaRanger,
  samurai_red_ranger: samuraiRedRanger,
  gold_samurai_ranger: goldSamuraiRanger,
  green_samurai_ranger: greenSamuraiRanger,
  red_ranger_mmpr: redRangerMmpr,
  netero,
  saiki,
  killua,
  flash,
  gon,
  batman,
  hisoka,
  superman,
  chrollo,
  ghostface,
  ghostface_billy,
  jason,
  hiruzen,
  isshiki,
  miwa,
  ichigo,
  zaraki,
  zaraki_shikai: zarakiShikai,
  saitama,
  genos,
  orochimaru,
  onoki,
  mayuri,
  kiba,
  byakuya,
  boruto,
  light,
  l_ryuuzaki: lRyuuzaki,
  yamamoto,
  six_paths_pain: sixPathsPain,
  kurapika,
  spiderman,
  deathstroke,
  brainiac,
  green_lantern: greenLantern,
  yuta,
  handler,
  dark_knight: darkKnight
}

// The 7 characters shown in the starter roster select screen
export const starterRoster = [goku, naruto, gojo, sukuna, omololu]

// Full flat list
export const characterList = Object.values(characters)

// ─────────────────────────────────────────────────────────────────────────────
// LOAD-PATH INTEGRITY GUARD — fail LOUDLY on a duplicate character declaration.
// This is the exact corruption class that caused the "duplicate frieza" break. It runs
// on EVERY import of characters.js (browser + node + every harness) — it is part of the
// standard load path, not an opt-in check. Two duplicate-declaration modes:
//   (a) two `const X = {…}` with the SAME name  → already a hard SyntaxError at parse
//       (the module cannot load at all — inherently loud in every load path);
//   (b) two roster entries sharing a `rosterKey` (or one object exported twice) → would
//       otherwise load SILENTLY (last-wins), quietly shipping the wrong character.
// This guard makes (b) as loud as (a): it throws immediately so nothing downstream runs.
export function assertNoDuplicateCharacters(roster = characters) {
  const seenKey = new Map()      // rosterKey -> export key that first declared it
  const seenObj = new Map()      // object identity -> export key (catches one obj exported twice)
  const dups = []
  for (const [exportKey, def] of Object.entries(roster)) {
    if (!def || typeof def !== "object") continue
    if (seenObj.has(def)) dups.push(`the SAME character object is exported under both "${seenObj.get(def)}" and "${exportKey}"`)
    else seenObj.set(def, exportKey)
    const rk = def.rosterKey
    if (!rk) continue
    if (seenKey.has(rk)) dups.push(`rosterKey "${rk}" is declared twice (under export keys "${seenKey.get(rk)}" and "${exportKey}")`)
    else seenKey.set(rk, exportKey)
  }
  if (dups.length) {
    throw new Error(
      "[characters.js] DUPLICATE CHARACTER DECLARATION — refusing to load:\n  - " + dups.join("\n  - ") +
      "\nThis is the same corruption class as the 'duplicate frieza' break. Remove the duplicate roster entry before the game/harness can load."
    )
  }
  return true
}
// RUN ON IMPORT — this executes for every consumer of characters.js (browser, node, every
// harness), so a duplicate declaration fails the load immediately rather than silently shipping.
assertNoDuplicateCharacters()

export const rosterRules = {
  meleeIsPrimaryForAll: true,
  secondaryArchetypesEnhanceMelee: true,
  fewerArchetypesMeansStrongerCoreMechanics: true,
  playerUsageShouldMatchCharacterFocus: true,
  animeStyleMovementNotLiteralTeleportation: true
}

export function getCharacter(key) {
  if (!key) return null
  return characters[String(key).trim().toLowerCase()] || null
}

export function getSelectableRoster() {
  return characterList
}

export default characters
