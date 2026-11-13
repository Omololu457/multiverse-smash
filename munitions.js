/**
 * MUNITIONS.JS — reusable, data-driven BOMB / HAZARD module (PASS 3).
 *
 * Green Arrow is the first user; a future character reuses it by adding a MUNITION PROFILE (data) +
 * calling spawnMunition(). Nothing in the logic is character-specific — every number lives in
 * MUNITION_PROFILES. Like drones.js / flight.js.
 *
 * SIM vs RENDER (determinism / LAN / replay):
 *   • Every field on a munition / fire-patch is SIMULATION state and lives in this module's registries
 *     (activeMunitions, activeFirePatches), which are part of GAME_STATE and reset on match start.
 *   • Explosion sprites, telegraph reticles, blast glow are RENDER-ONLY (drawMunitions / activeBlasts),
 *     computed from the frame counter, never read back by the sim.
 *   • No Math.random / gameRng. Any randomness uses hashRandom(seed, frame, player*31 + munitionIndex)
 *     imported from flight.js — a pure integer hash, LAN/replay-safe.
 *
 * It EXTENDS the shared combat idioms (applyScaledDamage from combat.js, the GA explosion frames, the
 * live-fighter list + an isEnemy predicate passed in via env) rather than building a second fight loop.
 * No import from abilities.js → no cycle (munitions.js is a leaf beside combat.js/flight.js).
 */
import { applyScaledDamage } from "./combat.js"
import { hashRandom } from "./flight.js"

const BOMBS_SHEET = "./ga_payload_bombs_sheet.png"   // 6 frames, horizontal → nose-down
const EXPL_SHEET = "./green_arrow_explosion_uniform.png"   // 4 frames puff → mushroom → shockwave
const FIRE_SHEET = "./green_arrow_firearrow_uniform.png"   // flame frames for the napalm patch

export const activeMunitions = []
export const activeFirePatches = []
const activeBlasts = []           // render-only explosion sprites
const MAX_MUNITIONS = 16
const MAX_FIRE_PATCHES = 2

let _blastIdCounter = 0
let _munIdCounter = 0

// ── MUNITION PROFILES (pure data). All use the BOMBS frames (tints). ──────────────
export const MUNITION_PROFILES = {
  dumb:    { id: "dumb",    gravity: 0.55, speed: 0, turnRate: 0,  homing: false, blastRadius: 70,  damage: 15, hitOnce: true, hp: 1, armTime: 8,  lifetime: 220, onImpact: "explosion", telegraph: true, tint: null },
  guided:  { id: "guided",  gravity: 0.35, speed: 9, turnRate: 4,  homing: true,  blastRadius: 64,  damage: 25, hitOnce: true, hp: 1, armTime: 10, lifetime: 240, onImpact: "explosion", telegraph: true, tint: "#7fd3ff" },
  cluster: { id: "cluster", gravity: 0.5,  speed: 0, turnRate: 0,  homing: false, blastRadius: 56,  damage: 20, hitOnce: true, hp: 1, armTime: 8,  lifetime: 220, onImpact: "cluster", splitAtY: 0.55, telegraph: true, tint: "#ffd27f" },
  napalm:  { id: "napalm",  gravity: 0.55, speed: 0, turnRate: 0,  homing: false, blastRadius: 48,  damage: 10, hitOnce: true, hp: 1, armTime: 8,  lifetime: 220, onImpact: "napalm", telegraph: true, tint: "#ff7a2a" },
  emp:     { id: "emp",     gravity: 0.5,  speed: 0, turnRate: 0,  homing: false, blastRadius: 70,  damage: 12, hitOnce: true, hp: 1, armTime: 8,  lifetime: 220, onImpact: "emp", telegraph: true, tint: "#f4f0a0" },
  net:     { id: "net",     gravity: 0.5,  speed: 0, turnRate: 0,  homing: false, blastRadius: 60,  damage: 0,  hitOnce: true, hp: 1, armTime: 8,  lifetime: 220, onImpact: "net", telegraph: true, tint: "#cfe8ff" },
  big:     { id: "big",     gravity: 0.45, speed: 0, turnRate: 0,  homing: false, blastRadius: 150, damage: 120, hitOnce: true, hp: 999, armTime: 2, lifetime: 300, onImpact: "explosion", telegraph: true, tint: null, scale: 3, hardKnockdown: true },   // Super "Last Light"
}
export function registerMunitionProfile(id, p) { MUNITION_PROFILES[id] = { ...p, id } }

// ── spawn ─────────────────────────────────────────────────────────────────────────
// opts: { x, y, vx, vy, target, damage, blastRadius, scale, chain (bool), owner-side team }
export function spawnMunition(owner, type, opts = {}) {
  const profile = MUNITION_PROFILES[type]
  if (!owner || !profile) return null
  if (activeMunitions.length >= MAX_MUNITIONS) return null
  const face = owner.facing || 1
  const m = {
    id: ++_munIdCounter, type, profile, owner, ownerSide: owner.side,
    playerIndex: owner.playerNumber || (owner.side === "p2" ? 2 : 1),
    x: opts.x != null ? opts.x : (owner.x || 0) + face * 30,
    y: opts.y != null ? opts.y : (owner.y || 0),
    vx: opts.vx != null ? opts.vx : face * (profile.speed || 0),
    vy: opts.vy != null ? opts.vy : 0,
    target: opts.target || null,
    damage: opts.damage != null ? opts.damage : profile.damage,
    blastRadius: opts.blastRadius != null ? opts.blastRadius : profile.blastRadius,
    scale: opts.scale != null ? opts.scale : (profile.scale || 1),
    hp: profile.hp, armT: 0, life: profile.lifetime, frame: 0, detonated: false,
    splitDone: false, _telegraphed: false,
    seed: (owner._matchSeed | 0) || 1,
  }
  activeMunitions.push(m)
  return m
}

export function resetMunitions() { activeMunitions.length = 0; activeFirePatches.length = 0; activeBlasts.length = 0 }

// ── per-frame update. env = { groundY, leftWall, rightWall, fighters, isEnemy(owner,f), platformTopAt(x) } ──
export function updateMunitions(frame, env = {}) {
  const groundY = env.groundY ?? 600
  // blasts (render timers)
  for (let i = activeBlasts.length - 1; i >= 0; i--) { if (--activeBlasts[i].t <= 0) activeBlasts.splice(i, 1) }
  // fire patches (napalm hazard)
  for (let i = activeFirePatches.length - 1; i >= 0; i--) {
    const fp = activeFirePatches[i]
    fp.t--
    if (fp.t % 20 === 0) {
      for (const f of (env.fighters || [])) {
        if (!env.isEnemy?.(fp.owner, f)) continue
        if (Math.abs((f.x || 0) + (f.w || 60) / 2 - fp.x) < 44 && Math.abs((f.y || 0) + (f.h || 100) - fp.y) < 60) {
          applyScaledDamage(f, 4, { source: "ability", attacker: fp.owner, move: "napalmPatch" })
        }
      }
    }
    if (fp.t <= 0) activeFirePatches.splice(i, 1)
  }
  // munitions
  for (let i = activeMunitions.length - 1; i >= 0; i--) {
    const m = activeMunitions[i]
    if (m.detonated) { activeMunitions.splice(i, 1); continue }
    m.armT++
    const p = m.profile
    // GUIDED homing — cap the turn at turnRate deg/frame toward the target.
    if (p.homing && m.target && !m.target.eliminated && m.armT > p.armTime) {
      const tx = (m.target.x || 0) + (m.target.w || 60) / 2, ty = (m.target.y || 0) + (m.target.h || 100) * 0.4
      const ang = Math.atan2(m.vy, m.vx), want = Math.atan2(ty - m.y, tx - m.x)
      let dA = want - ang; while (dA > Math.PI) dA -= 2 * Math.PI; while (dA < -Math.PI) dA += 2 * Math.PI
      const max = (p.turnRate || 4) * Math.PI / 180
      dA = Math.max(-max, Math.min(max, dA))
      const sp = Math.max(6, Math.hypot(m.vx, m.vy)), na = ang + dA
      m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp
    } else {
      m.vy += p.gravity
    }
    m.x += m.vx; m.y += m.vy
    m.frame = _angleFrame(m.vx, m.vy)
    // CLUSTER — split into 3 small bombs at the trigger height.
    if (p.onImpact === "cluster" && !m.splitDone) {
      const splitY = groundY - (groundY - (m.y - 200)) * 0 - (p.splitAtY != null ? (groundY * (1 - p.splitAtY)) : 120)
      if (m.y >= (groundY - 140)) {
        m.splitDone = true
        for (let k = 0; k < 3; k++) {
          const h = hashRandom(m.seed, frame + k * 7, m.playerIndex * 31 + k)
          spawnMunition(m.owner, "dumb", { x: m.x + (k - 1) * 28, y: m.y, vx: (k - 1) * 2 + (h - 0.5) * 2, vy: 2, damage: Math.round(m.damage * 0.5), blastRadius: m.blastRadius * 0.7, scale: m.scale * 0.6, target: m.target })
        }
        _detonate(m, frame, env, true)   // the cluster shell itself bursts (no big AoE)
        activeMunitions.splice(i, 1); continue
      }
    }
    // ground / platform landing
    const landY = (env.platformTopAt?.(m.x) ?? groundY)
    let hitFighter = null
    for (const f of (env.fighters || [])) {
      if (!env.isEnemy?.(m.owner, f)) continue
      if (m.armT > p.armTime && Math.abs((f.x || 0) + (f.w || 60) / 2 - m.x) < (f.w || 60) / 2 + 14 && Math.abs((f.y || 0) + (f.h || 100) / 2 - m.y) < (f.h || 100) / 2 + 14) { hitFighter = f; break }
    }
    if (hitFighter || m.y >= landY || --m.life <= 0 || m.x < (env.leftWall ?? -200) || m.x > (env.rightWall ?? 4000)) {
      if (hitFighter) { m.x = (hitFighter.x || 0) + (hitFighter.w || 60) / 2; m.y = (hitFighter.y || 0) + (hitFighter.h || 100) / 2 }   // centre the blast on a direct hit
      else if (m.y > landY) m.y = landY
      _detonate(m, frame, env, false)
      activeMunitions.splice(i, 1)
    }
  }
}

// Shoot-down: any attack hitbox / projectile overlapping an armed munition (hp 1) detonates it early.
export function updateMunitionShootDown(fighters, projectiles, frame, env = {}) {
  if (!activeMunitions.length) return
  for (let i = activeMunitions.length - 1; i >= 0; i--) {
    const m = activeMunitions[i]
    if (m.detonated || m.profile.hp > 1) continue
    let shot = false
    for (const f of fighters) {
      if (!f || !env.isEnemy?.(m.owner, f) || !f.attacking || !f.currentAttack) continue
      const reach = f.currentAttack.rangeX || 70, cx = (f.x || 0) + (f.facing || 1) * reach * 0.5
      if (Math.abs(cx - m.x) < reach && Math.abs((f.y || 0) + (f.h || 100) / 2 - m.y) < (f.h || 100) / 2 + 30) { shot = true; break }
    }
    if (!shot && Array.isArray(projectiles)) {
      for (const pr of projectiles) {
        if (!pr.owner || !env.isEnemy?.(m.owner, pr.owner)) continue
        if (Math.abs((pr.x || 0) - m.x) < (pr.w || 16) + 12 && Math.abs((pr.y || 0) - m.y) < (pr.h || 12) + 12) { shot = true; break }
      }
    }
    if (shot) { _detonate(m, frame, env, false); activeMunitions.splice(i, 1) }   // shot-down bomb still blows (it's a bomb)
  }
}

// ── explosion: AoE damage (hitOnce per blast), status, chain reaction, blast-hop ──
function _detonate(m, frame, env, suppressAoe) {
  if (m.detonated) return
  m.detonated = true
  const p = m.profile, owner = m.owner
  if (!suppressAoe) explodeAt(owner, m.x, m.y, { blastRadius: m.blastRadius, damage: m.damage, onImpact: p.onImpact, scale: m.scale, hardKnockdown: p.hardKnockdown }, env, 0, 1)
  else _blast(m.x, m.y, m.scale * 0.6)
}

// Public AoE explosion used by _detonate + chain + callers (e.g. fire-arrow-detonates-a-bomb).
export function explodeAt(owner, x, y, spec, env = {}, chainDepth = 0, dmgScale = 1) {
  const radius = spec.blastRadius || 70, dmg = (spec.damage || 0) * dmgScale
  const hitId = ++_blastIdCounter
  for (const f of (env.fighters || [])) {
    if (!env.isEnemy?.(owner, f)) continue
    const fx = (f.x || 0) + (f.w || 60) / 2, fy = (f.y || 0) + (f.h || 100) / 2
    if (Math.hypot(fx - x, fy - y) > radius) continue
    if (f._gaBlastHit === hitId) continue; f._gaBlastHit = hitId    // hitOnce per explosion
    if (dmg > 0) {
      const d = f.isBlocking ? dmg * 0.5 : dmg                       // -50% on block
      applyScaledDamage(f, d, { source: "ability", attacker: owner, move: "gaMunition" })
      if (spec.hardKnockdown) { f.vy = 12; f.isLaunched = true; f.hitstun = Math.max(f.hitstun || 0, 36); f.knockdownState = true }
      else { f.hitstun = Math.max(f.hitstun || 0, 14) }
    }
    // onImpact status
    if (spec.onImpact === "napalm") { /* patch is spawned below */ }
    else if (spec.onImpact === "emp") { f._gaDisabled = Math.max(f._gaDisabled || 0, 120) }
    else if (spec.onImpact === "net") { f._gaNetted = Math.max(f._gaNetted || 0, 48); f.vx = 0 }
    else if (spec.onImpact === "flash") { f._gaFlash = 18; f.hitstun = Math.max(f.hitstun || 0, 24) }
  }
  if (spec.onImpact === "napalm") _spawnFirePatch(owner, x, (env.groundY ?? y))
  _blast(x, y, spec.scale || 1)
  // CHAIN REACTION — nearby armed munitions detonate after 6f, depth-capped at 3, 70% damage.
  if (chainDepth < 3) {
    for (const o of activeMunitions) {
      if (o.detonated || o._chainQueued) continue
      if (Math.hypot(o.x - x, o.y - y) < radius * 1.2) { o._chainQueued = true; o._chainT = 6; o._chainDepth = chainDepth + 1 }
    }
  }
  // BLAST HOP — the owner is never damaged by their own blast, but gets pushed (up, 10f no-control).
  if (owner && _blastHopOn) {
    const ox = (owner.x || 0) + (owner.w || 60) / 2, oy = (owner.y || 0) + (owner.h || 100) / 2
    if (Math.hypot(ox - x, oy - y) < radius) { owner.vy = -8; owner.vx += (ox < x ? -1 : 1) * 4; owner._gaBlastHop = 10 }
  }
}

// process queued chain detonations (called each frame from updateMunitions caller order)
export function tickMunitionChains(frame, env) {
  for (let i = activeMunitions.length - 1; i >= 0; i--) {
    const o = activeMunitions[i]
    if (!o._chainQueued) continue
    if (--o._chainT <= 0) { _detonate2(o, frame, env, o._chainDepth); activeMunitions.splice(i, 1) }
  }
}
function _detonate2(m, frame, env, depth) {
  if (m.detonated) return; m.detonated = true
  explodeAt(m.owner, m.x, m.y, { blastRadius: m.blastRadius, damage: m.damage, onImpact: m.profile.onImpact, scale: m.scale }, env, depth, 0.7)
}

function _blast(x, y, scale) { activeBlasts.push({ x, y, scale, t: 24, frame: 0 }) }
function _spawnFirePatch(owner, x, groundY) {
  if (activeFirePatches.length >= MAX_FIRE_PATCHES) activeFirePatches.shift()
  activeFirePatches.push({ owner, x, y: groundY, t: 180 })   // 3s
}

let _blastHopOn = true
export function setBlastHop(on) { _blastHopOn = !!on }
export function isBlastHop() { return _blastHopOn }

// angle → BOMBS frame (0° horizontal = frame 0, 90° nose-down = frame 5)
function _angleFrame(vx, vy) {
  const a = Math.atan2(Math.abs(vy), Math.abs(vx)) / (Math.PI / 2)   // 0..1
  return Math.max(0, Math.min(5, Math.round(a * 5)))
}

// ── RENDER (bombs angle-rotated + mirrored, telegraph reticles, explosions, fire patches) ──
const _mImgs = {}
function _mImg(src) { if (!src) return null; let im = _mImgs[src]; if (!im && typeof Image !== "undefined") { im = new Image(); im.src = src; _mImgs[src] = im } return im }

export function drawMunitions(ctx, frame = 0) {
  if (!ctx) return
  // fire patches (flame frames)
  const fimg = _mImg(FIRE_SHEET)
  for (const fp of activeFirePatches) {
    if (fimg && fimg.complete && fimg.naturalWidth) {
      const fw = fimg.naturalWidth / 5, fh = fimg.naturalHeight, fi = Math.floor(frame / 5) % 3
      ctx.save(); ctx.globalAlpha = 0.85; ctx.drawImage(fimg, fi * fw, 0, fw, fh, fp.x - fw * 0.9, fp.y - fh * 1.3, fw * 1.8, fh * 1.4); ctx.restore()
    } else { ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = "#ff6a2a"; ctx.fillRect(fp.x - 36, fp.y - 14, 72, 14); ctx.restore() }
  }
  // bombs
  const bimg = _mImg(BOMBS_SHEET)
  for (const m of activeMunitions) {
    // telegraph reticle (20f before impact): brackets on the ground at the predicted x.
    if (m.profile.telegraph) _reticle(ctx, m.x, m.y, m.profile.homing ? "#5fe0ff" : "#ff9a3c")
    if (bimg && bimg.complete && bimg.naturalWidth) {
      const fw = bimg.naturalWidth / 6, fh = bimg.naturalHeight, sc = (m.scale || 1) * 1.8
      ctx.save(); ctx.translate(m.x, m.y); if ((m.vx || 0) < 0) ctx.scale(-1, 1)
      if (m.profile.tint) { ctx.globalAlpha = 0.9 }
      ctx.drawImage(bimg, m.frame * fw, 0, fw, fh, -fw * sc / 2, -fh * sc / 2, fw * sc, fh * sc)
      if (m.profile.tint) { ctx.globalCompositeOperation = "source-atop"; ctx.globalAlpha = 0.4; ctx.fillStyle = m.profile.tint; ctx.fillRect(-fw * sc / 2, -fh * sc / 2, fw * sc, fh * sc) }
      ctx.restore()
    } else { ctx.save(); ctx.fillStyle = m.profile.tint || "#88a"; ctx.fillRect(m.x - 8 * (m.scale || 1), m.y - 6 * (m.scale || 1), 16 * (m.scale || 1), 12 * (m.scale || 1)); ctx.restore() }
  }
  // explosions (GA explosion frames, scaled by blast radius)
  const eimg = _mImg(EXPL_SHEET)
  for (const b of activeBlasts) {
    const prog = 1 - b.t / 24, fi = Math.min(3, Math.floor(prog * 4))
    if (eimg && eimg.complete && eimg.naturalWidth) {
      const fw = eimg.naturalWidth / 4, fh = eimg.naturalHeight, sc = (b.scale || 1) * 1.6
      ctx.save(); ctx.globalAlpha = Math.min(1, b.t / 10 + 0.2); ctx.drawImage(eimg, fi * fw, 0, fw, fh, b.x - fw * sc / 2, b.y - fh * sc, fw * sc, fh * sc); ctx.restore()
    } else { ctx.save(); ctx.globalAlpha = b.t / 24; ctx.fillStyle = "#ff8a3c"; ctx.beginPath(); ctx.arc(b.x, b.y, 30 * (b.scale || 1) * (0.5 + prog), 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  }
}
function _reticle(ctx, x, y, col) {
  ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; const r = 16
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath(); ctx.moveTo(x + sx * r, y + sy * r - sy * 6); ctx.lineTo(x + sx * r, y + sy * r); ctx.lineTo(x + sx * r - sx * 6, y + sy * r); ctx.stroke()
  }
  ctx.restore()
}

export function getActiveMunitions() { return activeMunitions }
export function munitionCount() { return activeMunitions.length }

// Training debug — blast radii + bomb HP + chain markers.
let _munDebug = false
export function setMunitionDebug(on) { _munDebug = !!on }
export function drawMunitionDebug(ctx) {
  if (!ctx || !_munDebug) return
  ctx.save()
  for (const m of activeMunitions) {
    ctx.strokeStyle = "#ff3b6b"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(m.x, m.y, m.blastRadius, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = "#fff"; ctx.font = "8px monospace"; ctx.fillText(`${m.type} hp${m.hp}${m._chainQueued ? " chain" + m._chainDepth : ""}`, m.x - 20, m.y - m.blastRadius - 4)
  }
  ctx.restore()
}
