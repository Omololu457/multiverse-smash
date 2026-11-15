// Test-only accessor for harness/violet*.mjs (exposed as __harness.violetTest; harness URLs only). Read-mostly: the only
// writers are reset / setEnergy (scenario setup before driving real inputs).
import { getAttackHitbox } from './combat.js'
import { violet, MOVES, TIMELINE, SCALE, ENERGY } from './violetData.js'
import { clearViolet, vState } from './violetState.js'
import { VIOLET_ANIM } from './violetSprites.js'
import { VIOLET_SKINS } from './violetSkins.js'
export function violetHarnessApi(g) {
  const raw = (w = 'p1') => w === 'p2' ? g.p2() : g.p1()
  const clone = o => JSON.parse(JSON.stringify(o))
  return { raw,
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) clearViolet(f) },
    setEnergy: (e, w = 'p1') => { raw(w).energy = e },
    skins: () => VIOLET_SKINS.map(s => ({ id: s.id, name: s.name })),
    data: () => clone({ moves: MOVES, timeline: TIMELINE, scale: SCALE, stats: violet.stats, energy: ENERGY, traits: violet.traits }),
    state: (w = 'p1') => { const f = raw(w), a = f.currentAttack, act = f._lastSpriteAction || null
      return { key: f.rosterKey, hp: f.health, maxHp: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy, x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, vy: f.vy, facing: f.facing,
        grounded: !!(f.onGround || f.grounded), jumpCount: f.jumpCount || 0, blocking: !!f.isBlocking,
        attack: a ? { name: a.name, total: a.total, timer: a.timer, activeStart: a.activeStart, activeEnd: a.activeEnd, hasHit: a.hasHit, damage: a.damage } : null,
        box: getAttackHitbox(f), action: act, ownStrip: f.rosterKey === 'violet' ? !!(f._skinAnim?.[act] || VIOLET_ANIM[act]) : null,
        frame: f._lastSpriteFrame ?? null, skin: f.skinId || 'default', tag: f._recolorTag || null,
        inv: !!f._violet?.inv, alpha: f._violet?.inv ? 0.35 : 1, s: f._violet ? clone(f._violet) : null,
        speed: f.speed, baseSpeed: f.baseSpeed, jumpForce: f.jumpForce, run: !!f.runWhenAdvancing, energyName: f.traits?.energyName || f.energyName || null,
        hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, combo: f.comboCounter || 0, knockdown: !!f.knockdownState } } }
}
