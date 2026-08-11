// harness/pain_stage2_shots.mjs — Stage 2 evidence for Pain's normals + command chain.
// (1) benPose pose-render for each normal (light/heavy/up/air/air_heavy/down_air) + command-normal
//     stages (painJab, painCombo1/2/3), asserting each renders its OWN sheet (no fallback box).
// (2) Functional real-keyboard test: neutral Heavy → normal rod-thrust; Fwd+Heavy → painCombo1 rekka
//     opener → re-tap Heavy on a clean hit advances painCombo1→2→3; Fwd+Light → painJab.
// Usage: node harness/pain_stage2_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Pose renders (deterministic via benPose) ──
const EXP = {
  light:      "pain_light_uniform.png",
  heavy:      "pain_heavy_uniform.png",
  up:         "pain_up_uniform.png",
  air:        "pain_air_uniform.png",
  air_heavy:  "pain_airheavy_uniform.png",
  down_air:   "pain_downair_uniform.png",
  painJab:    "pain_jab_uniform.png",
  painCombo1: "pain_combo1_uniform.png",
  painCombo2: "pain_combo2_uniform.png",
  painCombo3: "pain_combo3_uniform.png",
};
console.log("POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(150);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `pain_s2_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. Functional keyboard test (real input path) ──
// NOTE: window.__harness.p1() is a READ-ONLY snapshot (writes don't persist, currentAttack isn't
// exposed) — so we key off spriteSheet/currentMove and use REAL hits. Attacks need the key held across
// an input-sample frame (a bare press() lands between frames), so tap() = down → hold → up.
const tap = async (key, holdMs = 55) => { await page.keyboard.down(key); await sleep(holdMs); await page.keyboard.up(key); };
const st = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return { sheet: p.spriteSheet, move: p.currentMove, p2hp: q?.health, p2hs: q?.hitstun||0 }; });
const pollSheet = async (needle, ms = 900) => {
  const t0 = Date.now(); let last = null;
  while (Date.now() - t0 < ms) { const s = await st(); last = s; if (s.sheet && s.sheet.includes(needle)) return s; await sleep(16); }
  return last;
};
const facingRight = await page.evaluate(() => (window.__harness.p1().facing || 1) === 1);
const FWD = facingRight ? "d" : "a";   // hold toward the opponent
console.log(`\nFUNCTIONAL (real keys — Light:J Heavy:K, forward=${FWD}):`);

// (a) neutral Heavy → normal "heavy" (rod thrust) sheet, NOT a command move
await page.evaluate(() => window.__harness.p1ClearCooldowns?.());
await tap("k");
let r = await pollSheet("pain_heavy_uniform");
ok(r.sheet?.includes("pain_heavy_uniform") && r.move !== "painCombo1", `neutral Heavy → normal heavy sheet (${r.sheet}, move=${r.move})`);
await sleep(400);

// Place the fighters adjacent so the command combo CONNECTS (the clean-hit rekka gate needs real hits).
await page.evaluate(() => { const p1=window.__harness.p1(); window.__harness.setP2X?.(p1.x + (p1.facing||1)*60); });
await sleep(80);
await page.evaluate(() => window.__harness.p1ClearCooldowns?.());
const hp0 = (await st()).p2hp;

// (b)+(c) Fwd+Heavy opens painCombo1; re-tapping Heavy on each clean hit advances → painCombo2 → painCombo3.
// Hold forward, spam Heavy taps, and collect every combo sheet the chain renders.
await page.keyboard.down(FWD); await sleep(60);
const seen = new Set();
let chainShot = false;
for (let t = 0; t < 12; t++) {
  await tap("k", 45);
  for (let i = 0; i < 9; i++) { await sleep(12); const s = await st(); if (s.sheet) seen.add(s.sheet); if (s.move) seen.add(s.move); if (s.move === "painCombo2" && !chainShot) { await page.screenshot({ path: path.join(OUT, "pain_s2_chain.png") }); chainShot = true; } }
}
await page.keyboard.up(FWD);
if (!chainShot) await page.screenshot({ path: path.join(OUT, "pain_s2_chain.png") });
const hp1 = (await st()).p2hp;
// currentMove is set precisely per command stage; spriteSheet is the render proof — accept either.
ok(seen.has("painCombo1") || seen.has("./pain_combo1_uniform.png"), `Fwd+Heavy → painCombo1 opener`);
ok(seen.has("painCombo2") || seen.has("./pain_combo2_uniform.png"), `chain advanced → painCombo2`);
ok(seen.has("painCombo3") || seen.has("./pain_combo3_uniform.png"), `chain advanced → painCombo3 finisher`);
ok(hp1 < hp0 - 40, `chain CONNECTED — p2 HP ${Math.round(hp0)} → ${Math.round(hp1)} (dealt ${Math.round(hp0-hp1)})`);
await sleep(400);

// (d) Fwd+Light → painJab
await page.evaluate(() => window.__harness.p1ClearCooldowns?.());
await page.keyboard.down(FWD); await sleep(60);
await tap("j");
r = await pollSheet("pain_jab_uniform");
ok(r.sheet?.includes("pain_jab_uniform") || r.move === "painJab", `Fwd+Light → painJab (${r.sheet}, move=${r.move})`);
await page.keyboard.up(FWD);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,10).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
