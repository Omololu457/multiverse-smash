// Test-only accessor for harness/spd_yellow*.mjs (exposed as __harness.spdYellowTest; harness URLs only).
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startYellowMove, clearSpdYellow, getSpdYellowUltStatus, isSpdYellowUltActive, spdYellowState, award, yellowShots, orderEcho, openStance } from './spdYellowState.js'
import { falconPos, falconHud, falconContactBox, FALCON_SORTIES } from './falconzord.js'
import { ZORD_RESOURCE, SPD_YELLOW_MOVES, GUN, CLONE, COINS, ORDERS, ULT } from './spdYellowData.js'
import { spdYellowFxCacheSize } from './spdYellowFx.js'
export function spdYellowHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearSpdYellow(f, g.world) },
    move: (k, w = 'p1', extra = null) => startYellowMove(raw(w), k, g.world, { extra }),
    award: (cat, w = 'p1') => award(raw(w), cat),
    setCoins: (n, w = 'p1') => { spdYellowState(raw(w)).coins = n },
    echo: (w = 'p1') => orderEcho(raw(w), g.world),
    stance: (w = 'p1') => openStance(raw(w), g.world),
    ult: () => ({ ...getSpdYellowUltStatus(), active: isSpdYellowUltActive() }),
    fxCache: () => spdYellowFxCacheSize(),
    data: () => JSON.parse(JSON.stringify({ moves: SPD_YELLOW_MOVES, GUN, CLONE, COINS, ORDERS, ULT, ZORD_RESOURCE })),
    shots: (w = 'p1') => yellowShots(raw(w), g.world).map(p => ({ x: p.x, y: p.y, vx: p.vx, damage: p.damage, kind: p._yellow.kind, coin: p._yellow.coin, breach: p._yellow.breach, sheet: p.sheet })),
    state: (w = 'p1') => { const f = raw(w), so = f._falcon?.sortie, P = so && FALCON_SORTIES[so.kind]
      return { key: f.rosterKey, hp: f.health, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing, grounded: !!(f.onGround || f.grounded),
        move: f.currentMove || null, cast: f._spriteCastMove || null,
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, my: f.currentAttack.my ? { ...f.currentAttack.my } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._spdYellow ? JSON.parse(JSON.stringify({ ...f._spdYellow, cues: undefined })) : null,
        cues: f._spdYellow ? [...f._spdYellow.cues] : [],
        falcon: f._falcon ? { ...f._falcon, events: undefined, sortie: so ? { ...so, pos: falconPos(so), boxes: P.contacts.map(c => falconContactBox(so, c)) } : null } : null, hud: falconHud(f, ZORD_RESOURCE),
        ranger: f._ranger ? { charges: f._ranger.charges, blink: f._ranger.blink, blinks: f._ranger.blinks } : null,
        invuln: f.invulnTimer || 0, skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState, noDash: !!f.noDash } } }
}
