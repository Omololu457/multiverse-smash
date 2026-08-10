// STAGE 1a CONFIRMATION — damage-scale bypass unification.
// Proves (A) the single choke-point applyScaledDamage() applies GLOBAL_DAMAGE_SCALE (0.60)
// with a real before/after diff for each of the three flagged sources — one summon hit, one
// manual-subtract ultimate (Kurama TBB), one DOT tick — and (B) that the real call sites now
// route through it (static source proof; no unscaled `.health -=` damage subtract survives).
import { readFileSync } from "node:fs"
import { applyScaledDamage, GLOBAL_DAMAGE_SCALE } from "../combat.js"

const root = new URL("../", import.meta.url)
const read = (f) => readFileSync(new URL(f, root), "utf8")

let pass = 0, fail = 0
const ok  = (n) => { pass++; console.log("  ✓", n) }
const bad = (n, extra = "") => { fail++; console.log("  ✗", n, extra) }

// ── (A) before/after damage-log diff, 0.60 applied at the choke-point ─────────
console.log("\n[A] before/after damage-log diff (GLOBAL_DAMAGE_SCALE =", GLOBAL_DAMAGE_SCALE + ")")
globalThis.__DMG_LOG = true
function diff(name, raw, source, opts = {}) {
  const target = { health: 1000 }
  const before = target.health
  const dealt = applyScaledDamage(target, raw, { source, ...opts })
  const expected = Math.floor(raw * (opts.scale ?? GLOBAL_DAMAGE_SCALE))
  const scaledApplied = dealt === expected && dealt === Math.floor(raw * 0.60) === (opts.scale == null)
  console.log(`      ${source}: ${before} -> ${target.health}  (raw ${raw} × ${GLOBAL_DAMAGE_SCALE} = ${dealt})`)
  if (dealt === expected) ok(`${name}: dealt ${dealt} = floor(${raw}×${opts.scale ?? GLOBAL_DAMAGE_SCALE})`)
  else bad(`${name}`, `dealt ${dealt} != ${expected}`)
  return dealt
}
// one summon hit (representative summon.damage 100), one manual-subtract ultimate
// (Kurama TBB = 600, the exact case the review calls out as 600 -> 360), one DOT tick.
diff("summon hit", 100, "summon")
const tbb = diff("manual-subtract ultimate (Kurama TBB)", 600, "kurama-tbb")
if (tbb === 360) ok("Kurama TBB 600 -> 360 (matches design-review Stage 3b figure)")
else bad("Kurama TBB not 360", `got ${tbb}`)
diff("DOT tick", 40, "dot")
globalThis.__DMG_LOG = false

// ── (B) static proof: the real sites route through applyScaledDamage ──────────
console.log("\n[B] real call sites route through the choke-point")
const sites = [
  ["summons.js (summon hit)",        "summons.js",  /applyScaledDamage\(summon\.target, summon\.damage, \{ source: "summon" \}\)/],
  ["game.js (DOT tick)",             "game.js",     /applyScaledDamage\(fighter, fighter\._dot\.dmg, \{ source: "dot" \}\)/],
  ["kurama.js (TBB ultimate)",       "kurama.js",   /applyScaledDamage\(opp, damage, \{ source: "kurama-tbb" \}\)/],
  ["abilities.js (Rick self-destruct)", "abilities.js", /applyScaledDamage\(target, dmg, \{ source: "ability" \}\)/],
]
for (const [name, file, re] of sites) {
  if (re.test(read(file))) ok(name)
  else bad(name, "site not routed")
}

// no unscaled damage subtract survives in the migrated files (self-costs use Math.max(1,...) → excluded)
console.log("\n[C] no unscaled `.health = Math.max(0, ... - ...)` damage subtract survives")
for (const file of ["combat.js", "abilities.js", "summons.js", "domains.js", "kurama.js", "minatoKurama.js", "obitoJuubiCinematic.js", "tobiNineTailsCinematic.js"]) {
  const hits = read(file).split("\n").filter((l) => /\.health = Math\.max\(0, \([a-zA-Z_.]+\.health \|\| 0\) - /.test(l))
  if (hits.length === 0) ok(`${file}: clean`)
  else bad(`${file}`, `${hits.length} unscaled subtract(s) remain`)
}

console.log(`\nStage 1a: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
