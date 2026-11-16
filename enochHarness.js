// Test-only accessor for harness/enoch*.mjs (exposed as __harness.enochTest; harness URLs only). Read-mostly: the writers
// (reset / move / setEnergy / setThermal / patch / glide) only set up a scenario before driving real inputs.
import { getAttackHitbox, getCancelWindow } from './combat.js'
import { startEnMove, clearEnoch, getEnochUltStatus, isEnochUltActive, enochUltView, clearEnochUlt, enState, sideOf, startGlide, TP, superVariant, lensOrigin } from './enochState.js'
import { ALL_MOVES, SUPERS, GLIDE, HEAT_LENS, DISC } from './enochData.js'
import { addPatch, ELEMENT_PROFILES, REACTIONS } from './elements.js'
import { enochHudLabel } from './enochFx.js'
export function enochHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearEnochUlt(); g.reset(); for (const f of [g.p1(), g.p2()]) clearEnoch(f, g.world) },
    move: (k, w = 'p1', o = {}) => startEnMove(raw(w), k, g.world, o),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    setThermal: (v, w = 'p1') => { const s = enState(raw(w)); s.th.v = v; s.th.over = 0; s.th.overSide = 0; s.th.lock = 0 },
    patch: (o, w = 'p1') => { const f = raw(w), s = enState(f); const ev = addPatch(s.field, { owner: sideOf(f), frame: g.world.frame(), floor: f.y + f.h, ...o }); s.field.events.length = 0; return ev },
    glide: (type, w = 'p1') => { const f = raw(w); return startGlide(f, enState(f), type, f.facing || 1, 'charge') },
    ult: () => ({ ...getEnochUltStatus(), active: isEnochUltActive() }),
    ultView: (w = 'p1') => { const v = enochUltView(raw(w)); return v ? clone(v) : null },
    variant: (w = 'p1') => superVariant(raw(w)),
    lens: (w = 'p1') => lensOrigin(raw(w)),
    hud: (w = 'p1') => enochHudLabel(raw(w)),
    data: () => clone({ moves: ALL_MOVES, supers: SUPERS, glide: GLIDE, lens: HEAT_LENS, disc: DISC, thermal: TP, elements: ELEMENT_PROFILES, reactions: REACTIONS }),
    projectiles: (w = 'p1') => (g.world.projectiles || []).filter(p => p?.owner === raw(w) && p._en)
      .map(p => ({ kind: p._en.kind, serial: p._en.serial, x: p.x, y: p.y, w: p.w, h: p.h, vx: p.vx, damage: p.damage, damageType: p.damageType })),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack
      return { key: f.rosterKey, side: sideOf(f), hp: f.health, maxHp: f.maxHealth, energy: f.energy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, dashTimer: f.dashTimer || 0, blocking: !!f.isBlocking, charging: !!f.isCharging,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage, damageType: a.damageType || null, en: a.en ? clone(a.en) : null } : null,
        cancel: getCancelWindow(f), box: getAttackHitbox(f), s: f._enoch ? clone({ ...f._enoch, cues: undefined }) : null,
        cues: f._enoch ? [...(f._enoch.cues || [])] : [], action: f._lastSpriteAction || null, frame: f._lastSpriteFrame ?? null,
        hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, attackCooldown: f.attackCooldown || 0, combo: f.comboCounter || 0, knockdown: !!f.knockdownState,
        frozen: f._supFrozen || 0, slick: f._elSlick ? clone(f._elSlick) : null, wet: f._elWet ? clone(f._elWet) : null, invuln: f.invulnTimer || 0,
        intro: !!f._introPlaying, remoteInput: !!f._enochRemoteInput } } }
}
