// Test-only accessor for harness/megumi*.mjs (exposed as __harness.megumiTest; harness URLs only). Read-mostly: the only
// writers are reset / move / setEnergy / setRoute, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startMgMove, clearMegumi, getMegumiUltStatus, isMegumiUltActive, megumiUltView, clearMegumiUlt } from './megumiState.js'
import { MEGUMI_MOVES, DOG, TOAD, PULL, NUE, AIRNUE, RABBIT, SERPENT, ELEPHANT, STEP, ROUTE, KON, ULT, TIMELINE, COST } from './megumiData.js'
import { megumiFxCacheSize, megumiHudLabel } from './megumiFx.js'
export function megumiHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearMegumiUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearMegumi(f, g.world) },
    move: (k, w = 'p1', o = {}) => startMgMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setRoute: (n, w = 'p1') => { const f = raw(w); if (f._megumi) f._megumi.route.stocks = n },
    ult: () => ({ ...getMegumiUltStatus(), active: isMegumiUltActive() }),
    ultView: (w = 'p1') => { const v = megumiUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => megumiHudLabel(raw(w)),
    fxCache: () => megumiFxCacheSize(),
    data: () => clone({ moves: MEGUMI_MOVES, dog: DOG, toad: TOAD, pull: PULL, nue: NUE, airNue: AIRNUE, rabbit: RABBIT, serpent: SERPENT,
      elephant: ELEPHANT, step: STEP, route: ROUTE, kon: KON, ult: ULT, timeline: TIMELINE, cost: COST }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._mg)
      .map(p => ({ name: p.name || null, kind: p._mg.kind, n: p._mg.n, owner: p._mg.owner, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, damage: p.damage, life: p.lifetime ?? null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, mg: a.mg ? clone(a.mg) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._megumi ? clone({ ...f._megumi, cues: undefined }) : null,
        cues: f._megumi ? [...f._megumi.cues] : [], action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashCooldown: f.dashCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld,
        intro: !!f._introPlaying, introVariant: f._introVariant || null, remoteInput: !!f._megumiRemoteInput } } }
}
