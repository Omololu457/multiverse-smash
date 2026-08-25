// electron/diag_crash.mjs — reproduce the "opens then closes shortly after" self-close and capture the
// REAL cause (renderer crash / OOM / uncaught error), rather than an exit code. Drives the actual game
// through the things a user does right after launch: unlock audio + menu music, then load a match (the
// heavy sprite-sheet decode). Logs render-process-gone, console errors, page errors, and JS heap over time.
import { app, BrowserWindow } from "electron";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
      if (rel === "/index.html") { let html = fs.readFileSync(file, "utf8"); html = injectBlock(html, buildModuleBlock().html); res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" }); res.end(html); return; }
      fs.readFile(file, (e, data) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data); });
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now();
const D = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(2)}s]`, ...a);

app.whenReady().then(async () => {
  const port = await startServer();
  const win = new BrowserWindow({ width: 1280, height: 800, show: true, backgroundColor: "#061225", webPreferences: { contextIsolation: true, nodeIntegration: false } });

  win.webContents.on("render-process-gone", (_e, d) => D("🔴 RENDER-PROCESS-GONE", JSON.stringify(d)));
  win.webContents.on("unresponsive", () => D("🔴 UNRESPONSIVE"));
  win.webContents.on("console-message", (_e, level, message, line, src) => { if (level >= 2) D(`console[${level === 3 ? "ERR" : "warn"}]`, message.slice(0, 300), "@", (src || "").split("/").pop() + ":" + line); });
  win.on("closed", () => D("🔴 WINDOW CLOSED"));
  process.on("uncaughtException", e => D("🔴 MAIN UNCAUGHT", e && (e.stack || e.message)));

  const jsProbe = `
    window.__diagErrs = window.__diagErrs || [];
    window.addEventListener("error", e => window.__diagErrs.push("ERROR: " + (e.error && e.error.stack || e.message) + " @ " + (e.filename||"").split("/").pop() + ":" + e.lineno));
    window.addEventListener("unhandledrejection", e => window.__diagErrs.push("REJECTION: " + (e.reason && e.reason.stack || e.reason)));
    void 0;`;

  await win.loadURL(`http://127.0.0.1:${port}/index.html?harness=1&p1=goku&p2=vegeta&session=1`);
  await win.webContents.executeJavaScript(jsProbe, true);
  const heap = async (tag) => { const m = await win.webContents.executeJavaScript(`performance.memory ? Math.round(performance.memory.usedJSHeapSize/1048576)+"/"+Math.round(performance.memory.jsHeapSizeLimit/1048576)+"MB" : "n/a"`).catch(()=>"?"); D(`heap ${tag}:`, m); };
  const errs = async () => { const e = await win.webContents.executeJavaScript(`(window.__diagErrs||[]).slice(-6)`).catch(()=>[]); if (e.length) D("JS errors so far:", JSON.stringify(e, null, 0)); };

  await win.webContents.executeJavaScript(`new Promise(r=>{const t=setInterval(()=>{if(window.__harness){clearInterval(t);r()}},30)})`);
  D("harness ready"); await heap("after boot");

  // 1) A real gesture → unlock audio + start menu music (what the first click does).
  win.webContents.sendInputEvent({ type: "mouseDown", x: 640, y: 400, button: "left", clickCount: 1 });
  win.webContents.sendInputEvent({ type: "mouseUp", x: 640, y: 400, button: "left", clickCount: 1 });
  await win.webContents.executeJavaScript(`window.__harness.__sound && window.__harness.__sound.playMenuMusic && window.__harness.__sound.playMenuMusic()`).catch(()=>{});
  D("triggered gesture + menu music"); await sleep(4000); await heap("after audio"); await errs();

  // 2) Load a real match — the heavy sprite-sheet decode (goku/vegeta have many large sheets).
  D("booting a match (asset-heavy)…");
  await win.webContents.executeJavaScript(`window.__harness.boot()`).catch(e => D("boot() threw:", String(e)));
  for (let i = 0; i < 6; i++) { await sleep(2000); await heap(`match +${(i+1)*2}s`); }
  await errs();

  // 3) Let it run a while longer (fps/render loop) to catch a delayed crash.
  D("idling in-match to watch for a delayed close…");
  for (let i = 0; i < 8; i++) { await sleep(2000); if (win.isDestroyed()) { D("window destroyed mid-idle"); break; } await heap(`idle +${(i+1)*2}s`); }
  await errs();

  D("done — no self-close observed in this run" ); app.quit();
});
app.on("window-all-closed", () => app.quit());
