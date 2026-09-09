// harness/ai_templates.test.mjs
// Part 2 — per-character CPU AI templates: distinct tuning, full-roster mapping spread, and REAL
// behavioral divergence (two controllers with different templates, same difficulty + same seeded RNG,
// make visibly different decisions at the same game state).
// Pure Node: ai.js imports only rng.js + aiTemplates.js, so this runs headless without a browser.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++ } else { fail++; console.log("  ✗", m) } }

const T = await import("../aiTemplates.js")
const AI = await import("../ai.js")
const { gameRng } = await import("../rng.js")

// ── parse the real roster's archetype data from characters.js source (no browser-coupled import) ──
const src = fs.readFileSync(path.join(ROOT, "characters.js"), "utf8")
const lines = src.split("\n")
const roster = []
let cur = null
for (const ln of lines) {
  const k = ln.match(/rosterKey:\s*["']([a-z0-9_]+)["']/)
  if (k) { cur = { key: k[1], archetypes: [], primary: "" }; roster.push(cur); continue }
  if (!cur) continue
  const a = ln.match(/archetypes:\s*\[([^\]]*)\]/)
  if (a && cur.archetypes.length === 0) cur.archetypes = a[1].split(",").map(s => s.replace(/["']/g, "").trim()).filter(Boolean)
  const p = ln.match(/primary:\s*["']([a-z_]+)["']/)
  if (p && !cur.primary) cur.primary = p[1]
}
const charactersMap = Object.fromEntries(roster.map(c => [c.key, { archetypes: c.archetypes, primary: c.primary, rosterKey: c.key }]))

// ── 1. six distinct templates, each a real parameter set ──
ok(T.TEMPLATE_KEYS.length === 6, `6 templates defined (got ${T.TEMPLATE_KEYS.length})`)
for (const k of T.TEMPLATE_KEYS) {
  ok(!!T.AI_TEMPLATES[k].mult && typeof T.AI_TEMPLATES[k].range === "number", `${k} has real tuning (mult + range)`)
}

// ── 2. applyTemplateToProfile never mutates the shared base profile ──
const base = AI.AI_DIFFICULTIES.adaptive
const baseRangeBefore = base.desiredRange, baseAtkBefore = base.attackChance
const pRush = T.applyTemplateToProfile(base, "rushdown")
const pZone = T.applyTemplateToProfile(base, "zoner")
ok(base.desiredRange === baseRangeBefore && base.attackChance === baseAtkBefore, "base difficulty profile is not mutated")
ok(pRush !== base && pZone !== base, "returns a fresh cloned profile")

// ── 3. templates produce materially different decision parameters ──
ok(pRush.desiredRange < pZone.desiredRange, `rushdown wants closer range than zoner (${pRush.desiredRange} < ${pZone.desiredRange})`)
ok(pRush.attackChance > pZone.attackChance, "rushdown attacks more than zoner")
ok(pZone.zoningChance > pRush.zoningChance, "zoner zones more than rushdown")
const pTurtle = T.applyTemplateToProfile(base, "turtle")
ok(pTurtle.blockChance > pRush.blockChance, "turtle blocks more than rushdown")
const pTrick = T.applyTemplateToProfile(base, "trickster")
ok(pTrick._suboptimalChance > 0, "trickster carries a suboptimal-feint chance")
const pBruise = T.applyTemplateToProfile(base, "bruiser")
ok(pBruise._neverRetreat === true, "bruiser never retreats")
// all probability fields stay in [0,1]
for (const f of ["attackChance", "blockChance", "zoningChance", "specialChance", "whiffPunish"]) {
  for (const p of [pRush, pZone, pTurtle, pTrick, pBruise]) ok(p[f] >= 0 && p[f] <= 1, `${f} clamped in [0,1]`)
}

// ── 4. personality overrides land on the intended template ──
const expectOverride = { netero: "counter", toji: "counter", jason: "bruiser", hisoka: "trickster",
  saitama: "bruiser", gojo: "zoner", pain: "zoner", l_ryuuzaki: "turtle", flash: "rushdown" }
for (const [k, want] of Object.entries(expectOverride)) {
  ok(T.templateForCharacter(k, charactersMap[k]) === want, `${k} → ${want}`)
}

// ── 5. full-roster mapping covers all 6 templates (real variety, not everyone the same) ──
const mapping = T.fullMapping(charactersMap)
const counts = {}
for (const k of T.TEMPLATE_KEYS) counts[k] = 0
for (const v of Object.values(mapping)) counts[v] = (counts[v] || 0) + 1
ok(Object.keys(mapping).length === roster.length, `mapped all ${roster.length} characters`)
for (const k of T.TEMPLATE_KEYS) ok(counts[k] > 0, `template "${k}" used by at least one character (${counts[k]})`)
console.log("  mapping spread:", JSON.stringify(counts))

// ── 6. BEHAVIORAL divergence: same difficulty + same seeded RNG, different template → different decisions ──
// Build two CPU controllers (rushdown vs zoner), both "adaptive", place them against an idle-but-active
// opponent at a fixed FAR distance, and run many decision windows. Rushdown should press forward
// (movement-toward inputs) far more often than zoner, which prefers to hold its ground.
function mkFighter(x, key) {
  return { rosterKey: key, currentForm: "base", x, width: 60, y: 400, height: 90, grounded: true,
           energy: 0, maxEnergy: 100, health: 1000, maxHealth: 1000, facing: 1, vx: 0, specials: {}, ultimate: null }
}
function runController(templateKey, frames) {
  gameRng.reseed(1234)                         // identical RNG stream for a fair comparison
  const c = AI.createAIController("adaptive")
  AI.setAIDifficulty(c, "adaptive")
  c.templateKey = templateKey
  c.profile = T.applyTemplateToProfile(AI.AI_DIFFICULTIES.adaptive, templateKey)
  c.profile.adaptStrength = 0                  // hold pattern-adaptation constant to isolate the TEMPLATE variable
  const self = mkFighter(200, "goku")
  // opponent sits ~210px to the right — inside rushdown's "close the gap" band but at zoner's preferred
  // spacing, so the templates DIVERGE here. Flagged "attacking" (not busy) so the anti-passivity floor
  // never forces a universal approach that would mask the difference; still out of block range at 210px.
  const opp = mkFighter(410, "vegeta"); opp.attacking = true
  let moveToward = 0, plans = {}
  for (let f = 0; f < frames; f++) {
    const input = AI.updateAIController(c, self, opp, {})
    // opponent is to the RIGHT → moving toward = pressing right
    if (input.right) moveToward++
    plans[c.currentPlan] = (plans[c.currentPlan] || 0) + 1
  }
  return { moveToward, plans }
}
const rush = runController("rushdown", 600)
const zone = runController("zoner", 600)
ok(rush.moveToward > zone.moveToward, `rushdown presses forward more than zoner (${rush.moveToward} > ${zone.moveToward})`)
ok(rush.moveToward > 0, "rushdown actually advances")
ok(JSON.stringify(rush.plans) !== JSON.stringify(zone.plans), "the two templates yield different plan distributions")
console.log("  rushdown plans:", JSON.stringify(rush.plans))
console.log("  zoner    plans:", JSON.stringify(zone.plans))

// bruiser vs turtle at CLOSE range: bruiser keeps attacking, turtle guards/retreats more.
function runClose(templateKey, frames) {
  gameRng.reseed(99)
  const c = AI.createAIController("adaptive")
  c.templateKey = templateKey
  c.profile = T.applyTemplateToProfile(AI.AI_DIFFICULTIES.adaptive, templateKey)
  const self = mkFighter(300, "goku")
  const opp = mkFighter(370, "vegeta"); opp.attacking = true   // close + attacking → block/attack decision
  let blocks = 0, attacks = 0
  for (let f = 0; f < frames; f++) {
    const input = AI.updateAIController(c, self, opp, {})
    if (input.block) blocks++
    if (input.lightAttack || input.heavyAttack) attacks++
  }
  return { blocks, attacks }
}
const bruise = runClose("bruiser", 600)
const turtle = runClose("turtle", 600)
ok(turtle.blocks > bruise.blocks, `turtle guards more than bruiser under pressure (${turtle.blocks} > ${bruise.blocks})`)
console.log("  bruiser {blocks,attacks}:", JSON.stringify(bruise), " turtle:", JSON.stringify(turtle))

console.log(`\nai_templates: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
