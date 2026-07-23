// harness/netero_stage4.mjs — Stage 4: Guanyin Bodhisattva giant ultimate (cast → giant → idle → lunge → hurtbox scale).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seenActions = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const hb = who => page.evaluate(w => window.__harness.hurtbox(w), who);
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `netero_s4_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=netero`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.setP2X?.((window.__harness.p1().x) + 300); });
  await waitFrames(2);

  // Base hurtbox (pre-ult) for the scale comparison.
  const baseHb = await hb("p1");

  // ── TRANSFORMATION CAST ──
  section("transformation — base-form charge cast plays first");
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await waitFrames(3);
  const cast = await record();
  await shot("cast");
  check("ultimate fires → guanyinCast charge pose", cast.action === "guanyinCast" && (cast.spriteSheet || "").includes("netero_charge_guanyin"), `action=${cast.action} sheet=${cast.spriteSheet}`);
  check("not yet giant during the cast", !cast.canvasHeightFrac, `frac=${cast.canvasHeightFrac}`);

  // ── GIANT MATERIALISES ──
  section("giant avatar materialises after the cast");
  await page.waitForFunction(() => !!window.__harness.p1().canvasHeightFrac, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await waitFrames(6);
  const giant = await record();
  await shot("giant_idle");
  check("giant form active (canvasHeightFrac set)", !!giant.canvasHeightFrac, `frac=${giant.canvasHeightFrac}`);
  check("avatar idle uses guanyin_idle sheet", giant.action === "idle" && (giant.spriteSheet || "").includes("guanyin_idle_uniform"), `action=${giant.action} sheet=${giant.spriteSheet}`);
  check("has giant skin anim swap", giant.hasSkinAnim, "");

  // ── GIANT HURTBOX MATCHES VISUAL SCALE ──
  section("giant hurtbox matches the drawn giant (not the tiny base box)");
  const gHb = await hb("p1");
  check("giant is drawn large (drawH > 400px)", (gHb.drawH || 0) > 400, `drawH=${(gHb.drawH || 0).toFixed(0)}`);
  check("giant hurtbox is much bigger than base", gHb.h > baseHb.h * 2.5, `giant.h=${gHb.h.toFixed(0)} base.h=${baseHb.h.toFixed(0)}`);
  check("hurtbox height is proportional to the drawn giant (0.4–0.95×)", gHb.h > gHb.drawH * 0.4 && gHb.h < gHb.drawH * 0.95, `h=${gHb.h.toFixed(0)} drawH=${gHb.drawH.toFixed(0)}`);
  check("hurtbox sits WITHIN the drawn giant's vertical extent", gHb.y >= gHb.drawTop - 4 && (gHb.y + gHb.h) <= (gHb.drawTop + gHb.drawH + 4), `hbY=${gHb.y.toFixed(0)}..${(gHb.y + gHb.h).toFixed(0)} draw=${gHb.drawTop.toFixed(0)}..${(gHb.drawTop + gHb.drawH).toFixed(0)}`);

  // ── LUNGE (forward-traveling) ──
  section("avatar lunge — plays the lunge sheet + travels + hurtbox follows");
  const x0 = (await p1()).x; const hbX0 = gHb.x;
  await page.keyboard.down("d"); await waitFrames(16); const lunge = await record(); const lungeHb = await hb("p1"); await shot("lunge"); await page.keyboard.up("d");
  const x1 = (await p1()).x;
  check("lunge uses guanyin_run_lunge sheet", (["run", "walk", "dash"].includes(lunge.action)) && (lunge.spriteSheet || "").includes("guanyin_run_lunge"), `action=${lunge.action} sheet=${lunge.spriteSheet}`);
  check("giant travels forward on the lunge", Math.abs(x1 - x0) > 5, `Δx=${(x1 - x0).toFixed(1)}`);
  check("giant hurtbox travels with it", Math.abs(lungeHb.x - hbX0) > 3, `Δhb=${(lungeHb.x - hbX0).toFixed(1)}`);

  // ── BORROWED guard/hit (giant) ──
  section("borrowed giant guard/hit — upscaled base art renders at giant scale (no box)");
  await page.evaluate(() => window.__harness.hurtP1?.(24)); await waitFrames(3); const gh = await record(); await shot("giant_hurt");
  check("giant hurt uses borrowed upscaled sheet", gh.action === "hurt" && (gh.spriteSheet || "").includes("netero_guanyin_hurt_big"), `action=${gh.action} sheet=${gh.spriteSheet}`);
  check("borrowed hurt still renders giant-scale", !!gh.canvasHeightFrac, `frac=${gh.canvasHeightFrac}`);

  section("fallback-box sweep + integrity");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !(s.includes("netero") || s.includes("guanyin")));
  check(`all ${seenActions.size} exercised actions use a netero/guanyin sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(44)}\n  NETERO Stage 4: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
