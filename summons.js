// summons.js
// Handles assist/summon logic for characters.
// All timing values are in FRAMES at 60fps.

// Shadow clones read the fighters' live attack state to mimic / to poof when hit.
// combat.js imports only physics + sound → no cycle back to summons.
import { getAttackHitbox, getHurtbox, rectsOverlap, attackIsActive } from "./combat.js"
import { physics } from "./physics.js" // clones fall + rest on the floor via the SAME applyGravity fighters use
import { sound } from "./sound.js"   // one-shot clone spawn/despawn SFX (playSfxFile)

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
  divineDogs: {
    id:              "divineDogs",
    duration:        84,   // ~1.4s
    maxSimultaneous: 1,
    attackInterval:  15,
    damage:          45,
    w:               52,
    h:               34,
    speed:           7,
    behavior:        "rush",
    hitstun:         18,
    knockbackX:      6,
    knockbackY:      -1,
    oneHit:          true,
    color:           "#d1fae5",
    // Divine Dogs (white) — clean 5-frame strip, measured 210x47 → 42x47 cells.
    sheet: "./megumi2_divine_dogs_white_proj_sheet.png", spriteFrames: 5, spriteW: 42, spriteH: 47, spriteSpeed: 4, spriteScale: 1.3
  },

  nue: {
    id:              "nue",
    duration:        96,   // ~1.6s
    maxSimultaneous: 1,
    attackInterval:  21,
    damage:          70,
    w:               72,
    h:               42,
    speed:           6,
    offsetY:         -80,
    behavior:        "airDive",
    antiAir:         true,
    hitstun:         20,
    knockbackX:      5,
    knockbackY:      -6,
    launch:          10,
    oneHit:          true,
    color:           "#fde68a",
    // Nue — clean 9-frame strip, measured 648x77 → 72x77 cells.
    sheet: "./megumi2_nue_proj_sheet.png", spriteFrames: 9, spriteW: 72, spriteH: 77, spriteSpeed: 4, spriteScale: 1.0
  },

  toad: {
    id:              "toad",
    duration:        108,  // ~1.8s
    maxSimultaneous: 1,
    attackInterval:  24,
    damage:          60,
    w:               58,
    h:               44,
    speed:           4,
    behavior:        "holdLine",
    restrain:        true,
    restrainDuration: 42,
    hitstun:         22,
    knockbackX:      2,
    knockbackY:      0,
    oneHit:          true,
    color:           "#86efac",
    // Toad — REGION crop (not frame-sliced): drawn as a single image for now.
    // FLAG: re-cut megumi2_toad_proj_region.png (393x81) into frames later.
    sheet: "./megumi2_toad_proj_region.png", spriteFrames: 1, spriteW: 393, spriteH: 81, spriteSpeed: 6, spriteScale: 0.33
  },

  rabbitEscape: {
    id:              "rabbitEscape",
    duration:        84,   // ~1.4s
    maxSimultaneous: 1,
    attackInterval:  9999, // never auto-attacks
    damage:          10,
    w:               84,
    h:               54,
    speed:           5,
    behavior:        "screenSwarm",
    defensive:       true,
    utility:         true,
    obscureVision:   true,
    hitstun:         6,
    knockbackX:      0,
    knockbackY:      0,
    oneHit:          false,
    color:           "#f8fafc",
    // Rabbit Escape — REGION crop (single image for now).
    // FLAG: re-cut megumi2_rabbit_proj_region.png (387x200) into frames later.
    sheet: "./megumi2_rabbit_proj_region.png", spriteFrames: 1, spriteW: 387, spriteH: 200, spriteSpeed: 6, spriteScale: 0.3
  },

  maxElephant: {
    id:              "maxElephant",
    duration:        96,   // ~1.6s
    maxSimultaneous: 1,
    attackInterval:  42,
    damage:          110,
    w:               96,
    h:               72,
    speed:           2.5,
    behavior:        "heavyDrop",
    heavySummon:     true,
    hitstun:         24,
    knockbackX:      9,
    knockbackY:      -2,
    oneHit:          true,
    color:           "#93c5fd",
    // Max Elephant — clean 4-frame strip, measured 456x137 → 114x137 cells.
    sheet: "./megumi2_max_elephant_proj_sheet.png", spriteFrames: 4, spriteW: 114, spriteH: 137, spriteSpeed: 5, spriteScale: 1.0
  },

  // NARUTO TOAD SUMMON (Gamakichi-style) — a separate summon special, NOT a shadow clone:
  // normal energy cost (paid in abilities.executeNarutoSpecial via spendEnergy), no chakra
  // share. Reuses this generic shikigami entity path (rush → one hit → despawn). Its three
  // single-frame poses are sliced from the JUS sheet's 2-KOMA band (right of the koma
  // clusters): frog_a (rearing) is the active/attack sheet here; updateNarutoToadPose swaps
  // to frog_b (transition) then frog_c (curl) as it despawns. Distinct id from Megumi's `toad`.
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

  // Binding vow (Megumi — Shadow Overload): hard cap on TOTAL summons for this
  // owner across all ids, plus damage / lifespan boosts.
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
        loseCloneShare(s.owner); spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)
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

    if (s.lifetime <= 0) {
      cleanupSummonEffects(s)
      activeSummons.splice(i, 1)
    }
  }

  tickClonePuffs()   // advance/expire the cosmetic clone spawn/dispel smoke
}

// ─────────────────────────────────────────────────────────────────
// MOVEMENT — pixels per frame
// ─────────────────────────────────────────────────────────────────
function updateSummonMovement(s) {
  if (!s || !s.target) return

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

  summon.target.health = Math.max(0, (summon.target.health || 0) - summon.damage)
  summon.target.colorFlash = 6

  applySummonImpact(summon)
  summon.hasHit = true

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

let _cloneDbgFrame = 0
export function drawSummons(ctx) {
  // [DEBUG-CLONE 2] once per ~second: is the entity still in the SAME array the draw
  // loop iterates, or did something clear it? Also reports how many are shadowClones
  // and how many are currently _hidden (spawn-poof) vs visible.
  if (++_cloneDbgFrame % 60 === 0) {
    const clones = activeSummons.filter(s => s.id === "shadowClone")
    console.log("[DEBUG-CLONE] 2 DRAW TICK — activeSummons.length =", activeSummons.length,
      "shadowClones =", clones.length, "hidden =", clones.filter(s => s._hidden).length,
      "states =", clones.map(s => s._state))
  }
  for (const s of activeSummons) {
    if (s.id === "shadowClone" && s._hidden) continue   // body stays hidden under the spawn smoke

    ctx.save()

    if (s.lifetime < 12) {
      ctx.globalAlpha = s.lifetime / 12
    }

    // SHIKIGAMI SPRITE HOOK (Task 3): if the summon carries a `sheet`, draw the
    // animated shikigami art (frame strip of `spriteFrames` cells, flipped to face
    // its target), else fall through to the procedural box below. Single-image
    // region crops set spriteFrames:1 → the whole image draws.
    const img = s.sheet ? _summonImg(s.sheet) : null
    if (img && img.complete && img.naturalWidth > 0) {
      const frames = s.spriteFrames || 1
      const fw = s.spriteW || (img.naturalWidth / frames)
      const fh = s.spriteH || img.naturalHeight
      s._animT = (s._animT || 0) + 1
      const fi = Math.floor(s._animT / (s.spriteSpeed || 5)) % frames
      const sc = s.spriteScale || 1
      const dw = fw * sc, dh = fh * sc
      const cx = s.x + (s.w || 0) / 2, cy = s.y + (s.h || 0) / 2
      const dir = (s.facing || 1) < 0 ? -1 : 1
      ctx.translate(cx, cy); ctx.scale(dir, 1)
      ctx.drawImage(img, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
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

    if (s.id === "nue") {
      ctx.fillStyle = "#fff59d"
      ctx.fillRect(s.x + 8, s.y + 6, s.w - 16, 8)
    }

    if (s.id === "rabbitEscape") {
      ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.55
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.fillRect(s.x - 10, s.y - 6, s.w + 20, s.h + 12)
    }

    if (s.id === "maxElephant") {
      ctx.strokeStyle = "rgba(255,255,255,0.25)"
      ctx.lineWidth = 3
      ctx.strokeRect(s.x - 4, s.y - 4, s.w + 8, s.h + 8)
    }

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
const CLONE_CAP  = 3                          // max simultaneous clones (spawn past cap = no-op)
const CLONE_W = 70, CLONE_H = 120            // clone hurtbox = the destruction box
const CLONE_POOF_FRAMES = 16                 // spawn/despawn smoke duration (matches clonePuff lifetime)
const CLONE_HURT_FRAMES = 24                 // frames the hit-recoil pose plays before the clone poofs out

// Clone body sprites — REUSE Naruto's own animationData strips (characters.js):
//   idle = naruto_kcm_stance.png (4f 36x63), hurt = naruto_kcm_taking_damage.png (4f 46x55).
// scale 2.0 ≈ his on-screen size. No new art, no separate animationData entry.
const CLONE_SPRITES = {
  idle: { sheet: "./naruto_kcm_stance.png",        frames: 4, w: 36, h: 63, speed: 6, scale: 2.0 },
  hurt: { sheet: "./naruto_kcm_taking_damage.png", frames: 4, w: 46, h: 55, speed: 6, scale: 2.0 }
}
function setCloneSheet(s, mode) {
  const c = CLONE_SPRITES[mode] || CLONE_SPRITES.idle
  s.sheet = c.sheet; s.spriteFrames = c.frames; s.spriteW = c.w; s.spriteH = c.h
  s.spriteSpeed = c.speed; s.spriteScale = c.scale; s._animT = 0
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

export function summonShadowClone(owner, target, opts = {}) {
  if (!owner) return false
  // REPEAT inside an active window → spawn NOW, silently (no audio, no camera beat).
  if ((owner._cloneSummonWindow || 0) > 0) return !!spawnShadowClone(owner, target)
  // FIRST press: already at cap → nothing at all (preserves existing behavior; no audio/window).
  if (countShadowClones(owner) >= CLONE_CAP) return false
  // Open the window, play the clip ONCE, run the caller's short camera beat, and delay the
  // actual entity + puff to the poof frame so the visual lands with the sound.
  owner._cloneSummonWindow = CLONE_SUMMON_WINDOW_FRAMES
  if (owner.rosterKey === "naruto") sound.playSfxFile?.("naruto_clone_summon.mp3", null)
  if (typeof opts.onFocus === "function") { try { opts.onFocus() } catch (_) {} }
  pendingCloneSpawns.push({ owner, target, framesLeft: CLONE_SUMMON_POOF_FRAMES })
  return true
}

// SPAWN — cap-limited (over cap → no-op, returns null). No upfront chakra cost:
// the "cost" is the split (each new body lowers everyone's share). Puffs on spawn.
export function spawnShadowClone(owner, target) {
  // [DEBUG-CLONE 1a] entry — did we even get here, and where is the caster?
  console.log("[DEBUG-CLONE] 1a ENTRY — owner?", !!owner, "x:", owner?.x, "y:", owner?.y,
    "facing:", owner?.facing, "existing clones:", owner ? countShadowClones(owner) : "n/a", "cap:", CLONE_CAP)
  if (!owner) { console.log("[DEBUG-CLONE] BAILED — no owner"); return null }
  if (countShadowClones(owner) >= CLONE_CAP) { console.log("[DEBUG-CLONE] BAILED — at cap"); return null }   // CAP behavior: do nothing
  const facing = owner.facing || 1
  const s = {
    id: "shadowClone", owner, target,
    w: CLONE_W, h: CLONE_H,
    // Static decoy: spawns beside the owner and STAYS put horizontally (no follow),
    // but is subject to gravity so it FALLS to the floor and stands (see updateShadowClone).
    x: owner.x - facing * 70, y: owner.y || 0,
    // Gravity/ground-collision fields, same contract fighters use. groundY inherits the
    // owner's floor (== the stage groundY) so the clone rests exactly where Naruto would;
    // applyGravity falls back to physics.groundY if it's ever absent.
    vy: 0, groundY: owner.groundY, onGround: false,
    facing, lifetime: Infinity,        // persists until hit or dispelled
    _state: "spawn", _stateT: 0, _hidden: true, color: "#ffb400"
  }
  setCloneSheet(s, "idle")
  // [DEBUG-CLONE 1b] entity created — position, size, and which sprite sheet is attached.
  console.log("[DEBUG-CLONE] 1b ENTITY —", { id: s.id, x: s.x, y: s.y, w: s.w, h: s.h,
    sheet: s.sheet, spriteFrames: s.spriteFrames, spriteW: s.spriteW, spriteH: s.spriteH,
    scale: s.spriteScale, _hidden: s._hidden, _state: s._state })
  activeSummons.push(s)
  // [DEBUG-CLONE 1c] confirm the push actually landed in the array.
  console.log("[DEBUG-CLONE] 1c PUSHED — activeSummons.length =", activeSummons.length)
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
      spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)
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
      spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)   // poof
      spots.push({ x: s.x, y: s.y, w: s.w, h: s.h })
      activeSummons.splice(i, 1)
    }
  }
  return spots
}

// Per-frame clone logic — a STATIC, non-damaging DECOY. No follow, no mimic, no
// attacks; it just stands and can be hit once. Lifecycle:
//   spawn-poof (body hidden) → idle loop → (hit) hurt-recoil → poof → removed.
// Returns "destroy" (poof + lose share, fired at the END of the hurt pose),
// "remove" (owner gone), or null.
function updateShadowClone(s) {
  const owner = s.owner, enemy = s.target
  if (!owner) return "remove"
  if (enemy) s.facing = (enemy.x >= s.x) ? 1 : -1   // faces the enemy; never moves toward it

  // Gravity + ground collision — reuse the fighters' resolver verbatim so a standard-summon
  // clone falls to the stage floor and stands on it (instead of freezing at its spawn y).
  // A grounded clone gets pinned to floor - h and stays; if a future scripted action ever
  // launches one (gives it negative vy), applyGravity arcs it back down naturally.
  physics.applyGravity(s)

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

  // IDLE — just stand there. One touch of an active enemy melee hitbox starts the
  // hurt→poof lifecycle. Hurtbox reuses combat.js getHurtbox, sized to the clone.
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
