// Test-only accessor for harness/invincible*.mjs (exposed as __harness.invincibleTest; harness URLs only).
// Read-mostly: the writers (reset / move / setEnergy / cpu / setHp) only set up a scenario before real inputs drive it.
import { getAttackHitbox } from './combat.js'
import { startInvMove, clearInv, clearInvMarks, markInvCpu, startZip } from './invincibleState.js'
import { INV_MOVES, FLIGHT, IPUNCH, SKYWARD, ZIP, CRASH, NHB, TV, CSD, TIMELINE, MAX_HP, RUN_PXF, SPEED_MUL, TOP } from './invincibleData.js'
import { FLIGHT_PROFILES, isFlying, resetFlight } from './flight.js'
import { invHudLabel } from './invincibleFx.js'
export function invincibleHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { g.reset(); const P = g.world.projectileList?.(); if (P) P.length = 0; for (const f of [g.p1(), g.p2()]) { clearInv(f); clearInvMarks(f); resetFlight(f) } },
    hurt: (amount, w = 'p1', by = 'p2') => g.world.damage(raw(w), amount, { attacker: raw(by), source: 'harness-hurt' }),   // through applyScaledDamage (the real choke-point)
    move: (k, w = 'p1', o = {}) => startInvMove(raw(w), k, g.world, o),
    zip: (dir, w = 'p1') => startZip(raw(w), dir, g.world),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setHp: (h, w = 'p1') => { raw(w).health = h },
    cpu: (diff = 'normal', w = 'p1') => markInvCpu(raw(w), diff),
    shoot: (o = {}, w = 'p2') => { const f = raw(w), p = g.world.spawn(f, o.type || 'test_bolt', { speed: o.speed ?? 10, damage: o.damage ?? 40, w: 16, h: 16, ...o })
      if (p) { if (o.lifetime != null) p.lifetime = o.lifetime; if (o.y != null) p.y = o.y; if (o.x != null) p.x = o.x } return !!p },
    hud: (w = 'p1') => invHudLabel(raw(w)),
    data: () => clone({ moves: INV_MOVES, flight: FLIGHT, profile: FLIGHT_PROFILES.invincible, ipunch: IPUNCH, skyward: SKYWARD, zip: ZIP, crash: CRASH,
      nhb: NHB, tv: TV, csd: CSD, timeline: TIMELINE, maxHp: MAX_HP, runPxf: RUN_PXF, speedMul: SPEED_MUL, top: TOP }),
    projectiles: () => (g.world.projectileList?.() || []).map(p => ({ name: p.name || null, owner: p.owner?.side ?? null, x: p.x, y: p.y, vx: p.vx })),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, s = f._inv
      return { key: f.rosterKey, side: f.side, hp: f.health, maxHp: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), blocking: !!f.isBlocking, skinId: f.skinId || null, flying: !!isFlying(f), flightPhase: f._flightCtl?.phase ?? null,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, hasHit: a.hasHit, damage: a.damage, inv: a.inv ? clone(a.inv) : null } : null,
        box: getAttackHitbox(f), s: s ? clone({ ...s, cues: undefined }) : null,
        action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null, speedMul: f._invSpeed || 1, noBlock: !!f._invNoBlock, phase: f._invPhase || 0, alpha: f._invAlpha ?? 1,
        hitstun: f.hitstun || 0, hitstop: f.hitstop || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, ultimateCooldown: f.ultimateCooldown || 0,
        combo: f.comboCounter || 0, knockdown: !!f.knockdownState, invuln: f.invulnTimer || 0, wallSplat: f._wallSplat || 0, invWall: f._invWall ? clone(f._invWall) : null,
        gs: f._gs ? { inf: f._gs.inf?.lv || 0, stats: clone(f._gs.stats) } : null } } }
}
