// stageHazards.js
// ─────────────────────────────────────────────────────────────────────────────
// STAGE INTERACTABLES — PILOT (Test Map).
//
// A stage may declare `hazards: [{ id, x, w, height, damage, hitstun }]` (world-space, ground-anchored).
// When a fighter is KNOCKED INTO a hazard's box — carrying real horizontal knockback, launched, or in
// hitstun (NOT a gentle walk-in) — it takes contact damage + a wall-splat-style reaction (extended
// hitstun, a bounce back OUT of the hazard, a camera-shake flag, a per-contact cooldown).
//
// This reuses the roster's existing "knocked into the environment" language: the reaction mirrors the
// MK-feel Stage 2e WALL SPLAT (combat.js) — `wallBounce` + `_wallSplat` + extended `hitstun` — so a
// hazard reads exactly like being slammed into a wall, just at a mid-stage object instead of the boundary.
//
// PURE + TESTABLE: `resolveStageHazard` mutates only the fighter's reaction fields and RETURNS the damage
// to apply (game.js funnels it through applyScaledDamage). No rendering / browser / damage-pipeline deps.
// ─────────────────────────────────────────────────────────────────────────────

export const HAZARD = {
  minKnockback: 8,   // |vx| threshold that counts as "knocked into" (matches WALL_SPLAT_MIN_KB feel)
  height: 150,       // default pylon height above the ground (world px)
  damage: 55,        // default contact damage (pre-scale; funnelled through applyScaledDamage)
  hitstun: 26,       // extended stun on contact (wall-splat parity)
  splatFrames: 20,   // pinned splat window (reuses the fighter's `_wallSplat` field)
  bounce: 0.45,      // fraction of vx reflected back OUT of the hazard (don't stick/clip through)
  contactCd: 30,     // per-fighter cooldown → one contact = one hit (no per-frame damage drain)
}

function boxesOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// The world-space box of a ground-anchored hazard, given the live groundY.
export function hazardBox(hz, groundY) {
  const hgt = hz.height || HAZARD.height
  return { x: hz.x, y: groundY - hgt, w: hz.w || 44, h: hgt + 24 }   // +24: a little below ground so a low slam still connects
}

// Resolve a fighter against a stage's hazards. Returns the damage to apply (0 = nothing triggered) and
// mutates the fighter's reaction. Call once per fighter per frame AFTER movement has finalized position.
export function resolveStageHazard(fighter, hazards, groundY) {
  if (!fighter || !hazards || !hazards.length) return 0
  if ((fighter._hazardCd || 0) > 0) { fighter._hazardCd--; return 0 }   // still cooling down from the last contact

  // "KNOCKED INTO" gate — only a fighter carrying real knockback / launched / stunned triggers a hazard,
  // never a gentle walk-in, so it reads as being SLAMMED into it and can't be farmed by strolling over.
  const knockedInto = (fighter.hitstun || 0) > 0 || !!fighter.isLaunched || Math.abs(fighter.vx || 0) >= HAZARD.minKnockback
  if (!knockedInto) return 0

  const fx = fighter.x, fy = fighter.y, fw = fighter.w || 60, fh = fighter.h || 90
  for (const hz of hazards) {
    const b = hazardBox(hz, groundY)
    if (!boxesOverlap(fx, fy, fw, fh, b.x, b.y, b.w, b.h)) continue

    // ── REACTION (mirrors WALL SPLAT) ──
    fighter.hitstun     = Math.max(fighter.hitstun || 0, hz.hitstun || HAZARD.hitstun)
    fighter.wallBounce  = true
    fighter._wallSplat  = HAZARD.splatFrames
    const vx = fighter.vx || 0
    // bounce back OUT of the hazard; if there's ~no horizontal speed (a grounded slam), shove away from center.
    fighter.vx = Math.abs(vx) >= 1 ? -vx * HAZARD.bounce
               : (fx + fw / 2 < b.x + b.w / 2 ? -1 : 1) * 6
    fighter._hazardCd    = HAZARD.contactCd
    fighter._hazardShake = true          // consumed by game.js's shake pass (alongside _wallBounceShake)
    fighter._hazardHitId = hz.id || "hazard"
    return hz.damage || HAZARD.damage
  }
  return 0
}
