// harness/obito_stage1_shots.mjs — STAGE 1 visual evidence for Obito Uchiha.
// Boots a match as p1=obito and (A) captures the live engine-driven movement/state
// set — idle / move / dash / jump / fall / guard / hurt / hurt_air — asserting each
// resolves to a real obito_*_uniform sheet (never the fallback procedural box), then
// (B) renders a montage of ALL 13 resliced uniform sheets so the dormant/variant art
// the engine can't request live (crouch, back_dash, block_air, knockdown, getup) is
// still proven correctly sliced + wired.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── registration gate: real sprite, not the procedural fallback box ──
await page.evaluate(() => window.__harness.start());
await waitFrames(6);
await page.evaluate(() => window.__harness.skipToBattle());
await waitFrames(10);
await waitGrounded();
let a = await p1();
check("P1 is Obito", a.key === "obito", `key=${a.key}`);
check("renders as SPRITES (not fallback box)", a.hasSpriteHandler, `hasSprites=${a.hasSpriteHandler}`);
check("idle → obito_idle_uniform", (a.spriteSheet || "").includes("obito_idle_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
check("spriteScale ≈ 1.30 (roster height)", Math.abs((a.spriteScale || 0) - 1.30) < 0.001, `scale=${a.spriteScale}`);
await shot("idle");

// move (hold toward opponent → walk/run cycle, both share obito_run_uniform)
await page.keyboard.down("d"); await waitFrames(10); a = await p1();
check("move → obito_run_uniform", (a.spriteSheet || "").includes("obito_run_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("move"); await page.keyboard.up("d"); await waitFrames(4);

// dash (double-tap AWAY → plain ground dash). NB: since Stage 5 a double-tap TOWARD the opponent is
// Obito's Kamui teleport-blink (speed-tier feat), so we tap away ("a") to exercise the normal dash pose.
await waitGrounded();
await page.keyboard.press("a"); await waitFrames(1); await page.keyboard.down("a"); await waitFrames(2); a = await p1();
check("dash → obito_dash_uniform", (a.spriteSheet || "").includes("obito_dash_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("dash"); await page.keyboard.up("a"); await waitFrames(4);

// jump (rising) → obito_jump_uniform
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("jump → obito_jump_uniform", (a.spriteSheet || "").includes("obito_jump_uniform"), `action=${a.action} vy=${a.vy?.toFixed?.(1)} sheet=${a.spriteSheet}`);
await shot("jump");

// fall (descending) → obito_fall_uniform  (obito_melee_fall_to_jump_up). Engine flips
// jump→fall only past vy>6 (sprite.js _resolveAction), so wait for a real descent.
await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.grounded && p.vy > 6.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("fall → obito_fall_uniform", (a.spriteSheet || "").includes("obito_fall_uniform"), `action=${a.action} vy=${a.vy?.toFixed?.(1)} sheet=${a.spriteSheet}`);
await shot("fall");
await waitGrounded();

// guard (hold s) → obito_block_uniform, action "guard"
await page.keyboard.down(";"); await waitFrames(10); a = await p1();
check("guard → obito_block_uniform", a.action === "guard" && (a.spriteSheet || "").includes("obito_block_uniform"), `action=${a.action} blocking=${a.blocking} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up(";"); await waitFrames(4);

// hurt (grounded flinch) → obito_hit1_uniform
await waitGrounded();
await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(2); a = await p1();
check("hurt → obito_hit1_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("obito_hit1_uniform"), `action=${a.action} hitstun=${a.hitstun} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

// hurt_air (airborne flinch) → obito_hit2_uniform — jump, then take a hit mid-air
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(2); a = await p1();
check("hurt_air → obito_hit2_uniform", (a.spriteSheet || "").includes("obito_hit2_uniform"), `action=${a.action} grounded=${a.grounded} hitstun=${a.hitstun} sheet=${a.spriteSheet}`);
await shot("hurt_air");
await page.evaluate(() => window.__harness.healP1?.()); await waitGrounded();

// ── (B) SHEET MONTAGE — proves every resliced uniform cell (incl. the dormant/variant
// art the engine can't drive live) slices cleanly and is wired to the right file. Each
// row draws the raw strip at 1.6× with an outline + the expected {frames,w,h}. ──
const SHEETS = [
  ["idle",       "obito_idle_uniform.png",       5, 40, 85, "→ idle"],
  ["run/walk",   "obito_run_uniform.png",        6, 74, 65, "→ walk + run"],
  ["jump",       "obito_jump_uniform.png",       3, 61, 79, "→ jump"],
  ["fall",       "obito_fall_uniform.png",       8, 93, 98, "→ fall (fall_to_jump_up)"],
  ["dash",       "obito_dash_uniform.png",       3, 65, 87, "→ dash"],
  ["back_dash",  "obito_back_dash_uniform.png",  1, 55, 73, "→ backDash (dormant: engine gap)"],
  ["crouch",     "obito_crouch_uniform.png",     3, 58, 62, "→ crouch (dormant: engine gap)"],
  ["block",      "obito_block_uniform.png",      1, 49, 80, "→ guard"],
  ["block_air",  "obito_block_air_uniform.png",  1, 48, 80, "→ blockAir (dormant: engine gap)"],
  ["hit_1",      "obito_hit1_uniform.png",       2, 55, 84, "→ hurt"],
  ["hit_2",      "obito_hit2_uniform.png",       3, 53, 86, "→ hurt_air"],
  ["hit_3",      "obito_hit3_uniform.png",       2, 87, 52, "→ knockdown"],
  ["hit_4",      "obito_hit4_uniform.png",       2, 54, 80, "→ getup"],
];
const montage = await page.evaluate(async ({ base, SHEETS }) => {
  const SCALE = 1.6, PAD = 14, LABELW = 320, ROWGAP = 10;
  const loaded = [];
  for (const [name, file, frames, w, h, note] of SHEETS) {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = `${base}/${file}`;
    try { await img.decode(); } catch { loaded.push({ name, file, frames, w, h, note, ok: false, nw: 0, nh: 0, img: null }); continue; }
    const okDims = (img.naturalWidth === frames * w) && (img.naturalHeight === h);
    loaded.push({ name, file, frames, w, h, note, ok: okDims, nw: img.naturalWidth, nh: img.naturalHeight, img });
  }
  const rowH = Math.max(...loaded.map(l => l.nh)) * SCALE + ROWGAP;
  const maxStrip = Math.max(...loaded.map(l => l.nw)) * SCALE;
  const cv = document.createElement("canvas");
  cv.width = LABELW + maxStrip + PAD * 3;
  cv.height = PAD * 2 + loaded.length * rowH + 40;
  const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false;
  cx.fillStyle = "#141018"; cx.fillRect(0, 0, cv.width, cv.height);
  cx.fillStyle = "#fff"; cx.font = "bold 20px monospace"; cx.textBaseline = "top";
  cx.fillText("OBITO UCHIHA — Stage 1 resliced uniform sheets (frames · cell · engine key)", PAD, 10);
  const results = [];
  loaded.forEach((l, i) => {
    const y = 46 + PAD + i * rowH;
    cx.fillStyle = l.ok ? "#7CFC8A" : "#FF6B6B";
    cx.font = "bold 15px monospace";
    cx.fillText(`${l.ok ? "OK" : "!!"} ${l.name}`, PAD, y);
    cx.fillStyle = "#cfc9d6"; cx.font = "12px monospace";
    cx.fillText(`${l.frames}f · ${l.w}×${l.h}`, PAD, y + 20);
    cx.fillText(l.note, PAD, y + 36);
    if (l.img) {
      const dw = l.nw * SCALE, dh = l.nh * SCALE, dx = LABELW, dy = y;
      cx.drawImage(l.img, dx, dy, dw, dh);
      cx.strokeStyle = "#5a5266"; cx.lineWidth = 1;
      for (let fr = 0; fr <= l.frames; fr++) { const gx = dx + (dw / l.frames) * fr; cx.beginPath(); cx.moveTo(gx, dy); cx.lineTo(gx, dy + dh); cx.stroke(); }
    }
    results.push({ name: l.name, file: l.file, ok: l.ok, expect: `${l.frames * l.w}×${l.h}`, got: `${l.nw}×${l.nh}` });
  });
  return { png: cv.toDataURL("image/png"), results };
}, { base, SHEETS });
fs.writeFileSync(path.join(OUT, "obito_s1_montage.png"), Buffer.from(montage.png.split(",")[1], "base64"));
console.log("\n  — sheet montage (dimension = frames×cellW × cellH) —");
for (const r of montage.results) check(`${r.name} sheet slices clean`, r.ok, `expect ${r.expect} got ${r.got}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
