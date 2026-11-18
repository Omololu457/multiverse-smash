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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, blockLight, damageTaken, incomingScale, onContact,
  drawHud: drawArcticguanaHud, drawFx: drawArcticguanaFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshArcticguanaState() {
  return { kind: AG_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 }, baseDef: null,
    coat: { state: "off", t: 0, cd: 0, burst: false, shatterT: -999, coats: 0, shatters: 0, ends: [] },
    chill: { pips: 0, lastT: -999, pipped: [], immuneT: 0, frozen: null, pops: 0, shatters: 0, ends: [], endT: -999, shatterT: -999 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0, bursts: 0, burstHits: 0, fireHits: 0 } }
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
  input = input || {}
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference (damage tag lookups / render)
  api0 = api
  tickInputs(f, s, input)
  tickCoat(f, s, api)
  tickChill(f, s, api && api.getOpponent ? api.getOpponent(f) : null, api)
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const castBusy = s => false   // the casts (Phase 5) own him
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
function fireUltimate(f, ctx, api) { return false }

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
export const AG_CHILL = { MAX: 3, EXPIRE: 240, FREEZE: 30, MASH: 6, IMMUNE: 420, SHATTER: 25, HOLD: 2 }
const MASH_KEYS = ["light", "heavy", "special", "jump", "grab", "block", "ultimate", "charge"]
export const frozen = s => !!(s && s.chill.frozen)
export function addChill(f, s, opp, cast) {
  const c = s.chill
  if (!opp || opp.eliminated || c.frozen || c.immuneT > 0) return false
  if (c.pipped.includes(cast)) return false                               // one pip per cast
  c.pipped.push(cast); if (c.pipped.length > 8) c.pipped.shift()
  c.pips = Math.min(AG_CHILL.MAX, c.pips + 1); c.lastT = s.t
  if (c.pips >= AG_CHILL.MAX) startPopsicle(f, s, opp)
  return true
}
function startPopsicle(f, s, opp) {
  const c = s.chill
  c.pips = 0; c.pops++
  c.frozen = { t: 0, until: AG_CHILL.FREEZE, x: opp.x, y: opp.y, hp: null, mash: 0, prev: 0 }
  opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
}
export function endPopsicle(f, s, opp, why) {
  const c = s.chill, z = c.frozen; if (!z) return null
  c.frozen = null; c.immuneT = AG_CHILL.IMMUNE; c.pips = 0; c.endT = s.t
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
function tickChill(f, s, opp, api) {
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
