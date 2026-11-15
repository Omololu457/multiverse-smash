// harness/violet_defense.test.mjs — Violet Parr PHASE 6: Bubble Shield cooldown, Phase Step (←←+Light, i-frames 3–12,
// 5 s cooldown), Protective Instinct (once per round below 20 % health: a free 30f dome on the next hit). Real input for
// Violet; the attacker is P2 Violet started through the harness (the CPU dummy does not attack on cue).
import { boot, ck, summary } from './violet_lib.mjs'
const B = await boot('violet', 'violet'), { page, step, st, reset, S, wait } = B
const D = (await S('H.data()')).defense, k = page.keyboard
const p2 = () => st('p2')
async function press(keys, n = 1) { for (const x of keys) await k.down(x); await step(n); for (const x of keys) await k.up(x) }
async function motion(dirs, btn) { for (const ks of dirs) await press(ks, 2); await press([btn], 1) }
const shield = () => motion([['a'], ['a', 's'], ['s']], 'l')
const phase = async () => { await press(['a']); await step(1); await press(['a']); await press(['j']) }
try {
  // ── Bubble Shield 6 s cooldown on top of the cost ──
  await reset(300, false, { energy: 100 }); await shield(); let a = await st()
  ck('Bubble Shield cast (20)', a.attack?.name === 'vShield' && a.s.cd.shield === D.shieldCooldown - 0 || a.s.cd.shield >= D.shieldCooldown - 2, { at: a.attack?.name, cd: a.s.cd })
  await wait(s => !s.attack, 80); const e1 = (await st()).energy, r0 = (await st()).s.stats.rejects
  await shield(); a = await st()
  ck('Bubble Shield: recast inside 6 s refused, nothing spent', a.attack?.name !== 'vShield' && a.s.stats.rejects === r0 + 1 && a.energy >= e1 - 0.01, { at: a.attack?.name, e1, e: a.energy })
  await wait(s => s.s.cd.shield === 0, 400); a = await st()
  ck('Bubble Shield: cooldown is 360f (6 s) from the cast', a.s.tick >= D.shieldCooldown, { tick: a.s.tick })
  await shield(); a = await st(); ck('Bubble Shield: available again after the cooldown', a.attack?.name === 'vShield')

  // ── Phase Step ←←+Light ──
  await reset(300, false, { energy: 50 }); const x0 = (await st()).x
  await phase(); a = await st()
  ck('Phase Step: ←←+Light starts vPhase (R7 strip), free', a.attack?.name === 'vPhase' && a.energy >= 49.9, { at: a.attack?.name, e: a.energy })
  // i-frame window measured on the move's own frames (press frame = 1)
  const frames = []
  for (let fr = 2; fr <= 18; fr++) { await step(1); if (await S('H.phaseInvuln()')) frames.push(await S("(()=>{const a=H.raw().currentAttack; return a ? a.total - a.timer + 1 : -1})()")) }
  ck('Phase Step: i-frames on frames 3–12 exactly', frames[0] === D.phaseIframes[0] && frames[frames.length - 1] === D.phaseIframes[1] && frames.length === 10, frames)
  a = await wait(s => !s.attack, 30); ck('Phase Step: steps back', a.x < x0 - 40, { dx: a.x - x0 })
  // a Heavy timed into the i-frames whiffs
  await reset(60, false, { energy: 50 }); await S("H.force('p2', 'heavy')"); for (let i = 0; i < 6; i++) await step(1)
  { const h0 = (await st()).hp; await phase(); for (let i = 0; i < 20; i++) await step(1); a = await st()
    ck('Phase Step: a Heavy landing inside the i-frames deals nothing', a.hp === h0, { h0, hp: a.hp }) }
  // 5 s cooldown
  await reset(300, false, { energy: 50 }); await phase(); await wait(s => !s.attack, 30); await step(10)
  { const r0 = (await st()).s.stats.rejects; await phase(); a = await st()
    ck('Phase Step: refused inside the 5 s cooldown', a.attack?.name !== 'vPhase' && a.s.stats.rejects === r0 + 1, { at: a.attack?.name })
    await wait(s => s.s.cd.phase === 0, 320); await step(2); await phase(); a = await st()
    ck('Phase Step: available after 300f', a.attack?.name === 'vPhase') }

  // ── Protective Instinct ──
  await reset(60, false, { energy: 50 }); await S('H.setHp(170)')           // 170 / 900 = 18.9 % (< 20 %)
  await S("H.force('p2', 'heavy')"); a = await wait(s => s.s.pshield > 0, 20)
  ck('Protective Instinct: below 20 %, the next hit pops a free dome and is caught', a.s.pshield > 0 && a.hp === 170 && a.s.instinct === 'used', { ps: a.s.pshield, hp: a.hp })
  let n = 0; while ((await st()).s.pshield > 0 && n < 40) { await step(1); n++ }
  ck('Protective Instinct: the dome lasts 30f', n >= D.instinctFrames - 2 && n <= D.instinctFrames, { n })
  await step(20); await S("H.force('p2', 'heavy')"); for (let i = 0; i < 20; i++) await step(1); a = await st()
  ck('Protective Instinct: once per round (the next hit lands)', a.hp < 170 && a.s.stats.instincts === 1, { hp: a.hp, n: a.s.stats.instincts })
  await reset(60, false, { energy: 50 }); await S('H.setHp(300)')            // 33 %
  await S("H.force('p2', 'heavy')"); for (let i = 0; i < 20; i++) await step(1); a = await st()
  ck('Protective Instinct: not above 20 %', a.hp < 300 && a.s.stats.instincts === 0, { hp: a.hp })
  await reset(400, false, { energy: 50 }); await S('H.setHp(150)'); await S("H.spawnProj('p2', 60, 10, 40)")
  { let pr = null; for (let i = 0; i < 40; i++) { await step(1); pr = (await S('H.projs()')).find(p => p.name === 'violetTestProj'); if (pr?.refl) break }
    a = await st(); ck('Protective Instinct: catches a projectile too (reflected)', pr?.refl === 1 && a.hp === 150, { pr, hp: a.hp }) }
  ck('no page errors', B.errors.length === 0, B.errors.slice(0, 3))
} finally { await B.close() }
process.exit(summary('violet defense (phase 6)') ? 1 : 0)
