// buggyHarness.js — test-only window.__harness.buggyTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { buggyState, isBuggy } from './buggyState.js'
import { getActiveDrones, damageDrone, activeDrones } from './drones.js'
import { launchHand, stabHand, plantLegs, lookout, recallParts } from './buggyParts.js'
import { buggyPipState } from './buggyFx.js'

const partView = d => ({ type: d.type, st: d.data?.st || null, x: Math.round(d.x), y: Math.round(d.y), hp: d.hp, maxHp: d.maxHp, dying: !!d.dying,
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
    reset: () => {   // training reset + drop Buggy's parts / part cooldowns (tests start from a whole body)
      g.reset()
      for (let i = activeDrones.length - 1; i >= 0; i--) if (activeDrones[i].profile?.buggyPart) activeDrones.splice(i, 1)
      for (const f of [g.p1(), g.p2()]) if (f?._gaDroneCd) for (const k of Object.keys(f._gaDroneCd)) if (k.startsWith('buggy_')) f._gaDroneCd[k] = 0
    },
    chop: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isBuggy(f)) Object.assign(buggyState(f), patch) },
    parts: () => getActiveDrones().map(partView),
    // Part actions (the Phase 5 command layer binds these to inputs).
    hand: (w = 'p1') => !!launchHand(pick(w)), stab: (w = 'p1') => stabHand(pick(w)), legs: (w = 'p1') => !!plantLegs(pick(w)),
    head: (w = 'p1') => !!lookout(pick(w)), recall: (w = 'p1') => recallParts(pick(w)),
    hitPart: (type, n, w = 'p1') => { const d = getActiveDrones().find(x => x.owner === pick(w) && x.type === type && !x.dying); return d ? damageDrone(d, n, null) : false },
  }
}
