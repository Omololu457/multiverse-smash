// ENOCH (enoch) — SIMULATION state. Plain JSON on f._enoch (snapshotted for replay / LAN), sim ticks only: no RNG, no
// wall clock, no renderer decisions. Every export is a no-op for any other rosterKey.
//
// THERMAL (elements.js profile 'enoch'): one meter −100 (cold) … +100 (hot). Ice moves push it colder, fire moves hotter,
// water moves (Steam Burst / Tide Break / Condense) need the BALANCE zone (|v| ≤ 25) and push it AWAY from 0 when they end.
// COLD / HOT zone (|v| ≥ 40): own element ×0.8 cost and ×1.15 damage, the other element locked. A cap (±100) OVERLOADS:
// 90 frames with that element locked while the meter rushes back to ±50. Idle → drifts to 0 (0.8 / s).
// PATCHES (elements.js field, max 4 per owner): ICE / FIRE / WATER / STEAM on the floor; same type merges, ICE + FIRE
// bursts (45 blunt, pops the foe), WATER + FIRE flash-steams, WATER + ICE refreezes. Effects: ICE = foes slide (Enoch is an
// ice-walker), FIRE = 4 / 20 f to foes, WATER = +25 % from his laser, STEAM = 2 / 30 f + a screen-obscuring cloud (render).
// GLIDE (never flight): Charge held on the ground (or a double-tap forward on his own trail) → ice glide (1.8× run, can turn)
// or fire glide (2.3× run, small steering), laying its trail; Special = ice, Heavy = fire (switching mid-glide makes the
// trails react); Light = slide attack (+10 %), Up = ramp (one air attack, landing lays a patch); 4 s max.
// DISC (Down + Charge): a low hovering ice disc (shared platforms.js one-way platform) — 80 HP, 5 s, counts as an ICE patch,
// fire melts it to WATER. SUPER (↓↘→↓↘→ + Special, full meter): ABSOLUTE ZERO (cold) / FLASH POINT (hot) / THERMAL SHOCK
// (balance) — the shared freeze-contract cinematic; locks the thermal meter for 3 s.
// Reused shared systems: `_supFrozen` freeze status (combat.js), platforms.js, beam.js (Homelander's algorithm), Elastigirl's
// motion parser, damageType tags. Hit volumes are ENGINE projectiles (W.spawn, tagged _en) so guard, chip and combo scaling
// apply; direct damage (bursts, beam, patches, supers) goes through W.damage with a damageType tag.
import { ALL_MOVES, ICE_BLAST, FROST_FLOOR, HEAT_LENS, LASER, WALLS, WALL_STEAM, CHANNEL, STATUS, TWIN, SCORCH, CONDENSE, TIDE, DISC, GLIDE, GUARD_CANCEL, METER, SUPERS, SUPER_LOCK, dmg } from './enochData.js'
import { ENOCH_LENS, ENOCH_ANIM } from './enochSprites.js'
const ENOCH_ANIM_HIT = strip => ENOCH_ANIM[strip]?.hit ?? 1   // the visor fires on the strip's HIT frame
import { registerThermal, createThermal, thermalCheck, thermalPush, thermalTick, thermalZone, createField, addPatch, removePatch, convertPatch,
  tickField, patchesAt, applyPatchEffects, clearElementFlags, elWet, CALM_FRAMES } from './elements.js'
import { marchBeam, beamFloorHit, createLaser, laserReady, laserStart, laserStep, laserCut } from './beam.js'
import { registerFrozoneHost } from './frozoneState.js'
import { spawnPlatform, recedePlatform, getPlatforms } from './platforms.js'
import { dirDigit, motionMatch } from './elastigirlState.js'

export const ENOCH_KEY = 'enoch'
export const isEnoch = f => f?.rosterKey === ENOCH_KEY
export const TP = registerThermal('enoch', {})          // the brief's numbers are the framework defaults
const stats0 = () => ({ clean: 0, blocked: 0, rejects: 0, spawns: 0, glides: 0, iceGlide: 0, fireGlide: 0, switches: 0, ramps: 0, rampLand: 0, discs: 0, discMelt: 0,
  discBreak: 0, bursts: 0, burstHits: 0, steam: 0, refreeze: 0, overloads: 0, beams: 0, beamHits: 0, beamTicks: 0, beamFloor: 0, wetHits: 0, freezes: 0,
  tides: 0, tideBursts: 0, orbs: 0, orbSteam: 0, orbHail: 0, guardCancels: 0, wakes: 0, supers: 0, superDone: 0, superWhiff: 0, superBlocked: 0, patchDmg: 0,
  sanjiMelt: 0, arlongDouse: 0, meter: 0, stanceSwitches: 0, channels: 0, walls: 0, iceWalls: 0, fireWalls: 0, wallLaunch: 0, wallBlocks: 0, wallBurns: 0, wallSteam: 0, laserOverheat: 0,
  burns: 0, chills: 0, burnTicks: 0, boxes: 0, shocks: 0, quenches: 0, fireShards: 0, flameFloors: 0, frostLens: 0, fireDash: 0, iceDash: 0 })
export const enState = f => f._enoch ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0, nEnt: 0,
  th: createThermal(), field: createField(4), glide: null, ramp: null, beam: null, beamFx: null, disc: null, pend: null, wall: null, laser: createLaser(LASER), stance: 'elemental', channel: 0, aff: {}, beamEl: 'fire', dashWas: false,
  cd: { deepFreeze: 0, tideBreak: 0, guard: 0, iceWall: 0, fireWall: 0 }, wakeWin: 0, wasDown: false, prevHp: null, floor: null, pose: null, fx: [],
  stats: stats0(), lastReject: null, cues: [] }

const E = { startMove: null, comboScale: null }
// ── ICE STANCE: tap Charge → Enoch runs FROZONE'S OWN KIT (frozoneState host table): his chain / heavy / launcher / air moves,
// Ice Lance · Glacier Rush · Rising Glacier · Black Ice · Icebreaker, Down+Heavy Ice Wall, Chill → Freeze → Shatter, Ice Flash
// (double-tap), Ice Stream (air double-tap), Ice Glider (hold Jump falling) and CITY ON ICE (Ultimate). Tap Charge again →
// back to his own (elemental) kit. Frozone's specials cost Enoch THERMAL (cold), like his own ice moves; the ultimate costs
// his Super meter. Frozone's own code paths are unchanged (the host table is never consulted for him).
const ENOCH_DASH = 26
export const ICE_STANCE = { switchLock: 10 }
registerFrozoneHost('enoch', {
  mobility: f => f._enoch?.stance === 'ice',
  pay: (f, key, cost, commit) => {
    if (key === 'ultOpen' || !cost) return null                // the ultimate: his Super meter (the shared energy rule)
    const c = check(f, 'ice'); if (!c.ok) return false
    if (commit) push(f, enState(f), -cost * c.cost)
    return true
  },
})
export function toggleStance(f) {
  const s = enState(f), fz = f._frozone
  s.stance = s.stance === 'ice' ? 'elemental' : 'ice'; s.stats.stanceSwitches++
  if (s.stance === 'elemental') { f.dashSpeed = ENOCH_DASH; if (fz) { fz.stream = null; fz.ride = null; fz.glide = false; fz.skateK = -1 } }
  f.attackCooldown = Math.max(f.attackCooldown || 0, ICE_STANCE.switchLock)
  cue(f, 'switch'); pushFx(s, 'switch', ctrX(f), feetY(f), f.facing || 1, { el: s.stance === 'ice' ? 'ice' : 'fire' })
  return s.stance
}
const WREF = { W: null }
export function registerEnochEngine(o) { Object.assign(E, o) }
const cue = (f, c) => enState(f).cues.push(c)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
const feetY = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
const sw = W => W?.stageWidth?.() || 3200
const elapsed = a => a.total - a.timer
const live = f => (f.attacking && f.currentAttack?.en) ? f.currentAttack : null
export const sideOf = o => o?.side || o?.playerNumber || 0
const foesOf = (f, W, opp) => (W?.fighters?.() || (opp ? [opp] : [])).filter(o => o && o !== f && o.health > 0 && !(o.team && f.team && o.team === f.team))
const floorOf = (f, s) => s.floor ?? (f.groundY ?? feetY(f))
const isSanjiLit = o => o?.rosterKey === 'sanji' && (o._sanji?.dj || 0) > 0
export function pushFx(s, kind, x, y, dir = 1, extra = null) { s.fx.push({ kind, x: Math.round(x), y: Math.round(y), dir, t: 0, ...(extra || {}) }); if (s.fx.length > 24) s.fx.shift() }
function endAttack(f, cd = 0) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd }
function killProj(f, W, pred = null) {
  const P = W?.projectiles; if (!P) return
  for (let i = P.length - 1; i >= 0; i--) if (P[i]?.owner === f && P[i]._en && (!pred || pred(P[i]._en))) P.splice(i, 1)
}
const ownProj = (f, W, kind) => (W?.projectiles || []).filter(p => p && p.owner === f && p._en && p._en.kind === kind)
const meter = (f, raw) => { if (!(raw > 0)) return; const s = enState(f), add = Math.round(raw * 100) / 100; f.energy = Math.min(f.maxEnergy || 100, Math.round(((f.energy || 0) + add) * 100) / 100); s.stats.meter = Math.round((s.stats.meter + add) * 100) / 100 }
// deterministic hash (match seed, frame, player index, slot) — only presentation uses it; the sim needs no randomness.
// The PATCH CLOCK is his own s.tick (+1 every frame from his spawn), not the global frame counter: patch ages are identical
// in a recording and its playback, so the snapshot (bornFrame included) matches frame for frame.
export const ehash = (seed, frame, side, slot) => { let h = (seed | 0) ^ Math.imul(frame | 0, 0x9e3779b1) ^ Math.imul((side === 'p2' || side === 2) ? 2 : 1, 0x85ebca6b) ^ Math.imul(slot | 0, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296 }

// Every reset path: KO teardown, round reset, rematch, scene exit, identity replacement.
export function clearEnoch(f, W) {
  if (!f) return
  if (f._enoch?.stance === 'ice') f.dashSpeed = ENOCH_DASH   // Ice Stance's skate speed never leaks into the next round
  if (cine.active && (cine.caster === f || cine.target === f)) clearEnochUlt()
  const s = f._enoch
  if (s?.disc?.pid) recedePlatform(s.disc.pid)
  if (live(f)) endAttack(f)
  killProj(f, W || WREF.W)
  for (const o of (W || WREF.W)?.fighters?.() || []) clearElementFlags(o, sideOf(f))
  clearElementFlags(f, sideOf(f))
  delete f._enoch; delete f._enochRemoteInput
  if (f._enHomeX != null) { f.x = f._enHomeX; delete f._enHomeX }
}

// ── THERMAL helpers ──
export const zoneOf = f => thermalZone(enState(f).th, TP)
export const check = (f, el) => thermalCheck(enState(f).th, TP, el)
function push(f, s, delta) {
  if (thermalPush(s.th, TP, delta) === 'overload') {
    s.stats.overloads++; cue(f, 'overload'); pushFx(s, 'overload', ctrX(f), f.y + 20, s.th.overSide)
    if (s.glide && ((s.glide.type === 'ice' && s.th.overSide < 0) || (s.glide.type === 'fire' && s.th.overSide > 0))) endGlide(f, s, false)
    if (s.beam && s.th.overSide > 0) endBeam(f, s)
  }
}
export function pushThermal(f, d) { push(f, enState(f), d) }
export const waterUnlocked = f => zoneOf(f) === 'balance'

// ── PATCHES ──
// lay a patch (with every merge / reaction / burst it causes), handling the disc melt + the Arlong douse first
function lay(f, s, W, o) {
  const fr = s.tick
  const q = { owner: sideOf(f), frame: fr, floor: o.floor ?? floorOf(f, s), minX: 0, maxX: sw(W), ...o }
  if (q.type === 'fire') {
    const w = Math.round(q.width ?? Math.round(0.16 * 1280)), x0 = Math.round(q.x ?? (q.cx - w / 2))
    if (s.disc) { const dp = s.field.patches.find(p => p.disc); if (dp && x0 < dp.x + dp.width && dp.x < x0 + w) meltDisc(f, s, W) }
    for (const o2 of foesOf(f, W)) for (const z of o2._arlong?.zones || []) if (x0 < z.x + z.width && z.x < x0 + w) {   // ARLONG: his water douses the fire → STEAM
      q.type = 'steam'; s.stats.arlongDouse++; cue(f, 'hiss'); pushFx(s, 'steamPuff', x0 + w / 2, q.floor, 1); break
    }
  }
  const ev = addPatch(s.field, q)
  s.field.events.length = 0
  handleEvents(f, s, W, ev)
  return ev
}
export function enochLay(f, o, W = null) { return isEnoch(f) ? lay(f, enState(f), W || WREF.W, o) : [] }   // harness / scenario setup: the same path as his moves
function handleEvents(f, s, W, ev) {
  for (const e of ev) {
    if (e.kind === 'reaction') {
      if (e.name === 'thermalBurst') { s.stats.bursts++; cue(f, 'burst'); pushFx(s, 'burst', e.cx, e.floor, 1, { w: e.x1 - e.x0, i: e.intensity }) }
      else if (e.name === 'flashSteam') { s.stats.steam++; cue(f, 'hiss'); pushFx(s, 'steamPuff', e.cx, e.floor, 1, { w: e.x1 - e.x0 }) }
      else if (e.name === 'freezeSolid') { s.stats.refreeze++; cue(f, 'crackle'); pushFx(s, 'frost', e.cx, e.floor, 1) }
    } else if (e.kind === 'burst') burstAt(f, s, W, e.x0, e.x1, e.floor, e.dmg, e.damageType, e.knockdown, e.name)
  }
}
// one-time burst damage to foes standing over [x0, x1]
function burstAt(f, s, W, x0, x1, floor, raw, damageType, knock, source) {
  let n = 0
  for (const d of foesOf(f, W)) {
    const cx = ctrX(d)
    if (cx < x0 - 24 || cx > x1 + 24 || Math.abs(feetY(d) - floor) > 60 || (d.invulnTimer || 0) > 0) continue
    if (d.isBlocking) { W?.damage?.(d, raw * 0.25, { attacker: f, source, damageType }); d.blockstun = Math.max(d.blockstun || 0, 12); continue }
    W?.damage?.(d, raw, { attacker: f, source, damageType })
    d.colorFlash = 6; d.isBlocking = false
    if (knock) { d.vy = -11; d.vx = (cx >= (x0 + x1) / 2 ? 1 : -1) * 3; d.onGround = false; d.grounded = false; d.isLaunched = true; d.hitstun = Math.max(d.hitstun || 0, 34) }
    else d.hitstun = Math.max(d.hitstun || 0, 18)
    f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
    meter(f, raw * METER.onHit); n++
    const a = live(f); if (a) a.en.clean = true
  }
  s.stats.burstHits += n
  return n
}
function meltDisc(f, s, W) {
  const dp = s.field.patches.find(p => p.disc); if (!dp) { s.disc = null; return }
  if (s.disc?.pid) recedePlatform(s.disc.pid)
  removePatch(s.field, dp.id); s.disc = null; s.stats.discMelt++; cue(f, 'hiss')
  lay(f, s, W, { type: 'water', x: dp.x, width: dp.width, floor: floorOf(f, s), calm: CALM_FRAMES })
  pushFx(s, 'steamPuff', dp.x + dp.width / 2, floorOf(f, s) - DISC.height, 1)
}
function breakDisc(f, s) {
  const dp = s.field.patches.find(p => p.disc); if (dp) removePatch(s.field, dp.id)
  if (s.disc?.pid) recedePlatform(s.disc.pid)
  if (dp) pushFx(s, 'shatter', dp.x + dp.width / 2, dp.floor, 1)
  s.disc = null; s.stats.discBreak++; cue(f, 'shatter')
}

// ── FIRE / ICE TWINS: outside the balance band his element follows his temperature ──
export const twinOf = f => { const v = enState(f).th.v; return v > TP.balance ? 'fire' : v < -TP.balance ? 'ice' : null }
// the element a move really uses when it starts (Ice Blast → Fire Shard when hot, Frost Floor → Flame Floor, Heat Lens → Frost Lens when cold)
export function moveElement(f, key) {
  const md = ALL_MOVES[key], tw = twinOf(f)
  if (key === 'heatLens' && tw === 'ice') return 'ice'
  if ((key === 'iceBlast' || key === 'frostFloor') && tw === 'fire') return 'fire'
  return md?.el || null
}
// ── LASTING EFFECTS on his opponents: BURN (health decay) / CHILL (slow → ICE BOX) + the steam combination. Kept in HIS state
// (s.aff[victim side]) so it is part of GAME_STATE, replays and snapshots; it acts on the victim through x / hitstun / damage only.
const affOf = (s, t) => (s.aff[sideOf(t)] ||= { burn: 0, burnT: 0, burnK: 0, chill: 0, chillT: 0, box: 0, boxCd: 0, px: null })
const r2 = v => Math.round(v * 100) / 100
export function afflict(f, t, el, amt, W = WREF.W) {
  if (!isEnoch(f) || !t || t === f || !(t.health > 0) || !(el === 'fire' || el === 'ice') || !(amt > 0)) return null
  const s = enState(f), A = affOf(s, t), S = STATUS
  if (el === 'fire') {
    if (A.box > 0) { A.box = 0; t._supFrozen = 0 }                                // fire thaws an ice box
    if (A.chill >= S.comboAt && amt >= 1) {                                         // THE COMBINATION: fire on the chilled = STEAM SHOCK
      const raw = S.shockRaw * Math.floor(A.chill); A.chill = 0; A.chillT = 0; s.stats.shocks++
      W?.damage?.(t, raw, { attacker: f, source: 'steamShock', damageType: 'energy' }); cue(f, 'burst'); pushFx(s, 'steamBlast', ctrX(t), ctrY(t), 1); return 'shock'
    }
    A.burn = r2(Math.min(S.max, A.burn + amt)); A.burnT = S.life; s.stats.burns++; return 'burn'
  }
  if (A.burn >= S.comboAt && amt >= 1) {                                            // ice on the burning = QUENCH
    const raw = S.quenchRaw * Math.floor(A.burn); A.burn = 0; A.burnT = 0; s.stats.quenches++
    W?.damage?.(t, raw, { attacker: f, source: 'quench', damageType: 'blunt' }); cue(f, 'hiss'); pushFx(s, 'steamPuff', ctrX(t), ctrY(t), 1); return 'quench'
  }
  A.chill = r2(Math.min(S.max, A.chill + amt)); A.chillT = S.life; s.stats.chills++
  if (A.chill >= S.max && A.boxCd <= 0 && !(A.box > 0)) {                         // the ICE BOX: frozen solid
    A.box = S.boxFrames; A.boxCd = S.boxFrames + S.boxCd; A.chill = 0; A.chillT = 0; s.stats.boxes++
    t._supFrozen = S.boxFrames; t._supFrozenMax = S.boxFrames; t.hitstun = Math.max(t.hitstun || 0, S.boxFrames); t.vx = 0
    cue(f, 'freeze'); pushFx(s, 'shatter', ctrX(t), ctrY(t), 1); return 'box'
  }
  return 'chill'
}
export const slowOf = c => c >= 2 ? Math.max(0, 1 - STATUS.slowPer * (Math.floor(c) - 1)) : 1
function tickAfflictions(f, s, W, opp) {
  const S = STATUS
  for (const t of foesOf(f, W, opp)) {
    const A = s.aff[sideOf(t)]; if (!A) continue
    if (A.box > 0) A.box--
    if (A.boxCd > 0) A.boxCd--
    if (A.burnT > 0) A.burnT--; else if (A.burn > 0) { A.burn = r2(Math.max(0, Math.ceil(A.burn) - 1)); A.burnT = A.burn > 0 ? S.decay : 0 }
    if (A.chillT > 0) A.chillT--; else if (A.chill > 0) { A.chill = r2(Math.max(0, Math.ceil(A.chill) - 1)); A.chillT = A.chill > 0 ? S.decay : 0 }
    if (A.burn >= 2) {                                                              // BURN: health decay (never on the first hit)
      if (++A.burnK >= S.burnEvery) { A.burnK = 0; const raw = S.burnRaw * (Math.floor(A.burn) - 1); W?.damage?.(t, raw, { attacker: f, source: 'burn', damageType: 'energy' }); s.stats.burnTicks++; pushFx(s, 'ember', ctrX(t), ctrY(t) - 20, 1) }
    } else A.burnK = 0
    const mul = slowOf(A.chill), free = !(t.hitstun > 0) && !t.knockdownState && !(t._supFrozen > 0) && !t.isGrabbed
    if (mul < 1 && free && A.px != null) t.x = r2(A.px + (t.x - A.px) * mul)      // CHILL: every step he takes is shorter
    A.px = t.x
  }
}

// ── combat.js hooks (enoch-gated) ──
export function enochHitbox(f) {
  const a = f.currentAttack, m = a?.en, md = ALL_MOVES[m?.key]
  if (!m || !md || md.noBody || !md.box) return { x: 0, y: 0, w: 0, h: 0 }
  const d = m.dir, front = d === 1 ? f.x + f.w : f.x, feet = f.y + f.h
  const [b0, b1, top, h] = md.box
  return { x: d === 1 ? front + b0 : front - b1, y: feet - top, w: b1 - b0, h }
}
export function enochBlock(f, d, a) {
  if (!isEnoch(f) || !a?.en) return
  d.blockstun = ALL_MOVES[a.en.key].blockstun; a.en.blocked = true; enState(f).stats.blocked++
}
export function enochHit(f, d, a, { armored = false } = {}) {
  if (isEnoch(f) && a?.fz && !armored && !d.isBlocking) { meter(f, (a.damage || 0) * METER.onHit); afflict(f, d, 'ice', STATUS.hit); return }   // Ice Stance hits build his Super too
  if (!isEnoch(f) || !a?.en) return
  const s = enState(f), md = ALL_MOVES[a.en.key]
  if (armored || d.isBlocking) return
  a.en.clean = true; s.stats.clean++
  meter(f, (a.damage || 0) * METER.onHit)
  const hel = a.en.el || md.el; if (hel === 'fire' || hel === 'ice') afflict(f, d, hel, STATUS.hit)
  if (md.freeze && d.health > 0) { d._supFrozen = md.freeze; d._supFrozenMax = md.freeze; d.hitstun = Math.max(d.hitstun || 0, md.freeze); d.vx = 0; s.stats.freezes++; cue(f, 'freeze') }
  pushFx(s, hel === 'fire' ? 'ember' : 'chip', ctrX(d), ctrY(d) - 10, a.en.dir)
}
export function enochProjectileHit(proj, target, { armored = false } = {}) {
  if (proj?._fz && isEnoch(proj.owner) && !target?.isBlocking && !armored) { meter(proj.owner, (proj.damage || 0) * METER.onHit); afflict(proj.owner, target, 'ice', STATUS.hit); return }   // Ice Lance / Black Ice
  const k = proj?._en; if (!k || !isEnoch(proj.owner)) return
  const f = proj.owner, s = enState(f), blocked = !!target?.isBlocking || armored
  if (blocked) { s.stats.blocked++; pushFx(s, 'chip', proj.x, proj.y, k.dir || 1); return }
  s.stats.clean++; meter(f, (proj.damage || 0) * METER.onHit)
  const a = live(f); if (a && a.en.serial === k.serial) a.en.clean = true
  const pel = k.el || ((k.kind === 'blast' || k.kind === 'hail' || k.kind === 'wall') ? 'ice' : null)
  if (pel) afflict(f, target, pel, STATUS.hit)
  pushFx(s, pel === 'fire' ? 'ember' : (k.kind === 'blast' || k.kind === 'hail') ? 'frost' : 'chip', proj.x, proj.y, k.dir || 1)
}

// ── MOVES ──
function reject(f, why) { const s = enState(f); s.stats.rejects++; s.lastReject = why || 'reject'; cue(f, 'reject') }
// Start a move through combat.startMove (frameExact) and attach the descriptor `en`. All checks happen BEFORE anything is spent.
export function startEnMove(f, key, W, { cancel = false, bonus = 1 } = {}) {
  if (!isEnoch(f)) return false
  const s = enState(f), md = ALL_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (f.blockstun > 0) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  if (md.air && g) return false
  if (!md.air && !g) { reject(f, 'air'); return false }
  const el = moveElement(f, key)
  const chk = el ? check(f, el) : { ok: true, cost: 1, dmg: 1 }
  if (!chk.ok) { reject(f, chk.why); return false }
  if (md.cooldown && s.cd[key] > 0) { reject(f, 'cooldown'); return false }
  if (key === 'heatLens' && !laserReady(s.laser)) { reject(f, s.laser.over > 0 ? 'overheat' : 'laser'); return false }
  if (key === 'iceBlast' && ownProj(f, W, 'blast').length >= ICE_BLAST.pool) { reject(f, 'pool'); return false }
  if ((md.cost || 0) > (f.energy || 0)) { reject(f, 'meter'); return false }
  const variant = key === 'super' ? superVariant(f) : null
  if (cancel) endAttack(f)
  if (!E.startMove || !E.startMove(f, key, md)) return false
  if (md.cost) f.energy = Math.max(0, (f.energy || 0) - md.cost)
  f.currentMove = key
  const a = f.currentAttack
  a.damage = Math.round((md.damage || 0) * chk.dmg * bonus * 100) / 100
  a.en = { key, dir: f.facing || 1, clean: false, blocked: false, serial: ++s.serial, released: false, mul: chk.dmg * bonus, variant, glideV: s.glide ? s.glide.v : 0, el }
  a.hasHit = !!md.noBody
  f.isBlocking = false; f.isCharging = false; f.dashTimer = 0
  if (s.glide) endGlide(f, s, false)
  if (g && !md.travel) f.vx = 0
  if (md.cooldown) s.cd[key] = md.cooldown
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (key === 'super') { s.th.lock = SUPER_LOCK; s.pend = null; s.stats.supers++; cue(f, 'superStart') }
  else if (md.th) {
    const th = el && md.el && el !== md.el ? -md.th : md.th                   // a twin pushes the other way (Fire Shard heats, Frost Lens cools)
    if (md.away) s.pend = { serial: a.en.serial, amt: th * chk.cost }      // water: pushed away from 0 as the move ends
    else push(f, s, th * chk.cost)
  }
  if (key === 'wake') s.stats.wakes++
  cue(f, el ? el + 'Cast' : md.isSpecial ? 'cast' : 'swing')
  if (el && md.el && el !== md.el) { if (key === 'iceBlast') s.stats.fireShards++; else if (key === 'frostFloor') s.stats.flameFloors++; else if (key === 'heatLens') s.stats.frostLens++ }
  return true
}
// variant by the zone at the press: |v| ≤ 25 → THERMAL SHOCK; otherwise by the meter's sign
export function superVariant(f) { const v = enState(f).th.v; return Math.abs(v) <= TP.balance ? 'thermalShock' : v < 0 ? 'absoluteZero' : 'flashPoint' }

function vol(f, s, W, kind, serial, cx, cy, w, h, P) {
  const pr = W?.spawn?.(f, 'enoch_' + kind, { damage: P.damage, speed: 1, vx: P.vx ?? (P.dir || 1) * 0.01, vy: P.vy || 0, spawnX: cx, spawnY: cy, w, h,
    radius: P.radius ?? Math.min(w, h) / 2, lifetime: P.life, hitstun: P.hitstun, knockbackX: P.kbx, knockbackY: P.kby, piercesMulti: false,
    sheet: './assets/enoch/fx/blank.png', spriteFrames: 1, spriteW: 1, spriteH: 1, isSpecial: true, color: P.color || '#9fe8ff' })
  if (!pr) return null
  pr.noTrail = true; pr.damageType = P.damageType || 'projectile'; if (P.low) pr.hitLevel = 'low'
  pr._en = { kind, serial, n: ++s.nEnt, dir: P.dir || 1, el: P.el || null }
  s.stats.spawns++
  return pr
}
function front(f, d) { return d === 1 ? f.x + f.w : f.x }
// the visor lens in world space (the per-frame lens anchor exported by tools/enoch/build_sprites.py, × presentation scale)
export function lensOrigin(f, strip = 'atkLens', frame = ENOCH_ANIM_HIT(strip)) {
  const L = (ENOCH_LENS[strip] || [])[frame] || (ENOCH_LENS.idle || [])[0] || [2.5, -53], k = f.spriteScale || 2, d = f.facing || 1
  return { x: ctrX(f) + d * L[0] * k, y: feetY(f) + L[1] * k }
}
const box = o => ({ x: o.x, y: o.y, w: o.w || 48, h: o.h || 94 })
const wetMul = (f, d) => {
  if (elWet(d)) return HEAT_LENS.wetMul
  for (const z of d._arlong?.zones || []) if (ctrX(d) >= z.x && ctrX(d) <= z.x + z.width && grounded(d)) return HEAT_LENS.wetMul   // Arlong's water counts too
  return 1
}
// one beam pulse: hit the first foe on the ray, else the floor (lays FIRE), else nothing; melts his disc on the way
function beamPulse(f, s, W, angle, raw, hitstun, tap) {
  const o = lensOrigin(f), d = f.facing || 1, len = Math.min(HEAT_LENS.len, sw(W))
  let best = null, tgt = null
  for (const t of foesOf(f, W)) { if ((t.invulnTimer || 0) > 0) continue; const r = marchBeam(o.x, o.y, angle, d, len, box(t)); if (r.hit && (!best || r.t < best.t)) { best = r; tgt = t } }
  const fl = beamFloorHit(o.x, o.y, angle, d, len, floorOf(f, s))
  let end = best || (fl ? { ...fl, hit: false } : marchBeam(o.x, o.y, angle, d, len))
  if (fl && best && fl.t < best.t) { end = { ...fl, hit: false }; tgt = null }
  const dp = s.field.patches.find(p => p.disc)
  if (dp) { const y = dp.floor, t = (y - o.y) / (Math.sin(angle) || 1e-9), x = o.x + Math.cos(angle) * d * t; if (Math.sin(angle) > 0 && t > 0 && t < end.t && x >= dp.x && x <= dp.x + dp.width) meltDisc(f, s, W) }
  if (tgt) {
    const m = wetMul(f, tgt), dm = raw * m
    if (m > 1) s.stats.wetHits++
    if (tgt.isBlocking) { W?.damage?.(tgt, dm * 0.2, { attacker: f, source: 'heatLens', damageType: 'energy' }); tgt.blockstun = Math.max(tgt.blockstun || 0, tap ? 14 : 6) }
    else {
      W?.damage?.(tgt, dm, { attacker: f, source: 'heatLens', damageType: 'energy' })
      tgt.hitstun = Math.max(tgt.hitstun || 0, hitstun); tgt.colorFlash = 4; tgt.vx = d * (tap ? 3 : 0.6)
      f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
      meter(f, dm * METER.onHit); s.stats.beamHits++
      const a = live(f); if (a) a.en.clean = true
      afflict(f, tgt, s.beamEl, tap ? STATUS.hit : STATUS.beamTick, W)
      // the shot scorches (Frost Lens: frosts) the ground at a grounded target's feet (combo 2: on his ICE patch → burst)
      if (tap && grounded(tgt)) lay(f, s, W, { type: s.beamEl, cx: ctrX(tgt), width: 72, floor: feetY(tgt) })
    }
  } else if (fl && end.y === fl.y) { s.stats.beamFloor++; lay(f, s, W, { type: s.beamEl, cx: fl.x, width: 64, extend: true }) }
  s.beamFx = { ox: Math.round(o.x), oy: Math.round(o.y), tx: Math.round(end.x), ty: Math.round(end.y), hit: !!tgt, t: tap ? 8 : 2, tick: s.tick, el: s.beamEl }
  return !!tgt
}
function endBeam(f, s) { if (!s.beam) return; s.beam = null; laserCut(s.laser, LASER); cue(f, 'laserOff'); const a = live(f); if (a && a.en.key === 'heatLens') a.timer = Math.min(a.timer, ALL_MOVES.heatLens.recovery) }

function release(f, s, W, a, m, md) {
  const d = m.dir, fr = front(f, d), feet = feetY(f)
  if (m.key === 'iceBlast') {
    // aimed: at an AIRBORNE foe in front (a launched one, combo 1) the blast angles up to at most 30°; on the ground it flies flat
    const x0 = fr + d * ICE_BLAST.handX, y0 = feet - ICE_BLAST.handY
    const t = foesOf(f, W).filter(o => !grounded(o) && (ctrX(o) - x0) * d > 0).sort((p, q) => Math.abs(ctrX(p) - x0) - Math.abs(ctrX(q) - x0))[0]
    const vy = t ? Math.max(-ICE_BLAST.speed * ICE_BLAST.aimTan, Math.min(0, (ctrY(t) - y0) / Math.max(1, Math.abs(ctrX(t) - x0) / ICE_BLAST.speed))) : 0
    vol(f, s, W, 'blast', m.serial, x0, y0, ICE_BLAST.w, ICE_BLAST.h,
      { damage: a.damage, hitstun: ICE_BLAST.hitstun, kbx: ICE_BLAST.kbx, kby: ICE_BLAST.kby, life: ICE_BLAST.life, vx: d * ICE_BLAST.speed, vy: Math.round(vy * 1000) / 1000, dir: d, damageType: m.el === 'fire' ? 'energy' : 'projectile', el: m.el || 'ice', color: m.el === 'fire' ? '#ff9a3c' : '#9fe8ff' })
    cue(f, m.el === 'fire' ? 'fireCast' : 'iceBlast')
  } else if (m.key === 'frostFloor') {
    const cx = fr + d * FROST_FLOOR.ahead
    const fl = m.el === 'fire'                                                     // hot: FLAME FLOOR (a fire eruption + a fire patch)
    lay(f, s, W, { type: fl ? 'fire' : 'ice', cx })
    vol(f, s, W, 'floor', m.serial, cx, feet - 15, 140, 30, { damage: a.damage, hitstun: 20, kbx: 2, kby: 0, life: 5, dir: d, low: true, damageType: fl ? 'energy' : 'blunt', el: fl ? 'fire' : 'ice' })
    cue(f, fl ? 'fireCast' : 'crackle'); pushFx(s, fl ? 'flameFloor' : 'frost', cx, feet, d)
  } else if (m.key === 'scorch') { lay(f, s, W, { type: 'fire', cx: fr + d * SCORCH.ahead }); pushFx(s, 'scorch', fr + d * 70, feet - 50, d) }
  else if (m.key === 'iceDisc') {
    if (s.disc) breakDisc(f, s)
    const cx = Math.max(DISC.w / 2, Math.min(sw(W) - DISC.w / 2, ctrX(f) + d * DISC.ahead)), floor = floorOf(f, s)
    const pl = spawnPlatform({ x: Math.round(cx - DISC.w / 2), w: DISC.w, groundY: floor, maxHeight: DISC.height, growDur: 6, holdDur: DISC.life - 12, recedeDur: 6, owner: 'enoch:' + sideOf(f),
      sprite: { sheet: './assets/enoch/fx/blank.png', frames: 1, sw: 1, sh: 1 } })   // invisible box: enochFx draws the hovering disc
    lay(f, s, W, { type: 'ice', cx, width: DISC.w, floor: floor - DISC.height, life: DISC.life, disc: { hp: DISC.hp } })
    s.disc = { pid: pl.id, hp: DISC.hp, hitSerial: {} }; s.stats.discs++; cue(f, 'crackle'); pushFx(s, 'frost', cx, floor - DISC.height, d)
  } else if (m.key === 'heatLens') {
    s.stats.beams++; cue(f, 'laser'); s.beamEl = m.el === 'ice' ? 'ice' : 'fire'   // cold: the FROST LENS (ice laser)
    const aim = laserAim(f, W)
    beamPulse(f, s, W, aim ?? 0, a.damage, HEAT_LENS.hitstun, true)
    if (laserStart(s.laser, LASER, aim ?? 0)) { s.beam = { k: 0, angle: s.laser.angle }; if (m.held) cue(f, 'laserOn') }
  } else if (m.key === 'iceWall' || m.key === 'fireWall') raiseWall(f, s, W, m.key === 'iceWall' ? 'ice' : 'fire', d, m.mul)
  else if (m.key === 'tideBreak') {
    s.stats.tides++; cue(f, 'tide'); let n = 0
    for (const p of [...s.field.patches]) {
      if (p.type === 'water') continue
      const wasDisc = !!p.disc
      if (wasDisc) { if (s.disc?.pid) recedePlatform(s.disc.pid); s.disc = null; p.floor = floorOf(f, s) }
      convertPatch(s.field, p, 'water', s.tick); n++
      burstAt(f, s, W, p.x, p.x + p.width, p.floor, TIDE.burstRaw * m.mul, 'blunt', false, 'tideBreak')
      pushFx(s, 'splash', p.x + p.width / 2, p.floor, d, { w: p.width })
    }
    s.stats.tideBursts += n
  } else if (m.key === 'condense') {
    vol(f, s, W, 'orb', m.serial, fr + d * 20, feet - CONDENSE.handY, CONDENSE.w, CONDENSE.h,
      { damage: a.damage, hitstun: 18, kbx: 3, kby: -3, life: CONDENSE.life, vx: d * CONDENSE.speed, dir: d, damageType: 'projectile', color: '#7fc8ff' })
    s.stats.orbs++; cue(f, 'orb')
  } else if (m.key === 'super') superRelease(f, s, W, a, m)
}
// LOCK-ON (Homelander's auto-aim): the angle from his visor lens to the nearest foe's chest, measured along his facing
// (turns to face them first). null = no foe. Up / Down held override it and sweep by hand (beam.js laserStep).
function laserAim(f, W) {
  const t = foesOf(f, W).sort((p, q) => Math.abs(ctrX(p) - ctrX(f)) - Math.abs(ctrX(q) - ctrX(f)))[0]
  if (!t) return null
  f.facing = ctrX(t) >= ctrX(f) ? 1 : -1
  const a = live(f); if (a?.en) a.en.dir = f.facing
  const o = lensOrigin(f), tx = ctrX(t), ty = (t.y || 0) + (t.h || 94) * 0.45
  return Math.round(Math.atan2(ty - o.y, (tx - o.x) * f.facing) * 10000) / 10000
}
// ── WALLS (Frozone's Ice Wall is the model): one at a time; the other element raised on top of it = a STEAM BURST ──
const hitRect = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export const wallRect = w => { const P = WALLS[w.type], h = P.h * Math.min(1, (w.t + 1) / P.rise); return { x: w.x - P.w / 2, y: w.floor - h, w: P.w, h } }
function raiseWall(f, s, W, type, d, mul) {
  const P = WALLS[type], floor = floorOf(f, s), x = Math.round(Math.max(P.w, Math.min(sw(W) - P.w, ctrX(f) + d * P.ahead)))
  const old = s.wall
  if (old && old.type !== type && Math.abs(old.x - x) <= WALLS[old.type].w + P.w) {
    s.wall = null; s.stats.wallSteam++; s.stats.steam++
    burstAt(f, s, W, x - WALL_STEAM.w / 2, x + WALL_STEAM.w / 2, floor, WALL_STEAM.raw * mul, 'energy', true, 'wallSteam')
    pushFx(s, 'steamBlast', x, floor - 60, d); pushFx(s, 'burst', x, floor, d, { w: WALL_STEAM.w }); cue(f, 'burst')
    return
  }
  s.wall = { type, x, floor: Math.round(floor), t: 0, hp: P.hp, dir: d, launched: false, mul, n: ++s.nEnt }
  s.stats.walls++; s.stats[type === 'ice' ? 'iceWalls' : 'fireWalls']++
  lay(f, s, W, { type, cx: x, width: P.patch })
  cue(f, type === 'ice' ? 'crackle' : 'fireCrackle'); pushFx(s, type === 'ice' ? 'frost' : 'scorch', x, floor, d)
}
function updateWall(f, s, W, opp) {
  const w = s.wall; if (!w) return
  const P = WALLS[w.type]; w.t++
  const Rc = wallRect(w)
  for (const o of foesOf(f, W, opp)) {
    const ob = box(o); if (!hitRect(ob, Rc)) continue
    if (w.type === 'ice') {
      if (!w.launched && w.t <= P.rise + 2 && grounded(o)) {   // erupting under them: one launching hit
        w.launched = true; s.stats.wallLaunch++
        vol(f, s, W, 'wall', ++s.serial, ctrX(o), ctrY(o), 60, 90, { damage: Math.round(dmg(P.raw) * w.mul * 100) / 100, hitstun: P.hitstun, kbx: P.kbx, kby: P.kby, life: 3, dir: w.dir, radius: 30, damageType: 'blunt' })
        pushFx(s, 'frost', ctrX(o), ctrY(o), w.dir); continue
      }
      if (o.y + o.h <= Rc.y + 6) continue                         // standing on / clearing the top
      if (ctrX(o) < w.x) o.x = Rc.x - ob.w; else o.x = Rc.x + Rc.w
      if ((o.vx || 0) * (ctrX(o) < w.x ? 1 : -1) > 0) o.vx = 0
    } else if (w.t % P.tickEvery === 0 && !((o.invulnTimer || 0) > 0)) {   // FIRE: burns whoever stands in it
      const raw = P.tickRaw * w.mul
      if (o.isBlocking) { W?.damage?.(o, raw * 0.2, { attacker: f, source: 'fireWall', damageType: 'energy' }); o.blockstun = Math.max(o.blockstun || 0, 6) }
      else { W?.damage?.(o, raw, { attacker: f, source: 'fireWall', damageType: 'energy' }); o.hitstun = Math.max(o.hitstun || 0, P.hitstun); o.colorFlash = 5; meter(f, raw * METER.onHit); afflict(f, o, 'fire', STATUS.wallTick, W) }
      s.stats.wallBurns++; pushFx(s, 'ember', ctrX(o), ctrY(o), w.dir)
    }
  }
  const Q = W?.projectiles                                         // enemy shots: the ice wall stops them, the fire wall burns them
  if (Q) for (let i = Q.length - 1; i >= 0 && w.hp > 0; i--) {
    const q = Q[i]; if (!q || q.owner === f) continue
    const qw = q.w || q.width || 20, qh = q.h || q.height || 20
    if (!hitRect({ x: q.x - qw / 2, y: q.y - qh / 2, w: qw, h: qh }, Rc)) continue
    Q.splice(i, 1); w.hp--; s.stats.wallBlocks++; cue(f, w.type === 'ice' ? 'crackle' : 'hiss'); pushFx(s, w.type === 'ice' ? 'chip' : 'ember', q.x, q.y, -w.dir)
  }
  if (w.hp <= 0) { s.wall = null; cue(f, 'shatter'); pushFx(s, w.type === 'ice' ? 'shatter' : 'steamPuff', w.x, w.floor - P.h / 2, w.dir); return }
  if (w.t >= P.life) { s.wall = null; pushFx(s, w.type === 'ice' ? 'frost' : 'steamPuff', w.x, w.floor, w.dir) }
}
// Condense orbs drifting over his own patches: FIRE → steam explosion (70), ICE → hail (60, faster). Once each.
function updateOrbs(f, s, W) {
  for (const pr of ownProj(f, W, 'orb')) {
    if (pr._en.done) continue
    const x = pr.x ?? 0, here = s.field.patches.filter(p => !p.disc && x >= p.x && x <= p.x + p.width)
    const fire = here.find(p => p.type === 'fire'), ice = here.find(p => p.type === 'ice')
    if (fire) {
      pr._en.done = true; removePatch(s.field, fire.id); pr.lifetime = 0; pr.life = 0; pr.dead = true
      const P = W?.projectiles, i = P ? P.indexOf(pr) : -1; if (i >= 0) P.splice(i, 1)
      lay(f, s, W, { type: 'steam', cx: x, floor: fire.floor, calm: CALM_FRAMES })
      for (const d of foesOf(f, W)) if (Math.abs(ctrX(d) - x) < 110 && Math.abs(ctrY(d) - (pr.y ?? 0)) < 140) {
        if (d.isBlocking) { W?.damage?.(d, CONDENSE.steamRaw * 0.25, { attacker: f, source: 'condense', damageType: 'energy' }); continue }
        W?.damage?.(d, CONDENSE.steamRaw, { attacker: f, source: 'condense', damageType: 'energy' }); d.hitstun = Math.max(d.hitstun || 0, 26); d.vy = -8; d.onGround = false; d.isLaunched = true
        meter(f, CONDENSE.steamRaw * METER.onHit); f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
      }
      s.stats.orbSteam++; cue(f, 'burst'); pushFx(s, 'steamBlast', x, pr.y ?? 0, pr._en.dir)
    } else if (ice) {
      pr._en.done = true; pr._en.kind = 'hail'; pr.damage = dmg(CONDENSE.hailRaw); pr.vx = pr._en.dir * CONDENSE.hailSpeed; if (pr.speed != null) pr.speed = 1
      s.stats.orbHail++; cue(f, 'crackle'); pushFx(s, 'frost', x, pr.y ?? 0, pr._en.dir)
    }
  }
}
// the disc takes the foes' hits (melee boxes + projectiles) — 80 HP
function updateDisc(f, s, W) {
  const dp = s.field.patches.find(p => p.disc)
  if (!s.disc || !dp) { if (s.disc && !dp) { if (s.disc.pid) recedePlatform(s.disc.pid); s.disc = null }; return }
  const R = { x: dp.x, y: dp.floor - 8, w: dp.width, h: 16 }, hit = (b) => b && b.w > 0 && R.x < b.x + b.w && R.x + R.w > b.x && R.y < b.y + b.h && R.y + R.h > b.y
  for (const o of foesOf(f, W)) {
    const a = o.attacking ? o.currentAttack : null
    if (a && elapsed(a) >= a.activeStart && elapsed(a) <= a.activeEnd) {
      const key = sideOf(o) + ':' + (a.name || '') + ':' + a.total
      if (!s.disc.hitSerial[key]) { const b = W?.attackBox?.(o); if (hit(b)) { s.disc.hitSerial = { [key]: 1 }; s.disc.hp -= a.damage || 40 } }
    }
  }
  const P = W?.projectiles || []
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; if (!p || p.owner === f) continue; const b = { x: (p.x ?? 0) - (p.w || 20) / 2, y: (p.y ?? 0) - (p.h || 20) / 2, w: p.w || 20, h: p.h || 20 }; if (hit(b)) { s.disc.hp -= p.damage || 30; P.splice(i, 1) } }
  dp.disc.hp = s.disc.hp
  if (s.disc.hp <= 0) breakDisc(f, s)
}

// ── GLIDE ──
export function startGlide(f, s, type, dir, how = 'charge') {
  const chk = check(f, type); if (!chk.ok) { reject(f, chk.why); return false }
  s.glide = { type, dir, k: 0, v: 0, turn: 0, how }; s.ramp = null
  f.dashTimer = 0; f.vx = 0; f.facing = dir; f.isBlocking = false
  s.stats.glides++; s.stats[type === 'ice' ? 'iceGlide' : 'fireGlide']++; cue(f, 'glide')
  return true
}
export function switchGlide(f, s, type) {
  if (!s.glide || s.glide.type === type) return false
  const chk = check(f, type); if (!chk.ok) { reject(f, chk.why); return false }
  s.glide.type = type; s.stats.switches++; cue(f, 'switch'); pushFx(s, 'switch', ctrX(f), feetY(f), s.glide.dir, { el: type }); return true
}
function endGlide(f, s, keep) { if (!s.glide) return; if (!keep) f.vx = s.glide.dir * Math.min(6, s.glide.v * 0.4); s.glide = null; s.pose = null }
function glideStep(f, s, r) {
  const G = s.glide, W = WREF.W, fw = !!(G.dir === -1 ? r.left : r.right), bk = !!(G.dir === -1 ? r.right : r.left)
  if (++G.k > GLIDE.maxFrames || !(r.charge || (G.how === 'tap' && fw) || (G.how === 'guard' && G.k < 30))) { endGlide(f, s, false); return false }
  const base = GLIDE.run * (G.type === 'ice' ? GLIDE.iceMul : GLIDE.fireMul)
  if (G.type === 'ice' && bk && !G.turn) { G.turn = GLIDE.turnFrames; cue(f, 'brake') }
  if (G.turn > 0) { if (--G.turn === 0) G.dir = -G.dir; G.v = base * 0.35 }
  else G.v = G.type === 'fire' && bk ? base * GLIDE.fireSteer : base
  f.facing = G.dir
  // a wall: the stage edge, OR anything that pushed him back since last frame (the camera leash between the fighters)
  const moved = G.px == null ? null : (f.x - G.px) * G.dir
  const nx = Math.max(0, Math.min(sw(W) - f.w, f.x + G.dir * G.v))
  if ((nx === f.x && G.v > 0 && !G.turn) || (moved != null && !G.turn && G.pv > 4 && moved < G.pv * 0.25)) { endGlide(f, s, true); f.vx = 0; return false }
  f.x = Math.round(nx * 100) / 100; f.vx = 0; G.px = f.x - G.dir * G.v; G.pv = G.turn ? 0 : G.v
  push(f, s, (G.type === 'ice' ? -1 : 1) * GLIDE.thermalPerSec / 60)
  if (!s.glide) return false
  if (G.k % GLIDE.trailEvery === 0) lay(f, s, W, { type: G.type, cx: ctrX(f) - G.dir * 16, width: GLIDE.trailW, extend: true })
  s.pose = G.turn ? 'glideTurn' : 'glide'
  return true
}
// ICE-WALKERS keep full footing on his ICE: Enoch himself, and FROZONE (an ice skater does not slip on ice — his FIRE / STEAM
// still hurt him). Decided on Enoch's side only; no Frozone file changes. See docs/enoch/BALANCE_NOTES.md.
export const ICE_WALKER = o => isEnoch(o) || o?.rosterKey === 'frozone'
// physics.resolvePlayerCollision: an ICE glide skates PAST the opponent (the brief's "Ice Glide past"); a fire glide collides
export const enochPhasing = (a, b) => [a, b].some(f => isEnoch(f) && f._enoch?.glide?.type === 'ice')
export function startRamp(f, s) {
  const G = s.glide; if (!G) return false
  s.ramp = { type: G.type, air: 1 }; f.vy = GLIDE.rampVy; f.vx = G.dir * G.v * GLIDE.rampVx; f.onGround = false; f.grounded = false; f.jumpHeld = true
  f.jumpCount = Math.max(f.jumpCount || 0, 1); s.glide = null; s.stats.ramps++; cue(f, 'ramp'); pushFx(s, 'ramp', ctrX(f), feetY(f), G.dir, { el: G.type })
  return true
}

// ── Movement hook (game.js, once per movement frame right BEFORE physics.moveFighter) ──
export function enochLocked(f, raw = null) {
  if (!isEnoch(f)) return false
  if (isEnochUltActive()) return true
  const s = enState(f), g = grounded(f), r = raw || {}
  const free = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isGrabbed && !f.knockdownState && f.health > 0
  if (s.glide) { if (!free || !g) endGlide(f, s, false); else if (glideStep(f, s, r)) { f._dashTap = false; return true } }
  if (g && free && r.charge && (r.down || r.up || r.jump)) { f.vx = 0; f._dashTap = false; return true }   // CHANNEL: rooted, Up + Charge never jumps
  // double-tap forward on his own ICE / FIRE trail → glide of that type instead of the dash
  if (g && free && f._dashTap) {
    const here = patchesAt(s.field, ctrX(f), feetY(f)).filter(p => p.type === 'ice' || p.type === 'fire')
    if (here.length && startGlide(f, s, here[here.length - 1].type, f.facing || 1, 'tap')) { f._dashTap = false; glideStep(f, s, { ...r, [f.facing === -1 ? 'left' : 'right']: true }); return true }
  }
  const a = live(f)
  if (a && a.en.key !== 'air' && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  return false
}

// ── TICK (game.js, every frame, before the command layer) ──
export function tickEnoch(f, opp, raw, W) {
  if (!isEnoch(f)) { if (f?._enoch) clearEnoch(f, W); return }
  WREF.W = W
  const s = enState(f); s.tick++
  // presentation memo, read by sprite.js when he wins (never by the sim): a round in which he rode a disc ends ON the disc, in
  // the colour of his final thermal (hot = fire, balance = water, else ice); otherwise the plain win. Survives clearEnoch.
  f._enochWinPose = s.stats.discs > 0 ? (s.th.v >= TP.hot ? 'winDisc_fire' : Math.abs(s.th.v) <= TP.balance ? 'winDisc_water' : 'winDisc') : 'win'
  const face = f.facing || 1, fw = !!(face === -1 ? raw.left : raw.right), bk = !!(face === -1 ? raw.right : raw.left)
  const dg = dirDigit(raw, face)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== dg) { s.dirs.push({ d: dg, c: s.clock }); if (s.dirs.length > 16) s.dirs.shift() }
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'grab', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, fwd: fw, back: bk,
      m: { super: motionMatch(s, '236236', 30), qcf: motionMatch(s, '236', 14), qcb: motionMatch(s, '214', 14), dd: motionMatch(s, '22', 14), ff: motionMatch(s, '656', 14), dp: motionMatch(s, '623', 14) } }
    s.prev[k] = v
  }
  const g = grounded(f)
  if (g) s.floor = feetY(f)
  else if (s.floor == null) s.floor = f.groundY ?? null
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  if (s.beamFx && --s.beamFx.t <= 0) s.beamFx = null
  // super meter from damage taken
  if (s.prevHp != null && f.health < s.prevHp) meter(f, (s.prevHp - f.health) * METER.onTaken)
  s.prevHp = f.health
  if (f.health <= 0) { s.glide = null; if (s.beam) endBeam(f, s); s.ramp = null; s.pose = null; s.wall = null; if (s.disc) breakDisc(f, s); killProj(f, W); return }
  // wake-up window: opens as a knockdown ends
  if (s.wasDown && !f.knockdownState) s.wakeWin = 10
  else if (s.wakeWin > 0) s.wakeWin--
  s.wasDown = !!f.knockdownState
  if (f.hitstop > 0) return
  s.clock++
  for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--
  // GUARD CANCEL: Charge pressed in blockstun → a glide out (25 thermal, 8 invulnerable frames, 10 s cooldown). It lives here,
  // not in the command layer, because game.js returns before the command layer while the fighter is in blockstun.
  if (f.blockstun > 0 && g && s.edges.charge && s.used.charge !== s.edges.charge.tick && s.clock - s.edges.charge.clock <= 4 && s.cd.guard <= 0) {
    const e = s.edges.charge; s.used.charge = e.tick
    const type = (zoneOf(f) === 'hot' || !check(f, 'ice').ok) ? 'fire' : 'ice', dir = e.fwd ? (f.facing || 1) : -(f.facing || 1)
    if (check(f, type).ok) {
      f.blockstun = 0; f.isBlocking = false; f.invulnTimer = Math.max(f.invulnTimer || 0, GUARD_CANCEL.invuln); s.cd.guard = GUARD_CANCEL.cooldown
      pushThermal(f, (type === 'ice' ? -1 : 1) * GUARD_CANCEL.thermal); s.stats.guardCancels++
      startGlide(f, s, type, dir, 'guard')
    }
  }
  const fr = s.tick
  // CHANNEL: Down + Charge held = cool, Up + Charge held = heat (rooted; the meter moves toward ±CHANNEL.to, never past it)
  const chFree = g && !f.attacking && !s.glide && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.knockdownState && !f.isGrabbed && f.health > 0
  const ch = chFree && raw.charge ? (raw.down ? -1 : (raw.up || raw.jump) ? 1 : 0) : 0
  if (ch && !(s.th.over > 0)) {   // not during an overload
    const room = ch * CHANNEL.to - s.th.v
    if (room * ch > 0) push(f, s, ch * Math.min(CHANNEL.rate, Math.abs(room)))
    if (!s.channel) { s.stats.channels++; cue(f, ch < 0 ? 'crackle' : 'fireCrackle') }
    s.channel = ch; f.vx = 0
  } else s.channel = 0
  thermalTick(s.th, TP, !!(s.glide || s.beam || live(f) || s.channel))
  // field: expiry, effects, matchup rules
  for (const p of tickField(s.field, fr)) if (p.disc) { if (s.disc?.pid) recedePlatform(s.disc.pid); s.disc = null }
  const all = W?.fighters?.() || [f, opp].filter(Boolean)
  const hurt = applyPatchEffects(s.field, all, { frame: fr, owner: sideOf(f), ownerX: ctrX(f), sideOf, grounded, feet: feetY, cx: ctrX, walker: ICE_WALKER,
    damage: (t, n, o) => W?.damage?.(t, n, { attacker: f, ...o }) })
  for (const h of hurt) { s.stats.patchDmg += h.dmg; meter(f, h.dmg * METER.onHit); if (h.type === 'fire') afflict(f, h.fighter, 'fire', STATUS.patchTick, W) }
  tickAfflictions(f, s, W, opp)
  // FIRE DASH / ICE DASH (and the slide): outside the balance band his dash leaves a trail of his element
  const tw = twinOf(f), dashing = g && !s.glide && (f.dashTimer || 0) > 0, sliding = g && live(f)?.en?.key === 'slide'
  if (dashing && !s.dashWas && tw) { s.stats[tw === 'fire' ? 'fireDash' : 'iceDash']++; cue(f, tw === 'fire' ? 'fireCast' : 'crackle') }
  s.dashWas = dashing
  if (tw && (dashing || sliding) && s.tick % TWIN.trailEvery === 0) lay(f, s, W, { type: tw, cx: ctrX(f) - face * 16, width: TWIN.trailW, extend: true })
  for (const o of foesOf(f, W, opp)) if (isSanjiLit(o) && grounded(o)) for (const p of patchesAt(s.field, ctrX(o), feetY(o))) if (p.type === 'ice' && !p.disc) {   // SANJI: a lit Diable Jambe melts his ice to water
    convertPatch(s.field, p, 'water', fr); s.stats.sanjiMelt++; cue(f, 'hiss'); pushFx(s, 'steamPuff', ctrX(o), feetY(o), 1)
  }
  updateDisc(f, s, W)
  updateOrbs(f, s, W)
  updateWall(f, s, W, opp)
  // ramp landing lays a patch of the glide's element
  if (s.ramp && g && (f.vy || 0) >= 0) { lay(f, s, W, { type: s.ramp.type, cx: ctrX(f) }); s.stats.rampLand++; cue(f, 'land'); pushFx(s, 'landBurst', ctrX(f), feetY(f), face, { el: s.ramp.type }); s.ramp = null }
  s.pose = s.glide ? s.pose : (s.ramp && !g) ? 'ramp' : (g && f._floorPlatformId && String(getPlatforms().find(p => p.id === f._floorPlatformId)?.owner || '').startsWith('enoch')) ? 'standDisc' : null
  if (s.channel && !s.glide) s.pose = s.channel < 0 ? 'channel' : 'channel_fire'
  // pending water cost (applied as the move ends — or is cancelled)
  const a0 = live(f)
  if (s.pend && !(a0 && a0.en.serial === s.pend.serial)) { const v = s.th.v; push(f, s, (v < 0 ? -1 : 1) * Math.abs(s.pend.amt)); s.pend = null }
  if (a0 && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) { endAttack(f); if (s.beam) endBeam(f, s) }   // interrupted: an unreleased cast spawns nothing
  if (s.glide && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) endGlide(f, s, false)
  const A = live(f), m = A?.en
  // LASER GAUGE (beam.js — the Homelander / Superman driver): refill / cooldown / overheat while idle; while the beam runs:
  // min burst 12, drain 1 / frame, lock-on (Up / Down = manual sweep), release → 1 s cooldown, empty gauge → 2.5 s overheat
  if (s.beam && (f.hitstun > 0 || f.isGrabbed || f.knockdownState)) endBeam(f, s)
  if (s.beam) {
    const held = !!raw.special && !!(A && m?.key === 'heatLens')
    const r = laserStep(s.laser, LASER, { held, up: !!raw.up, down: !!raw.down, aim: (raw.up || raw.down) ? null : laserAim(f, W) })
    if (r !== 'fire') { if (r === 'overheat') { s.stats.laserOverheat++; cue(f, 'overload') } s.beam = null; cue(f, 'laserOff'); if (A && m?.key === 'heatLens') A.timer = Math.min(A.timer, ALL_MOVES.heatLens.recovery) }
    else {
      const B = s.beam; B.k++; B.angle = s.laser.angle
      if (held) { A.timer++; push(f, s, (s.beamEl === 'ice' ? -1 : 1) * HEAT_LENS.hotPerSec / 60) }    // hold the pose (and heat up) while Special is held
      if (s.beam && held && B.k % HEAT_LENS.tickEvery === 0) { s.stats.beamTicks++; beamPulse(f, s, W, B.angle, HEAT_LENS.tickRaw * m.mul, HEAT_LENS.holdHitstun, false) }
      else if (s.beam) { const o = lensOrigin(f), e = marchBeam(o.x, o.y, B.angle, f.facing || 1, Math.min(HEAT_LENS.len, sw(W)), (foesOf(f, W)[0] && box(foesOf(f, W)[0])) || null); s.beamFx = { ox: Math.round(o.x), oy: Math.round(o.y), tx: Math.round(e.x), ty: Math.round(e.y), hit: !!e.hit, t: 2, tick: s.tick, el: s.beamEl } }
    }
  } else laserStep(s.laser, LASER, {})
  if (!m || f.hitstun > 0 || f.isGrabbed) return
  const t = elapsed(A), md = ALL_MOVES[m.key]
  f.facing = s.beam ? f.facing : m.dir
  if (m.key === 'heatLens' && t < md.releaseAt && raw.special) m.held = true
  else if (m.key === 'heatLens' && t < md.releaseAt) m.held = false
  if (md.releaseAt != null && t === md.releaseAt && !m.released) { m.released = true; release(f, s, W, A, m, md) }
  if (md.travel && t >= md.travel[0] && t < md.travel[1]) {   // SLIDE: travels (glide momentum carried)
    const v = Math.max(md.travel[2], m.glideV || 0) * (1 - (t - md.travel[0]) / (md.travel[1] - md.travel[0]) * 0.5)
    const o = foesOf(f, W, opp)[0]; let nx = Math.max(0, Math.min(sw(W) - f.w, f.x + m.dir * v))
    if (o) { if (m.dir > 0 && f.x + f.w <= o.x + 1) nx = Math.min(nx, o.x - f.w); if (m.dir < 0 && f.x >= o.x + o.w - 1) nx = Math.max(nx, o.x + o.w) }
    f.x = Math.round(nx * 100) / 100; f.vx = 0
    if (t === md.travel[0] + 4) lay(f, s, W, { type: 'ice', cx: ctrX(f) - m.dir * 20, width: 90 })   // a short ICE patch
  } else if (g && !md.air) f.vx = 0
  if (md.air && g && t > 2) endAttack(f, 4)
}

// ── INTRO: glides in on a fresh ice trail, then settles (combat / physics frozen during INTRO, so x is set directly) ──
export const INTRO = { dist: 240, arrive: 40 }
export function updateEnochIntro(f) {
  if (!isEnoch(f) || !f._introPlaying) return
  if (f._enHomeX == null) f._enHomeX = f.x
  const k = Math.min(1, (f._introRevealFrame || 0) / INTRO.arrive), e = 1 - (1 - k) * (1 - k)
  f.x = f._enHomeX - (f.facing || 1) * INTRO.dist * (1 - e)
}
export function finalizeEnochIntro(f) { if (isEnoch(f) && f._enHomeX != null) { f.x = f._enHomeX; delete f._enHomeX } }

// ══ SUPER — the shared FROZEN-CINEMATIC contract (Frozone / Rangers / Syndrome): game.js freezes combat, physics and input
// while active and calls updateEnochUlt() each frame. Damage = scheduled contacts through W.damage with the combo scale
// captured at the confirm; poses are non-hitting currentAttacks; everything visual is enochFx reading enochUltView. ══
const cine = { active: false, frame: 0, caster: null, target: null, W: null, variant: null, done: 0, scale: 1, cx: 0, tx: 0, ty: 0, dir: 1, ticks: 0 }
export const isEnochUltActive = () => cine.active
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - at, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, en: null, _ultPose: true }
}
function superRelease(f, s, W, a, m) {
  const d = m.dir, R = ALL_MOVES.super.range
  let tgt = null
  for (const t of foesOf(f, W)) { const dx = (ctrX(t) - ctrX(f)) * d; if (dx > -20 && dx < R && Math.abs(feetY(t) - feetY(f)) < 220 && (!tgt || dx < (ctrX(tgt) - ctrX(f)) * d)) tgt = t }
  if (!tgt || (tgt.invulnTimer || 0) > 0) { s.stats.superWhiff++; cue(f, 'superMiss'); return }
  if (tgt.isBlocking) { s.stats.superBlocked++; W?.damage?.(tgt, 30, { attacker: f, source: 'super', damageType: SUPERS[m.variant].damageType }); tgt.blockstun = Math.max(tgt.blockstun || 0, 20); cue(f, 'superMiss'); return }
  activateEnochUlt(f, tgt, W, m.variant)
}
export function activateEnochUlt(f, target, W, variant) {
  if (cine.active || !f || !target) return false
  const s = enState(f)
  s.glide = null; if (s.beam) endBeam(f, s); s.ramp = null; s.wall = null
  Object.assign(cine, { active: true, frame: 0, caster: f, target, W, variant, done: 0, ticks: 0, scale: E.comboScale?.(f) ?? 1, dir: f.facing || 1,
    cx: f.x, tx: target.x, ty: target.y })
  s.ult = { variant, frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  cue(f, 'superConfirm_' + variant)
  return true
}
function ultDamage(raw, kind) {
  const f = cine.caster, t = cine.target, V = SUPERS[cine.variant]
  if (!(t.health > 0)) return
  cine.W?.damage?.(t, dmg(raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate', damageType: V.damageType })
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90; t.colorFlash = 6
  cue(f, kind)
}
export function updateEnochUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, s = f?._enoch
  if (!f || !t || !s) return clearEnochUlt()
  const V = SUPERS[cine.variant], k = cine.frame
  if (V.contacts) { for (let i = 0; i < V.contacts.length; i++) if (k === V.contacts[i].at && cine.done === i) { cine.done = i + 1; ultDamage(V.contacts[i].raw, i === V.contacts.length - 1 ? 'superFinal' : 'superHit') } }
  else {
    if (k >= V.beamFrom && k < V.beamTo && (k - V.beamFrom) % V.tickEvery === 0) { cine.ticks++; cine.done = cine.ticks; ultDamage(V.tickRaw, 'superTick') }
    if (k === V.flareAt) { cine.done = cine.ticks + 1; ultDamage(V.flareRaw, 'superFinal') }
  }
  const last = V.contacts ? V.contacts[V.contacts.length - 1].at : V.flareAt
  if (!(t.health > 0) && k > 0 && k < last) cine.frame = last + 1
  pose(f, cine.frame < 12 ? 'super' : (cine.variant === 'flashPoint' ? 'heatLens' : cine.variant === 'absoluteZero' ? 'deepFreeze' : 'tideBreak'), cine.frame)
  f.x = cine.cx; f.vx = 0; f.vy = 0; f.facing = cine.dir
  t.x = cine.tx; t.y = cine.ty; t.vx = 0; t.vy = 0; t.isBlocking = false
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > 40) s.fx.splice(i, 1)
  if (s.ult) { s.ult.frame = cine.frame; s.ult.done = cine.done }
  if (++cine.frame >= V.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target, V = SUPERS[cine.variant], W = cine.W
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) {
      if (V.freeze) { t._supFrozen = V.freeze; t._supFrozenMax = V.freeze; t.hitstun = V.freeze }
      else { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) }
    } }
  if (f) {
    endAttack(f, 12); f.vx = 0; f.vy = 0
    const s = f._enoch
    if (s) { s.stats.superDone = (s.stats.superDone || 0) + 1; delete s.ult
      if (cine.variant === 'thermalShock' && t) {   // leaves WATER + STEAM where it landed
        lay(f, s, W, { type: 'water', cx: ctrX(t), calm: CALM_FRAMES }); lay(f, s, W, { type: 'steam', cx: ctrX(t), calm: CALM_FRAMES }) } }
  }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, variant: null, done: 0, ticks: 0 })
}
export function clearEnochUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.hitstun = 0; t.vx = 0; t.vy = 0 }
  if (f) { endAttack(f); f.vx = 0; f.vy = 0; if (f._enoch) delete f._enoch.ult }
  Object.assign(cine, { active: false, frame: 0, caster: null, target: null, W: null, variant: null, done: 0, ticks: 0 })
}
export const getEnochUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, variant: cine.variant, caster: cine.caster ? sideOf(cine.caster) : null })
export function enochUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const t = cine.target
  return { variant: cine.variant, frame: cine.frame, done: cine.done, dir: cine.dir, tx: ctrX(t), ty: ctrY(t), feet: feetY(t), tW: t.w || 48, tH: t.h || 94 }
}
