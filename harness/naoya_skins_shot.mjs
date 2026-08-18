// harness/naoya_skins_shot.mjs — Naoya 10-skin batch (+Default = 11): each skin applies, renders as a SPRITE
// (never the procedural box), and resolves its recolored __<tag> sheet across multiple actions (idle/light/
// heavy/crouch) so a missing recolored sheet is caught. Void Sovereign seeds its ink-brush aura overlay;
// Narcissus runs its mirror-shimmer overlay. Also a STATIC distinctness check (no two skins share an idle
// sheet). Screenshots → harness/shots/naoya_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""], ["naoyaCrimsonDojo", "crimsondojo"], ["naoyaAzureSensei", "azuresensei"],
  ["naoyaGoldenRonin", "goldenronin"], ["naoyaObsidianBlade", "obsidianblade"], ["naoyaVerdantElder", "verdantelder"],
  ["naoyaWisteriaDuelist", "wisteriaduelist"], ["naoyaEmberRonin", "emberronin"], ["naoyaFrostboundKendo", "frostboundkendo"],
  ["naoyaVoidSovereign", "void"], ["naoyaNarcissus", "narcissus"],
];

// ── STATIC — every recolored idle sheet exists + all 11 idle sheets are byte-distinct (no accidental dupes) ──
const hashes = new Map();
let missing = 0, dupe = 0;
for (const [id, tag] of IDS) {
  const f = path.join(ROOT, tag ? `naoya_idle_uniform__${tag}.png` : "naoya_idle_uniform.png");
  if (!(fs.existsSync(f) && fs.statSync(f).size > 128)) { missing++; console.log(`  MISSING ${f}`); continue; }
  const h = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
  if ([...hashes.values()].includes(h)) { dupe++; console.log(`  DUPE idle sheet: ${id}`); }
  hashes.set(id, h);
}
check("all 11 idle sheets present on disk", missing === 0, `missing=${missing}`);
check("all 11 idle sheets byte-distinct (recolor really changed each)", dupe === 0, `dupes=${dupe}`);

const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
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
  for (const act of ["idle", "light", "heavy", "crouch"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `naoya_skin_${id}.png`), clip: { x: 210, y: 250, width: 240, height: 300 } });
  const ok = allSheets.every(s => s.includes("naoya_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Void Sovereign — the near-black skin also runs the ink-brush aura overlay: several rendered frames →
// drawNaoyaVoidAuraOverlay lazily seeds _naoyaVoidFX + runs (no error).
await pg.evaluate(() => window.__harness.setSkin("p1", "naoyaVoidSovereign"));
await force("idle"); await wf(8);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "naoyaVoidSovereign") && (vf.spriteSheet || "").includes("__void"), `skin=${vf.skinId}`);

// Narcissus — the mirror-shimmer overlay runs on the idle/standing pose (no error).
await pg.evaluate(() => window.__harness.setSkin("p1", "naoyaNarcissus"));
await force("idle"); await wf(8);
const nf = await pg.evaluate(() => window.__harness.p1());
check("Narcissus applied + renders narcissus sheet", (nf.skinId === "naoyaNarcissus") && (nf.spriteSheet || "").includes("__narcissus"), `skin=${nf.skinId}`);

check("no procedural boxes across all 11 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void + Narcissus overlays)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
