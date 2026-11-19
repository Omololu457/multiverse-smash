// nsSupers.js — MSV1 supers / ultimates for Shane (ns_red) and Dustin (ns_yellow). Scripted on the sim clock (elapsed
// frames of the engine move), all state on f._ninja.sup (GAME_STATE). X = ninja.js NINJA_API (no engine imports).
// Damage: every hit goes through X.nsStrike → the engine damage choke-point with a fixed scale taken at the start.
// Clones / the illusion never land the KO (noKO); the REAL ninja lands the last hit.
const W = f => f.w || 48
function begin(f, opp, s, a, X, o = {}) {
  if (a._supInit) return s.sup
  a._supInit = true
  s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: a.name }
  if (opp) opp.hitstop = Math.max(opp.hitstop || 0, o.freeze ?? 10)
  X.burst(s, 'smoke', X.ctrX(f), X.feetY(f), 18, { big: true }); X.cue(f, o.cue || 'superStart')
  if (o.clones) X.startCloneJob(f, opp, { count: 2, steps: { sign: 0, pop: 2, fan: [9999, 9999], strike: 99999, exit: o.exit || 84 } })
  return s.sup
}
const inReach = (f, opp, X, pct) => opp && opp.health > 0 && Math.abs(X.ctrX(opp) - X.ctrX(f)) <= X.RANGER_SCREEN * pct + W(f)
function hit(f, opp, s, X, dmg, o = {}) {
  const u = s.sup
  if (u.res === 'whiff' || (u.res === 'blocked' && !o.first)) return false
  const r = X.nsStrike(f, opp, dmg, { fixedScale: u.scale, locked: u.res === 'hit', hitstun: o.hitstun ?? 60, kb: o.kb ?? 0, launch: o.launch, knockdown: o.knockdown,
    move: o.move, damageType: o.type || 'blunt', noKO: !!o.noKO, blockstun: 22, sparkX: o.sx, cue: o.cue })
  if (o.first) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
  if (r === true) { u.hits++; u.dmg += dmg }
  return r
}
const hold = (opp, u) => { if (opp && u.res === 'hit') { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.6 } }
const live = s => s.clones.filter(c => !c.dead)

// SHANE — STORM ASCENSION (1 bar): smoke pop, 2 clones, 6 streak hits from 6 directions (real + clones), rising tornado. 310.
export const SHANE_SUPER = { hits: [12, 20, 28, 36, 44, 52], hitDmg: 40, tornadoAt: 64, tornadoDmg: 70, reach: 0.45 }
const SIX = [[-1, 0], [1, -70], [-1, -110], [1, 0], [-1, -70], [1, -110]]   // (side, height) around the foe for each streak hit
export function shaneSuper(f, opp, s, a, t, X) {
  const S = SHANE_SUPER, u = begin(f, opp, s, a, X, { clones: true, exit: 76 })
  if (!opp) return
  S.hits.forEach((at, i) => {
    if (t !== at) return
    if (i === 0 && !inReach(f, opp, X, S.reach)) { u.res = 'whiff'; return }
    const [side, dy] = SIX[i], actor = i % 3, ox = X.ctrX(opp)
    if (actor === 0) {   // the REAL Shane streaks through from this side
      f.x = X.clampX(f, ox + side * 70 - W(f) / 2); f.facing = side > 0 ? -1 : 1; X.setPose(f, 'nsStreakStrike')
    } else {
      const c = live(s)[actor - 1]
      if (c) { c.phase = 'strike'; c.pose = 'nsStreakStrike'; c.x = ox + side * 70; c.feet = X.feetY(opp) + dy; c.dir = side > 0 ? -1 : 1 }
    }
    hit(f, opp, s, X, S.hitDmg, { first: i === 0, noKO: actor !== 0, move: 'sSuper', type: 'blunt', cue: 'streakHit', sx: ox })
    X.burst(s, 'streakTail', ox, X.feetY(opp) + dy, 10, { dir: side > 0 ? -1 : 1 })
  })
  if (t > 8 && t < S.tornadoAt && t % 8 === 4) X.setPose(f, 'nsStreak')
  if (t < S.tornadoAt) hold(opp, u)
  if (t === S.tornadoAt - 4 && u.res === 'hit') { f.x = X.clampX(f, X.ctrX(opp) - W(f) / 2); X.setPose(f, 'superTornado'); X.cue(f, 'tornado') }
  if (t === S.tornadoAt && u.res === 'hit') { hit(f, opp, s, X, S.tornadoDmg, { move: 'sSuper', type: 'energy', launch: -17, kb: 4, hitstun: 50, cue: 'tornadoHit' }); X.burst(s, 'wind', X.ctrX(f), X.feetY(f), 20) }
  if (t === S.tornadoAt + 8) X.setPose(f, 'superFinish')
}
// SHANE — HAWK MIRAGE (2 bars, Ninja Mirror only): real, illusion and 2 clones dive from 4 angles at once. 4 × 95 = 380.
export const SHANE_ULT = { rise: 4, diveAt: 30, dmg: 95, reach: 0.5 }
export function shaneUlt(f, opp, s, a, t, X) {
  const U = SHANE_ULT, u = begin(f, opp, s, a, X, { clones: true, exit: 60, cue: 'ultStart' }), m = s.mirror
  if (m) m.frozen = true
  if (!opp) return
  const ox = X.ctrX(opp), feet = X.feetY(opp)
  if (t === U.rise) {
    f.vy = -15; f.onGround = false; f.grounded = false; f.y -= 2; X.setPose(f, 'nsStreak')
    live(s).forEach((c, i) => { c.phase = 'ready'; c.pose = 'airSpin'; c.x = ox + (i ? 1 : -1) * 200; c.feet = feet - 220; c.dir = i ? -1 : 1 })
    if (m) { m.pose = 'airSpin'; m.ifeet = feet - 260 }
  }
  if (t > U.rise && t < U.diveAt) { f.vy = Math.min(f.vy, t < 16 ? f.vy : 0); if (t >= 16) f.vy = 0 }
  if (t === U.diveAt) {
    if (!inReach(f, opp, X, U.reach)) { u.res = 'whiff' }
    // UNISON STRIKE from 4 angles: clone (left), clone (right), illusion (above), real (front) — the real one lands last
    const bodies = live(s)
    bodies.forEach((c, i) => { c.phase = 'strike'; c.pose = 'superDive'; c.x = ox + (i ? 1 : -1) * 60; c.feet = feet - 20; hit(f, opp, s, X, U.dmg, { first: i === 0, noKO: true, move: 'sUlt', cue: 'impact', sx: c.x }) })
    if (m) { m.pose = 'superDive'; m.ix = X.clampX(f, ox - W(f) / 2); m.ifeet = feet - 90; hit(f, opp, s, X, U.dmg, { first: !bodies.length, noKO: true, move: 'sUlt', sx: ox }) }
    f.x = X.clampX(f, ox - (f.facing || 1) * 50 - W(f) / 2); f.y = opp.y; f.vy = 6; X.setPose(f, 'superDive')
    hit(f, opp, s, X, U.dmg, { first: !bodies.length && !m, move: 'sUlt', launch: -10, kb: 9, knockdown: true, hitstun: 50 })
    X.burst(s, 'ring', ox, feet, 20); X.cue(f, 'eruption')
  }
  if (t < U.diveAt) hold(opp, u)
  if (t === U.diveAt + 10 && s.mirror) X.endMirror(f, s, 'ult')
}

// DUSTIN — EARTHQUAKE NINJA ART (1 bar): stage shake, foe popped up, Dustin + 2 clones erupt under them in sequence,
// sword finisher. 40 + 70 + 70 + 70 + 70 = 320.
export const DUSTIN_SUPER = { popAt: 10, pop: 40, erupts: [22, 32, 42], eruptDmg: 70, finishAt: 58, finishDmg: 70, reach: 0.45 }
export function dustinSuper(f, opp, s, a, t, X) {
  const S = DUSTIN_SUPER, u = begin(f, opp, s, a, X, { clones: true, exit: 74, cue: 'quake' })
  if (!opp) return
  if (t === 2) X.cue(f, 'shake')
  if (t === S.popAt) {
    if (!inReach(f, opp, X, S.reach)) u.res = 'whiff'
    else { hit(f, opp, s, X, S.pop, { first: true, move: 'sSuper', launch: -15, kb: 0, cue: 'eruption' }); X.burst(s, 'erupt', X.ctrX(opp), X._floor?.(f) ?? X.feetY(f), 16) }
  }
  S.erupts.forEach((at, i) => {
    if (t !== at || u.res !== 'hit') return
    const ox = X.ctrX(opp), floor = f._rangerFloorY ?? X.feetY(f)
    if (i < 2) { const c = live(s)[i]; if (c) { c.phase = 'strike'; c.pose = 'up'; c.x = ox + (i ? 24 : -24); c.feet = floor } }
    else { f.x = X.clampX(f, ox - W(f) / 2); X.setPose(f, 'up'); f.vy = -10; f.onGround = false; f.grounded = false; f.y -= 2 }
    X.burst(s, 'erupt', ox, floor, 16); X.cue(f, 'eruption')
    hit(f, opp, s, X, S.eruptDmg, { move: 'sSuper', launch: -12, noKO: i < 2, cue: 'impact', sx: ox })
  })
  if (t < S.finishAt) hold(opp, u)
  if (t === S.finishAt - 6 && u.res === 'hit') X.setPose(f, 'superFinish')
  if (t === S.finishAt && u.res === 'hit') hit(f, opp, s, X, S.finishDmg, { move: 'sSuper', type: 'slash', knockdown: true, launch: -8, kb: 10, hitstun: 50, cue: 'slashHit' })
}
// DUSTIN — FAULT LINE (2 bars, Ninja Mirror only): real and illusion slam together; a shockwave travels BETWEEN them hitting
// anything in the gap (150), then all 4 bodies erupt (4 × 60). 390.
export const DUSTIN_ULT = { slamAt: 8, waveFrom: 12, waveTo: 30, waveDmg: 150, eruptAt: 38, eruptDmg: 60, reach: 0.5 }
export function dustinUlt(f, opp, s, a, t, X) {
  const U = DUSTIN_ULT, u = begin(f, opp, s, a, X, { clones: true, exit: 62, cue: 'ultStart' }), m = s.mirror
  if (m) m.frozen = true
  if (!opp) return
  if (t === U.slamAt) { X.setPose(f, 'superSlam'); if (m) m.pose = 'superSlam'; X.cue(f, 'shake'); X.burst(s, 'ring', X.ctrX(f), X.feetY(f), 16); if (m) X.burst(s, 'ring', m.ix + W(f) / 2, m.ifeet, 16) }
  if (t >= U.waveFrom && t <= U.waveTo) {
    const x0 = X.ctrX(f), x1 = m ? m.ix + W(f) / 2 : x0 + (f.facing || 1) * 384
    const wx = x0 + (x1 - x0) * (t - U.waveFrom) / (U.waveTo - U.waveFrom)
    s.sup.wave = { x0, x1, x: wx }
    if (t % 3 === 0) X.burst(s, 'dust', wx, X.feetY(f), 10)
    const ox = X.ctrX(opp), lo = Math.min(x0, x1), hi = Math.max(x0, x1)
    if (!s.sup.waveHit && ox >= lo - 20 && ox <= hi + 20 && Math.abs(wx - ox) < 40) {
      s.sup.waveHit = true
      hit(f, opp, s, X, U.waveDmg, { first: true, move: 'sUlt', launch: -14, kb: 0, cue: 'eruption' })
    }
  }
  if (t === U.waveTo + 1 && !s.sup.waveHit) u.res = inReach(f, opp, X, U.reach) ? null : 'whiff'
  if (t === U.eruptAt) {
    s.sup.wave = null
    const ox = X.ctrX(opp), floor = f._rangerFloorY ?? X.feetY(f)
    const first = !s.sup.waveHit
    live(s).forEach((c, i) => { c.phase = 'strike'; c.pose = 'up'; c.x = ox + (i ? 50 : -50); c.feet = floor; hit(f, opp, s, X, U.eruptDmg, { first: first && i === 0, noKO: true, move: 'sUlt', sx: c.x, launch: -12 }) })
    if (m) { m.pose = 'up'; m.ix = X.clampX(f, ox + 20 - W(f) / 2); m.ifeet = floor; hit(f, opp, s, X, U.eruptDmg, { noKO: true, move: 'sUlt', launch: -12 }) }
    f.x = X.clampX(f, ox - 20 - W(f) / 2); X.setPose(f, 'up'); f.vy = -10; f.onGround = false; f.grounded = false; f.y -= 2
    hit(f, opp, s, X, U.eruptDmg, { move: 'sUlt', launch: -16, knockdown: true, hitstun: 50, cue: 'eruption' })
    X.burst(s, 'erupt', ox, floor, 20)
  }
  if (t < U.eruptAt) hold(opp, u)
  if (t === U.eruptAt + 6 && s.mirror) X.endMirror(f, s, 'ult')
}
