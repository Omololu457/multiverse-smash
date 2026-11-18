// diamondhead.js — DIAMONDHEAD (Petrosapien, Omniverse style), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// Registry / pool key `diamondhead_ov`: the experimental `diamondhead` entry (its own legacy engine kit + a dozen Ben 10
// harnesses) is left untouched; production players only ever see this READY Diamondhead.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (glints, facets,
// prison, rings, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sprites by Dragonrod, recolor by Arksalazar (docs/ben10/aliens/diamondhead/SPRITE_LEDGER.md).
import { DIAMONDHEAD_ANIM, DIAMONDHEAD_PRISM_ANIM, DIAMONDHEAD_FX, DIAMONDHEAD_GEOM, DIAMONDHEAD_ALT_PAL } from "./diamondheadAssets.js"
export { DIAMONDHEAD_ANIM, DIAMONDHEAD_PRISM_ANIM, DIAMONDHEAD_FX, DIAMONDHEAD_GEOM, DIAMONDHEAD_ALT_PAL }

export const DH_KEY = "diamondhead_ov"
const ANIM = { ...DIAMONDHEAD_ANIM }
const PRISM_ANIM = { ...DIAMONDHEAD_PRISM_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const DIAMONDHEAD = {
  id: DH_KEY, poolKey: DH_KEY, displayName: "Diamondhead", slot: 13,
  status: "ready", sheetPath: "./ben10_diamondhead_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/diamondhead/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.10, defense: 1.15, weight: 1.20 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Shard Shot", special2: "Prism Wall", special3: "Spike Eruption", special4: "Crystal Lance",
    special5: "Shatter Burst", special6: "Diamond Dive", ultimate: "Diamond Cathedral" },
  basic_attacks: {
    light:  normal(20, 5, 3, 10, 0, { rangeX: 100 }),                                         // ATTACK 1 f1–2
    heavy:  normal(56, 14, 4, 22, -6, { knockbackX: 7, rangeX: 190, dhLance: true }),        // ATTACK 1 f3–5, crystal lance 190 px
    down:   normal(26, 7, 3, 15, -4, { hitLevel: "low", rangeX: 120 }),                       // ATTACK 2 f1–2 blade sweep, hits low
    up:     normal(48, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // ATTACK 2 f3–4 rising swipe
    air:    normal(32, 7, 4, 11, 2)                                                           // FALL frame + blade
  },
  anim: ANIM, fx: DIAMONDHEAD_FX,
  onApply, tick, moveFrames, hurtbox,
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshDiamondheadState() {
  return { kind: DH_KEY, t: 0, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    stats: { casts: 0 } }
}
export const dhState = f => (f?.omnitrix?.formState?.kind === DH_KEY && f.transformed && f.activeAlien === DH_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshDiamondheadState()
}

const cx = o => o.x + (o.w || 60) / 2
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function dhHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = dhState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
}
// moveFrames hook (combat.startMove): normals as authored (casts refuse them from Phase 5)
function moveFrames(f, key, md) { return md }

// HEAVY: the arm extends into a crystal lance (190 px) — the lance is part of his hurtbox while it is out (whiff-punishable)
export const DH_HEAVY_LANCE = { REACH: 190, ARM_Y: 0.32, H: 30 }
function hurtbox(f) {
  const s = dhState(f); if (!s) return null
  const atk = f.attacking && f.currentAttack
  if (!(atk && (atk.dhLance || atk.name === "heavy"))) return null
  const face = f.facing || 1, edge = cx(f) + face * (f.w || 60) / 2, ext = DH_HEAVY_LANCE.REACH - (f.w || 60) / 2
  const body = { x: f.x + 6, y: f.y + 6, w: Math.max(1, (f.w || 60) - 12), h: Math.max(1, (f.h || 110) - 6) }
  const ay = f.y + (f.h || 110) * DH_HEAVY_LANCE.ARM_Y
  const x0 = Math.min(body.x, edge, edge + face * ext), x1 = Math.max(body.x + body.w, edge, edge + face * ext)
  return { x: x0, y: Math.min(body.y, ay), w: x1 - x0, h: Math.max(body.y + body.h, ay + DH_HEAVY_LANCE.H) - Math.min(body.y, ay) }
}
