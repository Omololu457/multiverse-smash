// cloneFighter.js — CLONES THAT FIGHT AS THEIR OWN FIGHTERS (Tobirama water · Naruto / Sasuke / Madara shadow · Hashirama wood).
//
// A clone here is NOT an authored ghost that blinks onto a fixed spot (that is cloneChoreography.js / narutoChoreography.js).
// Each clone:
//   1. APPEARS through its element: rises out of a puddle (water), grows out of the ground (wood), pops out of smoke (shadow)
//      — the arrival / exit cells are each character's own sheets (clonechoreo CLONE_SHEETS / smoke strip),
//   2. RUNS / DASHES at the opponent on its own (it tracks the foe as the foe moves),
//   3. FIGHTS: plays a short attack string with the character's OWN poses; every hit needs its box to really touch the foe
//      (it can whiff, it can be blocked — the hit goes through the normal clone-hit / projectile path),
//   4. LEAVES through its element when the string is done. One hit on the clone pops it early (the Guardian absorbs one).
// The caster is NOT locked while the clones fight — two-on-one pressure. Works in Susanoo too (nothing here reads forms).
//
// BOX SIZES: the real fighters all share a 48×94 hurtbox, but they are DRAWN 128–149 px tall. A clone's hurtbox and every
// attack box are taken from the character's DRAWN size instead (animation cell × spriteScale × GLOBAL_SPRITE_SCALE) — the
// idle pose for the body, the attack pose for the reach — so a clone is hit / hits where it visibly is. The foe is checked
// against the union of its real hurtbox and its drawn body. All of it is plain data math (deterministic, LAN-safe).
//
// Access: the clone summon (↓↓↑ + Special) stages the formation → the follow-up Special DIRECTION (or Ultimate) picks the
// set (cloneChoreography.chooseSequence / narutoChoreography.chooseNarutoSequence route the clone-fighter characters here).
import { SpriteHandler, GLOBAL_SPRITE_SCALE } from "./sprite.js"
import { characters } from "./characters.js"
import { ccCloneFx } from "./clonechoreo.js"
import { CLONE_FIGHTER_PROFILES, cloneFighterProfile, cloneSetForDir } from "./cloneFighterSets.js"
export { CLONE_FIGHTER_PROFILES, cloneFighterProfile, hasCloneFighters, cloneSetForDir, cloneFighterKitRows } from "./cloneFighterSets.js"

export const CF_TEST = { off: false, log: null }   // harness switch (off = every character keeps its old authored clone moves)

// arrival / exit length per element (frames)
const ARRIVE = { water: 16, wood: 18, smoke: 10 }, HIDE = { water: 16, wood: 18, smoke: 3 }
const LEAVE = { water: 14, wood: 12, smoke: 12 }, POP = 10
const LIFE = 360, APPROACH_MAX = 75, CATCHUP_MAX = 18

// ── STATE ──────────────────────────────────────────────────────────────────────────────────────────────────────
const _clones = []
let _worldW = 3200
const cx = b => b.x + (b.w || 0) / 2, feetOf = b => b.y + (b.h || 0)
const clampX = (x, w) => Math.max(0, Math.min(_worldW - (w || 60), x))
const overlaps = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
const dirTo = (from, to) => Math.sign(cx(to) - cx(from)) || 1
const log = (e) => { if (CF_TEST.log) CF_TEST.log.push(e) }
const keyOf = f => (f?.rosterKey || "").toLowerCase()

// ── DRAWN SIZE (the box sizes) ─────────────────────────────────────────────────────────────────────────────────
// on-screen size of pose `action` for a fighter-like {animationData, spriteScale}: cell × spriteScale × global scale
export function drawnSize(f, action = "idle") {
  const SA = f?._skinAnim, A = SA?.[action] || f?.animationData?.[action] || SA?.idle || f?.animationData?.idle, s = (f?.spriteScale || 1) * GLOBAL_SPRITE_SCALE
  return { w: (A?.width || 40) * s, h: (A?.height || 90) * s }
}
// a standing body box from the idle pose: width = the idle cell (trimmed of padding: ≤ 45% of the height), feet-anchored
export function drawnBody(f, centreX, feet) {
  const d = drawnSize(f, "idle"), w = Math.max(40, Math.min(d.w * 0.8, d.h * 0.45)), h = d.h * 0.96
  return { x: centreX - w / 2, y: feet - h, w, h }
}
function foeBox(foe, host) {
  const real = (host.hurtbox && host.hurtbox(foe)) || { x: foe.x, y: foe.y, w: foe.w || 48, h: foe.h || 94 }
  if (!foe.animationData) return real
  const d = drawnBody(foe, cx(foe), feetOf(foe))
  const x = Math.min(real.x, d.x), y = Math.min(real.y, d.y)
  return { x, y, w: Math.max(real.x + real.w, d.x + d.w) - x, h: Math.max(real.y + real.h, d.y + d.h) - y }
}

function makeBody(caster, P) {
  const key = keyOf(caster), ch = characters[key] || {}
  // SUSANOO / giant forms: the clones are the plain shinobi (Madara's armour, teen Sasuke's giant, the War-Susano'o
  // Soldier stay on the caster) — so what you see is what the drawn-size boxes measure
  const giant = !!caster._canvasHeightFrac || (caster._madaraSusanoo || 0) > 0 || !!caster._warSoldier
  return {
    rosterKey: key, hasSprites: true, animationData: ch.animationData, spriteHandler: new SpriteHandler(),
    x: caster.x, y: caster.y, facing: caster.facing || 1, w: caster.w ?? 60, h: caster.h ?? 100,
    // a non-giant form's art carries over (Madara's Susanoo armour → armoured shadow clones); a GIANT form (teen Sasuke's
    // Susanoo) does not — his clones are the plain shinobi
    spriteScale: giant ? (ch.spriteScale || 1) : (caster.spriteScale ?? ch.spriteScale ?? 1), skinId: caster.skinId, _skinAnim: giant ? (caster._baseSkinAnim2 ?? caster._baseSkinAnim ?? null) : caster._skinAnim,
    tintColor: P.tint ? P.tint.color : caster.tintColor, tintStrength: P.tint ? P.tint.strength : caster.tintStrength,
    shroudStage: caster.shroudStage || 0,   // Naruto's Kurama shroud aura carries onto his clones
    _forceAction: "idle", _choreoVisible: false, _choreoGhost: true, _cloneFighter: true, _ccHide: true,
  }
}
const setAction = (c, action, restart) => {
  const b = c.body, a = b.animationData?.[action] ? action : "idle"
  if (restart || b._forceAction !== a) { b._forceAction = a; if (b.spriteHandler) { b.spriteHandler.frameIndex = 0; b.spriteHandler.frameTimer = 0 } }
}
const place = (c) => { const b = c.body; b.x = clampX(c.x - (b.w || 0) / 2, b.w); c.x = cx(b); b.y = c.feet - (b.h || 0); b.facing = c.dir; c.hurt = drawnBody(b, c.x, c.feet) }
const stepFrames = (c, st) => { if (st.frames) return st.frames; const A = c.body.animationData?.[st.action]; return Math.max(14, A ? A.frames * A.speed : 20) }
const hitAt = (c, st, hit) => hit.at ?? Math.max(3, Math.round(stepFrames(c, st) * 0.45))
// forward reach (px from the clone's centre) of a step = half its drawn pose width, never less than the body + a little
const stepReach = (c, st, hit = {}) => hit.reach ?? Math.max(c.hurt.w / 2 + 18, drawnSize(c.body, st.action).w / 2)
const fx = (c, k, len) => ccCloneFx(k, c.P.style, c.P.kind, c.x, c.feet, c.dir, c.body.spriteScale, len)

// ── API ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function isCloneFighterCaster(f) { return !CF_TEST.off && !!cloneFighterProfile(keyOf(f)) }
export function isCloneFighterKey(key) { return !CF_TEST.off && !!cloneFighterProfile(key) }
export function hasLiveCloneFighters(f) { return _clones.some(c => c.caster === f && c.phase !== "dead") }
export function cloneFighterAge(f) { let a = Infinity; for (const c of _clones) if (c.caster === f && c.phase !== "dead") a = Math.min(a, c.life); return a }   // frames since the newest live set started
export function getCloneFighters(f) { return _clones.filter(c => !f || c.caster === f) }
export function getCloneFighterBodies() { return _clones.filter(c => c.body._choreoVisible && !c.body._ccHide).map(c => c.body) }
export function clearCloneFighters(f = null) { for (let i = _clones.length - 1; i >= 0; i--) if (!f || _clones[i].caster === f) _clones.splice(i, 1) }
// training overlay: every live clone's hurtbox + its attack box on the frames it is checked
export function cloneFighterBoxes() {
  return _clones.filter(c => c.phase !== "dead" && c.phase !== "wait" && c.hurt && !c.body._ccHide).map(c => ({ hurt: c.hurt, hit: c.hitShow > 0 ? c.hitBox : null }))
}

// The old authored seq keys (both engines) → the pick dir, so either chooser can route here.
const SEQ_DIR = { pureAttack: "N", grab: "F", defensive: "U", ranged: "B", deception: "D", swarm: "SWARM",
                  barrage: "N", flank: "F", substitution: "U", shuriken: "B", guardian: "D", twoThousand: "SWARM" }
export function pickDirFor(seqOrDir) { return SEQ_DIR[seqOrDir] || (["N", "F", "U", "B", "D", "SWARM"].includes(seqOrDir) ? seqOrDir : "N") }

// Start the set picked by `dir` (or an old seq key). Returns { ok, set } or { authored: '<seq>' } when that pick keeps the
// character's old authored move (the caller plays it). `formBodies` = the staged formation's ghosts: the front clone
// CONTINUES from the copy nearest the foe (no second arrival; that body is marked _wcTaken so the formation won't exit it).
export function startCloneFighterSet(caster, target, dirOrSeq = "N", formBodies = null) {
  if (!caster || !target) return { ok: false }
  const key = keyOf(caster), P = cloneFighterProfile(key); if (!P) return { ok: false }
  const setKey = cloneSetForDir(key, pickDirFor(dirOrSeq)), S = P.sets[setKey]
  if (S.authored) return { ok: false, authored: S.authored, set: setKey }
  const ground = Math.max(feetOf(caster), feetOf(target)), toward = dirTo(caster, target)
  const free = (formBodies || []).filter(fb => fb._choreoVisible && !fb._ccHide && fb._ccPhase !== "pop" && (Math.sign(cx(fb) - cx(caster)) || toward) === toward)
    .sort((a, b2) => Math.abs(cx(a) - cx(target)) - Math.abs(cx(b2) - cx(target)))
  S.clones.forEach((spec, k) => {
    let x, cont = false
    if (spec.from === "behindFoe") x = cx(target) + toward * 64
    else if (spec.from === "beside") x = cx(caster) + toward * 52
    else if (free.length) { const fb = free.shift(); fb._wcTaken = true; x = cx(fb); cont = true }
    else x = cx(caster) + toward * (70 + 30 * k)
    const c = { caster, target, P, key, set: setKey, spec, body: makeBody(caster, P), phase: "wait", t: 0, life: 0, delay: spec.delay || 0, cont,
                x, feet: ground, dir: 1, step: 0, stepT: 0, back: null, guardT: 0, fired: new Set(), hits: 0, popped: false, hitShow: 0, hitBox: null }
    c.dir = dirTo({ x: x - 1, w: 2 }, target)
    place(c)
    c.range = spec.range ?? Math.max(40, Math.round(stepReach(c, spec.steps[0], spec.steps[0].hits?.[0]) * 0.7))
    _clones.push(c)
    log({ k: "spawn", char: key, set: setKey, x: Math.round(x) })
  })
  caster._cfSets = (caster._cfSets || 0) + 1
  return { ok: true, set: setKey }
}

// ── PER-FRAME ─────────────────────────────────────────────────────────────────────────────────────────────────
// host: { strike(caster, target, hit, dirSign, body), threats(opp) → [{ box, consume() }], hurtbox(fighter), worldW }
export function updateCloneFighters(host = {}) {
  if (host.worldW) _worldW = host.worldW
  for (let i = _clones.length - 1; i >= 0; i--) {
    const c = _clones[i]
    if (c.phase === "dead") { _clones.splice(i, 1); continue }
    const caster = c.caster, foe = c.target, b = c.body
    if (c.hitShow > 0) c.hitShow--
    if (!caster || caster.eliminated || !foe) { leave(c, POP); continue }
    c.life++
    if (c.life > LIFE) { leave(c, LEAVE[c.P.kind]); continue }

    // ── getting hit: one touch pops a clone (the Guardian absorbs its first hit and counters instead) ──
    if (c.phase === "approach" || c.phase === "attack" || c.phase === "guard") {
      const th = (host.threats ? host.threats(foe) : []).find(z => overlaps(z.box, c.hurt))
      if (th) {
        th.consume?.()
        if (c.phase === "guard") { fx(c, "pop", 6); log({ k: "absorb", char: c.key, set: c.set }); c.phase = "attack"; c.step = 0; startStep(c) }
        else { log({ k: "popped", char: c.key, set: c.set }); c.popped = true; leave(c, POP); continue }
      }
    }

    switch (c.phase) {
      case "wait":
        if (c.delay-- > 0) break
        c.phase = "rise"; c.t = 0
        b._choreoVisible = true; b._ccHide = true
        if (c.cont) { c.t = ARRIVE[c.P.kind] - 1; b._ccHide = false }   // continues from a staged formation copy — already standing
        else fx(c, "pop", ARRIVE[c.P.kind])
        log({ k: "rise", char: c.key, set: c.set })
        break
      case "rise":
        c.t++
        c.dir = dirTo(b, foe); place(c); setAction(c, "idle")
        if (c.t >= HIDE[c.P.kind]) b._ccHide = false
        if (c.t >= ARRIVE[c.P.kind]) {
          b._ccHide = false
          if (c.spec.guard) { c.phase = "guard"; c.guardT = 0; setAction(c, b.animationData?.guard ? "guard" : (c.P.guardPose || "idle"), true) }
          else if (c.spec.approach) { c.phase = "approach"; c.t = 0 }
          else { c.phase = "attack"; c.step = 0; startStep(c) }
        }
        break
      case "guard":
        c.guardT++
        c.dir = dirTo(b, foe); place(c)
        if (Math.abs(cx(foe) - c.x) < c.range + 30) { log({ k: "counter", char: c.key, set: c.set }); c.phase = "attack"; c.step = 0; startStep(c) }   // the foe walked into it
        else if (c.guardT >= c.spec.guard) { c.phase = "approach"; c.t = 0 }   // nobody came → go to them
        break
      case "approach": {
        c.t++
        c.dir = dirTo(b, foe)
        const gap = Math.abs(cx(foe) - c.x), range = c.back != null ? c.range + 8 : c.range
        const cap = c.back != null ? CATCHUP_MAX : APPROACH_MAX
        if (gap <= range || c.t > cap) { c.phase = "attack"; const s = c.back ?? 0; c.back = null; c.step = s; startStep(c); break }
        c.x += c.dir * Math.min(c.spec.speed || 7, gap - range + 1); place(c)
        setAction(c, c.spec.approach === "dash" && b.animationData?.dash ? "dash" : "run")
        break
      }
      case "attack": {
        const st = c.spec.steps[c.step]
        c.stepT++
        if (st.vx) { c.x += c.dir * st.vx; place(c) }
        for (const hit of st.hits || []) {
          const at = hitAt(c, st, hit), k = c.step + "@" + at
          if (c.stepT !== at || c.fired.has(k)) continue
          c.fired.add(k)
          if (hit.projectile) { host.strike?.(caster, foe, { ...c.P.proj, ...hit, w: hit.big ? 42 : 26, h: hit.big ? 42 : 26 }, c.dir, b); c.hits++; log({ k: "shot", char: c.key, set: c.set, step: c.step }); continue }
          // the attack box = the pose's DRAWN reach in front + the pose's drawn height (≥ the body), feet-anchored
          const reach = stepReach(c, st, hit), ph = Math.max(drawnSize(b, st.action).h, c.hurt.h) + (hit.reachY || 0)
          const box = { x: c.dir > 0 ? c.x - c.hurt.w / 2 : c.x - reach, y: c.feet - ph, w: reach + c.hurt.w / 2, h: ph }
          c.hitBox = box; c.hitShow = 6
          if (overlaps(box, foeBox(foe, host))) { host.strike?.(caster, foe, { ...c.P.melee, ...hit }, c.dir, b); c.hits++; log({ k: "hit", char: c.key, set: c.set, step: c.step, dmg: hit.damage }) }
          else log({ k: "whiff", char: c.key, set: c.set, step: c.step })
        }
        if (c.stepT >= stepFrames(c, st)) {
          c.step++
          if (c.step >= c.spec.steps.length) { leave(c, LEAVE[c.P.kind]); break }
          // the foe got knocked out of reach → a short catch-up run before the next melee step
          const nx = c.spec.steps[c.step], melee = !(nx.hits || []).some(x => x.projectile)
          if (melee && c.spec.approach && Math.abs(cx(foe) - c.x) > c.range + 34) { c.phase = "approach"; c.t = 0; c.back = c.step }
          else startStep(c)
        }
        break
      }
    }
  }
}
function startStep(c) {
  const st = c.spec.steps[c.step]
  c.stepT = 0; c.dir = dirTo(c.body, c.target); place(c)
  setAction(c, st.action, true)
}
function leave(c, len) {
  const b = c.body
  if (b._choreoVisible && !b._ccHide) fx(c, "exit", len)
  b._choreoVisible = false; c.phase = "dead"
  log({ k: c.popped ? "pop-exit" : "exit", char: c.key, set: c.set })
}

// harness / Controls Lab read-out
export function cloneFighterState(f) {
  return getCloneFighters(f).map(c => ({ char: c.key, set: c.set, phase: c.phase, step: c.step, x: Math.round(c.x), hits: c.hits, action: c.body._forceAction, popped: c.popped,
    hurt: c.hurt && { w: Math.round(c.hurt.w), h: Math.round(c.hurt.h) }, range: c.range }))
}
