// harness/kakashi_stage4.mjs
// STAGE 4 evidence: Kakashi's "Weapon Throw" special — a kunai (orange spinning-slash projectile) in
// 3 DISTINCT STANCE contexts, each built separately (not one anim reused):
//   (1) WIRING — kakashiThrow / kakashiThrowCrouch / kakashiThrowAir cast poses point at real sheets (no box)
//       and are 3 DISTINCT sheets.
//   (2) STANDING (neutral ground) — casts kakashiThrow, spawns a kakashiKunai projectile, connects.
//   (3) CROUCH (Down) — casts kakashiThrowCrouch (distinct), spawns a projectile, connects.
//   (4) AIR (airborne) — casts kakashiThrowAir (distinct), spawns a projectile.
// Projectile damage runs through GLOBAL_DAMAGE_SCALE ×0.60. Screenshots → harness/shots/kakashi_stage4_*.png.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `kakashi_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 22) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase())); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || p.width || 0)); } await waitFrames(1); } return { seen, maxW }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("kakashi").animationData);

  console.log("\n── (1) wiring: 3 DISTINCT weapon-throw cast poses → real kakashi sheets (no box) ──");
  for (const [k, tag] of [
    ["kakashiThrow", "kakashi_throw_uniform"], ["kakashiThrowCrouch", "kakashi_throwcrouch_uniform"], ["kakashiThrowAir", "kakashi_throwair_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  const sheets = new Set([ad.kakashiThrow?.sheet, ad.kakashiThrowCrouch?.sheet, ad.kakashiThrowAir?.sheet]);
  check("all 3 contexts use DISTINCT sheets (built separately)", sheets.size === 3, [...sheets].map(s => (s || "").split("/").pop()).join(" | "));

  console.log("\n── (2) STANDING throw (neutral ground) — cast + kunai projectile + connect ──");
  await prep(150);
  let h0 = (await p2()).health;
  const sres = await fireDir(null);
  check(`standing throw casts kakashiThrow`, sres?.cast === "kakashiThrow", `cast=${sres?.cast}`);
  const sp = await seeProj("kakashiKunai", 22);
  check(`standing throw spawns a kakashiKunai projectile`, sp.seen >= 1, `seen=${sp.seen}`);
  await shot("stand");
  await waitFrames(22);
  check(`standing throw connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) CROUCH throw (Down) — DISTINCT cast + projectile + connect ──");
  await prep(150);
  h0 = (await p2()).health;
  const cres = await fireDir("D");
  check(`crouch throw casts kakashiThrowCrouch (distinct)`, cres?.cast === "kakashiThrowCrouch", `cast=${cres?.cast}`);
  const cp = await seeProj("kakashiKunai", 22);
  check(`crouch throw spawns a kakashiKunai projectile`, cp.seen >= 1, `seen=${cp.seen}`);
  await shot("crouch");
  await waitFrames(22);
  check(`crouch throw connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) AIR throw (airborne) — DISTINCT cast + projectile ──");
  await prep(120);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(2);
  const ares = await fireDir(null);
  check(`air throw casts kakashiThrowAir (distinct)`, ares?.cast === "kakashiThrowAir", `cast=${ares?.cast}`);
  const apj = await seeProj("kakashiKunai", 22);
  check(`air throw spawns a kakashiKunai projectile`, apj.seen >= 1, `seen=${apj.seen}`);
  await shot("air");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) cost: throw spends energy (chakra) ──");
  await prep(150);
  const e0 = (await p1()).energy;
  await fireDir(null); await waitFrames(2);
  const e1 = (await p1()).energy;
  check(`weapon throw spends chakra (${e0} → ${e1})`, e1 < e0, `Δ=${(e0 - e1).toFixed(0)}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
