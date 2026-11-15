// Test-only accessor for harness/higuruma*.mjs (exposed as __harness.higurumaTest; harness URLs only). Read-mostly: the
// only writers are reset / move / setEnergy / setCase, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startHgMove, clearHiguruma, hgState, getHigurumaUltStatus, isHigurumaUltActive, higurumaUltView, clearHigurumaUlt, precedentWindow } from './higurumaState.js'
import { HIGURUMA_MOVES, CASE, OBJECTION, ULT, TIMELINE, COST, SCALE } from './higurumaData.js'
import { higurumaFxCacheSize, higurumaHudLabel } from './higurumaFx.js'
export function higurumaHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearHigurumaUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearHiguruma(f) },
    move: (k, w = 'p1') => startHgMove(raw(w), k, g.world),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setCase: (c, token = 0, w = 'p1') => { const s = hgState(raw(w)); s.caseFile = { close: !!c.close, reach: !!c.reach, weight: !!c.weight }; s.token = token; s.pdLock = false; s.pdSerial = -1 },
    ult: () => ({ ...getHigurumaUltStatus(), active: isHigurumaUltActive() }),
    ultView: (w = 'p1') => { const v = higurumaUltView(raw(w)); return v ? { frame: v.frame, beat: v.beat, done: v.done, review: v.review } : null },
    hud: (w = 'p1') => higurumaHudLabel(raw(w)),
    pdWindow: (w = 'p1') => !!precedentWindow(raw(w)),
    fxCache: () => higurumaFxCacheSize(),
    data: () => clone({ moves: HIGURUMA_MOVES, case: CASE, objection: OBJECTION, ult: ULT, timeline: TIMELINE, cost: COST, scale: SCALE }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, maxJumps: f.maxJumps, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, hg: a.hg ? clone(a.hg) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._higuruma ? clone({ ...f._higuruma, cues: undefined }) : null,
        cues: f._higuruma ? [...f._higuruma.cues] : [], pose: f._hgPose || null, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        dashTimer: f.dashTimer || 0, dashCooldown: f.dashCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState,
        intro: !!f._introPlaying, remoteInput: !!f._higurumaRemoteInput } } }
}
