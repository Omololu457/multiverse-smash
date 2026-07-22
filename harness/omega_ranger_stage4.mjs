// harness/omega_ranger_stage4.mjs
// STAGE 4 evidence: Omega Ranger 7-step SWORD SLASH string (Back+Light → re-tap Light, cancel-on-hit).
//   full string: omSword1 → 2 → 3 → 4 → 5 → 6 → 7 (each a distinct re-sliced sheet)
//   mid-chain interrupt: a WHIFFED step does NOT advance (cancel-on-HIT rule)
//   sword_slash_5 vs sword_slash_7 render DISTINCT sheets (asset-map look-alike check)
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.orCmd());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(t) { await page.screenshot({ path: path.join(OUT, `omega_stage4_${t}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// open with Back+Light (back held only for the opener, then released so the ranger holds position)
async function openSword() {
  await page.keyboard.down("a"); await waitFrames(1);
  await page.keyboard.down("j"); await waitFrames(2);
  await page.keyboard.up("j"); await page.keyboard.up("a");
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── FULL 7-STEP SWORD STRING ─────────────────────────────────────────
  console.log("\n── sword string: Back+Light → re-tap Light on hit → 7 steps ──");
  await prep(28);
  const chain = [];
  const hp0 = (await p2()).health;
  await openSword();
  for (let i = 0; i < 80; i++) {
    const c = await cmd();
    if (c.move && c.move.startsWith("omSword") && !chain.includes(c.move)) { chain.push(c.move); await rec(); await shot(c.move); }
    if (chain.includes("omSword7")) break;
    if (c.rekkaNext && c.connected && c.phase === "recovery") {
      await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1);   // fresh Light edge → advance
    } else {
      await waitFrames(1);
    }
  }
  await waitFrames(20);
  const hp1 = (await p2()).health;
  const expected = ["omSword1", "omSword2", "omSword3", "omSword4", "omSword5", "omSword6", "omSword7"];
  check("all 7 steps fired in order", JSON.stringify(chain) === JSON.stringify(expected), `chain=[${chain.join(" → ")}]`);
  check("full string dealt heavy cumulative damage", hp0 - hp1 >= 120, `dmg=${hp0 - hp1}`);
  for (const s of expected) check(`${s} sheet`, (seen.get(s) || "").includes(`sword_slash_${s.slice(-1)}_uniform`), `sheet=${seen.get(s)}`);
  check("sword_slash_5 & _7 render DISTINCT sheets", (seen.get("omSword5") || "x") !== (seen.get("omSword7") || "y"), `5=${seen.get("omSword5")} 7=${seen.get("omSword7")}`);

  // ── MID-CHAIN INTERRUPT: whiff at step 3 stops the string ─────────────
  console.log("\n── mid-chain interrupt: whiff step ≥3 → string stops ──");
  await prep(28);
  const wchain = [];
  await openSword();
  let bumped = false;
  for (let i = 0; i < 50; i++) {
    const c = await cmd();
    if (c.move && c.move.startsWith("omSword") && !wchain.includes(c.move)) wchain.push(c.move);
    // once we've reached step 3, yank the dummy out of range so the NEXT step whiffs
    if (!bumped && wchain.includes("omSword3")) { await page.evaluate(() => window.__harness.setP2X(99999)); bumped = true; }
    if (wchain.length >= 5 || (bumped && wchain.includes("omSword7"))) break;
    if (c.rekkaNext && c.connected && c.phase === "recovery") {
      await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j"); await waitFrames(1);
    } else { await waitFrames(1); }
  }
  await shot("interrupt");
  check("string advanced past step 3 while connecting", wchain.includes("omSword3"), `chain=[${wchain.join(" → ")}]`);
  check("string STOPPED after the whiff (didn't reach omSword7)", !wchain.includes("omSword7"), `chain=[${wchain.join(" → ")}]`);

  console.log("\n── no fallback box ──");
  let boxes = 0; for (const [a, s] of seen) if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no 128² fallback box", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 4: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
