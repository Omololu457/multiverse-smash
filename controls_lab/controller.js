// controls_lab/controller.js — the DIGITAL CONTROLLER: a DualSense-style pad (SVG) and the player's keyboard binds.
//   LIVE  : buttons light the instant they are down, sticks sit at their real position, L2/R2 fill to analog depth.
//   GUIDE : the next input glows + pulses; directions are drawn on the stick (motions = a sweeping arc, double-tap =
//           a double pulse, hold = a filling ring, release = a "LET GO" marker).
// Every label comes from the game's tables: padLayout.js PAD_LAYOUT / PAD_GLYPHS (via the live game instance) and the
// game's live keyboard binds — nothing is hard-coded here except the physical drawing of the pad.

const NS = "http://www.w3.org/2000/svg"
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e }

// Standard-gamepad face/shoulder positions (physical). Which ACTION sits on each comes from PAD_LAYOUT.
const FACE = { 0: [470, 196], 1: [508, 158], 2: [432, 158], 3: [470, 120] }        // down / right / left / up
const POS_OF_BTN = { 0: "down", 1: "right", 2: "left", 3: "up", 4: "l1", 5: "r1", 6: "l2", 7: "r2" }
const DIR_VEC = { 1: [-1, 1], 2: [0, 1], 3: [1, 1], 4: [-1, 0], 5: [0, 0], 6: [1, 0], 7: [-1, -1], 8: [0, -1], 9: [1, -1] }
const ACTION_LABEL = { light: "Light", heavy: "Heavy", jump: "Jump", block: "Block", special: "Special", ultimate: "Ultimate", grab: "Grab", charge: "Charge", upAttack: "Up-Atk" }
const KB_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl;", "zxcvbnm,./"]

export class ControllerView {
  constructor(root, { padLayout, glyphs, kb }) {
    this.root = root; this.padLayout = padLayout; this.glyphs = glyphs; this.kb = kb || {}
    this.device = "pad"; this.facing = 1; this.guide = null
    this.wrap = document.createElement("div"); this.wrap.className = "ctl-wrap"
    root.appendChild(this.wrap)
    this.caption = document.createElement("div"); this.caption.className = "ctl-caption"; root.appendChild(this.caption)
    this.build()
  }
  setGlyphs(g) { if (g && g.label !== this.glyphs?.label) { this.glyphs = g; this.build() } }
  setKeyboard(kb) { this.kb = kb || {}; if (this.device === "keyboard") this.build() }
  setDevice(d) { if (d !== this.device) { this.device = d; this.build() } }
  setFacing(f) { this.facing = f >= 0 ? 1 : -1 }

  // ── build ──────────────────────────────────────────────────────────────────────────────────────────────
  build() {
    this.wrap.innerHTML = ""
    this.btn = {}; this.keyEls = {}
    if (this.device === "keyboard") return this.buildKeyboard()
    const svg = this.svg = el("svg", { viewBox: "0 0 600 330", class: "pad", role: "img", "aria-label": `${this.glyphs?.label || "Controller"} controller` }, this.wrap)
    // body
    el("path", { class: "pad-body", d: "M150 70 Q300 40 450 70 Q545 85 575 190 Q600 290 540 310 Q500 322 470 280 L420 220 Q300 240 180 220 L130 280 Q100 322 60 310 Q0 290 25 190 Q55 85 150 70 Z" }, svg)
    // triggers + bumpers (L2/R2 with analog fill)
    const trig = (idx, x) => {
      const g = el("g", { class: "pad-btn trig", "data-btn": idx }, svg)
      el("rect", { x, y: 8, width: 92, height: 26, rx: 9, class: "cap" }, g)
      const fill = el("rect", { x, y: 8, width: 0, height: 26, rx: 9, class: "fill" }, g)
      el("text", { x: x + 46, y: 26, class: "lbl" }, g).textContent = this.glyphFor(idx)
      this.btn[idx] = { g, fill, w: 92, x }
    }
    const bump = (idx, x) => {
      const g = el("g", { class: "pad-btn", "data-btn": idx }, svg)
      el("rect", { x, y: 40, width: 92, height: 20, rx: 8, class: "cap" }, g)
      el("text", { x: x + 46, y: 55, class: "lbl" }, g).textContent = this.glyphFor(idx)
      this.btn[idx] = { g }
    }
    trig(6, 104); trig(7, 404); bump(4, 104); bump(5, 404)
    // touchpad, Create, Options
    const tp = el("g", { class: "pad-btn", "data-btn": 17 }, svg); el("rect", { x: 222, y: 70, width: 156, height: 72, rx: 12, class: "cap touchpad" }, tp); this.btn[17] = { g: tp }
    const sm = (idx, x, label) => { const g = el("g", { class: "pad-btn", "data-btn": idx }, svg); el("rect", { x, y: 78, width: 22, height: 34, rx: 9, class: "cap" }, g); el("text", { x: x + 11, y: 128, class: "lbl small" }, g).textContent = label; this.btn[idx] = { g } }
    sm(8, 192, this.glyphs?.select || "Create"); sm(9, 386, this.glyphs?.start || "Options")
    // d-pad
    const dp = { 12: "M110 130 h28 v-30 h-28 z", 13: "M110 160 h28 v30 h-28 z", 14: "M108 132 v26 h-30 v-26 z", 15: "M140 132 v26 h30 v-26 z" }
    for (const [idx, d] of Object.entries(dp)) { const g = el("g", { class: "pad-btn", "data-btn": idx }, svg); el("path", { d, class: "cap" }, g); this.btn[idx] = { g } }
    // face buttons
    for (const [idx, [cx, cy]] of Object.entries(FACE)) {
      const g = el("g", { class: "pad-btn face", "data-btn": idx }, svg)
      el("circle", { cx, cy, r: 19, class: "cap" }, g)
      el("text", { x: cx, y: cy + 7, class: "glyph" }, g).textContent = this.glyphFor(+idx)
      this.btn[idx] = { g }
    }
    // sticks
    const stick = (cx, cy, id) => {
      const g = el("g", { class: "stick" }, svg)
      el("circle", { cx, cy, r: 34, class: "well" }, g)
      const arcs = el("g", { class: "guide-arcs" }, g)
      const cap = el("circle", { cx, cy, r: 22, class: "cap" }, g)
      const ring = el("circle", { cx, cy, r: 30, class: "hold-ring", "stroke-dasharray": "188.5", "stroke-dashoffset": "188.5" }, g)
      return { g, cap, cx, cy, arcs, ring, id }
    }
    this.lstick = stick(206, 230, "L"); this.rstick = stick(394, 230, "R")
    // action legend under the pad: which button does what (from PAD_LAYOUT)
    this.legend = el("g", { class: "legend" }, svg)
    this.guideText = el("text", { x: 300, y: 318, class: "guide-text" }, svg)
    this.applyLabels()
  }
  // symbol only on the pad face ("□", "Ⓐ", "LB"); the action legend beside it carries the words
  glyphFor(idx) { const pos = POS_OF_BTN[idx]; return pos && this.glyphs ? String(this.glyphs[pos] || "").split(" ")[0] : "" }
  actionOfButton(idx) { const row = (this.padLayout?.PAD_LAYOUT || []).find(r => r.button === idx); return row ? row.action : null }
  buttonOfAction(action) { const row = (this.padLayout?.PAD_LAYOUT || []).find(r => r.action === action); return row ? row.button : null }
  applyLabels() {
    // small action captions beside face buttons / shoulders
    const pos = { 0: [470, 232], 1: [548, 162], 2: [392, 162], 3: [470, 92] }   // bumpers / triggers get side captions below
    for (const [idx, [x, y]] of Object.entries(pos)) {
      const a = this.actionOfButton(+idx); if (!a) continue
      const t = el("text", { x, y: y + (y === 0 ? 0 : 0), class: "act" + (y === 0 ? " top" : "") }, this.legend)
      t.textContent = ACTION_LABEL[a] || a
      if (y === 0) t.setAttribute("y", 48 + 0)
    }
    // triggers' action captions above, inside the trigger cap is the glyph; put action below bumpers instead
    for (const t of this.legend.querySelectorAll("text.top")) t.remove()
    for (const idx of [6, 7]) { const a = this.actionOfButton(idx); if (!a) continue; const b = this.btn[idx]; const t = el("text", { x: b.x + 46 + (idx === 6 ? -72 : 74), y: 26, class: "act side" }, this.legend); t.textContent = ACTION_LABEL[a] || a }
    for (const idx of [4, 5]) { const a = this.actionOfButton(idx); if (!a) continue; const t = el("text", { x: idx === 4 ? 82 : 518, y: 55, class: "act side" }, this.legend); t.textContent = ACTION_LABEL[a] || a }
  }

  buildKeyboard() {
    const kb = this.kb, byKey = {}
    for (const [act, k] of Object.entries(kb)) { if (!k || act === "toggle" || act === "transform" || act === "dash") continue; (byKey[k] = byKey[k] || []).push(act) }
    const box = document.createElement("div"); box.className = "kb"
    KB_ROWS.forEach((row, ri) => {
      const r = document.createElement("div"); r.className = "kb-row"; r.style.marginLeft = `${ri * 3}%`; r.style.setProperty("--indent", `${ri * 3}%`)
      for (const ch of row) {
        const k = document.createElement("div"); k.className = "kb-key" + (byKey[ch] ? " bound" : "")
        k.innerHTML = `<span class="cap">${ch === ";" ? ";" : ch.toUpperCase()}</span>` + (byKey[ch] ? `<span class="act">${byKey[ch].map(kbLabel).join(" / ")}</span>` : "")
        r.appendChild(k); this.keyEls[ch] = k
      }
      box.appendChild(r)
    })
    const sp = document.createElement("div"); sp.className = "kb-row"; sp.style.marginLeft = "24%"
    const space = document.createElement("div"); space.className = "kb-key wide"; space.innerHTML = `<span class="cap">SPACE</span>`; sp.appendChild(space); this.keyEls[" "] = space
    box.appendChild(sp)
    this.wrap.appendChild(box)
    this.guideTextEl = document.createElement("div"); this.guideTextEl.className = "guide-text kbg"; this.wrap.appendChild(this.guideTextEl)
  }

  // ── live state ─────────────────────────────────────────────────────────────────────────────────────────
  // pad: { buttons:[{pressed,value}], axes:[x,y,rx,ry] }   keyboard: Set of lower-case keys held
  setLive(state) {
    if (this.device === "keyboard") {
      const held = state instanceof Set ? state : new Set()
      for (const [k, e] of Object.entries(this.keyEls)) e.classList.toggle("on", held.has(k))
      return
    }
    const b = state?.buttons || [], ax = state?.axes || [0, 0, 0, 0]
    for (const [idx, o] of Object.entries(this.btn)) {
      const v = b[idx] ? (typeof b[idx] === "object" ? (b[idx].value || (b[idx].pressed ? 1 : 0)) : (b[idx] ? 1 : 0)) : 0
      o.g.classList.toggle("on", v > 0.05 || !!b[idx]?.pressed)
      if (o.fill) o.fill.setAttribute("width", String(Math.round(o.w * Math.max(0, Math.min(1, v)))))
    }
    const mv = (s, x, y) => { s.cap.setAttribute("cx", s.cx + (x || 0) * 14); s.cap.setAttribute("cy", s.cy + (y || 0) * 14); s.g.classList.toggle("on", Math.hypot(x || 0, y || 0) > 0.28) }
    mv(this.lstick, ax[0], ax[1]); mv(this.rstick, ax[2], ax[3])
  }

  // ── guide ──────────────────────────────────────────────────────────────────────────────────────────────
  // step: { kind: press|hold|motion|doubletap|dir|walk|jump|release, dirs:[numpad facing-right], buttons:[fields], hold }
  setGuide(step, { phase = "next", progress = 0, text = "" } = {}) {
    this.guide = step
    if (this.device === "keyboard") return this._kbGuide(step, text)
    for (const o of Object.values(this.btn)) o.g.classList.remove("guide", "guide-double", "guide-release")
    this.lstick.arcs.innerHTML = ""; this.lstick.g.classList.remove("guide", "guide-double")
    this.lstick.ring.setAttribute("stroke-dashoffset", "188.5"); this.lstick.ring.classList.remove("show")
    this.guideText.textContent = text || ""
    if (!step) return
    const fields = (step.buttons || []).slice()
    if (step.kind === "jump") fields.push("jump")
    if (step.kind === "walk" || step.kind === "dir" || step.kind === "doubletap") {}
    for (const f of fields) {
      const idx = f === "upAttack" ? this.buttonOfAction("light") : this.buttonOfAction(f)
      if (idx != null && this.btn[idx]) this.btn[idx].g.classList.add(phase === "release" ? "guide-release" : "guide")
    }
    const dirs = (step.dirs || []).map(d => this.facing >= 0 ? d : mirrorNum(d))
    if (fields.includes("upAttack") && !dirs.length) dirs.push(8)
    if (dirs.length) this._drawDirs(dirs, step.kind)
    if (step.kind === "doubletap") this.lstick.g.classList.add("guide-double")
    if (step.hold && step.hold > 5) { this.lstick.ring.classList.add("show"); this.lstick.ring.setAttribute("stroke-dashoffset", String(188.5 * (1 - Math.max(0, Math.min(1, progress))))) }
    if (phase === "release") this.guideText.textContent = "LET GO"
  }
  _drawDirs(dirs, kind) {
    const s = this.lstick, R = 28
    const pt = d => { const [x, y] = DIR_VEC[d] || [0, 0]; const n = Math.hypot(x, y) || 1; return [s.cx + x / n * R, s.cy + y / n * R] }
    s.g.classList.add("guide")
    if (dirs.length > 1) {
      // sweeping arc through each direction in order
      let d = ""
      dirs.forEach((n, i) => { const [x, y] = pt(n); d += (i ? ` A ${R} ${R} 0 0 ${sweep(dirs[i - 1], n)} ${x} ${y}` : `M ${x} ${y}`) })
      el("path", { d, class: "arc" }, s.arcs)
      const [ex, ey] = pt(dirs[dirs.length - 1]); el("circle", { cx: ex, cy: ey, r: 6, class: "arc-head" }, s.arcs)
    } else if (dirs[0] !== 5) {
      const [x, y] = pt(dirs[0])
      el("line", { x1: s.cx, y1: s.cy, x2: x, y2: y, class: "arrow" }, s.arcs)
      el("circle", { cx: x, cy: y, r: 6, class: "arc-head" }, s.arcs)
    }
  }
  _kbGuide(step, text) {
    for (const e of Object.values(this.keyEls)) e.classList.remove("guide", "guide-double")
    if (this.guideTextEl) this.guideTextEl.textContent = text || ""
    if (!step) return
    const kb = this.kb, keys = []
    for (const f of (step.buttons || [])) keys.push(kb[f])
    if (step.kind === "jump") keys.push(kb.jump || kb.up)
    for (const d of (step.dirs || []).map(d => this.facing >= 0 ? d : mirrorNum(d))) {
      const [x, y] = DIR_VEC[d] || [0, 0]
      if (x < 0) keys.push(kb.left); if (x > 0) keys.push(kb.right); if (y < 0) keys.push(kb.up); if (y > 0) keys.push(kb.down)
    }
    for (const k of keys) if (k && this.keyEls[k]) this.keyEls[k].classList.add(step.kind === "doubletap" ? "guide-double" : "guide")
  }
}

function kbLabel(a) { return ACTION_LABEL[a] || ({ left: "←", right: "→", up: "↑", down: "↓", jump: "Jump" })[a] || a }
export function mirrorNum(n) { return { 1: 3, 3: 1, 4: 6, 6: 4, 7: 9, 9: 7 }[n] || n }
function sweep(a, b) {
  const ang = n => { const [x, y] = DIR_VEC[n]; return Math.atan2(y, x) }
  let d = ang(b) - ang(a); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
  return d > 0 ? 1 : 0
}
