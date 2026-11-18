// BEN 10 VO RULES: the pool data and the deterministic dispatch (no browser).   node harness/ben10_vo.test.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as V from "../ben10VoiceMap.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let passed = 0, failed = 0
const test = (n, fn) => { try { fn(); passed++; console.log("PASS", n) } catch (e) { failed++; console.error("FAIL", n, "\n  ", e.message) } }
const A = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/ben10/AUDIO_ANALYSIS.json"), "utf8"))
const all = Object.values(A).flat()
const GENERIC = new Set(["ATTACK_EFFORT", "SFX", "TAUNT"])

test("no random source in the VO modules", () => {
  for (const f of ["ben10VoiceMap.js", "ben10VoicePools.js"]) assert(!/Math\.random|gameRng/.test(fs.readFileSync(path.join(ROOT, f), "utf8")), f)
})
test("same (seed, frame, player) → same clip; the player index and the frame both change the pick", () => {
  const f = { rosterKey: "ben10", side: "p1", _benVariant: "classic" }, g = { ...f, side: "p2" }
  for (let fr = 0; fr < 200; fr++) assert.deepEqual(V.pickBen10Vo("attack", f, 42, fr), V.pickBen10Vo("attack", f, 42, fr))
  const a = new Set(), b = []
  for (let fr = 0; fr < 200; fr++) { a.add(V.pickBen10Vo("attack", f, 42, fr).clip); b.push(V.pickBen10Vo("attack", f, 42, fr).clip !== V.pickBen10Vo("attack", g, 42, fr).clip) }
  assert(a.size > 5, "frames vary the pick"); assert(b.some(Boolean), "the player index varies the pick")
})
test("every wired clip exists on disk; > 8 s and near-silent clips are never wired", () => {
  for (const [o, P] of Object.entries(V.BEN10_VO)) for (const c of Object.values(P).flat()) if (c.startsWith("./")) assert(fs.existsSync(path.join(ROOT, c)), c)
  const wired = new Set(Object.values(V.BEN10_VO).flatMap(P => Object.values(P).flat()))
  for (const r of all) if (r.duration > 8 || r.skipped) assert(!wired.has(r.path), r.path)
})
test("UNVERIFIED-era clips only in ATTACK_EFFORT / SFX / TAUNT; shape-assigned INTRO/WIN/LOSE are flagged", () => {
  for (const r of all) {
    if (!r.verified_era && r.pool) assert(GENERIC.has(r.pool), `${r.file} → ${r.pool}`)
    if (["INTRO", "WIN", "LOSE"].includes(r.pool)) assert(r.flags.some(x => /wording unverified/.test(x)), r.file)
    if (!r.verified_era) assert(r.flags.some(x => /UNVERIFIED/.test(x)), r.file)
  }
})
test("READY keys only: legacy twins have no pools; Kevin 11 unwired; Prime silent", () => {
  for (const k of ["diamondhead", "feedback", "upgrade", "wildmutt"]) assert(!V.BEN10_VO[k], k)
  for (const k of ["diamondhead_ov", "feedback_ov", "upgrade_ov"]) assert(V.BEN10_VO[k], k)
  assert(!Object.keys(V.BEN10_VO).some(k => /kevin/.test(k)))
  assert.equal(V.pickBen10Vo("intro", { rosterKey: "ben10", _benVariant: "prime" }), null)
  assert.equal(V.pickBen10Vo("transform", { rosterKey: "ben10", transformed: true, activeAlien: "diamondhead" }), null, "legacy twin silent")
})
test("who speaks: alien pools for Ben AND Albedo; human pools by variant; win falls back to the human pool", () => {
  for (const key of ["ben10", "albedo"]) assert.equal(V.ben10VoOwner({ rosterKey: key, transformed: true, activeAlien: "rath" }), "rath")
  assert.equal(V.ben10VoOwner({ rosterKey: "ben10", _benVariant: "classic" }), "ben10:classic")
  assert.equal(V.ben10VoOwner({ rosterKey: "ben10", _benVariant: "alienforce" }), "ben10:alienforce")
  assert.equal(V.ben10VoOwner({ rosterKey: "albedo" }), "albedo")
  assert.equal(V.ben10VoOwner({ rosterKey: "goku" }), null)
  const w = V.pickBen10Vo("win", { rosterKey: "albedo", transformed: true, activeAlien: "rath" }, 1, 1)
  assert.equal(w.owner, "albedo", "Rath has no WIN pool → Albedo's own")
})
test("the old transcript-verified Albedo / Vilgax lines are kept (merged into their pools)", () => {
  assert(V.BEN10_VO.albedo.INTRO.includes("albedo_089.mp3") && V.BEN10_VO.albedo.LOW_HEALTH.includes("albedo_014.mp3"))
  assert(V.BEN10_VO.vilgax.TAUNT.includes("vilgax_018.mp3") && V.BEN10_VO.vilgax.HIT_REACT.includes("vilgax_002.mp3"))
})
console.log(`\nBEN 10 VO: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
