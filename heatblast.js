// heatblast.js — HEATBLAST (Pyronite), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: no engine imports (no cycles). The engine calls the hooks below through the generic, ben10-gated
// ready-form dispatch (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate) and
// passes an `api` object with the shared primitives (spendEnergy, spawnProjectile, applyScaledDamage, …).
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (the Omnitrix sub-structure), cleared by
// clearBenFormState on swap / revert / KO. No randomness of any kind — nothing here is random at all.
// Render-only bits (Blue Flame palette = the alt-pal strips, pixel rings) READ that state; they never write it.
import { HEATBLAST_ANIM, HEATBLAST_BLUE_ANIM, HEATBLAST_FX } from "./heatblastAssets.js"
export { HEATBLAST_ANIM, HEATBLAST_BLUE_ANIM, HEATBLAST_FX }

// The ultimate's opener plays the full attack-1 throw under the cast name "hbFire" (the Omnitrix ult pose key).
const ANIM = { ...HEATBLAST_ANIM, hbFire: HEATBLAST_ANIM.heavy }
const BLUE_ANIM = { ...HEATBLAST_BLUE_ANIM, hbFire: HEATBLAST_BLUE_ANIM.heavy }

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
export const HB_HEAT = { MAX: 100, FIREBALL: 10, ROCKET: 12, NORMAL: 4, ABSORB: 25, IDLE_DELAY: 60, HOT: 50,
  BLUE_FRAMES: 360, BURNOUT_FRAMES: 120, SUPERNOVA_MIN: 25 }
export const HB_TIER_MULT = { warm: 1, hot: 1.10, blue: 1.20 }
export const HB_SCORCH = { MAX: 3, EXPIRE: 240, TICK: 10, BURN: 60, BURN_DMG: 5, IMMUNE: 300, FLASHPOINT: 25 }
export const HB_COST = { fireball: 10, rocket: 14, supernova: 18, flight: 12, ultimate: 50 }
export const HB_ABSORB = { WINDOW: 8, COOLDOWN: 360 }
export const HB_FLIGHT = { FRAMES: 45, SPEED: 8, BASE_DEG: -30, STEER_DEG: 20, CAP_ABOVE_APEX: 80, DIVE_VX: 7, DIVE_VY: 16, DIVE_MAX: 30, DIVE_DMG: 55 }
export const HB_ULT = { OPENER: 40, RAIN: 30, RAIN_AT: [35, 50, 65], IMPACT: 110, RISE: 25, SUN_END: 85, IMPACT_AT: 105, END: 106,
  WHIFF_RECOVERY: 60, LOCKOUT: 100 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, fire: true, ...extra
})

export const HEATBLAST = {
  id: "heatblast", poolKey: "heatblast", displayName: "Heatblast", slot: 2,
  status: "ready", sheetPath: "./ben10_heatblast_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/heatblast/SPRITE_LEDGER.md",
  mods: { speed: 1.05, damage: 1.10, defense: 0.92, weight: 0.95 },
  movement: "grounded", maxJumps: 2,   // the game's shared double jump; Blaze Flight never refills it
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air", down_air: "Down-Air",
    special1: "Fireball", special2: "Fire Rocket", special3: "Supernova", special4: "Blaze Flight",
    defense: "Heat Absorb", ultimate: "Pyronite Meteor" },
  basic_attacks: {
    light:    normal(20, 5, 3, 12, 0),                                                    // flame palm
    heavy:    normal(56, 14, 4, 24, -6, { knockbackX: 8, rangeX: 160 }),                    // thrown flame burst, 160 px
    down:     normal(28, 7, 3, 16, -4, { hitLevel: "low" }),                              // crouch flame lick
    up:       normal(50, 11, 4, 28, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // attack3 f1-3 upward flare
    air:      normal(32, 7, 4, 12, 2),                                                    // fall frames + forward burst
    down_air: normal(48, 12, 4, 16, 0, { knockbackY: 10 })                                // attack4 dive
  },
  anim: ANIM, blueAnim: BLUE_ANIM, fx: HEATBLAST_FX,
  onApply, tick, fireSpecial, fireUltimate, blockHeavy, absorb, onContact
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHeatblastState() {
  return { kind: "heatblast", heat: 0, idle: 0, blue: 0, burnout: 0, absorbWin: 0, absorbCd: 0, baseDmg: 1.10,
    castId: 0, airborne: false, flightUsed: false, apexY: null, flight: null, dive: null, ult: null,
    rocketCast: -1, lastPipCast: -1, lastAbsorbed: null,
    scorch: { pips: 0, pipT: 0, burnT: 0, burnTick: 0, burnDealt: 0, immune: 0, flashUsed: false, ignites: 0, flashpoints: 0 } }
}
export const hbState = f => (f?.omnitrix?.formState?.kind === "heatblast" && f.transformed && f.activeAlien === "heatblast") ? f.omnitrix.formState : null
export const heatTier = s => !s ? "warm" : s.blue > 0 ? "blue" : s.heat >= HB_HEAT.HOT ? "hot" : "warm"

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshHeatblastState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? HEATBLAST.mods.damage   // mods.damage × Vow (set by applyAlien)
}

export function addHeat(f, amount) {
  const s = hbState(f)
  if (!s || !(amount > 0) || s.blue > 0 || s.burnout > 0) return 0
  const before = s.heat
  s.heat = Math.min(HB_HEAT.MAX, s.heat + amount); s.idle = 0
  if (s.heat >= HB_HEAT.MAX) { s.blue = HB_HEAT.BLUE_FRAMES; s.heat = HB_HEAT.MAX; f.colorFlash = Math.max(f.colorFlash || 0, 14); if (!f._benSfx) f._benSfx = "hb_blue" }
  return s.heat - before
}
function enterBurnout(s) { s.blue = 0; s.heat = 0; s.idle = 0; s.burnout = HB_HEAT.BURNOUT_FRAMES }

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = hbState(f); if (!s) return
  const opp = api.getOpponent(f)
  if (s.absorbWin > 0) s.absorbWin--
  if (s.absorbCd > 0) s.absorbCd--
  // HEAT: Blue Flame 360f → Burnout 120f (Heat locked at 0, Rocket / Supernova unavailable); else idle decay.
  if (s.blue > 0) { s.heat = HB_HEAT.MAX; if (--s.blue <= 0) enterBurnout(s) }
  else if (s.burnout > 0) { s.heat = 0; s.burnout-- }
  else {
    if (f.attacking || (f.attackCooldown || 0) > 0 || s.flight || s.dive || s.ult) s.idle = 0
    else if (++s.idle >= HB_HEAT.IDLE_DELAY && s.heat > 0) s.heat = Math.max(0, s.heat - 1)
  }
  // fire damage tier: every Heatblast hit is fire → the multiplier rides the form's damage multiplier.
  f.damageMultiplier = s.baseDmg * HB_TIER_MULT[heatTier(s)]
  // render data follows the GAME_STATE flag (the Blue Flame look is the sheet's alt-pal strips)
  const wantAnim = s.blue > 0 ? BLUE_ANIM : ANIM
  if (f._skinAnim !== wantAnim) f._skinAnim = wantAnim
  // airtime bookkeeping: Blaze Flight is once per airtime; the cap is the jump apex + 80 px
  const grounded = !!(f.onGround || f.grounded)
  if (grounded) { s.airborne = false; s.flightUsed = false; s.apexY = null }
  else { s.airborne = true; s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  tickFlight(f, s, input, opp, api)
  tickUlt(f, s, opp, api)
  tickScorch(f, s, opp, api)
}

function tickFlight(f, s, input, opp, api) {
  if (s.flight) {
    if ((f.hitstun || 0) > 0 || (f.health || 0) <= 0) { s.flight = null; delete f._benGlide; return }
    const fl = s.flight, face = fl.face
    const steer = input?.up ? -HB_FLIGHT.STEER_DEG : input?.down ? HB_FLIGHT.STEER_DEG : 0
    const rad = (HB_FLIGHT.BASE_DEG + steer) * Math.PI / 180
    f._benGlide = { vx: face * Math.cos(rad) * HB_FLIGHT.SPEED, vy: Math.sin(rad) * HB_FLIGHT.SPEED, minY: fl.capY }
    f._spriteCastMove = "hbFlight"; f._spriteCastTimer = 2
    if (++fl.t >= HB_FLIGHT.FRAMES) { s.flight = null; delete f._benGlide; s.dive = { t: 0, face, hit: false, cast: fl.cast }; f.vx = face * HB_FLIGHT.DIVE_VX; f.vy = HB_FLIGHT.DIVE_VY }
    return
  }
  if (s.dive) {
    const d = s.dive
    if ((f.hitstun || 0) > 0) { s.dive = null; return }
    const landed = (f.onGround || f.grounded) && d.t > 0
    if (landed || d.t >= HB_FLIGHT.DIVE_MAX || d.hit) {
      if (landed) spawnFx(f, api, "fireball", f.x + f.w / 2, f.y + f.h - 10, 18, 3)
      s.dive = null; f.attackCooldown = Math.max(f.attackCooldown || 0, 14); return
    }
    d.t++
    f.vx = d.face * HB_FLIGHT.DIVE_VX; f.vy = Math.max(f.vy || 0, HB_FLIGHT.DIVE_VY)
    f._spriteCastMove = "hbFlight"; f._spriteCastTimer = 2
    api.spawnProjectile(f, "hb_dive", { damage: HB_FLIGHT.DIVE_DMG, speed: 0, vx: 0, vy: 0,
      spawnX: f.x + f.w / 2 + d.face * 20, spawnY: f.y + f.h * 0.7, w: 80, h: 70, radius: 40, lifetime: 2,
      isSpecial: true, hitstun: 22, blockstun: 14, knockbackX: 6, knockbackY: 6, noHitstop: false,
      fire: true, hbScorch: d.cast, hbDive: true, hbBlue: s.blue > 0 }, {})
  }
}

function tickScorch(f, s, opp, api) {
  const sc = s.scorch
  if (sc.pips > 0 && sc.burnT <= 0 && --sc.pipT <= 0) sc.pips = 0
  if (sc.immune > 0) sc.immune--
  if (sc.burnT > 0) {
    sc.burnT--
    if (--sc.burnTick <= 0) {
      sc.burnTick = HB_SCORCH.TICK
      if (opp && !opp.eliminated && (opp.health || 0) > 1) {
        // 5 per tick, combo-scaled, cannot KO (stops at 1 HP). offenseApplied: the burn is flat, not tier-boosted.
        const before = opp.health
        api.applyScaledDamage(opp, HB_SCORCH.BURN_DMG * api.getComboScale(f), { attacker: f, move: "ignite", source: "dot", floor: 1, offenseApplied: true, defenseApplied: true, regrowthEligible: true })
        sc.burnDealt += before - opp.health
      }
      sc.rawBurn = (sc.rawBurn || 0) + HB_SCORCH.BURN_DMG
    }
    if (sc.burnT <= 0) sc.immune = HB_SCORCH.IMMUNE
  }
}
function addScorchPip(f, s, castId) {
  const sc = s.scorch
  if (castId == null || castId === s.lastPipCast) return false        // one pip per cast, however many ticks hit
  if (sc.burnT > 0 || sc.immune > 0) return false                     // can't refresh while burning / immune
  s.lastPipCast = castId
  sc.pips = Math.min(HB_SCORCH.MAX, sc.pips + 1); sc.pipT = HB_SCORCH.EXPIRE
  if (sc.pips >= HB_SCORCH.MAX) {                                     // IGNITE: consume the pips, burn 60f
    sc.pips = 0; sc.pipT = 0; sc.burnT = HB_SCORCH.BURN; sc.burnTick = HB_SCORCH.TICK; sc.burnDealt = 0; sc.rawBurn = 0
    sc.flashUsed = false; sc.ignites++
    if (!f._benSfx) f._benSfx = "hb_ignite"
  }
  return true
}

// ── casts ────────────────────────────────────────────────────────────────────────────────────────────────
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!f.transformed || f.activeAlien !== "heatblast" || f.attacking || (f.attackCooldown || 0) > 0 ||
      (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || s.flight || s.dive || s.ult) return false
  if (!api.spendEnergy(f, cost)) return false
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.idle = 0
  return true
}
function spawnFx(f, api, key, x, y, lifetime, scale, extra = {}) {
  const s = hbState(f), a = HEATBLAST_FX[(s && s.blue > 0) ? key + "Blue" : key] || HEATBLAST_FX[key]
  return api.spawnProjectile(f, "hb_fx_" + key, { damage: 0, speed: 0, vx: 0, vy: 0, spawnX: x, spawnY: y, lifetime,
    visualOnly: true, sheet: a.sheet, spriteFrames: a.frames, spriteW: a.w, spriteH: a.h, spriteSpeed: a.speed,
    spriteScale: scale, ...extra }, {})
}

function fireSpecial(f, ctx, api) {
  const s = hbState(f); if (!s) return false
  const dir = f._specialHeldDir || null, face = f.facing || 1
  if (!(f.onGround || f.grounded)) return castBlazeFlight(f, s, api, face)          // in air: Blaze Flight
  if (dir === "F") return castFireRocket(f, s, api, face)                            // →→ + P
  if (dir === "D") return castSupernova(f, s, api, face)                             // ←↙↓ + P
  return castFireball(f, s, api, face)                                               // ↓↘→ + P
}

function castFireball(f, s, api, face) {
  if (api.activeProjectiles().some(p => p.owner === f && p.name === "heatblast_fire" && !p.visualOnly)) return false   // one on screen
  if (!beginCast(f, s, api, "hbFireball", HB_COST.fireball, 30)) return false
  const cast = s.castId, tier = heatTier(s), big = tier !== "warm", blue = tier === "blue"
  addHeat(f, HB_HEAT.FIREBALL)                      // Fireball cast +10 (may tip into Blue Flame)
  f._benSfx = "hb_fireball"
  const shot = (dmg, scale) => {
    const fx = HEATBLAST_FX[blue ? "fireballBlue" : "fireball"]
    api.spawnProjectile(f, "heatblast_fire", { damage: dmg, speed: 10, vx: face * 10, vy: 0,
      spawnX: f.x + f.w / 2 + face * 40, spawnY: f.y + f.h * 0.42, w: big ? 44 : 30, h: big ? 30 : 20, radius: big ? 22 : 15,
      lifetime: 56, isSpecial: true, hitstun: 18, blockstun: 14, knockbackX: 5, knockbackY: -2,
      sheet: fx.sheet, spriteFrames: fx.frames, spriteW: fx.w, spriteH: fx.h, spriteSpeed: fx.speed, spriteScale: scale,
      fire: true, hbScorch: cast, hbBlue: blue, piercesMulti: blue || undefined }, {})
  }
  // 560 px travel (10 px/f × 56f). Hot / Blue: a larger 2-hit fireball (30 + 30); Blue also pierces.
  api.scheduleBenSpawn(f, 10, () => shot(big ? 30 : 45, big ? 3 : 2))
  if (big) api.scheduleBenSpawn(f, 14, () => shot(30, 3))
  return true
}

function castFireRocket(f, s, api, face) {
  if (s.burnout > 0) return false
  if (!beginCast(f, s, api, "hbRocket", HB_COST.rocket, 55)) return false
  const cast = s.castId; s.rocketCast = -1
  f._benSfx = "hb_rocket"
  // real travel: 340 px over 17 sim frames after an 8f startup, stage-clamped by physics, no tracking.
  api.scheduleBenSpawn(f, 8, () => { f._benLunge = { frames: 17, speed: face * 20 } })
  ;[[12, 18], [18, 18], [25, 34]].forEach(([t, dmg], i) => api.scheduleBenSpawn(f, t, () => {
    api.spawnProjectile(f, "hb_rocket_" + i, { damage: dmg, speed: 0, vx: 0, vy: 0,
      spawnX: f.x + f.w / 2 + face * 40, spawnY: f.y + f.h / 2, w: 110, h: 80, radius: 55, lifetime: 2,
      isSpecial: true, noHitstop: i < 2, hitstun: i < 2 ? 14 : 24, blockstun: 16,
      knockbackX: i < 2 ? 1 : 9, knockbackY: i < 2 ? 0 : -4,
      fire: true, hbRocket: cast, hbScorch: i === 2 ? cast : undefined, hbBlue: s.blue > 0 }, {})
  }))
  return true
}

function castSupernova(f, s, api, face) {
  if (s.burnout > 0 || s.heat < HB_HEAT.SUPERNOVA_MIN) return false       // rejected below 25 Heat / in Burnout
  if (!beginCast(f, s, api, "hbSupernova", HB_COST.supernova, 52)) return false
  const spent = s.heat
  if (s.blue > 0) enterBurnout(s); else { s.heat = 0; s.idle = 0 }      // spends ALL Heat
  s.lastSupernovaSpent = spent
  const dmg = Math.min(130, Math.round(40 + 0.9 * spent))
  f._benSfx = "hb_supernova"
  api.scheduleBenSpawn(f, 22, () => {
    const x = f.x + f.w / 2, y = f.y + f.h / 2
    api.spawnProjectile(f, "hb_supernova", { damage: dmg, speed: 0, vx: 0, vy: 0, spawnX: x, spawnY: y,
      radius: 180, radial: true, lifetime: 2, isSpecial: true, hitstun: 26, blockstun: 14,
      knockbackX: 10, knockbackY: -7, fire: true, hbSupernova: true, hbBlue: false }, {})
    spawnFx(f, api, "fireball", x, y, 20, 6)
  })
  return true
}

function castBlazeFlight(f, s, api, face) {
  if (s.flightUsed) return false                                           // once per airtime
  if (!beginCast(f, s, api, "hbFlight", HB_COST.flight, HB_FLIGHT.FRAMES + HB_FLIGHT.DIVE_MAX, { commit: false })) return false
  s.flightUsed = true
  const apex = Math.min(s.apexY ?? f.y, f.y)
  s.flight = { t: 0, face, capY: apex - HB_FLIGHT.CAP_ABOVE_APEX, cast: s.castId }
  f._benSfx = "hb_flight"
  return true
}

// Heat Absorb (block + Heavy): no cost, 6 s cooldown, 8f window. Replaces Ben's Energy Guard while Heatblast.
function blockHeavy(f) {
  const s = hbState(f)
  if (!s || s.absorbCd > 0 || (f.hitstun || 0) > 0 || s.flight || s.dive || s.ult) return false
  s.absorbWin = HB_ABSORB.WINDOW; s.absorbCd = HB_ABSORB.COOLDOWN
  f._spriteCastMove = "hbAbsorb"; f._spriteCastTimer = 14
  return true
}
// Called by combat before a hit resolves. Absorbs ONE projectile or fire-tagged melee hit (0 dmg, +25 Heat).
// A Blue-Flame attacker's flames ignore it ("flames ignore Heat Absorb from opponents").
function absorb(f, { proj = null, move = null, attacker = null } = {}) {
  const s = hbState(f); if (!s || s.absorbWin <= 0) return false
  if (proj ? proj.hbBlue : (hbState(attacker)?.blue > 0)) return false
  if (!proj && !(move && (move.fire || move.element === "fire")) && !hbState(attacker)) return false   // non-fire melee passes through (a Heatblast swing is fire)
  s.absorbWin = 0; s.lastAbsorbed = proj ? "projectile" : "fire"
  s.heat = Math.min(s.heat, HB_HEAT.MAX); addHeat(f, HB_HEAT.ABSORB)
  f.colorFlash = Math.max(f.colorFlash || 0, 10)
  return true
}

// Called by combat after a contact this fighter OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false, dealDamage = null, comboScale = null } = {}) {
  const s = hbState(f); if (!s) return
  if (!proj) {                                                             // every Heatblast normal is fire: +4 (half on block)
    addHeat(f, blocked ? HB_HEAT.NORMAL / 2 : HB_HEAT.NORMAL)
    return
  }
  if (proj.visualOnly) return
  if (proj.hbRocket != null && s.rocketCast !== proj.hbRocket) {          // Fire Rocket: +12 once per cast (half on block)
    s.rocketCast = proj.hbRocket; addHeat(f, blocked ? HB_HEAT.ROCKET / 2 : HB_HEAT.ROCKET)
  }
  if (blocked) return
  if (proj.hbDive && s.dive) s.dive.hit = true
  if (proj.hbScorch != null) addScorchPip(f, s, proj.hbScorch)
  const sc = s.scorch
  if (proj.hbSupernova && sc.burnT > 0 && !sc.flashUsed && dealDamage) {  // FLASHPOINT: end the burn, +25 once
    sc.flashUsed = true; sc.burnT = 0; sc.burnTick = 0; sc.immune = HB_SCORCH.IMMUNE; sc.flashpoints++
    dealDamage(target, HB_SCORCH.FLASHPOINT * (comboScale ? comboScale(f) : 1), { attacker: f, move: "flashpoint", source: "projectile" })
  }
  if (proj.hbUltOpener && s.ult && s.ult.phase === "opener" && target && !target.eliminated) startUltCinematic(f, s, target)
}

// ── ultimate: PYRONITE METEOR (same input as Omnitrix Overload, alien form only) ─────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = hbState(f); if (!s) return false
  if (!beginCast(f, s, api, "hbFire", HB_COST.ultimate, 12 + HB_ULT.WHIFF_RECOVERY)) return false
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId }
  f._benSfx = "hb_ult"
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, 12, () => {
    api.spawnProjectile(f, "hb_ult_opener", { damage: HB_ULT.OPENER, speed: 0, vx: 0, vy: 0,
      spawnX: f.x + f.w / 2 + face * 70, spawnY: f.y + f.h * 0.45, w: 150, h: 100, radius: 70, lifetime: 3,
      isSpecial: true, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0,
      fire: true, hbUltOpener: true, hbBlue: s.blue > 0 }, {})
  })
  // whiff / block: the opener window closes with no capture → plain 60f recovery (cleared in tickUlt)
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "rise"; u.t = 0; u.raw = HB_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = HB_ULT.END + HB_ULT.LOCKOUT; f._benPowerCommit = HB_ULT.END
  f._spriteCastTimer = HB_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, HB_ULT.END + 2)
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > 24) s.ult = null; return }   // whiffed / blocked → no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  // capture: the target is held where it was hit for the whole cinematic (hitstun refresh, no drift)
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null
  if (u.t <= HB_ULT.RISE) {                                               // 1. rocket up
    f._benGlide = { vx: 0, vy: -10, minY: -2000 }; f._spriteCastMove = "hbUltRise"
  } else if (u.t <= HB_ULT.SUN_END) {                                     // 2. mini-sun, 3 fireballs rain down
    f._benGlide = { vx: 0, vy: 0, minY: -2000 }; f._spriteCastMove = "hbUltSun"; u.phase = "sun"
    if (HB_ULT.RAIN_AT.includes(u.t)) {
      const tx = opp.x + opp.w / 2, ty = opp.y + opp.h / 2, sx = f.x + f.w / 2, sy = f.y + f.h / 2
      const k = HB_ULT.RAIN_AT.indexOf(u.t)
      spawnFx(f, api, "fireball", sx, sy, 14, 3, { vx: (tx - sx) / 14, vy: (ty - sy) / 14 })
      api.applyScaledDamage(opp, HB_ULT.RAIN, { attacker: f, move: "pyronite_meteor", source: "ability" }); u.raw += HB_ULT.RAIN
      opp.colorFlash = 8; api.shake?.(5 + k, 6)
    }
  } else if (u.t < HB_ULT.IMPACT_AT) {                                    // 3. meteor dive onto the captured target
    u.phase = "dive"; f._spriteCastMove = "hbUltDive"
    const left = HB_ULT.IMPACT_AT - u.t
    const tx = opp.x + opp.w / 2 - f.w / 2 - u.face * 30, ty = opp.y - f.h * 0.4
    f._benGlide = { vx: (tx - f.x) / left, vy: (ty - f.y) / left, minY: -2000 }
  } else if (u.t === HB_ULT.IMPACT_AT) {
    api.applyScaledDamage(opp, HB_ULT.IMPACT, { attacker: f, move: "pyronite_meteor", source: "ability" }); u.raw += HB_ULT.IMPACT
    spawnFx(f, api, "fireball", opp.x + opp.w / 2, opp.y + opp.h / 2, 24, 7)
    api.shake?.(12, 14)
  } else endUlt(f, s, opp)
}
function endUlt(f, s, opp) {
  const u = s.ult
  delete f._benGlide
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }   // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = u.face * 12; opp.vy = -9 }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  if (s.blue > 0) enterBurnout(s); else { s.heat = 0; s.idle = 0 }       // Heat → 0 afterward
  f.attackCooldown = HB_ULT.LOCKOUT; f._benPowerCommit = HB_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
// Heat gauge under the Omnitrix Power bar while Heatblast is active + the opponent's Scorch pips / Ignite.
export function drawHeatblastHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = hbState(f); if (!ctx || !s) return
  const tier = heatTier(s), y = enY + enH + 3, h = 5
  const col = s.burnout > 0 ? "#6b7280" : tier === "blue" ? "#38bdf8" : tier === "hot" ? "#fb923c" : "#facc15"
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const ratio = s.burnout > 0 ? s.burnout / HB_HEAT.BURNOUT_FRAMES : tier === "blue" ? s.blue / HB_HEAT.BLUE_FRAMES : s.heat / HB_HEAT.MAX
  const w = pbw * Math.max(0, Math.min(1, ratio))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const hot = flip ? x + 8 + pbw - pbw * 0.5 : x + 8 + pbw * 0.5           // the Hot threshold notch
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(hot - 0.5, y - 1, 1, h + 2)
  const label = s.burnout > 0 ? "BURNOUT" : tier === "blue" ? "BLUE FLAME" : `HEAT ${Math.round(s.heat)}${tier === "hot" ? " · HOT" : ""}`
  const sc = s.scorch, pips = sc.burnT > 0 ? "IGNITE" : "●".repeat(sc.pips) + "○".repeat(HB_SCORCH.MAX - sc.pips)
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(`${label}   SCORCH ${pips}`, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
// Pyronite Meteor mini-sun: procedural pixel rings at the apex; Ignite: embers over the burning target.
export function drawHeatblastFx(c, f, frame = 0) {
  const s = hbState(f); if (!c || !s) return
  const x = f._lastDrawX, y = f._lastDrawY, w = f._lastDrawW, h = f._lastDrawH
  if (x == null || w == null) return
  c.save(); c.imageSmoothingEnabled = false
  if (s.ult && s.ult.phase === "sun") {
    const cx = Math.round(x + w / 2), cy = Math.round(y + h * 0.45), blue = s.blue > 0
    for (let i = 0; i < 3; i++) {
      const r = 40 + ((frame * 3 + i * 26) % 80), a = 1 - (r - 40) / 80
      c.globalAlpha = Math.max(0, a) * 0.85; c.fillStyle = blue ? "#38bdf8" : (i % 2 ? "#facc15" : "#fb923c")
      for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; c.fillRect(Math.round(cx + Math.cos(t) * r) - 2, Math.round(cy + Math.sin(t) * r) - 2, 4, 4) }
    }
  }
  c.restore()
}
