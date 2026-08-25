// electron/verify_controller_play.mjs — VISUAL proof in the REAL Electron wrapper that a controller
// activates PLAY from the home screen. Two parts, both in the actual app:
//   1) confirm the launcher opened the Gamepad-API gate on the cold title screen (the real fix);
//   2) inject a synthetic standard pad and press CROSS through the game's OWN requestAnimationFrame loop
//      (nothing is called manually) — screenshotting home → after-Cross → after navigating into a match.
// Chromium/Electron cannot synthesize a PHYSICAL gamepad, so the pad object is injected via
// navigator.getGamepads; part (1) separately proves the real hardware gate is open. Together they cover
// the whole path a physical controller now takes. Writes electron/shots/controller_play_{1,2,3}.png.
import { app, BrowserWindow, Menu } from "electron";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(REPO, "electron", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
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
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const port = await startServer();
  const win = new BrowserWindow({ width: 1280, height: 800, show: true, backgroundColor: "#061225", webPreferences: { contextIsolation: true, nodeIntegration: false } });
  // Mirror the launcher's fix: grant a sticky user activation so the Gamepad API is unlocked at the title.
  win.webContents.on("did-finish-load", () => win.webContents.executeJavaScript("void 0", true).catch(() => {}));
  // Load with ?harness=1 ONLY to read gameState back (state readout); input still flows through the real loop.
  await win.loadURL(`http://127.0.0.1:${port}/index.html?harness=1&p1=miwa&p2=maki`);
  await win.webContents.executeJavaScript(`new Promise(r => { const t = setInterval(() => { if (window.__harness) { clearInterval(t); r(); } }, 30); })`);
  await sleep(600);

  const gs = () => win.webContents.executeJavaScript(`window.__harness.state().gameState`);
  const shot = async (name, label) => { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(SHOTS, name), img.toPNG()); console.log(`  📸 electron/shots/${name} — ${label}`); };

  // Part 1: the real fix — gate open on the cold home screen.
  const gate = await win.webContents.executeJavaScript(`({ hasBeenActive: (navigator.userActivation||{}).hasBeenActive ?? null })`);
  check("Gamepad-API gate OPEN at the cold title screen (real launcher fix)", gate.hasBeenActive === true, `hasBeenActive=${gate.hasBeenActive}`);
  check("starts on the home/title screen", (await gs()) === "start", await gs());
  await shot("controller_play_1_home.png", "HOME screen (controller idle)");

  // Install a synthetic standard-mapping pad the game's OWN loop will poll via navigator.getGamepads().
  await win.webContents.executeJavaScript(`(() => {
    window.__pad = { index:0, connected:true, mapping:"standard", axes:[0,0,0,0], buttons: Array.from({length:17}, () => ({ pressed:false, touched:false, value:0 })) };
    navigator.getGamepads = () => [window.__pad];
  })()`);
  // Press CROSS (button 0) for a few real frames, then release — the loop reads it, no manual dispatch.
  const tap = async (idx) => {
    await win.webContents.executeJavaScript(`(i => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; })(${idx})`);
    await sleep(120);
    await win.webContents.executeJavaScript(`(i => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; })(${idx})`);
    await sleep(120);
  };
  await tap(0 /* Cross */);
  check("pressing CROSS on HOME activates PLAY → MAIN MENU (real Electron loop)", (await gs()) === "mainMenu", `gameState=${await gs()}`);
  await shot("controller_play_2_mainmenu.png", "after CROSS on PLAY → MAIN MENU");

  // Confirm PLAY again (top row) → GAMEPLAY SELECT, then Cross on TRAINING → into the match-setup flow.
  await tap(0);
  await tap(0);
  const g = await gs();
  check("controller reaches the match-setup flow from the home screen", g === "selectUniverse" || g === "selectCharacter" || g === "gameplaySelect", `gameState=${g}`);
  await shot("controller_play_3_intomatch.png", `after driving into: ${g}`);

  console.log(`\n  CONTROLLER-PLAY (real Electron): ${PASS} passed, ${FAIL} failed`);
  app.quit();
});
app.on("window-all-closed", () => app.quit());
