// Test-only accessor for harness/sukuna_shinjuku*.mjs (exposed as __harness.sukunaShinjukuTest; harness URLs only).
// Read-mostly: the writers (reset / move / setEnergy / cpu / ice / trap) only set up a scenario before real inputs drive it.
import { getAttackHitbox } from './combat.js'
import { clearDomains, activeDomains } from './domains.js'
import { startSksMove, clearSks, clearSksMarks, sksState, markSksCpu } from './sukunaShinjukuState.js'
import { SKS_MOVES, COST, DISMANTLE, CLEAVE, WEB, FUGA, AMP, WORLD, SHRINE, TIMELINE } from './sukunaShinjukuData.js'
import { sksHudLabel } from './sukunaShinjukuFx.js'
export function sukunaShinjukuHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { g.reset(); clearDomains(); const P = g.world.projectileList?.(); if (P) P.length = 0; for (const f of [g.p1(), g.p2()]) { clearSks(f); clearSksMarks(f) } },
    move: (k, w = 'p1', o = {}) => startSksMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    cpu: (diff = 'normal', w = 'p1') => markSksCpu(raw(w), diff),
    shoot: (o = {}, w = 'p2') => { const f = raw(w), p = g.world.spawn(f, o.type || 'test_bolt', { speed: o.speed ?? 10, damage: o.damage ?? 40, w: 16, h: 16, ...o })
      if (p) { if (o.super) p.isUltimate = true; if (o.lifetime != null) p.lifetime = o.lifetime; if (o.y != null) p.y = o.y } return !!p },
    domains: () => activeDomains.map(d => ({ owner: d.owner?.side, rosterKey: d.rosterKey, timer: d.timer, background: d.background, priority: d.priority, range: d.range })),
    hud: (w = 'p1') => sksHudLabel(raw(w)),
    data: () => clone({ moves: SKS_MOVES, cost: COST, dismantle: DISMANTLE, cleave: CLEAVE, web: WEB, fuga: FUGA, amp: AMP, world: WORLD, shrine: SHRINE, timeline: TIMELINE }),
    projectiles: () => (g.world.projectileList?.() || []).map(p => ({ name: p.name || null, owner: p.owner?.side ?? null, x: p.x, y: p.y, vx: p.vx, super: !!(p.isUltimate || p.isSuper) })),
    patches: () => (g.world.patches?.() || []).map(({ owner, patch }) => ({ owner: owner?.side, type: patch.type, x: patch.x, width: patch.width, floor: patch.floor, disc: !!patch.disc })),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, s = f._sks
      return { key: f.rosterKey, side: f.side, hp: f.health, maxHp: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), blocking: !!f.isBlocking, skinId: f.skinId || null,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, hasHit: a.hasHit, damage: a.damage, sks: a.sks ? clone(a.sks) : null } : null,
        box: getAttackHitbox(f), s: s ? clone({ ...s, cues: undefined }) : null, cues: s ? s.cues.map(c => typeof c === 'string' ? c : c.c) : [],
        action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null, amp: f._sksAmp || 0, burn: f._sksBurn || 0,
        hitstun: f.hitstun || 0, hitstop: f.hitstop || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, ultimateCooldown: f.ultimateCooldown || 0,
        combo: f.comboCounter || 0, knockdown: !!f.knockdownState, frozen: !!f.domainFrozen, untouchable: !!f.domainUntouchable, techBurnout: f._gsTechBurnout || 0,
        gs: f._gs ? { inf: f._gs.inf?.lv || 0, clash: !!f._gs.clash, lastClash: f._gs.lastClash || null, stats: clone(f._gs.stats) } : null } } }
}
