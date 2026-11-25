// dinoSupers.js — MSV1-DINO: the Dino Thunder Rangers' SUPERS (1 bar, ↓↘→↓↘→ + Special, or Ultimate with one bar) and the
// team ULTIMATE (Ultimate on the full meter). Scripted on the sim clock (elapsed frames of the engine move); all state on
// f._ninja.sup (GAME_STATE: plain numbers). X = ninja.js NINJA_API (no engine imports). Every hit goes through X.nsStrike
// (the engine damage choke-point) with the combo scale taken at the start. dinoFx.js draws the riders / Zord heads /
// afterimages / beam from sup.* (render-only reads).
//   RED    RAPTOR RIDER STAMPEDE  the large Red rider charges across the stage: 4 hits                       260
//   BLUE   TRICERA ZORD RAM       DINO ZORD poses → sparkle → rings → the Tricera head charges: catch + splat  280
//   YELLOW PTERA ZORD STRIKE      rings → the Ptera head swoops the top half (anti-air) then dives            270
//   WHITE  DRAGO SWORD STORM      afterimage blitz: 6 slashes from 6 directions                               280
//   TEAM   Z-REX BLASTER          cinematic: caster close-up → the team arrives → 3·2·1 → BOOM → braided beam
//                                 6 × 40 → final blast 160 = 400. The foe is frozen until the beam; on block 30 % chip.
const W = f => f.w || 48
function begin(f, opp, s, a, X, o = {}) {
  if (a._supInit) return s.sup
  a._supInit = true
  s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: a.name, form: f.rosterKey, dir: f.facing || 1, x0: Math.round(X.ctrX(f)), floor: Math.round(f._rangerFloorY ?? X.feetY(f)), hide: o.hide || null }
  if (opp) opp.hitstop = Math.max(opp.hitstop || 0, o.freeze ?? 8)
  X.cue(f, o.cue || 'superStart')
  return s.sup
}
const inReach = (f, opp, X, pct) => opp && opp.health > 0 && Math.abs(X.ctrX(opp) - X.ctrX(f)) <= X.RANGER_SCREEN * pct + W(f)
function hit(f, opp, s, X, dmg, o = {}) {
  const u = s.sup
  if (u.res === 'whiff' || (u.res === 'blocked' && !o.first && !o.chip)) return false
  const r = X.nsStrike(f, opp, dmg, { fixedScale: u.scale, locked: u.res === 'hit', hitstun: o.hitstun ?? 60, kb: o.kb ?? 0, launch: o.launch, knockdown: o.knockdown,
    move: u.kind, damageType: o.type || 'blunt', blockstun: 24, sparkX: o.sx, cue: o.cue })
  if (o.first) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
  if (r === true) { u.hits++; u.dmg += dmg }
  if (r === 'blocked' && o.chip) { const extra = dmg * (o.chip - 0.1) * u.scale; if (extra > 0) X.world()?.damage?.(opp, Math.min(extra, Math.max(0, opp.health - 1)), { source: 'ability', attacker: f, move: u.kind, damageType: o.type || 'energy' }) }
  return r
}
const hold = (opp, u) => { if (opp && u.res === 'hit') { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.6 } }

// RED — RAPTOR RIDER STAMPEDE: the rider enters from behind (t 8) and runs 70 % of the screen past Conner by t 56;
// every 8 frames while overlapping the foe: 65 (4 hits max), the last launches.
export const RED_SUPER = { from: 8, to: 56, dist: 0.85, every: 8, dmg: 65, n: 4, total: 96 }
export function redSuper(f, opp, s, a, t, X) {
  const S = RED_SUPER, u = begin(f, opp, s, a, X)
  if (t < S.from) { X.setPose(f, 'speedUp'); return }
  const dir = u.dir, start = u.x0 - dir * 180
  if (t <= S.to) {
    u.rx = Math.round(start + dir * X.RANGER_SCREEN * S.dist * (t - S.from) / (S.to - S.from))
    if (opp && (t - S.from) % S.every === 0 && (u.hits < S.n) && Math.abs(u.rx - X.ctrX(opp)) < 90) {
      const last = u.hits === S.n - 1
      hit(f, opp, s, X, S.dmg, { first: u.res == null, type: 'blunt', cue: 'impact', hitstun: 50, kb: last ? 8 : 1, launch: last ? -14 : -3 })
    }
    if (opp && u.res === 'hit' && t < S.to) { opp.x = X.clampX(opp, u.rx + dir * 40 - W(opp) / 2); hold(opp, u) }
  } else u.rx = null
  if (t === S.to + 1 && u.res == null) u.res = 'whiff'
}
// BLUE — TRICERA ZORD RAM: poses (0–14) → sparkle (14–20) → rings (20–30) → the head charges from behind Ethan (30 → 70)
// catch 120, carried to the wall, WALL SPLAT 160.
export const BLUE_SUPER = { pose: 14, sparkle: 20, rings: 30, from: 30, to: 70, dist: 1.0, catchDmg: 120, splatDmg: 160, total: 104 }
export function blueSuper(f, opp, s, a, t, X) {
  const S = BLUE_SUPER, u = begin(f, opp, s, a, X)
  u.phase = t < S.pose ? 'pose' : t < S.sparkle ? 'sparkle' : t < S.rings ? 'rings' : t <= S.to ? 'head' : 'done'
  if (t < S.pose) X.setPose(f, 'zord')
  if (!opp) return
  const dir = u.dir
  if (t >= S.from && t <= S.to) {
    u.hx = Math.round(u.x0 - dir * 140 + dir * X.RANGER_SCREEN * S.dist * (t - S.from) / (S.to - S.from))
    if (u.res == null && (dir > 0 ? u.hx + 120 >= X.ctrX(opp) : u.hx - 120 <= X.ctrX(opp))) hit(f, opp, s, X, S.catchDmg, { first: true, type: 'blunt', cue: 'impact', hitstun: 70, kb: 0 })
    if (u.res === 'hit') {
      opp.x = X.clampX(opp, u.hx + dir * 120 - W(opp) / 2); opp.vy = 0; hold(opp, u)
      const atWall = opp.x <= 2 || opp.x >= X.stageW() - W(opp) - 2
      if ((atWall || t === S.to) && !u.splat) { u.splat = t; X.cue(f, 'shake'); hit(f, opp, s, X, S.splatDmg, { type: 'blunt', cue: 'eruption', hitstun: 60, kb: -2, knockdown: true, launch: -8 }); X.burst(s, 'dtBoom', X.ctrX(opp), X.feetY(opp), 22) }
    }
  } else if (t > S.to) u.hx = null
  if (t === S.to + 1 && u.res == null) u.res = 'whiff'
}
// YELLOW — PTERA ZORD STRIKE: rings (0–18) → the head swoops across the TOP half (18 → 50: anti-air catch 110 when the
// foe is airborne or high) → dives onto the foe (50 → 66): 160 (a grounded foe is only hit by the dive: 270 total either way
// when the swoop connects; the dive alone deals 160).
export const YELLOW_SUPER = { rings: 18, from: 18, to: 50, diveTo: 66, swoopDmg: 110, diveDmg: 160, total: 100 }
export function yellowSuper(f, opp, s, a, t, X) {
  const S = YELLOW_SUPER, u = begin(f, opp, s, a, X)
  u.phase = t < S.rings ? 'rings' : t <= S.to ? 'swoop' : t <= S.diveTo ? 'dive' : 'done'
  if (t < S.rings) X.setPose(f, 'zord')
  if (!opp) return
  const dir = u.dir, top = u.floor - 300
  if (t >= S.from && t <= S.to) {
    const k = (t - S.from) / (S.to - S.from)
    u.px = Math.round(u.x0 - dir * 300 + dir * X.RANGER_SCREEN * 1.1 * k); u.py = Math.round(top + Math.sin(k * Math.PI) * 40)
    if (u.res == null && Math.abs(u.px - X.ctrX(opp)) < 100 && opp.y < u.floor - (opp.h || 94) - 30) hit(f, opp, s, X, S.swoopDmg, { first: true, type: 'slash', cue: 'slashHit', hitstun: 70 })
    if (u.res === 'hit') { opp.x = X.clampX(opp, u.px - W(opp) / 2); opp.y = Math.min(opp.y, u.py + 30); opp.vy = 0; hold(opp, u) }
  }
  if (t > S.to && t <= S.diveTo) {
    if (u.tx == null) { u.tx = Math.round(X.ctrX(opp)); u.ox = u.px }
    const k = (t - S.to) / (S.diveTo - S.to)
    u.px = Math.round(u.ox + (u.tx - u.ox) * k); u.py = Math.round(top + (u.floor - 80 - top) * k)
    if (t === S.diveTo) { X.burst(s, 'dtBoom', u.tx, u.floor, 22); if (Math.abs(u.tx - X.ctrX(opp)) < 120) hit(f, opp, s, X, S.diveDmg, { first: u.res == null, type: 'slash', cue: 'eruption', hitstun: 50, knockdown: true, launch: -10, kb: 4 }) }
  }
  if (t > S.diveTo) u.px = null
  if (t === S.diveTo + 1 && u.res == null) u.res = 'whiff'
}
// WHITE — DRAGO SWORD STORM: Trent vanishes into afterimages (t 6) and slashes through the foe from 6 directions (t 14 …
// 54, every 8 f): 45 × 5 + 55 = 280. He reappears behind the foe.
export const WHITE_SUPER = { from: 14, every: 8, n: 6, dmg: [45, 45, 45, 45, 45, 55], dirs: [0, 180, 45, 225, 135, 315], total: 92 }
export function whiteSuper(f, opp, s, a, t, X) {
  const S = WHITE_SUPER, u = begin(f, opp, s, a, X, { hide: [6, 64] })
  if (t < 6) X.setPose(f, 'zord')
  if (!opp) return
  if (t === 8 && !inReach(f, opp, X, 0.55)) u.res = 'whiff'
  for (let i = 0; i < S.n; i++) if (t === S.from + i * S.every) {
    u.slash = { i, ang: S.dirs[i], x: Math.round(X.ctrX(opp)), y: Math.round(X.feetY(opp) - (opp.h || 94) / 2), t }
    hit(f, opp, s, X, S.dmg[i], { first: i === 0, type: 'slash', cue: 'slashHit', hitstun: 60, kb: i === S.n - 1 ? 7 : 0, launch: i === S.n - 1 ? -12 : -2 })
  }
  if (u.res === 'hit' && t < S.from + S.n * S.every) hold(opp, u)
  if (t === 64) { const side = Math.sign(X.ctrX(f) - X.ctrX(opp)) || -1; f.x = X.clampX(f, X.ctrX(opp) - side * 90 - W(f) / 2); f.facing = side > 0 ? -1 : 1; X.setPose(f, 'nsStreakStrike') }
}
// TEAM — Z-REX BLASTER (Ultimate, full meter)
// TEAM — Z-REX BLASTER, a CINEMATIC (dinoFx draws the shots; the sim only keeps the clock, the freeze and the hits):
//   0  CALL      the Ranger who called it, close up                         (the foe is frozen until the beam arrives)
//   16 / 36 / 56 ARRIVE the other three Rangers leap in one at a time, each in close up
//   76 COUNT     3 · 2 · 1 over the assembled team (20 frames each)
//   136 BOOM     white flash, whip to the laser: four coloured lasers burst out, slow right down as they wrap
//                together and merge white, then accelerate into the foe
//   180… BEAM    impact explosion + 6 × 40 as it pours in; 236 FINAL BLAST 160 (= 400); the camera pulls back
// Blockable (the foe is frozen in whatever they were doing: guarding → 30 % chip); a foe frozen out of the beam's row
// (high in the air, behind) is missed. The caster is invulnerable for the whole move (sZrex invuln).
export const ZREX = { bars: 2, call: 16, arrive: [16, 36, 56], count: 76, boom: 136, beamAt: [180, 186, 192, 198, 204, 210], beamDmg: 40, blastAt: 236, blastDmg: 160, chip: 0.30, total: 264 }
export function zrexBlaster(f, opp, s, a, t, X) {
  const Z = ZREX, u = begin(f, opp, s, a, X, { cue: 'ultStart', freeze: Z.beamAt[0] })
  u.phase = t < Z.call ? 'call' : t < Z.count ? 'arrive' : t < Z.boom ? 'count' : t < Z.blastAt ? 'beam' : 'blast'
  u.t = t
  if (Z.arrive.some(at => t === at + 10)) X.cue(f, 'swapChime')                     // a Ranger lands
  if (t === Z.count || t === Z.count + 20 || t === Z.count + 40) X.cue(f, 'tick')     // 3 · 2 · 1
  if (t === Z.boom) X.cue(f, 'boom')
  if (t < Z.boom) X.setPose(f, 'win'); else X.setPose(f, 'idle')
  if (!opp) return
  const dir = u.dir, cy = X.feetY(f) - (f.h || 94) * 0.55
  if (u.tx == null) { u.tx = Math.round(X.ctrX(opp)); u.ty = Math.round(X.ctrY ? X.ctrY(opp) : opp.y + 40) }   // where the foe was frozen
  if (t >= Z.boom) u.beam = { y: Math.round(cy), dir, t: t - Z.boom }
  else u.beam = null
  Z.beamAt.forEach((at, i) => {
    if (t !== at) return
    // the drawn beam always ends where the foe was frozen (u.tx / u.ty, any height, either side), so the first beam connects
    // when the foe is still there (an airborne foe included); only a foe that got away from that spot is missed. Later
    // beams follow the first one's result (hit() skips them on a whiff) — the foe falling out of the row no longer drops them.
    const there = i > 0 || (Math.abs(X.ctrX(opp) - u.tx) <= 140 && Math.abs((X.ctrY ? X.ctrY(opp) : opp.y + 40) - u.ty) <= 140)
    if (!there) { if (i === 0) u.res = 'whiff'; return }
    hit(f, opp, s, X, Z.beamDmg, { first: i === 0, type: 'energy', cue: 'zap', hitstun: 50, kb: 0, chip: Z.chip })
  })
  if (u.res === 'hit' && t < Z.blastAt) hold(opp, u)
  if (t === Z.blastAt && u.res !== 'whiff') {   // the beam detonates on the target
    u.blast = { x: Math.round(X.ctrX(opp)), y: Math.round(X.ctrY ? X.ctrY(opp) : opp.y + 40), t }
    hit(f, opp, s, X, Z.blastDmg, { type: 'energy', cue: 'slashHit', hitstun: 50, kb: 8, launch: -12, knockdown: true, chip: Z.chip }); X.cue(f, 'shake')
  }
}
export const DINO_SUPERS = { dt_red: redSuper, dt_blue: blueSuper, dt_yellow: yellowSuper, dt_white: whiteSuper }
