// harness/gotenks_stage4.mjs
// STAGE 4 evidence: Gotenks's small 2-move SPECIAL kit (only two special-tier actions exist on the sheet).
// (1) WIRING — the two cast-pose actions point at real reslice'd sheets (no box).
// (2) KI BLAST (neutral GROUND) — casts gotenksKiBlast, spawns a PROCEDURAL gold shard projectile, connects,
//     and COSTS Ki (the shard has no sheet art — it is procedural, GOTENKS_ASSET_MAP.md).
// (3) KI BLAST (air) — airborne cast + projectile.
// (4) KI CHARGE (Down) — resource build: casts gotenksKiCharge, REFILLS Ki over the window, deals NO damage.
// Screenshots → harness/shots/gotenks_stage4_*.png. See GOTENKS_ASSET_MAP.md.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `gotenks_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 20) { let seen = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) seen = Math.max(seen, hit.length); await waitFrames(1); } return seen; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gotenks`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("gotenks").animationData);

  console.log("\n── (1) wiring: special cast actions → real gotenks_ sheets (no box) ──");
  for (const [k, tag] of [["gotenksKiBlast", "gotenks_kiblast_uniform"], ["gotenksKiCharge", "gotenks_kicharge_uniform"]])
    check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Ki Blast (neutral) — cast + procedural shard + connect + costs Ki ──");
  await prep(140);
  let h0 = (await p2()).health; const e0 = (await p1()).energy;
  const bres = await fireDir(null);
  check("Ki Blast casts gotenksKiBlast", bres?.cast === "gotenksKiBlast", `cast=${bres?.cast}`);
  const seen = await seeProj("gotenksKiBlast", 20);
  check("Ki Blast spawns a procedural shard projectile", seen >= 1, `seen=${seen}`);
  await shot("kiblast");
  await waitFrames(20);
  check(`Ki Blast connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  check(`Ki Blast costs Ki (Δ ${(e0 - (await p1()).energy).toFixed(0)})`, (await p1()).energy < e0, `e0=${e0} e1=${(await p1()).energy}`);
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Ki Blast (air) — airborne cast + projectile ──");
  await prep(140);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(5);
  const ares = await fireDir(null);
  check("air Ki Blast casts gotenksKiBlast", ares?.cast === "gotenksKiBlast", `cast=${ares?.cast}`);
  const seenAir = await seeProj("gotenksKiBlast", 18);
  check("air Ki Blast spawns a projectile", seenAir >= 1, `seen=${seenAir}`);
  await shot("kiblast_air");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Ki Charge (Down) — resource build: refills Ki, deals NO damage ──");
  await prep(150);
  await page.evaluate(() => window.__harness.setEnergy?.(40));   // drain so there is Ki to build
  await waitFrames(2);
  const eC0 = (await p1()).energy; const hC0 = (await p2()).health;
  const cres = await fireDir("D");
  check("Ki Charge casts gotenksKiCharge", cres?.cast === "gotenksKiCharge", `cast=${cres?.cast}`);
  await shot("kicharge");
  await waitFrames(40);   // let the gather window grant Ki
  const eC1 = (await p1()).energy;
  check(`Ki Charge REFILLS Ki (Δ +${(eC1 - eC0).toFixed(0)})`, eC1 > eC0 + 5, `e0=${eC0} e1=${eC1}`);
  check("Ki Charge deals NO damage to P2 (resource build, no hit)", (await p2()).health >= hC0 - 0.01, `p2 h0=${hC0} h1=${(await p2()).health}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
