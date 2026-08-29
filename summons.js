// summons.js
// Handles assist/summon logic for characters.
// All timing values are in FRAMES at 60fps.

// Shadow clones read the fighters' live attack state to mimic / to poof when hit.
// combat.js imports only physics + sound → no cycle back to summons.
import { getAttackHitbox, getHurtbox, rectsOverlap, attackIsActive, applyScaledDamage } from "./combat.js"
import { physics } from "./physics.js" // clones fall + rest on the floor via the SAME applyGravity fighters use
import { sound, SFX } from "./sound.js"   // one-shot clone spawn/despawn + strike SFX
import { GLOBAL_SPRITE_SCALE } from "./sprite.js"   // shared +18% render bump — clones must match the real fighter's on-screen size

export const activeSummons = []

// ─────────────────────────────────────────────────────────────────
// DEFAULTS — all timing values are in FRAMES at 60fps
// ─────────────────────────────────────────────────────────────────
const summonDefaults = {
  id:               "generic",
  duration:         180,   // frames
  maxSimultaneous:  2,
  attackInterval:   30,    // frames between attacks
  damage:           50,
  w:                40,
  h:                60,
  speed:            4,     // pixels per frame
  offsetX:          60,
  offsetY:          0,
  behavior:         "rush",
  hitstun:          12,
  knockbackX:       4,
  knockbackY:       0,
  launch:           0,
  spike:            0,
  restrain:         false,
  restrainDuration: 36,    // frames
  defensive:        false,
  utility:          false,
  obscureVision:    false,
  antiAir:          false,
  heavySummon:      false,
  oneHit:           true,
  color:            "#0ff"
}

const summonTemplates = {
  // ── ZENITSU DOUBLE ATTACK partners (Stage 4) ──────────────────────────────
  // Hardcoded scripted-combo partners for Zenitsu's "Double Attack" special. Each spawns on the
  // FAR side of the opponent (abilities.js repositions after spawn), rushes INWARD (rush behavior →
  // toward target), lands ONE hit, then poofs (puffOnDespawn → spawnClonePuff). NOT an
  // independently-controlled fighter — a pre-animated pincer partner. Sheets are the resliced
  // dedicated partner strips.
  // spawnBeat holds the partner on the FAR side for a few frames (updateSummonMovement zeroes vx
  // while frame<spawnBeat) so the "appears opposite → dashes inward" pincer reads clearly. No
  // spawnSheet → the beat draws frame 0 of the same sheet (the ready stance). duration covers beat+rush.
  zenitsuTanjiro: {
    id: "zenitsuTanjiro", duration: 54, maxSimultaneous: 1, attackInterval: 6, damage: 60,
    w: 52, h: 92, speed: 12, behavior: "rush", spawnBeat: 8, hitstun: 22, knockbackX: 7, knockbackY: -2,
    oneHit: true, puffOnDespawn: true, color: "#4ea1d3", offsetY: 4,
    sheet: "./zenitsu_tanjiro_partner_uniform.png", spriteFrames: 4, spriteW: 93, spriteH: 46, spriteSpeed: 5, spriteScale: 2.2
  },
  zenitsuInosuke: {
    id: "zenitsuInosuke", duration: 54, maxSimultaneous: 1, attackInterval: 6, damage: 60,
    w: 52, h: 100, speed: 12, behavior: "rush", spawnBeat: 8, hitstun: 22, knockbackX: 7, knockbackY: -2,
    oneHit: true, puffOnDespawn: true, color: "#9c8f7a", offsetY: 0,
    sheet: "./zenitsu_inosuke_partner_uniform.png", spriteFrames: 3, spriteW: 67, spriteH: 68, spriteSpeed: 5, spriteScale: 1.55
  },

  // Meeseeks (Rick) — same rushdown shape as Divine Dogs, but with NO simultaneous cap
  // (maxSimultaneous 99): only Rick's energy cost per throw limits how many exist at once.
  // Two-phase art: hold the idle "poof-in" pose for `spawnBeat` frames, then run the attack strip.
  meeseeks: {
    id:              "meeseeks",
    duration:        130,   // ~2.2s: enough to cross most of the arena, then despawn on whiff
    maxSimultaneous: 99,    // effectively uncapped — see spec (multiple Meeseeks allowed)
    attackInterval:  10,
    damage:          45,
    w:               42,
    h:               64,
    speed:           8,     // straight-line rush toward the opponent
    behavior:        "rush",
    hitstun:         18,
    knockbackX:      7,
    knockbackY:      -1,
    oneHit:          true,  // connects once, then despawns cleanly
    color:           "#4ade80",
    // SIZE: matched to Rick's corrected scale. Run content ≈58px → ×1.85 ≈ 107px on-screen
    // (~85% of Rick's ~126px — a lanky companion a head shorter, not randomly mismatched).
    // spawnScale 1.67 renders the taller idle/poof cell (64px) at the SAME ~107px so the
    // pose-swap doesn't pop. offsetY 18 drops the centred-draw box so the Meeseeks' feet plant
    // at Rick's floor instead of floating at torso height (it was drawn centred on owner.y).
    sheet:      "./meeseeks_run_attack.png", spriteFrames: 7, spriteW: 60, spriteH: 80, spriteSpeed: 4, spriteScale: 1.85,
    spawnSheet: "./meeseeks_idle.png",       spawnFrames: 5, spawnW: 38, spawnH: 82, spawnBeat: 16, spawnScale: 1.67,
    offsetY:    18
  },

  // NARUTO TOAD SUMMON (Gamakichi-style) — a separate summon special, NOT a shadow clone:
  // normal energy cost (paid in abilities.executeNarutoSpecial via spendEnergy), no chakra
  // share. Reuses this generic shikigami entity path (rush → one hit → despawn). Its three
  // single-frame poses are sliced from the JUS sheet's 2-KOMA band (right of the koma
  // clusters): frog_a (rearing) is the active/attack sheet here; updateNarutoToadPose swaps
  // to frog_b (transition) then frog_c (curl) as it despawns.
  narutoToad: {
    id:              "narutoToad",
    duration:        90,    // ~1.5s: leaps in, strikes once, curls up + fades
    maxSimultaneous: 1,
    attackInterval:  14,    // first strike window after the brief rear-up
    damage:          90,
    w:               60,
    h:               54,
    speed:           7,     // hops toward the target
    behavior:        "rush",
    hitstun:         20,
    knockbackX:      6,
    knockbackY:      -2,
    oneHit:          true,
    color:           "#b45309",   // toad-brown fallback box if the sheet hasn't decoded
    sheet: "./fx_2_koma_special_frog_a.png", spriteFrames: 1, spriteW: 120, spriteH: 135, spriteSpeed: 6, spriteScale: 0.8
  },

  // ── THE HANDLER — Ten Shadows shikigami cameos (Stage 4) ──────────────────────────────────────
  // Each is summoned by a directional special (abilities.js executeHandlerSpecial): the summon-MOTION
  // IS the cameo call (like Todo's Clap). All render their own resliced art
  // (tools/reslice_handler_shikigami.py) and deal ×0.60-scaled damage — the Megumi-flag: an
  // independently-attacking summon MUST stay scaled (performSummonAttack → applyScaledDamage, no bypass).
  // offsetY ≈ (100 − h/2 − spriteH·spriteScale/2) plants ground creatures at the fighter's floor.
  handlerDivineDogs: {   // N — black Divine Dog rushdown (run→claw), a 2-strike maul
    id: "handlerDivineDogs", duration: 74, maxSimultaneous: 1, attackInterval: 24, damage: 55,
    w: 74, h: 48, speed: 9, offsetX: 40, offsetY: 36, behavior: "rush", hitstun: 16, knockbackX: 6, knockbackY: -1,
    oneHit: false, color: "#222222",
    sheet: "./handler_shik_dog.png", spriteFrames: 4, spriteW: 99, spriteH: 54, spriteSpeed: 4, spriteScale: 1.5
  },
  handlerOrochi: {       // F — Orochi snake long forward lunging bite (disjoint reach)
    id: "handlerOrochi", duration: 58, maxSimultaneous: 1, attackInterval: 14, damage: 60,
    w: 84, h: 50, speed: 7, offsetX: 80, offsetY: 35, behavior: "rush", hitstun: 18, knockbackX: 8, knockbackY: -1,
    oneHit: true, color: "#e8e8e8",
    sheet: "./handler_shik_snake.png", spriteFrames: 2, spriteW: 73, spriteH: 46, spriteSpeed: 6, spriteScale: 1.7
  },
  handlerDatto: {        // B — Datto rabbit swarm scatters forward (chip / zoning cover)
    id: "handlerDatto", duration: 120, maxSimultaneous: 2, attackInterval: 30, damage: 34,
    w: 120, h: 30, speed: 6, offsetX: 30, offsetY: 66, behavior: "screenSwarm", hitstun: 10, knockbackX: 3, knockbackY: 0,
    oneHit: false, color: "#eeeeee",
    sheet: "./handler_shik_rabbit.png", spriteFrames: 1, spriteW: 173, spriteH: 32, spriteSpeed: 6, spriteScale: 1.2
  },
  handlerBansho: {       // D — Max Elephant (Banshō) heavy slam, drops from above (attackInterval low so
                         // the short overlap window during the fast descent is reliably caught)
    id: "handlerBansho", duration: 96, maxSimultaneous: 1, attackInterval: 8, damage: 90,
    w: 150, h: 100, speed: 6, offsetX: 30, offsetY: -20, behavior: "heavyDrop", hitstun: 24, knockbackX: 8, knockbackY: 4, launch: 6,
    oneHit: true, heavySummon: true, color: "#f0f0f0",
    sheet: "./handler_shik_elephant.png", spriteFrames: 1, spriteW: 168, spriteH: 105, spriteSpeed: 6, spriteScale: 1.6
  },
  handlerNue: {          // U — Nue red bird: dive-bomb from above (heavyDrop so it descends ONTO the
                         // target rather than hovering out of range like airDive; still reads as anti-air)
    id: "handlerNue", duration: 84, maxSimultaneous: 1, attackInterval: 8, damage: 55,
    w: 60, h: 56, speed: 8, offsetX: 20, offsetY: -60, behavior: "heavyDrop", antiAir: true, hitstun: 18, knockbackX: 5, knockbackY: -4,
    oneHit: true, color: "#c0392b",
    sheet: "./handler_shik_nue.png", spriteFrames: 3, spriteW: 56, spriteH: 60, spriteSpeed: 5, spriteScale: 1.4
  },
  handlerToad: {         // Air — Gama toad aerial drop / body-check
    id: "handlerToad", duration: 70, maxSimultaneous: 1, attackInterval: 14, damage: 50,
    w: 44, h: 34, speed: 7, offsetX: 30, offsetY: 59, behavior: "rush", hitstun: 16, knockbackX: 5, knockbackY: -2,
    oneHit: true, color: "#2e7d32",
    sheet: "./handler_shik_toad.png", spriteFrames: 1, spriteW: 34, spriteH: 28, spriteSpeed: 6, spriteScale: 1.7
  },

  // ── KAKASHI KUCHIYOSE (Stage 5) — two STRUCTURALLY DIFFERENT summons, built differently per design ──
  // Pakkun = a LINGERING COMPANION pug: two-phase (hold the sitting "spawn/ready" pose for spawnBeat, then
  // run the bite strip), LONG duration, MULTI-HIT (oneHit:false) — a real attacking presence for a duration,
  // NOT a one-shot burst. The source's "PRESSING BUTTON" held-bite reads here as the sustained multi-hit window.
  kakashiPakkun: {
    id: "kakashiPakkun", duration: 300, maxSimultaneous: 1, attackInterval: 40, damage: 30,
    w: 44, h: 30, speed: 6, offsetX: 30, offsetY: 60, behavior: "rush", hitstun: 12, knockbackX: 4, knockbackY: 0,
    oneHit: false, color: "#b48a5a",
    sheet: "./kakashi_pakkun_bite_uniform.png", spriteFrames: 4, spriteW: 34, spriteH: 23, spriteSpeed: 5, spriteScale: 2.2,
    spawnSheet: "./kakashi_pakkun_ready_uniform.png", spawnFrames: 2, spawnW: 25, spawnH: 23, spawnBeat: 18, spawnScale: 2.2
  },
  // Nin-Dogs = a one-shot BURST: the 8-dog PACK erupts and rushes forward, multi-mauls for a SHORT window,
  // then despawns. NOT a persistent companion — a big-commitment attack (high cost, short duration).
  kakashiNinDogs: {
    id: "kakashiNinDogs", duration: 66, maxSimultaneous: 1, attackInterval: 14, damage: 36,
    w: 132, h: 52, speed: 11, offsetX: 40, offsetY: 34, behavior: "rush", hitstun: 18, knockbackX: 7, knockbackY: -1,
    oneHit: false, color: "#8a7a66",
    sheet: "./kakashi_nindogs_pack_uniform.png", spriteFrames: 4, spriteW: 143, spriteH: 64, spriteSpeed: 4, spriteScale: 1.5
  },

  // NARUTO CLONE RUSH (setplay) — a PLACED shadow clone, on command, is sent on ONE
  // autonomous rush-strike at the opponent, then despawns. Distinct from the instant
  // Rasengan Barrage (#16/#19, guaranteed same-frame orbs): this one physically travels
  // (reactable/blockable) so Naruto can stagger several and play neutral around the threat
  // = okizeme/setplay. Reuses the generic shikigami rush→one-hit→despawn path verbatim.
  // Body reuses Naruto's own idle strip (naruto_kcm_stance.png) — no new art. Damage is
  // applied RAW by performSummonAttack (bypasses GLOBAL_DAMAGE_SCALE like all summons), so
  // it's kept LOW: 40 each, and it costs the clone's whole chakra share to launch.
  narutoCloneRush: {
    id:              "narutoCloneRush",
    duration:        70,    // rush window; oneHit clamps it lower once it connects
    maxSimultaneous: 3,     // up to the 3-clone cap can be rushing at once
    attackInterval:  10,    // re-checks proximity each interval; only lands when close (performSummonAttack range-gates)
    damage:          40,
    w:               70,
    h:               120,
    speed:           8,     // hops toward the target a touch faster than it stands
    behavior:        "rush",
    hitstun:         18,
    knockbackX:      6,
    knockbackY:      -2,
    oneHit:          true,
    color:           "#ffb400",   // clone-orange fallback box
    sheet: "./naruto_kcm_stance.png", spriteFrames: 4, spriteW: 36, spriteH: 63, spriteSpeed: 6, spriteScale: 2.0
  },
  // Minato's Clone Rush rushers — identical rush→one-hit→despawn template, Minato's own clone
  // body (3 identical standing clones). Same low RAW damage (summon damage bypasses global scale).
  minatoCloneRush: {
    id:              "minatoCloneRush",
    duration:        70, maxSimultaneous: 3, attackInterval: 10,
    damage:          40, w: 70, h: 120, speed: 8, behavior: "rush",
    hitstun:         18, knockbackX: 6, knockbackY: -2, oneHit: true,
    color:           "#facc15",   // Minato flash-yellow fallback box
    // Rushers use Minato's standing IDLE body (like Naruto's kcm_stance rushers), NOT the caster's
    // summon-gesture sheet — the hand-sign belongs on Minato, not on the rushing clones.
    sheet: "./minato_idle_uniform.png", spriteFrames: 4, spriteW: 37, spriteH: 64, spriteSpeed: 6, spriteScale: 1.85
  },

  // ONOKI — Dust Release: Detachment of the Primitive World (ULTIMATE). A PERSISTENT stone GOLEM that
  // lives on-field and fights alongside Onoki with its own moveset (distinct larger sub-character). Unlike
  // the one-hit assist shikigami, oneHit:false → it strikes on a cadence for its whole ~10s lifetime.
  // Two-phase spawn: the `transition` (forming/rising) pose holds for spawnBeat, then it rushes + strikes.
  // updateOnokiGolemPose (below) swaps its idle↔punch↔swing poses (all padded to a common 178x151 cell so
  // the feet stay planted through the swap). Damage runs through applyScaledDamage like every summon.
  onokiGolem: {
    id:              "onokiGolem",
    duration:        600,    // ~10s persistent field presence
    maxSimultaneous: 1,
    attackInterval:  54,     // strike cadence (~0.9s)
    damage:          60,     // per strike (×0.60 → ~36 eff)
    w:               120,
    h:               150,
    speed:           3,      // slow, imposing advance
    offsetX:         80,
    offsetY:         0,
    behavior:        "rush",
    hitstun:         22,
    knockbackX:      11,
    knockbackY:      -3,
    oneHit:          false,  // PERSISTENT — keeps striking on the interval (not a one-and-done assist)
    color:           "#b8a072",   // stone fallback box
    sheet:      "./onoki_golem_idle_uniform.png",       spriteFrames: 5, spriteW: 178, spriteH: 151, spriteSpeed: 6, spriteScale: 1.15,
    spawnSheet: "./onoki_golem_transition_uniform.png", spawnFrames: 4, spawnW: 178, spawnH: 151, spawnBeat: 24, spawnScale: 1.15
  },
  // RIKA (Yuta's "Rika's Invocation" ULTIMATE, Stage 5) — a PERSISTENT AI-controlled assist ally (owner
  // decision #8 = AI assist-ally). The vengeful curse manifests (rika_spawn emerge), advances on the foe,
  // and repeatedly strikes on the interval (idle ↔ reach/screech pose-swap). oneHit:false = keeps striking
  // for the duration. Per-strike damage is ×0.60-scaled at hit (Megumi-flag: an independently-attacking
  // summon MUST stay scaled) — 55 → ~33 eff × ~6-7 strikes over ~6s = a real ULT payoff, not a one-shot nuke.
  rikaAssist: {
    id:              "rikaAssist",
    duration:        360,    // ~6s persistent field presence
    maxSimultaneous: 1,
    attackInterval:  50,     // strike cadence (~0.83s) → ~6-7 strikes across the duration
    damage:          55,     // per strike (×0.60 → ~33 eff)
    w:               84,
    h:               120,
    speed:           4,      // menacing advance
    offsetX:         90,
    offsetY:         0,
    behavior:        "rush",
    hitstun:         22,
    knockbackX:      9,
    knockbackY:      -3,
    oneHit:          false,  // PERSISTENT — keeps striking (the curse fights alongside Yuta)
    color:           "#c9d2dc",   // pale-curse fallback box
    sheet:      "./rika_idle_uniform.png",  spriteFrames: 5, spriteW: 150, spriteH: 130, spriteSpeed: 6, spriteScale: 1.3,
    spawnSheet: "./rika_spawn_uniform.png", spawnFrames: 5, spawnW: 150, spawnH: 130, spawnBeat: 20, spawnScale: 1.3
  }
}

// RIKA ASSIST pose driver — the curse shows its IDLE while advancing, then swaps to a STRIKE pose
// (alternating reach-claw / screech) for the ~14 frames leading into each interval attack, then back to
// idle. Mirrors updateOnokiGolemPose (re-points sheet + spriteFrames each frame; all poses share the
// 150x130 common cell so the tail stays planted). Purely visual; hitbox/damage/lifetime are unchanged.
const RIKA_POSES = {
  idle:    { sheet: "./rika_idle_uniform.png",    frames: 5 },
  reach:   { sheet: "./rika_reach_uniform.png",   frames: 5 },
  screech: { sheet: "./rika_screech_uniform.png", frames: 6 }
}
function setRikaPose(s, mode) {
  if (!s || s._rikaPose === mode) return
  const p = RIKA_POSES[mode]; if (!p) return
  s._rikaPose = mode
  s.sheet = p.sheet; s.spriteFrames = p.frames; s._animT = 0
}
function updateRikaAssistPose(s) {
  if ((s.frame || 0) < (s.spawnBeat || 0)) return   // forming beat: drawSummons shows the spawnSheet
  const interval = s.attackInterval || 50
  const winding  = (s.attackTimer || 0) >= interval - 14   // winding up into the next strike
  if (winding) {
    if (!s._rikaStrikeLatched) {                            // latch one strike pose per cycle (alternate)
      s._rikaStrikeLatched = true
      s._rikaSwing = (s._rikaSwing || 0) + 1
      s._rikaStrikePose = (s._rikaSwing % 2 === 1) ? "reach" : "screech"
    }
    setRikaPose(s, s._rikaStrikePose)
  } else {
    s._rikaStrikeLatched = false
    setRikaPose(s, "idle")
  }
}

// ONOKI GOLEM pose driver — the persistent golem shows its IDLE while advancing, then swaps to a STRIKE
// pose (alternating punch/swing) for the ~14 frames leading into each interval attack, then back to idle.
// Mirrors the narutoToad pose-swap pattern (re-points sheet + spriteFrames each frame; all poses share the
// 178x151 common cell so feet stay planted). Purely visual; hitbox/damage/lifetime are unchanged.
const ONOKI_GOLEM_POSES = {
  idle:  { sheet: "./onoki_golem_idle_uniform.png",  frames: 5 },
  punch: { sheet: "./onoki_golem_punch_uniform.png", frames: 4 },
  swing: { sheet: "./onoki_golem_swing_uniform.png", frames: 4 }
}
function setOnokiGolemPose(s, mode) {
  if (!s || s._golemPose === mode) return
  const p = ONOKI_GOLEM_POSES[mode]; if (!p) return
  s._golemPose = mode
  s.sheet = p.sheet; s.spriteFrames = p.frames; s._animT = 0
}
function updateOnokiGolemPose(s) {
  if ((s.frame || 0) < (s.spawnBeat || 0)) return   // forming beat: drawSummons shows the spawnSheet
  const interval = s.attackInterval || 54
  const winding  = (s.attackTimer || 0) >= interval - 14   // winding up into the next strike
  if (winding) {
    if (!s._golemStrikeLatched) {                          // latch one strike pose per cycle (alternate)
      s._golemStrikeLatched = true
      s._golemSwing = (s._golemSwing || 0) + 1
      s._golemStrikePose = (s._golemSwing % 2 === 1) ? "punch" : "swing"
    }
    setOnokiGolemPose(s, s._golemStrikePose)
  } else {
    s._golemStrikeLatched = false
    setOnokiGolemPose(s, "idle")
  }
}

// NARUTO TOAD pose swap — the summon shows the rearing frog_a while active/attacking, then a
// brief frog_b transition and the curled frog_c as it despawns. All three are single-frame
// crops with different dims, so a swap just re-points sheet + spriteW/H (drawSummons reads
// them each frame). Purely visual; no effect on hitbox/damage/lifetime.
const NARUTO_TOAD_DESPAWN_FRAMES = 22   // last stretch of life → play the collapse sequence
const NARUTO_TOAD_CURL_FRAMES    = 12   // final frames show the fully-curled pose
const NARUTO_TOAD_POSES = {
  a: { sheet: "./fx_2_koma_special_frog_a.png", spriteW: 120, spriteH: 135 },  // rearing (active/attack)
  b: { sheet: "./fx_2_koma_special_frog_b.png", spriteW: 90,  spriteH: 113 },  // transitional lean
  c: { sheet: "./fx_2_koma_special_frog_c.png", spriteW: 94,  spriteH: 53  }   // curled / collapsed (despawn)
}
function setNarutoToadPose(s, key) {
  if (!s || s._toadPose === key) return
  const p = NARUTO_TOAD_POSES[key]
  if (!p) return
  s._toadPose = key
  s.sheet = p.sheet; s.spriteW = p.spriteW; s.spriteH = p.spriteH
}
function updateNarutoToadPose(s) {
  // Despawning = it already struck (oneHit clamps lifetime low) OR it's near end of life.
  const despawning = s.hasHit || s.lifetime <= NARUTO_TOAD_DESPAWN_FRAMES
  if (!despawning) setNarutoToadPose(s, "a")
  else if (s.lifetime > NARUTO_TOAD_CURL_FRAMES) setNarutoToadPose(s, "b")
  else setNarutoToadPose(s, "c")
}

// ─────────────────────────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────────────────────────
export function spawnSummon(owner, summonData, target) {
  if (!owner || !summonData) return null

  const templateKey =
    typeof summonData === "string"
      ? summonData
      : (summonData.summonId || summonData.id || null)

  const template = templateKey ? (summonTemplates[templateKey] || {}) : {}

  const mergedData = {
    ...summonDefaults,
    ...template,
    ...(typeof summonData === "object" ? summonData : {})
  }

  const current = activeSummons.filter(
    s => s.owner === owner && s.id === mergedData.id
  )

  if (current.length >= (mergedData.maxSimultaneous || summonDefaults.maxSimultaneous)) {
    return null
  }

  // Binding-vow summon modifiers: an optional hard cap on TOTAL summons for this
  // owner across all ids, plus damage / lifespan boosts (generic; set via bindingvow.js).
  if (owner.maxSummons != null) {
    const ownerTotal = activeSummons.filter(s => s.owner === owner).length
    if (ownerTotal >= owner.maxSummons) return null
  }
  if (owner.summonDamageMultiplier)   mergedData.damage   = (mergedData.damage || summonDefaults.damage) * owner.summonDamageMultiplier
  if (owner.summonLifespanMultiplier) mergedData.duration = (mergedData.duration || summonDefaults.duration) * owner.summonLifespanMultiplier

  const summon = {
    ...mergedData,
    owner,
    target,
    x:            owner.x + ((owner.facing || 1) * (mergedData.offsetX || 60)),
    y:            owner.y + (mergedData.offsetY || 0),
    vx:           0,
    vy:           0,
    facing:       owner.facing || 1,
    lifetime:     mergedData.duration || summonDefaults.duration,
    attackTimer:  0,
    hasHit:       false,
    frame:        0,
    dropStarted:  false
  }

  activeSummons.push(summon)
  return summon
}

// ─────────────────────────────────────────────────────────────────
// UPDATE — called once per game frame
// ─────────────────────────────────────────────────────────────────
export function updateSummons() {
  // Fire any first-press clone spawns whose poof-sync delay has elapsed (visual lands
  // with the ~2.45s poof of the summon clip that started on the press).
  for (let i = pendingCloneSpawns.length - 1; i >= 0; i--) {
    if (--pendingCloneSpawns[i].framesLeft <= 0) {
      const { owner, target } = pendingCloneSpawns.splice(i, 1)[0]
      spawnShadowClone(owner, target)   // entity + puff appear now; chakra/cap unchanged
    }
  }

  for (let i = activeSummons.length - 1; i >= 0; i--) {
    const s = activeSummons[i]
    if (!s) {
      activeSummons.splice(i, 1)
      continue
    }

    // Shadow clones follow their own path (mimic / poof / persist) — they do NOT
    // rush the target, auto-attack on interval, or expire by lifetime.
    if (s.id === "shadowClone") {
      const r = updateShadowClone(s)
      if (r === "destroy") {
        loseCloneShare(s.owner); spawnCloneDespawnFx(s, "destroy")   // killed by a hit → destroy FX (Tobirama: water BURST)
        if (s.owner?.rosterKey === "naruto") sound.playSfxFile("naruto_clone_cancel.mp3", null)  // DESPAWN (hit → poof) cue
        activeSummons.splice(i, 1)
      }
      else if (r === "remove") { activeSummons.splice(i, 1) }
      continue
    }

    updateSummonMovement(s)

    s.attackTimer++
    if (s.attackTimer >= (s.attackInterval || summonDefaults.attackInterval)) {
      s.attackTimer = 0
      performSummonAttack(s)
    }

    if (s.behavior === "screenSwarm" && s.target) {
      const dx = s.target.x - s.x
      const dy = s.target.y - s.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < 100 && !s.hasHit) {
        performSummonAttack(s)
      }
    }

    s.lifetime--
    s.frame++

    if (s.id === "narutoToad") updateNarutoToadPose(s)   // rearing → transition → curl by lifecycle
    if (s.id === "onokiGolem") updateOnokiGolemPose(s)   // idle ↔ punch/swing strike poses on the attack cadence
    if (s.id === "rikaAssist") updateRikaAssistPose(s)   // idle ↔ reach/screech strike poses on the attack cadence

    if (s.lifetime <= 0) {
      cleanupSummonEffects(s)
      if (s.puffOnDespawn) spawnClonePuff(s.x + (s.w || 0) / 2, s.y + (s.h || 0) / 2)   // vanish smoke (Zenitsu Double Attack partner poofs out)
      activeSummons.splice(i, 1)
    }
  }

  tickClonePuffs()   // advance/expire the cosmetic clone spawn/dispel smoke
  tickWoodReleaseFx()   // advance/expire Hashirama wood-clone log-dispersal despawn FX
  tickWaterCloneFx()    // advance/expire Tobirama water-clone despawn FX (burst/ripple)
  tickCloneStrikeFx()   // advance/expire clone lunge-strike impact sparks
}

// ─────────────────────────────────────────────────────────────────
// MOVEMENT — pixels per frame
// ─────────────────────────────────────────────────────────────────
function updateSummonMovement(s) {
  if (!s || !s.target) return

  // Spawn beat: the Meeseeks "poofs in" and holds its idle pose in place before rushing.
  if (s.spawnBeat && (s.frame || 0) < s.spawnBeat) { s.vx = 0; return }

  const dx = s.target.x - s.x
  const direction = dx >= 0 ? 1 : -1
  s.facing = direction

  switch (s.behavior) {
    case "rush":
      s.vx = s.speed * direction
      s.x += s.vx
      break

    case "airDive":
      s.vx = s.speed * direction
      s.x += s.vx

      if (s.y > s.target.y - 80) {
        s.y -= s.speed * 1.5
      } else {
        s.y += s.speed * 2.2
      }
      break

    case "holdLine":
      if (Math.abs(dx) > 30) {
        s.vx = s.speed * direction
        s.x += s.vx
      } else {
        s.vx = 0
      }
      break

    case "screenSwarm":
      s.vx = s.speed * direction
      s.x += s.vx
      break

    case "heavyDrop":
      if (!s.dropStarted) {
        if (Math.abs(dx) > 20) {
          s.vx = s.speed * direction
          s.x += s.vx
        } else {
          s.dropStarted = true
          s.y = s.target.y - 140
        }
      } else {
        s.y += s.speed * 3
      }
      break

    default:
      s.vx = s.speed * direction
      s.x += s.vx
      break
  }
}

// ─────────────────────────────────────────────────────────────────
// ATTACK
// ─────────────────────────────────────────────────────────────────
function performSummonAttack(summon) {
  if (!summon || !summon.target) return
  if (summon.oneHit && summon.hasHit) return

  const summonRect = { x: summon.x, y: summon.y, w: summon.w, h: summon.h }
  const targetRect = {
    x: summon.target.x,
    y: summon.target.y,
    w: summon.target.w || 60,
    h: summon.target.h || 100
  }

  const overlap =
    summonRect.x < targetRect.x + targetRect.w &&
    summonRect.x + summonRect.w > targetRect.x &&
    summonRect.y < targetRect.y + targetRect.h &&
    summonRect.y + summonRect.h > targetRect.y

  const dx = summon.target.x - summon.x
  const dy = summon.target.y - summon.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (!overlap && distance >= 70) return

  applyScaledDamage(summon.target, summon.damage, { source: "summon" })
  summon.target.colorFlash = 6

  applySummonImpact(summon)
  summon.hasHit = true

  // BEAST BREATHING ASSIST — the partner-link hit participates in the OWNER's (Inosuke's) combo string,
  // just like a projectile hit (combat.resolveProjectileHitsMulti). A clean hit extends it (counter++ +
  // refresh the 90f drop timer); a block breaks it. Gated to the assist summon via bbaOwnerCombo.
  if (summon.bbaOwnerCombo && summon.owner) {
    if (summon.target.isBlocking) summon.owner.comboCounter = 0
    else { summon.owner.comboCounter = (summon.owner.comboCounter || 0) + 1; summon.owner.comboTimer = 90 }
  }

  if (summon.oneHit) {
    summon.lifetime = Math.min(summon.lifetime, 8)
  }
}

function applySummonImpact(summon) {
  if (!summon || !summon.target) return

  const target = summon.target
  const facing = summon.facing || summon.owner?.facing || 1

  target.hitstun = Math.max(target.hitstun || 0, summon.hitstun || 0)
  target.stunFrames = summon.hitstun || 0
  target.vx = (summon.knockbackX || 0) * facing
  target.vy = summon.knockbackY || 0

  if (summon.launch) {
    target.vy = -Math.abs(summon.launch)
    target.onGround = false
    target.isLaunched = true
  }

  if (summon.spike) {
    target.vy = Math.abs(summon.spike)
    target.onGround = false
    target.isLaunched = true
  }

  if (summon.restrain) {
    target.restrained = true
    target.restrainTimer = summon.restrainDuration || 36
    target.vx = 0
    target.vy = 0
  }

  if (summon.obscureVision) {
    target.obscured = true
    target.obscuredTimer = 48
  }
}

function cleanupSummonEffects(summon) {
  if (!summon || !summon.target) return

  if (
    summon.restrain &&
    summon.target.restrained &&
    (summon.target.restrainTimer || 0) <= 0
  ) {
    summon.target.restrained = false
  }
}

// ─────────────────────────────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────────────────────────────
// Lazy image cache for shikigami sprite sheets (Task 3).
const _summonImgCache = new Map()
function _summonImg(src) {
  if (!src) return null
  if (typeof Image === "undefined") return null
  let img = _summonImgCache.get(src)
  if (!img) { img = new Image(); img.src = src; _summonImgCache.set(src, img) }
  return img
}

// SKIN INHERITANCE (bug fix): resolve a clone's body sheet to the OWNER'S ACTIVE SKIN so the clone is visually
// identical to the fighter who spawned it — the identity-concealment / swap mechanic depends on it. Palette
// skins are pre-generated "<sheet>__<recolorTag>.png" files, and applySkin() stashes the current tag on
// owner._recolorTag. We use the variant ONLY once it has actually decoded; until then (or if it 404s for a char
// with no such variant, e.g. kakashi) we fall back to the BASE sheet — never a silhouette. Called each draw so
// a skin/transform swap is always reflected. tag null (default skin) → base sheet unchanged.
// The owner's active recolor TAG. Prefer the explicit _recolorTag (some skins set it), but MANY palette skins
// only set `animationData: recolorSkinAnim(...)` with NO recolorTag property (e.g. Hashirama "Forest Sovereign",
// Madara skins) — for those, derive the tag from the retagged sheet paths on the owner's live _skinAnim
// ("<base>__<tag>.png"). This is what makes the fix cover every recolor skin, not just the tagged ones.
function cloneSkinTag(owner) {
  if (owner && owner._recolorTag) return owner._recolorTag
  const anim = owner && owner._skinAnim
  if (anim) {
    for (const k of ["idle", "light", "heavy", "walk", "hurt"]) {
      const sh = anim[k] && anim[k].sheet
      const m = sh && String(sh).match(/__([A-Za-z0-9]+)\.png$/)
      if (m) return m[1]
    }
  }
  return null
}
function cloneSkinSheet(owner, baseSheet) {
  const tag = cloneSkinTag(owner)
  if (!tag || !baseSheet) return baseSheet
  const variant = baseSheet.replace(/\.png$/i, `__${tag}.png`)
  const vimg = _summonImg(variant)   // kicks off + caches the variant load
  return (vimg && vimg.complete && vimg.naturalWidth > 0) ? variant : baseSheet
}
// The sheet a clone will ACTUALLY render this frame (base sheet resolved through its owner's skin). Exposed for
// tests to assert a clone inherits the owner's skin without pixel-diffing.
export function cloneRenderSheet(s) {
  return (s && s.id === "shadowClone") ? cloneSkinSheet(s.owner, s.sheet) : (s && s.sheet) || null
}

// MIRROR RENDER — replay the OWNER'S exact last-drawn frame at the clone's position: frame-for-frame identical
// in EVERY pose, auto-inheriting skin/anchor/scale/filter. This is a pure READ-ONLY replay of the descriptor
// sprite.js already captured for its transition-ghost (owner.spriteHandler._lastRender) — so it triggers NONE of
// SpriteHandler.draw's side effects (no projectile/summon spawns on attack frames, no voice). The clone's draw
// is just the owner's draw shifted to the clone's position (same source rect + scaled dims + facing + filter).
// Returns true if it drew; false → caller falls back to the CLONE_BODY_SETS path (hurt-poof pose / non-sprite
// owners / owner not yet drawn this match).
function drawMirroredCloneFrame(ctx, s) {
  const owner = s.owner
  const lr = owner && owner.spriteHandler && owner.spriteHandler._lastRender
  if (!lr || !lr.sheet || !lr.sheet.complete || !lr.sheet.naturalWidth) return false
  const cloneDrawY = s.y + (lr.drawY - (owner.y ?? s.y))   // preserve the owner's sprite-top-minus-entity-y offset
  ctx.save()
  if (lr.filter && lr.filter !== "none") ctx.filter = lr.filter
  if ((lr.facing ?? 1) === -1) {
    ctx.scale(-1, 1)
    ctx.drawImage(lr.sheet, lr.sx, lr.sy, lr.dw, lr.dh, -s.x + lr.offsetX - lr.dstW, cloneDrawY, lr.dstW, lr.dstH)
  } else {
    ctx.drawImage(lr.sheet, lr.sx, lr.sy, lr.dw, lr.dh, s.x - lr.offsetX, cloneDrawY, lr.dstW, lr.dstH)
  }
  ctx.restore()
  s._renderH = lr.dstH; s._renderW = lr.dstW; s._renderScale = null   // diagnostic parity with the fallback path
  _mirrorRenderCount++
  return true
}
let _mirrorRenderCount = 0
export function getCloneMirrorRenderCount() { return _mirrorRenderCount }   // harness: prove the mirror path drew

export function drawSummons(ctx) {
  for (const s of activeSummons) {
    if (s.id === "shadowClone" && s._hidden) continue   // body stays hidden under the spawn smoke

    // MIRROR: a live clone of a real-sprite owner replays the owner's exact frame (full fidelity). Falls
    // through to the CLONE_BODY_SETS path for the hurt-poof pose, non-sprite owners, or before the owner's
    // first draw. This SUPERSEDES the per-owner skin/scale handling below (the replayed frame already carries
    // the owner's skin sheet + ×1.18 scale + form filter).
    if (s.id === "shadowClone" && s._state === "idle" && drawMirroredCloneFrame(ctx, s)) continue

    ctx.save()

    if (s.lifetime < 12) {
      ctx.globalAlpha = s.lifetime / 12
    }

    // SHIKIGAMI SPRITE HOOK (Task 3): if the summon carries a `sheet`, draw the
    // animated shikigami art (frame strip of `spriteFrames` cells, flipped to face
    // its target), else fall through to the procedural box below. Single-image
    // region crops set spriteFrames:1 → the whole image draws.
    // Meeseeks-style spawn beat: draw the idle "poof-in" pose for the first `spawnBeat`
    // frames, then the running-attack strip. Any summon without spawnSheet uses `sheet`.
    const inBeat    = s.spawnSheet && (s.frame || 0) < (s.spawnBeat || 0)
    let   sheetPath = inBeat ? s.spawnSheet : s.sheet
    // A shadow clone inherits its OWNER'S active skin sheet (so it's indistinguishable from the real body).
    if (!inBeat && s.id === "shadowClone") sheetPath = cloneSkinSheet(s.owner, sheetPath)
    const img = sheetPath ? _summonImg(sheetPath) : null
    if (img && img.complete && img.naturalWidth > 0) {
      const frames = (inBeat ? s.spawnFrames : s.spriteFrames) || 1
      const fw = (inBeat ? s.spawnW : s.spriteW) || (img.naturalWidth / frames)
      const fh = (inBeat ? s.spawnH : s.spriteH) || img.naturalHeight
      s._animT = (s._animT || 0) + 1
      const fi = Math.floor(s._animT / (s.spriteSpeed || 5)) % frames
      // The spawn/poof pose may carry its OWN scale (spawnScale) so a taller idle cell
      // renders at the same on-screen size as the run pose (no pop). Falls back to
      // spriteScale → every summon without spawnScale is unchanged.
      let sc = (inBeat && s.spawnScale) ? s.spawnScale : (s.spriteScale || 1)
      // A shadow clone must match the REAL fighter's on-screen size. The real fighter render multiplies its
      // spriteScale by GLOBAL_SPRITE_SCALE (sprite.js); the clone body scales were tuned BEFORE that +18% bump,
      // so without this a clone renders ~15% smaller than its owner (measured ratio 0.847 = 1/1.18). Applied to
      // clones ONLY — other summons (shikigami/toads) keep their own independently-tuned scales.
      if (s.id === "shadowClone") sc *= GLOBAL_SPRITE_SCALE
      const dw = fw * sc, dh = fh * sc
      if (s.id === "shadowClone") { s._renderH = dh; s._renderW = dw; s._renderScale = sc }   // DIAGNOSTIC: actual on-screen render size
      const cx = s.x + (s.w || 0) / 2, cy = s.y + (s.h || 0) / 2
      const dir = (s.facing || 1) < 0 ? -1 : 1
      ctx.translate(cx, cy); ctx.scale(dir, 1)
      // DECOY VISUAL TELL: clones get the subtle chakra-construct wash (unless no-tell mode is on).
      // Applies to the clone sprite draw only; ctx.restore() below clears the filter.
      if (s.id === "shadowClone" && _cloneTellEnabled) ctx.filter = CLONE_TELL_FILTER
      ctx.drawImage(img, (s.spriteSourceX || 0) + fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
      // SKIN TINT: a few skins tint DEFAULT art instead of swapping sheets (applySkin → owner.skinTint /
      // owner.tintColor). Wash the clone the same way (source-atop = only the body's opaque pixels) so those
      // skins match too. No-op when the owner has no tint (the common case).
      const cloneTint = s.id === "shadowClone" ? (s.owner?.tintColor || s.owner?.skinTint) : null
      if (cloneTint) {
        ctx.filter = "none"
        ctx.globalCompositeOperation = "source-atop"
        ctx.globalAlpha = (s.owner?.tintStrength || 0.42) * (s.lifetime < 12 ? s.lifetime / 12 : 1)
        ctx.fillStyle = cloneTint
        ctx.fillRect(-dw / 2, -dh / 2, dw, dh)
      }
      ctx.restore()
      continue
    }

    // Clone whose body sprite hasn't decoded yet — faint silhouette, no lifebar.
    if (s.id === "shadowClone") {
      ctx.globalAlpha = 0.45
      ctx.fillStyle = s.color || "#ffb400"
      ctx.fillRect(s.x, s.y, s.w, s.h)
      ctx.restore()
      continue
    }

    ctx.fillStyle = s.color || "#0ff"
    ctx.fillRect(s.x, s.y, s.w, s.h)

    const maxLifetime = s.duration || summonDefaults.duration
    const lifePct = maxLifetime > 0 ? s.lifetime / maxLifetime : 0

    ctx.globalAlpha = 0.7
    ctx.fillStyle = "rgba(0,0,0,0.4)"
    ctx.fillRect(s.x, s.y - 8, s.w, 4)
    ctx.fillStyle = s.color || "#0ff"
    ctx.fillRect(s.x, s.y - 8, s.w * Math.max(0, lifePct), 4)

    ctx.restore()
  }

  drawClonePuffs(ctx)   // clone spawn/dispel smoke, on top of the bodies
  drawWoodReleaseFx(ctx)   // Hashirama wood-clone log dispersal, on top of the bodies
  drawWaterCloneFx(ctx)    // Tobirama water-clone burst/ripple despawn FX, on top of the bodies
  drawCloneStrikeFx(ctx)   // clone lunge-strike impact sparks
}

// ─────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────
export function clearSummons() {
  activeSummons.length = 0
  clonePuffs.length = 0
  pendingCloneSpawns.length = 0   // drop any not-yet-spawned first-press clones on reset
}

// ═══════════════════════════════════════════════════════════════════
// SHADOW CLONES (Naruto) — BASIC version.
// Persistent lookalike bodies that MIMIC the owner's basic attacks, poof when hit
// once (or dispelled), and SPLIT the owner's chakra pool evenly across all bodies
// (a destroyed clone's share is LOST). Built on this summon list but with a
// clone-specific update/draw path (no rush, no auto-attack, no lifetime expiry).
// No independent AI yet — clones only mirror the owner.
// ═══════════════════════════════════════════════════════════════════
// PER-CHARACTER CLONE CAPACITY TIERS (spawn past cap = no-op). Personality-tuned:
//   HIGH  — Naruto (shadow-clone volume is his identity) & Hashirama (Mokuton mastery / area control).
//   LOWER — Minato: precision over volume — a few precisely-placed Flying-Raijin clones, never a swarm.
//   MID   — Tobirama: a technical genius (his kit is precise water jutsu + body-flicker), between the two.
const CLONE_CAP_DEFAULT = 3
// Stage 4 tiers: naruto/hashirama HIGH (swarm identity); minato/kakashi LOW (precision/feints); tobirama/
// itachi/hiruzen MID (technical / a few clones). boruto: a few clones, not his dad's swarm.
// madara: MID (3) — borrowed Mokuton (Hashirama's cells), a few wood clones, not Hashirama's full swarm.
const CLONE_CAP_BY_KEY = { naruto: 4, hashirama: 4, minato: 2, tobirama: 3, boruto: 3, kakashi: 2, itachi: 3, hiruzen: 3, madara: 3 }
function cloneCap(owner) { return CLONE_CAP_BY_KEY[String(owner?.rosterKey || "").toLowerCase()] ?? CLONE_CAP_DEFAULT }
export function getCloneCap(owner) { return cloneCap(owner) }   // harness / HUD
const CLONE_W = 70, CLONE_H = 120            // clone hurtbox = the destruction box
// SPAWN SPREAD (mirror formation): clones alternate to BOTH sides of the owner (even slots behind, odd slots in
// front, toward the enemy) at widening ranks, so they fan out around the owner instead of clustering in a tight
// trailing line — harder to clear with one attack, and a wider set of swap destinations. Facing-relative:
// "+forward" = toward the enemy. Tune these two numbers to taste. (Mirror captures this as the fixed offset.)
const CLONE_SPREAD_BASE = 120                // first rank's distance from the owner
const CLONE_SPREAD_GAP  = 130                // added distance per rank
const CLONE_POOF_FRAMES = 16                 // spawn/despawn smoke duration (matches clonePuff lifetime)
const CLONE_HURT_FRAMES = 24                 // frames the hit-recoil pose plays before the clone poofs out
// DECOY-SYSTEM movement (Stage 2): a spawned clone independently APPROACHES the opponent and HOLDS at
// spacing, so it reads as a mobile threat rather than a static prop. No damage/collision — its threat
// is the mind-game + the always-on hit-reveal rule. Shared by Naruto & Minato (one updateShadowClone).
const CLONE_MOVE_SPEED = 3                   // px/frame walk speed (readable, below a fighter's dash)
const CLONE_HOLD_DIST  = 96                  // stop this far (center-to-center) from the opponent

// ── CLONE BEHAVIOR AI (shared by ALL clone chars — one system, not four) ──────────────────────────
// A spawned clone is an ACTIVE threat, not a prop: it ADVANCES toward the opponent, LUNGE-STRIKES on a
// cadence (real modest damage), then RETREATS and re-spaces — an approach→strike→retreat dance the
// opponent must actually respect. Still dies in ONE hit (hit-reveal below) and costs the chakra-split,
// so it's a fair, self-limiting pressure tool (cap 3). All tunables here; balance = modest per-hit,
// gated by a cooldown, blockable, and destroyable.
const CLONE_ATK_RANGE    = 120   // center-to-center: approach to here, then strike
const CLONE_ATK_WINDUP   = 9     // frames of wind-up before the strike lands
const CLONE_ATK_STRIKE   = 8     // active lunge frames (hitbox live)
const CLONE_ATK_RECOVER  = 14    // recovery — the clone steps BACK to re-space
const CLONE_ATK_COOLDOWN = 42    // frames between attacks (~0.7s idle gap → whole cycle ≈ 1.2s)
const CLONE_ATK_DMG      = 16    // RAW per strike (→ ~10 EFF through the ×0.60 choke-point); modest by design
const CLONE_LUNGE_SPEED  = 7     // forward dash speed during the strike
const CLONE_ATK_REACH    = 86    // strike hitbox reach in front of the clone
// ★ DEFAULT OFF (bug fix): a clone must be INDISTINGUISHABLE from a neutral owner — the consciousness-swap /
// identity-concealment mechanic depends on it. So by default a clone is a STATIC decoy: it holds its position
// in idle and does NOT advance or attack on its own. It acts ONLY when the player explicitly drives it (barrage
// beats consume it, Clone Rush launches it, the swap trades into it). setCloneAggro(true) OPTS IN to the old
// autonomous "active decoy" AI (advance → lunge-strike) for training/observation, but that is no longer default.
let _cloneAggroEnabled = false   // was true; flipped — autonomous clone action broke concealment (see updateShadowClone)
export function setCloneAggro(on) { _cloneAggroEnabled = !!on }
export function isCloneAggro() { return _cloneAggroEnabled }
// OPTIONAL per-owner SPECIAL clone attack (registered by abilities.js → no import cycle). Called once on the
// strike beat with the clone entity; returns TRUE if it OWNS the attack (then the generic melee is skipped).
// Hashirama uses this to erupt a Mokuton TREE at the CLONE'S position instead of a punch (reusing the real
// tree tiers) — high capacity → many clones each planting a tree = battlefield-wide area control.
let _cloneSpecialAttack = null
export function setCloneSpecialAttack(fn) { _cloneSpecialAttack = (typeof fn === "function") ? fn : null }
// STANDING CLONE = ZERO TELL (confirmed design): the standing clone is a mixup/mind-games tool FIRST,
// so it renders GENUINELY INDISTINGUISHABLE from the real caster — same sheet, same scale, same colour,
// no tint/outline/HUD marker. The controlling player and the opponent both track the real one by memory
// and position only. This supersedes the old "learnable chakra-construct wash" tell, which is now OFF by
// default; the filter + toggle survive ONLY as a training/debug lever (setCloneTell). The hit-reveal rule
// is INDEPENDENT of this flag — a single hit always poofs a clone regardless of the tell setting.
const CLONE_TELL_FILTER = "saturate(0.72) brightness(1.07) hue-rotate(12deg)"
let _cloneTellEnabled = false
export function setCloneTell(on) { _cloneTellEnabled = !!on }
export function isCloneTell() { return _cloneTellEnabled }

// HIT-REVEAL via PROJECTILES — mirrors the melee hit-reveal in updateShadowClone so that ANY hit
// reveals a clone. Any projectile from the clone's ENEMY (not its owner) that overlaps the clone
// poofs it and is consumed (spent on the fake). Called each frame from the battle loop AFTER the
// real-fighter projectile resolution, so it never steals a hit meant for a real fighter.
export function revealClonesHitByProjectiles(projectiles) {
  if (!Array.isArray(projectiles) || !projectiles.length) return
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (!p || p.visualOnly || p.returning) continue
    const r = p.radius || p.size || (p.w && p.h ? Math.max(p.w, p.h) / 2 : 10)
    const pb = { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 }
    for (const s of activeSummons) {
      if (s.id !== "shadowClone" || s._state !== "idle" || s._hidden) continue
      if (p.owner === s.owner) continue            // an owner's own projectile never dispels their clone
      if (rectsOverlap(pb, getHurtbox(s))) {
        s._state = "hurt"; s._stateT = 0; setCloneSheet(s, "hurt")   // reveal → hurt→poof lifecycle
        projectiles.splice(i, 1)                    // consume the projectile (it hit the fake)
        break
      }
    }
  }
}

// HIT-REVEAL via MELEE — the AUTHORITATIVE way a clone takes a melee hit, and the fix for the
// "clones are hit-or-miss / not a real game object" problem. The OLD path was a retroactive
// self-check inside updateShadowClone (still present as a fallback), which runs during
// updateActiveSummons — a full combat step AFTER real hits already resolved in updatePlayerCombat.
// Sampling the attacker's short active-frame window at that late, wrong point in the frame is what
// dropped hits. This function is instead called from the main loop RIGHT AFTER each fighter's combat
// step (the same point resolveAttackHit fires for real fighters), so a clone is tested against the
// SAME freshly-computed hitbox, on the SAME frame, by the SAME math a real body is — reliably.
//
// FIGHTER-PRIORITY: if the swing already connected on a real fighter this attack (currentAttack.hasHit),
// we do nothing — a clone can never steal a hit meant for the opponent, so combos on the real target are
// untouched. Otherwise the FIRST overlapping live clone poofs and the swing is marked spent on the fake
// (hasHit = true), mirroring how the projectile path CONSUMES the projectile — one swing pops at most one
// decoy, and you "waste" your attack on the fake, which is the whole point of a decoy.
export function revealClonesHitByMelee(attacker) {
  if (!attacker || !attackIsActive(attacker.currentAttack)) return
  if (attacker.currentAttack.hasHit) return          // already hit a real fighter → never steal that hit
  const hb = getAttackHitbox(attacker)
  if (!hb) return
  for (const s of activeSummons) {
    if (s.id !== "shadowClone" || s._state !== "idle" || s._hidden) continue
    if (s.owner === attacker) continue               // your own swing never pops your own clones
    if (rectsOverlap(hb, getHurtbox(s))) {
      s._state = "hurt"; s._stateT = 0; setCloneSheet(s, "hurt")   // reveal → hurt→poof lifecycle
      attacker.currentAttack.hasHit = true            // swing spent on the fake (mirrors projectile consume)
      return
    }
  }
}

// Clone body sprites — PER OWNER, so the shadow-clone system (shared) renders each
// summoner's own clone art rather than a hardcoded Naruto body. Each owner REUSES its
// own strips (no new art). Falls back to Naruto's set for any owner without an entry.
//   naruto: idle = naruto_kcm_stance.png,          hurt = naruto_kcm_taking_damage.png
//   minato: idle = minato_idle_uniform (standing clone body), hurt = minato_hit
//           (NOT shadow_clone_justu — that art is the CASTER's summon hand-sign; see below)
const CLONE_BODY_SETS = {
  // Each owner also has an `attack` pose (its own basic-attack sheet) played during the clone's
  // autonomous lunge-strike (updateShadowClone behavior AI). Falls back to idle if ever absent.
  naruto: {
    idle:   { sheet: "./naruto_kcm_stance.png",        frames: 4, w: 36, h: 63, speed: 6, scale: 2.0 },
    hurt:   { sheet: "./naruto_kcm_taking_damage.png", frames: 4, w: 46, h: 55, speed: 6, scale: 2.0 },
    attack: { sheet: "./naruto_kcm_b_attack.png",      frames: 4, w: 52, h: 53, speed: 3, scale: 2.0 },
    // VARIED clone repertoire — the clone rotates through several of Naruto's REAL normals per swing
    // (jab → forward → up), each with its own reach/damage, instead of one canned lunge. All source-Y 0
    // (the clone draw path can't crop source-Y), so y_attack (needs sourceY 12) is intentionally omitted.
    attacks: [
      { sheet: "./naruto_kcm_b_attack.png",         frames: 4, w: 52, h: 53, speed: 3, scale: 2.0, reach: 84,  dmg: 13, name: "jab" },
      { sheet: "./naruto_kcm_b_forward_attack.png", frames: 5, w: 58, h: 47, speed: 3, scale: 2.0, reach: 100, dmg: 17, name: "forward" },
      { sheet: "./naruto_kcm_b_up_attack.png",      frames: 7, w: 51, h: 53, speed: 3, scale: 2.0, reach: 82,  dmg: 15, name: "up" }
    ]
  },
  minato: {
    // Clone BODY = Minato's own standing IDLE (mirrors Naruto's kcm_stance clone body). NOT the
    // shadow_clone_justu sheet — that art is the CASTER's summon hand-sign and now plays on Minato
    // himself (characters.js minatoCloneCast). Fixes "clones perform the summon gesture" bug.
    idle:   { sheet: "./minato_idle_uniform.png",         frames: 4, w: 37, h: 64, speed: 6, scale: 1.7 },
    hurt:   { sheet: "./minato_hit_uniform.png",          frames: 3, w: 63, h: 42, speed: 6, scale: 1.7 },
    attack: { sheet: "./minato_foward_kick_uniform.png",  frames: 4, w: 59, h: 71, speed: 3, scale: 1.7 },
    // VARIED — Minato's real normals: quick kick → spinning tornado kick → rising kunai slash.
    attacks: [
      { sheet: "./minato_foward_kick_uniform.png",   frames: 4, w: 59, h: 71, speed: 3, scale: 1.7, reach: 86,  dmg: 14, name: "kick" },
      { sheet: "./minato_twornado_kick_uniform.png", frames: 8, w: 69, h: 60, speed: 3, scale: 1.7, reach: 98,  dmg: 17, name: "tornado" },
      { sheet: "./minato_up_attack_uniform.png",     frames: 6, w: 59, h: 68, speed: 3, scale: 1.7, reach: 82,  dmg: 15, name: "up" }
    ]
  },
  hashirama: {
    // Wood-clone BODY = Hashirama's own standing IDLE — a believable decoy that looks like him (the
    // wood_clone_intro sheet is the CASTER's forming gesture, so it plays on Hashirama, not the clone).
    // sourceX 56 skips the idle sheet's blank cell-0 gutter (frames = the 5 real breathing cells 1..5).
    idle:   { sheet: "./hashirama_idle_uniform.png",          frames: 5, sourceX: 56, w: 56, h: 70, speed: 6, scale: 1.55 },
    hurt:   { sheet: "./hashirama_hit_uniform.png",           frames: 2, w: 59, h: 74, speed: 6, scale: 1.55 },
    attack: { sheet: "./hashirama_foward_punch_uniform.png",  frames: 5, w: 76, h: 79, speed: 3, scale: 1.55 },
    // VARIED — Hashirama's real normals: wood-fist punch → roundhouse kick → punch-combo → long straight.
    // (His Mokuton TREE special still fires on some swings via _cloneSpecialAttack; see beginCloneSwing.)
    attacks: [
      { sheet: "./hashirama_foward_punch_uniform.png",  frames: 5, w: 76, h: 79, speed: 3, scale: 1.55, reach: 90,  dmg: 16, name: "punch" },
      { sheet: "./hashirama_kick_uniform.png",          frames: 6, w: 79, h: 75, speed: 3, scale: 1.55, reach: 98,  dmg: 17, name: "kick" },
      { sheet: "./hashirama_punch_combo_1_uniform.png", frames: 9, w: 73, h: 74, speed: 3, scale: 1.55, reach: 90,  dmg: 16, name: "combo" },
      { sheet: "./hashirama_punch_2_uniform.png",       frames: 3, w: 76, h: 75, speed: 4, scale: 1.55, reach: 106, dmg: 15, name: "straight" }
    ]
  },
  tobirama: {
    // Water-clone BODY = Tobirama's own standing IDLE (Mizu Bunshin decoy that looks like him). The
    // DESTROYED-by-hit dissolve vs DISMISSED dispersal are distinct water FX (spawnCloneDespawnFx).
    idle:   { sheet: "./tobirama_idle_uniform.png",              frames: 4, w: 39, h: 90, speed: 6, scale: 1.3 },
    hurt:   { sheet: "./tobirama_hit_uniform.png",               frames: 1, w: 84, h: 84, speed: 6, scale: 1.3 },
    attack: { sheet: "./tobirama_foward_water_slash_uniform.png",frames: 6, w: 82, h: 85, speed: 3, scale: 1.3 },
    // VARIED — Tobirama's real normals: water slash → combo opener → water-infused combo → low kick.
    attacks: [
      { sheet: "./tobirama_foward_water_slash_uniform.png", frames: 6, w: 82, h: 85, speed: 3, scale: 1.3, reach: 90, dmg: 16, name: "slash" },
      { sheet: "./tobirama_attack_combo_1_uniform.png",     frames: 7, w: 65, h: 90, speed: 3, scale: 1.3, reach: 86, dmg: 15, name: "combo1" },
      { sheet: "./tobirama_attack_combo_2_uniform.png",     frames: 8, w: 88, h: 89, speed: 3, scale: 1.3, reach: 98, dmg: 17, name: "combo2" },
      { sheet: "./tobirama_low_kick_uniform.png",           frames: 4, w: 72, h: 90, speed: 3, scale: 1.3, reach: 82, dmg: 13, name: "lowkick" }
    ]
  },
  boruto: {
    // Clone BODY = Boruto's own standing IDLE (a decoy that looks like him). The boruto_clone_uniform sheet
    // is the CASTER's summon-seal gesture (plays on Boruto via CLONE_CAST_POSE), NOT the clone body. scale 1.5
    // matches his ~105px fighter render. Stage 4 — Boruto is a genuine canonical shadow-clone user.
    idle:   { sheet: "./boruto_idle_uniform.png",  frames: 12, w: 52, h: 72, speed: 6, scale: 1.5 },
    hurt:   { sheet: "./boruto_hurt_uniform.png",  frames: 3,  w: 52, h: 78, speed: 5, scale: 1.5 },
    attack: { sheet: "./boruto_light_uniform.png", frames: 8,  w: 73, h: 82, speed: 2, scale: 1.5 },
    // VARIED — Boruto's real normals: 2-hit punch/kick light string → strong forward punch → uppercut.
    attacks: [
      { sheet: "./boruto_light_uniform.png", frames: 8, w: 73, h: 82, speed: 2, scale: 1.5, reach: 90,  dmg: 14, name: "light" },
      { sheet: "./boruto_heavy_uniform.png", frames: 4, w: 71, h: 70, speed: 3, scale: 1.5, reach: 100, dmg: 17, name: "heavy" },
      { sheet: "./boruto_up_uniform.png",    frames: 3, w: 76, h: 66, speed: 3, scale: 1.5, reach: 82,  dmg: 15, name: "up" }
    ]
  },
  kakashi: {
    // Copy-ninja clones — his own body + real normals. Scale ~1.65 matches his ~110px fighter render. Stage 4.
    idle:   { sheet: "./kakashi_idle_uniform.png",  frames: 6, w: 43, h: 67, speed: 6, scale: 1.65 },
    hurt:   { sheet: "./kakashi_hurt_uniform.png",  frames: 2, w: 53, h: 54, speed: 6, scale: 1.65 },
    attack: { sheet: "./kakashi_light_uniform.png", frames: 2, w: 50, h: 55, speed: 3, scale: 1.65 },
    // VARIED — Kakashi's real normals: kunai draw-slash → sweeping kick → rising overhead kick.
    attacks: [
      { sheet: "./kakashi_light_uniform.png", frames: 2, w: 50, h: 55, speed: 3, scale: 1.65, reach: 96,  dmg: 14, name: "kunai" },
      { sheet: "./kakashi_heavy_uniform.png", frames: 3, w: 56, h: 64, speed: 4, scale: 1.65, reach: 100, dmg: 17, name: "kick" },
      { sheet: "./kakashi_up_uniform.png",    frames: 5, w: 50, h: 80, speed: 4, scale: 1.65, reach: 82,  dmg: 15, name: "up" }
    ]
  },
  itachi: {
    // Uchiha feint clones — his own body + blade normals. hurt reuses his block sheet (as his fighter does).
    // Scale ~1.5 matches his ~110px fighter. anchorY offsets on his source art aren't applied by the clone
    // draw path (source-Y 0 only), so a clone may sit a hair low vertically — cosmetic, same as every owner.
    idle:   { sheet: "./itachi_melle_idle_uniform.png",          frames: 4, w: 42, h: 73, speed: 6, scale: 1.5 },
    hurt:   { sheet: "./itachi_melle_block_uniform.png",         frames: 1, w: 38, h: 72, speed: 6, scale: 1.5 },
    attack: { sheet: "./itachi_melle_foward_attack_uniform.png", frames: 4, w: 85, h: 65, speed: 5, scale: 1.5 },
    // VARIED — Itachi's real normals: quick low poke → committed wide blade swing → rising slash.
    attacks: [
      { sheet: "./itachi_melle_low_attack_uniform.png",    frames: 5, w: 54, h: 81, speed: 3, scale: 1.5, reach: 90,  dmg: 14, name: "low" },
      { sheet: "./itachi_melle_foward_attack_uniform.png", frames: 4, w: 85, h: 65, speed: 5, scale: 1.5, reach: 104, dmg: 17, name: "blade" },
      { sheet: "./itachi_melle_up_attack_uniform.png",     frames: 4, w: 63, h: 72, speed: 6, scale: 1.5, reach: 82,  dmg: 15, name: "up" }
    ]
  },
  hiruzen: {
    // "The Professor" clones — his own body + punch normals sliced from hiruzen_punches_uniform via sourceX
    // (the clone draw path supports sourceX, like Hashirama's idle gutter). Scale ~2.0 keeps him short (the
    // small old Third Hokage). His attack strips share one sheet at sourceX 0 / 300 / 360.
    idle:   { sheet: "./hiruzen_idle_uniform.png",    frames: 4, w: 63, h: 42, speed: 8, scale: 2.0 },
    hurt:   { sheet: "./hiruzen_hit_uniform.png",     frames: 2, w: 55, h: 46, speed: 5, scale: 2.0 },
    attack: { sheet: "./hiruzen_punches_uniform.png", frames: 7, w: 60, h: 43, speed: 3, scale: 2.0 },
    // VARIED — Hiruzen's real punch strips: full punch combo → wide finisher → widest swing.
    attacks: [
      { sheet: "./hiruzen_punches_uniform.png", frames: 7, w: 60, h: 43, speed: 3, scale: 2.0, sourceX: 0,   reach: 92,  dmg: 14, name: "punches" },
      { sheet: "./hiruzen_punches_uniform.png", frames: 2, w: 60, h: 43, speed: 4, scale: 2.0, sourceX: 300, reach: 100, dmg: 17, name: "finisher" },
      { sheet: "./hiruzen_punches_uniform.png", frames: 1, w: 60, h: 43, speed: 4, scale: 2.0, sourceX: 360, reach: 82,  dmg: 15, name: "swing" }
    ]
  },
  madara: {
    // WOOD clones (Mokuton Bunshin via Hashirama's cells) — his own body + gunbai normals. They revert to
    // LOGS on despawn (spawnCloneDespawnFx owner gate includes madara), like Hashirama's wood clones. Scale
    // ~1.8 matches his ~112px fighter. Stage 4 (canonically post-cells; a few clones, cap 3, not a swarm).
    idle:   { sheet: "./madara2_idle_1_uniform.png", frames: 4, w: 26, h: 62, speed: 6, scale: 1.8 },
    hurt:   { sheet: "./madara2_hit_uniform.png",    frames: 1, w: 64, h: 60, speed: 6, scale: 1.8 },
    attack: { sheet: "./madara2_slap_uniform.png",   frames: 4, w: 36, h: 62, speed: 3, scale: 1.8 },
    // VARIED — Madara's real normals: quick gunbai swipe → committed swipe→palm string → rising gunbai slash.
    attacks: [
      { sheet: "./madara2_slap_uniform.png",     frames: 4, w: 36, h: 62, speed: 3, scale: 1.8, reach: 90,  dmg: 14, name: "swipe" },
      { sheet: "./madara2_combo_1_uniform.png",  frames: 9, w: 50, h: 62, speed: 3, scale: 1.8, reach: 104, dmg: 17, name: "combo" },
      { sheet: "./madara2_up_attack_uniform.png",frames: 5, w: 45, h: 62, speed: 3, scale: 1.8, reach: 82,  dmg: 15, name: "up" }
    ]
  }
}

// SINGLE SOURCE OF TRUTH for which characters have the shadow-clone mechanic. Every clone binding (the
// ",": create / ".": disperse hotkeys, spawnP1Clones, etc.) gates on THIS set — so the control is
// identical across all clone characters and can never drift per-character again.
export const CLONE_CAPABLE_KEYS = new Set(["naruto", "minato", "hashirama", "tobirama", "boruto", "kakashi", "itachi", "hiruzen", "madara"])
export function isCloneCapable(fighter) {
  return !!fighter && CLONE_CAPABLE_KEYS.has(String(fighter.rosterKey || fighter.id || "").toLowerCase())
}
function setCloneSheet(s, mode) {
  const set = CLONE_BODY_SETS[(s.owner?.rosterKey || "").toLowerCase()] || CLONE_BODY_SETS.naruto
  const c = set[mode] || set.idle
  s.sheet = c.sheet; s.spriteFrames = c.frames; s.spriteW = c.w; s.spriteH = c.h
  s.spriteSourceX = c.sourceX || 0                                   // leading-gutter offset (Hashirama idle cell-0 is blank)
  s.spriteSpeed = c.speed; s.spriteScale = c.scale; s._animT = 0
}

// ── VARIED CLONE ATTACKS ──────────────────────────────────────────────────────────────────────
// The clone rotates through several of its owner's REAL normals (CLONE_BODY_SETS[owner].attacks)
// instead of repeating one canned lunge — so it reads as an actual character throwing different
// moves. Each move carries its own reach + damage. Rotation is DETERMINISTic (no RNG → replay-safe):
// a per-clone swing counter offset by the clone's spawn slot, so a swarm shows different moves at once.
function cloneAttackList(s) {
  const set = CLONE_BODY_SETS[(s.owner?.rosterKey || "").toLowerCase()] || CLONE_BODY_SETS.naruto
  if (Array.isArray(set.attacks) && set.attacks.length) return set.attacks
  const a = set.attack || set.idle                                   // fallback: single legacy attack sheet
  return [{ sheet: a.sheet, frames: a.frames, w: a.w, h: a.h, speed: a.speed, scale: a.scale, sourceX: a.sourceX || 0, reach: CLONE_ATK_REACH, dmg: CLONE_ATK_DMG, name: "attack" }]
}
function applyCloneAttackSheet(s, m) {
  s.sheet = m.sheet; s.spriteFrames = m.frames; s.spriteW = m.w; s.spriteH = m.h
  s.spriteSourceX = m.sourceX || 0                                   // source-Y is fixed 0 in the clone draw path (see draw loop)
  s.spriteSpeed = m.speed; s.spriteScale = m.scale; s._animT = 0
}
// Begin one swing: pick the next varied melee move, apply its sheet, and decide whether THIS swing is
// the owner's SPECIAL clone attack (Hashirama's Mokuton tree) instead of melee. The tree is Hashirama's
// signature area-control identity, so it ALTERNATES with melee (odd swings = tree, even = varied punch/
// kick/combo) — frequent enough to stay his, but no longer the ONLY thing his clone ever does.
// Non-Hashirama owners have no special (fn self-guards → false) → they always do the varied melee.
function beginCloneSwing(s) {
  const list = cloneAttackList(s)
  const idx = (((s._slot || 0) + (s._swing || 0)) % list.length + list.length) % list.length
  s._swing = (s._swing || 0) + 1
  s._atkMove = list[idx]
  applyCloneAttackSheet(s, s._atkMove)
  s._wantSpecial = !!_cloneSpecialAttack && ((s._swing % 2) === 1)   // Hashirama tree on alternating swings; melee otherwise
}

export function countShadowClones(owner) {
  return activeSummons.filter(s => s.id === "shadowClone" && s.owner === owner).length
}

// Lose ONE even chakra share as a clone is destroyed. Called while the clone is
// STILL in activeSummons, so bodies = 1 (Naruto) + clones counts it; share =
// energy/bodies; the destroyed clone's share is removed (never returned).
function loseCloneShare(owner) {
  if (!owner) return
  const bodies = 1 + countShadowClones(owner)     // includes the clone being destroyed
  if (bodies > 1) owner.energy = Math.max(0, (owner.energy || 0) * (bodies - 1) / bodies)
}

// ── CLONE SUMMON AUDIO/VISUAL SEQUENCING ─────────────────────────────────────
// The hand-sign/jutsu clip (naruto_clone_summon.mp3) is ~4.55s long; its "poof"
// transient (MEASURED from the waveform) lands at ~2.45s. So the FIRST press opens a
// summon-audio WINDOW for the full clip length, plays the clip ONCE, does a short camera
// beat, and DELAYS the visual clone spawn to the poof moment so the smoke/body land with
// the sound. Repeat presses inside the window spawn extra clones immediately + SILENTLY
// (no audio restart / overlap). When the window elapses, the next press starts fresh.
// Chakra-split / cap / lifecycle are untouched — spawnShadowClone still owns all of that.
const CLONE_SUMMON_WINDOW_FRAMES = 273   // 4.55s @60fps — full clip length (the audio window)
const CLONE_SUMMON_POOF_FRAMES   = 147   // 2.45s @60fps — poof transient (visual spawn sync point)
const pendingCloneSpawns = []            // first-press spawns delayed to the poof; ticked in updateSummons

// Per-character clone-forming CASTER gesture, played on the summoner when they create a clone (any path,
// i.e. the standardized "," hotkey). Centralized here so the flair survives now that the old per-character
// directional spawn routes are gone. Naruto has none (its summon is audio-synced, no dedicated pose).
const CLONE_CAST_POSE = { minato: "minatoCloneCast", hashirama: "woodCloneCast", boruto: "borutoClone", madara: "madaraWoodSpikeCast" }

export function summonShadowClone(owner, target, opts = {}) {
  if (!owner) return false
  // Caster's summon gesture (flair) — moved here from the removed D→F / double-QCF routes so it plays on
  // the "," spawn too. Set on every press (harmless to re-assert); Naruto has no entry.
  const _castPose = CLONE_CAST_POSE[String(owner.rosterKey || "").toLowerCase()]
  if (_castPose) { owner._spriteCastMove = _castPose; owner._spriteCastTimer = 16 }
  // REPEAT inside an active window → spawn NOW, silently (no audio, no camera beat).
  if ((owner._cloneSummonWindow || 0) > 0) return !!spawnShadowClone(owner, target)
  // FIRST press: already at cap → nothing at all (preserves existing behavior; no audio/window).
  if (countShadowClones(owner) >= cloneCap(owner)) return false
  // Open the window and run the caller's short camera beat.
  owner._cloneSummonWindow = CLONE_SUMMON_WINDOW_FRAMES
  const hasSummonAudio = owner.rosterKey === "naruto"
  if (hasSummonAudio) sound.playSfxFile?.("naruto_clone_summon.mp3", null)
  if (typeof opts.onFocus === "function") { try { opts.onFocus() } catch (_) {} }
  if (hasSummonAudio) {
    // Naruto ONLY: delay the visual entity + puff to the audio poof frame (~2.45s) so the smoke/body
    // land with the hand-sign clip.
    pendingCloneSpawns.push({ owner, target, framesLeft: CLONE_SUMMON_POOF_FRAMES })
  } else {
    // No clone-summon audio (e.g. Minato) → spawn NOW. There is no clip to sync to, and a 2.45s
    // SILENT delay with nothing on screen reads as "the button does nothing" (the reported Minato bug).
    spawnShadowClone(owner, target)
  }
  return true
}

// SPAWN — cap-limited (over cap → no-op, returns null). No upfront chakra cost:
// the "cost" is the split (each new body lowers everyone's share). Puffs on spawn.
export function spawnShadowClone(owner, target, spawnAt = null) {
  if (!owner) return null
  if (countShadowClones(owner) >= cloneCap(owner)) return null   // per-char CAP behavior: do nothing
  const facing = owner.facing || 1
  const slot = countShadowClones(owner)   // 0,1,2 as bodies are added → staggers spawn + hold so decoys don't stack
  // Flanking spread: even slots BEHIND the owner, odd slots IN FRONT (toward the enemy), each rank further out.
  // slot 0→-120, 1→+120, 2→-250, 3→+250 (× facing). Fans the formation out on both sides instead of a tight line.
  const spreadForward = (slot % 2 === 0 ? -1 : 1) * (CLONE_SPREAD_BASE + Math.floor(slot / 2) * CLONE_SPREAD_GAP)
  const s = {
    id: "shadowClone", owner, target,
    w: CLONE_W, h: CLONE_H, vx: 0,
    _slot: slot,
    // Mobile decoy: spawns beside the owner (staggered per slot so multiple decoys are distinct), then
    // independently approaches the opponent and holds at spacing (updateShadowClone). Subject to gravity.
    // spawnAt overrides the position (Minato's Flying Raijin Clones materialize AT his kunai marks).
    x: spawnAt ? spawnAt.x : owner.x + facing * spreadForward, y: spawnAt ? (spawnAt.y ?? owner.y ?? 0) : (owner.y || 0),
    // Gravity/ground-collision fields, same contract fighters use. groundY inherits the
    // owner's floor (== the stage groundY) so the clone rests exactly where Naruto would;
    // applyGravity falls back to physics.groundY if it's ever absent.
    vy: 0, groundY: owner.groundY, onGround: false,
    facing, lifetime: Infinity,        // persists until hit or dispelled
    _state: "spawn", _stateT: 0, _hidden: true, color: "#ffb400"
  }
  setCloneSheet(s, "idle")
  activeSummons.push(s)
  spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)   // spawn-in smoke; body reveals once it clears
  // NOTE: the summon SFX is NOT played here anymore — it's played ONCE per audio window in
  // summonShadowClone (so rapid presses / delayed spawns never restack the clip). This
  // function is now purely the entity+puff spawn (called delayed for a first press, or
  // immediately for a repeat within the window).
  return s
}

// DISPEL — intentional recall: poof every clone WITHOUT calling loseCloneShare,
// so the shared pool is untouched and each removed body's split folds back into
// the survivors (dispel all → owner's bar returns to full). This is the tactical
// asymmetry vs. a clone DESTROYED in combat (updateSummons → loseCloneShare),
// which permanently removes that share. Recall = safe; getting hit = lossy.
export function dispelShadowClones(owner) {
  let n = 0
  for (let i = activeSummons.length - 1; i >= 0; i--) {
    const s = activeSummons[i]
    if (s && s.id === "shadowClone" && s.owner === owner) {
      spawnCloneDespawnFx(s, "dispel")   // dismissed on purpose → dispel FX (Tobirama: water RIPPLE)
      activeSummons.splice(i, 1); n++
    }
  }
  // Same DESPAWN cue as a hit-pop, fired ONCE for the dispel action (recall pops all at
  // once). Naruto-only. This covers both the "." debug key and the D→B dispel input.
  if (n > 0 && owner?.rosterKey === "naruto") sound.playSfxFile("naruto_clone_cancel.mp3", null)
  return n
}

// CONSUME up to `n` of owner's clones as a COMBO cost (the multi-clone combo tier spends
// clones to land guaranteed hits / no-sell incoming attacks). Unlike dispel (safe recall),
// each consumed body is LOSSY — loseCloneShare removes its chakra share, same as a clone
// destroyed in combat. Poofs each and returns the {x,y,w,h} spots consumed (length = count).
export function consumeShadowClones(owner, n = 1) {
  const spots = []
  for (let i = activeSummons.length - 1; i >= 0 && spots.length < n; i--) {
    const s = activeSummons[i]
    if (s && s.id === "shadowClone" && s.owner === owner) {
      loseCloneShare(owner)                          // lose this body's share (lossy, like a hit)
      spawnCloneDespawnFx(s, "consume")                // spent as combo cost → consume FX (Tobirama: water RIPPLE)
      spots.push({ x: s.x, y: s.y, w: s.w, h: s.h })
      activeSummons.splice(i, 1)
    }
  }
  return spots
}

// CONSCIOUSNESS-SWAP (Kage Shunshin body-swap) — Stage 3. A POSITIONAL IDENTITY TRADE: the owner and one of
// their live clones INSTANTLY swap places, so the body an opponent just hit turns out to have been the fake
// ("that was never me") while the real fighter is now standing where a clone was. TRUE-BLIND by design — the
// bodies are already indistinguishable (setCloneTell off = the default), and the swap fires SYMMETRIC puffs at
// BOTH spots so nothing on screen reveals which is real; the controlling player must track their own placement.
// It is a pure TRADE — clone COUNT is PRESERVED (the old body becomes the standing decoy) — so the limiter is
// the caller's cooldown + needing a well-placed clone, NOT a clone-share cost. Counterplay ties straight into
// Stage 1: an opponent who destroys your clones (now reliably hittable) removes your swap destinations.
// Deterministic (no RNG → replay-safe): picks the clone FARTHEST from the opponent — the safest body to become.
// Returns the clone swapped INTO (success), or null if the owner has no live, fully-materialized clone to swap
// with (spawning/poofing bodies don't count — they aren't a real standing position yet).
export function swapConsciousnessWithClone(owner, opponent = null) {
  if (!owner) return null
  const live = activeSummons.filter(s => s.id === "shadowClone" && s.owner === owner && s._state === "idle" && !s._hidden)
  if (!live.length) return null
  const refX = opponent ? (opponent.x + (opponent.w || 0) / 2) : (owner.x + (owner.w || 0) / 2)
  let clone = live[0], bestD = -1
  for (const s of live) {
    const d = Math.abs((s.x + (s.w || 0) / 2) - refX)
    if (d > bestD) { bestD = d; clone = s }          // farthest from the opponent (deterministic tie-break: first found)
  }
  // TRADE positions: owner takes the clone's spot; the clone takes the owner's old spot and resumes as a normal
  // decoy from there. Momentum is killed so it reads as a clean body-flicker, not a slide.
  const oldX = owner.x, oldY = owner.y
  owner.x = clone.x; owner.y = clone.y; owner.vx = 0; owner.vy = 0; owner.onGround = false
  clone.x = oldX;    clone.y = oldY
  clone._atk = null; clone._atkT = 0; clone._atkCd = CLONE_ATK_COOLDOWN; clone.vx = 0   // clear any in-progress lunge so it doesn't strike mid-teleport
  if (opponent) { owner.facing = (opponent.x >= owner.x) ? 1 : -1; clone.facing = (opponent.x >= clone.x) ? 1 : -1 }
  // SYMMETRIC swap FX at both spots (true-blind: identical puffs → no tell which body is the real one).
  owner.teleportFlash = Math.max(owner.teleportFlash || 0, 14)
  spawnClonePuff(owner.x + (owner.w || 0) / 2, owner.y + (owner.h || 100) / 2)
  spawnClonePuff(clone.x + (clone.w || 0) / 2, clone.y + (clone.h || 100) / 2)
  // The owner relocated, so every mirror clone's offset is now stale — clear it so each recaptures its offset
  // from the NEW owner position next frame (keeps them visually where they are and tracking the new body).
  for (const c of activeSummons) if (c.id === "shadowClone" && c.owner === owner) c._mirrorDx = null
  return clone
}

// Per-frame clone logic — an ACTIVE, VARIED combatant (not a static decoy): it advances, then
// rotates through several of its owner's REAL normals (beginCloneSwing → CLONE_BODY_SETS.attacks),
// each with its own reach/damage, and still dies in one hit. Lifecycle:
//   spawn-poof (body hidden) → approach/varied-strike loop → (hit) hurt-recoil → poof → removed.
// Returns "destroy" (poof + lose share, fired at the END of the hurt pose),
// "remove" (owner gone), or null.
function updateShadowClone(s) {
  const owner = s.owner, enemy = s.target
  if (!owner) return "remove"

  // MIRROR MODE — when the owner renders through the real sprite pipeline (has a spriteHandler), the clone is a
  // full MIRROR: it rigidly tracks the owner at a fixed offset (moves/jumps in lockstep) and drawSummons replays
  // the owner's exact drawn frame — so it's indistinguishable in EVERY pose, not just idle. Player-driven (the
  // owner moves because the player does), never autonomous. Supersedes the static/aggro branches for sprite
  // owners; non-sprite (procedural-box) owners fall through to the old gravity + static path.
  const mirror = !!owner.spriteHandler
  if (mirror) {
    if (s._mirrorDx == null) { s._mirrorDx = s.x - owner.x; s._mirrorDy = s.y - owner.y }   // capture the spawn offset once
    if (s._state === "idle" && !s._mirrorPinned) {   // spawning/hurt/PINNED bodies hold position; a live one tracks the owner
      s.x = owner.x + s._mirrorDx
      s.y = owner.y + s._mirrorDy
      s.facing = owner.facing || 1
      s.onGround = owner.onGround ?? true
    }
  } else {
    if (enemy) s.facing = (enemy.x >= s.x) ? 1 : -1   // non-mirror decoy faces the enemy
    // Gravity + ground collision — reuse the fighters' resolver so a non-mirror clone falls to the stage floor.
    physics.applyGravity(s)
  }

  // SPAWN — stay hidden behind the spawn smoke, then reveal the idle body.
  if (s._state === "spawn") {
    if (++s._stateT >= CLONE_POOF_FRAMES) {
      s._state = "idle"; s._hidden = false; setCloneSheet(s, "idle")
    }
    return null
  }

  // HURT — hold the hit-recoil pose, then poof out (updateSummons does the removal).
  if (s._state === "hurt") {
    if (++s._stateT >= CLONE_HURT_FRAMES) return "destroy"
    return null
  }

  // MIRROR clones already had position + facing set above (they mimic the owner) — no behavior branch runs.
  // Only NON-mirror (procedural-box) owners reach the aggro/static decoy logic below.
  // ── OPT-IN ACTIVE BEHAVIOR AI (advance → LUNGE-STRIKE → retreat) — ONLY when setCloneAggro(true). ──
  // The OLD autonomous "active decoy" behavior, flag-gated for training/observation. By default clones are
  // static/mirrored (identity concealment); a clone acting on its own would give away which body is real.
  if (mirror) {
    /* position, facing, and pose all mirror the owner — nothing autonomous to do here */
  } else if (enemy && !enemy.eliminated && _cloneAggroEnabled) {
    const oppCx = enemy.x + (enemy.w || 0) / 2, cloneCx = s.x + s.w / 2
    const dx = oppCx - cloneCx
    s.facing = dx >= 0 ? 1 : -1
    if ((s._atkCd || 0) > 0) s._atkCd--

    if (s._atk === "windup") {
      s.vx = 0
      if (++s._atkT >= CLONE_ATK_WINDUP) {
        s._atk = "strike"; s._atkT = 0; s._atkHit = false
        // SPECIAL clone attack (Hashirama: plant a tree at the clone's position). Only on swings flagged by
        // beginCloneSwing (every 3rd) so the varied melee still shows; if it owns the swing, the clone holds
        // and the tree does the work — the melee is skipped. Non-Hashirama owners never flag it.
        s._atkSpecial = !!(s._wantSpecial && _cloneSpecialAttack && _cloneSpecialAttack(s))
      }
    } else if (s._atk === "strike") {
      if (s._atkSpecial) {
        s.vx = 0                                                                // special (tree) attack owns it — hold in place; the tree does the work
      } else if (!s._atkHit) {                                                  // varied LUNGE-STRIKE (one connect per swing)
        const reach = (s._atkMove && s._atkMove.reach) || CLONE_ATK_REACH       // per-move reach (this swing's chosen normal)
        s.vx = CLONE_LUNGE_SPEED * s.facing; s.x += s.vx                        // lunge IN
        const hb = { x: s.facing >= 0 ? s.x + s.w : s.x - reach, y: s.y + 8, w: reach, h: Math.max(1, (s.h || 120) - 16) }
        if (rectsOverlap(hb, getHurtbox(enemy)) && (enemy.invulnTimer || 0) <= 0) {
          s._atkHit = true
          let raw = (s._atkMove && s._atkMove.dmg) || CLONE_ATK_DMG             // per-move damage
          if (enemy.isBlocking) { raw = Math.round(raw * 0.25); enemy.blockstun = Math.max(enemy.blockstun || 0, 8) }
          const dealt = applyScaledDamage(enemy, raw, { source: "clone" })
          enemy.hitstun = Math.max(enemy.hitstun || 0, enemy.isBlocking ? 0 : 12)
          enemy.colorFlash = Math.max(enemy.colorFlash || 0, 6)
          enemy.vx = (enemy.vx || 0) + s.facing * (enemy.isBlocking ? 1 : 4)
          spawnCloneStrikeFx(enemy.x + (enemy.w || 40) / 2, enemy.y + (enemy.h || 100) * 0.42, s.color)
          try { sound?.play?.(enemy.isBlocking ? SFX.BLOCK : SFX.HIT_LIGHT) } catch (_) {}
        }
      } else {
        s.vx = CLONE_LUNGE_SPEED * s.facing; s.x += s.vx                        // continue the lunge after the connect
      }
      if (++s._atkT >= CLONE_ATK_STRIKE) { s._atk = "recover"; s._atkT = 0; setCloneSheet(s, "idle") }
    } else if (s._atk === "recover") {
      s.vx = -CLONE_MOVE_SPEED * s.facing; s.x += s.vx                          // step BACK to re-space
      if (++s._atkT >= CLONE_ATK_RECOVER) { s._atk = null; s._atkT = 0; s._atkCd = CLONE_ATK_COOLDOWN }
    } else {
      // NEUTRAL — advance until in strike range, then (cooldown ready) begin a lunge-strike.
      const range = CLONE_ATK_RANGE + (s._slot || 0) * 26                      // per-slot stagger so 3 don't stack
      if (Math.abs(dx) > range) { s.vx = CLONE_MOVE_SPEED * s.facing; s.x += s.vx }
      else { s.vx = 0; if ((s._atkCd || 0) <= 0) { s._atk = "windup"; s._atkT = 0; beginCloneSwing(s) } }
    }
  } else if (enemy) {
    // DEFAULT — STATIC DECOY (identity concealment). The clone HOLDS its position: it does not advance and does
    // not attack on its own. It only faces the opponent (as a neutral fighter would) so it reads as the real
    // idle body. All clone OFFENSE is player-driven elsewhere (barrage beats / Clone Rush / mimicked strings);
    // the swap trades into a clone right where the player left it. No autonomous timers here → no "acts on its own".
    s.vx = 0
    s.facing = ((enemy.x + (enemy.w || 0) / 2) >= (s.x + s.w / 2)) ? 1 : -1
  }

  // FALLBACK melee hit-reveal (self-check). The AUTHORITATIVE path is now revealClonesHitByMelee(),
  // called from the main loop at the exact frame real hits resolve; this retroactive check remains only
  // as a safety net for any attacker not covered there (e.g. a clone's own s.target relationship). It runs
  // a full combat step later, so it's the fragile one — kept but no longer relied upon.
  // Hurtbox reuses combat.js getHurtbox, sized to the clone.
  if (enemy && attackIsActive(enemy.currentAttack)) {
    const hb = getAttackHitbox(enemy)
    if (hb && rectsOverlap(hb, getHurtbox(s))) {
      s._state = "hurt"; s._stateT = 0; setCloneSheet(s, "hurt")
    }
  }
  return null
}

// ── clone spawn/dispel smoke puffs (cosmetic) ──────────────────────
// Fires on spawn (body hidden until it clears), on dispel, and on hit-destruction.
// FLAG: naruto_kcm_fx_smoke_poof.png is STILL not on disk (verified 2026-07) → this
// stays PROCEDURAL. When the sprite lands, tell me its frame count/cell dims and I'll
// animate its frames here (CLONE_POOF_FRAMES already gates the body reveal); until
// then this expanding gradient reads as the smoke poof.
const clonePuffs = []
// Exported so non-clone techniques can reuse the EXACT same smoke poof (e.g. Naruto's
// Kawarimi substitution teleport). Purely cosmetic — no clone lifecycle / chakra-split.
export function spawnClonePuff(x, y) { clonePuffs.push({ x, y, t: 0, max: 16 }) }

// ── CLONE LUNGE-STRIKE impact FX (self-contained; updateSummons has no hitEffects array) ──
const cloneStrikeFx = []
let _cloneStrikeTotal = 0
export function getCloneStrikeFxCount() { return _cloneStrikeTotal }   // harness: prove clones actually STRUCK
function spawnCloneStrikeFx(x, y, color) { cloneStrikeFx.push({ x, y, color: color || "#ffd166", t: 0, max: 12 }); _cloneStrikeTotal++ }
function tickCloneStrikeFx() { for (let i = cloneStrikeFx.length - 1; i >= 0; i--) { if (++cloneStrikeFx[i].t >= cloneStrikeFx[i].max) cloneStrikeFx.splice(i, 1) } }
function drawCloneStrikeFx(ctx) {
  if (!ctx || !cloneStrikeFx.length) return
  for (const p of cloneStrikeFx) {
    const k = p.t / p.max
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (1 - k) * 0.9
    ctx.strokeStyle = p.color; ctx.lineWidth = 3
    const r = 8 + k * 26
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + k * 0.5; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * r * 0.3, p.y + Math.sin(a) * r * 0.3); ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); ctx.stroke() }
    ctx.restore()
  }
}
export function getClonePuffCount() { return clonePuffs.length }   // harness: prove the Double Attack partner poof fired

// ── HASHIRAMA WOOD-CLONE DESPAWN FX ──────────────────────────────────────────
// A wood clone doesn't poof into smoke — it reverts to WOOD (collapses into logs/debris), the
// hashirama_wood_clone_release strip. Owner-aware: Hashirama's clones use this on every despawn
// (dispel / hit-poof / consume); every other owner keeps the smoke puff. Purely cosmetic.
const WOOD_RELEASE_SHEET = "./hashirama_wood_clone_release.png"
const woodReleaseFx = []
let _woodReleaseFxTotal = 0                                  // CUMULATIVE spawn count (harness evidence, timing-robust)
const WOOD_RELEASE_FRAMES = 4, WOOD_RELEASE_FRAME_HOLD = 7   // 4 frames × 7f ≈ 28f dissolve
export function getWoodReleaseFxCount() { return _woodReleaseFxTotal }   // harness: prove the wood-release despawn fired (cumulative)
// DESPAWN cue chooser. `reason`: "destroy" (killed by a hit) | "dispel" (dismissed on purpose) | "consume"
// (spent as a combo cost). Owner-aware: Hashirama's clones revert to logs; TOBIRAMA's WATER clones use
// DISTINCT effects for the two triggers (Part 2 — destroyed-by-hit ≠ dismissed-intentionally): a hit BURSTS
// the clone into an upward water splash, a deliberate dispel COLLAPSES it into a settling puddle/ripple.
// Every other owner keeps the smoke puff.
function spawnCloneDespawnFx(s, reason = "destroy") {
  const key = (s.owner?.rosterKey || "").toLowerCase()
  const cx = s.x + (s.w || 0) / 2, footY = s.y + (s.h || 0)
  if (key === "hashirama" || key === "madara") {   // both are Mokuton wood clones → revert to logs on despawn
    woodReleaseFx.push({ x: cx, y: footY, facing: s.facing || 1, t: 0, max: WOOD_RELEASE_FRAMES * WOOD_RELEASE_FRAME_HOLD })
    _woodReleaseFxTotal++
  } else if (key === "tobirama") {
    // destroyed-by-hit = BURST (kind "burst"); dismissed/consumed = COLLAPSE ripple (kind "ripple").
    const kind = (reason === "destroy") ? "burst" : "ripple"
    waterCloneFx.push({ x: cx, y: footY, kind, t: 0, max: kind === "burst" ? 26 : 22 })
    _waterCloneFxTotal[kind]++
  } else {
    spawnClonePuff(cx, s.y + (s.h || 0) / 2)
  }
}
// ── TOBIRAMA WATER-CLONE DESPAWN FX (procedural water) — distinct destroy vs dismiss ──
const waterCloneFx = []
const _waterCloneFxTotal = { burst: 0, ripple: 0 }
export function getWaterCloneFxCount() { return { ..._waterCloneFxTotal, total: _waterCloneFxTotal.burst + _waterCloneFxTotal.ripple } }
function tickWaterCloneFx() {
  for (let i = waterCloneFx.length - 1; i >= 0; i--) { if (++waterCloneFx[i].t >= waterCloneFx[i].max) waterCloneFx.splice(i, 1) }
}
function drawWaterCloneFx(ctx) {
  if (!ctx || !waterCloneFx.length) return
  for (const p of waterCloneFx) {
    const k = p.t / p.max
    ctx.save()
    if (p.kind === "burst") {
      // DESTROYED-BY-HIT: the clone explodes UPWARD into water droplets (violent splash).
      ctx.globalAlpha = (1 - k) * 0.85
      ctx.fillStyle = "rgba(120,190,255,0.9)"
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI - Math.PI            // upward fan
        const r = 14 + k * 70
        const dx = Math.cos(ang) * r, dy = Math.sin(ang) * r - k * 30
        ctx.beginPath(); ctx.arc(p.x + dx, p.y - 40 + dy, 3.5 * (1 - k * 0.6), 0, Math.PI * 2); ctx.fill()
      }
      const g = ctx.createRadialGradient(p.x, p.y - 40, 2, p.x, p.y - 40, 26 + k * 20)
      g.addColorStop(0, "rgba(180,220,255,0.7)"); g.addColorStop(1, "rgba(120,190,255,0)")
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y - 40, 26 + k * 20, 0, Math.PI * 2); ctx.fill()
    } else {
      // DISMISSED-INTENTIONALLY: the clone gently COLLAPSES into a spreading ground puddle / ripple rings.
      ctx.globalAlpha = (1 - k) * 0.7
      ctx.strokeStyle = "rgba(120,190,255,0.9)"; ctx.lineWidth = 2.5
      for (let ring = 0; ring < 3; ring++) {
        const rr = (10 + ring * 16) + k * 40
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, rr, rr * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.fillStyle = "rgba(90,160,235,0.5)"
      ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, 22 * (1 - k), 8 * (1 - k), 0, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}
function tickWoodReleaseFx() {
  for (let i = woodReleaseFx.length - 1; i >= 0; i--) {
    if (++woodReleaseFx[i].t >= woodReleaseFx[i].max) woodReleaseFx.splice(i, 1)
  }
}
function drawWoodReleaseFx(ctx) {
  if (!ctx || !woodReleaseFx.length) return
  const img = _summonImg(WOOD_RELEASE_SHEET)
  if (!img || !img.complete || !img.naturalWidth) return
  const fw = img.naturalWidth / WOOD_RELEASE_FRAMES, fh = img.naturalHeight, scale = 1.4
  for (const p of woodReleaseFx) {
    const fi = Math.min(WOOD_RELEASE_FRAMES - 1, Math.floor(p.t / WOOD_RELEASE_FRAME_HOLD))
    ctx.save()
    ctx.globalAlpha = 1 - (p.t / p.max) * 0.4
    const dw = fw * scale, dh = fh * scale
    ctx.translate(p.x, p.y); ctx.scale((p.facing || 1) < 0 ? -1 : 1, 1)
    ctx.drawImage(img, fi * fw, 0, fw, fh, -dw / 2, -dh, dw, dh)   // debris anchored at the clone's feet (y = ground)
    ctx.restore()
  }
}
function tickClonePuffs() {
  for (let i = clonePuffs.length - 1; i >= 0; i--) {
    if (++clonePuffs[i].t >= clonePuffs[i].max) clonePuffs.splice(i, 1)
  }
}
function drawClonePuffs(ctx) {
  if (!ctx) return
  for (const p of clonePuffs) {
    const k = p.t / p.max                    // 0 → 1
    const r = 18 + k * 44
    ctx.save()
    ctx.globalAlpha = (1 - k) * 0.8
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r)
    g.addColorStop(0, "rgba(240,240,245,0.95)")
    g.addColorStop(1, "rgba(200,200,210,0)")
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
}
