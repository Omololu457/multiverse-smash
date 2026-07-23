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
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
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
    ssj3:          { damageMultiplier: 1.5, speedMultiplier: 1.2, defenseMultiplier: 1.05, kiDrainPerSecond: 5, duration: 900 },
    ssblue:        { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ultraInstinct: { damageMultiplier: 2.5, speedMultiplier: 2, defenseMultiplier: 1.5, autoDodge: true, autoDodgeKiCost: 10, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
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
    upAttack:  { type: "launcher", damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 12 },   // up_attack uppercut launcher
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
    ssblue:       { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.2, kiDrainPerSecond: 8, isSpecial: true, duration: 720 },
    ssbEvolution: { damageMultiplier: 2.3, speedMultiplier: 1.5, defenseMultiplier: 1.25, kiDrainPerSecond: 10, isSpecial: true, duration: 600 },
    ultraEgo:     { damageMultiplier: 2.5, speedMultiplier: 1.8, defenseMultiplier: 0.9, rageHealOnHit: 15, healCostPerHitKi: 6, kiDrainPerSecond: 12, isSpecial: true, duration: 480 }
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
  rosterKey: "piccolo", name: "Piccolo", universe: "dragon_ball",
  archetypes: ["melee", "ranged"],
  primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "control", animeMovement: true },
  stats: { maxHealth: 1100, maxEnergy: 160, attack: 84, defense: 86, speed: 80, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 45 },
  basic_attacks: {
    light:     { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 9, active: 4, recovery: 19, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 60, startup: 8, active: 4, recovery: 16, hitstun: 18, knockbackX: 2, knockbackY: -7 },
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
  rosterKey: "frieza", name: "Frieza", universe: "dragon_ball",
  archetypes: ["melee", "ranged"],
  primary: "ranged", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1200, maxEnergy: 170, attack: 90, defense: 84, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 9, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
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
    goldenFrieza: { damageMultiplier: 2, speedMultiplier: 1.5, defenseMultiplier: 1.2, kiDrainPerSecond: 6, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const cell = {
  rosterKey: "cell", name: "Cell", universe: "dragon_ball",
  archetypes: ["melee", "absorb"],
  primary: "melee", secondary: ["absorb"],
  traits: { hasEnergy: true, energyType: "ki", mobility: "medium", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1300, maxEnergy: 170, attack: 94, defense: 90, speed: 82, maxJumps: 2, jumpPower: 30, dashSpeed: 14, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 95, startup: 9, active: 4, recovery: 19, hitstun: 19, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
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
    perfectCell: { damageMultiplier: 2, speedMultiplier: 1.4, defenseMultiplier: 1.3, kiDrainPerSecond: 5, isSpecial: true, duration: 720 }
  },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// JUJUTSU KAISEN
// ─────────────────────────────────────────────────────────────────
const gojo = {
  rosterKey: "gojo", name: "Gojo Satoru", universe: "jujutsu_kaisen",
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
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
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
    ultimate:           { frames: 3, width: 39, height: 64, speed: 6, sheet: "./gojo_ultimate_sheet.png" },
    domain:             { frames: 4, width: 37, height: 64, speed: 6, sheet: "./gojo_domain_sheet.png" },  // Unlimited Void HAND-SIGN (NOT the gojo_intro coat-throw)
    blue_cast:          { frames: 5, width: 50, height: 64, speed: 5, sheet: "./gojo_max_output_blue_sheet.png" },
    red_cast:           { frames: 5, width: 56, height: 62, speed: 5, sheet: "./gojo_ctr_attack_sheet.png" },
    hollow_purple_cast: { frames: 4, width: 43, height: 63, speed: 5, sheet: "./gojo_hollowpurple_release_sheet.png" },
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
    name: "Mahoraga Ritual", cost: 100, permanent: true, oneWay: true, deathRitual: true,
    disableSpecials: ["divineDogs","nue","toad","rabbitEscape","maxElephant"],
    effect: "Permanently transforms Megumi into Mahoraga in-place"
  },
  mahoragaStats: { name: "Mahoraga", maxHealth: 1600, damageMultiplier: 1.5, speedMultiplier: 0.9, defenseMultiplier: 1.35, color: "#7c3aed", maxAdaptationLevel: 3 },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  hasSprites: true,
  spriteScale: 1.7,   // source frames ~55–61px tall → ×1.7 ≈ hitbox height
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
  rosterKey: "omololu", name: "Omololu", universe: "original",
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
    upAttack:  { damage: 72, startup: 6, active: 4, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -9 },
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
  spriteScale: 2.3,
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
    walk:     { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 6, loop: true, anchorY: -12, sheet: "./toji_walk.png" },  // 7f (re-verified, was mis-counted 6), pitch 34 (was 40)
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
    dash:     { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 4, loop: true, anchorY: -12, sheet: "./toji_walk.png" },
    // KEY MUST BE `guard` (not `block`): sprite.js resolves blocking to animationData.guard —
    // the old `block` key never rendered (Toji showed idle while blocking). Renamed + scale-corrected.
    guard:    { frames: 9,  width: 37, height: 70, speed: 6, actionScale: 0.70, sheet: "./toji_row10_sheet.png" },  // OLD guard art (no new block sprite yet)
    hurt:     { frames: 8,  width: 48, sourceX: 0, height: 54, speed: 5, anchorY: -7,  sheet: "./toji_hit.png" },  // 8f, content fills width (pitch 48 exact)
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
    introWalkIn: { frames: 17, width: 30, sourceX: 3, height: 45, speed: 5, loop: false, lockLastFrame: true, anchorY: -7, sheet: "./toji_intro_first_part.png" },   // walk-in, pitch 30 + srcX 3
    introReady:  { frames: 15, width: 35, sourceX: 2, height: 47, speed: 4, loop: false, lockLastFrame: true, anchorY: 0,  sheet: "./toji_intro_second_part.png" },  // ready-up, pitch 35 + srcX 2
    // BLADE-STANCE normals (Phase 2). action key == the move name so sprite.js resolves it
    // directly. Sliced sourceX+true-pitch (alpha-gutter verified). Attack `speed` is auto-fit
    // to the move's duration by sprite.updateFrames, so it just needs frames/width/sourceX.
    quickDraw:    { frames: 5, width: 44, sourceX: 3, height: 60, speed: 3, anchorY: -12, sheet: "./toji_sword_attack_1.png" },       // 5A Quick Draw (230x60)
    forwardSlash: { frames: 5, width: 54, sourceX: 9, height: 45, speed: 3, anchorY: -9,  sheet: "./toji_foward_slash_2.png" },       // 5B Forward Slash (286x45)
    skywardCut:   { frames: 5, width: 45, sourceX: 0, height: 55, speed: 3, anchorY: -9,  sheet: "./toji_up_attack.png" },            // 2C Skyward Cut launcher (225x55)
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
    dashStrike1:  { frames: 5, width: 41, sourceX: 10, height: 61, speed: 3, anchorY: -6,  sheet: "./toji_sword_Dash_attack_1.png" },  // crouch wind-up (491x61, left 5f @41)
    dashStrike2:  { frames: 6, width: 71, sourceX: 0,  height: 55, speed: 3, anchorY: -9,  sheet: "./toji_sword_Dash_attack_2.png" },  // sprinting stab (428x55, 6f @71)
    risingSpiral: { frames: 9, width: 46, sourceX: 0,  height: 66, speed: 3, anchorY: -10, sheet: "./toji_sword_Dash_attack_4.png" },  // aerial spin ender (418x66, 9f @46)
    // CHAIN-STANCE normals (Phase 3). sourceX+true-pitch sliced (alpha-gutter verified).
    shortLash:  { frames: 3, width: 60, sourceX: 0, height: 62, speed: 3, anchorY: -7, sheet: "./toji_chain_of_1000_miles_attack_2.png" },        // 5A — TRIMMED to first 3 of 5 frames (the quick lash)
    wideArc:    { frames: 5, width: 66, sourceX: 2, height: 58, speed: 3, anchorY: -9, sheet: "./toji_chain_of_1000_miles_attack_1.png" },        // 5B (341x58, continuous arc → equal split)
    lowSweep:   { frames: 5, width: 81, sourceX: 8, height: 67, speed: 3, anchorY: -2, sheet: "./toji_chain_of_1000_miles_attack_3.png" },        // 6B (446x67)
    risingCoil: { frames: 4, width: 66, sourceX: 6, height: 61, speed: 3, anchorY: -5, sheet: "./toji_chain_of_1000_miles_upper_attack_1.png" },  // 2B anti-air (274x61)
    // GUN-STANCE firing animations (Phase 4). Ranged — the projectile carries the damage;
    // these are the fighter's shot/aim poses (played via the sprite-cast window). Sliced sourceX+pitch.
    snapShot:   { frames: 6, width: 39, sourceX: 4, height: 58, speed: 3, anchorY: -18, sheet: "./toji_gun_attack.png" },            // 5A (242x58, muzzle-flash present)
    aimedShot:  { frames: 7, width: 37, sourceX: 1, height: 52, speed: 3, anchorY: -7,  sheet: "./toji_idk.png" },                   // 5B feint (262x52, no muzzle flash)
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
    run:      { frames: 7,  width: 34, sourceX: 4, height: 48, speed: 5, loop: true, anchorY: -12, sheet: "./toji_walk.png" },  // reuse walk sheet, 7f pitch 34
    // JUMP SIZE FIX: the jump sheet's frame 0 (takeoff crouch) and frame 6 (land crouch)
    // draw the figure ~35px tall vs ~48px airborne — switching to them read as "sprite
    // gets smaller". Slice ONLY the airborne frames 1–5 (sourceX = 6 + 1×35 = 41), all
    // ~full height, so jump/fall never flash a shrunken crouch. Pitch 35 (was 37 → wobble).
    jump:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -32, sheet: "./toji_jump.png" },  // airborne arc only (no crouch)
    fall:     { frames: 5,  width: 35, sourceX: 41, height: 64, speed: 5, anchorY: -32, sheet: "./toji_jump.png" },  // same airborne frames
    grab:     { frames: 6,  width: 47, height: 65, speed: 4, actionScale: 0.76, sheet: "./toji_row02_sheet.png" }   // throw anim — OLD punch art, scale-corrected (no new grab sprite yet)
    // UNMAPPED — chain / Inverted Spear of Heaven throw sequence (special not yet
    // wired). Register for future chain-special work; frame counts TBD (view to
    // slice): toji_row11_sheet.png 480×69, row12 540×69, row13 575×85,
    // row14 847×87, row15 424×78.
  }
}

const mahoraga = {
  rosterKey: "mahoraga", name: "Mahoraga", universe: "jujutsu_kaisen",
  // NOT selectable — Mahoraga is the form Megumi becomes via her ultimate
  // (abilities.js transformIntoMahoraga reads this block as characters.mahoraga).
  // `hidden` excludes it from character-select / move-list / fallback.
  hidden: true,
  archetypes: ["melee", "adaptation"],
  primary: "melee", secondary: ["adaptation"],
  traits: { hasEnergy: false, energyType: "none", mobility: "medium", scaling: "adaptation", animeMovement: true },
  stats: { maxHealth: 1600, maxEnergy: 0, attack: 104, defense: 100, speed: 82, maxJumps: 1, jumpPower: 28, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 60 },
  basic_attacks: {
    light:     { damage: 65, startup: 5, active: 4, recovery: 12, hitstun: 15, knockbackX: 5, knockbackY: 0 },
    heavy:     { damage: 120, startup: 11, active: 5, recovery: 22, hitstun: 22, knockbackX: 9, knockbackY: 1 },
    upAttack:  { damage: 90, startup: 10, active: 5, recovery: 20, hitstun: 24, knockbackX: 3, knockbackY: -10 },
    airAttack: { damage: 75, startup: 7, active: 4, recovery: 14, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 100, startup: 11, active: 5, recovery: 18, hitstun: 22, knockbackX: 1, knockbackY: 12 }
  },
  specials: {
    wheelRotation: { cost: 0, damage: 180, startup: 18, active: 6, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "divine wheel slash" },
    adaptation:    { cost: 0, damage: 0, startup: 1, active: 1, recovery: 1, hitstun: 0, knockbackX: 0, knockbackY: 0, effect: "passive: adapts to attack types each time hit" }
  },
  ultimate: { name: "Eight-Handled Wheel", cost: 0, duration: -1, effect: "Adaptation stacks permanently" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1, permanent: true } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// NARUTO
// ─────────────────────────────────────────────────────────────────
const naruto = {
  rosterKey: "naruto", name: "Naruto", universe: "naruto",
  portrait: "./naruto_kcm_portrait.png",   // KCM mugshot bust sliced from naruto_kcm_mugshot_lifebars.png (lifebar strips excluded)
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
    sageMode:   { damageMultiplier: 1.4, speedMultiplier: 1.2, defenseMultiplier: 1.2, kiDrainPerSecond: 4, duration: 1080 },
    kcmMode:    { damageMultiplier: 1.8, speedMultiplier: 1.5, defenseMultiplier: 1.1, kiDrainPerSecond: 7, isSpecial: true, duration: 840 },
    baryonMode: { damageMultiplier: 2.8, speedMultiplier: 2, defenseMultiplier: 0.8, kiDrainPerSecond: 20, isSpecial: true, duration: 360 }
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
  spriteScale: 2.1,
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
    walk:     { frames: 8, width: 56, height: 53, speed: 5, anchorY: -10, sheet: "./sasuke_running.png" },
    run:      { frames: 8, width: 56, height: 53, speed: 4, anchorY: -10, sheet: "./sasuke_running.png" },
    // jump/fall — sasuke_jump.png. MEASURED 406×78 → 8 frames (transparent-gutter verified) @ 51px
    // pitch (406/8=50.8). The arc is crouch→rise→peak→descend→land, so split like Naruto's jump:
    // jump = rise half (cells 0–3, sourceX 0), fall = descend half (cells 4–7, sourceX 4×51=204).
    // Without these keys sprite.js used the 128×128 _FALLBACK and sliced garbage. speed 6 = roster
    // jump baseline (Gojo/Sukuna/Naruto). anchorY -15 = -(7px bottom gap × 2.1).
    jump:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -15, sourceX: 0,   sheet: "./sasuke_jump.png" },
    fall:     { frames: 4, width: 51, height: 78, speed: 6, anchorY: -15, sourceX: 204, sheet: "./sasuke_jump.png" },
    dash:     { frames: 2, width: 66, height: 49, speed: 5, anchorY: -13, sheet: "./sasuke_dash.png" },            // 131×49 → 2×(66×49), 6px bottom gap
    hurt:     { frames: 4, width: 53, height: 57, speed: 6, anchorY: -6,  sheet: "./sasuke_damage.png" },          // 211×57 → 4×(53×57), 3px bottom gap
    light:    { frames: 9, width: 68, height: 71, speed: 2, anchorY: -36, sheet: "./sasuke_foward_attack.png" },   // 611×71 → 9×(68×71), 17px bottom gap (feet high in cell)
    heavy:    { frames: 8, width: 61, height: 63, speed: 4, anchorY: -21, sheet: "./sasuke_foword_sword_attack_2.png" }, // 490×63 → 8×(61×63) clean sword-thrust combo (re-slice verified; replaced dash_attack whose thrust blade tore across cells)
    up:       { frames: 9, width: 58, height: 60, speed: 3, anchorY: -10, sheet: "./sasuke_up_attack.png" },       // 527×60 → 9×(58×60) gap-scanned; launcher swing. anchorY -10 = -(5px botGap ×2.1)
    down_air: { frames: 6, width: 50, height: 62, speed: 4, anchorY: -6,  sheet: "./sasuke_down_attack.png" },     // 298×62 → 6×(50×62)
    air:      { frames: 6, width: 68, height: 83, speed: 3, anchorY: -12, sheet: "./sasuke_jump_attack.png" },     // 409×83 → 6×(68×83) aerial spin-slash (neutral J in air)
    // Shuriken THROW pose — plays via _spriteCastMove while the shuriken projectile flies (air+heavy poke).
    shurikenThrow: { frames: 2, width: 57, height: 56, speed: 4, anchorY: -8, loop: false, lockLastFrame: true, sheet: "./sasuke_throwing_shuriken.png" }, // 114×56 → 2×(57×56)
    // Chidori Koiten windup→discharge pose (qcb+Special). REPACKED to uniform 54px cells (raw sheet
    // was non-uniformly packed + a detached "CHIDORI KOITEN" label band). speed 4 → windup frames
    // fill the 16f startup, discharge frames land on the active burst. anchorY -6 = -(3px botGap ×2.1).
    chidoriKoiten: { frames: 7, width: 54, height: 73, speed: 4, anchorY: -6, loop: false, lockLastFrame: true, sheet: "./sasuke_CHIDORI_KOITEN_attack.png" },
    // ── PHASE 3a: pre-match INTRO POOL. game.js picks one of `introPool` at random each match
    // (see pickIntroVariant); sprite.js plays it while _introPlaying is set. loop:false +
    // lockLastFrame → each plays ONCE then holds its final pose, snapping cleanly to idle when
    // the fight starts. Cell width = sheetW / real-frame-count (keeps the true pitch); anchorY =
    // -(bottom gap × 2.1). NOTE: `intro` plays only the first 6 of sasuke_intro.png's 9 cells —
    // this deliberately EXCLUDES the wire/kunai-throw action (cells ~6–8), which is a combat move,
    // not an idle intro. Those frames stay in the file for a possible future "wire kunai" move.
    // `intro` (sasuke_intro.png) is EXCLUDED from introPool below — kept for reference only.
    // Its only clean "settled fighting stance" frame is the LAST cell (8), which sits AFTER the
    // kunai-wire combat action (cells 6–7). The engine plays cells sequentially and can't skip the
    // wire, so trimming the wire (required — a combat action shouldn't play in an intro) forces the
    // hold onto a mid-motion arm-point pose (cell 5) that doesn't read as an arrival stance. It's
    // also thematically redundant with introCloakAlt. Re-enable only if the sheet is re-sliced to
    // separate the wire, freeing the settled stance.
    intro:         { frames: 6, width: 57, height: 63, speed: 6, anchorY: -15, loop: false, lockLastFrame: true, sheet: "./sasuke_intro.png"   },
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
// DEMON SLAYER
// ─────────────────────────────────────────────────────────────────
const tanjiro = {
  rosterKey: "tanjiro", name: "Tanjiro Kamado", universe: "demon_slayer",
  archetypes: ["melee", "breathing"],
  primary: "melee", secondary: ["breathing"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "versatile", animeMovement: true },
  stats: { maxHealth: 1100, maxEnergy: 0, attack: 86, defense: 82, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 75, startup: 8, active: 4, recovery: 14, hitstun: 17, knockbackX: 1, knockbackY: 9 },
    grab:      { damage: 28, startup: 6, active: 3, recovery: 13, hitstun: 18, throwForceX: 4, throwForceY: -3 }
  },
  specials: {
    waterSurfaceSlasher: { cost: 0, damage: 120, startup: 11, active: 4, recovery: 20, hitstun: 21, knockbackX: 8, knockbackY: -1, effect: "sweeping water blade" },
    danceOfTheFireflies: { cost: 0, damage: 100, startup: 9, active: 6, recovery: 18, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "rapid multi-slash attack" }
  },
  ultimate: { name: "Hinokami Kagura", cost: 0, duration: 8, effect: "Flame transformation" },
  transformationOrder: ["base","hinokamiKagura"],
  transformations: {
    base:           { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    hinokamiKagura: { damageMultiplier: 1.6, speedMultiplier: 1.3, defenseMultiplier: 0.9, duration: 900 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const nezuko = {
  rosterKey: "nezuko", name: "Nezuko Kamado", universe: "demon_slayer",
  archetypes: ["melee", "demon"],
  primary: "melee", secondary: ["demon"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1050, maxEnergy: 0, attack: 82, defense: 78, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: {
    light:     { damage: 40, startup: 4, active: 3, recovery: 9, hitstun: 11, knockbackX: 2, knockbackY: 0 },
    heavy:     { damage: 80, startup: 7, active: 4, recovery: 16, hitstun: 17, knockbackX: 5, knockbackY: 1 },
    upAttack:  { damage: 65, startup: 6, active: 4, recovery: 15, hitstun: 19, knockbackX: 2, knockbackY: -7 },
    airAttack: { damage: 55, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 70, startup: 8, active: 4, recovery: 13, hitstun: 16, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    bloodDemonArt:  { cost: 0, damage: 140, startup: 12, active: 5, recovery: 21, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "explosive demonic attack" },
    explodingBlood: { cost: 0, damage: 95,  startup: 9,  active: 5, recovery: 17, hitstun: 18, knockbackX: 6, knockbackY: -1, effect: "close-range blood detonation" },
    demonLunge:     { cost: 0, damage: 80,  startup: 7,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "pouncing claw rush" }
  },
  ultimate: { name: "Full Demon Transformation", cost: 0, duration: 8, effect: "Increased speed, damage, and regeneration" },
  transformationOrder: ["base","fullDemon"],
  transformations: {
    base:      { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    fullDemon: { damageMultiplier: 1.7, speedMultiplier: 1.4, defenseMultiplier: 0.85, duration: 14 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const zenitsu = {
  rosterKey: "zenitsu", name: "Zenitsu Agatsuma", universe: "demon_slayer",
  archetypes: ["melee", "speed"],
  primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: false, energyType: "none", mobility: "very_high", scaling: "burst", animeMovement: true },
  stats: { maxHealth: 1000, maxEnergy: 0, attack: 88, defense: 74, speed: 96, maxJumps: 2, jumpPower: 30, dashSpeed: 20, dashDuration: 8, dashCooldownMax: 35 },
  basic_attacks: {
    light:     { damage: 50, startup: 3, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 7, active: 3, recovery: 16, hitstun: 19, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 6, active: 3, recovery: 14, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 4, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 7, active: 3, recovery: 12, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    thunderClapStrike: { cost: 0, damage: 150, startup: 8, active: 4, recovery: 18, hitstun: 25, knockbackX: 10, knockbackY: -2, effect: "instant high-speed lightning attack" },
    sixfold:           { cost: 0, damage: 95,  startup: 6, active: 6, recovery: 16, hitstun: 16, knockbackX: 5,  knockbackY: -1, effect: "stationary multi-strike thunderclap volley" },
    godspeed:          { cost: 0, damage: 80,  startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 5,  knockbackY: -1, subtype: "mobility", dashSpeed: 26, effect: "flash-step that crosses the screen" }
  },
  ultimate: { name: "Thunder Breathing Mastery", cost: 0, duration: 6, effect: "Extreme speed, multi-strike combos, high crit chance" },
  transformationOrder: ["base","sleepingThunder"],
  transformations: {
    base:            { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    sleepingThunder: { damageMultiplier: 1.8, speedMultiplier: 1.6, defenseMultiplier: 0.8, duration: 10 }
  },
  animationData: { ...DEFAULT_ANIM }
}

const inosuke = {
  rosterKey: "inosuke", name: "Inosuke Hashibira", universe: "demon_slayer",
  archetypes: ["melee", "berserk"],
  primary: "melee", secondary: ["berserk"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1080, maxEnergy: 0, attack: 87, defense: 80, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 45, startup: 4, active: 3, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 85, startup: 8, active: 4, recovery: 17, hitstun: 18, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 15, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 65, startup: 5, active: 3, recovery: 9, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 75, startup: 8, active: 4, recovery: 13, hitstun: 17, knockbackX: 1, knockbackY: 9 }
  },
  specials: {
    dualSwordFrenzy: { cost: 0, damage: 140, startup: 10, active: 6, recovery: 20, hitstun: 23, knockbackX: 8, knockbackY: -1, effect: "spinning multi-slash attack" },
    piercingFang:    { cost: 0, damage: 90,  startup: 8,  active: 4, recovery: 16, hitstun: 16, knockbackX: 5, knockbackY: 0,  effect: "low erratic stab under highs" },
    beastPounce:     { cost: 0, damage: 85,  startup: 7,  active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "feral leaping double-slash" }
  },
  ultimate: { name: "Beast Breathing Dragon Head", cost: 0, duration: 8, effect: "Massive speed and attack boost, unpredictable combo patterns" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const rengoku = {
  rosterKey: "rengoku", name: "Kyojuro Rengoku", universe: "demon_slayer",
  archetypes: ["melee", "flame"],
  primary: "melee", secondary: ["flame"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "constant_pressure", animeMovement: true },
  stats: { maxHealth: 1150, maxEnergy: 0, attack: 92, defense: 84, speed: 88, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 90, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 6, knockbackY: 1 },
    upAttack:  { damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 60, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 80, startup: 8, active: 4, recovery: 14, hitstun: 18, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    flameBreathingFirstForm: { cost: 0, damage: 150, startup: 11, active: 5, recovery: 21, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "fiery single slash" },
    risingScorchingSun:      { cost: 0, damage: 95,  startup: 9,  active: 4, recovery: 17, hitstun: 20, knockbackX: 3,  knockbackY: -8, effect: "upward flame arc that pops up" },
    flameTiger:              { cost: 0, damage: 110, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 8,  knockbackY: -1, subtype: "mobility", dashSpeed: 22, effect: "charging beast of flame" }
  },
  ultimate: { name: "Flame Pillar's Might", cost: 0, duration: 8, effect: "Enhanced attack, speed, and fiery AoE strikes" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const akaza = {
  rosterKey: "akaza", name: "Akaza", universe: "demon_slayer",
  archetypes: ["melee", "demon"],
  primary: "melee", secondary: ["demon"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "ramp", animeMovement: true },
  stats: { maxHealth: 1250, maxEnergy: 0, attack: 96, defense: 88, speed: 90, maxJumps: 2, jumpPower: 30, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: {
    light:     { damage: 50, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 100, startup: 9, active: 4, recovery: 19, hitstun: 20, knockbackX: 7, knockbackY: 1 },
    upAttack:  { damage: 75, startup: 8, active: 4, recovery: 17, hitstun: 21, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 90, startup: 9, active: 4, recovery: 15, hitstun: 19, knockbackX: 1, knockbackY: 10 }
  },
  specials: {
    destructiveStrike: { cost: 0, damage: 160, startup: 12, active: 5, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -2, effect: "powerful destructive attack" },
    annihilationType:  { cost: 0, damage: 105, startup: 11, active: 6, recovery: 20, hitstun: 20, knockbackX: 7,  knockbackY: -2, effect: "compass-needle ground shockwaves" },
    disorder:          { cost: 0, damage: 90,  startup: 8,  active: 5, recovery: 16, hitstun: 16, knockbackX: 6,  knockbackY: -1, subtype: "mobility", dashSpeed: 24, effect: "rushing accelerating flurry" }
  },
  ultimate: { name: "Upper Moon Three Form", cost: 0, duration: 8, effect: "Increased damage, speed, and regeneration" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
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
  rosterKey: "morty", name: "Morty Smith", universe: "rick_and_morty",
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
  rosterKey: "evilMorty", name: "Evil Morty", universe: "rick_and_morty",
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
  rosterKey: "rickPrime", name: "Rick Prime", universe: "rick_and_morty",
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
  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "omnitrix", mobility: "high", scaling: "burst" },
  passive: { name: "Omnitrix", effect: "Press the transform/charge button to cycle through 5 aliens, each with its own moveset" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  basic_attacks: {
    light:     { damage: 53, startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 106, startup: 11, active: 5, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 85, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 6, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 98, startup: 10, active: 4, recovery: 16, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {},
  ultimate: { name: "Omnitrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
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
  // idle content ~52px × 2.0 ≈ 104px on-screen — mid roster range (Toji 101, Gojo 112).
  spriteScale: 2.0,
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
// ALBEDO  (Ben's clone — Ultimatrix)
// Mechanically identical to Ben 10: same alien roster + same energy/transform
// system (see fighters.js setupBen10 / updateTransformDevice). This entry just
// makes Albedo SELECTABLE and flags him as the clone so the device/draw code
// gives him his own red "Negative" identity. physics.js auto-runs setupBen10()
// for rosterKey "albedo" the same way it does for "ben10".
// ─────────────────────────────────────────────────────────────────
const albedo = {
  rosterKey: "albedo", name: "Albedo", universe: "ben_10",
  isAlbedo: true, deviceType: "ultimatrix",
  spriteSheet: "sprites/albedo/albedo_atlas.png",   // deferred art — SpriteHandler falls back to procedural
  archetypes: ["transformations", "melee"],
  primary: "transformations", secondary: ["melee"],
  traits: { hasEnergy: true, energyType: "ultimatrix", mobility: "high", scaling: "burst" },
  passive: { name: "Ultimatrix", effect: "Same as the Omnitrix — cycle aliens; the form drains energy and force-reverts to human at zero" },
  stats: { maxHealth: 1250, maxEnergy: 100, attack: 90, defense: 85, speed: 5, maxJumps: 1, jumpPower: 19, dashSpeed: 15, dashDuration: 8, dashCooldownMax: 30 },
  basic_attacks: {
    light:     { damage: 53, startup: 6, active: 3, recovery: 12, hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:     { damage: 106, startup: 11, active: 5, recovery: 20, hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: true },
    upAttack:  { damage: 85, startup: 9, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: -8 },
    airAttack: { damage: 70, startup: 6, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: -2 },
    downAir:   { damage: 98, startup: 10, active: 4, recovery: 16, hitstun: 18, knockbackX: 1, knockbackY: 11 },
    grab:      { damage: 30, startup: 6, active: 3, recovery: 14, hitstun: 20, throwForceX: 5, throwForceY: -4 }
  },
  specials: {},
  ultimate: { name: "Ultimatrix Overload", cost: 100, duration: 8, effect: "Active alien's ultimate" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

// ─────────────────────────────────────────────────────────────────
// INVINCIBLE — Viltrumites
// Always base form (NO energy/transform system). Pure stats: overwhelming power
// tied to slow startup + punishable recovery + high knockback so they're strong
// but beatable. maxEnergy 0 → all specials cost 0 (raw power, like Toji).
// ─────────────────────────────────────────────────────────────────
const omniMan = {
  rosterKey: "omniman", name: "Omni-Man", universe: "invincible",
  archetypes: ["melee", "flight"],
  primary: "melee", secondary: ["flight"],
  traits: { hasEnergy: false, energyType: "none", mobility: "high", scaling: "damage", animeMovement: false },
  passive: { name: "Viltrumite Physiology", effect: "Superhuman strength and flight — high air mobility and knockback" },
  stats: { maxHealth: 1400, maxEnergy: 0, attack: 98, defense: 88, speed: 90, maxJumps: 3, jumpPower: 36, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: {
    light:     { damage: 50, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 120, startup: 13, active: 5, recovery: 26, hitstun: 22, knockbackX: 11, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 92, startup: 10, active: 4, recovery: 20, hitstun: 22, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 78, startup: 6, active: 3, recovery: 12, hitstun: 15, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 105, startup: 11, active: 4, recovery: 18, hitstun: 20, knockbackX: 2, knockbackY: 13 },
    grab:      { damage: 36, startup: 6, active: 3, recovery: 15, hitstun: 22, throwForceX: 7, throwForceY: -5 }
  },
  specials: {
    flightSlam:    { cost: 0, damage: 150, startup: 14, active: 5, recovery: 28, hitstun: 28, knockbackX: 13, knockbackY: -4, effect: "soaring slam — huge knockback, very punishable on whiff" },
    skeweringRush: { cost: 0, damage: 130, startup: 11, active: 5, recovery: 24, hitstun: 24, knockbackX: 12, knockbackY: -2, subtype: "mobility", dashSpeed: 22, effect: "flying tackle across the screen" }
  },
  ultimate: { name: "Viltrumite Onslaught", cost: 0, duration: 8, effect: "Relentless flying assault: heavy damage and knockback surge" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

const thragg = {
  rosterKey: "thragg", name: "Thragg", universe: "invincible",
  archetypes: ["melee", "grappler"],
  primary: "melee", secondary: ["grappler"],
  traits: { hasEnergy: false, energyType: "none", mobility: "low", scaling: "damage", animeMovement: false },
  passive: { name: "Warlord's Might", effect: "Strongest and toughest Viltrumite — top-tier power but the slowest mover" },
  stats: { maxHealth: 1600, maxEnergy: 0, attack: 106, defense: 95, speed: 76, maxJumps: 1, jumpPower: 26, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 54 },
  basic_attacks: {
    light:     { damage: 55, startup: 6, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 132, startup: 15, active: 5, recovery: 30, hitstun: 24, knockbackX: 12, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 100, startup: 12, active: 5, recovery: 22, hitstun: 24, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 86, startup: 7, active: 4, recovery: 14, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 116, startup: 12, active: 5, recovery: 20, hitstun: 22, knockbackX: 2, knockbackY: 14 },
    grab:      { damage: 44, startup: 6, active: 3, recovery: 16, hitstun: 24, throwForceX: 8, throwForceY: -5 }
  },
  specials: {
    crushingGrip: { cost: 0, damage: 175, startup: 12, active: 4, recovery: 30, hitstun: 30, knockbackX: 6, knockbackY: -4, subtype: "command_grab", rangeX: 70, superArmor: true, effect: "armored command grab — massive close-range damage, slow recovery" },
    warHammerBlow:{ cost: 0, damage: 150, startup: 14, active: 5, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, effect: "two-fisted overhead smash" }
  },
  ultimate: { name: "Conqueror's Verdict", cost: 0, duration: 8, effect: "Unstoppable assault: max damage and armor, devastating throws" },
  transformationOrder: ["base"],
  transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  animationData: { ...DEFAULT_ANIM }
}

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

const gon = {
  rosterKey: "gon", name: "Gon Freecss", universe: "hunter_x_hunter", color: "#16a34a",
  archetypes: ["melee", "transformations"], primary: "melee", secondary: ["transformations"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Enhancer", effect: "Strong, straightforward strikes; can tap into Adult Gon at the cost of all his nen" },
  stats: { maxHealth: 1150, maxEnergy: 120, attack: 90, defense: 84, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS, heavy: { damage: 92, startup: 8, active: 4, recovery: 18, hitstun: 19, knockbackX: 7, knockbackY: 1 } },
  specials: {
    rockSmash:   { cost: 25, damage: 120, startup: 12, active: 5, recovery: 20, hitstun: 24, knockbackX: 9, knockbackY: -2, effect: "charged enhancer punch" },
    paperToss:   { cost: 20, damage: 90,  startup: 9,  active: 4, recovery: 16, hitstun: 16, knockbackX: 6, knockbackY: -1, rangeX: 170, effect: "ranged nen disc" }
  },
  ultimate: { name: "First Comes Rock", cost: 100, duration: 8, effect: "Huge committed nen smash" },
  // Phase 2 — Adult Gon reuses the standard transformation energy system
  // (transformations.js): large nen cost to enter, drains fast while active,
  // health/strength spike, and FORCE-REVERTS to base Gon when nen hits zero.
  // All values below are the tunable knobs.
  transformationOrder: ["base", "adultGon"],
  transformations: {
    base:     { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 },
    adultGon: {
      cost: 60,                // large nen cost to transform
      kiDrainPerSecond: 24,    // drains fast while active
      revertOnEmpty: true,     // force-revert to base Gon at zero nen
      reusable: true,          // can transform again once nen is rebuilt
      healthMultiplier: 1.4,   // health spike
      damageMultiplier: 1.9, speedMultiplier: 1.3, defenseMultiplier: 1.25,
      isSpecial: true, duration: 12
    }
  },
  spriteSheets: { ...hxhSheets("gon"), adult: hxhSheets("adult_gon") },
  animationData: { ...DEFAULT_ANIM }
}

const killua = {
  rosterKey: "killua", name: "Killua Zoldyck", universe: "hunter_x_hunter", color: "#38bdf8",
  archetypes: ["melee", "speed"], primary: "melee", secondary: ["speed"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "very_high", scaling: "rushdown", animeMovement: true },
  passive: { name: "Godspeed", effect: "Fastest fighter — rapid attacks and an electric dash, but fragile" },
  stats: { maxHealth: 1000, maxEnergy: 130, attack: 86, defense: 78, speed: 98, maxJumps: 3, jumpPower: 34, dashSpeed: 24, dashDuration: 8, dashCooldownMax: 28 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 42, startup: 3, active: 2, recovery: 8, hitstun: 12, knockbackX: 3, knockbackY: 0 }, airAttack: { damage: 56, startup: 4, active: 2, recovery: 8, hitstun: 13, knockbackX: 3, knockbackY: -2 } },
  specials: {
    lightningDash: { cost: 15, damage: 80,  startup: 4, active: 4, recovery: 11, hitstun: 14, knockbackX: 5, knockbackY: -1, subtype: "mobility", dashSpeed: 28, effect: "electric flash-step strike" },
    thunderPalm:   { cost: 25, damage: 115, startup: 8, active: 5, recovery: 18, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "high-voltage palm" }
  },
  ultimate: { name: "Speed of Lightning", cost: 100, duration: 7, effect: "Extreme speed and rapid multi-hits" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("killua"), animationData: { ...DEFAULT_ANIM }
}

const kurapika = {
  rosterKey: "kurapika", name: "Kurapika", universe: "hunter_x_hunter", color: "#dc2626",
  archetypes: ["melee", "ranged"], primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "control", animeMovement: true },
  passive: { name: "Scarlet Eyes", effect: "Chain-based reach; lands a heavy conditional spike when his eyes turn scarlet" },
  stats: { maxHealth: 1080, maxEnergy: 140, attack: 88, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 44, startup: 4, active: 3, recovery: 10, hitstun: 12, knockbackX: 4, knockbackY: 0 } },
  specials: {
    chainJail:    { cost: 25, damage: 100, startup: 10, active: 5, recovery: 20, hitstun: 26, knockbackX: 4, knockbackY: 0,  rangeX: 200, effect: "long-range chain bind" },
    judgmentChain:{ cost: 45, damage: 180, startup: 16, active: 5, recovery: 26, hitstun: 30, knockbackX: 10, knockbackY: -2, effect: "conditional high-damage spike" }
  },
  ultimate: { name: "Emperor Time", cost: 100, duration: 8, effect: "Mastery surge: all nen output rises sharply" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("kurapika"), animationData: { ...DEFAULT_ANIM }
}

const leorio = {
  rosterKey: "leorio", name: "Leorio Paradinight", universe: "hunter_x_hunter", color: "#a16207",
  archetypes: ["melee", "power"], primary: "melee", secondary: ["power"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "low", scaling: "burst", animeMovement: false },
  passive: { name: "Emission Punch", effect: "Slow but hits like a truck — huge single-hit damage" },
  stats: { maxHealth: 1300, maxEnergy: 110, attack: 96, defense: 90, speed: 74, maxJumps: 1, jumpPower: 26, dashSpeed: 12, dashDuration: 8, dashCooldownMax: 50 },
  basic_attacks: { ...HXH_BASICS, heavy: { damage: 110, startup: 12, active: 5, recovery: 24, hitstun: 22, knockbackX: 10, knockbackY: 2, superArmor: true }, light: { damage: 50, startup: 6, active: 3, recovery: 12, hitstun: 13, knockbackX: 4, knockbackY: 0 } },
  specials: {
    remotePunch: { cost: 25, damage: 160, startup: 16, active: 5, recovery: 28, hitstun: 28, knockbackX: 12, knockbackY: -3, rangeX: 150, effect: "emitted long-distance haymaker" }
  },
  ultimate: { name: "Doctor's Resolve", cost: 100, duration: 8, effect: "Power surge: devastating slow blows" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("leorio"), animationData: { ...DEFAULT_ANIM }
}

const hisoka = {
  rosterKey: "hisoka", name: "Hisoka Morow", universe: "hunter_x_hunter", color: "#db2777",
  archetypes: ["ranged", "trickster"], primary: "ranged", secondary: ["trickster"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "burst", animeMovement: true },
  passive: { name: "Bungee Gum", effect: "Pulls foes in from range; big damage but very punishable on a whiff" },
  stats: { maxHealth: 1100, maxEnergy: 140, attack: 94, defense: 80, speed: 86, maxJumps: 2, jumpPower: 32, dashSpeed: 17, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    bungeePull:  { cost: 30, damage: 130, startup: 12, active: 6, recovery: 30, hitstun: 24, knockbackX: -6, knockbackY: -2, rangeX: 210, effect: "elastic pull-in — punishable on whiff" },
    textureTrap: { cost: 20, damage: 95,  startup: 9,  active: 5, recovery: 22, hitstun: 18, knockbackX: 7, knockbackY: -1, effect: "deceptive close burst" }
  },
  ultimate: { name: "Bloodlust Unleashed", cost: 100, duration: 8, effect: "Predatory surge: damage and range spike" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("hisoka"), animationData: { ...DEFAULT_ANIM }
}

const chrollo = {
  rosterKey: "chrollo", name: "Chrollo Lucilfer", universe: "hunter_x_hunter", color: "#6d28d9",
  archetypes: ["melee", "counter"], primary: "melee", secondary: ["counter"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Skill Hunter", effect: "Well-rounded; a reactive special that turns the opponent's pressure around" },
  stats: { maxHealth: 1150, maxEnergy: 140, attack: 89, defense: 88, speed: 85, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    skillSteal:    { cost: 25, damage: 60,  startup: 6,  active: 6, recovery: 16, hitstun: 18, knockbackX: 5, knockbackY: -1, subtype: "counter", effect: "reactive parry-strike" },
    stolenArsenal: { cost: 30, damage: 125, startup: 11, active: 5, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -2, rangeX: 150, effect: "borrowed nen barrage" }
  },
  ultimate: { name: "Bandit's Secret", cost: 100, duration: 8, effect: "Versatile surge: copies and overwhelms" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("chrollo"), animationData: { ...DEFAULT_ANIM }
}

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
    upAttack:  { type: "launcher", damage: 72, startup: 7, active: 4, recovery: 16, hitstun: 20, blockstun: 9, knockbackX: 2, knockbackY: -8, launch: 11, airOK: false },
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
    guanyinCast: { frames: 13, width: 51, height: 65, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./netero_charge_guanyin_uniform.png" }
  },
  // No dedicated intro art shipped (confirmed absent). Point the intro pool at `idle` so the pre-match
  // beat holds a clean idle pose — deterministic and box-free — instead of falling through to the generic
  // "transform" variant (which has no strip and would only render idle via sprite.js's fallback guard
  // anyway, but with a null _actionDef.sheet). A real entrance is deferred pending art. Win/lose reuse
  // the engine's shared end-match screens (no per-character art). Getup: no strip → knockdown routes to
  // `hurt` via the legacy 12-frame path (sprite.js), no getup chain.
  introPool: ["idle"]
}

const ging = {
  rosterKey: "ging", name: "Ging Freecss", universe: "hunter_x_hunter", color: "#0d9488",
  archetypes: ["melee", "versatile"], primary: "melee", secondary: ["versatile"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "versatile", animeMovement: true },
  passive: { name: "Prodigy", effect: "No glaring weakness and no dominant strength — rewards skilled, varied play" },
  stats: { maxHealth: 1120, maxEnergy: 140, attack: 90, defense: 86, speed: 88, maxJumps: 2, jumpPower: 32, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 38 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    adaptiveStrike: { cost: 25, damage: 115, startup: 10, active: 5, recovery: 18, hitstun: 22, knockbackX: 8, knockbackY: -2, effect: "reads the situation and strikes" },
    ingeniumTrap:   { cost: 20, damage: 90,  startup: 12, active: 6, recovery: 20, hitstun: 18, knockbackX: 5, knockbackY: -1, rangeX: 160, effect: "clever nen snare" }
  },
  ultimate: { name: "Whatever It Takes", cost: 100, duration: 8, effect: "All-around surge across every stat" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("ging"), animationData: { ...DEFAULT_ANIM }
}

const meruem = {
  rosterKey: "meruem", name: "Meruem", universe: "hunter_x_hunter", color: "#7e22ce",
  archetypes: ["melee", "boss"], primary: "melee", secondary: ["boss"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "low", scaling: "damage", animeMovement: true },
  passive: { name: "King's Aura", effect: "Highest stats in the roster — but slow startup and punishing recovery keep him beatable" },
  stats: { maxHealth: 1700, maxEnergy: 150, attack: 112, defense: 100, speed: 80, maxJumps: 1, jumpPower: 28, dashSpeed: 13, dashDuration: 8, dashCooldownMax: 52 },
  basic_attacks: {
    light:     { damage: 58, startup: 6, active: 3, recovery: 13, hitstun: 14, knockbackX: 4, knockbackY: 0 },
    heavy:     { damage: 138, startup: 16, active: 5, recovery: 32, hitstun: 24, knockbackX: 13, knockbackY: 2, superArmor: true },
    upAttack:  { damage: 104, startup: 13, active: 5, recovery: 24, hitstun: 24, knockbackX: 3, knockbackY: -11 },
    airAttack: { damage: 88, startup: 8, active: 4, recovery: 15, hitstun: 16, knockbackX: 4, knockbackY: -2 },
    downAir:   { damage: 120, startup: 13, active: 5, recovery: 22, hitstun: 22, knockbackX: 2, knockbackY: 14 },
    grab:      { damage: 46, startup: 7, active: 3, recovery: 17, hitstun: 24, throwForceX: 8, throwForceY: -5 }
  },
  specials: {
    auraAnnihilation: { cost: 35, damage: 200, startup: 22, active: 6, recovery: 34, hitstun: 32, knockbackX: 14, knockbackY: -4, superArmor: true, effect: "colossal slow nen blast — huge whiff punish window" },
    photonRush:       { cost: 25, damage: 130, startup: 14, active: 5, recovery: 26, hitstun: 24, knockbackX: 10, knockbackY: -2, effect: "advancing royal strike" }
  },
  ultimate: { name: "Rose of the King", cost: 100, duration: 8, effect: "Overwhelming assault: max damage, slow and committal" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("meruem"), animationData: { ...DEFAULT_ANIM }
}

const kite = {
  rosterKey: "kite", name: "Kite", universe: "hunter_x_hunter", color: "#0ea5e9",
  archetypes: ["melee", "ranged"], primary: "melee", secondary: ["ranged"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "versatile", animeMovement: true },
  passive: { name: "Crazy Slots", effect: "A conjured weapon that cycles, changing his special's properties each use" },
  stats: { maxHealth: 1100, maxEnergy: 140, attack: 88, defense: 84, speed: 86, maxJumps: 2, jumpPower: 30, dashSpeed: 16, dashDuration: 10, dashCooldownMax: 40 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    slotCycle:   { cost: 20, damage: 105, startup: 10, active: 5, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: -2, subtype: "cycle", rangeX: 150, effect: "weapon-roulette strike — properties shift per use" },
    scytheSweep: { cost: 25, damage: 120, startup: 12, active: 6, recovery: 20, hitstun: 22, knockbackX: 8, knockbackY: -1, effect: "wide reaping arc" }
  },
  ultimate: { name: "Full Arsenal", cost: 100, duration: 8, effect: "Every slot at once: shifting damage and reach" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("kite"), animationData: { ...DEFAULT_ANIM }
}

const feitan = {
  rosterKey: "feitan", name: "Feitan Portor", universe: "hunter_x_hunter", color: "#1f2937",
  archetypes: ["melee", "rushdown"], primary: "melee", secondary: ["rushdown"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "high", scaling: "ramp", animeMovement: true },
  passive: { name: "Pain Packer", effect: "The longer he stays on the offensive, the more his damage ramps up" },
  stats: { maxHealth: 1040, maxEnergy: 130, attack: 92, defense: 80, speed: 92, maxJumps: 2, jumpPower: 32, dashSpeed: 18, dashDuration: 10, dashCooldownMax: 36 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 44, startup: 3, active: 2, recovery: 9, hitstun: 12, knockbackX: 3, knockbackY: 0 } },
  specials: {
    risingSun:  { cost: 30, damage: 150, startup: 14, active: 6, recovery: 22, hitstun: 26, knockbackX: 9, knockbackY: -3, effect: "scorching heat burst — bigger after a long offense" },
    rapidStab:  { cost: 20, damage: 85,  startup: 6,  active: 6, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: -1, effect: "relentless blade flurry" }
  },
  ultimate: { name: "Rising Sun's Verdict", cost: 100, duration: 8, effect: "Heat overload: damage ramps even faster" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("feitan"), animationData: { ...DEFAULT_ANIM }
}

const illumi = {
  rosterKey: "illumi", name: "Illumi Zoldyck", universe: "hunter_x_hunter", color: "#475569",
  archetypes: ["ranged", "control"], primary: "ranged", secondary: ["control"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "control", animeMovement: true },
  passive: { name: "Needle Manipulation", effect: "Zones with needles and debuffs that sap the opponent's mobility" },
  stats: { maxHealth: 1090, maxEnergy: 140, attack: 87, defense: 82, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS },
  specials: {
    needleVolley: { cost: 22, damage: 95,  startup: 9,  active: 5, recovery: 18, hitstun: 16, knockbackX: 6, knockbackY: -1, rangeX: 200, effect: "long-range needle throw" },
    pinControl:   { cost: 25, damage: 70,  startup: 12, active: 6, recovery: 20, hitstun: 22, knockbackX: 3, knockbackY: 0,  subtype: "debuff", effect: "needle implant that slows the foe" }
  },
  ultimate: { name: "Puppeteer's Will", cost: 100, duration: 8, effect: "Control surge: relentless needles and debuffs" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("illumi"), animationData: { ...DEFAULT_ANIM }
}

const biscuit = {
  rosterKey: "biscuit", name: "Biscuit Krueger", universe: "hunter_x_hunter", color: "#ec4899",
  archetypes: ["melee", "trickster"], primary: "melee", secondary: ["trickster"],
  traits: { hasEnergy: true, energyType: "nen", mobility: "medium", scaling: "burst", animeMovement: true },
  passive: { name: "Deceptive Strength", effect: "Unassuming stats hide one devastating burst special" },
  stats: { maxHealth: 1060, maxEnergy: 130, attack: 84, defense: 84, speed: 84, maxJumps: 2, jumpPower: 30, dashSpeed: 15, dashDuration: 10, dashCooldownMax: 42 },
  basic_attacks: { ...HXH_BASICS, light: { damage: 40, startup: 4, active: 3, recovery: 10, hitstun: 11, knockbackX: 2, knockbackY: 0 } },
  specials: {
    cookieCrush: { cost: 45, damage: 190, startup: 16, active: 5, recovery: 28, hitstun: 30, knockbackX: 12, knockbackY: -3, superArmor: true, effect: "true-strength burst — huge but costly" },
    quickJab:    { cost: 15, damage: 80,  startup: 6,  active: 4, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: -1, effect: "unassuming poke" }
  },
  ultimate: { name: "Magical Esthe", cost: 100, duration: 8, effect: "Hidden might unleashed: massive power surge" },
  transformationOrder: ["base"], transformations: { base: { damageMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } },
  spriteSheets: hxhSheets("biscuit"), animationData: { ...DEFAULT_ANIM }
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
    upAttack:  { type: "launcher", damage: 70, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10 },   // kick_attack rising spin
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
  // SSJ ROSE is a SELF-CONTAINED sustained transform managed in abilities.js (enterSSJRose /
  // revertSSJRose / applyGokuBlackFormSystem) — NOT the generic transformations.js flow — because
  // it's threshold-gated (no entry cost) with a continuous per-frame drain + instant auto-revert.
  // So transformationOrder stays ["base"]; currentForm is set to "ssjRose" by enterSSJRose for HUD.
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
    upAttack:  { type: "launcher", damage: 68, startup: 7, active: 4, recovery: 16, hitstun: 20, knockbackX: 2, knockbackY: -8, launch: 10 }, // up_attack, yellow crescent
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
  // idle content 62px × 1.7 ≈ 105px on-screen — mid roster range (Sasuke 116, Gojo 112,
  // Toji 101). Matches Sasuke's "source ~55-61px → ×1.7 ≈ hitbox height" reasoning.
  spriteScale: 1.7,
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
// EXPORTS
// ─────────────────────────────────────────────────────────────────
export const characters = {
  goku, goku_black: gokuBlack, vegeta, piccolo, frieza, cell,
  gojo, megumi, sukuna, omololu, toji, mahoraga,
  naruto, sasuke, itachi,
  tanjiro, nezuko, zenitsu, inosuke, rengoku, akaza,
  rick, morty, evilMorty, rickPrime,
  beerus,
  ben10, albedo,
  omniMan, thragg,
  omega_ranger: omegaRanger,
  gon, killua, kurapika, leorio, hisoka, chrollo, netero,
  ging, meruem, kite, feitan, illumi, biscuit
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
