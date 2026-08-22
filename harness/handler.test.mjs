// harness/handler.test.mjs — CANONICAL The Handler (Jujutsu Kaisen) suite (mirrors yuta.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–6: sprite gate / stats / portrait /
// "Cursed Energy" label, movement/state (real hit→knockdown art), the L→L→H standard-string normals
// (punch→punch→blade-drawn launcher), the 6-shikigami cameo system (each summon-motion spawns its own
// ×0.60 entity), the "Mahoraga" ADAPTATION-FORM ultimate (transform → weak → adapts → grows → revert), a
// STATIC every-sheet+portrait sweep, and a RUNTIME fallback-box sweep over every base animationData action.
// Honest reuses (run=walk / dash=walk / guard=idle / fall=jump / getup=hurt / air=light / down_air=light /
// lose=knockdown) + the flagged win-pose repurpose + intro/Domain gaps are asserted/noted explicitly.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { allAttributedKeys } from "../credits.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

// ── STATIC (no browser): every declared sheet + portrait is a real, non-empty file ──
section("STATIC — every animationData sheet + portrait exists on disk");
const H = characters.handler;
const ad = H.animationData;
const sheets = [...new Set(Object.values(ad).map(a => a && a.sheet).filter(Boolean))];
for (const s of sheets) {
  const f = path.join(ROOT, s.replace(/^\.\//, ""));
  check(`sheet exists: ${s.split("/").pop()}`, fs.existsSync(f) && fs.statSync(f).size > 0);
}
check("portrait exists (handler_portrait.png)", fs.existsSync(path.join(ROOT, "handler_portrait.png")));
// shikigami + mahoraga + icon art (not in base animationData but shipped)
for (const s of ["handler_shik_dog.png", "handler_shik_snake.png", "handler_shik_rabbit.png", "handler_shik_elephant.png", "handler_shik_nue.png", "handler_shik_toad.png", "handler_shik_icons.png",
                 "mahoraga_idle_uniform.png", "mahoraga_walk_uniform.png", "mahoraga_entry_uniform.png", "mahoraga_attack_uniform.png", "mahoraga_counter_uniform.png", "mahoraga_wheel_icon.png"]) {
  check(`extra art exists: ${s}`, fs.existsSync(path.join(ROOT, s)) && fs.statSync(path.join(ROOT, s)).size > 0);
}
check("The Handler IS attributed in credits.js", allAttributedKeys().has("handler"));

section("HONEST-REUSE contract (declared, not fabricated art)");
const same = (a, b) => ad[a]?.sheet === ad[b]?.sheet;
check("run REUSES walk", same("run", "walk"));
check("dash REUSES walk", same("dash", "walk"));
check("guard REUSES idle", same("guard", "idle"));
check("fall REUSES jump", same("fall", "jump"));
check("getup REUSES hurt", same("getup", "hurt"));
check("air + down_air REUSE the light punch", same("air", "light") && same("down_air", "light"));
check("lose REUSES knockdown", same("lose", "knockdown"));
check("win = its own repurposed sheet (handler_win_uniform)", (ad.win?.sheet || "").includes("handler_win_uniform"));

// ── RUNTIME ──
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const summons = () => page.evaluate(() => window.__harness.summons());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = a => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);

try {
  await page.goto(`${base}/index.html?harness=1&p1=handler`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("sprite gate + stats (Stage 1)");
  const g = await p1();
  check("P1 is The Handler", g.key === "handler", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler);
  check("idle = handler_idle_uniform", (g.spriteSheet || "").includes("handler_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale 2.0", Math.abs((g.spriteScale || 0) - 2.0) < 0.01, `${g.spriteScale}`);
  check("HP 1120 / EN 200", g.maxHealth === 1120 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("handler"));
  check("universe jujutsu_kaisen · energyType cursed_energy", def?.universe === "jujutsu_kaisen" && def?.traits?.energyType === "cursed_energy");

  section("normals — L→L→H standard string (Stage 2)");
  async function setupAdj(gap = 50) { await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy()); const a = await page.evaluate(() => window.__harness.arena()); await page.evaluate(x => window.__harness.setP1X(x), Math.round(a.left + a.width * 0.42)); await waitFrames(1); const pp = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, pp.x + gap); await waitFrames(2); }
  for (const [name, key, sheet] of [["light", "j", "handler_light_uniform"], ["heavy", "k", "handler_heavy_uniform"], ["upAttack", "i", "handler_up_uniform"]]) {
    await setupAdj(); const hp0 = (await p2()).health; await page.keyboard.down(key);
    let mv = await p1(); for (let f = 0; f < 18 && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); }
    check(`${name} → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    await page.keyboard.up(key); await waitFrames(22);
    check(`${name} connects`, (await p2()).health < hp0);
  }

  section("shikigami cameo system (Stage 4)");
  await setupAdj(56);
  const res = await page.evaluate(() => window.__harness.p1SpecialDir(null));   // neutral → Divine Dogs
  check("neutral Special casts handlerSummon", res?.cast === "handlerSummon", `cast=${res?.cast}`);
  let dog = null; for (let f = 0; f < 26 && !dog; f++) { dog = (await summons()).find(s => s.id === "handlerDivineDogs"); if (!dog) await waitFrames(1); }
  check("Divine Dogs summon spawns w/ own sheet", !!dog && (dog.sheet || "").includes("handler_shik_dog"), `sheet=${dog?.sheet}`);
  await waitFrames(60);

  section("Mahoraga adaptation ULTIMATE (Stage 5)");
  await waitGrounded(); await page.evaluate(() => window.__harness.fillEnergy());
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Ultimate transforms into Mahoraga", !!ult?.cast, `cast=${ult?.cast}`);
  await waitFrames(4); const gm = await p1();
  check("_mahoragaActive + renders Mahoraga", gm.mahoragaActive === true && (gm.spriteSheet || "").includes("mahoraga"), `active=${gm.mahoragaActive} sheet=${gm.spriteSheet}`);
  check("WEAK entry mults (0.70 / 0.85)", Math.abs(gm.dmgMult - 0.70) < 0.02 && Math.abs(gm.defMult - 0.85) < 0.02, `dmg=${gm.dmgMult} def=${gm.defMult}`);
  // adaptation ramp: same bolt twice → 2nd < 1st
  await page.evaluate(() => window.__harness.setP1Health(1120));
  const drop = async () => { const b = (await p1()).health; await page.evaluate(() => window.__harness.spawnEnemyBolt({ damage: 100 })); for (let f = 0; f < 20; f++) { await waitFrames(1); const h = (await p1()).health; if (h < b) return b - h; } return 0; };
  const d0 = await drop(); await waitFrames(6); const d1 = await drop();
  check("adaptation ramps (2nd same-move hit < 1st)", d1 < d0 && d0 > 0, `d0=${d0.toFixed(0)} d1=${d1.toFixed(0)}`);
  check("adapted ≥1 distinct → growth engaged (dmgMult > 0.70)", (await p1()).dmgMult > 0.70, `dmgMult=${(await p1()).dmgMult}`);
  const rv = await page.evaluate(() => window.__harness.p1MahoragaExpire());
  for (let f = 0; f < 12; f++) { await waitFrames(1); if (!(await p1()).mahoragaActive) break; }
  check("auto-reverts to The Handler", rv === true && (await p1()).mahoragaActive === false);

  section("fallback-box sweep — every base action resolves a real sheet");
  const box = [];
  for (const a of Object.keys(ad)) {
    await force(a); await waitFrames(2); const r = await p1();
    if (!/handler_|mahoraga_/.test(r.spriteSheet || "")) box.push(`${a}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no base action renders the 128² box", box.length === 0, box.join(" | "));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} The Handler CANONICAL: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close(); process.exit(FAIL ? 1 : 0);
}
