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
// INPUT_BUFFER_FRAMES — the SINGLE shared input-buffer window for the whole roster (combo-flow
// Stage 2). Every buffered action button (light/heavy/upAttack/special/ultimate/jump/dash) is held
// for exactly this many frames after a press, for every player and every character — there is no
// per-character buffering. Tune combo-input leniency game-wide by changing this one number.
// 7 frames ≈ 117ms @ 60fps (the target "~120ms" standard). Exported so tests/tools read the canon.
export const INPUT_BUFFER_FRAMES = 7
const BUFFER_WINDOW = INPUT_BUFFER_FRAMES // alias kept for the existing call sites below

const p1Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }
const p2Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }
// P3/P4 buffers exist ONLY for the 3-4p free-for-all POC (controller-only players).
// Keyed by playerNumber so getFighterInput stays one code path for all slots.
const p3Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }
const p4Buffer = { light: 0, heavy: 0, upAttack: 0, ultimate: 0, dash: 0, jump: 0, special: 0 }
const PLAYER_BUFFERS = { 1: p1Buffer, 2: p2Buffer, 3: p3Buffer, 4: p4Buffer }

function zeroBuffer(buf) {
  for (const k in buf) buf[k] = 0
}

// Clear a fighter's pressed-input buffer. Needed when control SWAPS bodies mid-freeze (Tobirama's Edo
// Tensei): the buffer isn't decremented while a cinematic freezes the loop, so a held/buffered press
// from before the freeze would otherwise fire on the new body the instant control resumes.
export function clearInputBuffer(fighter) {
  const b = PLAYER_BUFFERS[fighter?.playerNumber || 1]
  if (b) zeroBuffer(b)
}

export const inputSettings = {
  p1Type: "keyboard",
  p2Type: "keyboard",
  // P3/P4 are CONTROLLER-ONLY (keyboard key-rollover can't support a 3rd/4th scheme).
  // Only consulted by the free-for-all POC; 1v1 modes never read these.
  p3Type: "controller",
  p4Type: "controller"
}
const PLAYER_TYPES = { 1: "p1Type", 2: "p2Type", 3: "p3Type", 4: "p4Type" }

// ─────────────────────────────────────────────────────────────────
// GAMEPAD MAPPING
// ─────────────────────────────────────────────────────────────────
// Standard-gamepad / PS5 button indices.
//   X (0)        → light          Square (2)  → heavy
//   Triangle (3) → special        Circle (1)  → BLOCK (dedicated guard button — MK-feel Stage 1c)
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
// CONTROLLER GLYPHS (Part 3 #26) — detect the connected pad's family from its
// navigator.getGamepads() id string and surface matching face-button/shoulder
// glyphs (Xbox A/B/X/Y + LB/RB/LT/RT vs PlayStation ✕/○/□/△ + L1/R1/L2/R2)
// instead of one hardcoded label set. Positions are STANDARD-gamepad indices
// (down=0, right=1, left=2, up=3), so they map correctly across both families.
// ─────────────────────────────────────────────────────────────────
export function getPadType() {
  const gps = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : []
  for (const g of gps) {
    if (!g) continue
    const id = (g.id || "").toLowerCase()
    if (/playstation|dualshock|dualsense|054c|0ce6|09cc/.test(id)) return "playstation"
    if (/xbox|xinput|045e|x-?box|microsoft/.test(id)) return "xbox"
    if (/nintendo|switch|joy-?con|pro controller|057e/.test(id)) return "nintendo"
  }
  // A pad is connected but unrecognized → most PC pads present as XInput/Xbox.
  return gps.some(Boolean) ? "xbox" : "generic"
}
export const PAD_GLYPHS = {
  xbox:        { down: "Ⓐ A", right: "Ⓑ B", left: "Ⓧ X", up: "Ⓨ Y", l1: "LB", r1: "RB", l2: "LT", r2: "RT", label: "Xbox" },
  playstation: { down: "✕ Cross", right: "○ Circle", left: "□ Square", up: "△ Triangle", l1: "L1", r1: "R1", l2: "L2", r2: "R2", label: "PlayStation" },
  nintendo:    { down: "Ⓑ B", right: "Ⓐ A", left: "Ⓨ Y", up: "Ⓧ X", l1: "L", r1: "R", l2: "ZL", r2: "ZR", label: "Switch" },
  generic:     { down: "✕ Cross", right: "○ Circle", left: "□ Square", up: "△ Triangle", l1: "L1", r1: "R1", l2: "L2", r2: "R2", label: "Controller" }
}
export function padGlyphs(type = getPadType()) { return PAD_GLYPHS[type] || PAD_GLYPHS.generic }

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

// Guard the DOM attach so this module is importable in a pure-Node context (unit tests that read the
// shared INPUT_BUFFER_FRAMES / buffer helpers). In the browser `document` exists and behaviour is unchanged.
if (typeof document !== "undefined") {
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
}

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
    // Map CSS pixels → canvas backing pixels. Ratio is 1 when the backing store matches the display
    // (native), and >1 under a UI-scale where the canvas renders at a smaller backing resolution
    // (Part 3 #13). Keeps hitboxes aligned at any scale.
    const sx = rect.width  ? canvas.width  / rect.width  : 1
    const sy = rect.height ? canvas.height / rect.height : 1
    mouse.x = (e.clientX - rect.left) * sx
    mouse.y = (e.clientY - rect.top)  * sy
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
const connectedPads  = []                             // pad.index values, in connection order (from the event)
const padAssignments = { 1: null, 2: null, 3: null, 4: null }   // playerNum → bound gamepad.index (or null)

// How many gamepads are currently connected — the FFA setup screen caps player count
// to (2 keyboard + this many) so no uncontrollable fighter can spawn.
export function getConnectedPadCount() {
  if (connectedPads.length) return connectedPads.length
  const gps = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : []
  return Array.from(gps).filter(Boolean).length
}

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("gamepadconnected", (e) => {
    const i = e.gamepad?.index
    if (i != null && !connectedPads.includes(i)) connectedPads.push(i)
    // AUTO-ACTIVATE the controller device type. getFighterInput() only routes to
    // pollGamepad() when a player's type is "controller"; nothing else flips it, so
    // before this a freshly-plugged pad did NOTHING in play. BUT only do this when NO
    // player is a controller yet: if a slot is ALREADY controller (e.g. PvP defaults P2
    // to controller, or the Settings screen), that slot claims this pad via resolvePadIndex
    // — force-flipping P1 here would STEAL the keyboard player's slot and bind the pad to
    // the wrong fighter (the reported bug). From a cold keyboard/keyboard setup it still
    // flips the first keyboard slot → controller (single-player: the human is P1), so
    // "plug in a pad → it drives a fighter" is preserved. Keyboard-only users never hit this.
    // Scope the guard to P1/P2 only — this auto-activate manages just those two slots, and
    // P3/P4 default to "controller" (FFA controller-only slots), so including them would always
    // short-circuit and the cold keyboard/keyboard → P1 activation would never fire.
    const p1p2Controller = inputSettings.p1Type === "controller" || inputSettings.p2Type === "controller"
    if (!p1p2Controller) {
      if (inputSettings.p1Type !== "controller") inputSettings.p1Type = "controller"
      else if (inputSettings.p2Type !== "controller") inputSettings.p2Type = "controller"
    }
  })
  window.addEventListener("gamepaddisconnected", (e) => {
    const i = e.gamepad?.index
    const at = connectedPads.indexOf(i)
    if (at !== -1) connectedPads.splice(at, 1)
    for (const pn of [1, 2, 3, 4]) if (padAssignments[pn] === i) padAssignments[pn] = null   // free the slot for a re-plug
  })
}

// Resolve the gamepad.index THIS player reads. Keeps an existing binding while that
// pad stays connected; otherwise claims the first connected pad not owned by the other
// player (connection order from the event; falls back to live getGamepads() for pads
// that existed before the listeners registered — gamepadconnected won't re-fire those).
function resolvePadIndex(playerNum, gamepads) {
  // Exclude EVERY other player's bound pad (was just the single "other" player — that
  // only worked for 2 players; the FFA POC needs up to 4 pads bound to distinct slots).
  const taken = new Set()
  // Only a slot that is CURRENTLY a controller reserves its pad. If a slot reverts to keyboard
  // (e.g. PvP restores P1=keyboard after a boot-time auto-activate), its stale binding must NOT
  // keep blocking the real controller player from claiming that pad.
  for (const pn of [1, 2, 3, 4]) if (pn !== playerNum && padAssignments[pn] != null && inputSettings[PLAYER_TYPES[pn]] === "controller") taken.add(padAssignments[pn])
  if (padAssignments[playerNum] != null && connectedPads.includes(padAssignments[playerNum])) {
    return padAssignments[playerNum]
  }
  const order = connectedPads.length
    ? connectedPads
    : Array.from(gamepads).filter(Boolean).map(g => g.index)
  for (const idx of order) {
    if (!taken.has(idx)) { padAssignments[playerNum] = idx; return idx }
  }
  padAssignments[playerNum] = null
  return null
}

// Resolve the live Gamepad object bound to a player, by gamepad.index (never array slot) via
// resolvePadIndex — the SINGLE source of pad↔player binding, collision-free for up to 4 pads.
// Exported so game.js's edge detector (updateGamepadEdges) binds pads the SAME way pollGamepad
// does, instead of the old gamepads[0]/[1] array-position guess that only ever worked for P1/P2.
export function getPlayerGamepad(playerNum) {
  // A player reads a pad ONLY while its device type is "controller" — a keyboard slot must never
  // claim or hold a pad (so pad↔player binding stays confined to the actual controller slots).
  if (inputSettings[PLAYER_TYPES[playerNum]] !== "controller") return null
  const gamepads = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : []
  const assignedIdx = resolvePadIndex(playerNum, gamepads)
  if (assignedIdx == null) return null
  return gamepads[assignedIdx] || Array.from(gamepads).find(g => g && g.index === assignedIdx) || null
}

// ─────────────────────────────────────────────────────────────────
// MENU NAVIGATION VIA GAMEPAD
// ─────────────────────────────────────────────────────────────────
// The in-battle pollGamepad() only runs once a fighter exists and its device type is
// "controller" — so on the HOME/title + every menu screen a controller did NOTHING
// (menus are mouse-hover + click driven; nothing polled the pad). This reads the FIRST
// connected pad (menus are a single shared cursor — any pad drives it, regardless of the
// per-player device type, which isn't meaningful outside a match) and returns EDGE- and
// REPEAT-triggered nav intents. game.js maps those onto the existing menu dispatch
// (virtual-cursor click for rect menus, synthetic keys for the keyboard-driven ones), so
// the controller drives the exact same code path a mouse/keyboard does.
const _menuNav = { dir: null, held: 0, btnPrev: Object.create(null) }
const MENU_REPEAT_DELAY = 22   // frames a direction must be held before it auto-repeats
const MENU_REPEAT_RATE  = 7    // frames between auto-repeats while held

function firstConnectedPad() {
  const gps = (typeof navigator !== "undefined" && navigator.getGamepads) ? navigator.getGamepads() : []
  for (const g of gps) if (g) return g
  return null
}

export function pollMenuGamepad() {
  const gp = firstConnectedPad()
  if (!gp) return null
  const btn = (i) => !!gp.buttons[i]?.pressed
  const axX = gp.axes[PS5_MAP.ANALOG_L_X] || 0
  const axY = gp.axes[PS5_MAP.ANALOG_L_Y] || 0

  const up    = btn(PS5_MAP.UP)    || axY < -STICK_DEADZONE
  const down  = btn(PS5_MAP.DOWN)  || axY >  STICK_DEADZONE
  const left  = btn(PS5_MAP.LEFT)  || axX < -STICK_DEADZONE
  const right = btn(PS5_MAP.RIGHT) || axX >  STICK_DEADZONE

  // ONE active direction (up beats down beats left beats right). Fires on the initial press,
  // then again on a slow auto-repeat cadence while held — so a held stick scrolls a long list.
  const curDir = up ? "up" : down ? "down" : left ? "left" : right ? "right" : null
  let dir = null
  if (curDir) {
    if (curDir !== _menuNav.dir) { _menuNav.dir = curDir; _menuNav.held = 0; dir = curDir }
    else if (++_menuNav.held >= MENU_REPEAT_DELAY && (_menuNav.held - MENU_REPEAT_DELAY) % MENU_REPEAT_RATE === 0) dir = curDir
  } else { _menuNav.dir = null; _menuNav.held = 0 }

  // Face/menu buttons are pure EDGE triggers (fire once per press). PlayStation convention:
  // Cross (0) = confirm, Circle (1) = back/cancel, Options (9) = start/pause.
  const edge = (name, idx) => { const now = btn(idx); const was = _menuNav.btnPrev[name]; _menuNav.btnPrev[name] = now; return now && !was }
  const confirm = edge("confirm", PS5_MAP.X)
  const back    = edge("back",    PS5_MAP.CIRCLE)
  const start   = edge("start",   9)

  return {
    up: dir === "up", down: dir === "down", left: dir === "left", right: dir === "right",
    dir, confirm, back, start,
    any: !!dir || confirm || back || start
  }
}

function pollGamepad(playerNum, buffer) {
  const gp = getPlayerGamepad(playerNum)
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
    charge:   btn(PS5_MAP.L2),
    block:    btn(PS5_MAP.CIRCLE)         // Circle = dedicated guard (MK-feel Stage 1c; no longer on Down)
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

  const pn = fighter.playerNumber || 1
  const isP1 = pn === 1
  // Players 1-4 (3/4 exist only in the FFA POC). Falls back to P2's slot for any
  // unexpected number so 1v1 (pn 1/2) behaves EXACTLY as before.
  const buffer = PLAYER_BUFFERS[pn] || p2Buffer
  const type = inputSettings[PLAYER_TYPES[pn] || "p2Type"]
  const ctrl = fighter.controls
  if (pn === 1 || pn === 2) inputCallCount[pn]++

  updateBuffer(buffer)

  // 1. Controller — SKIPPED for AI-driven fighters (FFA AI-fill): the CPU writes its intent
  // into this fighter's synthetic keyboard binds via applyAIInputToKeys, so it must read the
  // keyboard/buffer path below, never a physical pad that happens to be bound to this slot's
  // player number. (1v1 P1/P2 never set _aiControlled → this branch is unchanged for them.)
  if (type === "controller" && !fighter._aiControlled) {
    const gpInput = pollGamepad(pn, buffer)
    if (gpInput) return gpInput
  }

  // 2. Keyboard buffering
  if (keys[ctrl.light]) buffer.light = BUFFER_WINDOW
  if (keys[ctrl.heavy]) buffer.heavy = BUFFER_WINDOW
  if (keys[ctrl.upAttack]) buffer.upAttack = BUFFER_WINDOW    // dedicated I = up-attack/launcher
  if (keys[ctrl.special]) buffer.special = BUFFER_WINDOW
  if (keys[ctrl.ultimate]) buffer.ultimate = BUFFER_WINDOW
  // Up + Special (simultaneous) = a GROUNDED up-special — the up does NOT jump. Mirrors the existing
  // "up + attack = launcher (no jump)" rule so a direction-branched Up special (Yuji's Cursed-Energy
  // Pillar) is reachable on keyboard, where `up` is otherwise bound to jump. Jump-then-air-special
  // (non-simultaneous) is unaffected. Also exposes `up` (previously absent from the keyboard output)
  // so betaHeldDirFromInput can resolve the "U" direction — parity with the gamepad path.
  const doingUpSpecial = !!(keys[ctrl.up] && keys[ctrl.special])
  if ((keys[ctrl.jump] || keys[ctrl.up]) && !doingUpSpecial) buffer.jump = BUFFER_WINDOW

  // 3. Unified output
  return {
    left: !!keys[ctrl.left],
    right: !!keys[ctrl.right],
    down: !!keys[ctrl.down],
    up: !!keys[ctrl.up],
    jump: buffer.jump > 0,
    light: buffer.light > 0,
    heavy: buffer.heavy > 0,
    upAttack: buffer.upAttack > 0,
    special: buffer.special > 0,
    ultimate: buffer.ultimate > 0,
    dash: !!keys[ctrl.dash],                  // unbound key ("") → always false; dash = double-tap
    grab: !!keys[ctrl.grab],
    charge: !!keys[ctrl.charge],
    block: !!keys[ctrl.block]                 // dedicated guard key (MK-feel Stage 1c; Down no longer blocks)
  }
}

// ─────────────────────────────────────────────────────────────────
// REPLAY (Stage 11B) — raw held-control snapshot, SIDE-EFFECT FREE.
// The recorder needs each fighter's currently-held control state WITHOUT the buffering/counter side
// effects of getFighterInput (which advances buffers every call). readRawControls only READS the keys
// map, so it's safe to call an extra time per frame. Bit order for the recorded mask is this field
// order (shared with replay.js). Playback (11C) writes these same fields back into `keys`, so the
// normal buffering pipeline reproduces the exact resolved input.
export const REPLAY_INPUT_FIELDS = ["left", "right", "down", "up", "jump", "light", "heavy", "upAttack", "special", "ultimate", "dash", "grab", "charge", "block"]

export function readRawControls(fighter) {
  if (!fighter || !fighter.controls) return null
  const c = fighter.controls, out = {}
  for (const f of REPLAY_INPUT_FIELDS) out[f] = !!(c[f] && keys[c[f]])   // unbound key ("") → always false
  return out
}

// Playback inverse (Stage 11C): drive `keys` from a decoded raw-input object for a replayed fighter.
export function writeRawControls(fighter, raw) {
  if (!fighter || !fighter.controls || !raw) return
  const c = fighter.controls
  for (const f of REPLAY_INPUT_FIELDS) { const k = c[f]; if (k) keys[k] = !!raw[f] }
}

// ─────────────────────────────────────────────────────────────────
// clearInputBuffers
// Call this on round reset so held keys don't ghost into the new round.
// ─────────────────────────────────────────────────────────────────
export function clearInputBuffers(fighters = []) {
  zeroBuffer(p1Buffer)
  zeroBuffer(p2Buffer)
  zeroBuffer(p3Buffer)
  zeroBuffer(p4Buffer)

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
