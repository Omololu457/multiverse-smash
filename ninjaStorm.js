// ninjaStorm.js — NINJA STORM RANGERS command layer (one fighter, Red / Yellow stance — both stances share these inputs).
// Called from game.js once per sim frame (1v1 + FFA) after tickNinjaStorm recorded the press edges + direction history
// and ran the STANCE DIAL (↓↓ then Light → Red / Heavy → Yellow; the picking press is consumed there). Returns 'consumed' when it started / continued
// something, 'grab' to let only the shared grab/throw run, or false (hit/block-stun: the engine's path).
//
//   Jab L · Straight L,L (or →+L) · Kick H (L,L,H / a string ender knocks down) · Rising Kick ↑+H / Up-Attack (anti-air, launches)
//   Low Kick ↓+L (or ↓+H) · Air Kick air L / air H · Backstep ←+H (6 f invulnerable, 300 f cooldown)
//   CRESCENT BLADE ↓↘→+S · CRESCENT WAVE ↓↙←+S (air too) · SHURIKEN S (air too) · LOCK-ON ↓+S held 10 f (air too)
//   SHADOW CLONE ←+S (ground or air; ↑+S in the air too) · KAWARIMI Block+S (needs the clone; works out of hit/block stun)
//   LIGHTNING (Red) / QUAKE (Yellow) MODE L+H+S together · ULTIMATE Ultimate button (or ↓↘→↓↘→+S) at 100 Focus
//   STANCE SWAP ↓↓ then Light (Red) / Heavy (Yellow) — instant, free, 30 f lockout
//   NINJA VANISH = double-tap ←/→ (rangers.js). Any connected normal / special can be Vanish-cancelled.
import { startMove, getHurtbox } from './combat.js'
import { spawnProjectile, activeProjectiles } from './abilities.js'
import { NS_MOVES, NS_LIMITS } from './ninjaStormData.js'
import { isNinjaStorm, nsState, nsStartMove, registerNinjaStormEngine, ncue, recentMotion, shotCount, nsComboScale, kawarimi, beginMode, useBackstep } from './ninjaStormState.js'
import { isBlinking, canBlink, startBlink } from './rangers.js'
import { canKawarimi, canMode, canBackstep, canAfford, focusLocked, modeHeavy } from './ninjaAcademy.js'

registerNinjaStormEngine({ startMove, spawn: spawnProjectile, list: activeProjectiles, comboScale: nsComboScale, hurtbox: getHurtbox })
const CHORD = 4, BUFFER = 8
const live = (s, k, win) => s.edgeAt[k] != null && s.used[k] !== s.edgeAt[k] && s.tick - s.edgeAt[k] <= win
const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }
function fresh(s, k, win = BUFFER) { const at = s.edgeAt[k]; return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -1e9) <= win }
function pressDir(s, b, inp, facing) {   // a buffered press reads the direction held at its press edge
  const t = s.edgeDir?.[b]
  if (t == null || s.edgeAt[b] === s.tick) return inp
  const fk = facing === -1 ? 'left' : 'right', bk = facing === -1 ? 'right' : 'left'
  return { ...inp, down: t <= 3, up: t >= 7, [fk]: t % 3 === 0, [bk]: t % 3 === 1 }
}
function hasMotion(s, pat, win) { const str = recentMotion(s, win); let i = 0; for (const c of str) if (c === pat[i]) { i++; if (i === pat.length) return true } return false }
const GATLING = { light: ['nStraight', 'nLow', 'heavy', 'heavyQuake', 'up'], nStraight: ['heavy', 'heavyQuake', 'up'], nLow: ['nStraight', 'heavy', 'heavyQuake', 'up'], heavy: ['up'], heavyQuake: ['up'] }
const heavyKey = f => modeHeavy(f)?.heavyKnockdown ? 'heavyQuake' : 'heavy'   // Quake Mode's heavy (×1.6 kb + knockdown)
function normalFor(f, inp, button, grounded) {
  const fwd = f.facing === -1 ? inp.left : inp.right, back = f.facing === -1 ? inp.right : inp.left
  if (!grounded) return button === 'heavy' ? 'down_air' : 'air'
  if (button === 'upAttack') return 'up'
  if (button === 'light') return inp.down ? 'nLow' : fwd ? 'nStraight' : 'light'
  if (inp.up) return 'up'
  if (inp.down) return 'nLow'
  if (back) return 'nBackstep'
  return heavyKey(f)
}
export function canDo(f, key) {
  const md = NS_MOVES[key]; if (!md) return false
  if (key === 'nUlt') return (f.energy || 0) >= 100 && !focusLocked(f)
  if (key === 'nClone' || key === 'nMode') { if (key === 'nMode') return canMode(f) }
  if ((md.cost || 0) > 0 && !canAfford(f, md.cost)) return false
  if ((key === 'nWave' || key === 'nWaveAir') && shotCount(f, 'wave') >= NS_LIMITS.wave) return false
  if ((key === 'nShuriken' || key === 'nShurikenAir') && shotCount(f, 'shuriken') >= NS_LIMITS.shuriken) return false
  if (key === 'nLock' || key === 'nLockUp' || key === 'nLockAir') return !focusLocked(f) && (f.energy || 0) >= md.nsr.cost
  if (key === 'nBackstep') return canBackstep(f)
  return true
}
function specialFor(f, s, button, inp, grounded, opp) {
  if (button === 'ultimate') return 'nUlt'
  if (hasMotion(s, '236236', 40)) return 'nUlt'
  if (hasMotion(s, '236', 16)) return grounded ? (f._academy?.mode > 0 ? 'nBladeMode' : 'nBlade') : null
  if (hasMotion(s, '214', 16)) return grounded ? 'nWave' : 'nWaveAir'
  const back = f.facing === -1 ? inp.right : inp.left
  if (back || inp.up) return 'nClone'   // SHADOW CLONE: Back + Special (ground or air); Up + Special = the same in the air
  if (inp.down) return !grounded ? 'nLockAir' : opp && !(opp.onGround || opp.grounded) ? 'nLockUp' : 'nLock'
  return grounded ? 'nShuriken' : 'nShurikenAir'
}
function start(f, key) {
  if (key === 'nMode') { if (!beginMode(f)) return false; if (nsStartMove(f, 'nMode')) { nsState(f).stats.modes++; ncue(f, 'modeCharge'); return true } return false }
  if (key === 'nBackstep') { if (!useBackstep(f)) return false; nsState(f).stats.backsteps++ }
  const ok = nsStartMove(f, key)
  if (ok) ncue(f, key === 'nUlt' ? 'ultStart' : key === 'nClone' ? 'cloneCast' : key === 'nLock' || key === 'nLockUp' || key === 'nLockAir' ? 'aim' : NS_MOVES[key]?.isSpecial ? 'special' : 'swing')
  return ok
}
function trySpecial(f, s, inp, grounded, opp) {
  for (const b of ['ultimate', 'special']) {
    if (!fresh(s, b)) continue
    const key = specialFor(f, s, b, pressDir(s, b, inp, f.facing), grounded, opp)
    use(s, b)
    if (!key) return true
    if (canDo(f, key)) start(f, key)
    return true   // an unaffordable press is eaten (no engine fallback)
  }
  return false
}
function tryKawarimi(f, s, inp, opp) {
  if (!fresh(s, 'special') || !(inp.block || s.prev.block)) return false
  use(s, 'special')
  if (!canKawarimi(f)) return true   // eaten
  if (kawarimi(f, opp)) { nsStartMove(f, 'nSwap'); nsState(f).stats.swaps++ }
  return true
}
const chordMode = s => live(s, 'light', CHORD) && live(s, 'heavy', CHORD) && live(s, 'special', CHORD)

export function updateNinjaStormCommandCombat(f, inp, opp) {
  if (!isNinjaStorm(f)) return false
  const s = nsState(f), r = f._ranger
  const grounded = !!(f.onGround || f.grounded)
  if (isBlinking(f)) return 'consumed'   // mid-Vanish: the blink owns him for 11 frames
  if (f.isGrabbed || !(f.health > 0) || f.knockdownState || f.hitstop > 0) return false
  // KAWARIMI — the panic button: Block + Special with a live clone, even out of hit / block stun
  if ((f.hitstun > 0 || f.blockstun > 0) && f._academy?.clone) { if (tryKawarimi(f, s, inp, opp)) return 'consumed' }
  if (f.hitstun > 0 || f.blockstun > 0) return false
  // MODE chord (L+H+S): cancels a just-started normal (the chord's first button started it)
  if (chordMode(s)) {
    const a = f.attacking ? f.currentAttack : null
    const early = !a || (a.total - a.timer <= 4 && !a.isUltimate && a.name !== 'nMode')
    if (early && canMode(f)) {
      if (a && NS_MOVES[a.name]?.isSpecial && (a.total - a.timer) <= 4) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + (NS_MOVES[a.name].cost || 0))   // refund the Special that fired first
      use(s, 'light', 'heavy', 'special')
      if (start(f, 'nMode')) return 'consumed'
    } else if (early) use(s, 'light', 'heavy', 'special')
  }
  if (tryKawarimi(f, s, inp, opp)) return 'consumed'
  const a = f.attacking ? f.currentAttack : null
  if (a) {
    const t = a.total - a.timer, md = NS_MOVES[a.name] || {}, g = a.nsr || {}
    const contact = (a.hasHit && !g.noHit) || a._contact || (g.kind === 'lock' && s.lock?.res)
    // VANISH-CANCEL (costs a charge): any connected normal / special, on hit or block
    if (contact && !a.isUltimate && r && s.tapId != null && s.tapId === r.pendingAt && s.clock - s.tapClk <= BUFFER && s.usedTap !== s.tapId && !r.pending?.vdir) {
      if (canBlink(f, { cancel: true }) && startBlink(f, r.pending.dir, 0, { cancel: true })) { s.usedTap = s.tapId; ncue(f, 'vanishCancel'); return 'consumed' }
    }
    if (contact && !md.isSpecial && !a.isUltimate && t >= (a.activeStart ?? 0)) {
      if (trySpecial(f, s, inp, grounded, opp)) return 'consumed'   // any connected normal → special
      for (const b of ['light', 'heavy', 'upAttack']) {
        if (!fresh(s, b) || !grounded) continue
        let next = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded)
        if (a.name === 'light' && next === 'light') next = 'nStraight'                         // L, L
        if (a.name === 'nStraight' && (next === 'light' || next === 'nStraight')) next = heavyKey(f)   // L, L, L → Kick
        if (!(GATLING[a.name] || []).includes(next)) continue
        use(s, b)
        if (start(f, next)) return 'consumed'
      }
    }
    return a.nsr || NS_MOVES[a.name] ? 'consumed' : false
  }
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (trySpecial(f, s, inp, grounded, opp)) return 'consumed'
  if (fresh(s, 'upAttack') && grounded) { use(s, 'upAttack'); if (start(f, 'up')) return 'consumed' }
  for (const b of ['light', 'heavy']) {
    if (!fresh(s, b)) continue
    const key = normalFor(f, pressDir(s, b, inp, f.facing), b, grounded)
    use(s, b)
    if (canDo(f, key) && start(f, key)) return 'consumed'
    return 'consumed'
  }
  return 'grab'
}
