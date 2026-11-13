// buggyHarness.js — test-only window.__harness.buggyTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { buggyState, isBuggy } from './buggyState.js'
import { getActiveDrones } from './drones.js'
import { buggyPipState } from './buggyFx.js'

const partView = d => ({ type: d.type, x: Math.round(d.x), y: Math.round(d.y), hp: d.hp, maxHp: d.maxHp, dying: !!d.dying,
  retiring: d._retiring || false, state: d.data?.st || null, side: d.owner?.side || null })

export function buggyHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1())
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      const s = isBuggy(f) ? JSON.parse(JSON.stringify(buggyState(f))) : null
      return {
        key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy,
        energyName: f.traits?.energyName || f.energyConfig?.label || null,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, invuln: f.invulnTimer || 0,
        x: f.x, y: f.y, facing: f.facing, combo: f.comboCounter || 0, blocking: !!f.isBlocking,
        speed: f.speed, dashSpeed: f.dashSpeed, jumpForce: f.jumpForce,
        action: f.spriteHandler?.currentAction || null,
        idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null,
        idleSourceY: (f._skinAnim || f.animationData)?.idle?.sourceY || 0,
        pips: isBuggy(f) ? buggyPipState(f) : null,
        parts: getActiveDrones().filter(d => d.owner === f).map(partView),
        projectiles: g.projectiles().filter(p => p.owner === f).map(p => ({ kind: p.buggyKind || p.name, x: p.x, y: p.y, age: p.age, dmg: p.damage })),
        b: s,
      }
    },
    raw: (w = 'p1') => pick(w),   // the live fighter object (tests only)
    reset: () => g.reset(),
    chop: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isBuggy(f)) Object.assign(buggyState(f), patch) },
    parts: () => getActiveDrones().map(partView),
  }
}
