/**
 * falconzord.js — SHARED FALCONZORD SORTIE SYSTEM (profile-driven, like rangers.js / flight.js / drones.js).
 *
 * A sortie is a short SCRIPTED assist: the owner commits a call, the Falconzord runs one data path, strikes during
 * authored contact windows, and leaves. It is never a fighter: no HP bar, no body-blocking, no input, no AI, no homing.
 *
 * Why not drones.js: drones carry HP (damageDrone), pick targets every tick (pickDroneTarget) and hover until recalled.
 * The brief forbids all three for the Falconzord, so this module reuses the PATTERN (pure data profiles, one shared
 * module, owner-keyed state, deterministic hashing via rangers.js), not the drone behaviour.
 *
 * SIM vs RENDER
 *   • All gameplay state is plain JSON on `owner._falcon` (pips, recharge, lockouts, the active sortie, hit tracking).
 *     game.js pushes it into the replay checkpoint snapshot.
 *   • The bird's position is a PURE function of (profile keys, age, origin, dir) captured at commit time. It is never
 *     derived from the last draw and never re-reads the target after commit.
 *   • No Math.random / gameRng. Cosmetic variation (render side) uses rangerHash.
 *   • Hits go through the engine's damage choke-point (W.damage = combat.applyScaledDamage) with the shared combo
 *     damage / hitstun scaling (W.comboScale / W.hitstunScale), juggle counting and hitstop.
 *
 * One sortie per owner at a time. Ownership key = the owner fighter object (each player has its own `_falcon`), so
 * mirrors are independent. A sortie can never summon anything (no recursion): profiles have no call field.
 *
 * WORLD (W): { stageWidth, fighters(), spawn(owner,type,md), projectiles (array), damage(t,n,o), comboScale(f),
 *              hitstunScale(f), hitstop(att,def,frames) } — handed in by the owner's character module.
 */
export const FALCON_SORTIES = {}
export function registerFalconSortie(id, p) {
  FALCON_SORTIES[id] = Object.freeze({ id, contacts: [], shots: null, ...p })
  return FALCON_SORTIES[id]
}

// ── Owner state ──────────────────────────────────────────────────────────────────────────────────────────────────
export function falconState(f, R) {
  return f._falcon ||= { pips: R.pips, max: R.pips, refill: 0, lockout: 0, postUlt: 0, sortie: null, serial: 0,
    calls: 0, commits: 0, cancels: 0, hits: 0, blocked: 0, shotsFired: 0, events: [] }
}
export function clearFalcon(f, W) {
  if (!f) return
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._falcon) W.projectiles.splice(i, 1)
  delete f._falcon
}
// Retire the live sortie (ultimate entry, owner replaced, round end). Its unfired/unconsumed shots vanish too.
export function retireSortie(f, W) {
  const s = f?._falcon; if (!s) return false
  const had = !!s.sortie
  s.sortie = null
  if (W?.projectiles) for (let i = W.projectiles.length - 1; i >= 0; i--) if (W.projectiles[i]?.owner === f && W.projectiles[i]._falcon) W.projectiles.splice(i, 1)
  return had
}
// May this owner call `kind` right now? (resource side only — the character module checks its own body state)
export function falconCanCall(f, kind, energy, R) {
  const P = FALCON_SORTIES[kind], s = f?._falcon
  if (!P || !s) return false
  return s.pips > 0 && s.lockout <= 0 && s.postUlt <= 0 && !s.sortie && !s.pendingKind && (energy || 0) >= P.cost
}
// Spend at CALL START (12 f before commit). Interruption before commit keeps the resources spent.
export function falconPay(f, kind, R) {
  const s = f._falcon, P = FALCON_SORTIES[kind]
  s.pips--; s.lockout = R.lockout; s.calls++; s.pendingKind = kind
  if (s.refill <= 0) s.refill = R.recharge   // sequential recharge: only one pip refills at a time
  return P.cost
}
export function falconCancelCall(f) { const s = f?._falcon; if (s?.pendingKind) { s.pendingKind = null; s.cancels++ } }

const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
// COMMIT: capture the path origin + direction + target region NOW. Nothing is re-read later.
export function falconCommit(f, opp, W) {
  const s = f._falcon, kind = s?.pendingKind, P = FALCON_SORTIES[kind]
  if (!P) return null
  s.pendingKind = null
  const dir = f.facing || 1, sw = W?.stageWidth?.() || 3200, feet = (f.y || 0) + (f.h || 94)
  const tgt = opp && opp.health > 0 ? { x: ctrX(opp), y: ctrY(opp) } : { x: ctrX(f) + dir * 160, y: feet - 50 }
  tgt.x = Math.round(Math.max(40, Math.min(sw - 40, tgt.x))); tgt.y = Math.round(tgt.y)
  const ox = P.origin === 'target' ? tgt.x : Math.round(ctrX(f)), oy = P.origin === 'target' ? tgt.y : Math.round(feet + (P.laneY || 0))
  s.sortie = { kind, age: 0, dir, ox, oy, tx: tgt.x, ty: tgt.y, hits: P.contacts.map(() => []), fired: 0, n: ++s.serial }
  s.commits++
  s.events.push({ type: 'commit', kind })
  return s.sortie
}

// Pure: the bird's world position + pose at an age (linear between keys). Exported for render + tests.
export function falconPos(so, age = so.age) {
  const K = FALCON_SORTIES[so.kind].keys
  let i = 0; while (i < K.length - 2 && age >= K[i + 1][0]) i++
  const [a0, x0, y0, p0] = K[i], [a1, x1, y1] = K[i + 1]
  const u = Math.max(0, Math.min(1, (age - a0) / Math.max(1, a1 - a0)))
  return { x: so.ox + so.dir * (x0 + (x1 - x0) * u), y: so.oy + y0 + (y1 - y0) * u, pose: p0, vx: so.dir * (x1 - x0) / Math.max(1, a1 - a0) }
}
// Contact box (body + talons only — never the wing span). Pure.
export function falconContactBox(so, c, age = so.age) {
  const p = falconPos(so, age), b = c.box
  return { x: p.x - b.w / 2, y: p.y - b.h / 2 + (b.dy || 0), w: b.w, h: b.h }
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurt = f => ({ x: f.x || 0, y: f.y || 0, w: f.w || 48, h: f.h || 94 })

// One authored Falconzord contact on one target. Returns 'hit' | 'blocked' | null.
function strike(f, t, c, so, W, scale, cb) {
  if (!t || t === f || !(t.health > 0) || (t.invulnTimer || 0) > 0 || t.knockdownState || t.isGrabbed) return null
  if (f.team && t.team && f.team === t.team) return null
  const raw = Math.round(c.raw * scale), dir = Math.sign(ctrX(t) - falconPos(so).x) || so.dir
  if (t.isBlocking) {   // ordinary block: special-tier chip (12%, the engine's special chip), authored blockstun, no tag
    t.blockstun = Math.max(t.blockstun || 0, c.blockstun || 12); t.vx = dir * 2
    W.damage?.(t, raw * 0.12, { source: 'assist', attacker: f, move: 'falcon_' + so.kind })
    f.comboCounter = 0
    return 'blocked'
  }
  W.damage?.(t, raw * (W.comboScale?.(f) ?? 1), { source: 'assist', attacker: f, move: 'falcon_' + so.kind })
  if (!t.onGround && !t.grounded) t.juggleCount = (t.juggleCount || 0) + 1
  t.hitstun = Math.max(t.hitstun || 0, Math.round((c.hitstun || 18) * (W.hitstunScale?.(f) ?? 1)))
  t.vx = dir * (c.knockbackX || 0)
  let vy = c.knockbackY || 0
  if (c.launch) { if (cb?.launchAllowed?.(f, t)) { vy = c.launchVy; cb.onLaunch?.(f, t) } }   // one assist launcher per combo
  t.vy = vy; t.isBlocking = false; t.colorFlash = 6
  W.hitstop?.(null, t, 6)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  return 'hit'
}

// Per-simulation-frame tick for one owner. R = resource profile; scale = the owner's damage lever.
// cb: { launchAllowed(f,t), onLaunch(f,t), shotArt } . Returns this tick's events (also s.events).
export function tickFalcon(f, W, R, scale = 1, cb = {}) {
  const s = f?._falcon; if (!s) return []
  const ev = s.events; s.events = []
  if (s.lockout > 0) s.lockout--
  if (s.postUlt > 0) s.postUlt--
  if (s.pips < s.max) { if (s.refill <= 0) s.refill = R.recharge; if (--s.refill <= 0) { s.pips++; ev.push({ type: 'pip' }); if (s.pips < s.max) s.refill = R.recharge } }
  else s.refill = 0
  const so = s.sortie; if (!so) return ev
  const P = FALCON_SORTIES[so.kind]
  const foes = (W.fighters?.() || []).filter(t => t && t !== f)
  P.contacts.forEach((c, i) => {
    if (so.age < c.from || so.age > c.to) return
    const box = falconContactBox(so, c)
    for (const t of foes) {
      if (so.hits[i].includes(t.side || t.playerNumber || 0)) continue          // per-target, per-contact hit tracking
      if (!overlap(box, hurt(t))) continue
      const r = strike(f, t, c, so, W, scale, cb)
      if (!r) continue
      so.hits[i].push(t.side || t.playerNumber || 0)
      if (r === 'hit') s.hits++; else s.blocked++
      ev.push({ type: r, kind: so.kind, contact: i, targetId: t.side || t.playerNumber || 0 })
    }
  })
  if (P.shots) for (let k = so.fired; k < P.shots.length; k++) {
    if (so.age !== P.shots[k].at) continue
    const p = falconPos(so), sx = p.x + so.dir * 40, sy = p.y + 6, S = P.shot
    const dx = so.tx - sx, dy = so.ty - sy, m = Math.hypot(dx, dy) || 1
    const pr = W.spawn?.(f, 'falcon_shot', { damage: Math.round(P.shots[k].raw * scale), speed: S.speed, vx: dx / m * S.speed, vy: dy / m * S.speed,
      spawnX: sx, spawnY: sy, w: S.radius * 2, h: S.radius * 2, radius: S.radius, lifetime: S.lifetime, hitstun: S.hitstun,
      knockbackX: S.knockbackX, knockbackY: S.knockbackY, isSpecial: true, category: 'special',
      sheet: cb.shotArt?.(k) || null, spriteFrames: 1, spriteW: 8, spriteH: 6, spriteScale: 3 })
    if (pr) { pr.damageType = 'energy'; pr._falcon = { kind: so.kind, n: so.n, k } ; s.shotsFired++ }
    so.fired = k + 1
    ev.push({ type: 'shot', kind: so.kind, k })
  }
  if (++so.age >= P.life) { s.sortie = null; ev.push({ type: 'exit', kind: so.kind }) }
  return ev
}
// combat.js projectile hook (via the character module): a Falcon shot connected. Returns the event or null.
export function falconShotHit(proj, target) {
  const o = proj?._falcon && proj.owner, s = o?._falcon
  if (!s) return null
  const e = { type: target.isBlocking ? 'blocked' : 'hit', kind: proj._falcon.kind, shot: proj._falcon.k, targetId: target.side || target.playerNumber || 0 }   // ids only: _falcon is JSON-snapshotted
  if (e.type === 'hit') s.hits++; else s.blocked++
  s.events.push(e)
  return e
}
// HUD helper (pure read): pips + the fraction of the recharging pip.
export function falconHud(f, R) {
  const s = f?._falcon; if (!s) return null
  return { pips: s.pips, max: s.max, refill: s.pips < s.max ? 1 - s.refill / R.recharge : 0, lockout: s.lockout, postUlt: s.postUlt,
    active: s.sortie?.kind || null, pending: s.pendingKind || null }
}
