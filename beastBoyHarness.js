// Test-only accessor for harness/beast_boy*.mjs (exposed as __harness.beastBoyTest; harness URLs only). Read-mostly:
// the only writers are reset / move / setEnergy / setToken, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow, getHurtbox } from './combat.js'
import { startBBMove, clearBeastBoy, bbState, formOf, instinctOpen, getBeastBoyUltStatus, isBeastBoyUltActive, clearBeastBoyUlt, beastBoyLocked } from './beastBoyState.js'
import { BEAST_BOY_MOVES, ULT, TIMELINE, HURTBOX, WILD_CHAIN, INSTINCT, COST } from './beastBoyData.js'
import { beastBoyFxCacheSize, beastBoyHudLabel } from './beastBoyFx.js'
export function beastBoyHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { clearBeastBoyUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearBeastBoy(f) },
    move: (k, w = 'p1') => startBBMove(raw(w), k, g.world),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setToken: (on = true, w = 'p1') => { const s = bbState(raw(w)); s.inst.token = !!on; s.inst.seen = {} },
    ult: () => ({ ...getBeastBoyUltStatus(), active: isBeastBoyUltActive() }),
    hud: (w = 'p1') => beastBoyHudLabel(raw(w)),
    fxCache: () => beastBoyFxCacheSize(),
    locked: (w = 'p1') => beastBoyLocked(raw(w), null),
    data: () => JSON.parse(JSON.stringify({ moves: BEAST_BOY_MOVES, ult: ULT, timeline: TIMELINE, hurtbox: HURTBOX, wildChain: WILD_CHAIN, instinct: INSTINCT, cost: COST })),
    state: (w = 'p1') => { const f = raw(w)
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, blocking: !!f.isBlocking, dashTimer: f.dashTimer || 0,
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, damage: f.currentAttack.damage, bb: f.currentAttack.bb ? { ...f.currentAttack.bb } : null } : null,
        form: formOf(f), instinctOpen: instinctOpen(f), cancel: getCancelWindow(f), box: getAttackHitbox(f), hurt: getHurtbox(f),
        s: f._beastBoy ? JSON.parse(JSON.stringify({ ...f._beastBoy, cues: undefined })) : null, cues: f._beastBoy ? [...f._beastBoy.cues] : [],
        land: f._bbLand || 0, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null, skin: f.skinId || null, tag: f._recolorTag || null,
        hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, combo: f.comboCounter || 0, juggle: f.juggleCount || 0,
        knockdown: !!f.knockdownState, invuln: f.invulnTimer || 0 } } }
}
