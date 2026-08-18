// harness/alt_sukuna_skins_shot.mjs — Alternate Sukuna 11-skin batch (Default + 8 recolors + Ink Wash + Void):
// each skin applies, renders as a SPRITE (never the procedural box), and resolves its recolored __<tag> sheet
// across idle / heavy / altSukunaCleave2 / altSukunaBeam (movement + normal + command-string + special pose —
// catches any missing recolored sheet). A STATIC on-disk sweep confirms every recolored sheet + portrait
// exists. The Void Sovereign skin also runs its cherry-blossom aura overlay (must not error).
// Screenshots → harness/shots/alt_sukuna_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""], ["altSukunaCrimsonMalevolence", "crimsonmalevolence"], ["altSukunaAzureCurse", "azurecurse"],
  ["altSukunaGoldenSovereign", "goldensovereign"], ["altSukunaObsidianKing", "obsidianking"],
  ["altSukunaVerdantCurse", "verdantcurse"], ["altSukunaWisteriaReign", "wisteriareign"],
  ["altSukunaEmberFeast", "emberfeast"], ["altSukunaFrostboundSovereign", "frostboundsovereign"],
  ["altSukunaInkWash", "inkwash"], ["altSukunaVoidSovereign", "voidsovereign"],
];

// ── STATIC on-disk sweep — every recolored sheet + portrait exists for each of the 10 tags ──
const SHEETS = ["idle","walk","dash","jump","fall","crouch","guard","hurt","knockdown","getup","light","heavy","up","air","cleave1","cleave2","beam","spinkick","grab","ultcharge","intro","win"];
let missing = [];
for (const [, tag] of IDS) {
  if (!tag) continue;
  for (const s of SHEETS) { const p = path.join(ROOT, `alt_sukuna_${s}_uniform__${tag}.png`); if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(`${tag}:${s}`); }
  const pp = path.join(ROOT, `alt_sukuna_portrait__${tag}.png`); if (!(fs.existsSync(pp) && fs.statSync(pp).size > 128)) missing.push(`${tag}:portrait`);
}
check(`STATIC: all 10 tags × (22 sheets + portrait) exist on disk`, missing.length === 0, missing.slice(0, 6).join(", "));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
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
  for (const act of ["idle", "heavy", "altSukunaCleave2", "altSukunaBeam"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("win"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `alt_sukuna_skin_${id}.png`), clip: { x: 360, y: 300, width: 320, height: 320 } });
  await force(null); await wf(1);
  const ok = allSheets.every(s => s.includes("alt_sukuna_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Void Sovereign — the full-black skin also runs the cherry-blossom aura overlay: verify it applies + renders
// the void sheet, and several rendered frames run the overlay WITHOUT error (lazily seeds _altSukunaVoidFX).
await pg.evaluate(() => window.__harness.setSkin("p1", "altSukunaVoidSovereign"));
await force("idle"); await wf(12);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "altSukunaVoidSovereign") && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);

check("no procedural boxes across all 11 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void cherry-blossom overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
