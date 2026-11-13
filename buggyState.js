// buggyState.js — Buggy the Clown authoritative state (GAME_STATE). Everything lives in `fighter._buggy` as plain
// JSON (numbers / booleans / strings / small arrays — no callbacks, no object refs), so it is in the replay
// checkpoint and reproduced bit-identically. No Math.random / gameRng anywhere in the kit: timings are fixed frame
// counts, positions derive from the fighters' positions, and any variation is hash(match seed, frame, player, slot).
import { BUGGY_MOVES, BUGGY_MASK_ANIM, buggy as BUGGY_CHAR } from './buggyData.js'
import { meleeDamageType, projectileDamageType, sourceDamageType, isHakiImbued } from './damageTypes.js'
import { setPartWorld, tickParts, recallParts, ownParts, launchHand, stabHand, plantLegs, lookout, partHit } from './buggyParts.js'
import { BUGGY_FX } from './buggySprites.js'
export const isBuggy = f => f?.rosterKey === 'buggy'
// Audio cue queue (presentation only — played + cleared by game.js right after tickBuggy; never read by the sim).
export function bcue(f, c) { (f._buggyCues ||= []).push(c) }

// CHOP economy (brief Phase 2). Passive +1.5/s = +1 every 40 sim frames.
export const BUGGY_CHOP = { perKnifeHit: 4, perPartHit: 3, passiveEvery: 40, perNullify: 6 }
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'left', 'right', 'up', 'down']

export function buggyState(f) {
  if (!isBuggy(f)) return null
  return f._buggy ||= {
    clock: 0,          // sim frames since spawn (advances outside hitstop)
    tick: 0,           // input ticks (advances EVERY call, even in hitstop) — press-edge timestamps
    passive: 0,        // frames toward the next passive +1 Chop
    idle: 0,           // consecutive neutral-idle frames (head look-around after 600)
    prev: {}, edgeAt: {}, edgeClk: {}, used: {},   // raw buttons last tick / press-edge tick / press-edge SIM clock / edge consumed
    dirs: [],          // condensed facing-relative direction history [[numpad, tick], …] (motion inputs)
    lockout: 0,        // Chop lockout after the Super (frames)
    mask: 0,           // detached-part bitmask for the masked body rows (1 head · 2 hand · 4 foot)
    serial: 0,         // projectile serial (render bookkeeping)
    nulls: [],         // sim clocks of recent nullified slashes (Chop Stagger: 3 inside 300 frames)
    lastNull: -99,     // clock of the last nullify (multi-hit / damage-over-time dedupe)
    nullFlash: 0,      // frames left on the white-silhouette + split flash (render reads it)
    nullSeq: 0,        // nullify counter (render seed for the split-piece scatter)
    nullTotal: 0,      // nullified slashes this round (stat / tests)
    stagger: 0,        // Chop Stagger reassembly frames left (locked, cannot block, NOT slash-immune)
    maskLock: false,   // tests only: hold `mask` as set
    partMask: 0,       // detached-part bits from the live drones (buggyParts.tickParts)
    tapSpecial: -99,   // tick of the last Special press (double-tap → RECALL)
    recalls: 0,        // recalls this round (stat / tests)
    recallTick: -99,   // input tick of the last recall (the command layer cancels a pending neutral A)
    pendingA: -99, pendingKey: null,   // neutral A held back RECALL_WAIT ticks while a part is out
    festival: 0, festTick: 0,          // FESTIVAL frames left · frames to the next orbit tick
    balls: [],         // live Buggy Balls [{x,y,vx,vy,g,dmg,r,sup,n}] (plain data)
    booms: [],         // explosion FX timers [{x,y,t,big}] (render reads)
    esc: null,         // Quick Escape travel {x0,x1}
    capeUsed: false,   // Cape Flourish: one projectile per cape
    inSuper: false, superHit: 0, stabFx: [],   // Super bookkeeping / hand-stab FX [{x,y,t}]
    dashPrev: 0,       // engine dashTimer last frame (Roll invulnerability on the rising edge)
    groundY: null,     // feet line when last grounded (balls explode on it)
  }
}

// Round/match reset (game.js runs this right AFTER the shared revertGoku(_f), which stamps speed 84 / dash 16 on
// EVERY fighter). Re-apply Buggy's own speed 80 / dashSpeed 13. Buggy-gated; no other fighter is touched.
export function buggyRoundReset(f) {
  if (!isBuggy(f)) return
  const st = BUGGY_CHAR.stats
  f.baseSpeed = f.speed = st.speed
  f.dashSpeed = st.dashSpeed
  if (f._buggy) { delete f._buggy }
  f._skinAnim = null
}
export function clearBuggy(f) {
  if (f?._buggy || isBuggy(f)) { delete f._buggy; delete f._buggyCues; if (isBuggy(f)) f._skinAnim = null }
}

export const chopBlocked = f => !!(f?._buggy && (f._buggy.lockout > 0 || f._buggy.inSuper))
export function gainChop(f, n) { if (isBuggy(f) && !chopBlocked(f)) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + n) }

const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}

// ── Per-simulation-frame tick (1v1 + FFA combat steps, before the command layer and updateCombat). ──
// W = world accessors from game.js (projectiles, spawn, applyDamage, stageWidth, …).
export function tickBuggy(f, opp, raw = {}, W = null) {
  if (!isBuggy(f)) { if (f?._buggy) clearBuggy(f); return }
  const s = buggyState(f)
  s.tick++
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock } s.prev[k] = v }
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 20) s.dirs.shift() }
  if (W) setPartWorld(W)
  // RECALL: double-tap Special (2nd press within 12 input ticks) while a part is out → every part flies home,
  // 30% Chop refund × the part's remaining HP (drones.recallDrones). Both presses are consumed.
  if (s.edgeAt.special === s.tick && f.health > 0) {
    const out = ownParts(f).some(d => !d.dying && !d._retiring)
    if (out && s.tick - s.tapSpecial <= 12) { recallParts(f); s.recalls++; s.recallTick = s.tick; s.used.special = s.tick; s.tapSpecial = -99; bcue(f, 'reversePop') }
    else s.tapSpecial = s.tick
  }
  s.partMask = tickParts(f)
  if (f.health <= 0) return
  if (f.hitstop > 0) return
  s.clock++
  if (s.lockout > 0) s.lockout--
  if (s.nullFlash > 0) s.nullFlash--
  if (s.stagger > 0) {   // CHOP STAGGER: reassembling — no attacks, no block (game.js updateMovementInput gate)
    s.stagger--
    f.attackCooldown = Math.max(f.attackCooldown || 0, 2)
    if (s.stagger === 0) bcue(f, 'reverseTwo')
  }
  if (s.staggerAnim) { s.staggerAnim = false; if (_startMove) buggyStartMove(f, 'bStagger', _startMove) }   // split-body reassembly strip
  if (f.onGround || f.grounded) s.groundY = (f.y || 0) + (f.h || 94)
  // ROLL: the engine dash is Buggy's roll — 8 invulnerable frames on the dash's first frame.
  if ((f.dashTimer || 0) > s.dashPrev) f.invulnTimer = Math.max(f.invulnTimer || 0, BUGGY_ROLL_INVULN)
  s.dashPrev = f.dashTimer || 0
  // Super bookkeeping: the Chop lockout starts when the Super ends (any way it ends).
  const a = f.attacking ? f.currentAttack : null
  if (s.inSuper && !(a && a.bg?.kind === 'super')) { s.inSuper = false; s.lockout = BUGGY_SUPER_LOCKOUT }
  // Grounded specials / the Super are PLANTED (Quick Escape owns its own travel): a dash or walk velocity from
  // input this frame is cancelled so a motion rolled out of a walk can't slide him mid-cast.
  if (a && a.bg && (a.isSpecial || a.isUltimate) && (f.onGround || f.grounded)) { f.vx = 0; f.dashTimer = 0 }
  if (a && a.bg) tickMove(f, opp, s, a, W)
  tickFestival(f, opp, s)
  tickBalls(f, opp, s)
  for (let i = s.booms.length - 1; i >= 0; i--) if (--s.booms[i].t <= 0) s.booms.splice(i, 1)
  for (let i = s.stabFx.length - 1; i >= 0; i--) if (--s.stabFx[i].t <= 0) s.stabFx.splice(i, 1)
  applyMask(f, s)
}

export const BUGGY_ROLL_INVULN = 8
export const BUGGY_SUPER_LOCKOUT = 180
export const BUGGY_SPECIAL = {
  festival: { frames: 240, every: 15, dmg: 12, radius: 92, speedMul: 0.6 },
  ball: { vx: 6, vxFwd: 8, vxBack: 4.5, vy: -9, g: 0.55, dmg: 95, radius: 72 },   // lands ≈ 260 px (→ 340 / ← 205)
  escape: { dist: 320 },   // 25% of the 1280-px reference screen (fixed: never the device canvas → LAN-safe)
  fan: { n: 3, dmg: 30, speed: 12, pool: 6 },
  cape: { reflectDmg: 40 },
}

// Facing-relative numpad motion string over the last `win` input ticks (same reader as Zoro's).
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) {
    const [tok, at] = s.dirs[i], next = s.dirs[i + 1]
    if (at >= from || !next || next[1] > from) str += tok
  }
  return str
}
export const canBuggyAct = f => !(f?._buggy?.stagger > 0)
let _startMove = null   // combat.startMove, handed in by buggy.js (avoids a combat ↔ buggyState import cycle)
export function registerBuggyStartMove(fn) { _startMove = fn }

// Start one of Buggy's moves through the engine's startMove (frameExact path) + attach his descriptor `bg`
// (kind / spawn frames / hitbox shape / per-move blockstun), read by tickMove and the combat.js hooks below.
export function buggyStartMove(f, key, startMove) {
  const md = BUGGY_MOVES[key]; if (!md || !startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.bg || {}, box = md.bx || {}
  f.currentMove = key
  a.bg = { kind: g.kind || 'normal', ...g, blockstun: md.blockstun, dir: f.facing || 1 }
  if (box.centered) a.bg.centered = true
  if (box.boxY != null) a.bg.boxY = box.boxY
  if (g.noHit) a.hasHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.vx = 0; f.isBlocking = false }
  if (key === 'bSuper') { const s = buggyState(f); s.inSuper = true; s.superHit = 0 }
  return true
}

const elapsed = a => a.total - a.timer
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) * 0.45
const pseudo = (f, x, type) => ({ owner: f, x, type })

function tickMove(f, opp, s, a, W) {
  const g = a.bg, t = elapsed(a), dir = g.dir || f.facing || 1
  const sw = W?.stageWidth?.() || 3200
  switch (g.kind) {
    case 'cannon': if (t === g.spawnAt) launchHand(f, W?.frame?.() || 0); break
    case 'stab': if (t === g.spawnAt) stabHand(f); break
    case 'head': if (t === g.spawnAt) lookout(f, W?.frame?.() || 0); break
    case 'festival':
      if (t === g.spawnAt) { s.festival = BUGGY_SPECIAL.festival.frames; s.festTick = 0; bcue(f, 'festival') }
      break
    case 'ball':
      if (t === g.spawnAt) {
        const B = BUGGY_SPECIAL.ball, fwd = dir === 1 ? s.prev.right : s.prev.left, back = dir === 1 ? s.prev.left : s.prev.right
        const vx = (fwd ? B.vxFwd : back ? B.vxBack : B.vx) * dir
        s.balls.push({ x: ctrX(f) + dir * 34, y: (f.y || 0) + 30, vx, vy: B.vy, g: B.g, dmg: B.dmg, r: B.radius, sup: false, n: ++s.serial })
        bcue(f, 'cannon')
      }
      break
    case 'escape': {
      const [t0, t1] = g.travel
      if (t === t0) {
        plantLegs(f, W?.frame?.() || 0)
        const toward = opp ? Math.sign(ctrX(opp) - ctrX(f)) || dir : dir
        const fwdHeld = toward === 1 ? s.prev.right : s.prev.left
        const go = fwdHeld ? toward : -toward, dist = BUGGY_SPECIAL.escape.dist
        s.esc = { x0: f.x, x1: Math.max(0, Math.min(sw - (f.w || 48), f.x + go * dist)) }
        bcue(f, 'pop')
      }
      if (s.esc && t > t0 && t <= t1) { f.x = Math.round(s.esc.x0 + (s.esc.x1 - s.esc.x0) * (t - t0) / (t1 - t0)); f.vx = 0 }
      if (t === t1 && s.esc) { if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1; s.esc = null; bcue(f, 'reversePop') }
      break
    }
    case 'fan':
      if (t === g.spawnAt && W) {
        const F = BUGGY_SPECIAL.fan
        const mine = (W.projectiles || []).filter(p => p.owner === f && p.buggyKind === 'knife').length
        const n = Math.max(0, Math.min(F.n, F.pool - mine)), fx = BUGGY_FX.knife
        for (let k = 0; k < n; k++) {
          const vy = (k - 1) * 1.3
          const p = W.spawn(f, 'buggyKnife', { damage: F.dmg, speed: F.speed, vx: dir * F.speed, vy, lifetime: 70, w: 30, h: 14, radius: 9,
            sheet: fx.sheet, spriteFrames: 1, spriteW: fx.w, spriteH: fx.h, spriteScale: 1.1, hitstun: 14, knockbackX: 2, knockbackY: 0,
            isSpecial: true, color: '#e8e8f0', spawnX: ctrX(f) + dir * 30, spawnY: (f.y || 0) + 34 + (k - 1) * 8 })
          if (p) { p.buggyKind = 'knife'; p.damageType = 'slash'; p.buggySerial = ++s.serial }
        }
      }
      break
    case 'cape': if (t === 0 || t === 1) s.capeUsed = false; break
    case 'super': tickSuper(f, opp, s, a, g, t, W); break
  }
}

// FESTIVAL: Buggy's pieces orbit him for 4 s — a 12-damage slash tick every 15 f on anyone inside the ring;
// he walks at 60% (physics.js) and cannot be grabbed (combat.resolveGrab hook).
function tickFestival(f, opp, s) {
  if (!(s.festival > 0)) return
  s.festival--
  if (++s.festTick < BUGGY_SPECIAL.festival.every || !opp) return
  s.festTick = 0
  const F = BUGGY_SPECIAL.festival
  if (Math.abs(ctrX(opp) - ctrX(f)) < F.radius && Math.abs(ctrY(opp) - ctrY(f)) < F.radius)
    partHit(pseudo(f, ctrX(f), 'bFestival'), opp, F.dmg, { hitstun: 14, kb: 2, cue: 'knifeHit' })
}

// BUGGY BALL: an arcing cannonball (manual gravity). Explodes on the foe or the floor: blunt AoE that also hits
// a knocked-down foe (OTG). Super balls are aimed at the foe's feet with a spread.
function tickBalls(f, opp, s) {
  const floor = s.groundY ?? ((f.y || 0) + (f.h || 94))
  for (let i = s.balls.length - 1; i >= 0; i--) {
    const b = s.balls[i]
    b.vy += b.g; b.x += b.vx; b.y += b.vy
    const onFoe = opp && !opp.eliminated && Math.abs(b.x - ctrX(opp)) < (opp.w || 48) / 2 + 8 && b.y > (opp.y || 0) && b.y < (opp.y || 0) + (opp.h || 94)
    if (!onFoe && b.y < floor - 6 && b.y < 2000) continue
    s.balls.splice(i, 1)
    s.booms.push({ x: b.x, y: Math.min(b.y, floor - 6), t: 20, big: !b.sup })
    bcue(f, 'explosion')
    if (opp && Math.abs(ctrX(opp) - b.x) < b.r && Math.abs(((opp.y || 0) + (opp.h || 94) * 0.6) - b.y) < b.r + 40) {
      const r = partHit(pseudo(f, b.x, b.sup ? 'bSuper' : 'bBall'), opp, b.dmg, { damageType: 'blunt', otg: true, hitstun: b.sup ? 34 : 30, kb: 6, launch: b.sup ? -6 : -9, chop: 0, blockstun: 16, cue: 'boom' })
      if (r === true && b.sup) s.superHit++
    }
  }
}

// SUPER — CHOP-CHOP SPECIAL: BUGGY BALL BARRAGE. Parts recalled, the cannon cart wheels in; 4 balls in a spread
// with hand stabs between shots, then the spinning knife-ball rush. 370 raw. 3 s Chop lockout afterwards.
function tickSuper(f, opp, s, a, g, t, W) {
  const dir = g.dir || f.facing || 1
  if (t === 1) { recallParts(f); bcue(f, 'cannonRoll') }
  if (g.balls.includes(t) && opp) {
    const k = g.balls.indexOf(t), spread = [-36, -12, 12, 36][k] || 0, flight = 22, G = BUGGY_SPECIAL.ball.g
    const x0 = ctrX(f) + dir * 46, y0 = (f.y || 0) + 40
    const tx = ctrX(opp) + spread, ty = (opp.y || 0) + (opp.h || 94) * 0.6
    s.balls.push({ x: x0, y: y0, vx: (tx - x0) / flight, vy: (ty - y0 - 0.5 * G * flight * flight) / flight, g: G, dmg: g.ballDmg, r: 56, sup: true, n: ++s.serial })
    bcue(f, 'cannon')
  }
  if (g.stabs.includes(t) && opp && Math.abs(ctrX(opp) - ctrX(f)) < 420) {
    s.stabFx.push({ x: ctrX(opp), y: ctrY(opp), t: 12, dir })
    if (partHit(pseudo(f, ctrX(opp) - dir * 20, 'bSuper'), opp, g.stabDmg, { hitstun: 30, kb: 1, chop: 0, otg: true, cue: 'stab' }) === true) s.superHit++
  }
  if (t === g.rushAt && opp) {
    // the knife-ball rush: Buggy spins into a ball of knives and rolls straight through the foe.
    const sw = W?.stageWidth?.() || 3200, ox = ctrX(opp), reach = 460
    if (Math.abs(ox - ctrX(f)) < reach) {
      f.x = Math.max(0, Math.min(sw - (f.w || 48), ox + dir * 40 - (f.w || 48) / 2))
      if (partHit(pseudo(f, ox - dir * 20, 'bSuper'), opp, g.rushDmg, { hitstun: 40, kb: 10, launch: -12, chop: 0, otg: true, cue: 'boom' }) === true) s.superHit++
    }
    bcue(f, 'knifeHit')
  }
}

// ── combat.js hooks (buggy-gated no-ops for everyone else) ─────────────────────────────────────────────────
// Hitbox: Buggy's own box descriptor (noHit specials, centred / raised boxes).
export function buggyHitbox(f) {
  const a = f.currentAttack, g = a?.bg
  if (!g || g.noHit) return null
  const reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40, fw = f.w || 48
  if (g.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (g.boxY ?? 20), w: reach, h }
  if (a.name === 'air') { const behind = 16, w = behind + fw + reach; return { x: f.facing === 1 ? f.x - behind : f.x + fw + behind - w, y: f.y - 25, w, h: h + 45 } }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? (a.name === 'up' ? -30 : 20)), w: reach, h }
}
// Per-move block stun (designed block advantage +1 / −3 / −6 / −12 …).
export function buggyBlockstun(attacker, defender, atk) {
  if (isBuggy(attacker) && atk?.bg?.blockstun != null) defender.blockstun = atk.bg.blockstun
}
// Combo scaling: 85% per hit (the counter resets after 1.5 s idle — the engine's comboTimer 90).
export const buggyComboScale = f => Math.pow(0.85, Math.max(0, (f?.comboCounter || 0)))
// FESTIVAL: cannot be grabbed while the pieces orbit.
export const buggyNoGrab = f => isBuggy(f) && (f._buggy?.festival || 0) > 0
// Festival: walk at 60% (physics.js multiplies the walk speed).
export const buggyWalkMul = f => (isBuggy(f) && (f._buggy?.festival || 0) > 0) ? BUGGY_SPECIAL.festival.speedMul : 1
// CAPE FLOURISH (projectile path): during the cape window one projectile is stopped; inside the first 8 frames of
// the window it is REFLECTED back for 40. Returns 'reflect' | 'block' | null. Ultimates / beams pass.
export function buggyCape(fighter, proj) {
  if (!isBuggy(fighter)) return null
  const a = fighter.attacking ? fighter.currentAttack : null, g = a?.bg, s = fighter._buggy
  if (!g || g.kind !== 'cape' || !s || s.capeUsed || proj.isUltimate) return null
  const t = elapsed(a)
  if (t < g.window[0] || t >= g.window[1]) return null
  s.capeUsed = true
  bcue(fighter, 'cape')
  if (t < g.window[0] + g.reflect) {
    proj.vx = -(proj.vx || 0); proj.vy = -(proj.vy || 0)
    proj.owner = fighter; proj.ownerId = fighter.side
    proj.damage = BUGGY_SPECIAL.cape.reflectDmg; proj._buggyReflected = true
    proj.x += proj.vx > 0 ? 26 : -26
    return 'reflect'
  }
  return 'block'
}

// Masked body rows: point the renderer at the row for the current detached-part mask (presentation only).
function applyMask(f, s) {
  if (!s.maskLock) s.mask = (s.stagger > 0 ? 3 : 0) | (s.partMask | 0)   // ≤ 2 parts ever detached → rows 0-6
  const m = s.mask | 0
  const want = m ? BUGGY_MASK_ANIM[m] : null
  if ((f._skinAnim || null) !== want) f._skinAnim = want
}

// Passive Chop regen: +1.5 per second while alive (+1 every 40 frames). Replaces the shared passive regen.
export function buggyRegen(f) {
  if (!isBuggy(f)) return false
  const s = buggyState(f)
  if (f.health > 0 && !(f.hitstop > 0)) {
    if (++s.passive >= BUGGY_CHOP.passiveEvery) { s.passive = 0; gainChop(f, 1) }
  }
  return true
}

// Melee hit bookkeeping (combat.resolveAttackHit, clean connects only): +4 Chop per knife (slash) hit.
export function buggyHit(attacker, defender, atk) {
  if (isBuggy(attacker) && attacker !== defender) {
    const md = BUGGY_MOVES[atk?.name]
    if ((md?.damageType || atk?.damageType) === 'slash') { gainChop(attacker, BUGGY_CHOP.perKnifeHit); bcue(attacker, 'knifeHit') }
  }
}
// Projectile hit bookkeeping (combat.resolveProjectileHitsMulti): +4 Chop per thrown knife that connects clean.
export function buggyProjectileHit(proj, target) {
  const o = proj?.owner
  if (isBuggy(o) && o !== target && proj.buggyKind === 'knife' && !target.isBlocking) { gainChop(o, BUGGY_CHOP.perKnifeHit); bcue(o, 'knifeHit') }
}
// Knockback post-process on a connecting melee hit: weight 0.9 → knockback taken ÷ 0.9.
export function buggyKnockback(attacker, defender) {
  if (isBuggy(defender) && defender.vx) defender.vx /= (BUGGY_CHAR.stats.weight || 0.9)
}

// ── BARA BARA NO MI (brief Phase 3) ────────────────────────────────────────────────────────────────────────────
// A SLASH (damageTypes.js) passes through Buggy's body: ZERO damage, no hitstun / hitstop / knockback, a white
// silhouette + split flash, +6 Chop. NOT immune to blunt / projectile / energy / grab, nor to Haki-imbued attacks.
// CHOP STAGGER: 3 nullified slashes inside 5 s (300 frames) → a 1 s (60 f) forced reassembly (head + hand fly back): he can't attack or
// block, and his body is NOT intangible while the pieces fly back (that is the blade user's punish window).
export const BUGGY_BARA = { staggerHits: 3, staggerWindow: 300, staggerFrames: 60, flash: 24, dedupe: 6 }

function slashImmune(b, attacker) {
  if (!isBuggy(b) || !attacker || attacker === b || !(b.health > 0)) return null
  const s = buggyState(b)
  if (s.stagger > 0) return null   // reassembling → vulnerable
  return s
}
function nullify(b, s, multi) {
  if (multi && s.clock - s.lastNull < BUGGY_BARA.dedupe) return true   // same multi-hit / DoT burst — absorb silently
  s.lastNull = s.clock
  s.nullFlash = BUGGY_BARA.flash; s.nullSeq++; s.nullTotal++
  gainChop(b, BUGGY_CHOP.perNullify)
  bcue(b, 'nullify')
  s.nulls = s.nulls.filter(t => s.clock - t < BUGGY_BARA.staggerWindow)
  s.nulls.push(s.clock)
  if (s.nulls.length >= BUGGY_BARA.staggerHits) {
    s.nulls = []
    s.stagger = BUGGY_BARA.staggerFrames
    b.isBlocking = false; b.blockstun = 0
    s.staggerAnim = true   // game.js starts the split-body bStagger strip (presentation; see buggyStaggerPose)
    bcue(b, 'stagger')
  }
  return true
}
// combat.resolveAttackHit (melee). True → the swing passes through (caller consumes it).
export function buggyNullifyMelee(defender, attacker) {
  const s = slashImmune(defender, attacker); if (!s) return false
  const atk = attacker.currentAttack
  if (meleeDamageType(attacker, atk) !== 'slash' || isHakiImbued(attacker, atk)) return false
  return nullify(defender, s, false)
}
// combat.resolveProjectileHitsMulti. True → the projectile is spent harmlessly (caller removes it).
export function buggyNullifyProjectile(defender, proj) {
  const s = slashImmune(defender, proj?.owner); if (!s) return false
  if (projectileDamageType(proj) !== 'slash' || isHakiImbued(proj.owner, proj)) return false
  return nullify(defender, s, true)
}
// combat.applyScaledDamage (direct damage calls: specials, domains, DoT). Melee + projectile writes are already
// gated above, so their sources are skipped here. True → zero damage.
export function buggyNullifyDamage(target, opts = {}) {
  if (!isBuggy(target) || opts.source === 'projectile' || opts.source === 'block-chip') return false
  const s = slashImmune(target, opts.attacker); if (!s) return false
  if (sourceDamageType(opts) !== 'slash' || isHakiImbued(opts.attacker, opts)) return false
  return nullify(target, s, true)
}
// game.js updateMovementInput: Chop Stagger locks movement + guard.
export const buggyLocked = f => isBuggy(f) && (f._buggy?.stagger || 0) > 0
