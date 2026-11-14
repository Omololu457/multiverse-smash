// Test-only accessor for harness/mmpr_white*.mjs (exposed as __harness.mmprWhiteTest; harness URLs only).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startWhiteMove, clearMmprWhite, getMmprWhiteUltStatus, isMmprWhiteUltActive, grantDiscipline, mmprWhiteState } from './mmprWhiteState.js'
import { falconPos, falconHud, falconContactBox, FALCON_SORTIES } from './falconzord.js'
import { NINJA_RESOURCE } from './mmprWhiteData.js'
import { mmprWhiteFxCacheSize } from './mmprWhiteFx.js'
export function mmprWhiteHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearMmprWhite(f, g.world) },
    move: (k, w = 'p1', extra = null) => startWhiteMove(raw(w), k, g.world, { extra }),
    grant: (d, w = 'p1') => grantDiscipline(raw(w), d),
    giveToken: (w = 'p1') => { const s = mmprWhiteState(raw(w)); s.coll = null; s.token = { t: 240, order: ['test'] } },
    ult: () => ({ ...getMmprWhiteUltStatus(), active: isMmprWhiteUltActive() }),
    fxCache: () => mmprWhiteFxCacheSize(),
    state: (w = 'p1') => { const f = raw(w), so = f._falcon?.sortie, P = so && FALCON_SORTIES[so.kind]
      return { key: f.rosterKey, hp: f.health, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, grounded: !!(f.onGround || f.grounded),
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, mw: f.currentAttack.mw ? { ...f.currentAttack.mw } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._mmprWhite ? JSON.parse(JSON.stringify({ ...f._mmprWhite, cues: undefined })) : null,
        falcon: f._falcon ? { ...f._falcon, events: undefined, sortie: so ? { ...so, pos: falconPos(so), boxes: P.contacts.map(c => falconContactBox(so, c)) } : null } : null, hud: falconHud(f, NINJA_RESOURCE),
        ranger: f._ranger ? { charges: f._ranger.charges, blink: f._ranger.blink, blinks: f._ranger.blinks } : null,
        invuln: f.invulnTimer || 0, skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, noDash: !!f.noDash } },
    sorties: () => JSON.parse(JSON.stringify(FALCON_SORTIES)) }
}
