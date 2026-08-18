// harness/spiderman.test.mjs — CANONICAL Spider-Man (Marvel Super Heroes CPS2, by Alvin-Earthworm) suite.
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–4: sprite gate / stats / portrait /
// "Web Fluid" label, movement/state (idle/intro/walk/jump/dash + both rolls + win), the 5 normals + Fwd+Heavy
// command normal, Ground Crawl evasive (+ kick-up exit), the 5 web/mobility specials + the Web-Throw combo-
// cancel bridge, the "Maximum Web" cinematic ultimate, a STATIC sheet+portrait+FX sweep (incl. the web
// projectile / cinematic sheets referenced OUTSIDE animationData), and a RUNTIME fallback-box sweep.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + web-FX/cinematic art is a real file. ──
section("STATIC — every animationData sheet + portrait + web-FX / cinematic art exists on disk");
const spidey = characters.spiderman;
const ad = spidey.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// Referenced in abilities.js (spawnProjectile) / game.js (cinematic) — NOT in animationData; assert explicitly.
const extra = ["./spiderman_webpuff_uniform.png", "./spiderman_webball_uniform.png", "./spiderman_maxweb_uniform.png"];
const missing = [];
for (const s of [...sheets, ...extra, spidey.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${extra.length} web-FX/cinematic + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (spiderman_portrait.png)", (spidey.portrait || "").includes("spiderman_portrait"), `portrait=${spidey.portrait}`);
check("stats HP1080/EN180/atk88/def80/spd96 + energyType web_fluid + universe marvel + scale1.1",
  spidey.stats.maxHealth === 1080 && spidey.stats.maxEnergy === 180 && spidey.stats.attack === 88 && spidey.stats.defense === 80 &&
  spidey.stats.speed === 96 && spidey.traits.energyType === "web_fluid" && spidey.universe === "marvel" && Math.abs(spidey.spriteScale - 1.1) < 0.01,
  JSON.stringify(spidey.stats));
check("NO hurt/knockdown/getup strips (CONFIRMED source gap — procedural fallback)", !ad.hurt && !ad.knockdown && !ad.getup, `hurt=${!!ad.hurt} kd=${!!ad.knockdown} getup=${!!ad.getup}`);

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}
async function waitSheet(sheet, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Spider-Man", g.key === "spiderman", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = spiderman_idle_uniform", (g.spriteSheet || "").includes("spiderman_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.1", Math.abs((g.spriteScale || 0) - 1.1) < 0.01, `${g.spriteScale}`);
  check("HP 1080 / EN 180", g.maxHealth === 1080 && g.maxEnergy === 180, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("spiderman"));
  check("portrait wired to ./spiderman_portrait.png", (portrait || "").includes("spiderman_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Web Fluid", energyLabel === "Web Fluid", `label=${energyLabel}`);

  section("movement / state (idle / intro / walk / jump / dash / rolls / win)");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = spiderman_walk_uniform", (rn.spriteSheet || "").includes("spiderman_walk_uniform"), `sheet=${rn.spriteSheet}`);
  await grounded();
  await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await wf(5); const jp = await p1();
  check("jump = spiderman_jump_uniform", (jp.spriteSheet || "").includes("spiderman_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await grounded();
  for (const [act, tag] of [["intro", "spiderman_intro_uniform"], ["dash", "spiderman_dash_uniform"], ["rollForward", "spiderman_rollf_uniform"], ["rollBack", "spiderman_rollb_uniform"], ["win", "spiderman_win_uniform"]]) {
    await force(act); await wf(3); const r = await p1(); await force(null); await wf(1);
    check(`${act} = ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  section("5 normals connect + Fwd+Heavy command normal (spiderCombo)");
  for (const [name, key, tag] of [["light", "j", "spiderman_light_uniform"], ["heavy", "k", "spiderman_heavy_uniform"], ["up", "i", "spiderman_up_uniform"]]) {
    let dealt = 0, sheetOk = false;
    for (let attempt = 0; attempt < 3 && !(dealt > 0 && sheetOk); attempt++) {
      await prep(50); const h0 = (await p2()).health;
      await page.keyboard.down(key); const mv = await waitSheet(tag, 12); if ((mv.spriteSheet || "").includes(tag)) sheetOk = true;
      await page.keyboard.up(key); await wf(12); dealt = h0 - (await p2()).health;
    }
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`);
  }
  // air + down_air (airborne — retry: P1 can land before the press registers)
  { let sheetOk = false, dealt = 0;
    for (let a = 0; a < 4 && !(sheetOk && dealt > 0); a++) { await grounded(); await prep(46); const h0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(64)); await page.keyboard.down("j"); const mv = await waitSheet("spiderman_air_uniform", 8); if ((mv.spriteSheet || "").includes("spiderman_air_uniform")) sheetOk = true; await page.keyboard.up("j"); await wf(12); dealt = h0 - (await p2()).health; }
    check("air → spiderman_air_uniform + connects", sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`); }
  { let sheetOk = false, dealt = 0;
    for (let a = 0; a < 4 && !(sheetOk && dealt > 0); a++) { await grounded(); await prep(30); const h0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(64)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("spiderman_downair_uniform", 8); if ((mv.spriteSheet || "").includes("spiderman_downair_uniform")) sheetOk = true; await page.keyboard.up("j"); await page.keyboard.up("s"); await wf(12); dealt = h0 - (await p2()).health; }
    check("down_air → spiderman_downair_uniform + connects", sheetOk && dealt > 0, `sheetOk=${sheetOk} dmg=${dealt}`); }
  await grounded();
  let cmdMove = "", cmdDmg = 0;
  for (let attempt = 0; attempt < 5 && !(cmdMove === "spiderCombo" && cmdDmg > 0); attempt++) {
    await prep(50); const h0 = (await p2()).health;
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(2);
    let mv = await p1(); for (let r = 0; r < 5 && mv.currentMove !== "spiderCombo"; r++) { await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k"); await wf(2); mv = await p1(); }
    if (mv.currentMove === "spiderCombo") cmdMove = "spiderCombo";
    await wf(16); await page.keyboard.up(fwd); cmdDmg += Math.max(0, h0 - (await p2()).health);
  }
  check("Fwd+Heavy command normal (spiderCombo) fires + connects", cmdMove === "spiderCombo" && cmdDmg > 0, `move=${cmdMove} dmg=${cmdDmg}`);

  section("Ground Crawl evasive (i-frames) + kick-up exit");
  await prep(70); await grounded(); const enC = (await p1()).energy;
  const cr = await specialDir("D"); await wf(2); const crawl = await p1();
  check("Down+Special → Ground Crawl (spiderCrawl + i-frames + web-fluid)", (cr?.cast === "spiderCrawl") && (crawl.invulnTimer || 0) > 0 && (enC - crawl.energy) >= 12, `cast=${cr?.cast} iframes=${crawl.invulnTimer} spent=${(enC - crawl.energy).toFixed(0)}`);
  // kick-up exit: attack during crawl → spiderKickup
  let kick = "";
  for (let a = 0; a < 5 && kick !== "spiderKickup"; a++) { await prep(64); await grounded(); await specialDir("D"); await wf(2); await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k"); const mv = await waitSheet("spiderman_kickup_uniform", 8); if (mv.currentMove === "spiderKickup") kick = "spiderKickup"; await wf(10); }
  check("Light/Heavy during crawl → kick-up (spiderKickup)", kick === "spiderKickup", `move=${kick}`);

  section("5 specials (web projectiles + mobility) + Web-Throw combo cancel");
  for (const [dir, tag, name] of [[null, "spiderman_webimpact_uniform", "Web Impact"], ["F", "spiderman_webthrow_uniform", "Web Throw"]]) {
    await prep(62); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 20; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    check(`${dir ?? "neutral"} → ${name} (${tag}) renders + projectile connects`, sh.includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.cast} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  for (const [dir, tag, mvName, name] of [["B", "spiderman_dashatk_uniform", "spiderDashAttack", "Dash Attack"], ["U", "spiderman_handstand_uniform", "spiderHandstand", "Handstand Flip Kick"]]) {
    await prep(dir === "B" ? 84 : 52); const h0 = (await p2()).health; const res = await specialDir(dir); let sh = "";
    for (let i = 0; i < 16; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sh = a.spriteSheet; await wf(1); }
    check(`${dir} → ${name} (${mvName}) renders + connects`, (res?.move === mvName) && sh.includes(tag) && (h0 - (await p2()).health) > 0, `move=${res?.move} dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  await prep(60); const cc = await page.evaluate(() => window.__harness.spidermanComboCancel());
  check("★ Web-Throw combo cancel: spiderCombo + Special → Web Throw bridge (spiderWebBridge)", !!cc?.cancelled && cc?.castMove === "spiderWebBridge" && cc?.currentMove !== "spiderCombo", `cancelled=${cc?.cancelled} castMove=${cc?.castMove}`);

  section("ULTIMATE — Maximum Web (inline cinematic, guaranteed payoff, no dup)");
  check("ultimate declared: Maximum Web / cost 100", spidey.ultimate?.name === "Maximum Web" && spidey.ultimate?.cost === 100, `name=${spidey.ultimate?.name} cost=${spidey.ultimate?.cost}`);
  await prep(70); await grounded(); const hpU = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate fires (Maximum Web)", !!ult?.cast && ult?.castMove === "spiderWebBridge", `cast=${ult?.cast} castMove=${ult?.castMove}`);
  await wf(20); const probe = await page.evaluate(() => window.__harness.spidermanMaxWeb());
  check("cinematic overlay renders (drawSpidermanMaxWebCinematic)", probe.renders > 0 && probe.bgLoaded, `renders=${probe.renders} bgLoaded=${probe.bgLoaded}`);
  await wf(50); const dmgU = hpU - (await p2()).health;
  check("guaranteed scaled payoff lands (~204 EFF)", dmgU >= 150, `dmg=${dmgU.toFixed(0)}`);
  check("P1 still the LIVE Spider-Man (no duplicate instance)", (await p1()).key === "spiderman", "");

  section("fallback-box sweep — every animationData action renders a real spiderman_ sheet (no 128² box)");
  await prep(80); const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("spiderman_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} animationData actions render a real sheet`, boxes.length === 0, boxes.join(" | "));

  section("no JS errors");
  check("no page errors during the suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man canonical suite: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
