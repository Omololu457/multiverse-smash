// nsCgpt.js — NINJA STORM CGPT (ninja_storm_cgpt): the character-specific systems, plugged into the ninja.js framework
// through the profile `ext` hooks (tick / command / run / stepGate / onStep / alpha). Every hook is a no-op for every other
// fighter (they have no `ext`). All GAME_STATE lives on f._ninja.cg → it rides in the replay / LAN snapshot
// (ninjaSnapshot) and is wiped by clearNinja on the round reset / rematch. No Math.random: X.hash(f, slot).
//
//   NINJA STEP CHARGES  the framework's double-tap Ninja Streak, gated by 3 charges (1 back every 80 f while not stepping);
//                       the third step of a chain still locks the full recovery (framework chainLock). A clone SWAP spends 1.
//   SHADOW CLONE        ONE autonomous clone (the player always drives the real Ranger). Two behaviours, one at a time:
//                         ECHO  — repeats the Ranger's eligible GROUND MELEE normals 14 f later, from the clone's OWN
//                                 position, with a normal hitbox / overlap test (50% damage, never the KO, no resource gain)
//                         GUARD — watches the foe; a threat (an active attack box or a projectile near the Ranger / clone)
//                                 starts a 14-frame TELL ("!" + flash), then on the first OPENING (the foe's box no longer
//                                 active) the clone dash-slashes the foe (48, launches)
//                       Switching keeps life / allowance / cooldowns (only the pending echo queue + tell are dropped).
//                       SWAP (→+Charge, 1 step charge) trades places with the clone (collision-checked, recovery-gated);
//                       RECALL (←+Charge) pulls it back in. The clone never summons, never gains NP / charges / life.
//   FAULT MARKERS       Faultline Strike (↓↙←+Special) cracks the floor (max 2, 5 s); Earth Eruption bursts from a marker
//                       near the foe (+25% damage, higher launch) and consumes it.
//   ULTIMATE            TWIN TEMPEST: FAULTLINE CATACLYSM (full meter): one explicit damage schedule (CGPT_ULT), opening
//                       sword strike must connect, the clone appears opposite, alternating hits in a rising wind spiral,
//                       descending strike → huge earth eruption, the clone dissolves; every state restored on the way out.
import { NS_CGPT_BASES, NS_CGPT_SKIN_TABLE } from './nsCgptSkinTable.js'
import { fresh, use, live, doubleTap, startStreak, nsStartMove, endMove, spendNP, gainNP, cue, burst, nsStrike, ctrX, ctrY, overlaps, getNinjaProfile } from './ninja.js'

export const CGPT_ID = 'ninja_storm_cgpt'
// appearance → asset folder + smoke / streak colours (cosmetic; the skin id never reaches a gameplay number)
const SKIN_ROWS = Object.fromEntries([...NS_CGPT_BASES, ...NS_CGPT_SKIN_TABLE].map(r => [r.tag, r]))
export const cgptTagOf = skinId => skinId === 'yellow' ? 'yellow' : (typeof skinId === 'string' && skinId.startsWith('cgpt_') && SKIN_ROWS[skinId.slice(5)]) ? skinId.slice(5) : 'red'
function applyLook(f) {
  if (f._cgLookFor === f.skinId && f._nsAssetDir) return
  const tag = cgptTagOf(f.skinId), r = SKIN_ROWS[tag]
  f._cgLookFor = f.skinId; f._nsAssetDir = `./assets/ninja_storm_cgpt/skins/${tag}`; f._nsSmoke = r.suit; f._nsColor = r.fx
}
export const CGPT_STEP = { max: 3, regen: 80 }
export const CGPT_CLONE = { cost: 30, life: 600, allowance: 6, cooldown: 300, recallCooldown: 150, pop: 8,
  echoDelay: 14, echoPct: 0.5, echoQueue: 3, echoStale: 40,
  guardRange: 190, guardTell: 14, guardWait: 26, guardReach: 260, guardDmg: 48, guardCd: 70, guardLaunch: -11,
  followBack: 70, followFront: 58, speed: 9 }
export const CGPT_SWAP = { frames: 9, at: 4 }
export const CGPT_FAULT = { max: 2, life: 300, eruptRange: 260, bonus: 1.25, launch: -22 }
// ONE explicit damage schedule (pre-scaling; the combo scale at the opening is frozen for the whole ultimate):
//   opening sword 40 · spiral 6 × 28 (clone, Ranger, clone, Ranger, clone, Ranger) · descending strike 60 · eruption 150 = 418
export const CGPT_ULT = { openAt: 8, openDmg: 40, openReach: 120, cloneIn: 16, spiral: [24, 31, 38, 45, 52, 59], spiralDmg: 28, rise: 210,
  apexAt: 66, diveAt: 76, diveDmg: 60, eruptAt: 86, eruptDmg: 150, cloneOut: 98, end: 124, whiffEnd: 26 }
export const CGPT_ULT_TOTAL = CGPT_ULT.openDmg + CGPT_ULT.spiral.length * CGPT_ULT.spiralDmg + CGPT_ULT.diveDmg + CGPT_ULT.eruptDmg

// ground melee normals the ECHO repeats (no specials / supers / framework poses / air moves)
export const ECHO_SET = ['light', 'jab2', 'jab3', 'sword1', 'sword2', 'sword3', 'swordRise', 'up', 'sLow', 'swordCrouch', 'swordLow', 'axe', 'sWake']
const STEP_CANCEL = { sBlaster: 13, sBlasterAir: 11, sKunai: 10, sKunaiAir: 9 }   // shot moves: double-tap Ninja Step from this elapsed frame on
const FOLLOW = { sErupt: { light: 'skyBlade', heavy: 'skyBlade', upAttack: 'skyBlade' }, sGaleRush: { light: 'airKick', heavy: 'air' }, skyBlade: {} }

const grounded = f => !!(f.onGround || f.grounded)
const feetY = f => (f.y || 0) + (f.h || 94)
const floorY = f => f._rangerFloorY ?? feetY(f)
const elapsed = a => a.total - a.timer
const fw = f => f.w || 48, fh = f => f.h || 94
const cloneBody = (f, c) => ({ x: c.x - fw(f) / 2 + 6, y: c.feet - fh(f) + 4, w: fw(f) - 12, h: fh(f) - 4 })
const oppBody = o => ({ x: o.x, y: o.y, w: o.w || 48, h: o.h || 94 })
const stunned = f => (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.knockdownState || f.isGrabbed || !(f.health > 0)

export function cgState(f) {
  const s = f._ninja; if (!s) return null
  return s.cg ||= { step: { n: CGPT_STEP.max, t: 0 }, clone: null, cd: 0, mode: 'echo', serial: 0, seen: 0, faults: [], swap: null,
    stats: { summons: 0, echoes: 0, echoHits: 0, guards: 0, guardHits: 0, swaps: 0, recalls: 0, switches: 0, faults: 0, erupts: 0, ults: 0, ultHits: 0 } }
}
const say = (f, text, max = 50) => { f._cgPop = { text, t: max, max } }   // render-only popup (read by nsCgptFx)

// ── NINJA STEP CHARGES ───────────────────────────────────────────────────────────────────────────────────────────────
function stepGate(f, s) { const g = cgState(f); return !!g && g.step.n >= 1 }
function onStep(f, s) { const g = cgState(f); if (g) { g.step.n = Math.max(0, g.step.n - 1); g.step.t = 0 } }
function tickStep(f, s, g) {
  if (s.streak || g.step.n >= CGPT_STEP.max) { g.step.t = 0; return }
  if (++g.step.t >= CGPT_STEP.regen) { g.step.n++; g.step.t = 0 }
}

// ── SHADOW CLONE ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function summonClone(f, opp, X) {
  const s = f._ninja, g = cgState(f); if (!g) return false
  if (g.clone || g.cd > 0 || stunned(f) || s.sup || g.swap) return false
  if (!spendNP(f, CGPT_CLONE.cost)) return false
  if (f.attacking) endMove(f)
  nsStartMove(f, 'nsClone')
  const dir = f.facing || 1
  g.clone = { id: ++g.serial, x: Math.round(X.clampX(f, ctrX(f) - dir * CGPT_CLONE.followBack - fw(f) / 2) + fw(f) / 2), feet: Math.round(floorY(f)), dir,
    mode: g.mode, life: CGPT_CLONE.life, allowance: CGPT_CLONE.allowance, cd: 0, phase: 'pop', t: 0, act: null, q: [], tell: null, pose: 'guard', moving: false }
  g.stats.summons++
  burst(s, 'smoke', g.clone.x, g.clone.feet, 16); cue(f, 'handSign'); cue(f, 'smokePop')
  say(f, g.mode === 'echo' ? 'CLONE: ECHO' : 'CLONE: GUARD')
  return true
}
export function dissolveClone(f, why = 'expired', cd = CGPT_CLONE.cooldown) {
  const s = f._ninja, g = cgState(f), c = g?.clone; if (!c) return false
  burst(s, 'smokeFade', c.x, c.feet, 16); cue(f, 'smokePop')
  g.clone = null; g.cd = Math.max(g.cd, cd); g.lastEnd = why
  return true
}
export function switchMode(f) {
  const g = cgState(f); if (!g) return false
  g.mode = g.mode === 'echo' ? 'guard' : 'echo'; g.stats.switches++
  const c = g.clone
  if (c) { c.mode = g.mode; c.q = []; c.tell = null }   // life / allowance / cooldowns untouched
  say(f, g.mode === 'echo' ? 'ECHO' : 'GUARD'); cue(f, 'handSign')
  return true
}
export function recallClone(f) {
  const g = cgState(f), c = g?.clone; if (!c || c.phase === 'recall') return false
  c.phase = 'recall'; c.t = 0; c.act = null; c.q = []; c.tell = null; c.pose = 'streak'; g.stats.recalls++
  return true
}
// SWAP: needs a live clone (past its pop), a Ninja Step charge, the Ranger free (or cancelling a connected normal)
export function canSwap(f) {
  const s = f._ninja, g = cgState(f), c = g?.clone
  if (!c || c.phase === 'pop' || c.phase === 'recall' || g.swap || s.sup || s.streak || s.vanish) return false
  if (stunned(f) || s.chainLock > 0 || g.step.n < 1) return false
  const a = f.attacking ? f.currentAttack : null
  if (a) {
    const contact = a._contact || (a.hasHit && !a.nj?.noHit)
    if (a.isUltimate || !(contact || a.name === 'nsStreakRec' && elapsed(a) >= 8)) return false   // recovery rule: only a connected move or the late step recovery
  }
  return true
}
export function startCloneSwap(f, opp, X) {
  if (!canSwap(f)) return false
  const s = f._ninja, g = cgState(f), c = g.clone
  g.step.n--; g.step.t = 0; g.stats.swaps++
  if (f.attacking) endMove(f)
  nsStartMove(f, 'cgSwap')
  g.swap = { t: 0, from: { x: Math.round(ctrX(f)), feet: Math.round(floorY(f)), air: !grounded(f) }, to: { x: c.x, feet: c.feet } }
  c.act = null; c.tell = null; c.q = []; c.phase = 'swap'
  burst(s, 'smoke', ctrX(f), feetY(f), 12); burst(s, 'smoke', c.x, c.feet, 12); cue(f, 'swap')
  return true
}
function stepSwap(f, opp, s, g, X) {
  const w = g.swap; w.t++
  f._rooted = true; f.vx = 0
  if (w.t === CGPT_SWAP.at) {
    // collision: never end inside the foe's body — step out to the near side (or the far side against a wall)
    let x = w.to.x - fw(f) / 2
    if (opp && opp.health > 0) {
      const ob = oppBody(opp)
      if (x < ob.x + ob.w && x + fw(f) > ob.x) {
        x = w.to.x < ctrX(opp) ? ob.x - fw(f) - 2 : ob.x + ob.w + 2
        if (X.clampX(f, x) !== x) x = w.to.x < ctrX(opp) ? ob.x + ob.w + 2 : ob.x - fw(f) - 2
      }
    }
    f.x = X.clampX(f, x); f.y = w.to.feet - fh(f); f.vy = 0; f.onGround = true; f.grounded = true
    if (opp) f.facing = ctrX(opp) < ctrX(f) ? -1 : 1
    const c = g.clone
    if (c) { c.x = Math.round(X.clampX(f, w.from.x - fw(f) / 2) + fw(f) / 2); c.feet = w.from.feet; c.dir = opp ? (ctrX(opp) < c.x ? -1 : 1) : c.dir }
  }
  if (w.t >= CGPT_SWAP.frames) { g.swap = null; f._rooted = false; if (g.clone) g.clone.phase = 'idle' }
}
// presentation-only alpha of the real body inside the swap smoke
function alpha(f) { const g = f?._ninja?.cg; if (g?.swap && g.swap.t >= 2 && g.swap.t < CGPT_SWAP.at + 2) return 0; return null }

function cloneMoveToward(f, c, tx, X) {
  const d = tx - c.x
  c.moving = Math.abs(d) > 2
  if (c.moving) { c.x += Math.sign(d) * Math.min(Math.abs(d), CGPT_CLONE.speed); c.x = Math.round(X.clampX(f, c.x - fw(f) / 2) + fw(f) / 2) }
}
// one melee move performed by the clone from ITS position (box = ninjaHitbox's rule; scripted 'hits' boxes for multi-hits)
function cloneAttackBoxes(f, c, md) {
  const dir = c.dir || 1, left = c.x - fw(f) / 2, top = c.feet - fh(f)
  if (md.nj?.hits) return md.nj.hits.map(h => ({ at: h.at, dmg: h.dmg, launch: h.launch, kb: h.kb, hitstun: h.hitstun, box: { x: dir > 0 ? left + fw(f) + (h.dx || 0) : left - (h.dx || 0) - (h.w || 70), y: c.feet + (h.dy ?? -fh(f)), w: h.w || 70, h: h.h || fh(f) } }))
  const reach = md.rangeX || 60, h = md.rangeY || 40
  return [{ at: md.startup, dmg: md.damage, launch: md.launcher ? md.launchVy : undefined, kb: md.knockbackX, hitstun: md.hitstun, box: { x: dir > 0 ? left + fw(f) : left - reach, y: top + (md.nj?.boxY ?? 20), w: reach, h } }]
}
function stepCloneAct(f, opp, s, g, c, X) {
  const A = c.act, p = getNinjaProfile(f), md = p.moves[A.key]
  A.t++
  for (const h of A.boxes) {
    if (A.t !== h.at || A['h' + h.at]) continue
    A['h' + h.at] = true; s.cgLastBox = h.box
    if (!opp || !(opp.health > 0) || !overlaps(h.box, oppBody(opp))) continue
    const r = nsStrike(f, opp, h.dmg, { pct: A.pct, noKO: true, noNP: true, meterPct: 0.5, damageType: A.type || md.damageType || 'blunt', move: A.guard ? 'cgGuard' : 'cgEcho',
      launch: h.launch, kb: h.kb ?? 3, hitstun: h.hitstun || 20, dir: c.dir, sparkX: (c.x + ctrX(opp)) / 2 })
    if (r === true) { if (A.guard) g.stats.guardHits++; else g.stats.echoHits++; A.hit = true }
  }
  if (A.t >= A.total) { c.act = null; c.cd = A.guard ? CGPT_CLONE.guardCd : 6; c.pose = 'idle'; if (c.allowance <= 0) dissolveClone(f, 'spent') }
}
function startCloneAct(f, opp, c, key, o = {}) {
  const md = getNinjaProfile(f).moves[key]; if (!md) return false
  if (opp) c.dir = ctrX(opp) < c.x ? -1 : 1
  c.allowance--; c.pose = o.pose || key
  c.act = { key, t: 0, total: (md.startup || 5) + (md.active || 3) + Math.ceil((md.recovery || 10) * 0.6), boxes: o.boxes || cloneAttackBoxes(f, c, md), pct: o.pct ?? CGPT_CLONE.echoPct, guard: !!o.guard, type: o.type, pose: c.pose }
  return true
}
function threatNear(f, opp, c, X) {
  const W = X.world(); if (!opp || !W) return false
  const box = W.attackBoxRaw?.(opp) || W.attackBox?.(opp)
  const zone = (x, r) => ({ x: x - r, y: floorY(f) - 260, w: r * 2, h: 280 })
  if (box && (overlaps(box, zone(ctrX(f), CGPT_CLONE.guardRange)) || overlaps(box, zone(c.x, CGPT_CLONE.guardRange)))) return 'melee'
  const shots = W.projectiles?.(opp) || []
  for (const z of shots) if (z && (overlaps(z, zone(ctrX(f), 220)) || overlaps(z, zone(c.x, 220)))) return 'shot'
  return false
}
function tickClone(f, opp, s, g, X) {
  const c = g.clone; if (!c) return
  c.t++; c.life--
  if (c.cd > 0) c.cd--
  if (!(f.health > 0) || (opp && !(opp.health > 0))) { dissolveClone(f, 'ko'); return }   // a KO either way ends the round: the clone goes too
  if (c.life <= 0 && !c.act) { dissolveClone(f, 'expired'); return }
  // a clone is popped by anything that would hit a fighter: the foe's live attack box or any of the foe's projectiles
  const W = X.world()
  if (c.phase !== 'pop' && c.phase !== 'swap' && opp && W) {
    const threats = [W.attackBox?.(opp), ...(W.projectiles?.(opp) || [])].filter(Boolean)
    if (threats.some(z => overlaps(z, cloneBody(f, c)))) {
      if (opp.currentAttack && W.attackBox?.(opp)) opp.currentAttack.hasHit = true   // the strike was spent on the copy
      dissolveClone(f, 'popped'); return
    }
  }
  if (c.phase === 'pop') { if (c.t >= CGPT_CLONE.pop) { c.phase = 'idle'; c.pose = 'idle' } return }
  if (c.phase === 'swap') return
  if (c.phase === 'recall') {
    cloneMoveToward(f, c, ctrX(f), X); c.dir = ctrX(f) < c.x ? -1 : 1
    if (Math.abs(c.x - ctrX(f)) < 12 || c.t > 20) dissolveClone(f, 'recalled', CGPT_CLONE.recallCooldown)
    return
  }
  // ── ECHO: queue the Ranger's eligible ground melee starts
  const a = f.attacking ? f.currentAttack : null
  if (a && !a._cgId) {
    a._cgId = ++g.serial
    if (c.mode === 'echo' && ECHO_SET.includes(a.name) && grounded(f)) { c.q.push({ key: a.name, at: s.clock + CGPT_CLONE.echoDelay }); if (c.q.length > CGPT_CLONE.echoQueue) c.q.shift() }
  }
  if (c.act) { stepCloneAct(f, opp, s, g, c, X); return }
  c.q = c.q.filter(e => s.clock - e.at <= CGPT_CLONE.echoStale)
  if (c.mode === 'echo') {
    const e = c.q[0]
    if (e && s.clock >= e.at && c.cd <= 0 && c.allowance > 0) { c.q.shift(); if (startCloneAct(f, opp, c, e.key)) { g.stats.echoes++; return } }
    cloneMoveToward(f, c, ctrX(f) - (f.facing || 1) * CGPT_CLONE.followBack, X)
    if (opp && !c.moving) c.dir = ctrX(opp) < c.x ? -1 : 1
    c.pose = c.moving ? 'run' : 'idle'
    c.feet = Math.round(floorY(f) > c.feet + 40 ? floorY(f) : c.feet + (floorY(f) - c.feet) * 0.5)
    return
  }
  // ── GUARD: watch → telegraph → counter on the first opening
  if (opp) c.dir = ctrX(opp) < c.x ? -1 : 1
  if (c.tell) {
    c.tell.t++; c.pose = 'guard'
    const box = X.world()?.attackBoxRaw?.(opp) || X.world()?.attackBox?.(opp)
    const open = opp && opp.health > 0 && !(opp.invulnTimer > 0) && !box && Math.abs(ctrX(opp) - c.x) <= CGPT_CLONE.guardReach
    if (c.tell.t >= CGPT_CLONE.guardTell && open && c.allowance > 0) {
      // the counter: a short visible dash to the foe's near side, then a rising dash-slash
      const side = c.x < ctrX(opp) ? -1 : 1
      c.from = c.x; c.x = Math.round(X.clampX(f, ctrX(opp) + side * ((opp.w || 48) / 2 + 30) - fw(f) / 2) + fw(f) / 2); c.dir = -side
      const md = getNinjaProfile(f).moves.sword2   // the stepping slash (R15) as the counter
      startCloneAct(f, opp, c, 'sword2', { guard: true, pct: 1, type: 'slash', pose: 'sword2',
        boxes: [{ at: 4, dmg: CGPT_CLONE.guardDmg, launch: CGPT_CLONE.guardLaunch, kb: 4, hitstun: 30, box: { x: -side > 0 ? c.x - 10 : c.x - (md.rangeX || 96), y: c.feet - fh(f), w: (md.rangeX || 96) + 10, h: fh(f) } }] })
      c.act.total = 22; c.tell = null; g.stats.guards++; burst(s, 'streakTail', c.from, c.feet, 12, { dir: -side }); cue(f, 'counter')
      return
    }
    if (c.tell.t >= CGPT_CLONE.guardTell + CGPT_CLONE.guardWait) { c.tell = null; c.cd = 20 }
    return
  }
  cloneMoveToward(f, c, ctrX(f) + (f.facing || 1) * CGPT_CLONE.followFront, X)
  c.pose = c.moving ? 'run' : 'guard'
  c.feet = Math.round(floorY(f) > c.feet + 40 ? floorY(f) : c.feet + (floorY(f) - c.feet) * 0.5)
  if (c.cd <= 0 && c.allowance > 0) { const th = threatNear(f, opp, c, X); if (th) { c.tell = { t: 0, kind: th }; cue(f, 'parry') } }
}

// ── FAULT MARKERS ────────────────────────────────────────────────────────────────────────────────────────────────────
export function placeFault(f, x, X) {
  const s = f._ninja, g = cgState(f)
  g.faults.push({ id: ++g.serial, x: Math.round(Math.max(0, Math.min(X.stageW(), x))), feet: Math.round(floorY(f)), life: CGPT_FAULT.life })
  while (g.faults.length > CGPT_FAULT.max) g.faults.shift()
  g.stats.faults++; burst(s, 'dust', x, floorY(f), 14); cue(f, 'rumble')
}
function tickFaults(g) { for (const m of g.faults) m.life--; g.faults = g.faults.filter(m => m.life > 0) }

// ── custom move kinds (ninja.js runMoveKind default → ext.run) ───────────────────────────────────────────────────────
function run(f, opp, s, a, t, X) {
  const g = cgState(f), md = getNinjaProfile(f).moves[a.name] || {}, k = a.nj?.kind
  if (k === 'cgFault' && t >= md.startup - 1 && !a._fault) {   // the strike's impact point cracks the floor (the frame before impact: the hit's own hitstop would delay the crack)
    a._fault = true; placeFault(f, ctrX(f) + (f.facing || 1) * (a.nj.markDx || 90), X)
  }
  if (k === 'cgErupt') {
    if (!a._at) {   // pick the eruption point: the fault marker nearest the foe (in range), else under the foe, else ahead
      let ex = ctrX(f) + (f.facing || 1) * 200, fault = null
      if (opp && opp.health > 0) {
        const near = g.faults.filter(m => Math.abs(m.x - ctrX(opp)) <= CGPT_FAULT.eruptRange).sort((p, q) => Math.abs(p.x - ctrX(opp)) - Math.abs(q.x - ctrX(opp)))[0]
        if (near) { ex = near.x; fault = near.id } else if (Math.abs(ctrX(opp) - ctrX(f)) <= X.RANGER_SCREEN * 0.45) ex = ctrX(opp)
      }
      a._at = { x: Math.round(X.clampX(f, ex - 55) + 55), fault }
      a._at.feet = Math.round(floorY(f))
      s.cgErupt = { x: a._at.x, feet: a._at.feet, t0: t, fault: !!fault }
    }
    if (t === md.startup - 6 && a._at) burst(s, 'dust', a._at.x, a._at.feet, 12)   // the rumble tell where it will burst
    if (t >= md.startup && a._at && !a._hit) {
      a._hit = true
      const fault = a._at.fault != null
      if (fault) { g.faults = g.faults.filter(m => m.id !== a._at.fault) }
      g.stats.erupts++
      const box = { x: a._at.x - 55, y: a._at.feet - 170, w: 110, h: 170 }
      s.cgLastBox = box; s.cgEruptFx = { x: a._at.x, feet: a._at.feet, t: 22, t0: 22, big: fault }
      burst(s, 'ring', a._at.x, a._at.feet, 18); cue(f, 'eruption'); cue(f, 'shake')
      if (opp && overlaps(box, oppBody(opp))) {
        const r = nsStrike(f, opp, md.nj.dmg * (fault ? CGPT_FAULT.bonus : 1), { damageType: 'blunt', move: a.name, launch: fault ? CGPT_FAULT.launch : md.nj.launch, kb: 2, hitstun: 40, dir: f.facing || 1 })
        if (r) a._contact = true
      }
    }
  }
  if (k === 'clone' || k === 'cgSwap') { f.vx = 0 }
}

// ── command hook (ninjaCommand.js, after the stun gates; 'consumed' | 'grab' | false) ──────────────────────────────────
function command(f, s, opp, raw, g0) {
  const g = cgState(f); if (!g) return false
  if (g.swap) return 'consumed'
  const a = f.attacking ? f.currentAttack : null, el = a ? elapsed(a) : 0
  const X = getNinjaProfile(f)._api
  // DOUBLE JUMP wins over ↑↑ / ↓↓: a vertical double-tap never becomes a Ninja Step (Jump = Up on the keyboard); ↓↓ on the
  // ground stays free for Earth Eruption (ninjaCommand reads the ↓↓ stamp itself)
  { const tap = doubleTap(f); if (tap && tap.vdir) s.usedTap = tap.at }
  // BLASTER → double-tap Ninja Step: a shot's recovery cancels into the step once the shot is out
  if (a && STEP_CANCEL[a.name] != null && el >= STEP_CANCEL[a.name]) {
    const tap = doubleTap(f)
    if (tap && !tap.vdir) { s.usedTap = tap.at; if (startStreak(f, opp, tap.dir, 0)) return 'consumed' }
  }
  // FOLLOW-UPS: Earth Eruption → Sky Blade (on contact), Gale Rush → air normals (on contact, once airborne)
  const fol = a && FOLLOW[a.name]
  if (fol && a._contact) {
    for (const b of ['upAttack', 'heavy', 'light']) {
      if (!fol[b] || !fresh(s, b)) continue
      if (a.name === 'sGaleRush' && (grounded(f) || el < (a.nj.frames || 0) + (getNinjaProfile(f).moves.sGaleRush.startup || 0))) continue
      use(s, b); if (nsStartMove(f, fol[b])) { cue(f, 'swingSword'); return 'consumed' }
    }
  }
  // CHARGE commands (Smoke Vanish chord Charge + Light + Heavy stays the framework's)
  if (fresh(s, 'charge', 12)) {
    if (live(s, 'light', 7) && live(s, 'heavy', 7)) return false
    if (s.tick - s.edgeAt.charge < 3) return a ? 'consumed' : 'grab'
    // the direction held AT the Charge press (facing-relative numpad token), so a quick →+L2 tap survives the chord window
    const tok = s.edgeDir?.charge, fwd = tok != null ? tok % 3 === 0 : !!(f.facing === -1 ? raw.left : raw.right), back = tok != null ? tok % 3 === 1 : !!(f.facing === -1 ? raw.right : raw.left)
    if (stunned(f) || s.sup) { use(s, 'charge'); return 'consumed' }
    use(s, 'charge')
    if (fwd && !back) { if (!startCloneSwap(f, opp, X)) say(f, g.clone ? (g.step.n < 1 ? 'NO STEP CHARGE' : 'CAN\'T SWAP') : 'NO CLONE', 30); return 'consumed' }
    if (back && !fwd) { if (!recallClone(f)) say(f, 'NO CLONE', 30); return 'consumed' }
    if (g.clone) { switchMode(f); return 'consumed' }
    if (a && !(a._contact || a.name === 'nsStreakRec')) return 'consumed'
    if (!summonClone(f, opp, X)) say(f, g.cd > 0 ? 'CLONE COOLDOWN' : 'NEED 30 NINJA POWER', 30)
    return 'consumed'
  }
  return false
}

// ── per-tick hook (after every framework system) ─────────────────────────────────────────────────────────────────────
function tick(f, opp, s, raw, X) {
  const g = cgState(f)
  getNinjaProfile(f)._api = X
  applyLook(f)
  if (g.cd > 0 && !g.clone) g.cd--
  tickStep(f, s, g)
  tickFaults(g)
  if (g.swap) stepSwap(f, opp, s, g, X)
  else if (f.currentMove === 'cgSwap' && f._rooted) f._rooted = false
  tickClone(f, opp, s, g, X)
  if (s.cgEruptFx && --s.cgEruptFx.t <= 0) s.cgEruptFx = null
  if (g.ult && !s.sup) ultCleanup(f, opp, s, g)   // the ultimate ended or was cut short → restore every state it touched
}

// ── ULTIMATE: TWIN TEMPEST — FAULTLINE CATACLYSM ─────────────────────────────────────────────────────────────────────
export function cgptUlt(f, opp, s, a, t, X) {
  const U = CGPT_ULT, g = cgState(f)
  if (!a._supInit) {
    a._supInit = true
    s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: a.name }
    g.ult = { t: 0, clone: null, spin: 0, ox: null, oy: null, ofeet: null }
    g.stats.ults++
    burst(s, 'smoke', ctrX(f), feetY(f), 18); cue(f, 'ultStart')
    if (opp) opp.hitstop = Math.max(opp.hitstop || 0, 6)
    say(f, 'TWIN TEMPEST!', 70)
  }
  const u = s.sup, G = g.ult; if (!G || !u) return   // already cleaned up (the move's last frames after CGPT_ULT.end)
  G.t = t
  const strike = (dmg, o = {}) => {
    if (!opp || u.res === 'whiff' || (u.res === 'blocked' && !o.first)) return false
    const r = X.nsStrike(f, opp, dmg, { fixedScale: u.scale, locked: u.res === 'hit', hitstun: o.hitstun ?? 70, kb: o.kb ?? 0, launch: o.launch, knockdown: o.knockdown,
      move: 'sSuper', damageType: o.type || 'slash', noKO: !!o.noKO, blockstun: 22, sparkX: o.sx, sparkY: o.sy, cue: o.cue })
    if (o.first) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
    if (r === true) { u.hits++; u.dmg += dmg; g.stats.ultHits++; g.stats.ultRaw = (g.stats.ultRaw || 0) + dmg }
    return r
  }
  if (!opp) return
  // 1. the opening sword strike — it MUST connect, or the ultimate ends here (meter spent)
  if (t === 2) X.setPose(f, 'sword1')
  if (t === U.openAt) {
    const dir = f.facing || 1, box = { x: dir > 0 ? f.x + fw(f) - 10 : f.x - U.openReach + 10, y: f.y - 10, w: U.openReach, h: fh(f) + 20 }
    s.cgLastBox = box
    if (overlaps(box, oppBody(opp))) strike(U.openDmg, { first: true, cue: 'slashHit', hitstun: 80 })
    else u.res = 'whiff'
    if (u.res !== 'hit') { a.timer = Math.min(a.timer, Math.max(1, U.whiffEnd - t)); say(f, u.res === 'blocked' ? 'BLOCKED' : 'MISSED', 40); return }
    G.ox = Math.round(ctrX(opp)); G.ofeet = Math.round(feetY(opp)); G.floor = Math.round(floorY(f))
    if (g.clone) dissolveClone(f, 'ult', 0)   // a live clone becomes the ultimate's partner (re-formed on the far side)
  }
  if (u.res !== 'hit' || G.ox == null) return
  const side = f.facing || 1   // the Ranger starts on this side of the foe; the clone appears opposite
  const hold = rise => { opp.x = X.clampX(opp, G.ox - (opp.w || 48) / 2); opp.y = G.ofeet - fh(opp) - rise; opp.vx = 0; opp.vy = 0; opp.onGround = false; opp.grounded = false; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.knockdownState = false }
  // 2. the clone appears opposite the foe
  if (t === U.cloneIn) { G.clone = { x: Math.round(G.ox + side * 80), feet: G.ofeet, dir: -side, pose: 'nsVanishOut', alive: true }; X.burst(s, 'smoke', G.clone.x, G.ofeet, 16); X.cue(f, 'smokePop') }   // light puffs: the big R23 frame would hide the opening
  // 3. the rising wind spiral: clone, Ranger, clone, … alternate around the foe
  if (t >= U.cloneIn && t < U.apexAt) {
    const k = Math.min(1, Math.max(0, (t - U.cloneIn) / (U.spiral[U.spiral.length - 1] - U.cloneIn)))
    const rise = Math.round(U.rise * k); hold(rise); G.spin = t; G.rise = rise
    f._rooted = true; f.vx = 0; f.vy = 0; f.onGround = false; f.grounded = false
    U.spiral.forEach((at, i) => {
      if (t !== at) return
      const realTurn = i % 2 === 1, sd = (i % 4 < 2 ? 1 : -1) * side
      if (realTurn) { f.x = X.clampX(f, G.ox - sd * 74 - fw(f) / 2); f.facing = sd > 0 ? 1 : -1; X.setPose(f, i === 5 ? 'swordRise' : 'sword2') }
      else if (G.clone) { G.clone.x = Math.round(G.ox + sd * 74); G.clone.dir = sd > 0 ? -1 : 1; G.clone.pose = ['kickHeavy', 'stringEnd', 'airKick'][i >> 1] }
      strike(U.spiralDmg, { noKO: !realTurn, cue: realTurn ? 'slashHit' : 'impact', sx: G.ox, sy: G.ofeet - rise - fh(opp) / 2, type: realTurn ? 'slash' : 'energy' })
      X.burst(s, 'wind', G.ox, G.ofeet - rise, 12)
    })
    // bodies ride the spiral with the foe
    f.y = G.ofeet - fh(f) - Math.max(0, (G.rise || 0) - 20)
    if (G.clone) G.clone.feet = G.ofeet - Math.max(0, (G.rise || 0) - 20)
    if (t === U.cloneIn + 4) X.cue(f, 'tornado')
  }
  // 4. the real Ranger rises above and comes down fast
  if (t >= U.apexAt && t < U.diveAt) {
    hold(U.rise); f._rooted = true; f.vx = 0; f.vy = 0
    const k = (t - U.apexAt) / (U.diveAt - U.apexAt)
    f.x = X.clampX(f, G.ox - fw(f) / 2 - side * 20 * (1 - k)); f.y = G.ofeet - fh(f) - U.rise - 140 + Math.round(140 * k * k)
    X.setPose(f, t < U.apexAt + 4 ? 'airSpin' : 'dropDive'); if (G.clone) G.clone.pose = 'guard'
  }
  if (t === U.diveAt) { strike(U.diveDmg, { cue: 'impact', type: 'blunt', sx: G.ox }); X.setPose(f, 'dive') }
  if (t > U.diveAt && t < U.eruptAt) {   // both come down together onto the floor
    const k = (t - U.diveAt) / (U.eruptAt - U.diveAt), rise = Math.round(U.rise * (1 - k))
    hold(rise); f.y = G.ofeet - fh(f) - rise; f._rooted = true; f.vy = 0
    if (G.clone) { G.clone.feet = G.ofeet - rise; G.clone.pose = 'airSpin' }   // the partner comes down with them
  }
  // 5. the impact: a huge earth eruption (supplied burst + dome frames, procedural rock in nsCgptFx)
  if (t === U.eruptAt) {
    f.y = G.floor - fh(f); f.onGround = true; f.grounded = true; f.vy = 0; X.setPose(f, 'superSlam')
    if (G.clone) { G.clone.feet = G.floor; G.clone.pose = 'landRecover' }
    opp.y = G.ofeet - fh(opp)
    s.cgEruptFx = { x: G.ox, feet: G.floor, t: 34, t0: 34, big: true, ult: true }
    for (const m of g.faults) if (Math.abs(m.x - G.ox) < 600) X.burst(s, 'ring', m.x, m.feet, 18)   // every fault on screen answers (cosmetic)
    g.faults = []
    strike(U.eruptDmg, { cue: 'eruption', type: 'blunt', launch: -16, kb: 7 * side, knockdown: true, hitstun: 60 })
    X.cue(f, 'shake'); X.burst(s, 'ring', G.ox, G.floor, 22)
  }
  if (t === U.eruptAt + 6) X.setPose(f, 'landRecover')
  // 6. the clone dissolves as the impact clears
  if (t === U.cloneOut && G.clone) { X.burst(s, 'smokeFade', G.clone.x, G.clone.feet, 16); G.clone = null }
  if (t > U.eruptAt) { f._rooted = false }
  if (t >= U.end - 1) ultCleanup(f, opp, s, g)
}
function ultCleanup(f, opp, s, g) {
  if (!g.ult) return
  const landed = s.sup?.res === 'hit'
  g.ult = null
  f._rooted = false; f.vy = Math.max(0, f.vy || 0)
  if (!grounded(f) && f.y + fh(f) > floorY(f) - 1) { f.onGround = true; f.grounded = true }
  if (landed) g.cd = Math.max(g.cd, CGPT_CLONE.cooldown)   // the partner clone dissolved → the normal re-summon cooldown
  if (opp && opp._cgHeld) delete opp._cgHeld
}

// ── CPU (ai.js hook): presses the REAL Charge button (replay / LAN identical) — summons the clone in range when it can afford
//    it, then flips Echo ⇄ Guard by the foe's habit (Guard vs an attacker in its face, Echo otherwise). Visible state only. ──
export function cgptAiInput(controller, f, opp, input) {
  if (f?.rosterKey !== CGPT_ID || !input || !opp || controller?.difficulty === 'dummy') return input
  const s = f._ninja, g = s?.cg; if (!g || s.sup || g.swap || f.attacking || stunned(f)) return input
  const c = (f._cgAi ||= { last: -1e9, hold: 0 })
  // ai.js field names (game.js applyAIInputToKeys): toggle = the Charge key; everything else released so it is a clean,
  // neutral Charge press (neutral = summon / switch — never a swap or recall)
  const neutral = () => { for (const k of ['left', 'right', 'down', 'jump', 'block', 'lightAttack', 'heavyAttack', 'upAttack', 'downAir', 'special1', 'special2', 'ultimate', 'grab']) input[k] = false }
  if (c.hold > 0) { c.hold--; neutral(); input.toggle = c.hold > 0; return input }
  if (s.clock - c.last < 150) return input
  const dist = Math.abs(ctrX(opp) - ctrX(f))
  const wantGuard = !!(opp.attacking && dist < 220)
  const summon = !g.clone && g.cd <= 0 && s.np >= CGPT_CLONE.cost + 10 && dist < 420
  const flip = g.clone && g.clone.phase === 'idle' && ((wantGuard && g.clone.mode === 'echo') || (!wantGuard && g.clone.mode === 'guard' && dist > 260))
  if (summon || flip) { c.last = s.clock; c.hold = 5; neutral(); input.toggle = true }   // held 5 frames: past the 3-frame Vanish-chord window
  return input
}

export const CGPT_EXT = { tick, command, run, stepGate, onStep, alpha }
export { gainNP }
