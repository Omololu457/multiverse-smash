// harness/yamamoto_skins_shot.mjs — Yamamoto 9-skin batch (Default/Navy + 7 REAL palette-header costumes +
// Eternal Void). Each skin: applies, renders as a SPRITE (never the procedural box), and resolves its
// recolored __<tag> sheet across multiple actions (idle/light/heavy/up) so a missing recolored sheet is
// caught. STATIC: every recolored idle sheet exists + all 9 idle sheets are byte-distinct (the palette swap
// really changed each). The Eternal Void skin also seeds its pale-blue Ryūjin Jakka aura overlay.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""], ["yamamotoWineHakama", "wineHakama"], ["yamamotoIceBlue", "iceBlue"],
  ["yamamotoForestGreen", "forestGreen"], ["yamamotoKhaki", "khaki"], ["yamamotoGhostWhite", "ghostWhite"],
  ["yamamotoViolet", "violet"], ["yamamotoCrimson", "crimson"], ["yamamotoEternalVoid", "voidEternal"],
];

// ── STATIC — every recolored idle sheet exists + all 9 idle sheets are byte-distinct ──
const hashes = new Map(); let missing = 0, dupe = 0;
for (const [id, tag] of IDS) {
  const f = path.join(ROOT, tag ? `yamamoto_idle_uniform__${tag}.png` : "yamamoto_idle_uniform.png");
  if (!(fs.existsSync(f) && fs.statSync(f).size > 128)) { missing++; console.log(`  MISSING ${f}`); continue; }
  const h = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
  if ([...hashes.values()].includes(h)) { dupe++; console.log(`  DUPE idle sheet: ${id}`); }
  hashes.set(id, h);
}
check("all 9 idle sheets present on disk", missing === 0, `missing=${missing}`);
check("all 9 idle sheets byte-distinct (palette swap really changed each)", dupe === 0, `dupes=${dupe}`);

const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "light", "heavy", "up"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `yamamoto_skin_${id}.png`), clip: { x: 180, y: 300, width: 320, height: 320 } });
  const ok = allSheets.every(s => s.includes("yamamoto_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite across idle/light/heavy/up (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Eternal Void — the full-black skin also runs the pale-blue Ryūjin Jakka aura overlay (lazily seeds
// _yamamotoVoidFX + runs, no error) across several rendered frames.
await pg.evaluate(() => window.__harness.setSkin("p1", "yamamotoEternalVoid"));
await force("idle"); await wf(8);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Eternal Void applied + renders void sheet", (vf.skinId === "yamamotoEternalVoid") && (vf.spriteSheet || "").includes("__voidEternal"), `skin=${vf.skinId}`);

check("no JS page errors during skin batch", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${fail === 0 ? "✅" : "❌"} Yamamoto skins: ${pass} passed, ${fail} failed — shots in harness/shots/yamamoto_skin_*.png`);
await b.close(); server.close(); process.exit(fail ? 1 : 0);
