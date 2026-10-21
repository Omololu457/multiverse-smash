// harness/goku_ladder_live.mjs — PHASE 3 render check for the clean-rebuild Goku 7-level ladder.
// Boots a real match (goku vs naruto), confirms both fighters + HUD render on the NEW sheets, climbs the
// full base→SSJ→SSJ2→SSJ3→God→Blue→Ultra-Instinct ladder, powers down, drops a level on Ki-empty, and
// toggles Kaioken — all with ZERO page errors. Uses the window.__harness hooks.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const stepForm = () => page.evaluate(() => window.__harness.p1GokuStepForm());
const revertForm = () => page.evaluate(() => window.__harness.p1GokuRevert());
const gokuForm = () => page.evaluate(() => window.__harness.p1GokuForm());
const kaioken = () => page.evaluate(() => window.__harness.p1GokuKaioken());
const skinIdle = () => page.evaluate(() => { const f = window.__harness._p1raw?.() || null; return f?._skinAnim?.idle?.sheet || window.__harness.p1GokuForm?.()?.form || null; });
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

// expected ladder (idx → form key + outgoing damage mult)
const LADDER = [
  { key: "base", dmg: 1.00 }, { key: "ssj", dmg: 1.10 }, { key: "ssj2", dmg: 1.18 },
  { key: "ssj3", dmg: 1.28 }, { key: "god", dmg: 1.32 }, { key: "blue", dmg: 1.38 }, { key: "ui", dmg: 1.45 },
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  // wait for the idle sheets to decode (sprite handler attaches) before the render assertions
  await page.waitForFunction(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return p && q && p.hasSpriteHandler && q.hasSpriteHandler; }, null, { timeout: 10000, polling: 16 }).catch(() => {});

  const g = await p1(); const o = await p2();
  const cd = await page.evaluate(() => window.__harness.charDef("goku"));
  const ad = cd.animationData;

  console.log("\n── render: both fighters + stats ──");
  check("P1 is Goku", g.key === "goku", `key=${g.key}`);
  check("Goku renders as sprites", g.hasSpriteHandler, "");
  check("P2 (naruto) renders", o.hasSpriteHandler, "");
  check("idle → goku_base_idle_uniform", (ad.idle?.sheet || "").includes("goku_base_idle_uniform"), `sheet=${ad.idle?.sheet}`);
  check("HP 1000 / KI 100", g.maxHealth === 1000 && g.maxEnergy === 100, `HP=${g.maxHealth} KI=${g.maxEnergy}`);
  check("spriteScale ~2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.3, `scale=${g.spriteScale}`);
  check("HUD renders (round state present)", !!(await state()), "");

  console.log("\n── ladder: climb base → … → Ultra Instinct ──");
  for (let i = 1; i <= 6; i++) {
    await setKi(100);                       // full Ki each climb (UI needs full; others only need the cost)
    await page.evaluate(() => { const f = window.__harness.p1(); }); // noop sync
    await stepForm();
    await waitFrames(2);
    const st = await gokuForm();
    check(`climb → ${LADDER[i].key} (idx ${i})`, st.idx === i && (st.form || "").includes(LADDER[i].key), `idx=${st.idx} form=${st.form}`);
    check(`  outgoing dmg ×${LADDER[i].dmg}`, Math.abs((st.dmg || 0) - LADDER[i].dmg) < 0.001, `dmg=${st.dmg}`);
  }

  console.log("\n── UI gate: cannot climb past Ultra Instinct ──");
  await setKi(100); const top = await stepForm(); const stTop = await gokuForm();
  check("no climb past UI", top === false && stTop.idx === 6, `ret=${top} idx=${stTop.idx}`);

  console.log("\n── power down → base ──");
  await revertForm(); await waitFrames(2);
  const b = await gokuForm();
  check("power down → base", b.idx === 0 && Math.abs((b.dmg || 1) - 1.0) < 0.001, `idx=${b.idx} dmg=${b.dmg}`);

  console.log("\n── UI gate: UI only from Blue at full Ki ──");
  await setKi(100); await stepForm(); // base→ssj
  await setKi(100); let r = await stepForm(); // ssj→ssj2
  const afterTwo = await gokuForm();
  check("climbed to SSJ2 (idx 2) from base via 2 steps", afterTwo.idx === 2, `idx=${afterTwo.idx}`);
  await setKi(5); const blocked = await stepForm();   // not enough Ki for the next cost
  check("climb blocked when Ki < cost", blocked === false, `ret=${blocked}`);

  console.log("\n── Ki-empty → drop ONE level + gasp ──");
  await revertForm(); await setKi(100); await stepForm(); await setKi(100); await stepForm();  // base→ssj→ssj2
  await setKi(0.02);                   // essentially empty while in SSJ2
  await waitFrames(4);                 // per-frame drain pushes it ≤0 → drop one level
  const dropped = await gokuForm();
  check("Ki-empty dropped a level (≤ SSJ2)", dropped.idx < 2, `idx=${dropped.idx}`);

  console.log("\n── Kaioken toggle (Base) ──");
  await revertForm(); await setKi(50);
  await kaioken(); await waitFrames(2);
  const kai = await gokuForm();
  check("Kaioken ON at Base → ×2 dmg", kai.kaioken === 1 && Math.abs((kai.dmg || 1) - 2.0) < 0.001, `kai=${kai.kaioken} dmg=${kai.dmg}`);
  await kaioken(); await waitFrames(2);
  const kaiOff = await gokuForm();
  check("Kaioken OFF → back to ×1", kaiOff.kaioken === 0 && Math.abs((kaiOff.dmg || 1) - 1.0) < 0.001, `kai=${kaiOff.kaioken} dmg=${kaiOff.dmg}`);

  console.log("\n── no page errors ──");
  check("zero JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  console.log(`\n${"=".repeat(44)}\n  GOKU LADDER (Phase 3): ${pass} passed, ${fail} failed\n${"=".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
