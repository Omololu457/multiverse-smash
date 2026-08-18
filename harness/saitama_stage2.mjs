// harness/saitama_stage2.mjs
// STAGE 2 evidence: Saitama's 5 normals + grab + the "Spin-Punch" command-normal chain.
// (1) WIRING — every normal/grab/chain action's animationData points at a real reslice'd sheet (no box).
// (2) CONNECT — light/heavy/up land damage on P2; air + down-air render their attack sheets airborne.
// (3) GRAB — the dedicated O throw grabs & damages P2, rendering the grab strip.
// (4) CHAIN — Fwd+Heavy opens saitamaTurn1, re-tap Heavy on hit cancels into Turn2 → Turn3 launcher.
// Screenshots → harness/shots/saitama_stage2_*.png.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `saitama_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=saitama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("saitama").animationData);

  console.log("\n── (1) wiring: every normal/grab/chain action → a real saitama_ sheet (no box) ──");
  for (const [k, tag] of [
    ["light", "saitama_light_uniform"], ["heavy", "saitama_heavy_uniform"], ["up", "saitama_up_uniform"],
    ["air", "saitama_air_uniform"], ["down_air", "saitama_downair_uniform"], ["grab", "saitama_grab_uniform"],
    ["saitamaTurn1", "saitama_turn1_uniform"], ["saitamaTurn2", "saitama_turn2_uniform"], ["saitamaTurn3", "saitama_turn3_uniform"],
  ]) check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) ground normals connect (damage P2) + render their sheet ──");
  for (const [name, key, tag] of [["light", "j", "saitama_light_uniform"], ["heavy", "k", "saitama_heavy_uniform"], ["up", "i", "saitama_up_uniform"]]) {
    await prep(52);
    const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let sawSheet = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) sawSheet = true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(8);
    const dealt = h0 - (await p2()).health;
    await shot(name);
    check(`${name} renders ${tag}`, sawSheet, "");
    check(`${name} connects (P2 dmg ${dealt.toFixed(0)})`, dealt > 0, `dmg=${dealt}`);
  }

  console.log("\n── (2b) air + down-air render their attack sheets airborne ──");
  // AIR (jump then J)
  await prep(46); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  await page.keyboard.down("j"); let sawAir = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("saitama_air_uniform")) sawAir = true; await waitFrames(2); } await page.keyboard.up("j");
  await shot("air"); check("air (airborne J) renders saitama_air_uniform", sawAir, "");
  await waitGrounded();
  // DOWN-AIR (jump, hold S, then J)
  await prep(30); await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(4);
  await page.keyboard.down("s"); await page.keyboard.down("j"); let sawDA = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("saitama_downair_uniform")) sawDA = true; await waitFrames(2); } await page.keyboard.up("j"); await page.keyboard.up("s");
  await shot("down_air"); check("down_air (airborne S+J) renders saitama_downair_uniform", sawDA, "");
  await waitGrounded();

  console.log("\n── (3) grab (dedicated O) grabs + damages P2, renders grab strip ──");
  await prep(40);
  const gh0 = (await p2()).health;
  await page.keyboard.down("o"); await waitFrames(2);
  let sawGrabSheet = false, sawGrabbed = false;
  for (let i = 0; i < 8; i++) { const a = await p1(), b = await p2(); if ((a.spriteSheet || "").includes("saitama_grab_uniform")) sawGrabSheet = true; if (b.isGrabbed) sawGrabbed = true; await waitFrames(2); }
  await page.keyboard.up("o"); await waitFrames(20);
  const gDealt = gh0 - (await p2()).health;
  await shot("grab");
  check("grab renders saitama_grab_uniform", sawGrabSheet, "");
  check("grab connects (grabbed and/or threw for dmg)", sawGrabbed || gDealt > 0, `grabbed=${sawGrabbed} dmg=${gDealt}`);

  console.log("\n── (4) Spin-Punch chain: Fwd+Heavy opens Turn1 → re-tap Heavy on hit → Turn2 → Turn3 launcher ──");
  await prep(50);
  const ch0 = (await p2()).health;
  const facing = (await p1()).facing || 1;
  const fwd = facing === 1 ? "d" : "a";
  const seen = new Set(); let launchedFin = { grounded: true, vy: 0 };
  const cmd = () => page.evaluate(() => window.__harness.saitamaCmd("p1"));
  const record = async () => { const a = await p1(); const act = a.spriteAction || ""; if (/^saitamaTurn[123]$/.test(act)) seen.add(act); if (act === "saitamaTurn3") { const b = await p2(); if (!b.grounded || b.vy < -0.5) launchedFin = b; } return act; };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  // Wait until the current stage is in RECOVERY and has CONNECTED (so rekkaContinue will accept the cancel).
  const waitCancelReady = async () => { await page.waitForFunction(() => { const c = window.__harness.saitamaCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd);
  await tapK();                        // Fwd+Heavy → Turn1 opener
  for (let i = 0; i < 4; i++) { await record(); await waitFrames(1); } await shot("chain_turn1");
  await waitCancelReady(); await tapK();   // re-tap in recovery-after-connect → cancel into Turn2
  for (let i = 0; i < 6; i++) { await record(); await waitFrames(1); } await shot("chain_turn2");
  await waitCancelReady(); await tapK();   // re-tap in recovery-after-connect → cancel into Turn3 launcher
  for (let i = 0; i < 10; i++) { await record(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4); await shot("chain_turn3");
  const chDealt = ch0 - (await p2()).health;
  check("chain opened Turn1", seen.has("saitamaTurn1"), [...seen].join(","));
  check("chain cancelled into Turn2", seen.has("saitamaTurn2"), [...seen].join(","));
  check("chain reached Turn3 finisher", seen.has("saitamaTurn3"), [...seen].join(","));
  check(`chain dealt cumulative damage (${chDealt.toFixed(0)})`, chDealt > 0, `dmg=${chDealt}`);
  check("Turn3 finisher launches P2 (airborne/upward)", !launchedFin.grounded || launchedFin.vy < -0.5, `grounded=${launchedFin.grounded} vy=${launchedFin.vy}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
