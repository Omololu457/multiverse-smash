// spdRedMuzzles.js — S.P.D. Red: WHERE every shot leaves the art (the barrel tip / the Deltamax mouth).
// Same idea as homelanderEyeAnchors.js / supermanEyeAnchors.js, but computed from the SIM (no _lastDraw*), so the
// spawn point is deterministic and identical on both LAN peers and in headless runs.
//
// Points are CELL pixels of the 160×84 frames (art faces RIGHT, feet origin at (80, 80)), detected by
// tools/spd_red_build/detect_muzzles.py — see docs/spd_red/muzzle_anchors.png (box on each muzzle + its trace).
// World mapping mirrors sprite.js exactly: the cell is drawn at spriteScale × GLOBAL_SPRITE_SCALE (1.18), its
// originX centred on the physics box and its originY on the feet; a left facing mirrors in place.
export const SPD_RED_MUZZLES = {
  blaster:    [104, 35],   // sBlaster F2 (R14F2, aimed): the Delta Blaster bolt
  rapid:      [104, 35],   // sRapid F1 (same aimed art): the Rapid Fire tracers
  blasterAir: [122, 27],   // sBlasterAir (R15F1, hopping shot)
  judge:      [104, 35],   // sJudge F2 (R14F2): the morpher scan beam
  deltamax:   [123, 44],   // sDeltamax F1 (R16F3, braced Striker) → the beam axis for the Deltamax and the Super
}
const ORIGIN_X = 80, ORIGIN_Y = 80, ENGINE_SCALE = 1.18

export function spdRedMuzzleWorld(f, key) {
  const m = SPD_RED_MUZZLES[key] || SPD_RED_MUZZLES.blaster
  const sc = (f.spriteScale || 2.4 / 1.18) * ENGINE_SCALE, dir = f.facing || 1
  return { x: (f.x || 0) + (f.w ?? 48) / 2 + dir * (m[0] - ORIGIN_X) * sc, y: (f.y || 0) + (f.h ?? 94) + (m[1] - ORIGIN_Y) * sc }
}
