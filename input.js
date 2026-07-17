/**
 * INPUT MANAGER
 * Keyboard, Gamepad, Mouse, Input Buffering, Debug Toggles, and Input History.
 *
 * Notes:
 * - A button press remains buffered for BUFFER_WINDOW frames.
 * - clearInputBuffers() also clears physical key state so held keys do not
 *   ghost into a new round.
 * - endInputFrame() is the single end-of-frame safety net for mouse clicks.
 */

export const keys = {}

// ─────────────────────────────────────────────────────────────────
// INPUT BUFFERS
// ─────────────────────────────────────────────────────────────────
const BUFFER_WINDOW = 10 // frames

const p1Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }
const p2Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }

function zeroBuffer(buf) {
  for (const k in buf) buf[k] = 0
}

export const inputSettings = {
  p1Type: "keyboard",
  p2Type: "keyboard"
}

// ─────────────────────────────────────────────────────────────────
// GAMEPAD MAPPING
// ─────────────────────────────────────────────────────────────────
// Standard-gamepad / PS5 button indices.
//   X (0)        → light          Square (2)  → heavy
//   Triangle (3) → special        Circle (1)  → dash
//   L1 (4)       → grab           R1 (5)      → charge / Omnitrix switch
//   L2 (6)       → ultimate       R2 (7)      → ultimate (alt)
export const PS5_MAP = {
  X: 0,
  CIRCLE: 1,
  SQUARE: 2,
  TRIANGLE: 3,
  L1: 4,
  R1: 5,
  L2: 6,
  R2: 7,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
  ANALOG_L_X: 0,
  ANALOG_L_Y: 1
}

export const STICK_DEADZONE = 0.4

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONTROL MAPS
// ─────────────────────────────────────────────────────────────────
// KEYBOARD DEFAULTS: SINGLE SOURCE OF TRUTH lives in game.js (P1_CONTROLS /
// P2_CONTROLS) — those are the real, rebindable, runtime binds passed to
// createFighter and mutated by the rebind UI. This module deliberately keeps NO
// second copy (the old one had drifted: special:"o" not "l", an `up`/`downAir`
// schema that didn't even match getFighterInput's `upAttack`/`up`/`jump` reads).
// getFighterInput() reads each fighter's OWN `fighter.controls`, and
// clearInputBuffers() clears via the passed-in fighters' controls — neither needs
// a module-level default here.

// ─────────────────────────────────────────────────────────────────
// KEYBOARD EVENTS
// ─────────────────────────────────────────────────────────────────
function normalizeKey(key) {
  return String(key || "").toLowerCase()
}

document.addEventListener("keydown", e => {
  const key = normalizeKey(e.key)
  keys[key] = true

  if (["arrowup", "arrowdown", " ", "f1", "f2", "f3", "f4"].includes(key)) {
    e.preventDefault()
  }
})

document.addEventListener("keyup", e => {
  keys[normalizeKey(e.key)] = false
})

// ─────────────────────────────────────────────────────────────────
// MOUSE INPUT
// ─────────────────────────────────────────────────────────────────
export const mouse = {
  x: 0,
  y: 0,
  clicked: false,
  _pendingClick: false
}

export function setupMouseInput(canvas) {
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect()
    mouse.x = e.clientX - rect.left
    mouse.y = e.clientY - rect.top
  })

  canvas.addEventListener("mousedown", () => {
    mouse._pendingClick = true
  })

  canvas.addEventListener("mouseup", () => {
    if (mouse._pendingClick) mouse.clicked = true
    mouse._pendingClick = false
  })
}

export function pointInRect(x, y, rect) {
  return (
    x >= rect.x &&
    x <= rect.x + rect.w &&
    y >= rect.y &&
    y <= rect.y + rect.h
  )
}

export function consumeMouseClick() {
  mouse.clicked = false
}

// ─────────────────────────────────────────────────────────────────
// FRAME LIFECYCLE
// Called at the end of every game loop iteration.
// ─────────────────────────────────────────────────────────────────
export function endInputFrame() {
  mouse.clicked = false
}

// ─────────────────────────────────────────────────────────────────
// DEBUG / TRAINING TOGGLES
// ─────────────────────────────────────────────────────────────────
const debugState = { trainingMode: false }
let f1WasDown = false

export function updateDebugInputToggles() {
  const f1Down = !!keys["f1"]
  if (f1Down && !f1WasDown) {
    debugState.trainingMode = !debugState.trainingMode
  }
  f1WasDown = f1Down
}

export function getDebugInputState() {
  return { ...debugState }
}

// ─────────────────────────────────────────────────────────────────
// INPUT HISTORY
// ─────────────────────────────────────────────────────────────────
const inputHistory = []
const MAX_HISTORY = 120

export function recordInputFrame(label, controls, fighter, frame) {
  if (!fighter) return

  const entry = { frame, label, inputs: [] }

  for (const [action, key] of Object.entries(controls)) {
    if (keys[key]) entry.inputs.push(action)
  }

  inputHistory.push(entry)
  if (inputHistory.length > MAX_HISTORY) inputHistory.shift()
}

export function recordInputSequence(_controls) {
  // Placeholder — extend here for motion input detection
}

export function getInputHistory() {
  return inputHistory
}

export function clearInputHistory() {
  inputHistory.length = 0
}

// ─────────────────────────────────────────────────────────────────
// BUFFER HELPERS
// ─────────────────────────────────────────────────────────────────
function updateBuffer(buffer) {
  for (const k in buffer) {
    if (buffer[k] > 0) buffer[k]--
  }
}

// ─────────────────────────────────────────────────────────────────
// GAMEPAD POLLING
// ─────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// PAD → PLAYER BINDING (by gamepad.index, NOT array slot)
// ─────────────────────────────────────────────────────────────────
// navigator.getGamepads() is indexed by each pad's browser-assigned .index, whose
// ORDER depends on connection/activation timing — so the old gamepads[0]=P1 /
// gamepads[1]=P2 slot assumption mis-routed a pad to the wrong fighter when two pads
// were live (P1's pad could drive P2). Fix: capture each pad's .index the instant it
// connects (gamepadconnected fires immediately, independent of poll timing) and bind
// players to a specific .index. AUTO-ASSIGN by connection order: 1st pad → P1, 2nd →
// P2. Assignment itself resolves at poll time and is DEVICE-AWARE (only players set to
// "controller" ever claim a pad), so a keyboard-P1 / controller-P2 setup still hands
// the single pad to P2. (Manual per-pad assignment = future follow-up.)
const connectedPads  = []                     // pad.index values, in connection order (from the event)
const padAssignments = { 1: null, 2: null }   // playerNum → bound gamepad.index (or null)

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("gamepadconnected", (e) => {
    const i = e.gamepad?.index
    if (i != null && !connectedPads.includes(i)) connectedPads.push(i)
    // AUTO-ACTIVATE the controller device type. getFighterInput() only routes to
    // pollGamepad() when a player's type is "controller"; nothing else flips it, so
    // before this a freshly-plugged pad did NOTHING in play (the reported bug). Assign
    // by connection order to the first player still on keyboard (P1 first, then P2), so
    // "plug in a pad → it drives a fighter". A player can switch back on the SETTINGS
    // screen. Keyboard-only users (no pad) never hit this, so keyboard play is untouched.
    if (inputSettings.p1Type !== "controller") inputSettings.p1Type = "controller"
    else if (inputSettings.p2Type !== "controller") inputSettings.p2Type = "controller"
  })
  window.addEventListener("gamepaddisconnected", (e) => {
    const i = e.gamepad?.index
    const at = connectedPads.indexOf(i)
    if (at !== -1) connectedPads.splice(at, 1)
    if (padAssignments[1] === i) padAssignments[1] = null   // free the slot for a re-plug
    if (padAssignments[2] === i) padAssignments[2] = null
  })
}

// Resolve the gamepad.index THIS player reads. Keeps an existing binding while that
// pad stays connected; otherwise claims the first connected pad not owned by the other
// player (connection order from the event; falls back to live getGamepads() for pads
// that existed before the listeners registered — gamepadconnected won't re-fire those).
function resolvePadIndex(playerNum, gamepads) {
  const other = padAssignments[playerNum === 1 ? 2 : 1]
  if (padAssignments[playerNum] != null && connectedPads.includes(padAssignments[playerNum])) {
    return padAssignments[playerNum]
  }
  const order = connectedPads.length
    ? connectedPads
    : Array.from(gamepads).filter(Boolean).map(g => g.index)
  for (const idx of order) {
    if (idx !== other) { padAssignments[playerNum] = idx; return idx }
  }
  padAssignments[playerNum] = null
  return null
}

function pollGamepad(playerNum, buffer) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
  // Read THIS player's BOUND pad by gamepad.index (getGamepads() is indexed by .index),
  // never by array position — that's what fixes the two-pad cross-talk.
  const assignedIdx = resolvePadIndex(playerNum, gamepads)
  const gp = assignedIdx == null
    ? null
    : (gamepads[assignedIdx] || Array.from(gamepads).find(g => g && g.index === assignedIdx) || null)
  if (!gp) return null

  const btn  = (i) => !!gp.buttons[i]?.pressed
  const axisX = gp.axes[PS5_MAP.ANALOG_L_X] || 0
  const axisY = gp.axes[PS5_MAP.ANALOG_L_Y] || 0

  const upHeld    = btn(PS5_MAP.UP)    || axisY < -STICK_DEADZONE
  const downHeld  = btn(PS5_MAP.DOWN)  || axisY >  STICK_DEADZONE
  const leftHeld  = btn(PS5_MAP.LEFT)  || axisX < -STICK_DEADZONE
  const rightHeld = btn(PS5_MAP.RIGHT) || axisX >  STICK_DEADZONE

  // DualSense → canonical actions (full keyboard parity):
  //   Square=light(J)  Triangle=heavy(K)  X=jump(W)  R1=special(L)  R2=ultimate(U)
  //   L1=grab(O, held)  L2=charge/toggle(P, held; tap handled in updateGamepadEdges)
  //   Up + attack = grounded up-attack/launcher (X alone stays jump → no collision).
  // Dash (double-tap d-pad) + the L2 tap-toggle are edge-detected in
  // game.js updateGamepadEdges; here we only read held/buffered state.
  const lightBtn = btn(PS5_MAP.SQUARE)
  const heavyBtn = btn(PS5_MAP.TRIANGLE)
  const doingUpAttack = upHeld && (lightBtn || heavyBtn)

  if (btn(PS5_MAP.X))   buffer.jump = BUFFER_WINDOW        // X always jumps
  if (doingUpAttack) {
    buffer.upAttack = BUFFER_WINDOW                        // up + attack = launcher (the up does NOT jump)
  } else {
    if (lightBtn) buffer.light = BUFFER_WINDOW
    if (heavyBtn) buffer.heavy = BUFFER_WINDOW
    if (upHeld)   buffer.jump  = BUFFER_WINDOW             // up alone = jump
  }
  if (btn(PS5_MAP.R1)) buffer.special  = BUFFER_WINDOW
  if (btn(PS5_MAP.R2)) buffer.ultimate = BUFFER_WINDOW

  return {
    left:     leftHeld,
    right:    rightHeld,
    down:     downHeld,
    up:       upHeld && !doingUpAttack,   // suppress the jump when it's an up-attack
    jump:     buffer.jump     > 0,
    light:    buffer.light    > 0,
    heavy:    buffer.heavy    > 0,
    upAttack: buffer.upAttack > 0,
    special:  buffer.special  > 0,
    ultimate: buffer.ultimate > 0,
    dash:     buffer.dash     > 0,        // set by updateGamepadEdges on double-tap
    grab:     btn(PS5_MAP.L1),
    charge:   btn(PS5_MAP.L2)
  }
}

// ─────────────────────────────────────────────────────────────────
// getFighterInput
// Returns a unified input object for combat/physics engines.
// ─────────────────────────────────────────────────────────────────
// Per-player call tally — the single per-frame input entry point for EVERY fighter
// (keyboard AND controller route through here). Exposed so a harness can PROVE the
// wiring is connected (both counters advancing = getFighterInput ran for both).
export const inputCallCount = { 1: 0, 2: 0 }
export function getFighterInput(fighter) {
  if (!fighter) return null

  const isP1 = fighter.playerNumber === 1
  const buffer = isP1 ? p1Buffer : p2Buffer
  const type = isP1 ? inputSettings.p1Type : inputSettings.p2Type
  const ctrl = fighter.controls
  if (fighter.playerNumber === 1 || fighter.playerNumber === 2) inputCallCount[fighter.playerNumber]++

  updateBuffer(buffer)

  // 1. Controller
  if (type === "controller") {
    const gpInput = pollGamepad(isP1 ? 1 : 2, buffer)
    if (gpInput) return gpInput
  }

  // 2. Keyboard buffering
  if (keys[ctrl.light]) buffer.light = BUFFER_WINDOW
  if (keys[ctrl.heavy]) buffer.heavy = BUFFER_WINDOW
  if (keys[ctrl.upAttack]) buffer.upAttack = BUFFER_WINDOW    // dedicated I = up-attack/launcher
  if (keys[ctrl.special]) buffer.special = BUFFER_WINDOW
  if (keys[ctrl.ultimate]) buffer.ultimate = BUFFER_WINDOW
  if (keys[ctrl.jump] || keys[ctrl.up]) buffer.jump = BUFFER_WINDOW

  // 3. Unified output
  return {
    left: !!keys[ctrl.left],
    right: !!keys[ctrl.right],
    down: !!keys[ctrl.down],
    jump: buffer.jump > 0,
    light: buffer.light > 0,
    heavy: buffer.heavy > 0,
    upAttack: buffer.upAttack > 0,
    special: buffer.special > 0,
    ultimate: buffer.ultimate > 0,
    dash: !!keys[ctrl.dash],                  // unbound key ("") → always false; dash = double-tap
    grab: !!keys[ctrl.grab],
    charge: !!keys[ctrl.charge]
  }
}

// ─────────────────────────────────────────────────────────────────
// clearInputBuffers
// Call this on round reset so held keys don't ghost into the new round.
// ─────────────────────────────────────────────────────────────────
export function clearInputBuffers(fighters = []) {
  zeroBuffer(p1Buffer)
  zeroBuffer(p2Buffer)

  // Clear each live fighter's actual binds (its real controls object — the single
  // source of truth from game.js), so held keys can't ghost into the next round.
  for (const fighter of fighters) {
    if (!fighter?.controls) continue
    for (const key of Object.values(fighter.controls)) {
      if (key) keys[key] = false
    }
  }

  clearInputHistory()
}
