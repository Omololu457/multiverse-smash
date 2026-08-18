// harness/yuta_stage4.mjs — STAGE 4: Yuta's 5 directional specials (executeYutaSpecial).
// GROUND melee: Fwd=Strong Attack(yutaStrong) / Down=Kick 4(yutaKick4, LAUNCHER).
// PROJECTILE casts: neutral=Cursed Energy Manipulation(yutaCem beam) / Up=Cursed Speech(yutaSpeech shout, heavy stun).
// UTILITY: Back=Reverse Cursed Technique(yutaRct, SELF-HEAL). For each: fires the right currentMove/_spriteCastMove,
// resolves the right yuta_* sheet (no 128² box), and produces its effect (melee dmg / projectile spawn+dmg /
// launch / self-heal). Deterministic via __harness.p1SpecialDir. Rika's Invocation ULT is RESERVED for Stage 5.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `yuta_s4_${name}.png`) }); return; }
  const padX = 160, padTop = r.h * 1.2, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `yuta_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 54) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND melee specials: Strong Attack (Fwd) / Kick 4 (Down, launcher) ──
  console.log("\n── ground melee specials ──");
  {
    await setupAdjacent(52);
    const hp0 = (await p2()).health;
    const res = await fireDir("F");
    check("Strong Attack (Fwd): fires yutaStrong", res?.move === "yutaStrong", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("yuta_strong_uniform");
    check("Strong Attack: sprite → yuta_strong_uniform", (mv.spriteSheet || "").includes("yuta_strong_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("yutaStrong");
    await waitFrames(28);
    check("Strong Attack: connects (dmg)", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
    await waitGrounded(); await waitFrames(8);
  }
  {
    await setupAdjacent(52);
    const hp0 = (await p2()).health;
    const res = await fireDir("D");
    check("Kick 4 (Down): fires yutaKick4", res?.move === "yutaKick4", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("yuta_kick4_uniform");
    check("Kick 4: sprite → yuta_kick4_uniform", (mv.spriteSheet || "").includes("yuta_kick4_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("yutaKick4");
    let launched = false;
    for (let f = 0; f < 20; f++) { await waitFrames(1); if ((await p2()).vy < -1) { launched = true; break; } }
    check("Kick 4: launches opponent (knockup)", launched, `launched=${launched}`);
    await waitFrames(16);
    check("Kick 4: connects (dmg)", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
    await waitGrounded(); await waitFrames(8);
  }

  // ── PROJECTILE cast: Cursed Energy Manipulation beam (neutral) ──
  console.log("\n── Cursed Energy Manipulation beam (neutral, projectile) ──");
  {
    await setupAdjacent(150);
    const hp0 = (await p2()).health;
    const res = await fireDir(null);
    check("CEM (neutral): casts yutaCem", res?.cast === "yutaCem", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("yuta_cem_uniform");
    check("CEM: sprite → yuta_cem_uniform", (mv.spriteSheet || "").includes("yuta_cem_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("yutaCem");
    let sawBeam = false;
    for (let f = 0; f < 16 && !sawBeam; f++) { await waitFrames(1); sawBeam = (await projectiles()).some(p => (p.name || "").includes("yutaCem")); }
    check("CEM: spawns a yutaCem projectile", sawBeam, "");
    await waitFrames(40);
    check("CEM: beam connects (dmg)", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
    await waitGrounded(); await waitFrames(8);
  }

  // ── PROJECTILE cast: Cursed Speech shout (Up) — short range, HEAVY stun ──
  console.log("\n── Cursed Speech shout (Up, stun) ──");
  {
    await setupAdjacent(112);   // far enough that the short-range shout is airborne several frames (observable) but still reaches
    const hp0 = (await p2()).health;
    const res = await fireDir("U");
    check("Cursed Speech (Up): casts yutaSpeech", res?.cast === "yutaSpeech", `move=${res?.move} cast=${res?.cast}`);
    // The shout is short-lived (lifetime 20) and hits the close dummy fast — poll the sprite AND the
    // projectile AND the applied stun together each frame so none is missed by observation timing.
    let sawSheet = false, sawShout = false, stun = 0;
    for (let f = 0; f < 40; f++) {
      const mv = await p1(); if ((mv.spriteSheet || "").includes("yuta_speech_uniform")) sawSheet = true;
      if ((await projectiles()).some(p => (p.name || "").includes("yutaSpeech"))) sawShout = true;
      stun = Math.max(stun, (await p2()).hitstun || 0);
      if (sawSheet && sawShout && stun >= 30) break;
      await waitFrames(1);
    }
    check("Cursed Speech: sprite → yuta_speech_uniform", sawSheet, `sawSheet=${sawSheet}`);
    await crop("yutaSpeech");
    check("Cursed Speech: spawns a yutaSpeech projectile", sawShout, "");
    check("Cursed Speech: connects (dmg)", (await p2()).health < hp0, `hp ${hp0} → ${(await p2()).health}`);
    check("Cursed Speech: applies heavy stun (hitstun ≥ 30)", stun >= 30, `maxHitstun=${stun}`);
    await waitGrounded(); await waitFrames(8);
  }

  // ── UTILITY: Reverse Cursed Technique self-heal (Back) ──
  console.log("\n── Reverse Cursed Technique self-heal (Back) ──");
  {
    await waitGrounded();
    await page.evaluate(() => window.__harness.setP1Health(500));
    await waitFrames(2);
    const hp0 = (await p1()).health;
    const res = await fireDir("B");
    check("RCT (Back): casts yutaRct", res?.cast === "yutaRct", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("yuta_rct_uniform");
    check("RCT: sprite → yuta_rct_uniform", (mv.spriteSheet || "").includes("yuta_rct_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("yutaRct");
    let healed = hp0;
    for (let f = 0; f < 40; f++) { await waitFrames(1); healed = Math.max(healed, (await p1()).health); }
    check("RCT: heals self (HP rises)", healed > hp0, `hp ${hp0} → ${healed} (+${(healed - hp0).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── DATA-LEVEL contract: all 5 special cast poses wired to real yuta sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("yuta")?.animationData || {});
  const keys = ["yutaStrong", "yutaKick4", "yutaCem", "yutaSpeech", "yutaRct"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("yuta"));
  check("all 5 specials wired to real yuta sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yuta Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/yuta_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
