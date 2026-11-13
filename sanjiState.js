// sanjiState.js — Sanji authoritative state (GAME_STATE). Everything lives in `fighter._sanji` as plain JSON
// (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the replay checkpoint
// and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: every timing is a fixed frame
// count, every position derives from the two fighters' positions, and the one "random" choice (fire-crackle
// variation, render/audio only) hashes (match seed, frame, player index).
import { SANJI_MOVES, sanji as SANJI_CHAR, SANJI_BASE_ANIM, SANJI_DJ_SET, COURSE } from './sanjiData.js'
export const isSanji = f => f?.rosterKey === 'sanji'
// Audio cue queue (presentation only — played + cleared by game.js right after tickSanji; never read by the sim).
export function scue(f, c) { (f._sanjiCues ||= []).push(c) }

// HEAT economy (brief): +4 per kick landed, +2 per kick blocked, +0.5/s passive, +8 per completed Course step.
export const SANJI_HEAT = { perHit: 4, perBlock: 2, passiveEvery: 120, perCourseStep: 8 }
// DIABLE JAMBE (brief Phase 3): ignite at ≥50 Heat (A+B) → 720 f lit; +25% kick damage (+40% "Hell Memories" for the
// first 180 f when ignited at 100 Heat); every kick hit BURNS (3 dmg / 20 f for 2 s, refreshes, never stacks); kick
// trails tinted orange-white; +10% run speed; Heat drains 4/s while lit; no re-ignite until Heat hits 0 and refills.
export const DIABLE = { minHeat: 50, frames: 720, dmg: 1.25, overDmg: 1.40, overFrames: 180, drainEvery: 15, run: 1.10,
  burn: { frames: 120, every: 20, dmg: 3 } }
// THE COURSE (brief Phase 4): the six butcher's cuts in order. In-order hit → +1 step (+8 Heat); out-of-order hit →
// drop ONE step (ambitious, not brittle); 180 f without a Sanji hit → reset to 0; all six → PARTY TABLE KICK COURSE
// is free for 300 f (↓↘→+A).
export const COURSE_RULES = { idleReset: 180, window: 300 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function sanjiState(f) {
  if (!isSanji(f)) return null
  return f._sanji ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Heat (every 120 = +0.5/s)
    idle: 0,           // consecutive neutral-idle frames (smoke / tie idle after 600)
    prev: {}, edgeAt: {}, edgeClk: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    lockout: 0,        // Heat gain lockout (after the super)
    serial: 0,         // projectile serial (render bookkeeping)
    phase: 0,          // 1 while spinning / dashing THROUGH the opponent (physics pass-through)
    dj: 0,             // DIABLE JAMBE frames left (0 = leg not lit)
    djOver: 0,         // "Hell Memories" overheat frames left (ignited at 100 Heat)
    djLock: false,     // ignited this cycle → no re-ignite until Heat reaches 0 (then refills to ≥50)
    djDrain: 0,        // frames toward the next −1 Heat drain (4/s)
    burn: 0, burnTick: 0,   // burn on the opponent: frames left / frames toward the next 3-dmg tick
    lastHit: null,     // [clock, x, y, burning] of the last kick that landed (render: embers on impact)
    course: 0,         // THE COURSE: steps completed in order (0..5; reaching 6 opens the window and resets to 0)
    courseIdle: 0,     // frames since Sanji's last landed hit (180 → the Course resets)
    ptkcFree: 0,       // frames left in the free PARTY TABLE KICK COURSE window (after completing all six)
    courseFx: null,    // [step 1..6 | -1 dropped, clock, x, y] — render-only callout of the last Course change
  }
}

export function clearSanji(f) {
  if (f?._sanji || isSanji(f)) { delete f._sanji; delete f._sanjiCues; if (isSanji(f)) { f._skinAnim = null; restoreSpeed(f) } }
}
function restoreSpeed(f) { const st = SANJI_CHAR.stats; f.dashSpeed = st.dashSpeed }
// The live animation set: Diable Jambe swaps in the tinted-arc strips. (Win variant joins in Phase 7.)
export function sanjiAnimSet(f) { return f?._sanji?.dj > 0 ? SANJI_DJ_SET : null }
function syncAnim(f) { const want = sanjiAnimSet(f); if ((f._skinAnim || null) !== want) f._skinAnim = want }
// Damage multiplier for a kick started now (Diable Jambe lit: ×1.25, ×1.40 in the Hell Memories window).
export const djMult = f => { const s = f?._sanji; return !s || !(s.dj > 0) ? 1 : s.djOver > 0 ? DIABLE.overDmg : DIABLE.dmg }
export const canIgnite = f => { const s = f?._sanji; return !!s && !(s.dj > 0) && !s.djLock && (f.energy || 0) >= DIABLE.minHeat }
function ignite(f, s) {
  s.djOver = (f.energy || 0) >= (f.maxEnergy || 100) ? DIABLE.overFrames : 0
  s.dj = DIABLE.frames; s.djLock = true; s.djDrain = 0
  f.dashSpeed = SANJI_CHAR.stats.dashSpeed * DIABLE.run
  syncAnim(f); scue(f, 'ignite')
}
export function douseDiable(f, cue = true, force = false) {
  const s = f?._sanji; if (!s || (!(s.dj > 0) && !force)) return
  s.dj = 0; s.djOver = 0
  restoreSpeed(f); syncAnim(f); if (cue) scue(f, 'douse')
}
// Round/match reset (game.js runs this right AFTER the shared revertGoku(_f), which stamps Goku's speed 84 / dash
// 16 on EVERY fighter): re-apply Sanji's own walk / run numbers.
export function sanjiRoundReset(f) {
  if (!isSanji(f)) return
  const st = SANJI_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  const s = f._sanji
  if (s) { s.dj = 0; s.djOver = 0; s.djLock = false; s.burn = 0; s.lockout = 0; s.course = 0; s.courseIdle = 0; s.ptkcFree = 0; s.courseFx = null }
  f._skinAnim = sanjiAnimSet(f)
}

const elapsed = a => (a ? a.total - a.timer : -1)
const sj = f => (f.attacking && f.currentAttack?.sj) || null
const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export const heatBlocked = f => !!(f?._sanji && f._sanji.lockout > 0)
export function gainHeat(f, n) { if (!heatBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

// Tear down the live attack and start a Sanji move (frame-exact). Copies the hitbox geometry + block stun.
export function sanjiStartMove(f, key, startMove) {
  const md = SANJI_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.sj || {}
  f.currentMove = key
  // Sanji's own descriptor (NOT `lf`: tickLuffy clears any non-Luffy attack carrying `lf`). Hitbox geometry is read
  // by sanjiHitbox via a one-line gate at the top of combat.getAttackHitbox.
  a.sj = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }   // dir: locked at start
  if (g.contacts) a.sj.contact = -1
  if (g.noHit) a.hasHit = true
  const m = djMult(f)
  if (m !== 1 && !g.noHit) { a.damage = Math.round(a.damage * m); a.sj.dj = true }   // DIABLE JAMBE: +25% (+40% overheat)
  else if (f._sanji?.dj > 0) a.sj.dj = true
  const inv = md.invuln || g.invuln || 0
  if (inv) f.invulnTimer = Math.max(f.invulnTimer || 0, inv)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js: { projectiles, spawn(f,type,data), startMove, stageWidth(), damage(), frame(), seed() }.
export function tickSanji(f, opp, raw = {}, W = null) {
  if (!isSanji(f)) { if (f?._sanji) clearSanji(f); return }
  const s = sanjiState(f)
  // Raw press edges + direction history are observed every tick (even in stun / hitstop).
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  // Press edges keep the direction held AT the edge (a buffered ↓+B pressed in hitstop stays ↓+B).
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; (s.edgeDir ||= {})[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  tickDiable(f, opp, s, W)
  // THE COURSE clock: 3 s with no landed hit → back to 0; the free-super window counts down.
  if (s.course > 0 && ++s.courseIdle >= COURSE_RULES.idleReset) { s.course = 0; s.courseIdle = 0; scue(f, 'courseLost') }
  if (s.ptkcFree > 0) s.ptkcFree--
  const neutral = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isBlocking && (f.onGround || f.grounded) &&
    !raw.left && !raw.right && !raw.up && !raw.down && !raw.jump && Math.abs(f.vx || 0) < 0.5
  s.idle = neutral ? s.idle + 1 : 0
  // Idle > 10 s (600 frames): he exhales smoke and settles his tie (render-only; any input or movement ends it).
  const lounging = s.idle > 600 && opp && opp.health > 0   // never during a KO / FINISH window (win poses own that)
  if (lounging && !f._forceAction) { f._forceAction = 'idleLong'; s.lounge = true }
  else if (s.lounge && !lounging) { if (f._forceAction === 'idleLong') f._forceAction = null; s.lounge = false }
  s.phase = 0
  const z = sj(f)
  if (z) tickMove(f, opp, s, z, W)
}

function tickDiable(f, opp, s, W) {
  if (s.djLock && (f.energy || 0) <= 0) s.djLock = false              // empty → may ignite again once refilled to 50
  if (s.dj > 0) {
    if (s.djOver > 0) s.djOver--
    if (++s.djDrain >= DIABLE.drainEvery) { s.djDrain = 0; f.energy = Math.max(0, (f.energy || 0) - 1) }   // 4 Heat / s
    if ((f.energy || 0) <= 0) s.djLock = false
    if (--s.dj <= 0) douseDiable(f, true, true)   // timer out: the flame dies
  }
  // BURN on the opponent: 3 dmg every 20 f for 2 s (refreshes on each burning kick, never stacks). "energy" tag
  // (the fire), never the kick impact itself.
  if (s.burn > 0) {
    s.burn--
    if (++s.burnTick >= DIABLE.burn.every) {
      s.burnTick = 0
      if (opp && opp.health > 0 && W?.damage) W.damage(opp, DIABLE.burn.dmg, { attacker: f, damageType: 'energy', source: 'sanjiBurn', move: 'diableBurn', scale: 1 })
    }
  }
}

function tickMove(f, opp, s, z, W) {
  const a = f.currentAttack, t = elapsed(a), dir = z.dir || f.facing || 1
  const sw = W?.stageWidth?.() || 3200
  const clampX = x => Math.max(0, Math.min(sw - (f.w || 48), x))
  switch (z.kind) {
    case 'ignite':   // spinning up on one leg — the leg catches fire at litAt
      f.vx = 0; f.isBlocking = false
      if (t === z.litAt && !z.lit) { z.lit = true; ignite(f, s) }
      break
    case 'handstand': {   // spins THROUGH on his hands (pass-through) → lands on the far side facing the other way
      const [st, en, step] = z.slide
      if (t >= st && t < en) { s.phase = 1; f.facing = dir; f.x = clampX(f.x + dir * step); f.vx = 0 }
      break
    }
  }
}

// Passive Heat regen: +0.5/s (+1 per 120 sim frames) while alive. Replaces the shared passive regen.
export function sanjiRegen(f) {
  if (!isSanji(f)) return false
  const s = sanjiState(f)
  if (f.health > 0 && !(f.hitstop > 0) && !(s.dj > 0)) {   // no passive trickle while the leg burns (it drains 4/s)
    if (++s.passive >= SANJI_HEAT.passiveEvery) { s.passive = 0; gainHeat(f, 1) }
  }
  return true
}

const isKick = atk => !!atk?.sj
// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only).
export function sanjiHit(attacker, defender, atk) {
  if (!isSanji(attacker) || attacker === defender || !isKick(atk)) return
  const s = sanjiState(attacker)
  gainHeat(attacker, SANJI_HEAT.perHit)
  const lit = s.dj > 0
  if (lit) { s.burn = DIABLE.burn.frames; s.burnTick = 0 }   // refresh, never stack
  s.lastHit = [s.clock, Math.round(defender.x + (defender.w || 48) / 2), Math.round(defender.y + (defender.h || 94) * 0.45), lit ? 1 : 0]
  scue(attacker, lit ? 'burnImpact' : 'impact')
  advanceCourse(attacker, s, atk, defender)
}
// THE COURSE bookkeeping for one landed Sanji hit. Only the six bound normals move the track; any other landed hit
// (Premier Hachis, specials, the anti-air…) just keeps it alive. The super itself never touches it.
function advanceCourse(f, s, atk, defender) {
  s.courseIdle = 0
  const k = atk?.sj?.course
  if (!k || atk.isUltimate) return
  const fx = (n) => { s.courseFx = [n, s.clock, Math.round(defender.x + (defender.w || 48) / 2), Math.round(defender.y)] }
  if (k === s.course + 1) {
    s.course = k
    gainHeat(f, SANJI_HEAT.perCourseStep)
    scue(f, 'course' + k); fx(k)
    if (k === COURSE.length) { s.course = 0; s.ptkcFree = COURSE_RULES.window; scue(f, 'courseDone') }   // all six → the window
  } else if (s.course > 0) {
    s.course -= 1; fx(-1); scue(f, 'courseDrop')
  }
}
// What the HUD shows: the six pips (all lit while the free window is open).
export const coursePips = f => { const s = f?._sanji; return !s ? 0 : s.ptkcFree > 0 ? COURSE.length : s.course }
// Per-move block stun (combat block branch) + Heat on a blocked kick.
export function sanjiBlockstun(attacker, defender, atk) {
  if (!isSanji(attacker) || !isKick(atk)) return
  if (atk.sj.blockstun != null) defender.blockstun = atk.sj.blockstun
  gainHeat(attacker, SANJI_HEAT.perBlock)
}
// Knockback post-process on a connecting melee hit. Sanji as DEFENDER: weight 0.85 → knockback taken ÷0.85 (he
// flies further and juggles easily — a designed weakness).
export function sanjiKnockback(attacker, defender, atk) {
  if (isSanji(defender) && defender.vx) defender.vx /= (defender.stats?.weight || 0.85)
}
// Pass-through (physics.resolvePlayerCollision): Sanji spinning through the other fighter.
export const sanjiPhasing = (a, b) => !!(a?._sanji?.phase || b?._sanji?.phase)
// Jump suppression (physics canJump): any committed Sanji special / super (normals keep the shared launcher
// jump-cancel).
export const sanjiNoJump = f => !!(f?._sanji && f.attacking && f.currentAttack?.sj && f.currentAttack.sj.kind !== 'normal' && f.currentAttack.sj.kind !== 'handstand')
// Combo scaling (combat._comboScale): 85% per hit. At damage time comboCounter = hits already landed in this combo
// (1st 1.0, 2nd 0.85, 3rd 0.7225 …). The counter and its 90-frame (1.5 s) idle reset are the shared engine ones.
export const sanjiComboScale = f => Math.pow(0.85, Math.max(0, f.comboCounter || 0))

// Recent condensed motion string (numpad tokens) within `win` input ticks, current token last.
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}

// Hitbox for a live Sanji attack (combat.getAttackHitbox gate). Mirrors the shared builder's conventions: in-front
// reach box at boxY (default 20), `centered` boxes on the body, and the forgiving air-normal bubble.
export function sanjiHitbox(f) {
  const a = f.currentAttack, z = a?.sj
  if (!z || z.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (z.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (z.boxY ?? 20), w: reach, h }
  if (a.name === 'air') {   // same bubble as the shared air normals: behind margin + body + reach, raised
    const behind = 16, w = behind + fw + reach
    return { x: f.facing === 1 ? f.x - behind : f.x + fw + behind - w, y: f.y - 25, w, h: h + 45 }
  }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (z.boxY ?? 20), w: reach, h }
}
export { SANJI_BASE_ANIM }
