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
  onApply, tick, onContact
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
  tickScorch(f, s, opp, api)
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
  if (proj.hbScorch != null) addScorchPip(f, s, proj.hbScorch)
  const sc = s.scorch
  if (proj.hbSupernova && sc.burnT > 0 && !sc.flashUsed && dealDamage) {  // FLASHPOINT: end the burn, +25 once
    sc.flashUsed = true; sc.burnT = 0; sc.burnTick = 0; sc.immune = HB_SCORCH.IMMUNE; sc.flashpoints++
    dealDamage(target, HB_SCORCH.FLASHPOINT * (comboScale ? comboScale(f) : 1), { attacker: f, move: "flashpoint", source: "projectile" })
  }
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
