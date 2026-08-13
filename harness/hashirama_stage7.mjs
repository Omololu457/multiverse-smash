// harness/hashirama_stage7.mjs — STAGE 7: "Sealing Jutsu" ULTIMATE (DOMAIN-EXPANSION trap; redesign 2026-08-12).
// Triggers the ult (U) and verifies the domain: sealing_box backdrop + the opponent FROZEN/trapped while
// Hashirama stays free, the Naruto/Minato/Tobirama cameo assists LOOP-STRIKE the trapped foe (guaranteed
// damage over the window), then the domain expires cleanly back to normal play. (Supersedes the old
// combo→gates→cameos→seal freeze-cinematic; the canonical test:hashirama §F covers the same design.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.sealingCine());
const domain = () => page.evaluate(() => window.__harness.domainState());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `hashirama_s7_${tag}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();
  // park the dummy adjacent + fill energy / clear ult lockout
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.42)); await waitFrames(1);
  const a0 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a0.x + 90); await waitFrames(2);
  await page.evaluate(() => window.__harness.resetUlt());
  const en0 = (await p1()).energy;
  const hpFull = (await p2()).health;

  // ── TRIGGER — Ultimate key (U) ──
  console.log("\n── trigger Sealing Jutsu ultimate ──");
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  let c = null; for (let f = 0; f < 20 && !(c && c.active); f++) { c = await cine(); if (c && c.active) break; await waitFrames(1); }
  check("ultimate activates the Sealing Jutsu domain overlay", !!c && c.active, `active=${c?.active} phase=${c?.phase}`);
  check("ultimate spends 100 chakra", (await p1()).energy <= en0 - 99, `en ${en0} → ${(await p1()).energy}`);

  // ── DOMAIN TRAP — the ult is now a Domain-Expansion trap (redesign 2026-08-12): opponent frozen, caster
  //    free, Naruto/Minato/Tobirama cameos loop-strike the trapped foe. (Old freeze-cinematic superseded.) ──
  console.log("\n── domain trap ──");
  const dom = await domain();
  check("a HASHIRAMA Domain Expansion is active (sealing_box backdrop + trap)", !!dom && dom.rosterKey === "hashirama", `domain=${JSON.stringify(dom)}`);
  await shot("domain_trap");
  let oppFrozen = false, casterEverFrozen = false; const hits0 = (await cine())?.hits || 0;
  for (let f = 0; f < 170; f++) {
    const s = await cine(); if (!s || !s.active) break;
    if ((await p2()).domainFrozen) oppFrozen = true;
    if ((await p1()).domainFrozen) casterEverFrozen = true;
    if (f === 30) await shot("cameo_strike");
    await waitFrames(1);
  }
  check("trapped opponent CANNOT act (domainFrozen)", oppFrozen, "");
  check("Hashirama (caster) is NEVER frozen — free to attack", !casterEverFrozen, "");
  check("cameo assists STRIKE the trapped foe (hits accrue)", ((await cine())?.hits || 0) > hits0, `hits=${(await cine())?.hits}`);
  const hpMid = (await p2()).health;
  check("cameo strikes deal progressive damage", hpFull - hpMid > 20, `−${(hpFull - hpMid).toFixed(0)} so far`);

  // ── CLEAN END — domain expires, control returns to normal play ──
  console.log("\n── clean end ──");
  await page.waitForFunction(() => { const d = window.__harness.domainState(); const s = window.__harness.sealingCine(); return !d && (!s || !s.active); }, null, { timeout: 26000, polling: 32 }).catch(() => {});
  const domEnd = await domain(), cineEnd = await cine(), oppEnd = await p2();
  check("domain ENDS cleanly → normal play (no domain, overlay off, foe unfrozen)", !domEnd && (!cineEnd || !cineEnd.active) && !oppEnd.domainFrozen, `dom=${!!domEnd} cine=${cineEnd?.active} frozen=${oppEnd.domainFrozen}`);
  const totalDmg = hpFull - oppEnd.health;
  check("total guaranteed cameo damage in a fair band (80–300)", totalDmg > 80 && totalDmg < 300, `−${totalDmg.toFixed(0)} total`);
  await shot("ended");
  const back = await p1();
  check("control returns to Hashirama (no lingering cast lock)", back.castMove !== "gatesCaster", `castMove=${back.castMove}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Stage 7: ${PASS} passed, ${FAIL} failed — shots in harness/shots/hashirama_s7_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
