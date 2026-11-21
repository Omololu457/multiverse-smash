// Test-only accessor for harness/gojo_shinjuku*.mjs (exposed as __harness.gojoShinjukuTest; harness URLs only).
// Read-mostly: the writers (reset / move / setCe / setInfinity / setEnergy / debug) only set up a scenario before real
// inputs drive the match.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startGsMove, clearGs, clearGsMarks, gsState, markGsCpu } from './gojoShinjukuState.js'
import { GS_MOVES, INFINITY, CE_UNIT, CHANT, CHANT_FIRE, DOMAIN, COST, TIMELINE } from './gojoShinjukuData.js'
import { gsHudLabel, setGsInfinityDebug } from './gojoShinjukuFx.js'
export function gojoShinjukuHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o, (k, v) => (k === '_W' ? undefined : v)))
  return { raw,
    reset: () => { g.reset(); const P = g.world.projectileList?.(); if (P) P.length = 0; for (const f of [g.p1(), g.p2()]) { clearGs(f); clearGsMarks(f) } },
    move: (k, w = 'p1', o = {}) => startGsMove(raw(w), k, g.world, o),
    setCe: (n, w = 'p1') => { gsState(raw(w)).ce = Math.round(n * CE_UNIT) },
    setInfinity: (lv, w = 'p1') => { gsState(raw(w)).inf.lv = lv },
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    cpu: (diff = 'normal', w = 'p1') => markGsCpu(raw(w), diff),
    debug: on => setGsInfinityDebug(on),
    shoot: (o = {}, w = 'p2') => { const f = raw(w), p = g.world.spawn(f, o.type || 'test_bolt', { speed: o.speed ?? 10, damage: o.damage ?? 40, w: 16, h: 16, ...o })
      if (p) { if (o.super) p.isUltimate = true; if (o.lifetime != null) p.lifetime = o.lifetime; if (o.y != null) p.y = o.y } return !!p },
    hud: (w = 'p1') => gsHudLabel(raw(w)),
    data: () => clone({ moves: GS_MOVES, infinity: INFINITY, chant: CHANT, chantFire: CHANT_FIRE, domain: DOMAIN, cost: COST, timeline: TIMELINE }),
    projectiles: () => (g.world.projectileList?.() || []).map(p => ({ name: p.name || null, owner: p.owner?.side ?? null, x: p.x, y: p.y, vx: p.vx, vy: p.vy,
      ts: p.timeScale ?? 1, hang: p._gsHang ?? null, refl: !!p._gsReflected, super: !!(p.isUltimate || p.isSuper) })),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, s = f._gs
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), blocking: !!f.isBlocking, charging: !!f.isCharging,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, gs: a.gs ? clone(a.gs) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: s ? clone({ ...s, cues: undefined }) : null, ce: s ? s.ce / CE_UNIT : null,
        inf: s ? s.inf.lv : 0, cues: s ? s.cues.map(c => typeof c === 'string' ? c : c.c) : [], action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, combo: f.comboCounter || 0, knockdown: !!f.knockdownState,
        grabbed: !!f.isGrabbed, frozen: !!f.domainFrozen, techBurnout: f._gsTechBurnout || 0, sawInfinity: f._gsSawInfinity ?? null, remoteInput: !!f._gsRemoteInput } } }
}
