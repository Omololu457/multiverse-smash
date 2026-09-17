// harness/combo_trials.test.mjs
// Pure-node unit test of the Combo Trials OBSERVER (comboTrials.js) — no browser needed.
// Verifies: trial inventory, exact-sequence PASS + star rating, wrong-move FAIL, and
// combo-drop reset. (localStorage is absent in node → persistence no-ops, in-memory best works.)
import * as ct from "../comboTrials.js"

let PASS = 0, FAIL = 0
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }

// Drive a fresh combo of landed moves through update(); each entry = {move, dmg}.
// attackId is GLOBALLY monotonic (mirrors game.js's _ctAttackId, which never resets mid-session)
// so successive combos never reuse an id. A combo drop (combo→0) is signalled between calls.
let gAtk = 0
function runCombo(landed) {
  let combo = 0
  let info = ct.activeInfo()
  for (const step of landed) {
    combo++; gAtk++
    info = ct.update({ combo, attackId: gAtk, attackName: step.move, lastDmg: step.dmg || 0 })
  }
  return info
}

section("INVENTORY")
const chars = ct.trialChars()
check("8 trial characters", chars.length === 8, `n=${chars.length}`)
check("goku is present", chars.some(c => c.key === "goku"))
const gk = ct.trialsFor("goku")
check("goku has 3 trials", gk.length === 3, `n=${gk.length}`)
check("first trial is the up→air launch route", gk[0].seq.join(",") === "up,air", gk[0].seq.join(","))
check("air spike ends on down_air", gk[1].seq[gk[1].seq.length - 1] === "down_air", gk[1].seq.join(","))
check("seqText renders labels", ct.seqText(gk[1].seq) === "Launcher  →  Air Attack  →  Air Spike", ct.seqText(gk[1].seq))

section("PASS — exact sequence lands as one combo")
ct.arm("goku", "goku_2")   // [up, air, down_air], t2=180 t3=300
let info = runCombo([{ move: "up", dmg: 90 }, { move: "air", dmg: 120 }, { move: "down_air", dmg: 130 }])   // dmg 340 ≥ t3
check("status is pass", info.status === "pass", info.status)
check("all 3 steps landed", info.landed === 3, `landed=${info.landed}`)
check("earned 3 stars (high dmg)", info.lastStars === 3, `stars=${info.lastStars} dmg=${info.dmg}`)
check("best recorded", ct.bestStars("goku_2") === 3, `best=${ct.bestStars("goku_2")}`)

section("STAR RATING scales with combo damage")
ct.arm("vegeta", "vegeta_1")   // [up, air], t2=120 t3=200
info = runCombo([{ move: "up", dmg: 30 }, { move: "air", dmg: 30 }])   // dmg 60 < t2
check("low-dmg clear = 1 star", info.status === "pass" && info.lastStars === 1, `stars=${info.lastStars}`)

section("FAIL — wrong move in the string")
ct.arm("goku", "goku_2")   // expects up,air,down_air
info = runCombo([{ move: "up", dmg: 90 }, { move: "down_air", dmg: 120 }])   // 2nd should be air
check("status is fail", info.status === "fail", info.status)
check("did not mark complete", info.landed < 3, `landed=${info.landed}`)

section("RESET — a dropped combo re-arms cleanly")
ct.arm("goku", "goku_3")   // [up, air, air, down_air]
// land one hit, then combo drops to 0
gAtk++; ct.update({ combo: 1, attackId: gAtk, attackName: "up", lastDmg: 40 })
info = ct.update({ combo: 0, attackId: gAtk, attackName: "", lastDmg: 0 })
check("attempt reset on combo drop", info.landed === 0 && info.status === "ready", `landed=${info.landed} status=${info.status}`)
// now a fresh, correct combo passes
info = runCombo([{ move: "up", dmg: 90 }, { move: "air", dmg: 90 }, { move: "air", dmg: 90 }, { move: "down_air", dmg: 90 }])
check("fresh combo after drop passes", info.status === "pass", info.status)

section("DISARM")
ct.disarm()
check("nothing armed", ct.isArmed() === false && ct.activeInfo() === null)

console.log(`\n${FAIL === 0 ? "✅" : "❌"} combo-trials: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL === 0 ? 0 : 1)
