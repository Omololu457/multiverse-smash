// harness/toji_movement_clip.mjs — VISUAL side-by-side "clip" of the movement-feel fix. Builds a filmstrip
// montage: consecutive frames of a forward WALK, sampled every few game-frames, so the leg-cycle CADENCE is
// visible left→right. Three rows for a direct comparison:
//   Row 1  TOJI (speed 98) — fix OFF  : leg-cycle at the old fixed rate (feet skate; barely changes per column)
//   Row 2  TOJI (speed 98) — fix ON   : leg-cycle now scaled to his 9.5px/f velocity (poses advance faster)
//   Row 3  GOJO (speed 87, avg)       : the roster-average anchor (unchanged by the fix)
// Reading each row left→right, Toji-ON cycles through more distinct leg poses per column than Toji-OFF, and
// tracks Gojo's cadence-to-speed ratio — i.e. his high Speed stat now reads visually. Usage:
//   node harness/toji_movement_clip.mjs
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });

const COLS = 7, STEP = 3;         // 7 columns, one capture every 3 game-frames
const CW = 300, CH = 300;         // crop window size (centered on the fighter's live screen position)

async function captureRow(charKey, locoOff) {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const STATE = () => page.evaluate(() => window.__harness.state());
  const P1 = () => page.evaluate(() => window.__harness.p1());
  const waitFrames = async n => { const s = (await STATE()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 15000, polling: 16 }); };
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(off => { globalThis.__locoScaleOff = off; }, locoOff);
  await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "easy" }); window.__harness.skipToBattle(); });
  await new Promise(r => setTimeout(r, 300));
  const shoveFar = () => page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 720); window.__harness.healP2?.(); });
  await shoveFar(); await waitFrames(3);
  await page.keyboard.down("d"); await waitFrames(6);   // steady-state walk
  // fighter screen position (camera-followed → ~constant); center the crop on it.
  const scr = await page.evaluate(() => { const f = window.__harness.p1(); const c = window.__harness.camera(); const cw = 900, chh = 600; return { sx: (f.x - c.x) * c.zoom + cw/2, sy: (f.y - c.y) * c.zoom + chh/2 }; });
  const clip = { x: Math.max(0, Math.round(scr.sx - CW/2)), y: Math.max(0, Math.round(scr.sy - CH*0.62)), width: CW, height: CH };
  const frames = []; let vxsum = 0, vxn = 0;
  for (let c = 0; c < COLS; c++) {
    await shoveFar();
    const buf = await page.screenshot({ clip });
    frames.push(buf.toString("base64"));
    const p = await P1(); if (p.spriteAction === "walk" || p.spriteAction === "run") { vxsum += Math.abs(p.vx||0); vxn++; }
    await waitFrames(STEP);
  }
  await page.keyboard.up("d");
  const p = await P1();
  await page.close();
  return { frames, vx: vxn ? vxsum/vxn : Math.abs(p.vx||0), speed: p.baseSpeed ?? p.speed };
}

const rows = [
  { label: "TOJI  speed 98  — BEFORE (fixed rate)", ...(await captureRow("toji", true)) },
  { label: "TOJI  speed 98  — AFTER (velocity-scaled)", ...(await captureRow("toji", false)) },
  { label: "GOJO  speed 87  — roster-average anchor", ...(await captureRow("gojo", false)) },
];

// Compose the montage in a browser canvas and export one PNG.
const page = await browser.newPage();
const dataURL = await page.evaluate(async ({ rows, COLS, CW, CH, STEP }) => {
  const pad = 8, labelW = 250, headH = 26;
  const cw = CW, ch = CH;
  const W = labelW + COLS * (cw + pad) + pad;
  const H = headH + rows.length * (ch + pad) + pad;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#0d1117"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#e6edf3"; g.font = "700 14px Arial"; g.textBaseline = "middle";
  for (let c = 0; c < COLS; c++) g.fillText(`+${c*STEP}f`, labelW + c*(cw+pad) + cw/2 - 12, headH/2);
  const loadImg = b64 => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = "data:image/png;base64," + b64; });
  for (let r = 0; r < rows.length; r++) {
    const y = headH + r*(ch+pad) + pad;
    g.fillStyle = "#e6edf3"; g.font = "700 12px Arial";
    // wrap label
    const words = rows[r].label.split("  ");
    g.fillText(words[0], 6, y + 14); g.font = "500 11px Arial"; g.fillStyle = "#9fb0c3";
    g.fillText(words.slice(1).join(" ").trim(), 6, y + 32);
    g.fillStyle = "#7d8ea1"; g.font = "500 10px Arial";
    g.fillText(`vx=${rows[r].vx.toFixed(1)} px/f`, 6, y + 52);
    for (let c = 0; c < COLS; c++) {
      const im = await loadImg(rows[r].frames[c]);
      const x = labelW + c*(cw+pad) + pad;
      g.drawImage(im, x, y, cw, ch);
      g.strokeStyle = "#30363d"; g.lineWidth = 1; g.strokeRect(x, y, cw, ch);
    }
  }
  return cv.toDataURL("image/png");
}, { rows, COLS, CW, CH, STEP });
fs.writeFileSync(path.join(OUT, "toji_movement_clip.png"), Buffer.from(dataURL.replace(/^data:image\/png;base64,/, ""), "base64"));
console.log("wrote harness/shots/toji_movement_clip.png");
console.log(rows.map(r => `${r.label.split("—")[0].trim()}: vx=${r.vx.toFixed(1)}`).join("  |  "));
await browser.close(); server.close();
