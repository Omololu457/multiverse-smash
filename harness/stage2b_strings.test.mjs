// MK-feel STAGE 2b CONFIRMATION — the shared "standard combo string" for ALL SIX single-poke characters
// (Goku, Gojo, Sukuna, Naruto, Megumi, Rick). Drives the REAL shared handler + combat/physics (no mocks):
//   • light → light → heavy(LAUNCHER) : each stage cancels into the next on a CONNECTED recovery
//   • the heavy ender POPS THE OPPONENT UP (-26, feeding the Stage-1b/2a juggle)
//   • the string is L,L,H — a 3rd light does NOT chain
//   • INTERRUPT: a WHIFF (no clean connect) ends the string
//   • heavy → SPECIAL cancel fires a real special (spends energy; otherwise blocked mid-attack)
import { startMove, resolveAttackHit, getAttackPhase, ensureCombatState } from "../combat.js"
import { updateStandardStringCombat } from "../abilities.js"
import { getCharacter } from "../characters.js"
import { physics } from "../physics.js"

physics.setGroundY(400); physics.setStageBounds(0, 3200)

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n═══ ${t} ═══`)

const CHARS = ["goku", "gojo", "sukuna", "naruto", "megumi", "rick"]

function mkFighter(key, cd) {
  const f = { side: "p1", rosterKey: key, facing: 1, x: 100, y: 300, w: 50, h: 100, vx: 0, vy: 0,
    groundY: 400, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6,
    energy: cd.stats?.maxEnergy || 200, maxEnergy: cd.stats?.maxEnergy || 200,
    maxAirHits: 3, basic_attacks: cd.basic_attacks, specials: cd.specials, stats: cd.stats }
  ensureCombatState(f); return f
}
function mkOpp() {
  const f = { side: "p2", rosterKey: "dummy", facing: -1, x: 168, y: 300, w: 50, h: 100, vx: 0, vy: 0,
    groundY: 400, onGround: true, grounded: true, health: 1e6, maxHealth: 1e6, energy: 0, maxEnergy: 0 }
  ensureCombatState(f); return f
}
const opp = mkOpp()
// A no-op-rich ability context so any character's special can fire headlessly without throwing.
const ctx = {
  getOpponent: () => opp, camera: { shake: () => {}, x: 0, y: 0, zoom: 1, focusBetween: () => {} },
  activeDomains: [], worldWidth: 3200, deltaMs: 1000 / 60, triggerSlowdown: () => {},
  createFighter: () => null, spawnProjectile: () => null, projectiles: [],
}
const curName = (f) => f.currentMove || f.currentAttack?.name || null
function toRecovery(f) { let g = 0; while (getAttackPhase(f) === "startup" && g++ < 200) f.currentAttack.timer--; g = 0; while (getAttackPhase(f) !== "recovery" && f.currentAttack && g++ < 200) f.currentAttack.timer--; }
function stringInput(f, input, { connect = true } = {}) {
  if (f.currentAttack) { f.currentAttack.hasHit = connect; opp.hitstun = connect ? 12 : 0; toRecovery(f) }
  f._sstrPrevLight = f._sstrPrevHeavy = f._sstrPrevSpecial = false
  return updateStandardStringCombat(f, input, ctx, getAttackPhase)
}

for (const key of CHARS) {
  const cd = getCharacter(key)
  section(`${cd?.name || key}`)

  // A. chain: light → light2 → heavy(launcher) + launch
  {
    const g = mkFighter(key, cd)
    startMove(g, "light", cd.basic_attacks.light)
    const r1 = stringInput(g, { light: true })
    check(`${key}: light → light2 cancels on connect`, r1 === true && curName(g) === "light" && g._sstrStage === "light2", `stage=${g._sstrStage} cur=${curName(g)}`)
    const r2 = stringInput(g, { heavy: true })
    check(`${key}: light2 → UP-ATTACK launcher ender (Stage 2c: folds into the launcher move)`, r2 === true && curName(g) === "up" && g.currentAttack?.launcher === true, `cur=${curName(g)} launcher=${g.currentAttack?.launcher}`)
    opp.onGround = true; opp.grounded = true; opp.vy = 0; opp.isLaunched = false; opp.hitstun = 0
    let n = 0; while (getAttackPhase(g) !== "active" && n++ < 60) g.currentAttack.timer--
    resolveAttackHit(g, opp, [], {})
    // Combo-room pass: the ender pops the opponent at the char's LIVE archetype launchVy (Fast -30 … Heavy-tank
    // -34), or the -30 floor if this char's up-attack is un-tuned. Derive the expectation the way the engine does.
    const _upMd = cd.basic_attacks.upAttack || cd.basic_attacks.up || cd.basic_attacks.up_attack
    const _expVy = _upMd?.launchVy != null ? Math.min(_upMd.launchVy, -30) : -30
    check(`${key}: heavy ender LAUNCHES opponent straight up (vy ${_expVy}, raised ≥ floor -30)`, opp.vy === _expVy && opp.vy <= -30 && opp.isLaunched === true, `vy=${opp.vy} exp=${_expVy}`)
  }
  // B. L,L,H cap — no 3rd light
  {
    const g = mkFighter(key, cd)
    startMove(g, "light", cd.basic_attacks.light)
    stringInput(g, { light: true })
    const r3 = stringInput(g, { light: true })
    check(`${key}: 3rd Light does NOT chain (L,L,H cap)`, r3 === false && g._sstrStage === "light2", `r=${r3} stage=${g._sstrStage}`)
  }
  // C. interrupt — whiff ends the string
  {
    const g = mkFighter(key, cd)
    startMove(g, "light", cd.basic_attacks.light)
    const r = stringInput(g, { light: true }, { connect: false })
    check(`${key}: whiffed opener → no cancel (string ends)`, r === false, `r=${r}`)
  }
  // D. heavy → special cancel (fires a real special = spends energy)
  {
    const g = mkFighter(key, cd); const e0 = g.energy
    startMove(g, "heavy", cd.basic_attacks.heavy)
    const r = stringInput(g, { special: true })
    check(`${key}: heavy → special cancel fires + spends energy`, r === true && g.energy < e0, `r=${r} energy ${e0}→${g.energy}`)
  }
}

// ── STAGE 2c — the l,l,h ender FOLDS into the launcher move; the dedicated launcher input (I) stays
//    available; BOTH routes reach the SAME move (identical currentAttack). ──
section("Stage 2c — dial-a-combo l,l,h ender === dedicated launcher input (I)")
const SAME_KEYS = ["name", "damage", "launcher", "launchVy", "hitstun", "rangeX", "rangeY", "total", "activeStart", "activeEnd", "category"]
for (const key of CHARS) {
  const cd = getCharacter(key)
  // Route 1 — dial-a-combo: light → light2 → HEAVY press (folds into the launcher).
  const a = mkFighter(key, cd)
  startMove(a, "light", cd.basic_attacks.light); stringInput(a, { light: true }); stringInput(a, { heavy: true })
  const combo = a.currentAttack || {}
  // Route 2 — direct launcher input (I / upAttack), fired the same way the normal path does.
  const b = mkFighter(key, cd)
  startMove(b, "up", cd.basic_attacks.upAttack)
  const direct = b.currentAttack || {}
  const same = combo.name === "up" && direct.name === "up" && SAME_KEYS.every(k => combo[k] === direct[k])
  check(`${key}: l,l,h ender IS the launcher move (identical to direct I)`, same,
    `combo{name:${combo.name},dmg:${combo.damage},launcher:${combo.launcher}} vs direct{name:${direct.name},dmg:${direct.damage},launcher:${direct.launcher}}`)
}

console.log(`\nStage 2b+2c (all 6 strings + fold-in): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
