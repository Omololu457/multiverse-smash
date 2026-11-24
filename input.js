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

import { squadMaskInput } from './spdSquadMask.js'   // S.P.D. Rangers dial swallow (2026-11-23)
import { PAD_BUTTON, PAD_DPAD, PAD_AXES, PAD_MENU, PAD_GLYPHS } from "./padLayout.js"
import { stickToNumpad, combineStickDpad, numpadToDirs } from "./padStick.js"
import { isFlying } from "./flight.js"
export { PAD_LAYOUT, PAD_BUTTON, PAD_GLYPH_POS, padGlyphFor, padHelpRows } from "./padLayout.js"

export const keys = {}

// ─────────────────────────────────────────────────────────────────
// INPUT BUFFERS
// ─────────────────────────────────────────────────────────────────
// INPUT_BUFFER_FRAMES — the SINGLE shared input-buffer window for the whole roster (combo-flow
// Stage 2). Every buffered action button (light/heavy/upAttack/special/ultimate/jump/dash) is held
// for exactly this many frames after a press, for every player and every character — there is no
// per-character buffering. Tune combo-input leniency game-wide by changing this one number.
// 10 frames ≈ 167ms @ 60fps. ★INVARIANT: this MUST be >= the post-normal recovery lock
// (`attackCooldown = 10`, combat.js:3425). startMove() rejects while attackCooldown > 0, so a buffer
// SHORTER than that lock silently drops a correctly-timed re-press tapped in the first recovery
// frames (proven at 7f: taps on recovery frames 1-2 expired unfired — harness input_buffer_recovery).
// Raised 7→10 to close that gap; a pure-leniency change (no move frame-data / balance is touched).
// Exported so tests/tools read the canon.
export const INPUT_BUFFER_FRAMES = 10
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
  const pn = fighter?.playerNumber || 1
  const b = PLAYER_BUFFERS[pn]
  if (b) zeroBuffer(b)
  _invalidateSnap(pn)   // a cleared buffer must not live on in this frame's snapshot
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
// JUMP ON UP (per player, persisted) — input quick-wins Phase 4.
// ON: Up on the stick/d-pad also jumps (the old behaviour). OFF: only the Jump button (Cross) jumps and Up is
// purely a direction, so up-specials, up-attacks and ↓↓↑ clone summons no longer leap by accident.
// Applies to CONTROLLER input only. Default (no saved choice) = OFF on a pad. The keyboard is unchanged: its
// Up and Jump are the same key, so Up always jumps there.
// ─────────────────────────────────────────────────────────────────
const LS_JUMP_ON_UP = { 1: "ms_jump_on_up_p1", 2: "ms_jump_on_up_p2", 3: "ms_jump_on_up_p3", 4: "ms_jump_on_up_p4" }
function _lsGet(k) { try { return (typeof localStorage !== "undefined") ? localStorage.getItem(k) : null } catch (_) { return null } }
function _lsSet(k, v) { try { if (typeof localStorage !== "undefined") { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v) } } catch (_) {} }
const _jumpOnUpPref = {}   // playerNumber → "on" | "off" (absent = device default)
for (const pn of [1, 2, 3, 4]) { const v = _lsGet(LS_JUMP_ON_UP[pn]); if (v === "on" || v === "off") _jumpOnUpPref[pn] = v }
export const JUMP_ON_UP_PAD_DEFAULT = false
// Whether Up jumps for this player's PAD input.
export function jumpOnUp(playerNum) {
  const v = _jumpOnUpPref[playerNum]
  return v === "on" ? true : v === "off" ? false : JUMP_ON_UP_PAD_DEFAULT
}
export function setJumpOnUp(playerNum, on) {
  if (!LS_JUMP_ON_UP[playerNum]) return
  if (on == null) { delete _jumpOnUpPref[playerNum]; _lsSet(LS_JUMP_ON_UP[playerNum], null); return }
  _jumpOnUpPref[playerNum] = on ? "on" : "off"
  _lsSet(LS_JUMP_ON_UP[playerNum], _jumpOnUpPref[playerNum])
}
export function toggleJumpOnUp(playerNum) { setJumpOnUp(playerNum, !jumpOnUp(playerNum)) }

// ─────────────────────────────────────────────────────────────────
// GAMEPAD MAPPING
// ─────────────────────────────────────────────────────────────────
// PHYSICAL standard-gamepad indices by PlayStation button NAME (Cross = 0, Circle = 1, Square = 2,
// Triangle = 3, L1 = 4, R1 = 5, L2 = 6, R2 = 7, D-pad 12-15). This is NOT the action layout: which button
// does what (Square = Light, Triangle = Heavy, Cross = Jump, Circle = Block, R1 = Special, R2 = Ultimate,
// L1 = Grab, L2 = Charge) lives ONLY in padLayout.js PAD_LAYOUT, and every reader + help screen uses that.
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

export const STICK_DEADZONE = 0.4   // MENU navigation only (pollMenuGamepad). In battle the stick goes through padStick.js.

// IN-BATTLE pad direction (input quick-wins Phase 3): radial deadzone → 8-way angular gate → 8° hysteresis
// → SOCD-cleaned merge with the d-pad, producing ONE numpad direction (1-9, 5 = neutral) per player per frame.
// Every in-battle pad direction reader (pollGamepad, readRawControls, game.js updateGamepadEdges) derives its
// up/down/left/right from this, so they can never disagree. Re-reading within a frame is idempotent (same
// stick → same sector once the hysteresis state has settled), so the three readers may each call it.
const _stickPrev = { 1: 5, 2: 5, 3: 5, 4: 5 }   // per-player processed STICK direction (hysteresis state)
const _padNumpad = { 1: 5, 2: 5, 3: 5, 4: 5 }   // per-player final direction (stick + d-pad, SOCD-cleaned)
export function padDirections(playerNum, gp) {
  if (!gp) return { numpad: 5, up: false, down: false, left: false, right: false }
  const ax = gp.axes || []
  const stick = stickToNumpad(ax[PAD_AXES.leftX] || 0, ax[PAD_AXES.leftY] || 0, _stickPrev[playerNum] ?? 5)
  _stickPrev[playerNum] = stick
  const b = i => !!gp.buttons[i]?.pressed
  const numpad = combineStickDpad(stick, { up: b(PAD_DPAD.up), down: b(PAD_DPAD.down), left: b(PAD_DPAD.left), right: b(PAD_DPAD.right) })
  _padNumpad[playerNum] = numpad
  return { numpad, ...numpadToDirs(numpad) }
}
// The numpad direction last resolved for a player's pad (5 when no pad / neutral).
export function getPadNumpad(playerNum) { return _padNumpad[playerNum] ?? 5 }

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
export { PAD_GLYPHS }   // glyph sets live in padLayout.js beside the layout they label
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

  // STUCK-KEY GUARD (focus loss). When the window loses focus mid-hold — alt-tab, a notification,
  // clicking outside the canvas, an OS overlay — the browser NEVER delivers the matching `keyup`, so
  // the held key stays `true` in this global map forever. Physics reads keys[controls.left/right] every
  // frame, so the fighter is FORCE-RUN/dashed in that direction indefinitely — and because this map is
  // global (shared by every fighter) and is never rebuilt, it survives round resets AND character swaps
  // (a freshly-picked fighter reads the same stuck key). That is the "infinite dash that follows you onto
  // the next character" bug. Fix: drop every held key the instant focus/visibility is lost. Purely an
  // input-hygiene correction — no gameplay/timing/balance is touched.
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("blur", releaseAllKeys)
    window.addEventListener("pagehide", releaseAllKeys)
    document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAllKeys() })
  }
}

// Release EVERY held key (and any pending mouse click / debug edge). Called on focus/visibility loss so a
// swallowed keyup can't leave a direction (or any input) stuck on. Exported so game.js / the harness can
// invoke it too. Safe to call anytime; a no-op when nothing is held.
export function releaseAllKeys() {
  for (const k in keys) keys[k] = false
  mouse._pendingClick = false
  mouse.clicked = false
  f1WasDown = false
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
  const axX = gp.axes[PAD_AXES.leftX] || 0
  const axY = gp.axes[PAD_AXES.leftY] || 0

  const up    = btn(PAD_DPAD.up)    || axY < -STICK_DEADZONE
  const down  = btn(PAD_DPAD.down)  || axY >  STICK_DEADZONE
  const left  = btn(PAD_DPAD.left)  || axX < -STICK_DEADZONE
  const right = btn(PAD_DPAD.right) || axX >  STICK_DEADZONE

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
  const confirm = edge("confirm", PAD_MENU.confirm)
  const back    = edge("back",    PAD_MENU.back)
  const start   = edge("start",   PAD_MENU.start)

  return {
    up: dir === "up", down: dir === "down", left: dir === "left", right: dir === "right",
    dir, confirm, back, start,
    any: !!dir || confirm || back || start
  }
}

function pollGamepad(playerNum, buffer, fighter) {
  const gp = getPlayerGamepad(playerNum)
  if (!gp) return null

  const btn  = (i) => !!gp.buttons[i]?.pressed
  const dir = padDirections(playerNum, gp)   // one numpad direction (stick + d-pad, gated + SOCD-cleaned)
  const upHeld = dir.up, downHeld = dir.down, leftHeld = dir.left, rightHeld = dir.right

  // Pad → canonical actions, from padLayout.js PAD_LAYOUT (the single source of truth; full keyboard parity).
  //   Up + attack = grounded up-attack/launcher (the Jump button alone stays jump → no collision).
  // Dash (double-tap d-pad) + the Charge tap-toggle are edge-detected in
  // game.js updateGamepadEdges; here we only read held/buffered state.
  const lightBtn = btn(PAD_BUTTON.light)
  const heavyBtn = btn(PAD_BUTTON.heavy)
  const doingUpAttack = upHeld && (lightBtn || heavyBtn)

  const jumpBtn = btn(PAD_BUTTON.jump)
  // JUMP ON UP (per-player setting, default OFF on a pad) + the CLONE-SUMMON JUMP GRACE mirrored from the
  // keyboard path below (same _recentCloneSummonMotion test: a fresh ↓↓↑ withholds the jump its trailing Up
  // would fire). Flying fighters keep Up as "ascend" either way (physics reads the same Up key for both).
  const upJumps = jumpOnUp(playerNum)
  // Up + Special held together = a GROUNDED up-special, the Up does not jump — the keyboard path's
  // doingUpSpecial rule, mirrored (without it a pad's Up kept re-arming a buffered jump that fired on release).
  const doingUpSpecial = upHeld && btn(PAD_BUTTON.special)
  const summonJumpGrace = !!(upHeld && fighter && _recentCloneSummonMotion(fighter))
  const flying = !!(fighter && (fighter._flightActive || isFlying(fighter)))
  if (jumpBtn) buffer.jump = BUFFER_WINDOW                 // the Jump button always jumps
  if (doingUpAttack) {
    buffer.upAttack = BUFFER_WINDOW                        // up + attack = launcher (the up does NOT jump)
  } else {
    if (lightBtn) buffer.light = BUFFER_WINDOW
    if (heavyBtn) buffer.heavy = BUFFER_WINDOW
    if (upHeld && upJumps && !doingUpSpecial && !summonJumpGrace) buffer.jump = BUFFER_WINDOW   // up alone = jump (when enabled)
  }
  // Withhold the physics Up key (mapInputToVirtualKeys) when Up must not jump: during the summon grace (unless
  // Jump is physically held), or with Jump-on-Up OFF (unless a real Jump-button press is buffered).
  const noJumpUp = upHeld && !flying && (((doingUpSpecial || summonJumpGrace) && !jumpBtn) || (!upJumps && !(buffer.jump > 0)))
  if (btn(PAD_BUTTON.special))  buffer.special  = BUFFER_WINDOW
  if (btn(PAD_BUTTON.ultimate)) buffer.ultimate = BUFFER_WINDOW

  return {
    _noJumpUp: noJumpUp,
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
    grab:     btn(PAD_BUTTON.grab),
    charge:   btn(PAD_BUTTON.charge),
    block:    btn(PAD_BUTTON.block)       // dedicated guard button (MK-feel Stage 1c; no longer on Down)
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

// LOGIC-FRAME CLOCK. game.js calls beginInputFrame() exactly once per simulated battle frame
// (updateBattle / updateFFABattle, after the freeze early-returns). Diagnostic trace: when a harness sets
// globalThis.__inputTrace = [], every getFighterInput call appends one row (frame, player, stun state,
// caller) so call counts per fighter per frame can be MEASURED. Inert (one undefined check) otherwise.
let _inputFrame = 0
export function beginInputFrame() { _inputFrame++ }
export function currentInputFrame() { return _inputFrame }
function _traceInputCall(fighter, pn, consumed, snap) {
  const t = globalThis.__inputTrace
  if (!Array.isArray(t)) return
  const line = (new Error().stack || "").split("\n")[3] || ""
  const c = fighter.controls || {}
  t.push({ frame: _inputFrame, pn, rk: fighter.rosterKey, hs: fighter.hitstun | 0, bs: fighter.blockstun | 0,
    kd: !!(fighter.knockdownState || (fighter.knockdownTimer | 0) > 0), consumed,
    light: !!snap?.light, special: !!snap?.special, rawLight: !!(c.light && keys[c.light]),
    caller: (line.match(/:(\d+):\d+\)?$/) || [])[1] || line.trim() })
}

// PER-FRAME INPUT SNAPSHOT (fixes the "double buffer drain"). Resolving a fighter's input ADVANCES its
// buffers by one frame, and the game used to resolve it 2-4x per fighter per frame (movement, combat body,
// the hitstun/blockstun reversal checks), so INPUT_BUFFER_FRAMES = 10 really lasted ~5 frames (~2.5 for
// Green Arrow's reversal). Now the FIRST getFighterInput() call for a player in a logic frame resolves the
// input ONCE (decrement + poll + stamp) and stores an immutable snapshot; every later call in that frame
// returns a fresh COPY of that snapshot and never touches the buffers. Callers may still mutate the object
// they get (Obito/Krybot/Mr. Incredible neutralize fields locally) without affecting anyone else.
// Before the frame clock has ever started (_inputFrame === 0, i.e. pure-Node unit tests that call
// getFighterInput once per simulated frame), each call is its own frame, exactly as before.
const _frameSnap = { 1: null, 2: null, 3: null, 4: null }   // playerNumber → { frame, fighter, snap(frozen) }
function _invalidateSnap(pn) { if (pn in _frameSnap) _frameSnap[pn] = null }
function _cachedSnap(fighter, pn) {
  const c = _frameSnap[pn]
  return (_inputFrame > 0 && c && c.frame === _inputFrame && c.fighter === fighter) ? c.snap : null
}

// NON-CONSUMING read for code that runs OUTSIDE the logic frame (keydown handlers): this frame's snapshot
// if it has been resolved, otherwise the side-effect-free held-control read. Never advances a buffer.
export function peekFighterInput(fighter) {
  if (!fighter) return null
  const snap = _cachedSnap(fighter, fighter.playerNumber || 1)
  return snap ? { ...snap } : readRawControls(fighter)
}

// CLONE-SUMMON JUMP GRACE helper: true when the fighter's motion buffer FRESHLY ends with the ↓↓↑
// cloneSummon shape (cardinal D,D,U within its 800ms window). Only Naruto-universe clone chars ever
// populate motionHistory (recordMotionInput early-returns for everyone else), and AI-driven fighters
// write keys directly (no keydown → no motionHistory) — so this is inert for every other char and for
// the determinism AI-vs-AI path. Used to withhold the jump that the motion's trailing UP would fire,
// giving the natural "↓↓↑ then Special" input time to land without leaping.
function _recentCloneSummonMotion(fighter) {
  const h = fighter.motionHistory
  if (!h || h.length < 3) return false
  const last3 = h.slice(-3)
  const now = (typeof performance !== "undefined" ? performance.now() : Date.now())
  if (now - (last3[0].time || 0) > 800) return false
  return last3[0].dir === "D" && last3[1].dir === "D" && last3[2].dir === "U"
}

// S.P.D. Rangers dial: the called Ranger's button stays swallowed until released (spdSquadMask.js; no-op for everyone else)
export function getFighterInput(fighter) {
  const out = _getFighterInput(fighter)
  if (!fighter?._squadEat || !out) return out
  const raw = _readRawControls(fighter) || out, eaten = Object.keys(fighter._squadEat)
  const buf = PLAYER_BUFFERS[fighter.playerNumber || 1]
  if (buf) for (const b of eaten) if (b in buf) buf[b] = 0   // a buffered copy of the pick press must not fire after release
  return squadMaskInput(fighter, out, raw)
}
function _getFighterInput(fighter) {
  if (!fighter) return null
  const pn = fighter.playerNumber || 1
  if (pn === 1 || pn === 2) inputCallCount[pn]++
  const cached = _cachedSnap(fighter, pn)
  if (cached) { _traceInputCall(fighter, pn, false, cached); return { ...cached } }   // READ: no buffer advance
  const snap = _resolveFighterInput(fighter, pn)                                     // CONSUME: once per frame
  if (_inputFrame > 0) _frameSnap[pn] = { frame: _inputFrame, fighter, snap: Object.freeze({ ...snap }) }
  _traceInputCall(fighter, pn, true, snap)
  return snap
}

// The ONLY place buffers advance: decrement, poll pad/keys, stamp. Called at most once per player per frame.
function _resolveFighterInput(fighter, pn) {
  const isP1 = pn === 1
  // Players 1-4 (3/4 exist only in the FFA POC). Falls back to P2's slot for any
  // unexpected number so 1v1 (pn 1/2) behaves EXACTLY as before.
  const buffer = PLAYER_BUFFERS[pn] || p2Buffer
  const type = inputSettings[PLAYER_TYPES[pn] || "p2Type"]
  const ctrl = fighter.controls

  updateBuffer(buffer)

  // 1. Controller — SKIPPED for AI-driven fighters (FFA AI-fill): the CPU writes its intent
  // into this fighter's synthetic keyboard binds via applyAIInputToKeys, so it must read the
  // keyboard/buffer path below, never a physical pad that happens to be bound to this slot's
  // player number. (1v1 P1/P2 never set _aiControlled → this branch is unchanged for them.)
  if (type === "controller" && !fighter._aiControlled && !fighter._kevinRemoteInput && !fighter._krybotRemoteInput && !fighter._spdBlueRemoteInput && !fighter._spdGreenRemoteInput && !fighter._dashParrRemoteInput && !fighter._spdPinkRemoteInput && !fighter._mmprBlackRemoteInput && !fighter._greenRangerRemoteInput && !fighter._mmprWhiteRemoteInput && !fighter._mmprPinkRemoteInput && !fighter._spdYellowRemoteInput && !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput && !fighter._starfireRemoteInput && !fighter._robinRemoteInput && !fighter._megumiRemoteInput && !fighter._higurumaRemoteInput && !fighter._syndromeRemoteInput && !fighter._dseylRemoteInput && !fighter._frozoneRemoteInput && !fighter._enochRemoteInput && !fighter._batmanRemoteInput && !fighter._mrRemoteInput && !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && !fighter._nsrRemoteInput && !fighter._gsRemoteInput && !fighter._invRemoteInput && !fighter._sksRemoteInput && !fighter._omvRemoteInput) {
    const gpInput = pollGamepad(pn, buffer, fighter)
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
  // CLONE SUMMON: the ↓↓↑ motion ends in UP (= jump). While that fresh motion is buffered and up is held,
  // withhold the jump so the follow-up Special (pressed a few frames later — the natural human input, not a
  // 1-frame simultaneous press) stages the formation GROUNDED instead of leaping. Bounded by the motion's
  // own 800ms window; a normal jump (up with NO preceding ↓↓↑) is unaffected.
  const summonJumpGrace = !!(keys[ctrl.up] && _recentCloneSummonMotion(fighter))
  if ((keys[ctrl.jump] || keys[ctrl.up]) && !doingUpSpecial && !summonJumpGrace) buffer.jump = BUFFER_WINDOW

  // ATTACK-INPUT LOCK: a few-frame window during which attack buttons are swallowed. Generic field set
  // by the Ben 10 Omnitrix morph (↓↓+button) so the slot-select press is NOT also read as an attack/
  // special. Directions, jump, block, grab stay live (movement + the ↓↓ itself must still register).
  const _atkLock = (fighter._attackInputLock | 0) > 0

  // 3. Unified output
  return {
    // `_noJumpUp` tells mapInputToVirtualKeys to withhold the UP vKey (the one physics actually jumps on),
    // not just the buffered jump — covers both the simultaneous up+special AND the ↓↓↑ summon grace.
    _noJumpUp: doingUpSpecial || summonJumpGrace,
    left: !!keys[ctrl.left],
    right: !!keys[ctrl.right],
    down: !!keys[ctrl.down],
    up: !!keys[ctrl.up],
    jump: buffer.jump > 0,
    light: !_atkLock && buffer.light > 0,
    heavy: !_atkLock && buffer.heavy > 0,
    upAttack: !_atkLock && buffer.upAttack > 0,
    special: !_atkLock && buffer.special > 0,
    ultimate: !_atkLock && buffer.ultimate > 0,
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
  const raw = _readRawControls(fighter)
  if (!fighter?._squadEat || !raw) return raw
  return squadMaskInput(fighter, { ...raw }, raw)
}
// unmasked snapshot (the S.P.D. dial reads this one so it can see the swallowed button being released)
export const readRawControlsUnmasked = fighter => _readRawControls(fighter)
function _readRawControls(fighter) {
  if (fighter?.rosterKey === 'kevin_levin' && fighter._kevinRemoteInput && fighter._kevinInjectedRaw) return { ...fighter._kevinInjectedRaw }
  if (fighter?.rosterKey === 'mr_incredible' && fighter._mrRemoteInput && fighter._mrInjectedRaw) return { ...fighter._mrInjectedRaw } // preserve pad Up vs Cross in replay/LAN
  if (!fighter || !fighter.controls) return null
  // Luffy's recovery retaps need actual held buttons, not the buffered controller output. Sanji's, Zoro's and
  // Buggy's command layers (press edges + motions) read this same snapshot, so a pad must feed it too.
  // Reuse this raw snapshot for replay/LAN as well; no extra buffer polling or input parser.
  const pn = fighter.playerNumber || 1
  if ((fighter.rosterKey === 'kevin_levin' || fighter.rosterKey === 'luffy' || fighter.rosterKey === 'spd_blue' || fighter.rosterKey === 'krybot' || fighter.rosterKey === 'sanji' || fighter.rosterKey === 'zoro' || fighter.rosterKey === 'buggy' || fighter.rosterKey === 'spd_red' || fighter.rosterKey === 'spd_green' || fighter.rosterKey === 'dash_parr' || fighter.rosterKey === 'spd_pink' || fighter.rosterKey === 'mmpr_black' || fighter.rosterKey === 'green_ranger' || fighter.rosterKey === 'mmpr_white' || fighter.rosterKey === 'mmpr_pink' || fighter.rosterKey === 'spd_yellow' || fighter.rosterKey === 'cyborg' || fighter.rosterKey === 'beast_boy' || fighter.rosterKey === 'raven' || fighter.rosterKey === 'starfire' || fighter.rosterKey === 'robin' || fighter.rosterKey === 'megumi_fushiguro' || fighter.rosterKey === 'higuruma' || fighter.rosterKey === 'syndrome' || fighter.rosterKey === 'dseyl' || fighter.rosterKey === 'frozone' || fighter.rosterKey === 'enoch' || fighter.rosterKey === 'batman' || fighter.rosterKey === 'mr_incredible' || fighter.rosterKey === 'elastigirl' || fighter.rosterKey === 'ns_blue' || fighter.rosterKey === 'ns_navy' || fighter.rosterKey === 'ns_green' || fighter.rosterKey === 'dt_red' || fighter.rosterKey === 'dt_blue' || fighter.rosterKey === 'dt_yellow' || fighter.rosterKey === 'dt_white' || fighter.rosterKey === 'dinothunder' || fighter.rosterKey === 'ns_red' || fighter.rosterKey === 'ns_yellow' || fighter.rosterKey === 'ninja_storm_rangers' || fighter.rosterKey === 'ninja_storm_cgpt' || fighter.rosterKey === 'gojo_shinjuku' || fighter.rosterKey === 'invincible' || fighter.rosterKey === 'sukuna_shinjuku' || fighter.rosterKey === 'omniman_viltrum') && !fighter._aiControlled && !fighter._kevinRemoteInput && !fighter._krybotRemoteInput && !fighter._spdBlueRemoteInput && !fighter._spdGreenRemoteInput && !fighter._dashParrRemoteInput && !fighter._spdPinkRemoteInput && !fighter._mmprBlackRemoteInput && !fighter._greenRangerRemoteInput && !fighter._mmprWhiteRemoteInput && !fighter._mmprPinkRemoteInput && !fighter._spdYellowRemoteInput && !fighter._cyborgRemoteInput && !fighter._beastBoyRemoteInput && !fighter._ravenRemoteInput && !fighter._starfireRemoteInput && !fighter._robinRemoteInput && !fighter._megumiRemoteInput && !fighter._higurumaRemoteInput && !fighter._syndromeRemoteInput && !fighter._dseylRemoteInput && !fighter._frozoneRemoteInput && !fighter._enochRemoteInput && !fighter._batmanRemoteInput && !fighter._mrRemoteInput && !fighter._elastigirlRemoteInput && !fighter._msv1RemoteInput && !fighter._nsrRemoteInput && !fighter._gsRemoteInput && !fighter._invRemoteInput && !fighter._sksRemoteInput && !fighter._omvRemoteInput && inputSettings[PLAYER_TYPES[pn] || 'p2Type'] === 'controller') {
    const gp = getPlayerGamepad(pn)
    if (gp) {
      const b = i => !!gp.buttons[i]?.pressed, dir = padDirections(pn, gp)
      const up = dir.up
      const light = b(PAD_BUTTON.light), heavy = b(PAD_BUTTON.heavy)
      return { left:dir.left,
        right:dir.right,
        down:dir.down, up,
        jump:b(PAD_BUTTON.jump), light, heavy, upAttack:up&&(light||heavy),
        special:b(PAD_BUTTON.special), ultimate:b(PAD_BUTTON.ultimate), grab:b(PAD_BUTTON.grab),
        charge:b(PAD_BUTTON.charge) || (fighter.rosterKey === 'gojo_shinjuku' && b(11)), block:b(PAD_BUTTON.block), dash:!!fighter._dashTap }
    }
  }
  const c = fighter.controls, out = {}
  for (const f of REPLAY_INPUT_FIELDS) out[f] = !!(c[f] && keys[c[f]])   // unbound key ("") → always false
  out.dash ||= !!fighter._dashTap // preserve resolved double-tap intent in replay / LAN masks
  return out
}

// Playback inverse (Stage 11C): drive `keys` from a decoded raw-input object for a replayed fighter.
export function writeRawControls(fighter, raw) {
  if (fighter?.rosterKey === 'kevin_levin' && raw) fighter._kevinInjectedRaw = Object.fromEntries(REPLAY_INPUT_FIELDS.map(k => [k, !!raw[k]]))
  if (fighter?.rosterKey === 'mr_incredible' && raw) fighter._mrInjectedRaw = Object.fromEntries(REPLAY_INPUT_FIELDS.map(k => [k, !!raw[k]]))
  if (!fighter || !fighter.controls || !raw) return
  const c = fighter.controls
  fighter._dashTap = !!raw.dash
  for (const f of REPLAY_INPUT_FIELDS) { const k = c[f]; if (k) keys[k] = !!raw[f] }
}

// ─────────────────────────────────────────────────────────────────
// clearInputBuffers
// Call this on round reset so held keys don't ghost into the new round.
// ─────────────────────────────────────────────────────────────────
export function clearInputBuffers(fighters = []) {
  for (const pn of [1, 2, 3, 4]) _invalidateSnap(pn)
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
