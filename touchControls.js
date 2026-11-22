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
// LAYOUT — a FIGHTING-GAME PAD (2026-11-22, user: "turn it into a fighting game pad… only the D-pad, no joystick"):
//   • LEFT  = a plus-shaped 8-way D-PAD (no joystick). Thumb on an arm = that direction; on a corner = the
//     diagonal (both keys, e.g. jump-forward); rolling the thumb across it gives motion inputs (↓↘→). Lifting
//     and re-pressing a direction quickly = the keyboard's double-tap DASH. Holding = walk.
//   • RIGHT = raised ARCADE buttons in two staggered rows of three (thumb row: LIGHT · HEAVY · SPECIAL; top row:
//     UP-ATTACK · GRAB · ULT) + two shoulder buttons (BLOCK · CHARGE). Hold a D-pad direction while tapping
//     SPECIAL for the directional-special convention. Same keys as the keyboard → characters' moves unchanged.

let _canvas = null
let _getControls = () => ({})     // returns the live P1 control map (respects rebinds)
let _inBattle = () => false        // true only while a battle is on screen
let _mode = "auto"                 // "auto" | "on" | "off"
let _hasTouch = false

const STORE_KEY = "ms_touch_controls"
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

// action id → field in the control map (identical names, so controls[id] is the physical key).
const BUTTON_IDS = ["light", "heavy", "special", "ultimate", "block", "grab", "charge", "upAttack"]
const BUTTON_LABEL = { light: "LIGHT", heavy: "HEAVY", special: "SPECIAL", ultimate: "ULT", block: "BLOCK", grab: "GRAB", charge: "CHARGE", upAttack: "UP ATK" }
// arcade cap colours per button
const BUTTON_COLOR = { light: "#3b82f6", heavy: "#ef4444", special: "#facc15", upAttack: "#22c55e", grab: "#e5e7eb", ultimate: "#f97316", block: "#64748b", charge: "#06b6d4" }
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
  const W = canvas ? canvas.width : 1280, H = canvas ? canvas.height : 720, m = Math.min(W, H)
  // D-PAD (bottom-left): r = arm length from the centre; arm = arm thickness; dead = centre hub (no direction).
  const S = clamp(m * 0.17, 64, 128)
  const dpad = { cx: Math.round(S * 1.3 + W * 0.03), cy: Math.round(H - S * 1.3 - H * 0.04), r: S, arm: S * 0.64, dead: S * 0.2 }
  // ARCADE BUTTONS (bottom-right): two staggered rows of three, arcade curve (the left column sits a bit lower).
  const BR = clamp(m * 0.085, 34, 66), colGap = BR * 2.35, rowGap = BR * 2.3
  const x0 = W - BR * 1.45 - colGap * 2 - W * 0.02, yBottom = H - BR * 1.5 - H * 0.04
  const curve = [BR * 0.5, 0, BR * 0.1]
  const at = (col, row) => ({ cx: Math.round(x0 + col * colGap), cy: Math.round(yBottom - row * rowGap + curve[col]) })
  const buttons = [
    { id: "light",    ...at(0, 0) }, { id: "heavy", ...at(1, 0) }, { id: "special",  ...at(2, 0) },   // thumb row
    { id: "upAttack", ...at(0, 1) }, { id: "grab",  ...at(1, 1) }, { id: "ultimate", ...at(2, 1) },   // top row
  ].map((b) => ({ ...b, r: BR, shape: "round" }))
  // SHOULDER buttons: pills above the top row (BLOCK over the left pair, CHARGE over the right pair).
  const pw = BR * 2.6, ph = BR * 1.05, sy = Math.round(yBottom - rowGap * 2 - BR * 0.3)
  buttons.push({ id: "block",  cx: Math.round(x0 + colGap * 0.5),  cy: sy, r: ph / 2, w: pw, h: ph, shape: "pill" })
  buttons.push({ id: "charge", cx: Math.round(x0 + colGap * 1.75), cy: sy, r: ph / 2, w: pw, h: ph, shape: "pill" })
  for (const b of buttons) { b.label = BUTTON_LABEL[b.id]; b.color = BUTTON_COLOR[b.id] }
  // `joystick` kept as an alias of the D-pad for older callers.
  return { dpad, joystick: dpad, buttons }
}

// Is canvas point (x, y) on button b? Slightly generous (fingers are bigger than the art).
function _hitButton(b, x, y) {
  if (b.shape === "pill") return Math.abs(x - b.cx) <= b.w / 2 + 8 && Math.abs(y - b.cy) <= b.h / 2 + 8
  return Math.hypot(x - b.cx, y - b.cy) <= b.r * 1.12
}
function _onDpad(x, y, d) { return Math.abs(x - d.cx) <= d.r * 1.3 && Math.abs(y - d.cy) <= d.r * 1.3 }

// 8-way D-pad: outside the small centre hub, an axis counts when the thumb leans that way by more than
// tan(22.5°) of the other axis — so the four arms are straight directions and the corners are diagonals.
function _dirsAt(x, y, pad) {
  const ox = x - pad.cx, oy = y - pad.cy, out = new Set()
  if (Math.hypot(ox, oy) < pad.dead) return out
  const T = 0.4142
  if (Math.abs(ox) > T * Math.abs(oy)) out.add(ox < 0 ? "left" : "right")
  if (Math.abs(oy) > T * Math.abs(ox)) out.add(oy < 0 ? "up" : "down")
  return out
}

// ── TOUCH APPLICATION (shared by the real DOM listeners and the test hooks) ────
// pts: [{ identifier, cx, cy }] in CANVAS coords.
function _onStart(pts) {
  if (!shouldShow()) return
  const L = getLayout(), c = _getControls() || {}
  for (const p of pts) {
    if (_joyId == null && _onDpad(p.cx, p.cy, L.dpad)) {
      const dirs = _dirsAt(p.cx, p.cy, L.dpad)
      for (const d of dirs) _press(c[d])
      _touches.set(p.identifier, { kind: "joystick", dirs, cx: p.cx, cy: p.cy })
      _joyId = p.identifier
      continue
    }
    const b = L.buttons.find((b) => _hitButton(b, p.cx, p.cy))
    if (b) { const key = c[b.id]; _press(key); _touches.set(p.identifier, { kind: "button", id: b.id, key }) }
  }
}

function _onMove(pts) {
  const L = getLayout(), c = _getControls() || {}
  for (const p of pts) {
    const rec = _touches.get(p.identifier)
    if (!rec || rec.kind !== "joystick") continue
    const dirs = _dirsAt(p.cx, p.cy, L.dpad)
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

// ── RENDER: a physical-looking pad — raised caps with bevel + gloss + drop shadow; pressed parts sink ───
function _shade(hex, f) {   // f < 0 → darker, f > 0 → lighter
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  const t = f < 0 ? 0 : 255, k = Math.abs(f)
  return `rgb(${Math.round(r + (t - r) * k)},${Math.round(g + (t - g) * k)},${Math.round(b + (t - b) * k)})`
}
function _roundRect(ctx, x, y, w, h, rad) {
  ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath()
}
function _capPath(ctx, b, x, y, grow = 0) {
  ctx.beginPath()
  if (b.shape === "pill") _roundRect(ctx, x - b.w / 2 - grow, y - b.h / 2 - grow, b.w + grow * 2, b.h + grow * 2, b.h / 2 + grow)
  else ctx.arc(x, y, b.r + grow, 0, Math.PI * 2)
}

function _drawButton(ctx, b, on) {
  const R = b.shape === "pill" ? b.h / 2 : b.r
  const depth = R * 0.32, sink = on ? depth * 0.8 : 0, rim = R * 0.16
  // housing the button sits in (dark bezel) + its shadow on the screen
  ctx.globalAlpha = 0.45; ctx.fillStyle = "#000"; _capPath(ctx, b, b.cx, b.cy + depth * 0.9, rim); ctx.fill()
  ctx.globalAlpha = 0.9; ctx.fillStyle = "#0b1020"; _capPath(ctx, b, b.cx, b.cy, rim); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2; ctx.stroke()
  // the button's side wall (its height above the bezel), then the cap on top
  ctx.globalAlpha = 0.95; ctx.fillStyle = _shade(b.color, -0.5); _capPath(ctx, b, b.cx, b.cy + depth); ctx.fill()
  const top = b.cy + sink, spread = b.shape === "pill" ? b.w / 2 : R
  const g = ctx.createRadialGradient(b.cx - spread * 0.3, top - R * 0.45, R * 0.1, b.cx, top, spread * 1.1)
  g.addColorStop(0, _shade(b.color, on ? 0.1 : 0.5)); g.addColorStop(0.55, on ? _shade(b.color, -0.2) : b.color); g.addColorStop(1, _shade(b.color, -0.38))
  ctx.fillStyle = g; _capPath(ctx, b, b.cx, top); ctx.fill()
  ctx.strokeStyle = _shade(b.color, -0.6); ctx.lineWidth = 2; ctx.stroke()
  if (!on) {   // gloss
    ctx.globalAlpha = 0.32; ctx.fillStyle = "#fff"; ctx.beginPath()
    if (b.shape === "pill") _roundRect(ctx, b.cx - b.w * 0.34, top - b.h * 0.4, b.w * 0.68, b.h * 0.26, b.h * 0.13)
    else ctx.ellipse(b.cx - R * 0.12, top - R * 0.46, R * 0.55, R * 0.24, -0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // label
  ctx.globalAlpha = 1
  const fs = Math.round(b.shape === "pill" ? b.h * 0.42 : R * (b.label.length > 5 ? 0.34 : 0.42))
  ctx.font = `900 ${fs}px Arial`; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(2, fs * 0.24); ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.fillStyle = "#fff"
  ctx.strokeText(b.label, b.cx, top + 1); ctx.fillText(b.label, b.cx, top + 1)
}

function _drawDpad(ctx, d, dirs) {
  const S = d.r, A = d.arm, x = d.cx, y = d.cy, depth = S * 0.13, cr = A * 0.18
  const cross = (cx, cy) => { ctx.beginPath(); _roundRect(ctx, cx - A / 2, cy - S, A, S * 2, cr); _roundRect(ctx, cx - S, cy - A / 2, S * 2, A, cr) }
  // round base plate + its shadow
  ctx.globalAlpha = 0.45; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y + depth, S * 1.24, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 0.9; ctx.fillStyle = "#0b1020"; ctx.beginPath(); ctx.arc(x, y, S * 1.24, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 2; ctx.stroke()
  // the cross rocks toward the pressed direction
  const tx = (dirs.has("right") ? 1 : dirs.has("left") ? -1 : 0) * depth * 0.45
  const ty = (dirs.has("down") ? 1 : dirs.has("up") ? -1 : 0) * depth * 0.45 + (dirs.size ? depth * 0.35 : 0)
  ctx.globalAlpha = 0.97; ctx.fillStyle = "#0f172a"; cross(x, y + depth); ctx.fill("nonzero")
  const g = ctx.createLinearGradient(x - S, y - S, x + S, y + S); g.addColorStop(0, "#6b7280"); g.addColorStop(0.5, "#374151"); g.addColorStop(1, "#1f2937")
  ctx.fillStyle = g; cross(x + tx, y + ty); ctx.fill("nonzero")
  ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.5; ctx.stroke()
  // arrows (lit when pressed)
  const arms = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
  for (const [name, [ux, uy]] of Object.entries(arms)) {
    const on = dirs.has(name), ax = x + tx + ux * S * 0.62, ay = y + ty + uy * S * 0.62, k = A * 0.3
    if (on) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#8ff0c8"; ctx.beginPath(); ctx.arc(ax, ay, A * 0.44, 0, Math.PI * 2); ctx.fill() }
    ctx.globalAlpha = on ? 1 : 0.75; ctx.fillStyle = on ? "#ecfeff" : "#cbd5e1"
    ctx.beginPath()
    ctx.moveTo(ax + ux * k, ay + uy * k)
    ctx.lineTo(ax - ux * k * 0.6 + uy * k * 0.85, ay - uy * k * 0.6 + ux * k * 0.85)
    ctx.lineTo(ax - ux * k * 0.6 - uy * k * 0.85, ay - uy * k * 0.6 - ux * k * 0.85)
    ctx.closePath(); ctx.fill()
  }
  // centre dimple
  ctx.globalAlpha = 0.75; ctx.fillStyle = "#111827"; ctx.beginPath(); ctx.arc(x + tx, y + ty, A * 0.2, 0, Math.PI * 2); ctx.fill()
}

export function draw(ctx, canvas = _canvas) {
  if (!ctx || !shouldShow()) return
  const L = getLayout(canvas)
  const pressedButtons = new Set(), activeDirs = new Set()
  for (const rec of _touches.values()) { if (rec.kind === "button") pressedButtons.add(rec.id); else rec.dirs.forEach((d) => activeDirs.add(d)) }
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  _drawDpad(ctx, L.dpad, activeDirs)
  for (const b of L.buttons) _drawButton(ctx, b, pressedButtons.has(b.id))
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
  joyPoint: (dir) => { const j = getLayout().dpad; const m = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir] || [0, 0]; return { cx: j.cx + m[0] * j.r * 0.8, cy: j.cy + m[1] * j.r * 0.8 } },
  activeCount: () => _touches.size,
}
