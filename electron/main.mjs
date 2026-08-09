// electron/main.mjs — MINIMAL desktop-wrapper proof-of-concept.
//
// The game is a pure static web app (ES modules + <script type=importmap> + relative image/mp3 assets).
// Chromium BLOCKS module scripts loaded over file:// (origin becomes "null" → CORS), so we can't just
// point Electron at index.html on disk. Instead we do the clean thing: run the project's OWN dev-server
// logic (the exact live import-map injection from tools/serve.mjs / stamp_version.mjs) on a random
// localhost port inside the Electron main process, then load http://127.0.0.1:PORT. This makes the
// Electron runtime byte-for-byte identical to a real browser / GitHub Pages — so ZERO game-code changes.
import { app, BrowserWindow } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

// --- 1) Serve the repo exactly like tools/serve.mjs (live import-map, versioned modules) -------------
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
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
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#061225",
    title: "Multiverse Smash Ultimate",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },   // game needs no Node access
  });
  // BATTLE=1 drives the game's own test harness into a live match so the screenshot shows real gameplay
  // (canvas render loop + sprites), not just menus. Plain launch (neither var) just opens the window.
  const battle = process.env.BATTLE === "1";
  const url = battle
    ? `http://127.0.0.1:${port}/index.html?harness=1&p1=miwa&p2=maki`
    : `http://127.0.0.1:${port}/index.html`;
  await win.loadURL(url);   // resolves once the page has loaded

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
