// ELEMENTS — a generic, PROFILE-DRIVEN element framework (like flight.js / drones.js / rangers.js): a THERMAL resource
// meter, ground PATCHES (any element), same-type MERGING, cross-type REACTIONS and per-patch EFFECTS on whoever stands
// in them. A character owns a `field` (plain JSON, stored on its own GAME_STATE object) and a `thermal` (plain JSON);
// this module never keeps match state of its own — only the static registries of element / reaction / thermal profiles.
// No RNG, no wall clock, no rendering. Adding a new element = registerElement + (optionally) registerReaction: no new
// engine code. Guide: docs/elements/ELEMENT_FRAMEWORK.md.
//
// Geometry follows Arlong's water zones (x = LEFT edge, width; overlap merges with a width cap; the oldest goes first).
// Damage leaves through the caller's ctx.damage (the world's W.damage = applyScaledDamage) with a damageType tag.

export const SCREEN_REF = 1280                       // reference screen width (Arlong's zones use the same reference)

// ── ELEMENT PROFILES ────────────────────────────────────────────────────────────────────────────────────────────
// life (frames) · width / maxWidth (fraction of SCREEN_REF) · maxIntensity · passive (never reacts) · effect:
//   slick: true        ground friction drops for non-owners (an owner with the `walker` trait keeps full control)
//   dot: { every, dmg, damageType }   damage to NON-OWNERS standing in it (owner immune to his own patch)
//   conduct: k         sets the stander's `wet` flag (a profile's attack may multiply by k — Enoch's laser ×1.25)
//   obscure: alpha     render hint (a cloud that hides part of the screen; capped by the renderer)
export const ELEMENT_PROFILES = {}
export function registerElement(type, p = {}) {
  ELEMENT_PROFILES[type] = { type, life: 300, width: 0.16, maxWidth: 0.28, maxIntensity: 3, passive: false, effect: {}, ...p }
  return ELEMENT_PROFILES[type]
}
registerElement('ice',   { life: 420, effect: { slick: true } })
registerElement('fire',  { life: 300, effect: { dot: { every: 20, dmg: 4, damageType: 'energy' } } })
registerElement('water', { life: 360, effect: { conduct: 1.25 } })
registerElement('steam', { life: 180, passive: true, effect: { dot: { every: 30, dmg: 2, damageType: 'energy' }, obscure: 0.55 } })

// ── REACTIONS (unordered pair → result). consume: both patches vanish. spawn: patches created at the OVERLAP
// (intensity: 'plus1' = the higher input intensity + 1). burst: one-time damage to non-owners standing in the overlap,
// scaled by the HIGHER input intensity (scale[intensity-1]). Spawned patches are CALM for `calm` frames (they cannot
// react again straight away — no runaway chains on the frame they appear).
export const REACTIONS = {}
const rk = (a, b) => [a, b].sort().join('+')
export function registerReaction(a, b, spec) { REACTIONS[rk(a, b)] = { a, b, consume: true, spawn: [], burst: null, ...spec }; return REACTIONS[rk(a, b)] }
export const reactionFor = (a, b) => REACTIONS[rk(a, b)] || null
registerReaction('ice', 'fire', { name: 'thermalBurst', spawn: [{ type: 'water' }, { type: 'steam' }],
  burst: { dmg: 45, damageType: 'blunt', knockdown: true, scale: [1, 1.3, 1.6] } })
registerReaction('water', 'fire', { name: 'flashSteam', spawn: [{ type: 'steam' }], burst: { dmg: 25, damageType: 'energy', knockdown: false, scale: [1, 1, 1] } })
registerReaction('water', 'ice', { name: 'freezeSolid', spawn: [{ type: 'ice', intensity: 'plus1' }] })
export const CALM_FRAMES = 20

// ── THERMAL METER ───────────────────────────────────────────────────────────────────────────────────────────────
// One value from min (cold cap) through 0 to max (hot cap). Each element in `elements` belongs to a side: 'cold',
// 'hot' or 'balance' (usable only inside ±balance). Zones: v ≤ cold → COLD ZONE (cold elements cheaper + stronger,
// hot elements locked); v ≥ hot → HOT ZONE (mirror). At a hard cap → OVERLOAD: `overload` frames in which that side's
// elements are locked and the meter rushes back to ±overloadTo. Idle → drifts toward 0 by drift per frame.
export const THERMAL_PROFILES = {}
export function registerThermal(name, p = {}) {
  THERMAL_PROFILES[name] = { name, min: -100, max: 100, cold: -40, hot: 40, balance: 25, drift: 0.8 / 60,
    cheap: 0.8, strong: 1.15, overload: 90, overloadTo: 50, elements: { ice: 'cold', fire: 'hot', water: 'balance' }, ...p }
  return THERMAL_PROFILES[name]
}
export const createThermal = () => ({ v: 0, over: 0, overSide: 0, lock: 0, overloads: 0 })
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const r3 = v => Math.round(v * 1e6) / 1e6             // keep the stored value exactly reproducible (no float drift in snapshots)
export function thermalZone(t, P) {
  if (t.v <= P.cold) return 'cold'
  if (t.v >= P.hot) return 'hot'
  if (Math.abs(t.v) <= P.balance) return 'balance'
  return t.v < 0 ? 'cool' : 'warm'
}
// can `el` be used now? → { ok, why, cost (×), dmg (×) }
export function thermalCheck(t, P, el) {
  const side = P.elements[el] || null, z = thermalZone(t, P)
  if (!side) return { ok: true, why: null, cost: 1, dmg: 1 }
  if (side === 'balance') return z === 'balance' ? { ok: true, why: null, cost: 1, dmg: 1 } : { ok: false, why: 'balance', cost: 1, dmg: 1 }
  const sgn = side === 'cold' ? -1 : 1
  if (t.over > 0 && t.overSide === sgn) return { ok: false, why: 'overload', cost: 1, dmg: 1 }
  if ((side === 'cold' && z === 'hot') || (side === 'hot' && z === 'cold')) return { ok: false, why: 'locked', cost: 1, dmg: 1 }
  const own = (side === 'cold' && z === 'cold') || (side === 'hot' && z === 'hot')
  return { ok: true, why: null, cost: own ? P.cheap : 1, dmg: own ? P.strong : 1 }
}
// push the meter by delta (negative = colder). Returns 'overload' when this push hit a cap.
export function thermalPush(t, P, delta) {
  if (t.lock > 0 || !delta) return null
  t.v = r3(clamp(t.v + delta, P.min, P.max))
  if (t.over <= 0 && (t.v <= P.min || t.v >= P.max)) {
    t.overSide = t.v <= P.min ? -1 : 1; t.over = P.overload; t.overloads++
    return 'overload'
  }
  return null
}
// per-frame: overload countdown + rush back; lock countdown; idle drift toward 0
export function thermalTick(t, P, active) {
  if (t.lock > 0) { t.lock--; return }
  if (t.over > 0) {
    t.over--
    const target = t.overSide * P.overloadTo, k = 1 / Math.max(1, t.over + 1)
    t.v = r3(t.v + (target - t.v) * Math.max(k, 0.08))
    if (t.over === 0) { t.v = r3(target); t.overSide = 0 }
    return
  }
  if (!active && t.v !== 0) t.v = r3(Math.abs(t.v) <= P.drift ? 0 : t.v - Math.sign(t.v) * P.drift)
}

// ── PATCH FIELD ─────────────────────────────────────────────────────────────────────────────────────────────────
// patch = { id, type, x (left edge), width, bornFrame, owner, intensity, floor, life, calm, disc? }
export const createField = (max = 4) => ({ patches: [], seq: 0, max, ticks: {}, events: [] })
const P0 = type => ELEMENT_PROFILES[type] || registerElement(type)
const overlap = (a, b) => Math.abs(a.floor - b.floor) < 10 && a.x < b.x + b.width && b.x < a.x + a.width
const capW = type => Math.round(P0(type).maxWidth * SCREEN_REF)
export const defaultWidth = type => Math.round(P0(type).width * SCREEN_REF)

// Add a patch. o = { type, cx (centre) | x (left), width?, owner, intensity?, floor, frame, extend?, life?, disc?, minX?, maxX? }
// extend: grow an overlapping same-type patch WITHOUT raising its intensity (a trail being laid).
// Returns the events produced (merge / reaction / burst / evict) and appends them to field.events.
export function addPatch(field, o, depth = 0) {
  const ev = []
  const type = o.type, prof = P0(type), w = Math.round(o.width ?? defaultWidth(type))
  let x = Math.round(o.x ?? (o.cx - w / 2))
  if (o.minX != null) x = Math.max(o.minX, x)
  if (o.maxX != null) x = Math.min(o.maxX - w, x)
  const p = { id: ++field.seq, type, x, width: w, bornFrame: o.frame | 0, owner: o.owner ?? 0, intensity: Math.min(prof.maxIntensity, o.intensity || 1),
    floor: Math.round(o.floor), life: o.life ?? prof.life, calm: (o.frame | 0) + (o.calm || 0) }
  if (o.disc) p.disc = { ...o.disc }
  // 1. same-type MERGE (a disc never merges: it is a platform with its own hit points)
  if (!p.disc) for (let i = field.patches.length - 1; i >= 0; i--) {
    const q = field.patches[i]
    if (q.type !== type || q.disc || !overlap(p, q)) continue
    let lo = Math.min(p.x, q.x), hi = Math.max(p.x + p.width, q.x + q.width); const cap = capW(type)
    if (hi - lo > cap) { if (p.x + p.width / 2 >= q.x + q.width / 2) lo = hi - cap; else hi = lo + cap }
    p.x = lo; p.width = hi - lo
    p.intensity = Math.min(prof.maxIntensity, o.extend ? Math.max(p.intensity, q.intensity) : Math.max(p.intensity, q.intensity) + 1)
    p.id = q.id; field.patches.splice(i, 1)
    ev.push({ kind: 'merge', type, id: p.id, intensity: p.intensity, x: p.x, width: p.width, extend: !!o.extend })
  }
  // 2. cross-type REACTIONS (oldest first; a calm or passive patch never reacts)
  const now = o.frame | 0
  if (!prof.passive && !p.disc && depth < 3) {
    const order = field.patches.map((q, i) => i).sort((a, b) => field.patches[a].bornFrame - field.patches[b].bornFrame || field.patches[a].id - field.patches[b].id)
    for (const i of order) {
      const q = field.patches[i]
      if (!q || q.disc || P0(q.type).passive || q.calm > now || p.calm > now || !overlap(p, q)) continue   // a hovering disc is a platform: its owner melts it (never a ground reaction)
      const R = reactionFor(type, q.type); if (!R) continue
      const lo = Math.max(p.x, q.x), hi = Math.min(p.x + p.width, q.x + q.width), cx = (lo + hi) / 2
      const hiInt = Math.max(p.intensity, q.intensity)
      field.patches.splice(field.patches.indexOf(q), 1)
      const e = { kind: 'reaction', name: R.name, a: type, b: q.type, x0: lo, x1: hi, cx, floor: p.floor, intensity: hiInt, owner: p.owner, disc: !!q.disc || !!p.disc, frame: now }
      ev.push(e)
      if (R.burst) ev.push({ kind: 'burst', name: R.name, x0: lo, x1: hi, cx, floor: p.floor, owner: p.owner, dmg: R.burst.dmg * (R.burst.scale[hiInt - 1] ?? 1),
        damageType: R.burst.damageType, knockdown: !!R.burst.knockdown, intensity: hiInt, frame: now })
      const ow = Math.max(48, Math.round(hi - lo))
      for (const s of R.spawn) {
        const it = s.intensity === 'plus1' ? hiInt + 1 : 1
        ev.push(...addPatch(field, { type: s.type, cx, width: ow, owner: p.owner, intensity: it, floor: p.floor, frame: now, calm: CALM_FRAMES }, depth + 1))
      }
      field.events.push(...ev)
      return ev                                        // the new patch was consumed by the reaction
    }
  }
  field.patches.push(p)
  ev.push({ kind: 'add', type, id: p.id, x: p.x, width: p.width, intensity: p.intensity, disc: !!p.disc })
  // 3. CAP: the oldest patches go first
  while (field.patches.length > field.max) {
    let k = 0; for (let i = 1; i < field.patches.length; i++) if (field.patches[i].bornFrame < field.patches[k].bornFrame) k = i
    const gone = field.patches.splice(k, 1)[0]; ev.push({ kind: 'evict', type: gone.type, id: gone.id, x: gone.x, width: gone.width, disc: !!gone.disc })
  }
  field.events.push(...ev)
  return ev
}
export function removePatch(field, id) { const i = field.patches.findIndex(p => p.id === id); return i >= 0 ? field.patches.splice(i, 1)[0] : null }
// Convert a patch to another type in place (Tide Break). Returns the old type.
export function convertPatch(field, p, type, frame) { const old = p.type; p.type = type; p.bornFrame = frame | 0; p.life = P0(type).life; p.calm = (frame | 0) + CALM_FRAMES; delete p.disc; return old }

// Expire patches (frame - bornFrame >= life). Returns the expired list.
export function tickField(field, frame) {
  const gone = []
  for (let i = field.patches.length - 1; i >= 0; i--) { const p = field.patches[i]; if ((frame | 0) - p.bornFrame >= p.life) gone.push(field.patches.splice(i, 1)[0]) }
  if (field.events.length > 32) field.events.splice(0, field.events.length - 32)
  return gone
}
export const patchesAt = (field, x, floor, tol = 10) => field.patches.filter(p => x >= p.x && x <= p.x + p.width && Math.abs(floor - p.floor) < tol)

// Per-frame EFFECTS on fighters standing (grounded) in the field's patches.
// ctx = { frame, owner (side id), sideOf(f), grounded(f), feet(f), cx(f), walker(f) → bool, damage(t, n, opts) }
// Writes, per fighter and per owner: f._elSlick[owner] = away-direction (±1) or 0 · f._elWet[owner] = conduct (0 = dry).
// Returns [{ fighter, type, dmg }] for the damage actually dealt this frame.
export function applyPatchEffects(field, fighters, ctx) {
  const out = []
  for (const f of fighters) {
    if (!f) continue
    const side = ctx.sideOf(f), key = String(ctx.owner)
    const slick = (f._elSlick ||= {}), wet = (f._elWet ||= {})
    slick[key] = 0; wet[key] = 0
    if (!(f.health > 0) || !ctx.grounded(f)) { for (const t of Object.keys(field.ticks)) if (t.startsWith(side + ':')) field.ticks[t] = 0; continue }
    const here = patchesAt(field, ctx.cx(f), ctx.feet(f))
    const types = new Set(here.map(p => p.type))
    for (const type of Object.keys(ELEMENT_PROFILES)) {   // every registered element once (registration order = deterministic)
      const tk = side + ':' + type
      if (!types.has(type)) { field.ticks[tk] = 0; continue }
      const E = P0(type).effect, own = side === ctx.owner
      if (E.slick && !(own || ctx.walker(f))) slick[key] = (ctx.cx(f) >= ctx.ownerX ? 1 : -1)
      if (E.conduct) wet[key] = E.conduct
      if (E.dot && !own) {
        field.ticks[tk] = (field.ticks[tk] || 0) + 1
        if (field.ticks[tk] >= E.dot.every) { field.ticks[tk] = 0; ctx.damage(f, E.dot.dmg, { damageType: E.dot.damageType, source: 'patch_' + type }); out.push({ fighter: f, type, dmg: E.dot.dmg }) }
      }
    }
  }
  return out
}
// shared readers for the physics / combat hooks (a fighter can be in several owners' fields — any one counts)
export function elSlickDir(f) { const m = f?._elSlick; if (!m) return 0; for (const k in m) if (m[k]) return m[k]; return 0 }
export function elWet(f) { const m = f?._elWet; if (!m) return 0; let v = 0; for (const k in m) if (m[k] > v) v = m[k]; return v }
export function clearElementFlags(f, owner) { if (!f) return; const k = String(owner); if (f._elSlick) delete f._elSlick[k]; if (f._elWet) delete f._elWet[k] }

// ── PHYSICS HOOKS (physics.js). Every one is the identity unless the fighter stands on someone's slick patch. ──
export const SLICK = { accel: 0.12, fric: 0.95, backdash: 1.2 }
export const elWalkVx = (f, target) => elSlickDir(f) ? (f.vx || 0) + (target - (f.vx || 0)) * SLICK.accel : target
export const elFriction = (f, fric) => (elSlickDir(f) && f.onGround) ? SLICK.fric : fric
export const elDashMul = f => { const d = elSlickDir(f); return d && (f.facing || 1) === d ? SLICK.backdash : 1 }
