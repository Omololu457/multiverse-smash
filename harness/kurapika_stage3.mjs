// harness/kurapika_stage3.mjs — STAGE 3: Kurapika's 3 canon Nen specials.
//   Neutral → Judgment Chain: long-reach chain-lash, sprite kurapika_judgment_uniform, connects + MULTI-HIT.
//   Down    → Chain Jail: short chain strike, sprite kurapika_chainjail_uniform, connects + BINDS (huge hitstun).
//   Back    → Steal Chain: reactive counter — an incoming hit is NEGATED + riposted + Nen STOLEN (energy up).
// Data contract at the end. Shots → harness/shots/kurapika_s3_*_crop.png.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `kurapika_s3_${name}.png`) }); return; }
  const padX = 170, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `kurapika_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kurapika`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Judgment Chain (Neutral — flagship long-reach MULTI-HIT) ──");
  {
    await setupAdjacent(70);
    await page.evaluate(() => window.__harness.fillEnergy());
    const hp0 = (await p2()).health;
    const set = await page.evaluate(() => window.__harness.p1SpecialDir(null));
    const mv = await waitSheet("kurapika_judgment_uniform");
    check("neutral Special → kurapikaJudgment (cast)", set.cast === "kurapikaJudgment", `cast=${set.cast}`);
    check("Judgment → kurapika_judgment_uniform sprite", (mv.spriteSheet || "").includes("kurapika_judgment_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("judgment");
    await waitFrames(30);
    const hp1 = (await p2()).health; const dmg = hp0 - hp1;
    check("Judgment connects at RANGE + MULTI-HIT (dmg > single 32)", dmg > 32, `dmg=${dmg}`);
  }
  await waitGrounded(); await waitFrames(10);

  console.log("\n── Chain Jail (Down — BIND: huge hitstun + chain-column FX) ──");
  {
    await setupAdjacent(38);
    await page.evaluate(() => window.__harness.fillEnergy());
    const hp0 = (await p2()).health;
    const set = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
    const mv = await waitSheet("kurapika_chainjail_uniform");
    check("Down Special → kurapikaChainJail (cast)", set.cast === "kurapikaChainJail", `cast=${set.cast}`);
    check("Chain Jail → kurapika_chainjail_uniform sprite", (mv.spriteSheet || "").includes("kurapika_chainjail_uniform"), `sheet=${mv.spriteSheet}`);
    // poll through the active window for the connect (capture hitstun AT connect, before it decays)
    let bound = await p2(); let peakStun = bound.hitstun || 0;
    for (let f = 0; f < 16; f++) { await waitFrames(1); bound = await p2(); peakStun = Math.max(peakStun, bound.hitstun || 0); if (bound.health < hp0 && peakStun >= 40) break; }
    await crop("chainjail");
    check("Chain Jail connects (dmg)", bound.health < hp0, `hp ${hp0}→${bound.health}`);
    check("Chain Jail BINDS (target hitstun ≥ 40)", peakStun >= 40, `peakHitstun=${peakStun}`);
  }
  await waitGrounded(); await waitFrames(10);

  console.log("\n── Steal Chain (Back — counter: NEGATE + riposte + Nen STEAL) ──");
  {
    await setupAdjacent(52);
    await page.evaluate(() => window.__harness.setP1Energy(120));   // below max (200) so the +30 steal is visible
    const set = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
    await waitFrames(1);
    const before = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health, en: window.__harness.p1().energy, w: window.__harness.p1().kurapikaCountering }));
    check("Back Special → kurapikaSteal stance + window armed", set.cast === "kurapikaSteal" && before.w > 0, `cast=${set.cast} window=${before.w}`);
    await crop("steal");
    await page.evaluate(() => window.__harness.p2Attack());
    await waitFrames(16);
    const after = await page.evaluate(() => ({ p1: window.__harness.p1().health, p2: window.__harness.p2().health, en: window.__harness.p1().energy }));
    check("Steal Chain NEGATES the incoming hit (0 dmg taken)", after.p1 === before.p1, `p1 ${before.p1}→${after.p1}`);
    check("Steal Chain RIPOSTES (attacker damaged)", after.p2 < before.p2, `p2 ${before.p2}→${after.p2}`);
    check("Steal Chain STEALS Nen (energy up)", after.en > before.en, `energy ${before.en}→${after.en}`);
  }

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("kurapika")?.animationData || {});
  const keys = ["kurapikaJudgment", "kurapikaChainJail", "kurapikaSteal"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("kurapika"));
  check("all 3 specials wired to real kurapika sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kurapika Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kurapika_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
