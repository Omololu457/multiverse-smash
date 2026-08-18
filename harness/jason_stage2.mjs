// harness/jason_stage2.mjs
// STAGE 2 evidence: Jason's 5 basic normals (light/heavy/up/air/down_air) CONNECT on the dummy and
// render the correct re-sliced sheets, and the CROUCH-CONTEXT swaps work — a light/heavy started while
// holding Down renders crouchLight/crouchHeavy (still connecting), while a crouching up-attack falls back
// to the STANDING slash_2 (`up`) art. Screenshots → harness/shots/jason_stage2_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record(tag) { const a = await p1(); const act = a.spriteAction || a.action; if (act) seen.set(tag, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `jason_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=jason`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── GROUND NORMALS: light / heavy / up ───────────────────────────────
  console.log("\n── ground normals connect + correct sheet ──");
  for (const [name, key, gap, sheetTag, dmgMin] of [
    ["light", "j", 70, "jason_light_uniform", 18],
    ["heavy", "k", 90, "jason_heavy_uniform", 40],
    ["up",    "i", 70, "jason_up_uniform",    28],
  ]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await record(name); await shot(name); await page.keyboard.up(key); await waitFrames(24);
    const hp1 = (await p2()).health;
    check(`${name} connects (dmg ≥ ${dmgMin})`, hp0 - hp1 >= dmgMin, `dmg=${(hp0 - hp1).toFixed(1)}`);
    check(`${name} sheet = ${sheetTag}`, (seen.get(name) || "").includes(sheetTag), `sheet=${seen.get(name)}`);
  }
  // up-attack should LAUNCH the dummy (rising / airborne)
  await prep(70);
  await page.keyboard.down("i"); await waitFrames(6); await page.keyboard.up("i"); await waitFrames(6);
  const lu = await p2();
  check("up-attack launches dummy (airborne / rising)", !lu.grounded || lu.vy < -1, `grounded=${lu.grounded} vy=${lu.vy}`);

  // ── AIR NORMALS: air / down_air ──────────────────────────────────────
  console.log("\n── air normals connect + correct sheet ──");
  // AIR — put Jason at a LOW airborne altitude beside the grounded dummy (liftP1, the canonical
  // air-normal pattern) so the aerial hitbox overlaps; a full jump would sail him far overhead.
  await prep(48);
  await page.evaluate(() => window.__harness.liftP1(40));
  const hp0a = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(5); await record("air"); await shot("air"); await page.keyboard.up("j"); await waitFrames(16);
  check("air connects", hp0a - (await p2()).health >= 20, `dmg=${(hp0a - (await p2()).health).toFixed(1)}`);
  check("air sheet = jason_air_uniform", (seen.get("air") || "").includes("jason_air_uniform"), `sheet=${seen.get("air")}`);

  // DOWN_AIR spike — lift Jason ABOVE the dummy so the tall downward blade box reaches down onto it.
  await prep(34);
  await page.evaluate(() => window.__harness.liftP1(54));
  const hp0d = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(5); await record("down_air"); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
  check("down_air connects", hp0d - (await p2()).health >= 25, `dmg=${(hp0d - (await p2()).health).toFixed(1)}`);
  check("down_air sheet = jason_down_air_uniform", (seen.get("down_air") || "").includes("jason_down_air_uniform"), `sheet=${seen.get("down_air")}`);

  // ── CROUCH-CONTEXT SWAPS: hold Down + light/heavy → crouch strips (still connect) ────
  console.log("\n── crouch-context normal swaps ──");
  for (const [name, key, gap, sheetTag, dmgMin] of [
    ["crouch light", "j", 70, "jason_crouch_light_uniform", 18],
    ["crouch heavy", "k", 90, "jason_crouch_heavy_uniform", 40],
  ]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(name); await shot(name.replace(" ", "_")); await page.keyboard.up(key); await waitFrames(4); await page.keyboard.up("s"); await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name} connects (dmg ≥ ${dmgMin})`, hp0 - hp1 >= dmgMin, `dmg=${(hp0 - hp1).toFixed(1)}`);
    check(`${name} SWAPS to ${sheetTag}`, (seen.get(name) || "").includes(sheetTag), `action=${mid.spriteAction} sheet=${seen.get(name)}`);
  }

  // CROUCH UP → no crouch variant exists → must fall back to the STANDING slash_2 (`up`) art.
  await prep(70);
  await page.keyboard.down("s"); await waitFrames(2);
  await page.keyboard.down("i"); await waitFrames(4); const cu = await record("crouch_up"); await shot("crouch_up"); await page.keyboard.up("i"); await page.keyboard.up("s"); await waitFrames(20);
  check("crouch up-attack falls back to standing jason_up_uniform (no crouch variant)", (seen.get("crouch_up") || "").includes("jason_up_uniform"), `action=${cu.spriteAction} sheet=${seen.get("crouch_up")}`);

  // Standing light AFTER a crouch attack must NOT keep the crouch sprite (flag self-clears).
  await prep(70);
  await page.keyboard.down("j"); await waitFrames(4); const sl = await record("stand_light_after"); await page.keyboard.up("j"); await waitFrames(18);
  check("standing light after crouch → standing jason_light_uniform (no lingering crouch)", (seen.get("stand_light_after") || "").includes("jason_light_uniform"), `sheet=${seen.get("stand_light_after")}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\nsheet map: ${JSON.stringify(Object.fromEntries(seen), null, 0)}`);
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
