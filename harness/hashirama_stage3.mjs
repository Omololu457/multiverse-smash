// harness/hashirama_stage3.mjs — STAGE 3: Hashirama's Kunai Throw specials (ground + air).
// Ground (Special "l" on the ground) and air (Special airborne) each: play the correct caster cast pose,
// spawn the shared SPINNING SHURIKEN projectile (hashirama_kunai_throw_projectile_uniform, 8f), the
// projectile travels forward, and it CONNECTS on a ranged dummy (hp drops). Air throw is angled down.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `hashirama_s3_${tag}.png`) }); }
// re-center p1 to mid-arena then park the dummy a fixed gap to the RIGHT (facing 1) so "forward" is stable
async function park(gap) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.35)); await waitFrames(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
// find a live kunai projectile (owned shuriken), or the last one seen while polling
async function waitProjectile(maxF = 24) {
  for (let f = 0; f < maxF; f++) { const list = await projs(); const k = list.find(p => (p.sheet || "").includes("kunai_throw_projectile")); if (k) return k; await waitFrames(1); }
  return null;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND KUNAI: Special on the ground ──
  console.log("\n── ground kunai (neutral Special) ──");
  await park(200);
  {
    const en0 = (await p1()).energy;
    const hp0 = (await p2()).health;
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    // caster cast pose
    let cast = null; for (let f = 0; f < 16; f++) { const s = await p1(); if (s.castMove === "kunaiThrow" || (s.spriteSheet || "").includes("kunai_throw_uniform")) { cast = s; break; } await waitFrames(1); }
    check("ground: caster plays kunaiThrow pose", !!cast && (cast.castMove === "kunaiThrow" || (cast.spriteSheet || "").includes("kunai_throw_uniform")), `castMove=${cast?.castMove} sheet=${cast?.spriteSheet}`);
    check("ground: spends chakra", (await p1()).energy < en0, `en ${en0} → ${(await p1()).energy}`);
    const k = await waitProjectile();
    check("ground: spinning-shuriken projectile spawns", !!k && (k.sheet || "").includes("kunai_throw_projectile"), `proj=${k ? k.sheet : "none"}`);
    check("ground: projectile flies forward (vx > 0)", !!k && k.vx > 0, `vx=${k?.vx}`);
    await shot("ground_throw");
    // let it travel + connect
    await page.waitForFunction((h) => window.__harness.p2().health < h, hp0, { timeout: 4000, polling: 16 }).catch(() => {});
    const hp1 = (await p2()).health;
    check("ground: projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR KUNAI: Special while airborne ──
  console.log("\n── air kunai (airborne Special) ──");
  await park(180);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(70)); await waitFrames(1);
    await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
    let cast = null; for (let f = 0; f < 16; f++) { const s = await p1(); if (s.castMove === "kunaiThrowAir" || (s.spriteSheet || "").includes("kunai_throw_air_uniform")) { cast = s; break; } await waitFrames(1); }
    check("air: caster plays kunaiThrowAir pose", !!cast && (cast.castMove === "kunaiThrowAir" || (cast.spriteSheet || "").includes("kunai_throw_air_uniform")), `castMove=${cast?.castMove} sheet=${cast?.spriteSheet}`);
    const k = await waitProjectile();
    check("air: spinning-shuriken projectile spawns", !!k && (k.sheet || "").includes("kunai_throw_projectile"), `proj=${k ? k.sheet : "none"}`);
    check("air: projectile angled downward (vy > 0)", !!k && k.vy > 0, `vy=${k?.vy}`);
    await shot("air_throw");
    await page.waitForFunction((h) => window.__harness.p2().health < h, hp0, { timeout: 4000, polling: 16 }).catch(() => {});
    const hp1 = (await p2()).health;
    check("air: projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  // ── DATA CONTRACT ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("hashirama")?.animationData || {});
  check("kunaiThrow + kunaiThrowAir wired to real hashirama sheets", ["kunaiThrow", "kunaiThrowAir"].every(k => (ad[k]?.sheet || "").includes("hashirama_kunai_throw")), JSON.stringify({ g: ad.kunaiThrow?.sheet, a: ad.kunaiThrowAir?.sheet }));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/hashirama_s3_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
