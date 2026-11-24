// squadUlt.js — the Ranger squads' TEAM ULTIMATES (2026-11-23, owner: "if I press W U at the same time all the Power Rangers
// come in for a simultaneous attack … as cinematic as the Dino Thunder ultimate … but very, very different … maybe all of
// the S.P.D. Rangers pull out really long rifles and shoot together but at different times … same thing for the [MMPR]").
//   W + U together (Jump + Ultimate) on a full meter, any Ranger active:
//   S.P.D. RANGERS        "S.P.D. JUDGMENT VOLLEY"  — EMERGENCY alert → the B-Squad (and Omega) teleport into a staggered firing
//                         line → long rifles, laser sights LOCK → three RIPPLE volleys, every Ranger on their own beat → the
//                         whole squad fires at once → GUILTY stamp + a containment card shatters over the foe.
//   MIGHTY MORPHIN        "MORPHIN GRID: FIVE-POINT STAR" — five Power Coins spin in → the Rangers drop from the sky onto the
//                         points of a star around the foe (lifted, pinned) → a relay of five dashes CUTS the pentagram through
//                         them → the star charges → a Morphin Grid lightning bolt slams them down → five pillars → team pose
//                         with coloured explosions behind.
// The FROZEN-CINEMATIC contract (same as Pink's / Black's ultimates): while active game.js freezes combat, physics and input and
// calls updateSquadUlt(ctx) each frame; every position here is a pure function of the frame (no Math.random, no clock), damage
// goes through W.damage (applyScaledDamage), the render (squadUltFx.js) only reads squadUltScene(). Blocked at the start → 30 %.
import { SQUADS, setTeamUlt } from './squadCore.js'

export const TEAM_ULT_COST = 100
export const SPD_VOLLEY = { alert: 26, assemble: 26, every: 10, lock: 92, ripple: 120, charge: 196, fire: 222, verdict: 234, exit: 248, total: 296, shotRaw: 10, finalRaw: 220 }   // 18 × 10 + 220 = 400 raw (Dino's Z-Rex budget)
export const MMPR_STAR = { coins: 30, drop: 34, dropEvery: 9, relay: 86, leg: 17, charge: 176, bolt: 212, pillars: 224, pose: 244, total: 300, relayRaw: 40, boltRaw: 200 }   // 5 × 40 + 200 = 400 raw (Dino's Z-Rex budget)
export const SPD_SHOT = { spd_red: 'sBlaster', spd_blue: 'bShot', spd_green: 'gShot', spd_yellow: 'yLongShot', spd_pink: 'pShot', omega_ranger: 'omGun' }
export const MMPR_STRIKE = { red_ranger_mmpr: 'heavy', mmpr_black: 'bCrescent', mmpr_pink: 'pKick', green_ranger: 'gTalon', mmpr_white: 'wSaba' }
const SCRIPTS = { spd_rangers: SPD_VOLLEY, mmpr_rangers: MMPR_STAR }

const cine = { active: false }
export const isSquadUltActive = () => !!cine.active
export const squadUltScene = () => (cine.active ? cine : null)
export const getSquadUltStatus = () => ({ active: !!cine.active, id: cine.id || null, frame: cine.frame | 0, hits: cine.hits | 0, dmg: Math.round(cine.dmg || 0), caster: cine.caster?.side || null })

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - (at | 0), activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true }
}

// ── START ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function startSquadUlt(f, W, opp = null) {
  if (cine.active || !f?._squad || !(f.health > 0)) return false
  const sq = SQUADS[f._squad.id], S = SCRIPTS[f._squad.id]; if (!sq || !S) return false
  const t = opp || W?.opponent?.(f); if (!t || !(t.health > 0)) return false
  if (!f.infiniteEnergy && (f.energy || 0) < TEAM_ULT_COST) return false
  if ((f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.knockdownState || f.isGrabbed || t.isGrabbed) return false
  const a = f.attacking ? f.currentAttack : null
  if (a && (a.isUltimate || a.category === 'ultimate' || a.isSpecial || a.category === 'special' || a._ultPose)) return false
  try { if (W?.busy?.(f) || W?.cinematic?.()) return false } catch (_) {}
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - TEAM_ULT_COST)
  const stage = W?.stageWidth?.() || 3200, dir = ctrX(t) >= ctrX(f) ? 1 : -1
  const floorC = feet(f) > feet(t) ? feet(f) : feet(t)   // whoever is lower is on the floor (an airborne start lands)
  Object.assign(cine, { active: true, id: f._squad.id, S, frame: 0, caster: f, target: t, W, stage, dir, floor: floorC,
    cx0: ctrX(f), tx0: ctrX(t), form: f.rosterKey, forms: [...sq.forms], blocked: !!(t.isBlocking && (t.facing || 1) === -dir),
    scale: 1, hits: 0, dmg: 0, ko: false, done: {}, kb: 0, alpha0: f._fxAlpha })
  f._fxAlpha = 0   // render: the caster's own sprite hides; squadUltFx draws every Ranger (the caster included)
  try { cine.scale = W?.comboScale?.(f) ?? 1 } catch (_) {}
  f.facing = dir; f.vx = 0; f.vy = 0; f.invulnTimer = Math.max(f.invulnTimer || 0, 2)
  t.hitstun = Math.max(t.hitstun || 0, 9999); t.isBlocking = false; t.vx = 0; t.vy = 0; t.facing = -dir
  if (cine.id === 'spd_rangers') layoutSpd(); else layoutMmpr()
  if (f._squad) f._squad.teamUlts = (f._squad.teamUlts || 0) + 1
  f._teamUltTotal = (f._teamUltTotal || 0) + 1   // whole-match count (tests / stats)
  return true
}

// S.P.D.: a firing line on the caster's side — the caster at the front, the others behind in ranks (depth: smaller, higher,
// darker), Omega hovering over the line. Squeezed (never off-stage) when the caster's back is near a wall.
function layoutSpd() {
  const c = cine, d = c.dir, tx = c.tx0, M = 34
  const dist = clamp(Math.abs(c.cx0 - tx), 230, 340)
  const x0 = clamp(tx - d * dist, M, c.stage - M)
  const others = c.forms.filter(k => k !== c.form && k !== 'omega_ranger')
  const back = d > 0 ? x0 - M : c.stage - M - x0, gap = clamp(back / Math.max(1, others.length), 20, 60)
  c.front = x0
  c.team = others.map((form, i) => ({ form, rank: i + 1, x: x0 - d * gap * (i + 1), feet: c.floor - 7 * (i + 1), s: 1 - 0.045 * (i + 1), shade: 0.1 * (i + 1) }))
  if (c.form !== 'omega_ranger' && c.forms.includes('omega_ranger')) c.team.push({ form: 'omega_ranger', rank: 0, x: x0 - d * 70, feet: c.floor - 128, s: 1, shade: 0, hover: true })
  // arrival order: back rank first, Omega last (the cavalry); every Ranger fires on its own beat
  c.team.forEach((m, i) => { m.arrive = SPD_VOLLEY.assemble + i * SPD_VOLLEY.every })
  const N = c.team.length + 1   // + the caster (index N-1 in the shot table)
  c.shots = []
  for (let r = 0; r < 3; r++) for (let i = 0; i < N; i++) {
    // round 0: a ripple from the back rank to the front; round 1: a scattered crossfire; round 2: a rapid double-time stagger
    const off = r === 0 ? (N - 1 - i) * 5 : r === 1 ? ((i * 7 + 3) % N) * 5 + 1 : i * 3
    c.shots.push({ at: SPD_VOLLEY.ripple + r * 26 + off, who: i === N - 1 ? -1 : i, dy: ((i * 37 + r * 17) % 40) - 20, dx: ((i * 23 + r * 11) % 20) - 10 })
  }
  c.shots.sort((a, b) => a.at - b.at)
}

// Mighty Morphin: a pentagram around the lifted foe; Ranger k starts on vertex 2k and dashes to vertex 2k+2 (the five dashes
// trace the star). The caster is one of the five (its own index); the others drop in from the sky.
function layoutMmpr() {
  const c = cine, d = c.dir, M = 60
  const tx = clamp(c.tx0, M + 260, c.stage - M - 260)
  c.cx = tx; c.cy = c.floor - 47 - 70; c.R = 225; c.Ry = 140
  c.V = Array.from({ length: 5 }, (_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 5; return { x: tx + d * c.R * Math.cos(a) * -1, y: c.cy + c.Ry * Math.sin(a) } })
  c.order = c.forms.slice()   // relay order = the dial order (Red → Black → Pink → Green → White)
  c.team = c.order.map((form, k) => ({ form, k, from: (2 * k) % 5, to: (2 * k + 2) % 5, drop: MMPR_STAR.drop + k * MMPR_STAR.dropEvery, caster: form === c.form }))
  // the final pose line: behind the downed foe, caster side, spread evenly
  // classic line-up: Red in the middle, Black and Pink either side, Green and White on the ends — all behind the downed foe
  const SLOT = [2, 1, 3, 0, 4], span = 58, base = tx - d * 130
  c.line = c.order.map((form, k) => ({ form, x: clamp(base - d * SLOT[k % 5] * span, M, c.stage - M) }))
}

// where each MMPR Ranger stands (feet point) at frame k — pure function
export function mmprAt(m, k) {
  const c = cine, S = MMPR_STAR, V = c.V
  const vfeet = v => Math.min(c.floor, v.y + 47)
  const relayS = S.relay + m.k * S.leg
  if (k < S.pose - 6) {
    if (k < relayS) return { x: V[m.from].x, y: vfeet(V[m.from]), pose: 'ready' }
    if (k < relayS + S.leg) { const u = (k - relayS) / S.leg, e = u * u * (3 - 2 * u)
      return { x: V[m.from].x + (V[m.to].x - V[m.from].x) * e, y: vfeet(V[m.from]) + (vfeet(V[m.to]) - vfeet(V[m.from])) * e, pose: 'dash', u } }
    return { x: V[m.to].x, y: vfeet(V[m.to]), pose: k >= S.charge ? 'raise' : 'ready' }
  }
  const L = c.line[m.k], src = V[m.to], u = clamp((k - (S.pose - 6)) / 14, 0, 1)
  return { x: src.x + (L.x - src.x) * u, y: vfeet(src) + (c.floor - vfeet(src)) * u - Math.sin(Math.PI * u) * 60, pose: u < 1 ? 'leap' : 'pose' }
}

function strike(raw, kind) {
  const c = cine, t = c.target, f = c.caster
  if (!(t.health > 0)) return
  const n = raw * c.scale * (c.blocked ? 0.3 : 1)
  const before = t.health
  try { c.W?.damage?.(t, n, { source: 'ultimate', attacker: f, move: 'ultimate', damageType: kind }) } catch (_) {}
  c.hits++; c.dmg += Math.max(0, before - t.health)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  t.colorFlash = 6
  if (!(t.health > 0)) c.ko = true
}
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }

// ── UPDATE (one frame; game.js freezes everything else) ─────────────────────────────────────────────────────────────
export function updateSquadUlt(ctx = {}) {
  const c = cine; if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clearSquadUlt()
  if (c.id === 'spd_rangers') spdFrame(ctx); else mmprFrame(ctx)
  if (++c.frame >= c.S.total) finish()
}

function spdFrame(ctx) {
  const c = cine, S = SPD_VOLLEY, k = c.frame, f = c.caster, t = c.target, d = c.dir, cam = ctx.camera
  // the caster takes the front of the line in the first beat, then holds the shot pose
  const u = clamp(k / 18, 0, 1)
  f.x = clamp(c.cx0 + (c.front - c.cx0) * u * u * (3 - 2 * u), 0, c.stage) - (f.w || 48) / 2; f.y = c.floor - (f.h || 94); f.facing = d; f.vx = f.vy = 0
  const shot = SPD_SHOT[c.form] || 'idle', fired = c.shots.filter(s => s.who === -1 && s.at <= k).length
  if (k < S.alert) pose(f, 'idle', k); else pose(f, shot, k >= S.ripple && k < S.charge ? (fired % 2) * 6 : k >= S.fire && k < S.fire + 8 ? 6 : 0)
  // the foe: pinned, recoiling a few pixels per hit, blown back by the full volley
  t.vx = t.vy = 0; t.isBlocking = false; t.y = c.floor - (t.h || 94)
  const recoil = c.shots.filter(s => s.at <= k).length * 2 + (k >= S.fire ? clamp((k - S.fire) * 9, 0, 90) : 0)
  t.x = clamp(c.tx0 + d * recoil, 0, c.stage - (t.w || 48)) - (t.w || 48) / 2
  // damage + sound beats
  for (const s of c.shots) if (s.at === k) { if (!c.ko) strike(S.shotRaw, 'energy'); sfx(ctx, s.who === -1 ? 'impact_crack_01' : 'crack_sizzle_bright', 0.55); cam?.shake?.(3, 4) }
  if (c.ko && k < S.charge && k > S.ripple) { c.frame = S.charge; return }   // a KO mid-volley jumps straight to the finale
  if (k === 0) sfx(ctx, 'sting_pitch_rise_hold', 0.9)
  for (const m of c.team) if (k === m.arrive) sfx(ctx, m.rank % 2 ? 'warp_wobble_01' : 'warp_wobble_02', 0.6)
  if (k === S.lock) sfx(ctx, 'energy_tone_hold', 0.7)
  if (k === S.charge) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'pitch_drop_slowmo', 0.6) }
  if (k === S.fire) { if (!c.done.final) { c.done.final = true; strike(S.finalRaw, 'energy') } sfx(ctx, 'boom_huge_02_roar', 1); cam?.shake?.(26, 24) }
  if (k === S.verdict) sfx(ctx, 'impact_frame_boom_long', 0.9)
  // camera: the caster close (alert) → the whole line + the foe (assemble / volley) → tight on the foe (verdict)
  if (cam?.focusBetween) {
    const backX = c.team.reduce((m, r) => (d > 0 ? Math.min(m, r.x) : Math.max(m, r.x)), c.front)
    const box = { x: backX - 24, y: c.floor - 94, w: 48, h: 94 }
    if (k < S.alert) cam.focusOnFighter?.(f, 1.45)
    else if (k < S.verdict) cam.focusBetween(box, t, k >= S.charge && k < S.fire ? 1.22 : 1.1)
    else cam.focusOnFighter?.(t, 1.4)
  }
}

function mmprFrame(ctx) {
  const c = cine, S = MMPR_STAR, k = c.frame, f = c.caster, t = c.target, d = c.dir, cam = ctx.camera
  const me = c.team.find(m => m.caster)
  // the caster: morph pose on the spot, then leaps onto its star point and runs the relay like the others
  if (k < S.coins) { f.x = c.cx0 - (f.w || 48) / 2; f.y = c.floor - (f.h || 94); pose(f, 'idle', k) }
  else {
    const p = mmprAt(me, k)
    let x = p.x, y = p.y
    if (k < S.drop + 14) { const u = clamp((k - S.coins) / 18, 0, 1); x = c.cx0 + (p.x - c.cx0) * u; y = c.floor + (p.y - c.floor) * u - Math.sin(Math.PI * u) * 110 }
    f.x = x - (f.w || 48) / 2; f.y = y - (f.h || 94)
    const strikeKey = MMPR_STRIKE[c.form] || 'heavy'
    pose(f, p.pose === 'dash' ? strikeKey : p.pose === 'raise' ? 'up' : p.pose === 'pose' ? 'idle' : (y < c.floor - 6 ? 'jump' : 'idle'), p.pose === 'dash' ? Math.floor(p.u * 8) : 2)
    const relayS = S.relay + me.k * S.leg
    if (k >= relayS && k < relayS + S.leg) { const ax = c.V[me.to].x - c.V[me.from].x; if (ax) f.facing = ax > 0 ? 1 : -1 } else f.facing = (c.cx - (f.x + (f.w || 48) / 2)) >= 0 ? 1 : -1
  }
  f.vx = f.vy = 0
  // the foe: lifted into the centre of the star (trembling), slammed down by the bolt, lying in front of the pose
  t.vx = t.vy = 0; t.isBlocking = false; t.x = c.cx - (t.w || 48) / 2
  const lift = k < S.coins ? 0 : k < S.bolt ? clamp((k - S.coins) / 16, 0, 1) * 70 : clamp(1 - (k - S.bolt) / 6, 0, 1) * 70
  t.y = c.floor - (t.h || 94) - lift
  if (k >= S.bolt + 6 && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 10) }
  // contacts: each relay dash connects at its midpoint, then the Grid bolt
  for (const m of c.team) { const at = S.relay + m.k * S.leg + Math.floor(S.leg / 2); if (k === at) { if (!c.ko) strike(S.relayRaw, 'slash'); sfx(ctx, 'hit_heavy_boom_01', 0.7); cam?.shake?.(7, 6) }
    if (k === S.relay + m.k * S.leg) sfx(ctx, m.k % 2 ? 'whoosh_medium_01' : 'whoosh_medium_02', 0.7)
    if (!m.caster && k === m.drop + 12) sfx(ctx, 'impact_hit_01', 0.5) }
  if (c.ko && k > S.relay && k < S.charge) { c.frame = S.charge; return }
  if (k === 0) sfx(ctx, 'sting_pitch_rise_hold', 0.9)
  if (k === 8 || k === 14 || k === 20) sfx(ctx, 'swish_fast_0' + (1 + (k % 3)), 0.6)
  if (k === S.charge) { sfx(ctx, 'charge_hum_rise', 0.9); sfx(ctx, 'energy_hum_low', 0.6) }
  if (k === S.bolt) { if (!c.done.bolt) { c.done.bolt = true; strike(S.boltRaw, 'lightning') } sfx(ctx, 'boom_huge_01', 1); cam?.shake?.(30, 26) }
  if (k === S.pillars) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === S.pose || k === S.pose + 10) sfx(ctx, k === S.pose ? 'boom_medium_01' : 'boom_medium_02', 0.9)
  if (cam?.focusBetween) {
    if (k < S.coins) cam.focusOnFighter?.(f, 1.45)
    else if (k < S.bolt + 8) cam.focusOnFighter?.({ x: c.cx - 24, y: c.cy - 40, w: 48, h: 94 }, k >= S.charge ? 1.3 : 1.18)
    else cam.focusOnFighter?.({ x: c.cx - 24 - d * 150, y: c.floor - 120, w: 48, h: 94 }, 1.3)
  }
}

function finish() {
  const c = cine, f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.y = c.floor - (t.h || 94)
    if (t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 46) } }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 12; f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0
    if (f.spriteHandler) f.spriteHandler.locked = false; restoreAlpha(f) }
  reset()
}
const restoreAlpha = f => { if (cine.alpha0 == null) delete f._fxAlpha; else f._fxAlpha = cine.alpha0 }
const reset = () => { for (const k of Object.keys(cine)) delete cine[k]; cine.active = false }
// Every reset path (round reset, rematch, KO teardown, menu): restore both fighters and drop the scene.
export function clearSquadUlt() {
  if (!cine.active) return
  const c = cine, f = c.caster, t = c.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0; t.y = c.floor - (t.h || 94) }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0; restoreAlpha(f) }
  reset()
}

// squadCore calls this on the W + U press (players) and from the squad CPU
setTeamUlt({ start: startSquadUlt, clear: clearSquadUlt, active: isSquadUltActive, cost: TEAM_ULT_COST })
