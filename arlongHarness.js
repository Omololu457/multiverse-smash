// arlongHarness.js — test-only window.__harness.arlongTest API (wired from game.js via one delegate line).
// Reads/writes through the accessors game.js passes in; never imported by simulation code.
import { arlongState, isArlong, arlongStartMove, addZone } from './arlongState.js'
import { arlongHudState } from './arlongFx.js'
import { getHurtbox } from './combat.js'

export function arlongHarnessApi(g) {
  const pick = w => (w === 'p2' ? g.p2() : g.p1())
  return {
    state: (w = 'p1') => {
      const f = pick(w); if (!f) return null
      const s = isArlong(f) ? JSON.parse(JSON.stringify(arlongState(f))) : null
      return {
        key: f.rosterKey, health: f.health, maxHealth: f.maxHealth, energy: f.energy, maxEnergy: f.maxEnergy,
        energyName: f.traits?.energyName || f.energyConfig?.label || null,
        move: f.currentMove || null, attacking: !!f.attacking, hitstun: f.hitstun || 0, blockstun: f.blockstun || 0, invuln: f.invulnTimer || 0,
        x: f.x, y: f.y, w: f.w, h: f.h, vx: f.vx, facing: f.facing, combo: f.comboCounter || 0, blocking: !!f.isBlocking,
        grounded: !!(f.onGround || f.grounded), knockdown: !!f.knockdownState,
        speed: f.speed, baseSpeed: f.baseSpeed, dashSpeed: f.dashSpeed, jumpForce: f.jumpForce, dashTimer: f.dashTimer || 0,
        action: f.spriteHandler?.currentAction || null,
        idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null,
        winSheet: (f._skinAnim || f.animationData)?.win?.sheet || null,
        hurtbox: getHurtbox(f),
        hud: isArlong(f) ? arlongHudState(f) : null,
        a: s,
      }
    },
    raw: (w = 'p1') => pick(w),   // the live fighter object (tests only)
    reset: () => { g.reset(); for (const f of [g.p1(), g.p2()]) if (f && isArlong(f)) delete f._arlong },
    tide: (w = 'p1', v = 100) => { const f = pick(w); if (f) f.energy = Math.max(0, Math.min(f.maxEnergy || 100, v)) },
    set: (w = 'p1', patch = {}) => { const f = pick(w); if (f && isArlong(f)) Object.assign(arlongState(f), patch) },
    zone: (cx, width, w = 'p1') => { const f = pick(w); const z = f && addZone(f, cx, width ?? undefined, { stageWidth: () => 99999 }); return z ? { ...z } : null },
    slick: (w = 'p2') => pick(w)?._alSlick || 0,
    move: (key, w = 'p1') => { const f = pick(w); return !!(f && arlongStartMove(f, key)) },
  }
}
