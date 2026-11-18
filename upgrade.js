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
    oc: { t: 0, cdT: 0, lockT: 0, count: 0 }, merge: null,
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

// ── hooks filled by the later sections (defaults: no-op) ───────────────────────────────────────────────────
function hurtbox(f) { return null }
function evade(f, info) { return false }
function damageDealt(f, target, raw, opts) { return raw }
function onContact(f, target, info) {}
function fireUltimate(f, ctx, api) { return false }
function targetOffset(f, target) { return null }
function drainMultOf(f) { return 1 }

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
export function drawUpgradeUnder(c, f) {}
export function drawUpgradeFx(c, f, frame = 0, opp = null) {}
export function drawUpgradeHud(ctx, f, opts) {}
