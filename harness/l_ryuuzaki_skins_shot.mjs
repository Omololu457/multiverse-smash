// harness/l_ryuuzaki_skins_shot.mjs — L "Ryuuzaki" 12-skin batch (+Default) = 13. Each skin applies, renders as a
// SPRITE (never the procedural box, never the spriteScale:1 native-shrink), and resolves its recolored __<tag> sheet
// across multiple actions (idle/light/heavy/taunt). STATIC checks: every idle+portrait sheet exists + byte-distinct,
// and the iconic near-black HAIR pixel RGB(33,16,33) survives UNCHANGED in every recolor (via the generator's `hair`
// self-check subprocess — Void excepted). The Eternal Void skin also seeds its indigo/white deduction-glyph aura
// overlay. The approval-gate PREVIEW SHEET (idle + portrait, labeled) must exist on disk. Screenshots → harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

// [skinId, recolorTag, DisplayName]. tag "" = Default (no recolor).
const IDS = [
  ["default", "", "Default"],
  ["lRyuuzakiMidnight", "midnight", "Midnight Detective"],
  ["lRyuuzakiWammys", "wammys", "Wammy's Grey"],
  ["lRyuuzakiSugar", "sugar", "Sugar Rush"],
  ["lRyuuzakiStrawberry", "strawberry", "Strawberry Cake"],
  ["lRyuuzakiInsomnia", "insomnia", "Blue Insomnia"],
  ["lRyuuzakiShinigami", "shinigami", "Shinigami Green"],
  ["lRyuuzakiKira", "kira", "Kira Crimson"],
  ["lRyuuzakiAmber", "amber", "Amber Deduction"],
  ["lRyuuzakiMono", "mono", "Monochrome Genius"],
  ["lRyuuzakiViolet", "violet", "Violet Cipher"],
  ["lRyuuzakiPanda", "panda", "Panda Insomniac"],
  ["lRyuuzakiEternalVoid", "lRyuuzakiEternalVoid", "Eternal Void"],
];
const idlePath = tag => path.join(ROOT, tag ? `l_ryuuzaki_idle_uniform__${tag}.png` : "l_ryuuzaki_idle_uniform.png");
const portPath = tag => path.join(ROOT, tag ? `l_ryuuzaki_portrait__${tag}.png` : "l_ryuuzaki_portrait.png");

// ── STATIC — every recolored idle+portrait sheet exists + all idle sheets byte-distinct ──
const hashes = new Map(); let missing = 0, dupe = 0;
for (const [id, tag] of IDS) {
  const f = idlePath(tag), pf = portPath(tag);
  if (!(fs.existsSync(f) && fs.statSync(f).size > 128)) { missing++; console.log(`  MISSING ${f}`); continue; }
  if (!(fs.existsSync(pf) && fs.statSync(pf).size > 128)) { missing++; console.log(`  MISSING ${pf}`); continue; }
  const h = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
  if ([...hashes.values()].includes(h)) { dupe++; console.log(`  DUPE idle sheet: ${id}`); }
  hashes.set(id, h);
}
check(`all ${IDS.length} idle + portrait sheets present on disk`, missing === 0, `missing=${missing}`);
check(`all ${IDS.length} idle sheets byte-distinct (recolor really changed each)`, dupe === 0, `dupes=${dupe}`);

// ── HAIR PROTECTION — generator self-check subprocess (exits 0 = hair RGB(33,16,33) unchanged in every recolor) ──
let hairOK = false, hairMsg = "";
try { hairMsg = execFileSync("python3", [path.join(ROOT, "tools", "gen_l_ryuuzaki_creative.py"), "hair"], { encoding: "utf8" }).trim(); hairOK = true; }
catch (e) { hairMsg = (e.stdout || "") + (e.stderr || String(e)); }
check("iconic near-black hair (33,16,33) UNCHANGED across all recolors", hairOK, hairMsg.split("\n").pop());

// ── PREVIEW SHEET must exist on disk (the approval gate) ──
const previewPath = path.join(OUT, "l_ryuuzaki_skins_preview.png");
check("13-skin preview sheet present (approval gate)", fs.existsSync(previewPath) && fs.statSync(previewPath).size > 1024, previewPath);

const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const baseURL = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${baseURL}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.start());
await pg.evaluate(() => window.__harness.skipToBattle());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

let boxes = 0, shrunk = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "light", "heavy", "taunt"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    if (p.spriteScale != null && p.spriteScale <= 1) shrunk++;                       // native-shrink guard
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `l_ryuuzaki_skin_${id}.png`), clip: { x: 150, y: 200, width: 320, height: 360 } });
  const ok = allSheets.every(s => s.includes("l_ryuuzaki_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: renders recolored sprite (no box, no shrink)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
}

// Eternal Void — full-black skin also runs the indigo/white deduction-glyph aura overlay: several rendered frames →
// drawLRyuuzakiVoidAuraOverlay lazily seeds _lRyuuzakiVoidFX + runs (no error).
await pg.evaluate(() => window.__harness.setSkin("p1", "lRyuuzakiEternalVoid"));
await force("idle"); await wf(8);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Eternal Void applied + renders void sheet", (vf.skinId === "lRyuuzakiEternalVoid") && (vf.spriteSheet || "").includes("__lRyuuzakiEternalVoid"), `skin=${vf.skinId}`);
await pg.screenshot({ path: path.join(OUT, `l_ryuuzaki_skin_void_aura.png`), clip: { x: 150, y: 200, width: 320, height: 360 } });

check("no procedural boxes across all skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no native-shrink (spriteScale>1) across all skins", shrunk === 0, `shrunk=${shrunk}`);
check("no page errors (incl. Void aura overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));

console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
