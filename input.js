// input.js - Master Input & Settings Handler

export const keys = {}
const keyPressed = {}
const recentPressedKeys = new Set()

// ------------------------------
// SETTINGS & GAMEPAD STATE
// ------------------------------
export const settings = {
    p1InputType: "keyboard", // "keyboard" or "controller"
    p2InputType: "controller",
    p1ControllerIndex: 0,
    p2ControllerIndex: 1
}

// PS5 Controller Mapping (Standard DualSense)
const PS5_MAP = {
    X: 0, SQUARE: 2, CIRCLE: 1, TRIANGLE: 3,
    L1: 4, R1: 5, L2: 6, R2: 7,
    UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
    ANALOG_L_X: 0, ANALOG_L_Y: 1
};

// Buffers (Captures inputs for 10 frames to prevent "ate my input" feel)
const BUFFER_WINDOW = 10;
const p1Buffer = { light: 0, heavy: 0, upAtk: 0, special1: 0, special2: 0, ultimate: 0, jump: 0, dash: 0 };
const p2Buffer = { light: 0, heavy: 0, upAtk: 0, special1: 0, special2: 0, ultimate: 0, jump: 0, dash: 0 };

export const mouse = { x: 0, y: 0, down: false, clicked: false, released: false, wheelDelta: 0, inside: false }
let mouseCanvas = null

const debugInputState = { showHitboxes: false, showHurtboxes: false, showInputDisplay: true, trainingMode: false }

// ------------------------------
// KEY TRACKING
// ------------------------------
function normalizeKey(key) { return String(key || "").toLowerCase(); }

document.addEventListener("keydown", (e) => {
    const key = normalizeKey(e.key);
    keys[key] = true;
    recentPressedKeys.add(key);
});

document.addEventListener("keyup", (e) => {
    keys[normalizeKey(e.key)] = false;
});

// ------------------------------
// GAMEPAD LOGIC
// ------------------------------
function updateBuffer(buffer) {
    for (let action in buffer) { if (buffer[action] > 0) buffer[action]--; }
}

function pollGamepad(playerNum, buffer) {
    const gamepads = navigator.getGamepads();
    const index = playerNum === 1 ? settings.p1ControllerIndex : settings.p2ControllerIndex;
    const gp = gamepads[index];
    if (!gp) return null;

    // Buffer button presses (Face buttons and Triggers)
    if (gp.buttons[PS5_MAP.X].pressed) buffer.light = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.CIRCLE].pressed) buffer.heavy = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.TRIANGLE].pressed) buffer.upAtk = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.SQUARE].pressed) buffer.dash = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.R1].pressed) buffer.special1 = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.R2].pressed) buffer.special2 = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.L2].pressed) buffer.ultimate = BUFFER_WINDOW;
    if (gp.buttons[PS5_MAP.UP].pressed) buffer.jump = BUFFER_WINDOW;

    return {
        left: gp.buttons[PS5_MAP.LEFT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] < -0.4,
        right: gp.buttons[PS5_MAP.RIGHT].pressed || gp.axes[PS5_MAP.ANALOG_L_X] > 0.4,
        down: gp.buttons[PS5_MAP.DOWN].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] > 0.4,
        jump: buffer.jump > 0 || gp.buttons[PS5_MAP.UP].pressed || gp.axes[PS5_MAP.ANALOG_L_Y] < -0.4,
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        upAttack: buffer.upAtk > 0,
        special1: buffer.special1 > 0,
        special2: buffer.special2 > 0,
        ultimate: buffer.ultimate > 0,
        dash: buffer.dash > 0,
        grab: gp.buttons[PS5_MAP.L1].pressed,
        charge: gp.buttons[PS5_MAP.R2].pressed // R2 is often charge in anime games
    };
}

// ------------------------------
// EXPORTED GETTER FOR GAME.JS
// ------------------------------
export function getFighterInput(fighter) {
    const isP1 = fighter.side === "p1";
    const buffer = isP1 ? p1Buffer : p2Buffer;
    const type = isP1 ? settings.p1InputType : settings.p2InputType;
    const controls = fighter.controls;

    updateBuffer(buffer);

    // If controller is set, try to poll it
    if (type === "controller") {
        const gp = pollGamepad(isP1 ? 1 : 2, buffer);
        if (gp) return gp;
    }

    // Fallback to Keyboard + Buffering
    if (keys[controls.light]) buffer.light = BUFFER_WINDOW;
    if (keys[controls.heavy]) buffer.heavy = BUFFER_WINDOW;
    if (keys[controls.ultimate]) buffer.ultimate = BUFFER_WINDOW;

    return {
        left: keys[controls.left],
        right: keys[controls.right],
        up: keys[controls.up],
        down: keys[controls.down],
        jump: keys[controls.jump],
        light: buffer.light > 0,
        heavy: buffer.heavy > 0,
        upAttack: keys[controls.up] && buffer.light > 0, // Traditional Launcher shortcut
        special1: keys[controls.special],
        ultimate: buffer.ultimate > 0,
        dash: keys[controls.dash],
        grab: keys[controls.grab],
        charge: keys[controls.charge]
    };
}

// ------------------------------
// MENU HELPERS
// ------------------------------
export function setupMouseInput(canvas) {
    mouseCanvas = canvas;
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener("mousedown", () => mouse.down = mouse.clicked = true);
    window.addEventListener("mouseup", () => mouse.down = false);
}

export function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function consumeMouseClick() { mouse.clicked = false; }

export function endInputFrame() {
    recentPressedKeys.clear();
    mouse.clicked = false;
}
