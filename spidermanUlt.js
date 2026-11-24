// spidermanUlt.js — Spider-Man (spiderman) ULTIMATE "MAXIMUM WEB" as a FROZEN CINEMATIC (2026-11-24, owner: "give every
// character their own special ultimate"). Replaces the legacy inline web-net overlay (abilities.executeSpidermanUltimate —
// left untouched, simply no longer reached) through cineRegistry.js:
//   registerUltCast('spiderman') → cast(): same gates (not attacking / no attack cooldown), same cost (100), same sure-hit,
//                                  range-independent web trap. Same total raw damage as the legacy payoff (340 raw), now
//                                  split over the beats; a held guard at the press chips 25 % (legacy rule).
//   registerFreezeCine('spiderman_maxweb') → game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps; short hit-stops hold k on the contacts):
//   SPIDER-SENSE  0-34    letterbox, push in: the tingle lines flare, the world slows + greys. "You get a web, and you get a web…"
//   THWIP         34-56   web-shooter: a line zips across, a net SPLATS over the foe and pins them (40)
//   MAXIMUM WEB   56-96   title; he fans out net after net (3 × 30) — the foe is buried in webbing
//   WEB-ZIP       96-176  five zip-strikes from every angle (5 × 30), after-images, comic call-outs
//   THE YANK      176-214 both web lines → he hauls the cocoon up overhead and SLAMS it into the floor (60): impact frames
//   GAME OVER     214-292 the foe stuck in a web cocoon, Spidey's pose; "Game over."
// SIM: positions are pure functions of the script frame + the layout taken at cast (no Math.random / clock).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawSpidermanUltScreen, preloadSpidermanUlt, SPM_T, SPM_ZIPS } from './spidermanUltFx.js'

export const B = { cost: 100, blockMult: 0.25, ...SPM_T,
  hits: [{ at: SPM_T.netAt, raw: 40, kind: 'net' }, { at: 66, raw: 30, kind: 'net' }, { at: 78, raw: 30, kind: 'net' }, { at: 90, raw: 30, kind: 'net' },
    ...SPM_ZIPS.map(z => ({ at: z.at, raw: 30, kind: 'zip', stop: 5 })), { at: SPM_T.slamAt, raw: 60, kind: 'slam', stop: 26 }],
  total: 292, liftH: 230 }
const VOICE = { open: 'spiderman_mr_081.mp3', end: 'spiderman_mr_043.mp3' }

const c = { active: false }
export const isSpidermanUltActive = () => !!c.active
export const spidermanUltScene = () => (c.active ? c : null)
export const getSpidermanUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, dmg: Math.round(c.dmg || 0), hits: c.hits | 0, blocked: !!c.blocked, ko: !!c.ko, caster: c.caster?.side || null })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'spiderman') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated || !(t.health > 0)) return undefined
  if (!f.infiniteEnergy) { if ((f.energy || 0) < B.cost) return false; f.energy = Math.max(0, (f.energy || 0) - B.cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1
  // he plants a comfortable web-shot away; the foe is pinned where they stand (grounded)
  const tFloor = Math.max(feet(t), feet(f))
  const tx0 = clamp(ctrX(t), 160, stage - 160)
  const fx0 = clamp(ctrX(f), 60, stage - 60)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, floor: feet(f), tFloor, blocked: !!t.isBlocking,
    fx0, tx0, ty0: feet(t), dmg: 0, hits: 0, ko: false, done: {}, cam: null, camSaved: null, lastHitReal: -99, lastHit: null,
    fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha })
  f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0; f._maxWebTimer = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0
  try { preloadSpidermanUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  if (c.ko && c.frame < B.slamAt && c.frame > B.netAt) c.frame = B.slamAt   // KO: straight to the slam (no further damage — health is 0)
  const k = c.frame
  beats(ctx, k)
  place()
  camera(cam, k)
  if (++c.frame > B.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { voice(ctx, VOICE.open); sfx(ctx, 'sting_pitch_rise_hold', 0.7); sfx(ctx, 'pitch_drop_slowmo', 0.6) }
  if (k === 10) sfx(ctx, 'crack_sizzle_bright', 0.6)
  if (k === 36) { sfx(ctx, 'swish_fast_01', 0.9); sfx(ctx, 'whoosh_medium_01', 0.6) }
  if (k === B.titleAt) { sfx(ctx, 'boom_medium_02', 0.8); cam?.shake?.(6, 8) }
  if (k === 62 || k === 74 || k === 86) sfx(ctx, 'swish_fast_02', 0.8)
  if (k === 96) sfx(ctx, 'charge_hum_rise', 0.6)
  for (const z of SPM_ZIPS) if (k === z.at - 8) sfx(ctx, z.i % 2 ? 'whoosh_medium_02' : 'swish_fast_03', 0.8)
  if (k === B.yankAt) { sfx(ctx, 'swish_fast_01', 0.9); sfx(ctx, 'charge_swell_riser', 0.8) }
  if (k === B.slamAt - 10) sfx(ctx, 'boom_anticipation_suck', 1)
  if (k === B.endAt + 6) voice(ctx, VOICE.end)
  for (const h of B.hits) if (k === h.at && !c.done[h.at]) {
    c.done[h.at] = true
    hit(h)
    if (h.kind === 'net') { sfx(ctx, 'impact_crack_01', 0.6); sfx(ctx, 'hit_flurry_01', 0.5); cam?.shake?.(4, 6) }
    if (h.kind === 'zip') { sfx(ctx, 'impact_hit_01', 0.95); sfx(ctx, 'hit_heavy_boom_01', 0.55); cam?.shake?.(9, 8); c.hold = h.stop }
    if (h.kind === 'slam') { c.slamReal = c.real; c.hold = h.stop; sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1); cam?.shake?.(20, 36) }
  }
  if (k === B.slamAt + 3) sfx(ctx, 'rumble_tail_01', 0.9)
}

function hit(h) {
  const t = c.target, f = c.caster
  if (!t || !(t.health > 0)) return
  const before = t.health
  const raw = c.blocked ? Math.round(h.raw * B.blockMult) : h.raw
  try { applyScaledDamage(t, raw, { source: 'ability' }) } catch (_) {}   // the legacy options (no attacker → the same scale as the legacy payoff)
  c.dmg += Math.max(0, before - t.health); c.hits++; c.lastHitReal = c.real; c.lastHit = h
  t.colorFlash = 10
  if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// the foe: pinned, then hauled up overhead and slammed — centre x / feet y, pure
export function foeAt(k) {
  if (k < B.yankAt) return { x: c.tx0, y: c.tFloor, air: false }
  if (k < B.slamAt) {   // hauled up and over toward him (an arc), then whipped down
    const u = (k - B.yankAt) / (B.slamAt - B.yankAt)
    if (u < 0.7) { const v = smooth(u / 0.7); return { x: c.tx0 - c.dir * 40 * v, y: c.tFloor - B.liftH * v, air: true, spin: v } }
    const v = (u - 0.7) / 0.3; return { x: c.tx0 - c.dir * 40 + c.dir * 40 * v, y: c.tFloor - B.liftH * (1 - v * v), air: true, spin: 1 + v }
  }
  return { x: c.tx0, y: c.tFloor, air: false, down: true }
}
// Spider-Man centre x / feet y: home spot, the zips around the foe, back home for the yank
export function spideyAt(k) {
  const home = { x: c.fx0, y: c.floor }, n = SPM_ZIPS.length
  const P = i => ({ x: c.tx0 - c.dir * SPM_ZIPS[i].dx, y: c.tFloor - SPM_ZIPS[i].dy })
  const face = p => Math.sign(c.tx0 - p.x) || c.dir
  if (k < SPM_ZIPS[0].at - 8) return home
  for (let i = 0; i < n; i++) {
    const z = SPM_ZIPS[i], p = P(i), from = i ? P(i - 1) : home, start = z.at - 8, end = i + 1 < n ? SPM_ZIPS[i + 1].at - 8 : B.yankAt - 10
    if (k < z.at) { const u = smooth((k - start) / 8); return { x: from.x + (p.x - from.x) * u, y: from.y + (p.y - from.y) * u, zip: true, pose: z.pose, face: face(p) } }
    if (k < end) return { ...p, pose: z.pose, face: face(p), strike: k - z.at }
  }
  if (k < B.yankAt) { const lp = P(n - 1), u = smooth((k - (B.yankAt - 10)) / 10); return { x: lp.x + (home.x - lp.x) * u, y: lp.y + (home.y - lp.y) * u - 40 * Math.sin(Math.PI * u), zip: true, face: c.dir } }
  return home
}
function place() {
  const k = c.frame, f = c.caster, t = c.target
  c.pf = k
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  const s = spideyAt(k)
  f.x = Math.round(s.x - (f.w || 48) / 2); f.y = Math.round(Math.min(s.y, c.floor) - (f.h || 94))
  f.vx = 0; f.vy = 0; f.onGround = s.y >= c.floor; f.grounded = f.onGround; f.facing = s.face || c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}
function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  if (k < 34) cam.focusOnFighter(f, 1.75)
  else if (k < B.titleAt) cam.focusBetween?.(f, t, 1.2)
  else if (k < 96) cam.focusOnFighter(t, 1.45)
  else if (k < B.yankAt) cam.focusOnFighter(t, 1.3)
  else if (k < B.slamAt) cam.focusBetween?.(f, t, 1.0)
  else if (k < B.endAt) cam.focusOnFighter(t, 1.5)
  else cam.focusBetween?.(f, t, 1.2)
}

function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
function restoreAlpha() {
  const f = c.caster, t = c.target
  if (f) { if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0 }
  if (t) { if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0 }
}
function finish() {
  const f = c.caster, t = c.target
  if (t) {
    t.x = Math.round(c.tx0 - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
    t.hitstun = 0; t.isBlocking = false
    if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 24)
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40); t.hitstun = 18 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}
    f.x = Math.round(c.fx0 - (f.w || 48) / 2)
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
    f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; if (t.y + (t.h || 94) < c.tFloor) t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.x = Math.round(c.fx0 - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
export const clearSpidermanUlt = clear

registerUltCast('spiderman', cast)
registerFreezeCine('spiderman_maxweb', { active: isSpidermanUltActive, update, clear })
registerCineScreen('spiderman_maxweb', (ctx, canvas) => drawSpidermanUltScreen(ctx, canvas, spidermanUltScene()))
