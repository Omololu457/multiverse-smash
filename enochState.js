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
import { ALL_MOVES, ICE_BLAST, FROST_FLOOR, HEAT_LENS, LASER, WALLS, WALL_STEAM, CHANNEL, STATUS, TWIN, AIR_SLIDE, CAGE, METEOR, SNOWMAN, MELT, PATCH_LIFE, GROUND_SLIDE, ICE_FLOOR, SLAB, FLOW, MODE, SLICE, SCORCH, CONDENSE, TIDE, DISC, GLIDE, GUARD_CANCEL, METER, SUPERS, SUPER_LOCK, dmg } from './enochData.js'
import { ENOCH_LENS, ENOCH_ANIM } from './enochSprites.js'
const ENOCH_ANIM_HIT = strip => ENOCH_ANIM[strip]?.hit ?? 1   // the visor fires on the strip's HIT frame
import { registerThermal, createThermal, thermalCheck, thermalPush, thermalTick, thermalZone, createField, addPatch, removePatch, convertPatch,
  tickField, patchesAt, applyPatchEffects, clearElementFlags, elWet, CALM_FRAMES } from './elements.js'
import { marchBeam, beamFloorHit, createLaser, laserReady, laserStart, laserStep, laserCut } from './beam.js'
import { registerFrozoneHost } from './frozoneState.js'
import { spawnPlatform, recedePlatform, getPlatforms } from './platforms.js'
import { INPUT_BUFFER_FRAMES } from './input.js'
import { registerFreezeCine } from './cineRegistry.js'
import { dirDigit, motionMatch } from './elastigirlState.js'

export const ENOCH_KEY = 'enoch'
export const isEnoch = f => f?.rosterKey === ENOCH_KEY
export const TP = registerThermal('enoch', {})          // the brief's numbers are the framework defaults
const stats0 = () => ({ clean: 0, blocked: 0, rejects: 0, spawns: 0, glides: 0, iceGlide: 0, fireGlide: 0, switches: 0, ramps: 0, rampLand: 0, discs: 0, discMelt: 0,
  discBreak: 0, bursts: 0, burstHits: 0, steam: 0, refreeze: 0, overloads: 0, beams: 0, beamHits: 0, beamTicks: 0, beamFloor: 0, wetHits: 0, freezes: 0,
  tides: 0, tideBursts: 0, orbs: 0, orbSteam: 0, orbHail: 0, guardCancels: 0, wakes: 0, supers: 0, superDone: 0, superWhiff: 0, superBlocked: 0, patchDmg: 0,
  sanjiMelt: 0, arlongDouse: 0, meter: 0, stanceSwitches: 0, channels: 0, walls: 0, iceWalls: 0, fireWalls: 0, wallLaunch: 0, wallBlocks: 0, wallBurns: 0, wallSteam: 0, laserOverheat: 0,
  burns: 0, chills: 0, burnTicks: 0, boxes: 0, shocks: 0, quenches: 0, fireShards: 0, flameFloors: 0, frostLens: 0, fireDash: 0, iceDash: 0, airSlides: 0, iceSlides: 0, fireSlides: 0, airDenied: 0, airHops: 0, maxChain: 0, airSlideHits: 0, cages: 0, meteors: 0, fireMeteors: 0, meteorHits: 0, snowmen: 0, snowBlocks: 0, snowMelt: 0, melts: 0, encased: 0, cometHits: 0, modeSwitches: 0, slices: 0, groundSlides: 0, iceFloorHits: 0, slabLands: 0, slabShoves: 0, slabBonks: 0 })
export const enState = f => f._enoch ||= { tick: 0, clock: 0, prev: {}, edges: {}, used: {}, dirs: [], serial: 0, nEnt: 0,
  th: createThermal(), field: createField(6), glide: null, ramp: null, beam: null, beamFx: null, disc: null, pend: null, wall: null, laser: createLaser(LASER), stance: 'elemental', mode: null, pass: 0, moving: false, sliced: {}, channel: 0, aff: {}, beamEl: 'fire', dashWas: false, air: { chain: 0, armed: true, win: 0, jc: 0 }, aslide: null, rails: [], snow: null, meteors: [], encase: null,
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
  // the Ice Stream (Ice Stance's air double-tap) counts as a link of his AIR CHAIN (refused past chainMax)
  air: (f, commit) => { const s = enState(f); if (s.air.chain >= AIR_SLIDE.chainMax) { if (commit === false) s.stats.airDenied++; return false } if (commit) { s.air.chain++; s.stats.airSlides++; s.stats.iceSlides++ } return true },
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
  for (const q of s?.rails || []) dropSlab(q)
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
// his temperature is PINNED to his mode (no thermal bar to manage any more): ice −pin, fire +pin, no mode 0
function pinMode(s) { s.th.v = s.mode === 'ice' ? -MODE.pin : s.mode === 'fire' ? MODE.pin : 0; s.th.over = 0; s.th.overSide = 0; s.th.lock = 0 }
export const modeOf = f => enState(f).mode
// Down + Charge = ICE MODE, Up + Charge = FIRE MODE: one press, ENERGY bar only; the same one again = back to no mode
export function setMode(f, m) {
  if (!isEnoch(f) || (m !== 'ice' && m !== 'fire')) return false
  const s = enState(f)
  if (s.mode === m) { s.mode = null; pinMode(s); if (s.glide) endGlide(f, s, false); cue(f, 'switch'); return true }
  if ((f.energy || 0) < MODE.cost) { reject(f, 'energy'); return false }
  f.energy = Math.max(0, (f.energy || 0) - MODE.cost); s.mode = m; pinMode(s); s.stats.modeSwitches++
  if (m === 'fire') { s.noJump = INPUT_BUFFER_FRAMES + 1; f.jumpHeld = true }   // the Up of Up + Charge (buffered ~10 f by the engine) must not jump
  if (s.glide && s.glide.type !== m) { s.glide.type = m; s.stats.switches++ }   // mid-glide: the trail changes element (the trails react)
  cue(f, m === 'ice' ? 'crackle' : 'fireCast'); pushFx(s, 'switch', ctrX(f), feetY(f), f.facing || 1, { el: m }); pushFx(s, m === 'ice' ? 'frost' : 'fireImpact', ctrX(f), feetY(f), f.facing || 1)
  return true
}
function push(f, s, delta) {
  pinMode(s); return   // 2026-11-17: the mode pins his temperature — moves no longer push a thermal bar (the overload code below is dormant)
  if (thermalPush(s.th, TP, delta) === 'overload') {
    s.stats.overloads++; cue(f, 'overload'); pushFx(s, 'overload', ctrX(f), f.y + 20, s.th.overSide)
    if (s.glide && ((s.glide.type === 'ice' && s.th.overSide < 0) || (s.glide.type === 'fire' && s.th.overSide > 0))) endGlide(f, s, false)
    if (s.beam && s.th.overSide > 0) endBeam(f, s)
  }
}
export function pushThermal(f, d) { push(f, enState(f), d) }
export const waterUnlocked = f => !!enState(f).mode   // water = where ice meets fire: either mode opens his water moves

// ── PATCHES ──
// lay a patch (with every merge / reaction / burst it causes), handling the disc melt + the Arlong douse first
function lay(f, s, W, o) {
  const fr = s.tick
  const q = { owner: sideOf(f), frame: fr, floor: o.floor ?? floorOf(f, s), minX: 0, maxX: sw(W), life: PATCH_LIFE[o.type], ...o }
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
const affOf = (s, t) => (s.aff[sideOf(t)] ||= { burn: 0, burnT: 0, burnK: 0, chill: 0, chillT: 0, box: 0, boxCd: 0, px: null, cage: 0, cageCd: 0, cageK: 0, cageX: 0 })
const r2 = v => Math.round(v * 100) / 100
export function afflict(f, t, el, amt, W = WREF.W) {
  if (!isEnoch(f) || !t || t === f || !(t.health > 0) || !(el === 'fire' || el === 'ice') || !(amt > 0)) return null
  const s = enState(f), A = affOf(s, t), S = STATUS
  if (el === 'fire') {
    if (A.box > 0) { A.box = 0; t._supFrozen = 0 }                                // fire thaws an ice box
    if (A.cage > 0) return 'caged'                                                  // already in the fire
    if (A.chill >= S.comboAt && amt >= 1) {                                         // THE COMBINATION: fire on the chilled = STEAM SHOCK
      const raw = S.shockRaw * Math.floor(A.chill); A.chill = 0; A.chillT = 0; s.stats.shocks++
      W?.damage?.(t, raw, { attacker: f, source: 'steamShock', damageType: 'energy' }); cue(f, 'burst'); pushFx(s, 'steamBlast', ctrX(t), ctrY(t), 1); return 'shock'
    }
    A.burn = r2(Math.min(S.max, A.burn + amt)); A.burnT = S.life; s.stats.burns++
    if (A.burn >= S.max && !((A.cageCd || 0) > 0) && !(A.cage > 0)) {             // the FIRE CAGE: trapped in a column of fire
      A.cage = CAGE.frames; A.cageCd = CAGE.frames + CAGE.cd; A.cageK = 0; A.cageX = t.x; A.burn = 2; A.burnT = S.life; s.stats.cages++
      t.hitstun = Math.max(t.hitstun || 0, CAGE.frames); t.vx = 0; cue(f, 'burst'); pushFx(s, 'flameFloor', ctrX(t), feetY(t), 1); return 'cage'
    }
    return 'burn'
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
    if (A.cageCd > 0) A.cageCd--
    if (A.cage > 0) {                                                               // FIRE CAGE: held in place, burning
      A.cage--; t.hitstun = Math.max(t.hitstun || 0, A.cage); t.vx = 0; t.x = A.cageX
      if (++A.cageK >= CAGE.every) { A.cageK = 0; W?.damage?.(t, CAGE.raw, { attacker: f, source: 'fireCage', damageType: 'energy' }); s.stats.burnTicks++ }
    }
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
  if (k.kind === 'meteor') {   // the ICE SPIKE: frozen where they stand, the ice climbing up over them
    s.stats.meteorHits++; const P = METEOR.ice
    if (target.health > 0) { target._supFrozen = P.freeze; target._supFrozenMax = P.freeze; target.hitstun = Math.max(target.hitstun || 0, P.freeze); target.vx = 0; s.encase = { side: sideOf(target), t: 0, n: P.freeze }; s.stats.encased++; cue(f, 'freeze') }
    afflict(f, target, 'ice', P.chill)
  } else if (k.kind === 'comet') { s.stats.cometHits++; afflict(f, target, 'fire', METEOR.fire.burn) }
  else if (pel) afflict(f, target, pel, STATUS.hit)
  pushFx(s, pel === 'fire' ? 'ember' : (k.kind === 'blast' || k.kind === 'hail') ? 'frost' : 'chip', proj.x, proj.y, k.dir || 1)
}

// ── MOVES ──
function reject(f, why) { const s = enState(f); s.stats.rejects++; s.lastReject = why || 'reject'; cue(f, 'reject') }
// Start a move through combat.startMove (frameExact) and attach the descriptor `en`. All checks happen BEFORE anything is spent.
export function startEnMove(f, key, W, { cancel = false, bonus = 1, variant: forceVariant = null } = {}) {
  if (!isEnoch(f)) return false
  const s = enState(f), md = ALL_MOVES[key], g = grounded(f)
  if (!md || f.health <= 0 || f.hitstun > 0 || f.isGrabbed || f.knockdownState) return false
  if (f.blockstun > 0) return false
  if (md.isSpecial && (f.disabledSpecials || []).includes('special')) return false
  if (md.isSpecial && key !== 'super' && !s.mode) { reject(f, 'mode'); return false }   // NO MODE: plain attacks only
  if (md.air && g) return false
  if (!md.air && !md.airOk && !g) { reject(f, 'air'); return false }
  const el = moveElement(f, key)
  const chk = el === 'water' ? { ok: !!s.mode, why: 'mode', cost: 1, dmg: 1 } : (el === 'ice' || el === 'fire') && s.mode && el !== s.mode ? { ok: false, why: 'locked', cost: 1, dmg: 1 } : el ? check(f, el) : { ok: true, cost: 1, dmg: 1 }
  if (!chk.ok) { reject(f, chk.why); return false }
  if (md.cooldown && s.cd[key] > 0) { reject(f, 'cooldown'); return false }
  if (key === 'heatLens' && !laserReady(s.laser)) { reject(f, s.laser.over > 0 ? 'overheat' : 'laser'); return false }
  if (key === 'iceBlast' && ownProj(f, W, 'blast').length >= ICE_BLAST.pool) { reject(f, 'pool'); return false }
  if ((md.cost || 0) > (f.energy || 0)) { reject(f, 'meter'); return false }
  const variant = key === 'super' ? (forceVariant && SUPERS[forceVariant] ? forceVariant : superVariant(f)) : null
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
  if (key === 'meteor') s.stats.meteors++
  if (key === 'fireMeteor') s.stats.fireMeteors++
  if (key === 'snowman') s.stats.snowmen++
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
    cue(f, fl ? 'fireCast' : 'crackle'); cue(f, 'eruptShake'); pushFx(s, 'erupt', cx, feet, d, { el: fl ? 'fire' : 'ice', x0: Math.round(fr), seed: m.serial, life: 90 })   // the 8-step eruption (render: enochFx drawErupt)
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
  } else if (m.key === 'meteor' || m.key === 'fireMeteor') {
    // aimed at the nearest foe's spot (or ahead). ICE: one spike straight down. FIRE: the rain — each comet's start time and
    // offset come from ehash(move serial, comet, side, slot): random-looking, identical on every replay.
    const t = foesOf(f, W).sort((p, q) => Math.abs(ctrX(p) - ctrX(f)) - Math.abs(ctrX(q) - ctrX(f)))[0]
    const el = m.key === 'fireMeteor' ? 'fire' : 'ice', P = METEOR[el], tx = t ? ctrX(t) : ctrX(f) + d * 300, floor = floorOf(f, s), sd = sideOf(f)
    for (let i = 0; i < P.n; i++) {
      const h1 = ehash(m.serial, i, sd, 11), h2 = ehash(m.serial, i, sd, 23), h3 = ehash(m.serial, i, sd, 37)
      const wait = el === 'fire' ? Math.round(i * P.every + h1 * P.jitter) : 0
      const off = el === 'fire' ? Math.round((h2 - 0.5) * 2 * P.spread) : 0
      s.meteors.push({ el, x: Math.round(tx + off), off, y: Math.round(floor - METEOR.from - (el === 'fire' ? h3 * 120 : 0)), vy: METEOR.vy0 + (el === 'fire' ? h3 * 4 : 0),
        dir: el === 'fire' ? (h3 < 0.5 ? -1 : 1) : d, floor: Math.round(floor), wait, t: 0, serial: m.serial, mul: m.mul, k: i, n: ++s.nEnt })
    }
    if (el === 'fire') pushFx(s, 'skyFire', ctrX(f) - d * 10, feetY(f) - 96, d)   // the jet thrown up out of his raised fist
    cue(f, el === 'fire' ? 'fireCast' : 'crackle')
  } else if (m.key === 'snowman') {
    const P = SNOWMAN, floor = floorOf(f, s), x = Math.round(Math.max(P.w, Math.min(sw(W) - P.w, ctrX(f) + d * P.ahead)))
    s.snow = { x, floor: Math.round(floor), t: 0, hp: P.hp, dir: d, melt: 0, heat: 0, n: ++s.nEnt }
    cue(f, 'crackle'); pushFx(s, 'frost', x, floor, d)
  } else if (m.key === 'super') superRelease(f, s, W, a, m)
}
// ── METEORS: fall (gravity), explode on a foe or the floor → one hit volume (blockable, chills / burns) + a patch ──
function updateMeteors(f, s, W) {
  for (let i = s.meteors.length - 1; i >= 0; i--) {
    const q = s.meteors[i], P = METEOR[q.el]
    if (q.wait > 0) { q.wait--; continue }
    if (q.t === 0 && q.el === 'fire') { const o = foesOf(f, W).sort((p, r) => Math.abs(ctrX(p) - q.x) - Math.abs(ctrX(r) - q.x))[0]; if (o) q.x = Math.round(ctrX(o) + q.off - q.dir * P.vx * 20) }   // re-aimed where the foe is now
    q.t++; q.vy = Math.round((q.vy + METEOR.grav) * 100) / 100; q.y = Math.round((q.y + q.vy) * 100) / 100; q.x = Math.round((q.x + q.dir * (P.vx || 0)) * 100) / 100
    const hx = q.el === 'ice' ? P.w / 2 : P.size / 3, hy = q.el === 'ice' ? -8 : P.size / 3   // the spike strikes with its TIP
    const hitFoe = foesOf(f, W).find(o => { const b = box(o); return q.x > b.x - hx && q.x < b.x + b.w + hx && q.y + hy > b.y && q.y < b.y + b.h })
    if (!hitFoe && q.y < q.floor) continue
    const cy = hitFoe ? ctrY(hitFoe) : q.floor - P.radius / 2   // the burst is centred on whoever it struck (else on the floor)
    vol(f, s, W, q.el === 'fire' ? 'comet' : 'meteor', q.serial * 100 + q.k, q.x, cy, P.radius * 2, P.radius * 2, { damage: Math.round(dmg(P.raw) * q.mul * 100) / 100, hitstun: P.hitstun,
      kbx: P.kbx, kby: P.kby, life: 4, dir: q.dir, radius: P.radius, damageType: q.el === 'fire' ? 'energy' : 'blunt', el: q.el })
    if (q.el === 'ice' || q.k % P.patchEvery === 0) lay(f, s, W, { type: q.el, cx: q.x, width: P.patch })
    pushFx(s, q.el === 'fire' ? 'fireImpact' : 'meteorShatter', q.x, q.floor, q.dir)
    cue(f, q.el === 'fire' ? 'burst' : 'shatter'); s.meteors.splice(i, 1)
  }
}
// ── SNOWMAN: a solid sculpture (the ice wall's body rules), eats enemy shots, melts into a WATER puddle ──
export const snowRect = z => { const P = SNOWMAN, k = Math.min(1, (z.t + 1) / P.rise) * (z.melt ? Math.max(0.15, 1 - z.melt / P.melt) : 1); return { x: z.x - P.w / 2, y: z.floor - P.h * k, w: P.w, h: P.h * k } }
function updateSnow(f, s, W, opp) {
  const z = s.snow; if (!z) return
  const P = SNOWMAN; z.t++
  // fire melts it faster: a fire patch under it, his fire wall beside it, a foe burning next to it
  const hot = s.field.patches.some(p => p.type === 'fire' && z.x >= p.x - 20 && z.x <= p.x + p.width + 20) || (s.wall?.type === 'fire' && Math.abs(s.wall.x - z.x) < 120)
  z.heat = hot ? 1 : 0
  if (!z.melt && (z.t >= P.life || z.hp <= 0)) z.melt = 1
  if (z.melt) {
    z.melt += hot ? P.fireMelt : 1
    if (z.melt >= P.melt) { s.snow = null; s.stats.snowMelt++; meltInto(f, s, W, z.x, P.patch, z.floor); return }
  } else if (hot) z.t += P.fireMelt - 1
  const Rc = snowRect(z)
  if (!z.melt || z.melt < P.melt * 0.6) for (const o of foesOf(f, W, opp)) {
    const ob = box(o); if (!hitRect(ob, Rc) || o.y + o.h <= Rc.y + 6) continue
    if (ctrX(o) < z.x) o.x = Rc.x - ob.w; else o.x = Rc.x + Rc.w
    if ((o.vx || 0) * (ctrX(o) < z.x ? 1 : -1) > 0) o.vx = 0
  }
  const Q = W?.projectiles
  if (Q && !z.melt) for (let i = Q.length - 1; i >= 0 && z.hp > 0; i--) {
    const q = Q[i]; if (!q || q.owner === f) continue
    const qw = q.w || q.width || 20, qh = q.h || q.height || 20
    if (!hitRect({ x: q.x - qw / 2, y: q.y - qh / 2, w: qw, h: qh }, Rc)) continue
    Q.splice(i, 1); z.hp--; s.stats.snowBlocks++; cue(f, 'crackle'); pushFx(s, 'chip', q.x, q.y, -z.dir)
  }
}
// MELT: ice that runs out leaves a WATER puddle (calm for a moment, so it never refreezes on the spot) + a splash
function meltInto(f, s, W, cx, width, floor) {
  s.stats.melts++; lay(f, s, W, { type: 'water', cx, width: Math.max(40, Math.round(width * MELT.width)), floor, calm: MELT.calm })
  pushFx(s, 'melt', cx, floor, 1, { w: width }); cue(f, 'hiss')
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
  if (w.t >= P.life) { s.wall = null; if (w.type === 'ice') meltInto(f, s, W, w.x, P.w * 3, w.floor); else pushFx(s, 'steamPuff', w.x, w.floor, w.dir) }
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
  if (!s.mode) { reject(f, 'mode'); return false }
  type = s.mode
  const chk = check(f, type); if (!chk.ok) { reject(f, chk.why); return false }
  s.glide = { type, dir, k: 0, v: 0, turn: 0, how }; s.ramp = null
  f.dashTimer = 0; f.vx = 0; f.facing = dir; f.isBlocking = false
  s.stats.glides++; s.stats[type === 'ice' ? 'iceGlide' : 'fireGlide']++; cue(f, 'glide')
  return true
}
export function switchGlide(f, s, type) {
  if (!s.glide || s.glide.type === type) return false
  if (s.mode && type !== s.mode) { reject(f, 'locked'); return false }   // the glide is his MODE's element
  const chk = check(f, type); if (!chk.ok) { reject(f, chk.why); return false }
  s.glide.type = type; s.stats.switches++; cue(f, 'switch'); pushFx(s, 'switch', ctrX(f), feetY(f), s.glide.dir, { el: type }); return true
}
function endGlide(f, s, keep) { if (!s.glide) return; if (!keep) f.vx = s.glide.dir * Math.min(6, s.glide.v * 0.4); s.glide = null; s.pose = null }
function glideStep(f, s, r) {
  const G = s.glide, W = WREF.W, fw = !!(G.dir === -1 ? r.left : r.right), bk = !!(G.dir === -1 ? r.right : r.left)
  if (++G.k > GLIDE.maxFrames || !(r.charge || (G.how === 'tap' && (fw || G.k < GROUND_SLIDE.minFrames)) || (G.how === 'guard' && G.k < 30))) { endGlide(f, s, false); return false }
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
export const enochPhasing = (a, b) => [a, b].some(f => isEnoch(f) && !!f._enoch && (!!f._enoch.glide || (!!f._enoch.mode && (f.dashTimer || 0) > 0)))   // the SLICE: through them
export function startRamp(f, s) {
  const G = s.glide; if (!G) return false
  s.ramp = { type: G.type, air: 1 }; f.vy = GLIDE.rampVy; f.vx = G.dir * G.v * GLIDE.rampVx; f.onGround = false; f.grounded = false; f.jumpHeld = true
  f.jumpCount = Math.max(f.jumpCount || 0, 1); s.glide = null; s.stats.ramps++; cue(f, 'ramp'); pushFx(s, 'ramp', ctrX(f), feetY(f), G.dir, { el: G.type })
  return true
}

// ── Movement hook (game.js, once per movement frame right BEFORE physics.moveFighter) ──
export function enochLocked(f, raw = null) {
  if (!isEnoch(f)) return false
  if (cine.active) return true
  const s = enState(f), g = grounded(f), r = raw || {}
  const free = !f.attacking && !(f.hitstun > 0) && !(f.blockstun > 0) && !f.isGrabbed && !f.knockdownState && f.health > 0
  if (s.noJump > 0) { s.noJump--; if (g) f.jumpHeld = true }   // the Up of Up + Charge stays buffered ~10 f by the engine: it must not jump
  if (s.glide) { if (!free || !g) endGlide(f, s, false); else if (glideStep(f, s, r)) { f._dashTap = false; return true } }
  if (g && free && r.charge && (r.down || r.up || r.jump)) { f.vx = 0; f._dashTap = false; f.jumpHeld = true; if (r.up || r.jump) s.noJump = INPUT_BUFFER_FRAMES + 1; return true }   // Up + Charge picks FIRE MODE, never jumps   // CHANNEL: rooted, Up + Charge never jumps
  // double-tap forward on his own ICE / FIRE trail → glide of that type instead of the dash
  if (g && free && f._dashTap) {
    const here = patchesAt(s.field, ctrX(f), feetY(f)).filter(p => p.type === 'ice' || p.type === 'fire')
    if (here.length && startGlide(f, s, here[here.length - 1].type, f.facing || 1, 'tap')) { f._dashTap = false; glideStep(f, s, { ...r, [f.facing === -1 ? 'left' : 'right']: true }); return true }
    // anywhere else: the engine's own DASH happens (not consumed here); keep holding the direction and it becomes the SLIDE
    if (s.stance !== 'ice' && s.mode) s.dashHold = { dir: r.right && !r.left ? 1 : r.left && !r.right ? -1 : (f.facing || 1), k: 0 }
  }
  // GROUND SLIDE: the dash with the direction still held → a slide that turns the floor to ICE (FIRE when hot);
  // an element that's locked (an overload) just leaves the dash as it is
  if (s.dashHold) {
    const H = s.dashHold, held = H.dir === 1 ? r.right && !r.left : r.left && !r.right
    if (!g || !free || !held || s.glide) s.dashHold = null
    else if (++H.k >= GROUND_SLIDE.holdFrames) {
      s.dashHold = null
      const type = twinOf(f) === 'fire' ? 'fire' : 'ice'
      if (check(f, type).ok && startGlide(f, s, type, H.dir, 'tap')) {
        f._dashTap = false; s.stats.groundSlides++; lay(f, s, WREF.W, { type, cx: ctrX(f), width: GLIDE.trailW, extend: true })
        glideStep(f, s, r); return true
      }
    }
  }
  // AIR SLIDE (elemental stance; Ice Stance pours Frozone's Ice Stream from the same pool): jump, then double-tap
  // the HOP: Jump during a slide or inside the (shrinking) window after it — a lower hop each link, re-arms the slide
  const jEdge = ['jump', 'up'].map(k => s.edges[k]).find(e => e && s.used[e === s.edges.jump ? 'jump' : 'up'] !== e.tick && s.clock - e.clock <= 2)
  if (!g && free && jEdge && s.stance !== 'ice' && (s.aslide || s.air.win > 0) && s.air.chain < AIR_SLIDE.chainMax) {
    s.used.jump = s.edges.jump?.tick; s.used.up = s.edges.up?.tick
    if (s.aslide) endAirSlide(f, s)
    f.vy = Math.round(AIR_SLIDE.hopVy * Math.pow(AIR_SLIDE.hopDecay, s.air.chain - 1) * 100) / 100
    s.air.armed = true; s.air.win = 0; s.air.jc = f.jumpCount || 0; s.stats.airHops++; cue(f, 'ramp'); pushFx(s, 'switch', ctrX(f), feetY(f), f.facing || 1, { el: twinOf(f) === 'fire' ? 'fire' : 'ice' })
    f._dashTap = false; return true
  }
  if (s.aslide) { if (!free || g) endAirSlide(f, s); else { airSlideStep(f, s, r); f._dashTap = false; return true } }
  if (!g && free && f._dashTap && s.stance !== 'ice' && s.mode) {
    f._dashTap = false
    if (!s.air.armed || s.air.chain >= AIR_SLIDE.chainMax) { s.stats.airDenied++; cue(f, 'reject'); return false }   // hop / jump first; 6 at most
    const type = twinOf(f) === 'fire' ? 'fire' : 'ice', c = check(f, type)
    if (!c.ok) { reject(f, c.why); return false }
    s.air.chain++; s.air.armed = false; s.air.win = 0; s.stats.airSlides++; s.stats[type + 'Slides']++; s.stats.maxChain = Math.max(s.stats.maxChain, s.air.chain)
    push(f, s, (type === 'ice' ? -1 : 1) * AIR_SLIDE.thermal * c.cost)
    s.aslide = { type, dir: f.facing || 1, k: 0, px: ctrX(f), py: feetY(f), hit: false, rail: null }
    cue(f, type === 'ice' ? 'crackle' : 'fireCast'); airSlideStep(f, s, r); return true
  }
  const a = live(f)
  // DASH CANCEL (FLOW): double-tap in the recovery of a normal / special that hit or was blocked → the dash (hold → the slide)
  if (a && f._dashTap) s.dashBuf = { clock: s.clock, dir: r.right && !r.left ? 1 : r.left && !r.right ? -1 : (f.facing || 1) }   // held for FLOW.buffer frames
  if (g && a && s.dashBuf && s.clock - s.dashBuf.clock <= FLOW.buffer && (a.en.clean || a.en.blocked) && FLOW.dashFrom.includes(a.en.key) && (a.total - a.timer) > (a.activeEnd ?? 0) && !(f.hitstop > 0) && s.stance !== 'ice') {
    const dir = s.dashBuf.dir; s.dashBuf = null; endAttack(f); s.stats.dashCancels = (s.stats.dashCancels || 0) + 1
    f.facing = dir; f.dashTimer = f.dashDuration || 8; f.dashCooldown = f.dashCooldownMax || 28; f._dashTap = false
    s.dashHold = { dir, k: 0 }; return false
  }
  if (a && a.en.key !== 'air' && !(a.launcher && a.hasHit)) { f._dashTap = false; return true }
  return false
}
function airSlideStep(f, s, r) {
  const z = s.aslide, W = WREF.W, d = z.dir, P = AIR_SLIDE
  if (++z.k > Math.max(P.minFrames, Math.round(P.frames * (1 - P.shrink * (s.air.chain - 1))))) { endAirSlide(f, s); return }   // shorter each link
  const jc = f.jumpCount
  const nx = Math.max(f.w / 2, Math.min(sw(W) - f.w / 2, z.px + d * P.speed)), floor = s.floor ?? f.groundY ?? (z.py + 400)
  let ny = z.py + (r.down ? P.steep : P.drop), land = false
  if (ny >= floor) { ny = floor; land = true }
  // the slab: one segment per slide, extended as he pours it (its life starts when he leaves it)
  let q = z.rail != null ? s.rails.find(x => x.n === z.rail) : null
  if (!q) { q = { n: ++s.nEnt, type: z.type, x0: Math.round(z.px), y0: Math.round(z.py), x1: Math.round(nx), y1: Math.round(ny), dir: d, t: 0, live: true }; s.rails.push(q); z.rail = q.n; while (s.rails.length > P.maxRails) dropSlab(s.rails.shift()) }
  else { q.x1 = Math.round(nx); q.y1 = Math.round(ny) }
  z.px = nx; z.py = ny
  f.x = Math.round((nx - f.w / 2) * 100) / 100; f.y = Math.round((ny - f.h) * 100) / 100; f.vx = 0; f.vy = 0; f.facing = d; f.jumpCount = jc; f.airDashing = false
  s.pose = 'glide'
  if (!z.hit) for (const o of foesOf(f, W, null)) {                     // sliding THROUGH the opponent = one hit
    if (o.x < f.x + f.w && o.x + o.w > f.x && o.y < f.y + f.h && o.y + o.h > f.y) {
      z.hit = true; s.stats.airSlideHits++
      vol(f, s, W, 'aslide', ++s.serial, ctrX(o), ctrY(o), 60, 70, { damage: dmg(P.raw), hitstun: P.hitstun, kbx: P.kbx, kby: P.kby, life: 3, dir: d, radius: 30, el: z.type, damageType: z.type === 'fire' ? 'energy' : 'blunt' })
      break
    }
  }
  if (land || nx <= f.w / 2 || nx >= sw(W) - f.w / 2) { if (land) lay(f, s, W, { type: z.type, cx: nx }); endAirSlide(f, s) }
}
// THE SLICE: in a mode, his dash / glide goes THROUGH the opponent and cuts them once per pass (ice: chill + an ice burst;
// fire: burn + a flame burst)
function slice(f, s, W, opp) {
  const moving = !!s.mode && grounded(f) && (!!s.glide || (f.dashTimer || 0) > 0)
  if (moving && !s.moving) s.pass++
  s.moving = moving; if (!moving) return
  const el = s.glide?.type || s.mode
  for (const o of foesOf(f, W, opp)) {
    const sd = sideOf(o)
    if (s.sliced[sd] === s.pass || (o.invulnTimer || 0) > 0 || !(o.health > 0)) continue
    if (Math.abs(ctrX(o) - ctrX(f)) > SLICE.reach * 0.5 || Math.abs(feetY(o) - feetY(f)) > 70) continue
    s.sliced[sd] = s.pass; s.stats.slices++
    const raw = dmg(SLICE.raw), dir = f.facing || 1
    if (o.isBlocking) { W?.damage?.(o, raw * 0.2, { attacker: f, source: 'slice', damageType: el === 'fire' ? 'energy' : 'blunt' }); o.blockstun = Math.max(o.blockstun || 0, 10) }
    else {
      W?.damage?.(o, raw, { attacker: f, source: 'slice', damageType: el === 'fire' ? 'energy' : 'blunt' })
      o.hitstun = Math.max(o.hitstun || 0, SLICE.hitstun); o.vx = dir * SLICE.kbx; o.colorFlash = 6
      f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90; meter(f, raw * METER.onHit)
      afflict(f, o, el, el === 'fire' ? SLICE.burn : SLICE.chill, W)
    }
    cue(f, el === 'fire' ? 'fireCast' : 'shatter')
    pushFx(s, el === 'fire' ? 'fireImpact' : 'frost', ctrX(o), feetY(o), dir); pushFx(s, el === 'fire' ? 'ember' : 'chip', ctrX(o), feetY(o) - 40, dir)
  }
}
// HIS ICE FLOOR vs the opponent (ice-walkers — Frozone — keep their footing): health ticks away, a little chill, and they
// slide toward the nearest edge of the sheet
function iceFloor(f, s, W, opp) {
  for (const o of foesOf(f, W, opp)) {
    if (!grounded(o) || ICE_WALKER(o)) { if (o) delete (s.iceT ||= {})[sideOf(o)]; continue }
    const p = patchesAt(s.field, ctrX(o), feetY(o)).find(q => q.type === 'ice' && !q.disc), T = (s.iceT ||= {}), sd = sideOf(o)
    if (!p) { delete T[sd]; continue }
    const left = ctrX(o) < p.x + p.width / 2
    o.x = Math.round(Math.max(0, Math.min(sw(W) - (o.w || 48), o.x + (left ? -1 : 1) * ICE_FLOOR.push)) * 100) / 100
    T[sd] = (T[sd] ?? ICE_FLOOR.every - 1) + 1   // the first tick lands as they step on
    if (T[sd] >= ICE_FLOOR.every && !((o.invulnTimer || 0) > 0)) {
      T[sd] = 0; s.stats.iceFloorHits++
      W?.damage?.(o, ICE_FLOOR.raw, { attacker: f, source: 'patch_ice', damageType: 'blunt' }); meter(f, ICE_FLOOR.raw * METER.onHit); afflict(f, o, 'ice', ICE_FLOOR.chill, W)
      pushFx(s, 'chip', ctrX(o), feetY(o) - 6, left ? -1 : 1)
    }
  }
}
// the finished slab becomes a one-way platform (platforms.js: anyone lands on it) for its whole life; drawn by enochFx
function solidify(f, s, q) {
  const floor = s.floor ?? f.groundY; if (floor == null) return
  const top = Math.round((q.y0 + q.y1) / 2), x = Math.min(q.x0, q.x1), w = Math.max(SLAB.minW, Math.abs(q.x1 - q.x0))
  if (top >= floor - 24) return                                   // poured down to the floor: a ground patch, not a slab
  const pl = spawnPlatform({ x: Math.round(x - (w === SLAB.minW ? SLAB.minW / 2 : 0)), w: Math.round(w), groundY: Math.round(floor), maxHeight: Math.round(floor - top), growDur: 1,
    holdDur: AIR_SLIDE.life, recedeDur: 1, owner: 'enochSlab:' + sideOf(f), sprite: { sheet: './assets/enoch/fx/blank.png', frames: 1, sw: 1, sh: 1 } })
  q.pid = pl.id; q.top = top; q.cd = {}
}
function dropSlab(q) { if (q?.pid) { recedePlatform(q.pid); q.pid = null } }
// THE SLABS vs the opponent: landing on one hurts + shoves them off its edge; rising into one from below = a head bonk
function updateSlabs(f, s, W, opp) {
  for (const q of s.rails) {
    if (!q.pid) continue
    const p = getPlatforms().find(pp => pp.id === q.pid); if (!p) { q.pid = null; continue }
    for (const k in q.cd) if (q.cd[k] > 0) q.cd[k]--
    for (const o of foesOf(f, W, opp)) {
      const ox0 = o.x, ox1 = o.x + (o.w || 48), feet = feetY(o), head = o.y
      if (!(ox1 > p.x && ox0 < p.x + p.w)) continue
      const sd = sideOf(o)
      if (o._floorPlatformId === p.id || (Math.abs(feet - p.topY) <= 4 && grounded(o))) {   // standing on it
        if ((q.cd[sd] || 0) > 0) continue
        q.cd[sd] = SLAB.cd; s.stats.slabLands++
        const raw = dmg(SLAB.raw)
        if (o.isBlocking) W?.damage?.(o, raw * 0.2, { attacker: f, source: 'slab', damageType: q.type === 'fire' ? 'energy' : 'blunt' })
        else { W?.damage?.(o, raw, { attacker: f, source: 'slab', damageType: q.type === 'fire' ? 'energy' : 'blunt' }); o.hitstun = Math.max(o.hitstun || 0, SLAB.hitstun); o.colorFlash = 5; meter(f, raw * METER.onHit); afflict(f, o, q.type, STATUS.hit, W) }
        const left = ctrX(o) < p.x + p.w / 2                        // shoved off the nearer edge
        o.x = left ? p.x - (o.w || 48) - 2 : p.x + p.w + 2; o.vx = (left ? -1 : 1) * SLAB.shoveVx; o.vy = SLAB.shoveVy
        o.onGround = false; o.grounded = false; o._floorPlatformId = null; s.stats.slabShoves++
        cue(f, q.type === 'fire' ? 'fireCast' : 'shatter'); pushFx(s, q.type === 'fire' ? 'ember' : 'chip', ctrX(o), p.topY, left ? -1 : 1)
      } else if ((o.vy || 0) < 0 && head < p.topY + SLAB.thick && head > p.topY - 30 && feet > p.topY + SLAB.thick) {   // jumping up into it
        o.y = p.topY + SLAB.thick; o.vy = 0; s.stats.slabBonks++; pushFx(s, 'chip', ctrX(o), p.topY + SLAB.thick, 1)
      }
    }
  }
}
function endAirSlide(f, s) {
  const z = s.aslide; s.aslide = null; if (!z) return
  const q = s.rails.find(x => x.n === z.rail); if (q) { q.live = false; solidify(f, s, q) }
  f.vx = z.dir * AIR_SLIDE.speed * AIR_SLIDE.carry; f.vy = 0; if (s.pose === 'glide') s.pose = null
  s.air.win = Math.max(0, AIR_SLIDE.hopWindow - AIR_SLIDE.windowStep * (s.air.chain - 1)); s.air.jc = f.jumpCount || 0   // the hop window (tighter each link)
}

// ── TICK (game.js, every frame, before the command layer) ──
export function tickEnoch(f, opp, raw, W) {
  if (!isEnoch(f)) { if (f?._enoch) clearEnoch(f, W); return }
  WREF.W = W
  const s = enState(f); s.tick++
  // presentation memo, read by sprite.js when he wins (never by the sim): a round in which he rode a disc ends ON the disc, in
  // the colour of his final thermal (hot = fire, balance = water, else ice); otherwise the plain win. Survives clearEnoch.
  f._enochWinPose = s.stats.discs > 0 ? (s.mode === 'fire' ? 'winDisc_fire' : !s.mode ? 'winDisc_water' : 'winDisc') : 'win'   // the disc win by his final MODE
  const face = f.facing || 1, fw = !!(face === -1 ? raw.left : raw.right), bk = !!(face === -1 ? raw.right : raw.left)
  const dg = dirDigit(raw, face)
  if (!s.dirs.length || s.dirs[s.dirs.length - 1].d !== dg) { s.dirs.push({ d: dg, c: s.clock }); if (s.dirs.length > 16) s.dirs.shift() }
  for (const k of ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'block', 'jump', 'up', 'grab', 'charge']) {
    const v = !!raw[k]
    if (v && !s.prev[k]) s.edges[k] = { tick: s.tick, clock: s.clock, down: !!raw.down, up: !!raw.up, jmp: !!raw.jump, fwd: fw, back: bk,
      m: { super: motionMatch(s, '236236', 30), qcf: motionMatch(s, '236', 14), qcb: motionMatch(s, '214', 14), dd: motionMatch(s, '22', 14), ff: motionMatch(s, '656', 14), dp: motionMatch(s, '623', 14) } }
    s.prev[k] = v
  }
  const g = grounded(f)
  if (g) s.floor = feetY(f)
  else if (s.floor == null) s.floor = f.groundY ?? null
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > (s.fx[i].life || 40)) s.fx.splice(i, 1)   // most events 40 f; the eruption carries its own life
  if (s.beamFx && --s.beamFx.t <= 0) s.beamFx = null
  // super meter from damage taken
  if (s.prevHp != null && f.health < s.prevHp) meter(f, (s.prevHp - f.health) * METER.onTaken)
  s.prevHp = f.health
  if (f.health <= 0) { s.glide = null; if (s.beam) endBeam(f, s); s.ramp = null; s.pose = null; s.wall = null; s.snow = null; s.meteors.length = 0; s.encase = null; if (s.disc) breakDisc(f, s); killProj(f, W); return }
  // wake-up window: opens as a knockdown ends
  if (s.wasDown && !f.knockdownState) s.wakeWin = 10
  else if (s.wakeWin > 0) s.wakeWin--
  s.wasDown = !!f.knockdownState
  if (f.hitstop > 0) return
  s.clock++
  for (const k in s.cd) if (s.cd[k] > 0) s.cd[k]--
  // GUARD CANCEL: Charge pressed in blockstun → a glide out (25 thermal, 8 invulnerable frames, 10 s cooldown). It lives here,
  // not in the command layer, because game.js returns before the command layer while the fighter is in blockstun.
  if (f.blockstun > 0 && g && s.mode && s.edges.charge && s.used.charge !== s.edges.charge.tick && s.clock - s.edges.charge.clock <= 4 && s.cd.guard <= 0) {
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
  // (the old CHANNEL is gone: Down / Up + Charge now picks his MODE with one press — enoch.js; holding Charge = energy)
  // holding Down / Up + Charge after the mode press = powering up (the engine charges his ENERGY): rooted, the channel pose
  s.channel = chFree && raw.charge ? (raw.down ? -1 : (raw.up || raw.jump) ? 1 : 0) : 0
  thermalTick(s.th, TP, false); pinMode(s)
  slice(f, s, W, opp)
  // field: expiry, effects, matchup rules
  for (const p of tickField(s.field, fr)) {
    if (p.disc) { if (s.disc?.pid) recedePlatform(s.disc.pid); s.disc = null }
    else if (p.type === 'ice') meltInto(f, s, W, p.x + p.width / 2, p.width, p.floor)   // his ice melts into a puddle
  }
  const all = W?.fighters?.() || [f, opp].filter(Boolean)
  const hurt = applyPatchEffects(s.field, all, { frame: fr, owner: sideOf(f), ownerX: ctrX(f), sideOf, grounded, feet: feetY, cx: ctrX, walker: ICE_WALKER,
    damage: (t, n, o) => W?.damage?.(t, n, { attacker: f, ...o }) })
  for (const h of hurt) { s.stats.patchDmg += h.dmg; meter(f, h.dmg * METER.onHit); if (h.type === 'fire') afflict(f, h.fighter, 'fire', STATUS.patchTick, W) }
  tickAfflictions(f, s, W, opp)
  // AIR CHAIN: landing resets it; the hop window counts down; his own air jump (the shared double jump) also re-arms the slide
  const onSlab = g && !!f._floorPlatformId && String(getPlatforms().find(p => p.id === f._floorPlatformId)?.owner || '').startsWith('enochSlab:')
  if (g && !s.aslide && !onSlab) { s.air.chain = 0; s.air.armed = true; s.air.win = 0; s.air.jc = f.jumpCount || 0 }   // only the REAL floor resets it (his slabs don't)
  else { if (s.air.win > 0 && !s.aslide) s.air.win--; if ((f.jumpCount || 0) > s.air.jc) { s.air.armed = true; s.air.jc = f.jumpCount } }
  for (let i = s.rails.length - 1; i >= 0; i--) { const q = s.rails[i]; if (!q.live && ++q.t > AIR_SLIDE.life) { dropSlab(q); s.rails.splice(i, 1); if (q.type === 'ice') pushFx(s, 'drip', (q.x0 + q.x1) / 2, Math.max(q.y0, q.y1), 1, { w: Math.abs(q.x1 - q.x0) }) } }
  // FIRE DASH / ICE DASH (and the slide): outside the balance band his dash leaves a trail of his element
  const tw = s.stance !== 'ice' ? s.mode : null, dashing = g && !s.glide && (f.dashTimer || 0) > 0, sliding = g && live(f)?.en?.key === 'slide'
  if (dashing && !s.dashWas && tw) { if (tw === 'fire') f.dashTimer += 3   // the FIRE DASH carries as far as the ice dash does on its slick trail
    s.stats[tw === 'fire' ? 'fireDash' : 'iceDash']++; cue(f, tw === 'fire' ? 'fireCast' : 'crackle') }
  s.dashWas = dashing
  if (tw && (dashing || sliding) && s.tick % TWIN.trailEvery === 0) lay(f, s, W, { type: tw, cx: ctrX(f) - face * 16, width: TWIN.trailW, extend: true })
  for (const o of foesOf(f, W, opp)) if (isSanjiLit(o) && grounded(o)) for (const p of patchesAt(s.field, ctrX(o), feetY(o))) if (p.type === 'ice' && !p.disc) {   // SANJI: a lit Diable Jambe melts his ice to water
    convertPatch(s.field, p, 'water', fr); s.stats.sanjiMelt++; cue(f, 'hiss'); pushFx(s, 'steamPuff', ctrX(o), feetY(o), 1)
  }
  updateDisc(f, s, W)
  updateOrbs(f, s, W)
  updateWall(f, s, W, opp)
  updateSnow(f, s, W, opp)
  updateSlabs(f, s, W, opp)
  iceFloor(f, s, W, opp)
  if (s.encase && ++s.encase.t > s.encase.n + 24) s.encase = null
  updateMeteors(f, s, W)
  // ramp landing lays a patch of the glide's element
  if (s.ramp && g && (f.vy || 0) >= 0) { lay(f, s, W, { type: s.ramp.type, cx: ctrX(f) }); s.stats.rampLand++; cue(f, 'land'); pushFx(s, 'landBurst', ctrX(f), feetY(f), face, { el: s.ramp.type }); s.ramp = null }
  s.pose = (s.glide || s.aslide) ? (s.aslide ? 'glide' : s.pose) : (s.ramp && !g) ? 'ramp' : (g && f._floorPlatformId && String(getPlatforms().find(p => p.id === f._floorPlatformId)?.owner || '').startsWith('enoch:')) ? 'standDisc' : null
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

// ══ SUPERS — three cinematics of his own (2026-11-23 rebuild): ABSOLUTE ZERO (ice mode), FLASH POINT (fire mode), THERMAL
// SHOCK (no mode: ice + fire fused). They run in the shared cineRegistry.js FROZEN-CINEMATIC slot: game.js freezes combat,
// physics and input while active and calls the registered update(ctx) each tick (ctx = { camera, sound, hitEffects,
// damageNumbers }); clear() runs on every reset path. The old direct game.js hook (isEnochUltActive / updateEnochUlt) is
// left INERT. Timeline (SUPERS in enochData): frames k; a contact HOLDS its frame for `hold` ticks (hit-stop); inside
// `slow` ranges a timeline frame lasts n ticks (slow motion) — both pure functions of the tick counter (lockstep-safe).
// Damage = the scheduled contacts through W.damage with the combo scale captured at the confirm. Poses are non-hitting
// currentAttacks; camera / audio are side effects fired once per timeline frame; everything else is enochUltFx reading
// enochUltView. A KO mid-cinematic jumps to the finale beat (presentation only) and ends normally. ══
const cine = { active: false, frame: 0, tick: 0, hold: 0, holdN: 0, hit: -1, hitKind: null, fxAt: -1, caster: null, target: null, W: null, variant: null, done: 0, scale: 1,
  c0: 0, cx: 0, floorC: 0, tx0: 0, ty0: 0, tcx: 0, floorT: 0, dir: 1, shown: null, ko: false }
const IDLE = { active: false, frame: 0, tick: 0, hold: 0, holdN: 0, hit: -1, hitKind: null, fxAt: -1, caster: null, target: null, W: null, variant: null, done: 0, shown: null, ko: false }
export const enochUltRunning = () => cine.active
export const isEnochUltActive = () => false   // legacy game.js hook: inert — the cineRegistry slot owns his cinematic now
const LOOP_POSE = { enUltChannel: 20, enUltWin: 32 }
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  const e = LOOP_POSE[move] ? at % LOOP_POSE[move] : at
  f.currentAttack = { name: move, total: 999, timer: 999 - e, activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, en: null, _ultPose: true }
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
  if (cine.active || !f || !target || !SUPERS[variant]) return false
  const s = enState(f), V = SUPERS[variant]
  s.glide = null; if (s.beam) endBeam(f, s); s.ramp = null; s.wall = null; s.snow = null; s.meteors.length = 0; s.aslide = null
  const d = f.facing || 1, fw = f.w || 48, tw = target.w || 48, edge = 110, stage = sw(W)
  // the captive is set a fixed distance ahead (clamped inside the stage; Enoch steps back if the wall is too close)
  let c0 = ctrX(f), tcx = c0 + d * V.dist
  if (tcx > stage - edge) { tcx = stage - edge; c0 = tcx - d * V.dist } else if (tcx < edge) { tcx = edge; c0 = tcx - d * V.dist }
  c0 = Math.max(fw / 2 + 4, Math.min(stage - fw / 2 - 4, c0))
  Object.assign(cine, { active: true, frame: 0, tick: 0, hold: 0, holdN: 0, hit: -1, hitKind: null, fxAt: -1, caster: f, target, W, variant, done: 0,
    scale: E.comboScale?.(f) ?? 1, c0: ctrX(f), cx: Math.round(c0), floorC: f.y, tx0: target.x, ty0: target.y, tcx: Math.round(tcx),
    floorT: f.y + (f.h || 94) - (target.h || 94), dir: d, shown: null, ko: false })
  s.ult = { variant, frame: 0, done: 0 }
  target.hitstun = Math.max(target.hitstun || 0, 9999); target.isBlocking = false; target.vx = 0; target.vy = 0
  f.vx = 0; f.vy = 0
  return true
}
// keyframed route value: [[k, v, ease]] — ease of the segment ENDING at that key: 'o' out, 'i' in, 'h' hold (step), else smooth
export function keyAt(keys, k) {
  if (!keys?.length) return 0
  if (k <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [k1, v1, e] = keys[i], [k0, v0] = keys[i - 1]
    if (k > k1) continue
    if (e === 'h') return k < k1 ? v0 : v1
    const u = (k - k0) / Math.max(1, k1 - k0), w = e === 'o' ? 1 - (1 - u) * (1 - u) : e === 'i' ? u * u : u * u * (3 - 2 * u)
    return Math.round(v0 + (v1 - v0) * w)
  }
  return keys[keys.length - 1][1]
}
// presentation side effects (never read back by the sim)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const own = (ctx, id) => { try { ctx?.sound?.play?.('enoch_' + id) } catch (_) {} }
const shakeC = (ctx, st, n) => { try { if (st > 0) ctx?.camera?.shake?.(st, n) } catch (_) {} }
function ultHit(i, ctx) {
  const V = SUPERS[cine.variant], c = V.contacts[i], t = cine.target, f = cine.caster
  cine.done = i + 1; cine.hold = c.hold; cine.holdN = c.hold; cine.hit = i; cine.hitKind = c.kind
  shakeC(ctx, c.shake, c.hold + (c.kind === 'finale' ? 36 : 8))
  hitSound(ctx, c.kind, i)
  if (!(t.health > 0) || cine.ko) return
  const dn = Array.isArray(ctx?.damageNumbers) ? ctx.damageNumbers : null, n0 = dn ? dn.length : 0, hp0 = t.health
  cine.W?.damage?.(t, dmg(c.raw) * cine.scale, { source: 'ultimate', attacker: f, move: 'ultimate', damageType: V.damageType })
  if (dn && dn.length > n0) dn.splice(n0)   // the cinematic draws its own (zoom-aware) numbers
  const amt = Math.max(0, Math.round((hp0 - t.health) * 10) / 10); cine.shown = { at: cine.frame, amt, total: Math.round(((cine.shown?.total || 0) + amt) * 10) / 10 }
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90; t.colorFlash = 6 + c.hold
}
function hitSound(ctx, kind, i) {
  if (kind === 'spike') { own(ctx, 'ultSpike'); sfx(ctx, 'impact_crack_01', 0.6 + 0.1 * i); sfx(ctx, i < 3 ? 'impact_hit_01' : 'hit_heavy_boom_01', 0.6 + 0.1 * i) }
  else if (kind === 'ignite') { own(ctx, 'ultIgnite'); sfx(ctx, 'boom_medium_01', 0.8) }
  else if (kind === 'pulse') { own(ctx, 'superTick'); sfx(ctx, 'hit_flurry_01', 0.35) }
  else if (kind === 'slash') { own(ctx, 'ultSlash'); sfx(ctx, ['swish_fast_02', 'swish_fast_03'][i & 1], 0.9); sfx(ctx, 'hit_heavy_boom_01', 0.7) }
  else if (kind === 'freeze') { own(ctx, 'freeze'); own(ctx, 'ultSpike'); sfx(ctx, 'crack_sizzle_bright', 0.8); sfx(ctx, 'impact_hit_01', 0.8) }
  else if (kind === 'heat') { own(ctx, 'ultIgnite'); own(ctx, 'hiss'); sfx(ctx, 'boom_medium_02', 0.85) }
  else if (kind === 'finale') {
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1)
    own(ctx, cine.variant === 'thermalShock' ? 'ultSteamBlast' : cine.variant === 'flashPoint' ? 'ultNova' : 'ultShatter')
    if (cine.variant === 'absoluteZero') sfx(ctx, 'crack_sizzle_bright', 0.9)
  }
}
// once per timeline frame: the score + the non-damaging beats
function beat(ctx, k) {
  const v = cine.variant, V = SUPERS[v]
  if (k === 0) { sfx(ctx, 'charge_swell_riser', 0.85); sfx(ctx, 'energy_hum_low', 0.5); own(ctx, 'superConfirm_' + v); shakeC(ctx, 2, 24) }
  if (k === 8) sfx(ctx, 'sting_pitch_rise_hold', 0.45)
  if (v === 'absoluteZero') {
    if (k === 14) { own(ctx, 'ultTimeStop'); sfx(ctx, 'pitch_drop_slowmo', 0.85); sfx(ctx, 'boom_medium_01', 0.6); shakeC(ctx, 6, 10) }
    if (k === 28) sfx(ctx, 'boom_anticipation_suck', 0.7)
    if (k === 74) { own(ctx, 'ultIcicle'); sfx(ctx, 'energy_tone_hold', 0.45) }
    if (k === 90) sfx(ctx, 'charge_hum_rise', 0.7)
    if (k === 110) { sfx(ctx, 'boom_anticipation_suck', 0.9); sfx(ctx, 'whoosh_medium_02', 0.9) }
    if (k === V.finale + 10) { sfx(ctx, 'rumble_tail_01', 0.9); sfx(ctx, 'boom_huge_01', 0.6) }
  } else if (v === 'flashPoint') {
    if (k === 18) { own(ctx, 'laser'); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === 30) sfx(ctx, 'boom_anticipation_suck', 0.7)
    if (k === 34) { own(ctx, 'ultBeam'); sfx(ctx, 'energy_tone_hold', 0.5) }
    if (k === 96) { own(ctx, 'ramp'); sfx(ctx, 'whoosh_medium_01', 0.9) }
    if (k === 100) sfx(ctx, 'pitch_drop_slowmo', 0.8)
    if (k === 120) { own(ctx, 'ultSun'); sfx(ctx, 'charge_swell_riser', 0.9) }
    if (k === 132) sfx(ctx, 'boom_anticipation_suck', 0.95)
    if (k === V.finale + 8) { sfx(ctx, 'rumble_tail_01', 0.9); sfx(ctx, 'boom_huge_01', 0.7) }
  } else {
    if (k === 14) { own(ctx, 'ultSplit'); sfx(ctx, 'warp_wobble_01', 0.6) }
    if (k === 28) { own(ctx, 'ultSerpent'); sfx(ctx, 'whoosh_medium_01', 0.9); sfx(ctx, 'whoosh_medium_02', 0.7) }
    if (k === 56) { own(ctx, 'ultSerpent'); sfx(ctx, 'warp_wobble_02', 0.6) }
    if (k === 66) sfx(ctx, 'pitch_drop_slowmo', 0.8)
    if (k === 92) { own(ctx, 'steam'); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === 104) sfx(ctx, 'boom_anticipation_suck', 0.95)
    if (k === V.finale + 6) { own(ctx, 'hiss'); sfx(ctx, 'rumble_tail_01', 0.9); sfx(ctx, 'boom_huge_01', 0.7) }
  }
}
// the engine camera (zoom caps at 1.15): the screen overlay re-blits for the real close-ups (enochUltFx VCAM)
function cam(ctx, f, t) {
  const c = ctx?.camera; if (!c?.focusOnFighter) return
  const k = cine.frame, v = cine.variant, hit = cine.hold > 0, mid = { x: (cine.cx + cine.tcx) / 2 - 24, y: cine.floorT - 60, w: 48, h: 150 }
  try {
    if (k < 14) c.focusOnFighter(f, 1.15)
    else if (v === 'absoluteZero') { if (k < 72) c.focusBetween?.(f, t, hit ? 1.0 : 0.92); else if (k < 116) c.focusOnFighter({ ...mid, y: cine.floorT - 200, h: 260 }, 0.78); else c.focusBetween?.(f, t, 0.9) }
    else if (v === 'flashPoint') { if (k < 34) c.focusOnFighter(f, 1.15); else if (k < 96) c.focusBetween?.(f, t, hit ? 1.0 : 0.9); else if (k < 146) c.focusOnFighter({ ...mid, y: cine.floorT - 160, h: 240 }, 0.8); else c.focusBetween?.(f, t, 0.88) }
    else { if (k < 40) c.focusBetween?.(f, t, 1.0); else if (k < 116) c.focusOnFighter({ ...mid, y: cine.floorT - 120, h: 220 }, 0.86); else c.focusBetween?.(f, t, 0.9) }
  } catch (_) {}
}
function place(f, t, k) {
  const V = SUPERS[cine.variant], d = cine.dir, fw = f.w || 48, tw = t.w || 48, u = Math.min(1, k / 10), e = 1 - (1 - u) * (1 - u)
  const cxNow = cine.c0 + (cine.cx - cine.c0) * e + d * keyAt(V.cDx, k)
  f.x = Math.round((Math.max(fw / 2, Math.min(sw(cine.W) - fw / 2, cxNow)) - fw / 2) * 100) / 100; f.y = cine.floorC - keyAt(V.cLift, k); f.facing = d; f.vx = 0; f.vy = 0
  const txNow = cine.tx0 + (cine.tcx - tw / 2 - cine.tx0) * e, tyNow = cine.ty0 + (cine.floorT - cine.ty0) * e
  t.x = Math.round(txNow * 100) / 100; t.y = Math.round((tyNow - keyAt(V.tLift, k)) * 100) / 100; t.vx = 0; t.vy = 0; t.isBlocking = false; t.facing = -d
}
export function updateEnochUlt(ctx) {
  if (!cine.active) return
  const f = cine.caster, t = cine.target, s = f?._enoch
  if (!f || !t || !s) return clearEnochUlt()
  const V = SUPERS[cine.variant]
  cine.tick++
  if (cine.tick === 1 && Array.isArray(ctx?.damageNumbers)) { cine.shown = { at: -99, amt: 0, total: 0 }; ctx.damageNumbers.length = 0 }
  cam(ctx, f, t)
  if (cine.hold > 0) { cine.hold--; place(f, t, cine.frame); return }   // HIT-STOP: the same timeline frame, the same pose
  // KO mid-cinematic: skip straight to the finale beat (presentation only — no more damage)
  if (!(t.health > 0) && !cine.ko && cine.frame > 0 && cine.frame < V.finale) { cine.ko = true; cine.frame = V.finale; cine.done = V.contacts.length - 1 }
  const k = cine.frame
  if (cine.fxAt !== k) {
    cine.fxAt = k; beat(ctx, k)
    for (let i = 0; i < V.contacts.length; i++) if (V.contacts[i].at === k && cine.done === i) ultHit(i, ctx)
  }
  let p = V.poses[0]; for (const q of V.poses) if (k >= q[0]) p = q
  pose(f, p[1], k - p[0])
  place(f, t, k)
  if (s.ult) { s.ult.frame = k; s.ult.done = cine.done }
  if (cine.hold > 0) return
  const sl = V.slow.find(q => k >= q[0] && k < q[1])
  if (sl && cine.tick % sl[2] !== 0) return   // SLOW MOTION
  for (let i = s.fx.length - 1; i >= 0; i--) if (++s.fx[i].t > (s.fx[i].life || 40)) s.fx.splice(i, 1)
  if (++cine.frame >= V.total) finishUlt()
}
function finishUlt() {
  const f = cine.caster, t = cine.target, V = SUPERS[cine.variant], W = cine.W
  if (t) { t.y = cine.floorT; t.vx = 0; t.vy = 0; t.hitstun = 0
    if (t.health > 0) {
      if (V.freeze) { t._supFrozen = V.freeze; t._supFrozenMax = V.freeze; t.hitstun = V.freeze }
      else { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) }
    } }
  if (f) {
    endAttack(f, 12); f.y = cine.floorC; f.vx = 0; f.vy = 0
    const s = f._enoch
    if (s) { s.stats.superDone = (s.stats.superDone || 0) + 1; delete s.ult
      if (cine.variant === 'thermalShock' && t) {   // leaves WATER + STEAM where it landed
        lay(f, s, W, { type: 'water', cx: ctrX(t), calm: CALM_FRAMES }); lay(f, s, W, { type: 'steam', cx: ctrX(t), calm: CALM_FRAMES }) } }
  }
  Object.assign(cine, IDLE)
}
export function clearEnochUlt() {
  if (!cine.active) return
  const f = cine.caster, t = cine.target
  if (t) { t.y = cine.floorT; t.hitstun = 0; t.vx = 0; t.vy = 0; t._fxAlpha = null }
  if (f) { endAttack(f); f.y = cine.floorC; f.vx = 0; f.vy = 0; f._fxAlpha = null; if (f._enoch) delete f._enoch.ult }
  Object.assign(cine, IDLE)
}
registerFreezeCine('enoch', { active: () => cine.active, update: ctx => updateEnochUlt(ctx), clear: () => clearEnochUlt() })
export const getEnochUltStatus = () => ({ active: cine.active, frame: cine.frame, done: cine.done, variant: cine.variant, caster: cine.caster ? sideOf(cine.caster) : null, tick: cine.tick })
export function enochUltView(f) {
  if (!cine.active || cine.caster !== f) return null
  const t = cine.target, V = SUPERS[cine.variant], k = cine.frame
  return { variant: cine.variant, frame: k, tick: cine.tick, hold: cine.hold, holdN: cine.holdN, hit: cine.hit, hitKind: cine.hitKind, done: cine.done, dir: cine.dir,
    total: V.total, finale: V.finale, slow: V.slow.some(q => k >= q[0] && k < q[1]), shown: cine.shown ? { ...cine.shown } : null, ko: cine.ko,
    tx: ctrX(t), ty: ctrY(t), feet: feetY(t), floorT: cine.floorT + (t.h || 94), tW: t.w || 48, tH: t.h || 94, lift: keyAt(V.tLift, k),
    cx: ctrX(f), cFeet: feetY(f), cTop: f.y, cH: f.h || 94 }
}
// the screen-space overlay's read (render-only)
export const enochUltScene = () => cine.active ? { caster: cine.caster, target: cine.target, view: enochUltView(cine.caster) } : null
