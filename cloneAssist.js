// cloneAssist.js — MK1-Kameo-style CLONE-ASSIST engine (redesign). Shared + parameterized by character; NOT
// character-specific code. Term is "clone" (several of these are Wood/Crow clones, not Kage Bunshin).
//
// A clone SPAWNS and STANDS STILL — summons.js gates movement-mirroring OFF for CLONE_ASSIST_KEYS, so the clone
// holds its spawn position as a decoy/assist resource. A dedicated assist key (game.js) then drives three
// on-demand actions, each on its OWN cooldown (a managed resource, not a spam button):
//   • Assist + Neutral  = SUMMON-type strike : the player briefly freezes (commitment) while a clone lunges in
//                          and strikes with a launcher — a combo-extender.
//   • Assist + Forward  = AMBUSH-type rush   : a clone rushes in from where it stood, IMMEDIATELY and regardless
//                          of what the player is doing — usable mid-combo (a fire-and-forget punish tool).
//   • Assist + Back     = SWAP (default)     : substitution — the player trades places with a live clone. Per-
//                          character reflavors (Minato Flying Thunder God, Hashirama wall, …) plug in via config.
//
// SUMMON/AMBUSH each CONSUME one standing clone (lossy, like the legacy system). Config-driven so Stages 2-6
// add a character by adding one CLONE_ASSIST_CONFIG entry — the core never changes.

import {
  consumeShadowClones, countShadowClones, swapConsciousnessWithClone,
  spawnCloneRusher, spawnClonePuff, fortifyClones, usesCloneAssist
} from "./summons.js"

// Per-action cooldowns (frames @60fps) — deliberately a few seconds each, not instant-spam.
export const CLONE_ASSIST_CD = { summon: 180, ambush: 150, swap: 120 }   // 3.0s / 2.5s / 2.0s

// PER-CHARACTER CONFIG. `back` picks the Assist+Back behavior. Damage numbers are RAW (×0.60-scaled at the
// summon damage choke-point). Stages 2-6 add entries; absence of an entry = that char has no assist yet.
//   back: "swap"  → substitution (Naruto, Kakashi)
//   back: "ftg"   → Minato Flying Thunder God swap (Stage 2)
//   back: "wall"  → Hashirama wood-clone tanks a hit + stays up (Stage 4)
export const CLONE_ASSIST_CONFIG = {
  naruto:   { back: "swap",    strikeDmg: 46, ambushDmg: 40 },
  minato:    { back: "ftg",     strikeDmg: 44, ambushDmg: 40 },   // Assist+Back = Flying Thunder God warp to the clone's mark
  tobirama:  { back: "special", strikeDmg: 42, ambushDmg: 38 },   // Assist+Back = the clone casts an existing special (Water Wall)
  hashirama: { back: "wall",    strikeDmg: 48, ambushDmg: 42 },   // Assist+Back = wood clones tank a hit + stay up (no swap — canon)
  itachi:    { back: "swap",    strikeDmg: 44, ambushDmg: 38 },   // Crow Clone — cheaper chakra + blind-on-dispersal (summons.js); back = feint substitution
  kakashi:   { back: "swap",    strikeDmg: 44, ambushDmg: 40 }    // generic — Naruto's exact strike / ambush / swap shape, no unique flavor
}

// PER-CHARACTER "assist special" registry — for back-actions that reuse a character's EXISTING special (whose
// spawn logic lives in abilities.js). abilities.js calls registerCloneAssistSpecial(charKey, fn); fn(fighter,
// spot, opponent, context) casts that special AT the consumed clone's spot. Same decoupling as summons.js's
// setCloneSpecialAttack (no abilities→? import cycle: abilities imports cloneAssist, cloneAssist imports summons).
const _assistSpecials = {}
export function registerCloneAssistSpecial(charKey, fn) {
  _assistSpecials[String(charKey).toLowerCase()] = (typeof fn === "function") ? fn : null
}

function ckey(f) { return String(f?.rosterKey || f?.id || "").toLowerCase() }

// Same 6-char opt-in set summons.js uses for the stand-still gate — but a char only ACTS on the assist key once
// it also has a CLONE_ASSIST_CONFIG entry (so an un-wired stage is inert, never a half-built action).
export function isCloneAssistCapable(f) { return usesCloneAssist(f) && !!CLONE_ASSIST_CONFIG[ckey(f)] }

function cds(f) { return f._assistCd || (f._assistCd = { summon: 0, ambush: 0, swap: 0 }) }
export function tickCloneAssistCooldowns(f) {
  const cd = f && f._assistCd; if (!cd) return
  if (cd.summon > 0) cd.summon--
  if (cd.ambush > 0) cd.ambush--
  if (cd.swap   > 0) cd.swap--
}
export function getCloneAssistCooldowns(f) {
  return (f && f._assistCd) ? { ...f._assistCd } : { summon: 0, ambush: 0, swap: 0 }
}

// Fire an assist action. dir ∈ "neutral" | "forward" | "back". Returns the action name fired, or null (no
// config / on cooldown / no clone available). game.js owns the camera/sound flourish off the return value.
export function triggerCloneAssist(fighter, dir, opponent, opts = {}) {
  const cfg = CLONE_ASSIST_CONFIG[ckey(fighter)]
  if (!fighter || !cfg) return null
  const cd = cds(fighter)
  const facing = fighter.facing || 1

  if (dir === "back") return doBackAction(fighter, cfg, opponent, cd, opts)

  // SUMMON strike / AMBUSH rush both consume ONE standing clone.
  if (countShadowClones(fighter) < 1) return null

  if (dir === "forward") {
    if (cd.ambush > 0) return null
    const spots = consumeShadowClones(fighter, 1)
    if (!spots.length) return null
    const spot = spots[0]
    // AMBUSH: the clone rushes in from where it stood — immediate, no player freeze (usable mid-combo).
    spawnCloneRusher(fighter, opponent, { at: { x: spot.x, y: spot.y }, damage: cfg.ambushDmg || 40, speed: 9 })
    cd.ambush = CLONE_ASSIST_CD.ambush
    opts.onAction?.("ambush")
    return "ambush"
  }

  // NEUTRAL → SUMMON strike.
  if (cd.summon > 0) return null
  const spots = consumeShadowClones(fighter, 1)
  if (!spots.length) return null
  // The clone appears just in front of the opponent and strikes on the spot (launcher = combo extender). The
  // player briefly freezes (hitstop) to sell the summon commitment / "hold".
  const at = opponent ? { x: opponent.x - facing * 70, y: opponent.y } : { x: spots[0].x, y: spots[0].y }
  spawnCloneRusher(fighter, opponent, { at, damage: cfg.strikeDmg || 46, speed: 6, launch: 6 })
  fighter.hitstop = Math.max(fighter.hitstop || 0, 12)   // brief self-freeze — the SUMMON "hold"
  cd.summon = CLONE_ASSIST_CD.summon
  opts.onAction?.("summon")
  return "summon"
}

// Assist+Back — SWAP by default; Stages 2/4 override per character via cfg.back.
function doBackAction(fighter, cfg, opponent, cd, opts) {
  const mode = cfg.back || "swap"
  if (mode === "swap") {
    if (cd.swap > 0) return null
    const clone = swapConsciousnessWithClone(fighter, opponent)
    if (!clone) return null
    fighter.hitstun = 0; fighter.blockstun = 0                        // ESCAPE — break out of a combo on the swap
    fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 10)      // brief arrival i-frames
    cd.swap = CLONE_ASSIST_CD.swap
    opts.onAction?.("swap")
    return "swap"
  }
  // FLYING THUNDER GOD (Minato) — the clone is a Hiraishin MARK: Minato instantly WARPS to it, SPENDING the
  // clone (unlike swap, which keeps the clone as a decoy). Reuses his teleport flash. Distinct feel: swap =
  // reposition + keep the decoy; FTG = consume a mark to blink in. (Consumes an arbitrary live clone-mark.)
  if (mode === "ftg") {
    if (cd.swap > 0) return null
    if (countShadowClones(fighter) < 1) return null
    const spots = consumeShadowClones(fighter, 1)                     // spend the FTG mark clone
    if (!spots.length) return null
    const spot = spots[0]
    fighter.x = spot.x; fighter.y = spot.y; fighter.vx = 0; fighter.vy = 0
    if (opponent) fighter.facing = (opponent.x >= fighter.x) ? 1 : -1
    fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 16)  // Minato's yellow Hiraishin flash
    fighter.hitstun = 0; fighter.blockstun = 0                        // ESCAPE
    fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 12)      // arrival i-frames
    spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)   // warp-in puff at the mark
    cd.swap = CLONE_ASSIST_CD.swap
    opts.onAction?.("ftg")
    return "ftg"
  }
  // MASTERY CAST (Tobirama) — the clone casts one of the character's OWN existing specials (Water Wall) at its
  // standing mark, spending the clone. Reuses that special's real projectile/art via the abilities.js registry.
  if (mode === "special") {
    if (cd.swap > 0) return null
    if (countShadowClones(fighter) < 1) return null
    const fn = _assistSpecials[ckey(fighter)]
    if (!fn) return null
    const spots = consumeShadowClones(fighter, 1)
    if (!spots.length) return null
    const ok = fn(fighter, spots[0], opponent, opts.context)
    if (ok === false) return null
    cd.swap = CLONE_ASSIST_CD.swap
    opts.onAction?.("special")
    return "special"
  }
  // WOOD-CLONE WALL (Hashirama) — canon wood clones don't dispel on damage, so Assist+Back is NOT a swap: it
  // FORTIFIES the standing clones so each tanks one incoming hit and stays up (a defensive hold). Keeps the
  // clones (no consume) — the resource is the cooldown + the one-hit-per-clone armor.
  if (mode === "wall") {
    if (cd.swap > 0) return null
    const n = fortifyClones(fighter)
    if (!n) return null
    cd.swap = CLONE_ASSIST_CD.swap
    opts.onAction?.("wall")
    return "wall"
  }
  return null
}
