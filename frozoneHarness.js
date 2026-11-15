// Test-only accessor for harness/frozone*.mjs (exposed as __harness.frozoneTest; harness URLs only). Read-mostly: the only
// writers are reset / move / setEnergy / chill, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startFzMove, clearFrozone, getFrozoneUltStatus, isFrozoneUltActive, frozoneUltView, clearFrozoneUlt, fzState, sideOf } from './frozoneState.js'
import { FROZONE_MOVES, CHILL, FREEZE, SHATTER, LANCE, BLACK_ICE, SKATE, ULT, TIMELINE, COST, HAND } from './frozoneData.js'
import { frozoneFxCacheSize, frozoneHudLabel, frozonePartUrl } from './frozoneFx.js'
export function frozoneHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearFrozoneUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearFrozone(f, g.world) },
    move: (k, w = 'p1', o = {}) => startFzMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    // scenario setup only: give the opponent n Chill pips from p1 (as if earlier clean hits had landed)
    chill: (n, w = 'p1') => { const f = raw(w), o = raw(w === 'p1' ? 'p2' : 'p1'), s = fzState(f); s.chill[sideOf(o)] = { n, exp: s.clock + CHILL.expire } },
    ult: () => ({ ...getFrozoneUltStatus(), active: isFrozoneUltActive() }),
    ultView: (w = 'p1') => { const v = frozoneUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => frozoneHudLabel(raw(w)),
    fxCache: () => frozoneFxCacheSize(),
    partUrl: (name, w = 'p1') => frozonePartUrl(raw(w), name),
    data: () => clone({ moves: FROZONE_MOVES, chill: CHILL, freeze: FREEZE, shatter: SHATTER, lance: LANCE, blackIce: BLACK_ICE, skate: SKATE, ult: ULT, timeline: TIMELINE, cost: COST, hand: HAND }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._fz)
      .map(p => ({ kind: p._fz.kind, frost: p._fz.frost, serial: p._fz.serial, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, damage: p.damage, life: p.lifetime ?? null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, side: sideOf(f), hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, airDashCount: f.airDashCount || 0, airDashing: !!f.airDashing,
        dashTimer: f.dashTimer || 0, dashSpeed: f.dashSpeed, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, fz: a.fz ? clone(a.fz) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._frozone ? clone({ ...f._frozone, cues: undefined }) : null,
        cues: f._frozone ? [...(f._frozone.cues || [])] : [], action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashCooldown: f.dashCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld,
        grabbed: !!f.isGrabbed, intro: !!f._introPlaying, introVariant: f._introVariant || null, remoteInput: !!f._frozoneRemoteInput, invuln: f.invulnTimer || 0 } } }
}
