// zoroHarness.js — test-only window.__harness.zoroTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { zoroState, isZoro } from './zoroState.js'

export function zoroHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1())
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      const s = isZoro(f) ? JSON.parse(JSON.stringify(zoroState(f))) : null
      return {
        key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy,
        energyName: f.traits?.energyName || f.energyConfig?.label || null,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, invuln: f.invulnTimer || 0,
        x: f.x, y: f.y, facing: f.facing, dmgMul: f.damageMultiplier || 1, form: f.currentForm || null,
        santoryu: !!s?.santoryu, santoryuTimer: s?.santoryuTimer || 0, santoryuCd: s?.santoryuCd || 0,
        forceAction: f._forceAction || null, combo: f.comboCounter || 0,
        idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null,
        projectiles: g.projectiles().filter(p => p.owner === f).map(p => ({ kind: p.zoroKind || p.name, x: p.x, y: p.y, age: p.age })),
        z: s,
      }
    },
    reset: () => g.reset(),
    spirit: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isZoro(f)) Object.assign(zoroState(f), patch) },
  }
}
