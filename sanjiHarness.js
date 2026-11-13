// sanjiHarness.js — test-only window.__harness.sanjiTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { sanjiState, isSanji } from './sanjiState.js'

export function sanjiHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1())
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      const s = isSanji(f) ? JSON.parse(JSON.stringify(sanjiState(f))) : null
      return {
        key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy,
        energyName: f.traits?.energyName || f.energyConfig?.label || null,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, invuln: f.invulnTimer || 0,
        x: f.x, y: f.y, vx: f.vx, vy: f.vy, facing: f.facing, onGround: !!(f.onGround || f.grounded), dmgMul: f.damageMultiplier || 1,
        forceAction: f._forceAction || null, combo: f.comboCounter || 0, dashSpeed: f.dashSpeed, speed: f.speed,
        action: f.spriteHandler?.currentAction || null, idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null,
        skinAnimKeys: f._skinAnim ? Object.keys(f._skinAnim).length : 0,
        projectiles: g.projectiles().filter(p => p.owner === f).map(p => ({ kind: p.sanjiKind || p.name, x: p.x, y: p.y, vy: p.vy, age: p.age })),
        s,
      }
    },
    raw: (w = 'p1') => pick(w),   // the live fighter object (tests only)
    reset: () => g.reset(),
    heat: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isSanji(f)) Object.assign(sanjiState(f), patch) },
  }
}
