// Test-only accessor for harness/starfire*.mjs (exposed as __harness.starfireTest; harness URLs only). Read-mostly: the
// only writers are reset / move / setEnergy / eyeDebug, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow, getHurtbox } from './combat.js'
import { startSfMove, clearStarfire, starfireState, getStarfireUltStatus, isStarfireUltActive, starfireUltView, clearStarfireUlt, GRAVITY,
  eyeWorld, cellToWorld, timelineFrame, starfireLiveLaser } from './starfireState.js'
import { STARFIRE_MOVES, LEV, BOLT, ORB, LASER, RUSH, SKY, ULT, TIMELINE, GSCALE, CELL } from './starfireData.js'
import { STARFIRE_EYES } from './starfireEyes.js'
import { starfireFxCacheSize, starfireHudLabel, setStarfireEyeDebug } from './starfireFx.js'
export function starfireHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw, gravity: GRAVITY, gscale: GSCALE,
    reset: () => { clearStarfireUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearStarfire(f, g.world) },
    move: (k, w = 'p1', extra = null) => startSfMove(raw(w), k, g.world, { extra }),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    eyeDebug: on => setStarfireEyeDebug(on),
    ult: () => ({ ...getStarfireUltStatus(), active: isStarfireUltActive() }),
    ultView: (w = 'p1') => { const v = starfireUltView(raw(w)); return v ? clone(v) : null },
    hud: (w = 'p1') => starfireHudLabel(raw(w)),
    fxCache: () => starfireFxCacheSize(),
    data: () => clone({ moves: STARFIRE_MOVES, lev: LEV, bolt: BOLT, orb: ORB, laser: LASER, rush: RUSH, sky: SKY, ult: ULT, timeline: TIMELINE, cell: CELL }),
    eyes: () => clone(STARFIRE_EYES),
    eyeWorld: (action, frame, w = 'p1') => clone(eyeWorld(raw(w), action, frame)),
    cellToWorld: (u, v, w = 'p1') => cellToWorld(raw(w), u, v),
    timelineFrame: (action, el) => timelineFrame(action, el),
    laser: (w = 'p1') => { const l = starfireLiveLaser(raw(w)); return l ? clone(l) : null },
    hurtbox: (w = 'p2') => clone(getHurtbox(raw(w))),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._sf).map(p => ({ kind: p._sf.kind, n: p._sf.n, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, damage: p.damage, sheet: p.sheet || null, from: p._sf.from || null })),
    allProjectiles: () => (g.world.projectiles || []).length,
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, sf: a.sf ? clone(a.sf) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._starfire ? clone({ ...f._starfire, cues: undefined }) : null,
        cues: f._starfire ? [...f._starfire.cues] : [], pose: f._sfPose || null, land: f._sfLand || 0, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        draw: f._lastDrawX == null ? null : { x: f._lastDrawX, y: f._lastDrawY, w: f._lastDrawW, h: f._lastDrawH },
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, jumpHeld: !!f.jumpHeld, spriteScale: f.spriteScale ?? null } } }
}
