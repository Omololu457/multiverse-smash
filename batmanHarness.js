// Test-only accessor for harness/batman*.mjs (exposed as __harness.batmanTest; harness URLs only). Read-mostly: the only
// writers are reset / move / setEnergy / order (scenario setup before driving real inputs).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startBmMove, clearBatman, bmState, getBatmanUltStatus, isBatmanUltActive, batmanUltView, clearBatmanUlt, opLegal, machineBox, batmanOwnsCharge } from './batmanState.js'
import { MOVES, FLEET, ULT, TIMELINE, COST, SCALE, GRAPNEL, BATARANG, SMOKE, CAPS } from './batmanData.js'
import { batmanFxCacheSize, batmanHudLabel } from './batmanFx.js'
export function batmanHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearBatmanUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearBatman(f) },
    move: (k, w = 'p1') => startBmMove(raw(w), k, g.world),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    legal: (k, w = 'p1') => opLegal(raw(w), k),
    ownsCharge: (w = 'p1') => batmanOwnsCharge(raw(w)),
    ult: () => ({ ...getBatmanUltStatus(), active: isBatmanUltActive() }),
    ultView: () => { const v = batmanUltView(); return v ? { frame: v.frame, phase: v.phase, sky: v.sky, plane: clone(v.plane), ty: v.target?.y, tx: v.target?.x, floor: v.floor } : null },
    hud: (w = 'p1') => batmanHudLabel(raw(w)),
    fxCache: () => batmanFxCacheSize(),
    machineBoxes: (w = 'p1') => (raw(w)._batman?.ops || []).flatMap(o => o.m.map(m => ({ k: m.k, box: machineBox(m), hp: m.hp, dead: m.dead, gone: m.gone }))),
    data: () => clone({ moves: MOVES, fleet: FLEET, ult: ULT, timeline: TIMELINE, cost: COST, scale: SCALE, grapnel: GRAPNEL, batarang: BATARANG, smoke: SMOKE, caps: CAPS }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, blocking: !!f.isBlocking, charging: !!f.isCharging,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, bm: a.bm ? clone(a.bm) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._batman ? clone({ ...f._batman, cues: undefined }) : null,
        cues: f._batman ? [...f._batman.cues] : [], pose: f._bmPose || null, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashTimer: f.dashTimer || 0, dashCooldown: f.dashCooldown || 0, dashSpeed: f.dashSpeed, dashDuration: f.dashDuration, speed: f.speed,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, intro: !!f._introPlaying, remoteInput: !!f._batmanRemoteInput } } }
}
