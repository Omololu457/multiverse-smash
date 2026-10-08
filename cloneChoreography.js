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
export const SELECT_WINDOW = 90            // frames to pick before the formation disperses (EASED 2026-10-07: 60->90 ≈ 1.0s->1.5s)

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

// STAGE CLAMP (2026-10-07 audit fix): clone/caster placement is ref.x + dx with no bounds, so near a wall
// a clone (or the finisher teleport) could spawn OFF-STAGE. Clamp x into [0, worldWidth - w] so every clone
// stays visible on the field. Conservative choice: clamp (clones bunch against the wall when cornered)
// rather than mirror the whole formation, which would be a larger behavioural change.
let _worldW = 3200
const _clampX = (x, w) => Math.max(0, Math.min(_worldW - (w || 60), x))

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

export function updateFormations(worldWidth) {
  if (worldWidth) _worldW = worldWidth
  for (let i = _forms.length - 1; i >= 0; i--) {
    const fm = _forms[i], c = fm.caster
    // Interruptible summon: a hit / an attack / a KO cancels it (real-play fairness).
    if (!c || c.eliminated || (c.hitstun || 0) > 0 || c.attacking) { _releaseFormationCaster(fm); _forms.splice(i, 1); continue }
    FORMATION_OFFSETS.forEach((off, k) => {
      const b = fm.bodies[k]; b._choreoVisible = true
      b.x = _clampX(c.x + off.dx, b.w); b.y = c.y + off.dy
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
export function updateChoreo(fireHit, worldWidth) {
  if (worldWidth) _worldW = worldWidth
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
        body.x = _clampX(cx + b.place.dx - (body.w || 0) / 2, body.w)
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

    // Keep the finisher teleport on-stage too (escape/strike/spike set caster.x near the target/wall).
    if (fin && f >= fin.at) caster.x = _clampX(caster.x, caster.w)
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
      // SIGNATURE (distinct): FEW clones, TIGHT warps RIGHT beside the foe, RAPID near-simultaneous rhythm
      // (teleport feel) — the opposite of a wide staggered barrage. Clone-count profile 2-1-2-1-2-3.
      // PURE ATTACK — Hiraishin Flash Strike. CANON: Flying Thunder God simultaneous warp-strikes. TWO clones
      // flash in point-blank on both flanks almost at once and strike, then Minato warps in for the spike.
      pureAttack: {
        name: "Hiraishin Flash Strike", cost: 38, cooldown: 88, duration: 62,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 2, body: "c0", action: "minatoRush1", appear: 0, vanish: 28, place: { dx: -46, dy: -6, face: 1  }, hit: { damage: 15, hitstun: 28, knockbackX: 4,  knockbackY: -8 } },
          { at: 6, body: "c1", action: "minatoRush2", appear: 4, vanish: 32, place: { dx: 46,  dy: -6, face: -1 }, hit: { damage: 15, hitstun: 28, knockbackX: -4, knockbackY: -8 } },
        ],
        finisher: { at: 22, action: "down_air", descendVy: 8, teleport: { dx: 10, dyAbove: 120 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Rasengan Warp-Grab. CANON: a single marked-kunai warp into a point-blank Rasengan. ONE clone
      // marks + pins the foe dead-centre; Minato warps to the mark and drives a Rasengan (hard horizontal blast,
      // not a launch). Distinct: single centred clone (not a two-side flank), horizontal knockback.
      grab: {
        name: "Rasengan Warp-Grab", cost: 40, cooldown: 94, duration: 52,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 4, body: "c0", action: "minatoRaijin1", appear: 0, vanish: 28, place: { dx: 0, dy: -18, face: 1 }, hit: { damage: 16, hitstun: 42, knockbackX: 0, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 18, action: "minatoRasengan", teleport: { dx: -28 }, hit: { damage: 26, hitstun: 28, knockbackX: 11, knockbackY: -3 } },
      },
      // RANGED — Marked Kunai Scatter. CANON: detonating marked kunai. TWO clones hurl marked kunai from a
      // HIGH/LOW vertical split (not a flat flank), Minato warps among them with a big detonation. Distinct:
      // 2 clones, vertical-stacked spawn, very fast projectiles.
      ranged: {
        name: "Marked Kunai Scatter", cost: 44, cooldown: 98, duration: 54,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 4,  body: "c0", action: "minatoCloneCast", appear: 0, vanish: 26, place: { ref: "caster", dx: -34, dy: -62 }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 19 } },
          { at: 10, body: "c1", action: "minatoCloneCast", appear: 4, vanish: 30, place: { ref: "caster", dx: -34, dy: 2   }, hit: { projectile: true, damage: 13, hitstun: 18, knockbackX: 5, knockbackY: 0,  speed: 19 } },
        ],
        finisher: { type: "projectile", at: 24, action: "heavy", hit: { projectile: true, damage: 26, hitstun: 26, knockbackX: 11, knockbackY: -3, speed: 21, big: true, w: 44, h: 44 } },
      },
      // DEFENSIVE — Flash Guard. CANON: warp to safety. ONE clone steps in FRONT (toward the foe) to eat the
      // hit while Minato flashes FAR behind with long i-frames + a counter kunai. Distinct: front-placed clone
      // (not on-spot), earliest beat, longest escape distance + i-frames of the roster.
      defensive: {
        name: "Flash Guard", cost: 28, cooldown: 82, duration: 38,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 0, body: "c0", action: "minatoCloneCast", appear: 0, vanish: 28, place: { dx: -34, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 3, action: "minatoRaijin1", teleport: { behindTarget: true, dx: 88 }, iframes: 32,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 7, knockbackY: -1, speed: 19 } },
      },
      // DECEPTION — Afterimage Split. CANON-ADJACENT (Hiraishin leaves afterimages): TWO decoy afterimages
      // flank where Minato stood while he flashes behind to counter — a double-bait, not a single decoy.
      // Distinct: TWO deception clones (unique across the roster), symmetric flank.
      deception: {
        name: "Afterimage Split", cost: 34, cooldown: 86, duration: 46,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 2, body: "c0", action: "idle", appear: 0, vanish: 36, place: { dx: -38, dy: 0, face: 1  } },
          { at: 2, body: "c1", action: "idle", appear: 0, vanish: 36, place: { dx: 38,  dy: 0, face: -1 } },
        ],
        finisher: { type: "escape", at: 10, action: "minatoRaijin2", teleport: { behindTarget: true, dx: 52 }, iframes: 24,
          hit: { damage: 20, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Thunder God Assault. CANON-ADJACENT (mass Hiraishin barrage): THREE clones warp a
      // RAPID low-rise criss-cross of Rasengan strikes (fast cadence, shallow climb), then a hard teleport
      // spike. Distinct: 3 clones (not 4), tight fast criss-cross (not a tall slow column), strike finisher.
      swarm: {
        name: "Thunder God Assault", cost: 58, cooldown: 118, duration: 74,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 3,  body: "c0", action: "minatoRush1",    appear: 0,  vanish: 18, place: { dx: -58, dy: -10,  face: 1  }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -6 } },
          { at: 9,  body: "c1", action: "minatoRasengan", appear: 6,  vanish: 24, place: { dx: 56,  dy: -34,  face: -1 }, hit: { damage: 8,  hitstun: 20, knockbackX: 3, knockbackY: -4, color: "#93c5fd" } },
          { at: 15, body: "c2", action: "minatoRasengan", appear: 12, vanish: 30, place: { dx: -50, dy: -60,  face: 1  }, hit: { damage: 8,  hitstun: 20, knockbackX: 3, knockbackY: -4, color: "#93c5fd" } },
          { at: 22, body: "c0", action: "minatoRasengan", appear: 20, vanish: 36, place: { dx: 50,  dy: -88,  face: -1 }, hit: { damage: 9,  hitstun: 22, knockbackX: 3, knockbackY: -4, color: "#93c5fd" } },
          { at: 30, body: "c1", action: "minatoRush2",    appear: 28, vanish: 44, place: { dx: -44, dy: -116, face: 1  }, hit: { damage: 10, hitstun: 24, knockbackX: 3, knockbackY: -4 } },
        ],
        finisher: { type: "strike", at: 44, action: "minatoRaijin2", teleport: { behindTarget: true, dx: 46 }, hit: { damage: 32, hitstun: 34, knockbackX: 8, knockbackY: -14 } },
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
      // SIGNATURE (distinct): the SWARM king — the HIGHEST clone counts of the roster in a WIDE SURROUND
      // (clones ring the foe from far both sides, not a one-side column), SLOW heavy rhythm, and a true BIND
      // (roots drag inward with high hitstun). Clone-count profile 5-3-2-2-1-5.
      // PURE ATTACK — Wood Clone Onslaught. CANON: Mokuton Bunshin mass-production. FIVE wood clones surround
      // and pile on from alternating far flanks, Hashirama finishes with a super wood-punch spike.
      pureAttack: {
        name: "Wood Clone Onslaught", cost: 44, cooldown: 94, duration: 96,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }, { slot: "c4" }],
        beats: [
          { at: 5,  body: "c0", action: "woodPunch",     appear: 2,  vanish: 34, place: { dx: -98, dy: 2,    face: 1  }, hit: { damage: 12, hitstun: 30, knockbackX: 3, knockbackY: -9 } },
          { at: 16, body: "c1", action: "mokutonArm",    appear: 13, vanish: 44, place: { dx: 94,  dy: -24,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: -3, knockbackY: -7 } },
          { at: 28, body: "c2", action: "woodPunch",     appear: 25, vanish: 56, place: { dx: -84, dy: -58,  face: 1  }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -6 } },
          { at: 42, body: "c3", action: "mokutonArm",    appear: 39, vanish: 68, place: { dx: 82,  dy: -96,  face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: -3, knockbackY: -6 } },
          { at: 56, body: "c4", action: "woodPunch",     appear: 53, vanish: 82, place: { dx: -70, dy: -134, face: 1  }, hit: { damage: 11, hitstun: 26, knockbackX: 3, knockbackY: -6 } },
        ],
        finisher: { at: 74, action: "down_air", descendVy: 7, teleport: { dx: 16, dyAbove: 168 }, hit: { damage: 30, hitstun: 32, knockbackX: 6, knockbackY: 13 } },
      },
      // GRAB — Deep Forest Emergence. CANON: binding roots/branches that seize. THREE clones raise roots in a
      // THREE-POINT trap (both far flanks + behind) that DRAG the foe inward (knockback toward centre), then a
      // super-punch launch. Distinct: 3-clone surround-bind (not a 2-side flank), strong inward pull.
      grab: {
        name: "Deep Forest Emergence", cost: 46, cooldown: 100, duration: 64,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "treeSummon1", appear: 0,  vanish: 34, place: { dx: -92, dy: 0,   face: 1  }, hit: { damage: 11, hitstun: 40, knockbackX: 8,  knockbackY: -1 } },
          { at: 4,  body: "c1", action: "treeSummon1", appear: 0,  vanish: 34, place: { dx: 92,  dy: 0,   face: -1 }, hit: { damage: 11, hitstun: 40, knockbackX: -8, knockbackY: -1 } },
          { at: 12, body: "c2", action: "treeSummon1", appear: 8,  vanish: 38, place: { dx: 0,   dy: -12, face: 1  }, hit: { damage: 9,  hitstun: 42, knockbackX: 0,  knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 28, action: "woodPunchSuper", teleport: { dx: -40 }, hit: { damage: 26, hitstun: 36, knockbackX: 4, knockbackY: -15 } },
      },
      // RANGED — Wood Pillar Barrage. CANON: wood-spike/pillar zoning. TWO clones brace LOW/HIGH and fire heavy
      // slow pillars (not a fast three-kunai spray); Hashirama hurls a giant pillar. Distinct: 2 clones, heavy
      // slow projectiles, wide pillars.
      ranged: {
        name: "Wood Pillar Barrage", cost: 46, cooldown: 102, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 8,  body: "c0", action: "hashiWoodStraight", appear: 2,  vanish: 30, place: { ref: "caster", dx: -54, dy: 4   }, hit: { projectile: true, damage: 15, hitstun: 20, knockbackX: 6, knockbackY: -1, speed: 12, big: true, w: 40, h: 40 } },
          { at: 20, body: "c1", action: "hashiWoodStraight", appear: 14, vanish: 42, place: { ref: "caster", dx: -54, dy: -48 }, hit: { projectile: true, damage: 15, hitstun: 20, knockbackX: 6, knockbackY: -2, speed: 12, big: true, w: 40, h: 40 } },
        ],
        finisher: { type: "projectile", at: 34, action: "hashiWoodStraight", hit: { projectile: true, damage: 26, hitstun: 26, knockbackX: 10, knockbackY: -3, speed: 14, big: true, w: 58, h: 58 } },
      },
      // DEFENSIVE — Wood Clone Bulwark. CANON: Wood Wall. TWO wood clones raise a DOUBLE wall on both sides
      // (not a single on-spot clone) while Hashirama emerges far behind with a counter spike. Distinct: 2-clone
      // flanking wall.
      defensive: {
        name: "Wood Clone Bulwark", cost: 34, cooldown: 86, duration: 42,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 1, body: "c0", action: "mokutonArm", appear: 0, vanish: 32, place: { dx: -40, dy: 0, face: 1  } },
          { at: 1, body: "c1", action: "mokutonArm", appear: 0, vanish: 32, place: { dx: 40,  dy: 0, face: -1 } },
        ],
        finisher: { type: "escape", at: 5, action: "woodPunch", teleport: { behindTarget: true, dx: 70 }, iframes: 26,
          hit: { projectile: true, damage: 12, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 13 } },
      },
      // DECEPTION — Wood Clone Feint. CANON: a wood decoy. ONE decoy clone left slightly forward while
      // Hashirama emerges behind. Distinct timing/placement from the water/crow feints.
      deception: {
        name: "Wood Clone Feint", cost: 36, cooldown: 90, duration: 46,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 1, body: "c0", action: "woodCloneCast", appear: 0, vanish: 36, place: { dx: -14, dy: -4, face: 1 } },
        ],
        finisher: { type: "escape", at: 8, action: "woodPunchSuper", teleport: { behindTarget: true, dx: 54 }, iframes: 20,
          hit: { damage: 21, hitstun: 28, knockbackX: 6, knockbackY: -4 } },
      },
      // ULTIMATE-SWARM — Sage Art: Deep Forest Bloom. CANON: Sage Art + wood golem. FIVE clones erupt as a
      // towering WIDE forest column (broad base narrowing up), then a wood-golem slam. Distinct: 5 clones, wide
      // pyramidal column (vs tight criss-cross / narrow columns).
      swarm: {
        name: "Sage Art: Deep Forest Bloom", cost: 62, cooldown: 124, duration: 100,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }, { slot: "c4" }],
        beats: [
          { at: 4,  body: "c0", action: "woodPunch",      appear: 2,  vanish: 22, place: { dx: -96, dy: 2,    face: 1  }, hit: { damage: 11, hitstun: 34, knockbackX: 3, knockbackY: -11 } },
          { at: 12, body: "c1", action: "woodPunch",      appear: 10, vanish: 28, place: { dx: 92,  dy: -30,  face: -1 }, hit: { damage: 7,  hitstun: 20, knockbackX: 3, knockbackY: -4 } },
          { at: 22, body: "c2", action: "mokutonArm",     appear: 20, vanish: 38, place: { dx: -74, dy: -72,  face: 1  }, hit: { damage: 7,  hitstun: 20, knockbackX: 2, knockbackY: -4 } },
          { at: 34, body: "c3", action: "woodPunchSuper", appear: 32, vanish: 50, place: { dx: 58,  dy: -120, face: -1 }, hit: { damage: 8,  hitstun: 22, knockbackX: 2, knockbackY: -4 } },
          { at: 48, body: "c4", action: "woodPunchSuper", appear: 46, vanish: 66, place: { dx: -40, dy: -168, face: 1  }, hit: { damage: 9,  hitstun: 24, knockbackX: 2, knockbackY: -4 } },
        ],
        finisher: { at: 64, action: "down_air", descendVy: 9, teleport: { dx: 10, dyAbove: 196 }, hit: { damage: 34, hitstun: 34, knockbackX: 8, knockbackY: 17 } },
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
      // SIGNATURE (distinct): "The Professor" — the FIVE NATURE TRANSFORMATIONS. Clones each cast a DIFFERENT
      // element at once, placed as an elemental SPREAD (not a single-side column), with per-element colours.
      // Clone-count profile 4-2-3-1-2-5 (the only 4-in-pureAttack / 5-in-swarm 2-deception shape).
      // PURE ATTACK — Four Elements Volley. CANON-ADJACENT: his multi-element mastery. FOUR clones each a
      // distinct element (Fire/Wind/Earth/Fire) strike from a four-corner spread; Hiruzen spikes.
      pureAttack: {
        name: "Four Elements Volley", cost: 44, cooldown: 94, duration: 80,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 5,  body: "c0", action: "hiruzenFireCast",  appear: 2,  vanish: 32, place: { dx: -88, dy: 2,    face: 1  }, hit: { damage: 12, hitstun: 30, knockbackX: 3, knockbackY: -11, color: "#f97316" } },
          { at: 14, body: "c1", action: "hiruzenSpin",      appear: 11, vanish: 42, place: { dx: 80,  dy: -34,  face: -1 }, hit: { damage: 9,  hitstun: 26, knockbackX: -3, knockbackY: -6, color: "#a3e635" } },
          { at: 26, body: "c2", action: "hiruzenEarthCast", appear: 23, vanish: 54, place: { dx: -70, dy: -78,  face: 1  }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -6,  color: "#a16207" } },
          { at: 40, body: "c3", action: "hiruzenFireCast",  appear: 37, vanish: 66, place: { dx: 64,  dy: -118, face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: -3, knockbackY: -6, color: "#facc15" } },
        ],
        finisher: { at: 56, action: "down_air", descendVy: 7, teleport: { dx: 16, dyAbove: 158 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Earth Prison Clamp. CANON: Doton earthen bind. TWO Earth clones clamp from mid-range and HOLD
      // (very high hitstun, no drag), then an uppercut launch. Distinct: mid-range clamp (not far flank / pull).
      grab: {
        name: "Earth Prison Clamp", cost: 42, cooldown: 96, duration: 56,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 5, body: "c0", action: "hiruzenBind", appear: 0, vanish: 32, place: { dx: -52, dy: -4, face: 1  }, hit: { damage: 12, hitstun: 46, knockbackX: 2,  knockbackY: -1, color: "#a16207" } },
          { at: 9, body: "c1", action: "hiruzenBind", appear: 2, vanish: 34, place: { dx: 52,  dy: -4, face: -1 }, hit: { damage: 12, hitstun: 46, knockbackX: -2, knockbackY: -1, color: "#a16207" } },
        ],
        finisher: { type: "strike", at: 26, action: "up", teleport: { dx: -36 }, hit: { damage: 24, hitstun: 34, knockbackX: 3, knockbackY: -15 } },
      },
      // RANGED — Elemental Fan. CANON-ADJACENT: Fire/Wind/Water bullets fanned. THREE clones fan projectiles
      // from a low arc, Hiruzen caps with a Great Fireball. Distinct: low fanned arc (vs vertical stack / flat).
      ranged: {
        name: "Elemental Fan", cost: 46, cooldown: 100, duration: 56,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 5,  body: "c0", action: "hiruzenFireCast", appear: 2,  vanish: 28, place: { ref: "caster", dx: -40, dy: 6   }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: 1,  speed: 14, color: "#f97316" } },
          { at: 11, body: "c1", action: "hiruzenSpin",     appear: 7,  vanish: 32, place: { ref: "caster", dx: -44, dy: -22 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 15, color: "#a3e635" } },
          { at: 17, body: "c2", action: "hiruzenFireCast", appear: 13, vanish: 38, place: { ref: "caster", dx: -40, dy: -50 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -4, speed: 15, color: "#38bdf8" } },
        ],
        finisher: { type: "projectile", at: 28, action: "hiruzenFireCast", hit: { projectile: true, damage: 24, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 16, big: true, w: 48, h: 48, color: "#f97316" } },
      },
      // DEFENSIVE — Mud Wall Guard. CANON: Doton wall. ONE Earth clone raises a mud wall slightly forward,
      // Hiruzen re-appears behind with a counter fireball. Distinct placement/timing from the others.
      defensive: {
        name: "Mud Wall Guard", cost: 32, cooldown: 84, duration: 40,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 2, body: "c0", action: "hiruzenEarthCast", appear: 0, vanish: 30, place: { dx: -20, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 7, action: "hiruzenFireCast", teleport: { behindTarget: true, dx: 66 }, iframes: 26,
          hit: { projectile: true, damage: 12, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15, color: "#f97316" } },
      },
      // DECEPTION — Twin Shadow Feint. CANON: shadow clones. TWO decoy clones split wide while Hiruzen
      // re-appears behind and spins a counter. Distinct: 2-clone wide split (unique to Hiruzen vs Minato's near pair).
      deception: {
        name: "Twin Shadow Feint", cost: 36, cooldown: 90, duration: 46,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 2, body: "c0", action: "idle", appear: 0, vanish: 36, place: { dx: -54, dy: 0, face: 1  } },
          { at: 4, body: "c1", action: "idle", appear: 0, vanish: 36, place: { dx: 54,  dy: 0, face: -1 } },
        ],
        finisher: { type: "escape", at: 11, action: "hiruzenSpin", teleport: { behindTarget: true, dx: 56 }, iframes: 22,
          hit: { damage: 20, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Five Elements Grand Combination. CANON: all five nature transformations at once.
      // FIVE clones each a distinct element rise in a STAR/wide column, then a grand elemental spike. Distinct:
      // 5 clones, one per element, widest column of the roster.
      swarm: {
        name: "Five Elements Grand Combination", cost: 62, cooldown: 124, duration: 96,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }, { slot: "c4" }],
        beats: [
          { at: 4,  body: "c0", action: "hiruzenFireCast",  appear: 2,  vanish: 22, place: { dx: -90, dy: 2,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 3, knockbackY: -11, color: "#f97316" } },
          { at: 12, body: "c1", action: "hiruzenSpin",      appear: 10, vanish: 26, place: { dx: 84,  dy: -32,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 3, knockbackY: -4, color: "#38bdf8" } },
          { at: 20, body: "c2", action: "hiruzenSpin",      appear: 18, vanish: 34, place: { dx: -70, dy: -72,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -4, color: "#a3e635" } },
          { at: 30, body: "c3", action: "hiruzenEarthCast", appear: 28, vanish: 46, place: { dx: 54,  dy: -116, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -4, color: "#a16207" } },
          { at: 42, body: "c4", action: "hiruzenFireCast",  appear: 40, vanish: 60, place: { dx: -38, dy: -162, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -4, color: "#facc15" } },
        ],
        finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 10, dyAbove: 192 }, hit: { damage: 32, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
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
      // SIGNATURE (distinct): the COPY-NINJA — the FEWEST clones of the roster, CLOSE precise single pierces
      // (Raikiri hits hard once, not a wide juggle), a KAMUI-flavoured phase defence, and a Sharingan-read
      // deception. Clone-count profile 2-1-1-2-1-2.
      // PURE ATTACK — Raikiri Twin Pierce. CANON: Lightning Clone (Raiton Kage Bunshin) + Raikiri. TWO
      // Lightning Clones dash a quick same-side pierce, Kakashi finishes with a hard Raikiri spike.
      pureAttack: {
        name: "Raikiri Twin Pierce", cost: 38, cooldown: 88, duration: 58,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 3,  body: "c0", action: "kakashiRaikiriDash", appear: 0,  vanish: 26, place: { dx: -40, dy: -4,  face: 1 }, hit: { damage: 16, hitstun: 28, knockbackX: 4, knockbackY: -7 } },
          { at: 14, body: "c1", action: "kakashiRaikiriDash", appear: 11, vanish: 36, place: { dx: -34, dy: -40, face: 1 }, hit: { damage: 14, hitstun: 26, knockbackX: 4, knockbackY: -6 } },
        ],
        finisher: { at: 30, action: "down_air", descendVy: 8, teleport: { dx: 14, dyAbove: 130 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Ninken Fang Pin. CANON: the Ninken hound pack (Kakashi's summons grab + hold). ONE clone
      // summons the pack dead-centre to pin the foe, then a Raikiri launch. Distinct: single-clone centred pin.
      grab: {
        name: "Ninken Fang Pin", cost: 40, cooldown: 94, duration: 52,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 5, body: "c0", action: "kakashiNinDogsCast", appear: 0, vanish: 30, place: { dx: 0, dy: -10, face: 1 }, hit: { damage: 14, hitstun: 44, knockbackX: 0, knockbackY: -2 } },
        ],
        finisher: { type: "strike", at: 20, action: "kakashiRaikiriDash", teleport: { dx: -34 }, hit: { damage: 24, hitstun: 32, knockbackX: 4, knockbackY: -14 } },
      },
      // RANGED — Kunai Snipe. CANON-ADJACENT: precise kunai. ONE clone braces beside Kakashi and both snipe a
      // single fast kunai line (not a three-clone spray). Distinct: single clone, one tight line, fast.
      ranged: {
        name: "Kunai Snipe", cost: 42, cooldown: 96, duration: 50,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 6, body: "c0", action: "kakashiThrow", appear: 2, vanish: 30, place: { ref: "caster", dx: -40, dy: -24 }, hit: { projectile: true, damage: 14, hitstun: 20, knockbackX: 6, knockbackY: -1, speed: 20 } },
        ],
        finisher: { type: "projectile", at: 22, action: "kakashiThrow", hit: { projectile: true, damage: 22, hitstun: 24, knockbackX: 8, knockbackY: -2, speed: 22, big: true, w: 34, h: 34 } },
      },
      // DEFENSIVE — Kamui Phase Guard. CANON: Kamui (phase intangible). TWO Lightning Clones cross-guard in
      // front while Kakashi Kamui-warps far behind, longer i-frames. Distinct: 2-clone cross guard + Kamui.
      defensive: {
        name: "Kamui Phase Guard", cost: 32, cooldown: 86, duration: 42,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 1, body: "c0", action: "kakashiRaikiriCharge", appear: 0, vanish: 32, place: { dx: -26, dy: 0,   face: 1 } },
          { at: 3, body: "c1", action: "kakashiRaikiriCharge", appear: 0, vanish: 32, place: { dx: -26, dy: -40, face: 1 } },
        ],
        finisher: { type: "escape", at: 6, action: "kakashiRaikiriDash", teleport: { behindTarget: true, dx: 82 }, iframes: 30,
          hit: { projectile: true, damage: 11, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 20 } },
      },
      // DECEPTION — Sharingan Copy Read. CANON-ADJACENT: the Sharingan predicts the commitment. ONE decoy
      // (Pakkun) baits; Kakashi reads it and warps behind to punish with a copied counter.
      deception: {
        name: "Sharingan Copy Read", cost: 34, cooldown: 90, duration: 44,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 3, body: "c0", action: "kakashiPakkunCast", appear: 0, vanish: 34, place: { dx: -8, dy: 0, face: 1 } },
        ],
        finisher: { type: "escape", at: 9, action: "kakashiCombo3", teleport: { behindTarget: true, dx: 58 }, iframes: 22,
          hit: { damage: 20, hitstun: 26, knockbackX: 6, knockbackY: -3 } },
      },
      // ULTIMATE-SWARM — Raikiri Hound Rush. CANON-ADJACENT: Lightning Clones + Ninken. TWO clones run a tight
      // low double-Raikiri rush (not a tall column), then a hard Raikiri spike. Distinct: 2 clones, flat rush.
      swarm: {
        name: "Raikiri Hound Rush", cost: 56, cooldown: 116, duration: 66,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 4,  body: "c0", action: "kakashiRaikiriDash", appear: 0,  vanish: 22, place: { dx: -64, dy: -6,  face: 1  }, hit: { damage: 13, hitstun: 30, knockbackX: 4, knockbackY: -8 } },
          { at: 14, body: "c1", action: "kakashiNinDogsCast", appear: 10, vanish: 30, place: { dx: 56,  dy: -10, face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: -4, knockbackY: -5 } },
          { at: 26, body: "c0", action: "kakashiRaikiriDash", appear: 24, vanish: 44, place: { dx: -48, dy: -44, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 4, knockbackY: -5 } },
        ],
        finisher: { type: "strike", at: 42, action: "kakashiRaikiriDash", teleport: { dx: -30 }, hit: { damage: 32, hitstun: 34, knockbackX: 6, knockbackY: -15 } },
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
      melee: { fxType: "cloneChoreoHit", color: "#9f1239", spriteScale: 0.5 },   // crow crimson-rose (distinct from Madara's Katon crimson)
      proj:  { sheet: "./naruto_kcm_fx_rasengan_sphere.png", color: "#7c3aed", w: 30, h: 30, spriteScale: 0.5 },   // Sharingan genjutsu violet
    },
    seqs: {
      // SIGNATURE (distinct): CROWS + GENJUTSU. Clones scatter like a murder of crows (irregular, high-and-low
      // staggered placements, not a clean column) and the defensive/deception are TRUE crow-illusion doubles
      // (2 clones). Clone-count profile 3-3-2-2-2-3 (the only triple-genjutsu grab + double-deception shape).
      // PURE ATTACK — Crow Scatter Strike. CANON: Karasu Bunshin (crow clones). THREE crow clones flit in from
      // scattered heights and strike, Itachi spikes. Distinct: irregular scattered placements + rhythm.
      pureAttack: {
        name: "Crow Scatter Strike", cost: 40, cooldown: 90, duration: 72,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "itachiFire1", appear: 1,  vanish: 28, place: { dx: -58, dy: -28,  face: 1  }, hit: { damage: 13, hitstun: 28, knockbackX: 3, knockbackY: -9 } },
          { at: 13, body: "c1", action: "itachiFire2", appear: 10, vanish: 40, place: { dx: 50,  dy: -96,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: -3, knockbackY: -6 } },
          { at: 30, body: "c2", action: "itachiFire3", appear: 27, vanish: 56, place: { dx: -44, dy: -52,  face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 3, knockbackY: -6 } },
        ],
        finisher: { at: 48, action: "down_air", descendVy: 7, teleport: { dx: 16, dyAbove: 150 }, hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // GRAB — Genjutsu Lock. CANON: paralysing Sharingan genjutsu. THREE crow clones ring the foe and lock it
      // with genjutsu (triple hold, very high hitstun, minimal knockback), then a launch. Distinct: 3-clone
      // genjutsu ring (unique triple-clone grab).
      grab: {
        name: "Genjutsu Lock", cost: 42, cooldown: 98, duration: 60,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "genjutsuCast", appear: 0, vanish: 34, place: { dx: -58, dy: -6,  face: 1  }, hit: { damage: 9, hitstun: 44, knockbackX: 1,  knockbackY: -1, color: "#7c3aed" } },
          { at: 8,  body: "c1", action: "genjutsuCast", appear: 2, vanish: 36, place: { dx: 58,  dy: -6,  face: -1 }, hit: { damage: 9, hitstun: 44, knockbackX: -1, knockbackY: -1, color: "#7c3aed" } },
          { at: 14, body: "c2", action: "genjutsuCast", appear: 8, vanish: 40, place: { dx: 0,   dy: -58, face: 1  }, hit: { damage: 8, hitstun: 46, knockbackX: 0,  knockbackY: -1, color: "#7c3aed" } },
        ],
        finisher: { type: "strike", at: 30, action: "up", teleport: { dx: -38 }, hit: { damage: 22, hitstun: 32, knockbackX: 3, knockbackY: -14 } },
      },
      // RANGED — Great Fireball Pair. CANON: Katon Great Fireball. TWO clones spit fireballs from a close
      // staggered pair, Itachi caps with a huge Great Fireball. Distinct: 2 close clones, slower heavy fire.
      ranged: {
        name: "Great Fireball Pair", cost: 44, cooldown: 100, duration: 54,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 6,  body: "c0", action: "fireballCast", appear: 2, vanish: 30, place: { ref: "caster", dx: -42, dy: -12 }, hit: { projectile: true, damage: 14, hitstun: 20, knockbackX: 6, knockbackY: -1, speed: 13, color: "#f97316" } },
          { at: 16, body: "c1", action: "fireballCast", appear: 12, vanish: 40, place: { ref: "caster", dx: -42, dy: -40 }, hit: { projectile: true, damage: 14, hitstun: 20, knockbackX: 6, knockbackY: -2, speed: 13, color: "#f97316" } },
        ],
        finisher: { type: "projectile", at: 30, action: "fireballCast", hit: { projectile: true, damage: 26, hitstun: 26, knockbackX: 10, knockbackY: -3, speed: 15, big: true, w: 54, h: 54, color: "#f97316" } },
      },
      // DEFENSIVE — Crow Burst Double. CANON: a crow clone that bursts into crows. TWO crow clones cross in
      // front and burst (absorb) while Itachi dissolves far behind with a counter fireball. Distinct: 2 clones.
      defensive: {
        name: "Crow Burst Double", cost: 32, cooldown: 86, duration: 42,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 1, body: "c0", action: "genjutsuCast", appear: 0, vanish: 30, place: { dx: -30, dy: -8,  face: 1 }, color: "#7c3aed" },
          { at: 3, body: "c1", action: "genjutsuCast", appear: 0, vanish: 32, place: { dx: -22, dy: -44, face: 1 }, color: "#7c3aed" },
        ],
        finisher: { type: "escape", at: 6, action: "fireballCast", teleport: { behindTarget: true, dx: 74 }, iframes: 28,
          hit: { projectile: true, damage: 12, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15, color: "#f97316" } },
      },
      // DECEPTION — Crow Clone Illusion. CANON: his real clone gimmick — crow decoys + genjutsu misdirection.
      // TWO decoys dissolve into crows while Itachi appears behind and counters. Distinct: 2 crow decoys.
      deception: {
        name: "Crow Clone Illusion", cost: 36, cooldown: 90, duration: 46,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 2, body: "c0", action: "genjutsuCast", appear: 0, vanish: 36, place: { dx: -20, dy: 0,   face: 1 }, color: "#7c3aed" },
          { at: 5, body: "c1", action: "genjutsuCast", appear: 0, vanish: 38, place: { dx: 16,  dy: -30, face: -1 }, color: "#7c3aed" },
        ],
        finisher: { type: "escape", at: 12, action: "genjutsuCast", teleport: { behindTarget: true, dx: 58 }, iframes: 24,
          hit: { damage: 21, hitstun: 26, knockbackX: 6, knockbackY: -3, color: "#7c3aed" } },
      },
      // ULTIMATE-SWARM — Clone Great Explosion. CANON: Itachi's shadow clones self-destruct. THREE crow clones
      // flit to staggered heights and DETONATE in sequence, then a hard spike. Distinct: 3 clones, scattered
      // detonation pattern (not a clean column).
      swarm: {
        name: "Clone Great Explosion", cost: 58, cooldown: 118, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "itachiFire1", appear: 1,  vanish: 24, place: { dx: -70, dy: -14, face: 1  }, hit: { damage: 12, hitstun: 32, knockbackX: 3, knockbackY: -10, color: "#f97316" } },
          { at: 14, body: "c1", action: "itachiFire2", appear: 11, vanish: 34, place: { dx: 58,  dy: -74, face: -1 }, hit: { damage: 8,  hitstun: 22, knockbackX: 3, knockbackY: -5, color: "#f97316" } },
          { at: 26, body: "c2", action: "itachiFire3", appear: 23, vanish: 46, place: { dx: -46, dy: -128, face: 1 }, hit: { damage: 9,  hitstun: 24, knockbackX: 3, knockbackY: -5, color: "#f97316" } },
          { at: 38, body: "c0", action: "itachiFire1", appear: 36, vanish: 58, place: { dx: 34,  dy: -168, face: -1 }, hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -5, color: "#f97316" } },
        ],
        finisher: { at: 54, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 196 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
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
      // SIGNATURE (distinct): SUSANOO-TIER — a TALL vertical rising column (Susanoo towers over the field),
      // grand slow rhythm, Wood Release into Susanoo strikes. Clone-count profile 4-1-3-1-1-5.
      // PURE ATTACK — Susanoo Wood Rise. CANON: Wood Release + Susanoo. FOUR clones rise in a near-vertical
      // Susanoo column (climbing straight up, not a wide flank), Madara Susanoo-spikes down.
      pureAttack: {
        name: "Susanoo Wood Rise", cost: 44, cooldown: 96, duration: 86,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
        beats: [
          { at: 5,  body: "c0", action: "madaraWoodSpikeCast", appear: 2,  vanish: 34, place: { dx: -30, dy: 2,    face: 1  }, hit: { damage: 13, hitstun: 30, knockbackX: 2, knockbackY: -12, color: "#65a30d" } },
          { at: 18, body: "c1", action: "madaraGunbaiSwing",   appear: 15, vanish: 46, place: { dx: 24,  dy: -62,  face: -1 }, hit: { damage: 11, hitstun: 26, knockbackX: 2, knockbackY: -8 } },
          { at: 32, body: "c2", action: "madaraSusanooPunch",  appear: 29, vanish: 58, place: { dx: -22, dy: -130, face: 1  }, hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -7, color: "#22d3ee" } },
          { at: 48, body: "c3", action: "madaraSusanooPunch",  appear: 45, vanish: 72, place: { dx: 18,  dy: -202, face: -1 }, hit: { damage: 12, hitstun: 28, knockbackX: 2, knockbackY: -7, color: "#22d3ee" } },
        ],
        finisher: { at: 64, action: "down_air", descendVy: 8, teleport: { dx: 14, dyAbove: 230 }, hit: { damage: 30, hitstun: 32, knockbackX: 6, knockbackY: 14 } },
      },
      // GRAB — Wood Dragon Bind: two clones cast Wood Dragons on either flank, seize + drag the opponent to
      // centre, then Madara Susanoo-punch launches. (Flank/strike template.)
      // GRAB — Wood Dragon Coil. CANON: Mokuryū (Wood Dragon). ONE huge wood dragon coils the foe dead-centre
      // and holds (high hitstun), then a Susanoo-punch launch. Distinct: single giant coil (not a flank pair).
      grab: {
        name: "Wood Dragon Coil", cost: 42, cooldown: 96, duration: 56,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 5, body: "c0", action: "madaraWoodDragonCast", appear: 0, vanish: 34, place: { dx: 0, dy: -8, face: 1 }, hit: { damage: 16, hitstun: 46, knockbackX: 0, knockbackY: -2, color: "#65a30d" } },
        ],
        finisher: { type: "strike", at: 24, action: "madaraSusanooPunch", teleport: { dx: -40 }, hit: { damage: 26, hitstun: 36, knockbackX: 4, knockbackY: -15, color: "#22d3ee" } },
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
      // ULTIMATE-SWARM — Perfect Susanoo. CANON: the Complete Susanoo colossus. FIVE clones stack a TALL NARROW
      // Susanoo tower (tight x, huge y-climb) culminating in a colossal slam. Distinct: 5 clones, tallest/
      // narrowest column of the roster (vs Hashirama's wide forest / Hiruzen's wide star).
      swarm: {
        name: "Perfect Susanoo", cost: 64, cooldown: 126, duration: 104,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }, { slot: "c4" }],
        beats: [
          { at: 4,  body: "c0", action: "madaraSusanooPunch", appear: 2,  vanish: 24, place: { dx: -18, dy: 2,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -11, color: "#22d3ee" } },
          { at: 14, body: "c1", action: "madaraSusanooPunch", appear: 12, vanish: 32, place: { dx: 16,  dy: -58,  face: -1 }, hit: { damage: 7,  hitstun: 20, knockbackX: 2, knockbackY: -4, color: "#22d3ee" } },
          { at: 26, body: "c2", action: "madaraGunbaiSwing",  appear: 24, vanish: 44, place: { dx: -14, dy: -124, face: 1  }, hit: { damage: 7,  hitstun: 20, knockbackX: 2, knockbackY: -4 } },
          { at: 40, body: "c3", action: "madaraSusanooPunch", appear: 38, vanish: 58, place: { dx: 12,  dy: -192, face: -1 }, hit: { damage: 8,  hitstun: 22, knockbackX: 2, knockbackY: -4, color: "#22d3ee" } },
          { at: 56, body: "c4", action: "madaraSusanooPunch", appear: 54, vanish: 76, place: { dx: -10, dy: -262, face: 1  }, hit: { damage: 9,  hitstun: 24, knockbackX: 2, knockbackY: -4, color: "#22d3ee" } },
        ],
        finisher: { at: 72, action: "down_air", descendVy: 10, teleport: { dx: 8, dyAbove: 288 }, hit: { damage: 36, hitstun: 34, knockbackX: 8, knockbackY: 18 } },
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
      // SIGNATURE (distinct): GRAVITY — few bodies, FAR PINCER spacing, Almighty Push/Pull slamming the foe
      // INWARD from both sides (no tall juggle column). Clone-count profile 2-2-1-1-1-3.
      // PURE ATTACK — Twin-Body Pincer. CANON: Deva Path + a pulled-out body. TWO bodies strike from FAR both
      // sides and gravity-slam the foe inward to centre, then Pain spikes. Distinct: wide 2-body pincer inward.
      pureAttack: {
        name: "Twin-Body Pincer", cost: 40, cooldown: 90, duration: 64,
        clones: [{ slot: "c0" }, { slot: "c1" }],
        beats: [
          { at: 4,  body: "c0", action: "painCombo2", appear: 1, vanish: 30, place: { dx: -118, dy: 0,   face: 1  }, hit: { damage: 14, hitstun: 30, knockbackX: 9,  knockbackY: -5 } },
          { at: 10, body: "c1", action: "painCombo3", appear: 6, vanish: 36, place: { dx: 118,  dy: -8,  face: -1 }, hit: { damage: 14, hitstun: 30, knockbackX: -9, knockbackY: -5 } },
        ],
        finisher: { at: 28, action: "down_air", descendVy: 7, teleport: { dx: 14, dyAbove: 140 }, hit: { damage: 28, hitstun: 30, knockbackX: 6, knockbackY: 12 } },
      },
      // RANGED — Asura Cannon. CANON: Asura Path mechanised cannon. ONE body braces and fires a single heavy
      // slow gravity shot, Pain caps with a huge Shinra Tensei shockwave. Distinct: single heavy shot (not a
      // three-clone spray) + a massive shockwave finisher.
      ranged: {
        name: "Asura Cannon", cost: 44, cooldown: 100, duration: 56,
        clones: [{ slot: "c0" }],
        beats: [
          { at: 6, body: "c0", action: "painAlmightyPushCast", appear: 2, vanish: 32, place: { ref: "caster", dx: -44, dy: -20 }, hit: { projectile: true, damage: 15, hitstun: 20, knockbackX: 7, knockbackY: -2, speed: 13, big: true, w: 38, h: 38 } },
        ],
        finisher: { type: "projectile", at: 24, action: "painSuperPushCast", hit: { projectile: true, damage: 26, hitstun: 26, knockbackX: 12, knockbackY: -3, speed: 15, big: true, w: 62, h: 62 } },
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
      // ULTIMATE-SWARM — Chibaku Tensei Crush. CANON: Chibaku Tensei + Shinra Tensei. THREE bodies orbit the
      // foe at a WIDE radius and gravity-pulse it toward a central point (inward pulls, low climb), then a
      // crushing Super-Push spike. Distinct: 3 bodies, wide orbiting inward-pull pattern (not a tall column).
      swarm: {
        name: "Chibaku Tensei Crush", cost: 60, cooldown: 122, duration: 78,
        clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
        beats: [
          { at: 4,  body: "c0", action: "painAlmightyPullCast", appear: 1,  vanish: 26, place: { dx: -112, dy: -6,  face: 1  }, hit: { damage: 11, hitstun: 30, knockbackX: 8,  knockbackY: -3 } },
          { at: 12, body: "c1", action: "painAlmightyPullCast", appear: 9,  vanish: 34, place: { dx: 112,  dy: -40, face: -1 }, hit: { damage: 8,  hitstun: 22, knockbackX: -8, knockbackY: -3 } },
          { at: 22, body: "c2", action: "painAlmightyPushCast", appear: 19, vanish: 44, place: { dx: -96,  dy: -86, face: 1  }, hit: { damage: 8,  hitstun: 22, knockbackX: 8,  knockbackY: -3 } },
          { at: 34, body: "c0", action: "painAlmightyPullCast", appear: 32, vanish: 54, place: { dx: 92,   dy: -120, face: -1 }, hit: { damage: 9,  hitstun: 24, knockbackX: -8, knockbackY: -3 } },
        ],
        finisher: { type: "strike", at: 50, action: "painSuperPushCast", teleport: { dx: -30 }, hit: { damage: 34, hitstun: 34, knockbackX: 10, knockbackY: -14 } },
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
