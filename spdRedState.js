// spdRedState.js — S.P.D. Red Ranger authoritative state (GAME_STATE). Red's own state lives in `fighter._spdRed`
// and the shared Ranger framework state in `fighter._ranger` (rangers.js); both are plain JSON pushed into the replay
// checkpoint snapshot, so they reproduce bit-identically. No Math.random / gameRng: sim randomness (Rapid Fire
// spread) is rangerHash(match seed, frame, player index). Render jitter lives in spdRedFx.js.
import { spdRed as SPD_RED_CHAR, SPD_RED_MOVES, SPD_RED_PROFILE, SPD_SUPER } from './spdRedData.js'
import { SPD_RED_FX } from './spdRedSprites.js'
import { tickRanger, clearRanger, rangerWalkMul, ensureRangerState, judgmentAddHit, rangerSealAbsorb, isSealed, rangerHash, RANGER_SCREEN, getRangerProfile } from './rangers.js'
import { meleeDamageType } from './damageTypes.js'
import { spdRedMuzzleWorld } from './spdRedMuzzles.js'   // the barrel tip of the frame that fires (docs/spd_red/muzzle_anchors.png)
export const isSpdRed = f => f?.rosterKey === 'spd_red'
// Audio cue queue (presentation only — played + cleared by game.js right after tickSpdRed; never read by the sim).
export function rcue(f, c) { (f._spdRedCues ||= []).push(c) }

// DELTA economy (brief Phase 3): +4 per hit, +2 per blocked hit, +1.5/s passive (= +1 every 40 frames), +5 per
// teleport dodge. maxEnergy 100.
export const SPD_DELTA = { perHit: 4, perBlocked: 2, passiveEvery: 40, perDodge: 5 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function spdRedState(f) {
  if (!isSpdRed(f)) return null
  return f._spdRed ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (every call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Delta
    lockout: 0,        // Delta lockout after the Super (frames)
    prev: {}, edgeAt: {}, edgeClk: {}, edgeDir: {}, used: {},
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …]
    idleT: 0,          // frames idle with no input (gem glint after 600)
    fx: [],            // impact sparks [{k, x, y, t, n}] (render reads; pure function of the sim)
    serial: 0,
  }
}
export function spdRedRoundReset(f) {
  if (!isSpdRed(f)) { if (f?._ranger) clearRanger(f); return }   // a profile-only Ranger: fresh charges each round
  const st = SPD_RED_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  if (f._spdRed) delete f._spdRed
  clearRanger(f)
  f._rooted = false
  f._skinAnim = f._baseSkinAnim || null
  f._srWinVar = 0
}
export function clearSpdRed(f) {
  if (!isSpdRed(f) && f?._ranger) clearRanger(f)   // a profile-only Ranger (any other registered rangers.js profile)
  if (f?._spdRed || isSpdRed(f)) { delete f._spdRed; delete f._spdRedCues; clearRanger(f); if (isSpdRed(f)) { f._rooted = false; f._skinAnim = f._baseSkinAnim || null } }
}

export const deltaBlocked = f => !!(f?._spdRed && f._spdRed.lockout > 0)
export function gainDelta(f, n) { if (isSpdRed(f) && !deltaBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}
export const ctrX = f => (f.x || 0) + (f.w || 48) / 2
export const ctrY = f => (f.y || 0) + (f.h || 94) * 0.45
const grounded = f => !!(f.onGround || f.grounded)
export function burst(s, k, x, y, t = 12) { s.fx.push({ k, x: Math.round(x), y: Math.round(y), t, n: ++s.serial }); if (s.fx.length > 12) s.fx.shift() }

let _W = null
// World accessors for the Ranger framework (built once per tick from game.js's world object).
const rangerWorld = W => W && { stageWidth: W.stageWidth, frame: W.frame, seed: W.seed, attackBox: W.attackBox, projectiles: W.projectiles }

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
export function tickSpdRed(f, opp, raw = {}, W = null) {
  if (!isSpdRed(f)) {
    if (f?._spdRed) clearSpdRed(f)
    // PROFILE-ONLY RANGER: game.js runs this tick for every fighter, so any other fighter with a registered rangers.js
    // profile gets the whole framework (double-tap blink, charges, invulnerable travel, crossup, face lock, air blink,
    // run, morph, judgment state) with no code of its own. No profile is registered for anyone but spd_red today.
    if (f && f.health > 0 && getRangerProfile(f) && !getRangerProfile(f).ownTick) tickRanger(f, opp, raw, rangerWorld(W))
    return
  }
  const s = spdRedState(f)
  if (W) _W = W
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  // the Ranger framework: blink double-tap / charges / travel, morph, judgment (it tracks its own tick + hitstop)
  const evs = f.health > 0 ? tickRanger(f, opp, raw, rangerWorld(W)) : []
  for (const e of evs) onRangerEvent(f, opp, s, e)
  const rr = f._ranger; if (rr && rr.pendingAt === rr.tick) { s.tapId = rr.pendingAt; s.tapClk = s.clock }   // double-tap on the SIM clock (pauses in hitstop) for blink-cancels
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  for (let i = s.fx.length - 1; i >= 0; i--) if (--s.fx[i].t <= 0) s.fx.splice(i, 1)
  // DODGE BUFF: the next attack started while the 20 f window is open is stamped +15% (consumes the window)
  // WAKE-UP: the 10 frames after he stands up from a knockdown accept any attack button as the reversal (spdRed.js)
  if (s.wasDown && !f.knockdownState) s.wake = 10
  else if (s.wake > 0) s.wake--
  s.wasDown = !!f.knockdownState
  // a Delta Blaster / Rapid Fire bolt connected cleanly (engine projectile hitFlag) → +4 Delta + a Judgment point
  if (f._srBoltHit) { f._srBoltHit = false; gainDelta(f, SPD_DELTA.perHit); judgmentAddHit(f); rcue(f, 'zap') }
  const a = f.attacking ? f.currentAttack : null
  if (a?.sr) tickSpdRedMove(f, opp, s, a, W)
  if (a && !a._srBuffChecked) { a._srBuffChecked = true; if (f._ranger?.dodgeBuff > 0) { a._dodgeBuff = true; f._ranger.dodgeBuff = 0; rcue(f, 'buff') } }
  const still = grounded(f) && !f.attacking && !f.isBlocking && !(f.hitstun > 0) && Math.abs(f.vx || 0) < 0.3 && !BUTTONS.some(k => raw[k]) && !f._ranger?.blink
  s.idleT = still ? s.idleT + 1 : 0
}
function onRangerEvent(f, opp, s, e) {
  switch (e.type) {
    case 'blinkStart': rcue(f, 'blink'); break
    case 'arrive': rcue(f, 'blinkPop'); break
    case 'dodge': gainDelta(f, e.energy || SPD_DELTA.perDodge); rcue(f, 'dodge'); break   // DODGE REWARD: +5 Delta (+15% next attack via r.dodgeBuff)
    case 'guilty': rcue(f, 'guilty'); rcue(f, 'contain'); break
    case 'innocent': if (e.energy) gainDelta(f, e.energy); rcue(f, 'innocent'); break   // INNOCENT: +40 Delta (once per round)
    case 'release': rcue(f, 'release'); break
  }
}

let _startMove = null   // combat.startMove, handed in by spdRed.js (avoids a combat ↔ spdRedState import cycle)
export function registerSpdRedStartMove(fn) { _startMove = fn }
// Start one of Red's moves through the engine's startMove (frameExact path) + attach his descriptor `sr`
// (kind / spawn frames / hitbox shape / per-move blockstun), read by tickMove and the combat.js hooks.
export function spdRedStartMove(f, key, startMove = _startMove) {
  const md = SPD_RED_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)   // specials / Super spend Delta on commit
  const a = f.currentAttack, g = md.sr || {}
  f.currentMove = key
  a.sr = { kind: g.kind || 'normal', ...g, dir: f.facing || 1 }
  if (g.noHit) a.hasHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.isBlocking = false; if (f.onGround || f.grounded) f.vx = 0 }
  return true
}
// Hitbox: Red's own box descriptor (noHit moves → null; centred / raised / low boxes). spd_red-gated in combat.js.
export function spdRedHitbox(f) {
  const a = f.currentAttack, g = a?.sr
  if (!g || g.noHit) return null
  const fw = f.w || 48
  if (g.beam) { const len = Math.round(RANGER_SCREEN * g.beam), bh = g.boxH || 34; return { x: f.facing === 1 ? f.x + fw : f.x - len, y: Math.round(spdRedMuzzleWorld(f, 'deltamax').y - bh / 2), w: len, h: bh } }   // centred on the Striker's barrel axis
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40
  if (g.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (g.boxY ?? 20), w: reach, h }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? 20), w: reach, h }
}

// ── combat.js hooks (spd_red-gated no-ops for everyone else) ──
export function spdRedBlockstun(attacker, defender, atk) {
  if (!isSpdRed(attacker)) return
  const md = SPD_RED_MOVES[atk?.name]; if (md?.blockstun != null) defender.blockstun = md.blockstun   // designed block advantage
  gainDelta(attacker, SPD_DELTA.perBlocked)   // +2 Delta per blocked hit
}
export function spdRedHit(attacker, defender, atk) {
  if (!isSpdRed(attacker) || attacker === defender) return
  gainDelta(attacker, SPD_DELTA.perHit)       // +4 Delta per hit
  judgmentAddHit(attacker)                     // JUDGMENT meter: 1 point per hit (20 to fill)
  const s = spdRedState(attacker); burst(s, 'hit', ctrX(defender), ctrY(defender))
  if (atk?.sr?.knockdown) { defender.knockdownState = true; defender.knockdownTimer = Math.max(defender.knockdownTimer || 0, 44); defender.vy = Math.min(defender.vy || 0, -6) }   // Delta Charge
  rcue(attacker, meleeDamageType(attacker, atk) === 'energy' ? 'zap' : 'impact')
}
// weight 0.9 → knockback taken ÷ 0.9
export function spdRedKnockback(attacker, defender) {
  if (isSpdRed(defender) && defender.vx) defender.vx /= (SPD_RED_CHAR.stats.weight || 0.9)
}
export const spdRedComboScale = f => Math.pow(0.85, Math.max(0, (f?.comboCounter || 0)))
// Passive Delta: +1.5/s (+1 every 40 frames). Replaces the shared passive regen.
export function spdRedRegen(f) {
  if (!isSpdRed(f)) return false
  const s = spdRedState(f)
  if (f.health > 0 && !(f.hitstop > 0) && !deltaBlocked(f)) {
    if (++s.passive >= SPD_DELTA.passiveEvery) { s.passive = 0; gainDelta(f, 1) }
  }
  return true
}
// physics.js walk multiplier: the run after a ground blink (rangers.js) — 1 for everyone else.
export function spdRedWalkMul(f, dir = 0) { return rangerWalkMul(f, dir) }
export { ensureRangerState }
// applyScaledDamage hook (combat.js, the one damage choke-point). Returns rawDamage untouched unless S.P.D. Red is
// involved (filled in by the Judgment / dodge phases).
export function spdRedDamageMods(target, rawDamage, opts = {}) {
  const a = opts.attacker
  // GUILTY containment: the gem card absorbs 50% of every hit on the sealed target (whoever lands it)
  if (a && a !== target && isSealed(target, a)) rawDamage = (rawDamage || 0) * rangerSealAbsorb(target, a)
  // POST-DODGE BUFF: the attack stamped after a rewarded blink dodge does +15% (melee + anything it launched)
  if (a && a !== target && isSpdRed(a) && opts.source !== 'block-chip' && (opts.dodgeBuff || (a.currentAttack?._dodgeBuff && opts.source !== 'ability'))) rawDamage = (rawDamage || 0) * (SPD_RED_PROFILE.blink.dodge?.dmgMul || 1.15)
  return rawDamage
}

// ── MOVES: per-frame behaviour of his scripted moves (bolts, travel, warps, the beam, the Super) ──────────────────
let _proj = null   // { spawn: abilities.spawnProjectile, list: activeProjectiles } — handed in by spdRed.js (no import cycle)
export function registerSpdRedProjectiles(p) { _proj = p }
export const SPD_BOLT_POOL = 4
export const boltCount = f => _proj ? _proj.list.filter(p => p && p.owner === f && p.name === 'srBolt').length : 0
const rect = p => ({ x: (p.x || 0) - (p.radius || (p.w || 16) / 2), y: (p.y || 0) - (p.radius || (p.h || 16) / 2), w: (p.radius || (p.w || 16) / 2) * 2, h: (p.radius || (p.h || 16) / 2) * 2 })
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const pidx = f => f.playerNumber || (f.side === 'p2' ? 2 : 1)
const stageW = () => _W?.stageWidth?.() || 3200
const clampX = (f, x) => Math.max(0, Math.min(stageW() - (f.w || 48), x))
const elapsed = a => a.total - a.timer
const due = (a, key, at) => { const t = elapsed(a); if (t < at || a[key]) return false; a[key] = true; return true }   // fire-once latch (survives a missed tick)

function fireBolt(f, rapid, i, air = false) {
  if (!_proj) return null
  const spr = rapid ? SPD_RED_FX.tracer : SPD_RED_FX.bolt, sc = (SPD_RED_CHAR.spriteScale || 2) * 1.18
  const speed = rapid ? 22 : 16, dir = f.facing || 1
  // RAPID FIRE spread: deterministic hash of (match seed, frame, player index) — never Math.random / gameRng
  const h = rapid ? rangerHash(_W?.seed?.() || 1, (_W?.frame?.() || 0) + i * 7, pidx(f) * 31 + i) : 0.5
  // MUZZLE: the shot leaves the barrel tip of the frame on screen when it fires (aimed R14F2 / hopping R15F1), tail at
  // the tip, flying level along the barrel (the trace). Rapid Fire fans from that same tip, biased slightly DOWN
  // (the gun sits at shoulder height). The barrel is above the roster-standard hurtbox top (sprites draw taller than
  // the 94 px body box), so the collision square is sized to reach from the barrel down into it: radius 32.
  const mz = spdRedMuzzleWorld(f, air ? 'blasterAir' : rapid ? 'rapid' : 'blaster'), half = spr.w * sc * (rapid ? 0.8 : 1) / 2
  const md = { damage: rapid ? 25 : 50, speed, vx: dir * speed, vy: rapid ? (h - 0.3) * 1.4 : 0,
    spawnX: mz.x + dir * half, spawnY: mz.y,
    w: rapid ? 44 : 30, h: rapid ? 10 : 22, radius: 32, lifetime: Math.ceil(RANGER_SCREEN / speed) + 4,
    hitstun: rapid ? 10 : 18, knockbackX: rapid ? 1 : 3, knockbackY: 0, color: '#36d6e6', isSpecial: true, category: 'special',
    hitFlag: '_srBoltHit', noHitstop: rapid, sheet: f._recolorTag ? spr.sheet.replace(/\.png$/i, `__${f._recolorTag}.png`) : spr.sheet, spriteFrames: 1, spriteW: spr.w, spriteH: spr.h, spriteScale: sc * (rapid ? 0.8 : 1) }
  const p = _proj.spawn(f, rapid ? 'srTracer' : 'srBolt', md)
  if (p) { p.damageType = 'projectile'; rcue(f, rapid ? 'rapid' + i : 'blaster') }   // rapid0…4: per-bolt detune (spdRedSound)
  return p
}

// One scripted hit (the Super's strikes + beam). Respects invulnerability and guard; damage goes through the
// engine's choke-point (GLOBAL scale, the Judgment seal, the brutality stamp). Returns true | 'blocked' | false.
export function srStrike(f, foe, dmg, o = {}) {
  if (!foe || foe === f || (foe.invulnTimer || 0) > 0 || !(foe.health > 0)) return false
  const s = spdRedState(f), dir = o.dir || Math.sign(ctrX(foe) - ctrX(f)) || f.facing || 1, type = o.damageType || 'blunt'
  if (foe.isBlocking && !o.locked) {
    foe.blockstun = Math.max(foe.blockstun || 0, o.blockstun || 16); foe.vx = dir * 3
    _W?.damage?.(foe, dmg * 0.1, { source: 'ability', attacker: f, move: o.move || 'sSuper', damageType: type })   // 10% chip
    f.comboCounter = 0; f.comboTimer = 0; gainDelta(f, SPD_DELTA.perBlocked)
    burst(s, 'block', ctrX(foe), ctrY(foe)); rcue(f, 'blocked'); return 'blocked'
  }
  _W?.damage?.(foe, dmg * (o.fixedScale ?? spdRedComboScale(f)), { source: 'ability', attacker: f, move: o.move || 'sSuper', damageType: type })
  foe.hitstun = Math.max(foe.hitstun || 0, o.hitstun || 30)
  foe.vx = dir * (o.kb ?? 2); if (o.launch) foe.vy = o.launch
  if (o.knockdown) { foe.knockdownState = true; foe.knockdownTimer = Math.max(foe.knockdownTimer || 0, 50); foe.vy = Math.min(foe.vy || 0, o.launch || -8) }
  foe.hitFlash = Math.max(foe.hitFlash || 0, 6); foe.isBlocking = false
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  gainDelta(f, SPD_DELTA.perHit); judgmentAddHit(f)
  burst(s, type === 'energy' ? 'zap' : 'hit', ctrX(foe), ctrY(foe)); rcue(f, type === 'energy' ? 'zap' : 'impact')
  return true
}

export function tickSpdRedMove(f, opp, s, a, W) {
  const g = a.sr, t = elapsed(a), md = SPD_RED_MOVES[a.name] || {}, fw = f.w || 48
  switch (g.kind) {
    case 'blaster': {
      // RAPID FIRE: Special still held at the end of the ground Blaster's wind-up and 10 more Delta → convert
      if (!g.air && !a._rapidChecked && t >= g.fire[0] - 1) {
        a._rapidChecked = true
        if (s.prev.special && (f.energy || 0) >= SPD_RED_MOVES.sRapid.cost && !deltaBlocked(f) && spdRedStartMove(f, 'sRapid')) { rcue(f, 'rapidStart'); return }
      }
      if (due(a, '_fired0', g.fire[0])) fireBolt(f, false, 0, !!g.air)
      if (g.air) { f.vy = Math.min(f.vy || 0, 1.5) }   // the hopping shot hangs a moment
      break
    }
    case 'rapid':
      g.fire.forEach((at, i) => { if (due(a, '_fired' + i, at)) fireBolt(f, true, i) })
      break
    case 'charge': {
      const per = Math.round(RANGER_SCREEN * g.travel / md.active)
      if (t >= md.startup && t < md.startup + md.active && !a.hasHit) { f.x = clampX(f, f.x + g.dir * per); f.vx = 0 }
      break
    }
    case 'phase':
      if (opp && due(a, '_warped', g.warpAt)) {
        const reach = Math.round(RANGER_SCREEN * g.reach), dir = g.dir, oc = ctrX(opp), fc = ctrX(f)
        const ahead = (oc - fc) * dir > 0 && Math.abs(oc - fc) <= reach + fw
        let x = ahead ? (dir > 0 ? opp.x + (opp.w || 48) + 8 : opp.x - fw - 8) : f.x + dir * reach
        if (clampX(f, x) !== x && ahead) x = dir > 0 ? opp.x - fw - 8 : opp.x + (opp.w || 48) + 8   // walled: no room behind
        f.x = clampX(f, x); f.vx = 0
        if (ahead) { f.facing = ctrX(opp) < ctrX(f) ? -1 : 1; g.dir = f.facing; a._crossed = true }
        burst(s, 'warp', ctrX(f), ctrY(f)); rcue(f, 'phase')
      }
      break
    case 'upper':
      if (t < md.startup && !(f.onGround || f.grounded)) { f.vy = 0; f.vx = 0 }   // the air version hangs through its wind-up
      if (due(a, '_rose', md.startup)) { f.vy = g.rise; f.vx = g.dir * 2; f.onGround = false; f.grounded = false; f.y -= 2 }
      break
    case 'beam':
      // pierces projectiles: any enemy projectile the live beam touches is erased
      if (g.pierce && _proj && t >= md.startup && t < md.startup + md.active) {
        const box = spdRedHitbox(f)
        for (let i = _proj.list.length - 1; i >= 0; i--) {
          const p = _proj.list[i]
          if (p && p.owner !== f && !p.visualOnly && box && overlaps(box, rect(p))) { _proj.list.splice(i, 1); burst(s, 'zap', p.x, p.y, 10); a._pierced = (a._pierced || 0) + 1 }
        }
      }
      if (due(a, '_beamCue', md.startup)) rcue(f, 'deltamax')
      break
    case 'flip':
      if (t >= g.moveFrom && t <= g.moveTo) { f.x = clampX(f, f.x - g.dir * g.back); f.vx = 0 }
      break
    case 'super': tickSuper(f, opp, s, a, t); break
  }
}

// SUPER — S.P.D. EMERGENCY: DELTA SQUAD FULL POWER. All state in f._spdRed.sup (GAME_STATE).
function tickSuper(f, opp, s, a, t) {
  const S = SPD_SUPER, fw = f.w || 48
  if (!s.sup || s.sup.n !== a._n) {
    a._n = a._n || ++s.serial
    s.sup = { n: a._n, res: null, hits: 0, beam: null, scale: spdRedComboScale(f), guilty: !!(f._ranger?.judg?.guilty || f._ranger?.judg?.verdict === 'guilty'), t: 0 }
    f.energy = 0; s.lockout = 110 + S.lockout   // spends ALL Delta; 3 s lockout after the Super ends
    if (opp) opp.hitstop = Math.max(opp.hitstop || 0, S.flash)   // the poster flash freezes the foe
    rcue(f, 'super')
  }
  const u = s.sup; u.t = t
  const near = () => opp && opp.health > 0 && Math.abs(ctrX(opp) - ctrX(f)) <= RANGER_SCREEN * S.reach + fw
  const side = (behind) => { const left = ctrX(f) < ctrX(opp); const front = left !== behind; return front ? opp.x - fw - 10 : opp.x + (opp.w || 48) + 10 }
  S.strikes.forEach((at, i) => {
    if (!due(a, '_strike' + i, at)) return
    if (i === 0 && !near()) { u.res = 'whiff'; return }
    if (u.res === 'whiff' || u.res === 'blocked' && i > 0) return
    const behind = i === 1   // front (R11) → behind (R12) → below (R13)
    f.x = clampX(f, side(behind)); f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
    const r = srStrike(f, opp, S.strikeDmg, { fixedScale: u.scale, locked: u.res === 'hit', hitstun: 60, kb: 0, launch: i === 2 ? -6 : 0, move: 'sSuper', blockstun: 20 })
    if (i === 0) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
    if (r === true) u.hits++
    rcue(f, 'blinkPop')
  })
  if (u.res === 'hit' && t < S.beamAt && opp) { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.5 }   // held in the combo
  if (opp && due(a, '_back', S.back)) {   // blink back out to beam range
    const dir = ctrX(f) < ctrX(opp) ? -1 : 1
    f.x = clampX(f, ctrX(opp) + dir * 260 - fw / 2); f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
  }
  if (due(a, '_beam', S.beamAt)) {
    const dmg = u.guilty ? S.beamGuilty : S.beamDmg
    const box = { x: f.facing === 1 ? f.x + fw : f.x - RANGER_SCREEN * S.reach, y: f.y - 10, w: RANGER_SCREEN * S.reach, h: (f.h || 94) + 10 }
    const inBeam = opp && overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })
    u.beam = (u.res === 'hit' || inBeam) ? srStrike(f, opp, dmg, { fixedScale: u.scale, locked: u.res === 'hit', damageType: 'energy', hitstun: 50, kb: 12, knockdown: true, launch: -9, move: 'sSuper', blockstun: 28 }) : false
    if (u.beam === true) u.hits++
    u.beamDmg = dmg
  }
  if (due(a, '_refill', 100)) {   // teleport charges refill
    const r = f._ranger, p = getRangerProfile(f)
    if (r && p) { r.charges = p.blink.charges; r.refill = [] }
  }
}
