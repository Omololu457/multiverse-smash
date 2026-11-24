// Violet Parr (violet) — FULL FORCE as a FROZEN CINEMATIC (2026-11-23, owner: "make them more cinematic … make sure you can
// actually feel the power between those attacks"). Rides the shared cineRegistry.js slot: while active game.js freezes
// combat / physics / input and calls update(ctx) each frame (ctx = { camera, sound, hitEffects, damageNumbers }).
// Starts from violetState.tickMove when the vUlt cast connects (startup 12, foe in ULT.range, hittable) — the hook is
// injected by violet.js (registerVioletEngine({ ultStart })) so violetState never imports this module (no cycle).
// SIM: every position is a pure function of the SCRIPT frame (c.frame) + the layout taken at confirm; hit-stop holds the
// script frame for CINE.stop real frames on each contact. No Math.random / clock. Damage goes through W.damage
// (combat.applyScaledDamage) with scale 1 — the same unscaled 220 the old FULL FORCE dealt. Render: violetFx.js reads
// violetCineScene() (world: spheres, rings, trails, shimmer; screen: letterbox, cut-in, flashes) — never writes here.
import { registerFreezeCine } from './cineRegistry.js'
import { vState, cue } from './violetState.js'
import { playVioletCues } from './violetSound.js'
import { CINE } from './violetData.js'

const c = { active: false }
export const isVioletCineActive = () => !!c.active
export const violetCineScene = () => (c.active ? c : null)
export const getVioletCineStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0, hits: c.hits | 0, dmg: Math.round(c.dmg || 0), ko: !!c.ko, caster: c.caster?.side || null })

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const E = {
  in: u => u * u * u,                                  // slams: accelerate INTO the contact
  out: u => 1 - (1 - u) * (1 - u),                     // rebounds: burst out, settle
  smooth: u => u * u * (3 - 2 * u),
  hold: () => 0,
}
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - (at | 0), activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true }
}

// ── START (violetState.tickMove, on the vUlt confirm frame) ──────────────────────────────────────────────────────────
export function startVioletCine(f, t, W) {
  if (c.active || !f || !t || !W?.damage) return false
  const stage = W?.stageWidth?.() || 3200, R = CINE.R, d = ctrX(t) >= ctrX(f) ? 1 : -1
  const floor = Math.max(feet(f), feet(t))
  const X = v => clamp(v, R + 14, stage - R - 14), tx = X(ctrX(t)), G = floor - R
  // sphere waypoints [script frame, x, y, ease INTO this point]
  const s2 = X(tx + d * 380), s3 = X(tx + d * 130), hov = { x: s3, y: G - 110 }
  const path = [[0, tx, G, 'hold'], [CINE.trapAt, tx, G, 'hold'], [54, tx, G - 150, 'smooth'], [58, tx - d * 12, G - 166, 'out'],
    [CINE.slams[0], X(tx + d * 70), G, 'in'], [80, X(tx + d * 150), G - 150, 'out'],
    [CINE.slams[1], s2, G - 70, 'in'], [101, X(tx + d * 210), G - 232, 'out'],
    [CINE.slams[2], s3, G, 'in'], [CINE.reappear, hov.x, hov.y, 'out'], [CINE.blastAt, hov.x, hov.y, 'hold']]
  const land = X(hov.x + d * 330)
  const vx = clamp(hov.x - d * 236, 30, stage - 30)
  Object.assign(c, { active: true, frame: 0, real: 0, hold: 0, caster: f, target: t, W, stage, dir: d, floor, G, path, hov, land,
    cx0: ctrX(f), vx, vdir: Math.sign(hov.x - vx) || d, hits: 0, dmg: 0, ko: false, done: {}, impacts: [], cam: null, camSaved: null,
    tAlpha0: t._fxAlpha, tGround0: !!(t.onGround || t.grounded) })
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false
  t.hitstun = Math.max(t.hitstun || 0, 9999); t.isBlocking = false; t.vx = 0; t.vy = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0
  const s = vState(f); s.ult = { st: 'cine', t: 0 }; s.stats.ultHits++; s.cineA = 1
  pose(f, 'vUlt', 0)
  cue(f, 'ultCine', W); playVioletCues(f)
  return true
}

// sphere centre at script frame k — pure
export function sphereAt(k) {
  const P = c.path; if (!P) return { x: 0, y: 0 }
  if (k <= P[0][0]) return { x: P[0][1], y: P[0][2] }
  for (let i = 1; i < P.length; i++) {
    const [k1, x1, y1, e] = P[i], [k0, x0, y0] = P[i - 1]
    if (k <= k1) { const u = (E[e] || E.smooth)(clamp((k - k0) / Math.max(1, k1 - k0), 0, 1)); return e === 'hold' ? { x: x0, y: y0 } : { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u } }
  }
  const L = P[P.length - 1]; return { x: L[1], y: L[2] }
}
// sphere radius at script frame k (forms → holds → crushed small before the detonation) — pure
export function sphereR(k) {
  const R = CINE.R
  if (k < CINE.trapAt - 8) return 0
  if (k < CINE.trapAt) return R * 2.4 * (1 - (k - (CINE.trapAt - 8)) / 8) + R * ((k - (CINE.trapAt - 8)) / 8)   // converges from 2.4R
  if (k >= CINE.squeezeAt && k < CINE.squeezeAt + 6) return R * 0.86
  if (k < 132) return R
  if (k < CINE.crushAt) return R - (R * 0.2) * ((k - 132) / (CINE.crushAt - 132))
  if (k < CINE.blastAt) return R * 0.7
  return 0
}
// the foe's launch after the detonation (centre x, y) — pure
export function launchAt(k) {
  const u = clamp((k - CINE.blastAt) / (CINE.landAt - CINE.blastAt), 0, 1), h = c.hov, t = c.target
  const groundC = c.floor - (t?.h || 94) / 2
  return { x: h.x + (c.land - h.x) * u, y: h.y + (groundC - h.y) * u - Math.sin(Math.PI * u) * 150, u }
}

function strike(raw, what) {
  const t = c.target, f = c.caster
  if (c.ko || !(t.health > 0)) return
  const before = t.health
  try { c.W?.damage?.(t, raw, { scale: 1, source: 'ultimate', attacker: f, move: 'vUlt' }) } catch (_) {}
  c.hits++; c.dmg += Math.max(0, before - t.health)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 8
  const s = f._violet; if (s) { s.stats.ultContacts = (s.stats.ultContacts || 0) + 1 }   // (no s.lastHit: her tick is frozen, so the R13 hit strip would hang — violetUltFx draws every contact)
  if (!(t.health > 0)) c.ko = true
}
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
// impact record for the render (script frame, real frame, where, how hard, which way the shock ring lies)
function impact(kind, x, y, power, axis = 'floor') { c.impacts.push({ kind, x: Math.round(x), y: Math.round(y), power, axis, k: c.frame, r: c.real }); if (c.impacts.length > 12) c.impacts.shift() }

// ── UPDATE (one frame; game.js freezes everything else) ─────────────────────────────────────────────────────────────
function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.85; cam.maxZoomStep = 0.06; cam.maxPanStep = 70 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }          // HIT-STOP: the script frame (and everything in it) holds
  const k = c.frame
  beats(ctx, k)
  if (c.ko && k > CINE.trapAt && k < CINE.suck) { c.frame = CINE.suck; place(); return }   // a KO mid-sequence → straight to the detonation
  place()
  camera(cam, k)
  if (++c.frame > CINE.total) finish()
}

function beats(ctx, k) {
  const f = c.caster, t = c.target, cam = ctx.camera, R = CINE.R, s = f._violet, d = c.dir
  const cueV = n => { cue(f, n, c.W); playVioletCues(f) }
  const sp = sphereAt(k)
  if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.95); cueV('vanishIn') }
  if (k === 6) sfx(ctx, 'warp_wobble_01', 0.6)
  if (k === 14) sfx(ctx, 'energy_hum_low', 0.7)
  if (k === CINE.trapAt - 8) sfx(ctx, 'swish_fast_01', 0.6)
  if (k === CINE.trapAt) { strike(CINE.raw.trap, 'trap'); c.hold = CINE.stop.trap; cam?.shake?.(7, 8); impact('trap', sp.x, sp.y, 0.6, 'ring')
    sfx(ctx, 'impact_crack_01', 0.85); sfx(ctx, 'energy_tone_hold', 0.45); cueV('ultCineTrap') }
  if (k === 34) sfx(ctx, 'charge_hum_rise', 0.75)
  if (k === CINE.squeezeAt) { strike(CINE.raw.squeeze, 'squeeze'); c.hold = CINE.stop.squeeze; cam?.shake?.(6, 8); impact('squeeze', sp.x, sp.y, 0.5, 'ring')
    sfx(ctx, 'crack_sizzle_bright', 0.75); cueV('ultSqueeze') }
  // SLAMS — wind-up whoosh, then a contact scaled 1 / 2 / 3
  const W1 = [58, 80, 101]
  CINE.slams.forEach((at, i) => {
    if (k === W1[i]) sfx(ctx, i === 2 ? 'swish_fast_03' : i ? 'whoosh_medium_02' : 'whoosh_medium_01', 0.75)
    if (k === at) {
      strike(CINE.raw.slam, 'slam'); c.hold = CINE.stop.slam[i]
      const p = 0.7 + i * 0.25
      cam?.shake?.([12, 15, 22][i], [12, 14, 20][i])
      impact('slam', i === 1 ? sp.x + d * R : sp.x, i === 1 ? sp.y : sp.y + R, p, i === 1 ? 'wall' : 'floor')
      sfx(ctx, 'hit_heavy_boom_01', 0.8 + i * 0.1); sfx(ctx, i === 2 ? 'boom_huge_01' : i ? 'boom_medium_02' : 'boom_medium_01', 0.7 + i * 0.12)
      if (i === 2) sfx(ctx, 'rumble_tail_01', 0.8)
      cueV('ultSlam')
    }
  })
  if (k === CINE.reappear) { sfx(ctx, 'warp_wobble_02', 0.7); cueV('vanishOut') }
  if (k === 134) sfx(ctx, 'charge_swell_riser', 0.95)
  if (k === CINE.crushAt) { strike(CINE.raw.crush, 'crush'); c.hold = CINE.stop.crush; cam?.shake?.(9, 10); impact('crush', sp.x, sp.y, 0.7, 'ring')
    sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.7); cueV('ultSqueeze') }
  if (k === 154) sfx(ctx, 'pitch_drop_slowmo', 0.7)
  if (k === CINE.suck) { sfx(ctx, 'boom_anticipation_suck', 1); cueV('ultCharge') }
  if (k === CINE.blastAt) {
    if (!c.done.blast) { c.done.blast = true; if (!c.ko) strike(CINE.raw.blast, 'blast') }
    c.hold = CINE.stop.blast; cam?.shake?.(34, 34); impact('blast', c.hov.x, c.hov.y, 1.4, 'ring')
    sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.95); sfx(ctx, 'hit_flurry_01', 0.6); cueV('ultBlast')
  }
  if (k === CINE.blastAt + 10) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === CINE.landAt) { const L = launchAt(k); cam?.shake?.(10, 12); impact('land', L.x, c.floor, 0.6, 'floor'); sfx(ctx, 'boom_medium_01', 0.75); sfx(ctx, 'impact_hit_01', 0.7) }
  if (s?.ult) s.ult.t = k
}

// fighters' positions / poses for script frame c.frame (also during hit-stop, so they stay pinned)
function place() {
  const k = c.frame, f = c.caster, t = c.target, s = f._violet, R = CINE.R
  c.pf = k   // the script frame the fighters are placed for (the render reads this, so sprite + sphere never drift a frame apart)
  // the engine's attack / dash afterimage buffers are not ticked during a freeze — drop them so no frozen opaque ghost of
  // the (invisible) caster or the trapped foe hangs on screen (render-only fields, never snapshotted)
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  // the foe: inside the sphere until the detonation, then launched in an arc, then down
  let tx, ty, air
  if (k < CINE.blastAt) { const p = sphereAt(k); tx = p.x; ty = p.y + (k < CINE.trapAt ? R - (t.h || 94) / 2 : 0); air = k >= CINE.trapAt + 2 }
  else { const L = launchAt(k); tx = L.x; ty = L.y; air = L.u < 1 }
  t.x = Math.round(tx - (t.w || 48) / 2); t.y = Math.round(Math.min(ty + (t.h || 94) / 2, c.floor) - (t.h || 94))
  t.vx = 0; t.vy = 0; t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999); t.onGround = !air; t.grounded = !air
  if (k >= CINE.landAt && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 30) }
  t.facing = -Math.sign(tx - ctrX(f)) || t.facing
  // Violet: vanishes on the spot; repositions while unseen; reappears beside the sphere, palms out; holds the release
  const vx = k < CINE.reappear - 4 ? c.cx0 : c.vx
  f.x = Math.round(vx - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true
  const aim = k < CINE.blastAt ? sphereAt(k).x : launchAt(k).x
  f.facing = Math.sign(aim - vx) || c.dir
  // invisibility: 1 → 0 over the vanish, a faint shimmer while she works unseen, flickers back in at the reappear
  let a
  if (k < CINE.vanishEnd) a = 1 - k / CINE.vanishEnd
  else if (k < CINE.reappear) a = 0.06
  else if (k < CINE.reappear + 16) { const u = (k - CINE.reappear) / 16; a = Math.min(1, u * u + ((c.real % 4) < 2 ? 0.15 : 0)) }
  else a = 1
  if (s) s.cineA = Math.round(a * 1000) / 1000
  // poses (vUlt timeline: 0 R19 stance · 12 R6f4 · 30 R6f5 · 50 R6f6 · 70 R6f7 · 100 R6f8 palms out)
  let at = 0
  if (k < 14) at = 0
  else if (k < CINE.trapAt + 6) at = 70
  else if (k < CINE.reappear) at = ((k >> 3) & 1) ? 50 : 70
  else if (k < 140) at = 12
  else if (k < CINE.suck) at = 30
  else if (k < CINE.blastAt) at = 50
  else if (k < CINE.blastAt + 30) at = 100
  else at = 70
  pose(f, 'vUlt', at)
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target, R = CINE.R
  const box = p => ({ x: p.x - 24, y: p.y - 47, w: 48, h: 94 })
  const sp = sphereAt(k), last = c.impacts[c.impacts.length - 1], since = last ? c.frame - last.k : 99
  const punch = since < 6 ? 0.3 * (1 - since / 6) * (last.power || 1) : 0
  if (k < CINE.vanishEnd) cam.focusOnFighter(f, 1.65)                                    // push in on her as she fades
  else if (k < 58) cam.focusOnFighter(box(sp), 1.45 + punch)                             // the trap + lift
  else if (k < CINE.reappear) {                                                          // the slams: wide on the wind-up, punch on contact
    const nextSlam = CINE.slams.find(s => s >= k), toSlam = nextSlam != null ? nextSlam - k : 99
    cam.focusOnFighter(box({ x: sp.x, y: Math.min(sp.y, c.G - 40) }), (toSlam < 6 ? 1.0 : 1.15) + punch * 1.6)
  } else if (k < CINE.suck) cam.focusBetween?.(f, box(sp), 1.2 + punch)                  // she reappears beside it
  else if (k < CINE.blastAt) cam.focusOnFighter(box(sp), 1.85)                           // anticipation: tight on the crushed sphere
  else if (k < CINE.blastAt + 26) cam.focusOnFighter(box(c.hov), 0.62)                    // PULL OUT for the detonation
  else if (k < CINE.landAt + 4) cam.focusBetween?.(f, t, 0.9)
  else cam.focusOnFighter(t, 1.3)                                                        // the landing
  void R
}

function restoreCam() { const cam = c.cam, sv = c.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
function finish() {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.floor - (t.h || 94); t.onGround = true; t.grounded = true
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 40) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 16; f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true
    const s = f._violet; if (s) { s.ult = null; delete s.cineA; s.stats.ultDone = (s.stats.ultDone || 0) + 1 } }
  restoreCam(); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
// Every reset path (round reset, rematch, KO teardown, menu): restore both fighters and the camera, drop the scene.
export function clear() {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.y = c.floor - (t.h || 94); t.onGround = true; t.grounded = true }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94)
    const s = f._violet; if (s) { s.ult = null; delete s.cineA } }
  restoreCam(); reset()
}
export const clearVioletCine = clear

registerFreezeCine('violet', { active: isVioletCineActive, update, clear })
