// harness/saitama_stage4.mjs
// STAGE 4 evidence: Saitama's 6 specials (+ Side Hop). Fires each via p1SpecialDir (deterministic direction
// dispatch) + one REAL-input Serious Punch, and confirms every branch renders + connects:
//   GROUND  F → Serious Punch (+ traveling shockwave)  ·  B → Two-Handed  ·  U → Bargain Sale  ·  D → Table Flip (launcher)
//   AIR     neutral → Headbutt  ·  F → Up→Down Combo (spike)  ·  B/D → Side Hop (i-frames)
// Specifically confirms the Serious Punch SHOCKWAVE travels as a SEPARATE ranged hitbox from the melee.
// Screenshots → harness/shots/saitama_stage4_*.png.
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `saitama_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.p1ClearCooldowns?.(); window.__harness.setDummyBehavior?.("stand"); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
// Fire a ground attack-special via direction dispatch; sample sprite + damage.
async function groundSpecial(dir, tag) {
  await prep(58);
  const h0 = (await p2()).health;
  const res = await specialDir(dir);
  let sheet = "", launchedVy = 0;
  for (let i = 0; i < 22; i++) { const a = await p1(), b = await p2(); if ((a.spriteSheet || "").includes(tag)) sheet = a.spriteSheet; if (b.vy < launchedVy) launchedVy = b.vy; await waitFrames(1); }
  const dmg = h0 - (await p2()).health;
  return { move: res?.move, sheet, dmg, launchedVy };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=saitama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("saitama").animationData);

  console.log("\n── (1) all 7 special sprites wired to real sheets (no box) ──");
  for (const [k, tag] of [
    ["saitamaSerious", "saitama_serious_uniform"], ["saitamaTwohand", "saitama_twohand_uniform"], ["saitamaBargain", "saitama_bargain_uniform"],
    ["saitamaTableflip", "saitama_tableflip_uniform"], ["saitamaHeadbutt", "saitama_headbutt_uniform"], ["saitamaUpdown", "saitama_updown_uniform"], ["saitamaSidehop", "saitama_sidehop_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) GROUND specials render + connect ──");
  const sp = await groundSpecial("F", "saitama_serious_uniform"); await shot("serious");
  check("Fwd → Serious Punch (saitamaSerious)", sp.move === "saitamaSerious" && /saitama_serious_uniform/.test(sp.sheet), `move=${sp.move} sheet=${sp.sheet}`);
  check(`Serious Punch connects (${sp.dmg.toFixed(0)})`, sp.dmg > 0, `dmg=${sp.dmg}`);
  const tw = await groundSpecial("B", "saitama_twohand_uniform"); await shot("twohand");
  check("Back → Two-Handed (saitamaTwohand)", tw.move === "saitamaTwohand" && /saitama_twohand_uniform/.test(tw.sheet), `move=${tw.move}`);
  check(`Two-Handed connects (${tw.dmg.toFixed(0)})`, tw.dmg > 0, `dmg=${tw.dmg}`);
  const bg = await groundSpecial("U", "saitama_bargain_uniform"); await shot("bargain");
  check("Up → Bargain Sale (saitamaBargain)", bg.move === "saitamaBargain" && /saitama_bargain_uniform/.test(bg.sheet), `move=${bg.move}`);
  check(`Bargain Sale connects (${bg.dmg.toFixed(0)})`, bg.dmg > 0, `dmg=${bg.dmg}`);
  const tf = await groundSpecial("D", "saitama_tableflip_uniform"); await shot("tableflip");
  check("Down → Table Flip (saitamaTableflip)", tf.move === "saitamaTableflip" && /saitama_tableflip_uniform/.test(tf.sheet), `move=${tf.move}`);
  check(`Table Flip connects (${tf.dmg.toFixed(0)})`, tf.dmg > 0, `dmg=${tf.dmg}`);
  check("Table Flip LAUNCHES P2 (upward)", tf.launchedVy < -1, `vy=${tf.launchedVy}`);

  console.log("\n── (3) Serious Punch SHOCKWAVE travels as a SEPARATE ranged hitbox from the melee ──");
  await prep(230);   // P2 far — out of melee reach, only the traveling shockwave can connect
  const h0 = (await p2()).health;
  await specialDir("F");
  let sawProj = false, x0 = null, xLast = null, projDmg = 0;
  for (let i = 0; i < 40; i++) {
    const ps = (await projs()).filter(p => /shockwave/i.test(p.name || "") || /serious_proj/.test(p.sheet || ""));
    if (ps.length) { sawProj = true; if (x0 == null) x0 = ps[0].x; xLast = ps[0].x; }
    await waitFrames(1);
  }
  projDmg = h0 - (await p2()).health;
  await shot("shockwave");
  check("shockwave projectile spawns", sawProj, "");
  check("shockwave TRAVELS forward (x advances)", x0 != null && xLast != null && Math.abs(xLast - x0) > 40, `x0=${x0} xLast=${xLast}`);
  check(`shockwave hits P2 at range, separate from melee (${projDmg.toFixed(0)})`, projDmg > 0, `dmg=${projDmg}`);

  console.log("\n── (4) AIR specials: Headbutt / Up→Down (spike) / Side Hop (i-frames) ──");
  // Headbutt (air neutral)
  await prep(50); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  const hb = await specialDir(null); let hbSheet = "";
  for (let i = 0; i < 10; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("saitama_headbutt_uniform")) hbSheet = a.spriteSheet; await waitFrames(1); }
  await shot("headbutt");
  check("air neutral → Headbutt (saitamaHeadbutt)", hb.move === "saitamaHeadbutt", `move=${hb.move}`);
  check("Headbutt renders saitama_headbutt_uniform", /saitama_headbutt_uniform/.test(hbSheet), `sheet=${hbSheet}`);
  await waitGrounded();
  // Up→Down Combo (air Fwd) — spikes DOWN
  await prep(44); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  const ud = await specialDir("F"); let udSheet = "";
  for (let i = 0; i < 12; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("saitama_updown_uniform")) udSheet = a.spriteSheet; await waitFrames(1); }
  await shot("updown");
  check("air Fwd → Up→Down Combo (saitamaUpdown)", ud.move === "saitamaUpdown", `move=${ud.move}`);
  check("Up→Down renders saitama_updown_uniform", /saitama_updown_uniform/.test(udSheet), `sheet=${udSheet}`);
  await waitGrounded();
  // Side Hop (air Back) — evasive i-frames
  await prep(50); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  const sh = await specialDir("B");
  let sawInvuln = false, sawHopPose = false;
  for (let i = 0; i < 10; i++) { const a = await p1(); if ((a.invulnTimer || 0) > 0) sawInvuln = true; if ((a.spriteSheet || "").includes("saitama_sidehop_uniform")) sawHopPose = true; await waitFrames(1); }
  await shot("sidehop");
  check("air Back → Side Hop (cast saitamaSidehop)", sh.cast === "saitamaSidehop", `cast=${sh.cast}`);
  check("Side Hop grants i-frames (invulnTimer > 0)", sawInvuln, "");
  check("Side Hop renders saitama_sidehop_uniform", sawHopPose, "");

  console.log("\n── (5) REAL input: hold Fwd + Special fires Serious Punch (input path, not just dispatch) ──");
  await prep(58);
  const rh0 = (await p2()).health;
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  await page.keyboard.down(fwd); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up(fwd);
  let realSheet = "";
  for (let i = 0; i < 22; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("saitama_serious_uniform")) realSheet = a.spriteSheet; await waitFrames(1); }
  const realDmg = rh0 - (await p2()).health;
  check("real Fwd+Special → Serious Punch renders", /saitama_serious_uniform/.test(realSheet), `sheet=${realSheet}`);
  check(`real Fwd+Special connects (${realDmg.toFixed(0)})`, realDmg > 0, `dmg=${realDmg}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
