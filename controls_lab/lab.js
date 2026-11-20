// controls_lab/lab.js — CONTROLS LAB app: fighter picker, the four modes, pad/keyboard/mouse navigation,
// input history, the combo-trial judge, persistence. All game knowledge comes from the live game (engine.js).
import { LabEngine, FIELDS, mirrorRaw } from "./engine.js"
import { ControllerView, mirrorNum } from "./controller.js"
import { buildMoves } from "./moves.js"
import { rawToNumpad, rawButtons, NUMPAD_ARROW } from "./notation.js"
import { comboScript, comboSteps, verifyCombo } from "./combos.js"

const $ = s => document.querySelector(s)
const LS = { state: "ms_controls_lab", mastered: "ms_controls_lab_mastered", big: "ms_controls_lab_big", zoom2: "ms_controls_lab_zoom2" }
const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d } catch (_) { return d } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch (_) {} }
const MODES = ["moves", "combos", "trial", "free"]

const eng = new LabEngine($("#game"))
const S = {
  key: null, mode: "moves", moves: [], notes: [], combos: [], allCombos: null,
  selMove: null, selCombo: null, focus: "ui", device: "keyboard", boxes: false,
  history: [], heldKeys: new Set(), viewKeys: new Set(), mastered: lsGet(LS.mastered, { combos: {}, moves: {} }),
  task: null,     // { kind:"demo"|"yourturn"|"trial", … }
  roster: [],
}
let ctl = null
window.__lab = { S, eng }   // test / debug handle (read-only use)

// ── boot ────────────────────────────────────────────────────────────────────────────────────────────────────
async function boot() {
  const saved = lsGet(LS.state, {})
  S.mode = MODES.includes(saved.mode) ? saved.mode : "moves"
  const first = new URLSearchParams(location.search).get("char") || saved.key || "goku"
  await selectChar(first, { initial: true })
  $("#app").classList.remove("booting")
  fitArena()
  wireUI()
  requestAnimationFrame(uiLoop)
}

async function selectChar(key, { initial = false } = {}) {
  stopTask()
  setVeil(true, "Loading the real engine…")
  let ok = false
  try { ok = await eng.load(key) } catch (e) { console.error(e) }
  if (!ok && !eng.ready) {
    if (key !== "goku" && initial) return selectChar("goku")
    setVeil(true, "Could not load that fighter.")
    return
  }
  S.roster = eng.roster()
  applyCamZoom()   // a new game page = a fresh camera
  if (!S.roster.find(r => r.key === key) && S.roster.length && initial) return selectChar(S.roster[0].key)
  S.key = key
  const C = eng.mods.characters[key]
  $("#charName").textContent = C?.name || key
  $("#charUni").textContent = S.roster.find(r => r.key === key)?.universeLabel || ""
  const img = $("#charPortrait"); if (C?.portrait) { img.src = C.portrait; img.style.visibility = "" } else img.style.visibility = "hidden"
  setAccent(eng.accent(key))
  const r = buildMoves(eng.mods, key)
  S.moves = r.moves; S.notes = r.notes; S.selMove = null
  await loadCombos()
  S.combos = (S.allCombos || []).filter(c => c.char === key && c.status === "verified")
  S.selCombo = S.combos[0] || null
  if (!ctl) ctl = new ControllerView($("#controller"), { padLayout: eng.mods.padLayout, glyphs: padGlyphs(), kb: eng.controls?.p1 })
  else { ctl.padLayout = eng.mods.padLayout; ctl.setKeyboard(eng.controls?.p1) }
  ctl.setDevice(S.device === "pad" ? "pad" : "keyboard")
  lsSet(LS.state, { key, mode: S.mode })
  renderMode()
  setVeil(false)
  eng.listeners.add(onFrame)
}

async function loadCombos() {
  if (S.allCombos) return
  try { const r = await fetch("controls_lab/combos.json", { cache: "no-cache" }); S.allCombos = (await r.json()).combos || [] }
  catch (_) { S.allCombos = [] }
}

function setAccent(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim()) || /^#?([0-9a-f]{3})$/i.exec(String(hex || "").trim())
  let rgb = [56, 189, 248]
  if (m) { const h = m[1].length === 3 ? m[1].split("").map(c => c + c).join("") : m[1]; rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) }
  // keep text readable: lift very dark accents
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  if (lum < 0.35) rgb = rgb.map(v => Math.round(v + (255 - v) * (0.35 - lum) * 1.6))
  document.documentElement.style.setProperty("--accent", `rgb(${rgb.join(",")})`)
  document.documentElement.style.setProperty("--accent-rgb", rgb.join(","))
}
// ZOOM (Lab-side, presentation only): the arena is the whole game screen shrunk into a panel, so the fighters look small.
// With zoom on, the iframe is magnified ×ZOOM and panned (smoothly, every logic frame) to keep both fighters — and a bit of
// sky for falling attacks — in the middle. The game itself, its camera and the sim are untouched.
const ZOOMS = [1, 1.25, 1.5]                       // the Zoom button cycles these; 1.25× by default
// Zoom drives the GAME'S OWN camera (tighter framing + a higher zoom cap), not a magnified picture of the screen —
// so the fighters get bigger while the health bars, gauges and edges of the arena stay whole and in place.
const CAM0 = { maxZoom: 1.15, horizontalPadding: 280, verticalPadding: 260 }
function applyCamZoom() {
  const cam = eng?.mods?.camera, z = S.zoom || 1; if (!cam) return
  cam.maxZoom = CAM0.maxZoom * z; cam.horizontalPadding = CAM0.horizontalPadding / z; cam.verticalPadding = CAM0.verticalPadding / z
}
function fitArena() {
  const box = $("#arenaBox").getBoundingClientRect()
  const k = box.width / 1440
  S.arenaScale = k
  const K = k, tx = 0, ty = 0                       // the WHOLE game screen always fits (the HUD is never cut off)
  S.view = { K, tx, ty }
  $("#game").style.transform = `translate(${tx}px, ${ty}px) scale(${K})`
}
// the fighters' midpoint (chest height) in the iframe's own CSS pixels
function focusPoint() {
  try {
    const gc = eng.w?.document.querySelector("canvas"); if (!gc) return null
    const cam = eng.h.camera(), r = gc.getBoundingClientRect(), sx = r.width / gc.width, sy = r.height / gc.height
    const hs = ["p1", "p2"].map(w => eng.h.hurtbox(w)).filter(Boolean); if (!hs.length) return null
    const wx = hs.reduce((a, h) => a + h.x + h.w / 2, 0) / hs.length, wy = hs.reduce((a, h) => a + h.y + h.h * 0.4, 0) / hs.length
    return { x: ((wx - cam.x) * cam.zoom + gc.width / 2) * sx + r.left, y: ((wy - cam.y) * cam.zoom + gc.height / 2) * sy + r.top }
  } catch (_) { return null }
}
function setZoom(z) {
  S.zoom = ZOOMS.includes(z) ? z : 1.25; lsSet(LS.zoom2, S.zoom); S.focusPt = null
  $("#zoomBtn").textContent = `🔍 Zoom: ${S.zoom === 1 ? "OFF" : S.zoom + "×"}`; applyCamZoom(); fitArena(); if (S.boxes) drawBoxes()
}
const toggleZoom = () => setZoom(ZOOMS[(ZOOMS.indexOf(S.zoom) + 1) % ZOOMS.length])
window.addEventListener("resize", fitArena)
function setVeil(on, text) { $("#veil").classList.toggle("off", !on); if (text) $("#veilText").textContent = text }
function toast(t, ms = 1600) { const e = $("#toast"); e.textContent = t; e.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => e.classList.remove("show"), ms) }
function sfx(kind) { try { const s = eng.mods.sound, X = eng.mods.SFX; s.play?.({ select: X.UI_SELECT, back: X.UI_BACK, hover: X.UI_HOVER, good: X.UI_SELECT, bad: X.UI_BACK }[kind] || X.UI_SELECT) } catch (_) {} }
function padGlyphs() { try { return eng.mods.input.padGlyphs(eng.mods.input.getPadType?.()) } catch (_) { return eng.mods.padLayout?.PAD_GLYPHS?.generic } }

// ── per logic frame (from the game's own clock) ──────────────────────────────────────────────────────────────
function onFrame(ev) {
  // user raw input sampled at this logic tick (keyboard held keys or the pad), unless a script is driving
  const userRaw = ev.scripted ? null : currentUserRaw()
  eng._userRaw = userRaw
  const raw = ev.scripted ? ev.raw : (userRaw || {})
  pushHistory(raw, ev.scripted, ev.p1?.facing >= 0 ? 1 : -1)
  if (S.task && S.task.onFrame) S.task.onFrame(ev, raw)
  if (S.boxes) drawBoxes()
  if (ctl) ctl.setFacing(ev.p1?.facing >= 0 ? 1 : -1)
  // the game pauses on Options/Escape; the Lab owns those buttons, so un-pause straight away
  if (eng.h.state().gameState === "paused") { eng.forwardKey("keydown", "escape"); eng.forwardKey("keyup", "escape") }
}

function currentUserRaw() {
  if (S.userFeed) return S.userFeed
  if (S.focus !== "arena") return {}
  if (S.device === "pad") {
    const gp = firstPad(); if (!gp) return {}
    const L = eng.mods.padLayout, b = i => !!gp.buttons[i]?.pressed
    const dirs = padDirs(gp)
    const raw = { ...dirs }
    for (const row of L.PAD_LAYOUT) raw[row.action] = raw[row.action] || b(row.button)
    if (raw.jump) raw.up = raw.up || false
    return raw
  }
  const c = eng.controls?.p1 || {}, raw = {}
  for (const f of FIELDS) if (c[f] && S.heldKeys.has(c[f])) raw[f] = true
  return raw
}
let _stickPrev = 5
function padDirs(gp) {
  const P = eng.mods.padStick
  const x = gp.axes?.[0] || 0, y = gp.axes?.[1] || 0
  let n = 5
  if (P) n = _stickPrev = P.stickToNumpad(x, y, _stickPrev)
  else { const m = Math.hypot(x, y); if (m >= 0.28) { const a = (Math.atan2(-y, x) * 180 / Math.PI + 360) % 360; n = [6, 9, 8, 7, 4, 1, 2, 3][Math.round(a / 45) % 8] } }
  const b = i => !!gp.buttons[i]?.pressed
  const d = { up: n >= 7 || b(12), down: (n <= 3 && n !== 0) || b(13), left: [1, 4, 7].includes(n) || b(14), right: [3, 6, 9].includes(n) || b(15) }
  if (d.left && d.right) d.left = d.right = false
  if (d.up && d.down) d.down = false
  return d
}

// ── input history ───────────────────────────────────────────────────────────────────────────────────────────
function pushHistory(raw, scripted, facing) {
  const num = rawToNumpad(raw, facing), btns = rawButtons(raw).join("+")
  const last = S.history[0]
  if (last && last.num === num && last.btns === btns) { last.frames++; last.dirty = true }
  else { S.history.unshift({ num, btns, frames: 1, scripted, dirty: true }); if (S.history.length > 24) S.history.length = 24 }
}
function renderHistory() {
  const row = $("#histRow")
  const items = S.history.filter((h, i) => i === 0 || h.num !== 5 || h.btns).slice(0, 16)
  row.innerHTML = items.map((h, i) => `<div class="hi${i === 0 ? " new" : ""}${h.scripted ? " scripted" : ""}"><span class="d">${NUMPAD_ARROW[h.num]}</span><span class="b">${h.btns ? h.btns.split("+").map(b => btnLabel(b, true)).join("+") : "&nbsp;"}</span><span class="f">${Math.min(h.frames, 999)}f</span></div>`).join("")
}

// ── glyphs ──────────────────────────────────────────────────────────────────────────────────────────────────
// short = symbol only ("□" not "□ Square") for tight spots like the history strip
function btnLabel(field, short = false) {
  if (S.device === "pad") {
    const g = padGlyphs(), L = eng.mods.padLayout, sh = t => short && t ? String(t).split(" ")[0] : t
    if (field === "upAttack") return `↑+${sh(L.padGlyphFor("light", g))}`
    return sh(L.padGlyphFor(field, g)) || field
  }
  const k = eng.controls?.p1?.[field]
  return k ? (k === " " ? "Space" : k.length === 1 ? k.toUpperCase() : k.replace(/^arrow/, "")) : field
}
function stepGlyphs(step, facing = 1) {
  const parts = []
  const dirs = (step.dirs || []).map(d => facing >= 0 ? d : mirrorNum(d))
  if (step.kind === "doubletap") parts.push(`<span class="g dir">${NUMPAD_ARROW[dirs[0]]}${NUMPAD_ARROW[dirs[0]]}</span>`)
  else if (step.kind === "walk") parts.push(`<span class="g dir">←</span><span class="g dir">→</span>`)
  else if (step.kind === "jump") parts.push(`<span class="g">${btnLabel("jump")}</span>`)
  else if (dirs.length) parts.push(`<span class="g dir">${dirs.map(d => NUMPAD_ARROW[d]).join("")}</span>`)
  const btns = (step.buttons || []).filter(b => !(step.kind === "jump" && b === "jump")).map(b => `<span class="g">${btnLabel(b)}</span>`)
  if (parts.length && btns.length) parts.push(`<span class="g plus">+</span>`)
  if (btns.length) parts.push(btns.join(`<span class="g plus">+</span>`))
  if (step.hold > 5) parts.push(`<span class="note">hold</span>`)
  return parts.join("")
}
function moveGlyphs(m) {
  const air = m.parsed.air ? `<span class="g">${btnLabel("jump")}</span><span class="g plus">›</span>` : ""
  return air + m.parsed.steps.map(s => stepGlyphs(s)).join(`<span class="g plus">›</span>`)
}

// ── modes ───────────────────────────────────────────────────────────────────────────────────────────────────
function setMode(mode) {
  if (!MODES.includes(mode)) return
  stopTask(); S.mode = mode
  lsSet(LS.state, { key: S.key, mode })
  renderMode()
  if (focused?.classList.contains("tab")) setFocus(document.querySelector(".tab.active"))   // keep the focus ring on the mode shown
  if (mode === "free") takeControl(true)
}
function renderMode() {
  for (const t of document.querySelectorAll(".tab")) t.classList.toggle("active", t.dataset.mode === S.mode)
  const P = $("#modePanel")
  if (S.mode === "moves") P.innerHTML = movesHTML()
  else if (S.mode === "combos") P.innerHTML = combosHTML()
  else if (S.mode === "trial") P.innerHTML = trialHTML()
  else P.innerHTML = freeHTML()
  $("#hitboxBtn").style.display = S.mode === "free" ? "" : "none"
  updateHelp()
}

function moveCard(m, compact = false) {
  const done = S.mastered.moves[`${S.key}:${m.name}`]
  const stats = []
  if (m.damage != null) stats.push(`DMG <b>${m.damage}</b>`)
  if (m.startup != null) stats.push(`Startup <b>${m.startup}f</b>`)
  if (m.cost != null) stats.push(`Cost <b>${m.cost}</b>`)
  const tags = m.tags.map(t => `<span class="tag ${t.split(" ")[0]}">${t}</span>`).join("")
  return `<div class="card nav${S.selMove === m ? " sel" : ""}${done ? " done" : ""}" data-nav="list" data-move="${S.moves.indexOf(m)}">
    <div class="nm">${esc(m.name)}</div>
    <div class="row"><span class="inp">${moveGlyphs(m)}</span>${compact ? "" : `<span class="stat">${stats.join(" · ")}</span>`}</div>
    ${compact ? "" : `<div class="row">${tags}</div><div class="desc">${esc(m.desc || "")}</div>`}
  </div>`
}
function movesHTML() {
  const groups = {}
  for (const m of S.moves) (groups[m.section] = groups[m.section] || []).push(m)
  const sel = S.selMove
  const pa = S.playAll
  return `<div class="mode-head"><h2>MOVE LIST</h2><span class="sp"></span>
      <button class="nav sm primary" data-act="playall" data-nav="actions" title="Watch every move, one after another">${pa ? `■ Stop (${pa.i + 1} / ${pa.n})` : "▶ Play all"}</button>
      <button class="nav sm" data-act="replay" data-nav="actions" ${sel ? "" : "disabled"}>⟲ Replay</button>
      <button class="nav sm" data-act="slow" data-nav="actions" ${sel ? "" : "disabled"}>0.5× Slow</button>
      <button class="nav sm" data-act="yourturn" data-nav="actions" ${sel ? "" : "disabled"}>✋ Your turn</button></div>
    <div class="note" id="moveStatus">${sel ? `Selected: <b>${esc(sel.name)}</b>` : "Press ▶ Play all to watch every move, or pick one to watch it on the dummy."}</div>
    <div class="scroll" id="listScroll">${Object.entries(groups).map(([sec, ms]) => `<div class="sec">${esc(sec.toUpperCase())}</div>` + ms.map(m => moveCard(m)).join("")).join("")}
    ${S.notes.length ? `<div class="sec">PASSIVES</div>` + S.notes.map(n => `<div class="card"><div class="nm">${esc(n.name)}</div><div class="desc">${esc(n.desc || "")}</div></div>`).join("") : ""}</div>`
}
function comboCard(c, i) {
  const done = S.mastered.combos[c.id]
  return `<div class="card nav${S.selCombo === c ? " sel" : ""}${done ? " done" : ""}" data-nav="list" data-combo="${i}">
    <div class="nm">${esc(c.name)}</div>
    <div class="row"><span class="inp">${comboSteps(c).map(s => stepGlyphs(s)).join(`<span class="g plus">›</span>`)}</span></div>
    <div class="row"><span class="stat">DMG <b>${c.damage}</b> · Hits <b>${c.hits}</b> · Difficulty <span class="diff">${"★".repeat(c.difficulty)}${"☆".repeat(5 - c.difficulty)}</span></span>
      <span class="verified">✔ verified ${esc(c.verified)}</span>${c.kind === "string" ? `<span class="stat" title="The game counts every hit as one combo, but there is a short gap a real opponent could block in">STRING · gap ${c.freeFrames}f</span>` : `<span class="stat">TRUE COMBO</span>`}${done ? `<span class="verified">★ mastered</span>` : ""}</div>
    ${c.note ? `<div class="desc">${esc(c.note)}</div>` : ""}
  </div>`
}
function combosHTML() {
  const sel = S.selCombo
  return `<div class="mode-head"><h2>COMBO LIBRARY</h2><span class="sp"></span>
      <button class="nav sm" data-act="cdemo" data-nav="actions" ${sel ? "" : "disabled"}>▶ Demo</button>
      <button class="nav sm" data-act="cslow" data-nav="actions" ${sel ? "" : "disabled"}>0.5× Slow</button>
      <button class="nav sm" data-act="ctrial" data-nav="actions" ${sel ? "" : "disabled"}>🎯 Start trial</button></div>
    <div class="note">Every combo here was run in the real engine with scripted inputs; all hits connected.</div>
    <div class="scroll" id="listScroll">${S.combos.length ? S.combos.map(comboCard).join("") : `<div class="empty">No verified combos for this fighter yet.</div>`}</div>`
}
function trialHTML() {
  const c = S.selCombo
  if (!c) return `<div class="mode-head"><h2>COMBO TRIAL</h2></div><div class="empty">No verified combos for this fighter yet — pick another fighter.</div>`
  const T = S.task?.kind === "trial" ? S.task : null
  const steps = comboSteps(c)
  const stage = T ? T.stages[T.stageIdx] : null
  const pct = T ? Math.round(100 * T.stageIdx / T.stages.length) : 0
  return `<div class="mode-head"><h2>COMBO TRIAL</h2><span class="sp"></span>
      <button class="nav sm" data-act="tstart" data-nav="actions">${T ? "⟲ Restart" : "▶ Start"}</button>
      <button class="nav sm" data-act="tshow" data-nav="actions">👁 Show me again</button>
      <button class="nav sm" data-act="tpick" data-nav="actions">Next combo ▸</button></div>
    <div class="nm" style="font-size:18px;font-weight:900">${esc(c.name)} <span class="stat">· ${c.hits} hits · ${c.damage} dmg</span></div>
    <div class="trial-steps">${steps.map((s, i) => `<div class="ts${stage && i >= stage.from && i <= stage.to ? (T.ptr === i ? " cur" : "") : ""}${T && T.clearedSteps.has(i) ? " ok" : ""}">${stepGlyphs(s)}</div>`).join("")}</div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    <div class="stat">${T ? `Stage <b>${Math.min(T.stageIdx + 1, T.stages.length)}/${T.stages.length}</b> — ${esc(stage ? stage.label : "complete")} · Attempts <b>${T.attempts}</b>` : (S.mastered.combos[c.id] ? "★ Mastered — run it again any time." : "Press Start: the fighter shows the combo once, then it's your turn step by step.")}</div>
    <div class="feedback ${T?.fbClass || ""}" id="fb">${esc(T?.fb || "")}</div>
    <div class="fb-log" id="fbLog">${esc(T?.log || "")}</div>`
}
function freeHTML() {
  return `<div class="mode-head"><h2>FREE PRACTICE</h2><span class="sp"></span><span class="note">Cheat sheet</span></div>
    <div class="scroll" id="listScroll">${S.moves.map(m => moveCard(m, true)).join("")}</div>`
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])

// ── tasks: demo / your turn / trial ──────────────────────────────────────────────────────────────────────────
function stopTask() { if (S.task?.stop) S.task.stop(); S.task = null; eng.stop(); eng.speed = 1; if (ctl) ctl.setGuide(null); $("#arenaBadge").textContent = S.focus === "arena" ? controlBadge() : "" }

// Play a script on the real engine with the controller guide in sync. Resolves { fired, hits, damage }.
async function runDemo({ script, at, steps, lesson = null, also = null, gap = 34, slow = false, label = "DEMO" }) {
  stopTask(); takeControl(false)
  const task = S.task = { kind: "demo" }
  await eng.reset({ gap })
  if (S.task !== task) return null
  eng.speed = slow ? 0.5 : 1
  $("#arenaBadge").textContent = `${label} ${slow ? "0.5×" : "1×"}`
  const facing = eng.facing()
  const frames = facing >= 0 ? script : script.map(mirrorRaw)
  const base = eng.academySnap(), hp0 = eng.p2().health
  let fired = false, maxCombo = 0
  const det = eng.mods.academy.detectLesson
  task.onFrame = () => {
    if (lesson && !fired) { const now = eng.academySnap(); if (det(lesson, base, now) || alsoHit(also, now)) fired = true }
    maxCombo = Math.max(maxCombo, eng.combo())
  }
  await eng.play(frames, { onStep: i => {
    let s = 0; for (let k = 0; k < at.length; k++) if (at[k] - 10 <= i) s = k
    const st = steps[s]
    const pressing = i >= at[s] && i < at[s] + Math.max(5, st?.hold || 0)
    if (ctl) ctl.setGuide(st, { progress: st?.hold ? (i - at[s]) / st.hold : 0, text: pressing ? "" : (s === 0 && i < at[0] - 10 ? "" : "NEXT") })
  } })
  if (S.task !== task) return null
  await eng.frames(slow ? 30 : 24)
  if (lesson && !fired) { const now = eng.academySnap(); if (det(lesson, base, now) || alsoHit(also, now)) fired = true }
  const res = { fired, hits: maxCombo, damage: Math.max(0, Math.round(hp0 - eng.p2().health)) }
  if (S.task === task) { S.task = null; eng.speed = 1; if (ctl) ctl.setGuide(null); $("#arenaBadge").textContent = "" }
  return res
}

// extra "it happened" signal on top of the Academy detector: a named attack, or ("*") any attack starting
function alsoHit(also, now) {
  if (also === "grabbed") { try { return !!eng.p2()?.isGrabbed } catch (_) { return false } }
  return !!also && !!now?.attackName && (also === "*" || now.attackName === also)
}
function runMoveDemo(m, slow = false) { return runDemo({ script: m.script, at: m.at, steps: m.parsed.steps, lesson: m.lesson, also: m.also, gap: m.gap, slow }) }
async function demoMove(m, slow = false) {
  S.selMove = m; renderMode()
  const r = await runMoveDemo(m, slow)
  if (!r) return r
  const st = $("#moveStatus")
  if (st) st.innerHTML = `<b>${esc(m.name)}</b> — ${r.fired ? `<span class="verified">performed in the engine</span>` : `<span style="color:var(--warn)">not detected from neutral${m.parsed.conditional ? " (needs a form / setup)" : ""}</span>`}${r.damage ? ` · dealt <b>${r.damage}</b>` : ""}${r.hits ? ` · ${r.hits} hit${r.hits > 1 ? "s" : ""}` : ""}`
  return r
}

function yourTurnMove(m) {
  stopTask(); S.selMove = m; renderMode()
  takeControl(true)
  const task = S.task = { kind: "yourturn" }
  $("#arenaBadge").textContent = "YOUR TURN"
  if (ctl) ctl.setGuide(m.parsed.steps[0], { text: "YOUR TURN" })
  const det = eng.mods.academy.detectLesson
  let base = null
  eng.reset({ gap: m.gap }).then(() => { base = eng.academySnap() })
  task.onFrame = (ev) => {
    if (!base || ev.scripted) return
    const now = eng.academySnap()
    if (det(m.lesson, base, now) || alsoHit(m.also, now)) {
      S.mastered.moves[`${S.key}:${m.name}`] = 1; lsSet(LS.mastered, S.mastered)
      sfx("good"); toast(`✔ ${m.name} — nailed it`)
      S.task = null; if (ctl) ctl.setGuide(null)
      $("#arenaBadge").textContent = controlBadge()
      renderMode()
    }
  }
}

// ── COMBO TRIAL judge ───────────────────────────────────────────────────────────────────────────────────────
// Stages: the demo, then each step alone, then each consecutive pair, then the whole combo. A stage is cleared
// when the ENGINE says so (the combo counter reaches the hits that segment produced in verification); the judge
// adds per-press feedback: Perfect / Early by Nf / Late by Nf / Wrong button / Wrong direction.
function buildStages(c) {
  // a "unit" is one attacking step, plus the Jump right before it (air follow-ups are practised with their jump)
  const steps = comboSteps(c), units = []
  steps.forEach((st, i) => { if (st.kind !== "jump") units.push({ from: i > 0 && steps[i - 1].kind === "jump" ? i - 1 : i, to: i }) })
  const st = units.map((u, k) => ({ ...u, label: `step ${k + 1} alone` }))
  for (let k = 0; k + 1 < units.length; k++) st.push({ from: units[k].from, to: units[k + 1].to, label: `steps ${k + 1}–${k + 2} together` })
  if (units.length > 2) st.push({ from: units[0].from, to: units[units.length - 1].to, label: "the full combo" })
  return st
}
async function startTrial(c, { showDemo = true } = {}) {
  stopTask()
  const steps = comboSteps(c), sc = comboScript(c)
  if (showDemo) { await runDemo({ script: sc.script, at: sc.at, steps, label: "WATCH" }); if (S.mode !== "trial") return }
  const T = S.task = { kind: "trial", combo: c, steps, at: sc.at, stages: buildStages(c), stageIdx: 0, attempts: 0, clearedSteps: new Set(), fb: "", fbClass: "", log: "", ptr: 0 }
  takeControl(true)
  await armStage(T)
}
async function armStage(T) {
  if (S.task !== T) return
  const stage = T.stages[T.stageIdx]
  if (!stage) return trialComplete(T)
  await eng.reset()
  if (S.task !== T) return
  T.ptr = stage.from; T.lastPress = null; T.pressFrames = []; T.failed = false; T.endAt = null; T.prevRaw = {}
  T.hitsNeeded = T.steps.slice(stage.from, stage.to + 1).filter(s => s.kind !== "jump").length
  T.hitEvents = 0; T.firstHitAt = null; T.freeAfterHit = 0; T.lastHp = null
  T.armSeq = (T.armSeq || 0) + 1
  $("#arenaBadge").textContent = `TRIAL · ${stage.label.toUpperCase()}`
  guideTrial(T)
  T.onFrame = (ev, raw) => trialFrame(T, ev, raw)
  renderMode()
}
function guideTrial(T) { if (ctl) ctl.setGuide(T.steps[T.ptr] || null, { text: T.ptr < T.steps.length ? `STEP ${T.ptr + 1}` : "" }) }
function setFb(T, text, cls, logLine) {
  T.fb = text; T.fbClass = cls
  if (text) { (T.fbLog = T.fbLog || []).push(text); if (T.fbLog.length > 60) T.fbLog.shift() }
  if (logLine) T.log = logLine
  const fb = $("#fb"); if (fb) { fb.textContent = text; fb.className = `feedback ${cls}` }
  const lg = $("#fbLog"); if (lg) lg.textContent = T.log
}
function trialFrame(T, ev, raw) {
  if (ev.scripted || S.task !== T) return
  const stage = T.stages[T.stageIdx]; if (!stage) return
  // engine truth: hits on the dummy, and whether it ever had a free frame between hits (= the combo dropped)
  const p2 = ev.p2
  if (p2) {
    if (T.lastHp != null && p2.health < T.lastHp - 0.01) { T.hitEvents++; if (T.firstHitAt == null) T.firstHitAt = ev.frame }
    T.lastHp = p2.health
    const locked = p2.hitstun > 0 || p2.stun > 0 || !!p2.knockdownState || !!p2.isLaunched || p2.hitstop > 0 || !p2.grounded
    if (T.firstHitAt != null && !locked && T.hitEvents < T.hitsNeeded) T.freeAfterHit++
  }
  const prev = T.prevRaw || {}; T.prevRaw = raw
  T.dirLog = T.dirLog || []; T.dirLog.push(rawToNumpad(raw, eng.facing())); if (T.dirLog.length > 30) T.dirLog.shift()
  const exp = T.steps[T.ptr]
  if (exp && exp.kind === "jump" && T.ptr <= stage.to && !T.failed && (raw.jump || raw.up) && !(prev.jump || prev.up)) {
    T.lastPress = ev.frame; T.ptr++; guideTrial(T); renderTrialSteps(T); T.endAt = ev.frame + 90
  }
  const pressed = rawButtons(raw).filter(b => b !== "jump" && !prev[b])
  if (pressed.length && T.ptr <= stage.to && !T.failed && exp && exp.kind !== "jump") {
    const want = exp.buttons || []
    const okBtn = want.length ? want.some(b => pressed.includes(b)) : false
    if (!okBtn) { fail(T, "Wrong button", `Expected ${want.map(btnLabel).join("+") || "a direction"}, got ${pressed.map(btnLabel).join("+")}`); return }
    if (!dirMatches(exp, T.dirLog)) { fail(T, "Wrong direction", `Hold ${(exp.dirs || []).map(d => NUMPAD_ARROW[d]).join("")} with the button`); return }
    // timing vs the verified script (gap from the previous press)
    const prevIdx = T.ptr - 1
    if (T.ptr > stage.from && T.lastPress != null && prevIdx >= stage.from) {
      const expGap = T.at[T.ptr] - T.at[prevIdx], gap = ev.frame - T.lastPress, d = gap - expGap
      if (Math.abs(d) <= 2) setFb(T, "Perfect", "good", `step ${T.ptr + 1}: on time (${gap}f after the last press)`)
      else if (d < 0) setFb(T, `Early by ${-d}f`, "warn", `step ${T.ptr + 1}: ${gap}f after the last press, target ${expGap}f`)
      else setFb(T, `Late by ${d}f`, "warn", `step ${T.ptr + 1}: ${gap}f after the last press, target ${expGap}f`)
    } else setFb(T, "Good", "good", `step ${T.ptr + 1} input correct`)
    T.lastPress = ev.frame
    T.ptr++
    guideTrial(T); renderTrialSteps(T)
    T.endAt = ev.frame + (T.ptr > stage.to ? 70 : 90)
  }
  if (T.freeAfterHit > (T.combo?.gapAllowed || 0) && !T.failed) return fail(T, T.ptr > stage.to ? "Dropped — the hits didn't link" : "Too slow — the combo dropped", T.log)
  if (T.ptr > stage.to && T.hitEvents >= T.hitsNeeded && !T.failed) return stageCleared(T)
  if (T.endAt != null && ev.frame >= T.endAt && !T.failed) fail(T, T.ptr > stage.to ? "Dropped — the hits didn't link" : "Too slow — the combo dropped", T.log)
}
function dirMatches(exp, log) {
  const want = exp.dirs || []
  if (!want.length) return true
  const recent = log.slice(-20)
  if (exp.kind === "motion") { let j = 0; for (const n of recent) if (n === want[j]) { j++; if (j === want.length) return true }; return false }
  const last = recent[recent.length - 1], w = want[0]
  return last === w || (w === 2 && [1, 2, 3].includes(last)) || (w === 8 && [7, 8, 9].includes(last))
}
function renderTrialSteps(T) { if (S.mode === "trial") { const P = $("#modePanel"); const keep = { fb: T.fb, cls: T.fbClass }; P.innerHTML = trialHTML(); setFb(T, keep.fb, keep.cls) } }
function fail(T, msg, why) {
  T.failed = true; T.attempts++
  setFb(T, msg, "bad", why || T.log); sfx("bad")
  setTimeout(() => { if (S.task === T) armStage(T).then(() => setFb(T, msg, "bad", why || T.log)) }, 900)
}
function stageCleared(T) {
  const stage = T.stages[T.stageIdx]
  for (let i = stage.from; i <= stage.to; i++) T.clearedSteps.add(i)
  T.attempts++; T.stageIdx++
  sfx("good"); setFb(T, `Cleared: ${stage.label}`, "good", `${T.hitEvents} hit${T.hitEvents > 1 ? "s" : ""} connected`)
  T.endAt = null; T.ptr = 999
  setTimeout(() => { if (S.task === T) armStage(T).then(() => { if (!T.done) setFb(T, `Cleared: ${stage.label}`, "good") }) }, 900)
}
function trialComplete(T) {
  S.mastered.combos[T.combo.id] = new Date().toISOString().slice(0, 10); lsSet(LS.mastered, S.mastered)
  setFb(T, "MASTERED!", "good", `${T.combo.name} — ${T.attempts} attempts`)
  toast(`★ ${T.combo.name} mastered`, 2400); sfx("good")
  T.done = true; T.onFrame = null
  if (ctl) ctl.setGuide(null)
  renderMode(); setFb(T, "MASTERED!", "good")
}

// ── control focus ───────────────────────────────────────────────────────────────────────────────────────────
function controlBadge() { return S.device === "pad" ? "CONTROL · PAD  (Create = menu)" : "CONTROL · KEYBOARD  (Esc = menu)" }
function takeControl(on) {
  S.focus = on ? "arena" : "ui"
  $("#arenaBox").classList.toggle("controlled", on)
  $("#controlBtn").textContent = on ? "■ RELEASE CONTROL" : "▶ TAKE CONTROL"
  if (!on) { for (const k of [...S.heldKeys]) eng.forwardKey("keyup", k); S.heldKeys.clear() }
  eng.setInputType(on && S.device === "pad" ? "controller" : "keyboard")
  if (!S.task || S.task.kind !== "demo") $("#arenaBadge").textContent = on ? controlBadge() : ""
  updateHelp()
}
function updateHelp() {
  const pad = S.device === "pad"
  const items = S.focus === "arena"
    ? (pad ? ["<b>Create</b> back to menu", "<b>D-pad / stick</b> move", "<b>buttons</b> fight"] : ["<b>Esc</b> back to menu", "your keys fight"])
    : (pad ? ["<b>D-pad</b> navigate", "<b>✕</b> select", "<b>○</b> back", "<b>L1 / R1</b> mode", "<b>Create</b> fighter", "<b>Options</b> take control"]
           : ["<b>Arrows</b> navigate", "<b>Enter</b> select", "<b>Esc</b> back", "<b>Q / E</b> mode", "<b>C</b> fighter", "<b>T</b> take control"])
  $("#helpBar").innerHTML = items.map(i => `<span>${i}</span>`).join("")
}

// ── hitbox / hurtbox overlay (hurtboxes from the game's own hurtbox(); projected with its camera) ─────────────
function drawBoxes() {
  const cv = $("#overlay"), box = $("#arenaBox").getBoundingClientRect()
  if (cv.width !== Math.round(box.width) || cv.height !== Math.round(box.height)) { cv.width = Math.round(box.width); cv.height = Math.round(box.height) }
  const ctx = cv.getContext("2d"); ctx.clearRect(0, 0, cv.width, cv.height)
  if (!S.boxes) return
  const gc = eng.w?.document.querySelector("canvas"); if (!gc) return
  // game canvas rect is in the iframe's own (1600x900) CSS space → scale into the arena box
  const V = S.view || { K: S.arenaScale || 1, tx: 0, ty: 0 }, k = V.K, cam = eng.h.camera(), r = gc.getBoundingClientRect(), sx = r.width / gc.width * k, sy = r.height / gc.height * k
  const tx = wx => ((wx - cam.x) * cam.zoom + gc.width / 2) * sx + r.left * k + V.tx, ty = wy => ((wy - cam.y) * cam.zoom + gc.height / 2) * sy + r.top * k + V.ty
  for (const [who, col] of [["p1", "rgba(74,222,128,.9)"], ["p2", "rgba(96,165,250,.9)"]]) {
    const hb = eng.h.hurtbox(who); if (!hb) continue
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
    ctx.strokeRect(tx(hb.x), ty(hb.y), hb.w * cam.zoom * sx, hb.h * cam.zoom * sy)
    ctx.setLineDash([]); ctx.fillStyle = col; ctx.font = "700 12px system-ui"; ctx.fillText(`${who.toUpperCase()} hurtbox`, tx(hb.x), ty(hb.y) - 4)
  }
}

// ── devices + navigation ────────────────────────────────────────────────────────────────────────────────────
function firstPad() { const ps = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; return ps.find(p => p.connected !== false) || null }
let padPrev = {}, padRepeat = {}
function setDevice(d) {
  if (S.device === d) return
  S.device = d
  if (ctl) { ctl.setDevice(d === "pad" ? "pad" : "keyboard"); ctl.setGlyphs(padGlyphs()) }
  eng.setInputType(S.focus === "arena" && d === "pad" ? "controller" : "keyboard")
  if (S.focus === "arena" && (!S.task || S.task.kind !== "demo")) $("#arenaBadge").textContent = controlBadge()
  updateHelp(); renderMode()
}
function uiLoop() {
  const gp = firstPad()
  if (gp) {
    const b = i => !!gp.buttons[i]?.pressed
    const any = gp.buttons.some(x => x && x.pressed) || Math.hypot(gp.axes[0] || 0, gp.axes[1] || 0) > 0.5
    if (any) setDevice("pad")
    const edge = i => b(i) && !padPrev[i]
    const dir = navDirFromPad(gp)
    if (S.focus === "arena") {
      if (edge(8) || edge(17) || edge(9)) { takeControl(false); stopTaskIfInteractive(); sfx("back") }
    } else {
      if (dir) { const t = performance.now(); if (!padRepeat.dir || padRepeat.dir !== dir || t - padRepeat.t > (padRepeat.n ? 130 : 330)) { padRepeat = { dir, t, n: padRepeat.dir === dir ? (padRepeat.n || 0) + 1 : 0 }; navMove(dir) } } else padRepeat = {}
      if (edge(0)) activateFocused()
      if (edge(1)) goBack()
      if (edge(4)) cycleMode(-1)
      if (edge(5)) cycleMode(1)
      if (edge(8) || edge(17)) openPicker()
      if (edge(9)) { if (pickerOpen()) closePicker(); takeControl(true) }
    }
    padPrev = Object.fromEntries(gp.buttons.map((x, i) => [i, !!x?.pressed]))
    if (ctl && S.device === "pad" && (!S.task || S.task.kind !== "demo")) ctl.setLive(gp)
  }
  if (ctl && S.device === "keyboard" && (!S.task || S.task.kind !== "demo")) ctl.setLive(S.viewKeys)
  if (ctl && S.task?.kind === "demo" && eng.playing) {
    // show the scripted presses as live presses too (the controller "plays back" the inputs)
    const raw = eng._script?.frames[Math.max(0, eng._script.i - 1)] || {}
    if (S.device === "pad") ctl.setLive(rawToPad(raw)); else ctl.setLive(rawToKeys(raw))
  }
  renderHistory()
  watchMatch()
  requestAnimationFrame(uiLoop)
}
// The embedded match must stay in battle. If something ends it (e.g. a demo KOs the dummy) the Lab reloads the
// fighter instead of freezing on a results screen.
let _offBattleSince = 0, _recovering = false
function watchMatch() {
  if (!eng.ready || _recovering) return
  const gs = eng.gameState()
  if (gs === "battle" || gs === "paused" || gs == null) { _offBattleSince = 0; return }
  const now = performance.now()
  if (!_offBattleSince) { _offBattleSince = now; return }
  if (now - _offBattleSince > 1000) {
    _recovering = true; _offBattleSince = 0
    stopTask(); toast("The match ended — reloading the fighter")
    selectChar(S.key).finally(() => { _recovering = false })
  }
}
function rawToPad(raw) {
  const L = eng.mods.padLayout, buttons = Array.from({ length: 18 }, () => ({ pressed: false, value: 0 }))
  for (const row of L.PAD_LAYOUT) if (raw[row.action]) buttons[row.button] = { pressed: true, value: 1 }
  if (raw.upAttack) buttons[L.PAD_BUTTON.light] = { pressed: true, value: 1 }
  const x = raw.right ? 1 : raw.left ? -1 : 0, y = raw.down ? 1 : (raw.up || raw.upAttack) ? -1 : 0
  return { buttons, axes: [x, y, 0, 0] }
}
function rawToKeys(raw) { const c = eng.controls?.p1 || {}, s = new Set(); for (const f of FIELDS) if (raw[f] && c[f]) s.add(c[f]); return s }
function navDirFromPad(gp) {
  const b = i => !!gp.buttons[i]?.pressed, x = gp.axes[0] || 0, y = gp.axes[1] || 0
  if (b(12) || y < -0.6) return "up"; if (b(13) || y > 0.6) return "down"; if (b(14) || x < -0.6) return "left"; if (b(15) || x > 0.6) return "right"
  return null
}
function stopTaskIfInteractive() { if (S.task && S.task.kind === "yourturn") stopTask() }
function cycleMode(d) { const i = MODES.indexOf(S.mode); setMode(MODES[(i + d + MODES.length) % MODES.length]); sfx("select"); focusFirst(".tab.active") }

// spatial navigation over .nav elements (scoped to the picker when it is open)
let focused = null
function navItems() {
  const scope = pickerOpen() ? $("#picker") : document
  return [...scope.querySelectorAll(".nav")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.disabled && e.offsetParent !== null && (pickerOpen() || !e.closest("#picker")) })
}
function setFocus(e) { if (focused) focused.classList.remove("focus"); focused = e; if (e) { e.classList.add("focus"); e.focus?.({ preventScroll: true }); e.scrollIntoView?.({ block: "nearest" }) } }
function focusFirst(sel) { const e = sel ? document.querySelector(sel) : navItems()[0]; if (e) setFocus(e) }
function navMove(dir) {
  const items = navItems(); if (!items.length) return
  if (!focused || !items.includes(focused)) return setFocus(items[0])
  const a = focused.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2
  let best = null, bs = Infinity
  for (const e of items) {
    if (e === focused) continue
    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, dx = x - ax, dy = y - ay
    const ok = dir === "up" ? dy < -4 : dir === "down" ? dy > 4 : dir === "left" ? dx < -4 : dx > 4
    if (!ok) continue
    const main = dir === "up" || dir === "down" ? Math.abs(dy) : Math.abs(dx), cross = dir === "up" || dir === "down" ? Math.abs(dx) : Math.abs(dy)
    const s = main + cross * 2.2
    if (s < bs) { bs = s; best = e }
  }
  if (best) { setFocus(best); sfx("hover") }
}
function activateFocused() { if (focused) { focused.click(); sfx("select") } }
function goBack() {
  if (pickerOpen()) return closePicker()
  if (S.task) { stopTask(); renderMode(); return }
  if (focused && focused.closest("#modePanel")) return focusFirst(".tab.active")
}

// ── picker ──────────────────────────────────────────────────────────────────────────────────────────────────
function pickerOpen() { return !$("#picker").classList.contains("hidden") }
function openPicker() {
  takeControl(false)
  $("#picker").classList.remove("hidden"); $("#search").value = ""; renderPicker(); sfx("select")
  setFocus($("#pickerList .pc.cur") || $("#pickerList .pc"))
}
const initials = n => String(n || "?").split(/[\s(]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase()
function closePicker() { $("#picker").classList.add("hidden"); sfx("back"); setFocus($("#charChip")) }
function renderPicker() {
  const q = $("#search").value.trim().toLowerCase()
  const groups = {}
  for (const r of S.roster) { if (q && !(`${r.name} ${r.universeLabel} ${r.key}`.toLowerCase().includes(q))) continue; (groups[r.universeLabel] = groups[r.universeLabel] || []).push(r) }
  $("#pickerList").innerHTML = Object.keys(groups).sort().map(u => `<div class="uni"><h3>${esc(u.toUpperCase())}</h3><div class="grid">${groups[u].map(r =>
    `<button class="pc nav${r.key === S.key ? " cur" : ""}" data-nav="picker" data-key="${esc(r.key)}">${r.portrait ? `<img loading="lazy" alt="" src="${esc(r.portrait)}" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'ini',textContent:this.dataset.ini}))" data-ini="${esc(initials(r.name))}">` : `<i class="ini">${esc(initials(r.name))}</i>`}<span>${esc(r.name)}</span></button>`).join("")}</div></div>`).join("") || `<div class="empty">No fighter matches “${esc(q)}”.</div>`
}

// ── wiring ──────────────────────────────────────────────────────────────────────────────────────────────────
function wireUI() {
  $("#charChip").onclick = openPicker
  $("#pickerClose").onclick = closePicker
  $("#search").oninput = () => { renderPicker() }
  $("#pickerList").onclick = e => { const b = e.target.closest(".pc"); if (b) { closePicker(); selectChar(b.dataset.key) } }
  for (const t of document.querySelectorAll(".tab")) t.onclick = () => setMode(t.dataset.mode)
  for (const b of document.querySelectorAll("[data-dummy]")) b.onclick = () => { eng.setDummy(b.dataset.dummy); markDummy(); toast(`Dummy: ${b.dataset.dummy}`) }
  markDummy()
  $("#resetBtn").onclick = () => { eng.reset(); toast("Positions reset") }
  $("#controlBtn").onclick = () => takeControl(S.focus !== "arena")
  $("#bigBtn").onclick = toggleBig
  if (lsGet(LS.big, false)) toggleBig()
  $("#zoomBtn").onclick = toggleZoom
  setZoom(lsGet(LS.zoom2, 1.25))   // a mild zoom by default; the button cycles OFF / 1.25× / 1.5×
  $("#hitboxBtn").onclick = () => { S.boxes = !S.boxes; $("#hitboxBtn").textContent = `Boxes: ${S.boxes ? "ON" : "OFF"}`; if (!S.boxes) drawBoxes() }
  $("#arenaShield").onclick = () => { if (pickerOpen()) return; takeControl(true) }
  $("#modePanel").onclick = e => {
    const a = e.target.closest("[data-act]")
    if (a) return onAction(a.dataset.act)
    const mc = e.target.closest("[data-move]")
    if (mc) { const m = S.moves[+mc.dataset.move]; if (S.mode === "free") return; return demoMove(m) }
    const cc = e.target.closest("[data-combo]")
    if (cc) { S.selCombo = S.combos[+cc.dataset.combo]; renderMode(); const c = S.selCombo; const sc = comboScript(c); return runDemo({ script: sc.script, at: sc.at, steps: comboSteps(c) }) }
  }
  document.addEventListener("keydown", onKey, true)
  document.addEventListener("keyup", onKeyUp, true)
  window.addEventListener("blur", () => { for (const k of [...S.heldKeys]) eng.forwardKey("keyup", k); S.heldKeys.clear(); S.viewKeys.clear() })
  window.addEventListener("gamepadconnected", () => toast("Controller connected"))
  setFocus($(".tab.active") || $("#charChip"))
}
function markDummy() { for (const b of document.querySelectorAll("[data-dummy]")) b.classList.toggle("active", b.dataset.dummy === eng.dummy) }
// PLAY ALL: demo every move of the fighter back to back (from the selected one), scrolling the list along. Any other
// demo / mode change / fighter change interrupts it (runDemo resolves null when its task is replaced).
async function playAll() {
  if (S.playAll) { S.playAll = null; stopTask(); renderMode(); return }
  const list = S.moves.filter(m => !m.unavailable); if (!list.length) return
  const start = Math.max(0, list.indexOf(S.selMove))
  const run = S.playAll = { i: start, n: list.length }
  for (; run.i < list.length; run.i++) {
    const m = list[run.i]
    const p = demoMove(m)
    document.querySelector(".card.sel")?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    const r = await p
    if (S.playAll !== run || !r) { if (S.playAll === run) { S.playAll = null; renderMode() } return }
    const st = $("#moveStatus"); if (st) st.innerHTML = `<b>${run.i + 1} / ${run.n}</b> · ` + st.innerHTML
    await new Promise(res => setTimeout(res, 700))
    if (S.playAll !== run) return
  }
  S.playAll = null; renderMode(); toast("Played every move")
}
function toggleBig() {
  S.big = !S.big; $("#app").classList.toggle("big", S.big); lsSet(LS.big, S.big)
  $("#bigBtn").textContent = S.big ? "⛶ Normal view" : "⛶ Big view"; requestAnimationFrame(fitArena)
}
function onAction(act) {
  if (act === "playall") return playAll()
  const m = S.selMove, c = S.selCombo
  if (act === "replay" && m) return demoMove(m)
  if (act === "slow" && m) return demoMove(m, true)
  if (act === "yourturn" && m) return yourTurnMove(m)
  if ((act === "cdemo" || act === "cslow") && c) { const sc = comboScript(c); return runDemo({ script: sc.script, at: sc.at, steps: comboSteps(c), slow: act === "cslow" }) }
  if (act === "ctrial" && c) { setMode("trial"); return startTrial(c) }
  if (act === "tstart" && c) return startTrial(c)
  if (act === "tshow" && c) { const T = S.task; const sc = comboScript(c); return runDemo({ script: sc.script, at: sc.at, steps: comboSteps(c), label: "WATCH" }).then(() => { if (T && T.kind === "trial") { S.task = T; takeControl(true); armStage(T) } }) }
  if (act === "tpick" && S.combos.length) { const i = S.combos.indexOf(c); S.selCombo = S.combos[(i + 1) % S.combos.length]; stopTask(); renderMode() }
}
function onKey(e) {
  const k = (e.key || "").toLowerCase()
  if (e.target === $("#search") && !["escape", "arrowdown", "arrowup", "enter"].includes(k)) return
  setDevice("keyboard")
  S.viewKeys.add(k)   // the keyboard view is also an input tester: light every key, whatever has focus
  if (S.focus === "arena") {
    if (k === "escape") { e.preventDefault(); takeControl(false); stopTaskIfInteractive(); sfx("back"); return }
    if (k === "tab") { e.preventDefault(); return }
    e.preventDefault()
    if (!S.heldKeys.has(k)) { S.heldKeys.add(k); eng.forwardKey("keydown", k) }
    return
  }
  if (pickerOpen() && e.target === $("#search") && (k === "arrowdown" || k === "enter")) { e.preventDefault(); setFocus($("#pickerList .pc")); return }
  const map = { arrowup: "up", arrowdown: "down", arrowleft: "left", arrowright: "right" }
  if (map[k]) { e.preventDefault(); navMove(map[k]); return }
  if (k === "enter" || k === " ") { if (focused) { e.preventDefault(); activateFocused() } return }
  if (k === "escape") { e.preventDefault(); goBack(); return }
  if (k === "q") return cycleMode(-1)
  if (k === "e") return cycleMode(1)
  if (k === "c") return openPicker()
  if (k === "t") return takeControl(true)
}
function onKeyUp(e) {
  const k = (e.key || "").toLowerCase()
  S.viewKeys.delete(k)
  if (S.heldKeys.has(k)) { S.heldKeys.delete(k); eng.forwardKey("keyup", k) }
}

// test hooks: drive the trial judge with frame-exact USER input (same key path as a real keypress)
window.__lab.feedUser = async (script) => {
  for (const raw of script) {
    S.userFeed = raw
    const c = eng.controls.p1
    for (const f of FIELDS) { const k = c[f]; if (!k || f === "dash") continue; const down = !!raw[f]; if (down !== !!eng._held[k]) eng.forwardKey(down ? "keydown" : "keyup", k) }
    await eng.frames(1)
  }
  S.userFeed = null
  for (const k of Object.keys(eng._held)) if (eng._held[k]) eng.forwardKey("keyup", k)
}
window.__lab.api = { selectChar, setMode, armStage, buildStages, runMoveDemo, demoMove, startTrial, runDemo, takeControl, openPicker, closePicker, navMove, activateFocused, cycleMode, verifyCombo: (c, o) => verifyCombo(eng, c, o), comboScript, comboSteps, buildMoves: k => buildMoves(eng.mods, k) }

boot()
