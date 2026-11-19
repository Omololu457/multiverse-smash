// nsHarness.js — test-only window.__harness.ninjaTest API (wired from game.js by one delegate line). Never imported by sim code.
import { ninjaState, isNinja, startStreak, startVanish, startMirror, startSwap, startBarrier, startBurrow, startCloneJob, registerNinjaProfile, NINJA_PROFILES, getNinjaProfile } from './ninja.js'
import { ninjaStart, ninjaCanDo } from './ninjaCommand.js'
import { getHurtbox, getAttackPhase } from './combat.js'
import { activeProjectiles } from './abilities.js'
import { RANGER_PROFILES } from './rangers.js'

export function ninjaHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1()), other = w => (w === 'p2' ? g.p1() : g.p2())
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o))
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      return { key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, invuln: f.invulnTimer || 0, combo: f.comboCounter || 0,
        grounded: !!(f.onGround || f.grounded), knockdown: !!f.knockdownState, speed: f.speed, maxJumps: f.maxJumps, jumpCount: f.jumpCount || 0,
        action: f.spriteHandler?.currentAction || null, hurtbox: getHurtbox(f), running: f._ranger?.running || 0, s: clone(f._ninja), r: clone(f._ranger) }
    },
    raw: (w = 'p1') => pick(w),
    reset: () => {
      g.reset()
      const fs = [g.p1(), g.p2()]
      for (let i = activeProjectiles.length - 1; i >= 0; i--) if (fs.includes(activeProjectiles[i]?.owner)) activeProjectiles.splice(i, 1)
      for (const f of fs) if (f) { delete f._ninja; delete f._ranger; f._rooted = false; f.knockdownState = false; f.attacking = false; f.currentAttack = null; f.currentMove = null; f._nsBubble = null }
    },
    np: (w = 'p1', v = 100) => { const f = pick(w); const s = f && ninjaState(f); if (s) s.np = v; return s?.np },
    energy: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = v },
    set: (w = 'p1', patch = {}) => { const f = pick(w); const s = f && ninjaState(f); if (s) Object.assign(s, patch) },
    streak: (dir = 1, vdir = 0, w = 'p1') => { const f = pick(w); ninjaState(f); return startStreak(f, other(w), dir, vdir) },
    vanish: (w = 'p1', raw = {}, escape = false) => startVanish(pick(w), other(w), raw, escape),
    mirror: (w = 'p1') => startMirror(pick(w), other(w)),
    swap: (w = 'p1') => startSwap(pick(w)),
    barrier: (w = 'p1') => startBarrier(pick(w)),
    burrow: (w = 'p1') => startBurrow(pick(w)),
    clones: (w = 'p1') => { const f = pick(w); const s = ninjaState(f); if (!s) return false; return startCloneJob(f, other(w), { count: 2 }) },
    move: (key, w = 'p1') => ninjaStart(pick(w), key),
    can: (key, w = 'p1') => ninjaCanDo(pick(w), key),
    profiles: () => Object.keys(NINJA_PROFILES),
    rangerProfiles: () => Object.keys(RANGER_PROFILES),
    // Phase 8 #6: register a dummy third profile (no new code) and retag a fighter with it
    registerDummy: (id = 'ns_test', fromKey = 'ns_red') => { const p = getNinjaProfile(fromKey); registerNinjaProfile(id, { color: '#2a6cff', smoke: '#2a6cff', blink: { tapWindow: 12, run: { speed: 8.4, walk: 5.6 } }, mirror: { mode: 'decoy', counter: { kind: 'eruption', dmg: 50 } }, moves: p.moves, commands: p.commands, supers: {} }); return Object.keys(NINJA_PROFILES) },
    retag: (w = 'p1', key = 'ns_test') => { const f = pick(w); delete f._ninja; delete f._ranger; f.rosterKey = key; return isNinja(f) },
    atk: (w = 'p1') => { const f = pick(w), a = f?.currentAttack; return a ? { name: a.name, elapsed: a.total - a.timer, total: a.total, activeStart: a.activeStart, phase: getAttackPhase(f), hasHit: !!a.hasHit, nj: clone(a.nj) } : null },
    projectiles: () => activeProjectiles.map(p => ({ name: p.name, owner: p.owner === g.p1() ? 'p1' : p.owner === g.p2() ? 'p2' : '?', x: p.x, y: p.y, vx: p.vx, vy: p.vy, damage: p.damage })),
  }
}
