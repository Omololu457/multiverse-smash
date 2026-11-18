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
  onApply, tick, moveFrames
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
}
const busy = s => !!(s.pounce || s.gp || s.maul || s.roar || s.rush || s.dive || s.ult)
// moveFrames hook (combat.startMove): no normals while a cast owns him (the Phase 3+ kit adds Scent / Frenzy startup cuts)
function moveFrames(f, key, md) { const s = wmState(f); if (!s || !md) return md; return busy(s) ? false : md }
