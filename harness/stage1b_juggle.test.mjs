// MK-feel STAGE 1b CONFIRMATION — remove launcher auto-follow + juggle-gravity scaling.
// Drives the REAL physics/combat code (no mocks) to prove the three spec claims:
//   (A) the launcher no longer auto-carries the attacker — it stays GROUNDED (no self-lift/drift);
//   (B) the player must JUMP-CANCEL the launcher's recovery to convert (a deliberate jump input);
//   (C) each successive air hit ramps gravity so the juggled target visibly DROPS FASTER;
//   plus juggleCount increments on airborne hits (not grounded) and resets on landing;
//   and maxAirHits=3 is retained as the hard backstop.
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState } from "../combat.js"
import { physics } from "../physics.js"
import { getCharacter } from "../characters.js"

physics.setGroundY(520)
physics.setStageBounds(0, 3200)

let pass = 0, fail = 0
const check = (name, cond, extra = "") => { if (cond) { pass++; console.log("  ✓", name) } else { fail++; console.log("  ✗", name, extra) } }
const section = (t) => console.log(`\n── ${t} ──`)

function mkFighter(side, x, extra = {}) {
  const f = {
    side, rosterKey: extra.rosterKey || "tester", facing: extra.facing ?? 1,
    x, y: 420, w: 50, h: 100, vx: 0, vy: 0, groundY: 520,
    onGround: true, grounded: true, health: 100000, maxHealth: 100000,
    energy: 100, maxEnergy: 100, maxAirHits: 3, maxJumps: 2, jumpCount: 0,
    jumpForce: -22, jumpHeld: false, canJump: true,
    controls: { left: "a", right: "d", up: "w", down: "s", jump: "w", light: "j", heavy: "k" },
    basic_attacks: extra.basic_attacks || {}
  }
  ensureCombatState(f)
  return f
}

// Start `up`, advance to its ACTIVE window, resolve one hit against t. Leaves the launcher mid-recovery.
function landLauncher(a, t, md) {
  a.attacking = false; a.currentAttack = null; a.currentMove = null; a.attackCooldown = 0
  t.hitstun = 0; t.invulnTimer = 0
  startMove(a, "up", md)
  let g = 0; while (getAttackPhase(a) !== "active" && g++ < 120) a.currentAttack.timer--
  resolveAttackHit(a, t, [], {})
}

const gojo = getCharacter("gojo")
const upMd = gojo.basic_attacks.upAttack

// ─────────────────────────────────────────────────────────────────────────────
section("A. Launcher does NOT auto-carry the attacker (stays grounded)")
{
  const a = mkFighter("p1", 300, { rosterKey: "gojo", basic_attacks: gojo.basic_attacks })
  const t = mkFighter("p2", 360, { facing: -1 })
  const ax0 = a.x
  landLauncher(a, t, upMd)
  check("launcher connected", a.currentAttack?.hasHit === true)
  check("ENEMY is launched upward (vy < 0)", t.vy < 0 && t.isLaunched === true, `enemy vy=${t.vy}`)
  check("ATTACKER stays GROUNDED (onGround true)", a.onGround === true, `onGround=${a.onGround}`)
  check("ATTACKER has NO self-lift (vy === 0)", a.vy === 0, `vy=${a.vy}`)
  check("ATTACKER has NO auto-drift toward target (vx === 0)", a.vx === 0, `vx=${a.vx}`)
  check("ATTACKER not moved toward target (x unchanged)", a.x === ax0, `x ${ax0}→${a.x}`)
  check("launcher persists in recovery (jump-cancellable, not auto-ended)", a.attacking === true && !!a.currentAttack, `attacking=${a.attacking}`)
  check("jumps refreshed + air-combo counter reset", a.jumpCount === 0 && a.airHits === 0)
}

// ─────────────────────────────────────────────────────────────────────────────
section("B. Player must JUMP-CANCEL to convert")
{
  const a = mkFighter("p1", 300, { rosterKey: "gojo", basic_attacks: gojo.basic_attacks })
  const t = mkFighter("p2", 360, { facing: -1 })
  landLauncher(a, t, upMd)
  a.hitstop = 0   // in-game the connect hitstop ticks down before the player can act; simulate that here

  // NO jump input → the attacker stays grounded in the launcher's recovery (no auto-conversion).
  a.jumpHeld = false
  physics.moveFighter(a, { /* no keys */ }, a.controls)
  check("no input → attacker stays grounded (no auto-juggle)", a.onGround === true && a.attacking === true, `onGround=${a.onGround} attacking=${a.attacking}`)

  // JUMP press (deliberate) → cancels the launcher recovery and leaps up to pursue.
  a.jumpHeld = false
  physics.moveFighter(a, { w: true }, a.controls)
  check("jump-cancel → attacker leaves the ground", a.onGround === false, `onGround=${a.onGround}`)
  check("jump-cancel → attacker rises (vy < 0)", a.vy < 0, `vy=${a.vy}`)
  check("jump-cancel → launcher recovery cancelled (attacking false, attack cleared)", a.attacking === false && a.currentAttack === null)
}

// ─────────────────────────────────────────────────────────────────────────────
section("C. Juggle gravity — each successive air hit drops the target FASTER")
{
  // Two identical airborne bodies dropped for the same # of frames; the higher juggleCount falls faster.
  const drop = (juggleCount, frames = 6) => {
    const f = mkFighter("p2", 300, {}); f.y = -100; f.vy = 0; f.onGround = false; f.grounded = false
    f.isLaunched = true; f.juggleCount = juggleCount
    for (let i = 0; i < frames; i++) physics.applyGravity(f)
    return f.vy
  }
  const vy0 = drop(0), vy2 = drop(2), vy4 = drop(4)
  console.log(`     fall vy after 6 frames: jc0=${vy0.toFixed(2)}  jc2=${vy2.toFixed(2)}  jc4=${vy4.toFixed(2)}`)
  check("juggleCount 2 falls faster than 0", vy2 > vy0, `${vy2} > ${vy0}`)
  check("juggleCount 4 falls faster than 2 (monotonic ramp)", vy4 > vy2, `${vy4} > ${vy2}`)
  check("ramp matches gravity×(1+jc×0.12) (jc4 ≈ 1.48× jc0)", Math.abs(vy4 / vy0 - 1.48) < 0.02, `ratio=${(vy4 / vy0).toFixed(3)}`)
}

// ─────────────────────────────────────────────────────────────────────────────
section("D. juggleCount increments on AIRBORNE hits only, resets on landing")
{
  const a = mkFighter("p1", 300, { rosterKey: "gojo", basic_attacks: gojo.basic_attacks })
  const light = gojo.basic_attacks.light || { startup: 3, active: 4, recovery: 8, damage: 40, rangeX: 200, rangeY: 200, hitstun: 12, knockbackX: 3 }

  // GROUNDED defender hit → does NOT increment juggleCount.
  const g = mkFighter("p2", 340, { facing: -1 }); g.onGround = true; g.grounded = true
  a.attacking = false; a.currentAttack = null; startMove(a, "light", light)
  let n = 0; while (getAttackPhase(a) !== "active" && n++ < 60) a.currentAttack.timer--
  resolveAttackHit(a, g, [], {})
  check("hit on a GROUNDED opponent does NOT bump juggleCount", (g.juggleCount || 0) === 0, `jc=${g.juggleCount}`)

  // AIRBORNE defender hit ×3 → increments each time.
  const air = mkFighter("p2", 340, { facing: -1 }); air.onGround = false; air.grounded = false; air.isLaunched = true
  for (let i = 1; i <= 3; i++) {
    air.hitstun = 0; air.invulnTimer = 0
    a.attacking = false; a.currentAttack = null; startMove(a, "light", light)
    let m = 0; while (getAttackPhase(a) !== "active" && m++ < 60) a.currentAttack.timer--
    resolveAttackHit(a, air, [], {})
    check(`airborne hit #${i} → juggleCount = ${i}`, air.juggleCount === i, `jc=${air.juggleCount}`)
  }

  // Landing resets juggleCount to 0.
  air.hitstop = 0   // clear the connect hitstop so gravity resumes (as it does in-game a few frames later)
  air.y = 520 - air.h + 5; air.vy = 5
  physics.applyGravity(air)
  check("landing resets juggleCount to 0", air.onGround === true && (air.juggleCount || 0) === 0, `onGround=${air.onGround} jc=${air.juggleCount}`)
}

// ─────────────────────────────────────────────────────────────────────────────
section("E. maxAirHits=3 hard backstop retained")
{
  const a = mkFighter("p1", 300, {})
  const t = mkFighter("p2", 340, { facing: -1 }); t.onGround = false; t.isLaunched = true
  const loft = []
  for (let i = 1; i <= 4; i++) { const re = physics.airCombo(a, t, -6); loft.push({ airHits: a.airHits, reloft: re, vy: t.vy }) }
  check("air hits 1-3 re-loft (return true, vy<0)", loft.slice(0, 3).every(x => x.reloft === true && x.vy < 0))
  check("air hit 4 OVER the cap → no re-loft (return false, vy>0)", loft[3].reloft === false && loft[3].vy > 0, `vy=${loft[3].vy}`)
  check("airHits capped at maxAirHits=3", a.airHits === 3, `airHits=${a.airHits}`)
}

console.log(`\nStage 1b: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
