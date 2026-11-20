// net/hostLink.js — MSV1-HOST "PLAY WITH A FRIEND": the friend screen (DOM overlay over the game canvas).
//
// ONE way to play online: the title screen's PLAY WITH A FRIEND button. The host gets a clickable invite link
// (opens in the browser, ready to copy and send). A friend on the same Wi-Fi opens it, clicks JOIN THE GAME,
// and both players pick their OWN fighter on their own screen; the host picks the stage; the match runs as
// the usual deterministic lockstep match.
//
// STRICTLY ADDITIVE: no game state, no sim code. It talks to the game only through window.__msOnline (an
// always-on UI seam in game.js) and to the desktop app only through window.msDesktop (electron/preload.cjs).
//   • DESKTOP APP: makes sure the host server is running, then shows the invite link while waiting.
//   • BROWSER opened from a host's link (/?room=CODE on the host's own origin): auto-joins that room.
//   • BROWSER otherwise: PLAY WITH A FRIEND explains that hosting needs the desktop app, and an "Open Desktop
//     Version" button sits in the corner of the title screen / main menu (launches the installed app).
// Hidden under automation (navigator.webdriver or ?harness) unless ?hostui=1, so tests of the game itself are
// unaffected.

import { PROTOCOL_SCHEME, RELEASES_URL, normalizeRoomCode, parseJoinInput, relayUrlFor } from "./hostConfig.js"

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

function gameApi() { return (hasDom && window.__msOnline) || null }
function waitForGame(timeoutMs = 60000) {
  return new Promise((resolve) => {
    const t0 = Date.now()
    const tick = () => { const g = gameApi(); if (g) return resolve(g); if (Date.now() - t0 > timeoutMs) return resolve(null); setTimeout(tick, 100) }
    tick()
  })
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── DOM helpers ─────────────────────────────────────────────────────────────────────────────────────────
const CSS = `
#ms-host{position:fixed;inset:0;pointer-events:none;z-index:2147483000;font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#e8f1ff}
#ms-host *{box-sizing:border-box}
#ms-host .mh-screen,#ms-host .mh-toast,#ms-host .mh-modal,#ms-host .mh-btn-float{pointer-events:auto}
#ms-host button.mh-btn-float{position:absolute;bottom:18px;right:18px;padding:10px 16px;border-radius:10px;border:1px solid #4ad5ff;background:rgba(6,18,37,.9);color:#4ad5ff;font:700 14px system-ui;cursor:pointer}
#ms-host button.mh-btn-float:hover{background:#0d2547}
#ms-host .mh-screen{position:absolute;inset:0;display:grid;place-items:center;padding:16px;background:radial-gradient(ellipse at 50% 30%,#10284f,#030914)}
#ms-host .mh-box{width:min(620px,100%);background:#0b1a33;border:1px solid #1d3a66;border-radius:16px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.55);text-align:center}
#ms-host h2{margin:0 0 6px;font:800 28px system-ui;letter-spacing:.5px}
#ms-host .mh-mut{color:#9fb3d1}#ms-host .mh-bad{color:#ff8080}#ms-host .mh-ok{color:#3ddc84}
#ms-host .mh-step{margin:14px 0 6px;color:#9fb3d1;font-size:14px}
#ms-host a.mh-link{display:block;margin:6px 0 12px;padding:14px;border-radius:10px;border:2px solid #4ad5ff;background:#061225;color:#4ad5ff;font:700 18px ui-monospace,Menlo,monospace;word-break:break-all;text-decoration:none}
#ms-host a.mh-link:hover{background:#0d2547}
#ms-host .mh-small{font-size:12px;color:#9fb3d1;word-break:break-all}
#ms-host .mh-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px}
#ms-host button{padding:10px 18px;border-radius:9px;border:0;background:#183156;color:#e8f1ff;font:700 15px system-ui;cursor:pointer}
#ms-host button.pri{background:#4ad5ff;color:#04203a}
#ms-host .mh-wait{display:inline-flex;gap:8px;align-items:center;margin-top:14px;color:#ffd27a}
#ms-host .mh-dot{width:10px;height:10px;border-radius:50%;background:#ffc94a;animation:mhp 1.2s infinite}
@keyframes mhp{50%{opacity:.25}}
#ms-host .mh-toast{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(520px,calc(100vw - 32px));background:#0b1a33;border:1px solid #4ad5ff;border-radius:10px;padding:10px 14px;display:flex;gap:10px;align-items:center}
#ms-host .mh-modal{position:absolute;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;padding:16px}
#ms-host .mh-modal>div{max-width:460px;background:#0b1a33;border:1px solid #1d3a66;border-radius:12px;padding:20px}
#ms-host .mh-modal h3{margin:0 0 6px}
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
function toast(msg, ms = 7000) {
  ensureRoot()
  root.querySelectorAll(".mh-toast").forEach((n) => n.remove())
  const t = el("div", { class: "mh-toast", role: "status" }, el("span", { text: msg }), el("button", { text: "✕", "aria-label": "Dismiss", onclick: () => t.remove() }))
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
function openReleases() { if (_desk) _desk.openReleases(); else window.open(RELEASES_URL, "_blank", "noopener") }
function mismatchModal(reason) {
  modal("Different game version", [reason, "You both need the same version of the game to play together."],
    [{ label: "Download matching version", cls: "pri", fn: openReleases }, { label: "Close" }])
}

// ── the friend screen ───────────────────────────────────────────────────────────────────────────────────
let screen = null, screenKey = ""
let starting = false        // desktop: waiting for the host server before entering the game's host flow
let startError = ""
let stopping = false        // a stop-hosting request is in flight
function hideScreen() { if (screen) { screen.remove(); screen = null; screenKey = "" } }
function showScreen(key, build) {
  ensureRoot()
  if (screen && screenKey === key) return
  const next = el("div", { class: "mh-screen", role: "dialog", "aria-label": "Play with a friend" }, build())
  if (screen) screen.replaceWith(next); else root.append(next)
  screen = next; screenKey = key
}
function backToTitle() {
  starting = false; startError = ""
  const g = gameApi(); if (g) g.toTitle()
  if (_desk) _desk.stopHosting().catch(() => {})   // nothing stays listening once you leave the friend screen
  hideScreen()
}
function waiting(text) { return el("div", { class: "mh-wait" }, el("span", { class: "mh-dot" }), el("span", { text })) }
function inviteLink() { return (_state && _state.lanLinks && _state.lanLinks[0]) || null }

function hostWaitingBox() {
  const link = inviteLink()
  const box = el("div", { class: "mh-box" }, el("h2", { text: "Play with a friend" }))
  if (!link) {
    box.append(el("p", { class: "mh-bad", text: "This computer doesn't seem to be on a Wi-Fi / local network, so there's no link a friend could open. Connect to Wi-Fi and try again." }))
  } else {
    box.append(
      el("div", { class: "mh-step", text: "1. Click the link — it opens in your browser, ready to copy:" }),
      el("a", { class: "mh-link", href: `${link}#invite`, target: "_blank", rel: "noopener", text: link }),
      el("div", { class: "mh-step", text: "2. Send it to your friend. They need to be on the same Wi-Fi as you." }),
      el("div", { class: "mh-step", text: "3. When they open it and press JOIN THE GAME, you both pick your own fighter." }),
      el("div", { class: "mh-row" }, el("button", { class: "pri", text: "Copy link", onclick: async (e) => {
        try { await (_desk ? _desk.copyText(link) : navigator.clipboard.writeText(link)); e.target.textContent = "Copied ✓" } catch { e.target.textContent = "Copy failed — use the link above" }
        setTimeout(() => { e.target.textContent = "Copy link" }, 2000)
      } })),
      waiting("Waiting for your friend to join…"),
    )
    if (_state && _state.publicLink) box.append(el("p", { class: "mh-small", text: `Not on the same Wi-Fi? This internet link also works: ${_state.publicLink}` }))
  }
  box.append(el("div", { class: "mh-row" }, el("button", { text: "Back", onclick: backToTitle })))
  return box
}

function render() {
  const g = gameApi()
  if (!g) return
  const st = g.state()
  const info = g.friendInfo ? g.friendInfo() : { pickOwn: false }
  if (starting) {
    return showScreen(`starting:${startError}`, () => el("div", { class: "mh-box" }, el("h2", { text: "Play with a friend" }),
      startError ? el("p", { class: "mh-bad", text: startError }) : waiting("Getting your game ready for friends…"),
      el("div", { class: "mh-row" }, startError ? el("button", { class: "pri", text: "Try again", onclick: () => { startError = ""; friendStart() } }) : null, el("button", { text: "Back", onclick: backToTitle }))))
  }
  // Back on the title / main menu and not in a friend game → stop hosting (no hidden listener left running).
  if (_desk && !info.pickOwn && (st === "start" || st === "mainMenu") && _state && _state.status === "online" && !stopping) {
    stopping = true
    _desk.stopHosting().catch(() => {}).finally(() => { stopping = false })
  }
  if (!info.pickOwn || (st !== "onlineHost" && st !== "onlineJoin")) return hideScreen()
  if (st === "onlineHost") {
    if (g.status() === "error") {
      return showScreen(`herr:${g.error()}`, () => el("div", { class: "mh-box" }, el("h2", { text: "Play with a friend" }), el("p", { class: "mh-bad", text: g.error() || "Something went wrong." }), el("div", { class: "mh-row" }, el("button", { text: "Back", onclick: backToTitle }))))
    }
    if (info.locked) {
      return showScreen(`hlock`, () => el("div", { class: "mh-box" }, el("h2", { text: "You're locked in!" }), waiting("Waiting for your friend to pick their fighter…"), el("div", { class: "mh-row" }, el("button", { text: "Leave", onclick: backToTitle }))))
    }
    return showScreen(`hwait:${inviteLink()}:${_state && _state.publicLink}`, hostWaitingBox)
  }
  // joiner
  const s = g.status()
  if (s === "error") {
    const err = g.error() || "Could not join."
    if (/mismatch/i.test(err)) { mismatchModal(err.replace(/^host rejected connection: /, "")); g.toTitle(); return hideScreen() }
    return showScreen(`jerr:${err}`, () => el("div", { class: "mh-box" }, el("h2", { text: "Couldn't join" }), el("p", { class: "mh-bad", text: /left/.test(err) ? "Your friend left the game." : err }), el("p", { class: "mh-mut", text: "Ask your friend for a new link, and make sure you're both on the same Wi-Fi." }), el("div", { class: "mh-row" }, el("button", { class: "pri", text: "Back to title", onclick: backToTitle }))))
  }
  if (info.locked) {
    const who = info.peerName ? `Your friend picked ${info.peerName}. ` : ""
    return showScreen(`jlock:${who}`, () => el("div", { class: "mh-box" }, el("h2", { text: "You're locked in!" }), el("p", { class: "mh-mut", text: who }), waiting("Waiting for your friend to finish picking and choose the stage…")))
  }
  return showScreen("jconn", () => el("div", { class: "mh-box" }, el("h2", { text: "Joining your friend's game…" }), waiting("Connecting…")))
}

// Title-screen PLAY WITH A FRIEND → game.js asks us first (window.__msFriendStart). Return true = handled.
function friendStart() {
  const g = gameApi()
  if (!g) return false
  if (!_desk) {
    modal("Hosting needs the desktop app", [
      "To start a game for friends, open Multiverse Smash in the desktop app and press PLAY WITH A FRIEND there.",
      "To join a friend instead, open the link they sent you.",
    ], [{ label: "Open the desktop app", cls: "pri", fn: () => openDesktopApp() }, { label: "Download the desktop app", fn: openReleases }, { label: "Close" }])
    return true
  }
  if (_state && _state.status === "online") { g.friend(); return true }
  starting = true; startError = ""; render()
  ;(async () => {
    try {
      if (!_state || _state.status === "offline") await _desk.startHosting()
      const t0 = Date.now()
      while (!(_state && _state.status === "online") && Date.now() - t0 < 20000) {
        _state = await _desk.getState().catch(() => _state)
        await sleep(250)
      }
      if (!starting) return                      // user pressed Back
      if (!(_state && _state.status === "online")) { startError = (_state && _state.message) || "Couldn't start hosting. Check that the app is allowed through your firewall, then try again."; return render() }
      starting = false
      g.friend()
    } catch (e) { startError = String((e && e.message) || e); render() }
  })()
  return true
}

// ── BROWSER: the "Open Desktop Version" button (title screen / main menu) ─────────────────────────────────
let desktopBtn = null
function openDesktopApp(url = `${PROTOCOL_SCHEME}://open`) {
  // A custom-protocol launch gives the page no success signal; if the OS hands off to the app, this page loses
  // focus / becomes hidden. No blur within ~1.5 s → assume the app is not installed. One attempt per click.
  let left = false
  const mark = () => { left = true }
  window.addEventListener("blur", mark, { once: true })
  document.addEventListener("visibilitychange", mark, { once: true })
  window.location.href = url
  setTimeout(() => {
    window.removeEventListener("blur", mark); document.removeEventListener("visibilitychange", mark)
    if (left) return
    modal("Desktop app not found", ["It looks like Multiverse Smash isn't installed on this computer (or your browser blocked the request)."],
      [{ label: "Download", cls: "pri", fn: openReleases }, { label: "Keep playing in the browser" }])
  }, 1500)
}
function updateDesktopBtn() {
  if (!desktopBtn) return
  const g = gameApi()
  const st = g ? g.state() : "start"
  const home = (st === "start" || st === "mainMenu") && !(g && g.inMatch())
  desktopBtn.style.display = home ? "" : "none"
}

// ── desktop: a multiversesmash://join link (or pasted link) → join that room ────────────────────────────────
async function desktopJoin(link) {
  const r = await _desk.checkRoom(link).catch(() => null)
  if (!r || !r.ok) {
    if (r && r.mismatch) return mismatchModal(r.reason)
    return toast((r && r.reason) || "Could not join.")
  }
  const g = await waitForGame()
  if (!g) return toast("The game is still loading — try again in a moment.")
  if (g.inMatch()) return toast("Finish the current match first.")
  g.join(r.relayUrl)
}
function handleJoinRequest(r) {
  if (!r) return
  if (!r.ok) return toast(r.reason || "That link could not be opened.")
  const p = parseJoinInput(`${r.origin}/join?room=${r.room}`)
  if (p.kind === "link") desktopJoin(`${p.origin}/join?room=${p.room}`)
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
    }
    if (automated) return
    window.__msFriendStart = friendStart
    if (_desk) {
      _desk.onJoinRequest((r) => handleJoinRequest(r))
      _desk.takePendingJoin().then((p) => { if (p) handleJoinRequest(p) }).catch(() => {})
      _desk.ackNotice && _desk.ackNotice().catch(() => {})   // the old first-run notice is gone; never show it
    } else {
      const room = normalizeRoomCode(params.get("room"))
      if (room) {
        // Opened from a friend's link: we were served by the host's own server, so location.origin IS the host.
        waitForGame().then((g) => {
          if (!g) return toast("The game did not finish loading.")
          g.join(relayUrlFor(location.origin, room))
        })
      } else {
        ensureRoot()
        desktopBtn = el("button", { class: "mh-btn-float", text: "Open Desktop Version", title: "Launch the installed desktop app (it can host games for friends)", onclick: () => openDesktopApp() })
        root.append(desktopBtn)
        setInterval(updateDesktopBtn, 250)
      }
    }
    setInterval(render, 200)
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot, { once: true })
}
