// MK-feel BALANCE Stage 3e — SASUKE. The §Outliers #6 fix: Susanoo economics. One up-front cost
// (50% meter) bought ~20s of FREE giant swings (~302 eff/sword) — a sustained-form value outlier.
// The lever: SHORTEN the free window. Sasuke's giant form is cut 1200 → 800 frames (~20s → ~13.3s).
//   • SASUKE-ONLY: a new SASUKE_SUSANOO_DURATION_FRAMES; the shared SUSANOO_DURATION_FRAMES (1200)
//     still governs Itachi + Netero Guanyin (NOT flagged — no collateral nerf).
//   • Swings stay FREE (per-swing energy would brick Lv2, which drains energy to 0 on escalation).
import { triggerUltimate, updateSasukeSusanoo, revertSasukeSusanoo, enterItachiSusanoo,
         sasukeInSusanoo, itachiInSusanoo, SUSANOO_DURATION_FRAMES, SASUKE_SUSANOO_DURATION_FRAMES } from "../abilities.js"
import { ensureCombatState } from "../combat.js"
import { getCharacter } from "../characters.js"

let pass = 0, fail = 0
const check = (n, c, e = "") => { if (c) { pass++; console.log("  ✓", n) } else { fail++; console.log("  ✗", n, e) } }
const section = (t) => console.log(`\n── ${t} ──`)

const SASUKE = getCharacter("sasuke")
function mkSasuke() {
  const f = { rosterKey: "sasuke", side: "p1", facing: 1, x: 100, y: 300, w: 60, h: 100, vx: 0, vy: 0, onGround: true, grounded: true,
    health: SASUKE.stats.maxHealth, maxHealth: SASUKE.stats.maxHealth, energy: SASUKE.stats.maxEnergy, maxEnergy: SASUKE.stats.maxEnergy,
    basic_attacks: SASUKE.basic_attacks, specials: SASUKE.specials, attackCooldown: 0, ultimateCooldown: 0,
    directionHistory: [], motionHistory: [] }
  ensureCombatState(f); return f
}
const ctx = { getOpponent: () => opp, camera: { shake: () => {}, focusOnFighter: () => {}, focusBetween: () => {} }, projectiles: [] }
const opp = (() => { const f = { rosterKey: "dummy", side: "p2", facing: -1, x: 400, y: 300, w: 60, h: 100, health: 1e6, maxHealth: 1e6 }; ensureCombatState(f); return f })()

// ── A. the constant ──
section("A. Sasuke Susanoo duration cut 1200 → 800 (SASUKE-specific)")
check("SASUKE_SUSANOO_DURATION_FRAMES === 800 (~13.3s)", SASUKE_SUSANOO_DURATION_FRAMES === 800, `val=${SASUKE_SUSANOO_DURATION_FRAMES}`)
check("shorter than the shared SUSANOO_DURATION_FRAMES (1200)", SASUKE_SUSANOO_DURATION_FRAMES < SUSANOO_DURATION_FRAMES, `${SASUKE_SUSANOO_DURATION_FRAMES} < ${SUSANOO_DURATION_FRAMES}`)
check("shared constant is UNCHANGED at 1200 (Itachi/Netero untouched)", SUSANOO_DURATION_FRAMES === 1200, `shared=${SUSANOO_DURATION_FRAMES}`)

// ── B. entering Susanoo arms the shortened window ──
section("B. entering Susanoo arms the 800-frame window (not 1200)")
{
  const s = mkSasuke()
  const fired = triggerUltimate(s, ctx)
  check("Susanoo Lv1 activates (50% meter spent)", fired === true && sasukeInSusanoo(s), `fired=${fired} stage=${s._susanooStage}`)
  check("_susanooTimer armed to 800 (the Stage-3e window, NOT 1200)", s._susanooTimer === 800, `timer=${s._susanooTimer}`)
  check("cost was 50% of max meter (190 → 95)", s.energy === SASUKE.stats.maxEnergy - Math.ceil(SASUKE.stats.maxEnergy * 0.5), `energy=${s.energy}`)
}

// ── C. the timer actually reverts the form at 0 ──
section("C. the shortened timer auto-reverts the giant at 0")
{
  const s = mkSasuke(); triggerUltimate(s, ctx)
  check("still in Susanoo just before expiry", (() => { s._susanooTimer = 2; updateSasukeSusanoo(s); return sasukeInSusanoo(s) })(), `stage=${s._susanooStage}`)
  updateSasukeSusanoo(s)   // ticks 1 → 0 → revert
  check("reverts to base when the 800-window elapses", !sasukeInSusanoo(s) && (s._susanooStage || 0) === 0, `stage=${s._susanooStage} timer=${s._susanooTimer}`)
}

// ── D. NO collateral — Itachi's giant still runs the full shared 1200 ──
section("D. Itachi Susanoo is NOT nerfed (still the shared 1200)")
{
  const it = { rosterKey: "itachi", side: "p1", facing: 1, x: 100, y: 300, w: 60, h: 100, energy: 200, maxEnergy: 200, health: 1180, maxHealth: 1180 }
  ensureCombatState(it)
  enterItachiSusanoo(it)
  check("Itachi timer armed to the shared 1200 (untouched by Stage 3e)", it._itachiSusanooTimer === SUSANOO_DURATION_FRAMES && it._itachiSusanooTimer === 1200, `timer=${it._itachiSusanooTimer}`)
  check("Itachi is in its own Susanoo (separate flag from Sasuke's stage)", itachiInSusanoo(it) && !sasukeInSusanoo(it))
}

console.log(`\nStage 3e (Sasuke): ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
