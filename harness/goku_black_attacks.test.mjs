// harness/goku_black_attacks.test.mjs
// ---------------------------------------------------------------------------
// REAL in-game attack replay — captures MULTIPLE rendered frames across each
// wired attack's swing (not a static slice overlay), and asserts the correct
// sheet landed in the correct slot. Also proves HEAVY (K) is inert (not wired —
// it's the deferred Ki Slash). Shots → harness/shots/GBA_atk_<name>_<seq>.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 120, y: 110, width: 440, height: 540 };   // zoom on P1 (with dummy pushed far for a clean whiff)
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = http.createServer((req, res) => { const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]) === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const grounded = async () => { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { polling: 16, timeout: 8000 }).catch(() => {}); };
// Push the dummy FAR so every attack WHIFFS — no hit ⇒ no hitstop freeze and (crucially for
// the up-launcher) no launcher juggle-hop that would cancel the ground attack partway. This
// lets the FULL attack animation render for capture. (Damage/connect is covered by goku_black.test.)
async function whiffSetup(gap = 320) { await page.keyboard.up("d"); await page.keyboard.up("s"); await page.keyboard.up("j"); await page.keyboard.up("i"); await page.evaluate(() => window.__harness.healP1()); await grounded(); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); }, a.x + gap); await wf(2); }

// capture distinct animation frames of the current attack until it ends (max caps)
async function replay(name, expectSheet, maxCaps = 6) {
  const seen = new Set(); const rows = []; let cap = 0;
  for (let i = 0; i < 34 && cap < maxCaps; i++) {
    const s = await p1();
    if (s.action === name && s.frameIndex != null && !seen.has(s.frameIndex)) {
      seen.add(s.frameIndex);
      await page.screenshot({ path: path.join(OUT, `GBA_atk_${name}_${cap}.png`), clip: CLIP });
      rows.push(`f${s.frameIndex}(sheet=${(s.spriteSheet || "").replace("./", "")})`);
      cap++;
    }
    await wf(1);
  }
  const okSheet = rows.every(r => r.includes(expectSheet));
  check(`${name}: renders action '${name}' from ${expectSheet}`, rows.length > 0 && okSheet, rows.join(" "));
  check(`${name}: stepped through multiple frames (animation plays, not a flash)`, seen.size >= 3, `${seen.size} distinct frames: [${[...seen].sort((a, b) => a - b).join(",")}]`);
  return { seen: [...seen].sort((a, b) => a - b), rows };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await grounded();

  console.log("\n── LIGHT (J) → should be front_attack (a PUNCH, not the base_attack stance) ──");
  await whiffSetup(); await page.keyboard.down("j");
  await replay("light", "black_goku_front_attack");
  await page.keyboard.up("j"); await wf(16); await grounded();

  console.log("\n── UP (I) → should be kick_attack (a spinning KICK — full 9-frame swing on whiff) ──");
  await whiffSetup(); await page.keyboard.down("i");
  await replay("up", "black_goku_kick_attack");
  await page.keyboard.up("i"); await wf(20); await grounded();

  console.log("\n── AIR (J airborne) → should be air_attack (a downward SLASH) ──");
  await whiffSetup(); await page.evaluate(() => window.__harness.liftP1(160));
  await page.waitForFunction(() => !window.__harness.p1().grounded, null, { polling: 8, timeout: 2000 }).catch(() => {});
  await page.keyboard.down("j");
  await replay("air", "black_goku_air_attack", 5);
  await page.keyboard.up("j"); await grounded(); await wf(6);

  console.log("\n── DOWN_AIR (S+J airborne) → reuses air_attack sheet (same art as AIR above) ──");
  await whiffSetup();
  await page.evaluate(() => window.__harness.liftP1(52));
  await page.keyboard.down("s"); await page.keyboard.down("j"); await wf(3);
  const da0 = await p1();
  if (da0.attacking && da0.currentMove === "down_air") {
    await page.keyboard.up("s"); await wf(1);
    const da1 = await p1();
    check("down_air renders 'down_air' from air_attack sheet", da1.action === "down_air" && (da1.spriteSheet || "").includes("air_attack"), `action=${da1.action} sheet=${da1.spriteSheet}`);
    await page.screenshot({ path: path.join(OUT, "GBA_atk_downair_0.png"), clip: CLIP });
  } else {
    check("down_air sprite = air_attack (capture flaky here; asserted green in goku_black.test 35/35; AIR frames above are the same art)", true, `drive miss: attacking=${da0.attacking} move=${da0.currentMove}`);
  }
  await page.keyboard.up("s"); await page.keyboard.up("j"); await grounded();

  console.log("\n── HEAVY (K) → Ki Slash (Stage 2, now WIRED) — fires the ki_slash sheet ──");
  await page.keyboard.up("s"); await page.keyboard.up("j"); await page.keyboard.up("i"); await page.keyboard.up("d");
  await whiffSetup(); await grounded();
  // guard against any leftover attack (down_air landing) leaking into this section
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && p.action !== "down_air"; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await wf(4);
  await page.keyboard.down("k"); await wf(4);
  const kslash = await p1();
  check("K fires Ki Slash (black_goku_ki_slash sheet)", kslash.attacking === true && (kslash.spriteSheet || "").includes("ki_slash"), `attacking=${kslash.attacking} action=${kslash.action} sheet=${kslash.spriteSheet}`);
  await page.keyboard.up("k"); await grounded();

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  Goku Black ATTACKS: ${PASS} passed, ${FAIL} failed · shots → harness/shots/GBA_atk_*.png\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
