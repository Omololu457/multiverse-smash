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
  onApply, tick, onContact, guardBreak, fireSpecial, fireUltimate,
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
export const EG_COST = { orb: 12, orbEx: 20, hypno: 14, gaze: 14, lowGaze: 12, openEyes: 12, ultimate: 50 }
// EYE ORB: 520 px orb, 45, one on screen. HOLD Special to charge: released < 40f = normal; held to 40f = EX ORB
// (20 Power total, 70, pierces one hit, +2 Stare). The hold can be cancelled into block.
export const EG_ORB = { DMG: 45, EX_DMG: 70, SPEED: 10, RANGE: 520, CHARGE: 40, FIRE_AT: 6, FRAMES: 26 }
// HYPNO WAVE: slow zigzag wave, 300 px, 3 ticks totalling 30, drains 12 Power from the opponent and gives Eyeguy half.
export const EG_HYPNO = { TICKS: [12, 30, 48], DMG: 10, SPEED: 5, RANGE: 300, DRAIN: 12, FRAMES: 30 }
// RISING GAZE (→↓↘ + P): 45° up beam, 400 px, 18f startup, 60, anti-air, +1 Stare, −14 on block, no invulnerability.
export const EG_GAZE = { STARTUP: 18, DMG: 60, RANGE: 400, SPEED: 28, FRAMES: 50, ON_BLOCK: -14, DP_WINDOW: 20 }
// LOW GAZE (←↙↓ + P): horizontal low beam 380 px, 2 hits 20 / 25, hits low, +1 Stare.
export const EG_LOWGAZE = { HITS: [[12, 20], [18, 25]], RANGE: 380, FRAMES: 36 }
// OPEN EYES (air ↓↘→ + P): three-orb fan down-forward, 20 each, one hit max per target (= 20), once per airtime.
export const EG_FAN = { DMG: 20, AT: [6, 9, 12], ANGLES: [20, 40, 60], SPEED: 11, LIFE: 40, FRAMES: 24 }
// ALL-SEEING EYE: clean opener 40 → 5 beams × 22 → final stare 90 = 240 raw; 3 Stare (Unblinking) at capture → final
// hit guard-breaks and is consumed. Whiff / block = no cinematic, 60f recovery; 100f lockout after.
export const EG_ULT = { OPENER_AT: 12, OPENER: 40, WHIFF_RECOVERY: 60, BEAMS_AT: [30, 42, 54, 66, 78], BEAM: 22,
  FINAL_AT: 110, FINAL: 90, END: 130, LOCKOUT: 100 }
export const EG_VISION = { TELEPORT: 120, PENDING: 30, WINDOW: 40, COOLDOWN: 120, CUT: 2 }

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshEyeguyState() {
  return { kind: "eyeguy", t: 0, castId: 0, baseDmg: 1.0,
    vision: { side: 0, oppX: null, pending: 0, sight: 0, sightCd: 0, turns: 0, cuts: 0 },
    stare: { pips: 0, pipT: 0, lastPipCast: -1, unblinkT: 0, immune: 0, unblinks: 0, breaks: 0 },
    orbHold: null, hypno: null, hypnoDrainCast: -1, gazeDp: { stage: 0, t: -999 }, fanUsed: false, fanHit: -1,
    ult: null, lastUltRaw: 0, stats: { orbs: 0, exOrbs: 0, drained: 0, gained: 0, cancels: 0 } }
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
  const grounded = !!(f.onGround || f.grounded)
  if (grounded) s.fanUsed = false                                        // Open Eyes: once per airtime
  tickMotion(f, s, input || {})
  tickOrbHold(f, s, input || {}, api)
  tickHypno(f, s, api)
  tickFan(f, s, api)
  tickUlt(f, s, api.getOpponent(f), api)
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
function onContact(f, target, { proj = null, blocked = false, dealDamage = null } = {}) {
  const s = egState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || tag.eg == null) return
  if (proj._benGuardBreak) consumeUnblinking(s)                            // the guard-break hit consumed Unblinking
  if (blocked) return
  if (tag.stare) addStare(s, tag.cast, tag.stare)
  moveContact(f, s, target, tag, dealDamage)
}
// per-move clean-hit effects
function moveContact(f, s, target, tag, dealDamage) {
  if (tag.eg === "hypno" && s.hypnoDrainCast !== tag.cast) {                 // HYPNO WAVE drain: once per cast
    s.hypnoDrainCast = tag.cast
    const amt = Math.max(0, Math.min(EG_HYPNO.DRAIN, target.energy || 0))
    target.energy = (target.energy || 0) - amt
    const gain = amt / 2
    f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + gain)
    s.stats.drained += amt; s.stats.gained += gain
  }
  if (tag.eg === "fan" && s.fanHit !== tag.cast && dealDamage) {              // OPEN EYES: one 20 per target per cast
    s.fanHit = tag.cast
    dealDamage(target, EG_FAN.DMG, { attacker: f, move: "open_eyes", source: "projectile" })
  }
  if (tag.eg === "ultOpen" && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
}

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
  // AIR normal: an eye flash at his head while the air attack is active
  if (f.attacking && f.currentAttack?.name === "air" && f._lastDrawX != null) drawEyeGlyph(c, f._lastDrawX + f._lastDrawW * 0.55, f._lastDrawY + f._lastDrawH * 0.12, 2, frame)
  // ALL-SEEING EYE: pixel eyes open around the captured opponent at hash-chosen positions; beams converge on them
  const u = s.ult
  if (u && u.phase !== "opener" && opp && opp._lastDrawX != null) {
    const ox = opp._lastDrawX + opp._lastDrawW / 2, oy = opp._lastDrawY + opp._lastDrawH / 2
    for (let i = 0; i < u.eyes; i++) {
      const hx = eyeHash(u.cast, i, 1), hy = eyeHash(u.cast, i, 2)
      const ex = ox + (hx - 0.5) * 900, ey = oy + (hy - 0.5) * 420
      const open = u.phase === "stare" ? Math.max(0.2, 1 - (u.t - (EG_ULT.FINAL_AT - 10)) / 20) : 1
      drawEyeGlyph(c, ex, ey, 3, frame, open)
      if (u.phase === "beams" && i % 5 === (u.beam ?? 0)) { c.strokeStyle = "rgba(190,242,100,0.9)"; c.lineWidth = 3; c.beginPath(); c.moveTo(ex, ey); c.lineTo(ox, oy); c.stroke() }
    }
    if (u.phase === "stare") { c.fillStyle = "rgba(190,242,100,0.85)"; const fx = f._lastDrawX + f._lastDrawW / 2; c.fillRect(Math.min(fx, ox), oy - 10, Math.abs(ox - fx), 20) }
  }
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

// ── specials (shared alien inputs: the direction held the frame Special is pressed + a frame-counted motion) ──
//   ↓↘→ + P  Eye Orb (hold to charge; air: Open Eyes)   ↓↙← + P  Hypno Wave   →↓↘ + P  Rising Gaze   ←↙↓ + P  Low Gaze
function fireSpecial(f, ctx, api) {
  const s = egState(f); if (!s) return false
  const dir = f._specialHeldDir || null, face = f.facing || 1
  if (!(f.onGround || f.grounded)) return (dir === null || dir === "F" || dir === "D") ? castOpenEyes(f, s, api, face) : false
  if (dir === "B") return castHypno(f, s, api, face)
  if (dir === "D") return castLowGaze(f, s, api, face)
  if (dir === "U" || (dir === "F" && s.gazeDp.stage === 2 && s.t - s.gazeDp.t <= EG_GAZE.DP_WINDOW)) return castGaze(f, s, api, face)
  return beginOrbHold(f, s, api)
}
// →↓↘ motion: forward (no down), then down, then the press — frame-counted in GAME_STATE (↓↘→ never starts with →).
function tickMotion(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left, down = !!input.down, dp = s.gazeDp
  if (dp.stage > 0 && s.t - dp.t > EG_GAZE.DP_WINDOW) dp.stage = 0
  if (fwd && !down) { dp.stage = 1; dp.t = s.t }
  else if (dp.stage === 1 && down) dp.stage = 2
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "eyeguy" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !s.orbHold && !s.ult
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, cost)) return false
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return true
}
const hitbox = (f, api, name, md) => api.spawnProjectile(f, name, { speed: 0, vx: 0, vy: 0, rectHitbox: true, isSpecial: true, ...md }, {})
const fxSprite = (key, scale) => { const a = EYEGUY_FX[key]; return a ? { sheet: a.sheet, spriteFrames: a.frames, spriteW: a.w, spriteH: a.h, spriteSpeed: a.speed || 4, spriteScale: scale } : {} }

// EYE ORB — hold to charge
function beginOrbHold(f, s, api) {
  if (api.activeProjectiles().some(p => p.owner === f && p.name === "eg_orb")) return false   // one on screen
  if (!beginCast(f, s, api, "egOrbHold", EG_COST.orb, 4)) return false
  s.orbHold = { t: 0, cast: s.castId }
  return true
}
function tickOrbHold(f, s, input, api) {
  const h = s.orbHold; if (!h) return
  if ((f.hitstun || 0) > 0) { s.orbHold = null; return }
  h.t++
  if (input.block) { s.orbHold = null; s.stats.cancels++; f._benPowerCommit = 0; f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0; return }   // cancel into block
  const ex = h.t >= EG_ORB.CHARGE
  if (input.special && !ex) { f._benPowerCommit = 2; f.attackCooldown = 2; f._spriteCastMove = "egOrbHold"; f._spriteCastTimer = 2; f.vx = 0; return }
  s.orbHold = null
  const charged = ex && api.spendEnergy(f, EG_COST.orbEx - EG_COST.orb)      // EX: 20 Power total
  fireOrb(f, s, api, h.cast, charged)
}
function fireOrb(f, s, api, cast, ex) {
  const face = f.facing || 1, total = EG_ORB.FRAMES
  f._spriteCastMove = ex ? "egOrbEx" : "egOrb"; f._spriteCastTimer = total
  f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  if (ex) s.stats.exOrbs++; else s.stats.orbs++
  api.scheduleBenSpawn(f, sightCut(s, EG_ORB.FIRE_AT), () => api.spawnProjectile(f, "eg_orb", {
    damage: ex ? EG_ORB.EX_DMG : EG_ORB.DMG, speed: EG_ORB.SPEED, vx: face * EG_ORB.SPEED, vy: 0,
    spawnX: f.x + f.w / 2 + face * 46, spawnY: f.y + f.h * 0.38, w: ex ? 34 : 26, h: ex ? 34 : 26, radius: ex ? 17 : 13,
    lifetime: Math.round(EG_ORB.RANGE / EG_ORB.SPEED), isSpecial: true, hitstun: ex ? 24 : 18, blockstun: 14,
    knockbackX: ex ? 7 : 5, knockbackY: -2, piercesMulti: ex || undefined, ...fxSprite("orb", ex ? 2.4 : 1.8),
    alien: { eg: "orb", beam: true, stare: ex ? 2 : 1, cast, ex } }, {}))
  return true
}

// HYPNO WAVE — slow zigzag (visual), 3 damage ticks riding it, drains Power once
function castHypno(f, s, api, face) {
  if (s.hypno) return false                                                 // one on screen
  if (!beginCast(f, s, api, "egHypno", EG_COST.hypno, EG_HYPNO.FRAMES)) return false
  const x0 = f.x + f.w / 2 + face * 40, y = f.y + f.h * 0.42
  s.hypno = { t: 0, x0, y, face, cast: s.castId, start: sightCut(s, 8) }
  return true
}
function tickHypno(f, s, api) {
  const H = s.hypno; if (!H) return
  H.t++
  const t = H.t - H.start; if (t < 0) return
  const life = Math.round(EG_HYPNO.RANGE / EG_HYPNO.SPEED), x = H.x0 + H.face * EG_HYPNO.SPEED * t
  if (t === 0) api.spawnProjectile(f, "eg_hypno_wave", { damage: 0, speed: 0, vx: H.face * EG_HYPNO.SPEED, vy: 0, spawnX: H.x0, spawnY: H.y,
    w: 60, h: 30, lifetime: life, visualOnly: true, ...fxSprite("wave", 1.6) }, {})
  if (EG_HYPNO.TICKS.includes(t)) hitbox(f, api, "eg_hypno", { damage: EG_HYPNO.DMG, spawnX: x, spawnY: H.y, w: 80, h: 60, lifetime: 2,
    noHitstop: true, hitstun: 16, blockstun: 10, knockbackX: 1, knockbackY: 0, alien: { eg: "hypno", cast: H.cast } })   // no Stare pip
  if (t >= life) s.hypno = null
}

// RISING GAZE — 45° up beam (a fast projectile along the diagonal), 18f startup, anti-air, −14 on block
function castGaze(f, s, api, face) {
  if (!beginCast(f, s, api, "egGaze", EG_COST.gaze, EG_GAZE.FRAMES)) return false
  const cast = s.castId, at = sightCut(s, EG_GAZE.STARTUP), v = EG_GAZE.SPEED / Math.SQRT2
  const blockstun = (EG_GAZE.FRAMES - at) + EG_GAZE.ON_BLOCK                 // he recovers 14f after the blocker
  api.scheduleBenSpawn(f, at, () => api.spawnProjectile(f, "eg_gaze", {
    damage: EG_GAZE.DMG, speed: 0, vx: face * v, vy: -v, spawnX: f.x + f.w / 2 + face * 34, spawnY: f.y + f.h * 0.15,
    w: 64, h: 64, rectHitbox: true, lifetime: Math.round(EG_GAZE.RANGE / EG_GAZE.SPEED), isSpecial: true,
    hitstun: 26, blockstun, knockbackX: 4, knockbackY: -9, ...fxSprite("beamDiag", 2.2), alien: { eg: "gaze", beam: true, stare: 1, cast } }, {}))
  return true
}

// LOW GAZE — horizontal low beam, 2 hits 20 / 25
function castLowGaze(f, s, api, face) {
  if (!beginCast(f, s, api, "egLowGaze", EG_COST.lowGaze, EG_LOWGAZE.FRAMES)) return false
  const cast = s.castId
  EG_LOWGAZE.HITS.forEach(([t, dmg], i) => api.scheduleBenSpawn(f, i === 0 ? sightCut(s, t) : t, () => hitbox(f, api, "eg_lowgaze", {
    damage: dmg, spawnX: f.x + f.w / 2 + face * (f.w / 2 + EG_LOWGAZE.RANGE / 2), spawnY: f.y + f.h - 16,
    w: EG_LOWGAZE.RANGE, h: 28, lifetime: 2, hitLevel: "low", noHitstop: i === 0, hitstun: i === 0 ? 14 : 22, blockstun: 10,
    knockbackX: i === 0 ? 0.5 : 5, knockbackY: 0, ...fxSprite("beamH", 3), alien: { eg: "lowGaze", beam: true, stare: 1, cast } })))
  return true
}

// OPEN EYES — air, three-orb fan down-forward; the damage is dealt once per target in onContact
function castOpenEyes(f, s, api, face) {
  if (s.fanUsed) return false
  if (!beginCast(f, s, api, "egOpenEyes", EG_COST.openEyes, EG_FAN.FRAMES, { commit: false })) return false
  s.fanUsed = true                                                          // no jump refill: jumpCount untouched
  const cast = s.castId
  EG_FAN.AT.forEach((t, i) => api.scheduleBenSpawn(f, i === 0 ? sightCut(s, t) : t, () => {
    const a = EG_FAN.ANGLES[i] * Math.PI / 180
    api.spawnProjectile(f, "eg_fan", { damage: 0, speed: 0, vx: face * Math.cos(a) * EG_FAN.SPEED, vy: Math.sin(a) * EG_FAN.SPEED,
      spawnX: f.x + f.w / 2 + face * 20, spawnY: f.y + f.h * 0.4, w: 22, h: 22, radius: 11, lifetime: EG_FAN.LIFE, isSpecial: true,
      hitstun: 16, blockstun: 10, knockbackX: 3, knockbackY: -1, ...fxSprite("orbUp", 1.4), alien: { eg: "fan", beam: true, cast } }, {})
  }))
  return true
}
function tickFan(f, s, api) {
  if (s.fanHit < 0) return
  const live = api.activeProjectiles()
  for (let i = live.length - 1; i >= 0; i--) { const p = live[i]; if (p.owner === f && p.name === "eg_fan" && p.alien && p.alien.cast === s.fanHit) live.splice(i, 1) }   // the fan hit: siblings vanish
}

// ── ultimate: ALL-SEEING EYE (same input as Omnitrix Overload, alien form only) ──────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = egState(f); if (!s) return false
  if (!beginCast(f, s, api, "egUltOpen", EG_COST.ultimate, EG_ULT.OPENER_AT + EG_ULT.WHIFF_RECOVERY)) return false
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, eyes: 0, guardBreak: false }
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, EG_ULT.OPENER_AT, () => hitbox(f, api, "eg_ult_open", {
    damage: EG_ULT.OPENER, spawnX: f.x + f.w / 2 + face * 140, spawnY: f.y + f.h * 0.4, w: 200, h: 90, lifetime: 3,
    isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0, ...fxSprite("orb", 3), alien: { eg: "ultOpen", cast: s.castId } }))
  return true                                                               // whiff / block: no capture → 60f recovery
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "flare"; u.t = 0; u.raw = EG_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  u.guardBreak = s.stare.unblinkT > 0                                       // 3 Stare at capture → final guard-break
  f.attackCooldown = EG_ULT.END + EG_ULT.LOCKOUT; f._benPowerCommit = EG_ULT.END; f._spriteCastTimer = EG_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, EG_ULT.END + 2)
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > EG_ULT.OPENER_AT + 12) s.ult = null; return }   // whiffed / blocked
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; f.vx = 0
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "all_seeing_eye", source: "ability" }); u.raw += dmg; opp.colorFlash = 8; api.shake?.(shake, 8) }
  u.eyes = Math.min(24, Math.floor(u.t / 3))                                 // render-only eye count (drawn by drawFx)
  if (u.t < EG_ULT.FINAL_AT - 10) { u.phase = "beams"; f._spriteCastMove = "egUltFlare"
    const k = EG_ULT.BEAMS_AT.indexOf(u.t); if (k >= 0) { u.beam = k; hit(EG_ULT.BEAM, 4 + k) } }
  else if (u.t < EG_ULT.END) { u.phase = "stare"; f._spriteCastMove = "egUltStare"
    if (u.t === EG_ULT.FINAL_AT) {
      if (u.guardBreak) { opp.isBlocking = false; consumeUnblinking(s) }      // pips consumed, no extra damage
      hit(EG_ULT.FINAL, 14)
    } }
  else endUlt(f, s, opp)
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = u.face * 11; opp.vy = -8 }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  f.attackCooldown = EG_ULT.LOCKOUT; f._benPowerCommit = EG_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// render-only deterministic hash for eye positions (cast id, eye index, axis) → [0, 1)
function eyeHash(a, b, c) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
