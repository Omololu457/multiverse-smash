/**
 * INPUT MANAGER
 * Handles Keyboard, Gamepads, Mouse, Input Buffering, Debug Toggles, and Input History.
 */

export const keys = {};
const p1Buffer = { light: 0, heavy: 0, ultimate: 0, dash: 0, jump: 0, special: 0 };
const p2Buffer = { light: 0, heavy: 0, ultimate: 0, dash: 0, jump: 0, special: 0 };
const BUFFER_WINDOW = 10; // Frames to keep an input "active"

export const inputSettings = {
    p1Type: "keyboard",
    p2Type: "keyboard"
};

const PS5_MAP = {
    X: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3,
    L1: 4, R1: 5, L2: 6, R2: 7,
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    ANALOG_L_X: 0, ANALOG_L_Y: 1
};

export const defaultControls = {
    left: "a", right: "d", jump: "w", down: "s",
    light: "j", heavy: "k", up: "i", downAir: "l",
    ultimate: "u", special: "o", dash: "shift", charge: "c", grab: "g"
};

export const defaultControlsP2 = {
    left: "arrowleft", right: "arrowright", jump: "arrowup", down: "arrowdown",
    light: "1", heavy: "2", up: "3", downAir: "4",
    ultimate: "5", special: "6", dash: "0", charge: "8", grab: "9"
};

// ------------------------------
// EVENT LISTENERS
// ------------------------------
function normalizeKey(key) { return String(key || "").toLowerCase(); }

document.addEventListener("keydown", (e) => {
    const key = normalizeKey(e.key);
    keys[key] = true;
    if (["arrowup", "arrowdown", " ", "f1", "f2"].includes(key)) e.preventDefault();
});

document.addEventListener("keyup", (e) => {
    keys[normalizeKey(e.key)] = false;
});

// ------------------------------
// MOUSE INPUT
// ------------------------------
export const mouse = { x: 0, y: 0, clicked: false, _pendingClick: false };

export function setupMouseInput(canvas) {
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    });
    canvas.addEventListener("mousedown", () => {
        mouse._pendingClick = true;
    });
    canvas.addEventListener("mouseup", () => {
        if (mouse._pendingClick) mouse.clicked = true;
        mouse._pendingClick = false;
    });
}

export function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

export function consumeMouseClick() {
    mouse.clicked = false;
}

// ------------------------------
// FRAME LIFECYCLE
// ------------------------------
export function endInputFrame() {
    // Safety net: clear click state at end of every frame
    // so a click never persists if consumeMouseClick() was missed
    mouse.clicked = false;
}

// ------------------------------
// DEBUG / TRAINING TOGGLES
// ------------------------------
const debugState = { trainingMode: false };
let f1WasDown = false;

export function updateDebugInputToggles() {
    const f1Down = !!keys["f1"];
    if (f1Down && !f1WasDown) {
        debugState.trainingMode = !debugState.trainingMode;
    }
    f1WasDown = f1Down;
}

export function getDebugInputState() {
    return { ...debugState };
}

// ------------------------------
// INPUT HISTORY (Training Mode)
// ------------------------------
const inputHistory = [];
const MAX_HISTORY = 120; // frames to retain

export function recordInputFrame(label, controls, fighter, frame) {
    if (!fighter) return;
    const entry = { frame, label, inputs: [] };
    for (const [action, key] of Object.entries(controls)) {
        if (keys[key]) entry.inputs.push(action);
    }
    inputHistory.push(entry);
    if (inputHistory.length > MAX_HISTORY) inputHistory.shift();
}

export function recordInputSequence(controls) {
    // Placeholder — extend here for motion input detection (e.g. quarter-circle)
}

export function getInputHistory() {
    return inputHistory;
}

// ------------------------------
// POLLING & BUFFERING
// ------------------------------
function updateBuffer(buffer) {
    for (let key in buffer) if (buffer[key] > 0) buffer[key]--;
}

function pollGamepad(playerNum, buffer) {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[playerNum === 1 ? 0 : 1];
    if (!gp) return null;

    if (gp.buttons[PS5_MAP.X].pressed) buffer.light = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.CIRCLE].pressed) buffer.heavy = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.TRIANGLE].pressed) buffer.special = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.SQUARE].pressed) buffer.dash = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.UP].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] < -0.4) buffer.jump = BUFFER_WINDOW;

    return {
        left: gp.buttons[PS5_MAP.LEFT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] < -0.4,
        right: gp.buttons[PS5_MAP.RIGHT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] > 0.4,
        down: gp.buttons[PS5_MAP.DOWN].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] > 0.4,
        jump: buffer.jump > 0,
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        special: buffer.special > 0,
        dash: buffer.dash > 0,
        grab: gp.buttons[PS5_MAP.L1].pressed,
        ultimate: gp.buttons[PS5_MAP.L2].pressed
    };
}

/**
 * Returns a cleaned input object for the combat/physics engines.
 */
export function getFighterInput(fighter) {
    if (!fighter) return null;
    const isP1 = fighter.playerNumber === 1;
    const buffer = isP1 ? p1Buffer : p2Buffer;
    const type = isP1 ? inputSettings.p1Type : inputSettings.p2Type;
    const ctrl = fighter.controls;

    updateBuffer(buffer);

    // 1. Check Controller
    if (type === "controller") {
        const gpInput = pollGamepad(isP1 ? 1 : 2, buffer);
        if (gpInput) return gpInput;
    }

    // 2. Check Keyboard & Update Buffers
    if (keys[ctrl.light]) buffer.light = BUFFER_WINDOW;
    if (keys[ctrl.heavy]) buffer.heavy = BUFFER_WINDOW;
    if (keys[ctrl.special]) buffer.special = BUFFER_WINDOW;
    if (keys[ctrl.ultimate]) buffer.ultimate = BUFFER_WINDOW;
    if (keys[ctrl.jump] || keys[ctrl.up]) buffer.jump = BUFFER_WINDOW;

    // 3. Construct Unified Input Object
    return {
        left: !!keys[ctrl.left],
        right: !!keys[ctrl.right],
        down: !!keys[ctrl.down],
        jump: buffer.jump > 0,
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        special: buffer.special > 0,
        ultimate: buffer.ultimate > 0,
        dash: !!keys[ctrl.dash],
        grab: !!keys[ctrl.grab]
    };
}

// Clears buffers (use on round start or death)
export function clearInputBuffers() {
    [p1Buffer, p2Buffer].forEach(b => Object.keys(b).forEach(k => b[k] = 0));
}
