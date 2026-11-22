// MSV1 — Ninja Storm Shane (ns_red) + Dustin (ns_yellow): COMMAND LAYER + per-move simulation + super/ultimate sequences.
// The shared systems (Ninja Power, Streak, Vanish, Clones, Mirror, Barrier, Burrow, Traps, REV, Float) live in ninja.js;
// this file maps inputs to them and runs the character moves. Press edges + the direction history come from tickNinja
// (sim ticks), so keyboard, pad, replay and LAN feed the same reader. Damage only through W.damage / the engine hit path.
//
// INPUTS (docs/msv1/NINJA_FRAMEWORK.md): Streak = double-tap ←/→ (S.P.D. Red's detector, rangers.js). "Teleport" in the
// brief's other inputs is the CHARGE button (user decision 2026-11-19): Charge+Light+Heavy = Smoke Vanish, ↓↓+Charge =
// Ninja Mirror, Forward+Charge = Barrier, a lone Charge tap during Ninja Mirror = Swap.
import { startMove, cancelWindowOpen, getComboScale, getComboHitstunScale, applyHitstop } from './combat.js'
import { triggerShake } from './effects.js'
import { registerNinjaEngine, isNinja, getNinjaProfile, ninjaState, tickNinja, startStreak, startVanish, startMirror, startSwap, startBarrier,
  startBurrow, plantTrap, spendNP, spawnClone, popClone, inMirror, endMirror, ninjaStrike, motionDone, isBurrowed, ninjaLocked } from './ninja.js'
import { NS_MOVES, SHOTS, SEQS } from './nsWindData.js'

registerNinjaEngine({ startMove, comboScale: getComboScale, hitstunScale: getComboHitstunScale, hitstop: applyHitstop })

export const isNsWind = f => f?.rosterKey === 'ns_red' || f?.rosterKey === 'ns_yellow'
const isShane = f => f?.rosterKey === 'ns_red'
const grounded = f => !!(f.onGround || f.grounded)
const ctrX = f => (f.x || 0) + (f.w || 60) / 2
const sw = W => W?.stageWidth?.() || 3200
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const hurtOf = f => ({ x: f.x || 0, y: f.y || 0, w: f.w || 60, h: f.h || 100 })
const SCREEN = 1280
const cue = (s, c) => s.cues.push(c)

// ── start one of the ninja's moves through combat.startMove (frameExact path) and attach the descriptor `nj` ──
export function startNsMove(f, key, W, { cancel = false } = {}) {
  if (!isNsWind(f)) return false
  const s = ninjaState(f), md = NS_MOVES[f.rosterKey][key]
  if (!md || f.health <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.isGrabbed || s.streak || s.vanish || s.swap || s.seq || s.counter) return false
  if (md.isSpecial && ((f.disabledSpecials || []).includes('special'))) return false
  if (md.energy && (f.energy || 0) < md.energy) { cue(s, 'reject'); return false }
  if (md.mirrorOnly && !inMirror(f)) return false
  if (md.groundOnly && !grounded(f)) return false
  if (md.np && s.np < md.np) { cue(s, 'reject'); return false }
  if (cancel || (f.attacking && s.chainRec <= 0)) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0 }
  if (!startMove(f, key, md)) return false
  if (md.np) spendNP(f, md.np)
  if (md.energy) f.energy = Math.max(0, (f.energy || 0) - md.energy)
  // REV (Dustin): the next streak OR special spends every pip, +10% damage per pip
  let revMul = 1
  if (md.isSpecial && s.rev?.pips && getNinjaProfile(f).rev) { revMul = 1 + s.rev.pips * getNinjaProfile(f).rev.perPip; s.rev.pips = 0; s.rev.runT = 0; cue(s, 'revSpend') }
  const a = f.currentAttack
  a.nj = { key, md, dir: f.facing || 1, origin: Math.round(f.x), serial: ++s.serial, clean: false, revMul, groundBounce: !!md.groundBounce, underProj: !!md.underProj,
    air: !grounded(f), fired: false, hits: 0 }
  if (revMul !== 1) a.damage = Math.round(a.damage * revMul)
  a.hasHit = !!md.noBody
  f.currentMove = key; f.isBlocking = false
  if (grounded(f) && !md.travel) f.vx = 0
  if (key === 'up' || key === 'erupt') f.jumpHeld = true
  if (md.tornado) { a.total += md.tornado.frames; a.timer += md.tornado.frames; a.nj.tor = { t: 0, hits: 0, vy: 0 } }
  if (md.seq) startSeq(f, s, md, W)
  cue(s, md.damageType === 'slash' ? 'blade' : md.isSpecial ? 'cast' : 'swing')
  return true
}

export { ninjaHitbox as nsHitbox } from './ninja.js'

// ── projectiles (sheet art only) ──
function shoot(f, s, kind, W, { vyMul = 0, at = null, revMul = 1 } = {}) {
  const P = SHOTS[kind]; if (!P || !W?.spawn) return null
  const d = f.facing || 1
  const angle = P.angle || 0
  const vx = d * P.speed * Math.cos(angle) , vy = P.speed * Math.sin(angle) + vyMul
  const life = Math.round(SCREEN * P.rangePct / P.speed)
  const tag = f.rosterKey === 'ns_yellow' ? 'yellow' : 'red'
  const img = P.img.replace('/red/', `/${tag}/`)
  const pr = W.spawn(f, 'ns_' + kind, { damage: Math.round(P.dmg * revMul), speed: P.speed, vx, vy, spawnX: at?.x ?? ctrX(f) + d * 40, spawnY: at?.y ?? (f.y + 38),
    w: P.w * P.scale, h: Math.max(16, P.h * P.scale), radius: Math.max(10, Math.round(Math.min(P.w, P.h) * P.scale / 2)), lifetime: life, hitstun: P.hitstun,
    knockbackX: P.kbx, knockbackY: -1, isSpecial: true, category: 'special', sheet: img, spriteFrames: P.frames || 1, spriteW: P.w, spriteH: P.h, spriteScale: P.scale })
  if (pr) { pr.damageType = P.damageType; pr._ninja = { kind, n: ++s.shots }; pr.facing = d }
  cue(s, kind === 'beam' || kind === 'beamDiag' ? 'beam' : kind === 'kunai' ? 'kunai' : 'gale')
  return pr
}

// ── SEQUENCES (super / ultimate) ──
function startSeq(f, s, md, W) {
  const S = SEQS[md.seq]
  s.seq = { key: md.seq, t: 0, confirmed: false, done: false, invuln: true, x0: Math.round(f.x), y0: Math.round(f.y), oy: null, ox: null, hide: false }
  const a = f.currentAttack; a.total = S.frames; a.timer = S.frames
  if (S.mirrorOnly) s.stats.ults++; else s.stats.supers++
  cue(s, 'smokePop'); cue(s, md.seq === 'hawkMirage' || md.seq === 'faultLine' ? 'ultStart' : 'superStart')
}
const POSE = { stormAscension: 'streak', earthquake: 'land', hawkMirage: 'diveKick', faultLine: 'land' }
function stepSeq(f, s, opp, W) {
  const q = s.seq, S = SEQS[q.key], p = getNinjaProfile(f)
  q.t++
  f.invulnTimer = Math.max(f.invulnTimer || 0, 2); f._rooted = true; f.vx = 0; f.vy = 0
  f.currentMove = q.t < 10 ? 'guard' : POSE[q.key]
  if (q.t === 8 && S.clones) {   // five-step: hand sign (guard) → smoke pop → STAGGERED fan-out (delay 0 / 4)
    for (let i = 0; i < S.clones; i++) spawnClone(f, { x: f.x + (i ? 1 : -1) * 90, y: f.y, dir: f.facing, delay: i * 4, life: S.frames, pose: 'guard' }, W)
  }
  const O = S.opener
  if (q.t === O.at && !q.confirmed) {
    const ok = opp && opp.health > 0 && !(opp.invulnTimer > 0) && (O.gap ? inGap(f, s, opp) : Math.abs(ctrX(opp) - ctrX(f)) <= O.reach)
    if (!ok) { cue(s, 'seqMiss'); endSeq(f, s, 'whiff'); return }
    if (opp.isBlocking && !O.gap) { ninjaStrike(f, opp, { dmg: 30, blockstun: 18, kbx: f.facing * 3, move: q.key }, W); endSeq(f, s, 'blocked'); return }
    q.confirmed = true; q.ox = Math.round(opp.x); q.oy = Math.round(opp.y)
    if (O.shake) { try { triggerShake(O.shake[0], O.shake[1]) } catch (_) {} }
    if (O.dmg) ninjaStrike(f, opp, { dmg: O.dmg, hitstun: 40, kbx: 0, kby: 0, launch: O.gap ? 0 : -12, unscaled: true, unblockable: true, move: q.key, hitstop: 8 }, W)
    cue(s, 'seqConfirm')
  }
  if (!q.confirmed) return
  // hold the target where the sequence plays (sim: hitstun + pinned position; released after the last hit)
  const last = S.hits[S.hits.length - 1].at
  if (opp && q.t < last) {
    const lift = q.key === 'stormAscension' || q.key === 'hawkMirage' ? 110 : q.key === 'earthquake' ? 130 : 0
    opp.hitstun = Math.max(opp.hitstun || 0, 6); opp.x = q.ox; opp.y = q.oy - lift; opp.vx = 0; opp.vy = 0; opp.isBlocking = false; opp.attacking = false; opp.currentAttack = null
    if (lift) { opp.onGround = false; opp.grounded = false }
  }
  for (const h of S.hits) {
    if (h.at !== q.t || !opp) continue
    let who = f, cx = null
    if (h.who.startsWith('clone')) {
      const c = s.clones.filter(c => !c.gone)[+h.who.slice(5)]
      if (!c) { cue(s, 'cloneMissing'); continue }   // a popped clone's hit is simply lost
      who = c
    }
    if (h.who === 'illusion' && !s.mirror) continue
    const tx = ctrX(opp), ty = opp.y
    // place the striker (render) around the target: angle (streak ring) / dive side / eruption under
    const px = h.ang != null ? tx + Math.cos(h.ang * Math.PI / 180) * 120 - 30 : h.dive != null ? tx + h.dive * 70 - 30 : tx - 30
    const py = h.ang != null ? ty - Math.sin(h.ang * Math.PI / 180) * 70 : h.dive != null ? ty - 60 : q.oy
    if (who === f) { f.x = Math.max(0, Math.min(sw(W) - (f.w || 60), Math.round(px))); f.y = Math.round(Math.min(q.y0, py)); f.facing = tx < ctrX(f) ? -1 : 1; if (h.finisher) f.currentMove = h.finisher; q.hide = false }
    else if (h.who === 'illusion') { s.mirror.x = Math.round(px); s.mirror.y = Math.round(Math.min(q.y0, py)); s.mirror.pose = h.erupt ? 'risingKick' : 'diveKick'; s.mirror.poseT = 0 }
    else { who.x = Math.round(px); who.y = Math.round(Math.min(q.y0, py)); who.pose = h.erupt ? 'risingKick' : h.dive != null ? 'diveKick' : 'streak'; who.dir = tx < who.x + 30 ? -1 : 1 }
    const nonReal = h.who !== 'real'
    const r = ninjaStrike(f, opp, { dmg: h.dmg, hitstun: 40, kbx: 0, kby: 0, launch: h.launch || 0, unscaled: true, unblockable: true, floor: nonReal ? 1 : 0,
      meterMul: h.who === 'illusion' ? 0.5 : nonReal ? 0 : 0.2, move: q.key, hitstop: h.finisher ? 10 : 5 }, W)
    if (r === 'hit') cue(s, h.erupt ? 'erupt' : h.finisher ? 'finisher' : 'seqHit')
    if (h.erupt) s.lastShock = { x: Math.round(tx), y: Math.round(q.oy + (opp.h || 100)), t: 12, reach: 70 }
  }
  if (q.t >= S.frames - 1) endSeq(f, s, 'done')
}
function inGap(f, s, opp) {
  const m = s.mirror; if (!m) return false
  const a = ctrX(f), b = m.x + (f.w || 60) / 2, x = ctrX(opp)
  return x >= Math.min(a, b) - 60 && x <= Math.max(a, b) + 60 && grounded(opp)
}
function endSeq(f, s, why) {
  const q = s.seq; if (!q) return
  s.seq = null; f._rooted = false
  for (const c of s.clones) if (!c.gone) popClone(f, c, 'exit')
  if ((q.key === 'hawkMirage' || q.key === 'faultLine') && s.mirror) endMirror(f, 'done')
  if (f.y < q.y0) { f.onGround = false; f.vy = 2 }
  if (f.attacking && f.currentAttack?.nj?.md?.seq) { f.currentAttack.timer = Math.min(f.currentAttack.timer, 6) }
  cue(s, why === 'done' ? 'seqEnd' : 'seqMiss')
}

// ── per-sim-frame tick: shared framework + this character's per-move simulation ──
export function tickNsWind(f, opp, raw, W) {
  if (!isNsWind(f)) return
  const s = ninjaState(f)
  const res = tickNinja(f, opp, raw, W) || {}
  if (f.health <= 0 || f.hitstop > 0) return
  // STREAK request (the shared double-tap): horizontal on the ground; Shane 8-way in the air; Dustin ground / underground
  const want = res.want
  if (want) {
    const air = !grounded(f) && !s.burrow
    if (want.dir && !s.mirrorChord) {
      if (!air || getNinjaProfile(f).streak.air) startStreak(f, want.dir, 0, W, opp)
    } else if (want.vdir && air && getNinjaProfile(f).streak.air) startStreak(f, 0, want.vdir, W, opp)
  }
  if (res.erupt) startNsMove(f, 'erupt', W, { cancel: true })
  if (s.seq) { stepSeq(f, s, opp, W); return }
  const a = f.attacking ? f.currentAttack : null, m = a?.nj
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const md = m.md, t = a.total - a.timer
  if (!md.dive && !md.pound && !md.tornado) f.facing = m.dir
  // travel (Skate Slide / Sword Lunge): stops in front of the foe, never through
  if (md.travel && t >= md.travel.from && t < md.travel.to) {
    let x = f.x + m.dir * md.travel.px
    if (opp && opp.health > 0) { const oL = opp.x, oR = opp.x + opp.w; if (m.dir > 0 && f.x + f.w <= oL + 1) x = Math.min(x, oL - f.w); if (m.dir < 0 && f.x >= oR - 1) x = Math.max(x, oR) }
    f.x = Math.max(0, Math.min(sw(W) - f.w, Math.round(x))); f.vx = 0
  }
  // HAWK DIVE: diagonal dive kick for its active frames
  if (md.dive && t >= md.startup && t < md.startup + md.active && !grounded(f)) { f.vx = m.dir * md.dive.vx; f.vy = md.dive.vy }
  if (md.dive && grounded(f) && t >= md.startup && a.timer > md.recovery) a.timer = md.recovery
  // GROUND POUND: drop; the landing ring is a ground shockwave that hits OTG
  if (md.pound) {
    if (!grounded(f)) { f.vx = 0; f.vy = md.pound.vy; if (a.timer < 3) a.timer = 3 }
    else if (!m.landed) {
      m.landed = true; a.timer = md.pound.recovery
      s.lastShock = { x: Math.round(ctrX(f)), y: Math.round(f.y + (f.h || 100)), t: 14, reach: md.pound.reach }
      cue(s, 'pound')
      if (opp && grounded(opp) && Math.abs(ctrX(opp) - ctrX(f)) <= md.pound.reach + (opp.w || 60) / 2) {
        const otg = opp.health > 0 && ((opp.knockdownTimer || 0) > 0 || opp.knockdownState)
        if (otg) opp.invulnTimer = 0   // the shockwave is the OTG tool
        ninjaStrike(f, opp, { dmg: md.pound.dmg, hitstun: 28, kbx: Math.sign(ctrX(opp) - ctrX(f)) * 6 || 6, kby: -6, move: 'ground_pound', blockstun: 16 }, W)
      }
    }
  }
  // AIR NINJA TORNADO: the drill travels 50% screen, 5 hits × 13; in the air on the angle held (0 / ±30°)
  if (md.tornado && t >= md.startup && m.tor) {
    const T = md.tornado, k = m.tor
    if (k.t === 0) { k.vy = m.air ? (raw.up && !raw.down ? -0.577 : raw.down && !raw.up ? 0.577 : 0) : 0; cue(s, 'tornado') }
    if (k.t < T.frames) {
      const dx = SCREEN * T.distPct / T.frames
      f._rooted = true
      f.x = Math.max(0, Math.min(sw(W) - f.w, Math.round(f.x + m.dir * dx))); f.vx = 0
      if (m.air) { const floor = f._rangerFloorY != null ? f._rangerFloorY - (f.h || 100) : f.y; f.y = Math.min(floor, Math.round(f.y + k.vy * dx)); f.vy = 0 }
      if (k.t % T.every === 0 && k.hits < T.hits && opp && overlap({ x: f.x - 16, y: f.y - 10, w: (f.w || 60) + 32, h: (f.h || 100) + 20 }, hurtOf(opp))) {
        k.hits++
        const r = ninjaStrike(f, opp, { dmg: T.dmg * m.revMul, hitstun: 16, blockstun: 10, kbx: m.dir * 3, kby: k.hits === T.hits ? -9 : -2, move: 'air_ninja_tornado', hitstop: 3, chip: 0.15 }, W)
        if (r) cue(s, 'tornadoHit')
      }
      k.t++
      if (k.t >= T.frames) { f._rooted = false; if (m.air) f.vy = 1 }
    }
  }
  // SHOTS + TRAP leave on the move's active frame
  if (!m.fired && t >= md.startup) {
    m.fired = true
    if (md.shot === 'beam') shoot(f, s, m.air ? 'beamDiag' : 'beam', W, { revMul: m.revMul })
    else if (md.shot === 'crescent') shoot(f, s, 'crescent', W, { revMul: m.revMul })
    else if (md.shot === 'kunai') {
      if (m.air) for (const vy of [1.5, 4, 6.5]) shoot(f, s, 'kunai', W, { vyMul: vy, revMul: m.revMul })
      else shoot(f, s, 'kunai', W, { revMul: m.revMul })
    }
    else if (md.trap) { plantTrap(f, ctrX(f) + m.dir * 120, W); const tr = s.traps[s.traps.length - 1]; if (tr) tr.rev = Math.round((m.revMul - 1) * 10) }
  }
}

// ── the "↓↓" prefix: two separate ↓ press edges within 18 ticks (sim ticks, from the direction history) ──
function downDouble(s, win = 18) {
  const h = s.dirs.slice(-win); let n = 0, prev = false
  for (const d of h) { const dn = d <= 3; if (dn && !prev) n++; prev = dn }
  return n >= 2
}
const fresh = (s, k, win = 8) => s.edges[k] && s.used[k] !== s.edges[k].tick && s.clock - s.edges[k].clock <= win
const use = (s, k) => { if (s.edges[k]) s.used[k] = s.edges[k].tick }
const CHAIN = { light: 'str1', str1: 'str2', str2: 'str3' }
const SPECIAL_FROM = ['light', 'str1', 'str2', 'str3', 'heavy', 'low', 'up', 'lunge', 'skate', 'air', 'airHeavy']

export function updateNsWindCommandCombat(f, inp, opp, W) {
  if (!isNsWind(f)) return false
  const s = ninjaState(f), g = grounded(f), shane = isShane(f)
  const a = f.attacking ? f.currentAttack : null
  if (f.health <= 0 || f.isGrabbed || f.hitstop > 0 || s.seq || s.counter || s.swap || s.vanish) return 'consumed'
  // STREAK STRIKE: an attack pressed during the streak hits on the way through
  if (s.streak) {
    for (const k of ['light', 'heavy', 'upAttack']) if (fresh(s, k, 4)) { use(s, k); s.streak.strike = true }
    return 'consumed'
  }
  // ── CHARGE family ("Teleport") ──
  const ch = s.edges.charge
  if (ch && s.used.charge !== ch.tick) {
    const age = s.clock - ch.clock
    const lh = fresh(s, 'light', 6) && fresh(s, 'heavy', 6) && Math.abs(s.edges.light.clock - s.edges.heavy.clock) <= 4
    if (lh && inp.charge !== false) { use(s, 'charge'); use(s, 'light'); use(s, 'heavy'); startVanish(f, opp, inp, W); return 'consumed' }
    if ((f.blockstun || 0) > 0) { /* only Vanish (escape) works in blockstun */ }
    else if (age >= 3) {   // resolve a lone Charge after 3 ticks (room for the Light+Heavy chord)
      use(s, 'charge')
      if (ch.fwd) startBarrier(f, W)
      else if (downDouble(s, 22)) startMirror(f, opp, W)
      else if (inMirror(f)) startSwap(f, W)
      return 'consumed'
    } else return 'consumed'
  }
  if ((f.blockstun || 0) > 0 || f.hitstun > 0 || f.knockdownState) return 'consumed'
  // burrowed: only Tremor Streak (tick), Swap (above) and the release-to-erupt (ninja.js) work
  if (s.burrow) return 'consumed'
  // streak recovery: 14 f; specials may cancel it on its frames 9–14
  const recSpecials = s.chainRec > 0 && s.chainRec <= 6
  if (s.chainRec > 0 && !recSpecials) return 'consumed'
  const contact = !!a?.nj?.clean && cancelWindowOpen(f)
  // ── ULTIMATE button: Ninja Mirror → Ultimate (2 bars); otherwise the Super (1 bar) ──
  if (fresh(s, 'ultimate')) {
    use(s, 'ultimate')
    if (!a || contact) startNsMove(f, inMirror(f) ? 'ult' : 'super', W, { cancel: !!a })
    return 'consumed'
  }
  // ── SPECIAL ──
  if (fresh(s, 'special')) {
    const e = s.edges.special; use(s, 'special')
    if (a && !contact && !recSpecials) return 'consumed'
    if (!a || SPECIAL_FROM.includes(a.name) || recSpecials) {
      const dbl = motionDone(s, [2, 3, 6, 2, 3, 6], 30)
      if (dbl) { startNsMove(f, inMirror(f) ? 'ult' : 'super', W, { cancel: !!a }); return 'consumed' }
      if (shane) startNsMove(f, 'tornado', W, { cancel: !!a })
      else if (g && (downDouble(s) || e.down || true)) startBurrow(f, W)   // Dustin: ↓↓+Special (neutral Special also burrows)
    }
    return 'consumed'
  }
  // ── LIGHT ──
  if (fresh(s, 'light')) {
    use(s, 'light')
    const qcf = motionDone(s, [2, 3, 6], 14), qcb = motionDone(s, [2, 1, 4], 14)
    if ((qcf || qcb) && (!a || contact || recSpecials)) {
      if (qcf) startNsMove(f, 'beam', W, { cancel: !!a })
      else startNsMove(f, shane ? 'kunai' : 'trap', W, { cancel: !!a })
      return 'consumed'
    }
    if (contact && CHAIN[a.name]) { startNsMove(f, CHAIN[a.name], W, { cancel: true }); return 'consumed' }
    if (!a) startNsMove(f, !g ? 'air' : inp.down ? 'low' : 'light', W)
    return 'consumed'
  }
  // ── HEAVY / UP-ATTACK ──
  if (fresh(s, 'heavy') || fresh(s, 'upAttack')) {
    const k = fresh(s, 'upAttack') ? 'upAttack' : 'heavy', e = s.edges[k]; use(s, k)
    if (a && !contact) return 'consumed'
    let mv
    if (!g) mv = inp.down || e.down ? 'down_air' : 'airHeavy'
    else if (k === 'upAttack' || e.up) mv = 'up'
    else if (e.down && e.fwd) mv = shane ? 'skate' : 'low'
    else if (e.down) mv = 'low'
    else if (e.fwd) mv = shane ? 'gale' : 'lunge'
    else mv = 'heavy'
    if (!a || ['light', 'str1', 'str2', 'low'].includes(a.name) || (mv === 'gale' && contact)) startNsMove(f, mv, W, { cancel: !!a })
    return 'consumed'
  }
  if (!a && (f.attackCooldown > 0 || inp.block)) return 'grab'
  return a ? 'consumed' : 'grab'
}

// movement lock for game.js updateMovementInput
export const nsWindLocked = f => isNsWind(f) && (ninjaLocked(f) || (f.attacking && !f.currentAttack?.launcher && grounded(f)) || (f._ninja?.chainRec > 6))
export { isBurrowed }
