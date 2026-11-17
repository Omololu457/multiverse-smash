// animeJuice.js — GAME-WIDE "make it anime" pass (PRESENTATION ONLY). One layer every fighter gets, built from the
// owner's twelve effect breakdowns (level-up, parry, spirit bomb, gatling, water dragon, rock line, fire breath, iai slash,
// stretch punch, moon slash, beam, spiral orb), mapped onto what a fighting game shares:
//   • ULTIMATE READY  — the meter races then CRAWLS the last bit (ui.js reads animeMeterRatio), then a flash + burst, a
//                       PILLAR of light with rings rippling over the floor, a rising whoosh + a warm chime, "ULTIMATE READY"
//                       slammed by the bar.
//   • GATHER          — every special / ultimate start: energy pours in on a spiral to the hand; ultimates grow the core in
//                       STAGES (pop, pop, pop) with a ring + a small shake per stage.
//   • PARRY           — a true parry / a flawless block: contact flash, a burst of sparks, a ring of light, a bright TING over a
//                       heavy CLANG; a true parry also pushes the camera in.
//   • GATLING         — consecutive hits of one move: every hit pops a shock ring (bigger as the string ramps) + shakes; the
//                       string's end = a big final ring.
//   • SLASH           — sword / slash hits: a thin glowing cut line across the target (white core, coloured glow).
//   • AFTERMATH       — ultimates + heavy specials leave the floor marked by element, then fade (most of the effect is the
//                       fade): glowing crater (energy / light / dark / lightning), burned floor + embers (fire), a puddle that
//                       slowly dries (water), frost (ice), a cooling scar line (slashes), cracks + dust (wind / earth).
// Never touches fighters, GAME_STATE, damage, frames or hit boxes: it only READS sparks + fighters. Deterministic (integer
// hash of frame / side / slot, no Math.random). Gates: Hit Effects off → nothing; Reduce Flashing → no flashes (a soft
// version); Particles Low → fewer particles; Screen Shake setting is applied inside camera.shake.
import { juiceSettings } from './juiceSettings.js'
import { camera } from './camera.js'
import { sound } from './sound.js'
import { elementFor, elementColor } from './juice_elements.js'
import { sigFamily, sigOnStart, sigOnHit, sigTick, sigReset, sigStatus, drawSigWorld, drawSigFloor, drawSigHud, sigLevel } from './animeSignatures.js'   // Phase 2: signature moves
export { sigTakeImpacts as animeSigTakeImpacts, sigFeel as animeSigFeel, SIGNATURE_MOVES } from './animeSignatures.js'
let _splitGate = () => false   // game.js: the existing brutality / blood eligibility rule (splits only where gore is allowed)
export function setAnimeSplitGate(fn) { if (typeof fn === 'function') _splitGate = fn }

const on = () => { try { return juiceSettings.hitEffectsOn() } catch (_) { return true } }
const noFlash = () => !!juiceSettings.reduceFlashing
const pN = n => Math.max(1, Math.round(n * (juiceSettings.particleScale?.() ?? 1)))
const R = Math.round
function H(a, b, c) {   // deterministic 0..1
  let h = (Math.imul((a | 0) ^ 0x9e3779b9, 2654435761) ^ Math.imul((b | 0) + 7, 40503) ^ Math.imul((c | 0) + 13, 2246822519)) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`
const sideIdx = s => s === 'p2' ? 1 : 0
const floorOf = f => (f?.groundY ?? ((f?.y || 0) + (f?.h || 100)))
const ctrX = f => (f?.x || 0) + (f?.w || 60) / 2
const SLASH_RX = /slash|sword|blade|katana|\bcut\b|iai|getsuga|zangetsu|slice|moon|sever|cleave|edge|santoryu|ittoryu|nitoryu|kenjutsu|saber|sabre|scythe|tsuki/i
const HEAVY_SPECIAL = 60   // a special at / over this damage leaves an aftermath

const S = { prevCast: [null, null], fx: [], decals: [], slams: [], chain: [null, null], prevMove: [null, null], prevUlt: [false, false], ready: [null, null], meter: new WeakMap(), frame: 0 }
export function animeJuiceReset() { sigReset(); S.fx.length = 0; S.decals.length = 0; S.slams.length = 0; S.chain = [null, null]; S.prevMove = [null, null]; S.prevUlt = [false, false]; S.ready = [null, null]; S.prevCast = [null, null] }
export function animeJuiceStatus() { return { sig: sigStatus(), fx: S.fx.length, decals: S.decals.length, slams: S.slams.length, kinds: S.fx.map(e => e.kind), decalKinds: S.decals.map(d => d.kind), ready: S.ready.map(r => r ? { state: r.state, t: r.t } : null) } }
const push = (arr, e, cap) => { arr.push(e); if (arr.length > cap) arr.shift() }

// ── sounds (synth recipes live in sound.js: aj_whoosh / aj_chime / aj_ting / aj_clang) ──
const play = id => { try { sound.play(id) } catch (_) {} }

// ── ULTIMATE meter: the displayed fill races, then crawls the last 15 % (ui.js calls this with the real 0..1 ratio) ──
export function animeMeterRatio(f, real, frame) {
  if (!f || !on()) return real
  let m = S.meter.get(f)
  if (!m) { m = { disp: real, frame }; S.meter.set(f, m); return real }
  if (m.frame === frame) return m.disp
  m.frame = frame
  if (real <= m.disp) m.disp = real                                   // spending / draining: instant
  else {
    const gap = real - m.disp
    const fast = Math.max(0.006, gap * 0.28), crawl = 0.0055      // race ... then crawl the last bit (~27 frames for 15 %)
    m.disp = Math.min(real, m.disp + (m.disp >= 0.85 && real >= 0.95 ? Math.min(fast, crawl) : fast))
  }
  return m.disp
}
const ultCost = f => { const c = f?.ultimate?.cost; return Math.max(1, c > 0 ? Math.min(c, f.maxEnergy || 100) : (f?.maxEnergy || 100)) }   // a cost-less ultimate (cooldown / form gated) = the bar full
const isReady = f => !!f && (f.energy || 0) >= ultCost(f) && !(f.ultimateCooldown > 0) && !f.traits?.hideResourceMeter && f.traits?.energyType !== 'none' && (f.maxEnergy || 0) > 0
const dispCaught = f => { const m = S.meter.get(f); if (!m) return true; return m.disp >= Math.min(1, (f.energy || 0) / Math.max(1, f.maxEnergy || 100)) - 0.002 }

// ── per-frame tick (sim frame; read-only on fighters) ──
export function animeJuiceTick(p1, p2, frame) {
  S.frame = frame | 0
  const fs = [p1, p2]
  for (let i = 0; i < 2; i++) {
    const f = fs[i]; if (!f) continue
    // ULTIMATE READY: rising edge → wait for the bar's crawl to land → ceremony
    const rd = isReady(f), r = S.ready[i]
    if (rd && !r) { S.ready[i] = { state: 'filling', t: 0 }; if (on()) play('aj_whoosh') }
    else if (!rd && r) S.ready[i] = null
    const q = S.ready[i]
    if (q && q.state === 'filling' && (++q.t > 45 || (q.t > 4 && dispCaught(f)))) { q.state = 'done'; if (on()) readyCeremony(f, i) }
    // GATHER: a special / the ultimate starting
    const mv = f.currentMove || null, ult = !!f.isUltimateActive
    const startedUlt = ult && !S.prevUlt[i]
    const startedSp = mv && mv !== S.prevMove[i] && !!(f.specials && !Array.isArray(f.specials) && f.specials[mv])
    const newMove = mv && mv !== S.prevMove[i]
    S.prevMove[i] = mv; S.prevUlt[i] = ult
    if (on() && (startedUlt || newMove) && sigLevel() !== 'off') {   // SIGNATURE: a mapped move begins (specials, ultimates, mapped normals)
      const sp = f.specials && !Array.isArray(f.specials) ? f.specials[mv] : null
      const fam = sigFamily(f, startedUlt ? 'ultimate' : mv, startedUlt ? f.ultimate?.name : (sp?.name || f.currentAttack?.name), startedUlt)
      if (fam) sigOnStart(f, i, fam, startedUlt, frame, fs[1 - i])
    }
    const cast = f._spriteCastMove || null   // casts that spawn their projectile later (Kamehameha, Spirit Bomb …) start here
    if (cast && cast !== S.prevCast[i] && on() && sigLevel() !== 'off' && !newMove && !startedUlt) { const fam = sigFamily(f, cast, null, false); if (fam) sigOnStart(f, i, fam, false, frame, fs[1 - i]) }
    S.prevCast[i] = cast
    if (on() && (startedUlt || startedSp)) {
      const el = elementFor(f.rosterKey, { currentMove: mv, isUltimate: startedUlt, ultVariant: f._ultVariant || f._form })
      push(S.fx, { kind: 'gather', side: i, t: 0, life: startedUlt ? 30 : 18, ult: startedUlt, col: elementColor(el), seed: frame }, 40)
    }
    // GATLING string ended → the big final ring
    const c = S.chain[i]
    if (c && frame - c.last > 16) { if (c.n >= 4 && on()) { push(S.fx, { kind: 'ring', x: c.x, y: c.y, t: 0, life: 18, r0: 30, grow: 7, w: 5, col: c.col }, 40); try { camera.shake(6, 10) } catch (_) {} } S.chain[i] = null }
  }
  sigTick(fs, frame)
  for (let k = S.fx.length - 1; k >= 0; k--) if (++S.fx[k].t > S.fx[k].life) S.fx.splice(k, 1)
  for (let k = S.decals.length - 1; k >= 0; k--) if (++S.decals[k].t > S.decals[k].life) S.decals.splice(k, 1)
  for (let k = S.slams.length - 1; k >= 0; k--) if (++S.slams[k].t > S.slams[k].life) S.slams.splice(k, 1)
}
function readyCeremony(f, i) {
  const col = [255, 226, 140]
  push(S.fx, { kind: 'pillar', x: ctrX(f), y: floorOf(f), top: (f.y || 0), t: 0, life: 56, col, seed: S.frame + i }, 40)
  push(S.slams, { side: i, t: 0, life: 90 }, 4)
  play('aj_chime')
}

// ── the hit hook: every FRESH spark (melee, projectile, parry, block) — game.js updateEffectsAndDomains ──
export function animeJuiceOnSpark(spark, p1, p2, frame) {
  if (!spark || !on()) return
  const fr = frame | 0, ai = spark.attackerSide === 'p2' ? 1 : 0, att = ai ? p2 : p1, def = ai ? p1 : p2
  // PARRY (combat.checkParry) — the perfect one
  if (spark.category === 'parry') { parryFx(spark.x, spark.y, true, fr); return }
  if (spark.category === 'clash') return
  if (spark.blocked) {   // a FLAWLESS block = the parry (combat tags the spark: flawless / perfectParry)
    if (spark.flawless) { parryFx(spark.x, spark.y, !!spark.perfectParry, fr); return }
    const d = spark.attackerSide ? def : (p1?._flawlessFlash >= 11 ? p1 : p2?._flawlessFlash >= 11 ? p2 : null)
    if (d && (d._flawlessFlash || 0) >= 11) parryFx(spark.x, spark.y, false, fr)
    return
  }
  if (!att || !def) return
  // PARRY COUNTER landed (×1.2): slam "COUNTER" over the hit + a hot ring
  if (spark.parryCounter) {
    push(S.fx, { kind: 'counter', x: spark.x, y: spark.y - 30, t: 0, life: 40 }, 40)
    push(S.fx, { kind: 'ring', x: spark.x, y: spark.y, t: 0, life: 14, r0: 14, grow: 6, w: 4, col: [255, 120, 60] }, 40)
  }
  const cat = spark.category || 'light', name = String(spark.moveName || '')
  const isUlt = cat === 'ultimate' || !!att.isUltimateActive
  const el = elementFor(att.rosterKey, { currentMove: name || att.currentMove, isUltimate: isUlt, ultVariant: att._ultVariant || att._form })
  const col = elementColor(el)
  // GATLING: the same move connecting again within a few frames
  const c = S.chain[ai]
  if (c && c.move === name && fr - c.last <= 14) { c.n++; c.last = fr; c.x = spark.x; c.y = spark.y }
  else S.chain[ai] = { move: name, n: 1, last: fr, x: spark.x, y: spark.y, col }
  const n = S.chain[ai].n
  if (n >= 2) {
    push(S.fx, { kind: 'ring', x: spark.x + (H(fr, ai, 1) - 0.5) * 16, y: spark.y + (H(fr, ai, 2) - 0.5) * 16, t: 0, life: 10, r0: 8 + Math.min(n, 10) * 1.5, grow: 2.5 + Math.min(n, 10) * 0.35, w: 2, col }, 40)
    if (n >= 3) try { camera.shake(Math.min(2 + n * 0.4, 6), 4) } catch (_) {}
  }
  // SLASH: a thin glowing cut line across the target
  const slash = SLASH_RX.test(name) && (cat !== 'light')
  if (slash) push(S.fx, { kind: 'cut', x: ctrX(def), y: (def.y || 0) + (def.h || 100) * 0.45, t: 0, life: 20, ang: -0.35 + (H(fr, ai, 3) - 0.5) * 0.5, len: (def.h || 100) * 1.3, col }, 40)
  // SIGNATURE: the move's own breakdown (impact frame, dome / crown / fire / rocks / cut ...); owns the aftermath when it has one
  const fam = sigLevel() !== 'off' ? sigFamily(att, isUlt ? 'ultimate' : att.currentMove, name, isUlt) : null
  const owned = fam ? sigOnHit(spark, att, def, fam, fr, ai, { splitOk: !!_splitGate(att, def) }) : false
  // AFTERMATH: ultimates + heavy specials mark the floor under the target (one per attacker per 30 frames)
  const big = isUlt || (cat === 'special' && (spark.damage || 0) >= HEAVY_SPECIAL)
  if (big && !owned && !(S.decals.some(d => d.ai === ai && fr - d.born < 30))) {
    const kind = slash ? 'scar' : el === 'fire' ? 'burn' : el === 'water' ? 'puddle' : el === 'ice' ? 'frost' : el === 'wind' ? 'crack' : 'crater'
    push(S.decals, { kind, ai, born: fr, x: ctrX(def), y: floorOf(def), w: isUlt ? 150 : 100, t: 0, life: isUlt ? 300 : 200, col, dir: (att.facing || 1), seed: fr * 3 + ai }, 6)
  }
}
function parryFx(x, y, perfect, fr) {
  push(S.fx, { kind: 'parry', x, y, t: 0, life: perfect ? 28 : 20, perfect, seed: fr }, 40)
  play('aj_ting'); play('aj_clang')
  if (perfect) push(S.fx, { kind: 'ring', x, y, t: 0, life: 30, r0: 16, grow: 9, w: 6, col: [255, 236, 150] }, 40)   // PERFECT: the ring BLOOMS
  if (perfect) { try { camera.zoom = Math.min((camera.maxZoom || 1.15) * 1.08, camera.zoom * 1.06); camera.shake(5, 8) } catch (_) {} }   // the push-in (eases back by itself)
}

// ── draw: FLOOR (world space, under the fighters) ──
export function drawAnimeJuiceFloor(c) {
  if (on()) drawSigFloor(c)
  if (!S.decals.length || !on()) return
  c.save()
  for (const d of S.decals) {
    const k = d.t / d.life, fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, hot = Math.max(0, 1 - d.t / 120), w = d.w
    if (d.kind === 'puddle') {   // water lands, then slowly dries
      const s = 1 - 0.6 * k
      c.globalAlpha = 0.55 * fade; c.fillStyle = 'rgb(40,110,200)'; c.beginPath(); c.ellipse(R(d.x), R(d.y - 2), R(w * 0.6 * s), R(7 * s + 2), 0, 0, 7); c.fill()
      c.globalAlpha = 0.5 * fade; c.fillStyle = 'rgb(170,220,255)'; c.beginPath(); c.ellipse(R(d.x - w * 0.12), R(d.y - 4), R(w * 0.2 * s), R(2 * s + 1), 0, 0, 7); c.fill()
      continue
    }
    if (d.kind === 'scar') {   // a glowing line torn in the floor that slowly cools
      c.globalAlpha = 0.8 * fade; c.fillStyle = 'rgb(30,26,24)'; c.fillRect(R(d.x - w * 0.7), R(d.y - 2), R(w * 1.4), 4)
      c.globalAlpha = hot * fade; c.fillStyle = rgba(d.col, 1); c.fillRect(R(d.x - w * 0.7 * hot - 4), R(d.y - 1), R(w * 1.4 * hot + 8), 2)
      c.globalAlpha = hot * hot * fade; c.fillStyle = '#ffffff'; c.fillRect(R(d.x - w * 0.4 * hot), R(d.y - 1), R(w * 0.8 * hot), 1)
      continue
    }
    if (d.kind === 'frost') {
      c.globalAlpha = 0.6 * fade; c.fillStyle = 'rgb(210,240,255)'; c.beginPath(); c.ellipse(R(d.x), R(d.y - 1), R(w * 0.6), 6, 0, 0, 7); c.fill()
      c.fillStyle = '#ffffff'
      for (let j = 0; j < 7; j++) { const px = d.x + (H(d.seed, j, 1) - 0.5) * w, h = 4 + H(d.seed, j, 2) * 10; c.globalAlpha = 0.8 * fade; c.beginPath(); c.moveTo(R(px - 2), R(d.y)); c.lineTo(R(px), R(d.y - h)); c.lineTo(R(px + 2), R(d.y)); c.fill() }
      continue
    }
    if (d.kind === 'crack') {
      c.globalAlpha = 0.75 * fade; c.strokeStyle = 'rgb(40,34,30)'; c.lineWidth = 2
      for (let j = 0; j < 5; j++) { let px = d.x, py = d.y; const sx = j % 2 ? 1 : -1; c.beginPath(); c.moveTo(R(px), R(py)); for (let s = 1; s <= 4; s++) { px = d.x + sx * w * 0.6 * s / 4 * (0.5 + H(d.seed, j, 0)); py = d.y + (H(d.seed, j, s) - 0.4) * 5; c.lineTo(R(px), R(py)) } c.stroke() }
      if (d.t < 50) for (let j = 0; j < pN(8); j++) { const tt = d.t, px = d.x + (H(d.seed, j, 7) - 0.5) * w, py = d.y - 4 - tt * (0.3 + H(d.seed, j, 8) * 0.4); c.globalAlpha = 0.35 * (1 - tt / 50); c.fillStyle = 'rgb(170,150,120)'; c.beginPath(); c.arc(R(px), R(py), R(4 + tt * 0.25), 0, 7); c.fill() }
      continue
    }
    // crater / burn: a dark bowl with a glowing edge that cools, smoke, sparks raining down slowly / embers drifting up
    const burn = d.kind === 'burn'
    c.globalAlpha = 0.7 * fade; c.fillStyle = burn ? 'rgb(28,18,12)' : 'rgb(24,22,26)'; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.6), 9, 0, 0, 7); c.fill()
    c.globalAlpha = 0.9 * hot * fade; c.strokeStyle = rgba(burn ? [255, 140, 40] : d.col, 1); c.lineWidth = 3; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.6), 9, 0, Math.PI, 2 * Math.PI); c.stroke()
    c.globalAlpha = 0.6 * hot * fade; c.strokeStyle = '#fff4d0'; c.lineWidth = 1; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.6 - 4), 6, 0, Math.PI, 2 * Math.PI); c.stroke()
    if (d.t < 150) for (let j = 0; j < pN(6); j++) {   // smoke rising + spreading
      const tt = d.t + j * 9, px = d.x + (H(d.seed, j, 11) - 0.5) * w * 0.8 + Math.sin(tt * 0.04 + j) * 6, py = d.y - 8 - (tt % 150) * 0.55
      c.globalAlpha = 0.18 * (1 - (tt % 150) / 150) * fade; c.fillStyle = burn ? 'rgb(70,60,55)' : 'rgb(120,115,125)'; c.beginPath(); c.arc(R(px), R(py), R(8 + (tt % 150) * 0.12), 0, 7); c.fill()
    }
    for (let j = 0; j < pN(10); j++) {   // sparks raining down slowly (crater) / embers floating up (burn)
      const life = 90, tt = (d.t + R(H(d.seed, j, 21) * life)) % life, px = d.x + (H(d.seed, j, 22) - 0.5) * w * 1.1 + Math.sin(tt * 0.08 + j) * 5
      const py = burn ? d.y - 6 - tt * 0.9 : d.y - 120 + tt * 1.3
      if (py > d.y) continue
      c.globalAlpha = (1 - tt / life) * fade * Math.min(1, d.t / 10); c.fillStyle = burn ? (j % 2 ? 'rgb(255,190,80)' : 'rgb(255,110,40)') : (j % 2 ? '#ffffff' : rgba(d.col, 1))
      c.fillRect(R(px), R(py), 2, 2)
    }
  }
  c.restore()
}

// ── draw: WORLD (over the fighters + sparks) ──
// PARRY TELL: a glint runs down the weapon / fist edge in the last TELL_FRAMES before a heavy / special / ultimate goes active
const TELL_FRAMES = 6
export function attackTell(f) {   // → 0..1 progress of the glint, or -1
  const a = f?.currentAttack; if (!a || a.activeStart == null || a.total == null) return -1
  const heavy = a.isUltimate || a.isSpecial || a.launcher || a.spike || a.category === 'heavy' || a.category === 'launcher' || a.category === 'spike'
  if (!heavy) return -1
  const toActive = a.activeStart - (a.total - a.timer)
  return toActive >= 1 && toActive <= TELL_FRAMES ? 1 - (toActive - 1) / TELL_FRAMES : -1
}
function drawTell(c, f) {
  const p = attackTell(f); if (p < 0) return
  const d = f.facing || 1, w = f.w || 60, h = f.h || 100
  const x0 = ctrX(f) + d * w * 0.15, y0 = (f.y || 0) + h * 0.32, x1 = ctrX(f) + d * w * 0.95, y1 = (f.y || 0) + h * 0.5   // along the arm / blade
  const gx = x0 + (x1 - x0) * p, gy = y0 + (y1 - y0) * p, a = noFlash() ? 0.5 : 0.95, L = 11 + 9 * Math.sin(p * Math.PI)
  c.globalAlpha = 0.25 * a; c.fillStyle = 'rgb(255,240,190)'; c.beginPath(); c.arc(R(gx), R(gy), R(L * 0.7), 0, 7); c.fill()
  c.globalAlpha = 0.45 * a; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(R(x0), R(y0)); c.lineTo(R(gx), R(gy)); c.stroke()
  c.globalAlpha = a; c.fillStyle = '#ffffff'
  c.beginPath(); c.moveTo(R(gx - L), R(gy)); c.lineTo(R(gx), R(gy - 1.5)); c.lineTo(R(gx + L), R(gy)); c.lineTo(R(gx), R(gy + 1.5)); c.fill()   // the 4-point star
  c.beginPath(); c.moveTo(R(gx), R(gy - L)); c.lineTo(R(gx - 1.5), R(gy)); c.lineTo(R(gx), R(gy + L)); c.lineTo(R(gx + 1.5), R(gy)); c.fill()
  c.globalAlpha = 0.5 * a; c.fillStyle = 'rgb(255,240,190)'; c.beginPath(); c.arc(R(gx), R(gy), 3, 0, 7); c.fill()
}
export function drawAnimeJuiceWorld(c, p1, p2) {
  if (!on()) return
  const fs = [p1, p2]
  c.save()
  for (const f of fs) if (f) drawTell(c, f)
  drawSigWorld(c, fs)
  for (const e of S.fx) {
    const k = e.t / e.life
    if (e.kind === 'gather') {
      const f = fs[e.side]; if (!f) continue
      const d = f.facing || 1, hx = ctrX(f) + d * (f.w || 60) * 0.45, hy = (f.y || 0) + (f.h || 100) * (e.ult ? 0.3 : 0.42)
      const p = Math.min(1, e.t / (e.life * 0.75)), n = pN(e.ult ? 16 : 10)
      for (let j = 0; j < n; j++) {   // energy pouring in from everywhere on a spiral
        const a0 = H(e.seed, j, 31) * Math.PI * 2, an = a0 + p * 2.6, r = (e.ult ? 120 : 70) * (1 - p) * (0.6 + 0.4 * H(e.seed, j, 32)) + 4
        const px = hx + Math.cos(an) * r, py = hy + Math.sin(an) * r * 0.8
        c.globalAlpha = 0.3 + 0.7 * p; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 2
        c.beginPath(); c.moveTo(R(px), R(py)); c.lineTo(R(hx + Math.cos(an - 0.35) * (r + 12)), R(hy + Math.sin(an - 0.35) * (r + 12) * 0.8)); c.stroke()
      }
      // the core: smooth for specials; for ultimates it grows in STAGES (pop, pop, pop) with a ring each jump
      const stage = e.ult ? Math.min(3, Math.floor(e.t / 7)) : 0, cr = e.ult ? 6 + stage * 6 : 3 + 7 * p
      c.globalAlpha = 0.35; c.fillStyle = rgba(e.col, 1); c.beginPath(); c.arc(R(hx), R(hy), R(cr * 1.9), 0, 7); c.fill()
      c.globalAlpha = 0.95; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(R(hx), R(hy), R(cr), 0, 7); c.fill()
      if (e.ult && e.t % 7 === 0 && e.t > 0 && e.t < 28 && !e[`s${stage}`]) { e[`s${stage}`] = 1; try { camera.shake(3 + stage, 5) } catch (_) {} }
      if (e.ult) { const st = e.t % 7; if (e.t >= 7 && st < 5) { c.globalAlpha = 0.8 * (1 - st / 5); c.strokeStyle = rgba(e.col, 1); c.lineWidth = 2; c.beginPath(); c.arc(R(hx), R(hy), R(cr + st * 6), 0, 7); c.stroke() } }
    } else if (e.kind === 'pillar') {   // ULTIMATE READY: flash + burst, a beam shoots up, rings ripple across the floor
      if (e.t < 8) {
        const a = noFlash() ? 0.25 : 0.9, r = 30 + e.t * 12, g = c.createRadialGradient(R(e.x), R(e.top + 40), 0, R(e.x), R(e.top + 40), R(r))
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, rgba(e.col, a * 0.5)); g.addColorStop(1, 'rgba(255,255,255,0)')
        c.globalAlpha = 1 - e.t / 8; c.fillStyle = g; c.beginPath(); c.arc(R(e.x), R(e.top + 40), R(r), 0, 7); c.fill()
        c.globalAlpha = 1 - e.t / 8; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 2
        for (let j = 0; j < 12; j++) { const an = j / 12 * Math.PI * 2, r1 = 20 + e.t * 10, r2 = r1 + 18; c.beginPath(); c.moveTo(R(e.x + Math.cos(an) * r1), R(e.top + 40 + Math.sin(an) * r1)); c.lineTo(R(e.x + Math.cos(an) * r2), R(e.top + 40 + Math.sin(an) * r2)); c.stroke() }
      }
      const up = Math.min(1, e.t / 6), wid = 34 * (e.t < 10 ? up : Math.max(0, 1 - (e.t - 10) / 40)), H0 = 520
      if (wid > 0.5) {
        const g = c.createLinearGradient(R(e.x - wid), 0, R(e.x + wid), 0)
        g.addColorStop(0, rgba(e.col, 0)); g.addColorStop(0.35, rgba(e.col, 0.55)); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(0.65, rgba(e.col, 0.55)); g.addColorStop(1, rgba(e.col, 0))
        c.globalAlpha = noFlash() ? 0.5 : 0.9; c.fillStyle = g; c.fillRect(R(e.x - wid), R(e.y - H0 * up), R(wid * 2), R(H0 * up))
      }
      for (let j = 0; j < 3; j++) {   // rings rippling out across the floor
        const tt = e.t - j * 7; if (tt < 0) continue
        const rr = 20 + tt * 5, a = Math.max(0, 1 - tt / 40)
        c.globalAlpha = 0.85 * a; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 3; c.beginPath(); c.ellipse(R(e.x), R(e.y), R(rr), R(rr * 0.18), 0, 0, 7); c.stroke()
      }
      for (let j = 0; j < pN(14); j++) { const tt = e.t, px = e.x + (H(e.seed, j, 41) - 0.5) * 70, py = e.y - tt * (2 + H(e.seed, j, 42) * 4); c.globalAlpha = Math.max(0, 1 - tt / e.life); c.fillStyle = j % 2 ? '#ffffff' : rgba(e.col, 1); c.fillRect(R(px), R(py), 2, 3) }
    } else if (e.kind === 'parry') {   // contact flash, sparks, a ring of light where the steel meets
      if (e.t < 4 && !noFlash()) { c.globalAlpha = 1 - e.t / 4; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(R(e.x), R(e.y), R(18 + e.t * 8), 0, 7); c.fill() }
      const col = e.perfect ? [255, 236, 150] : [150, 225, 255]
      for (let j = 0; j < pN(e.perfect ? 18 : 12); j++) {
        const an = H(e.seed, j, 51) * Math.PI * 2, sp = 4 + H(e.seed, j, 52) * 6, tt = e.t
        const x1 = e.x + Math.cos(an) * sp * tt, y1 = e.y + Math.sin(an) * sp * tt + 0.25 * tt * tt
        c.globalAlpha = Math.max(0, 1 - tt / (e.life * 0.8)); c.strokeStyle = j % 3 ? rgba(col, 1) : '#ffffff'; c.lineWidth = 2
        c.beginPath(); c.moveTo(R(x1), R(y1)); c.lineTo(R(x1 - Math.cos(an) * sp * 1.6), R(y1 - Math.sin(an) * sp * 1.6)); c.stroke()
      }
      for (let j = 0; j < (e.perfect ? 2 : 1); j++) { const tt = e.t - j * 5; if (tt < 0) continue; c.globalAlpha = Math.max(0, 1 - tt / 16); c.strokeStyle = rgba(col, 1); c.lineWidth = 3 - j; c.beginPath(); c.arc(R(e.x), R(e.y), R(10 + tt * 4.5), 0, 7); c.stroke() }
    } else if (e.kind === 'ring') {
      c.globalAlpha = Math.max(0, 1 - k); c.strokeStyle = rgba(e.col, 1); c.lineWidth = e.w; c.beginPath(); c.arc(R(e.x), R(e.y), R(e.r0 + e.t * e.grow), 0, 7); c.stroke()
      c.globalAlpha = Math.max(0, 0.8 - k); c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.beginPath(); c.arc(R(e.x), R(e.y), R(e.r0 * 0.7 + e.t * e.grow * 0.8), 0, 7); c.stroke()
    } else if (e.kind === 'counter') {   // "COUNTER" slammed over the punish
      const sc = e.t < 5 ? 1.9 - e.t * 0.18 : 1, a = e.t < 28 ? 1 : 1 - (e.t - 28) / 12
      c.save(); c.translate(R(e.x), R(e.y - Math.min(e.t, 10))); c.scale(sc, sc); c.globalAlpha = Math.max(0, a)
      c.font = 'bold 24px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.lineWidth = 5; c.strokeStyle = 'rgba(60,10,0,0.9)'; c.strokeText('COUNTER', 0, 0)
      c.fillStyle = (e.t >> 2) % 2 && e.t < 16 ? '#ffffff' : '#ff8a3c'; c.fillText('COUNTER', 0, 0); c.restore()
    } else if (e.kind === 'cut') {   // a thin glowing cut line across the target
      const L = e.len * Math.min(1, e.t / 2), th = Math.max(0.5, 5 * (1 - k)), cx = e.x, cy = e.y, dx = Math.cos(e.ang) * L / 2, dy = Math.sin(e.ang) * L / 2
      c.globalAlpha = Math.max(0, 1 - k) * 0.7; c.strokeStyle = rgba(e.col, 1); c.lineWidth = th * 2.4; c.beginPath(); c.moveTo(R(cx - dx), R(cy - dy)); c.lineTo(R(cx + dx), R(cy + dy)); c.stroke()
      c.globalAlpha = Math.max(0, 1 - k); c.strokeStyle = '#ffffff'; c.lineWidth = th; c.beginPath(); c.moveTo(R(cx - dx), R(cy - dy)); c.lineTo(R(cx + dx), R(cy + dy)); c.stroke()
    }
  }
  c.restore()
}

// ── draw: HUD ("ULTIMATE READY" slammed by the bar) ──
export function drawAnimeJuiceHud(c, cv) {
  if (on()) drawSigHud(c, cv)
  if (!S.slams.length || !on()) return
  for (const s of S.slams) {
    const k = s.t, sc = k < 5 ? 2.2 - k * 0.24 : 1, a = k < 70 ? 1 : 1 - (k - 70) / 20
    const x = s.side ? cv.width - 240 : 240, y = cv.height - 64   // right above that player's energy bar (bottom corners)
    c.save(); c.translate(R(x), R(y)); c.scale(sc, sc); c.globalAlpha = Math.max(0, a)
    c.font = 'bold 22px Impact, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 5; c.strokeStyle = 'rgba(40,20,0,0.9)'; c.strokeText('ULTIMATE READY', 0, 0)
    c.fillStyle = (k >> 2) % 2 && k < 30 ? '#ffffff' : '#ffd36b'; c.fillText('ULTIMATE READY', 0, 0)
    c.restore()
  }
}

// ── test hooks (harness only) ──
export const __animeJuiceTest = { S, parryFx, readyCeremony }
