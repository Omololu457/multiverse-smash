// Satoru Gojo — Shinjuku Arc (gojo_shinjuku) — COMMAND LAYER. Press edges come from tickGs (readRawControls), so
// keyboard, pad, replay and LAN feed one reader. Returns 'consumed' always: every move of his (normals, throw included)
// starts here, so the engine's generic normals / grab never fire for him. P (Charge) is Infinity / RCT / Falling Blossom
// and is read in tickGs (gojoShinjukuState.js). Inputs: docs/msv1/gojo/COMBOS.md (move list) and REUSE.md (P / U).
//
// SPECIAL resolution on a fresh Special press (top first; facing-relative numpad motions, 20-tick buffer):
//   Black Flash window (B / C / Blue Fist hit ≤ 2 f ago, 3 in THE ZONE)          → Black Flash
//   ↓↘→↓↘→ or ↓←      (+Heavy → 200 %)                                         → Hollow Purple / 200 % Purple
//   ↓↘→ + Heavy → Maximum Output Blue        ·  ↓↘→ → Lapse Blue
//   Up (+ direction)  → Blue Step            ·  Heavy (held / ±3 f) → Blue Fist
//   → + Heavy         → Red Rush             ·  →  → Reversal Red (hold Special → Delayed Red)
//   neutral           → Lapse Blue (hold Special → farther point)
// Two-button upgrades within 3 ticks of a start (either order) re-start the move as its two-button version, refunding
// the first: Light+Heavy = throw, Heavy+Special = Blue Fist, Lapse+Heavy = Max Blue, Red+Heavy = Red Rush,
// Purple+Heavy = 200 %.
import { startMove, cancelWindowOpen, getComboScale } from './combat.js'
import { isGs, gsState, startGsMove, registerGsEngine, endGsAttack, fresh, use, MOTIONS, gsBlackFlash } from './gojoShinjukuState.js'
import { GS_MOVES, A_CHAIN, NORMALS, CE_UNIT } from './gojoShinjukuData.js'

registerGsEngine({ startMove, comboScale: getComboScale })

const UPGRADE_WIN = 3
const TECH_CANCEL_FROM = new Set(['gA1', 'gA2', 'gA3', 'gB', 'gC', 'gSweep', 'gAir', 'gBlueFist'])
const UPGRADE = { gA1: { heavy: 'gThrow' }, gB: { special: 'gBlueFist', light: 'gThrow' }, gLapse: { heavy: 'gMaxBlue' }, gRed: { heavy: 'gRedRush' }, gPurple: { heavy: 'gPurple200' } }
const fwdHeld = (f, raw) => !!(f.facing === -1 ? raw.left : raw.right)
const backHeld = (f, raw) => !!(f.facing === -1 ? raw.right : raw.left)
const grounded = f => !!(f.onGround || f.grounded)

// first tick a cancel is legal for the live move (after contact); Perfect Output = the press lands on it (≤ 1 tick early)
function cancelOpen(f, s, a) {
  if (!a?.gs?.contact) return false
  const open = s.tick > a.gs.contactTick
  if (open && a.gs.firstOpen == null) a.gs.firstOpen = s.tick
  return open
}
const perfect = (s, a, edge) => a?.gs?.firstOpen != null && s.tick === a.gs.firstOpen && edge && edge.tick >= a.gs.firstOpen - 1

function specialChoice(f, s, raw, edge) {
  const heavy = !!raw.heavy || (s.edges.heavy && Math.abs(s.edges.heavy.tick - edge.tick) <= UPGRADE_WIN && s.used.heavy !== s.edges.heavy.tick)
  if (MOTIONS.dqcf(s) || MOTIONS.downBack(s)) return heavy ? 'gPurple200' : 'gPurple'
  if (MOTIONS.qcf(s)) return heavy ? 'gMaxBlue' : 'gLapse'
  if (edge.up || raw.up) return 'gBlueStep'
  if (heavy && !(edge.fwd || fwdHeld(f, raw))) return 'gBlueFist'
  if (edge.fwd || fwdHeld(f, raw)) return heavy ? 'gRedRush' : 'gRed'
  return 'gLapse'
}
function stepVec(f, raw) {
  const x = (raw.right ? 1 : 0) - (raw.left ? 1 : 0), y = raw.down ? 1 : (raw.up ? -1 : 0)
  if (!x && !y) return { x: f.facing || 1, y: 0 }
  if (y === -1 && !x) return { x: 0, y: -1 }
  const n = Math.hypot(x, y); return { x: x / n, y: y / n }
}

export function updateGsCommandCombat(f, inp, opp, W) {
  if (!isGs(f)) return false
  const s = gsState(f), raw = W.raw?.(f) || inp || {}, g = grounded(f)
  const a = f.attacking && f.currentAttack?.gs ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0 || s.clash) return 'consumed'
  const fire = (k, o = {}) => startGsMove(f, k, W, o)
  // ── Black Flash owns a Special press inside its window ──
  if (s.bf && fresh(s, 'special', 3) && gsBlackFlash(f, W, opp)) return 'consumed'
  // ── two-button upgrades (the first button already started a move ≤ 3 ticks ago) ──
  if (a && (a.total - a.timer) <= UPGRADE_WIN && UPGRADE[a.gs.key]) {
    for (const [btn, to] of Object.entries(UPGRADE[a.gs.key])) {
      if (!fresh(s, btn, UPGRADE_WIN)) continue
      const from = GS_MOVES[a.gs.key], toMd = GS_MOVES[to]
      if (from.cost) s.ce = Math.min(100 * CE_UNIT, s.ce + Math.round(from.cost * CE_UNIT))       // refund the first
      if (from.bars && a.gs.key === 'gPurple' && !f.infiniteEnergy) f.energy += from.bars * 100
      use(s, btn)
      const dir = a.gs.dir
      endGsAttack(f)
      if (!fire(to, { dir })) { /* could not afford the upgrade: keep nothing (refunded); stand */ }
      return 'consumed'
    }
  }
  // ── committed moves read nothing except their own hold (handled in the tick) ──
  if (a && !TECH_CANCEL_FROM.has(a.gs.key)) return 'consumed'
  const contact = !!a && cancelOpen(f, s, a)
  // ── A string: Light → Light → Light after contact ──
  if (contact && A_CHAIN[a.gs.key] && fresh(s, 'light')) { use(s, 'light'); fire(A_CHAIN[a.gs.key], { cancel: true }); return 'consumed' }
  // ── normal → C (launcher) on contact ──
  if (contact && a.gs.key !== 'gC' && NORMALS.includes(a.gs.key) && (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up))) {
    use(s, 'upAttack'); use(s, 'heavy'); fire('gC', { cancel: true }); return 'consumed'
  }
  // ── technique cancel on contact (any normal / Blue Fist → a technique) ──
  if (contact && fresh(s, 'special')) {
    const e = s.edges.special, k = specialChoice(f, s, raw, e)
    use(s, 'special'); if (k === 'gBlueFist' || /Max|Rush|200/.test(k)) use(s, 'heavy')
    fire(k, { cancel: true, po: perfect(s, a, e), vec: k === 'gBlueStep' ? stepVec(f, raw) : null }); return 'consumed'
  }
  if (contact && a.gs.key === 'gB' && fresh(s, 'heavy') && raw.up) { use(s, 'heavy'); fire('gC', { cancel: true }); return 'consumed' }
  if (a) return 'consumed'
  if (f.attackCooldown > 0) return 'consumed'
  // ── Unlimited Void ──
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); if (g) fire('gDomain'); return 'consumed' }
  // ── throw: Light + Heavy together, or the grab button ──
  if (g && (fresh(s, 'grab') || (fresh(s, 'light', UPGRADE_WIN) && fresh(s, 'heavy', UPGRADE_WIN)))) {
    use(s, 'grab'); use(s, 'light'); use(s, 'heavy'); fire('gThrow'); return 'consumed'
  }
  // ── techniques ──
  if (fresh(s, 'special')) {
    const e = s.edges.special, k = specialChoice(f, s, raw, e)
    use(s, 'special'); if (k === 'gBlueFist' || /Max|Rush|200/.test(k)) use(s, 'heavy')
    if (!g && !['gLapse', 'gRed', 'gBlueStep'].includes(k)) { fire(k === 'gBlueFist' ? 'gRed' : 'gLapse'); return 'consumed' }
    fire(k, { vec: k === 'gBlueStep' ? stepVec(f, raw) : null, dir: f.facing || 1 })
    return 'consumed'
  }
  // ── normals ──
  if (!g) {
    if (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack')) { use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); fire('gAir') }
    return 'consumed'
  }
  if (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up)) { use(s, 'upAttack'); use(s, 'heavy'); fire('gC'); return 'consumed' }
  if (fresh(s, 'light')) { use(s, 'light'); fire(raw.down ? 'gSweep' : 'gA1'); return 'consumed' }
  if (fresh(s, 'heavy')) { use(s, 'heavy'); fire(raw.down ? 'gSweep' : 'gB'); return 'consumed' }
  return 'consumed'
}
export { backHeld }
