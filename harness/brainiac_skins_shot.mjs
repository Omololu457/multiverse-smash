// harness/brainiac_skins_shot.mjs — Brainiac 11-skin batch (Default + 8 recolors + Animated Protocol + Void):
// each skin applies, renders as a SPRITE (never the procedural box), and resolves its recolored __<tag> sheet
// across idle / heavy / brainiacBlade / brainiacShield (movement + normal + special-melee + special-buff pose —
// catches any missing recolored sheet). The Void Sovereign skin also runs its data-glyph/binary aura overlay
// (must not error). Screenshots → harness/shots/brainiac_skin_<id>.png.
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
await pg.goto(`${base}/index.html?harness=1&p1=brainiac`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

const IDS = [
  ["default", ""], ["brainiacCrimsonCircuit", "crimsoncircuit"], ["brainiacAzureIntelligence", "azureintelligence"],
  ["brainiacGoldenArchive", "goldenarchive"], ["brainiacObsidianProcessor", "obsidianprocessor"],
  ["brainiacVerdantOvermind", "verdantovermind"], ["brainiacVioletNexus", "violetnexus"],
  ["brainiacEmberCore", "embercore"], ["brainiacFrostboundArray", "frostboundarray"],
  ["brainiacAnimatedProtocol", "animatedprotocol"], ["brainiacVoidSovereign", "voidsovereign"],
];
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "heavy", "brainiacBlade", "brainiacShield"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `brainiac_skin_${id}.png`), clip: { x: 420, y: 170, width: 440, height: 440 } });
  const ok = allSheets.every(s => s.includes("brainiac_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Void Sovereign — the full-black skin also runs the data-glyph aura overlay: verify it applies + renders the
// void sheet, and that several rendered frames run the overlay WITHOUT error (drawBrainiacVoidAuraOverlay
// lazily seeds _brainiacVoidFX on first draw).
await pg.evaluate(() => window.__harness.setSkin("p1", "brainiacVoidSovereign"));
await force("idle"); await wf(10);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "brainiacVoidSovereign") && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);

check("no procedural boxes across all 11 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void data-glyph overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
