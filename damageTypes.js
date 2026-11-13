// damageTypes.js — roster-wide DAMAGE TYPE tags ("slash" · "blunt" · "projectile" · "energy" · "grab").
// Added for Buggy the Clown's Bara Bara no Mi (slash immunity) but generic: any mechanic can ask "what kind of hit
// is this?". The tags are PURE METADATA — they never change damage, startup, active, recovery, hitstun or range,
// so every other character's frame data is byte-identical (harness/buggy_framedata_diff.mjs proves it).
//
// Resolution order (first hit wins):
//   1. an explicit `damageType` on the live attack / projectile / damage call (e.g. Buggy's own moves)
//   2. the generated roster table in damageTags.js (tools/buggy_build/damage_audit.mjs → docs/buggy/DAMAGE_TAGS.md)
//   3. keyword rules on the move / projectile name (same rules the audit uses)
//   4. default: "blunt" for melee + damage calls, "projectile" for projectiles.
// "Haki-tagged" attacks (`haki: true`, or Zoro once his Conqueror's Haki has fired) are flagged separately so
// slash immunity can ignore them — the type stays "slash".
import { DAMAGE_TAGS, PROJECTILE_TAGS } from './damageTags.js'

export const DAMAGE_TYPES = ['slash', 'blunt', 'projectile', 'energy', 'grab']

// startMove keys for the shared normals → the roster table's `n` (normals) type.
const NORMAL_KEYS = new Set(['light', 'heavy', 'up', 'air', 'down_air', 'air_heavy', 'crouchLight', 'lowAttack'])

// Keyword rules. ENERGY is checked first: a ki / electric / light "slash" is an energy wave, not a blade.
const KI_RX = /(^ki|Ki)([A-Z_\s]|$)/   // case-sensitive: kiBlast · superKiSlash · "Ki Ball" (never "kick" / "skill")
const ENERGY_RX = /beam|blast|kame|galick|finalFlash|laser|rasen|orb\b|orb[A-Z]|bomb|fire|flame|katon|lightning|thunder(?!clap)|chidori|raikiri|kirin|electric|volt|bolt|getsuga|wave|burst|purple|^blue$|^red$|hakai|spirit|mana|aura|energy|repulsor|proton|nova|vision|heat|breath|plasma|nuclear|explos|meteor|bijuu|tbb|shinra|push|pull|incinerat|cannon(?!ball)|missile|rocket|holy|divine|portal|cosmic/i
const SLASH_RX = /slash|sword|blade|katana|saber|sabre|(?<!e)cut(?!e|-?in\b)|cleave|dismantle|kunai|shuriken|knife|knives|dagger|machete|scythe|sickle|claw|talon|card|needle|spear|lance|naginata|iaido|zangetsu|senbonzakura|petal|stab|gutting|lowGut|lunge|thrust|carve|slice|guillotine|decap/i
const GRAB_RX = /^grab$|Grab$|^throw$|takeARide|commandGrab/

// Keyword type of a move / projectile name, or null when nothing matches.
export function keywordType(name) {
  const s = String(name || '')
  if (!s) return null
  if (GRAB_RX.test(s)) return 'grab'
  if (KI_RX.test(s) || ENERGY_RX.test(s)) return 'energy'
  if (SLASH_RX.test(s)) return 'slash'
  return null
}

const keyOf = f => String(f?.rosterKey || '').toLowerCase()

// Type of a LIVE melee attack (fighter.currentAttack) thrown by `attacker`.
export function meleeDamageType(attacker, atk) {
  if (!atk) return 'blunt'
  if (atk.damageType) return atk.damageType
  const t = DAMAGE_TAGS[keyOf(attacker)]
  const nm = atk.name
  if (t) {
    if (t.m && t.m[nm]) return t.m[nm]
    if (NORMAL_KEYS.has(nm)) return t.n || 'blunt'
  }
  return keywordType(nm) || (t?.n === 'slash' && !NORMAL_KEYS.has(nm) ? 'slash' : 'blunt')
}

// Type of a projectile (combat.resolveProjectileHitsMulti).
export function projectileDamageType(proj) {
  if (!proj) return 'projectile'
  if (proj.damageType) return proj.damageType
  const nm = String(proj.name || proj.type || '')
  if (PROJECTILE_TAGS[nm]) return PROJECTILE_TAGS[nm]
  const t = DAMAGE_TAGS[keyOf(proj.owner)]
  if (t?.m?.[nm]) return t.m[nm]
  return keywordType(nm) || 'projectile'
}

// Type of a direct damage call (applyScaledDamage opts: { attacker, move, source, damageType }).
export function sourceDamageType(opts = {}) {
  if (opts.damageType) return opts.damageType
  const t = DAMAGE_TAGS[keyOf(opts.attacker)]
  const mv = opts.move
  if (t && mv) {
    if (t.m && t.m[mv]) return t.m[mv]
    if (NORMAL_KEYS.has(mv)) return t.n || 'blunt'
  }
  return keywordType(mv) || keywordType(opts.source) || 'blunt'
}

// Haki: an attack imbued with Haki ignores Logia / Paramecia intangibility (here: Buggy's slash immunity).
//   · any attack / projectile / call flagged `haki: true`
//   · Roronoa Zoro once his Conqueror's Haki passive has fired this round (fighter._zoro.hakiUsed)
export function isHakiImbued(attacker, carrier = null) {
  if (carrier && carrier.haki) return true
  return keyOf(attacker) === 'zoro' && !!attacker?._zoro?.hakiUsed
}
