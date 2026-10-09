// sasukeDojutsu.js
// ─────────────────────────────────────────────────────────────────────────────
// SHARED Mangekyou/Rinnegan SPACE-TIME logic for EVERY Sasuke fighter (sasuke / sasuke_adult /
// sasuke_sensei). LOGIC ONLY — parameterized by the per-fighter binding table SASUKE_DOJUTSU_BIND.
// No fighter's existing code is rewritten: abilities.js/game.js add thin DISPATCH HOOKS that call in here.
//
// DETERMINISTIC + LAN-SAFE: no Math.random / no gameRng / no wall-clock. Position changes mirror the
// existing teleport sim path (immediate x/y set + clamp to world bounds + teleportFlash), copied from
// Aoi Todo Boogie-Woogie (swap) / Minato Flying-Raijin (marker) / teleportBehindTarget (land-behind) —
// those are NOT edited. Projectile redirect reuses combat.js's EXISTING `_portalActive` reflect (no edit).
//
// Engine deps are INJECTED once (initSasukeDojutsu) so this module imports nothing → no circular imports.
// ─────────────────────────────────────────────────────────────────────────────

let API = null
// deps: { spendEnergy, spawnProjectile, schedulePendingSpawn, activeProjectiles, applyScaledDamage }
export function initSasukeDojutsu(deps) { API = deps }

// Per-fighter binding: cast/thrust/throw pose keys (for _spriteCastMove visuals), the Amaterasu projectile
// NAME to steer/extinguish (M1), and the marker projectile name (R1). Values use each fighter's OWN frames.
export const SASUKE_DOJUTSU_BIND = {
  sasuke_sensei: { castPose: "ssShinraTensei", thrustPose: "ssChidori", throwPose: "ssRaikoKenka", amaterasuProj: "ssAmaterasu", marker: "sasSenseiMarker", rinneganGated: true },
  sasuke_adult:  { castPose: "shinraTensei",   thrustPose: "chidori",   throwPose: "throw",         amaterasuProj: "amaterasu",  marker: "sasAdultMarker",  rinneganGated: false },
  sasuke:        { castPose: "chidoriKoiten",  thrustPose: "chidoriKoiten", throwPose: "shurikenThrow", amaterasuProj: null,     marker: "sasMarker",       rinneganGated: false },
}
export function dojutsuBindOf(fighter) {
  const k = (fighter && (fighter.rosterKey || fighter.id) || "").toLowerCase()
  return SASUKE_DOJUTSU_BIND[k] || null
}

// ── TUNABLES (special-tier roster bands) ────────────────────────────────────
export const DOJ = {
  R1_COST: 22, R1_MARKER_LIFE: 90, R1_SWAP_IFRAMES: 8,   // Kunai Swap: marker ~1.5s @60fps, short i-frame swap
  R2_COST: 34, R2_STARTUP: 18, R2_DMG: 60, R2_RECOVERY: 22,  // Portal Chidori: slow startup, blockable, punishable
  R3_COST: 30, R3_CD: 150, R3_IFRAMES: 10,               // Counter Swap: 2.5s cooldown
  R5_COST: 28, R5_CD: 210, R5_WINDOW: 40,                // Portal Redirect: 3.5s cooldown, 40f absorb window
  STRAIN_PER_MOVE: 34, STRAIN_CAP: 100, STRAIN_LOCK: 150, STRAIN_DECAY: 1, STRAIN_GRACE: 90,   // R4: ~3 moves in quick succession → lock ~2.5s; decays 1/frame after a 1.5s idle grace
  SWAP_RANGE: 78,                                        // marker-near-opponent → swap WITH opponent
}

// ── SAFETY GATE — refuse swaps/portals during cinematics / freezes / KO / intangibility (per the spec) ──
// Per-fighter flags are checked here; the caller (game.js/abilities.js hook) additionally refuses during the
// global Brutality / Impact Hit / Rick-Prime rewind cinematics (those pause the normal input path anyway).
export function dojutsuActionSafe(fighter, opp, opts = {}) {
  if (!fighter || fighter.eliminated || (fighter.health || 0) <= 0) return false
  if ((fighter.hitstop || 0) > 0 || (fighter.hitstun || 0) > 0) return false
  if (!opts.allowBlockstun && (fighter.blockstun || 0) > 0) return false
  if (fighter._impactFlash) return false                                   // Impact Hit cinematic
  if (fighter.domainFrozen || fighter.domainUntouchable) return false      // trapped in a Domain
  if (fighter._kamuiDimActive || fighter._timeSlowFlag || fighter._pauseTimeActive) return false
  if (opp) {
    if ((opp.invulnTimer || 0) > 0 && opts.needsOpp) return false          // opponent intangible
    if (opp.domainFrozen || opp.domainUntouchable || opp._kamuiDimActive || opp._pauseTimeActive) return false
    if (opp.eliminated && opts.needsOpp) return false
  }
  return true
}

// ── SHARED POSITION HELPERS (copied patterns; immediate + clamped, like the existing teleports) ──
function worldW(context) { return (context && context.worldWidth) || 3200 }
function clampX(fighter, x, context) { return Math.max(0, Math.min(worldW(context) - (fighter.w || 60), x)) }
function faceToward(f, other) { if (other) f.facing = (other.x >= f.x) ? 1 : -1 }
function markSwapFx(f, kind) { f.teleportFlash = Math.max(f.teleportFlash || 0, 14); f._dojFx = { kind, t: 20, max: 20 } }

// Move a fighter to an absolute point (clamped), reset velocity, brief i-frames + flash (Flying-Raijin style).
function warpTo(fighter, x, y, context, iframes) {
  fighter.x = clampX(fighter, x - (fighter.w || 60) / 2, context)
  if (y != null) fighter.y = y
  fighter.vx = 0; fighter.vy = 0
  if (iframes) fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, iframes)
  markSwapFx(fighter, "warp")
}
// Exchange positions with the opponent + cross facings (Boogie-Woogie pattern).
function swapWithOpp(fighter, opp, context, iframes) {
  const fx = fighter.x, fy = fighter.y
  fighter.x = clampX(fighter, opp.x, context); fighter.y = opp.y
  opp.x = clampX(opp, fx, context); opp.y = fy
  fighter.vx = fighter.vy = opp.vx = opp.vy = 0
  faceToward(fighter, opp); opp.facing = -fighter.facing
  if (iframes) fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, iframes)
  markSwapFx(fighter, "swap"); markSwapFx(opp, "swap")
}

// ═══════════════════════════ R4 — RINNEGAN STRAIN (passive limiter) ═══════════════════════════
export function addRinneganStrain(fighter) {
  fighter._rinStrain = (fighter._rinStrain || 0) + DOJ.STRAIN_PER_MOVE
  fighter._rinStrainGrace = DOJ.STRAIN_GRACE     // strain only decays after a short idle window (so back-to-back moves pile up)
  if (fighter._rinStrain >= DOJ.STRAIN_CAP && (fighter._rinLock || 0) <= 0) {
    fighter._rinLock = DOJ.STRAIN_LOCK          // over the limit → tomoe vanish, Rinnegan locked briefly
    fighter._rinStrain = DOJ.STRAIN_CAP
    fighter._rinLockToast = 90                   // HUD text flash ("RINNEGAN STRAINED")
  }
}
export function rinneganLocked(fighter) { return (fighter._rinLock || 0) > 0 }
export function tickRinneganStrain(fighter) {    // called per-frame from game.js
  if ((fighter._rinLock || 0) > 0) { fighter._rinLock--; if (fighter._rinLock <= 0) fighter._rinStrain = 0; return }
  if ((fighter._rinStrainGrace || 0) > 0) { fighter._rinStrainGrace--; return }   // grace: no decay right after a move
  if ((fighter._rinStrain || 0) > 0) fighter._rinStrain = Math.max(0, fighter._rinStrain - DOJ.STRAIN_DECAY)
}

// ═══════════════════════════ R1 — AMENOTEJIKARA: KUNAI SWAP (CANON) ═══════════════════════════
// Tap: throw a marker kunai (his throw frames). Re-press (or auto on marker expire): swap to the marker —
// or, if the marker is on top of the opponent, swap WITH the opponent and the sides flip. Short i-frame swap.
export function amenotejikaraKunaiSwap(fighter, context, bind) {
  const opp = context && context.getOpponent && context.getOpponent(fighter)
  // Re-press while a marker is live → execute the swap now.
  if (fighter._dojMarkerArmed) return resolveKunaiSwap(fighter, context, opp)
  if (rinneganLocked(fighter)) return false
  if (!dojutsuActionSafe(fighter, opp)) return false
  if (!API.spendEnergy(fighter, DOJ.R1_COST)) return false
  fighter.attackCooldown = 12   // brief lock so a HELD Charge+Special auto-swaps ~0.2s later (also blocks per-frame multi-fire)
  fighter._spriteCastMove = bind.throwPose; fighter._spriteCastTimer = 16
  const face = fighter.facing || 1
  const proj = API.spawnProjectile(fighter, bind.marker, {
    damage: 0, speed: 16, lifetime: DOJ.R1_MARKER_LIFE, hitstun: 0, knockbackX: 0, knockbackY: 0,
    w: 22, h: 10, radius: 11, color: "#b48cff", isSpecial: true, visualOnly: true,
    vx: face * 16, spawnY: fighter.y + (fighter.h || 100) * 0.4,
  }, context)
  fighter._dojMarkerArmed = true
  if (proj) { fighter._dojMarker = proj; proj.onExpire = () => { if (fighter._dojMarkerArmed) resolveKunaiSwap(fighter, context, (context.getOpponent && context.getOpponent(fighter)) || opp) } }
  addRinneganStrain(fighter)
  return true
}
function resolveKunaiSwap(fighter, context, opp) {
  const m = fighter._dojMarker
  fighter._dojMarkerArmed = false
  const mx = m ? m.x : fighter.x, my = m ? m.y : fighter.y
  // consume the marker projectile
  if (m && API.activeProjectiles) { const i = API.activeProjectiles.indexOf(m); if (i >= 0) API.activeProjectiles.splice(i, 1) }
  fighter._dojMarker = null
  if (!dojutsuActionSafe(fighter, opp)) return false
  // marker sitting on the opponent → swap WITH the opponent (sides flip); else teleport to the marker.
  if (opp && Math.abs((m ? mx : fighter.x) - (opp.x + (opp.w || 60) / 2)) < DOJ.SWAP_RANGE && Math.abs(my - opp.y) < 120) {
    swapWithOpp(fighter, opp, context, DOJ.R1_SWAP_IFRAMES)
  } else {
    warpTo(fighter, mx, my, context, DOJ.R1_SWAP_IFRAMES); faceToward(fighter, opp)
  }
  fighter.attackCooldown = Math.max(fighter.attackCooldown || 0, 12)   // block the held Charge+Special from immediately re-throwing
  return true
}

// ═══════════════════════════ R2 — PORTAL CHIDORI (CANON combo) ═══════════════════════════
// A portal opens by Sasuke and another beside the opponent; the Chidori thrust exits the 2nd portal.
// Slow startup, blockable, punishable on block (Sasuke commits to the recovery).
export function portalChidori(fighter, context, bind) {
  const opp = context && context.getOpponent && context.getOpponent(fighter)
  if (rinneganLocked(fighter)) return false
  if (!dojutsuActionSafe(fighter, opp, { needsOpp: true }) || !opp) return false
  if (!API.spendEnergy(fighter, DOJ.R2_COST)) return false
  fighter.attackCooldown = DOJ.R2_STARTUP + DOJ.R2_RECOVERY
  fighter.attacking = true
  fighter._spriteCastMove = bind.thrustPose; fighter._spriteCastTimer = DOJ.R2_STARTUP + 6
  // FX: an entry portal at Sasuke, an exit portal beside the opponent.
  const side = (opp.x >= fighter.x) ? 1 : -1
  fighter._dojPortals = { t: DOJ.R2_STARTUP + 12, max: DOJ.R2_STARTUP + 12,
    a: { x: fighter.x + (fighter.w || 60) / 2, y: fighter.y + (fighter.h || 100) * 0.45 },
    b: { x: opp.x + (opp.w || 60) / 2 - side * 54, y: opp.y + (opp.h || 100) * 0.45 } }
  addRinneganStrain(fighter)
  API.schedulePendingSpawn(DOJ.R2_STARTUP, () => {
    const o = (context.getOpponent && context.getOpponent(fighter)) || opp
    if (!o || o.eliminated || (o.invulnTimer || 0) > 0) return
    if (o.isBlocking) { o.blockstun = 22; API.applyScaledDamage(o, Math.floor(DOJ.R2_DMG * 0.25), { source: "ability" }); return }
    o.hitstun = 26; o.vx = side * 10; o.vy = -8; o.colorFlash = 14
    API.applyScaledDamage(o, DOJ.R2_DMG, { source: "ability" })
  })
  return true
}

// ═══════════════════════════ R3 — COUNTER SWAP (CANON-ADJACENT) ═══════════════════════════
// While guarding, swap with the attacker and land BEHIND them with brief invulnerability + a short opening.
export function counterSwap(fighter, context, bind) {
  const opp = context && context.getOpponent && context.getOpponent(fighter)
  if (rinneganLocked(fighter)) return false
  if ((fighter._dojCounterCd || 0) > 0) return false
  if (!dojutsuActionSafe(fighter, opp, { allowBlockstun: true, needsOpp: true }) || !opp) return false
  if (!API.spendEnergy(fighter, DOJ.R3_COST)) return false
  // land behind the opponent (teleportBehindTarget pattern)
  const behind = (fighter.x < opp.x) ? (opp.x + (opp.w || 60) + 8) : (opp.x - (fighter.w || 60) - 8)
  warpTo(fighter, behind + (fighter.w || 60) / 2, opp.y, context, DOJ.R3_IFRAMES)
  faceToward(fighter, opp)
  fighter.blockstun = 0; fighter.hitstun = 0
  fighter.attackCooldown = 8                       // short opening to counter
  fighter._dojCounterCd = DOJ.R3_CD
  fighter._spriteCastMove = bind.castPose; fighter._spriteCastTimer = 12
  addRinneganStrain(fighter)
  return true
}

// ═══════════════════════════ R5 — PORTAL REDIRECT (ORIGINAL) ═══════════════════════════
// Open a portal that absorbs ONE incoming projectile and returns it from a portal behind the opponent.
// Reuses combat.js's EXISTING `_portalActive` reflect (reverses velocity + reassigns owner) — no combat.js edit.
export function portalRedirect(fighter, context, bind) {
  const opp = context && context.getOpponent && context.getOpponent(fighter)
  if (rinneganLocked(fighter)) return false
  if ((fighter._dojRedirectCd || 0) > 0) return false
  if (!dojutsuActionSafe(fighter, opp)) return false
  if (!API.spendEnergy(fighter, DOJ.R5_COST)) return false
  fighter.attackCooldown = 16
  fighter._portalActive = DOJ.R5_WINDOW            // combat.js reflects the next projectile during this window
  fighter._dojRedirectCd = DOJ.R5_CD
  fighter._spriteCastMove = bind.castPose; fighter._spriteCastTimer = 16
  const face = fighter.facing || 1
  fighter._dojPortals = { t: DOJ.R5_WINDOW, max: DOJ.R5_WINDOW, redirect: true,
    a: { x: fighter.x + (fighter.w || 60) / 2 + face * 40, y: fighter.y + (fighter.h || 100) * 0.45 },
    b: opp ? { x: opp.x + (opp.w || 60) / 2 - face * 50, y: opp.y + (opp.h || 100) * 0.45 } : null }
  addRinneganStrain(fighter)
  return true
}

// ═══════════════════════════ M1 — KAGUTSUCHI FLAME CONTROL (CANON) ═══════════════════════════
// While THIS fighter's Amaterasu flame is live: hold Up/Down to steer it a limited amount. Called per-frame.
const KAGU_STEER = 0.45, KAGU_VY_CAP = 7
export function steerKagutsuchi(fighter, context, heldDir) {
  const bind = dojutsuBindOf(fighter); if (!bind || !bind.amaterasuProj || !API.activeProjectiles) return
  if (heldDir !== "U" && heldDir !== "D") return
  for (const p of API.activeProjectiles) {
    if (p.owner === fighter && p.name === bind.amaterasuProj) {
      p.vy = Math.max(-KAGU_VY_CAP, Math.min(KAGU_VY_CAP, (p.vy || 0) + (heldDir === "U" ? -KAGU_STEER : KAGU_STEER)))
    }
  }
}
// Re-pressing the Amaterasu input while a flame is live → EXTINGUISH it (+ small refund). Returns true if it did.
export function extinguishKagutsuchi(fighter, context) {
  const bind = dojutsuBindOf(fighter); if (!bind || !bind.amaterasuProj || !API.activeProjectiles) return false
  let extinguished = false
  for (let i = API.activeProjectiles.length - 1; i >= 0; i--) {
    const p = API.activeProjectiles[i]
    if (p.owner === fighter && p.name === bind.amaterasuProj) { API.activeProjectiles.splice(i, 1); extinguished = true }
  }
  if (extinguished) {
    fighter.energy = Math.min(fighter.maxEnergy || 200, (fighter.energy || 0) + 12)   // small refund
    fighter._dojFx = { kind: "snuff", t: 14, max: 14 }
  }
  return extinguished
}
export function hasActiveKagutsuchi(fighter) {
  const bind = dojutsuBindOf(fighter); if (!bind || !bind.amaterasuProj || !API.activeProjectiles) return false
  return API.activeProjectiles.some(p => p.owner === fighter && p.name === bind.amaterasuProj)
}

// ── per-frame tick for all Sasuke dojutsu timers (strain, cooldowns, FX) — called from game.js ──
export function tickSasukeDojutsu(fighter) {
  if (!dojutsuBindOf(fighter)) return
  tickRinneganStrain(fighter)
  if ((fighter._dojCounterCd || 0) > 0) fighter._dojCounterCd--
  if ((fighter._dojRedirectCd || 0) > 0) fighter._dojRedirectCd--
  if ((fighter._rinLockToast || 0) > 0) fighter._rinLockToast--
  if (fighter._dojFx && (fighter._dojFx.t = (fighter._dojFx.t || 0) - 1) <= 0) fighter._dojFx = null
  if (fighter._dojPortals && (fighter._dojPortals.t = (fighter._dojPortals.t || 0) - 1) <= 0) fighter._dojPortals = null
  // marker expiry safety (if the projectile was cleared without firing onExpire)
  if (fighter._dojMarkerArmed && fighter._dojMarker && API.activeProjectiles && !API.activeProjectiles.includes(fighter._dojMarker)) {
    fighter._dojMarkerArmed = false; fighter._dojMarker = null
  }
}
