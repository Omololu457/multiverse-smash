// ninjaStormHarness.js — test-only window.__harness.nsrTest API for NINJA STORM RANGERS (wired from game.js by one
// delegate line). Never imported by sim code.
import { academyState, ACADEMY_PROFILES, swapStance, castClone, kawarimi } from './ninjaAcademy.js'
import { nsState, nsStartMove, applyStance, clearNinjaStorm, stance } from './ninjaStormState.js'
import { canDo } from './ninjaStorm.js'
import { RANGER_PROFILES } from './rangers.js'
import { getHurtbox, getAttackPhase } from './combat.js'
import { activeProjectiles } from './abilities.js'

export function ninjaStormHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1()), other = w => (w === 'p2' ? g.p1() : g.p2())
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o))
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      return { key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, invuln: f.invulnTimer || 0, combo: f.comboCounter || 0,
        grounded: !!(f.onGround || f.grounded), knockdown: !!f.knockdownState, speed: f.speed, weight: f.weight, maxJumps: f.maxJumps,
        stance: stance(f), sheet: f.animationData?.idle?.sheet || null, color: f.color, hudName: f.hudName,
        action: f.spriteHandler?.currentAction || null, hurtbox: getHurtbox(f), running: f._ranger?.running || 0,
        a: clone(f._academy), s: clone(f._nsr ? { ...f._nsr, fx: undefined } : null), r: clone(f._ranger) }
    },
    raw: (w = 'p1') => pick(w),
    reset: () => {
      g.reset()
      const fs = [g.p1(), g.p2()]
      for (let i = activeProjectiles.length - 1; i >= 0; i--) if (fs.includes(activeProjectiles[i]?.owner)) activeProjectiles.splice(i, 1)
      for (const f of fs) if (f) { clearNinjaStorm(f); f._rooted = false; f.knockdownState = false; f.attacking = false; f.currentAttack = null; f.currentMove = null }
    },
    energy: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = v },
    set: (w = 'p1', patch = {}) => { const f = pick(w); const s = f && academyState(f); if (s) Object.assign(s, patch) },
    stance: (to, w = 'p1') => { const f = pick(w); nsState(f); const ok = swapStance(f, to); if (ok) applyStance(f, to); return ok },
    clone: (w = 'p1') => { const f = pick(w); nsState(f); return castClone(f) },
    kawarimi: (w = 'p1') => kawarimi(pick(w), other(w)),
    move: (key, w = 'p1') => nsStartMove(pick(w), key),
    can: (key, w = 'p1') => canDo(pick(w), key),
    profiles: () => Object.keys(ACADEMY_PROFILES),
    rangerProfiles: () => Object.keys(RANGER_PROFILES),
    atk: (w = 'p1') => { const f = pick(w), a = f?.currentAttack; return a ? { name: a.name, elapsed: a.total - a.timer, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, phase: getAttackPhase(f), hasHit: !!a.hasHit, nsr: clone(a.nsr) } : null },
    projectiles: () => activeProjectiles.map(p => ({ name: p.name, owner: p.owner === g.p1() ? 'p1' : p.owner === g.p2() ? 'p2' : '?', x: p.x, y: p.y, vx: p.vx, vy: p.vy, damage: p.damage, nsr: p._nsr || null, echo: !!p._nsrEcho })),
  }
}
