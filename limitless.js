// LIMITLESS — a generic, PROFILE-DRIVEN module (like flight.js / elements.js / drones.js) for space-bending techniques:
//   A) a CURSED ENERGY economy (fixed point, smooth per-frame drain / regen, Depleted lock),
//   B) FIELDS that act on fighters, projectiles, clones, drones, summons and munitions:
//        ATTRACT point (Blue), REPEL burst (Red), INFINITY shell (Zeno boundary), ERASE path (Hollow Purple).
// A user owns plain JSON state (stored on its own GAME_STATE object, e.g. f._gs) and registers a profile; this module
// keeps no match state of its own — only the static profile registry. No RNG, no wall clock, no rendering.
// Every distance is integer-rounded before it is written back, so two peers compute identical positions.
// Guide: docs/msv1/gojo/LIMITLESS.md.

export const LIMITLESS_PROFILES = {}
export function registerLimitlessProfile(key, p) { LIMITLESS_PROFILES[key] = p; return p }
export const limitlessProfile = f => LIMITLESS_PROFILES[f?.rosterKey] || null

// ── A) CURSED ENERGY ────────────────────────────────────────────────────────────────────────────────────────────
// state.ce is an integer in units (profile.ceUnit per CE). Rates are CE per second; per-frame amounts are integers
// because ceUnit is chosen so that every rate × ceUnit / 60 is whole (Gojo: 600 units per CE).
export function ceInit(st, P) { st.ce = P.ce.start * P.ceUnit; st.ceLock = 0; st.depleted = 0 }
export const ceValue = (st, P) => st.ce / P.ceUnit                       // float CE, for HUD / AI reads
export const ceHas = (st, P, n) => st.ce >= Math.round(n * P.ceUnit)
export function ceSpend(st, P, n) { const u = Math.round(n * P.ceUnit); if (st.ce < u) return false; st.ce -= u; return true }
export function ceGain(st, P, n) { st.ce = Math.min(P.ce.max * P.ceUnit, st.ce + Math.round(n * P.ceUnit)) }
// one frame. opts: { infinity: level (0 = off), casting, zone, frozen }. Returns 'depleted' on the frame CE hits 0
// while something was draining it.
export function ceTick(st, P, opts = {}) {
  if (st.ceLock > 0) st.ceLock--
  const lv = opts.infinity | 0
  if (lv > 0) {
    const d = Math.round(P.infinity.levels[lv].drain * P.ceUnit / 60)
    st.ce = Math.max(0, st.ce - d)
    if (st.ce === 0) { st.ceLock = P.ce.depletedLock; st.depleted++; return 'depleted' }
    return null
  }
  if (!opts.casting && !opts.frozen) {
    const r = Math.round(P.ce.regen * (opts.zone ? P.ce.zoneRegenMult : 1) * P.ceUnit / 60)
    st.ce = Math.min(P.ce.max * P.ceUnit, st.ce + r)
  }
  return null
}

// ── geometry helpers ──
const cx = o => (o.x || 0) + (o.w || 48) / 2
const cy = o => (o.y || 0) + (o.h || 94) / 2
const pr = p => p.radius || Math.max(p.w || 0, p.h || 0) / 2 || 10
// distance from a point to the axis-aligned box of a fighter (0 inside)
export function boxDist(f, x, y) {
  const dx = Math.max(f.x - x, 0, x - (f.x + f.w)), dy = Math.max(f.y - y, 0, y - (f.y + f.h))
  return Math.sqrt(dx * dx + dy * dy)
}
export const isSuperProjectile = p => !!(p && (p.isUltimate || p.isSuper || p.super || p.ultimate || p.cinematic))

// ── B) FIELDS ───────────────────────────────────────────────────────────────────────────────────────────────────
// World adapter (W) used here: fighters(), projectileList(), summons(), drones(), munitions(), clones(f) (array of
// clone objects with x/y/w/h), erasers: removeProjectile(p), removeSummon(s), removeDrone(d), removeMunition(m),
// removeClone(owner, c), removePatch(owner, patch), patches() → [{ owner, patch }], stageWidth().
const list = v => (typeof v === 'function' ? v() : v) || []

// ATTRACT (Blue): pull fighters (not the owner) and non-super projectiles toward (x, y). Strength grows toward the core.
// Projectiles that reach the core are CRUSHED (removed). Returns { crushed, inCore: [fighters] }.
export function fieldAttract(owner, field, W, opt = {}) {
  const out = { crushed: 0, inCore: [] }
  for (const o of list(W.fighters)) {
    if (!o || o === owner || !(o.health > 0) || (o.team && owner.team && o.team === owner.team)) continue
    if (o.isGrabbed && !opt.grabbed) continue
    const dx = field.x - cx(o), dy = field.y - cy(o), d = Math.sqrt(dx * dx + dy * dy)
    if (d > field.r) continue
    if (d <= field.core) { out.inCore.push(o); continue }
    const k = field.pull + (field.pullCore - field.pull) * (1 - d / field.r)
    const step = Math.min(k, d - field.core * 0.5)
    o.x = Math.round(o.x + (dx / d) * step)
    if (opt.lift !== false) o.y = Math.round(o.y + (dy / d) * step * (o.onGround || o.grounded ? 0 : 1))
    o.vx = 0
    out.pulled = (out.pulled || 0) + 1
  }
  const P = list(W.projectileList)
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; if (!p || p.owner === owner || isSuperProjectile(p) || p.visualOnly) continue
    const dx = field.x - p.x, dy = field.y - p.y, d = Math.sqrt(dx * dx + dy * dy)
    if (d > field.r) continue
    if (d <= field.core * 0.6) { W.removeProjectile(p); out.crushed++; continue }
    const k = field.pullCore * 1.4
    p.x = Math.round(p.x + (dx / d) * Math.min(k, d)); p.y = Math.round(p.y + (dy / d) * Math.min(k, d))
    p.vx = Math.round((p.vx || 0) * 0.7 * 100) / 100; p.vy = Math.round((p.vy || 0) * 0.7 * 100) / 100
  }
  // drones / summons / munitions inside the core are crushed; inside the radius they drift in
  out.crushed += crushObjects(owner, field, W)
  return out
}
function crushObjects(owner, field, W) {
  let n = 0
  const sets = [[W.drones, W.removeDrone], [W.summons, W.removeSummon], [W.munitions, W.removeMunition]]
  for (const [L, rm] of sets) {
    const arr = list(L)
    for (let i = arr.length - 1; i >= 0; i--) {
      const o = arr[i]; if (!o || o.owner === owner || o.ownerF === owner) continue
      const ox = o.w ? cx(o) : (o.x || 0), oy = o.h ? cy(o) : (o.y || 0)
      const dx = field.x - ox, dy = field.y - oy, d = Math.sqrt(dx * dx + dy * dy)
      if (d > field.r) continue
      if (d <= field.core) { rm?.(o); n++; continue }
      const s = Math.min(field.pullCore, d)
      o.x = Math.round((o.x || 0) + (dx / d) * s); o.y = Math.round((o.y || 0) + (dy / d) * s)
    }
  }
  return n
}

// REPEL (Red): every non-owner object within r of (x, y) is pushed out. Non-super projectiles in `reflectRect` are
// REFLECTED back at full speed and change sides (they now belong to the owner). Returns { reflected, pushed }.
export function fieldRepel(owner, field, W, opt = {}) {
  const out = { reflected: 0, pushed: [] }
  const P = list(W.projectileList)
  for (const p of P) {
    if (!p || p.owner === owner || isSuperProjectile(p) || p.visualOnly || p._gsReflected) continue
    const R = opt.reflectRect
    const inRect = R && p.x >= R.x && p.x <= R.x + R.w && p.y >= R.y && p.y <= R.y + R.h
    const dx = p.x - field.x, dy = p.y - field.y, d = Math.sqrt(dx * dx + dy * dy)
    if (!inRect && d > field.r) continue
    const sp = Math.max(Math.abs(p.vx || 0), Math.abs(p.speed || 0), 6)
    p.vx = Math.sign(dx || owner.facing || 1) * sp; p.vy = -(p.vy || 0)
    p.owner = owner; p.ownerId = owner.side; p._gsReflected = true
    p.x = Math.round(p.x + Math.sign(p.vx) * 12)
    out.reflected++
  }
  for (const o of list(W.fighters)) {
    if (!o || o === owner || !(o.health > 0)) continue
    const dx = cx(o) - field.x, dy = cy(o) - field.y, d = Math.sqrt(dx * dx + dy * dy)
    if (d > field.r) continue
    out.pushed.push(o)
  }
  return out
}

// ERASE (Hollow Purple): everything that is not a fighter inside the circle is deleted: every projectile (supers
// included), clones / illusions, summons, drones, munitions, traps and ground patches. Returns a count per kind.
export function fieldErase(owner, circle, W) {
  const hit = (x, y, w = 0, h = 0) => {
    const nx = Math.max(x, Math.min(circle.x, x + w)), ny = Math.max(y, Math.min(circle.y, y + h))
    const dx = circle.x - nx, dy = circle.y - ny
    return dx * dx + dy * dy <= circle.r * circle.r
  }
  const n = { projectiles: 0, clones: 0, summons: 0, drones: 0, munitions: 0, patches: 0 }
  const P = list(W.projectileList)
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; if (p && p.owner !== owner && !p._gsOwn && hit(p.x - pr(p), p.y - pr(p), pr(p) * 2, pr(p) * 2)) { W.removeProjectile(p); n.projectiles++ } }
  for (const [k, L, rm] of [['summons', W.summons, W.removeSummon], ['drones', W.drones, W.removeDrone], ['munitions', W.munitions, W.removeMunition]]) {
    const arr = list(L)
    for (let i = arr.length - 1; i >= 0; i--) { const o = arr[i]; if (o && o.owner !== owner && o.ownerF !== owner && hit(o.x || 0, o.y || 0, o.w || 0, o.h || 0)) { rm?.(o); n[k]++ } }
  }
  for (const o of list(W.fighters)) {
    if (!o || o === owner) continue
    for (const c of [...(W.clones?.(o) || [])]) if (hit(c.x || 0, c.y || 0, c.w || 48, c.h || 94)) { W.removeClone?.(o, c); n.clones++ }
  }
  for (const { owner: po, patch } of (W.patches?.() || [])) {
    if (po === owner) continue
    const top = (patch.y ?? circle.y) - 20
    if (hit(patch.x, top, patch.width || patch.w || 0, 40)) { W.removePatch?.(po, patch); n.patches++ }
  }
  return n
}

// ── INFINITY SHELL (Zeno) ────────────────────────────────────────────────────────────────────────────────────────
// Incoming non-owner projectiles slow down the closer they get to a boundary just outside the owner's box and never
// reach it. The slowdown uses the engine's per-projectile timeScale lease (refreshed every frame, lapses by itself).
// Returns the projectiles that reached the boundary THIS frame (the caller taxes CE for them).
export function infinityShell(owner, lvP, W, opt = {}) {
  const reached = []
  const P = list(W.projectileList)
  for (const p of P) {
    if (!p || p.owner === owner || p.visualOnly || p._gsOwn) continue
    if (isSuperProjectile(p) && lvP.supers !== 'stop') continue                  // L1 / L2: supers are adjudicated on contact
    if (opt.bypass?.(p)) continue
    const d = boxDist(owner, p.x, p.y) - pr(p)
    const approaching = ((p.vx || 0) * (cx(owner) - p.x) + (p.vy || 0) * (cy(owner) - p.y)) > 0
    if (d > lvP.slow + lvP.boundary) continue
    if (p._gsHang != null) {                                                       // hanging at the boundary
      p.timeScaleT = 1; p.timeScale = 0
      if (++p._gsHang >= opt.hangFrames) { W.removeProjectile(p) }
      continue
    }
    if (!approaching) continue
    const k = Math.max(0, Math.min(1, (d - lvP.boundary) / lvP.slow))
    const sp = Math.hypot(p.vx || 0, p.vy || 0)
    if (d <= lvP.boundary || k * k * sp < 0.5) {                                   // at the boundary (or stalled just outside it)
      if (lvP.repel > 0) {                                                        // L2/L3: pushed back toward its owner at half speed
        p.vx = -(p.vx || 0) * 0.5; p.vy = -(p.vy || 0) * 0.5; p._gsRepelled = true
      } else { p._gsHang = 0; p.timeScaleT = 1; p.timeScale = 0 }
      reached.push(p)
      continue
    }
    // Zeno: speed falls off toward 0 at the boundary (quadratic ease → visibly "never arrives")
    p.timeScaleT = 1; p.timeScale = Math.round(k * k * 1000) / 1000
  }
  return reached
}
// Repel ring (L2/L3): attackers inside `repel` px of the box are pushed out about one body width (over a few frames).
export function infinityRepel(owner, lvP, W) {
  if (!(lvP.repel > 0)) return []
  const out = []
  for (const o of list(W.fighters)) {
    if (!o || o === owner || !(o.health > 0) || o.isGrabbed) continue
    const gap = o.x > owner.x ? o.x - (owner.x + owner.w) : owner.x - (o.x + o.w)
    if (gap > lvP.repel) continue
    if (Math.abs(cy(o) - cy(owner)) > (owner.h + o.h) / 2 + 10) continue
    const dir = cx(o) >= cx(owner) ? 1 : -1
    const sw = W.stageWidth?.() || 3200
    o.x = Math.round(Math.max(0, Math.min(sw - o.w, o.x + dir * Math.min(8, lvP.repel - gap + 2))))
    out.push(o)
  }
  return out
}
