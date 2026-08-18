// harness/green_lantern_skins_shot.mjs — Green Lantern 11-skin batch (Default + 8 Lantern-Corps + Black
// Lantern + Void Sovereign + Parallax Armor). Each skin: applies, renders as a SPRITE (never the procedural
// box), and resolves its recolored __<tag> sheet across idle / heavy / glBeam / win. FULL FX-recolour scope:
// firing a construct spawns the recolored __<tag> construct projectile sheet. Void Sovereign runs its cosmic
// star-field overlay (must not error). Screenshots → harness/shots/green_lantern_skin_<id>.png (for later
// visual sign-off — this session's image budget is exhausted; checks here are programmatic).
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

await pg.goto(`${base}/index.html?harness=1&p1=green_lantern`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
const projs = () => pg.evaluate(() => window.__harness.projectiles());
await wf(6);

const IDS = [
  ["default", ""], ["glSinestroCorps", "sinestrocorps"], ["glRedLanternCorps", "redlanterncorps"],
  ["glOrangeLanternCorps", "orangelanterncorps"], ["glBlueLanternCorps", "bluelanterncorps"],
  ["glIndigoTribe", "indigotribe"], ["glStarSapphireCorps", "starsapphirecorps"],
  ["glBlackLanternCorps", "blacklanterncorps"], ["glWhiteLantern", "whitelantern"],
  ["glParallaxArmor", "parallaxarmor"], ["glVoidSovereign", "voidsovereign"],
];

// STATIC: every recolored body + FX + portrait sheet exists on disk (11 skins − default = 10 tags).
console.log("\n── static recolored-sheet sweep ──");
const BODY = ["gl_idle_uniform","gl_run_uniform","gl_jump_uniform","gl_fall_uniform","gl_flight_uniform","gl_hurt_uniform","gl_knockdown_uniform","gl_light_uniform","gl_heavy_uniform","gl_up_uniform","gl_air_uniform","gl_spinkick_uniform","gl_beam_uniform","gl_win_uniform"];
const FX = ["gl_fist_uniform","gl_lion_uniform","gl_blade_uniform","gl_tentacle_uniform","gl_spike_uniform","gl_sphere_uniform"];
let missing = [];
for (const [, tag] of IDS) { if (!tag) continue; for (const s of [...BODY, ...FX, "gl_portrait"]) if (!fs.existsSync(path.join(ROOT, `${s}__${tag}.png`))) missing.push(`${s}__${tag}`); }
check("all recolored body+FX+portrait sheets exist (10 tags × 21)", missing.length === 0, missing.slice(0, 4).join(", "));

console.log("\n── per-skin render + FX-recolour ──");
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const allSheets = [];
  for (const act of ["idle", "heavy", "glBeam", "win"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    allSheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;   // must be the recolored sheet
    await force(null); await wf(1);
  }
  const ok = allSheets.every(s => s.includes("gl_") && (!tag || s.includes(`__${tag}`)));
  check(`${id}: body renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
  // FULL FX scope: fire the neutral construct (Emerald Fist) → the projectile carries the recolored construct sheet
  await pg.evaluate(() => window.__harness.fillEnergy?.());
  await pg.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP1X?.(p.x); });
  const res = await pg.evaluate(() => window.__harness.p1SpecialDir(null));
  let fxSheet = "";
  for (let i = 0; i < 14 && !fxSheet; i++) { await wf(1); const fp = (await projs()).find(p => p.name === "glFist"); if (fp) fxSheet = fp.sheet || ""; }
  check(`${id}: construct FX sheet ${tag ? "recolored" : "base"}`, tag ? fxSheet.includes(`__${tag}.png`) : (fxSheet.includes("gl_fist_uniform.png") && !fxSheet.includes("__")), `sheet=${fxSheet.split("/").pop()}`);
  await wf(20);
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `green_lantern_skin_${id}.png`), clip: { x: 380, y: 160, width: 460, height: 460 } });
}

// Void Sovereign — full-black skin also runs the cosmic star-field aura overlay: verify it applies + renders
// the void sheet, and several frames run the overlay WITHOUT error (drawGreenLanternVoidAuraOverlay lazily
// seeds _glVoidFX on first draw).
await pg.evaluate(() => window.__harness.setSkin("p1", "glVoidSovereign"));
await force("idle"); await wf(12);
const vf = await pg.evaluate(() => window.__harness.p1());
check("Void Sovereign applied + renders void sheet", (vf.skinId === "glVoidSovereign") && (vf.spriteSheet || "").includes("__voidsovereign"), `skin=${vf.skinId}`);

check("no procedural boxes across all 11 skins × 4 actions", boxes === 0, `boxes=${boxes}`);
check("no page errors (incl. Void cosmic star-field overlay)", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
