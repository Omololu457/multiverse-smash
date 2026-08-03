// harness/gold_samurai_ranger_stage5.mjs
// STAGE 5 evidence: Green's "Forest Spear: Verdant Storm" ULTIMATE — TIER-SCALING freeze cinematic.
// Reuses Red's proven freeze architecture (samuraiUltCine) with Green's own leaf-storm barrage art + a
// FOREST (leaf-green) FX palette. BASE form → base launcher art + base damage; MEGA form → mega launcher art +
// higher damage. Fires in BOTH states; art + damage differ. Shots → green_stage5_{base,mega}_ult.png.
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
const cine = () => page.evaluate(() => window.__harness.samuraiUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `green_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function setEnergy(v) { await page.evaluate(e => { window.__harness.setEnergy?.(e) ?? window.__harness.setP1Energy?.(e); }, v); }
async function toMega() {
  await waitGrounded(); await setEnergy(165);
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
async function fireUltimate(tag) {
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 120); await waitFrames(2);
  await setEnergy(160);
  const hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  const active = await page.waitForFunction(() => window.__harness.samuraiUltCine().active === true, null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  let sheet = "", mega = null;
  for (let i = 0; i < 30 && active; i++) { const c = await cine(); const a = await p1(); if ((a.spriteSheet || "").includes("launcher_uniform")) sheet = a.spriteSheet; if (c.mega != null) mega = c.mega; if (c.frame > 20) { await shot(tag); break } await new Promise(r => setTimeout(r, 40)); }
  await page.waitForFunction(() => window.__harness.samuraiUltCine().active === false, null, { timeout: 6000, polling: 32 }).catch(() => {});
  await waitFrames(4);
  const dmg = hp0 - (await p2()).health;
  return { active, sheet, mega, dmg };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  console.log("\n── ultimate in BASE form (base art + base damage) ──");
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const b = await fireUltimate("base_ult");
  check("BASE: ultimate cinematic activates", b.active, "");
  check("BASE: renders the base launcher (ultimate) strip", b.sheet.includes("samurai_ranger_forest_launcher_uniform"), `sheet=${b.sheet}`);
  check("BASE: cinematic tier flag = base (mega=false)", b.mega === false, `mega=${b.mega}`);
  check("BASE: ultimate deals damage", b.dmg > 0, `dmg=${b.dmg}`);

  console.log("\n── ultimate in MEGA MODE (Mega art + higher damage) ──");
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await toMega();
  check("in Mega Mode before ult", (await p1()).currentForm === "megaMode", "");
  const m = await fireUltimate("mega_ult");
  check("MEGA: ultimate cinematic activates", m.active, "");
  check("MEGA: renders the MEGA launcher (ultimate) strip", m.sheet.includes("samurai_ranger_forest_mega_launcher_uniform"), `sheet=${m.sheet}`);
  check("MEGA: cinematic tier flag = mega (mega=true)", m.mega === true, `mega=${m.mega}`);
  check("MEGA: ultimate deals damage", m.dmg > 0, `dmg=${m.dmg}`);

  console.log("\n── tier-scaling: art + damage differ ──");
  check("ART differs: base strip ≠ Mega strip", b.sheet && m.sheet && b.sheet !== m.sheet, `base=${b.sheet} mega=${m.sheet}`);
  check("DAMAGE scales up in Mega Mode", m.dmg > b.dmg, `base=${b.dmg} mega=${m.dmg}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Green Stage 5: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
