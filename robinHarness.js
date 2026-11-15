// Test-only accessor for harness/robin*.mjs (exposed as __harness.robinTest; harness URLs only). Read-mostly: the only
// writers are reset / move / setEnergy, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startRbMove, clearRobin, rbState, getRobinUltStatus, isRobinUltActive, robinUltView, clearRobinUlt, inOwnSmoke } from './robinState.js'
import { ROBIN_MOVES, SMOKE, STEP, BOMB, BLAST, PLANT, REMOTE, ULT, TIMELINE, COST } from './robinData.js'
import { robinFxCacheSize, robinHudLabel } from './robinFx.js'
export function robinHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearRobinUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearRobin(f, g.world) },
    move: (k, w = 'p1') => startRbMove(raw(w), k, g.world),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    ult: () => ({ ...getRobinUltStatus(), active: isRobinUltActive() }),
    ultView: (w = 'p1') => { const v = robinUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => robinHudLabel(raw(w)),
    inSmoke: (w = 'p1') => inOwnSmoke(raw(w)),
    fxCache: () => robinFxCacheSize(),
    data: () => clone({ moves: ROBIN_MOVES, smoke: SMOKE, step: STEP, bomb: BOMB, blast: BLAST, plant: PLANT, remote: REMOTE, ult: ULT, timeline: TIMELINE, cost: COST }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && (p._rb || p.name === 'robin_blast' || p.name === 'robin_bomb'))
      .map(p => ({ name: p.name || null, kind: p._rb?.kind || null, n: p._rb?.n ?? null, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, damage: p.damage,
        sheet: p.sheet || null, visualOnly: !!p.visualOnly, life: p.lifetime ?? null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, rb: a.rb ? clone(a.rb) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._robin ? clone({ ...f._robin, cues: undefined }) : null,
        cues: f._robin ? [...f._robin.cues] : [], land: f._rbLand || 0, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashCooldown: f.dashCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld,
        intro: !!f._introPlaying, remoteInput: !!f._robinRemoteInput } } }
}
