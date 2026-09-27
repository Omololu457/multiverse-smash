// cloneChoreography.js — GENERIC authored clone-choreography engine for the Naruto-universe roster
// (everyone EXCEPT Naruto himself, who keeps his own narutoChoreography.js — untouched).
// ────────────────────────────────────────────────────────────────────────────
// This is a faithful GENERALIZATION of the proven Naruto engine (narutoChoreography.js):
//
// STAGE 0 (visual fidelity — the HARD constraint): a clone is a "GHOST BODY" — a minimal fighter-
// like object that carries the OWNER's OWN rosterKey + animationData + a per-instance SpriteHandler,
// drawn by game.js through the EXACT SAME renderHybridFighter path as the real fighter. Same sheets,
// same scale, same skin/tint inheritance → pixel-identical to the real character. This is the fix for
// the "fake/ugly clone" bug: a clone is never a recoloured box, it is the real sprite.
//
// STAGE 1 (format): a "choreographed sequence" is DETERMINISTIC authored data — an ordered list of
// beats. Each beat names WHICH BODY performs WHICH sprite ACTION at WHICH relative frame, and WHERE
// that body is (relative to the target/caster). A beat may carry a `hit` (the real game-effect). No
// runtime AI, no RNG — the whole sequence plays out frame-by-frame off a plain counter (LAN-safe).
// The beat/finisher schema is byte-identical to narutoChoreography.js so the format is truly reused.
//
// STAGE 2 (access — ADDITIVE, coexists with each character's signature kit): a dedicated classic
// motion (↓↑, `chargeUp`) + Special stages a clone FORMATION; a follow-up Special DIRECTION selects
// one of 5 moves (Pure Attack / Grab / Ranged / Defensive / Deception), and pressing Ultimate while
// the formation is staged fires the 6th, the Ultimate-Swarm. The existing execute*Special/Ultimate
// kits are never touched — the summon/select is intercepted in the dispatch layer BEFORE the switch.
//
// Multi-run/multi-character: unlike the Naruto engine's single global run, this tracks runs and
// formations PER CASTER (a Naruto-universe mirror match, e.g. Minato vs Kakashi, can have both).

import { SpriteHandler } from "./sprite.js"
import { characters } from "./characters.js"

// ── ACCESS CONSTANTS ─────────────────────────────────────────────────────────
export const SUMMON_MOTION = "cloneSummon"   // ↓↓↑ + Special stages the formation. A distinctive strays:0
                                             // 3-token motion so it never collides with a live special route
                                             // (chargeUp ↓↑ was too greedy — matched Minato's ↓←↑ B→U combo).
export const SUMMON_COST   = 25            // flat chakra paid at summon; the select itself adds nothing
export const SUMMON_CD     = 12            // brief lockout so one press can't double-fire
export const SELECT_WINDOW = 60            // frames the player has to pick before the formation disperses

// Held-direction → sequence key. Consistent across the whole roster (one muscle-memory map):
//   Neutral → Pure Attack · Down → Deception · Up → Defensive · Back → Ranged · Fwd → Grab.
// Ultimate-while-staged routes to "swarm" (game.js passes the sentinel dir "SWARM").
export const SELECT_MAP = { N: "pureAttack", D: "deception", U: "defensive", B: "ranged", F: "grab", SWARM: "swarm" }

// ── RUNTIME STATE (per-caster) ────────────────────────────────────────────────
const _runs  = []   // active authored runs
const _forms = []   // active staged formations
const _runFor  = (c) => _runs.find(r => r.caster === c) || null
const _formFor = (c) => _forms.find(f => f.caster === c) || null

export function isChoreoSupported(key) { return !!CHOREO_BY_CHAR[(key || "").toLowerCase()] }
// LIGHT-KIT characters (Sasuke/Obito) get 1-2 moves via a DIRECT motion trigger — no summon-then-choose
// formation (that would overload their existing kit). lightDirectSeq maps the held direction → sequence key.
export function isLightChoreo(key) { const e = CHOREO_BY_CHAR[(key || "").toLowerCase()]; return !!(e && e.light) }
export function lightDirectSeq(key, dir) {
  const e = CHOREO_BY_CHAR[(key || "").toLowerCase()]; if (!e) return null
  const map = e.directMap || {}
  return map[dir || "N"] || map.N || Object.keys(e.seqs)[0]
}
export function isChoreoActiveFor(caster)    { return !!_runFor(caster) }
export function isFormationActiveFor(caster) { return !!_formFor(caster) }
export function anyChoreoActive() { return _runs.length > 0 || _forms.length > 0 }

// Ghost body — minimal fighter-like rendered through renderHybridFighter with the OWNER's real assets.
// Inherits the caster's skin/tint so a skinned owner's clones match too (the Stage-0 guarantee).
function makeGhostBody(caster, rosterKey) {
  const ch = characters[rosterKey] || {}
  return {
    rosterKey, hasSprites: true,
    animationData: ch.animationData,
    spriteHandler: new SpriteHandler(),
    x: caster.x, y: caster.y, facing: caster.facing,
    w: caster.w ?? 60, h: caster.h ?? 110,
    spriteScale: caster.spriteScale ?? ch.spriteScale ?? 1,
    skinId: caster.skinId, _skinAnim: caster._skinAnim,
    tintColor: caster.tintColor, tintStrength: caster.tintStrength,
    _forceAction: "idle", _choreoVisible: false, _choreoGhost: true,
  }
}

const _dirTo = (from, to) => Math.sign((to.x + (to.w || 0) / 2) - (from.x + (from.w || 0) / 2)) || 1

// Merge the owner's default FX (melee / projectile) UNDER a beat's own hit spec, so game.js's fireHit
// callback can stay generic (it just reads hit.sheet/color/dims) while each character's clones strike
// with their own themed effect. A beat may override any field.
function _resolveHit(hit, fx) {
  const base = hit.projectile ? (fx && fx.proj) : (fx && fx.melee)
  return { ...(base || {}), ...hit }
}

// ── START / SELECT ─────────────────────────────────────────────────────────────
// Start an authored run for `caster` playing `seqKey`. Locks the caster (fully puppeted by the script).
export function startChoreo(caster, target, rosterKey, seqKey = "pureAttack") {
  if (!caster || !target || _runFor(caster)) return false
  const set = CHOREO_BY_CHAR[(rosterKey || "").toLowerCase()]; if (!set) return false
  const seq = set.seqs[seqKey] || set.seqs.pureAttack; if (!seq) return false
  const bodies = {}
  for (const c of seq.clones) bodies[c.slot] = makeGhostBody(caster, rosterKey)
  _runs.push({ caster, target, rosterKey, fx: set.fx, seq, frame: 0, bodies, fired: new Set(),
               finisherFired: false, startX: caster.x, startY: caster.y })
  caster._choreoLock = true; caster.vx = 0; caster._forceAction = "idle"
  return true
}

// Stage a holding FORMATION (no move yet), opening the select window. Deliberately does NOT set
// _choreoLock: the caster is SOFT-held (position pinned, idle pose) so the follow-up Special (select)
// or Ultimate (swarm) press is still processed by updatePlayerCombat in real play. The summon is
// interruptible — taking a hit or throwing an attack cancels it (handled in updateFormations).
const FORMATION_OFFSETS = [{ dx: -74, dy: 0 }, { dx: 74, dy: 0 }, { dx: -128, dy: 0 }, { dx: 128, dy: 0 }]
export function startFormation(caster, target, rosterKey) {
  if (!caster || !target || _runFor(caster) || _formFor(caster)) return false
  if (!isChoreoSupported(rosterKey)) return false
  const bodies = FORMATION_OFFSETS.map(() => makeGhostBody(caster, rosterKey))
  _forms.push({ caster, target, rosterKey, bodies, frame: 0, window: SELECT_WINDOW })
  caster.vx = 0; caster._forceAction = "idle"; caster._choreoSelectWindow = SELECT_WINDOW; caster._inChoreoFormation = true
  return true
}

function _releaseFormationCaster(fm) {
  if (fm && fm.caster) { fm.caster._choreoSelectWindow = 0; fm.caster._forceAction = null; fm.caster._inChoreoFormation = false }
}

export function updateFormations() {
  for (let i = _forms.length - 1; i >= 0; i--) {
    const fm = _forms[i], c = fm.caster
    // Interruptible summon: a hit / an attack / a KO cancels it (real-play fairness).
    if (!c || c.eliminated || (c.hitstun || 0) > 0 || c.attacking) { _releaseFormationCaster(fm); _forms.splice(i, 1); continue }
    FORMATION_OFFSETS.forEach((off, k) => {
      const b = fm.bodies[k]; b._choreoVisible = true
      b.x = c.x + off.dx; b.y = c.y + off.dy
      b.facing = off.dx < 0 ? 1 : -1   // clones face inward
      b._forceAction = "idle"
    })
    c.vx = 0; c._forceAction = "idle"
    if (fm.frozen) continue   // test hold
    fm.frame++; fm.window--; c._choreoSelectWindow = fm.window
    if (fm.window <= 0) { _releaseFormationCaster(fm); _forms.splice(i, 1) }
  }
}

// SELECT press: consume the caster's staged formation and start the chosen sequence.
export function chooseSequence(caster, seqKey) {
  const fm = _formFor(caster); if (!fm) return false
  const idx = _forms.indexOf(fm); if (idx >= 0) _forms.splice(idx, 1)
  caster._choreoSelectWindow = 0; caster._inChoreoFormation = false
  return startChoreo(caster, fm.target, fm.rosterKey, seqKey)
}

// ── RENDER FEED ─────────────────────────────────────────────────────────────
// Every ghost body game.js should render this frame across ALL active runs + formations.
export function getChoreoBodies() {
  const out = []
  for (const r of _runs)  for (const b of Object.values(r.bodies)) if (b._choreoVisible) out.push(b)
  for (const f of _forms) for (const b of f.bodies) if (b._choreoVisible) out.push(b)
  return out
}

// ── PER-FRAME ADVANCE ─────────────────────────────────────────────────────────
// `fireHit(caster, target, resolvedHit, dirSign, body)` is provided by game.js and wraps the existing
// spawnGuaranteedCloneHit / spawnProjectile primitives. resolvedHit already has the owner's FX merged.
export function updateChoreo(fireHit) {
  for (let ri = _runs.length - 1; ri >= 0; ri--) {
    const r = _runs[ri], seq = r.seq, t = r.target, caster = r.caster, f = r.frame

    // Reset visibility first (a slot may be reused across beats), then only ever set TRUE.
    for (const body of Object.values(r.bodies)) body._choreoVisible = false
    for (const b of seq.beats) {
      const body = r.bodies[b.body]; if (!body) continue
      const open = f >= b.appear && f < b.vanish
      const ref = b.place.ref === "caster" ? caster
                : b.place.ref === "casterStart" ? { x: r.startX, y: r.startY, w: caster.w, h: caster.h }
                : t
      if (open) {
        body._choreoVisible = true
        const cx = ref.x + (ref.w || 0) / 2
        body.x = cx + b.place.dx - (body.w || 0) / 2
        body.y = ref.y + (b.place.dy || 0)
        body.facing = b.place.face ?? _dirTo(body, t)
        body._forceAction = b.action
      }
      const key = b.body + "@" + b.at
      if (!r.frozen && f === b.at && !r.fired.has(key)) {
        r.fired.add(key)
        if (b.hit && fireHit) fireHit(caster, t, _resolveHit(b.hit, r.fx), _dirTo(body, t), body)
      }
    }

    // Finisher — performed by the REAL character. Types mirror narutoChoreography exactly:
    // "spike" (default) · "projectile" · "escape" · "strike".
    const fin = seq.finisher
    if (fin && f >= fin.at) {
      const cx = t.x + (t.w || 0) / 2
      if (fin.type === "projectile") {
        caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
        if (!r.frozen && !r.finisherFired) { r.finisherFired = true; if (fin.hit && fireHit) fireHit(caster, t, _resolveHit(fin.hit, r.fx), _dirTo(caster, t), caster) }
      } else if (fin.type === "escape") {
        const side = _dirTo(caster, t)
        caster.x = fin.teleport.behindTarget ? cx + side * (fin.teleport.dx || 74) - (caster.w || 0) / 2
                                             : caster.x - side * (fin.teleport.dx || 74)
        caster.y = t.y; caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
        if (!r.frozen && !r.finisherFired) {
          r.finisherFired = true
          if (fin.iframes) { caster.invulnTimer = fin.iframes; caster.iframes = fin.iframes }
          if (fin.hit && fireHit) fireHit(caster, t, _resolveHit(fin.hit, r.fx), _dirTo(caster, t), caster)
        }
      } else if (fin.type === "strike") {
        caster.x = cx + (fin.teleport.dx || -44) - (caster.w || 0) / 2
        caster.y = t.y; caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
        if (!r.frozen && !r.finisherFired) { r.finisherFired = true; if (fin.hit && fireHit) fireHit(caster, t, _resolveHit(fin.hit, r.fx), _dirTo(caster, t), caster) }
      } else {
        // DEFAULT SPIKE — verbatim Uzumaki-Barrage behaviour.
        if (r.frozen) {
          caster.x = cx + (fin.teleport.dx || 0) - (caster.w || 0) / 2
          caster.y = t.y - (fin.teleport.dyAbove || 150)
          caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
        } else if (!r.finisherFired) {
          r.finisherFired = true
          caster.x = cx + (fin.teleport.dx || 0) - (caster.w || 0) / 2
          caster.y = t.y - (fin.teleport.dyAbove || 150)
          caster.onGround = false; caster.grounded = false
          caster.vy = fin.descendVy || 7
          caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
          if (fin.hit && fireHit) fireHit(caster, t, _resolveHit(fin.hit, r.fx), _dirTo(caster, t))
        }
      }
    }

    if (r.frozen) continue
    r.frame++
    if (f >= seq.duration) { _endRun(r); _runs.splice(ri, 1) }
  }
}

function _endRun(r) {
  if (r && r.caster) { r.caster._choreoLock = false; r.caster._forceAction = null }
}

// ── TEST / HARNESS ────────────────────────────────────────────────────────────
export function holdChoreoAt(caster, frame) { const r = _runFor(caster); if (!r) return false; r.frozen = true; r.frame = frame; return true }
export function holdFormation(caster)       { const fm = _formFor(caster); if (!fm) return false; fm.frozen = true; return true }

export function clearChoreoFor(caster) {
  const r = _runFor(caster); if (r) { _endRun(r); _runs.splice(_runs.indexOf(r), 1) }
  const fm = _formFor(caster); if (fm) { _releaseFormationCaster(fm); _forms.splice(_forms.indexOf(fm), 1) }
}
export function clearAllChoreo() {
  for (const r of _runs) _endRun(r)
  for (const f of _forms) _releaseFormationCaster(f)
  _runs.length = 0; _forms.length = 0
}

export function getChoreoState(caster) {
  const fm = _formFor(caster)
  if (fm) return {
    active: false, formation: true, rosterKey: fm.rosterKey, window: fm.window, sequence: null,
    bodies: fm.bodies.map((b, i) => ({ slot: "f" + i, visible: !!b._choreoVisible, action: b._forceAction,
      x: Math.round(b.x), y: Math.round(b.y), rosterKey: b.rosterKey, sheetSource: "renderHybridFighter" })),
  }
  const r = _runFor(caster)
  if (!r) return { active: false }
  return {
    active: true, rosterKey: r.rosterKey, sequence: r.seq.name, frame: r.frame, finisherFired: r.finisherFired,
    firedBeats: [...r.fired],
    bodies: Object.entries(r.bodies).map(([slot, b]) => ({ slot, visible: !!b._choreoVisible, action: b._forceAction,
      x: Math.round(b.x), y: Math.round(b.y), facing: b.facing, rosterKey: b.rosterKey, sheetSource: "renderHybridFighter" })),
    caster: { x: Math.round(r.caster.x), y: Math.round(r.caster.y), action: r.caster._forceAction, locked: !!r.caster._choreoLock },
  }
}

// List of characters with an authored kit (used by the dispatch-layer intercept + harness).
export function choreoRoster() { return Object.keys(CHOREO_BY_CHAR) }
// Kit introspection for the harness/test: light flag, sequence keys, and the light directMap.
export function choreoKit(key) {
  const e = CHOREO_BY_CHAR[(key || "").toLowerCase()]; if (!e) return null
  return { light: !!e.light, seqKeys: Object.keys(e.seqs), directMap: e.directMap || null }
}

// ════════════════════════════════════════════════════════════════════════════
// PER-CHARACTER AUTHORED KITS
// Each entry: { fx: { melee, proj }, seqs: { deception, grab, pureAttack, defensive, ranged, swarm } }.
// Sequences use the SAME schema as narutoChoreography.js. Clones perform the character's OWN themed
// poses where available (e.g. Tobirama's tobiWaterSlash) for maximal canon fidelity.
// ════════════════════════════════════════════════════════════════════════════
export const CHOREO_BY_CHAR = {
  // ── TOBIRAMA SENJU — Water Release + Flying Thunder God (Hiraishin) master. ─────────────────────
  // Canon basis: Water Clones (Suiton Bunshin); Multiple Water Dragon Bullet; Water-tendril seizing;
  // Hiraishin space-time swap (Mutually Instantaneous Revolving Technique). Clones strike with his real
  // water poses (tobiWaterSlash / tobiWaterDragon / tobiRisingWater / tobiWaterWall).
  tobirama: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#38bdf8", spriteScale: 0.5 },   // cyan water burst
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#7dd3fc", w: 30, h: 30, spriteScale: 0.5 },
    },
    seqs: {
      // PURE ATTACK — Simultaneous Multi-Water-Clone Strike: three water clones launch + juggle in a
      // fixed order, real Tobirama spikes down (Water-Dragon axe). (Barrage template.)
      pureAttack: {
        name: "Water Clone Barrage", cost: 40, cooldown: 90, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "tobiRisingWater", appear: 2,  vanish: 30, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 14, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "tobiWaterSlash",  appear: 18, vanish: 46, place: { dx: 68,  dy: -70,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "tobiWaterSlash",  appear: 32, vanish: 60, place: { dx: -60, dy: -120, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Water-Tendril Seize: two water clones flank at ground level, tendrils erupt and drag the
      // opponent to centre (knockback toward centre from both sides), then Tobirama teleports in and
      // launches (Hiraishin strike). (Flank/strike template.)
      grab: {
        name: "Water Prison Seize", cost: 40, cooldown: 96, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "tobiWaterWall", appear: 2, vanish: 30, place: { dx: -66, dy: 0, face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 5,  knockbackY: -2 } },
          { at: 8, body: "c1", action: "tobiWaterWall", appear: 4, vanish: 32, place: { dx: 66,  dy: 0, face: -1 }, hit: { damage: 12, hitstun: 34, knockbackX: -5, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 22, action: "up", teleport: { dx: -46 }, hit: { damage: 22, hitstun: 32, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Water-Clone Water Dragon Bullet / Severing Wave: clones flank the CASTER and fire water
      // bullets; Tobirama throws a big Water Dragon. (Shuriken/projectile template.)
      ranged: {
        name: "Water Dragon Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "tobiWaterDragon", appear: 2,  vanish: 26, place: { ref: "caster", dx: -46, dy: -8  }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 12, body: "c1", action: "tobiWaterDragon", appear: 6,  vanish: 30, place: { ref: "caster", dx: 46,  dy: -30 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 18, body: "c2", action: "tobiWaterDragon", appear: 12, vanish: 36, place: { ref: "caster", dx: -40, dy: -58 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 30, action: "tobiWaterDragon", hit: { projectile: true, damage: 22, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 18, big: true, w: 46, h: 46 } },
      },
      // DEFENSIVE — Water Clone Shield → Hiraishin Escape: a water clone stands in front (absorbs),
      // Tobirama flickers to the FAR side (behind) with i-frames + a counter water bullet. (Escape template.)
      defensive: {
        name: "Water Clone Guard", cost: 30, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "tobiWaterWall", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "tobiWaterFlicker", teleport: { behindTarget: true, dx: 76 }, iframes: 28,
          hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15 } },
      },
      // DECEPTION — Mutually Instantaneous Revolving Technique: a decoy water clone is left where Tobirama
      // stood while he Hiraishin-swaps behind the target and counters. (Escape template with a bait clone.)
      deception: {
        name: "Instant Revolving Swap", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "idle", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "tobiWaterSlash", teleport: { behindTarget: true, dx: 60 }, iframes: 22,
          hit: { damage: 18, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Coordinated Multi-Clone Water Release finisher: a four-clone rising column of
      // water strikes riding the opponent up, then a hard Water-Dragon spike. (Two-Thousand template.)
      swarm: {
        name: "Great Waterfall Swarm", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "tobiRisingWater", appear: 2,  vanish: 20, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "tobiWaterSlash",  appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 18, body: "c2", action: "tobiWaterSlash",  appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 24, body: "c3", action: "tobiWaterSlash",  appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 30, body: "c0", action: "tobiWaterDragon", appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3 } },
          { at: 36, body: "c1", action: "tobiWaterSlash",  appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "tobiWaterDragon", appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2 } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── MINATO NAMIKAZE — Flying Thunder God (Hiraishin) + Rasengan + marked kunai. ────────────────
  // Canon basis: Shadow Clones; Hiraishin space-time marking/warping (yellow flash); a decoy/afterimage
  // bait; a marked kunai that detonates. Clones strike with his real poses (minatoRaijin1/2, minatoRush1/2,
  // minatoRasengan, minatoCloneCast). Theme colour = Raijin yellow-flash; the swarm uses Rasengan blue.
  minato: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#facc15", spriteScale: 0.5 },   // Raijin yellow flash
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#fde68a", w: 26, h: 26, spriteScale: 0.45 },   // gold kunai gleam
    },
    seqs: {
      // PURE ATTACK — Multiple Marked Strikes At Once: three clones warp in and strike in a fixed order,
      // Minato Hiraishin-spikes down. (Barrage template.)
      pureAttack: {
        name: "Hiraishin Barrage", cost: 40, cooldown: 90, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",           appear: 2,  vanish: 30, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 14, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "minatoRush1",   appear: 18, vanish: 46, place: { dx: 66,  dy: -70,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "minatoRush2",   appear: 32, vanish: 60, place: { dx: -60, dy: -120, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Kunai-Mark Warp Into A Physical Grab: two clones warp to either flank, seize + drag the
      // opponent to centre, then Minato flashes in and launches. (Flank/strike template.)
      grab: {
        name: "Raijin Snatch", cost: 40, cooldown: 96, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "minatoRaijin1", appear: 2, vanish: 30, place: { dx: -66, dy: 0, face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 5,  knockbackY: -2 } },
          { at: 8, body: "c1", action: "minatoRaijin1", appear: 4, vanish: 32, place: { dx: 66,  dy: 0, face: -1 }, hit: { damage: 12, hitstun: 34, knockbackX: -5, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 22, action: "minatoRaijin2", teleport: { dx: -46 }, hit: { damage: 22, hitstun: 32, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Detonating Marked Kunai: clones flank the CASTER and hurl marked kunai; Minato throws a
      // big detonating kunai. (Shuriken/projectile template.)
      ranged: {
        name: "Marked Kunai Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "minatoCloneCast", appear: 2,  vanish: 26, place: { ref: "caster", dx: -46, dy: -8  }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 16 } },
          { at: 12, body: "c1", action: "minatoCloneCast", appear: 6,  vanish: 30, place: { ref: "caster", dx: 46,  dy: -30 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 16 } },
          { at: 18, body: "c2", action: "minatoCloneCast", appear: 12, vanish: 36, place: { ref: "caster", dx: -40, dy: -58 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 17 } },
        ],
        finisher: { type: "projectile", at: 30, action: "heavy", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 19, big: true, w: 44, h: 44 } },
      },
      // DEFENSIVE — Clone Absorbs While Minato Warps To Safety: a clone stands in front (absorbs), Minato
      // flashes to the FAR side (behind) with i-frames + a counter kunai. (Escape template.)
      defensive: {
        name: "Clone Guard Flash", cost: 30, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "minatoCloneCast", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "minatoRaijin1", teleport: { behindTarget: true, dx: 76 }, iframes: 28,
          hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 16 } },
      },
      // DECEPTION — Decoy Kunai / Afterimage Bait: a decoy clone is left where Minato stood while he
      // Hiraishin-flashes behind the target and counters. (Escape template with a bait clone.)
      deception: {
        name: "Afterimage Flash", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "idle", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "minatoRaijin2", teleport: { behindTarget: true, dx: 60 }, iframes: 22,
          hit: { damage: 18, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Multiple Clones Each Land A Rasengan-Tier Hit: a four-clone rising column of
      // Rasengan strikes riding the opponent up, then a hard Hiraishin spike. (Two-Thousand template.)
      swarm: {
        name: "Hiraishin Rasengan Swarm", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",            appear: 2,  vanish: 20, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "minatoRasengan", appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#93c5fd" } },
          { at: 18, body: "c2", action: "minatoRasengan", appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#93c5fd" } },
          { at: 24, body: "c3", action: "minatoRasengan", appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#93c5fd" } },
          { at: 30, body: "c0", action: "minatoRasengan", appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3, color: "#93c5fd" } },
          { at: 36, body: "c1", action: "minatoRush2",    appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "minatoRasengan", appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2, color: "#93c5fd" } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── HASHIRAMA SENJU — Wood Release (Mokuton) + Sage Art. ───────────────────────────────────────
  // Canon basis: Wood Clones (Mokuton Bunshin); Deep Forest Emergence (binding roots/branches that seize);
  // Wood Golem; wood-spike/pillar zoning. Clones strike with his real wood poses (woodPunch/woodPunchSuper/
  // mokutonArm/treeSummon/hashiWoodStraight/woodCloneCast). Theme colour = wood green.
  hashirama: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#65a30d", spriteScale: 0.55 },   // wood-green impact
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#84cc16", w: 32, h: 32, spriteScale: 0.5 },   // wood spike
    },
    seqs: {
      // PURE ATTACK — Simultaneous Multi-Wood-Clone Strike: three wood clones pile on in order, Hashirama
      // spikes down with a super wood punch. (Barrage template.)
      pureAttack: {
        name: "Wood Clone Barrage", cost: 40, cooldown: 90, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",           appear: 2,  vanish: 30, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 15, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "woodPunch",     appear: 18, vanish: 46, place: { dx: 68,  dy: -70,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "mokutonArm",    appear: 32, vanish: 60, place: { dx: -60, dy: -120, face: 1  }, hit: { damage: 13, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Deep Forest Emergence Bind: two wood clones raise binding roots on either flank, seize + drag
      // the opponent to centre, then Hashirama super-wood-punch launches. (Flank/strike template.)
      grab: {
        name: "Deep Forest Bind", cost: 42, cooldown: 96, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "treeSummon1", appear: 2, vanish: 32, place: { dx: -68, dy: 0, face: 1  }, hit: { damage: 13, hitstun: 36, knockbackX: 5,  knockbackY: -2 } },
          { at: 8, body: "c1", action: "treeSummon1", appear: 4, vanish: 34, place: { dx: 68,  dy: 0, face: -1 }, hit: { damage: 13, hitstun: 36, knockbackX: -5, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 24, action: "woodPunchSuper", teleport: { dx: -48 }, hit: { damage: 24, hitstun: 34, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Wood-Spike Volley: clones flank the CASTER and hurl wood spikes; Hashirama throws a big
      // wood pillar. (Shuriken/projectile template.)
      ranged: {
        name: "Wood Spike Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "hashiWoodStraight", appear: 2,  vanish: 26, place: { ref: "caster", dx: -46, dy: -8  }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 12, body: "c1", action: "hashiWoodStraight", appear: 6,  vanish: 30, place: { ref: "caster", dx: 46,  dy: -30 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 18, body: "c2", action: "hashiWoodStraight", appear: 12, vanish: 36, place: { ref: "caster", dx: -40, dy: -58 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 30, action: "hashiWoodStraight", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 17, big: true, w: 48, h: 48 } },
      },
      // DEFENSIVE — Wood Clone Bulwark: a wood clone raises a wall (absorbs), Hashirama emerges on the FAR
      // side with i-frames + a counter wood spike. (Escape template.)
      defensive: {
        name: "Wood Clone Bulwark", cost: 32, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "mokutonArm", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "woodPunch", teleport: { behindTarget: true, dx: 76 }, iframes: 28,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15 } },
      },
      // DECEPTION — Wood Clone Feint: a decoy wood clone is left where Hashirama stood while he emerges
      // behind the target and counters. (Escape template with a bait clone.)
      deception: {
        name: "Wood Clone Feint", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "woodCloneCast", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "woodPunch", teleport: { behindTarget: true, dx: 60 }, iframes: 22,
          hit: { damage: 19, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Coordinated Multi-Clone Wood Release finisher: a four-clone rising column of wood
      // strikes riding the opponent up, then a hard wood-golem spike. (Two-Thousand template.)
      swarm: {
        name: "Deep Forest Swarm", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",           appear: 2,  vanish: 20, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 13, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "woodPunch",     appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 18, body: "c2", action: "woodPunch",     appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 24, body: "c3", action: "mokutonArm",    appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 30, body: "c0", action: "woodPunchSuper", appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3 } },
          { at: 36, body: "c1", action: "woodPunch",     appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "woodPunchSuper", appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2 } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 32, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── HIRUZEN SARUTOBI ("The Professor") — all Five Nature Transformations. ───────────────────────
  // Canon basis: his signature Five Elements combo — a squad of shadow clones EACH performing a DIFFERENT
  // elemental attack (Fire/Water/Earth/Wind/Lightning) at once. Clones use his real cast poses
  // (hiruzenFireCast/hiruzenEarthCast/hiruzenBind/hiruzenSpin); per-element hit colours make the mix legible.
  hiruzen: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#f59e0b", spriteScale: 0.5 },
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#fca5a5", w: 30, h: 30, spriteScale: 0.5 },
    },
    seqs: {
      // PURE ATTACK — Five Elements Combo (compact): three clones each a distinct element (Fire → Wind →
      // Earth) juggle, then Hiruzen spikes. (Barrage template, per-element colours.)
      pureAttack: {
        name: "Five Elements Combo", cost: 42, cooldown: 92, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "hiruzenFireCast",  appear: 2,  vanish: 30, place: { dx: -76, dy: 4,    face: 1  }, hit: { damage: 15, hitstun: 30, knockbackX: 2, knockbackY: -13, color: "#f97316" } },
          { at: 20, body: "c1", action: "hiruzenSpin",      appear: 18, vanish: 46, place: { dx: 70,  dy: -70,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: 3, knockbackY: -7,  color: "#a3e635" } },
          { at: 34, body: "c2", action: "hiruzenEarthCast", appear: 32, vanish: 60, place: { dx: -62, dy: -120, face: 1  }, hit: { damage: 13, hitstun: 26, knockbackX: 2, knockbackY: -6,  color: "#a16207" } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Earth Release Bind: two clones raise earthen holds on either flank (Doton), seize + drag the
      // opponent to centre, then Hiruzen launches. (Flank/strike template.)
      grab: {
        name: "Earth Prison Bind", cost: 42, cooldown: 96, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "hiruzenBind", appear: 2, vanish: 32, place: { dx: -70, dy: 0, face: 1  }, hit: { damage: 13, hitstun: 36, knockbackX: 5,  knockbackY: -2, color: "#a16207" } },
          { at: 8, body: "c1", action: "hiruzenBind", appear: 4, vanish: 34, place: { dx: 70,  dy: 0, face: -1 }, hit: { damage: 13, hitstun: 36, knockbackX: -5, knockbackY: -2, color: "#a16207" } },
        ],
        finisher: { type: "strike", at: 24, action: "up", teleport: { dx: -50 }, hit: { damage: 24, hitstun: 34, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Elemental Volley: clones flank the CASTER and fire Fire/Wind/Water bullets; Hiruzen throws
      // a big Fireball. (Shuriken/projectile template, per-element colours.)
      ranged: {
        name: "Elemental Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "hiruzenFireCast", appear: 2,  vanish: 26, place: { ref: "caster", dx: -48, dy: -8  }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15, color: "#f97316" } },
          { at: 12, body: "c1", action: "hiruzenSpin",     appear: 6,  vanish: 30, place: { ref: "caster", dx: 48,  dy: -30 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 16, color: "#a3e635" } },
          { at: 18, body: "c2", action: "hiruzenFireCast", appear: 12, vanish: 36, place: { ref: "caster", dx: -42, dy: -58 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16, color: "#38bdf8" } },
        ],
        finisher: { type: "projectile", at: 30, action: "hiruzenFireCast", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 17, big: true, w: 46, h: 46, color: "#f97316" } },
      },
      // DEFENSIVE — Mud Wall Guard: an Earth clone raises a mud wall (absorbs), Hiruzen re-appears on the
      // FAR side with i-frames + a counter fireball. (Escape template.)
      defensive: {
        name: "Mud Wall Guard", cost: 32, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "hiruzenEarthCast", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "hiruzenFireCast", teleport: { behindTarget: true, dx: 78 }, iframes: 28,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15, color: "#f97316" } },
      },
      // DECEPTION — Shadow Clone Feint: a decoy clone is left where Hiruzen stood while he re-appears behind
      // the target and counters. (Escape template with a bait clone.)
      deception: {
        name: "Shadow Clone Feint", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "idle", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "hiruzenSpin", teleport: { behindTarget: true, dx: 62 }, iframes: 22,
          hit: { damage: 19, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — the full FIVE ELEMENTS BARRAGE: a rising column of clones EACH casting a different
      // element (Fire → Water → Wind → Earth → Lightning), then a hard finishing spike. (Two-Thousand template.)
      swarm: {
        name: "Five Elements Barrage", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "hiruzenFireCast",  appear: 2,  vanish: 20, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 13, hitstun: 34, knockbackX: 2, knockbackY: -12, color: "#f97316" } },
          { at: 12, body: "c1", action: "hiruzenSpin",      appear: 10, vanish: 24, place: { dx: 64,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#38bdf8" } },
          { at: 18, body: "c2", action: "hiruzenSpin",      appear: 16, vanish: 30, place: { dx: -58, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#a3e635" } },
          { at: 24, body: "c3", action: "hiruzenEarthCast", appear: 22, vanish: 36, place: { dx: 60,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#a16207" } },
          { at: 30, body: "c0", action: "hiruzenFireCast",  appear: 28, vanish: 42, place: { dx: -54, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3, color: "#facc15" } },
          { at: 36, body: "c1", action: "hiruzenSpin",      appear: 34, vanish: 48, place: { dx: 56,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2, color: "#f97316" } },
          { at: 44, body: "c2", action: "hiruzenEarthCast", appear: 42, vanish: 58, place: { dx: -50, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2, color: "#a16207" } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 32, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── KAKASHI HATAKE ("Copy Ninja") — Sharingan copy/read + Lightning Clone + Raikiri + Ninken. ───
  // Canon basis: Kakashi's Sharingan COPIES/predicts techniques; his Lightning Clone (Raiton Kage Bunshin)
  // shocks on contact; the Ninken hound pack; Raikiri. DECEPTION specifically reflects the copy-ninja
  // identity — a decoy read where the Sharingan predicts the commitment and punishes (NOT a plain clone).
  // Clones use his real poses (kakashiRaikiriDash/Charge, kakashiCombo, kakashiThrow, kakashiNinDogsCast).
  kakashi: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#60a5fa", spriteScale: 0.5 },   // Raikiri electric-blue
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#cbd5e1", w: 24, h: 24, spriteScale: 0.45 },   // kunai gleam
    },
    seqs: {
      // PURE ATTACK — Lightning Clone Barrage: three Lightning Clones pile on (shocking), Kakashi Raikiri-
      // spikes down. (Barrage template.)
      pureAttack: {
        name: "Lightning Clone Barrage", cost: 40, cooldown: 90, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",              appear: 2,  vanish: 30, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 14, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "kakashiCombo2",    appear: 18, vanish: 46, place: { dx: 66,  dy: -70,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "kakashiRaikiriDash", appear: 32, vanish: 60, place: { dx: -60, dy: -120, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Ninken Pack Hold: two clones summon the hound pack on either flank, seize + drag the opponent
      // to centre, then Kakashi Raikiri-launches. (Flank/strike template.)
      grab: {
        name: "Ninken Pack Hold", cost: 40, cooldown: 96, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "kakashiNinDogsCast", appear: 2, vanish: 30, place: { dx: -66, dy: 0, face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 5,  knockbackY: -2 } },
          { at: 8, body: "c1", action: "kakashiNinDogsCast", appear: 4, vanish: 32, place: { dx: 66,  dy: 0, face: -1 }, hit: { damage: 12, hitstun: 34, knockbackX: -5, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 22, action: "kakashiRaikiriDash", teleport: { dx: -46 }, hit: { damage: 22, hitstun: 32, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Kunai Volley: clones flank the CASTER and hurl kunai; Kakashi throws a big kunai. (Shuriken
      // template.)
      ranged: {
        name: "Kunai Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "kakashiThrow", appear: 2,  vanish: 26, place: { ref: "caster", dx: -46, dy: -8  }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 16 } },
          { at: 12, body: "c1", action: "kakashiThrow", appear: 6,  vanish: 30, place: { ref: "caster", dx: 46,  dy: -30 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 16 } },
          { at: 18, body: "c2", action: "kakashiThrow", appear: 12, vanish: 36, place: { ref: "caster", dx: -40, dy: -58 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 17 } },
        ],
        finisher: { type: "projectile", at: 30, action: "kakashiThrow", hit: { projectile: true, damage: 22, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 18, big: true, w: 40, h: 40 } },
      },
      // DEFENSIVE — Lightning Clone Guard: a Lightning Clone stands in front (absorbs + shocks), Kakashi
      // Raikiri-flickers to the FAR side with i-frames + a counter kunai. (Escape template.)
      defensive: {
        name: "Lightning Clone Guard", cost: 30, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "kakashiRaikiriCharge", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "kakashiRaikiriDash", teleport: { behindTarget: true, dx: 76 }, iframes: 28,
          hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 16 } },
      },
      // DECEPTION — Sharingan Copy Feint (the copy-ninja identity): a decoy clone baits the commitment; the
      // Sharingan READS it and Kakashi warps behind to punish with a copied counter. (Escape + bait clone.)
      deception: {
        name: "Sharingan Copy Feint", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "kakashiPakkunCast", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "kakashiCombo3", teleport: { behindTarget: true, dx: 60 }, iframes: 24,
          hit: { damage: 18, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Raikiri Clone Swarm: a rising column of Lightning Clones each land a Raikiri-tier
      // hit, then a hard Raikiri spike. (Two-Thousand template.)
      swarm: {
        name: "Raikiri Clone Swarm", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",                appear: 2,  vanish: 20, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "kakashiRaikiriDash", appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 18, body: "c2", action: "kakashiRaikiriDash", appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 24, body: "c3", action: "kakashiCombo2",      appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 30, body: "c0", action: "kakashiRaikiriDash", appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3 } },
          { at: 36, body: "c1", action: "kakashiCombo3",      appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "kakashiRaikiriDash", appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2 } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── ITACHI UCHIHA — Crow Clone + Genjutsu + Katon (fire) + Clone Great Explosion. ───────────────
  // Canon basis: Itachi's clone game is CROW-based (Karasu Bunshin — a clone that scatters into a murder of
  // crows) and GENJUTSU-driven (misdirection), plus his Clone Great Explosion (shadow clones that detonate)
  // and Great Fireball. DECEPTION is his real crow-clone/genjutsu illusion — NOT a generic clone. Clones use
  // his real poses (genjutsuCast / fireballCast / itachiFire1-3 / grab). Theme colour = Katon crimson,
  // genjutsu beats overridden to Sharingan violet.
  itachi: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#dc2626", spriteScale: 0.5 },   // Katon crimson
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#f97316", w: 30, h: 30, spriteScale: 0.5 },   // fireball
    },
    seqs: {
      // PURE ATTACK — Crow Clone Barrage: three crow clones pile on with fire, Itachi spikes. (Barrage.)
      pureAttack: {
        name: "Crow Clone Barrage", cost: 40, cooldown: 90, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",         appear: 2,  vanish: 30, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 14, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "itachiFire1", appear: 18, vanish: 46, place: { dx: 66,  dy: -70,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "itachiFire2", appear: 32, vanish: 60, place: { dx: -60, dy: -120, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Genjutsu Bind: two crow clones cast a paralysing genjutsu on either flank, seize + drag the
      // opponent to centre, then Itachi launches. (Flank/strike template, violet genjutsu.)
      grab: {
        name: "Genjutsu Bind", cost: 40, cooldown: 96, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "genjutsuCast", appear: 2, vanish: 30, place: { dx: -66, dy: 0, face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 5,  knockbackY: -2, color: "#7c3aed" } },
          { at: 8, body: "c1", action: "genjutsuCast", appear: 4, vanish: 32, place: { dx: 66,  dy: 0, face: -1 }, hit: { damage: 12, hitstun: 34, knockbackX: -5, knockbackY: -2, color: "#7c3aed" } },
        ],
        finisher: { type: "strike", at: 22, action: "up", teleport: { dx: -46 }, hit: { damage: 22, hitstun: 32, knockbackX: 4, knockbackY: -13 } },
      },
      // RANGED — Great Fireball Volley: clones flank the CASTER and spit Katon fireballs; Itachi throws a big
      // Great Fireball. (Shuriken/projectile template.)
      ranged: {
        name: "Great Fireball Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "fireballCast", appear: 2,  vanish: 26, place: { ref: "caster", dx: -46, dy: -8  }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 12, body: "c1", action: "fireballCast", appear: 6,  vanish: 30, place: { ref: "caster", dx: 46,  dy: -30 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 18, body: "c2", action: "fireballCast", appear: 12, vanish: 36, place: { ref: "caster", dx: -40, dy: -58 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 30, action: "fireballCast", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 17, big: true, w: 48, h: 48 } },
      },
      // DEFENSIVE — Crow Clone Burst: a crow clone stands in front and BURSTS into crows (absorbs), Itachi
      // re-appears on the FAR side with i-frames + a counter fireball. (Escape template.)
      defensive: {
        name: "Crow Clone Burst", cost: 30, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "genjutsuCast", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "fireballCast", teleport: { behindTarget: true, dx: 76 }, iframes: 28,
          hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 16 } },
      },
      // DECEPTION — Crow Clone Illusion (his REAL clone gimmick): a decoy crow clone + genjutsu misdirection
      // bait the commitment; the real Itachi dissolves through the crows to appear behind and counter. (Escape
      // + bait clone; violet genjutsu counter.)
      deception: {
        name: "Crow Clone Illusion", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "genjutsuCast", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "genjutsuCast", teleport: { behindTarget: true, dx: 60 }, iframes: 24,
          hit: { damage: 18, hitstun: 26, knockbackX: 6, knockbackY: -3, color: "#7c3aed" } },
      },
      // ULTIMATE-SWARM — Clone Great Explosion: a rising column of crow clones EACH detonate on the opponent,
      // then a hard finishing spike. (Two-Thousand template — canon: Itachi's shadow clones self-destruct.)
      swarm: {
        name: "Clone Great Explosion", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",          appear: 2,  vanish: 20, place: { dx: -72, dy: 4,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "itachiFire1",  appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#f97316" } },
          { at: 18, body: "c2", action: "itachiFire2",  appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#f97316" } },
          { at: 24, body: "c3", action: "itachiFire3",  appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#f97316" } },
          { at: 30, body: "c0", action: "itachiFire2",  appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3, color: "#f97316" } },
          { at: 36, body: "c1", action: "itachiFire3",  appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2, color: "#f97316" } },
          { at: 44, body: "c2", action: "itachiFire1",  appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2, color: "#f97316" } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── MADARA UCHIHA — Wood Release (Mokuton) clones + Susanoo + Gunbai + Katon. ───────────────────
  // Canon basis: Madara mass-produces Wood Clones (his war-time Mokuton army); Wood Dragon; the Gunbai war-fan
  // (reflect/deflect); Susanoo. Per the brief, the HIGHER-tier moves (esp. Ultimate-Swarm) are built on Wood
  // Release + Susanoo. Clones use his real poses (madaraWoodSpikeCast/WoodDragonCast/SusanooPunch/Gunbai/
  // FireballCast). Theme = Katon crimson base; wood beats green, Susanoo beats teal.
  madara: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#dc2626", spriteScale: 0.5 },   // Katon crimson
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#f97316", w: 32, h: 32, spriteScale: 0.5 },   // fireball
    },
    seqs: {
      // PURE ATTACK — Wood Clone Barrage: three wood clones pile on (spikes + gunbai), Madara Susanoo-spikes.
      pureAttack: {
        name: "Wood Clone Barrage", cost: 42, cooldown: 92, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",                 appear: 2,  vanish: 30, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 15, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "madaraWoodSpikeCast", appear: 18, vanish: 46, place: { dx: 70,  dy: -70,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: 3, knockbackY: -7, color: "#65a30d" } },
          { at: 34, body: "c2", action: "madaraGunbaiSwing",   appear: 32, vanish: 60, place: { dx: -62, dy: -120, face: 1  }, hit: { damage: 13, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Wood Dragon Bind: two clones cast Wood Dragons on either flank, seize + drag the opponent to
      // centre, then Madara Susanoo-punch launches. (Flank/strike template.)
      grab: {
        name: "Wood Dragon Bind", cost: 42, cooldown: 96, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "madaraWoodDragonCast", appear: 2, vanish: 32, place: { dx: -70, dy: 0, face: 1  }, hit: { damage: 13, hitstun: 36, knockbackX: 5,  knockbackY: -2, color: "#65a30d" } },
          { at: 8, body: "c1", action: "madaraWoodDragonCast", appear: 4, vanish: 34, place: { dx: 70,  dy: 0, face: -1 }, hit: { damage: 13, hitstun: 36, knockbackX: -5, knockbackY: -2, color: "#65a30d" } },
        ],
        finisher: { type: "strike", at: 24, action: "madaraSusanooPunch", teleport: { dx: -50 }, hit: { damage: 24, hitstun: 34, knockbackX: 4, knockbackY: -13, color: "#22d3ee" } },
      },
      // RANGED — Great Fireball Volley: clones flank the CASTER and spit Katon fireballs; Madara throws a big
      // Great Fireball. (Shuriken/projectile template.)
      ranged: {
        name: "Great Fireball Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "madaraFireballCast", appear: 2,  vanish: 26, place: { ref: "caster", dx: -48, dy: -8  }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 12, body: "c1", action: "madaraFireballCast", appear: 6,  vanish: 30, place: { ref: "caster", dx: 48,  dy: -30 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 18, body: "c2", action: "madaraFireballCast", appear: 12, vanish: 36, place: { ref: "caster", dx: -42, dy: -58 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 30, action: "madaraFireballCast", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 17, big: true, w: 50, h: 50 } },
      },
      // DEFENSIVE — Gunbai Guard: a clone raises the Gunbai war-fan (deflects/absorbs), Madara re-appears on
      // the FAR side with i-frames + a counter fireball. (Escape template.)
      defensive: {
        name: "Gunbai Guard", cost: 32, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "madaraGunbaiSummon", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "madaraFireballCast", teleport: { behindTarget: true, dx: 78 }, iframes: 28,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 16 } },
      },
      // DECEPTION — Wood Clone Feint: a decoy wood clone is left where Madara stood while he re-appears behind
      // the target and Susanoo-counters. (Escape + bait clone.)
      deception: {
        name: "Wood Clone Feint", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "madaraWoodSpikeCast", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "madaraSusanooPunch", teleport: { behindTarget: true, dx: 60 }, iframes: 22,
          hit: { damage: 19, hitstun: 26, knockbackX: 6, knockbackY: -3, color: "#22d3ee" } },
      },
      // ULTIMATE-SWARM — Susanoo Wood-Clone Barrage (higher-tier per brief): a rising column of wood clones,
      // Susanoo strikes escalating up, then a hard Susanoo spike. (Two-Thousand template; teal Susanoo beats.)
      swarm: {
        name: "Susanoo Wood-Clone Barrage", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",                 appear: 2,  vanish: 20, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 13, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "madaraWoodSpikeCast", appear: 10, vanish: 24, place: { dx: 64,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#65a30d" } },
          { at: 18, body: "c2", action: "madaraWoodDragonCast", appear: 16, vanish: 30, place: { dx: -58, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#65a30d" } },
          { at: 24, body: "c3", action: "madaraSusanooPunch",  appear: 22, vanish: 36, place: { dx: 60,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3, color: "#22d3ee" } },
          { at: 30, body: "c0", action: "madaraSusanooPunch",  appear: 28, vanish: 42, place: { dx: -54, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3, color: "#22d3ee" } },
          { at: 36, body: "c1", action: "madaraGunbaiSwing",   appear: 34, vanish: 48, place: { dx: 56,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "madaraSusanooPunch",  appear: 42, vanish: 58, place: { dx: -50, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2, color: "#22d3ee" } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 34, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── BORUTO UZUMAKI — Shadow Clones + Clone Rasengan, DELIBERATELY SCALED DOWN. ──────────────────
  // Canon basis: Boruto's Shadow Clones, Clone Rasengan (borutoClone/CloneRasenForm/Release), Vanishing
  // Rasengan, Shiden (lightning), Kote scientific tools. Per the ratings audit he is a LESSER version of
  // Naruto — this kit uses FEWER clones (2 where others use 3, 3 where the swarm uses 4) and ~25–30% LOWER
  // damage than the equivalent Naruto/adult sequences. Clones use his real poses.
  boruto: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#38bdf8", spriteScale: 0.45 },   // Rasengan blue
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#a5f3fc", w: 22, h: 22, spriteScale: 0.4 },   // kote shot
    },
    seqs: {
      // PURE ATTACK — Clone Rasengan Combo (only TWO clones, lower damage): clone launch + a Rasengan, then a
      // small spike. (Scaled-down barrage.)
      pureAttack: {
        name: "Clone Rasengan Combo", cost: 34, cooldown: 86, duration: 64,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 4,  body: "c0", action: "up",            appear: 2,  vanish: 28, place: { dx: -68, dy: 4,   face: 1  }, hit: { damage: 10, hitstun: 26, knockbackX: 2, knockbackY: -11 } },
          { at: 20, body: "c1", action: "borutoRasengan", appear: 18, vanish: 44, place: { dx: 58,  dy: -66, face: -1 }, hit: { damage: 9,  hitstun: 24, knockbackX: 3, knockbackY: -6 } },
        ],
        finisher: { at: 40, action: "down_air", descendVy: 7, teleport: { dx: 16, dyAbove: 130 }, hit: { damage: 18, hitstun: 26, knockbackX: 5, knockbackY: 10 } },
      },
      // GRAB — Vanishing Snatch: two clones vanish-flank, seize + drag to centre, then a Palm-Blast launch.
      grab: {
        name: "Vanishing Snatch", cost: 34, cooldown: 92, duration: 56,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "borutoVanishing", appear: 2, vanish: 30, place: { dx: -62, dy: 0, face: 1  }, hit: { damage: 9, hitstun: 30, knockbackX: 4,  knockbackY: -2 } },
          { at: 8, body: "c1", action: "borutoVanishing", appear: 4, vanish: 32, place: { dx: 62,  dy: 0, face: -1 }, hit: { damage: 9, hitstun: 30, knockbackX: -4, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 22, action: "borutoPalmBlast", teleport: { dx: -44 }, hit: { damage: 16, hitstun: 28, knockbackX: 4, knockbackY: -11 } },
      },
      // RANGED — Kote Volley: two clones fire Kote tool-shots; Boruto throws a bigger shot. (Scaled-down.)
      ranged: {
        name: "Kote Volley", cost: 38, cooldown: 94, duration: 52,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6,  body: "c0", action: "borutoKote", appear: 2, vanish: 28, place: { ref: "caster", dx: -44, dy: -8  }, hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 4, knockbackY: -1, speed: 16 } },
          { at: 12, body: "c1", action: "borutoKote", appear: 6, vanish: 32, place: { ref: "caster", dx: 44,  dy: -30 }, hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 4, knockbackY: -1, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 26, action: "borutoKote", hit: { projectile: true, damage: 18, hitstun: 20, knockbackX: 7, knockbackY: -3, speed: 18, big: true, w: 36, h: 36 } },
      },
      // DEFENSIVE — Clone Guard: a clone stands in front (absorbs), Boruto vanishes to the FAR side with
      // i-frames + a counter shot. (Escape template, scaled down.)
      defensive: {
        name: "Clone Guard", cost: 26, cooldown: 80, duration: 38,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "borutoClone", appear: 0, vanish: 28, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "borutoVanishing", teleport: { behindTarget: true, dx: 72 }, iframes: 24,
          hit: { projectile: true, damage: 8, hitstun: 14, knockbackX: 5, knockbackY: -1, speed: 16 } },
      },
      // DECEPTION — Vanishing Feint: a decoy clone is left while Boruto vanishes behind the target + counter.
      deception: {
        name: "Vanishing Feint", cost: 28, cooldown: 84, duration: 42,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "borutoClone", appear: 0, vanish: 32, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "borutoShiden", teleport: { behindTarget: true, dx: 58 }, iframes: 20,
          hit: { damage: 14, hitstun: 24, knockbackX: 5, knockbackY: -3, color: "#a78bfa" } },
      },
      // ULTIMATE-SWARM — Clone Rasengan Barrage: only THREE clones (vs the adults' four), lower per-hit damage
      // and a smaller finisher. Rising Rasengan column → modest spike. (Scaled-down Two-Thousand.)
      swarm: {
        name: "Clone Rasengan Barrage", cost: 55, cooldown: 116, duration: 80,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",            appear: 2,  vanish: 20, place: { dx: -66, dy: 4,    face: 1  }, hit: { damage: 10, hitstun: 30, knockbackX: 2, knockbackY: -11 } },
          { at: 12, body: "c1", action: "borutoRasengan", appear: 10, vanish: 26, place: { dx: 58,  dy: -46,  face: -1 }, hit: { damage: 5,  hitstun: 18, knockbackX: 2, knockbackY: -3 } },
          { at: 18, body: "c2", action: "borutoCloneRasenRelease", appear: 16, vanish: 32, place: { dx: -52, dy: -80, face: 1 }, hit: { damage: 5, hitstun: 18, knockbackX: 2, knockbackY: -3 } },
          { at: 26, body: "c0", action: "borutoRasengan", appear: 24, vanish: 40, place: { dx: 54,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 34, body: "c1", action: "borutoCloneRasenRelease", appear: 32, vanish: 48, place: { dx: -48, dy: -142, face: 1 }, hit: { damage: 6, hitstun: 20, knockbackX: 2, knockbackY: -2 } },
        ],
        finisher: { at: 50, action: "down_air", descendVy: 8, teleport: { dx: 12, dyAbove: 172 }, hit: { damage: 22, hitstun: 28, knockbackX: 6, knockbackY: 13 } },
      },
    },
  },

  // ── PAIN (Deva Path) — Six Paths + shadow-clone flank crush. ────────────────────────────────────
  // Canon basis (per the brief): pull out a shadow clone so BOTH bodies flank the opponent from either side,
  // then Almighty Push (Shinra Tensei) + Almighty Pull (Banshō Ten'in) TOGETHER to crush/tear the opponent
  // between them (real Deva Path). The other moves use his real Six Paths kit (Asura mechanised shots, Preta
  // absorption/Rinnegan guard, Chibaku-flavoured swarm). Clones use his real poses (painAlmightyPush/Pull/
  // SuperPushCast, painDederaCast, painChibakuCast, painCombo). Theme = Rinnegan violet-grey.
  pain: {
    fx: {
      melee: { fxType: "cloneChoreoHit", color: "#a78bfa", spriteScale: 0.55 },   // Rinnegan violet
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#c4b5fd", w: 30, h: 30, spriteScale: 0.5 },   // gravity/mech shot
    },
    seqs: {
      // GRAB — DEVA PATH CRUSH (the signature): a shadow clone is pulled out; both bodies flank, then one
      // Almighty PUSHES and the other Almighty PULLS at once — the opponent is crushed to centre from BOTH
      // sides — then Pain Super-Almighty-Push launches. (Flank/strike template; both beats knock inward.)
      grab: {
        name: "Deva Path Crush", cost: 44, cooldown: 98, duration: 62,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6, body: "c0", action: "painAlmightyPushCast", appear: 2, vanish: 34, place: { dx: -70, dy: 0, face: 1  }, hit: { damage: 14, hitstun: 36, knockbackX: 6,  knockbackY: -2 } },   // PUSH from the left → inward
          { at: 8, body: "c1", action: "painAlmightyPullCast", appear: 4, vanish: 36, place: { dx: 70,  dy: 0, face: -1 }, hit: { damage: 14, hitstun: 36, knockbackX: -6, knockbackY: -2 } },   // PULL from the right → inward (crush)
        ],
        finisher: { type: "strike", at: 24, action: "painSuperPushCast", teleport: { dx: -50 }, hit: { damage: 26, hitstun: 36, knockbackX: 5, knockbackY: -13 } },
      },
      // DECEPTION — Shadow Clone Bait: pull out a shadow clone as a decoy; Pain Banshō-Ten'in-pulls himself
      // behind the target and counters. (Escape + bait clone.)
      deception: {
        name: "Shadow Clone Bait", cost: 34, cooldown: 88, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "painJab", appear: 0, vanish: 34, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "painAlmightyPullCast", teleport: { behindTarget: true, dx: 60 }, iframes: 22,
          hit: { damage: 19, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // PURE ATTACK — Six Paths Barrage: three bodies pile on in order, Pain Almighty-Push spikes down.
      pureAttack: {
        name: "Six Paths Barrage", cost: 42, cooldown: 92, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "up",         appear: 2,  vanish: 30, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 15, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
          { at: 20, body: "c1", action: "painCombo2",  appear: 18, vanish: 46, place: { dx: 70,  dy: -70,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
          { at: 34, body: "c2", action: "painCombo3",  appear: 32, vanish: 60, place: { dx: -62, dy: -120, face: 1  }, hit: { damage: 13, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
        ],
        finisher: { at: 52, action: "down_air", descendVy: 7, teleport: { dx: 18, dyAbove: 150 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // RANGED — Asura Path Volley: clones flank the CASTER and fire mechanised/gravity shots; Pain fires a
      // big Almighty-Push shockwave. (Shuriken/projectile template.)
      ranged: {
        name: "Asura Path Volley", cost: 45, cooldown: 100, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 6,  body: "c0", action: "painAlmightyPushCast", appear: 2,  vanish: 26, place: { ref: "caster", dx: -48, dy: -8  }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 12, body: "c1", action: "painAlmightyPushCast", appear: 6,  vanish: 30, place: { ref: "caster", dx: 48,  dy: -30 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
          { at: 18, body: "c2", action: "painAlmightyPushCast", appear: 12, vanish: 36, place: { ref: "caster", dx: -42, dy: -58 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
        ],
        finisher: { type: "projectile", at: 30, action: "painSuperPushCast", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 10, knockbackY: -3, speed: 17, big: true, w: 50, h: 50 } },
      },
      // DEFENSIVE — Preta / Rinnegan Guard: a clone raises an absorption barrier (absorbs), Pain re-appears
      // on the FAR side with i-frames + a counter shockwave. (Escape template.)
      defensive: {
        name: "Rinnegan Guard", cost: 32, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "painDederaCast", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 4, action: "painAlmightyPushCast", teleport: { behindTarget: true, dx: 78 }, iframes: 28,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 16 } },
      },
      // ULTIMATE-SWARM — Six Paths Assault: a rising column of the six bodies pummel, then a hard
      // Chibaku-Tensei-flavoured spike. (Two-Thousand template.)
      swarm: {
        name: "Six Paths Assault", cost: 60, cooldown: 120, duration: 92,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 4,  body: "c0", action: "up",                   appear: 2,  vanish: 20, place: { dx: -74, dy: 4,    face: 1  }, hit: { damage: 13, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
          { at: 12, body: "c1", action: "painCombo1",            appear: 10, vanish: 24, place: { dx: 64,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 18, body: "c2", action: "painCombo2",            appear: 16, vanish: 30, place: { dx: -58, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 24, body: "c3", action: "painAlmightyPullCast",  appear: 22, vanish: 36, place: { dx: 60,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
          { at: 30, body: "c0", action: "painAlmightyPushCast",  appear: 28, vanish: 42, place: { dx: -54, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3 } },
          { at: 36, body: "c1", action: "painCombo3",            appear: 34, vanish: 48, place: { dx: 56,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
          { at: 44, body: "c2", action: "painSuperPushCast",     appear: 42, vanish: 58, place: { dx: -50, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2 } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 32, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
      },
    },
  },

  // ── SASUKE UCHIHA — LIGHT KIT (1 move, direct-trigger, no formation). ───────────────────────────
  // Per the brief: add just 1-2 moves; reuse his REAL confirmed technique AMENOTEJIKARA (space-time swap,
  // seen vs Momoshiki) as the Deception rather than forcing a generic shadow clone. Direct-trigger: ↓↓↑ +
  // Special leaves a Sharingan afterimage where he stood and swaps him behind the target for a Chidori
  // counter. The afterimage renders as the REAL Sasuke sprite (Stage-0 fidelity). light:true → no formation.
  sasuke: {
    light: true,
    directMap: { N: "amenotejikara" },
    fx: { melee: { fxType: "cloneChoreoHit", color: "#7c3aed", spriteScale: 0.5 }, proj: { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#a78bfa", w: 24, h: 24, spriteScale: 0.45 } },
    seqs: {
      amenotejikara: {
        name: "Amenotejikara", cost: 32, cooldown: 96, duration: 40,
        clones: [{ slot: "c0" }],   // the Sharingan afterimage left at the swap origin
        beats: [
          { at: 2, body: "c0", action: "dash", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "chidoriKoiten", teleport: { behindTarget: true, dx: 58 }, iframes: 26,
          hit: { damage: 20, hitstun: 28, knockbackX: 6, knockbackY: -3, color: "#7c3aed" } },
      },
    },
  },

  // ── OBITO UCHIHA — LIGHT KIT (2 moves, direct-trigger, no formation). ───────────────────────────
  // Per the brief: add 1-2 moves; check they don't collide with his Kamui slots. They DON'T — the access is
  // the ↓↓↑ MOTION + Special, orthogonal to every held-direction Kamui special (neutral/Fwd/Up/Down/Back +
  // Block). Held direction at the press selects: neutral = Kamui Clone Feint (phase-behind deception),
  // Down = Shadow Clone Ambush (a quick 2-clone Kamui strike). Clones render as the REAL Obito. light:true.
  obito: {
    light: true,
    directMap: { N: "kamuiFeint", D: "cloneAmbush" },
    fx: { melee: { fxType: "cloneChoreoHit", color: "#7c3aed", spriteScale: 0.5 }, proj: { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#a78bfa", w: 24, h: 24, spriteScale: 0.45 } },
    seqs: {
      // DECEPTION — Kamui Clone Feint: a decoy clone is left while Obito phases (Kamui) behind the target + counter.
      kamuiFeint: {
        name: "Kamui Clone Feint", cost: 32, cooldown: 92, duration: 42,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "obitoKamuiActivate", appear: 0, vanish: 32, place: { ref: "casterStart", dx: 0, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "obitoRod1", teleport: { behindTarget: true, dx: 60 }, iframes: 24,
          hit: { damage: 19, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // PURE ATTACK (lite) — Shadow Clone Ambush: two clones phase in and strike, Obito spikes. (Small barrage.)
      cloneAmbush: {
        name: "Shadow Clone Ambush", cost: 36, cooldown: 96, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 4,  body: "c0", action: "up",       appear: 2,  vanish: 28, place: { dx: -66, dy: 4,   face: 1  }, hit: { damage: 12, hitstun: 28, knockbackX: 2, knockbackY: -12 } },
          { at: 20, body: "c1", action: "obitoRod2", appear: 18, vanish: 44, place: { dx: 60,  dy: -66, face: -1 }, hit: { damage: 10, hitstun: 24, knockbackX: 3, knockbackY: -6 } },
        ],
        finisher: { at: 38, action: "down_air", descendVy: 7, teleport: { dx: 16, dyAbove: 140 }, hit: { damage: 22, hitstun: 28, knockbackX: 6, knockbackY: 11 } },
      },
    },
  },
}
