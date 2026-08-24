// harness/superman_skins_shot.mjs <charKey> — the ROSTER-WIDE Superman 10-skin TEMPLATE batch for ONE variant.
// Default + 8 recolors + Void Sovereign + Kingdom Come: each skin applies, renders as a SPRITE (never the
// procedural box), and resolves its recolored __<tag> sheet across idle / heavy / up / win (movement + normals
// + win — catches any missing recolored sheet). Void Sovereign also runs the drifting star-field overlay
// (drawSupermanVoidStarfield) — must not error. Screenshots → harness/shots/<charKey>_skin_<id>.png.
// Usage: node harness/superman_skins_shot.mjs [superman|superman_dcuc|superman_new52|superman_classic]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CHAR = process.argv[2] || "superman";
// skin-id prefix: characters use camelCase ids off the rosterKey (superman_dcuc → supermanDcuc, etc.)
const PFX = { superman: "superman", superman_dcuc: "supermanDcuc", superman_new52: "supermanNew52", superman_classic: "supermanClassic", superman_fighter: "supermanFighter" }[CHAR];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
await pg.goto(`${base}/index.html?harness=1&p1=${CHAR}`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

const IDS = [
  ["default", ""],
  [`${PFX}CrimsonReversal`, "crimsonreversal"], [`${PFX}VerdantGuardian`, "verdantguardian"],
  [`${PFX}ObsidianSteel`, "obsidiansteel"], [`${PFX}GoldenSentinel`, "goldensentinel"],
  [`${PFX}AzureDepths`, "azuredepths"], [`${PFX}VioletEclipse`, "violeteclipse"],
  [`${PFX}Frostbound`, "frostbound"], [`${PFX}Ashfall`, "ashfall"],
  [`${PFX}VoidSovereign`, "voidsovereign"], [`${PFX}KingdomCome`, "kingdomcome"],
];
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "light", "heavy", "up"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `${CHAR}_skin_${id}.png`), clip: { x: 470, y: 150, width: 340, height: 430 } });
  const ok = allSheets.every(s => s.includes(`${CHAR}_`) && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : (allSheets[0].split("/").pop()));
}

// Void Sovereign — the near-black skin also runs the star-field overlay: verify it applies + renders the void
// sheet, and that several frames run the overlay WITHOUT error (drawSupermanVoidStarfield lazily seeds _svFX).
await pg.evaluate(sid => window.__harness.setSkin("p1", sid), `${PFX}VoidSovereign`);
await force("idle"); await wf(12);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet + star-field ran", (vf.skinId === `${PFX}VoidSovereign`) && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);

check("no procedural boxes across all 10 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void star-field overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${CHAR}: ${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
