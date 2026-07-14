// summons.js
// Handles assist/summon logic for characters.
// All timing values are in FRAMES at 60fps.

// Shadow clones read the fighters' live attack state to mimic / to poof when hit.
// combat.js imports only physics + sound → no cycle back to summons.
import { getAttackHitbox, rectsOverlap, attackIsActive } from "./combat.js"

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
  }
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
      if (r === "destroy") { loseCloneShare(s.owner); spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2); activeSummons.splice(i, 1) }
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

export function drawSummons(ctx) {
  for (const s of activeSummons) {
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
}

// ═══════════════════════════════════════════════════════════════════
// SHADOW CLONES (Naruto) — BASIC version.
// Persistent lookalike bodies that MIMIC the owner's basic attacks, poof when hit
// once (or dispelled), and SPLIT the owner's chakra pool evenly across all bodies
// (a destroyed clone's share is LOST). Built on this summon list but with a
// clone-specific update/draw path (no rush, no auto-attack, no lifetime expiry).
// No independent AI yet — clones only mirror the owner.
// ═══════════════════════════════════════════════════════════════════
const CLONE_CAP          = 3                 // max simultaneous clones (spawn past cap = no-op)
const CLONE_OFFSETS      = [-70, 70, -120]   // flank x-offsets relative to owner facing
const CLONE_HIT_RANGE    = 150               // px: a mimic hit lands only if the enemy is this close to the clone
const CLONE_DAMAGE_SCALE = 0.5               // clone mimic hits deal half the owner's attack damage (balance knob)
const CLONE_ATTACK_ANIM  = 18                // frames the clone holds its attack pose after mimicking
const CLONE_W = 70, CLONE_H = 120            // clone hurtbox = the destruction box

// Clone body sprites (reuse Naruto's existing strips). scale 2.0 ≈ his on-screen size.
const CLONE_SPRITES = {
  idle:   { sheet: "./naruto_kcm_stance.png",   frames: 4, w: 36, h: 63, speed: 6, scale: 2.0 },
  attack: { sheet: "./naruto_kcm_b_attack.png", frames: 4, w: 52, h: 53, speed: 4, scale: 2.0 }
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

// SPAWN — cap-limited (over cap → no-op, returns null). No upfront chakra cost:
// the "cost" is the split (each new body lowers everyone's share). Puffs on spawn.
export function spawnShadowClone(owner, target) {
  if (!owner) return null
  if (countShadowClones(owner) >= CLONE_CAP) return null   // CAP behavior: do nothing
  const slot = countShadowClones(owner)
  const facing = owner.facing || 1
  const s = {
    id: "shadowClone", owner, target, _slot: slot,
    w: CLONE_W, h: CLONE_H,
    x: owner.x - facing * 70, y: owner.y || 0,
    facing, lifetime: Infinity,        // persists until hit or dispelled
    _atkTimer: 0, _mimicked: null, color: "#ffb400"
  }
  setCloneSheet(s, "idle")
  activeSummons.push(s)
  spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)
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
  return n
}

// Per-frame clone logic. Returns "destroy" (hit → poof + lose share), "remove"
// (owner gone), or null.
function updateShadowClone(s) {
  const owner = s.owner, enemy = s.target
  if (!owner) return "remove"

  // FOLLOW — settle into a flank slot beside the owner (smoothed, never snaps).
  const off = CLONE_OFFSETS[s._slot % CLONE_OFFSETS.length]
  const desiredX = owner.x + (owner.facing || 1) * off
  s.x += (desiredX - s.x) * 0.25
  s.y += ((owner.y || 0) - s.y) * 0.25
  if (enemy) s.facing = (enemy.x >= s.x) ? 1 : -1

  // attack-pose hold
  if (s._atkTimer > 0) { s._atkTimer--; if (s._atkTimer === 0) setCloneSheet(s, "idle") }

  // MIMIC — mirror each of the owner's basic attacks once (skip specials/ultimate).
  const atk = owner.currentAttack
  if (atk && !atk.isSpecial && !atk.isUltimate) {
    if (atk !== s._mimicked && attackIsActive(atk)) {
      s._mimicked = atk
      setCloneSheet(s, "attack"); s._atkTimer = CLONE_ATTACK_ANIM
      cloneMimicHit(s, atk, enemy)
    }
  } else if (!atk) {
    s._mimicked = null
  }

  // DESTRUCTION — one touch of an active enemy melee hitbox poofs the clone.
  if (enemy && attackIsActive(enemy.currentAttack)) {
    const hb = getAttackHitbox(enemy)
    if (hb && rectsOverlap(hb, { x: s.x, y: s.y, w: s.w, h: s.h })) return "destroy"
  }
  return null
}

// A mimicked hit: an extra (scaled) instance of the owner's attack, landing only
// if the enemy is within CLONE_HIT_RANGE of the clone (else it whiffs).
function cloneMimicHit(s, atk, enemy) {
  if (!enemy) return
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2
  const ex = enemy.x + (enemy.w || 60) / 2, ey = enemy.y + (enemy.h || 100) / 2
  if (Math.hypot(ex - cx, ey - cy) > CLONE_HIT_RANGE) return
  const dmg = Math.round((atk.damage || 40) * CLONE_DAMAGE_SCALE)
  enemy.health = Math.max(0, (enemy.health || 0) - dmg)
  enemy.colorFlash = 6
  enemy.hitstun = Math.max(enemy.hitstun || 0, Math.round((atk.hitstun || 12) * 0.7))
  enemy.vx = (atk.pushX || 3) * (s.facing || 1) * 0.7
  if (atk.launchY) { enemy.vy = atk.launchY * 0.7; enemy.onGround = false }
}

// ── clone spawn/dispel smoke puffs (cosmetic) ──────────────────────
// FLAG: naruto_kcm_fx_smoke_poof.png is not on disk yet → PROCEDURAL puff below.
// When the real sprite lands, swap drawClonePuffs to draw its frames (tell me its
// frame count/cell dims and I'll animate it — until then this reads as a puff).
const clonePuffs = []
function spawnClonePuff(x, y) { clonePuffs.push({ x, y, t: 0, max: 16 }) }
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
