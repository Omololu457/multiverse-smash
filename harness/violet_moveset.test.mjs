// harness/violet_moveset.test.mjs — Violet Parr PHASE 4: the moveset through REAL keyboard input on the real game.
// Measures startup (press → first hit frame), on-hit damage, on-block frame advantage, every special's contract and the
// ultimate. Keys (P1, facing right): J Light · K Heavy · I Up-Attack · L Special (= P) · U Ultimate · A/D back/forward · S down.
import { boot, ck, summary } from './violet_lib.mjs'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
import { balDmgMult, balHpMult } from '../rosterBalance.js'   // roster balance sweep 2026-11-25: the live table multiplies on top
// ROSTER PARITY boost (rosterParity.js) applied at combat.applyScaledDamage: melee dmg arrives pre-scaled + floored, so
// dealt = floor(old * boost); kit hits pass raw + scale, so dealt = floor(raw * boost * scale).
const BOOST = (ROSTER_DAMAGE_BOOST.violet || 1) * balDmgMult('violet')
const mel = x => Math.floor(x * BOOST), kit = (raw, scale = 1) => Math.floor(raw * BOOST * scale)
const B = await boot('violet', 'violet'), { page, step, st, tap, down, up, reset, wait, guard, S } = B
const V = await S('H.data()')
const M = V.moves
const p2 = () => st('p2')
const FW = 'd', BK = 'a', DN = 's'
// motion helper: each entry = keys held for `per` frames (released before the next unless repeated); the final entry is
// pressed together with the button. Directions released at the end.
async function motion(dirs, btn, per = 2) {
  let held = []
  for (const ks of dirs) { for (const k of held) if (!ks.includes(k)) await page.keyboard.up(k); for (const k of ks) if (!held.includes(k)) await page.keyboard.down(k); held = ks; await step(per) }
  await page.keyboard.down(btn); await step(1); await page.keyboard.up(btn)
  for (const k of held) await page.keyboard.up(k)
}
// press → first frame the defender is in hitstun (or blockstun); returns { frames, hp lost }
async function firstContact(keys, max = 40) {
  const h0 = (await p2()).hp
  for (const k of keys) await page.keyboard.down(k)
  for (let i = 1; i <= max; i++) {
    await step(1); if (i === 1) for (const k of keys) await page.keyboard.up(k)
    const b = await p2(); if (b.hitstun > 0 || b.blockstun > 0) return { frames: i, dmg: h0 - b.hp, b }
  }
  return { frames: null, dmg: h0 - (await p2()).hp }
}
// on-block advantage: frames the defender stays in blockstun after the attacker can act again (positive = attacker ahead)
async function onBlock(keys, opts = {}) {
  await guard(true); await step(2)
  const r = await firstContact(keys)
  if (r.frames == null) { await guard(false); return null }
  let tA = null, tD = null
  for (let i = 0; i < 80 && (tA == null || tD == null); i++) {
    const a = await st(), b = await p2()
    const free = !a.attack && !(a.hitstun > 0) && (opts.air ? a.grounded : true) && !(a.s?.ult)
    if (tA == null && free && (await S('H.raw().attackCooldown')) <= 0) tA = i
    if (tD == null && !(b.blockstun > 0)) tD = i
    await step(1)
  }
  await guard(false)
  return tD - tA
}
const NORMALS = [
  { n: 'Jab', keys: ['j'], startup: 5, dmg: mel(18), block: 0 },
  { n: 'Heavy', keys: ['k'], startup: 13, dmg: mel(52), block: -6 },
  { n: 'Low', keys: [DN, 'j'], startup: 7, dmg: mel(24), block: -4 },
  { n: 'Launcher', keys: ['i'], startup: 11, dmg: mel(46), block: -9 },
]
try {
  // ── normals: startup / damage / on-block ──
  for (const N of NORMALS) {
    await reset(56, false, { energy: 50 }); if (N.keys.includes(DN)) { await down([DN]); await step(2) }
    const r = await firstContact(N.keys.filter(k => k !== DN)); await up([DN])
    // startup N = the first active frame is frame N, counting the press frame as frame 1 (fighting-game convention)
    ck(`${N.n}: startup ${N.startup}f (hits on frame ${N.startup})`, r.frames === N.startup, { frames: r.frames })
    ck(`${N.n}: ${N.dmg} damage on hit`, r.dmg === N.dmg, r.dmg)
    await reset(56, false, { energy: 50 }); if (N.keys.includes(DN)) { await down([DN]); await step(2) }
    const adv = await onBlock(N.keys.filter(k => k !== DN)); await up([DN])
    ck(`${N.n}: ${N.block >= 0 ? '+' : ''}${N.block} on block`, adv === N.block, { adv })
  }
  // Air: jump-in on a standing dummy
  // jump-in: jump from 70 px and press Light on the way down, AIR_PRESS px above her standing height
  const AIR_PRESS = 200
  async function jumpIn() { const y0 = (await st()).y; await tap(['w'], 1); await wait(s => s.vy > 0 && y0 - s.y <= AIR_PRESS, 90) }
  await reset(70, false, { energy: 50 }); await jumpIn()
  { const h0 = (await p2()).hp; let fr = null; await down(['j']); for (let i = 1; i <= 30 && fr == null; i++) { await step(1); if (i === 1) await up(['j']); const b = await p2(); if (b.hitstun > 0) fr = i }
    ck('Air: startup 7f (hits on frame 7)', fr === 7, { fr }); ck(`Air: ${mel(30)} damage`, h0 - (await p2()).hp === mel(30), h0 - (await p2()).hp) }
  await reset(70, false, { energy: 50 }); await guard(true); await jumpIn()
  { await down(['j']); let hitAt = null; for (let i = 1; i <= 30 && hitAt == null; i++) { await step(1); if (i === 1) await up(['j']); if ((await p2()).blockstun > 0) hitAt = i }
    let tA = null, tD = null
    for (let i = 0; i < 80 && (tA == null || tD == null); i++) { const a = await st(), b = await p2()
      if (tA == null && !a.attack && a.grounded && (await S('H.raw().attackCooldown')) <= 0) tA = i
      if (tD == null && !(b.blockstun > 0)) tD = i; await step(1) }
    await guard(false); ck('Air: +2 on block (jump-in, measured from landing)', hitAt != null && tD - tA === 2, { hitAt, adv: tD - tA }) }

  // ── FORCE PUSH ↓↘→+P ──
  await reset(420, false, { energy: 50 })
  { const e0 = (await st()).energy; await motion([[DN], [DN, FW], [FW]], 'l'); let a = await st()
    ck('Force Push: ↓↘→+P starts vPush, costs 12', a.attack?.name === 'vPush' && Math.abs(e0 - a.energy - 12) < 1, { at: a.attack?.name, e0, e: a.energy })
    const h0 = (await p2()).hp; let maxTrav = 0, hit = null
    for (let i = 0; i < 70 && !hit; i++) { await step(1); a = await st(); if (a.s.push) maxTrav = Math.max(maxTrav, a.s.push.trav); const b = await p2(); if (b.hitstun > 0) hit = { b, i } }
    ck(`Force Push: ring hits at 420 px for ${kit(84, 0.6)}`, hit && h0 - hit.b.hp === kit(84, 0.6), { dmg: hit && h0 - hit.b.hp })
    ck('Force Push: push-back on hit', hit && hit.b.vx > 6, { vx: hit?.b.vx }) }
  await reset(900, false, { energy: 60 })
  { await motion([[DN], [DN, FW], [FW]], 'l'); let a = await wait(s => !!s.s.push, 30); let maxTrav = 0
    await step(12); await motion([[DN], [DN, FW], [FW]], 'l'); const r1 = (await st()).s.stats.rejects
    ck('Force Push: one ring on screen (second press refused, nothing spent)', r1 >= 1 && (await st()).s.stats.moves.vPush === 1, (await st()).s.stats)
    for (let i = 0; i < 70; i++) { await step(1); a = await st(); if (a.s.push) maxTrav = Math.max(maxTrav, a.s.push.trav); else if (maxTrav) break }
    ck('Force Push: ring travels 520 px then dissipates (whiff at 900)', maxTrav >= 507 && maxTrav <= 520 && !a.s.push, { maxTrav }) }
  await reset(420, false, { energy: 50 }); await guard(true); await step(2)
  { await motion([[DN], [DN, FW], [FW]], 'l'); const b = await (async () => { for (let i = 0; i < 70; i++) { await step(1); const b = await p2(); if (b.blockstun > 0) return b } return null })(); await guard(false)
    ck('Force Push: blocked ring = chip + blockstun', b && b.blockstun > 0 && b.hp < b.maxHp && (await st()).s.stats.pushBlocked === 1, { bs: b?.blockstun, hp: b?.hp }) }

  // ── BUBBLE SHIELD ←↙↓+P ──
  await reset(60, false, { energy: 50 })
  { const e0 = (await st()).energy; await motion([[BK], [BK, DN], [DN]], 'l'); let a = await st()
    ck('Bubble Shield: ←↙↓+P starts vShield, costs 20', a.attack?.name === 'vShield' && Math.abs(e0 - a.energy - 20) < 1, { at: a.attack?.name, e: a.energy })
    let up0 = null, up1 = null
    for (let i = 0; i < 70; i++) { const sh = await S('H.shieldUp()'); if (sh && up0 == null) up0 = i; if (!sh && up0 != null && up1 == null) up1 = i; await step(1) }
    ck('Bubble Shield: dome up for 40 frames', up1 - up0 === 40, { up0, up1 }) }
  // blocks all strikes: P2 Violet's heavy into the dome
  await reset(60, false, { energy: 50 })
  { await motion([[BK], [BK, DN], [DN]], 'l'); await step(4); const h0 = (await st()).hp
    await S("H.force('p2', 'heavy')"); for (let i = 0; i < 20; i++) await step(1)
    const a = await st(); ck('Bubble Shield: strikes during the dome deal nothing', a.hp === h0 && a.s.stats.shieldBlocks >= 1, { hp: a.hp, h0, blocks: a.s.stats.shieldBlocks }) }
  // reflect at 1.2× speed (P2 fires a plain engine projectile at her)
  await reset(300, false, { energy: 50 })
  { await motion([[BK], [BK, DN], [DN]], 'l'); await step(4); await S("H.spawnProj('p2', 60, 10, 40)")
    let pr = null; for (let i = 0; i < 40; i++) { await step(1); const ps = await S('H.projs()'); pr = ps.find(p => p.name === 'violetTestProj'); if (pr?.refl) break }
    ck('Bubble Shield: projectile reflected at 1.2× speed, now hers', pr && pr.refl === 1 && pr.owner === 'p1' && Math.abs(pr.vx - 12) < 1e-6, pr) }
  // −10 recovery: shield total = 4 + 40 + 10
  ck('Bubble Shield: 4f startup + 40f dome + 10f recovery', M.vShield.startup === 4 && M.vShield.active === 40 && M.vShield.recovery === 10)

  // ── FORCE BALL →→+P ──
  await reset(200, false, { energy: 50 })
  { const x0 = (await st()).x, e0 = (await st()).energy, h0 = (await p2()).hp
    await tap([FW], 1); await step(1); await tap([FW], 1); await tap(['l'], 1)
    let a = await st(); ck('Force Ball: →→+P starts vBall, costs 15', a.attack?.name === 'vBall' && Math.abs(e0 - a.energy - 15) < 1, { at: a.attack?.name, e: a.energy })
    a = await wait(s => !s.attack, 60); const b = await p2()
    ck(`Force Ball: two hits, ${kit(50, 0.6)} + ${kit(50, 0.85 * 0.6)}`, a.s.stats.ballHits === 2 && h0 - b.hp === kit(50, 0.6) + kit(50, 0.85 * 0.6), { hits: a.s.stats.ballHits, dmg: h0 - b.hp }) }
  await reset(1200, false, { energy: 50 })
  { const x0 = (await st()).x; await tap([FW], 1); await step(1); await tap([FW], 1); await tap(['l'], 1); const a = await wait(s => !s.attack, 60)
    ck('Force Ball: rolling lunge travels 320 px', Math.abs((a.x - x0) - 320) <= 24, { dx: a.x - x0 }) }
  await reset(320, false, { energy: 50 })
  { await tap([FW], 1); await step(1); await tap([FW], 1); await tap(['l'], 1); await step(3); const h0 = (await st()).hp
    await S("H.spawnProj('p2', 40, 9, 40)"); for (let i = 0; i < 20; i++) await step(1)
    const a = await st(); ck('Force Ball: armoured vs projectiles (absorbed, no damage)', a.s.stats.ballAbsorbs >= 1 && a.hp === h0, { abs: a.s.stats.ballAbsorbs, hp: a.hp, h0 }) }

  // motion windows: an old ↓↘→ (long expired) must not combine with a fresh →→ into the double-QCF ultimate
  await reset(1200, false, { energy: 100 })
  { await motion([[DN], [DN, FW], [FW]], 'l'); await wait(s => !s.attack && !s.s.push, 90); await step(40)
    await tap([FW], 1); await step(1); await tap([FW], 1); await tap(['l'], 1)
    const a = await st(); ck('motion window: stale ↓↘→ + fresh →→+P = Force Ball, not FULL FORCE', a.attack?.name === 'vBall', { at: a.attack?.name }); await wait(s => !s.attack, 60) }

  // ── FIELD TRAP ↓↙←+P ──
  await reset(380, false, { energy: 50 })
  { const e0 = (await st()).energy, h0 = (await p2()).hp; await motion([[DN], [DN, BK], [BK]], 'l'); let a = await st()
    ck('Field Trap: ↓↙←+P starts vTrap, costs 22, telegraph placed on the foe', a.attack?.name === 'vTrap' && Math.abs(e0 - a.energy - 22) < 1 && a.s.trap?.st === 'form', { at: a.attack?.name, trap: a.s.trap })
    let formedAt = null, held = 0
    for (let i = 1; i < 90; i++) { await step(1); a = await st(); if (a.s.trap?.st === 'hold') { if (formedAt == null) formedAt = a.s.trap.t === 0 ? i : null; held++ } else if (held) break }
    ck('Field Trap: bubble forms 18f after the cast', formedAt === V.trap.delay, { formedAt })
    ck('Field Trap: holds 45f', held === V.trap.hold, { held })
    ck('Field Trap: 0 damage', (await p2()).hp === h0) }
  await reset(380, false, { energy: 50 })
  { await motion([[DN], [DN, BK], [BK]], 'l'); await step(2); await page.evaluate(() => { const b = __harness.violetTest.raw('p2'); b.x += 160 }); for (let i = 0; i < 30; i++) await step(1)
    const a = await st(); ck('Field Trap: visible telegraph — a foe that leaves the spot is not trapped', a.s.stats.trapFizzles === 1 && a.s.stats.traps === 0, a.s.stats) }

  // ── FULL FORCE ↓↘→↓↘→+P ──
  await reset(240, false, { energy: 100 })
  { const h0 = (await p2()).hp; await motion([[DN], [DN, FW], [FW], [DN], [DN, FW], [FW]], 'l'); let a = await st()
    ck('FULL FORCE: ↓↘→↓↘→+P starts vUlt, costs 100', a.attack?.name === 'vUlt' && a.energy < 1, { at: a.attack?.name, e: a.energy })
    // FULL FORCE is a frozen cinematic now (violetUlt.js): 7 contacts, 220 unscaled in total (the old trap/squeeze/detonate split)
    const C = await S('H.data().cine'), want = [C.raw.trap, C.raw.squeeze, C.raw.slam, C.raw.slam, C.raw.slam, C.raw.crush, C.raw.blast]
    const dm = []; let last = h0, seen = false, tEnd = null, kd = false
    for (let i = 1; i < 420; i++) { await step(1); a = await st(); const b = await p2(), cs = await S('H.cine()'); if (cs.active) seen = true
      if (b.hp < last) { dm.push(last - b.hp); last = b.hp } if (seen && !cs.active && tEnd == null) { tEnd = i; kd = b.knockdown } if (tEnd != null && i > tEnd + 2) break }
    ck('FULL FORCE: the cast confirm starts the frozen cinematic and it ends', seen && tEnd != null, { seen, tEnd })
    ck(`FULL FORCE: ${want.join('+')} = 220 unscaled (x${BOOST} roster boost) = ${want.map(r => kit(r)).join('+')}`, dm.join('+') === want.map(r => kit(r)).join('+') && want.reduce((x, y) => x + y) === 220, dm)
    ck('FULL FORCE: the foe ends knocked down, Violet is free again (no 90f lockout after the cinematic)', kd && !a.attack && !a.s?.ult, { kd, at: a.attack?.name, ult: a.s?.ult }) }
  await reset(240, false, { energy: 100 })
  { const h0 = (await p2()).hp; await tap(['u'], 1); const a = await st(); ck('FULL FORCE: Ultimate button also fires it', a.attack?.name === 'vUlt') ; await wait(s => !s.attack, 420) }
  await reset(240, false, { energy: 60 })
  { await tap(['u'], 1); const a = await st(); ck('FULL FORCE: refused under 100 Force Field (nothing spent)', !a.attack && a.energy >= 59.9, { at: a.attack, e: a.energy }) }

  ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
} finally { await B.close() }
process.exit(summary('violet moveset (phase 4)') ? 1 : 0)
