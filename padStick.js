// padStick.js — in-battle LEFT-STICK + D-PAD → one numpad direction per frame (input quick-wins Phase 3).
//
// Replaces the old "four independent switches at a per-axis 0.4 deadzone" read, which turned a natural
// downward tilt while holding right into RIGHT+DOWN, a slight upward tilt into UP (= jump), flickered at the
// 0.4 edge (false press edges → false double-taps / motions), and made down-forward read as FORWARD.
//
//   1. RADIAL deadzone: magnitude < 0.28 → neutral (5).
//   2. 8-way ANGULAR gate: cardinals own ±30° around 0/90/180/270°, diagonals ±15° around 45/135/225/315°
//      (4·60° + 4·30° = 360°). A boundary angle (exactly 30° off a cardinal) belongs to the cardinal.
//   3. HYSTERESIS 8°: the current direction is kept until the stick leaves its sector by more than 8°.
//   4. SOCD with the d-pad (applied where stick and d-pad disagree): left+right → neutral horizontal,
//      up+down → up.
//
// Numpad notation (screen-space, NOT facing-relative): 7 8 9 / 4 5 6 / 1 2 3, 5 = neutral.
// Pure + deterministic. Angles: 0° = right, 90° = up (stick Y axis is negative-up in the Gamepad API).

export const STICK_RADIAL_DEADZONE = 0.28
export const STICK_CARDINAL_HALF_ARC = 30
export const STICK_DIAGONAL_HALF_ARC = 15
export const STICK_HYSTERESIS_DEG = 8

const CENTER = { 6: 0, 9: 45, 8: 90, 7: 135, 4: 180, 1: 225, 2: 270, 3: 315 }
const CARDINALS = [6, 8, 4, 2], DIAGONALS = [9, 7, 1, 3]
const halfArc = d => (d === 6 || d === 8 || d === 4 || d === 2) ? STICK_CARDINAL_HALF_ARC : STICK_DIAGONAL_HALF_ARC
const angDist = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }

export function stickAngle(x, y) { return (Math.atan2(-y, x) * 180 / Math.PI + 360) % 360 }

// Raw 8-way sector for an angle (no hysteresis). Cardinals are inclusive of their ±30° edge.
export function angleToNumpad(angle) {
  for (const d of CARDINALS) if (angDist(angle, CENTER[d]) <= STICK_CARDINAL_HALF_ARC) return d
  for (const d of DIAGONALS) if (angDist(angle, CENTER[d]) < STICK_DIAGONAL_HALF_ARC + 1e-9) return d
  return 5   // unreachable (sectors tile the circle)
}

// Stick (x, y) → numpad, with the previous frame's stick direction for hysteresis.
export function stickToNumpad(x, y, prev = 5) {
  if (Math.hypot(x || 0, y || 0) < STICK_RADIAL_DEADZONE) return 5
  const a = stickAngle(x || 0, y || 0)
  if (prev !== 5 && CENTER[prev] != null && angDist(a, CENTER[prev]) <= halfArc(prev) + STICK_HYSTERESIS_DEG) return prev
  return angleToNumpad(a)
}

export function numpadToDirs(n) {
  return { up: n >= 7, down: n <= 3, left: n === 1 || n === 4 || n === 7, right: n === 3 || n === 6 || n === 9 }
}
export function dirsToNumpad({ up, down, left, right }) {
  const v = up ? 2 : down ? 0 : 1, h = left ? 0 : right ? 2 : 1
  return v * 3 + h + 1
}

// Combine the processed stick with the d-pad, SOCD-cleaned: left+right → neither, up+down → up.
export function combineStickDpad(stickNumpad, dpad) {
  const s = numpadToDirs(stickNumpad)
  let left = s.left || !!dpad.left, right = s.right || !!dpad.right
  const up = s.up || !!dpad.up
  let down = s.down || !!dpad.down
  if (left && right) { left = false; right = false }
  if (up && down) down = false
  return dirsToNumpad({ up, down, left, right })
}
