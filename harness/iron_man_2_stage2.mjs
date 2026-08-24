// harness/iron_man_2_stage2.mjs — STAGE 2: Iron Man 2's 5 basic normals + the crouch variant.
// All carved from the owner-locked "edited" overhead-swing/hook combo. For light(J)/heavy(K)/upAttack(I)/
// air(J airborne)/downAir(S+J airborne):  (1) resolves the correct iron_man_2_*_uniform sheet (no 128² box)
// and (2) CONNECTS on the adjacent dummy (p2 health drops). Plus the crouch variant: Down+light →
// iron_man_2_crouchthrust_uniform (combat.js _setCrouchVariant, opt-in via animationData.crouchLight).
// Finally a data-level contract. down_air REUSES the air sheet (flag).
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `iron_man_2_s2_${name}.png`) }); return; }
  const padX = 110, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `iron_man_2_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 52) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_2`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ground normals (from the edited overhead-swing combo) ──");
  const ground = [
    ["light", "j", "iron_man_2_light_uniform"],
    ["heavy", "k", "iron_man_2_heavy_uniform"],
    ["upAttack", "i", "iron_man_2_up_uniform"],
  ];
  for (const [name, key, sheet] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(24);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(14);
  }

  console.log("\n── air normals ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("iron_man_2_air_uniform");
    check(`air: sprite → iron_man_2_air_uniform`, (mv.spriteSheet || "").includes("iron_man_2_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("iron_man_2_air_uniform");
    check(`downAir: sprite → iron_man_2_air_uniform (reuse)`, (mv.spriteSheet || "").includes("iron_man_2_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  console.log("\n── crouch variant (Down+light) ──");
  let csSheet = "", csDmg = 0;
  for (let attempt = 0; attempt < 6 && !(csSheet.includes("iron_man_2_crouchthrust_uniform") && csDmg > 0); attempt++) {
    await setupAdjacent(46);
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(3);
    await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j");
    const mv = await waitSheet("iron_man_2_crouchthrust_uniform", 12);
    if ((mv.spriteSheet || "").includes("iron_man_2_crouchthrust_uniform")) { csSheet = mv.spriteSheet; await crop("crouchthrust"); }
    await waitFrames(20);
    const hp1 = (await p2()).health; csDmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("s"); await waitGrounded(); await waitFrames(4);
  }
  check("Down+light swaps to iron_man_2_crouchthrust_uniform (crouch variant)", csSheet.includes("iron_man_2_crouchthrust_uniform"), `sheet=${csSheet}`);
  check("crouch variant connects (dmg)", csDmg > 0, `dmg=${csDmg}`);

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("iron_man_2")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air", "crouchLight"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("iron_man_2"));
  check("all 5 normals + crouch variant wired to real iron_man_2 sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  check("down_air REUSES air sheet (honest reuse)", ad.down_air?.sheet === ad.air?.sheet, `down_air=${(ad.down_air?.sheet||"").split("/").pop()} air=${(ad.air?.sheet||"").split("/").pop()}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR", e); FAIL++; }
finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
