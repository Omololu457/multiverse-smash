// harness/mayuri_stage2.mjs — STAGE 2: Mayuri's 5 basic normals + the green-slash FX pairing on up/air
// + the Fwd+Heavy 2-stage cancel-on-hit command chain (mayuriCmd1 → mayuriCmd2 launcher).
// For each normal: (1) resolves the correct mayuri_*_uniform sheet (no 128² box) and (2) CONNECTS on the
// adjacent dummy. up/air additionally render their paired green-slash FX overlay. The command chain:
// Fwd+Heavy → mayuriCmd1 (sheet + connect + rekkaNext=mayuriCmd2), then re-tap Heavy on a clean hit →
// mayuriCmd2. Data-level contract closes it out.
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
const fx = () => page.evaluate(() => window.__harness.mayuriFx("p1"));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `mayuri_s2_${name}.png`) }); return; }
  const padX = 120, padTop = r.h * 1.2, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `mayuri_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 54) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND normals: light / heavy / upAttack ──
  console.log("\n── ground normals ──");
  const ground = [
    ["light", "j", "mayuri_light_uniform"],
    ["heavy", "k", "mayuri_heavy_uniform"],
    ["upAttack", "i", "mayuri_up_uniform"],
  ];
  for (const [name, key, sheet] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    if (name === "upAttack") { let seen = false; for (let i = 0; i < 8; i++) { const s = await fx(); if (s?.atkFx === "up") seen = true; await waitFrames(1); } check("upAttack: green-slash FX overlay renders", seen, `atkFx seen=${seen}`); }
    await crop(name);
    await page.keyboard.up(key); await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(14);
  }

  // ── AIR neutral: air (J while airborne) + its green-slash FX ──
  console.log("\n── air normals ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("mayuri_air_uniform");
    check(`air: sprite → mayuri_air_uniform`, (mv.spriteSheet || "").includes("mayuri_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    let seen = false; for (let i = 0; i < 6; i++) { const s = await fx(); if (s?.atkFx === "air") seen = true; await waitFrames(1); }
    check("air: green-slash FX overlay renders", seen, `atkFx seen=${seen}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR down: downAir (S+J while airborne, above the dummy) ──
  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("mayuri_downair_uniform");
    check(`downAir: sprite → mayuri_downair_uniform`, (mv.spriteSheet || "").includes("mayuri_downair_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  // ── Fwd+Heavy COMMAND CHAIN: mayuriCmd1 → (re-tap Heavy on a clean hit) → mayuriCmd2 ──
  // The cancel-advance needs a fresh Heavy EDGE landing in the (hit-landed ∩ cancel-window) overlap — a
  // narrow, timing-sensitive window (per the project's flaky-rekka note). We stay adjacent + hold forward
  // and SPAM Heavy edges across the whole move so an edge reliably lands in the window; holding forward
  // also re-opens a fresh cmd1 each cycle for another chance.
  // The advance needs a FRESH Heavy edge landing in cmd1's recovery window while the hit has latched
  // (_cmdHitLanded). Blind spamming latches _cmdPrevHeavy and misses it — so we react to the phase:
  // hold Heavy UP, poll until phase==="recovery", then fire exactly ONE clean edge.
  console.log("\n── Fwd+Heavy command chain (mayuriCmd1 → mayuriCmd2) ──");
  let cmd1Move = "", cmd1Sheet = "", cmd1Rekka = "", cmd1Dmg = 0, cmd2Move = "";
  for (let attempt = 0; attempt < 12 && cmd2Move !== "mayuriCmd2"; attempt++) {
    await setupAdjacent(38);
    const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(2);   // hold forward toward the dummy
    // Open cmd1 (clean edges: down / up / wait).
    let mv = await p1();
    for (let r = 0; r < 8 && mv.currentMove !== "mayuriCmd1"; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1();
    }
    if (mv.currentMove === "mayuriCmd1") { cmd1Move = "mayuriCmd1"; cmd1Rekka = mv.rekkaNext || cmd1Rekka; if ((mv.spriteSheet || "").includes("mayuri_cmd1_uniform")) { cmd1Sheet = mv.spriteSheet; await crop("cmd1"); } }
    // Phase-reactive advance: watch cmd1; the frame it enters recovery, fire ONE fresh Heavy edge.
    await page.keyboard.up("k");   // ensure Heavy released so the next press is a real edge
    for (let r = 0; r < 24 && cmd2Move !== "mayuriCmd2"; r++) {
      const s = await p1();
      if (s.currentMove === "mayuriCmd2") { cmd2Move = "mayuriCmd2"; await crop("cmd2"); break; }
      if (s.currentMove === "mayuriCmd1" && s.attackPhase === "recovery") {
        await page.keyboard.down("k"); await waitFrames(1);
        const s2 = await p1(); if (s2.currentMove === "mayuriCmd2") { cmd2Move = "mayuriCmd2"; await crop("cmd2"); }
        await page.keyboard.up("k"); await waitFrames(1);
      } else if (s.currentMove == null) { break;   // cmd1 ended without advancing → retry the whole cycle
      } else { await waitFrames(1); }
    }
    const hp1 = (await p2()).health; cmd1Dmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("command chain opens mayuriCmd1 (currentMove)", cmd1Move === "mayuriCmd1", `move=${cmd1Move}`);
  check("mayuriCmd1 → mayuri_cmd1_uniform sprite", cmd1Sheet.includes("mayuri_cmd1_uniform"), `sheet=${cmd1Sheet}`);
  check("mayuriCmd1 chains to mayuriCmd2 (rekkaNext wired)", cmd1Rekka === "mayuriCmd2", `rekkaNext=${cmd1Rekka}`);
  check("command chain connects (dmg)", cmd1Dmg > 0, `dmg=${cmd1Dmg}`);
  check("re-tap Heavy on hit advances to mayuriCmd2 (launcher finisher)", cmd2Move === "mayuriCmd2", `move2=${cmd2Move}`);

  // ── DATA-LEVEL contract: all normals + both command stages wired to real mayuri sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("mayuri")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air", "mayuriCmd1", "mayuriCmd2"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("mayuri"));
  check("5 normals + 2-stage command chain wired to real mayuri sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Mayuri Stage 2: ${PASS} passed, ${FAIL} failed — shots in harness/shots/mayuri_s2_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
