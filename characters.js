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
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launchVy: -12, selfVy: -9 },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {
    dragonFist: { cost: 40, damage: 150, startup: 10, active: 6, recovery: 22, hitstun: 28, knockbackX: 12, knockbackY: -6, effect: "punch attack with dragon aura" },
    kamehameha: { cost: 30, damage: 120, startup: 12, active: 5, recovery: 22, hitstun: 22, knockbackX: 8, knockbackY: -2 }
  },
  ultimate: { name: "Super Saiyan Blue", cost: 100, duration: 8, effect: "Triggers next SSJ transformation" },
  transformationOrder: ["base","ssj1","ssj2","ssj3","ssblue","ultraInstinct"],
  transformations: {
    base:          { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    ssj1:          { damageMultiplier: 1.2, speedMultiplier: 1.1, defenseMultiplier: 1.05, duration: 1800 },
    ssj2:          { damageMultiplier: 1.3, speedMultiplier: 1.15, defenseMultiplier: 1.1, duration: 1500 },
    ssj3:          { damageMultiplier: 1.5, speedMultiplier: 1.2, defenseMultiplier: 1.05, energyDrainPerFrame: 5 / 60, kiDrainPerSecond: 5, duration: 900 },
    ssblue:        { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, energyDrainPerFrame: 8 / 60, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ultraInstinct: { damageMultiplier: 2.5, speedMultiplier: 2, defenseMultiplier: 1.5, autoDodge: true, autoDodgeKiCost: 10, energyDrainPerFrame: 12 / 60, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
  },
  hasSprites: true,
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
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 12, launchVy: -12, selfVy: -9 },   // Up-Attack launcher (uppercut) — BALANCED archetype (Gojo ref)
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

const piccolo = {
  rosterKey: "piccolo", name: "Piccolo", universe: "dragon_ball", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "ranged"],
  primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1100, maxEnergy: 160, attack: 84, defense: 86, speed: 80, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { type: "launcher", damage: 60, startup: 6, active: 4, recovery: 8, hitstun: 18, knockbackX: 2, knockbackY: -7, launchVy: -12, selfVy: -9 },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 55, startup: 6, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 9, active: 4, recovery: 14, hitstun: 16, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 28, startup: 7, active: 3, recovery: 14, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    specialBeamCannon: { cost: 35, damage: 150, startup: 16, active: 4, recovery: 24, hitstun: 26, knockbackX: 11, knockbackY: -3, effect: "piercing ki attack" },
    hellzoneGrenade:   { cost: 30, damage: 100, startup: 14, active: 8, recovery: 24, hitstun: 20, knockbackX: 7, knockbackY: -1, effect: "multi-ki ball attack" }
  },
  ultimate: { name: "Fused with Kami", cost: 100, duration: 6, effect: "Enhanced stats and ki attacks" },
  transformationOrder: ["base","fusedWithKami"],
  transformations: {
    base:          { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    fusedWithKami: { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.15, duration: 1200 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const frieza = {
  rosterKey: "frieza", name: "Frieza", universe: "dragon_ball", isPlayable: false,   // no sprite art yet — hidden from normal select, dev-only (Stage 5B)
  archetypes: ["melee", "ranged"],
  primary: "ranged", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1200, maxEnergy: 170, attack: 90, defense: 84, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 9, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launchVy: -12, selfVy: -9 },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 9, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 28, startup: 5, active: 3, recovery: 13, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    deathBeam:         { cost: 20, damage: 90, startup: 8, active: 3, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, effect: "precise ki blast" },
    novaStrike:        { cost: 30, damage: 140, startup: 12, active: 5, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "large ki explosion" },
    ultimateDeathBall: { cost: 50, damage: 200, startup: 20, active: 6, recovery: 30, hitstun: 32, knockbackX: 14, knockbackY: -4, effect: "huge energy sphere" }
  },
  ultimate: { name: "Golden Frieza", cost: 100, duration: 8, effect: "Massive speed and attack boost" },
  transformationOrder: ["base","goldenFrieza"],
  transformations: {
    base:         { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    goldenFrieza: { damageMultiplier: 2, speedMultiplier: 1.5, defenseMultiplier: 1.2, energyDrainPerFrame: 6 / 60, kiDrainPerSecond: 6, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
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
    upAttack:  { type: "launcher", damage: 75, startup: 5, active: 4, recovery: 9, hitstun: 21, knockbackX: 2, knockbackY: -8, launchVy: -13, selfVy: -9 },   // Up-Attack launcher — HEAVY archetype (Toji ref); tanky absorber
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
    // Up-Attack launcher "Rising Palm" (balanced reference archetype): startup 6 / active 4 /
    // recovery 8; launches enemy at vy -12 and lifts Gojo at vy -9 (slightly less, so the enemy
    // floats just above → juggleable). launchVy/selfVy are honored EXACTLY (bypass the -17 floor).
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launchVy: -12, selfVy: -9 },
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

const megumi = {
  rosterKey: "megumi", name: "Megumi Fushiguro", universe: "jujutsu_kaisen",
  portrait: "./megumi_pfp.jpeg",   // EXACT on-disk filename (case + extension)
  archetypes: ["melee", "summons"],
  primary: "melee", secondary: ["summons"],
  traits: { hasEnergy: true, energyType: "cursed_energy", mobility: "medium", scaling: "setup", animeMovement: true },
  stats: { maxHealth: 1120, maxEnergy: 210, attack: 84, defense: 82, speed: 83, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 82, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 58, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 76, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 28, startup: 6, active: 3, recovery: 14, hitstun: 18, throwForceX: 4, throwForceY: -4 }
  },
  specials: {
    divineDogs:   { cost: 20, damage: 95, startup: 10, active: 5, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, subtype: "summon", summonId: "divineDogs", cooldown: 120, effect: "summons divine dogs" },
    nue:          { cost: 25, damage: 110, startup: 14, active: 5, recovery: 20, hitstun: 20, knockbackX: 5, knockbackY: -6, subtype: "summon", summonId: "nue", cooldown: 160, effect: "aerial lightning strike" },
    toad:         { cost: 20, damage: 70, startup: 12, active: 6, recovery: 19, hitstun: 22, knockbackX: 2, knockbackY: 0, subtype: "summon", summonId: "toad", cooldown: 140, effect: "restrain opponent" },
    rabbitEscape: { cost: 15, damage: 20, startup: 9, active: 18, recovery: 14, hitstun: 6, knockbackX: 0, knockbackY: 0, subtype: "summon", summonId: "rabbitEscape", cooldown: 180, effect: "swarm distraction" },
    maxElephant:  { cost: 35, damage: 145, startup: 20, active: 6, recovery: 26, hitstun: 24, knockbackX: 9, knockbackY: -2, subtype: "summon", summonId: "maxElephant", cooldown: 240, effect: "massive crushing attack" }
  },
  ultimate: {
    name: "Chimera Shadow Garden", cost: 100, duration: 15, effect: "Domain expansion — a shadow territory that restrains the opponent"
  },
  domain: { name: "Chimera Shadow Garden", priority: 3, background: "shadow_garden" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  // SIZE-NORMALIZED (2026-07-24): was 1.7 (idle content ~59px × 1.7 ≈ 100px — bottom of the
  // roster, −9% vs median ≈111). Bumped to 1.85 → ~59px × 1.85 ≈ 109px, into the main band.
  // No anchorY offsets on any action → feet stay planted (plant is cell-bottom→hitbox-bottom).
  spriteScale: 1.85,   // source frames ~55–61px tall → ×1.85 ≈ hitbox height
  // ── MEGUMI SPRITES ── engine action keys → strip; native cell = stripWidth/frames.
  // Summon casts use the MOVE_TO_ACTION names (divine_dogs/nue/toad/rabbit_escape/
  // max_elephant); executeMegumiSpecial sets _spriteCastMove so they play.
  animationData: {
    idle:     { frames: 4,  width: 27, height: 61, speed: 6, sheet: "./megumi_stance_sheet.png" },
    walk:     { frames: 10, width: 32, height: 62, speed: 5, sheet: "./megumi_walk_sheet.png" },
    run:      { frames: 10, width: 32, height: 62, speed: 4, sheet: "./megumi_walk_sheet.png" },
    jump:     { frames: 2,  width: 37, height: 56, speed: 6, sheet: "./megumi_jump_sheet.png" },
    fall:     { frames: 2,  width: 37, height: 56, speed: 6, sheet: "./megumi_jump_sheet.png" },
    dash:     { frames: 10, width: 32, height: 62, speed: 4, sheet: "./megumi_walk_sheet.png" },  // no dash strip → reuse walk
    hurt:     { frames: 3,  width: 58, height: 55, speed: 6, sheet: "./megumi_hurt_sheet.png" },
    // attacks (single attack strip reused)
    light:    { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    heavy:    { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    up:       { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    air:      { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    down_air: { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    grab:     { frames: 10, width: 81, height: 55, speed: 4, sheet: "./megumi_attack_sheet.png" },
    // summon casts (shadow techniques)
    divine_dogs:  { frames: 5, width: 38, height: 56, speed: 5, sheet: "./megumi_gama_sheet.png" },
    nue:          { frames: 5, width: 35, height: 50, speed: 5, sheet: "./megumi_nue_sheet.png" },
    toad:         { frames: 5, width: 38, height: 51, speed: 5, sheet: "./megumi_gyokuken_sheet.png" },
    rabbit_escape:{ frames: 5, width: 38, height: 54, speed: 5, sheet: "./megumi_datto_sheet.png" },
    max_elephant: { frames: 5, width: 40, height: 56, speed: 5, sheet: "./megumi_bansho_sheet.png" },
    // cinematic
    domain:   { frames: 2, width: 37, height: 56, speed: 6, sheet: "./megumi_domain_sheet.png" },
    ultimate: { frames: 2, width: 38, height: 56, speed: 6, sheet: "./megumi_makora_sheet.png" },
    transform:{ frames: 2, width: 38, height: 56, speed: 6, sheet: "./megumi_makora_sheet.png" }
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

const toji = {
  rosterKey: "toji", name: "Toji", universe: "jujutsu_kaisen",
  portrait: "./toji_pfp.jpg",   // EXACT on-disk filename (case + extension)
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  // dashTeleport: double-tap TOWARD the enemy → blink behind + instant strike
  // (MK-style teleport-dash). His identity tech — no cursed energy. (game.js
  // detectDoubleTapDashTeleport + abilities.tojiTeleportStrike).
  movement: { dashTeleport: true },
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1260, maxEnergy: 0, attack: 96, defense: 89, speed: 98, maxJumps: 3, jumpPower: 36, dashSpeed: 24, dashDuration: 14, dashCooldownMax: 20 },
  basic_attacks: {
    light:     { damage: 52, startup: 3, active: 3, recovery: 9, hitstun: 13, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 96, startup: 7, active: 4, recovery: 16, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    // Up-Attack launcher "Ascension Slash" (heavy/powerful archetype): hits harder, slightly slower —
    // startup 5 / active 4 / recovery 9; strongest pop of the three (enemy vy -13), Toji lifts at vy -9.
    upAttack:  { type: "launcher", damage: 72, startup: 5, active: 4, recovery: 9, hitstun: 20, knockbackX: 2, knockbackY: -9, launchVy: -13, selfVy: -9 },
    airAttack: { damage: 62, startup: 4, active: 3, recovery: 9, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 82, startup: 7, active: 4, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 },
    grab:      { damage: 40, startup: 4, active: 3, recovery: 12, hitstun: 22, throwForceX: 7, throwForceY: -5 }
  },
  specials: {
    inventorySmash: { cost: 0, damage: 155, startup: 8, active: 5, recovery: 18, hitstun: 26, knockbackX: 10, knockbackY: -3, effect: "weapon strike from inventory" },
    rapidStrike:    { cost: 0, damage: 65, startup: 4, active: 4, recovery: 10, hitstun: 14, knockbackX: 5, knockbackY: -1 }
  },
  ultimate: { name: "Heavenly Restriction", cost: 0, duration: 8, effect: "1.8x speed and 1.6x damage surge" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  // SIZE FIX: NEW transparent-bg core sheets are ~48px of content in a 54px cell, so the
  // old 1.7 rendered him ~92px (undersized vs Sasuke ~105 / Sukuna ~118). ×2.3 ≈ 110px
  // on-screen = roster-normal human scale. NOTE: the old row-sheet ATTACK actions (still
  // wired below, deferred to the attack-tree pass) render oversized at 2.3 until re-sliced.
  spriteScale: 2.59,   // HEIGHT-REF: canon 188cm → target ~117px (was 2.3). See HEIGHT_REFERENCE.md; anchorY below rescaled ×(2.59/2.3).
  // Two-part intro (walk-in → ready-up) plays in FIXED ORDER as ONE intro — NOT a
  // random-pick pool like Sasuke's introPool. game.js steps introSequence in order.
  introSequence: ["introWalkIn", "introReady"],
  // ── TOJI SPRITES ── UNLABELED rows, mapping confirmed by viewing each strip.
  // Native cell = stripWidth/frames. NOTE (sheet gaps): no real walk or hurt
  // frames exist — walk reuses the stance, hurt reuses the guard pose (row10).
  // special_1/special_2 play via executeToji_Special's createAttackFromMove
  // (MOVE_TO_ACTION: inventorySmash→special_1, rapidStrike→special_2).
  animationData: {
    // JITTER FIX: sheets have leading+trailing transparent padding, so the true frame
    // PITCH is smaller than sheetWidth/frames. Slice with sourceX (content-left) + width
    // (true pitch) or the figure drifts within each cell → horizontal wobble. Verified
    // via per-cell leg-COM (idle drift 14px→<3px after fix) + boundary overlays.
    idle:     { frames: 6,  width: 34, sourceX: 9, height: 54, speed: 8, loop: true, anchorY: -2,  sheet: "./toji_stance_idle.png" },  // 6f, true pitch 34 (was 37 → wobble)
    walk:     { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 6, loop: true, anchorY: -14, sheet: "./toji_walk.png" },  // 7f (re-verified, was mis-counted 6), pitch 34 (was 40)
    light:    { frames: 6,  width: 47, height: 65, speed: 4, sheet: "./toji_row02_sheet.png" },  // row02 punch combo
    heavy:    { frames: 6,  width: 73, height: 60, speed: 5, sheet: "./toji_row07_sheet.png" },  // row07 sword slash combo
    up:       { frames: 7,  width: 47, height: 74, speed: 5, sheet: "./toji_row04_sheet.png" },  // row04 kicks (launcher)
    // light/heavy/up (below) are DEAD for grounded Toji — the stance system fires quickDraw/
    // forwardSlash/skywardCut etc. and game.js suppresses the built-in light/heavy/up. Kept for
    // reference only; they never render, so their old-sheet scale is moot.
    air:      { frames: 5,  width: 65, height: 71, speed: 5, actionScale: 0.69, sheet: "./toji_row08_sheet.png" },  // row08 aerial sword — OLD art, scale-corrected
    down_air: { frames: 6,  width: 73, height: 60, speed: 5, actionScale: 0.82, sheet: "./toji_row07_sheet.png" },  // OLD art, scale-corrected
    // dash = the basic MOVEMENT dash (NOT the sword-dash special). Was row06 (a sword-lunge,
    // wrong content + oversized at 2.3); reuse the NEW walk sheet like `run` → correct scale + content.
    dash:     { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 4, loop: true, anchorY: -14, sheet: "./toji_walk.png" },
    // KEY MUST BE `guard` (not `block`): sprite.js resolves blocking to animationData.guard —
    // the old `block` key never rendered (Toji showed idle while blocking). Renamed + scale-corrected.
    guard:    { frames: 9,  width: 37, height: 70, speed: 6, actionScale: 0.70, sheet: "./toji_row10_sheet.png" },  // OLD guard art (no new block sprite yet)
    hurt:     { frames: 8,  width: 48, sourceX: 0, height: 54, speed: 5, anchorY: -8,  sheet: "./toji_hit.png" },  // 8f, content fills width (pitch 48 exact)
    hurt_air: { frames: 6,  width: 51, sourceX: 1, height: 49, speed: 5, anchorY: -2,  sheet: "./toji_air_hit.png" },  // 6f, pitch 51 (was 52); sprite.js picks this when hitstun && airborne
    // transform = the ULTIMATE-activation flash (sprite.js returns "transform" while teleportFlash>10;
    // executeToji_Ultimate sets it) — REACHABLE, not dead. OLD sword-draw art, scale-corrected.
    transform:{ frames: 7,  width: 76, height: 67, speed: 6, actionScale: 0.74, sheet: "./toji_row01_sheet.png" },
    special_1:{ frames: 14, width: 52, height: 63, speed: 4, actionScale: 0.78, sheet: "./toji_row09_sheet.png" },  // Inventory Smash — OLD art, scale-corrected
    special_2:{ frames: 8,  width: 57, height: 63, speed: 4, actionScale: 0.78, sheet: "./toji_row05_sheet.png" },  // Rapid Strike — OLD art, scale-corrected
    // Chain-Knife / Inverted Spear of Heaven (S,A+L) — confirmed rows: 11 windup,
    // 12 extension, 14 retract, 15 spin (folded into the same move). Dims measured.
    chain_windup:  { frames: 5, width: 96,  height: 69, speed: 4, actionScale: 0.71, sheet: "./toji_row11_sheet.png" },  // OLD art, scale-corrected
    chain_extend:  { frames: 5, width: 108, height: 69, speed: 4, actionScale: 0.71, sheet: "./toji_row12_sheet.png" },
    chain_retract: { frames: 7, width: 121, height: 87, speed: 4, actionScale: 0.56, sheet: "./toji_row14_sheet.png" },
    chain_spin:    { frames: 5, width: 85,  height: 78, speed: 4, actionScale: 0.63, sheet: "./toji_row15_sheet.png" },
    // NEW two-part intro — plays in fixed order (introSequence), NOT pooled/random.
    // Intro PACING (deliberate, NOT a timing bug): at the correctly-locked 60Hz, each step's
    // on-screen duration = frames×speed÷60. walk-in 17×5=85t=1.42s (deliberate ~12fps stride),
    // ready-up 15×4=60t=1.00s (crisper settle) → ~2.42s total entrance. (Prev speed 2/3 = 1.32s
    // total, tuned for frame-rate-independence verification, read as a blink once the loop was
    // locked to 60Hz — this re-tunes purely for how the entrance FEELS.)
    introWalkIn: { frames: 17, width: 30, sourceX: 3, height: 45, speed: 5, loop: false, lockLastFrame: true, anchorY: -8, sheet: "./toji_intro_first_part.png" },   // walk-in, pitch 30 + srcX 3
    introReady:  { frames: 15, width: 35, sourceX: 2, height: 47, speed: 4, loop: false, lockLastFrame: true, anchorY: 0,  sheet: "./toji_intro_second_part.png" },  // ready-up, pitch 35 + srcX 2
    // BLADE-STANCE normals (Phase 2). action key == the move name so sprite.js resolves it
    // directly. Sliced sourceX+true-pitch (alpha-gutter verified). Attack `speed` is auto-fit
    // to the move's duration by sprite.updateFrames, so it just needs frames/width/sourceX.
    quickDraw:    { frames: 5, width: 44, sourceX: 3, height: 60, speed: 3, anchorY: -14, sheet: "./toji_sword_attack_1.png" },       // 5A Quick Draw (230x60)
    forwardSlash: { frames: 5, width: 54, sourceX: 9, height: 45, speed: 3, anchorY: -10,  sheet: "./toji_foward_slash_2.png" },       // 5B Forward Slash (286x45)
    skywardCut:   { frames: 5, width: 45, sourceX: 0, height: 55, speed: 3, anchorY: -10,  sheet: "./toji_up_attack.png" },            // 2C Skyward Cut launcher (225x55)
    // 5C Reaper's rekka — 3 segments sliced from the 11-frame toji_Foword_slash_attack (44px/frame).
    reaper1:      { frames: 4, width: 44, sourceX: 0,   height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 0-3
    reaper2:      { frames: 4, width: 44, sourceX: 176, height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 4-7
    reaper3:      { frames: 3, width: 44, sourceX: 352, height: 44, speed: 3, sheet: "./toji_Foword_slash_attack.png" },   // frames 8-10 (finisher)
    // BLADE-STANCE command moves (Phase 5). Dash Strike = a 2-sheet chain: _1's crouch
    // wind-up (5 frames, left of the sheet) → _2's sprinting stab (6 frames). The move
    // swaps currentMove "dashStrike1"→"dashStrike2" at the active→recovery boundary
    // (abilities.js updateTojiStanceCombat), which sprite.js frame-resets on sheet change.
    // Rising Spiral = the aerial spinning finisher (dash_attack_4, full 9-frame arc).
    // Non-uniform _1 (narrow crouch + wide lunge) → slice ONLY the crouch here; the lunge
    // frames live in _2. Alpha-gutter verified (SLICE_* overlays).
    dashStrike1:  { frames: 5, width: 41, sourceX: 10, height: 61, speed: 3, anchorY: -7,  sheet: "./toji_sword_Dash_attack_1.png" },  // crouch wind-up (491x61, left 5f @41)
    dashStrike2:  { frames: 6, width: 71, sourceX: 0,  height: 55, speed: 3, anchorY: -10,  sheet: "./toji_sword_Dash_attack_2.png" },  // sprinting stab (428x55, 6f @71)
    risingSpiral: { frames: 9, width: 46, sourceX: 0,  height: 66, speed: 3, anchorY: -11, sheet: "./toji_sword_Dash_attack_4.png" },  // aerial spin ender (418x66, 9f @46)
    // CHAIN-STANCE normals (Phase 3). sourceX+true-pitch sliced (alpha-gutter verified).
    shortLash:  { frames: 3, width: 60, sourceX: 0, height: 62, speed: 3, anchorY: -8, sheet: "./toji_chain_of_1000_miles_attack_2.png" },        // 5A — TRIMMED to first 3 of 5 frames (the quick lash)
    wideArc:    { frames: 5, width: 66, sourceX: 2, height: 58, speed: 3, anchorY: -10, sheet: "./toji_chain_of_1000_miles_attack_1.png" },        // 5B (341x58, continuous arc → equal split)
    lowSweep:   { frames: 5, width: 81, sourceX: 8, height: 67, speed: 3, anchorY: -2, sheet: "./toji_chain_of_1000_miles_attack_3.png" },        // 6B (446x67)
    risingCoil: { frames: 4, width: 66, sourceX: 6, height: 61, speed: 3, anchorY: -6, sheet: "./toji_chain_of_1000_miles_upper_attack_1.png" },  // 2B anti-air (274x61)
    // GUN-STANCE firing animations (Phase 4). Ranged — the projectile carries the damage;
    // these are the fighter's shot/aim poses (played via the sprite-cast window). Sliced sourceX+pitch.
    snapShot:   { frames: 6, width: 39, sourceX: 4, height: 58, speed: 3, anchorY: -20, sheet: "./toji_gun_attack.png" },            // 5A (242x58, muzzle-flash present)
    aimedShot:  { frames: 7, width: 37, sourceX: 1, height: 52, speed: 3, anchorY: -8,  sheet: "./toji_idk.png" },                   // 5B feint (262x52, no muzzle flash)
    tracerRound:{ frames: 5, width: 60, sourceX: 1, height: 56, speed: 4, anchorY: 0,   sheet: "./toji_sword_Dash_attack_3.png" },   // 5C tracer (300x56, reclassified gun shot)
    // run/jump/fall/grab aren't on the supplied table, but a MANIFESTED character
    // can't fall back to the procedural box per-action (unmapped → idle sheet at
    // 128px = garbage), so reuse the closest real strips:
    // Polish (Task 3): run/jump/fall had no real strips and borrowed ATTACK rows,
    // which made plain locomotion play a sword sequence on loop. Fixes:
    //  • run  → reuse the fighting STANCE (row03), not the row06 sword dash-lunge,
    //    so sliding momentum (vx>10) doesn't draw the sword. The dash TECH still
    //    uses row06 via the `dash` slot.
    //  • jump/fall → hold the neutral STANCE (row03), NOT the row08 aerial-SWORD
    //    pose. row08 is a weapon attack; using it (even a single held frame) made a
    //    plain jump read as a sword pose. The real air attack (`air`) keeps row08's
    //    full 5-frame swing. FLAG: no true jump/fall art exists — a held stance is
    //    the least-wrong neutral option until a real jump strip is provided.
    run:      { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 5, loop: true, anchorY: -14, sheet: "./toji_walk.png" },  // reuse walk sheet, 7f pitch 34
    // JUMP SIZE FIX: the jump sheet's frame 0 (takeoff crouch) and frame 6 (land crouch)
    // draw the figure ~35px tall vs ~48px airborne — switching to them read as "sprite
    // gets smaller". Slice ONLY the airborne frames 1–5 (sourceX = 6 + 1×35 = 41), all
    // ~full height, so jump/fall never flash a shrunken crouch. Pitch 35 (was 37 → wobble).
    jump:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -36, sheet: "./toji_jump.png" },  // airborne arc only (no crouch)
    fall:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -36, sheet: "./toji_jump.png" },  // same airborne frames
    grab:     { frames: 6,  width: 47, height: 65, speed: 4, actionScale: 0.76, sheet: "./toji_row02_sheet.png" }   // throw anim — OLD punch art, scale-corrected (no new grab sprite yet)
    // UNMAPPED — chain / Inverted Spear of Heaven throw sequence (special not yet
    // wired). Register for future chain-special work; frame counts TBD (view to
    // slice): toji_row11_sheet.png 480×69, row12 540×69, row13 575×85,
    // row14 847×87, row15 424×78.
  }
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
    rasenshuriken_cast: { frames: 12, width: 51, height: 56, speed: 3, anchorY: 0, sheet: "./naruto_kcm_6_koma_body.png" }  // 6 KOMA A
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
  // (combat.js _getMD reads THIS `basic_attacks` — moveset.js has no naruto/toji/sasuke entry).
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
    upAttack: { type: "launcher", damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
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
    upAttack:  { type: "launcher", damage: 70, startup: 4, active: 3, recovery: 6, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); Thunderclap speedster
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
    upAttack:  { type: "launcher", damage: 74, startup: 6, active: 4, recovery: 8, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 12, launchVy: -12, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
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
    upAttack:  { type: "launcher", damage: 62, startup: 4, active: 3, recovery: 6, hitstun: 19, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); lowest HP, fragile speedster
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
    upAttack:  { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 7, hitstun: 18, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -11, selfVy: -6, airOK: false },
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
    upAttack:  { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 6, hitstun: 19, blockstun: 8, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },
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
  stats: { maxHealth: 1050, maxEnergy: 160, attack: 82, defense: 78, speed: 80, maxJumps: 2, jumpPower: 28, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  movement: { dashTeleport: true },   // Portal-Behind: double-tap toward opponent (shared teleport system, like Gojo/Sasuke)
  // ZONER identity: keep opponents out with Meeseeks / Rocket / Self-Destruct. Melee (light/heavy)
  // is deliberately BACKUP — lower damage and range than a brawler.
  basic_attacks: {
    light:     { damage: 34, startup: 5, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 62, rangeY: 46 },   // jab
    heavy:     { damage: 60, startup: 9, active: 4, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, rangeX: 74, rangeY: 50 },   // side kick (mid-weight)
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
  ultimate: { name: "Self-Destruct", cost: 140, description: "Instant proximity AOE blast — only connects if the opponent is close enough. Rick takes NO self-damage. Near-max meter cost." },
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
    omSwordRing:   { frames: 9,  width: 124, height: 109, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omega_ranger_sword_shash_ultimate_2_uniform.png" }
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
    omCombo2:   { frames: 6,  width: 134, height: 133, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./omni_man_ground_down_attack_uniform.png" },   // downward hook
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
    upAttack:  { type: "launcher", damage: 72, startup: 4, active: 3, recovery: 6, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); high-atk/low-HP glass cannon
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
    upAttack:  { type: "launcher", damage: 66, startup: 6, active: 4, recovery: 8, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -12, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
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
    upAttack:  { type: "launcher", damage: 70, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -12, selfVy: -9 },   // Up-Attack launcher (rising spin) — BALANCED archetype (Gojo ref)
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
    upAttack:  { type: "launcher", damage: 68, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10, launchVy: -11, selfVy: -8 }, // Up-Attack launcher (yellow crescent) — FAST/GLASS-CANNON archetype (Maki ref); low HP+DEF, high atk/spd
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
    upAttack: { type: "launcher", damage: 60, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); Godspeed assassin
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
    upAttack: { type: "launcher", damage: 50, startup: 4, active: 3, recovery: 5, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); fastest in game (SPD 99) → recovery −1
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
    upAttack: { type: "launcher", damage: 54, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -12, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref); BASE form. ⚑ Adult-Gon (giant) launch verified separately, see harness/up_attack_giant.mjs
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
    transform: { frames: 14, width: 80,  height: 220, speed: 4, anchorY: -2, actionScale: 0.42, loop: false, lockLastFrame: true, sourceY: 846, sheet: "./gon_atlas.png" },   // child→adult growth (cinematic pose)
    finalblow: { frames: 16, width: 105, height: 219, speed: 3, anchorY: -2, actionScale: 0.42, loop: false, lockLastFrame: true, sourceY: 1066, sheet: "./gon_atlas.png" }     // the sudden-death decisive strike
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
    upAttack: { type: "launcher", damage: 52, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -12, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref)
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
    batCombo1: { frames: 4, width: 127, height: 163, speed: 3, anchorY: 0,  loop: false, lockLastFrame: true, sheet: "./batman_combo1_uniform.png" },
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
    upAttack: { type: "launcher", damage: 62, startup: 6, active: 4, recovery: 8, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 11, launchVy: -12, selfVy: -9, airOK: false },   // Up-Attack launcher — BALANCED archetype (Gojo ref); trickster
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
    upAttack: { type: "launcher", damage: 56, startup: 5, active: 4, recovery: 10, hitstun: 20, knockbackX: 2, knockbackY: -11, launch: 14, launchVy: -14, selfVy: -9, airOK: false },   // Up-Attack launcher — HEAVY-TANK archetype (Toji ref +1 rec, heavier pop); HP 1450 powerhouse
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
    upAttack:  { type: "launcher", damage: 78, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 11, launchVy: -11, selfVy: -8, airOK: false },
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
    upAttack: { type: "launcher", damage: 54, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -11, selfVy: -8, airOK: false },   // Up-Attack launcher — FAST/GLASS-CANNON archetype (Maki ref); fragile fast rushdown stalker
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
// EXPORTS
// ─────────────────────────────────────────────────────────────────
export const characters = {
  goku, goku_black: gokuBlack, vegeta, piccolo, frieza, cell,
  gojo, megumi, sukuna, omololu, toji, maki, yuji,
  naruto, sasuke, itachi, tobirama, minato, madara, obito, tobi,
  zenitsu, rengoku, shinobu, inosuke, nezuko,
  rick, morty, evilMorty, rickPrime,
  beerus,
  ben10, albedo,
  omniman: omniMan,
  omega_ranger: omegaRanger,
  samurai_red_ranger: samuraiRedRanger,
  gold_samurai_ranger: goldSamuraiRanger,
  green_samurai_ranger: greenSamuraiRanger,
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
  miwa,
  ichigo,
  zaraki,
  zaraki_shikai: zarakiShikai
}

// The 7 characters shown in the starter roster select screen
export const starterRoster = [goku, naruto, gojo, megumi, sukuna, omololu, toji]

// Full flat list
export const characterList = Object.values(characters)

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
