// ══════════════════════════════════════════════════════════════════════════════════════════════════
// SHISUI (TRINITY) — MK1-Ghostface 3-identity fighter. ADDITIVE, combat.js UNTOUCHED.
// Three identities are three character defs (shisui_trinity=LOYALIST default / shisui_blade / shisui_puppeteer).
// Variant Swap (P4) swaps rosterKey+kit via a shisui-namespaced COPY of the omololu/ghostface field-swap.
// PHASE 1 = THE LOYALIST full kit + the SHARED Shunshin Backstab. Deterministic / LAN-safe (no gameRng).
// ══════════════════════════════════════════════════════════════════════════════════════════════════
const SHISUI_KEYS = new Set(["shisui_trinity", "shisui_blade", "shisui_puppeteer"])
function shisuiIsShisui(f) { return !!f && SHISUI_KEYS.has(String(f.rosterKey || "").toLowerCase()) }
function shisuiBusy(f) { return (f.attackCooldown || 0) > 0 || f.attacking || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 }
// behind-the-opponent world-x (clamped to stage), mirrors game.js teleportBehindTarget / kakashi_anbu Read.
function shisuiBehindX(fighter, opp, context, gap) {
  const sw = context?.worldWidth || 3200
  const behind = (fighter.x < opp.x) ? (opp.x + (opp.w || 60) + (gap || 6)) : (opp.x - (fighter.w || 60) - (gap || 6))
  return Math.max(0, Math.min(sw - (fighter.w || 60), behind))
}

// ── SHARED: SHUNSHIN BACKSTAB (Fwd+Special on ALL three identities; MK1 "Backstage Pass") ─────────────
// Flicker out, reappear BEHIND the foe, slash. Uses each identity's own streak + a slash hit. CANON-ADJACENT.
const SHISUI_BACKSTAB = { cost: 18, dmg: 70, stun: 22, cast: 16 }
function fireShisuiBackstab(fighter, context) {
  if (shisuiBusy(fighter)) return false
  const opp = getTargetResolver(context)(fighter) || null
  if (!opp) return false
  if (!spendEnergy(fighter, SHISUI_BACKSTAB.cost)) return false
  const B = SHISUI_BACKSTAB
  fighter.teleportFlash = 14; fighter.vx = 0
  fighter.x = shisuiBehindX(fighter, opp, context, 8); fighter.y = opp.y
  fighter.facing = (opp.x >= fighter.x) ? 1 : -1
  fighter._spriteCastMove = "shiBackstab"; fighter._spriteCastTimer = B.cast
  fighter.attackCooldown = getAttackDuration(B.cast + 6, fighter)
  schedulePendingSpawn(6, () => {
    const o = getTargetResolver(context)(fighter) || opp
    if (!o || o.eliminated || (o.invulnTimer || 0) > 0) return
    const dir = (o.x >= fighter.x ? 1 : -1)
    if (o.isBlocking) { o.blockstun = 16; applyScaledDamage(o, Math.floor(B.dmg * 0.25), { source: "shisui-backstab" }); return }
    o.hitstun = Math.max(o.hitstun || 0, B.stun); o.vx = dir * 5; o.vy = -3; o.colorFlash = 10
    applyScaledDamage(o, B.dmg, { source: "shisui-backstab" })
  })
  try { shakeCamera(context, 4, 8) } catch (_) {}
  return true
}

// ══ THE LOYALIST (shisui_trinity) — command-grab specialist. Special dispatch on _specialHeldDir. ══════
function executeShisuiTrinitySpecial(fighter, context) {
  if (shisuiBusy(fighter)) return false
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireShisuiBackstab(fighter, context)       // Fwd  = SHARED Shunshin Backstab
  if (dir === "B") return fireLoyalistGenjutsuGrab(fighter, context) // Back = Genjutsu Grab (command grab)
  if (dir === "D") return fireLoyalistKunaiRain(fighter, context)    // Down = Kunai Rain
  if (dir === "U") return fireLoyalistFlurry(fighter, context)       // Up   = Body-Flicker Flurry
  return fireLoyalistFireball(fighter, context)                      // neutral = Fireball Jutsu
}

// Neutral+Special — KATON: GOUKAKYUU-style Fireball (projectile). CANON (Uchiha Katon). cast 3f + 5f fire.
const LOY_FIREBALL = { cost: 24, dmg: 92, cast: 14 }
function fireLoyalistFireball(fighter, context) {
  const F = LOY_FIREBALL
  if (!spendEnergy(fighter, F.cost)) return false
  fighter.vx = 0
  fighter._spriteCastMove = "shiFireball"; fighter._spriteCastTimer = F.cast
  fighter.attackCooldown = getAttackDuration(F.cast + 6, fighter)
  schedulePendingSpawn(F.cast - 2, () => {
    spawnProjectile(fighter, "shisuiFireball", {
      damage: F.dmg, speed: 9, w: 46, h: 46, radius: 24, hitstun: 20, knockbackX: 7, knockbackY: -2, lifetime: 95,
      color: "#ff8a3d", sheet: "./shisui_trinity_fireball_fx_uniform.png", spriteFrames: 5, spriteSpeed: 4, spriteScale: 1.5,
      impact: { sheet: "./shisui_trinity_fireball_fx_uniform.png", frames: 5, w: 46, h: 46, speed: 4, scale: 1.2, lifetime: 18 }
    }, context)
  })
  return true
}

// Back+Special — GENJUTSU GRAB: a close-range command grab. In range → the foe is caught in the white-flash
// genjutsu circles and STAGGERED (a true stun). Whiffs if out of range. ORIGINAL (grab framing).
const LOY_GRAB = { cost: 22, range: 120, stun: 64, dmg: 52, cast: 18 }
function fireLoyalistGenjutsuGrab(fighter, context) {
  const G = LOY_GRAB
  const opp = getTargetResolver(context)(fighter) || null
  const cx = (f) => (f.x + (f.w || 60) / 2)
  const inRange = opp && Math.abs(cx(opp) - cx(fighter)) <= G.range
  if (!spendEnergy(fighter, G.cost)) return false
  fighter.vx = 0
  fighter.facing = opp ? ((cx(opp) >= cx(fighter)) ? 1 : -1) : (fighter.facing || 1)
  fighter._spriteCastMove = "shiGenjutsu"; fighter._spriteCastTimer = G.cast
  fighter.attackCooldown = getAttackDuration(G.cast + 8, fighter)
  if (inRange && !opp.eliminated && (opp.invulnTimer || 0) <= 0) {
    opp.hitstun = Math.max(opp.hitstun || 0, G.stun); opp.vx = 0; opp.vy = 0
    opp.attacking = false; opp.currentMove = null
    opp._shisuiGenjutsuFx = G.stun          // white-flash genjutsu ring timer (drawn on the foe)
    applyScaledDamage(opp, G.dmg, { source: "shisui-genjutsu-grab" })
    try { shakeCamera(context, 3, 6) } catch (_) {}
  }
  return true
}

// Down+Special — KUNAI RAIN (Finisher 2): a volley of kunai rains down in front of the foe. CANON-ADJACENT.
const LOY_KUNAI = { cost: 26, dmg: 22, count: 5, cast: 16 }
function fireLoyalistKunaiRain(fighter, context) {
  const K = LOY_KUNAI
  if (!spendEnergy(fighter, K.cost)) return false
  const opp = getTargetResolver(context)(fighter) || null
  fighter.vx = 0
  fighter._spriteCastMove = "shiKunaiRain"; fighter._spriteCastTimer = K.cast
  fighter.attackCooldown = getAttackDuration(K.cast + 8, fighter)
  const baseTX = opp ? (opp.x + (opp.w || 60) / 2) : (fighter.x + (fighter.facing || 1) * 220)
  for (let i = 0; i < K.count; i++) {
    schedulePendingSpawn(K.cast - 4 + i * 5, () => {
      const tx = baseTX + (i - (K.count - 1) / 2) * 34
      spawnProjectile(fighter, "shisuiKunai", {
        damage: K.dmg, spawnX: tx, spawnY: fighter.y - 220, vx: 0, vy: 12, w: 14, h: 30, radius: 10,
        hitstun: 14, knockbackX: 2, knockbackY: 2, lifetime: 60, color: "#cfd3d6",
        sheet: "./shisui_trinity_kunairain_fx_uniform.png", spriteFrames: 1, spriteScale: 1.2
      }, context)
    })
  }
  return true
}

// Up+Special — BODY-FLICKER FLURRY (Finisher 1): a shunshin flurry that closes in with a multi-hit slash
// string, leaving afterimages. CANON-ADJACENT.
const LOY_FLURRY = { cost: 30, hits: [14, 14, 16, 22], cast: 26 }
function fireLoyalistFlurry(fighter, context) {
  const FL = LOY_FLURRY
  if (!spendEnergy(fighter, FL.cost)) return false
  const opp0 = getTargetResolver(context)(fighter) || null
  fighter.vx = 0
  fighter._spriteCastMove = "shiFlurry"; fighter._spriteCastTimer = FL.cast
  fighter.attackCooldown = getAttackDuration(FL.cast + 6, fighter)
  fighter._shisuiFlurryFx = FL.cast         // afterimage/slash FX timer (drawn around the fighter)
  if (opp0) { fighter.x = shisuiBehindX(fighter, opp0, context, 40); fighter.facing = (opp0.x >= fighter.x) ? 1 : -1; fighter.teleportFlash = 12 }
  FL.hits.forEach((d, i) => schedulePendingSpawn(6 + i * 6, () => {
    const o = getTargetResolver(context)(fighter) || opp0
    if (!o || o.eliminated || (o.invulnTimer || 0) > 0) return
    const dir = (o.x >= fighter.x ? 1 : -1)
    const last = (i === FL.hits.length - 1)
    if (o.isBlocking) { o.blockstun = 12; applyScaledDamage(o, Math.floor(d * 0.25), { source: "shisui-flurry" }); return }
    o.hitstun = Math.max(o.hitstun || 0, last ? 24 : 12); o.vx = dir * (last ? 6 : 1); o.vy = last ? -7 : 0; o.colorFlash = 8
    applyScaledDamage(o, d, { source: "shisui-flurry" })
  }))
  try { shakeCamera(context, 3, 8) } catch (_) {}
  return true
}

// ══ THE LOYALIST — ULTIMATE: SUSANOO TSUKUMO ═════════════════════════════════════════════════════════
// A spectral green Susanoo ribcage erupts around Shisui, the chest magatama-eye spins, and a volley of
// green chakra needles fires at the foe (range-independent sure-hit beats, half on block). CANON.
// Refuses during KO / Brutality / Domain / Rick-Prime-rewind (fighter._shiCinematicsBlocked, set in game.js).
const LOY_SUSANOO = { len: 150, cast: 20 }
function executeShisuiTrinityUltimate(fighter, context) {
  if (fighter._shiCinematicsBlocked) return false
  if (!spendEnergy(fighter, fighter.ultimate?.cost ?? 100)) return false
  const opp0 = getTargetResolver(context)(fighter) || null
  fighter.vx = 0
  fighter._shisuiSusanooFx = LOY_SUSANOO.len     // ribcage + magatama render timer (drawShisuiFx)
  fighter._spriteCastMove = "shiSusanoo"; fighter._spriteCastTimer = LOY_SUSANOO.len
  fighter.attackCooldown = getAttackDuration(LOY_SUSANOO.len, fighter)
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 60)
  // green needle volley — sure-hit beats, half on block
  const beats = [
    { at: 30, dmg: 18 }, { at: 42, dmg: 18 }, { at: 54, dmg: 18 }, { at: 66, dmg: 18 },
    { at: 86, dmg: 40, big: true }, { at: 110, dmg: 70, big: true }
  ]
  beats.forEach(b => schedulePendingSpawn(b.at, () => {
    const o = getTargetResolver(context)(fighter) || opp0
    if (!o || o.eliminated || (o.invulnTimer || 0) > 0) return
    // a visible green needle streaks to the foe each beat
    spawnProjectile(fighter, "shisuiNeedle", {
      visualOnly: true, damage: 0, spawnY: fighter.y + 30, speed: 18, w: 30, h: 8, radius: 6, lifetime: 20,
      color: "#6ef08a", drawKind: null, aimAt: { x: o.x + (o.w || 60) / 2, y: o.y + 30 }, noHitstop: true
    }, context)
    const dir = (o.x >= fighter.x ? 1 : -1)
    if (o.isBlocking) { o.blockstun = b.big ? 22 : 12; applyScaledDamage(o, Math.floor(b.dmg * 0.5), { source: "shisui-susanoo" }); return }
    o.hitstun = b.big ? 36 : 18; o.vx = dir * (b.big ? 6 : 1); o.vy = b.big ? -7 : 0; o.colorFlash = b.big ? 14 : 9
    if (b.big) o.hitstop = Math.max(o.hitstop || 0, 24)
    applyScaledDamage(o, b.dmg, { source: "shisui-susanoo" })
  }))
  try { focusCameraOnAction(context, fighter, opp0, 1.1, 18); shakeCamera(context, 4, 12) } catch (_) {}
  return true
}
