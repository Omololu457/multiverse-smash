// Test-only accessor for harness/elastigirl*.mjs (exposed as __harness.elastigirlTest; harness URLs only). Read-mostly:
// the only writers are reset / move / setEnergy / sling (scenario setup before driving real inputs).
import { getAttackHitbox, getHurtbox, getCancelWindow } from './combat.js'
import { startEgMove, clearElastigirl, egState, startSling, startParachute, elastigirlSnapshot, motionMatch } from './elastigirlState.js'
import * as D from './elastigirlData.js'
import { elastigirlFxCacheSize } from './elastigirlFx.js'
export function elastigirlHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o ?? null))
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearElastigirl(f) },
    move: (k, w = 'p1') => startEgMove(raw(w), k, g.world),
    sling: (w = 'p1') => startSling(raw(w)),
    parachute: (w = 'p1') => startParachute(raw(w)),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    motion: (m, win, w = 'p1') => motionMatch(egState(raw(w)), m, win),
    snapshot: (w = 'p1') => clone(elastigirlSnapshot(raw(w))),
    fxCache: () => elastigirlFxCacheSize(),
    data: () => clone({ moves: D.EG_MOVES, stats: D.EG_STATS, energy: D.EG_ENERGY, sling: D.SLINGSHOT, rubber: D.RUBBER_BODY, para: D.PARACHUTE,
      guard: D.STRETCH_GUARD || null, bounce: D.BOUNCE_BACK || null, inputs: D.EG_INPUTS, lockout: D.ULT_LOCKOUT }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), blocking: !!f.isBlocking, invuln: f.invulnTimer || 0,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, hitLevel: a.hitLevel || null, eg: clone(a.eg) } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), hurt: getHurtbox(f), s: f._elastigirl ? clone({ ...f._elastigirl, cues: undefined }) : null,
        cues: f._elastigirl ? [...f._elastigirl.cues] : [], swinging: !!f._swinging, sw: f._swinging ? { ax: f._swAX, ay: f._swAY, L: f._swL } : null,
        cast: f._spriteCastMove || null, action: f.spriteHandler?.currentAction || null, frame: f.spriteHandler?.frameIndex ?? null,
        skin: f.skinId || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        combo: f.comboCounter || 0, knockdown: !!f.knockdownState, remoteInput: !!f._elastigirlRemoteInput, speed: f.speed, dashSpeed: f.dashSpeed } } }
}
