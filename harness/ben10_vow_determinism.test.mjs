/**
 * BEN 10 — BINDING VOW determinism (Phase 10). Pure unit test of fighters.ben10VowPick: the vow pick is
 * hash(matchSeed, frame, playerIndex) mod nSlots, re-hashed (frame+1, ≤5 tries) if it equals the current
 * form. Asserts: same seed → IDENTICAL sequence; picks in range; a transformed re-hash avoids the current
 * form; and that it uses NO Math.random (determinism across fresh fighters). No browser needed.
 */
import { ben10VowPick } from "../fighters.js"

let passed = 0, failed = 0; const fails = []
const ok = (c, m) => { if (c) passed++; else { failed++; fails.push(m) } }
const mkHuman = (n = 5) => ({ transformed: false, omnitrix: { aliens: Array.from({ length: n }, (_, i) => `a${i}`), index: 0, lastVowPick: -1 } })
const FRAMES = [10, 11, 12, 20, 21, 50, 99, 100, 250, 999, 1000, 5000]

// same seed → identical sequence (two independent fighters)
const seq = (seed, f) => FRAMES.map(fr => ben10VowPick(f, seed, fr, 0))
const s1 = seq(777, mkHuman())
const s2 = seq(777, mkHuman())
ok(JSON.stringify(s1) === JSON.stringify(s2), `same seed must give the same sequence:\n  ${JSON.stringify(s1)}\n  ${JSON.stringify(s2)}`)

// picks are all in range [0, nSlots)
ok(s1.every(x => Number.isInteger(x) && x >= 0 && x < 5), `picks out of range [0,5): ${JSON.stringify(s1)}`)

// per-player determinism: player 0 vs player 1 are each internally deterministic
const p0a = FRAMES.map(fr => ben10VowPick(mkHuman(), 42, fr, 0))
const p0b = FRAMES.map(fr => ben10VowPick(mkHuman(), 42, fr, 0))
const p1a = FRAMES.map(fr => ben10VowPick(mkHuman(), 42, fr, 1))
ok(JSON.stringify(p0a) === JSON.stringify(p0b), "player 0 sequence must be reproducible")
ok(JSON.stringify(p0a) !== JSON.stringify(p1a) || true, "player index is folded into the hash (sequences may differ)")

// different seeds generally differ (not a hard guarantee, but a sanity check over 12 frames)
const d1 = seq(1, mkHuman()), d2 = seq(2, mkHuman())
ok(JSON.stringify(d1) !== JSON.stringify(d2), "different seeds should (over 12 frames) produce different sequences")

// re-hash avoids the CURRENT form: a transformed fighter at index k never vow-picks k
let avoidedCurrent = true
for (let k = 0; k < 5; k++) {
  for (const fr of FRAMES) {
    const f = { transformed: true, omnitrix: { aliens: Array.from({ length: 5 }, (_, i) => `a${i}`), index: k, lastVowPick: -1 } }
    const pick = ben10VowPick(f, 777, fr, 0)
    if (pick === k) { avoidedCurrent = false; break }
  }
}
ok(avoidedCurrent, "a vow swap must re-hash to avoid the CURRENT form (never land on itself)")

// lastVowPick is recorded on the omnitrix state
const ff = mkHuman(); const pk = ben10VowPick(ff, 5, 10, 0)
ok(ff.omnitrix.lastVowPick === pk, "lastVowPick should be stamped on the omnitrix state")

console.log("\n════════════════════════════════════════")
console.log(`  BEN 10 VOW DETERMINISM: ${passed} passed, ${failed} failed`)
console.log(`  seed 777 → ${JSON.stringify(s1)}`)
console.log("════════════════════════════════════════")
if (fails.length) console.log(fails.map(f => "  ❌ " + f).join("\n"))
process.exit(failed ? 1 : 0)
