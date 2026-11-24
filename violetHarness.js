// Test-only accessor for harness/violet*.mjs (exposed as __harness.violetTest; harness URLs only). Read-mostly: the only
// writers are reset / setEnergy (scenario setup before driving real inputs).
import { getAttackHitbox } from './combat.js'
import { violet, MOVES, TIMELINE, SCALE, ENERGY, VANISH, PUSH, SHIELD, BALL, TRAP, ULT, CINE, MOTION, DEFENSE } from './violetData.js'
import { violetAlpha } from './violetView.js'
import { clearViolet, vState, shieldUp, startVMove, phaseInvuln } from './violetState.js'
import { VIOLET_ANIM } from './violetSprites.js'
import { VIOLET_SKINS } from './violetSkins.js'
import { getVioletCineStatus, clearVioletCine } from './violetUlt.js'
export function violetHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { clearVioletCine(); g.reset(); for (const f of [g.p1(), g.p2()]) clearViolet(f); const P = g.projectiles?.(); if (P) P.length = 0 },
    // scenario driver for the OTHER side (the CPU dummy does not attack on cue): start a Violet move on fighter w
    force: (w, key) => startVMove(raw(w), key, null, raw(w === 'p2' ? 'p1' : 'p2')),
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    // test projectile from fighter w toward its facing (dx = spawn offset from its centre), plain engine projectile
    spawnProj: (w = 'p2', dx = 60, vx = 7, dmg = 40) => { const o = raw(w), d = o.facing || 1
      const p = { x: o.x + o.w / 2 + d * dx, y: o.y + o.h * 0.4, vx: d * Math.abs(vx), vy: 0, radius: 14, isSpecial: true, name: 'violetTestProj', owner: o, ownerId: o.side, lifetime: 300, damage: dmg }
      g.projectiles?.().push(p); return true },
    projs: () => (g.projectiles?.() || []).map(p => ({ x: p.x, vx: p.vx, owner: p.owner === g.p1() ? 'p1' : p.owner === g.p2() ? 'p2' : '?', refl: p._violetReflected || 0, name: p.name })),
    cine: () => getVioletCineStatus(),
    shieldUp: (w = 'p1') => shieldUp(raw(w)),
    phaseInvuln: (w = 'p1') => phaseInvuln(raw(w)),
    setHp: (hp, w = 'p1') => { raw(w).health = hp },
    skins: () => VIOLET_SKINS.map(s => ({ id: s.id, name: s.name })),
    data: () => clone({ moves: MOVES, timeline: TIMELINE, scale: SCALE, stats: violet.stats, energy: ENERGY, traits: violet.traits, vanish: VANISH, push: PUSH, shield: SHIELD, ball: BALL, trap: TRAP, ult: ULT, cine: CINE, motion: MOTION, defense: DEFENSE }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, act = f._lastSpriteAction || null
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage } : null,
        box: getAttackHitbox(f), action: act, ownStrip: f.rosterKey === 'violet' ? !!(f._skinAnim?.[act] || VIOLET_ANIM[act]) : null,
        frame: f._lastSpriteFrame ?? null, skin: f.skinId || 'default', tag: f._recolorTag || null,
        inv: !!f._violet?.inv, alpha: violetAlpha(f), dmgMul: f.damageMultiplier ?? 1, s: f._violet ? clone(f._violet) : null,
        speed: f.speed, baseSpeed: f.baseSpeed, jumpForce: f.jumpForce, run: !!f.runWhenAdvancing, energyName: f.traits?.energyName || f.energyName || null,
        hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, combo: f.comboCounter || 0, knockdown: !!f.knockdownState } } }
}
