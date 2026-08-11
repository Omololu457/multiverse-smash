// MK-feel BALANCE Stage 3d — RICK. The §Outliers #7 fix: he was the simultaneous roster FLOOR
// (HP/atk/def/spd/normals/DPE) whose only compensations were gimmicks — a risk-FREE instant nuke
// + summon spam — and 1a scaling quietly knocked those gimmicks down further. So this REDISTRIBUTES:
//   • Self-Destruct is no longer risk-free — detonating costs Rick 15% of max HP (non-lethal), on
//     top of the 140 meter. Opponent damage is unchanged (already 180 RAW → 108 EFF via 1a).
//   • His under-tuned NEUTRAL is lifted off the floor: light 34→40, heavy 60→72, speed 80→84.
import { triggerUltimate } from "../abilities.js"
import { ensureCombatState } from "../combat.js"
import { getCharacter } from "../characters.js"

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

const RICK = getCharacter("rick")
function mkRick(overrides = {}) {
  const f = { rosterKey: "rick", side: "p1", facing: 1, x: 100, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true,
    health: RICK.stats.maxHealth, maxHealth: RICK.stats.maxHealth, energy: RICK.stats.maxEnergy, maxEnergy: RICK.stats.maxEnergy,
    basic_attacks: RICK.basic_attacks, specials: RICK.specials, attackCooldown: 0, ultimateCooldown: 0,
    directionHistory: [], motionHistory: [], ...overrides }
  ensureCombatState(f); return f
}
function mkOpp(x = 150) { const f = { rosterKey: "dummy", side: "p2", facing: -1, x, y: 300, w: 60, h: 100, health: 1e6, maxHealth: 1e6 }; ensureCombatState(f); return f }
function ctxFor(opp) { return { getOpponent: () => opp, camera: { shake: () => {} }, projectiles: [], worldWidth: 1280 } }

const EXPECT_SELF = Math.round(RICK.stats.maxHealth * 0.15)   // 15% of max, non-lethal cost

// ── A. neutral buff (off the roster floor) ──
section("A. neutral buff — light/heavy/speed lifted off the floor")
check("light 34 → 40 (off the normals floor)", RICK.basic_attacks.light.damage === 40, `light=${RICK.basic_attacks.light.damage}`)
check("heavy 60 → 72 (off the normals floor)", RICK.basic_attacks.heavy.damage === 72, `heavy=${RICK.basic_attacks.heavy.damage}`)
check("speed 80 → 84 (off the absolute speed floor, still < ~90 mid)", RICK.stats.speed === 84, `speed=${RICK.stats.speed}`)
check("HP floor kept (1050 — frail-zoner identity unchanged)", RICK.stats.maxHealth === 1050)

// ── B. Self-Destruct now costs Rick HP (the risk lever) ──
section("B. Self-Destruct — detonating costs Rick 15% max HP (non-lethal)")
{
  const r = mkRick(); const opp = mkOpp(150)   // opp inside the 220px blast
  const fired = triggerUltimate(r, ctxFor(opp))
  check("ultimate fires (full meter)", fired === true, `res=${fired}`)
  check(`Rick paid 15% max HP on cast (1050 → ${1050 - EXPECT_SELF})`, r.health === RICK.stats.maxHealth - EXPECT_SELF, `hp=${r.health} (cost ${EXPECT_SELF})`)
  check("meter spent (160 → 20)", r.energy === 20, `energy=${r.energy}`)
  check("opponent took the scaled blast (180 RAW → 108 EFF, unchanged by 3d)", (1e6 - opp.health) === 108, `dealt=${1e6 - opp.health}`)
}

// ── C. self-cost applies even on a WHIFF (punishes a random panic-press) ──
section("C. self-cost applies on cast even when the blast WHIFFS")
{
  const r = mkRick(); const opp = mkOpp(900)   // far outside the 220px radius → no connect
  const fired = triggerUltimate(r, ctxFor(opp))
  check("ultimate still fires (cast succeeds)", fired === true)
  check("Rick STILL paid the self-cost on a whiff", r.health === RICK.stats.maxHealth - EXPECT_SELF, `hp=${r.health}`)
  check("opponent untouched (out of range)", opp.health === 1e6, `oppHp=${opp.health}`)
}

// ── D. non-lethal — the self-cost never KOs Rick ──
section("D. self-cost is NON-LETHAL (floors at 1 HP, never suicide)")
{
  const r = mkRick({ health: 100 }); const opp = mkOpp(150)   // 100 HP < the ~158 cost
  const fired = triggerUltimate(r, ctxFor(opp))
  check("ultimate fires even when the cost exceeds current HP", fired === true)
  check("Rick survives at 1 HP (non-lethal floor, not 0/negative)", r.health === 1, `hp=${r.health}`)
}

// ── E. blocked blast still chips (scaled), self-cost unchanged ──
section("E. blocked blast chips (round(180×0.20)×0.60 = 21), self-cost same")
{
  const r = mkRick(); const opp = mkOpp(150); opp.isBlocking = true
  triggerUltimate(r, ctxFor(opp))
  const chip = 1e6 - opp.health
  check("blocked → chip only (~21), not the full 108", chip === 21, `chip=${chip}`)
  check("Rick's self-cost is the same regardless of block", r.health === RICK.stats.maxHealth - EXPECT_SELF, `hp=${r.health}`)
}

console.log(`\nStage 3d (Rick): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
