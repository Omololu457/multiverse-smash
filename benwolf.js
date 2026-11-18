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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, damageDealt, damageTaken, bodyOffset, targetOffset,
  drainMult: f => (moonOn(bwState(f)) ? BW_MOON.DRAIN : 1),   // the Full Moon's −25% Power drain (the drainMult function form, Wildvine's)
  drawHud: drawBenwolfHud, drawFx: drawBenwolfFx, drawUnder: drawBenwolfUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBenwolfState() {
  return { kind: BW_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, backPrev: false, backTapT0: -999, backTapT: -999, dodgeTapT: -999, lastDir: 5,
    howl: null, ring: null, ringUsed: null, lowRingUsed: null, rake: null, pounce: null, rise: null, low: null, lowRing: null, dive: null, diveUsed: false, dodge: null, dodgeCd: 0,
    lastHowl: null, lastRake: null, lastPounce: null, lastRise: null, lastLow: null, lastDive: null, landT: -999, ult: null, lastUlt: null,
    moonTimer: 0, moonStrength: 0, moonDur: 0, moonUsed: false, moonCasts: 0, moonEnds: [], lastE: null, regenAdded: 0,
    scent: { pips: 0, lastT: -999, pipped: [], hunted: 0, immuneT: 0, hunts: 0, reaims: 0, ends: [] },
    stats: { casts: 0, scentHits: 0, huntedBonus: 0, howls: 0, howlTicks: 0, howlHolds: 0, howlRings: 0, rakes: 0, rakeHits: 0, pounces: 0, pounceHits: 0,
      rises: 0, riseHits: 0, lows: 0, lowTicks: 0, dives: 0, diveHits: 0, dodges: 0 } }
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
const MOVE_FRAMES = [], MD_XFORM = []   // MD_XFORM: (f, s, key, md) → a (copied) md (the Full Moon's −1f startup)
function moveFrames(f, key, md) {
  const s = bwState(f); if (!s || !md) return md
  for (const fn of MOVE_FRAMES) { const r = fn(f, s, key, md); if (r !== undefined) return r }
  if (busy(s)) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
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
function fireUltimate(f, ctx, api) { return fireHowlingMoon(f, ctx, api) }

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

// ── 4. MOVES ────────────────────────────────────────────────────────────────────────────────────────────────
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction.
// Lifetime >= 2 (combat.updateProjectiles culls lifetime <= 0 before hits resolve: a 1f box never connects in the live game).
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
const MOON_CUT = []   // (s) → frames cut from every startup (the Full Moon's −1f, Phase 5)
export const startupOf = (s, n) => Math.max(1, n - MOON_CUT.reduce((a, fn) => a + fn(s), 0))
function canAct(f, s) {
  return f.transformed && f.activeAlien === BW_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, poseName, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = poseName; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}
const mouthX = (f, face) => cx(f) + face * (f.w || 60) * 0.55
const mouthY = f => f.y + (f.h || 110) * 0.3
const feetY = f => f.y + (f.h || 110)
const ownLive = (f, api, bw) => !!api && api.activeProjectiles().some(p => p && p.owner === f && p.alien && p.alien.bw === bw && p.lifetime > 0)
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
const stopCast = (f, key, s) => { s[key] = null; delete f._benLunge; delete f._benGlide }
const overlaps = (a, o) => a.x < o.x + (o.w || 60) && a.x + a.w > o.x && a.y < o.y + (o.h || 110) && a.y + a.h > o.y
const killOwn = (f, bw, cast) => { if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.bw === bw && (cast == null || p.alien.cast === cast)) p.lifetime = 0 }
BUSY.push(s => !!(s.howl || s.rake || s.pounce || s.rise || s.low || s.dive || s.dodge || s.ult))

// RINGS (Sonic Howl, Low Howl): an owner-limited travelling record in formState (one of each on screen). The first tick
// LATCHES the ring: it slows to LATCH px/f and carries the target (the pushback) through the rest of its ticks, still bounded by
// its range. Contact is a
// rectangle test in the form tick (never solid: nothing collides with a ring); each damage tick is a hidden hitbox over the
// target so blocking / scaling / hit effects stay the engine's. A ring's tick budget belongs to its CAST.
function tickRing(f, s, key, spec, opp, api) {
  const r = s[key]; if (!r) return
  const v = r.latched ? spec.LATCH : spec.SPEED; r.x += r.face * v; r.d += v           // a ring that has met its target slows and carries it
  if (r.d > spec.RANGE || r.x < s.stage.L - 40 || r.x > s.stage.R + 40) { s[key] = null; return }
  if (!opp || opp.eliminated || r.ticks >= spec.HITS.length) return
  const box = { x: r.x - spec.W / 2, y: r.y - spec.H / 2, w: spec.W, h: spec.H }
  if (!overlaps(box, opp) || s.t - r.lastHit < spec.EVERY) return
  const k = r.ticks, last = k === spec.HITS.length - 1
  r.ticks++; r.lastHit = s.t; r.latched = true; s.stats[spec.STAT]++; s[key + "Used"] = { cast: r.cast, ticks: r.ticks }
  hitbox(f, api, spec.NAME, r.face, { damage: spec.HITS[k], spawnX: cx(opp), spawnY: opp.y + (opp.h || 110) / 2, w: (opp.w || 60) + 8, h: (opp.h || 110) + 8,
    hitstun: spec.EVERY + 10, blockstun: last ? blockstunFor(spec.RECOVERY, spec.ON_BLOCK) : spec.EVERY + 6, noHitstop: !last,
    knockbackX: spec.PUSH, knockbackY: 0, hitLevel: spec.LEVEL, alien: { bw: spec.TAG, cast: r.cast, tick: k, hitLevel: spec.LEVEL } })
  if (r.ticks >= spec.HITS.length) s[key] = null                           // the budget is spent: the ring is done
}

// 1. SONIC HOWL (↓↘→ + P, 12) — Attack f3–4: 12f startup, then a ring (the sheet's ring loop) flies 450 px: 3 ticks × 10 = 30,
//    pushback, ONE ring on screen, −10 on block, no Scent. HOLD P past the release to SUSTAIN the howl up to 30f (+4 Power,
//    charged once when the hold starts): a fresh ring is re-emitted every 10f — it REPLACES the live ring (still one on
//    screen) and carries on the same cast's 3-tick budget. Releasing ends it. 18f recovery.
export const BW_HOWL = { STARTUP: 12, SPEED: 9, RANGE: 450, W: 34, H: 96, HITS: [10, 10, 10], EVERY: 6, PUSH: 5, ON_BLOCK: -10, RECOVERY: 18,
  HOLD_MAX: 30, RESPAWN: 10, LATCH: 4, NAME: "bw_sonic_howl", TAG: "howl", STAT: "howlTicks", LEVEL: "mid" }
function emitRing(f, s, key, face, cast, ticks = 0, low = false) {
  s[key] = { x: mouthX(f, face), y: low ? feetY(f) - 22 : mouthY(f) + 8, face, d: 0, cast, ticks, lastHit: -999, latched: false }
  if (key === "ring") s.stats.howlRings++
}
function castHowl(f, s, api) {
  if (!grounded(f) || s.ring) return false                                  // one on screen
  const st = startupOf(s, BW_HOWL.STARTUP), total = st + BW_HOWL.RECOVERY
  const c = beginCast(f, s, api, "bwHowl", BW_COST.howl, total); if (!c) return false
  s.howl = { t: 0, st, cast: c.cast, face: f.facing || 1, hold: 0, holding: false, paid: false, used: 0, end: total }; s.stats.howls++
  return true
}
CASTS.howl = castHowl
TICKS.push((f, s, input, api, opp) => {
  const h = s.howl
  if (h) {
    h.t++
    if ((f.hitstun || 0) > 0) { s.lastHowl = { hold: h.hold, paid: h.paid, interrupted: true }; stopCast(f, "howl", s) }
    else {
      if (h.t === h.st) emitRing(f, s, "ring", h.face, h.cast)
      if (h.t === h.st + 1 && input.special && api && api.spendEnergy(f, BW_COST.howlHold)) { h.paid = true; h.holding = true; s.stats.howlHolds++ }
      if (h.holding) {
        if (!input.special || h.hold >= BW_HOWL.HOLD_MAX) h.holding = false
        else { h.hold++; h.end = h.t + 1 + BW_HOWL.RECOVERY
          if (h.hold % BW_HOWL.RESPAWN === 0 && h.used < BW_HOWL.HITS.length) emitRing(f, s, "ring", h.face, h.cast, h.used) }   // replaces the live ring
      }
      f.attackCooldown = Math.max(f.attackCooldown || 0, h.end - h.t); f._benPowerCommit = Math.max(f._benPowerCommit || 0, h.end - h.t)
      pose(f, h.holding ? "bwHowlHold" : "bwHowl", h.end - h.t)
      if (h.t >= h.end) { s.lastHowl = { hold: h.hold, paid: h.paid, used: h.used, end: h.t }; s.howl = null }
    }
  }
  tickRing(f, s, "ring", BW_HOWL, opp, api)
  if (s.howl && s.ringUsed && s.ringUsed.cast === s.howl.cast) s.howl.used = s.ringUsed.ticks   // the cast's tick budget spent so far
})

// 2. CLAW RAKE (→→ + P, 12) — Attack → f2–4: 8f startup, then a dash slash with REAL travel (15f × 20 px = 300 px,
//    stage-clamped, no tracking). The first contact stops the dash; hits 2 / 3 follow 6f apart in front of him:
//    14 / 14 / 22 = 50, −12 on block (on the last hit). The finisher (hit 3) adds +1 Scent on a clean hit. 18f recovery.
export const BW_RAKE = { STARTUP: 8, SPEED: 20, TRAVEL: 300, HITS: [14, 14, 22], GAP: 6, ON_BLOCK: -12, RECOVERY: 18, W: 70, H: 80, REACH: 34 }
BW_RAKE.FRAMES = Math.round(BW_RAKE.TRAVEL / BW_RAKE.SPEED)
function castRake(f, s, api) {
  if (!grounded(f)) return false
  const st = startupOf(s, BW_RAKE.STARTUP), total = st + BW_RAKE.FRAMES + BW_RAKE.RECOVERY
  const c = beginCast(f, s, api, "bwRake", BW_COST.rake, total); if (!c) return false
  s.rake = { t: 0, st, cast: c.cast, face: f.facing || 1, x0: f.x, hits: 0, contact: null, end: total }; s.stats.rakes++
  return true
}
CASTS.rake = castRake
function rakeBox(f, s, d, k) {
  const last = k === BW_RAKE.HITS.length - 1
  hitbox(f, api0, "bw_claw_rake", d.face, { damage: BW_RAKE.HITS[k], spawnX: cx(f) + d.face * ((f.w || 60) / 2 + BW_RAKE.REACH), spawnY: f.y + (f.h || 110) * 0.5,
    w: BW_RAKE.W + (d.contact == null ? BW_RAKE.SPEED : 0), h: BW_RAKE.H, hitstun: last ? BW_RAKE.RECOVERY + 10 : BW_RAKE.GAP + 12,
    blockstun: last ? blockstunFor(BW_RAKE.RECOVERY, BW_RAKE.ON_BLOCK) : BW_RAKE.GAP + 8, noHitstop: !last,
    knockbackX: last ? 6 : 0.8, knockbackY: last ? -3 : 0, alien: { bw: "rake", cast: d.cast, hit: k + 1, scent: last } })
  d.hits = k + 1
}
TICKS.push((f, s) => {
  const d = s.rake; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.lastRake = { travelled: Math.abs(f.x - d.x0), hits: d.hits, contact: d.contact != null, interrupted: true }; stopCast(f, "rake", s); return }
  if (d.contact == null) {
    if (d.t > d.st && d.t <= d.st + BW_RAKE.FRAMES) { f._benLunge = { frames: 1, speed: d.face * BW_RAKE.SPEED }; if (!ownLive(f, api0, "rake")) rakeBox(f, s, d, 0) }
    if (d.t === d.st + BW_RAKE.FRAMES) killOwn(f, "rake", d.cast)
  } else {
    const k = Math.floor((d.t - d.contact) / BW_RAKE.GAP)
    if ((d.t - d.contact) % BW_RAKE.GAP === 0 && k >= 1 && k < BW_RAKE.HITS.length && d.hits === k) rakeBox(f, s, d, k)
  }
  pose(f, "bwRake", d.end - d.t)
  if (d.t >= d.end) { s.lastRake = { travelled: Math.abs(f.x - d.x0), hits: d.hits, contact: d.contact != null, x0: d.x0, x1: f.x }; s.rake = null }
})
function rakeContact(f, s, tag) {
  const d = s.rake; if (!d || d.cast !== tag.cast) return
  if (tag.hit === 1 && d.contact == null) {
    d.contact = d.t; delete f._benLunge; killOwn(f, "rake", d.cast)
    d.end = d.t + BW_RAKE.GAP * (BW_RAKE.HITS.length - 1) + BW_RAKE.RECOVERY
  }
}

// 3. POUNCE (↓↙← + P, 14) — Attack → f1: an arc to the opponent's x AT CAST TIME (max 360 px), the hit at 18f (the landing),
//    55, knockdown, −14 on block, 24f whiff recovery (16f on a hit). Ground only. +1 Scent on a clean hit.
//    HUNTED: ONE mid-air re-aim 12f into the leap toward their position at that frame (once per Pounce; the arc then flies
//    straight to that point — no tracking after; still bounded to 360 px from the take-off).
export const BW_POUNCE = { LEAP: 2, LAND: 18, RANGE: 360, HEIGHT: 90, DMG: 55, ON_BLOCK: -14, WHIFF: 24, HIT_REC: 16, KD: 52, W: 96, H: 100, STOP: 30 }
function castPounce(f, s, api, ctx) {
  if (!grounded(f)) return false
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  const land = startupOf(s, BW_POUNCE.LAND), total = land + BW_POUNCE.WHIFF
  const c = beginCast(f, s, api, "bwPounce", BW_COST.pounce, total); if (!c) return false
  const face = f.facing || 1, x0 = cx(f), aim = opp ? cx(opp) - face * BW_POUNCE.STOP : x0 + face * BW_POUNCE.RANGE
  const tx = Math.max(x0 - BW_POUNCE.RANGE, Math.min(x0 + BW_POUNCE.RANGE, aim))
  s.pounce = { t: 0, land, cast: c.cast, face, x0, tx, aim0: tx, y0: f.y, reaimed: false, reaimT: null, hit: false, blocked: false, end: total }; s.stats.pounces++
  return true
}
CASTS.pounce = castPounce
const pounceY = (d, t) => { const span = d.land - BW_POUNCE.LEAP, p = Math.max(0, Math.min(1, (t - BW_POUNCE.LEAP) / span)); return d.y0 - 4 * BW_POUNCE.HEIGHT * p * (1 - p) }
TICKS.push((f, s, input, api, opp) => {
  const d = s.pounce; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.lastPounce = { hit: d.hit, reaimed: d.reaimed, interrupted: true }; stopCast(f, "pounce", s); return }
  if (d.t === BW_POUNCE.LEAP + BW_SCENT.REAIM_AT && hunted(s) && !d.reaimed && opp && !opp.eliminated) {   // HUNTED: one re-aim, at this frame
    d.tx = Math.max(d.x0 - BW_POUNCE.RANGE, Math.min(d.x0 + BW_POUNCE.RANGE, cx(opp) - d.face * BW_POUNCE.STOP)); d.reaimed = true; d.reaimT = d.t; s.scent.reaims++
  }
  if (d.t >= BW_POUNCE.LEAP && d.t < d.land) {
    const left = d.land - d.t
    f._benGlide = { vx: (d.tx - cx(f)) / left, vy: pounceY(d, d.t + 1) - f.y }
  } else if (d.t === d.land) {
    delete f._benGlide; f.y = d.y0
    hitbox(f, api, "bw_pounce", d.face, { damage: BW_POUNCE.DMG, spawnX: cx(f) + d.face * 10, spawnY: f.y + (f.h || 110) / 2, w: BW_POUNCE.W, h: BW_POUNCE.H, lifetime: 3,
      hitstun: 30, blockstun: blockstunFor(BW_POUNCE.WHIFF, BW_POUNCE.ON_BLOCK), knockbackX: 5, knockbackY: -4, alien: { bw: "pounce", cast: d.cast, scent: true } })
  }
  pose(f, "bwPounce", d.end - d.t)
  if (d.t >= d.end) { s.lastPounce = { hit: d.hit, blocked: d.blocked, reaimed: d.reaimed, reaimT: d.reaimT, x0: d.x0, aim0: d.aim0, tx: d.tx, x1: cx(f), end: d.t }; s.pounce = null }
})
function pounceContact(f, s, target, tag, blocked) {
  const d = s.pounce; if (!d || d.cast !== tag.cast) return
  killOwn(f, "pounce", d.cast)
  if (blocked) { d.blocked = true; return }
  d.hit = true; s.stats.pounceHits++; d.end = Math.min(d.end, d.t + BW_POUNCE.HIT_REC)
  if (!target.knockdownState && !target.eliminated) { target.knockdownState = true; target.knockdownTimer = Math.max(target.knockdownTimer || 0, BW_POUNCE.KD) }
}

// 4. RISING HOWL (→↓↘ + P, 14) — Attack ↑ f3–4: a vertical ring column beside him (45 px ahead, 240 px tall), 9f startup,
//    8 active, 55, ANTI-AIR (reaches the air above him), LAUNCHES, −14 on block, 22f recovery. No Scent.
export const BW_RISE = { STARTUP: 9, ACTIVE: 8, RECOVERY: 22, DMG: 55, AHEAD: 45, W: 80, H: 240, ON_BLOCK: -14, LAUNCH: -16 }
function castRise(f, s, api) {
  if (!grounded(f)) return false
  const st = startupOf(s, BW_RISE.STARTUP), total = st + BW_RISE.ACTIVE + BW_RISE.RECOVERY
  const c = beginCast(f, s, api, "bwRise", BW_COST.rise, total); if (!c) return false
  s.rise = { t: 0, st, cast: c.cast, face: f.facing || 1, hit: false, end: total }; s.stats.rises++
  return true
}
CASTS.rise = castRise
TICKS.push((f, s, input, api) => {
  const d = s.rise; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.lastRise = { hit: d.hit, interrupted: true }; stopCast(f, "rise", s); return }
  if (d.t === d.st) hitbox(f, api, "bw_rising_howl", d.face, { damage: BW_RISE.DMG, spawnX: cx(f) + d.face * BW_RISE.AHEAD, spawnY: feetY(f) - BW_RISE.H / 2,
    w: BW_RISE.W, h: BW_RISE.H, lifetime: BW_RISE.ACTIVE, hitstun: 34, blockstun: blockstunFor(BW_RISE.RECOVERY + BW_RISE.ACTIVE - 1, BW_RISE.ON_BLOCK),
    knockbackX: 2, knockbackY: BW_RISE.LAUNCH, launcher: true, alien: { bw: "rise", cast: d.cast } })
  pose(f, "bwRise", d.end - d.t)
  if (d.t >= d.end) { s.lastRise = { hit: d.hit }; s.rise = null }
})

// 5. LOW HOWL (←↙↓ + P, 12) — Attack ↓ f1–4: 14f startup, a ground-skimming horizontal ring wave (the Attack ↓ rings),
//    380 px, 2 hits 20 / 25 = 45, hits LOW, one on screen, −8 on block, 20f recovery. No Scent.
export const BW_LOW = { STARTUP: 14, RECOVERY: 20, SPEED: 10, RANGE: 380, W: 40, H: 44, HITS: [20, 25], EVERY: 8, PUSH: 3, LATCH: 4, ON_BLOCK: -8,
  NAME: "bw_low_howl", TAG: "low", STAT: "lowTicks", LEVEL: "low" }
function castLow(f, s, api) {
  if (!grounded(f) || s.lowRing) return false
  const st = startupOf(s, BW_LOW.STARTUP), total = st + BW_LOW.RECOVERY
  const c = beginCast(f, s, api, "bwLow", BW_COST.low, total); if (!c) return false
  s.low = { t: 0, st, cast: c.cast, face: f.facing || 1, end: total }; s.stats.lows++
  return true
}
CASTS.low = castLow
TICKS.push((f, s, input, api, opp) => {
  const d = s.low
  if (d) { d.t++
    if ((f.hitstun || 0) > 0) { s.lastLow = { interrupted: true }; stopCast(f, "low", s) }
    else { if (d.t === d.st) emitRing(f, s, "lowRing", d.face, d.cast, 0, true)
      pose(f, "bwLow", d.end - d.t); if (d.t >= d.end) { s.lastLow = { end: d.t }; s.low = null } } }
  tickRing(f, s, "lowRing", BW_LOW, opp, api)
})

// 6. DIVE CLAW (air ↓ + P — any air Special; 12) — the Attack → swoosh frame: a diagonal dive (the shared `_benGlide`),
//    48 on the body hit (one hit per cast), once per airtime, no jump refill, +1 Scent on a clean hit. 12f landing.
export const BW_DIVE = { STARTUP: 4, VX: 7, VY: 12, MAX: 50, DMG: 48, W: 64, H: 70, LAND: 12 }
function castDive(f, s, api) {
  if (grounded(f) || s.diveUsed) return false
  const c = beginCast(f, s, api, "bwDive", BW_COST.dive, BW_DIVE.MAX + BW_DIVE.LAND, { commit: false }); if (!c) return false
  s.diveUsed = true
  s.dive = { t: 0, st: startupOf(s, BW_DIVE.STARTUP), cast: c.cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }; s.stats.dives++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.dive = castDive
TICKS.push((f, s, input, api) => {
  if (grounded(f) && !s.dive) s.diveUsed = false                            // once per airtime
  const d = s.dive; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endDive(f, s, false); return }
  if (d.t < d.st) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > d.st + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= BW_DIVE.MAX) { endDive(f, s, landed); return }
  f._benGlide = { vx: d.face * BW_DIVE.VX, vy: BW_DIVE.VY }
  if (!d.hit && !ownLive(f, api, "dive")) hitbox(f, api, "bw_dive_claw", d.face, { damage: BW_DIVE.DMG, spawnX: cx(f) + d.face * 16, spawnY: f.y + (f.h || 110) * 0.7,
    w: BW_DIVE.W, h: BW_DIVE.H, hitstun: 24, blockstun: 12, knockbackX: 3, knockbackY: -4, alien: { bw: "dive", cast: d.cast, scent: true } })
  pose(f, "bwDive", 2)
})
function endDive(f, s, landed) {
  const d = s.dive; s.dive = null; delete f._benGlide; killOwn(f, "dive", d.cast)
  if (landed) { s.landT = s.t; f.attackCooldown = BW_DIVE.LAND; f._benPowerCommit = BW_DIVE.LAND; pose(f, "crouch", BW_DIVE.LAND) }
  else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastDive = { landed, hit: d.hit, jumps: d.jumps }
}

// DEFENSE: LUPINE DODGE (←← + Light): no cost, i-frames on frames 4–10, 5 s cooldown, a short hop back on the run frame.
// The ←← double tap + the Light press arrive through moveFrames (Jetray's Barrel Roll input): the jab never comes out.
// Ordinary guard otherwise; no armor anywhere in his kit.
export const BW_DODGE = { TOTAL: 18, IFROM: 4, ITO: 10, CD: 300, DRIFT: 5 }
export function castDodge(f, s) {
  if (s.dodgeCd > 0 || !canAct(f, s)) return false
  s.dodgeTapT = s.backTapT
  s.dodge = { t: 0, face: f.facing || 1 }; s.dodgeCd = BW_DODGE.CD; s.stats.dodges++
  f.attackCooldown = BW_DODGE.TOTAL; f._benPowerCommit = BW_DODGE.TOTAL; f.vx = 0
  pose(f, "bwDodge", BW_DODGE.TOTAL)
  return true
}
MOVE_FRAMES.push((f, s, key) => (key === "light" && s.t - s.backTapT <= BW_DASH_WINDOW && s.backTapT > s.dodgeTapT && castDodge(f, s) ? false : undefined))
TICKS.push((f, s) => {
  if (s.dodgeCd > 0) s.dodgeCd--
  const r = s.dodge; if (!r) return
  r.t++
  if (r.t === BW_DODGE.IFROM) f.invulnTimer = Math.max(f.invulnTimer || 0, BW_DODGE.ITO - BW_DODGE.IFROM + 1)   // frames 4–10
  if (r.t <= BW_DODGE.ITO) f.x = Math.max(s.stage.L, Math.min(s.stage.R - (f.w || 60), f.x - r.face * BW_DODGE.DRIFT))
  pose(f, "bwDodge", 2)
  if (r.t >= BW_DODGE.TOTAL) s.dodge = null
})

CONTACT.unshift((f, s, target, { proj, blocked }) => {                     // move bookkeeping (runs before Scent)
  const tag = proj && proj.alien; if (!tag) return
  if (tag.bw === "rake") { rakeContact(f, s, tag); if (!blocked) s.stats.rakeHits++ }
  if (tag.bw === "pounce") pounceContact(f, s, target, tag, blocked)
  if (tag.bw === "rise") { killOwn(f, "rise", tag.cast); if (s.rise && s.rise.cast === tag.cast && !blocked) s.rise.hit = true }
  if (tag.bw === "dive") { killOwn(f, "dive", tag.cast); if (s.dive && s.dive.cast === tag.cast) { s.dive.hit = true; if (!blocked) s.stats.diveHits++ } }
})
// render-only: the normals' lunge (the body draw offset; never collision) and Lupine Dodge's hop
function bodyOffset(f) {
  const s = bwState(f); if (!s) return null
  if (s.dodge) return { dx: 0, dy: -Math.sin(s.dodge.t / BW_DODGE.TOTAL * Math.PI) * 14 }
  const a = f.attacking && f.currentAttack; if (!a || a.name !== "light") return null
  const el = (a.total || 0) - (a.timer || 0); return { dx: (f.facing || 1) * Math.min(8, el * 2), dy: 0 }
}

// ── the moves' render-only FX (the hitboxes are hidden; nothing here is GAME_STATE or collides) ──────────────────
const _imgs = {}
function img(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  const im = _imgs[src]; return im.complete && im.naturalWidth ? im : null
}
// one frame of a cut ring strip, integer-scaled, nearest-neighbour (render only)
function fx(c, name, frameI, x, y, k = 3, flip = 1) {
  const d = BENWOLF_FX[name]; const im = d && img(d.sheet); if (!im) return
  const fi = ((frameI % d.frames) + d.frames) % d.frames
  c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(y)); c.scale(flip, 1)
  c.drawImage(im, fi * d.w, 0, d.w, d.h, Math.round(-d.w * k / 2), Math.round(-d.h * k / 2), d.w * k, d.h * k); c.restore()
}
// a ring's frame by age: the grow frames once, then the sheet's "loop" pair alternating (the sustain)
const ringFrame = (name, age) => { const d = BENWOLF_FX[name], grow = d.loop[0]; return age < grow * 3 ? Math.floor(age / 3) : d.loop[Math.floor((age - grow * 3) / 4) % d.loop.length] }
const spark = (c, x, y, k, frame) => { c.fillStyle = (frame & 2) ? "#ffffff" : MOON; for (let i = 0; i < 4; i++) px(c, x + Math.cos(i * 1.57 + k) * (4 + (frame % 3) * 3), y + Math.sin(i * 1.57 + k) * (4 + (frame % 3) * 3), 3) }
FX_DRAW.push((c, f, s, frame) => {
  const face = f.facing || 1, h = f.h || 110
  const a = f.attacking && f.currentAttack
  if (a) {                                                                   // normals: claw sparks (Low / Air), launcher ring puff
    const el = (a.total || 0) - (a.timer || 0)
    if ((a.name === "down" || a.name === "air") && el >= 5 && el <= 10) spark(c, cx(f) + face * 55, f.y + h * (a.name === "down" ? 0.85 : 0.6), el, frame)
    if (a.name === "up" && el >= 9 && el <= 16) fx(c, "upRing", el - 9, cx(f) + face * 30, f.y + h * 0.2 - (el - 9) * 4, 2)
  }
  for (const [key, name, k] of [["ring", "howlRing", 3], ["lowRing", "lowRing", 2]]) {   // SONIC / LOW HOWL rings
    const r = s[key]; if (!r) continue
    const age = Math.round(r.d / (key === "ring" ? BW_HOWL.SPEED : BW_LOW.SPEED))
    fx(c, name, ringFrame(name, age), r.x, r.y, k, r.face)
    c.save(); c.globalAlpha = 0.35; fx(c, name, ringFrame(name, Math.max(0, age - 3)), r.x - r.face * 18, r.y, k - 1, r.face); c.restore()
  }
  const hw = s.howl
  if (hw && hw.t < hw.st) fx(c, "howlRing", 0, mouthX(f, hw.face) + hw.face * 6, mouthY(f) + 8, 2, hw.face)
  const ri = s.rise
  if (ri && ri.t >= ri.st && ri.t < ri.st + BW_RISE.ACTIVE + 4) {           // RISING HOWL: the stacked rings climbing the column
    const age = ri.t - ri.st, x = cx(f) + ri.face * BW_RISE.AHEAD
    for (let i = 0; i < 5; i++) fx(c, "upRing", Math.min(4, i + (age >> 2)), x, feetY(f) - 20 - i * 44 - age * 3, 3)
  }
  const rk = s.rake
  if (rk && rk.contact != null) { const age = rk.t - rk.contact; if (age < 16) spark(c, cx(f) + rk.face * 60, f.y + h * 0.45, age, frame) }
  const po = s.pounce
  if (po && po.t >= BW_POUNCE.LEAP && po.t < po.land) {                      // POUNCE: a short dust trail behind the leap
    c.save(); c.globalAlpha = 0.5; c.fillStyle = MOON2; for (let i = 1; i <= 3; i++) px(c, cx(f) - po.face * i * 14, f.y + h * 0.6 + i * 3, 6 - i); c.restore()
  }
  if (s.t - s.landT < 10) { c.fillStyle = MOON2; for (let i = -2; i <= 2; i++) px(c, cx(f) + i * 12, feetY(f) - 4 - (10 - (s.t - s.landT)) * (2 - Math.abs(i)) * 0.5, 4) }
})
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {                        // LUPINE DODGE cooldown (a thin bar under the Omnitrix bar)
  const fill = s.dodgeCd > 0 ? 1 - s.dodgeCd / BW_DODGE.CD : 1, h = 3
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = s.dodgeCd > 0 ? "#475569" : "#cbd5e1"; const fw = Math.round(w * Math.max(0, Math.min(1, fill))); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
})

// ── 5. ULTIMATE: HOWLING MOON (the Omnitrix Overload input; 55 Power; once per transformation; never while the moon is up) ──
// FULL MOON BUFF (GAME_STATE: moonTimer, moonStrength): 600f on a clean-hit cast, 300f if the howl whiffs or is blocked (no
// cinematic, no capture, 60f recovery). While it lasts — HIS side only (his own fields + his own hooks; no other fighter is
// touched): damage +20% (damageDealt), damage taken −15% (damageTaken), walk / run / dash and jump +15% (`_benWalkSpeed`,
// `dashSpeed`, `jumpForce` from the onApply base), Power drain −25% (drainMult), Power regen +50% (every Power GAIN between his
// ticks is matched by half again, capped at max — Feedback's per-tick energy read), move startup −1f (min 1f: normals via
// moveFrames, specials via startupOf). No refresh, no stacking. Ends on its timer (the night fades back over 30f, render-only),
// swap / revert / KO / round end / rematch (a fresh formState + the engine's own stat re-apply: every visual is gone at once).
export const BW_MOON = { HIT: 600, WHIFF: 300, DMG: 1.20, TAKEN: 0.85, SPEED: 1.15, JUMP: 1.15, DRAIN: 0.75, REGEN: 1.5, CUT: 1 }
export const moonOn = s => !!(s && s.moonTimer > 0)
function startMoon(f, s, dur) {
  if (moonOn(s)) return false                                               // no refresh, no stacking
  s.moonTimer = dur; s.moonDur = dur; s.moonStrength = 1; s.moonCasts++
  return true
}
function endMoon(f, s, why) { s.moonTimer = 0; s.moonStrength = 0; s.moonEnds.push(why); if (s.moonEnds.length > 4) s.moonEnds.shift() }
TICKS.push((f, s) => {                                                       // the buff: timer + his stats from the onApply base
  if (s.moonTimer > 0 && !s.ult) { if (--s.moonTimer <= 0) endMoon(f, s, "timer") }   // the capture does not consume buff time
  const on = moonOn(s), b = s.base
  if (b) {
    if (Number.isFinite(b.walk)) f._benWalkSpeed = b.walk * (on ? BW_MOON.SPEED : 1)
    if (Number.isFinite(b.dash)) f.dashSpeed = b.dash * (on ? BW_MOON.SPEED : 1)
    if (Number.isFinite(b.jump)) f.jumpForce = b.jump * (on ? BW_MOON.JUMP : 1)
  }
  const e = f.energy || 0, max = f.maxEnergy || 100
  if (on && s.lastE != null && e > s.lastE) { const add = Math.min(max - e, (e - s.lastE) * (BW_MOON.REGEN - 1)); f.energy = e + add; s.regenAdded += add }
  s.lastE = f.energy || 0
})
MOON_CUT.push(s => (moonOn(s) ? BW_MOON.CUT : 0))
MD_XFORM.push((f, s, key, md) => (moonOn(s) ? { ...md, startup: Math.max(1, (md.startup ?? 5) - BW_MOON.CUT) } : md))
DEALT.push((f, s, target, raw, opts) => (moonOn(s) && !isUltHit(opts) ? raw * BW_MOON.DMG : raw))
function damageTaken(f, raw) { return moonOn(bwState(f)) ? raw * BW_MOON.TAKEN : raw }

// SEQUENCE: 1. the cast: he rears back and howls (Attack f3–4 + the ring loop) — the 40 clean opener (a ring burst 320 px
// ahead at 16f). A whiff / block: Full Moon 300f, no capture, 60f recovery.
// 2. THE NIGHT FALLS (render-only: drawUnder) — the stage fades to night blue over 20f, a pixel FULL MOON rises, stars come
// out; both fighters keep a moonlight rim (readable on bright and dark stages, never a black screen); the HUD shows a moon
// icon with the time left. Never touches collision or the stage's gameplay.
// 3. CAPTURE: 4 moonlit claw hits × 20 = 80 (Attack → swoosh frames) at angles hash(match seed, start frame, player index).
// 4. LUNAR POUNCE: a full-moon leap (the Pounce frame + a procedural moon-glow trail) → 120, knockdown.
// Total 240 raw (40 + 80 + 120); HUNTED at the capture: the final hit +20 once and Hunted is consumed. Then camera and
// positions restore, the Full Moon (600f, untouched by the cinematic) runs on, 100f recovery lockout.
export const BW_ULT = { OPENER_AT: 16, OPENER: 40, REACH: 320, H: 120, WHIFF: 60, NIGHT: 22, CLAW_AT: [28, 40, 52, 64], CLAW: 20,
  LEAP_AT: 72, FINAL_AT: 92, FINAL: 120, HUNT_BONUS: 20, END: 112, LOCKOUT: 100, ZOOM: 0.85, LEAP_H: 140, KD: 60 }
function fireHowlingMoon(f, ctx, api) {
  const s = bwState(f); if (!s || !canAct(f, s) || moonOn(s) || s.moonUsed) return false
  if (!api.spendEnergy(f, BW_COST.ultimate)) return false
  s.castId++; s.moonUsed = true
  const face = f.facing || 1, total = BW_ULT.OPENER_AT + BW_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "bwHowl"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f), hunted: false, bonus: 0 }
  const cast = s.castId
  api.scheduleBenSpawn(f, BW_ULT.OPENER_AT, () => hitbox(f, api, "bw_ult_howl", face, {
    damage: BW_ULT.OPENER, spawnX: mouthX(f, face) + face * BW_ULT.REACH / 2, spawnY: mouthY(f) + 8, w: BW_ULT.REACH, h: BW_ULT.H,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { bw: "ultOpen", cast } }))
  return true
}
function ultMiss(f, s, why) {                                                // whiff / block: the shorter moon, no capture
  s.lastUlt = { captured: false, why, raw: 0 }; s.ult = null
  startMoon(f, s, BW_MOON.WHIFF)
}
function startCapture(f, s, target) {
  const u = s.ult
  u.phase = "night"; u.t = 0; u.raw = BW_ULT.OPENER; u.hits.push(BW_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }; u.hunted = hunted(s)
  startMoon(f, s, BW_MOON.HIT)
  f.attackCooldown = BW_ULT.END + BW_ULT.LOCKOUT; f._benPowerCommit = BW_ULT.END; f._spriteCastTimer = BW_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, BW_ULT.END + 2)
}
// pure: the capture claws of one cast (render + damage beats share them; the same seed → the same angles)
export function ultClaws(seed, frame0, pi) {
  return BW_ULT.CLAW_AT.map((at, i) => ({ at, ang: Math.round((bwHash(seed, frame0, pi, i) * 2 - 1) * 75), len: 80 + Math.floor(bwHash(seed, frame0, pi, i + 16) * 50),
    side: bwHash(seed, frame0, pi, i + 32) < 0.5 ? -1 : 1 }))
}
TICKS.push((f, s, input, api, opp) => {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > BW_ULT.OPENER_AT + 4) { ultMiss(f, s, "whiff"); f.attackCooldown = Math.max(f.attackCooldown || 0, BW_ULT.WHIFF - 4) } else pose(f, "bwHowl", 2); return }
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, BW_ULT.ZOOM, BW_ULT.END)       // render-only framing
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0
  const hit = (dmg, shake, move) => { api.applyScaledDamage(opp, dmg, { attacker: f, move, source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  const face = u.face, near = u.thome.x - face * ((f.w || 60) + 6)
  if (u.t < BW_ULT.NIGHT) { u.phase = "night"; f.x = u.home.x; f.y = u.home.y; f._spriteCastMove = "bwHowlHold" }
  else if (u.t < BW_ULT.LEAP_AT) {
    u.phase = "claw"; f.x = near; f.y = u.home.y; f._spriteCastMove = "bwClaw"
    const k = BW_ULT.CLAW_AT.indexOf(u.t); if (k >= 0) hit(BW_ULT.CLAW, 6 + k * 2, "bw_ult_claw")
  } else if (u.t <= BW_ULT.FINAL_AT) {                                     // LUNAR POUNCE: back out and over, landing on them
    u.phase = "pounce"; f._spriteCastMove = "bwPounce"
    const p = (u.t - BW_ULT.LEAP_AT) / (BW_ULT.FINAL_AT - BW_ULT.LEAP_AT), x0 = near - face * 160
    f.x = x0 + (near - x0) * p; f.y = u.home.y - 4 * BW_ULT.LEAP_H * p * (1 - p)
    if (u.t === BW_ULT.FINAL_AT) {
      const bonus = u.hunted && hunted(s) ? BW_ULT.HUNT_BONUS : 0
      if (bonus) { u.bonus = bonus; endHunted(s, "ult"); s.stats.huntedBonus++ }
      hit(BW_ULT.FINAL + bonus, 18, "bw_ult_lunar_pounce")
    }
  } else if (u.t < BW_ULT.END) { u.phase = "land"; f.x = near; f.y = u.home.y; f._spriteCastMove = "bwRake" }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    if (!opp.eliminated) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, BW_ULT.KD) } }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi, bonus: u?.bonus || 0,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t }
  s.ult = null
  api?.focusCamera?.(f, opp, 1, 12)
  f.attackCooldown = BW_ULT.LOCKOUT; f._benPowerCommit = BW_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const tag = proj && proj.alien; if (!tag || tag.bw !== "ultOpen") return
  const u = s.ult; if (!u || u.phase !== "opener" || u.cast !== tag.cast) return
  killOwn(f, "ultOpen", tag.cast)
  if (blocked || target.eliminated) { ultMiss(f, s, "blocked"); f.attackCooldown = Math.max(f.attackCooldown || 0, BW_ULT.WHIFF - BW_ULT.OPENER_AT) }
  else startCapture(f, s, target)
})
// render-only: the held opponent sways under the claws (never collision)
function targetOffset(f, t) {
  const s = bwState(f), u = s && s.ult; if (!u || u.phase !== "claw") return null
  const k = BW_ULT.CLAW_AT.findIndex(at => u.t >= at && u.t < at + 6); if (k < 0) return null
  return { dx: u.face * (6 - (u.t - BW_ULT.CLAW_AT[k])), dy: 0 }
}

// ── THE NIGHT (render-only: drawUnder, under both fighters; nothing here is GAME_STATE or collides) ──────────────
// The night LEVEL is render-local memory (a WeakMap keyed by the fighter, stepped by his sim tick so it is frame-rate
// independent): toward 1 over 20f while the moon is up / the capture runs, back to 0 over 30f after the timer ends. When his
// formState goes (swap / revert / KO / round end / rematch) this layer is simply not drawn: every visual is gone at once.
const _night = new WeakMap(), _opp = new WeakMap()
export const BW_NIGHT = { IN: 20, OUT: 30, TINT: 0.5, STARS: 46 }
export function nightLevel(f, s) {
  let m = _night.get(f); if (!m || m.formT > s.t) m = { lvl: 0, formT: s.t }
  const dt = Math.max(0, s.t - m.formT), up = moonOn(s) || !!(s.ult && s.ult.phase !== "opener")
  m.lvl = up ? Math.min(1, m.lvl + dt / BW_NIGHT.IN) : Math.max(0, m.lvl - dt / BW_NIGHT.OUT); m.formT = s.t
  _night.set(f, m); return m.lvl
}
export function drawBenwolfUnder(c, f) {
  const s = bwState(f); if (!s || !c) return
  const L = nightLevel(f, s); if (L <= 0) return
  const W = (c.canvas && c.canvas.width) || 1280, H = (c.canvas && c.canvas.height) || 720
  c.save()
  if (typeof c.setTransform === "function") c.setTransform(1, 0, 0, 1, 0, 0)  // the sky is SCREEN space
  c.imageSmoothingEnabled = false
  c.globalAlpha = BW_NIGHT.TINT * L; c.fillStyle = "#0b1a4a"; c.fillRect(0, 0, W, H)
  const P = Math.max(2, Math.round(H / 240))                                 // the pixel size of the sky art
  for (let i = 0; i < BW_NIGHT.STARS; i++) {                                 // stars (hash-placed: a fixed render seed)
    const sx = bwHash(7, i, 0, 1) * W, sy = bwHash(7, i, 0, 2) * H * 0.55, tw = ((s.t >> 3) + i) % 7 === 0
    c.globalAlpha = L * (tw ? 0.45 : 0.95); c.fillStyle = i % 5 ? "#e8edff" : "#fff6c8"; c.fillRect(Math.round(sx / P) * P, Math.round(sy / P) * P, P, P)
    if (i % 9 === 0 && !tw) { c.fillRect(Math.round(sx / P) * P - P, Math.round(sy / P) * P, P * 3, P / 2 | 0 || 1) }
  }
  const R = 14, mx = Math.round(W * 0.78 / P) * P, my = Math.round((H * 0.2 + (1 - L) * H * 0.18) / P) * P   // the FULL MOON rises
  c.globalAlpha = 0.18 * L; c.fillStyle = "#fffbe0"
  for (let r = R + 6; r > R; r -= 2) disc(c, mx, my, r, P)                   // a stepped halo
  c.globalAlpha = L; c.fillStyle = MOON; disc(c, mx, my, R, P)
  c.fillStyle = MOON2; for (const [dx, dy, r] of [[-5, -4, 3], [4, 3, 4], [-2, 7, 2], [7, -6, 2]]) disc(c, mx + dx * P, my + dy * P, r, P)   // craters
  c.restore()
  // MOONLIGHT RIM behind both fighters (world space, under them): a pale stepped glow so dark sprites stay readable
  c.save(); c.globalAlpha = 0.22 * L; c.fillStyle = "#cfe0ff"
  for (const q of [f, _opp.get(f)]) if (q && !q.eliminated) { const qx = q.x + (q.w || 60) / 2, qy = q.y + (q.h || 110) / 2
    for (let k = 0; k < 3; k++) c.fillRect(Math.round(qx - (q.w || 60) / 2 - 8 + k * 4), Math.round(q.y - 6 + k * 4), Math.round((q.w || 60) + 16 - k * 8), Math.round((q.h || 110) + 8 - k * 8)) }
  c.restore()
}
function disc(c, x, y, r, P) {                                               // a pixel disc of radius r (in sky pixels)
  for (let j = -r; j <= r; j++) { const w = Math.floor(Math.sqrt(r * r - j * j)); c.fillRect(x - w * P, y + j * P, (2 * w + 1) * P, P) }
}
FX_DRAW.push((c, f, s, frame, opp) => {
  if (opp) _opp.set(f, opp)
  const u = s.ult; if (!u) return
  const face = u.face
  if (u.phase === "opener" && u.t >= BW_ULT.OPENER_AT - 8) {                 // the opener howl: the ring loop rushing out
    for (let i = 0; i < 4; i++) fx(c, "howlRing", ringFrame("howlRing", u.t - BW_ULT.OPENER_AT + 8 + i * 3), mouthX(f, face) + face * (30 + i * 70 + (u.t - BW_ULT.OPENER_AT + 8) * 6), mouthY(f) + 8, 3, face)
    return
  }
  if (!opp) return
  const ox = cx(opp), oy = opp.y + (opp.h || 110) / 2
  if (u.phase === "claw" || u.phase === "pounce") for (const cl of ultClaws(u.seed, u.f0, u.pi)) {   // the hashed moonlit claw slashes
    const age = u.t - cl.at; if (age < 0 || age > 16) continue
    const r = cl.ang * Math.PI / 180, dx = Math.cos(r) * cl.len / 2 * cl.side, dy = Math.sin(r) * cl.len / 2
    c.save(); c.globalAlpha = Math.max(0.25, 1 - age / 16)
    for (let k = -1; k <= 1; k++) { c.strokeStyle = age < 5 ? "#ffffff" : MOON; c.lineWidth = 3; c.beginPath()
      c.moveTo(Math.round(ox - dx + k * 8 * Math.sin(r)), Math.round(oy - dy - k * 8 * Math.cos(r))); c.lineTo(Math.round(ox + dx + k * 8 * Math.sin(r)), Math.round(oy + dy - k * 8 * Math.cos(r))); c.stroke() }
    c.restore(); if (age < 6) spark(c, ox + dx, oy + dy, age, frame)
  }
  if (u.phase === "pounce") {                                                // LUNAR POUNCE: the moon-glow trail
    c.save(); for (let i = 1; i <= 6; i++) { c.globalAlpha = 0.5 - i * 0.07; c.fillStyle = i % 2 ? MOON : "#cfe0ff"; px(c, cx(f) - face * i * 12, f.y + (f.h || 110) * 0.5 + i * 4, 10 - i) } c.restore()
  }
  if (u.t >= BW_ULT.FINAL_AT && u.t < BW_ULT.FINAL_AT + 14) {               // the landing: a moon-white ring burst
    const k = (u.t - BW_ULT.FINAL_AT) / 14; c.save(); c.globalAlpha = 1 - k; c.strokeStyle = MOON; c.lineWidth = 4
    c.beginPath(); c.arc(Math.round(ox), Math.round(oy), 20 + 120 * k, 0, Math.PI * 2); c.stroke(); c.restore()
  }
})
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {                          // FULL MOON: a pixel moon icon + the seconds left
  const yy = y + 6, k = 2
  if (moonOn(s)) {
    const ix = flip ? bx + w - 8 : bx + 8
    ctx.fillStyle = INK; disc(ctx, ix, yy + 6, 4, k); ctx.fillStyle = MOON; disc(ctx, ix, yy + 6, 3, k); ctx.fillStyle = MOON2; ctx.fillRect(ix - 2, yy + 4, 2, 2)
    const frac = s.moonTimer / Math.max(1, s.moonDur), bw = w - 22, x0 = flip ? bx : bx + 20
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(x0 - 1, yy + 4, bw + 2, 5); ctx.fillStyle = MOON; const fw = Math.round(bw * frac); ctx.fillRect(flip ? x0 + bw - fw : x0, yy + 5, fw, 3)
    ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = MOON
    ctx.fillText(`FULL MOON ${Math.ceil(s.moonTimer / 60)}s`, flip ? x0 + bw : x0, yy + 11)
  } else if (s.scent.hunted > 0) {
    ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = PAW
    ctx.fillText(`HUNTED ${Math.ceil(s.scent.hunted / 60)}s`, flip ? bx + w : bx, yy + 4)
  }
})
