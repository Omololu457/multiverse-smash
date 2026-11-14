// Test-only accessor for harness/mmpr_pink*.mjs (exposed as __harness.mmprPinkTest; harness URLs only).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startPinkMove, clearMmprPink, getMmprPinkUltStatus, isMmprPinkUltActive, pinkArrows } from './mmprPinkState.js'
import { falconPos, falconHud, falconContactBox, FALCON_SORTIES } from './falconzord.js'
import { THUNDER_RESOURCE } from './mmprPinkData.js'
import { mmprPinkFxCacheSize } from './mmprPinkFx.js'
export function mmprPinkHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearMmprPink(f, g.world) },
    move: (k, w = 'p1', extra = null) => startPinkMove(raw(w), k, g.world, { extra }),
    ult: () => ({ ...getMmprPinkUltStatus(), active: isMmprPinkUltActive() }),
    fxCache: () => mmprPinkFxCacheSize(),
    state: (w = 'p1') => { const f = raw(w), so = f._falcon?.sortie
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, grounded: !!(f.onGround || f.grounded),
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, mb: f.currentAttack.mb ? { ...f.currentAttack.mb } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._mmprPink ? { ...f._mmprPink, cues: undefined } : null,
        zord: f._falcon ? { ...f._falcon, events: undefined, sortie: so ? { ...so, pos: falconPos(so), boxes: FALCON_SORTIES[so.kind].contacts.map(c => falconContactBox(so, c)) } : null } : null,
        hud: falconHud(f, THUNDER_RESOURCE),
        ranger: f._ranger ? { charges: f._ranger.charges, blink: f._ranger.blink, blinks: f._ranger.blinks } : null,
        invuln: f.invulnTimer || 0, dash: f.dashTimer || 0, skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, noDash: !!f.noDash, blocking: !!f.isBlocking,
        arrows: pinkArrows(f, g.world).map(p => ({ x: p.x, y: p.y, vx: p.vx, damage: p.damage, kind: p._pinkArrow.kind, sheet: p.sheet, bottom: p.spriteBottomY, r: p.radius })) } },
    sorties: () => JSON.parse(JSON.stringify(Object.fromEntries(['thunderLine', 'skySplitter', 'returningEdge'].map(k => [k, FALCON_SORTIES[k]])))) }
}
