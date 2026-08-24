// harness/vilgax_stage5.mjs — STAGE 5: Vilgax ULTIMATE "Koma Atakes" (multi-beam eye-laser barrage).
// GUARANTEED sure-hit from OUT of melee range / payoff in the top-ult band (~198 EFF) / converging red
// Koma beam FX manifests during the inline freeze-cinematic. Live fighter holds the green ULT_ACTION
// trigger pose (owner decision #3). P2 = goku (not the P1-mirror). Shot → harness/shots/vilgax_s5_ult_crop.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function crop(name) { const r = await page.evaluate(() => window.__harness.screenRect("p1")); if (!r) { await page.screenshot({ path: path.join(OUT, `vilgax_s5_${name}.png`) }); return; } const clip = { x: Math.max(0, Math.round(r.x - 220)), y: Math.max(0, Math.round(r.y - r.h * 1.2)), width: Math.min(1280, Math.round(r.w + 440)), height: Math.min(720, Math.round(r.h * 2.4)) }; await page.screenshot({ path: path.join(OUT, `vilgax_s5_${name}_crop.png`), clip }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vilgax&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy?.());

  // Dummy OUT of melee range — proves the ult is a guaranteed sure-hit (range-independent).
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 150); await waitFrames(2);

  console.log("\n── ULTIMATE: Koma Atakes ──");
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  const en1 = (await p1()).energy;
  check("ult casts", res?.cast === true, `cast=${res?.cast}`);
  check("cast pose = vilgaxUltAction (green-charge trigger)", res?.castMove === "vilgaxUltAction", `castMove=${res?.castMove}`);
  check("spends ~100 meter", Math.round(en0 - en1) >= 98, `energy ${Math.round(en0)} → ${Math.round(en1)}`);

  // converging Koma beam FX manifests during the cinematic (visualOnly sprites at the foe)
  let komaFx = 0;
  for (let i = 0; i < 70; i++) { await waitFrames(1); const ps = await projs(); for (const p of ps) if (String(p.name).startsWith("vilgaxUlt_koma")) komaFx++; if (i === 34) await crop("ult"); }
  check("converging Koma beam FX manifests during cinematic", komaFx >= 1, `komaFx sightings=${komaFx}`);

  await waitFrames(24);
  const hp1 = (await p2()).health;
  const dealt = hp0 - hp1;
  check("guaranteed damage lands from out of melee range (sure-hit)", dealt > 0, `hp ${hp0} → ${hp1} (−${dealt.toFixed(0)})`);
  check("payoff in top-ult band (~198 EFF; 170–230)", dealt >= 170 && dealt <= 230, `dealt=${dealt.toFixed(0)}`);

  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("vilgax"));
  check("ultimate = 'Koma Atakes', cost 100", def?.ultimate?.name === "Koma Atakes" && def?.ultimate?.cost === 100, `ult=${JSON.stringify(def?.ultimate)}`);
  check("trigger pose uses real green-charge art (vilgax_ultaction_uniform)", (def?.animationData?.vilgaxUltAction?.sheet || "").includes("vilgax_ultaction_uniform"), `sheet=${def?.animationData?.vilgaxUltAction?.sheet}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Vilgax Stage 5: ${PASS} passed, ${FAIL} failed — shot in harness/shots/vilgax_s5_ult_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
