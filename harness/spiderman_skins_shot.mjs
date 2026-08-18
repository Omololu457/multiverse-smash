// harness/spiderman_skins_shot.mjs — Spider-Man skins (Default + "Negative Zone" white/blue alt-costume).
// Each skin applies, renders as a SPRITE (never the procedural box), and the Negative Zone skin resolves
// its recolored __whiteblue sheet across multiple actions (idle/light/heavy/win/spiderCombo/spiderWebBridge)
// so a missing recolored sheet is caught. Screenshots → harness/shots/spiderman_skin_<id>.png.
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

// The full skin batch: [id, tag]. tag "" = default (native sheets).
const IDS = [
  ["default", ""],
  ["spidermanNegativeZone", "whiteblue"],
  ["spidermanCrimsonWeave", "crimsonweave"], ["spidermanVerdantWidow", "verdantwidow"],
  ["spidermanVioletNightcrawler", "violetnightcrawler"], ["spidermanGoldenGuardian", "goldenguardian"],
  ["spidermanFrostLine", "frostline"], ["spidermanEmberStrike", "emberstrike"],
  ["spidermanJadeWeb", "jadeweb"], ["spidermanObsidianWeb", "obsidianweb"],
  ["spidermanWhiteReflective", "whitereflective"], ["spidermanVoidSovereign", "voidsovereign"],
];

// STATIC — every recolored __<tag> sheet + portrait exists on disk (mirrors the animationData set), for
// every non-default skin. Catches a missing recolored sheet before the browser even opens.
import characters from "../characters.js";
const ad = characters.spiderman.animationData;
const diskMissing = [];
for (const [, tag] of IDS) {
  if (!tag) continue;
  for (const def of Object.values(ad)) { if (!def?.sheet) continue; const f = def.sheet.replace(/\.png$/i, `__${tag}.png`); const p = path.join(ROOT, f.replace(/^\.\//, "")); if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) diskMissing.push(f); }
  const port = path.join(ROOT, `spiderman_portrait__${tag}.png`); if (!(fs.existsSync(port) && fs.statSync(port).size > 128)) diskMissing.push(`spiderman_portrait__${tag}.png`);
}
check(`all ${IDS.length - 1} skins' recolored sheets + portraits present on disk`, diskMissing.length === 0, diskMissing.slice(0, 5).join(", "));

await pg.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

// skins list contract
const skins = await pg.evaluate(() => (window.__harness.skins ? window.__harness.skins("spiderman") : null));
if (skins) check(`${IDS.length} skins registered (Default + Negative Zone + 8 palette + 2 specialty)`, skins.length === IDS.length && IDS.every(([id]) => skins.some(s => s.id === id)), `${skins.length}: ${skins.map(s => s.id).join(", ")}`);

const ACTS = ["idle", "light", "heavy", "up", "win", "spiderCombo", "spiderWebBridge"];
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const sheets = [];
  for (const act of ACTS) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    sheets.push((p.spriteSheet || "null").split("/").pop());
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `spiderman_skin_${id}.png`), clip: { x: 380, y: 150, width: 520, height: 470 } });
  const ok = sheets.every(s => s.includes("spiderman_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite across ${ACTS.length} actions (no box)`, ok, tag ? `tag=${tag}` : sheets[0]);
}

// Void Sovereign — the near-black skin also runs the procedural web-strand aura overlay: verify it seeds
// its FX field after a rendered frame (drawSpidermanVoidAuraOverlay lazily seeds _spiderVoidFX on first draw).
await pg.evaluate(() => window.__harness.setSkin("p1", "spidermanVoidSovereign"));
await force("idle"); await wf(8);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "spidermanVoidSovereign") && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);

check("no procedural boxes across all skins × actions", boxes === 0, `boxes=${boxes}`);
check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
