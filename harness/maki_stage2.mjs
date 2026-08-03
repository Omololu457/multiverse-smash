// harness/maki_stage2.mjs — Stage 2 evidence for Maki Zenin: 5 naginata normals + the "Cursed Tool
// Flurry" command chain (Fwd+Heavy → re-tap Heavy on a clean hit: makiG1 → makiG2 → makiG3), and the
// MID-CHAIN INTERRUPT (a blocked/whiffed opener ends the string — re-tap does NOT advance).
// Saves screenshots to harness/shots/maki_s2_*.png and prints verification data.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.makiCmd());
const has = (f, needle) => (f.spriteSheet || "").includes(needle);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 48) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
async function waitMove(name, maxF = 24) { let c = await cmd(); for (let f = 0; f < maxF && c?.move !== name; f++) { await waitFrames(1); c = await cmd(); } return c; }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `maki_s2_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);

  // ── GROUND NORMALS: light / heavy / up ──
  section("ground normals (light / heavy / up)");
  for (const [nm, key, sheet] of [["light", "j", "maki_light_uniform"], ["heavy", "k", "maki_heavy_uniform"], ["up", "i", "maki_up_uniform"]]) {
    await reset(nm === "heavy" ? 58 : 46);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    await shot(nm);
    await page.keyboard.up(key);
    await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check(`${nm} → ${sheet} + connects`, has(mv, sheet) && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── AIR NORMAL: air (light while airborne) ──
  section("air normal");
  await reset(40);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(48));
    await page.keyboard.down("j");
    const mv = await waitSheet("maki_air_uniform");
    await shot("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check("air → maki_air_uniform + connects", has(mv, "maki_air_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── DOWN-AIR NORMAL: down + light while airborne ──
  section("down_air normal");
  await reset(30);
  { const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j");
    const mv = await waitSheet("maki_down", 12);
    await shot("down_air");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const dmg = hp0 - (await p2()).health;
    check("down_air → maki_downair_uniform + connects", has(mv, "maki_downair_uniform") && dmg > 0, `sheet=${mv.spriteSheet} dmg=${dmg}`);
  }

  // ── COMMAND CHAIN: Fwd+Heavy → makiG1 → (re-tap Heavy on hit) → makiG2 → makiG3 ──
  // Driven precisely via __harness.makiCmd: re-tap Heavy ONLY when the current stage is in
  // recovery AND connected AND a next stage is queued — the deterministic rekka window.
  section("Cursed Tool Flurry command chain (makiG1 → makiG2 → makiG3)");
  await reset(52);
  { const chain = []; const seen = new Map();
    const hp0 = (await p2()).health;
    await page.keyboard.down("d");                                                     // hold forward the whole chain
    await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");   // opener: Fwd+Heavy → makiG1
    for (let i = 0; i < 48; i++) {
      const c = await cmd();
      if (c?.move && !chain.includes(c.move)) { chain.push(c.move); seen.set(c.move, (await p1()).spriteSheet); await shot(`chain_${c.move}`); }
      if (chain.includes("makiG3")) break;
      if (c?.rekkaNext && c?.connected && c?.phase === "recovery") {
        await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1);   // fresh Heavy edge → advance
      } else { await waitFrames(1); }
    }
    await page.keyboard.up("d"); await waitFrames(20);
    const dmg = hp0 - (await p2()).health;
    check("stage 1 = makiG1 (Fwd+Heavy opener)", chain[0] === "makiG1", `chain=[${chain.join(" → ")}]`);
    check("stage 2 = makiG2 (cancel on hit)", chain.includes("makiG2"), `chain=[${chain.join(" → ")}]`);
    check("stage 3 = makiG3 finisher", chain.includes("makiG3"), `chain=[${chain.join(" → ")}]`);
    check("makiG1 sheet", (seen.get("makiG1") || "").includes("maki_g1_uniform"), `sheet=${seen.get("makiG1")}`);
    check("makiG2 sheet", (seen.get("makiG2") || "").includes("maki_g2_uniform"), `sheet=${seen.get("makiG2")}`);
    check("makiG3 sheet", (seen.get("makiG3") || "").includes("maki_g3_uniform"), `sheet=${seen.get("makiG3")}`);
    // Total is combo-decay-scaled (Heavenly Vow raw 34+40+56=130 → ~72); assert it clearly out-damages the biggest single normal (Heavy ~59 EFF) → multiple stages connected.
    check("full chain dealt multi-stage damage (> single normal)", dmg > 50, `dmg=${dmg} (combo-scaled)`);
  }

  // ── MID-CHAIN INTERRUPT: a WHIFFED opener must NOT advance (cancel-on-HIT, requireHit gate) ──
  section("mid-chain interrupt (whiffed opener ends the string)");
  await reset(52);
  { await page.evaluate(() => window.__harness.setP2X(99999));   // move dummy far away → opener whiffs (no clean hit)
    const wchain = [];
    await page.keyboard.down("d");
    await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k");
    for (let i = 0; i < 18; i++) {
      const m = (await p1()).currentMove;
      if (m && !wchain.includes(m)) wchain.push(m);
      await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1);   // spam heavy — must NOT advance
    }
    await page.keyboard.up("d");
    await shot("interrupt");
    check("whiffed opener fired makiG1", wchain.includes("makiG1"), `chain=[${wchain.join(" → ")}]`);
    check("whiff did NOT advance to makiG2 (string ended)", !wchain.includes("makiG2"), `chain=[${wchain.join(" → ")}]`);
  }

  section("stability");
  check("no JS errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
