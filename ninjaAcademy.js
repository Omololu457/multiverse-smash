/**
 * ninjaAcademy.js — REUSABLE WIND NINJA ACADEMY FRAMEWORK (profile-driven, parallel to rangers.js).
 *
 * An Academy ninja = a rangers.js profile (NINJA VANISH = the generalized S.P.D. Blink) + a ninja profile here. The
 * framework owns every system the ninja shares; a character module only adds its own moves on top:
 *
 *   1. FOCUS — one energy bar (max 100), carried across stance swaps: +4 landed hit, +2 blocked hit, +1 every 40 f
 *      passively, +5 per Vanish dodge reward. Specials spend on press; an unaffordable press is eaten. Lockout after
 *      the Ultimate.
 *   2. SHADOW CLONE — ONE owner-limited doppelganger (a new cast replaces the old one), 240 f life, drawn from the
 *      ACTIVE stance's strips. While it lives, every clean normal / special the owner lands is ECHOED by the clone 12 f
 *      later from ITS position at 50% damage if that hitbox connects from there. This is the XLR8 / Jetray echo-hit
 *      path (xlr8.js tickEchoes / scheduleEcho): due-frame queue, raw × fraction × the owner's combo scale through the
 *      damage choke-point, echoes never schedule echoes, max 3 per combo, fresh budget when the combo ends.
 *   3. KAWARIMI — Block + Special with a live clone: owner ⇄ clone positions swap instantly, 6 f invulnerable on the
 *      swap frame, 10 Focus, 90 f cooldown. Usable out of hitstun / blockstun (the "substitution" escape).
 *   4. TIMED MODE — per STANCE (Lightning / Quake …): 30 Focus, one shared 600 f cooldown slot, 240 f duration; the
 *      stance profile names the bonuses (damage ×, extra passive Focus, Vanish startup −N, damage-taken ×, heavy
 *      knockback ×).
 *   5. BACKSTEP — a short acrobatic hop back, 6 f invulnerable, 300 f cooldown (ONE cooldown shared by every stance).
 *   6. TWIN TECHNIQUE — the Ultimate helper: with a live clone the finisher lands from BOTH bodies (two impacts, the
 *      pool split between them); without, one body takes the whole pool.
 *   7. STANCE DIAL — multi-stance fighters (Ben 10's Omnitrix grammar, game.js handleOmnitrixSwitch): a fresh ↓ edge
 *      within 16 f of the previous ↓ edge ARMS an 18 f window; the next dial button pressed in it picks a stance
 *      (profile.dial.buttons, e.g. Light → red, Heavy → yellow). Same stance = nothing (no cost, no lockout). The swap
 *      is instant, free (0 Focus), zeroes vx, starts a 30 f lockout, and is refused in hitstun, during a power-commit
 *      cast (special / Ultimate / Mode charge-in) and during the lockout. It clears the OLD stance's state (clone +
 *      pending echoes, the active Mode, the lock-on aim) like Ben's clearBenFormState; Focus, the Vanish charges and
 *      the shared cooldowns persist.
 *
 * SIM vs RENDER
 *   • All gameplay state lives in `fighter._academy` (plain JSON) and `fighter._ranger` (rangers.js) → both are pushed
 *     into the replay checkpoint snapshot by game.js (GAME_STATE, bit-identical replays / LAN).
 *   • No Math.random / gameRng. The framework needs no randomness; kits that do use ninjaHash(match seed, frame,
 *     player index) — the same flight.js hashRandom that rangers.js re-exports as rangerHash.
 *   • The clone's ghost alpha / cool tint, dust, the Mode aura and every streak are RENDER-ONLY (the character's Fx
 *     module reads `_academy` and never writes it).
 *
 * WORLD ACCESSORS (W, handed in by the character module every tick — the framework never imports the engine):
 *   W.stageWidth() · W.frame() · W.seed() · W.damage(target, raw, opts) · W.hurtbox(f) → rect · W.comboScale(f)
 *
 * Adding a ninja = registerAcademyProfile('<rosterKey>', { stances, dial, … }) + registerRangerProfile('<rosterKey>',
 * { blink: NINJA_VANISH, … }). See docs/ninja_academy/FRAMEWORK.md.
 */
import { hashRandom } from './flight.js'
import { SPD_RED_PROFILE } from './spdRedData.js'

export const ninjaHash = hashRandom
// NINJA VANISH = S.P.D. Red's Blink object itself (same frozen numbers by construction: 22% screen, 2 charges, 90 f
// refill each, 3 / 5 / 3 frames, crossup + 8 f PHASE STEP face lock, dodge +5 / +15% within 20 f, air blink, run).
export const NINJA_VANISH = SPD_RED_PROFILE.blink

export const FOCUS_DEFAULTS = Object.freeze({ max: 100, perHit: 4, perBlocked: 2, passiveEvery: 40, perDodge: 5, ultLockout: 180 })
export const CLONE_DEFAULTS = Object.freeze({ cost: 20, life: 240, echoDelay: 12, echoFrac: 0.5, echoMax: 3, alpha: 0.6 })
export const KAWARIMI_DEFAULTS = Object.freeze({ cost: 10, cooldown: 90, invuln: 6 })
export const MODE_DEFAULTS = Object.freeze({ cost: 30, cooldown: 600, duration: 240, transform: 35,
  dmgMul: 1, extraPassive: 0, vanishStartup: 0, takenMul: 1, heavyKbMul: 1, heavyKnockdown: false })
export const BACKSTEP_DEFAULTS = Object.freeze({ invuln: 6, cooldown: 300 })
// Ben 10's swap numbers (game.js OMX_DOUBLE_TAP_WINDOW / OMX_ARM_WINDOW, fighters.js TRANSFORM_ENERGY.SWAP_LOCKOUT);
// the stance swap itself costs nothing (the brief), unlike Ben's 15-Power alien swap.
export const DIAL_DEFAULTS = Object.freeze({ dbl: 16, arm: 18, lockout: 30, cost: 0 })

// ── Registry ────────────────────────────────────────────────────────────────────────────────────────────────────
export const ACADEMY_PROFILES = {}
export function registerAcademyProfile(id, p = {}) {
  const stances = {}
  for (const [k, st] of Object.entries(p.stances || { base: {} }))
    stances[k] = { id: k, element: st.element || 'air', tint: st.tint || '#9fd8ff', label: st.label || k,
      mode: { ...MODE_DEFAULTS, name: 'Mode', ...(p.mode || {}), ...(st.mode || {}) } }
  ACADEMY_PROFILES[id] = {
    id, academy: p.academy || 'Wind Ninja Academy',
    stances, stanceIds: Object.keys(stances), startStance: p.startStance || Object.keys(stances)[0],
    dial: { ...DIAL_DEFAULTS, buttons: {}, ...(p.dial || {}) },
    focus: { ...FOCUS_DEFAULTS, ...(p.focus || {}) },
    clone: { ...CLONE_DEFAULTS, ...(p.clone || {}) },
    kawarimi: { ...KAWARIMI_DEFAULTS, ...(p.kawarimi || {}) },
    backstep: { ...BACKSTEP_DEFAULTS, ...(p.backstep || {}) },
  }
  return ACADEMY_PROFILES[id]
}
export const getAcademyProfile = f => ACADEMY_PROFILES[typeof f === 'string' ? f : f?.rosterKey] || null
export const isAcademyNinja = f => !!getAcademyProfile(f)

// ── State (GAME_STATE) ─────────────────────────────────────────────────────────────────────────────────────────
export function academyState(f) {
  const p = getAcademyProfile(f); if (!p) return null
  return f._academy ||= {
    clock: 0, passive: 0, lockout: 0,
    stance: p.startStance, stanceLock: 0, stanceSwaps: 0, stanceRefused: null,
    dial: { t: 0, prevDown: false, prev: {}, downAt: null, armT: 0 },
    clone: null,           // { n, x, y, w, h, dir, life, age, stance, act: { key, t0 } | null }
    cloneN: 0, echoes: [], echoCount: 0, echoesFired: 0, echoHits: 0, rt: 0,   // rt = every sim frame (hitstop included) — the echo clock
    kawaCd: 0, swaps: 0, lastSwap: null,                 // lastSwap = render streak (from / to / t)
    mode: 0, modeStance: null, modeCd: 0, modeT: 0, modes: 0,   // mode = frames left active (of modeStance's Mode)
    backCd: 0,
    events: [],
  }
}
export function clearAcademy(f) { if (f?._academy) { if (f._ranger) delete f._ranger.blinkMod; delete f._academy } }
const ev = (s, type, o = {}) => s.events.push({ type, ...o })
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const overlaps = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export const stanceOf = f => f?._academy?.stance || getAcademyProfile(f)?.startStance || null
export const stanceProfile = f => { const p = getAcademyProfile(f); return p ? p.stances[stanceOf(f)] : null }

// ── 1. FOCUS ───────────────────────────────────────────────────────────────────────────────────────────────────
export const focusLocked = f => (f?._academy?.lockout || 0) > 0
export function gainFocus(f, n) {
  const p = getAcademyProfile(f); if (!p || focusLocked(f) || !(n > 0)) return
  f.energy = Math.min(f.maxEnergy || p.focus.max, (f.energy || 0) + n)
}
export function canAfford(f, cost) { return !focusLocked(f) && (f.energy || 0) >= cost }
export function spendFocus(f, cost) {
  if (!canAfford(f, cost)) return false
  f.energy = Math.max(0, (f.energy || 0) - cost); return true
}
// Passive Focus (replaces the shared regen): +1 every 40 f, +extra while a Mode that grants it is up; none while
// locked out (after the Ultimate) or in hitstop.
export function academyRegen(f) {
  const p = getAcademyProfile(f); if (!p) return false
  const s = academyState(f)
  if (f.health > 0 && !(f.hitstop > 0) && !focusLocked(f)) {
    if (++s.passive >= p.focus.passiveEvery) { s.passive = 0; gainFocus(f, 1 + (s.mode > 0 ? modeParams(f).extraPassive : 0)) }
  }
  return true
}

// ── 2. SHADOW CLONE ────────────────────────────────────────────────────────────────────────────────────────────
export const cloneAlive = f => !!f?._academy?.clone
export function castClone(f) {
  const p = getAcademyProfile(f), s = academyState(f); if (!p || !s) return false
  if (s.clone) ev(s, 'clonePop', { x: s.clone.x, y: s.clone.y })   // one live clone max: the old one is removed
  s.clone = { n: ++s.cloneN, x: Math.round(f.x || 0), y: Math.round(f.y || 0), w: f.w || 48, h: f.h || 94, dir: f.facing || 1,
    life: p.clone.life, age: 0, stance: s.stance, act: null }
  s.echoes = []
  ev(s, 'clone', { x: s.clone.x, y: s.clone.y })
  return true
}
export function removeClone(f, why = 'expire') {
  const s = f?._academy; if (!s?.clone) return
  ev(s, 'clonePop', { x: s.clone.x, y: s.clone.y, why }); s.clone = null; s.echoes = []
}
// The owner landed a clean hit. box = the move's hitbox at contact (world rect); raw = the move's raw damage.
// Schedules the clone's echo 12 f later (relative geometry, re-placed at the clone's position, facing the foe).
export function scheduleEcho(f, o) {
  const s = f?._academy, p = getAcademyProfile(f)
  if (!s?.clone || !p || o.echo || !(o.raw > 0) || s.echoCount >= p.clone.echoMax) return false
  const dir = f.facing || 1, box = o.box
  const rel = box ? { dx: dir === 1 ? box.x - (f.x + (f.w || 48)) : (f.x) - (box.x + box.w), dy: box.y - f.y, w: box.w, h: box.h } : null
  s.echoCount++
  s.echoes.push({ at: s.rt + p.clone.echoDelay, raw: o.raw * p.clone.echoFrac, key: o.key, rel, proj: o.proj || null,
    hitstun: o.hitstun || 18, kb: o.kb ?? 2, startup: o.startup || 0, type: o.type || 'blunt' })
  s.clone.act = { key: o.key, t0: s.rt + p.clone.echoDelay - (o.startup || 0) }   // the clone starts the move so it lands on the echo frame
  return true
}
// Echo hitbox at the clone's position, facing the foe. Pure.
export function echoBox(c, e, opp) {
  if (!e.rel) return null
  const dir = opp ? (ctrX(opp) < c.x + (c.w || 48) / 2 ? -1 : 1) : c.dir
  const x = dir === 1 ? c.x + (c.w || 48) + e.rel.dx : c.x - e.rel.dx - e.rel.w
  return { x: Math.round(x), y: Math.round(c.y + e.rel.dy), w: e.rel.w, h: e.rel.h, dir }
}

// ── 3. KAWARIMI ────────────────────────────────────────────────────────────────────────────────────────────────
export function canKawarimi(f) {
  const s = f?._academy, p = getAcademyProfile(f)
  if (!s || !p || !s.clone || s.kawaCd > 0 || !canAfford(f, p.kawarimi.cost)) return false
  if (!(f.health > 0) || f.isGrabbed || f.knockdownState || f._ranger?.blink) return false
  return true
}
export function kawarimi(f, opp) {
  if (!canKawarimi(f)) return false
  const s = f._academy, p = getAcademyProfile(f), c = s.clone
  spendFocus(f, p.kawarimi.cost)
  const from = { x: Math.round(f.x), y: Math.round(f.y) }
  f.x = c.x; f.y = c.y; c.x = from.x; c.y = from.y
  f.vx = 0; if (f.vy > 0) f.vy = 0
  f.hitstun = 0; f.blockstun = 0; f.isBlocking = false
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.invulnTimer = Math.max(f.invulnTimer || 0, p.kawarimi.invuln)
  if (opp) { f.facing = ctrX(opp) < ctrX(f) ? -1 : 1; if ((opp.comboCounter || 0) > 0) { opp.comboCounter = 0; opp.comboTimer = 0 } }   // the foe's combo is broken
  c.dir = opp ? (ctrX(opp) < c.x + (c.w || 48) / 2 ? -1 : 1) : c.dir; c.act = null
  s.kawaCd = p.kawarimi.cooldown; s.swaps++
  s.lastSwap = { from: from.x + (f.w || 48) / 2, to: ctrX(f), fy: from.y + (f.h || 94), ty: f.y + (f.h || 94), t: 12 }
  ev(s, 'kawarimi', {})
  return true
}

// ── 4. TIMED MODE (per stance; one shared cooldown slot) ─────────────────────────────────────────────────────
export const modeParams = f => { const s = f?._academy, p = getAcademyProfile(f); return p ? p.stances[s?.modeStance || stanceOf(f)].mode : MODE_DEFAULTS }
export const modeActive = f => (f?._academy?.mode || 0) > 0
export function canMode(f) {
  const s = f?._academy, p = getAcademyProfile(f)
  return !!(s && p && !s.mode && !s.modeT && s.modeCd <= 0 && canAfford(f, stanceProfile(f).mode.cost))
}
// Begin the transform (the character module plays its charge-in move); the Mode switches on after `transform` frames.
export function beginMode(f) {
  if (!canMode(f)) return false
  const s = f._academy, m = stanceProfile(f).mode
  spendFocus(f, m.cost); s.modeT = m.transform; s.modeCd = m.cooldown; s.modeStance = s.stance; s.modes++
  ev(s, 'modeCharge', {}); return true
}
function setBlinkMod(f, on) {
  if (!f._ranger) return
  const m = modeParams(f)
  if (on && m.vanishStartup) f._ranger.blinkMod = { startup: Math.max(1, NINJA_VANISH.startup - m.vanishStartup) }
  else delete f._ranger.blinkMod
}
function endMode(f, s, why) {
  if (!s.mode && !s.modeT) return
  s.mode = 0; s.modeT = 0; setBlinkMod(f, false); s.modeStance = null
  ev(s, 'modeOff', { why })
}
export const modeDamageMul = f => modeActive(f) ? modeParams(f).dmgMul : 1
export const modeTakenMul = f => modeActive(f) ? modeParams(f).takenMul : 1
export const modeHeavy = f => modeActive(f) ? modeParams(f) : null

// ── 5. BACKSTEP ────────────────────────────────────────────────────────────────────────────────────────────────
export function canBackstep(f) { const s = f?._academy; return !!(s && s.backCd <= 0) }
export function useBackstep(f) {
  const s = f?._academy, p = getAcademyProfile(f); if (!canBackstep(f)) return false
  s.backCd = p.backstep.cooldown
  f.invulnTimer = Math.max(f.invulnTimer || 0, p.backstep.invuln)
  ev(s, 'backstep', {}); return true
}

// ── 6. TWIN TECHNIQUE (Ultimate helper) ───────────────────────────────────────────────────────────────────────
// With a live clone: two impact points (front = the ninja, back = the clone) of pool/2 each; without, one of the
// whole pool. Returns the plan (plain JSON, stored by the caller).
export function twinPlan(f, opp, pool, W) {
  const s = f._academy, twin = !!s?.clone && !!opp
  if (twin) {   // the clone appears on the far side of the foe for the finisher
    const sw = W?.stageWidth?.() || 3200, cw = s.clone.w || 48
    const side = ctrX(f) < ctrX(opp) ? 1 : -1
    let x = side === 1 ? opp.x + (opp.w || 48) + 10 : opp.x - cw - 10
    x = Math.max(0, Math.min(sw - cw, x))
    s.clone.x = Math.round(x); s.clone.y = Math.round(opp.y + (opp.h || 94) - (s.clone.h || 94))
    s.clone.dir = -side; s.clone.life = Math.max(s.clone.life, 140); s.clone.act = { key: "ult", t0: s.rt }
  }
  return { twin, each: twin ? pool / 2 : pool, bodies: twin ? 2 : 1 }
}

// ── 7. STANCE DIAL (Ben 10's ↓↓ + one button) ──────────────────────────────────────────────────────────────────
// Every sim frame, BEFORE the hitstop return (Ben's detector runs on sim frames too). raw = the raw controls.
// Returns the picked stance id (or null). The command layer consumes the picking button's press edge.
export function dialInput(f, raw) {
  const p = getAcademyProfile(f), s = academyState(f); if (!p || !s || p.stanceIds.length < 2) return null
  const d = s.dial, D = p.dial; d.t++
  const down = !!raw.down
  if (down && !d.prevDown) {
    if (d.downAt != null && d.t - d.downAt <= D.dbl) { d.armT = D.arm; d.downAt = null } else d.downAt = d.t
  }
  d.prevDown = down
  let pick = null
  for (const [btn, st] of Object.entries(D.buttons)) {
    const v = !!raw[btn], edge = v && !d.prev[btn]; d.prev[btn] = v
    if (edge && d.armT > 0 && !pick) pick = { stance: st, button: btn }
  }
  if (pick) d.armT = 0; else if (d.armT > 0) d.armT--
  return pick
}
export const dialArmed = f => (f?._academy?.dial?.armT || 0) > 0
// Why a swap cannot start right now (string) — or null. `busy` = the character module's power-commit test.
export function stanceRefusal(f, to, busy = false) {
  const s = f?._academy, p = getAcademyProfile(f)
  if (!s || !p || !p.stances[to]) return 'none'
  if (to === s.stance) return 'same'
  if (!(f.health > 0) || f.isGrabbed || f.knockdownState) return 'down'
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if (busy) return 'commit'
  if (s.stanceLock > 0) return 'lockout'
  if (p.dial.cost && !canAfford(f, p.dial.cost)) return 'focus'
  return null
}
// Instant swap. Clears the OLD stance's state (clone + its pending echoes, the active Mode); Focus, Vanish charges and
// the shared cooldowns persist. The character module applies the new stance's presentation + per-stance stats.
export function swapStance(f, to, busy = false) {
  const why = stanceRefusal(f, to, busy), s = f?._academy
  if (s) s.stanceRefused = why
  if (why) return false
  const p = getAcademyProfile(f), from = s.stance
  if (p.dial.cost) spendFocus(f, p.dial.cost)
  if (s.clone) removeClone(f, 'swap')
  s.echoes = []; s.echoCount = 0
  endMode(f, s, 'swap')
  s.stance = to; s.stanceLock = p.dial.lockout; s.stanceSwaps++
  f.vx = 0
  ev(s, 'stance', { from, to })
  return true
}

// ── Per-sim-frame tick (called by the character module, outside hitstop) ─────────────────────────────────────
// Returns this tick's events. opp = the nearest foe. W = world accessors.
export function tickAcademy(f, opp, W) {
  const p = getAcademyProfile(f); if (!p) { if (f?._academy) clearAcademy(f); return [] }
  const s = academyState(f)
  s.clock++
  if (s.lockout > 0) s.lockout--
  if (s.kawaCd > 0) s.kawaCd--
  if (s.backCd > 0) s.backCd--
  if (s.modeCd > 0) s.modeCd--
  if (s.stanceLock > 0) s.stanceLock--
  if (s.lastSwap && --s.lastSwap.t <= 0) s.lastSwap = null
  // MODE: transform → active → off
  if (s.modeT > 0 && --s.modeT <= 0) { s.mode = modeParams(f).duration; setBlinkMod(f, true); ev(s, 'modeOn', {}) }
  else if (s.mode > 0 && --s.mode <= 0) endMode(f, s, 'expire')
  else if (s.mode > 0 && f._ranger && !f._ranger.blinkMod && modeParams(f).vanishStartup) setBlinkMod(f, true)   // a fresh Ranger state mid-Mode
  // CLONE: life, echo queue
  const c = s.clone
  if (c) {
    c.age++
    if (c.act && c.act.key !== 'ult' && s.rt - c.act.t0 > 40) c.act = null
    if (--c.life <= 0) removeClone(f, 'expire')
  }
  if (opp && (opp.hitstun || 0) <= 0 && !s.echoes.length) s.echoCount = 0   // combo over → fresh echo budget
  return s.events
}
// The ECHO queue runs on EVERY sim frame (hitstop included), so an echo lands exactly `echoDelay` frames after the
// hit that scheduled it (xlr8.js tickEchoes: due-frame queue). Called by the character module before its hitstop return.
export function tickEchoes(f, opp, W) {
  const s = f?._academy; if (!s) return []
  s.rt++
  if (s.echoes.length) {
    const due = s.echoes.filter(e => e.at <= s.rt)
    s.echoes = s.echoes.filter(e => e.at > s.rt)
    for (const e of due) fireEcho(f, s, opp, e, W)
  }
  return s.events
}
function fireEcho(f, s, opp, e, W) {
  const c = s.clone; if (!c) return
  s.echoesFired++
  if (e.proj) { ev(s, 'echoProj', { key: e.key, proj: e.proj, x: c.x, y: c.y, dir: opp ? (ctrX(opp) < c.x + (c.w || 48) / 2 ? -1 : 1) : c.dir, raw: e.raw }); return }
  const box = echoBox(c, e, opp)
  if (!opp || !box || !(opp.health > 0) || (opp.invulnTimer || 0) > 0) { ev(s, 'echoWhiff', {}); return }
  const hb = W?.hurtbox?.(opp) || { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 }
  if (!overlaps(box, hb)) { ev(s, 'echoWhiff', {}); return }
  const dir = box.dir
  if (opp.isBlocking && Math.sign((c.x + (c.w || 48) / 2) - ctrX(opp)) === (opp.facing || 1)) {
    // blocked: the foe guards facing the clone (an echo from behind cannot be blocked)
    opp.blockstun = Math.max(opp.blockstun || 0, 10); opp.vx = dir * 2
    W?.damage?.(opp, e.raw * 0.1, { source: 'ability', attacker: f, move: 'cloneEcho', damageType: e.type })
    gainFocus(f, getAcademyProfile(f).focus.perBlocked)
    ev(s, 'echoBlocked', { x: ctrX(opp), y: opp.y + 30 }); return
  }
  const scale = W?.comboScale?.(f) ?? 1
  W?.damage?.(opp, e.raw * scale, { source: 'ability', attacker: f, move: 'cloneEcho', damageType: e.type })
  opp.hitstun = Math.max(opp.hitstun || 0, e.hitstun); opp.vx = dir * e.kb; opp.isBlocking = false
  opp.hitFlash = Math.max(opp.hitFlash || 0, 5)
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  s.echoHits++
  gainFocus(f, getAcademyProfile(f).focus.perHit)
  ev(s, 'echoHit', { x: ctrX(opp), y: opp.y + 30, dmg: e.raw * scale })
}

// HUD helper (pure read)
export function academyHudState(f) {
  const s = f?._academy, p = getAcademyProfile(f); if (!s || !p) return null
  const sp = p.stances[s.stance], mp = modeParams(f)
  return { focus: f.energy || 0, max: f.maxEnergy || p.focus.max, locked: s.lockout > 0, clone: s.clone ? s.clone.life / p.clone.life : 0,
    kawaCd: s.kawaCd / p.kawarimi.cooldown, mode: s.mode / mp.duration, modeCharging: s.modeT > 0, modeCd: s.modeCd / sp.mode.cooldown,
    modeName: (s.mode || s.modeT) ? mp.name : sp.mode.name, backCd: s.backCd / p.backstep.cooldown,
    stance: s.stance, stanceLabel: sp.label, stanceLock: s.stanceLock / p.dial.lockout, armed: s.dial.armT > 0 }
}
