// megazord.js — MSV1-MEGAZORD: the THUNDER MEGAZORD, an add-on ULTIMATE (a transformation) of the Mighty Morphin Rangers squad
// (mmpr_rangers, mmprSquad.js). NOT a character: no roster entry, no select tile, no CPU slot. Input U + L (P2 5 + 4, pad R2 + R1).
//   1. CINEMATIC (~3.1 s, frozen: cineRegistry) — the active Ranger strikes their own call pose ("We need Thunder Megazord power,
//      now!"), five Thunderzord captions, lightning, the Ranger vanishes upward, the Megazord drops in (R1 kneel), rises into the
//      R4 saber raise ("Thunder Megazord, power up!") with the R14 portrait cut-in.
//   2. MEGAZORD MODE (12 s): the fighter IS the Megazord (a squad form outside the dial, squadCore applyForm): 600 ARMOR takes every
//      hit (the Ranger's health stays frozen), SUPER ARMOR (only supers / ultimates stagger), unthrowable, can block; slow heavy walk,
//      short jump, no dash, no Ranger swaps. Its own moves (MZ_MOVES) go through the engine's startMove → combo scaling, block,
//      hitstun, Gojo's Infinity, everything as for any hit. U + L again = THUNDER SABER FINAL STRIKE (ends the mode).
//   3. SEPARATION on the finisher / the timer / ARMOR BREAK (collapse, then the Ranger is stunned 30 f): the calling Ranger drops back
//      in at the Megazord's spot with the health they had.
// Once per round; costs the MMPR ultimate cost (100 = a full meter). State: f._squad.mz (plain data; lockstep / replay re-simulate
// it from inputs) + f._mzOn (the combat.js gate). No Math.random, no clock. Render: megazordFx.js. Sound: cues on mz.cues.
import { MZ_SHEETS } from './megazordSprites.js'
import { MZ_HOOK } from './megazordHook.js'
import { registerFreezeCine } from './cineRegistry.js'

export const MZ_FORM = 'mmpr_thunder_megazord'
export const MZ = {
  cost: 100, timer: 720, armor: 600, scale: 2.5,   // 2.5 × the 96 px source idle = 240 px ≈ 1.8 × a Ranger (Red MMPR ≈ 137 px)
  w: 84, h: 166,                                   // hurtbox: the roster's 48 × 94 grown with the art
  chord: 3,                                        // U and L within 3 frames (either order)
  breakStun: 30, collapse: 44, sepFlash: 14, charge: 40, chargeMul: 1.5, shock: 60, comboScale: 0.85,
  fire: { speed: 13, life: 110, at: 16, dmg: 90, w: 60, h: 50 },
  lunge: { dist: 0.5, from: 9, frames: 12 },       // 50 % of a 1280-wide screen
  final: { charge: 22, hit: 40, total: 62, dmg: 250, reach: 560 },
}
// the cinematic timeline (frames): call → five captions → lightning + vanish → drop → kneel → rise / cut-in → control
export const CINE = { call: 24, capEach: 18, capStart: 24, flash: 114, drop: 126, land: 144, rise: 158, end: 186 }
export const CAPTIONS = [
  ['Tyrannosaurus Red Dragon Thunderzord Power!', '#e0201c'], ['Mastodon Lion Thunderzord Power!', '#2a2a36'],
  ['Triceratops Unicorn Thunderzord Power!', '#2a6cf0'], ['Sabertooth Tiger Griffin Thunderzord Power!', '#f2d81c'],
  ['Pterodactyl Firebird Thunderzord Power!', '#ff6fb4'],
]
const CALL_POSE = { red_ranger_mmpr: 'introMorpher', mmpr_black: 'bCall', mmpr_pink: 'pCall', green_ranger: 'gCall', mmpr_white: 'wCall' }

// ── moves (authored raw values; the squad's roster tier and the engine's combo scaling apply on top, as for every Ranger) ──
const mv = (anim, damage, startup, active, recovery, o = {}) => ({ anim, damage, startup, active, recovery, frameExact: true, damageType: 'blunt',
  hitstun: 20, blockstun: 12, knockbackX: 6, knockbackY: -2, rangeX: 110, rangeY: 140, ...o, hitLevel: o.low ? "low" : (o.hitLevel || null) })
export const MZ_MOVES = {
  mzLight:    mv('mzLight', 60, 7, 4, 12, { rangeX: 96 }),
  mzCLight:   mv('mzCLight', 55, 6, 4, 12, { rangeX: 100 }),
  mzHeavy:    mv('mzHeavy', 80, 11, 5, 18, { rangeX: 120, knockbackX: 9 }),
  mzCHeavy:   mv('mzCHeavy', 85, 10, 6, 20, { rangeX: 150, low: true, knockbackY: -6, damageType: 'energy' }),   // low flame sweep
  mzAirLight: mv('mzAirLight', 85, 6, 6, 12, { rangeX: 110 }),
  mzAirHeavy: mv('mzAirHeavy', 85, 8, 6, 14, { rangeX: 130, damageType: 'slash' }),
  mzSlash:    mv('mzSlash', 110, 14, 6, 22, { rangeX: 170, damageType: 'slash', isSpecial: true, category: 'special', saber: true, knockbackX: 10 }),
  mzCSlash:   mv('mzCSlash', 110, 14, 6, 22, { rangeX: 190, damageType: 'slash', isSpecial: true, category: 'special', saber: true }),
  mzAirSaber: mv('mzAirSaber', 115, 12, 6, 20, { rangeX: 180, damageType: 'slash', isSpecial: true, category: 'special', saber: true, knockbackY: 4 }),
  mzRising:   mv('mzRising', 100, 9, 6, 24, { rangeX: 130, damageType: 'slash', isSpecial: true, category: 'special', saber: true, launcher: true, knockbackX: 3, knockbackY: -18, hitstun: 30 }),
  mzFire:     mv('mzFire', 0, MZ.fire.at, 1, 18, { rangeX: 1, rangeY: 1, isSpecial: true, category: 'special', noHitbox: true }),
  mzLunge:    mv('mzLunge', 100, MZ.lunge.from, MZ.lunge.frames, 20, { rangeX: 150, damageType: 'slash', isSpecial: true, category: 'special', saber: true, knockbackX: 12 }),
  mzCharge:   mv('mzCharge', 0, MZ.charge, 1, 12, { rangeX: 1, rangeY: 1, isSpecial: true, category: 'special', noHitbox: true }),
  mzFinal:    mv('mzFinal', MZ.final.dmg, MZ.final.hit, 6, MZ.final.total - MZ.final.hit - 6, { rangeX: MZ.final.reach, rangeY: 260, damageType: 'slash', isUltimate: true, category: 'ultimate', saber: true, knockbackX: 14, knockbackY: -10, hitstun: 40, blockstun: 24 }),
}
const NO_HIT = new Set(['mzFire', 'mzCharge'])   // their hit comes from the fireball / the shock, not a body box

// ── the form (registered on the squad by mmprSquad.js; never in `characters`) ──
const anim = (key, speed, o = {}) => ({ ...MZ_SHEETS[key], frameWidth: MZ_SHEETS[key].width, frameHeight: MZ_SHEETS[key].height, speed, loop: false, lockLastFrame: true, ...o })
const total = m => m.startup + m.active + m.recovery
const moveAnim = k => { const m = MZ_MOVES[k], s = MZ_SHEETS[m.anim]; return anim(m.anim, Math.max(2, Math.ceil(total(m) / s.frames))) }
export const MZ_ANIM = {
  idle: anim('idle', 10, { loop: true }), walk: anim('walk', 10, { loop: true }), walk_back: anim('walk', 12, { loop: true }), run: anim('walk', 8, { loop: true }), dash: anim('walk', 8, { loop: true }),
  jump: anim('jump', 10), fall: anim('fall', 10), crouch: anim('crouch', 10), guard: anim('guard', 10), block: anim('guard', 10),
  hurt: anim('hurt', 8), knockdown: anim('knockdown', 9), getup: anim('getup', 10), launched: anim('launched', 10), crouchHurt: anim('crouchHurt', 8),
  kneel: anim('kneel', 5), raise: anim('raise', 9), pose: anim('pose', 8), blue: anim('blue', 8, { loop: true }), collapse: anim('collapse', 6),
  mzChargeAir: anim('mzChargeAir', 14),
  ...Object.fromEntries(Object.keys(MZ_MOVES).filter(k => k !== 'mzFinal').map(k => [k, moveAnim(k)])),
  mzFinal: anim('mzAirSaber', 7), mzFinalCharge: anim('mzCharge', 6),
}
export const MZ_CHAR = {
  rosterKey: MZ_FORM, name: 'Thunder Megazord', displayName: 'Thunder Megazord', hudName: 'Thunder Megazord', color: '#e0201c',
  portrait: MZ_SHEETS.portrait.src, hudIcon: MZ_SHEETS.portrait.src, spriteScale: MZ.scale, animationData: MZ_ANIM,
  basic_attacks: {}, specials: {}, ultimate: { name: 'Thunder Saber Final Strike', cost: 0 }, traits: [], archetypes: ['bruiser'], primary: 'bruiser', secondary: [],
  stats: { speed: 70, jumpPower: 21, maxJumps: 1, dashSpeed: 0, dashDuration: 1, dashCooldownMax: 999, weight: 2.2 },
}

// ── helpers ──
const grounded = f => !!(f.onGround || f.grounded)
const ctr = o => (o.x || 0) + (o.w || 48) / 2
const feetOf = f => (f.y || 0) + (f.h || 94)
const elapsed = a => (a?.total ?? 0) - (a?.timer ?? 0)
const cue = (mz, c) => { (mz.cues ||= []).push(c); if (mz.cues.length > 16) mz.cues.shift() }
const isBig = (opts = {}) => { const a = opts.attacker?.currentAttack; return !!(opts.isUltimate || opts.ultimate || opts.super || opts.tier === 'ultimate' || a?.isUltimate || a?.isSuper || a?.category === 'ultimate' || (a?.bars || 0) > 0) }
export const mzState = f => f?._squad?.mz || null
export const mzActive = f => !!(f?._squad?.mz && (f._squad.mz.phase === 'cine' || f._squad.mz.phase === 'mode' || f._squad.mz.phase === 'break'))
export const MZ_LIVE = new Set()   // fighters with a Megazord on screen (render reads it)

let SQUAD = null   // the MMPR squad api (mmprSquad.js hands it in: applyForm / formChar)
export function bindMegazord(api) { SQUAD = api; api.registerForm(MZ_FORM, MZ_CHAR) }

// may the transformation start? (reason string when refused — tests read it)
export function mzRefuse(f, W, energy = f.energy) {
  const q = f?._squad; if (!q) return 'not-squad'
  if (q.mz?.used) return 'used'
  if ((energy || 0) < MZ.cost) return 'meter'
  if (!(f.health > 0)) return 'ko'
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if ((f.blockstun || 0) > 0) return 'blockstun'
  if (f.knockdownState || f.isGrabbed) return 'down'
  if (CINE_STATE.f) return 'cinematic'
  try { if (W?.cinematic?.() || W?.busy?.(f)) return 'cinematic' } catch (_) {}
  return null
}

// ── the U + L chord (runs at the top of the squad tick, before any kit reads input) ──
function chord(f, raw, mz0, q) {
  const c = q.mzc || (q.mzc = { pu: false, pl: false, uAt: -99, lAt: -99, e: null })
  const u = !!raw.ultimate, l = !!raw.special
  const uEdge = u && !c.pu, lEdge = l && !c.pl
  if ((uEdge && !l) || (lEdge && !u)) c.e = { t: q.t, energy: f.energy || 0, form: q.form }   // meter BEFORE the first press's move spends it
  if (uEdge) c.uAt = q.t
  if (lEdge) c.lAt = q.t
  c.pu = u; c.pl = l
  return u && l && (uEdge || lEdge) && Math.abs(c.uAt - c.lAt) <= MZ.chord
}

// cancel the move the first of the two presses started 1–3 frames ago (still in startup, nothing landed), meter restored —
// so U alone / L alone stay exactly as they were and the chord still works when the two keys land a frame or two apart
function cancelFirstPress(f, q, W) {
  const c = q.mzc, e = c?.e; if (!e || q.t - e.t > MZ.chord) return f.energy || 0
  const a = f.attacking ? f.currentAttack : null
  if (a && elapsed(a) <= MZ.chord + 1 && !a.hasHit) {
    try { W?.clear?.(f, q.form) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0
  }
  return Math.max(f.energy || 0, e.energy)
}

// ── TRANSFORMATION ──
const CINE_STATE = { f: null, t: 0 }
function startTransform(f, W, energy) {
  const q = f._squad
  f.energy = Math.max(0, energy - MZ.cost)
  q.mz = { phase: 'cine', used: true, from: q.form, hp: f.health, t: 0, timer: MZ.timer, armor: MZ.armor, cues: [], shots: [], serial: 0,
    chargeT: 0, charged: false, finisher: false, staggerT: 0, hits: 0, absorbed: 0, shocks: 0, moves: {}, end: null, sepT: 0, feet: feetOf(f), dirs: [], prev: {}, edges: {} }
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.vx = 0; f.isBlocking = false
  f._forceAction = CALL_POSE[q.form] && f.animationData?.[CALL_POSE[q.form]] ? CALL_POSE[q.form] : 'idle'
  if (f.spriteHandler) { f.spriteHandler.frameIndex = 0; f.spriteHandler.frameTimer = 0 }
  CINE_STATE.f = f; CINE_STATE.t = 0; CINE_STATE.W = W
  MZ_LIVE.add(f)
  f._mzTotal = (f._mzTotal || 0) + 1   // whole-match count (tests / CPU checks)
  cue(q.mz, 'call')
  return true
}
function setBody(f, big) {   // the hurtbox grows / shrinks around the feet centre (the camera frames it → smooth zoom out / back)
  const cx = ctr(f), feet = feetOf(f)
  if (big) { f._mzDims = f._mzDims || { w: f.w, h: f.h }; f.w = MZ.w; f.h = MZ.h }
  else if (f._mzDims) { f.w = f._mzDims.w; f.h = f._mzDims.h; f._mzDims = null }
  f.x = cx - f.w / 2; f.y = feet - f.h
}
function cineUpdate(ctx) {
  const f = CINE_STATE.f; if (!f) return
  const q = f._squad, mz = q?.mz; if (!mz) { CINE_STATE.f = null; return }
  const t = ++CINE_STATE.t; mz.t = t
  const cam = ctx?.camera, opp = CINE_STATE.W?.opponent?.(f)
  if (t === 1) { try { cam?.focusOnFighter?.(f, 1.25) } catch (_) {} }
  if (t === CINE.capStart) cue(mz, 'zords')
  if (t === CINE.flash) { cue(mz, 'thunder'); try { cam?.shake?.(14, 18) } catch (_) {} }
  if (t >= CINE.flash + 2 && t < CINE.drop) f._fxAlpha = Math.max(0, 1 - (t - CINE.flash) / 10)   // the Ranger streaks upward (megazordFx draws the streak)
  if (t === CINE.drop) {
    f._fxAlpha = null
    SQUAD.applyForm(f, MZ_FORM); setBody(f, true); f._mzOn = true
    f._skinAnim = MZ_ANIM; f._baseSkinAnim = MZ_ANIM; f._recolorTag = null   // its own strips under every team skin (the renderer reads _skinAnim; no `characters` entry)
    f._forceAction = 'fall'
    try { opp ? cam?.focusBetween?.(f, opp, 0.8) : cam?.focusOnFighter?.(f, 0.8) } catch (_) {}
  }
  if (t >= CINE.drop && t < CINE.land) { const k = (t - CINE.drop) / (CINE.land - CINE.drop); f.y = mz.feet - f.h - Math.round((1 - k * k) * 520) }
  if (t === CINE.land) { f.y = mz.feet - f.h; f._forceAction = 'kneel'; if (f.spriteHandler) f.spriteHandler.frameIndex = 0; cue(mz, 'land'); try { cam?.shake?.(10, 12) } catch (_) {} }
  if (t === CINE.rise) { f._forceAction = 'raise'; if (f.spriteHandler) f.spriteHandler.frameIndex = 0; cue(mz, 'powerUp') }
  if (t >= CINE.end) {
    mz.phase = 'mode'; mz.t = 0; f._forceAction = 'idle'; CINE_STATE.f = null
    f.vx = 0; f.vy = 0
  }
}
registerFreezeCine('thunder_megazord', {
  active: () => !!CINE_STATE.f,
  update: cineUpdate,
  clear: () => { if (CINE_STATE.f) { const f = CINE_STATE.f; f._fxAlpha = null; f._forceAction = null } CINE_STATE.f = null },
})

// ── SEPARATION ──
function separate(f, why, W) {
  const q = f._squad, mz = q.mz
  const cx = ctr(f), feet = feetOf(f)
  f._mzOn = false; f._forceAction = null
  setBody(f, false)
  SQUAD.applyForm(f, mz.from)
  f.health = mz.hp   // the calling Ranger comes back with exactly the health they had
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; f.isBlocking = false
  f.x = cx - f.w / 2; f.y = feet - f.h - 180; f.vy = 2; f.vx = 0; f.onGround = false; f.grounded = false
  if (why === 'break') { f.hitstun = MZ.breakStun; f._mzVuln = MZ.breakStun }
  f._mzEnds = { ...(f._mzEnds || {}), [why]: ((f._mzEnds || {})[why] || 0) + 1 }
  mz.phase = 'done'; mz.end = why; mz.sepT = MZ.sepFlash; mz.shots = []
  cue(mz, 'thunder')
  q.cd = Math.max(q.cd || 0, 30)
  MZ_LIVE.add(f)   // the separation flash still renders
}

// ── MEGAZORD MODE: the per-frame driver (squad tick → cfg.onTick, top of updateMovementInput) ──
const ATTACK_KEYS = ['light', 'heavy', 'special', 'ultimate', 'grab', 'charge', 'upAttack']
const dirToken = (raw, facing) => { const fw = facing === -1 ? raw.left : raw.right, bk = facing === -1 ? raw.right : raw.left; return raw.down ? (fw ? 3 : bk ? 1 : 2) : raw.up ? 8 : fw ? 6 : bk ? 4 : 5 }
function motion(mz, seq, win) {   // the tokens of `seq` in order within `win` frames
  let i = seq.length - 1
  for (let k = mz.dirs.length - 1; k >= 0 && i >= 0; k--) { const [tok, at] = mz.dirs[k]; if (mz.t - at > win) break; if (tok === seq[i]) i-- }
  return i < 0
}
function startMz(f, key, W, mz) {
  const base = MZ_MOVES[key]; let md = base
  if (base.saber && mz.charged) { md = { ...base, damage: Math.round(base.damage * MZ.chargeMul) }; mz.charged = false; mz.chargedHit = (mz.chargedHit || 0) + 1 }
  f.attackCooldown = 0
  if (!W?.startMove?.(f, key, md)) return false
  if (NO_HIT.has(key) && f.currentAttack) { f.currentAttack.hasHit = true; f.currentAttack.rangeX = 0; f.currentAttack.rangeY = 0 }
  if (f.spriteHandler) { f.spriteHandler.frameIndex = 0; f.spriteHandler.frameTimer = 0 }
  mz.moves[key] = (mz.moves[key] || 0) + 1
  if (key === 'mzCharge') { mz.chargeT = MZ.charge; cue(mz, 'charge') }
  else if (key === 'mzFire') cue(mz, 'fireStart')
  else if (key === 'mzFinal') cue(mz, 'finalCharge')
  else cue(mz, base.saber ? 'saber' : 'swing')
  return true
}
function tickMode(f, raw, W, q, mz) {
  mz.t++
  f._squadInject = f._mzCpuGuard && !f.attacking ? { block: true } : null   // the CPU guards against a super (megazordCpu)
  // the Megazord owns every attack button (the Ranger kits never see them); movement / jump / block stay the engine's
  f._squadEat = { ...(f._squadEat || {}), ...Object.fromEntries(ATTACK_KEYS.map(k => [k, true])) }
  f.dashCooldown = Math.max(f.dashCooldown || 0, 2)   // no dash
  if (f.isGrabbed) { f.isGrabbed = false; f.grabTimer = 0; f.hitstun = 0 }   // unthrowable (any command grab lets go)
  if (mz.staggerT > 0) mz.staggerT--
  else if ((f.hitstun || 0) > 0 || f.knockdownState) { f.hitstun = 0; f.knockdownState = null; f.knockdownTimer = 0 }   // super armor
  if (f.health > 0) f.health = mz.hp   // the Ranger's health is frozen while the Megazord is out (every hit goes to ARMOR)
  { const ca = f.currentAttack; if (ca?.hasHit && !ca._mzCued && !NO_HIT.has(ca.name)) { ca._mzCued = true; cue(mz, MZ_MOVES[ca.name]?.saber ? 'saberHit' : 'metal') } }
  // input: direction history + press edges (unmasked raw = the recorded input frame in replay / LAN)
  const tok = dirToken(raw, f.facing || 1), last = mz.dirs[mz.dirs.length - 1]
  if (!last || last[0] !== tok) { mz.dirs.push([tok, mz.t]); if (mz.dirs.length > 20) mz.dirs.shift() }
  const edge = {}
  for (const k of [...ATTACK_KEYS, 'down', 'right', 'left']) { const v = !!raw[k]; edge[k] = v && !mz.prev[k]; if (edge[k]) mz.edges[k] = [...(mz.edges[k] || []).slice(-2), mz.t]; mz.prev[k] = v }
  // timers
  if (mz.chargeT > 0 && --mz.chargeT === 0) { mz.charged = true; cue(mz, 'charged') }
  if (--mz.timer <= 0 && !mz.finisher) { separate(f, 'time', W); return }
  if (mz.armor <= 0) { mz.phase = 'break'; mz.t = 0; f.attacking = false; f.currentAttack = null; f._forceAction = 'collapse'; if (f.spriteHandler) f.spriteHandler.frameIndex = 0; cue(mz, 'break'); return }
  // the finisher plays out, then separation
  if (mz.finisher) {
    const a = f.currentAttack
    if (a?.name === 'mzFinal') {
      const e = elapsed(a)
      f._forceAction = e < MZ.final.charge ? 'mzFinalCharge' : 'mzFinal'
      if (e === MZ.final.charge) { if (f.spriteHandler) f.spriteHandler.frameIndex = 0; cue(mz, 'finalSlash') }
      if (e === MZ.final.hit) { mz.flash = 10; cue(mz, 'thunder') }
      return
    }
    separate(f, 'finisher', W); return
  }
  stepShots(f, W, mz)
  // lunge travel (50 % of the screen across its active frames)
  const a = f.attacking ? f.currentAttack : null
  if (a?.name === 'mzLunge') { const e = elapsed(a); if (e >= MZ.lunge.from && e < MZ.lunge.from + MZ.lunge.frames) { const sw = W?.stageWidth?.() || 3200; f.x = Math.max(0, Math.min(sw - f.w, f.x + (f.facing || 1) * Math.round(1280 * MZ.lunge.dist / MZ.lunge.frames))) } }
  if (a?.name === 'mzFire' && elapsed(a) === MZ.fire.at) spawnFire(f, mz)
  // finisher: U + L again
  if (q.mzc && chordAgain(f, raw, q) && (!a || elapsed(a) > (a.activeEnd ?? 0) || (elapsed(a) <= MZ.chord + 1 && !a.hasHit) || NO_HIT.has(a.name)) && !((f.hitstun || 0) > 0)) {
    f.attacking = false; f.currentAttack = null
    if (startMz(f, 'mzFinal', W, mz)) { mz.finisher = true; mz.timer = Math.max(mz.timer, MZ.final.total + 2); f.invulnTimer = Math.max(f.invulnTimer || 0, MZ.final.total); return }
  }
  // attacks
  if (!f.attacking && !((f.hitstun || 0) > 0) && !((f.blockstun || 0) > 0)) {
    const air = !grounded(f), crouch = !air && !!raw.down
    let key = null
    if (edge.special) {
      const dd = (mz.edges.down || []).filter(x => mz.t - x <= 16).length >= 2
      const ff = (mz.edges[(f.facing || 1) === 1 ? 'right' : 'left'] || []).filter(x => mz.t - x <= 14).length >= 2
      key = dd ? 'mzCharge' : motion(mz, [2, 3, 6], 18) && !air ? 'mzFire' : ff && !air ? 'mzLunge' : raw.up ? 'mzRising' : air ? 'mzAirSaber' : crouch ? 'mzCSlash' : 'mzSlash'
    } else if (edge.light || edge.upAttack) key = air ? 'mzAirLight' : crouch ? 'mzCLight' : 'mzLight'
    else if (edge.heavy) key = air ? 'mzAirHeavy' : crouch ? 'mzCHeavy' : 'mzHeavy'
    if (key) startMz(f, key, W, mz)
  }
  // pose (the Megazord's own strips; the sprite handler restarts on a change)
  const a2 = f.attacking ? f.currentAttack : null
  let pose
  if (a2 && MZ_ANIM[a2.name]) pose = a2.name === 'mzCharge' && !grounded(f) ? 'mzChargeAir' : a2.name
  else if (mz.staggerT > 0) pose = grounded(f) ? 'hurt' : 'launched'
  else if (f.isBlocking) pose = 'guard'
  else if (!grounded(f)) pose = (f.vy || 0) < 0 ? 'jump' : 'fall'
  else if (raw.down) pose = 'crouch'
  else if (Math.abs(f.vx || 0) > 0.4) pose = 'walk'
  else pose = mz.charged ? 'blue' : 'idle'
  f._forceAction = pose
  // heavy servo footsteps
  if (pose === 'walk' && mz.t % 24 === 0) cue(mz, 'step')
  if (mz.t === 1) cue(mz, 'step')
}
function chordAgain(f, raw, q) { return chord(f, raw, null, q) }

// ── THUNDER FIREBALL (R11): the Megazord's own shot list (no engine projectile → no import of abilities.js) ──
function spawnFire(f, mz) {
  const dir = f.facing || 1
  mz.shots.push({ id: ++mz.serial, x: ctr(f) + dir * 70, y: f.y + 58, vx: dir * MZ.fire.speed, t: 0, hit: false })
  cue(mz, 'fire')
}
function stepShots(f, W, mz) {
  const opp = W?.opponent?.(f)
  for (const s of mz.shots) {
    s.t++; s.x += s.vx
    if (!opp || s.hit || !(opp.health > 0)) continue
    const k = Math.min(1, s.t / MZ.fire.life), w = MZ.fire.w * (1 - 0.5 * k), h = MZ.fire.h * (1 - 0.5 * k)
    if (s.x + w / 2 > opp.x && s.x - w / 2 < opp.x + (opp.w || 48) && s.y + h / 2 > opp.y && s.y - h / 2 < opp.y + (opp.h || 94)) {
      s.hit = true
      const facingShot = Math.sign(s.vx) === -(opp.facing || 1)
      const scale = Math.pow(MZ.comboScale, Math.max(0, (f.comboCounter || 0)))
      if (opp.isBlocking && facingShot) { W.damage(opp, Math.round(MZ.fire.dmg * 0.1), { attacker: f, move: 'mzFire' }); opp.blockstun = Math.max(opp.blockstun || 0, 14) }
      else {
        W.damage(opp, Math.round(MZ.fire.dmg * scale), { attacker: f, move: 'mzFire', tier: 'big' })
        opp.hitstun = Math.max(opp.hitstun || 0, 24); opp.vx = Math.sign(s.vx) * 7; opp.vy = Math.min(opp.vy || 0, -4)
        f.comboCounter = (f.comboCounter || 0) + 1
      }
      cue(mz, 'fireHit'); mz.boom = { x: s.x, y: s.y, t: 16 }
    }
  }
  mz.shots = mz.shots.filter(s => !s.hit && s.t < MZ.fire.life)
  if (mz.boom && --mz.boom.t <= 0) mz.boom = null
}

// ── armor / super armor / Saber Charge shock (combat.js asks through megazordHook.js) ──
MZ_HOOK.absorb = (target, dealt, opts = {}) => {
  const mz = mzState(target); if (!mz || mz.phase !== 'mode') return null
  const big = isBig(opts)
  mz.armor = Math.max(0, mz.armor - Math.max(0, dealt)); mz.absorbed += Math.max(0, dealt); mz.hits++
  if (big) mz.staggerT = 18
  // SABER CHARGE: anything that hits the Megazord while the saber charges gets SHOCKED (canon: the charged saber shocks whoever grabs it)
  const atk = opts.attacker
  if (mz.chargeT > 0 && atk && atk !== target && atk.health > 0 && !(atk._mzShockAt === mz.t)) {
    atk._mzShockAt = mz.t
    try { MZ_HOOK._damage?.(atk, MZ.shock, { attacker: target, move: 'mzShock', damageType: 'energy' }) } catch (_) {}
    atk.hitstun = Math.max(atk.hitstun || 0, 22); atk.vx = -(atk.facing || 1) * 5
    mz.shocks++; cue(mz, 'shock'); mz.shockFx = { x: ctr(atk), y: (atk.y || 0) + 30, t: 18 }
  }
  return 0   // the Ranger's health is untouched
}
MZ_HOOK.armored = (defender, atk, cat) => !(cat === 'ultimate' || atk?.isUltimate || atk?.isSuper || atk?.category === 'ultimate' || (atk?.bars || 0) > 0)

// ── squad hooks (mmprSquad.js cfg) ──
export function megazordTick(f, raw, W) {
  const q = f?._squad; if (!q) return
  if (W?.damage) MZ_HOOK._damage = W.damage
  const mz = q.mz
  if (mz?.sepT > 0) mz.sepT--
  if (mz?.shockFx && --mz.shockFx.t <= 0) mz.shockFx = null
  if (mz?.flash > 0) mz.flash--
  if (f._mzVuln > 0) f._mzVuln--
  if (mz?.phase === 'mode') { tickMode(f, raw, W, q, mz); return true }
  if (mz?.phase === 'break') {
    mz.t++; f._forceAction = 'collapse'; f.attacking = false; f.vx = 0; f.invulnTimer = Math.max(f.invulnTimer || 0, 2); if (f.health > 0) f.health = mz.hp
    f._squadEat = { ...(f._squadEat || {}), ...Object.fromEntries(ATTACK_KEYS.map(k => [k, true])) }
    if (mz.t >= MZ.collapse) separate(f, 'break', W)
    return true
  }
  if (mz?.phase === 'done' && !(mz.sepT > 0)) MZ_LIVE.delete(f)
  // the U + L chord (outside the mode)
  f._squadInject = null
  const fired = chord(f, raw, mz, q), c = q.mzc
  if (fired) {
    const energy = Math.max(f.energy || 0, c.e && q.t - c.e.t <= MZ.chord ? c.e.energy : 0)
    c.hold = null
    if (!mzRefuse(f, W, energy)) {
      const e = cancelFirstPress(f, q, W)
      f._squadEat = { ...(f._squadEat || {}), ultimate: true, special: true }
      startTransform(f, W, e)
      return true
    }
  }
  // U first: while the Megazord is available, U is held back up to MZ.chord frames waiting for L; no L → the Ranger's own
  // ultimate fires (re-injected for one frame), so U alone still works, MZ.chord frames later
  // …except with W (Jump) going down beside it: that's the squad's W + U team ultimate (squadCore stamps q.jAt / q.uAt first),
  // so U is never held back from it (U then W: the hold is dropped with no re-inject, squadCore fires the team ultimate)
  const teamChord = !!(raw.jump || raw.up) && Math.abs(q.t - (q.jAt ?? -99)) <= 5 && Math.abs((q.uAt ?? -99) - (q.jAt ?? -99)) <= 5
  if (teamChord && c.hold != null) { c.hold = null; if (f._squadEat) { delete f._squadEat.ultimate; if (!Object.keys(f._squadEat).length) f._squadEat = null } }
  if (!fired && raw.ultimate && !c.pu0 && !raw.special && !teamChord && !mzRefuse(f, W)) c.hold = q.t
  c.pu0 = !!raw.ultimate
  if (c.hold != null) {
    if (q.t - c.hold < MZ.chord && raw.ultimate) { f._squadEat = { ...(f._squadEat || {}), ultimate: true }; return true }
    c.hold = null
    if (f._squadEat) { delete f._squadEat.ultimate; if (!Object.keys(f._squadEat).length) f._squadEat = null }
    f._squadInject = { ultimate: true }
  }
}
export const megazordLock = f => mzActive(f)   // the dial and the team ultimate are off while the Megazord is out
export function megazordReset(f) {   // round reset / rematch: the Ranger is back to normal size, no Megazord
  if (!f) return
  if (CINE_STATE.f === f) CINE_STATE.f = null
  if (f._mzDims) { const cx = ctr(f), feet = feetOf(f); f.w = f._mzDims.w; f.h = f._mzDims.h; f._mzDims = null; f.x = cx - f.w / 2; f.y = feet - f.h }
  f._mzOn = false; f._mzVuln = 0; f._fxAlpha = null
  if (f._forceAction && (MZ_ANIM[f._forceAction] || Object.values(CALL_POSE).includes(f._forceAction))) f._forceAction = null
  MZ_LIVE.delete(f)
}
// CPU (squad cpu hook, before the AI each frame): transform with a full meter on a clear opening; once out, guard against
// supers, finish before the timer runs out. Returns true when it acted (the squad CPU then does nothing else this frame).
export function megazordCpu(f, opp, difficulty, W) {
  const q = f?._squad; if (!q || !opp || difficulty === 'dummy') return false
  const mz = q.mz, dist = Math.abs(ctr(opp) - ctr(f))
  if (mz?.phase === 'mode') {
    const oa = opp.attacking ? opp.currentAttack : null
    f._mzCpuGuard = !!(oa && (oa.isUltimate || oa.category === 'ultimate' || oa.isSuper) && dist < 700)
    if (!mz.finisher && (mz.timer < 150 || (dist < MZ.final.reach && (opp.hitstun || 0) > 0)) && !f.attacking) {
      f.attacking = false
      if (startMz(f, 'mzFinal', W, mz)) { mz.finisher = true; mz.timer = Math.max(mz.timer, MZ.final.total + 2); f.invulnTimer = Math.max(f.invulnTimer || 0, MZ.final.total) }
    }
    return true
  }
  if (mz?.phase === 'cine' || mz?.phase === 'break') return true
  // an opening: full meter and the foe not mid-attack (or reeling). The call freezes the fight, so the CPU doesn't wait long:
  // with the Megazord unused it keeps the meter for it (no team ultimate) and calls it within ⅓ s.
  if (mzRefuse(f, W)) { q.mzWait = 0; return false }
  const oa = opp.attacking ? opp.currentAttack : null
  q.mzWait = (q.mzWait || 0) + 1
  const opening = !oa || (opp.hitstun || 0) > 0 || opp.knockdownState || q.mzWait > 20
  if (opening && !f.attacking) { startTransform(f, W, f.energy || 0); return true }
  f._squadEat = { ...(f._squadEat || {}), ultimate: true }   // keep the meter for the Megazord
  return true
}
// world-side helper for tests / probes
export const megazordStatus = f => { const mz = mzState(f); return mz ? { phase: mz.phase, t: mz.t, timer: mz.timer, armor: mz.armor, from: mz.from, hp: mz.hp, used: mz.used, charged: mz.charged, chargeT: mz.chargeT, finisher: mz.finisher, end: mz.end, hits: mz.hits, shocks: mz.shocks, moves: { ...mz.moves }, shots: mz.shots.length, key: f.rosterKey, w: f.w, h: f.h, on: !!f._mzOn, pose: f._forceAction || null } : null }
