// harness/obito_stage3_shots.mjs — STAGE 3 evidence for Obito's ranged specials.
// Fires each of the 4 special branches (Shuriken neutral / Air Shuriken / Chakra Rod Fwd /
// Giant Shuriken Up) and proves for each: (a) the correct CAST pose plays, (b) a projectile
// spawns with the right sheet + expected trajectory, and (c) it CONNECTS (deals damage to the
// dummy). Captures a mid-flight shot of each. Uses the harness p1SpecialDir hook (sets the held
// direction then triggers) — the same path the live Special button drives.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e))); page.on("console", m => { if (m.type() === "error") jsErrors.push(m.text()); });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s3_${name}.png`) }); }
async function reset(gap = 150) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// Fire a grounded special branch, prove cast + projectile sheet + connect.
async function fireGround(nm, dir, sheetNeedle, castNeedle, gap, shotName) {
  await reset(gap);
  const hp0 = (await p2()).health;
  const info = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  check(`${nm}: cast pose = ${castNeedle}`, (info?.cast || "") === castNeedle, `cast=${info?.cast}`);
  // wait for the scheduled projectile to spawn
  let pr = null; for (let i = 0; i < 16; i++) { await waitFrames(1); const ps = await projs(); pr = ps.find(p => (p.sheet || "").includes(sheetNeedle)); if (pr) break; }
  check(`${nm}: projectile spawns (${sheetNeedle})`, !!pr, pr ? `sheet=${(pr.sheet||"").split("/").pop()} vx=${pr.vx?.toFixed?.(1)} vy=${pr.vy?.toFixed?.(1)}` : "no projectile");
  await shot(shotName);
  // let it travel + connect
  for (let i = 0; i < 40; i++) { await waitFrames(1); if ((await p2()).health < hp0) break; }
  const dmg = hp0 - (await p2()).health;
  check(`${nm}: connects (deals damage)`, dmg > 0, `dmg=${dmg}`);
  return pr;
}

section("Shuriken Throw (neutral, ground)");
await fireGround("Shuriken", null, "obito_shur_proj_uniform", "obitoShurCast", 150, "shuriken");

section("Chakra Rod Throw (Forward)");
await fireGround("Rod", "F", "obito_rod_throwprojectile", "obitoRodCast", 170, "rod");

section("Giant Shuriken (Up)");
await fireGround("Giant Shuriken", "U", "obito_giantshur_proj_uniform", "obitoShurCast", 160, "giant_shuriken");

section("Air Shuriken (airborne — diagonal down-forward)");
{ await reset(120); const hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(64));
  const info = await page.evaluate(() => window.__harness.p1SpecialDir(null));   // airborne → air branch
  check("Air Shuriken: cast pose = obitoShurCastAir", (info?.cast || "") === "obitoShurCastAir", `cast=${info?.cast}`);
  let pr = null; for (let i = 0; i < 16; i++) { await waitFrames(1); const ps = await projs(); pr = ps.find(p => (p.sheet || "").includes("obito_shur_proj_uniform")); if (pr) break; }
  check("Air Shuriken: projectile spawns with downward arc (vy>0)", !!pr && pr.vy > 0, pr ? `vx=${pr.vx?.toFixed?.(1)} vy=${pr.vy?.toFixed?.(1)}` : "no projectile");
  await shot("air_shuriken");
  for (let i = 0; i < 44; i++) { await waitFrames(1); if ((await p2()).health < hp0) break; }
  check("Air Shuriken: connects (deals damage)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`); }

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s3_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
