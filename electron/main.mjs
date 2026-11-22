// electron/main.mjs — MINIMAL desktop-wrapper proof-of-concept.
//
// The game is a pure static web app (ES modules + <script type=importmap> + relative image/mp3 assets).
// Chromium BLOCKS module scripts loaded over file:// (origin becomes "null" → CORS), so we can't just
// point Electron at index.html on disk. Instead we do the clean thing: run the project's OWN dev-server
// logic (the exact live import-map injection from tools/serve.mjs / stamp_version.mjs) on a random
// localhost port inside the Electron main process, then load http://127.0.0.1:PORT. This makes the
// Electron runtime byte-for-byte identical to a real browser / GitHub Pages — so ZERO game-code changes.
import { app, BrowserWindow, Menu, shell, ipcMain, clipboard } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock, MARK_END } from "../tools/stamp_version.mjs";
import { startLanServer, lanAddresses } from "../net/lanServer.mjs";   // LAN multiplayer (Stage 3): relay + IP discovery
import { createHostController } from "./host.js";                    // MSV1-HOST: auto online host
import { buildClientManifest } from "../net/clientManifest.mjs";
import { computeVersion } from "../tools/stamp_version.mjs";
import { PROTOCOL_SCHEME, RELEASES_URL, parseJoinInput, relayUrlFor } from "../net/hostConfig.js";

// MSV1-HOST: MS_PROFILE=<name> gives a separate userData dir (and so a separate single-instance lock) — used to
// run a SECOND desktop instance on one machine for testing a desktop-to-desktop join.
if (process.env.MS_PROFILE && /^[\w-]{1,32}$/.test(process.env.MS_PROFILE)) {
  app.setPath("userData", path.join(app.getPath("appData"), `multiverse-smash-desktop-${process.env.MS_PROFILE}`));
}

// ── MSV1-HOST: single instance + multiversesmash:// protocol ──────────────────────────────────────────
// A second launch (e.g. the website's "Open Desktop Version" button, or a join link) must NOT start a second
// game: it hands its URL to the running app and exits. macOS delivers protocol URLs via "open-url";
// Windows/Linux pass them on the second instance's argv.
let pendingProtocolUrl = (process.argv.find((a) => typeof a === "string" && a.startsWith(`${PROTOCOL_SCHEME}://`)) || null);
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
if (process.defaultApp) {
  // dev mode (`electron .`): register "electron <this app path>" as the handler
  if (process.argv.length >= 2) app.setAsDefaultProtocolClient(PROTOCOL_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_SCHEME);
}
app.on("open-url", (e, url) => { e.preventDefault(); handleProtocolUrl(url); });
app.on("second-instance", (_e, argv) => {
  const url = argv.find((a) => typeof a === "string" && a.startsWith(`${PROTOCOL_SCHEME}://`));
  focusMainWindow();
  if (url) handleProtocolUrl(url);
});

// LAN multiplayer relay (Stage 3): a ws server on ALL interfaces so a 2nd device can reach this host. The
// game (served on 127.0.0.1) connects to it as a client. Additive & best-effort — if it can't start, ONLINE
// is simply unavailable and the rest of the app is unaffected.
const LAN_PORT = +(process.env.LAN_PORT || 8787);
let LAN_RELAY_PORT = null;
try {
  if (gotLock) {
    const lan = startLanServer({ port: LAN_PORT, relay: true, log: () => {} }); LAN_RELAY_PORT = LAN_PORT;
    // EADDRINUSE arrives ASYNCHRONOUSLY as an "error" event (the try/catch never sees it): report the relay
    // as absent instead of pointing the game at whatever process owns the port. Never crashes.
    lan.wss.once("error", (e) => { console.log(`[lan] relay unavailable on ${LAN_PORT}: ${e.code || e.message}`); LAN_RELAY_PORT = null; });
  }
}
catch (e) { console.log(`[lan] relay failed to start on ${LAN_PORT}: ${e.message}`); }

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".m4a":"audio/mp4",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

// --- DURABLE SAVE TIER (/api/health + /api/save) -----------------------------------------------------
// The game persists to localStorage, but Chromium flushes DOMStorage to disk LAZILY — a crash / force-quit
// can lose recent progress (verified: kill -9 dropped a full session). account.js already ships a "save
// server" client (initSaveServerTier → GET/POST /api/save) that mirrors every save to a FILE, ahead of
// localStorage. The web dev server implements it; the Electron wrapper did not — so the durable tier was
// simply absent in the shipped app. We implement the SAME contract here, writing to a real file in the OS
// userData dir with an atomic tmp+rename (fs writes are durable immediately → survive kill -9). One file,
// same schema as everything else; no game-code changes (account.js drives it).
const SAVE_FORMAT = "multiverse-smash-save";   // account.js snapshot `format` — POST is rejected if it differs
function saveFilePaths() {
  const dir = path.join(app.getPath("userData"), "saves");
  return { dir, file: path.join(dir, "game_player_data.json"), tmp: path.join(dir, "game_player_data.json.tmp"), bak: path.join(dir, "game_player_data.bak.json") };
}
function readSaveBody(req) {
  return new Promise(resolve => { let n = 0; const c = []; req.on("data", d => { n += d.length; if (n > 1_048_576) { resolve({ tooLarge: true }); req.destroy(); return; } c.push(d); }); req.on("end", () => resolve({ text: Buffer.concat(c).toString("utf8") })); req.on("error", () => resolve({ text: "" })); });
}
function handleSaveApi(url, req, res) {
  if (url === "/api/health") { res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify({ ok: true, version: "1" })); return true; }
  if (url === "/api/lan-info") {
    // MSV1-HOST: while hosting, the in-game ONLINE (LAN) screens point at the host server (its legacy LAN path
    // joins the hosted room), so the LAN code shown in-game and the hosting panel describe the same room.
    const hs = host && host.state();
    const port = hs && hs.status === "online" && hs.port ? hs.port : LAN_RELAY_PORT;
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify({ ok: true, port, addresses: lanAddresses().map((a) => a.address) })); return true;
  }
  if (url === "/api/save" && req.method === "GET") {
    const { file } = saveFilePaths();
    fs.readFile(file, "utf8", (e, data) => { if (e || !data) { res.writeHead(204, { "cache-control": "no-store" }).end(); return; } res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(data); });
    return true;
  }
  if (url === "/api/save" && req.method === "POST") {
    readSaveBody(req).then(({ tooLarge, text }) => {
      if (tooLarge) { res.writeHead(413).end('{"ok":false,"error":"too large"}'); return; }
      let data = null; try { data = JSON.parse(text); } catch (_) { res.writeHead(400).end('{"ok":false,"error":"bad json"}'); return; }
      if (!data || data.format !== SAVE_FORMAT) { res.writeHead(400).end('{"ok":false,"error":"bad format"}'); return; }
      const { dir, file, tmp, bak } = saveFilePaths();
      try {
        fs.mkdirSync(dir, { recursive: true });
        try { if (fs.existsSync(file)) fs.copyFileSync(file, bak); } catch (_) {}   // rolling one-deep backup
        fs.writeFileSync(tmp, text); fs.renameSync(tmp, file);                       // atomic swap → durable now
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, bytes: Buffer.byteLength(text) }));
      } catch (err) { try { fs.rmSync(tmp, { force: true }); } catch (_) {} res.writeHead(500).end(JSON.stringify({ ok: false, error: String(err && err.message || err) })); }
    });
    return true;
  }
  // BETA FEEDBACK / bug capture (append-only). Same contract as the dev save-server:
  // the pause-menu "Report an Issue" prompt POSTs { text, character, stage, mode }; we
  // append a timestamped block to BETA_FEEDBACK_LOG.txt at the repo root (the tester
  // can collect it after the session). Local only — no network/backend.
  if (url === "/api/feedback" && req.method === "POST") {
    readSaveBody(req).then(({ tooLarge, text }) => {
      if (tooLarge) { res.writeHead(413).end('{"ok":false,"error":"too large"}'); return; }
      let data = null; try { data = JSON.parse(text); } catch (_) { res.writeHead(400).end('{"ok":false,"error":"bad json"}'); return; }
      const note = (data && typeof data.text === "string") ? data.text.trim() : "";
      if (!note) { res.writeHead(400).end('{"ok":false,"error":"empty feedback text"}'); return; }
      const ts = new Date().toISOString();
      const ctx = `character=${data.character || "?"}  stage=${data.stage || "?"}  mode=${data.mode || "?"}`;
      const block = `${"─".repeat(58)}\n[${ts}]  ${ctx}\n${note}\n`;
      try {
        fs.appendFileSync(path.join(REPO, "BETA_FEEDBACK_LOG.txt"), block);
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, bytes: Buffer.byteLength(block) }));
      } catch (err) { res.writeHead(500).end(JSON.stringify({ ok: false, error: String(err && err.message || err) })); }
    });
    return true;
  }
  return false;
}

// --- 1) Serve the repo exactly like tools/serve.mjs (live import-map, versioned modules) -------------
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => { try { serveLocal(req, res); } catch (e) { try { res.writeHead(500).end("error"); } catch {} } });   // MSV1-HOST: one bad request can't throw in main
    function serveLocal(req, res) {
      const url = decodeURIComponent(req.url.split("?")[0]);
      if (handleSaveApi(url, req, res)) return;   // durable save tier (health / save GET+POST) before static
      const rel = url === "/" ? "/index.html" : url;
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
      if (rel === "/index.html") {
        let html;
        try { html = fs.readFileSync(file, "utf8"); } catch (e) { res.writeHead(503, { "retry-after": "1" }).end("index.html busy"); return; }   // MSV1-HOST: never throw out of the handler
        html = injectBlock(html, buildModuleBlock().html);   // re-inject the import map live
        html = html.replace("<head>", `<head><script>window.__MS_APP_VERSION=${JSON.stringify(app.getVersion())};</script>`);   // MSV1-HOST: build id for the join handshake
        if (TEST_CODE_OVERRIDE) html = html.replace(MARK_END, `${MARK_END}<script>window.__ASSET_V=${JSON.stringify(TEST_CODE_OVERRIDE)};</script>`);
        res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
        res.end(html); return;
      }
      fs.readFile(file, (e, data) => {
        if (e) { res.writeHead(404).end("not found"); return; }
        const ext = path.extname(file);
        const headers = { "content-type": MIME[ext] || "application/octet-stream" };
        if (ext === ".js" || ext === ".mjs") headers["cache-control"] = "public, max-age=31536000, immutable";
        res.writeHead(200, headers);
        res.end(data);
      });
    }
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));   // port 0 → OS picks a free port
  });
}

// ── MSV1-HOST: host controller, settings, IPC ───────────────────────────────────────────────────────────
let mainWin = null, localOrigin = null, host = null, ensureHostBuilt = () => null;
// Test-only: pretend to be a DIFFERENT build (version-mismatch test). Hex only; never set in normal use.
const TEST_WINDOWED = process.env.MS_WINDOWED === "1";
const TEST_CODE_OVERRIDE = /^[0-9a-f]{10}$/.test(process.env.MS_TEST_CODE_OVERRIDE || "") ? process.env.MS_TEST_CODE_OVERRIDE : null;
const hostSettingsFile = () => path.join(app.getPath("userData"), "host-settings.json");
function readHostSettings() {
  // Hosting now starts from the title screen's PLAY WITH A FRIEND button (there is no always-on hosting badge
  // any more), so auto-host at launch is OFF unless MS_AUTO_HOST=1 (tests) turns it on.
  const forced = process.env.MS_AUTO_HOST === "1";
  try { const j = JSON.parse(fs.readFileSync(hostSettingsFile(), "utf8")); return { autoHost: forced, noticeShown: !!j.noticeShown }; }
  catch { return { autoHost: forced, noticeShown: false }; }
}
function writeHostSettings(patch) {
  const next = { ...readHostSettings(), ...patch };
  try { fs.mkdirSync(path.dirname(hostSettingsFile()), { recursive: true }); fs.writeFileSync(hostSettingsFile(), JSON.stringify(next, null, 2)); } catch {}
  return next;
}
function focusMainWindow() {
  if (!mainWin) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show(); mainWin.focus();
}
function pushToWindow(channel, payload) { if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(channel, payload); }
// multiversesmash://open → focus + start hosting. multiversesmash://join?link=<url>&room=<CODE> → join it.
function handleProtocolUrl(url) {
  let u; try { u = new URL(url); } catch { return; }
  if (u.protocol !== `${PROTOCOL_SCHEME}:`) return;
  if (!app.isReady() || !mainWin) { pendingProtocolUrl = url; return; }
  focusMainWindow();
  const action = (u.hostname || u.pathname.replace(/^\/+/, "")).toLowerCase();
  if (action === "open") return;   // just open/focus the app (hosting starts from PLAY WITH A FRIEND)
  if (action === "join") {
    const p = parseJoinInput(url);
    pushToWindow("host:join-request", p.kind === "link" ? { ok: true, origin: p.origin, room: p.room } : { ok: false, reason: p.reason || "That link has no host address." });
  }
}
function initHost(appVersion) {
  // Built lazily on the first start (git ls-files + hashing every module takes a few seconds; the window must
  // not wait for it).
  const manifest = new Set();
  let built = false;
  const ensureBuilt = () => {
    if (built) return;
    built = true;
    for (const f of buildClientManifest(REPO)) manifest.add(f);
    buildInfo.codeHash = TEST_CODE_OVERRIDE || computeVersion();   // == window.__ASSET_V the pages report in their hello
  };
  const buildInfo = { appVersion, codeHash: null };
  ensureHostBuilt = () => { ensureBuilt(); return buildInfo.codeHash; };
  host = createHostController({
    root: REPO, manifest, prepare: ensureBuilt,
    renderIndex: () => injectBlock(fs.readFileSync(path.join(REPO, "index.html"), "utf8"), buildModuleBlock().html),
    buildInfo,
    cacheDir: path.join(app.getPath("userData"), "cloudflared"),
    bundledCloudflaredDir: app.isPackaged ? path.join(process.resourcesPath, "cloudflared") : null,
    log: (m) => { if (process.env.HOST_LOG === "1") console.log(m); },
    onState: (s) => pushToWindow("host:state", s),
  });
}
// IPC: only our own window, loaded from our own loopback origin, may call these.
function trusted(e) {
  try { return !!mainWin && e.sender === mainWin.webContents && new URL(e.senderFrame.url).origin === localOrigin; } catch { return false; }
}
function handle(channel, fn) {
  ipcMain.handle(channel, async (e, ...args) => { if (!trusted(e)) throw new Error("forbidden"); return fn(...args); });
}
handle("host:get-state", () => host.state());
handle("host:start", () => host.start());
handle("host:stop", () => host.stop());
handle("host:get-settings", () => readHostSettings());
handle("host:set-auto-host", (on) => writeHostSettings({ autoHost: !!on }));
handle("host:ack-notice", () => writeHostSettings({ noticeShown: true }));
handle("host:copy", (text) => { clipboard.writeText(String(text).slice(0, 2048)); return true; });
handle("host:open-releases", () => shell.openExternal(RELEASES_URL).then(() => true));
handle("host:take-pending-join", () => { const u = pendingJoin; pendingJoin = null; return u; });
// Pre-flight a join link from the MAIN process (no CORS, no page access to arbitrary hosts): room exists?
// same build? Returns the room's relay URL for the in-game join.
handle("host:check-room", async (link) => {
  const p = parseJoinInput(link);
  if (p.kind !== "link") return { ok: false, reason: p.reason || "Paste the full join link (a room code alone has no host address)." };
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`${p.origin}/api/room/${p.room}?code=${encodeURIComponent(ensureHostBuilt() || "")}`, { signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    if (r.status === 429) return { ok: false, reason: "Too many attempts — wait a few minutes and try again." };
    const j = await r.json().catch(() => null);
    if (!j || !j.ok) return { ok: false, reason: "That room does not exist or has closed. Ask your friend for a new link." };
    if (j.full) return { ok: false, reason: "That room is full (4 players)." };
    if (j.compatible === false) return { ok: false, mismatch: true, hostVersion: j.hostVersion, myVersion: app.getVersion(), reason: (j.hostVersion && j.hostVersion !== app.getVersion())
      ? `Version mismatch: your friend runs version ${j.hostVersion} and you have ${app.getVersion()}. Download the matching version to join.`
      : `Different game build: you both have version ${app.getVersion()}, but the game files differ (yours ${ensureHostBuilt()}, theirs ${j.hostCode || "?"}). One of you has local changes or a different download — get the same release as your friend.` };
    return { ok: true, origin: p.origin, room: p.room, relayUrl: relayUrlFor(p.origin, p.room) };
  } catch (e) { return { ok: false, reason: `Could not reach the host (${e.name === "AbortError" ? "timed out" : e.message}).` }; }
});
let pendingJoin = null;

async function createWindow() {
  initHost(app.getVersion());
  const port = await startServer();
  localOrigin = `http://127.0.0.1:${port}`;

  // Kill the application menu entirely — no File/Edit/View menu, and (critically) no menu accelerators
  // that could open dev-tools or reload into a stray state. This is a game, so it presents as a pure
  // application surface with zero browser affordances. (autoHideMenuBar only hides the bar; this removes
  // the menu — and its Cmd/Ctrl shortcuts — outright.)
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    // fullscreen:true → the window launches NATIVE-fullscreen (item 2). Native (not the in-page web
    // Fullscreen API) means it survives menu navigation, entering/leaving a match, and alt-tab away/back
    // with no code in the game needed to "keep" it. width/height are the pre-fullscreen restore size only.
    width: TEST_WINDOWED ? 960 : 1280,
    height: TEST_WINDOWED ? 540 : 800,
    fullscreen: !TEST_WINDOWED,   // MS_WINDOWED=1 (tests only): a small window that doesn't take over the screen
    backgroundColor: "#061225",
    title: "Multiverse Smash Ultimate",
    autoHideMenuBar: true,
    show: false,                 // avoid a windowed flash before fullscreen engages; shown on ready-to-show
    // MSV1-HOST: the preload adds window.msDesktop (fixed IPC surface); sandboxed, isolated, no Node.
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, backgroundThrottling: false, preload: path.join(path.dirname(fileURLToPath(import.meta.url)), "preload.cjs") },
  });
  mainWin = win;
  win.on("closed", () => { if (mainWin === win) mainWin = null; });
  // MSV1-HOST: always log why the window/app would go away (a host vanishing mid-match must be explainable).
  win.webContents.on("render-process-gone", (_e, d) => console.log(`[app] renderer gone: ${JSON.stringify(d)}`));
  win.on("close", () => console.log(`[app] window close (quitting=${quitting})`));
  app.on("child-process-gone", (_e, d) => console.log(`[app] child process gone: ${JSON.stringify(d)}`));
  // Never let the page (or anything it loads) gain extra powers.
  win.webContents.session.setPermissionRequestHandler((_wc, perm, cb) => cb(perm === "clipboard-sanitized-write" || perm === "fullscreen"));

  // DIAGNOSTIC (DIAG=1): surface WHY the window would close on its own — renderer crash / OOM, page
  // errors, failed loads, unhandled exceptions. Prints with timestamps so a "closes shortly after"
  // can be correlated to a specific moment/asset. Inert unless DIAG=1.
  if (process.env.DIAG === "1") {
    const t0 = Date.now();
    const D = (...a) => console.log(`[DIAG +${((Date.now() - t0) / 1000).toFixed(2)}s]`, ...a);
    win.webContents.on("render-process-gone", (_e, d) => D("RENDER-PROCESS-GONE", JSON.stringify(d)));
    win.webContents.on("unresponsive", () => D("webContents UNRESPONSIVE"));
    win.webContents.on("responsive", () => D("webContents responsive again"));
    win.webContents.on("did-fail-load", (_e, ec, desc, url) => D("did-fail-load", ec, desc, url));
    win.webContents.on("console-message", (_e, level, message, line, src) => {
      if (level >= 2) D(`console[${level === 3 ? "error" : "warn"}]`, message, "@", (src || "").split("/").pop() + ":" + line);
    });
    win.webContents.on("preload-error", (_e, p, err) => D("preload-error", p, String(err)));
    win.on("close", () => D("window CLOSE event"));
    win.on("closed", () => D("window CLOSED"));
    app.on("render-process-gone", (_e, _wc, d) => D("app render-process-gone", JSON.stringify(d)));
    app.on("child-process-gone", (_e, d) => D("app CHILD-PROCESS-GONE", JSON.stringify(d)));
    app.on("before-quit", () => D("app BEFORE-QUIT"));
    app.on("will-quit", () => D("app WILL-QUIT"));
    process.on("uncaughtException", (e) => D("main UNCAUGHT-EXCEPTION", e && (e.stack || e.message)));
    process.on("unhandledRejection", (e) => D("main UNHANDLED-REJECTION", String(e)));
    // Mirror renderer-side JS errors + heap usage up to the main console.
    win.webContents.on("did-finish-load", () => {
      win.webContents.executeJavaScript(`
        window.addEventListener("error", e => console.error("WINDOW-ERROR: " + (e.error && e.error.stack || e.message) + " @ " + e.filename + ":" + e.lineno));
        window.addEventListener("unhandledrejection", e => console.error("WINDOW-REJECTION: " + (e.reason && e.reason.stack || e.reason)));
        setInterval(() => { if (performance.memory) console.warn("HEAP " + Math.round(performance.memory.usedJSHeapSize/1048576) + "/" + Math.round(performance.memory.jsHeapSizeLimit/1048576) + " MB"); }, 1000);
        void 0;
      `, true).catch(() => {});
    });
    D("DIAG logging armed");
  }

  // One clean dedicated window, no browser escape hatches (item 1):
  //  • Deny any window.open / target=_blank → route real external links to the OS browser, never a new
  //    in-app Chromium window that would look like (and be) a browser tab.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: "deny" };
  });
  //  • Pin navigation to our own embedded localhost origin — an in-page navigation to any other origin is
  //    blocked (and sent to the OS browser instead), so nothing can turn this window into a web browser.
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(`http://127.0.0.1:${port}`)) {
      e.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    }
  });
  // Re-assert native fullscreen the instant it's shown (covers platforms where the constructor flag races
  // the first paint) and show once the first frame is ready so the user never sees a windowed flash.
  win.once("ready-to-show", () => { if (TEST_WINDOWED) { win.showInactive(); return; } if (!win.isFullScreen()) win.setFullScreen(true); win.show(); });

  // UNLOCK THE GAMEPAD API ON THE HOME SCREEN (controller-on-menus fix).
  // Chromium gates navigator.getGamepads() behind a sticky USER ACTIVATION (a real mouse/keyboard/touch
  // gesture — a controller BUTTON does NOT count; it's an anti-fingerprinting rule). On the cold title
  // screen the user hasn't clicked/typed yet, so getGamepads() returns [null,null,null,null] even with a
  // pad connected and pressing — the menu poll sees nothing. (In-match "worked" only because reaching a
  // match required mouse/keyboard menu clicks, which had already granted activation.) Diagnosed live in
  // this wrapper: on the cold screen document.hasFocus()===true and the menu poll runs every frame, but
  // navigator.userActivation.hasBeenActive===false. Granting the page a real user activation from the main
  // process — executeJavaScript(code, /*userGesture*/ true) — flips hasBeenActive to true permanently
  // (verified: it sticks), which satisfies the gate so getGamepads() exposes pads immediately at the title.
  // Re-granted on every load so it survives any in-app reload. This is a WRAPPER concern (the browser gate),
  // not game code — which is why the in-page controller logic tested green while the real app stayed broken.
  const grantGamepadActivation = () => { win.webContents.executeJavaScript("void 0", true).catch(() => {}); };
  win.webContents.on("did-finish-load", grantGamepadActivation);
  // BATTLE=1 drives the game's own test harness into a live match so the screenshot shows real gameplay
  // (canvas render loop + sprites), not just menus. Plain launch (neither var) just opens the window.
  const battle = process.env.BATTLE === "1";
  // tests: show the host UI under automation (HOSTUI=1) or pass a simple query (MS_URL_QUERY="harness=1&hostui=1")
  const q = process.env.MS_URL_QUERY;
  const hostui = q && /^[\w=&.-]{1,200}$/.test(q) ? `?${q}` : (process.env.HOSTUI === "1" ? "?hostui=1" : "");
  const url = battle
    ? `http://127.0.0.1:${port}/index.html?harness=1&p1=miwa&p2=maki`
    : `http://127.0.0.1:${port}/index.html${hostui}`;
  // MSV1-HOST: hosting must not wait for the page's full `load` (thousands of assets). Start it right away.
  // A real network failure of the main page (not an abort) is retried a few times instead of leaving a dead window.
  let loadRetries = 0;
  win.webContents.on("did-fail-load", (_e, code, desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3 || loadRetries >= 3) return;
    loadRetries++;
    console.log(`[app] page load failed (${code} ${desc}) — retry ${loadRetries}`);
    setTimeout(() => { if (!win.isDestroyed()) win.loadURL(url).catch(() => {}); }, 750);
  });
  const loaded = win.loadURL(url).catch((e) => console.log(`[app] load: ${e.message}`));   // resolves once the page has loaded
  const launchUrl = pendingProtocolUrl; pendingProtocolUrl = null;
  if (launchUrl && /^multiversesmash:\/\/join/i.test(launchUrl)) {
    const p = parseJoinInput(launchUrl);
    pendingJoin = p.kind === "link" ? { ok: true, origin: p.origin, room: p.room } : { ok: false, reason: p.reason };
    pushToWindow("host:join-request", pendingJoin);
  }
  if (readHostSettings().autoHost) host.start();
  await loaded;

  // Self-check: VERIFY_GAMEPAD=1 confirms the launcher opened the Gamepad-API gate on the COLD home screen
  // (no user input performed) — the whole point of the activation grant above. Prints the gate state + that
  // the menu poll is running, then quits. (Whether a PHYSICAL pad then enumerates needs real hardware, but
  // this proves the one measured blocker — hasBeenActive:false — is gone at launch.)
  if (process.env.VERIFY_GAMEPAD === "1") {
    await new Promise(r => setTimeout(r, 1500));   // let the loop tick a bit
    const s = await win.webContents.executeJavaScript(`({
      hasFocus: document.hasFocus(),
      hasBeenActive: (navigator.userActivation||{}).hasBeenActive ?? null
    })`);
    console.log("VERIFY_GAMEPAD:", JSON.stringify(s));
    console.log(s.hasBeenActive === true ? "PASS — gamepad gate OPEN on cold home screen" : "FAIL — gate still closed");
    app.quit();
    return;
  }

  // Optional automated proof: CAPTURE=1 → screenshot the real window contents, then quit.
  if (process.env.CAPTURE === "1") {
    if (battle) {
      // Use the (inert-unless-?harness) test hooks to jump straight into a rendered battle.
      await win.webContents.executeJavaScript(`(async () => {
        await new Promise(r => { const t = setInterval(() => { if (window.__harness) { clearInterval(t); r(); } }, 30); });
        window.__harness.start(); await new Promise(r => setTimeout(r, 400));
        window.__harness.skipToBattle();
      })()`).catch(e => console.log("DRIVE ERR", String(e)));
    }
    await new Promise(r => setTimeout(r, 2500));   // let the boot screen + first frames render
    const img = await win.webContents.capturePage();
    const out = path.join(REPO, "electron", "shots", battle ? "poc_battle.png" : "poc.png");
    fs.writeFileSync(out, img.toPNG());
    console.log("CAPTURED", out, `${img.getSize().width}x${img.getSize().height}`);
    app.quit();
  }
}

if (gotLock) app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

// MSV1-HOST: quitting closes the public listener and kills cloudflared (graceful first, then a hard kill).
let quitting = false;
app.on("before-quit", (e) => {
  if (quitting || !host) return;
  e.preventDefault(); quitting = true;
  const hard = setTimeout(() => { host.killNow(); app.exit(0); }, 4000);
  host.stop().catch(() => {}).finally(() => { clearTimeout(hard); app.quit(); });
});
app.on("will-quit", () => { if (host) host.killNow(); });
process.on("exit", () => { if (host) host.killNow(); });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { if (host) host.killNow(); app.exit(0); });
