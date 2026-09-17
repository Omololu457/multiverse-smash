// harness/daily_challenges.test.mjs
// Pure-node unit test of the DAILY ROTATION + LOGIN STREAK (Track D) — no browser needed.
// Simulates day rollovers via __setTodayForTest. Verifies: 3 featured challenges/day, stable
// within a day, rotate across days, deterministic per date, login streak increments on
// consecutive days and RESETS after a gap, and completion still grants the existing reward.
import * as ch from "../challenges.js"

let PASS = 0, FAIL = 0
function check(n, c, d = "") { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
function section(t) { console.log(`\n── ${t} ─────────────────────────────`) }
const ids = (list) => list.map(c => c.id).join(",")

section("DAILY SET — 3 featured, stable within a day, deterministic per date")
ch.__setTodayForTest("2026-09-16")
const d1a = ch.getDailyChallenges()
check("exactly 3 daily challenges", d1a.length === 3, `n=${d1a.length}`)
check("all are real challenges", d1a.every(c => c && c.id && c.label))
const d1b = ch.getDailyChallenges()
check("stable within the same day", ids(d1a) === ids(d1b), `${ids(d1a)} | ${ids(d1b)}`)

section("LOGIN STREAK — increments on consecutive days")
check("streak = 1 on first day", ch.getLoginStreak() === 1, `streak=${ch.getLoginStreak()}`)
ch.__setTodayForTest("2026-09-17")
const d2 = ch.getDailyChallenges()
check("day 2 → streak 2", ch.getLoginStreak() === 2, `streak=${ch.getLoginStreak()}`)
check("day 2 date updated", ch.getDailyDate() === "2026-09-17", ch.getDailyDate())
ch.__setTodayForTest("2026-09-18")
const d3 = ch.getDailyChallenges()
check("day 3 → streak 3", ch.getLoginStreak() === 3, `streak=${ch.getLoginStreak()}`)

section("ROTATION — the set actually changes across days")
check("not all three days identical", !(ids(d1a) === ids(d2) && ids(d2) === ids(d3)), `${ids(d1a)} / ${ids(d2)} / ${ids(d3)}`)

section("STREAK RESET — a gap breaks the streak")
ch.__setTodayForTest("2026-09-25")   // skipped several days
ch.getDailyChallenges()
check("streak resets to 1 after a gap", ch.getLoginStreak() === 1, `streak=${ch.getLoginStreak()}`)

section("COMPLETION — daily challenge grants the EXISTING reward, unchanged")
ch.__setTodayForTest("2026-09-26")
const today = ch.getDailyChallenges()
const target = today.find(c => !c.complete) || today[0]
const beforeDate = ch.getDailyDate()
const granted = ch.completeChallenge(target.id)   // same path a match uses
check("reward granted on completion", !!granted && granted.id === target.id, JSON.stringify(granted))
check("reward is an EXISTING type (xp/skin/title)", !!(granted.reward && (granted.reward.xp || granted.reward.skin || granted.reward.title)))
const after = ch.getDailyChallenges()
check("completed challenge now shows complete", after.find(c => c.id === target.id)?.complete === true)
check("daily membership unchanged mid-day", ids(after) === ids(today) && ch.getDailyDate() === beforeDate)
check("re-completing does not re-grant", ch.completeChallenge(target.id) === null)

section("SAME-DAY REVISIT — no double streak-count on repeated reads")
const s = ch.getLoginStreak()
ch.getDailyChallenges(); ch.getDailyChallenges()
check("streak stable on same-day re-reads", ch.getLoginStreak() === s, `streak=${ch.getLoginStreak()}`)

ch.__setTodayForTest(null)   // restore the real clock
console.log(`\n${FAIL === 0 ? "✅" : "❌"} daily-challenges: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL === 0 ? 0 : 1)
