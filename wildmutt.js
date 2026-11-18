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
  onApply, tick, moveFrames, damageDealt, drawFx: drawWildmuttFx
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
  if (s.scent.t > 0) s.scent.t--
  tickFacing(f, s, opp)
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
  const cut = (scented(s) ? 1 : 0) + (false && (key === "light" || key === "heavy") ? 1 : 0)
  return cut ? { ...md, startup: Math.max(1, (md.startup ?? 5) - cut) } : md
}


// damage observation: normals' clean hits (combat `applyScaledDamage` → damageDealt with source "melee") mark Scent
function damageDealt(f, target, raw, opts) {
  const s = wmState(f); if (!s) return raw
  if (opts && opts.source === "melee" && target && target !== f) markScent(s)
  return raw
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
  c.restore()
}
