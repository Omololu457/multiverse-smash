// Test-only accessor for harness/green_ranger*.mjs (exposed as __harness.greenRangerTest; harness URLs only).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startGreenMove, clearGreen, greenState, dragonCallReady } from './greenRangerState.js'
import { zordUltCineStatus, isZordUltCineActive, zordOpenerBox, ZORD_ULT_OPTIN, ZORD_ULT_SEQUENCES } from './rangerZordUltimate.js'
import { greenFxCacheSize } from './greenRangerFx.js'
export function greenRangerHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearGreen(f, g.world) },
    move: (k, w = 'p1') => startGreenMove(raw(w), k, g.world, {}),
    set: (w, o) => { const f = raw(w); const s = greenState(f); for (const [k, v] of Object.entries(o)) { if (k in s) s[k] = v; else f[k] = v } return true },
    callReady: (w = 'p1') => dragonCallReady(raw(w)),
    ult: () => ({ ...zordUltCineStatus(), active: isZordUltCineActive() }),
    optIns: () => Object.keys(ZORD_ULT_OPTIN), sequences: () => Object.keys(ZORD_ULT_SEQUENCES),
    fxCache: () => greenFxCacheSize(),
    state: (w = 'p1') => { const f = raw(w), z = f._zordUlt
      return { key: f.rosterKey, hp: f.health, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, grounded: !!(f.onGround || f.grounded),
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, gm: f.currentAttack.gm ? { ...f.currentAttack.gm } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._greenRanger ? { ...f._greenRanger, cues: undefined } : null,
        zord: z ? { ...z, box: z.tx != null ? zordOpenerBox(z) : null } : null,
        invuln: f.invulnTimer || 0, skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, blocking: !!f.isBlocking,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, charging: !!f.isCharging, spriteAction: f.sprite?.currentAction || f._spriteAction || null,
        shots: g.world.projectiles.filter(p => p.owner === f && p._green).map(p => ({ kind: p._green.kind, k: p._green.k ?? 0, x: p.x, y: p.y, vx: p.vx, damage: p.damage, sheet: p.sheet, life: p.lifetime })) } } }
}
