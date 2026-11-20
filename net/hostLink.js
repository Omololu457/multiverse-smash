// net/hostLink.js — MSV1-HOST: in-page host/join UI (browser module, DOM overlay over the game canvas).
//
// STRICTLY ADDITIVE: no game state, no sim code. It talks to the game only through window.__msOnline (a tiny
// always-on seam in game.js: join(url) / host() / status() / state()) and to the desktop app only through
// window.msDesktop (electron/preload.cjs). Three modes:
//   • DESKTOP APP (window.msDesktop): hosting badge + "Hosting online" panel (link, code, Copy Link, players +
//     ping, Stop/Start Hosting, auto-host setting, first-run notice) and a Join box (paste a link).
//   • BROWSER, opened from a host's link (/?room=CODE on the host's own origin): auto-joins that room.
//   • BROWSER, plain website: an "Open Desktop Version" button on the main menu (multiversesmash://open), with
//     a "Desktop app not found" fallback dialog (Download from GitHub Releases / Keep playing in the browser).
// Hidden under automation (navigator.webdriver or ?harness) unless ?hostui=1, so tests/screenshots of the game
// itself are unaffected.

import {
  PROTOCOL_SCHEME, RELEASES_URL, normalizeRoomCode, parseJoinInput, relayUrlFor, desktopJoinUrl,
} from "./hostConfig.js"

const hasDom = typeof window !== "undefined" && typeof document !== "undefined"
let _desk = null          // window.msDesktop when running inside the desktop app
let _state = null         // last host state from the main process

// Used by onlineMatch.connect(): in the desktop app, while hosting, the HOST role connects to its own room on
// the host server (seat p1, authenticated by the room's host token) instead of the plain LAN relay.
export function hostRelayUrl() {
  const s = _state
  if (!s || s.status !== "online" || !s.port || !s.room || !s.hostToken) return null
  return `ws://127.0.0.1:${s.port}/ws?room=${encodeURIComponent(s.room)}&host=${encodeURIComponent(s.hostToken)}`
}

const IN_FIGHT = new Set(["battle", "roundBreak", "matchEnd", "paused", "victory", "intro", "ffaBattle", "cutscene",
  "storyIntro", "arcadeRivalIntro", "arcadeEnding", "comboTrials"])
const HOME = new Set(["start", "mainMenu"])

function gameApi() { return (hasDom && window.__msOnline) || null }
function waitForGame(timeoutMs = 60000) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const tick = () => { const g = gameApi(); if (g) return resolve(g); if (Date.now() - t0 > timeoutMs) return resolve(null); setTimeout(tick, 100) }
    tick()
  })
}

// ── DOM helpers ─────────────────────────────────────────────────────────────────────────────────────────
const CSS = `
#ms-host{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:13px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8f1ff}
#ms-host *{box-sizing:border-box}
#ms-host .mh-badge,#ms-host .mh-card,#ms-host .mh-toast,#ms-host .mh-modal,#ms-host .mh-btn-float{pointer-events:auto}
#ms-host .mh-badge{position:absolute;top:10px;right:10px;display:flex;gap:8px;align-items:center;padding:6px 12px;border-radius:999px;background:rgba(6,18,37,.88);border:1px solid #1d3a66;cursor:pointer;user-select:none}
#ms-host .mh-dot{width:9px;height:9px;border-radius:50%;background:#6b7c96}
#ms-host .mh-dot.on{background:#3ddc84;box-shadow:0 0 8px #3ddc84}#ms-host .mh-dot.wait{background:#ffc94a}#ms-host .mh-dot.lan{background:#4ad5ff}
#ms-host .mh-card{position:absolute;top:48px;right:10px;width:min(380px,calc(100vw - 20px));max-height:calc(100vh - 60px);overflow:auto;background:#0b1a33;border:1px solid #1d3a66;border-radius:12px;padding:14px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
#ms-host h3{margin:0 0 6px;font-size:15px}#ms-host .mh-mut{color:#9fb3d1}#ms-host .mh-bad{color:#ff8080}
#ms-host .mh-code{font:700 26px ui-monospace,Menlo,monospace;letter-spacing:4px;color:#4ad5ff}
#ms-host .mh-row{display:flex;gap:6px;align-items:center;margin:6px 0}
#ms-host input[type=text]{flex:1;min-width:0;padding:7px 8px;border-radius:7px;border:1px solid #2a4a7a;background:#061225;color:#e8f1ff;font:12px ui-monospace,Menlo,monospace}
#ms-host button{padding:7px 10px;border-radius:7px;border:0;background:#183156;color:#e8f1ff;font:600 12px system-ui;cursor:pointer;white-space:nowrap}
#ms-host button.pri{background:#4ad5ff;color:#04203a}#ms-host button.warn{background:#5a1d2a;color:#ffd6dc}
#ms-host button:disabled{opacity:.5;cursor:default}
#ms-host .mh-sec{border-top:1px solid #1d3a66;margin-top:10px;padding-top:10px}
#ms-host ul{list-style:none;margin:4px 0;padding:0}#ms-host li{display:flex;justify-content:space-between;padding:3px 0}
#ms-host .mh-toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(520px,calc(100vw - 32px));background:#0b1a33;border:1px solid #4ad5ff;border-radius:10px;padding:10px 14px;display:flex;gap:10px;align-items:center}
#ms-host .mh-modal{position:absolute;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px}
#ms-host .mh-modal>div{max-width:440px;background:#0b1a33;border:1px solid #1d3a66;border-radius:12px;padding:18px}
#ms-host .mh-btn-float{position:absolute;bottom:18px;right:18px;padding:10px 16px;border-radius:10px;border:1px solid #4ad5ff;background:rgba(6,18,37,.9);color:#4ad5ff;font:700 14px system-ui;cursor:pointer}
`
let root = null
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "onclick") e.addEventListener("click", v)
    else if (k === "class") e.className = v
    else if (k === "text") e.textContent = v
    else e.setAttribute(k, v)
  }
  for (const k of kids) if (k != null) e.append(k)
  return e
}
function ensureRoot() {
  if (root) return root
  const st = document.createElement("style"); st.textContent = CSS; document.head.append(st)
  root = el("div", { id: "ms-host" })
  // keep keyboard/mouse inside the overlay away from the game's document/window listeners
  for (const ev of ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click", "pointerdown", "pointerup", "wheel", "touchstart", "touchend"]) {
    root.addEventListener(ev, (e) => { if (e.target !== root) e.stopPropagation() })
  }
  document.body.append(root)
  return root
}
function toast(msg, actions = [], ms = 9000) {
  ensureRoot()
  root.querySelectorAll(".mh-toast").forEach((n) => n.remove())
  const t = el("div", { class: "mh-toast", role: "status" }, el("span", { text: msg }))
  for (const a of actions) t.append(el("button", { class: a.pri ? "pri" : "", text: a.label, onclick: () => { t.remove(); a.fn() } }))
  t.append(el("button", { text: "✕", "aria-label": "Dismiss", onclick: () => t.remove() }))
  root.append(t)
  if (ms) setTimeout(() => t.remove(), ms)
  return t
}
function modal(title, body, actions) {
  ensureRoot()
  const box = el("div", { role: "dialog", "aria-modal": "true" }, el("h3", { text: title }))
  for (const p of [].concat(body)) box.append(typeof p === "string" ? el("p", { class: "mh-mut", text: p }) : p)
  const row = el("div", { class: "mh-row" })
  const m = el("div", { class: "mh-modal" }, box)
  for (const a of actions) row.append(el("button", { class: a.cls || "", text: a.label, onclick: () => { m.remove(); a.fn && a.fn() } }))
  box.append(row)
  root.append(m)
  return m
}

// ── DESKTOP: hosting badge + panel ─────────────────────────────────────────────────────────────────────
let badge = null, card = null, cardOpen = false, settings = { autoHost: true, noticeShown: true }
let lastP2 = false
function statusLabel(s) {
  if (!s || s.status === "offline") return { dot: "", text: "Hosting off" }
  if (s.status === "starting") return { dot: "wait", text: "Starting…" }
  if (s.route === "lan") return { dot: "lan", text: `Online (LAN only) · ${s.room}` }
  return { dot: "on", text: `Hosting online · ${s.room}` }
}
function renderBadge() {
  ensureRoot()
  if (!badge) { badge = el("div", { class: "mh-badge", title: "Hosting — click for details" }); badge.addEventListener("click", () => { cardOpen = !cardOpen; renderCard() }); root.append(badge) }
  const l = statusLabel(_state)
  badge.replaceChildren(el("span", { class: `mh-dot ${l.dot}` }), el("span", { text: l.text }))
}
function copyRow(value, label = "Copy Link") {
  const inp = el("input", { type: "text", readonly: "", value: value || "" })
  return el("div", { class: "mh-row" }, inp, el("button", { class: "pri", text: label, onclick: async (e) => { await _desk.copyText(value); e.target.textContent = "Copied ✓"; setTimeout(() => { e.target.textContent = label }, 1500) } }))
}
function renderCard() {
  ensureRoot()
  if (!cardOpen) { if (card) { card.remove(); card = null } return }
  const s = _state || { status: "offline" }
  const next = el("div", { class: "mh-card", role: "region", "aria-label": "Hosting online" })
  const l = statusLabel(s)
  next.append(el("h3", {}, el("span", { class: `mh-dot ${l.dot}`, style: "display:inline-block;margin-right:8px" }),
    document.createTextNode(s.status === "online" ? (s.route === "lan" ? "Online — LAN only" : "Hosting online") : s.status === "starting" ? "Starting" : "Offline")))
  if (s.message) next.append(el("div", { class: s.route === "lan" && s.status === "online" && /unavailable/.test(s.message) ? "mh-bad" : "mh-mut", text: s.message }))
  if (s.status === "online") {
    next.append(el("div", { class: "mh-sec" }, el("div", { class: "mh-mut", text: "Room code" }), el("div", { class: "mh-code", text: s.room })))
    if (s.publicLink) next.append(el("div", { class: "mh-mut", text: "Join link (send this to friends):" }), copyRow(s.publicLink))
    for (const lan of s.lanLinks || []) next.append(el("div", { class: "mh-mut", text: "Same Wi-Fi / LAN link:" }), copyRow(lan, "Copy"))
    const players = s.players || []
    const ul = el("ul")
    for (const p of players) ul.append(el("li", {}, el("span", { text: `${p.side === "p1" ? "P1" : "P2"} ${p.host ? "(you)" : p.name ? `· ${p.name}` : "· friend"}` }), el("span", { class: "mh-mut", text: p.pingMs == null ? "…" : `${p.pingMs} ms` })))
    if (!players.length) ul.append(el("li", { class: "mh-mut", text: "Nobody connected yet." }))
    next.append(el("div", { class: "mh-sec" }, el("div", { class: "mh-mut", text: `Players connected: ${players.length} / 2` }), ul))
    if (players.some((p) => p.side === "p2")) next.append(el("button", { class: "pri", text: "Set up the match", onclick: () => hostPlay() }))
  }
  const ctl = el("div", { class: "mh-row mh-sec" })
  if (s.status === "offline") ctl.append(el("button", { class: "pri", text: "Start Hosting", onclick: () => _desk.startHosting() }))
  else ctl.append(el("button", { class: "warn", text: "Stop Hosting", onclick: () => _desk.stopHosting() }))
  const cb = el("input", { type: "checkbox", id: "mh-auto" }); cb.checked = settings.autoHost !== false
  cb.addEventListener("change", async () => { settings = await _desk.setAutoHost(cb.checked) })
  ctl.append(el("label", { for: "mh-auto", class: "mh-mut", style: "display:flex;gap:6px;align-items:center;margin-left:auto" }, cb, document.createTextNode("Auto-host when the app starts")))
  next.append(ctl)
  // Join a friend's game
  const jin = el("input", { type: "text", placeholder: "Paste a join link (https://…/join?room=…)", "aria-label": "Join link" })
  const jgo = el("button", { class: "pri", text: "Join", onclick: () => desktopJoinFromInput(jin.value) })
  jin.addEventListener("keydown", (e) => { if (e.key === "Enter") desktopJoinFromInput(jin.value) })
  next.append(el("div", { class: "mh-sec" }, el("div", { class: "mh-mut", text: "Join a friend's game:" }), el("div", { class: "mh-row" }, jin, jgo)))
  next.append(el("div", { class: "mh-mut", style: "margin-top:8px;font-size:11px", text: `Version ${s.appVersion || "?"} · build ${s.codeHash || "?"}` }))
  if (card) card.replaceWith(next); else root.append(next)
  card = next
}

let pendingCodeOnly = null
function desktopJoinFromInput(raw) {
  const p = parseJoinInput(raw)
  if (p.kind === "code") {
    pendingCodeOnly = p.room
    return toast(`A room code alone does not say which computer to connect to. Paste your friend's full join link for room ${p.room}.`)
  }
  if (p.kind !== "link") return toast(p.reason)
  if (pendingCodeOnly && p.room !== pendingCodeOnly) pendingCodeOnly = null
  return desktopJoin(`${p.origin}/join?room=${p.room}`)
}

async function desktopJoin(link) {
  const checking = toast("Checking the room…", [], 0)
  const r = await _desk.checkRoom(link).finally(() => checking.remove())
  if (!r || !r.ok) {
    if (r && r.mismatch) {
      return modal("Different game version", [r.reason, "Matches only start between identical builds, so the fight stays in sync."],
        [{ label: "Download matching version", cls: "pri", fn: () => _desk.openReleases() }, { label: "Close" }])
    }
    return toast((r && r.reason) || "Could not join.")
  }
  const g = await waitForGame()
  if (!g) return toast("The game is still loading — try again in a moment.")
  if (g.inMatch()) return toast("Finish the current match first.")
  cardOpen = false; renderCard()
  g.join(r.relayUrl)
  watchJoin(g)
}

function watchJoin(g) {
  const t0 = Date.now()
  const iv = setInterval(() => {
    const st = g.status(), err = g.error()
    if (st === "joined") { clearInterval(iv); toast("Connected — waiting for the host to start the match.", [], 6000) }
    else if (st === "error") {
      clearInterval(iv)
      if (/mismatch/i.test(err || "")) {
        modal("Different game version", [String(err).replace(/^host rejected connection: /, "")],
          _desk ? [{ label: "Download matching version", cls: "pri", fn: () => _desk.openReleases() }, { label: "Close" }]
                : [{ label: "Reload", cls: "pri", fn: () => location.reload() }, { label: "Close" }])
      } else toast(err || "Could not join.")
    } else if (Date.now() - t0 > 30000) clearInterval(iv)
  }, 250)
}

function hostPlay() {
  const g = gameApi()
  if (!g) return
  cardOpen = false; renderCard()
  g.host()
}

function updateVisibility() {
  const g = gameApi()
  const st = g ? g.state() : "start"
  const fighting = IN_FIGHT.has(st) || (g && g.inMatch())
  if (badge) badge.style.display = fighting ? "none" : ""
  if (card && fighting) { cardOpen = false; renderCard() }
  if (desktopBtn) desktopBtn.style.display = HOME.has(st) && !fighting ? "" : "none"
}

function onHostState(s) {
  _state = s
  renderBadge(); renderCard()
  const p2 = !!(s && s.players && s.players.some((p) => p.side === "p2"))
  if (p2 && !lastP2) {
    const g = gameApi()
    const busy = g && (g.inMatch() || ["onlineHost"].includes(g.state()))
    if (!busy) toast(`A friend joined room ${s.room}!`, [{ label: "Set up the match", pri: true, fn: hostPlay }], 20000)
  }
  lastP2 = p2
}

async function startDesktop() {
  ensureRoot()
  settings = await _desk.getSettings().catch(() => settings)
  onHostState(await _desk.getState().catch(() => null))
  _desk.onState(onHostState)
  _desk.onJoinRequest((r) => handleJoinRequest(r))
  const pending = await _desk.takePendingJoin().catch(() => null)
  if (pending) handleJoinRequest(pending)
  if (!settings.noticeShown) {
    modal("Hosting lets friends join you", [
      "While hosting is on, people on the internet who have your link can connect to THIS computer's game: they load the game files and exchange fight inputs with you.",
      "Nothing else is exposed: no other files, no saves, no system access. You can stop hosting any time from the badge in the top-right corner, and turn off auto-hosting there.",
    ], [{ label: "Got it", cls: "pri", fn: () => _desk.ackNotice() }, { label: "Stop hosting", cls: "warn", fn: () => { _desk.ackNotice(); _desk.stopHosting() } }])
  }
}
function handleJoinRequest(r) {
  if (!r) return
  if (!r.ok) return toast(r.reason || "That link could not be opened.")
  desktopJoin(`${r.origin}/join?room=${r.room}`)
}

// ── BROWSER: auto-join from a host's link, and the "Open Desktop Version" button ────────────────────────
let desktopBtn = null
function openDesktopApp(url = `${PROTOCOL_SCHEME}://open`) {
  // A custom-protocol launch gives the page no success signal; if the OS hands off to the app, this page
  // loses focus / becomes hidden. No blur within ~1.5 s → assume the app is not installed. One attempt per
  // click, never automatic, never repeated.
  let left = false
  const mark = () => { left = true }
  window.addEventListener("blur", mark, { once: true })
  document.addEventListener("visibilitychange", mark, { once: true })
  window.location.href = url
  setTimeout(() => {
    window.removeEventListener("blur", mark); document.removeEventListener("visibilitychange", mark)
    if (left) return
    modal("Desktop app not found", ["It looks like Multiverse Smash isn't installed on this computer (or your browser blocked the request)."],
      [{ label: "Download", cls: "pri", fn: () => window.open(RELEASES_URL, "_blank", "noopener") }, { label: "Keep playing in the browser" }])
  }, 1500)
}
function startBrowser(params) {
  const room = normalizeRoomCode(params.get("room"))
  if (room) {
    // We were served by the host's own server, so location.origin IS the host. Join its room.
    ensureRoot()
    const t = toast(`Joining room ${room}…`, [{ label: "Open in desktop app", fn: () => openDesktopApp(desktopJoinUrl(location.origin, room)) }], 0)
    waitForGame().then((g) => {
      t.remove()
      if (!g) return toast("The game did not finish loading.")
      g.join(relayUrlFor(location.origin, room))
      watchJoin(g)
    })
    return
  }
  ensureRoot()
  desktopBtn = el("button", { class: "mh-btn-float", text: "Open Desktop Version", title: "Launch the installed desktop app (it hosts online games)", onclick: () => openDesktopApp() })
  root.append(desktopBtn)
}

// ── boot ──────────────────────────────────────────────────────────────────────────────────────────────
if (hasDom) {
  let params
  try { params = new URLSearchParams(location.search) } catch { params = new URLSearchParams() }
  const automated = (params.has("harness") || (typeof navigator !== "undefined" && navigator.webdriver)) && !params.has("hostui")
  _desk = window.msDesktop && window.msDesktop.isDesktop ? window.msDesktop : null
  const boot = () => {
    if (_desk) {
      // hosting state is needed by onlineMatch even when the UI is hidden under automation
      _desk.getState().then((s) => { _state = s }).catch(() => {})
      _desk.onState((s) => { _state = s })
      if (!automated) startDesktop()
    } else if (!automated) startBrowser(params)
    if (!automated) setInterval(updateVisibility, 250)
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot, { once: true })
}
