// goop.js — GOOP (Polymorph, Alien Force), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: no engine imports (no cycles). The engine calls the hooks below through the generic, ben10-gated
// ready-form dispatch (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate) and
// passes an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (plain data, no object references), cleared
// by clearBenFormState on swap / revert / KO. No randomness of any kind — nothing here is random at all.
// Render-only bits (Corrode drip tint, flood tiling, goo overlay) READ that state; they never write it.
import { GOOP_ANIM, GOOP_PROJECTOR, GOOP_FX, GOOP_GEOM } from "./goopAssets.js"
export { GOOP_ANIM, GOOP_PROJECTOR, GOOP_FX, GOOP_GEOM }

const ANIM = GOOP_ANIM

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra
})

export const GOOP = {
  id: "goop", poolKey: "goop", displayName: "Goop", slot: 4,
  status: "ready", sheetPath: "./ben10_goop_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/goop/SPRITE_LEDGER.md",
  mods: { speed: 0.98, damage: 1.0, defense: 1.0, weight: 0.9 },
  movement: "grounded", maxJumps: 2,   // the game's shared double jump; Goo Rocket never refills it
  moves: { jab: "Jab", heavy: "Heavy", poke: "Stretch Poke", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Acid Spit", special2: "Acid Lob", special3: "Goo Lasso", special4: "Spike Splash", special5: "Goo Rocket",
    puddle: "Puddle Form", geyser: "Geyser", ultimate: "Meltdown Flood" },
  // pre-mod numbers from the brief (startup / damage / on-block)
  basic_attacks: {
    light:  normal(18, 5, 3, 12, 0),                                                     // R18 arm fling
    heavy:  normal(54, 14, 4, 24, -6, { knockbackX: 8, rangeX: 180 }),                   // R1 stretch kick, 180 px
    down:   normal(26, 7, 3, 16, -4, { hitLevel: "low" }),                               // R22 melt-sweep
    up:     normal(48, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // R5 f1-5
    air:    normal(30, 7, 4, 12, 2)                                                      // R11 airborne
  },
  anim: ANIM, fx: GOOP_FX,
  onApply, tick, weakpoint, onWeakpoint, damageTaken, evade, fireSpecial, onContact, damageDealt,
  drawHud: drawGoopHud, drawFx: drawGoopFx
}

// ── tuning (from the brief) ───────────────────────────────────────────────────────────────────────────────
export const GP_BODY = { MELEE_MULT: 0.75 }                       // goo body: −25% from physical melee normals only
export const GP_PROJ = { W: 10, H: 6, MULT: 1.15, SPLAT_WINDOW: 180, SPLAT_FRAMES: 40, SPLAT_CD: 600, REFORM: 20 }
// Hurtbox space: the 110-px physics box stands for his 61-px standing body (R21 f1, source px), so a projector offset in
// source px maps to game px by f.h / 61 (idle: the disc's centre sits ~18 px above the box top). Display scale is
// cosmetic and decoupled, exactly like every other body hurtbox in the engine.
export const GP_STAND_BODY_H = 61
export const GP_PUDDLE = { COST: 10, DRAIN_PER_S: 4, MAX: 150, SPEED: 6, MELT: 6, REFORM: 12, BACK_WINDOW: 12, DP_WINDOW: 20 }
export const GP_ACID = { MAX: 3, EXPIRE: 240, CORRODE: 180, IMMUNE: 360, MULT: 1.15, GUARD_MULT: 1.25, DISSOLVE: 20 }
export const GP_GEYSER = { DMG: 60, FRAMES: 22, HIT_AT: 8, RECOVERY: 10 }

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshGoopState() {
  return { kind: "goop", t: 0, castId: 0, baseDmg: 1.0, pose: null,
    weak: 0, projHits: [], splat: null, splatCd: 0,
    puddle: null, lastBackT: -999, dp: { stage: 0, t: 0 },
    acid: { pips: 0, pipT: 0, lastPipCast: -1, corrodeT: 0, immune: 0, corrodes: 0, dissolves: 0, dissolveUsed: false },
    stats: { projHits: 0, gooReduced: 0, splats: 0, puddles: 0, geysers: 0, evaded: 0 } }
}
export const gpState = f => (f?.omnitrix?.formState?.kind === "goop" && f.transformed && f.activeAlien === "goop") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshGoopState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? GOOP.mods.damage   // mods.damage × Vow (set by applyAlien)
}

// ── sim pose → which sheet frame he is in (deterministic, from GAME_STATE only; drives the projector position) ──
const ATK_ANIM = { light: "light", heavy: "heavy", down: "down", up: "up", air: "air" }
function frameOf(anim, t) {
  const a = ANIM[anim]; if (!a) return 0
  const i = Math.floor(Math.max(0, t) / Math.max(1, a.speed))
  return a.loop ? i % a.frames : Math.min(a.frames - 1, i)
}
export function goopPose(f, s) {
  if (s.puddle) { const pd = s.puddle, k = pd.phase === "melt" ? "gpMelt" : pd.phase === "reform" ? "gpReform" : "gpPuddle"; return [k, frameOf(k, pd.phase === "slide" ? pd.t : pd.pt)] }
  if (s.splat) return s.splat.t < GP_PROJ.SPLAT_FRAMES ? ["gpSplat", frameOf("gpSplat", s.splat.t)] : ["gpSplatRise", frameOf("gpSplatRise", s.splat.t - GP_PROJ.SPLAT_FRAMES)]
  if (s.pose && ANIM[s.pose.anim]) return [s.pose.anim, frameOf(s.pose.anim, s.pose.t)]
  const atk = f.attacking && f.currentAttack
  if (atk && ATK_ANIM[atk.name]) { const k = atk.poke ? "gpPoke" : ATK_ANIM[atk.name]; return [k, frameOf(k, (atk.total || 0) - (atk.timer || 0))] }
  const grounded = !!(f.onGround || f.grounded)
  if ((f.hitstun || 0) > 0) return grounded ? ["hurt", 0] : ["hurt_air", 0]
  if (!grounded) return ["fall", 0]
  return ["idle", frameOf("idle", s.t)]
}
// Projector box in game px (≈10×6), or null when he has no projector to hit (KO).
export function projectorBox(f) {
  const s = gpState(f); if (!s || (f.health ?? 1) <= 0) return null
  const [anim, i] = goopPose(f, s)
  const p = (GOOP_PROJECTOR[anim] || GOOP_PROJECTOR.idle)[i] || GOOP_PROJECTOR.idle[0]
  const k = (f.h || 110) / GP_STAND_BODY_H, face = f.facing || 1
  const cx = f.x + (f.w || 60) / 2 + face * p[0] * k, cy = f.y + (f.h || 110) + p[1] * k
  return { x: cx - GP_PROJ.W / 2, y: cy - GP_PROJ.H / 2, w: GP_PROJ.W, h: GP_PROJ.H }
}
function weakpoint(f) { return projectorBox(f) }
function onWeakpoint(f, hit) { const s = gpState(f); if (s) s.weak = hit ? 1 : 0 }

// A PHYSICAL MELEE NORMAL: a body strike that is not a special / ultimate / grab / throw / beam and not fire- or
// electric-typed (read from the live attack and the attacker's own move data — no other character is edited).
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

// Damage the form TAKES (generic damageTaken hook, after the form's own defense mod).
function damageTaken(f, raw, opts) {
  const s = gpState(f); if (!s) return raw
  const weak = s.weak; s.weak = 0
  if (opts.source === "block-chip") return raw                          // a guarded hit never lands on the projector
  if (weak && (opts.source === "melee" || opts.source === "projectile")) {
    s.stats.projHits++                                                   // PROJECTOR: no goo reduction, +15%, counted once
    registerProjectorHit(f, s)
    return raw * GP_PROJ.MULT
  }
  if (opts.source === "melee" && opts.attacker && isPhysicalNormal(opts.attacker, opts.attacker.currentAttack)) {
    s.stats.gooReduced++
    return raw * GP_BODY.MELEE_MULT                                      // GOO BODY: −25% from physical melee normals
  }
  return raw
}
function registerProjectorHit(f, s) {
  s.projHits = s.projHits.filter(at => s.t - at < GP_PROJ.SPLAT_WINDOW)
  s.projHits.push(s.t)
  if (s.projHits.length >= 2 || s.puddle) startSplat(f, s)              // Puddle: one projector hit forces the Splat
}
export function startSplat(f, s) {
  if (s.splat || s.splatCd > 0) return false                            // one Splat per 600f
  s.splat = { t: 0 }; s.splatCd = GP_PROJ.SPLAT_CD; s.projHits = []; s.pose = null; s.puddle = null; s.stats.splats++
  const lock = GP_PROJ.SPLAT_FRAMES + GP_PROJ.REFORM
  f._benPowerCommit = Math.max(f._benPowerCommit || 0, lock); f.attackCooldown = Math.max(f.attackCooldown || 0, lock)
  f.attacking = false; f.currentAttack = null; f.vx = 0
  return true
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = gpState(f); if (!s) return
  s.t++
  s.weak = 0                                                             // a weak-point test never carries past its frame
  if (s.splatCd > 0) s.splatCd--
  const face = f.facing || 1
  if (face > 0 ? input?.left : input?.right) s.lastBackT = s.t              // ←↙↓ (Spike Splash) vs plain ↓ (Puddle)
  tickPuddle(f, s, input || {}, ctx, api)
  tickAcid(s)
  if (s.pose) { s.pose.t++; if (s.pose.t >= (s.pose.len || 0)) s.pose = null }
  if (s.splat) {
    const sp = s.splat; sp.t++
    f._spriteCastMove = sp.t <= GP_PROJ.SPLAT_FRAMES ? "gpSplat" : "gpSplatRise"; f._spriteCastTimer = 2
    f.vx = 0
    if (sp.t >= GP_PROJ.SPLAT_FRAMES + GP_PROJ.REFORM) { s.splat = null; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  }
}

// ── PUDDLE FORM (↓ + Special, hold) ─────────────────────────────────────────────────────────────────────────
// melt (R22, 6f) → slide (R16, speed 6, Power −4/s, max 150f) → release = reform (R17, 12f, punishable) or
// →↓↘ = GEYSER. Low profile: high / mid melee and projectiles miss his body (evade); the projector still floats
// at its height and a projector hit forces an instant Splat. Can't jump, block or attack (power commit + cooldown).
function canAct(f, s) {
  return f.transformed && f.activeAlien === "goop" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !s.puddle && !s.splat && !s.ult
}
function enterPuddle(f, s, api) {
  if (!(f.onGround || f.grounded) || !canAct(f, s)) return false
  if (!api.spendEnergy(f, GP_PUDDLE.COST)) return false
  f.isCharging = false; f.vx = 0
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.puddle = { phase: "melt", t: 0, pt: 0 }; s.dp = { stage: 0, t: 0 }; s.stats.puddles++
  hold(f, 2)
  return true
}
function hold(f, n) { f._benPowerCommit = Math.max(f._benPowerCommit || 0, n); f.attackCooldown = Math.max(f.attackCooldown || 0, n) }
function endPuddle(f, s, how) {
  const pd = s.puddle; if (!pd) return
  if (how === "reform") { pd.phase = "reform"; pd.pt = 0; hold(f, GP_PUDDLE.REFORM); return }
  s.puddle = null
}
function tickPuddle(f, s, input, ctx, api) {
  const pd = s.puddle; if (!pd) return
  if ((f.hitstun || 0) > 0 || (f.health || 0) <= 0) { s.puddle = null; return }   // knocked out of the puddle
  pd.pt++
  f.vx = 0
  if (pd.phase === "melt") {
    hold(f, 2); f._spriteCastMove = "gpMelt"; f._spriteCastTimer = 2
    if (pd.pt >= GP_PUDDLE.MELT) { pd.phase = "slide"; pd.t = 0 }
    return
  }
  if (pd.phase === "reform") {
    f._spriteCastMove = "gpReform"; f._spriteCastTimer = 2
    if (pd.pt >= GP_PUDDLE.REFORM) { s.puddle = null; f._spriteCastMove = null; f._spriteCastTimer = 0 }
    return
  }
  // slide
  pd.t++
  hold(f, 2); f._spriteCastMove = "gpPuddle"; f._spriteCastTimer = 2
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - GP_PUDDLE.DRAIN_PER_S / 60)
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right, down = !!input.down
  // GEYSER: →↓↘ inside the puddle (frame-counted motion, GAME_STATE only)
  const dp = s.dp
  if (dp.stage > 0 && s.t - dp.t > GP_PUDDLE.DP_WINDOW) { dp.stage = 0 }
  if (dp.stage === 0 && fwd && !down) { dp.stage = 1; dp.t = s.t }
  else if (dp.stage === 1 && down && !fwd) dp.stage = 2
  else if (dp.stage === 2 && down && fwd) { dp.stage = 0; castGeyser(f, s, api); return }
  if (!input.special) { endPuddle(f, s, "reform"); return }                 // release = reform (12f, punishable)
  if (pd.t >= GP_PUDDLE.MAX || (f.energy || 0) <= 0) { endPuddle(f, s, "reform"); return }
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (dir) f._benLunge = { frames: 1, speed: dir * GP_PUDDLE.SPEED }        // slide at speed 6 (stage-clamped by physics)
}
function castGeyser(f, s, api) {
  s.puddle = null; s.stats.geysers++; s.castId++
  const cast = s.castId, face = f.facing || 1
  s.pose = { anim: "gpGeyser", t: 0, len: GP_GEYSER.FRAMES }
  f._spriteCastMove = "gpGeyser"; f._spriteCastTimer = GP_GEYSER.FRAMES
  hold(f, GP_GEYSER.FRAMES + GP_GEYSER.RECOVERY)
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  api.scheduleBenSpawn(f, GP_GEYSER.HIT_AT, () => {
    api.spawnProjectile(f, "gp_geyser", { damage: GP_GEYSER.DMG, speed: 0, vx: 0, vy: 0, rectHitbox: true,
      spawnX: f.x + f.w / 2 + face * 50, spawnY: f.y + f.h * 0.3, w: 100, h: 160, lifetime: 3,
      isSpecial: true, hitstun: 32, blockstun: 16, knockbackX: 3 * face, knockbackY: -14,
      alien: { gp: "geyser", cast } }, {})
  })
  return true
}
// Low profile: in the puddle (melt / slide) everything but a LOW melee move misses the body. Reform is punishable.
function evade(f, { move = null, proj = null, attacker = null } = {}) {
  const s = gpState(f); if (!s || !s.puddle || s.puddle.phase === "reform") return false
  // the engine's own level rule (combat.getHitLevel): a jump-in is an overhead, else the move's hitLevel, default mid
  const low = !proj && !!move && !!attacker && !!(attacker.onGround || attacker.grounded) && move.hitLevel === "low"
  if (!low) s.stats.evaded++
  return !low
}

// ── specials (shared alien motion inputs, read from the held direction the frame Special is pressed) ───────
function fireSpecial(f, ctx, api) {
  const s = gpState(f); if (!s) return false
  const dir = f._specialHeldDir || null
  if (dir === "D" && s.t - s.lastBackT > GP_PUDDLE.BACK_WINDOW) return enterPuddle(f, s, api)   // ↓ + Special (hold)
  return false
}

// ── ACID / CORRODE (status on the OPPONENT, owned by this form's GAME_STATE — swap / revert / KO clear it) ──
// Clean hits from Acid Spit, Acid Lob's splash and Spike Splash add ONE pip per cast (max 3, expire 240f after the
// last; never from blocks or FX). 3 pips → CORRODE 180f: everything this form deals the opponent ×1.15 and guard
// chip ×1.25 (the guard drains 25% faster). No refresh; 360f immunity after. DISSOLVE: Goo Lasso on a corroded
// opponent adds a fixed +20 once and ends Corrode early (immunity starts).
function tickAcid(s) {
  const a = s.acid
  if (a.pips > 0 && --a.pipT <= 0) { a.pips = 0; a.pipT = 0 }
  if (a.corrodeT > 0 && --a.corrodeT <= 0) { a.corrodeT = 0; a.immune = GP_ACID.IMMUNE }
  else if (a.immune > 0) a.immune--
}
export function addAcidPip(s, cast) {
  const a = s.acid
  if (cast == null || cast === a.lastPipCast) return false                  // one pip per cast, however many ticks hit
  if (a.corrodeT > 0 || a.immune > 0) return false                          // no refresh while corroded / immune
  a.lastPipCast = cast
  a.pips = Math.min(GP_ACID.MAX, a.pips + 1); a.pipT = GP_ACID.EXPIRE
  if (a.pips >= GP_ACID.MAX) { a.pips = 0; a.pipT = 0; a.corrodeT = GP_ACID.CORRODE; a.dissolveUsed = false; a.corrodes++ }
  return true
}
export function applyCorrode(s) {                                            // the ultimate's finale (respects immunity)
  const a = s.acid
  if (a.corrodeT > 0 || a.immune > 0) return false
  a.pips = 0; a.pipT = 0; a.corrodeT = GP_ACID.CORRODE; a.dissolveUsed = false; a.corrodes++
  return true
}
function endCorrode(s) { const a = s.acid; if (a.corrodeT > 0) { a.corrodeT = 0; a.immune = GP_ACID.IMMUNE } }
function damageDealt(f, target, raw, opts) {
  const s = gpState(f); if (!s || s.acid.corrodeT <= 0) return raw
  return raw * (opts.source === "block-chip" ? GP_ACID.GUARD_MULT : GP_ACID.MULT)
}
// Called by combat after a contact this form OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false, dealDamage = null } = {}) {
  const s = gpState(f); if (!s || !proj || proj.visualOnly || blocked) return
  const tag = proj.alien
  if (!tag || tag.gp == null) return
  if (tag.acid) addAcidPip(s, tag.cast)
  if (tag.gp === "lasso" || tag.gp === "ultOpen") onLassoHit(f, s, target, tag, dealDamage)
}
function onLassoHit(f, s, target, tag, dealDamage) {
  if (!target || target.eliminated) return
  const a = s.acid
  if (a.corrodeT > 0 && !a.dissolveUsed && dealDamage) {                   // DISSOLVE: fixed +20 once, Corrode ends
    a.dissolveUsed = true; endCorrode(s); a.dissolves++
    dealDamage(target, GP_ACID.DISSOLVE, { attacker: f, move: "dissolve", source: "ability" })
  }
  if (tag.gp === "lasso") pullTarget(f, s, target)
  if (tag.gp === "ultOpen") startUltCinematic(f, s, target)
}
function pullTarget() {}
function startUltCinematic() {}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
// HUD under the Omnitrix Power bar: Acid pips on the opponent / CORRODE / immunity, Puddle and Splat status.
export function drawGoopHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = gpState(f); if (!ctx || !s) return
  const a = s.acid, y = enY + enH + 3, h = 5
  const col = a.corrodeT > 0 ? "#a3e635" : "#65a30d"
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const ratio = a.corrodeT > 0 ? a.corrodeT / GP_ACID.CORRODE : a.pips / GP_ACID.MAX
  const w = pbw * Math.max(0, Math.min(1, ratio))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const pips = a.corrodeT > 0 ? "CORRODE" : a.immune > 0 ? "IMMUNE" : "●".repeat(a.pips) + "○".repeat(GP_ACID.MAX - a.pips)
  const extra = s.splat ? "   SPLAT!" : s.puddle ? "   PUDDLE" : s.splatCd > 0 ? "" : ""
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(`ACID ${pips}${extra}`, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
// Fighter overlays: Corrode = dripping green tint over the opponent's drawn sprite (deterministic drip pattern).
export function drawGoopFx(c, f, frame = 0, opp = null) {
  const s = gpState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  if (s.acid.corrodeT > 0 && opp && opp._lastDrawX != null && opp._lastDrawW != null) {
    const x = opp._lastDrawX, y = opp._lastDrawY, w = opp._lastDrawW, h = opp._lastDrawH
    c.globalAlpha = 0.18; c.fillStyle = "#84cc16"; c.fillRect(x + w * 0.25, y + h * 0.15, w * 0.5, h * 0.8)
    c.globalAlpha = 0.85; c.fillStyle = "#65a30d"
    for (let k = 0; k < 6; k++) {
      const dx = x + w * (0.3 + 0.08 * k), len = ((frame * 2 + k * 23) % 40)
      c.fillRect(Math.round(dx), Math.round(y + h * 0.35 + len), 3, 6 + (k % 3) * 2)
    }
  }
  c.restore()
}
