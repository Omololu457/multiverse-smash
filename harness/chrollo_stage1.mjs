// harness/chrollo_stage1.mjs
// Stage 1 verification: Chrollo sprite gate + movement/state + the 4-variant random
// intro pool, with screenshot evidence. Modeled on harness/netero_stage1.mjs.
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
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
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
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_s1_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ── INTRO POOL — random-cycle across match starts; capture ALL 4 distinct variants ──
  section("intro pool — 4 variants random-cycled via start()");
  const wantIntros = ["intro", "intro2", "intro3", "intro4"];
  const seenIntros = new Map();      // variant -> sheet
  const introSeq = [];               // ordered log proving randomness
  for (let i = 0; i < 40 && seenIntros.size < wantIntros.length; i++) {
    await page.evaluate(() => window.__harness.start());
    await waitFrames(7);
    const a = await p1();
    const v = a.introVariant;
    introSeq.push(v);
    if (v && wantIntros.includes(v) && !seenIntros.has(v)) {
      seenIntros.set(v, a.spriteSheet || "");
      await shot(`intro_${v}`);
      check(`intro '${v}' plays a chrollo sheet (not fallback box)`, (a.spriteSheet || "").includes("chrollo"), `sheet=${a.spriteSheet}`);
    }
  }
  check(`all 4 intro variants appeared in the random pool`, seenIntros.size === 4, `seen=[${[...seenIntros.keys()].join(",")}]  seq=${introSeq.join(">")}`);
  const introBad = [...seenIntros.entries()].filter(([v, s]) => !s.includes(`chrollo_${v === "intro" ? "intro_" : v + "_"}`) && !s.includes("chrollo_intro"));
  check(`each intro variant maps to its own chrollo intro sheet`, introBad.length === 0, introBad.map(([v, s]) => `${v}:${s}`).join(" | "));

  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  // ── sprite gate + stats ──
  section("sprite gate + stats");
  const g = await record();
  check("P1 is Chrollo", g.key === "chrollo", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = chrollo_idle_uniform", (g.spriteSheet || "").includes("chrollo_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.001, `spriteScale=${g.spriteScale}`);
  check("plain-mid HP 1080", g.maxHealth === 1080, `HP=${g.maxHealth}`);
  check("nen pool 130", g.maxEnergy === 130, `EN=${g.maxEnergy}`);
  await waitFrames(8); await record(); await shot("idle");

  // ── movement ──
  section("movement — run / jump / fall / guard / hurt");
  await page.keyboard.down("d"); await waitFrames(16); const rn = await record(); await shot("run"); await page.keyboard.up("d"); await waitFrames(4);
  check("run uses chrollo_run_uniform", (seenActions.get("run") || seenActions.get("walk") || "").includes("chrollo_run_uniform"), `action=${rn.action} sheet=${rn.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); const jp = await record(); await shot("jump"); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy > 6, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const fl = await record(); await shot("fall");
  check("jump resolves to jump sheet", (jp.spriteSheet || "").includes("chrollo_jump_uniform"), `action=${jp.action} sheet=${jp.spriteSheet}`);
  check("fall resolves to jump sheet (apex cell)", (fl.spriteSheet || "").includes("chrollo_jump_uniform"), `action=${fl.action} sheet=${fl.spriteSheet}`);
  await waitGrounded();

  await page.keyboard.down("s"); await waitFrames(20); const bk = await record(); await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);
  check("guard resolves to block sheet", bk.action === "guard" && (bk.spriteSheet || "").includes("chrollo_block_uniform"), `action=${bk.action} sheet=${bk.spriteSheet}`);

  await page.evaluate(() => window.__harness.hurtP1(28)); await waitFrames(3); const h = await record(); await shot("hurt");
  check("hurt resolves to hit sheet", h.action === "hurt" && (h.spriteSheet || "").includes("chrollo_hit_uniform"), `action=${h.action} sheet=${h.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  // ── fallback-box sweep ──
  section("fallback-box sweep — every exercised state resolves to a chrollo sheet");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("chrollo"));
  check(`all ${seenActions.size} exercised actions use a chrollo sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  // ── character-select (portrait) ──
  section("character-select — Chrollo on HxH roster");
  const cs = await page.evaluate(() => window.__harness.showCharSelect("hunter_x_hunter", "training"));
  check("Chrollo on the Hunter x Hunter select roster", (cs.roster || []).includes("chrollo"), `roster=${(cs.roster || []).join(",")}`);
  check("portrait wired to chrollo_portrait.png", (await page.evaluate(() => window.__harness.charPortrait("chrollo")) || "").includes("chrollo_portrait"), "");
  await waitFrames(4); await shot("charselect");

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("FATAL", e); FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  CHROLLO Stage 1: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
