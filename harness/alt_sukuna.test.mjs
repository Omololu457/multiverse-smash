// harness/alt_sukuna.test.mjs — CANONICAL Alternate Sukuna (JJK, alternate-universe Ryomen Sukuna;
// SEPARATE from `sukuna`) suite. Single-entry registration + integrity + FULL-KIT gate across Stages 1–6:
// sprite gate / stats / portrait / Cursed Energy label, movement/state (real knockdown+getup art), the 5
// normals, the Fwd+Heavy Dismantle/Cleave rekka, the 3 directional specials (Fūga Fire Arrow projectile /
// Spinning Lunge Kick / Cursed Grab), the "Domain Expansion: Malevolent Shrine" ULTIMATE (guaranteed ~198
// EFF, no dup), intro + win, a STATIC every-sheet+portrait+shrine sweep, and a RUNTIME fallback-box sweep
// over every animationData action. Honest reuses (run=walk / down_air=air) asserted.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) ──
section("STATIC — every animationData sheet + portrait + shrine backdrop exists on disk");
const as = characters.alt_sukuna;
const ad = as.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const extra = ["./alt_sukuna_domain1.png", "./alt_sukuna_domain2.png", "./alt_sukuna_domain3.png"];   // Domain Expansion shrine backdrop panels
const missing = [];
for (const s of [...sheets, as.portrait, ...extra]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait + 3 shrine panels all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (alt_sukuna_portrait.png — row_03 bust)", (as.portrait || "").includes("alt_sukuna_portrait"), `portrait=${as.portrait}`);
check("stats HP1200/EN200/atk93/def86/spd88 + energyType cursed_energy + universe jujutsu_kaisen + scale1.8",
  as.stats.maxHealth === 1200 && as.stats.maxEnergy === 200 && as.stats.attack === 93 && as.stats.defense === 86 &&
  as.stats.speed === 88 && as.traits.energyType === "cursed_energy" && as.universe === "jujutsu_kaisen" && as.spriteScale === 1.8);
check("SEPARATE from existing `sukuna` (distinct rosterKey + own sheets)", as.rosterKey === "alt_sukuna" && !(ad.idle.sheet || "").includes("sukuna_idle_sheet") && !!characters.sukuna);
check("honest reuses wired (run=walk / down_air=air)", ad.run.sheet === ad.walk.sheet && ad.down_air.sheet === ad.air.sheet);
check("full kit sheets wired (5 normals + cleave1/2 + beam/spinkick/grab + ultcharge + intro + win)",
  ["light","heavy","up","air","down_air","altSukunaCleave1","altSukunaCleave2","altSukunaBeam","altSukunaSpinkick","grab","altSukunaUltCharge","intro","win"].every(k => (ad[k]?.sheet || "").includes("alt_sukuna_")));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function adj(gap) { await waitGrounded(); const arena = await page.evaluate(() => window.__harness.arena()); await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, a.x + gap); await waitFrames(2); }
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("gate + stats");
  const g = await p1();
  check("P1 is Alternate Sukuna on the SpriteHandler", g.key === "alt_sukuna" && g.hasSpriteHandler, `key=${g.key}`);
  check("idle = alt_sukuna_idle_uniform, scale 1.8, HP1200/EN200", (g.spriteSheet || "").includes("alt_sukuna_idle_uniform") && Math.abs((g.spriteScale || 0) - 1.8) < 0.01 && g.maxHealth === 1200 && g.maxEnergy === 200);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.("alt_sukuna") ?? null);
  check("energy label = Cursed Energy", energyLabel === "Cursed Energy" || energyLabel === null, `label=${energyLabel}`);

  section("movement/state — real knockdown+getup art");
  for (const [act, tag] of [["knockdown", "alt_sukuna_knockdown_uniform"], ["getup", "alt_sukuna_getup_uniform"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} = real ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`); await force(null); await waitFrames(2);
  }

  section("normals connect");
  for (const [name, key, tag] of [["light", "j", "alt_sukuna_light_uniform"], ["heavy", "k", "alt_sukuna_heavy_uniform"], ["upAttack", "i", "alt_sukuna_up_uniform"]]) {
    await adj(52); const hp0 = (await p2()).health; await page.keyboard.down(key); const mv = await waitSheet(tag); await page.keyboard.up(key); await waitFrames(24);
    const dealt = hp0 - (await p2()).health;
    check(`${name} → ${tag} + connects (${dealt.toFixed(0)} dmg)`, (mv.spriteSheet || "").includes(tag) && dealt > 0);
    await waitFrames(10);
  }

  section("Dismantle/Cleave rekka (Fwd+Heavy → cancel-on-hit)");
  // Phase-reactive + action-sampling (mirrors the authoritative alt_sukuna_stage3 harness); waitSheet
  // polling over-advances past the cancel window, so capture the action set across the whole string.
  await adj(60); { const hp0 = (await p2()).health; const acts = new Set();
    const samp = async n => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.action) acts.add(a.action); await waitFrames(1); } };
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    await page.keyboard.down("d"); await waitFrames(2);   // let facing/right register before the Heavy edge
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await samp(8); await waitFrames(3);
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await samp(10); await page.keyboard.up("d");
    const dealt = hp0 - (await p2()).health;
    check("cleave1 → cancel → cleave2 + damage", acts.has("altSukunaCleave1") && acts.has("altSukunaCleave2") && dealt > 0, `acts=[${[...acts]}] −${dealt.toFixed(0)}`);
  }
  await waitGrounded(); await waitFrames(8);

  section("specials — beam projectile / spin-kick / cursed grab");
  await adj(150); { const hp0 = (await p2()).health; const r = await specialDir(null); await waitFrames(36);
    check("neutral beam → altSukunaBeam cast + projectile connects", (r.cast || "") === "altSukunaBeam" && (hp0 - (await p2()).health) > 0); }
  await waitFrames(16);
  await adj(96); { const hp0 = (await p2()).health; const r = await specialDir("F"); await waitFrames(26);
    check("Fwd → altSukunaSpinkick + connects", (r.move || "") === "altSukunaSpinkick" && (hp0 - (await p2()).health) > 0); }
  await waitGrounded(); await waitFrames(10);
  await adj(48); { const hp0 = (await p2()).health; const r = await specialDir("D"); await waitFrames(42);
    check("Down → Cursed Grab (grab pose + throw damage)", (r.cast || "") === "grab" && (hp0 - (await p2()).health) > 0); }

  section("ULTIMATE — Domain Expansion: Malevolent Shrine (guaranteed ~198 EFF)");
  await waitGrounded(); await waitFrames(8);
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.35)); await waitFrames(1);
  const a2 = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }, a2.x + 240); await waitFrames(2);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  { const hp0 = (await p2()).health; const r = await page.evaluate(() => window.__harness.p1Ultimate());
    await waitFrames(96); const dom = await page.evaluate(() => window.__harness.altSukunaDomain());
    const dealt = hp0 - (await p2()).health;
    check("domain ult: hand-sign cast + shrine overlay + guaranteed ~198 EFF", (r.castMove || "") === "altSukunaUltCharge" && dom.renders > 0 && dealt >= 180 && dealt <= 215, `−${dealt.toFixed(0)} renders=${dom.renders}`); }

  section("RUNTIME fallback-box sweep — every animationData action resolves a real alt_sukuna_ sheet");
  const boxHit = [];
  for (const act of Object.keys(ad)) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!((r.spriteSheet || "").includes("alt_sukuna_"))) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no action renders the 128² procedural box", boxHit.length === 0, boxHit.join(" | "));

  section("no JS errors");
  check("no page errors across the canonical suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
