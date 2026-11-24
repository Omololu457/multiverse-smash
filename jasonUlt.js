// jasonUlt.js — Jason Voorhees (jason) ULTIMATE "BLACKOUT AT CRYSTAL LAKE" — a FROZEN CINEMATIC (2026-11-24 roster ultimate
// pass). Jason had NO named ultimate (characters.js: "ULTIMATE: none … OPEN GAP"); the Ultimate button fell through to the
// generic executeFallbackUltimate, which asks for 100 meter on an 80-point Bloodlust bar and so never fired. This module
// gives him his own, registered through cineRegistry.js:
//   registerUltCast('jason')   → cast(): gate (not attacking / no attack cooldown) + cost = his FULL Bloodlust bar (80).
//   registerFreezeCine('jason_blackout') → game.js freezes combat / physics / input and calls update(ctx).
// The horror slasher's signature: the lights go out, and every time they flicker back on he is CLOSER — until he is
// standing right behind you. PG-13: tension, silhouettes, impact — no gore.
// BEATS (script frames k, 60 fps):
//   NIGHTFALL   0-24    the stage drains to cold moonlight, fog rolls in on the floor; "ki-ki-ki… ma-ma-ma…"
//   FLICKER    24-78    the lights strobe: four flashes, each one finds him nearer; the foe looks around (faces flip)
//   BLACKOUT   78-96    total dark: a heartbeat, one glint of the machete
//   REVEAL     96       lights snap on — he is RIGHT BEHIND them; a hard push-in on the mask, the string STAB, the title
//   THE CHOP  116-190   three machete swings (overhead chop, rising cut, heavy finisher), each with hit-stop, a red-black
//                       inverted impact frame and a white slash streak across the screen
//   THE SLAM  190-214   he grabs them by the collar, lifts them one-handed, and drives them into the ground
//   AFTER     214-276   he stands over them in the fog; "HE ALWAYS COMES BACK." — the lights return
// DAMAGE: 70 + 70 + 80 + 110 = 330 raw through applyScaledDamage (the roster ultimate band ≈198 dealt); a held guard is
// beaten from behind only partly: every hit chips 25 % and there is no slam (they stay on their feet).
// SIM: pure function of the script frame + the layout taken at cast (no Math.random / clock). Render: jasonUltFx.js.
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { clearInputBuffer } from './input.js'
import { drawJasonUltScreen, preloadJasonUlt, JASON_T as T, JASON_HITS as HITS } from './jasonUltFx.js'
import { playJasonUltSound } from './jasonUltSound.js'

export const B = { cost: 80, blockMult: 0.25, behind: 66, lift: 54, stop: [7, 7, 10, 18] }
const VOICE = { reveal: 'jason_sample_04_0061.mp3', chop: 'jason_sample_01_0000.mp3', slam: 'jason_sample_12_0281.mp3' }

const c = { active: false }
export const isJasonUltActive = () => !!c.active
export const jasonUltScene = () => (c.active ? c : null)
export const getJasonUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, hits: c.hits | 0, dmg: Math.round(c.dmg || 0), blocked: !!c.blocked, ko: !!c.ko })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'jason') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return false
  const cost = Math.min(B.cost, f.maxEnergy || B.cost)
  if (!f.infiniteEnergy) { if ((f.energy || 0) < cost) return false; f.energy = Math.max(0, (f.energy || 0) - cost) }
  const stage = context?.worldWidth || 3200
  const dir = ctrX(t) >= ctrX(f) ? 1 : -1                     // which way the foe is from where he STARTS
  const tx0 = clamp(ctrX(t), 160, stage - 160)
  // he reappears BEHIND the foe (the far side from where he stood) unless a wall is there — then in front
  let side = dir, bx = tx0 + side * B.behind
  if (bx < 90 || bx > stage - 90) { side = -dir; bx = tx0 + side * B.behind }
  const jdir = -side                                            // he faces the foe
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, stage, dir, side, jdir, floor: feet(f), tFloor: feet(t),
    blocked: !!t.isBlocking, fx0: ctrX(f), tx0, bx, hits: 0, dmg: 0, ko: false, done: {}, cam: null, camSaved: null,
    hitReal: null, hitIdx: -1, slamReal: null, push: 0, tFace0: t.facing || -dir, fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha })
  f.vx = 0; f.vy = 0; f.isBlocking = false; f.isCharging = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
  t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null; t.isDashing = false; t.dashTimer = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999)
  f._fxAlpha = 0; t._fxAlpha = 0
  try { preloadJasonUlt(f, t) } catch (_) {}
  return true
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }
const synth = (ctx, id) => { try { playJasonUltSound(ctx?.sound, id) } catch (_) {} }

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.06; cam.maxPanStep = 90 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.frame
  beats(ctx, k)
  place()
  camera(cam, k)
  if (++c.frame > T.total) finish()
}

function beats(ctx, k) {
  const cam = ctx.camera
  if (k === 0) { sfx(ctx, 'pitch_drop_slowmo', 0.7); synth(ctx, 'drone') }
  if (k === 8) synth(ctx, 'whisper')
  for (const fk of T.flashes) if (k === fk) { synth(ctx, 'buzz'); if (fk === T.flashes[T.flashes.length - 1]) synth(ctx, 'whisper') }
  if (k === T.black) { synth(ctx, 'heart'); sfx(ctx, 'energy_hum_low', 0.5) }
  if (k === T.black + 12) synth(ctx, 'heart')
  if (k === T.reveal) { synth(ctx, 'stab'); sfx(ctx, 'impact_crack_01', 0.8); sfx(ctx, 'sting_pitch_rise_hold', 0.7); voice(ctx, VOICE.reveal); cam?.shake?.(8, 10) }
  HITS.forEach((h, i) => {
    if (k === h.at - 10) sfx(ctx, i === 1 ? 'swish_fast_02' : 'whoosh_medium_02', 0.8)
    if (k === h.at && !c.done['h' + i]) { c.done['h' + i] = true; hit(ctx, h, i) }
  })
  if (k === T.grab) { sfx(ctx, 'impact_hit_01', 0.6); voice(ctx, VOICE.slam) }
  if (k === T.slam - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
  if (k === T.slam && !c.done.slam) {
    c.done.slam = true
    if (!c.blocked) { c.slamReal = c.real; strike(110, 'jasonBlackoutSlam'); c.hold = B.stop[3]; cam?.shake?.(20, 30); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'impact_frame_boom_long', 0.8) }
    else { strike(110, 'jasonBlackoutSlam'); cam?.shake?.(8, 10); sfx(ctx, 'boom_medium_01', 0.8) }
  }
  if (k === T.slam + 10) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === T.after + 20) synth(ctx, 'whisper')
}

function hit(ctx, h, i) {
  strike(h.raw, 'jasonBlackoutChop')
  c.hits++; c.hitReal = c.real; c.hitIdx = i
  c.hold = B.stop[i]
  ctx.camera?.shake?.(10 + i * 4, 12)
  sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, i === 2 ? 'boom_medium_02' : 'impact_hit_01', 0.9)
  if (i === 0) voice(ctx, VOICE.chop)
}

function strike(raw, move) {
  const t = c.target
  if (!t || !(t.health > 0)) return
  const before = t.health
  const r = c.blocked ? Math.round(raw * B.blockMult) : raw
  try { applyScaledDamage(t, r, { source: 'jason-ultimate', move }) } catch (_) {}
  c.dmg += Math.max(0, before - t.health)
  t.colorFlash = 12
  const f = c.caster; if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) c.ko = true
}

// where each fighter is (world centre x, feet y) at script frame k — pure
export function jasonAt(k) {
  const F = T.flashes
  if (k < F[0]) return { x: c.fx0, step: 0 }
  for (let i = F.length - 1; i >= 0; i--) if (k >= F[i]) {
    const u = (i + 1) / (F.length + 1)
    return { x: i === F.length - 1 && k >= T.black ? c.bx : c.fx0 + (c.bx - c.fx0) * u, step: i + 1 }
  }
  return { x: c.fx0, step: 0 }
}
export function foeAt(k) {
  // pushed a little by every chop (away from Jason), lifted in the grab, slammed at his feet
  let push = 0
  HITS.forEach(h => { if (k >= h.at) push += smooth((k - h.at) / 8) * h.push })
  if (c.blocked || k < T.grab) return { x: c.tx0 + c.jdir * push, y: c.tFloor, air: false }
  const gx = c.bx + c.jdir * 50
  if (k < T.slam) { const u = smooth((k - T.grab) / 10); return { x: c.tx0 + c.jdir * push + (gx - c.tx0 - c.jdir * push) * u, y: c.tFloor - B.lift * u, air: u > 0.05 } }
  return { x: gx + c.jdir * 18, y: c.tFloor, air: false }
}

function place() {
  const k = c.frame, f = c.caster, t = c.target
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  const j = jasonAt(k)
  f.x = Math.round(j.x - (f.w || 48) / 2); f.y = c.floor - (f.h || 94)
  f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = k >= T.flashes[0] ? c.jdir : c.dir; f._fxAlpha = 0
  const p = foeAt(k)
  t.x = Math.round(p.x - (t.w || 48) / 2); t.y = Math.round(Math.min(p.y, c.tFloor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = c.blocked && k < T.after; t.hitstun = Math.max(t.hitstun || 0, 9999)
  t.onGround = !p.air; t.grounded = !p.air; t._fxAlpha = 0
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (k < T.reveal) cam.focusBetween?.(box(c.fx0, c.floor - 47), box(c.bx, c.floor - 47), 1.0)
  else if (k < T.reveal + 16) cam.focusBetween?.(f, t, 1.6)
  else if (k < T.after) cam.focusBetween?.(f, t, 1.35)
  else cam.focusBetween?.(f, t, 1.5)
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
    const p = foeAt(T.total)
    t.x = Math.round(clamp(p.x, 60, c.stage - 60) - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.vx = 0; t.vy = 0; t.onGround = true; t.grounded = true
    t.hitstun = 0; t.isBlocking = false
    if (c.blocked) t.blockstun = Math.max(t.blockstun || 0, 22)
    else if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 44); t.hitstun = 20 }
  }
  if (f) { try { clearInputBuffer(f) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); f.vx = 0; f.vy = 0
    f.x = Math.round(c.bx - (f.w || 48) / 2); f.facing = c.jdir; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.isBlocking = false; if (t.y + (t.h || 94) < c.tFloor) t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true }
  restoreAlpha(); restoreCam(); reset()
}
export const clearJasonUlt = clear

registerUltCast('jason', cast)
registerFreezeCine('jason_blackout', { active: isJasonUltActive, update, clear })
registerCineScreen('jason_blackout', (ctx, canvas) => drawJasonUltScreen(ctx, canvas, jasonUltScene()))
