// electron/capture_review.mjs — FULL-GAME SCREENSHOT REVIEW capture.
// Real Electron app (same embedded dev-server + identical game code as main.mjs), windowed 1280x800 for
// clean shots. Drives the game's own ?harness hooks to each screen/state and saves a real capturePage()
// PNG per screen into electron/shots/review/. A separate compositing step tiles them into labeled sheets.
// Run:  electron/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron electron/capture_review.mjs
import { app, BrowserWindow, Menu } from "electron";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = path.join(REPO, "electron", "shots", "review");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split("?")[0]);
      const rel = url === "/" ? "/index.html" : url;
      const file = path.join(REPO, rel);
      if (!file.startsWith(REPO)) { res.writeHead(403).end(); return; }
      if (rel === "/index.html") {
        let html = fs.readFileSync(file, "utf8");
        html = injectBlock(html, buildModuleBlock().html);
        res.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" }); res.end(html); return;
      }
      fs.readFile(file, (e, data) => {
        if (e) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" }); res.end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

// Each screen: id (filename), label (printed on the sheet), drive (JS run in the page), wait (settle ms).
// `drive` uses the SAME window.__harness hooks the test suite uses — real navigation to a real render.
const SCREENS = [
  // ── Front-end menus ──
  { id: "title",         label: "Title / Start Screen",         drive: `__harness.ui.goto("START")`,                                              wait: 500 },
  { id: "mainmenu",      label: "Main Menu",                    drive: `__harness.ui.goto("MAIN_MENU")`,                                          wait: 600 },
  { id: "gameplaysel",   label: "Gameplay Select (mode picker)",drive: `__harness.ui.goto("GAMEPLAY_SELECT")`,                                     wait: 450 },
  { id: "universesel",   label: "Universe Select",              drive: `__harness.ui.goto("SELECT_UNIVERSE")`,                                     wait: 450 },
  { id: "charselect",    label: "Character Select (default)",   drive: `__harness.showCharSelect("dragon_ball","training")`,                       wait: 550 },
  { id: "charsearch",    label: "Character Select — search 'go'",drive: `__harness.showCharSelect("dragon_ball","training"); __harness.charSearch.focus(true); __harness.charSearch.set("go")`, wait: 550 },
  { id: "settings",      label: "Settings (Input / Audio / UI-scale)", drive: `__harness.ui.goto("SETTINGS")`,                                      wait: 450 },
  // ── Info / meta menus ──
  { id: "credits",       label: "Credits (reworked)",           drive: `__harness.credits.enter()`,                                               wait: 500 },
  { id: "movelist",      label: "Move List / Kit Browser",      drive: `__harness.ui.goto("MOVE_LIST")`,                                           wait: 500 },
  { id: "tutorial",      label: "How To Play (Tutorial)",       drive: `__harness.ui.goto("TUTORIAL")`,                                            wait: 450 },
  { id: "account",       label: "Account",                      drive: `__harness.ui.goto("ACCOUNT")`,                                             wait: 450 },
  { id: "musiclibrary",  label: "Music Library (playlist builder)", drive: `__harness.ui.goto("MUSIC_LIBRARY")`,                                   wait: 450 },
  { id: "profile",       label: "Personality Profile (radar)",  drive: `__harness.screens.profile()`,                                             wait: 550 },
  { id: "codex",         label: "Codex / Dossiers",             drive: `__harness.screens.codex()`,                                               wait: 550 },
  // ── In-match + results ──
  { id: "hud_normal",    label: "In-Match HUD — mid-fight",     drive: `__harness.start({mode:"vs",difficulty:"easy"}); __harness.skipToBattle();`, wait: 1600 },
  { id: "hud_lowhp",     label: "In-Match HUD — low health + warning", drive: `__harness.setP1HealthRaw(150)`,                                     wait: 700 },
  { id: "hud_ultimate",  label: "In-Match HUD — Ultimate used", drive: `__harness.setP1HealthRaw(900); __harness.fillEnergy(); __harness.p1Ultimate();`, wait: 500 },
  { id: "hud_ko",        label: "In-Match — K.O. stamp",        drive: `__harness.triggerKo()`,                                                   wait: 250 },
  { id: "pause",         label: "Pause Menu",                   drive: `__harness.ui.goto("PAUSED")`,                                             wait: 500 },
  { id: "victory",       label: "Victory / Results Screen",     drive: `__harness.showVictory("p1")`,                                             wait: 700 },
  // ── Other modes / placeholders ──
  { id: "story",         label: "Story Mode (placeholder)",     drive: `__harness.ui.goto("STORY_MODE")`,                                         wait: 450 },
  { id: "arcade",        label: "Arcade Setup",                 drive: `__harness.ui.goto("ARCADE_SETUP")`,                                       wait: 450 },
  { id: "tower",         label: "Tower Select",                 drive: `__harness.ui.goto("TOWER_SELECT")`,                                       wait: 450 },
  { id: "bracket",       label: "Tournament (Bracket) Setup",   drive: `__harness.ui.goto("BRACKET_SETUP")`,                                      wait: 450 },
  { id: "ffa",           label: "Free-For-All Setup",           drive: `__harness.ui.goto("FFA_SETUP")`,                                          wait: 450 },
  { id: "aidiff",        label: "VS CPU — AI Difficulty",       drive: `__harness.ui.goto("AI_DIFFICULTY")`,                                      wait: 450 },
  { id: "aivsai",        label: "AI vs AI Setup",               drive: `__harness.ui.goto("AI_VS_AI_SETUP")`,                                     wait: 450 },
  { id: "online",        label: "Online (placeholder)",         drive: `__harness.ui.goto("ONLINE_PLACEHOLDER")`,                                 wait: 450 },
];

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  const port = await startServer();
  const win = new BrowserWindow({
    width: 1280, height: 800, show: true, backgroundColor: "#061225",
    title: "Multiverse Smash — Review Capture", autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  const errors = [];
  win.webContents.on("console-message", (_e, level, message) => { if (level >= 2) errors.push(message); });
  await win.loadURL(`http://127.0.0.1:${port}/index.html?harness=1&p1=vegito&p2=goku`);
  // Wait for the harness to arm (post module-load), then let the loader fade + first frames paint.
  await win.webContents.executeJavaScript(`new Promise(r=>{const t=setInterval(()=>{if(window.__harness){clearInterval(t);r(1)}},30)})`).catch(()=>{});
  await sleep(900);

  const results = [];
  let i = 0;
  for (const s of SCREENS) {
    i++;
    let err = null;
    try { await win.webContents.executeJavaScript(`(function(){ try { ${s.drive}; return null; } catch(e){ return String(e); } })()`).then(r => { if (r) err = r; }); }
    catch (e) { err = String(e); }
    await sleep(s.wait || 450);
    let file = null, size = null;
    try { const img = await win.webContents.capturePage(); file = path.join(OUT, `${String(i).padStart(2,"0")}_${s.id}.png`); fs.writeFileSync(file, img.toPNG()); size = img.getSize(); }
    catch (e) { err = (err ? err + " | " : "") + "capture:" + String(e); }
    results.push({ n: i, id: s.id, label: s.label, file: file ? path.basename(file) : null, err, size });
    console.log(`[${i}/${SCREENS.length}] ${s.id} ${err ? "ERR:" + err : "ok"} ${size ? size.width + "x" + size.height : ""}`);
  }
  fs.writeFileSync(path.join(OUT, "_manifest.json"), JSON.stringify({ screens: results, pageErrors: errors.slice(0, 20) }, null, 2));
  console.log("MANIFEST", path.join(OUT, "_manifest.json"));
  app.quit();
});
app.on("window-all-closed", () => app.quit());
