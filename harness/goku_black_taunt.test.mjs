// ─────────────────────────────────────────────────────────────────────────────
// Goku Black TAUNT repurpose (asset-ambiguity resolution #1).
// The universal 10s-Down-hold taunt-heal (game.js updateTauntState) was inert for
// Goku Black — he defined no `taunt` action. We repurpose two otherwise-unused
// sheets as his taunt, form-consistently:
//   BASE → black_goku_base_attack.png        (confident battle stance, 4×53)
//   ROSE → goku_black_ssj_rose_idle_2.png    (Rose standing flourish, 4×52)
// Verifies: the taunt triggers, renders the CORRECT form-specific sheet (never the
// 128² FALLBACK box), and pays out the 50% heal — in BOTH base and SSJ Rose form.
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 150, y: 150, width: 460, height: 470 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  const f = path.join(REPO, u === "/" ? "/index.html" : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const P1 = () => page.evaluate(() => window.__harness.p1());
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

// Fast-forward the 10s charge, then one held-Down frame trips the committed taunt.
async function triggerTaunt() {
  await page.evaluate(() => window.__harness.setTauntCharge(599));
  await page.keyboard.down("s");
  await page.waitForFunction(() => window.__harness.p1().tauntPlaying === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const t = await P1();
  await page.keyboard.up("s");   // committed phase no longer needs the hold
  return t;
}

// Sample the taunt to its payout: capture the peak rendered sheet/frames, wait for the
// heal, and confirm it never fell back to the 128² box (sheet===null).
async function runTaunt(label, sheetFrag, shot) {
  await page.evaluate(() => { window.__harness.healP1(); });
  await actionable();
  await page.evaluate(() => window.__harness.damageP1(400));
  await wf(3);   // let _tauntPrevHealth settle to the damaged value → no phantom "took a hit" reset
  const before = await P1();
  await triggerTaunt();
  await wf(2);   // give the renderer a frame to stamp _lastSpriteAction="taunt"
  const t = await P1();
  check(`${label}: taunt triggers (committed flourish)`, t.tauntPlaying === true, `tauntPlaying=${t.tauntPlaying} action=${t.action}`);
  check(`${label}: renders the taunt action`, t.action === "taunt", `action=${t.action}`);
  check(`${label}: uses the form-specific sheet (${sheetFrag})`, !!t.spriteSheet && t.spriteSheet.includes(sheetFrag), `sheet=${t.spriteSheet}`);
  check(`${label}: NOT the 128² FALLBACK box`, !!t.spriteSheet && t.spriteFrames === 4, `sheet=${t.spriteSheet} frames=${t.spriteFrames}`);
  await wf(6);
  await page.screenshot({ path: path.join(OUT, shot), clip: CLIP });
  // ride it out un-hit → heal pays (poll for tauntPlaying to clear)
  await page.waitForFunction(() => window.__harness.p1().tauntPlaying === false, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await wf(2);
  const after = await P1();
  check(`${label}: 50% heal pays out after surviving the flourish`, after.health > before.health, `hp ${Math.round(before.health)} → ${Math.round(after.health)}`);
  return after;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  section("BASE form taunt — black_goku_base_attack");
  const baseAfter = await runTaunt("base", "black_goku_base_attack", "GBTAUNT_base.png");
  check("base: still base form after the taunt", baseAfter.currentForm !== "ssjRose", `form=${baseAfter.currentForm}`);

  section("Transform → SSJ Rose (via the mandatory SSG waypoint)");
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.setEnergy(200); });
  await actionable();
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p"); await wf(3);   // base → SSG (snappy)
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(20); await page.keyboard.up("p");                // hold-release SSG → Rose
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  check("transformed into SSJ Rose", (await P1()).currentForm === "ssjRose", `form=${(await P1()).currentForm}`);

  section("SSJ ROSE form taunt — goku_black_ssj_rose_idle_2 (form-consistent, no base bleed-through)");
  await page.evaluate(() => window.__harness.setEnergy(200));   // headroom so the drain can't auto-revert mid-taunt
  const roseAfter = await runTaunt("rose", "goku_black_ssj_rose_idle_2", "GBTAUNT_rose.png");
  check("rose: taunt did NOT bleed the base sheet", roseAfter.currentForm === "ssjRose", `form=${roseAfter.currentForm}`);

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black TAUNT repurpose: ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/GBTAUNT_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
