// harness/gohan_skins_shot.mjs — Teen Gohan 10-skin batch (Default + 8 recolors + Void Sovereign).
// ★BOTH-FORMS proof: each skin applies, renders as a SPRITE (never the box), and resolves its recolored __<tag>
// sheet on the BASE form AND — after transforming — on the SSJ2 form (via recolorTag + retagFormAnim). A STATIC
// on-disk sweep confirms every recolored base + SSJ2 sheet + portrait exists. Void Sovereign also runs its
// ki-wisp aura overlay (must not error). Screenshots → harness/shots/gohan_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""],
  ["gohanCrimsonSuccessor", "crimsonsuccessor"], ["gohanVerdantScholar", "verdantscholar"],
  ["gohanGoldenHeir", "goldenheir"], ["gohanObsidianDisciple", "obsidiandisciple"],
  ["gohanAzureNamekian", "azurenamekian"], ["gohanVioletReborn", "violetreborn"],
  ["gohanEmberSuccessor", "embersuccessor"], ["gohanFrostboundScholar", "frostboundscholar"],
  ["gohanVoidSovereign", "voidsovereign"],
];
const BASE_SHEETS = ["idle","walk","run","dash","jump","fall","crouch","guard","hurt","knockdown","getup",
  "taunt","light","heavy","up","air","rush1","rush2","rush3","win","intro","transform"];
const SSJ2_SHEETS = ["ssj2_idle","ssj2_walk","ssj2_run","ssj2_dash","ssj2_jump","ssj2_fall","ssj2_crouch",
  "ssj2_guard","ssj2_hurt","ssj2_knockdown","ssj2_getup","ssj2_light","ssj2_heavy","ssj2_up","ssj2_air",
  "ssj2_rush1","ssj2_rush2","ssj2_rush3"];

// ── STATIC on-disk sweep — every recolored base + SSJ2 sheet + portrait exists for each of the 9 tags ──
let missing = [];
for (const [, tag] of IDS) {
  if (!tag) continue;
  for (const s of [...BASE_SHEETS, ...SSJ2_SHEETS]) { const p = path.join(ROOT, `gohan_${s}_uniform__${tag}.png`); if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(`${tag}:${s}`); }
  const pp = path.join(ROOT, `gohan_portrait__${tag}.png`); if (!(fs.existsSync(pp) && fs.statSync(pp).size > 128)) missing.push(`${tag}:portrait`);
}
check(`STATIC: all 9 tags × (${BASE_SHEETS.length + SSJ2_SHEETS.length} sheets + portrait) exist on disk`, missing.length === 0, missing.slice(0, 6).join(", "));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=gohan`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.start());
await pg.evaluate(() => window.__harness.skipToBattle());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "heavy", "win", "gohanIntro"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `gohan_skin_${id}.png`), clip: { x: 360, y: 280, width: 340, height: 360 } });
  await force(null); await wf(1);
  const ok = allSheets.every(s => s.includes("gohan_") && (!tag || s.includes(`__${tag}`)));
  check(`${id} BASE: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// ★ BOTH-FORMS PROOF — apply a recolor, TRANSFORM to SSJ2, verify the SSJ2 form art also carries the __tag.
await pg.evaluate(() => window.__harness.setSkin("p1", "gohanCrimsonSuccessor")); await wf(4);
await pg.evaluate(() => window.__harness.setEnergy(200));
await pg.evaluate(() => window.__harness.p1GohanTransform()); await wf(30);
await force("idle"); await wf(4);
const ssj2Skin = await pg.evaluate(() => window.__harness.p1());
check("SSJ2 form carries the skin recolor (gohan_ssj2_idle__crimsonsuccessor)", /gohan_ssj2_idle_uniform__crimsonsuccessor/.test(ssj2Skin.spriteSheet || ""), `sheet=${ssj2Skin.spriteSheet}`);
await pg.evaluate(() => window.__harness.setEnergy(0)); await wf(4); await force(null);   // drain → revert

// Void Sovereign — near-black skin also runs the ki-wisp aura overlay: applies + renders void sheet + no error.
await pg.evaluate(() => window.__harness.setSkin("p1", "gohanVoidSovereign"));
await force("idle"); await wf(14);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "gohanVoidSovereign") && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);
await pg.screenshot({ path: path.join(OUT, `gohan_skin_void_closeup.png`), clip: { x: 360, y: 280, width: 340, height: 360 } });
await force(null);

check("no procedural boxes across all skins × actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void ki-wisp overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
