// Stage 1a — route every direct `.health = Math.max(0, (X.health||0) - EXPR)` subtract in
// abilities.js through the shared applyScaledDamage() choke-point so GLOBAL_DAMAGE_SCALE is
// applied uniformly. Self-costs use Math.max(1,...) and are left untouched. The one already-
// scaled site (Math.round(EXPR * GLOBAL_DAMAGE_SCALE)) is de-scaled so the choke-point applies
// 0.60 exactly once (no double-scale). Run: node tools/migrate_damage_scale.mjs
import { readFileSync, writeFileSync } from "node:fs"

const FILE = new URL("../abilities.js", import.meta.url)
const src = readFileSync(FILE, "utf8")
const lines = src.split("\n")

// X.health = Math.max(0, (X.health || 0) - EXPR)   [optional trailing // comment]
const re = /^(\s*)([A-Za-z_]+)\.health = Math\.max\(0, \(\2\.health \|\| 0\) - (.+?)\)(\s*\/\/.*)?$/
let n = 0
const out = lines.map((line) => {
  const m = line.match(re)
  if (!m) return line
  const [, indent, varName, rawExpr, comment = ""] = m
  // De-scale the single already-scaled site so we don't double-apply.
  const expr = rawExpr.replace(/Math\.round\((\w+) \* GLOBAL_DAMAGE_SCALE\)/, "$1")
  n++
  return `${indent}applyScaledDamage(${varName}, ${expr}, { source: "ability" })${comment}`
})

// PASS 2 — the cinematic hit-spark VFX objects display (and stat-record) `damage: dmg`, which
// was the pre-scale value. Now that the HP subtract is scaled by applyScaledDamage, the shown
// number must match the dealt amount → floor(dmg * GLOBAL_DAMAGE_SCALE). Discriminator: hit-spark
// objects are `damage: dmg, lines:` — move/projectile defs (damage: dmg, startup:/speed:/hitstun:)
// are left raw (the attack/projectile system scales those at resolution). Idempotent.
let n2 = 0
const out2 = out.map((line) => {
  if (/damage: dmg, lines:/.test(line) && !/GLOBAL_DAMAGE_SCALE/.test(line)) {
    n2++
    return line.replace("damage: dmg, lines:", "damage: Math.floor(dmg * GLOBAL_DAMAGE_SCALE), lines:")
  }
  return line
})

writeFileSync(FILE, out2.join("\n"))
console.log(`Rewrote ${n} subtract sites + ${n2} hit-spark display values in abilities.js`)
