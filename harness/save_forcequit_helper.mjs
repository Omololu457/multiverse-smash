// harness/save_forcequit_helper.mjs — Electron main used by save_forcequit_electron.mjs.
// Serves the game AND the durable save tier (/api/health + /api/save) exactly like the real launcher, so
// the test exercises the SAME durability path the shipped app uses. USERDATA pins the save file location so
// both launches share it.
//   MODE=make → await boot (server detected) → ensure profile + award wins (auto-POSTs to /api/save → file)
//               → confirm the file exists on disk → STAY ALIVE for a kill -9 (real force-quit, no clean exit).
//   MODE=read → await boot (loads the durable file back) → read what persisted → quit.
import { app, BrowserWindow } from "electron";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODE = process.env.MODE || "read";
if (process.env.USERDATA) app.setPath("userData", process.env.USERDATA);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const SAVE_FORMAT = "multiverse-smash-save";
const saveDir = () => path.join(app.getPath("userData"), "saves");
const saveFile = () => path.join(saveDir(), "game_player_data.json");

function apiHandled(url, req, res) {
  if (url === "/api/health") { res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, version: "1" })); return true; }
  if (url === "/api/save" && req.method === "GET") {
    fs.readFile(saveFile(), "utf8", (e, d) => { if (e || !d) { res.writeHead(204).end(); return; } res.writeHead(200, { "content-type": "application/json" }).end(d); }); return true;
  }
  if (url === "/api/save" && req.method === "POST") {
    let n = 0; const c = []; req.on("data", d => { n += d.length; c.push(d); }); req.on("end", () => {
      const text = Buffer.concat(c).toString("utf8"); let data = null; try { data = JSON.parse(text); } catch (_) {}
      if (!data || data.format !== SAVE_FORMAT) { res.writeHead(400).end('{"ok":false}'); return; }
      try { fs.mkdirSync(saveDir(), { recursive: true }); fs.writeFileSync(saveFile() + ".tmp", text); fs.renameSync(saveFile() + ".tmp", saveFile()); res.writeHead(200).end('{"ok":true}'); }
      catch (err) { res.writeHead(500).end('{"ok":false}'); }
    }); return true;
  }
  return false;
}
function startServer() {
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      if (apiHandled(url, req, res)) return;
      const rel = url === "/" ? "/index.html" : url; const file = path.join(REPO, rel);
      if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
      if (rel === "/index.html") { let html = fs.readFileSync(file, "utf8"); html = injectBlock(html, buildModuleBlock().html); res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" }); res.end(html); return; }
      fs.readFile(file, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(d); });
    });
    s.listen(0, "127.0.0.1", () => resolve(s.address().port));
  });
}

app.whenReady().then(async () => {
  const port = await startServer();
  const win = new BrowserWindow({ width: 800, height: 600, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await win.loadURL(`http://127.0.0.1:${port}/index.html?harness=1&p1=goku&p2=vegeta`);
  const js = (code) => win.webContents.executeJavaScript(`(async()=>{ try { return { ok:true, v: await (${code}) } } catch(e){ return { ok:false, err: String(e && (e.stack||e.message||e)) } } })()`);
  await win.webContents.executeJavaScript(`new Promise(r=>{const t=setInterval(()=>{if(window.__harness&&window.__harness.progress){clearInterval(t);r()}},30)})`);
  // Wait for the async boot tiers (server probe + load) to finish so saves route to the durable file.
  const boot = await js(`window.__harness.saveLoad.awaitBoot()`);
  console.log("BOOT " + JSON.stringify(boot));

  if (MODE === "make") {
    const rr = await js(`(()=>{ window.__harness.progress.ensure(); window.__harness.progress.award(); return window.__harness.progress.award(); })()`);
    if (!rr.ok) { console.log("AWARD_ERR " + rr.err); }
    const r = rr.v;
    console.log("MADE " + JSON.stringify(r));
    await new Promise(res => setTimeout(res, 2000));   // let the coalesced /api/save POST land + fs write
    console.log("FILE_EXISTS " + fs.existsSync(saveFile()));   // durable file present BEFORE the kill?
    console.log("ALIVE");                                       // orchestrator SIGKILLs us now (no clean exit)
  } else {
    const r = await win.webContents.executeJavaScript(`window.__harness.progress.read()`);
    console.log("READ " + JSON.stringify(r));
    app.quit();
  }
});
app.on("window-all-closed", () => { if (MODE !== "make") app.quit(); });
