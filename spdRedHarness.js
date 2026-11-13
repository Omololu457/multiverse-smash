// spdRedHarness.js — test-only window.__harness.spdRedTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { spdRedState, isSpdRed } from './spdRedState.js'
import { spdRedHudState } from './spdRedFx.js'
import { getHurtbox, getAttackPhase } from './combat.js'
import { activeProjectiles } from './abilities.js'
import { ensureRangerState, startBlink, judgmentBegin, RANGER_PROFILES } from './rangers.js'

export function spdRedHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1())
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      return {
        key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy,
        energyName: f.traits?.energyName || f.energyConfig?.label || null,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, invuln: f.invulnTimer || 0,
        x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, combo: f.comboCounter || 0, blocking: !!f.isBlocking,
        grounded: !!(f.onGround || f.grounded), knockdown: !!f.knockdownState, hitstop: f.hitstop || 0,
        speed: f.speed, baseSpeed: f.baseSpeed, dashSpeed: f.dashSpeed, jumpForce: f.jumpForce, noDash: !!f.noDash, maxJumps: f.maxJumps,
        action: f.spriteHandler?.currentAction || null, spriteScale: f.spriteScale,
        idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null,
        hurtbox: getHurtbox(f),
        hud: isSpdRed(f) ? spdRedHudState(f) : null,
        s: isSpdRed(f) ? JSON.parse(JSON.stringify(spdRedState(f))) : null,
        r: f._ranger ? JSON.parse(JSON.stringify(f._ranger)) : null,
      }
    },
    raw: (w = 'p1') => pick(w),
    reset: () => {
      g.reset()
      const fs = [g.p1(), g.p2()]
      for (let i = activeProjectiles.length - 1; i >= 0; i--) if (fs.includes(activeProjectiles[i]?.owner)) activeProjectiles.splice(i, 1)   // no leftover bolts between scenarios
      for (const f of fs) if (f) { delete f._spdRed; delete f._ranger; f._rooted = false; f.knockdownState = false; f.attacking = false; f.currentAttack = null; f.currentMove = null }
    },
    delta: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isSpdRed(f)) Object.assign(spdRedState(f), patch) },
    ranger: (w = 'p1', patch = {}) => { const f = pick(w); const r = f && ensureRangerState(f); if (r) Object.assign(r, patch); return r ? JSON.parse(JSON.stringify(r)) : null },
    judg: (w = 'p1', patch = {}) => { const f = pick(w); const r = f && ensureRangerState(f); if (r?.judg) Object.assign(r.judg, patch); return r?.judg ? { ...r.judg } : null },
    blink: (dir = 1, w = 'p1') => { const f = pick(w); ensureRangerState(f); return startBlink(f, dir) },
    judge: (w = 'p1') => { const f = pick(w), o = w === 'p2' ? g.p1() : g.p2(); return judgmentBegin(f, o) },
    profiles: () => Object.keys(RANGER_PROFILES),
    atk: (w = 'p2') => { const f = pick(w), a = f?.currentAttack; return a ? { name: a.name, elapsed: a.total - a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, phase: getAttackPhase(f), buff: !!a._dodgeBuff } : null },
  }
}
