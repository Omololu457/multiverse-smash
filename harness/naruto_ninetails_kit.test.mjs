// harness/naruto_ninetails_kit.test.mjs — Part 1 verification (2026-09-26).
// (1) NEW Kurama Chakra-Arm STRIKE on Forward+Special — an offensive Nine-Tails chakra arm (fox-arm FX),
//     a real damaging hitbox, distinct from the F→F shroud-3 GRAB. (2) Dark Rasengan / Compressed TBB
//     RESTORED on Back+Special (it had been shadowed by the Down+Special Uzumaki Barrage). (3) Uzumaki
//     Barrage on Down+Special is unaffected.
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
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.brutality && !!window.__harness.projectiles, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const clear = () => P(() => window.__harness.narutoChoreoClear());

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot();
  await sleep(400);

  console.log("\n── (3) baseline: Down+Special still fires Uzumaki Barrage ──");
  await clear();
  await P(() => window.__harness.brutality.p1Spec("D"));
  let bseq = null; for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { bseq = st.sequence; break; } await sleep(30); }
  check("Down+Special = Uzumaki Barrage (unchanged)", bseq === "Uzumaki Barrage", `seq=${bseq}`);
  await sleep(900); await clear();

  console.log("\n── (1) NEW: Forward+Special = Kurama Chakra-Arm STRIKE (offensive fox-arm) ──");
  const f = await P(() => { const r = window.__harness.brutality.p1Spec("F"); return { ok: r.ok, projs: window.__harness.projectiles() }; });
  check("Forward+Special fired", f.ok === true, `ok=${f.ok}`);
  const arm = (f.projs || []).find(p => p.name === "narutoChakraArmStrike");
  check("a chakra-arm-strike projectile spawned", !!arm, `names=${(f.projs || []).map(p => p.name).join(",")}`);
  check("it's a REAL damaging hitbox (not visualOnly)", arm && arm.damage > 0 && !arm.visualOnly, arm ? `dmg=${arm.damage} visualOnly=${arm.visualOnly}` : "");
  check("it uses the Kurama fox-arm FX sheet", arm && /fox_(left|right)/.test(arm.sheet || ""), arm ? `sheet=${(arm.sheet || "").split("/").pop()}` : "");
  check("it travels forward (has horizontal velocity)", arm && Math.abs(arm.vx) > 0, arm ? `vx=${arm.vx}` : "");
  await sleep(300); await clear();

  console.log("\n── (2) RESTORED: Back+Special = Dark Rasengan / Compressed TBB ──");
  const b = await P(() => { const r = window.__harness.brutality.p1Spec("B"); return { ok: r.ok, projs: window.__harness.projectiles() }; });
  check("Back+Special fired", b.ok === true, `ok=${b.ok}`);
  const ring = (b.projs || []).find(p => p.name === "darkRasenganRings" || (p.name || "").toLowerCase().includes("darkrasengan"));
  check("Dark Rasengan is reachable again (ring-burst visual spawned)", !!ring, `names=${(b.projs || []).map(p => p.name).join(",")}`);
  await sleep(300); await clear();

  console.log("\n── the two new inputs do NOT accidentally fire Barrage ──");
  const notBarrage = await P(() => { window.__harness.narutoChoreoClear(); window.__harness.brutality.p1Spec("F"); return window.__harness.narutoChoreo().active; });
  check("Forward+Special does NOT start the Barrage choreography", notBarrage === false, `active=${notBarrage}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
