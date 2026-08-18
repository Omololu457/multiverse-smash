// harness/byakuya_skins_shot.mjs — Byakuya 13-skin batch (+Default): each skin applies, renders as a SPRITE
// (never the procedural box), and resolves its recolored __<tag> sheet across multiple actions (idle/light/
// heavy/guard) so a missing recolored sheet is caught. The Eternal Void skin also seeds its petal/reiatsu
// aura overlay. Also a STATIC distinctness check (no two skins share an idle sheet). Screenshots →
// harness/shots/byakuya_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""], ["byakuyaSakuraBloom", "sakura"], ["byakuyaKuchikiCrest", "kuchiki"],
  ["byakuyaWinterFrost", "frost"], ["byakuyaBankaiReiatsu", "reiatsu"], ["byakuyaCrimsonCaptain", "crimson"],
  ["byakuyaGoldenNoble", "golden"], ["byakuyaSquadSixSlate", "slate"], ["byakuyaMidnightKuchiki", "midnight"],
  ["byakuyaVerdantEstate", "verdant"], ["byakuyaTwilightPlum", "plum"], ["byakuyaAshenMourning", "ashen"],
  ["byakuyaIvorySovereign", "ivory"], ["byakuyaEternalVoid", "void"],
];

// ── STATIC — every recolored idle sheet exists + all 14 idle sheets are byte-distinct (no accidental dupes) ──
const hashes = new Map();
let missing = 0, dupe = 0;
for (const [id, tag] of IDS) {
  const f = path.join(ROOT, tag ? `byakuya_idle_uniform__${tag}.png` : "byakuya_idle_uniform.png");
  if (!(fs.existsSync(f) && fs.statSync(f).size > 128)) { missing++; console.log(`  MISSING ${f}`); continue; }
  const h = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
  if ([...hashes.values()].includes(h)) { dupe++; console.log(`  DUPE idle sheet: ${id}`); }
  hashes.set(id, h);
}
check("all 14 idle sheets present on disk", missing === 0, `missing=${missing}`);
check("all 14 idle sheets byte-distinct (recolor really changed each)", dupe === 0, `dupes=${dupe}`);

const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=byakuya`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "light", "heavy", "guard"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `byakuya_skin_${id}.png`), clip: { x: 200, y: 240, width: 260, height: 300 } });
  const ok = allSheets.every(s => s.includes("byakuya_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Eternal Void — the full-black skin also runs the petal/reiatsu aura overlay: several rendered frames →
// drawByakuyaVoidAuraOverlay lazily seeds _byakuyaVoidFX + runs (no error).
await pg.evaluate(() => window.__harness.setSkin("p1", "byakuyaEternalVoid"));
await force("idle"); await wf(8);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Eternal Void applied + renders void sheet", (vf.skinId === "byakuyaEternalVoid") && (vf.spriteSheet || "").includes("__void"), `skin=${vf.skinId}`);

check("no procedural boxes across all 14 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void aura overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
