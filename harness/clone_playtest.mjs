// harness/clone_playtest.mjs — PLAY-TEST (drive the real game with real keypresses, capture what a player sees).
// Not assertions — a scripted play session across the clone features, with screenshots + narration from live state.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });

async function session(char, drive) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; page.on("pageerror", e => errs.push(String(e.message)));
  const stateF = () => page.evaluate(() => window.__harness.state());
  const wf = async n => { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); };
  const cc = () => page.evaluate(() => window.__harness.p1CloneCount());
  const met = () => page.evaluate(() => window.__harness.cloneRenderMetrics());
  const tap = async (k, hold = 2) => { await page.keyboard.down(k); await wf(hold); await page.keyboard.up(k); };
  const shot = async name => {
    const r = await page.evaluate(() => window.__harness.screenRect("p1"));
    const clip = r ? { x: Math.max(0, Math.round(r.x - 340)), y: Math.max(0, Math.round(r.y - r.h * 0.8)), width: 720, height: Math.round(r.h * 2.1) } : undefined;
    if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
    await page.screenshot({ path: path.join(OUT, `playtest_${char}_${name}.png`), ...(clip ? { clip } : {}) });
    console.log(`   📸 playtest_${char}_${name}.png`);
  };
  await page.goto(`${base}/index.html?harness=1&p1=${char}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => window.__harness.start?.());
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await wf(40);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
  console.log(`\n════════ ${char.toUpperCase()} ════════`);
  await drive({ page, wf, cc, met, tap, shot });
  console.log(`   page errors: ${errs.length ? errs.join(" | ") : "none"}`);
  await page.close();
}

// ── NARUTO: spawn spread → walk (mirror) → attack (mirror) → Uzumaki Rendan barrage → consciousness-swap ──
await session("naruto", async ({ page, wf, cc, met, tap, shot }) => {
  // spawn clones with the real "," key (Naruto's first clone is audio-synced → delayed; repeats within the window are instant)
  for (let i = 0; i < 5; i++) { await page.keyboard.press(","); await wf(10); }
  await wf(160);   // let the audio-delayed first clone poof in
  console.log(`   spawned clones → count=${await cc()}`);
  await shot("1_spread");

  await page.keyboard.down("d"); await wf(22); await page.keyboard.up("d");   // walk toward the enemy
  let m = await met(); console.log(`   walked: owner action=${m.owner.action}, clones tracking=${m.clones.map(c => c.mirrorDx)}`);
  await shot("2_walk_mirror");

  await page.keyboard.down("j"); await wf(3); await shot("3_attack_mirror"); await page.keyboard.up("j");
  m = await met(); console.log(`   attacked: owner action=${m.owner.action} (clones replay it)`);
  await wf(20);

  // Uzumaki Rendan — needs >=3 clones; open with Fwd(d)+Heavy(k), then re-tap Heavy for beats
  console.log(`   Uzumaki Rendan: clones before=${await cc()}`);
  await page.keyboard.down("d"); await tap("k", 2); await wf(3); await tap("k", 2); await wf(3); await tap("k", 2); await page.keyboard.up("d");
  await shot("4_rendan");
  console.log(`   Rendan fired → clones after (spent per beat)=${await cc()}`);
  await wf(30);

  // Consciousness-swap: respawn some clones, then press "/"
  for (let i = 0; i < 4; i++) { await page.keyboard.press(","); await wf(10); }
  await wf(160);
  const before = await page.evaluate(() => window.__harness.p1WorldPos());
  console.log(`   swap: clones=${await cc()}, owner at x=${before?.x}`);
  await shot("5_before_swap");
  await page.keyboard.press("/"); await wf(3);
  const after = await page.evaluate(() => window.__harness.p1WorldPos());
  console.log(`   pressed "/" → owner now at x=${after?.x} (traded places with a clone), clones=${await cc()}`);
  await shot("6_after_swap");
});

// ── HASHIRAMA: instant wood-clone spread (no audio delay) — clean look at the biased-behind flanking formation ──
await session("hashirama", async ({ page, wf, cc, shot }) => {
  for (let i = 0; i < 4; i++) { await page.keyboard.press(","); await wf(12); }
  await wf(30);
  console.log(`   wood clones → count=${await cc()}`);
  await shot("1_spread");
  await page.keyboard.down("a"); await wf(18); await page.keyboard.up("a");   // walk back — formation follows
  await shot("2_walk");
});

await browser.close(); server.close();
console.log("\n✅ play-test session complete — shots → harness/shots/playtest_*.png");
