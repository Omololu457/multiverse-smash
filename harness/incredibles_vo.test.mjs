// INCREDIBLES VO RULES: the pool data and the deterministic dispatch (no browser).   node harness/incredibles_vo.test.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as V from "../incrediblesVoiceMap.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let passed = 0, failed = 0
const test = (n, fn) => { try { fn(); passed++; console.log("PASS", n) } catch (e) { failed++; console.error("FAIL", n, "\n  ", e.message) } }
const A = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/incredibles/AUDIO_ANALYSIS.json"), "utf8"))
const all = Object.values(A).flatMap(o => o.clips)
const CAST = ["dash_parr", "elastigirl", "frozone", "mr_incredible", "syndrome", "violet"]
const wired = new Set(Object.values(V.INCREDIBLES_VO).flatMap(P => Object.values(P).flat()))

test("no random source in the VO modules", () => {
  for (const f of ["incrediblesVoiceMap.js", "incrediblesVoicePools.js"]) assert(!/Math\.random|gameRng/.test(fs.readFileSync(path.join(ROOT, f), "utf8")), f)
})
test("all six roster characters have pools; nobody else does", () => {
  assert.deepEqual([...V.INCREDIBLES_VO_KEYS].sort(), CAST)
  for (const k of ["goku", "ben10", "dash", "mr_incredibles"]) assert.equal(V.incrediblesVoOwner({ rosterKey: k }), null, k)
})
test("same (seed, frame, player) → same clip; the player index and the frame both change the pick", () => {
  for (const k of CAST) {
    const f = { rosterKey: k, side: "p1" }, g = { ...f, side: "p2" }
    for (let fr = 0; fr < 200; fr++) assert.deepEqual(V.pickIncrediblesVo("attack", f, 42, fr), V.pickIncrediblesVo("attack", f, 42, fr))
    const a = new Set(), b = []
    for (let fr = 0; fr < 200; fr++) { a.add(V.pickIncrediblesVo("attack", f, 42, fr).clip); b.push(V.pickIncrediblesVo("attack", f, 42, fr).clip !== V.pickIncrediblesVo("attack", g, 42, fr).clip) }
    assert(a.size > 5, `${k}: frames vary the pick`); assert(b.some(Boolean), `${k}: the player index varies the pick`)
  }
})
test("every character answers every event (intro / win / lose / attack / special / hit / taunt), via fallback if needed", () => {
  for (const k of CAST) for (const ev of ["intro", "win", "lose", "attack", "special", "hit", "taunt"]) assert(V.pickIncrediblesVo(ev, { rosterKey: k, side: "p1" }, 7, 3), `${k} ${ev}`)
})
test("every wired clip exists on disk under assets/audio/<rosterKey>/source/; > 8 s and skipped clips are never wired", () => {
  for (const [o, P] of Object.entries(V.INCREDIBLES_VO)) for (const c of Object.values(P).flat()) {
    assert(c.startsWith(`./assets/audio/${o}/source/`), c); assert(fs.existsSync(path.join(ROOT, c)), c)
  }
  for (const r of all) if (r.duration > 8 || r.skipped) assert(!wired.has(r.path), r.path)
  assert.equal(all.length, 1762, "every delivered clip analysed")
})
test("shape-assigned INTRO / WIN / LOSE are flagged; Syndrome leans villain (TAUNT + CALLOUT ≥ 3× WIN)", () => {
  for (const r of all) if (["INTRO", "WIN", "LOSE"].includes(r.pool)) assert(r.flags.some(x => /wording unverified/.test(x)), r.file)
  const S = V.INCREDIBLES_VO.syndrome
  assert((S.TAUNT.length + S.SPECIAL_CALLOUT.length) >= 3 * S.WIN.length)
})
test("dispatcher cooldowns are module-local (nothing written to the fighter)", () => {
  const f = { rosterKey: "violet", side: "p1" }, before = JSON.stringify(f)
  V.playIncrediblesVo("attack", f, { seed: 1, frame: 10 })
  assert.equal(JSON.stringify(f), before)
})
console.log(`\nINCREDIBLES VO: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
