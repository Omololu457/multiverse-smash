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
  onApply, tick, onContact, guardBreak,
  drawHud: drawEyeguyHud, drawFx: drawEyeguyFx
}

// ── tuning (from the brief) ───────────────────────────────────────────────────────────────────────────────
// 360° VISION: the opponent crossing behind him (side flip) or reappearing behind him (a jump > TELEPORT px in one
// frame — crossup, teleport, Blur Step) → he instantly faces them, idle / blocking / in startup or recovery, never in
// hitstun or his own move's active frames (a pending turn waits up to PENDING frames for a legal frame).
// COUNTER-SIGHT: after such a turn, his next normal or special within WINDOW frames starts 2f sooner (min 1f); once
// per COOLDOWN frames. Guard: the shared guard is omnidirectional (isBlocking, no facing test) — crossups are blocked
// by the ordinary rules, unblockables / throws are not; the turn corrects the guard pose's facing.
// STARE → UNBLINKING (status on the OPPONENT, owned by this form's GAME_STATE — swap / revert / KO clear it).
export const EG_STARE = { MAX: 3, EXPIRE: 240, UNBLINK: 180, IMMUNE: 300 }
export const EG_VISION = { TELEPORT: 120, PENDING: 30, WINDOW: 40, COOLDOWN: 120, CUT: 2 }

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshEyeguyState() {
  return { kind: "eyeguy", t: 0, castId: 0, baseDmg: 1.0,
    vision: { side: 0, oppX: null, pending: 0, sight: 0, sightCd: 0, turns: 0, cuts: 0 },
    stare: { pips: 0, pipT: 0, lastPipCast: -1, unblinkT: 0, immune: 0, unblinks: 0, breaks: 0 } }
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
  tickStare(s)
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

// ── STARE → UNBLINKING ────────────────────────────────────────────────────────────────────────────────────
// Clean hits from Eye Orb, Rising Gaze and Low Gaze add ONE pip per cast (the charged EX Orb adds 2), max 3, expiring
// 240f after the last; none from blocks, FX or Hypno Wave. 3 pips → UNBLINKING 180f: his next beam / orb hit ignores
// the guard once (guard-break, full damage) and is consumed. No refresh while active; 300f immunity after it is
// consumed or expires.
function tickStare(s) {
  const a = s.stare
  if (a.pips > 0 && --a.pipT <= 0) { a.pips = 0; a.pipT = 0 }
  if (a.unblinkT > 0) { if (--a.unblinkT <= 0) { a.unblinkT = 0; a.immune = EG_STARE.IMMUNE } }
  else if (a.immune > 0) a.immune--
}
export function addStare(s, cast, n = 1) {
  const a = s.stare
  if (cast == null || cast === a.lastPipCast) return false                 // one award per cast, however many ticks hit
  if (a.unblinkT > 0 || a.immune > 0) return false                         // no refresh while Unblinking / immune
  a.lastPipCast = cast
  a.pips = Math.min(EG_STARE.MAX, a.pips + n); a.pipT = EG_STARE.EXPIRE
  if (a.pips >= EG_STARE.MAX) { a.pips = 0; a.pipT = 0; a.unblinkT = EG_STARE.UNBLINK; a.unblinks++ }
  return true
}
export function consumeUnblinking(s) {
  const a = s.stare; if (a.unblinkT <= 0) return false
  a.unblinkT = 0; a.immune = EG_STARE.IMMUNE; a.breaks++
  return true
}
// Generic guardBreak hook: Unblinking makes his next BEAM / ORB projectile ignore a held guard once.
function guardBreak(f, target, { proj = null } = {}) {
  const s = egState(f); if (!s || !proj || proj.visualOnly) return false
  return s.stare.unblinkT > 0 && !!(proj.alien && proj.alien.beam)
}
// Called by combat after a contact this form OWNS lands (projectiles: blocked or clean).
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = egState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || tag.eg == null) return
  if (proj._benGuardBreak) consumeUnblinking(s)                            // the guard-break hit consumed Unblinking
  if (blocked) return
  if (tag.stare) addStare(s, tag.cast, tag.stare)
  moveContact(f, s, target, tag)
}
function moveContact() {}                                                   // per-move clean-hit effects (Phase 5)

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
export function drawEyeguyHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = egState(f); if (!ctx || !s) return
  const a = s.stare, y = enY + enH + 3, h = 5
  const col = a.unblinkT > 0 ? "#f472b6" : "#d4e157"
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const ratio = a.unblinkT > 0 ? a.unblinkT / EG_STARE.UNBLINK : a.pips / EG_STARE.MAX
  const w = pbw * Math.max(0, Math.min(1, ratio))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const pips = a.unblinkT > 0 ? "UNBLINKING" : a.immune > 0 ? "IMMUNE" : "◉".repeat(a.pips) + "○".repeat(EG_STARE.MAX - a.pips)
  const sight = s.vision.sight > 0 ? "   COUNTER-SIGHT" : ""
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(`STARE ${pips}${sight}`, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
// Unblinking: a pixel eye glyph over the opponent's head (render-only).
export function drawEyeguyFx(c, f, frame = 0, opp = null) {
  const s = egState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  if (s.stare.unblinkT > 0 && opp && opp._lastDrawX != null && opp._lastDrawW != null) drawEyeGlyph(c, opp._lastDrawX + opp._lastDrawW / 2, opp._lastDrawY - 12, 3, frame)
  c.restore()
}
export function drawEyeGlyph(c, x, y, k = 3, frame = 0, open = 1) {
  // 7×5 pixel eye (white sclera, pink iris, black pupil) — procedural, render-only
  const rows = ["..www..", ".wwpww.", "wwpbpww", ".wwpww.", "..www.."]
  const pal = { w: "#f8fafc", p: "#f472b6", b: "#111827" }
  const h = Math.max(1, Math.round(rows.length * open)), y0 = Math.round(y - h * k / 2)
  for (let r = 0; r < h; r++) {
    const row = rows[Math.floor(r / open)] || rows[2]
    for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === ".") continue; c.fillStyle = pal[ch]; c.fillRect(Math.round(x + (i - 3.5) * k), y0 + r * k, k, k) }
  }
}
