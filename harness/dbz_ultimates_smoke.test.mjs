// harness/dbz_ultimates_smoke.test.mjs
// ITEM 2 (2026-09-02) smoke test: Bardock / Gohan / Dark Vegeta now have REAL ultimates in
// triggerUltimate (no longer the fallback). Proof per character:
//   (a) p1Ultimate() casts (cast === true),
//   (b) the LIVE fighter latches its own real windup pose (_spriteCastMove = bardockRush1 / gohanRush1 /
//       vdAura) — the generic executeFallbackUltimate never sets _spriteCastMove (it sets currentMove="ultimate"),
//   (c) damage lands on a FAR-AWAY P2 — the fallback is range-limited (rangeX ~105) and would whiff at range,
//       whereas the new ults deal GUARANTEED range-independent beats. So damage-at-range == not-the-fallback.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

const CASES = [
  { key: "bardock",     windPose: "bardockRush1" },
  { key: "gohan",       windPose: "gohanRush1" },
  { key: "vegeta_dark", windPose: "vdAura" },
];

for (const c of CASES) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
  const state = () => page.evaluate(() => window.__harness.state());
  const p2 = () => page.evaluate(() => window.__harness.p2());
  const p1 = () => page.evaluate(() => window.__harness.p1());
  async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
  try {
    await page.goto(`${base}/index.html?harness=1&p1=${c.key}&p2=piccolo`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(6);
    // full energy + clear ult lockout; heal + shove P2 far away (well outside the fallback's ~105 range)
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.resetUlt(); window.__harness.healP2?.(); });
    const a = await p1();
    await page.evaluate(x => window.__harness.setP2X(x), a.x + 520 * (a.facing || 1));
    await waitFrames(2);
    const hpBefore = (await p2()).health ?? (await p2()).hp;
    const res = await page.evaluate(() => window.__harness.p1Ultimate());
    // let the whole cinematic + beats resolve
    for (let i = 0; i < 80; i++) await waitFrames(1);
    const hpAfter = (await p2()).health ?? (await p2()).hp;

    console.log(`\n── ${c.key} ──`);
    check(`${c.key}: triggerUltimate cast === true`, res?.cast === true, `cast=${res?.cast}`);
    check(`${c.key}: latches its own real windup pose (${c.windPose}) — not the fallback`, res?.castMove === c.windPose, `castMove=${res?.castMove}`);
    check(`${c.key}: deals GUARANTEED damage to a far-away P2 (range-independent, not the range-limited fallback)`, hpAfter < hpBefore, `hp ${hpBefore} → ${hpAfter}`);
    check(`${c.key}: no JS errors`, jsErrors.length === 0, jsErrors[0] || "");
  } catch (e) { check(`${c.key}: harness ran`, false, String(e)); }
  await page.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
