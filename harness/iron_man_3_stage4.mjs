// harness/iron_man_3_stage4.mjs — STAGE 4: Iron Man 3's 3-TIER CHARGE + Super Move + Super Laser.
// The centerpiece is the on-sheet 3-tier charge (Basic → Charged → Supercharged): each tier fires its OWN
// on-sheet projectile ART (basic_shot / charged_shot / supercharged_shot), with size + cost + damage ramping.
// Tests:
//   (1) WIRING — cast poses (ironMan3Repulsor / ironMan3SuperMove[Air]) resolve real iron_man_3_ sheets.
//   (2) 3-TIER CHARGE S/C/X — each fires (cast held), spends its escalating cost (14/30/55), spawns a
//       projectile carrying that tier's DISTINCT real sheet; size ramps S<C<X.
//   (3) DAMAGE ramp — Supercharged (X) hits harder than Basic (S), both connect on the dummy.
//   (4) SUPER LASER (Fwd+Special) — spawns the beam projectile (super_laser sheet), connects.
//   (5) SUPER MOVE (Up+Special) — spinning-burst AoE connects (ironMan3SuperMove); air = ironMan3SuperMoveAir.
// Screenshots → harness/shots/iron_man_3_stage4_*.png. See IRON_MAN_3_ASSET_MAP.md.
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
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `iron_man_3_stage4_${tag}.png`) }); }
const fireTier = (t) => page.evaluate(tt => window.__harness.ironMan3Repulsor(tt), t);
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); });
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.4);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_3`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) wiring: special cast poses → real iron_man_3_ sheets ──");
  const ad = await page.evaluate(() => window.__harness.charDef("iron_man_3").animationData);
  check("ironMan3Repulsor cast wired to an iron_man_3_ sheet", (ad.ironMan3Repulsor?.sheet || "").includes("iron_man_3_"), `sheet=${ad.ironMan3Repulsor?.sheet}`);
  check("ironMan3SuperMove cast wired to an iron_man_3_ sheet", (ad.ironMan3SuperMove?.sheet || "").includes("iron_man_3_super_move"), `sheet=${ad.ironMan3SuperMove?.sheet}`);
  check("ironMan3SuperMoveAir cast wired to an iron_man_3_ sheet", (ad.ironMan3SuperMoveAir?.sheet || "").includes("iron_man_3_super_move_air"), `sheet=${ad.ironMan3SuperMoveAir?.sheet}`);

  console.log("\n── (2) 3-tier charge S/C/X — cost + DISTINCT real projectile art + size ramp ──");
  const tiers = [["S", 14, "basic_shot"], ["C", 30, "charged_shot"], ["X", 55, "supercharged_shot"]];
  const info = {}; let costOK = true;
  for (const [tier, cost, artName] of tiers) {
    await waitGrounded();
    await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
    await waitFrames(1);
    const res = await fireTier(tier);
    check(`tier ${tier}: fires (cast=${res?.cast}, spent ${res?.spent})`, res?.ok && res?.cast === "ironMan3Repulsor", `ok=${res?.ok} cast=${res?.cast}`);
    if (Math.abs((res?.spent || 0) - cost) > 0.5) costOK = false;
    let w = 0, sheet = "";
    for (let f = 0; f < 20 && w === 0; f++) { await waitFrames(1); const pr = await projectiles(); const rp = pr.find(p => (p.name || "").includes("ironMan3Repulsor")); if (rp) { w = rp.w || rp.radius || 0; sheet = rp.sheet || ""; } }
    info[tier] = { w, sheet };
    check(`tier ${tier}: projectile carries the ${artName} sheet (real per-tier art)`, sheet.includes(artName), `sheet=${sheet}`);
    if (tier === "S") await shot("charge_basic"); if (tier === "C") await shot("charge_charged"); if (tier === "X") await shot("charge_supercharged");
    await waitFrames(6);
  }
  check("every tier spends exactly its cost (14/30/55)", costOK, tiers.map(t => `${t[0]}:${t[1]}`).join(" "));
  check("projectile SIZE ramps S<C<X", info.S.w < info.C.w && info.C.w < info.X.w, `S:${info.S.w} C:${info.C.w} X:${info.X.w}`);
  check("all 3 tiers carry DISTINCT sheets (no collapse)", new Set([info.S.sheet, info.C.sheet, info.X.sheet]).size === 3, [info.S.sheet, info.C.sheet, info.X.sheet].map(s => (s || "?").split("/").pop()).join(", "));

  console.log("\n── (3) damage ramp: Supercharged (X) hits harder than Basic (S) ──");
  await setupAdjacent(70);
  let hp0 = (await p2()).health; await fireTier("S"); await waitFrames(22); const dmgS = hp0 - (await p2()).health;
  await setupAdjacent(70);
  hp0 = (await p2()).health; await fireTier("X"); await waitFrames(22); const dmgX = hp0 - (await p2()).health;
  check(`Basic (S) connects (${dmgS.toFixed(0)})`, dmgS > 0, `dmg=${dmgS}`);
  check(`Supercharged (X) connects and hits harder than Basic (${dmgX.toFixed(0)} > ${dmgS.toFixed(0)})`, dmgX > dmgS, `S=${dmgS} X=${dmgX}`);

  console.log("\n── (4) Super Laser (Fwd+Special) — beam projectile spawns + connects ──");
  await setupAdjacent(90);
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.ironMan3Special("F"));
  let sawLaser = false, laserSheet = "";
  for (let f = 0; f < 30 && !sawLaser; f++) { await waitFrames(1); const pr = await projectiles(); const lp = pr.find(p => (p.name || "").includes("ironMan3SuperLaser")); if (lp) { sawLaser = true; laserSheet = lp.sheet || ""; } }
  await shot("super_laser");
  await waitFrames(24);
  const dmgL = hp0 - (await p2()).health;
  check("Super Laser spawns ironMan3SuperLaser beam (super_laser sheet)", sawLaser && laserSheet.includes("super_laser"), `sheet=${laserSheet}`);
  check(`Super Laser connects (dmg ${dmgL.toFixed(0)})`, dmgL > 0, `dmg=${dmgL}`);

  console.log("\n── (5) Super Move (Up+Special ground / air) — spinning-burst AoE connects ──");
  await setupAdjacent(46);
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.ironMan3Special("U"));
  await waitFrames(2); const sm = await p1(); await shot("super_move");
  await waitFrames(24);
  const dmgSM = hp0 - (await p2()).health;
  const smMove = sm.currentMove || sm.spriteAction || "";
  check("Super Move (ground) → ironMan3SuperMove (real spin-burst art)", /ironMan3SuperMove\b/.test(smMove) || (sm.spriteSheet || "").includes("iron_man_3_super_move_uniform"), `move=${smMove} sheet=${sm.spriteSheet}`);
  check(`Super Move connects (dmg ${dmgSM.toFixed(0)})`, dmgSM > 0, `dmg=${dmgSM}`);
  // air variant
  await setupAdjacent(40);
  await page.evaluate(() => window.__harness.liftP1(60));
  await page.evaluate(() => window.__harness.ironMan3Special("U"));
  await waitFrames(2); const sma = await p1();
  const smaMove = sma.currentMove || sma.spriteAction || "";
  check("Super Move (air) → ironMan3SuperMoveAir (midair variant)", /ironMan3SuperMoveAir/.test(smaMove) || (sma.spriteSheet || "").includes("iron_man_3_super_move_air"), `move=${smaMove} sheet=${sma.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
