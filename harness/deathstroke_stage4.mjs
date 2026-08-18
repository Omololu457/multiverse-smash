// harness/deathstroke_stage4.mjs — STAGE 4: Deathstroke's 5 directional specials (executeDeathstrokeSpecial).
// GROUND: neutral=Sword Slash(dsSwordSlash) / Fwd=Draw&Cut(dsDrawCut) / Back=Gun Shot(dsGun + procedural
// bullet) / Down=Running Slash(dsRunSlash).  AIR: Aerial Spin(dsAerialSpin, hitbox).
// For each: (1) it fires the right currentMove/_spriteCastMove, (2) resolves the right deathstroke_* sheet
// (no 128² box), (3) CONNECTS on the dummy (melee: hp drop; gun: a deathstrokeBullet projectile spawns and
// deals damage). Deterministic via __harness.p1SpecialDir. row_09 spin-finish is RESERVED for the Stage-5 ULT.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `deathstroke_s4_${name}.png`) }); return; }
  const padX = 150, padTop = r.h * 1.2, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `deathstroke_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 56) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=deathstroke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND melee specials: neutral / Fwd / Down ──
  console.log("\n── ground melee specials ──");
  const melee = [
    ["Sword Slash (neutral)", null, "dsSwordSlash", "deathstroke_swordslash_uniform"],
    ["Draw & Cut (Fwd)",      "F",  "dsDrawCut",    "deathstroke_drawcut_uniform"],
    ["Running Slash (Down)",  "D",  "dsRunSlash",   "deathstroke_runslash_uniform"],
  ];
  for (const [name, dir, move, sheet] of melee) {
    await setupAdjacent(54);
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

  // ── BACK = Gun Shot (projectile) ──
  console.log("\n── Gun Shot (Back, projectile) ──");
  {
    await setupAdjacent(150);   // ranged: dummy further out so the bullet travels
    const hp0 = (await p2()).health;
    const res = await fireDir("B");
    check(`Gun Shot: casts dsGun`, res?.cast === "dsGun", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("deathstroke_gun_uniform");
    check(`Gun Shot: sprite → deathstroke_gun_uniform`, (mv.spriteSheet || "").includes("deathstroke_gun_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("dsGun");
    // bullet spawns a few frames in
    let sawBullet = false;
    for (let f = 0; f < 16 && !sawBullet; f++) { await waitFrames(1); const pr = await projectiles(); sawBullet = pr.some(p => (p.name || "").includes("deathstrokeBullet")); }
    check(`Gun Shot: spawns a deathstrokeBullet projectile`, sawBullet, "");
    await waitFrames(40);
    const hp1 = (await p2()).health;
    check(`Gun Shot: bullet connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(8);
  }

  // ── AIR = Aerial Spin (hitbox) ──
  console.log("\n── Aerial Spin (air, hitbox) ──");
  {
    await setupAdjacent(48);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(46));
    const res = await fireDir(null);
    check(`Aerial Spin: fires dsAerialSpin (airborne)`, res?.move === "dsAerialSpin", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("deathstroke_aerialspin_uniform");
    check(`Aerial Spin: sprite → deathstroke_aerialspin_uniform`, (mv.spriteSheet || "").includes("deathstroke_aerialspin_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("dsAerialSpin");
    await waitFrames(16);
    const hp1 = (await p2()).health;
    check(`Aerial Spin: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── DATA-LEVEL contract: all 5 special cast poses wired to real deathstroke sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("deathstroke")?.animationData || {});
  const keys = ["dsSwordSlash", "dsDrawCut", "dsRunSlash", "dsAerialSpin", "dsGun"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("deathstroke"));
  check("all 5 specials wired to real deathstroke sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Deathstroke Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/deathstroke_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
