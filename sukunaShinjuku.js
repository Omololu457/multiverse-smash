// Ryomen Sukuna — Shinjuku Arc (sukuna_shinjuku) — COMMAND LAYER. Press edges come from tickSks (readRawControls), so
// keyboard, pad, replay and LAN feed one reader. Every move of his starts here (the grab button is handed back to the
// engine's generic throw — the old Sukuna's grab). Inputs: docs/msv1/sukuna/COMBOS.md (move list), REUSE.md (why).
//
// Techniques that the OLD Sukuna also has keep HIS inputs (abilities.js executeSukunaSpecial):
//   neutral Special         → CLEAVE                     (old: neutral Special = Cleave)
//   ↓← + Special            → DISMANTLE (hold → 3-slash fan; in the air → angled down)   (old: ↓← + Special = Dismantle)
//   → + Special             → FUGA (hold to gather; within 3 s of his Shrine ending → EMPOWERED, instant)  (old: → = Flame Arrow)
//   Ultimate                → MALEVOLENT SHRINE (full meter)  (old: Ultimate)
// New techniques:
//   ↓↓ + Special            → SPIDERWEB        ·  ↑ + Special → upward Dismantle
//   ↓↓ + Charge             → DOMAIN AMPLIFICATION  ·  ↓↓ + Ultimate → WORLD-CUTTING SLASH (2 bars)
import { startMove, getComboScale } from './combat.js'
import { activateDomain, activeDomains } from './domains.js'
import { isSks, sksState, startSksMove, registerSksEngine, fresh, use, MOTIONS } from './sukunaShinjukuState.js'
import { A_CHAIN, NORMALS } from './sukunaShinjukuData.js'

registerSksEngine({ startMove, comboScale: getComboScale, activateDomain, activeDomains })   // Malevolent Shrine = the engine's domain (domainKey 'sukuna')

const fwdHeld = (f, raw) => !!(f.facing === -1 ? raw.left : raw.right)
const grounded = f => !!(f.onGround || f.grounded)
const TECH_CANCEL_FROM = new Set(['kA1', 'kA2', 'kA3', 'kB', 'kC', 'kKnee', 'kDashAtk'])

function specialChoice(f, s, raw, e, g) {
  if (!g) return 'kDisAir'
  if (MOTIONS.downDown(s)) return 'kWeb'
  if (MOTIONS.downBack(s)) return 'kDismantle'
  if (e.up || raw.up) return 'kDisUp'
  if (e.fwd || fwdHeld(f, raw)) return s.empUntil > s.clock ? 'kFugaE' : 'kFugaG'
  return 'kCleave'
}

export function updateSksCommandCombat(f, inp, opp, W) {
  if (!isSks(f)) return false
  const s = sksState(f), raw = W.raw?.(f) || inp || {}, g = grounded(f)
  const a = f.attacking && f.currentAttack?.sks ? f.currentAttack : null
  if (f.hitstun > 0 || f.blockstun > 0 || f.hitstop > 0 || f.isGrabbed || f.knockdownState || f.health <= 0) return 'consumed'
  const fire = (k, o = {}) => startSksMove(f, k, W, { dir: f.facing || 1, ...o })
  if (a && !TECH_CANCEL_FROM.has(a.sks.key)) return 'consumed'
  const contact = !!a && !!a.sks.contact && s.tick > (a.sks.contactTick ?? s.tick)
  if (contact && A_CHAIN[a.sks.key] && fresh(s, 'light')) { use(s, 'light'); fire(A_CHAIN[a.sks.key], { cancel: true }); return 'consumed' }
  if (contact && a.sks.key !== 'kC' && NORMALS.includes(a.sks.key) && (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up))) {
    use(s, 'upAttack'); use(s, 'heavy'); fire('kC', { cancel: true }); return 'consumed'
  }
  if (contact && a.sks.key !== 'kB' && a.sks.key !== 'kC' && fresh(s, 'heavy') && !raw.down) { use(s, 'heavy'); fire('kB', { cancel: true }); return 'consumed' }
  if (contact && fresh(s, 'special')) {
    const e = s.edges.special; use(s, 'special'); fire(specialChoice(f, s, raw, e, g), { cancel: true }); return 'consumed'
  }
  if (a) return 'consumed'
  if (f.attackCooldown > 0) return 'consumed'
  if (fresh(s, 'ultimate')) { use(s, 'ultimate'); fire(MOTIONS.downDown(s) && g ? 'kWorld' : 'kShrine'); return 'consumed' }
  if (fresh(s, 'charge') && g && MOTIONS.downDown(s)) { use(s, 'charge'); fire('kAmp'); return 'consumed' }
  if (g && fresh(s, 'grab')) { use(s, 'grab'); return 'grab' }
  if (fresh(s, 'special')) { const e = s.edges.special; use(s, 'special'); fire(specialChoice(f, s, raw, e, g)); return 'consumed' }
  if (!g) {
    if (fresh(s, 'light') || fresh(s, 'heavy') || fresh(s, 'upAttack')) { use(s, 'light'); use(s, 'heavy'); use(s, 'upAttack'); fire('kAir') }
    return 'consumed'
  }
  const dashing = (f.dashTimer || 0) > 0
  if (fresh(s, 'upAttack') || (fresh(s, 'heavy') && raw.up)) { use(s, 'upAttack'); use(s, 'heavy'); fire('kC'); return 'consumed' }
  if (fresh(s, 'light')) { use(s, 'light'); fire(dashing || raw.down ? 'kDashAtk' : 'kA1'); return 'consumed' }
  if (fresh(s, 'heavy')) { use(s, 'heavy'); fire(dashing ? 'kDashAtk' : raw.down ? 'kKnee' : 'kB'); return 'consumed' }
  return 'consumed'
}
