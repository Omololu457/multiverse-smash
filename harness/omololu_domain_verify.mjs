// harness/omololu_domain_verify.mjs — headless proof of Omololu's Domain Expansion: Recursive Cadence.
// Drives the REAL judging path (omololuDomain.tickOmololuDomain) with mock fighters + scripted victim
// inputs, asserting: correct-in-window = NO damage, wrong/missed = REAL damage, deterministic cadence,
// clean ~20s end. No game loop — pure module test.
import {
  startOmololuDomain, tickOmololuDomain, getOmololuDomainView, isOmololuDomainActive, OMO_DOMAIN
} from "../omololuDomain.js"

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++ } else { fail++; console.log("  ✗ FAIL:", m) } }

function mkFighter(extra = {}) {
  return { health: 1150, maxHealth: 1150, energy: 180, maxEnergy: 180, x: 100, w: 60, vx: 0, eliminated: false, colorFlash: 0, ...extra }
}
const NEUTRAL = { up: false, left: false, down: false, right: false }
const press = (dir) => ({ ...NEUTRAL, [dir]: true })
const WRONG = { up: "down", down: "up", left: "right", right: "left" }

// Advance through one beat. mode: "hit" | "wrong" | "timeout". Returns {dmg, event}.
function playBeat(caster, victim, mode) {
  const hp0 = victim.health
  let guard = 0
  // telegraph: feed neutral until the window opens
  while (getOmololuDomainView(caster)?.phase === "telegraph" && guard++ < 200) tickOmololuDomain(caster, victim, NEUTRAL)
  const v = getOmololuDomainView(caster)
  const dir = v?.dir
  if (mode === "hit")   tickOmololuDomain(caster, victim, press(dir))
  if (mode === "wrong") tickOmololuDomain(caster, victim, press(WRONG[dir]))
  if (mode === "timeout") { guard = 0; while (getOmololuDomainView(caster)?.phase === "window" && guard++ < 200) tickOmololuDomain(caster, victim, NEUTRAL) }
  const evt = getOmololuDomainView(caster)?.lastEvent
  // drain the gap so the next beat is armed
  guard = 0
  while (getOmololuDomainView(caster)?.phase === "gap" && guard++ < 200) tickOmololuDomain(caster, victim, NEUTRAL)
  return { dmg: hp0 - victim.health, event: evt }
}

console.log("== Omololu Domain — Recursive Cadence ==")

// 1) Gating: no energy → no cast, no spend.
{
  const c = mkFighter({ energy: 40 }), t = mkFighter({ x: 400 })
  const r = startOmololuDomain(c, t, {})
  ok(r === false, "cast blocked when energy < cost")
  ok(c.energy === 40, "no meter spent on blocked cast")
  ok(!isOmololuDomainActive(c), "no domain active after blocked cast")
}

// 2) Cast: spends cost, activates, wires victim back-ref.
{
  const c = mkFighter(), t = mkFighter({ x: 400 })
  const r = startOmololuDomain(c, t, {})
  ok(r === true, "cast succeeds with full meter")
  ok(c.energy === 180 - OMO_DOMAIN.cost, `meter drained by cost (${OMO_DOMAIN.cost})`)
  ok(isOmololuDomainActive(c), "domain active on caster")
  ok(t._omoDomainOwner === c, "victim back-ref set")
  const v = getOmololuDomainView(c)
  ok(v && ["up", "left", "down", "right"].includes(v.dir), "a beat is armed with a WASD direction")
}

// 3) HIT beat = no damage. 4) WRONG beat = real damage. 5) TIMEOUT = real damage.
{
  const c = mkFighter(), t = mkFighter({ x: 400 })
  startOmololuDomain(c, t, {})
  const b1 = playBeat(c, t, "hit")
  ok(b1.dmg === 0 && b1.event === "hit", "correct in-window input → NO damage")
  const b2 = playBeat(c, t, "wrong")
  ok(b2.dmg > 0 && b2.event === "miss", `wrong button → real damage (${b2.dmg})`)
  const b3 = playBeat(c, t, "timeout")
  ok(b3.dmg > 0 && b3.event === "miss", `missed window → real damage (${b3.dmg})`)
  ok(b2.dmg === b3.dmg, "wrong and timeout deal the same in-band penalty")
}

// 6) Determinism: two fresh casters produce the identical cadence sequence.
{
  const seqOf = () => {
    const c = mkFighter(), t = mkFighter({ x: 400 })
    startOmololuDomain(c, t, {})
    const seq = []
    for (let i = 0; i < 8; i++) { seq.push(getOmololuDomainView(c).dir); playBeat(c, t, "hit") }
    return seq.join(",")
  }
  ok(seqOf() === seqOf(), "seeded cadence is deterministic across casts")
}

// 7) Damage ONLY on misses over a FULL run: all-correct = 0 damage; all-wrong = misses×penalty.
{
  const cA = mkFighter(), tA = mkFighter({ x: 400 })
  startOmololuDomain(cA, tA, {})
  let guard = 0
  while (isOmololuDomainActive(cA) && guard++ < 4000) playBeat(cA, tA, "hit")
  ok(tA.health === tA.maxHealth, "perfect run (all correct) deals ZERO damage")
  ok(!isOmololuDomainActive(cA), "domain resolves cleanly back to normal (perfect run)")
  ok(tA._omoDomainOwner == null && tA._omoTrapped === false, "victim released cleanly")

  const cB = mkFighter(), tB = mkFighter({ x: 400 })
  startOmololuDomain(cB, tB, {})
  guard = 0; let misses = 0
  while (isOmololuDomainActive(cB) && guard++ < 4000) { const b = playBeat(cB, tB, "wrong"); if (b.dmg > 0) misses++ }
  const totalLost = tB.maxHealth - tB.health
  ok(totalLost > 0, `all-wrong run deals real cumulative damage (${totalLost} over ${misses} misses)`)
  ok(misses >= 18 && misses <= 34, `~20s produced a sane beat count (${misses})`)
  console.log(`  · all-wrong: ${misses} misses, ${totalLost} total dmg (~${(totalLost / misses).toFixed(1)}/miss after global scale)`)
}

console.log(`\n${fail === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
