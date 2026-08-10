// harness/miwa_stage4_shots.mjs — STAGE 4: "Blade of the Neophyte" Ultimate. The two source parts play as
// ONE continuous freeze-cinematic (windup → draw-slash); it freezes combat, plays Miwa's own ult sprite, and
// lands a single GUARANTEED range-independent slash at the connect beat, costing 100 cursed energy.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.miwaUltCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

console.log("\n── Blade of the Neophyte (Ultimate) ──");
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
// Put P2 FAR so a normal swing could never reach — proves the ult's damage is GUARANTEED (range-independent).
const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 520); await waitFrames(2);
const e0 = (await p1()).energy, hp0 = (await p2()).health;

await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
// activation
await page.waitForFunction(() => window.__harness.miwaUltCine()?.active, null, { timeout: 3000, polling: 16 }).catch(() => {});
const on = await cine();
check("ultimate activates the freeze-cinematic", on.active === true, `active=${on.active} phase=${on.phase}`);
check("cinematic drives the REAL Miwa caster", on.casterKey === "miwa", `casterKey=${on.casterKey}`);
const e1 = (await p1()).energy;
check("ultimate spent 100 cursed energy", Math.round(e0 - e1) === 100, `energy ${e0}→${e1}`);
const midSheet = (await p1()).spriteSheet || "";
check("plays Miwa's own continuous ult sprite (part1→part2)", /kasumi_super_ultimate_uniform/.test(midSheet), `sheet=${midSheet}`);
await page.screenshot({ path: path.join(OUT, "miwa_s4_windup.png") });

// advance to the connect beat + capture the slash
await page.waitForFunction(() => (window.__harness.miwaUltCine()?.frame || 0) >= (window.__harness.miwaUltCine()?.impactFrame || 999), null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(2); await page.screenshot({ path: path.join(OUT, "miwa_s4_slash.png") });
await page.waitForFunction(() => window.__harness.miwaUltCine()?.struck, null, { timeout: 3000, polling: 16 }).catch(() => {});
const struck = await cine();
check("the slash connects exactly once (struck)", struck.struck === true, `struck=${struck.struck} frame=${struck.frame}/${struck.impactFrame}`);

// let it finish
await page.waitForFunction(() => window.__harness.miwaUltCine()?.active === false, null, { timeout: 4000, polling: 16 }).catch(() => {});
const hp1 = (await p2()).health, dmg = hp0 - hp1;
check("GUARANTEED range-independent damage landed (~168 = 280×0.60)", dmg >= 150, `dmg=${dmg} (p2 was 520px away)`);
check("cinematic ends → combat resumes (not stuck)", (await cine()).active === false, `active=${(await cine()).active}`);
await page.screenshot({ path: path.join(OUT, "miwa_s4_after.png") });

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
