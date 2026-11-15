// Test-only accessor for harness/cyborg*.mjs (exposed as __harness.cyborgTest; harness URLs only). Read-mostly: the
// only writers are reset / move / setHeat / setPower, used to set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startCyMove, clearCyborg, cyborgState, getCyborgUltStatus, isCyborgUltActive, cyborgUltView, clearCyborgUlt } from './cyborgState.js'
import { CYBORG_MOVES, HEAT, WEAPON, PROJ, ULT, TIMELINE } from './cyborgData.js'
import { cyborgFxCacheSize, cyborgHeatLabel } from './cyborgFx.js'
export function cyborgHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  return { raw,
    reset: () => { clearCyborgUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearCyborg(f, g.world) },
    move: (k, w = 'p1', extra = null) => startCyMove(raw(w), k, g.world, { extra }),
    setHeat: (h, w = 'p1') => { const s = cyborgState(raw(w)); s.heat = Math.round(h * HEAT.Q); s.ovh = h >= 100 ? { t: HEAT.overheatMin } : null },
    setPower: (p, w = 'p1') => { raw(w).energy = p },
    ult: () => ({ ...getCyborgUltStatus(), active: isCyborgUltActive() }),
    ultView: (w = 'p1') => { const v = cyborgUltView(raw(w)); return v ? JSON.parse(JSON.stringify(v)) : null },
    hud: (w = 'p1') => cyborgHeatLabel(raw(w)),
    fxCache: () => cyborgFxCacheSize(),
    data: () => JSON.parse(JSON.stringify({ moves: CYBORG_MOVES, heat: HEAT, weapon: WEAPON, proj: PROJ, ult: ULT, timeline: TIMELINE })),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._cy).map(p => ({ kind: p._cy.kind, n: p._cy.n, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, vy: p.vy, damage: p.damage, sheet: p.sheet || null })),
    state: (w = 'p1') => { const f = raw(w)
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, charging: !!f.isCharging, blocking: !!f.isBlocking,
        attack: f.currentAttack ? { name: f.currentAttack.name, total: f.currentAttack.total, timer: f.currentAttack.timer, activeStart: f.currentAttack.activeStart, activeEnd: f.currentAttack.activeEnd, hasHit: f.currentAttack.hasHit, damage: f.currentAttack.damage, cy: f.currentAttack.cy ? { ...f.currentAttack.cy } : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._cyborg ? JSON.parse(JSON.stringify({ ...f._cyborg, cues: undefined })) : null,
        cues: f._cyborg ? [...f._cyborg.cues] : [], land: f._cyLand || 0, action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        skin: f.skinId || null, tag: f._recolorTag || null, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0,
        combo: f.comboCounter || 0, juggle: f.juggleCount || 0, knockdown: !!f.knockdownState } } }
}
