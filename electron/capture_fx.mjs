// electron/capture_fx.mjs — verification-capture driver for the character-scale bump
// and the blood hit-effect toggle. Boots the app's OWN dev server (identical to a browser),
// drives the real harness into rendered battles, and screenshots the live window.
//
//   ELECTRON=electron/node_modules/.bin/electron
//   TAG=after  DO_BLOOD=1  $ELECTRON electron/capture_fx.mjs      # scale=1.18 build + blood shots
//   TAG=before               $ELECTRON electron/capture_fx.mjs   # scale=1.00 build, scale shots only
//
// Shots land in electron/shots/fx/.
import { app, BrowserWindow, Menu } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildModuleBlock, injectBlock } from "../tools/stamp_version.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = path.join(REPO, "electron", "shots", "fx");
const TAG  = process.env.TAG || "after";
const DO_BLOOD = process.env.DO_BLOOD === "1";
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".woff":"font/woff",".woff2":"font/woff2",".svg":"image/svg+xml" };

const SCALE_STAGES = ["Valley of the End", "Jujutsu High Courtyard"];   // detailed painted stages (the complaint)
const wait = ms => new Promise(r => setTimeout(r, ms));

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

async function drive(win, code) {
  return win.webContents.executeJavaScript(`(async () => { ${code} })()`).catch(e => { console.log("DRIVE ERR", String(e)); return null; });
}
async function waitHarness(win) {
  const ok = await drive(win, `await new Promise(r => { let n=0; const t = setInterval(() => { if (window.__harness || ++n>300) { clearInterval(t); r(!!window.__harness); } }, 30); }); return !!window.__harness;`);
  console.log("harness ready:", ok);
}
async function shot(win, name) {
  const img = await win.webContents.capturePage();
  const out = path.join(OUT, name);
  fs.writeFileSync(out, img.toPNG());
  console.log("CAPTURED", path.relative(REPO, out), `${img.getSize().width}x${img.getSize().height}`);
}

async function scaleShots(win) {
  for (let i = 0; i < SCALE_STAGES.length; i++) {
    const st = SCALE_STAGES[i];
    const r = await drive(win, `
      try {
        window.__harness.rng.forceSeed(20260825);     // identical RNG across before/after runs
        window.__harness.setSession({ mode:'training', dummyBehavior:'stand', selectedStage:${JSON.stringify(st)}, p1CharKey:'gohan', p2CharKey:'ippo' });
        window.__harness.edoBackup.startPreserving();  // training → both idle at spawn (P2 stationary dummy)
        return { ok:true };
      } catch (e) { return { ok:false, err:String(e) }; }
    `);
    console.log("scale drive", st, JSON.stringify(r));
    await wait(400);                                   // fighters still at spawn → identical framing both runs
    await shot(win, `scale_${TAG}_${i + 1}_${st.replace(/\W+/g, "-")}.png`);
  }
}

async function fightBurst(win, p1, p2, label) {
  // speed 2 + hard AI → fighters engage and trade steadily WITHIN one round (fast KOs at
  // 'impossible'/4x cycled the VS-intro too often). Dense 100ms sampling catches live sparks.
  await drive(win, `window.__harness.aiVsAi.start({ p1:${JSON.stringify(p1)}, p2:${JSON.stringify(p2)}, matches:1, speed:2, p1Diff:'hard', p2Diff:'hard' });`);
  await wait(4200);                                    // past intro/namecall/countdown → sustained trading
  for (let f = 0; f < 40; f++) { await shot(win, `${label}_${String(f).padStart(2, "0")}.png`); await wait(100); }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const port = await startServer();
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({ width: 1280, height: 720, show: true, backgroundColor: "#061225",
    webPreferences: { contextIsolation: true, nodeIntegration: false } });
  win.webContents.on("console-message", (_e, lvl, msg) => { if (lvl >= 2) console.log("PAGE", msg); });
  const URL_ = `http://127.0.0.1:${port}/?harness=1&session=1`;   // ?harness installs window.__harness
  console.log("loading", URL_);
  await win.loadURL(URL_);
  await waitHarness(win);

  // 0) SETTINGS screen — show the new Blood toggle in both states.
  if (process.env.SETTINGS === "1") {
    await drive(win, `try { localStorage.setItem('ms_blood_fx','0'); } catch(_){}`);
    await win.webContents.reload(); await waitHarness(win);
    await drive(win, `window.__harness.showSettings();`); await wait(500);
    await shot(win, `settings_blood_off.png`);
    await drive(win, `try { localStorage.setItem('ms_blood_fx','1'); } catch(_){}`);
    await win.webContents.reload(); await waitHarness(win);
    await drive(win, `window.__harness.showSettings();`); await wait(500);
    await shot(win, `settings_blood_on.png`);
    console.log("DONE"); app.quit(); return;
  }

  // 1) SCALE before/after — idle fighters on two detailed stages.
  if (process.env.ONLY_BLOOD !== "1") await scaleShots(win);

  // 2) BLOOD — only on the 1.18 (TAG=after) build; toggle OFF vs ON proves the setting changes behavior.
  if (DO_BLOOD) {
    // Non-red fighters so ANY play-area red = blood: Goku (orange gi) + Gohan (purple gi) melee;
    // Piccolo (green) + Frieza (white/purple) for a ranged-special exchange.
    await drive(win, `try { localStorage.setItem('ms_blood_fx','0'); } catch(_){}`);
    await win.webContents.reload(); await waitHarness(win);
    await fightBurst(win, "goku", "gohan", `blood_OFF_goku_gohan`);
    await fightBurst(win, "piccolo", "frieza", `blood_OFF_piccolo_frieza`);

    await drive(win, `try { localStorage.setItem('ms_blood_fx','1'); } catch(_){}`);   // module re-reads on reload
    await win.webContents.reload(); await waitHarness(win);
    await fightBurst(win, "goku", "gohan", `blood_ON_goku_gohan`);
    await fightBurst(win, "piccolo", "frieza", `blood_ON_piccolo_frieza`);
  }

  console.log("DONE");
  app.quit();
}

app.whenReady().then(main).catch(e => { console.log("FATAL", e && (e.stack || e.message)); app.quit(); });
app.on("window-all-closed", () => app.quit());
