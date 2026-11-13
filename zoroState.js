// zoroState.js — Roronoa Zoro authoritative state (GAME_STATE). Everything lives in `fighter._zoro` as
// plain JSON (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the
// replay checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: every
// timing is a fixed frame count and every position is derived from the two fighters' positions.
import { ZORO_SANTO_ANIM, ZORO_MOVES } from './zoroData.js'
import { ZORO_FX } from './zoroSprites.js'
export const isZoro = f => f?.rosterKey === 'zoro'
// Audio cue queue (presentation only — played + cleared by game.js right after tickZoro; never read by the sim).
export function zcue(f, c) { (f._zoroCues ||= []).push(c) }

export const ZORO_SPIRIT = { perHitDealt: 5, perHitTaken: 3, passivePerSec: 1, perTornadoTick: 5 }   // a tornado tick is a sword-technique hit (+5)
// SANTORYU (three-sword stance) — a timed form on the shared currentForm/currentFormData pattern
// (abilities.updateTransformationState applies the multipliers every frame; updateZoroSantoryu ticks it).
export const SANTORYU = { cost: 15, duration: 600, cooldown: 240, dmg: 1.12, kb: 1.08 }
export const ZORO_TUNING = {
  taka: { speed: 11, lifetime: 70, damage: 55 },                    // ~770px ≈ 60% of a 1280 screen
  tatsu: { speed: 8, lifetime: 80, damage: 10, tickEvery: 8, pool: 2, dragRange: 150, drag: 3 },   // 640px ≈ 50%
  haki: { below: 0.25, frames: 40, range: 320, stun: 60, push: 14 },
  superLockout: 240,
}
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function zoroState(f) {
  if (!isZoro(f)) return null
  return f._zoro ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Spirit
    idle: 0,           // consecutive neutral-idle frames (NAP idle pose after 600)
    prev: {}, edgeAt: {}, edgeClk: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    noJump: 0,         // jump suppression after a quarter-circle (so ↗ completes Shishi Sonson, not a jump)
    napHold: 0,        // frames Down+Heavy held (NAP starts at 40)
    santoryu: false, santoryuTimer: 0, santoryuCd: 0,
    phase: 0,          // 1 while dashing THROUGH the opponent (physics pass-through)
    groundY: null,     // last grounded feet-y (Tatsu Maki spawns on the floor when cast airborne)
    counter: null,     // Shishi Sonson: side of the attacker that struck the iai window
    superHit: false, inSuper: false, lockout: 0,
    hakiUsed: false, haki: 0,
    serial: 0,         // projectile serial (render bookkeeping)
  }
}

export function clearZoro(f) {
  if (f?._zoro?.santoryu) revertSantoryu(f, false)
  if (f?._zoro || isZoro(f)) { delete f._zoro; delete f._zoroCue; delete f._zoroCues }
}

const elapsed = a => (a ? a.total - a.timer : -1)
const zr = f => (f.attacking && f.currentAttack?.zr) || null
const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export const spiritBlocked = f => !!(f?._zoro && (f._zoro.lockout > 0 || f._zoro.inSuper))
function gainSpirit(f, n) { if (!spiritBlocked(f)) f.energy = Math.min(f.maxEnergy, (f.energy || 0) + n) }

// Tear down the live attack and start a Zoro move (frame-exact). Copies the hitbox geometry + block stun.
export function zoroStartMove(f, key, startMove) {
  const md = ZORO_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.zr || {}, box = md.zrBox || {}
  f.currentMove = key
  // Zoro's own descriptor (NOT `lf`: tickLuffy clears any non-Luffy attack carrying `lf`). Hitbox geometry is
  // read by zoroHitbox via a one-line gate at the top of combat.getAttackHitbox.
  a.zr = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }   // dir: locked at start (dashes cross the foe)
  if (box.centered) a.zr.centered = true
  if (a.zr.boxY == null && box.boxY != null) a.zr.boxY = box.boxY
  if (g.contacts) a.zr.contact = -1
  if (g.noHit) a.hasHit = true
  const inv = md.invuln || g.invuln || 0
  if (inv) f.invulnTimer = Math.max(f.invulnTimer || 0, inv)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  return true
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js: { projectiles, summons, spawn(f,type,data), startMove, stageWidth() }.
export function tickZoro(f, opp, raw = {}, W = null) {
  if (!isZoro(f)) { if (f?._zoro) clearZoro(f); return }
  const s = zoroState(f)
  // Raw press edges + direction history are observed every tick (even in stun / hitstop).
  s.tick++
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock } s.prev[k] = v }
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  // ↗ right after a quarter-circle completes Shishi Sonson instead of jumping (Up is also Jump here).
  if (s.noJump > 0) s.noJump--
  if (/23?6$/.test(recentMotion(s, 12))) s.noJump = 3
  if (s.noJump > 0 && raw.up) { s.noJump = Math.max(s.noJump, 2); f.jumpHeld = true }   // held ↗ stays suppressed until released
  if (f.health <= 0) { s.phase = 0; return }
  // CONQUEROR'S HAKI — passive, once per match, the frame HP drops under 25% (even mid-hitstun).
  if (!s.hakiUsed && f.health < f.maxHealth * ZORO_TUNING.haki.below) fireHaki(f, opp, s, W)
  if (f.hitstop > 0) return
  s.clock++
  if (s.haki > 0) s.haki--
  if (s.lockout > 0) s.lockout--
  if (f.onGround || f.grounded) s.groundY = f.y + f.h
  const neutral = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isBlocking && (f.onGround || f.grounded) &&
    !raw.left && !raw.right && !raw.up && !raw.down && !raw.jump && Math.abs(f.vx || 0) < 0.5
  s.idle = neutral ? s.idle + 1 : 0
  // Idle > 10 s (600 frames): he dozes off — the NAP pose (render-only; any input or movement wakes him).
  const dozing = s.idle > 600 && opp && opp.health > 0   // never during a KO / FINISH window (win poses own that)
  if (dozing && !f._forceAction) { f._forceAction = 'nap'; s.napPose = true }
  else if (s.napPose && !dozing) { if (f._forceAction === 'nap') f._forceAction = null; s.napPose = false }

  // Super bookkeeping: the Spirit lockout starts when Ashura ends (any way it ends).
  let z = zr(f)
  if (s.inSuper && !(z && (z.kind === 'ashura' || z.kind === 'ashuraMiss'))) { s.inSuper = false; s.lockout = ZORO_TUNING.superLockout; s.lastAshura = s.superHit ? s.clock : 0 }
  s.phase = 0
  if (z) tickMove(f, opp, s, z, W)
  if (W) tickProjectiles(f, opp, s, W)
}

function tickMove(f, opp, s, z, W) {
  const a = f.currentAttack, t = elapsed(a), dir = z.dir || f.facing || 1
  const sw = W?.stageWidth?.() || 3200
  const clampX = x => Math.max(0, Math.min(sw - (f.w || 48), x))
  switch (z.kind) {
    case 'taka':
      if (t === z.spawnAt && W) spawnTaka(f, s, W, opp)
      break
    case 'tatsu':
      if (t === z.spawnAt && W) spawnTatsu(f, s, W)
      break
    case 'oni': {
      const [st, en, step] = z.dash
      if (t >= st && t < en) { s.phase = 1; f.facing = dir; f.x = clampX(f.x + dir * step); f.vx = 0 }
      // Whiff: the dash ended without contact → extra recovery (punishable).
      if (t === en && !a.hasHit && !z.whiffed) { z.whiffed = true; a.timer += z.whiffExtra; a.total += z.whiffExtra }
      break
    }
    case 'tora': {
      const [st, en, step] = z.lunge
      if (t >= st && t < en) { f.facing = dir; f.x = clampX(f.x + dir * step); f.vx = 0 }
      if (t === a.activeStart && opp && opp._crouching && !z.boosted) { z.boosted = true; a.damage = Math.round(a.damage * z.crouchBonus) }
      break
    }
    case 'shishi':
      if (s.counter != null) {   // struck during the iai window → draw and slash through (reversal)
        s.counter = null
        zoroStartMove(f, 'zShishiStrike', W?.startMove)
      }
      break
    case 'shishiStrike': {
      const [st, en, step] = z.dash
      if (t >= st && t < en) { s.phase = 1; f.facing = dir; f.x = clampX(f.x + dir * step); f.vx = 0 }
      break
    }
    case 'nap':
      if (t > 0 && t % z.every === 0 && t / z.every <= z.regen) gainSpirit(f, 1)
      if (t % 60 === 30) zcue(f, 'snore')   // soft snore every 60 frames while asleep
      f.isBlocking = false
      break
    case 'ashura': tickAshura(f, opp, s, z, a, t, clampX, W); break
  }
}

function tickAshura(f, opp, s, z, a, t, clampX, W) {
  // "Must connect on the first strike": no first-cut contact by missAt → the whiff recovery.
  if (t === z.missAt && !s.superHit) { zoroStartMove(f, 'zAshuraMiss', W?.startMove); return }
  if (s.superHit && opp && t >= z.missAt) {   // cinematic lock: the opponent is held in place between cuts
    opp.vx = 0; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    f.invulnTimer = Math.max(f.invulnTimer || 0, 2)
  }
  const i = z.contacts.findIndex(([st, ac]) => t >= st && t < st + ac)
  if (i < 0) { a.hasHit = true; return }
  if (i > 0 && !s.superHit) { a.hasHit = true; return }
  const [st, , dmg] = z.contacts[i]
  if (t === st && opp) {
    // Each cut starts on the near side of the opponent and dashes THROUGH to the far side.
    const oc = opp.x + (opp.w || 48) / 2, d = Math.sign(oc - (f.x + (f.w || 48) / 2)) || f.facing || 1
    z.cutDir = d
    if (i > 0) f.x = clampX(oc - d * 70 - (f.w || 48) / 2)
    z.contact = i; a.hasHit = false; a.damage = dmg
    if (i === z.contacts.length - 1) { a.pushX = 14; a.launchY = -9; a.hitstun = 46 }   // Rengoku Onigiri knocks away
  }
  s.phase = 1
  const cd = z.cutDir || z.dir || 1
  f.facing = cd; f.x = clampX(f.x + cd * (i === 0 ? 22 : 30)); f.vx = 0
}

// ── Projectiles (engine projectiles tagged zoroKind; damage pre-multiplied by the live form multiplier) ──
const zoroProjectiles = (f, W, kind) => W.projectiles.filter(p => p.owner === f && p.zoroKind === kind)
export function takaReady(f, W) { return !W || zoroProjectiles(f, W, 'taka').length === 0 }        // one active at a time
export function tatsuSlots(f, W) { return W ? ZORO_TUNING.tatsu.pool - zoroProjectiles(f, W, 'tatsu').length : 2 }
function spawnTaka(f, s, W, opp) {
  const T = ZORO_TUNING.taka, fx = ZORO_FX.takaNami, dir = f.facing || 1, sc = 1.6
  const sx = dir === 1 ? f.x + (f.w || 48) : f.x - fx.w * sc, sy = f.y + (f.h || 100) * 0.3
  // A flying slash follows its target upward: aimed at an AIRBORNE opponent in front (juggles), else flat.
  let aimAt = null
  if (opp && !(opp.onGround || opp.grounded)) {
    const ox = opp.x + (opp.w || 48) / 2, oy = opp.y + (opp.h || 100) * 0.5
    if ((ox - (f.x + (f.w || 48) / 2)) * dir > 0) aimAt = { x: ox, y: oy }
  }
  const p = W.spawn(f, 'zoroTakaNami', { damage: Math.round(T.damage * (f.damageMultiplier || 1)), speed: T.speed, lifetime: T.lifetime,
    w: fx.w * sc, h: fx.h * sc, radius: 30, sheet: fx.sheet, spriteFrames: 1, spriteW: fx.w, spriteH: fx.h, spriteScale: sc,
    hitstun: 26, knockbackX: 5, knockbackY: -5, isSpecial: true, color: '#e8f060', spawnX: sx, spawnY: sy, aimAt })
  if (p) { p.zoroKind = 'taka'; p.zoroSerial = ++s.serial }
}
function spawnTatsu(f, s, W) {
  const T = ZORO_TUNING.tatsu, fx = ZORO_FX.tornado, dir = f.facing || 1, sc = 2.1
  const n = s.santoryu ? 2 : 1   // SANTORYU: "becomes 2-hit" — a twin tornado (fills the pool of 2)
  const floor = (f.onGround || f.grounded) ? f.y + f.h : (s.groundY ?? f.y + f.h)
  const slots = tatsuSlots(f, W)
  for (let k = 0; k < Math.min(n, slots); k++) {
    const x0 = (dir === 1 ? f.x + (f.w || 48) + 10 : f.x - 10) - dir * k * 48
    const p = W.spawn(f, 'zoroTatsuMaki', { damage: Math.round(T.damage * (f.damageMultiplier || 1)), speed: T.speed, lifetime: T.lifetime,
      w: 70, h: 120, radius: 64, sheet: fx.sheet, spriteFrames: 4, spriteW: fx.w, spriteH: fx.h, spriteSpeed: 4, spriteScale: sc,
      spriteBottomY: floor, hitstun: 16, knockbackX: 0.5, knockbackY: -1, piercesMulti: true, noHitstop: true, isSpecial: true,
      color: '#dfe8f0', spawnX: x0, spawnY: floor - 84 })   // box floor-148…floor-20: catches popped foes too
    if (p) { p.zoroKind = 'tatsu'; p.zoroSerial = ++s.serial; p.zoroFloor = floor }
  }
}
function tickProjectiles(f, opp, s, W) {
  const T = ZORO_TUNING.tatsu
  for (const p of W.projectiles) {
    if (p.owner !== f || p.zoroKind !== 'tatsu') continue
    if ((p.age || 0) > 0 && (p.age % T.tickEvery) === 0) p._pierceHits = []   // re-arm → multi-hit every 8f
    if (opp && opp.health > 0 && !(opp.invulnTimer > 0)) {   // DRAG: pull the opponent into the twister
      const oc = opp.x + (opp.w || 48) / 2, dx = p.x - oc
      if (Math.abs(dx) < T.dragRange && p.zoroFloor - (opp.y + opp.h) < 220) opp.x += Math.sign(dx) * Math.min(T.drag, Math.abs(dx))
    }
  }
}

// ── CONQUEROR'S HAKI (passive, once per match) ──
function fireHaki(f, opp, s, W) {
  const H = ZORO_TUNING.haki
  s.hakiUsed = true; s.haki = H.frames; zcue(f, 'haki')
  f.invulnTimer = Math.max(f.invulnTimer || 0, 20)
  const cx = f.x + (f.w || 48) / 2, cy = f.y + (f.h || 100) / 2
  if (W) {   // cancel enemy projectiles + summons in range
    for (let i = W.projectiles.length - 1; i >= 0; i--) {
      const p = W.projectiles[i]
      if (p.owner !== f && Math.hypot(p.x - cx, p.y - cy) < H.range) W.projectiles.splice(i, 1)
    }
    const sm = W.summons || []
    for (let i = sm.length - 1; i >= 0; i--) {
      const m = sm[i]
      if (m.owner !== f && Math.abs((m.x || 0) - cx) < H.range) sm.splice(i, 1)
    }
  }
  if (opp && opp.health > 0 && Math.abs((opp.x + (opp.w || 48) / 2) - cx) < H.range) {
    const away = Math.sign(opp.x + (opp.w || 48) / 2 - cx) || -(f.facing || 1)
    opp.attacking = false; opp.currentAttack = null; opp.currentMove = null
    // Cancel sustained BEAMS: hitstun already ends most (e.g. Homelander's laser), but Superman's held Heat
    // Vision ignores hitstun — drop its hold so it needs a fresh press. (Zoro's effect; no change to his data.)
    if (opp._supHvHold || opp._supHvBeam) { opp._supHvHold = null; opp._supHvBeam = null; opp._supHvTick = 0 }
    opp.vx = away * H.push; opp.vy = Math.min(opp.vy || 0, -4)
    opp.hitstun = Math.max(opp.hitstun || 0, H.stun)   // 1 s stun on hit
    opp.colorFlash = 10
  }
}

// Passive Spirit regen: +1 per second (60 sim frames) while alive. Replaces the shared passive regen.
export function zoroRegen(f) {
  if (!isZoro(f)) return false
  const s = zoroState(f)
  if (f.health > 0 && !(f.hitstop > 0)) {
    if (++s.passive >= 60) { s.passive = 0; gainSpirit(f, ZORO_SPIRIT.passivePerSec) }
  }
  return true
}

// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only).
export function zoroHit(attacker, defender, atk) {
  if (isZoro(attacker) && attacker !== defender) {
    if (atk?.zr?.kind === 'ashura' && attacker._zoro) attacker._zoro.superHit = true
    gainSpirit(attacker, ZORO_SPIRIT.perHitDealt)
    zcue(attacker, 'hit')   // metallic ping
  }
  if (isZoro(defender) && attacker !== defender) gainSpirit(defender, ZORO_SPIRIT.perHitTaken)
}
// Projectile hit bookkeeping (combat.resolveProjectileHitsMulti, after the combo bookkeeping).
export function zoroProjectileHit(proj, target) {
  if (!proj || target.isBlocking) return
  const o = proj.owner
  // A tornado is ONE hit for combo scaling: its re-armed ticks after the first don't deepen the 85% decay.
  if (isZoro(o) && proj.zoroKind === 'tatsu') { if (proj._zoroCounted) o.comboCounter = Math.max(1, (o.comboCounter || 1) - 1); proj._zoroCounted = true }
  if (isZoro(o) && o !== target) { gainSpirit(o, proj.zoroKind === 'tatsu' ? ZORO_SPIRIT.perTornadoTick : ZORO_SPIRIT.perHitDealt); if (proj.zoroKind === 'taka') zcue(o, 'hit') }
  if (isZoro(target) && o !== target) gainSpirit(target, ZORO_SPIRIT.perHitTaken)
}
// Per-move block stun (combat block branch): the engine default is a flat 10 (+4 special); Zoro's moves
// carry their own so the designed block advantage (+1 / −3 / −6 / −12 …) holds.
export function zoroBlockstun(attacker, defender, atk) {
  if (isZoro(attacker) && atk?.zr?.blockstun != null) defender.blockstun = atk.zr.blockstun
}
// SHISHI SONSON — a melee strike landing in the iai window is negated; Zoro answers next frame.
export function zoroCounter(defender, attacker) {
  if (!isZoro(defender) || defender.hitstun > 0 || defender.isGrabbed) return false
  const a = defender.currentAttack, z = a?.zr
  if (!defender.attacking || z?.kind !== 'shishi' || z.countered) return false
  const t = elapsed(a), inc = attacker?.currentAttack
  if (t < z.window[0] || t >= z.window[1] || !inc || inc.category === 'grab') return false
  z.countered = true; zoroState(defender).counter = attacker.side ?? 1
  defender.colorFlash = 8; zcue(defender, 'counter')
  return true
}
// Pass-through (physics.resolvePlayerCollision): either fighter dashing through the other.
export const zoroPhasing = (a, b) => !!(a?._zoro?.phase || b?._zoro?.phase)
// Jump suppression (physics canJump): the post-QCF ↗ window, and any committed Zoro SPECIAL / super
// (normals keep the shared launcher jump-cancel).
export const zoroNoJump = f => !!(f?._zoro && (f._zoro.noJump > 0 || (f.attacking && f.currentAttack?.zr && f.currentAttack.zr.kind !== 'normal')))

// Combo scaling (combat._comboScale): Zoro's strings decay 85% per hit. At damage time comboCounter = hits
// already landed in this combo (1st hit 1.0, 2nd 0.85, 3rd 0.7225 …). The counter and its 90-frame (1.5 s)
// idle reset are the shared engine ones.
export const zoroComboScale = f => Math.pow(0.85, Math.max(0, f.comboCounter || 0))

// Recent condensed motion string (numpad tokens) within `win` input ticks, current token last.
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}

// ── SANTORYU ─────────────────────────────────────────────────────────────────────────────────────────
export function enterSantoryu(f) {
  const s = zoroState(f)
  if (!s || s.santoryu || s.santoryuCd > 0 || (f.energy || 0) < SANTORYU.cost) return false
  f.energy -= SANTORYU.cost
  s.santoryu = true; s.santoryuTimer = SANTORYU.duration
  f.currentForm = 'santoryu'
  f.currentFormData = { damageMultiplier: SANTORYU.dmg, attackMultiplier: SANTORYU.dmg, knockbackMultiplier: SANTORYU.kb, santoryu: true }
  f.damageMultiplier = f.attackMultiplier = SANTORYU.dmg
  f._skinAnim = ZORO_SANTO_ANIM
  zcue(f, 'santoryu')
  return true
}
export function revertSantoryu(f, withCooldown = true) {
  const s = f?._zoro; if (!s || !s.santoryu) return
  s.santoryu = false; s.santoryuTimer = 0; if (withCooldown) s.santoryuCd = SANTORYU.cooldown
  f.currentForm = 'base'; f.currentFormData = null
  f.damageMultiplier = f.attackMultiplier = 1
  f._skinAnim = f._baseSkinAnim || null
  zcue(f, 'sheathe')
}
// Per-frame form ticker (called from abilities.updateTransformationState, like updateJiraiyaHermit).
export function updateZoroSantoryu(f) {
  const s = isZoro(f) ? f._zoro : null; if (!s) return
  if (s.santoryuCd > 0) s.santoryuCd--
  if (!s.santoryu) return
  if (f.health <= 0) { revertSantoryu(f, false); return }
  if (--s.santoryuTimer <= 0) revertSantoryu(f, true)
}

// Knockback post-process on a connecting melee hit (combat.resolveAttackHit, before wall-splat).
// Zoro as ATTACKER in Santoryu: knockback +8%. Zoro as DEFENDER: weight 1.1 → knockback taken ÷1.1.
export function zoroKnockback(attacker, defender, atk) {
  if (isZoro(attacker) && attacker._zoro?.santoryu && defender.vx) defender.vx *= SANTORYU.kb
  if (isZoro(defender) && defender.vx) defender.vx /= (defender.stats?.weight || 1.1)
}

// Hitbox for a live Zoro attack (combat.getAttackHitbox gate). Mirrors the shared builder's conventions:
// in-front reach box at boxY (default 20), `centered` boxes on the body, and the forgiving air-normal bubble.
export function zoroHitbox(f) {
  const a = f.currentAttack, z = a?.zr
  if (!z || z.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (z.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (z.boxY ?? 20), w: reach, h }
  if (a.name === 'air') {   // same bubble as the shared air normals: behind margin + body + reach, raised
    const behind = 16, w = behind + fw + reach
    return { x: f.facing === 1 ? f.x - behind : f.x + fw + behind - w, y: f.y - 25, w, h: h + 45 }
  }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (z.boxY ?? (a.name === 'up' ? -30 : 20)), w: reach, h }
}
