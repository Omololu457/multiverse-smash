// harness/isshiki_skins_shot.mjs — Isshiki 13-skin batch: each skin applies, renders as a SPRITE (never
// the procedural box), and resolves its recolored __<tag> sheet. Sweeps idle + a couple actions per skin
// so a missing recolored sheet is caught. Screenshots → harness/shots/isshiki_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
await pg.goto(`${base}/index.html?harness=1&p1=isshiki`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

const IDS = [
  ["default", ""], ["isshiki_azure", "azure"], ["isshiki_golden", "golden"], ["isshiki_violet", "violet"],
  ["isshiki_emerald", "emerald"], ["isshiki_toxic", "toxic"], ["isshiki_frost", "frost"], ["isshiki_ivory", "ivory"],
  ["isshiki_obsidian", "obsidian"], ["isshiki_ashen", "ashen"], ["isshiki_steel", "steel"], ["isshiki_sanguine", "sanguine"],
  ["isshiki_jigen", "jigen"], ["isshikiVoidSovereign", "void"],
];
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  // sweep idle + a ground-combo pose + a cast pose — each must resolve a real (tagged) sheet, never a box
  let allSheets = [];
  for (const act of ["idle", "isshikiGround1", "isshikiSukuCast", "hurt_air"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `isshiki_skin_${id}.png`), clip: { x: 440, y: 180, width: 400, height: 420 } });
  const ok = allSheets.every(s => s.includes("isshiki_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag} sheets=${[...new Set(allSheets.map(s => s.split("/").pop()))].join(",")}` : allSheets[0].split("/").pop());
}
check("no procedural boxes across all 14 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
