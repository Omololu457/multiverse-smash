// upgrade.js — UPGRADE (Galvanic Mechamorph), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// Registry / pool key `upgrade_ov`: the experimental `upgrade` entry (its legacy kit, its own animation table in fighters.js
// and the Ben 10 harnesses that exercise it) is left untouched; production players only ever see this READY Upgrade.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (circuit lines,
// network cage, pulse rings, glints, glitch static, shake) never write it. Simulation randomness: hash(match seed, frame,
// player index) only. Sheet by Dragonrod (docs/ben10/aliens/upgrade/SPRITE_LEDGER.md).
import { UPGRADE_ANIM, UPGRADE_OC_ANIM, UPGRADE_FX, UPGRADE_GEOM, UPGRADE_ALT_PAL } from "./upgradeAssets.js"
export { UPGRADE_ANIM, UPGRADE_OC_ANIM, UPGRADE_FX, UPGRADE_GEOM, UPGRADE_ALT_PAL }

export const UP_KEY = "upgrade_ov"
const ANIM = { ...UPGRADE_ANIM }
const OC_ANIM = { ...UPGRADE_OC_ANIM }
export const UP_FRAMESETS = { normal: ANIM, overclock: OC_ANIM }   // the live tables the OVERCLOCK palette swap toggles between

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const UPGRADE = {
  id: UP_KEY, poolKey: UP_KEY, displayName: "Upgrade", slot: 15,
  status: "ready", sheetPath: "./ben10_upgrade_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/upgrade/SPRITE_LEDGER.md",
  mods: { speed: 1.00, damage: 1.00, defense: 0.95, weight: 0.85 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Zap Bolt", special2: "Tendril Lash", special3: "Goo Dive", special4: "Deploy Terminal",
    special5: "Merge", special6: "Tendril Rise", special7: "Spear Dive", ultimate: "System Takeover" },
  basic_attacks: {
    light:  normal(18, 5, 3, 10, 0, { rangeX: 100 }),                                         // attack f1–2
    heavy:  normal(52, 14, 4, 22, -6, { knockbackX: 7, rangeX: 180, upArm: true }),          // attack → f1–5, stretched arm 180 px
    down:   normal(24, 7, 3, 15, -4, { hitLevel: "low", rangeX: 130 }),                       // crouch + low whip, hits low
    up:     normal(46, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // attack ↑ f1–4 rising tendril arc
    air:    normal(28, 7, 4, 11, 2)                                                           // fall frame + whip
  },
  anim: ANIM, fx: UPGRADE_FX,
  onApply, tick, moveFrames, hurtbox, evade, fireSpecial, fireUltimate, damageDealt, onContact, targetOffset,
  drainMult: f => drainMultOf(f),
  drawHud: drawUpgradeHud, drawFx: drawUpgradeFx, drawUnder: drawUpgradeUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshUpgradeState() {
  return { kind: UP_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 },
    term: null, termSeq: 0, termCast: null, lastTerm: null,
    oc: { t: 0, cdT: 0, lockT: 0, count: 0 }, merge: null, boostCasts: [],
    virus: { pips: 0, pipT: 0, pipped: [], crashT: 0, immuneT: 0, cap: null, crashes: 0, lastGain: 0 },
    zap: null, lash: null, dive: null, rise: null, spear: null, spearUsed: false, landT: -999,
    ult: null, lastUltRaw: 0, lastUltSpots: [], lastUltCrash: false,
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0, terminals: 0, termEnds: { expired: 0, destroyed: 0, replaced: 0, merged: 0 }, pulses: 0, extraPulses: 0, boosted: 0,
      merges: 0, mergeRejects: 0, overclocks: 0, pips: 0, crashes: 0, zaps: 0, lashes: 0, dives: 0, rises: 0, spears: 0, ults: 0, evaded: 0 } }
}
export const upState = f => (f?.omnitrix?.formState?.kind === UP_KEY && f.transformed && f.activeAlien === UP_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshUpgradeState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
}

const cx = o => o.x + (o.w || 60) / 2
let projRef = null   // the engine's live projectile list (render reads it; never written by render)
const grounded = f => !!(f && (f.onGround || f.grounded))
export const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export const projBox = p => { const pw = p.w || (p.radius || 10) * 2, ph = p.h || (p.radius || 10) * 2; return { x: p.x - pw / 2, y: p.y - ph / 2, w: pw, h: ph } }
export const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || p.move || "")))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function upHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = upState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference for the render
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  input = input || {}
  tickInputs(f, s, input)
  if (grounded(f)) s.spearUsed = false                                     // Spear Dive: once per airtime
  tickTerminal(f, s, api, opp)                                            // before the cast: a terminal planted this frame starts at t 0
  tickTermCast(f, s)
  tickMerge(f, s)
  tickVirus(f, s, opp)
  tickZap(f, s, api)
  tickZapBoost(f, s, api, opp)
  tickLash(f, s, api)
  tickDive(f, s, input, api)
  tickRise(f, s, api)
  tickSpear(f, s, api)
  tickUlt(f, s, opp, api, ctx)
  //@@TICK@@
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const busy = s => !!(s.termCast || s.merge || s.zap || s.lash || s.dive || s.rise || s.spear || s.ult)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = upState(f); if (!s) return md; return busy(s) ? false : md }

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins,
// ties by specificity:
//   ↓↘→ + P (236) ZAP BOLT          ↓↙← + P (214) GOO DIVE          →→ + P (a frame-counted double tap) TENDRIL LASH
//   ←↙↓ + P (412) DEPLOY TERMINAL   →↓↘ + P (623) MERGE (an ONLINE Terminal within 100 px) / TENDRIL RISE (none near)
//   air: any + P SPEAR DIVE (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / → Zap Bolt (→ after a
// double tap = Tendril Lash), ← Goo Dive, ↓ Deploy Terminal, ↑ Merge / Tendril Rise.
export const UP_DASH_WINDOW = 14, UP_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= UP_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "merge"], ["412", "terminal"], ["214", "dive"], ["236", "zap"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= UP_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "spear"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "dive"
  if (dir === "D") return "terminal"
  if (dir === "U") return "merge"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= UP_DASH_WINDOW) return "lash"
  return "zap"
}

// ── SPECIALS (dispatch) ─────────────────────────────────────────────────────────────────
export const UP_COST = { zap: 10, lash: 12, dive: 10, terminal: 14, merge: 10, rise: 10, spear: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = upState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === UP_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)

// ── TERMINAL (←↙↓ + P, cost 14) ──────────────────────────────────────────────────────────────────────────────
// One per owner (a new one replaces the old). Crouch cast: 20f startup, then the terminal is planted 120 px ahead on the
// ground he stands on (stage-clamped = legal ground). BOOT 60f (the 10 extracted terminal frames, a visible telegraph, no
// hitbox), then ONLINE 300f, then it shuts down and is removed. NOT solid: a gameplay object with a HURTBOX only (30 HP —
// destroyed by any opponent hit, melee or projectile; no refund), never a floor / wall change, never traps anyone.
// ONLINE PULSE: every 90f it fires a small pulse at the opponent's position AT FIRE TIME (a straight shot, no tracking),
// 12 dmg, one on screen, blockable, can't KO (damageDealt caps it), no Virus pip. Plain data in formState; destroyed /
// consumed atomically through ONE gate (`endTerminal`), so no double events. Swap / revert / KO / rematch clear formState.
export const UP_TERM = { COST: 14, STARTUP: 20, TOTAL: 32, DIST: 120, BOOT: 60, ONLINE: 300, HP: 30, EVERY: 90, PULSE: 12,
  PULSE_SPEED: 9, PULSE_RANGE: 700, PULSE_R: 9, W: 70, H: 80, SCREEN_Y: 0.72, LINGER: 14 }
export const termBox = w => ({ x: w.x - UP_TERM.W / 2, y: w.y - UP_TERM.H, w: UP_TERM.W, h: UP_TERM.H })
export const termLive = s => !!(s && s.term && !s.term.gone)
export const termOnline = s => termLive(s) && s.term.t >= UP_TERM.BOOT
function castTerminal(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "upDeploy", UP_COST.terminal, UP_TERM.TOTAL); if (!c) return false
  s.termCast = { t: 0, cast: c.cast }
  return true
}
CASTS.terminal = castTerminal
function tickTermCast(f, s) {
  const c = s.termCast; if (!c) return
  c.t++
  if ((f.hitstun || 0) > 0) { s.termCast = null; return }                  // knocked out before 20f: no terminal (Power spent)
  if (c.t === UP_TERM.STARTUP) placeTerminal(f, s, c.cast)
  f._spriteCastMove = "upDeploy"; f._spriteCastTimer = Math.max(2, UP_TERM.TOTAL - c.t)
  if (c.t >= UP_TERM.TOTAL) s.termCast = null
}
function placeTerminal(f, s, cast) {
  if (termLive(s)) endTerminal(s, "replaced")
  const face = f.facing || 1
  const x = Math.max(s.stage.L + 40, Math.min(s.stage.R - 40, Math.round(cx(f) + face * UP_TERM.DIST)))
  s.term = { id: ++s.termSeq, x, y: f.y + (f.h || 110), t: 0, hp: UP_TERM.HP, gone: false, by: null, ct: 0, pulses: 0, cast }
  s.stats.terminals++
}
// the ONE removal gate: returns false if it was already gone (a second hit / merge the same frame does nothing)
export function endTerminal(s, by) {
  const w = s.term; if (!w || w.gone) return false
  w.gone = true; w.by = by; w.ct = UP_TERM.LINGER
  s.stats.termEnds[by] = (s.stats.termEnds[by] || 0) + 1
  s.lastTerm = { id: w.id, by, t: w.t, pulses: w.pulses }
  return true
}
const ownPulses = (f, api) => api ? api.activeProjectiles().filter(p => p && p.owner === f && p.alien && p.alien.up === "pulse") : []
function firePulse(f, s, api, opp, extra = false) {
  const w = s.term; if (!w || !opp || opp.eliminated || !api) return false
  if (!extra && ownPulses(f, api).length) return false                      // one (regular) pulse on screen
  const ox = w.x, oy = w.y - UP_TERM.H * UP_TERM.SCREEN_Y
  const tx = cx(opp), ty = opp.y + (opp.h || 110) * 0.5                      // the opponent's position AT FIRE TIME
  const dx = tx - ox, dy = ty - oy, d = Math.max(1, Math.hypot(dx, dy))
  const vx = dx / d * UP_TERM.PULSE_SPEED, vy = dy / d * UP_TERM.PULSE_SPEED, face = vx >= 0 ? 1 : -1
  hitbox(f, api, "up_pulse", face, { damage: UP_TERM.PULSE, vx: Math.abs(vx) < 0.01 ? face * 0.01 : vx, vy, speed: UP_TERM.PULSE_SPEED,
    spawnX: ox, spawnY: oy, w: UP_TERM.PULSE_R * 2, h: UP_TERM.PULSE_R * 2, lifetime: Math.round(UP_TERM.PULSE_RANGE / UP_TERM.PULSE_SPEED),
    hitstun: 12, blockstun: 8, knockbackX: 1, knockbackY: 0, alien: { up: "pulse", pip: false, term: w.id, extra } })
  w.pulses++; if (extra) s.stats.extraPulses++; else s.stats.pulses++
  return true
}
const enemyShot = (f, p) => !!p && p.owner !== f && !p.visualOnly
function tickTerminal(f, s, api, opp) {
  const w = s.term; if (!w) return
  if (w.gone) { if (--w.ct <= 0) s.term = null; return }
  w.t++
  if (w.t >= UP_TERM.BOOT + UP_TERM.ONLINE) { endTerminal(s, "expired"); return }   // shuts down
  // the OPPONENT can destroy it: their active melee box (the engine's own geometry) or any of their projectiles touching it
  const box = termBox(w)
  if (opp && opp.attacking && opp.currentAttack && api && api.getAttackHitbox && api.attackIsActive && api.attackIsActive(opp.currentAttack)) {
    const hb = api.getAttackHitbox(opp)
    if (hb && overlap(hb, box)) { w.hp = 0; endTerminal(s, "destroyed"); return }
  }
  if (api && api.activeProjectiles) { const L = api.activeProjectiles()
    for (let k = L.length - 1; k >= 0; k--) { const p = L[k]
      if (enemyShot(f, p) && overlap(projBox(p), box)) {
        w.hp = Math.max(0, w.hp - Math.max(1, p.damage || 1)); if (!isBeam(p)) L.splice(k, 1)   // the shot is spent on it (beams pass)
        endTerminal(s, "destroyed"); return } } }
  const ot = w.t - UP_TERM.BOOT
  if (ot > 0 && ot % UP_TERM.EVERY === 0) firePulse(f, s, api, opp)
}

// ── MERGE (→↓↘ + P, cost 10) → OVERCLOCK ──────────────────────────────────────────────────────────────────────
// Only when his ONLINE Terminal is within 100 px (centre to terminal): the Merge frame for 20f, the Terminal is CONSUMED at
// the start (atomic, through endTerminal), then OVERCLOCK 240f: speed ×1.20, damage ×1.15 (damageDealt), Zap Bolt becomes a
// 2-hit piercing bolt, the ALT PAL palette (render-only frame-set swap; the flag lives in formState). Then a 60f COOLDOWN:
// Power drain +50% (drainMult), no Merge. Once per 900f (from the Merge). formState is cleared on swap / revert / KO / rematch.
// Routing: →↓↘ + P with NO Terminal within 100 px is TENDRIL RISE (Phase 6). With one within 100 px that can't merge yet
// (still booting, Overclocked, cooling down, inside the 900f lock) the Merge is REJECTED at no cost.
export const UP_MERGE = { COST: 10, RANGE: 100, FRAMES: 20, OC: 240, CD: 60, LOCK: 900, SPEED: 1.20, DMG: 1.15, DRAIN_CD: 1.5 }
export const overclocked = s => !!s && s.oc.t > 0
export const termNear = (f, s) => termLive(s) && Math.abs(cx(f) - s.term.x) <= UP_MERGE.RANGE
export function canMerge(f, s) { return termOnline(s) && termNear(f, s) && s.oc.t <= 0 && s.oc.cdT <= 0 && s.oc.lockT <= 0 }
function castMerge(f, s, api, ctx) {
  if (!termNear(f, s)) return CASTS.rise ? CASTS.rise(f, s, api, ctx) : false     // no Terminal near → Tendril Rise
  if (!grounded(f) || !canMerge(f, s) || !canAct(f, s)) { s.stats.mergeRejects++; return false }   // rejected at no cost
  const c = beginCast(f, s, api, "upMerge", UP_COST.merge, UP_MERGE.FRAMES); if (!c) { s.stats.mergeRejects++; return false }
  endTerminal(s, "merged")                                                   // consumed (atomic: one gate)
  s.merge = { t: 0, cast: c.cast, x: s.term ? s.term.x : cx(f) }
  s.oc.lockT = UP_MERGE.LOCK; s.stats.merges++
  return true
}
CASTS.merge = castMerge
function tickMerge(f, s) {
  const o = s.oc                                                            // count down first: an Overclock starting this frame keeps its full 240f
  if (o.lockT > 0) o.lockT--
  if (o.t > 0) { if (--o.t === 0) o.cdT = UP_MERGE.CD }
  else if (o.cdT > 0) o.cdT--
  const m = s.merge
  if (m) {
    m.t++
    if ((f.hitstun || 0) > 0) s.merge = null                                 // hit out of the Merge: Terminal already spent, no Overclock
    else {
      f._spriteCastMove = "upMerge"; f._spriteCastTimer = Math.max(2, UP_MERGE.FRAMES - m.t)
      if (m.t >= UP_MERGE.FRAMES) { s.merge = null; s.oc.t = UP_MERGE.OC; s.oc.count++; s.stats.overclocks++ }
    }
  }
  if (s.baseSpeed != null) { const k = o.t > 0 ? UP_MERGE.SPEED : 1; f._benWalkSpeed = s.baseSpeed * k; if (s.baseDash != null) f.dashSpeed = s.baseDash * k }
  const want = o.t > 0 ? OC_ANIM : ANIM                                     // render-only frame-set swap (ALT PAL)
  if (f._skinAnim !== want) f._skinAnim = want
}

// ── VIRUS pips → CRASH (a status on the OPPONENT, owned by this form's GAME_STATE) ────────────────────────────────
// Clean hits (not blocked) from Zap Bolt, Tendril Lash's finisher and Tendril Rise add ONE pip per cast (proj tag
// `alien.pip`, counted once per cast id), max 3; the pips expire 240f after the last one. No pips from blocks, FX, Terminal
// pulses or the ult's render copies. 3 pips → CRASH 180f: the opponent gains no Power / meter (every gain is clamped back by
// this form's tick — meter is `energy` in this engine; spending still works) and immediately loses 15 Power, which Upgrade
// gains (the amount actually lost). No refresh while active (pips can't build), then 360f immunity. Nothing polls the
// opponent's inputs or touches any clock. Static lines on the opponent are render-only.
export const UP_VIRUS = { MAX: 3, EXPIRE: 240, CRASH: 180, STEAL: 15, IMMUNE: 360 }
export const crashed = s => !!s && s.virus.crashT > 0
export function addPip(f, s, cast) {
  const v = s.virus
  if (v.crashT > 0 || v.immuneT > 0) return false                          // no refresh while active / immune afterwards
  if (cast != null) { if (v.pipped.includes(cast)) return false; v.pipped.push(cast); if (v.pipped.length > 8) v.pipped.shift() }
  v.pips = Math.min(UP_VIRUS.MAX, v.pips + 1); v.pipT = UP_VIRUS.EXPIRE; s.stats.pips++
  return true
}
// CRASH: returns true if it started (3 pips, not immune). Used by the pip path and the ult's end beat.
export function startCrash(f, s, opp) {
  const v = s.virus
  if (!opp || v.crashT > 0 || v.immuneT > 0) return false
  v.pips = 0; v.pipT = 0; v.crashT = UP_VIRUS.CRASH; v.crashes++; s.stats.crashes++
  const before = opp.energy || 0, after = Math.max(0, before - UP_VIRUS.STEAL), lost = before - after
  opp.energy = after; v.cap = after; v.lastGain = lost
  f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + lost)
  return true
}
function tickVirus(f, s, opp) {
  const v = s.virus
  if (v.crashT > 0) {
    if (opp) { const e = opp.energy || 0; if (v.cap == null || e < v.cap) v.cap = e; else if (e > v.cap) opp.energy = v.cap }   // no Power gain
    if (--v.crashT === 0) { v.immuneT = UP_VIRUS.IMMUNE; v.cap = null }
  } else if (v.immuneT > 0) v.immuneT--
  if (v.pips > 0 && v.crashT <= 0) { if (--v.pipT <= 0) { v.pips = 0; v.pipT = 0 } }
  if (v.pips >= UP_VIRUS.MAX) startCrash(f, s, opp)
}

// ── 6. MOVES ──────────────────────────────────────────────────────────────────────────────────────────────────
const armEdge = (f, face) => cx(f) + face * (f.w || 60) / 2
// ZAP BOLT (↓↘→ + P, 10) — the extracted bolt: 480 px, 40 dmg, one on screen, a clean hit +1 Virus pip. A bolt passing through his
// ONLINE Terminal is boosted +10 ONCE per cast (atomic: one flag per cast) and the Terminal fires an extra pulse. OVERCLOCKED: a
// 2-hit piercing bolt (two piercing bolts 6f apart, 22 each, one pip per cast).
export const UP_ZAP = { STARTUP: 12, RECOVERY: 18, DMG: 40, SPEED: 16, RANGE: 480, W: 44, H: 18, ARM_Y: 0.36, BOOST: 10, OC_DMG: 22, OC_GAP: 6 }
UP_ZAP.TOTAL = UP_ZAP.STARTUP + UP_ZAP.RECOVERY
const ownZaps = (f, api) => api ? api.activeProjectiles().filter(p => p && p.owner === f && p.alien && p.alien.up === "zap") : []
function castZap(f, s, api) {
  if (ownZaps(f, api).length) return false                                  // one on screen
  const c = beginCast(f, s, api, "upZap", UP_COST.zap, UP_ZAP.TOTAL); if (!c) return false
  s.zap = { t: 0, cast: c.cast, face: f.facing || 1, oc: overclocked(s), boosted: false }; s.stats.zaps++
  return true
}
CASTS.zap = castZap
function spawnZap(f, s, api, d, k) {
  const L = Math.round(UP_ZAP.RANGE / UP_ZAP.SPEED)
  hitbox(f, api, "up_zap", d.face, { damage: d.oc ? UP_ZAP.OC_DMG : UP_ZAP.DMG, vx: d.face * UP_ZAP.SPEED, speed: UP_ZAP.SPEED,
    spawnX: armEdge(f, d.face) + d.face * UP_ZAP.W / 2, spawnY: f.y + (f.h || 110) * UP_ZAP.ARM_Y, w: UP_ZAP.W, h: UP_ZAP.H, lifetime: L,
    hitstun: 20, blockstun: 10, knockbackX: 2, knockbackY: -1, ...(d.oc ? { piercesMulti: true } : {}),
    alien: { up: "zap", pip: true, cast: d.cast, k, oc: d.oc } })
}
function tickZap(f, s, api) {
  const d = s.zap; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.zap = null; return }
  if (d.t === UP_ZAP.STARTUP) spawnZap(f, s, api, d, 0)
  if (d.oc && d.t === UP_ZAP.STARTUP + UP_ZAP.OC_GAP) spawnZap(f, s, api, d, 1)
  f._spriteCastMove = "upZap"; f._spriteCastTimer = Math.max(2, UP_ZAP.TOTAL - d.t)
  if (d.t >= UP_ZAP.TOTAL) s.zap = null
}
// a bolt crossing the ONLINE terminal: +10 once per cast + one extra pulse (runs every frame; the per-cast flag makes it atomic)
const boostedCasts = s => s.boostCasts
function tickZapBoost(f, s, api, opp) {
  if (!termOnline(s) || !api) return
  const box = termBox(s.term)
  for (const p of ownZaps(f, api)) {
    const cast = p.alien.cast; if (boostedCasts(s).includes(cast) || !overlap(projBox(p), box)) continue
    boostedCasts(s).push(cast); if (boostedCasts(s).length > 8) boostedCasts(s).shift()
    for (const q of ownZaps(f, api)) if (q.alien.cast === cast) { q.damage = (q.damage || 0) + (q === p ? UP_ZAP.BOOST : 0); q.alien.boosted = true }
    s.stats.boosted++
    firePulse(f, s, api, opp, true)
  }
}

// TENDRIL LASH (→→ + P, 12) — 14f startup, a 340 px tendril, 2 hits 20 / 28, −12 on block, 22f recovery after the last hit (whiff-
// punishable: the tendril is part of his hurtbox while it is out). The finisher's clean hit +1 Virus pip.
export const UP_LASH = { HITS_AT: [14, 18], DMG: [20, 28], REACH: 340, EXT_FROM: 6, FULL_AT: 14, HOLD_TO: 20, RETRACT_TO: 28, RECOVERY: 22,
  ON_BLOCK: -12, H: 30, ARM_Y: 0.34 }
UP_LASH.TOTAL = UP_LASH.HITS_AT[1] + 2 + UP_LASH.RECOVERY
export function lashExt(t, reach = UP_LASH.REACH) {
  const L = UP_LASH
  if (t < L.EXT_FROM) return 0
  if (t <= L.FULL_AT) return reach * (t - L.EXT_FROM) / (L.FULL_AT - L.EXT_FROM)
  if (t <= L.HOLD_TO) return reach
  if (t <= L.RETRACT_TO) return reach * (L.RETRACT_TO - t) / (L.RETRACT_TO - L.HOLD_TO)
  return 0
}
function castLash(f, s, api) {
  const c = beginCast(f, s, api, "upLash", UP_COST.lash, UP_LASH.TOTAL); if (!c) return false
  s.lash = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.lashes++
  return true
}
CASTS.lash = castLash
function tickLash(f, s, api) {
  const w = s.lash; if (!w) return
  w.t++
  if ((f.hitstun || 0) > 0) { s.lash = null; return }
  const k = UP_LASH.HITS_AT.indexOf(w.t)
  if (k >= 0) { const last = k === UP_LASH.HITS_AT.length - 1, rem = UP_LASH.TOTAL - w.t, ext = lashExt(w.t), edge = armEdge(f, w.face)
    hitbox(f, api, "up_lash", w.face, { damage: UP_LASH.DMG[k], spawnX: edge + w.face * ext / 2, spawnY: f.y + (f.h || 110) * UP_LASH.ARM_Y + 10,
      w: ext, h: UP_LASH.H, lifetime: 2, hitstun: last ? rem + 8 : 16, blockstun: last ? blockstunFor(rem, UP_LASH.ON_BLOCK) : 12, noHitstop: !last,
      knockbackX: last ? 6 : 0.4, knockbackY: last ? -3 : 0, alien: { up: "lash", pip: last, cast: w.cast } }) }
  f._spriteCastMove = "upLash"; f._spriteCastTimer = Math.max(2, UP_LASH.TOTAL - w.t)
  if (w.t >= UP_LASH.TOTAL) s.lash = null
}

// GOO DIVE (↓↙← + P, 10) — MELT 6f, then a puddle that slides (← / →) at speed 6 for up to 120f while Special is HELD. Low profile:
// high / mid melee and every projectile miss his body (evade hook); a LOW melee move still hits; no invulnerability. He can't
// attack in it except by exiting. Drains 3 Power/s. RELEASE Special → REFORM (12f, punishable); P → TENDRIL RISE (a fresh
// Special press inside the first 6f of the reform, or the Light / Attack button while melted) — the Rise out of the dive is
// already paid for (no extra cost). 120f / no Power → reform. Knocked out (hitstun) → he simply reforms instantly.
export const UP_DIVE = { MELT: 6, SPEED: 6, MAX: 120, DRAIN_PER_S: 3, REFORM: 12, RISE_WINDOW: 6 }
function castDive(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "upMelt", UP_COST.dive, 2); if (!c) return false
  s.dive = { phase: "melt", t: 0, pt: 0, cast: c.cast, lightPrev: true }; s.stats.dives++
  hold(f, 2)
  return true
}
CASTS.dive = castDive
function hold(f, n) { f._benPowerCommit = Math.max(f._benPowerCommit || 0, n); f.attackCooldown = Math.max(f.attackCooldown || 0, n) }
function tickDive(f, s, input, api) {
  const d = s.dive; if (!d) return
  if ((f.hitstun || 0) > 0 || (f.health || 0) <= 0) { s.dive = null; f._spriteCastMove = null; f._spriteCastTimer = 0; return }
  d.pt++; f.vx = 0
  if (d.phase === "melt") {
    hold(f, 2); f._spriteCastMove = "upMelt"; f._spriteCastTimer = 2
    if (d.pt >= UP_DIVE.MELT) { d.phase = "slide"; d.t = 0 }
    return
  }
  const pressP = !!input.special && !s.spPrev, pressL = !!input.light && !d.lightPrev
  d.lightPrev = !!input.light
  if (d.phase === "reform") {
    if (pressP && d.pt <= UP_DIVE.RISE_WINDOW) { s.dive = null; startRise(f, s, api, true); return }
    f._spriteCastMove = "upReform"; f._spriteCastTimer = 2
    if (d.pt >= UP_DIVE.REFORM) { s.dive = null; f._spriteCastMove = null; f._spriteCastTimer = 0 }
    return
  }
  d.t++
  hold(f, 2); f._spriteCastMove = "upPuddle"; f._spriteCastTimer = 2
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - UP_DIVE.DRAIN_PER_S / 60)
  if (pressL) { s.dive = null; startRise(f, s, api, true); return }
  if (!input.special || d.t >= UP_DIVE.MAX || (f.energy || 0) <= 0) { d.phase = "reform"; d.pt = 0; hold(f, UP_DIVE.REFORM); return }
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (dir) f._benLunge = { frames: 1, speed: dir * UP_DIVE.SPEED }            // slide at speed 6 (stage-clamped by physics)
}
function evade(f, { move = null, proj = null, attacker = null } = {}) {
  const s = upState(f); if (!s || !s.dive || s.dive.phase === "reform") return false
  const low = !proj && !!move && !!attacker && !!(attacker.onGround || attacker.grounded) && move.hitLevel === "low"
  if (!low) s.stats.evaded++
  return !low
}

// TENDRIL RISE (from Goo Dive, or →↓↘ + P with no Terminal within 100 px; 10 standalone) — ATTACK ↑ f4–6: a goo column erupts
// in front: 13f startup, 55 dmg, launches, −14 on block, a clean hit +1 Virus pip.
export const UP_RISE = { STARTUP: 13, ACTIVE: 3, RECOVERY: 26, DMG: 55, ON_BLOCK: -14, W: 96, H: 170, AHEAD: 40 }
UP_RISE.TOTAL = UP_RISE.STARTUP + UP_RISE.ACTIVE + UP_RISE.RECOVERY
function castRise(f, s, api) { if (!grounded(f)) return false; return startRise(f, s, api, false) }
CASTS.rise = castRise
function startRise(f, s, api, fromDive) {
  if (fromDive) {
    s.castId++; s.stats.casts++
    f._benActionEpoch = (f._benActionEpoch || 0) + 1
    f._spriteCastMove = "upRise"; f._spriteCastTimer = UP_RISE.TOTAL; f.attackCooldown = UP_RISE.TOTAL; f._benPowerCommit = UP_RISE.TOTAL; f.vx = 0
    s.rise = { t: 0, cast: s.castId, face: f.facing || 1, fromDive: true }
  } else {
    const c = beginCast(f, s, api, "upRise", UP_COST.rise, UP_RISE.TOTAL); if (!c) return false
    s.rise = { t: 0, cast: c.cast, face: f.facing || 1, fromDive: false }
  }
  s.stats.rises++
  return true
}
function tickRise(f, s, api) {
  const r = s.rise; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { s.rise = null; return }
  if (r.t === UP_RISE.STARTUP) { const rem = UP_RISE.TOTAL - r.t
    hitbox(f, api, "up_rise", r.face, { damage: UP_RISE.DMG, spawnX: armEdge(f, r.face) + r.face * UP_RISE.AHEAD, spawnY: f.y + (f.h || 110) - UP_RISE.H / 2,
      w: UP_RISE.W, h: UP_RISE.H, lifetime: UP_RISE.ACTIVE, hitstun: 34, blockstun: blockstunFor(rem, UP_RISE.ON_BLOCK),
      knockbackX: 2, knockbackY: -12, launcher: true, launchVy: -13, alien: { up: "rise", pip: true, cast: r.cast } }) }
  f._spriteCastMove = "upRise"; f._spriteCastTimer = Math.max(2, UP_RISE.TOTAL - r.t)
  if (r.t >= UP_RISE.TOTAL) s.rise = null
}

// SPEAR DIVE (air ↓↘→ + P — any air Special; 12) — the body narrows into a goo spear: a diagonal dive down-forward (the shared
// ready-form `_benGlide`), 48 on a hit (one hit per cast), once per airtime, no jump refill.
export const UP_SPEAR = { STARTUP: 4, SPEED: 10, MAX: 50, DMG: 48, W: 64, H: 60, LAND_RECOVERY: 14 }
function castSpear(f, s, api) {
  if (grounded(f) || s.spearUsed) return false
  const c = beginCast(f, s, api, "upSpear", UP_COST.spear, UP_SPEAR.MAX + UP_SPEAR.LAND_RECOVERY, { commit: false }); if (!c) return false
  s.spearUsed = true
  s.spear = { t: 0, cast: c.cast, face: f.facing || 1, lastY: f.y, hit: false }; s.stats.spears++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.spear = castSpear
function tickSpear(f, s, api) {
  const d = s.spear; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endSpear(f, s, false); return }
  if (d.t < UP_SPEAR.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > UP_SPEAR.STARTUP + 1 && f.y === d.lastY
  d.lastY = f.y
  if (landed || d.t >= UP_SPEAR.MAX) { endSpear(f, s, landed); return }
  f._benGlide = { vx: d.face * UP_SPEAR.SPEED, vy: UP_SPEAR.SPEED }
  const live = api && api.activeProjectiles().some(p => p && p.owner === f && p.alien && p.alien.up === "spear")
  if (!d.hit && !live) hitbox(f, api, "up_spear", d.face, { damage: UP_SPEAR.DMG, spawnX: cx(f) + d.face * 18, spawnY: f.y + (f.h || 110) * 0.7, w: UP_SPEAR.W, h: UP_SPEAR.H,
    lifetime: 2, hitstun: 26, blockstun: 12, knockbackX: 5, knockbackY: -3, alien: { up: "spear", pip: false, cast: d.cast } })
  f._spriteCastMove = "upSpear"; f._spriteCastTimer = 2
}
function endSpear(f, s, landed) {
  s.spear = null; delete f._benGlide
  if (landed) { s.landT = s.t; f.attackCooldown = UP_SPEAR.LAND_RECOVERY; f._benPowerCommit = UP_SPEAR.LAND_RECOVERY; f._spriteCastMove = "crouch"; f._spriteCastTimer = UP_SPEAR.LAND_RECOVERY }
  else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
}

// HEAVY / TENDRIL LASH: the stretched arm / tendril is part of his hurtbox while it is out (whiff-punishable)
export const UP_HEAVY_ARM = { REACH: 180, ARM_Y: 0.34, H: 28 }
function armHurtbox(f, face, ext, armY, armH) {
  const body = { x: f.x + 6, y: f.y + 6, w: Math.max(1, (f.w || 60) - 12), h: Math.max(1, (f.h || 110) - 6) }
  const edge = armEdge(f, face), ay = f.y + (f.h || 110) * armY
  const x0 = Math.min(body.x, edge, edge + face * ext), x1 = Math.max(body.x + body.w, edge, edge + face * ext)
  return { x: x0, y: Math.min(body.y, ay), w: x1 - x0, h: Math.max(body.y + body.h, ay + armH) - Math.min(body.y, ay) }
}

// ── ULTIMATE: SYSTEM TAKEOVER (cost 55) ─────────────────────────────────────────────────────────────────────
// Needs a CLEAN opener lash (40, 300 px at 14f); a whiff or block = no cinematic, 60f recovery. Then (opponent held, no collision
// change; he is invulnerable only inside the scripted cinematic):
//   Beat 1 NETWORK 0–40f: he melts into a procedural circuit network + cage (render-only, no hitbox, nothing in GAME_STATE but t).
//   Beat 2 TERMINALS 40–110f: 4 render-only terminal copies at hash(seed, frame, playerIndex) spots fire 4 × 25.
//   Beat 3 HARD RESET 110–150f: the MERGE frame + a punch, 100.
// Total 40 + 100 + 100 = 240 raw. At the end, if the opponent carries Virus pips, CRASH applies (respecting immunity). Positions
// restore; 100f lockout. Copies have no hitboxes and no GAME_STATE presence beyond the hashed spots (kept for test / render).
export const UP_ULT = { OPENER_AT: 14, OPENER: 40, RANGE: 300, WHIFF: 60, NET: 40, TERM_AT: [52, 66, 80, 94], TERM: 25, RESET_AT: 124, RESET: 100,
  END: 150, LOCKOUT: 100, LAUNCH: -12 }
function fireUltimateImpl(f, ctx, api) {
  const s = upState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, UP_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = UP_ULT.OPENER_AT + UP_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "upLash"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, spots: [], hits: [], crash: false }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, UP_ULT.OPENER_AT, () => hitbox(f, api, "up_ult_open", face, {
    damage: UP_ULT.OPENER, spawnX: armEdge(f, face) + face * UP_ULT.RANGE / 2, spawnY: f.y + (f.h || 110) * UP_LASH.ARM_Y + 10, w: UP_ULT.RANGE, h: 60,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { up: "ultOpen", pip: false, cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "network"; u.t = 0; u.raw = UP_ULT.OPENER; u.hits.push(UP_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = UP_ULT.END + UP_ULT.LOCKOUT; f._benPowerCommit = UP_ULT.END; f._spriteCastTimer = UP_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, UP_ULT.END + 2)                // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > UP_ULT.OPENER_AT + 12) s.ult = null; return }   // whiff / block: no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "system_takeover", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < UP_ULT.NET) { u.phase = "network"; f._spriteCastMove = "upPuddle" }
  else if (u.t < UP_ULT.RESET_AT - 14) { u.phase = "terminals"; f._spriteCastMove = "upPuddle"
    const k = UP_ULT.TERM_AT.indexOf(u.t)
    if (k === 0) { const seed = ctx?.seed ?? 1, fr = ctx?.frame ?? u.t, pi = pIndex(f)   // 4 hashed copy spots, fixed when the beat starts
      for (let i = 0; i < UP_ULT.TERM_AT.length; i++) u.spots.push({ dx: Math.round((upHash(seed, fr, pi, i) - 0.5) * 360), lift: Math.round(upHash(seed, fr, pi, i + 16) * 60) }) }
    if (k >= 0) hit(UP_ULT.TERM, 4 + k * 2) }
  else if (u.t < UP_ULT.END) { u.phase = "reset"; f._spriteCastMove = "upMerge"
    if (u.t === UP_ULT.RESET_AT) hit(UP_ULT.RESET, 18) }
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }       // positions restore
  if (opp && u?.thome) {
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 3; opp.vy = UP_ULT.LAUNCH
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
    if (s.virus.pips > 0 && u) u.crash = startCrash(f, s, opp)                // CRASH at the end if pips exist (respects immunity)
  }
  s.lastUltRaw = u?.raw || 0; s.lastUltSpots = u?.spots ? u.spots.map(p => ({ ...p })) : []; s.lastUltCrash = !!u?.crash
  s.ult = null
  f.attackCooldown = UP_ULT.LOCKOUT; f._benPowerCommit = UP_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── hooks filled by the later sections (defaults: no-op) ───────────────────────────────────────────────────
function hurtbox(f) {
  const s = upState(f); if (!s) return null
  const L = s.lash || (s.ult && s.ult.phase === "opener" ? { t: s.ult.t, face: s.ult.face } : null), lext = L ? lashExt(L.t) : 0
  if (L && lext > 0) return armHurtbox(f, L.face, lext, UP_LASH.ARM_Y, UP_LASH.H)          // TENDRIL LASH: the tendril is hittable
  const atk = f.attacking && f.currentAttack
  if (!(atk && atk.name === "heavy")) return null
  return armHurtbox(f, f.facing || 1, UP_HEAVY_ARM.REACH - (f.w || 60) / 2, UP_HEAVY_ARM.ARM_Y, UP_HEAVY_ARM.H)   // HEAVY: the 180 px arm
}
// damage attributed to the form: Terminal pulses can't KO (capped at the target's health − 1 before the global ×0.6 scale,
// which is the last step after this hook, so the dealt damage is always < health)
function damageDealt(f, target, raw, opts) {
  const s = upState(f); if (!s) return raw
  if (s.oc.t > 0) raw *= UP_MERGE.DMG                                        // OVERCLOCK damage ×1.15
  //@@DEALT@@
  if (opts && opts.move === "up_pulse") raw = Math.min(raw, Math.max(0, (target.health || 0) - 1))
  return raw
}
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = upState(f); if (!s || !proj || !proj.alien) return
  const tag = proj.alien
  if (tag.up === "spear" && s.spear && s.spear.cast === tag.cast) s.spear.hit = true      // one hit per cast
  if (tag.up === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (!blocked && tag.pip === true) {
    if (addPip(f, s, tag.cast) && s.virus.pips >= UP_VIRUS.MAX) startCrash(f, s, target)   // crash the same frame the 3rd lands
  }
}
function fireUltimate(f, ctx, api) { return fireUltimateImpl(f, ctx, api) }
// render-only: the held opponent jitters inside the cage (circuit glitch)
function targetOffset(f, target) {
  const s = upState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  return { dx: u.phase === "terminals" && (u.t >> 1) % 2 ? 2 : 0, dy: -Math.round(Math.min(1, u.t / 20) * 8) }
}
function drainMultOf(f) { const s = upState(f); if (!s) return 1; let m = 1
  if (s.oc.t <= 0 && s.oc.cdT > 0) m *= UP_MERGE.DRAIN_CD                      // OVERCLOCK cooldown: Power drain +50%
  //@@DRAIN@@
  return m }

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
export const FX_SCALE = 2                                                     // extracted FX: integer nearest-neighbour ×2
function fxFrame(c, key, i, x, bottomY, scale = FX_SCALE, flip = 1, alpha = 1) {
  const a = UPGRADE_FX[key]; const img = a && sheetImg(a.sheet); if (!img) return false
  const k = Math.max(0, Math.min(a.frames - 1, i | 0)), dw = a.w * scale, dh = a.h * scale
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(bottomY)); if (flip < 0) c.scale(-1, 1)
  c.drawImage(img, k * a.w, 0, a.w, a.h, Math.round(-dw / 2), -dh, dw, dh); c.restore()
  return true
}
function rHash(a, b, c) {   // render-only deterministic hash → [0, 1) (static / circuit jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const INK = "#0a0f0d", GRN = "#39ff7a", LIME = "#a6ff4d", CYAN = "#5fe8ff", WHT = "#eafff1"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
// a pixel "circuit trace": axis-aligned segments between two points (render-only)
export function drawTrace(c, x0, y0, x1, y1, col, k = 3, seed = 0) {
  const mx = rHash(seed, 1, 7) < 0.5 ? x1 : x0
  c.fillStyle = col
  const seg = (ax, ay, bx, by) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / k)); for (let i = 0; i <= n; i++) px(c, ax + (bx - ax) * i / n, ay + (by - ay) * i / n, k) }
  seg(x0, y0, mx, y0); seg(mx, y0, mx, y1); seg(mx, y1, x1, y1)
}
function drawTerminal(c, w, frame) {
  const a = UPGRADE_FX.terminal, boot = w.t < UP_TERM.BOOT
  const i = boot ? Math.min(a.frames - 2, Math.floor(w.t / (UP_TERM.BOOT / (a.frames - 1)))) : a.frames - 1
  const alpha = w.gone ? Math.max(0, w.ct / UP_TERM.LINGER) : 1
  if (!fxFrame(c, "terminal", i, w.x, w.y, FX_SCALE, 1, alpha)) {   // fallback (image not loaded): a pixel box
    c.save(); c.globalAlpha *= alpha; c.fillStyle = INK; c.fillRect(w.x - 34, w.y - 76, 68, 76); c.fillStyle = boot ? "#2a6" : GRN; c.fillRect(w.x - 26, w.y - 68, 52, 34); c.restore()
  }
  if (w.gone) {   // shutdown / destroyed: sparks
    c.fillStyle = w.by === "destroyed" ? LIME : CYAN
    for (let k = 0; k < 8; k++) { const r = (UP_TERM.LINGER - w.ct) * 3; px(c, w.x + Math.cos(k * 0.785) * r, w.y - 40 + Math.sin(k * 0.785) * r * 0.7, 4) }
    return
  }
  if (!boot) {   // ONLINE: a scan glint + a charge meter toward the next pulse
    const ot = w.t - UP_TERM.BOOT, ph = (ot % UP_TERM.EVERY) / UP_TERM.EVERY
    c.fillStyle = WHT; c.globalAlpha = 0.5; c.fillRect(w.x - 26, w.y - 66 + Math.round(ph * 30), 52, 2); c.globalAlpha = 1
    c.fillStyle = GRN; c.fillRect(w.x - 30, w.y + 4, Math.round(60 * ph), 3)
    if (ot > UP_TERM.ONLINE - 60 && (frame >> 2) % 2) { c.fillStyle = "#ff5b5b"; c.fillRect(w.x - 30, w.y + 4, 60, 3) }   // about to shut down
  } else if ((frame >> 3) % 2) { c.fillStyle = CYAN; c.fillRect(w.x - 3, w.y - 84, 6, 6) }                               // booting blink
}
function drawPulse(c, p, frame) {
  const r = UP_TERM.PULSE_R
  c.fillStyle = GRN; px(c, p.x, p.y, r * 2); c.fillStyle = WHT; px(c, p.x, p.y, r)
  c.fillStyle = LIME; for (let k = 1; k <= 3; k++) px(c, p.x - (p.vx || 0) * k * 1.6, p.y - (p.vy || 0) * k * 1.6, Math.max(2, r - k * 3))
  const ph = frame * 0.4; for (let k = 0; k < 4; k++) px(c, p.x + Math.cos(ph + k * 1.57) * (r + 4), p.y + Math.sin(ph + k * 1.57) * (r + 4), 3)
}
export function drawUpgradeUnder(c, f) {
  const s = upState(f); if (!s || !s.term) return
  drawTerminal(c, s.term, s.t)
}
//@@DRAWFX_HELPERS@@
export function drawUpgradeFx(c, f, frame = 0, opp = null) {
  const s = upState(f); if (!s) return
  if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.up === "pulse") drawPulse(c, p, frame)
  if (s.merge) {   // MERGE: circuit traces pulling from where the terminal stood into his body
    const k = s.merge.t / UP_MERGE.FRAMES, bx = cx(f), by = f.y + (f.h || 110) * 0.55
    for (let i = 0; i < 4; i++) drawTrace(c, s.merge.x + (bx - s.merge.x) * k, f.y + (f.h || 110) - 10 - i * 16, bx, by - i * 8, i % 2 ? GRN : CYAN, 3, s.merge.cast * 7 + i)
  }
  if (s.oc.t > 0) {   // OVERCLOCK: a pixel circuit halo + rising glints (the palette itself is the frame-set swap)
    const bx = cx(f), top = f.y, h = f.h || 110, t = s.t
    c.fillStyle = (t >> 2) % 2 ? LIME : WHT
    for (let i = 0; i < 6; i++) { const r = rHash(t >> 2, i, 31), y = top + h - ((t * 3 + i * 23) % h); px(c, bx + (r - 0.5) * (f.w || 58) * 1.4, y, 3) }
    if (s.oc.t < 40 && (t >> 2) % 2) { c.fillStyle = "#ff5b5b"; px(c, bx, top - 10, 5) }   // about to drop out
  }
  if (opp && (s.virus.pips > 0 || s.virus.crashT > 0)) {   // VIRUS pips over the opponent; CRASH = glitch static lines on them
    const ox = cx(opp), top = opp.y, h = opp.h || 110, v = s.virus
    if (v.crashT > 0) {
      for (let i = 0; i < 7; i++) { const r = rHash(s.t >> 1, i, 53); if (r < 0.25) continue
        c.fillStyle = i % 3 === 0 ? WHT : i % 3 === 1 ? GRN : CYAN; c.globalAlpha = 0.75
        c.fillRect(Math.round(ox - (opp.w || 60) * 0.7 + rHash(s.t >> 1, i, 59) * 12), Math.round(top + r * h), Math.round((opp.w || 60) * 1.4 * (0.4 + r * 0.6)), 2) }
      c.globalAlpha = 1; c.fillStyle = (s.t >> 3) % 2 ? "#ff5b5b" : WHT; c.font = "bold 10px monospace"; c.textAlign = "center"; c.fillText("CRASH", ox, top - 18)
    } else for (let k = 0; k < UP_VIRUS.MAX; k++) {
      const x = ox - 12 + k * 12, y = top - 14; c.fillStyle = INK; c.fillRect(x - 4, y - 4, 9, 9)
      c.fillStyle = k < v.pips ? GRN : "#334155"; c.fillRect(x - 3, y - 3, 7, 7); if (k < v.pips) { c.fillStyle = WHT; c.fillRect(x - 1, y - 1, 2, 2) }
    }
  }
  if (projRef) for (const p of projRef) {   // his hidden hitboxes that are visible things
    if (!p || p.owner !== f || !p.alien) continue
    if (p.alien.up === "zap") { const face = (p.vx || 0) >= 0 ? 1 : -1
      if (!fxFrame(c, "bolt", 0, p.x, p.y + UPGRADE_FX.bolt.h, FX_SCALE, face)) { c.fillStyle = CYAN; c.fillRect(p.x - 22, p.y - 5, 44, 10) }
      if (p.alien.boosted) { c.fillStyle = (frame >> 1) % 2 ? WHT : LIME; for (let k = 0; k < 5; k++) px(c, p.x - face * k * 9, p.y + ((k * 7 + frame) % 9) - 4, 4) } }
  }
  const tendril = (face, ext, y, col = GRN) => {   // a 3-px-pixel goo tendril with circuit nodes (render-only)
    if (!(ext > 0)) return
    const edge = cx(f) + face * (f.w || 58) / 2
    c.fillStyle = INK; c.fillRect(Math.round(face > 0 ? edge : edge - ext), Math.round(y - 7), Math.round(ext), 14)
    c.fillStyle = col; c.fillRect(Math.round(face > 0 ? edge : edge - ext), Math.round(y - 5), Math.round(ext), 10)
    c.fillStyle = WHT; for (let x = 18; x < ext; x += 26) px(c, edge + face * x, y, 4)
    c.fillStyle = LIME; px(c, edge + face * ext, y, 12)
  }
  if (s.lash) tendril(s.lash.face, lashExt(s.lash.t), f.y + (f.h || 110) * UP_LASH.ARM_Y + 10)
  if (s.ult && s.ult.phase === "opener") tendril(s.ult.face, lashExt(s.ult.t, UP_ULT.RANGE), f.y + (f.h || 110) * UP_LASH.ARM_Y + 10, LIME)
  if (f.attacking && f.currentAttack && f.currentAttack.name === "heavy") { const a = f.currentAttack, e = a.total - a.timer
    if (e >= a.activeStart - 3 && e <= a.activeEnd + 4) tendril(f.facing || 1, (UP_HEAVY_ARM.REACH - (f.w || 58) / 2) * Math.min(1, (e - a.activeStart + 4) / 4), f.y + (f.h || 110) * UP_HEAVY_ARM.ARM_Y + 8) }
  if (s.rise && s.rise.t >= UP_RISE.STARTUP - 3 && s.rise.t <= UP_RISE.STARTUP + UP_RISE.ACTIVE + 6) {   // the goo column
    const r = s.rise, x = armEdge(f, r.face) + r.face * UP_RISE.AHEAD, g = f.y + (f.h || 110), k = Math.min(1, (r.t - UP_RISE.STARTUP + 4) / 4)
    const hh = UP_RISE.H * k, ww = UP_RISE.W * 0.6
    c.fillStyle = INK; c.fillRect(Math.round(x - ww / 2 - 2), Math.round(g - hh - 2), Math.round(ww + 4), Math.round(hh + 2))
    c.fillStyle = GRN; c.fillRect(Math.round(x - ww / 2), Math.round(g - hh), Math.round(ww), Math.round(hh))
    c.fillStyle = WHT; for (let y = 10; y < hh; y += 22) px(c, x + ((y >> 3) % 2 ? -8 : 8), g - y, 5)
  }
  if (s.spear) { c.fillStyle = LIME; for (let k = 1; k <= 4; k++) px(c, cx(f) - s.spear.face * k * 10, f.y + (f.h || 110) * 0.3 - k * 10, 6 - k) }
  if (s.dive && s.dive.phase === "slide") { c.fillStyle = GRN; for (let k = 0; k < 3; k++) px(c, cx(f) + ((s.t * 3 + k * 20) % 60) - 30, f.y + (f.h || 110) - 2, 3) }
  if (s.ult && s.ult.thome && opp) {   // SYSTEM TAKEOVER (render-only): network → cage → terminal copies → hard reset
    const u = s.ult, ox = cx(opp), oy = opp.y + (opp.h || 110) / 2, gy = u.thome.y + (opp.h || 110), hx = cx(f), hy = f.y + (f.h || 110) - 8
    const n = Math.min(8, 1 + (u.t >> 2))
    for (let i = 0; i < n; i++) drawTrace(c, hx, hy - i * 4, ox + (rHash(u.cast, i, 3) - 0.5) * 120, gy - rHash(u.cast, i, 5) * (opp.h || 110), i % 2 ? GRN : CYAN, 3, u.cast * 13 + i)
    const cw = (opp.w || 60) + 40, ch = (opp.h || 110) + 30, k = Math.min(1, u.t / 30)   // the cage
    c.fillStyle = (u.t >> 2) % 2 ? GRN : LIME
    for (let x = 0; x <= cw; x += 12) { px(c, ox - cw / 2 + x, gy - ch * k, 3); px(c, ox - cw / 2 + x, gy, 3) }
    for (let y = 0; y <= ch * k; y += 12) { px(c, ox - cw / 2, gy - y, 3); px(c, ox + cw / 2, gy - y, 3) }
    if (u.phase === "terminals" || u.phase === "reset") u.spots.forEach((sp, i) => {
      const tx = ox + sp.dx, ty = gy - sp.lift, fired = u.t >= UP_ULT.TERM_AT[i]
      fxFrame(c, "terminal", UPGRADE_FX.terminal.frames - 1, tx, ty, FX_SCALE, 1, u.phase === "reset" ? 0.5 : 1)
      if (fired && u.t - UP_ULT.TERM_AT[i] < 8) { c.fillStyle = WHT; drawTrace(c, tx, ty - 50, ox, oy, LIME, 4, i) }
    })
    if (u.phase === "reset" && Math.abs(u.t - UP_ULT.RESET_AT) < 6) { c.save(); c.globalAlpha = 0.6; c.fillStyle = WHT; c.fillRect(ox - 90, oy - 90, 180, 180); c.restore()
      c.fillStyle = INK; c.font = "bold 14px monospace"; c.textAlign = "center"; c.fillText("HARD RESET", ox, oy - 100) }
  }
  //@@DRAWFX@@
}
export function drawUpgradeHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = upState(f); if (!ctx || !s) return
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - 64 : x + 8
  ctx.save(); ctx.textBaseline = "top"
  const w = s.term                                                            // TERMINAL slot: boot / online life bar
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, 18, 14)
  const live = w && !w.gone, on = live && w.t >= UP_TERM.BOOT
  ctx.strokeStyle = on ? GRN : live ? CYAN : "#4b5563"; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, y + 0.5, 17, 13)
  if (live) { ctx.fillStyle = on ? GRN : CYAN; ctx.fillRect(bx + 4, y + 3, 10, 6)
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(bx + 2, y + 11, Math.round(14 * (on ? 1 - (w.t - UP_TERM.BOOT) / UP_TERM.ONLINE : w.t / UP_TERM.BOOT)), 1) }
  const tx = flip ? bx - 6 : bx + 22
  ctx.textAlign = flip ? "right" : "left"; ctx.font = "bold 7px Arial"
  const o = s.oc
  ctx.fillStyle = o.t > 0 ? LIME : o.cdT > 0 ? "#fca5a5" : "#9ca3af"
  ctx.fillText(o.t > 0 ? `OVERCLOCK ${Math.ceil(o.t / 60)}s` : o.cdT > 0 ? "COOLDOWN" : o.lockT > 0 ? `MERGE ${Math.ceil(o.lockT / 60)}s` : "MERGE", tx, y)
  const v = s.virus
  ctx.fillStyle = v.crashT > 0 ? "#ff5b5b" : v.pips ? GRN : "#e5e7eb"
  ctx.fillText(v.crashT > 0 ? `CRASH ${Math.ceil(v.crashT / 60)}s` : v.immuneT > 0 ? `VIRUS (immune ${Math.ceil(v.immuneT / 60)}s)` : `VIRUS ${"■".repeat(v.pips)}${"□".repeat(UP_VIRUS.MAX - v.pips)}`, tx, y + 7)
  ctx.restore()
}
