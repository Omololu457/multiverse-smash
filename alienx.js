// alienx.js — ALIEN X (Celestialsapien), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
// No randomness in the simulation.
import { ALIENX_ANIM, ALIENX_GEOM } from "./alienxAssets.js"
export { ALIENX_ANIM, ALIENX_GEOM }

// axVoice = the Stance frame held during a 20f voice switch (render alias; no new art)
const ANIM = { ...ALIENX_ANIM, axVoice: ALIENX_ANIM.guard }
// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

// DELIBERATION IS COSTLY: Omnitrix Power drains ×1.5 while Alien X is active (~13 s from full; base 5/s → 7.5/s).
export const AX_DRAIN_MULT = 1.5
// THREE VOICES (stance, GAME_STATE): Block + Light taps cycle Ben → Bellicus → Serena → Ben. 20f switch (Stance frame),
// 120f cooldown, refused in hitstun, during his own active frames and during the ultimate. Resets to Ben on swap / revert /
// KO / rematch (fresh formState) and after the ultimate.
//   BEN      balanced: base values; the only voice whose Decree hits build Void pips.
//   BELLICUS aggression: damage +20%, defense −15%, Decree startup +2f.
//   SERENA   restraint: defense +20%, damage −15%, guard drains 40% slower (block chip ×0.6), Decree Power −3 (min 6).
export const AX_VOICES = ["ben", "bellicus", "serena"]
export const AX_VOICE = { SWITCH: 20, COOLDOWN: 120, SWALLOW: 10,
  ben:      { dmg: 1.00, def: 1.00, startup: 0, cost: 0, chip: 1.0, label: "BEN" },
  bellicus: { dmg: 1.20, def: 0.85, startup: 2, cost: 0, chip: 1.0, label: "BELLICUS" },
  serena:   { dmg: 0.85, def: 1.20, startup: 0, cost: -3, chip: 0.6, label: "SERENA" } }
export const AX_MIN_DECREE_COST = 6
// VOID → UNMADE (status on the OPPONENT, owned by this form's GAME_STATE — swap / revert / KO clear it). Clean hits from
// Nullify, Gravity and Void Grasp add ONE pip per cast (however many ticks hit), max 3, Ben voice only; none from blocks,
// FX or Starfall Dash. Pips expire 240f after the last. 3 pips → UNMADE (pips consumed): for 300f the opponent's NEXT
// special is negated (startup plays, Power spent, no hitbox / projectile — abilities.triggerSpecial negate hook).
// Consumed on use or when the 300f expire; no refresh while active; 420f immunity after.
export const AX_VOID = { MAX: 3, EXPIRE: 240, UNMADE: 300, IMMUNE: 420 }

export const ALIENX = {
  id: "alienx", poolKey: "alienx", displayName: "Alien X", slot: 7,
  status: "ready", sheetPath: "./ben10_alienx_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/alienx/SPRITE_LEDGER.md",
  mods: { speed: 0.80, damage: 1.20, defense: 1.25, weight: 1.40 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  drainMult: AX_DRAIN_MULT,                     // per-alien Power drain multiplier hook (fighters.updateTransformDevice)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Nullify", special2: "Gravity", special3: "Rewind", special4: "Void Grasp", special5: "Starfall Dash",
    ultimate: "Absolute Decree" },
  basic_attacks: {
    light:  normal(22, 6, 3, 12, 0),                                                      // Attacks f1
    heavy:  normal(64, 15, 4, 26, -7, { knockbackX: 8, rangeX: 190 }),                     // Attacks f2-4, 190 px
    down:   normal(30, 8, 3, 16, -4, { hitLevel: "low" }),                                 // Attacks f5-6, hits low
    up:     normal(54, 13, 4, 28, -10, { launcher: true, launchVy: -15, selfVy: 0 }),      // Attacks f8-9
    air:    normal(36, 8, 4, 12, 2)                                                        // Attacks f10
  },
  anim: ANIM,
  onApply, tick, moveFrames, damageTaken, negateSpecial,
  drawHud: drawAlienXHud, drawFx: drawAlienXFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshAlienXState() {
  return { kind: "alienx", t: 0, castId: 0, baseDmg: 1.0,
    voice: "ben", switchT: 0, voiceCd: 0, prevBL: false, swallowL: 0, switches: 0, ult: null,
    void: { pips: 0, pipT: 0, lastPipCast: -1, unmadeT: 0, immune: 0, unmades: 0, negated: 0, negatedAt: -999 } }
}
export const axState = f => (f?.omnitrix?.formState?.kind === "alienx" && f.transformed && f.activeAlien === "alienx") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshAlienXState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? ALIENX.mods.damage   // mods.damage × Vow (set by applyAlien)
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = axState(f); if (!s) return
  s.t++
  tickVoice(f, s, input || {})
  applyVoiceMods(f, s)
  tickVoid(s)
}

// ── THREE VOICES ──────────────────────────────────────────────────────────────────────────────────────────
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
export const voiceOf = s => AX_VOICE[(s && s.voice) || "ben"]
export function canSwitchVoice(f, s) {
  return !!s && s.switchT <= 0 && s.voiceCd <= 0 && !((f.hitstun || 0) > 0) && !inOwnActiveFrames(f) && !s.ult
}
export function cycleVoice(f, s) {
  if (!canSwitchVoice(f, s)) return false
  s.voice = AX_VOICES[(AX_VOICES.indexOf(s.voice) + 1) % AX_VOICES.length]
  s.switchT = AX_VOICE.SWITCH; s.voiceCd = AX_VOICE.COOLDOWN; s.switches++
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.attackCooldown = Math.max(f.attackCooldown || 0, AX_VOICE.SWITCH); f.vx = 0
  f._spriteCastMove = "axVoice"; f._spriteCastTimer = AX_VOICE.SWITCH
  f.colorFlash = Math.max(f.colorFlash || 0, 8)
  return true
}
export function resetVoice(s) { if (s) { s.voice = "ben"; s.switchT = 0 } }
// Block + Light (raw held buttons, edge on Light while Block is held). The Light press is swallowed: the jab is refused
// (moveFrames) while Block is held and until Light has been released for one input-buffer window (10f).
function tickVoice(f, s, input) {
  if (s.switchT > 0) { s.switchT--; f.vx = 0 }
  if (s.voiceCd > 0) s.voiceCd--
  const bl = !!(input.block && input.light)
  if (bl && !s.prevBL) cycleVoice(f, s)
  s.prevBL = bl
  if (input.light && (input.block || s.swallowL > 0)) s.swallowL = AX_VOICE.SWALLOW
  else if (s.swallowL > 0) s.swallowL--
}
// stance modifiers: damage / defense multipliers re-derived every frame from the form's base (mods × Vow)
function applyVoiceMods(f, s) {
  const v = voiceOf(s)
  f.damageMultiplier = s.baseDmg * v.dmg
  f.defenseMultiplier = ALIENX.mods.defense * v.def
}
// Decree timing / cost under the current voice (Bellicus +2f startup; Serena −3 Power, min 6)
export const decreeStartup = (s, base) => base + voiceOf(s).startup
export const decreeCost = (s, base) => voiceOf(s).cost ? Math.max(AX_MIN_DECREE_COST, base + voiceOf(s).cost) : base
// moveFrames hook (combat.startMove): refuse the jab while a Block + Light voice tap is being swallowed / Block is held.
function moveFrames(f, key, md) {
  const s = axState(f); if (!s) return md
  if (key === "light" && (s.swallowL > 0 || f.isBlocking)) return false
  if (s.switchT > 0) return false                                         // the 20f switch is committed
  return md
}
// damageTaken hook (combat.applyScaledDamage): Serena's guard drains 40% slower = block chip ×0.6.
function damageTaken(f, raw, opts) {
  const s = axState(f); if (!s) return raw
  if (opts && opts.source === "block-chip") return raw * voiceOf(s).chip
  return raw
}

// ── VOID → UNMADE ─────────────────────────────────────────────────────────────────────────────────────────
function tickVoid(s) {
  const v = s.void
  if (v.pips > 0 && --v.pipT <= 0) { v.pips = 0; v.pipT = 0 }
  if (v.unmadeT > 0) { if (--v.unmadeT <= 0) { v.unmadeT = 0; v.immune = AX_VOID.IMMUNE } }
  else if (v.immune > 0) v.immune--
}
// one pip per CAST (a cast id), Ben voice only, never while Unmade is active or the opponent is immune
export function addVoid(s, cast) {
  const v = s.void
  if (cast == null || cast === v.lastPipCast) return false
  if (s.voice !== "ben") return false
  if (v.unmadeT > 0 || v.immune > 0) return false
  v.lastPipCast = cast
  v.pips = Math.min(AX_VOID.MAX, v.pips + 1); v.pipT = AX_VOID.EXPIRE
  if (v.pips >= AX_VOID.MAX) { v.pips = 0; v.pipT = 0; v.unmadeT = AX_VOID.UNMADE; v.unmades++ }
  return true
}
// negateSpecial hook (abilities.triggerSpecial, asked for the fighter pressing Special): true while UNMADE is active on
// that opponent; commit = consume it (→ 420f immunity). It never changes input polling or the simulation clock.
function negateSpecial(f, target, commit) {
  const s = axState(f); if (!s || !target || target === f) return false
  const v = s.void
  if (!(v.unmadeT > 0)) return false
  if (commit) { v.unmadeT = 0; v.immune = AX_VOID.IMMUNE; v.negated++; v.negatedAt = s.t }
  return true
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const VOICE_COL = { ben: "#7dff6a", bellicus: "#f87171", serena: "#93c5fd" }
export function drawAlienXHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = axState(f); if (!ctx || !s) return
  const y = enY + enH + 3, col = VOICE_COL[s.voice] || "#fff"
  ctx.save()
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  const cd = s.voiceCd > 0 ? `  (${Math.ceil(s.voiceCd / 60)}s)` : ""
  ctx.fillStyle = col; ctx.fillText(`VOICE ${voiceOf(s).label}${s.switchT > 0 ? " …" : ""}${cd}`, flip ? x + 8 + pbw : x + 8, y)
  const v = s.void
  const vt = v.unmadeT > 0 ? "UNMADE" : v.immune > 0 ? "IMMUNE" : "◆".repeat(v.pips) + "◇".repeat(AX_VOID.MAX - v.pips)
  ctx.fillStyle = v.unmadeT > 0 ? "#c084fc" : "#e5e7eb"; ctx.fillText(`VOID ${vt}`, flip ? x + 8 + pbw : x + 8, y + 10)
  ctx.restore()
}
// world-space overlays: the UNMADE void glyph over the opponent (+ a burst when a special is negated). Render-only.
export function drawAlienXFx(c, f, frame = 0, opp = null) {
  const s = axState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  if (opp && opp._lastDrawX != null && opp._lastDrawW != null) {
    const ox = opp._lastDrawX + opp._lastDrawW / 2, oy = opp._lastDrawY - 14
    if (s.void.unmadeT > 0) drawVoidGlyph(c, ox, oy, 3, frame)
    else if (s.void.pips > 0) for (let i = 0; i < s.void.pips; i++) drawVoidGlyph(c, ox + (i - (s.void.pips - 1) / 2) * 14, oy, 1, frame)
    const since = s.t - s.void.negatedAt
    if (since >= 0 && since < 30) { c.strokeStyle = `rgba(192,132,252,${1 - since / 30})`; c.lineWidth = 3; c.beginPath(); c.arc(ox, oy + 40, 10 + since * 2, 0, Math.PI * 2); c.stroke() }
  }
  c.restore()
}
// 7×7 pixel void glyph (white ring, black core, violet rim) — procedural, render-only
export function drawVoidGlyph(c, x, y, k = 3, frame = 0) {
  const rows = [".vwwwv.", "vw...wv", "w.bbb.w", "w.b.b.w", "w.bbb.w", "vw...wv", ".vwwwv."]
  const pal = { w: "#f8fafc", v: (frame >> 3) % 2 ? "#a855f7" : "#c084fc", b: "#030712" }
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r].length; i++) {
    const ch = rows[r][i]; if (ch === ".") continue
    c.fillStyle = pal[ch]; c.fillRect(Math.round(x + (i - 3.5) * k), Math.round(y + (r - 3.5) * k), k, k)
  }
}
