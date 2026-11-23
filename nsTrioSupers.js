// nsTrioSupers.js — NS TRIO: the Rangers' own SUPERS / ULTIMATES. Scripted on the sim clock (elapsed frames of the
// engine move), all state on f._ninja.sup (GAME_STATE). X = ninja.js NINJA_API (no engine imports). Every hit goes through
// X.nsStrike (the engine damage choke-point) with a fixed scale taken at the start; doubles / partners never land the KO.
//   TORI   — TSUNAMI           (1 bar, ↓↘→↓↘→ + Special / Ultimate)  a wall of water carries the foe, then crashes      310
//   BLAKE  — THUNDER STORM     (1 bar)                               five bolts rain on the foe, then a Navy Antler dive 320
//   CAM    — SUPER SAMURAI      (1 bar)                               five saber crossings (Cyber Cam takes two), final cut 310
//   In the Ninja Mirror (2 bars) each becomes its ×1.25 version and ends the Mirror.
//   TRIO   — THUNDERSTORM TRINITY (FULL meter, ↓↘→↓↘→ + Special + Heavy): Tori's geyser launches, Blake's lightning lands,
//            Cam's saber cuts, then all three strike together.                                                        440
const W = f => f.w || 48
function begin(f, opp, s, a, X, o = {}) {
  if (a._supInit) return s.sup
  a._supInit = true
  s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: a.name, mul: a.name === 'sUlt' ? 1.25 : 1 }
  if (opp) opp.hitstop = Math.max(opp.hitstop || 0, o.freeze ?? 10)
  X.burst(s, 'smoke', X.ctrX(f), X.feetY(f), 18, { big: true }); X.cue(f, o.cue || 'superStart')
  if (o.clones) X.startCloneJob(f, opp, { count: o.clones, steps: { sign: 0, pop: 2, fan: [9999, 9999], strike: 99999, exit: o.exit || 84 } })
  return s.sup
}
const inReach = (f, opp, X, pct) => opp && opp.health > 0 && Math.abs(X.ctrX(opp) - X.ctrX(f)) <= X.RANGER_SCREEN * pct + W(f)
function hit(f, opp, s, X, dmg, o = {}) {
  const u = s.sup
  if (u.res === 'whiff' || (u.res === 'blocked' && !o.first)) return false
  const r = X.nsStrike(f, opp, Math.round(dmg * (u.mul || 1)), { fixedScale: u.scale, locked: u.res === 'hit', hitstun: o.hitstun ?? 60, kb: o.kb ?? 0, launch: o.launch, knockdown: o.knockdown,
    move: o.move || u.kind, damageType: o.type || 'blunt', noKO: !!o.noKO, blockstun: 22, sparkX: o.sx, cue: o.cue })
  if (o.first) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
  if (r === true) { u.hits++; u.dmg += dmg }
  return r
}
const hold = (opp, u) => { if (opp && u.res === 'hit') { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.6 } }
const live = s => s.clones.filter(c => !c.dead)
const floorOf = (f, X) => f._rangerFloorY ?? X.feetY(f)
const endUlt = (f, s, X, t, at) => { if (t === at && s.sup?.kind === 'sUlt' && s.mirror) X.endMirror(f, s, 'ult') }

// TORI — TSUNAMI: the fin is raised (6), a wall of water rolls out from her (14 → 50, 60% of the screen); when its front
// reaches the foe it catches (60) and carries them (4 × 40 every 8 frames), then crashes into a geyser (90, launches).
export const TORI_SUPER = { raise: 6, from: 14, to: 50, dist: 0.6, catch: 60, carryDmg: 40, carryEvery: 8, carryN: 4, crashAt: 62, crash: 90, total: 92 }
export function toriSuper(f, opp, s, a, t, X) {
  const S = TORI_SUPER, u = begin(f, opp, s, a, X, { cue: 'superStart' })
  if (t === S.raise) X.setPose(f, 'stance')
  if (!opp) return
  const dir = f.facing || 1, x0 = u.wx0 ?? (u.wx0 = X.ctrX(f) + dir * 30)
  if (t >= S.from && t <= S.to) {
    const wx = x0 + dir * X.RANGER_SCREEN * S.dist * (t - S.from) / (S.to - S.from)
    u.tide = { x: Math.round(wx), dir, h: 150 + Math.min(60, (t - S.from) * 3) }
    const ox = X.ctrX(opp)
    if (u.res == null && (dir > 0 ? wx >= ox - 30 : wx <= ox + 30)) hit(f, opp, s, X, S.catch, { first: true, type: 'energy', cue: 'tornadoHit', hitstun: 50 })
    if (u.res === 'hit') {
      opp.x = X.clampX(opp, wx + dir * 10 - W(opp) / 2); opp.y = Math.min(opp.y, floorOf(f, X) - (opp.h || 94) - 40); opp.vy = 0
      u.carry = (u.carry || 0) + 1
      if (u.carry % S.carryEvery === 0 && u.carry / S.carryEvery <= S.carryN) hit(f, opp, s, X, S.carryDmg, { type: 'energy', cue: 'tornadoHit', noKO: true })
    }
    if (t % 3 === 0) X.burst(s, 'water', wx, floorOf(f, X), 12, { dir })
  }
  if (t === S.to + 1 && u.res == null) u.res = 'whiff'
  if (t < S.crashAt) hold(opp, u)
  if (t === S.crashAt) {
    u.tide = null
    if (u.res === 'hit') { X.burst(s, 'geyser', X.ctrX(opp), floorOf(f, X), 26, { h: 260, w: 120 }); hit(f, opp, s, X, S.crash, { type: 'energy', launch: -20, kb: 3, hitstun: 50, knockdown: true, cue: 'eruption' }); X.cue(f, 'shake') }
    X.setPose(f, 'superFinish')
  }
  endUlt(f, s, X, t, S.crashAt + 8)
}

// BLAKE — THUNDER STORM: he raises the Thunder Staff (8) — five bolts land on the foe's spot, each locked 6 frames before
// it lands (44 each), then he drops out of the sky with the Navy Antler (100, knockdown).
export const BLAKE_SUPER = { raise: 6, bolts: [18, 26, 34, 42, 50], boltDmg: 44, lead: 6, diveAt: 62, dive: 100, reach: 0.6, total: 84 }
export function blakeSuper(f, opp, s, a, t, X) {
  const S = BLAKE_SUPER, u = begin(f, opp, s, a, X, { cue: 'superStart' })
  if (t === S.raise) X.setPose(f, 'swordRise')
  if (!opp) return
  if (t === S.raise && !inReach(f, opp, X, S.reach)) u.res = 'whiff'
  S.bolts.forEach((at, i) => {
    if (t === at - S.lead) { u.mark = Math.round(X.ctrX(opp)); X.burst(s, 'crackle', u.mark, floorOf(f, X), S.lead + 2) }
    if (t !== at || u.mark == null) return
    X.burst(s, 'bolt', u.mark, floorOf(f, X), 18, { h: 560 })
    if (Math.abs(X.ctrX(opp) - u.mark) <= 60) hit(f, opp, s, X, S.boltDmg, { first: i === 0 || u.res == null, type: 'energy', cue: 'beam', hitstun: 50, noKO: true })
    else if (i === 0) u.res = 'whiff'
  })
  if (t < S.diveAt) hold(opp, u)
  if (t === S.diveAt - 8 && u.res === 'hit') { f.x = X.clampX(f, X.ctrX(opp) - (f.facing || 1) * 30 - W(f) / 2); f.y = opp.y - 160; f.vy = 14; f.onGround = false; f.grounded = false; X.setPose(f, 'superDive') }
  if (t === S.diveAt && u.res === 'hit') { hit(f, opp, s, X, S.dive, { type: 'slash', launch: -9, kb: 8, knockdown: true, hitstun: 50, cue: 'slashHit' }); X.burst(s, 'bolt', X.ctrX(opp), floorOf(f, X), 22, { h: 560 }); X.cue(f, 'shake') }
  endUlt(f, s, X, t, S.diveAt + 8)
}

// CAM — SUPER SAMURAI: the amulet flares (6), Cam and his Cyber double cross through the foe five times from alternating
// sides (40 each; the double takes crossings 2 and 4), then a rising Samurai Saber cut (110, launches).
export const CAM_SUPER = { flare: 6, cross: [14, 22, 30, 38, 46], crossDmg: 40, finishAt: 60, finish: 110, reach: 0.45, total: 88 }
export function camSuper(f, opp, s, a, t, X) {
  const S = CAM_SUPER, u = begin(f, opp, s, a, X, { clones: 1, exit: 70, cue: 'superStart' })
  if (t === S.flare) X.burst(s, 'aura', X.ctrX(f), X.feetY(f), 24)
  if (!opp) return
  S.cross.forEach((at, i) => {
    if (t !== at) return
    if (i === 0 && !inReach(f, opp, X, S.reach)) { u.res = 'whiff'; return }
    const ox = X.ctrX(opp), side = i % 2 ? 1 : -1, dbl = (i === 1 || i === 3) && live(s)[0]
    if (dbl) { const c = live(s)[0]; c.phase = 'strike'; c.pose = 'swordMove'; c.x = ox + side * 80; c.feet = floorOf(f, X); c.dir = -side }
    else { f.x = X.clampX(f, ox + side * 80 - W(f) / 2); f.facing = -side; X.setPose(f, 'swordMove') }
    X.burst(s, 'leaf', ox, floorOf(f, X), 12, { dir: -side })
    hit(f, opp, s, X, S.crossDmg, { first: i === 0, noKO: !!dbl, type: 'slash', cue: 'streakHit', sx: ox })
  })
  if (t < S.finishAt) hold(opp, u)
  if (t === S.finishAt - 6 && u.res === 'hit') { f.x = X.clampX(f, X.ctrX(opp) - (f.facing || 1) * 60 - W(f) / 2); X.setPose(f, 'swordRise') }
  if (t === S.finishAt && u.res === 'hit') { hit(f, opp, s, X, S.finish, { type: 'slash', launch: -18, kb: 4, knockdown: true, hitstun: 50, cue: 'slashHit' }); X.burst(s, 'star', X.ctrX(f), X.feetY(f), 16); X.cue(f, 'shake') }
  endUlt(f, s, X, t, S.finishAt + 8)
}

// TRIO — THUNDERSTORM TRINITY (full meter). The real body steps out (alpha 0, nsTrio alpha) and the three Rangers appear as
// partners drawn by nsTrioFx from s.sup.trio: Tori geysers the foe up (90), Blake's lightning lands twice (2 × 55), Cam cuts
// three times in the air (3 × 40), then all three strike at once (120, knockdown). The ACTIVE form lands the last hit.
export const TRIO_ULT = { reach: 0.6, tori: 12, blake: [32, 40], cam: [54, 60, 66], all: 82, total: 104, geyser: 90, bolt: 55, cut: 40, final: 120, bars: 2 }
export function trioUlt(f, opp, s, a, t, X) {
  const U = TRIO_ULT
  if (!a._supInit) {
    a._supInit = true
    s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: 'sTrio', mul: 1, trio: [] }
    if (opp) opp.hitstop = Math.max(opp.hitstop || 0, 10)
    for (const form of ['ns_blue', 'ns_navy', 'ns_green']) X.burst(s, 'smokeFade', X.ctrX(f), X.feetY(f), 24, { form })
    X.cue(f, 'ultStart')
  }
  const u = s.sup; if (!opp) return
  const ox = X.ctrX(opp), floor = floorOf(f, X), oy = X.feetY(opp)
  // the ACTIVE form is drawn ON the real (hidden) body, so the engine's super afterimage of the body sits under it, not beside it
  const actor = (form, dx, dy, pose, alpha = 1) => { const own = form === f.rosterKey, x = own ? X.ctrX(f) : ox + dx; u.trio = u.trio.filter(p => p.form !== form); u.trio.push({ form, x: Math.round(x), feet: Math.round(own ? floor : dy), pose, dir: x > ox ? -1 : 1, alpha }) }
  if (t === 8 && !inReach(f, opp, X, U.reach)) u.res = 'whiff'
  if (t === U.tori - 6) actor('ns_blue', -110, floor, 'stance')
  if (t === U.tori) { X.burst(s, 'geyser', ox, floor, 26, { h: 280, w: 120 }); hit(f, opp, s, X, U.geyser, { first: true, type: 'energy', launch: -20, noKO: true, cue: 'eruption' }) }
  if (t === U.blake[0] - 8) actor('ns_navy', 120, floor - 190, 'swordRise')
  U.blake.forEach(at => { if (t === at) { X.burst(s, 'bolt', ox, floor, 18, { h: 560 }); hit(f, opp, s, X, U.bolt, { type: 'energy', noKO: true, cue: 'beam' }) } })
  U.cam.forEach((at, i) => { if (t === at) { actor('ns_green', (i % 2 ? 1 : -1) * 70, oy, 'swordMove'); X.burst(s, 'leaf', ox, oy, 12, { dir: i % 2 ? -1 : 1 }); hit(f, opp, s, X, U.cut, { type: 'slash', noKO: true, cue: 'streakHit' }) } })
  if (u.res === 'hit' && t < U.all) { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (t > U.tori + 10) { opp.vy = 0; opp.y = Math.max(opp.y, floor - (opp.h || 94) - 170) } }
  if (t === U.all - 6) { f.x = X.clampX(f, ox - (f.facing || 1) * 70 - W(f) / 2); actor('ns_blue', -90, floor, 'superFinish'); actor('ns_navy', 0, oy - 120, 'superDive'); actor('ns_green', 90, floor, 'swordRise') }
  if (t === U.all) {
    X.burst(s, 'geyser', ox - 40, floor, 22, { h: 220, w: 90 }); X.burst(s, 'bolt', ox, floor, 22, { h: 560 }); X.burst(s, 'star', ox, floor, 16); X.cue(f, 'shake')
    hit(f, opp, s, X, U.final, { type: 'energy', launch: -16, kb: 8, knockdown: true, hitstun: 50, cue: 'eruption' })
  }
  if (t > U.all + 12) u.trio = []
  if (t === U.total - 14) X.burst(s, 'smokeFade', X.ctrX(f), X.feetY(f), 20, { form: f.rosterKey })
}
