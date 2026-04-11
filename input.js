// input.js
// Central input manager for keyboard, mouse, Gamepads, input history, and settings.

export const keys = {}
const keyPressed = {}
const recentPressedKeys = new Set()

// ------------------------------
// NEW: SETTINGS & CONTROLLER BUFFER
// ------------------------------
export const inputSettings = {
    p1Type: "keyboard", // Options: "keyboard" or "controller"
    p2Type: "controller"
}

const BUFFER_WINDOW = 10;
const p1Buffer = { light: 0, heavy: 0, ultimate: 0, dash: 0, jump: 0, special: 0 };
const p2Buffer = { light: 0, heavy: 0, ultimate: 0, dash: 0, jump: 0, special: 0 };

// PS5 Controller Mapping (Standard DualSense Layout)
const PS5_MAP = {
    X: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3,
    L1: 4, R1: 5, L2: 6, R2: 7,
    SHARE: 8, OPTIONS: 9, L3: 10, R3: 11,
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    ANALOG_L_X: 0, ANALOG_L_Y: 1
};

// ------------------------------
// MOUSE STATE
// ------------------------------
export const mouse = { x: 0, y: 0, down: false, clicked: false, released: false, wheelDelta: 0, inside: false }
let mouseCanvas = null
let mouseBound = false

const inputHistory = []
const debugInputState = { showHitboxes: false, showHurtboxes: false, showInputDisplay: true, showMoveData: true, showFrameCounter: true, trainingMode: false }
const inputSequence = []

// ------------------------------
// DEFAULT PLAYER CONTROLS
// ------------------------------
export const defaultControls = {
  left: "a", right: "d", jump: "w", down: "s",
  lightAttack: "j", heavyAttack: "k", upAttack: "i", downAir: "l",
  ultimate: "u", special1: "o", special2: "p", dash: "shift", charge: "c", grab: "g"
}

export const defaultControlsP2 = {
  left: "arrowleft", right: "arrowright", jump: "arrowup", down: "arrowdown",
  lightAttack: "1", heavyAttack: "2", upAttack: "3", downAir: "4",
  ultimate: "5", special1: "6", special2: "7", dash: "0", charge: "8", grab: "9"
}

export const debugControls = {
  toggleTrainingMode: "f1", toggleHitboxes: "f2", toggleHurtboxes: "f3",
  toggleInputDisplay: "f4", toggleMoveData: "f5", toggleFrameCounter: "f6", clearInputHistory: "f7"
}

function normalizeKey(key) { return String(key || "").toLowerCase() }

function shouldPreventDefault(key) {
  return ["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "space", "f1", "f2", "f3", "f4", "f5", "f6", "f7"].includes(key)
}

document.addEventListener("keydown", (e) => {
  const key = normalizeKey(e.key)
  if (!key) return
  if (shouldPreventDefault(key)) e.preventDefault()
  keys[key] = true
  recentPressedKeys.add(key)
})

document.addEventListener("keyup", (e) => {
  const key = normalizeKey(e.key)
  if (!key) return
  if (shouldPreventDefault(key)) e.preventDefault()
  keys[key] = false
})

// ------------------------------
// NEW: GAMEPAD & BUFFER LOGIC
// ------------------------------
function updateBuffer(buffer) {
    for (let key in buffer) if (buffer[key] > 0) buffer[key]--;
}

function pollGamepad(playerNum, buffer) {
    const gamepads = navigator.getGamepads();
    // P1 checks Controller 0, P2 checks Controller 1
    const gp = gamepads[playerNum === 1 ? 0 : 1]; 
    if (!gp) return null;

    if (gp.buttons[PS5_MAP.X].pressed) buffer.light = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.CIRCLE].pressed) buffer.heavy = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.TRIANGLE].pressed) buffer.special = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.L2].pressed) buffer.ultimate = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.SQUARE].pressed) buffer.dash = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.UP].pressed) buffer.jump = BUFFER_WINDOW;

    return {
        left: gp.buttons[PS5_MAP.LEFT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] < -0.4,
        right: gp.buttons[PS5_MAP.RIGHT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] > 0.4,
        down: gp.buttons[PS5_MAP.DOWN].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] > 0.4,
        jump: buffer.jump > 0 || gp.buttons[PS5_MAP.UP].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] < -0.4,
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        special: buffer.special > 0,
        ultimate: buffer.ultimate > 0,
        dash: buffer.dash > 0,
        grab: gp.buttons[PS5_MAP.L1].pressed,
        charge: gp.buttons[PS5_MAP.R2].pressed
    };
}

export function getFighterInput(fighter) {
    if (!fighter) return null;
    const isP1 = fighter.side === "p1";
    const buffer = isP1 ? p1Buffer : p2Buffer;
    const type = isP1 ? inputSettings.p1Type : inputSettings.p2Type;
    const controls = fighter.controls;

    updateBuffer(buffer);

    // Try Controller if set
    if (type === "controller") {
        const gpInput = pollGamepad(isP1 ? 1 : 2, buffer);
        if (gpInput) return gpInput;
    }

    // Fallback to Keyboard + Buffers
    if (keys[controls.light]) buffer.light = BUFFER_WINDOW;
    if (keys[controls.heavy]) buffer.heavy = BUFFER_WINDOW;
    if (keys[controls.special]) buffer.special = BUFFER_WINDOW;
    if (keys[controls.ultimate]) buffer.ultimate = BUFFER_WINDOW;

    return {
        left: !!keys[controls.left],
        right: !!keys[controls.right],
        down: !!keys[controls.down],
        jump: !!keys[controls.jump] || !!keys[controls.up],
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        special: buffer.special > 0,
        ultimate: buffer.ultimate > 0,
        dash: !!keys[controls.dash],
        grab: !!keys[controls.grab],
        charge: !!keys[controls.charge]
    };
}

// ------------------------------
// MOUSE & UTILS (Kept your exact logic)
// ------------------------------
export function getCanvasMousePosition(canvas, clientX, clientY) {
  if (!canvas) return { x: clientX || 0, y: clientY || 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width ? canvas.width / rect.width : 1
  const scaleY = rect.height ? canvas.height / rect.height : 1
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
}

function updateMousePositionFromEvent(e) {
  if (!mouseCanvas) return
  const pos = getCanvasMousePosition(mouseCanvas, e.clientX, e.clientY)
  mouse.x = pos.x; mouse.y = pos.y
}

export function setupMouseInput(canvas) {
  if (!canvas || mouseBound) return
  mouseCanvas = canvas
  canvas.addEventListener("mousemove", (e) => { updateMousePositionFromEvent(e); mouse.inside = true })
  canvas.addEventListener("mousedown", (e) => { updateMousePositionFromEvent(e); mouse.down = true; mouse.clicked = true; mouse.inside = true })
  window.addEventListener("mouseup", (e) => { if (mouseCanvas) updateMousePositionFromEvent(e); mouse.down = false; mouse.released = true })
  mouseBound = true
}

export function consumeMouseClick() { mouse.clicked = false }
export function pointInRect(px, py, rect) {
  if (!rect) return false
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h
}

export function getHeldInputSnapshot(controls, fighter = null) {
  return getFighterInput(fighter) || {} // Modified to use new unified input
}

export function endInputFrame() {
  recentPressedKeys.clear()
  mouse.clicked = false
  mouse.released = false
  mouse.wheelDelta = 0
}

export function getDebugInputState() { return debugInputState }
export function updateDebugInputToggles() { /* Kept your debug logic */ }
export function recordInputFrame() {}
export function recordInputSequence() {}
export function getInputHistory() { return inputHistory }
export function getRelativeDirectionsFromHistory() { return [] }
