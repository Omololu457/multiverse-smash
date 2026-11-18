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
  onApply, tick, moveFrames, hurtbox, fireSpecial, fireUltimate, struck, damageTaken, damageDealt, onContact, blockHeavy, targetOffset,
  drawHud: drawDiamondheadHud, drawFx: drawDiamondheadFx, drawUnder: drawDiamondheadUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshDiamondheadState() {
  return { kind: DH_KEY, t: 0, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    wall: null, wallSeq: 0, wallCast: null, refrHit: [],
    crystal: { hits: [], fracT: 0, fracCd: 0 },
    prism: { t: 0, cd: 0, count: 0 },
    shards: { pips: 0, pipT: 0, pipped: [] }, burst: null,
    shoot: null, spike: null, lance: null, dive: null, diveUsed: false, landT: -999,
    harden: { t: 0, cd: 0, used: false, clear: false, rec: 0 },
    ult: null, lastUltRaw: 0, lastUltSpots: [], lastUltPips: 0,
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    stats: { casts: 0, reduced: 0, fractures: 0, walls: 0, caught: 0, shatters: { catch: 0, burst: 0, replaced: 0, expired: 0 },
      refracted: 0, prismatics: 0, pips: 0, bursts: 0, burstHits: 0, burstPips: [],
      shots: 0, spikes: 0, lances: 0, dives: 0, hardens: 0, hardened: 0, ults: 0 } }
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
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  tickInputs(f, s, input || {})
  if (grounded(f)) s.diveUsed = false                                      // Diamond Dive: once per airtime
  tickHarden(f, s)
  tickWallCast(f, s, api)
  tickShoot(f, s, api)
  tickSpike(f, s, api, opp)
  tickLance(f, s, api)
  tickDive(f, s, api)
  tickWall(f, s, api)
  tickFans(f, s, api)
  tickCrystal(s)
  tickBurst(f, s, api)
  tickShards(s)
  tickUlt(f, s, opp, api, ctx)
  tickPrism(f, s)
  s.noAttack = busy(s)
}
const busy = s => !!(s.wallCast || s.burst || s.shoot || s.spike || s.lance || s.dive || s.ult || s.harden.t > 0 || s.harden.rec > 0)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = dhState(f); if (!s) return md; return busy(s) ? false : md }

// HEAVY: the arm extends into a crystal lance (190 px) — the lance is part of his hurtbox while it is out (whiff-punishable)
export const DH_HEAVY_LANCE = { REACH: 190, ARM_Y: 0.32, H: 30 }
function hurtbox(f) {
  const s = dhState(f); if (!s) return null
  const L = s.lance, lext = L ? lanceExt(L.t) : 0
  if (L && lext > 0) {                                                       // CRYSTAL LANCE: the full lance is part of his hurtbox
    const body = { x: f.x + 6, y: f.y + 6, w: Math.max(1, (f.w || 60) - 12), h: Math.max(1, (f.h || 110) - 6) }
    const edge = cx(f) + L.face * (f.w || 60) / 2, ay = f.y + (f.h || 110) * DH_LANCE.ARM_Y
    const x0 = Math.min(body.x, edge, edge + L.face * lext), x1 = Math.max(body.x + body.w, edge, edge + L.face * lext)
    return { x: x0, y: Math.min(body.y, ay), w: x1 - x0, h: Math.max(body.y + body.h, ay + DH_LANCE.H) - Math.min(body.y, ay) }
  }
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
  const h = s.harden
  // HARDEN caught this hit → no hitstun. Melee: `struck` runs BEFORE the damage (damageTaken marks it used right after) and
  // before hitstun is set, so the clear happens on the next tick; projectile: after both, so it clears here at once.
  const meleeIn = info.kind === "melee" && !info.blocked && h.t > 0 && !h.used, projIn = info.kind === "projectile" && h.used && h.at === s.t
  if (!h.clear && (meleeIn || projIn)) {
    h.clear = true
    if (info.kind === "projectile") { f.hitstun = 0; f.vx = 0; f.vy = 0 }   // projectile hitstun is already set here; melee's is cleared next tick
  }
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
  const h = s.harden
  if (h.t > 0 && !h.used && (opts.source === "melee" || (opts.source === "projectile" && !isBeam({ name: opts.move })))) {   // HARDEN: one hit at 50%
    h.used = true; h.at = s.t; h.t = 0; s.stats.hardened++; raw *= DH_HARDEN.TAKE
  }
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

// ── SHARDS (a status on the OPPONENT, owned by this form's GAME_STATE; spend-on-demand) ─────────────────────
// Clean hits from Shard Shot, Spike Eruption and Crystal Lance's finisher EMBED one Shard pip per cast (regardless of hit
// ticks), max 3; none from blocks, FX or the Prism Wall. Pips expire 300f after the last one. Nothing refreshes them but a
// new cast, and only Shatter Burst / the ultimate's Cathedral Shatter spend them. Swap / revert / KO / rematch clear them.
export const DH_SHARD = { MAX: 3, EXPIRE: 300 }
export function addPip(s, cast) {
  const e = s.shards
  if (cast == null || e.pipped.includes(cast)) return false
  e.pipped.push(cast); if (e.pipped.length > 12) e.pipped.shift()
  if (e.pips >= DH_SHARD.MAX) { e.pipT = DH_SHARD.EXPIRE; return false }     // capped: the timer still refreshes from a new cast
  e.pips++; e.pipT = DH_SHARD.EXPIRE; s.stats.pips++
  return true
}
function tickShards(s) {
  const e = s.shards
  if (e.pips > 0 && --e.pipT <= 0) { e.pips = 0; e.pipT = 0 }
}
// contact hook (combat → ben10State.benAlienContact): pips on CLEAN hits of tagged casts; Shatter Burst spends on a hit
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = dhState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || !tag.dh) return
  if (tag.dh === "fan" && !s.refrHit.includes(tag.cast)) { s.refrHit.push(tag.cast); if (s.refrHit.length > 8) s.refrHit.shift() }
  if (tag.dh === "burst" && !blocked) { s.stats.burstHits++; s.stats.burstPips.push(tag.pips); if (s.stats.burstPips.length > 8) s.stats.burstPips.shift()
    s.shards.pips = Math.max(0, s.shards.pips - tag.pips); if (s.shards.pips === 0) s.shards.pipT = 0 }   // consumed on a HIT only
  if (tag.dh === "dive" && s.dive && s.dive.cast === tag.cast) s.dive.hit = true   // one hit per cast (blocked too)
  if (tag.dh === "spike" && !blocked && s.spike && s.spike.cast === tag.cast) s.spike.carry = true
  if (tag.dh === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (!blocked && tag.pip) addPip(s, tag.cast)
}

// ── SHATTER BURST (→↓↘ + P, read as ↑ + P; cost 12) ─────────────────────────────────────────────────────────
// Detonates the embedded shards: 30 + 15 per pip (0 pips: a weak 30), radius 140 px around him, 16f startup, −12 on block.
// The pip count is read when the burst goes off; pips are consumed only if it HITS (blocked / whiffed: they stay). No stun
// or status beyond the pips. It also SHATTERS his own Prism Wall when the wall is inside the radius → PRISMATIC.
export const DH_BURST = { COST: 12, STARTUP: 16, ACTIVE: 3, RECOVERY: 24, BASE: 30, PER_PIP: 15, RADIUS: 140, ON_BLOCK: -12 }
DH_BURST.TOTAL = DH_BURST.STARTUP + DH_BURST.ACTIVE + DH_BURST.RECOVERY
export const burstDamage = pips => DH_BURST.BASE + DH_BURST.PER_PIP * Math.max(0, Math.min(DH_SHARD.MAX, pips | 0))
function castBurst(f, s, api) {
  const c = beginCast(f, s, api, "dhBurst", DH_BURST.COST, DH_BURST.TOTAL); if (!c) return false
  s.burst = { t: 0, cast: c.cast, face: f.facing || 1, pips: 0 }; s.stats.bursts++
  return true
}
function tickBurst(f, s, api) {
  const b = s.burst; if (!b) return
  b.t++
  if ((f.hitstun || 0) > 0) { s.burst = null; return }
  if (b.t === DH_BURST.STARTUP) {
    b.pips = s.shards.pips
    const rem = DH_BURST.TOTAL - b.t, R = DH_BURST.RADIUS
    hitbox(f, api, "dh_burst", b.face, { damage: burstDamage(b.pips), spawnX: cx(f), spawnY: f.y + (f.h || 110) / 2, w: (f.w || 60) + 2 * R, h: (f.h || 110) + R,
      lifetime: DH_BURST.ACTIVE, hitstun: 22, blockstun: blockstunFor(rem, DH_BURST.ON_BLOCK), knockbackX: 5, knockbackY: -4,
      vx: 0.01 * b.face, alien: { dh: "burst", pip: false, cast: b.cast, pips: b.pips } })
    const w = s.wall
    if (w && !w.gone && Math.abs(w.x - cx(f)) <= R + (f.w || 60) / 2 && endWall(s, "burst")) startPrism(s)
  }
  f._spriteCastMove = "dhBurst"; f._spriteCastTimer = Math.max(2, DH_BURST.TOTAL - b.t)
  if (b.t >= DH_BURST.TOTAL) s.burst = null
}
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins
// (so "→ then ↓↘→" is Shard Shot, not a DP), ties by specificity:
//   ↓↘→ + P (236) SHARD SHOT        ↓↙← + P (214) PRISM WALL        →→ + P (a frame-counted double tap) SPIKE ERUPTION
//   ←↙↓ + P (412) CRYSTAL LANCE     →↓↘ + P (623) SHATTER BURST     air: any + P DIAMOND DIVE (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / → Shard Shot (→ after a
// double tap = Spike Eruption), ← Prism Wall, ↓ Crystal Lance, ↑ Shatter Burst.
export const DH_DASH_WINDOW = 14, DH_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= DH_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "burst"], ["412", "lance"], ["214", "wall"], ["236", "shot"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= DH_MOTION_WINDOW).map(e => e.d).join("")
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
  if (dir === "B") return "wall"
  if (dir === "D") return "lance"
  if (dir === "U") return "burst"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= DH_DASH_WINDOW) return "spike"
  return "shot"
}

// 1. SHARD SHOT (↓↘→ + P, 10) — SHOOT f1–3 + the extracted shard slivers: a fast volley of 3 shards in a tight line, 520 px,
//    15 each (45 if the whole line connects; each shard hits a target once), one volley on screen. A clean hit +1 Shard pip
//    (one per cast). PRISMATIC: the shards pierce (one hit per target, fly on). Crossing his Prism Wall: refraction (Phase 3).
export const DH_SHOT = { STARTUP: 10, RECOVERY: 18, DMG: 15, N: 3, GAP: 26, SPEED: 18, RANGE: 520, W: 30, H: 16, ARM_Y: 0.34 }
DH_SHOT.TOTAL = DH_SHOT.STARTUP + DH_SHOT.RECOVERY
const ownShards = (f, api) => api && api.activeProjectiles().some(p => p && p.owner === f && p.alien && (p.alien.dh === "shard" || p.alien.dh === "fan"))
function castShot(f, s, api) {
  if (ownShards(f, api)) return false                                       // one volley on screen
  const c = beginCast(f, s, api, "dhShoot", DH_COST.shot, DH_SHOT.TOTAL); if (!c) return false
  s.shoot = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.shots++
  return true
}
function tickShoot(f, s, api) {
  const d = s.shoot; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.shoot = null; return }
  if (d.t === DH_SHOT.STARTUP) { const pierce = s.prism.t > 0
    for (let k = 0; k < DH_SHOT.N; k++) hitbox(f, api, "dh_shard", d.face, { damage: DH_SHOT.DMG, vx: d.face * DH_SHOT.SPEED, speed: DH_SHOT.SPEED,
      spawnX: cx(f) + d.face * ((f.w || 60) / 2 + 24 - k * DH_SHOT.GAP), spawnY: f.y + (f.h || 110) * DH_SHOT.ARM_Y, w: DH_SHOT.W, h: DH_SHOT.H,
      lifetime: Math.round(DH_SHOT.RANGE / DH_SHOT.SPEED) + k * 2, hitstun: 14, blockstun: 8, knockbackX: 0.6, knockbackY: 0, noHitstop: k < DH_SHOT.N - 1,
      ...(pierce ? { piercesMulti: true } : {}), alien: { dh: "shard", pip: true, cast: d.cast, k } }) }
  f._spriteCastMove = "dhShoot"; f._spriteCastTimer = Math.max(2, DH_SHOT.TOTAL - d.t)
  if (d.t >= DH_SHOT.TOTAL) s.shoot = null
}

// 3. SPIKE ERUPTION (→→ + P, 14) — ATTACK 3 hand to ground; spikes erupt in a forward line at 80 / 160 / 240 / 320 px past his
//    front edge, 6f apart (growth from the extracted ATTACK 2 spike frames): 4 hits × 14 = 56, the last pops the opponent up,
//    −14 on block. Real travel, no tracking: the spikes rise where they rise; a connected spike CARRIES the opponent to the
//    next one (stage-clamped). Spikes are hitboxes only, never solid. A clean hit +1 Shard pip (one per cast).
export const DH_SPIKE = { AT: [12, 18, 24, 30], STEP: 80, DMG: 14, W: 84, H: 110, RECOVERY: 24, ON_BLOCK: -14 }
DH_SPIKE.TOTAL = DH_SPIKE.AT[3] + 3 + DH_SPIKE.RECOVERY
function castSpike(f, s, api) {
  const c = beginCast(f, s, api, "dhGround", DH_COST.spike, DH_SPIKE.TOTAL); if (!c) return false
  s.spike = { t: 0, cast: c.cast, face: f.facing || 1, edge: cx(f) + (f.facing || 1) * (f.w || 60) / 2, ground: f.y + (f.h || 110), carry: false, xs: [] }
  s.stats.spikes++
  return true
}
function tickSpike(f, s, api, opp) {
  const d = s.spike; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.spike = null; return }
  const k = DH_SPIKE.AT.indexOf(d.t)
  if (k >= 0) {
    const x = Math.max(s.stage.L + 20, Math.min(s.stage.R - 20, d.edge + d.face * DH_SPIKE.STEP * (k + 1))), last = k === DH_SPIKE.AT.length - 1
    if (d.carry && opp && !opp.eliminated) { opp.x = Math.max(s.stage.L, Math.min(s.stage.R - (opp.w || 60), x - (opp.w || 60) / 2)) }   // carried along the line
    d.xs.push(x)
    const rem = DH_SPIKE.TOTAL - d.t
    hitbox(f, api, "dh_spike", d.face, { damage: DH_SPIKE.DMG, spawnX: x, spawnY: d.ground - DH_SPIKE.H / 2, w: DH_SPIKE.W, h: DH_SPIKE.H, lifetime: 3,
      hitstun: last ? 30 : DH_SPIKE.AT[1] - DH_SPIKE.AT[0] + 8, blockstun: last ? blockstunFor(rem, DH_SPIKE.ON_BLOCK) : 10, noHitstop: !last,
      knockbackX: last ? 2 : 0.4, knockbackY: last ? -8 : 0, ...(last ? { launcher: true, launchVy: -8 } : {}),
      alien: { dh: "spike", pip: true, cast: d.cast, k } })
  }
  f._spriteCastMove = "dhGround"; f._spriteCastTimer = Math.max(2, DH_SPIKE.TOTAL - d.t)
  if (d.t >= DH_SPIKE.TOTAL) s.spike = null
}

// 4. CRYSTAL LANCE (←↙↓ + P, 12) — ATTACK 1 f3 extend, f4 the full lance (held), f5 recover: a 360 px thrust, 2 hits 22 / 30 = 52,
//    −12 on block, 22f recovery after the last hit (whiff-punishable: the lance is part of his hurtbox while it is out).
//    The finisher's clean hit +1 Shard pip.
export const DH_LANCE = { HITS_AT: [14, 18], DMG: [22, 30], REACH: 360, EXT_FROM: 6, FULL_AT: 14, HOLD_TO: 20, RETRACT_TO: 28, RECOVERY: 22,
  ON_BLOCK: -12, H: 34, ARM_Y: 0.32 }
DH_LANCE.TOTAL = DH_LANCE.HITS_AT[1] + 2 + DH_LANCE.RECOVERY
export function lanceExt(t, reach = DH_LANCE.REACH) {
  const L = DH_LANCE
  if (t < L.EXT_FROM) return 0
  if (t <= L.FULL_AT) return reach * (t - L.EXT_FROM) / (L.FULL_AT - L.EXT_FROM)
  if (t <= L.HOLD_TO) return reach
  if (t <= L.RETRACT_TO) return reach * (L.RETRACT_TO - t) / (L.RETRACT_TO - L.HOLD_TO)
  return 0
}
const armEdge = (f, face) => cx(f) + face * (f.w || 60) / 2
function castLance(f, s, api) {
  const c = beginCast(f, s, api, "dhLance", DH_COST.lance, DH_LANCE.TOTAL); if (!c) return false
  s.lance = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.lances++
  return true
}
function tickLance(f, s, api) {
  const w = s.lance; if (!w) return
  w.t++
  if ((f.hitstun || 0) > 0) { s.lance = null; return }
  const k = DH_LANCE.HITS_AT.indexOf(w.t)
  if (k >= 0) { const last = k === DH_LANCE.HITS_AT.length - 1, rem = DH_LANCE.TOTAL - w.t, ext = lanceExt(w.t), edge = armEdge(f, w.face)
    hitbox(f, api, "dh_lance", w.face, { damage: DH_LANCE.DMG[k], spawnX: edge + w.face * ext / 2, spawnY: f.y + (f.h || 110) * DH_LANCE.ARM_Y + 10,
      w: ext, h: DH_LANCE.H, lifetime: 2, hitstun: last ? rem + 8 : 16, blockstun: last ? blockstunFor(rem, DH_LANCE.ON_BLOCK) : 12, noHitstop: !last,
      knockbackX: last ? 6 : 0.4, knockbackY: last ? -3 : 0, alien: { dh: "lance", pip: last, cast: w.cast } }) }
  f._spriteCastMove = "dhLance"; f._spriteCastTimer = Math.max(2, DH_LANCE.TOTAL - w.t)
  if (w.t >= DH_LANCE.TOTAL) s.lance = null
}

// 6. DIAMOND DIVE (air: any direction + P, 12) — FALL frame + a crystal blade: a diagonal dive down-forward (the shared ready-form
//    `_benGlide`), 50 on a hit (one hit per cast), once per airtime, no jump refill. Landing = a small, bounded, purely
//    cosmetic shard pop (render reads `landT`).
export const DH_DIVE = { STARTUP: 4, SPEED: 9, MAX: 50, DMG: 50, W: 70, H: 60, LAND_RECOVERY: 14 }
function castDive(f, s, api) {
  if (grounded(f) || s.diveUsed) return false
  const c = beginCast(f, s, api, "dhDive", DH_COST.dive, DH_DIVE.MAX + DH_DIVE.LAND_RECOVERY, { commit: false }); if (!c) return false
  s.diveUsed = true
  s.dive = { t: 0, cast: c.cast, face: f.facing || 1, hit: false, lastY: f.y }; s.stats.dives++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
function tickDive(f, s, api) {
  const d = s.dive; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endDive(f, s, false); return }
  if (d.t < DH_DIVE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > DH_DIVE.STARTUP + 1 && f.y === d.lastY
  d.lastY = f.y
  if (landed || d.t >= DH_DIVE.MAX) { endDive(f, s, landed); return }
  f._benGlide = { vx: d.face * DH_DIVE.SPEED, vy: DH_DIVE.SPEED }
  if (!d.hit) hitbox(f, api, "dh_dive", d.face, { damage: DH_DIVE.DMG, spawnX: cx(f) + d.face * 18, spawnY: f.y + (f.h || 110) * 0.7, w: DH_DIVE.W, h: DH_DIVE.H,
    lifetime: 1, hitstun: 26, blockstun: 12, knockbackX: 5, knockbackY: -3, alien: { dh: "dive", pip: false, cast: d.cast } })
  f._spriteCastMove = "dhDive"; f._spriteCastTimer = 2
}
function endDive(f, s, landed) {
  s.dive = null; delete f._benGlide
  if (landed) { s.landT = s.t; f.attackCooldown = DH_DIVE.LAND_RECOVERY; f._benPowerCommit = DH_DIVE.LAND_RECOVERY; f._spriteCastMove = "crouch"; f._spriteCastTimer = DH_DIVE.LAND_RECOVERY }
  else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
}

// ── HARDEN (Block + Heavy; cost 0, 7 s cooldown) ─────────────────────────────────────────────────────────────
// A 12f window holding the CROUCH frame with a procedural crystal sheen. The first hit landing inside it — melee or a
// non-beam projectile; beams and throws ignore it — is taken at 50% and costs him no hitstun; Harden then ends and a 30f
// punishable recovery plays. One hit only; no other armor.
export const DH_HARDEN = { WINDOW: 12, CD: 420, TAKE: 0.5, RECOVERY: 30 }
function blockHeavy(f) {
  const s = dhState(f); if (!s) return false
  const h = s.harden
  if (h.cd > 0 || busy(s) || (f.hitstun || 0) > 0 || f.attacking || !f.transformed) return false
  h.t = DH_HARDEN.WINDOW; h.cd = DH_HARDEN.CD; h.used = false; h.clear = false; h.rec = 0; s.stats.hardens++
  f._spriteCastMove = "dhHarden"; f._spriteCastTimer = DH_HARDEN.WINDOW; f._benPowerCommit = DH_HARDEN.WINDOW; f.attackCooldown = DH_HARDEN.WINDOW; f.vx = 0
  return true
}
function tickHarden(f, s) {
  const h = s.harden
  if (h.cd > 0) h.cd--
  if (h.used && h.clear) {                                                  // the caught hit: no hitstun, then the 30f recovery
    f.hitstun = 0; f.hitstop = 0; f.vx = 0; f.vy = 0
    h.clear = false; h.rec = DH_HARDEN.RECOVERY
    f.attackCooldown = DH_HARDEN.RECOVERY; f._benPowerCommit = DH_HARDEN.RECOVERY; f._spriteCastMove = "dhHarden"; f._spriteCastTimer = DH_HARDEN.RECOVERY
    return
  }
  if (h.t > 0) { h.t--; f._spriteCastMove = "dhHarden"; f._spriteCastTimer = Math.max(2, h.t) }
  if (h.rec > 0) h.rec--
}

// ── ULTIMATE: DIAMOND CATHEDRAL (same input as Omnitrix Overload, alien form only) ─────────────────────────────
// 55 Power. Needs a clean opener — a lance thrust (ATTACK 1 lance pose, 300 px, 40); whiff / block = no cinematic, 60f
// recovery. On a clean opener the opponent is held (no collision change) and:
//   1. a procedural pixel CRYSTAL PRISON grows around them (render only, both fighters readable) while the extracted spike
//      frames rise from below;
//   2. SPIRE STORM: 3 spike bursts × 30 = 90 at hash(seed, frame, player index)-chosen positions (spike frames scaled / mirrored);
//   3. CATHEDRAL SHATTER: every embedded Shard pip detonates and the prison explodes outward in a pixel shard ring: 110 + 10 per
//      pip (max +30), the pips consumed.
// 40 + 90 + 110 = 240 unscaled (+30 max with 3 pips). No Shard pip is added. He ends PRISMATIC for 180f (respecting its 600f
// limit). Prison / facets have no hitboxes and no GAME_STATE presence (only the hashed spots are kept, for the test / render).
// Positions restore, no persistent hazards, 100f recovery lockout.
export const DH_ULT = { OPENER_AT: 14, OPENER: 40, RANGE: 300, WHIFF: 60, PRISON: 30, STORM_AT: [36, 50, 64], STORM: 30,
  SHATTER_AT: 84, SHATTER: 110, PER_PIP: 10, END: 100, LOCKOUT: 100, LAUNCH: -14, LIFT: 10 }
function fireUltimate(f, ctx, api) {
  const s = dhState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, DH_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = DH_ULT.OPENER_AT + DH_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "dhLance"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, spots: [], hits: [], pips: 0 }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, DH_ULT.OPENER_AT, () => hitbox(f, api, "dh_ult_open", face, {
    damage: DH_ULT.OPENER, spawnX: armEdge(f, face) + face * DH_ULT.RANGE / 2, spawnY: f.y + (f.h || 110) * DH_LANCE.ARM_Y + 10, w: DH_ULT.RANGE, h: 60,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { dh: "ultOpen", cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "prison"; u.t = 0; u.raw = DH_ULT.OPENER; u.hits.push(DH_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = DH_ULT.END + DH_ULT.LOCKOUT; f._benPowerCommit = DH_ULT.END; f._spriteCastTimer = DH_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, DH_ULT.END + 2)               // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > DH_ULT.OPENER_AT + 12) s.ult = null; return }   // whiff / block: no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "diamond_cathedral", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < DH_ULT.PRISON) { u.phase = "prison"; f._spriteCastMove = "dhGround" }
  else if (u.t < DH_ULT.SHATTER_AT) { u.phase = "storm"; f._spriteCastMove = "dhGround"
    const k = DH_ULT.STORM_AT.indexOf(u.t)
    if (k >= 0) { const seed = ctx?.seed ?? 1, fr = ctx?.frame ?? u.t, pi = pIndex(f)
      u.spots.push({ dx: Math.round((dhHash(seed, fr, pi, k) - 0.5) * 140), flip: dhHash(seed, fr, pi, k + 16) < 0.5 ? -1 : 1 })
      hit(DH_ULT.STORM, 4 + k * 2) } }
  else if (u.t < DH_ULT.END) { u.phase = "shatter"; f._spriteCastMove = "dhBurst"
    if (u.t === DH_ULT.SHATTER_AT) { u.pips = Math.min(DH_SHARD.MAX, s.shards.pips); s.shards.pips = 0; s.shards.pipT = 0
      hit(DH_ULT.SHATTER + DH_ULT.PER_PIP * u.pips, 18) } }
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }       // positions restore
  if (opp && u?.thome) {                                                     // …then the shatter's launch
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 3; opp.vy = DH_ULT.LAUNCH
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
  }
  if (u && u.thome) startPrism(s)                                           // he ends PRISMATIC (respecting its 600f limit)
  s.lastUltRaw = u?.raw || 0; s.lastUltSpots = u?.spots ? u.spots.map(p => ({ ...p })) : []; s.lastUltPips = u?.pips || 0
  s.ult = null
  f.attackCooldown = DH_ULT.LOCKOUT; f._benPowerCommit = DH_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
// render-only: the held opponent lifts a little inside the prison
function targetOffset(f, target) {
  const s = dhState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  return { dx: 0, dy: -Math.round(Math.min(1, u.t / 20) * DH_ULT.LIFT) }
}

// ── SPECIALS (dispatch) ─────────────────────────────────────────────────────────────────
export const DH_COST = { shot: 10, wall: DH_WALL.COST, spike: 14, lance: 12, burst: 12, dive: 12, ultimate: 55 }
function fireSpecial(f, ctx, api) {
  const s = dhState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind) return false
  if (kind === "shot") return castShot(f, s, api)
  if (kind === "wall") return castWall(f, s, api)
  if (kind === "spike") return castSpike(f, s, api)
  if (kind === "lance") return castLance(f, s, api)
  if (kind === "burst") return castBurst(f, s, api)
  if (kind === "dive") return castDive(f, s, api)
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
  const u = s.ult
  if (u && u.thome && u.phase !== "opener") {                                // DIAMOND CATHEDRAL: a dim crystal hall (render only)
    const a = Math.max(0, Math.min(1, u.t / 8) * Math.min(1, (DH_ULT.END - u.t) / 8))
    c.globalAlpha = 0.45 * a; c.fillStyle = "#03181a"; c.fillRect(-4000, -4000, 16000, 12000); c.globalAlpha = 1
  }
  const sp = s.spike
  if (sp) sp.xs.forEach((x, k) => { const age = sp.t - DH_SPIKE.AT[k]                  // SPIKE ERUPTION: the extracted growth, small → tall
    if (age >= 0 && age < 26) fxFrame(c, "spike2", Math.min(3, age >> 1), x, sp.ground, FX_SCALE, sp.face) })
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
  if (opp && opp._lastDrawX != null && opp._lastDrawW != null) {              // SHARD pips embedded over the opponent
    const ox = opp._lastDrawX + opp._lastDrawW / 2, top = opp._lastDrawY - 12, e = s.shards
    for (let k = 0; k < e.pips; k++) { const x = ox + (k - (e.pips - 1) / 2) * 12
      c.fillStyle = OUT; c.fillRect(x - 3, top - 6, 7, 10); c.fillStyle = k % 2 ? PALE : MINT; c.fillRect(x - 2, top - 5, 5, 8); c.fillStyle = WHITE; c.fillRect(x - 1, top - 5, 1, 3) }
  }
  const b = s.burst
  if (b && b.t >= DH_BURST.STARTUP - 2 && b.t <= DH_BURST.STARTUP + 10) {   // SHATTER BURST: an expanding pixel shard ring
    const q = Math.max(0, Math.min(1, (b.t - DH_BURST.STARTUP + 2) / 10)), r = DH_BURST.RADIUS * q
    drawPixelRing(c, fx, fy, r, r * 0.8, b.pips ? PALE : MINT, 4, 24, b.cast)
    drawPixelRing(c, fx, fy, r * 0.7, r * 0.56, TEAL, 3, 16, b.cast + 1)
  }
  const L = s.lance, lext = L ? lanceExt(L.t) : 0
  if (L && lext > 0) {                                                       // CRYSTAL LANCE: the crystal past the sheet's lance art (360 px)
    const e = armEdge(f, L.face), ay = f.y + (f.h || 110) * DH_LANCE.ARM_Y + 10, art = Math.min(lext, 16)   // starts at the hand in every lance pose (extend / hold / retract), so no gap at any sprite scale
    if (lext > art) { const x0 = e + L.face * art, x1 = e + L.face * lext
      c.fillStyle = OUT; c.fillRect(Math.round(Math.min(x0, x1)), Math.round(ay - 7), Math.round(Math.abs(x1 - x0)), 14)
      c.fillStyle = MINT; c.fillRect(Math.round(Math.min(x0, x1)), Math.round(ay - 5), Math.round(Math.abs(x1 - x0)), 10)
      c.fillStyle = PALE; c.fillRect(Math.round(Math.min(x0, x1)), Math.round(ay - 5), Math.round(Math.abs(x1 - x0)), 3)
      for (let k = 0; k < 4; k++) { c.fillStyle = OUT; px(c, x1 + L.face * (k * 3), ay, 12 - k * 3) } c.fillStyle = PALE; px(c, x1, ay, 4) }
  }
  if (s.harden.t > 0 || s.harden.rec > 0) {                                  // HARDEN: a crystal sheen over the crouch
    const on = s.harden.t > 0
    drawPixelRing(c, fx, f.y + (f.h || 110) * 0.7, (f.w || 60) * 0.7, (f.h || 110) * 0.35, on ? PALE : TEAL, on ? 4 : 2, 14, frame / 20)
    if (on) { c.fillStyle = WHITE; for (let k = 0; k < 4; k++) px(c, fx - 20 + rHash(k, frame >> 2, 3) * 40, f.y + (f.h || 110) * (0.45 + rHash(k, frame >> 2, 4) * 0.5), 3) }
  }
  const dv = s.dive
  if (dv && dv.t >= DH_DIVE.STARTUP) {                                        // DIAMOND DIVE: the crystal blade + trail
    const bx = cx(f) + dv.face * 22, by = f.y + (f.h || 110) * 0.75
    for (let k = 0; k < 6; k++) { c.fillStyle = OUT; px(c, bx + dv.face * k * 4, by + k * 4, 8); c.fillStyle = k % 2 ? MINT : PALE; px(c, bx + dv.face * k * 4, by + k * 4, 5) }
    c.fillStyle = "rgba(153,221,200,0.5)"; for (let k = 1; k < 5; k++) px(c, cx(f) - dv.face * k * 10, f.y + (f.h || 110) * 0.5 - k * 10, 4)
  }
  const land = s.t - s.landT
  if (land >= 0 && land < 12) {                                              // landing shard pop (cosmetic, bounded 12f)
    for (let k = 0; k < 8; k++) { const a = Math.PI + k / 7 * Math.PI, r = 8 + land * 4
      c.fillStyle = k % 2 ? MINT : PALE; px(c, fx + Math.cos(a) * r, f.y + (f.h || 110) + Math.sin(a) * r * 0.6, 4) }
  }
  const u = s.ult
  if (u && u.thome && opp && u.phase !== "opener") {                          // CATHEDRAL: prison facets, spire storm, shatter ring
    const ox = u.thome.x + (opp.w || 60) / 2, gy = u.thome.y + (opp.h || 110), oh = opp.h || 110, grow = Math.min(1, u.t / DH_ULT.PRISON)
    if (u.phase !== "shatter") for (let k = 0; k < 7; k++) {                   // the prison: faceted panes closing around them (fighter stays visible)
      const sd = k % 2 ? 1 : -1, off = (opp.w || 60) / 2 + 10 + (k >> 1) * 10, h = (oh + 30) * grow * (0.7 + rHash(u.cast, k, 1) * 0.3)
      drawPane(c, ox + sd * off, gy, 12, h, u.cast + k, 0.75) }
    if (u.t < 24) fxFrame(c, "spike3", Math.min(2, u.t >> 3), ox, gy, FX_SCALE)
    u.spots.forEach((p, k) => { const dd = u.t - DH_ULT.STORM_AT[k]; if (dd >= 0 && dd < 12)
      fxFrame(c, "spike3", Math.min(2, dd >> 2), ox + p.dx, gy, FX_SCALE + (dd > 4 ? 1 : 0), p.flip) })
    if (u.phase === "shatter") { const q = Math.min(1, (u.t - DH_ULT.SHATTER_AT + 1) / 14)
      for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, r = 20 + q * 150
        c.fillStyle = OUT; px(c, ox + Math.cos(a) * r, gy - oh / 2 + Math.sin(a) * r * 0.8, 9); c.fillStyle = k % 3 ? MINT : PALE; px(c, ox + Math.cos(a) * r, gy - oh / 2 + Math.sin(a) * r * 0.8, 5) } }
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
  ctx.fillStyle = s.shards.pips ? PALE : "#e5e7eb"
  ctx.fillText(`SHARDS ${"◆".repeat(s.shards.pips)}${"◇".repeat(DH_SHARD.MAX - s.shards.pips)}  ${s.harden.cd > 0 ? `HARDEN ${Math.ceil(s.harden.cd / 60)}s` : "HARDEN"}`, tx, y + 7)
  ctx.restore()
}
