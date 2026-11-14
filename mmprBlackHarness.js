// Test-only accessor for harness/mmpr_black*.mjs (exposed as __harness.mmprBlackTest; harness URLs only).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startBlackMove, clearMmprBlack, getMmprBlackUltStatus, isMmprBlackUltActive } from './mmprBlackState.js'
import { falconPos, falconHud, FALCON_SORTIES } from './falconzord.js'
import { FALCON_RESOURCE } from './mmprBlackData.js'
import { mmprBlackFxCacheSize } from './mmprBlackFx.js'
export function mmprBlackHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearMmprBlack(f, g.world) },
    move: (k, w = 'p1', extra = null) => startBlackMove(raw(w), k, g.world, { extra }),
    ult: () => ({ ...getMmprBlackUltStatus(), active: isMmprBlackUltActive() }),
    fxCache: () => mmprBlackFxCacheSize(),
    state: (w = 'p1') => { const f = raw(w), so = f._falcon?.sortie
      return { key: f.rosterKey, hp: f.health, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, grounded: !!(f.onGround || f.grounded),
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, mb: f.currentAttack.mb ? { ...f.currentAttack.mb } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._mmprBlack ? { ...f._mmprBlack, cues: undefined } : null,
        falcon: f._falcon ? { ...f._falcon, events: undefined, sortie: so ? { ...so, pos: falconPos(so) } : null } : null, hud: falconHud(f, FALCON_RESOURCE),
        ranger: f._ranger ? { charges: f._ranger.charges, blink: f._ranger.blink, blinks: f._ranger.blinks } : null,
        invuln: f.invulnTimer || 0, dash: f.dashTimer || 0, skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, noDash: !!f.noDash,
        shots: g.world.projectiles.filter(p => p.owner === f && p._falcon).map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, damage: p.damage, sheet: p.sheet })) } },
    sorties: () => JSON.parse(JSON.stringify(FALCON_SORTIES)) }
}
