/**
 * ninja.js — MSV1 REUSABLE NINJA FRAMEWORK (profile-driven; extends rangers.js like flight.js / drones.js / rangers.js).
 *
 * A Wind / Thunder ninja Ranger = registerNinjaProfile('<rosterKey>', {...data}). This module owns every shared
 * system; a profile only supplies numbers, its move table and which optional modules it uses.
 * docs/msv1/NINJA_FRAMEWORK.md documents every field.
 *
 *   A NINJA POWER   0..100 (start 50, +regen/s while not streaking, +onHit on a landed hit). f._ninja.np
 *   B NINJA STREAK  the SAME double-tap as S.P.D. Red's blink: rangers.js tickRanger does the press-edge detection with
 *                   the same 12-tick tapWindow and the same diagonal rule (r.pendingAt); blinkVeto stops the blink, the
 *                   ninja STREAKS instead (visible R3 travel, projectile-intangible on frames 2-6, passes THROUGH the foe,
 *                   chains up to 3). STREAK STRIKE = an attack pressed during the streak hits on the way through.
 *   C SMOKE VANISH  Charge + Light + Heavy; also a blockstun escape (dearer, cooldown).
 *   D SHADOW CLONES max 2, five-step choreography (hand sign → smoke pop → staggered fan-out → tilt (render) → unison
 *                   strike → smoke exit). Hittable (1 hit pops), 60% damage, never the KO hit.
 *                   clonechoreo.js does not exist in this repo → the clone engine lives HERE (cloneJob / clones) so it can
 *                   be migrated later without touching the profiles.
 *   E NINJA MIRROR  ↓↓ + Charge: one REAL body (the fighter itself) + one ILLUSION. Which spot became real is a seeded hash;
 *                   identity is GAME_STATE only. Renderers draw both bodies the same way except THE TELL (no ground
 *                   shadow on the illusion + a visor glint every 90 f), visible to both players.
 *   F NINJA BARRIER Forward + Charge: 8-frame parry, then the dome ('reflect' | 'armor').
 *   OPTIONAL (profile-gated): burrow, traps, rev, float, streak.air (8-way), streak.underground.
 *
 * SIM vs RENDER: all gameplay state is plain JSON on f._ninja + f._ranger (pushed into the replay / LAN checkpoint by
 * game.js). No Math.random: rangerHash(match seed, frame, player index + slot). Smoke drift, tilts, speed lines, glints and
 * camera punch live in nsFx.js and only READ f._ninja. The framework never imports the engine: game.js hands in W.
 */
import { registerRangerProfile, tickRanger, clearRanger, ensureRangerState, rangerHash, RANGER_SCREEN, getRangerProfile } from './rangers.js'

export const NINJA_PROFILES = {}
export const NINJA_DEFAULTS = Object.freeze({
  np: { start: 50, max: 100, regen: 6, onHit: 4 },
  streak: { distPct: 0.40, travel: 8, intangible: [2, 6], cost: 10, chain: 3, thirdCost: 20, recovery: 14, cancelFrom: 9,
    strike: { dmg: 45, damageType: 'blunt', hitstun: 24, blockstun: 12 }, air: null, underground: false, chainWindow: 10 },
  vanish: { cost: 30, escapeCost: 40, escapeInvuln: 6, escapeCooldown: 720, pop: 6, gone: 6, fade: 8, behind: 70, above: 150, cloud: 30 },
  clones: { max: 2, dmgPct: 0.6, cost: 35, strike: 60 },
  mirror: { cost: 50, frames: 480, gapPct: 0.30, swapCost: 10, swapFrames: 6, maxSwaps: 3, glintEvery: 90, mode: 'echo', echoDelay: 8,
    dmgPct: 0.5, meterPct: 0.5, counter: null },
  barrier: { cost: 25, parry: 8, dome: 30, kind: 'reflect', reflectMul: 1.2, absorb: 2, armorFrames: 60, counter: null },
  combo: 0.85,
})
const merge = (d, p) => (p === false ? null : { ...d, ...(p || {}) })

// ── Registry ──────────────────────────────────────────────────────────────────────────────────────────────────────
export function registerNinjaProfile(id, p = {}) {
  const D = NINJA_DEFAULTS
  const prof = {
    id, team: p.team || 'Wind Ninja Academy', color: p.color || '#e0201c', smoke: p.smoke || p.color || '#e0201c',
    np: merge(D.np, p.np), streak: { ...D.streak, ...(p.streak || {}), strike: { ...D.streak.strike, ...(p.streak?.strike || {}) } },
    vanish: merge(D.vanish, p.vanish), clones: merge(D.clones, p.clones), mirror: merge(D.mirror, p.mirror), barrier: merge(D.barrier, p.barrier),
    burrow: p.burrow || null, traps: p.traps || null, rev: p.rev || null, float: p.float || null,
    airMul: p.airMul ?? 1, weight: p.weight ?? 1, combo: p.combo ?? D.combo,
    moves: p.moves || {}, commands: p.commands || null, supers: p.supers || {}, anims: p.anims || {}, quotes: p.quotes || null, ext: p.ext || null,
  }
  NINJA_PROFILES[id] = prof
  // The rangers.js profile: the SAME blink numbers block as S.P.D. Red (tapWindow 12, run 8.4 / 5.6 → 10.5 px/f run),
  // vertical taps on (↓↓ commands + Shane's ↑↑ / ↓↓ air streaks). The blink itself is vetoed (the ninja streaks).
  registerRangerProfile(id, { ownTick: true, team: prof.team, badge: { color: prof.color, accent: '#ffffff', emblem: 'ninja' },
    morph: { alwaysMorphed: true }, blink: { ...(p.blink || {}), vertical: true }, sprites: { streak: 'streak' } })
  return prof
}
export const getNinjaProfile = f => NINJA_PROFILES[typeof f === 'string' ? f : f?.rosterKey] || null
export const isNinja = f => !!getNinjaProfile(f)
// MSV1-MERGE: multi-form characters (nsDuo.js registers; null = no duo hooks → every path below is unchanged)
let _duo = null
export function registerDuo(h) { _duo = h }
export const duoCommand = (f, s, opp, raw) => (f?._duo && _duo ? _duo.command(f, s, opp, raw) : false)

// ── helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const ctrX = f => (f.x || 0) + (f.w || 48) / 2
export const ctrY = f => (f.y || 0) + (f.h || 94) * 0.45
const feetY = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)
export const overlaps = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const body = (x, feet, f) => ({ x: x + 6, y: feet - (f.h || 94) + 4, w: (f.w || 48) - 12, h: (f.h || 94) - 4 })
const pidx = f => f.playerNumber || (f.side === 'p2' ? 2 : 1)
const elapsed = a => a.total - a.timer
const BUTTONS = ['light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab', 'block', 'charge', 'jump', 'left', 'right', 'up', 'down']
export const cue = (f, c) => { (f._nsCues ||= []).push(c) }   // presentation queue (sound / shake), played + cleared by game.js
let _W = null
const stageW = () => _W?.stageWidth?.() || 3200
const clampX = (f, x) => Math.max(0, Math.min(stageW() - (f.w || 48), x))
const hash = (f, slot) => rangerHash(_W?.seed?.() || 1, _W?.frame?.() || 0, pidx(f) * 97 + slot)
export function setNinjaWorld(W) { if (W) _W = W }

// ── State (GAME_STATE) ───────────────────────────────────────────────────────────────────────────────────────────
export function ninjaState(f) {
  const p = getNinjaProfile(f); if (!p) return null
  return f._ninja ||= {
    np: p.np.start, npAcc: 0, clock: 0, tick: 0,
    prev: {}, edgeAt: {}, edgeClk: {}, edgeDir: {}, used: {}, dirs: [],
    streak: null, chain: 0, chainOpen: 0, chainLock: 0, airStreaks: 0, streaks: 0, lastStreakDir: 1,
    vanish: null, vanishCd: 0, escapeCd: 0,
    clones: [], cloneJob: null, cloneSerial: 0,
    mirror: null, mirrors: 0,
    barrier: null,
    burrow: null, traps: [], rev: { t: 0, pips: 0 }, revSpend: 0,
    float: { used: 0, on: false }, wasGround: true,
    lastHp: f.health, lastHitstun: 0, lastBlockstun: 0, atkSeen: null,
    hist: [], shots: [], fx: [], serial: 0, sup: null, stats: { strikes: 0, counters: 0, swaps: 0, clonePops: 0, trapHits: 0, absorbed: 0, reflected: 0 },
  }
}
export function clearNinja(f) {
  if (!f) return
  if (f._ninja) { if (f._forceAction && /^ns/.test(f._forceActionBy || '')) { f._forceAction = null; f._forceActionBy = null } delete f._ninja }
  delete f._nsCues
  if (isNinja(f)) { clearRanger(f); f._rooted = false }
}
// Round reset: the engine's generic stat pass leaves custom fighters at speed 84 / dash 16 — every bespoke kit restores its
// own stats here (S.P.D. Red: spdRedRoundReset). profile.stats = the roster stats (nsData attaches them).
export function ninjaRoundReset(f) {
  _duo?.roundReset(f)   // MSV1-MERGE: a duo becomes its start form first
  if (!isNinja(f)) return
  clearNinja(f); const p = getNinjaProfile(f); f._nsBaseSpeed = null
  const st = p?.stats
  if (st) { f.baseSpeed = f.speed = st.speed; if (st.dashSpeed) f.dashSpeed = st.dashSpeed; if (st.dashDuration) f.dashDuration = st.dashDuration; if (st.dashCooldownMax) f.dashCooldownMax = st.dashCooldownMax }
  if (p?.quotes?.intro) say(f, p.quotes.intro, 150)   // "Ninja Storm, Ranger Form! Ha!" over the match intro (counts down once the round runs)
  f._nsIntroFx = 0
}
export const ninjaPower = f => f?._ninja?.np ?? 0
export function spendNP(f, n) { const s = f._ninja; if (!s || s.np < n) return false; s.np -= n; return true }
export function gainNP(f, n) { const s = f._ninja, p = getNinjaProfile(f); if (s && p) s.np = Math.min(p.np.max, s.np + n) }
export function burst(s, k, x, y, t = 14, o = {}) { s.fx.push({ k, x: Math.round(x), y: Math.round(y), t, t0: t, n: ++s.serial, ...o }); if (s.fx.length > 24) s.fx.shift() }

// ── input bookkeeping (press edges + facing-relative direction history, like spdRed) ──────────────────────────────
const dirToken = (raw, facing) => {
  const fwd = facing === -1 ? raw.left : raw.right, back = facing === -1 ? raw.right : raw.left
  if (raw.down) return fwd ? 3 : back ? 1 : 2
  if (raw.up) return fwd ? 9 : back ? 7 : 8
  return fwd ? 6 : back ? 4 : 5
}
export function recentMotion(s, win) {
  const from = s.tick - win; let str = ''
  for (let i = 0; i < s.dirs.length; i++) { const [tok, at] = s.dirs[i], next = s.dirs[i + 1]; if (at >= from || !next || next[1] > from) str += tok }
  return str
}
export function hasMotion(s, pat, win) { const str = recentMotion(s, win); let i = 0; for (const c of str) if (c === pat[i]) { i++; if (i === pat.length) return true } return false }
export const fresh = (s, k, win = 8) => { const at = s.edgeAt[k]; return at != null && s.used[k] !== at && s.clock - (s.edgeClk[k] ?? -1e9) <= win }
export const live = (s, k, win) => s.edgeAt[k] != null && s.used[k] !== s.edgeAt[k] && s.tick - s.edgeAt[k] <= win
export const use = (s, ...ks) => { for (const k of ks) if (s.edgeAt[k] != null) s.used[k] = s.edgeAt[k] }
// the rangers.js double-tap stamp (same detector, same window as S.P.D. Red): {dir, vdir} if it landed within `win` ticks
export function doubleTap(f, win = 4) {
  const r = f._ranger, s = f._ninja
  if (!r || r.pendingAt == null || r.tick - r.pendingAt > win || s?.usedTap === r.pendingAt) return null
  return { ...r.pending, at: r.pendingAt }
}
const useTap = f => { if (f._ninja && f._ranger) f._ninja.usedTap = f._ranger.pendingAt }

// ── moves: start an engine move (frameExact path) + attach the ninja descriptor `nj` ──────────────────────────────
let _startMove = null
export function registerNinjaStartMove(fn) { _startMove = fn }
let _proj = null
export function registerNinjaProjectiles(p) { _proj = p }
export function nsStartMove(f, key, extra = {}) {
  const p = getNinjaProfile(f), md = p?.moves[key] || (f._duo && _duo?.moves[key]); if (!md || !_startMove) return false
  if (f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null }
  f.attackCooldown = 0
  if (!_startMove(f, key, md)) return false
  const a = f.currentAttack, g = md.nj || {}
  f.currentMove = key
  a.nj = { kind: g.kind || 'normal', ...g, dir: f.facing || 1, ...extra }
  if (g.noHit) a.hasHit = true
  if (md.groundHit) a.groundHit = true
  if (md.invuln) f.invulnTimer = Math.max(f.invulnTimer || 0, md.invuln)
  if (md.isSpecial || md.isUltimate) { f.isBlocking = false; if (grounded(f)) f.vx = 0 }
  const s = f._ninja
  if (s && md.isSpecial && s.rev.pips && p.rev) { a.nj.rev = s.rev.pips; s.rev.pips = 0; s.rev.t = 0 }   // REV: the next special spends every pip
  if (f._duo) _duo?.onStart(f, a, md)   // MSV1-MERGE: tag bonus
  return true
}
export const endMove = f => { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._rooted = false }
const setPose = (f, key) => { if (f.currentAttack) f.currentMove = key }   // swap the drawn strip mid-move (presentation key only)

// Hitbox descriptor (combat.js getAttackHitbox hook, ninja-gated)
export function ninjaHitbox(f) {
  const a = f.currentAttack, g = a?.nj
  if (!g || g.noHit) return null
  const fw = f.w || 48, reach = (a.rangeX || 60) * (f._reachMult || 1), h = a.rangeY || 40
  if (g.centered) return { x: f.x + fw / 2 - reach / 2, y: f.y + (g.boxY ?? 20), w: reach, h }
  return { x: f.facing === 1 ? f.x + fw : f.x - reach, y: f.y + (g.boxY ?? 20), w: reach, h }
}
export const ninjaComboScale = f => Math.pow(getNinjaProfile(f)?.combo ?? 0.85, Math.max(0, f?.comboCounter || 0))

// ── SCRIPTED STRIKE (streak strike, clones, illusion, counters, supers, traps). Respects invulnerability + guard and goes
//    through the engine's damage choke-point (W.damage). o.pct (clone 0.6 / illusion 0.5), o.noKO, o.noChip. ─────────
export function nsStrike(f, foe, dmg, o = {}) {
  if (!foe || foe === f || !(foe.health > 0) || ((foe.invulnTimer || 0) > 0 && !(o.otg && foe.knockdownState))) return false
  const s = ninjaState(f), dir = o.dir || Math.sign(ctrX(foe) - ctrX(f)) || f.facing || 1, type = o.damageType || 'blunt'
  let d = dmg * (o.pct ?? 1) * (o.revMul ?? 1)
  if (foe.isBlocking && !o.locked && !o.unblockable) {
    foe.blockstun = Math.max(foe.blockstun || 0, o.blockstun || 14); foe.vx = dir * 3
    if (!o.noChip) _W?.damage?.(foe, Math.min(d * 0.1, Math.max(0, foe.health - 1)), { source: 'ability', attacker: f, move: o.move || 'nsStrike', damageType: type })
    f.comboCounter = 0; burst(s, 'block', ctrX(foe), ctrY(foe)); cue(f, 'blocked'); return 'blocked'
  }
  d *= (o.fixedScale ?? ninjaComboScale(f))
  if (o.noKO) d = Math.min(d, Math.max(0, (foe.health || 0) - 1))   // clones / illusion never land the KO
  _W?.damage?.(foe, d, { source: 'ability', attacker: f, move: o.move || 'nsStrike', damageType: type })
  foe.hitstun = Math.max(foe.hitstun || 0, o.hitstun || 24)
  foe.vx = dir * (o.kb ?? 3); if (o.launch) { foe.vy = o.launch; foe.onGround = false; foe.grounded = false }
  if (o.knockdown) { foe.knockdownState = true; foe.knockdownTimer = Math.max(foe.knockdownTimer || 0, 44); foe.vy = Math.min(foe.vy || 0, o.launch || -7) }
  foe.hitFlash = Math.max(foe.hitFlash || 0, 6); foe.isBlocking = false
  f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
  if (!o.noNP) gainNP(f, getNinjaProfile(f).np.onHit)
  f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + 3 * (o.meterPct ?? 1))   // super meter (illusion: 50%)
  burst(s, type === 'energy' ? 'zap' : 'hit', o.sparkX ?? ctrX(foe), o.sparkY ?? ctrY(foe)); cue(f, o.cue || (type === 'slash' ? 'slashHit' : 'impact'))
  s.stats.strikes++
  return true
}

// ── A. NINJA POWER + hit bookkeeping ─────────────────────────────────────────────────────────────────────────────
function tickResources(f, s, p) {
  if (!s.streak) { s.npAcc += p.np.regen / 60; if (s.npAcc >= 1) { const n = Math.floor(s.npAcc); s.npAcc -= n; gainNP(f, n) } }
  if (s.vanishCd > 0) s.vanishCd--
  if (s.escapeCd > 0) s.escapeCd--
  // landed a hit with an engine move (melee) → +onHit
  const a = f.currentAttack
  if (a && a.hasHit && !a.nj?.noHit && s.atkSeen !== a) { s.atkSeen = a; gainNP(f, p.np.onHit) }
  if (f._nsShotHit) { f._nsShotHit = false; gainNP(f, p.np.onHit); cue(f, 'zap') }
}
// did the REAL body just get hit / blocked? (health drop or fresh stun) — ends the mirror, drops REV, pops a burrow
function tickHitDetect(f, opp, s, p) {
  const hit = (f.health < s.lastHp - 0.01) && (f.hitstun || 0) > 0 && (f.hitstun || 0) >= s.lastHitstun
  const blocked = (f.blockstun || 0) > s.lastBlockstun
  if (hit) {
    if (s.mirror) endMirror(f, s, 'real')
    if (s.burrow) { s.burrow = null; burst(s, 'dust', ctrX(f), feetY(f)) }
    s.rev.pips = 0; s.rev.t = 0
    if (s.barrier) s.barrier = null
  }
  if (blocked) { s.rev.pips = 0; s.rev.t = 0 }
  s.lastHp = f.health; s.lastHitstun = f.hitstun || 0; s.lastBlockstun = f.blockstun || 0
}

// ── B. NINJA STREAK ───────────────────────────────────────────────────────────────────────────────────────────────
export function canStreak(f, s, p, air) {
  if (!(f.health > 0) || f.isGrabbed || f.knockdownState || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (s.vanish || s.mirror?.swap || s.sup) return false
  if (s.chainLock > 0) return false   // the full chain (×3) must play its recovery out
  if (air && !(p.streak.air && s.airStreaks < p.streak.air.perAirtime)) return false
  return true
}
export function startStreak(f, opp, dir, vdir = 0, o = {}) {
  const s = ninjaState(f), p = getNinjaProfile(f)
  const air = !grounded(f) && !s.burrow
  if (!canStreak(f, s, p, air)) return false
  if (p.ext?.stepGate && !p.ext.stepGate(f, s)) return false   // NS CGPT: Ninja Step charges (profile ext; no-op for everyone else)
  const n = s.chainOpen > 0 ? s.chain + 1 : 1
  if (n > p.streak.chain) return false
  const cost = n >= 3 ? p.streak.thirdCost : p.streak.cost
  if (!spendNP(f, cost)) return false
  if (f.attacking) endMove(f)
  s.chain = n; s.chainOpen = 0; s.wantRun = 0
  if (air) s.airStreaks++
  const under = !!s.burrow && p.streak.underground
  const sdir = (dir === 0 && vdir && air) ? 0 : (dir || f.facing || 1)
  s.streak = { t: 0, dir: sdir, vdir: air ? vdir : 0, air, under, x0: Math.round(f.x), y0: Math.round(f.y), crossed: false, strike: false, struck: false,
    n: ++s.streaks, rev: s.rev.pips, startSide: opp ? Math.sign(ctrX(opp) - ctrX(f)) : 0 }
  if (s.rev.pips && p.rev) { s.rev.pips = 0; s.rev.t = 0 }
  s.lastStreakDir = s.streak.dir || f.facing || 1
  nsStartMove(f, under ? 'nsTremor' : 'nsStreak')
  if (sdir) f.facing = sdir; f._rooted = true; f.vx = 0; if (air) f.vy = 0
  f.isBlocking = false
  cue(f, under ? 'tremor' : 'streak'); burst(s, 'streakTail', ctrX(f), feetY(f), 18, { dir: s.streak.dir })
  p.ext?.onStep?.(f, s)
  return true
}
function stepStreak(f, opp, s, p, raw) {
  const k = s.streak, P = p.streak
  if (!f.currentAttack || !/^nsStreak|^nsTremor/.test(f.currentAttack.name)) { s.streak = null; f._rooted = false; return }   // knocked out of it
  // 8-way air angle: the vertical held on the first 2 frames (↗ / ↘ / straight; ↑↑ / ↓↓ = pure vertical)
  if (k.air && k.t < 2 && !k.vdirLocked) { const v = raw.up ? -1 : raw.down ? 1 : 0; if (v) k.vdir = v }
  if (k.air && k.t >= 2) k.vdirLocked = true
  const total = Math.round(RANGER_SCREEN * P.distPct), per = total / P.travel
  const ang = k.air && k.vdir ? (k.dir ? 0.7071 : 1) : 1
  if (k.t < P.travel) {
    f.x = clampX(f, f.x + (k.dir || 0) * per * ang)
    if (k.air && k.vdir) { const floor = (f._rangerFloorY ?? feetY(f)) - (f.h || 94); f.y = Math.min(floor, Math.max(-360, f.y + k.vdir * per * ang)) }
    f.vx = 0; f.vy = 0; f._rooted = true
    // STREAK STRIKE: an attack pressed during the streak hits on the way through (once), cross-up side switch
    if (!k.strike && (fresh(s, 'light', 3) || fresh(s, 'heavy', 3))) { k.strike = true; use(s, 'light', 'heavy'); setPose(f, 'nsStreakStrike') }
    if (opp && opp.health > 0) {
      const me = body(f.x, feetY(f), f), them = { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 }
      if (k.strike && !k.struck && overlaps(me, them) && !k.under) {
        k.struck = true
        const r = nsStrike(f, opp, P.strike.dmg, { damageType: P.strike.damageType, hitstun: P.strike.hitstun, blockstun: P.strike.blockstun, kb: -k.dir * 2, move: 'nsStreakStrike', revMul: 1 + 0.1 * (k.rev || 0) })
        if (r === true) cue(f, 'streakHit')
      }
      if (!k.crossed && k.startSide && Math.sign(ctrX(opp) - ctrX(f)) === -k.startSide) k.crossed = true
      // TREMOR STREAK: underground it surfaces right UNDER the foe once it has passed their centre (a cross-up from below → Erupt)
      if (k.under && k.crossed && grounded(opp)) { f.x = clampX(f, ctrX(opp) - (f.w || 48) / 2 + k.dir * 18); k.t = P.travel; finishStreakTravel(f, opp, s, p, k); return }
    }
    k.t++
    if (k.t === P.travel) finishStreakTravel(f, opp, s, p, k)
  }
}
function finishStreakTravel(f, opp, s, p, k) {
  // never end INSIDE the foe: clear them on the far side (cross-up), or stop in front against a wall
  if (opp && opp.health > 0 && !k.under) {
    const ow = opp.w || 48, fw = f.w || 48
    if (f.x < opp.x + ow && f.x + fw > opp.x && Math.abs(f.y - opp.y) < (f.h || 94)) {
      let x = k.dir > 0 ? opp.x + ow + 4 : opp.x - fw - 4
      if (clampX(f, x) !== x) x = k.dir > 0 ? opp.x - fw - 4 : opp.x + ow + 4
      f.x = clampX(f, x)
    }
    if (Math.sign(ctrX(opp) - ctrX(f)) === -k.startSide && k.startSide) k.crossed = true
    f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
  }
  s.streak = null; f._rooted = false
  if (k.air) { f.vx = k.dir * 4; f.vy = k.vdir > 0 ? 8 : -2 }
  s.chainOpen = p.streak.recovery + 1
  if (k.under) { nsStartMove(f, 'nsBurrow'); if (s.burrow) s.burrow.t = Math.max(s.burrow.t, (s.burrow.sink || 6) + 1); f._rooted = true; burst(s, 'dust', ctrX(f), feetY(f)); cue(f, 'rumble'); s.chainOpen = 0; s.chain = 0; return }   // back to the burrow
  if (s.chain >= p.streak.chain) { s.chainOpen = 0; s.chain = 0; s.chainLock = p.streak.recovery + 1 }
  nsStartMove(f, 'nsStreakRec'); if (!k.air) s.wantRun = k.dir   // holding the direction through the recovery → run (S.P.D. Red's run)
  burst(s, 'skid', ctrX(f), feetY(f), 12, { dir: k.dir })
}
// RUN after a streak: holding the streak direction keeps running at S.P.D. Red's run speed (rangers.js run mul)
function tickRunAfterStreak(f, s, raw) {
  const r = f._ranger; if (!r) return
  if (s.wantRun && grounded(f) && !f.attacking) {
    const d = s.wantRun; s.wantRun = 0
    if (d > 0 ? raw.right && !raw.left : raw.left && !raw.right) r.running = d
  }
}

// ── C. SMOKE VANISH ──────────────────────────────────────────────────────────────────────────────────────────────
export function startVanish(f, opp, raw, escape = false) {
  const s = ninjaState(f), p = getNinjaProfile(f), V = p.vanish
  if (!V || s.vanish || s.sup || !(f.health > 0) || f.isGrabbed) return false
  if (escape ? (s.escapeCd > 0 || !(f.blockstun > 0)) : ((f.hitstun || 0) > 0 || (f.blockstun || 0) > 0)) return false
  if (!spendNP(f, escape ? V.escapeCost : V.cost)) return false
  if (escape) { s.escapeCd = V.escapeCooldown; f.blockstun = 0; f.isBlocking = false }
  if (f.attacking) endMove(f)
  const fwd = f.facing === -1 ? raw.left : raw.right
  s.vanish = { t: 0, escape, up: !!raw.up, x0: Math.round(f.x), y0: Math.round(f.y), x1: null, y1: null, fwd: !!fwd }
  s.burrow = null
  nsStartMove(f, 'nsVanish')
  f.invulnTimer = Math.max(f.invulnTimer || 0, escape ? V.escapeInvuln : 0)
  burst(s, 'smoke', ctrX(f), feetY(f), V.cloud, { big: true }); cue(f, 'smokePop')
  return true
}
function stepVanish(f, opp, s, p) {
  const v = s.vanish, V = p.vanish
  v.t++
  if (v.t <= V.pop) { f.vx = 0; f._rooted = true; return }
  if (v.t === V.pop + 1) {   // gone: resolve the destination (behind / above the foe)
    if (opp && opp.health > 0) {
      const side = Math.sign(ctrX(f) - ctrX(opp)) || -(opp.facing || 1)
      v.x1 = Math.round(clampX(f, ctrX(opp) - side * (V.behind + (opp.w || 48) / 2) - (f.w || 48) / 2))
      v.y1 = v.up ? Math.round(opp.y - V.above) : Math.round(f.y)
    } else { v.x1 = Math.round(clampX(f, f.x + (f.facing || 1) * 200)); v.y1 = Math.round(f.y) }
    setPose(f, 'nsVanishGone')
  }
  if (v.t <= V.pop + V.gone) { f.invulnTimer = Math.max(f.invulnTimer || 0, 2); f.vx = 0; f.vy = 0; f.x = v.x0; return }
  if (v.t === V.pop + V.gone + 1) {
    f.x = v.x1; f.y = v.y1; if (v.up) { f.onGround = false; f.grounded = false; f.vy = 2 }
    if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
    nsStartMove(f, 'nsVanishOut'); burst(s, 'smokeFade', ctrX(f), feetY(f), V.cloud); cue(f, 'smokePop')
  }
  f._rooted = !v.up
  if (v.t >= V.pop + V.gone + V.fade) { s.vanish = null; f._rooted = false }
}

// ── D. SHADOW CLONES (five-step choreography; clonechoreo.js-shaped so it can migrate) ────────────────────────────
// job: { t, kind, steps:{sign, pop, fan:[t per clone], strike, exit}, slots:[{dx, dy}], dmg, pct, move, onStrike }
export function startCloneJob(f, opp, job) {
  const s = ninjaState(f), p = getNinjaProfile(f), C = p.clones
  if (!C) return false
  s.clones = s.clones.filter(c => !c.dead)
  const n = Math.min(C.max, job.count ?? C.max)
  s.stats.cloneJobs = (s.stats.cloneJobs || 0) + 1
  s.cloneJob = { t: 0, ...job, n, struck: false }
  s.clones = []
  for (let i = 0; i < n; i++) {
    s.clones.push({ id: ++s.cloneSerial, slot: i, x: ctrX(f), feet: feetY(f), dir: f.facing || 1, t: 0, phase: 'wait', pose: 'guard', dead: false,
      tilt: (hash(f, 11 + i) < 0.5 ? -1 : 1) * 6 })   // ±6° tilt: chosen in the sim (hash), drawn by the render layer
  }
  return true
}
function cloneTarget(f, opp, job, i) {
  const sl = job.slots?.[i] || { dx: i === 0 ? -1 : 1, dy: 0 }
  const ox = opp ? ctrX(opp) : ctrX(f) + (f.facing || 1) * 200, of = opp ? feetY(opp) : feetY(f)
  return { x: ox + sl.dx * (job.spread ?? 90), feet: of + (sl.dy || 0) }
}
function stepCloneJob(f, opp, s, p) {
  const J = s.cloneJob; if (!J) return
  const st = J.steps || { sign: 8, pop: 14, fan: [16, 22], strike: 40, exit: 52 }
  J.t++
  s.clones.forEach((c, i) => {
    if (c.dead) return
    c.t++
    if (J.t === st.pop) { c.phase = 'pop'; c.x = ctrX(f); c.feet = feetY(f); burst(s, 'smoke', c.x, c.feet, 16); if (i === 0) cue(f, 'smokePop') }
    if (J.t === (st.fan[i] ?? st.fan[0])) { c.phase = 'fan'; c.from = { x: c.x, feet: c.feet }; c.to = cloneTarget(f, opp, J, i); c.ft = 0; c.pose = 'run' }
    if (c.phase === 'fan') { c.ft++; const u = Math.min(1, c.ft / 6); c.x = c.from.x + (c.to.x - c.from.x) * u; c.feet = c.from.feet + (c.to.feet - c.from.feet) * u; if (opp) c.dir = ctrX(opp) < c.x ? -1 : 1; if (u >= 1) { c.phase = 'ready'; c.pose = J.pose || 'uppercut' } }
  })
  if (J.t === st.strike && !J.struck) {   // UNISON STRIKE: every live clone hits on the same frame
    J.struck = true
    let hits = 0
    for (const c of s.clones) {
      if (c.dead || c.phase !== 'ready') continue
      c.phase = 'strike'; c.pose = J.pose || 'uppercut'
      const cd = opp ? (Math.sign(ctrX(opp) - c.x) || c.dir || 1) : (c.dir || 1), reach = (J.spread ?? 90) + 30   // strikes TOWARD the foe from its fan-out spot
      const box = { x: cd > 0 ? c.x - 10 : c.x - reach, y: c.feet - (f.h || 94) - (J.reachY || 20), w: reach + 10, h: (f.h || 94) + (J.reachY || 20) }
      if (opp && overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
        const r = nsStrike(f, opp, J.dmg ?? p.clones.strike, { pct: J.pct ?? p.clones.dmgPct, noKO: true, damageType: J.damageType || 'blunt', move: J.move || 'nsClone', launch: J.launch, hitstun: 30, dir: Math.sign(ctrX(opp) - c.x) || 1, fixedScale: J.fixedScale, locked: J.locked, sparkX: (c.x + ctrX(opp)) / 2 })
        if (r === true) hits++
      }
    }
    J.hits = hits; cue(f, 'cloneStrike')
  }
  if (J.t === st.exit) { for (const c of s.clones) if (!c.dead) { burst(s, 'smokeFade', c.x, c.feet, 16); c.dead = true } s.clones = []; s.cloneJob = null; cue(f, 'smokePop') }
}
// a ninja clone is popped by ANYTHING that would hit a fighter: the foe's live attack box or any of the foe's projectiles
// (Naruto-family clone strikes included). Ninja clones only ever target the foe's BODY.
function tickCloneHurt(f, opp, s) {
  if (!s.clones.length || !opp || !_W) return
  const threats = [_W.attackBox?.(opp), ...(_W.projectiles?.(opp) || [])].filter(Boolean)
  for (const c of s.clones) {
    if (c.dead || c.phase === 'wait' || c.phase === 'pop') continue
    if (threats.some(z => overlaps(z, body(c.x - (f.w || 48) / 2, c.feet, f)))) {
      c.dead = true; burst(s, 'smoke', c.x, c.feet, 14); cue(f, 'smokePop'); s.stats.clonePops++
      if (opp.currentAttack && _W.attackBox?.(opp)) opp.currentAttack.hasHit = true   // the strike was spent on the copy
    }
  }
  s.clones = s.clones.filter(c => !c.dead)
}

// ── E. NINJA MIRROR (illusion mode) ──────────────────────────────────────────────────────────────────────────────
export function startMirror(f, opp) {
  const s = ninjaState(f), p = getNinjaProfile(f), M = p.mirror
  if (!M || s.mirror || s.sup || s.vanish || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || !(f.health > 0)) return false
  if (!spendNP(f, M.cost)) return false
  if (f.attacking) endMove(f)
  const gap = Math.round(RANGER_SCREEN * M.gapPct), x0 = Math.round(f.x)
  // second spot: BEHIND (away from the foe) unless that leaves the stage or ends > half a screen from the foe (the engine's camera
  // leash would drag the body back) → the foe's side. A pure function of positions (no camera read in the sim).
  let other = x0 - (f.facing || 1) * gap
  const far = opp && Math.abs(other + (f.w || 48) / 2 - ctrX(opp)) > RANGER_SCREEN * 0.5
  if (clampX(f, other) !== other || far) other = x0 + (f.facing || 1) * gap
  other = Math.round(clampX(f, other))
  // which spot is REAL is a seeded hash (GAME_STATE) — never derivable from the picture
  const realMoves = hash(f, 31) < 0.5
  const ix = realMoves ? x0 : other
  if (realMoves) f.x = other
  s.mirror = { t: 0, ix, ifeet: Math.round(feetY(f)), dir: f.facing || 1, swaps: 0, swap: null, idle: 0, n: ++s.mirrors, echo: [], ihit: {}, counter: null }
  nsStartMove(f, 'nsMirror')
  burst(s, 'smoke', ctrX(f), feetY(f), 18, { big: true }); burst(s, 'smoke', ix + (f.w || 48) / 2, feetY(f), 18, { big: true }); cue(f, 'mirror')
  return true
}
export function endMirror(f, s, why) {
  const m = s.mirror; if (!m) return
  burst(s, 'smokeFade', m.ix + (f.w || 48) / 2, m.ifeet, 16)
  s.mirror = null; s.lastMirrorEnd = why
  cue(f, why === 'illusion' ? 'counter' : 'smokePop')
}
export function startSwap(f) {
  const s = ninjaState(f), p = getNinjaProfile(f), m = s.mirror, M = p.mirror
  if (!m || m.swap || m.swaps >= M.maxSwaps || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (f.attacking && !s.burrow) return false
  if (!spendNP(f, M.swapCost)) return false
  m.swap = { t: 0, a: Math.round(f.x), b: m.ix }; m.swaps++; s.stats.swaps++
  burst(s, 'smoke', ctrX(f), feetY(f), 10); burst(s, 'smoke', m.ix + (f.w || 48) / 2, m.ifeet, 10); cue(f, 'swap')
  return true
}
const illusionRect = (f, m) => body(m.ix, m.ifeet, f)
function stepMirror(f, opp, s, p) {
  const m = s.mirror, M = p.mirror
  m.t++
  if (m.swap) {   // both pop, 6 frames, trade places
    m.swap.t++
    if (!s.burrow) { f._rooted = true; f.vx = 0 }
    if (m.swap.t === Math.ceil(M.swapFrames / 2)) { f.x = clampX(f, m.swap.b); m.ix = m.swap.a; if (opp && !s.burrow) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1 }
    if (m.swap.t >= M.swapFrames) { m.swap = null; if (!f.attacking) f._rooted = false }
  }
  // history ring for the ECHO (Shane): body displacement + live hitbox relative to the body, 1 entry per sim frame
  const box = f.attacking && f.currentAttack && !f.currentAttack.nj?.noHit && _W?.attackBoxRaw ? _W.attackBoxRaw(f) : null
  m.echo.push({ dx: Math.round(f.x), fy: Math.round(feetY(f)), face: f.facing || 1, aid: f.currentAttack ? (f.currentAttack._nsId ||= ++s.serial) : 0,
    box: box ? { rx: box.x - f.x, ry: box.y - feetY(f), w: box.w, h: box.h, dmg: f.currentAttack.damage || 40, type: f.currentAttack.damageType || 'blunt', active: true } : null,
    pose: f.currentMove || null, air: !grounded(f) })
  if (m.echo.length > M.echoDelay + 2) m.echo.shift()
  if (m.frozen) { /* an ultimate owns the illusion's pose / spot */ }
  else if (M.mode === 'echo' && !m.swap && m.echo.length > M.echoDelay) {
    const late = m.echo[m.echo.length - 1 - M.echoDelay], prior = m.echo[m.echo.length - 2 - M.echoDelay]
    if (late && prior) { m.ix = Math.round(clampX(f, m.ix + (late.dx - prior.dx))); m.ifeet = Math.round(m.ifeet + (late.fy - prior.fy)) }
    if (late) {
      m.dir = late.face; m.pose = late.pose; m.air = late.air
      // ILLUSION ATTACK: the echoed hitbox at the illusion's spot. 50% damage, no chip, cannot KO, 50% meter.
      if (late.box && opp && !m.ihit[late.aid]) {
        const ib = { x: m.ix + (late.face === (f.facing || 1) ? late.box.rx : (f.w || 48) - late.box.rx - late.box.w), y: m.ifeet + late.box.ry, w: late.box.w, h: late.box.h }
        if (overlaps(ib, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
          m.ihit[late.aid] = true
          nsStrike(f, opp, late.box.dmg, { pct: M.dmgPct, noKO: true, noChip: true, meterPct: M.meterPct, damageType: late.box.type, move: 'nsEcho', hitstun: 20, dir: Math.sign(ctrX(opp) - (m.ix + (f.w || 48) / 2)) || 1 })
        }
      }
    }
  } else if (!m.frozen) { m.dir = opp ? (ctrX(opp) < m.ix + (f.w || 48) / 2 ? -1 : 1) : m.dir; m.pose = 'guard'; m.air = false }
  // the illusion stands on the ground unless echoing an airborne body
  if (M.mode !== 'echo' && !m.frozen) m.ifeet = Math.round(f._rangerFloorY ?? m.ifeet)
  if (m.shotQ?.length) for (const q of m.shotQ.filter(q => q.at <= s.clock)) {
    addShot(f, { x: m.ix + (f.w || 48) / 2 + q.dir * q.ox, y: m.ifeet - q.oy, vx: q.vx, vy: q.vy, w: q.w + 20, h: q.h + 20, dmg: q.dmg, pct: M.dmgPct, noKO: true, noChip: true, meterPct: M.meterPct, move: 'nsEchoShot', sprite: q.sprite, life: 70 })
    m.shotQ = m.shotQ.filter(x => x !== q)
  }
  // HITTING THE ILLUSION: no damage; it pops and COUNTERS the attacker (profile), the mode ends.
  if (opp && _W && !m.swap && !m.frozen) {
    const ir = illusionRect(f, m)
    const atk = _W.attackBox?.(opp)
    let struck = atk && overlaps(atk, ir)
    if (!struck) for (const pr of [...(_W.projectileList?.() || [])]) {
      if (pr.owner !== opp || pr.visualOnly) continue
      const r = pr.radius || (pr.w || 20) / 2
      if (overlaps({ x: pr.x - r, y: pr.y - r, w: r * 2, h: r * 2 }, ir)) { struck = true; _W.removeProjectile?.(pr); break }
    }
    if (struck) {
      if (atk && opp.currentAttack) opp.currentAttack.hasHit = true
      illusionCounter(f, opp, s, p, m)
      return
    }
  }
  if (m.t >= M.frames) endMirror(f, s, 'time')
}
function illusionCounter(f, opp, s, p, m) {
  const C = p.mirror.counter || { kind: 'tornado', hits: 3, dmg: 18 }
  const ix = m.ix + (f.w || 48) / 2
  s.stats.counters++
  burst(s, 'smoke', ix, m.ifeet, 18, { big: true })
  // the counter is scheduled on the sim clock (the illusion "hits back" from where it stood)
  s.counter = { t: 0, kind: C.kind, x: ix, feet: m.ifeet, dmg: C.dmg, hits: C.hits || 1, every: C.every || 6, launch: C.launch, wall: C.wall, done: 0 }
  endMirror(f, s, 'illusion')
}
function stepCounter(f, opp, s) {
  const c = s.counter; if (!c) return
  c.t++
  if (!opp) { s.counter = null; return }
  if (c.kind === 'tornado') {
    c.x += Math.sign(ctrX(opp) - c.x) * Math.min(14, Math.abs(ctrX(opp) - c.x))
    if (c.t % c.every === 0 && c.done < c.hits) {
      c.done++
      const last = c.done === c.hits
      if (Math.abs(ctrX(opp) - c.x) < 70) nsStrike(f, opp, c.dmg, { damageType: 'energy', move: 'nsIllusionCounter', locked: true, hitstun: 30, kb: 1, launch: last ? (c.launch || -15) : -4, cue: 'tornadoHit', sparkX: c.x })
    }
    if (c.done >= c.hits) s.counter = null
  } else if (c.kind === 'eruption') {
    if (c.t === 1) { c.x = ctrX(opp); c.feet = feetY(opp); burst(s, 'erupt', c.x, c.feet, 20); cue(f, 'eruption') }
    if (c.t === 8) {
      const dir = Math.sign(ctrX(opp) - ctrX(f)) || 1
      const r = nsStrike(f, opp, c.dmg, { damageType: 'blunt', move: 'nsIllusionCounter', locked: true, hitstun: 40, kb: c.wall ? 16 : 6, launch: -11, dir })
      if (r === true && c.wall) opp._nsWallBounce = 24
      s.counter = null
    }
  } else s.counter = null
}

// ── F. NINJA BARRIER ──────────────────────────────────────────────────────────────────────────────────────────────
export function startBarrier(f) {
  const s = ninjaState(f), p = getNinjaProfile(f), B = p.barrier
  if (!B || s.barrier || s.sup || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (!spendNP(f, B.cost)) return false
  if (f.attacking) endMove(f)
  s.barrier = { t: 0, phase: 'parry', parried: 0, absorbed: 0, kind: B.kind }
  nsStartMove(f, 'nsBarrier'); cue(f, 'barrier')
  return true
}
function stepBarrier(f, opp, s, p) {
  const b = s.barrier, B = p.barrier
  if (!f.currentAttack || !/^nsBarrier|^nsDome/.test(f.currentAttack.name)) { s.barrier = null; return }
  b.t++
  if (b.phase === 'parry' && b.t > B.parry) { b.phase = 'dome'; setPose(f, 'nsDome') }
  const len = b.kind === 'armor' ? B.armorFrames : B.dome
  // projectiles: parry (reflect) / dome (erase) / armor (absorb, counts toward the counter)
  if (_W?.projectileList && opp) {
    const me = { x: f.x - 30, y: f.y - 20, w: (f.w || 48) + 60, h: (f.h || 94) + 30 }
    for (const pr of [..._W.projectileList()]) {
      if (!pr || pr.owner === f || pr.visualOnly || pr._nsReflected) continue
      const r = pr.radius || (pr.w || 20) / 2
      if (!overlaps({ x: pr.x - r, y: pr.y - r, w: r * 2, h: r * 2 }, me)) continue
      if (b.kind === 'reflect' && b.phase === 'parry') {
        pr.owner = f; pr.vx = -(pr.vx || 0) * B.reflectMul; pr.vy = -(pr.vy || 0) * B.reflectMul; pr.damage = (pr.damage || 0) * B.reflectMul
        if (pr.speed) pr.speed *= B.reflectMul; pr._nsReflected = true; pr.hitTargets = []
        b.parried++; s.stats.reflected++; burst(s, 'parry', pr.x, pr.y, 12); cue(f, 'reflect')
      } else if (b.kind === 'reflect') { _W.removeProjectile?.(pr); burst(s, 'zap', ctrX(f), ctrY(f), 8) }
      else if (b.absorbed < B.absorb) { _W.removeProjectile?.(pr); b.absorbed++; s.stats.absorbed++; burst(s, 'block', ctrX(f), ctrY(f), 10); cue(f, 'absorb') }
    }
  }
  if (b.kind === 'armor' && (b.absorbed >= B.absorb || (b.phase === 'dome' && b.t >= B.parry + len))) {
    if (b.absorbed > 0 && !b.countered) {
      b.countered = true
      const C = B.counter || { dmg: 70, radius: 130 }
      burst(s, 'shock', ctrX(f), feetY(f), 18); cue(f, 'eruption')
      if (opp && Math.abs(ctrX(opp) - ctrX(f)) <= C.radius && grounded(opp)) nsStrike(f, opp, C.dmg, { damageType: 'blunt', move: 'nsRockCounter', hitstun: 30, kb: 9, launch: -8 })
    }
    s.barrier = null; nsStartMove(f, 'nsBarrierEnd'); return
  }
  if (b.phase === 'dome' && b.t >= B.parry + len) { s.barrier = null; nsStartMove(f, 'nsBarrierEnd') }
}

// ── OPTIONAL: BURROW (earth) ─────────────────────────────────────────────────────────────────────────────────────
export function startBurrow(f) {
  const s = ninjaState(f), p = getNinjaProfile(f), B = p.burrow
  if (!B || s.burrow || !grounded(f) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0) return false
  if (!spendNP(f, B.cost)) return false
  if (f.attacking) endMove(f)
  s.burrow = { t: 0, sink: B.sink || 6, x: Math.round(f.x), rev: s.rev.pips }
  nsStartMove(f, 'nsBurrow'); cue(f, 'rumble'); burst(s, 'dust', ctrX(f), feetY(f), 14)
  return true
}
function stepBurrow(f, opp, s, p, raw) {
  const b = s.burrow, B = p.burrow
  if (s.streak) return
  if (!f.currentAttack || f.currentAttack.name !== 'nsBurrow') {   // something knocked him out of it (hit by a low / ground hit)
    if (!s.streak) { s.burrow = null; f._rooted = false } return
  }
  b.t++
  f.vy = 0; f._rooted = true
  if (b.t > b.sink) {
    const d = (raw.right && !raw.left) ? 1 : (raw.left && !raw.right) ? -1 : 0
    f.x = clampX(f, f.x + d * (B.speed || 10.5)); f.vx = 0
    if (d) f.facing = d
    if (b.t % 8 === 0) burst(s, 'ripple', ctrX(f), feetY(f), 10)
  }
  f.currentAttack.timer = Math.max(f.currentAttack.timer, 5)   // the engine move stays alive while he is under
  const release = b.t > b.sink + 4 && !raw.special
  if (release || b.t >= B.frames) {
    s.burrow = null; f._rooted = false
    nsStartMove(f, 'sErupt', { rev: b.rev }); burst(s, 'erupt', ctrX(f), feetY(f), 18); cue(f, 'eruption')
  }
}
export const isBurrowed = f => !!f?._ninja?.burrow && (f._ninja.burrow.t > (f._ninja.burrow.sink || 6) || !!f._ninja.streak)

// ── OPTIONAL: TRAPS (kunai in the floor) ────────────────────────────────────────────────────────────────────────
export function placeTrap(f, x) {
  const s = ninjaState(f), T = getNinjaProfile(f).traps; if (!T) return
  s.traps.push({ x: Math.round(Math.max(0, Math.min(stageW(), x))), feet: Math.round(f._rangerFloorY ?? feetY(f)), life: T.life, id: ++s.serial, armed: 0 })
  while (s.traps.length > T.max) s.traps.shift()
  cue(f, 'trapSet')
}
function stepTraps(f, opp, s, p) {
  const T = p.traps || (f._duo && _duo?.traps(f)); if (!T || !s.traps.length) return   // a duo's traps outlive the swap
  for (const t of s.traps) {
    t.life--; t.armed++
    if (opp && opp.health > 0 && grounded(opp) && t.armed > 10 && Math.abs(ctrX(opp) - t.x) < (T.radius || 26) && !(opp.invulnTimer > 0)) {
      t.life = 0; s.stats.trapHits++
      burst(s, 'ring', t.x, t.feet, 18); cue(f, 'trapClick')
      nsStrike(f, opp, T.dmg, { damageType: 'blunt', move: 'nsTrap', unblockable: false, hitstun: 36, kb: 2, knockdown: true, launch: -6, dir: Math.sign(ctrX(opp) - t.x) || 1 })
    }
  }
  s.traps = s.traps.filter(t => t.life > 0)
}

// ── OPTIONAL: REV (run pips) ─────────────────────────────────────────────────────────────────────────────────────
function stepRev(f, s, p) {
  const R = p.rev; if (!R) return
  if (grounded(f) && f._ranger?.running && !f.attacking) {
    s.rev.t++
    if (s.rev.t >= R.every && s.rev.pips < R.max) { s.rev.pips++; s.rev.t = 0; cue(f, 'rev'); burst(s, 'dust', ctrX(f) - (f.facing || 1) * 20, feetY(f), 10) }
    if (s.rev.t % 6 === 0) burst(s, 'dust', ctrX(f) - (f.facing || 1) * 24, feetY(f), 10)
  } else s.rev.t = 0
}
export const revMul = (f, a) => (1 + 0.1 * (a?.nj?.rev || 0)) * (a?.nj?.tag || 1)   // REV pips × the duo's tag bonus (1 for everyone else)

// ── OPTIONAL: WIND FLOAT (hold jump while falling: slow fall, never a climb) ─────────────────────────────────────
function stepFloat(f, s, p, raw) {
  const F = p.float; if (!F) return
  const g = grounded(f)
  if (g) { s.float.used = 0; s.airStreaks = 0 }
  const want = !g && (raw.jump || raw.up) && (f.vy || 0) >= 0 && s.float.used < F.frames && !f.attacking && !(f.hitstun > 0) && !s.streak
  if (want) { s.float.used++; if (f.vy > F.fall) f.vy = F.fall; s.float.on = true }   // vy only ever CAPPED downward: no climb
  else s.float.on = false
  if (s.float.on && !f._forceAction) { f._forceAction = 'airSpin'; f._forceActionBy = 'nsFloat' }
  else if (!s.float.on && f._forceActionBy === 'nsFloat') { f._forceAction = null; f._forceActionBy = null }
}

// ── per-tick: air speed (profile airMul) without stomping slows: base speed is remembered once ──────────────────
function stepAirSpeed(f, s, p) {
  if (p.airMul === 1) return
  if (f._nsBaseSpeed == null) f._nsBaseSpeed = f.speed
  const base = f._nsBaseSpeed, airS = 78 + ((4.5 + (base - 78) / 4) * p.airMul - 4.5) * 4   // physics walk = 4.5 + (speed − 78)/20 × 5
  const want = grounded(f) ? base : airS
  if (f.speed === base || f.speed === airS) f.speed = want
}

// ── MAIN TICK (once per sim frame, before the command layer and updateCombat) ───────────────────────────────────
export function tickNinja(f, opp, raw = {}, W = null) {
  if (f?.rosterKey === 'windrangers' && _duo) { setNinjaWorld(W); _duo.ensure(f) }   // MSV1-MERGE: a path that skipped the round reset
  if (!isNinja(f)) { if (f?._ninja) clearNinja(f); return }
  setNinjaWorld(W)
  { const st = getNinjaProfile(f)?.stats   // the engine's generic stat pass leaves bespoke fighters at 84 / 16 → restore (Robin / Batman / Elastigirl pattern)
    if (st && f.baseSpeed === 84 && f.dashSpeed === 16 && st.speed !== 84) { f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration; f.dashCooldownMax = st.dashCooldownMax; f._nsBaseSpeed = null } }
  const p = getNinjaProfile(f), s = ninjaState(f)
  s.tick++
  const tok = dirToken(raw, f.facing || 1), last = s.dirs[s.dirs.length - 1]
  for (const k of BUTTONS) { const v = !!raw[k]; if (v && !s.prev[k]) { s.edgeAt[k] = s.tick; s.edgeClk[k] = s.clock; s.edgeDir[k] = tok } s.prev[k] = v }
  if (!last || last[0] !== tok) { s.dirs.push([tok, s.tick]); if (s.dirs.length > 24) s.dirs.shift() }
  if (f._duo) _duo?.input(f, raw)   // MSV1-MERGE: the Ben 10 ↓↓ + button detector (sim frames)
  // the Ranger framework: SAME double-tap detector as S.P.D. Red (12-tick window, diagonal rule), blink vetoed
  const r = ensureRangerState(f); if (r) r.blinkVeto = true
  if (f.health > 0) tickRanger(f, opp, raw, W)
  if (f.health <= 0 || f.hitstop > 0) return
  s.clock++
  tickHitDetect(f, opp, s, p)
  tickResources(f, s, p)
  for (let i = s.fx.length - 1; i >= 0; i--) if (--s.fx[i].t <= 0) s.fx.splice(i, 1)
  if (s.chainOpen > 0 && --s.chainOpen === 0) s.chain = 0
  if (s.chainLock > 0) s.chainLock--
  if (s.streak) stepStreak(f, opp, s, p, raw)
  tickRunAfterStreak(f, s, raw)
  if (s.vanish) stepVanish(f, opp, s, p)
  if (s.cloneJob) stepCloneJob(f, opp, s, p)
  tickCloneHurt(f, opp, s)
  if (s.mirror) stepMirror(f, opp, s, p)
  if (s.counter) stepCounter(f, opp, s)
  if (s.barrier) stepBarrier(f, opp, s, p)
  if (s.burrow) stepBurrow(f, opp, s, p, raw)
  stepTraps(f, opp, s, p)
  stepRev(f, s, p)
  stepFloat(f, s, p, raw)
  stepAirSpeed(f, s, p)
  stepShots(f, opp, s)
  stepBounce(f, opp, s)
  stepQuotes(f, opp, s, p)
  if (f._duo) _duo?.tick(f, opp, s)   // MSV1-MERGE: swap request / cooldown / tag bonus timer
  p.ext?.tick?.(f, opp, s, raw, NINJA_API)   // NS CGPT: profile ext (clone / step charges / fault markers); no-op without ext
  if (opp?._nsWallBounce > 0) { opp._nsWallBounce--; const sw = stageW(); if ((opp.x <= 2 || opp.x >= sw - (opp.w || 48) - 2) && opp.vx) { opp.vx = -opp.vx * 0.6; opp.vy = Math.min(opp.vy || 0, -8); opp._nsWallBounce = 0; burst(s, 'hit', ctrX(opp), ctrY(opp)); cue(f, 'impact') } }
  const a = f.attacking ? f.currentAttack : null
  if (a?.nj) runMoveKind(f, opp, s, p, a, raw)
  if (s.sup && (!a || !a.nj || a.nj.kind !== 'super')) s.sup = null
  s.wasGround = grounded(f)
}

// ── NINJA-OWNED SHOTS (illusion echoes etc.: never engine projectiles, so "cannot KO / no chip" is exact) ─────────
export function addShot(f, sh) { const s = ninjaState(f); s.shots.push({ id: ++s.serial, t: 0, ...sh }); if (s.shots.length > 8) s.shots.shift() }
function stepShots(f, opp, s) {
  for (const sh of s.shots) {
    sh.t++; sh.x += sh.vx; sh.y += sh.vy || 0
    if (opp && !sh.hit && overlaps({ x: sh.x - sh.w / 2, y: sh.y - sh.h / 2, w: sh.w, h: sh.h }, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
      sh.hit = true; nsStrike(f, opp, sh.dmg, { pct: sh.pct ?? 1, noKO: !!sh.noKO, noChip: !!sh.noChip, damageType: 'projectile', move: sh.move || 'nsShot', hitstun: 18, meterPct: sh.meterPct ?? 1, dir: Math.sign(sh.vx) || 1 })
    }
  }
  s.shots = s.shots.filter(sh => !sh.hit && sh.t < (sh.life || 90) && sh.x > -100 && sh.x < stageW() + 100)
}

// ── combat.js / physics.js hooks (ninja-gated: false / 1 / null for everyone else) ──────────────────────────────
// Evasion at the overlap test: streak projectile-intangible frames, burrow (only lows / ground hits reach him),
// Shane's Skate Slide (under projectiles), parry window (melee).
export function ninjaEvades(def, ctx = {}) {
  const s = def?._ninja; if (!s || !isNinja(def)) return false
  const p = getNinjaProfile(def)
  if (ctx.proj) {
    if (s.streak) { const t1 = s.streak.t + 1; if (t1 >= p.streak.intangible[0] && t1 <= p.streak.intangible[1]) return true }
    if (isBurrowed(def)) return !ctx.proj.groundHit
    if (def.currentAttack?.nj?.underProjectiles && elapsed(def.currentAttack) < (def.currentAttack.nj.underProjectiles)) return true
    return false
  }
  const atk = ctx.move
  if (isBurrowed(def)) {
    const low = (atk?.hitLevel === 'low') || atk?.groundHit || (ctx.attacker?.rosterKey && ctx.attacker.currentAttack?.groundHit)
    if (!low) return true
    s.burrow = null; if (def.currentAttack?.name === 'nsBurrow') endMove(def)   // dug out: the hit lands
    return false
  }
  if (s.barrier && s.barrier.phase === 'parry' && ctx.attacker && atk) {   // melee parry: the strike is spent, the attacker staggers
    atk.hasHit = true; ctx.attacker.hitstun = Math.max(ctx.attacker.hitstun || 0, 18); s.barrier.parried++
    burst(s, 'parry', ctrX(def), ctrY(def), 12); cue(def, 'parry'); return true
  }
  if (s.barrier && s.barrier.kind === 'armor' && atk && s.barrier.absorbed < p.barrier.absorb) {   // ROCK HOLD: armor absorbs the hit
    atk.hasHit = true; s.barrier.absorbed++; s.stats.absorbed++; burst(s, 'block', ctrX(def), ctrY(def), 10); cue(def, 'absorb'); return true
  }
  return false
}
// physics.js push-apart: a streaking / burrowed / vanishing ninja passes THROUGH the other body
export function ninjaPhasing(a, b) {
  for (const f of [a, b]) { const s = f?._ninja; if (s && (s.streak || isBurrowed(f) || (s.vanish && s.vanish.t > 0))) return true }
  return false
}
// combat.js knockback hook: weight (light 0.85 → flies further, medium 1.0)
export function ninjaKnockback(attacker, defender) { const p = getNinjaProfile(defender); if (p && defender.vx && p.weight !== 1) defender.vx /= p.weight }
// game.js body alpha (render): hidden while underground / gone in the smoke
export function ninjaBodyAlpha(f) {
  const s = f?._ninja; if (!s) return 1
  if (f._duo) { const da = _duo?.alpha(f); if (da != null) return da }   // MSV1-MERGE: inside the swap smoke
  { const ea = getNinjaProfile(f)?.ext?.alpha?.(f); if (ea != null) return ea }   // NS CGPT: inside the clone-swap smoke
  if (isBurrowed(f)) return 0
  if (s.vanish && s.vanish.t > (getNinjaProfile(f)?.vanish?.pop || 6) && s.vanish.t <= (getNinjaProfile(f).vanish.pop + getNinjaProfile(f).vanish.gone)) return 0
  return 1
}
export const ninjaOwnsCharge = f => isNinja(f)   // Charge = the "Teleport" button (Vanish / Mirror / Swap / Barrier / Clones)
export function ninjaSnapshot(f) { return f?._ninja ? { ...f._ninja, fx: undefined, duo: f._duo || undefined } : null }   // duo GAME_STATE rides along (omitted for single-form ninjas)

// API handed to the profile move scripts
export const NINJA_API = { comboScale: f => ninjaComboScale(f), nsStrike, nsStartMove, endMove, setPose, burst, cue, addShot, placeTrap, startCloneJob, gainNP, spendNP, ctrX, ctrY, feetY, overlaps,
  clampX: (f, x) => clampX(f, x), stageW: () => stageW(), hash: (f, slot) => hash(f, slot), world: () => _W, proj: () => _proj, elapsed, endMirror, RANGER_SCREEN }

// ── GENERIC MOVE KINDS (profile data → behaviour; a new ninja needs no new code for these) ─────────────────────────
// md.nj.kind: 'normal' | 'proj' | 'travel' | 'dive' | 'hits' | 'trap' | 'super' + the framework kinds above.
// md.nj.hits: [{ at, dx, dy, w, h, dmg, type, launch, kb, knockdown, hitstun, otg, groundHit }] — scripted single hits
//   (box in front of the body: dx from the leading edge, dy from the feet, both in px).
function scriptedHits(f, opp, s, a, list, t, fixedScale) {
  for (let i = 0; i < list.length; i++) {
    const h = list[i]; if (t !== h.at || a['_h' + i]) continue
    a['_h' + i] = true
    if (!opp) continue
    const fw = f.w || 48, dir = f.facing || 1
    const lead = dir > 0 ? f.x + fw + (h.dx || 0) : f.x - (h.dx || 0) - (h.w || 70)
    const box = h.centered ? { x: ctrX(f) - (h.w || 120) / 2, y: feetY(f) + (h.dy ?? -(f.h || 94)), w: h.w || 120, h: h.h || (f.h || 94) } : { x: lead, y: feetY(f) + (h.dy ?? -(f.h || 94)), w: h.w || 70, h: h.h || (f.h || 94) }
    s.lastBox = box
    if (!overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) continue
    const r = nsStrike(f, opp, h.dmg, { damageType: h.type || 'blunt', move: a.name, launch: h.launch, kb: h.kb, knockdown: h.knockdown, hitstun: h.hitstun || 26, otg: h.otg, revMul: revMul(f, a), fixedScale, locked: a._locked, cue: h.cue })
    if (r === true) { a._contact = true; a.hasHitScripted = true; if (h.bounce) opp._nsBounce = 40 }
    if (r) a._contact = true
  }
}
function fireProj(f, s, a, P, i) {
  if (!_proj) return
  const key = f.rosterKey, spr = P.sprite, dir = f.facing || 1
  const ang = (P.angles ? P.angles[i] : P.angle || 0) * Math.PI / 180
  const vx = dir * P.speed * Math.cos(ang), vy = P.speed * Math.sin(ang)
  const sc = P.scale || 2.4, w = (P.w || 30), h = (P.h || 20)
  const md = { damage: P.dmg * revMul(f, a), speed: P.speed, vx, vy, spawnX: ctrX(f) + dir * (P.ox || 40), spawnY: feetY(f) - (P.oy ?? 58),
    w, h, radius: P.radius || 22, lifetime: P.life || Math.ceil(RANGER_SCREEN / P.speed) + 4, hitstun: P.hitstun || 18, knockbackX: P.kb ?? 3, knockbackY: 0,
    color: getNinjaProfile(f).color, isSpecial: true, category: 'special', hitFlag: '_nsShotHit',
    sheet: `${f._nsAssetDir || './assets/' + key}/${spr}.png`, spriteFrames: P.frames || 1, spriteW: P.sw, spriteH: P.sh, spriteScale: sc }
  const pr = _proj.spawn(f, P.name || 'nsShot', md)
  if (pr) { pr.damageType = P.type || 'projectile'; if (P.groundHit) pr.groundHit = true }
  cue(f, P.cue || 'shot')
  // Wind Mirage ECHO: the illusion throws the same shot 8 frames later from its own spot (ninja-owned: 50%, no chip, no KO)
  const m = s.mirror, M = getNinjaProfile(f).mirror
  if (m && M.mode === 'echo') (m.shotQ ||= []).push({ at: s.clock + M.echoDelay, vx, vy, dmg: P.dmg, oy: P.oy ?? 58, ox: P.ox || 40, w, h, sprite: spr, dir })
}
function runMoveKind(f, opp, s, p, a, raw) {
  const g = a.nj, t = elapsed(a), md = p.moves[a.name] || (f._duo && _duo?.moves[a.name]) || {}
  if (g.hits) scriptedHits(f, opp, s, a, g.hits, t, g.fixedScale)
  if (g.selfVy != null && t === (g.riseAt ?? md.startup)) { f.vy = g.selfVy; f.onGround = false; f.grounded = false; f.y -= 2 }
  switch (g.kind) {
    case 'proj': {
      const P = (!grounded(f) && g.airProj) ? g.airProj : g.proj
      const n = P.count || 1
      for (let i = 0; i < n; i++) if (t === (P.at ?? md.startup) + i * (P.gap || 0) && !a['_f' + i]) { a['_f' + i] = true; fireProj(f, s, a, P, i) }
      if (g.trap && t === (P.at ?? md.startup) && !a._trap) { a._trap = true; placeTrap(f, ctrX(f) + (f.facing || 1) * (g.trap.dist || 240)) }
      if (!grounded(f)) f.vy = Math.min(f.vy || 0, 1.5)   // air throws / beams hang a moment
      break
    }
    case 'trap':
      if (t === md.startup && !a._trap) { a._trap = true; placeTrap(f, ctrX(f) + (f.facing || 1) * (g.dist || 240)); burst(s, 'kunai', ctrX(f) + (f.facing || 1) * (g.dist || 240), f._rangerFloorY ?? feetY(f), 10) }
      break
    case 'travel': {   // tornado / slide: the body travels `dist` of the screen over `frames`, multi-hit on its way
      if (t === md.startup && !a._go) {
        a._go = true
        a._vy = 0
        if (g.airAngle && !grounded(f)) { const v = raw.up ? -1 : raw.down ? 1 : 0; a._vy = v * Math.tan(30 * Math.PI / 180) }   // 0 / ±30° held
      }
      if (t >= md.startup && t < md.startup + g.frames) {
        const per = RANGER_SCREEN * g.dist / g.frames
        f.x = clampX(f, f.x + g.dir * per); f.vx = 0
        if (!grounded(f) || a._vy) { const floor = (f._rangerFloorY ?? feetY(f)) - (f.h || 94); f.y = Math.min(floor, f.y + (a._vy || 0) * per); f.vy = 0 }
        const k = t - md.startup
        if (g.multi && k % g.multi.every === 0 && (a._mh || 0) < g.multi.n && opp) {
          a._mh = (a._mh || 0) + 1
          const box = { x: f.x - 20, y: f.y - 10, w: (f.w || 48) + 40, h: (f.h || 94) + 20 }
          if (overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
            const last = a._mh === g.multi.n
            nsStrike(f, opp, g.multi.dmg, { damageType: g.multi.type || 'energy', move: a.name, hitstun: 26, kb: last ? 6 : 1, launch: last ? g.multi.launch : -2, revMul: revMul(f, a), locked: !!a._mlock, cue: g.multi.cue })
            if (!opp.isBlocking) a._mlock = true
            a._contact = true
          }
        }
        // a locked (unblocked) drill CARRIES the foe in front of it for the rest of the travel (every hit lands, full distance)
        if (a._mlock && g.multi && g.carry !== false && opp && opp.health > 0) {
          const ow = opp.w || 48, fw = f.w || 48
          opp.x = clampX(opp, g.dir > 0 ? f.x + fw + 2 : f.x - ow - 2); opp.vx = 0
          if (Math.abs(opp.x - (g.dir > 0 ? f.x + fw + 2 : f.x - ow - 2)) > 1) f.x = clampX(f, g.dir > 0 ? opp.x - fw - 2 : opp.x + ow + 2)   // pinned on a wall
          if (a._vy) { opp.y = Math.min(opp.y, f.y); opp.vy = 0 }
        }
        if (k % 4 === 0) burst(s, g.trail || 'dust', ctrX(f), feetY(f), 10, { dir: g.dir })
      }
      break
    }
    case 'dive': {   // Hawk Dive / Ground Pound: fall until the floor, then land (bounce / shockwave)
      if (t < md.startup) { f.vx = 0; f.vy = 0; break }
      if (!a._landed) {
        if (grounded(f) && t > md.startup) {
          a._landed = true; a.timer = Math.min(a.timer, g.landRec || 14); setPose(f, g.landPose || 'landRecover')
          burst(s, g.shock ? 'ring' : 'dust', ctrX(f), feetY(f), 18); cue(f, g.shock ? 'eruption' : 'land')
          if (g.shock && opp) {
            const S = g.shock
            if (Math.abs(ctrX(opp) - ctrX(f)) <= S.radius && (grounded(opp) || opp.knockdownState) ) nsStrike(f, opp, S.dmg, { damageType: 'blunt', move: a.name, hitstun: 30, kb: 7, launch: -9, otg: true, revMul: revMul(f, a) })
          }
        } else { f.vx = g.dir * (g.vx || 0); f.vy = g.vy || 14; a.timer = Math.max(a.timer, 6) }
      }
      break
    }
    case 'super': { const fn = p.supers[a.name] || (f._duo && _duo?.supers[a.name]); if (fn) fn(f, opp, s, a, t, NINJA_API); break }
    default: if (f._duo) _duo?.run(f, opp, s, a, t)   // MSV1-MERGE: duo move kinds (the swap)
      else p.ext?.run?.(f, opp, s, a, t, NINJA_API)   // NS CGPT: profile ext move kinds
  }
}
// Hawk Dive ground bounce: the spiked foe bounces once off the floor (combo extender)
function stepBounce(f, opp, s) {
  if (opp && opp._nsBounce > 0) { opp._nsBounce--; if (grounded(opp) && (opp.hitstun || 0) > 0) { opp.vy = -12; opp.onGround = false; opp.grounded = false; opp.y -= 2; opp.hitstun = Math.max(opp.hitstun, 30); opp._nsBounce = 0; burst(s, 'dust', ctrX(opp), feetY(opp), 14); cue(f, 'impact') } }
}

// ── text bubbles (presentation timing on the sim clock; f._nsBubble is read by nsFx only, never by the sim) ───────
function say(f, text, max = 120) { f._nsBubble = { text, t: max, max } }
function stepQuotes(f, opp, s, p) {
  const Q = p.quotes; if (f._nsBubble && f._nsBubble.t > 0) f._nsBubble.t--
  if (!Q) return
  if (s.clock === 1) {   // round start: the morph call, or a match-up line
    const vs = opp && Q.vs?.[opp.rosterKey]
    if (vs && !vs.reply) say(f, vs.line); else if (!vs && !(f._nsBubble?.t > 0)) say(f, Q.intro)   // the intro call stays up from the round reset; a reply line waits for its cue
    if (vs?.reply) s.replyAt = vs.reply
  }
  if (s.replyAt && s.clock === s.replyAt) { const vs = Q.vs[opp?.rosterKey]; if (vs) say(f, vs.line); s.replyAt = 0 }
  if (!s.wonSaid && opp && !(opp.health > 0) && f.health > 0) { s.wonSaid = true; say(f, Q.win, 150) }
}

// ── CPU vs the NINJA MIRROR (no cheating): the CPU never reads the hidden identity. Each Mirror / swap it makes ONE
// guess: with the difficulty's chance it reads THE TELL (the shadow / glint both players see → the real body),
// otherwise a hash picks one of the two spots. It then fights the body it believes in (a perceived proxy at that spot).
export const NINJA_AI_TELL = { dummy: 0, easy: 0.20, normal: 0.45, adaptive: 0.45, hard: 0.70, impossible: 0.70 }
export function ninjaAiPerceive(ai, opp, difficulty = 'easy') {
  const s = opp?._ninja, m = s?.mirror
  if (!m || !isNinja(opp) || !ai) return opp
  const key = m.n * 16 + m.swaps
  let g = ai._nsGuess
  if (!g || g.key !== key || g.who !== pidx(opp)) {
    const rate = NINJA_AI_TELL[difficulty] ?? NINJA_AI_TELL.easy
    const tell = hash(opp, 200 + pidx(ai) * 7 + (key % 97)) < rate
    const real = tell || hash(opp, 300 + pidx(ai) * 7 + (key % 97)) < 0.5
    g = ai._nsGuess = { key, who: pidx(opp), tell, real }
  }
  if (g.real || m.swap) return opp
  const h = opp.h || 94
  return { ...opp, x: m.ix, y: m.ifeet - h, vx: 0, vy: 0, _nsPerceived: true }
}
