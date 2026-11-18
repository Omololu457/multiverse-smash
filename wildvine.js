// wildvine.js — WILDVINE (Florauna), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (leaves, vines,
// forest, sparkles, rings, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet by Dragonrod (docs/ben10/aliens/wildvine/SPRITE_LEDGER.md).
import { WILDVINE_ANIM, WILDVINE_FX, WILDVINE_GEOM } from "./wildvineAssets.js"
export { WILDVINE_ANIM, WILDVINE_FX, WILDVINE_GEOM }

const ANIM = { ...WILDVINE_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WILDVINE = {
  id: "wildvine", poolKey: "wildvine", displayName: "Wildvine", slot: 11,
  status: "ready", sheetPath: "./ben10_wildvine_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/wildvine/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.00, weight: 0.95 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Thornspike", special2: "Snare Vine", special3: "Bloom Pod", special4: "Vine Whip", special5: "Verdant Rise",
    special6: "Seed Shot", ultimate: "Overgrowth" },
  basic_attacks: {
    light:  normal(18, 5, 3, 10, 0, { rangeX: 100 }),                                         // attack f1–2
    heavy:  normal(52, 14, 4, 22, -6, { knockbackX: 7, rangeX: 170 }),                        // attack f3–5, arm reach 170 px
    down:   normal(24, 7, 3, 15, -4, { hitLevel: "low", rangeX: 120 }),                       // crouch + low vine, hits low
    up:     normal(46, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // attack ↑ f1–3, rising growth
    air:    normal(28, 7, 4, 11, 2)                                                           // fall frame
  },
  anim: ANIM, fx: WILDVINE_FX,
  drainMult: f => (wvState(f)?.bloom?.t > 0 ? WV_BLOOM.DRAIN : 1),   // FULL BLOOM −10% Power drain (function form, ADD_ALIEN.md)
  onApply, tick, moveFrames, fireSpecial, damageDealt,
  drawHud: drawWildvineHud, drawFx: drawWildvineFx, drawUnder: drawWildvineUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWildvineState() {
  return { kind: "wildvine", t: 0, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    garden: [], plantSeq: 0, plant: null,
    bloom: { t: 0, cd: 0, count: 0 },
    snareT: 0,
    fwdPrev: false, fwdTapT: -999, dashTapT: -999, downHeld: 0,
    stats: { planted: { thorn: 0, snare: 0, bloom: 0 }, consumedBy: { contact: 0, self: 0, whip: 0, ult: 0, replaced: 0 },
      consumeLog: [], erupts: 0, snares: 0, heals: 0, healed: 0, blooms: 0 } }
}
export const wvState = f => (f?.omnitrix?.formState?.kind === "wildvine" && f.transformed && f.activeAlien === "wildvine") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshWildvineState()
}

const cx = o => o.x + (o.w || 60) / 2
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function wvHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}
const grounded = f => !!(f && (f.onGround || f.grounded))
export const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const bodyBox = o => ({ x: o.x, y: o.y, w: o.w || 60, h: o.h || 110 })
const feetBox = o => ({ x: o.x + 6, y: o.y + (o.h || 110) - 14, w: Math.max(1, (o.w || 60) - 12), h: 16 })

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = wvState(f); if (!s) return
  input = input || {}
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  tickInputs(f, s, input)
  tickPlantCast(f, s)
  tickGarden(f, s, api, opp)
  tickBloom(s)
  tickRoot(s, opp)
  s.noAttack = busy(s)
}
const busy = s => !!(s.plant)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = wvState(f); if (!s) return md; return busy(s) ? false : md }

// raw-input bookkeeping: →→ (two FORWARD press edges within 14f, no Down) and how long ↓ has been held
export const WV_DASH_WINDOW = 14
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= WV_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  s.downHeld = input.down ? s.downHeld + 1 : 0
}

// ── THE GARDEN (his unique system, GAME_STATE) ─────────────────────────────────────────────────────────────
// Up to 3 owner-limited PLANTS on the ground he stands on; planting a 4th removes the oldest. Each plant = plain data
// { id, type, x, y (ground line), t, cast, consumed, by, ct }. Growth: SPROUT 0–29f (visible telegraph, no hitbox) → GROWN
// 30–419f (an explicit contact box, active) → WITHERED at 420f (removed). Plants are NEVER collision (no walls, no floor
// change): only their contact box is tested, once per plant — the first qualifying contact CONSUMES it (atomic: a consumed
// plant can never fire again, even if two contacts happen the same frame). Consumed records linger 14f with no box so the
// eruption can be drawn, then are dropped. Opponent projectiles and his own moves never touch plants (they have no
// hurtbox). Swap / revert / KO / rematch / round end clear the garden (fresh formState).
export const WV_GARDEN = { MAX: 3, SPROUT: 30, LIFE: 420, DIST: 70, LINGER: 14 }
export const WV_PLANT = {
  thorn: { cost: 10, w: 48, h: 110, dmg: 40 },
  snare: { cost: 12, w: 84, h: 34, root: 30 },
  bloom: { cost: 14, w: 52, h: 40, heal: 12, power: 15 } }
export const plantStage = p => p.consumed ? "consumed" : p.t < WV_GARDEN.SPROUT ? "sprout" : p.t < WV_GARDEN.LIFE ? "grown" : "withered"
export const plantBox = p => { const d = WV_PLANT[p.type]; return { x: p.x - d.w / 2, y: p.y - d.h, w: d.w, h: d.h } }
export const livePlants = s => s.garden.filter(p => !p.consumed && p.t < WV_GARDEN.LIFE)
export function addPlant(f, s, type, cast) {
  const face = f.facing || 1
  const x = Math.max(s.stage.L + 30, Math.min(s.stage.R - 30, Math.round(cx(f) + face * ((f.w || 60) / 2 + WV_GARDEN.DIST))))
  const y = f.y + (f.h || 110)                                               // the ground line he stands on (legal ground)
  for (let live = livePlants(s); live.length >= WV_GARDEN.MAX; live = livePlants(s)) {   // 4th plant → the oldest goes
    const old = live.reduce((a, b) => (b.id < a.id ? b : a)); old.consumed = true; old.by = "replaced"; old.ct = WV_GARDEN.LINGER
    s.stats.consumedBy.replaced++
  }
  const p = { id: ++s.plantSeq, type, x, y, t: 0, cast, consumed: false, by: null, ct: 0 }
  s.garden.push(p); s.stats.planted[type]++
  return p
}
// THE one consumption gate: atomic, GROWN only
export function consumePlant(s, p, by) {
  if (!p || p.consumed || plantStage(p) !== "grown") return false
  p.consumed = true; p.by = by; p.ct = WV_GARDEN.LINGER
  s.stats.consumedBy[by] = (s.stats.consumedBy[by] || 0) + 1
  s.stats.consumeLog.push(p.id); if (s.stats.consumeLog.length > 16) s.stats.consumeLog.shift()
  return true
}
function tickGarden(f, s, api, opp) {
  for (const p of s.garden) { if (p.consumed) p.ct--; else p.t++ }
  const foe = opp && !opp.eliminated && !(opp.health <= 0) ? bodyBox(opp) : null
  for (const p of s.garden) {
    if (plantStage(p) !== "grown") continue
    const box = plantBox(p)
    if (p.type === "bloom") {                                                 // only HE can eat a Bloom Pod; the opponent: nothing
      if (grounded(f) && overlap(box, feetBox(f)) && consumePlant(s, p, "self")) eatBloom(f, s)
    } else if (foe && overlap(box, foe)) {
      if (p.type === "thorn" && consumePlant(s, p, "contact")) eruptThorn(f, s, api, p, opp)
      if (p.type === "snare" && consumePlant(s, p, "contact")) snare(f, s, p, opp)
    }
  }
  s.garden = s.garden.filter(p => (p.consumed ? p.ct > 0 : p.t < WV_GARDEN.LIFE))   // withered / spent records dropped
}
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
// 1. THORNSPIKE (grown): erupts on the opponent's contact ONCE — 40, a small pop-up, then consumed (+1 Entangle, Phase 4)
function eruptThorn(f, s, api, p, opp) {
  const face = opp ? (cx(opp) >= p.x ? 1 : -1) : (f.facing || 1)
  s.stats.erupts++
  return hitbox(f, api, "wv_thorn", face, { damage: WV_PLANT.thorn.dmg, spawnX: p.x, spawnY: p.y - 60, w: 60, h: 120, lifetime: 3,
    hitstun: 24, blockstun: 14, knockbackX: 2, knockbackY: -7, alien: { wv: "thorn", pip: true, cast: p.cast, plant: p.id } })
}
// 2. SNARE VINE (grown): roots the opponent 30f ONCE on contact, no damage, then consumed (+1 Entangle, Phase 4). A trap,
//    not a hit: the guard does not stop it.
function snare(f, s, p, opp) {
  s.snareT = Math.max(s.snareT, WV_PLANT.snare.root); s.stats.snares++
}
// 3. BLOOM POD (grown): he stands on it → +12 HP (never above the HP he had before this round's damage = his pool's max,
//    the round-start value) and +15 Power, then it is gone. The opponent touching it does nothing.
function eatBloom(f, s) {
  const before = f.health || 0, cap = Math.max(before, f.maxHealth || before)
  f.health = Math.min(cap, before + WV_PLANT.bloom.heal)
  f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + WV_PLANT.bloom.power)
  s.stats.heals++; s.stats.healed += f.health - before
}

// ── ROOT lease (Snare Vine; Phase 4 ROOTED) ─────────────────────────────────────────────────────────────────
// The OPPONENT carries `_benRootT` (a 2-frame lease physics.moveFighter honours: no walk / run / dash / jump; guard, normals
// and specials untouched). This form re-stamps it every frame the root lasts, so swap / revert / KO end it within 2 frames.
function tickRoot(s, opp) {
  if (s.snareT > 0) s.snareT--
  if (opp && rootLeft(s) > 0) opp._benRootT = 2
}
export const rootLeft = s => Math.max(s.snareT || 0, s.ent?.rootT || 0)

// ── FULL BLOOM ───────────────────────────────────────────────────────────────────────────────────────────────
// All 3 plants GROWN at the same time → +10% damage (damageDealt) and −10% Power drain (drainMult) for 180f, once per 600f.
export const WV_BLOOM = { DUR: 180, CD: 600, DMG: 1.10, DRAIN: 0.90 }
function tickBloom(s) {
  const b = s.bloom
  if (b.t > 0) b.t--
  if (b.cd > 0) b.cd--
  if (b.t === 0 && b.cd === 0 && livePlants(s).filter(p => plantStage(p) === "grown").length === WV_GARDEN.MAX) {
    b.t = WV_BLOOM.DUR; b.cd = WV_BLOOM.CD; b.count++; s.stats.blooms++
  }
}
function damageDealt(f, target, raw, opts) { const s = wvState(f); return s && s.bloom.t > 0 ? raw * WV_BLOOM.DMG : raw }

// ── SPECIALS (dispatch) ──────────────────────────────────────────────────────────────────────────────────
// The shared alien motion inputs = the direction held the frame Special is pressed:
//   ↓↘→ + P (neutral / →) Thornspike   ↓↙← + P (←) Snare Vine   ←↙↓ + P (↓) Bloom Pod
export const WV_COST = { thorn: WV_PLANT.thorn.cost, snare: WV_PLANT.snare.cost, bloom: WV_PLANT.bloom.cost }
function pickSpecial(f, s) {
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (!grounded(f)) return null
  if (dir === "B") return "snare"
  if (dir === "D") return "bloom"
  return "thorn"
}
function fireSpecial(f, ctx, api) {
  const s = wvState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind) return false
  if (kind === "thorn" || kind === "snare" || kind === "bloom") return castPlant(f, s, api, kind)
  return false
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "wildvine" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return { cast: s.castId, total }
}
// PLANTING (all 3 plants): attack ↓ f1–2 + crouch (12f), the plant goes in at 8f, then the LOOP growth hold to 20f.
// Ground only. Knocked out of it before 8f = no plant (Power stays spent).
export const WV_CAST = { TOTAL: 20, AT: 8, POSE: 12 }
function castPlant(f, s, api, type) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "wvPlant", WV_PLANT[type].cost, WV_CAST.TOTAL); if (!c) return false
  s.plant = { t: 0, type, cast: c.cast, planted: null }
  return true
}
function tickPlantCast(f, s) {
  const c = s.plant; if (!c) return
  c.t++
  if ((f.hitstun || 0) > 0) { s.plant = null; return }
  if (c.t === WV_CAST.AT) c.planted = addPlant(f, s, c.type, c.cast).id
  f._spriteCastMove = c.t < WV_CAST.POSE ? "wvPlant" : "wvGrow"; f._spriteCastTimer = Math.max(2, WV_CAST.TOTAL - c.t)
  if (c.t >= WV_CAST.TOTAL) s.plant = null
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
export const FX_SCALE = 3                                                     // extracted FX: integer nearest-neighbour ×3
// draw one frame of an extracted FX strip, bottom-centred at (x, bottomY)
function fxFrame(c, key, i, x, bottomY, scale = FX_SCALE, flip = 1) {
  const a = WILDVINE_FX[key]; const img = a && sheetImg(a.sheet); if (!img) return
  const k = Math.max(0, Math.min(a.frames - 1, i | 0)), dw = a.w * scale, dh = a.h * scale
  c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(bottomY)); if (flip < 0) c.scale(-1, 1)
  c.drawImage(img, k * a.w, 0, a.w, a.h, Math.round(-dw / 2), -dh, dw, dh); c.restore()
}
function rHash(a, b, c) {   // render-only deterministic hash → [0, 1) (leaf / vine jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const DK = "#0f4a21", GREEN = "#22b14c", LIME = "#b5e61d", OUT = "#000000", POD = "#f472b6", POLLEN = "#ffc90e"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
export function drawPixelRing(c, x, y, rx, ry, col, k = 3, n = 0, phase = 0) {
  if (!(rx > 0)) return
  n = n || Math.max(12, Math.round(rx * 0.5)); c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + phase; px(c, x + Math.cos(a) * rx, y + Math.sin(a) * ry, k) }
}
// procedural pixel vine: a wavy chain of squares from (x0, y0) to (x1, y1) with leaf pixels
function vine(c, x0, y0, x1, y1, seed, k = 3, wave = 4) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / (k + 1))), nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1
  for (let i = 0; i <= n; i++) { const q = i / n, w = Math.sin(q * Math.PI * 3 + seed) * wave
    const x = x0 + (x1 - x0) * q + nx / L * w, y = y0 + (y1 - y0) * q + ny / L * w
    c.fillStyle = OUT; px(c, x, y, k + 2); c.fillStyle = i % 5 === 2 ? LIME : GREEN; px(c, x, y, k)
    if (i % 6 === 3) { c.fillStyle = GREEN; px(c, x + nx / L * 5, y + ny / L * 5, k) } }
}
// SNARE VINE: a pixel vine ring on the ground (sprout = a small curl, grown = full ring, consumed = snapping shut)
function drawSnare(c, p, frame) {
  const g = p.consumed ? 1 - p.ct / WV_GARDEN.LINGER : Math.min(1, p.t / WV_GARDEN.SPROUT), rx = (WV_PLANT.snare.w / 2) * (p.consumed ? 1 - g * 0.7 : 0.35 + 0.65 * g)
  const n = 18, y = p.y - 6
  for (let i = 0; i < n; i++) { if (!p.consumed && i / n > 0.25 + 0.75 * g) break
    const a = i / n * Math.PI * 2 + (p.t % 120) / 120 * 0.4, x = p.x + Math.cos(a) * rx, yy = y + Math.sin(a) * rx * 0.28 - (i % 3 === 0 ? 4 : 0)
    c.fillStyle = OUT; px(c, x, yy, 6); c.fillStyle = i % 4 ? GREEN : LIME; px(c, x, yy, 4) }
  if (plantStage(p) === "grown") { c.fillStyle = DK; for (let i = 0; i < 4; i++) px(c, p.x - 12 + i * 8, y - 8 - (i % 2) * 4, 3) }
}
// BLOOM POD: a pixel pod with leaves (sprout = bud, grown = open pod, consumed = burst of pollen)
function drawBloom(c, p, frame) {
  const g = p.consumed ? 1 : Math.min(1, p.t / WV_GARDEN.SPROUT), y = p.y - 4, r = 6 + 10 * g
  c.fillStyle = OUT; c.fillRect(p.x - 2, y - r * 1.2 - 2, 4, r * 1.2 + 2)
  for (const sd of [-1, 1]) { c.fillStyle = OUT; c.fillRect(p.x + sd * (6 + r * 0.4) - 7, y - 8, 14, 7); c.fillStyle = GREEN; c.fillRect(p.x + sd * (6 + r * 0.4) - 6, y - 7, 12, 5) }
  if (p.consumed) { c.fillStyle = POLLEN; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, q = 1 - p.ct / WV_GARDEN.LINGER; px(c, p.x + Math.cos(a) * 30 * q, y - r - Math.sin(a) * 30 * q, 3) } return }
  const cy = y - r * 1.2 - r * 0.6
  c.fillStyle = OUT; c.fillRect(Math.round(p.x - r * 0.7 - 2), Math.round(cy - r * 0.6 - 2), Math.round(r * 1.4 + 4), Math.round(r * 1.2 + 4))
  c.fillStyle = plantStage(p) === "grown" ? POD : GREEN; c.fillRect(Math.round(p.x - r * 0.7), Math.round(cy - r * 0.6), Math.round(r * 1.4), Math.round(r * 1.2))
  if (plantStage(p) === "grown") { c.fillStyle = POLLEN; px(c, p.x, cy, 4); c.fillStyle = "#fbcfe8"; px(c, p.x - r * 0.35, cy - r * 0.25, 3) }
}
// THORNSPIKE: the 6 extracted thorn frames — sprout = growth stages 1–5 over 30f, grown = stage 5 (49 px), erupt = the tallest
function drawThorn(c, p, frame) {
  if (p.consumed) { if (p.by === "replaced") return; const q = 1 - p.ct / WV_GARDEN.LINGER
    fxFrame(c, "thorn", 5, p.x, p.y, q < 0.3 ? FX_SCALE : FX_SCALE + 1); return }
  const st = p.t < WV_GARDEN.SPROUT ? Math.min(4, Math.floor(p.t / WV_GARDEN.SPROUT * 5)) : 4
  fxFrame(c, "thorn", st, p.x, p.y, FX_SCALE)
}
function drawPlant(c, p, frame) {
  c.save()
  const life = WV_GARDEN.LIFE - p.t
  if (!p.consumed && life < 40 && (life >> 2) % 2) c.globalAlpha = 0.55            // withering soon: flicker
  if (p.type === "thorn") drawThorn(c, p, frame)
  else if (p.type === "snare") drawSnare(c, p, frame)
  else drawBloom(c, p, frame)
  c.restore()
}
// world-space layer under both fighters: the garden
export function drawWildvineUnder(c, f) {
  const s = wvState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  for (const p of s.garden) drawPlant(c, p, s.t)
  c.restore()
}
export function drawWildvineFx(c, f, frame = 0, opp = null) {
  const s = wvState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const fx = cx(f), fy = f.y + (f.h || 110) * 0.5
  if (s.bloom.t > 0) {                                                       // FULL BLOOM: a petal ring + drifting leaves
    drawPixelRing(c, fx, fy, (f.w || 60) * 0.9, (f.h || 110) * 0.55, (s.bloom.t >> 3) % 2 ? POD : LIME, 3, 16, frame / 30)
    c.fillStyle = GREEN; for (let k = 0; k < 6; k++) px(c, fx - 40 + rHash(k, frame >> 3, 7) * 80, f.y + ((frame * 2 + k * 23) % (f.h || 110)), 3)
  }
  c.restore()
}
export function drawWildvineHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = wvState(f); if (!ctx || !s) return
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - 64 : x + 8
  ctx.save()
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = "left"
  const live = livePlants(s).sort((a, b) => a.id - b.id)
  for (let i = 0; i < WV_GARDEN.MAX; i++) {                                   // GARDEN: 3 slots with stage icons
    const p = live[i], sx = bx + i * 22
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(sx, y, 18, 14)
    ctx.strokeStyle = p && plantStage(p) === "grown" ? LIME : "#4b5563"; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, y + 0.5, 17, 13)
    if (!p) continue
    const grown = plantStage(p) === "grown", col = p.type === "thorn" ? GREEN : p.type === "snare" ? LIME : POD
    ctx.fillStyle = col
    if (p.type === "thorn") { const h = grown ? 10 : 3 + Math.floor(p.t / WV_GARDEN.SPROUT * 6); ctx.fillRect(sx + 8, y + 12 - h, 3, h); ctx.fillRect(sx + 6, y + 12 - h + 3, 2, 2) }
    else if (p.type === "snare") { const r = grown ? 6 : 3; ctx.fillRect(sx + 9 - r, y + 9, r * 2, 2); ctx.fillRect(sx + 9 - r, y + 5, 2, 4); ctx.fillRect(sx + 7 + r, y + 5, 2, 4) }
    else { const r = grown ? 4 : 2; ctx.fillRect(sx + 9 - r, y + 7 - r, r * 2, r * 2); ctx.fillStyle = GREEN; ctx.fillRect(sx + 5, y + 10, 8, 2) }
    if (!grown) { ctx.fillStyle = "#e5e7eb"; ctx.fillRect(sx + 2, y + 12, Math.round(14 * Math.min(1, p.t / WV_GARDEN.SPROUT)), 1) }   // sprout progress
  }
  const tx = bx
  ctx.fillStyle = s.bloom.t > 0 ? "#fbcfe8" : "#9ca3af"
  ctx.fillText(s.bloom.t > 0 ? `FULL BLOOM ${Math.ceil(s.bloom.t / 60)}s` : s.bloom.cd > 0 ? `BLOOM ${Math.ceil(s.bloom.cd / 60)}s` : "GARDEN", tx, y + 17)
  ctx.restore()
}
