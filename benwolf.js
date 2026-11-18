// benwolf.js — BENWOLF (Loboan), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (night tint, full
// moon, stars, ring glow, rim light, claw sparks, shake) never write it. Simulation randomness: hash(match seed, frame,
// player index) only. Sheet by Dragonrod: docs/ben10/aliens/benwolf/SPRITE_LEDGER.md.
import { BENWOLF_ANIM, BENWOLF_GEOM, BENWOLF_FX } from "./benwolfAssets.js"
export { BENWOLF_ANIM, BENWOLF_GEOM, BENWOLF_FX }

export const BW_KEY = "benwolf"
const ANIM = { ...BENWOLF_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const BENWOLF = {
  id: BW_KEY, poolKey: BW_KEY, displayName: "BenWolf", slot: 18,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Arcticguana (17)
  status: "ready", sheetPath: "./ben10_benwolf_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/benwolf/SPRITE_LEDGER.md",
  mods: { speed: 1.15, damage: 1.05, defense: 0.95, weight: 0.85 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Sonic Howl", special2: "Claw Rake", special3: "Pounce", special4: "Rising Howl",
    special5: "Low Howl", special6: "Dive Claw", defense: "Lupine Dodge", ultimate: "Howling Moon" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 100 }),                                            // Attack f1–2
    heavy:  normal(52, 13, 4, 22, -6, { knockbackX: 6, rangeX: 170 }),                         // Attack → f2 claw swoosh, 170 px
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 130 }),                        // crouch claw, hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),   // Attack ↑ f1–2, launches
    air:    normal(28, 7, 4, 12, 2, { rangeX: 85 })                                            // the fall frame (AIR body)
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, damageDealt,
  drawHud: drawBenwolfHud, drawFx: drawBenwolfFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBenwolfState() {
  return { kind: BW_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, backPrev: false, backTapT0: -999, backTapT: -999, dodgeTapT: -999, lastDir: 5,
    scent: { pips: 0, lastT: -999, pipped: [], hunted: 0, immuneT: 0, hunts: 0, reaims: 0, ends: [] },
    stats: { casts: 0, scentHits: 0, huntedBonus: 0 } }
}
export const bwState = f => (f?.omnitrix?.formState?.kind === BW_KEY && f.transformed && f.activeAlien === BW_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshBenwolfState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }     // the applied (×mods) values; buffs scale from these
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function bwHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp), filled by the sections below, run in order
function tick(f, input, ctx, api) {
  const s = bwState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference (tag lookups / render)
  api0 = api
  tickInputs(f, s, input)
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  for (const fn of TICKS) fn(f, s, input, api, opp)
  s.noAttack = busy(s)
}
const BUSY = []    // predicates: a cast owns him
const busy = s => BUSY.some(p => p(s))
let projRef = null, api0 = null   // the engine's live projectile list + the api of the last tick (hooks called outside the tick)
// moveFrames hook (combat.startMove): no normals while a cast owns him (later sections add Lupine Dodge + the moon's −1f)
const MOVE_FRAMES = []
function moveFrames(f, key, md) {
  const s = bwState(f); if (!s || !md) return md
  for (const fn of MOVE_FRAMES) { const r = fn(f, s, key, md); if (r !== undefined) return r }
  if (busy(s)) return false
  return md
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) SONIC HOWL   ↓↙← + P (214) POUNCE   →↓↘ + P (623) RISING HOWL   ←↙↓ + P (412) LOW HOWL
//   →→ + P (a frame-counted double tap) CLAW RAKE          air: ↓ + P (any air Special) DIVE CLAW (once per airtime)
//   ←← + Light (a frame-counted double tap) LUPINE DODGE
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Sonic Howl, ← Pounce,
// ↑ Rising Howl, ↓ Low Howl, → after a double tap Claw Rake.
export const BW_DASH_WINDOW = 14, BW_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= BW_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  if (back && !s.backPrev && !input.down) { if (s.t - s.backTapT0 <= BW_DASH_WINDOW) s.backTapT = s.t; s.backTapT0 = s.t }
  s.fwdPrev = fwd; s.backPrev = back
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "rise"], ["412", "low"], ["214", "pounce"], ["236", "howl"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= BW_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "dive"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "pounce"
  if (dir === "U") return "rise"
  if (dir === "D") return "low"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= BW_DASH_WINDOW) return "rake"
  return "howl"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const BW_COST = { howl: 12, howlHold: 4, rake: 12, pounce: 14, rise: 14, low: 12, dive: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = bwState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate (Phase 5)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── HUD (render-only) ──────────────────────────────────────────────────────────────────────────────────────────
const MOON = "#f5f3d7", MOON2 = "#c9c4a0", NIGHT = "#1e2a5a", INK = "#0b1022", RING = "#3f48cc", RING2 = "#99d9ea", SCENT = "#b5e61d", PAW = "#e8e1c0"
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row, filled by the sections below
export function drawBenwolfHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = bwState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}

const CONTACT = []   // onContact handlers (filled by the sections below)
function onContact(f, target, info) {
  const s = bwState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const DEALT = []     // damageDealt multipliers (f, s, target, raw, opts) → raw, filled by the sections below
function damageDealt(f, target, raw, opts) {
  const s = bwState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}
// his own ultimate's damage (the opener / capture) is authored as a fixed total: never boosted by Hunted or the Full Moon
const isUltHit = opts => /^bw_ult/.test(String(opts.move || "")) || !!(opts.proj && opts.proj.alien && opts.proj.alien.bw === "ultOpen")

// ── 3. SCENT → HUNTED (opponent status, GAME_STATE) ─────────────────────────────────────────────────────────────
// SCENT: CLEAN hits from Claw Rake (its finisher), Pounce and Dive Claw add 1 pip — ONE per cast however many hit ticks
// land (a cast id on the tag). Max 3. Never from blocks, FX or howls (only tags carrying `scent` count). Pips expire 240f
// after the last one.
// HUNTED: the 3rd pip consumes them → 180f: BenWolf deals +10% damage to them (damageDealt), and his Pounce gets ONE mid-air
// re-aim 12f into the leap toward their position at that frame (once per Pounce, no tracking after, still bounded to its
// 360 px range — section 4). Their input polling and the simulation clock are untouched. No refresh while active; 360f
// immunity after (no pips). Render-only paw-print glyph. Swap / revert / KO / rematch: a fresh formState (cleared).
export const BW_SCENT = { MAX: 3, EXPIRE: 240, HUNTED: 180, IMMUNE: 360, DMG: 1.10, REAIM_AT: 12 }
export const hunted = s => !!(s && s.scent.hunted > 0)
export function addScent(f, s, opp, cast) {
  const c = s.scent
  if (!opp || opp.eliminated || c.hunted > 0 || c.immuneT > 0) return false
  if (c.pipped.includes(cast)) return false                               // one pip per cast
  c.pipped.push(cast); if (c.pipped.length > 8) c.pipped.shift()
  c.pips = Math.min(BW_SCENT.MAX, c.pips + 1); c.lastT = s.t; s.stats.scentHits++
  if (c.pips >= BW_SCENT.MAX) { c.pips = 0; c.hunted = BW_SCENT.HUNTED; c.hunts++ }
  return true
}
export function endHunted(s, why) {
  const c = s.scent; if (c.hunted <= 0) return
  c.hunted = 0; c.immuneT = BW_SCENT.IMMUNE; c.pips = 0; c.ends.push(why); if (c.ends.length > 6) c.ends.shift()
}
TICKS.push((f, s, input, api, opp) => {
  const c = s.scent
  if (c.immuneT > 0) c.immuneT--
  if (c.pips > 0 && s.t - c.lastT >= BW_SCENT.EXPIRE) c.pips = 0
  if (c.hunted > 0) { if (!opp || opp.eliminated || !(opp.health > 0)) endHunted(s, "ko"); else if (--c.hunted <= 0) { c.hunted = 1; endHunted(s, "timer") } }
})
CONTACT.push((f, s, target, { proj, blocked }) => { const tag = proj && proj.alien; if (!blocked && tag && tag.scent) addScent(f, s, target, tag.cast) })
DEALT.push((f, s, target, raw, opts) => (hunted(s) && !isUltHit(opts) ? raw * BW_SCENT.DMG : raw))

// ── RENDER-ONLY world overlays (read GAME_STATE, never write it) ───────────────────────────────────────────────
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers, filled by the sections below
export function drawBenwolfFx(c, f, frame = 0, opp = null) {
  const s = bwState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
  if (opp) drawScent(c, s, opp, frame)
}
// the pixel paw print (4 toes + a pad), integer-scaled
export function pawPrint(c, x, y, k = 2, col = PAW) {
  c.fillStyle = INK; for (const [dx, dy, w, h] of [[-4, -1, 4, 3], [-2, -4, 3, 3], [1, -4, 3, 3], [3, -1, 4, 3], [-3, 2, 7, 5]]) c.fillRect(Math.round(x + (dx - 1) * k), Math.round(y + (dy - 1) * k), (w + 2) * k, (h + 2) * k)
  c.fillStyle = col; for (const [dx, dy, w, h] of [[-4, -1, 3, 2], [-2, -4, 2, 2], [1, -4, 2, 2], [3, -1, 3, 2], [-3, 2, 6, 4]]) c.fillRect(Math.round(x + dx * k), Math.round(y + dy * k), w * k, h * k)
}
function drawScent(c, s, opp, frame) {
  const sc = s.scent, ox = cx(opp), top = opp.y - 14
  c.save()
  if (sc.pips > 0) for (let i = 0; i < BW_SCENT.MAX; i++) {                 // SCENT pips
    const x = ox + (i - 1) * 12
    c.fillStyle = INK; px(c, x, top, 8); c.fillStyle = i < sc.pips ? SCENT : "#3b4252"; px(c, x, top, 5)
  }
  if (sc.hunted > 0) {                                                      // HUNTED: the paw print over them (blinks in its last second)
    if (sc.hunted > 60 || (frame >> 3) % 2 === 0) pawPrint(c, ox, top - 4, 2, sc.hunted > 60 ? PAW : SCENT)
  }
  c.restore()
}
