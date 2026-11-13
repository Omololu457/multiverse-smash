// greenArrowBowAnchors.js
// Per-frame BOW ANCHORS for Green Arrow — so an arrow spawns from his actual bow on every shooting
// pose, not a fixed body-box fraction (which, now that he's scaled up, sat at his waist). Same idea
// as supermanEyeAnchors.js / homelanderEyeAnchors.js: [bx, by] are FRACTIONS of the sprite cell
// (0..1, source art faces RIGHT). getGreenArrowBowWorld() maps the current rendered frame's anchor to
// world space using the real drawn rect (_lastDrawX/Y/W/H set by sprite.js), mirroring for facing — so
// it tracks the bow at any sprite scale.
export const GREEN_ARROW_BOW = {
  // bx ≈ how far forward the bow hand is; by ≈ chest/bow height from the top of the drawn sprite.
  idle:     [[0.66, 0.44]],
  draw:     [[0.74, 0.41], [0.77, 0.40]],
  aim:      [[0.79, 0.39]],
  light:    [[0.72, 0.41], [0.75, 0.40]],
  firecast: [[0.74, 0.40], [0.77, 0.40]],
  icecast:  [[0.74, 0.41], [0.77, 0.40]],
  antiair:  [[0.66, 0.27]],    // aimed upward → bow raised
  airdraw:  [[0.74, 0.45]],
  dive:     [[0.70, 0.48]],
  bowslash: [[0.78, 0.44]],
}

// current sprite action → which strip's anchors to read.
const ACTION_TO_STRIP = {
  idle: "idle", walk: "idle", run: "idle", dash: "idle", crouch: "idle", guard: "idle", block: "idle",
  draw: "draw", aim: "aim", light: "light", heavy: "light", up: "light",
  firecast: "firecast", icecast: "icecast", antiair: "antiair", bowslash: "bowslash",
  airdraw: "airdraw", air: "airdraw", jump: "airdraw", fall: "airdraw", dive: "dive",
}

// World-space BOW position for Green Arrow's CURRENT rendered frame. Uses the real drawn rect cached by
// sprite.js (_lastDrawX/Y/W/H); falls back to a body-box approximation on the pre-first-draw frame.
export function getGreenArrowBowWorld(fighter) {
  const face = fighter.facing || 1
  let bx = 0.70, by = 0.42
  const sh = fighter.spriteHandler
  if (sh) {
    const strip = ACTION_TO_STRIP[sh.currentAction]
    const arr = strip && GREEN_ARROW_BOW[strip]
    if (arr && arr.length) {
      const fi = Math.max(0, Math.min(arr.length - 1, sh.frameIndex || 0))
      bx = arr[fi][0]; by = arr[fi][1]
    }
  }
  const L = fighter._lastDrawX, W = fighter._lastDrawW, T = fighter._lastDrawY, H = fighter._lastDrawH
  if (L == null || !W || T == null || !H) {   // not drawn yet → body-box approximation
    return { x: (fighter.x || 0) + (fighter.w || 60) * (face >= 0 ? 0.72 : 0.28), y: (fighter.y || 0) + (fighter.h || 100) * 0.42 }
  }
  const x = face >= 0 ? L + bx * W : L + (1 - bx) * W
  const y = T + by * H
  return { x, y }
}
