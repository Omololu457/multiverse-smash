// cubeTrap.js
// ─────────────────────────────────────────────────────────────────────────────
// Isshiki Otsutsuki — Daikokuten (Cubes) SHRINK-TRAP subsystem.
//
// Architectural SIBLING of Sukuna's Malevolent Shrine (domains.js): a trapped, untouchable-to-normal-hits
// foe taking auto-interval damage. This is the LOCALIZED, single-target, ESCAPABLE, special-tier version:
// a thrown cube lands on the foe, grows to full size, and traps them — they shrink inside it (the
// mirror-image of the giant-scale render technique, via sprite.js `_trapShrinkFrac`), take auto-ticks,
// can be punished by the caster hitting the CUBE, and can mash to escape early (shattering the cube).
//
// REUSES (see cube-trap Stage-1 investigation): the untouchable-whiff gate (combat.js — via the dedicated
// `_cubeTrapUntouchable` flag, NOT domainUntouchable which domains.js resets every frame), the freeze
// pattern + interval-tick shape (domains.js), `applyScaledDamage` (the ×0.60 choke-point), and
// `readRawControls` (side-effect-free mash read). Draws its OWN cube sprite (a dedicated render hook)
// rather than routing through the projectile system — so it imports NOTHING from abilities.js, leaving
// abilities.js free to import THIS (spawnCubeTrap) at Stage 3 with no import cycle.
//
// STAGE 2 (this pass): the cube OBJECT (cast small → descend → grow-on-land → hittable hurtbox rect) + the
// SHRINK visual + freeze/untouchable hold, verified in isolation. Auto-tick damage, caster bonus-hits, and
// the escape-mash are wired in STAGE 3 (marked below). Balance numbers are finalized in STAGE 4.
// ─────────────────────────────────────────────────────────────────────────────
import { applyScaledDamage } from "./combat.js"
import { readRawControls } from "./input.js"

export const activeCubeTraps = []

// ── tuning (proposed in Stage 1; finalized vs Sukuna's Shrine in Stage 4) ──
const CUBE_FALL_SPEED   = 16     // descent px/frame
const CUBE_GROW_FRAMES  = 12     // land → full-size grow
const CUBE_START_SCALE  = 0.70   // sprite scale while descending (small)
const CUBE_FULL_SCALE   = 1.25   // sprite scale at full trap size (~185px tall — contains the foe)
const CUBE_SHRINK_EASE  = 0.10   // per-frame exponential ease of the foe toward its current shrink TARGET
const TRAP_DURATION     = 150    // frames the foe is held (Stage-4 balance knob)
// Progressive "crushed" shrink: the foe eases toward shrinkTarget, which STARTS mild and DROPS with every
// auto-tick / caster bonus-hit (the more you punish, the smaller they get), clamped to a hard floor.
const SHRINK_BASE       = 0.45   // trapped-but-un-punished shrink target
const SHRINK_FLOOR      = 0.28   // smallest the foe can be crushed to
const SHRINK_PER_TICK   = 0.03   // auto-tick crush
const SHRINK_PER_BONUS  = 0.055  // caster bonus-hit crush (a bigger squash — the punish reward)
// Auto-tick (interval sure-damage) — the Sukuna-Shrine pattern, scaled DOWN for a 45-cost special (Shrine
// is 30f/14 on a 100-cost ultimate). ~4 ticks over the 150f trap ≈ 24 EFF (×0.60), a fraction of the Shrine.
const TICK_INTERVAL     = 36
const TICK_DAMAGE       = 10     // RAW → 6 EFF/tick
// Caster bonus-hit: landing a normal ON the cube adds damage to the trapped foe. A FIXED per-hit value
// (NOT ½ the swing) — because the trapped foe's freeze-hitstun lets the caster's auto-combo advance to its
// launcher on the cube, a swing-scaled bonus would spike via the big finisher (and reward fishing for the
// heaviest normal). A flat value (~a light normal's worth) rewards LANDING hits, is exploit-proof, and is
// predictable to balance. A per-hit COOLDOWN rate-limits it so MASHING can't melt the foe (which would make
// this cheap special strictly-better than the 100-cost Shrine) — one credited bonus per BONUS_COOLDOWN frames.
const BONUS_DAMAGE      = 12     // RAW → ~7 EFF per credited cube-hit (≈ a light normal)
const BONUS_COOLDOWN    = 16
// Escape-mash: each fresh button EDGE from the trapped player shaves frames off the trap → real agency.
const MASH_REDUCE       = 4
const MASH_FIELDS       = ["light", "heavy", "special", "upAttack", "jump", "left", "right", "down", "grab"]

const CUBE_CELL_W = 122, CUBE_CELL_H = 148
let _cubeImg = null
function cubeImg() { if (!_cubeImg) { _cubeImg = new Image(); _cubeImg.src = "./isshiki_cube_fx_uniform.png" } return _cubeImg }
function cubeSize(t) { return CUBE_CELL_H * (t._scale || CUBE_START_SCALE) }   // on-screen cube edge px

// ─────────────────────────────────────────────────────────────────────────────
// SPAWN — throw a cube that descends onto the target.
// ─────────────────────────────────────────────────────────────────────────────
export function spawnCubeTrap(caster, target, context = {}, opts = {}) {
  if (!caster || !target) return null
  for (let i = activeCubeTraps.length - 1; i >= 0; i--) {   // one trap per target — replace any existing
    if (activeCubeTraps[i].target === target) { releaseTrap(activeCubeTraps[i]); activeCubeTraps.splice(i, 1) }
  }
  const groundY = (target.groundY != null) ? target.groundY : (target.y || 0) + (target.h || 100)
  const cx = (target.x || 0) + (target.w || 60) / 2
  const trap = {
    caster, target, context,
    phase: "descend",
    cx, groundY,
    bottomY: (target.y || 0) - 240,   // cube-visual bottom starts high above the foe
    _scale: CUBE_START_SCALE,
    shrinkFrac: 1, shrinkTarget: SHRINK_BASE,
    growTimer: CUBE_GROW_FRAMES,
    trapTimer: opts.duration || TRAP_DURATION,
    life: 900,                        // absolute safety cap
    hurt: null,                       // {x,y,w,h} cube hurtbox once landed (caster bonus-hits)
    inert: !!opts.inert,              // isolated mode (Stage-2 test): cube+shrink+untouchable-gate ONLY (no tick/bonus/mash)
    _bonusSwing: null, _bonusCd: 0, _tickClock: TICK_INTERVAL, _mashPrev: {}, escaped: false,
  }
  activeCubeTraps.push(trap)
  return trap
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE — descend → grow-on-land → trapped hold. (auto-tick / bonus-hit / escape land in STAGE 3.)
// ─────────────────────────────────────────────────────────────────────────────
export function updateCubeTraps(fighters = [], hitEffects = [], context = {}) {
  for (let i = activeCubeTraps.length - 1; i >= 0; i--) {
    const t = activeCubeTraps[i]
    if (!t || !t.target || t.target.eliminated) { if (t) releaseTrap(t); activeCubeTraps.splice(i, 1); continue }
    if (--t.life <= 0) { endTrap(t, hitEffects); activeCubeTraps.splice(i, 1); continue }
    const target = t.target

    if (t.phase === "descend") {
      t.cx = (target.x || 0) + (target.w || 60) / 2     // track the foe until the cube lands
      t.bottomY += CUBE_FALL_SPEED
      if (t.bottomY >= t.groundY) { t.bottomY = t.groundY; t.phase = "grow"; t.growTimer = CUBE_GROW_FRAMES }
    } else if (t.phase === "grow") {
      t.growTimer--
      const p = 1 - Math.max(0, t.growTimer) / CUBE_GROW_FRAMES
      t._scale = CUBE_START_SCALE + (CUBE_FULL_SCALE - CUBE_START_SCALE) * p
      applyTrapHold(t)                                  // freeze + untouchable + begin shrink
      if (t.growTimer <= 0) t.phase = "trapped"
    } else if (t.phase === "trapped") {
      applyTrapHold(t)
      if (!t.inert) {
        autoTick(t, hitEffects)                         // (A) interval sure-damage (Sukuna-Shrine pattern, scaled down)
        bonusHit(t, hitEffects)                          // (B) caster lands a normal ON the cube → ½ bonus + extra crush
        if (escapeMash(t)) { t.escaped = true; endTrap(t, hitEffects); activeCubeTraps.splice(i, 1); continue }   // (C) mash → early escape (shatter)
      }
      t.trapTimer--
      if (t.trapTimer <= 0) { endTrap(t, hitEffects); activeCubeTraps.splice(i, 1); continue }   // natural expiry
    }

    const size = cubeSize(t)                            // maintain the hittable hurtbox rect
    t.hurt = { x: t.cx - size / 2, y: t.groundY - size, w: size, h: size }
  }
}

// Freeze the foe in place, mark it untouchable, and ease its shrink toward the (progressively dropping) target.
function applyTrapHold(t) {
  const f = t.target
  if (!f) return
  f._cubeTrapUntouchable = true
  f.hitstun = Math.max(f.hitstun || 0, 4)
  f.vx = 0
  f.vy = (f.vy || 0) * 0.2
  t.shrinkFrac += (t.shrinkTarget - t.shrinkFrac) * CUBE_SHRINK_EASE
  f._trapShrinkFrac = t.shrinkFrac
}

// (A) AUTO-TICK — sure damage every TICK_INTERVAL; the ONLY passive damage. Crushes the foe a little more.
function autoTick(t, hitEffects) {
  if (--t._tickClock > 0) return
  t._tickClock = TICK_INTERVAL
  const dealt = applyScaledDamage(t.target, TICK_DAMAGE, { source: "isshiki-cube" })
  t.target.colorFlash = 6
  t.shrinkTarget = Math.max(SHRINK_FLOOR, t.shrinkTarget - SHRINK_PER_TICK)
  pushSpark(hitEffects, t, dealt, "special", 6)
}

// (B) CASTER BONUS-HIT — the foe is untouchable, so the caster's swing "connects" on the cube (combat.js sets
// currentAttack.hasHit via the untouchable gate). Credit ONCE per swing: half the swing's damage + a bigger
// crush. A real, risk-free punish window (walk up, hit the cube) — the reward for committing position.
function bonusHit(t, hitEffects) {
  if (t._bonusCd > 0) t._bonusCd--
  const c = t.caster
  const atk = c?.currentAttack
  if (c?.attacking && atk && atk.hasHit && t._bonusSwing !== atk && (t._bonusCd || 0) <= 0) {
    t._bonusSwing = atk
    t._bonusCd = BONUS_COOLDOWN
    const dealt = applyScaledDamage(t.target, BONUS_DAMAGE, { source: "isshiki-cube-bonus" })   // FIXED (see note) — not swing-scaled
    t.target.colorFlash = 10
    t.shrinkTarget = Math.max(SHRINK_FLOOR, t.shrinkTarget - SHRINK_PER_BONUS)
    pushSpark(hitEffects, t, dealt, "heavy", 9)
  }
  if (!c?.attacking) t._bonusSwing = null   // swing ended → next swing can credit again
}

// (C) ESCAPE-MASH — read the TRAPPED player's raw inputs (side-effect-free); each fresh button edge shaves
// MASH_REDUCE frames off the trap. Returns true when the trap has been mashed down to 0 (early escape).
function escapeMash(t) {
  const raw = readRawControls(t.target)
  if (!raw) return false
  let edges = 0
  for (const f of MASH_FIELDS) { if (raw[f] && !t._mashPrev[f]) edges++; t._mashPrev[f] = !!raw[f] }
  if (edges) t.trapTimer -= MASH_REDUCE * edges
  return t.trapTimer <= 0
}

// A visible spark through the shared hit-effects pipeline (the game loop spawns a damage number from it).
function pushSpark(hitEffects, t, dealt, category, lines) {
  if (!Array.isArray(hitEffects)) return
  const f = t.target
  hitEffects.push({ x: (f.x || 0) + (f.w || 60) / 2, y: (f.y || 0) + (f.h || 100) * 0.4, timer: 10, maxTimer: 10,
    category, color: category === "heavy" ? "#c0392b" : "#e74c3c", damage: dealt, lines, radius: category === "heavy" ? 20 : 14 })
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — draw the cube OVER the foe (semi-transparent so the shrinking foe reads as "inside" it),
// bottom-anchored at the ground and grown via _scale. Called in the camera-transformed (world) ctx,
// AFTER the fighters + projectiles (so it overlays the foe). Frame index tracks the grow progress.
// ─────────────────────────────────────────────────────────────────────────────
export function drawCubeTraps(ctx) {
  if (!activeCubeTraps.length) return
  const img = cubeImg()
  if (!img.complete || !img.naturalWidth) return
  for (const t of activeCubeTraps) {
    const dw = CUBE_CELL_W * t._scale, dh = CUBE_CELL_H * t._scale
    const gp = (t._scale - CUBE_START_SCALE) / (CUBE_FULL_SCALE - CUBE_START_SCALE)   // 0..1 grow progress
    const fi = Math.max(0, Math.min(2, Math.floor(gp * 3)))                           // pick the matching cube-size cell
    ctx.save()
    ctx.globalAlpha = 0.86                                                            // see the trapped foe through the face
    ctx.drawImage(img, fi * CUBE_CELL_W, 0, CUBE_CELL_W, CUBE_CELL_H, t.cx - dw / 2, t.bottomY - dh, dw, dh)
    ctx.restore()
  }
}

function releaseTrap(t) {
  const f = t?.target
  if (f) { f._cubeTrapUntouchable = false; f._trapShrinkFrac = null }
}
// End the trap: free the foe + SHATTER the cube (a bigger burst on an early mash-escape than on natural expiry).
function endTrap(t, hitEffects) {
  releaseTrap(t)
  if (Array.isArray(hitEffects)) {
    const big = !!t.escaped
    hitEffects.push({ x: t.cx, y: t.groundY - cubeSize(t) / 2, timer: big ? 16 : 12, maxTimer: big ? 16 : 12,
      category: big ? "explosion" : "special", color: "#c0392b", damage: 0, lines: big ? 14 : 8, radius: big ? 38 : 22, _fresh: false })
  }
}

export function clearCubeTraps() {
  for (const t of activeCubeTraps) releaseTrap(t)
  activeCubeTraps.length = 0
}

// Harness/debug read-out.
export function cubeTrapState() {
  const t = activeCubeTraps[0]
  if (!t) return null
  return { phase: t.phase, cx: Math.round(t.cx), scale: +(t._scale).toFixed(2), shrink: +(t.shrinkFrac).toFixed(2),
           trapTimer: t.trapTimer, hurt: t.hurt ? { x: Math.round(t.hurt.x), y: Math.round(t.hurt.y), w: Math.round(t.hurt.w), h: Math.round(t.hurt.h) } : null,
           targetUntouchable: !!t.target?._cubeTrapUntouchable, targetShrink: t.target?._trapShrinkFrac != null ? +t.target._trapShrinkFrac.toFixed(2) : null }
}
