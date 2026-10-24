// homelanderEyeAnchors.js
// Per-frame EYE ANCHORS for Homelander — so Heat Vision (and the FLIGHT 37 slam beam) fire from his
// actual eyes on every pose, not a fixed body-box fraction. Same system as supermanEyeAnchors.js:
// [ex, ey] FRACTIONS of the sprite cell (0..1, source art faces RIGHT), detected per frame by
// homelander_work/eye_detect.py (head/skin analysis). getHomelanderEyeWorld() maps the current rendered
// frame's anchor to world space via the real drawn rect (_lastDrawX/Y/W/H), mirroring for a left facing.
export const HOMELANDER_EYES = {
  idle:          [[0.527, 0.299], [0.527, 0.325], [0.527, 0.338]],
  jump:          [[0.635, 0.338], [0.623, 0.338], [0.623, 0.312]],
  fall:          [[0.269, 0.523]],
  hurt:          [[0.563, 0.377], [0.551, 0.377]],
  knockdown:     [[0.313, 0.853]],
  light:         [[0.599, 0.429], [0.574, 0.468], [0.642, 0.410]],
  heavy:         [[0.527, 0.468], [0.599, 0.429], [0.526, 0.410], [0.642, 0.410]],
  grab:          [[0.635, 0.390], [0.661, 0.371], [0.696, 0.347], [0.606, 0.320]],
  heatCharge:    [[0.682, 0.351], [0.658, 0.351], [0.623, 0.351], [0.623, 0.351]],
  ultSilhouette: [[0.555, 0.390]],
  flyHover:      [[0.527, 0.299], [0.527, 0.325], [0.527, 0.338], [0.623, 0.312]],
  flyCruise:     [[0.694, 0.832], [0.836, 0.849], [0.686, 0.807], [0.686, 0.807]],
  flyRise:       [[0.611, 0.338], [0.623, 0.338], [0.623, 0.312]],
  flyDive:       [[0.737, 0.457]],
  flyTurn:       [[0.587, 0.442], [0.539, 0.507]],
  flyDash:       [[0.599, 0.341], [0.594, 0.392]],
  takeoff:       [[0.635, 0.338]],
  land:          [[0.635, 0.338]],
}

const ACTION_TO_STRIP = {
  idle: "idle", walk: "idle", run: "idle", dash: "idle", jump: "jump", fall: "fall",
  hurt: "hurt", knockdown: "knockdown", light: "light", heavy: "heavy", air: "flyDash",
  grab: "grab", heatCharge: "heatCharge", ultSilhouette: "ultSilhouette",
  flyHover: "flyHover", flyCruise: "flyCruise", flyRise: "flyRise", flyDive: "flyDive",
  flyTurn: "flyTurn", flyDash: "flyDash", takeoff: "takeoff", land: "land",
}

// World-space eye position for Homelander's CURRENT rendered frame (eye-anchored laser origin).
export function getHomelanderEyeWorld(fighter) {
  const face = fighter.facing || 1
  let ex = 0.62, ey = 0.30
  const sh = fighter.spriteHandler
  if (sh) {
    const strip = ACTION_TO_STRIP[sh.currentAction]
    const arr = strip && HOMELANDER_EYES[strip]
    if (arr && arr.length) {
      const fi = Math.max(0, Math.min(arr.length - 1, sh.frameIndex || 0))
      ex = arr[fi][0]; ey = arr[fi][1]
    }
  }
  const L = fighter._lastDrawX, W = fighter._lastDrawW, T = fighter._lastDrawY, H = fighter._lastDrawH
  if (L == null || !W || T == null || !H) {   // not drawn yet → body-box approximation (old behaviour)
    return { x: fighter.x + (fighter.w || 50) * (face >= 0 ? 0.70 : 0.30), y: fighter.y + (fighter.h || 100) * 0.18 }
  }
  const x = face >= 0 ? L + ex * W : L + (1 - ex) * W
  const y = T + ey * H
  return { x, y }
}
