// Test-only accessor for harness/raven*.mjs (exposed as __harness.ravenTest; harness URLs only). Read-mostly: the
// only writers are reset / move / setEnergy / setShellCd, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startRvMove, clearRaven, ravenState, getRavenUltStatus, isRavenUltActive, ravenUltView, clearRavenUlt, GRAVITY } from './ravenState.js'
import { RAVEN_MOVES, LEV, ORB, PILE, BRICK, VERDICT, SHELL, ULT, TIMELINE } from './ravenData.js'
import { ravenFxCacheSize, ravenHudLabel } from './ravenFx.js'
export function ravenHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw, gravity: GRAVITY,
    reset: () => { clearRavenUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearRaven(f, g.world) },
    move: (k, w = 'p1', extra = null) => startRvMove(raw(w), k, g.world, { extra }),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setShellCd: (n, w = 'p1') => { ravenState(raw(w)).shellCd = n },
    ult: () => ({ ...getRavenUltStatus(), active: isRavenUltActive() }),
    ultView: (w = 'p1') => { const v = ravenUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => ravenHudLabel(raw(w)),
    fxCache: () => ravenFxCacheSize(),
    data: () => clone({ moves: RAVEN_MOVES, lev: LEV, orb: ORB, pile: PILE, brick: BRICK, verdict: VERDICT, shell: SHELL, ult: ULT, timeline: TIMELINE }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._rv).map(p => ({ kind: p._rv.kind, n: p._rv.n, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, damage: p.damage, sheet: p.sheet || null, infusedFrom: p._rv.infusedFrom || null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, rv: a.rv ? clone(a.rv) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._raven ? clone({ ...f._raven, cues: undefined }) : null,
        cues: f._raven ? [...f._raven.cues] : [], pose: f._rvPose || null, land: f._rvLand || 0, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld } } }
}
