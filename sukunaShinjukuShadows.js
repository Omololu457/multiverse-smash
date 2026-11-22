// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — TEN SHADOWS: SIMULATION of the shikigami he summons with the technique
// of the body he wears. Plain JSON on f._sks.ts (snapshotted with the rest of f._sks); sim ticks only, no RNG.
// Every shikigami is a SEPARATE helper object (never his body, never Megumi's body): it rises from a shadow pool on the
// release frame of his hand sign, acts, and sinks back. Any hit breaks it (foe attack box or foe projectile); Mahoraga
// takes 4 and adapts (a move that already hit him does nothing the second time). A hit during the hand-sign startup
// cancels the summon (it never appears). One of each kind at a time; its cooldown starts when it's gone.
// Numbers: sukunaShinjukuData.js TS. Render: sukunaShinjukuShadowsFx.js. Map + inputs: docs/msv1/sukuna/TEN_SHADOWS.md.
import { TS } from './sukunaShinjukuData.js'
import { _sksKit as K } from './sukunaShinjukuState.js'

const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const sw = W => W?.stageWidth?.() || 3200
const over = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const circleBox = (cx, cy, r, o) => { const nx = Math.max(o.x, Math.min(cx, o.x + o.w)), ny = Math.max(o.y, Math.min(cy, o.y + o.h)); return (nx - cx) ** 2 + (ny - cy) ** 2 <= r * r }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export const KIND = { kGama: 'gama', kGamaAir: 'gamaAir', kNue: 'nue', kNueAir: 'nueAir', kDogs: 'dogs', kOrochi: 'orochi', kDatto: 'datto',
  kTotality: 'kon', kElephant: 'ele', kMahoraga: 'maho' }
export const tsState = s => s.ts || (s.ts = { on: false, sum: [], rab: null, waves: [], cd: {}, dom: null, domUsed: false, n: 0,
  stats: { summons: 0, hits: 0, blocked: 0, broken: 0, projBlocked: 0, adapted: 0, cancelled: 0, pulls: 0, konHits: 0, domains: 0 } })

const fullMeter = f => f.infiniteEnergy || (f.energy || 0) >= (f.maxEnergy || 0)
// why a summon can't start right now (null = it can)
export function shadowGate(f, s, key) {
  const T = tsState(s)
  if (key === 'kChimera') return T.domUsed || T.dom ? 'used' : fullMeter(f) ? null : 'meter'
  const k = KIND[key]; if (!k) return null
  if (key === 'kMahoraga' && !fullMeter(f)) return 'meter'
  if ((T.cd[k] || 0) > 0) return 'cooldown'
  if (k === 'datto' ? T.rab : T.sum.some(z => z.k === k)) return 'out'
  return null
}
export function onShadowStart(f, s, key) {   // after the move started (meter already checked): the full-meter supers drain it
  if ((key === 'kMahoraga' || key === 'kChimera') && !f.infiniteEnergy) { s.stats.spent += f.energy || 0; f.energy = 0 }
}

// ── RELEASE (his hand sign's active frame): the shikigami rises from its shadow pool ──
export function releaseShadow(f, s, key, dir, W, opp) {
  const T = tsState(s), floor = s.floor ?? feet(f), cx = ctrX(f), foe = K.foesOf(f, W, opp)[0]
  const add = z => { T.sum.push({ dir, t: 0, hit: false, id: ++T.n, ...z }); if (T.sum.length > 8) T.sum.shift() }
  T.stats.summons++; K.cue(f, 'tsSummon', { k: KIND[key] || key })
  switch (key) {
    case 'kGama': add({ k: 'gama', x: cx + dir * TS.gama.ahead, y: floor, pull: 0, vi: -1 }); break
    case 'kGamaAir': add({ k: 'gamaAir', x: cx + dir * TS.gamaAir.ahead, y: Math.round(feet(f)), pull: 0, vi: -1 }); break
    case 'kNue': {
      const fx = foe && (ctrX(foe) - cx) * dir > 0 && Math.abs(ctrX(foe) - cx) < 320 ? ctrX(foe) : cx + dir * TS.nue.ax
      add({ k: 'nue', x: Math.round(fx), y: floor + TS.nue.ay }); break
    }
    case 'kNueAir': add({ k: 'nueAir', x: cx + dir * TS.nueAir.ax, y: Math.round(ctrY(f) + TS.nueAir.ay) }); break
    case 'kDogs':
      add({ k: 'dogs', col: 'white', x: cx + dir * 30, y: floor })
      add({ k: 'dogs', col: 'black', x: cx + dir * 30, y: floor, t: -TS.dogs.gap }); break
    case 'kOrochi': {
      const O = TS.orochi, want = foe ? (ctrX(foe) - cx) * dir : 150
      add({ k: 'orochi', x: Math.round(cx + dir * clamp(want, O.minAhead, O.range)), y: floor }); break
    }
    case 'kDatto': T.rab = { t: 0, x: Math.round(cx), y: floor, dir, alive: TS.datto.spread.map(() => 1) }; break
    case 'kTotality': add({ k: 'kon', x: cx + dir * 40, y: floor, br: 'run', vi: -1 }); break
    case 'kElephant': add({ k: 'ele', x: cx - dir * TS.ele.behind, y: floor }); break
    case 'kMahoraga': add({ k: 'maho', x: cx + dir * TS.maho.ahead, y: floor, x0: null, x1: null, hp: TS.maho.hp, adapt: [], inv: 0 }); break
    case 'kChimera': T.dom = { t: 0, x: Math.round(cx), y: floor }; T.domUsed = true; T.stats.domains++; K.cue(f, 'chimera'); break
  }
}

// ── BOXES (where a shikigami can be hit) ──
function hurtbox(z) {
  const t = z.t
  switch (z.k) {
    case 'gama': return { x: z.x - TS.gama.w / 2, y: z.y - TS.gama.h, w: TS.gama.w, h: TS.gama.h }
    case 'gamaAir': return { x: z.x - TS.gamaAir.w / 2, y: z.y - TS.gamaAir.h, w: TS.gamaAir.w, h: TS.gamaAir.h }
    case 'nue': return { x: z.x - TS.nue.w / 2, y: z.y - TS.nue.h / 2, w: TS.nue.w, h: TS.nue.h }
    case 'nueAir': return { x: z.x - TS.nueAir.w / 2, y: z.y - TS.nueAir.h / 2, w: TS.nueAir.w, h: TS.nueAir.h }
    case 'dogs': return t < 0 ? null : { x: z.x - 30, y: z.y - 40, w: 60, h: 40 }
    case 'orochi': { const O = TS.orochi; if (t < O.warn) return null; const h = O.h * Math.min(1, (t - O.warn + 1) / O.rise); return { x: z.x - O.w / 2, y: z.y - h, w: O.w, h } }
    case 'kon': return { x: z.x - 60, y: z.y - 70, w: 120, h: 70 }
    case 'ele': return { x: z.x - TS.ele.w / 2 + z.dir * 30, y: z.y - TS.ele.h, w: TS.ele.w, h: TS.ele.h }
    case 'maho': return z.t < 8 ? null : { x: z.x - TS.maho.w / 2, y: z.y - TS.maho.h, w: TS.maho.w, h: TS.maho.h }
  }
  return null
}
// a foe's live attack box or projectile on it this frame → { key } (what hit it), else null; the projectile is spent
function hitBy(f, W, box, foes) {
  if (!box) return null
  for (const o of foes) { const ab = W.attackBox?.(o); if (ab && over(ab, box)) return { key: 'm:' + (o.currentAttack?.name || o.currentMove || 'attack') } }
  const P = W.projectileList?.() || []
  for (let j = P.length - 1; j >= 0; j--) {
    const p = P[j]; if (!p || p.owner === f || p.visualOnly) continue
    const r = p.radius || (p.w || 20) / 2
    if (over({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }, box)) { if (!p.isUltimate && !p.isSuper) W.removeProjectile?.(p); return { key: 'p:' + (p.name || p.type || 'shot') } }
  }
  return null
}

function gone(f, s, T, i, why = 'sink') {
  const z = T.sum[i]; T.sum.splice(i, 1)
  K.pushFx(s, why === 'broken' ? 'tsBreak' : 'tsSink', z.x, z.y, { what: z.k, dir: z.dir, col: z.col || null, cy: z.k === 'nue' || z.k === 'nueAir' ? 1 : 0 })
  if (why === 'broken') { T.stats.broken++; K.cue(f, 'tsBroken') }
  if (!T.sum.some(o => o.k === z.k)) T.cd[z.k] = TS.cd[z.k] || 0
}
const hitOnce = (f, s, T, z, o, P, W) => {
  const r = K.strike(f, o, { type: 'impact', hitstop: 4, fx: 'tsHit', ...P }, W)
  if (r === 'hit') T.stats.hits++; else if (r === 'block') T.stats.blocked++
  return r
}

// ── PER-FRAME (after his own volumes; before his move tick) ──
export function shadowsTick(f, s, W, opp) {
  const T = s.ts; if (!T) return
  if (f.health <= 0) { T.sum.length = 0; T.rab = null; T.waves.length = 0; T.dom = null; f._sksAlpha = 0; return }
  const rate = T.dom ? TS.dom.cdRate : 1
  for (const k in T.cd) if (T.cd[k] > 0) T.cd[k] = Math.max(0, T.cd[k] - rate)
  const foes = K.foesOf(f, W, opp)
  // CHIMERA SHADOW GARDEN: his summons recharge ×2, he moves ×1.25 (tickSks), every foe is slowed (physics.js _benSlow)
  if (T.dom) {
    T.dom.t++
    for (const o of foes) o._benSlow = { ttl: 2, k: TS.dom.slow }
    if (T.dom.t >= TS.dom.frames) { T.dom = null; K.cue(f, 'chimeraEnd') }
  }
  for (let i = T.sum.length - 1; i >= 0; i--) {
    const z = T.sum[i]; z.t++
    if (z.inv > 0) z.inv--
    const by = z.t > 0 && !(z.k === 'kon' && z.br === 'hit') ? hitBy(f, W, hurtbox(z), foes) : null
    if (by) {
      if (z.k !== 'maho') { gone(f, s, T, i, 'broken'); continue }
      if (!(z.inv > 0)) {
        if (z.adapt.includes(by.key)) { T.stats.adapted++; K.cue(f, 'tsAdapt'); K.pushFx(s, 'tsWheel', z.x, z.y - TS.maho.h - 10); z.inv = 14 }
        else { z.adapt.push(by.key); if (z.adapt.length > 8) z.adapt.shift(); z.hp--; z.inv = 14; K.pushFx(s, 'block', z.x, z.y - 100); if (z.hp <= 0) { gone(f, s, T, i, 'broken'); continue } }
      }
    }
    if (tickOne(f, s, T, z, W, foes) === 'done') gone(f, s, T, i)
  }
  wavesTick(f, s, T, W, foes)
  rabbitsTick(f, s, T, W, foes)
  f._sksAlpha = T.rab ? TS.datto.alpha : 0
}

function lane(z, L) {
  const x0 = z.dir === 1 ? z.x + L.lane[0] : z.x - L.lane[1]
  return { x: x0, y: z.y - L.laneY - L.laneH / 2, w: L.lane[1] - L.lane[0], h: L.laneH }
}
function pullTo(o, x, frames) { const tx = x - (o.w || 48) / 2; o.x = Math.round(o.x + (tx - o.x) / Math.max(1, frames)); o.vx = 0 }

function tickOne(f, s, T, z, W, foes) {
  const t = z.t
  switch (z.k) {
    case 'gama': case 'gamaAir': {   // the tongue lashes along a lane; a hit drags the foe back to the toad
      const L = TS[z.k]
      if (t >= L.lashAt && t < L.lashEnd && !z.hit) {
        const box = lane(z, L)
        for (const o of foes) {
          if (!over(box, o)) continue
          z.hit = true
          const r = hitOnce(f, s, T, z, o, { raw: L.raw, hitstun: L.hitstun, kbx: 0, kby: 0, chip: 0.1, dir: z.dir, move: 'sks_ts_' + z.k, fx: 'tsHit' }, W)
          if (r === 'hit') { z.pull = L.pull; z.vi = foes.indexOf(o); T.stats.pulls++; K.cue(f, 'tsPull') }
          break
        }
      }
      if (z.pull > 0) { const o = foes[z.vi]; if (o) pullTo(o, z.x + z.dir * 26, z.pull); z.pull-- }
      return t >= L.life ? 'done' : null
    }
    case 'nue': case 'nueAir': {     // lightning burst around it (Nue: a long STUN)
      const N = TS[z.k]
      if (t >= N.burstAt && t < N.burstAt + N.active && !z.hit) {
        for (const o of foes) {
          if (!circleBox(z.x, z.y, N.r, o)) continue
          z.hit = true
          hitOnce(f, s, T, z, o, { raw: N.raw, hitstun: N.stun || N.hitstun, kbx: N.kbx, kby: N.kby, chip: 0.12, dir: z.dir, move: 'sks_ts_' + z.k, type: 'energy', fx: 'tsShock', hitstop: 6 }, W)
        }
        if (t === N.burstAt) K.cue(f, 'tsShock')
      }
      return t >= N.life ? 'done' : null
    }
    case 'dogs': {
      const D = TS.dogs
      if (t < 0) return null
      if (t >= 4) z.x = Math.round(z.x + z.dir * D.vx)
      if (!z.hit && t >= 4) {
        const box = { x: z.x - D.w / 2, y: z.y - D.h, w: D.w, h: D.h }
        for (const o of foes) if (over(box, o)) { z.hit = true; hitOnce(f, s, T, z, o, { raw: D.raw, hitstun: D.hitstun, kbx: D.kbx, kby: D.kby, chip: 0.1, dir: z.dir, move: 'sks_ts_dog', type: 'slash' }, W); break }
      }
      return t >= D.life || z.x < -60 || z.x > sw(W) + 60 ? 'done' : null
    }
    case 'orochi': {                 // grows out of the floor under them (launcher), then goes back down
      const O = TS.orochi
      if (t >= O.warn && t < O.warn + O.rise + O.active && !z.hit) {
        const box = { x: z.x - O.w / 2, y: z.y - O.h, w: O.w, h: O.h }
        for (const o of foes) if (over(box, o)) { z.hit = true; hitOnce(f, s, T, z, o, { raw: O.raw, hitstun: O.hitstun, kbx: 1, kby: O.kby, chip: 0.12, dir: z.dir, move: 'sks_ts_orochi', hitstop: 6 }, W) }
      }
      return t >= O.life ? 'done' : null
    }
    case 'kon': {                    // Divine Dog: Totality — a lunge; HIT → it pins them and claws, MISS → it runs through and sinks
      const C = TS.kon
      if (z.br === 'run') {
        if (t < C.run) z.x = Math.round(clamp(z.x + z.dir * C.vx, 0, sw(W)))
        if (t >= C.active[0] && t <= C.active[1] && !z.hit) {
          const box = { x: z.x - C.w / 2, y: z.y - C.h, w: C.w, h: C.h }
          for (const o of foes) {
            if (!over(box, o)) continue
            z.hit = true
            const r = hitOnce(f, s, T, z, o, { raw: C.raw[0], hitstun: C.hitstun, kbx: 0, kby: 0, chip: 0.15, dir: z.dir, move: 'sks_ts_totality', type: 'slash', hitstop: 8 }, W)
            if (r === 'hit') { z.br = 'hit'; z.t = 0; z.vi = foes.indexOf(o); z.claw = 0; T.stats.konHits++; K.cue(f, 'tsKonHit') }
            break
          }
        }
        return t >= C.missLife ? 'done' : null
      }
      const o = foes[z.vi]
      if (o && t <= C.hold) { pullTo(o, z.x + z.dir * 34, 2); o.vy = 0; o.hitstun = Math.max(o.hitstun || 0, 8) }
      if (o && z.claw < C.claws.length && t >= C.claws[z.claw]) {
        const last = z.claw === C.claws.length - 1
        hitOnce(f, s, T, z, o, { raw: C.raw[z.claw], hitstun: last ? C.hitstun : 20, kbx: last ? C.kbx : 0, kby: last ? C.kby : 0, chip: 0.15, dir: z.dir, move: 'sks_ts_totality', type: 'slash', unblockable: true, fx: 'tsClaw', hitstop: last ? 10 : 4 }, W)
        z.claw++
      }
      return t >= C.hitLife || !o ? 'done' : null
    }
    case 'ele': {                    // Max Elephant: rises behind him and floods a lane in front with a multi-hit water beam
      const E = TS.ele
      if (t >= E.beam[0] && t < E.beam[1] && (t - E.beam[0]) % E.every === 0) {
        const box = lane(z, E)
        for (const o of foes) if (over(box, o)) hitOnce(f, s, T, z, o, { raw: E.raw, hitstun: E.hitstun, kbx: E.kbx, kby: 0, chip: 0.1, dir: z.dir, move: 'sks_ts_elephant', type: 'water', fx: 'tsSplash' }, W)
        if (t === E.beam[0]) K.cue(f, 'tsBeam')
      }
      return t >= E.life ? 'done' : null
    }
    case 'maho': {                   // Mahoraga: pillar → rise → leap at them → land → crescent waves → back → sink
      const M = TS.maho, foe = foes[0]
      if (t === M.leapAt) { z.x0 = z.x; z.x1 = Math.round(clamp(foe ? ctrX(foe) - z.dir * M.gap : z.x + z.dir * 200, 40, sw(W) - 40)) }
      if (t > M.leapAt && t <= M.landAt && z.x1 != null) z.x = Math.round(z.x0 + (z.x1 - z.x0) * (t - M.leapAt) / (M.landAt - M.leapAt))
      if (t === M.landAt) {
        K.cue(f, 'tsLand')
        for (const o of foes) if (circleBox(z.x, z.y - 60, M.landR, o)) hitOnce(f, s, T, z, o, { raw: M.landRaw, hitstun: 24, kbx: 4, kby: -6, chip: 0.15, dir: z.dir, move: 'sks_ts_mahoraga', hitstop: 8 }, W)
      }
      if (M.slashAt.includes(t)) {
        const d = foe ? (ctrX(foe) >= z.x ? 1 : -1) : z.dir; z.dir = d
        T.waves.push({ x: z.x + d * 40, y: z.y, dir: d, t: 0, hit: [] }); if (T.waves.length > 6) T.waves.shift()
        K.cue(f, 'tsWave')
      }
      if (t > M.backAt && t <= M.sinkAt) z.x = Math.round(z.x - z.dir * M.back / (M.sinkAt - M.backAt))
      return t >= M.end ? 'done' : null
    }
  }
  return null
}

function wavesTick(f, s, T, W, foes) {
  const V = TS.maho.wave
  for (let i = T.waves.length - 1; i >= 0; i--) {
    const w = T.waves[i]; w.t++; w.x = Math.round(w.x + w.dir * V.vx)
    const box = { x: w.x - V.w / 2, y: w.y - V.h, w: V.w, h: V.h }
    for (let j = 0; j < foes.length; j++) {
      const o = foes[j]; if (w.hit.includes(j) || !over(box, o)) continue
      w.hit.push(j)
      const r = K.strike(f, o, { raw: V.raw, hitstun: V.hitstun, kbx: V.kbx, kby: V.kby, chip: 0.15, dir: w.dir, move: 'sks_ts_mahoraga_wave', type: 'slash', hitstop: 6, fx: 'tsHit' }, W)
      if (r === 'hit') T.stats.hits++
    }
    if (w.t >= V.life || w.x < -80 || w.x > sw(W) + 80) T.waves.splice(i, 1)
  }
}

// DATTO: six rabbits swarm around him (he goes see-through); each nibbles one foe it touches or eats one projectile
function rabbitsTick(f, s, T, W, foes) {
  const R = T.rab; if (!R) return
  const D = TS.datto
  R.t++; R.x = Math.round(ctrX(f)); R.y = s.floor ?? Math.round(feet(f)); R.dir = f.facing || 1
  const P = W.projectileList?.() || []
  D.spread.forEach((dx, i) => {
    if (!R.alive[i]) return
    const rx = R.x + dx, box = { x: rx - D.w / 2, y: R.y - D.h, w: D.w, h: D.h }, guard = { x: rx - 16, y: f.y - 10, w: 32, h: (f.h || 94) + 10 }
    for (let j = P.length - 1; j >= 0; j--) {
      const p = P[j]; if (!p || p.owner === f || p.visualOnly) continue
      const r = p.radius || (p.w || 20) / 2
      if (over({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }, guard)) {
        if (!p.isUltimate && !p.isSuper) W.removeProjectile?.(p)
        R.alive[i] = 0; T.stats.projBlocked++; K.cue(f, 'tsRabbit'); K.pushFx(s, 'tsSink', rx, R.y, { what: 'rabbit', dir: 1 }); return
      }
    }
    for (const o of foes) {
      const reach = { x: box.x - D.reach / 2, y: box.y - 20, w: box.w + D.reach, h: box.h + 20 }
      const ab = W.attackBox?.(o)
      if (ab && over(ab, box)) { R.alive[i] = 0; T.stats.broken++; K.pushFx(s, 'tsSink', rx, R.y, { what: 'rabbit', dir: 1 }); return }
      if (over(reach, o)) {
        hitOnce(f, s, T, R, o, { raw: D.raw, hitstun: D.hitstun, kbx: 1, kby: 0, chip: 0, dir: rx < ctrX(o) ? 1 : -1, move: 'sks_ts_datto', type: 'blunt', hitstop: 2, fx: 'spark' }, W)
        R.alive[i] = 0; K.pushFx(s, 'tsSink', rx, R.y, { what: 'rabbit', dir: 1 }); return
      }
    }
  })
  if (R.t >= D.life || !R.alive.some(Boolean)) {
    R.alive.forEach((a, i) => { if (a) K.pushFx(s, 'tsSink', R.x + D.spread[i], R.y, { what: 'rabbit', dir: 1 }) })
    T.rab = null; T.cd.datto = TS.cd.datto
  }
}
