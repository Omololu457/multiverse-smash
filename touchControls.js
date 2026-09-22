// touchControls.js — on-screen touch overlay for tablet/phone play (CoD-Mobile-style layout).
//
// STRICTLY ADDITIVE / OPT-IN. This does NOT build a second input system: every on-screen zone dispatches a
// SYNTHETIC KeyboardEvent (keydown on touchstart, keyup on touchend) for the SAME physical key the keyboard
// would send. Those events flow through the exact same document/window key listeners — so they set the same
// global `keys[]` map AND drive the same keydown-event handlers (double-tap dash, command motions, ultimate,
// toggles). Downstream (combat, combos, buffering) cannot tell touch from keyboard.
//
// It only renders / intercepts when touch mode is active AND a battle is on screen. When off (the default on
// a desktop with no touch), no listener does anything and nothing is drawn → zero impact on keyboard / mouse
// / gamepad play.
//
// LAYOUT (tuned for iPad-size screens → big, comfortable targets):
//   • LEFT  = an 8-way virtual joystick → left/right + up(jump)/down(crouch). Because a flick past the
//     dead-zone fires keydown and releasing fires keyup, DOUBLE-TAPPING a direction reproduces the keyboard's
//     double-tap-to-DASH exactly; holding = walk; a diagonal presses both keys (e.g. jump-forward).
//   • RIGHT = large tap buttons: Light, Heavy, Special, Ultimate, Block, Grab, Charge, Up-Attack. Holding a
//     direction on the joystick while tapping Special gives the keyboard's directional-special convention.

let _canvas = null
let _getControls = () => ({})     // returns the live P1 control map (respects rebinds)
let _inBattle = () => false        // true only while a battle is on screen
let _mode = "auto"                 // "auto" | "on" | "off"
let _hasTouch = false

const STORE_KEY = "ms_touch_controls"
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// action id → field in the control map (identical names, so controls[id] is the physical key).
const BUTTON_IDS = ["light", "heavy", "special", "ultimate", "block", "grab", "charge", "upAttack"]
const BUTTON_LABEL = { light: "LT", heavy: "HV", special: "SP", ultimate: "ULT", block: "BLK", grab: "GRB", charge: "CHG", upAttack: "UP" }
const DIRS = ["left", "right", "up", "down"]

// active touches: identifier → { kind:"joystick"|"button", dirs?:Set<string>, id?, key?, cx?, cy? }
const _touches = new Map()
let _joyId = null                  // identifier of the touch currently owning the joystick (one at a time)

// ── SYNTHETIC KEY DISPATCH (the whole point: reuse the keyboard pipeline) ──────
function _press(key)   { if (key && typeof document !== "undefined") document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })) }
function _release(key) { if (key && typeof document !== "undefined") document.dispatchEvent(new KeyboardEvent("keyup",   { key, bubbles: true })) }

// ── ENABLE / SETTINGS ─────────────────────────────────────────────────────────
function _load() { try { const v = localStorage.getItem(STORE_KEY); if (v === "on" || v === "off" || v === "auto") _mode = v } catch {} }
function _save() { try { localStorage.setItem(STORE_KEY, _mode) } catch {} }

export function setMode(mode) { _mode = (mode === "on" || mode === "off") ? mode : "auto"; _save(); _applyCanvasTouchAction(); return _mode }
export function getMode() { return _mode }
export function cycleMode() { setMode(_mode === "auto" ? "on" : _mode === "on" ? "off" : "auto"); return _mode }
export function hasTouch() { return _hasTouch }

// Resolved on/off: explicit ON, explicit OFF, or AUTO (on iff the device reports touch capability).
export function isActive() { return _mode === "on" || (_mode === "auto" && _hasTouch) }
// Whether to render + intercept right now (also requires a battle on screen).
export function shouldShow() { return isActive() && _inBattle() }

function _applyCanvasTouchAction() {
  if (_canvas && _canvas.style) _canvas.style.touchAction = isActive() ? "none" : ""   // stop browser scroll/zoom gestures while playing
}

// ── LAYOUT (canvas backing-pixel coords; responsive to size) ───────────────────
export function getLayout(canvas = _canvas) {
  const W = canvas ? canvas.width : 1280, H = canvas ? canvas.height : 720
  const R  = clamp(Math.min(W, H) * 0.155, 82, 132)                       // joystick radius (big)
  const jx = Math.round(R + W * 0.035), jy = Math.round(H - R - H * 0.06) // bottom-left
  const BR = clamp(Math.min(W, H) * 0.076, 46, 68)                        // button radius (big)
  const dx = Math.round(W - BR * 3.5), dy = Math.round(H - BR * 3.1)      // attack-diamond center (bottom-right)
  const g  = BR * 1.7
  const buttons = [
    { id: "special",  cx: dx,          cy: dy - g },       // ◇ top
    { id: "heavy",    cx: dx + g,      cy: dy },           // ◇ right
    { id: "light",    cx: dx,          cy: dy + g },       // ◇ bottom (thumb rest)
    { id: "upAttack", cx: dx - g,      cy: dy },           // ◇ left
    { id: "block",    cx: dx - g * 1.15, cy: dy - g * 2.35 }, // utility strip above the diamond
    { id: "grab",     cx: dx,            cy: dy - g * 2.75 },
    { id: "ultimate", cx: dx + g * 1.15, cy: dy - g * 2.35 },
    { id: "charge",   cx: dx - g * 2.35, cy: dy - g * 0.2 },  // lower-left of the cluster
  ].map((b) => ({ ...b, r: BR, label: BUTTON_LABEL[b.id] }))
  return { joystick: { cx: jx, cy: jy, r: R, dead: R * 0.30 }, buttons }
}

function _dirsAt(x, y, joy) {
  const ox = x - joy.cx, oy = y - joy.cy, out = new Set()
  if (ox < -joy.dead) out.add("left"); else if (ox > joy.dead) out.add("right")
  if (oy < -joy.dead) out.add("up");   else if (oy > joy.dead) out.add("down")
  return out
}

// ── TOUCH APPLICATION (shared by the real DOM listeners and the test hooks) ────
// pts: [{ identifier, cx, cy }] in CANVAS coords.
function _onStart(pts) {
  if (!shouldShow()) return
  const L = getLayout(), c = _getControls() || {}
  for (const p of pts) {
    const dxj = p.cx - L.joystick.cx, dyj = p.cy - L.joystick.cy
    if (_joyId == null && Math.hypot(dxj, dyj) <= L.joystick.r * 1.35) {
      const dirs = _dirsAt(p.cx, p.cy, L.joystick)
      for (const d of dirs) _press(c[d])
      _touches.set(p.identifier, { kind: "joystick", dirs, cx: p.cx, cy: p.cy })
      _joyId = p.identifier
      continue
    }
    const b = L.buttons.find((b) => Math.hypot(p.cx - b.cx, p.cy - b.cy) <= b.r)
    if (b) { const key = c[b.id]; _press(key); _touches.set(p.identifier, { kind: "button", id: b.id, key }) }
  }
}

function _onMove(pts) {
  const L = getLayout(), c = _getControls() || {}
  for (const p of pts) {
    const rec = _touches.get(p.identifier)
    if (!rec || rec.kind !== "joystick") continue
    const dirs = _dirsAt(p.cx, p.cy, L.joystick)
    for (const d of rec.dirs) if (!dirs.has(d)) _release(c[d])   // left a direction
    for (const d of dirs) if (!rec.dirs.has(d)) _press(c[d])     // entered a direction
    rec.dirs = dirs; rec.cx = p.cx; rec.cy = p.cy
  }
}

function _onEnd(pts) {
  const c = _getControls() || {}
  for (const p of pts) {
    const rec = _touches.get(p.identifier)
    if (!rec) continue
    if (rec.kind === "joystick") { for (const d of rec.dirs) _release(c[d]); if (_joyId === p.identifier) _joyId = null }
    else _release(rec.key)
    _touches.delete(p.identifier)
  }
}

// Release everything (parity with the keyboard stuck-key guard on blur / mode-off).
export function releaseAll() {
  const c = _getControls() || {}
  for (const rec of _touches.values()) {
    if (rec.kind === "joystick") { for (const d of rec.dirs) _release(c[d]) }
    else _release(rec.key)
  }
  _touches.clear(); _joyId = null
}

// ── SETUP (attach DOM listeners once) ──────────────────────────────────────────
export function setup(canvas, { getControls, inBattle } = {}) {
  _canvas = canvas
  if (typeof getControls === "function") _getControls = getControls
  if (typeof inBattle === "function") _inBattle = inBattle
  _hasTouch = (typeof window !== "undefined") && (("ontouchstart" in window) || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0))
  _load()
  _applyCanvasTouchAction()

  if (!canvas || !canvas.addEventListener) return
  const rectPts = (touchList) => {
    const rect = canvas.getBoundingClientRect()
    const sx = rect.width ? canvas.width / rect.width : 1
    const sy = rect.height ? canvas.height / rect.height : 1
    return Array.from(touchList).map((t) => ({ identifier: t.identifier, cx: (t.clientX - rect.left) * sx, cy: (t.clientY - rect.top) * sy }))
  }
  canvas.addEventListener("touchstart", (e) => { if (!shouldShow()) return; e.preventDefault(); _onStart(rectPts(e.changedTouches)) }, { passive: false })
  canvas.addEventListener("touchmove",  (e) => { if (!_touches.size) return; e.preventDefault(); _onMove(rectPts(e.changedTouches)) }, { passive: false })
  canvas.addEventListener("touchend",   (e) => { if (!_touches.size) return; e.preventDefault(); _onEnd(rectPts(e.changedTouches)) }, { passive: false })
  canvas.addEventListener("touchcancel",(e) => { if (!_touches.size) return; _onEnd(rectPts(e.changedTouches)) }, { passive: false })
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("blur", releaseAll)
    document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAll() })
  }
}

// ── RENDER ──────────────────────────────────────────────────────────────────
export function draw(ctx, canvas = _canvas) {
  if (!ctx || !shouldShow()) return
  const L = getLayout(canvas)
  const pressedButtons = new Set(), activeDirs = new Set()
  for (const rec of _touches.values()) { if (rec.kind === "button") pressedButtons.add(rec.id); else rec.dirs.forEach((d) => activeDirs.add(d)) }

  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineWidth = 3

  // Joystick base
  const j = L.joystick
  ctx.globalAlpha = 0.28; ctx.fillStyle = "#0a1420"; ctx.beginPath(); ctx.arc(j.cx, j.cy, j.r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.55; ctx.strokeStyle = "#7fb6ff"; ctx.beginPath(); ctx.arc(j.cx, j.cy, j.r, 0, Math.PI * 2); ctx.stroke()
  // direction ticks (highlight active)
  const tick = [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]]
  for (const [d, ux, uy] of tick) {
    ctx.globalAlpha = activeDirs.has(d) ? 0.95 : 0.4
    ctx.fillStyle = activeDirs.has(d) ? "#8ff0c8" : "#9fc4ff"
    ctx.font = `700 ${Math.round(j.r * 0.34)}px Arial`
    ctx.fillText(d === "up" ? "▲" : d === "down" ? "▼" : d === "left" ? "◀" : "▶", j.cx + ux * j.r * 0.66, j.cy + uy * j.r * 0.66)
  }
  // thumb knob at current joystick touch (clamped inside the base)
  let kx = j.cx, ky = j.cy
  for (const rec of _touches.values()) if (rec.kind === "joystick") {
    const ox = rec.cx - j.cx, oy = rec.cy - j.cy, m = Math.hypot(ox, oy) || 1, cl = Math.min(m, j.r * 0.7)
    kx = j.cx + (ox / m) * cl; ky = j.cy + (oy / m) * cl
  }
  ctx.globalAlpha = 0.6; ctx.fillStyle = activeDirs.size ? "#8ff0c8" : "#cfe2ff"
  ctx.beginPath(); ctx.arc(kx, ky, j.r * 0.34, 0, Math.PI * 2); ctx.fill()

  // Buttons
  for (const b of L.buttons) {
    const on = pressedButtons.has(b.id)
    ctx.globalAlpha = on ? 0.9 : 0.34; ctx.fillStyle = on ? "#1f6f4a" : "#101c2a"
    ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = on ? 1 : 0.6; ctx.strokeStyle = on ? "#8ff0c8" : "#8fb4e0"
    ctx.beginPath(); ctx.arc(b.cx, b.cy, b.r, 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 0.95; ctx.fillStyle = "#e8f4ff"; ctx.font = `800 ${Math.round(b.r * 0.5)}px Arial`
    ctx.fillText(b.label, b.cx, b.cy)
  }
  ctx.restore()
}

// ── TEST HOOKS (harness) — run the SAME start/move/end logic with canvas coords ─
export const _test = {
  start: (id, cx, cy) => _onStart([{ identifier: id, cx, cy }]),
  move:  (id, cx, cy) => _onMove([{ identifier: id, cx, cy }]),
  end:   (id) => { const r = _touches.get(id); _onEnd([{ identifier: id, cx: r ? r.cx : 0, cy: r ? r.cy : 0 }]) },
  // tap a button by its action id (start+end at its center)
  tapButton: (btnId) => { const b = getLayout().buttons.find((b) => b.id === btnId); if (!b) return false; _onStart([{ identifier: 9001, cx: b.cx, cy: b.cy }]); _onEnd([{ identifier: 9001, cx: b.cx, cy: b.cy }]); return true },
  buttonCenter: (btnId) => { const b = getLayout().buttons.find((b) => b.id === btnId); return b ? { cx: b.cx, cy: b.cy } : null },
  joyPoint: (dir) => { const j = getLayout().joystick; const m = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] || [0, 0]; return { cx: j.cx + m[0] * j.r * 0.8, cy: j.cy + m[1] * j.r * 0.8 } },
  activeCount: () => _touches.size,
}
