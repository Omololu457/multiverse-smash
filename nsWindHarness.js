// MSV1 — test-only accessor for harness/msv1_*.mjs (exposed as __harness.nsWindTest; harness URLs only).
import { getAttackHitbox } from './combat.js'
import { startNsMove } from './nsWind.js'
import { ninjaState, clearNinja, startStreak, startVanish, startMirror, startSwap, startBarrier, startBurrow, spawnClone, plantTrap, getNinjaProfile, registerNinjaProfile, isNinja } from './ninja.js'
import { NS_MOVES, SEQS, SHOTS } from './nsWindData.js'
export function nsWindHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const opp = w => raw(w === 'p2' ? 'p1' : 'p2')
  const clean = o => JSON.parse(JSON.stringify(o, (k, v) => k === 'cues' ? undefined : v))
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearNinja(f, g.world) },
    move: (k, w = 'p1') => startNsMove(raw(w), k, g.world, { cancel: true }),
    streak: (dir, vdir = 0, w = 'p1') => startStreak(raw(w), dir, vdir, g.world, opp(w)),
    vanish: (up = false, w = 'p1') => startVanish(raw(w), opp(w), { up }, g.world),
    mirror: (w = 'p1') => startMirror(raw(w), opp(w), g.world),
    swap: (w = 'p1') => startSwap(raw(w), g.world),
    barrier: (w = 'p1') => startBarrier(raw(w), g.world),
    burrow: (w = 'p1') => startBurrow(raw(w), g.world),
    clone: (spec, w = 'p1') => spawnClone(raw(w), spec, g.world),
    trap: (x, w = 'p1') => plantTrap(raw(w), x, g.world),
    setNP: (n, w = 'p1') => { ninjaState(raw(w)).np = n },
    // DUMMY THIRD PROFILE: proves ninja.js is profile-agnostic (no Shane/Dustin names inside the framework)
    registerDummy: (id = 'msv1_dummy') => !!registerNinjaProfile(id, { color: '#808080', smoke: '#808080', streak: { air: null }, mirror: { mode: 'decoy', moves: {} } }),
    isNinja: (w = 'p1') => isNinja(raw(w)),
    profile: (w = 'p1') => clean(getNinjaProfile(raw(w)) || null),
    data: () => clean({ moves: NS_MOVES, SEQS, SHOTS }),
    state: (w = 'p1') => { const f = raw(w)
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), move: f.currentMove || null, speed: f.stats?.speed ?? f.speed, maxJumps: f.maxJumps ?? f.stats?.maxJumps,
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, nj: !!f.currentAttack.nj } : null,
        box: getAttackHitbox(f), s: f._ninja ? clean(f._ninja) : null, cues: f._ninja ? [...f._ninja.cues] : [],
        ranger: f._ranger ? { running: f._ranger.running, pending: f._ranger.pending, pendingAt: f._ranger.pendingAt, tick: f._ranger.tick, blink: !!f._ranger.blink } : null,
        invuln: f.invulnTimer || 0, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, knockdown: !!f.knockdownState, combo: f.comboCounter || 0, hidden: f._ninjaHidden || 0 } } }
}
