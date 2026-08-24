// harness/ippo_stage4.mjs
// STAGE 4 evidence: Ippo's directional/air SPECIALS (heavier Y-button variants; fixed-slot MELEE kit).
// ★MELEE-ONLY — Ippo is a boxer, so EVERY special is a physical punch: NO projectile is ever spawned
// (the ranged gap is FLAGGED, not faked — IPPO_ASSET_MAP.md item 2).
// (1) WIRING — each special action points at a real reslice'd ippo_ sheet (no box).
// (2) GAZELLE PUNCH (neutral) — signature leaping counter: springs up-and-forward + LAUNCHER + connect.
// (3) SPINNING HOOK (Fwd) — lunges in + renders + connect.
// (4) HEAVY UPPERCUT (Up) — anti-air LAUNCHER + connect.
// (5) HEAVY BODY-BLOW (Down) — renders + connect.
// (6) AERIAL HOOK (air) — airborne cast + connect.
// (7) MELEE-ONLY — no special spawns any projectile. Damage runs through GLOBAL_DAMAGE_SCALE ×0.60.
// Screenshots → harness/shots/ippo_stage4_*.png. See IPPO_ASSET_MAP.md.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `ippo_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function renderConnect(tag, sheetFrag, h0) {
  let sawSheet = false, projSeen = 0;
  for (let f = 0; f < 14; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes(sheetFrag)) sawSheet = true; projSeen = Math.max(projSeen, (await projectiles()).length); await waitFrames(1); }
  await shot(tag);
  const dealt = h0 - (await p2()).health;
  return { sawSheet, projSeen, dealt };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("ippo").animationData);

  console.log("\n── (1) wiring: special actions → real ippo_ sheets (no box) ──");
  for (const [k, tag] of [
    ["ippoGazelle", "ippo_gazelle_uniform"], ["ippoHook", "ippo_hook_uniform"],
    ["ippoUppercut", "ippo_upper_uniform"], ["ippoBodyblow", "ippo_body_uniform"], ["ippoAirhook", "ippo_airhook_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  let allProjFree = true;

  console.log("\n── (2) Gazelle Punch (neutral) — signature leaping counter: launcher + connect ──");
  await prep(52);
  let h0 = (await p2()).health;
  const gres = await fireDir(null);
  check("neutral Special fires ippoGazelle", gres?.move === "ippoGazelle", `move=${gres?.move}`);
  const gp1 = await p1();
  check("Gazelle leaps (springs up-and-forward: vy<0)", (gp1.vy || 0) < -0.5, `vy=${gp1.vy}`);
  const gr = await renderConnect("gazelle", "ippo_gazelle_uniform", h0); allProjFree &&= gr.projSeen === 0;
  check("Gazelle renders ippo_gazelle_uniform", gr.sawSheet, "");
  check(`Gazelle connects (dmg ${gr.dealt.toFixed(0)})`, gr.dealt > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Spinning Hook (Fwd) — lunges in + renders + connect ──");
  await prep(60);
  h0 = (await p2()).health;
  const hres = await fireDir("F");
  check("Fwd Special fires ippoHook", hres?.move === "ippoHook", `move=${hres?.move}`);
  const hr = await renderConnect("hook", "ippo_hook_uniform", h0); allProjFree &&= hr.projSeen === 0;
  check("Hook renders ippo_hook_uniform", hr.sawSheet, "");
  check(`Hook connects (dmg ${hr.dealt.toFixed(0)})`, hr.dealt > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Heavy Uppercut (Up) — anti-air LAUNCHER + connect ──");
  await prep(40);
  h0 = (await p2()).health;
  const ures = await fireDir("U");
  check("Up Special fires ippoUppercut", ures?.move === "ippoUppercut", `move=${ures?.move}`);
  let uLaunched = false;
  let ur = { sawSheet: false, projSeen: 0 };
  for (let f = 0; f < 14; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("ippo_upper_uniform")) ur.sawSheet = true; ur.projSeen = Math.max(ur.projSeen, (await projectiles()).length); const b = await p2(); if (!b.grounded || b.vy < -0.5) uLaunched = true; await waitFrames(1); }
  await shot("uppercut"); allProjFree &&= ur.projSeen === 0;
  const uDealt = h0 - (await p2()).health;
  check("Uppercut renders ippo_upper_uniform", ur.sawSheet, "");
  check(`Uppercut connects (dmg ${uDealt.toFixed(0)})`, uDealt > 0, "");
  check("Uppercut LAUNCHES P2 (airborne/upward)", uLaunched, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Heavy Body-Blow (Down) — renders + connect ──");
  await prep(54);
  h0 = (await p2()).health;
  const bres = await fireDir("D");
  check("Down Special fires ippoBodyblow", bres?.move === "ippoBodyblow", `move=${bres?.move}`);
  const br = await renderConnect("bodyblow", "ippo_body_uniform", h0); allProjFree &&= br.projSeen === 0;
  check("Body-Blow renders ippo_body_uniform", br.sawSheet, "");
  check(`Body-Blow connects (dmg ${br.dealt.toFixed(0)})`, br.dealt > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) Aerial Hook (air) — airborne cast + connect ──");
  await prep(40);
  await page.evaluate(() => window.__harness.jumpP1?.());
  h0 = (await p2()).health;
  const ares = await fireDir(null);
  // ★jumpP1 rockets Ippo far above the grounded dummy, so the aerial hook's active window (startup ~6)
  //   happens up high. Air-to-air is the move's real use case → snap the dummy up beside Ippo right
  //   before the active frames so the hook can connect.
  await waitFrames(4);
  await page.evaluate(() => { const a = window.__harness.p1(), b = window.__harness.p2(); window.__harness.setP2X(a.x + 34 * (a.facing || 1)); window.__harness.liftP2((b.y - a.y) - 6); });
  check("air Special fires ippoAirhook", ares?.move === "ippoAirhook", `move=${ares?.move}`);
  let arSheet = false, arProj = 0, arDealt = 0;
  for (let f = 0; f < 16; f++) { const mv = await p1(); if ((mv.spriteSheet || "").includes("ippo_airhook_uniform")) arSheet = true; arProj = Math.max(arProj, (await projectiles()).length); arDealt = Math.max(arDealt, h0 - (await p2()).health); await waitFrames(1); }
  await shot("airhook"); allProjFree &&= arProj === 0;
  check("Aerial Hook renders ippo_airhook_uniform", arSheet, "");
  check(`Aerial Hook connects (dmg ${arDealt.toFixed(0)})`, arDealt > 0, "");
  await waitGrounded();

  console.log("\n── (7) MELEE-ONLY: no special spawned any projectile (ranged gap flagged, not faked) ──");
  check("no special spawns a projectile (boxer = melee-only)", allProjFree, "");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
