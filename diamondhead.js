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
export const DH_FRAMESETS = { normal: ANIM, prism: PRISM_ANIM }   // the live tables the PRISMATIC swap toggles between

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
  onApply, tick, moveFrames, hurtbox, fireSpecial, struck, damageTaken, damageDealt,
  drawHud: drawDiamondheadHud, drawFx: drawDiamondheadFx, drawUnder: drawDiamondheadUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshDiamondheadState() {
  return { kind: DH_KEY, t: 0, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    wall: null, wallSeq: 0, wallCast: null, refrHit: [],
    crystal: { hits: [], fracT: 0, fracCd: 0 },
    prism: { t: 0, cd: 0, count: 0 },
    stats: { casts: 0, reduced: 0, fractures: 0, walls: 0, caught: 0, shatters: { catch: 0, burst: 0, replaced: 0, expired: 0 },
      refracted: 0, prismatics: 0 } }
}
export const dhState = f => (f?.omnitrix?.formState?.kind === DH_KEY && f.transformed && f.activeAlien === DH_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshDiamondheadState()
}

const cx = o => o.x + (o.w || 60) / 2
let projRef = null   // the engine's live projectile list (render reads it; never written by render)
const grounded = f => !!(f && (f.onGround || f.grounded))
export const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export const projBox = p => { const pw = p.w || (p.radius || 10) * 2, ph = p.h || (p.radius || 10) * 2; return { x: p.x - pw / 2, y: p.y - ph / 2, w: pw, h: ph } }
export const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || p.move || "")))
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
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference for the shard render
  tickWallCast(f, s, api)
  tickWall(f, s, api)
  tickFans(f, s, api)
  tickCrystal(s)
  tickPrism(f, s)
  s.noAttack = busy(s)
}
const busy = s => !!(s.wallCast)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = dhState(f); if (!s) return md; return busy(s) ? false : md }

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

// ── CRYSTAL BODY (passive) + FRACTURE ──────────────────────────────────────────────────────────────────────────
// −15% damage from PHYSICAL MELEE NORMALS only (tag-based: never specials, projectiles, beams, fire or electric — the same
// test as Goop's goo body, copied so this module stays a leaf). FRACTURE: three HEAVY-tagged melee hits taken (clean, not
// blocked) within 300f crack him: defense −15% (damage taken ×1/0.85) for 240f, once per 600f. Swap / revert / KO clear it.
export const DH_BODY = { MELEE_MULT: 0.85, FRAC_HITS: 3, FRAC_WINDOW: 300, FRAC_T: 240, FRAC_CD: 600, FRAC_MULT: 1 / 0.85 }
const NON_PHYSICAL = /fire|flame|burn|electric|lightning|thunder|volt|plasma|beam|laser|energy/i
export function isPhysicalNormal(attacker, atk) {
  if (!atk || atk.isSpecial || atk.isUltimate || atk.isCinematic || atk.cinematic) return false
  if (["special", "ultimate", "grab", "throw", "projectile"].includes(atk.category)) return false
  if (/grab|throw|ult|special|beam|laser/i.test(atk.name || "")) return false
  const md = attacker?.basic_attacks?.[atk.name] || null
  for (const src of [atk, md]) {
    if (!src) continue
    if (src.fire || src.electric || src.beam || src.isBeam) return false
    if (NON_PHYSICAL.test(String(src.element || "")) || NON_PHYSICAL.test(String(src.damageType || ""))) return false
  }
  return true
}
export const isHeavyHit = atk => !!atk && (atk.name === "heavy" || atk.heavy === true || atk.category === "heavy" || /heavy/i.test(String(atk.name || "")))
function tickCrystal(s) {
  const c = s.crystal
  if (c.fracT > 0) c.fracT--
  if (c.fracCd > 0) c.fracCd--
}
export const fractured = s => !!s && s.crystal.fracT > 0
// struck hook (combat melee / projectile / grab contact, observation only): Fracture counting (+ Harden, Phase 5)
function struck(f, info) {
  const s = dhState(f); if (!s || !info) return
  if (info.kind === "melee" && !info.blocked && isHeavyHit(info.move) && !(info.move && info.move.isGrab)) {
    const c = s.crystal
    c.hits = c.hits.filter(at => s.t - at < DH_BODY.FRAC_WINDOW); c.hits.push(s.t)
    if (c.hits.length >= DH_BODY.FRAC_HITS && c.fracT === 0 && c.fracCd === 0) {
      c.fracT = DH_BODY.FRAC_T; c.fracCd = DH_BODY.FRAC_CD; c.hits = []; s.stats.fractures++
    }
  }
}
function damageTaken(f, raw, opts) {
  const s = dhState(f); if (!s) return raw
  opts = opts || {}
  if (opts.source === "melee" && opts.attacker && isPhysicalNormal(opts.attacker, opts.attacker.currentAttack)) { raw *= DH_BODY.MELEE_MULT; s.stats.reduced++ }
  if (s.crystal.fracT > 0 && opts.source !== "block-chip") raw *= DH_BODY.FRAC_MULT
  return raw
}
// PRISMATIC: +10% damage dealt (Phase 3) — damage attributed to the form
function damageDealt(f, target, raw, opts) { const s = dhState(f); return s && s.prism.t > 0 ? raw * DH_PRISM.DMG : raw }

// ── PRISM WALL (↓↙← + P, cost 14) ───────────────────────────────────────────────────────────────────────────
// One per owner (a new one replaces the old). ATTACK 3 hand-to-ground cast: 18f startup, then the pane rises 140 px ahead at
// the ground he stands on (stage-clamped). NOT collision: a gameplay object with a catch box and a 300f lifetime — never a
// floor / wall change, never traps anyone (both fighters walk through it). It CATCHES up to 3 opponent non-beam projectiles
// that touch it (each deleted, ownership-aware: his own pass); the 3rd catch shatters it → PRISMATIC. REFRACTION: his own
// Shard Shot shards crossing it split into a 3-way fan (0° / ±12°, one hitbox per shard) at 40% damage; a target is hit by
// the refracted fan ONCE per cast; the cast still adds at most one Shard pip. Every record is plain data; atomic: a
// projectile is caught (or a shard refracted) exactly once.
export const DH_WALL = { COST: 14, STARTUP: 18, TOTAL: 30, DIST: 140, LIFE: 300, W: 34, H: 150, CATCH: 3, RISE: 10, LINGER: 16,
  REFR_MULT: 0.4, REFR_DEG: 12 }
export const wallBox = w => ({ x: w.x - DH_WALL.W / 2, y: w.y - DH_WALL.H, w: DH_WALL.W, h: DH_WALL.H })
export const wallLive = s => !!(s.wall && !s.wall.gone)
function castWall(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "dhGround", DH_WALL.COST, DH_WALL.TOTAL); if (!c) return false
  s.wallCast = { t: 0, cast: c.cast }
  return true
}
function tickWallCast(f, s) {
  const c = s.wallCast; if (!c) return
  c.t++
  if ((f.hitstun || 0) > 0) { s.wallCast = null; return }                 // knocked out before 18f: no wall (Power spent)
  if (c.t === DH_WALL.STARTUP) placeWall(f, s, c.cast)
  f._spriteCastMove = "dhGround"; f._spriteCastTimer = Math.max(2, DH_WALL.TOTAL - c.t)
  if (c.t >= DH_WALL.TOTAL) s.wallCast = null
}
function placeWall(f, s, cast) {
  if (wallLive(s)) endWall(s, "replaced")
  const face = f.facing || 1
  const x = Math.max(s.stage.L + 30, Math.min(s.stage.R - 30, Math.round(cx(f) + face * DH_WALL.DIST)))
  s.wall = { id: ++s.wallSeq, x, y: f.y + (f.h || 110), t: 0, caught: 0, cast, gone: false, by: null, ct: 0 }
  s.stats.walls++
}
function endWall(s, by) {
  const w = s.wall; if (!w || w.gone) return false
  w.gone = true; w.by = by; w.ct = DH_WALL.LINGER
  s.stats.shatters[by] = (s.stats.shatters[by] || 0) + 1
  return true
}
const enemyShot = (f, p) => !!p && p.owner !== f && !p.visualOnly && !isBeam(p)
function tickWall(f, s, api) {
  const w = s.wall; if (!w) return
  if (w.gone) { if (--w.ct <= 0) s.wall = null; return }
  w.t++
  if (w.t >= DH_WALL.LIFE) { endWall(s, "expired"); return }
  if (!api || !api.activeProjectiles) return
  const L = api.activeProjectiles(), box = wallBox(w)
  for (let k = L.length - 1; k >= 0 && !w.gone; k--) {
    const p = L[k]
    if (enemyShot(f, p) && overlap(projBox(p), box)) {                    // CATCH (deleted once — the splice is the atomic gate)
      L.splice(k, 1); w.caught++; s.stats.caught++
      if (w.caught >= DH_WALL.CATCH && endWall(s, "catch")) startPrism(s)
    } else if (p && p.owner === f && p.alien && p.alien.dh === "shard" && !p.alien.refr && overlap(projBox(p), box)) refract(s, p, w)
  }
  // a refracted fan hits each target ONCE per cast: once one connected (onContact), the rest of that cast's fans are dropped
  if (s.refrHit.length) for (let k = L.length - 1; k >= 0; k--) { const p = L[k]
    if (p && p.owner === f && p.alien && p.alien.dh === "fan" && s.refrHit.includes(p.alien.cast)) L.splice(k, 1) }
}
// REFRACTION: the shard becomes a 3-way fan (render: 3 shards at 0° / ±12°; sim: one hitbox whose height follows the fan)
function refract(s, p, w) {
  p.alien = { ...p.alien, dh: "fan", refr: true, fanX: w.x, pip: p.alien.pip }
  p.damage = Math.max(1, Math.round((p.damage || 0) * DH_WALL.REFR_MULT))
  p.h0 = p.h || 16; s.stats.refracted++
}
export const fanSpread = dist => Math.tan(DH_WALL.REFR_DEG * Math.PI / 180) * Math.max(0, dist)
function tickFans(f, s, api) {
  if (!api || !api.activeProjectiles) return
  for (const p of api.activeProjectiles()) if (p && p.owner === f && p.alien && p.alien.dh === "fan")
    p.h = (p.h0 || 16) + 2 * fanSpread(Math.abs(p.x - p.alien.fanX))   // the fan's vertical reach grows with distance
}

// ── PRISMATIC (his ALT PAL state) ──────────────────────────────────────────────────────────────────────────────
// A wall shattering from its 3rd catch (or destroyed by his own Shatter Burst, Phase 4) → PRISMATIC 180f, once per 600f:
// Shard Shot pierces (one hit per target, flies on), damage +10% (damageDealt). The flag lives in GAME_STATE; the palette is
// a render-only frame-set swap to the sampled alt-pal strips (Megawhatt / Brainstorm `_skinAnim` precedent).
export const DH_PRISM = { DUR: 180, CD: 600, DMG: 1.10 }
export function startPrism(s) {
  const p = s.prism
  if (p.t > 0 || p.cd > 0) return false
  p.t = DH_PRISM.DUR; p.cd = DH_PRISM.CD; p.count++; s.stats.prismatics++
  return true
}
export const prismatic = s => !!s && s.prism.t > 0
function tickPrism(f, s) {
  const p = s.prism
  if (p.t > 0) p.t--
  if (p.cd > 0) p.cd--
  const want = p.t > 0 ? PRISM_ANIM : ANIM                                   // render-only frame-set swap
  if (f._skinAnim !== want) f._skinAnim = want
}

// ── SPECIALS (dispatch; Phase 5 adds the rest) ─────────────────────────────────────────────────────────────────
export const DH_COST = { wall: DH_WALL.COST }
function fireSpecial(f, ctx, api) {
  const s = dhState(f); if (!s) return false
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (grounded(f) && dir === "B") return castWall(f, s, api)
  return false
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === DH_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
export const FX_SCALE = 3                                                     // extracted FX: integer nearest-neighbour ×3
function fxFrame(c, key, i, x, bottomY, scale = FX_SCALE, flip = 1) {
  const a = DIAMONDHEAD_FX[key]; const img = a && sheetImg(a.sheet); if (!img) return
  const k = Math.max(0, Math.min(a.frames - 1, i | 0)), dw = a.w * scale, dh = a.h * scale
  c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(bottomY)); if (flip < 0) c.scale(-1, 1)
  c.drawImage(img, k * a.w, 0, a.w, a.h, Math.round(-dw / 2), -dh, dw, dh); c.restore()
}
function rHash(a, b, c) {   // render-only deterministic hash → [0, 1) (glint / facet jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const OUT = "#0b1414", MINT = "#99ddc8", PALE = "#d9fff4", TEAL = "#2fae98", GREEN = "#4fae6b", WHITE = "#f3f4f2"
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
export function drawPixelRing(c, x, y, rx, ry, col, k = 3, n = 0, phase = 0) {
  if (!(rx > 0)) return
  n = n || Math.max(12, Math.round(rx * 0.5)); c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + phase; px(c, x + Math.cos(a) * rx, y + Math.sin(a) * ry, k) }
}
// procedural pixel crystal pane: an outlined faceted slab (facet lines + glints), rising from the ground
function drawPane(c, x, groundY, w, h, seed, alpha = 1) {
  if (!(h > 2)) return
  c.save(); c.globalAlpha *= alpha
  const x0 = Math.round(x - w / 2), y0 = Math.round(groundY - h)
  c.fillStyle = OUT; c.fillRect(x0 - 2, y0 - 6, w + 4, h + 6)
  c.fillStyle = "rgba(153,221,200,0.55)"; c.fillRect(x0, y0 - 4, w, h + 4)
  c.fillStyle = PALE; for (let k = 0; k < 4; k++) c.fillRect(x0 + 2 + k * 2, y0 - 4 + k * 3, Math.max(2, w - 4 - k * 4), 2)   // the pointed top
  c.fillStyle = TEAL
  for (let k = 0; k < 5; k++) { const fy = y0 + (k + 1) * h / 6 + (rHash(seed, k, 1) - 0.5) * 10, fx = x0 + 3 + rHash(seed, k, 2) * (w - 8)   // facet lines
    for (let q = 0; q < 6; q++) px(c, fx + q * (rHash(seed, k, 3) > 0.5 ? 2 : -2), fy + q * 2, 2) }
  c.fillStyle = WHITE; for (let k = 0; k < 3; k++) px(c, x0 + 4 + rHash(seed, k, 4) * (w - 8), y0 + rHash(seed, k, 5) * h, 3)   // glints
  c.restore()
}
// world-space layer under both fighters: the Prism Wall (pane + the extracted spike growth at its base) / its shatter
export function drawDiamondheadUnder(c, f) {
  const s = dhState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const w = s.wall
  if (w && !w.gone) {
    const rise = Math.min(1, w.t / DH_WALL.RISE), life = DH_WALL.LIFE - w.t
    const blink = life < 40 && (life >> 2) % 2 ? 0.5 : 1
    fxFrame(c, "spike3", Math.min(2, (w.t / DH_WALL.RISE * 3) | 0), w.x, w.y, FX_SCALE)            // the crystal growth at its base
    drawPane(c, w.x, w.y, DH_WALL.W, DH_WALL.H * rise, w.id, blink)
    for (let k = 0; k < w.caught; k++) { c.fillStyle = OUT; px(c, w.x - 8 + k * 8, w.y - DH_WALL.H * 0.55 + k * 9, 6); c.fillStyle = "#fef08a"; px(c, w.x - 8 + k * 8, w.y - DH_WALL.H * 0.55 + k * 9, 3) }   // cracks per catch
  } else if (w && w.gone) {
    const q = 1 - w.ct / DH_WALL.LINGER                                           // shatter: a pixel shard ring flying out
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, r = 10 + q * 70
      c.fillStyle = OUT; px(c, w.x + Math.cos(a) * r, w.y - DH_WALL.H / 2 + Math.sin(a) * r * 0.9, 7); c.fillStyle = k % 2 ? MINT : PALE; px(c, w.x + Math.cos(a) * r, w.y - DH_WALL.H / 2 + Math.sin(a) * r * 0.9, 4) }
  }
  c.restore()
}
export function drawDiamondheadFx(c, f, frame = 0, opp = null) {
  const s = dhState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const fx = cx(f), fy = f.y + (f.h || 110) * 0.5
  if (s.prism.t > 0) {                                                         // PRISMATIC: a refracting glint ring
    const cols = ["#f472b6", "#facc15", "#5eead4", "#818cf8"]
    drawPixelRing(c, fx, fy, (f.w || 60) * 0.95, (f.h || 110) * 0.58, cols[(frame >> 3) % 4], 3, 18, frame / 30)
  }
  if (s.crystal.fracT > 0) {                                                   // FRACTURE: crack lines over the body
    c.fillStyle = "#fef08a"; for (let k = 0; k < 8; k++) px(c, fx - 14 + k * 4, f.y + (f.h || 110) * 0.3 + ((k * 7) % 11), 2)
  }
  if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && (p.alien.dh === "shard" || p.alien.dh === "fan")) {   // shards / refracted fans
    const face = (p.vx || 0) >= 0 ? 1 : -1
    if (p.alien.dh === "shard") fxFrame(c, "shard", (p.alien.k || 0) % 3, p.x, p.y + DIAMONDHEAD_FX.shard.h * FX_SCALE / 2, FX_SCALE, face)
    else { const sp = fanSpread(Math.abs(p.x - p.alien.fanX))
      for (const sd of [-1, 0, 1]) fxFrame(c, "shard", 1, p.x, p.y + sd * sp + DIAMONDHEAD_FX.shard.h * FX_SCALE / 2, FX_SCALE, face)
      c.fillStyle = "rgba(250,250,255,0.5)"; for (const sd of [-1, 1]) for (let q = 0; q < 6; q++) px(c, p.alien.fanX + (p.x - p.alien.fanX) * q / 6, p.y + sd * fanSpread(Math.abs(p.x - p.alien.fanX)) * q / 6, 2) }   // refraction beams
  }
  c.restore()
}
export function drawDiamondheadHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = dhState(f); if (!ctx || !s) return
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - 64 : x + 8
  ctx.save()
  ctx.textBaseline = "top"
  const w = s.wall                                                            // WALL slot: catches (0–3) + life bar
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, 18, 14)
  ctx.strokeStyle = w && !w.gone ? MINT : "#4b5563"; ctx.lineWidth = 1; ctx.strokeRect(bx + 0.5, y + 0.5, 17, 13)
  if (w && !w.gone) { ctx.fillStyle = MINT; ctx.fillRect(bx + 7, y + 2, 4, 10); for (let k = 0; k < w.caught; k++) { ctx.fillStyle = "#fef08a"; ctx.fillRect(bx + 2 + k * 5, y + 12, 4, 1) }
    ctx.fillStyle = "#e5e7eb"; ctx.fillRect(bx + 2, y + 13, Math.round(14 * (1 - w.t / DH_WALL.LIFE)), 1) }
  const tx = flip ? bx - 6 : bx + 22
  ctx.textAlign = flip ? "right" : "left"; ctx.font = "bold 7px Arial"
  ctx.fillStyle = s.prism.t > 0 ? "#f9a8d4" : "#9ca3af"
  ctx.fillText(s.prism.t > 0 ? `PRISMATIC ${Math.ceil(s.prism.t / 60)}s` : s.crystal.fracT > 0 ? `FRACTURED ${Math.ceil(s.crystal.fracT / 60)}s` : "CRYSTAL", tx, y)
  ctx.restore()
}
