// Test-only accessor for harness/syndrome*.mjs (exposed as __harness.syndromeTest; harness URLs only). Read-mostly: the only
// writers are reset / move / setEnergy, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startSyMove, clearSyndrome, getSyndromeUltStatus, isSyndromeUltActive, syndromeUltView, clearSyndromeUlt } from './syndromeState.js'
import { SYNDROME_MOVES, DUET, CONVERGE, SPIN, VELO, TURRET, HAMMER, RISE, SWEEP, ZERO, ULT, TIMELINE, COST } from './syndromeData.js'
import { SYNDROME_PARTS } from './syndromeSprites.js'
import { syndromeFxCacheSize, syndromeFxCacheKeys, syndromeHudLabel, syndromePartUrl } from './syndromeFx.js'
export function syndromeHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearSyndromeUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearSyndrome(f, g.world) },
    move: (k, w = 'p1', o = {}) => startSyMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    ult: () => ({ ...getSyndromeUltStatus(), active: isSyndromeUltActive() }),
    ultView: (w = 'p1') => { const v = syndromeUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => syndromeHudLabel(raw(w)),
    fxCache: () => syndromeFxCacheSize(),
    fxCacheKeys: () => syndromeFxCacheKeys(),
    partNames: () => Object.keys(SYNDROME_PARTS),
    partUrl: (name, w = 'p1') => syndromePartUrl(raw(w), name),
    data: () => clone({ moves: SYNDROME_MOVES, duet: DUET, converge: CONVERGE, spin: SPIN, velo: VELO, turret: TURRET, hammer: HAMMER,
      rise: RISE, sweep: SWEEP, zero: ZERO, ult: ULT, timeline: TIMELINE, cost: COST }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._sy)
      .map(p => ({ type: p.type || null, kind: p._sy.kind, op: p._sy.op, n: p._sy.n, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, damage: p.damage, life: p.lifetime ?? null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, sy: a.sy ? clone(a.sy) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._syndrome ? clone({ ...f._syndrome, cues: undefined }) : null,
        cues: f._syndrome ? [...(f._syndrome.cues || [])] : [], action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashCooldown: f.dashCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld,
        grabbed: !!f.isGrabbed, intro: !!f._introPlaying, introVariant: f._introVariant || null, remoteInput: !!f._syndromeRemoteInput } } }
}
