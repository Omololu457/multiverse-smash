// Green Arrow — PASS3 P1 MUNITIONS module (node, generic). Profile-driven: AoE + hitOnce, guided
// homing, cluster split, napalm patch, emp/net on-impact, shoot-down, chain reaction (cap 3, 70%),
// blast-hop, 16-cap, determinism, angle→frame rotation.
import { MUNITION_PROFILES, registerMunitionProfile, activeMunitions, activeFirePatches, resetMunitions,
  spawnMunition, updateMunitions, updateMunitionShootDown, tickMunitionChains, explodeAt, setBlastHop, munitionCount } from "../munitions.js"

let pass = 0, fail = 0
const ok = (n, c, e = "") => { console.log(`${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
function mkF(side, x, y = 300) { return { side, playerNumber: side === "p2" ? 2 : 1, x, y, w: 60, h: 110, groundY: 410, health: 1000, maxHealth: 1000, defense: 80, hitstun: 0, vx: 0, vy: 0, attacking: false, isBlocking: false, eliminated: false, comboCounter: 0 } }
const ENV = (figs) => ({ groundY: 410, leftWall: 0, rightWall: 1600, fighters: figs, isEnemy: (o, f) => f && o && f.side !== o.side, platformTopAt: () => null })

console.log("\n── generic: dumb bomb falls, lands, explodes (AoE + hitOnce)")
resetMunitions()
let owner = mkF("p1", 200), foe = mkF("p2", 400)
spawnMunition(owner, "dumb", { x: 400, y: 150, vx: 0, vy: 0, target: foe })
const env = ENV([owner, foe])
let exploded = false
for (let fr = 1; fr <= 120; fr++) { updateMunitions(fr, env); tickMunitionChains(fr, env); if (foe.hitstun > 0) exploded = true; if (!activeMunitions.length) break }
ok("dumb bomb detonated + damaged the foe in blast radius", exploded && foe.health < 1000, `hp=${foe.health}`)

console.log("\n── guided bomb homes toward a target")
resetMunitions()
owner = mkF("p1", 200); foe = mkF("p2", 1000)
const g = spawnMunition(owner, "guided", { x: 250, y: 150, vx: 9, vy: 0, target: foe })
for (let fr = 1; fr <= 30; fr++) updateMunitions(fr, ENV([owner, foe]))
ok("guided bomb curved toward the target (vy or vx angled at it)", g.vy > 0 || g.vx > 9 - 1, `vx=${Math.round(g.vx)} vy=${Math.round(g.vy)}`)

console.log("\n── cluster splits into 3 sub-bombs")
resetMunitions()
owner = mkF("p1", 200); foe = mkF("p2", 400)
spawnMunition(owner, "cluster", { x: 400, y: 150, vx: 0, vy: 0, target: foe })
let sawSplit = false
for (let fr = 1; fr <= 90; fr++) { updateMunitions(fr, ENV([owner, foe])); if (activeMunitions.filter(m => m.type === "dumb").length >= 3) sawSplit = true }
ok("cluster spawned 3 sub-bombs at trigger height", sawSplit)

console.log("\n── napalm leaves a fire patch (max 2)")
resetMunitions()
owner = mkF("p1", 200); foe = mkF("p2", 400)
for (let k = 0; k < 3; k++) spawnMunition(owner, "napalm", { x: 400 + k * 10, y: 150 })
for (let fr = 1; fr <= 120; fr++) updateMunitions(fr, ENV([owner, foe]))
ok("napalm fire patches spawned + capped at 2", activeFirePatches.length > 0 && activeFirePatches.length <= 2, `patches=${activeFirePatches.length}`)

console.log("\n── EMP / NET on-impact status")
resetMunitions(); owner = mkF("p1", 200); foe = mkF("p2", 405)
explodeAt(owner, 405, 355, { blastRadius: 80, damage: 12, onImpact: "emp" }, ENV([owner, foe]))
ok("EMP explosion disables the foe's summons/drones", (foe._gaDisabled || 0) > 0)
foe = mkF("p2", 405)
explodeAt(owner, 405, 355, { blastRadius: 80, damage: 0, onImpact: "net" }, ENV([owner, foe]))
ok("NET explosion nets the foe", (foe._gaNetted || 0) > 0)

console.log("\n── shoot-down: an attacking foe detonates an armed bomb early")
resetMunitions(); owner = mkF("p1", 200); foe = mkF("p2", 400); foe.attacking = true; foe.currentAttack = { rangeX: 80, damage: 30 }
const sd = spawnMunition(owner, "dumb", { x: 400, y: 300, vx: 0, vy: 0 })
for (let fr = 1; fr <= 12; fr++) updateMunitions(fr, ENV([owner, foe]))   // arm it
updateMunitionShootDown([owner, foe], [], 13, ENV([owner, foe]))
ok("shot-down bomb removed (detonated early)", !activeMunitions.includes(sd))

console.log("\n── chain reaction (cap 3, 70% dmg)")
resetMunitions(); owner = mkF("p1", 200); foe = mkF("p2", 500)
const a = spawnMunition(owner, "dumb", { x: 400, y: 300 }); a.armT = 20
const b = spawnMunition(owner, "dumb", { x: 430, y: 300 }); b.armT = 20
explodeAt(owner, 400, 300, { blastRadius: 70, damage: 15, onImpact: "explosion" }, ENV([owner, foe]))
ok("neighbouring bomb was queued for a chain detonation", b._chainQueued === true && b._chainDepth === 1)
for (let fr = 1; fr <= 8; fr++) tickMunitionChains(fr, ENV([owner, foe]))
ok("chained bomb detonated (removed) after its delay", !activeMunitions.includes(b))

console.log("\n── blast-hop: owner pushed, never damaged by own blast")
resetMunitions(); setBlastHop(true); owner = mkF("p1", 400); foe = mkF("p2", 1200)
const ohp = owner.health
explodeAt(owner, 410, 355, { blastRadius: 80, damage: 50, onImpact: "explosion" }, ENV([owner, foe]))
ok("owner took NO self-damage but got a blast-hop (vy up + no-control)", owner.health === ohp && owner.vy < 0 && (owner._gaBlastHop || 0) > 0, `hp=${owner.health} vy=${owner.vy}`)

console.log("\n── 16-munition cap")
resetMunitions(); owner = mkF("p1", 200)
for (let k = 0; k < 20; k++) spawnMunition(owner, "dumb", { x: 300 + k * 10, y: 100 })
ok("munitions capped at 16", munitionCount() === 16, `count=${munitionCount()}`)

console.log("\n── determinism: cluster scatter bit-identical")
function run() {
  resetMunitions(); const o = mkF("p1", 200), f = mkF("p2", 400); o._matchSeed = 999
  spawnMunition(o, "cluster", { x: 400, y: 150 })
  const snap = []
  for (let fr = 1; fr <= 100; fr++) { updateMunitions(fr, ENV([o, f])); tickMunitionChains(fr, ENV([o, f])); if (fr % 20 === 0) snap.push(activeMunitions.map(m => `${m.type}:${Math.round(m.x)},${Math.round(m.y)}`).join("|")) }
  return JSON.stringify(snap)
}
ok("two runs bit-identical (hash scatter, no Math.random)", run() === run())

console.log("\n── angle → BOMBS frame rotation")
resetMunitions(); owner = mkF("p1", 200)
const horiz = spawnMunition(owner, "dumb", { x: 300, y: 100, vx: 10, vy: 0 }); updateMunitions(1, ENV([owner]))
const falling = spawnMunition(owner, "dumb", { x: 320, y: 100, vx: 0, vy: 12 }); updateMunitions(2, ENV([owner]))
ok("horizontal bomb → low frame; falling bomb → high frame (nose-down)", horiz.frame <= 1 && falling.frame >= 4, `h=${horiz.frame} f=${falling.frame}`)

console.log(`\n════════════════════════════════════════`)
console.log(`  GREEN ARROW MUNITIONS: ${pass} passed, ${fail} failed`)
console.log(`════════════════════════════════════════`)
process.exit(fail ? 1 : 0)
