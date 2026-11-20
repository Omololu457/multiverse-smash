// ninjaCommand.js — MSV1 generic ninja command layer (profile-driven: profile.commands supplies the normals / gatlings /
// motion specials; everything else is the framework's). Called from game.js once per sim frame (1v1 + FFA) after
// tickNinja recorded the press edges. Returns 'consumed' | 'grab' (let only the shared grab / guard run) | false (stun).
//
// "TELEPORT" in the MSV1 brief: this game has no teleport button — S.P.D. Red's teleport is the DOUBLE-TAP ←← / →→
// (rangers.js). The Ninja Streak uses exactly that gesture. The single-press "Teleport +" commands use the Charge button:
//   Streak ←← / →→ (chain ×3; Shane: also ↑↑ / ↓↓ and held ↗↘ in the air) · Smoke Vanish Charge+Light+Heavy (blockstun: escape)
//   Ninja Mirror ↓↓+Charge · Swap = Charge alone during the Mirror · Ninja Barrier →+Charge · Shadow Clones ←+Charge
import { isNinja, ninjaState, getNinjaProfile, startStreak, startVanish, startMirror, startSwap, startBarrier, startBurrow, startCloneJob,
  nsStartMove, endMove, hasMotion, fresh, live, use, doubleTap, spendNP, cue, ctrX } from './ninja.js'
import { startMove } from './combat.js'
import { spawnProjectile, activeProjectiles } from './abilities.js'
import { registerNinjaStartMove, registerNinjaProjectiles } from './ninja.js'
import './nsData.js'   // registers the ns_red / ns_yellow profiles
import './nsDuo.js'    // MSV1-MERGE: registers the Shane & Dustin duo (windrangers) hooks
import './nsCgptData.js'   // NS CGPT: registers the ninja_storm_cgpt profile (+ its ext hooks)
import { duoCommand } from './ninja.js'

registerNinjaStartMove(startMove)
registerNinjaProjectiles({ spawn: spawnProjectile, list: activeProjectiles })

const CHORD = 4, CHARGE_WAIT = 3
const grounded = f => !!(f.onGround || f.grounded)
// direction held at a button's press edge (facing-relative numpad token → flags)
function dirAt(s, b, raw, facing) {
  const t = s.edgeDir?.[b]
  if (t == null) { const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left; return { fwd: !!fw, back: !!bk, up: !!raw.up, down: !!raw.down } }
  return { down: t <= 3, up: t >= 7, fwd: t % 3 === 0, back: t % 3 === 1 }
}
// ↓↓ (the rangers.js vertical double-tap stamp) landed within `win` ticks before now
const downDown = (f, win = 14) => { const r = f._ranger; return !!(r && r.pendingAt != null && r.pending?.vdir === 1 && r.tick - r.pendingAt <= win) }
const BAR = 50   // one super bar = 50 of the engine energy meter (2 bars = 100)
export function ninjaCanDo(f, key) {
  const s = f._ninja, md = getNinjaProfile(f)?.moves[key]; if (!md || !s) return false
  if (md.bars) { if ((f.energy || 0) < md.bars * BAR) return false; if (key === 'sUlt' && !s.mirror) return false }
  if ((md.np || 0) > s.np) return false
  return true
}
export function ninjaStart(f, key) {
  const s = f._ninja, md = getNinjaProfile(f).moves[key]
  if (!ninjaCanDo(f, key)) return false
  if (key === 'nsBurrow') return startBurrow(f)
  if (!nsStartMove(f, key)) return false
  if (md.np) spendNP(f, md.np)
  if (md.bars) f.energy = Math.max(0, (f.energy || 0) - md.bars * BAR)
  cue(f, md.bars ? (key === 'sUlt' ? 'ultStart' : 'superStart') : md.isSpecial ? 'special' : (md.damageType === 'slash' ? 'swingSword' : 'swing'))
  return true
}
function pickSpecial(f, s, C, b, d, g) {
  if (b === 'ultimate') return s.mirror && ninjaCanDo(f, 'sUlt') ? 'sUlt' : 'sSuper'
  for (const e of C.specials) {
    if (e.button !== b) continue
    if (e.motion && !hasMotion(s, e.motion, e.win || 16)) continue
    if (e.downDown && !downDown(f)) continue
    if (e.ground && !g) continue
    if (e.key === 'sSuper' && s.mirror && ninjaCanDo(f, 'sUlt')) return 'sUlt'   // in the Mirror the super motion with 2 bars = the Ultimate
    return g ? e.key : (e.air || null)
  }
  return undefined
}
function tryButtons(f, s, p, raw, g, ctx, cancelFrom) {
  const C = p.commands
  for (const b of ['ultimate', 'special', 'light', 'heavy', 'upAttack']) {
    if (!fresh(s, b)) continue
    const d = dirAt(s, b, raw, f.facing || 1)
    let key = pickSpecial(f, s, C, b, d, g)
    if (key === undefined && (b === 'light' || b === 'heavy' || b === 'upAttack')) {
      if (cancelFrom === 'special') continue
      key = C.normal(b, d, g, { ...ctx, from: cancelFrom })
      if (key && cancelFrom && cancelFrom !== 'any') {
        const isSp = C.specialsSet.includes(key)
        if (!isSp && !(C.gatling[cancelFrom] || []).includes(key)) continue
      }
      if (s.wake > 0 && g && (b === 'light' || b === 'heavy')) key = 'sWake'
    }
    if (key === undefined) continue
    use(s, b)
    if (!key) return true
    if (ninjaStart(f, key)) return true
    return true   // a failed special press is eaten (no engine fallback special)
  }
  return false
}
function tryCharge(f, s, p, opp, raw) {
  if (!fresh(s, 'charge', 12)) return false
  // SMOKE VANISH chord: Charge + Light + Heavy within 4 ticks
  if (live(s, 'light', CHORD + CHARGE_WAIT) && live(s, 'heavy', CHORD + CHARGE_WAIT) && Math.abs(s.edgeAt.light - s.edgeAt.charge) <= CHORD && Math.abs(s.edgeAt.heavy - s.edgeAt.charge) <= CHORD) {
    use(s, 'charge', 'light', 'heavy'); startVanish(f, opp, raw); return true
  }
  if (s.tick - s.edgeAt.charge < CHARGE_WAIT) return 'wait'   // give the Vanish chord its window before a single-button use
  const d = dirAt(s, 'charge', raw, f.facing || 1)
  use(s, 'charge')
  if (downDown(f, 16) && !s.mirror) return startMirror(f, opp) || true
  if (s.mirror && !d.fwd && !d.back) return startSwap(f) || true
  if (d.fwd) return startBarrier(f) || true
  if (d.back) {
    const C = p.clones
    if (C && !s.cloneJob && spendNP(f, C.cost)) { if (f.attacking) endMove(f); nsStartMove(f, 'nsClone'); startCloneJob(f, opp, { count: C.max, dmg: C.strike, pose: 'sUpper' }); cue(f, 'handSign') }
    return true
  }
  return true
}

export function updateNinjaCommand(f, inp, opp, W) {
  if (!isNinja(f)) return false
  const s = ninjaState(f), p = getNinjaProfile(f)
  const raw = s.prev, g = grounded(f)
  if (s.wasDown && !f.knockdownState) s.wake = 10; else if (s.wake > 0) s.wake--
  s.wasDown = !!f.knockdownState
  // BLOCKSTUN ESCAPE: Smoke Vanish out of blockstun (dearer, 6 invuln frames, 12 s cooldown)
  if ((f.blockstun || 0) > 0) {
    if (live(s, 'charge', CHORD) && live(s, 'light', CHORD) && live(s, 'heavy', CHORD) && startVanish(f, opp, raw, true)) { use(s, 'charge', 'light', 'heavy'); return 'consumed' }
    return false
  }
  if (f.hitstun > 0 || f.hitstop > 0 || f.isGrabbed || !(f.health > 0) || f.knockdownState) return false
  if (s.sup || s.vanish || s.streak || s.mirror?.swap) return 'consumed'
  { const dc = duoCommand(f, s, opp, raw); if (dc) return dc }   // MSV1-MERGE: the swap's Grab press / the swap itself / Storm and Stone
  { const ec = p.ext?.command?.(f, s, opp, raw, g); if (ec) return ec }   // NS CGPT: clone commands / follow-ups / shot → step cancel (no-op without ext)
  const a = f.attacking ? f.currentAttack : null
  const el = a ? a.total - a.timer : 0
  const contact = a && (a._contact || (a.hasHit && !a.nj?.noHit)) && el >= (a.activeStart ?? 0)
  // ── STREAK (the S.P.D. Red double-tap) ──
  const tap = doubleTap(f)
  if (tap) {
    const air = !g && !s.burrow, vertical = !!tap.vdir
    const free = !a || a.name === 'nsStreakRec' || (s.burrow && a.name === 'nsBurrow') || (contact && !a.isUltimate)
    if (free && !(vertical && !air)) {
      s.usedTap = tap.at
      if (startStreak(f, opp, vertical ? 0 : tap.dir, tap.vdir || 0)) return 'consumed'
      if (!air && !vertical && !a && f._ranger) f._ranger.running = tap.dir   // not enough Ninja Power: he just runs
    }
  }
  // ── CHARGE ("Teleport") commands ──
  if (!a || a.name === 'nsStreakRec' || contact || (s.burrow && a.name === 'nsBurrow')) {
    const c = tryCharge(f, s, p, opp, raw)
    if (c === 'wait') return a ? 'consumed' : 'grab'
    if (c) return 'consumed'
  }
  const ctx = { running: !!(f._ranger?.running && g) }
  if (a) {
    if (s.burrow) return 'consumed'
    // streak recovery: specials on its frames 9-14
    if (a.name === 'nsStreakRec' && el >= p.streak.cancelFrom - 1 && tryButtons(f, s, p, raw, g, ctx, 'special')) return 'consumed'
    if (contact && !a.isUltimate) {
      const md = p.moves[a.name] || {}
      if (md.isSpecial || p.commands.specialsSet.includes(a.name)) {
        if ((fresh(s, 'ultimate') || fresh(s, 'special')) && tryButtons(f, s, p, raw, g, ctx, 'special')) return 'consumed'   // special → super
      } else if (tryButtons(f, s, p, raw, g, ctx, a.name)) return 'consumed'
    }
    return 'consumed'
  }
  if (f.attackCooldown > 0 || inp.block) return 'grab'
  if (tryButtons(f, s, p, raw, g, ctx, null)) return 'consumed'
  return 'grab'
}
