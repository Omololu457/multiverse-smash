// harness/enoch_elements.test.mjs — the generic element framework (elements.js), pure node (no browser):
//   thermal meter (drift, zones, cost / damage, locks, balance, overload), patches (cap 4, width 16 %, lifetimes, merge cap
//   28 % + intensity ≤ 3), reactions (ICE+FIRE burst ×1/1.3/1.6, WATER+FIRE steam 25, WATER+ICE refreeze, STEAM passive),
//   patch effects (slick / walker, fire + steam damage with owner immunity, wet), physics hooks = identity off-patch,
//   GENERICITY (a dummy element + reaction registered from outside, no framework edits) and determinism (same inputs →
//   byte-identical state, 4 patches + a same-frame reaction).
//   node harness/enoch_elements.test.mjs
import * as EL from '../elements.js'
let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d) } else { fail++; console.log('  ❌', n, d) } }
const P = EL.registerThermal('t_test', {})
const J = JSON.stringify

// ── THERMAL ──
{
  const t = EL.createThermal(); t.v = -30
  for (let i = 0; i < 60; i++) EL.thermalTick(t, P, false)
  ok('drift 0.8 / s toward 0 (−30 → −29.2 after 60 idle frames)', Math.abs(t.v - (-29.2)) < 1e-3, String(t.v))
  t.v = -0.3; for (let i = 0; i < 30; i++) EL.thermalTick(t, P, false); ok('drift settles exactly on 0 (never overshoots)', t.v === 0, String(t.v))
  t.v = -10; EL.thermalTick(t, P, true); ok('no drift while active', t.v === -10)
  t.v = -45; let c = EL.thermalCheck(t, P, 'ice'), f = EL.thermalCheck(t, P, 'fire'), w = EL.thermalCheck(t, P, 'water')
  ok('COLD zone: ice ×0.8 cost ×1.15 damage; fire LOCKED; water locked (not balance)', c.ok && c.cost === 0.8 && c.dmg === 1.15 && !f.ok && f.why === 'locked' && !w.ok, J({ c, f, w }))
  t.v = 40; c = EL.thermalCheck(t, P, 'ice'); f = EL.thermalCheck(t, P, 'fire')
  ok('HOT zone (≥ +40): fire ×0.8 / ×1.15, ice locked', !c.ok && f.ok && f.cost === 0.8 && f.dmg === 1.15, J({ c, f }))
  t.v = 25; w = EL.thermalCheck(t, P, 'water'); ok('balance edge +25 inclusive: water unlocked', w.ok)
  t.v = 26; w = EL.thermalCheck(t, P, 'water'); ok('+26: water locked', !w.ok && w.why === 'balance')
  t.v = 30; c = EL.thermalCheck(t, P, 'ice'); f = EL.thermalCheck(t, P, 'fire'); ok('between zones: both usable at ×1', c.ok && f.ok && c.cost === 1 && f.dmg === 1)
  t.v = 95; const r = EL.thermalPush(t, P, 10)
  ok('cap +100 → OVERLOAD', r === 'overload' && t.over === 90 && t.overSide === 1, J(t))
  f = EL.thermalCheck(t, P, 'fire'); ok('during overload: that element locked', !f.ok && f.why === 'overload')
  for (let i = 0; i < 90; i++) EL.thermalTick(t, P, true)
  ok('overload lasts 90 frames (1.5 s) and the meter rushes to +50', t.over === 0 && t.v === 50, J(t))
  t.lock = 5; t.v = 0; EL.thermalPush(t, P, 30); ok('a locked meter does not move', t.v === 0)
}
// ── PATCHES ──
const W = 1280, fr = 100
{
  const fd = EL.createField(4)
  EL.addPatch(fd, { type: 'ice', cx: 200, owner: 'p1', floor: 500, frame: fr })
  const p = fd.patches[0]
  ok('default width = 16 % of the screen (205 px)', p.width === Math.round(0.16 * W), String(p.width))
  ok('lifetimes ICE 7 s / FIRE 5 s / WATER 6 s / STEAM 3 s', EL.ELEMENT_PROFILES.ice.life === 420 && EL.ELEMENT_PROFILES.fire.life === 300 && EL.ELEMENT_PROFILES.water.life === 360 && EL.ELEMENT_PROFILES.steam.life === 180)
  ok('patch shape { type, x, width, bornFrame, owner, intensity }', ['type', 'x', 'width', 'bornFrame', 'owner', 'intensity'].every(k => k in p), J(p))
  EL.addPatch(fd, { type: 'ice', cx: 300, owner: 'p1', floor: 500, frame: fr + 1 })
  ok('same type overlapping MERGES (one patch, intensity +1)', fd.patches.length === 1 && fd.patches[0].intensity === 2, J(fd.patches))
  EL.addPatch(fd, { type: 'ice', cx: 420, owner: 'p1', floor: 500, frame: fr + 2 }); EL.addPatch(fd, { type: 'ice', cx: 520, owner: 'p1', floor: 500, frame: fr + 3 })
  ok('merge width capped at 28 % (358 px), intensity capped at 3', fd.patches.length === 1 && fd.patches[0].width === Math.round(0.28 * W) && fd.patches[0].intensity === 3, J(fd.patches[0]))
  EL.tickField(fd, fr + 3 + 419); ok('alive at 419 frames after its last refresh', fd.patches.length === 1)
  EL.tickField(fd, fr + 3 + 420); ok('expires at 420 frames (7 s)', fd.patches.length === 0)
  const cap = EL.createField(4)
  for (let i = 0; i < 5; i++) EL.addPatch(cap, { type: ['ice', 'water', 'steam', 'water', 'steam'][i], cx: 150 + i * 260, owner: 'p1', floor: 500, frame: fr + i })
  ok('max 4 on screen — the oldest goes first', cap.patches.length === 4 && !cap.patches.some(q => q.bornFrame === fr), J(cap.patches.map(q => [q.type, q.bornFrame])))
}
// ── REACTIONS ──
for (const [hi, mul] of [[1, 1], [2, 1.3], [3, 1.6]]) {
  const fd = EL.createField(4)
  EL.addPatch(fd, { type: 'ice', cx: 400, owner: 'p1', floor: 500, frame: fr, intensity: hi })
  const ev = EL.addPatch(fd, { type: 'fire', cx: 450, owner: 'p1', floor: 500, frame: fr + 1 })
  const b = ev.find(e => e.kind === 'burst'), types = fd.patches.map(q => q.type).sort()
  ok(`ICE(${hi}) + FIRE → both consumed → WATER + STEAM + burst 45 × ${mul} blunt knockdown`, !!b && Math.abs(b.dmg - 45 * mul) < 1e-9 && b.damageType === 'blunt' && b.knockdown && J(types) === J(['steam', 'water']), J({ b, types }))
}
{
  const fd = EL.createField(4)
  EL.addPatch(fd, { type: 'water', cx: 400, owner: 'p1', floor: 500, frame: fr })
  const ev = EL.addPatch(fd, { type: 'fire', cx: 450, owner: 'p1', floor: 500, frame: fr + 1 }), b = ev.find(e => e.kind === 'burst')
  ok('WATER + FIRE → STEAM + 25 energy, no knockdown', !!b && b.dmg === 25 && b.damageType === 'energy' && !b.knockdown && fd.patches.length === 1 && fd.patches[0].type === 'steam', J({ b, p: fd.patches }))
  const f2 = EL.createField(4)
  EL.addPatch(f2, { type: 'water', cx: 400, owner: 'p1', floor: 500, frame: fr })
  const e2 = EL.addPatch(f2, { type: 'ice', cx: 450, owner: 'p1', floor: 500, frame: fr + 1, intensity: 1 })
  ok('WATER + ICE → ICE intensity +1, no damage', !e2.some(e => e.kind === 'burst') && f2.patches.length === 1 && f2.patches[0].type === 'ice' && f2.patches[0].intensity === 2, J(f2.patches))
  const f3 = EL.createField(4)
  EL.addPatch(f3, { type: 'steam', cx: 400, owner: 'p1', floor: 500, frame: fr })
  for (const t of ['ice', 'fire', 'water']) EL.addPatch(f3, { type: t, cx: 420, owner: 'p1', floor: 500, frame: fr + 1, width: 60 })
  ok('STEAM is passive: it never reacts', f3.patches.some(q => q.type === 'steam') && EL.ELEMENT_PROFILES.steam.passive, J(f3.patches.map(q => q.type)))
  const f4 = EL.createField(4)
  EL.addPatch(f4, { type: 'ice', cx: 400, owner: 'p1', floor: 474, frame: fr, disc: { hp: 80 } })
  const e4 = EL.addPatch(f4, { type: 'fire', cx: 400, owner: 'p1', floor: 474, frame: fr + 1 })
  ok('a hovering disc never reacts on the ground (its owner melts it)', !e4.some(e => e.kind === 'reaction') && f4.patches.length === 2)
}
// ── EFFECTS ──
{
  const fd = EL.createField(4), dmg = []
  EL.addPatch(fd, { type: 'fire', cx: 300, owner: 'p1', floor: 500, frame: fr })
  EL.addPatch(fd, { type: 'ice', cx: 700, owner: 'p1', floor: 500, frame: fr })
  EL.addPatch(fd, { type: 'steam', cx: 1000, owner: 'p1', floor: 500, frame: fr })
  const me = { side: 'p1', x: 290, y: 400, w: 20, h: 100, health: 900, onGround: true }, foe = { side: 'p2', x: 290, y: 400, w: 20, h: 100, health: 900, onGround: true, facing: 1 }
  const ctx = { frame: fr, owner: 'p1', ownerX: 100, sideOf: f => f.side, grounded: f => !!f.onGround, feet: f => f.y + f.h, cx: f => f.x + f.w / 2, walker: f => f.side === 'p1', damage: (t, n, o) => dmg.push([t.side, n, o.damageType]) }
  for (let i = 0; i < 40; i++) EL.applyPatchEffects(fd, [me, foe], ctx)
  ok('FIRE: 4 per 20 f to the foe (2 ticks in 40 f); the owner is immune', dmg.length === 2 && dmg.every(d => d[0] === 'p2' && d[1] === 4 && d[2] === 'energy'), J(dmg))
  dmg.length = 0; foe.x = 990; me.x = 990
  for (let i = 0; i < 60; i++) EL.applyPatchEffects(fd, [me, foe], ctx)
  ok('STEAM: 2 per 30 f to the foe only', dmg.length === 2 && dmg.every(d => d[0] === 'p2' && d[1] === 2), J(dmg))
  foe.x = 690; me.x = 690; EL.applyPatchEffects(fd, [me, foe], ctx)
  ok('ICE: the foe is slick (away from the owner); the ice-walker is not', EL.elSlickDir(foe) === 1 && EL.elSlickDir(me) === 0, J({ foe: foe._elSlick, me: me._elSlick }))
  foe.vx = 0; ok('slick walk: acceleration instead of instant speed', EL.elWalkVx(foe, 8) === 8 * EL.SLICK.accel)
  ok('slick friction 0.95 and a 20 % longer dash away', EL.elFriction(foe, 0.72) === 0.95 && EL.elDashMul(foe) === 1.2, String(EL.elDashMul(foe)))
  foe.y = 300; EL.applyPatchEffects(fd, [me, foe], { ...ctx, grounded: () => false }); ok('airborne → no patch effect (flags cleared)', EL.elSlickDir(foe) === 0)
  const plain = { vx: 3, facing: 1, onGround: true }
  ok('physics hooks are the IDENTITY for anyone not on a slick patch', EL.elWalkVx(plain, 7.5) === 7.5 && EL.elFriction(plain, 0.72) === 0.72 && EL.elDashMul(plain) === 1)
  const wfd = EL.createField(4); EL.addPatch(wfd, { type: 'water', cx: 300, owner: 'p1', floor: 500, frame: fr }); foe.x = 290; foe.y = 400
  EL.applyPatchEffects(wfd, [foe], ctx); ok('WATER: the stander is wet ×1.25 (laser bonus)', EL.elWet(foe) === 1.25)
}
// ── GENERICITY: a new element + reaction from OUTSIDE the framework, zero framework edits ──
{
  EL.registerElement('sand', { life: 240, width: 0.1, effect: { slick: true } })
  EL.registerReaction('sand', 'water', { name: 'mud', spawn: [{ type: 'mud' }], burst: { dmg: 10, damageType: 'blunt', knockdown: false, scale: [1, 1, 1] } })
  EL.registerElement('mud', { life: 120, passive: true })
  const fd = EL.createField(4)
  EL.addPatch(fd, { type: 'sand', cx: 400, owner: 'x', floor: 500, frame: 0 })
  const ev = EL.addPatch(fd, { type: 'water', cx: 420, owner: 'x', floor: 500, frame: 1 })
  ok('dummy element profile: "sand" (10 % width) + sand+water → mud burst — no framework code changed', fd.patches.length === 1 && fd.patches[0].type === 'mud' && ev.some(e => e.kind === 'burst' && e.dmg === 10) && Math.round(0.1 * W) === 128, J(fd.patches))
}
// ── DETERMINISM: identical inputs → identical state (4 patches + a same-frame reaction) ──
{
  const run = () => {
    const fd = EL.createField(4), t = EL.createThermal(), log = []
    for (let k = 0; k < 600; k++) {
      if (k % 37 === 0) log.push(...EL.addPatch(fd, { type: ['ice', 'fire', 'water', 'ice'][(k / 37) % 4 | 0], cx: 200 + (k * 13) % 900, owner: 'p1', floor: 500, frame: k }))
      if (k === 300) { EL.addPatch(fd, { type: 'ice', cx: 640, owner: 'p1', floor: 500, frame: k }); log.push(...EL.addPatch(fd, { type: 'fire', cx: 660, owner: 'p1', floor: 500, frame: k })) }   // same-frame reaction
      EL.thermalPush(t, P, (k % 50) < 25 ? -0.7 : 0.9); EL.thermalTick(t, P, k % 3 === 0); EL.tickField(fd, k)
    }
    for (let i = 0; i < 5; i++) log.push(...EL.addPatch(fd, { type: ['water', 'steam', 'ice', 'water', 'steam'][i], cx: 120 + i * 260, owner: 'p1', floor: 500, frame: 600 + i }))   // 5 spaced → the cap evicts
    return J({ fd, t, log })
  }
  const a = run(), b = run()
  ok('determinism: two runs byte-identical (patches, thermal, reaction log)', a === b, `${a.length} chars`)
  const L = JSON.parse(a).log
  ok('determinism run: a reaction on the SAME frame both patches were laid (frame 300) + the 4-patch cap evicted', L.some(e => e.kind === 'reaction' && e.frame === 300) && L.some(e => e.kind === 'evict') && JSON.parse(a).fd.patches.length === 4)
}
// ── no Math.random / Date in the framework or Enoch's sim ──
import fs from 'node:fs'
const srcs = ['elements.js', 'beam.js', 'enochState.js', 'enoch.js', 'enochData.js', 'enochFx.js', 'enochSound.js'].map(f => [f, fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')])
const code = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
const bad = srcs.filter(([, s]) => /Math\.random|Date\.now|performance\.now/.test(code(s))).map(([f]) => f)
ok('no Math.random / Date.now / performance.now in elements.js, beam.js, enoch*.js', !bad.length, bad.join(', '))
console.log(`\n  ENOCH ELEMENTS: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
