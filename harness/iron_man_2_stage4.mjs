// harness/iron_man_2_stage4.mjs — STAGE 4 (SCAFFOLDING): Iron Man 2's charge-tiered repulsor + WHHT! dash.
// This validates the ART-INDEPENDENT MECHANIC only. The cast poses (ironMan2Repulsor / ironMan2Whht) are
// FLAGGED PLACEHOLDER sheets — the real repulsor-fire pose + WHHT! dash frames are RESLICED in the visual
// pass (this harness will be re-run then). Tests:
//   (1) WIRING — ironMan2Repulsor + ironMan2Whht resolve a real iron_man_2_ sheet (no 128² box).
//   (2) CHARGE TIERS S/1/2/3/4* — each fires (cast pose held), spends its escalating cost, spawns a
//       procedural ironMan2Repulsor dart whose SIZE ramps with the tier.
//   (3) 4* PIERCES (projectile.piercing === true) and hits hardest (damage ramp S < 4*).
//   (4) WHHT! dash (Fwd+Special) connects on the dummy and lunges the fighter forward.
// Screenshots → harness/shots/iron_man_2_stage4_*.png. See IRON_MAN_2_ASSET_MAP.md.
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
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `iron_man_2_stage4_${tag}.png`) }); }
const fireTier = (t) => page.evaluate(tt => window.__harness.ironMan2Repulsor(tt), t);
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); });
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.4);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man_2`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) wiring: special cast poses → real iron_man_2_ sheets (placeholders, but no box) ──");
  const ad = await page.evaluate(() => window.__harness.charDef("iron_man_2").animationData);
  check("ironMan2Repulsor cast wired to an iron_man_2_ sheet", (ad.ironMan2Repulsor?.sheet || "").includes("iron_man_2_"), `sheet=${ad.ironMan2Repulsor?.sheet}`);
  check("ironMan2Whht cast wired to an iron_man_2_ sheet", (ad.ironMan2Whht?.sheet || "").includes("iron_man_2_"), `sheet=${ad.ironMan2Whht?.sheet}`);

  console.log("\n── (2) charge-tiered repulsor S/1/2/3/4* — cost + projectile-size ramp ──");
  const tiers = [["S", 12], [1, 18], [2, 26], [3, 38], [4, 55]];
  const sizes = {}; let prevSpent = -1, costOK = true, sizeOK = true;
  for (const [tier, cost] of tiers) {
    await waitGrounded();
    await page.evaluate(() => { window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
    await waitFrames(1);
    const res = await fireTier(tier);
    check(`tier ${tier}: fires (cast=${res?.cast}, spent ${res?.spent})`, res?.ok && res?.cast === "ironMan2Repulsor", `ok=${res?.ok} cast=${res?.cast}`);
    if (Math.abs((res?.spent || 0) - cost) > 0.5) costOK = false;
    // capture the spawned dart's size
    let w = 0, pierce = false;
    for (let f = 0; f < 20 && w === 0; f++) { await waitFrames(1); const pr = await projectiles(); const rp = pr.find(p => (p.name || "").includes("ironMan2Repulsor")); if (rp) { w = rp.w || rp.radius || 0; pierce = !!rp.piercesMulti; } }
    sizes[tier] = { w, pierce };
    if (tier === "S") await shot("repulsor_S"); if (tier === 4) await shot("repulsor_4star");
    await waitFrames(6);
  }
  check("every tier spends exactly its cost (12/18/26/38/55)", costOK, JSON.stringify(tiers));
  const order = ["S", 1, 2, 3, 4];
  for (let i = 1; i < order.length; i++) if (!(sizes[order[i]].w > sizes[order[i - 1]].w)) sizeOK = false;
  check("projectile SIZE ramps S<1<2<3<4*", sizeOK, order.map(t => `${t}:${sizes[t].w}`).join(" "));
  // 4* has SCOPED multi-target pierce (owner-locked): combat.js piercesMulti pass-through, IM2-only (no effect on
  // other chars). Lower tiers do NOT pierce. Behavioral pass-through (persists after a hit) is checked in section (3).
  check("4* tier projectile has scoped multi-target PIERCE (piercesMulti)", sizes[4].pierce === true, `piercesMulti=${sizes[4].pierce}`);
  check("lower tiers do NOT pierce (S/1/2/3)", ["S", 1, 2, 3].every(t => sizes[t].pierce === false), order.map(t => `${t}:${sizes[t].pierce}`).join(" "));

  console.log("\n── (3) damage ramp: 4* hits harder than S (fired into adjacent dummy) ──");
  await setupAdjacent(70);
  let hp0 = (await p2()).health; await fireTier("S"); await waitFrames(20); const dmgS = hp0 - (await p2()).health;
  await setupAdjacent(70);
  hp0 = (await p2()).health; await fireTier(4);
  // behavioral PASS-THROUGH: after 4* connects, the bolt should PERSIST (pierce), not despawn on the hit.
  let persistedAfterHit = false, connected4 = false;
  for (let f = 0; f < 24; f++) {
    await waitFrames(1);
    const hpNow = (await p2()).health; if (hpNow < hp0) connected4 = true;
    const alive = (await projectiles()).some(p => (p.name || "").includes("ironMan2Repulsor"));
    if (connected4 && alive) persistedAfterHit = true;
  }
  const dmg4 = hp0 - (await p2()).health;
  check(`tier S connects (${dmgS.toFixed(0)})`, dmgS > 0, `dmg=${dmgS}`);
  check(`tier 4* connects and hits harder than S (${dmg4.toFixed(0)} > ${dmgS.toFixed(0)})`, dmg4 > dmgS, `S=${dmgS} 4*=${dmg4}`);
  check("4* PIERCES (bolt persists past the hit instead of despawning)", persistedAfterHit, `persisted=${persistedAfterHit}`);

  console.log("\n── (4) WHHT! dash (Fwd+Special) — connects + lunges forward ──");
  await setupAdjacent(80);
  const beforeX = (await p1()).x;
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.ironMan2Special("F"));
  await waitFrames(2); const wm = await p1(); await shot("whht");
  await waitFrames(16);
  const movedX = Math.abs((await p1()).x - beforeX);
  const dmgW = hp0 - (await p2()).health;
  check("WHHT! → ironMan2Whht cast/move", (wm.spriteSheet || "").includes("iron_man_2_") && (/ironMan2Whht/.test(wm.spriteAction || "") || /ironMan2Whht/.test((await p1()).currentMove || "") || wm.attacking), `action=${wm.spriteAction} sheet=${wm.spriteSheet}`);
  check(`WHHT! lunges forward (moved ${movedX.toFixed(0)}px)`, movedX > 10, `movedX=${movedX}`);
  check(`WHHT! connects (dmg ${dmgW.toFixed(0)})`, dmgW > 0, `dmg=${dmgW}`);

  console.log("\n── (5) Ground-slam (Down+Special) — dive-slam connects ──");
  await setupAdjacent(52);
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.ironMan2Special("D"));
  await waitFrames(2); const gs = await p1(); await shot("groundslam");
  await waitFrames(20);
  const dmgG = hp0 - (await p2()).health;
  const gsMove = gs.currentMove || gs.spriteAction || "";
  check("Ground-slam → ironMan2GroundSlam (real dive art)", /ironMan2GroundSlam/.test(gsMove) || (gs.spriteSheet || "").includes("iron_man_2_groundslam"), `move=${gsMove} sheet=${gs.spriteSheet}`);
  check(`Ground-slam connects (dmg ${dmgG.toFixed(0)})`, dmgG > 0, `dmg=${dmgG}`);

  console.log("\n── (6) Lock-on missile (Up+Special) — cyan bolt spawns, aims + reticle FX, connects ──");
  await setupAdjacent(80);
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.ironMan2Special("U"));
  let sawMissile = false, sawReticle = false;
  for (let f = 0; f < 40 && !(sawMissile && sawReticle); f++) {
    await waitFrames(1); const pr = await projectiles();
    if (pr.find(p => (p.name || "").includes("ironMan2Missile"))) sawMissile = true;
    if (pr.find(p => (p.name || "").includes("ironMan2Lockon"))) sawReticle = true;
  }
  await shot("missile");
  await waitFrames(40);
  const dmgM = hp0 - (await p2()).health;
  check("missile spawns ironMan2Missile bolt (cyan star-burst sprite)", sawMissile, "");
  check("lock-on reticle FX spawns (ironMan2Lockon, visual)", sawReticle, "");
  check("missile connects on the locked target (dmg " + dmgM.toFixed(0) + ")", dmgM > 0, `dmg=${dmgM}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
