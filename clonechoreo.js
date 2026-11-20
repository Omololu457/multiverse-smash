// clonechoreo.js — the anime CLONE CHOREOGRAPHY (MSV1, built for the Ninja Storm Rangers), shared so other characters can use it.
//
// FIVE STEPS:  hand sign → pop (smoke / splash / grow) → staggered fan-out with a little bound → break the copy
//              (per-clone tilt / offset) → short HOLD beat → UNISON strike → exit (back into smoke / water / splinters).
//
// Two consumers:
//  A. ninja.js (Shane / Dustin / every ninja.js profile): the SIM engine below (choreoStart / choreoStep / choreoTarget),
//     moved here verbatim from ninja.js §D. Clone positions / lifetimes / strike boxes live in f._ninja (GAME_STATE);
//     ninja.js passes its own helpers in as the host, so its frame data is unchanged (msv1 framediff = 0).
//  B. The Naruto-universe ghost-body clone engines (narutoChoreography.js = Naruto; cloneChoreography.js = Sasuke /
//     Tobirama / Madara / Hashirama) through CLONE_STYLE + choreoPlace / choreoPose: a PURE function of (run frame, the
//     clone's authored window, its authored spot) that tells where the copy is while it arrives / holds / leaves.
//     Arrival is always finished before the clone's first authored hit frame and the exit happens after its authored
//     vanish frame, so hit frames, damage, counts, inputs and cooldowns are untouched. Rings / poofs / splashes / tilt /
//     camera punch are render-only (clonechoreoFx.js).
// No Math.random anywhere: tilt / stagger come from (slot, run serial) hashes.

// ── A. SIM ENGINE (ninja.js) ─────────────────────────────────────────────────────────────────────────────────────
// job: { t, kind, steps:{sign, pop, fan:[t per clone], strike, exit}, slots:[{dx, dy}], dmg, pct, move, onStrike }
// host H: { ctrX, feetY, hash(f, slot), burst(s, kind, x, y, t), cue(f, c), overlaps(a, b), strike(f, opp, dmg, o) }
export function choreoStart(f, s, n, job, H) {
  s.clones = s.clones.filter(c => !c.dead)
  s.stats.cloneJobs = (s.stats.cloneJobs || 0) + 1
  s.cloneJob = { t: 0, ...job, n, struck: false }
  s.clones = []
  for (let i = 0; i < n; i++) {
    s.clones.push({ id: ++s.cloneSerial, slot: i, x: H.ctrX(f), feet: H.feetY(f), dir: f.facing || 1, t: 0, phase: 'wait', pose: 'guard', dead: false,
      tilt: (H.hash(f, 11 + i) < 0.5 ? -1 : 1) * 6 })   // ±6° tilt: chosen in the sim (hash), drawn by the render layer
  }
  return true
}
export function choreoTarget(f, opp, job, i, H) {
  const sl = job.slots?.[i] || { dx: i === 0 ? -1 : 1, dy: 0 }
  const ox = opp ? H.ctrX(opp) : H.ctrX(f) + (f.facing || 1) * 200, of = opp ? H.feetY(opp) : H.feetY(f)
  return { x: ox + sl.dx * (job.spread ?? 90), feet: of + (sl.dy || 0) }
}
export function choreoStep(f, opp, s, p, H) {
  const J = s.cloneJob; if (!J) return
  const st = J.steps || { sign: 8, pop: 14, fan: [16, 22], strike: 40, exit: 52 }
  J.t++
  s.clones.forEach((c, i) => {
    if (c.dead) return
    c.t++
    if (J.t === st.pop) { c.phase = 'pop'; c.x = H.ctrX(f); c.feet = H.feetY(f); H.burst(s, 'smoke', c.x, c.feet, 16); if (i === 0) H.cue(f, 'smokePop') }
    if (J.t === (st.fan[i] ?? st.fan[0])) { c.phase = 'fan'; c.from = { x: c.x, feet: c.feet }; c.to = choreoTarget(f, opp, J, i, H); c.ft = 0; c.pose = 'run' }
    if (c.phase === 'fan') { c.ft++; const u = Math.min(1, c.ft / 6); c.x = c.from.x + (c.to.x - c.from.x) * u; c.feet = c.from.feet + (c.to.feet - c.from.feet) * u; if (opp) c.dir = H.ctrX(opp) < c.x ? -1 : 1; if (u >= 1) { c.phase = 'ready'; c.pose = J.pose || 'uppercut' } }
  })
  if (J.t === st.strike && !J.struck) {   // UNISON STRIKE: every live clone hits on the same frame
    J.struck = true
    let hits = 0
    for (const c of s.clones) {
      if (c.dead || c.phase !== 'ready') continue
      c.phase = 'strike'; c.pose = J.pose || 'uppercut'
      const cd = opp ? (Math.sign(H.ctrX(opp) - c.x) || c.dir || 1) : (c.dir || 1), reach = (J.spread ?? 90) + 30   // strikes TOWARD the foe from its fan-out spot
      const box = { x: cd > 0 ? c.x - 10 : c.x - reach, y: c.feet - (f.h || 94) - (J.reachY || 20), w: reach + 10, h: (f.h || 94) + (J.reachY || 20) }
      if (opp && H.overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
        const r = H.strike(f, opp, J.dmg ?? p.clones.strike, { pct: J.pct ?? p.clones.dmgPct, noKO: true, damageType: J.damageType || 'blunt', move: J.move || 'nsClone', launch: J.launch, hitstun: 30, dir: Math.sign(H.ctrX(opp) - c.x) || 1, fixedScale: J.fixedScale, locked: J.locked, sparkX: (c.x + H.ctrX(opp)) / 2 })
        if (r === true) hits++
      }
    }
    J.hits = hits; H.cue(f, 'cloneStrike')
  }
  if (J.t === st.exit) { for (const c of s.clones) if (!c.dead) { H.burst(s, 'smokeFade', c.x, c.feet, 16); c.dead = true } s.clones = []; s.cloneJob = null; H.cue(f, 'smokePop') }
}

// ── B. NARUTO-UNIVERSE PROFILES (data only) ──────────────────────────────────────────────────────────────────────
// kind: 'smoke' | 'water' | 'wood'.  ring = the chakra ring that runs into the hand sign.  fan = frames to travel from
// the caster to the authored spot (clipped so it always lands before the clone's first hit).  stagger = frames between
// clone k and k+1.  bound = peak hop (px) of the fan-out arc.  tilt = ±deg the copy is broken by.  holdStill = clones
// stand upright and still in the hold beat (Madara).  poof = smoke / splash / grow scale.  exit = frames of the leave FX.
export const CLONE_STYLE = {
  //            lead = frames added in front of the authored sequence (≤ 12: the caster's extra commitment); sign = caster seal pose
  naruto:    { kind: 'smoke', lead: 10, sign: null, signLen: 4, ring: '#5fe8ff', ringKurama: '#ffb02e', smoke: 'white', popLen: 3, fan: 8, stagger: 1, bound: 18, tilt: 6, poof: 1.0, poofKurama: 1.45, strikeLen: 8, exitLen: 14 },
  sasuke:    { kind: 'smoke', lead: 6, sign: null, signLen: 2, ring: '#7a3cc8', smoke: 'small', popLen: 2, fan: 4, stagger: 1, bound: 2, tilt: 3, poof: 0.65, strikeLen: 6, exitLen: 10 },
  madara:    { kind: 'smoke', lead: 12, sign: 'madaraFireballCast', signLen: 4, ring: '#8a0f16', ringCore: '#120406', smoke: 'dark', popLen: 3, fan: 10, stagger: 2, bound: 5, tilt: 0, holdStill: true, poof: 1.3, strikeLen: 8, exitLen: 16 },
  tobirama:  { kind: 'water', lead: 12, sign: 'tobiWaterWall', signLen: 3, ring: '#3f8cff', popLen: 8, fan: 6, stagger: 2, bound: 10, tilt: 5, poof: 1.0, strikeLen: 8, exitLen: 10 },
  hashirama: { kind: 'wood', lead: 12, sign: 'handSigns', signLen: 3, ring: '#3fbf5a', popLen: 9, fan: 5, stagger: 2, bound: 0, tilt: 4, poof: 1.0, strikeLen: 8, exitLen: 12 },
}
// real sheets used by the render layer (clonechoreoFx.js) — no invented art
export const CLONE_SHEETS = {
  smoke: { sheet: './madara_summon_smoke_uniform.png', w: 192, h: 54, cells: [0, 1, 2, 3, 4] },                                  // the project's smoke-puff strip (recoloured per style at draw time)
  waterRise: { sheet: './tobirama_water_teleport_after_hit_to_get_away_uniform.png', w: 92, h: 67, cells: [2, 3, 4, 5] },          // Tobirama rising out of the water (his own sheet)
  waterFall: { sheet: './tobirama_water_teleport_after_hit_to_get_away_uniform.png', w: 92, h: 67, cells: [5, 4, 3, 2] },          // …and collapsing back into it (same cells, reversed)
  woodGrow: { sheet: './hashirama_wood_clone_intro_uniform.png', w: 102, h: 81, cells: [2, 3, 4, 5, 6, 7, 8, 9, 10], cropX: 46 },  // the wood clone growing (right half of his clone-cast cells)
  woodSplinter: { sheet: './hashirama_wood_clone_release.png', w: 85, h: 100, cells: [0, 1, 2, 3] },                             // the wood clone splintering apart
}
export const styleFor = key => CLONE_STYLE[(key || '').toLowerCase()] || null
// "Kurama mode" = Naruto's live shroud / KCM stage (the same flag cloneFormScaling reads); render colour only
export const isKuramaMode = f => !!(f && ((f.shroudStage || 0) > 0 || f._kcmActive || f._kuramaMode))

// small integer hash → [0,1) (deterministic; used for per-clone tilt sign / offset)
export function cHash(a, b = 0, c = 0) {
  let v = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0
  v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296
}

// Where is clone `k` (of a run that started at caster spot `from`) on run frame `f`, given its authored window
// [appear, vanish), its authored spot `to` and its first authored hit frame `firstHit` (or null)?  Pure; returns
// { phase, x, y, u } with phase 'sign' | 'pop' | 'fan' | 'hold' | 'strike' | 'exit' | null (not shown).
//   - the copy pops at the CASTER, fans out (staggered by k, small bound) and lands ≥ 1 frame before its first hit;
//   - when the clone's authored window is too short to travel, it pops in place (counts/hits never move).
export function choreoPlace(S, k, f, appear, vanish, from, to, firstHit) {
  if (f < appear || f >= vanish) return null
  const lead = (firstHit != null ? firstHit : vanish) - appear
  const start = Math.min(k * S.stagger, Math.max(0, lead - 3))
  const len = Math.max(0, Math.min(S.fan, lead - start - 1))
  const t = f - appear
  if (len < 3) return { phase: t < 3 ? 'pop' : (firstHit != null && f >= firstHit ? 'strike' : 'hold'), x: to.x, y: to.y, u: 1 }
  if (t < start) return { phase: 'pop', x: from.x, y: from.y, u: 0 }
  if (t < start + len) {
    const u = (t - start + 1) / len, e = 1 - (1 - u) * (1 - u)   // ease-out
    return { phase: 'fan', x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - S.bound * Math.sin(Math.PI * u), u }
  }
  return { phase: firstHit != null && f >= firstHit ? 'strike' : 'hold', x: to.x, y: to.y, u: 1 }
}
// per-clone break-the-copy tilt (degrees) and a 0..2 px offset — deterministic from (slot, run serial)
export function choreoTilt(S, k, serial) {
  if (!S.tilt) return 0
  const h = cHash(k + 1, serial | 0, 7)
  return (h < 0.5 ? -1 : 1) * S.tilt * (0.6 + 0.4 * cHash(k + 1, serial | 0, 9))
}

// ── C. GHOST-BODY RUNS / FORMATIONS (narutoChoreography.js + cloneChoreography.js call these; style null = no-op) ─
// Render-only event queue (rings, poofs, splashes, growth, splinters, the unison-strike punch). The sim only PUSHES;
// clonechoreoFx.js draws + ages them. Never read back by the sim.
export const CC_FX = []
export const CC_TEST = { off: false, log: null }   // harness-only A/B switch (choreography off = the authored engine exactly as before)
const fx = e => { CC_FX.push({ t: 0, ...e }); if (CC_FX.length > 96) CC_FX.shift(); if (CC_TEST.log) CC_TEST.log.push(e) }
const cx = b => b.x + (b.w || 0) / 2, feet = b => b.y + (b.h || 0)
const runAnim = (b, k) => (b.animationData && b.animationData[k]) ? k : null
let _serial = 0

// called once at run start: lead-in + per-clone meta (first appear / first hit / last vanish, arrival order, tilt)
export function ccRunStart(r, styleKey) {
  const S = CC_TEST.off ? null : styleFor(styleKey); r.cc = null; r.lead = 0
  if (!S) return
  const metas = {}
  for (const b of r.seq.beats) {
    const m = metas[b.body] ||= { slot: b.body, first: b, hit: null, last: 0, beats: [] }
    if (b.appear < m.first.appear) m.first = b
    if (b.hit && (m.hit == null || b.at < m.hit)) m.hit = b.at
    m.last = Math.max(m.last, b.vanish); m.beats.push(b)
  }
  const order = Object.values(metas).sort((a, b) => a.first.appear - b.first.appear || (a.slot < b.slot ? -1 : 1))
  const hits = r.seq.beats.filter(b => b.hit).map(b => b.at)
  const serial = ++_serial
  order.forEach((m, k) => { m.k = k; m.popAt = -S.lead + S.signLen + k * S.stagger; const body = r.bodies[m.slot]; if (body) { body._ccTilt = choreoTilt(S, k, serial); body._ccStyle = styleKey } })
  r.lead = S.lead
  r.cc = { S, styleKey, metas: order, firstHit: hits.length ? Math.min(...hits) : (r.seq.finisher ? r.seq.finisher.at : null), was: {}, struck: false }
  const c = r.caster
  fx({ k: 'ring', style: styleKey, x: cx(c), y: c.y + (c.h || 100) * 0.42, dir: c.facing || 1, kurama: styleKey === 'naruto' && isKuramaMode(c), len: S.lead })
}
// the lead-in (authored frame f < 0): the caster holds the seal; afterwards the authored script owns the caster
export function ccCasterPose(r, f) {
  if (!r.cc || f >= 0) return
  const c = r.caster, S = r.cc.S
  c.vx = 0; c.vy = 0; c.y = r.startY   // planted on its start spot while it holds the seal (a queued jump must not fire under the lock)
  c._forceAction = (S.sign && c.animationData && c.animationData[S.sign]) ? S.sign : 'idle'
}
// after the authored beat pass of frame f: arrival / hold / unison strike / exit for every body the script is NOT showing
export function ccRunStep(r, f, groundY) {
  const C = r.cc; if (!C) return
  const S = C.S, t = r.target, caster = r.caster
  const tRef = t, unison = !C.struck && C.firstHit != null && f === C.firstHit
  if (unison) { C.struck = true; fx({ k: 'strike', style: C.styleKey, x: cx(t), y: t.y + (t.h || 100) * 0.4 }) }
  for (const m of C.metas) {
    const b = r.bodies[m.slot]; if (!b) continue
    b._ccHide = false
    const open = m.beats.some(bt => f >= bt.appear && f < bt.vanish)
    if (!open && f < m.first.appear && f >= m.popAt) {
      // PRE-WINDOW: pop at the caster's side → staggered fan-out with a bound → hold on the ground at its first spot
      const pl = m.first.place, ref = pl.ref === 'caster' ? caster : pl.ref === 'casterStart' ? { x: r.startX, y: r.startY, w: caster.w, h: caster.h } : tRef
      const toX = ref.x + (ref.w || 0) / 2 + pl.dx, gy = groundY != null ? groundY : r.startY + (caster.h || 0)
      const side = Math.sign(toX - cx(caster)) || (caster.facing || 1)
      const fromX = cx(caster) + side * 26, u0 = f - m.popAt
      const lead = m.first.appear - m.popAt
      const popLen = Math.min(S.popLen, Math.max(1, lead - 1)), fanLen = Math.max(0, Math.min(S.fan, lead - popLen - 1))
      let x, ft = gy, ph
      if (u0 < popLen) { x = fromX; ph = 'pop' }
      else if (u0 < popLen + fanLen) { const u = (u0 - popLen + 1) / fanLen, e = 1 - (1 - u) * (1 - u); x = fromX + (toX - fromX) * e; ft = gy - S.bound * Math.sin(Math.PI * u); ph = 'fan' }
      else { x = toX; ph = 'hold' }
      b._choreoVisible = true
      b.x = x - (b.w || 0) / 2; b.y = ft - (b.h || 0)
      b.facing = Math.sign(cx(t) - x) || 1
      b._ccPhase = ph
      if (ph === 'pop') { b._forceAction = 'idle'; if (S.kind !== 'smoke') b._ccHide = true; if (u0 === 0) fx({ k: 'pop', kind: S.kind, style: C.styleKey, x, y: gy, dir: b.facing, scale: (b.spriteScale || 1), kurama: C.styleKey === 'naruto' && isKuramaMode(caster), len: popLen }) }
      else if (ph === 'fan') b._forceAction = runAnim(b, 'run') || runAnim(b, 'dash') || 'idle'
      else b._forceAction = 'idle'
      if (C.struckAt != null && f - C.struckAt < S.strikeLen) b._forceAction = m.first.action   // the squad's unison strike pose
    } else b._ccPhase = open ? 'beat' : null
    // exit: the frame a clone stops being shown, it leaves through its own element (smoke / water / splinters)
    const vis = !!b._choreoVisible, was = !!C.was[m.slot]
    if (was && !vis) fx({ k: 'exit', kind: S.kind, style: C.styleKey, x: C.lastX[m.slot], y: C.lastY[m.slot], dir: b.facing, scale: (b.spriteScale || 1), len: S.exitLen })
    else if (!was && vis && b._ccPhase === 'beat' && f > m.popAt) fx({ k: 'pop', kind: S.kind === 'smoke' ? 'smoke' : 'splash', style: C.styleKey, x: cx(b), y: feet(b), dir: b.facing, scale: (b.spriteScale || 1), len: 6 })
    C.was[m.slot] = vis
    ;(C.lastX ||= {})[m.slot] = cx(b); (C.lastY ||= {})[m.slot] = feet(b)
  }
  if (unison) C.struckAt = f
}
// run ended / cleared: anything still shown leaves through its element
export function ccRunEnd(r) {
  const C = r && r.cc; if (!C) return
  for (const m of C.metas) if (C.was[m.slot]) fx({ k: 'exit', kind: C.S.kind, style: C.styleKey, x: C.lastX[m.slot], y: C.lastY[m.slot], dir: 1, scale: (r.bodies[m.slot]?.spriteScale || 1), len: C.S.exitLen })
  C.was = {}
}

// FORMATIONS (the staged summon): the k-th clone pops at the caster, fans out staggered to its formation offset
export function ccFormationStart(fm, styleKey) {
  const S = CC_TEST.off ? null : styleFor(styleKey); fm.cc = S ? { S, styleKey } : null
  if (!S) return
  const serial = ++_serial, c = fm.caster
  fm.bodies.forEach((b, k) => { b._ccTilt = choreoTilt(S, k, serial); b._ccStyle = styleKey })
  fx({ k: 'ring', style: styleKey, x: cx(c), y: c.y + (c.h || 100) * 0.42, dir: c.facing || 1, kurama: styleKey === 'naruto' && isKuramaMode(c), len: 8 })
}
export function ccFormationStep(fm) {
  const C = fm.cc; if (!C) return
  const S = C.S, c = fm.caster, n = fm.bodies.length, f = fm.frame
  fm.bodies.forEach((b, k) => {
    const popAt = S.signLen + Math.floor(k * S.stagger / 2), t = f - popAt
    const toX = cx(b), toY = b.y
    b._ccHide = false
    if (t < 0) { b._choreoVisible = false; b._ccPhase = null; return }
    const fromX = cx(c) + (Math.sign(toX - cx(c)) || 1) * 20
    if (t === 0) fx({ k: 'pop', kind: S.kind, style: C.styleKey, x: fromX, y: feet(c), dir: b.facing, scale: b.spriteScale || 1, kurama: C.styleKey === 'naruto' && isKuramaMode(c), len: S.popLen })
    if (t < S.popLen) { b.x = fromX - (b.w || 0) / 2; b._ccPhase = 'pop'; if (S.kind !== 'smoke') b._ccHide = true; return }
    const u = Math.min(1, (t - S.popLen + 1) / Math.max(1, S.fan))
    if (u < 1) { const e = 1 - (1 - u) * (1 - u); b.x = fromX + (toX - fromX) * e - (b.w || 0) / 2; b.y = toY - S.bound * Math.sin(Math.PI * u); b._ccPhase = 'fan'; b._forceAction = runAnim(b, 'run') || runAnim(b, 'dash') || 'idle' }
    else b._ccPhase = 'hold'
  })
}
export function ccFormationEnd(fm) {
  const C = fm && fm.cc; if (!C) return
  for (const b of fm.bodies) if (b._choreoVisible) fx({ k: 'exit', kind: C.S.kind, style: C.styleKey, x: cx(b), y: feet(b), dir: b.facing, scale: b.spriteScale || 1, len: C.S.exitLen })
  fm.cc = null
}

// persistent ","-key clones (summons.js): spawn / despawn through the owner's element (render-only event)
export const CC_PERSIST = { tobirama: 'water', hashirama: 'wood', madara: 'smoke' }
export function ccPersistFx(k, ownerKey, x, footY, dir, scale, len = 16) {
  const kind = CC_PERSIST[(ownerKey || '').toLowerCase()]; if (!kind) return false
  fx({ k, kind, style: (ownerKey || '').toLowerCase(), x, y: footY, dir: dir || 1, scale: scale || 1, len })
  return true
}
