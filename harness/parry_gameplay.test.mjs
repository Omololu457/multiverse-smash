// harness/parry_gameplay.test.mjs — anime-juice Phase 1: PARRY GAMEPLAY on the real combat.js.
// A flawless block = the parry: +2f late grace, both fighters freeze, the attacker is pushed back (and staggered
// after a heavy / special), the defender's next clean hit within the window deals ×1.2 ("COUNTER"), a guard ≤2f old
// is PERFECT (longer freeze + spark tag → slow-mo / bloom / push-in). ben10 / albedo keep the legacy rules.
import { ensureCombatState, startMove, resolveAttackHit, getAttackPhase, updateCombat, isFlawlessBlock, isPerfectParry, FLAWLESS_BLOCK, PARRY } from "../combat.js";
import { attackTell } from "../animeJuice.js";

let pass = 0, fail = 0;
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n); } else { fail++; console.log("  ✗", n, e); } };
const section = t => console.log(`\n── ${t} ──`);
function mk(side, x, extra = {}) {
  const f = { side, rosterKey: "tester", facing: 1, x, y: 400, w: 50, h: 100, vx: 0, vy: 0, onGround: true,
    health: 100000, maxHealth: 100000, energy: 100, maxEnergy: 100, basic_attacks: {}, ...extra };
  ensureCombatState(f); return f;
}
const toActive = a => { let g = 0; while (getAttackPhase(a) !== "active" && g++ < 60) a.currentAttack.timer--; }
function parry(md, held, ak = "tester", dk = "tester") {
  const a = mk("p1", 100, { rosterKey: ak }), d = mk("p2", 150, { facing: -1, rosterKey: dk })
  d.isBlocking = true; d._blockHeldFrames = held
  startMove(a, md.isSpecial ? "special" : "heavy", md); toActive(a)
  const sparks = []; resolveAttackHit(a, d, sparks, {})
  return { a, d, spark: sparks[0] }
}
const LIGHT = { damage: 100, startup: 2, active: 3, recovery: 8, hitstun: 16, category: "light" }
const HEAVY = { damage: 140, startup: 8, active: 3, recovery: 14, hitstun: 20, category: "heavy" }
const SPEC  = { damage: 120, startup: 8, active: 3, recovery: 14, hitstun: 20, category: "special", isSpecial: true }

section("A. window: +2f late grace; ben10 / albedo keep the legacy window")
check(`window ${FLAWLESS_BLOCK.window} = legacy ${FLAWLESS_BLOCK.legacyWindow} + 2`, FLAWLESS_BLOCK.window === FLAWLESS_BLOCK.legacyWindow + 2)
check("held 6 → flawless (late grace)", isFlawlessBlock({ _blockHeldFrames: 6 }) === true)
check("held 6 vs ben10 → NOT flawless (legacy 4)", isFlawlessBlock({ _blockHeldFrames: 6 }, { rosterKey: "ben10" }) === false)
check("ben10 defender held 5 → NOT flawless", isFlawlessBlock({ _blockHeldFrames: 5, rosterKey: "albedo" }) === false)
check("perfect = held ≤ 2", isPerfectParry({ _blockHeldFrames: 2 }) && !isPerfectParry({ _blockHeldFrames: 3 }))

section("B. parry a HEAVY: freeze both, push + stagger the attacker, defender holds the counter")
{
  const { a, d, spark } = parry(HEAVY, 5)
  check("freeze both (hitstop = PARRY.freeze)", a.hitstop >= PARRY.freeze && d.hitstop >= PARRY.freeze, `a=${a.hitstop} d=${d.hitstop}`)
  check("spark tagged flawless, not perfect", spark?.flawless === true && spark?.perfectParry === false, JSON.stringify({ f: spark?.flawless, p: spark?.perfectParry }))
  check("defender holds the counter window", d._parryCounter === PARRY.counterWindow)
  updateCombat(a, d, {}, {})
  check("attacker staggered: attack cancelled + hitstun ≥ stagger", !a.currentAttack && a.hitstun >= PARRY.staggerFrames, `atk=${!!a.currentAttack} hs=${a.hitstun}`)
  { const x0 = a.x; for (let i = 0; i < 12; i++) { a.hitstop = 0; updateCombat(a, d, {}, {}) } check("attacker pushed AWAY from the defender (slide, after the freeze)", a.x < x0 - 10, `dx=${a.x - x0}`) }
}
section("C. parry a LIGHT: push-back only, no stagger")
{
  const { a, d } = parry(LIGHT, 3)
  updateCombat(a, d, {}, {})
  { const x0 = a.x; for (let i = 0; i < 8; i++) { a.hitstop = 0; updateCombat(a, d, {}, {}) } check("pushed (slide)", a.x < x0 - 10, `dx=${a.x - x0}`) }
  check("not staggered (attack still running, no hitstun)", !!a.currentAttack && !(a.hitstun > 0), `hs=${a.hitstun}`)
}
section("D. PERFECT parry (held ≤ 2): longer freeze + spark tag")
{
  const { a, d, spark } = parry(SPEC, 1)
  check("perfect tag", spark?.perfectParry === true)
  check("perfect freeze", a.hitstop >= PARRY.perfectFreeze && d.hitstop >= PARRY.perfectFreeze, `a=${a.hitstop}`)
}
section("E. the COUNTER: next clean hit ×1.2, tagged; spent on the first contact")
{
  const { a, d } = parry(HEAVY, 4)
  // defender now hits back with a plain light vs the (staggered, not guarding) attacker
  const base = mk("p2", 150, { facing: -1 }), tgt = mk("p1", 100)
  startMove(base, "light", LIGHT); toActive(base); resolveAttackHit(base, tgt, [], {})
  const plain = 100000 - tgt.health
  d.facing = -1; a.isBlocking = false; a.hitstun = 0; a.currentAttack = null; a.hitstop = 0; d.hitstop = 0
  const hp0 = a.health, sp = []
  startMove(d, "light", LIGHT); toActive(d); resolveAttackHit(d, a, sp, {})
  const dealt = hp0 - a.health
  check(`counter dealt ≈ ×${PARRY.counterMult} (plain ${plain} → ${dealt})`, plain > 0 && Math.abs(dealt - Math.floor(plain * PARRY.counterMult)) <= 2, `plain=${plain} dealt=${dealt}`)
  check("hit spark tagged parryCounter", sp.some(s => s.parryCounter === true))
  check("counter spent", (d._parryCounter || 0) === 0)
}
section("F. counter window expires")
{
  const { a, d } = parry(HEAVY, 4)
  for (let i = 0; i < PARRY.counterWindow + 1; i++) updateCombat(d, a, {}, {})
  check("expired after the window", (d._parryCounter || 0) === 0)
}
section("G. NORMAL block + ben10 untouched")
{
  const { a, d, spark } = parry(HEAVY, 20)
  updateCombat(a, d, {}, {})
  check("held guard: no counter / no stagger / not flawless", !d._parryCounter && !(a.hitstun > 0) && spark?.flawless === false)
  const b = parry(HEAVY, 3, "ben10")
  updateCombat(b.a, b.d, {}, {})
  check("ben10 attacker, flawless block: no parry gameplay", !b.d._parryCounter && !(b.a.hitstun > 0) && b.spark?.parryPlay === false, JSON.stringify({ c: b.d._parryCounter, hs: b.a.hitstun }))
}
section("H. the TELL (render read): glint only in the last 6f before a heavy goes active")
{
  const a = mk("p1", 100); startMove(a, "heavy", HEAVY)
  const seen = []; let g = 0
  while (getAttackPhase(a) === "startup" && g++ < 60) { seen.push(attackTell(a)); a.currentAttack.timer-- }
  const lit = seen.filter(v => v >= 0).length
  check(`tell lit for ${lit} frames (≤6, ≥4)`, lit >= 4 && lit <= 6, JSON.stringify(seen))
  const l = mk("p1", 100); startMove(l, "light", LIGHT)
  check("no tell on a light", attackTell(l) < 0)
}
console.log(`\nParry Gameplay: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
