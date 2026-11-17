// eyeguy.js — EYEGUY (Opticoid), a READY Omnitrix alien (registry entry + Dragonrod sheet + ledger).
// Leaf module: no engine imports. The engine reaches it only through the generic ready-form hooks
// (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate — see docs/ben10/ADD_ALIEN.md),
// which pass an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
import { EYEGUY_ANIM, EYEGUY_FX, EYEGUY_EX_FRAMES, EYEGUY_GEOM } from "./eyeguyAssets.js"
export { EYEGUY_ANIM, EYEGUY_FX, EYEGUY_EX_FRAMES, EYEGUY_GEOM }

const ANIM = EYEGUY_ANIM
// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const EYEGUY = {
  id: "eyeguy", poolKey: "eyeguy", displayName: "Eyeguy", slot: 6,
  status: "ready", sheetPath: "./ben10_eyeguy_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/eyeguy/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.15, defense: 1.05, weight: 1.10 },
  movement: "grounded", maxJumps: 2,
  moves: { jab: "Jab", heavy: "Claw Swipe", low: "Low", launcher: "Launcher", air: "Air Eye Flash",
    special1: "Eye Orb", special2: "Hypno Wave", special3: "Rising Gaze", special4: "Low Gaze", special5: "Open Eyes",
    ultimate: "All-Seeing Eye" },
  basic_attacks: {
    light:  normal(20, 5, 3, 12, 0),                                                     // attack f1
    heavy:  normal(58, 14, 4, 24, -6, { knockbackX: 8, rangeX: 150 }),                   // attack f2-3 claw swipe, 150 px
    down:   normal(28, 7, 3, 16, -4, { hitLevel: "low" }),                               // attack ↓ f1, hits low
    up:     normal(50, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // attack ↑ f1-2
    air:    normal(32, 7, 4, 12, 2)                                                      // fall frame + eye flash
  },
  anim: ANIM, fx: EYEGUY_FX,
  onApply, tick
}

// ── tuning (from the brief) ───────────────────────────────────────────────────────────────────────────────
// 360° VISION: the opponent crossing behind him (side flip) or reappearing behind him (a jump > TELEPORT px in one
// frame — crossup, teleport, Blur Step) → he instantly faces them, idle / blocking / in startup or recovery, never in
// hitstun or his own move's active frames (a pending turn waits up to PENDING frames for a legal frame).
// COUNTER-SIGHT: after such a turn, his next normal or special within WINDOW frames starts 2f sooner (min 1f); once
// per COOLDOWN frames. Guard: the shared guard is omnidirectional (isBlocking, no facing test) — crossups are blocked
// by the ordinary rules, unblockables / throws are not; the turn corrects the guard pose's facing.
export const EG_VISION = { TELEPORT: 120, PENDING: 30, WINDOW: 40, COOLDOWN: 120, CUT: 2 }

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshEyeguyState() {
  return { kind: "eyeguy", t: 0, castId: 0, baseDmg: 1.0,
    vision: { side: 0, oppX: null, pending: 0, sight: 0, sightCd: 0, turns: 0, cuts: 0 } }
}
export const egState = f => (f?.omnitrix?.formState?.kind === "eyeguy" && f.transformed && f.activeAlien === "eyeguy") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshEyeguyState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? EYEGUY.mods.damage   // mods.damage × Vow (set by applyAlien)
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = egState(f); if (!s) return
  s.t++
  tickVision(f, s, api.getOpponent(f))
  tickCounterSightNormal(f, s)
}

// ── 360° VISION ───────────────────────────────────────────────────────────────────────────────────────────
const cx = o => o.x + (o.w || 60) / 2
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
function tickVision(f, s, opp) {
  const v = s.vision
  if (v.sight > 0) v.sight--
  if (v.sightCd > 0) v.sightCd--
  if (v.pending > 0) v.pending--
  if (!opp || opp.eliminated) { v.side = 0; v.oppX = null; return }
  const d = cx(opp) - cx(f), side = d > 0 ? 1 : d < 0 ? -1 : 0
  const jumped = v.oppX != null && Math.abs(cx(opp) - v.oppX) > EG_VISION.TELEPORT
  const crossed = v.side !== 0 && side !== 0 && side !== v.side
  if ((crossed || jumped) && side !== 0 && side !== (f.facing || 1)) v.pending = EG_VISION.PENDING   // opponent now behind him
  v.side = side || v.side; v.oppX = cx(opp)
  if (v.pending > 0 && side !== 0) {
    if (side === (f.facing || 1)) { v.pending = 0; return }                    // already facing them (e.g. walked round)
    if ((f.hitstun || 0) > 0 || inOwnActiveFrames(f)) return                  // never in hitstun / own active frames
    f.facing = side; v.pending = 0; v.turns++                                 // INSTANT TURN, no cost
    if (v.sightCd <= 0) { v.sight = EG_VISION.WINDOW; v.sightCd = EG_VISION.COOLDOWN }   // COUNTER-SIGHT armed
  }
}
// Counter-sight on a NORMAL: the engine starts the ordinary move; the same frame (the form tick runs after combat
// input) its startup is cut by 2f (min 1f), recovery unchanged. Consumed by the first move.
function tickCounterSightNormal(f, s) {
  const a = f.attacking && f.currentAttack
  if (!a || a._egSeen) return
  a._egSeen = true
  if (s.vision.sight <= 0) return
  const cut = Math.min(EG_VISION.CUT, Math.max(0, (a.activeStart || 0) - 1))
  a.activeStart -= cut; if (a.activeEnd != null) a.activeEnd -= cut; a.total -= cut; a.timer -= cut
  a._egCounterSight = cut
  s.vision.sight = 0; s.vision.cuts++
}
// Counter-sight on a SPECIAL: the cast's spawn delay is cut by 2f (min 1f). Consumed by the first special.
export function sightCut(s, delay) {
  if (!s || s.vision.sight <= 0) return delay
  s.vision.sight = 0; s.vision.cuts++
  return Math.max(1, delay - EG_VISION.CUT)
}
