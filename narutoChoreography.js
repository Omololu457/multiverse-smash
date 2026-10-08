// narutoChoreography.js — Naruto-ONLY authored clone-choreography system.
// ────────────────────────────────────────────────────────────────────────────
// REPLACES Naruto's old clone systems entirely (persistent mirror clones + the
// one-shot clone-assist specials). Naruto only — no other clone owner is touched.
//
// STAGE 0 (visual fidelity): a clone here is a "GHOST BODY" — a minimal fighter-
// like object that carries Naruto's OWN rosterKey + animationData + a per-instance
// SpriteHandler, and is drawn by game.js through the EXACT SAME renderHybridFighter
// path as the real fighter. Same sheets, same scale, same skin/tint inheritance →
// pixel-identical to the real Naruto. No divergent tint/filter unless the real
// fighter has one (then the ghost inherits the same one — intended parity).
//
// STAGE 1 (format): a "choreographed sequence" is DETERMINISTIC authored data — an
// ordered list of beats. Each beat names WHICH BODY performs WHICH sprite ACTION at
// WHICH relative frame, and WHERE that body is (positioned relative to the target).
// A beat may carry a `hit` (the real game-effect). There is NO runtime AI: the whole
// sequence is authored and plays out frame-by-frame off a plain counter (LAN-safe).
//
//   sequence = {
//     name, cost, cooldown, duration,
//     clones: [ { slot } ],                     // ghost clone bodies to spawn
//     beats:  [ {
//       at,            // frame the beat FIRES its hit (relative to run start)
//       body,          // "c0".."cN" clone slot performing it
//       action,        // sprite action to force on that body ("up","light","heavy",…)
//       appear, vanish,// frame window the body is visible/active
//       place: { dx, dy, face },  // position RELATIVE to target center (dx,dy px; face ±1)
//       hit?: { damage, hitstun, knockbackX, knockbackY }  // real effect (via host fireHit)
//     } ],
//     finisher: { at, action, teleport:{dx,dyAbove}, descendVy, hit }  // performed by REAL Naruto
//   }
//
// The choreography format sequences WHEN each real attack fires and WHERE each body
// is — it does NOT define new damage/physics. Each beat's `hit` is applied by the host
// (game.js) through the existing spawnGuaranteedCloneHit primitive, i.e. the same
// hit/knockback/launcher pipeline every other Naruto barrage beat already used.

import { SpriteHandler } from "./sprite.js"
import { characters } from "./characters.js"

// ── STAGE 2: UZUMAKI BARRAGE ────────────────────────────────────────────────
// Three shadow clones launch + juggle the opponent in a FIXED order, then the real
// Naruto teleports in above and axe-kicks (down_air) to SPIKE them down — he lands
// the finisher. Timings/positions are authored constants (tuned live in Stage 4).
export const UZUMAKI_BARRAGE = {
  name: "Uzumaki Barrage",
  cost: 40,
  cooldown: 90,
  duration: 78,
  clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
  beats: [
    // c0 — appears at the target's front, rising kick → LAUNCH straight up.
    { at: 4,  body: "c0", action: "up",    appear: 2,  vanish: 30,
      place: { dx: -72, dy: 4,    face: 1  },
      hit: { damage: 14, hitstun: 30, knockbackX: 2, knockbackY: -13 } },
    // c1 — appears on the far side, airborne jab → juggle (keep them up).
    { at: 20, body: "c1", action: "light", appear: 18, vanish: 46,
      place: { dx: 66,  dy: -70,  face: -1 },
      hit: { damage: 10, hitstun: 26, knockbackX: 3, knockbackY: -7 } },
    // c2 — appears high on the near side, heavy → juggle higher.
    { at: 34, body: "c2", action: "heavy", appear: 32, vanish: 60,
      place: { dx: -60, dy: -120, face: 1  },
      hit: { damage: 12, hitstun: 26, knockbackX: 2, knockbackY: -6 } },
  ],
  // FINISHER — the REAL Naruto teleports in above the target and spikes down.
  finisher: {
    at: 52, action: "down_air", descendVy: 7,
    teleport: { dx: 18, dyAbove: 150 },
    hit: { damage: 26, hitstun: 30, knockbackX: 6, knockbackY: 12 },
  },
}

// ── 4 NEW SEQUENCES (2026-09-26, ADDITIVE) ──────────────────────────────────
// Authored in the SAME format as Uzumaki Barrage. Extra beat/finisher options used here
// (all backward-compatible — Uzumaki Barrage uses none of them, so it is unchanged):
//   • place.ref: "target" (default) | "caster" | "casterStart" — what the dx/dy are relative to.
//   • hit.projectile: true + speed — a TRAVELING projectile (spawnProjectile) instead of a
//     guaranteed overlap hit; thrown from the acting body toward the target.
//   • finisher.type: "spike" (default, = Barrage) | "projectile" | "escape" | "strike".

// TWO THOUSAND COMBO — a rapid juggle FLURRY: launch, then a fast alternating column of
// clone jabs riding the opponent UP, then a hard spike. (Naruto Uzumaki "2000-hit" gag.)
export const TWO_THOUSAND_COMBO = {
  name: "Two Thousand Combo", cost: 55, cooldown: 120, duration: 92,
  clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }, { slot: "c3" }],
  beats: [
    { at: 4,  body: "c0", action: "up",    appear: 2,  vanish: 20, place: { dx: -70, dy: 4,    face: 1  }, hit: { damage: 12, hitstun: 34, knockbackX: 2, knockbackY: -12 } },
    { at: 12, body: "c1", action: "light", appear: 10, vanish: 24, place: { dx: 62,  dy: -46,  face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
    { at: 18, body: "c2", action: "light", appear: 16, vanish: 30, place: { dx: -56, dy: -80,  face: 1  }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
    { at: 24, body: "c3", action: "light", appear: 22, vanish: 36, place: { dx: 58,  dy: -112, face: -1 }, hit: { damage: 6,  hitstun: 20, knockbackX: 2, knockbackY: -3 } },
    { at: 30, body: "c0", action: "heavy", appear: 28, vanish: 42, place: { dx: -52, dy: -142, face: 1  }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -3 } },
    { at: 36, body: "c1", action: "light", appear: 34, vanish: 48, place: { dx: 54,  dy: -168, face: -1 }, hit: { damage: 7,  hitstun: 22, knockbackX: 2, knockbackY: -2 } },
    { at: 44, body: "c2", action: "heavy", appear: 42, vanish: 58, place: { dx: -48, dy: -190, face: 1  }, hit: { damage: 8,  hitstun: 24, knockbackX: 2, knockbackY: -2 } },
  ],
  finisher: { at: 58, action: "down_air", descendVy: 9, teleport: { dx: 12, dyAbove: 210 }, hit: { damage: 30, hitstun: 32, knockbackX: 8, knockbackY: 16 } },
}

// SHADOW CLONE SHURIKEN — RANGED. Clones flank the CASTER and hurl shuriken (traveling
// projectiles) at the opponent; Naruto throws a big final shuriken. A zoning tool.
export const SHADOW_CLONE_SHURIKEN = {
  name: "Shadow Clone Shuriken", cost: 45, cooldown: 100, duration: 58,
  clones: [{ slot: "c0" }, { slot: "c1" }, { slot: "c2" }],
  beats: [
    { at: 6,  body: "c0", action: "light", appear: 2,  vanish: 26, place: { ref: "caster", dx: -44, dy: -8  }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
    { at: 12, body: "c1", action: "light", appear: 6,  vanish: 30, place: { ref: "caster", dx: 44,  dy: -30 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -1, speed: 15 } },
    { at: 18, body: "c2", action: "light", appear: 12, vanish: 36, place: { ref: "caster", dx: -38, dy: -58 }, hit: { projectile: true, damage: 12, hitstun: 18, knockbackX: 5, knockbackY: -2, speed: 16 } },
    { at: 26, body: "c0", action: "heavy", appear: 22, vanish: 44, place: { ref: "caster", dx: 38,  dy: -18 }, hit: { projectile: true, damage: 14, hitstun: 20, knockbackX: 6, knockbackY: -2, speed: 16 } },
  ],
  finisher: { at: 36, type: "projectile", action: "heavy", hit: { projectile: true, damage: 22, hitstun: 24, knockbackX: 9, knockbackY: -3, speed: 18, big: true } },
}

// SUBSTITUTION ESCAPE — DEFENSIVE (Kawarimi). A decoy clone is left at Naruto's spot while
// the real Naruto vanishes and reappears behind the target with brief i-frames + a counter shuriken.
export const SUBSTITUTION_ESCAPE = {
  name: "Substitution Escape", cost: 30, cooldown: 80, duration: 40,
  clones: [{ slot: "c0" }],
  beats: [
    { at: 2, body: "c0", action: "hurt", appear: 0, vanish: 30, place: { ref: "casterStart", dx: 0, dy: 0 } },
  ],
  finisher: { at: 4, type: "escape", action: "dash", teleport: { behindTarget: true, dx: 74 }, iframes: 26,
    hit: { projectile: true, damage: 10, hitstun: 16, knockbackX: 6, knockbackY: -1, speed: 15 } },
}

// CLONE FLANK STRIKE — MIX-UP. Two clones strike from BOTH sides at once (cross-up), then
// Naruto dashes in at ground level and launches. A left/right ambiguity opener.
export const CLONE_FLANK_STRIKE = {
  name: "Clone Flank Strike", cost: 40, cooldown: 90, duration: 56,
  clones: [{ slot: "c0" }, { slot: "c1" }],
  beats: [
    { at: 6, body: "c0", action: "heavy", appear: 2, vanish: 26, place: { dx: -64, dy: 0, face: 1  }, hit: { damage: 14, hitstun: 26, knockbackX: 6, knockbackY: -4 } },
    { at: 8, body: "c1", action: "heavy", appear: 4, vanish: 28, place: { dx: 64,  dy: 0, face: -1 }, hit: { damage: 14, hitstun: 26, knockbackX: 6, knockbackY: -4 } },
  ],
  finisher: { at: 20, type: "strike", action: "up", teleport: { dx: -44 }, hit: { damage: 20, hitstun: 30, knockbackX: 4, knockbackY: -12 } },
}

// Registry + the summon→select map (which held direction picks which sequence).
export const SEQUENCES = {
  barrage:      UZUMAKI_BARRAGE,
  twoThousand:  TWO_THOUSAND_COMBO,
  shuriken:     SHADOW_CLONE_SHURIKEN,
  substitution: SUBSTITUTION_ESCAPE,
  flank:        CLONE_FLANK_STRIKE,
}
// After the summon, the follow-up Special direction selects. NOTE (2026-09-26): Two Thousand Combo was
// PROMOTED to Naruto's neutral Ultimate (single button), so it is REMOVED from this summon-select pool.
// A Down-select now has no dedicated move → game.js falls back to Barrage.
export const SELECT_MAP = { N: "barrage", B: "shuriken", U: "substitution", F: "flank" }

// ── RUNTIME ─────────────────────────────────────────────────────────────────
let _run = null   // the single active run (Naruto-only, one at a time) or null

export function isNarutoChoreoActive() { return !!_run }

// Ghost body: minimal fighter-like object rendered through renderHybridFighter with
// Naruto's real assets. Inherits the caster's skin/tint so a SKINNED Naruto's clones
// match too (same render path as the real fighter — the Stage-0 guarantee).
function makeGhostBody(caster) {
  const naruto = characters.naruto
  return {
    rosterKey: "naruto",
    hasSprites: true,
    animationData: naruto.animationData,
    spriteHandler: new SpriteHandler(),
    x: caster.x, y: caster.y, facing: caster.facing,
    w: caster.w ?? 60, h: caster.h ?? 110,
    spriteScale: caster.spriteScale ?? naruto.spriteScale ?? 1,
    // skin/tint parity with the real fighter (same fields renderHybridFighter reads)
    skinId: caster.skinId, _skinAnim: caster._skinAnim,
    tintColor: caster.tintColor, tintStrength: caster.tintStrength,
    _forceAction: "idle",
    _choreoVisible: false,   // game.js only draws bodies whose window is open
    _choreoGhost: true,
  }
}

// Start a run. `caster` = the real Naruto fighter, `target` = the opponent.
export function startNarutoChoreo(caster, target, sequence = UZUMAKI_BARRAGE) {
  if (_run || !caster || !target) return false
  const bodies = {}
  for (const c of sequence.clones) bodies[c.slot] = makeGhostBody(caster)
  // startX/startY = caster's position at trigger (used only by "casterStart"-anchored beats, e.g. the
  // Substitution decoy). Uzumaki Barrage does not reference these, so its behavior is unchanged.
  _run = { caster, target, seq: sequence, frame: 0, bodies, fired: new Set(), finisherFired: false, startX: caster.x, startY: caster.y }
  // Lock the real Naruto's INPUT while the sequence plays (physics still runs so the
  // finisher teleport-in can descend). game.js honours _choreoLock in updatePlayerCombat.
  caster._choreoLock = true
  caster.vx = 0
  caster._forceAction = "idle"
  return true
}

// The bodies game.js should render this frame (run bodies, else the staged formation bodies).
export function getNarutoChoreoBodies() {
  if (_run) return Object.values(_run.bodies).filter(b => b._choreoVisible)
  if (_formation) return _formation.bodies.filter(b => b._choreoVisible)
  return []
}

// ── SUMMON-THEN-CHOOSE (formation) ──────────────────────────────────────────
// A SEPARATE input calls clones into a holding FORMATION around Naruto without executing a
// move; a follow-up Special direction then SELECTS which sequence fires (SELECT_MAP). This is
// an ADDITIONAL access path — Uzumaki Barrage's own direct trigger (startNarutoChoreo) is unchanged.
let _formation = null
const FORMATION_OFFSETS = [{ dx: -72, dy: 0 }, { dx: 72, dy: 0 }, { dx: -124, dy: 0 }, { dx: 124, dy: 0 }]
const SELECT_WINDOW = 90   // frames the player has to pick before the formation disperses (STAGE 4: 60->90 ≈ 1.0s->1.5s, matching the generic roster's eased cloneChoreography.SELECT_WINDOW)

export function isNarutoFormationActive() { return !!_formation }

export function startNarutoFormation(caster, target) {
  if (_run || _formation || !caster || !target) return false
  const bodies = FORMATION_OFFSETS.map(() => makeGhostBody(caster))
  _formation = { caster, target, bodies, frame: 0, window: SELECT_WINDOW }
  // STAGE 4: SOFT-HOLD (NOT the hard _choreoLock) — matches the generic roster's startCloneFormation. The hard
  // lock makes updatePlayerCombat `return` early (game.js ~7572), which blocked the follow-up SELECT press from
  // ever reaching executeNarutoSpecial via real input. A soft hold (vx=0 + idle pose) pins Naruto in place while
  // STILL sampling the Special, so the direction+Special select works through real keys.
  caster.vx = 0; caster._forceAction = "idle"
  caster._narutoSelectWindow = SELECT_WINDOW
  // Mirror the generic formation fields so the SAME on-screen CLONE-SELECT hint shows for Naruto. Safe: the
  // generic cloneChoreoInterceptSpecial early-returns for Naruto (isChoreoSupported("naruto") === false), so
  // these fields never cross-trigger the generic select path.
  caster._inChoreoFormation = true; caster._choreoSelectWindow = SELECT_WINDOW
  return true
}

export function updateNarutoFormation() {
  if (!_formation) return
  const fm = _formation, c = fm.caster
  FORMATION_OFFSETS.forEach((off, i) => {
    const b = fm.bodies[i]
    b._choreoVisible = true
    b.x = c.x + off.dx
    b.y = c.y + off.dy
    b.facing = off.dx < 0 ? 1 : -1   // clones face inward toward Naruto
    b._forceAction = "idle"
  })
  c.vx = 0; c._forceAction = "idle"   // keep the soft-hold each frame (planted + idle) while input still samples the select
  if (fm.frozen) return   // test-only: hold the staged formation for a screenshot
  fm.frame++
  fm.window--
  c._narutoSelectWindow = fm.window
  c._choreoSelectWindow = fm.window   // mirror for the shared hint (see startNarutoFormation)
  if (fm.window <= 0) clearNarutoFormation()   // timed out → disperse + unlock
}

// Test-only: freeze the staged formation so the render loop shows a stable tableau.
export function holdNarutoFormation() { if (_formation) { _formation.frozen = true; return true } return false }

// SELECT press: consume the formation and start the chosen sequence (re-locks the caster).
export function chooseNarutoSequence(key) {
  if (!_formation) return false
  const c = _formation.caster, t = _formation.target
  c._narutoSelectWindow = 0
  c._inChoreoFormation = false; c._choreoSelectWindow = 0   // drop the shared hint fields; startNarutoChoreo takes over (hard lock)
  _formation = null   // release WITHOUT unlocking — startNarutoChoreo re-locks immediately
  return startNarutoChoreo(c, t, SEQUENCES[key] || UZUMAKI_BARRAGE)
}

export function clearNarutoFormation() {
  if (_formation && _formation.caster) {
    _formation.caster._choreoLock = false
    _formation.caster._forceAction = null
    _formation.caster._narutoSelectWindow = 0
    _formation.caster._inChoreoFormation = false; _formation.caster._choreoSelectWindow = 0
  }
  _formation = null
}

const _dirTo = (from, to) => Math.sign((to.x + (to.w || 0) / 2) - (from.x + (from.w || 0) / 2)) || 1

// Advance the run one frame. `fireHit(caster, target, hitSpec, dirSign)` is provided by
// game.js and wraps spawnGuaranteedCloneHit (the real hit primitive). No RNG anywhere.
export function updateNarutoChoreo(fireHit) {
  if (!_run) return
  const r = _run, seq = r.seq, t = r.target, caster = r.caster, f = r.frame

  // Clone beats: position + pose each visible body; fire its hit exactly once at beat.at.
  // A body is visible if ANY of its beats' windows is open (a slot may be reused across beats, e.g.
  // Two Thousand Combo) — so reset first, then only ever set TRUE. For single-beat sequences like
  // Uzumaki Barrage this is identical to the old per-beat assignment (behavior unchanged).
  for (const body of Object.values(r.bodies)) body._choreoVisible = false
  for (const b of seq.beats) {
    const body = r.bodies[b.body]
    if (!body) continue
    const open = f >= b.appear && f < b.vanish
    // Positioning anchor: default = the target (Barrage), or the caster / the caster's start spot.
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
    if (!r.frozen && f === b.at && !r.fired.has(key)) {   // frozen (test hold) → pose only, no hits
      r.fired.add(key)
      if (b.hit && fireHit) fireHit(caster, t, b.hit, _dirTo(body, t), body)   // body → projectile spawn origin
    }
  }

  // Finisher: performed by the REAL Naruto. Default "spike" (= Uzumaki Barrage, UNCHANGED); the new
  // sequences use "projectile" (throw in place), "escape" (defensive teleport + i-frames), or "strike"
  // (grounded teleport-in launcher).
  const fin = seq.finisher
  if (fin && f >= fin.at) {
    const cx = t.x + (t.w || 0) / 2
    if (fin.type === "projectile") {
      caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
      if (!r.frozen && !r.finisherFired) { r.finisherFired = true; if (fin.hit && fireHit) fireHit(caster, t, fin.hit, _dirTo(caster, t), caster) }
    } else if (fin.type === "escape") {
      // reappear on the FAR side of the target (behind it), or a set distance back
      const side = _dirTo(caster, t)   // sign toward target
      caster.x = fin.teleport.behindTarget ? cx + side * (fin.teleport.dx || 74) - (caster.w || 0) / 2
                                           : caster.x - side * (fin.teleport.dx || 74)
      caster.y = t.y; caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
      if (!r.frozen && !r.finisherFired) {
        r.finisherFired = true
        if (fin.iframes) { caster.invulnTimer = fin.iframes; caster.iframes = fin.iframes }
        if (fin.hit && fireHit) fireHit(caster, t, fin.hit, _dirTo(caster, t), caster)
      }
    } else if (fin.type === "strike") {
      // grounded teleport beside the target + launcher
      caster.x = cx + (fin.teleport.dx || -44) - (caster.w || 0) / 2
      caster.y = t.y; caster.facing = _dirTo(caster, t); caster._forceAction = fin.action
      if (!r.frozen && !r.finisherFired) { r.finisherFired = true; if (fin.hit && fireHit) fireHit(caster, t, fin.hit, _dirTo(caster, t), caster) }
    } else {
      // DEFAULT SPIKE — verbatim Uzumaki Barrage behavior (do not change).
      if (r.frozen) {
        caster.x = cx + (fin.teleport.dx || 0) - (caster.w || 0) / 2
        caster.y = t.y - (fin.teleport.dyAbove || 150)
        caster.facing = _dirTo(caster, t)
        caster._forceAction = fin.action
      } else if (!r.finisherFired) {
        r.finisherFired = true
        caster.x = cx + (fin.teleport.dx || 0) - (caster.w || 0) / 2
        caster.y = t.y - (fin.teleport.dyAbove || 150)
        caster.onGround = false
        caster.grounded = false
        caster.vy = fin.descendVy || 7
        caster.facing = _dirTo(caster, t)
        caster._forceAction = fin.action
        if (fin.hit && fireHit) fireHit(caster, t, fin.hit, _dirTo(caster, t))
      }
    }
  }

  if (r.frozen) return   // test-only: hold the tableau at r.frame (no advance / end)
  r.frame++
  if (f >= seq.duration) endRun()
}

function endRun() {
  if (!_run) return
  const caster = _run.caster
  caster._choreoLock = false
  caster._forceAction = null
  _run = null
}

// Test-only: freeze an active run at a chosen frame so the render loop shows a stable posed tableau
// (for screenshot/visual verification). No hits fire while held. clearNarutoChoreo() releases it.
export function holdNarutoChoreoAt(frame) {
  if (!_run) return false
  _run.frozen = true
  _run.frame = frame
  return true
}

// Hard reset (round reset / match reset). Releases any locked caster (run OR staged formation).
export function clearNarutoChoreo() {
  if (_run && _run.caster) { _run.caster._choreoLock = false; _run.caster._forceAction = null; _run.caster._narutoSelectWindow = 0 }
  _run = null
  clearNarutoFormation()
}

// Harness introspection (deterministic-state proof + live verification).
export function getNarutoChoreoState() {
  if (_formation) return {
    active: false, formation: true, window: _formation.window, sequence: null,
    bodies: _formation.bodies.map((b, i) => ({ slot: "f" + i, visible: !!b._choreoVisible, action: b._forceAction, x: Math.round(b.x), y: Math.round(b.y), rosterKey: b.rosterKey, sheetSource: "renderHybridFighter" })),
  }
  if (!_run) return { active: false }
  return {
    active: true,
    sequence: _run.seq.name,
    frame: _run.frame,
    finisherFired: _run.finisherFired,
    firedBeats: [..._run.fired],
    bodies: Object.entries(_run.bodies).map(([slot, b]) => ({
      slot, visible: !!b._choreoVisible, action: b._forceAction,
      x: Math.round(b.x), y: Math.round(b.y), facing: b.facing,
      rosterKey: b.rosterKey, sheetSource: "renderHybridFighter",
    })),
    caster: { x: Math.round(_run.caster.x), y: Math.round(_run.caster.y),
      action: _run.caster._forceAction, locked: !!_run.caster._choreoLock },
  }
}
