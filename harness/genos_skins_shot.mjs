// harness/genos_skins_shot.mjs — Genos 11-skin batch (Default + 8 recolors + Void Sovereign + Exposed Core):
// each skin applies, renders as a SPRITE (never the procedural box), and resolves its recolored __<tag> sheet
// across idle / heavy / genosMachinegun / win (movement + normal + special + win — catches any missing
// recolored sheet). Void Sovereign runs its cybernetic circuit overlay and Exposed Core its chest-core overlay
// (must not error). Screenshots → harness/shots/genos_skin_<id>.png. (Visual pixel sign-off pending — image QA.)
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
await pg.goto(`${base}/index.html?harness=1&p1=genos`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);

const IDS = [
  ["default", ""], ["genosCrimsonChassis", "crimsonchassis"], ["genosVerdantCircuit", "verdantcircuit"],
  ["genosGoldenAlloy", "goldenalloy"], ["genosObsidianFrame", "obsidianframe"], ["genosAzureCybernetic", "azurecybernetic"],
  ["genosVioletPrototype", "violetprototype"], ["genosEmberUnit", "emberunit"], ["genosFrostbound", "frostboundchassis"],
  ["genosVoidSovereign", "void"], ["genosExposedCore", "exposedcore"],
];
try {
  for (const [id, tag] of IDS) {
    await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
    await wf(6);
    const allSheets = [];
    for (const act of ["idle", "heavy", "genosMachinegun", "win"]) {
      await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
      allSheets.push(p.spriteSheet || "null");
      await force(null); await wf(1);
    }
    await force("idle"); await wf(3);
    await pg.screenshot({ path: path.join(OUT, `genos_skin_${id}.png`), clip: { x: 420, y: 170, width: 420, height: 440 } });
    const ok = allSheets.every(s => s.includes("genos_") && (!tag || s.includes(`__${tag}`)));
    check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : allSheets[0].split("/").pop());
  }

  // Void Sovereign — full-black skin also runs the cybernetic circuit overlay: verify it applies + renders the
  // void sheet, and several rendered frames run the overlay WITHOUT error (lazily seeds _genosVoidFX on 1st draw).
  await pg.evaluate(() => window.__harness.setSkin("p1", "genosVoidSovereign"));
  await force("idle"); await wf(12);
  const vf = await pg.evaluate(() => window.__harness.p1());
  check("Void Sovereign applied + renders void sheet", vf.skinId === "genosVoidSovereign" && (vf.spriteSheet || "").includes("__void"), `skin=${vf.skinId}`);
  // exercise the overlay on the busiest FX pose (incineration windup) — must not throw
  await force("genosIncinerate3"); await wf(8);
  check("Void overlay renders on charge-blast pose without error", errs.length === 0, errs.slice(0, 2).join(" | "));
  await force(null);

  // Exposed Core — near-default sheets + chest-core overlay: applies + renders its sheet + overlay no-error.
  await pg.evaluate(() => window.__harness.setSkin("p1", "genosExposedCore"));
  await force("idle"); await wf(12);
  const ef = await pg.evaluate(() => window.__harness.p1());
  check("Exposed Core applied + renders its sheet", ef.skinId === "genosExposedCore" && (ef.spriteSheet || "").includes("__exposedcore"), `skin=${ef.skinId}`);
  await force("genosMachinegun"); await wf(6);
  check("Exposed Core overlay renders without error", errs.length === 0, errs.slice(0, 2).join(" | "));

  check("no page errors across the skin batch", errs.length === 0, errs.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR", e); fail++; }
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
