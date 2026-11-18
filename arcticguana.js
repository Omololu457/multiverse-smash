// arcticguana.js — ARCTICGUANA (Cryoreptile), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (frost mist, shards,
// ice overlays, the popsicle block, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet: docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md.
import { ARCTICGUANA_ANIM, ARCTICGUANA_GEOM, ARCTICGUANA_FX, ARCTICGUANA_ICE_FX, ARCTICGUANA_ACTIVE_FRAMES } from "./arcticguanaAssets.js"
export { ARCTICGUANA_ANIM, ARCTICGUANA_GEOM, ARCTICGUANA_FX, ARCTICGUANA_ICE_FX, ARCTICGUANA_ACTIVE_FRAMES }

export const AG_KEY = "arcticguana"
const ANIM = { ...ARCTICGUANA_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const ARCTICGUANA = {
  id: AG_KEY, poolKey: AG_KEY, displayName: "Arcticguana", slot: 17,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Feedback (16)
  status: "ready", sheetPath: "./ben10_arcticguana_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/arcticguana/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.10, weight: 1.05 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Ice Breath", special2: "Ice Shard", special3: "Frost Cloud", special4: "Ice Slide",
    special5: "Freeze Beam", special6: "Icicle Drop", defense: "Frost Coat", ultimate: "Absolute Popsicle" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 100 }),                                            // Row 2 run frames + frost claw (render lunge)
    heavy:  normal(54, 14, 4, 22, -6, { knockbackX: 6, rangeX: 180, agShatter: true }),        // tail sweep (bend strip A), 180 px, shatters
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 150 }),                        // low tail sweep (bend strip B), hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),   // head-up ice uppercut, launches
    air:    normal(28, 7, 4, 12, 2, { rangeX: 85 })                                            // Row 3 flip frame
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, blockLight, damageTaken, incomingScale, onContact, evade, bodyOffset,
  drawHud: drawArcticguanaHud, drawFx: drawArcticguanaFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshArcticguanaState() {
  return { kind: AG_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 }, baseDef: null,
    coat: { state: "off", t: 0, cd: 0, burst: false, shatterT: -999, coats: 0, shatters: 0, ends: [] },
    chill: { pips: 0, lastT: -999, pipped: [], immuneT: 0, frozen: null, pops: 0, shatters: 0, ends: [], endT: -999, shatterT: -999 },
    breath: null, shard: null, cloudCast: null, cloud: null, slowT: 0, slide: null, beam: null, icicle: null, icicleUsed: false, ult: null,
    lastBreath: null, lastSlide: null, lastBeam: null, lastIcicle: null, lastUlt: null, landT: -999, cloudPopT: -999, cloudPopX: 0, cloudPopY: 0,
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0, bursts: 0, burstHits: 0, fireHits: 0, breaths: 0, breathTicks: 0, breathExt: 0, shards: 0, shardHits: 0, clouds: 0,
      cloudHits: 0, slows: 0, slides: 0, slideHits: 0, beams: 0, beamTicks: 0, icicles: 0, ults: 0 } }
}
export const agState = f => (f?.omnitrix?.formState?.kind === AG_KEY && f.transformed && f.activeAlien === AG_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshArcticguanaState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed; s.baseDef = f.defenseMultiplier
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function agHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = agState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  if (ctx && Number.isFinite(ctx.frame)) s.frame = ctx.frame                // the shared ice-immunity clock (absolute sim frame)
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference (damage tag lookups / render)
  api0 = api
  tickInputs(f, s, input)
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  if (grounded(f)) s.icicleUsed = false                                    // Icicle Drop: once per airtime
  tickBreath(f, s, api, input)
  tickShard(f, s, api)
  tickCloud(f, s, api, opp)
  tickSlide(f, s, api)
  tickBeam(f, s, api, input)
  tickIcicle(f, s, api)
  tickUlt(f, s, opp, api)
  tickCoat(f, s, api)
  tickChill(f, s, api && api.getOpponent ? api.getOpponent(f) : null, api)
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const castBusy = s => !!(s.breath || s.shard || s.cloudCast || s.slide || s.beam || s.icicle || s.ult)
const busy = s => s.coat.state === "forming" || castBusy(s)
let projRef = null, api0 = null   // the engine's live projectile list + the api of the last tick (hooks called outside the tick)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) {
  const s = agState(f); if (!s) return md
  if (busy(s)) return false
  return md
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) ICE BREATH   ↓↙← + P (214) ICE SHARD   →↓↘ + P (623) FROST CLOUD   ←↙↓ + P (412) FREEZE BEAM
//   →→ + P (a frame-counted double tap) ICE SLIDE        air: ↓ + P (any air Special) ICICLE DROP (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Ice Breath, ← Ice Shard,
// ↑ Frost Cloud, ↓ Freeze Beam, → after a double tap Ice Slide.
export const AG_DASH_WINDOW = 14, AG_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= AG_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "cloud"], ["412", "beam"], ["214", "shard"], ["236", "breath"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= AG_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "icicle"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "shard"
  if (dir === "U") return "cloud"
  if (dir === "D") return "beam"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= AG_DASH_WINDOW) return "slide"
  return "breath"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const AG_COST = { breath: 10, breathHold: 4, shard: 10, cloud: 12, slide: 12, beam: 18, icicle: 12, coat: 10, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = agState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function fireUltimate(f, ctx, api) { return fireUltimateImpl(f, ctx, api) }

const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction.
// Lifetime >= 2 (combat.updateProjectiles culls lifetime <= 0 before hits resolve: a 1f box never connects in the live game).
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, lifetime: 2, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const BEAM_RE = /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i
const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || BEAM_RE.test(String(p.name || p.move || "")))
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}

// ── 3. FROST COAT (stance toggle, GAME_STATE) ──────────────────────────────────────────────────────────────────
// Block + Light tap (the shared ready-form blockLight hook — Ghostfreak's Phase / Brainstorm's dome input) toggles COATED
// for up to 240f: 14f to form (committed), 10 Power, then a 300f cooldown after it ends (timeout, a second tap, or a shatter).
// Refused in hitstun, during his own active frames, in a cast and in the ultimate; resets on swap / revert / KO / rematch
// (a fresh formState; the mods are re-applied by applyAlien).
//   COATED  defense ×1.20 (melee: defenseMultiplier, like Brainstorm's dome; every other source: incomingScale),
//           speed ×0.88, an ice sheen (render-only), FIRE-tagged damage taken ×1.25 (tag test, no other fighter edited).
//   SHATTER COAT  the FIRST hit that lands on him while coated (melee or projectile — never block chip, a guarded hit,
//           a beam or a throw / grab) takes 60%, ends the coat, and on his next tick a radial 120 px shard burst deals
//           15 to the attacker (one hit) and adds 1 Chill on a clean hit. The coat is gone, so it can never shatter twice.
export const AG_COAT = { FORM: 14, MAX: 240, CD: 300, DEF: 1.20, SPEED: 0.88, FIRE: 1.25, SHATTER_TAKE: 0.6, BURST_R: 120, BURST: 15 }
export const coated = s => !!s && s.coat.state === "on"
export function canToggleCoat(f, s) {
  if (!s || (f.hitstun || 0) > 0 || inOwnActiveFrames(f) || s.ult || castBusy(s)) return false
  return s.coat.state === "on" || (s.coat.state === "off" && s.coat.cd <= 0)
}
function blockLight(f) {
  const s = agState(f); if (!s) return false
  toggleCoat(f, s, api0)
  return true                                                             // the Light press is consumed (never also jabs)
}
export function toggleCoat(f, s, api) {
  if (!canToggleCoat(f, s)) return false
  if (s.coat.state === "on") { endCoat(f, s, "toggle"); return true }
  if (api ? !api.spendEnergy(f, AG_COST.coat) : (f.energy || 0) < AG_COST.coat) return false
  if (!api) f.energy -= AG_COST.coat
  s.coat.state = "forming"; s.coat.t = AG_COAT.FORM; s.coat.coats++
  f.attacking = false; f.currentAttack = null; f.vx = 0
  f._benPowerCommit = Math.max(f._benPowerCommit || 0, AG_COAT.FORM)
  f._spriteCastMove = "agCoat"; f._spriteCastTimer = AG_COAT.FORM
  return true
}
export function endCoat(f, s, why) {
  if (s.coat.state === "off") return
  s.coat.state = "off"; s.coat.t = 0; s.coat.cd = AG_COAT.CD; s.coat.ends.push(why); if (s.coat.ends.length > 4) s.coat.ends.shift()
}
function tickCoat(f, s, api) {
  const c = s.coat
  if (c.state === "forming") { f.vx = 0; if (--c.t <= 0) { c.state = "on"; c.t = AG_COAT.MAX } }
  else if (c.state === "on") { if (--c.t <= 0) endCoat(f, s, "timeout") }
  else if (c.cd > 0) c.cd--
  const on = c.state === "on"
  if (s.baseDef != null) f.defenseMultiplier = s.baseDef * (on ? AG_COAT.DEF : 1)
  if (s.baseSpeed != null) f._benWalkSpeed = s.baseSpeed * (on ? AG_COAT.SPEED : 1)
  if (s.baseDash != null) f.dashSpeed = s.baseDash * (on ? AG_COAT.SPEED : 1)
  if (c.burst) {                                                          // SHATTER COAT: the shard burst, once
    c.burst = false; s.stats.bursts++; s.castId++
    hitbox(f, api, "ag_coat_burst", f.facing || 1, { damage: AG_COAT.BURST, spawnX: cx(f), spawnY: f.y + (f.h || 110) / 2, radius: AG_COAT.BURST_R, radial: true,
      rectHitbox: false, w: AG_COAT.BURST_R * 2, h: AG_COAT.BURST_R * 2, hitstun: 16, blockstun: 10, knockbackX: 5, knockbackY: -3,
      alien: { ag: "coatBurst", chill: 1, shatter: true, cast: s.castId } })
  }
}
// incomingScale hook (non-melee sources, after the form's defense): the coat's ×1.20 defense
function incomingScale(f) { return coated(agState(f)) ? 1 / AG_COAT.DEF : 1 }
// FIRE tag test on the incoming hit (read only): the projectile / attack's own fire / element / damageType / name
const FIRE_RE = /fire|flame|burn|blaze|inferno|lava|magma|heat|scorch|ember|katon|phoenix|napalm|pyro/i
const tagged = (o, re) => !!o && (o.fire === true || re.test(String(o.element || "")) || re.test(String(o.damageType || "")) || re.test(String(o.name || "")))
function sourceProj(opts) {
  if (opts.source !== "projectile" || !projRef) return null
  return projRef.find(p => p && p.owner === opts.attacker && p.name === opts.move) || null
}
export function isFireHit(opts) {
  if (!opts) return false
  if (opts.fire === true || FIRE_RE.test(String(opts.move || ""))) return true
  const p = sourceProj(opts); if (p && tagged(p, FIRE_RE)) return true
  const a = opts.attacker
  if (opts.source !== "projectile" && a && a.currentAttack) return tagged(a.currentAttack, FIRE_RE) || tagged(a.basic_attacks?.[a.currentAttack.name], FIRE_RE)
  return false
}
function isThrowHit(opts) {
  if (opts.source === "grab-throw" || opts.source === "grab" || opts.source === "throw") return true
  const a = opts.attacker && opts.attacker.currentAttack
  return !!a && (["grab", "throw"].includes(a.category) || /grab|throw/i.test(String(a.name || "")))
}
function isBeamHit(opts) {
  if (BEAM_RE.test(String(opts.move || ""))) return true
  const p = sourceProj(opts); if (p && isBeam(p)) return true
  const a = opts.source !== "projectile" && opts.attacker && opts.attacker.currentAttack
  return !!a && (a.beam || a.isBeam || BEAM_RE.test(String(a.name || "")))
}
// damageTaken hook (combat.applyScaledDamage, after the form defense): fire ×1.25 and SHATTER COAT while coated
function damageTaken(f, raw, opts) {
  const s = agState(f); if (!s || !coated(s) || !(raw > 0)) return raw
  if (isFireHit(opts)) { raw *= AG_COAT.FIRE; s.stats.fireHits++ }
  if ((opts.source === "melee" || opts.source === "projectile") && !f.isBlocking && !isThrowHit(opts) && !isBeamHit(opts)) {
    raw *= AG_COAT.SHATTER_TAKE
    endCoat(f, s, "shatter"); s.coat.shatters++; s.coat.burst = true; s.coat.shatterT = s.t
  }
  return raw
}
const CONTACT = []   // onContact handlers (filled by the sections below)
function onContact(f, target, info) {
  const s = agState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
CONTACT.push((f, s, target, { proj, blocked }) => { if (proj && proj.alien && proj.alien.ag === "coatBurst" && !blocked) s.stats.burstHits++ })

// ── 4. CHILL → POPSICLE → SHATTER (opponent status, GAME_STATE; Frozone's ice-system contract) ────────────────────
// CHILL: clean hits from Ice Breath, Ice Shard, Freeze Beam (first tick only), Ice Slide's finisher, Icicle Drop and the
// Shatter Coat burst add 1 pip — ONE per cast however many ticks hit (a cast id on the tag). Max 3. Never from blocks,
// FX, Frost Cloud or his cosmetic trails (only tags carrying `chill` count). Pips expire 240f after the last one.
// POPSICLE: the 3rd pip consumes them and encases the opponent for 30 ticks: held in place (x / y pinned, hitstun topped
// up 2 ticks at a time — never beyond what the hold needs, so the moment the hold stops they are free), they cannot act or
// move, they CAN be hit. Their input polling and the simulation clock are untouched. Escape rules respected: an engine
// escape that clears their hitstun ends it; the MASH-OUT (each fresh button press read through the read-only
// api.readControls) shortens it by 1 tick, at most 6. Ends on expiry / escape / grab / KO / any damage; then 420f refreeze
// immunity (no pips, no refreeze); never refreshed while frozen.
// SHATTER: a clean Heavy, the Shatter Coat burst or an Ice Slide hit on a frozen opponent ends the Popsicle ONCE and adds a
// fixed +25 (× the normal combo scale, one application: a simultaneous second contact finds no Popsicle and adds nothing).
// ONE EXPLICIT RULE: ANY other damage ends the Popsicle at once with no bonus (the hit's own hitstun applies).
// THE FREEZING CAST BREAKS OFF: the cast whose hit makes the Popsicle stops there (its later ticks would be "other damage"
// and melt the Popsicle it just made) — its live hitboxes are dropped and he recovers in SNAP frames, so a Heavy / Slide can
// still reach the Shatter inside the 30 ticks (Freeze Beam into Popsicle, Heavy Shatter).
export const AG_CHILL = { MAX: 3, EXPIRE: 240, FREEZE: 30, MASH: 6, IMMUNE: 420, SHATTER: 25, HOLD: 2, SNAP: 8 }
const MASH_KEYS = ["light", "heavy", "special", "jump", "grab", "block", "ultimate", "charge"]
export const frozen = s => !!(s && s.chill.frozen)
// SHARED ICE IMMUNITY (one timer per OPPONENT across every ice alien — Arcticguana, Big Chill): an absolute simulation frame
// stored on the target (plain data, GAME_STATE), so a swap between ice aliens can never double-dip a freeze. Set for the
// whole freeze + 420f when it starts (survives a mid-freeze swap), then 420f from the thaw. Optional: a state with no
// `frame` (no ctx.frame) never reads or writes it, exactly as before.
export const iceImmune = (s, opp) => !!opp && Number.isFinite(s.frame) && Number.isFinite(opp._benIceImmuneUntil) && s.frame < opp._benIceImmuneUntil
export const startIceImmunity = (s, opp, extra = 0) => { if (opp && Number.isFinite(s.frame)) opp._benIceImmuneUntil = s.frame + AG_CHILL.IMMUNE + extra }
export function addChill(f, s, opp, cast) {
  const c = s.chill
  if (!opp || opp.eliminated || c.frozen || c.immuneT > 0 || iceImmune(s, opp)) return false
  if (c.pipped.includes(cast)) return false                               // one pip per cast
  c.pipped.push(cast); if (c.pipped.length > 8) c.pipped.shift()
  c.pips = Math.min(AG_CHILL.MAX, c.pips + 1); c.lastT = s.t
  if (c.pips >= AG_CHILL.MAX) { startPopsicle(f, s, opp); snapCast(f, s, opp, cast) }
  return true
}
function snapCast(f, s, opp, cast) {
  if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.cast === cast) { p.lifetime = 0; p._pierceHits = [...(p._pierceHits || []), opp && opp.side] }
  let snapped = false
  if (s.breath && s.breath.cast === cast) { const b = s.breath; s.lastBreath = { ticks: b.ticks, ext: b.ext, streamEnd: b.t, snapped: true }; s.breath = null; snapped = true }
  if (s.beam && s.beam.cast === cast) { const b = s.beam; s.lastBeam = { hold: b.h, ticks: b.ticks, snapped: true }; s.beam = null; snapped = true }
  if (s.slide && s.slide.cast === cast) { const d = s.slide; d.hit = true; d.end = Math.min(d.end, d.t + AG_CHILL.SNAP); delete f._benLunge; snapped = true }
  if (snapped) { f.attackCooldown = AG_CHILL.SNAP; f._benPowerCommit = AG_CHILL.SNAP; if (!s.slide) { f._spriteCastMove = "agBeamFire"; f._spriteCastTimer = AG_CHILL.SNAP } }
}
function startPopsicle(f, s, opp) {
  const c = s.chill
  c.pips = 0; c.pops++
  c.frozen = { t: 0, until: AG_CHILL.FREEZE, x: opp.x, y: opp.y, hp: null, mash: 0, prev: 0 }
  startIceImmunity(s, opp, AG_CHILL.FREEZE)
  opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
}
export function endPopsicle(f, s, opp, why) {
  const c = s.chill, z = c.frozen; if (!z) return null
  c.frozen = null; c.immuneT = AG_CHILL.IMMUNE; c.pips = 0; c.endT = s.t
  startIceImmunity(s, opp)
  c.ends.push(why); if (c.ends.length > 6) c.ends.shift()
  if (opp && (why === "expire" || why === "mash")) opp.hitstun = 0           // released at once (never left stuck)
  return z
}
export function shatterPopsicle(f, s, opp, api) {
  if (!frozen(s) || !opp) return false
  endPopsicle(f, s, opp, "shatter"); s.chill.shatters++; s.chill.shatterT = s.t
  const scale = api && api.getComboScale ? api.getComboScale(f) : 1
  if (api) api.applyScaledDamage(opp, AG_CHILL.SHATTER * scale, { attacker: f, source: "ability", move: "ag_shatter" })
  return true
}
export function tickChill(f, s, opp, api) {
  const c = s.chill
  if (c.immuneT > 0) c.immuneT--
  if (c.pips > 0 && s.t - c.lastT >= AG_CHILL.EXPIRE) c.pips = 0
  const z = c.frozen; if (!z) return
  if (!opp || opp.eliminated || !(opp.health > 0)) { endPopsicle(f, s, opp, "ko"); return }
  z.t++
  if (z.hp == null) z.hp = opp.health                                       // the freezing hit's own damage has landed
  else if (opp.health < z.hp) { endPopsicle(f, s, opp, "damage"); return } // ONE RULE: any other damage ends it
  if (z.t > 1 && !((opp.hitstun || 0) > 0)) { endPopsicle(f, s, opp, "escape"); return }   // an engine escape cleared the hitstun
  if (opp.isGrabbed) { endPopsicle(f, s, opp, "grab"); return }
  const ctl = api && api.readControls ? api.readControls(opp) : null       // MASH-OUT (read only)
  if (ctl) { let m = 0; MASH_KEYS.forEach((k, i) => { if (ctl[k]) m |= 1 << i })
    if ((m & ~z.prev) && z.mash < AG_CHILL.MASH) { z.mash++; z.until-- }
    z.prev = m }
  if (z.t >= z.until) { endPopsicle(f, s, opp, z.mash ? "mash" : "expire"); return }
  opp.hitstun = Math.max(opp.hitstun || 0, AG_CHILL.HOLD); opp.vx = 0; opp.vy = 0; opp.x = z.x; opp.y = z.y
  opp.isBlocking = false; opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
  z.hp = opp.health
}
CONTACT.push((f, s, target, { proj, move, blocked }) => {                   // shatter first, then chill (a shatter starts immunity)
  if (blocked) return
  const tag = proj && proj.alien
  const shatters = (tag && tag.shatter) || (!proj && move && (move.agShatter || BA_SHATTER.includes(move.name)))
  if (frozen(s)) { if (shatters) shatterPopsicle(f, s, target, api0); else endPopsicle(f, s, target, "damage") }
  if (tag && tag.chill) addChill(f, s, target, tag.cast)
})
const BA_SHATTER = ["heavy"]

// ── HUD (render-only) ──────────────────────────────────────────────────────────────────────────────────────────
const ICE = "#bfefff", ICE2 = "#7dd3fc", DEEP = "#0369a1", INK = "#06121c", SNOW = "#f0fbff"
export function drawArcticguanaHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = agState(f); if (!ctx || !s) return
  const c = s.coat, w = Math.min(120, pbw || 120), h = 5
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  const fill = c.state === "on" ? c.t / AG_COAT.MAX : c.state === "forming" ? 1 - c.t / AG_COAT.FORM : c.cd > 0 ? 1 - c.cd / AG_COAT.CD : 1
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = c.state === "on" ? ICE : c.state === "forming" ? ICE2 : c.cd > 0 ? "#475569" : DEEP
  const fw = Math.round(w * Math.max(0, Math.min(1, fill))); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = ICE
  const label = c.state === "on" ? `COATED ${Math.ceil(c.t / 60)}s` : c.state === "forming" ? "COAT FORMING" : c.cd > 0 ? `COAT ${Math.ceil(c.cd / 60)}s` : "COAT READY"
  ctx.fillText(`FROST · ${label}`, flip ? bx + w : bx, y + h + 2)
  ctx.restore()
}

// ── RENDER-ONLY world overlays (read GAME_STATE, never write it) ───────────────────────────────────────────────
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const _imgs = {}
function img(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  const im = _imgs[src]; return im.complete && im.naturalWidth ? im : null
}
// one frame of a cut FX strip / an ice-folder sprite, integer-scaled, nearest-neighbour (render only)
function fx(c, name, frameI, x, y, k = 3, flip = 1) {
  const d = ARCTICGUANA_FX[name]; const im = d && img(d.sheet); if (!im) return
  const fi = ((frameI % d.frames) + d.frames) % d.frames
  c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(y)); c.scale(flip, 1)
  c.drawImage(im, fi * d.w, 0, d.w, d.h, Math.round(-d.w * k / 2), Math.round(-d.h * k / 2), d.w * k, d.h * k); c.restore()
}
function iceFx(c, name, x, y, k = 3, alpha = 1) {
  const im = img(ARCTICGUANA_ICE_FX[name]); if (!im) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  c.drawImage(im, Math.round(x - im.naturalWidth * k / 2), Math.round(y - im.naturalHeight * k / 2), im.naturalWidth * k, im.naturalHeight * k); c.restore()
}
export function drawArcticguanaFx(c, f, frame = 0, opp = null) {
  const s = agState(f); if (!s) return
  const h = f.h || 110, w = f.w || 60, bx = cx(f)
  const co = s.coat
  if (co.state === "on" || co.state === "forming") {                        // FROST COAT: ice sheen over his body box
    const k = co.state === "forming" ? 1 - co.t / AG_COAT.FORM : 1
    c.save(); c.globalAlpha = 0.28 * k; c.fillStyle = ICE; c.fillRect(Math.round(f.x - 4), Math.round(f.y + 6), w + 8, h - 6)
    c.globalAlpha = 0.85 * k; c.fillStyle = SNOW
    for (let i = 0; i < 5; i++) { const sx = f.x + ((i * 23 + (frame >> 2) * 7) % (w + 8)) - 4, sy = f.y + 10 + ((i * 37) % (h - 16)); px(c, sx, sy, 3) }
    c.fillStyle = ICE2; for (let y = f.y + 10; y < f.y + h; y += 9) px(c, f.x - 4, y, 2), px(c, f.x + w + 4, y, 2)
    c.restore()
  }
  drawMoves(c, f, s, frame, opp)
  if (opp) drawChill(c, s, opp, frame)
  if (s.t - co.shatterT < 14) {                                             // SHATTER COAT burst (the ice-folder burst + shards)
    const k = (s.t - co.shatterT) / 14
    iceFx(c, "burst", bx, f.y + h * 0.45, 3, 1 - k)
    c.fillStyle = ICE; for (let a = 0; a < 10; a++) px(c, bx + Math.cos(a * 0.628) * AG_COAT.BURST_R * k, f.y + h / 2 + Math.sin(a * 0.628) * AG_COAT.BURST_R * k * 0.7, 4)
  }
}

// CHILL pips over the opponent + the POPSICLE block (translucent: their silhouette stays visible) and its stick
function drawChill(c, s, opp, frame) {
  const ch = s.chill, ox = cx(opp), top = opp.y - 14
  if (ch.pips > 0) for (let i = 0; i < AG_CHILL.MAX; i++) {
    const x = ox + (i - 1) * 12
    c.fillStyle = INK; px(c, x, top, 8); c.fillStyle = i < ch.pips ? ICE : "#334155"; px(c, x, top, 5); if (i < ch.pips) { c.fillStyle = SNOW; px(c, x - 1, top - 1, 2) }
  }
  const z = ch.frozen
  if (z) {
    const w = (opp.w || 60) + 16, h = (opp.h || 110) + 10, x0 = Math.round(ox - w / 2), y0 = Math.round(opp.y - 6)
    c.save()
    c.globalAlpha = 0.38; c.fillStyle = ICE; c.fillRect(x0, y0, w, h)
    c.globalAlpha = 0.9; c.fillStyle = ICE2; c.fillRect(x0, y0, w, 3); c.fillRect(x0, y0 + h - 3, w, 3); c.fillRect(x0, y0, 3, h); c.fillRect(x0 + w - 3, y0, 3, h)
    c.fillStyle = SNOW; for (let k = 0; k < 4; k++) px(c, x0 + 8 + k * 6, y0 + 8 + k * 6, 3)   // a highlight streak
    c.fillStyle = "#c08a4a"; c.fillRect(Math.round(ox - 4), y0 - 18, 8, 18); c.fillStyle = "#8a5a2a"; c.fillRect(Math.round(ox + 2), y0 - 18, 2, 18)   // the stick
    const left = Math.max(0, z.until - z.t)
    if (left < 8) { c.fillStyle = INK; for (let k = 0; k < 6; k++) px(c, x0 + w * (0.2 + 0.1 * k), y0 + h * (0.3 + 0.08 * ((k * 3) % 5)), 2) }   // cracking
    c.restore()
  }
  if (s.t - ch.shatterT < 16) {                                              // SHATTER: the ice-folder burst + flying shards
    const k = (s.t - ch.shatterT) / 16
    iceFx(c, "burst2", ox, opp.y + (opp.h || 110) * 0.4, 3, 1 - k); iceFx(c, "spray", ox + 20, opp.y + (opp.h || 110) * 0.6, 3, 1 - k)
    c.fillStyle = ICE; for (let a = 0; a < 12; a++) px(c, ox + Math.cos(a * 0.5236) * 90 * k, opp.y + (opp.h || 110) / 2 + Math.sin(a * 0.5236) * 70 * k, 5 - Math.floor(k * 3))
  }
}

// ── 5. MOVES ────────────────────────────────────────────────────────────────────────────────────────────────
function canAct(f, s) {
  return f.transformed && f.activeAlien === AG_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
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
const mouthX = (f, face) => cx(f) + face * (f.w || 60) * 0.55
const mouthY = f => f.y + (f.h || 110) * 0.32
const ownLive = (f, api, ag) => !!api && api.activeProjectiles().some(p => p && p.owner === f && p.alien && p.alien.ag === ag && p.lifetime > 0)
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
const stopCast = (f, key, s) => { s[key] = null; delete f._benLunge; delete f._benGlide }

// 1. ICE BREATH (↓↘→ + P, 10) — Row 4 f1–4: 14f startup, a freezing stream 300 px ahead, 5 ticks × 8 = 40 (one every 5f),
//    −12 on block, one on screen (he is committed to it), +1 Chill per cast. HOLD P past the base stream to extend it by up
//    to 20f (+4 Power, charged once when the extension starts; ticks keep coming every 5f; releasing ends it). 18f recovery.
export const AG_BREATH = { STARTUP: 14, EVERY: 5, TICKS: 5, DMG: 8, REACH: 300, H: 44, ON_BLOCK: -12, RECOVERY: 18, EXT: 20 }
AG_BREATH.BASE_END = AG_BREATH.STARTUP + AG_BREATH.EVERY * AG_BREATH.TICKS
function castBreath(f, s, api) {
  if (!grounded(f)) return false
  const total = AG_BREATH.BASE_END + AG_BREATH.RECOVERY
  const c = beginCast(f, s, api, "agBreath", AG_COST.breath, total); if (!c) return false
  s.breath = { t: 0, cast: c.cast, face: f.facing || 1, streamEnd: AG_BREATH.BASE_END, ext: false, ticks: 0, end: total }; s.stats.breaths++
  return true
}
CASTS.breath = castBreath
function tickBreath(f, s, api, input) {
  const b = s.breath; if (!b) return
  b.t++
  if ((f.hitstun || 0) > 0) { stopCast(f, "breath", s); return }
  if (b.t === AG_BREATH.BASE_END && input.special && api && api.spendEnergy(f, AG_COST.breathHold)) {   // HOLD: extend once
    b.ext = true; b.streamEnd = AG_BREATH.BASE_END + AG_BREATH.EXT; s.stats.breathExt++
  }
  if (b.ext && b.t > AG_BREATH.BASE_END && b.t < b.streamEnd && !input.special) b.streamEnd = b.t   // released: the stream stops
  b.end = b.streamEnd + AG_BREATH.RECOVERY
  f.attackCooldown = Math.max(f.attackCooldown || 0, b.end - b.t); f._benPowerCommit = Math.max(f._benPowerCommit || 0, b.end - b.t)
  if (b.t >= AG_BREATH.STARTUP && b.t < b.streamEnd && (b.t - AG_BREATH.STARTUP) % AG_BREATH.EVERY === 0) {
    b.ticks++; s.stats.breathTicks++
    const rem = b.end - b.t
    hitbox(f, api, "ag_ice_breath", b.face, { damage: AG_BREATH.DMG, spawnX: mouthX(f, b.face) + b.face * AG_BREATH.REACH / 2, spawnY: mouthY(f),
      w: AG_BREATH.REACH, h: AG_BREATH.H, hitstun: AG_BREATH.EVERY + 8, blockstun: blockstunFor(rem, AG_BREATH.ON_BLOCK), noHitstop: true,
      knockbackX: 0.6, knockbackY: 0, alien: { ag: "breath", chill: 1, cast: b.cast } })
  }
  pose(f, b.t < AG_BREATH.STARTUP ? "agBreath" : b.t < b.streamEnd ? "agBreathHold" : "agBreath", b.end - b.t)
  if (b.t >= b.end) { s.lastBreath = { ticks: b.ticks, ext: b.ext, streamEnd: b.streamEnd }; s.breath = null }
}

// 2. ICE SHARD (↓↙← + P, 10) — Row 5 f1–7, released on the asterisk frame (f3): 2 shards (the boxed FX) in a slight fan,
//    480 px, 22 each, ONE hit max per target (the first contact removes its twin) = 22, one volley on screen, +1 Chill.
export const AG_SHARD = { RELEASE: 7, SPEED: 12, RANGE: 480, DMG: 22, FAN: 0.6, W: 34, H: 14, TOTAL: 24 }
function castShard(f, s, api) {
  if (!grounded(f) || ownLive(f, api, "shard")) return false
  const c = beginCast(f, s, api, "agShard", AG_COST.shard, AG_SHARD.TOTAL); if (!c) return false
  s.shard = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.shards++
  return true
}
CASTS.shard = castShard
function tickShard(f, s, api) {
  const d = s.shard; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { stopCast(f, "shard", s); return }
  if (d.t === AG_SHARD.RELEASE) for (const k of [-1, 1]) hitbox(f, api, "ag_ice_shard", d.face, { damage: AG_SHARD.DMG, vx: d.face * AG_SHARD.SPEED, vy: k * AG_SHARD.FAN,
    spawnX: mouthX(f, d.face) + d.face * 20, spawnY: mouthY(f) + k * 4, w: AG_SHARD.W, h: AG_SHARD.H, lifetime: Math.round(AG_SHARD.RANGE / AG_SHARD.SPEED),
    hitstun: 18, blockstun: 10, knockbackX: 3, knockbackY: -1, alien: { ag: "shard", chill: 1, cast: d.cast, fan: k } })
  pose(f, "agShard", AG_SHARD.TOTAL - d.t)
  if (d.t >= AG_SHARD.TOTAL) s.shard = null
}
function killTwin(f, tag, target) {                                       // the twin can never also hit this target —
  if (!projRef) return                                                     // even in the same resolve pass: the engine skips a
  for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.ag === "shard" && p.alien.cast === tag.cast) {   // projectile whose _pierceHits lists it
    p.lifetime = 0; p._pierceHits = [...(p._pierceHits || []), target && target.side] }
}

// 3. FROST CLOUD (→↓↘ + P, 12) — Row 6 f1–4: a cloud settles 200 px ahead for 120f (an owner-limited world object in his
//    formState — a recast replaces it; not solid: nothing collides with it). The FIRST opponent contact consumes it: 15
//    and, on a clean hit, run / walk and dash ×0.8 for 60f once (the engine's `_benSlow` status; no polling change). No pips.
export const AG_CLOUD = { CAST: 16, SETTLE: 10, AHEAD: 200, LIFE: 120, W: 120, H: 96, DMG: 15, SLOW: 0.8, SLOW_T: 60 }
function castCloud(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "agCloud", AG_COST.cloud, AG_CLOUD.CAST); if (!c) return false
  s.cloudCast = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.clouds++
  return true
}
CASTS.cloud = castCloud
const cloudBox = cl => ({ x: cl.x - AG_CLOUD.W / 2, y: cl.y - AG_CLOUD.H, w: AG_CLOUD.W, h: AG_CLOUD.H })
const overlaps = (a, o) => a.x < o.x + (o.w || 60) && a.x + a.w > o.x && a.y < o.y + (o.h || 110) && a.y + a.h > o.y
function tickCloud(f, s, api, opp) {
  const k = s.cloudCast
  if (k) { k.t++
    if ((f.hitstun || 0) > 0) s.cloudCast = null
    else { if (k.t === AG_CLOUD.SETTLE) s.cloud = { x: Math.max(s.stage.L + 60, Math.min(s.stage.R - 60, cx(f) + k.face * AG_CLOUD.AHEAD)), y: f.y + (f.h || 110), t: AG_CLOUD.LIFE, cast: k.cast }
      pose(f, "agCloud", AG_CLOUD.CAST - k.t); if (k.t >= AG_CLOUD.CAST) s.cloudCast = null } }
  const cl = s.cloud
  if (cl) {
    if (--cl.t <= 0) s.cloud = null
    else if (opp && !opp.eliminated && overlaps(cloudBox(cl), opp)) {        // first contact: one hit, the cloud is consumed
      s.cloud = null; s.cloudPopT = s.t; s.cloudPopX = cx(opp); s.cloudPopY = opp.y + (opp.h || 110) / 2
      hitbox(f, api, "ag_frost_cloud", cx(opp) >= cl.x ? 1 : -1, { damage: AG_CLOUD.DMG, spawnX: cx(opp), spawnY: opp.y + (opp.h || 110) / 2, w: (opp.w || 60) + 8, h: (opp.h || 110) + 8,
        hitstun: 12, blockstun: 8, knockbackX: 1, knockbackY: 0, alien: { ag: "cloud", cast: cl.cast } })
    }
  }
  if (s.slowT > 0) { s.slowT--; if (opp) opp._benSlow = { ttl: 2, k: AG_CLOUD.SLOW } }
}

// 4. ICE SLIDE (→→ + P, 12) — the Row 2 run frames: a low sliding dash, 360 px of REAL travel (18f × 20 px, frames 6–23,
//    stage-clamped). Frames 6–24 DUCK PROJECTILES (the shared `evade` low-profile filter; melee still hits — no
//    invulnerability). A short cosmetic ice trail (render-only, never solid). One hit: 50, −13 on block; the hit is the
//    finisher: +1 Chill, and it SHATTERS a Popsicle.
export const AG_SLIDE = { STARTUP: 5, SPEED: 20, TRAVEL: 360, LOW: [6, 24], DMG: 50, ON_BLOCK: -13, RECOVERY: 16, W: 60, H: 46 }
AG_SLIDE.FRAMES = Math.round(AG_SLIDE.TRAVEL / AG_SLIDE.SPEED)
AG_SLIDE.TOTAL = AG_SLIDE.STARTUP + AG_SLIDE.FRAMES + AG_SLIDE.RECOVERY
function castSlide(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "agSlide", AG_COST.slide, AG_SLIDE.TOTAL); if (!c) return false
  s.slide = { t: 0, cast: c.cast, face: f.facing || 1, x0: f.x, hit: false, end: AG_SLIDE.TOTAL }; s.stats.slides++
  return true
}
CASTS.slide = castSlide
export const slideLow = s => !!(s && s.slide && s.slide.t >= AG_SLIDE.LOW[0] && s.slide.t <= AG_SLIDE.LOW[1])
function evade(f, info) { const s = agState(f); return !!(info && info.proj && slideLow(s)) }   // projectiles only
function tickSlide(f, s, api) {
  const d = s.slide; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.lastSlide = { travelled: Math.abs(f.x - d.x0), hit: d.hit }; stopCast(f, "slide", s); return }
  const travel = d.t > AG_SLIDE.STARTUP && d.t <= AG_SLIDE.STARTUP + AG_SLIDE.FRAMES && !d.hit
  if (travel) {
    f._benLunge = { frames: 1, speed: d.face * AG_SLIDE.SPEED }
    if (!ownLive(f, api, "slide")) hitbox(f, api, "ag_ice_slide", d.face, { damage: AG_SLIDE.DMG, spawnX: cx(f) + d.face * ((f.w || 60) / 2 + AG_SLIDE.SPEED / 2),
      spawnY: f.y + (f.h || 110) - AG_SLIDE.H / 2, w: AG_SLIDE.W + AG_SLIDE.SPEED, h: AG_SLIDE.H, hitstun: AG_SLIDE.RECOVERY + 10,
      blockstun: blockstunFor(AG_SLIDE.RECOVERY, AG_SLIDE.ON_BLOCK), knockbackX: 6, knockbackY: -4, alien: { ag: "slide", chill: 1, shatter: true, cast: d.cast } })
  }
  pose(f, "agSlide", d.end - d.t)
  if (d.t >= d.end) { s.lastSlide = { travelled: Math.abs(f.x - d.x0), hit: d.hit, x0: d.x0, x1: f.x }; s.slide = null }
}
function slideContact(f, s, tag) {
  const d = s.slide; if (!d || d.cast !== tag.cast || d.hit) return
  d.hit = true; d.end = d.t + AG_SLIDE.RECOVERY; delete f._benLunge; s.stats.slideHits++
  if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.ag === "slide") p.lifetime = 0   // one hit per cast
  f.attackCooldown = AG_SLIDE.RECOVERY; f._benPowerCommit = AG_SLIDE.RECOVERY
}

// 5. FREEZE BEAM (←↙↓ + P, 18) — Row 7: 22f startup (f1–3 charge), then the beam HOLD (the LOOP f4–5 + the glow heads):
//    a narrow beam, bounded 420 px, 3 ticks × 12 = 36 at hold frames 1 / 14 / 27; only the FIRST tick adds a Chill pip.
//    The hold lasts 27f and keeps going while P is held, capped at 40f. −16 on block, 26f punishable recovery (f6 fire pose).
export const AG_BEAM = { STARTUP: 22, TICK_AT: [1, 14, 27], DMG: 12, HOLD_MIN: 27, HOLD_MAX: 40, REACH: 420, H: 14, ON_BLOCK: -16, RECOVERY: 26 }
function castBeam(f, s, api) {
  if (!grounded(f)) return false
  const total = AG_BEAM.STARTUP + AG_BEAM.HOLD_MIN + AG_BEAM.RECOVERY
  const c = beginCast(f, s, api, "agCharge", AG_COST.beam, total); if (!c) return false
  s.beam = { t: 0, h: 0, cast: c.cast, face: f.facing || 1, phase: "charge", ticks: 0, end: total }; s.stats.beams++
  return true
}
CASTS.beam = castBeam
function tickBeam(f, s, api, input) {
  const b = s.beam; if (!b) return
  b.t++
  if ((f.hitstun || 0) > 0) { s.lastBeam = { hold: b.h, ticks: b.ticks }; stopCast(f, "beam", s); return }
  if (b.phase === "charge" && b.t > AG_BEAM.STARTUP) b.phase = "hold"
  if (b.phase === "hold") {
    b.h++
    const k = AG_BEAM.TICK_AT.indexOf(b.h)
    if (k >= 0) { b.ticks++; s.stats.beamTicks++
      const last = k === AG_BEAM.TICK_AT.length - 1
      hitbox(f, api, "ag_freeze_beam", b.face, { damage: AG_BEAM.DMG, beam: true, isBeam: true, spawnX: mouthX(f, b.face) + b.face * AG_BEAM.REACH / 2, spawnY: mouthY(f) + 6,
        w: AG_BEAM.REACH, h: AG_BEAM.H, hitstun: last ? AG_BEAM.RECOVERY + 6 : 16, blockstun: last ? blockstunFor(AG_BEAM.RECOVERY, AG_BEAM.ON_BLOCK) : 14, noHitstop: !last,
        knockbackX: last ? 4 : 0.4, knockbackY: 0, alien: { ag: "beam", chill: k === 0 ? 1 : 0, cast: b.cast, tick: k } }) }
    if (b.h >= AG_BEAM.HOLD_MAX || (b.h >= AG_BEAM.HOLD_MIN && !input.special)) { b.phase = "rec"; b.end = b.t + AG_BEAM.RECOVERY }
    else b.end = b.t + 1 + AG_BEAM.RECOVERY
    f.attackCooldown = b.end - b.t; f._benPowerCommit = b.end - b.t
  }
  pose(f, b.phase === "charge" ? "agCharge" : b.phase === "hold" ? "agBeamLoop" : "agBeamFire", b.end - b.t)
  if (b.phase === "rec" && b.t >= b.end) { s.lastBeam = { hold: b.h, ticks: b.ticks }; s.beam = null }
}

// 6. ICICLE DROP (air ↓ + P — any air Special; 12) — the Row 3 flip frame: a downward icicle-spike dive (the shared
//    `_benGlide`), 48 on the body hit (one hit per cast), a bounded COSMETIC frost pop on landing (render-only, no hitbox).
//    Once per airtime, no jump refill, +1 Chill.
export const AG_ICICLE = { STARTUP: 4, VX: 4, VY: 14, MAX: 50, DMG: 48, W: 56, H: 70, LAND: 14 }
function castIcicle(f, s, api) {
  if (grounded(f) || s.icicleUsed) return false
  const c = beginCast(f, s, api, "agIcicle", AG_COST.icicle, AG_ICICLE.MAX + AG_ICICLE.LAND, { commit: false }); if (!c) return false
  s.icicleUsed = true
  s.icicle = { t: 0, cast: c.cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }; s.stats.icicles++
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.icicle = castIcicle
function tickIcicle(f, s, api) {
  const d = s.icicle; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endIcicle(f, s, false); return }
  if (d.t < AG_ICICLE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > AG_ICICLE.STARTUP + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= AG_ICICLE.MAX) { endIcicle(f, s, landed); return }
  f._benGlide = { vx: d.face * AG_ICICLE.VX, vy: AG_ICICLE.VY }
  if (!d.hit && !ownLive(f, api, "icicle")) hitbox(f, api, "ag_icicle_drop", d.face, { damage: AG_ICICLE.DMG, spawnX: cx(f) + d.face * 10, spawnY: f.y + (f.h || 110) * 0.8,
    w: AG_ICICLE.W, h: AG_ICICLE.H, hitstun: 24, blockstun: 12, knockbackX: 3, knockbackY: -4, alien: { ag: "icicle", chill: 1, cast: d.cast } })
  pose(f, "agIcicle", 2)
}
function endIcicle(f, s, landed) {
  const d = s.icicle; s.icicle = null; delete f._benGlide
  if (landed) { s.landT = s.t; f.attackCooldown = AG_ICICLE.LAND; f._benPowerCommit = AG_ICICLE.LAND; pose(f, "crouch", AG_ICICLE.LAND) }
  else { f.attackCooldown = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastIcicle = { landed, hit: d.hit, jumps: d.jumps }
}

// ── ULTIMATE: ABSOLUTE POPSICLE (the Omnitrix Overload input; 55 Power) ─────────────────────────────────────────
// Needs a CLEAN opener: a Freeze Beam-style beam (Row 7 charge → fire, 420 px, at 18f, 40). A whiff or a block = no
// cinematic, 60f recovery. Then (the opponent held in place, no collision change; he is invulnerable only inside it):
//   1. FROZEN SOLID 0–40f: a GIANT popsicle (procedural pixel ice block + an integer-scaled stick) around them — render-only;
//      both fighters stay readable, the stage never changes.
//   2. CARVING 40–100f: 3 tail / claw slashes × 25 = 75 at angles from hash(match seed, start frame, player index) (a pure
//      function the render calls; shard FX only — no hitboxes, no GAME_STATE presence).
//   3. FINAL SHATTER 100–140f: a Freeze Beam burst (Row 7 frames), the popsicle bursts into capped shards + an expanding
//      frost ring: 125.
// Total 240 raw (40 + 75 + 125). The passive Shatter bonus never adds on top (the cinematic deals its damage directly; a
// Popsicle already on them ends quietly at the capture). The opponent is RELEASED UNFROZEN with the 420f refreeze immunity
// started (no pips). Camera and positions restore, no persistent hazards, 100f recovery lockout.
export const AG_ULT = { OPENER_AT: 18, OPENER: 40, REACH: 420, H: 22, WHIFF: 60, CARVE_AT: [46, 68, 90], CARVE: 25, FINAL_AT: 118, FINAL: 125,
  END: 140, LOCKOUT: 100, ZOOM: 0.85, SHARDS: 14 }
function fireUltimateImpl(f, ctx, api) {
  const s = agState(f); if (!s || !canAct(f, s)) return false
  if (!api.spendEnergy(f, AG_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = AG_ULT.OPENER_AT + AG_ULT.WHIFF
  if (s.coat.state !== "off") endCoat(f, s, "ult")
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "agCharge"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f) }
  s.stats.ults++
  const cast = s.castId
  api.scheduleBenSpawn(f, AG_ULT.OPENER_AT, () => hitbox(f, api, "ag_ult_beam", face, {
    damage: AG_ULT.OPENER, beam: true, isBeam: true, spawnX: mouthX(f, face) + face * AG_ULT.REACH / 2, spawnY: mouthY(f) + 6, w: AG_ULT.REACH, h: AG_ULT.H,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { ag: "ultOpen", cast } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  if (frozen(s)) { s.chill.frozen = null; s.chill.ends.push("ult") }        // a Popsicle on them ends quietly: no bonus
  s.chill.pips = 0
  u.phase = "frozen"; u.t = 0; u.raw = AG_ULT.OPENER; u.hits.push(AG_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = AG_ULT.END + AG_ULT.LOCKOUT; f._benPowerCommit = AG_ULT.END; f._spriteCastTimer = AG_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, AG_ULT.END + 2)
}
// pure: the carve slashes of one cast (render + damage beats share them; the same seed → the same angles)
export function ultCarve(seed, frame0, pi) {
  return AG_ULT.CARVE_AT.map((at, i) => ({ at, ang: Math.round((agHash(seed, frame0, pi, i) * 2 - 1) * 70), len: 70 + Math.floor(agHash(seed, frame0, pi, i + 16) * 50) }))
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > AG_ULT.OPENER_AT + 12) { s.lastUlt = { captured: false, raw: 0 }; s.ult = null } return }
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, AG_ULT.ZOOM, AG_ULT.END)       // render-only framing
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "absolute_popsicle", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  if (u.t < AG_ULT.CARVE_AT[0] - 6) { u.phase = "frozen"; f._spriteCastMove = "agBeamFire" }
  else if (u.t < AG_ULT.FINAL_AT - 18) { u.phase = "carve"; f._spriteCastMove = "agCarve"; const k = AG_ULT.CARVE_AT.indexOf(u.t); if (k >= 0) hit(AG_ULT.CARVE, 6 + k * 2) }
  else if (u.t < AG_ULT.END) { u.phase = "final"; f._spriteCastMove = u.t < AG_ULT.FINAL_AT - 8 ? "agCharge" : "agBeamFire"; if (u.t === AG_ULT.FINAL_AT) hit(AG_ULT.FINAL, 18) }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 5; opp.vy = -8
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true }
  s.chill.frozen = null; s.chill.pips = 0; s.chill.immuneT = AG_CHILL.IMMUNE        // released UNFROZEN, refreeze immunity started
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t }
  s.ult = null
  api?.focusCamera?.(f, opp, 1, 12)
  f.attackCooldown = AG_ULT.LOCKOUT; f._benPowerCommit = AG_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
// render-only: JAB lunge (the body draw offset; never collision)
function bodyOffset(f) {
  const a = f.attacking && f.currentAttack; if (!a || a.name !== "light" || !agState(f)) return null
  const el = (a.total || 0) - (a.timer || 0); return { dx: (f.facing || 1) * Math.min(8, el * 2), dy: 0 }
}
CONTACT.unshift((f, s, target, { proj, blocked }) => {                     // move bookkeeping (runs before shatter / chill)
  const tag = proj && proj.alien; if (!tag) return
  if (tag.ag === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (tag.ag === "shard") { killTwin(f, tag, target); if (!blocked) s.stats.shardHits++ }
  if (tag.ag === "slide") slideContact(f, s, tag)
  if (tag.ag === "icicle" && s.icicle && s.icicle.cast === tag.cast) s.icicle.hit = true
  if (tag.ag === "cloud") { if (!blocked) { s.stats.cloudHits++; s.slowT = AG_CLOUD.SLOW_T; s.stats.slows++ } }
})

// ── the moves' render-only FX (the hitboxes are hidden; nothing here is GAME_STATE or collides) ──────────────────
function beamStrip(c, x0, y, face, len, h, frame) {                        // fx:beamTile tiled to the hitbox length
  const d = ARCTICGUANA_FX.beamTile, k = Math.max(1, Math.round(h / d.h)), step = d.w * k
  for (let i = 0; i * step < len; i++) fx(c, "beamTile", 0, x0 + face * (i * step + step / 2), y + ((i + (frame >> 1)) % 2), k, face)
  c.save(); c.globalAlpha = 0.5; c.fillStyle = SNOW; c.fillRect(Math.round(face > 0 ? x0 : x0 - len), Math.round(y - 1), Math.round(len), 2); c.restore()
}
function drawMoves(c, f, s, frame, opp) {
  const face = f.facing || 1, h = f.h || 110, my = mouthY(f), mx = mouthX(f, face)
  const a = f.attacking && f.currentAttack
  if (a) {                                                                   // normals: tail sweeps / frost claw / uppercut frost
    const el = (a.total || 0) - (a.timer || 0)
    if (a.name === "heavy" && el >= 10) fx(c, "tailA", el - 10, cx(f) + face * 70, f.y + h * 0.7, 4, face)
    if (a.name === "down" && el >= 4) fx(c, "tailB", el - 4, cx(f) + face * 55, f.y + h * 0.88, 4, face)
    if (a.name === "light" && el >= 4 && el <= 9) iceFx(c, "arc", cx(f) + face * 50, f.y + h * 0.4, 2, 0.9)
    if (a.name === "up" && el >= 9 && el <= 18) { c.fillStyle = ICE; for (let i = 0; i < 5; i++) px(c, cx(f) + face * (20 + i * 4), f.y + h * 0.6 - i * 14 - (el - 9) * 3, 4) }
  }
  const b = s.breath
  if (b && b.t >= AG_BREATH.STARTUP && b.t < b.streamEnd) {                // ICE BREATH stream (Row 4 streak frames)
    for (let i = 0; i < 6; i++) fx(c, "stream", (frame >> 2) + i, mx + face * (26 + i * 50), my + ((i * 5 + frame) % 4) - 2, 2 + (i > 2 ? 1 : 0), face)
    iceFx(c, "spray", mx + face * AG_BREATH.REACH, my, 2, 0.7)
  }
  if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.ag === "shard" && p.lifetime > 0)   // ICE SHARDS
    fx(c, "shard", p.alien.fan > 0 ? 1 : 0, p.x, p.y, 3, Math.sign(p.vx || face) || 1)
  if (s.cloudCast && s.cloudCast.t >= 4 && !s.cloud) { const k = s.cloudCast; fx(c, "puff", 0, mx + k.face * 30, my, 2, k.face) }
  if (s.cloud) {                                                             // FROST CLOUD (puff frames: grow, hang, disperse)
    const cl = s.cloud, life = AG_CLOUD.LIFE - cl.t, fi = life < 8 ? Math.floor(life / 4) : cl.t < 12 ? 4 : 2 + ((frame >> 4) % 2)
    c.save(); c.globalAlpha = 0.85
    for (let i = -1; i <= 1; i++) fx(c, "puff", fi, cl.x + i * 36, cl.y - AG_CLOUD.H / 2 + Math.abs(i) * 10 + ((frame >> 3) + i) % 3, 3, i < 0 ? -1 : 1)
    c.restore()
  }
  if (s.t - s.cloudPopT < 12) iceFx(c, "splash", s.cloudPopX, s.cloudPopY, 3, 1 - (s.t - s.cloudPopT) / 12)
  const d = s.slide
  if (d && d.t > AG_SLIDE.STARTUP) {                                         // ICE SLIDE cosmetic trail (never solid)
    const fy = f.y + h - 3, x1 = cx(f), len = Math.min(Math.abs(x1 - (d.x0 + (f.w || 60) / 2)), 160)
    c.save(); c.globalAlpha = 0.6; c.fillStyle = ICE2; c.fillRect(Math.round(face > 0 ? x1 - len : x1), Math.round(fy), Math.round(len), 3); c.restore()
    if ((frame & 3) === 0) iceFx(c, "spray", x1 - face * 30, fy - 8, 2, 0.8)
  }
  const bm = s.beam
  if (bm && bm.phase === "charge") { c.fillStyle = (frame & 2) ? SNOW : ICE; px(c, mx, my + 6, 4 + (bm.t >> 3)) }
  if (bm && bm.phase === "hold") beamStrip(c, mx, my + 6, bm.face, AG_BEAM.REACH, AG_BEAM.H, frame)
  if (s.icicle && s.icicle.t >= AG_ICICLE.STARTUP) {                       // ICICLE DROP spike under him
    const x = cx(f), y = f.y + h; c.fillStyle = ICE
    for (let i = 0; i < 6; i++) c.fillRect(Math.round(x - 12 + i * 2), Math.round(y - 20 + i * 4), 24 - i * 4, 4)
  }
  if (s.t - s.landT < 14) { const k = (s.t - s.landT) / 14; iceFx(c, "splash", cx(f), f.y + h - 10, 3, 1 - k) }   // landing pop
  if (s.ult) drawUlt(c, f, s, s.ult, frame, opp)
}
// ABSOLUTE POPSICLE: the opener beam, the GIANT popsicle (integer-scaled stick), hashed carve slashes, the final burst
function drawUlt(c, f, s, u, frame, opp) {
  const face = u.face, mx = mouthX(f, face), my = mouthY(f) + 6
  if (u.phase === "opener") { if (u.t >= AG_ULT.OPENER_AT - 6 && u.t <= AG_ULT.OPENER_AT + 4) beamStrip(c, mx, my, face, AG_ULT.REACH, AG_ULT.H, frame); return }
  if (!opp) return
  const ow = (opp.w || 60), oh = (opp.h || 110), ox = cx(opp), K = 2               // the giant block: integer ×2 of the opponent box
  const w = ow * K, hh = oh * 1.5, x0 = Math.round(ox - w / 2), y0 = Math.round(opp.y + oh - hh)
  const burstT = u.t - AG_ULT.FINAL_AT
  if (burstT < 0) {
    c.save(); c.globalAlpha = 0.42; c.fillStyle = ICE; c.fillRect(x0, y0, w, hh)
    c.globalAlpha = 0.95; c.fillStyle = ICE2; c.fillRect(x0, y0, w, 4); c.fillRect(x0, y0, 4, hh); c.fillRect(x0 + w - 4, y0, 4, hh); c.fillRect(x0, y0 + hh - 4, w, 4)
    c.fillStyle = SNOW; for (let k = 0; k < 6; k++) px(c, x0 + 14 + k * 9, y0 + 14 + k * 9, 4)
    const sw = 6 * K, sh = 20 * K                                            // the stick: an integer-scaled 6×20 block
    c.fillStyle = "#c08a4a"; c.fillRect(Math.round(ox - sw / 2), y0 - sh, sw, sh); c.fillStyle = "#8a5a2a"; c.fillRect(Math.round(ox + sw / 2 - K * 2), y0 - sh, K * 2, sh)
    c.restore()
    if (u.phase === "carve" || u.phase === "final") for (const cv of ultCarve(u.seed, u.f0, u.pi)) {   // the hashed carve slashes
      const age = u.t - cv.at; if (age < 0 || age > 22) continue
      const r = cv.ang * Math.PI / 180, cxp = ox, cyp = y0 + hh / 2, dx = Math.cos(r) * cv.len / 2, dy = Math.sin(r) * cv.len / 2
      c.save(); c.globalAlpha = Math.max(0.3, 1 - age / 22); c.strokeStyle = age < 6 ? SNOW : INK; c.lineWidth = age < 6 ? 5 : 3
      c.beginPath(); c.moveTo(Math.round(cxp - dx), Math.round(cyp - dy)); c.lineTo(Math.round(cxp + dx), Math.round(cyp + dy)); c.stroke(); c.restore()
      if (age < 10) { fx(c, "tailB", age, cxp + dx, cyp + dy, 3, face); iceFx(c, "arc", cxp, cyp, 2, 1 - age / 10) }
    }
    if (u.phase === "final" && u.t >= AG_ULT.FINAL_AT - 8) beamStrip(c, mx, my, face, Math.abs(ox - mx), AG_ULT.H, frame)
  } else {                                                                     // FINAL SHATTER: capped shards + frost ring
    const k = Math.min(1, burstT / 20)
    iceFx(c, "burst2", ox, y0 + hh / 2, 4, 1 - k)
    c.save(); c.globalAlpha = 1 - k; c.strokeStyle = ICE2; c.lineWidth = 4; c.beginPath(); c.arc(Math.round(ox), Math.round(y0 + hh / 2), 20 + 160 * k, 0, Math.PI * 2); c.stroke(); c.restore()
    c.fillStyle = ICE
    for (let i = 0; i < AG_ULT.SHARDS; i++) { const ang = agHash(u.seed, u.f0, u.pi, 40 + i) * Math.PI * 2, dist = 30 + 180 * k * (0.6 + agHash(u.seed, u.f0, u.pi, 60 + i) * 0.4)
      px(c, ox + Math.cos(ang) * dist, y0 + hh / 2 + Math.sin(ang) * dist * 0.7, 6 - Math.floor(k * 4)) }
  }
}
