// input.js
// Central input manager for keyboard, mouse, training/debug tools,
// input history, and simple menu helpers.

export const keys = {}
const keyPressed = {}
const recentPressedKeys = new Set()

// ------------------------------
// MOUSE STATE
// ------------------------------
export const mouse = {
  x: 0,
  y: 0,
  down: false,
  clicked: false,
  released: false,
  wheelDelta: 0,
  inside: false
}

let mouseCanvas = null
let mouseBound = false

// ------------------------------
// INPUT HISTORY / DEBUG STATE
// ------------------------------
const MAX_INPUT_HISTORY = 20
const inputHistory = []

const debugInputState = {
  showHitboxes: false,
  showHurtboxes: false,
  showInputDisplay: true,
  showMoveData: true,
  showFrameCounter: true,
  trainingMode: false
}

// Tracks recent directional/button sequences for systems like Binding Vow
const inputSequence = []
const MAX_SEQUENCE_LENGTH = 12

// ------------------------------
// DEFAULT PLAYER CONTROLS
// ------------------------------
export const defaultControls = {
  left: "a",
  right: "d",
  jump: "w",
  lightAttack: "j",
  heavyAttack: "k",
  upAttack: "i",
  downAir: "l",
  ultimate: "u",
  special1: "o",
  special2: "p"
}

export const defaultControlsP2 = {
  left: "arrowleft",
  right: "arrowright",
  jump: "arrowup",
  lightAttack: "1",
  heavyAttack: "2",
  upAttack: "3",
  downAir: "4",
  ultimate: "5",
  special1: "6",
  special2: "7"
}

// ------------------------------
// TRAINING / DEBUG CONTROLS
// ------------------------------
export const debugControls = {
  toggleTrainingMode: "f1",
  toggleHitboxes: "f2",
  toggleHurtboxes: "f3",
  toggleInputDisplay: "f4",
  toggleMoveData: "f5",
  toggleFrameCounter: "f6",
  clearInputHistory: "f7"
}

// ------------------------------
// KEY NORMALIZATION
// ------------------------------
function normalizeKey(key) {
  if (!key) return ""
  return String(key).toLowerCase()
}

function shouldPreventDefault(key) {
  return [
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    " ",
    "space",
    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7"
  ].includes(key)
}

// ------------------------------
// KEY TRACKING
// ------------------------------
document.addEventListener("keydown", (e) => {
  const key = normalizeKey(e.key)
  if (!key) return

  if (shouldPreventDefault(key)) {
    e.preventDefault()
  }

  keys[key] = true
  recentPressedKeys.add(key)
})

document.addEventListener("keyup", (e) => {
  const key = normalizeKey(e.key)
  if (!key) return

  if (shouldPreventDefault(key)) {
    e.preventDefault()
  }

  keys[key] = false
})

// ------------------------------
// MOUSE HELPERS
// ------------------------------
export function getCanvasMousePosition(canvas, clientX, clientY) {
  if (!canvas) {
    return { x: clientX || 0, y: clientY || 0 }
  }

  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width ? canvas.width / rect.width : 1
  const scaleY = rect.height ? canvas.height / rect.height : 1

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  }
}

function updateMousePositionFromEvent(e) {
  if (!mouseCanvas) return

  const pos = getCanvasMousePosition(mouseCanvas, e.clientX, e.clientY)
  mouse.x = pos.x
  mouse.y = pos.y
}

export function setupMouseInput(canvas) {
  if (!canvas) return
  mouseCanvas = canvas

  if (mouseBound) {
    return
  }

  canvas.addEventListener("mousemove", (e) => {
    updateMousePositionFromEvent(e)
    mouse.inside = true
  })

  canvas.addEventListener("mouseenter", (e) => {
    updateMousePositionFromEvent(e)
    mouse.inside = true
  })

  canvas.addEventListener("mouseleave", () => {
    mouse.inside = false
    mouse.down = false
  })

  canvas.addEventListener("mousedown", (e) => {
    updateMousePositionFromEvent(e)
    mouse.down = true
    mouse.clicked = true
    mouse.inside = true
  })

  window.addEventListener("mouseup", (e) => {
    if (mouseCanvas) {
      updateMousePositionFromEvent(e)
    }
    mouse.down = false
    mouse.released = true
  })

  canvas.addEventListener(
    "wheel",
    (e) => {
      updateMousePositionFromEvent(e)
      mouse.wheelDelta += e.deltaY
      e.preventDefault()
    },
    { passive: false }
  )

  mouseBound = true
}

export function getMouseState() {
  return mouse
}

export function consumeMouseClick() {
  mouse.clicked = false
}

export function consumeMouseRelease() {
  mouse.released = false
}

export function consumeMouseWheel() {
  mouse.wheelDelta = 0
}

export function pointInRect(px, py, rect) {
  if (!rect) return false

  return (
    px >= rect.x &&
    px <= rect.x + rect.w &&
    py >= rect.y &&
    py <= rect.y + rect.h
  )
}

// ------------------------------
// BASIC CONTROL CHECK
// ------------------------------
export function isControlPressed(controls, action) {
  if (!controls) return false
  const key = controls[action]
  return key ? !!keys[normalizeKey(key)] : false
}

// ------------------------------
// SINGLE-FRAME KEY PRESS
// Returns true only once when the key is first pressed.
// ------------------------------
export function checkKeyPress(key) {
  if (!key) return false

  const lowerKey = normalizeKey(key)

  if (keys[lowerKey] && !keyPressed[lowerKey]) {
    keyPressed[lowerKey] = true
    return true
  }

  if (!keys[lowerKey]) {
    keyPressed[lowerKey] = false
  }

  return false
}

// ------------------------------
// ACTION-SPECIFIC SINGLE PRESS
// ------------------------------
export function checkActionPress(controls, action) {
  if (!controls) return false
  const key = controls[action]
  return key ? checkKeyPress(key) : false
}

// ------------------------------
// HELPER: HELD ACTION
// ------------------------------
export function checkActionHeld(controls, action) {
  if (!controls) return false
  const key = controls[action]
  return key ? !!keys[normalizeKey(key)] : false
}

// ------------------------------
// DIRECTIONAL INPUT HELPERS
// ------------------------------
export function getDirectionalInput(controls) {
  const left = isControlPressed(controls, "left")
  const right = isControlPressed(controls, "right")
  const jump = isControlPressed(controls, "jump")

  return {
    left,
    right,
    up: jump,
    horizontal: left && !right ? -1 : right && !left ? 1 : 0,
    vertical: jump ? -1 : 0
  }
}

export function getMovementInput(controls) {
  return {
    left: isControlPressed(controls, "left"),
    right: isControlPressed(controls, "right"),
    jump: isControlPressed(controls, "jump")
  }
}

export function getCombatInput(controls, fighter = null) {
  const airborne = fighter ? !fighter.grounded : false

  return {
    light: checkActionPress(controls, "lightAttack"),
    heavy: checkActionPress(controls, "heavyAttack"),
    upAttack: checkActionPress(controls, "upAttack"),
    air: airborne ? checkActionPress(controls, "lightAttack") : false,
    downAir: airborne ? checkActionPress(controls, "downAir") : false,
    ultimate: checkActionPress(controls, "ultimate"),
    special1: checkActionPress(controls, "special1"),
    special2: checkActionPress(controls, "special2")
  }
}

// ------------------------------
// RELATIVE DIRECTION DISPLAY
// Useful for training overlay
// ------------------------------
export function getRelativeDirections(fighter = null) {
  if (!fighter) return []

  const directions = []

  if (fighter.vx < -0.1) directions.push("Left")
  if (fighter.vx > 0.1) directions.push("Right")
  if (fighter.vy < -0.1) directions.push("Up")
  if (fighter.vy > 0.1) directions.push("Down")
  if (!fighter.grounded) directions.push("Air")

  return directions
}

// ------------------------------
// RAW HELD BUTTON SNAPSHOT
// ------------------------------
export function getHeldInputSnapshot(controls, fighter = null) {
  const airborne = fighter ? !fighter.grounded : false

  return {
    left: checkActionHeld(controls, "left"),
    right: checkActionHeld(controls, "right"),
    jump: checkActionHeld(controls, "jump"),
    light: checkActionHeld(controls, "lightAttack"),
    heavy: checkActionHeld(controls, "heavyAttack"),
    upAttack: checkActionHeld(controls, "upAttack"),
    downAir: airborne ? checkActionHeld(controls, "downAir") : false,
    ultimate: checkActionHeld(controls, "ultimate"),
    special1: checkActionHeld(controls, "special1"),
    special2: checkActionHeld(controls, "special2")
  }
}

// ------------------------------
// INPUT DISPLAY LABEL BUILDER
// ------------------------------
export function buildInputDisplayString(snapshot) {
  if (!snapshot) return ""

  const parts = []

  if (snapshot.left) parts.push("L")
  if (snapshot.right) parts.push("R")
  if (snapshot.jump) parts.push("U")
  if (snapshot.light) parts.push("Light")
  if (snapshot.heavy) parts.push("Heavy")
  if (snapshot.upAttack) parts.push("Launcher")
  if (snapshot.downAir) parts.push("Spike")
  if (snapshot.special1) parts.push("S1")
  if (snapshot.special2) parts.push("S2")
  if (snapshot.ultimate) parts.push("Ult")

  return parts.length ? parts.join(" + ") : "Neutral"
}

// ------------------------------
// INPUT HISTORY
// ------------------------------
export function recordInputFrame(playerLabel, controls, fighter = null, frameNumber = 0) {
  const snapshot = getHeldInputSnapshot(controls, fighter)
  const display = buildInputDisplayString(snapshot)

  const lastEntry = inputHistory[0]

  if (
    lastEntry &&
    lastEntry.player === playerLabel &&
    lastEntry.display === display &&
    display === "Neutral"
  ) {
    return
  }

  inputHistory.unshift({
    frame: frameNumber,
    player: playerLabel,
    display,
    snapshot
  })

  if (inputHistory.length > MAX_INPUT_HISTORY) {
    inputHistory.length = MAX_INPUT_HISTORY
  }
}

export function getInputHistory() {
  return inputHistory
}

export function clearInputHistory() {
  inputHistory.length = 0
}

// ------------------------------
// INPUT SEQUENCE TRACKING
// ------------------------------
export function recordInputSequence(controls) {
  const direction = getDirectionalInput(controls)

  let token = null

  if (direction.up) token = "UP"
  else if (direction.left && !direction.right) token = "LEFT"
  else if (direction.right && !direction.left) token = "RIGHT"

  if (token) {
    const lastToken = inputSequence[inputSequence.length - 1]
    if (lastToken !== token) {
      inputSequence.push(token)

      if (inputSequence.length > MAX_SEQUENCE_LENGTH) {
        inputSequence.shift()
      }
    }
  }
}

export function getInputSequence() {
  return inputSequence
}

export function clearInputSequence() {
  inputSequence.length = 0
}

export function checkSequenceMatch(sequence) {
  if (!Array.isArray(sequence) || sequence.length === 0) return false
  if (sequence.length > inputSequence.length) return false

  const recent = inputSequence.slice(-sequence.length)
  return sequence.every((value, index) => recent[index] === value)
}

// ------------------------------
// TRAINING / DEBUG TOGGLES
// ------------------------------
export function updateDebugInputToggles() {
  if (checkKeyPress(debugControls.toggleTrainingMode)) {
    debugInputState.trainingMode = !debugInputState.trainingMode
  }

  if (checkKeyPress(debugControls.toggleHitboxes)) {
    debugInputState.showHitboxes = !debugInputState.showHitboxes
  }

  if (checkKeyPress(debugControls.toggleHurtboxes)) {
    debugInputState.showHurtboxes = !debugInputState.showHurtboxes
  }

  if (checkKeyPress(debugControls.toggleInputDisplay)) {
    debugInputState.showInputDisplay = !debugInputState.showInputDisplay
  }

  if (checkKeyPress(debugControls.toggleMoveData)) {
    debugInputState.showMoveData = !debugInputState.showMoveData
  }

  if (checkKeyPress(debugControls.toggleFrameCounter)) {
    debugInputState.showFrameCounter = !debugInputState.showFrameCounter
  }

  if (checkKeyPress(debugControls.clearInputHistory)) {
    clearInputHistory()
    clearInputSequence()
  }
}

export function getDebugInputState() {
  return debugInputState
}

// ------------------------------
// FRAME RESET
// ------------------------------
export function endInputFrame() {
  recentPressedKeys.clear()
  mouse.clicked = false
  mouse.released = false
  mouse.wheelDelta = 0
}

// ------------------------------
// RECENT PRESSES ACCESS
// ------------------------------
export function getRecentPressedKeys() {
  return Array.from(recentPressedKeys)
}