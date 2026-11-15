// harness/ranger_zord_ultimate.test.mjs — the SHARED Ranger Zord ultimate (rangerZordUltimate.js) driven by a
// THROWAWAY second Ranger config + a throwaway second sequence, entirely inside this test (nothing registered in the
// game). Proves the module is profile-driven: no Green-specific code paths, presentation rejected from the sim config,
// confirm / block / whiff / KO / clear lifecycles, mirror singleton rule.   node harness/ranger_zord_ultimate.test.mjs
import * as Z from '../rangerZordUltimate.js'
let pass = 0, fail = 0
const ok = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d)) }
const throws = fn => { try { fn(); return false } catch { return true } }
const dmgLog = []
const W = { stageWidth: () => 2000, damage: (t, amt, meta) => { dmgLog.push(Math.round(amt * 100) / 100); t.health -= amt } }
const fighter = (o = {}) => ({ x: 600, y: 400, w: 48, h: 94, facing: 1, health: 1000, ...o })

// registry rules
ok('unknown sequence rejected', throws(() => Z.registerZordUltimate('throwaway_a', { sequence: 'nope', cost: 50 })))
for (const bad of ['title', 'subtitle', 'tint', 'accent']) ok(`presentation field "${bad}" rejected from the sim config`, throws(() => Z.registerZordUltimate('throwaway_a', { sequence: 'falconzord_assault', [bad]: 'x' })))
Z.registerZordUltSequence('throwaway_seq', { zord: 'Test', captureAt: 4, minReach: 50, maxReach: 300,
  opener: { from: 10, to: 12, raw: 10, hitstun: 30, blockstun: 10, chip: 0.5, box: { w: 80, h: 80, dy: -40 } },
  openerPath: [[0, -100, -100, 'a'], [10, 0, 0, 'b'], [20, 100, -100, 'c']], exitAt: 13, life: 20,
  beats: [{ at: 4, raw: 10, kind: 'x' }, { at: 8, raw: 20, kind: 'y' }, { at: 12, raw: 30, kind: 'z' }], total: 16, settle: 14, lift: 30 })
const cfg = Z.registerZordUltimate('throwaway_a', { sequence: 'throwaway_seq', cost: 50, scale: 2 })
ok('second config registered with defaults (whiffRecovery 60), frozen', cfg.whiffRecovery === 60 && Object.isFrozen(cfg) && Z.zordOptIn('throwaway_a') === cfg)
ok('no opt-in → no ultimate (zordUltBegin returns null)', Z.zordUltBegin(fighter({ rosterKey: 'not_opted' }), W) === null)

// confirm
let a = fighter({ rosterKey: 'throwaway_a' }), b = fighter({ x: 700, facing: -1, rosterKey: 'x' })
Z.zordUltBegin(a, W); let ev, evs = []
for (let i = 0; i < 20 && a._zordUlt?.result !== 'confirmed'; i++) { ev = Z.zordUltTick(a, b, W, 1); if (ev) evs.push(ev.type) }
ok('throwaway sequence: capture then hit inside its own opener window', evs.includes('capture') && evs.includes('hit') && a._zordUlt.result === 'confirmed', evs)
ok('opener damage = raw × config scale (10 × 2)', dmgLog[0] === 20, dmgLog)
let poses = []; ok('activation', Z.activateZordUltCine(a, b, W, { onPose: (f, beat, fr) => poses.push(beat) }) && Z.isZordUltCineActive())
const a2 = fighter({ rosterKey: 'throwaway_a', x: 900 }); Z.zordUltBegin(a2, W)
ok('singleton: a second confirmed cinematic is refused while one runs (caller must treat as missed)', Z.activateZordUltCine(a2, b, W) === false && Z.zordUltCineOwner() === a)
for (let i = 0; i < 30 && Z.isZordUltCineActive(); i++) Z.updateZordUltCine()
ok('beats land at the throwaway frames with the throwaway raws (10/20/30 × 2)', JSON.stringify(dmgLog.slice(1)) === JSON.stringify([20, 40, 60]), dmgLog)
ok('cinematic ends: target knocked down, caster restored, state dropped', !Z.isZordUltCineActive() && b.knockdownState && !a._zordUlt && a.currentAttack == null && poses.includes('watch') && poses.includes('signal'), { b: b.knockdownState, a: a._zordUlt })

// blocked
dmgLog.length = 0; a = fighter({ rosterKey: 'throwaway_a' }); b = fighter({ x: 700, facing: -1, isBlocking: true }); Z.zordUltBegin(a, W); evs = []
for (let i = 0; i < 25 && a._zordUlt; i++) { ev = Z.zordUltTick(a, b, W, 1); if (ev) evs.push(ev.type) }
ok('blocked: chip (10 × 2 × 0.5), blockstun, no capture, Zord leaves', evs.includes('blocked') && dmgLog[0] === 10 && b.blockstun === 10 && !a._zordUlt && !Z.isZordUltCineActive(), { evs, dmgLog })
// whiff (target beyond max reach)
dmgLog.length = 0; a = fighter({ rosterKey: 'throwaway_a' }); b = fighter({ x: 1500 }); Z.zordUltBegin(a, W); evs = []
for (let i = 0; i < 25 && a._zordUlt; i++) { ev = Z.zordUltTick(a, b, W, 1); if (ev) evs.push(ev.type) }
ok('whiff: capture clamps to max reach, no damage, Zord leaves', evs.includes('whiff') && !dmgLog.length && !a._zordUlt, evs)
// KO during the cinematic skips to the settle
dmgLog.length = 0; a = fighter({ rosterKey: 'throwaway_a' }); b = fighter({ x: 700, health: 45 }); Z.zordUltBegin(a, W)
for (let i = 0; i < 20 && a._zordUlt?.result !== 'confirmed'; i++) Z.zordUltTick(a, b, W, 1)
Z.activateZordUltCine(a, b, W); let n = 0; while (Z.isZordUltCineActive() && n++ < 40) Z.updateZordUltCine()
ok('KO inside the cinematic: later beats skipped, cinematic still ends', b.health <= 0 && n <= 16 && !Z.isZordUltCineActive(), { hp: b.health, n })
// clear mid-cinematic
a = fighter({ rosterKey: 'throwaway_a' }); b = fighter({ x: 700 }); Z.zordUltBegin(a, W); for (let i = 0; i < 20 && a._zordUlt?.result !== 'confirmed'; i++) Z.zordUltTick(a, b, W, 1)
Z.activateZordUltCine(a, b, W); Z.updateZordUltCine(); Z.updateZordUltCine(); Z.clearZordUltCine()
ok('clearZordUltCine restores both fighters and drops state', !Z.isZordUltCineActive() && !a._zordUlt && b.hitstun === 0 && b.y === 400)
// the Green / Falconzord config is untouched by the throwaway registration
ok('Falconzord sequence unaffected and frozen', Object.isFrozen(Z.ZORD_ULT_SEQUENCES.falconzord_assault) && Z.ZORD_ULT_SEQUENCES.falconzord_assault.opener.raw === 40)
delete Z.ZORD_ULT_OPTIN.throwaway_a; delete Z.ZORD_ULT_SEQUENCES.throwaway_seq
ok('throwaway registrations removed', !Z.zordOptIn('throwaway_a') && !Z.ZORD_ULT_SEQUENCES.throwaway_seq)
console.log(`\nranger_zord_ultimate: ${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0)
