// harness/tobirama_stage3.mjs
// STAGE 3 evidence: Tobirama taijutsu command chain (cancel-on-hit) + 2 free pokes.
//   chain:     Fwd+Heavy → tobiCombo1 → (re-tap Heavy on hit) → tobiCombo2 → tobiComboFin
//   interrupt: a WHIFFED tobiCombo1 must NOT advance on re-tap (cancel-on-HIT rule)
//   pokes:     Strong Forward (Fwd+Light), Rising Knee (Back+Heavy)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`  ${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) return;
  const padX = 90, padTop = r.h * 1.15, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `tobirama_s3_${name}_crop.png`), clip });
}
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── CHAIN (cancel-on-hit): Fwd+Heavy → re-tap Heavy on hit → 3 stages ──
  console.log("\n── taijutsu chain: Fwd+Heavy → re-tap Heavy on hit ──");
  await prep(40);
  const chain = [];
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");                 // hold forward the whole chain
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // opener: Fwd+Heavy → tobiCombo1
  for (let i = 0; i < 48; i++) {
    const c = await rec();
    if (c.currentMove && !chain.includes(c.currentMove)) { chain.push(c.currentMove); await crop(c.currentMove); }
    if (chain.includes("tobiComboFin")) break;
    if (c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);
    } else { await waitFrames(1); }
  }
  await page.keyboard.up("d");
  await waitFrames(24);
  const hp1 = (await p2()).health;
  check("stage 1 = tobiCombo1", chain[0] === "tobiCombo1", `chain=[${chain.join(" → ")}]`);
  check("stage 2 = tobiCombo2 (cancel on hit)", chain.includes("tobiCombo2"), `chain=[${chain.join(" → ")}]`);
  check("stage 3 = tobiComboFin finisher", chain.includes("tobiComboFin"), `chain=[${chain.join(" → ")}]`);
  check("full chain dealt meaningful damage", hp0 - hp1 >= 90, `dmg=${hp0 - hp1}`);   // ~172 raw × 0.60 global scale × combo-decay ≈ 98
  check("tobiCombo1 sheet", (seen.get("tobiCombo1") || "").includes("attack_combo_1_uniform"), `sheet=${seen.get("tobiCombo1")}`);
  check("tobiCombo2 sheet", (seen.get("tobiCombo2") || "").includes("attack_combo_2_uniform"), `sheet=${seen.get("tobiCombo2")}`);
  check("tobiComboFin sheet", (seen.get("tobiComboFin") || "").includes("super_down_attack_uniform"), `sheet=${seen.get("tobiComboFin")}`);

  // ── INTERRUPT: whiffed opener must NOT advance (cancel-on-HIT) ────────
  console.log("\n── interrupt: whiffed tobiCombo1 does NOT chain ──");
  await prep(40);
  await page.evaluate(() => window.__harness.setP2X(99999));   // dummy far away → opener whiffs
  const wchain = [];
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
  for (let i = 0; i < 18; i++) {
    const m = (await p1()).currentMove;
    if (m && !wchain.includes(m)) wchain.push(m);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);
  }
  await page.keyboard.up("d");
  check("whiffed opener fired tobiCombo1", wchain.includes("tobiCombo1"), `chain=[${wchain.join(" → ")}]`);
  check("whiff did NOT advance to tobiCombo2", !wchain.includes("tobiCombo2"), `chain=[${wchain.join(" → ")}]`);
  await waitFrames(20);

  // ── FREE POKE: Strong Forward (Fwd+Light) ────────────────────────────
  console.log("\n── free pokes ──");
  await prep(56);
  let sp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("j"); await waitFrames(4); const sf = await rec(); await crop("tobiStrongFwd"); await page.keyboard.up("j"); await page.keyboard.up("d"); await waitFrames(18);
  let sp1 = (await p2()).health;
  check("Strong Forward = tobiStrongFwd", sf.currentMove === "tobiStrongFwd", `move=${sf.currentMove} action=${sf.action}`);
  check("Strong Forward connects", sp0 - sp1 > 0, `dmg=${sp0 - sp1}`);
  check("Strong Forward sheet", (seen.get("tobiStrongFwd") || "").includes("strong_upper_attack_kick_uniform"), `sheet=${seen.get("tobiStrongFwd")}`);

  // ── FREE POKE: Rising Knee (Back+Heavy) ──────────────────────────────
  await prep(40);
  let rk0 = (await p2()).health;
  await page.keyboard.down("a"); await page.keyboard.down("k"); await waitFrames(4); const rk = await rec(); await crop("tobiRisingKnee"); await page.keyboard.up("k"); await page.keyboard.up("a"); await waitFrames(16);
  let rk1 = (await p2()).health;
  check("Rising Knee = tobiRisingKnee", rk.currentMove === "tobiRisingKnee", `move=${rk.currentMove} action=${rk.action}`);
  check("Rising Knee connects", rk0 - rk1 > 0, `dmg=${rk0 - rk1}`);
  check("Rising Knee sheet", (seen.get("tobiRisingKnee") || "").includes("upper_knee_attack_uniform"), `sheet=${seen.get("tobiRisingKnee")}`);

  console.log("\n── no fallback box ──");
  let boxes = 0; for (const [a, s] of seen) if (!s && ["tobiCombo1","tobiCombo2","tobiComboFin","tobiStrongFwd","tobiRisingKnee"].includes(a)) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no 128² fallback box on command moves", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 3: ${pass} passed, ${fail} failed — shots in harness/shots/tobirama_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
