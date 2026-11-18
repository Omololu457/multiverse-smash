// BEN 10 FIXES (2026-11-18) — regression tests for five bugs found while compiling command.txt.
//   node harness/ben10_fixes_20261118.test.mjs
// The projectile frame here is the LIVE game order (game.js updateBattle): form tick → combat.updateProjectiles (ages every
// box, deletes lifetime ≤ 0) → resolveProjectileHitsMulti. Older module harnesses aged boxes with `--lifetime < 0`, which kept
// a 1-frame box alive and hid the Diamond Dive bug.
//   1. Diamondhead Diamond Dive connects live (its per-frame box was lifetime 1 → deleted before every hit test).
//   2. Heatblast Blaze Flight dive: a BLOCKED dive is one contact and ends (it used to respawn a 55 box every frame).
//   3. Arcticguana Absolute Popsicle release starts the SHARED refreeze immunity (_benIceImmuneUntil), not only its own.
//   4. Highbreed Talon Dive is once per airtime (like Wing Slash); landing resets it.
//   5. Ghostfreak reads its documented motions: ↓↘→ Gale · ↓↙← Wail · ←↙↓ Phantom Rise · →→ Possess (held-direction fallback kept).
import assert from 'node:assert/strict'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import * as DH from '../diamondhead.js'
import * as HB from '../heatblast.js'
import * as AG from '../arcticguana.js'
import * as GF from '../ghostfreak.js'

let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message) } }
const fresh = (key = 'ben10', x = 0) => ({ rosterKey: key, benExperimental: false, side: key === 'ben10' ? 'p1' : 'p2',
  health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300, w: 60, h: 110, groundY: 410,
  facing: key === 'ben10' ? 1 : -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
  attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 })
const ben = form => { const f = fresh(); f.x = 400; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, []); assert(F.applyAlien(f, form), 'applyAlien ' + form); f.transformed = true; f.y = 410 - f.h; return f }
const foe = (key = 'goku', x = 500) => { const t = fresh(key, x); const ch = characters[key]; if (ch?.specials) t.specials = JSON.parse(JSON.stringify(ch.specials)); t.y = 410 - t.h; return t }
const S = f => f.omnitrix.formState
let FRAME = 0
const STAGE = { stageLeft: 0, stageWidth: 1600 }
const ctxOf = (f, t) => ({ p1: f, p2: t, ...STAGE, seed: 4242, frame: FRAME })
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
const clearProj = () => { A.activeProjectiles.splice(0, A.activeProjectiles.length) }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun']) if (q[k] > 0) q[k]-- }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
// one LIVE-ORDER frame
function live(f, t, n = 1, input = {}) {
  for (let i = 0; i < n; i++) {
    FRAME++
    A.updatePendingSpawns()
    physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f)
    A.tickBenAlienForm(f, typeof input === 'function' ? input(i) : input, ctxOf(f, t))
    physics.moveFighter(t, {}, CONTROLS); physics.applyGravity(t)
    C.updateProjectiles(A.activeProjectiles, STAGE.stageWidth)
    C.resolveProjectileHitsMulti(A.activeProjectiles, [t])
    timers(f); timers(t)
  }
}

test('1. Diamondhead Diamond Dive connects in the LIVE frame order (one hit of 50 raw)', () => {
  clearProj(); A.clearAbilityState(); const f = ben('diamondhead_ov'), t = foe()
  t.x = f.x + f.w + 40; f.y -= 160; f.onGround = f.grounded = false; f.jumpCount = 2; ready(f); f._specialHeldDir = null
  const hp = t.health; assert(A.triggerSpecial(f, ctxOf(f, t)), 'dive cast'); assert(S(f).dive, 'diving')
  let n = 0; while (S(f).dive && n < 90) { live(f, t); n++ }
  assert(t.health < hp, `the dive never connected live (hp ${hp} → ${t.health})`)
  assert.equal(hp - t.health, Math.floor(DH.DH_DIVE.DMG * DH.DIAMONDHEAD.mods.damage * C.GLOBAL_DAMAGE_SCALE), 'exactly one hit')
  clearProj()
})

test('2. Heatblast dive: a BLOCKED dive is one contact and ends; a clean one still hits once', () => {
  for (const block of [true, false]) {
    clearProj(); A.clearAbilityState(); const g = ben('heatblast'), u = foe('goku', 0)
    g.onGround = g.grounded = false; g.y = 250; live(g, u)
    g._specialHeldDir = null; assert(A.triggerSpecial(g, ctxOf(g, u)), 'Blaze Flight'); live(g, u, HB.HB_FLIGHT.FRAMES + 1)
    assert(S(g).dive, 'diving')
    u.x = g.x + g.w / 2; u.y = g.y; u.isBlocking = block; u.facing = -1
    let contacts = 0, frames = 0
    while (S(g).dive && frames < 40) {
      const hp = u.health
      live(g, u); frames++                                          // the live resolve (counts too)
      if (u.health < hp || u.blockstun > 0) contacts++
      for (const p of A.activeProjectiles.filter(p => p.hbDive && p.owner === g)) { p.x = u.x + u.w / 2; p.y = u.y + u.h / 2; const hp2 = u.health; u.blockstun = 0
        C.resolveProjectileHitsMulti([p], [u]); if (u.health < hp2 || u.blockstun > 0) contacts++ }
      u.blockstun = 0; u.hitstun = 0; u.hitstop = 0; u.isBlocking = block; u.x = g.x + g.w / 2; u.y = g.y
    }
    assert.equal(contacts, 1, `${block ? 'blocked' : 'clean'} dive: one contact (got ${contacts})`)
    assert.equal(S(g).dive, null, `${block ? 'blocked' : 'clean'} dive ends after its contact`)
  }
  clearProj()
})

test('3. Arcticguana Absolute Popsicle release starts the SHARED refreeze immunity on the opponent', () => {
  clearProj(); A.clearAbilityState(); const f = ben('arcticguana'), t = foe()
  t.x = f.x + f.w + 100; t.y = f.y + f.h - t.h; delete t._benIceImmuneUntil
  ready(f); f.energy = 100; assert(A.triggerUltimate(f, ctxOf(f, t)), 'ult')
  let n = 0; while ((S(f).ult || n < 20) && n < 400) { live(f, t); n++ }
  assert(S(f).lastUlt?.captured, 'the ult captured')
  const endFrame = S(f).frame
  assert(Number.isFinite(t._benIceImmuneUntil), 'shared timer set on the opponent')
  assert(t._benIceImmuneUntil >= endFrame + AG.AG_CHILL.IMMUNE - n, `timer runs from the release (${t._benIceImmuneUntil} vs frame ${endFrame})`)
  assert(AG.iceImmune(S(f), t), 'every ice alien now sees the opponent as immune')
  clearProj()
})

test('4. Highbreed Talon Dive: once per airtime; landing resets it', () => {
  clearProj(); A.clearAbilityState(); const g = ben('highbreed'), u = foe(); u.x = g.x + 1200
  g.onGround = g.grounded = false; g.y -= 400; g.jumpCount = 2; ready(g); g.energy = 100
  const dashTap = () => { S(g).dashTapT = S(g).t }
  dashTap(); g._specialHeldDir = 'F'; assert(A.triggerSpecial(g, ctxOf(g, u)), 'first air Talon Dive')
  let n = 0; while (S(g).dive && n < 60) { live(g, u); n++ }
  assert(!(g.onGround || g.grounded), 'still airborne after the dive travel (test setup)')
  ready(g); g.energy = 100; dashTap(); g._specialHeldDir = 'F'
  assert.equal(A.triggerSpecial(g, ctxOf(g, u)), false, 'second Talon Dive in the same airtime refused')
  live(g, u, 200); assert(g.onGround || g.grounded, 'landed'); assert.equal(S(g).diveUsed, false, 'landing resets it')
  ready(g); g.energy = 100; dashTap(); g._specialHeldDir = 'F'; assert(A.triggerSpecial(g, ctxOf(g, u)), 'grounded Talon Dive available again')
  clearProj()
})

test('5. Ghostfreak: the documented motions pick the documented specials (and the held-direction fallback is unchanged)', () => {
  // numpad relative to the opponent on the RIGHT: 2 ↓ · 3 ↘ · 6 → · 1 ↙ · 4 ←
  const key = { 2: { down: true }, 3: { down: true, right: true }, 6: { right: true }, 1: { down: true, left: true }, 4: { left: true }, 5: {} }
  const kindOf = s => (s.possess || s.grab) ? 'possess' : s.wail ? 'wail' : s.rise ? 'rise' : s.gale ? 'gale' : s.cold ? 'cold' : null
  const run = (seq, held) => {
    clearProj(); A.clearAbilityState(); const f = ben('ghostfreak'), t = foe(); t.x = f.x + 300; ready(f); f.energy = 100
    for (const d of seq) live(f, t, 1, key[d])
    f._specialHeldDir = held; ready(f); assert(A.triggerSpecial(f, ctxOf(f, t)), 'cast ' + seq.join(''))
    return kindOf(S(f))
  }
  assert.equal(run([2, 3, 6], 'F'), 'gale', '↓↘→ + P = Spectral Gale (was Possess)')
  assert.equal(run([2, 1, 4], 'B'), 'wail', '↓↙← + P = Wail (was Phantom Rise)')
  assert.equal(run([4, 1, 2], 'D'), 'rise', '←↙↓ + P = Phantom Rise (was Wail)')
  assert.equal(run([6, 5, 6], 'F'), 'possess', '→→ + P = Possess')
  // no motion in the buffer: the held direction maps exactly as before (pads / harness)
  for (const [held, want] of [['F', 'possess'], ['D', 'wail'], ['B', 'rise'], [null, 'gale']]) {
    const f = ben('ghostfreak'), s = S(f); f._specialHeldDir = held; assert.equal(GF.gfPickSpecial(f, s), want, 'held ' + held)
  }
  const f = ben('ghostfreak'), t = foe(); for (const d of [2, 3, 6]) live(f, t, 1, key[d])
  assert.doesNotThrow(() => JSON.stringify(S(f))); assert(Array.isArray(S(f).hist), 'input history is plain GAME_STATE data')
  clearProj()
})

console.log(`\nBEN 10 FIXES 2026-11-18: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
