// electron/main.mjs — MINIMAL desktop-wrapper proof-of-concept.
//
// The game is a pure static web app (ES modules + <script type=importmap> + relative image/mp3 assets).
// Chromium BLOCKS module scripts loaded over file:// (origin becomes "null" → CORS), so we can't just
// point Electron at index.html on disk. Instead we do the clean thing: run the project's OWN dev-server
// logic (the exact live import-map injection from tools/serve.mjs / stamp_version.mjs) on a random
// localhost port inside the Electron main process, then load http://127.0.0.1:PORT. This makes the
// Electron runtime byte-for-byte identical to a real browser / GitHub Pages — so ZERO game-code changes.
import { app, BrowserWindow, Menu, shell } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

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
  return false;
}

// --- 1) Serve the repo exactly like tools/serve.mjs (live import-map, versioned modules) -------------
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      if (handleSaveApi(url, req, res)) return;   // durable save tier (health / save GET+POST) before static
      const rel = url === "/" ? "/index.html" : url;
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
      if (rel === "/index.html") {
        let html = fs.readFileSync(file, "utf8");
        html = injectBlock(html, buildModuleBlock().html);   // re-inject the import map live
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
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));   // port 0 → OS picks a free port
  });
}

async function createWindow() {
  const port = await startServer();

  // Kill the application menu entirely — no File/Edit/View menu, and (critically) no menu accelerators
  // that could open dev-tools or reload into a stray state. This is a game, so it presents as a pure
  // application surface with zero browser affordances. (autoHideMenuBar only hides the bar; this removes
  // the menu — and its Cmd/Ctrl shortcuts — outright.)
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    // fullscreen:true → the window launches NATIVE-fullscreen (item 2). Native (not the in-page web
    // Fullscreen API) means it survives menu navigation, entering/leaving a match, and alt-tab away/back
    // with no code in the game needed to "keep" it. width/height are the pre-fullscreen restore size only.
    width: 1280,
    height: 800,
    fullscreen: true,
    backgroundColor: "#061225",
    title: "Multiverse Smash Ultimate",
    autoHideMenuBar: true,
    show: false,                 // avoid a windowed flash before fullscreen engages; shown on ready-to-show
    webPreferences: { contextIsolation: true, nodeIntegration: false },   // game needs no Node access
  });

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
  win.once("ready-to-show", () => { if (!win.isFullScreen()) win.setFullScreen(true); win.show(); });

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
  const url = battle
    ? `http://127.0.0.1:${port}/index.html?harness=1&p1=miwa&p2=maki`
    : `http://127.0.0.1:${port}/index.html`;
  await win.loadURL(url);   // resolves once the page has loaded

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

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
