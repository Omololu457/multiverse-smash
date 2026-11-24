// narutoUltKit.js — shared SIM engine for the Naruto-universe cinematic ultimates rebuilt in the 2026-11-24 roster-wide ult
// pass (sakuraUlt.js, hinataUlt.js, kakashiUlt.js, …). Each character module describes its own beats / layout / camera /
// render; this file owns the boring, easy-to-get-wrong parts every frozen cinematic shares (cineRegistry.js contract):
//   • cast gate + meter spend (same semantics as abilities.spendEnergy: infiniteEnergy never deducts)
//   • the frozen-cinematic state, hit-stop holds (script frame stays put while `real` keeps counting)
//   • camera limits saved / restored, both fighters' _fxAlpha hidden / restored, foe held in hitstun
//   • damage through combat.applyScaledDamage (sure-hit, range-independent, a held guard chips by blockMult) with a
//     record of every number dealt (the Fx draws them), KO detection
//   • clean finish (foe knocked down / blockstun, caster grounded, input buffer cleared) and clear() on every reset path.
// Deterministic: everything is a function of the script frame + the layout taken at cast. No Math.random / clock.
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
export const outE = u => { u = clamp(u, 0, 1); return 1 - (1 - u) ** 3 }
export const ctrX = o => (o.x || 0) + (o.w || 48) / 2
export const feet = o => (o.y || 0) + (o.h || 94)
export const lerp = (a, b, u) => a + (b - a) * u

// spec: { key, id, total, cost (number | f => number), gate?(f, t) → bool, refuseBusy?: bool, zoom?: number,
//         layout(c, f, t, context), beats(c, k, api), place(c, k), camera(c, cam, k), draw(ctx, canvas, scene), preload?(f, t),
//         finish?(c) }
export function defineNarutoUlt(spec) {
  const c = { active: false }
  const scene = () => (c.active ? c : null)
  const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
  const voice = (ctx, file) => { if (!file) return; try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }

  function cast(f, context) {
    if (!f || (f.rosterKey || '').toLowerCase() !== spec.key) return undefined
    if (c.active) return false
    if (spec.refuseBusy !== false && ((f.attackCooldown || 0) > 0 || f.attacking)) return false
    const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
    const t = getOpp(f)
    if (!t || t.eliminated) return undefined
    if (spec.gate && spec.gate(f, t) === false) return undefined
    const cost = typeof spec.cost === 'function' ? spec.cost(f) : (spec.cost ?? f.ultimate?.cost ?? 100)
    if (!f.infiniteEnergy) { if ((f.energy || 0) < cost) return false; f.energy = Math.max(0, (f.energy || 0) - cost) }
    const dir = ctrX(t) >= ctrX(f) ? 1 : -1
    Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, dir, floor: Math.max(feet(f), feet(t)), tFloor: Math.max(feet(f), feet(t)),
      stage: context?.worldWidth || 3200, blocked: !!t.isBlocking, dmg: 0, nums: [], ko: false, done: {}, cam: null, camSaved: null,
      fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha, fx0: ctrX(f), tx0: ctrX(t), hits: 0 })
    f.vx = 0; f.vy = 0; f.facing = dir; f.isBlocking = false; f.isCharging = false
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
    t.hitstun = Math.max(t.hitstun || 0, 9999)
    f._fxAlpha = 0; t._fxAlpha = 0
    try { spec.layout?.(c, f, t, context) } catch (_) {}
    try { spec.preload?.(f, t) } catch (_) {}
    return true
  }

  // one sure-hit application; returns the damage actually dealt. o: { blockMult (default 0.3), hold (hit-stop frames), at (world x,y for the number) }
  function hit(raw, o = {}) {
    const t = c.target
    if (!t || !(t.health > 0)) return 0
    const before = t.health
    const r = c.blocked ? Math.round(raw * (o.blockMult ?? 0.3)) : raw
    try { applyScaledDamage(t, r, { source: 'ability', move: spec.id }) } catch (_) {}
    const d = Math.max(0, before - t.health)
    c.dmg += d; c.hits++
    c.nums.push({ v: Math.round(d), real: c.real, big: !!o.big, x: o.x ?? ctrX(t), y: o.y ?? (feet(t) - 70) })
    t.colorFlash = 14
    const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
    if (o.hold) c.hold = Math.max(c.hold, o.hold)
    if (!(t.health > 0)) c.ko = true
    return d
  }

  function update(ctx = {}) {
    if (!c.active) return
    const f = c.caster, t = c.target
    if (!f || !t) return clear()
    const cam = ctx.camera
    if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = spec.zoom || 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
    c.real++
    if (c.hold > 0) { c.hold--; spec.place(c, c.frame); hide(); return }
    const k = c.frame
    const api = { ctx, cam, sfx: (id, g) => sfx(ctx, id, g), voice: file => voice(ctx, file), hit, shake: (s, n) => { try { cam?.shake?.(s, n) } catch (_) {} },
      once: (name, fn) => { if (!c.done[name]) { c.done[name] = true; fn() } } }
    spec.beats(c, k, api)
    spec.place(c, k); hide()
    if (cam?.focusOnFighter) { try { spec.camera(c, cam, k) } catch (_) {} }
    if (++c.frame > spec.total) finish()
  }
  function hide() {
    const f = c.caster, t = c.target
    for (const o of [f, t]) { if (!o) continue; o._fxAlpha = 0; o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null; o.vx = 0; o.vy = 0 }
    if (t) t.hitstun = Math.max(t.hitstun || 0, 9999)
  }
  function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
  function restoreAlpha() {
    const f = c.caster, t = c.target
    if (f) { if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0 }
    if (t) { if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0 }
  }
  function ground(o, floor) { if (!o) return; o.y = Math.min(o.y, floor - (o.h || 94)); if (o.y + (o.h || 94) < floor) o.y = floor - (o.h || 94); o.vx = 0; o.vy = 0; o.onGround = true; o.grounded = true }
  function finish() {
    const f = c.caster, t = c.target
    try { spec.finish?.(c) } catch (_) {}
    if (t) {
      ground(t, c.tFloor); t.hitstun = 0; t.isBlocking = false
      t.x = clamp(t.x, 20, c.stage - 20 - (t.w || 48))
      if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 24)
      else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 46); t.hitstun = 20 }
    }
    if (f) { try { clearInputBuffer(f) } catch (_) {}
      f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); ground(f, c.floor)
      f.x = clamp(f.x, 20, c.stage - 20 - (f.w || 48)) }
    restoreAlpha(); restoreCam(); reset()
  }
  const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
  function clear() {
    if (!c.active) return
    const f = c.caster, t = c.target
    if (t) { t.hitstun = 0; t.isBlocking = false; ground(t, c.tFloor) }
    if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; ground(f, c.floor) }
    restoreAlpha(); restoreCam(); reset()
  }

  registerUltCast(spec.key, cast)
  registerFreezeCine(spec.id, { active: () => !!c.active, update, clear })
  registerCineScreen(spec.id, (ctx, canvas) => { const s = scene(); return s ? spec.draw(ctx, canvas, s) : false })
  return {
    isActive: () => !!c.active, scene, clear,
    status: () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, dmg: Math.round(c.dmg || 0), hits: c.hits | 0, blocked: !!c.blocked, ko: !!c.ko, caster: c.caster?.side || null }),
  }
}
