// wildmutt.js — WILDMUTT (Vulpimancer), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// Registry / pool key `wildmutt_ov`: the experimental `wildmutt` entry (its own legacy engine kit, art and harnesses) is left
// untouched; production players only ever see this READY Wildmutt.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (dust, scent trail,
// claw streaks, roar rings, darkening, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sprites: the orange ipmugenofficial sheet (docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md).
import { WILDMUTT_ANIM, WILDMUTT_FRENZY_ANIM, WILDMUTT_GEOM, WILDMUTT_PAL } from "./wildmuttAssets.js"
export { WILDMUTT_ANIM, WILDMUTT_FRENZY_ANIM, WILDMUTT_GEOM, WILDMUTT_PAL }

export const WM_KEY = "wildmutt_ov"
const ANIM = { ...WILDMUTT_ANIM }
const FRENZY_ANIM = { ...WILDMUTT_FRENZY_ANIM }
export const WM_FRAMESETS = { normal: ANIM, frenzy: FRENZY_ANIM }   // the live tables the FRENZY swap toggles between

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WILDMUTT = {
  id: WM_KEY, poolKey: WM_KEY, displayName: "Wildmutt", slot: 14,
  status: "ready", sheetPath: "./ben10_wildmutt_ov_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/wildmutt/SPRITE_LEDGER.md",
  mods: { speed: 1.15, damage: 1.10, defense: 0.90, weight: 0.95 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Pounce", special2: "Ground Pound", special3: "Maul", special4: "Roar",
    special5: "Bull Rush", special6: "Claw Dive", ultimate: "Primal Hunt" },
  basic_attacks: {
    light:  normal(20, 5, 3, 10, 0, { rangeX: 100 }),                                         // the bite (ROAR/BITE f6–7)
    heavy:  normal(56, 13, 4, 22, -6, { knockbackX: 7, rangeX: 170 }),                       // GROUND ATTACK swipe, claw arc 170 px
    down:   normal(26, 7, 3, 15, -4, { hitLevel: "low", rangeX: 120 }),                       // DIG f3–4 leg rake, hits low
    up:     normal(50, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // GROUND ATTACK handstand kick
    air:    normal(32, 7, 4, 11, 2)                                                           // RUN f5 + claw swipe
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, damageTaken, damageDealt, onContact, bodyOffset, bodyAlpha,
  drawHud: drawWildmuttHud, drawFx: drawWildmuttFx, drawUnder: drawWildmuttUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWildmuttState() {
  return { kind: WM_KEY, t: 0, castId: 0, noAttack: false, noBlock: false,
    stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    scent: { t: 0 },
    fury: { v: 0, idle: 0, frenzyT: 0, exhaustT: 0, baseWalk: null },
    pounce: null, gp: null, maul: null, roar: null, push: null, rush: null, dive: null, diveUsed: false, landT: -999,
    ult: null, lastUltRaw: 0, lastUltAngles: [], lastPounce: null,
    stats: { casts: 0, scents: 0, furyGain: 0, frenzies: 0, pounces: 0, pounceHits: 0, gps: 0, mauls: 0, mauled: 0, teched: 0,
      roars: 0, roarDmg: [], rushes: 0, rushCarry: 0, wallBonus: 0, wallAt: null, dives: 0, ults: 0 } }
}
export const wmState = f => (f?.omnitrix?.formState?.kind === WM_KEY && f.transformed && f.activeAlien === WM_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshWildmuttState()
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function wmHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = wmState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  tickInputs(f, s, input || {})
  if (grounded(f)) s.diveUsed = false                                      // Claw Dive: once per airtime
  if (s.scent.t > 0) s.scent.t--
  tickFury(f, s)
  tickPounce(f, s, api)
  tickGround(f, s, api)
  tickMaul(f, s, api, opp)
  tickRoar(f, s, api)
  tickPush(s, opp)
  tickRush(f, s, api, opp)
  tickDive(f, s, api)
  tickUlt(f, s, opp, api, ctx)
  tickFacing(f, s, opp)
  const want = s.fury.frenzyT > 0 ? FRENZY_ANIM : ANIM                       // render-only frame-set swap (the red wash)
  if (f._skinAnim !== want) f._skinAnim = want
  s.noBlock = s.fury.frenzyT > 0                                            // FRENZY: no guard (engine reads formState.noBlock)
  s.noAttack = busy(s)
}
const busy = s => !!(s.pounce || s.gp || s.maul || s.roar || s.rush || s.dive || s.ult)

// ── SCENT (a status on the OPPONENT, owned by this form's GAME_STATE) ─────────────────────────────────────────
// Wildmutt is blind: he hears the opponent within 380 px, and tracks by SCENT. Clean hits from his normals, Pounce, Maul and
// Bull Rush mark the opponent for 360f (one flag, refreshed by new hits, no stack; never from blocks or FX). While scented:
// Pounce locks onto the opponent's CAST-TIME position up to 640 px (invisible / intangible / just-teleported included — it is
// a position read, nothing tracks after the cast), his normals' startup −1f (min 1f), and he instantly faces them (cross-ups /
// teleports), except in hitstun or while his own attack / cast is out. Swap / revert / KO / rematch clear it (fresh state).
export const WM_SCENT = { DUR: 360, HEAR: 380, LOCK: 640 }
export const scented = s => !!s && s.scent.t > 0
function markScent(s) { s.scent.t = WM_SCENT.DUR; s.stats.scents++ }
function tickFacing(f, s, opp) {
  if (!scented(s) || !opp || opp.eliminated || (f.hitstun || 0) > 0 || f.attacking || busy(s)) return
  const d = cx(opp) - cx(f); if (Math.abs(d) > 1) f.facing = d > 0 ? 1 : -1
}
// moveFrames hook (combat.startMove): no normals while a cast owns him; scented → startup −1f; FRENZY → Jab / Heavy −1f more
function moveFrames(f, key, md) {
  const s = wmState(f); if (!s || !md) return md
  if (busy(s)) return false
  const cut = (scented(s) ? 1 : 0) + (s.fury.frenzyT > 0 && (key === "light" || key === "heavy") ? 1 : 0)
  return cut ? { ...md, startup: Math.max(1, (md.startup ?? 5) - cut) } : md
}

// ── FERAL FURY + FRENZY ─────────────────────────────────────────────────────────────────────────────────────
// Fury 0–100 (a gauge under Omnitrix Power, Heatblast's Heat pattern): +5 per hit landed, +8 per Pounce hit, +4 per hit
// taken; −1/f after 120f without a gain. At 100: FRENZY 300f — speed ×1.20, damage ×1.20, Jab / Heavy startup −1f, a
// render-only red-washed frame set; no guard, no Roar, no Maul. It ends in EXHAUSTION: Fury 0 and 90f without Pounce or
// Bull Rush. ROAR spends ALL Fury (roar early, or build to Frenzy).
export const WM_FURY = { MAX: 100, HIT: 5, POUNCE: 8, TAKEN: 4, IDLE: 120, FRENZY: 300, EXHAUST: 90, SPEED: 1.20, DMG: 1.20 }
export function gainFury(f, s, n) {
  const u = s.fury
  if (u.frenzyT > 0 || !(n > 0)) return
  u.v = Math.min(WM_FURY.MAX, u.v + n); u.idle = 0; s.stats.furyGain += n
  if (u.v >= WM_FURY.MAX) startFrenzy(f, s)
}
function startFrenzy(f, s) {
  const u = s.fury
  u.v = WM_FURY.MAX; u.frenzyT = WM_FURY.FRENZY; s.stats.frenzies++
  if (Number.isFinite(f._benWalkSpeed)) { u.baseWalk = f._benWalkSpeed; f._benWalkSpeed = u.baseWalk * WM_FURY.SPEED }
}
function tickFury(f, s) {
  const u = s.fury
  if (u.frenzyT > 0) {
    if (--u.frenzyT === 0) {                                                // EXHAUSTION
      u.v = 0; u.idle = 0; u.exhaustT = WM_FURY.EXHAUST
      if (u.baseWalk != null) { f._benWalkSpeed = u.baseWalk; u.baseWalk = null }
    }
    return
  }
  if (u.exhaustT > 0) u.exhaustT--
  if (++u.idle > WM_FURY.IDLE && u.v > 0) u.v--
}
export const frenzied = s => !!s && s.fury.frenzyT > 0

// damage observation: normals' clean hits (combat `applyScaledDamage` → damageDealt with source "melee") scent + Fury;
// FRENZY ×1.20 on everything the form deals
function damageDealt(f, target, raw, opts) {
  const s = wmState(f); if (!s) return raw
  if (opts && opts.source === "melee" && target && target !== f) { markScent(s); gainFury(f, s, WM_FURY.HIT) }
  return s.fury.frenzyT > 0 ? raw * WM_FURY.DMG : raw
}
// hits taken (not chip) build Fury
function damageTaken(f, raw, opts) {
  const s = wmState(f); if (!s) return raw
  if (!opts || opts.source !== "block-chip") gainFury(f, s, WM_FURY.TAKEN)
  return raw
}

// ── shared cast helpers ─────────────────────────────────────────────────────────────────────────────────────
function canAct(f, s) {
  return f.transformed && f.activeAlien === WM_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
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
const clampX = (s, o, x) => Math.max(s.stage.L, Math.min(s.stage.R - (o.w || 60), x))
const edgeX = (f, face) => cx(f) + face * (f.w || 60) / 2

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the input that ENDS most recently wins:
//   →→ + P (double tap) POUNCE      ↓↘→ + P (236) GROUND POUND     ←↙↓ + P (412) MAUL      ↓↙← + P (214) ROAR
//   ↓ then → + P (26, no ↘ between) BULL RUSH                      air: any + P CLAW DIVE (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: → Pounce, neutral Ground Pound,
// ↓ Maul, ← Roar, ↑ Bull Rush.
export const WM_DASH_WINDOW = 14, WM_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= WM_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["236", "gp"], ["412", "maul"], ["214", "roar"]]
export function readMotion(s) {
  const ev = s.hist.filter(e => s.t - e.t <= WM_MOTION_WINDOW), recent = ev.map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  for (let k = recent.length - 1; k >= 1; k--) {                            // BULL RUSH: ↓ then → with nothing (or neutral) between
    if (recent[k] !== "6") continue
    if (recent[k - 1] === "2" || (recent[k - 1] === "5" && recent[k - 2] === "2")) {
      if (!best || k > best.end || (k === best.end && best.kind === "gp" && recent[k - 1] !== "3")) best = { kind: "rush", end: k }
      break
    }
  }
  if (best) best.t = ev[best.end].t
  return best
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "dive"
  const m = readMotion(s), dashT = s.t - (s.dashTapT ?? -999) <= WM_DASH_WINDOW ? s.dashTapT : null
  if (dashT != null && (!m || dashT > m.t)) return "pounce"
  if (m) return m.kind
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "F") return "pounce"
  if (dir === "D") return "maul"
  if (dir === "B") return "roar"
  if (dir === "U") return "rush"
  return "gp"
}

// ── SPECIALS (dispatch) ─────────────────────────────────────────────────────────────────────────────────────
export const WM_COST = { pounce: 12, gp: 14, maul: 14, roar: 10, rush: 12, dive: 12, ultimate: 55 }
function fireSpecial(f, ctx, api) {
  const s = wmState(f); if (!s) return false
  const kind = pickSpecial(f, s)
  if (kind === "pounce") return castPounce(f, s, api)
  if (kind === "gp") return castGround(f, s, api)
  if (kind === "maul") return castMaul(f, s, api)
  if (kind === "roar") return castRoar(f, s, api)
  if (kind === "rush") return castRush(f, s, api)
  if (kind === "dive") return castDive(f, s, api)
  return false
}

// 1. POUNCE (→→ + P, 12) — RUN f3–8 leap: a lunge, 12f startup, 2 hits 20 / 26 = 46 (the second knocks down), −14 on block,
//    24f whiff recovery, no invulnerability, +Scent. WHERE it goes is decided at CAST TIME and never updated:
//      SCENTED, target ≤ 640 px  → to the target's cast-time position (any visibility / tangibility; just-teleported too);
//      UNSCENTED, target ≤ 380 px (heard) → toward the target, 340 px max;
//      otherwise → straight ahead in his current facing, a fixed 420 px.
//    The leap height is render-only (bodyOffset); the body travels on the ground line.
export const WM_POUNCE = { STARTUP: 12, TRAVEL: 16, DIST: 340, BLIND: 420, GAP: 6, HIT2: 6, DMG: [20, 26], RECOVERY: 24, ON_BLOCK: -14,
  W: 70, H: 70, ARC: 46 }
export function pounceTarget(f, s, opp) {
  const face = f.facing || 1
  const d = opp && !opp.eliminated ? cx(opp) - cx(f) : null, ad = d == null ? Infinity : Math.abs(d)
  const reach = d == null ? 0 : Math.max(0, ad - ((f.w || 60) + (opp.w || 60)) / 2 + WM_POUNCE.GAP)
  if (scented(s) && ad <= WM_SCENT.LOCK) return { mode: "scent", face: d >= 0 ? 1 : -1, dist: reach, lockX: cx(opp) }
  if (ad <= WM_SCENT.HEAR) return { mode: "heard", face: d >= 0 ? 1 : -1, dist: Math.min(WM_POUNCE.DIST, reach), lockX: cx(opp) }
  return { mode: "blind", face, dist: WM_POUNCE.BLIND, lockX: null }
}
function castPounce(f, s, api) {
  if (s.fury.exhaustT > 0) return false                                     // EXHAUSTION: no Pounce
  const tg = pounceTarget(f, s, api.getOpponent(f))
  const total = WM_POUNCE.STARTUP + WM_POUNCE.TRAVEL + WM_POUNCE.RECOVERY
  const c = beginCast(f, s, api, "wmPounce", WM_COST.pounce, total); if (!c) return false
  f.facing = tg.face
  s.pounce = { t: 0, cast: c.cast, face: tg.face, x0: f.x, dx: tg.face * tg.dist, mode: tg.mode, hitT: 0, hit2: false, end: total }
  s.lastPounce = { mode: tg.mode, dist: tg.dist, lockX: tg.lockX, x0: f.x, face: tg.face }
  s.stats.pounces++
  return true
}
function tickPounce(f, s, api) {
  const p = s.pounce; if (!p) return
  p.t++
  if ((f.hitstun || 0) > 0) { s.pounce = null; return }
  const P = WM_POUNCE, tr = p.t - P.STARTUP
  if (!p.hitT && tr >= 1 && tr <= P.TRAVEL) {
    f.x = clampX(s, f, p.x0 + p.dx * tr / P.TRAVEL); f.vx = 0
    // contact hitbox every OTHER frame, 2f life: the live projectile pass expires a 1f box before it can connect, and
    // non-overlapping 2f boxes can never double-hit
    if (tr % 2 === 1 || tr === P.TRAVEL) hitbox(f, api, "wm_pounce", p.face, { damage: P.DMG[0], spawnX: edgeX(f, p.face), spawnY: f.y + (f.h || 110) * 0.55, w: P.W, h: P.H, lifetime: 2,
      hitstun: 20, blockstun: 12, knockbackX: 0.5, knockbackY: 0, noHitstop: true, alien: { wm: "pounce", k: 0, cast: p.cast, scent: true } })
    if (tr === P.TRAVEL) { p.end = p.t + P.RECOVERY; f.attackCooldown = P.RECOVERY; f._benPowerCommit = P.RECOVERY }   // whiff: 24f recovery
  }
  if (p.hitT && !p.hit2 && p.t === p.hitT + P.HIT2) {
    p.hit2 = true; const rec = 20; p.end = p.t + rec
    hitbox(f, api, "wm_pounce2", p.face, { damage: P.DMG[1], spawnX: edgeX(f, p.face), spawnY: f.y + (f.h || 110) * 0.55, w: P.W + 20, h: P.H, lifetime: 2,
      hitstun: 34, blockstun: blockstunFor(rec, P.ON_BLOCK), knockbackX: 4, knockbackY: -6, launcher: true, launchVy: -6,
      alien: { wm: "pounce", k: 1, cast: p.cast, scent: true } })
    f.attackCooldown = rec; f._benPowerCommit = rec
  }
  f._spriteCastMove = "wmPounce"; f._spriteCastTimer = Math.max(2, p.end - p.t)
  if (p.t >= p.end) { s.pounce = null; s.landT = s.t }
}

// 2. GROUND POUND (↓↘→ + P, 14) — DIG f5–8 rear up / arch, GROUND ATTACK f5 slam: a shockwave along the floor 220 px in front,
//    3 hits × 18 = 54 at 20 / 26 / 32f, the last pops up, −16 on block. Tagged hitLevel "low" (see ADD_ALIEN.md: the engine's
//    low level is inert — there is no crouch-block — so it blocks like any hit).
export const WM_GP = { HITS_AT: [20, 26, 32], DMG: 18, LEN: 220, H: 44, RECOVERY: 24, ON_BLOCK: -16 }
WM_GP.TOTAL = WM_GP.HITS_AT[2] + 2 + WM_GP.RECOVERY
function castGround(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "wmGround", WM_COST.gp, WM_GP.TOTAL); if (!c) return false
  s.gp = { t: 0, cast: c.cast, face: f.facing || 1, edge: edgeX(f, f.facing || 1), ground: f.y + (f.h || 110) }; s.stats.gps++
  return true
}
function tickGround(f, s, api) {
  const g = s.gp; if (!g) return
  g.t++
  if ((f.hitstun || 0) > 0) { s.gp = null; return }
  const k = WM_GP.HITS_AT.indexOf(g.t)
  if (k >= 0) { const last = k === 2, rem = WM_GP.TOTAL - g.t
    hitbox(f, api, "wm_gpound", g.face, { damage: WM_GP.DMG, spawnX: g.edge + g.face * WM_GP.LEN / 2, spawnY: g.ground - WM_GP.H / 2, w: WM_GP.LEN, h: WM_GP.H,
      lifetime: 2, hitLevel: "low", hitstun: last ? 30 : 14, blockstun: last ? blockstunFor(rem, WM_GP.ON_BLOCK) : 10, noHitstop: !last,
      knockbackX: last ? 2 : 0.3, knockbackY: last ? -8 : 0, ...(last ? { launcher: true, launchVy: -9 } : {}), alien: { wm: "gp", k, cast: g.cast } }) }
  f._spriteCastMove = "wmGround"; f._spriteCastTimer = Math.max(2, WM_GP.TOTAL - g.t)
  if (g.t >= WM_GP.TOTAL) s.gp = null
}

// 3. MAUL (←↙↓ + P, 14) — a COMMAND GRAB: bite (ROAR/BITE f6–7), pin and maul (DIG row 2 f2–5), toss (GROUND ATTACK f4).
//    14f startup, 110 px (centre to centre), 28f whiff recovery. STANDARD THROW RULES (the same tests as combat.resolveGrab):
//    both grounded, not during his combo, a defender out of hitstun / blockstun who has Grab buffered TECHS it (both pushed
//    apart, 18f each); invulnerable targets can't be grabbed. On a grab: 3 ticks × 15 = 45 (source "grab-throw"), then thrown
//    180 px (stage-clamped). +Scent. Unusable in FRENZY.
export const WM_MAUL = { STARTUP: 14, RANGE: 110, WHIFF: 28, TICKS: [8, 18, 28], DMG: 15, HOLD: 34, THROW: 180, GAP: 40, RECOVERY: 16, TECH: 18 }
function castMaul(f, s, api) {
  if (s.fury.frenzyT > 0 || !grounded(f)) return false
  const c = beginCast(f, s, api, "wmMaul", WM_COST.maul, WM_MAUL.STARTUP + WM_MAUL.WHIFF); if (!c) return false
  s.maul = { t: 0, cast: c.cast, face: f.facing || 1, held: false, h: 0, end: WM_MAUL.STARTUP + WM_MAUL.WHIFF, result: null }; s.stats.mauls++
  return true
}
export function maulCanGrab(f, opp) {
  if (!opp || opp.eliminated || opp.isGrabbed) return "none"
  if (!grounded(f) || !grounded(opp)) return "air"
  if ((f.comboCounter || 0) > 0) return "combo"
  if ((opp.invulnTimer || 0) > 0) return "invuln"
  if (Math.abs(cx(opp) - cx(f)) > WM_MAUL.RANGE) return "range"
  return "ok"
}
function tickMaul(f, s, api, opp) {
  const m = s.maul; if (!m) return
  m.t++
  if (!m.held && (f.hitstun || 0) > 0) { s.maul = null; return }
  if (m.t === WM_MAUL.STARTUP) {
    const why = maulCanGrab(f, opp); m.result = why
    if (why === "ok") {
      const canTech = !((opp.hitstun || 0) > 0 || (opp.blockstun || 0) > 0)
      if (canTech && (opp.grabInputBuffer || 0) > 0) {                       // THROW ESCAPE (the standard tech)
        m.result = "teched"; s.stats.teched++
        f.attackCooldown = WM_MAUL.TECH; opp.attackCooldown = WM_MAUL.TECH; f._benPowerCommit = WM_MAUL.TECH
        f.vx = -m.face * 3; opp.vx = m.face * 3; m.end = m.t + WM_MAUL.TECH
      } else {
        m.held = true; m.h = 0; m.ox = opp.x; markScent(s); s.stats.mauled++
        m.end = m.t + WM_MAUL.HOLD + WM_MAUL.RECOVERY
        f.attackCooldown = m.end - m.t; f._benPowerCommit = m.end - m.t
        opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
      }
    }
  }
  if (m.held && opp && !opp.eliminated) {
    m.h++
    if (m.h <= WM_MAUL.HOLD) {                                               // pinned in front of him
      opp.hitstun = Math.max(opp.hitstun || 0, 10); opp.vx = 0; opp.vy = 0
      opp.x = clampX(s, opp, cx(f) + m.face * WM_MAUL.GAP - (opp.w || 60) / 2)
      if (WM_MAUL.TICKS.includes(m.h)) {
        api.applyScaledDamage(opp, WM_MAUL.DMG, { attacker: f, move: "maul", source: "grab-throw" })
        gainFury(f, s, WM_FURY.HIT); opp.colorFlash = 6; api.shake?.(3, 4)
      }
      if (m.h === WM_MAUL.HOLD) {                                            // the toss: 180 px, a small pop
        m.from = opp.x
        opp.x = clampX(s, opp, opp.x + m.face * WM_MAUL.THROW); m.thrown = opp.x - m.from
        opp.vx = m.face * 2; opp.vy = -7; opp.hitstun = Math.max(opp.hitstun || 0, 30)
        opp.onGround = false; opp.grounded = false; opp.isLaunched = true
        m.held = false
      }
    }
  }
  f._spriteCastMove = "wmMaul"; f._spriteCastTimer = Math.max(2, m.end - m.t)
  if (m.t >= m.end) s.maul = null
}

// 4. ROAR (↓↙← + P, 10; needs Fury ≥ 25) — ROAR/BITE f1 inhale, f2–5 roar: a shockwave of radius 200 px, 18f startup,
//    20 + 0.4 × the Fury spent (max 60), pushes the opponent 140 px and hitstuns 18f, −12 on block. Spends ALL Fury at the cast.
//    Unusable in FRENZY.
export const WM_ROAR = { MIN: 25, STARTUP: 18, ACTIVE: 3, RECOVERY: 26, BASE: 20, PER: 0.4, MAX: 60, RADIUS: 200, PUSH: 140, PUSH_T: 7, HITSTUN: 18, ON_BLOCK: -12 }
WM_ROAR.TOTAL = WM_ROAR.STARTUP + WM_ROAR.ACTIVE + WM_ROAR.RECOVERY
export const roarDamage = fury => Math.min(WM_ROAR.MAX, WM_ROAR.BASE + WM_ROAR.PER * Math.max(0, fury))
function castRoar(f, s, api) {
  if (s.fury.frenzyT > 0 || s.fury.v < WM_ROAR.MIN) return false
  const c = beginCast(f, s, api, "wmRoar", WM_COST.roar, WM_ROAR.TOTAL); if (!c) return false
  const spent = s.fury.v; s.fury.v = 0; s.fury.idle = 0
  s.roar = { t: 0, cast: c.cast, face: f.facing || 1, spent, dmg: roarDamage(spent) }; s.stats.roars++
  return true
}
function tickRoar(f, s, api) {
  const r = s.roar; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { s.roar = null; return }
  if (r.t === WM_ROAR.STARTUP) { const R = WM_ROAR.RADIUS, rem = WM_ROAR.TOTAL - r.t
    hitbox(f, api, "wm_roar", r.face, { damage: r.dmg, spawnX: cx(f), spawnY: f.y + (f.h || 110) / 2, w: (f.w || 60) + 2 * R, h: (f.h || 110) + R,
      lifetime: WM_ROAR.ACTIVE, hitstun: WM_ROAR.HITSTUN, blockstun: blockstunFor(rem, WM_ROAR.ON_BLOCK), knockbackX: 0.01, knockbackY: 0,
      alien: { wm: "roar", cast: r.cast } })
    s.stats.roarDmg.push(r.dmg); if (s.stats.roarDmg.length > 8) s.stats.roarDmg.shift() }
  f._spriteCastMove = "wmRoar"; f._spriteCastTimer = Math.max(2, WM_ROAR.TOTAL - r.t)
  if (r.t >= WM_ROAR.TOTAL) s.roar = null
}
function tickPush(s, opp) {                                                   // the Roar push: 140 px over 7 frames, stage-clamped
  const p = s.push; if (!p) return
  if (!opp || opp.eliminated) { s.push = null; return }
  opp.x = clampX(s, opp, opp.x + p.dir * WM_ROAR.PUSH / WM_ROAR.PUSH_T); opp.vx = 0
  if (++p.n >= WM_ROAR.PUSH_T) s.push = null
}

// 5. BULL RUSH (↓ then → + P, 12) — SENSITIVITY f6 curl → ROLL f7–10 loop: a charging roll at 8 px/f. The first contact (a hit)
//    CARRIES the opponent forward with him, up to 300 px; 3 hits × 12 = 36 (contact, +8f, +16f); the run is capped at 36f (no
//    chain-lock beyond). Nothing pulls through the stage edge: the carried opponent stops at it, and so does he. WALL BONUS: if
//    the carried opponent reaches the edge within the rush, +30 once and a wall-bounce. 20f recovery, −15 on block (a blocked
//    contact ends the rush). +Scent.
export const WM_RUSH = { STARTUP: 10, SPEED: 8, RUN: 36, CARRY: 300, EVERY: 8, N: 3, DMG: 12, WALL: 30, RECOVERY: 20, ON_BLOCK: -15, W: 46, H: 70 }
function castRush(f, s, api) {
  if (s.fury.exhaustT > 0 || !grounded(f)) return false                     // EXHAUSTION: no Bull Rush
  const total = WM_RUSH.STARTUP + WM_RUSH.RUN + WM_RUSH.RECOVERY
  const c = beginCast(f, s, api, "wmRush", WM_COST.rush, total); if (!c) return false
  s.rush = { t: 0, cast: c.cast, face: f.facing || 1, r: 0, carry: false, blocked: false, from: 0, hits: 0, lastHit: 0, wall: false, done: false, end: total }
  s.stats.rushes++
  return true
}
const atWall = (s, o) => o.x <= s.stage.L + 0.5 || o.x + (o.w || 60) >= s.stage.R - 0.5
function endRun(f, s) {
  const u = s.rush; if (u.done) return
  u.done = true; u.end = u.t + WM_RUSH.RECOVERY
  f.attackCooldown = WM_RUSH.RECOVERY; f._benPowerCommit = WM_RUSH.RECOVERY; f.vx = 0
}
function tickRush(f, s, api, opp) {
  const u = s.rush; if (!u) return
  u.t++
  if ((f.hitstun || 0) > 0) { s.rush = null; return }
  const R = WM_RUSH, face = u.face
  if (u.t > R.STARTUP && !u.done) {
    u.r++
    if (u.blocked) endRun(f, s)
    else if (!u.carry) {
      f.x = clampX(s, f, f.x + face * R.SPEED)
      if (u.r % 2 === 1) hitbox(f, api, "wm_rush", face, { damage: R.DMG, spawnX: edgeX(f, face), spawnY: f.y + (f.h || 110) * 0.6, w: R.W + R.SPEED, h: R.H, lifetime: 2,
        hitstun: 16, blockstun: blockstunFor(R.RECOVERY, R.ON_BLOCK), knockbackX: 0.01, knockbackY: 0, noHitstop: true,
        alien: { wm: "rush", k: 0, cast: u.cast, scent: true } })
    } else if (opp && !opp.eliminated) {
      const ox = clampX(s, opp, opp.x + face * R.SPEED), moved = ox - opp.x
      opp.x = ox; opp.vx = 0; opp.vy = 0; opp.hitstun = Math.max(opp.hitstun || 0, 6)
      f.x = clampX(s, f, f.x + moved)                                       // he only advances as far as the opponent did (no pull-through)
      s.stats.rushCarry = Math.max(s.stats.rushCarry, Math.abs(opp.x - u.from))
      if (u.hits < R.N && u.r - u.lastHit >= R.EVERY) {
        u.lastHit = u.r; u.hits++
        hitbox(f, api, "wm_rush", face, { damage: R.DMG, spawnX: edgeX(f, face), spawnY: f.y + (f.h || 110) * 0.6, w: R.W + 30, h: R.H, lifetime: 2,
          hitstun: 16, blockstun: 10, knockbackX: 0.01, knockbackY: 0, noHitstop: true, alien: { wm: "rush", k: u.hits - 1, cast: u.cast, scent: true } })
      }
      if (!u.wall && atWall(s, opp)) {                                       // WALL BONUS (once) + wall-bounce
        u.wall = true; s.stats.wallBonus++; s.stats.wallAt = { f: f.x + (f.w || 60), o: opp.x, oR: opp.x + (opp.w || 60) }
        hitbox(f, api, "wm_rush_wall", face, { damage: R.WALL, spawnX: edgeX(f, face), spawnY: f.y + (f.h || 110) * 0.6, w: R.W + 40, h: R.H, lifetime: 2,
          hitstun: 34, blockstun: 10, knockbackX: 6, knockbackY: -9, launcher: true, launchVy: -9, alien: { wm: "wall", cast: u.cast } })
        u.bounce = 2
      }
      if (Math.abs(opp.x - u.from) >= R.CARRY) endRun(f, s)
    }
    if (u.r >= R.RUN) endRun(f, s)
  }
  if (u.bounce && --u.bounce === 0 && opp) { opp.vx = -face * 6; endRun(f, s) }   // wall-bounce: back off the edge
  f._spriteCastMove = "wmRush"; f._spriteCastTimer = Math.max(2, u.end - u.t)
  if (u.t >= u.end) s.rush = null
}

// 6. CLAW DIVE (air: any + P, 12) — CROUCH/JUMP f6–8, claws down-forward: a diagonal dive (the shared `_benGlide`), 48 on a
//    hit (one per cast), once per airtime, no jump refill. Landing = a small cosmetic dust pop (render reads `landT`).
export const WM_DIVE = { STARTUP: 4, SPEED: 9, MAX: 50, DMG: 48, W: 70, H: 60, LAND_RECOVERY: 14 }
function castDive(f, s, api) {
  if (grounded(f) || s.diveUsed) return false
  const c = beginCast(f, s, api, "wmDive", WM_COST.dive, WM_DIVE.MAX + WM_DIVE.LAND_RECOVERY, { commit: false }); if (!c) return false
  s.diveUsed = true
  s.dive = { t: 0, cast: c.cast, face: f.facing || 1, hit: false, lastY: f.y }; s.stats.dives++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
function tickDive(f, s, api) {
  const d = s.dive; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endDive(f, s, false); return }
  if (d.t < WM_DIVE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > WM_DIVE.STARTUP + 1 && f.y === d.lastY
  d.lastY = f.y
  if (landed || d.t >= WM_DIVE.MAX) { endDive(f, s, landed); return }
  f._benGlide = { vx: d.face * WM_DIVE.SPEED, vy: WM_DIVE.SPEED }
  if (!d.hit && d.t % 2 === 0) hitbox(f, api, "wm_dive", d.face, { damage: WM_DIVE.DMG, spawnX: cx(f) + d.face * 18, spawnY: f.y + (f.h || 110) * 0.7, w: WM_DIVE.W, h: WM_DIVE.H + WM_DIVE.SPEED,
    lifetime: 2, hitstun: 26, blockstun: 12, knockbackX: 5, knockbackY: -3, alien: { wm: "dive", cast: d.cast } })
  f._spriteCastMove = "wmDive"; f._spriteCastTimer = 2
}
function endDive(f, s, landed) {
  s.dive = null; delete f._benGlide
  if (landed) { s.landT = s.t; f.attackCooldown = WM_DIVE.LAND_RECOVERY; f._benPowerCommit = WM_DIVE.LAND_RECOVERY; f._spriteCastMove = "crouch"; f._spriteCastTimer = WM_DIVE.LAND_RECOVERY }
  else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
}

// contact hook (combat → ben10State.benAlienContact): Scent + Fury on CLEAN hits of tagged casts; Pounce / Bull Rush / ult flow
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = wmState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || !tag.wm) return
  if (tag.wm === "pounce" && s.pounce && s.pounce.cast === tag.cast && tag.k === 0 && !s.pounce.hitT) s.pounce.hitT = s.pounce.t
  if (tag.wm === "pounce" && !blocked) s.stats.pounceHits++
  if (tag.wm === "rush" && s.rush && s.rush.cast === tag.cast && tag.k === 0 && !s.rush.carry && !s.rush.blocked) {
    if (blocked) { s.rush.blocked = true; endRun(f, s) }                   // a blocked contact ends the rush at once (−15)
    else { s.rush.carry = true; s.rush.from = target.x; s.rush.hits = 1; s.rush.lastHit = s.rush.r }
  }
  if (tag.wm === "dive" && s.dive && s.dive.cast === tag.cast) s.dive.hit = true   // one hit per cast (blocked too)
  if (tag.wm === "roar" && !blocked && !s.push) s.push = { dir: cx(target) >= cx(f) ? 1 : -1, n: 0 }
  if (tag.wm === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (blocked) return
  if (tag.scent) markScent(s)
  if (tag.wm !== "ultOpen") gainFury(f, s, tag.wm === "pounce" ? WM_FURY.POUNCE : WM_FURY.HIT)
}

// ── ULTIMATE: PRIMAL HUNT (same input as Omnitrix Overload, alien form only) ─────────────────────────────────
// 55 Power. Needs a clean opener — a pounce-style lunge (RUN leap frames, 260 px, 40); whiff / block = no cinematic, 60f
// recovery. On a clean opener the opponent is held (no collision change) and:
//   1. the stage darkens (render only; both fighters stay readable) and Wildmutt circles them by scent — between passes only a
//      procedural pixel scent trail and his silhouette are visible;
//   2. THE HUNT: 6 slashes × 18 = 108 from hash(seed, frame, player index)-chosen angles (Walk / heavy-swipe / leap frames +
//      procedural claw streaks);
//   3. FINAL ROAR: ROAR f1–5 point blank, rings, ground bounce: 92.
// 40 + 108 + 92 = 240 unscaled. Scent applies at the end; Fury 0 after. Lighting and positions restore, no persistent hazards,
// 100f recovery lockout. Streaks / darkness have no hitboxes and no GAME_STATE presence (only the hashed angles are kept).
export const WM_ULT = { OPENER_AT: 14, OPENER: 40, RANGE: 260, WHIFF: 60, SLASH_AT: [30, 42, 54, 66, 78, 90], SLASH: 18, ROAR_AT: 108, ROAR: 92,
  END: 124, LOCKOUT: 100, LAUNCH: -12, ORBIT: 92 }
function fireUltimate(f, ctx, api) {
  const s = wmState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, WM_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = WM_ULT.OPENER_AT + WM_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "wmPounce"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, angles: [], hits: [] }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, WM_ULT.OPENER_AT, () => hitbox(f, api, "wm_ult_open", face, {
    damage: WM_ULT.OPENER, spawnX: edgeX(f, face) + face * WM_ULT.RANGE / 2, spawnY: f.y + (f.h || 110) * 0.55, w: WM_ULT.RANGE, h: 70,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { wm: "ultOpen", cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "dark"; u.t = 0; u.raw = WM_ULT.OPENER; u.hits.push(WM_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = WM_ULT.END + WM_ULT.LOCKOUT; f._benPowerCommit = WM_ULT.END; f._spriteCastTimer = WM_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, WM_ULT.END + 2)               // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > WM_ULT.OPENER_AT + 12) s.ult = null; return }   // whiff / block: no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "primal_hunt", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  const k = WM_ULT.SLASH_AT.indexOf(u.t)
  if (k >= 0) {
    const seed = ctx?.seed ?? 1, fr = ctx?.frame ?? u.t, pi = pIndex(f)
    u.angles.push(Math.round(wmHash(seed, fr, pi, k) * 360))
    u.phase = "hunt"; hit(WM_ULT.SLASH, 3 + k)
  }
  if (u.t === WM_ULT.ROAR_AT) { u.phase = "roar"; hit(WM_ULT.ROAR, 16) }
  f._spriteCastMove = u.t >= WM_ULT.ROAR_AT - 10 ? "wmRoar" : slashing(u) ? (u.angles.length % 2 ? "heavy" : "wmPounce") : "walk"
  f._spriteCastTimer = 2
  if (u.t >= WM_ULT.END) endUlt(f, s, opp)
}
const slashing = u => WM_ULT.SLASH_AT.some(a => u.t >= a - 2 && u.t < a + 4)
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }       // positions restore
  if (opp && u?.thome) {                                                     // …then the roar's ground bounce
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 3; opp.vy = WM_ULT.LAUNCH
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
    markScent(s)                                                             // scent applies at the end
  }
  if (u && u.thome) { s.fury.v = 0; s.fury.idle = 0 }                        // Fury 0 after
  s.lastUltRaw = u?.raw || 0; s.lastUltAngles = u?.angles ? u.angles.slice() : []
  s.ult = null
  f.attackCooldown = WM_ULT.LOCKOUT; f._benPowerCommit = WM_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
// render-only body placement: the Pounce leap height, the ult's orbit (he is drawn around the held opponent)
function bodyOffset(f) {
  const s = wmState(f); if (!s) return null
  const p = s.pounce
  if (p && !p.hitT) { const tr = p.t - WM_POUNCE.STARTUP; if (tr >= 1 && tr <= WM_POUNCE.TRAVEL) return { dx: 0, dy: -Math.round(Math.sin(Math.PI * tr / WM_POUNCE.TRAVEL) * WM_POUNCE.ARC) } }
  const u = s.ult
  if (u && u.thome && u.t < WM_ULT.ROAR_AT - 10) {
    const a = (u.angles.length ? u.angles[u.angles.length - 1] : 0) * Math.PI / 180 + u.t * 0.09
    const tx = u.thome.x + 30, hx = u.home.x + (f.w || 60) / 2
    return { dx: Math.round(tx + Math.cos(a) * WM_ULT.ORBIT - hx), dy: Math.round(Math.sin(a) * WM_ULT.ORBIT * 0.35) }
  }
  return null
}
// render-only: between the Hunt's passes only his silhouette shows
function bodyAlpha(f) {
  const s = wmState(f); const u = s && s.ult
  if (!u || !u.thome || u.t >= WM_ULT.ROAR_AT - 10) return 1
  return slashing(u) ? 1 : 0.3
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
function rHash(a, b, c) {   // render-only deterministic hash → [0, 1) (dust / trail jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const OUT = "#2b1a06", ORANGE = "#f08a1c", PALE = "#ffe2b0", CLAW = "#fff4dc", SCENT = "rgba(190,242,100,0.75)", RED = "#ef4444", DUST = "#c8a77a"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
function drawPixelRing(c, x, y, rx, ry, col, k = 3, n = 0, phase = 0) {
  if (!(rx > 0)) return
  n = n || Math.max(12, Math.round(rx * 0.5)); c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + phase; px(c, x + Math.cos(a) * rx, y + Math.sin(a) * ry, k) }
}
// a pixel claw streak: 3 parallel arcs (outline + pale core), centred at (x, y), sweeping `ang` radians
function drawClaws(c, x, y, r, ang, face, alpha = 1) {
  c.save(); c.globalAlpha *= alpha
  for (let q = 0; q < 3; q++) for (let i = 0; i <= 8; i++) {
    const a = ang - 0.9 + i / 8 * 1.8, rr = r - q * 9
    c.fillStyle = OUT; px(c, x + face * Math.cos(a) * rr, y + Math.sin(a) * rr, 5)
    c.fillStyle = i % 2 ? CLAW : PALE; px(c, x + face * Math.cos(a) * rr, y + Math.sin(a) * rr, 3)
  }
  c.restore()
}
function dust(c, x, y, n, t, seed) {
  for (let k = 0; k < n; k++) { const a = Math.PI + rHash(seed, k, 1) * Math.PI, r = 6 + t * (2 + rHash(seed, k, 2) * 3)
    c.fillStyle = k % 2 ? DUST : "#a8875a"; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5, 4) }
}
// world-space layer under both fighters: the ult's darkness, the Ground Pound shock line, Bull Rush dust
export function drawWildmuttUnder(c, f) {
  const s = wmState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const u = s.ult
  if (u && u.thome) {                                                        // PRIMAL HUNT: the stage darkens (render only)
    const a = Math.max(0, Math.min(1, u.t / 10) * Math.min(1, (WM_ULT.END - u.t) / 10))
    c.globalAlpha = 0.62 * a; c.fillStyle = "#07040a"; c.fillRect(-4000, -4000, 16000, 12000); c.globalAlpha = 1
  }
  const g = s.gp
  if (g && g.t >= WM_GP.HITS_AT[0] - 2) {                                    // GROUND POUND: a shock line running along the floor
    const q = Math.min(1, (g.t - WM_GP.HITS_AT[0] + 2) / 10), len = WM_GP.LEN * q
    for (let x = 0; x < len; x += 6) { const h = 4 + rHash(g.cast, x, 1) * 10 * (1 - x / WM_GP.LEN)
      c.fillStyle = OUT; c.fillRect(Math.round(g.edge + g.face * x) - 2, Math.round(g.ground - h) - 1, 5, h + 2)
      c.fillStyle = x % 12 ? DUST : PALE; c.fillRect(Math.round(g.edge + g.face * x) - 1, Math.round(g.ground - h), 3, h) }
    dust(c, g.edge + g.face * len, g.ground, 6, g.t % 10, g.cast)
  }
  const r = s.rush
  if (r && r.t > WM_RUSH.STARTUP && !r.done) dust(c, cx(f) - r.face * 20, f.y + (f.h || 110), 5, r.t % 8, r.t)
  const land = s.t - s.landT
  if (land >= 0 && land < 10) dust(c, cx(f), f.y + (f.h || 110), 8, land, s.landT)
  c.restore()
}
export function drawWildmuttFx(c, f, frame = 0, opp = null) {
  const s = wmState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const fx = cx(f), fy = f.y + (f.h || 110) * 0.5, face = f.facing || 1
  if (opp && s.scent.t > 0) {                                                // SCENT: a faint trail of drifting motes on the opponent (+ the reveal)
    const ox = cx(opp), oy = opp.y + (opp.h || 110) * 0.5
    c.globalAlpha = 0.35 + 0.4 * Math.min(1, s.scent.t / 60)
    for (let k = 0; k < 9; k++) { const ph = (frame + k * 11) % 40
      c.fillStyle = k % 3 ? SCENT : "rgba(253,224,71,0.7)"
      px(c, ox + (rHash(k, frame >> 4, 1) - 0.5) * (opp.w || 60), oy + (opp.h || 110) * 0.45 - ph * 2, 3) }
    if (s.pounce && s.lastPounce && s.lastPounce.mode === "scent") {        // render-only REVEAL of the scent-locked spot
      drawPixelRing(c, s.lastPounce.lockX, oy, 26, 34, SCENT, 3, 14, frame / 12) }
    c.globalAlpha = 1
  }
  if (s.fury.frenzyT > 0) {                                                  // FRENZY: red sparks
    c.fillStyle = RED; for (let k = 0; k < 6; k++) px(c, fx + (rHash(k, frame >> 2, 3) - 0.5) * (f.w || 60) * 1.4, f.y + rHash(k, frame >> 2, 4) * (f.h || 110), 3)
  }
  const atk = f.attacking && f.currentAttack
  if (atk && (atk.name === "heavy" || atk.name === "air")) {                // HEAVY / AIR: the procedural claw arc
    const big = atk.name === "heavy"
    drawClaws(c, fx + face * (big ? 70 : 40), fy - (big ? 6 : 0), big ? 46 : 32, big ? 0 : 0.6, face, 0.9)
  }
  const p = s.pounce
  if (p && (p.hitT ? p.t - p.hitT < 10 : p.t > WM_POUNCE.STARTUP)) drawClaws(c, fx + face * 36, fy, 30, 0.3, p.face, 0.85)
  const r = s.roar
  if (r && r.t >= 4) {                                                        // ROAR: expanding pixel sound rings
    for (let q = 0; q < 3; q++) { const rr = ((r.t - 4) * 9 + q * 40) % (WM_ROAR.RADIUS + 40)
      drawPixelRing(c, fx + face * 20, fy - 10, rr, rr * 0.7, q === 0 ? CLAW : PALE, 3, 0, q) }
  }
  const m = s.maul
  if (m && m.held) drawClaws(c, fx + face * 40, fy, 24, (m.h % 10) / 5, face, 0.8)
  const u = s.ult
  if (u && u.thome && opp) {                                                  // PRIMAL HUNT: scent orbit, claw streaks, final roar rings
    const ox = u.thome.x + (opp.w || 60) / 2, oy = u.thome.y + (opp.h || 110) * 0.5
    c.fillStyle = SCENT; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2 + u.t * 0.05; px(c, ox + Math.cos(a) * WM_ULT.ORBIT, oy + Math.sin(a) * WM_ULT.ORBIT * 0.35 + 30, 3) }
    WM_ULT.SLASH_AT.forEach((at, k) => { const d = u.t - at; if (d >= 0 && d < 8 && u.angles[k] != null) {
      const a = u.angles[k] * Math.PI / 180; drawClaws(c, ox, oy, 54, a, 1, 1 - d / 8) } })
    if (u.t >= WM_ULT.ROAR_AT - 6) { const q = u.t - WM_ULT.ROAR_AT + 6
      for (let k = 0; k < 3; k++) drawPixelRing(c, ox, oy, 20 + q * 7 + k * 24, (20 + q * 7 + k * 24) * 0.7, k ? PALE : CLAW, 4, 0, k) }
  }
  c.restore()
}
export function drawWildmuttHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = wmState(f); if (!ctx || !s) return
  const y = enY + enH + 3, w = Math.max(60, (pbw || 120) - 40), bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  const u = s.fury
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, w, 5)
  ctx.fillStyle = u.frenzyT > 0 ? RED : u.exhaustT > 0 ? "#6b7280" : ORANGE
  const fill = u.frenzyT > 0 ? u.frenzyT / WM_FURY.FRENZY : u.v / WM_FURY.MAX
  ctx.fillRect(flip ? bx + w - Math.round(w * fill) : bx, y, Math.round(w * fill), 5)
  ctx.fillStyle = "#fde68a"; const m = Math.round(w * WM_ROAR.MIN / WM_FURY.MAX); ctx.fillRect(flip ? bx + w - m : bx + m, y - 1, 1, 7)   // the Roar line
  ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.font = "bold 7px Arial"
  ctx.fillStyle = u.frenzyT > 0 ? "#fca5a5" : "#e5e7eb"
  const label = u.frenzyT > 0 ? `FRENZY ${Math.ceil(u.frenzyT / 60)}s` : u.exhaustT > 0 ? "EXHAUSTED" : `FURY ${Math.round(u.v)}`
  ctx.fillText(`${label}${s.scent.t > 0 ? `  SCENT ${Math.ceil(s.scent.t / 60)}s` : ""}`, flip ? bx + w : bx, y + 7)
  ctx.restore()
}
