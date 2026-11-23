// Test-only accessor for harness/omniman_viltrum*.mjs (exposed as __harness.omnimanViltrumTest; harness URLs only).
// Read-mostly: the writers (reset / move / setEnergy / cpu / place / fly) only set up a scenario before real inputs drive it.
import { getAttackHitbox } from './combat.js'
import { startOmvMove, clearOmv, clearOmvMarks, markOmvCpu, omvSpeed, omvSpeedFrac, omvFlying, omvNoBlock } from './omnimanViltrumState.js'
import { OMV_MOVES, FLIGHT, SPEED_DMG, TOP, ACCEL, FASTEST_FLIER, BLITZ, SKYHOOK, METEOR, DIRT, UNIMPRESSED, DECREE, THINK, ESCAPE, TIMELINE } from './omnimanViltrumData.js'
import { FLIGHT_PROFILES, flightTakeoff, ensureFlightState, FLIGHT_PHASE, resetFlight } from './flight.js'
import { omvHudLabel } from './omnimanViltrumFx.js'
export function omnimanViltrumHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { g.reset(); const P = g.world.projectileList?.(); if (P) P.length = 0; for (const f of [g.p1(), g.p2()]) { clearOmv(f); clearOmvMarks(f); resetFlight(f); f._flightBrake = false } },
    move: (k, w = 'p1', o = {}) => startOmvMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    cpu: (diff = 'normal', w = 'p1') => markOmvCpu(raw(w), diff),
    place: (x, y, w = 'p1') => { const f = raw(w); f.x = x; if (y != null) f.y = y; f.vx = 0; f.vy = 0 },
    fly: (w = 'p1') => { const f = raw(w); const ok = flightTakeoff(f); const c = ensureFlightState(f); return { ok, phase: c.phase } },
    hud: (w = 'p1') => omvHudLabel(raw(w)),
    profiles: () => clone(Object.fromEntries(Object.entries(FLIGHT_PROFILES).map(([k, p]) => [k, { maxH: p.maxH, maxV: p.maxV, accel: p.accel, drag: p.drag, momentum: p.momentum || null }]))),
    data: () => clone({ moves: OMV_MOVES, flight: FLIGHT, speedDmg: SPEED_DMG, top: TOP, accel: ACCEL, fastest: FASTEST_FLIER, blitz: BLITZ, skyhook: SKYHOOK, meteor: METEOR, dirt: DIRT, unimp: UNIMPRESSED, decree: DECREE, think: THINK, escape: ESCAPE, timeline: TIMELINE }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, s = f._omv, c = f._flightCtl
      return { key: f.rosterKey, side: f.side, hp: f.health, maxHp: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), blocking: !!f.isBlocking, skinId: f.skinId || null, speed: omvSpeed(f), frac: omvSpeedFrac(f), flying: omvFlying(f), noBlock: omvNoBlock(f), brake: !!f._flightBrake,
        flight: c ? { phase: c.phase, mBraking: !!c.mBraking, mReversing: !!c.mReversing, pose: c.pose || null } : null,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, hasHit: a.hasHit, damage: a.damage, knockbackX: a.knockbackX, omv: a.omv ? clone(a.omv) : null } : null,
        box: getAttackHitbox(f), s: s ? clone({ ...s, cues: undefined }) : null, cues: s ? s.cues.map(c => typeof c === 'string' ? c : c.c) : [],
        action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        hitstun: f.hitstun || 0, hitstop: f.hitstop || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, ultimateCooldown: f.ultimateCooldown || 0,
        combo: f.comboCounter || 0, knockdown: !!f.knockdownState, wall: f._omvWall || null, wallSplat: f._wallSplat || 0, held: f._omvHeldBy ?? null } } }
}
