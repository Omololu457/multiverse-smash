// harness/genos_stage4.mjs
// STAGE 4 evidence: Genos's specials.
// (1) WIRING — every special action's animationData points at a real reslice'd sheet (no box).
// (2) INCINERATION CANNON — deterministic tap/hold TIERS (genosIncinerate 1/2/3): each holds its cast pose,
//     spends the tier's cost, spawns a genosIncineration fireball that scales + connects for damage.
// (3) MACHINE GUN BLOWS (Fwd) — genosMachinegun, rapid MULTI-HIT (re-latch), connects.
// (4) JET DASH (Down) — genosJetdash gap-closer lunges forward + connects.
// (5) AFTERIMAGE DASH (Back) — genosAfterimage grants i-frames (invulnTimer) + connects.
// (6) AIR — airborne neutral Special → Machine Gun Blows (air reuses the ground pose).
// Screenshots → harness/shots/genos_stage4_*.png. See GENOS_ASSET_MAP.md.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `genos_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
const fireTier = (t) => page.evaluate(tt => window.__harness.genosIncinerate(tt), t);
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=genos`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("genos").animationData);

  console.log("\n── (1) wiring: every special action → a real genos_ sheet (no box) ──");
  for (const [k, tag] of [
    ["genosIncinerate1", "genos_incinerate1_uniform"], ["genosIncinerate2", "genos_incinerate2_uniform"],
    ["genosIncinerate3", "genos_incinerate3_uniform"], ["genosMachinegun", "genos_machinegun_uniform"],
    ["genosJetdash", "genos_jetdash_uniform"], ["genosAfterimage", "genos_afterimage_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Incineration Cannon — 3 hold-tiers (cast pose + scaled fireball + connect) ──");
  const tiers = [[1, "genosIncinerate1", 25], [2, "genosIncinerate2", 40], [3, "genosIncinerate3", 70]];
  for (const [tier, pose, cost] of tiers) {
    await prep(150);   // ranged: dummy out so the blast travels
    const h0 = (await p2()).health;
    const res = await fireTier(tier);
    check(`tier ${tier} fires (cast=${pose}, spent ${res?.spent})`, res?.ok && res?.cast === pose, `ok=${res?.ok} cast=${res?.cast}`);
    check(`tier ${tier} spends ${cost} core`, Math.abs((res?.spent || 0) - cost) < 0.5, `spent=${res?.spent}`);
    let sawProj = false, projW = 0;
    for (let f = 0; f < 18 && !sawProj; f++) { await waitFrames(1); const pr = await projectiles(); const gp = pr.find(p => (p.name || "").includes("genosIncineration")); if (gp) { sawProj = true; projW = gp.w || gp.width || 0; } }
    check(`tier ${tier} spawns a genosIncineration fireball`, sawProj, `w=${projW}`);
    await shot(`incinerate${tier}`);
    await waitFrames(34);
    const dealt = h0 - (await p2()).health;
    check(`tier ${tier} connects (dmg ${dealt.toFixed(0)})`, dealt > 0, `dmg=${dealt}`);
    await waitGrounded(); await waitFrames(6);
  }

  console.log("\n── (3) Machine Gun Blows (Fwd) — multi-hit + connect ──");
  await prep(58);
  const mg0 = (await p2()).health; let mgHits = 0, mgLast = mg0;
  const mres = await fireDir("F");
  check(`Machine Gun fires genosMachinegun`, mres?.move === "genosMachinegun", `move=${mres?.move}`);
  await waitSheet("genos_machinegun_uniform");
  for (let f = 0; f < 18; f++) { await waitFrames(1); const h = (await p2()).health; if (h < mgLast - 0.5) mgHits++; mgLast = h; }
  await shot("machinegun");
  check(`Machine Gun lands multiple hits (${mgHits})`, mgHits >= 2, `hits=${mgHits}`);
  check(`Machine Gun connects (dmg ${(mg0 - mgLast).toFixed(0)})`, mg0 - mgLast > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Jet Dash (Down) — gap-closer lunge + connect ──");
  await prep(96);
  const jx0 = (await p1()).x, jh0 = (await p2()).health;
  const jres = await fireDir("D");
  check(`Jet Dash fires genosJetdash`, jres?.move === "genosJetdash", `move=${jres?.move}`);
  await waitSheet("genos_jetdash_uniform");
  await waitFrames(10);
  const jx1 = (await p1()).x;
  check(`Jet Dash lunges forward (Δx ${(jx1 - jx0).toFixed(0)})`, Math.abs(jx1 - jx0) > 8, `x ${jx0.toFixed(0)}→${jx1.toFixed(0)}`);
  await shot("jetdash");
  await waitFrames(12);
  check(`Jet Dash connects (dmg ${(jh0 - (await p2()).health).toFixed(0)})`, jh0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (5) Afterimage Dash (Back) — i-frames + connect ──");
  await prep(72);
  const ah0 = (await p2()).health;
  const ares = await fireDir("B");
  check(`Afterimage fires genosAfterimage`, ares?.move === "genosAfterimage", `move=${ares?.move}`);
  const inv = (await p1()).invulnTimer || 0;
  check(`Afterimage grants i-frames (invulnTimer ${inv})`, inv > 0, `invulnTimer=${inv}`);
  await waitSheet("genos_afterimage_uniform");
  await shot("afterimage");
  await waitFrames(16);
  check(`Afterimage connects (dmg ${(ah0 - (await p2()).health).toFixed(0)})`, ah0 - (await p2()).health > 0, "");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (6) AIR neutral Special → Machine Gun Blows (air) ──");
  await prep(50);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  const air = await fireDir(null);
  check(`airborne neutral → genosMachinegun`, air?.move === "genosMachinegun", `move=${air?.move}`);
  await shot("air_machinegun");
  await waitGrounded();

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
