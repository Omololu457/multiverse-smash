// harness/void_overlay_verify.mjs — in-engine VISUAL sign-off for the 8 new Void Sovereign overlays.
// For each character: load it as p1, apply its Void skin, let the overlay animate ~40 frames (motes rise /
// strands drift), then screenshot a tight box around p1 (using the fighter's live _lastDrawX/Y/W/H when the
// harness exposes it, else a fixed spawn box). Saves harness/shots/void_<char>.png. No pass/fail — visual.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });

const CHARS = [
  ["iron_man", "ironManVoidSovereign"], ["iron_man_2", "ironMan2VoidSovereign"], ["iron_man_3", "ironMan3VoidSovereign"],
  ["gwen", "gwenVoidSovereign"], ["miles", "milesVoidSovereign"], ["dark_knight", "darkKnightVoidSovereign"],
  ["vilgax", "vilgaxVoidSovereign"], ["ippo", "ippoVoidSovereign"],
];

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

for (const [char, skin] of CHARS) {
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
  await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
  await pg.evaluate(() => window.__harness.start());
  await pg.evaluate(() => window.__harness.skipToBattle());
  const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
  await wf(6);
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), skin);
  await pg.evaluate(() => window.__harness.forceAction("idle", "p1"));
  await wf(44);   // let motes/strands rise into view
  const box = await pg.evaluate(() => { const p = window.__harness.p1(); return { x: p._lastDrawX, y: p._lastDrawY, w: p._lastDrawW, h: p._lastDrawH }; }).catch(() => null);
  let clip = { x: 300, y: 250, width: 300, height: 260 };
  if (box && box.x != null) clip = { x: Math.max(0, box.x - 30), y: Math.max(0, box.y - 30), width: Math.min(400, box.w + 60), height: Math.min(460, box.h + 60) };
  await pg.screenshot({ path: path.join(OUT, `void_${char}.png`), clip });
  console.log(`${char}: shot saved  box=${box ? JSON.stringify(box) : "spawn-fallback"}  errs=${errs.length}`);
  await pg.close();
}
await b.close(); server.close();
console.log("done");
