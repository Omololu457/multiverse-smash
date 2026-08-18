// harness/aoi_todo_stage4.mjs — STAGE 4: Aoi Todo's 6 directional specials (executeAoiTodoSpecial).
// N=Gun(todoGun cast + procedural aoiTodoBullet) / F=Flying Fire Kick(todoFireKick) / B=Whip-Slash(todoWhip,
// LONG disjoint) / D=Spinning Backfist(todoSpin) / U=Armored Charge(todoArmor — timed dmg×1.2/def×1.4 buff) /
// AIR=Dive Kick(todoDive, spike). For each: fires the right move/cast, resolves its aoi_todo_* sheet (no 128²
// box), and connects (melee: hp drop; gun: a bullet projectile spawns + damages; armor: damageMult → 1.2).
// Deterministic via __harness.p1SpecialDir. ★Gun art is a Todo pose (source gun sprite = a different char).
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `aoi_todo_s4_${name}.png`) }); return; }
  const padX = 160, padTop = r.h * 1.2, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `aoi_todo_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 56) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ground melee specials (Fwd Fire Kick / Back Whip / Down Spin) ──");
  const melee = [
    ["Flying Fire Kick (Fwd)", "F", "todoFireKick", "aoi_todo_firekick_uniform", 56],
    ["Whip-Slash (Back)",      "B", "todoWhip",     "aoi_todo_whip_uniform",     120],  // long disjoint → farther
    ["Spinning Backfist (Down)","D", "todoSpin",    "aoi_todo_spin_uniform",     56],
  ];
  for (const [name, dir, move, sheet, gap] of melee) {
    await setupAdjacent(gap);
    const hp0 = (await p2()).health;
    const res = await fireDir(dir);
    check(`${name}: fires ${move}`, res?.move === move, `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    await crop(move);
    await waitFrames(26);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(8);
  }

  console.log("\n── neutral = Gun (procedural bullet) ──");
  {
    await setupAdjacent(150);
    const hp0 = (await p2()).health;
    const res = await fireDir(null);
    check("Gun: casts todoGun", res?.cast === "todoGun", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("aoi_todo_gun_uniform", 10);
    check("Gun: caster renders aoi_todo_gun_uniform", (mv.spriteSheet || "").includes("aoi_todo_gun_uniform"), `sheet=${mv.spriteSheet}`);
    await waitFrames(4);
    let sawBullet = false;
    for (let f = 0; f < 20; f++) { const pr = await projectiles(); if (pr.length > 0) { sawBullet = true; break; } await waitFrames(1); }
    check("Gun: a bullet projectile spawns", sawBullet, "");
    await crop("todoGun");
    await waitFrames(16);
    const hp1 = (await p2()).health;
    check("Gun: bullet connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(8);
  }

  console.log("\n── Up = Armored Charge (timed self-buff) ──");
  {
    await setupAdjacent(80);
    const dm0 = (await p1()).damageMult;
    const res = await fireDir("U");
    check("Armor: casts todoArmor", res?.cast === "todoArmor", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("aoi_todo_armor_uniform", 12);
    check("Armor: caster renders aoi_todo_armor_uniform", (mv.spriteSheet || "").includes("aoi_todo_armor_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("todoArmor");
    await waitFrames(4);
    const dm1 = (await p1()).damageMult;
    check("Armor: damage buff applies (damageMult → ~1.2)", dm1 > dm0 + 0.1 && Math.abs(dm1 - 1.2) < 0.05, `damageMult ${dm0} → ${dm1}`);
    await waitGrounded(); await waitFrames(8);
  }

  console.log("\n── AIR = Dive Kick (spike) ──");
  {
    await setupAdjacent(40);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(46)); await waitFrames(2);
    const res = await fireDir(null);   // airborne neutral special → dive
    check("Dive: fires todoDive (airborne)", res?.move === "todoDive", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("aoi_todo_dive_uniform");
    check("Dive: sprite → aoi_todo_dive_uniform", (mv.spriteSheet || "").includes("aoi_todo_dive_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("todoDive");
    await waitFrames(20);
    const hp1 = (await p2()).health;
    check("Dive: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  console.log("\n── data contract: all 6 special poses wired to real aoi_todo_ sheets ──");
  const ad = await page.evaluate(() => window.__harness.charDef("aoi_todo")?.animationData || {});
  for (const [k, sub] of [["todoGun", "aoi_todo_gun"], ["todoFireKick", "aoi_todo_firekick"], ["todoWhip", "aoi_todo_whip"], ["todoSpin", "aoi_todo_spin"], ["todoArmor", "aoi_todo_armor"], ["todoDive", "aoi_todo_dive"]]) {
    check(`animationData.${k} → ${sub} sheet`, (ad[k]?.sheet || "").includes(sub), `sheet=${ad[k]?.sheet}`);
  }

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
